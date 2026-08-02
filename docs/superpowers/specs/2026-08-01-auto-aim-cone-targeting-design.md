# Auto-Aim — Cone-Based Assisted Targeting For No-Mouse Play

**Status:** Approved, ready to hand off to Ana for dispatch (Loomwright).
**Branch:** `design/auto-aim-cone-targeting`

## Context

The developer reported that aiming with a trackpad while also driving movement (arrows/WASD) and the `1-6` spell hotbar is uncomfortable, and asked for an auto-aim option. Grilled via `/grill-with-docs` (2026-08-01) rather than built directly, since a fallback already exists and the real question was whether it's actually solving the problem.

It isn't: backlog item 2.10 added a fallback where, until the pointer moves past a jitter threshold, `SpellroadScene.currentAimPoint()` aims at the mage's `lastFacing` direction at a fixed distance. That fallback was built to patch a bug-report state ("targeting requires a mouse"), not designed as a deliberate no-mouse control scheme — and it breaks exactly when it matters most: dodging to survive moves the mage away from or sideways to the enemy, so `lastFacing` stops pointing at anything worth hitting right when the player needs to cast back.

## Decisions

### 1. Target selection

**Nearest enemy within a wide (~150-180°) facing cone**, centered on the mage's last movement direction (the same `lastFacing` value the existing fallback already tracks). Rejected pure nearest-enemy-anywhere: with multiple enemies on screen it removes the player's ability to choose which one to hit, reintroducing the "how do I pick a target without a mouse" problem this feature exists to solve. Rejected a narrow cone or a decoupled "aim facing" that ignores retreat/strafe movement: both were considered, but a wide cone directly fixes the dodge-and-cast complaint (an enemy beside or slightly behind the mage during a strafe is still caught) with the least new state to design and track — a decoupled facing value needs a "toward vs. away" heuristic that's its own design problem, not something a control-scheme fix should take on.

### 2. No enemy in the cone

Falls back to the **globally nearest enemy**, ignoring the cone entirely. Rejected falling back to today's empty-space fallback point (reintroduces the original complaint) and rejected a sticky/last-known target (risks casting at an enemy the player can no longer see or react to, which is worse than just re-picking).

### 3. Activation

Reuses the existing `pointerHasMoved` trigger unchanged — this targeting activates whenever the pointer hasn't moved past the jitter threshold, exactly like today's fallback. No new settings/accessibility toggle in this pass; a dedicated on/off option (so a mouse player could opt in permanently, or a trackpad player could opt out) is noted as a plausible future item, not scoped now — same hedge pattern the GDD already uses for hotkey customization and mouse-click movement.

### 4. Applies uniformly across all three AoE shapes

Line, cone, and circle (placement) all use the selected enemy's position as the aim/placement point. Rejected treating circle differently (keeping its today's-fallback placement behavior) on the theory that AoE placement is sometimes deliberately not centered on an enemy — in the common case an AoE centered on the enemy being fought is what's wanted, and a shape-specific rule would be a second targeting behavior to design, test, and explain for a fix that should stay scoped.

### 5. Soft-lock during preview-and-confirm

The target enemy is chosen **once**, at the moment the spell hotkey starts the preview, then the preview tracks that specific enemy's live position (so it follows if the enemy moves) until the player confirms or cancels. It never re-evaluates or swaps to a different enemy mid-preview. Rejected continuous re-evaluation (every frame): risks the preview flickering between two similarly-distant enemies while the player is mid-dodge, undermining the exact stability this feature is meant to add. Rejected a hard position snapshot (no tracking at all): a moving enemy could dodge out of a line/cone shape the player was about to confirm, which would feel broken.

### 6. Visual feedback

A highlight/marker on the auto-selected enemy, in addition to the existing line/cone/circle preview shape — so which enemy will be hit is clear before confirming, especially with a wide cone and several enemies nearby.

### 7. Explicitly deferred (not this pass)

- **Manual target-cycle hotkey** (e.g. `Tab`) to step through candidates when the algorithm doesn't pick the enemy the player wants. Real scope of its own (new binding, new UI affordance for "which one is selected," edge cases while moving) — ship nearest-in-cone first, revisit only if playtesting actually surfaces a "wrong enemy picked" complaint.
- **Dedicated accessibility settings toggle** for always-on/off auto-aim independent of pointer movement — noted above, not scoped now.

## Priority

High — the developer wants this in before their own upcoming full-sequence playtest (backlog task 3.9), since the current aiming discomfort would contaminate that playtest. Not a hard technical dependency of 3.9, but sequenced ahead of it deliberately.

## Documentation

- No GDD change beyond a short addition to the existing "Core Controls And Casting" section (`docs/game/the-last-spellroad-design.md`) — this is a refinement of the control model already described there, not a new section.
- This spec, under `docs/superpowers/specs/`, carries the implementation-level detail (cone angle, fallback order, soft-lock timing) — same split established by e.g. the Boot/Title/Pause design.
- No new ADR: nothing here is hard-to-reverse architecture or a system-boundary decision — it's targeting-behavior tuning within Loomwright's existing movement/casting engine scope (no ownership gap to resolve, unlike 0.1/0.7).
- Tracked as backlog item 2.22 and a GitHub issue, following the filing convention set by 2.19/2.21/3.6-3.9.

## Out of scope

- Gamepad/controller support (not requested; separate from the trackpad/keyboard problem reported here).
- Target-cycle hotkey (see "Explicitly deferred" above).
- Accessibility settings menu/toggle (see "Explicitly deferred" above).
- The actual TypeScript implementation — tracked separately as the dispatched backlog/issue work, owned by Loomwright.
