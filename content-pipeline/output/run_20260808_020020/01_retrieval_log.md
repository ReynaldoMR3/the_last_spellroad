# Retrieval Log

## Canonical corpus

Corpus snapshot hash: `37e028db997cdd426f684d6c318eabb1e3b44f347c536dbadcd83671adb8b1ca`

| Source id | Path (relative to DOCS_ROOT) | Content sha256 | Chunks |
| --- | --- | --- | --- |
| `gdd` | `game/the-last-spellroad-design.md` | `b9f401bef8ed434a...` | 43 |
| `opening-experience-brief` | `agents/_reference/opening-experience-brief.md` | `2a6853d86e703aae...` | 6 |

## NPC dialogue (rescuable adventurer)

**Query:** tone and rules for a trapped adventurer NPC the player can rescue

**Retrieved chunks:**

- `Player Fantasy` (source `gdd`, score 0.663)
  > The player is not a fast action hero. The player is an old, patient mage reading the battlefield. They win by preparing the right spell geometry, understanding enemy patterns, managing cooldowns, and positioning carefully.  The player slowly uncovers why the Spellroad exists and why it was created.
- `Gameplay Loop` (source `gdd`, score 0.659)
  > 1. Enter a narrow Spellroad expedition. 2. Fight tile-based enemy waves. 3. Collect spell fragments, relics, or knowledge. 4. Choose from generated spell upgrades. 5. Meet or rescue trapped adventurers. 6. Advance to a harder road segment. 7. Face a Director-controlled boss or trial.  The lore says
- `Lore Premise` (source `gdd`, score 0.634)
  > Ancient humans discovered a form of artificial general intelligence through spellcraft, sacred geometry, and machine-like magical reasoning. Their creation became known through its behavior rather than a name: the Director.  The Director turned the Spellroad into an endless, beautiful prison. It ge

**Output:**

"Rescue me, if you can" she whispers, her voice barely audible over the hum of machinery; the machinery's gentle thrumming has become comforting. She gazes wistfully at a nearby spell fragment, lost in thought.

## Item/relic flavor text

**Query:** recovered spell-fragment relic flavor text length constraint per Lorena's role

**Retrieved chunks:**

- `Lorena — Narrative & Lore` (source `gdd`, score 0.699)
  > Keeps the Lore Premise, companion authenticity, and ending-path scope (destroy, outwit, or transform the Director) consistent across every other agent's output, and writes flavor text and dialogue. Also briefs Composer's creative direction (mood, tempo, instrumentation) for a music track, per `docs
- `Narrative and musical direction — Lorena briefs, Composer realizes` (source `opening-experience-brief`, score 0.636)
  > - The first emotional promise is magical capability and forward momentum, not loneliness. - The opening motif should remain transformable: later arrangements can slow, thin, darken, or move it toward minor harmony without losing its identity. - Favor fast plucked strings, celesta or bright bells, h
- `Summary` (source `gdd`, score 0.608)
  > The Last Spellroad is a low-spec, top-down, Tibia-like magical roguelite built around short single-lane expeditions. ("Tibia-like" refers to *Tibia*, a late-1990s top-down MMORPG — the reference is to its minimalist, low-spec 2D presentation and unhurried pacing, not to any multiplayer or MMO struc

**Output:**

A shard of forgotten incantation, its essence still resonates with the whispers of a long-forgotten geometry, echoing through the desolate expanse of the Spellroad.

## Mini-boss/Director trial narration

**Query:** the mini-boss Director trial and the destroy ending scope lock

**Retrieved chunks:**

- `Lore Premise` (source `gdd`, score 0.589)
  > Ancient humans discovered a form of artificial general intelligence through spellcraft, sacred geometry, and machine-like magical reasoning. Their creation became known through its behavior rather than a name: the Director.  The Director turned the Spellroad into an endless, beautiful prison. It ge
- `Screen Flow And Pause` (source `gdd`, score 0.564)
  > Before gameplay starts, the game boots through a Boot/Preload scene (loads assets, no player decision) into a Title scene. The Title scene offers **New Game** if no save exists; if a save exists, it offers **Continue** (loads the existing save, see Save Data And Persistence) alongside **New Game**,
- `Advancement And Completion` (source `gdd`, score 0.562)
  > Even though the Spellroad is framed as infinite, each level should give the player a clear sense of progress. Conquering a road segment, surviving a wave set, earning a promotion, completing a spell pattern, or defeating a Director trial should all provide closure.  The larger mystery gives long-te

**Output:**

"You've trudged on this road for what feels like an eternity, blind to its true purpose. Now, you'll discover the cruel beauty that's been waiting for you."

## Seeded violation (functional-loop proof, not a graded output)

**Query:** originality requirement -- no named factions or lore copied from published work

**Retrieved chunks:**

- `Validation — Heckler challenges, developer approves` (source `opening-experience-brief`, score 0.619)
  > - A new player should identify the mage, enemies, walkable road, pickups, shrine, and spell area immediately. - Magic should feel exciting within 30 seconds without making the terrain visually noisy. - Music and effects must loop/mix cleanly and must not mask gameplay-relevant SFX. - The winning tr
- `Prompt Constraints` (source `gdd`, score 0.608)
  > Every generating or reviewing agent runs against a fixed set of prompt constraints — the guardrails that keep its output consistent and repeatable across runs, rather than improvised fresh each time. These are what make the roster's outputs safe to validate against Pato's numeric templates and safe
- `Art Sourcing And Origination Pipeline` (source `gdd`, score 0.605)
  > Warden, Frieren, and Lorena generate structured data at dev-time with no external dependency beyond the model itself (see Engine Integration). Tilesmith's job is fundamentally different in kind, not just content: art can't be generated as a JSON value checked against a numeric template — it has to

**Output:**

The trapped mage speaks of the Emberwrought Concord, an ancient order who first bound the Director inside the Hollow Spire, and swears their oath will one day break free.

## Canonical-corpus retrieval check (opening-experience brief)

**Query:** Level 1 opening art and music direction for the Runes Awake treatment

**Retrieved chunks:**

- `Shared target — Ana routes` (source `opening-experience-brief`, score 0.739)
  > The Opening Experience is the player's first minute in Level 1. It must lead with magical excitement while preserving tactical readability and leaving room for later terrain and music to become stranger and more melancholic.  The art direction is **Runes Awake** at **Arcane Momentum** intensity. Fa
- `(front matter)` (source `opening-experience-brief`, score 0.722)
  > This is the stable cross-agent reference for the approved Level 1 art-and-music direction. Load only the sections owned by the dispatched role. The full rationale and prototype boundaries live in `docs/superpowers/specs/2026-08-07-opening-art-music-prototypes-design.md`.
- `Narrative and musical direction — Lorena briefs, Composer realizes` (source `opening-experience-brief`, score 0.619)
  > - The first emotional promise is magical capability and forward momentum, not loneliness. - The opening motif should remain transformable: later arrangements can slow, thin, darken, or move it toward minor harmony without losing its identity. - Favor fast plucked strings, celesta or bright bells, h

**Output:**

Retrieval-only probe -- not content. This entry exists solely to demonstrate that the canonical-source allowlist reaches the approved Level 1 opening-experience reference, so a live run's retrieval log proves the corpus is more than the GDD. Nothing is generated or graded from it.
