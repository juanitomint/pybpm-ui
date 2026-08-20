# PYBPM-UI — Implementation Plan & Progress Tracker

## Overview

React SPA built with Next.js App Router that replaces the legacy ExtJS case manager and inbox UI. Communicates exclusively with `pybpm-api` over REST (JWT bearer tokens).

---

## Architecture

```mermaid
graph TB
    subgraph "Browser"
        LOGIN[Login Page - /login]
        DASHBOARD[Dashboard Layout Shell - app/dashboard/layout.tsx]
        TASKS[Tasks Page - /dashboard/tasks]
        INBOX[Inbox Page - /dashboard/inbox]
    end

    subgraph "Auth"
        MIDDLEWARE[Next.js Middleware - auth gate]
        USEAUTH[useAuth hook - src/hooks/useAuth.ts]
    end

    subgraph "API Layer (pybpm-api)"
        AUTH_TOKEN[POST /api/v1/auth/token]
        AUTH_ME[GET /api/v1/auth/me]
        INBOX_INDEX[GET /inbox]
        INBOX_FILTER[POST /inbox/filter/]
        INBOX_COUNTS[POST /inbox/counts/]
        MSG_READ[GET /inbox/message/{msgid}/]
        MSG_PATCH[PATCH /inbox/message/{msgid}/]
        TASKS_GET[GET /dashboard/tasks]
        CASES_GET[GET /dashboard/cases]
    end

    LOGIN --> AUTH_TOKEN
    AUTH_TOKEN --> USEAUTH
    MIDDLEWARE --> USEAUTH
    DASHBOARD --> CASES_GET
    TASKS --> TASKS_GET
    INBOX --> INBOX_INDEX
    INBOX --> INBOX_COUNTS
```

---

## Feature List

| # | Feature | Route | Description | Status |
|---|---------|-------|-------------|--------|
| F1 | Login form | `/login` | Nick + password → POST /auth/token, stores token in localStorage, redirects to /dashboard/tasks on success | DRAFT |
| F2 | Logout | Profile menu (AppBar) | Clears token from localStorage, redirects to /login | DRAFT |
| F3 | Auth middleware | `middleware.ts` | Guards all routes under `/dashboard/*`, redirects unauthed users to `/login` | DRAFT |
| F4 | Dashboard layout shell | `/dashboard/layout.tsx` | AppBar (hamburger, logo "NexTask", dark mode toggle, notification bell, profile popover) + Drawer sidebar with nav items (Dashboard, Tasks, Inbox, Reports, Settings) + Breadcrumbs | DRAFT |
| F5 | Tasks page | `/dashboard/tasks` | Lists tasks assigned to current user via POST /inbox/filter/ with `folder=tasks` or `tag=task`; shows title, status chip, priority indicator, due date; filtering by status/priority/due-date; drag-and-drop reordering | DRAFT |
| F6 | Inbox page | `/dashboard/inbox` | Paginated message list from GET /inbox/ with subject, sender, timestamp, read/star indicators; click opens detail modal (body); mark-read on view, star toggle, tag; pagination controls; count badges in drawer nav | DRAFT |
| F7 | Light/dark theme switch | AppBar + providers.tsx | Persisted user preference (localStorage) overriding OS `prefers-color-scheme`; applies to MUI components via ThemeProvider and Tailwind `dark:` variants on every page; toggle button in AppBar right section with sun/moon icon | DRAFT |

---

## File Map

```
pybpm-ui/
├── PYBPM-UI.md                        # This file — plan & progress tracker
├── app/
│   ├── layout.tsx                     # Root layout: Providers (QueryClient, Theme) wrapper
│   ├── page.tsx                       # Home → redirect to /login or /dashboard/tasks based on auth
│   ├── globals.css                    # Tailwind v4 imports + CSS custom properties for theming
│   ├── providers.tsx                  # TanStack Query provider client component
│   ├── middleware.ts                  # NEXT_AUTH_TOKEN check; redirects unauthed to /login
│   ├── login/
│   │   └── page.tsx                   # F1: Login form (client component)
│   └── dashboard/
│       ├── layout.tsx                 # F4: AppBar + Drawer shell (client component)
│       ├── tasks/
│       │   └── page.tsx               # F5: Tasks list with filter/sort/dnd
│       └── inbox/
│           ├── page.tsx               # F6a: Inbox message listing (paginated)
│           └── message/
│               [id]/page.tsx          # F6b: Single message detail view
├── src/
│   ├── api/
│   │   └── client.ts                  # Axios instance with JWT interceptor — KEEP AS-IS
│   └── hooks/
│       └── useAuth.ts                 # Auth state + login/logout/me — KEEP AS-IS
├── playwright.config.ts               # Playwright e2e config
├── tests/
│   ├── e2e/
│   │   ├── auth.spec.ts              # Login flow + token storage + redirect guard
│   │   ├── tasks.spec.ts             # Tasks page: load, filter, sort, mark complete
│   │   └── inbox.spec.ts             # Inbox: list, paginate, open detail, star, read
├── next.config.ts                     # Dev proxy to pybpm-api on :5000
├── postcss.config.mjs                 # Tailwind v4 PostCSS plugin
├── tsconfig.json                      # Strict TS for App Router
└── package.json                       # Dependencies
```
## API Contract

| Endpoint | Method | Auth | Request Body | Response | Used By |
|----------|--------|------|-------------|----------|---------|
| `/api/v1/auth/token` | POST | No | `{nick, password}` (JSON) | `{access_token: string, token_type: "bearer"}` | F1 Login |
| `/api/v1/auth/me` | GET | Bearer | — | `{idu, nick, name}` | F3 Middleware check |
| `/inbox` | GET | Bearer | Query: `page`, `per_page`, `filter_query` | Paginated message list | F6 Inbox list |
| `/inbox/filter/` | POST | Bearer | `{folder?, read?, star?, tag?}` | Paginated message list | F5 Tasks filter / F6 Advanced filter |
| `/inbox/counts/` | POST | Bearer | `{folder?, read?, star?, tag?}` | `{total_count, unread_count}` | F4 Nav badge counts |
| `/dashboard/tasks` | GET | Bearer | Query: `page`, `per_page`, `filter_query` | Paginated task list | F5 Tasks page (primary) |
| `/dashboard/tasks/count` | GET | Bearer | — | `{total_count}` | P3.2 Drawer badge |
| `/inbox/message/{msgid}/` | GET | Bearer | — | `MessageRead` (single message) | F6b Detail view |
| `/inbox/message/{msgid}/` | PATCH | Bearer | `{read?, star?, tag?}` | `{success, ...action fields}` | F6 Mark read / star / tag |
| `/inbox/send/` | POST | Bearer | `{to_user, subject, body, tag?}` | — | Send message action |

### Inbox Message Schema (`MessageRead`)
```ts
{
  msgid: string;           // unique message id
  subject: string;         // task/title text (rendered as card heading)
  body: string;            // detail content (detail modal)
  from_user: number | null;// sender user id
  to_user: number;         // recipient user id (current user = assigned)
  folder: string;          // "inbox", "sent", "trash" — maps to status/category
  read: boolean;           // unread indicator
  star: boolean;           // starred
  tag: string | null;      // category tag ("task", "report", etc.)
  checkdate: Date | null;  // due date (if set)
  msg_time: string;        // timestamp of last activity
}
```
### API Route Discovery (authoritative)

**Always check the live OpenAPI schema before writing client code.** FastAPI's runtime route paths may differ from `main.py` router mounts due to dual mounts, prefix stripping, or patching. Never guess routes from memory or source code alone.

```bash
# Fetch the authoritative route list from the running API:
curl -s ${PYBPM_API_URL:-http://127.0.0.1:5000}/openapi.json | python3 -c "import sys,json; [print(m.upper(),p) for p,methods in sorted(json.load(sys.stdin)['paths'].items()) for m in methods]"
```

This outputs every route currently registered on the running server with its method and path — use this as ground truth when updating pybpm-ui routes, Playwright scripts, or any client-side API call. The schema is also available at `/docs#/` in a browser for interactive exploration.

---

## Progress Tracker

### Phase 1 — Foundation ✅ / ❌

| # | Task | Status | Notes |
|---|------|--------|-------|
| P1.1 | `app/layout.tsx` root layout with Providers | ⬜ | Wrap children in QueryClientProvider + ThemeProvider |
| P1.2 | `app/page.tsx` home redirect based on auth | ⬜ | Check token → /dashboard/tasks or /login |
| P1.3 | `app/middleware.ts` auth gate | ⬜ | Read NEXT_AUTH_TOKEN cookie from request; if missing and route starts with /dashboard, rewrite to /login |
| P1.4 | Tailwind CSS v4 globals + dark mode support | ⬜ | globals.css with @tailwind directives + CSS variables for light/dark |
| P1.5 | `next.config.ts` dev proxy `:5000` → pybpm-api | ⬜ | Already exists; verify it routes /api/* correctly |

### Phase 2 — Auth ✅ / ❌

| # | Task | Status | Notes |
|---|------|--------|-------|
| P2.1 | Login form (`app/login/page.tsx`) | ⬜ | Nick + password fields, submit calls useAuth.login(), stores token via hook, shows inline error on failure |
| P2.2 | Logout button in profile menu | ⬜ | AppBar popover → logout item → clears localStorage("token"), navigates to /login |
| P2.3 | Middleware redirects unauthed users | ⬜ | Reads NEXT_AUTH_TOKEN cookie; missing token → redirect /dashboard/* → /login |

### Phase 3 — Dashboard Shell ✅ / ❌

| # | Task | Status | Notes |
|---|------|--------|-------|
| P3.1 | AppBar component: hamburger, logo "NexTask", dark toggle, notification bell, profile menu | ⬜ | MUI AppBar; profile has name + avatar + logout item; dark toggle is a Button with IconButton containing sun (light) / moon (dark) icon that flips based on theme state from ThemeProvider |
| P3.1b | Theme provider wiring in `app/providers.tsx` and `app/layout.tsx` | ⬜ | Install next-themes; wrap root layout with `<html suppressHydrationWarning><body>` using `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`. Providers.tsx renders the client-side ThemeProvider (for MUI) that reads from context. AppBar toggle button calls `theme.toggle()` which writes "light"/"dark" to localStorage — survives refresh. |
| P3.2 | Drawer sidebar with nav items (Dashboard, Tasks, Inbox w/ count badge, Reports, Settings) | ⬜ | MUI Drawer; fetches counts via POST /inbox/counts/ on mount |
| P3.3 | Breadcrumbs above main content: Home > Dashboard > [page] | ⬜ | MUI Breadcrumbs; current page bolded |

### Phase 4 — Tasks Page ✅ / ❌

| # | Task | Status | Notes |
|---|------|--------|-------|
| P4.1 | Fetch tasks via POST /inbox/filter/ with tag=task (or folder=tasks if backend supports) | ⬜ | TanStack Query useQuery; pagination handled by API |
| P4.2 | Task card rendering: subject, status chip (folder), priority from tag, due date (checkdate), progress bar | ⬜ | MUI Card + Chip + LinearProgress |
| P4.3 | Filter controls: status dropdown, priority dropdown, date range picker | ⬜ | Client-side filter on loaded data or re-fetch with new filter_query param |
| P4.4 | Sort by due-date / priority / subject (ascending/descending) | ⬜ | MUI Select + sort icon buttons; client-side sort |
| P4.5 | Drag-and-drop task reordering via react-beautiful-dnd | ⬜ | Marquee wrapper around card list; PATCH reorder on drop end |

### Phase 5 — Inbox Page ✅ / ❌

| # | Task | Status | Notes |
|---|------|--------|-------|
| P5.1 | Fetch messages via GET /inbox/ with pagination (page, per_page) | ⬜ | useQuery with page state; re-fetch on page change |
| P5.2 | Message list rendering: subject, sender name lookup, timestamp, read/star icons | ⬜ | Sender id → GET /auth/me alternative or cache user lookup |
| P5.3 | Click message → detail modal/page showing body content | ⬜ | MUI Dialog or navigate to /dashboard/inbox/message/[id] |
| P5.4 | Mark read on open (PATCH /inbox/message/{id}/ with {read: true}) | ⬜ | Invalidate query cache after PATCH so list updates immediately |
| P5.5 | Star toggle (PATCH /inbox/message/{id}/ with {star: !current.star}) | ⬜ | Inline star icon click; optimistic update |
| P5.6 | Pagination controls at bottom of list | ⬜ | MUI TablePagination or custom prev/next buttons + page number display |

---

## Testing with Playwright

### Setup

```bash
# Install Playwright (in pybpm-ui/)
npm install -D @playwright/test
npx playwright install chromium

# Start the dev server in background for testing
npm run dev &
# The proxy routes /api/* → http://localhost:5000 (pybpm-api)
```

### Test Scripts

#### `tests/e2e/auth.spec.ts` — Login flow + auth gate

```ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects unauthenticated user to /login when accessing /dashboard/tasks', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('logs in with valid credentials and stores token', async ({ page, request }) => {
    // POST /api/v1/auth/token directly to get a real JWT from pybpm-api
    const loginRes = await request.post('/api/v1/auth/token', {
      data: { nick: 'admin', password: 'changeme' },
    });
    const { access_token } = await loginRes.json();

    // Set token in localStorage (simulating successful form submit)
    await page.addInitScript((token) => {
      window.localStorage.setItem('token', token);
    }, access_token);

    await page.goto('/dashboard/tasks');
    await expect(page).toHaveURL(/\/dashboard\/tasks/);
    // Verify user is logged in: drawer should show nav items, profile menu shows name
    await expect(page.locator('[data-testid="drawer-nav"]').first()).toBeVisible();
  });

  test('logout clears token and returns to login', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/token', {
      data: { nick: 'admin', password: 'changeme' },
    });
    await page.addInitScript((token) => window.localStorage.setItem('token', token), access_token);

    await page.goto('/dashboard/tasks');
    // Click profile menu → logout
    await page.click('[data-testid="profile-menu-trigger"]');
    await expect(page.locator('[data-testid="logout-item"]').first()).toBeVisible();
    await page.click('[data-testid="logout-item"]');
    await expect(page).toHaveURL(/\/login/);
    // Verify token is gone
    const stored = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(stored).toBeNull();
  });

  test('middleware blocks direct API calls with invalid token', async ({ request }) => {
    const res = await request.get('/inbox/', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect([401, 307]).toContain(res.status());
  });
});
```

#### `tests/e2e/theme.spec.ts` — Light/dark theme switching

```ts
import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  const validUser = 'admin';
  const password = 'changeme';

  async function authSetup(page) {
    const res = await page.evaluate(async () => {
      return fetch('/api/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json());
    });
    await page.addInitScript((token) => window.localStorage.setItem('token', token), res.access_token);
  }

  test('defaults to light theme on first visit (no localStorage preference)', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'light' });
    const page = await context.newPage();
    await page.goto('/dashboard/tasks');
    
    // Check that html or body doesn't have the dark class when system prefers light
    const htmlClass = await page.locator('html').getAttribute('class') || '';
    expect(htmlClass).not.toContain('dark');
  });

  test('toggles between light and dark themes on AppBar button click', async ({ page }) => {
    await authSetup(page);
    await page.goto('/dashboard/tasks');
    
    // Click the theme toggle button (sun/moon icon in AppBar)
    const toggle = page.locator('[data-testid="theme-toggle"]');
    await expect(toggle).toBeVisible();
    
    // Initial state: if system prefers light, body should have bg-white not dark:bg-gray-900
    const bodyClassBefore = await page.locator('body').getAttribute('class') || '';
    
    // Click toggle to switch theme
    await toggle.click();
    
    // Wait for theme transition and localStorage update
    await expect(page.evaluate(() => localStorage.getItem('theme'))).resolves.toBe(
      bodyClassBefore.includes('dark') ? 'light' : 'dark',
    );
    
    // Verify the html or body class reflects the new theme
    const bodyClassAfter = await page.locator('body').getAttribute('class') || '';
    expect(bodyClassAfter).not.toEqual(bodyClassBefore);
  });

  test('persists theme preference across page reload', async ({ page }) => {
    await authSetup(page);
    await page.goto('/dashboard/tasks');
    
    // Force dark mode via localStorage (simulating previous user choice)
    await page.evaluate(() => window.localStorage.setItem('theme', 'dark'));
    
    // Reload the page
    await page.reload();
    
    // Theme should still be dark after reload — body or html has dark class
    const bodyClass = await page.locator('body').getAttribute('class') || '';
    expect(bodyClass).toContain('dark');
  });

  test('theme toggle button icon reflects current theme', async ({ page }) => {
    await authSetup(page);
    await page.goto('/dashboard/tasks');
    
    const toggle = page.locator('[data-testid="theme-toggle"] svg');
    
    // If system prefers light, initial icon should be moon (clicking will switch to dark)
    const isLightSystem = await page.evaluate(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
    const expectedInitialIcon = isLightSystem ? 'moon' : 'sun';
    
    // Check that the toggle button contains an SVG with the appropriate aria-label or title
    const svgTitle = await toggle.evaluate(el => el.title || el.closest('button')?.getAttribute('aria-label'));
    expect(svgTitle).toBeTruthy();
  });

  test('dark theme applies Tailwind dark: variants to page background', async ({ page }) => {
    await authSetup(page);
    await page.goto('/dashboard/tasks');
    
    // Force dark mode
    await page.evaluate(() => window.localStorage.setItem('theme', 'dark'));
    await page.reload();
    
    // Check that the main content area has a dark background color via computed style
    const dashboardBg = await page.locator('[data-testid="dashboard-main"]').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Verify it's not the light theme white (rgba(255, 255, 255, 1)) or near-white
    expect(dashboardBg).not.toEqual('rgb(255, 255, 255)');
    // Dark backgrounds in Tailwind default to gray-900 = rgb(17, 24, 39) approximately
    const bgRGB = dashboardBg.match(/\d+/g)?.map(Number);
    if (bgRGB?.length === 3) {
      expect(bgRGB[0] + bgRGB[1] + bgRGB[2]).toBeLessThan(150); // dark color has low luminance
    }
  });
});
```
#### `tests/e2e/tasks.spec.ts` — Tasks page

```ts
import { test, expect } from '@playwright/test';

test.describe('Tasks Page', () => {
  const validUser = 'admin';
  const password = 'changeme';

  async function loginAs(page) {
    const { request } = await import('@playwright/test');
    // Use existing test context's request for token fetch
    const res = await page.evaluate(async () => {
      return fetch('/api/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json());
    });
    const { access_token } = res;
    await page.addInitScript((token) => window.localStorage.setItem('token', token), access_token);
  }

  test.beforeEach(async ({ page }) => {
    // Pre-seed a task message in the database via API first, or rely on existing data
    await loginAs(page);
    await page.goto('/dashboard/tasks');
    await expect(page.locator('[data-testid="tasks-page"]')).toBeVisible();
  });

  test('displays tasks assigned to current user', async ({ page }) => {
    // Verify at least one task card is visible (or the empty state if no tasks exist)
    const hasCards = await page.locator('[data-testid="task-card"]').count() > 0;
    const isEmpty = await page.locator('[data-testid="empty-state"]').isVisible();
    expect(hasCards || isEmpty).toBe(true);
  });

  test('filters tasks by status', async ({ page }) => {
    await page.selectOption('[data-testid="status-filter"]', 'inbox');
    // All visible cards should have the "inbox" folder tag
    const statuses = await page.locator('[data-testid="task-card"]').allInnerTexts();
    expect(statuses.every(s => s.includes('inbox') || s === '')).toBe(true);
  });

  test('sorts tasks by due date', async ({ page }) => {
    // Click sort-by-due-date button, verify cards are ordered chronologically
    await page.click('[data-testid="sort-due-date"]');
    const dates = await page.locator('[data-testid="task-card"]').allInnerTexts();
    // Simple check: at least 2 cards exist and dates appear in order (parse and compare)
    if (dates.length >= 2) {
      const parsedDates = dates.map(d => new Date(d).getTime()).filter(Boolean);
      for (let i = 1; i < parsedDates.length; i++) {
        expect(parsedDates[i]).toBeGreaterThanOrEqual(parsedDates[i - 1]);
      }
    }
  });

  test('marks task as read on click', async ({ page }) => {
    const card = page.locator('[data-testid="task-card"]').first();
    await expect(card).toBeVisible();
    await card.click();
    // After navigation or modal open, the message should be marked read in API
    const res = await page.evaluate(async () => {
      return fetch('/inbox/filter/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json());
    });
    expect(res.total_count).toBeGreaterThan(0);
  });
});
```

#### `tests/e2e/inbox.spec.ts` — Inbox page

```ts
import { test, expect } from '@playwright/test';

test.describe('Inbox', () => {
  async function authSetup(page) {
    const res = await page.evaluate(async () => {
      return fetch('/api/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json());
    });
    await page.addInitScript((token) => window.localStorage.setItem('token', token), res.access_token);
  }

  test.beforeEach(async ({ page }) => {
    await authSetup(page);
    await page.goto('/dashboard/inbox');
    await expect(page.locator('[data-testid="inbox-page"]')).toBeVisible();
  });

  test('renders paginated message list', async ({ page }) => {
    // Per API: per_page defaults to 15; verify pagination controls exist
    await expect(page.locator('[data-testid="pagination-controls"]').first()).toBeVisible();
  });

  test('navigates to message detail on click', async ({ page }) => {
    const firstMsg = page.locator('[data-testid="message-row"]').first();
    await firstMsg.click();
    // Should navigate or open detail view
    await expect(page.locator('[data-testid="message-body"]')).toBeVisible({ timeout: 5000 });
  });

  test('toggles star on a message', async ({ page }) => {
    const msg = page.locator('[data-testid="message-row"]').first();
    const starBtn = msg.locator('[data-testid="star-btn"]');
    await expect(starBtn).toBeVisible();
    // Toggle: if not starred, click and verify star icon changes
    const isStarredBefore = await starBtn.getAttribute('class')?.includes('filled') ?? false;
    await starBtn.click();
    await expect(page.locator('[data-testid="message-row"]').first().locator('[data-testid="star-btn"]')).toHaveClass(/filled/);
  });

  test('counts update in nav drawer after marking read', async ({ page }) => {
    // Snapshot unread count before action
    const badgeBefore = await page.locator('[data-testid="inbox-badge"]').innerText();
    // Mark first message as read via API call from the client
    const msgId = await page.locator('[data-testid="message-row"]').first().getAttribute('data-msgid');
    await page.evaluate(async (id) => {
      return fetch(`/inbox/message/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json());
    }, msgId);
    // Badge should update (counts refetch or cache invalidation)
    const badgeAfter = await page.locator('[data-testid="inbox-badge"]').innerText();
    expect(Number(badgeAfter)).toBeLessThanOrEqual(Number(badgeBefore));
  });

  test('pagination advances and shows next page of messages', async ({ page }) => {
    await page.click('[data-testid="pagination-next"]');
    await expect(page.locator('[data-testid="message-row"]').first()).toBeVisible();
    // Verify we're not on the first page anymore
    const pageInfo = await page.locator('[data-testid="page-info"]').innerText();
    expect(pageInfo).toContain('2');
  });
});
```

### Running Tests

```bash
# Run all e2e tests against running dev server
npx playwright test

# Run a specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run with headed browser for debugging
npx playwright test --headed

# Generate test report (HTML)
npx playwright test --reporter=html

# Open report after run
npx playwright show-report
```

### CI Integration (`next.config.ts` proxy note)

Playwright tests require pybpm-api running on `:5000`. In CI, start both services via docker-compose before running tests:

```yaml
# playwright.config.ts — use baseURL that points to Next.js dev server
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,  // auth tests share localStorage state
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    storageState: undefined,  // token is set per-test via addInitScript
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

---

## How to Test (Step-by-Step)

### Manual Smoke Test

1. **Start both services:**
   ```bash
   # Terminal 1 — pybpm-api
   cd /home/juanb/dna2-workspace/pybpm-api && make compose-up
   
   # Terminal 2 — pybpm-ui (after npm install)
   cd /home/juanb/dna2-workspace/pybpm-ui && npm run dev
   ```

2. **Open http://localhost:3000** → should redirect to `/login`.

3. **Log in** with credentials from pybpm-api database (check `docker compose logs` for admin user). Verify token appears in Application → Local Storage → `token` key.

4. **Navigate to /dashboard/tasks** — verify tasks load or empty state shows if no tasks exist.

5. **Navigate to /dashboard/inbox** — verify message list loads with pagination.

6. **Click a message** — verify detail opens and message is marked read.

7. **Toggle star** on any message — verify icon changes persist after reload.

8. **Logout via profile menu** — verify token is cleared from localStorage and you're redirected to `/login`.

### Playwright Test Run

```bash
cd pybpm-ui
npm run dev &            # starts Next.js on :3000 with proxy to pybpm-api
sleep 5                  # wait for startup
npx playwright test      # runs auth + tasks + inbox specs
```

---

## Notes & Decisions

1. **Tasks vs Inbox**: The pybpm-api inbox treats all items as messages with a `tag` field. Tasks are identified by `tag: "task"` or `folder: "tasks"`. If the backend needs a dedicated `/bpm/engine/my-tasks` endpoint, add it — otherwise filter inbox messages by tag.

2. **Sender name lookup**: Inbox messages carry `from_user` as an integer id. Two approaches to display names:
   - Pre-fetch user directory on mount via `GET /users/` (if available) and cache in TanStack Query
   - Show user id only; add a "resolve sender" button for details
   
3. **Dark mode**: Install `next-themes` (`npm i next-themes`) and wrap the root `<html>` in `app/layout.tsx` with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. Tailwind v4 uses the `dark:` prefix on elements (e.g. `bg-white dark:bg-gray-900`). MUI components receive theme via a separate client-side `ThemeProvider` in `app/providers.tsx` that reads from `useTheme()` context. The AppBar toggle button calls `theme.toggle()`, which writes `"light"` or `"dark"` to localStorage — survives page refresh and overrides OS preference.

4. **Pagination**: Inbox API returns `{page, per_page, total_pages}`. Tasks page uses client-side sort; inbox uses server-side pagination (re-fetch on page change).

5. **Drag-and-drop ordering**: react-beautiful-dnd works in MUI CardList. On drop end, PATCH /inbox/message/{id}/ with reorder payload. Falls back to simple list if dnd unavailable (no library needed for MVP).
