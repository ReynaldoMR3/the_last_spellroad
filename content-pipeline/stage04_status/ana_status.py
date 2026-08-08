"""Ana's closing-status stage -- deterministic, not an LLM call. Reasons
over Heckler's structured verdicts using the GDD's own three-state model
(shipped-and-validated / blocked-with-reason / in-progress-with-owner).

Two request kinds are graded on something other than Heckler's verdict:
a `seeded_violation` validation test passes only when the critic *caught*
its planted violation, and a `retrieval_probe` passes only when stage 01
actually retrieved the canonical source it exists to prove is reachable.
"""


def build_status_report(results):
    items = []
    for result in results:
        critique = result["critique"]
        verdict = critique["verdict"]
        corrected = critique["corrected"]

        if result.get("validation_mode") == "retrieval_probe":
            # A retrieval probe is graded on stage 01, not on Heckler: did the
            # canonical-source allowlist actually surface the source it exists
            # to prove is reachable? Checked against the run's own retrieval
            # results, so a broken manifest/chunking/retrieval path shows up as
            # blocked-with-reason instead of passing silently.
            expected = result.get("expected_source_id")
            hits = [
                chunk
                for chunk in result.get("retrieved", [])
                if chunk.get("source_id") == expected
            ]
            if hits:
                best = max(hits, key=lambda chunk: chunk["score"])
                status = "shipped-and-validated"
                note = (
                    f"retrieval reached `{expected}` -- '{best['heading']}' "
                    f"at score {best['score']:.3f}"
                )
            else:
                status = "blocked-with-reason"
                retrieved_sources = sorted(
                    {chunk.get("source_id") for chunk in result.get("retrieved", [])}
                )
                note = (
                    f"retrieval did NOT reach `{expected}` -- top-k came from "
                    f"{retrieved_sources or 'no sources'}; check the manifest, chunking, "
                    "and query wording"
                )
            items.append(
                {"id": result["id"], "label": result["label"], "status": status, "note": note}
            )
            continue

        if result["is_validation_test"]:
            caught = verdict == "FAIL" and bool(corrected)
            status = "shipped-and-validated" if caught else "blocked-with-reason"
            note = (
                "seeded violation caught and corrected -- critic loop confirmed functional"
                if caught
                else "seeded violation NOT caught -- critic loop needs review before submission"
            )
        elif verdict == "PASS":
            status = "shipped-and-validated"
            note = "generated clean, no critique issues"
        elif corrected:
            status = "shipped-and-validated"
            note = f"Heckler flagged and corrected: {critique['issue']}"
        else:
            status = "blocked-with-reason"
            note = f"Heckler flagged with no usable correction: {critique['issue'] or 'unparseable critique'}"

        items.append({"id": result["id"], "label": result["label"], "status": status, "note": note})

    all_shipped = all(item["status"] == "shipped-and-validated" for item in items)
    summary = (
        "All content items shipped-and-validated; consistency-check loop confirmed functional."
        if all_shipped
        else "One or more items blocked-with-reason -- see notes above before submission."
    )
    return {"items": items, "summary": summary}


def format_status_report_markdown(report):
    lines = [
        "# Ana -- Closing Status Report",
        "",
        report["summary"],
        "",
        "| Item | Status | Note |",
        "| --- | --- | --- |",
    ]
    for item in report["items"]:
        lines.append(f"| {item['label']} | `{item['status']}` | {item['note']} |")
    return "\n".join(lines)
