"""Task graph: 9 tasks across the 8 agents, run as a single sequential
CrewAI process. Ana brackets the run (kickoff brief, closing synthesis);
every worker task only ever consumes context Ana scoped or a prior
worker's output, never reaching sideways to another agent directly --
the same hierarchical-star shape as `docs/agents/ana/AGENT.md`, minus
CrewAI's `Process.hierarchical` manager-planning overhead.
"""

from crewai import Task

from .agents import ana, warden, frieren, pato, tilesmith, lorena, loomwright, heckler

BRIEF_INPUT = (
    "New content request for The Last Spellroad, Level {level}: the developer needs one new "
    "regular-wave encounter and one new spell tuned to it, fully validated and ready for an "
    "engine-integration pass."
)

kickoff = Task(
    description=(
        BRIEF_INPUT
        + "\n\nWrite a short scoped brief (4-8 sentences) that Warden and Frieren can work from "
        "independently and in parallel: state the level number, the encounter's intended feel "
        "(e.g. introduce a specific debuffer variant, or a ranged-heavy composition), and any "
        "constraint the developer called out. Do not generate the wave or spell yourself -- "
        "that is Warden's and Frieren's job."
    ),
    expected_output=(
        "A short scoped brief in plain text, referencing a specific level number and a specific "
        "encounter intent."
    ),
    agent=ana,
)

wave_task = Task(
    description=(
        "Using the brief above, generate exactly one new wave.json entry: "
        "{{level, wave_index, enemies: [{{type, count, spawn_delay_ms}}], hp_modifier, "
        "damage_modifier}}. Enemy `type` must be one of: spellbound_thug, hexbow_skirmisher, "
        "murmur_wisp, creeping_bramble. State your careless-play and competent-play damage "
        "estimate (as % of the 100-HP pool) in one line before the JSON, and confirm it lands "
        "in the 25-35% / 10-15% bands."
    ),
    expected_output=(
        "One damage-estimate line, then exactly one JSON object matching the wave.json schema."
    ),
    agent=warden,
    context=[kickoff],
)

spell_task = Task(
    description=(
        "Using the brief above (not Warden's wave -- design independently, Pato will check fit), "
        "author exactly one new spell.json entry tuned to counter or complement the brief's "
        "encounter intent. State the one-sentence tactical tradeoff first, then the JSON: "
        "{{id, element, shape, weight, base_power, base_targets, master_discount}}."
    ),
    expected_output=(
        "One tradeoff sentence, then exactly one JSON object matching the spell.json schema."
    ),
    agent=frieren,
    context=[kickoff],
)

validation_task = Task(
    description=(
        "Validate Warden's wave and Frieren's spell above against your numeric templates. For "
        "each of: wave enemy types (must be one of the 4 valid names), damage bands (25-35% "
        "careless / 10-15% competent), debuff caps (2/sec mana-regen floor, 24% speed-drain "
        "cap), spell weight-class Mana/cooldown pairing, and master_discount (exactly \"cost\" "
        "or \"cooldown\") -- state PASS or FAIL with the specific violated value. End with one "
        "line: overall verdict PASS or FAIL."
    ),
    expected_output=(
        "A per-field PASS/FAIL list, then a final overall PASS or FAIL verdict line."
    ),
    agent=pato,
    context=[kickoff, wave_task, spell_task],
)

art_task = Task(
    description=(
        "Given the wave and spell above, propose: (1) which existing/sourceable tileset or "
        "enemy-sprite assets this wave needs, (2) what VFX the new spell needs (shape: line, "
        "cone, or circle), and (3) a proposed source + license for each, following the search "
        "order Kenney.nl -> OpenGameArt CC0 -> recolor/recombine -> hand-author last resort."
    ),
    expected_output=(
        "A short list of assets needed, each with a proposed source and license, plus one line "
        "flagging any asset that would need hand-authoring."
    ),
    agent=tilesmith,
    context=[kickoff, wave_task, spell_task],
)

lore_task = Task(
    description=(
        "Write one short flavor-text or dialogue beat (1-3 sentences) tied to this new wave and "
        "spell, consistent with the Lore Premise and the locked \"destroy the Director\" ending "
        "scope for this slice."
    ),
    expected_output="1-3 sentences of in-world flavor text or dialogue.",
    agent=lorena,
    context=[kickoff, wave_task, spell_task],
)

integration_task = Task(
    description=(
        "Given Pato's validation verdict above (only proceed as if content is usable if the "
        "verdict is PASS -- otherwise note what must change first), write a short "
        "engine-integration note: which real files this touches (e.g. "
        "`src/data/waves/level-{level}.json`, `src/data/spells/spells.json`, "
        "`src/systems/ManaSystem.ts`, `src/systems/MasterySystem.ts`) and in plain language or "
        "short pseudocode, exactly what change each needs. Do not invent new numeric values."
    ),
    expected_output=(
        "A short bullet list: file path -> plain-language or pseudocode description of the "
        "change needed."
    ),
    agent=loomwright,
    context=[kickoff, wave_task, spell_task, validation_task],
)

critique_task = Task(
    description=(
        "Critique the full bundle above (wave, spell, Pato's validation, art proposal, lore "
        "beat, integration note) through your six personas. 1-3 sentences per persona, each "
        "grounded in a specific field or line from the bundle, not a vague vibe."
    ),
    expected_output="Six short, clearly-labeled persona critiques.",
    agent=heckler,
    context=[wave_task, spell_task, validation_task, art_task, lore_task, integration_task],
)

status_task = Task(
    description=(
        "Close this run. Using every prior agent's actual output above (do not paraphrase or "
        "soften Heckler's critique), report the final status of this wave+spell bundle as "
        "exactly one of: shipped-and-validated, blocked-with-reason, or in-progress-with-owner. "
        "Justify the choice in 2-4 sentences referencing the specific outputs that drove it "
        "(e.g. Pato's verdict, any BLOCKING finding from Heckler)."
    ),
    expected_output=(
        "One status label (shipped-and-validated / blocked-with-reason / in-progress-with-owner) "
        "plus a short justification referencing specific prior outputs."
    ),
    agent=ana,
    context=[
        kickoff,
        wave_task,
        spell_task,
        validation_task,
        art_task,
        lore_task,
        integration_task,
        critique_task,
    ],
)

ALL_TASKS = [
    kickoff,
    wave_task,
    spell_task,
    validation_task,
    art_task,
    lore_task,
    integration_task,
    critique_task,
    status_task,
]
