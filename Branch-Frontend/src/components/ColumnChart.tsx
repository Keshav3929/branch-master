import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

type ChartRow = Record<string, unknown>;

type ValueField = {
    field: string;
    name: string;
    color?: number;
};

type Props = {
    title: string;
    data: object[];
    categoryField: string;
    valueFields: ValueField[];
    stacked?: boolean;
    drillDown?: boolean;
    height?: number;
};

type TrendLevel = "year" | "month" | "day";

export default function ColumnChart({
    title, data, categoryField, valueFields, stacked = false, drillDown = false, height = 320
}: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [level, setLevel] = useState<TrendLevel>("year");
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const rows = useMemo<ChartRow[]>(() => {
        const source = data as ChartRow[];

        if (!drillDown) {
            return source.map(item => ({ ...item, category: String(item[categoryField] ?? "") }));
        }

        const grouped = new Map<string, number>();
        const prefix = `${year}-${String(month).padStart(2, "0")}`;
        const countField = valueFields[0]?.field ?? "count";

        source.forEach(item => {
            const date = String(item[categoryField] ?? "");
            let key: string;

            if (level === "year") {
                key = date.slice(0, 4);
            } else if (level === "month") {
                if (!date.startsWith(`${year}-`)) return;
                key = date.slice(0, 7);
            } else {
                if (!date.startsWith(`${prefix}-`)) return;
                key = date.slice(8, 10);
            }

            const count = Number(item[countField] ?? 0);
            grouped.set(key, (grouped.get(key) ?? 0) + count);
        });

        return Array.from(grouped, ([category, count]) => ({
            category, [countField]: count
        })).sort((a, b) => a.category.localeCompare(b.category));
    }, [data, categoryField, valueFields, drillDown, level, year, month]);

    const chartTitle = !drillDown
        ? title
        : level === "year"
            ? title
            : level === "month"
                ? `Branch Creations in ${year}`
                : `Daily Creations — ${year}-${String(month).padStart(2, "0")}`;

    const buildChart = useCallback(() => {
        if (!ref.current || !rows.length) return;

        const root = am5.Root.new(ref.current);
        root.setThemes([am5themes_Animated.new(root)]);

        const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false }));
        const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });

        xRenderer.labels.template.setAll({ rotation: -35, centerY: am5.p50, centerX: am5.p100, paddingRight: 10 });
        const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: "category", renderer: xRenderer }));
        const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { min: 0, renderer: am5xy.AxisRendererY.new(root, {}) }));

        valueFields.forEach(field => {
            const tooltip = am5.Tooltip.new(root, { labelText: "{categoryX} : {valueY}", pointerOrientation: "horizontal" });
            const series = chart.series.push( am5xy.ColumnSeries.new(root, { name: field.name, xAxis, yAxis, categoryXField: "category", valueYField: field.field, stacked, tooltip, ...(field.color !== undefined ? { fill: am5.color(field.color), stroke: am5.color(field.color) } : {}) }) );

            series.columns.template.setAll({ tooltipText: "{categoryX} : {valueY}", cornerRadiusTL: 4, cornerRadiusTR: 4, ...(drillDown && level !== "day" ? { cursorOverStyle: "pointer" as const } : {})});
            series.columns.template.setAll({ cornerRadiusTL: 4, cornerRadiusTR: 4, ...(drillDown && level !== "day" ? { cursorOverStyle: "pointer" as const } : {}) });
            if (drillDown && level !== "day") {
                series.columns.template.events.on("click", event => {
                    const row = event.target.dataItem?.dataContext as | ChartRow | undefined;
                    if (!row) return;
                    const category = String(row.category ?? "");
                    if (level === "year") {
                        setYear(Number(category));
                        setLevel("month");
                    } else {
                        const [selectedYear, selectedMonth] =
                            category.split("-").map(Number);
                        setYear(selectedYear);
                        setMonth(selectedMonth);
                        setLevel("day");
                    }
                });
            }
            series.data.setAll(rows);
            series.appear(800);
        });
        xAxis.data.setAll(rows);
        if (valueFields.length > 1) {
            const legend = chart.children.push(
                am5.Legend.new(root, { centerX: am5.p50, x: am5.p50 })
            );
            legend.data.setAll(chart.series.values);
        }
        return () => root.dispose();
    }, [rows, valueFields, stacked, drillDown, level]);

    useLayoutEffect(() => buildChart(), [buildChart]);

    const goBack = () => {
        if (level === "day") {
            setLevel("month");
        } else if (level === "month") {
            setLevel("year");
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}> {chartTitle} </Typography>
                {drillDown && level !== "year" && (<Button size="small" onClick={goBack}> Back </Button>)}
            </Box>
            {!rows.length ? (
                <Typography color="text.secondary" textAlign="center" py={5}> No chart data available. </Typography>
            ) : (
                <div ref={ref} style={{ width: "100%", height }} />
            )}
        </Paper>
    );
}