# Frieren — Contract (Layer 2)

**Inputs:** a spell design brief from Ana, Pato's weight-class (Light/Standard/Heavy) and three-tier Mastery templates, Loomwright's engine contract (which AoE shapes actually exist).

**Process:** author one spell within the element/shape/weight constraints, stating the tactical tradeoff explicitly, then hand off to Pato.

**Outputs:** one `spell.json` entry -- `{id, element, shape, weight, base_power, base_targets}`.

**Player-facing effect:** a castable spell in the hotbar, with its visual effect, cooldown, and Mastery growth.

**Reference layer used:** `_reference/engine-contract.md` (which shapes exist), `_reference/mastery-template.md` (how Mastery scales -- read-only, Frieren never authors this).

**Log:** `docs/agents/frieren/log.md` -- append one entry per spell authored: id, element/shape/weight, the stated tradeoff, and the Pato/Heckler gate result.
