# Deterministic Pillow-based pixel-art generator for issue #126 (Deterministic Original
# treatment of the Opening Magic audition). Mirrors content-pipeline/Dockerfile's pattern
# (python:3.11-slim base, pinned requirements.txt, script baked into the image) per
# docs/adr/0003-docker-only-rotating-creative-prototypes.md: every generator runs in Docker,
# never on the host.
#
# Base image pinned by digest at build time (recorded in provenance.json's
# "toolchain.dockerImage" field) -- the tag alone is not immutable, the digest is.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY generate_opening_magic.py ./

ENTRYPOINT ["python", "generate_opening_magic.py"]
CMD ["--output", "output"]
