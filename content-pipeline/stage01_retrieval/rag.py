"""GDD chunking, embedding (via Ollama), and cosine-similarity retrieval.

Chunk boundaries follow the GDD's own `##`/`###` heading structure, so a
chunk's grounding text always matches a real section of the design doc --
this is what makes the retrieval log's query -> chunk -> output triples a
faithful RAG demonstration rather than an arbitrary text window.
"""

import hashlib
import json
import math
import os
import re

HEADING_RE = re.compile(r"^(#{2,4})\s+(.+)$", re.MULTILINE)


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
        chunks.append({"heading": match.group(2).strip(), "text": text[start:end].strip()})
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
