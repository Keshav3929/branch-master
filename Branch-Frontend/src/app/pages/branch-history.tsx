import { useEffect, useMemo, useState } from "react";
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import type { MRT_ColumnDef } from "material-react-table";
import DataTable from "../../components/Table";
import { showError } from "../../components/SweetAlert";
import { getBranchById, getBranchHistory } from "../branchApi";
import { NA, nameOf } from "../branchUtils";
import { formatDateTime } from "../dateUtils";
import type { Branch } from "../../types/branchSchema";
import { alignContent, alignItems } from "@mui/system";

export type BranchHistory = Partial<Branch> & {
    historyId: number;
    branchId: number;
    action: string;
    updatedBy: number | null;
    updatedAt: string | null;
};

type Option = { id: number; name: string };
type OptionsData = {
    organizations: Option[];
    regions: Option[];
    countries: Option[];
    states: Option[];
    cities: Option[];
    contactPersons: Option[];
    workingHours: Option[];
};
type Props = {
    branch: Branch | null;
    onClose: () => void;
    optionsData: OptionsData;
};

export const viewCols = [
    ["Branch Code", "branchCode"], ["Branch Name", "branchName"], ["Communication Name", "communicationName"], ["Organization", "organizationId"],
    ["Type", "branchType"], ["Working Hours", "workingHoursId"], ["Region", "regionId"], ["Country", "countryId"], ["State", "stateId"],
    ["City", "cityId"], ["Area", "area"], ["Zip Code", "zipCode"], ["Latitude", "latitude"], ["Longitude", "longitude"],
    ["Address Line 1", "address1"], ["Address Line 2", "address2"], ["Contact Person", "contactPerson"], ["Mobile", "mobile"],
    ["Telephone", "telephone"], ["Email", "email"], ["Working Days", "workingDays"], ["Departments", "departmentIds"], ["Services", "serviceIds"],
    ["Status", "status"], ["Branch Logo", "branchLogo"], ["Document Path", "documentPath"],
    ["Remarks", "remarks"], ["Created By", "createdBy"], ["Created On", "createdAt"], ["Updated By", "updatedBy"], ["Updated On", "updatedAt"]
] as const;

const lookup = { organizationId: "organizations", regionId: "regions", countryId: "countries", stateId: "states", cityId: "cities", contactPerson: "contactPersons", workingHoursId: "workingHours" } as const;
const actionLabels: Record<string, string> = { CREATE: "Created", UPDATE: "Updated", DELETE: "Deleted" };
const cellProps = { sx: { whiteSpace: "normal", wordBreak: "break-word" } };
const field = (row: object, key: string) => (row as Record<string, unknown>)[key];
const isEmpty = (v: unknown) => v == null || (typeof v === "string" && (!v.trim() || v.trim() === NA));
const formatValue = (key: string, row: object, options: OptionsData): string => {
    const value = field(row, key);
    if (key in lookup)
        return nameOf(options[lookup[key as keyof typeof lookup]], value as number | null);
    if (value == null || value === "") return NA;
    if (key === "status") return value ? "Active" : "Inactive";
    if (key === "createdAt" || key === "updatedAt") return formatDateTime(String(value));
    if (key === "departmentIds" || key === "serviceIds") {
        try {
            const parsed = typeof value === "string" ? JSON.parse(value) : value;
            return Array.isArray(parsed) ? parsed.join(", ") : String(parsed);
        } catch { return String(value); }
    }
    return Array.isArray(value) ? value.join(", ") : String(value);
};
const StatusPill = ({ active }: { active: boolean }) => (
    <span className={`status-pill ${active ? "active" : "inactive"}`}>
        {active ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <CancelIcon sx={{ fontSize: 16 }} />}
        {active ? "Active" : "Inactive"}
    </span>
);

export default function BranchHistoryDialog({ branch, onClose, optionsData }: Props) {
    const [history, setHistory] = useState<BranchHistory[]>([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!branch) {
            setHistory([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        Promise.all([getBranchById(branch.id), getBranchHistory(branch.id)]).then(([branchRes, historyRes]) => {
            if (cancelled) return;
            const current: Branch = branchRes.data;
            const records: BranchHistory[] = historyRes.data?.length ? historyRes.data : [{ historyId: 0, branchId: current.id, action: "CREATE" } as BranchHistory];
            setHistory(records.map(record => ({
                ...current,
                ...Object.fromEntries(Object.entries(record).filter(([, v]) => v != null)),
                historyId: record.historyId,
                branchId: record.branchId,
                action: record.action || "CREATE",
                updatedBy: record.updatedBy ?? record.createdBy ?? current.updatedBy ?? current.createdBy ?? null,
                updatedAt: record.updatedAt ?? record.createdAt ?? current.updatedAt ?? current.createdAt ?? null
            })));
        })
            .catch(() => { if (!cancelled) void showError("Error!", "Failed to load branch details and history."); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [branch?.id]);
    const columns = useMemo<MRT_ColumnDef<BranchHistory>[]>(() => [
        { id: "updatedAt", header: "Updated On", accessorFn: h => formatDateTime(h.updatedAt), enableSorting: false },
        { id: "updatedBy", header: "Updated By", accessorFn: h => h.updatedBy ?? NA, enableSorting: false },
        { id: "action", header: "Action", enableSorting: false, accessorFn: h => actionLabels[h.action?.toUpperCase()] ?? h.action ?? NA },
        ...viewCols.filter(([, key]) => key !== "updatedAt" && key !== "updatedBy")
            .map(([header, key]) => ({
                id: key,
                header,
                enableSorting: false,
                muiTableBodyCellProps: cellProps,
                accessorFn: (h: BranchHistory) => formatValue(key, h, optionsData),
                Cell: ({ row }: { row: { original: BranchHistory; index: number } }) => {
                    const h = row.original;
                    const older = history[history.findIndex(item => item.historyId === h.historyId) + 1];
                    const current = field(h, key);
                    const changed = !!older && !isEmpty(current) && !isEmpty(field(older, key)) &&
                        JSON.stringify(current) !== JSON.stringify(field(older, key));

                    return (
                        <Box sx={{ bgcolor: changed ? "#fff3cd" : "transparent", borderRadius: 1, px: changed ? 1 : 0, py: 0.5, minHeight: 24, whiteSpace: "normal", overflowWrap: "anywhere" }}>
                            {key === "status" && current != null
                                ? <StatusPill active={!!current} />
                                : formatValue(key, h, optionsData)}
                        </Box>
                    );
                }
            }))
    ], [history, optionsData]);

    return (
        <Dialog open={!!branch} onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle sx={{ bgcolor: "#0f172a", color: "#fff", fontWeight: 700, py: 2 }}> Branch History & Details </DialogTitle>
            <DialogContent sx={{ pt: 2, pb: 0 }}>
                {branch && (
                    <DataTable<BranchHistory>
                        data={history}
                        columns={columns}
                        getRowId={h => String(h.historyId)}
                        emptyMessage={loading ? "Loading branch history..." : "No history records available"}
                        enablePagination
                        maxHeight={550}
                    />
                )}
            </DialogContent>
            <DialogActions sx={{ px: 1, pt: 0, pb: 1, minHeight: 0 }}>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}