import { isAxiosError } from "axios";

export const NA = "N/A";

export const parseIdList = (raw: string | null | undefined): string[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* not JSON */ }
    return raw.split(",").map(s => s.trim()).filter(Boolean);
};

export const splitCsv = (s: string | null | undefined): string[] => (s ? s.split(",").filter(Boolean) : []);
export const joinCsv = (v: unknown) => (Array.isArray(v) ? v : v == null ? [] : [v]).map(String).join(",");
export const orUndef = <T,>(a: T[]) => (a.length ? a : undefined);

export const pickId = (v: unknown): number | null =>
    v && typeof v === "object" && !Array.isArray(v) && "id" in v ? Number(v.id) : null;

export const nameOf = (options: { id: number | string; name: string }[], id: number | string | null | undefined): string =>
    id == null ? NA : options.find(o => String(o.id) === String(id))?.name ?? String(id);

// reads plain-text bodies (e.g. 409 "Branch name already exists...") and JSON bodies
export const getErrorMessage = (err: unknown, fallback: string): string => {
    if (!isAxiosError(err)) return fallback;
    const d = err.response?.data;
    return (typeof d === "string" && d.trim()) || d?.message || d?.error || d?.detail || fallback;
};

interface PayloadSource {
    workingHoursId: string; contactPerson: string; mobile: string | null;
    latitude: string; longitude: string; departmentIds: string; serviceIds: string;
}

export const toPayload = <T extends PayloadSource>(f: T) => ({
    ...f,
    workingHoursId: f.workingHoursId ? Number(f.workingHoursId) : null,
    contactPerson: f.contactPerson ? Number(f.contactPerson) : null,
    mobile: f.mobile || null,
    latitude: f.latitude !== "" ? Number(f.latitude) : null,
    longitude: f.longitude !== "" ? Number(f.longitude) : null,
    departmentIds: JSON.stringify(splitCsv(f.departmentIds)),
    serviceIds: JSON.stringify(splitCsv(f.serviceIds))
});