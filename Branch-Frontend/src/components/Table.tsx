import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";
import type { OnChangeFn } from "@tanstack/react-table";
import type { MRT_ColumnDef, MRT_PaginationState, MRT_SortingState, MRT_TableOptions } from "material-react-table";

export interface ServerSideProps {
    rowCount: number;
    pagination: MRT_PaginationState;
    sorting: MRT_SortingState;
    onPaginationChange: OnChangeFn<MRT_PaginationState>;
    onSortingChange: OnChangeFn<MRT_SortingState>;
}

interface DataTableProps<TData extends object> {
    data: TData[];
    columns: MRT_ColumnDef<TData>[];
    pageSize?: number;
    loading?: boolean;
    getRowId?: (row: TData) => string;
    renderRowActions?: (row: TData) => ReactNode;
    renderTopToolbarCustomActions?: MRT_TableOptions<TData>["renderTopToolbarCustomActions"];
    title?: string;
    emptyMessage?: string;
    enableRowActions?: boolean;
    enablePagination?: boolean;
    maxHeight?: number;
    serverSide?: ServerSideProps;
}
const isBlank = (v: unknown) => v == null || (typeof v === "string" && !v.trim());
const headCellSx = {
    backgroundColor: "#17324d",
    color: "#fff",
    fontWeight: 700,
    "& .MuiTableSortLabel-root, & .MuiTableSortLabel-root:hover, & .MuiTableSortLabel-root.Mui-active": { color: "#fff !important" },
    "& .MuiTableSortLabel-icon, & .MuiTableSortLabel-icon path, & .MuiTableSortLabel-root .MuiSvgIcon-root": { color: "#fff !important", fill: "#fff", opacity: 1 },
    "& .MuiIconButton-root, & .MuiSvgIcon-root": { color: "#fff" },
    "& .MuiInputBase-root, & .MuiInputLabel-root": { color: "#fff" },
    "& .MuiInputBase-input::placeholder": { color: "#fff", opacity: 0.8 },
    "& .MuiInput-underline:before": { borderBottomColor: "rgba(255,255,255,0.7)" },
    "& .MuiInput-underline:hover:not(.Mui-disabled):before, & .MuiInput-underline:after": { borderBottomColor: "#fff" }
};

// Keeps the cell on one line, cut off with "…" at the column width.
// The tooltip with the full text appears only when the content is actually cut off.
const CELL_PADDING = 32;
function TruncatedCell({ title, width, children }: { title: string; width: number; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [overflowing, setOverflowing] = useState(false);

    const check = () => {
        const el = ref.current;
        const child = el?.firstElementChild as HTMLElement | null;
        setOverflowing(!!el && (el.scrollWidth > el.clientWidth || (!!child && child.scrollWidth > child.clientWidth)));
    };

    return (
        <Tooltip title={overflowing ? title : ""} placement="top" arrow enterDelay={200}>
            <Box
                ref={ref}
                onMouseEnter={check}
                sx={{
                    display: "block", maxWidth: Math.max(width - CELL_PADDING, 40),
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    // custom cell content (e.g. the history highlight box) is kept on one line as well
                    "& > *": {
                        whiteSpace: "nowrap !important", overflowWrap: "normal !important",
                        overflow: "hidden !important", textOverflow: "ellipsis !important"
                    }
                }}
            >
                {children}
            </Box>
        </Tooltip>
    );
}

function DataTable<TData extends object>({
    data, columns, loading = false, getRowId, renderRowActions,
    renderTopToolbarCustomActions, title,
    emptyMessage = "No records found",
    enableRowActions = false, enablePagination = true,
    maxHeight = 500, serverSide
}: DataTableProps<TData>) {
    const [searchFocused, setSearchFocused] = useState(false);
    const [globalFilter, setGlobalFilter] = useState("");

    const updatedColumns = useMemo<MRT_ColumnDef<TData>[]>(() => columns.map(column => {
        const originalCell = column.Cell;
        return {
            ...column,
            Cell: props => {
                const value = props.cell.getValue();
                if (isBlank(value)) return "N/A";
                const content = originalCell ? originalCell(props) : value as ReactNode;
                // only text and numbers get a tooltip (not booleans or buttons)
                const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
                return text
                    ? <TruncatedCell title={text} width={props.column.getSize()}>{content}</TruncatedCell>
                    : content;
            }
        };
    }), [columns]);

    const table = useMaterialReactTable({
        columns: updatedColumns,
        data,
        getRowId: getRowId ? row => getRowId(row) : undefined,
        enableRowActions: enableRowActions && !!renderRowActions,
        renderRowActions: renderRowActions ? ({ row }) => renderRowActions(row.original) : undefined,
        renderTopToolbarCustomActions,
        positionActionsColumn: "first",
        enableColumnActions: false,
        enablePagination,
        autoResetPageIndex: false,
        enableStickyHeader: true,
        enableGlobalFilter: true,
        positionGlobalFilter: "left",
        onGlobalFilterChange: setGlobalFilter,
        initialState: { showGlobalFilter: true, pagination: { pageIndex: 0, pageSize: 20 }, sorting: [] },
        state: {
            globalFilter,
            isLoading: loading,
            ...(serverSide && { pagination: serverSide.pagination, sorting: serverSide.sorting })
        },
        muiSearchTextFieldProps: {
            onFocus: () => setSearchFocused(true),
            onBlur: () => setSearchFocused(false),
            sx: {
                minWidth: 300, width: 300,
                "& .MuiInputAdornment-root": { visibility: searchFocused ? "visible" : "hidden" }
            }
        },
        ...(serverSide && {
            manualPagination: true,
            manualSorting: true,
            enableMultiSort: false,
            rowCount: serverSide.rowCount,
            onPaginationChange: serverSide.onPaginationChange,
            onSortingChange: serverSide.onSortingChange
        }),
        muiLinearProgressProps: { sx: { display: "none" } },
        muiTableContainerProps: { sx: { maxHeight, overflow: "auto" } },
        muiTablePaperProps: { elevation: 0, sx: { width: "100%" } },
        muiTableHeadCellProps: { sx: headCellSx },
        muiTableBodyCellProps: { sx: { fontSize: "14px" } },
        renderEmptyRowsFallback: () => (
            <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>{emptyMessage}</Box>
        )
    });
    const total = serverSide?.rowCount ?? table.getFilteredRowModel().rows.length;
    return (
        <>
            {title && (
                <Box sx={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    px: 2, py: 1.5, bgcolor: "#0f172a", color: "#fff", borderRadius: "4px 4px 0 0"
                }}>
                    <Typography fontWeight={700}>{title}</Typography>
                    <Typography variant="body2">{total} {total === 1 ? "record" : "records"}</Typography>
                </Box>
            )}
            <MaterialReactTable table={table} />
        </>
    );
}

export default DataTable;