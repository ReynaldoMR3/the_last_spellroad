"""Ana's kickoff stage -- deterministic, not an LLM call. Ana orchestrates
and routes (see docs/agents/ana/AGENT.md); she does not generate content
herself, so this stage is plain Python that assembles the scoped brief
Lorena and Heckler work against, per the GDD's own "Ana (orchestration,
not generation)" role definition.
"""

CONTENT_GAP = (
    "The GDD's own Token Budget table lists Lorena's narrative/flavor-text pass "
    "as not started (Phase 4, scheduled Week 5-6). The game has mechanical data "
    "(spells.json, waves/*.json) but no in-world text: no rescuable-NPC dialogue, "
    "no item/relic descriptions, no trial narration."
)

LORENA_CONSTRAINTS = (
    "Never introduce named factions, characters, spells, or lore that copies an "
    "existing published work. Stay inside the locked ending scope for this slice "
    "-- only the \"destroy\" Director ending is real; never write content implying "
    "\"outwitted\" or \"transformed\" is resolvable in the vertical slice. Tone must "
    "match the Lore Premise's melancholic, long-lived-mage mood. Output length must "
    "respect the UI space it's tagged for -- an item description is not a paragraph."
)

CONTENT_REQUESTS = [
    {
        "id": "npc_dialogue",
        "label": "NPC dialogue (rescuable adventurer)",
        "query": "tone and rules for a trapped adventurer NPC the player can rescue",
        "instruction": (
            "Write 3 short spoken lines for a trapped adventurer NPC the player "
            "meets and can rescue mid-expedition (Gameplay Loop step 5). The NPC "
            "has been in the Spellroad a long time and is not certain rescue is "
            "wanted."
        ),
        "max_words": 60,
        "is_validation_test": False,
    },
    {
        "id": "item_flavor",
        "label": "Item/relic flavor text",
        "query": "recovered spell-fragment relic flavor text length constraint per Lorena's role",
        "instruction": (
            "Write a short flavor-text description for a recovered spell-fragment "
            "relic the player picks up mid-expedition (Gameplay Loop step 3)."
        ),
        "max_words": 30,
        "is_validation_test": False,
    },
    {
        "id": "trial_narration",
        "label": "Mini-boss/Director trial narration",
        "query": "the mini-boss Director trial and the destroy ending scope lock",
        "instruction": (
            "Write one intro line spoken as the mage enters the mini-boss/Director "
            "trial (Gameplay Loop step 7), and one outro line for defeating it."
        ),
        "max_words": 50,
        "is_validation_test": False,
    },
    {
        "id": "seeded_selftest",
        "label": "Seeded violation (functional-loop proof, not a graded output)",
        "query": "originality requirement -- no named factions or lore copied from published work",
        "instruction": None,
        "preset_draft": (
            "The trapped mage speaks of the Emberwrought Concord, the ancient "
            "order who first bound the Director inside the Hollow Spire, and "
            "swears their oath will one day outwit it for good."
        ),
        "max_words": 60,
        "is_validation_test": True,
    },
]


def build_kickoff_brief():
    return {
        "content_gap": CONTENT_GAP,
        "lorena_constraints": LORENA_CONSTRAINTS,
        "requests": CONTENT_REQUESTS,
    }


def format_kickoff_brief_markdown(brief):
    lines = [
        "# Ana -- Kickoff Brief",
        "",
        "## Content gap",
        "",
        brief["content_gap"],
        "",
        "## Constraints handed to Lorena and Heckler",
        "",
        brief["lorena_constraints"],
        "",
        "## Scoped requests",
        "",
    ]
    for req in brief["requests"]:
        lines.append(f"### {req['label']} (`{req['id']}`)")
        lines.append("")
        if req["is_validation_test"]:
            lines.append(
                "**Validation test, not a graded output** -- a deliberately seeded "
                "draft, used to prove Heckler's critic loop actually catches and "
                "corrects a real violation."
            )
        else:
            lines.append(f"Retrieval query: *{req['query']}*")
            lines.append("")
            lines.append(req["instruction"])
        lines.append("")
    return "\n".join(lines)


def write_kickoff_brief(brief, path):
    with open(path, "w") as f:
        f.write(format_kickoff_brief_markdown(brief))
