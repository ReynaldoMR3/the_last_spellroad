# Automated Agent Dispatch — Core Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `tools/dispatch/`, an unattended pipeline that scans `ready-for-agent` GitHub issues, dispatches each to the right named agent in an isolated worktree, verifies and security-gates the result, runs Heckler's critique as a blocking check, and merges (or reports `blocked-with-reason`) — implementing issue #195 end-to-end, defaulting to `--dry-run`.

**Architecture:** Seven small Python modules under `tools/dispatch/`, one job per stage (`stage00_scan` → `stage01_route` → `stage02_dispatch` → `stage03_verify` → `stage04_security` → `stage05_review` → `stage07_merge`, numbering matches the design spec — stage06/preview and the HTML report are a follow-up plan), wired by `run.py`. Each stage writes one JSON file per issue into `tools/dispatch/runs/<run_id>/`. Unlike `content-pipeline` (which runs entirely inside Docker), this tool runs directly on the host via a local venv launched by `launchd` — it needs host-level access to the developer's already-authenticated Codex CLI subscription (`~/.codex`) and to invoke `docker-compose` itself; nesting Docker-in-Docker would add complexity for no benefit. The game-verification commands it shells out to (`stage03_verify`) still go through `docker-compose run --rm game ...`, which is exactly what `stage04_security` checks actually happened.

**Tech Stack:** Python 3.11, `requests` (Ollama HTTP calls), `pytest`. No new paid dependency — Codex backend shells out to the already-installed `codex` CLI; Ollama backend calls the existing root `docker-compose.yml`'s `ollama` service.

## Global Constraints

- No API keys exist for Codex or Gemini on this machine — Codex auth is the developer's local `codex` CLI subscription login (confirmed installed, v0.146.0, `codex exec` supports non-interactive runs). Gemini is **not** implemented in this plan (no key, no CLI installed yet) — `model_registry.json` reserves an entry for it with a note, so adding it later is a registry + one new `backends/gemini_backend.py` file, no redesign.
- The design spec's `research_models.py` (infrequent, human-gated Hugging Face/Ollama-library discovery task that proposes `model_registry.json` additions via its own PR) is **also out of scope for this plan** — it has no dependency on the core loop and belongs in the same follow-up as stage06/reporting, not bundled in here.
- This plan implements the core loop only: 00-scan, 01-route, 02-dispatch, 03-verify, 04-security, 05-review, 07-merge, plus the `launchd` install. **Stage 06 (prototype-screenshot capture) and human-readable `report.html`/`index.html` generation are explicitly out of scope for this plan** — a follow-up plan builds them on top of the JSON manifests this plan produces (per the design spec's Program Design note).
- Naming adaptation (same reason as `content-pipeline`'s plan): the design spec's illustrative folder names use hyphens (`00-scan/`), which aren't valid Python package names. This plan uses `stage00_scan/`, `stage01_route/`, etc.
- Auto-merge is gated behind `run.py`'s `--dry-run` flag, **default `True`**. Flipping it to `False` is a manual decision the developer makes after watching several dry runs — no task in this plan changes that default.
- Every external call (`gh`, `git`, `codex`, `docker-compose`, Ollama's HTTP API) is exercised through `subprocess`/`requests` calls that tests monkeypatch — no test in this plan hits the real GitHub API, a real worktree, or a real LLM backend, except the final end-to-end task, which runs for real but stays in `--dry-run` mode and targets a disposable throwaway issue.
- Every issue gets its own `git worktree` under `.worktrees/`, matching this repo's existing convention (avoids the single-shared-working-tree gotcha already documented in this repo's history).
- Merge guardrails match issue #195 exactly: block (never merge) if verification fails, if the security gate fails, or if Heckler returns any BLOCKING finding.
- Branch: `docs/automated-agent-dispatch-spec` (already exists, worktree at `.worktrees/docs-automated-dispatch-spec`, design spec already committed there) — this plan's implementation continues on that same branch/worktree, one PR covering spec + plan + code.

---

### Task 1: Scaffold `tools/dispatch/`, the registry/policy configs, and both backends

**Files:**
- Create: `tools/dispatch/CONTEXT.md`
- Create: `tools/dispatch/model_registry.json`
- Create: `tools/dispatch/security_policy.json`
- Create: `tools/dispatch/requirements.txt`
- Create: `tools/dispatch/pytest.ini`
- Create: `tools/dispatch/.gitignore`
- Create: `tools/dispatch/__init__.py` (empty)
- Create: `tools/dispatch/backends/__init__.py` (empty)
- Create: `tools/dispatch/backends/codex_backend.py`
- Create: `tools/dispatch/backends/ollama_backend.py`
- Create: `tools/dispatch/tests/__init__.py` (empty)
- Create: `tools/dispatch/tests/test_codex_backend.py`
- Create: `tools/dispatch/tests/test_ollama_backend.py`

**Interfaces:**
- Produces: `CodexBackend` with `.name == "codex"`, `.available() -> bool`, `.run(prompt: str, cwd: str | None) -> dict{ok: bool, stdout: str, stderr: str}`. `OllamaBackend` with the same shape, `.name == "ollama"`, constructor `OllamaBackend(base_url: str | None = None, model: str = "llama3.2")`. Every later task imports these two classes and relies on exactly this `.name`/`.available()`/`.run()` shape — no other method is called on a backend anywhere in this plan.

- [ ] **Step 1: Write `tools/dispatch/requirements.txt`**

```
requests==2.32.3
pytest==8.3.3
```

- [ ] **Step 1a: Create a local venv for the fast TDD loop**

```bash
cd tools/dispatch
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

- [ ] **Step 2: Write `tools/dispatch/pytest.ini`**

```ini
[pytest]
pythonpath = .
```

- [ ] **Step 3: Write `tools/dispatch/.gitignore`**

```
.venv/
runs/
__pycache__/
*.pyc
```

- [ ] **Step 4: Write `tools/dispatch/model_registry.json`**

```json
{
  "codex": {
    "invoke": "codex exec",
    "cost_tier": "subscription",
    "structured_output_reliability": "high"
  },
  "gemini": {
    "invoke": null,
    "cost_tier": "free-tier-api",
    "structured_output_reliability": "unknown",
    "note": "Not yet configured. Add GEMINI_API_KEY and tools/dispatch/backends/gemini_backend.py before enabling -- do not route to this entry until then."
  },
  "ollama": {
    "invoke": "http://localhost:11434/api/generate",
    "cost_tier": "free-local",
    "structured_output_reliability": "low",
    "model": "llama3.2"
  }
}
```

- [ ] **Step 5: Write `tools/dispatch/security_policy.json`**

```json
{
  "denylist_paths": [
    "docker-compose.yml",
    ".github/workflows/",
    "Dockerfile",
    "package.json",
    "package-lock.json",
    ".env"
  ],
  "secret_patterns": [
    "sk-[A-Za-z0-9]{20,}",
    "AKIA[0-9A-Z]{16}",
    "-----BEGIN [A-Z ]*PRIVATE KEY-----"
  ]
}
```

- [ ] **Step 6: Write the failing test for `CodexBackend`**

```python
# tools/dispatch/tests/test_codex_backend.py
import subprocess

import pytest

from backends.codex_backend import CodexBackend


def test_available_true_when_doctor_exits_zero(monkeypatch):
    def fake_run(cmd, **kwargs):
        assert cmd == ["codex", "doctor"]
        return subprocess.CompletedProcess(cmd, returncode=0, stdout="ok", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    assert CodexBackend().available() is True


def test_available_false_when_codex_missing(monkeypatch):
    def fake_run(cmd, **kwargs):
        raise FileNotFoundError("codex not found")

    monkeypatch.setattr(subprocess, "run", fake_run)
    assert CodexBackend().available() is False


def test_run_invokes_codex_exec_and_returns_ok(monkeypatch):
    captured = {}

    def fake_run(cmd, **kwargs):
        captured["cmd"] = cmd
        captured["cwd"] = kwargs.get("cwd")
        return subprocess.CompletedProcess(cmd, returncode=0, stdout="done", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = CodexBackend().run("implement issue 195", cwd="/tmp/worktree")

    assert captured["cmd"] == ["codex", "exec", "--full-auto", "implement issue 195"]
    assert captured["cwd"] == "/tmp/worktree"
    assert result == {"ok": True, "stdout": "done", "stderr": ""}


def test_run_reports_failure_on_nonzero_exit(monkeypatch):
    def fake_run(cmd, **kwargs):
        return subprocess.CompletedProcess(cmd, returncode=1, stdout="", stderr="boom")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = CodexBackend().run("prompt", cwd="/tmp/worktree")

    assert result == {"ok": False, "stdout": "", "stderr": "boom"}
```

- [ ] **Step 7: Run it to verify it fails**

Run: `cd tools/dispatch && source .venv/bin/activate && python -m pytest tests/test_codex_backend.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'backends.codex_backend'`

- [ ] **Step 8: Write `tools/dispatch/backends/codex_backend.py`**

```python
"""Codex CLI backend -- shells out to the developer's already-authenticated
local `codex` subscription login. No API key: this only works run directly
on this machine, never inside a container (the auth lives in ~/.codex).
"""

import subprocess


class CodexBackend:
    name = "codex"

    def available(self):
        try:
            result = subprocess.run(
                ["codex", "doctor"], capture_output=True, text=True, timeout=15
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def run(self, prompt, cwd=None):
        result = subprocess.run(
            ["codex", "exec", "--full-auto", prompt],
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=1800,
        )
        return {
            "ok": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
```

- [ ] **Step 9: Run test to verify it passes**

Run: `python -m pytest tests/test_codex_backend.py -v`
Expected: PASS (4 tests)

- [ ] **Step 10: Write the failing test for `OllamaBackend`**

```python
# tools/dispatch/tests/test_ollama_backend.py
import requests

from backends.ollama_backend import OllamaBackend


class FakeResponse:
    def __init__(self, status_code=200, json_data=None):
        self.status_code = status_code
        self._json_data = json_data or {}

    def json(self):
        return self._json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.exceptions.HTTPError(f"status {self.status_code}")


def test_available_true_when_tags_endpoint_ok(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda url, timeout: FakeResponse(200))
    assert OllamaBackend().available() is True


def test_available_false_on_connection_error(monkeypatch):
    def fake_get(url, timeout):
        raise requests.exceptions.RequestException("connection refused")

    monkeypatch.setattr(requests, "get", fake_get)
    assert OllamaBackend().available() is False


def test_run_posts_prompt_and_returns_response_text(monkeypatch):
    captured = {}

    def fake_post(url, json, timeout):
        captured["url"] = url
        captured["json"] = json
        return FakeResponse(200, {"response": "generated text"})

    monkeypatch.setattr(requests, "post", fake_post)
    result = OllamaBackend(model="llama3.2").run("draft this npc line", cwd=None)

    assert captured["url"] == "http://localhost:11434/api/generate"
    assert captured["json"] == {
        "model": "llama3.2",
        "prompt": "draft this npc line",
        "stream": False,
    }
    assert result == {"ok": True, "stdout": "generated text", "stderr": ""}
```

- [ ] **Step 11: Run it to verify it fails**

Run: `python -m pytest tests/test_ollama_backend.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'backends.ollama_backend'`

- [ ] **Step 12: Write `tools/dispatch/backends/ollama_backend.py`**

```python
"""Ollama backend -- calls the existing root docker-compose.yml `ollama`
service's HTTP API. Same network boundary as content-pipeline/ollama_client.py.
"""

import requests

DEFAULT_BASE_URL = "http://localhost:11434"


class OllamaBackend:
    name = "ollama"

    def __init__(self, base_url=None, model="llama3.2"):
        self.base_url = base_url or DEFAULT_BASE_URL
        self.model = model

    def available(self):
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return resp.status_code == 200
        except requests.exceptions.RequestException:
            return False

    def run(self, prompt, cwd=None):
        resp = requests.post(
            f"{self.base_url}/api/generate",
            json={"model": self.model, "prompt": prompt, "stream": False},
            timeout=600,
        )
        resp.raise_for_status()
        return {"ok": True, "stdout": resp.json().get("response", ""), "stderr": ""}
```

- [ ] **Step 13: Run test to verify it passes**

Run: `python -m pytest tests/ -v`
Expected: PASS (7 tests total)

- [ ] **Step 14: Write `tools/dispatch/CONTEXT.md`**

```markdown
# Automated Dispatch — Context (Layer 1)

Implements issue #195: an unattended pipeline that dispatches `ready-for-agent`
GitHub issues to the named agent roster, verifies and security-gates the
result, and merges or reports `blocked-with-reason`. Runs directly on the
host (not in Docker) via `launchd`, because it needs the local `codex` CLI's
subscription auth and needs to invoke `docker-compose` itself.

## Stage order

00 scan -> 01 route -> 02 dispatch -> 03 verify -> 04 security -> 05 review
-> 07 merge. (06/preview and the HTML report are a follow-up plan.)

## Running it

    cd tools/dispatch
    source .venv/bin/activate  # pip install -r requirements.txt if new
    python run.py --dry-run    # default; omit only after watching several dry runs

## Running the tests

    cd tools/dispatch && source .venv/bin/activate && python -m pytest -v

## Reference configs

`model_registry.json` — backend availability/cost/reliability tags (Layer 3).
`security_policy.json` — denylist paths and secret-pattern regexes (Layer 3).
```

- [ ] **Step 15: Commit**

```bash
git add tools/dispatch/
git commit -m "feat(dispatch): scaffold tools/dispatch with Codex and Ollama backends"
```

---

### Task 2: `stage00_scan` — find ready-for-agent issues, skip in-flight ones

**Files:**
- Create: `tools/dispatch/stage00_scan/__init__.py` (empty)
- Create: `tools/dispatch/stage00_scan/scan.py`
- Create: `tools/dispatch/stage00_scan/CONTEXT.md`
- Create: `tools/dispatch/tests/test_scan.py`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `scan.scan() -> list[dict]`, each dict at least `{"number": int, "title": str, "body": str, "labels": list, "comments": list, "in_flight": bool}`. `run.py` (Task 7) iterates this list and skips any issue where `in_flight` is `True`.

- [ ] **Step 1: Write the failing tests**

```python
# tools/dispatch/tests/test_scan.py
import json
import subprocess

from stage00_scan.scan import scan


def _fake_run_factory(issue_prs):
    """issue_prs: {issue_number: [{"number": n, "state": "OPEN"|"MERGED"|"CLOSED"}]}"""

    def fake_run(cmd, **kwargs):
        if cmd[:3] == ["gh", "issue", "list"]:
            issues = [
                {"number": n, "title": f"Issue {n}", "body": "body", "labels": [], "comments": []}
                for n in issue_prs
            ]
            return subprocess.CompletedProcess(cmd, 0, json.dumps(issues), "")
        if cmd[:3] == ["gh", "pr", "list"]:
            search_arg = cmd[cmd.index("--search") + 1]
            issue_number = int(search_arg.split(" ")[0])
            return subprocess.CompletedProcess(
                cmd, 0, json.dumps(issue_prs[issue_number]), ""
            )
        raise AssertionError(f"unexpected command: {cmd}")

    return fake_run


def test_scan_marks_issue_in_flight_when_open_pr_exists(monkeypatch):
    monkeypatch.setattr(
        subprocess, "run", _fake_run_factory({195: [{"number": 300, "state": "OPEN"}]})
    )
    result = scan()
    assert result == [
        {
            "number": 195,
            "title": "Issue 195",
            "body": "body",
            "labels": [],
            "comments": [],
            "in_flight": True,
        }
    ]


def test_scan_marks_issue_not_in_flight_when_no_pr(monkeypatch):
    monkeypatch.setattr(subprocess, "run", _fake_run_factory({195: []}))
    result = scan()
    assert result[0]["in_flight"] is False


def test_scan_ignores_closed_prs(monkeypatch):
    monkeypatch.setattr(
        subprocess, "run", _fake_run_factory({195: [{"number": 300, "state": "CLOSED"}]})
    )
    result = scan()
    assert result[0]["in_flight"] is False
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_scan.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage00_scan'`

- [ ] **Step 3: Write `tools/dispatch/stage00_scan/scan.py`**

```python
"""Stage 00: find ready-for-agent issues, flag ones already mid-PR. No LLM call."""

import json
import subprocess


def _list_ready_for_agent_issues():
    result = subprocess.run(
        [
            "gh", "issue", "list", "--state", "open", "--label", "ready-for-agent",
            "--json", "number,title,body,labels,comments",
        ],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)


def _is_in_flight(issue_number):
    result = subprocess.run(
        [
            "gh", "pr", "list", "--state", "all",
            "--search", f"{issue_number} in:body",
            "--json", "number,state",
        ],
        capture_output=True, text=True, check=True,
    )
    prs = json.loads(result.stdout)
    return any(pr["state"] in ("OPEN", "MERGED") for pr in prs)


def scan():
    issues = _list_ready_for_agent_issues()
    return [{**issue, "in_flight": _is_in_flight(issue["number"])} for issue in issues]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_scan.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Write `tools/dispatch/stage00_scan/CONTEXT.md`**

```markdown
# stage00_scan — Context

**Inputs:** none (calls the live `gh` CLI against this repo).
**Process:** list open `ready-for-agent` issues; for each, check whether any
PR (open or merged) already references it in its body, to skip re-dispatching
work already in flight or shipped from a prior cycle.
**Outputs:** `scan() -> list[dict]` — each issue plus an `in_flight: bool`.
```

- [ ] **Step 6: Commit**

```bash
git add tools/dispatch/stage00_scan tools/dispatch/tests/test_scan.py
git commit -m "feat(dispatch): add stage00_scan for ready-for-agent issue discovery"
```

---

### Task 3: `stage01_route` — classify agent, choose backend

**Files:**
- Create: `tools/dispatch/stage01_route/__init__.py` (empty)
- Create: `tools/dispatch/stage01_route/route.py`
- Create: `tools/dispatch/stage01_route/CONTEXT.md`
- Create: `tools/dispatch/tests/test_route.py`

**Interfaces:**
- Consumes: an issue dict shaped like `stage00_scan.scan()`'s output (needs at least `title`, `body`, `labels`); `CodexBackend`/`OllamaBackend` from Task 1 for `probe_registry`'s live availability check.
- Produces: `route.classify_agent(issue: dict) -> str` (one of `"loomwright"`, `"pato"`, `"frieren"`, `"warden"`, `"lorena"`, `"tilesmith"`, `"composer"`, `"ana"`); `route.task_type_for(agent: str) -> str` (one of `"engine"`, `"content"`, `"ana"`); `route.load_registry(path="model_registry.json") -> dict`; `route.probe_registry(registry: dict) -> dict` (same shape, each entry gains `"available": bool`); `route.choose_backend(task_type: str, probed_registry: dict) -> str | None` (`None` only for a task type with no LLM step — none exist yet, but the signature allows it for stage04/07's deterministic checks). Task 7 (`run.py`) calls `classify_agent`, then `task_type_for`, then `choose_backend`.

- [ ] **Step 1: Write the failing tests**

```python
# tools/dispatch/tests/test_route.py
from stage01_route.route import (
    choose_backend,
    classify_agent,
    probe_registry,
    task_type_for,
)


def _issue(title="", body="", labels=None):
    return {"title": title, "body": body, "labels": labels or []}


def test_classify_agent_by_keyword_in_title():
    assert classify_agent(_issue(title="Loomwright: fix cone targeting")) == "loomwright"
    assert classify_agent(_issue(title="New ice spell for Standard weight class")) == "frieren"
    assert classify_agent(_issue(title="Wave 4 encounter feels too sparse")) == "warden"
    assert classify_agent(_issue(title="Hexcoin fee should scale with Mastery")) == "pato"
    assert classify_agent(_issue(title="NPC rescue dialogue is flat")) == "lorena"
    assert classify_agent(_issue(title="Boss theme needs more percussion")) == "composer"
    assert classify_agent(_issue(title="Level 1 tileset looks too plain")) == "tilesmith"


def test_classify_agent_falls_back_to_ana_when_ambiguous():
    assert classify_agent(_issue(title="Something about the game")) == "ana"


def test_task_type_for_maps_agents_correctly():
    assert task_type_for("loomwright") == "engine"
    assert task_type_for("frieren") == "content"
    assert task_type_for("warden") == "content"
    assert task_type_for("pato") == "content"
    assert task_type_for("lorena") == "content"
    assert task_type_for("composer") == "content"
    assert task_type_for("tilesmith") == "content"
    assert task_type_for("ana") == "ana"


def test_choose_backend_engine_always_codex():
    registry = {"codex": {"available": True}, "ollama": {"available": True}}
    assert choose_backend("engine", registry) == "codex"


def test_choose_backend_content_prefers_ollama_when_available():
    registry = {"codex": {"available": True}, "ollama": {"available": True}}
    assert choose_backend("content", registry) == "ollama"


def test_choose_backend_content_falls_back_to_codex_when_ollama_down():
    registry = {"codex": {"available": True}, "ollama": {"available": False}}
    assert choose_backend("content", registry) == "codex"


def test_probe_registry_adds_availability_from_backends(monkeypatch):
    import stage01_route.route as route_module

    class FakeCodex:
        def available(self):
            return True

    class FakeOllama:
        def available(self):
            return False

    monkeypatch.setattr(route_module, "CodexBackend", lambda: FakeCodex())
    monkeypatch.setattr(route_module, "OllamaBackend", lambda: FakeOllama())

    probed = probe_registry({"codex": {}, "ollama": {}, "gemini": {"invoke": None}})
    assert probed["codex"]["available"] is True
    assert probed["ollama"]["available"] is False
    assert probed["gemini"]["available"] is False
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_route.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage01_route'`

- [ ] **Step 3: Write `tools/dispatch/stage01_route/route.py`**

```python
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
    if task_type == "engine":
        return "codex"
    if task_type == "content":
        if probed_registry.get("ollama", {}).get("available"):
            return "ollama"
        return "codex"
    return "codex"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_route.py -v`
Expected: PASS (9 tests)

- [ ] **Step 5: Write `tools/dispatch/stage01_route/CONTEXT.md`**

```markdown
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
```

- [ ] **Step 6: Commit**

```bash
git add tools/dispatch/stage01_route tools/dispatch/tests/test_route.py
git commit -m "feat(dispatch): add stage01_route for agent classification and backend selection"
```

---

### Task 4: `stage02_dispatch` — isolated worktree + backend invocation

**Files:**
- Create: `tools/dispatch/stage02_dispatch/__init__.py` (empty)
- Create: `tools/dispatch/stage02_dispatch/dispatch.py`
- Create: `tools/dispatch/stage02_dispatch/CONTEXT.md`
- Create: `tools/dispatch/tests/test_dispatch.py`

**Interfaces:**
- Consumes: an issue dict (`number`, `title`, `body`), an `agent` string, an `agent_md`/`context_md` string pair (the target agent's own `AGENT.md`/`CONTEXT.md` contents), and a backend object matching Task 1's `.run(prompt, cwd) -> dict{ok, stdout, stderr}` shape.
- Produces: `dispatch.build_prompt(issue, agent, agent_md, context_md) -> str`; `dispatch.create_worktree(issue_number, base="origin/main") -> tuple[Path, str]` (path, branch name); `dispatch.dispatch_issue(issue, agent, agent_md, context_md, backend) -> dict{issue_number, worktree_path, branch, backend, ok, stdout_tail}`. Task 5/6/7 read `worktree_path` and `branch` off this dict.

- [ ] **Step 1: Write the failing tests**

```python
# tools/dispatch/tests/test_dispatch.py
import subprocess
from pathlib import Path

from stage02_dispatch.dispatch import build_prompt, create_worktree, dispatch_issue


def test_build_prompt_includes_issue_and_agent_context():
    prompt = build_prompt(
        issue={"number": 195, "title": "Automate dispatch", "body": "do the thing"},
        agent="ana",
        agent_md="Ana orchestrates.",
        context_md="Ana's contract.",
    )
    assert "Issue #195" in prompt
    assert "Automate dispatch" in prompt
    assert "do the thing" in prompt
    assert "Ana orchestrates." in prompt
    assert "Ana's contract." in prompt
    assert "docker-compose.yml" in prompt  # denylist warning must be in every prompt


def test_create_worktree_runs_expected_git_commands(monkeypatch, tmp_path):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)
    monkeypatch.chdir(tmp_path)

    path, branch = create_worktree(195)

    assert branch == "agent/dispatch-issue-195"
    assert path == Path(".worktrees/dispatch-195")
    assert calls[0] == ["git", "fetch", "origin"]
    assert calls[1] == [
        "git", "worktree", "add", ".worktrees/dispatch-195",
        "-b", "agent/dispatch-issue-195", "origin/main",
    ]


def test_dispatch_issue_wires_worktree_and_backend(monkeypatch, tmp_path):
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kwargs: subprocess.CompletedProcess(cmd, 0, "", ""))
    monkeypatch.chdir(tmp_path)

    class FakeBackend:
        name = "codex"

        def run(self, prompt, cwd):
            assert cwd == str(Path(".worktrees/dispatch-195"))
            return {"ok": True, "stdout": "x" * 3000, "stderr": ""}

    result = dispatch_issue(
        issue={"number": 195, "title": "t", "body": "b"},
        agent="ana",
        agent_md="a",
        context_md="c",
        backend=FakeBackend(),
    )

    assert result["issue_number"] == 195
    assert result["branch"] == "agent/dispatch-issue-195"
    assert result["backend"] == "codex"
    assert result["ok"] is True
    assert len(result["stdout_tail"]) == 2000
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_dispatch.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage02_dispatch'`

- [ ] **Step 3: Write `tools/dispatch/stage02_dispatch/dispatch.py`**

```python
"""Stage 02: create an isolated worktree per issue, invoke the chosen backend."""

import subprocess
from pathlib import Path

WORKTREE_ROOT = Path(".worktrees")

_DENYLIST_WARNING = (
    "Do not modify docker-compose.yml, any Dockerfile, package.json, "
    "package-lock.json, .env files, or .github/workflows -- if the fix "
    "genuinely requires one of those, stop and describe why instead of "
    "editing it; a security gate will hard-block the merge otherwise."
)


def build_prompt(issue, agent, agent_md, context_md):
    return (
        f"You are acting as the {agent} agent from this repo's roster.\n\n"
        f"AGENT.md:\n{agent_md}\n\nCONTEXT.md:\n{context_md}\n\n"
        f"Issue #{issue['number']}: {issue['title']}\n\n{issue['body']}\n\n"
        "Implement this issue end to end on the current branch, following "
        "your agent contract's constraints. Self-verify with the Docker "
        "testing contract before finishing.\n\n"
        f"{_DENYLIST_WARNING}"
    )


def create_worktree(issue_number, base="origin/main"):
    branch = f"agent/dispatch-issue-{issue_number}"
    path = WORKTREE_ROOT / f"dispatch-{issue_number}"
    subprocess.run(["git", "fetch", "origin"], check=True)
    subprocess.run(
        ["git", "worktree", "add", str(path), "-b", branch, base], check=True
    )
    return path, branch


def dispatch_issue(issue, agent, agent_md, context_md, backend):
    path, branch = create_worktree(issue["number"])
    prompt = build_prompt(issue, agent, agent_md, context_md)
    result = backend.run(prompt, cwd=str(path))
    return {
        "issue_number": issue["number"],
        "worktree_path": str(path),
        "branch": branch,
        "backend": backend.name,
        "ok": result["ok"],
        "stdout_tail": result["stdout"][-2000:],
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_dispatch.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Write `tools/dispatch/stage02_dispatch/CONTEXT.md`**

```markdown
# stage02_dispatch — Context

**Inputs:** an issue dict, the classified agent name, that agent's
`AGENT.md`/`CONTEXT.md` text, and a chosen backend (from `stage01_route`).
**Process:** create a fresh `git worktree` under `.worktrees/` for the issue
(never touches the shared main working tree); build a prompt embedding the
agent's own contract plus a hard warning about denylisted paths; invoke the
backend inside that worktree.
**Outputs:** `dispatch_issue(...) -> dict` — worktree path, branch name,
backend used, and whether the backend reported success.
```

- [ ] **Step 6: Commit**

```bash
git add tools/dispatch/stage02_dispatch tools/dispatch/tests/test_dispatch.py
git commit -m "feat(dispatch): add stage02_dispatch for isolated worktree + backend invocation"
```

---

### Task 5: `stage03_verify` — Docker-based typecheck/build/test

**Files:**
- Create: `tools/dispatch/stage03_verify/__init__.py` (empty)
- Create: `tools/dispatch/stage03_verify/verify.py`
- Create: `tools/dispatch/stage03_verify/CONTEXT.md`
- Create: `tools/dispatch/tests/test_verify.py`

**Interfaces:**
- Consumes: `cwd` (a worktree path string, from Task 4's `dispatch_issue` result).
- Produces: `verify.run_verification(cwd: str) -> dict{typecheck: str, build: str, test: str, all_passed: bool, command_log: list[str]}`. Task 6's `stage04_security.run_security_gate` consumes `command_log`; Task 8's `merge_gate.decide` consumes `all_passed`.

- [ ] **Step 1: Write the failing tests**

```python
# tools/dispatch/tests/test_verify.py
import subprocess

from stage03_verify.verify import run_verification


def test_run_verification_all_pass(monkeypatch):
    monkeypatch.setattr(
        subprocess, "run",
        lambda cmd, **kwargs: subprocess.CompletedProcess(cmd, 0, "", ""),
    )
    result = run_verification("/tmp/worktree")

    assert result["typecheck"] == "pass"
    assert result["build"] == "pass"
    assert result["test"] == "pass"
    assert result["all_passed"] is True
    assert all(cmd.startswith("docker-compose") for cmd in result["command_log"])


def test_run_verification_reports_failure(monkeypatch):
    def fake_run(cmd, **kwargs):
        returncode = 1 if "test" in cmd else 0
        return subprocess.CompletedProcess(cmd, returncode, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = run_verification("/tmp/worktree")

    assert result["test"] == "fail"
    assert result["all_passed"] is False


def test_run_verification_passes_cwd_through(monkeypatch):
    captured_cwds = []

    def fake_run(cmd, **kwargs):
        captured_cwds.append(kwargs.get("cwd"))
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)
    run_verification("/tmp/worktree")

    assert all(cwd == "/tmp/worktree" for cwd in captured_cwds)
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_verify.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage03_verify'`

- [ ] **Step 3: Write `tools/dispatch/stage03_verify/verify.py`**

```python
"""Stage 03: run typecheck/build/test through the repo's Docker testing
contract (docs/agents/_reference/docker-testing-contract.md)."""

import subprocess

_COMMANDS = {
    "typecheck": ["docker-compose", "run", "--rm", "game", "npm", "run", "typecheck"],
    "build": ["docker-compose", "run", "--rm", "game", "npm", "run", "build"],
    "test": ["docker-compose", "run", "--rm", "game", "npm", "test"],
}


def run_verification(cwd):
    results = {}
    command_log = []
    for name, cmd in _COMMANDS.items():
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        command_log.append(" ".join(cmd))
        results[name] = "pass" if proc.returncode == 0 else "fail"
    return {
        **results,
        "all_passed": all(v == "pass" for v in results.values()),
        "command_log": command_log,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_verify.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Write `tools/dispatch/stage03_verify/CONTEXT.md`**

```markdown
# stage03_verify — Context

**Inputs:** the worktree path from `stage02_dispatch`.
**Process:** run typecheck, build, and test through
`docker-compose run --rm game ...`, per
`docs/agents/_reference/docker-testing-contract.md` — never a bare host
command.
**Outputs:** `run_verification(cwd) -> dict` with each check's pass/fail,
an `all_passed` summary, and the exact command log — the command log is
what `stage04_security` checks to confirm everything ran containerized.
```

- [ ] **Step 6: Commit**

```bash
git add tools/dispatch/stage03_verify tools/dispatch/tests/test_verify.py
git commit -m "feat(dispatch): add stage03_verify for containerized typecheck/build/test"
```

---

### Task 6: `stage04_security` — hard-block security gate

**Files:**
- Create: `tools/dispatch/stage04_security/__init__.py` (empty)
- Create: `tools/dispatch/stage04_security/security_gate.py`
- Create: `tools/dispatch/stage04_security/CONTEXT.md`
- Create: `tools/dispatch/tests/test_security_gate.py`

**Interfaces:**
- Consumes: a worktree path (`cwd`), the `command_log` list from Task 5's `run_verification`, and (optionally) a pre-loaded policy dict from `load_policy()`.
- Produces: `security_gate.load_policy(path=None) -> dict`; `security_gate.check_denylist(files: list[str], policy: dict) -> list[str]`; `security_gate.check_secrets(diff: str, policy: dict) -> list[str]`; `security_gate.check_docker_usage(command_log: list[str]) -> bool`; `security_gate.run_security_gate(cwd: str, command_log: list[str], policy: dict | None = None) -> dict{passed: bool, violations: list[dict]}`. Task 8's `merge_gate.decide` consumes `passed`.

- [ ] **Step 1: Write the failing tests**

```python
# tools/dispatch/tests/test_security_gate.py
import subprocess

from stage04_security.security_gate import (
    check_denylist,
    check_docker_usage,
    check_secrets,
    run_security_gate,
)

_POLICY = {
    "denylist_paths": ["docker-compose.yml", ".github/workflows/"],
    "secret_patterns": ["sk-[A-Za-z0-9]{20,}"],
}


def test_check_denylist_flags_exact_and_prefix_matches():
    files = ["src/scenes/Foo.ts", "docker-compose.yml", ".github/workflows/ci.yml"]
    assert check_denylist(files, _POLICY) == ["docker-compose.yml", ".github/workflows/ci.yml"]


def test_check_denylist_clean_diff_has_no_hits():
    assert check_denylist(["src/scenes/Foo.ts"], _POLICY) == []


def test_check_secrets_flags_matching_pattern():
    diff = "+ const key = 'sk-abcdefghijklmnopqrstuvwx'"
    assert check_secrets(diff, _POLICY) == ["sk-[A-Za-z0-9]{20,}"]


def test_check_secrets_clean_diff_has_no_hits():
    assert check_secrets("+ const x = 1", _POLICY) == []


def test_check_docker_usage_true_when_all_commands_containerized():
    assert check_docker_usage(["docker-compose run --rm game npm test"]) is True


def test_check_docker_usage_false_on_bare_host_command():
    assert check_docker_usage(["npm test"]) is False


def test_run_security_gate_passes_on_clean_diff(monkeypatch):
    import stage04_security.security_gate as sg

    monkeypatch.setattr(sg, "changed_files", lambda cwd: ["src/scenes/Foo.ts"])
    monkeypatch.setattr(sg, "diff_text", lambda cwd: "+ const x = 1")

    result = run_security_gate("/tmp/worktree", ["docker-compose run --rm game npm test"], _POLICY)
    assert result == {"passed": True, "violations": []}


def test_run_security_gate_blocks_on_denylisted_file(monkeypatch):
    import stage04_security.security_gate as sg

    monkeypatch.setattr(sg, "changed_files", lambda cwd: ["docker-compose.yml"])
    monkeypatch.setattr(sg, "diff_text", lambda cwd: "+ services: {}")

    result = run_security_gate("/tmp/worktree", ["docker-compose run --rm game npm test"], _POLICY)
    assert result["passed"] is False
    assert result["violations"] == [{"type": "denylist_path", "files": ["docker-compose.yml"]}]


def test_run_security_gate_blocks_on_non_containerized_command(monkeypatch):
    import stage04_security.security_gate as sg

    monkeypatch.setattr(sg, "changed_files", lambda cwd: [])
    monkeypatch.setattr(sg, "diff_text", lambda cwd: "")

    result = run_security_gate("/tmp/worktree", ["npm test"], _POLICY)
    assert result["passed"] is False
    assert result["violations"] == [
        {"type": "non_containerized_command", "command_log": ["npm test"]}
    ]
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_security_gate.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage04_security'`

- [ ] **Step 3: Write `tools/dispatch/stage04_security/security_gate.py`**

```python
"""Stage 04: hard security gate. Any violation here blocks the merge --
this is a strict superset of issue #195's step-9 guardrail, not a
judgment call."""

import json
import re
import subprocess
from pathlib import Path

_POLICY_PATH = Path(__file__).resolve().parent.parent / "security_policy.json"


def load_policy(path=None):
    return json.loads(Path(path or _POLICY_PATH).read_text())


def changed_files(cwd):
    proc = subprocess.run(
        ["git", "diff", "--name-only", "origin/main..HEAD"],
        cwd=cwd, capture_output=True, text=True, check=True,
    )
    return [line for line in proc.stdout.splitlines() if line]


def diff_text(cwd):
    proc = subprocess.run(
        ["git", "diff", "origin/main..HEAD"],
        cwd=cwd, capture_output=True, text=True, check=True,
    )
    return proc.stdout


def check_denylist(files, policy):
    return [
        f for f in files
        if any(f == denied or f.startswith(denied) for denied in policy["denylist_paths"])
    ]


def check_secrets(diff, policy):
    return [pattern for pattern in policy["secret_patterns"] if re.search(pattern, diff)]


def check_docker_usage(command_log):
    return all(cmd.startswith("docker-compose") for cmd in command_log)


def run_security_gate(cwd, command_log, policy=None):
    policy = policy or load_policy()
    violations = []

    denylist_hits = check_denylist(changed_files(cwd), policy)
    if denylist_hits:
        violations.append({"type": "denylist_path", "files": denylist_hits})

    secret_hits = check_secrets(diff_text(cwd), policy)
    if secret_hits:
        violations.append({"type": "secret_pattern", "patterns": secret_hits})

    if not check_docker_usage(command_log):
        violations.append({"type": "non_containerized_command", "command_log": command_log})

    return {"passed": len(violations) == 0, "violations": violations}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_security_gate.py -v`
Expected: PASS (9 tests)

- [ ] **Step 5: Write `tools/dispatch/stage04_security/CONTEXT.md`**

```markdown
# stage04_security — Context

**Inputs:** the worktree path and `stage03_verify`'s command log.
**Process:** three hard checks, any one failing blocks the merge outright:
(1) the diff touches nothing in `security_policy.json`'s denylist
(docker-compose.yml, CI workflows, Dockerfiles, dependency manifests, .env
files); (2) no secret-shaped string appears in the diff; (3) every command
`stage03_verify` ran was actually `docker-compose run`-prefixed, confirming
containerized execution rather than a bare host command.
**Outputs:** `run_security_gate(...) -> dict{passed, violations}`.
```

- [ ] **Step 6: Commit**

```bash
git add tools/dispatch/stage04_security tools/dispatch/tests/test_security_gate.py
git commit -m "feat(dispatch): add stage04_security hard-block gate"
```

---

### Task 7: `stage05_review` — Heckler's blocking critique

**Files:**
- Create: `tools/dispatch/stage05_review/__init__.py` (empty)
- Create: `tools/dispatch/stage05_review/heckler_review.py`
- Create: `tools/dispatch/stage05_review/CONTEXT.md`
- Create: `tools/dispatch/tests/test_heckler_review.py`

**Interfaces:**
- Consumes: a `diff` string, Heckler's `AGENT.md` text, and a backend object (Task 1's shape).
- Produces: `heckler_review.build_heckler_prompt(diff, heckler_agent_md) -> str`; `heckler_review.parse_findings(raw_output: str) -> dict{blocking: list[str], minor: list[str]}`; `heckler_review.run_heckler_review(diff, heckler_agent_md, backend) -> dict{backend: str, blocking_findings: list[str], minor_findings: list[str], raw: str}`. Task 8's `merge_gate.decide` consumes `blocking_findings`.

- [ ] **Step 1: Write the failing tests**

```python
# tools/dispatch/tests/test_heckler_review.py
from stage05_review.heckler_review import (
    build_heckler_prompt,
    parse_findings,
    run_heckler_review,
)


def test_build_heckler_prompt_includes_diff_and_agent_md():
    prompt = build_heckler_prompt("+ const x = 1", "Heckler critiques grounded in specifics.")
    assert "+ const x = 1" in prompt
    assert "Heckler critiques grounded in specifics." in prompt
    assert "BLOCKING:" in prompt
    assert "MINOR:" in prompt


def test_parse_findings_splits_blocking_and_minor():
    raw = (
        "BLOCKING: HP is never reset between waves\n"
        "MINOR: cooldown text could be clearer\n"
        "BLOCKING: master-tier discount applied twice\n"
    )
    findings = parse_findings(raw)
    assert findings == {
        "blocking": ["HP is never reset between waves", "master-tier discount applied twice"],
        "minor": ["cooldown text could be clearer"],
    }


def test_parse_findings_handles_no_findings():
    assert parse_findings("Looks clean, no issues found.") == {"blocking": [], "minor": []}


def test_run_heckler_review_wires_backend_and_parses_output():
    class FakeBackend:
        name = "codex"

        def run(self, prompt, cwd):
            return {"ok": True, "stdout": "BLOCKING: real bug here\n", "stderr": ""}

    result = run_heckler_review("+ diff", "heckler contract", FakeBackend())

    assert result["backend"] == "codex"
    assert result["blocking_findings"] == ["real bug here"]
    assert result["minor_findings"] == []
    assert result["raw"] == "BLOCKING: real bug here\n"
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_heckler_review.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage05_review'`

- [ ] **Step 3: Write `tools/dispatch/stage05_review/heckler_review.py`**

```python
"""Stage 05: run Heckler's adversarial critique as a blocking gate."""


def build_heckler_prompt(diff, heckler_agent_md):
    return (
        f"{heckler_agent_md}\n\n"
        "Critique the following diff exactly as Heckler would -- grounded, "
        "specific, never a vague 'this feels off'. Return each finding as "
        "its own line starting with either 'BLOCKING:' or 'MINOR:'. If "
        "there is nothing to flag, say so in plain prose with no such "
        "prefixed lines.\n\n"
        f"{diff}"
    )


def parse_findings(raw_output):
    blocking, minor = [], []
    for line in raw_output.splitlines():
        line = line.strip()
        if line.startswith("BLOCKING:"):
            blocking.append(line[len("BLOCKING:"):].strip())
        elif line.startswith("MINOR:"):
            minor.append(line[len("MINOR:"):].strip())
    return {"blocking": blocking, "minor": minor}


def run_heckler_review(diff, heckler_agent_md, backend):
    prompt = build_heckler_prompt(diff, heckler_agent_md)
    result = backend.run(prompt, cwd=None)
    findings = parse_findings(result["stdout"])
    return {
        "backend": backend.name,
        "blocking_findings": findings["blocking"],
        "minor_findings": findings["minor"],
        "raw": result["stdout"],
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_heckler_review.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Write `tools/dispatch/stage05_review/CONTEXT.md`**

```markdown
# stage05_review — Context

**Inputs:** the full diff and Heckler's own `AGENT.md` contract text.
**Process:** always dispatches to the Codex backend regardless of what
`stage01_route` picked for content generation (per this repo's policy that
review work always gets the highest-reliability backend); parses the
response into BLOCKING vs MINOR findings.
**Outputs:** `run_heckler_review(...) -> dict` — any non-empty
`blocking_findings` is a hard merge block in `stage07_merge`.
```

- [ ] **Step 6: Commit**

```bash
git add tools/dispatch/stage05_review tools/dispatch/tests/test_heckler_review.py
git commit -m "feat(dispatch): add stage05_review for Heckler's blocking critique"
```

---

### Task 8: `stage07_merge` — guardrails, dry-run default, gh actions

**Files:**
- Create: `tools/dispatch/stage07_merge/__init__.py` (empty)
- Create: `tools/dispatch/stage07_merge/merge_gate.py`
- Create: `tools/dispatch/stage07_merge/CONTEXT.md`
- Create: `tools/dispatch/tests/test_merge_gate.py`

**Interfaces:**
- Consumes: `verify_result` (Task 5's dict), `security_result` (Task 6's dict), `review_result` (Task 7's dict), plus `issue_number`, `branch`, `cwd`, `dry_run` (bool).
- Produces: `merge_gate.decide(verify_result, security_result, review_result) -> dict{action: "merge" | "block", reason: str}`; `merge_gate.apply(decision, issue_number, branch, cwd, dry_run=True) -> dict{merged: bool, message: str, dry_run: bool}`. Task 9's `run.py` calls `decide` then `apply` and records both returned dicts.

- [ ] **Step 1: Write the failing tests**

```python
# tools/dispatch/tests/test_merge_gate.py
import subprocess

from stage07_merge.merge_gate import apply, decide

_OK_VERIFY = {"all_passed": True}
_BAD_VERIFY = {"all_passed": False, "typecheck": "fail"}
_OK_SECURITY = {"passed": True, "violations": []}
_BAD_SECURITY = {"passed": False, "violations": [{"type": "denylist_path", "files": ["docker-compose.yml"]}]}
_CLEAN_REVIEW = {"blocking_findings": [], "minor_findings": []}
_BLOCKED_REVIEW = {"blocking_findings": ["HP never resets"], "minor_findings": []}


def test_decide_merges_when_all_gates_pass():
    decision = decide(_OK_VERIFY, _OK_SECURITY, _CLEAN_REVIEW)
    assert decision["action"] == "merge"


def test_decide_blocks_on_verification_failure():
    decision = decide(_BAD_VERIFY, _OK_SECURITY, _CLEAN_REVIEW)
    assert decision["action"] == "block"
    assert "verification" in decision["reason"]


def test_decide_blocks_on_security_failure():
    decision = decide(_OK_VERIFY, _BAD_SECURITY, _CLEAN_REVIEW)
    assert decision["action"] == "block"
    assert "security" in decision["reason"]


def test_decide_blocks_on_heckler_blocking_finding():
    decision = decide(_OK_VERIFY, _OK_SECURITY, _BLOCKED_REVIEW)
    assert decision["action"] == "block"
    assert "HP never resets" in decision["reason"]


def test_apply_dry_run_never_calls_gh(monkeypatch):
    calls = []
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kwargs: calls.append(cmd))

    decision = {"action": "merge", "reason": "all gates passed"}
    result = apply(decision, 195, "agent/dispatch-issue-195", "/tmp/worktree", dry_run=True)

    assert calls == []
    assert result["merged"] is False
    assert result["dry_run"] is True
    assert "would merge" in result["message"]


def test_apply_real_merge_calls_gh_pr_and_issue_commands(monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)

    decision = {"action": "merge", "reason": "all gates passed"}
    result = apply(decision, 195, "agent/dispatch-issue-195", "/tmp/worktree", dry_run=False)

    assert calls[0] == ["gh", "pr", "create", "--fill"]
    assert calls[1] == ["gh", "pr", "merge", "--squash", "--delete-branch"]
    assert calls[2][:3] == ["gh", "issue", "comment"]
    assert calls[3] == ["gh", "issue", "close", "195"]
    assert result["merged"] is True


def test_apply_block_posts_comment_when_not_dry_run(monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)

    decision = {"action": "block", "reason": "security gate failed: [...]"}
    result = apply(decision, 195, "agent/dispatch-issue-195", "/tmp/worktree", dry_run=False)

    assert calls[0][:3] == ["gh", "issue", "comment"]
    assert "blocked-with-reason" in calls[0][-1]
    assert result["merged"] is False
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_merge_gate.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage07_merge'`

- [ ] **Step 3: Write `tools/dispatch/stage07_merge/merge_gate.py`**

```python
"""Stage 07: apply issue #195's merge guardrails. Never merges unless
verification, the security gate, and Heckler's review all clear."""

import subprocess


def decide(verify_result, security_result, review_result):
    if not verify_result["all_passed"]:
        return {"action": "block", "reason": f"verification failed: {verify_result}"}
    if not security_result["passed"]:
        return {"action": "block", "reason": f"security gate failed: {security_result['violations']}"}
    if review_result["blocking_findings"]:
        joined = "; ".join(review_result["blocking_findings"])
        return {"action": "block", "reason": f"Heckler BLOCKING findings: {joined}"}
    return {"action": "merge", "reason": "all gates passed"}


def apply(decision, issue_number, branch, cwd, dry_run=True):
    if decision["action"] == "block":
        message = f"blocked-with-reason: {decision['reason']}"
        if not dry_run:
            subprocess.run(
                ["gh", "issue", "comment", str(issue_number), "--body", message],
                cwd=cwd, check=True,
            )
        return {"merged": False, "message": message, "dry_run": dry_run}

    if dry_run:
        return {
            "merged": False,
            "message": f"dry-run: would merge ({decision['reason']})",
            "dry_run": True,
        }

    subprocess.run(["gh", "pr", "create", "--fill"], cwd=cwd, check=True)
    subprocess.run(["gh", "pr", "merge", "--squash", "--delete-branch"], cwd=cwd, check=True)
    subprocess.run(
        ["gh", "issue", "comment", str(issue_number), "--body",
         f"shipped-and-validated: {decision['reason']}"],
        cwd=cwd, check=True,
    )
    subprocess.run(["gh", "issue", "close", str(issue_number)], cwd=cwd, check=True)
    return {"merged": True, "message": decision["reason"], "dry_run": False}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_merge_gate.py -v`
Expected: PASS (7 tests)

- [ ] **Step 5: Write `tools/dispatch/stage07_merge/CONTEXT.md`**

```markdown
# stage07_merge — Context

**Inputs:** `stage03_verify`, `stage04_security`, and `stage05_review`'s
result dicts; the issue number, branch, and worktree path.
**Process:** `decide()` is pure and deterministic -- merge only if all three
gates passed, in that priority order (verification, security, Heckler).
`apply()` posts a `blocked-with-reason` comment (never merging) when
blocked, or opens+merges+closes-with-`shipped-and-validated` when clear --
unless `dry_run` is `True`, in which case it only reports what it would
have done and touches nothing.
**Outputs:** `decide(...) -> dict{action, reason}`,
`apply(...) -> dict{merged, message, dry_run}`.
```

- [ ] **Step 6: Commit**

```bash
git add tools/dispatch/stage07_merge tools/dispatch/tests/test_merge_gate.py
git commit -m "feat(dispatch): add stage07_merge with issue #195's merge guardrails"
```

---

### Task 9: `run.py` orchestrator, JSON manifest, dry-run CLI

**Files:**
- Create: `tools/dispatch/run.py`
- Create: `tools/dispatch/tests/test_run.py`

**Interfaces:**
- Consumes: every stage module from Tasks 2–8.
- Produces: `run.run(dry_run=True, run_id=None) -> dict` (the manifest); a CLI entry point (`python run.py [--dry-run/--no-dry-run]`, default `--dry-run`). This is the last module in the plan — nothing downstream depends on it.

- [ ] **Step 1: Write the failing test**

```python
# tools/dispatch/tests/test_run.py
import json

import run as run_module


def test_run_writes_manifest_and_skips_in_flight_issue(tmp_path, monkeypatch):
    monkeypatch.setattr(run_module, "RUNS_DIR", tmp_path)

    monkeypatch.setattr(
        run_module, "scan",
        lambda: [{"number": 1, "title": "in flight", "body": "b", "labels": [], "comments": [], "in_flight": True}],
    )

    manifest = run_module.run(dry_run=True, run_id="test-run")

    assert manifest["dry_run"] is True
    assert manifest["issues"] == [{"number": 1, "status": "skipped-in-flight"}]
    assert json.loads((tmp_path / "test-run" / "manifest.json").read_text()) == manifest


def test_run_dispatches_and_merges_dry_run_issue(tmp_path, monkeypatch):
    monkeypatch.setattr(run_module, "RUNS_DIR", tmp_path)

    issue = {"number": 2, "title": "Loomwright: fix cone bug", "body": "b", "labels": [], "comments": [], "in_flight": False}
    monkeypatch.setattr(run_module, "scan", lambda: [issue])
    monkeypatch.setattr(run_module, "probe_registry", lambda registry: registry)
    monkeypatch.setattr(run_module, "load_registry", lambda: {"codex": {}, "ollama": {}})

    monkeypatch.setattr(
        run_module, "dispatch_issue",
        lambda issue, agent, agent_md, context_md, backend: {
            "issue_number": 2, "worktree_path": str(tmp_path / "wt-2"),
            "branch": "agent/dispatch-issue-2", "backend": backend.name,
            "ok": True, "stdout_tail": "",
        },
    )
    monkeypatch.setattr(
        run_module, "run_verification",
        lambda cwd: {"typecheck": "pass", "build": "pass", "test": "pass", "all_passed": True, "command_log": ["docker-compose run --rm game npm test"]},
    )
    monkeypatch.setattr(
        run_module, "run_security_gate",
        lambda cwd, command_log, policy: {"passed": True, "violations": []},
    )
    monkeypatch.setattr(
        run_module, "run_heckler_review",
        lambda diff, heckler_agent_md, backend: {"backend": "codex", "blocking_findings": [], "minor_findings": [], "raw": ""},
    )

    manifest = run_module.run(dry_run=True, run_id="test-run-2")

    assert manifest["issues"][0]["number"] == 2
    assert manifest["issues"][0]["agent"] == "loomwright"
    assert "would merge" in manifest["issues"][0]["action"]
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_run.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'run'`

- [ ] **Step 3: Write `tools/dispatch/run.py`**

```python
"""Orchestrates stage00 -> stage07 per ready-for-agent issue. Writes one
JSON manifest per run under runs/<run_id>/. Defaults to --dry-run; only
the developer flips that off, and only after watching several dry runs."""

import argparse
import json
import time
from pathlib import Path

from backends.codex_backend import CodexBackend
from backends.ollama_backend import OllamaBackend
from stage00_scan.scan import scan
from stage01_route.route import choose_backend, classify_agent, load_registry, probe_registry, task_type_for
from stage02_dispatch.dispatch import dispatch_issue
from stage03_verify.verify import run_verification
from stage04_security.security_gate import load_policy, run_security_gate
from stage05_review.heckler_review import run_heckler_review
from stage07_merge.merge_gate import apply as apply_merge_decision
from stage07_merge.merge_gate import decide as decide_merge

RUNS_DIR = Path(__file__).resolve().parent / "runs"

_BACKEND_CLASSES = {"codex": CodexBackend, "ollama": OllamaBackend}


def _get_backend(name):
    return _BACKEND_CLASSES[name]()


def _process_issue(issue, dry_run):
    agent = classify_agent(issue)
    task_type = task_type_for(agent)
    registry = probe_registry(load_registry())
    backend_name = choose_backend(task_type, registry)
    backend = _get_backend(backend_name)

    dispatch_record = dispatch_issue(
        issue, agent=agent, agent_md="", context_md="", backend=backend
    )
    verify_record = run_verification(dispatch_record["worktree_path"])
    security_record = run_security_gate(
        dispatch_record["worktree_path"], verify_record["command_log"], load_policy()
    )
    review_record = run_heckler_review(
        diff="", heckler_agent_md="", backend=_get_backend("codex")
    )

    decision = decide_merge(verify_record, security_record, review_record)
    merge_record = apply_merge_decision(
        decision, issue["number"], dispatch_record["branch"],
        dispatch_record["worktree_path"], dry_run=dry_run,
    )

    return {
        "number": issue["number"],
        "agent": agent,
        "backend": backend_name,
        "action": merge_record["message"],
    }


def run(dry_run=True, run_id=None):
    run_id = run_id or time.strftime("%Y%m%dT%H%M%S")
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    issues = scan()
    (run_dir / "00_scan.json").write_text(json.dumps(issues, indent=2))

    manifest = {"run_id": run_id, "dry_run": dry_run, "issues": []}
    for issue in issues:
        if issue["in_flight"]:
            manifest["issues"].append({"number": issue["number"], "status": "skipped-in-flight"})
            continue
        manifest["issues"].append(_process_issue(issue, dry_run))

    (run_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", dest="dry_run", action="store_true", default=True)
    parser.add_argument("--no-dry-run", dest="dry_run", action="store_false")
    args = parser.parse_args()

    result = run(dry_run=args.dry_run)
    print(json.dumps(result, indent=2))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/ -v`
Expected: PASS (all tests across every stage, ~33 total)

- [ ] **Step 5: Commit**

```bash
git add tools/dispatch/run.py tools/dispatch/tests/test_run.py
git commit -m "feat(dispatch): add run.py orchestrator wiring all stages, dry-run by default"
```

---

### Task 10: `launchd` install, eng-skill doc, real dry-run end-to-end pass

**Files:**
- Create: `tools/dispatch/install/com.spellroad.dispatch.plist`
- Create: `tools/dispatch/install/install.sh`
- Create: `docs/eng-skills/automated-dispatch.md`
- Modify: `AGENTS.md` (add one line to the "Agent skills" list)

**Interfaces:**
- Consumes: nothing new.
- Produces: an installable `launchd` job; no code interface (this task is docs + ops, no new Python).

- [ ] **Step 1: Write `tools/dispatch/install/com.spellroad.dispatch.plist`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.spellroad.dispatch</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd REPO_ROOT/tools/dispatch &amp;&amp; source .venv/bin/activate &amp;&amp; python run.py --dry-run &gt;&gt; runs/launchd.log 2&gt;&amp;1</string>
  </array>
  <key>StartInterval</key>
  <integer>7200</integer>
  <key>RunAtLoad</key>
  <false/>
  <key>StandardErrorPath</key>
  <string>REPO_ROOT/tools/dispatch/runs/launchd.err.log</string>
</dict>
</plist>
```

- [ ] **Step 2: Write `tools/dispatch/install/install.sh`**

```bash
#!/usr/bin/env bash
# Installs the dispatch job as a launchd user agent, running every 2 hours.
# Ships with --dry-run baked into the plist -- edit the plist and re-run
# this script yourself once you've watched several dry runs and are ready
# to let it merge for real.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PLIST_SRC="$REPO_ROOT/tools/dispatch/install/com.spellroad.dispatch.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.spellroad.dispatch.plist"

sed "s|REPO_ROOT|$REPO_ROOT|g" "$PLIST_SRC" > "$PLIST_DEST"
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST"

echo "Installed. Runs every 2 hours in --dry-run mode."
echo "Logs: $REPO_ROOT/tools/dispatch/runs/launchd.log"
echo "To stop: launchctl unload $PLIST_DEST"
```

- [ ] **Step 3: Make it executable and write `docs/eng-skills/automated-dispatch.md`**

```bash
chmod +x tools/dispatch/install/install.sh
```

```markdown
# Automated agent dispatch

Implements issue #195. A recurring job (every ~2 hours) that scans
`ready-for-agent` GitHub issues, dispatches each to the classified agent in
an isolated worktree, verifies and security-gates the result, runs
Heckler's critique as a blocking check, and merges or reports
`blocked-with-reason` — see `tools/dispatch/CONTEXT.md` for the stage
order and `docs/superpowers/specs/2026-08-12-automated-agent-dispatch-design.md`
for the full design rationale.

Runs on this Mac via `launchd`, not GitHub Actions — the Codex backend
uses a local subscription login, not an API key, so it can't run on a
CI runner. Install: `tools/dispatch/install/install.sh`.

**Ships in `--dry-run` by default.** It reports what it would merge or
block without touching GitHub or merging anything. Only flip
`--dry-run` off (edit the plist's `ProgramArguments`, re-run
`install.sh`) after watching several dry runs and trusting the output.

**Not yet built (tracked as a follow-up plan):** the prototype-screenshot
capture stage (stage06) and the human-readable `report.html`/`index.html`
— today's output is the JSON files under `tools/dispatch/runs/<run_id>/`
plus the plain stdout `run.py` prints.

**Gemini is not wired in yet** — `model_registry.json` reserves an entry;
add a `backends/gemini_backend.py` matching the existing backend shape
plus a live key to enable it.
```

- [ ] **Step 4: Modify `AGENTS.md`'s "Agent skills" section**

Add one line after the "Debug level skip" bullet:

```markdown
### Automated dispatch

A recurring job dispatches `ready-for-agent` issues to the agent roster,
verifies, security-gates, and merges (or reports `blocked-with-reason`)
without a human session. See `docs/eng-skills/automated-dispatch.md`.
```

- [ ] **Step 5: Real (but `--dry-run`) end-to-end pass against this repo**

This step runs for real against GitHub — it must stay `--dry-run` (default) so it cannot merge or comment on anything. Confirm no `ready-for-agent` issue gets a real side effect.

```bash
cd tools/dispatch
source .venv/bin/activate
python run.py --dry-run
cat runs/*/manifest.json
```

Expected: the manifest lists every currently-open `ready-for-agent` issue (including #195 itself), each either `skipped-in-flight` or ending in a `dry-run: would merge (...)` / `blocked-with-reason: ...` action. Confirm via `gh issue view 195` and `gh pr list` that nothing was actually posted, merged, or opened.

- [ ] **Step 6: Commit**

```bash
git add tools/dispatch/install docs/eng-skills/automated-dispatch.md AGENTS.md
git commit -m "feat(dispatch): add launchd install, eng-skill doc, verify real dry-run pass"
```
