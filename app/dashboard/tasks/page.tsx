'use client';

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Pagination from '@mui/material/Pagination';
import { useQuery } from '@tanstack/react-query';

import api from '../../../src/api/client';

// Lucide icons (imported via path to avoid name mismatches in lucide-react v1.x)
import { Clock as ClockIcon } from 'lucide-react';
import { Flag as FlagIcon } from 'lucide-react';
import { CheckCircle as CheckCircleIcon } from 'lucide-react';
import { XCircle as XCircleIcon } from 'lucide-react';
import { AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { Filter as FilterIcon } from 'lucide-react';
import { ArrowUpDown as ArrowUpDownIcon } from 'lucide-react';

// --- Types ---

interface InboxMessage {
  msgid: string;
  subject: string;
  body?: string;
  from_user?: string;
  to_user?: string;
  folder: 'inbox' | 'sent' | 'trash';
  read: boolean;
  star: boolean;
  tag?: string;
  checkdate?: Date | null;
  msg_time?: Date;
}

interface TaskCard {
  id: string;
  title: string;
  status: InboxMessage['folder'];
  priority: 'high' | 'normal';
  dueDate: Date | null;
  progress: number;
  isRead: boolean;
  starred: boolean;
}

type FilterStatus = 'all' | 'inbox' | 'sent' | 'trash';
type SortBy = 'due-date' | 'priority' | 'subject';
type SortOrder = 'asc' | 'desc';

// --- Helpers ---

function formatRelativeDate(date: Date | null): string {
  if (!date) return 'No due date';

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -3) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays} days from now`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateAbsolute(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// --- Component ---

export default function TasksPage() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('due-date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch tasks: POST /api/v1/inbox/filter/ with { tag: 'task', folder }
  const { data: messages, isLoading } = useQuery({
    queryKey: ['inbox-filter', filterStatus],
    queryFn: async () => {
      const body: Record<string, unknown> = { tag: 'task' };
      if (filterStatus !== 'all') {
        body.folder = filterStatus;
      }
      const res = await api.post<InboxMessage[]>('/inbox/filter/', body);
      return res.data;
    },
  });

  // Map inbox messages to TaskCard
  const tasks: TaskCard[] = useMemo(() => {
    if (!messages) return [];
    return messages.map((msg) => ({
      id: msg.msgid,
      title: msg.subject || '(no subject)',
      status: msg.folder,
      priority: (msg.tag === 'high' ? 'high' : 'normal'),
      dueDate: msg.checkdate ?? null,
      progress: Math.round(Math.random() * 100), // simulated progress
      isRead: !!msg.read,
      starred: !!msg.star,
    }));
  }, [messages]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'due-date') {
        if (!a.dueDate && !b.dueDate) cmp = 0;
        else if (!a.dueDate) cmp = 1;
        else if (!b.dueDate) cmp = -1;
        else cmp = a.dueDate.getTime() - b.dueDate.getTime();
      } else if (sortBy === 'priority') {
        const priorityOrder = { high: 0, normal: 1 };
        cmp = priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === 'subject') {
        cmp = a.title.localeCompare(b.title);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [tasks, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / itemsPerPage));
  const paginatedTasks = sortedTasks.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const toggleSortOrder = () => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{fontWeight: 700, color: 'text.primary'}}>
          Tasks
        </Typography>
        <Chip
          icon={<FilterIcon size={16} />}
          label={`${sortedTasks.length} task${sortedTasks.length !== 1 ? 's' : ''}`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 500 }}
        />
      </Box>

      {/* Filter & Sort Controls */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
          mb: 3,
          p: 2,
          borderRadius: 2,
          bgcolor: 'action.hover',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => { setFilterStatus(e.target.value as FilterStatus); setPage(1); }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="inbox">Inbox</MenuItem>
            <MenuItem value="sent">Sent</MenuItem>
            <MenuItem value="trash">Trash</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            label="Sort by"
            onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1); }}
          >
            <MenuItem value="due-date">Due Date</MenuItem>
            <MenuItem value="priority">Priority</MenuItem>
            <MenuItem value="subject">Subject</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowUpDownIcon size={16} />}
          onClick={toggleSortOrder}
          sx={{ textTransform: 'none' }}
        >
          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        {/* Quick filter tags */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {(['inbox', 'sent', 'trash'] as const).map((status) => (
            <Chip
              key={status}
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              size="small"
              variant={filterStatus === status ? 'filled' : 'outlined'}
              color={status === 'inbox' ? 'primary' : status === 'sent' ? 'success' : 'error'}
              onClick={() => { setFilterStatus(status); setPage(1); }}
              sx={{ cursor: 'pointer', fontWeight: 500 }}
            />
          ))}
        </Box>
      </Box>

      {/* Loading state */}
      {isLoading && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {/* Empty state */}
      {!isLoading && sortedTasks.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            textAlign: 'center',
          }}
        >
          <XCircleIcon size={48} color="#9e9e9e" />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            No tasks found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filterStatus === 'all'
              ? "You're all caught up! No messages in your inbox."
              : `No ${filterStatus} messages matching your filter.`}
          </Typography>
          {filterStatus !== 'all' && (
            <Button
              variant="text"
              onClick={() => setFilterStatus('all')}
              sx={{ mt: 2 }}
            >
              Clear filters
            </Button>
          )}
        </Box>
      )}

      {/* Task Cards Grid */}
      {!isLoading && sortedTasks.length > 0 && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
            {paginatedTasks.map((task) => (
              <Card
                key={task.id}
                elevation={0}
                sx={{
                  border: task.isRead ? 'none' : `2px solid`,
                  borderColor: task.isRead ? 'divider' : 'primary.main',
                  borderRadius: 2,
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 3 },
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  {/* Title */}
                  <Typography variant="subtitle1" sx={{fontWeight: 600}} noWrap gutterBottom>
                    {task.title}
                  </Typography>

                  {/* Meta row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip
                      label={task.status}
                      size="small"
                      color={task.status === 'inbox' ? 'primary' : task.status === 'sent' ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                    {task.priority === 'high' && (
                      <Chip
                        icon={<AlertTriangleIcon size={14} />}
                        label="High priority"
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ fontWeight: 500 }}
                      />
                    )}
                    {task.starred && (
                      <FlagIcon size={16} color="#f59e0b" />
                    )}
                  </Box>

                  {/* Due date */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <ClockIcon size={14} color="#757575" />
                    <Typography variant="caption" color="text.secondary">
                      {task.dueDate ? formatRelativeDate(task.dueDate) : 'No due date'}
                      {task.dueDate && (
                        <>
                          {' • '}
                          <Typography component="span" variant="caption">
                            {formatDateAbsolute(task.dueDate)}
                          </Typography>
                        </>
                      )}
                    </Typography>
                  </Box>

                  {/* Simulated progress bar */}
                  <LinearProgress
                    variant="determinate"
                    value={task.progress}
                    sx={{ borderRadius: 1, height: 4 }}
                    color={task.progress === 100 ? 'success' : 'primary'}
                  />
                </CardContent>

                {/* Card Actions */}
                <CardActions sx={{ px: 2, py: 0.5 }}>
                  {task.priority === 'high' && (
                    <Button size="small" startIcon={<AlertTriangleIcon size={14} />} color="error">
                      Urgent
                    </Button>
                  )}
                  <Box sx={{ flexGrow: 1 }} />
                  <IconButton size="small" title={task.isRead ? 'Mark unread' : 'Mark read'}>
                    {task.isRead ? (
                      <CheckCircleIcon size={16} color="#757575" />
                    ) : (
                      <XCircleIcon size={16} color="primary" />
                    )}
                  </IconButton>
                </CardActions>
              </Card>
            ))}
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
