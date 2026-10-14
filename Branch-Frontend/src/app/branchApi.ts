import axios from "axios";

const API_URL = "http://localhost:8081/branch";

export interface BranchQuery {
    page?: number;
    size?: number;
    sort?: string;
}

export interface BranchSearchRequest {
    search?: string;
    branchType?: string[];
    organizationId?: number[];
    regionId?: number[];
    countryId?: number[];
    status?: boolean;
    createdDateFrom?: string;
    createdDateTo?: string;
}

export const saveBranch = (data: object) => axios.post(`${API_URL}/save`, data);

export const saveBranches = (data: object[]) => axios.post(`${API_URL}/save-multiple`, data);

export const getBranches = (params?: BranchQuery) => axios.get(`${API_URL}/list`, { params });

export const searchBranches = (data: BranchSearchRequest, params?: BranchQuery) => axios.post(`${API_URL}/search`, data, { params });

export const getBranchById = (id: number) => axios.get(`${API_URL}/${id}`);

export const getBranchHistory = (id: number) => axios.get(`${API_URL}/history/${id}`);

export const updateBranch = (data: object) => axios.put(`${API_URL}/update`, data);

export const deleteBranch = (id: number) => axios.delete(`${API_URL}/delete/${id}`);
