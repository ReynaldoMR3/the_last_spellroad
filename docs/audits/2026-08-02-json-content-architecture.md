# JSON content architecture audit

Date: 2026-08-02
Wayfinder ticket: [Audit: does the JSON-content architecture pattern actually hold in the shipped engine code?](https://github.com/ReynaldoMR3/the_last_spellroad/issues/65)

## Verdict

The shipped engine is **data-driven inside an intended closed vocabulary**, not fully content-driven, and that vocabulary is not enforced at the JSON boundary.

- The 12 shipped spells execute generically from JSON because they use the intended three shapes, three weights, four elements, and two Master discount modes. TypeScript declares those sets, but runtime JSON is asserted rather than validated.
- The 15 shipped waves execute generically as ordered lists of existing registered enemy names. Regular/boss flow is data-driven through `level`, `wave_index`, and `is_boss`.
- Tiled JSON controls each level's rendered terrain tiles, dimensions, and tile placement.
- The stronger contract—adding a spell, enemy, wave file, level, or lore entry never requires engine work—does **not** hold. Spell availability, enemy identity/behavior, the level manifest and wave-file sequence, gameplay geometry, and lore ingestion all have code-owned seams.
- The Warden/Frieren/Pato agent crew writes proposal artifacts, not production JSON; promotion into `src/data` is a separate manual decision. The runtime then trusts promoted JSON through TypeScript assertions and prompt/manual validation. It has no code-level schema validation, despite the agent-crew already recording schema drift that Pato did not catch.

This is not evidence of widespread per-content-ID spaghetti: the engine does not branch on individual spell IDs or shipped enemy names during combat. It is evidence that the boundary is narrower than the docs claim.

## Scope and method

The audit traced the production data in `src/data/spells/`, `src/data/waves/`, and `public/assets/levels/` through the TypeScript types, Phaser loaders, runtime systems, and scene. It also searched the shipped runtime for all authored IDs and all reads of JSON fields, then checked the agent-crew's validation claims against its documented known limitations.

Inventory at audit time:

- 12 spell definitions in one JSON file.
- 15 waves across five JSON files, covering levels 1–5 and seven authored enemy type names.
- Five Tiled JSON maps, each with a `Terrain` layer and the shared `kenney-tiny-dungeon-tilemap_packed` tileset.
- No shipped `lore.json` (or equivalent runtime lore-content file).

## Findings matrix

| Content path | What holds | Where the pattern is bypassed | Data-only addition? |
| --- | --- | --- | --- |
| Spell with existing shape/weight/element | `SpellCaster` reads power, targets, weight, discount, and shape generically; Mana and Mastery key state by spell ID | `DEFAULT_LOADOUT_IDS` is a code-owned six-ID allowlist; six of the twelve shipped spells are not playable through the current UI | **No** for a playable spell; JSON-only content can load but is unreachable unless it replaces an allowlisted ID |
| New spell shape, weight, element, or discount mode | TypeScript unions make the intended vocabulary explicit | JSON is not runtime-validated; unknown shapes silently behave as circles, unknown elements are ignored, unknown discount modes get no discount, and unknown weights can throw. New intended behavior still requires code | **No** |
| Wave using registered enemy names | `WaveLoader` loops entries and honors count/delay; scene derives wave progression and boss phase flow from JSON | Files are preloaded and concatenated through a hardcoded five-file manifest; file order, not `wave_index`, determines runtime order | **Yes** inside an existing file, if inserted in the correct array position |
| New authored enemy name using an existing archetype | Wave JSON carries an arbitrary `type` string | Every name must be added to `ENEMY_REGISTRY`; an unknown name is skipped by the loader but remains in the scene's spawn counter, permanently stalling the wave | **No** |
| New enemy archetype or per-enemy tuning | Three archetypes share a common `Enemy` class | Behavior branches and HP, speed, damage, range, cooldown, color, and debuff behavior are TypeScript constants; wave JSON cannot tune them | **No** |
| New level art for an existing level number | Tilemap URL/key derivation and rendering are generic | Only levels in hardcoded `ALL_LEVELS` preload; movement bounds, spawn point, layer name, and shared tileset contract remain code-owned | **Conditionally**: replacing art for levels 1–5 is data-only if it keeps the existing Tiled contract |
| Additional level/wave file | Level numbers already travel through wave JSON into HUD, art lookup, checkpoint/reset, and boss grouping | Additions require updating `ALL_LEVELS`, explicit Phaser cache preloads, and the explicit wave concatenation list | **No** |
| Agent-crew spell/wave/lore proposal | Warden, Frieren, Pato, and Lorena produce coordinated review artifacts | Outputs are raw task-text strings under `agent-crew/output`; no parser or promotion path writes production data | **No**; developer promotion is explicitly separate |
| Lore entry | Save schema has `loreFlags`, and the content pipeline can generate prose artifacts | No production lore schema, loader, registry, renderer, interaction, or promotion path exists | **No**; this is a missing runtime subsystem, not merely missing data |

## Where the pattern holds

### Spells are generic within the existing schema

`SpellDefinition` defines ID, element, shape, weight, base power, base targets, and Master discount (`src/data/types.ts:13`). `SpellCaster.tryCast` reads `weight`, `master_discount`, `base_power`, and `base_targets` without checking a spell's ID (`src/entities/SpellCaster.ts:62`). Mastery state and cooldown state are keyed by arbitrary spell ID, so an existing-vocabulary spell does not need its own state implementation (`src/entities/SpellCaster.ts:32`; `src/systems/MasterySystem.ts:49`).

Geometry is selected by the authored `shape`, both for hit tests (`src/entities/SpellCaster.ts:98`) and previews (`src/scenes/SpellroadScene.ts:580`). A repository-wide search found shipped spell IDs in runtime TypeScript only in `DEFAULT_LOADOUT_IDS`; combat behavior itself never branches on `arc_lance`, `stone_spike`, or another individual ID.

### Wave composition and boss flow are generic within the registered enemy set

`spawnWave` iterates every JSON enemy entry, uses its `count` and `spawn_delay_ms`, resolves its name through the registry, and creates the corresponding archetype (`src/systems/WaveLoader.ts:16`). The scene computes total enemies from JSON, progresses sequentially, groups boss phases using `is_boss` plus `level`, and labels phases using `wave_index` (`src/scenes/SpellroadScene.ts:656`; `src/scenes/SpellroadScene.ts:681`; `src/scenes/SpellroadScene.ts:852`). There are no branches on individual wave file names or enemy names after loading.

Adding another wave object to an already-loaded JSON array is therefore data-only when it uses registered enemy names and is placed in the intended array order.

### Level terrain rendering is data-driven within the five-level manifest

For a preloaded level, Phaser reads the Tiled JSON's dimensions and tile data. `computeTilemapOffset` positions maps from their live pixel dimensions rather than special-casing the boss map (`src/systems/levelArt.ts:81`). `levelMapKey` and `levelMapUrl` derive names from the level number (`src/systems/levelArt.ts:37`). Replacing a current level's tile JSON while retaining the `Terrain` layer and shared tileset name requires no scene change.

## Where the pattern is bypassed

### 1. A new spell is not automatically playable

The scene equips exactly six code-owned IDs (`src/scenes/SpellroadScene.ts:105`). It maps those IDs against the loaded JSON and silently drops missing entries (`src/scenes/SpellroadScene.ts:217`). The JSON contains 12 spells, so half of the shipped content is already unreachable from the current hotbar. A thirteenth spell added only to JSON will load and type-cast successfully but will not enter play.

This is the only individual-spell-ID special case found in runtime code, and it is an availability seam rather than a combat-logic seam.

### 2. The spell vocabulary is code-owned but not runtime-enforced, and element is inert

Shape behavior exists twice: once in the cast hit test and once in the preview renderer. Adding a fourth shape requires both locations plus the `AoEShape` union and geometry constants to change (`src/data/types.ts:2`; `src/entities/SpellCaster.ts:98`; `src/scenes/SpellroadScene.ts:580`). Weight cost/cooldown values live in `WEIGHT_CLASS`, so a new weight requires TypeScript changes (`src/systems/ManaSystem.ts:6`).

Those TypeScript unions do not validate Phaser's runtime JSON cache. An unknown shape falls through both `if` chains and behaves as a circle; an unknown discount mode simply receives no Master discount; an unknown element is accepted and ignored; and an unknown weight produces no `WEIGHT_CLASS` entry and can throw when cost/cooldown properties are read. The closed sets describe developer intent and compile-time TypeScript callers, not an enforced content boundary.

`element` is declared and authored but never read by shipped runtime TypeScript. Fire, ice, earth, and lightning currently differ only through other authored fields, not through elemental behavior or presentation. That is not hardcoded per-element logic; it is an unimplemented data field.

### 3. Enemy names require a TypeScript registry entry

Wave JSON accepts `type: string`, but `WaveLoader` skips any name absent from `ENEMY_REGISTRY` (`src/systems/WaveLoader.ts:25`). The registry contains all seven shipped names and maps each to one of three archetypes plus an optional debuff variant (`src/data/enemyRegistry.ts:16`). This skip is not fail-safe: the scene initializes `enemiesRemainingToSpawn` from every authored entry (`src/scenes/SpellroadScene.ts:705`), while the skipped entry never calls `onSpawn` to decrement it. Even after every valid enemy dies, the completion gate cannot reach zero and the run soft-locks on that wave (`src/scenes/SpellroadScene.ts:856`).

Consequently, Warden cannot add even a new lore/name variant of an existing melee archetype through wave JSON alone. The engine also displays the archetype label (`Melee`, `Ranged`, or `Debuffer`) rather than the authored enemy type, so the authored identity does not survive into the current presentation (`src/entities/Enemy.ts:145`; `src/systems/enemyStatusOverlay.ts:15`).

### 4. Enemy behavior and tuning are not content data

The `Enemy` class owns per-archetype damage, color, speed, HP, attack ranges, cooldowns, and behavior branches (`src/entities/Enemy.ts:5`; `src/entities/Enemy.ts:12`; `src/entities/Enemy.ts:18`; `src/entities/Enemy.ts:83`; `src/entities/Enemy.ts:217`). The scene separately applies fixed melee/ranged damage callbacks (`src/scenes/SpellroadScene.ts:803`). A new archetype—or a tougher boss enemy using an existing archetype—requires code because JSON supplies neither stats nor a behavior identifier separate from the registry.

The source explicitly calls enemy HP a placeholder and flags that future tougher enemies will need a decision (`src/entities/Enemy.ts:77`). All boss phases currently use ordinary archetypes with `hp_modifier: 1.0`, so the limitation has not yet produced divergent shipped behavior.

### 5. Two required wave fields are dead data

`WaveDefinition` requires `hp_modifier` and `damage_modifier` (`src/data/types.ts:31`), and every shipped wave authors both as `1.0`. No runtime TypeScript reads either field. A future Warden/Pato output can validate non-1.0 modifiers while the engine silently ignores them.

`_onboarding_exception` is intentionally documentation-only and says so in its type comment, so it is not an accidental bypass (`src/data/types.ts:41`). In contrast, the modifier fields are presented as engine-integration data but have no consumer.

### 6. The level and wave-file manifests are hardcoded

`ALL_LEVELS` is `[1, 2, 3, 4, 5]` (`src/systems/levelArt.ts:19`). `SpellroadScene.preload` explicitly registers five wave cache keys/files, and `create` explicitly concatenates those same five caches (`src/scenes/SpellroadScene.ts:198`; `src/scenes/SpellroadScene.ts:224`). Adding level 6 or another boss file therefore requires edits in multiple TypeScript locations.

Within a loaded file, runtime order is array order. `wave_index` is used for labels and boss phase semantics but not to sort or validate the array. A valid-looking file with entries out of order will run out of order.

### 7. Tiled JSON is presentation data, not the gameplay level definition

The tilemaps control rendered tiles, but movement bounds, enemy spawn coordinates, mage start, canvas dimensions, and spell-preview clipping remain constants in `SpellroadScene` (`src/scenes/SpellroadScene.ts:25` through `src/scenes/SpellroadScene.ts:100`). `renderLevelArt` explicitly does not derive gameplay geometry from the Tiled map (`src/scenes/SpellroadScene.ts:286`). The layer name `Terrain` and shared tileset name are also code-owned contracts (`src/scenes/SpellroadScene.ts:306`; `src/systems/levelArt.ts:30`).

A map can therefore depict walls, pockets, or dimensions that the movement/collision model does not honor. This is acceptable for the current decorative tile layer, but it is not a generic data-driven level/layout system.

### 8. The agent crew does not feed production data

The named Warden/Frieren/Pato producer-validator chain ends in proposal artifacts. The crew contract explicitly excludes changes to `src/data` and says promotion is a separate developer decision (`agent-crew/CONTEXT.md:9`). `main.py` writes each task's raw text to `agent-crew/output` and wraps those same raw strings in `bundle.json`; it does not parse validated spell/wave objects or update the game (`agent-crew/main.py:94`).

This manual gate may be deliberate and appropriate, but it means the documented producer-to-engine path is not an automated content pipeline for spells or waves. A crew run cannot become playable through data generation alone; a developer must interpret, validate, merge, and place its proposal.

### 9. There is no production lore-content path

No lore JSON ships under `src/data`, and the runtime has no lore loader or presentation system. `SaveBlob.loreFlags` is the sole runtime lore-shaped field (`src/systems/SaveSystem.ts:7`), but nothing in the scene reads or writes it.

The separate content pipeline generates and validates Markdown/JSON bundle artifacts, not production game data. As with the agent crew's spell/wave proposals, there is no promotion step from lore output into the Phaser runtime. Adding discoverable item lore, NPC lines, or trial narration therefore requires a schema and engine integration before Lorena can make data-only additions.

### 10. “Validated JSON” is a process assertion, not an enforced runtime/build gate

The scene retrieves Phaser cache values and asserts them directly as `SpellDefinition[]` and `WaveDefinition[]` (`src/scenes/SpellroadScene.ts:217`). TypeScript interfaces disappear at runtime; malformed JSON can pass the cast and fail, degrade, or silently acquire fallback semantics later. No JSON Schema, Zod parser, or equivalent code-level validation exists in the shipped runtime or test suite.

The agent-crew documents a concrete failure: generated casing/nesting drifted from the exact schema and Pato did not reliably catch it; its README says a code-level validator would be needed (`agent-crew/README.md:54`). The current tests cover selected pure engine rules but do not parse and validate every production spell/wave entry against a schema.

## Extension-cost checks

These concrete checks answer the ticket's “would adding content require engine code?” test:

1. **Add a spell with existing fields:** JSON edit loads it, but a TypeScript edit to `DEFAULT_LOADOUT_IDS` (or a future loadout UI) is required to play it.
2. **Add a wave to level 3 using existing enemies:** JSON-only, provided it is inserted in the intended array order and uses registered names.
3. **Add a new enemy name that behaves like melee:** JSON plus a TypeScript registry edit; JSON-only skips every instance while leaving the spawn counter nonzero, permanently stalling wave completion.
4. **Add a tougher boss enemy:** TypeScript changes are required because enemy HP/stats are archetype constants and wave modifiers are ignored.
5. **Add level 6:** Tiled JSON plus wave JSON plus changes to the level manifest, wave preloads, and wave concatenation.
6. **Add an NPC lore line:** engine work is required; there is no shipped schema/loader/presentation seam.
7. **Promote an agent-crew proposal:** manual developer work is required to extract/normalize raw task text and merge it into production JSON; the crew does not write `src/data`.

## Decision inputs

The follow-up decision should not ask “is everything data-driven?”; the evidence answers that with “no.” The useful decision is where the vertical slice actually needs the boundary:

- **Keep the closed-vocabulary model:** Treat new spell shapes, enemy archetypes, levels, and lore delivery as engine features; promise data-only additions only for spells using existing vocabulary, waves using registered enemies, and replacement art for levels 1–5. This is the smallest honest contract.
- **Deepen selected seams before more content:** Highest-leverage candidates are a code-level schema/build gate, a data/manifest-driven content catalog, and moving enemy identity/stats into data. These prevent silent skips/dead fields and remove repeated manifest edits without requiring a general-purpose engine.
- **Do not build a universal content engine for the course slice:** The evidence does not show per-ID combat spaghetti. It shows a handful of explicit closed sets and missing seams. Any fix should target content planned for the vertical slice, especially lore/exploration work, rather than abstract extensibility.

The newly precise Wayfinder question is: **Which of these seams must become data-only before the atmosphere/lore second wave, and which should remain intentionally code-owned for the vertical slice?**
