import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Plus,
  ShieldAlert,
  Pill,
  Activity,
} from "lucide-react";
import { addAllergy, addProblem, startVisit } from "@/app/actions";
import { clinicCopy } from "@/lib/clinic-copy";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale-shared";
import type { PatientChart } from "@/lib/chart";

export function PatientHeader({
  patient,
  locale,
  mode,
}: {
  patient: PatientChart;
  locale: Locale;
  mode: "overview" | "consultation";
}) {
  const c = clinicCopy(locale),
    copy = t(locale);
  const sex =
    patient.sex === "female"
      ? copy.female
      : patient.sex === "male"
        ? copy.male
        : patient.sex === "other"
          ? copy.other
          : copy.unknown;
  return (
    <>
      <div className="breadcrumbs">
        <Link href="/patients">
          <ArrowLeft size={14} />
          {c.patients}
        </Link>
        <span>/</span>
        <span>{patient.chart_number}</span>
      </div>
      <section className="patient-header" aria-label={c.demographics}>
        <div className="patient-avatar" aria-hidden="true">
          {patient.name.slice(0, 1)}
        </div>
        <div className="patient-heading">
          <div className="eyebrow">
            {c.chart} · {patient.chart_number}
          </div>
          <h1>{patient.name}</h1>
          <div className="patient-meta">
            <span>
              {c.birthDate}: {patient.birth_date}
            </span>
            <span>{sex}</span>
            {patient.phone && <span>{patient.phone}</span>}
          </div>
        </div>
        <div className="patient-actions">
          {mode === "overview" ? (
            <>
              <Link
                className="button secondary"
                href={`/patients/${patient.id}/edit`}
              >
                {c.editPatient}
              </Link>
              <form action={startVisit.bind(null, patient.id)}>
                <button className="button primary">
                  <Plus size={16} />
                  {patient.open_visit ? c.resume : c.newVisit}
                </button>
              </form>
            </>
          ) : (
            <Link className="button secondary" href={`/patients/${patient.id}`}>
              {c.back}
              <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
      </section>
    </>
  );
}

export function ChartContext({
  patient,
  locale,
  mode,
}: {
  patient: PatientChart;
  locale: Locale;
  mode: "overview" | "consultation";
}) {
  const c = clinicCopy(locale);
  return (
    <div className="context-stack">
      <section className="panel allergy-panel">
        <div className="panel-heading">
          <h2>
            <ShieldAlert size={16} />
            {c.allergies}
          </h2>
        </div>
        {patient.allergies.length ? (
          <ul className="clinical-list">
            {patient.allergies.map((item) => (
              <li key={item.id}>
                <strong>{item.substance}</strong>
                <span>{item.reaction || "—"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-copy">{c.noAllergies}</p>
        )}
        {mode === "overview" && (
          <details className="inline-entry">
            <summary>
              <Plus size={13} />
              {c.addAllergy}
            </summary>
            <form action={addAllergy.bind(null, patient.id)}>
              <label>
                {c.substance}
                <input name="substance" required maxLength={2000} />
              </label>
              <label>
                {c.reaction}
                <input name="reaction" maxLength={2000} />
              </label>
              <button className="button secondary small">{c.addAllergy}</button>
            </form>
          </details>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            <Activity size={16} />
            {c.ongoing}
          </h2>
          <span className="count">{patient.problems.length}</span>
        </div>
        {patient.problems.length ? (
          <ul className="clinical-list">
            {patient.problems.map((item) => (
              <li key={item.id}>
                <strong>{item.description}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-copy">{c.noProblems}</p>
        )}
        {mode === "overview" && (
          <details className="inline-entry">
            <summary>
              <Plus size={13} />
              {c.addProblem}
            </summary>
            <form action={addProblem.bind(null, patient.id)}>
              <label>
                {c.problem}
                <input name="description" required maxLength={2000} />
              </label>
              <button className="button secondary small">{c.add}</button>
            </form>
          </details>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>
            <Pill size={16} />
            {c.medications}
          </h2>
        </div>
        {!patient.medications.length && !patient.activeOrders.length ? (
          <p className="empty-copy">{c.noMedications}</p>
        ) : (
          <ul className="clinical-list">
            {patient.medications.map((item) => (
              <li key={`statement-${item.id}`}>
                <strong>{item.name}</strong>
                <span>
                  {[item.dose_text, item.frequency_text]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
                <small>{c.reported}</small>
              </li>
            ))}
            {patient.activeOrders.map((item) => (
              <li key={`order-${item.id}`}>
                <strong>{item.name}</strong>
                <span>
                  {[item.dose, item.route, item.frequency]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
                <small>{c.prescribed}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
