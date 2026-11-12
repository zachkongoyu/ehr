"use client";
import {
  DonutChart,
  DonutChartPlot,
  DonutChartCenter,
  DonutChartLegend,
} from "@/components/charts/donut-chart";
import type { Locale } from "@/lib/locale-shared";

export function ClinicStatus({
  statuses,
  locale,
}: {
  statuses: { status: string; count: number }[];
  locale: Locale;
}) {
  const en = locale === "en";
  const definitions = [
    { id: "finished", name: en ? "Completed" : "已完成", color: "#22a06b" },
    {
      id: "in-progress",
      name: en ? "In progress" : "診症中",
      color: "#3275f6",
    },
    { id: "planned", name: en ? "Planned" : "已計劃", color: "#a6beed" },
    { id: "cancelled", name: en ? "Cancelled" : "已取消", color: "#c8ced9" },
  ];
  const segments = definitions.map((item) => ({
    ...item,
    value: statuses.find((row) => row.status === item.id)?.count ?? 0,
  }));
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{en ? "Today's visit status" : "今日就診狀態"}</h2>
      </div>
      <div className="status-chart-box">
        {total ? (
          <DonutChart
            segments={segments}
            label={en ? "Status of visits started today" : "今日開始的就診狀態"}
            labels={en ? undefined : { total: "就診", label: "就診狀態" }}
          >
            <div className="status-ring">
              <DonutChartPlot>
                <DonutChartCenter
                  totalLabel={en ? "Visits today" : "今日就診"}
                />
              </DonutChartPlot>
            </div>
            <DonutChartLegend />
          </DonutChart>
        ) : (
          <p className="empty-copy">
            {en ? "No visits started today." : "今日尚未有就診。"}
          </p>
        )}
        <p className="chart-helper">
          {en
            ? "Visits started today · Hong Kong time"
            : "今日開始的就診 · 香港時間"}
        </p>
      </div>
    </section>
  );
}
