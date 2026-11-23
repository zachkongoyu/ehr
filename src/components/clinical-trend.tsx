"use client";
import { useState } from "react";
import {
  LineChart,
  LineChartPlot,
  LineChartTooltip,
  LineChartLegend,
} from "@/components/charts/line-chart";
import type { VisitView } from "@/lib/chart";
import { intlLocale, type Locale } from "@/lib/locale-shared";

export function ClinicalTrend({
  visits,
  locale,
}: {
  visits: Pick<VisitView, "id" | "started_at" | "vitals">[];
  locale: Locale;
}) {
  const [metric, setMetric] = useState("blood-pressure");
  const en = locale === "en";
  const choices = [
    {
      id: "blood-pressure",
      name: en ? "Blood pressure" : "血壓",
      unit: "mmHg",
      series: [
        { id: "systolic", name: en ? "Systolic" : "收縮壓", color: "#3275f6" },
        {
          id: "diastolic",
          name: en ? "Diastolic" : "舒張壓",
          color: "#9cbcff",
        },
      ],
    },
    {
      id: "weight",
      name: en ? "Weight" : "體重",
      unit: "kg",
      series: [
        { id: "weight", name: en ? "Weight" : "體重", color: "#3275f6" },
      ],
    },
    {
      id: "pulse",
      name: en ? "Pulse" : "脈搏",
      unit: "/min",
      series: [{ id: "pulse", name: en ? "Pulse" : "脈搏", color: "#3275f6" }],
    },
  ];
  const choice = choices.find((item) => item.id === metric)!;
  const recorded = visits
    .filter((visit) =>
      choice.series.some((series) =>
        visit.vitals.some((vital) => vital.code === series.id),
      ),
    )
    .toSorted((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))
    .slice(-12);
  const date = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "Asia/Hong_Kong",
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
  const categories = recorded.map(
    (visit) => `${date.format(new Date(visit.started_at))} · #${visit.id}`,
  );
  const series = choice.series.map((item) => ({
    ...item,
    values: recorded.map(
      (visit) =>
        visit.vitals.find((vital) => vital.code === item.id)?.value ?? null,
    ),
  }));
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{en ? "Vital trends" : "生命表徵趨勢"}</h2>
        <label>
          <span className="sr-only">
            {en ? "Choose measurement" : "選擇指標"}
          </span>
          <select
            className="trend-select"
            value={metric}
            onChange={(event) => setMetric(event.target.value)}
          >
            {choices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="chart-box">
        <p className="chart-helper">
          {en
            ? "Recorded measurements across the last 12 visits with data. Gaps mean no measurement was recorded."
            : "最近12次有數據的就診量度記錄。空白代表未有記錄。"}{" "}
          · {choice.unit}
        </p>
        {recorded.length ? (
          <LineChart
            series={series}
            categories={categories}
            curve="linear"
            label={choice.name}
            formatValue={(value) => `${value} ${choice.unit}`}
            labels={
              en
                ? undefined
                : {
                    noData: "沒有數據",
                    missing: "未有記錄",
                    dataCaption: "{label}數據",
                    category: "就診",
                    series: "指標",
                    total: "總計",
                    inspect: "{label}：查看數據",
                    seriesValue: "{name} {value}",
                  }
            }
          >
            <LineChartPlot height={190} fadeEdges={false} />
            <LineChartTooltip />
            <LineChartLegend />
          </LineChart>
        ) : (
          <p className="empty-copy">
            {en
              ? "No measurements recorded for this indicator."
              : "此指標尚未有量度記錄。"}
          </p>
        )}
      </div>
    </section>
  );
}
