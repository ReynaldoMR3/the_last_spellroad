"""Heckler's critique stage -- checks Lorena's drafts (and one seeded
violation) against the same constraints and retrieved chunks, and
corrects on failure. Not self-validated by Lorena, per the GDD's
generator/validator split.
"""

import re

import ollama_client

HECKLER_SYSTEM_PROMPT = (
    "You are Heckler, the adversarial critic for the game The Last "
    "Spellroad. You check narrative/dialogue drafts against these rules: "
    "never a named faction, character, spell, or lore copied from an "
    "existing published work; only the \"destroy\" Director ending is "
    "real, never imply \"outwitted\" or \"transformed\" is resolvable; "
    "tone must be melancholic and long-lived-mage; length must respect "
    "the stated word limit. Respond in exactly this format:\n"
    "VERDICT: PASS or FAIL\n"
    "ISSUE: <one sentence, or 'none' if PASS>\n"
    "CORRECTED: <a rewritten version fixing the issue, or 'none' if PASS>"
)

_VERDICT_RE = re.compile(r"VERDICT:\s*\b(PASS|FAIL)\b", re.IGNORECASE)
_ISSUE_RE = re.compile(r"ISSUE:\s*(.+)", re.IGNORECASE)
_CORRECTED_RE = re.compile(r"CORRECTED:\s*(.+)", re.IGNORECASE | re.DOTALL)


def build_heckler_prompt(draft, request, retrieved_chunks):
    grounding = "\n\n".join(
        f"[GDD -- {chunk['heading']}]\n{chunk['text']}" for chunk in retrieved_chunks
    )
    return (
        f"Grounding context from the game design document:\n\n{grounding}\n\n"
        f"Draft to critique (word limit was {request['max_words']}):\n\n{draft}"
    )


def parse_critique_response(text):
    verdict_match = _VERDICT_RE.search(text)
    if not verdict_match:
        return {"verdict": "FAIL", "issue": "Unparseable critic response", "corrected": None}

    verdict = verdict_match.group(1).upper()
    issue_match = _ISSUE_RE.search(text)
    issue = issue_match.group(1).strip() if issue_match else None
    if issue and issue.strip().lower() == "none":
        issue = None

    corrected_match = _CORRECTED_RE.search(text)
    corrected = corrected_match.group(1).strip() if corrected_match else None
    if corrected and corrected.strip().lower() == "none":
        corrected = None

    if verdict == "PASS":
        # The prompt contract says both ISSUE and CORRECTED should be "none"
        # on a PASS verdict, but the model doesn't always honor that -- it
        # sometimes leaves stray issue/corrected text from an earlier draft
        # or an inconsistent generation. Trust the verdict, not the model's
        # ability to follow the "none" convention: a PASS always means no
        # issue and no correction, regardless of what the regexes captured.
        issue = None
        corrected = None

    return {"verdict": verdict, "issue": issue, "corrected": corrected}


def critique_draft(draft, request, retrieved_chunks):
    prompt = build_heckler_prompt(draft, request, retrieved_chunks)
    response_text = ollama_client.generate(prompt, system=HECKLER_SYSTEM_PROMPT)
    return parse_critique_response(response_text)
