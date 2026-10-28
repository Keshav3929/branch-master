import { Component, lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Alert } from "@mui/material";
import BranchManagement from "./app/pages/branch-activity-board";
import "./App.css";
import AuthPage from "./app/pages/auth-page";
import { getSession } from "./app/branchApi";

const BranchDashboard = lazy(() => import("./app/pages/branch-dashboard"));
type Page = "dashboard" | "branch";

class Guard extends Component<{ children: ReactNode }, { error: string }> {
    state = { error: "" };

    static getDerivedStateFromError(error: Error) {
        return { error: error.message };
    }

    render() {
        return this.state.error
            ? <Alert severity="error">Dashboard failed: {this.state.error}</Alert>
            : this.props.children;
    }
}

export default function App() {
    const [authenticated, setAuthenticated] = useState(() => !!getSession());
    const [page, setPage] = useState<Page>("branch");

    useEffect(() => {
        const sync = () => { setAuthenticated(!!getSession()); setPage("branch"); };
        window.addEventListener("branch-auth-changed", sync);
        return () => window.removeEventListener("branch-auth-changed", sync);
    }, []);

    if (!authenticated) return <AuthPage />;

    return (
        <div className="branch-container">
            <aside className="branch-sidebar">
                {([
                    ["dashboard", "Dashboard"],
                    ["branch", "Branch"]
                ] as const).map(([id, label]) => (
                    <button
                        key={id}
                        className={`sidebar-nav-btn${page === id ? " active" : ""}`}
                        onClick={() => setPage(id)}
                    >
                        {label}
                    </button>
                ))}
            </aside>

            <main className="branch-main">
                {page === "branch" && <BranchManagement />}
                {page === "dashboard" && (
                    <Guard>
                        <Suspense fallback={null}>
                            <div className="branch-content-wrap">
                                <BranchDashboard />
                            </div>
                        </Suspense>
                    </Guard>
                )}
            </main>
        </div>
    );
}