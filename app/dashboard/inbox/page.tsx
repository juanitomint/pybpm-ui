'use client';

import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Pagination from '@mui/material/Pagination';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import api from '../../../src/api/client';

// Lucide icons (imported via path to avoid name mismatches in lucide-react v1.x)
import { Star as StarIcon } from 'lucide-react';
import { StarOff as StarOffIcon } from 'lucide-react';
import { Clock as ClockIcon } from 'lucide-react';
import { MoreVertical as MoreVerticalIcon } from 'lucide-react';
import { Trash2 as Trash2Icon } from 'lucide-react';
import { Archive as ArchiveIcon } from 'lucide-react';

// --- Types ---

interface MessageRead {
  msgid: string;
  subject: string;
  body?: string;
  from_user: number | null;
  to_user: number;
  folder: 'inbox' | 'sent' | 'trash';
  read: boolean;
  star: boolean;
  tag: string | null;
  checkdate: Date | null;
  icon_star: string;
  msg_time: string;
}

interface FolderMessagesResponse {
  messages: MessageRead[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

type ReadFilter = 'all' | 'read' | 'unread';

// --- Helpers ---

function formatMessageTime(msgTime: string): string {
  if (!msgTime) return '';
  const date = new Date(msgTime);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function formatSender(fromUser: number | null): string {
  if (fromUser === null) return 'Unknown';
  return `User #${fromUser}`;
}

// --- Skeleton (simplified)
function MessageListSkeleton() { return <div>Loading...</div>; }

export default function InboxPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRead, setFilterRead] = useState<ReadFilter>('all');

  const itemsPerPage = 15;

  // Fetch inbox messages via POST /inbox/filter/
  const { data: folderResponse, isLoading } = useQuery({
    queryKey: ['inbox-filter', filterRead, page],
    queryFn: async () => {
      const body: Record<string, unknown> = { folder: 'inbox' };
      if (filterRead === 'read') body.read = true;
      else if (filterRead === 'unread') body.read = false;
      if (searchTerm) body.filter_query = searchTerm;
      body.page = page;
      body.per_page = itemsPerPage;

      const res = await api.post<FolderMessagesResponse>('/inbox/filter/', body);
      return res.data;
    },
  });

  // Star toggle mutation with optimistic updates
  const starMutation = useMutation({
    mutationFn: async ({ msgid, starred }: { msgid: string; starred: boolean }) => {
      await api.patch(`/inbox/message/${msgid}/`, { star: starred });
    },
    onMutate: async ({ msgid, starred }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['inbox-filter'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<FolderMessagesResponse>(['inbox-filter', filterRead, page]);

      // Optimistically update local cache
      if (previousData) {
        const updatedMessages = previousData.messages.map((msg) =>
          msg.msgid === msgid ? { ...msg, star: starred } : msg
        );
        queryClient.setQueryData<FolderMessagesResponse>(['inbox-filter', filterRead, page], {
          ...previousData,
          messages: updatedMessages,
        });
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inbox-filter', filterRead, page], context.previousData);
      }
    },
    onSettled: () => {
      // Invalidate to refetch and sync with server
      void queryClient.invalidateQueries({ queryKey: ['inbox-filter'] });
    },
  });

  // Delete (trash) mutation
  const trashMutation = useMutation({
    mutationFn: async (msgid: string) => {
      await api.delete(`/inbox/message/${msgid}/`);
    },
    onMutate: async (msgid) => {
      await queryClient.cancelQueries({ queryKey: ['inbox-filter'] });
      const previousData = queryClient.getQueryData<FolderMessagesResponse>(['inbox-filter', filterRead, page]);
      if (previousData) {
        const updatedMessages = previousData.messages.filter((m) => m.msgid !== msgid);
        const newTotalPages = Math.max(1, Math.ceil(updatedMessages.length / itemsPerPage));
        queryClient.setQueryData<FolderMessagesResponse>(['inbox-filter', filterRead, page], {
          ...previousData,
          messages: updatedMessages,
          total_count: previousData.total_count - 1,
          total_pages: newTotalPages,
        });

        // If current page becomes empty, go to previous page
        if (updatedMessages.length === 0 && page > 1) {
          setPage((prev) => prev - 1);
        }
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-filter'] });
    },
  });

  const messages = folderResponse?.messages ?? [];
  const totalPages = folderResponse?.total_pages ?? 1;
  const totalCount = folderResponse?.total_count ?? 0;

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleFilterReadChange = (newFilter: ReadFilter) => {
    setFilterRead(newFilter);
    setPage(1); // Reset to first page when filter changes
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Inbox
        </Typography>
        <Badge badgeContent={totalCount} color="primary">
          <Chip
            icon={<ArchiveIcon size={16} />}
            label={`${totalCount} message${totalCount !== 1 ? 's' : ''}`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 500 }}
          />
        </Badge>
      </Box>

      {/* Filter & Search Controls */}
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
        <Button
          variant={filterRead === 'all' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => handleFilterReadChange('all')}
          color="primary"
        >
          All
        </Button>
        <Button
          variant={filterRead === 'unread' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => handleFilterReadChange('unread')}
          startIcon={<Badge color="error" variant="dot"><StarOffIcon size={14} /></Badge>}
        >
          Unread
        </Button>
        <Button
          variant={filterRead === 'read' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => handleFilterReadChange('read')}
          startIcon={<StarOffIcon size={14} />}
        >
          Read
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        {searchTerm && (
          <>
            <Chip label={`Search: "${searchTerm}"`} onDelete={() => setSearchTerm('')} color="info" variant="outlined" />
            <Button size="small" onClick={() => setSearchTerm('')}>Clear</Button>
          </>
        )}

        <Button
          size="small"
          startIcon={<ClockIcon size={14} />}
          onClick={() => { /* Could expand to date range picker */ }}
          color="inherit"
        >
          Any time
        </Button>
      </Box>

      {/* Message List */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        {isLoading ? (
          <MessageListSkeleton />
        ) : messages.length === 0 ? (
          /* Empty state */
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No messages found
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {searchTerm ? `No results for "${searchTerm}"` : filterRead !== 'all' ? `No ${filterRead} messages in your inbox.` : 'Your inbox is empty.'}
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ py: 0 }}>
            {messages.map((msg) => (
              <React.Fragment key={msg.msgid}>
                <ListItem
                  component="button"
                  onClick={() => router.push(`/dashboard/inbox/message/${msg.msgid}`)}
                  alignItems="flex-start"
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: msg.read ? 'transparent' : 'primary.light',
                    '&:hover': { backgroundColor: !msg.read ? 'primary.lighter' : 'action.hover' },
                    cursor: 'pointer',
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="body1"
                        noWrap
                        sx={{
                          fontWeight: msg.read ? 400 : 700,
                          color: msg.read ? 'text.primary' : 'primary.dark',
                        }}
                      >
                        {msg.subject || '(no subject)'}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.25 }}>
                        <Chip label={formatSender(msg.from_user)} variant="outlined" color="info" sx={{ py: 1, px: 1.5 }} />
                        <Typography variant="caption" color="text.secondary">
                          {msg.tag && (
                            <>
                              · Tagged as{" "}
                              <Chip label={msg.tag} variant="outlined" color="success" />
                            </>
                          )}
                        </Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <ClockIcon size={14} color="text.disabled" />
                        <Typography variant="caption" color="text.secondary">
                          {formatMessageTime(msg.msg_time)}
                        </Typography>
                      </Box>
                    }
                  />

                  {/* Action buttons */}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      starMutation.mutate({ msgid: msg.msgid, starred: !msg.star });
                    }}
                    sx={{ color: msg.star ? 'warning.main' : 'text.secondary', mr: 0.5 }}
                  >
                    {msg.star ? <StarIcon size={18} /> : <StarOffIcon size={18} />}
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      trashMutation.mutate(msg.msgid);
                    }}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                  >
                    <Trash2Icon size={16} />
                  </IconButton>

                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <MoreVerticalIcon size={18} />
                  </IconButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
            siblingCount={1}
            boundaryCount={1}
          />
        </Box>
      )}

      {/* Footer info */}
      {messages.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          Showing page {page} of {totalPages} — {totalCount} total messages
        </Typography>
      )}
    </Box>
  );
}
