"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2, FileText, Clock3 } from "lucide-react";
import { saveVisit } from "@/app/actions";
import { VisitChoices } from "@/components/visit-choices";
import { VisitRecord } from "@/components/visit-record";
import { MedicinePicker } from "@/components/medicine-picker";
import { clinicCopy } from "@/lib/clinic-copy";
import {
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
  withheld,
  context,
}: {
  locale: Locale;
  patient: PatientChart;
  visit: VisitView;
  context: ReactNode;
  withheld: { id: string; name: string; reason: string }[];
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
  const en = locale === "en";
  const [stage, setStage] = useState(0);
  const indexRef = useRef<HTMLElement>(null);
  function openStage(index: number) {
    setStage(index);
    requestAnimationFrame(() => {
      indexRef.current?.querySelector<HTMLButtonElement>('[aria-current="step"]')?.focus({ preventScroll: true });
      indexRef.current?.scrollIntoView({ block: "start" });
    });
  }
  const stages = en ? ["Patient story", "Findings", "Working diagnosis", "Care plan", "Review"]
    : ["就診原因", "臨床所見", "初步診斷", "診療計劃", "覆核"];
  const available = medications.filter((medicine) => !withheld.some((rule) => rule.id === medicine.id));
  const respiratory = note.complaint.split(" · ").some((item) => ["Cough", "Sore throat", "咳嗽", "喉嚨痛"].includes(item.trim()));
  function field(key: keyof Note, label = c[key]) {
    return <label className="reasoning-field" htmlFor={key}>{label}
      <textarea id={key} rows={3} maxLength={20000} value={note[key]}
        onChange={(event) => updateNote(key, event.target.value)} />
    </label>;
  }
  const symptoms = en ? ["Cough", "Fever", "Sore throat", "Headache"] : ["咳嗽", "發燒", "喉嚨痛", "頭痛"];
  const dxChoices = en ? ["Upper respiratory infection", "Allergic rhinitis", "Hypertension"] : ["上呼吸道感染", "過敏性鼻炎", "高血壓"];
  function updateNote(field: keyof Note, value: string) {
    setNote({ ...note, [field]: value });
    changed();
  }
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
    if (prescriptions.some((item) => !item.medicationId)) {
      setError(en ? "Choose a medicine or remove the empty prescription." : "請選擇藥物或移除空白處方。");
      openStage(3);
      return;
    }
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
        onInvalidCapture={(event) => {
          const input = event.target as HTMLInputElement;
          const section = input.closest("section");
          if (section?.hidden) {
            event.preventDefault();
            setStage(section.id === "visit-vitals" ? 1 : 3);
            requestAnimationFrame(() => { input.focus(); input.reportValidity(); });
          }
        }}
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
        <nav id="visit-workspace" tabIndex={-1} ref={indexRef} className="visit-index" aria-label={en ? "Visit sections" : "診症部分"}>
          {stages.map((label, index) => (
            <button type="button" key={label} aria-current={stage === index ? "step" : undefined}
              onClick={() => openStage(index)}>{label}</button>
          ))}
        </nav>
        <fieldset disabled={pending} className="document-fields">
          <section hidden={stage !== 0} id="visit-complaint" className="form-section">
            <div className="section-heading">
              
              <h2>{c.complaint}</h2>
              <span className="required-label">{c.required}</span>
            </div>
            <label className="sr-only" htmlFor="complaint">
              {c.complaint}
            </label>
            <VisitChoices title={en ? "Presenting symptoms" : "就診症狀"} options={symptoms}
              separator=" · " value={note.complaint} onChange={(value) => updateNote("complaint", value)} />
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
          <section hidden={stage !== 1} id="visit-vitals" className="form-section">
            <div className="section-heading">
              
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
          <section hidden={stage !== 1} className="form-section">
            <h2>{en ? "Focused history and examination" : "重點病史及檢查"}</h2>
            <details key={String(respiratory)} open={respiratory || undefined}>
              <summary>{en ? "Respiratory symptoms" : "呼吸系統症狀"}</summary>
              {(en ? ["Breathlessness", "Chest pain"] : ["呼吸困難", "胸痛"]).map((finding) => (
                <VisitChoices key={finding} title={finding} prefix={finding + " · "} exclusive
                  options={en ? ["Reported", "Denied"] : ["有", "否認"]}
                  value={note.history} onChange={(value) => updateNote("history", value)} />
              ))}
            </details>
            <VisitChoices title={en ? "Symptom course" : "症狀變化"} prefix={en ? "Course · " : "病程 · "} exclusive
              options={en ? ["Improving", "Unchanged", "Worsening"] : ["好轉", "無變化", "惡化"]}
              value={note.history} onChange={(value) => updateNote("history", value)} />
            {field("history")}{field("examination")}
          </section>
          <section hidden={stage !== 2} id="visit-diagnoses" className="form-section">
            <h2>{stages[2]}</h2>
            <VisitChoices title={en ? "Diagnostic uncertainty" : "診斷不確定性"}
              options={en ? ["Cause remains uncertain"] : ["病因尚未確定"]}
              value={note.assessment} onChange={(value) => updateNote("assessment", value)} />
            {field("assessment", en ? "Working explanation and alternatives considered" : "初步判斷及鑑別診斷")}
            {(en ? ["Primary", "Secondary"] : ["主要", "次要"]).map((role) => (
              <VisitChoices key={role} title={role + (en ? " diagnosis" : "診斷")}
                prefix={role + " · "} exclusive={role === "Primary" || role === "主要"} options={dxChoices}
                value={diagnoses} onChange={(value) => {
                  const lines = value.split("\n");
                  const added = lines.find((line) => !diagnoses.split("\n").includes(line));
                  if (added?.startsWith(role + " · ")) {
                    const name = added.slice(role.length + 3);
                    const otherRoles = ["Primary", "Secondary", "主要", "次要"].filter((other) => other !== role);
                    setDiagnoses(lines.filter((line) => line.trim() !== name &&
                      !otherRoles.some((other) => line.trim() === other + " · " + name)).join("\n"));
                  } else setDiagnoses(value);
                  changed();
                }} />
            ))}
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
          <section hidden={stage !== 3} id="visit-prescriptions" className="form-section">
            <h2>{stages[3]}</h2>
            <VisitChoices title={en ? "Planned investigations" : "擬安排檢查"}
              options={en ? ["Full blood count", "Chest X-ray", "Urinalysis"] : ["全血計數", "胸部 X 光", "尿液分析"]}
              value={note.plan} onChange={(value) => updateNote("plan", value)} />
            {field("plan")}
            <VisitChoices title={en ? "Follow-up plan" : "跟進安排"}
              options={en ? ["Review pending results", "Arrange reassessment"] : ["覆核待查結果", "安排再次評估"]}
              value={note.followUp} onChange={(value) => updateNote("followUp", value)} />
            {field("followUp", en ? "Follow-up, pending results and when to seek help" : "覆診、待查結果及求醫指示")}
            {withheld.length > 0 && <details className="rule-note"><summary>{en ? "Medicines excluded by chart rules" : "病歷規則已排除的藥物"}</summary>
              {withheld.map((rule) => <p key={rule.id + rule.reason}><strong>{rule.name}</strong> · {rule.reason}</p>)}
            </details>}
            <div className="section-heading">
              
              <h2>{c.prescriptions}</h2>
            </div>
            {!prescriptions.length && (
              <p className="empty-copy">{c.noPrescription}</p>
            )}
            <div className="prescription-list">
              {prescriptions.map((item, index) => (
                <div className="prescription-entry" key={index}>
                  <div className="prescription-top">
                    <div>
                      <MedicinePicker
                        id={"medicine-" + index}
                        value={item.medicationId}
                        medicines={available}
                        locale={locale}
                        onChange={(medicationId) => {
                          setPrescriptions(
                            prescriptions.map((row, i) =>
                              i === index ? { ...row, medicationId } : row,
                            ),
                          );
                          changed();
                        }}
                      />
                    </div>
                    {withheld.some((rule) => rule.id === item.medicationId) && <span role="alert">{withheld.find((rule) => rule.id === item.medicationId)?.name} · {c.blocked}</span>}
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
                          list={
                            field === "dose"
                              ? undefined
                              : field + "-suggestions"
                          }
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
            {available.length ? (
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
          {stage === 4 && <section className="form-section">
            <h2>{en ? "Review this visit" : "覆核本次診症"}</h2>
            <dl className="visit-summary">
              {[[c.complaint,note.complaint,0],[c.history,note.history,1],[c.examination,note.examination,1],
                [c.vitals,Object.entries(vitalDefinitions).filter(([key]) => vitals[key]).map(([key,v]) => (en ? v.label : v.zh) + " " + vitals[key] + " " + v.unit).join(" · "),1],
                [c.assessment,note.assessment,2],[c.diagnoses,diagnoses,2],[c.plan,note.plan,3],
                [c.prescriptions,prescriptions.map((rx) => [medications.find((m) => m.id === rx.medicationId)?.name,rx.dose,rx.route,rx.frequency].filter(Boolean).join(" · ")).join("\n"),3],
                [c.followUp,note.followUp,3]].map(([label,value,index]) => <div key={label}>
                  <dt><button type="button" onClick={() => openStage(Number(index))}>{label}</button></dt>
                  <dd>{value || (en ? "Unrecorded" : "未記錄")}</dd></div>)}
            </dl>
          </section>}
        </fieldset>
        <datalist id="route-suggestions">
          {[
            "Oral",
            "Sublingual",
            "Buccal",
            "Topical",
            "Inhalation",
            "Intranasal",
            "Ophthalmic",
            "Otic",
            "Rectal",
            "Vaginal",
            "Subcutaneous",
            "Intramuscular",
            "Intravenous",
            "Transdermal",
          ].map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="frequency-suggestions">
          {[
            "Once daily",
            "Twice daily",
            "Three times daily",
            "Four times daily",
            "Every 4 hours",
            "Every 6 hours",
            "Every 8 hours",
            "Every 12 hours",
            "At bedtime",
            "Before meals",
            "After meals",
            "Once weekly",
            "As needed",
            "Single dose",
          ].map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
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
              onClick={() => stage < 4 ? openStage(stage + 1) : void save("complete")}
            >
              <Check size={16} />
              {stage < 4 ? stages[stage + 1] + " →" : c.complete}
            </button>
          </div>
        </div>
      </form>
      <aside id="visit-reference" className="reference-panel" tabIndex={-1}>
        {context}
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
