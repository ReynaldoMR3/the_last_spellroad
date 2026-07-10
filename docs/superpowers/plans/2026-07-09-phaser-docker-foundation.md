# Phaser Docker Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Docker-first Phaser + TypeScript foundation for The Last Spellroad that can run locally and produce a publishable static game.

**Architecture:** The repository root becomes a Vite-powered Phaser web game. Docker Compose is the blessed development boundary, with source mounted from the repo and `node_modules` stored in a Docker volume. A multi-stage Dockerfile supports both the development service and a production nginx image that serves `dist/`.

**Tech Stack:** Phaser 3, TypeScript, Vite, Docker Compose, nginx.

## Global Constraints

- The project uses Phaser + TypeScript instead of Unreal Engine for the current implementation direction.
- Docker is the blessed path for installing dependencies, running development, checking code, and building the game.
- The Vite dev server binds to `0.0.0.0` and port `5173`.
- The production build emits static files to `dist/`.
- The production Docker image serves the built game through nginx on port `80`.
- The initial game scaffold includes one visible Spellroad lane, one controllable mage placeholder, keyboard movement, and an on-screen boot label.
- The foundation does not add a backend, runtime AI Director service, persistence, accounts, or provider-specific deployment automation.

---

## File Structure

- `package.json`: npm metadata, scripts, runtime dependencies, and development dependencies.
- `package-lock.json`: generated lockfile from `npm install` inside Docker.
- `index.html`: Vite HTML entrypoint containing the Phaser mount element.
- `vite.config.ts`: Vite config with host `0.0.0.0` and port `5173`.
- `tsconfig.json`: TypeScript compiler settings for app code and config files.
- `src/main.ts`: Phaser game bootstrap.
- `src/scenes/SpellroadScene.ts`: initial playable scene, lane rendering, mage placeholder, and keyboard movement.
- `src/styles.css`: page-level styling around the game canvas.
- `public/`: static asset directory with a `.gitkeep` so the folder exists before assets are added.
- `Dockerfile`: development target and production nginx target.
- `docker-compose.yml`: `game` service for daily development and verification commands.
- `.dockerignore`: excludes generated and local-only files from Docker build contexts.
- `README.md`: updated current direction and Docker-first workflow.
- `docs/context.md`: updated project context from UE5 to Phaser + Docker.
- `docs/game/the-last-spellroad-design.md`: updates engine constraints section to browser/Phaser constraints while preserving game design.

---

### Task 1: Scaffold The Phaser TypeScript App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/main.ts`
- Create: `src/scenes/SpellroadScene.ts`
- Create: `src/styles.css`
- Create: `public/.gitkeep`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, and `typecheck`.
- Produces: Phaser scene class `SpellroadScene extends Phaser.Scene`.
- Produces: Vite app mounted through `<div id="game"></div>`.

- [ ] **Step 1: Create project metadata and scripts**

Create `package.json`:

```json
{
  "name": "the-last-spellroad",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "phaser": "^3.90.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create the Vite HTML entrypoint**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Last Spellroad</title>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 3: Create Vite config**

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true
  }
});
```

- [ ] **Step 4: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 5: Create the Phaser bootstrap**

Create `src/main.ts`:

```ts
import Phaser from "phaser";
import "./styles.css";
import { SpellroadScene } from "./scenes/SpellroadScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#15161f",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: [SpellroadScene]
};

new Phaser.Game(config);
```

- [ ] **Step 6: Create the initial Spellroad scene**

Create `src/scenes/SpellroadScene.ts`:

```ts
import Phaser from "phaser";

const PLAYER_SPEED = 180;
const ROAD_TOP = 190;
const ROAD_HEIGHT = 160;
const ROAD_LEFT = 90;
const ROAD_WIDTH = 780;

export class SpellroadScene extends Phaser.Scene {
  private mage?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;

  constructor() {
    super("SpellroadScene");
  }

  create(): void {
    this.createRoad();
    this.createMage();
    this.createHud();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
  }

  update(): void {
    if (!this.mage) {
      return;
    }

    const left = this.cursors?.left.isDown || this.keys?.A.isDown;
    const right = this.cursors?.right.isDown || this.keys?.D.isDown;
    const up = this.cursors?.up.isDown || this.keys?.W.isDown;
    const down = this.cursors?.down.isDown || this.keys?.S.isDown;

    const velocity = new Phaser.Math.Vector2(0, 0);

    if (left) {
      velocity.x -= 1;
    }

    if (right) {
      velocity.x += 1;
    }

    if (up) {
      velocity.y -= 1;
    }

    if (down) {
      velocity.y += 1;
    }

    velocity.normalize().scale(PLAYER_SPEED);
    this.mage.setVelocity(velocity.x, velocity.y);
  }

  private createRoad(): void {
    this.add.rectangle(480, 270, 960, 540, 0x11131a);
    this.add.rectangle(480, 270, ROAD_WIDTH, ROAD_HEIGHT, 0x303548);
    this.add.rectangle(480, ROAD_TOP, ROAD_WIDTH, 4, 0x7b6fbd);
    this.add.rectangle(480, ROAD_TOP + ROAD_HEIGHT, ROAD_WIDTH, 4, 0x7b6fbd);

    for (let x = ROAD_LEFT; x <= ROAD_LEFT + ROAD_WIDTH; x += 60) {
      this.add.rectangle(x, 270, 2, ROAD_HEIGHT, 0x252939, 0.8);
    }
  }

  private createMage(): void {
    this.mage = this.physics.add.sprite(180, 270, "");
    this.mage.setDisplaySize(32, 32);
    this.mage.setCollideWorldBounds(true);
    this.mage.body.setSize(32, 32);

    const body = this.mage.body;
    body.setBoundsRectangle(
      new Phaser.Geom.Rectangle(ROAD_LEFT, ROAD_TOP, ROAD_WIDTH, ROAD_HEIGHT)
    );

    const graphics = this.add.graphics();
    graphics.fillStyle(0xd9c27f, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.lineStyle(3, 0x4b3f72, 1);
    graphics.strokeCircle(16, 16, 13);
    graphics.generateTexture("mage-placeholder", 32, 32);
    graphics.destroy();

    this.mage.setTexture("mage-placeholder");
  }

  private createHud(): void {
    this.add.text(32, 28, "The Last Spellroad", {
      color: "#f3e7c2",
      fontFamily: "Georgia, serif",
      fontSize: "28px"
    });

    this.add.text(32, 64, "Phaser + TypeScript running in Docker", {
      color: "#9fb0d8",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px"
    });
  }
}
```

- [ ] **Step 7: Create page styling**

Create `src/styles.css`:

```css
html,
body {
  margin: 0;
  min-width: 100%;
  min-height: 100%;
  background: #0d0f16;
  color: #f3e7c2;
  font-family: Arial, sans-serif;
}

body {
  display: grid;
  place-items: center;
  overflow: hidden;
}

#game {
  width: 100vw;
  height: 100vh;
}

canvas {
  display: block;
}
```

- [ ] **Step 8: Create the static assets folder marker**

Create `public/.gitkeep` as an empty file.

- [ ] **Step 9: Confirm scaffold files exist**

Run: `ls package.json index.html vite.config.ts tsconfig.json src/main.ts src/scenes/SpellroadScene.ts src/styles.css public/.gitkeep`

Expected output includes:

```text
index.html
package.json
public/.gitkeep
src/main.ts
src/scenes/SpellroadScene.ts
src/styles.css
tsconfig.json
vite.config.ts
```

- [ ] **Step 10: Commit the scaffold**

```bash
git add package.json index.html vite.config.ts tsconfig.json src public
git commit -m "Scaffold Phaser TypeScript game"
```

Expected: Commit succeeds.

---

### Task 2: Add Docker Development And Production Workflow

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: npm scripts from `package.json`.
- Produces: Compose service `game`.
- Produces: Docker targets `development`, `build`, and `production`.
- Produces: Docker volume `spellroad_node_modules`.

- [ ] **Step 1: Create the multi-stage Dockerfile**

Create `Dockerfile`:

```Dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Create Docker Compose service**

Create `docker-compose.yml`:

```yaml
services:
  game:
    build:
      context: .
      target: development
    working_dir: /app
    command: npm run dev
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - spellroad_node_modules:/app/node_modules
    environment:
      npm_config_update_notifier: "false"

volumes:
  spellroad_node_modules:
```

- [ ] **Step 3: Create Docker ignore rules**

Create `.dockerignore`:

```gitignore
.git
dist
node_modules
npm-debug.log
.DS_Store
docs/superpowers/plans
```

- [ ] **Step 4: Generate the lockfile inside Docker**

Run: `docker compose run --rm game npm install`

Expected: Command exits `0` and creates `package-lock.json`. Docker may download Node, npm packages, and Phaser dependencies.

- [ ] **Step 5: Verify Docker Compose can typecheck**

Run: `docker compose run --rm game npm run typecheck`

Expected output includes:

```text
> the-last-spellroad@0.1.0 typecheck
> tsc --noEmit
```

Expected: exit code `0`.

- [ ] **Step 6: Verify Docker Compose can build the static game**

Run: `docker compose run --rm game npm run build`

Expected output includes:

```text
vite v
✓ built in
```

Expected: exit code `0` and `dist/index.html` exists.

- [ ] **Step 7: Commit Docker workflow**

```bash
git add Dockerfile docker-compose.yml .dockerignore package-lock.json
git commit -m "Add Docker workflow for Phaser game"
```

Expected: Commit succeeds.

---

### Task 3: Update Project Documentation For The Phaser Pivot

**Files:**
- Modify: `README.md`
- Modify: `docs/context.md`
- Modify: `docs/game/the-last-spellroad-design.md`

**Interfaces:**
- Consumes: Docker commands from Task 2.
- Produces: current developer instructions for Docker-first work.

- [ ] **Step 1: Replace README current direction and commands**

Update `README.md` to:

```markdown
# The Last Spellroad

The Last Spellroad is a course final-project game for the Multi-Agent AI in Game Development course.

It is now planned as a low-spec, browser-playable Phaser + TypeScript magical roguelite. The player controls a long-lived wandering mage trapped inside an infinite single-lane Spellroad generated by an in-world AI Director.

## Core Pillars

| Pillar | Direction |
| --- | --- |
| Tactical spell combat | Readable positioning, cooldowns, line of sight, enemy ranges, and spell geometry matter more than twitch reflexes. |
| Infinite road, finite prototype | The lore frames the Spellroad as endless, while the course project ships a polished vertical slice. |
| One agent, one wow | The AI Encounter Director generates encounter data and also exists in the lore as the force shaping the Spellroad. |
| Low-spec web game | Phaser + TypeScript keeps the project playable on modest hardware and publishable as static files. |

## Docker-First Workflow

Docker is the preferred boundary for agents and local development. Run package installation, development, typechecking, and builds through Docker Compose.

Start the dev server:

```bash
docker compose up game
```

Open the game at:

```text
http://localhost:5173
```

Install or update packages inside Docker:

```bash
docker compose run --rm game npm install
```

Typecheck:

```bash
docker compose run --rm game npm run typecheck
```

Build the static game:

```bash
docker compose run --rm game npm run build
```

Build the production image:

```bash
docker build --target production -t the-last-spellroad .
```

Run the production image:

```bash
docker run --rm -p 8080:80 the-last-spellroad
```

## Course Scope

The first target is a playable vertical slice:

- 1 playable mage.
- 1 narrow Spellroad tileset.
- 3 enemy types.
- 1 mini-boss or Director avatar.
- 12-20 spells or upgrades.
- 5-10 short levels.
- AI-generated encounter data imported into the game.

## Related Course Repo

Course notes and syllabus tracking live in:

`../multi-agent-ai-in-game-development`
```

- [ ] **Step 2: Update project context**

Update `docs/context.md` to:

```markdown
# Game Project Context

## Purpose

This folder stores durable design, planning, lore, and implementation notes for The Last Spellroad.

## Scope

| Path | Purpose | Status |
| --- | --- | --- |
| `game/` | Game design, lore, AI system notes, and GDD material. | Started |
| `superpowers/specs/` | Approved technical and design specs. | Started |
| `superpowers/plans/` | Implementation plans for agentic execution. | Started |

## Current Direction

The Last Spellroad is a low-spec top-down magical roguelite designed as a browser-playable Phaser + TypeScript project. Docker is the preferred development boundary so AI agents can install dependencies, run tools, and build the game without polluting the host machine.

The project prioritizes lore, tactical spell mechanics, and an AI-assisted encounter pipeline over expensive visuals.

## Next Actions

- Build the Phaser + TypeScript scaffold.
- Verify the Docker development and production build workflow.
- Define the first playable Spellroad movement and spellcasting loop.
- Define the AI Encounter Director output format after the course requirements are clearer.
```

- [ ] **Step 3: Replace the Unreal constraints section in the design doc**

In `docs/game/the-last-spellroad-design.md`, replace the `## Unreal Engine 5 Constraints` section with:

```markdown
## Phaser And Web Constraints

The project should be designed for a low-spec browser-playable workflow.

- Use Phaser + TypeScript as the current implementation stack.
- Use Docker as the preferred boundary for dependency installation, development, typechecking, and builds.
- Prefer stylized 2D graphics and readable silhouettes.
- Prefer compact maps and modular tiles.
- Avoid expensive real-time effects that make the game harder to run or publish.
- Keep enemy counts modest.
- Use lightweight VFX with strong silhouettes.
- Keep the production build publishable as static files.
```

- [ ] **Step 4: Search for stale UE5 direction**

Run: `rg -n "Unreal|UE5|Nanite|ray tracing|Mac M1-friendly Unreal" README.md docs`

Expected: No hits that describe the current implementation direction. Historical references inside the committed spec may remain only if explicitly framed as the old direction.

- [ ] **Step 5: Commit documentation updates**

```bash
git add README.md docs/context.md docs/game/the-last-spellroad-design.md
git commit -m "Document Phaser Docker project direction"
```

Expected: Commit succeeds.

---

### Task 4: Verify Development Server And Production Image

**Files:**
- No source files changed unless verification reveals a defect.

**Interfaces:**
- Consumes: Compose service `game`.
- Consumes: production Docker target from `Dockerfile`.
- Produces: verified local dev URL and production container command.

- [ ] **Step 1: Start the development server**

Run: `docker compose up game`

Expected output includes:

```text
Local:
Network:
```

Expected: Vite reports a server listening on port `5173`.

- [ ] **Step 2: Verify dev server from another terminal**

Run: `curl -I http://127.0.0.1:5173`

Expected output includes:

```text
HTTP/1.1 200 OK
Content-Type: text/html
```

- [ ] **Step 3: Stop the development server**

Press `Ctrl-C` in the terminal running `docker compose up game`.

Expected: Compose exits cleanly.

- [ ] **Step 4: Build the production image**

Run: `docker build --target production -t the-last-spellroad .`

Expected output includes:

```text
writing image
naming to docker.io/library/the-last-spellroad
```

Expected: exit code `0`.

- [ ] **Step 5: Run the production image**

Run: `docker run --rm -p 8080:80 the-last-spellroad`

Expected: nginx starts and keeps the container running.

- [ ] **Step 6: Verify production container from another terminal**

Run: `curl -I http://127.0.0.1:8080`

Expected output includes:

```text
HTTP/1.1 200 OK
Content-Type: text/html
```

- [ ] **Step 7: Stop the production container**

Press `Ctrl-C` in the terminal running `docker run --rm -p 8080:80 the-last-spellroad`.

Expected: Docker stops the container and removes it because `--rm` was used.

- [ ] **Step 8: Commit any verification fixes**

If files changed during verification, run:

```bash
git status --short
git add <changed-files>
git commit -m "Fix Phaser Docker verification issues"
```

Expected: Commit succeeds only if fixes were needed. If no files changed, skip this step.

---

### Task 5: Final Review

**Files:**
- Inspect all changed files.

**Interfaces:**
- Consumes: complete scaffold, Docker workflow, docs, and verification results.
- Produces: final implementation summary.

- [ ] **Step 1: Check git history**

Run: `git log --oneline -5`

Expected: Recent commits include:

```text
Scaffold Phaser TypeScript game
Add Docker workflow for Phaser game
Document Phaser Docker project direction
```

- [ ] **Step 2: Check worktree status**

Run: `git status --short`

Expected: no output.

- [ ] **Step 3: Re-run final verification commands**

Run:

```bash
docker compose run --rm game npm run typecheck
docker compose run --rm game npm run build
docker build --target production -t the-last-spellroad .
```

Expected: all commands exit `0`.

- [ ] **Step 4: Final response**

Report:

- The dev URL: `http://localhost:5173`.
- The production test URL after running the image: `http://localhost:8080`.
- The verification commands that passed.
- Any limitation if Docker was unavailable or a command could not be run.
