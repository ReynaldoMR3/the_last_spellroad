# Stage 00 -- Kickoff (Layer 2)

**Inputs:** none (this stage's own fixed `CONTENT_REQUESTS` list).

**Process:** deterministic Python, not an LLM call -- Ana orchestrates,
she does not generate (see `docs/agents/ana/AGENT.md`). Assembles the
content gap, Lorena's constraints, and the scoped list of requests
(3 real content items + 1 deliberately seeded violation used to prove
the critic loop works).

**Outputs:** a brief dict consumed by every later stage, and
`00_ana_kickoff_brief.md`.
