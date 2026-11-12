import Link from "next/link";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { PatientHeader, ChartContext } from "@/components/chart-context";
import { VisitRecord } from "@/components/visit-record";
import { clinicCopy } from "@/lib/clinic-copy";
import type { Locale } from "@/lib/locale-shared";
import type { PatientChart } from "@/lib/chart";

export function HistoryScreen({
  locale,
  patient,
  selectedId,
}: {
  locale: Locale;
  patient: PatientChart;
  selectedId?: string;
}) {
  const c = clinicCopy(locale);
  const selected =
    patient.visits.find((visit) => visit.id === selectedId) ??
    patient.visits[0];
  return (
    <ClinicShell locale={locale}>
      <PatientHeader patient={patient} locale={locale} mode="overview" />
      <div className="chart-layout">
        <aside>
          <ChartContext patient={patient} locale={locale} mode="overview" />
        </aside>
        <section className="panel history-panel">
          <div className="panel-heading">
            <h2>
              <CalendarDays size={17} />
              {c.visits}
            </h2>
            <span className="count">{patient.visits.length}</span>
          </div>
          {selected ? (
            <div className="history-layout">
              <nav className="visit-list" aria-label={c.visits}>
                {patient.visits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={"/patients/" + patient.id + "?visit=" + visit.id}
                    className={
                      visit.id === selected.id
                        ? "visit-row active"
                        : "visit-row"
                    }
                    aria-current={visit.id === selected.id ? "true" : undefined}
                  >
                    <span className={"status-dot " + visit.status} />
                    <div>
                      <strong>{visit.note.complaint || c.consultation}</strong>
                      <span>{visit.date}</span>
                      <small>
                        {visit.status === "in-progress"
                          ? c.draft
                          : visit.status === "finished"
                            ? c.finished
                            : visit.status === "cancelled"
                              ? c.cancelled
                              : c.planned}
                      </small>
                    </div>
                  </Link>
                ))}
              </nav>
              <article className="selected-visit">
                <header className="record-header">
                  <div>
                    <span className="eyebrow">
                      {selected.status === "finished"
                        ? c.readOnly
                        : c.consultation}
                    </span>
                    <h2>{selected.note.complaint || c.consultation}</h2>
                    <p>
                      {selected.date}
                      {selected.provider_name
                        ? " · " + selected.provider_name
                        : ""}
                    </p>
                  </div>
                  {selected.status === "in-progress" && (
                    <Link
                      className="button secondary small"
                      href={
                        "/patients/" + patient.id + "/visits/" + selected.id
                      }
                    >
                      {c.resume}
                      <ArrowUpRight size={14} />
                    </Link>
                  )}
                </header>
                <VisitRecord visit={selected} locale={locale} />
              </article>
            </div>
          ) : (
            <div className="empty-state">
              <CalendarDays size={30} />
              <h3>{c.noVisits}</h3>
              <p>{c.directoryHelp}</p>
            </div>
          )}
        </section>
      </div>
    </ClinicShell>
  );
}
