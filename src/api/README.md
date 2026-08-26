# PyBPM UI — API Configuration

## Environment Variables

### Required (from `.env`)

| Variable                    | Description               | Default                 | Used By                            |
| --------------------------- | ------------------------- | ----------------------- | ---------------------------------- |
| `PYBPM_API_URL`             | Backend API base URL      | `http://localhost:5000` | Next.js rewrites, server-side code |
| `NEXT_PUBLIC_PYBPM_API_URL` | Client-accessible API URL | `http://localhost:5000` | Browser client code (if needed)    |

### Optional

| Variable      | Description                 | Default       |
| ------------- | --------------------------- | ------------- |
| `PORT`        | Dev server port             | `3000`        |
| `ENVIRONMENT` | Development/production mode | `development` |
| `DEBUG`       | Enable debug logging        | `true`        |

## API Routing

All client-side API calls use **relative paths** and are proxied through Next.js rewrites:

```
Client Code          →  Next.js Rewrite  →  Backend
─────────────────────────────────────────────────────
/api/v1/auth/token   →  http://localhost:5000/api/v1/auth/token
/api/v1/inbox/filter →  http://localhost:5000/api/v1/inbox/filter
/api/v1/tasks        →  http://localhost:5000/api/v1/tasks
```

## Using the API Client

Import the configured axios instance from `src/api/client.ts`:

```typescript
import api from "@/api/client";

// Auth endpoints
const tokenRes = await api.post("/auth/token", formData);
const me = await api.get("/auth/me");

// Inbox endpoints
const filterRes = await api.post("/inbox/filter/", { status: "assigned" });

// Tasks endpoints
const tasksRes = await api.get("/tasks/assigned/");
```

## Example Hooks

### useAuth (already implemented)

```typescript
import { useAuth } from "@/hooks/useAuth";
const { login, logout, user } = useAuth();
```

### useInbox (to be implemented)

```typescript
// src/hooks/useInbox.ts
import api from "@/api/client";

interface FilterParams {
  status?: string;
  sort_by?: string;
  page?: number;
}

export function useInbox() {
  const filter = async (params: FilterParams) => {
    return api.post("/inbox/filter/", params);
  };

  const getMessage = async (id: string) => {
    return api.get(`/inbox/${id}/`);
  };

  const markRead = async (id: string) => {
    return api.put(`/inbox/${id}/read/`);
  };

  const deleteMessage = async (id: string) => {
    return api.delete(`/inbox/${id}/`);
  };

  return { filter, getMessage, markRead, deleteMessage };
}
```

### useTasks (to be implemented)

```typescript
// src/hooks/useTasks.ts
import api from "@/api/client";

export function useTasks() {
  const getAssigned = async () => {
    return api.get("/tasks/assigned/");
  };

  const completeTask = async (taskId: string) => {
    return api.put(`/tasks/${taskId}/complete/`);
  };

  const rejectTask = async (taskId: string, reason: string) => {
    return api.post(`/tasks/${taskId}/reject/`, { reason });
  };

  return { getAssigned, completeTask, rejectTask };
}
```

## Changing Backend URL

Update `.env` and restart the dev server:

```bash
# .env
PYBPM_API_URL=http://your-backend-server:8000
NEXT_PUBLIC_PYBPM_API_URL=http://your-backend-server:8000

# Restart Next.js dev server
npm run dev
```
