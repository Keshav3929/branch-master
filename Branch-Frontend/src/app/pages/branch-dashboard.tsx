import { useEffect, useState } from "react";
import { isCancel } from "axios";
import { Alert, Box, CircularProgress } from "@mui/material";
import { getAnalytics } from "../branchApi";
import type { BranchAnalytics } from "../branchApi";
import BranchHeader from "../../components/Header";
import ColumnChart from "../../components/ColumnChart";
import PieChart from "../../components/PieChart";
import GaugeChart from "../../components/GaugeChart";

export default function BranchDashboard() {
    const [analytics, setAnalytics] = useState<BranchAnalytics | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => { const controller = new AbortController();
        getAnalytics(controller.signal)
            .then(response => setAnalytics(response.data))
            .catch(error => {
                if (!isCancel(error)) setFailed(true);
            });
        return () => controller.abort();
    }, []);

    if (failed) { return <Alert severity="error">Failed to load dashboard data.</Alert>; }
    if (!analytics) { return (<Box sx={{ display: "flex", justifyContent: "center", p: 6 }}> <CircularProgress /> </Box> );}  return (
        <>
            <BranchHeader />
            <Box sx={{ display: "grid", gap: 2 }}>
                <ColumnChart
                    title="Monthly Branch Creations"
                    data={analytics.monthlyCreations}
                    categoryField="month"
                    valueFields={[{ field: "count", name: "Branches" }]}
                    drillDown
                />

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
                    <ColumnChart
                        title="Branches by Organization"
                        data={analytics.branchesByOrganization.map(item => ({
                            category: item.name,
                            count: item.count
                        }))}
                        categoryField="category"
                        valueFields={[{ field: "count", name: "Branches" }]}
                    />

                    <GaugeChart
                        title="Active Share"
                        value={
                            analytics.total
                                ? (analytics.active / analytics.total) * 100
                                : 0
                        }
                        max={100}
                        suffix="% Active"
                    />

                    <ColumnChart
                        title="Active vs Inactive by Region"
                        data={analytics.branchesByRegion.map(item => ({
                            category: item.name,
                            active: item.active,
                            inactive: item.inactive
                        }))}
                        categoryField="category"
                        valueFields={[
                            {
                                field: "active",
                                name: "Active",
                                color: 0x2e7d32
                            },
                            {
                                field: "inactive",
                                name: "Inactive",
                                color: 0xd32f2f
                            }
                        ]}
                        stacked
                    />

                    <PieChart
                        title="Branches by Type"
                        data={analytics.branchesByType.map(item => ({
                            category: item.name,
                            count: item.count
                        }))}
                        categoryField="category"
                        valueField="count"
                    />
                </Box>
            </Box>
        </>
    );
}