import { Component, lazy, Suspense, useState } from "react";
import type { ReactNode } from "react";
import { Alert } from "@mui/material";
import BranchManagement from "./app/pages/branch-activity-board";
import "./App.css";

const BranchDashboard = lazy(() => import("./app/pages/branch-dashboard"));
type Page = "dashboard" | "branch";

class Guard extends Component<{ children: ReactNode }, { error: string }> {
    state = { error: "" };
    static getDerivedStateFromError(e: Error) { return { error: e.message }; }
    render() { return this.state.error ? <Alert severity="error">Dashboard failed: {this.state.error}</Alert> : this.props.children; }
}

export default function App() {
    const [page, setPage] = useState<Page>("branch");
    return (
        <div className="branch-container">
            <aside className="branch-sidebar">
                {([["dashboard", "Dashboard"], ["branch", "Branch"]] as const).map(([id, label]) => (
                    <button key={id} className={`sidebar-nav-btn${page === id ? " active" : ""}`} onClick={() => setPage(id)}>{label}</button>
                ))}
            </aside>
            <main className="branch-main">
                <div hidden={page !== "branch"}><BranchManagement /></div>
                {page === "dashboard" && (
                    <Guard><Suspense fallback={null}><div className="branch-content-wrap"><BranchDashboard /></div></Suspense></Guard>
                )}
            </main>
        </div>
    );
}