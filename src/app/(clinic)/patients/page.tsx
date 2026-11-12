import Link from "next/link";
import { Search, ArrowUpRight, Plus, Users } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { listPatients, formatWhen } from "@/lib/chart";
import { clinicCopy } from "@/lib/clinic-copy";
import { getLocale } from "@/lib/locale";
export const dynamic = "force-dynamic";
export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const locale = await getLocale(),
    c = clinicCopy(locale);
  const search = await searchParams;
  const query =
    typeof search.q === "string" ? search.q.trim().slice(0, 200) : "";
  const patients = await listPatients(locale, query);
  return (
    <ClinicShell locale={locale}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{c.workspace}</span>
          <h1>{c.directory}</h1>
          <p>{c.directoryHelp}</p>
        </div>
        <Link href="/patients/new" className="button primary">
          <Plus size={16} />
          {c.newPatient}
        </Link>
      </div>
      <section className="panel directory-panel">
        <div className="directory-toolbar">
          <form className="search-form" action="/patients">
            <Search size={18} />
            <input
              name="q"
              defaultValue={query}
              placeholder={c.search}
              aria-label={c.search}
            />
            <button className="button secondary small">{c.searchAction}</button>
          </form>
          <span className="muted">
            {patients.length} {c.patients}
          </span>
        </div>
        {patients.length ? (
          <div className="table-scroll">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>{c.name}</th>
                  <th>{c.chartNumber}</th>
                  <th>{c.birthDate}</th>
                  <th>{c.phone}</th>
                  <th>{c.lastVisit}</th>
                  <th>
                    <span className="sr-only">{c.openChart}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <Link
                        className="patient-name"
                        href={"/patients/" + patient.id}
                      >
                        <span className="list-avatar" aria-hidden="true">
                          {patient.name.slice(0, 1)}
                        </span>
                        <strong>{patient.name}</strong>
                      </Link>
                    </td>
                    <td className="mono">{patient.chart_number}</td>
                    <td>{patient.birth_date}</td>
                    <td>{patient.phone || "—"}</td>
                    <td>
                      {formatWhen(patient.last_visit, locale)}
                      {patient.open_visit && (
                        <span className="status-badge">{c.draft}</span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={"/patients/" + patient.id}
                        className="table-action"
                        aria-label={c.openChart + " · " + patient.name}
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Users size={30} />
            <h3>{c.noPatients}</h3>
          </div>
        )}
        <footer className="directory-footer">{c.results}</footer>
      </section>
    </ClinicShell>
  );
}
