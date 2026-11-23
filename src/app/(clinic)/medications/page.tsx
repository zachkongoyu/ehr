import { Search, Pill } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { getPool } from "@/lib/db";
import { getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";
export default async function MedicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const locale = await getLocale(),
    en = locale === "en",
    search = await searchParams;
  const query =
    typeof search.q === "string" ? search.q.trim().slice(0, 200) : "";
  const products = await getPool().query<{
    id: string;
    name: string;
    local_code: string;
    hkctt_term_id: string | null;
    rpp_identifier: string | null;
  }>(
    "select id::text,name,local_code,hkctt_term_id,rpp_identifier from public.medication where $1='' or concat_ws(' ',name,local_code,hkctt_term_id,rpp_identifier) ilike $2 order by name",
    [query, "%" + query + "%"],
  );
  return (
    <ClinicShell locale={locale}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {en ? "CLINIC CATALOGUE" : "診所目錄"}
          </span>
          <h1>{en ? "Medication catalogue" : "藥物目錄"}</h1>
          <p>
            {en
              ? "Find the products available in the consultation prescription form."
              : "查看可於診症處方表格選用的藥物。"}
          </p>
        </div>
        <Pill size={28} />
      </div>
      <section className="panel">
        <div className="directory-toolbar">
          <form className="search-form" action="/medications">
            <Search size={18} />
            <input
              name="q"
              defaultValue={query}
              placeholder={
                en
                  ? "Search name, strength or product code"
                  : "搜尋名稱、劑量或藥物編號"
              }
              aria-label={en ? "Search medication catalogue" : "搜尋藥物目錄"}
            />
            <button className="button secondary small">
              {en ? "Search" : "搜尋"}
            </button>
          </form>
          <span className="muted">
            {products.rows.length} {en ? "products" : "項藥物"}
          </span>
        </div>
        <div className="table-scroll">
          <table className="patient-table">
            <thead>
              <tr>
                <th>{en ? "Product" : "藥物"}</th>
                <th>{en ? "Local code" : "本地編號"}</th>
                <th>HKCTT</th>
                <th>RPP</th>
              </tr>
            </thead>
            <tbody>
              {products.rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.local_code}</td>
                  <td>{item.hkctt_term_id || "—"}</td>
                  <td>{item.rpp_identifier || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.rows.length && (
            <p className="empty-copy">
              {en ? "No matching medicines." : "沒有相符的藥物。"}
            </p>
          )}
        </div>
      </section>
    </ClinicShell>
  );
}
