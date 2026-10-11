"use client";
import { useEffect, useState } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { useAuth } from "../../src/hooks/useAuth";
import api from "../../src/api/client";
import { BarChart3 } from "lucide-react";
import { Clock } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { AlertTriangle } from "lucide-react";

interface CaseCounts {
  open: number;
  closed: number;
}
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const theme = useTheme();
  const [counts, setCounts] = useState<CaseCounts | null>(null);

  useEffect(() => {
    if (authLoading) return;
    api
      .get("/dashboard/cases/count")
      .then((res) => setCounts(res.data))
      .catch((_err) => setCounts(null));
  }, [authLoading]);

  const total = (counts?.open ?? 0) + (counts?.closed ?? 0);
  const pending = counts?.open ?? 0;
  const completed = counts?.closed ?? 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: "text.primary" }}>
        Welcome back, {user?.nick || "User"}!
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: { xs: "wrap", md: "nowrap" },
          gap: 2,
          mt: 2,
        }}
      >
        {[
          {
            label: "Total Cases",
            value: String(total),
            icon: BarChart3,
            color: theme.palette.primary.main,
          },
          {
            label: "Open",
            value: String(pending),
            icon: Clock,
            color: theme.palette.warning.main,
          },
          {
            label: "Closed",
            value: String(completed),
            icon: CheckCircle2,
            color: theme.palette.success.main,
          },
          {
            label: "Overdue",
            value: "0",
            icon: AlertTriangle,
            color: theme.palette.error.main,
          },
        ].map((card) => (
          <Box
            key={card.label}
            sx={{ flex: "1 1 calc(33.33% - 16px)", minWidth: 280 }}
          >
            <Card
              elevation={0}
              sx={{
                borderLeft: `4px solid ${card.color}`,
                transition: "box-shadow 0.2s",
                "&:hover": { boxShadow: 3 },
              }}
            >
              <CardContent>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <card.icon size={24} color={card.color} />
                  <Typography variant="body2" color="text.secondary">
                    {card.label}
                  </Typography>
                </Box>
                <Typography
                  variant="h3"
                  sx={{ fontWeight: 700, color: card.color }}
                >
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
