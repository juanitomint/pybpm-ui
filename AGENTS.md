# AGENTS.md — pybpm-ui/

## Purpose

The user-facing React application for the DNA2BPM suite. Replaces the legacy ExtJS-based UI (Case Manager, Dashboard, Inbox) with a modern SPA. Communicates exclusively with `pybpm-api` over REST.

## Tech Stack

- **Framework**: Next.js 16 App Router + TypeScript (see `node_modules/next/dist/docs/` for current APIs — this major has breaking changes vs. training data)
- **Build tool**: Next.js (`next dev`, `next build`)
- **Routing**: Next.js App Router (`app/` directory)
- **Data fetching**: TanStack Query (React Query) v5
- **HTTP client**: Axios with auth interceptors
- **Styling**: Tailwind CSS v4
- **Icons**: [Lucide](https://lucide.dev/) — beautiful & consistent icon set (`lucide-react`)
- **Theming**: Semantic light/dark design tokens in `src/theme/colors.ts` (`Colors.light|dark`, `KanbanStatusColors`, `Brand`) — single source of truth; components reference MUI palette roles (`theme.palette.*`), never hex literals

## Architecture

```
pybpm-ui/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout — inlines pre-paint theme bootstrap script, wraps children in Providers
│   ├── page.tsx            # Home — redirects to /login
│   ├── globals.css         # Tailwind imports + global styles
│   ├── providers.tsx       # Client component: TanStack Query + ThemeContext/MUI ThemeProvider; exports useTheme()
│   └── login/
│       └── page.tsx        # Login placeholder (Tailwind styled)
├── src/                    # Shared utilities (framework-agnostic)
│   ├── api/
│   │   └── client.ts       # Axios instance with JWT interceptor and 401 redirect
│   ├── theme/
│   │   ├── colors.ts       # Semantic light/dark design tokens — the only file allowed to hold hex literals
│   │   ├── index.ts        # createAppTheme(mode) builds MUI v9 themes from tokens; re-exports constants
│   │   └── useAppTheme.ts  # System-aware mode hook: OS preference + localStorage "theme" persistence
│   └── hooks/
│       └── useAuth.ts      # Auth state: login/logout/me via pybpm-api /auth/* endpoints
├── next.config.mjs          # Next.js config (no rewrites — API calls go direct to pybpm-api)
├── postcss.config.mjs      # Tailwind CSS v4 PostCSS plugin
├── tsconfig.json           # TypeScript strict config for Next.js App Router
└── package.json            # Dependencies (React, Next.js, TanStack Query, Axios, Tailwind)
```

## Theming (light/dark)

- All colors come from `src/theme/colors.ts` (`Colors.light|dark`, `KanbanStatusColors`, `Brand`). Components must not contain hex literals — use MUI palette roles (`theme.palette.*`) or these tokens.
- The initial mode is resolved pre-paint by the inline script in `app/layout.tsx` (localStorage "theme", else OS preference) which sets a class on `<html>`; `useAppTheme()` keeps React state and the MUI theme in sync afterwards (live OS changes, other-tab storage events).
- SSR always renders light. Never adopt a non-light mode during first client render — React 19 fails hydration on MUI's theme-derived styles when server/client themes differ.

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
| **pending → in-progress** | `transitionTask` calls `PATCH /dashboard/tasks/lock` first (sets `lockedBy = currentUser.id`, `lockTimestamp = now`), then PATCH with `target_status: "user"`. The lock tells other users this person is working on it. |
| **in-progress → pending** | `transitionTask` calls `PATCH /dashboard/tasks/unlock` first (clears `lockedBy` and `lockTimestamp`), then PATCH with `target_status: "user"`. The task returns to the pending pool for reassignment. |
| **in-progress → validating** | Call PATCH with `target_status: "validating"`. No lock change needed — the validator takes over from here. |
| **validating → in-progress** | Call PATCH with `target_status: "user"` and re-lock the task if returning to the original owner, or leave unlocked for reassignment. The status reverts so it appears back in pending/in-progress columns. |

### Implementation notes

- Use TanStack Query mutations (`useMutation`) for transitions — they handle loading states, error boundaries, and refetch automatically.
- After a successful transition, invalidate the affected column's query key (e.g. `['tasks', 'pending']`) so TanStack Query refetches that column without affecting others.
- Handle 409 Conflict if a user tries to lock a task already locked by another user — show a toast and refresh the pending list.
- The `TaskListItem` schema from pybpm-api carries three lock-related fields: ``locked_by`` (int | null, raw FK for local filtering — compare against ``currentUser.id`` to determine in-progress vs pending), ``locked`` (bool), and ``locked_by_nick`` (str | null, display name).

## API Access Pattern (Direct Backend Calls)

PyBPM-UI calls pybpm-api **directly** — never through Next.js rewrites or proxy routes.

 Read `PYBPM_API_URL` from `.env`; fall back to `http://localhost:5000` in client code (`src/api/client.ts`, any raw `fetch()` call).
 Use `PYBPM_API_URL` (from `.env`) as the backend URL. Never expose it via `NEXT_PUBLIC_*` — that leaks into the browser bundle and forces a recompile on change.
### Verifying request payloads

Before writing or changing any API call, fetch pybpm-api's OpenAPI schema to confirm exact field names, types, and required/optional status:

```bash
# From pybpm-ui/, uses PYBPM_API_URL from .env (no NEXT_PUBLIC_ leak):
curl -s ${PYBPM_API_URL}/openapi.json | python3 -c "import sys,json; [print(p, '→', json.dumps(next((op['requestBody']['content']['application/json']['schema'] for op in m.get('operations',[{}]) if op.get('operationId')=='lock_task'),{}))) for p,m in sorted(json.load(sys.stdin)['paths'].items())]"
```

Use this as ground truth — do not guess body shapes from memory or legacy PHP code. If the schema disagrees with what you assumed, trust the schema and update the caller.

### Example: Axios client (`src/api/client.ts`)

```ts
import axios from 'axios';

const api = axios.create({ baseURL: process.env.PYBPM_API_URL || 'http://localhost:5000' });
// interceptors ...
export default api;
```

### Example: Raw fetch in a Server Component / Server Action

```ts
const res = await fetch(`${process.env.PYBPM_API_URL}/dashboard/tasks`, { headers: { cookie } });
```

Keep `next.config.mjs` rewrite rules empty — no `/api/*` → backend rewrites, no `/dashboard/*` proxies. The browser hits pybpm-api straight on port 5000; Next.js only serves static assets and SSR pages from port 3000.


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
npm run dev        # Starts Next.js dev server on :3000; client code calls pybpm-api directly on :5000
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
