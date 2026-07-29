"""Model assignment.

No paid API key is used here -- this crew runs entirely against a local
Ollama server (see the `ollama` service in the repo's docker-compose.yml)
so it costs nothing and needs no credential. The GDD's own
Model-Selection Governance table (`docs/game/the-last-spellroad-design.md`,
"Token Budget And Projections") assigns a *cheaper* model to Pato's
deterministic validation and a *more capable* one to every
generative/creative/orchestration role; the same idea is kept here with
local models instead of Claude tiers, sized to what a CPU-only container
can actually run in reasonable time. Every agent's model -- and, if you
add larger/smaller local models later, a genuinely different one per
agent -- is overridable via env var without touching this file, since
"one small model for everyone" below is a same-day-deadline
simplification, not a design conclusion.
"""

import os

from crewai import LLM

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")

# Single shared default model. Llama 3.2 (3B) -- the developer's own pick,
# the best balance of logic/speed/memory on an 8GB-class Mac. Phi-3.5
# (3.8B) is a documented alternative if a task needs stronger reasoning
# and can afford the extra size; swap per-agent via the env vars below.
DEFAULT_MODEL = os.getenv("CREW_DEFAULT_MODEL", "llama3.2")

# Every model this crew needs pulled before a run -- main.py pulls each
# of these from the `ollama` service on startup if not already present.
REQUIRED_MODELS = {DEFAULT_MODEL}


def _agent_llm(env_var: str) -> LLM:
    model_name = os.getenv(env_var, DEFAULT_MODEL)
    REQUIRED_MODELS.add(model_name)
    return LLM(model=f"ollama/{model_name}", base_url=OLLAMA_BASE_URL)


# Per-agent model assignment -- same idea as the GDD's table (Pato is the
# one deterministic-validation role), implemented as local model choice
# rather than a paid-tier choice. All default to the same small model for
# now; override e.g. PATO_MODEL=qwen2.5:0.5b or WARDEN_MODEL=llama3.2:3b
# independently once you've pulled the larger model and confirmed timing.
AGENT_MODELS = {
    "ana": _agent_llm("ANA_MODEL"),
    "warden": _agent_llm("WARDEN_MODEL"),
    "frieren": _agent_llm("FRIEREN_MODEL"),
    "pato": _agent_llm("PATO_MODEL"),
    "tilesmith": _agent_llm("TILESMITH_MODEL"),
    "lorena": _agent_llm("LORENA_MODEL"),
    "loomwright": _agent_llm("LOOMWRIGHT_MODEL"),
    "heckler": _agent_llm("HECKLER_MODEL"),
}

OUTPUT_DIR = os.getenv("CREW_OUTPUT_DIR", "output")
