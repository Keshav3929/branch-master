import { useEffect, useState } from "react";
import {
    AppBar, Toolbar, Box, IconButton, Avatar, Tooltip, Badge,
    Popover, Typography, Button, CircularProgress, Pagination,
    Divider, Dialog, DialogTitle, DialogContent, DialogActions, Stack
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
    getNotifications, getUnreadCount,
    markNotificationSeen, markAllNotificationsSeen
} from "../app/branchApi";
import type { BranchNotification } from "../app/branchApi";

export default function BranchHeader() {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [unread, setUnread] = useState(0);
    const [notifs, setNotifs] = useState<BranchNotification[]>([]);
    const [page, setPage] = useState(0);
    const [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<BranchNotification | null>(null);

    useEffect(() => { getUnreadCount().then(({ data }) => setUnread(data)).catch(() => { }); }, []);
    useEffect(() => {
        if (!anchorEl) return;
        let cancelled = false;
        setLoading(true);
        getNotifications(page).then(({ data }) => {
                if (cancelled) return;
                setNotifs(data.content);
                setPages(data.totalPages);
            }).catch(() => { })
            .finally(() => { if (!cancelled) setLoading(false); });
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
        } catch { }
    };
    const markAll = async () => {
        try {
            await markAllNotificationsSeen();
            setNotifs(items => items.map(item => ({ ...item, seen: true })));
            setUnread(0);
        } catch { }
    };
    const closePopover = () => {
        if (!detail) setAnchorEl(null);
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
                            <IconButton size="small" className="header-icon-btn" onClick={event => { setPage(0); setAnchorEl(current => current ? null : event.currentTarget); }}>
                                <Badge badgeContent={unread} color="error" max={99}>
                                    <NotificationsNoneIcon fontSize="small" />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Profile & Account">
                            <IconButton size="small" className="header-icon-btn">
                                <Avatar sx={{ width: 34, height: 34, bgcolor: "#17324d", fontSize: "0.85rem", fontWeight: 700 }}> AC </Avatar>
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={closePopover}
                disableEnforceFocus
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
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