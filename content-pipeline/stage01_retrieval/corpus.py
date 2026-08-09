"""The canonical RAG corpus: a checked-in allowlist of design sources.

Retrieval grounding is only trustworthy if you can say exactly which
documents it could have come from. This module is that boundary: the only
files this pipeline may retrieve from are the ones explicitly listed in
`canonical_sources.json`, a checked-in manifest that a human edits. Nothing
is discovered by globbing the docs tree, so raw research notes, agent logs,
this pipeline's own `output/run_*/` bundles, and throwaway prototypes are
excluded by default and stay excluded until somebody deliberately promotes
them into the manifest in a reviewable commit.

Two structural rules keep the allowlist an allowlist rather than a
suggestion:

* Every manifest path is resolved relative to `DOCS_ROOT` (the repo's
  `docs/` tree -- `/app/docs`, mounted read-only, under docker-compose;
  `../docs` when run from `content-pipeline/` on the host).
* Absolute paths and `..` traversal are rejected outright, so a manifest
  entry cannot reach outside the docs tree to pick up generated output.

`load_canonical_sources` returns both the flat chunk list retrieval needs
and a per-source snapshot (id, path, sha256 of the whole file, chunk count)
that `pipeline.py` records under `bundle.json`'s `provenance` key. The
snapshot plus `corpus_hash` is what lets a finished run bundle identify the
exact corpus state it was produced from, rather than "the docs, at some
point".
"""

import hashlib
import json
import os

from stage01_retrieval.rag import chunk_markdown_sections

# Where the manifest and the docs tree live. Both are overridable so tests
# can point at a temp corpus, and so docker-compose can hand in container
# paths (see the `content-pipeline` service's DOCS_ROOT).
MANIFEST_PATH = os.getenv("PIPELINE_CANONICAL_SOURCES", "canonical_sources.json")
DOCS_ROOT = os.getenv("DOCS_ROOT", "../docs")


def sha256_text(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _validate_source(entry, seen_ids):
    for field in ("id", "path"):
        if not entry.get(field):
            raise ValueError(f"canonical source manifest entry is missing '{field}': {entry!r}")

    source_id = entry["id"]
    path = entry["path"]

    if source_id in seen_ids:
        raise ValueError(f"duplicate canonical source id {source_id!r} in the manifest")

    if os.path.isabs(path) or path.startswith("~"):
        raise ValueError(
            f"canonical source {source_id!r} uses an absolute path ({path!r}); manifest "
            "paths must be relative to DOCS_ROOT so the allowlist cannot reach outside "
            "the docs tree"
        )
    if ".." in path.replace("\\", "/").split("/"):
        raise ValueError(
            f"canonical source {source_id!r} traverses out of DOCS_ROOT ({path!r}); this "
            "is how generated output or research notes would sneak into the corpus"
        )


def load_manifest(manifest_path=None):
    """Read and validate the allowlist manifest. Returns its `sources` list."""
    manifest_path = manifest_path or MANIFEST_PATH
    with open(manifest_path) as f:
        manifest = json.load(f)

    sources = manifest.get("sources")
    if not sources:
        raise ValueError(f"{manifest_path} declares no canonical sources")

    seen_ids = set()
    for entry in sources:
        _validate_source(entry, seen_ids)
        seen_ids.add(entry["id"])
    return sources


def load_canonical_sources(manifest_path=None, docs_root=None):
    """Load every allowlisted source and chunk it.

    Returns `(chunks, sources)`:

    * `chunks` -- the flat list retrieval embeds, each chunk carrying its
      `source_id`/`source_path` alongside the existing `heading`/`text`, so
      a retrieved chunk always names the canonical file it came from.
    * `sources` -- the per-source snapshot recorded in the run bundle:
      `{id, path, content_hash, chunk_count}` in manifest order.
    """
    docs_root = docs_root if docs_root is not None else DOCS_ROOT
    sources = []
    chunks = []

    for entry in load_manifest(manifest_path):
        full_path = os.path.join(docs_root, entry["path"])
        if not os.path.exists(full_path):
            raise FileNotFoundError(
                f"canonical source {entry['id']!r} is listed in the manifest but missing "
                f"at {full_path} -- either the file moved (fix the manifest) or DOCS_ROOT "
                f"is wrong (currently {docs_root!r})"
            )
        with open(full_path) as f:
            text = f.read()

        source_chunks = [
            {**chunk, "source_id": entry["id"], "source_path": entry["path"]}
            for chunk in chunk_markdown_sections(text)
        ]
        chunks.extend(source_chunks)
        sources.append(
            {
                "id": entry["id"],
                "path": entry["path"],
                "content_hash": sha256_text(text),
                "chunk_count": len(source_chunks),
            }
        )

    return chunks, sources


def corpus_hash(sources):
    """One hash naming the whole corpus snapshot a run used.

    Order-independent (sorted by source id) so re-ordering the manifest
    without changing its content doesn't look like a different corpus, and
    derived only from id/path/content_hash so it changes exactly when a
    source is added, removed, moved, or edited.
    """
    payload = json.dumps(
        sorted(
            (
                {"id": s["id"], "path": s["path"], "content_hash": s["content_hash"]}
                for s in sources
            ),
            key=lambda s: s["id"],
        ),
        sort_keys=True,
    )
    return sha256_text(payload)
