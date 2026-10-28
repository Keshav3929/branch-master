import { useEffect, useState } from "react";
import {
    AppBar, Toolbar, Box, IconButton, Avatar, Tooltip, Badge,
    Popover, Typography, Button, CircularProgress, Pagination,
    Divider, Dialog, DialogTitle, DialogContent, DialogActions, Stack,
    ListItemIcon, List, ListItemButton, ListItemText, Chip
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoutIcon from "@mui/icons-material/Logout";
import SwitchAccountIcon from "@mui/icons-material/SwitchAccount";
import {
    getNotifications, getUnreadCount,
    markNotificationSeen, markAllNotificationsSeen,
    getSession, signOut
} from "../app/branchApi";
import type { BranchNotification } from "../app/branchApi";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

export default function BranchHeader() {
    const session = getSession();
    const isAdmin = session?.role === "ADMIN";
    const initials = session?.username.slice(0, 2).toUpperCase() ?? "?";
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
    const [unread, setUnread] = useState(0);
    const [notifs, setNotifs] = useState<BranchNotification[]>([]);
    const [page, setPage] = useState(0);
    const [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<BranchNotification | null>(null);

    const refreshUnreadCount = () => {
        getUnreadCount()
            .then(({ data }) => setUnread(data))
            .catch(() => { });
    };
    useEffect(() => {
        refreshUnreadCount();
        window.addEventListener("notifications-updated", refreshUnreadCount);
        return () => { window.removeEventListener("notifications-updated", refreshUnreadCount); };
    }, []);
    useEffect(() => {
        if (!anchorEl) return;
        let cancelled = false;
        getNotifications(page)
            .then(({ data }) => {
                if (cancelled) return;
                setNotifs(data.content);
                setPages(data.totalPages);
            })
            .catch(error => {
                if (!cancelled) {
                    console.error("Failed to load notifications:", error);
                    setNotifs([]);
                }
            }).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [anchorEl, page]);

    const openNotification = async (notification: BranchNotification) => {
        setDetail(notification);
        if (notification.seen) return;
        try {
            await markNotificationSeen(notification.id);
            setNotifs(items => items.map(item => item.id === notification.id ? { ...item, seen: true } : item));
            setDetail(current => current?.id === notification.id ? { ...current, seen: true } : current);
            setUnread(count => Math.max(0, count - 1));
        } catch {/*  */ }
    };
    const markAll = async () => {
        try {
            await markAllNotificationsSeen();
            setNotifs(items => items.map(item => ({ ...item, seen: true })));
            setUnread(0);
        } catch {/* */ }
    };
    const closePopover = () => {
        if (!detail) setAnchorEl(null);
    };
    const toggleBell = (button: HTMLElement) => {
        const next = anchorEl ? null : button;
        setPage(0);
        setAnchorEl(next);
        if (next) {
            setLoading(true);
            refreshUnreadCount();
        }
    };

    return (
        <>
            <AppBar position="fixed" elevation={0} className="app-header">
                <Toolbar className="app-header-toolbar">
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <img src="/dreamsol-logo.jpg" alt="Dreamsol Logo" style={{ height: 50, width: "auto", maxWidth: 240, objectFit: "contain", display: "block" }} />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Tooltip title="Notifications">
                            <IconButton size="small" className="header-icon-btn" onClick={event => toggleBell(event.currentTarget)}>
                                <Badge badgeContent={unread} color="error" max={99}> <NotificationsNoneIcon fontSize="small" /> </Badge>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Profile & Account">
                            <IconButton size="small" className="header-icon-btn" onClick={event => setProfileAnchor(event.currentTarget)}>
                                <Avatar sx={{ width: 34, height: 34, bgcolor: "#17324d", fontSize: "0.85rem", fontWeight: 700 }}>
                                    {session?.username.slice(0, 2).toUpperCase() ?? "?"}{initials}
                                </Avatar>
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>

            <Popover anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={() => setProfileAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { mt: 1, width: 290, borderRadius: 3, overflow: "hidden", boxShadow: "0 18px 48px rgba(15,23,42,0.22)" } } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 2.5, color: "#fff", background: "linear-gradient(135deg, #0f172a 0%, #24496b 100%)" }}>
                    <Avatar sx={{ width: 56, height: 56, bgcolor: "#fff", color: "#17324d", fontWeight: 800, fontSize: "1.2rem", boxShadow: "0 0 0 3px rgba(255,255,255,0.25)" }}>{initials}</Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>{session?.username}</Typography>
                        <Chip size="small" icon={isAdmin ? <AdminPanelSettingsIcon /> : <PersonOutlineIcon />} label={isAdmin ? "Administrator" : "User"}
                            sx={{ mt: 0.5, height: 24, color: "#fff", bgcolor: "rgba(255,255,255,0.18)", "& .MuiChip-icon": { color: "#fff" } }} />
                    </Box>
                </Box>
                <List sx={{ p: 1 }}>
                    <ListItemButton onClick={() => signOut(true)} sx={{ borderRadius: 2, py: 1.25 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}><SwitchAccountIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Change account" secondary="Sign in as someone else" />
                    </ListItemButton>
                    <ListItemButton onClick={() => signOut()} sx={{ borderRadius: 2, py: 1.25, color: "error.main", "&:hover": { bgcolor: "rgba(211,47,47,0.08)" } }}>
                        <ListItemIcon sx={{ minWidth: 40 }}><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText primary="Logout" />
                    </ListItemButton>
                </List>
            </Popover>

            <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={closePopover} disableEnforceFocus anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
                <Box sx={{ width: 380, maxWidth: "95vw" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 1 }}>
                        <Tooltip title="Close notifications">
                            <IconButton size="small" onClick={() => setAnchorEl(null)} disabled={Boolean(detail)}> <ArrowBackIcon fontSize="small" /> </IconButton>
                        </Tooltip>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700}> Notifications </Typography>
                            <Typography variant="caption" color="text.secondary"> {unread} unread </Typography>
                        </Box>
                        <Button size="small" onClick={() => void markAll()} disabled={!unread}> Mark all as read </Button>
                    </Box>
                    <Divider />
                    <Box sx={{ minHeight: 120 }}>
                        {loading && (
                            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}> <CircularProgress size={24} /> </Box>
                        )}
                        {!loading && !notifs.length && (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center" }}> No notifications yet </Typography>
                        )}
                        {notifs.map(notification => (
                            <Box key={notification.id} onClick={() => void openNotification(notification)} sx={{ px: 2, py: 1.25, cursor: "pointer", bgcolor: notification.seen ? "transparent" : "#eef4ff", borderBottom: "1px solid #eef0f4", "&:hover": { bgcolor: notification.seen ? "#fafafa" : "#e3edff" } }}>
                                <Typography variant="body2" sx={{ fontWeight: notification.seen ? 400 : 700 }}> {notification.message} </Typography>
                                <Typography variant="caption" color="text.secondary"> {notification.operation} · {notification.createdAt} </Typography>
                            </Box>
                        ))}
                    </Box>
                    {pages > 1 && (
                        <>
                            <Divider />
                            <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                                <Pagination size="small" count={pages} page={page + 1} onChange={(_, value) => setPage(value - 1)} />
                            </Box>
                        </>
                    )}
                </Box>
            </Popover>
            <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="xs" disableEnforceFocus>
                <DialogTitle sx={{ bgcolor: "#17324d", color: "#fff", fontWeight: 700 }}> Notification Details </DialogTitle>
                <DialogContent>
                    {detail && (
                        <Stack spacing={1.5} sx={{ mt: 2 }}>
                            {([
                                ["Branch Code", detail.branchCode],
                                ["Branch Name", detail.branchName],
                                ["Operation", detail.operation],
                                ["Message", detail.message],
                                ["Time", detail.createdAt]
                            ] as const).map(([label, value]) => (
                                <Box key={label}>
                                    <Typography variant="caption" color="text.secondary"> {label} </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}> {value || "N/A"} </Typography>
                                </Box>
                            ))}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDetail(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}