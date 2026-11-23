import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { displayName } from "@/lib/copy";
import { ageFrom } from "@/lib/age";

export const dynamic = "force-dynamic";

export type Suggestion = {
  id: string;
  name: string;
  otherName: string;
  chartNumber: string;
  age: number | null;
  sex: string;
  openVisitId: string | null;
  lastVisit: string | null;
};

// Patients for the search pop-up. With no text it lists patients with an
// open consultation, then the most recently seen, so a doctor can tap
// without typing. With text it matches Chinese or English name, chart
// number (digits alone are enough) or phone, putting names that start
// with the text first.
export async function GET(request: Request) {
  const locale = await getLocale();
  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const text = raw.trim().slice(0, 100);
  const like = text.replace(/[\\%_]/g, (character) => "\\" + character);
  const digits = text.replace(/\D/g, "");
  const result = await getPool().query<{
    id: string; chart_number: string; name_text: string; family_name: string; given_name: string;
    sex: string; birth_date: string; open_visit_id: string | null; last_visit: string | null;
  }>(
    `select p.id::text, p.chart_number, p.name_text, p.family_name, p.given_name, p.sex, p.birth_date::text,
            open_visit.id::text as open_visit_id, last_visit.started_at::text as last_visit
     from public.patient p
     left join lateral (select v.id from public.visit v where v.patient_id=p.id and v.status='in-progress'
                        order by v.started_at desc limit 1) open_visit on true
     left join lateral (select max(v.started_at) as started_at from public.visit v where v.patient_id=p.id) last_visit on true
     where $1=''
        or concat_ws(' ', p.name_text, p.family_name, p.given_name, p.given_name || ' ' || p.family_name, p.chart_number, p.phone) ilike '%' || $2 || '%'
        or ($3<>'' and length($3)>=2 and (regexp_replace(p.chart_number,'\\D','','g') like '%' || $3 || '%'
                                         or regexp_replace(coalesce(p.phone,''),'\\D','','g') like '%' || $3 || '%'))
     order by (open_visit.id is not null) desc,
              ($1<>'' and (p.family_name ilike $2 || '%' or p.given_name ilike $2 || '%'
                           or p.name_text ilike $2 || '%')) desc,
              last_visit.started_at desc nulls last, p.id desc
     limit 8`,
    [text, like, digits],
  );
  const suggestions: Suggestion[] = result.rows.map((row) => ({
    id: row.id,
    name: locale === "en" ? `${row.family_name.toUpperCase()}, ${row.given_name}` : displayName(locale, row),
    otherName: locale === "en" ? row.name_text : `${row.given_name} ${row.family_name}`,
    chartNumber: row.chart_number,
    age: ageFrom(row.birth_date),
    sex: row.sex,
    openVisitId: row.open_visit_id,
    lastVisit: row.last_visit,
  }));
  return NextResponse.json(suggestions, { headers: { "cache-control": "no-store" } });
}
