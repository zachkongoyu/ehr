import Link from "next/link";
import { ClinicShell } from "@/components/clinic-shell";
import { getPool } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { displayName } from "@/lib/copy";
import { formatWhen } from "@/lib/chart";

export const dynamic = "force-dynamic";
export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const locale = await getLocale(),
    en = locale === "en",
    search = await searchParams;
  const filters = [
    { id: "today", name: en ? "Today" : "今日" },
    { id: "open", name: en ? "Open" : "未完成" },
    { id: "completed", name: en ? "Completed" : "已完成" },
    { id: "all", name: en ? "All visits" : "全部就診" },
  ];
  const filter = filters.some((item) => item.id === search.status)
    ? search.status
    : "today";
  const query =
    typeof search.q === "string" ? search.q.trim().slice(0, 200) : "";
  const visits = await getPool().query<{
    id: string;
    patient_id: string;
    chart_number: string;
    name_text: string;
    family_name: string;
    given_name: string;
    started_at: string;
    status: string;
    complaint: string | null;
    provider_name: string | null;
  }>(
    `select v.id::text,v.patient_id::text,p.chart_number,p.name_text,p.family_name,p.given_name,v.started_at::text,v.status,n.complaint,v.provider_name
    from public.visit v join public.patient p on p.id=v.patient_id left join public.visit_note n on n.visit_id=v.id
    where ($1='all' or ($1='today' and (v.started_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date) or ($1='open' and v.status='in-progress') or ($1='completed' and v.status='finished'))
    and ($2='' or concat_ws(' ',p.name_text,p.family_name,p.given_name,p.chart_number,n.complaint,v.provider_name) ilike $3)
    order by v.started_at desc,v.id desc limit 100`,
    [filter, query, "%" + query + "%"],
  );
  return (
    <ClinicShell locale={locale}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {en ? "Clinic worklist" : "診所工作清單"}
          </span>
          <h1>{en ? "Consultations" : "診症"}</h1>
          <p>
            {en
              ? "Find an open consultation or review completed documentation."
              : "尋找未完成診症或查看已完成病歷。"}
          </p>
        </div>
        <Link href="/patients" className="button primary">
          {en ? "Start consultation" : "開始診症"}
        </Link>
      </div>
      <section className="panel">
        <form action="/consultations" className="consultation-filters">
          <label>
            {en ? "Visit status" : "就診狀態"}
            <select name="status" defaultValue={filter}>
              {filters.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {en ? "Patient, complaint or doctor" : "病人、主訴或醫生"}
            <input type="search" name="q" defaultValue={query} />
          </label>
          <button className="button secondary">{en ? "Filter" : "篩選"}</button>
        </form>
        <div className="table-scroll">
          <table className="patient-table">
            <thead>
              <tr>
                {(en
                  ? [
                      "Patient",
                      "Started",
                      "Reason for visit",
                      "Doctor",
                      "Status",
                      "",
                    ]
                  : ["病人", "開始時間", "就診原因", "醫生", "狀態", ""]
                ).map((label, i) => (
                  <th key={i}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link
                      className="patient-name"
                      href={`/patients/${row.patient_id}`}
                    >
                      {displayName(locale, row)}
                    </Link>
                    <small>{row.chart_number}</small>
                  </td>
                  <td>{formatWhen(row.started_at, locale)}</td>
                  <td>{row.complaint || "—"}</td>
                  <td>{row.provider_name || "—"}</td>
                  <td>
                    <span className={"status-badge " + row.status}>
                      {row.status === "finished"
                        ? en
                          ? "Completed"
                          : "已完成"
                        : row.status === "in-progress"
                          ? en
                            ? "In progress"
                            : "診症中"
                          : row.status === "cancelled"
                            ? en
                              ? "Cancelled"
                              : "已取消"
                            : en
                              ? "Planned"
                              : "已計劃"}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="button secondary small"
                      href={
                        row.status === "in-progress"
                          ? `/patients/${row.patient_id}/visits/${row.id}`
                          : `/patients/${row.patient_id}?visit=${row.id}`
                      }
                    >
                      {row.status === "in-progress"
                        ? en
                          ? "Resume"
                          : "繼續"
                        : en
                          ? "Review"
                          : "查看"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visits.rows.length && (
            <p className="empty-copy">
              {en ? "No matching consultations." : "沒有相符的診症。"}
            </p>
          )}
        </div>
        <p className="directory-footer">
          {en
            ? "Showing up to 100 visits · Hong Kong time"
            : "最多顯示100次就診 · 香港時間"}
        </p>
      </section>
    </ClinicShell>
  );
}
