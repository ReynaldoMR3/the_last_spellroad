"""Ana's closing-status stage -- deterministic, not an LLM call. Reasons
over Heckler's structured verdicts using the GDD's own three-state model
(shipped-and-validated / blocked-with-reason / in-progress-with-owner).
"""


def build_status_report(results):
    items = []
    for result in results:
        critique = result["critique"]
        verdict = critique["verdict"]
        corrected = critique["corrected"]

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
