# Stage 01 -- Retrieval (Layer 2)

**Inputs:** the GDD's full text (`docs/game/the-last-spellroad-design.md`),
and each request's retrieval query from Stage 00.

**Process:** chunk the GDD by `##`/`###`/`####` heading, paragraph-splitting
any single section that's still too big into `(part N/M)` sub-chunks so no
chunk can exceed the embedder's batch-size budget; embed each chunk once via
Ollama's `nomic-embed-text` (cached to `.embeddings_cache.json`, keyed by a
hash of the chunk text so it invalidates automatically if the GDD
changes); embed each query the same way; retrieve the top-3 chunks by
cosine similarity.

**Outputs:** `(chunk, vector)` pairs consumed by Stage 02/03, and the
retrieved-chunk list written into `01_retrieval_log.md`.
