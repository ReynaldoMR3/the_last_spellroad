# Loudness/duration normalization image for issue #111's per-element cast SFX pass.
# Mirrors tools/cc0-remix/Dockerfile's and tools/pixel-gen/Dockerfile's pattern
# (python:3.11-slim base, pinned requirements.txt, script baked into the image) per
# docs/adr/0003-docker-only-rotating-creative-prototypes.md: audio measurement and
# processing runs in Docker, never on the host.
#
# libsndfile1 covers WAV/OGG-Vorbis read+write via the `soundfile` package -- the PyPI wheel
# only bundles the binary for x86_64, so arm64 hosts (e.g. Apple Silicon) need the apt package
# explicitly; no separate ffmpeg needed for this pass -- unlike tools/cc0-remix's Dockerfile,
# which needed ffprobe for an mp3 sanity check.
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY normalize_cast_sfx.py ./

ENTRYPOINT ["python", "normalize_cast_sfx.py"]
