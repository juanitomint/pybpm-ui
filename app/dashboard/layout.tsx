"use client";

import { useQuery } from "@tanstack/react-query";
import api from "../../src/api/client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// MUI components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import { LayoutDashboard as LayoutDashboardIcon } from "lucide-react";
import { PanelLeftClose as PanelLeftCloseIcon } from "lucide-react";
import { PanelLeftOpen as PanelLeftOpenIcon } from "lucide-react";
import { Inbox as InboxIcon } from "lucide-react";
import { BarChart3 as BarChart3Icon } from "lucide-react";
import { Settings as SettingsIcon } from "lucide-react";
import { MoonStar as MoonStarIcon } from "lucide-react";
import { Sun as SunIcon } from "lucide-react";
import { CircleCheck as CircleCheckIcon } from "lucide-react";
// Auth
import { useAuth } from "../../src/hooks/useAuth";
import { setAuthToken } from "../actions/set-auth-cookie";
import { useTheme } from "../providers";

interface TasksCountResponse {
  pending: number;
  validating: number;
}

const TASKS_COUNT_QUERY_KEY = ["dashboard-tasks-count"] as const;

async function fetchTasksCount(): Promise<TasksCountResponse> {
  const res = await api.get("/dashboard/tasks/count");
  return res.data;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function NavItem({ href, icon, label, badge }: NavItemProps) {
  return (
    <ListItem component={Link} href={href} disablePadding sx={{ py: 0.5 }}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={label} />
      {badge !== undefined && badge > 0 && (
        <Box
          sx={{
            bgcolor: "primary.main",
            borderRadius: 1,
            px: 0.75,
            py: 0.25,
            color: "white",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {badge}
        </Box>
      )}
    </ListItem>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const { mode, toggleTheme } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();

  // Tasks count from API
  const { data: tasksCount } = useQuery({
    queryKey: TASKS_COUNT_QUERY_KEY,
    queryFn: fetchTasksCount,
    staleTime: 30_000,
  });

  // Auth guard — redirect to login if no token (replaces deprecated middleware)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && typeof window !== "undefined") {
      router.replace(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
      );
    }
  }, [router]);

  // Popover state for profile menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isDark = mode === "dark";

  const handleToggleDrawer = () => setDrawerOpen((prev) => !prev);

  const themeIcon = isDark ? <SunIcon size={20} /> : <MoonStarIcon size={20} />;

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    // Clear server-side cookie
    await setAuthToken("");
    // Clear client-side token
    localStorage.removeItem("token");
    logout();
    router.push("/login");
  };

  const popoverOpen = Boolean(anchorEl);
  const popoverId = popoverOpen ? "profile-popover" : undefined;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton onClick={handleToggleDrawer} size="large" edge="start">
            {drawerOpen ? (
              <PanelLeftCloseIcon size={24} />
            ) : (
              <PanelLeftOpenIcon size={24} />
            )}
          </IconButton>

          <Typography variant="h6" noWrap sx={{ ml: 1.5, fontWeight: 700 }}>
            dna2bpm
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* Theme toggle */}
          <IconButton onClick={toggleTheme} size="small">
            <span suppressHydrationWarning>{themeIcon}</span>
          </IconButton>

          {/* Profile menu */}
          {user && (
            <>
              <IconButton
                onClick={handleProfileClick}
                size="small"
                sx={{ ml: 1 }}
              >
                <Typography variant="body2">{user.nick}</Typography>
              </IconButton>

              <Popover
                id={popoverId}
                open={popoverOpen}
                anchorEl={anchorEl}
                onClose={handleProfileClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <List dense sx={{ py: 0 }}>
                  <ListItem>
                    <ListItemText primary={user.nick} secondary={user.name} />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText onClick={handleLogout}>Sign out</ListItemText>
                  </ListItem>
                </List>
              </Popover>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerOpen ? 240 : 64,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerOpen ? 240 : 64,
            transition: "width 0.2s",
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            <NavItem
              href="/dashboard"
              icon={<LayoutDashboardIcon size={24} />}
              label="Dashboard"
            />
            <NavItem
              href="/dashboard/tasks"
              icon={<CircleCheckIcon size={24} />}
              label="Tasks"
              badge={
                tasksCount
                  ? tasksCount.pending + tasksCount.validating
                  : undefined
              }
            />
            <NavItem
              href="/dashboard/inbox"
              icon={<InboxIcon size={24} />}
              label="Inbox"
              badge={12}
            />
          </List>

          <Divider />

          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Analytics
            </Typography>
          </Box>

          <List>
            <NavItem
              href="/dashboard/reports"
              icon={<BarChart3Icon size={24} />}
              label="Reports"
            />
            <NavItem
              href="/settings"
              icon={<SettingsIcon size={24} />}
              label="Settings"
              badge={0}
            />
          </List>

          <Divider />

          {/* User info at bottom of sidebar */}
          {user && (
            <>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2">{user.nick}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Admin
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, bgcolor: "background.default" }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
