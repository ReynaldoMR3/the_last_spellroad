# Docker Testing Contract (shared reference)

Source of truth: root `Dockerfile`, `docker-compose.yml`, `README.md`'s "Docker-First Workflow" section, and the GDD's Tech Stack callout (`docs/game/the-last-spellroad-design.md`, "Phaser And Web Constraints").

**Why this file exists:** the Docker setup was built during Week 1's foundation work (`docs/superpowers/specs/2026-07-09-phaser-docker-foundation-design.md`), before the agent context store (`docs/agents/`) existed. It's documented in the README and the GDD, but every agent's own `AGENT.md` explicitly says not to read the full GDD unless a task requires it — so an agent dispatched purely against its own `CONTEXT.md` + `_reference/` + log had no path to it. This file closes that gap the same way `engine-contract.md` and `art-sourcing-contract.md` do for their own domains: one small, stable file an agent can load without pulling in the whole GDD.

**Requires:** Docker and Docker Compose available wherever the agent is actually executing. Use whichever CLI form is actually installed — `docker-compose` (standalone binary) or `docker compose` (plugin form); check with `docker-compose version` / `docker compose version` before assuming one over the other, since the wrong one fails with an "unknown flag"/"unknown command" error that looks like a broken setup rather than a syntax mismatch. This repo's README and GDD document the hyphenated `docker-compose` form; confirmed working directly (2026-07-24, `docker-compose run --rm game npm run typecheck`, ran clean including a first-time image build) on the machine this contract was written on. If they aren't available at all, see "If Docker isn't available" below.

## Commands

- Start the dev server (hot-reload, reachable at `http://localhost:5173`): `docker-compose up game`
- Same, detached (so a script/agent session isn't blocked): `docker-compose up -d game` — stop it with `docker-compose down`
- Typecheck only, no build output: `docker-compose run --rm game npm run typecheck`
- Build the static production bundle to `dist/`: `docker-compose run --rm game npm run build`
- Run the test suite (Vitest, added 2026-08-01 for `src/systems/waveThreatBudget.ts` — the repo's first automated tests): `docker-compose run --rm game npm test`
- Install or update packages (always inside the container, never on the host): `docker-compose run --rm game npm install`
- Build and run the production image (serves `dist/` via nginx on port 80): `docker build --target production -t the-last-spellroad .` then `docker run --rm -p 8080:80 the-last-spellroad`

## What each agent can self-verify with this, before its actual gate

- **Loomwright** (engine code): run `typecheck` and `build` after every engine change, before reporting back to Ana. This is a mechanical correctness check Loomwright can and should run on itself — it does not replace or shortcut the human developer playtest gate in `loomwright/AGENT.md`'s success criterion, which checks interactive feel and correctness under real input, not compile success. Nothing should reach the developer-playtest stage with a failing typecheck or build.
- **Heckler** (adversarial critique): when critiquing an actual build rather than a design doc, run `typecheck`/`build` and, where the critique concerns runtime behavior, bring the dev server up and check it actually serves without console errors, instead of critiquing from a static source read alone.
- **Ana**: when dispatching any task that touches engine code or requests a build-based critique, point the dispatched agent at this file so it knows self-verification is available rather than only waiting on the developer to eventually run the game.
- **Frieren, Warden, Lorena, Pato, Tilesmith**: don't need this file for their own output (data/prose that Pato or Heckler validate, not runnable code) — but should know it exists in case a task ever needs the game actually running.

## If Docker isn't available in an agent's sandbox

Per the original foundation spec, local `npm run typecheck` / `npm run build` / `npm run dev` may be used as a fallback to validate project files. State plainly in the report back to Ana that Docker wasn't available and the host commands were used instead — don't let that substitution pass silently, since it changes what "verified" actually means for that task.

## Not a security sandbox

Per the original foundation spec: this Docker setup is a practical project-boundary and reproducibility tool, not a security sandbox for untrusted code.

Only Loomwright edits this file when the Docker workflow itself changes (new scripts, new services). Every other agent reads it.
