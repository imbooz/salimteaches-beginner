# SalimTeaches Beginner — Frontend Architecture

## What is live
- `main` remains the stable baseline.
- Units 1–2 are legacy and are intentionally untouched.
- `index.html` now uses external CSS/JS.
- Unit 3+ will use the shared files in `css/` and `js/`.

## Shared files
- `css/base.css` — existing index visual foundation.
- `css/components.css` — reusable buttons, optional label, selected state, navigation.
- `css/activities.css` — reusable activity-page layout/feedback/drop targets.
- `js/index.js` — existing index application logic, moved out of HTML.
- `js/common.js` — small reusable frontend utilities.
- `js/progress.js` — existing Worker `/progress` client for new activities.
- `js/interactions.js` — mobile tap-to-select/tap-to-place foundation.

## Backend
Cloudflare Worker + D1 remain outside this repository and are maintained manually.
The frontend must preserve the existing Worker contract.

## Development
Do not modify `main` directly for Unit 3. Create a development branch, test it, then merge.
