# Download/inspect/process image for issue #126's "CC0 Remix" treatment (Tilesmith's slice).
# Mirrors tools/pixel-gen/Dockerfile's and content-pipeline/Dockerfile's pattern
# (python:3.11-slim base, pinned requirements.txt, script baked into the image) per
# docs/adr/0003-docker-only-rotating-creative-prototypes.md: every download, archive
# inspection, rasterization/downscale/tint, and audio probe runs in Docker, never on the host.
#
# ffmpeg is included for the audio loop/format sanity check on the Forest Ambience mp3
# (ffprobe) -- no transcoding is expected to be needed since the source is already mp3, but
# the check itself must still run in Docker per the same ADR.
#
# Base image pinned by digest at build time (recorded in provenance.json's
# "toolchain.dockerBaseImage" field) -- the tag alone is not immutable, the digest is.
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY cc0_remix.py ./

ENTRYPOINT ["python", "cc0_remix.py"]
CMD ["--help"]
