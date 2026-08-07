# Opening Art and Music Prototypes — Design

**Status:** approved in conversation on 2026-08-07; written-spec review remains the gate before implementation planning.

## Outcome

Create two sequential, throwaway prototypes that make the beginning of The Last Spellroad immediately exciting through art and music without losing tactical readability or the grounded stone-and-forest foundation. Prototype 1 auditions three production treatments inside one approved direction. Prototype 2 applies the selected treatment to the real Level 1 opening for a full first-minute playtest.

The approved direction is **Runes Awake** at **Arcane Momentum** intensity. Level 1 begins in familiar stone and forest so later terrain can become older, colder, stranger, and more melancholic. Bright magic carries the opening emotion; the world does not begin at maximum sadness or spectacle.

## Constraints

- Docker is the boundary for every server, model runtime, generator, converter, downloader, and verification command. No Homebrew, global npm/pip, host virtualenv, or host model installation.
- Target hardware is an 8 GB Apple M1 MacBook Air with limited free disk. Linux Docker workloads are CPU-only; heavy diffusion and neural audio are not the default path.
- Art remains CC0-first and provenance-tracked. AI generation does not bypass human license review.
- API Mart has a hard total exposure ceiling of MXN 100 and starts at zero spend. It is considered only after Prototype 1 identifies a precise signature-art gap and the exact model/channel commercial terms are confirmed.
- The current gameplay, Level 1 geometry, B+C road-feel decision, timings, and enemy silhouettes remain fixed while presentation is compared.
- These prototypes answer design questions. They do not become production architecture or a permanent gallery.

## Prototype workbench lifecycle

The reusable `src/dev/prototypeHarness.ts`, its tests, and `docs/eng-skills/prototype-harness.md` remain permanent. Only the currently Active Prototype scene and its `main.ts` registry entry stay on `main`.

Before the opening prototype is registered, remove the resolved `PrototypeRoadFeelScene` and its stale registry entry. Preserve issue #68's verdict—side-pocket plus reactive shrine, with ambient dressing as a baseline—in durable context and in the new prototype's fixed baseline.

An Active Prototype loads current production Level 1 assets, geometry, and reusable systems wherever practical rather than copying snapshots. If a production change affects those dependencies, the same change must update and Docker-smoke-check the Active Prototype. Resolved prototypes are captured on their branch with screenshots/audio/verdict/reproduction notes, then removed from `main`; archived prototypes are not maintained.

## Prototype 1 — Opening Magic Audition Lab

**Question:** which production treatment expresses Runes Awake / Arcane Momentum with enough identity and excitement to justify its asset cost?

Create a throwaway Phaser scene at `?prototype=openingmagic`, using the real Level 1 tilemap and canvas scale. It includes the fixed issue #68 baseline, simple movement, stable enemy silhouettes, and one identical showcase spell. `1`, `2`, and `3` switch treatments; `Space` casts the showcase spell. Switching must replace all treatment-owned visual and musical layers without changing gameplay.

### Treatments

1. **CC0 Remix:** existing Kenney terrain plus individually verified CC0 runes, particles, ambience, and a temporary music reference. This establishes the lowest-cost quality floor.
2. **Deterministic Original:** container-generated glyphs/VFX and a Composer-authored `music21` loop. This establishes how much identity the free reproducible toolchain can create without sourced presentation assets beyond the terrain base.
3. **Hybrid — expected winner:** CC0 stone/forest foundation plus deterministic original runes, spell effects, and Composer music. This tests the recommended balance of coherence, originality, cost, and maintainability.

Each treatment records asset source/model, license, prompt or generator revision, seed where applicable, transforms, container image/version, and output hash. Candidates remain staged; none silently becomes production art.

### Prototype 1 acceptance

- A player can compare all three treatments in one Docker-run session at actual game scale.
- The same cast, movement, geometry, and silhouettes are preserved across treatments.
- Within 30 seconds, the full treatment communicates magical excitement.
- Spell geometry and enemies remain more readable than decoration.
- Audio loops cleanly, does not clip, and does not mask hit/cast/impact cues.
- Frame pacing remains acceptable on the target Mac and a low-spec browser profile.
- The developer records one treatment or an explicit mix as the verdict.

## Prototype 2 — Real Level 1 Opening

**Question:** does the selected treatment make the actual first minute enjoyable when combined with production gameplay rather than an isolated audition scene?

Apply only the Prototype 1 verdict to the real Level 1 opening behind a temporary prototype key or feature-isolated branch. Include the production scene flow, the selected visual/audio resources, and the fixed B+C road-feel baseline. Do not use Prototype 2 to introduce new combat, economy, or narrative systems.

### Prototype 2 acceptance

- The title-to-Level-1 transition, first movement, first pickup/shrine beat, first cast, and first enemy contact form a coherent one-minute experience.
- The player reports that magic feels exciting at the beginning.
- Terrain, hazards, enemies, pickups, shrine, targeting previews, and spell effects remain distinguishable.
- Music starts/stops/loops correctly and preserves gameplay-relevant SFX.
- Docker tests, typecheck, build, and live smoke check pass.
- Heckler critiques against the approved brief; the developer makes the final feel and license decisions.

## Free-first production flow

1. Ana scopes each run against the checked-in brief and current Level 1 target.
2. The RAG corpus retrieves only approved canonical sources.
3. Tilesmith searches Kenney, then individually verified OpenGameArt CC0, then recolors/recombines CC0, then originates only when gaps remain.
4. Local Ollama helps with divergent prompt/checklist drafts only. It does not render assets or make factual license decisions.
5. Deterministic Pillow/ImageMagick creates pixel glyphs, palettes, masks, and atlases. `rembg` may assist cutouts; nearest-neighbor scaling is preferred for pixel art.
6. Lorena briefs the opening loop; Composer produces deterministic `music21` notation and a licensed-SoundFont browser render.
7. Heckler critiques independently. Human approval controls direction, licensing, and promotion.

Gemini CLI is not currently installed and is not a local model; it is not part of the free-first path. A CPU-only SD 1.5 pixel checkpoint is optional slow ideation, not a production dependency. Heavy image and neural-audio models are rejected for this machine.

## API Mart gate

API Mart remains an optional private evaluation, never a default pipeline step. Before any purchase, checkout must permit no more than USD 4 funding and show an all-in authorization of at most MXN 100, with auto-recharge disabled. The exact upstream provider/channel and commercial game-use terms must be confirmed in writing before any output can ship.

If Prototype 1 exposes a precise gap, run one fixed rights-safe brief across a small model comparison, record billed cost after every batch, and stop on unclear billing, changed channel/rate, two consecutive unusable outputs, or the documented credit ceiling. Prompts and inputs must be nonconfidential and project-owned.

## ICM and deterministic RAG

Canonical knowledge is layered:

- `docs/context.md` defines project language only.
- This spec records the approved design and trade-offs.
- ADR-0003 records the Docker-only rotating-workbench constraint.
- `docs/agents/_reference/opening-experience-brief.md` is the stable role-scoped execution brief.
- Agent logs record produced and validated artifacts.
- `docs/research/` contains evidence, not canonical direction.
- GitHub issues carry executable work, blockers, and human gates.

The current content pipeline retrieves only the GDD. A prerequisite engineering ticket will replace that implicit single-file corpus with a checked-in allowlist manifest of approved canonical sources. Research, logs, generated output, and throwaway prototypes stay excluded unless deliberately promoted.

Every RAG run must record source paths and content hashes, deterministic chunk hashes, embedding and generation model identifiers, prompts, seeds/parameters where available, retrieval results, and output hashes. A changed source invalidates only its affected embedding cache entries. Generated output cannot promote itself into the canonical corpus.

## Testing and failure handling

- Permanent harness behavior keeps automated tests.
- Active prototype-specific behavior receives only focused smoke tests where they protect switching, asset loading, or audio lifecycle; it does not grow into a parallel production suite.
- Any production change touching the Active Prototype's dependencies updates both production tests and the prototype, then runs its Docker smoke check.
- Missing or uncleared assets fall back to logged placeholders; they do not block comparing layout and timing.
- A failed model/API call is never retried without an explicit bounded policy and known maximum cost.
- A treatment that misses readability, loop quality, performance, provenance, or license gates cannot win regardless of subjective beauty.

## Ticket boundaries and ordering

1. [#127](https://github.com/ReynaldoMR3/the_last_spellroad/issues/127) — clean the resolved road-feel prototype and codify Active Prototype freshness.
2. [#130](https://github.com/ReynaldoMR3/the_last_spellroad/issues/130) — upgrade the RAG corpus to a deterministic canonical-source manifest.
3. [#126](https://github.com/ReynaldoMR3/the_last_spellroad/issues/126) — produce the three treatment resource packs from the approved brief; blocked by #130.
4. [#128](https://github.com/ReynaldoMR3/the_last_spellroad/issues/128) — build and evaluate Prototype 1; blocked by #127, #130, and #126.
5. [#129](https://github.com/ReynaldoMR3/the_last_spellroad/issues/129) — optionally run the gated API Mart experiment only if #128 records a precise unresolved signature-art gap; closing this with zero spend is valid.
6. [#125](https://github.com/ReynaldoMR3/the_last_spellroad/issues/125) — build and evaluate Prototype 2; blocked by the #128 human verdict and any selected asset's license clearance.
7. Convert the final verdict into production tickets; remove the Active Prototype from `main` after evidence is captured.

[#124](https://github.com/ReynaldoMR3/the_last_spellroad/issues/124) is the parent tracking issue. GitHub stores the parent/sub-issue relationships and blocking edges natively.

No prototype implementation begins until the developer reviews this written spec in the next session.
