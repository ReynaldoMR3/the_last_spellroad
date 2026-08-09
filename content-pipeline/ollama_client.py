"""Shared Ollama HTTP client -- the network boundary every other module in
this pipeline goes through. No paid API key: this hits the same `ollama`
service already defined in the repo's root docker-compose.yml for
Assignment #3's agent-crew.
"""

import json
import os
import time

import requests

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
GENERATION_MODEL = os.getenv("PIPELINE_GENERATION_MODEL", "llama3.2")
EMBEDDING_MODEL = os.getenv("PIPELINE_EMBEDDING_MODEL", "nomic-embed-text")
REQUIRED_MODELS = [GENERATION_MODEL, EMBEDDING_MODEL]
# Named so a run bundle can record the sampling parameter it actually used
# without a second copy of the number drifting out of sync with this one.
DEFAULT_TEMPERATURE = 0.7


def wait_for_ollama(timeout=180):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5).status_code == 200:
                return
        except requests.exceptions.RequestException:
            pass
        time.sleep(2)
    raise RuntimeError(f"Ollama at {OLLAMA_BASE_URL} did not become ready within {timeout}s")


def ensure_models_pulled(models=None):
    models = models or REQUIRED_MODELS
    have_full = {
        m["name"]
        for m in requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10).json().get("models", [])
    }
    have_base = {name.split(":")[0] for name in have_full}
    for model in models:
        present = model in have_full or (":" not in model and model in have_base)
        if present:
            print(f"[ollama] {model} already present")
            continue
        print(f"[ollama] pulling {model} (first run only, can take a few minutes)...")
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/pull", json={"name": model}, stream=True, timeout=None
        )
        last_status = None
        for line in resp.iter_lines():
            if not line:
                continue
            try:
                status = json.loads(line).get("status", "")
            except ValueError:
                continue
            if status != last_status:
                print(f"  [{model}] {status}")
                last_status = status
        print(f"[ollama] {model} ready")


def embed(text, model=None):
    model = model or EMBEDDING_MODEL
    resp = requests.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": model, "prompt": text},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]


def generate(prompt, system=None, model=None, temperature=None):
    model = model or GENERATION_MODEL
    temperature = DEFAULT_TEMPERATURE if temperature is None else temperature
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if system:
        payload["system"] = system
    resp = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=300)
    resp.raise_for_status()
    return resp.json()["response"]
