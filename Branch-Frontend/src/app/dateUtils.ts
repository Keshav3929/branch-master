import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { NA } from "./branchUtils";

dayjs.extend(customParseFormat);

export const today = () => dayjs().startOf("day");

export const parseDate = (v: string): Dayjs | null => {
    const d = dayjs(v, "DD-MM-YYYY", true);
    return v && d.isValid() ? d.startOf("day") : null;
};

export const formatDate = (d: Dayjs) => d.format("DD-MM-YYYY");

// DD-MM-YYYY (UI) -> YYYY-MM-DD (API)
export const toIso = (v: string) => parseDate(v)?.format("YYYY-MM-DD");

export const formatDateTime = (v?: string | null) =>
    v && dayjs(v).isValid() ? dayjs(v).format("DD/MM/YYYY hh:mm A") : NA;