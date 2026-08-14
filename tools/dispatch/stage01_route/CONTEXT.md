# stage01_route — Context

**Inputs:** one issue dict from `stage00_scan.scan()`.
**Process:** classify which named agent (per `AGENTS.md`'s roster table) the
issue belongs to via keyword match, falling back to Ana when ambiguous; look
up that agent's task type (engine/content/ana); probe live backend
availability (Codex CLI auth, Ollama container) and pick a backend. Currently
always routes to Codex; Ollama's availability is still probed for future use
but reserved until OllamaBackend has a real agentic tool loop capable of
editing files (currently it's a plain HTTP text-completion call with no
filesystem access, unlike CodexBackend's `codex exec --full-auto`).
**Outputs:** `classify_agent`, `task_type_for`, `load_registry`,
`probe_registry`, `choose_backend` — see this stage's docstrings.
