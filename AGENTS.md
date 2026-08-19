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
