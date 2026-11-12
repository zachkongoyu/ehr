import Link from "next/link";
import { ArrowUpRight, Plus, CheckCircle2, Clock3 } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { ClinicVolume } from "@/components/clinic-volume";
import { ClinicStatus } from "@/components/clinic-status";
import { getPool } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { displayName } from "@/lib/copy";
import { formatWhen } from "@/lib/chart";

type WorkItem = {
  id: string;
  patient_id: string;
  chart_number: string;
  name_text: string;
  family_name: string;
  given_name: string;
  started_at: string;
  complaint: string | null;
  provider_name: string | null;
};
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const locale = await getLocale(),
    en = locale === "en",
    db = getPool();
  const [summary, pending, recent, months, statuses] = await Promise.all([
    db.query<{
      patients: string;
      today: string;
      open: string;
      finished: string;
    }>(`select
   (select count(*)::text from public.patient) as patients,
   count(*) filter (where (started_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date)::text as today,
   count(*) filter (where status='in-progress')::text as open,
   count(*) filter (where status='finished' and (ended_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date)::text as finished from public.visit`),
    db.query<WorkItem>(`select v.id::text,v.patient_id::text,p.chart_number,p.name_text,p.family_name,p.given_name,v.started_at::text,n.complaint,v.provider_name
   from public.visit v join public.patient p on p.id=v.patient_id left join public.visit_note n on n.visit_id=v.id
   where v.status='in-progress' order by v.started_at asc,v.id asc limit 4`),
    db.query<WorkItem>(`select v.id::text,v.patient_id::text,p.chart_number,p.name_text,p.family_name,p.given_name,v.started_at::text,n.complaint,v.provider_name
   from public.visit v join public.patient p on p.id=v.patient_id left join public.visit_note n on n.visit_id=v.id
   where v.status='finished' order by v.ended_at desc nulls last,v.id desc limit 3`),
    db.query<{
      month: string;
      visits: number;
    }>(`select to_char(month,'YYYY-MM-DD') as month,count(v.id)::integer as visits
   from generate_series(date_trunc('month',now() at time zone 'Asia/Hong_Kong')-interval '5 months',date_trunc('month',now() at time zone 'Asia/Hong_Kong'),interval '1 month') as month
   left join public.visit v on date_trunc('month',v.started_at at time zone 'Asia/Hong_Kong')=month and v.status<>'cancelled'
   group by month order by month`),
    db.query<{ status: string; count: number }>(
      `select status,count(*)::integer as count from public.visit where (started_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date group by status`,
    ),
  ]);
  const counts = summary.rows[0];
  const metrics = [
    [en ? "Today's visits" : "今日就診", counts.today],
    [en ? "Open consultations" : "未完成診症", counts.open],
    [en ? "Completed today" : "今日完成", counts.finished],
    [en ? "Registered patients" : "已登記病人", counts.patients],
  ];
  return (
    <ClinicShell locale={locale}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {en ? "Your clinic, at a glance" : "診所概況，一目了然"}
          </span>
          <h1>{en ? "Clinic overview" : "診所總覽"}</h1>
          <p>
            {en
              ? "Today's activity and the consultations that need your attention."
              : "查看今日活動及有待處理的診症。"}
          </p>
        </div>
        <Link className="button primary" href="/patients">
          <Plus size={16} />
          {en ? "Start consultation" : "開始診症"}
        </Link>
      </div>
      <div className="metric-grid">
        {metrics.map(([label, value]) => (
          <section className="panel metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </section>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <ClinicVolume months={months.rows} locale={locale} />
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <Clock3 size={17} />
                {en ? "Continue consultations" : "繼續診症"}
              </h2>
              <Link className="text-link" href="/consultations?status=open">
                {en ? "View all" : "查看全部"}
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <p className="card-caption">
              {en
                ? "Oldest open visits first · showing up to 4"
                : "最早的未完成診症優先 · 最多顯示4項"}
            </p>
            <div className="dashboard-worklist">
              {pending.rows.map((row) => (
                <article className="consultation-card" key={row.id}>
                  <div className="list-avatar" aria-hidden="true">
                    {displayName(locale, row).slice(0, 1)}
                  </div>
                  <div>
                    <Link
                      className="work-patient"
                      href={`/patients/${row.patient_id}`}
                    >
                      {displayName(locale, row)}
                    </Link>
                    <p>
                      {row.complaint ||
                        (en ? "Consultation in progress" : "診症進行中")}
                    </p>
                    <small>
                      {formatWhen(row.started_at, locale)} ·{" "}
                      {row.provider_name || "—"}
                    </small>
                  </div>
                  <Link
                    className="button secondary small"
                    href={`/patients/${row.patient_id}/visits/${row.id}`}
                  >
                    {en ? "Resume" : "繼續"}
                    <ArrowUpRight size={13} />
                  </Link>
                </article>
              ))}
            </div>
            {!pending.rows.length && (
              <div className="dashboard-empty">
                <CheckCircle2 size={24} />
                <strong>{en ? "All caught up" : "暫無待處理診症"}</strong>
                <p>
                  {en
                    ? "No open consultations. Find a patient when you are ready to begin."
                    : "目前沒有未完成診症，可搜尋病人開始新診症。"}
                </p>
              </div>
            )}
          </section>
        </div>
        <aside className="dashboard-aside">
          <ClinicStatus statuses={statuses.rows} locale={locale} />
          <section className="panel">
            <div className="panel-heading">
              <h2>{en ? "Recently completed" : "最近完成"}</h2>
              <CheckCircle2 size={17} />
            </div>
            <div className="recent-visits">
              {recent.rows.map((row) => (
                <Link
                  className="recent-visit"
                  key={row.id}
                  href={`/patients/${row.patient_id}?visit=${row.id}`}
                >
                  <span className="completed-mark">
                    <CheckCircle2 size={17} />
                  </span>
                  <div>
                    <strong>{displayName(locale, row)}</strong>
                    <p>{row.complaint || (en ? "Consultation" : "診症")}</p>
                    <small>{formatWhen(row.started_at, locale)}</small>
                  </div>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
            {!recent.rows.length && (
              <p className="empty-copy">
                {en ? "No completed visits yet." : "尚未有已完成就診。"}
              </p>
            )}
          </section>
        </aside>
      </div>
    </ClinicShell>
  );
}
