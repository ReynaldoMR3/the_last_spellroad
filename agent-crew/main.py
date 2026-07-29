"""Entry point: runs the Spellroad agent crew end-to-end and writes every
task's output to `output/`, plus a combined run summary.

Usage:
    python main.py [level]

Requires the `ollama` service from the repo's docker-compose.yml (or any
Ollama server reachable at OLLAMA_BASE_URL) -- no paid API key needed.
On first run, this pulls every model in crew.config.REQUIRED_MODELS if
not already present, which can take a few minutes.
"""

import datetime
import json
import os
import sys
import time

import requests
from dotenv import load_dotenv

load_dotenv()

from crew.crew import spellroad_crew  # noqa: E402
from crew.config import OUTPUT_DIR, OLLAMA_BASE_URL, REQUIRED_MODELS  # noqa: E402

TASK_FILENAMES = [
    "01_ana_kickoff_brief.md",
    "02_warden_wave.md",
    "03_frieren_spell.md",
    "04_pato_validation.md",
    "05_tilesmith_art_notes.md",
    "06_lorena_lore_beat.md",
    "07_loomwright_integration_notes.md",
    "08_heckler_critique.md",
    "09_ana_status_report.md",
]


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


def ensure_models_pulled():
    have_full = {
        m["name"]
        for m in requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10).json().get("models", [])
    }
    have_base = {name.split(":")[0] for name in have_full}
    for model in REQUIRED_MODELS:
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


def main():
    level = sys.argv[1] if len(sys.argv) > 1 else "2"

    wait_for_ollama()
    ensure_models_pulled()

    result = spellroad_crew.kickoff(inputs={"level": level})

    run_dir = os.path.join(
        OUTPUT_DIR, f"run_{datetime.datetime.now():%Y%m%d_%H%M%S}"
    )
    os.makedirs(run_dir, exist_ok=True)

    bundle = {"level": level, "tasks": []}

    for filename, task in zip(TASK_FILENAMES, spellroad_crew.tasks):
        raw = task.output.raw if task.output else ""
        with open(os.path.join(run_dir, filename), "w") as f:
            f.write(raw)
        bundle["tasks"].append(
            {
                "file": filename,
                "agent": task.agent.role,
                "output": raw,
            }
        )

    with open(os.path.join(run_dir, "bundle.json"), "w") as f:
        json.dump(bundle, f, indent=2)

    with open(os.path.join(run_dir, "final_status.md"), "w") as f:
        f.write(str(result.raw if hasattr(result, "raw") else result))

    print(f"\nDone. {len(spellroad_crew.tasks)} tasks across "
          f"{len(spellroad_crew.agents)} agents wrote output to {run_dir}/")


if __name__ == "__main__":
    main()
