import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { PatientFinder } from "@/components/patient-finder";
import { getPool } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { displayName } from "@/lib/copy";
import { formatWhen } from "@/lib/chart";

export const dynamic = "force-dynamic";

type Search = { status?: string };

export default async function ConsultationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const locale = await getLocale(),
    en = locale === "en",
    search = await searchParams;
  const filters = [
    { id: "today", name: en ? "Today" : "今日" },
    { id: "open", name: en ? "Open" : "未完成" },
    { id: "completed", name: en ? "Completed" : "已完成" },
    { id: "all", name: en ? "All" : "全部" },
  ];
  const filter = filters.some((item) => item.id === search.status) ? search.status! : "today";
  const statusWhere = `($1='all' or ($1='today' and (v.started_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date)
    or ($1='open' and v.status='in-progress') or ($1='completed' and v.status='finished'))`;
  const db = getPool();
  const [visits, counts] = await Promise.all([
    db.query<{
      id: string; patient_id: string; chart_number: string; name_text: string; family_name: string;
      given_name: string; started_at: string; status: string; complaint: string | null; provider_name: string | null;
    }>(
      `select v.id::text,v.patient_id::text,p.chart_number,p.name_text,p.family_name,p.given_name,v.started_at::text,v.status,n.complaint,v.provider_name
       from public.visit v join public.patient p on p.id=v.patient_id left join public.visit_note n on n.visit_id=v.id
       where ${statusWhere}
       order by v.started_at desc,v.id desc limit 100`,
      [filter],
    ),
    db.query<{ today: string; open: string; completed: string; all: string }>(
      `select count(*) filter (where (v.started_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date)::text as today,
              count(*) filter (where v.status='in-progress')::text as open,
              count(*) filter (where v.status='finished')::text as completed,
              count(*)::text as all
       from public.visit v`,
    ),
  ]);
  const examples = await db.query<{ patient_id: string; visit_id: string; chart_number: string }>(
    `select p.id::text as patient_id, v.id::text as visit_id, p.chart_number
     from public.patient p join public.visit v on v.patient_id=p.id and v.status='in-progress'
     where p.chart_number in ('DEMO-RHYTHM-A','DEMO-RHYTHM-B')
     order by p.chart_number`,
  );

  const count = counts.rows[0];
  const statusText = (status: string) => status === "finished" ? (en ? "Completed" : "已完成")
    : status === "in-progress" ? (en ? "In progress" : "診症中")
      : status === "cancelled" ? (en ? "Cancelled" : "已取消") : (en ? "Planned" : "已計劃");

  return (
    <ClinicShell locale={locale}>
      <div className="worklist">
        <header className="worklist-head">
          <div>
            <h1>{en ? "Consultations" : "診症"}</h1>

          </div>
          <Link href="/patients" className="button primary">
            <Plus size={18} aria-hidden="true" />
            {en ? "Start consultation" : "開始診症"}
          </Link>
        </header>
        <div className="worklist-find">
          <PatientFinder locale={locale} variant="page" />
        </div>

        <nav className="worklist-status" aria-label={en ? "Visit status" : "就診狀態"}>
          {filters.map((item) => (
            <Link key={item.id} href={"/consultations?status=" + item.id} scroll={false}
              aria-current={item.id === filter ? "page" : undefined}>
              <span>{item.name}</span>
              <data>{count[item.id as keyof typeof count]}</data>
            </Link>
          ))}
        </nav>

        <div className="worklist-body">
          <section className="worklist-results" aria-label={en ? "Visits" : "就診"}>
            <div className="worklist-summary">
              <p><data>{visits.rows.length}</data> {en ? (visits.rows.length === 1 ? "visit" : "visits") : "次就診"}</p>
            </div>
            {examples.rows.length > 0 && filter === "today" && (
              <div className="case-comparison" aria-label={en ? "Compare demo cases" : "比較示範個案"}>
                <strong>{en ? "Demo cases" : "示範個案"}</strong>
                {examples.rows.map((item) => (
                  <Link key={item.visit_id} href={`/patients/${item.patient_id}/visits/${item.visit_id}`}>
                    {item.chart_number.endsWith("-A")
                      ? (en ? "A · Palpitations, no rhythm history" : "A · 心悸，未有心律病史")
                      : (en ? "B · Palpitations, prior rhythm history" : "B · 心悸，有過往心律病史")}
                  </Link>
                ))}
              </div>
            )}
            <ul className="visit-rows">
              {visits.rows.map((row) => {
                const open = row.status === "in-progress";
                return (
                  <li key={row.id}>
                    <Link href={open ? `/patients/${row.patient_id}/visits/${row.id}` : `/patients/${row.patient_id}?visit=${row.id}`}>
                      <time dateTime={row.started_at}>{formatWhen(row.started_at, locale)}</time>
                      <span className="visit-who">
                        <strong>{en ? `${row.family_name.toUpperCase()}, ${row.given_name}` : displayName(locale, row)}</strong>
                        <data>{row.chart_number}</data>
                      </span>
                      <span className="visit-reason">{row.complaint || "—"}</span>
                      <span className={"status-badge " + row.status}>{statusText(row.status)}</span>
                      <span className="visit-action">
                        {open ? (en ? "Resume" : "繼續") : (en ? "Review" : "查看")}
                        <ChevronRight size={18} aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {!visits.rows.length && (
              <p className="worklist-empty">
                {en ? "No visits here. Choose another tab, or find the patient above." : "這裡沒有就診。請選擇其他分頁，或在上方尋找病人。"}
              </p>
            )}
            <p className="worklist-foot">{en ? "Up to 100 visits · Hong Kong time" : "最多顯示100次就診 · 香港時間"}</p>
          </section>
        </div>
      </div>
    </ClinicShell>
  );
}
