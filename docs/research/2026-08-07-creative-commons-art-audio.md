# Creative Commons art and audio research

Date: 2026-08-07
Scope: music, ambience, sound effects, tiles, sprites, icons, and VFX for a melancholic, low-spec, top-down magical roguelite built with Phaser 3.
Status: research only; no assets were downloaded.

Hard tooling constraint: **all future downloading, archive inspection, conversion, normalization, hashing, and preview generation must run in Docker**. Do not install or invoke media/provenance tooling directly on the host.

## Recommendation

Use a **CC0-only production lane**: Kenney first for a coherent 16×16 pixel-art and SFX baseline, then individually verified OpenGameArt (OGA) CC0 submissions only for mood-specific gaps. This is not just the lowest-friction legal choice; it matches the repository's existing [Art Sourcing Contract](../agents/_reference/art-sourcing-contract.md), which explicitly rejects CC-BY and share-alike assets for production and assigns composed music to Composer rather than Tilesmith.

The best initial visual combination is Kenney's **Roguelike/RPG Pack** as the anchor, **Tiny Dungeon** and **Roguelike Caves & Dungeons** for environment variation, **Rune Pack** for magical motifs, and the **Particle Pack**, **Smoke Particles**, and **Light Masks** for restrained magic. For audio, start with Kenney's **RPG Audio**, **Impact Sounds**, and **UI Audio**, then audition the OGA CC0 spell and ambience items below. Music candidates should be treated as references or temporary stand-ins unless the project explicitly changes Composer's mandate.

Creative Commons says CC0 permits copying, modification, distribution, and commercial use without permission or conditions, but it does not clear trademarks, publicity/privacy rights, or third-party material and provides no warranty. Preserve provenance even when attribution is optional ([CC0 deed](https://creativecommons.org/publicdomain/zero/1.0/)).

## Production shortlist

All entries in this section are declared CC0 on the linked first-party publisher or individual submission page. “No attribution required” means the license imposes none; a courtesy credit is still sensible where the creator requests one.

### Tiles, sprites, and environment art

| Priority | Asset | Fit and browser-game notes | Declared license / obligation | Caveat |
| --- | --- | --- | --- | --- |
| 1 | [Kenney — Roguelike/RPG Pack](https://kenney.nl/assets/roguelike-rpg-pack) | Strong anchor pack: 1,700 files, 16×16 tiles, with RPG/roguelike, town, furniture, panel, and button coverage. Small cells suit a low-spec top-down game and can be recolored into the colder, melancholic palette. | CC0; no attribution required. | Broad and intentionally generic; art direction will depend on disciplined palette selection rather than mixing every included style. |
| 1 | [Kenney — Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | 130 files at 16×16, tagged for RPG, roguelike, dungeon, and sewer. Good for compact interiors and corrupted under-road spaces while retaining the anchor scale. | CC0; no attribution required. | Confirm exact sprite-sheet layout after download; the public page states scale and count, not archive structure. |
| 2 | [Kenney — Roguelike Caves & Dungeons](https://kenney.nl/assets/roguelike-caves-dungeons) | 520 files covering caves, mines, and dungeons; useful for biome variation and silhouettes. | CC0; no attribution required. | Page does not publish tile dimensions; inspect before mixing with 16×16 packs. |
| 2 | [OGA — Dungeon Crawl 32×32 tiles](https://opengameart.org/content/dungeon-crawl-32x32-tiles) | More than 3,000 orthogonal 32×32 tiles, including terrain, walls, monsters, spell effects, items, GUI, and avatars. Excellent fallback when the 16×16 Kenney vocabulary is too sparse. PNG and ZIP are offered. | CC0; no attribution required. The page asks only for a courtesy source link. | Large multi-author compilation. Keep its supplied artist list and license notice with the archive, and do not mix 32×32 and 16×16 assets without a deliberate scale/pixel-density pass. |

### Icons and magical symbols

| Priority | Asset | Fit and browser-game notes | Declared license / obligation | Caveat |
| --- | --- | --- | --- | --- |
| 1 | [Kenney — Rune Pack](https://kenney.nl/assets/rune-pack) | 640 rune/stone/tile files. Best candidate for spells, relics, status markers, and road glyphs; vector sources are noted as fixed in v1.1, allowing clean offline rasterization at the chosen pixel size. | CC0; no attribution required. | Rasterize to a fixed PNG sprite sheet rather than loading hundreds of individual vectors at runtime. |
| 2 | [Kenney — Game Icons](https://kenney.nl/assets/game-icons) and [expansion](https://kenney.nl/assets/game-icons-expansion) | 165 total interface/prompt icons. Suitable for menus, controls, and neutral UI affordances. | CC0; no attribution required. | These are generic interface icons, not a complete fantasy inventory set. |
| Reserve | [OGA — 496 pixel-art icons for medieval/fantasy RPG](https://opengameart.org/comment/107336) | Dense fantasy inventory/spell coverage in a 1.5 MB ZIP. | Page declares CC0; no attribution required. | The OGA package was submitted by someone other than the original artist and its history includes a license change. The page says incompatible derivative icons were removed, but this is weaker provenance than creator-hosted Kenney material. Require human review of the included files and origin notes before adoption. |

### VFX

| Priority | Asset | Fit and browser-game notes | Declared license / obligation | Caveat |
| --- | --- | --- | --- | --- |
| 1 | [Kenney — Particle Pack](https://www.kenney.nl/assets/particle-pack) | 80 VFX files at 512×512. Source material for downscaled/tinted embers, wisps, spell residues, and impacts. | CC0; no attribution required. | 512×512 sources are oversized for the target. Downscale, atlas, and avoid shipping unused originals. |
| 1 | [Kenney — Smoke Particles](https://kenney.nl/assets/smoke-particles) | 70 smoke/explosion/VFX files, useful for fog, decay, hit dust, and spectral trails. | CC0; no attribution required. | Build restrained low-opacity variants; large overdraw-heavy particles can hurt low-spec devices. |
| 1 | [Kenney — Light Masks](https://kenney.nl/assets/light-masks) | 150 light/shader/VFX masks for moonlight, spell pools, lanterns, and vignette-like local contrast. | CC0; no attribution required. | Favor a small reused mask atlas and a hard cap on simultaneous blended sprites. |
| 2 | [OGA — 2D Spell Effects](https://opengameart.org/content/2d-spell-effects) | Ten animated effects supplied as transparent PNG layers; fire, lightning, rain, and explosions provide magic-specific shapes missing from general particles. | CC0; no attribution required; uploader asks to hear about uses. | Visual style and resolution must be normalized to the pixel-art anchor. Inspect every included frame rather than assuming the preview covers the archive. |

### One-shot SFX

| Priority | Asset | Fit and browser-game notes | Declared license / obligation | Caveat |
| --- | --- | --- | --- | --- |
| 1 | [Kenney — RPG Audio](https://kenney.nl/assets/rpg-audio) | 50 RPG/foley/footstep/weapon sounds. Best coherent baseline for shipped movement and combat actions. | CC0; no attribution required. | The public page does not enumerate file formats or every cue; audit the archive before assignment. |
| 1 | [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds) | 130 impact/foley sounds for hit confirmation, enemy contact, and breakage. | CC0; no attribution required. | Use only for already-shipped events, per the repository's reactive SFX rule. Normalize loudness offline. |
| 1 | [Kenney — UI Audio](https://kenney.nl/assets/ui-audio) | 50 button/switch/click sounds for pause, confirmation, rejection, and pickups. | CC0; no attribution required. | Select a very small family to avoid an inconsistent “sample pack” feel. |
| 2 | [OGA — Magic Spell SFX](https://opengameart.org/content/magic-spell-sfx) | Seven short spell-casting sounds already supplied as Ogg, each roughly 38–79 KB—excellent for web delivery. | CC0; uploader explicitly says no credit is needed. | Synthesized tonal character may overlap music; audition in context and pitch-shift only from the preserved original. |
| 2 | [OGA — Teleport Spell](https://lpc.opengameart.org/content/teleport-spell) | A 286.7 KB WAV teleport cue made for a FOSS RPG. | CC0; no attribution required. | Transcode from the preserved WAV master for delivery; do not use WAV as the only web payload. |
| 2 | [OGA — Ice Spells](https://opengameart.org/content/ice-spells) | Small pack of ice/crackle/freeze cues, 269.7 KB ZIP. | CC0; no attribution required. | It is derived from another public-domain sound; retain that origin note in the manifest even though the license is CC0. |

### Ambient loops and beds

| Priority | Asset | Fit and browser-game notes | Declared license / obligation | Caveat |
| --- | --- | --- | --- | --- |
| 1 | [OGA — Dungeon Ambience](https://opengameart.org/content/dungeon-ambience) | Dark dungeon ambience with a 1.2 MB Ogg download. Strong low-bandwidth bed for underground spaces. | CC0; no attribution required. | Verify the loop boundary and loudness after download; “ambience” does not guarantee gapless looping. |
| 1 | [OGA — 4 Atmospheric Ghostly Loops](https://opengameart.org/content/4-atmospheric-ghostly-loops) | Dark, magical, sad, atmospheric loops closely match the intended mood. | CC0; no attribution required. | Distributed as a 7z archive; inspect its internal formats and provenance before conversion. |
| 2 | [OGA — Ambient Horror](https://opengameart.org/content/ambient-horror) | Choir-like dark ambience in both Ogg (776.2 KB) and WAV (4.3 MB). Ogg is immediately browser-oriented; WAV is the edit master. | CC0; no attribution required; uploader would like to hear about uses. | Contains a monster/scream-like texture that may be too explicit for a persistent bed. |
| 2 | [OGA — Dream 2 Ambience](https://opengameart.org/content/dream-2-ambience) | Creepy, dreamy atmospheric bed; MP3 and Ogg are offered, with the uploader saying no credit is necessary. | CC0; no attribution required. | Audition for science-fiction timbre before using in a fantasy scene. |

### Music references or temporary stand-ins

Composer owns final composed music under the current project architecture. These tracks can still be used to communicate direction or temporarily validate pacing, but should not silently become the final score.

| Priority | Asset | Fit and browser-game notes | Declared license / obligation | Caveat |
| --- | --- | --- | --- | --- |
| Reference | [OGA — Slow Melancholic Theme, C64 Style](https://opengameart.org/content/slow-melancholic-theme-c64-style) | Slow, sad, wintery chiptune; explicitly loopable and supplied as compact Ogg files. It is an unusually close tonal and low-spec match. | Submission lists both CC0 and CC-BY 3.0. Use only if the downloaded package confirms an unambiguous CC0 grant; otherwise treat it as CC-BY and reject under current policy. | Dual-license presentation is ambiguous enough to require a recorded human decision. Do not infer that the easier license necessarily applies to every file. |
| Reference | [OGA — Melancholic Void](https://opengameart.org/content/melancholic-void) | Melancholic electronic piece supplied as FLAC and MP3; creator notes that it does not loop but has a smooth transition. | CC0; attribution appreciated but not required. | Published in 2026 with little adoption history; independently check authorship signals and edit a real loop if used. |
| Reference | [OGA — Eternal Sleep](https://opengameart.org/content/eternal-sleep) | Dark ambient/dungeon-synth track with somber, mournful tags. FLAC is a useful master. | CC0; no attribution required. | The description names “Kaiser” while the uploader is “The Oracle.” That authorship mismatch needs clarification before production use. |
| Reference | [OGA — Factory Ambiance](https://opengameart.org/content/factory-ambiance) | Hollow, abandoned, nocturnal atmosphere in Ogg; useful as a reference for ruined magical infrastructure. | CC0; no attribution required. | Industrial/sci-fi coloration may conflict with the fantasy score. |

## Sources to use only for discovery, not production

- **OpenGameArt collection pages:** a collection title such as “CC0” is curator metadata, not a license grant for every linked file. Open the individual submission, record its declared license and attribution notice, then inspect the downloaded archive. OGA itself warns that automatically generated collection credits are not guaranteed accurate ([OGA CC0 collection notice](https://opengameart.org/content/cc0-2)).
- **Freesound:** the platform contains CC0, CC-BY, and CC-BY-NC sounds. Its own FAQ says commercial suitability and attribution vary by the individual sound and describes how remix obligations propagate ([Freesound license FAQ](https://freesound.org/help/faq/)). It is a valuable gap-finder, but current project policy allows only individually verified CC0 sounds; do not approve a pack or search result wholesale.
- **Game-icons.net:** technically commercially reusable, editable, and exportable, but its own site states CC-BY 3.0 and requires credit to each original author ([Game-icons.net About](https://game-icons.net/about.html)). That conflicts with the repository's CC0-only sourcing contract. Kenney Rune Pack should be preferred.
- **Liberated Pixel Cup (LPC):** excellent coherent top-down tiles and character sprites, but the base assets are CC-BY-SA 3.0/GPL 3.0 and require per-author credits; modifications trigger share-alike. Some named authors offer separate OGA-BY terms, but that applies only to their files, not the full pack ([LPC Base Assets](https://opengameart.org/node/13470), [LPC licensing guidance](https://opengameart.org/content/properly-licensing-your-liberated-pixel-cup-game-entry)). This is incompatible with the current CC0-only policy.

## License obligations and risks

Creative Commons' own license summary distinguishes the following conditions ([About CC Licenses](https://creativecommons.org/share-your-work/cclicenses/)):

| License marker | Commercial game? | Modification? | Core obligation / project decision |
| --- | --- | --- | --- |
| CC0 | Yes | Yes | No license conditions. Still log creator, source, retrieval date, hash, and any courtesy-credit request; CC0 supplies no warranty and does not clear trademark, privacy, publicity, or third-party rights. **Preferred and currently allowed.** |
| CC BY | Yes | Yes | Credit creator, identify license, link source/license when reasonable, retain notices, and mark modifications. **Legally viable, but rejected by current repo policy.** |
| CC BY-SA | Yes | Yes | All BY duties plus distribution of adaptations under identical terms. Asset edits, sprite-sheet assembly, and combinations may raise adaptation/collection questions. **Reject absent explicit legal and project-policy approval.** |
| CC BY-NC | No, not safely | Usually, for noncommercial use | “NonCommercial” excludes primarily commercial advantage or monetary compensation; a future paid game, ads, sponsorship, or bundled commercial release creates risk. **Reject.** |
| CC BY-ND | Yes, but only unchanged | No adaptations may be shared | Cropping, recoloring, looping, trimming, normalization, format changes that alter the work, and spritesheet/VFX edits may be adaptations. It is operationally unsuitable for a game pipeline. **Reject.** |
| CC BY-NC-SA / BY-NC-ND | No | Restricted as marked | Combines the above problems. **Reject.** |

Additional risks:

1. **Uploader authority:** CC0 is only as reliable as the uploader's authority over the work. Prefer creator-hosted pages and packs. Escalate compilations, remixes, named third-party sources, or inconsistent uploader/author fields.
2. **License drift:** save the exact asset page URL, declared version, retrieval date, and a local copy of the license/notice when the asset is eventually downloaded. A later page edit should not erase the acquisition record.
3. **Archive contamination:** a CC0 landing page can link an archive containing excluded or separately licensed files. Inventory and hash the actual selected files; do not approve an entire ZIP based only on its title.
4. **Attribution requests versus requirements:** record both separately. “Attribution appreciated” on a CC0 item is a courtesy request, not a condition; do not accidentally describe it as legally mandatory.
5. **Rights beyond copyright:** avoid logos, recognizable people/voices, and obvious imitations of protected characters even where a file is marked CC0. CC0 expressly does not affect trademark or publicity/privacy rights.
6. **DRM and older CC terms:** OGA warns that CC-BY and CC-BY-SA asset distribution can conflict with technical restrictions on some storefronts; OGA-BY was designed to remove that issue ([OGA/LPC FAQ](https://lpc.opengameart.org/content/faq)). This is another reason the project should stay CC0-only.

## Browser-game delivery guidance

Keep lossless source masters outside the runtime payload, then generate delivery derivatives:

- **Pixel art:** ship a small number of nearest-neighbor **PNG atlases/sprite sheets** plus JSON metadata. PNG keeps hard alpha edges; atlas packing reduces request count. Phaser directly supports images, uniform sprite sheets, and JSON atlases ([Phaser Loader](https://docs.phaser.io/phaser/concepts/loader), [Phaser Textures](https://docs.phaser.io/phaser/concepts/textures)). WebP can reduce size, but conversion must be checked for pixel-edge and alpha artifacts; MDN reports broad modern support and typically smaller lossless files ([MDN image formats](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)).
- **VFX:** prefer compact PNG sprite sheets or shared particle textures; downscale 512×512 sources and cap simultaneous translucent particles. Do not ship GIF previews as production animation.
- **Audio masters:** preserve WAV or FLAC where supplied, but do not serve them as the only runtime files.
- **Audio delivery:** provide at least **MP3** and optionally **Ogg Vorbis** (or a tested Opus variant) so Phaser can choose a supported URL. Phaser's official audio guide recommends supporting at least MP3 and explains that unsupported types are not downloaded; MDN notes MP3's broad support and Vorbis/Ogg's smaller/open advantages but less universal container support ([Phaser Audio](https://docs.phaser.io/phaser/concepts/audio), [MDN audio codecs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs)).
- **Loops:** test actual gapless behavior in the project's supported browser matrix. Store loop start/end samples or milliseconds in provenance when editing a loop; never rely only on an uploader's “loop” tag.

All commands implied above—including HTTP download, archive extraction/listing, image atlas generation, rasterization, audio transcoding, loudness analysis/normalization, checksums, and preview rendering—must execute in pinned Docker images through repository-owned scripts or Compose services. Mount only explicit input/output directories, run as the calling user's UID/GID where supported, and record the immutable image digest plus the full tool versions/arguments in provenance. A browser playback check may use the project's containerized development server, but it must not depend on a host-installed converter or preview tool.

Recommended first audition set, without downloading yet: Roguelike/RPG Pack, Tiny Dungeon, Rune Pack, Particle Pack, RPG Audio, Impact Sounds, Magic Spell SFX, Dungeon Ambience, and 4 Atmospheric Ghostly Loops. This covers a coherent vertical-slice baseline while minimizing style and compliance variance.

## Proposed asset provenance manifest

Use one machine-readable record per **selected source asset**, not merely one per pack, committed beside a human-readable credits generator. JSON is a natural fit for the existing TypeScript/Phaser toolchain. Suggested path: `assets/provenance/manifest.json` (proposal only; this research did not create it).

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-07T00:00:00Z",
  "assets": [
    {
      "id": "sfx.magic.cast.jaggedstone.01",
      "kind": "sfx",
      "role": "player spell cast",
      "status": "candidate",
      "source": {
        "title": "Magic Spell SFX",
        "creator": "JaggedStone",
        "publisher": "OpenGameArt.org",
        "assetPage": "https://opengameart.org/content/magic-spell-sfx",
        "downloadUrlAtAcquisition": null,
        "retrievedAt": null
      },
      "license": {
        "spdx": "CC0-1.0",
        "url": "https://creativecommons.org/publicdomain/zero/1.0/",
        "declaredOn": "assetPage",
        "attributionRequired": false,
        "requestedCredit": null,
        "noticeSnapshot": null,
        "humanVerifiedBy": null,
        "verifiedAt": null
      },
      "origin": {
        "pipelineStep": 2,
        "isCompilation": false,
        "isDerivative": false,
        "upstream": [],
        "authorityRisk": "low",
        "reviewNotes": null
      },
      "sourceFiles": [
        {
          "archivePath": "magical_1.ogg",
          "sha256": null,
          "mediaType": "audio/ogg"
        }
      ],
      "derivatives": [
        {
          "projectPath": "public/assets/audio/sfx/magic-cast-01.mp3",
          "sha256": null,
          "transforms": ["trim", "peak-normalize", "encode-mp3"],
          "toolchain": {
            "runtime": "docker",
            "image": null,
            "imageDigest": null,
            "tools": [],
            "command": null
          },
          "loop": null
        }
      ],
      "credit": {
        "display": false,
        "text": "Magic Spell SFX by JaggedStone (CC0 1.0)",
        "sourceUrl": "https://opengameart.org/content/magic-spell-sfx"
      },
      "compliance": {
        "archiveInspected": false,
        "thirdPartyContentChecked": false,
        "humanSignoff": "pending",
        "signoffDate": null
      }
    }
  ]
}
```

Required gates before an entry changes from `candidate` to `approved`:

1. Download from the recorded asset page, never an untracked mirror, using a pinned Docker image rather than a host tool.
2. Save the landing-page/license notice or included license file and record its path.
3. Inventory only the files actually used and compute SHA-256 for source and derivative files inside Docker.
4. Inspect archive contents, author/uploader consistency, derivative/upstream notes, and any special attribution request.
5. Perform every extraction, transform, normalization, and preview operation inside Docker; record the image name, immutable digest, tool versions, exact command/arguments, output format, and loop points where applicable.
6. Obtain the human developer's compliance sign-off required by the repository's sourcing contract.

## Primary-source index

- [Creative Commons — CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- [Creative Commons — About CC Licenses](https://creativecommons.org/share-your-work/cclicenses/)
- [Kenney — licensing/support FAQ](https://kenney.nl/support)
- [OpenGameArt / LPC — license and attribution FAQ](https://lpc.opengameart.org/content/faq)
- [Freesound — license FAQ](https://freesound.org/help/faq/)
- [Phaser — Loader](https://docs.phaser.io/phaser/concepts/loader) and [Audio](https://docs.phaser.io/phaser/concepts/audio)
- [MDN — image formats](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types) and [audio codecs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs)
