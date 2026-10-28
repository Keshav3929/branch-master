/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { isAxiosError } from "axios";
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { login, register, saveSession, parseApiError } from "../branchApi";

export type Mode = "login" | "register";
export type AuthForm = { username: string; password: string; confirm: string };
type FieldKey = keyof AuthForm;
type Errors = Partial<Record<FieldKey, string>>;
type Banner = { severity: "error" | "info" | "success"; text: string };

const EMPTY: AuthForm = { username: "", password: "", confirm: "" };

// Same rules as the backend (AuthController.RegisterRequest); the API is only called when this returns no errors.
export const validateAuth = (mode: Mode, form: AuthForm): Errors => {
    const errors: Errors = {};
    const username = form.username.trim();
    if (!username) errors.username = "Username is required";
    else if (username.length < 3 || username.length > 30) errors.username = "Username must be 3 to 30 characters";
    else if (!/^[a-zA-Z0-9_.]+$/.test(username)) errors.username = "Username can contain only letters, numbers, dots and underscores";

    if (!form.password) errors.password = "Password is required";
    else if (mode === "register" && (form.password.length < 6 || form.password.length > 72)) errors.password = "Password must be 6 to 72 characters";

    if (mode === "register") {
        if (!form.confirm) errors.confirm = "Please confirm your password";
        else if (form.confirm !== form.password) errors.confirm = "Passwords do not match";
    }
    return errors;
};

export default function AuthPage() {
    const [mode, setMode] = useState<Mode>("login");
    const [form, setForm] = useState<AuthForm>(EMPTY);
    const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
    const [serverErrors, setServerErrors] = useState<Errors>({});
    const [visible, setVisible] = useState({ password: false, confirm: false });
    const [busy, setBusy] = useState(false);
    const [banner, setBanner] = useState<Banner | null>(() =>
        sessionStorage.getItem("switching") === "1" ? { severity: "info", text: "Sign in with a different account, or register a new one." } : null);
    const isRegister = mode === "register";
    const errors = validateAuth(mode, form);
    const valid = Object.keys(errors).length === 0;

    const change = (key: FieldKey) => (e: ChangeEvent<HTMLInputElement>) => {
        setForm(f => ({ ...f, [key]: e.target.value }));
        setTouched(t => ({ ...t, [key]: true }));
        setServerErrors(s => ({ ...s, [key]: undefined }));
    };
    const reset = () => {
        setForm(EMPTY); setTouched({}); setServerErrors({}); setBanner(null);
        setVisible({ password: false, confirm: false });
    };
    const switchMode = (next: Mode) => { setMode(next); setTouched({}); setServerErrors({}); setBanner(null); };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!valid) return setTouched({ username: true, password: true, confirm: true });
        const username = form.username.trim();
        setBusy(true);
        setBanner(null);
        setServerErrors({});
        try {
            if (isRegister) {
                await register({ username, password: form.password });
                setMode("login");
                setForm({ username, password: "", confirm: "" });
                setTouched({});
                setBanner({ severity: "success", text: "Account created. Please sign in." });
            } else {
                const { data } = await login({ username, password: form.password });
                saveSession(data); // App switches to the dashboard layout
            }
        } catch (err) {
            const { message, fields } = parseApiError(err);
            if (!isRegister && isAxiosError(err) && err.response?.status === 404 && fields.username) {
                setMode("register");
                setForm({ username, password: "", confirm: "" });
                setTouched({});
                setBanner({ severity: "info", text: `No account found for "${username}". Create one to continue.` });
            } else if (isAxiosError(err) && !err.response) {
                setBanner({ severity: "error", text: "Cannot reach the server. Check that the backend is running." });
            } else if (Object.keys(fields).length) {
                setServerErrors(fields);
            } else {
                setBanner({ severity: "error", text: message ?? "Something went wrong. Please try again." });
            }
        } finally { setBusy(false); }
    };

    const field = (key: FieldKey, label: string, icon: ReactNode, secret = false) => {
        const message = (touched[key] ? errors[key] : undefined) ?? serverErrors[key];
        const shown = secret && visible[key as "password" | "confirm"];
        return (
            <TextField key={key} label={label} value={form[key]} onChange={change(key)}
                onBlur={() => setTouched(t => ({ ...t, [key]: true }))}
                type={secret && !shown ? "password" : "text"} fullWidth required margin="normal" disabled={busy}
                error={!!message} helperText={message ?? " "}
                autoComplete={key === "username" ? "username" : isRegister ? "new-password" : "current-password"}
                slotProps={{
                    input: {
                        startAdornment: <InputAdornment position="start">{icon}</InputAdornment>,
                        endAdornment: secret ? (
                            <InputAdornment position="end">
                                <IconButton edge="end" aria-label={`${shown ? "Hide" : "Show"} ${label.toLowerCase()}`}
                                    onClick={() => setVisible(v => ({ ...v, [key]: !v[key as "password" | "confirm"] }))}
                                    onMouseDown={e => e.preventDefault()}>
                                    {shown ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                            </InputAdornment>
                        ) : undefined
                    }
                }} />
        );
    };

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", px: 2, py: 4, background: "linear-gradient(135deg, #eaf0f8 0%, #f8fafc 55%, #dbe7f3 100%)" }}>
            <Paper elevation={0} sx={{ width: "100%", maxWidth: 430, p: { xs: 3, sm: 4 }, border: "1px solid #dce5ef", borderRadius: 4, boxShadow: "0 24px 70px rgba(23,50,77,0.12)" }}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <img src="/dreamsol-logo.jpg" alt="Dreamsol Logo" style={{ height: 50, width: "auto", maxWidth: 240, objectFit: "contain", display: "block" }} />
                </Box>
                <Typography variant="h4" align="center" sx={{ color: "#17324d", fontWeight: 800 }}>Branch Master</Typography>
                <Tabs value={mode} onChange={(_, v: Mode) => switchMode(v)} variant="fullWidth" sx={{ mt: 2 }}>
                    <Tab value="login" label="Sign In" />
                    <Tab value="register" label="Register" />
                </Tabs>

                {banner && <Alert severity={banner.severity} sx={{ mt: 2 }}>{banner.text}</Alert>}

                <Box component="form" onSubmit={submit} noValidate sx={{ mt: 1 }}>
                    {field("username", "Username", <PersonOutlineIcon color="action" />)}
                    {field("password", "Password", <LockOutlinedIcon color="action" />, true)}
                    {isRegister && field("confirm", "Confirm password", <LockOutlinedIcon color="action" />, true)}
                    <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                        <Button type="submit" fullWidth variant="contained" disabled={busy || !valid}
                            sx={{ py: 1.3, borderRadius: 2, textTransform: "none", fontSize: 16, fontWeight: 700, bgcolor: "#17324d", "&:hover": { bgcolor: "#24496b" } }}>
                            {busy ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Please wait...</> : isRegister ? "Create Account" : "Sign In"}
                        </Button>
                        <Button variant="outlined" onClick={reset} disabled={busy} startIcon={<RestartAltIcon />}
                            sx={{ py: 1.3, borderRadius: 2, textTransform: "none", fontWeight: 700, flexShrink: 0 }}>
                            Reset
                        </Button>
                    </Stack>
                </Box>
                {isRegister && <Typography variant="caption" display="block" align="center" color="text.secondary" sx={{ mt: 2 }}>New accounts get the User role (read-only).</Typography>}
            </Paper>
        </Box>
    );
}