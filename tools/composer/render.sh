#!/usr/bin/env bash
# Issue #139 — the Composer scripts under docs/agents/composer/scripts/ each write a MIDI file;
# turning that into something the developer can actually listen to used to be a manual, ad hoc
# shell sequence run by hand every time (build image, run script, fluidsynth, ffmpeg — see
# docs/agents/composer/log.md's own account of that process). This wraps the same three steps
# (compose -> fluidsynth render -> ffmpeg transcode) into one reusable command so any prototype
# can be regenerated and dropped somewhere playable with a single invocation.
#
# Usage: tools/composer/render.sh <compose-script> <output-name>
#   <compose-script>  path to a Composer script (relative to repo root) that writes MIDI to the
#                      path given as its own last argument, e.g.
#                      docs/agents/composer/scripts/compose-boss-1-invigilator-trial-theme.py
#   <output-name>      basename for the rendered files, no extension, e.g. boss-1-brass-take2
#
# Output: public/assets/audio/_prototypes/<output-name>.{mid,ogg} (the .wav render is
# intermediate and deleted after transcoding, same as every prior manual run recorded in
# docs/agents/composer/log.md). The _prototypes directory is gitignored — these are quick
# listening candidates, not a checked-in deliverable; promote a specific file into
# public/assets/audio/music/ by hand once it's actually chosen.
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <compose-script> <output-name>" >&2
  exit 1
fi

SCRIPT_PATH="$1"
OUTPUT_NAME="$2"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="public/assets/audio/_prototypes"
IMAGE="spellroad/composer:render"

if [ ! -f "$REPO_ROOT/$SCRIPT_PATH" ]; then
  echo "Compose script not found: $SCRIPT_PATH" >&2
  exit 1
fi

# <output-name> is a basename, not a path — reject anything that could escape the gitignored
# $OUT_DIR (a stray "/" or ".." would otherwise write a large binary somewhere `git status`
# doesn't ignore, one typo away from an accidental commit).
if [[ "$OUTPUT_NAME" == *"/"* || "$OUTPUT_NAME" == *".."* ]]; then
  echo "Invalid output-name '$OUTPUT_NAME': must be a plain basename, no '/' or '..'" >&2
  exit 1
fi

mkdir -p "$REPO_ROOT/$OUT_DIR"

docker build -t "$IMAGE" -f "$REPO_ROOT/tools/composer/Dockerfile" "$REPO_ROOT"

docker run --rm -v "$REPO_ROOT":/work -w /work "$IMAGE" \
  python "$SCRIPT_PATH" "$OUT_DIR/$OUTPUT_NAME.mid"

docker run --rm -v "$REPO_ROOT":/work -w /work "$IMAGE" \
  fluidsynth -ni /usr/share/sounds/sf2/FluidR3_GM.sf2 \
  "$OUT_DIR/$OUTPUT_NAME.mid" -F "$OUT_DIR/$OUTPUT_NAME.wav" -r 44100

docker run --rm -v "$REPO_ROOT":/work -w /work "$IMAGE" \
  ffmpeg -y -i "$OUT_DIR/$OUTPUT_NAME.wav" -c:a libvorbis -q:a 4 "$OUT_DIR/$OUTPUT_NAME.ogg"

rm -f "$REPO_ROOT/$OUT_DIR/$OUTPUT_NAME.wav"

echo "Rendered: $OUT_DIR/$OUTPUT_NAME.mid"
echo "Rendered: $OUT_DIR/$OUTPUT_NAME.ogg"
