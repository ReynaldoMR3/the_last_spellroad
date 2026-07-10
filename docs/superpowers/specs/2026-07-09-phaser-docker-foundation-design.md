# Phaser Docker Foundation Design

## Goal

The Last Spellroad is pivoting from a Mac M1-friendly Unreal concept to a browser-playable Phaser + TypeScript final project. The foundation should let AI agents work inside Docker instead of directly on the host machine, while still producing a game build that can be published for players.

## Scope

This design covers the first technical foundation:

- Create a Phaser + TypeScript app using Vite.
- Make Docker the blessed path for installing dependencies, running development, checking code, and building the game.
- Produce a static production build from the same project.
- Add a production Docker image that serves the built game.
- Update project docs so the UE5 references become historical context rather than the current implementation direction.

This design does not include the full game loop, AI Encounter Director service, backend persistence, account systems, or deployment to a specific hosting provider.

## Recommended Approach

Use a Docker-first Vite/Phaser app.

The local repository remains the source of truth, but commands run through Docker Compose. Agents can edit project files in the mounted repo, while Node, npm, package installation, dev server execution, and production builds happen inside the container.

The browser game itself should stay static for the first playable milestone. This keeps publishing simple: the project can be deployed as static files from `dist/`, or as a small Docker image that serves those files through nginx.

## Architecture

The repository will gain a web game app at the root of `the_last_spellroad`.

Core files:

- `package.json` defines scripts for `dev`, `build`, `preview`, `typecheck`, and any early test/lint commands.
- `vite.config.ts` exposes the Vite dev server on `0.0.0.0` so the host browser can open the game.
- `tsconfig.json` configures strict enough TypeScript for game code without slowing the prototype down.
- `src/` contains Phaser source code, starting with a small boot path and one playable scene.
- `public/` contains static assets that should be copied as-is.
- `Dockerfile` has a development target and a production serving target.
- `docker-compose.yml` defines a `game` service for daily agent and developer work.
- `.dockerignore` keeps generated files and local caches out of Docker builds.

## Docker Workflow

Development should use Docker Compose:

- `docker compose up game` starts the Vite dev server.
- `docker compose run --rm game npm run build` creates `dist/`.
- `docker compose run --rm game npm run typecheck` verifies TypeScript.

The `game` service should mount the repo into the container and keep `node_modules` in a Docker-managed volume. That gives agents live access to source files without installing packages directly onto the host.

The dev server should bind to port `5173` by default and be reachable at `http://localhost:5173`.

## Production Build And Publishing

The production build is static:

- Vite emits `dist/`.
- The production Docker image copies `dist/` into nginx.
- The container serves the game on port `80`.

This supports two publish paths:

- Static hosting by uploading `dist/`.
- Docker hosting by building and running the production image.

No hosting provider is selected in this foundation. The important requirement is that the final project has a clear playable artifact.

## Initial Game Scaffold

The first scene should be intentionally small:

- A visible single-lane Spellroad playfield.
- A controllable mage placeholder.
- Keyboard movement suitable for later tile-aware combat.
- A small UI label or title confirming the Phaser game has booted.

The scaffold should avoid overbuilding combat or encounter generation. Its job is to prove the engine, Docker workflow, and publishable build path.

## Guardrails For AI Agents

Agents should use Docker commands documented in the README instead of running package-manager commands directly on the host.

The repo should document:

- How to start the game.
- How to build it.
- How to run verification.
- Where future game code belongs.
- That Docker is the preferred boundary for dependency installation and execution.

The Docker setup is not a security sandbox for untrusted code. It is a practical project boundary that reduces accidental host pollution and keeps the development environment reproducible.

## Testing And Verification

The first implementation should verify:

- The Docker development service starts.
- The dev server returns the game HTML.
- `npm run typecheck` passes inside Docker.
- `npm run build` passes inside Docker.
- The production image can serve the built game.

If Docker is unavailable during implementation, local npm commands can be used only as a fallback to validate project files, and the limitation should be reported.

## Future Extensions

Later specs can add:

- A tile/grid movement system.
- Spell targeting previews.
- Combat, enemies, waves, and upgrades.
- An AI Encounter Director data format.
- A separate Director generation service if the course requires runtime AI content.
- Deployment automation for a selected hosting target.
