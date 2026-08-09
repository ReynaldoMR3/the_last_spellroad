FROM python:3.11-slim

WORKDIR /work

# fluidsynth + a GM soundfont for rendering Composer's deterministic MIDI to a
# browser-ready audio file (ffmpeg converts the WAV render to OGG). Mirrors
# content-pipeline/Dockerfile's minimal single-stage pattern -- this image is
# a one-off creative-generation tool, not a runtime dependency of the game.
RUN apt-get update && apt-get install -y --no-install-recommends \
    fluidsynth \
    fluid-soundfont-gm \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Pinned per docs/adr/0003-docker-only-rotating-creative-prototypes.md --
# every creative-tool version must be pinned and recorded, not floating.
RUN pip install --no-cache-dir music21==10.5.0 mido==1.3.3

CMD ["bash"]
