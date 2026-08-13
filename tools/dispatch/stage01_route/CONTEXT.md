# stage01_route — Context

**Inputs:** one issue dict from `stage00_scan.scan()`.
**Process:** classify which named agent (per `AGENTS.md`'s roster table) the
issue belongs to via keyword match, falling back to Ana when ambiguous; look
up that agent's task type (engine/content/ana); probe live backend
availability (Codex CLI auth, Ollama container) and pick a backend per the
policy in `docs/agents/ana/AGENT.md` (engine and review work always goes to
Codex; content-authoring prefers Ollama, falls back to Codex when Ollama is
down).
**Outputs:** `classify_agent`, `task_type_for`, `load_registry`,
`probe_registry`, `choose_backend` — see this stage's docstrings.
