"""Orchestrator: 00-kickoff -> 01-retrieval -> 02-generation -> 03-critique
-> 04-status, in order. Writes every stage's output plus the 3 graded
content files to output/run_<timestamp>/.
"""

import datetime
import json
import os

from dotenv import load_dotenv

load_dotenv()

import ollama_client
from stage00_kickoff.ana_kickoff import build_kickoff_brief, write_kickoff_brief
from stage01_retrieval.rag import chunk_gdd, embed_chunks_with_cache, retrieve_top_k
from stage02_generation.lorena_generate import generate_draft
from stage03_critique.heckler_critique import critique_draft
from stage04_status.ana_status import build_status_report, format_status_report_markdown

GDD_PATH = os.getenv("GDD_PATH", "../docs/game/the-last-spellroad-design.md")
OUTPUT_DIR = os.getenv("PIPELINE_OUTPUT_DIR", "output")
EMBEDDINGS_CACHE_PATH = os.getenv("PIPELINE_EMBEDDINGS_CACHE", ".embeddings_cache.json")
RETRIEVAL_K = 3


def _excerpt_without_heading(text):
    """Drop the chunk's own leading heading line -- it's already printed on
    the line above the excerpt in the retrieval log, so keeping it in the
    excerpt just makes the quoted body text render as a giant markdown
    heading when blockquoted (`> `) on GitHub."""
    return text.split("\n", 1)[1] if "\n" in text else text


def run_pipeline(run_dir):
    os.makedirs(run_dir, exist_ok=True)

    brief = build_kickoff_brief()
    write_kickoff_brief(brief, os.path.join(run_dir, "00_ana_kickoff_brief.md"))

    with open(GDD_PATH) as f:
        gdd_text = f.read()
    chunks = chunk_gdd(gdd_text)
    chunk_vectors = embed_chunks_with_cache(chunks, EMBEDDINGS_CACHE_PATH, ollama_client.embed)

    retrieval_log_lines = ["# Retrieval Log", ""]
    lorena_lines = ["# Lorena -- Drafts", ""]
    heckler_lines = ["# Heckler -- Critique", ""]
    results = []

    for request in brief["requests"]:
        query_vector = ollama_client.embed(request["query"])
        retrieved = retrieve_top_k(query_vector, chunk_vectors, k=RETRIEVAL_K)

        if request["is_validation_test"]:
            draft = request["preset_draft"]
        else:
            draft = generate_draft(request, retrieved)

        critique = critique_draft(draft, request, retrieved)
        final_text = critique["corrected"] if critique["corrected"] else draft

        retrieved_for_bundle = [
            {
                "heading": chunk["heading"],
                "score": chunk["score"],
                "text_excerpt": _excerpt_without_heading(chunk["text"])[:300],
            }
            for chunk in retrieved
        ]

        results.append(
            {
                "id": request["id"],
                "label": request["label"],
                "is_validation_test": request["is_validation_test"],
                "draft": draft,
                "critique": critique,
                "final_text": final_text,
                "retrieved": retrieved_for_bundle,
            }
        )

        retrieval_log_lines += [
            f"## {request['label']}",
            "",
            f"**Query:** {request['query']}",
            "",
            "**Retrieved chunks:**",
            "",
        ]
        for chunk in retrieved:
            excerpt = _excerpt_without_heading(chunk["text"])[:300].replace("\n", " ").strip()
            retrieval_log_lines.append(f"- `{chunk['heading']}` (score {chunk['score']:.3f})")
            retrieval_log_lines.append(f"  > {excerpt}")
        retrieval_log_lines += ["", "**Output:**", "", final_text, ""]

        lorena_lines += [f"## {request['label']}", "", draft, ""]
        heckler_lines += [
            f"## {request['label']}",
            "",
            f"**Verdict:** {critique['verdict']}",
            f"**Issue:** {critique['issue'] or 'none'}",
            f"**Corrected:** {critique['corrected'] or 'none'}",
            "",
        ]

        if not request["is_validation_test"]:
            with open(os.path.join(run_dir, f"{request['id']}.md"), "w") as f:
                f.write(final_text)

    with open(os.path.join(run_dir, "01_retrieval_log.md"), "w") as f:
        f.write("\n".join(retrieval_log_lines))
    with open(os.path.join(run_dir, "02_lorena_drafts.md"), "w") as f:
        f.write("\n".join(lorena_lines))
    with open(os.path.join(run_dir, "03_heckler_critique.md"), "w") as f:
        f.write("\n".join(heckler_lines))

    status_report = build_status_report(results)
    with open(os.path.join(run_dir, "04_ana_status_report.md"), "w") as f:
        f.write(format_status_report_markdown(status_report))

    with open(os.path.join(run_dir, "bundle.json"), "w") as f:
        json.dump({"results": results, "status_report": status_report}, f, indent=2)

    return results, status_report


def main():
    ollama_client.wait_for_ollama()
    ollama_client.ensure_models_pulled()
    run_dir = os.path.join(OUTPUT_DIR, f"run_{datetime.datetime.now():%Y%m%d_%H%M%S}")
    results, status_report = run_pipeline(run_dir)
    print(f"\nDone. Wrote {len(results)} content items to {run_dir}/")
    print(status_report["summary"])


if __name__ == "__main__":
    main()
