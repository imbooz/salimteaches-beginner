# AGENTS.md — SalimTeaches Beginner

- Inspect actual files before modifying anything.
- Do not assume code from memory.
- Keep `main` stable; develop Unit 3+ on a separate branch.
- Units 1–2 activity pages are legacy. Do not refactor them unless explicitly requested.
- Unit 3+ must use the shared CSS/JS architecture.
- Preserve the existing Cloudflare Worker `/progress` contract.
- Do not modify or invent Cloudflare/D1 backend behavior.
- Always pass the correct current `activity_id`; never fall back to another unit's ID.
- Preserve test gating: required preceding activities must be completed before the test unlocks; Workbook Tahlili is optional.
- Reorder/drop interactions must support mobile tap-to-select → tap-to-place with a clear selected state.
- Before a commit, verify navigation, checking/scoring, progress saving, and activity IDs relevant to changed pages.
