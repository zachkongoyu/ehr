"use client";
import {
  BarChart,
  BarChartPlot,
  BarChartTooltip,
} from "@/components/charts/bar-chart";
import { intlLocale, type Locale } from "@/lib/locale-shared";

export function ClinicVolume({
  months,
  locale,
}: {
  months: { month: string; visits: number }[];
  locale: Locale;
}) {
  const en = locale === "en";
  const date = new Intl.DateTimeFormat(intlLocale(locale), {
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Hong_Kong",
  });
  return (
    <section className="panel clinic-volume">
      <div className="panel-heading">
        <h2>{en ? "Consultation activity" : "診症活動"}</h2>
        <span className="muted">{en ? "Past 6 months" : "最近6個月"}</span>
      </div>
      <div className="chart-box">
        <p className="chart-helper">
          {en
            ? "Visits started each month, excluding cancelled visits. Current month is in progress."
            : "每月開始的就診次數，不包括已取消就診。本月仍未完結。"}
        </p>
        <BarChart
          categories={months.map((row) =>
            date.format(new Date(row.month + "T00:00:00+08:00")),
          )}
          series={[
            {
              id: "visits",
              name: en ? "Visits" : "就診",
              color: "#3275f6",
              values: months.map((row) => row.visits),
            },
          ]}
          label={en ? "Monthly consultation activity" : "每月診症活動"}
          formatTick={(value) => (Number.isInteger(value) ? String(value) : "")}
          labels={
            en
              ? undefined
              : {
                  noData: "沒有數據",
                  missing: "未有記錄",
                  category: "月份",
                  dataCaption: "{label}數據",
                  total: "總計",
                  series: "指標",
                  inspect: "{label}：查看數據",
                }
          }
        >
          <BarChartPlot height={180} />
          <BarChartTooltip />
        </BarChart>
      </div>
    </section>
  );
}
