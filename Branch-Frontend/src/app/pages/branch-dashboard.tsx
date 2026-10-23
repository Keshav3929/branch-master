import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isCancel } from "axios";
import { Alert, Box, CircularProgress, Paper, Typography } from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import * as am5radar from "@amcharts/amcharts5/radar";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import { getCounts } from "../branchApi";
import type { Counts } from "../branchApi";
import BranchHeader from "../../components/Header";

const COLORS = { total: 0x1976d2, active: 0x2e7d32, inactive: 0xd32f2f };
const color = (key: keyof typeof COLORS) => am5.color(COLORS[key]);
type Build = (root: am5.Root, c: Counts) => void;

const barChart: Build = (root, c) => {
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false }));
    const data = (["total", "active", "inactive"] as const).map(key => ({
        category: key[0].toUpperCase() + key.slice(1), value: c[key], columnSettings: { fill: color(key) }
    }));
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: "category", renderer: am5xy.AxisRendererX.new(root, {}) }));
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { min: 0, renderer: am5xy.AxisRendererY.new(root, {}) }));
    const series = chart.series.push(am5xy.ColumnSeries.new(root, { xAxis, yAxis, valueYField: "value", categoryXField: "category" }));
    series.columns.template.setAll({ templateField: "columnSettings", tooltipText: "{categoryX}: {valueY}", cornerRadiusTL: 6, cornerRadiusTR: 6, width: am5.percent(60), strokeOpacity: 0 });
    xAxis.data.setAll(data);
    series.data.setAll(data);
    series.appear(800);
    chart.appear(800, 100);
};

const stackedChart: Build = (root, c) => {
    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, layout: root.verticalLayout }));
    const data = [{ category: "Branches", active: c.active, inactive: c.inactive }];
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: "category", renderer: am5xy.AxisRendererX.new(root, {}) }));
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { min: 0, renderer: am5xy.AxisRendererY.new(root, {}) }));
    (["active", "inactive"] as const).forEach(key => {
        const series = chart.series.push(am5xy.ColumnSeries.new(root, {
            name: key[0].toUpperCase() + key.slice(1), stacked: true, xAxis, yAxis,
            valueYField: key, categoryXField: "category", fill: color(key), stroke: color(key)
        }));
        series.columns.template.setAll({ tooltipText: "{name}: {valueY}", width: am5.percent(40) });
        series.data.setAll(data);
        series.appear(800);
    });
    xAxis.data.setAll(data);
    const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.p50, x: am5.p50 }));
    legend.data.setAll(chart.series.values);
};

const donutChart: Build = (root, c) => {
    const chart = root.container.children.push(am5percent.PieChart.new(root, { innerRadius: am5.percent(60), layout: root.verticalLayout }));
    const series = chart.series.push(am5percent.PieSeries.new(root, { valueField: "value", categoryField: "category", alignLabels: false }));
    series.get("colors")?.set("colors", [color("active"), color("inactive")]);
    series.data.setAll([{ category: "Active", value: c.active }, { category: "Inactive", value: c.inactive }]);
    series.children.push(am5.Label.new(root, { text: `${c.total}\nTotal`, centerX: am5.p50, centerY: am5.p50, textAlign: "center", fontSize: 24, fontWeight: "600" }));
    series.appear(1000, 100);
};

const gaugeChart: Build = (root, c) => {
    const pct = c.total ? Math.round((c.active / c.total) * 100) : 0;
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
    chart.radarContainer.children.push(am5.Label.new(root, { text: `${pct}% Active`, centerX: am5.p50, centerY: am5.p50, y: 60, fontSize: 22, fontWeight: "600" }));
};

function Chart({ title, counts, build }: { title: string; counts: Counts; build: Build }) {
    const ref = useRef<HTMLDivElement>(null);
    const [failed, setFailed] = useState("");
    useLayoutEffect(() => {
        const root = am5.Root.new(ref.current as HTMLDivElement);
        try {
            root.setThemes([am5themes_Animated.new(root)]);
            build(root, counts);
        } catch (e) { setFailed((e as Error).message); }
        return () => root.dispose();
    }, [build, counts]);
    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{title}</Typography>
            {failed && <Alert severity="error">{failed}</Alert>}
            <div ref={ref} style={{ width: "100%", height: 320 }} />
        </Paper>
    );
}

export default function BranchDashboard() {
    const [counts, setCounts] = useState<Counts | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        getCounts({}, controller.signal).then(({ data }) => setCounts(data)).catch(e => { if (!isCancel(e)) setFailed(true); });
        return () => controller.abort();
    }, []);
    if (failed) return <Alert severity="error">Failed to load dashboard data.</Alert>;
    if (!counts) return <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}><CircularProgress /></Box>;

    const tiles = [
        { label: "Total Branches", count: counts.total, cls: "stat-card-total", icon: <StorageIcon /> },
        { label: "Active", count: counts.active, cls: "stat-card-active", icon: <CheckCircleIcon /> },
        { label: "Inactive", count: counts.inactive, cls: "stat-card-inactive", icon: <CancelIcon /> }
    ];
    return (
        <>
            <BranchHeader />
            <Box sx={{ display: "grid", gap: 2 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1 }}>
                    {tiles.map(t => (
                        <Paper key={t.label} className={`stat-card ${t.cls}`} elevation={0}>
                            <span className="stat-label">{t.icon} {t.label}</span>
                            <span className="stat-count">{t.count}</span>
                        </Paper>
                    ))}
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
                    <Chart title="Branches Overview" counts={counts} build={barChart} />
                    <Chart title="Active Share" counts={counts} build={gaugeChart} />
                    <Chart title="Active vs Inactive (stacked)" counts={counts} build={stackedChart} />
                    <Chart title="Status Split" counts={counts} build={donutChart} />
                </Box>
            </Box>
        </>
    );
}