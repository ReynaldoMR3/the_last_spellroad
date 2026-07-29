# Stage 03 -- Critique (Layer 2)

**Inputs:** a draft from Stage 02 (or the seeded validation-test draft
from Stage 00), the same retrieved chunks from Stage 01.

**Process:** Heckler checks the draft against the same constraints
Lorena drafted under, grounded in the same retrieved chunks. Returns a
structured verdict (`PASS`/`FAIL`), the issue found (if any), and a
corrected rewrite (if any) -- catches and corrects in one pass.

**Outputs:** a `{verdict, issue, corrected}` dict, consumed by Stage 04
and written into `03_heckler_critique.md`.
