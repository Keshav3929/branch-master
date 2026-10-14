import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { searchBranches, getBranches } from "../app/branchApi";
import type { Branch, } from "../types/branchSchema";
import type { BranchQuery, BranchSearchRequest } from "../app/branchApi";

interface BranchState {
    branches: Branch[];
    totalElements: number;
    loading: boolean;
    error: string | null;
}

const initialState: BranchState = { branches: [], totalElements: 0, loading: false, error: null};

export const hasFilters = (f: BranchSearchRequest) => Object.entries(f).some(([key, value]) => {
        if (value === undefined || value === null || value === "") return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    });

export const fetchBranches = createAsyncThunk(
    "branch/fetchBranches",
    async ({ filters, page }: { filters: BranchSearchRequest; page: BranchQuery }) => {
        const { data } = hasFilters(filters) ? await searchBranches(filters, page) : await getBranches(page);
        return {
            content: data?.content ?? [],
            totalElements: data?.totalElements ?? 0
        };
    }
);

const branchSlice = createSlice({ name: "branch", initialState, reducers: {}, 
    extraReducers: builder => builder
        .addCase(fetchBranches.pending, state => {
            state.loading = true;
            state.error = null;
        })
        .addCase(fetchBranches.fulfilled, (state, action) => {
            state.loading = false;
            state.branches = action.payload.content;
            state.totalElements = action.payload.totalElements;
        })
        .addCase(fetchBranches.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || "Failed to load branches";
        })
});

export default branchSlice.reducer;