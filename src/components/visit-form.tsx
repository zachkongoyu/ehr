"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2, FileText, Clock3 } from "lucide-react";
import { saveVisit } from "@/app/actions";
import { VisitRecord } from "@/components/visit-record";
import { clinicCopy } from "@/lib/clinic-copy";
import {
  noteFields,
  vitalDefinitions,
  vitalKey,
  type Consultation,
  type Note,
  type Prescription,
} from "@/lib/consultation";
import type { PatientChart, VisitView } from "@/lib/chart";
import type { Locale } from "@/lib/locale-shared";

export function VisitFormCard({
  locale,
  patient,
  visit,
  medications,
}: {
  locale: Locale;
  patient: PatientChart;
  visit: VisitView;
  medications: { id: string; name: string }[];
}) {
  const c = clinicCopy(locale),
    router = useRouter();
  const [note, setNote] = useState<Note>(visit.note);
  const [vitals, setVitals] = useState<Record<string, string>>(
    Object.fromEntries(
      visit.vitals.map((item) => [item.code, String(item.value)]),
    ),
  );
  const [diagnoses, setDiagnoses] = useState(
    visit.diagnoses.map((item) => item.description).join("\n"),
  );
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(
    visit.prescriptions
      .filter((item) => item.status === "draft")
      .map((item) => ({
        medicationId: item.medicationId,
        dose: item.dose,
        route: item.route,
        frequency: item.frequency,
      })),
  );
  const [version, setVersion] = useState(visit.documentation_version);
  const [dirty, setDirty] = useState(false),
    [pending, setPending] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState<string | null>(null);
  const previous = patient.visits.filter((item) => item.id !== visit.id);
  const [previousId, setPreviousId] = useState(previous[0]?.id ?? "");
  const selected = previous.find((item) => item.id === previousId);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (event.target instanceof Element) {
        const anchor = event.target.closest("a");
        if (
          anchor &&
          anchor.getAttribute("href") &&
          !anchor.getAttribute("href")?.startsWith("#") &&
          !window.confirm(c.unsavedLeave)
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };
    const submit = (event: SubmitEvent) => {
      if (event.target !== formRef.current && !window.confirm(c.unsavedLeave)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", navigate, true);
    document.addEventListener("submit", submit, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", navigate, true);
      document.removeEventListener("submit", submit, true);
    };
  }, [dirty, c.unsavedLeave]);
  function changed() {
    setDirty(true);
    setSaved(false);
    setError(null);
  }
  async function save(intent: Consultation["intent"]) {
    if (pending) return;
    if (intent === "complete" && !window.confirm(c.completeConfirm)) return;
    setPending(true);
    setError(null);
    try {
      const measurements: Consultation["vitals"] = {};
      for (const key of Object.keys(vitalDefinitions)) {
        if (vitals[key]?.trim())
          measurements[vitalKey(key)] = Number(vitals[key]);
      }
      const result = await saveVisit({
        patientId: patient.id,
        visitId: visit.id,
        version,
        intent,
        note,
        vitals: measurements,
        diagnoses: diagnoses
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        prescriptions,
      });
      if (!result.ok) {
        setError(c[result.error]);
        return;
      }
      setVersion(result.version);
      setDirty(false);
      setSaved(true);
      if (intent === "complete") {
        router.push("/patients/" + patient.id + "?visit=" + visit.id);
        router.refresh();
      }
    } catch {
      setError(c.failed);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="consultation-layout">
      <form
        ref={formRef}
        id="consultation-form"
        className="consultation-document"
        onSubmit={(event) => {
          event.preventDefault();
          void save("draft");
        }}
      >
        <div className="document-header">
          <div>
            <div className="eyebrow">
              <FileText size={14} />
              {c.consultation}
            </div>
            <h2>{visit.date}</h2>
            <p>{visit.provider_name || "—"}</p>
          </div>
          <span className="status-badge">{c.draft}</span>
        </div>
        <fieldset disabled={pending} className="document-fields">
          <section className="form-section">
            <div className="section-heading">
              <span className="section-number">01</span>
              <h2>{c.complaint}</h2>
              <span className="required-label">{c.required}</span>
            </div>
            <label className="sr-only" htmlFor="complaint">
              {c.complaint}
            </label>
            <input
              id="complaint"
              maxLength={20000}
              placeholder={
                locale === "en" ? "Reason for today’s visit" : "本次就診原因"
              }
              value={note.complaint}
              onChange={(event) => {
                setNote({ ...note, complaint: event.target.value });
                changed();
              }}
            />
          </section>
          <section className="form-section">
            <div className="section-heading">
              <span className="section-number">02</span>
              <h2>{c.vitals}</h2>
              <span className="muted">{c.optional}</span>
            </div>
            <div className="vitals-grid">
              {Object.entries(vitalDefinitions).map(([key, definition]) => (
                <label key={key} htmlFor={"vital-" + key}>
                  {locale === "en" ? definition.label : definition.zh}
                  <div className="unit-input">
                    <input
                      id={"vital-" + key}
                      type="number"
                      step="any"
                      min={definition.min}
                      max={definition.max}
                      value={vitals[key] ?? ""}
                      onChange={(event) => {
                        setVitals({ ...vitals, [key]: event.target.value });
                        changed();
                      }}
                    />
                    <span>{definition.unit}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>
          <section className="form-section">
            <div className="section-heading">
              <span className="section-number">03</span>
              <h2>{c.consultation}</h2>
            </div>
            <div className="notes-grid">
              {noteFields
                .filter((field) => field !== "complaint")
                .map((field) => (
                  <label key={field} htmlFor={field}>
                    <span>
                      {c[field]}
                      {(field === "assessment" || field === "plan") && (
                        <small className="required-label">{c.required}</small>
                      )}
                    </span>
                    <textarea
                      id={field}
                      rows={field === "history" ? 5 : 4}
                      maxLength={20000}
                      value={note[field]}
                      onChange={(event) => {
                        setNote({ ...note, [field]: event.target.value });
                        changed();
                      }}
                    />
                  </label>
                ))}
            </div>
          </section>
          <section className="form-section">
            <div className="section-heading">
              <span className="section-number">04</span>
              <h2>{c.diagnoses}</h2>
            </div>
            <label htmlFor="diagnoses" className="field-help">
              {c.diagnosisHelp}
            </label>
            <textarea
              id="diagnoses"
              rows={3}
              maxLength={20000}
              value={diagnoses}
              onChange={(event) => {
                setDiagnoses(event.target.value);
                changed();
              }}
            />
          </section>
          <section className="form-section">
            <div className="section-heading">
              <span className="section-number">05</span>
              <h2>{c.prescriptions}</h2>
            </div>
            {!prescriptions.length && (
              <p className="empty-copy">{c.noPrescription}</p>
            )}
            <div className="prescription-list">
              {prescriptions.map((item, index) => (
                <div className="prescription-entry" key={index}>
                  <div className="prescription-top">
                    <label htmlFor={"medicine-" + index}>
                      {c.medicine}
                      <select
                        id={"medicine-" + index}
                        value={item.medicationId}
                        onChange={(event) => {
                          setPrescriptions(
                            prescriptions.map((row, i) =>
                              i === index
                                ? { ...row, medicationId: event.target.value }
                                : row,
                            ),
                          );
                          changed();
                        }}
                      >
                        <option value="">{c.choose}</option>
                        {medications.map((medicine) => (
                          <option key={medicine.id} value={medicine.id}>
                            {medicine.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={
                        c.remove + " " + c.medicine + " " + (index + 1)
                      }
                      onClick={() => {
                        setPrescriptions(
                          prescriptions.filter((_, i) => i !== index),
                        );
                        changed();
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="prescription-fields">
                    {(["dose", "route", "frequency"] as const).map((field) => (
                      <label key={field} htmlFor={field + "-" + index}>
                        {c[field]}
                        <input
                          id={field + "-" + index}
                          maxLength={2000}
                          value={item[field]}
                          onChange={(event) => {
                            setPrescriptions(
                              prescriptions.map((row, i) =>
                                i === index
                                  ? { ...row, [field]: event.target.value }
                                  : row,
                              ),
                            );
                            changed();
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {medications.length ? (
              <button
                type="button"
                className="button secondary small"
                onClick={() => {
                  setPrescriptions([
                    ...prescriptions,
                    { medicationId: "", dose: "", route: "", frequency: "" },
                  ]);
                  changed();
                }}
              >
                <Plus size={14} />
                {c.addPrescription}
              </button>
            ) : (
              <p className="field-help">{c.noMedicine}</p>
            )}
          </section>
        </fieldset>
        <div className="save-bar">
          <div className="save-status" aria-live="polite">
            {error ? (
              <p className="error-message" role="alert">
                {error}
              </p>
            ) : (
              <>
                <span className={saved ? "saved" : "muted"}>
                  {saved ? <Check size={15} /> : <Clock3 size={15} />}{" "}
                  {pending
                    ? c.saving
                    : saved
                      ? c.saved
                      : dirty
                        ? c.unsaved
                        : c.draft}
                </span>
                <small>{c.savedHint}</small>
              </>
            )}
          </div>
          <div className="save-actions">
            <button
              type="submit"
              className="button secondary"
              disabled={pending}
            >
              {c.saveDraft}
            </button>
            <button
              type="button"
              className="button primary"
              disabled={pending}
              onClick={() => void save("complete")}
            >
              <Check size={16} />
              {c.complete}
            </button>
          </div>
        </div>
      </form>
      <aside className="reference-panel">
        <section className="panel">
          <div className="panel-heading">
            <h2>{c.visits}</h2>
          </div>
          {previous.length ? (
            <>
              <label className="reference-select">
                <span className="sr-only">{c.visits}</span>
                <select
                  value={previousId}
                  onChange={(event) => setPreviousId(event.target.value)}
                >
                  {previous.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.date} · {item.note.complaint || c.consultation}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <div className="reference-record">
                  <VisitRecord visit={selected} locale={locale} />
                </div>
              )}
            </>
          ) : (
            <p className="empty-copy">{c.noVisits}</p>
          )}
        </section>
      </aside>
    </div>
  );
}
