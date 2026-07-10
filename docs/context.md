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

- Define and implement the first playable Spellroad movement and spellcasting loop.
- Build the first enemy encounter with readable ranges, cooldowns, and spell geometry.
- Create the initial Spellroad tileset and short progression path for the vertical slice.
- Define the AI Encounter Director output format and import it into the game.
