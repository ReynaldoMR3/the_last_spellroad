/**
 * SFX one-shot asset identity (backlog 3.10, issue #81 / ADR-0002).
 *
 * Scope, per the developer's original ask (2026-08-03 playtest, issue #81: "we need sound to
 * know when we are getting hit, so you can run away") plus the ADR's stated extension (cast/
 * impact/death alongside the hit-cue): one-shots covering content already shipped in the
 * engine --
 *   - `hit`: the player takes damage (`HealthSystem`'s `onDamage` callback, already wired to
 *     the existing "Hit!" flash message in `SpellroadScene.ts`'s `create()`) -- the highest-
 *     priority, gameplay-relevant cue this ticket exists for.
 *   - `impact`: a spell lands a hit on an enemy (`spawnImpactBurst`, backlog 2.36 / issue #79's
 *     per-hit visual beat).
 *   - `enemyDeath`: an enemy's `takeDamage` call returns `killed` (`removeEnemy`).
 *   - `playerDeath`: the player's HP reaches 0 (`handleDeath`).
 *
 * The moment a spell is released (`spawnCastEffect`, backlog 2.36 / issue #79's visual flash)
 * used to be a 5th cue here, one shared "cast" one-shot across all 12 spells -- issue #111's
 * re-source pass (2026-08-07) replaced it with 4 real per-element recordings instead (see
 * `ELEMENT_CAST_URL`/`elementCastSfxKey`/`elementCastSfxUrl` below), since the developer's
 * complaint was specifically that every cast sounding identical read as fatiguing over extended
 * play, and 3.11/#94's per-play pitch variation alone hadn't resolved it.
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
import type { Element } from "../data/types";

/** The 4 shared SFX cues. Not hardcoded as a length check anywhere -- if another shared cue
 * (ambient/footstep/UI, per the ADR's fuller scope) ships later, it follows this same key/URL
 * pattern. `cast` is deliberately not in this list anymore -- see `ELEMENT_CAST_URL` below. */
export type SfxCue = "hit" | "impact" | "enemyDeath" | "playerDeath";

export const ALL_SFX_CUES: readonly SfxCue[] = ["hit", "impact", "enemyDeath", "playerDeath"];

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
  // 2026-08-12 (issue #191): muted as an explicit, developer-requested stopgap so the next
  // playtest pass can isolate feedback without this cue in the mix ("i dont like the sound of
  // the enemy getting hitted, so i think we should mute those 2 so i can playtest and share more
  // feedback"). Points at an all-silence derivative of the same file
  // (`tools/cast-sfx-normalize/mute_impact_enemydeath_191.py`), same identical-format/duration
  // convention as #181's lightning mute -- no recording was deleted, `impactGeneric_light_001.ogg`
  // still exists unmodified alongside it. Un-mute by pointing this back at the original file, or
  // swap in a re-sourced replacement, once the next playtest gives a clearer direction.
  impact: "assets/third-party/kenney-impact-sounds/Audio/impactGeneric_light_001-muted.ogg",
  // 2026-08-12 (issue #191): muted for the same reason and via the same mechanism as `impact`
  // above -- see that entry's comment. `phaserDown1.ogg` (the original "enemy dies" zap) is
  // unmodified alongside the new `-muted.ogg` sibling.
  enemyDeath: "assets/third-party/kenney-digital-audio/Audio/phaserDown1-muted.ogg",
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

/**
 * Per-element cast one-shots (issue #111's re-source half, 2026-08-07). Each is a genuinely
 * different recording, not a re-pitch of one shared sample -- the honest fix the pitch-only
 * variation (`sfxVariation.ts`'s `computeSpellSfxVariation`) couldn't provide on its own, per
 * the developer's own framing of the complaint ("source more files and test different audio
 * settings for each spell"). Scoped at element granularity, not per-spell, same reasoning as
 * `spellIcons.ts`'s backlog 2.30 icon work -- 12 spells, 4 elements, one recording per element
 * is the proportionate unit here.
 *
 * All 4 sourced from OpenGameArt.org (Art Sourcing Contract step 2 -- Kenney's own audio packs
 * have no dedicated magic-cast set, confirmed again this pass). Every file is individually,
 * unambiguously CC0 -- one OpenGameArt candidate for the lightning slot (`electricspell.ogg` on
 * the "Spell Sounds" page) was checked and disqualified: that page states a mixed
 * "OGA-BY 3.0 and CC0" license across its files with no clean way to confirm which license
 * applies to that specific file, so it fails this project's "individually CC0, no exceptions"
 * bar the same way a CC-BY 4.0 icon pack was disqualified for backlog 2.30. See each pack's own
 * `License.txt` under `public/assets/third-party/opengameart-<pack>/` for the full source URL,
 * author, and license text, and `docs/agents/tilesmith/log.md`'s 2026-08-07 entry for the "why
 * this specific file" reasoning per element, including the lightning slot's disclosed
 * imperfect-fit tradeoff.
 *
 * **2026-08-09 (issue #151):** the fire/ice/earth source recordings ran 1.9-2.1s -- well past
 * the "should be < 1 second... feels sluggish" complaint -- so each now points at a `-trimmed`
 * sibling file (Art Sourcing Contract step 3: a derivative of the *same already-approved* CC0
 * source, not a new download -- the original untrimmed file stays alongside it in the same
 * directory as provenance). Each trim keeps the recording's actual attack/punch and fades out
 * the long decay/reverb tail over the last 60ms rather than hard-cutting mid-sound. Lightning's
 * `groundhit.wav` was already 0.285s -- issue #151 (length) never applied to it, only issue
 * #137 (it reads as the old placeholder, an aesthetic/content problem no trim can fix) --
 * so it's untouched here. See `docs/agents/tilesmith/log.md`'s 2026-08-09 entry for exact
 * before/after durations and the #137 re-source candidates researched but NOT yet pulled in
 * (pending the developer's explicit go-ahead this repo's download convention requires).
 *
 * **2026-08-11 (issue #111, loudness/length cohesion pass):** #151's own trims fixed length
 * outliers but never addressed loudness, and a further developer playtest (2026-08-10/11, on
 * top of the original 2026-08-07/08 reports) reconfirmed the complaint in the developer's own
 * words -- "the volumes differs and the lenghts, so it doesnt really feel cohesive... different
 * volumes, length." Measured all 4 files (`soundfile`/`numpy`, in Docker per ADR-0003): peak/RMS
 * loudness varied by ~6.6dB RMS across fire/ice/earth (before lightning, which is a separate
 * case below) and clip length ranged 0.285s-1.300s -- both large enough to read as "inconsistent"
 * exactly as reported. All 4 are now derivatives of the already-approved CC0 files above (Art
 * Sourcing Contract step 3, same as #151 -- no new download): each was RMS-normalized to a common
 * -16 dBFS target (a smooth tanh soft-limiter, not a hard clip, caps any post-gain peak so a
 * quiet, spiky-transient file like `groundhit.wav` can still be boosted to the target without
 * distortion) and length-fit to a common 1.20s (trim-with-60ms-fade for longer files, same
 * convention as #151's trims; trailing-silence pad, with the same 60ms safety fade into the pad,
 * for shorter files). Each now points at a `-normalized` sibling of its `-trimmed`/original file
 * (both kept alongside, untouched, as provenance -- same "-trimmed sits next to the untouched
 * original" convention #151 established, now one layer deeper). Lightning's actual 0.285s of
 * audible content is unchanged -- only gain and a trailing silence pad were applied -- per #111's
 * own out-of-scope note that #137's placeholder-content problem isn't this ticket's to fix; its
 * *file* duration now matches the other 3 (1.20s) but its *audible* portion is still short,
 * disclosed rather than presented as a full fix. See `docs/agents/tilesmith/log.md`'s 2026-08-11
 * entry for the full before/after table (all 4 files, both whole-clip and lightning's
 * audible-portion-only figures) and `tools/cast-sfx-normalize/` for the Docker-only script that
 * produced them.
 *
 * **2026-08-12 (issue #184, further fire/ice trim):** a repeat developer playtest ("the audio
 * of the fire and ice spells are still too long") reconfirmed that #111's 1.20s cohesion target
 * was never itself an "is this short enough" judgment -- just a cross-element consistency
 * target. Fire and ice now each point at a further `-normalized-trimmed` derivative: fire cut to
 * 0.830s (a clean envelope dip right after its main attack/decay hump, well past the ~0.6s
 * peak), ice cut to 0.710s (a natural low point just before its final crescendo swell, so the
 * cut lands in a quiet gap rather than mid-crescendo -- same "don't chop mid-swell" rule #151
 * used). Same 60ms linear fade-out-not-hard-cut convention as #151/#111. Truncating a file
 * nudges its whole-clip RMS since it removes some of the quietest content; `trim_fire_ice_184.py`
 * re-checks each cut against #111's -16 dBFS target and re-applies the same tanh soft-limited
 * gain if it drifted more than 0.5dB (ice's did, fire's didn't) -- so the loudness normalization
 * survives this trim rather than being silently undone by it. Earth was checked (see the const
 * entry below) and left alone -- its complaint was never raised, and it doesn't share fire/ice's
 * issue. See `docs/agents/tilesmith/log.md`'s 2026-08-12 entry for the exact before/after
 * duration/loudness table and `tools/cast-sfx-normalize/trim_fire_ice_184.py` /
 * `fine_envelope.py` for the Docker-only scripts that produced and chose them.
 *
 * **2026-08-12 (issue #181, lightning muted as a stopgap -- since reverted, see #191):** a
 * developer playtest ("I continue to hear the wrong sound when casting spells... it sucks,
 * please remove it") asked for lightning's disclosed placeholder stand-in gone outright.
 * Lightning briefly pointed at `groundhit-muted.wav`, an all-silence derivative of the same file
 * (`tools/cast-sfx-normalize/mute_lightning_181.py`) -- no new sourcing, no #137 candidate pulled
 * in. The developer then clarified (2026-08-12, issue #191) that the actually-disliked sound was
 * a different, non-element-specific cue that can overlap with another SFX, not this lightning
 * stand-in at all -- and separately confirmed keeping lightning's original recording ("i like the
 * current one that is on the game, so no need" -- #137, closed). Reverted back to
 * `groundhit-normalized.wav`; `groundhit-muted.wav` stays in the asset directory, unreferenced,
 * as provenance. The other 3 elements' cast SFX were never touched by any of this. */
const ELEMENT_CAST_URL: Record<Element, string> = {
  // 2026-08-12 (issue #184): further-trimmed past #111's 1.20s cohesion target, down to 0.830s
  // -- see this const's doc comment above and `docs/agents/tilesmith/log.md`'s 2026-08-12 entry
  // for the before/after duration+loudness table. `-normalized.wav` (#111's un-trimmed-further
  // file) is kept alongside as provenance.
  fire: "assets/third-party/opengameart-fireball/105016__julien-matthey__jm-fx-fireball-01-normalized-trimmed.wav",
  // 2026-08-12 (issue #184): further-trimmed past #111's 1.20s cohesion target, down to 0.710s
  // -- see this const's doc comment above and `docs/agents/tilesmith/log.md`'s 2026-08-12 entry
  // for the before/after duration+loudness table. `freeze-normalized.wav` (#111's un-trimmed-
  // further file) is kept alongside as provenance.
  ice: "assets/third-party/opengameart-freeze-spell/freeze-normalized-trimmed.wav",
  // Not touched by issue #184 -- earth's complaint was never raised, and its envelope/duration
  // don't share fire/ice's issue (see this const's doc comment above).
  earth:
    "assets/third-party/opengameart-earth-element-magic-spell/earth-element-magic-spell-normalized.ogg",
  // 2026-08-12 (issue #191): issue #181 muted this as a stopgap for what the developer then
  // clarified (2026-08-12, same day) was actually a *different* sound entirely -- something
  // shared across any spell, not element-specific, that can overlap with another SFX cue. The
  // lightning stand-in itself was never the complaint; #137 was separately closed by developer
  // decision ("i like the current one that is on the game, so no need") *before* that
  // clarification arrived, so "the current one" the developer meant to keep is this original
  // `groundhit-normalized.wav`, not the silent `groundhit-muted.wav` #181 had swapped in a few
  // hours earlier. Reverted back to it. `groundhit-muted.wav` is left in the asset directory
  // (unreferenced) as provenance rather than deleted, same convention every other superseded
  // derivative in this file follows.
  lightning: "assets/third-party/opengameart-electricity-game-sound-pack/groundhit-normalized.wav"
};

/** Cache key for a given element's cast one-shot -- parallel to `sfxKey`, one entry per
 * `Element` rather than per `SfxCue`. */
export function elementCastSfxKey(element: Element): string {
  return `sfx-cast-${element}`;
}

export function elementCastSfxUrl(element: Element): string {
  return ELEMENT_CAST_URL[element];
}

/** Every element with a cast one-shot -- for `SpellroadScene.ts`'s preload loop, parallel to
 * `ALL_SFX_CUES`. Duplicates `SPELL_ICON_ELEMENTS` (`spellIcons.ts`) rather than importing it,
 * since the two lists exist for unrelated reasons (audio preload vs. icon lookup) and coupling
 * them would make an icon-only change accidentally affect audio preload or vice versa. */
export const ALL_CAST_ELEMENTS: readonly Element[] = ["fire", "ice", "lightning", "earth"];
