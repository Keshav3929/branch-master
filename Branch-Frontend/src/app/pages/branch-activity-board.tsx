import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
    AppBar, Toolbar, Typography, Box, IconButton, Avatar, Tooltip,
    Button, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, Fab, Paper, Chip, Stack, Card
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import CancelIcon from "@mui/icons-material/Cancel";
import StorageIcon from "@mui/icons-material/Storage";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import type { MRT_Row, MRT_ColumnDef, MRT_PaginationState, MRT_SortingState } from "material-react-table";
import SearchForm from "./branch-filter";
import type { BranchFilters, FilterChip } from "./branch-filter";
import BranchHistoryDialog from "./branch-history";
import DataTable from "../../components/Table";
import AddForm from "./add-form";
import UpdateForm from "./update-form";
import { showSuccess, showError } from "../../components/SweetAlert";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../redux/store";
import { fetchBranches, hasFilters, setBranchLocally, removeBranchLocally } from "../../redux/branchSlice";
import { deleteBranch, getBranchById, getBranches, searchBranches } from "../branchApi";
import { orUndef } from "../branchUtils";
import { formatDate, formatDateTime, toIso, today } from "../dateUtils";
import type { Branch } from "../../types/branchSchema";

type Tile = "total" | "active" | "inactive";
/* ----------------- data and config -------------- */
const makeOptions = (...names: string[]) => names.map((name, i) => ({ id: i + 1, name }));
const optionsData = {
    organizations: makeOptions("Organization 1", "Organization 2", "Organization3"),
    branchTypes: ["Hospital", "Clinic", "Pharmacy"],
    regions: makeOptions("North", "South", "East", "West"),
    countries: makeOptions("India", "USA"),
    states: makeOptions("Delhi", "Bihar", "Uttar Pradesh", "Maharashtra"),
    cities: makeOptions("Delhi", "Bihar", "Noida", "Mumbai"),
    contactPersons: makeOptions("Rahul Sharma", "Amit Kumar", "Priya Singh"),
    workingHours: makeOptions("Morning Shift", "Evening Shift", "Night Shift")
};
const headProps = {
    sx: {
        backgroundColor: "#17324d", color: "#fff", textAlign: "center",
        "& .Mui-TableHeadCell-Content": { justifyContent: "center" },
        "& .MuiTableSortLabel-root, & .MuiTableSortLabel-icon": { color: "#fff !important" }
    }
};
const bodyProps = {
    sx: { textAlign: "center", whiteSpace: "normal", wordBreak: "break-word" }
};
const emptyFilters = (): BranchFilters => ({ search: "", createdDateFrom: "", createdDateTo: "", branchType: [], organizationId: [], regionId: [], countryId: [], status: [] });
const createInitialFilters = (): BranchFilters => ({ ...emptyFilters(), createdDateFrom: formatDate(today().subtract(7, "day")), createdDateTo: formatDate(today()) });
const StatusPill = ({ active }: { active: boolean }) => (
    <span className={`status-pill ${active ? "active" : "inactive"}`}>{active ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <CancelIcon sx={{ fontSize: 16 }} />}{active ? "Active" : "Inactive"}</span>);
/* --------------- component ----------------- */
export default function BranchManagement() {
    const updateCounts = (before?: Branch, after?: Branch) => {
        setCounts(c => {
            const total = c.total + (before ? 0 : after ? 1 : 0);
            const active = c.active + (after?.status === true ? 1 : 0) - (before?.status === true ? 1 : 0);
            const inactive = c.inactive + (after?.status === false ? 1 : 0) - (before?.status === false ? 1 : 0);
            return { total, active, inactive }; }); };
    const handleSaveSuccess = (branches: Branch[]) => { branches.forEach(branch => { dispatch(setBranchLocally(branch)); updateCounts(undefined, branch); }); };
    const handleUpdateSuccess = (branch: Branch) => { const oldBranch = branches.find(b => b.id === branch.id); dispatch(setBranchLocally(branch));
        if (oldBranch) updateCounts(oldBranch, branch); }; const dispatch = useDispatch<AppDispatch>();
    const addBranchButtonRef = useRef<HTMLButtonElement>(null);
    const { branches, totalElements, loading, error } = useSelector((state: RootState) => state.branch);
    const [counts, setCounts] = useState({ total: 0, active: 0, inactive: 0 });
    const [selectedTile, setSelectedTile] = useState<Tile>("total");
    const [filters, setFilters] = useState<BranchFilters>(createInitialFilters);
    const [appliedFilters, setAppliedFilters] = useState<BranchFilters>(emptyFilters);
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editBranch, setEditBranch] = useState<Branch | null>(null);
    const [viewBranch, setViewBranch] = useState<Branch | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState<MRT_SortingState>([]);
    const resetPage = () => setPagination(p => ({ ...p, pageIndex: 0 }));
    const closeAddForm = () => { setAddOpen(false); requestAnimationFrame(() => addBranchButtonRef.current?.focus()); };
    /* -------------------- server-side loading ------------------ */
    const query = useMemo(() => {
        const a = appliedFilters;
        return {
            filters: {
                search: a.search.trim() || undefined, organizationId: orUndef(a.organizationId.map(Number)), regionId: orUndef(a.regionId.map(Number)), countryId: orUndef(a.countryId.map(Number)),
                branchType: orUndef(a.branchType), status: selectedTile === "active" ? true : selectedTile === "inactive" ? false : a.status.length === 1 ? a.status[0] === "Active" : undefined,
                createdDateFrom: toIso(a.createdDateFrom), createdDateTo: toIso(a.createdDateTo)
            },
            page: { page: pagination.pageIndex, size: pagination.pageSize, sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? "desc" : "asc"}` : undefined }
        };
    }, [appliedFilters, selectedTile, pagination, sorting]);
    const loadBranches = useCallback(() => {
        void dispatch(fetchBranches(query)).unwrap().then(res => {
            if (!hasFilters(query.filters)) setCounts(c => ({ ...c, total: res.totalElements }));
        }).catch(() => showError("Error!", "Failed to load branches."));
    }, [dispatch, query]);
    useEffect(() => { loadBranches(); }, [loadBranches]);
    const loadCounts = useCallback(async (withTotal: boolean) => {
        try {
            const [active, inactive, all] = await Promise.all([searchBranches({ status: true }, { page: 0, size: 1 }), searchBranches({ status: false },
                { page: 0, size: 1 }), withTotal ? getBranches({ page: 0, size: 1 }) : Promise.resolve(null)]);
            setCounts(c => ({ total: all ? all.data?.totalElements ?? c.total : c.total, active: active.data?.totalElements ?? 0, inactive: inactive.data?.totalElements ?? 0 }));
        } catch { /* retain the previous counts */ }
    }, []);
    useEffect(() => { void loadCounts(false); }, [loadCounts]);
    /* --------------- handlers ------------------- */
    const handleApplyFilters = (next: BranchFilters = filters) => { setAppliedFilters({ ...next }); resetPage(); };
    const handleResetFilters = () => { setFilters(createInitialFilters()); setAppliedFilters(emptyFilters()); resetPage(); };
    const closeView = () => setViewBranch(null);
    const handleView = (branch: Branch) => setViewBranch(branch);
    const columns: MRT_ColumnDef<Branch>[] = [
        { accessorKey: "branchCode", header: "Branch Code", size: 100, enableSorting: true, 
            Cell: ({ row }: { row: MRT_Row<Branch> }) => (
                <Button variant="text" size="small" onClick={() => handleView(row.original)}
                    sx={{ textTransform: "none", fontWeight: 600, minWidth: 0, p: 0, color: "primary.main", "&:hover": { textDecoration: "underline", bgcolor: "transparent" } }}
                > {row.original.branchCode} </Button> )
        },
        { accessorKey: "branchName", header: "Branch Name", size:100 , enableSorting: true },
        {
            id: "organizationId", header: "Organization", size: 150,
            accessorFn: (row: Branch) => optionsData.organizations.find(x => Number(x.id) === Number(row.organizationId))?.name
        },
        { accessorKey: "branchType", header: "Branch Type", enableSorting: true },
        {
            id: "regionId", header: "Region", size: 100,
            accessorFn: (row: Branch) => optionsData.regions.find(x => Number(x.id) === Number(row.regionId))?.name
        },
        {
            id: "cityId", header: "City", size: 150,
            accessorFn: (row: Branch) => optionsData.cities.find(x => Number(x.id) === Number(row.cityId))?.name
        },
        { accessorKey: "mobile", header: "Mobile", size: 20 },
        { accessorKey: "email", header: "Email", size: 150 },
        {
            accessorKey: "status",
            header: "Status",
            size: 100,
            Cell: ({ row }: { row: MRT_Row<Branch> }) => (<StatusPill active={!!row.original.status} />)
        },
        { accessorKey: "createdBy", header: "Created By", size: 100 },
        {
            id: "createdAt", header: "Created At", size: 200, enableSorting: true,
            accessorFn: (row: Branch) => row.createdAt ? formatDateTime(String(row.createdAt)) : null
        },
        { accessorKey: "updatedBy", header: "Updated By", size: 100 },
        {
            id: "updatedAt", header: "Updated At", size: 200,
            accessorFn: (row: Branch) => row.updatedAt ? formatDateTime(String(row.updatedAt)) : null
        }
    ].map(column => ({
        ...column,
        enableSorting: column.enableSorting ?? false,
        muiTableHeadCellProps: headProps,
        muiTableBodyCellProps: bodyProps
    }));

    const handleEdit = async (branch: Branch) => {
        try { setEditBranch((await getBranchById(branch.id)).data); }
        catch { await showError("Error!", "Failed to load branch."); }
    };
    const handleDelete = async (id: number) => {
        setDeleteId(null);
        try {
            const response = await deleteBranch(id);
            const branch = branches.find(b => b.id === id);
            if (branch?.status) {
                const updated = { ...branch, status: false };
                dispatch(setBranchLocally(updated));
                updateCounts(branch, updated);
            }
            if (viewBranch?.id === id) closeView();
            await showSuccess("Success!", response.data?.message || "Branch deactivated successfully.");
        } catch { await showError("Error!", "Delete failed."); }
    };
    const removeChip = (chip: FilterChip) => {
        if (chip.key === "createdDateFrom" || chip.key === "createdDateTo") return;
        const next: BranchFilters = { ...filters };
        if (chip.key === "search") next.search = "";
        else (next[chip.key] as (string | number)[]) = (next[chip.key] as (string | number)[]).filter(v => String(v) !== String(chip.value));
        setFilters(next);
        handleApplyFilters(next);
    };
    /* --------------------- tiles and suggestions ------------------ */
    const tiles = [
        { id: "total" as const, label: "Total Branches", count: counts.total, classType: "stat-card-total", icon: <StorageIcon /> },
        { id: "active" as const, label: "Active", count: counts.active, classType: "stat-card-active", icon: <CheckCircleIcon /> },
        { id: "inactive" as const, label: "Inactive", count: counts.inactive, classType: "stat-card-inactive", icon: <CancelIcon /> }];
    const rowActions = (b: Branch) => {
        const actions: {
            title: string; color: "info" | "primary" | "error"; icon: ReactNode; run: () => void;
        }[] = [
                { title: "View History", color: "info", icon: <VisibilityIcon fontSize="small" />, run: () => handleView(b) },
                { title: "Edit Branch", color: "primary", icon: <EditIcon fontSize="small" />, run: () => void handleEdit(b) },
                ...(b.status ? [{
                    title: "Delete Branch", color: "error" as const, icon: <DeleteIcon fontSize="small" />, run: () => setDeleteId(b.id)
                }] : [])];
        return (
            <Stack direction="row" spacing={0.5}>
                {actions.map(a => (<Tooltip key={a.title} title={a.title}><IconButton size="small" color={a.color} onClick={a.run}>{a.icon}</IconButton></Tooltip>))}
            </Stack>);
    };
    /* -------------------------- render ------------------------------ */
    return (
        <div className="branch-content-wrap">
            <AppBar position="fixed" elevation={0} className="app-header">
                <Toolbar className="app-header-toolbar">
                    <Box sx={{ display: "flex", alignItems: "center" }}><img src="/dreamsol-logo.jpg" alt="Dreamsol Logo" style={{ height: 50, width: "auto", maxWidth: 240, objectFit: "contain", display: "block" }} /></Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Tooltip title="Notifications"><IconButton size="small" className="header-icon-btn"><NotificationsNoneIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Profile & Account"><IconButton size="small" className="header-icon-btn"><Avatar sx={{ width: 34, height: 34, bgcolor: "#17324d", fontSize: "0.85rem", fontWeight: 700 }}>AC</Avatar></IconButton></Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>
            <Card elevation={0} sx={{ my: 2, py: 2, px: 1, textAlign: "center", borderRadius: 4, color: "#fff", background: "linear-gradient(135deg, #d4dcf0 0%, #d0deecfb 55%, #d4dcf0 100%)", boxShadow: "0 10px 30px rgb(222, 238, 253)" }}>
                <Typography variant="h3" className="app-header-title" sx={{ color: "#fff", fontWeight: 800, letterSpacing: 1.5, mb: 1 }}> Branch Master</Typography>
                <Typography variant="subtitle1" className="app-header-subtitle" sx={{ color: "#dbeafe", fontWeight: 500, letterSpacing: 0.4 }}> Manage branches. Monitor operations. Stay in control.</Typography>
            </Card>
            <div className="dashboard-top-grid">
                <SearchForm filters={filters} appliedFilters={appliedFilters} setFilters={setFilters} onApply={handleApplyFilters} onReset={handleResetFilters}
                    showMoreFilters={showMoreFilters} setShowMoreFilters={setShowMoreFilters} optionsData={optionsData}
                    renderChips={chips => (
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                            {chips.map(chip => (<Chip key={`${chip.key}-${chip.value}`} label={chip.label} size="small" variant="outlined" onDelete={chip.key === "createdDateFrom" || chip.key === "createdDateTo" ? undefined : () => removeChip(chip)} />))}
                        </Stack>)}
                    renderBelowFilters={
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, width: "100%", minWidth: 0 }}>
                            {tiles.map(({ id, label, count, classType, icon }) => (
                                <Paper key={id} className={`stat-card ${classType}`} elevation={0} onClick={() => { setSelectedTile(id); resetPage(); }} sx={{ cursor: "pointer", minWidth: 0 }}>
                                    <span className="stat-label">{icon} {label}</span>
                                    <span className="stat-count">{count}</span>
                                </Paper>))}
                        </Box>}
                />
            </div>
            {loading && branches.length === 0 && <p>Loading branches...</p>}
            {error && <p>{error}</p>}
            <DataTable<Branch>
                data={branches} columns={columns}
                getRowId={(branch: Branch) => String(branch.id)}
                serverSide={{ rowCount: totalElements, pagination, sorting, loading, onPaginationChange: setPagination, onSortingChange: setSorting }}
                renderTopToolbarCustomActions={() => (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%", px: 1, py: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Branches found: {totalElements}</Typography>
                    </Box>)}
                emptyMessage="No branches found matching the current criteria" enableRowActions renderRowActions={rowActions}
            />
            <Tooltip title="Add New Branch">
                <Fab ref={addBranchButtonRef} color="primary" onClick={event => { event.currentTarget.blur(); setAddOpen(true); }} className="add-branch-fab"><AddIcon /></Fab>
            </Tooltip>
            <AddForm open={addOpen} onClose={closeAddForm} onSuccess={handleSaveSuccess} optionsData={optionsData} />
            <UpdateForm key={editBranch?.id ?? "closed"} open={!!editBranch} branch={editBranch} onClose={() => setEditBranch(null)} onSuccess={handleUpdateSuccess} optionsData={optionsData} />
            <BranchHistoryDialog branch={viewBranch} onClose={closeView} optionsData={optionsData} />
            <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Confirm Delete</DialogTitle>
                <DialogContent><DialogContentText> Are you sure you want to delete this branch? This action cannot be undone.</DialogContentText></DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button color="primary" variant="contained" onClick={() => setDeleteId(null)}> Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { if (deleteId !== null) void handleDelete(deleteId); }}> Delete</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}