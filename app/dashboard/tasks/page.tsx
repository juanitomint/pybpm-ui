"use client";

import { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { useTheme } from "../../providers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import TaskTypeIcon from "./TaskTypeIcon";
import api from "../../../src/api/client";
import { Lock } from "lucide-react";

// --- Types --------------------------------------------------------------- //

interface TaskListItem {
  resourceId: string;
  idwf: string;
  type: string;
  title: string;
  status: "user" | "validating" | "done";
  locked_by: number | null;
  locked: boolean;
  locked_by_nick: string | null;
  checkDate: string | null;
  time_elapsed: string;
  case_id: string;
  model_name: string;
  tasktype: string | null;
}

interface TasksListResponse {
  tasks: TaskListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

type KanbanStatus = "pending" | "in_progress" | "validating" | "done";
interface KanbanCard {
  resourceId: string;
  idwf: string;
  title: string;
  status: KanbanStatus;
  lockedByMe: boolean;
  checkDate: Date | null;
  timeElapsed: string;
  tasktype: string | null;
  caseId: string;
}

interface ColumnDef {
  key: KanbanStatus;
  label: string;
  color: "default" | "primary" | "warning" | "info" | "success";
  accent: string;
  bgLight: string;
  bgDark: string;
}

// --- Helpers ------------------------------------------------------------- //

function formatRelativeDate(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < -3) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return "Yesterday";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `${diffDays} days from now`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// --- Kanban columns ------------------------------------------------------ //

const COLUMNS: ColumnDef[] = [
  {
    key: "pending",
    label: "Pending",
    color: "default",
    accent: "#757575",
    bgLight: "#f5f5f5",
    bgDark: "#242424",
  },
  {
    key: "in_progress",
    label: "In Progress",
    color: "primary",
    accent: "#1976d2",
    bgLight: "#e3f2fd",
    bgDark: "#0a1b2e",
  },
  {
    key: "validating",
    label: "Validating",
    color: "warning",
    accent: "#f59e0b",
    bgLight: "#fff8e1",
    bgDark: "#2c1e00",
  },
  {
    key: "done",
    label: "Done",
    color: "success",
    accent: "#10b981",
    bgLight: "#e8f5e9",
    bgDark: "#071a0e",
  },
];

const TASKS_QUERY_KEY = ["dashboard-tasks"] as const;

// --- Backend calls ------------------------------------------------------- //

async function fetchTasksList(): Promise<TasksListResponse> {
  const params = new URLSearchParams({ page: "1", per_page: "99" });
  const res = await api.get(`/dashboard/tasks?${params.toString()}`);
  return res.data;
}
async function transitionTask(
  resourceId: string,
  idwf: string,
  targetStatus: KanbanStatus,
  caseId: string,
): Promise<void> {
  const body = { resource_id: resourceId, case_id: caseId, idwf };

  if (targetStatus === "in_progress") {
    const lockRes = await api.patch("/dashboard/tasks/lock", body);
    if (lockRes.status >= 400)
      throw new Error(`lock failed: ${lockRes.status}`);
  } else if (targetStatus === "pending") {
    const unlockRes = await api.patch("/dashboard/tasks/unlock", body);
    if (unlockRes.status >= 400)
      throw new Error(`unlock failed: ${unlockRes.status}`);
  } else if (targetStatus === "validating") {
    const valRes = await api.patch("/dashboard/tasks/validate", body);
    if (valRes.status >= 400)
      throw new Error(`validate failed: ${valRes.status}`);
  } else if (targetStatus === "done") {
    const doneRes = await api.patch("/dashboard/tasks/done", body);
    if (doneRes.status >= 400)
      throw new Error(`done failed: ${doneRes.status}`);
}
}

// --- Component ----------------------------------------------------------- //

export default function TasksPage() {
  const [draggedId, setDraggedId] = useState<{
    resourceId: string;
    idwf: string;
    caseId: string;
  } | null>(null);
  const [droppingColumn, setDroppingColumn] = useState<KanbanStatus | null>(
    null,
  );
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });
  const queryClient = useQueryClient();
  const { mode } = useTheme();

  const { data: allData, isLoading } = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasksList,
  });

  const seededBoard = useMemo(() => {
    const items = allData?.tasks ?? [];
    const seen = new Set<string>();
    return [
      ...items
        .filter((t) => t.status === "user" && !t.locked)
        .map((t) => ({
          resourceId: t.resourceId,
          idwf: t.idwf,
          title: t.title || "(no title)",
          status: "pending" as KanbanStatus,
          lockedByMe: !!t.locked_by,
          checkDate: t.checkDate ? new Date(t.checkDate) : null,
          timeElapsed: t.time_elapsed,
          modelName: t.model_name,
          caseId: t.case_id,
          tasktype: t.tasktype,
        })),
      ...items
        .filter((t) => t.status === "user" && t.locked)
        .map((t) => ({
          resourceId: t.resourceId,
          idwf: t.idwf,
          title: t.title || "(no title)",
          status: "in_progress" as KanbanStatus,
          lockedByMe: !!t.locked_by,
          checkDate: t.checkDate ? new Date(t.checkDate) : null,
          timeElapsed: t.time_elapsed,
          modelName: t.model_name,
          caseId: t.case_id,
          tasktype: t.tasktype,
        })),
      ...items
        .filter((t) => t.status === "validating")
        .map((t) => ({
          resourceId: t.resourceId,
          idwf: t.idwf,
          title: t.title || "(no title)",
          status: "validating" as KanbanStatus,
          lockedByMe: !!t.locked_by,
          checkDate: t.checkDate ? new Date(t.checkDate) : null,
          timeElapsed: t.time_elapsed,
          modelName: t.model_name,
          caseId: t.case_id,
          tasktype: t.tasktype,
        })),
      ...items
        .filter((t) => t.status === "done" || t.status === "finished")
        .map((t) => ({
          resourceId: t.resourceId,
          idwf: t.idwf,
          title: t.title || "(no title)",
          status: "done" as KanbanStatus,
          lockedByMe: !!t.locked_by,
          checkDate: t.checkDate ? new Date(t.checkDate) : null,
          timeElapsed: t.time_elapsed,
          modelName: t.model_name,
          caseId: t.case_id,
          tasktype: t.tasktype,
        })),
    ].filter((card) => {
      const key = `${card.resourceId}:${card.caseId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allData]);
  const columns = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        cards: seededBoard.filter((c) => c.status === col.key),
      })),
    [seededBoard],
  );

  // --- Mutations (useMutation per AGENTS.md) --------------------------- //

  const transitionMutation = useMutation({
    mutationFn: ({
      resourceId,
      idwf,
      targetStatus,
      caseId,
    }: {
      resourceId: string;
      idwf: string;
      targetStatus: KanbanStatus;
      caseId: string;
    }) => transitionTask(resourceId, idwf, targetStatus, caseId),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
    onError: (err, variables) => {
      const axiosErr = err as {
        response?: { status?: number };
        message?: string;
      };
      const targetStatus = (variables as { targetStatus: KanbanStatus })
        .targetStatus;
      if (axiosErr.response?.status === 409) {
        setNotification({
          open: true,
          message: "Task is already locked by another user",
          severity: "warning",
        });
      } else if (targetStatus === "pending") {
        setNotification({
          open: true,
          message: `Failed to unlock task. Please try again.`,
          severity: "error",
        });
      } else {
        const label = axiosErr.message ?? String(err);
        setNotification({
          open: true,
          message: `Transition failed: ${label}`,
          severity: "error",
        });
      }
    },
  });

  // --- Drag handlers --------------------------------------------------- //

  const onDragStart = (card: KanbanCard) => {
    setDraggedId({
      resourceId: card.resourceId,
      idwf: card.idwf,
      caseId: card.caseId,
    });
  };

  const handleDrop = async (targetStatus: KanbanStatus) => {
    if (!draggedId || droppingColumn !== targetStatus) return;
    const card = seededBoard.find(
      (c) =>
        c.resourceId === draggedId.resourceId &&
        c.idwf === draggedId.idwf &&
        c.caseId === draggedId.caseId,
    );
    if (!card) return;

    setDroppingColumn(null);

    try {
      transitionMutation.mutate({
        resourceId: card.resourceId,
        idwf: card.idwf,
        targetStatus,
        caseId: card.caseId,
      });
    } finally {
      setDraggedId(null);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const columnBorderColor = (color: ColumnDef["color"]) =>
    color === "default"
      ? "#9e9e9e"
      : color === "primary"
        ? "#1976d2"
        : color === "warning"
          ? "#f59e0b"
          : "#10b981";

  return (
    <Box sx={{ p: 2 }}>
      <Typography
        variant="h4"
        sx={{ fontWeight: 700, color: "text.primary", mb: 3 }}
      >
        Tasks
      </Typography>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          pb: 2,
          minHeight: "calc(100vh - 240px)",
        }}
      >
        {columns.map((col) => (
          <Box
            key={col.key}
            onDragOver={onDragOver}
            onDrop={() => handleDrop(col.key)}
            onDragEnter={() => setDroppingColumn(col.key)}
            onDragLeave={(e) => {
              const related = e.relatedTarget as Node | null;
              if (related && col.key !== "done") {
                const colEl = e.currentTarget as HTMLElement;
                if (!colEl.contains(related)) setDroppingColumn(null);
              }
            }}
            sx={{
              flex: "0 0 320px",
              display: "flex",
              flexDirection: "column",
              bgcolor:
                droppingColumn === col.key
                  ? mode === "dark"
                    ? `${col.accent}22`
                    : `${col.accent}15`
                  : mode === "dark"
                    ? col.bgDark
                    : col.bgLight,
              borderRadius: 2,
              border: `1px solid ${droppingColumn === col.key ? col.accent : "divider"}`,
              boxShadow:
                droppingColumn === col.key
                  ? `0 0 0 1px ${col.accent}40`
                  : undefined,
              transition:
                "background-color 0.15s, border-color 0.15s, box-shadow 0.15s",
            }}
          >
            <Box
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: col.accent, flex: 1 }}
              >
                {col.label}
              </Typography>
              <Chip
                label={
                  columns.find((c) => c.key === col.key)?.cards.length ?? "?"
                }
                color={col.color}
                variant="outlined"
              />
            </Box>

            <Box
              sx={{
                p: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                flexGrow: 1,
                minHeight: 200,
              }}
            >
              {col.cards.map((card) => (
                <Card
                  key={`${card.resourceId}:${card.caseId}`}
                  elevation={
                    draggedId &&
                    draggedId.resourceId === card.resourceId &&
                    draggedId.idwf === card.idwf &&
                    draggedId.caseId === card.caseId
                      ? 4
                      : 1
                  }
                  draggable
                  onDragStart={() => onDragStart(card)}
                  onDragEnd={() => {
                    // intentionally empty — dragend fires before drop on target,
                    // clearing draggedId would break handleDrop. Cleanup happens in handleDrop.
                  }}
                  sx={{
                    cursor:
                      (card.status === "pending" && !card.lockedByMe) ||
                      card.status === "done"
                        ? "default"
                        : "grab",
                    opacity:
                      draggedId &&
                      draggedId.resourceId === card.resourceId &&
                      draggedId.idwf === card.idwf &&
                      draggedId.caseId === card.caseId
                        ? 0.5
                        : 1,
                    borderLeft: `4px solid ${columnBorderColor(col.color)}`,
                    transition: "box-shadow 0.15s, opacity 0.15s",
                    "&:hover": { boxShadow: 3 },
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <TaskTypeIcon tasktype={card.tasktype} size={18} />
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, flex: 1 }}
                      >
                        {card.title}
                      </Typography>
                    {card.status !== "pending" && (
                      <Chip
                        icon={<Lock size={14} />}
                        sx={{ bgcolor: 'grey.200', color: 'grey.800' }}
                        size="small"
                      />
                    )}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      {card.timeElapsed && (
                        <Chip
                          label={card.timeElapsed}
                          variant="outlined"
                          sx={{ fontWeight: 500, py: 0.75 }}
                        />
                      )}
                    </Box>

                    {card.checkDate && (
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeDate(card.checkDate)}
                      </Typography>
                    )}
                    <Box
                      sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}
                    >
                      {["resource_id", "case_id", "idwf"].map((key) => (
                        <Chip
                          key={key}
                          label={`${key}=${card[key === "resource_id" ? "resourceId" : key === "case_id" ? "caseId" : "idwf"]}`}
                          variant="outlined"
                          color="secondary"
                          sx={{ fontFamily: "monospace", py: 0.75, px: 1 }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
          severity={notification.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
