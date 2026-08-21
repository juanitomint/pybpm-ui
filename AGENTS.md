# AGENTS.md — pybpm-ui/

## Purpose

The user-facing React application for the DNA2BPM suite. Replaces the legacy ExtJS-based UI (Case Manager, Dashboard, Inbox) with a modern SPA. Communicates exclusively with `pybpm-api` over REST.

## Tech Stack

- **Framework**: Next.js 14+ App Router + TypeScript
- **Build tool**: Next.js (`next dev`, `next build`)
- **Routing**: Next.js App Router (`app/` directory)
- **Data fetching**: TanStack Query (React Query) v5
- **HTTP client**: Axios with auth interceptors
- **Styling**: Tailwind CSS v4

## Architecture

```
pybpm-ui/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout — wraps children in Providers (QueryClientProvider)
│   ├── page.tsx            # Home — redirects to /login
│   ├── globals.css         # Tailwind imports + global styles
│   ├── providers.tsx       # Client component wrapping with TanStack Query provider
│   └── login/
│       └── page.tsx        # Login placeholder (Tailwind styled)
├── src/                    # Shared utilities (framework-agnostic)
│   ├── api/
│   │   └── client.ts       # Axios instance with JWT interceptor and 401 redirect
│   └── hooks/
│       └── useAuth.ts      # Auth state: login/logout/me via pybpm-api /auth/* endpoints
├── next.config.ts          # Next.js config — API proxy in dev mode
├── postcss.config.mjs      # Tailwind CSS v4 PostCSS plugin
├── tsconfig.json           # TypeScript strict config for Next.js App Router
└── package.json            # Dependencies (React, Next.js, TanStack Query, Axios, Tailwind)
```

## Task Lifecycle

Tasks (BPMN token instances) follow a four-state lifecycle. The UI renders them into columns by querying the API with specific filters per column. **All queries must be authenticated** — use `api` (from `src/api/client.ts`) for every request; the client injects the JWT automatically.

### Loading rules

Each column has its own query. Tasks are loaded separately per column — never mix filter criteria across columns in a single call:

| Column | Filter | API behavior |
|--------|--------|-------------|
| **Pending** | `status = 'user'` AND token is **not locked** | GET `/dashboard/tasks` (or equivalent paginated endpoint) — returns unlocked tokens assigned to the current user |
| **In-progress** | `status = 'user'` AND token is **locked** by the current user | GET same endpoint, filter locally for `lockedBy === currentUser.id`; or use a dedicated `/tasks/progressing` endpoint if one exists |
| **Validating** | `status = 'validating'` | GET with status filter; returned as its own list (separate query from pending/in-progress) |
| **Done** | `status = 'done'` | Separate query entirely — do not mix done tasks into the other columns |

When loading, always fetch counts first (`GET dashboard/tasks/count`) so the UI can render column headers with numbers (e.g. "Pending (3)"). Then load the paginated task lists per column.

### Transitions

All transitions use `PATCH /dashboard/tasks/{idtoken}/status` with body `{ target_status: "<new-status>" }`. The endpoint returns the previous and new status for optimistic UI updates.

| Transition | Action on API |
|-----------|---------------|
| **pending → in-progress** | Lock the task first (set `lockedBy = currentUser.id`, `lockTimestamp = now`), then call PATCH with `target_status: "user"`. The lock tells other users this person is working on it. |
| **in-progress → pending** | Unlock the task (clear `lockedBy` and `lockTimestamp`), then call PATCH with `target_status: "user"`. The task returns to the pending pool for reassignment. |
| **in-progress → validating** | Call PATCH with `target_status: "validating"`. No lock change needed — the validator takes over from here. |
| **validating → in-progress** | Call PATCH with `target_status: "user"` and re-lock the task if returning to the original owner, or leave unlocked for reassignment. The status reverts so it appears back in pending/in-progress columns. |

### Implementation notes

- Use TanStack Query mutations (`useMutation`) for transitions — they handle loading states, error boundaries, and refetch automatically.
- After a successful transition, invalidate the affected column's query key (e.g. `['tasks', 'pending']`) so TanStack Query refetches that column without affecting others.
- Handle 409 Conflict if a user tries to lock a task already locked by another user — show a toast and refresh the pending list.
- The `TaskListItem` schema from pybpm-api carries three lock-related fields: ``locked_by`` (int | null, raw FK for local filtering — compare against ``currentUser.id`` to determine in-progress vs pending), ``locked`` (bool), and ``locked_by_nick`` (str | null, display name).

## Connecting to the API

In development mode, `next dev` proxies `/api/*` requests to `pybpm-api-app:5000` (Docker Compose service). In production, a reverse proxy (nginx/Caddy) serves both frontend and API.

Key pybpm-api endpoints this UI will consume:

| Area | Endpoints | Status |
|------|-----------|--------|
| Auth | `POST /auth/token`, `GET /auth/me` | Ready in pybpm-api |
| Repository | `/bpm/repository/*` (save, load, svg, shapes) | Ready for editor integration |
| Case Manager | TBD — engine endpoints (`/bpm/engine/*`) | Pending port from legacy |
| Dashboard/KPIs | TBD | Pending port from legacy |
| Inbox | TBD | Pending port from legacy |

## Development Workflow

### Install & Run

```bash
npm install
npm run dev        # Starts Next.js dev server on :3000 with proxy to pybpm-api
```

### Build & Start

```bash
npm run build      # Produces optimized production bundle in .next/
npm start          # Serves production build on :3000
```

### Lint & Format

```bash
npm run lint       # ESLint checks
npm run format     # Prettier formatting
```

### Port Conventions

- **Port 3000** — Reserved for the Next.js development server (`next dev`) and production builds. **Never kill or override port 3000** in tests, scripts, or automation.
- **Port 3001+** — Use for test runs, CI jobs, background processes, or any non-primary service that needs a HTTP listener. Always pass `PORT=3001` (or higher) explicitly when launching test instances.

This prevents accidental shutdown of the dev server during testing workflows and keeps production deployments stable.
## Testing

E2E tests use [Playwright](https://playwright.dev/) and live under `tests/e2e/`. Run from the repo root (`pybpm-ui/`):

```bash
npx playwright test                  # run all E2E suites
npx playwright test login            # run only the login suite
npx playwright test --grep "dashboard"  # filter by title tag
npx playwright test --headed         # open browser UI (interactive)
npx playwright test --debug          # launch Inspector + paused execution
```

### Screenshots & traces

The Playwright config (`playwright.config.ts`) captures:

| Asset | When captured | Location |
|---|---|---|
| **Screenshot** | on test failure only | `@test-results/<suite>-<test>-attempt-<N>.png` |
| **Trace (zip)** | on retry (CI: 2 retries) | `@test-results/trace.zip` per attempt |
| **Video** | not configured — add to capture full runs | `npx playwright show-trace @test-results/<trace>` |

To always capture screenshots regardless of pass/fail, set the environment variable:
```bash
npx playwright test --screenshot=on   # screenshot every run
npx playwright test --screenshot=only-on-failure  # default (matches config)
```

Screenshots and traces land in `@test-results/` — committed to `.gitignore` via the Playwright defaults. Inspect failures with:

```bash
npx playwright show-report @test-results   # HTML report
npx playwright show-trace @test-results/<trace>  # trace viewer
```

### Running against a dev server

Tests expect `next dev` on port **3000**. Start it in one terminal before running:

```bash
npm run dev          # ← one terminal, keep alive
npx playwright test  # ← another terminal
```

CI runs against the same URL but retries flaky tests (2×) with full traces.

## Git & Commits

All git operations run from within `pybpm-ui/` — never in the parent workspace folder.

Use **Conventional Commits** with **Semantic Versioning**. The `.githooks/commit-msg` hook enforces formatting.

### Commit format
```
<type>(scope): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Examples:
- `feat(dashboard): add KPI widget grid layout`
- `fix(case-manager): handle null tokens in case list`
- `chore: update dependency versions`

## Design Decisions

1. **Next.js App Router over Vite** — built-in SSR/SSG capabilities, file-based routing, API routes support, and better SEO for future public-facing pages.
2. **Tailwind CSS v4** — utility-first styling with PostCSS plugin, no Tailwind CLI build step needed, smaller bundle sizes via purging.
3. **TanStack Query over Redux/Zustand** — server state belongs in TanStack Query; only UI state goes in a lightweight store if needed later.
4. **TypeScript strict mode** — catches bugs early, matches pybpm-api's type-safe approach with Pydantic.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
