# Game Project Context

## Purpose

This folder stores durable design, planning, lore, and implementation notes for The Last Spellroad.

Agent-generated context (per-agent contracts and logs, ICM-style) lives at `agents/` — see `agents/CONTEXT.md` for the index. Load that instead of this whole folder when working on a specific agent's task.

## Scope

| Path | Purpose | Status |
| --- | --- | --- |
| `game/` | Game design, lore, AI system notes, and GDD material. | Started |
| `superpowers/specs/` | Approved technical and design specs. | Started |
| `superpowers/plans/` | Implementation plans for agentic execution. | Started |

## Current Direction

The Last Spellroad is a low-spec top-down magical roguelite designed as a browser-playable Phaser + TypeScript project. Docker is the preferred development boundary so AI agents can install dependencies, run tools, and build the game without polluting the host machine.

The project prioritizes lore, tactical spell mechanics, and an AI-assisted encounter pipeline over expensive visuals.

## Language

**Opening Experience**:
The player's first minute in Level 1, where the game must establish magical excitement, tactical readability, and the Spellroad's capacity to grow stranger and more melancholic later.
_Avoid_: Tutorial mood, title-screen experience

**Runes Awake**:
The opening art-and-music direction: familiar stone and forest form a grounded world while saturated runes, spells, pickups, and music make magic feel newly alive.
_Avoid_: Generic fantasy, spellstorm

**Arcane Momentum**:
The selected intensity for Runes Awake: the environment stays readable and grounded while magic is frequent and vivid enough to make the opening immediately exciting.
_Avoid_: Maximum spectacle, ambient-only magic

**Active Prototype**:
The single throwaway Phaser scene currently used to answer one approved design question against the latest production baseline.
_Avoid_: Demo, permanent prototype, prototype archive

**Prototype Freshness**:
The rule that a change affecting the Active Prototype's production baseline must update and re-check that prototype in the same change.
_Avoid_: Prototype compatibility

**Side-Pocket Lore Encounter**:
An optional off-route discovery that reveals a short piece of world lore without NPC dialogue or interrupting combat.
_Avoid_: NPC lore encounter, mandatory lore beat

## Next Actions

- Define and implement the first playable Spellroad movement and spellcasting loop.
- Build the first enemy encounter with readable ranges, cooldowns, and spell geometry.
- Create the initial Spellroad tileset and short progression path for the vertical slice.
- Define the AI Encounter Director output format and import it into the game.
