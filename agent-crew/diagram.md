# Agent Crew — Architecture Diagram

Matches `crew/tasks.py` exactly: 8 agents, 9 tasks, one sequential CrewAI process. Arrows are `context=[...]` data dependencies — the actual mechanism CrewAI uses to pass one task's output into another's prompt.

```mermaid
flowchart TD
    DEV[Developer request:<br/>new wave + spell for a level] --> ANA1

    subgraph Crew["The Last Spellroad — Agent Crew (crew/crew.py)"]
        ANA1["Ana — Orchestrator<br/>(kickoff brief)"]
        WARDEN["Warden — Encounter Designer<br/>generates wave.json"]
        FRIEREN["Frieren — Spell Author<br/>generates spell.json"]
        PATO["Pato — Economy Validator<br/>PASS / flagged-diff"]
        TILESMITH["Tilesmith — Art Sourcing<br/>asset + license proposal"]
        LORENA["Lorena — Narrative Writer<br/>flavor/lore beat"]
        LOOMWRIGHT["Loomwright — Engine Programmer<br/>integration notes"]
        HECKLER["Heckler — QA Critic<br/>six-persona critique"]
        ANA2["Ana — Orchestrator<br/>(closing status report)"]

        ANA1 --> WARDEN
        ANA1 --> FRIEREN
        WARDEN --> PATO
        FRIEREN --> PATO
        WARDEN --> TILESMITH
        FRIEREN --> TILESMITH
        WARDEN --> LORENA
        FRIEREN --> LORENA
        WARDEN --> LOOMWRIGHT
        FRIEREN --> LOOMWRIGHT
        PATO --> LOOMWRIGHT
        WARDEN --> HECKLER
        FRIEREN --> HECKLER
        PATO --> HECKLER
        TILESMITH --> HECKLER
        LORENA --> HECKLER
        LOOMWRIGHT --> HECKLER
        ANA1 --> ANA2
        WARDEN --> ANA2
        FRIEREN --> ANA2
        PATO --> ANA2
        TILESMITH --> ANA2
        LORENA --> ANA2
        LOOMWRIGHT --> ANA2
        HECKLER --> ANA2
    end

    ANA2 --> OUT["output/run_&lt;timestamp&gt;/<br/>bundle.json + per-task .md files<br/>+ final_status.md"]
```

## Reading this diagram

- **No peer-to-peer edges between worker agents.** Every arrow either originates at Ana (scoping) or terminates at Ana (closing synthesis) — the same hierarchical-star shape as the Claude-Code-driven roster in `docs/agents/ana/AGENT.md`, implemented here as CrewAI's sequential process with explicit `context=[...]` wiring instead of `Process.hierarchical`'s manager-delegation overhead (see `CONTEXT.md` for why).
- **Generator/validator split is preserved.** Warden and Frieren generate; only Pato validates their numbers — Pato never authors content, and Warden/Frieren never grade their own output. This mirrors `docs/agents/pato/AGENT.md`'s constraint exactly.
- **Every arrow into Ana's closing task is load-bearing.** `status_task` in `crew/tasks.py` lists all 8 prior tasks in its `context` — remove any one agent from the crew and Ana's final status report loses that agent's input, satisfying the assignment's "no agent could be removed without breaking the pipeline" criterion literally in code, not just in narrative.
- **Data flow is real files, not just text.** Warden's and Frieren's outputs are `wave.json`/`spell.json`-schema JSON; Pato's is a structured pass/fail; everything lands in `output/run_<timestamp>/` as both individual per-task files and one combined `bundle.json`.
