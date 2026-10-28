import { useLayoutEffect, useRef } from "react";
import { Paper, Typography } from "@mui/material";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import * as am5radar from "@amcharts/amcharts5/radar";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

type Props = {
    title: string;
    value: number;
    max?: number;
    suffix?: string;
    height?: number;
};

export default function GaugeChart({
    title, value, max = 100, suffix = "", height = 320
}: Props) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!ref.current) return;
        const root = am5.Root.new(ref.current);
        root.setThemes([am5themes_Animated.new(root)]);

        const chart = root.container.children.push(
            am5radar.RadarChart.new(root, { panX: false, panY: false, startAngle: 160, endAngle: 380, innerRadius: -20 })
        );

        const renderer = am5radar.AxisRendererCircular.new(root, { innerRadius: -10, strokeOpacity: 0.1 });
        renderer.grid.template.set("visible", false);

        const axis = chart.xAxes.push(
            am5xy.ValueAxis.new(root, { min: 0, max, strictMinMax: true, maxDeviation: 0, renderer })
        );

        const ranges = max === 100
            ? [
                { start: 0, end: 40, color: 0xd32f2f },
                { start: 40, end: 70, color: 0xf9a825 },
                { start: 70, end: 100, color: 0x2e7d32 }
            ]
            : [
                { start: 0, end: max / 3, color: 0xd32f2f },
                { start: max / 3, end: (max * 2) / 3, color: 0xf9a825 },
                { start: (max * 2) / 3, end: max, color: 0x2e7d32 }
            ];

        ranges.forEach(({ start, end, color }) => {
            const range = axis.createAxisRange(axis.makeDataItem({ value: start, endValue: end }));
            range.get("axisFill")?.setAll({ visible: true, fill: am5.color(color), fillOpacity: 0.85 });
            range.get("label")?.set("forceHidden", true);
        });
        const safeValue = Math.max(0, Math.min(value, max));
        const handItem = axis.makeDataItem({ value: 0 });

        handItem.set("bullet",
            am5xy.AxisBullet.new(root, { sprite: am5radar.ClockHand.new(root, { radius: am5.percent(95), pinRadius: 16, bottomWidth: 24 }) })
        );

        axis.createAxisRange(handItem);
        handItem.animate({ key: "value", to: safeValue, duration: 1200, easing: am5.ease.out(am5.ease.cubic) });

        chart.radarContainer.children.push(
            am5.Label.new(root, { text: `${Math.round(safeValue)}${suffix}`, centerX: am5.p50, centerY: am5.p50, y: 60, fontSize: 22, fontWeight: "600" })
        );

        return () => root.dispose();
    }, [value, max, suffix]);

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}> {title} </Typography>
            <div ref={ref} style={{ width: "100%", height }} />
        </Paper>
    );
}