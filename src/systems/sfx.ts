/**
 * SFX one-shot asset identity (backlog 3.10, issue #81 / ADR-0002).
 *
 * Scope, per the developer's original ask (2026-08-03 playtest, issue #81: "we need sound to
 * know when we are getting hit, so you can run away") plus the ADR's stated extension (cast/
 * impact/death alongside the hit-cue): five one-shots covering content already shipped in the
 * engine --
 *   - `hit`: the player takes damage (`HealthSystem`'s `onDamage` callback, already wired to
 *     the existing "Hit!" flash message in `SpellroadScene.ts`'s `create()`) -- the highest-
 *     priority, gameplay-relevant cue this ticket exists for.
 *   - `cast`: a spell is released (`spawnCastEffect`, backlog 2.36 / issue #79's visual flash).
 *   - `impact`: a spell lands a hit on an enemy (`spawnImpactBurst`, same ticket's per-hit
 *     visual beat).
 *   - `enemyDeath`: an enemy's `takeDamage` call returns `killed` (`removeEnemy`).
 *   - `playerDeath`: the player's HP reaches 0 (`handleDeath`).
 *
 * A pure, Phaser-free module so "which cue maps to which load key/URL" is decidable without a
 * running Scene -- same convention as `levelArt.ts`'s `TILESET_IMAGE_KEY`/`TILESET_IMAGE_URL`
 * and `spellIcons.ts`'s `spellIconKey`/`spellIconUrl`. `SpellroadScene.ts` is the only caller: it
 * still owns every actual `this.load.audio()`/`this.sound.play()` call, since that side
 * genuinely needs Phaser.
 *
 * Source: Kenney.nl (Art Sourcing Contract step 1 -- search order never needed to reach
 * OpenGameArt for this ticket, both Kenney packs below had a suitable candidate for every cue).
 * Both packs are CC0 (`License.txt` copied alongside the specific files pulled from each, under
 * `public/assets/third-party/kenney-<pack>/`, same directory convention the tileset/sprite packs
 * already use) -- see `docs/agents/tilesmith/log.md`'s 2026-08-04 entry for the full source URL,
 * license text, and the "why this specific file" reasoning per cue.
 *
 * Unlike the tile/sprite packs (whole-pack pulls, since a spritesheet has to be visually
 * cross-referenced before an individual tile can be cropped out), only the specific `.ogg`
 * one-shots actually used are copied here -- each Kenney audio pack already ships every sound as
 * its own standalone file, so there's no packed-spritesheet-equivalent reason to import the
 * other 100+ unused sounds in each pack.
 */

/** The 5 SFX cues this ticket wires in. Not hardcoded as a length check anywhere -- if a 6th
 * cue (ambient/footstep/UI, per the ADR's fuller scope) ships later, it follows this same
 * key/URL pattern. */
export type SfxCue = "hit" | "cast" | "impact" | "enemyDeath" | "playerDeath";

export const ALL_SFX_CUES: readonly SfxCue[] = ["hit", "cast", "impact", "enemyDeath", "playerDeath"];

/** Cache key `this.load.audio(key, url)` registers a cue under, and `this.sound.play(key)`
 * reads it back by. */
export function sfxKey(cue: SfxCue): string {
  return `sfx-${cue}`;
}

const SFX_URL: Record<SfxCue, string> = {
  // Kenney "Impact Sounds" (CC0) -- a heavy, material-agnostic thud reads as "something just
  // hit you" without implying a specific weapon (melee/ranged/debuffer archetypes all trigger
  // this same cue via `HealthSystem`'s `onDamage`).
  hit: "assets/third-party/kenney-impact-sounds/Audio/impactSoft_heavy_002.ogg",
  // Kenney "Digital Audio" (CC0) -- a short rising zap/phaser tone for the moment a spell is
  // released, distinct from the sharper, lower-pitched impact cue below so the two don't blur
  // together when a cast lands instantly at close range.
  cast: "assets/third-party/kenney-digital-audio/Audio/phaserUp3.ogg",
  // Kenney "Impact Sounds" (CC0) -- a quick, generic (non-material-specific) light impact for
  // a spell landing on an enemy; short enough (~0.1s) to not smear when an AoE cast lands the
  // same instant on multiple enemies (`confirmCast`'s per-enemy loop).
  impact: "assets/third-party/kenney-impact-sounds/Audio/impactGeneric_light_001.ogg",
  // Kenney "Digital Audio" (CC0) -- a short descending zap ("power-down") for an enemy's
  // `takeDamage` returning killed; frequent event (every enemy kill), kept brief.
  enemyDeath: "assets/third-party/kenney-digital-audio/Audio/phaserDown1.ogg",
  // Kenney "Impact Sounds" (CC0) -- a heavy bell/gong strike for the player's own death
  // (`handleDeath`), deliberately more weighty/ominous than the enemy-death cue since this is
  // the rarer, run-ending event already paired with the existing "Died --..." flash message.
  playerDeath: "assets/third-party/kenney-impact-sounds/Audio/impactBell_heavy_002.ogg"
};

/** Static URL Vite serves the sourced one-shot from, relative to the site root so it survives
 * a production build the same way the tileset PNG, level JSON, and spell icons already do (see
 * `levelArt.ts`'s equivalent comment). */
export function sfxUrl(cue: SfxCue): string {
  return SFX_URL[cue];
}
