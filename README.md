# LifeOS — Personal Life Dashboard

A personal productivity dashboard that brings tasks, habits, academic deadlines, study
sessions, expenses, notes, and bookmarks into one place. Built as a practical daily tool and
as a portfolio project.

**Current status: Stages 1–6 complete** — foundation, design system, dashboard, task manager,
academic planner, habit tracker, study tracker, expense tracker, notes, bookmarks, and
Firebase auth + Firestore data access with saved account preferences (profile, theme, time
zone, date format). Planner and bill email reminders run through GitHub Actions — see
[Planner and bill email reminders](#planner-and-bill-email-reminders). See [Roadmap](#roadmap).

## Tech stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Frontend   | React 19 + TypeScript (strict)                      |
| Build tool | Vite                                                 |
| Styling    | Tailwind CSS v4                                      |
| Database   | Cloud Firestore (Firebase)                          |
| Auth       | Firebase Auth (stage 6) + Firestore security rules  |
| Charts     | Recharts                                            |
| Icons      | Lucide React                                        |
| Jobs       | GitHub Actions schedule + Firebase Admin SDK + nodemailer (Gmail SMTP) |
| Tests      | Vitest                                              |
| Versioning | Git + GitHub                                        |

No other runtime dependencies are used on purpose.

## Getting started

### Prerequisites

- Node.js 20+ and npm

### Install and run

```bash
npm install
npm run dev        # http://localhost:5173
```

### Available scripts

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start the Vite dev server                      |
| `npm run build`       | Type-check (`tsc -b`) and build for production |
| `npm run preview`     | Serve the production build locally             |
| `npm run typecheck`   | Type-check without emitting                    |
| `npm test`            | Run the Vitest test suite once                 |
| `npm run test:watch`  | Run tests in watch mode                        |

## Firebase setup

The app runs on sample data until Firebase is configured; once `.env` exists, the app
requires sign-in and reads real data:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a **Web app** (the `</>` icon) and copy its config values.
3. Copy `.env.example` to `.env` and paste them:

   ```bash
   cp .env.example .env
   ```

   ```bash
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

4. In the console, enable **Authentication → Sign-in method → Email/Password** and create
   a **Firestore Database** (production mode).
5. Deploy the security rules (step 6 does this too):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore        # choose existing firestore.rules / firestore.indexes.json
   firebase deploy --only firestore:rules,firestore:indexes
   ```

6. Restart the dev server.

**Security rules**

- Authorization lives in [`firestore.rules`](firestore.rules): every document carries a
  `userId`, and each rule only allows the signed-in user (`request.auth.uid`) to read or
  write their own. Queries must filter by `userId` or Firestore rejects them.
- The Firebase web config in `.env` is **public by design** — the browser ships it anyway.
  Security comes from the rules, not from hiding it. Never put a service-account key or
  server SDK config in client code.
- The app never bypasses the rules: the browser SDK only ever attempts what they allow.

## Data model (Cloud Firestore)

Top-level collections, one user's data per document (all guarded by `userId`):

| Collection        | Purpose                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `users/{uid}`     | Profile: display name, email for reminders, notification prefs, theme, time zone, date format (created on sign-up) |
| `subjects`        | Courses/terms                                                         |
| `projects`        | Academic or personal projects (status, priority, due date)            |
| `academicItems`   | Assignments, exams, and milestones (`kind`, `progress` 0–100)         |
| `tasks`           | General tasks; optional links to a subject and an academic item       |
| `habits`          | Daily/weekly habits with targets                                      |
| `habitCompletions`| One doc per habit per day — **deterministic id** `${habitId}_${YYYY-MM-DD}` prevents duplicates |
| `studySessions`   | Timed sessions; the app enforces one live session per user in a transaction |
| `transactions`    | Income and expenses (PHP, positive `amount` + `type`)                 |
| `bills`           | Upcoming one-time or monthly dues (`title`, amount, due date, paid state) |
| `budgets`         | One doc per user per month — deterministic id `${uid}_${YYYY-MM}`     |
| `notes`           | Titles, content, tags, pinning                                        |
| `bookmarks`       | URL-validated links with categories                                   |

**Rules file:** [`firestore.rules`](firestore.rules) — ownership checks plus field validation
(statuses, priorities, progress ranges, positive amounts, `http(s)://` URLs).
**Indexes file:** [`firestore.indexes.json`](firestore.indexes.json) — intentionally empty for
now: every query filters by `userId` (covered by Firestore's automatic single-field index)
and sorting/filtering happens in `src/lib/derive.ts`, which is unit-tested. Add composite
indexes here when a query needs server-side ordering.

**What Firestore does *not* give us for free** (and where it's handled):

- *UNIQUE constraints* → deterministic document IDs (same id ⇒ same doc, not a duplicate).
- *One running study session per user* → enforced in application code with a
  read-then-write transaction in stage 4, documented in the rules.
- *Cascade deletes* → batched multi-document deletes in code (stage 6).

## Project structure

```
├── firebase.json              # Firebase CLI config: rules and indexes
├── .firebaserc                # Default project (dashboard-85f1d)
├── firestore.rules            # Authorization: per-user ownership + field validation
├── firestore.indexes.json     # Composite indexes (empty by design — see above)
├── .env.example               # Public Firebase web config placeholders
├── functions/                 # Daily Planner + bill digest runner
│   └── src/
│       ├── index.ts           # GitHub Actions entry point
│       ├── sendDigest.ts      # Firestore reads + email delivery
│       └── digest.ts          # Pure selection + email rendering (unit-tested)
├── .github/workflows/
│   └── daily-email-reminders.yml # Daily run at 08:07 Asia/Manila
├── README.md
└── src/
    ├── components/
    │   ├── dashboard/      # Dashboard widgets (tasks, deadlines, habits, study, budget, notes, links)
    │   ├── layout/         # AppShell, Sidebar, ThemeToggle, nav config
    │   ├── tasks/ planner/ habits/ expenses/ notes/ bookmarks/   # Feature components (dialogs, rows)
    │   └── ui/             # Reusable primitives: Button, Card, Badge, ProgressBar, EmptyState …
    ├── data/               # Development sample data (clearly labelled, swappable)
    ├── hooks/              # useCollection (live data) + one domain hook per feature
    ├── lib/                # Pure logic: dates, format, derive, academic, habit, study, finance, notes, bookmarks, firebase client
    ├── pages/              # One file per route
    ├── types/              # Domain types mirroring the Firestore data model
    └── index.css           # Design tokens (theme variables) and base styles
```

## Design system

- **Color:** neutral surfaces plus a single blue accent, exposed as CSS variables
  (`--canvas`, `--surface`, `--line`, `--ink`, `--accent`, …) and mapped to Tailwind through
  `@theme inline`, so every utility follows the active theme automatically.
- **Themes:** dark by default; light and "follow system" optional; the choice is applied
  before first paint (no flash) and persisted per device.
- **No gradients, glassmorphism, glow, or decorative animation.** Borders are subtle,
  shadows restrained, motion limited to 150 ms color transitions — and disabled entirely
  under `prefers-reduced-motion`.
- **Radius scale:** `rounded-md` for buttons/inputs/nav items, `rounded-lg` for cards,
  `rounded-full` for badges and progress bars.
- **Status is never color-only:** every state also carries text and, where useful, an icon
  ("2 days overdue" with a warning icon, percentages next to progress bars).
- **Navigation:** persistent sidebar on desktop; sticky top bar with an accessible drawer
  (Escape closes, focus is managed, background scroll locked) on smaller screens.

## Auth and data access (pulled forward from stage 6)

- **Sign-in flow:** `/signin` handles sign-up and sign-in with inline validation and
  friendly, mapped error messages ([`src/lib/errors.ts`](src/lib/errors.ts), unit-tested).
- **Session:** [`src/hooks/useAuth.ts`](src/hooks/useAuth.ts) mirrors Firebase's
  `onAuthStateChanged` into a shared store; `RequireAuth` in [`src/App.tsx`](src/App.tsx)
  redirects signed-out users to `/signin`. When Firebase isn't configured, the guard
  steps aside so local development keeps running on sample data.
- **Reads:** [`src/lib/firestore.ts`](src/lib/firestore.ts) loads the whole dashboard for
  the signed-in user in parallel, always filtered by `userId` (which is also what the
  rules require). First sign-in auto-creates the `users/{uid}` profile document.
- **Writes:** `createRecord` / `updateRecord` / `deleteRecord` stamp `userId` and
  timestamps so feature code (from stage 3 on) can't forget them.
- **States:** the dashboard shows loading, error-with-retry, and empty states — it never
  silently falls back to sample data once you're signed in.
- **Profile & preferences:** the Settings page edits your display name (synced to Firebase
  Auth) and saves theme, time zone, and date format to `users/{uid}` via
  [`usePreferences`](src/hooks/usePreferences.ts) (shared store). The time zone drives the
  dashboard's date and greeting; the date format drives every full-date display including
  far-off due dates. A device that never picked a theme adopts the account's on first load.

## Sample vs. real data

Development sample data lives only in [`src/data/sample.ts`](src/data/sample.ts):

- every id starts with `sample-` and the user id is `sample-user`;
- the dashboard shows a visible **Sample data** badge whenever it is in use;
- [`src/hooks/useDashboardData.ts`](src/hooks/useDashboardData.ts) is the single seam:
  sample data when Firebase is unconfigured, Firestore data once signed in — the widgets
  consume the same `DashboardData` shape either way.

## Stage 4 — planner, habits, study tracker

All three features read through the generic [`src/hooks/useCollection.ts`](src/hooks/useCollection.ts)
live-subscription hook (shared with tasks), so each page gets streaming updates, loading/
error/retry states, read-only sample mode, and `userId`-stamped writes for free.

- **Academic planner** (`/planner`): subjects/courses with add/edit/delete (deleting a
  subject detaches its items instead of leaving dangling ids), plus assignments, exams, and
  milestones with priority, status (not started → in progress → completed), due dates, and
  a 0–100 progress bar. Upcoming/All/Completed list views with search and type/subject
  filters, or a month calendar that places items on their due dates. Open deadlines also
  feed the dashboard's "Upcoming deadlines" widget.
- **Habit tracker** (`/habits`): daily and weekly habits (weekly ones carry a times-per-
  week target), one tap to mark any day, current and best streaks (today-pending keeps the
  streak alive), a 14-day history strip, weekly progress, and monthly completion rate.
  Completions are written with the deterministic id `${habitId}_${YYYY-MM-DD}` — one record
  per habit per day by construction, documented in `firestore.rules`. Deleting a habit
  cascades to its completion history; habits can be archived and restored instead.
- **Study tracker** (`/study`): start/pause/resume/stop sessions linked to a subject, with
  an optional note on stop. Elapsed time is always derived from stored timestamps
  (`durationSeconds` banked + live segment from `segmentStartedAt`), so a reload or closed
  tab never loses time. At most one session can be active — the start guard explains why —
  and a session open for 12+ hours gets a reminder to stop or discard. Daily/weekly totals
  and the weekly bar chart update live; discarded sessions never count.

## Stage 5 — expenses, notes, bookmarks

- **Expense tracker** (`/expenses`): income and expenses in Philippine pesos with a category,
  date, and description. A month navigator scopes the summary, list, and charts; the summary
  shows income, expenses, remaining budget (or over-budget), and a budget progress bar. The
  budget is stored one document per month with the deterministic id `${uid}_${YYYY-MM}`, so
  editing a month never rewrites another. Spending is broken down by category (solid bars,
  largest first, with the same numbers listed underneath) and compared month-to-month for the
  last six months. The list filters by month, type, category, and free-text search.
- **Notes** (`/notes`): create, edit, pin, unpin, and delete notes with a title, body, and
  comma-separated tags (trimmed, de-duplicated case-insensitively). Pinned notes sort first,
  then most recently edited; search covers titles, bodies, and tags, and tags double as quick
  filters. Notes feed the dashboard's "Recent notes" widget.
- **Bookmarks** (`/bookmarks`): a title, URL, category, and optional description. URLs are
  normalized (`react.dev` → `https://react.dev/`) and validated as http(s) only, so a
  `javascript:` or `data:` link can never be saved — the same check exists in
  `firestore.rules`. Links open in a new tab with `rel="noopener noreferrer"`, and the list
  searches titles/URLs/descriptions and filters and sorts by category or title.

All three read through [`src/hooks/useCollection.ts`](src/hooks/useCollection.ts), so they
share streaming updates, loading/error/retry states, read-only sample mode, and
`userId`-stamped writes with the earlier features.

## Planner and bill email reminders

LifeOS can email a **daily reminder digest** — Planner assignments, exams, milestones, and
unpaid bills that are due inside your lead window, plus anything already overdue. Add
one-time or monthly payments from **Bills & dues**; marking a monthly bill paid advances its
due date by one month. Preferences live in
**Settings → Email reminders** (recipient, on/off, and 1/2/3/5/7 days of warning).

A browser can't email you while the app is closed, so the digest runs from a scheduled
GitHub Actions workflow at [`.github/workflows/daily-email-reminders.yml`](.github/workflows/daily-email-reminders.yml):

- runs once a day at **08:07 Asia/Manila** (00:07 UTC); GitHub may delay scheduled jobs during
  high load;
- reads open `academicItems` and unpaid `bills`, groups both by `userId`, so one user's email can
  never contain another user's records;
- skips users with reminders off, no email address, or `lastDigestOn` already set to today —
  one digest per user per day even if the schedule retries;
- sends through **Gmail SMTP** with an app password, so the mail comes from your own address;
- uses the same pure logic in [`functions/src/digest.ts`](functions/src/digest.ts) that the
  Vitest suite covers (lead-window boundary, overdue grouping, HTML escaping).

### One-time setup

1. **Deploy the Firestore rules** from the project root so your account can create and manage
   bill records. This does not deploy a Cloud Function or require Blaze:

   ```bash
   firebase login
   firebase use dashboard-85f1d
   firebase deploy --only firestore:rules
   ```

2. **Create a dedicated Google Cloud service account** for the digest in project
   `dashboard-85f1d` from the [Service Accounts page](https://console.cloud.google.com/iam-admin/serviceaccounts?project=dashboard-85f1d).
   Grant it the **Cloud Datastore User** role (`roles/datastore.user`), which lets the job read
   and update Firestore documents. Create a JSON key and keep the downloaded file private;
   never commit it to the repository.
3. **Create a Gmail app password:** open [Google Account security](https://myaccount.google.com/security),
   enable 2-Step Verification, then open App passwords and generate one for “Mail”. Use the
   generated password, not your normal sign-in password.
4. In the repository's [Actions secrets settings](https://github.com/liamsamyel/life-dashboard/settings/secrets/actions), add these repository
   secrets:

   | Secret | Value |
   | --- | --- |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | Entire contents of the service-account JSON key file |
   | `GMAIL_USER` | Gmail address that sends the digest |
   | `GMAIL_APP_PASSWORD` | The generated app password |

   Optionally add an `APP_URL` repository variable with the URL to your planner page.
5. **Commit and push the workflow to the repository's default branch.** In GitHub, open
   **Actions → Daily email reminders → Run workflow** to trigger a first run. Check that run's
   log for `Deadline digest complete`. Scheduled runs then happen daily at 08:07 Manila time.
6. In LifeOS, sign in, add bills under **Bills & dues**, and enable **Settings → Email reminders**.

The job uses a service-account key because it runs outside Google Cloud. Keep that key only in
GitHub's encrypted Actions secrets and rotate or revoke it if it is ever exposed. The old
Vercel cron has been removed from this repository. If it or the old Firebase scheduled
function is already live, disable it before turning on the GitHub schedule to prevent duplicate
emails.

## Testing

```bash
npm test
```

Vitest covers the logic that is easy to get wrong and cheap to verify:

- `src/lib/dates.test.ts` — week starts, ISO parsing, calendar arithmetic
- `src/lib/format.test.ts` — peso formatting, durations, relative due dates
- `src/lib/derive.test.ts` — task grouping, progress, study buckets, budget math, habit stats
- `src/data/sample.test.ts` — invariants of the sample dataset (no future money/sessions)
- `src/lib/errors.test.ts` — Firebase auth/Firestore error codes → friendly messages
- `src/lib/taskForm.test.ts` — task form validation, normalization, edit pre-fill
- `src/lib/derive.test.ts` also covers `filterAndSortTasks`: views, search, category,
  and all three sort orders
- `src/lib/academic.test.ts` — planner forms, filters, stats, month calendar grid
- `src/lib/habit.test.ts` — duplicate-proof completion ids, streaks, weekly/monthly rates
- `src/lib/study.test.ts` — timer segments, transitions, start guard, daily minutes
- `src/lib/finance.test.ts` — amount parsing, transaction validation, month/budget ids,
  filters, category breakdown, six-month trend
- `src/lib/notes.test.ts` — tag parsing/de-duplication, note validation, excerpts,
  pinned-first ordering and search
- `src/lib/bookmarks.test.ts` — URL normalization and http(s) validation (rejects
  `javascript:`/`data:`), form validation, category filtering and sorting
- `src/lib/notifications.test.ts` — reminder email validation and lead-day clamping
- `functions/src/digest.test.ts` — time-zone “today”, lead-window selection, overdue grouping,
  subject lookup, and escaped email rendering (the suite covers `functions/` too)

Component and workflow tests (including auth flows) are added in stage 7.

## Roadmap

| Stage | Scope                                                              | Status  |
| ----- | ------------------------------------------------------------------ | ------- |
| 1     | Project structure, dependencies, data model design, setup commands | ✅ Done |
| 2     | Design system, sidebar/navigation, responsive dashboard layout     | ✅ Done |
| 3     | Task manager with persistent CRUD, filters, search, sorting        | ✅ Done |
| 4     | Academic planner, habit tracker, study tracker                    | ✅ Done |
| 5     | Expenses, notes, bookmarks                                        | ✅ Done |
| 6     | Firebase Auth, rules-backed data access, profile & preferences    | ✅ Done |
| 7     | Automated tests, bug fixes, responsive polish                      | ⬜ Next |
| 8     | Deployment and portfolio presentation (screenshots, write-up)      | ⬜      |
| Extra | Planner and bill email reminders (GitHub Actions + Gmail SMTP) | ✅ Done |

## Deployment (stage 8)

- **Frontend:** deploy the Vite build to Firebase Hosting (`firebase init hosting` +
  `firebase deploy --only hosting`) or any static host (Netlify, Vercel, Cloudflare Pages);
  set the six `VITE_FIREBASE_*` variables in the host's build settings.
- **Rules and indexes:** ship them from version control with
  `firebase deploy --only firestore:rules,firestore:indexes`, so security changes stay
  reviewable in Git like schema migrations would be.

## License

For portfolio and personal use.
