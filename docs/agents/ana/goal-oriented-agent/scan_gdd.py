"""Deterministic GDD -> structured feature list. No LLM involved: pure heading-based
parsing. Mirrors the shape of content-pipeline/stage01_retrieval/rag.py's
chunk_markdown_sections, but standalone (stdlib only, no embedding dependencies) since
gap-detection compares the GDD's full text against the codebase, not a top-k retrieval
slice of it.
"""
import json
import os
import re
import sys

HEADING_RE = re.compile(r"^(#{2,4})\s+(.+)$", re.MULTILINE)

DEFAULT_GDD_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "game", "the-last-spellroad-design.md"
)

# Final branch review, 2026-08-09 (finding #7) — `__file__` is always absolute (Python 3.9+),
# so `DEFAULT_GDD_PATH` above resolves to an absolute, worktree-specific path with `..`
# segments. Fine for actually opening the file (works regardless of cwd), but committing that
# absolute path into `output/gdd_features.json`'s `source_path` bakes in one specific
# worktree's checkout location. `REPO_ROOT` lets `main()` rewrite the default run's
# `source_path` to a clean, repo-relative path instead.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


def slugify(heading):
    slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
    return slug or "section"


def chunk_gdd_sections(text):
    """One entry per ##/###/#### heading, in document order, each carrying a breadcrumb
    `path` of its ancestor headings (a level-3 heading's path includes the level-2
    heading it's nested under; a sibling heading at the same or shallower level closes
    that nesting for whatever follows it)."""
    matches = list(HEADING_RE.finditer(text))
    sections = []
    stack = []  # (level, heading) ancestor chain, innermost last
    seen_ids = {}
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        level = len(match.group(1))
        heading = match.group(2).strip()
        body = text[match.end() : end].strip()

        while stack and stack[-1][0] >= level:
            stack.pop()
        stack.append((level, heading))
        path = " > ".join(h for _, h in stack)

        base_id = slugify(heading)
        seen_ids[base_id] = seen_ids.get(base_id, 0) + 1
        section_id = base_id if seen_ids[base_id] == 1 else f"{base_id}-{seen_ids[base_id]}"

        sections.append(
            {"id": section_id, "title": heading, "level": level, "path": path, "text": body}
        )
    return sections


def scan_gdd(gdd_path):
    with open(gdd_path, "r", encoding="utf-8") as f:
        text = f.read()
    return {"source_path": gdd_path, "sections": chunk_gdd_sections(text)}


def main():
    used_default = len(sys.argv) <= 1
    gdd_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_GDD_PATH
    out_path = sys.argv[2] if len(sys.argv) > 2 else None
    result = scan_gdd(gdd_path)
    if used_default:
        # Finding #7 — only rewrite `source_path` for the default (no-arg) invocation. An
        # explicit CLI path (or `scan_gdd()` called directly, e.g. from the test suite) is
        # left exactly as given — this is purely about not baking one worktree's absolute
        # checkout path into the committed default-run evidence file.
        result["source_path"] = os.path.relpath(os.path.abspath(gdd_path), REPO_ROOT)
    output = json.dumps(result, indent=2, ensure_ascii=False)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(output + "\n")
    else:
        print(output)


if __name__ == "__main__":
    main()
