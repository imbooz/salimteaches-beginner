# SalimTeaches Beginner — Project Context

## Source of truth
Inspect the actual repository before making changes. Do not reconstruct code from memory.

## Branches
- `main` = stable/live baseline.
- Unit 3+ development happens on a separate branch.
- Do not modify `main` directly during development.

## Legacy
- Unit 1 and Unit 2 activity HTML files are legacy and should remain unchanged unless explicitly requested.
- Their behavior is the reference for course logic, but their duplicated inline CSS/JS is not the architecture for new units.

## New architecture
- `index.html` uses external `css/base.css` and `js/index.js`.
- `css/base.css` = global visual foundation/current index styles.
- `css/components.css` = reusable UI components for Unit 3+.
- `css/activities.css` = reusable activity-page components.
- `js/common.js` = shared utilities for Unit 3+.
- `js/progress.js` = shared frontend progress/database client.
- `js/interactions.js` = shared mobile-friendly interactions.

## Backend boundary
Cloudflare Worker + D1 are managed manually by the owner. Do not modify or invent backend APIs from frontend work.

Current Worker endpoint:
`https://salimteaches-beginner-auth.imshosalim.workers.dev/progress`

Progress payload:
- `initData`
- `activity_id`
- `completed`
- `score`

`activity_id` must identify the current activity. Never use a fallback belonging to another unit.

## Course gating
The Unit Test remains locked until the required preceding activities for that unit are completed. Optional Workbook Tahlili does not count as a prerequisite.

## Mobile interaction
Reorder/drop exercises must support:
1. tap an item to select it;
2. selected item gets an obvious highlighted/selected color;
3. tap the destination to place it.
Desktop drag-and-drop may also be supported.

## Frontend/backend separation
The frontend calls the existing Worker. Backend schema and Worker code stay outside this repository unless explicitly requested.
