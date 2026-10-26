import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isCancel } from "axios";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import * as am5radar from "@amcharts/amcharts5/radar";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import { getAnalytics } from "../branchApi";
import type { Counts, BranchAnalytics } from "../branchApi";
import BranchHeader from "../../components/Header";

const COLORS = { total: 0x1976d2, active: 0x2e7d32, inactive: 0xd32f2f };
const color = (key: keyof typeof COLORS) => am5.color(COLORS[key]);

type Build = (root: am5.Root, counts: Counts) => void;
type AnalyticsBuild = (root: am5.Root, data: BranchAnalytics) => void;
type ChartType = "counts" | "analytics";
type TrendLevel = "year" | "month" | "day";

const barChart: AnalyticsBuild = (root, data) => {
    const chart = root.container.children.push(am5xy.XYChart.new(root, {}));
    const rows = data.branchesByOrganization.map(item => ({ category: item.name, value: item.count }));
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: "category", renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 30 }) }));
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { min: 0, renderer: am5xy.AxisRendererY.new(root, {}) }));
    const series = chart.series.push(am5xy.ColumnSeries.new(root, { xAxis, yAxis, valueYField: "value", categoryXField: "category" }));
    series.columns.template.setAll({ tooltipText: "{categoryX}: {valueY}", cornerRadiusTL: 5, cornerRadiusTR: 5, width: am5.percent(60), strokeOpacity: 0 });
    xAxis.data.setAll(rows);
    series.data.setAll(rows);
    series.appear(800);
};

const stackedChart: AnalyticsBuild = (root, data) => {
    const chart = root.container.children.push(am5xy.XYChart.new(root, {}));
    const rows = data.branchesByRegion.map(item => ({ category: item.name, active: item.active, inactive: item.inactive }));
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: "category", renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 30 }) }));
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { min: 0, renderer: am5xy.AxisRendererY.new(root, {}) }));
    (["active", "inactive"] as const).forEach(key => {
        const series = chart.series.push(am5xy.ColumnSeries.new(root, { name: key === "active" ? "Active" : "Inactive", xAxis, yAxis, stacked: true, valueYField: key, categoryXField: "category", fill: color(key), stroke: color(key) }));
        series.columns.template.setAll({ tooltipText: "{name}: {valueY}" });
        series.data.setAll(rows);
    });
    xAxis.data.setAll(rows);
    const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50 }));
    legend.data.setAll(chart.series.values);
};

const donutChart: AnalyticsBuild = (root, data) => {
    const chart = root.container.children.push(am5percent.PieChart.new(root, { innerRadius: am5.percent(55) }));
    const series = chart.series.push(am5percent.PieSeries.new(root, { valueField: "value", categoryField: "category" }));
    series.data.setAll(data.branchesByType.map(item => ({ category: item.name, value: item.count })));
    series.labels.template.setAll({ text: "{category}: {value}" });
    series.slices.template.setAll({ tooltipText: "{category}: {value}" });
    series.appear(800);
};

const gaugeChart: Build = (root, counts) => {
    const pct = counts.total ? Math.round((counts.active / counts.total) * 100) : 0;
    const chart = root.container.children.push(am5radar.RadarChart.new(root, { panX: false, panY: false, startAngle: 160, endAngle: 380, innerRadius: -20 }));
    const renderer = am5radar.AxisRendererCircular.new(root, { innerRadius: -10, strokeOpacity: 0.1 });
    renderer.grid.template.set("visible", false);
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { maxDeviation: 0, min: 0, max: 100, strictMinMax: true, renderer }));
    ([[0, 40, 0xd32f2f], [40, 70, 0xf9a825], [70, 100, 0x2e7d32]] as const).forEach(([value, endValue, fill]) => {
        const range = xAxis.createAxisRange(xAxis.makeDataItem({ value, endValue }));
        range.get("axisFill")?.setAll({ visible: true, fill: am5.color(fill), fillOpacity: 0.85 });
        range.get("label")?.set("forceHidden", true);
    });
    const handItem = xAxis.makeDataItem({ value: 0 });
    handItem.set("bullet", am5xy.AxisBullet.new(root, { sprite: am5radar.ClockHand.new(root, { radius: am5.percent(95), pinRadius: 16, bottomWidth: 24 }) }));
    xAxis.createAxisRange(handItem);
    handItem.animate({ key: "value", to: pct, duration: 1200, easing: am5.ease.out(am5.ease.cubic) });
    chart.radarContainer.children.push(am5.Label.new(root, { text: `${pct}% Active`, centerX: am5.p50, centerY: am5.p50, y: 60, fontSize: 22, fontWeight: "600" })
    );
};

function Chart({ title, type, counts, analytics, build
}: {
    title: string; type: ChartType; counts?: Counts; analytics?: BranchAnalytics; build: Build | AnalyticsBuild;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!ref.current) return;
        const root = am5.Root.new(ref.current);
        root.setThemes([am5themes_Animated.new(root)]);
        if (type === "counts" && counts) {
            (build as Build)(root, counts);
        } else if (type === "analytics" && analytics) { (build as AnalyticsBuild)(root, analytics); }
        return () => root.dispose();
    }, [type, counts, analytics, build]);
    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{title}</Typography>
            <div ref={ref} style={{ width: "100%", height: 320 }} />
        </Paper>
    );
}

function CreationTrendChart({ data }: { data: BranchAnalytics["monthlyCreations"] }) {
    const ref = useRef<HTMLDivElement>(null);
    const [level, setLevel] = useState<TrendLevel>("year");
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const rows = (() => {
        const grouped = new Map<string, number>();
        const prefix = `${year}-${String(month).padStart(2, "0")}`;
        data.forEach(item => { const date = item.month;
            let key: string;
            if (level === "year") {
                key = date.slice(0, 4);
            } else if (level === "month") {
                if (!date.startsWith(`${year}-`)) return;
                key = date.slice(0, 7);
            } else {
                if (!date.startsWith(`${prefix}-`)) return;
                key = date.slice(8, 10);
            } grouped.set(key, (grouped.get(key) ?? 0) + item.count);
        });
        return Array.from(grouped, ([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));
    })();

    useLayoutEffect(() => { if (!ref.current || !rows.length) return;
        const root = am5.Root.new(ref.current);
        root.setThemes([am5themes_Animated.new(root)]);
        const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false }));
        const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });
        xRenderer.labels.template.setAll({ rotation: -35, centerY: am5.p50, centerX: am5.p100, paddingRight: 10 });
        const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: "month", renderer: xRenderer }));
        const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { min: 0, renderer: am5xy.AxisRendererY.new(root, {}) }));
        const series = chart.series.push(am5xy.ColumnSeries.new(root, { xAxis, yAxis, categoryXField: "month", valueYField: "count", tooltip: am5.Tooltip.new(root, { labelText: "{categoryX}: {valueY}" }) }));
        series.columns.template.setAll({ cornerRadiusTL: 4, cornerRadiusTR: 4 });
        if (level !== "day") {
            series.columns.template.setAll({ cursorOverStyle: "pointer" });
            series.columns.template.events.on("click", event => {
                const row = event.target.dataItem?.dataContext as { month: string } | undefined;
                if (!row) return;
                if (level === "year") {
                    setYear(Number(row.month));
                    setLevel("month");
                } else {
                    const [selectedYear, selectedMonth] = row.month.split("-").map(Number);
                    setYear(selectedYear);
                    setMonth(selectedMonth);
                    setLevel("day");
                }
            });
        }
        xAxis.data.setAll(rows);
        series.data.setAll(rows);
        series.appear(800);
        return () => root.dispose();
    }, [rows, level]);

    const goBack = () => {
        if (level === "day") setLevel("month");
        else if (level === "month") setLevel("year");
    };
    const title = level === "year" ? "Monthly Branch Creations" : level === "month" ? `Branch Creations in ${year}` : `Daily Creations — ${year}-${String(month).padStart(2, "0")}`;
    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, gridColumn: { xs: "auto", sm: "1 / -1", lg: "span 2" } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>{title}</Typography>
                {level !== "year" && <Button size="small" onClick={goBack}>Back</Button>}
            </Box>
            {!rows.length ? (
                <Typography color="text.secondary" textAlign="center" py={5}>
                    No branch creation data available.
                </Typography>
            ) : (
                <div ref={ref} style={{ width: "100%", height: 320 }} />
            )}
        </Paper>
    );
}

export default function BranchDashboard() {
    const [analytics, setAnalytics] = useState<BranchAnalytics | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        getAnalytics(controller.signal)
            .then(response => setAnalytics(response.data))
            .catch(error => { if (!isCancel(error)) setFailed(true); });
        return () => controller.abort();
    }, []);

    if (failed) { return <Alert severity="error">Failed to load dashboard data.</Alert>; }
    if (!analytics) { return (<Box sx={{ display: "flex", justifyContent: "center", p: 6 }}> <CircularProgress /> </Box>); }

    const counts: Counts = {
        total: analytics.total,
        active: analytics.active,
        inactive: analytics.inactive
    };

    const tiles = [
        { label: "Total Branches", count: counts.total, cls: "stat-card-total", icon: <StorageIcon /> },
        { label: "Active", count: counts.active, cls: "stat-card-active", icon: <CheckCircleIcon /> },
        { label: "Inactive", count: counts.inactive, cls: "stat-card-inactive", icon: <CancelIcon /> }
    ];

    return (
        <>
            <BranchHeader />
            <Box sx={{ display: "grid", gap: 2 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: 1 }}>
                    {tiles.map(tile => (
                        <Paper key={tile.label} className={`stat-card ${tile.cls}`} elevation={0}>
                            <span className="stat-label"> {tile.icon} {tile.label} </span>
                            <span className="stat-count">{tile.count}</span>
                        </Paper>
                    ))}
                    <CreationTrendChart data={analytics.monthlyCreations} />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
                    <Chart title="Branches by Organization" type="analytics" analytics={analytics} build={barChart} />
                    <Chart title="Active Share" type="counts" counts={counts} build={gaugeChart} />
                    <Chart title="Active vs Inactive by Region" type="analytics" analytics={analytics} build={stackedChart} />
                    <Chart title="Branches by Type" type="analytics" analytics={analytics} build={donutChart} />
                </Box>
            </Box>
        </>
    );
}