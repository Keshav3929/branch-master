import BranchManagement from "./app/pages/branch-activity-board";
import "./App.css";

export default function App() {
    return (
        <div className="branch-container">
            <aside className="branch-sidebar">
                <button className="sidebar-nav-btn">Dashboard</button>
                <button className="sidebar-nav-btn active">Branch</button>
            </aside>

            <main className="branch-main">
                <BranchManagement />
            </main>
        </div>
    );
}