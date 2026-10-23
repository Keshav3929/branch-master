import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Box, Button, Paper, Card, CardContent, Typography, Stack, Tooltip, IconButton, Collapse } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ResetIcon from "@mui/icons-material/RestartAlt";
import TuneIcon from "@mui/icons-material/Tune";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import MultiSelectAutoComplete from "../../components/MultiSelectAutoComplete";

dayjs.extend(customParseFormat);
export const DATE_FMT = "DD-MM-YYYY";
const today = () => dayjs().startOf("day");
const parseDate = (v: string): Dayjs | null => { const d = dayjs(v, DATE_FMT, true); return v && d.isValid() ? d.startOf("day") : null; };
const formatDate = (d: Dayjs) => d.format(DATE_FMT);

export interface BranchFilters {
    search: string; createdDateFrom: string; createdDateTo: string;
    branchType: string[]; organizationId: (string | number)[]; regionId: (string | number)[];
    countryId: (string | number)[]; status: string[];
}
interface Option { id: number | string; name: string; }
export interface FilterChip { key: keyof BranchFilters; value: string | number; label: string; }
interface SearchFormProps {
    filters: BranchFilters; appliedFilters: BranchFilters;
    setFilters: React.Dispatch<React.SetStateAction<BranchFilters>>;
    onApply: (nextFilters?: BranchFilters) => void; onReset: () => void;
    showMoreFilters: boolean; setShowMoreFilters: React.Dispatch<React.SetStateAction<boolean>>;
    optionsData: { organizations: Option[]; branchTypes: string[]; regions: Option[]; countries: Option[]; };
    renderChips?: (chips: FilterChip[]) => React.ReactNode; renderBelowFilters?: React.ReactNode;
}
type DateKey = "createdDateFrom" | "createdDateTo";
type SelectKey = "organizationId" | "regionId" | "countryId" | "branchType" | "status";
type Opt = Option | string;

const optId = (o: Opt) => String(typeof o === "string" ? o : o.id);
const toIds = (val: unknown): (string | number)[] => (Array.isArray(val) ? val : [val]).filter(v => v != null && v !== "")
    .map(v => typeof v === "object" ? (v as Option).id : v as string | number);
const gridStyle = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 };
const popperSx = {
    "& .MuiDateCalendar-root": { height: "auto", paddingBottom: 0 },
    "& .MuiPickersLayout-contentWrapper": { paddingBottom: 0 },
    "& .MuiPickersLayout-actionBar": { paddingTop: 0, paddingBottom: "2px", minHeight: "auto", marginTop: "-18px" }
};
const pickerErrors: Record<string, string> = {
    invalidDate: "Enter a valid date in DD-MM-YYYY format",
    maxDate: "Future dates are not allowed",
    minDate: "To date cannot be before From date"
};

export default function SearchForm({ filters, setFilters, onApply, onReset, showMoreFilters, setShowMoreFilters, optionsData, renderChips, renderBelowFilters
}: SearchFormProps) {
    const [errors, setErrors] = useState<Record<DateKey, string>>({ createdDateFrom: "", createdDateTo: "" });
    const set = (patch: Partial<BranchFilters>) => setFilters(prev => ({ ...prev, ...patch }));
    const setError = (field: DateKey, msg: string) => setErrors(prev => ({ ...prev, [field]: msg }));
    const fromDate = parseDate(filters.createdDateFrom);
    const toDate = parseDate(filters.createdDateTo);
    const dates: Record<DateKey, Dayjs | null> = { createdDateFrom: fromDate, createdDateTo: toDate };
    const validateDate = (field: DateKey, date: Dayjs | null) => {
        if (!date) return "";
        if (!date.isValid()) return pickerErrors.invalidDate;
        if (date.isAfter(today(), "day")) return pickerErrors.maxDate;
        if (field === "createdDateFrom" && toDate && date.isAfter(toDate, "day"))
            return "From date cannot be after To date";
        if (field === "createdDateTo" && fromDate && date.isBefore(fromDate, "day"))
            return pickerErrors.minDate;
        return "";
    };
    const updateDate = (field: DateKey, date: Dayjs | null) => {
        const error = validateDate(field, date);
        if (error) return setError(field, error);
        set({ [field]: date ? formatDate(date.startOf("day")) : "" });
        setError(field, "");
    };
    const validateTypedDate = (field: DateKey, value: string) => {
        if ((value.match(/\//g) || []).length > 2)
            return setError(field, "A date cannot contain more than 2 slashes");
        setError(field, value ? validateDate(field, parseDate(value)) : "");
    };
    const dateKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey || event.altKey ||
            ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Enter"].includes(event.key)) return;
        if (!/^[0-9/-]$/.test(event.key)) event.preventDefault();
    };
    const datePicker = (field: DateKey, label: string) => (
        <DatePicker label={label} value={dates[field]} format="DD-MM-YYYY" views={["year", "month", "day"]} openTo="day" maxDate={today()} minDate={field === "createdDateTo" ? fromDate ?? undefined : undefined}
            onChange={date => updateDate(field, date)}
            onError={reason => {
                if (!reason) setError(field, "");
                else if (pickerErrors[reason]) setError(field, pickerErrors[reason]);
            }}
            slotProps={{
                actionBar: { actions: ["today"], sx: { m: 0, p: 0.5 } }, popper: { sx: popperSx },
                textField: { size: "small", fullWidth: true, error: !!errors[field], helperText: errors[field], onKeyDown: dateKeyDown, onBlur: event => validateTypedDate(field, event.currentTarget.querySelector("input")?.value ?? "") },
                day: ownerState => ({ sx: { opacity: ownerState.day.isAfter(today(), "day") ? 0.4 : 1 } })
            }}
        />
    );
    const selects: { key: SelectKey; label: string; options: Opt[] }[] = [
        { key: "organizationId", label: "Organization", options: optionsData.organizations },
        { key: "regionId", label: "Region", options: optionsData.regions },
        { key: "countryId", label: "Country", options: optionsData.countries },
        { key: "branchType", label: "Branch Type", options: optionsData.branchTypes },
        { key: "status", label: "Status", options: ["Active", "Inactive"] }
    ];
    const stringKeys: SelectKey[] = ["branchType", "status"];
    // Chips reflect current selections immediately; searching still requires Apply Filters.
    const chips: FilterChip[] = [];
    (["search", "createdDateFrom", "createdDateTo"] as const).forEach(key => {
        const labels = { search: "Search", createdDateFrom: "Created From", createdDateTo: "Created To" };
        if (filters[key]) chips.push({
            key, value: filters[key], label: `${labels[key]}: ${filters[key]}`
        });
    });
    selects.forEach(({ key, label, options }) =>
        (filters[key] as (string | number)[]).forEach(value => {
            const match = options.find(o => optId(o) === String(value));
            chips.push({ key, value, label: `${label}: ${match && typeof match === "object" ? match.name : value}` });
        })
    );

    return (
        <Box sx={{ minWidth: 0 }}>
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, mb: 1, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                    <Box sx={{ width: 42, height: 42, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "primary.main", color: "primary.contrastText" }}>
                        <TuneIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Search Filters</Typography>
                        <Typography variant="body2" color="text.secondary"> Find branches by keyword, creation date, or other criteria.</Typography>
                    </Box>
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 2, alignItems: "stretch", minWidth: 0 }}>
                    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "divider", minWidth: 0 }}>
                        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 }, "&:last-child": { pb: 2.5 } }}>
                            <Box sx={{ mb: 2 }}>
                                <MultiSelectAutoComplete
                                    label="Search Branch Code / Name"
                                    placeholder="Type branch code or select branch name..."
                                    options={[]}
                                    value={filters.search}
                                    disableSuggestions
                                    inputValue={filters.search}
                                    onInputChange={text => set({ search: text })}
                                    freeSolo
                                    disableClearable
                                    endAdornment={
                                        <Tooltip title="Search">
                                            <IconButton size="small" onClick={() => onApply(filters)}>
                                                <SearchIcon sx={{ color: "#fff", bgcolor: "#0f172a", width: 32, height: 32, borderRadius: "50%", p: 0.75 }} />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                    onChange={val => set({ search: val == null ? "" : Array.isArray(val) ? filters.search : typeof val === "object" ? val.name : String(val) })}
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onApply(filters); (e.target as HTMLElement).blur(); } }}
                                />
                            </Box>
                            <Box sx={{ ...gridStyle, mb: 2.5 }}>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    {datePicker("createdDateFrom", "Created Date From")}
                                    {datePicker("createdDateTo", "Created Date To")}
                                </LocalizationProvider>
                            </Box>
                            <Collapse in={showMoreFilters}>
                                <Box sx={{ ...gridStyle, mb: 2.5 }}>
                                    {selects.map(({ key, label, options }) => {
                                        const selected = (filters[key] as (string | number)[]).map(String);
                                        return (
                                            <MultiSelectAutoComplete key={key} label={label} multiple options={options}
                                                value={options.filter(o => selected.includes(optId(o)))}
                                                onChange={val => {
                                                    const ids = toIds(val);
                                                    set({ [key]: stringKeys.includes(key) ? ids.map(String) : ids } as Partial<BranchFilters>);
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </Collapse>
                        </CardContent>
                    </Card>
                    <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                        {renderBelowFilters}
                    </Box>
                </Box>
            </Paper>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.5fr) minmax(0, 1fr)" }, gap: 2, mt: 1, mb: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}
                    justifyContent="center" alignItems={{ xs: "stretch", sm: "center" }}>
                    <Button variant="contained" startIcon={<SearchIcon />} onClick={() => onApply(filters)} sx={{ bgcolor: "#17324d", "&:hover": { bgcolor: "#0f2032" } }}> Apply Filters </Button>
                    <Button variant="contained" startIcon={<FilterListIcon />} onClick={() => setShowMoreFilters(prev => !prev)}> {showMoreFilters ? "Less Filters" : "More Filters"} </Button>
                    <Button variant="contained" color="warning" startIcon={<ResetIcon />} onClick={onReset}> Reset </Button>
                </Stack>
            </Box>
            {renderChips?.(chips)}
        </Box>
    );
}