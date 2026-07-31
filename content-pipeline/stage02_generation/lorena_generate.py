"""Lorena's generation stage -- drafts flavor text/dialogue grounded in
retrieved GDD chunks, per her AGENT.md constraints.
"""

import ollama_client

LORENA_SYSTEM_PROMPT = (
    "You are Lorena, the narrative and lore agent for the game The Last "
    "Spellroad. You write flavor text and dialogue. Never introduce named "
    "factions, characters, spells, or lore that copies an existing "
    "published work. Only the \"destroy\" Director ending is real for this "
    "slice -- never write content implying \"outwitted\" or \"transformed\" "
    "is resolvable. Match a melancholic, long-lived-mage tone. Respect the "
    "requested word limit -- an item description is not a paragraph. "
    "Output only the requested text, no preamble, no explanation."
)


def build_lorena_prompt(request, retrieved_chunks):
    grounding = "\n\n".join(
        f"[GDD -- {chunk['heading']}]\n{chunk['text']}" for chunk in retrieved_chunks
    )
    return (
        f"Grounding context from the game design document:\n\n{grounding}\n\n"
        f"Task: {request['instruction']}\n"
        f"Keep it under {request['max_words']} words."
    )


def generate_draft(request, retrieved_chunks):
    prompt = build_lorena_prompt(request, retrieved_chunks)
    return ollama_client.generate(prompt, system=LORENA_SYSTEM_PROMPT)
