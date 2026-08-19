'use client';
import { Box, Card, CardContent, Typography } from '@mui/material';

import { useAuth } from '../../src/hooks/useAuth';
import { BarChart3 } from 'lucide-react';
import { Clock } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
const kpiCards = [
  { label: 'Total Tasks', value: '0', icon: BarChart3, color: '#1976d2' },
  { label: 'Pending', value: '0', icon: Clock, color: '#f59e0b' },
  { label: 'Completed', value: '0', icon: CheckCircle2, color: '#10b981' },
  { label: 'Overdue', value: '0', icon: AlertTriangle, color: '#ef4444' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'text.primary' }}>
        Welcome back, {user?.nick || 'User'}!
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: 2, mt: 2 }}>
        {kpiCards.map((card) => (
          <Box key={card.label} sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 280 }}>
            <Card
              elevation={0}
              sx={{
                borderLeft: `4px solid ${card.color}`,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 3 },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <card.icon size={24} color={card.color} />
                  <Typography variant="body2" color="text.secondary">
                    {card.label}
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: card.color }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
