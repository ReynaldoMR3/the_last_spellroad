"""GDD chunking, embedding (via Ollama), and cosine-similarity retrieval.

Chunk boundaries follow the GDD's own `##`/`###`/`####` heading structure,
so a chunk's grounding text always matches a real section of the design
doc -- this is what makes the retrieval log's query -> chunk -> output
triples a faithful RAG demonstration rather than an arbitrary text window.

`chunk_gdd` keeps every chunk under the embedder's batch-size budget in
two layers: the GDD's own `##`/`###`/`####` headings do the first split,
and any single section that's still too big (no subheadings of its own)
gets paragraph-aligned into "(part N/M)" sub-chunks, each re-prefixed
with the section's own heading line so embeddings keep their section
context. `tests/test_rag.py`'s
`test_chunk_gdd_max_chunk_size_stays_under_embedder_budget` guards this
against a future GDD edit growing a chunk past the safety budget again.
"""

import hashlib
import json
import math
import os
import re

HEADING_RE = re.compile(r"^(#{2,4})\s+(.+)$", re.MULTILINE)

# Paragraph-accumulation threshold used when splitting an oversized section.
# Kept well under tests/test_rag.py's 8000-char safety budget (itself under
# the ~8700-char real embedder ceiling) so a split section's parts land
# safely under budget even after the re-added heading-line overhead.
MAX_CHUNK_CHARS = 6000


def _split_oversized_section(heading_prefix, heading, section_text, max_chars):
    """Split one oversized section into paragraph-aligned sub-chunks, each
    re-prefixed with the section's own heading line -- so embeddings retain
    section context per fragment, and downstream heading-stripping logic
    (pipeline.py's `_excerpt_without_heading`) still finds a heading line to
    drop."""
    body = section_text.split("\n", 1)[1] if "\n" in section_text else ""
    paragraphs = body.split("\n\n")
    parts = []
    current = ""
    for para in paragraphs:
        candidate = f"{current}\n\n{para}" if current else para
        if current and len(candidate) > max_chars:
            parts.append(current)
            current = para
        else:
            current = candidate
    if current:
        parts.append(current)

    total = len(parts)
    return [
        {
            "heading": f"{heading} (part {idx}/{total})",
            "text": f"{heading_prefix} {heading} (part {idx}/{total})\n\n{part.strip()}".strip(),
        }
        for idx, part in enumerate(parts, start=1)
    ]


def chunk_gdd(text):
    matches = list(HEADING_RE.finditer(text))
    chunks = []
    preamble = text[: matches[0].start()].strip() if matches else text.strip()
    if preamble:
        # Only include preamble if it has content other than H1 headings
        non_h1_content = re.sub(r"^#\s+.+$", "", preamble, flags=re.MULTILINE).strip()
        if non_h1_content:
            chunks.append({"heading": "(front matter)", "text": preamble})
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        heading = match.group(2).strip()
        section_text = text[start:end].strip()
        if len(section_text) <= MAX_CHUNK_CHARS:
            chunks.append({"heading": heading, "text": section_text})
        else:
            chunks.extend(
                _split_oversized_section(match.group(1), heading, section_text, MAX_CHUNK_CHARS)
            )
    return chunks


def cosine_similarity(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def retrieve_top_k(query_vector, chunk_vectors, k=3):
    scored = [
        (cosine_similarity(query_vector, vec), chunk)
        for chunk, vec in chunk_vectors
    ]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [{"score": score, **chunk} for score, chunk in scored[:k]]


def _chunk_key(chunk):
    return hashlib.sha256(chunk["text"].encode("utf-8")).hexdigest()


def embed_chunks_with_cache(chunks, cache_path, embed_fn):
    cache = {}
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            cache = json.load(f)

    chunk_vectors = []
    changed = False
    for chunk in chunks:
        key = _chunk_key(chunk)
        if key not in cache:
            cache[key] = embed_fn(chunk["text"])
            changed = True
        chunk_vectors.append((chunk, cache[key]))

    if changed:
        with open(cache_path, "w") as f:
            json.dump(cache, f)

    return chunk_vectors
