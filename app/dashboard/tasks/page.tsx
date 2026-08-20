'use client';

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme } from '../../providers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import api from '../../../src/api/client';

// --- Types --------------------------------------------------------------- //

interface TaskListItem {
  resourceId: string;
  idwf: string;
  type: string;
  title: string;
  status: 'user' | 'validating' | 'done';
  locked_by: number | null;
  locked: boolean;
  locked_by_nick: string | null;
  checkDate: string | null;
  timeElapsed: string;
  modelName: string;
  caseId: string;
}

interface TasksListResponse {
  tasks: TaskListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

type KanbanStatus = 'pending' | 'in_progress' | 'validating' | 'done';

const STATUS_TO_BACKEND: Record<KanbanStatus, string> = {
  pending: 'user',
  in_progress: 'user',
  validating: 'validating',
  done: 'done',
};

interface KanbanCard {
  resourceId: string;
  idwf: string;
  title: string;
  status: KanbanStatus;
  lockedByMe: boolean;
  checkDate: Date | null;
  timeElapsed: string;
  modelName: string;
  caseId: string;
}

interface ColumnDef {
  key: KanbanStatus;
  label: string;
  color: 'default' | 'primary' | 'warning' | 'info' | 'success';
  accent: string;
  bgLight: string;
  bgDark: string;
}

// --- Helpers ------------------------------------------------------------- //

function formatRelativeDate(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < -3) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays} days from now`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- Kanban columns ------------------------------------------------------ //

const COLUMNS: ColumnDef[] = [
  { key: 'pending', label: 'Pending', color: 'default', accent: '#757575', bgLight: '#f5f5f5', bgDark: '#242424' },
  { key: 'in_progress', label: 'In Progress', color: 'primary', accent: '#1976d2', bgLight: '#e3f2fd', bgDark: '#0a1b2e' },
  { key: 'validating', label: 'Validating', color: 'warning', accent: '#f59e0b', bgLight: '#fff8e1', bgDark: '#2c1e00' },
  { key: 'done', label: 'Done', color: 'success', accent: '#10b981', bgLight: '#e8f5e9', bgDark: '#071a0e' },
];

const QUERY_KEYS = {
  all: ['dashboard-tasks'] as const,
  pending: ['tasks', 'pending'] as const,
  in_progress: ['tasks', 'in_progress'] as const,
  validating: ['tasks', 'validating'] as const,
  done: ['tasks', 'done'] as const,
};

// --- Backend calls ------------------------------------------------------- //

 async function fetchTasksList(statusFilter?: string): Promise<TasksListResponse> {
   const params = new URLSearchParams({ page: '1', per_page: '99' });
   if (statusFilter) params.set('status', statusFilter);
   const res = await api.get<TasksListResponse>(`/api/dashboard/tasks-proxy?${params.toString()}`);
   return res.data;
 }

/** PATCH /dashboard/tasks/status — composite PK + target_status come in request body. */
async function transitionTask(resourceId: string, idwf: string, targetStatus: KanbanStatus): Promise<void> {
  const res = await api.patch('/dashboard/tasks/status', {
    resource_id: resourceId,
    idwf,
    target_status: STATUS_TO_BACKEND[targetStatus],
  });
  if (res.status >= 400) throw new Error(`transition failed: ${res.status}`);
}

// --- Component ----------------------------------------------------------- //

export default function TasksPage() {
  const [draggedId, setDraggedId] = useState<{ resourceId: string; idwf: string } | null>(null);
  const [droppingColumn, setDroppingColumn] = useState<KanbanStatus | null>(null);
  const queryClient = useQueryClient();
  const { mode } = useTheme();

   const { data: pendingData, isLoading: loadingPending } = useQuery({
     queryKey: QUERY_KEYS.pending,
     queryFn: () => fetchTasksList(),
   });

  const { data: inProgressData } = useQuery({
    queryKey: QUERY_KEYS.in_progress,
    queryFn: () => fetchTasksList('user'),
    select: (data) => ({ ...data, _lockedOnly: true }),
  });

  const { data: validatingData } = useQuery({
    queryKey: QUERY_KEYS.validating,
    queryFn: () => fetchTasksList('validating'),
  });

  const { data: doneData } = useQuery({
    queryKey: QUERY_KEYS.done,
    queryFn: () => fetchTasksList('done'),
  });

  const isLoading = loadingPending;

  const seededBoard: KanbanCard[] = useMemo(() => {
    const seed = (items: TaskListItem[], status: KanbanStatus): KanbanCard[] => items.map((t) => ({
      resourceId: t.resourceId,
      idwf: t.idwf,
      title: t.title || '(no title)',
      status,
      lockedByMe: !!t.locked_by,
      checkDate: t.checkDate ? new Date(t.checkDate) : null,
      timeElapsed: t.timeElapsed,
      modelName: t.modelName,
      caseId: t.caseId,
    }));

    const all = [
      ...seed(pendingData?.tasks ?? [], 'pending'),
      ...seed(inProgressData?.tasks ?? [], 'in_progress'),
      ...seed(validatingData?.tasks ?? [], 'validating'),
      ...seed(doneData?.tasks ?? [], 'done'),
    ];

    const seen = new Set<string>();
    return all.filter((c) => {
      const key = `${c.resourceId}:${c.idwf}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pendingData, inProgressData, validatingData, doneData]);

  const columns = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      cards: seededBoard.filter((c) => c.status === col.key),
    }));
  }, [seededBoard]);

  // --- Mutations (useMutation per AGENTS.md) --------------------------- //

  const transitionMutation = useMutation({
    mutationFn: ({ resourceId, idwf, targetStatus }: { resourceId: string; idwf: string; targetStatus: KanbanStatus }) =>
      transitionTask(resourceId, idwf, targetStatus),
    onMutate: async ({ resourceId, idwf, targetStatus }) => {
      const previousBoard = queryClient.getQueryData<KanbanCard[]>(QUERY_KEYS.all);
      if (previousBoard) {
        queryClient.setQueryData(
          QUERY_KEYS.all,
          previousBoard.map((c) =>
            c.resourceId === resourceId && c.idwf === idwf ? { ...c, status: targetStatus } : c,
          ),
        );
      }

      await queryClient.cancelQueries({ queryKey: QUERY_KEYS[targetStatus] });

      return { resourceId, idwf };
    },
    onSuccess: async (_data, variables) => {
      const { targetStatus } = variables;
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS[targetStatus] });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
    onError: (err, _variables) => {
      const axiosErr = err as { response?: { status?: number }; message?: string };
      if (axiosErr.response?.status === 409) {
        console.warn('[Kanban] 409 Conflict — likely already locked by another user');
      } else {
        console.warn('[Kanban] Transition failed:', axiosErr.message ?? err);
      }
    },
  });

  // --- Drag handlers --------------------------------------------------- //

  const onDragStart = (card: KanbanCard) => {
    setDraggedId({ resourceId: card.resourceId, idwf: card.idwf });
  };

  const onDragEnd = () => {
    setDraggedId(null);
    setDroppingColumn(null);
  };

  const handleDrop = async (targetStatus: KanbanStatus) => {
    if (!draggedId || droppingColumn !== targetStatus) return;
    const card = seededBoard.find(
      (c) => c.resourceId === draggedId.resourceId && c.idwf === draggedId.idwf,
    );
    if (!card) return;

    setDroppingColumn(null);
    const from = card.status;

    try {
      // AGENTS.md: pending → in_progress requires lock first.
      if (from !== targetStatus && from === 'pending' && targetStatus === 'in_progress') {
        await api.patch('/dashboard/tasks/lock', {
          resource_id: card.resourceId,
          idwf: card.idwf,
        });
      } else if (from !== targetStatus && from === 'in_progress' && targetStatus === 'pending') {
        await api.patch('/dashboard/tasks/unlock', {
          resource_id: card.resourceId,
          idwf: card.idwf,
        });
      }

      transitionMutation.mutate({ resourceId: card.resourceId, idwf: card.idwf, targetStatus });
    } catch (err) {
      console.warn('[Kanban] Pre-transition step failed:', err);
    } finally {
      setDraggedId(null);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const columnBorderColor = (color: ColumnDef['color']) =>
    color === 'default' ? '#9e9e9e' : color === 'primary' ? '#1976d2' : color === 'warning' ? '#f59e0b' : '#10b981';

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 3 }}>
        Tasks
      </Typography>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, minHeight: 'calc(100vh - 240px)' }}>
        {columns.map((col) => (
          <Box
            key={col.key}
            onDragOver={onDragOver}
            onDrop={() => handleDrop(col.key)}
            onDragEnter={() => setDroppingColumn(col.key)}
            onDragLeave={(e) => {
              const related = e.relatedTarget as Node | null;
              if (related && col.key !== 'done') {
                const colEl = e.currentTarget as HTMLElement;
                if (!colEl.contains(related)) setDroppingColumn(null);
              }
            }}
            sx={{
              flex: '0 0 320px',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: droppingColumn === col.key
                ? (mode === 'dark' ? `${col.accent}22` : `${col.accent}15`)
                : mode === 'dark' ? col.bgDark : col.bgLight,
              borderRadius: 2,
              border: `1px solid ${droppingColumn === col.key ? col.accent : 'divider'}`,
              boxShadow: droppingColumn === col.key ? `0 0 0 1px ${col.accent}40` : undefined,
              transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: col.accent, flex: 1 }}>
                {col.label}
              </Typography>
              <Chip label={columns.find((c) => c.key === col.key)?.cards.length ?? '?'} size="small" color={col.color} variant="outlined" />
            </Box>

            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1, minHeight: 200 }}>
              {col.cards.map((card) => (
                <Card
                  key={`${card.resourceId}:${card.idwf}`}
                  elevation={draggedId && draggedId.resourceId === card.resourceId && draggedId.idwf === card.idwf ? 4 : 1}
                  draggable
                  onDragStart={() => onDragStart(card)}
                  onDragEnd={onDragEnd}
                  sx={{
                    cursor: (card.status === 'pending' && !card.lockedByMe) || card.status === 'validating' || card.status === 'done' ? 'default' : 'grab',
                    opacity: draggedId && draggedId.resourceId === card.resourceId && draggedId.idwf === card.idwf ? 0.5 : 1,
                    borderLeft: `4px solid ${columnBorderColor(col.color)}`,
                    transition: 'box-shadow 0.15s, opacity 0.15s',
                    '&:hover': { boxShadow: 3 },
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>{card.title}</Typography>
                      {card.status !== 'pending' && (
                        <Chip label={`${card.status} (locked)`} size="small" color="warning" />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {card.timeElapsed && (
                        <Chip label={card.timeElapsed} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
                      )}
                    </Box>

                    {card.checkDate && (
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeDate(card.checkDate)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
