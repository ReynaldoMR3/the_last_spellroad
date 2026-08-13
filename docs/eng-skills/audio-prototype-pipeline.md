# Audio Prototype Pipeline

Issue #139 — the developer asked for a reusable, easy-to-recreate way to preview a music
prototype (e.g. a boss-theme revision) without the manual, ad hoc Docker/`fluidsynth`/`ffmpeg`
sequence Composer previously ran by hand each time (see `docs/agents/composer/log.md` for the
original manual process). This wraps the same three steps into one command.

## Usage

```
npm run audio:prototype -- <compose-script> <output-name>
```

- `<compose-script>` — a Composer script (relative to repo root) that writes MIDI to the path
  given as its own last CLI argument. Existing examples live under
  `docs/agents/composer/scripts/*.py`.
- `<output-name>` — basename for the rendered files, no extension.

Example, re-rendering the shipped boss theme:

```
npm run audio:prototype -- docs/agents/composer/scripts/compose-boss-1-invigilator-trial-theme.py boss-1-recheck
```

## What it does

1. Builds `tools/composer/Dockerfile` (pinned `music21`/`mido`/`fluidsynth`/`ffmpeg`, same image
   Composer's manual sessions already use) — cached after the first run.
2. Runs the compose script inside that container, writing a MIDI file.
3. Renders the MIDI to WAV via `fluidsynth` against the container's GM soundfont.
4. Transcodes WAV to OGG via `ffmpeg`, then deletes the intermediate WAV (matching every prior
   manual run recorded in `docs/agents/composer/log.md` — the WAV was never kept in the repo).

## Where output lands

`public/assets/audio/_prototypes/<output-name>.{mid,ogg}` — gitignored (see `.gitignore`), served
by `npm run dev`'s static file server like everything else under `public/`. Play it directly by
opening `http://localhost:5173/assets/audio/_prototypes/<output-name>.ogg` in a browser tab (or
any player that can open a local file path), no separate preview server needed.

This directory is for quick listening only, not a deliverable — a track that's actually chosen
still needs a real Composer dispatch and Heckler validation pass before it's promoted into
`public/assets/audio/music/` and wired into the game, same as any other track (see
`docs/agents/composer/CONTEXT.md`).

## Writing a new compose script for this

Any script under `docs/agents/composer/scripts/` already fits this pipeline as long as it takes
the output MIDI path as its last CLI argument (every existing script already does). A new
variation/prototype script just needs to live there and get passed as `<compose-script>` above —
no changes to `render.sh` itself.
