import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { ClinicVolume } from "@/components/clinic-volume";
import { getPool } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { displayName } from "@/lib/copy";
import { formatWhen } from "@/lib/chart";
import { intlLocale } from "@/lib/locale-shared";

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
  open_minutes: number;
};
export const dynamic = "force-dynamic";

// How long a consultation has been open, compact enough to scan down a list.
function elapsed(minutes: number, en: boolean) {
  if (minutes < 60) return en ? `${minutes} min` : `${minutes} 分鐘`;
  if (minutes < 60 * 24) {
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    return en ? `${hours} h ${rest} min` : `${hours} 小時 ${rest} 分`;
  }
  const days = Math.floor(minutes / (60 * 24));
  return en ? `${days} d` : `${days} 日`;
}

export default async function DashboardPage() {
  const locale = await getLocale(),
    en = locale === "en",
    db = getPool();
  const [summary, pending, recent, months, statuses] = await Promise.all([
    db.query<{ patients: string; today: string; open: string; finished: string }>(`select
   (select count(*)::text from public.patient) as patients,
   count(*) filter (where (started_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date)::text as today,
   count(*) filter (where status='in-progress')::text as open,
   count(*) filter (where status='finished' and (ended_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date)::text as finished from public.visit`),
    db.query<WorkItem>(`select v.id::text,v.patient_id::text,p.chart_number,p.name_text,p.family_name,p.given_name,v.started_at::text,n.complaint,v.provider_name,
     greatest(0, floor(extract(epoch from now()-v.started_at)/60))::integer as open_minutes
   from public.visit v join public.patient p on p.id=v.patient_id left join public.visit_note n on n.visit_id=v.id
   where v.status='in-progress' order by v.started_at asc,v.id asc limit 6`),
    db.query<WorkItem>(`select v.id::text,v.patient_id::text,p.chart_number,p.name_text,p.family_name,p.given_name,coalesce(v.ended_at,v.started_at)::text as started_at,n.complaint,v.provider_name,0 as open_minutes
   from public.visit v join public.patient p on p.id=v.patient_id left join public.visit_note n on n.visit_id=v.id
   where v.status='finished' order by v.ended_at desc nulls last,v.id desc limit 5`),
    db.query<{ month: string; visits: number }>(`select to_char(month,'YYYY-MM-DD') as month,count(v.id)::integer as visits
   from generate_series(date_trunc('month',now() at time zone 'Asia/Hong_Kong')-interval '5 months',date_trunc('month',now() at time zone 'Asia/Hong_Kong'),interval '1 month') as month
   left join public.visit v on date_trunc('month',v.started_at at time zone 'Asia/Hong_Kong')=month and v.status<>'cancelled'
   group by month order by month`),
    db.query<{ status: string; count: number }>(
      `select status,count(*)::integer as count from public.visit where (started_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date group by status`,
    ),
  ]);
  const counts = summary.rows[0];
  const today = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "Asia/Hong_Kong", weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
  const figures = [
    { label: en ? "Today's visits" : "今日就診", value: counts.today, href: "/consultations?status=today" },
    { label: en ? "Open consultations" : "未完成診症", value: counts.open, href: "/consultations?status=open" },
    { label: en ? "Completed today" : "今日完成", value: counts.finished, href: "/consultations?status=completed" },
    { label: en ? "Registered patients" : "已登記病人", value: counts.patients, href: "/patients" },
  ];
  const statusParts = [
    { id: "finished", name: en ? "Completed" : "已完成" },
    { id: "in-progress", name: en ? "In progress" : "診症中" },
    { id: "planned", name: en ? "Planned" : "已計劃" },
    { id: "cancelled", name: en ? "Cancelled" : "已取消" },
  ].map((item) => ({ ...item, count: statuses.rows.find((row) => row.status === item.id)?.count ?? 0 }));
  const statusTotal = statusParts.reduce((sum, item) => sum + item.count, 0);
  const name = (row: WorkItem) => en ? `${row.family_name.toUpperCase()}, ${row.given_name}` : displayName(locale, row);

  return (
    <ClinicShell locale={locale}>
      <div className="desk">
        <header className="desk-head">
          <div>
            <h1>{en ? "Clinic overview" : "診所總覽"}</h1>
            <p><time>{today}</time> · {en ? "Hong Kong time" : "香港時間"}</p>
          </div>
          <Link className="button primary" href="/patients?start=1">
            <Plus size={18} aria-hidden="true" />
            {en ? "Start consultation" : "開始診症"}
          </Link>
        </header>

        <ul className="desk-figures">
          {figures.map((item) => (
            <li key={item.label}>
              <Link href={item.href}>
                <span>{item.label}</span>
                <data>{item.value}</data>
              </Link>
            </li>
          ))}
        </ul>

        <div className="desk-body">
          <div className="desk-main">
            <section className="desk-section" aria-labelledby="continue-heading">
              <div className="desk-section-head">
                <h2 id="continue-heading">{en ? "Continue consultations" : "繼續診症"}</h2>
                <span>{en ? "Longest open first" : "最早開始的排先"}</span>
                <Link href="/consultations?status=open">{en ? `View all ${counts.open}` : `查看全部 ${counts.open} 個`}<ChevronRight size={16} aria-hidden="true" /></Link>
              </div>
              {pending.rows.length > 0 ? (
                <ul className="desk-queue queue-table">
                  {pending.rows.map((row) => (
                    <li key={row.id}>
                      <Link href={`/patients/${row.patient_id}/visits/${row.id}`}>
                        <span className="queue-wait">
                          <data>{elapsed(row.open_minutes, en)}</data>
                          <small>{en ? "open" : "已開始"}</small>
                        </span>
                        <span className="queue-who">
                          <strong>{name(row)}</strong>
                          <small><data>{row.chart_number}</data> · {formatWhen(row.started_at, locale)}</small>
                        </span>
                        <span className="queue-reason">{row.complaint || "—"}</span>
                        <span className="queue-action">{en ? "Resume" : "繼續"}<ChevronRight size={18} aria-hidden="true" /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="desk-empty">
                  {en ? "No open consultations. Find a patient above to start one." : "目前沒有未完成診症。可在上方尋找病人開始診症。"}
                </p>
              )}
            </section>
            <section className="desk-section desk-activity-section">
              <ClinicVolume months={months.rows} locale={locale} />
            </section>
          </div>

          <aside className="desk-side">
            <section className="desk-section" aria-labelledby="status-heading">
              <div className="desk-section-head">
                <h2 id="status-heading">{en ? "Today's visit status" : "今日就診狀態"}</h2>
                <span><data>{statusTotal}</data> {en ? "started" : "個已開始"}</span>
              </div>
              {statusTotal > 0 ? (
                <>
                  <div className="status-bar" role="img"
                    aria-label={statusParts.filter((part) => part.count).map((part) => `${part.name} ${part.count}`).join(", ")}>
                    {statusParts.filter((part) => part.count).map((part) => (
                      <span key={part.id} data-status={part.id} style={{ flexGrow: part.count }} />
                    ))}
                  </div>
                  <dl className="status-legend">
                    {statusParts.map((part) => (
                      <div key={part.id} data-status={part.id}>
                        <dt>{part.name}</dt>
                        <dd>{part.count}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="desk-empty">{en ? "No visits started today yet." : "今日尚未有就診。"}</p>
              )}
            </section>
            <section className="desk-section" aria-labelledby="recent-heading">
              <div className="desk-section-head">
                <h2 id="recent-heading">{en ? "Recently completed" : "最近完成"}</h2>
              </div>
              {recent.rows.length ? (
                <ul className="desk-recent">
                  {recent.rows.map((row) => (
                    <li key={row.id}>
                      <Link href={`/patients/${row.patient_id}?visit=${row.id}`}>
                        <strong>{name(row)}</strong>
                        <span>{row.complaint || (en ? "Consultation" : "診症")}</span>
                        <time dateTime={row.started_at}>{formatWhen(row.started_at, locale)}</time>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="desk-empty">{en ? "No completed visits yet." : "尚未有已完成就診。"}</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </ClinicShell>
  );
}
