"""Stage 01: classify which agent an issue belongs to and pick a backend."""

import json
from pathlib import Path

from backends.codex_backend import CodexBackend
from backends.ollama_backend import OllamaBackend

_KEYWORDS = {
    "loomwright": ["loomwright", "targeting", "casting", "movement", "engine", "cone", "aoe"],
    "pato": ["pato", "mana", "mastery", "hexcoin", "economy"],
    "frieren": ["frieren", "spell"],
    "warden": ["warden", "wave", "encounter"],
    "lorena": ["lorena", "lore", "dialogue", "narrative", "npc"],
    "composer": ["composer", "music", "theme", "audio track"],
    "tilesmith": ["tilesmith", "tile", "level", "art", "sprite"],
}

_TASK_TYPES = {
    "loomwright": "engine",
    "pato": "content",
    "frieren": "content",
    "warden": "content",
    "lorena": "content",
    "composer": "content",
    "tilesmith": "content",
    "ana": "ana",
}

_REGISTRY_PATH = Path(__file__).resolve().parent.parent / "model_registry.json"


def classify_agent(issue):
    haystack = f"{issue.get('title', '')} {issue.get('body', '')}".lower()
    for agent, keywords in _KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return agent
    return "ana"


def task_type_for(agent):
    return _TASK_TYPES[agent]


def load_registry(path=None):
    return json.loads(Path(path or _REGISTRY_PATH).read_text())


def probe_registry(registry):
    probed = {name: dict(entry) for name, entry in registry.items()}
    probed["codex"]["available"] = CodexBackend().available()
    probed["ollama"]["available"] = OllamaBackend().available()
    probed.setdefault("gemini", {})["available"] = False
    return probed


def choose_backend(task_type, probed_registry):
    # Ollama is reserved for future use, the same "reserved, not yet
    # enabled" status Gemini already carries in model_registry.json.
    # OllamaBackend.run() is a plain HTTP text-completion call -- it has no
    # filesystem access and no agentic tool loop, so it cannot actually edit
    # files in the dispatch worktree (unlike CodexBackend, which runs
    # `codex exec --full-auto`, a real tool loop with file access). Routing
    # content tasks to it produced silent no-op dispatches that still
    # cleared every downstream gate. Always return "codex" for now,
    # regardless of task_type or Ollama's probed availability, until Ollama
    # has a real tool loop capable of editing files. `probed_registry` is
    # still accepted (and Ollama's availability is still probed upstream in
    # `probe_registry`) so this signature and the probing behavior are ready
    # to use the moment that changes.
    return "codex"
