import { useLayoutEffect, useMemo, useRef } from "react";
import { Paper, Typography } from "@mui/material";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

type Props = {
    title: string;
    data: object[];
    categoryField: string;
    valueField: string;
    height?: number;
};

export default function PieChart({
    title, data, categoryField, valueField, height = 320
}: Props) {
    const ref = useRef<HTMLDivElement>(null);

    const rows = useMemo(() => {
        return data.map(item => {
            const row = item as Record<string, unknown>;
            return { category: String(row[categoryField] ?? ""), value: Number(row[valueField] ?? 0) };
        });
    }, [data, categoryField, valueField]);

    useLayoutEffect(() => {
        if (!ref.current || !rows.length) return;

        const root = am5.Root.new(ref.current);
        root.setThemes([am5themes_Animated.new(root)]);

        const chart = root.container.children.push(
            am5percent.PieChart.new(root, { innerRadius: am5.percent(55) })
        );

        const series = chart.series.push( am5percent.PieSeries.new(root, { categoryField: "category", valueField: "value" }) );
        series.data.setAll(rows);
        series.labels.template.setAll({ text: "{category}: {value}" });
        series.slices.template.setAll({ tooltipText: "{category}: {value}" });
        series.appear(800);

        return () => root.dispose();
    }, [rows]);

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}> {title} </Typography>
            {!rows.length ? (
                <Typography color="text.secondary" textAlign="center" py={5}> No chart data available. </Typography>
            ) : (
                <div ref={ref} style={{ width: "100%", height }} />
            )}
        </Paper>
    );
}