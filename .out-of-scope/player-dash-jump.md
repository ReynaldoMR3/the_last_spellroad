# Player Jump/Dash (Evasive Movement)

This project does not add a player jump, dash, or any other new evasive-movement
mechanic within the current seven-week vertical slice.

## Why this is out of scope

The GDD's [Minimal-Build Floor vs. Stretch table](../docs/game/the-last-spellroad-design.md)
(Seven-Week Vertical Slice) enumerates everything this slice can flex on if a week
runs short: spell count, level count, the narrative pass, targeting/lane UX, and
audio. Player evasive movement has no row in that table at all — it isn't a floor
item and it isn't a stretch item, which means it isn't a smaller version of
something already committed; it's new scope.

The table's own governance rule is explicit about what happens when time is
tight: cut a stretch item, don't quietly extend past Week 7. That rule only works
if new scope isn't introduced mid-slice in the first place. A jump/dash system
touches the movement engine (`SpellroadScene.ts`, currently a single-lane
arrow-keys/WASD walk) and would need its own animation, collision, and
balance-against-enemy-positioning pass — Loomwright's engine-scope work, not a
one-line tune like the existing lane-strafe fixes (`rangedStrafe.ts`,
`wallSlideDirection.ts`, both enemy-side, not player-side).

This is a scope-boundary decision, not a judgment that the idea is bad — it's a
reasonable post-slice feature for a future pass, once the floor items (mage,
tileset, 3 enemy types, mini-boss) and the locked stretch scope are done.

## Prior requests

- #201 — "Feature idea: jump/dash for a second traversal dimension against enemies" (student playtester feedback, 2026-08-13)
