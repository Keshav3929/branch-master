import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Drawer as MuiDrawer, Box, Divider } from "@mui/material";

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    width?: { xs: string; md: string } | string;
}

export default function Drawer({
    open, onClose, title, children, footer,
    width = { xs: "100%", md: "60%" }
}: DrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            const active = document.activeElement;
            if (active instanceof HTMLElement && drawerRef.current?.contains(active)) {
                active.blur();
            }
        }
    }, [open]);

    return (
        <MuiDrawer
            ref={drawerRef}
            anchor="right"
            open={open}
            onClose={onClose}
            transitionDuration={0}
            slotProps={{
                backdrop: { sx: { backgroundColor: "rgba(0, 0, 0, 0.25)" } },
                paper: {
                    sx: {
                        width,
                        minWidth: { xs: "100%", md: 620 },
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)"
                    }
                }
            }}
        >
            <Box sx={{ width: "100%", bgcolor: "#0f172a", color: "#fff", flexShrink: 0, boxSizing: "border-box" }}>
                {title}
            </Box>
            <Divider />
            <Box sx={{ px: 3, pt: 3, pb: 0, flex: 1, minHeight: 0, overflowY: "auto" }}>
                {children}
            </Box>
            {footer && (
                <>
                    <Divider />
                    <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 1.5, bgcolor: "#fff" }}>
                        {footer}
                    </Box>
                </>
            )}
        </MuiDrawer>
    );
}