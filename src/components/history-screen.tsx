import Link from "next/link";
import { CalendarDays, ArrowUpRight, Activity } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { PatientHeader, ChartContext } from "@/components/chart-context";
import { VisitRecord } from "@/components/visit-record";
import { ClinicalTrend } from "@/components/clinical-trend";
import { clinicCopy } from "@/lib/clinic-copy";
import { vitalDefinitions } from "@/lib/consultation";
import type { Locale } from "@/lib/locale-shared";
import type { PatientChart } from "@/lib/chart";

export function HistoryScreen({
  locale,
  patient,
  selectedId,
  section,
}: {
  locale: Locale;
  patient: PatientChart;
  selectedId?: string;
  section?: string;
}) {
  const c = clinicCopy(locale),
    en = locale === "en";
  const selected =
    patient.visits.find((visit) => visit.id === selectedId) ??
    patient.visits[0];
  const sections = [
    ["overview", en ? "Overview" : "總覽"],
    ["clinical", en ? "Clinical data" : "臨床資料"],
    ["medications", en ? "Medications" : "藥物"],
    ["plans", en ? "Care plans" : "診療計劃"],
    ["profile", en ? "Patient profile" : "病人資料"],
  ];
  const active = sections.some(([id]) => id === section)
    ? section
    : selectedId
      ? "clinical"
      : "overview";
  const latestVitals = patient.visits.find((visit) => visit.vitals.length);
  const status = (value: string) =>
    value === "in-progress"
      ? c.draft
      : value === "finished"
        ? c.finished
        : value === "cancelled"
          ? c.cancelled
          : c.planned;
  const profile = [
    [c.chart, patient.chart_number],
    [c.birthDate, patient.birth_date],
    [en ? "Sex" : "性別", patient.sex],
    [en ? "Phone" : "電話", patient.phone],
    [en ? "Address" : "地址", patient.address],
    [
      en ? "Identity document type" : "身份證明文件類別",
      patient.identity_document_type,
    ],
    [
      en ? "Identity document number" : "身份證明文件號碼",
      patient.identity_document_number,
    ],
    [en ? "eHR number" : "醫健通號碼", patient.ehr_number],
  ];
  return (
    <ClinicShell locale={locale}>
      <PatientHeader patient={patient} locale={locale} mode="overview" />
      <nav
        className="chart-tabs"
        aria-label={en ? "Patient chart sections" : "病歷分類"}
      >
        {sections.map(([id, label]) => (
          <Link
            key={id}
            href={`/patients/${patient.id}?section=${id}${selected ? `&visit=${selected.id}` : ""}`}
            aria-current={id === active ? "page" : undefined}
            className={id === active ? "active" : ""}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="patient-workspace">
        <div className="chart-main">
          {active === "overview" && (
            <>
              <div className="summary-strip panel">
                <div>
                  <span>{en ? "Consultations" : "就診次數"}</span>
                  <strong>{patient.visits.length}</strong>
                </div>
                <div>
                  <span>{en ? "Ongoing problems" : "持續健康問題"}</span>
                  <strong>{patient.problems.length}</strong>
                </div>
                <div>
                  <span>{en ? "Recorded allergies" : "已記錄過敏"}</span>
                  <strong>{patient.allergies.length}</strong>
                </div>
                <div>
                  <span>{en ? "Last consultation" : "最近就診"}</span>
                  <strong className="summary-date">
                    {patient.visits[0]?.date || "—"}
                  </strong>
                </div>
              </div>
              <ChartContext patient={patient} locale={locale} mode="overview" />
              <section className="panel">
                <div className="panel-heading">
                  <h2>
                    <Activity size={17} />
                    {en ? "Latest recorded vitals" : "最近生命表徵"}
                  </h2>
                </div>
                {latestVitals ? (
                  <div className="overview-readings">
                    <p className="muted">{latestVitals.date}</p>
                    <div className="vital-readings">
                      {latestVitals.vitals.map((item) => (
                        <div key={item.code}>
                          <span>
                            {en
                              ? vitalDefinitions[item.code].label
                              : vitalDefinitions[item.code].zh}
                          </span>
                          <strong>
                            {item.value} <small>{item.unit}</small>
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="empty-copy">
                    {en ? "No vitals recorded." : "尚未記錄生命表徵。"}
                  </p>
                )}
              </section>
              {patient.visits[0] && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>{en ? "Latest consultation" : "最近診症"}</h2>
                    <Link
                      className="text-link"
                      href={`/patients/${patient.id}?visit=${patient.visits[0].id}`}
                    >
                      {en ? "View record" : "查看病歷"}
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                  <div className="summary-note">
                    <strong>
                      {patient.visits[0].note.complaint || c.consultation}
                    </strong>
                    <p className="note-text">
                      {patient.visits[0].note.assessment || c.noNotes}
                    </p>
                    <h3>{c.followUp}</h3>
                    <p className="note-text">
                      {patient.visits[0].note.followUp || "—"}
                    </p>
                  </div>
                </section>
              )}

              <ClinicalTrend
                visits={patient.visits.map(({ id, started_at, vitals }) => ({
                  id,
                  started_at,
                  vitals,
                }))}
                locale={locale}
              />
            </>
          )}
          {active === "clinical" && (
            <section className="panel">
              {selected ? (
                <article className="selected-visit">
                  <header className="record-header">
                    <div>
                      <span className={"status-badge " + selected.status}>
                        {status(selected.status)}
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
                        href={`/patients/${patient.id}/visits/${selected.id}`}
                      >
                        {c.resume}
                        <ArrowUpRight size={14} />
                      </Link>
                    )}
                  </header>
                  <VisitRecord visit={selected} locale={locale} />
                </article>
              ) : (
                <p className="empty-copy">{c.noVisits}</p>
              )}
            </section>
          )}
          {active === "medications" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>{c.medications}</h2>
              </div>
              <div className="table-scroll">
                <table className="patient-table">
                  <thead>
                    <tr>
                      {[
                        c.medicine,
                        c.dose,
                        c.route,
                        c.frequency,
                        en ? "Source / status" : "來源／狀態",
                        en ? "Visit" : "就診",
                      ].map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {patient.medications.map((item) => (
                      <tr key={`reported-${item.id}`}>
                        <td>{item.name}</td>
                        <td>{item.dose_text || "—"}</td>
                        <td>{item.route_text || "—"}</td>
                        <td>{item.frequency_text || "—"}</td>
                        <td>
                          {c.reported} · {item.status}
                        </td>
                        <td>—</td>
                      </tr>
                    ))}
                    {patient.visits.flatMap((visit) =>
                      visit.prescriptions.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.dose || "—"}</td>
                          <td>{item.route || "—"}</td>
                          <td>{item.frequency || "—"}</td>
                          <td>
                            {en ? "Order" : "處方"} · {item.status}
                          </td>
                          <td>
                            <Link
                              className="text-link"
                              href={`/patients/${patient.id}?visit=${visit.id}`}
                            >
                              {visit.date}
                            </Link>
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
                {!patient.medications.length &&
                  !patient.visits.some(
                    (visit) => visit.prescriptions.length,
                  ) && <p className="empty-copy">{c.noMedications}</p>}
              </div>
            </section>
          )}
          {active === "plans" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>
                  {en
                    ? "Documented plans and follow-up"
                    : "已記錄的診療計劃及跟進"}
                </h2>
              </div>
              {patient.visits
                .filter((visit) => visit.note.plan || visit.note.followUp)
                .map((visit) => (
                  <article key={visit.id} className="care-plan">
                    <Link
                      className="text-link"
                      href={`/patients/${patient.id}?visit=${visit.id}`}
                    >
                      {visit.date} · {visit.note.complaint || c.consultation}
                    </Link>
                    <small>{status(visit.status)}</small>
                    <h3>{c.plan}</h3>
                    <p className="note-text">{visit.note.plan || "—"}</p>
                    <h3>{c.followUp}</h3>
                    <p className="note-text">{visit.note.followUp || "—"}</p>
                  </article>
                ))}
              {!patient.visits.some(
                (visit) => visit.note.plan || visit.note.followUp,
              ) && <p className="empty-copy">{c.noNotes}</p>}
            </section>
          )}
          {active === "profile" && (
            <section className="panel">
              <div className="panel-heading">
                <h2>{c.demographics}</h2>
                <Link
                  className="text-link"
                  href={`/patients/${patient.id}/edit`}
                >
                  {c.editPatient}
                </Link>
              </div>
              <dl className="profile-grid">
                {profile.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
        <aside
          className="panel timeline-panel"
          aria-label={en ? "Visit timeline" : "就診時間軸"}
        >
          <div className="panel-heading">
            <h2>
              <CalendarDays size={17} />
              {en ? "Visit timeline" : "就診時間軸"}
            </h2>
            <span className="count">{patient.visits.length}</span>
          </div>
          <nav className="visit-timeline" aria-label={c.visits}>
            {patient.visits.map((visit) => (
              <Link
                key={visit.id}
                href={`/patients/${patient.id}?visit=${visit.id}`}
                className={
                  "timeline-entry" +
                  (selected?.id === visit.id ? " active" : "")
                }
                aria-current={
                  active === "clinical" && selected?.id === visit.id
                    ? "true"
                    : undefined
                }
              >
                <span className={"status-dot " + visit.status} />
                <time dateTime={visit.started_at}>{visit.date}</time>
                <strong>{visit.note.complaint || c.consultation}</strong>
                <span>{visit.provider_name || "—"}</span>
                <small className={"status-badge " + visit.status}>
                  {status(visit.status)}
                </small>
              </Link>
            ))}
          </nav>
          {!patient.visits.length && <p className="empty-copy">{c.noVisits}</p>}
        </aside>
      </div>
    </ClinicShell>
  );
}
