import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Keyboard, Plus, X } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { ChartKeypad } from "@/components/chart-keypad";
import { getPool } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { displayName } from "@/lib/copy";
import { formatWhen } from "@/lib/chart";

export const dynamic = "force-dynamic";

type Search = { status?: string; q?: string; no?: string; surname?: string; reason?: string };

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
  const text = (value: unknown, max = 200) => (typeof value === "string" ? value.trim().slice(0, max) : "");
  const query = text(search.q);
  const digits = text(search.no, 8).replace(/\D/g, "");
  const surname = text(search.surname, 100);
  const reason = text(search.reason);

  const statusWhere = `($1='all' or ($1='today' and (v.started_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date)
    or ($1='open' and v.status='in-progress') or ($1='completed' and v.status='finished'))`;
  // The surname a doctor would recognise: the Chinese surname character in
  // the Chinese view (so "Chan" and "Chen" both sit under 陳), the family
  // name in English.
  const surnameKey = en ? "p.family_name"
    : `(case when left(regexp_replace(p.name_text,'^示例\\s*·\\s*',''),1) ~ '^[\u4e00-\u9fff\u3400-\u4dbf]$' then left(regexp_replace(p.name_text,'^示例\\s*·\\s*',''),1) else p.family_name end)`;
  // Filters other than status. Each facet list ignores its own selection,
  // so every surname or reason shown leads to at least one visit.
  const otherFilters = (skip?: "surname" | "reason") => `($2='' or concat_ws(' ',p.name_text,p.family_name,p.given_name,p.chart_number,n.complaint,v.provider_name) ilike $3)
       and ($4='' or regexp_replace(p.chart_number,'\\D','','g') like '%'||$4||'%')
       ${skip === "surname" ? "and $5=$5" : `and ($5='' or ${surnameKey}=$5)`}
       ${skip === "reason" ? "and $6=$6" : "and ($6='' or $6=any(string_to_array(coalesce(n.complaint,''),' · ')))"}`;
  const db = getPool();
  const [visits, counts, surnames, reasons] = await Promise.all([
    db.query<{
      id: string; patient_id: string; chart_number: string; name_text: string; family_name: string;
      given_name: string; started_at: string; status: string; complaint: string | null; provider_name: string | null;
    }>(
      `select v.id::text,v.patient_id::text,p.chart_number,p.name_text,p.family_name,p.given_name,v.started_at::text,v.status,n.complaint,v.provider_name
       from public.visit v join public.patient p on p.id=v.patient_id left join public.visit_note n on n.visit_id=v.id
       where ${statusWhere} and ${otherFilters()}
       order by v.started_at desc,v.id desc limit 100`,
      [filter, query, "%" + query + "%", digits, surname, reason],
    ),
    db.query<{ today: string; open: string; completed: string; all: string }>(
      `select count(*) filter (where (v.started_at at time zone 'Asia/Hong_Kong')::date=(now() at time zone 'Asia/Hong_Kong')::date)::text as today,
              count(*) filter (where v.status='in-progress')::text as open,
              count(*) filter (where v.status='finished')::text as completed,
              count(*)::text as all
       from public.visit v`,
    ),
    db.query<{ surname: string; visits: string }>(
      `select ${surnameKey} as surname, count(*)::text as visits
       from public.visit v join public.patient p on p.id=v.patient_id left join public.visit_note n on n.visit_id=v.id
       where ${statusWhere} and p.family_name<>'' and ${otherFilters("surname")}
       group by 1 order by count(*) desc, 1 limit 24`,
      [filter, query, "%" + query + "%", digits, surname, reason],
    ),
    db.query<{ reason: string; visits: string }>(
      `select trim(token) as reason, count(*)::text as visits
       from public.visit v join public.patient p on p.id=v.patient_id left join public.visit_note n on n.visit_id=v.id,
            unnest(string_to_array(coalesce(n.complaint,''),' · ')) as token
       where ${statusWhere} and trim(token)<>'' and ${otherFilters("reason")}
       group by trim(token) order by count(*) desc, trim(token) limit 10`,
      [filter, query, "%" + query + "%", digits, surname, reason],
    ),
  ]);
  const examples = await db.query<{ patient_id: string; visit_id: string; chart_number: string }>(
    `select p.id::text as patient_id, v.id::text as visit_id, p.chart_number
     from public.patient p join public.visit v on v.patient_id=p.id and v.status='in-progress'
     where p.chart_number in ('DEMO-RHYTHM-A','DEMO-RHYTHM-B')
     order by p.chart_number`,
  );

  const current: Search = { status: filter, q: query, no: digits, surname, reason };
  const href = (change: Partial<Search>) => {
    const next = { ...current, ...change };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    return "/consultations?" + params.toString();
  };
  const count = counts.rows[0];
  const active = [
    digits && { key: "no", label: (en ? "Chart no. contains " : "病歷編號含 ") + digits },
    surname && { key: "surname", label: (en ? "Surname " : "姓氏 ") + surname },
    reason && { key: "reason", label: reason },
    query && { key: "q", label: "“" + query + "”" },
  ].filter(Boolean) as { key: keyof Search; label: string }[];
  const statusText = (status: string) => status === "finished" ? (en ? "Completed" : "已完成")
    : status === "in-progress" ? (en ? "In progress" : "診症中")
      : status === "cancelled" ? (en ? "Cancelled" : "已取消") : (en ? "Planned" : "已計劃");

  return (
    <ClinicShell locale={locale}>
      <div className="worklist">
        <header className="worklist-head">
          <div>
            <h1>{en ? "Consultations" : "診症"}</h1>
            <p>{en ? "Tap to narrow the list. No typing needed." : "點選即可篩選，無需打字。"}</p>
          </div>
          <Link href="/patients" className="button primary">
            <Plus size={18} aria-hidden="true" />
            {en ? "Start consultation" : "開始診症"}
          </Link>
        </header>

        <nav className="worklist-status" aria-label={en ? "Visit status" : "就診狀態"}>
          {filters.map((item) => (
            <Link key={item.id} href={href({ status: item.id, surname: "", reason: "" })} scroll={false}
              aria-current={item.id === filter ? "page" : undefined}>
              <span>{item.name}</span>
              <data>{count[item.id as keyof typeof count]}</data>
            </Link>
          ))}
        </nav>

        <div className="worklist-body">
          <aside className="worklist-filters" aria-label={en ? "Find a patient" : "尋找病人"}>
            <section>
              <h2>{en ? "Chart number" : "病歷編號"}</h2>
              <Suspense>
                <ChartKeypad value={digits} label={en ? "Tap digits" : "點選數字"} clearLabel={en ? "Clear" : "清除"} />
              </Suspense>
            </section>
            {surnames.rows.length > 0 && (
              <section>
                <h2>{en ? "Surname" : "姓氏"}</h2>
                <div className="surname-grid">
                  {surnames.rows.map((row) => {
                    const selected = surname === row.surname;
                    return (
                      <Link key={row.surname} scroll={false} aria-current={selected ? "true" : undefined}
                        href={href({ surname: selected ? "" : row.surname })}>
                        <strong lang={/^\p{Script=Han}/u.test(row.surname) ? "zh-HK" : "en"}>{row.surname}</strong>
                        <data>{row.visits}</data>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
            {reasons.rows.length > 0 && (
              <section>
                <h2>{en ? "Reason for visit" : "就診原因"}</h2>
                <div className="reason-chips">
                  {reasons.rows.map((row) => {
                    const selected = reason === row.reason;
                    return (
                      <Link key={row.reason} scroll={false} aria-current={selected ? "true" : undefined}
                        href={href({ reason: selected ? "" : row.reason })}>
                        {row.reason}
                        <data>{row.visits}</data>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
            <details className="worklist-typing" open={Boolean(query) || undefined}>
              <summary><Keyboard size={16} aria-hidden="true" />{en ? "Type instead" : "改用鍵盤輸入"}</summary>
              <form action="/consultations">
                <input type="hidden" name="status" value={filter} />
                <label className="sr-only" htmlFor="worklist-q">{en ? "Patient, complaint or doctor" : "病人、主訴或醫生"}</label>
                <input id="worklist-q" type="search" name="q" defaultValue={query} enterKeyHint="search"
                  placeholder={en ? "Patient, complaint or doctor" : "病人、主訴或醫生"} />
                <button className="button secondary">{en ? "Search" : "搜尋"}</button>
              </form>
            </details>
          </aside>

          <section className="worklist-results" aria-label={en ? "Visits" : "就診"}>
            <div className="worklist-summary">
              <p><data>{visits.rows.length}</data> {en ? (visits.rows.length === 1 ? "visit" : "visits") : "次就診"}</p>
              {active.length > 0 && (
                <ul className="active-filters">
                  {active.map((item) => (
                    <li key={item.key}>
                      <Link href={href({ [item.key]: "" })} scroll={false}
                        aria-label={(en ? "Remove filter " : "移除篩選 ") + item.label}>
                        {item.label}<X size={15} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                  <li><Link className="clear-all" scroll={false} href={href({ q: "", no: "", surname: "", reason: "" })}>
                    {en ? "Clear all" : "全部清除"}</Link></li>
                </ul>
              )}
            </div>
            {examples.rows.length > 0 && filter === "today" && !active.length && (
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
                        <strong>{displayName(locale, row)}</strong>
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
                {en ? "No visits match. Remove a filter above or choose another status." : "沒有相符的就診。請移除上方篩選或選擇其他狀態。"}
              </p>
            )}
            <p className="worklist-foot">{en ? "Up to 100 visits · Hong Kong time" : "最多顯示100次就診 · 香港時間"}</p>
          </section>
        </div>
      </div>
    </ClinicShell>
  );
}
