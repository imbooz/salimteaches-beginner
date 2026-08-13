# SalimTeaches Beginner — Project Handbook

This file exists so a **new Claude conversation** (in the chat.claude.ai app, with no
access to this repo, no terminal, and no memory of past sessions) can pick up exactly
where things left off. If you are a Claude session reading this because the user
pasted or uploaded it: read this whole file before doing anything, then see
**"How to work with the user"** near the bottom — it explains the constraints you're
operating under (no git, no D1 access) and exactly how to hand off your work.

If you are the human (teacher) reading this: see **"How to work with the user"** too —
it's written to both of you.

---

## 1. What this project is

A Telegram Mini App for an English course ("SalimTeaches Beginner"). Free YouTube
lessons drive students into a paid Telegram group; this Mini App is the paid group's
gated content hub — lessons, practice exercises, listening/reading, and tests per unit.

- **Repo:** https://github.com/imbooz/salimteaches-beginner (branch `main`, deployed via GitHub Pages)
- **Live URL:** https://imbooz.github.io/salimteaches-beginner/
- **Backend:** Cloudflare Worker at `salimteaches-beginner-auth.imshosalim.workers.dev`,
  backed by a Cloudflare D1 database (tables: `students`, `units`, `activities`,
  `unit_progress`, `activity_progress`). **Nobody working from chat has DB or
  Cloudflare access** — every DB change must be handed to the teacher as exact SQL
  to run in the D1 console, and every Worker code change must be handed over as the
  full file for the teacher to paste into the Cloudflare dashboard's Worker "Edit
  code" / "Quick Edit" view and deploy. A copy of the Worker's source is tracked in
  this repo at `worker/worker.js` purely for reference/version history — **editing
  that file does not deploy it**; it still has to be pasted into Cloudflare manually.
  Keep it in sync whenever you hand over a new Worker version.
- **Auth:** Telegram WebApp `initData`, HMAC-verified server-side, checked against
  Telegram Premium group membership via `getChatMember`.
- **Owner:** a non-technical English teacher (10 years teaching experience, based in
  Uzbekistan, teaches in Uzbek). Explain technical decisions in plain language.

---

## 2. Product behavior — must stay identical for every unit, do not deviate

1. Home page → tap a unit → detail page with activity cards in this order:
   **Lesson video → Workbook analysis video (optional) → Practice → Listening/Reading → Test**
2. Test stays locked until Practice + Listening/Reading are both done.
3. New students start with only Unit 1 unlocked.
4. Every unit after the first unlocks purely by the **previous unit's test being
   passed (≥70%)** — independent of the database's `is_available` flag. **Only the
   first unit in the sequence uses `is_available` for gating.** This was a real
   regression once (Unit 3's test unlocked before its DB rows existed) — see §6.
5. Units alternate Listening/Reading: odd units (1, 3, 5…) get Listening, even units
   (2, 4, 6…) get Reading.
6. Every third unit (after Unit 3, Unit 6, Unit 9…) gets a **progress test milestone**
   between it and the next unit — see §5.
7. Visual style: soft rounded cards, `#5865f2` blue primary, Uzbek-language UI text
   and instructions, English learning content.
8. **Multiple-choice answer order must never be predictable.** Do not put the correct
   answer in the same position (e.g. always first) across a set of questions, and
   don't put it in the same position within a drag-and-drop answer bank as the slot
   it fills. This exact bug was found and fixed three times in one session — see §6.
   Vary it consciously every time you write MC questions.

---

## 3. Architecture — which file does what

- **`js/units-config.js`** — the only file that should change to register a new
  unit's (or milestone's) content. Plain data, no logic. Full schema is documented
  in the comment at the top of that file — read it before adding a unit.
- **`js/unit-engine.js`** — generic renderer for home cards + unit detail pages,
  driven entirely by `units-config.js` + `courseData` from the Worker. **Never
  hardcode a unit number in this file.** Also handles the `milestone: true` /
  `kicker` / per-unit `icon` config fields — see §5.
- **`js/index.js`** — shared app shell only (Telegram auth, nav, video modal,
  progress reporting). Calls `initLeaderboardAndProfile()` (from `js/leaderboard.js`)
  once inside `showApplication()` — that's the only line it knows about the
  leaderboard feature; keep it that thin.
- **`js/leaderboard.js`** — the first-run "what should we call you on the
  leaderboard" name prompt (skippable, re-editable later from the Profile page),
  and fetching/rendering the top-5 leaderboard card on the home page. Talks to the
  Worker's `/profile` and `/leaderboard` endpoints — see §5.
- **`worker/worker.js`** — a tracked copy of the Cloudflare Worker's source (see §1
  — this is reference only, deploying it is a manual step).
- **`js/common.js`** — shared utilities, including
  `SalimTeaches.showPostCheckActions(checkButtonId, backUnitId)`. Every exercise
  page must call this after checking answers — it swaps the check button for
  "← Ortga qaytish" / "🔁 Qayta ishlash". Pass `backUnitId` as the unit number to
  return to, or omit/pass a falsy value to go straight to the app's home page
  (used by milestone/progress-test pages, which have no unit detail page of their
  own to return to).
- **`css/base.css`, `css/components.css`, `css/activities.css`** — the shared visual
  system, used by **practice pages** (`unitN-practice.html`). **Test pages and
  listening/reading pages are self-contained** — each has its own embedded
  `<style>` block copied/adapted from a previous unit's test/listening/reading page,
  not the shared CSS files. (An earlier version of this handoff claimed all activity
  pages used the shared CSS system — that was inaccurate; this is the real, verified
  pattern as of this writing.) When building a new test/listening/reading page,
  copy the most recent equivalent page (e.g. `unit4-test.html`) as your starting
  template, not a practice page.
- **`activities/*.html`** — one HTML file per exercise. Each embeds its own
  `questions`/`data-answer` content and a `checkAnswers()`-style function. No shared
  exercise-rendering engine — each page is hand-built and kept internally consistent.

---

## 4. Mandatory answer-checking rule

Every free-text answer check must be case-insensitive and forgiving of
punctuation/apostrophe style (students type "isn't", "isn't" with a curly quote, or
"isnt" with no apostrophe at all — all must count as correct). Use exactly this
normalize function, standardized across the whole site:

```js
function norm(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}
```

(In `js/common.js` this is exposed as `SalimTeaches.normalizeAnswer`; in
self-contained test/listening/reading pages it's usually redefined locally as
`norm()` or `normalize()` — same logic, different name.)

---

## 5. Database conventions

### Regular units
The Worker looks up activities by `unit_id` + `activity_type`, not by row ID — IDs
can be anything, but `activity_type` must be exactly one of: `lesson`, `workbook`,
`practice`, `listening`, `reading`, `test`. `is_required` is `1` for everything
except `workbook` (always optional, `is_required = 0`, never tracked in the
front-end at all). Example (Unit 1's real data):

```sql
INSERT INTO activities (unit_id, activity_type, title, sort_order, is_required) VALUES
(1, 'lesson',    'Dars',                1, 1),
(1, 'workbook',  'Workbook tahlili',    2, 0),
(1, 'practice',  'Interaktiv mashqlar', 3, 1),
(1, 'listening', 'Listening mashqi',    4, 1),
(1, 'test',      'Unit Test',           5, 1);
```

The `units` table needs a row too — **`sort_order` is `NOT NULL`** (this bit us once;
the error was `NOT NULL constraint failed: units.sort_order`). Note some future
units may already have a **placeholder row** sitting in `units` from earlier planning
— always `SELECT * FROM units WHERE unit_id = N;` first and use `UPDATE` instead of
`INSERT` if a row already exists, rather than assuming it's empty.

```sql
INSERT INTO units (unit_id, title, description, is_available, sort_order) VALUES
(N, 'Unit Title', 'Uzbek description.', 1, <sortOrder from units-config.js>);
```

**Critical:** a unit's exercise pages being built and pushed is not enough on its
own. If the `activities` rows aren't inserted, the app's lock logic treats those
activities as "not registered yet" and — deliberately, for a different reason — does
NOT block the test on them, so the test can unlock prematurely. **Always give the
INSERT statements for a new unit's `activities` rows before considering it done.**

### Progress-test milestones (new this project — added between Unit 3 and Unit 4)
Every third unit gets a "progress test" milestone card between it and the next unit.
This is modeled as a **fake unit** in `units-config.js` with `milestone: true`:

```js
{
  id: 1001,              // pick a number OUTSIDE the real 1,2,3... unit range
  sortOrder: 4,           // controls chain position; bump every real unit after it
  milestone: true,
  kicker: "Nazorat testi",          // overrides the "Unit N" label on the home card
  title: "1–3 Unit oraliq testi",
  description: "…",
  icon: "🏁",                        // optional, overrides the default 📖 icon
  activities: [
    { type: "test", icon: "📝", title: "Oraliq test",
      subtitle: "Unitni tugatish uchun kamida 70% kerak.",
      file: "progress-test-N.html" }
  ]
}
```

`milestone: true` makes `unit-engine.js`'s `openUnit()` skip the detail page and
jump straight into the test file (no lesson/practice/etc. — just the test). It still
unlocks exactly like a normal unit (previous entry's test passed ≥70%, via
`sortOrder`), and the *next* real unit unlocks once the milestone's test is passed —
all through the existing generic unlock chain, no special-casing needed beyond the
`milestone` flag itself. DB-wise it's just a normal `units` + one `activities` row
(`activity_type = 'test'`) with that same fake `unit_id`.

Progress-test pages you build for these should use `SalimTeaches.showPostCheckActions("check", null)`
(no unit to go back to) — see §3's note on `common.js`.

### Leaderboard (new — added after Unit 4)

Home page shows a top-5 leaderboard card right after the welcome section, plus the
current student's own rank if they're not in the top 5. Two new Worker endpoints
(both POST, both authenticated via `initData` exactly like `/progress`):

- **`/profile`** — `{ initData, display_name }` → saves a student-chosen display
  name (max 40 chars, trimmed). Telegram `first_name`/`username` are NOT used for
  the leaderboard — they're unreliable (many students don't set their real name on
  Telegram) — so there's a separate `students.display_name TEXT` column, populated
  by a first-run modal (skippable) and editable any time from the Profile page.
  Falls back to Telegram `first_name`, then `"Talaba"`, if never set.
- **`/leaderboard`** — `{ initData }` → `{ success, leaderboard: [top5], you: {...} }`.
  Ranks **every** student (including zero-activity ones, via `LEFT JOIN`) by a
  points formula — see the comment above `getLeaderboard()` in `worker/worker.js`
  for the exact numbers (currently: 10 pts per completed practice/listening/reading,
  15 + `round(score/5)` pts per passed test). Ties broken by earliest `joined_at`.
  **Adjust the points numbers directly in that SQL CASE expression** if the teacher
  wants different weighting — it's the only place the formula lives.

`/auth`'s response now also includes `user.display_name` — the front end
(`js/leaderboard.js`) shows the first-run modal when that's empty/null.

Migration this needed (already run once, but note it for any fresh DB):

```sql
ALTER TABLE students ADD COLUMN display_name TEXT;
```

---

## 6. Known pitfalls — read before repeating them

- **MC/drag-bank answer-order predictability.** Fixed 3 times in one session
  (Unit 1 §C, Unit 2 §D, Progress Test 1 §F drag banks; Unit 3 §E and the Unit 4
  practice/reading pages' MC options). The fix each time: check the actual position
  of the correct answer across a set of questions/slots and make sure it's not
  clustered on one position. See §2 point 8.
- **`units` table `sort_order` is `NOT NULL`.** A bare `INSERT INTO units (unit_id,
  title, description, is_available)` will fail with `SQLITE_CONSTRAINT_PRIMARYKEY`/
  `NOT NULL constraint failed: units.sort_order`. Always include it.
- **A `units` row may already exist for a not-yet-built unit** (a placeholder from
  earlier planning, e.g. with an older working title). Check with `SELECT` first,
  `UPDATE` if present.
- **Test/listening/reading pages are self-contained HTML**, not built on
  `css/activities.css` — don't assume otherwise when starting a new one; copy the
  most recent sibling page instead (see §3).
- **Unit 3's regression** (documented, don't reintroduce): unlock logic must never
  depend on `is_available` except for the very first unit in the whole sequence.
- **`tg.initData` (Telegram WebApp SDK) is a getter-only property** — you cannot
  mock it with a plain `tg.initData = "..."` assignment when testing index.html
  outside real Telegram (the assignment silently no-ops). It'll just stay `""`. If
  you need to test code gated on `tg.initData` being truthy, either restructure the
  test to bypass that specific guard, or accept you can only verify the guard
  correctly blocks the call (which is itself useful — it proves the code won't
  hit the real backend with empty auth data outside Telegram).

---

## 7. Status — what's done

- ✅ Config-driven unit engine — adding a unit's home/detail page is just data in
  `units-config.js`.
- ✅ Post-check "back/retry" buttons standardized across every exercise page.
- ✅ Unlock-chain bug fixed and documented (§6).
- ✅ Answer normalization (case/punctuation/apostrophe leniency) standardized site-wide.
- ✅ Units 1–3: fully complete (lesson, practice, listening/reading, test).
- ✅ **Progress Test 1** (milestone between Unit 3 and Unit 4): fully complete —
  60 questions across vocabulary/grammar/functional language/listening/reading,
  adapted from the official Straightforward Beginner materials, audio converted
  from the course CD (tracks 6 & 7 → `beginner-progresstest1-1.mp3` / `-2.mp3`).
- ✅ **Unit 4** ("Numbers, Age & Family"): fully complete — practice (30 Q), reading
  (3 original passages, 15 Q), test (50 Q from the official doc, writing section
  excluded per instruction). DB rows live.
- ✅ All practice pages (Units 1–4) share the same visual component system.
- ⏳ **Unit 3's workbook video** — not yet recorded. When ready, add
  `videoId: "..."` to Unit 3's `workbook` block in `units-config.js` — no DB change
  needed, its row already exists.
- ⏳ **Unit 4's workbook video** — same as above, add `videoId` to Unit 4's
  `workbook` block when recorded. No DB change needed.
- 🔶 **Leaderboard** — front-end (`js/leaderboard.js`, home page card, name-prompt
  modal, Profile page name field) is built and unit-tested (SQL logic verified
  against a real SQLite engine; front-end flow verified in a mocked browser
  session — see the conversation this was built in for details). **Not yet live**:
  needs the teacher to (1) run the `ALTER TABLE` migration above, and (2) paste
  `worker/worker.js`'s current content into the Cloudflare dashboard and deploy it.
  The front-end code was intentionally NOT pushed to GitHub Pages until both of
  those are confirmed done, to avoid every student seeing a name-prompt modal that
  can't actually save (old Worker has no `/profile` route yet). **If you're
  picking this up fresh: ask the teacher whether both steps are done before
  pushing anything home-page-related, or check the deployed Worker's `/` response
  isn't from a build that predates this feature.**

## 8. Status — what's next

Once the leaderboard is confirmed live (§7), **Unit 5**, using the standing
workflow in §9. Unit 5 is odd → it needs a **Listening** section (not Reading),
with a drafted dialogue script + questions handed to the teacher before the audio
exists (see §9). It needs `sortOrder: 6` in `units-config.js` (Unit 4 has 5; no
milestone sits between Unit 4 and Unit 5, so no gap to leave this time — the next
milestone comes after Unit 6, between Unit 6 and Unit 7).

---

## 9. Standing workflow — handling "let's start Unit N"

When the teacher says something like *"Let's start Unit N. Topics: […]. Here's the
test doc."* — per content type:

- **Practice (30 questions):** Write the questions based on the given topics.
  Match the visual structure of the most recent unit's practice page. Mix MC and
  fill-in-the-blank — don't make it 100% one type. **Watch the answer-order rule
  (§2.8).**
- **Reading (even units):** 3 short beginner-friendly original passages + 5
  questions per passage (15 total), mixing completion/MC/true-false.
- **Listening (odd units):** Can't generate audio. Draft the dialogue script
  (recurring characters: **Anna** — Russian-accented English, **Adam** — American),
  3 short scenes, hand it to the teacher to record via ElevenLabs. Draft the 15
  questions too. Naming convention: `beginner-unitN-1.mp3` / `-2.mp3` / `-3.mp3`.
  Don't build the final page until the real audio files exist (need the filenames,
  not the audio bytes, to build the page — but the page needs the actual files
  present to test playback).
- **Test:** Convert the uploaded doc faithfully into the styled interactive page —
  preserve the doc's real section structure rather than forcing a template. Light
  grammar fixes to fill-in-the-blank sections are OK if a sentence is incomplete —
  mention any such change.
- **Progress test milestone (only right after Unit 3, 6, 9…):** see §5.
- **After every piece:** update `units-config.js`, give the exact SQL INSERT for the
  new `activities` rows (and a `units` row/UPDATE — check first, see §6) — don't
  wait to be asked.
- **Before calling it done:** confirm the whole unit works the way every other unit
  does — test locked until practice + listening/reading complete, unit unlocks only
  after the previous unit's (or milestone's) test is passed.

---

## 10. How to work with the user (read this if you're a fresh Claude chat session)

**You almost certainly have no filesystem, git, or database access in this
conversation** — the teacher is using claude.ai chat (or similar), not Claude Code
with tools. That changes how you have to work:

1. **Getting context in:** the teacher will paste this file's contents (or upload it)
   at the start of the conversation, and may upload/paste specific `.html` files from
   `activities/` if you need to see or edit an existing page. Ask for a file's
   current content if you need it and don't have it yet — don't assume or
   reconstruct it from memory.
2. **Delivering your work:** since you can't push to GitHub, output the **complete
   file content** for anything you create or change, clearly labeled with its exact
   path (e.g. `activities/unit5-practice.html`), so the teacher can copy it in.
3. **The teacher's manual publishing steps** (walk them through this if needed):
   - **Editing an existing file:** on github.com, open the repo → navigate to the
     file → click the pencil icon (top right of the file view) → select all,
     paste your new content, replacing the old → scroll down → "Commit changes".
   - **Adding a new file:** in the repo, go to the right folder (e.g. `activities/`)
     → "Add file" → "Create new file" → type the filename → paste content →
     "Commit changes".
   - **Uploading a binary file (e.g. an mp3):** "Add file" → "Upload files" →
     drag the file into `audio/` → "Commit changes".
   - Changes land on `main` and go live on GitHub Pages within a minute or two.
4. **Database changes:** always give exact SQL (see §5 for the required shape),
   clearly say what it does, and tell the teacher to run it in the Cloudflare D1
   console. Never claim a DB change is done unless they've told you they ran it.
   If a query errors, ask them to paste the exact error back (as happened with the
   `NOT NULL` and `UNIQUE constraint` errors in §6) rather than guessing twice.
5. **Verification:** you can't run a browser or preview server from chat. Ask the
   teacher to open the page in Telegram (or paste back what they see / any console
   errors) rather than assuming it works. Where relevant, reason through the
   scoring logic by hand instead (e.g. "check that every `data-answer` matches a
   real button `data-value`") since you can't execute the JS yourself.
6. **Keep this file current.** After finishing a unit or fixing something
   non-obvious, update the relevant section here (§7/§8 status, §6 pitfalls if you
   hit a new one) and give the teacher the updated `README.md` content to commit,
   the same way you'd hand off any other file. This file is the only memory a
   future session has.
