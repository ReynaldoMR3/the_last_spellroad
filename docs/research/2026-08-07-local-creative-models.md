# Local creative models and tools: Docker-only, free-first inventory

**Date:** 2026-08-07
**Machine:** MacBook Air (M1, 8 CPU cores, 8 GB unified memory), macOS 15.6.1
**Operating rule:** every creative tool and model runs in Docker. No Homebrew, global npm/pip, host virtualenv, or host-side model installation.

## Executive recommendation

Use the local language model only as a **brief/prompt/planning assistant**, never as an art or audio renderer. Keep the asset workflow deliberately modest:

1. **Reuse and adapt licensed assets first.** Tilesmith's binding order is Kenney CC0 -> OpenGameArt CC0 -> recolor/recombine CC0 -> originate only as a last resort.
2. **For original pixel assets, prefer deterministic containerized Pillow/ImageMagick work.** It is fast, reproducible, license-simple, and already proved itself on the shipped spell icons.
3. **If AI image ideation is useful, test one SD 1.5-sized pixel checkpoint at 384-512 px, batch 1.** Treat it as a slow concept generator, then redraw/clean the chosen result. Do not attempt SDXL, FLUX, ControlNet stacks, or LoRA training on this machine under Docker.
4. **Use `rembg`/U2-Net for cutouts and Real-ESRGAN selectively for non-pixel-art upscaling.** For true pixel art, nearest-neighbor scaling is usually more faithful than a hallucinating neural upscaler.
5. **Keep music deterministic:** Lorena brief -> Composer's `music21` script -> MIDI -> a separately licensed SoundFont renderer -> Heckler/human loop test. Do not make MusicGen/Stable Audio/ACE-Step part of the local production path.
6. **For SFX, follow Tilesmith's CC0 sourcing contract and make variants with deterministic transforms.** Neural SFX generation is not a good fit for the available RAM/CPU or the project's license discipline.

This is the best free-first mix for the actual constraints: it generates shippable artifacts without turning an 8 GB laptop into a slow, fragile model lab.

## What is installed now

### Host commands

The requested host checks returned:

```text
$ ollama list
zsh: command not found: ollama

$ which gemini
gemini not found

$ gemini --version
zsh: command not found: gemini
```

There is no host Ollama or Gemini CLI. This is consistent with the Docker-only rule.

### Project Ollama container

The repo's Ollama service is running, and its named model volume contains:

```text
$ docker exec the_last_spellroad-ollama-1 ollama list
NAME                       ID              SIZE
nomic-embed-text:latest    0a109f422b47    274 MB
llama3.2:latest            a80c4f17acd5    2.0 GB
```

The exact inventory command is:

```bash
docker exec the_last_spellroad-ollama-1 ollama list
```

The repository deliberately supplies Ollama through `docker-compose.yml`: the `ollama` service persists `/root/.ollama` in `spellroad_ollama_models`, and both `agent-crew` and `content-pipeline` reach it at `http://ollama:11434` (`docker-compose.yml:16-51`).

Installed Docker images do **not** include a diffusion UI/model, background-removal image, upscaler, neural audio generator, or other asset generator. The relevant existing images are `ollama/ollama:latest`, the project's content-pipeline/agent-crew images, and `python:3.11-slim`. Note that `ollama/ollama:latest` is not reproducibly pinned; a future maintenance pass should pin a tested digest, without changing it as part of this read-only research.

### Machine and Docker budget

Read-only measurements:

| Resource | Observed |
| --- | --- |
| Host | Apple M1 MacBook Air, 8 GB unified memory |
| Docker VM | `aarch64`, 4 CPUs, 8,307,167,232 bytes (~7.74 GiB) |
| Host free space | about 32 GiB |
| Existing Docker images | 12.42 GB |
| Existing Docker volumes | 7.01 GB |
| Installed Ollama model payload | about 2.27 GB |

Docker Desktop/VM on macOS runs Linux containers in a VM. Docker's documented local GPU support is Windows/WSL2-only, while PyTorch's Apple GPU backend requires macOS Metal/MPS. Therefore a Linux ARM64 container on this Mac should be budgeted as **CPU-only**, not as an M1 GPU workload ([Docker GPU support](https://docs.docker.com/desktop/features/gpu/), [Docker Desktop networking/VM architecture](https://docs.docker.com/desktop/features/networking/), [PyTorch MPS backend](https://docs.pytorch.org/docs/stable/notes/mps.html)).

Practical consequences:

- Keep at least 10-12 GiB of host disk free after model/image caches. One SD 1.5 tool image plus weights can consume roughly 8-12 GB.
- Run one heavy creative container at a time; stop the game and duplicate Ollama containers first.
- Allocate no more than about 6 GiB to a creative container so macOS and the Docker VM retain headroom.
- `--platform linux/arm64`, `--cpus 4`, `--memory 6g`, batch size 1, and persistent cache volumes should be defaults.

## Prompt-writing LLMs are not asset generators

### Local `llama3.2` through Ollama

This is a 3B text model. It can write briefs, prompt variants, naming lists, palette descriptions, acceptance checks, and machine-readable *proposals*. It cannot render PNG/WAV/MIDI assets by itself.

The repo already provides two useful pipelines:

- `agent-crew` uses `llama3.2` for eight text agents. Model selection is configurable per agent in `agent-crew/crew/config.py:22-55`.
- `content-pipeline` uses `llama3.2` for Lorena generation/Heckler critique and `nomic-embed-text` for GDD retrieval (`content-pipeline/ollama_client.py:13-16`, `:61-84`). Its five-stage contract is documented in `content-pipeline/CONTEXT.md:10-19`.

Exact existing commands:

```bash
cp content-pipeline/.env.example content-pipeline/.env
docker-compose up -d ollama
docker-compose run --rm content-pipeline python pipeline.py
docker-compose run --rm content-pipeline pytest -q

cp agent-crew/.env.example agent-crew/.env
docker-compose up -d ollama
docker-compose run --rm agent-crew python main.py 2
```

For an isolated text-planning prompt without host installation:

```bash
docker exec the_last_spellroad-ollama-1 \
  ollama run llama3.2 \
  'Planning only. Return five concise acceptance checks for a 32x32 readable pixel-art lightning spell icon. Do not claim to create a file.'
```

Observed capability and limits are already unusually well documented by primary repo evidence:

- A fresh end-to-end run on 2026-08-07 succeeded against real `llama3.2` + `nomic-embed-text` (`content-pipeline/README.md:116-122`).
- Prose is generic and misses game-specific vocabulary; multi-part instructions get compressed; critic rationales can confabulate sources; rewrites can drop requested parts (`content-pipeline/README.md:124-134`).
- The CrewAI run drifted from exact JSON schemas and failed to express the full six-persona critique (`agent-crew/README.md:54-62`).
- A short planning probe during this inventory emitted no token within roughly 60 seconds while the CPU-only container was under current workload. That is a latency observation, not a quality verdict; the captured pipeline runs are stronger evidence of output quality.

Use it for divergent ideas and checklist drafts, then validate every factual/license/schema claim in deterministic code or by a human. Do not ask it for note-by-note music notation or exact asset manifests and trust the first answer.

### Gemini CLI

Gemini CLI is absent. It is also **not a local model**: the Apache-2.0 client calls Google's hosted services, whose service terms and authentication apply ([official repository](https://github.com/google-gemini/gemini-cli), [terms/privacy](https://github.com/google-gemini/gemini-cli/blob/main/docs/resources/tos-privacy.md)). As of 2026-06-18, Google states Gemini CLI stopped serving free-tier individual accounts; enterprise/API-key access remains ([official announcement](https://github.com/google-gemini/gemini-cli/discussions/28017)). It is therefore not part of the free-first shortlist.

If an eligible credential already exists later, contain the client and pin the current stable release rather than installing npm globally:

```bash
docker run --rm -it \
  --platform linux/arm64 \
  --cpus 2 --memory 2g \
  -v "$PWD:/workspace" -w /workspace \
  -v spellroad_gemini_config:/root/.gemini \
  ghcr.io/google/gemini-cli:0.52.0 --version

docker run --rm -it \
  --platform linux/arm64 \
  --cpus 2 --memory 2g \
  -v "$PWD:/workspace:ro" -w /workspace \
  -v spellroad_gemini_config:/root/.gemini \
  ghcr.io/google/gemini-cli:0.52.0 \
  -p 'Planning only: produce three pixel-art prompt variants from the supplied brief.'
```

Google documents `ghcr.io/google/gemini-cli` for container sandboxing and recommends the stable channel ([sandbox docs](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/sandbox.md), [release notes](https://github.com/google-gemini/gemini-cli/blob/main/docs/changelogs/index.md)). Confirm that the exact version tag supports ARM64 before any future pull. Mount the repo read-only for planning-only work.

## Repo contracts that govern creative work

### Composer

Composer accepts one Lorena-authored mood/tempo/instrumentation brief for an already-shipped target, outputs one rendered track, and hands it to Heckler (`docs/agents/composer/AGENT.md:11-17`; `docs/agents/composer/CONTEXT.md:3-13`). The contract explicitly forbids raw API calls and local Ollama for notation because the small model demonstrated strict-structure drift.

The existing production path is already the right one for this Mac:

- `docs/agents/composer/scripts/compose-boss-1-invigilator-trial-theme.py`
- deterministic `music21` 10.5.0 score generation
- 96 BPM, D minor, 24 bars, four parts, standard MIDI output
- independently re-read with `mido`; Heckler cleared the gate

See `docs/agents/composer/log.md:9-34`. The script itself is reproducible and accepts an output path (`:184-190`). This is *algorithmic composition guided by a human/agent brief*, not generative audio.

### Tilesmith

Tilesmith owns art, layouts, VFX, and one-shot SFX—not composed music (`docs/agents/tilesmith/AGENT.md:7-15`; `docs/agents/_reference/art-sourcing-contract.md:5`). Its required order is:

1. Kenney.nl CC0.
2. OpenGameArt, CC0 filter only.
3. Recolor/recombine already-sourced CC0.
4. Hand-author only after 1-3 fail.

Every asset must log source, license, step, and pending human compliance sign-off (`art-sourcing-contract.md:7-20`). AI generation does not bypass this rule; at minimum log model/checkpoint, exact license/version, prompt, seed, source references, transformations, and human sign-off.

The most relevant precedent is the four 32x32 spell icons: Tilesmith exhausted sourcing steps, then used deterministic Python/Pillow with supersampling/downsampling (`docs/agents/tilesmith/log.md:179-245`). This is faster and more style-controllable than diffusion on this machine.

## Free-first shortlist for this specific Mac

### 1. Deterministic pixel art: Pillow/ImageMagick — recommended production default

**Use for:** spell icons, palette swaps, silhouettes, spritesheet assembly, nearest-neighbor scaling, masks, tile recolors.
**Asset generation:** yes, deterministic/raster rather than AI.
**Fit:** excellent; seconds, low memory, tiny cache.
**Commercial use:** tool licenses are permissive; wholly original output has no third-party model weight. Still log any source material.

Container pattern (pin by version; cache wheels in the image, outputs only through the mount):

```dockerfile
# Dockerfile.pixel-tools
FROM python:3.11.13-slim-bookworm
RUN pip install --no-cache-dir Pillow==11.3.0
WORKDIR /work
ENTRYPOINT ["python"]
```

```bash
docker build --platform linux/arm64 -t spellroad/pixel-tools:2026-08-07 -f Dockerfile.pixel-tools .
docker run --rm --platform linux/arm64 --cpus 2 --memory 1g \
  -v "$PWD:/work" spellroad/pixel-tools:2026-08-07 \
  docs/agents/composer/scripts/your-script.py

# Lossless 4x pixel scaling with no neural hallucination:
docker run --rm --platform linux/arm64 --cpus 2 --memory 1g \
  -v "$PWD/public/assets:/assets" \
  dpokidov/imagemagick:7.1.1-47 \
  /assets/input.png -filter point -resize 400% /assets/output-4x.png
```

The placeholder script name means “the task-specific checked-in generator,” not an existing Composer file. For current spell-icon precedent, use/rework the logged Pillow approach rather than overwriting assets blindly.

### 2. SD 1.5-sized pixel model — optional, slow ideation only

**Use for:** rough mood boards, candidate silhouettes, background concepts, img2img variations from an approved sketch.
**Asset generation:** yes.
**Fit:** borderline but possible at 384-512 px, 10-20 steps, batch 1, CPU. Expect **tens of minutes per image**, not interactive iteration.
**RAM/storage:** roughly 5-7 GiB live RAM; approximately 4.27 GB for the inference checkpoint plus several GB for the PyTorch/diffusers image and cache.
**License:** Stable Diffusion v1.5 and PublicPrompts' All-In-One Pixel Model use CreativeML OpenRAIL-M; commercial use is possible subject to the license's use restrictions. The pixel model card documents `pixelsprite` and `16bitscene` triggers ([SD v1.5 model card](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5), [pixel model card](https://huggingface.co/PublicPrompts/All-In-One-Pixel-Model)). Human provenance/license review remains required.

Container requirements:

- Base `python:3.11.13-slim-bookworm`, pinned `torch==2.8.0`, `diffusers==0.35.1`, `transformers==4.55.0`, `accelerate==1.10.0`, `safetensors==0.6.2`.
- Mount `spellroad_hf_cache:/cache`, set `HF_HOME=/cache`; mount a dedicated output directory, not the whole repo writable.
- Run CPU `float32`, attention slicing, VAE slicing, batch 1, 384x384 initially.
- Persist seed, model revision/commit, prompt, negative prompt, step count, guidance, and img2img strength beside every candidate.

Run shape after building the pinned image:

```bash
docker run --rm --platform linux/arm64 \
  --cpus 4 --memory 6g \
  -e HF_HOME=/cache \
  -v spellroad_hf_cache:/cache \
  -v "$PWD/creative-inputs:/inputs:ro" \
  -v "$PWD/creative-output:/outputs" \
  spellroad/sd15-cpu:2026-08-07 \
  --model PublicPrompts/All-In-One-Pixel-Model \
  --prompt 'pixelsprite, readable 32x32 lightning rune silhouette, four-color palette, transparent-background candidate' \
  --width 384 --height 384 --steps 15 --seed 41029 --output /outputs/lightning-41029.png
```

For style consistency, prefer an approved sketch/reference through img2img with fixed seed and low strength (about 0.25-0.45), then manually clean/downsample. Diffusers supports text-to-image, img2img, and inpainting; IP-Adapter can condition on a style image ([Diffusers IP-Adapter docs](https://github.com/huggingface/diffusers/blob/main/docs/source/en/using-diffusers/ip_adapter.md)). On this 8 GB CPU-only VM, however, IP-Adapter/ControlNet adds enough memory and latency that fixed-seed img2img is the practical ceiling.

**Do not use locally under this rule:** SDXL, FLUX, multiple ControlNets, IP-Adapter plus ControlNet, or LoRA/DreamBooth training. Their memory/cache/iteration costs defeat this machine and its remaining disk.

### 3. `rembg` 2.0.75 + U2-Net — recommended cutout tool

**Use for:** turning concept/reference art into transparent cutouts before manual pixel cleanup.
**Asset generation:** no; ML-assisted segmentation/postprocessing.
**Fit:** excellent on CPU; U2-Net is about 176 MB, `u2netp` about 4.7 MB.
**License:** `rembg` MIT; upstream U2-Net Apache-2.0 ([rembg official repository](https://github.com/danielgatis/rembg), [U2-Net official repository](https://github.com/xuebinqin/U-2-Net)). Commercially usable under those licenses.

Build from the official release tag into Docker; keep the model in a named cache:

```bash
docker build --platform linux/arm64 \
  -t spellroad/rembg:2.0.75 \
  'https://github.com/danielgatis/rembg.git#v2.0.75'

docker run --rm --platform linux/arm64 --cpus 4 --memory 2g \
  -e U2NET_HOME=/models \
  -v spellroad_rembg_models:/models \
  -v "$PWD/creative-inputs:/inputs:ro" \
  -v "$PWD/creative-output:/outputs" \
  spellroad/rembg:2.0.75 \
  i -m u2netp /inputs/source.png /outputs/source-cutout.png
```

Use `u2netp` first for sprites and `u2net` only if edge quality is inadequate. First use downloads the selected model into the named volume; no host package is installed.

### 4. Real-ESRGAN 0.3.0 — selective upscaling, not pixel preservation

**Use for:** painterly/background concepts, anti-aliased illustrations, noisy references.
**Asset generation:** no; neural restoration/upscaling.
**Fit:** viable CPU batch job with tiling; slower than `rembg`, still far lighter than diffusion.
**License:** BSD-3-Clause ([official repository and inference commands](https://github.com/xinntao/Real-ESRGAN), [license](https://github.com/xinntao/Real-ESRGAN/blob/master/LICENSE)).

The official project provides Python and NCNN inference, but its portable GPU binaries do not solve Docker-on-Mac's lack of Metal. Use CPU Python in a pinned ARM64 image, tile small, and persist `/models` and `/outputs`. Before adopting, build and time one representative asset; dependency age makes ARM64 packaging riskier than `rembg`.

For actual 16x16/32x32 sprite art, use nearest-neighbor ImageMagick instead. Real-ESRGAN can invent edge texture and colors that break exact palettes and tile seams.

### 5. Existing `music21` Composer pipeline — recommended music path

**Use for:** original loopable MIDI with explicit tempo, harmony, instrumentation, and reproducible note counts.
**Asset generation:** yes, deterministic notation/MIDI.
**Fit:** excellent.
**License:** `music21` uses BSD-3-Clause; Composer's original MIDI is project-authored. The chosen SoundFont has its own independent license and must be logged.

Exact Docker-only generation of the existing score:

```bash
docker run --rm --platform linux/arm64 --cpus 2 --memory 2g \
  -v "$PWD:/work" -w /work \
  python:3.11.13-slim-bookworm \
  sh -lc 'pip install --no-cache-dir music21==10.5.0 mido==1.3.3 && \
    python docs/agents/composer/scripts/compose-boss-1-invigilator-trial-theme.py \
      /work/creative-output/boss-1-invigilator-trial-theme.mid'
```

For repeated use, bake those pinned packages into a `spellroad/music21:10.5.0` image so every run is offline/repeatable. Rendering MIDI to WAV/OGG requires FluidSynth plus a specifically approved SoundFont. FluidSynth itself is LGPL and supports commercial/closed-source use under its terms ([official repository](https://github.com/FluidSynth/fluidsynth)); the SoundFont license, not FluidSynth, is the main asset-rights check.

After rendering, validate:

- BPM/time signature and expected duration.
- note counts/parts via `mido`.
- no clipping and reasonable loudness.
- audible loop seam (tail/reverb matters even when MIDI bar length is exact).
- Heckler against Lorena's brief, then human in-game listening.

### 6. SFX: CC0-first plus deterministic transforms — recommended

Tilesmith's contract already names Kenney Impact/UI/RPG audio and OpenGameArt CC0 as the first two steps (`art-sourcing-contract.md:7-14`). That is safer, faster, and more varied than local neural SFX on this machine.

Use a pinned FFmpeg container for format conversion/variation, preserving the original source and logging every transform:

```bash
docker run --rm --platform linux/arm64 --cpus 2 --memory 1g \
  -v "$PWD/creative-inputs:/inputs:ro" \
  -v "$PWD/creative-output:/outputs" \
  linuxserver/ffmpeg:7.1.1 \
  -i /inputs/cc0-impact.wav \
  -filter:a 'asetrate=48000*1.04,aresample=48000,volume=0.85' \
  -c:a libvorbis -q:a 5 /outputs/impact-variant-104.ogg
```

Confirm the exact image tag supports ARM64 before pulling. Procedural retro effects are another good fallback, but only after recording the generator's software license and the generated asset in Tilesmith's log.

## Neural audio models: why they are not shortlisted

| Model/tool | License status | Official requirement | Verdict here |
| --- | --- | --- | --- |
| MusicGen / AudioGen (AudioCraft) | Code MIT; released weights CC-BY-NC 4.0 | Official docs recommend a GPU and 16 GB for medium; small is 300M | Prototype-only license and CPU latency; do not ship or build pipeline around it. |
| Stable Audio Open 1.0 | Stability AI Community License; limited commercial use under $1M with registration/terms | Transformer diffusion audio stack, PyTorch 2.5+, gated weights | Too large/slow CPU-only; license process is heavier than CC0 sourcing. |
| ACE-Step 1.5 | Open repo, but verify exact checkpoint license separately | Project's optimization target is still up to 8 GB **VRAM** with offload | 8 GB host RAM is not equivalent to 8 GB VRAM; Docker has no Metal. Not viable. |

Primary sources: [AudioCraft/MusicGen requirements](https://github.com/facebookresearch/audiocraft/blob/main/docs/MUSICGEN.md), [AudioCraft code/weight licenses](https://github.com/facebookresearch/audiocraft), [Stable Audio model card](https://huggingface.co/stabilityai/stable-audio-open-1.0), [Stability Community License](https://huggingface.co/stabilityai/stable-audio-open-1.0/blob/main/LICENSE.md), [ACE-Step official repository](https://github.com/ace-step/ACE-Step).

Even ignoring license, a 30-60 second neural music/SFX render competes for nearly the entire Docker VM and takes too long to iterate. The Composer MIDI path and Tilesmith CC0 SFX path produce more auditable results.

## Practical end-to-end workflow

### Art / pixel art

1. Ana names the already-shipped target and acceptance criteria.
2. Tilesmith searches Kenney then OpenGameArt CC0 and logs candidates.
3. If no fit exists, use local `llama3.2` only to draft 3-5 prompt/checklist variants.
4. Prefer deterministic Pillow construction/recoloring. If visual exploration is genuinely needed, run one SD 1.5 pixel-model batch at fixed seed and low resolution.
5. Use `rembg` for cutouts; manually clean silhouettes/palette; nearest-neighbor down/upscale for sprites.
6. Put candidate outputs in a staging directory, not directly in `public/assets`.
7. Log source/model license, model revision, prompt, seed, transforms, and human sign-off. Only then promote a selected asset.
8. Verify in Phaser at actual display scale; pixel readability beats a good-looking 384 px preview.

### Music

1. Lorena writes target + mood + BPM + meter + key/harmony + instrumentation + length/loop brief.
2. Local text model may challenge the brief or suggest acceptance checks, but cannot choose direction or write the final notation unchecked.
3. Composer edits/runs a deterministic `music21` script in a pinned container.
4. Independently parse MIDI with `mido`.
5. Render using containerized FluidSynth and a human-approved, logged SoundFont license.
6. Listen for the loop seam in game; Heckler validates against the brief; human signs off.

### SFX

1. Confirm the target action already ships.
2. Search Kenney, then OpenGameArt CC0.
3. Create pitch/tempo/EQ variations in pinned FFmpeg/SoX tooling, preserving originals.
4. Log source/license/transforms.
5. Normalize/test at gameplay volume and with `src/systems/sfxVariation.ts`; human signs off.

## Operational guardrails

- Pin Docker image tags and preferably digests after the first verified build. Never use `latest` in a reproducible creative pipeline.
- Use named model caches (`spellroad_hf_cache`, `spellroad_rembg_models`) and dedicated bind-mounted input/output folders.
- Mount repo context read-only unless a specific generator must write its one output directory.
- Run `docker system df` before pulling a model; there is insufficient disk for an experimental catalog.
- Never disable model checksum verification.
- Record the model repository **and immutable revision**, not just a friendly model name.
- Generated does not mean cleared: Tilesmith's human license/source check still applies.
- Keep original CC0 files and license evidence alongside transformed derivatives.
- Stop duplicate Ollama/game containers before a CPU-heavy render; do not run diffusion and neural audio concurrently.

## Bottom line

The machine already has a useful zero-cost local text stack, but no actual generative art/audio stack. Under the Docker-only requirement, the M1 GPU is unavailable and 8 GB RAM/32 GiB free disk sharply limit sensible choices. The viable production core is therefore:

- **planning:** existing `llama3.2` + RAG, with human/deterministic validation;
- **art:** CC0-first sourcing, Pillow/ImageMagick, optionally one slow SD 1.5 pixel model for concepts;
- **cleanup:** `rembg`/U2-Net and nearest-neighbor scaling, Real-ESRGAN only for non-pixel material;
- **music:** existing deterministic `music21` Composer script plus licensed SoundFont rendering;
- **SFX:** CC0 assets plus deterministic FFmpeg variations.

That workflow matches the repository contracts, stays free, keeps the host untouched, and avoids models whose theoretical local availability is not practical availability on this Mac.
