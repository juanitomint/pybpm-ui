# PyBPM UI

**Dashboard & Task Management Frontend** — a Next.js 16 application providing the user-facing dashboard, inbox, and task management interfaces for PyBPM.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (User)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │ Dashboard│  │  Inbox   │  │  Tasks   │   │
│  │  Page    │  │          │  │          │  │ Kanban   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│       │  POST /auth/token            │              │         │
│       │──────────────│──────────────│──────────────│         │
│       │  Bearer token stored in     │              │         │
│       │  localStorage               │              │         │
│       │              │              │              │         │
│       │  ┌───────────┴──────────────┴──────────────┴──────┐  │
│       │  │  React Components (Client-Side)               │  │
│       │  │  ┌──────────────────────────────────────────┐ │  │
│       │  │  │ @tanstack/react-query (data fetching)   │ │  │
│       │  │  │ MUI v9 (material components)            │ │  │
│       │  │  │ @dnd-kit (drag-and-drop kanban)         │ │  │
│       │  │  │ lucide-react (icons)                    │ │  │
│       │  │  └──────────────────────────────────────────┘ │  │
│       │  └────────────────────────────────────────────────┘  │
│       │              │              │              │         │
│       │  ┌───────────┴──────────────┴──────────────┴──────┐  │
│       │  │  src/api/client.ts (axios instance)           │  │
│       │  │  - Auto Bearer token injection                │  │
│       │  │  - 401 → clear token → redirect /login       │  │
│       │  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                    HTTP/JSON (via Next.js rewrites)
                              │
┌──────────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                     │
│                    (port 3000 dev / 5173 prod)               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Rewrite Rules (next.config.mjs)          │   │
│  │                                                      │   │
│  │  /api/v1/*  →  PYBPM_API_URL/api/v1/*               │   │
│  │                                                      │   │
│  │  Client Code              →  Rewrite Target          │   │
│  │  /api/v1/auth/token       →  http://backend:5000/... │   │
│  │  /api/v1/dashboard/*      →  http://backend:5000/... │   │
│  │  /api/v1/inbox/*          →  http://backend:5000/... │   │
│  │  /api/v1/bpm/engine/*     →  http://backend:5000/... │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              App Router Structure                     │   │
│  │                                                      │   │
│  │  app/                                                  │   │
│  │  ├── layout.tsx         Root layout (Providers)      │   │
│  │  ├── providers.tsx      QueryClient + MUI + Theme    │   │
│  │  ├── page.tsx           Redirect to /login           │   │
│  │  ├── login/page.tsx     Login page                   │   │
│  │  └── dashboard/         Protected dashboard          │   │
│  │      ├── layout.tsx     Dashboard shell (AppBar)     │   │
│  │      ├── page.tsx       Dashboard home (stats cards) │   │
│  │      ├── tasks/page.tsx Kanban board                 │   │
│  │      ├── inbox/page.tsx Inbox list                   │   │
│  │      └── inbox/message/[id]/page.tsx Message detail  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                              │
                    HTTP/JSON
                              │
┌──────────────────────────────────────────────────────────────┐
│                    pybpm-api (FastAPI:5000)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Auth          /api/v1/auth/token, /auth/me          │   │
│  │  Dashboard     /api/v1/dashboard/*                   │   │
│  │  Inbox         /api/v1/inbox/*                       │   │
│  │  Engine        /api/v1/bpm/engine/*                  │   │
│  │  Repository    /api/v1/bpm/repository/*              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React Server Components) |
| Language | TypeScript 5.6 |
| UI Library | MUI v9 (Material UI) |
| State Management | @tanstack/react-query v5 |
| HTTP Client | Axios (with interceptors) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Styling | Tailwind CSS v4 + Emotion (MUI) |
| Icons | lucide-react |
| Theming | Custom dark/light mode via ThemeContext |
| Testing | Playwright (E2E) |
| Linting | ESLint + TypeScript ESLint |
| Formatting | Prettier |

## Project Structure

```
pybpm-ui/
├── app/
│   ├── layout.tsx           # Root layout — wraps Providers
│   ├── page.tsx             # Root redirect → /login
│   ├── providers.tsx        # QueryClient + MUI Theme + ThemeContext
│   ├── globals.css          # Tailwind CSS import
│   ├── login/
│   │   └── page.tsx         # Login form (MUI Card + TextField)
│   └── dashboard/
│       ├── layout.tsx       # Dashboard shell — AppBar + Drawer nav
│       ├── page.tsx         # Dashboard home — stats cards
│       ├── tasks/
│       │   ├── page.tsx     # Kanban board (pending/in-progress/validating/done)
│       │   └── TaskTypeIcon.tsx # Task type icons (user, manual, script, etc.)
│       └── inbox/
│           ├── page.tsx     # Inbox message list (folder filter, pagination)
│           └── message/[id]/
│               └── page.tsx # Message detail (read, star, delete)
├── src/
│   ├── api/
│   │   ├── client.ts        # Axios instance with auth interceptors
│   │   └── README.md        # API client documentation
│   └── hooks/
│       └── useAuth.ts       # Auth hook (login, logout, user state)
├── public/images/tasktype/  # Task type icons (PNG)
├── tests/e2e/
│   ├── auth.spec.ts         # Login flow tests
│   ├── inbox.spec.ts        # Inbox tests
│   ├── tasks.spec.ts        # Task management tests
│   ├── test-tasks-count.spec.ts
│   └── helpers/auth.ts      # E2E auth helper
├── next.config.mjs          # Rewrites to backend API
├── eslint.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── package.json
├── Dockerfile               # node:22-alpine
├── docker-compose.yml       # Dev server (port 3000)
├── playwright.config.ts     # E2E test config
├── start-dev.sh             # Dev startup script
└── .env / .env.example      # Environment configuration
```

## Pages & Features

### Login Page (`/login`)

- MUI Card with centered form
- Username (nick) + password fields
- Error display via MUI Alert
- Redirect to `/dashboard` after login (or from `?redirect=` param)
- Token stored in `localStorage`
- Uses `Suspense` for search params

### Dashboard Home (`/dashboard`)

- Welcome message with user's nick
- Stats cards: Total Cases, Open Cases, Closed Cases
- Fetches counts from `/api/v1/dashboard/cases/count`
- Auth check via `useAuth()` — redirects to `/login` if unauthenticated

### Tasks Kanban (`/dashboard/tasks`)

- Four-column Kanban board: **Pending → In Progress → Validating → Done**
- Task cards with:
  - Task type icon (User, Manual, Script, Send, Receive, BusinessRule)
  - Case name and model name
  - Relative date
  - Progress indicator (elapsed time)
- Drag-and-drop between columns via `@dnd-kit`
- Status transitions:
  - Pending → In Progress: `PATCH /dashboard/tasks/lock`
  - In Progress → Validating: `PATCH /dashboard/tasks/validate`
  - Validating → Done: `PATCH /dashboard/tasks/done`
- Lock/unlock for concurrency control
- Data fetched from `/api/v1/dashboard/tasks/list`

### Inbox (`/dashboard/inbox`)

- Folder tabs: Inbox, Sent, Trash
- Per-folder count badges
- Message list with:
  - Subject, sender, date, tag
  - Star/unstar toggle
  - Read/unread indicator
  - Pagination
- Filter by: all, read, unread
- Data fetched from `/api/v1/inbox/filter/`

### Message Detail (`/dashboard/inbox/message/[id]`)

- Full message body display
- Star/unstar toggle
- Delete (move to trash)
- Reply button (stub)
- Mark as read on load
- Back navigation

## Authentication Flow

```
┌──────────┐     POST /auth/token      ┌──────────┐
│ Login    │ ─────────────────────────▶ │ pybpm-   │
│ Page     │  {username, password}      │ api      │
│          │                            │          │
│          │◀───────────────────────── │          │
│          │  {access_token, token_type}│          │
│          │                            │          │
│          │  localStorage.setItem(     │          │
│          │    "token", token)         │          │
│          │                            │          │
│          │  GET /auth/me             │          │
│          │──────────────────────────▶│          │
│          │◀───────────────────────── │          │
│          │  {id, nick, name}         │          │
│          │                            │          │
│          │  useAuth() → user state   │          │
│          │  → redirect /dashboard    │          │
└──────────┘                            └──────────┘
```

### Auth Interceptor (`src/api/client.ts`)

Every outgoing request is intercepted:

```typescript
// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

## Theming

### Dark Mode Architecture

```
┌──────────────────────────────────────┐
│  ThemeContext (shared state)         │
│  mode: "light" | "dark"             │
│  toggleTheme()                      │
└──────────────┬───────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
 Themed-   MUI       localStorage
 Providers  Theme     ("theme")
    │          │
    ▼          ▼
  Query-    createTheme
 Client     ({ palette: { mode } })
 Provider
```

- Theme preference stored in `localStorage("theme")`
- Persists across sessions
- Toggle via AppBar theme button (☀/🌙)
- MUI `createTheme` generates palette from mode

## API Client

All API calls go through the centralized axios instance in `src/api/client.ts`:

```typescript
import api from "@/api/client";

// Auth
const loginRes = await api.post("/auth/token", formData);
const me = await api.get("/auth/me");

// Dashboard
const casesCount = await api.get("/dashboard/cases/count");
const tasksList = await api.get("/dashboard/tasks/list");
await api.patch("/dashboard/tasks/done", { resource_id });

// Inbox
const messages = await api.post("/inbox/filter/", { folder, page });
const message = await api.get(`/inbox/${id}/`);
await api.put(`/inbox/${id}/read/`);

// Engine
const runRes = await api.post(`/bpm/engine/run/${idwf}/${idcase}`);
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PYBPM_API_URL` | `http://localhost:5000` | Backend API base URL |
| `NEXT_PUBLIC_PYBPM_API_URL` | `http://localhost:5000` | Client-accessible API URL |
| `PORT` | `3000` | Dev server port |
| `ENVIRONMENT` | `development` | Development/production mode |
| `DEBUG` | `true` | Enable debug logging |

## Development

```bash
# Install dependencies
npm install

# Set PYBPM_API_URL in .env
# e.g., PYBPM_API_URL=http://localhost:5000

# Run dev server
npm run dev
# Visit: http://localhost:3000

# Build for production
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Lint
npm run lint

# Format
npm run format
```

### Docker

```bash
# Start dev server
docker compose up -d

# Visit: http://localhost:3000
```

## Design Decisions

1. **Next.js App Router**: Uses server components where possible (layout, page metadata) and client components (`"use client"`) where interactivity is needed (forms, drag-and-drop, state management).
2. **MUI v9**: Material Design components for consistent UI across all pages. Uses Emotion for CSS-in-JS styling.
3. **React Query**: Server state management via `@tanstack/react-query`. Provides caching, background refetching, and optimistic updates. Query keys are typed as const tuples.
4. **Drag and Drop**: `@dnd-kit` for the Kanban board. Cards are draggable between columns; status transitions are triggered on drop via API calls.
5. **Auth via localStorage**: Token stored in `localStorage` with axios interceptors for automatic injection. 401 responses trigger automatic redirect to login.
6. **Relative API paths**: All client calls use relative paths (`/api/v1/...`) proxied through Next.js rewrite rules. This avoids CORS issues and allows environment-independent configuration.
7. **Dark mode**: Custom `ThemeContext` with `localStorage` persistence. MUI `createTheme` generates the palette from the mode. Toggle available in the AppBar.
8. **Playwright E2E tests**: Tests cover login flow, inbox operations, and task management. Auth helper provides browser-based login for test isolation.
9. **Task type icons**: Static PNG icons in `public/images/tasktype/` for each task type (user, manual, script, send, receive, business-rule).
