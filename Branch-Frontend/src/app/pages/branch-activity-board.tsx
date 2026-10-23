import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, Dispatch, SetStateAction } from "react";
import dayjs from "dayjs";
import {
    Typography, Box, IconButton, Tooltip, Button,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    SpeedDial, SpeedDialAction, Paper, Chip, Stack, Card, Menu, MenuItem, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Alert, Divider
} from "@mui/material";
import { read, utils, writeFile, WorkBook } from "xlsx-js-style";
import ListIcon from '@mui/icons-material/List';
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
import StorageIcon from "@mui/icons-material/Storage";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import type { MRT_Row, MRT_ColumnDef, MRT_PaginationState, MRT_SortingState } from "material-react-table";
import SearchForm, { DATE_FMT } from "./branch-filter";
import type { BranchFilters, FilterChip } from "./branch-filter";
import BranchHistoryDialog, { viewCols } from "./branch-history";
import DataTable from "../../components/Table";
import AddForm from "./add-form";
import UpdateForm from "./update-form";
import { showSuccess, showError } from "../../components/SweetAlert";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../redux/store";
import { fetchBranches, setBranchLocally, removeBranchLocally } from "../../redux/branchSlice";
import { deleteBranch, getCounts, saveBranches, getBranchTemplate, getDropdownOptions, getErrorMessage, } from "../branchApi";
import type { Counts, DropdownOptions } from "../branchApi";
import { parseIdList } from "../branchUtils";
import type { Branch } from "../../types/BranchSchema";
import BranchHeader from "../../components/Header";

type Tile = "total" | "active" | "inactive";
type Scope = "all" | "date";
type ModeState = { filters: BranchFilters; applied: BranchFilters };
type ExcelRow = Record<string, unknown>;
type ImportRow = { row: number; data: ExcelRow; errors: string[] };
type OptionFields = Record<string, DropdownOptions["organizations"]>;

const PAGE_SIZE = 10;
const emptyOptions: DropdownOptions = { organizations: [], branchTypes: [], regions: [], countries: [], states: [], cities: [], contactPersons: [], workingHours: [] };
const headProps = { sx: { backgroundColor: "#17324d", color: "#fff", textAlign: "center", "& .Mui-TableHeadCell-Content": { justifyContent: "center" }, "& .MuiTableSortLabel-root, & .MuiTableSortLabel-icon": { color: "#fff !important" } } };
const bodyProps = { sx: { textAlign: "center", whiteSpace: "normal", wordBreak: "break-word" } };
const defaults = (scope: Scope, forApply = false): BranchFilters => {
    const withDates = !forApply || scope === "date";
    return {
        search: "", branchType: [], organizationId: [], regionId: [], countryId: [], status: ["Active"],
        createdDateFrom: withDates ? dayjs().subtract(7, "day").format(DATE_FMT) : "",
        createdDateTo: withDates ? dayjs().format(DATE_FMT) : ""
    };
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const StatusPill = ({ active }: { active: boolean }) => (
    <span className={`status-pill ${active ? "active" : "inactive"}`}> {active ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <CancelIcon sx={{ fontSize: 16 }} />}{active ? "Active" : "Inactive"} </span>
);
const excelCols = viewCols.slice(0, -4);
const normalizeHeader = (value: string) => value.replace(/\*/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
const getOptionFields = (options: DropdownOptions): OptionFields => ({
    organizationId: options.organizations, regionId: options.regions, countryId: options.countries, stateId: options.states,
    cityId: options.cities, contactPerson: options.contactPersons, workingHoursId: options.workingHours
});
const normalizeExcelRow = (row: ExcelRow, optionFields: OptionFields) => {
    const lookup = new Map(Object.entries(row).map(([k, v]) => [normalizeHeader(k), v]));
    const data: ExcelRow = {};
    const errors: string[] = [];
    for (const [label, key] of excelCols) {
        const raw = String(lookup.get(normalizeHeader(key)) ?? lookup.get(normalizeHeader(label)) ?? "").trim();
        const options = optionFields[key];
        if (!raw) data[key] = null;
        else if (options) {
            const match = options.find(o => o.name.trim().toLowerCase() === raw.toLowerCase() || String(o.id) === raw);
            data[key] = match?.id ?? null;
            if (!match) errors.push(`${key}: Invalid ${label}: "${raw}". Use a valid option name.`);
        } else if (key === "latitude" || key === "longitude") {
            data[key] = Number.isFinite(Number(raw)) ? Number(raw) : null;
            if (data[key] === null) errors.push(`${key}: ${label} must be a number`);
        } else if (key === "status") {
            const status = /^(active|true)$/i.test(raw) ? true : /^(inactive|false)$/i.test(raw) ? false : null;
            data[key] = status;
            if (status === null) errors.push(`${key}: Status must be Active or Inactive`);
        } else if (key === "departmentIds" || key === "serviceIds") {
            const list = parseIdList(raw);
            data[key] = list.length ? JSON.stringify(list) : null;
        } else data[key] = raw;
    }
    return { data, errors };
};
const excelValue = (key: string, value: unknown, optionFields: OptionFields) => {
    if (value == null || value === "") return "";
    const option = optionFields[key]?.find(item => Number(item.id) === Number(value));
    if (option) return option.name;
    if (key === "status") return value === true || String(value).toLowerCase() === "true" ? "Active" : "Inactive";
    if (key === "departmentIds" || key === "serviceIds") return parseIdList(value).join(", ");
    return String(value);
};
const errorField = (error: string) => error.split(":")[0].trim();
const errorFields = (item: ImportRow) => new Set(item.errors.map(errorField));
const mandatoryHeaders = new Set(["Branch Code", "Branch Name", "Organization", "Branch Type", "Region", "Country", "State", "City", "Address Line 1", "Status"]);

export default function BranchManagement() {
    const dispatch = useDispatch<AppDispatch>();
    const { branches, totalElements, loading, error } = useSelector((state: RootState) => state.branch);
    const excelInputRef = useRef<HTMLInputElement>(null);
    const dropdownRequest = useRef<Promise<DropdownOptions> | undefined>(undefined);
    const [optionsData, setOptionsData] = useState<DropdownOptions>(emptyOptions);
    const optionsReady = optionsData !== emptyOptions;
    const optionFields = useMemo(() => getOptionFields(optionsData), [optionsData]);
    const [counts, setCounts] = useState<Counts>({ total: 0, active: 0, inactive: 0 });
    const [countsVersion, setCountsVersion] = useState(0);
    const [scope, setScope] = useState<Scope>("all");
    const [modes, setModes] = useState<Record<Scope, ModeState>>(() => ({ all: { filters: defaults("all"), applied: defaults("all", true) }, date: { filters: defaults("date"), applied: defaults("date", true) } }));
    const { filters, applied } = modes[scope];
    const patchMode = (patch: Partial<ModeState>) => setModes(m => ({ ...m, [scope]: { ...m[scope], ...patch } }));
    const setFilters: Dispatch<SetStateAction<BranchFilters>> = next =>
        setModes(m => ({ ...m, [scope]: { ...m[scope], filters: typeof next === "function" ? next(m[scope].filters) : next } }));
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editBranch, setEditBranch] = useState<Branch | null>(null);
    const [viewBranch, setViewBranch] = useState<Branch | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
    const [sorting, setSorting] = useState<MRT_SortingState>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadConfirmOpen, setUploadConfirmOpen] = useState(false);
    const [dialOpen, setDialOpen] = useState(false);
    const [excelMenu, setExcelMenu] = useState<{ top: number; left: number } | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [validRows, setValidRows] = useState<ImportRow[]>([]);
    const [invalidRows, setInvalidRows] = useState<ImportRow[]>([]);
    const [importFileName, setImportFileName] = useState("");
    const [savingExcel, setSavingExcel] = useState(false);
    const resetPage = () => setPagination(p => p.pageIndex ? { ...p, pageIndex: 0 } : p);
    const statusFilter = applied.status.length === 1 ? applied.status[0] === "Active" : undefined;
    const selectedTile: Tile = statusFilter === undefined ? "total" : statusFilter ? "active" : "inactive";

    const ensureDropdownOptions = useCallback((): Promise<DropdownOptions> => {
        dropdownRequest.current ??= getDropdownOptions()
            .then(({ data }) => { setOptionsData(data); return data; })
            .catch((e: unknown) => { dropdownRequest.current = undefined; throw e; });
        return dropdownRequest.current;
    }, []);
    useEffect(() => { ensureDropdownOptions().catch(() => showError("Error!", "Failed to load dropdown options.")); }, [ensureDropdownOptions]);

    const { createdDateFrom: from, createdDateTo: to } = applied;
    const dateRange = useMemo(() => ({ createdDateFrom: from || undefined, createdDateTo: to || undefined }), [from, to]);
    const query = useMemo(() => ({
        filters: { search: applied.search.trim() || undefined, organizationId: applied.organizationId, regionId: applied.regionId, countryId: applied.countryId, branchType: applied.branchType, status: statusFilter, ...dateRange },
        page: { page: pagination.pageIndex, size: pagination.pageSize, sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? "desc" : "asc"}` : undefined }
    }), [applied, statusFilter, dateRange, pagination, sorting]);
    useEffect(() => {
        const request = dispatch(fetchBranches(query));
        request.unwrap().catch(e => { if (e?.name !== "AbortError") void showError("Error!", "Failed to load branches."); });
        return () => request.abort();
    }, [dispatch, query]);

    useEffect(() => {
        const controller = new AbortController();
        getCounts({}, controller.signal)
            .then(({ data }) => setCounts(data))
            .catch(() => { });
        return () => controller.abort();
    }, [countsVersion]);
    const afterChange = () => setCountsVersion(version => version + 1);
    const handleSaveSuccess = (saved: Branch[]) => {
        saved.filter(b => statusFilter === undefined || b.status === statusFilter).forEach(b => dispatch(setBranchLocally(b)));
        afterChange();
    };
    const handleUpdateSuccess = (branch: Branch) => {
        dispatch(statusFilter !== undefined && branch.status !== statusFilter ? removeBranchLocally(branch.id) : setBranchLocally(branch));
        afterChange();
    };
    const handleApplyFilters = (next: BranchFilters = filters) => {
        if (same(next, applied)) return;
        patchMode({ applied: { ...next } });
        resetPage();
    };
    const handleResetFilters = () => {
        const f = defaults(scope), a = defaults(scope, true);
        if (same(filters, f) && same(applied, a)) return;
        patchMode({ filters: f, ...(same(applied, a) ? {} : { applied: a }) });
        resetPage();
    };
    const switchScope = (next: Scope) => {
        if (next === scope) return;
        if (next === "date") setModes(m => ({ ...m, date: { ...m.date, applied: m.date.filters } }));
        setScope(next);
        resetPage();
    };
    const pickStatus = (id: Tile) => {
        const status = id === "total" ? [] : [id === "active" ? "Active" : "Inactive"];
        if (same(status, applied.status)) return;
        patchMode({ filters: { ...filters, status }, applied: { ...applied, status } });
        resetPage();
    };
    const closeView = () => setViewBranch(null);
    const handleView = async (branch: Branch) => {
        try {
            await ensureDropdownOptions();
            setViewBranch(branch);
        } catch {
            await showError("Error!", "Failed to load dropdown options for branch history.");
        }
    };
    const handleEdit = async (branch: Branch) => {
        try {
            await ensureDropdownOptions();
            setEditBranch(branch);
        } catch {
            await showError("Error!", "Failed to load dropdown options.");
        }
    };
    const handleDelete = async (id: number) => {
        setDeleteId(null);
        try {
            const response = await deleteBranch(id);
            const branch = branches.find(b => b.id === id);
            if (branch) dispatch(statusFilter === true ? removeBranchLocally(id) : setBranchLocally({ ...branch, status: false }));
            if (viewBranch?.id === id) closeView();
            afterChange();
            await showSuccess("Success!", response.data || "Branch deactivated successfully.");
        } catch {
            await showError("Error!", "Delete failed.");
        }
    };
    const removeChip = (chip: FilterChip) => {
        if (chip.key === "createdDateFrom" || chip.key === "createdDateTo") return;
        const next: BranchFilters = { ...filters };
        if (chip.key === "search") next.search = "";
        else (next[chip.key] as (string | number)[]) = (next[chip.key] as (string | number)[]).filter(v => String(v) !== String(chip.value));
        patchMode({ filters: next, ...(same(next, applied) ? {} : { applied: { ...next } }) });
        resetPage();
    };
    // ----------------------- Excel upload and validation -----------------------
    const formatBranchWorkbook = (workbook: WorkBook) => {
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) throw new Error("Excel sheet not found");
        const headers = utils.sheet_to_json<string[]>(sheet, { header: 1 })[1] ?? utils.sheet_to_json<string[]>(sheet, { header: 1 })[0];
        if (!headers?.length) throw new Error("Template headers not found");
        headers.forEach((header, i) => {
            const mandatory = String(header).endsWith("*");
            const labelAddress = utils.encode_cell({ r: 0, c: i });
            const headerAddress = utils.encode_cell({ r: 1, c: i });
            sheet[labelAddress] ??= { t: "s", v: mandatory ? "Mandatory" : "Optional" };
            sheet[headerAddress] ??= { t: "s", v: String(header) };
            sheet[labelAddress].v = mandatory ? "Mandatory" : "Optional";
            sheet[labelAddress].s = { font: { bold: true, color: { rgb: mandatory ? "FFFF0000" : "FF008000" } }, alignment: { horizontal: "center" } };
            sheet[headerAddress].s = { fill: { patternType: "solid", fgColor: { rgb: "FF0F172A" } }, font: { bold: true, color: { rgb: "FFFFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
            sheet["!cols"] ??= [];
            sheet["!cols"][i] = { wch: 20 };
        });
        sheet["!ref"] = utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(1, utils.decode_range(sheet["!ref"] ?? "A1").e.r), c: headers.length - 1 } });
        sheet["!rows"] = [{ hpt: 22 }, { hpt: 32 }];
        sheet["!freeze"] = { xSplit: 0, ySplit: 2 };
        return workbook;
    };
    const downloadExcel = (rows: Record<string, unknown>[], headers: string[], filename: string, sheetName: string) => {
        const displayHeaders = headers.map(header => mandatoryHeaders.has(header) ? `${header}*` : header);
        const workbook = utils.book_new();
        const sheet = utils.aoa_to_sheet([displayHeaders.map(header => header.endsWith("*") ? "Mandatory" : "Optional"), displayHeaders, ...rows.map(row => displayHeaders.map(header => row[header.replace(/\*$/, "")] ?? row[header] ?? ""))]);
        utils.book_append_sheet(workbook, sheet, sheetName);
        formatBranchWorkbook(workbook);
        writeFile(workbook, filename);
    };
    const handleFileSelection = async (files: File[]) => {
        if (!files.length) return;
        const unsupported = files.find(file => !/\.(pdf|docx|xlsx)$/i.test(file.name));
        const oversized = files.find(file => file.size > 20 * 1024 * 1024);
        if (unsupported) return void showError("Unsupported file", `${unsupported.name} is not a PDF, DOCX, or XLSX file.`);
        if (oversized) return void showError("File too large", `${oversized.name} exceeds the 20 MB limit.`);
        setSelectedFiles(files);
        setUploadConfirmOpen(true);
    };
    const sendSelectedFiles = async () => {
        const excelFiles = selectedFiles.filter(file => /\.xlsx$/i.test(file.name));
        if (excelFiles.length !== 1) {
            await showError("XLSX file required", "Select exactly one XLSX file for branch import. PDF and DOCX files are supporting documents and are not converted into branch records.");
            return;
        }
        setUploadConfirmOpen(false);
        await handleExcelUpload(excelFiles[0]);
    };
    const handleExcelUpload = async (file: File) => {
        let fields: OptionFields;
        try {
            fields = getOptionFields(await ensureDropdownOptions());
        } catch {
            await showError("Error!", "Failed to load dropdown options for Excel validation.");
            return;
        }
        let parsed: { data: ExcelRow; errors: string[] }[];
        try {
            const workbook = read(await file.arrayBuffer());
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            parsed = utils.sheet_to_json<ExcelRow>(sheet, { range: 1, defval: "" }).map(row => normalizeExcelRow(row, fields));
        } catch {
            await showError("Invalid Excel file", "Unable to read the Excel file. Please check its format.");
            return;
        }
        if (!parsed.length) {
            await showError("Empty file", "The selected Excel file has no data rows.");
            return;
        }
        try {
            const { data } = await saveBranches(parsed.map(p => p.data), true);
            const serverErrors = new Map<number, string[]>((data.invalidRows as { row: number; errors: string[] }[]).map(r => [r.row, r.errors]));
            const items: ImportRow[] = parsed.map((p, i) => {
                const localFields = new Set(p.errors.map(errorField));
                const fromServer = (serverErrors.get(i + 3) ?? []).filter(e => !localFields.has(errorField(e)));
                return { row: i + 3, data: p.data, errors: [...p.errors, ...fromServer] };
            });
            setImportFileName(file.name);
            setValidRows(items.filter(i => !i.errors.length));
            setInvalidRows(items.filter(i => i.errors.length));
            setImportOpen(true);
        } catch (err) {
            await showError("Validation failed", getErrorMessage(err, "The server could not validate the file. Please try again."));
        }
    };
    const saveValidExcelRows = async () => {
        if (!validRows.length) return;
        setSavingExcel(true);
        try {
            const saved = (await saveBranches(validRows.map(item => item.data))).data as Branch[];
            handleSaveSuccess(saved);
            setImportOpen(false);
            setValidRows([]);
            setInvalidRows([]);
            await showSuccess("Import complete", `${saved.length} branch record(s) saved successfully.`);
        } catch (err) {
            await showError("Import failed", getErrorMessage(err, "The server could not save the valid records."));
        } finally { setSavingExcel(false); }
    };
    const downloadTemplate = async () => {
        try {
            const workbook = read(await (await getBranchTemplate()).data.arrayBuffer(), { type: "array" });
            formatBranchWorkbook(workbook);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const headers = utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" })[1];
            const demo: Record<string, unknown> = {
                "Branch Code": "BR0030", "Branch Name": "Delhi Central Branch", "Communication Name": "Delhi 17",
                "Organization": "Organization 1", "Branch Type": "Hospital", "Working Hours": "Morning Shift",
                "Region": "North", "Country": "India", "State": "Delhi", "City": "Delhi", "Area": "Connaught Place",
                "Zip Code": "110001", "Latitude": 28.6328, "Longitude": 77.2197, "Address Line 1": "12 Parliament Street", "Address Line 2": "Near Metro Station",
                "Contact Person": "Rahul Sharma", "Mobile Number": "9876543210", "Telephone": "0114567890", "Email ID": "rahul.sharma@example.com",
                "Working Days": "Monday,Tuesday,Wednesday,Thursday,Friday", "Departments": "HR", "Services": "Emergency",
                "Status": "Active", "Branch Logo": "", "Supporting Documents": "", "Remarks": "Test branch - Organization 1, North, India, Delhi"
            };
            const demoRow = headers.map(header => {
                const key = normalizeHeader(String(header).replace(/\*$/, ""));
                const match = Object.entries(demo).find(([label]) => normalizeHeader(label) === key);
                return match ? match[1] : "";
            });
            utils.sheet_add_aoa(sheet, [demoRow], { origin: "A3" });
            const range = utils.decode_range(sheet["!ref"] ?? "A1");
            range.e.r = Math.max(range.e.r, 2);
            range.e.c = Math.max(range.e.c, demoRow.length - 1);
            sheet["!ref"] = utils.encode_range(range);
            writeFile(workbook, "branch-template.xlsx");
        } catch {
            await showError("Error!", "Failed to download branch template.");
        }
    };
    const downloadInvalidRows = () => {
        const headers = ["Excel Row", ...excelCols.map(([label]) => label), "Validation Errors"];
        const rows = invalidRows.map(item => ({ "Excel Row": item.row, ...Object.fromEntries(excelCols.map(([label, key]) => [label, excelValue(key, item.data[key], optionFields)])), "Validation Errors": item.errors.join("; ") }));
        downloadExcel(rows, headers, "invalid-branches.xlsx", "Invalid Rows");
    };
    const downloadAllBranches = () => {
        const rows = branches.map(branch => Object.fromEntries(viewCols.map(([label, key]) => [label, excelValue(key, branch[key as keyof Branch], optionFields)])));
        downloadExcel(rows, viewCols.map(([label]) => label), "branches.xlsx", "Branches");
    };
    const columns: MRT_ColumnDef<Branch>[] = [
        {
            accessorKey: "branchCode", header: "Branch Code", size: 100, enableSorting: true,
            Cell: ({ row }: { row: MRT_Row<Branch> }) => (
                <Button variant="text" size="small" onClick={() => handleView(row.original)}
                    sx={{ textTransform: "none", fontWeight: 600, minWidth: 0, p: 0, color: "primary.main", "&:hover": { textDecoration: "underline", bgcolor: "transparent" } }}>
                    {row.original.branchCode}
                </Button>)
        },
        { accessorKey: "branchName", header: "Branch Name", size: 200, enableSorting: true },
        { id: "organizationId", header: "Organization", size: 140, accessorFn: (row: Branch) => optionsData.organizations.find(x => Number(x.id) === Number(row.organizationId))?.name },
        { accessorKey: "branchType", header: "Branch Type", enableSorting: true },
        { id: "regionId", header: "Region", size: 100, accessorFn: (row: Branch) => optionsData.regions.find(x => Number(x.id) === Number(row.regionId))?.name },
        { id: "cityId", header: "City", size: 150, accessorFn: (row: Branch) => optionsData.cities.find(x => Number(x.id) === Number(row.cityId))?.name },
        { accessorKey: "mobile", header: "Mobile", size: 150 },
        { accessorKey: "email", header: "Email", size: 230 },
        { accessorKey: "status", header: "Status", size: 120, Cell: ({ row }: { row: MRT_Row<Branch> }) => <StatusPill active={!!row.original.status} /> },
        { accessorKey: "createdBy", header: "Created By", size: 100 },
        { accessorKey: "createdAt", header: "Created At", size: 200, enableSorting: true },
        { accessorKey: "updatedBy", header: "Updated By", size: 100 },
        { accessorKey: "updatedAt", header: "Updated At", size: 200 }
    ].map(column => ({ ...column, enableSorting: column.enableSorting ?? false, muiTableHeadCellProps: headProps, muiTableBodyCellProps: bodyProps }));

    const tiles = [
        { id: "total" as const, label: "Total Branches", count: counts.total, classType: "stat-card-total", icon: <StorageIcon /> },
        { id: "active" as const, label: "Active", count: counts.active, classType: "stat-card-active", icon: <CheckCircleIcon /> },
        { id: "inactive" as const, label: "Inactive", count: counts.inactive, classType: "stat-card-inactive", icon: <CancelIcon /> }
    ];
    const rowActions = (branch: Branch) => {
        const actions: { title: string; color: "info" | "primary" | "error"; icon: ReactNode; run: () => void }[] = [
            { title: "View History", color: "info", icon: <VisibilityIcon fontSize="small" />, run: () => void handleView(branch) },
            { title: "Edit Branch", color: "primary", icon: <EditIcon fontSize="small" />, run: () => void handleEdit(branch) },
            ...(branch.status ? [{ title: "Delete Branch", color: "error" as const, icon: <DeleteIcon fontSize="small" />, run: () => setDeleteId(branch.id) }] : [])
        ];
        return (
            <Stack direction="row" spacing={0.5}>
                {actions.map(action => (
                    <Tooltip key={action.title} title={action.title}><IconButton size="small" color={action.color} onClick={action.run}>{action.icon}</IconButton></Tooltip>
                ))}
            </Stack>
        );
    };

    return (
        <div className="branch-content-wrap">
            <BranchHeader />
            <Card elevation={0} sx={{ my: 2, py: 2, px: 1, textAlign: "center", borderRadius: 4, color: "#fff", background: "linear-gradient(135deg, #d4dcf0 0%, #d0deecfb 55%, #d4dcf0 100%)", boxShadow: "0 10px 30px rgb(222, 238, 253)" }}>
                <Typography variant="h3" className="app-header-title" sx={{ color: "#fff", fontWeight: 800, letterSpacing: 1.5, mb: 1 }}>  Branch Master  </Typography>
                <Typography variant="subtitle1" className="app-header-subtitle" sx={{ color: "#dbeafe", fontWeight: 500, letterSpacing: 0.4 }}>  Manage branches. Monitor operations. Stay in control. </Typography>
            </Card>
            <div className="dashboard-top-grid">
                <SearchForm filters={filters} appliedFilters={applied} setFilters={setFilters} onApply={handleApplyFilters} onReset={handleResetFilters} showMoreFilters={showMoreFilters} setShowMoreFilters={setShowMoreFilters} optionsData={optionsData}
                    renderChips={chips => (
                        <Paper elevation={0} sx={{ mt: 2, p: 1.5, bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2 }} >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ flex: 1, minWidth: 0 }} >
                                    {chips.map(chip => (
                                        <Chip key={`${chip.key}-${chip.value}`} label={chip.label} size="small" variant="outlined" onDelete={chip.key === "createdDateFrom" || chip.key === "createdDateTo" ? undefined : () => removeChip(chip)} />
                                    ))}
                                </Stack>
                                <IconButton title="Download Excel" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setExcelMenu({ top: r.top, left: r.left }); }} sx={{ flexShrink: 0, bgcolor: "#434e67", color: "#fff", borderRadius: 2, "&:hover": { bgcolor: "#7f8cac" } }}> <DownloadIcon /> </IconButton>
                            </Stack>
                        </Paper>
                    )}
                    renderBelowFilters={
                        <Box sx={{ width: "100%", minWidth: 0 }}>
                            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                {([["all", "Since Beginning"], ["date", "By Chosen Date"]] as const).map(([id, label]) => (
                                    <Button key={id} variant="text" size="small" onClick={() => switchScope(id)} sx={{ textTransform: "none", borderRadius: 0, fontWeight: scope === id ? 800 : 500, color: scope === id ? "#17324d" : "text.secondary", borderBottom: `2px solid ${scope === id ? "#17324d" : "transparent"}` }}> {label} </Button>
                                ))}
                            </Stack>
                            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, width: "100%", minWidth: 0 }}>
                                {tiles.map(({ id, label, count, classType, icon }) => (
                                    <Paper key={id} className={`stat-card ${classType}`} elevation={0} onClick={() => pickStatus(id)} sx={{ cursor: "pointer", minWidth: 0, outline: selectedTile === id && id !== "total" ? "3px solid #f5f6f8" : "none", outlineOffset: 2 }}>
                                        <span className="stat-label">{icon} {label}</span>
                                        <span className="stat-count">{count}</span>
                                    </Paper>
                                ))}
                            </Box>
                        </Box>
                    }
                />
            </div>
            {error && <p>{error}</p>}
            <DataTable<Branch>
                data={branches} columns={columns} getRowId={(branch: Branch) => String(branch.id)}
                pageSize={PAGE_SIZE} loading={loading || !optionsReady}
                serverSide={{ rowCount: totalElements, pagination, sorting, onPaginationChange: setPagination, onSortingChange: setSorting }}
                renderTopToolbarCustomActions={() => (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%", px: 1, py: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Branches found: {totalElements}</Typography>
                    </Box>
                )}
                emptyMessage="No branches found matching the current criteria"
                enableRowActions renderRowActions={rowActions}
            />
            <input ref={excelInputRef} hidden multiple type="file" accept=".pdf,.docx,.xlsx" onChange={event => { void handleFileSelection(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
            <SpeedDial ariaLabel="Branch actions" icon={<ListIcon />} open={dialOpen} onOpen={() => setDialOpen(true)} onClose={() => setDialOpen(false)} sx={{ position: "fixed", right: 30, bottom: 80, zIndex: 1200 }} >
                <SpeedDialAction icon={<AddIcon />} tooltipTitle="Add New Branch" slotProps={{ fab: { sx: { bgcolor: "#2529fc", color: "#fff", "&:hover": { bgcolor: "#3930b8" } } } }}
                    onClick={() => {
                        setDialOpen(false);
                        void ensureDropdownOptions().then(() => setAddOpen(true)).catch(() => showError("Error!", "Failed to load dropdown options."));
                    }} />
                <SpeedDialAction icon={<DownloadIcon />} tooltipTitle="Download Excel" slotProps={{ fab: { sx: { bgcolor: "#434e67", color: "#fff", "&:hover": { bgcolor: "#7f8cac" } } } }}
                    onClick={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDialOpen(false); setExcelMenu({ top: r.top, left: r.left }); }}
                />
                <SpeedDialAction icon={<UploadFileIcon />} tooltipTitle="Upload Excel" slotProps={{ fab: { sx: { bgcolor: "#c107b2", color: "#fff", "&:hover": { bgcolor: "#983f91" } } } }}
                    onClick={() => { setDialOpen(false); excelInputRef.current?.click(); }}
                />
            </SpeedDial>
            <Menu open={!!excelMenu} onClose={() => setExcelMenu(null)} anchorReference="anchorPosition" anchorPosition={excelMenu ?? undefined}>
                <MenuItem onClick={() => { void downloadTemplate(); setExcelMenu(null); }}> Download Template </MenuItem>
                <MenuItem onClick={() => { downloadAllBranches(); setExcelMenu(null); }}> Download All Branch Records </MenuItem>
            </Menu>
            <Dialog open={uploadConfirmOpen} onClose={() => setUploadConfirmOpen(false)} fullWidth maxWidth="sm" >
                <DialogTitle sx={{ bgcolor: "#17324d", color: "#fff", fontWeight: 700 }}> Confirm Selected Files </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <DialogContentText sx={{ mb: 2 }}> Review your selected files before validating the branch data. Each file must be 20 MB or smaller. </DialogContentText>
                    <Stack spacing={1}>
                        {selectedFiles.map((file, index) => (
                            <Paper key={`${file.name}-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                                <Stack direction="row" alignItems="center" spacing={1}> <UploadFileIcon color="action" />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ overflowWrap: "anywhere" }}> {file.name} </Typography>
                                        <Typography variant="caption" color="text.secondary"> {(file.size / (1024 * 1024)).toFixed(2)} MB {" · "} {/\.xlsx$/i.test(file.name) ? "Branch data" : "Supporting document"} </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                    <Alert severity="info" sx={{ mt: 2 }}>
                        XLSX files provide branch rows for validation. PDF and DOCX files
                        are listed as supporting documents but are not stored by the
                        current JSON-only API.
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setUploadConfirmOpen(false)}>  Cancel </Button>
                    <Button variant="contained" onClick={() => void sendSelectedFiles()}> Send </Button>
                </DialogActions>
            </Dialog>
            {/* Excel validation preview */}
            <Dialog open={importOpen} onClose={() => !savingExcel && setImportOpen(false)} fullWidth maxWidth="xl">
                <DialogTitle sx={{ bgcolor: "#17324d", color: "#fff", fontWeight: 700 }}>  Excel Import Preview  </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 2 }}> File: {importFileName} </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Chip color="success" label={`Valid records: ${validRows.length}`} />
                        <Chip color="error" label={`Invalid records: ${invalidRows.length}`} />
                    </Stack>
                    <Alert severity="info" sx={{ mb: 2 }}> Only valid records will be submitted. Review the invalid records and download their errors if needed. </Alert>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>  Valid Records </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, mb: 3 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ bgcolor: "#17324d", color: "#fff" }}>Excel Row</TableCell>
                                    {excelCols.map(([label, key]) => (<TableCell key={key} sx={{ bgcolor: "#17324d", color: "#fff", fontWeight: 700 }}> {label} </TableCell>))}
                                </TableRow>
                            </TableHead>
                            <TableBody> {validRows.map(item => (
                                <TableRow key={item.row}>
                                    <TableCell>{item.row}</TableCell>
                                    {excelCols.map(([, key]) => (<TableCell key={key}> {excelValue(key, item.data[key], optionFields)} </TableCell>))}
                                </TableRow>
                            ))}
                                {!validRows.length && (<TableRow><TableCell colSpan={excelCols.length + 1} align="center"> No valid records </TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Divider sx={{ mb: 2 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6" fontWeight={700}>Invalid Records</Typography>
                        <Button startIcon={<DownloadIcon />} onClick={downloadInvalidRows} disabled={!invalidRows.length}> Download Errors </Button>
                    </Stack>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                        <Table stickyHeader size="small">
                            <TableHead><TableRow>
                                <TableCell sx={{ bgcolor: "#17324d", color: "#fff" }}>Excel Row</TableCell>
                                {excelCols.map(([label, key]) => (<TableCell key={key} sx={{ bgcolor: "#17324d", color: "#fff", fontWeight: 700 }}> {label} </TableCell>))}
                                <TableCell sx={{ bgcolor: "#17324d", color: "#fff", fontWeight: 700 }}> Validation Reasons </TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {invalidRows.map(item => {
                                    const fields = errorFields(item);
                                    return (
                                        <TableRow key={item.row}><TableCell>{item.row}</TableCell>
                                            {excelCols.map(([, key]) => (
                                                <TableCell key={key} sx={fields.has(key) ? { bgcolor: "#ffebee", color: "#b71c1c", fontWeight: 700, border: "1px solid #ef9a9a" } : undefined}> {excelValue(key, item.data[key], optionFields)} </TableCell>))}
                                            <TableCell sx={{ color: "#b71c1c", minWidth: 260 }}> {item.errors.map(error => error.slice(error.indexOf(":") + 1).trim()).join(", ")} </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!invalidRows.length && (
                                    <TableRow><TableCell colSpan={excelCols.length + 2} align="center"> No invalid records </TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setImportOpen(false)} disabled={savingExcel}>Cancel</Button>
                    <Button variant="contained" onClick={() => void saveValidExcelRows()} disabled={!validRows.length || savingExcel}> {savingExcel ? "Saving..." : `Save ${validRows.length} Valid Records`} </Button>
                </DialogActions>
            </Dialog>
            <AddForm open={addOpen} onClose={() => setAddOpen(false)} onSuccess={handleSaveSuccess} optionsData={optionsData} />
            <UpdateForm key={editBranch?.id ?? "closed"} open={!!editBranch} branch={editBranch} onClose={() => setEditBranch(null)} onSuccess={handleUpdateSuccess} optionsData={optionsData} />
            <BranchHistoryDialog branch={viewBranch} onClose={closeView} optionsData={optionsData} />
            <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
                <DialogTitle sx={{ fontWeight: 700 }}>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>Are you sure you want to delete this branch? This action cannot be undone.</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button color="primary" variant="contained" onClick={() => setDeleteId(null)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { if (deleteId !== null) void handleDelete(deleteId); }}> Delete </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}