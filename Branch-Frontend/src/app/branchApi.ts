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
export interface BranchAnalytics extends Counts {
    branchesByRegion: { name: string; active: number; inactive: number }[];
    branchesByType: { name: string; count: number }[];
    branchesByOrganization: { name: string; count: number }[];
    monthlyCreations: { month: string; count: number }[];
}

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

export const getAnalytics = (signal?: AbortSignal) =>
    axios.get<BranchAnalytics>("branch/analytics", { signal });

//---------------------------------------------------//

export interface Session { token: string; username: string; role: "ADMIN" | "USER" }
const SESSION_KEYS = ["token", "username", "role"] as const;
const notifyAuthChanged = () => window.dispatchEvent(new Event("branch-auth-changed"));

export const getSession = (): Session | null => {
    const [token, username, role] = SESSION_KEYS.map(k => sessionStorage.getItem(k));
    return token && username && (role === "ADMIN" || role === "USER") ? { token, username, role } : null;
};
export const saveSession = (s: Session) => {
    SESSION_KEYS.forEach(k => sessionStorage.setItem(k, s[k]));
    sessionStorage.removeItem("switching");
    notifyAuthChanged();
};
// switching = true is "Change account": same as logout, but the login page says so.
export const signOut = (switching = false) => {
    SESSION_KEYS.forEach(k => sessionStorage.removeItem(k));
    if (switching) sessionStorage.setItem("switching", "1");
    notifyAuthChanged();
};

// Every request carries the token. An expired or invalid token (401) logs the user out.
axios.interceptors.request.use(config => {
    const token = sessionStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
axios.interceptors.response.use(response => response, error => {
    if (isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.startsWith("auth/")) signOut();
    return Promise.reject(error);
});

type Credentials = { username: string; password: string };
export const login = (body: Credentials) => axios.post<Session>("auth/login", body);
export const register = (body: Credentials) => axios.post<Session>("auth/register", body);