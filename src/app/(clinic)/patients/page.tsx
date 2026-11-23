import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Play, Plus, ShieldAlert, X } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { ListFilter } from "@/components/list-filter";
import { startVisit } from "@/app/actions";
import { formatWhen } from "@/lib/chart";
import { clinicCopy } from "@/lib/clinic-copy";
import { displayName } from "@/lib/copy";
import { getPool } from "@/lib/db";
import { getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

type Search = { q?: string; sex?: string; age?: string; visit?: string; condition?: string; allergy?: string; start?: string };
type Row = {
  id: string; chart_number: string; name_text: string; family_name: string; given_name: string;
  sex: string; age: number; phone: string | null; last_visit: string | null;
  open_visit_id: string | null; problems: string[]; allergy: boolean; days_since: number | null;
};

const ageBands = [
  { id: "0-17", min: 0, max: 17 },
  { id: "18-39", min: 18, max: 39 },
  { id: "40-64", min: 40, max: 64 },
  { id: "65+", min: 65, max: 200 },
];

export default async function PatientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const locale = await getLocale(),
    en = locale === "en",
    c = clinicCopy(locale),
    search = await searchParams;
  const pick = (value: unknown, allowed: string[]) => typeof value === "string" && allowed.includes(value) ? value : "";
  const query = typeof search.q === "string" ? search.q.trim().slice(0, 200) : "";
  // "Start consultation" opens the list in this mode: tapping a patient goes
  // straight into their consultation instead of their chart.
  const starting = search.start === "1";

  // Every patient with what the segments need. Filtering and counting
  // happen below, so each segment can show how many patients it holds.
  const result = await getPool().query<Row>(
    `select p.id::text, p.chart_number, p.name_text, p.family_name, p.given_name, p.sex, p.phone,
            date_part('year', age((now() at time zone 'Asia/Hong_Kong')::date, p.birth_date))::integer as age,
            last_visit.started_at::text as last_visit,
            floor(extract(epoch from now() - last_visit.started_at) / 86400)::integer as days_since,
            open_visit.id::text as open_visit_id,
            coalesce(problems.list, '{}') as problems,
            exists (select 1 from public.patient_allergy a where a.patient_id = p.id) as allergy
     from public.patient p
     left join lateral (select max(v.started_at) as started_at from public.visit v where v.patient_id = p.id) last_visit on true
     left join lateral (select v.id from public.visit v where v.patient_id = p.id and v.status = 'in-progress'
                        order by v.started_at desc limit 1) open_visit on true
     left join lateral (select array_agg(distinct pr.description order by pr.description) as list from public.problem pr
                        where pr.patient_id = p.id and pr.category = 'problem-list-item' and pr.clinical_status = 'active') problems on true
     order by p.family_name, p.given_name, p.chart_number`,
  );
  const everyone = result.rows;
  const conditions = [...new Set(everyone.flatMap((row) => row.problems))].sort();
  const filter: Required<Omit<Search, "start">> = {
    q: query,
    sex: pick(search.sex, ["female", "male"]),
    age: pick(search.age, ageBands.map((band) => band.id)),
    visit: pick(search.visit, ["open", "recent", "lapsed"]),
    condition: pick(search.condition, conditions),
    allergy: pick(search.allergy, ["yes"]),
  };

  const needle = query.toLocaleLowerCase(), digits = query.replace(/\D/g, "");
  const tests: Record<Exclude<keyof Search, "start">, (row: Row) => boolean> = {
    q: (row) => !needle || [row.name_text, row.family_name, row.given_name, row.given_name + " " + row.family_name,
      row.family_name + " " + row.given_name, row.chart_number, row.phone ?? ""].some((value) => value.toLocaleLowerCase().includes(needle))
      || (digits.length >= 2 && (row.chart_number.replace(/\D/g, "").includes(digits) || (row.phone ?? "").replace(/\D/g, "").includes(digits))),
    sex: (row) => !filter.sex || row.sex === filter.sex,
    age: (row) => {
      const band = ageBands.find((item) => item.id === filter.age);
      return !band || (row.age >= band.min && row.age <= band.max);
    },
    visit: (row) => !filter.visit
      || (filter.visit === "open" && Boolean(row.open_visit_id))
      || (filter.visit === "recent" && row.days_since !== null && row.days_since <= 30)
      || (filter.visit === "lapsed" && (row.days_since === null || row.days_since > 182)),
    condition: (row) => !filter.condition || row.problems.includes(filter.condition),
    allergy: (row) => !filter.allergy || row.allergy,
  };
  type FilterKey = keyof typeof tests;
  const matching = (skip?: FilterKey) =>
    everyone.filter((row) => (Object.keys(tests) as FilterKey[]).every((key) => key === skip || tests[key](row)));
  const patients = matching();
  // How many patients an option would show, given the other filters.
  const countWith = (key: FilterKey, test: (row: Row) => boolean) => matching(key).filter(test).length;

  const href = (change: Partial<Omit<Search, "start">>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filter, ...change })) if (value) params.set(key, value);
    if (starting) params.set("start", "1");
    const text = params.toString();
    return "/patients" + (text ? "?" + text : "");
  };
  const groups: { key: FilterKey; title: string; options: { id: string; label: string; count: number }[] }[] = [
    {
      key: "sex", title: en ? "Sex" : "性別",
      options: [["female", en ? "Female" : "女"], ["male", en ? "Male" : "男"]].map(([id, label]) => ({
        id, label, count: countWith("sex", (row) => row.sex === id),
      })),
    },
    {
      key: "age", title: en ? "Age" : "年齡",
      options: ageBands.map((band) => ({
        id: band.id, label: band.id === "65+" ? (en ? "65 and over" : "65 歲或以上") : band.id.replace("-", "–") + (en ? "" : " 歲"),
        count: countWith("age", (row) => row.age >= band.min && row.age <= band.max),
      })),
    },
    {
      key: "visit", title: en ? "Visits" : "就診",
      options: [
        { id: "open", label: en ? "Open consultation" : "未完成診症", count: countWith("visit", (row) => Boolean(row.open_visit_id)) },
        { id: "recent", label: en ? "Seen in last 30 days" : "30 日內曾就診", count: countWith("visit", (row) => row.days_since !== null && row.days_since <= 30) },
        { id: "lapsed", label: en ? "Not seen for 6 months" : "超過 6 個月未就診", count: countWith("visit", (row) => row.days_since === null || row.days_since > 182) },
      ],
    },
    {
      key: "condition", title: en ? "Conditions" : "長期病患",
      options: conditions.map((name) => ({ id: name, label: name, count: countWith("condition", (row) => row.problems.includes(name)) }))
        .filter((option) => option.count > 0 || option.id === filter.condition),
    },
    {
      key: "allergy", title: en ? "Alerts" : "提示",
      options: [{ id: "yes", label: en ? "Allergy recorded" : "有過敏紀錄", count: countWith("allergy", (row) => row.allergy) }],
    },
  ];
  const active = groups.flatMap((group) => {
    const value = filter[group.key];
    const option = group.options.find((item) => item.id === value);
    return value ? [{ key: group.key, label: option ? option.label : value }] : [];
  });
  if (query) active.unshift({ key: "q", label: "“" + query + "”" });
  const sexLabel = (sex: string) => sex === "female" ? (en ? "F" : "女") : sex === "male" ? (en ? "M" : "男") : "—";
  const shown = patients.slice(0, 200);

  return (
    <ClinicShell locale={locale}>
      <div className="directory" data-starting={starting || undefined}>
        <header className="directory-head">
          <div>
            <h1>{starting ? (en ? "Start consultation" : "開始診症") : c.directory}</h1>
            <p>{starting
              ? (en ? "Tap a patient to open their consultation." : "點選病人，即可進入診症。")
              : (en ? `${everyone.length} registered patients` : `已登記病人 ${everyone.length} 位`)}</p>
          </div>
          {starting ? (
            <Link href="/patients" className="button secondary">{en ? "Cancel" : "取消"}</Link>
          ) : (
            <Link href="/patients/new" className="button primary">
              <Plus size={18} aria-hidden="true" />
              {c.newPatient}
            </Link>
          )}
        </header>

        <div className="directory-body">
          <aside className="directory-filters" aria-label={en ? "Filter patients" : "篩選病人"}>
            <Suspense>
              <ListFilter value={query} placeholder={en ? "Name, chart or phone" : "姓名、病歷編號或電話"}
                label={en ? "Filter patients by name, chart number or phone" : "按姓名、病歷編號或電話篩選病人"}
                clearLabel={en ? "Clear" : "清除"} />
            </Suspense>
            {groups.map((group) => group.options.length > 0 && (
              <section key={group.key}>
                <h2>{group.title}</h2>
                <div className="segment-options">
                  {group.options.map((option) => {
                    const selected = filter[group.key] === option.id;
                    return option.count === 0 && !selected ? (
                      <span key={option.id} aria-disabled="true">{option.label}<data>0</data></span>
                    ) : (
                      <Link key={option.id} scroll={false} aria-current={selected ? "true" : undefined}
                        href={href({ [group.key]: selected ? "" : option.id })}>
                        {option.label}<data>{option.count}</data>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </aside>

          <section className="directory-results" aria-label={en ? "Patients" : "病人"}>
            <div className="directory-summary">
              <p><data>{patients.length}</data> {en ? (patients.length === 1 ? "patient" : "patients") : "位病人"}</p>
              {active.length > 0 && (
                <ul className="active-filters">
                  {active.map((item) => (
                    <li key={item.key}>
                      <Link href={href({ [item.key]: "" })} scroll={false} aria-label={(en ? "Remove filter " : "移除篩選 ") + item.label}>
                        {item.label}<X size={15} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                  <li><Link className="clear-all" scroll={false} href={starting ? "/patients?start=1" : "/patients"}>{en ? "Clear all" : "全部清除"}</Link></li>
                </ul>
              )}
            </div>
            {shown.length ? (
              <ul className="patient-rows">
                {shown.map((row) => {
                  const content = (
                    <>
                      <span className="row-who">
                        <strong className="patient-name">
                          {en ? `${row.family_name.toUpperCase()}, ${row.given_name}` : displayName(locale, row)}
                        </strong>
                        <small>{en ? row.name_text : `${row.given_name} ${row.family_name}`}</small>
                      </span>
                      <data className="row-chart">{row.chart_number}</data>
                      <span className="row-age"><data>{row.age}</data> {en ? "y" : "歲"} · {sexLabel(row.sex)}</span>
                      <span className="row-conditions">
                        {row.allergy && <span className="row-allergy"><ShieldAlert size={14} aria-hidden="true" />{en ? "Allergy" : "過敏"}</span>}
                        {row.problems.slice(0, 2).map((problem) => <span key={problem}>{problem}</span>)}
                        {row.problems.length > 2 && <span>+{row.problems.length - 2}</span>}
                      </span>
                      {starting ? (
                        <span className="row-start">
                          <Play size={15} aria-hidden="true" />
                          {row.open_visit_id ? (en ? "Resume consultation" : "繼續診症") : (en ? "Start consultation" : "開始診症")}
                        </span>
                      ) : (
                        <span className="row-visit">
                          {row.open_visit_id
                            ? <span className="row-open">{en ? "Open consultation" : "未完成診症"}</span>
                            : <time dateTime={row.last_visit ?? undefined}>{row.last_visit ? formatWhen(row.last_visit, locale) : (en ? "No visits yet" : "未有就診")}</time>}
                        </span>
                      )}
                      <ChevronRight size={18} aria-hidden="true" className="row-go" />
                    </>
                  );
                  return (
                    <li key={row.id}>
                      {starting ? (
                        // A form, not a link: links are prefetched, and this one opens or creates a visit.
                        <form action={startVisit.bind(null, row.id)}>
                          <button type="submit">{content}</button>
                        </form>
                      ) : (
                        <Link href={"/patients/" + row.id}>{content}</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="directory-empty">{c.noPatients}{active.length ? (en ? ". Remove a filter to see more." : "。請移除篩選以查看更多。") : ""}</p>
            )}
            {patients.length > shown.length && (
              <p className="directory-more">{en ? `Showing the first ${shown.length}. Add a filter to narrow the list.` : `只顯示首 ${shown.length} 位，可加上篩選以縮小範圍。`}</p>
            )}
          </section>
        </div>
      </div>
    </ClinicShell>
  );
}
