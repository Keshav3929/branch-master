export const parseIdList = (raw: string | null | undefined): string[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
    } catch { }
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
};

export const splitCsv = (s: string | null | undefined): string[] =>
    s ? s.split(",").filter(Boolean) : [];

export const nameOf = (
    options: { id: number | string; name: string }[],
    id: number | string | null | undefined
): string =>
    id === null || id === undefined
        ? "-"
        : options.find((o) => String(o.id) === String(id))?.name ?? String(id);

interface PayloadSource {
    workingHoursId: string;
    contactPerson: string;
    mobile: string | null;
    latitude: string;
    longitude: string;
    departmentIds: string;
    serviceIds: string;
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