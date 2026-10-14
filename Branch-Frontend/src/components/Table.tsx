import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";
import type { OnChangeFn } from "@tanstack/react-table";
import type { MRT_ColumnDef, MRT_PaginationState, MRT_SortingState, MRT_TableOptions } from "material-react-table";

export interface ServerSideProps<TData extends object> {
    rowCount: number;
    pagination: MRT_PaginationState;
    sorting: MRT_SortingState;
    loading: boolean;
    onPaginationChange: OnChangeFn<MRT_PaginationState>;
    onSortingChange: OnChangeFn<MRT_SortingState>;
}

interface DataTableProps<TData extends object> {
    data: TData[];
    columns: MRT_ColumnDef<TData>[];
    getRowId?: (row: TData) => string;
    renderRowActions?: (row: TData) => ReactNode;
    renderTopToolbarCustomActions?: MRT_TableOptions<TData>["renderTopToolbarCustomActions"];
    title?: string;
    emptyMessage?: string;
    enableRowActions?: boolean;
    enablePagination?: boolean;
    maxHeight?: number;
    serverSide?: ServerSideProps<TData>;
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

function DataTable<TData extends object>({
    data, columns, getRowId, renderRowActions, renderTopToolbarCustomActions,
    title, emptyMessage = "No records found", enableRowActions = false,
    enablePagination = true, maxHeight = 500, serverSide
}: DataTableProps<TData>) {
    const [searchFocused, setSearchFocused] = useState(false);
    const [localFilter, setLocalFilter] = useState("");
    const [globalFilter, setGlobalFilter] = useState("");

    const updatedColumns = useMemo<MRT_ColumnDef<TData>[]>(() => columns.map(column => {
        const originalCell = column.Cell;
        return {
            ...column,
            Cell: props => isBlank(props.cell.getValue())
                ? "N/A"
                : originalCell ? originalCell(props) : props.cell.getValue() as ReactNode
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
            ...(serverSide && {
                pagination: serverSide.pagination,
                sorting: serverSide.sorting,
                isLoading: serverSide.loading
            })
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