'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import api from '../../../../../src/api/client';

// Lucide icons (imported via path to avoid name mismatches in lucide-react v1.x)
import { ArrowLeft as ArrowLeftIcon } from 'lucide-react';
import { Star as StarOutlineIcon } from 'lucide-react';
import { StarOff as StarOffIcon } from 'lucide-react';
import { Trash2 as Trash2Icon } from 'lucide-react';
import { Reply as ReplyIcon } from 'lucide-react';

// --- Types ---

interface MessageRead {
  msgid: string;
  subject: string;
  body: string;
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

// --- Component ---

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const messageid = Array.isArray(params.id) ? params.id[0] : params.id;

  // Fetch single message — marks it as read on retrieval per API spec
  const { data: message, isLoading, error } = useQuery({
    queryKey: ['message', messageid],
    queryFn: () => api.get<MessageRead>(`/inbox/message/${messageid}/`).then((r: {data: MessageRead}) => r.data),
    enabled: !!messageid,
  });

  // Delete mutation — moves message to trash
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inbox/message/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folderMessages'] });
      router.push('/dashboard/inbox');
    },
  });

  // Star toggle mutation
  const starMutation = useMutation({
    mutationFn: (star: boolean) => api.patch(`/inbox/message/${messageid}/`, { star }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['message', messageid] }),
  });

  if (!messageid) return null;

  if (isLoading || deleting) {
    return (
      <Backdrop open={true} sx={{ color: '#fff', zIndex: 1300 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  if (error) {
    return (
      <Box sx={{p: 4}}>
        <Typography variant="h5" gutterBottom>
          Message not found
        </Typography>
        <Button onClick={() => router.push('/dashboard/inbox')}>Back to Inbox</Button>
      </Box>
    );
  }

  if (!message) return null;

  const handleDelete = () => {
    setDeleting(true);
    deleteMutation.mutate(messageid);
  };

  const handleStarToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    starMutation.mutate(!message.star);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* Back button */}
      <IconButton onClick={() => router.push('/dashboard/inbox')} aria-label="Back to inbox">
        <ArrowLeftIcon width={24} height={24} />
      </IconButton>

      {/* Subject */}
      <Typography variant="h5" component="h1" sx={{ mt: 1, mb: 2, fontWeight: 600 }}>
        {message.subject || '(No subject)'}
      </Typography>

      {/* Metadata row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        <Chip label={message.folder} variant="outlined" />
        {message.from_user !== null && (
          <>
            <Typography variant="body2" color="text.secondary">From</Typography>
            <Typography variant="body2">User #{message.from_user}</Typography>
          </>
        )}
        <Typography variant="body2" color="text.secondary">Sent at {message.msg_time || 'Unknown time'}</Typography>
      </Box>

      {/* Actions row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={handleStarToggle} aria-label={message.star ? 'Unstar message' : 'Star message'}>
          {message.star ? (
            <StarOffIcon width={20} height={20} fill="#f59e0b" stroke="#f59e0b" />
          ) : (
            <StarOutlineIcon width={20} height={20} />
          )}
        </IconButton>

        <Button variant="outlined" startIcon={<Trash2Icon width={18} height={18} />} onClick={handleDelete}>
          Delete
        </Button>

        <Button variant="outlined" startIcon={<ReplyIcon width={18} height={18} />}>
          Reply
        </Button>

      </Box>
      {/* Divider */}
      <Divider />

      {/* Body content */}
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
          {message.body || '(Empty message)'}
        </CardContent>
      </Card>
    </Box>
  );
}
