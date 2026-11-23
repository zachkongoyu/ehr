import Link from "next/link";
import { ArrowLeft, ArrowRight, Pencil, Play, ShieldAlert } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { ChartContext } from "@/components/chart-context";
import { VisitRecord } from "@/components/visit-record";
import { ClinicalTrend } from "@/components/clinical-trend";
import { startVisit } from "@/app/actions";
import { clinicCopy } from "@/lib/clinic-copy";
import { t } from "@/lib/copy";
import { ageFrom } from "@/lib/age";
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
    copy = t(locale),
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
  const latest = patient.visits[0];
  const status = (value: string) =>
    value === "in-progress"
      ? c.draft
      : value === "finished"
        ? c.finished
        : value === "cancelled"
          ? c.cancelled
          : c.planned;
  const sex = patient.sex === "female" ? copy.female : patient.sex === "male" ? copy.male
    : patient.sex === "other" ? copy.other : copy.unknown;
  const age = ageFrom(patient.birth_date);
  const profile = [
    [c.chart, patient.chart_number],
    [c.birthDate, patient.birth_date],
    [en ? "Sex" : "性別", sex],
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
  const href = (id: string, visit = selected?.id) =>
    `/patients/${patient.id}?section=${id}${visit ? `&visit=${visit}` : ""}`;

  return (
    <ClinicShell locale={locale}>
      <div className="chart-page">
        <header className="chart-head">
          <Link href="/patients" className="chart-crumb">
            <ArrowLeft size={16} aria-hidden="true" />
            {c.patients}
          </Link>
          <div className="chart-head-main">
            <div className="chart-who">
              <h1>{patient.name}</h1>
              <p>
                <span>{patient.chart_number}</span>
                <span>{age !== null ? (en ? age + " years" : age + " 歲") : patient.birth_date}</span>
                <span>{sex}</span>
                {patient.phone && <span>{patient.phone}</span>}
              </p>
            </div>
            <div className="chart-actions">
              <Link className="button secondary" href={`/patients/${patient.id}/edit`}>
                <Pencil size={17} aria-hidden="true" />
                {c.editPatient}
              </Link>
              <form action={startVisit.bind(null, patient.id)}>
                <button className="button primary">
                  <Play size={17} aria-hidden="true" />
                  {patient.open_visit ? c.resume : c.newVisit}
                </button>
              </form>
            </div>
          </div>
          <ul className="chart-alerts" aria-label={en ? "Chart alerts" : "病歷提示"}>
            {patient.allergies.length ? patient.allergies.map((item) => (
              <li key={item.id} className="alert-allergy">
                <ShieldAlert size={16} aria-hidden="true" />
                <span className="sr-only">{c.allergies}: </span>
                {item.substance}
              </li>
            )) : (
              <li className="alert-quiet">{en ? "No allergies recorded" : "未有過敏紀錄"}</li>
            )}
            {patient.problems.map((item) => <li key={item.id}>{item.description}</li>)}
          </ul>
          <nav className="chart-sections" aria-label={en ? "Patient chart sections" : "病歷分類"}>
            {sections.map(([id, label]) => (
              <Link key={id} href={href(id)} aria-current={id === active ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="chart-body">
          <div className="chart-main">
            {active === "overview" && (
              <>
                {latest && (
                  <section className="chart-card chart-latest">
                    <div className="card-eyebrow">
                      <span>{en ? "Latest consultation" : "最近診症"}</span>
                      <span>{latest.date}</span>
                      <span className={"status-word " + latest.status}>{status(latest.status)}</span>
                    </div>
                    <h2>{latest.note.complaint || c.consultation}</h2>
                    <div className="latest-grid">
                      <div>
                        <h3>{c.assessment}</h3>
                        <p className="note-text">{latest.note.assessment || c.noNotes}</p>
                      </div>
                      <div>
                        <h3>{c.followUp}</h3>
                        <p className="note-text">{latest.note.followUp || "—"}</p>
                      </div>
                    </div>
                    <Link className="card-link" href={`/patients/${patient.id}?visit=${latest.id}`}>
                      {latest.status === "in-progress"
                        ? (en ? "View draft record" : "查看草稿")
                        : (en ? "Open full record" : "查看完整病歷")}
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </section>
                )}

                <dl className="chart-figures">
                  <div>
                    <dt>{en ? "Consultations" : "就診次數"}</dt>
                    <dd>{patient.visits.length}</dd>
                  </div>
                  <div>
                    <dt>{en ? "Ongoing problems" : "持續健康問題"}</dt>
                    <dd>{patient.problems.length}</dd>
                  </div>
                  <div>
                    <dt>{en ? "Recorded allergies" : "已記錄過敏"}</dt>
                    <dd>{patient.allergies.length}</dd>
                  </div>
                  <div>
                    <dt>{en ? "Last consultation" : "最近就診"}</dt>
                    <dd className="figure-date">{latest?.date || "—"}</dd>
                  </div>
                </dl>

                <section className="chart-card">
                  <div className="card-head">
                    <h2>{en ? "Latest recorded vitals" : "最近生命表徵"}</h2>
                    {latestVitals && <span className="card-meta">{latestVitals.date}</span>}
                  </div>
                  {latestVitals ? (
                    <dl className="chart-readings">
                      {latestVitals.vitals.map((item) => (
                        <div key={item.code}>
                          <dt>{en ? vitalDefinitions[item.code].label : vitalDefinitions[item.code].zh}</dt>
                          <dd>{item.value} <small>{item.unit}</small></dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="empty-copy">{en ? "No vitals recorded." : "尚未記錄生命表徵。"}</p>
                  )}
                </section>

                <div className="chart-context">
                  <ChartContext patient={patient} locale={locale} mode="overview" />
                </div>

                <div className="chart-trend">
                  <ClinicalTrend
                    visits={patient.visits.map(({ id, started_at, vitals }) => ({
                      id,
                      started_at,
                      vitals,
                    }))}
                    locale={locale}
                  />
                </div>
              </>
            )}

            {active === "clinical" && (
              <section className="chart-card chart-record">
                {selected ? (
                  <article>
                    <header className="record-head">
                      <div>
                        <div className="card-eyebrow">
                          <span>{selected.date}</span>
                          {selected.provider_name && <span>{selected.provider_name}</span>}
                          <span className={"status-word " + selected.status}>{status(selected.status)}</span>
                        </div>
                        <h2>{selected.note.complaint || c.consultation}</h2>
                      </div>
                      {selected.status === "in-progress" && (
                        <Link className="button primary" href={`/patients/${patient.id}/visits/${selected.id}`}>
                          {c.resume}
                          <ArrowRight size={17} aria-hidden="true" />
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
              <section className="chart-card">
                <div className="card-head">
                  <h2>{c.medications}</h2>
                </div>
                <div className="table-scroll">
                  <table className="chart-table">
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
                          <td><strong>{item.name}</strong></td>
                          <td>{item.dose_text || "—"}</td>
                          <td>{item.route_text || "—"}</td>
                          <td>{item.frequency_text || "—"}</td>
                          <td>{c.reported} · {item.status}</td>
                          <td>—</td>
                        </tr>
                      ))}
                      {patient.visits.flatMap((visit) =>
                        visit.prescriptions.map((item) => (
                          <tr key={item.id}>
                            <td><strong>{item.name}</strong></td>
                            <td>{item.dose || "—"}</td>
                            <td>{item.route || "—"}</td>
                            <td>{item.frequency || "—"}</td>
                            <td>{en ? "Order" : "處方"} · {item.status}</td>
                            <td>
                              <Link className="card-link" href={`/patients/${patient.id}?visit=${visit.id}`}>
                                {visit.date}
                              </Link>
                            </td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                  {!patient.medications.length &&
                    !patient.visits.some((visit) => visit.prescriptions.length) &&
                    <p className="empty-copy">{c.noMedications}</p>}
                </div>
              </section>
            )}

            {active === "plans" && (
              <section className="chart-card">
                <div className="card-head">
                  <h2>{en ? "Documented plans and follow-up" : "已記錄的診療計劃及跟進"}</h2>
                </div>
                <div className="plan-list">
                  {patient.visits
                    .filter((visit) => visit.note.plan || visit.note.followUp)
                    .map((visit) => (
                      <article key={visit.id} className="plan-entry">
                        <div className="card-eyebrow">
                          <span>{visit.date}</span>
                          <span className={"status-word " + visit.status}>{status(visit.status)}</span>
                        </div>
                        <Link className="plan-title" href={`/patients/${patient.id}?visit=${visit.id}`}>
                          {visit.note.complaint || c.consultation}
                        </Link>
                        <div className="latest-grid">
                          <div>
                            <h3>{c.plan}</h3>
                            <p className="note-text">{visit.note.plan || "—"}</p>
                          </div>
                          <div>
                            <h3>{c.followUp}</h3>
                            <p className="note-text">{visit.note.followUp || "—"}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                </div>
                {!patient.visits.some((visit) => visit.note.plan || visit.note.followUp) &&
                  <p className="empty-copy">{c.noNotes}</p>}
              </section>
            )}

            {active === "profile" && (
              <section className="chart-card">
                <div className="card-head">
                  <h2>{c.demographics}</h2>
                  <Link className="card-link" href={`/patients/${patient.id}/edit`}>
                    {c.editPatient}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
                <dl className="chart-profile">
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

          <aside className="chart-timeline" aria-label={en ? "Visit timeline" : "就診時間軸"}>
            <div className="card-head">
              <h2>{en ? "Visit timeline" : "就診時間軸"}</h2>
              <span className="card-meta">{patient.visits.length}</span>
            </div>
            <ol>
              {patient.visits.map((visit) => {
                const current = active === "clinical" && selected?.id === visit.id;
                return (
                  <li key={visit.id} data-status={visit.status}>
                    <Link href={`/patients/${patient.id}?visit=${visit.id}`} aria-current={current ? "true" : undefined}>
                      <time dateTime={visit.started_at}>{visit.date}</time>
                      <strong>{visit.note.complaint || c.consultation}</strong>
                      <span>
                        {visit.provider_name || "—"}
                        <em className={"status-word " + visit.status}>{status(visit.status)}</em>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            {!patient.visits.length && <p className="empty-copy">{c.noVisits}</p>}
          </aside>
        </div>
      </div>
    </ClinicShell>
  );
}
