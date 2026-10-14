import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AppBar, Toolbar, Typography, Box, IconButton, Avatar, Tooltip,
    Button, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, Fab, Paper, Chip, Stack
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import CancelIcon from "@mui/icons-material/Cancel";
import StorageIcon from "@mui/icons-material/Storage";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import type { MRT_ColumnDef, MRT_PaginationState, MRT_SortingState } from "material-react-table";
import SearchForm from "./branch-filter";
import type { BranchFilters, FilterChip } from "./branch-filter";
import DataTable from "../../components/Table";
import AddForm from "./add-form";
import UpdateForm from "./update-form";
import { showSuccess, showError } from "../../components/SweetAlert";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../redux/store";
import { fetchBranches, hasFilters } from "../../redux/branchSlice";
import { deleteBranch, getBranchById, getBranchHistory, getBranches, searchBranches } from "../branchApi";
import type { Branch } from "../../types/branchSchema";

type BranchHistory = Partial<Branch> & {
    historyId: number;
    branchId: number;
    action: string;
    updatedBy: number | null;
    updatedAt: string | null;
};

/* ---------- helpers ---------- */
const NA = "N/A";
const pad = (n: number) => String(n).padStart(2, "0");
const formatDate = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

const parseDate = (val: string): Date | null => {
    const [, d, m, y] = /^(\d{2})-(\d{2})-(\d{4})$/.exec(val) || [];
    if (!d) return null;
    const date = new Date(+y, +m - 1, +d);
    return date.getFullYear() === +y && date.getMonth() === +m - 1 && date.getDate() === +d ? date : null;
};

// DD-MM-YYYY (UI) -> YYYY-MM-DD (API)
const toIso = (v: string) => {
    const d = parseDate(v);
    return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : undefined;
};

const formatDateTime = (val: string | null) => {
    if (!val) return NA;
    const d = new Date(val);
    return Number.isNaN(d.getTime())
        ? NA
        : `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
};

const nameOf = (options: { id: number | string; name: string }[], id: number | string | null | undefined) =>
    id == null ? NA : options.find(o => String(o.id) === String(id))?.name ?? String(id);

const makeOptions = (...names: string[]) => names.map((name, i) => ({ id: i + 1, name }));

const emptyFilters = (): BranchFilters => ({
    search: "",
    createdDateFrom: "",
    createdDateTo: "",
    branchType: [],
    organizationId: [],
    regionId: [],
    countryId: [],
    status: []
});

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

const lookup = {
    organizationId: "organizations", regionId: "regions", countryId: "countries",
    stateId: "states", cityId: "cities", contactPerson: "contactPersons", workingHoursId: "workingHours"
} as const;

const formatValue = (key: string, row: object): string => {
    const value = (row as Record<string, unknown>)[key];
    if (key in lookup) return nameOf(optionsData[lookup[key as keyof typeof lookup]], value as number | null);
    if (value == null || value === "") return NA;
    if (key === "status") return value ? "Active" : "Inactive";
    if (key === "createdAt" || key === "updatedAt") return formatDateTime(String(value));
    if (key === "departmentIds" || key === "serviceIds") {
        try {
            const parsed = typeof value === "string" ? JSON.parse(value) : value;
            return Array.isArray(parsed) ? parsed.join(", ") : String(parsed);
        } catch {
            return String(value);
        }
    }
    return Array.isArray(value) ? value.join(", ") : String(value);
};

const createInitialFilters = (): BranchFilters => ({
    search: "",
    createdDateFrom: formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    createdDateTo: formatDate(new Date()),
    branchType: [], organizationId: [], regionId: [], countryId: [], status: []
});

const StatusPill = ({ active }: { active: boolean }) => (
    <span className={`status-pill ${active ? "active" : "inactive"}`}>
        {active ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <CancelIcon sx={{ fontSize: 16 }} />}
        {active ? "Active" : "Inactive"}
    </span>
);

const cellProps = { sx: { whiteSpace: "normal", wordBreak: "break-word" } };

const mainCols = [
    ["Branch Code", "branchCode"], ["Branch Name", "branchName"], ["Organization", "organizationId"],
    ["Type", "branchType"], ["Region", "regionId"], ["City", "cityId"], ["Mobile", "mobile"],
    ["Email", "email"], ["Status", "status"], ["Created By", "createdBy"], ["Created On", "createdAt"],
    ["Updated By", "updatedBy"], ["Updated On", "updatedAt"]
] as const;

const viewCols = [
    ["Branch Code", "branchCode"], ["Branch Name", "branchName"], ["Communication Name", "communicationName"],
    ["Organization", "organizationId"], ["Type", "branchType"], ["Working Hours", "workingHoursId"],
    ["Region", "regionId"], ["Country", "countryId"], ["State", "stateId"], ["City", "cityId"],
    ["Area", "area"], ["Zip Code", "zipCode"], ["Latitude", "latitude"], ["Longitude", "longitude"],
    ["Address Line 1", "address1"], ["Address Line 2", "address2"], ["Contact Person", "contactPerson"],
    ["Mobile", "mobile"], ["Telephone", "telephone"], ["Email", "email"], ["Working Days", "workingDays"],
    ["Departments", "departmentIds"], ["Services", "serviceIds"], ["Status", "status"],
    ["Branch Logo", "branchLogo"], ["Document Path", "documentPath"], ["Remarks", "remarks"],
    ["Created By", "createdBy"], ["Created On", "createdAt"], ["Updated By", "updatedBy"], ["Updated On", "updatedAt"]
] as const;

const actionLabels: Record<string, string> = { CREATE: "Created", UPDATE: "Updated", DELETE: "Deleted" };

// columns the server is allowed to sort by
const sortable = new Set<string>(["branchCode", "branchName", "branchType", "createdAt"]);

const createColumn = (header: string, key: string): MRT_ColumnDef<Branch> => ({
    id: key,
    header,
    accessorFn: branch => formatValue(key, branch),
    enableSorting: sortable.has(key),
    Cell: ({ row }) => key === "status"
        ? <StatusPill active={!!row.original.status} />
        : formatValue(key, row.original),
    muiTableBodyCellProps: cellProps
});

const columns: MRT_ColumnDef<Branch>[] = mainCols.map(([header, key]) => createColumn(header, key));

/* ---------- component ---------- */
export default function BranchManagement() {
    const dispatch = useDispatch<AppDispatch>();
    const addBranchButtonRef = useRef<HTMLButtonElement>(null);
    const { branches, totalElements, loading, error } = useSelector((state: RootState) => state.branch);

    const [counts, setCounts] = useState({ total: 0, active: 0, inactive: 0 });
    const [selectedTile, setSelectedTile] = useState<"total" | "active" | "inactive">("total");
    const [filters, setFilters] = useState<BranchFilters>(createInitialFilters);
    const [appliedFilters, setAppliedFilters] = useState<BranchFilters>(emptyFilters);
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editBranch, setEditBranch] = useState<Branch | null>(null);
    const [viewBranch, setViewBranch] = useState<Branch | null>(null);
    const [branchHistory, setBranchHistory] = useState<BranchHistory[]>([]);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState<MRT_SortingState>([]);

    const closeAddForm = () => {
        setAddOpen(false);
        requestAnimationFrame(() => addBranchButtonRef.current?.focus());
    };

    /* ---------- server-side loading ---------- */
    // filters go in the POST body
    const filterParams = useMemo(() => ({
        search: appliedFilters.search.trim() || undefined,
        organizationId: appliedFilters.organizationId.length ? appliedFilters.organizationId.map(Number) : undefined,
        regionId: appliedFilters.regionId.length ? appliedFilters.regionId.map(Number) : undefined,
        countryId: appliedFilters.countryId.length ? appliedFilters.countryId.map(Number) : undefined,
        branchType: appliedFilters.branchType.length ? appliedFilters.branchType : undefined,
        status: appliedFilters.status.length === 1 ? appliedFilters.status[0] === "Active" : undefined,
        createdDateFrom: toIso(appliedFilters.createdDateFrom),
        createdDateTo: toIso(appliedFilters.createdDateTo)
    }), [appliedFilters]);

    // page, size and sort go in the URL
    const query = useMemo(() => ({
        filters: {
            ...filterParams,
            // a clicked tile wins over the Status dropdown
            status: selectedTile === "active" ? true : selectedTile === "inactive" ? false : filterParams.status
        },
        page: {
            page: pagination.pageIndex,
            size: pagination.pageSize,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? "desc" : "asc"}` : undefined
        }
    }), [filterParams, selectedTile, pagination, sorting]);

    const loadBranches = useCallback(() => {
        void dispatch(fetchBranches(query)).unwrap()
            .then(res => {
                // only an unfiltered response (GET /list) is the real total, so the Total tile never changes with filters
                if (!hasFilters(query.filters)) setCounts(c => ({ ...c, total: res.totalElements }));
            })
            .catch(() => showError("Error!", "Failed to load branches."));
    }, [dispatch, query]);

    useEffect(() => { loadBranches(); }, [loadBranches]);

    // Active / Inactive tiles (and Total only when the table is currently filtered)
    const loadCounts = useCallback(async (withTotal: boolean) => {
        try {
            const [active, inactive, all] = await Promise.all([
                searchBranches({ status: true }, { page: 0, size: 1 }),
                searchBranches({ status: false }, { page: 0, size: 1 }),
                withTotal ? getBranches({ page: 0, size: 1 }) : Promise.resolve(null)
            ]);
            setCounts(c => ({
                total: all ? all.data?.totalElements ?? c.total : c.total,
                active: active.data?.totalElements ?? 0,
                inactive: inactive.data?.totalElements ?? 0
            }));
        } catch { /* tiles keep their last values */ }
    }, []);

    useEffect(() => { void loadCounts(false); }, [loadCounts]);

    const refreshAll = () => {
        loadBranches();
        void loadCounts(hasFilters(query.filters));
    };

    const resetPage = () => setPagination(p => ({ ...p, pageIndex: 0 }));

    /* ---------- handlers ---------- */
    const handleApplyFilters = (next: BranchFilters = filters) => {
        setAppliedFilters({ ...next });
        resetPage();
    };

    const handleResetFilters = () => {
        setFilters(createInitialFilters());
        setAppliedFilters(emptyFilters());
        resetPage();
    };

    const closeView = () => { setViewBranch(null); setBranchHistory([]); };
const handleView = async (branch: Branch) => {
    console.count("handleView called");
    console.log("Branch ID:", branch.id);

    setViewBranch(branch);
    setBranchHistory([]);
        try {
            const [branchRes, historyRes] = await Promise.all([getBranchById(branch.id), getBranchHistory(branch.id)]);
            const current: Branch = branchRes.data;
            const history: BranchHistory[] = historyRes.data ?? [];
            const records = history.length
                ? history
                : [{ historyId: 0, branchId: current.id, action: "CREATE" } as BranchHistory];
            setViewBranch(current);
            setBranchHistory(records.map(record => ({
                ...current,
                ...Object.fromEntries(Object.entries(record).filter(([, v]) => v != null)),
                historyId: record.historyId,
                branchId: record.branchId,
                action: record.action || "CREATE",
                updatedBy: record.updatedBy ?? record.createdBy ?? current.updatedBy ?? current.createdBy ?? null,
                updatedAt: record.updatedAt ?? record.createdAt ?? current.updatedAt ?? current.createdAt ?? null
            })));
        } catch {
            await showError("Error!", "Failed to load branch details and history.");
        }
    };

    // the list carries slim columns, so edit loads the full record (also keeps "N/A" out of the form)
    const handleEdit = async (branch: Branch) => {
        try {
            setEditBranch((await getBranchById(branch.id)).data);
        } catch {
            await showError("Error!", "Failed to load branch.");
        }
    };

    const handleDelete = async (id: number) => {
        setDeleteId(null);
        try {
            const response = await deleteBranch(id);
            if (viewBranch?.id === id) closeView();
            refreshAll();
            await showSuccess("Success!", response.data?.message || "Branch deactivated successfully.");
        } catch {
            await showError("Error!", "Delete failed.");
        }
    };

    const removeChip = (chip: FilterChip) => {
        if (chip.key === "createdDateFrom" || chip.key === "createdDateTo") return;
        const key = chip.key;
        const next: BranchFilters = { ...filters };
        if (key === "search") next.search = "";
        else (next[key] as (string | number)[]) =
            (next[key] as (string | number)[]).filter(v => String(v) !== String(chip.value));
        setFilters(next);
        handleApplyFilters(next);
    };

    /* ---------- history columns (client-side table) ---------- */
    const historyColumns = useMemo<MRT_ColumnDef<BranchHistory>[]>(() => [
        { id: "updatedAt", header: "Updated On", accessorFn: h => formatDateTime(h.updatedAt), enableSorting: false },
        { id: "updatedBy", header: "Updated By", accessorFn: h => h.updatedBy ?? NA, enableSorting: false },
        {
            id: "action", header: "Action", enableSorting: false,
            accessorFn: h => actionLabels[h.action?.toUpperCase()] ?? h.action ?? NA
        },
        ...viewCols
            .filter(([, key]) => key !== "updatedAt" && key !== "updatedBy")
            .map(([header, key]): MRT_ColumnDef<BranchHistory> => ({
                id: key,
                header,
                accessorFn: h => formatValue(key, h),
                enableSorting: false,
                muiTableBodyCellProps: cellProps,
                Cell: ({ row }) => {
                    const h = row.original;
                    const index = branchHistory.findIndex(item => item.historyId === h.historyId);
                    const older = branchHistory[index + 1];
                    const current = (h as Record<string, unknown>)[key];
                    const previous = older ? (older as Record<string, unknown>)[key] : null;
                    const isEmpty = (value: unknown) =>
                        value == null || (typeof value === "string" && (!value.trim() || value.trim() === NA));
                    const changed = !!older && !isEmpty(current) && !isEmpty(previous) &&
                        JSON.stringify(current) !== JSON.stringify(previous);
                    return (
                        <Box sx={{
                            bgcolor: changed ? "#fff3cd" : "transparent", borderRadius: 1,
                            px: changed ? 1 : 0, py: 0.5, minHeight: 24,
                            whiteSpace: "normal", overflowWrap: "anywhere"
                        }}>
                            {key === "status" && current != null ? <StatusPill active={!!current} /> : formatValue(key, h)}
                        </Box>
                    );
                }
            }))
    ], [branchHistory]);

    /* ---------- tiles and suggestions ---------- */
    const tiles = [
        { id: "total" as const, label: "Total Branches", count: counts.active + counts.inactive, classType: "stat-card-total", icon: <StorageIcon /> },
        { id: "active" as const, label: "Active", count: counts.active, classType: "stat-card-active", icon: <CheckCircleIcon /> },
        { id: "inactive" as const, label: "Inactive", count: counts.inactive, classType: "stat-card-inactive", icon: <CancelIcon /> }
    ];

    // suggestions come from the current page only
    const branchNameSuggestions = Array.from(new Set(branches.map(b => b.branchName).filter(Boolean)));

    /* ---------- render ---------- */
    return (
        <div className="branch-content-wrap">
            <AppBar position="fixed" elevation={0} className="app-header">
                <Toolbar className="app-header-toolbar">
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <img
                            src="/dreamsol-logo.jpg"
                            alt="Dreamsol Logo"
                            style={{ height: 50, width: "auto", maxWidth: 240, objectFit: "contain", display: "block" }}
                        />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Tooltip title="Notifications">
                            <IconButton size="small" className="header-icon-btn">
                                <NotificationsNoneIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Profile & Account">
                            <IconButton size="small" className="header-icon-btn">
                                <Avatar sx={{ width: 34, height: 34, bgcolor: "#17324d", fontSize: "0.85rem", fontWeight: 700 }}>AC</Avatar>
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>

            <Typography variant="h5" className="app-header-title">Branch Master</Typography>
            <Typography variant="body2" className="app-header-subtitle">
                Manage branch details, operational status and records
            </Typography>

            <div className="dashboard-top-grid">
                <SearchForm
                    filters={filters}
                    appliedFilters={appliedFilters}
                    setFilters={setFilters}
                    onApply={handleApplyFilters}
                    onReset={handleResetFilters}
                    showMoreFilters={showMoreFilters}
                    setShowMoreFilters={setShowMoreFilters}
                    branchNameSuggestions={branchNameSuggestions}
                    optionsData={optionsData}
                    renderChips={chips => (
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                            {chips.map(chip => (
                                <Chip
                                    key={`${chip.key}-${chip.value}`}
                                    label={chip.label}
                                    size="small"
                                    variant="outlined"
                                    onDelete={chip.key === "createdDateFrom" || chip.key === "createdDateTo"
                                        ? undefined
                                        : () => removeChip(chip)}
                                />
                            ))}
                        </Stack>
                    )}
                    renderBelowFilters={
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, width: "100%", minWidth: 0 }}>
                            {tiles.map(({ id, label, count, classType, icon }) => (
                                <Paper
                                    key={id}
                                    className={`stat-card ${classType}`}
                                    elevation={0}
                                    onClick={() => { setSelectedTile(id); resetPage(); }}
                                    sx={{ cursor: "pointer", minWidth: 0 }}
                                >
                                    <span className="stat-label">{icon} {label}</span>
                                    <span className="stat-count">{count}</span>
                                </Paper>
                            ))}
                        </Box>
                    }
                />
            </div>

            {loading && branches.length === 0 && <p>Loading branches...</p>}
            {error && <p>{error}</p>}

            <DataTable<Branch>
                data={branches}
                columns={columns}
                getRowId={(branch: Branch) => String(branch.id)}
                serverSide={{
                    rowCount: totalElements,
                    pagination,
                    sorting,
                    loading,
                    onPaginationChange: setPagination,
                    onSortingChange: setSorting
                }}
                renderTopToolbarCustomActions={() => (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%", px: 1, py: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Branches found: {totalElements}
                        </Typography>
                    </Box>
                )}
                emptyMessage="No branches found matching the current criteria"
                enableRowActions
                renderRowActions={(branch: Branch) => (
                    <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View Branch">
                            <IconButton size="small" color="info" onClick={() => void handleView(branch)}>
                                <VisibilityIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Branch">
                            <IconButton size="small" color="primary" onClick={() => void handleEdit(branch)}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {branch.status && (
                            <Tooltip title="Delete Branch">
                                <IconButton size="small" color="error" onClick={() => setDeleteId(branch.id)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                )}
            />

            <Tooltip title="Add New Branch">
                <Fab
                    ref={addBranchButtonRef}
                    color="primary"
                    onClick={event => { event.currentTarget.blur(); setAddOpen(true); }}
                    className="add-branch-fab"
                >
                    <AddIcon />
                </Fab>
            </Tooltip>

            <AddForm open={addOpen} onClose={closeAddForm} onSuccess={refreshAll} optionsData={optionsData} />
            <UpdateForm
                key={editBranch?.id ?? "closed"}
                open={!!editBranch}
                branch={editBranch}
                onClose={() => setEditBranch(null)}
                onSuccess={refreshAll}
                optionsData={optionsData}
            />

            <Dialog open={!!viewBranch} onClose={closeView} maxWidth="xl" fullWidth>
                <DialogTitle sx={{ bgcolor: "#0f172a", color: "#fff", fontWeight: 700, py: 2 }}>
                    Branch History & Details
                </DialogTitle>
                <DialogContent sx={{ pt: 2, pb: 0 }}>
                    {viewBranch && (
                        <DataTable<BranchHistory>
                            data={branchHistory}
                            columns={historyColumns}
                            getRowId={history => String(history.historyId)}
                            emptyMessage="No history records available"
                            enablePagination
                            maxHeight={550}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 1, pt: 0, pb: 1, minHeight: 0 }}>
                    <Button onClick={closeView}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this branch? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button color="primary" variant="contained" onClick={() => setDeleteId(null)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { if (deleteId !== null) void handleDelete(deleteId); }}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}