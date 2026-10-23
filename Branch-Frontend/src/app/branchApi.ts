import axios, { isAxiosError } from "axios";

axios.defaults.baseURL = "http://localhost:8081";
axios.defaults.paramsSerializer = { indexes: null };

export interface BranchQuery { page?: number; size?: number; sort?: string }
export interface BranchSearchRequest {
    search?: string; branchType?: string[];
    organizationId?: (string | number)[]; regionId?: (string | number)[]; countryId?: (string | number)[];
    status?: boolean; createdDateFrom?: string; createdDateTo?: string;
}
export interface DropdownOption { id: number; name: string }
export interface DropdownOptions {
    organizations: DropdownOption[]; branchTypes: string[]; regions: DropdownOption[]; countries: DropdownOption[];
    states: DropdownOption[]; cities: DropdownOption[]; contactPersons: DropdownOption[]; workingHours: DropdownOption[];
}
export interface Counts { total: number; active: number; inactive: number }
export interface BranchNotification {
    id: number; operation: string; branchId: number | null; branchCode: string | null;
    branchName: string | null; message: string; seen: boolean; createdAt: string;
}
export interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; number: number }

export const getDropdownOptions = () => axios.get<DropdownOptions>("branch/dropdown-options");

export const saveBranches = (branches: object[], validateOnly = false) =>
    axios.post("branch/save-multiple", branches, { params: validateOnly ? { validateOnly } : undefined });

export const getBranches = (params?: BranchQuery, signal?: AbortSignal) => axios.get("branch/list", { params, signal });

export const searchBranches = (filters: BranchSearchRequest, page?: BranchQuery, signal?: AbortSignal) =>
    axios.get("branch/search", { params: { ...filters, ...page }, signal });

export const getCounts = (params: Pick<BranchSearchRequest, "createdDateFrom" | "createdDateTo">, signal?: AbortSignal) =>
    axios.get<Counts>("branch/counts", { params, signal });

export const getBranchHistory = (id: number) => axios.get(`branch/history/${id}`);

export const updateBranch = (data: object) => axios.put("branch/update", data);

export const deleteBranch = (id: number) => axios.delete(`branch/delete/${id}`);

export const getBranchTemplate = () => axios.get("branch/template", { responseType: "blob" });

export const getNotifications = (page = 0, size = 5) =>
    axios.get<PageResult<BranchNotification>>("notifications", { params: { page, size } });

export const markNotificationSeen = (id: number) => axios.put(`notifications/${id}/seen`);

export const markAllNotificationsSeen = () => axios.put("notifications/seen-all");

export const getUnreadCount = () => axios.get<number>("notifications/unread-count");

export const parseApiError = (err: unknown) => {
    const d = isAxiosError(err) ? err.response?.data : undefined;
    return {
        message: (typeof d === "string" ? d : d?.message) as string | undefined,
        fields: (d?.errors ?? {}) as Record<string, string>,
        invalidRows: d?.invalidRows as { row: number; errors: string[] }[] | undefined
    };
};
export const getErrorMessage = (err: unknown, fallback: string) => parseApiError(err).message ?? fallback;