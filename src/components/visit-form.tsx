"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Clock3, Plus, Trash2, BookOpen, X, ShieldAlert, History,
} from "lucide-react";
import { saveVisit } from "@/app/actions";
import { ClinicalTrend } from "@/components/clinical-trend";
import { TouchNumber } from "@/components/touch-number";
import { ConsultRail, type RailArea, type RailState } from "@/components/consult-rail";
import { ConsultMap, type MapColumn, type MapEdge, type MapNode } from "@/components/consult-map";
import { VisitChoices } from "@/components/visit-choices";
import { VisitRecord } from "@/components/visit-record";
import { MedicinePicker } from "@/components/medicine-picker";
import { consultationAreas } from "@/lib/consultation-areas";
import { clinicCopy } from "@/lib/clinic-copy";
import { t } from "@/lib/copy";
import { ageFrom } from "@/lib/age";
import { referenceFlag, referenceRange } from "@/lib/vital-reference";
import {
  vitalDefinitions,
  vitalKey,
  type Consultation,
  type Note,
  type Prescription,
  type Vital,
} from "@/lib/consultation";
import type { PatientChart, VisitView } from "@/lib/chart";
import type { Locale } from "@/lib/locale-shared";

const prescriptionChoices = {
  route: [
    "Oral", "Sublingual", "Buccal", "Topical", "Inhalation", "Intranasal", "Ophthalmic",
    "Otic", "Rectal", "Vaginal", "Subcutaneous", "Intramuscular", "Intravenous", "Transdermal",
  ],
  frequency: [
    "Once daily", "Twice daily", "Three times daily", "Four times daily", "Every 4 hours",
    "Every 6 hours", "Every 8 hours", "Every 12 hours", "At bedtime", "Before meals",
    "After meals", "Once weekly", "As needed", "Single dose",
  ],
};
// The most common instructions are one tap away; the rest stay in the full list.
const quickChoices = {
  route: ["Oral", "Topical", "Inhalation", "Intranasal"],
  frequency: ["Once daily", "Twice daily", "Three times daily", "As needed"],
};

const doseUnits = ["mg", "mcg", "g", "mL", "tablet(s)", "capsule(s)", "unit(s)"];

// Structured answers are stored as text lines. Status checks accept either
// language so a note recorded in Chinese still counts when viewed in English.
const respiratoryFindings = [
  { en: "Breathlessness", zh: "呼吸困難" },
  { en: "Chest pain", zh: "胸痛" },
];
const palpitationPrefixes = {
  started: ["Palpitations started · ", "心悸開始 · "],
  compared: ["Compared with prior rhythm history · ", "與過往心律病史比較 · "],
};

function hasLine(text: string, test: (line: string) => boolean) {
  return text.split("\n").some((line) => test(line.trim()));
}

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
    copy = t(locale),
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
  const [previousId, setPreviousId] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const chartClose = useRef<HTMLButtonElement>(null);
  const en = locale === "en";
  const [stage, setStage] = useState(0);
  const [view, setView] = useState<"note" | "map">("note");
  const [vitalsOpen, setVitalsOpen] = useState(visit.vitals.length > 0);
  const noteRef = useRef<HTMLElement>(null);

  function openStage(index: number, targetId?: string) {
    setView("note");
    setStage(index);
    requestAnimationFrame(() => {
      const target = targetId ? document.getElementById(targetId)
        : noteRef.current?.querySelector<HTMLElement>(".consult-step-head h2");
      if (target instanceof HTMLElement && target.tagName === "SUMMARY" && target.parentElement instanceof HTMLDetailsElement) {
        target.parentElement.open = true;
      }
      target?.focus({ preventScroll: true });
      if (targetId) target?.scrollIntoView({ block: "start", behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const stages = en ? ["Patient story", "Findings", "Working diagnosis", "Care plan", "Review"]
    : ["就診原因", "臨床所見", "初步診斷", "診療計劃", "覆核"];
  const available = medications.filter((medicine) => !withheld.some((rule) => rule.id === medicine.id));

  // Which body areas today's complaint points to.
  const complaintTokens = note.complaint.split(" · ").map((item) => item.trim().toLocaleLowerCase());
  const areaMatches = consultationAreas.filter((area) =>
    [...area.symptomsEn, ...area.symptomsZh].some((item) => complaintTokens.includes(item.toLowerCase())),
  );
  const [openedAreas, setOpenedAreas] = useState<string[]>([]);
  const focusedAreas = consultationAreas.filter((area) =>
    areaMatches.includes(area) || openedAreas.includes(area.id),
  );
  const respiratory = focusedAreas.some((area) => area.id === "respiratory");
  const palpitations = focusedAreas.some((area) => area.id === "cardiac");

  // Chart history that changes what to ask about palpitations.
  const rhythmProblem = patient.problems.find((problem) => problem.hkctt_term_id === "7871");
  const rhythmVisit = previous.find((item) => item.status === "finished" &&
    /(?:^| · )(?:palpitations|心悸)(?: · |$)/i.test(item.note.complaint));
  const recordedRhythmContext = Boolean(rhythmProblem || rhythmVisit);

  const missingFindings = respiratoryFindings.filter((finding) =>
    !hasLine(note.history, (line) => line.startsWith(finding.en + " · ") || line.startsWith(finding.zh + " · ")),
  ).map((finding) => en ? finding.en : finding.zh);

  function areaOpenQuestions(id: string) {
    if (id === "respiratory") return missingFindings.length;
    if (id === "cardiac") {
      const prefixes = [palpitationPrefixes.started, ...(recordedRhythmContext ? [palpitationPrefixes.compared] : [])];
      return prefixes.filter((group) => !hasLine(note.history, (line) => group.some((p) => line.startsWith(p)))).length;
    }
    const area = consultationAreas.find((item) => item.id === id);
    if (!area) return 0;
    const reviewed = ["Reviewed " + area.en.toLowerCase() + " history", "已查問" + area.zh + "病史"];
    return hasLine(note.history, (line) => reviewed.includes(line)) ? 0 : 1;
  }

  function openArea(id: string) {
    setOpenedAreas((ids) => ids.includes(id) ? ids : [...ids, id]);
    const target = id === "respiratory" ? "respiratory-questions"
      : id === "cardiac" ? "palpitation-questions" : "area-" + id;
    openStage(1, target);
  }

  const reviewItems = [
    { label: c.complaint, value: note.complaint, step: 0, id: "complaint" },
    { label: c.assessment, value: note.assessment, step: 2, id: "assessment" },
    { label: c.plan, value: note.plan, step: 3, id: "plan" },
  ].filter((item) => !item.value.trim());
  const chartVisits = previous.filter((item) => item.status === "finished" && item.vitals.length);
  const lastVitals = chartVisits[0];
  const symptomGroups = consultationAreas.map((area) => ({
    id: area.id,
    label: en ? area.en : area.zh,
    options: en ? [...area.symptomsEn] : [...area.symptomsZh],
    aliases: Object.fromEntries(area.symptomsEn.map((term, index) => en
      ? [term, [area.symptomsZh[index]]] : [area.symptomsZh[index], [term]])),
  }));
  const dxChoices = en ? ["Upper respiratory infection", "Allergic rhinitis", "Hypertension"] : ["上呼吸道感染", "過敏性鼻炎", "高血壓"];

  // Rail status for each step and each linked body area.
  const linkedAreas: RailArea[] = focusedAreas.map((area) => {
    const open = areaOpenQuestions(area.id);
    const state: RailState = open ? "attention" : "done";
    return {
      id: area.id,
      label: en ? area.en : area.zh,
      detail: open
        ? (en ? open + (open === 1 ? " question open" : " questions open") : open + " 項待答")
        : (en ? "Questions recorded" : "問題已記錄"),
      state,
      count: open,
      onSelect: () => openArea(area.id),
    };
  });
  const otherAreas: RailArea[] = consultationAreas
    .filter((area) => !focusedAreas.includes(area))
    .map((area) => ({
      id: area.id, label: en ? area.en : area.zh, detail: "", state: "todo", onSelect: () => openArea(area.id),
    }));
  const openQuestions = linkedAreas.reduce((sum, area) => sum + (area.count ?? 0), 0);
  const vitalCount = Object.values(vitals).filter((value) => value?.trim()).length;
  const incompleteRx = prescriptions.filter((rx) => !rx.medicationId || !rx.dose.trim() || !rx.route.trim() || !rx.frequency.trim()).length;
  const required = en ? "Required" : "必填";
  const steps = [
    {
      label: stages[0],
      state: (note.complaint.trim() ? "done" : "todo") as RailState,
      hint: note.complaint.trim() || required,
      subs: [],
    },
    {
      label: stages[1],
      state: (openQuestions ? "attention" : note.history.trim() || note.examination.trim() || vitalCount ? "done" : "todo") as RailState,
      count: openQuestions,
      hint: openQuestions ? (en ? openQuestions + " to ask" : openQuestions + " 項待問")
        : vitalCount ? (en ? vitalCount + " vitals recorded" : "已記錄 " + vitalCount + " 項生命表徵")
          : (en ? "Vitals, history, examination" : "生命表徵、病史、檢查"),
      subs: [
        { id: "urgency", label: en ? "Urgency" : "緊急程度", onSelect: () => openStage(1, "urgency-review") },
        { id: "history", label: en ? "Focused history" : "重點病史", onSelect: () => openStage(1, "focused-history") },
        { id: "vitals", label: c.vitals, onSelect: () => openStage(1, "vitals-heading") },
      ],
    },
    {
      label: stages[2],
      state: (note.assessment.trim() ? "done" : "todo") as RailState,
      hint: note.assessment.trim() ? (diagnoses.trim() ? diagnoses.trim().split("\n")[0] : (en ? "Assessment recorded" : "已記錄評估")) : required,
      subs: [],
    },
    {
      label: stages[3],
      state: (incompleteRx ? "attention" : note.plan.trim() ? "done" : "todo") as RailState,
      count: incompleteRx,
      hint: incompleteRx ? (en ? "Prescription incomplete" : "處方未完成")
        : prescriptions.length ? (en ? prescriptions.length + " prescribed" : "已開 " + prescriptions.length + " 項處方")
          : note.plan.trim() ? (en ? "Plan recorded" : "已記錄計劃") : required,
      subs: [
        { id: "investigations", label: en ? "Investigations" : "檢查", onSelect: () => openStage(3, "investigation-heading") },
        { id: "treatment", label: en ? "Treatment" : "治療", onSelect: () => openStage(3, "treatment-heading") },
        { id: "follow-up", label: en ? "Follow-up" : "跟進", onSelect: () => openStage(3, "follow-up-heading") },
        { id: "prescriptions", label: c.prescriptions, onSelect: () => openStage(3, "prescriptions-heading") },
      ],
    },
    {
      label: stages[4],
      state: (reviewItems.length ? "todo" : "done") as RailState,
      hint: reviewItems.length ? (en ? reviewItems.length + " required missing" : "尚欠 " + reviewItems.length + " 項必填")
        : (en ? "Ready to complete" : "可完成診症"),
      subs: [],
    },
  ];

  // ---------- consultation map model ----------
  const answerOf = (text: string, prefixes: readonly string[]) => {
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      const prefix = prefixes.find((item) => trimmed.startsWith(item));
      if (prefix) return trimmed.slice(prefix.length);
    }
    return null;
  };
  const toArea = (id: string) => "area:" + id;
  const symptomNodes: MapNode[] = note.complaint.split(" · ").map((item) => item.trim()).filter(Boolean)
    .map((item, index) => ({
      id: "symptom:" + index,
      label: item,
      state: "done" as const,
      onSelect: () => openStage(0, "presenting-complaint-heading"),
    }));
  const symptomEdges: MapEdge[] = symptomNodes.flatMap((node) => {
    const area = consultationAreas.find((item) =>
      [...item.symptomsEn, ...item.symptomsZh].some((term) => term.toLowerCase() === node.label.toLowerCase()));
    return area && focusedAreas.includes(area) ? [[node.id, toArea(area.id), "link"] as MapEdge] : [];
  });
  const chartNodes: MapNode[] = [
    ...patient.allergies.map((item) => ({
      id: "allergy:" + item.id,
      label: item.substance,
      detail: en ? "Allergy" : "過敏",
      state: "alert" as const,
      onSelect: () => setChartOpen(true),
    })),
    ...patient.problems.map((item) => ({
      id: "problem:" + item.id,
      label: item.description,
      detail: en ? "Ongoing problem" : "持續健康問題",
      state: "context" as const,
      onSelect: () => setChartOpen(true),
    })),
    ...(rhythmVisit ? [{
      id: "prior:" + rhythmVisit.id,
      label: en ? "Earlier palpitations visit" : "過往心悸診症",
      detail: rhythmVisit.date,
      state: "context" as const,
      onSelect: () => { setPreviousId(rhythmVisit.id); setChartOpen(true); },
    }] : []),
  ];
  const chartEdges: MapEdge[] = palpitations ? [
    ...(rhythmProblem ? [["problem:" + rhythmProblem.id, toArea("cardiac"), "link"] as MapEdge] : []),
    ...(rhythmVisit ? [["prior:" + rhythmVisit.id, toArea("cardiac"), "link"] as MapEdge] : []),
  ] : [];
  const areaNodes: MapNode[] = linkedAreas.map((area) => ({
    id: toArea(area.id),
    label: area.label,
    detail: area.detail,
    state: area.state === "attention" ? "open" : "done",
    onSelect: area.onSelect,
  }));
  const notAsked = en ? "Not asked yet" : "尚未查問";
  const findingNodes: MapNode[] = [];
  const findingEdges: MapEdge[] = [];
  const addFinding = (areaId: string, id: string, label: string, answer: string | null) => {
    findingNodes.push({
      id, label, detail: answer ?? notAsked, state: answer ? "done" : "open",
      onSelect: () => openArea(areaId),
    });
    findingEdges.push([toArea(areaId), id, "link"]);
  };
  for (const area of focusedAreas) {
    if (area.id === "respiratory") {
      for (const finding of respiratoryFindings)
        addFinding("respiratory", "finding:" + finding.en, en ? finding.en : finding.zh,
          answerOf(note.history, [finding.en + " · ", finding.zh + " · "]));
    } else if (area.id === "cardiac") {
      addFinding("cardiac", "finding:started", en ? "Onset" : "開始時間",
        answerOf(note.history, palpitationPrefixes.started));
      if (recordedRhythmContext)
        addFinding("cardiac", "finding:compared", en ? "Compared with prior rhythm" : "與過往心律比較",
          answerOf(note.history, palpitationPrefixes.compared));
    } else {
      const reviewed = ["Reviewed " + area.en.toLowerCase() + " history", "已查問" + area.zh + "病史"];
      addFinding(area.id, "finding:" + area.id, en ? area.en + " history" : area.zh + "病史",
        hasLine(note.history, (line) => reviewed.includes(line)) ? (en ? "Reviewed" : "已查問") : null
    );
    }
  }
  const disposition = answerOf(note.examination, ["Disposition · ", "處置 · "]);
  const urgencyNode: MapNode = {
    id: "finding:urgency",
    label: en ? "Urgency" : "緊急程度",
    detail: disposition ?? notAsked,
    state: disposition ? "done" : "open",
    onSelect: () => openStage(1, "urgency-review"),
  };
  const vitalsNode: MapNode = {
    id: "finding:vitals",
    label: c.vitals,
    detail: vitalCount
      ? Object.entries(vitalDefinitions).filter(([key]) => vitals[key]?.trim()).slice(0, 2)
        .map(([key, item]) => (en ? item.label : item.zh) + " " + vitals[key]).join(" · ")
        + (vitalCount > 2 ? (en ? ` +${vitalCount - 2} more` : ` 另 ${vitalCount - 2} 項`) : "")
      : (en ? "None recorded" : "未記錄"),
    state: vitalCount ? "done" : "empty",
    onSelect: () => openStage(1, "vitals-heading"),
  };
  const diagnosisLines = diagnoses.split("\n").map((line) => line.trim()).filter(Boolean);
  const diagnosisNodes: MapNode[] = diagnosisLines.length
    ? diagnosisLines.map((line, index) => ({
      id: "dx:" + index, label: line, state: "done" as const, onSelect: () => openStage(2, "diagnoses"),
    }))
    : [{
      id: "dx:none",
      label: note.assessment.trim() ? (en ? "Assessment recorded" : "已記錄評估") : (en ? "Not recorded" : "未記錄"),
      detail: note.assessment.trim() ? note.assessment.trim().split("\n")[0].slice(0, 60) : (en ? "Required to complete" : "完成前必填"),
      state: note.assessment.trim() ? "done" : "empty",
      onSelect: () => openStage(2, "assessment"),
    }];
  const prescribed = prescriptions.map((rx) => medications.find((item) => item.id === rx.medicationId)?.name).filter(Boolean);
  const planNodes: MapNode[] = [
    {
      id: "plan:plan",
      label: c.plan,
      detail: note.plan.trim() ? note.plan.trim().split("\n")[0].slice(0, 60) : (en ? "Required to complete" : "完成前必填"),
      state: note.plan.trim() ? "done" : "empty",
      onSelect: () => openStage(3, "treatment-heading"),
    },
    {
      id: "plan:rx",
      label: c.prescriptions,
      detail: prescriptions.length
        ? (incompleteRx ? (en ? `${incompleteRx} incomplete` : `${incompleteRx} 項未完成`) : prescribed.join(", "))
        : withheld.length ? (en ? `None · ${withheld.length} excluded by chart rules` : `沒有 · ${withheld.length} 項被病歷規則排除`)
          : (en ? "None" : "沒有"),
      state: prescriptions.length ? (incompleteRx ? "open" : "done") : "empty",
      onSelect: () => openStage(3, "prescriptions-heading"),
    },
    {
      id: "plan:follow",
      label: c.followUp,
      detail: note.followUp.trim() ? note.followUp.trim().split("\n")[0].slice(0, 60) : (en ? "Not recorded" : "未記錄"),
      state: note.followUp.trim() ? "done" : "empty",
      onSelect: () => openStage(3, "follow-up-heading"),
    },
  ];
  const answered = [...findingNodes, urgencyNode, vitalsNode].filter((node) => node.state === "done");
  const evidenceEdges: MapEdge[] = diagnosisNodes[0].state === "done"
    ? diagnosisNodes.flatMap((dx) => answered.map((node) => [node.id, dx.id, "evidence"] as MapEdge))
    : [];
  const planEdges: MapEdge[] = diagnosisNodes[0].state === "done"
    ? diagnosisNodes.flatMap((dx) => planNodes.filter((node) => node.state !== "empty")
      .map((node) => [dx.id, node.id, "link"] as MapEdge))
    : [];
  const cautionEdges: MapEdge[] = patient.allergies.map((item) => ["allergy:" + item.id, "plan:rx", "caution"] as MapEdge);
  const mapColumns: MapColumn[] = [
    {
      id: "presentation",
      title: en ? "Presentation" : "就診資料",
      groups: [
        {
          title: en ? "Today" : "今日",
          nodes: symptomNodes.length ? symptomNodes : [{
            id: "symptom:none", label: en ? "No symptoms recorded" : "未記錄症狀",
            state: "empty", onSelect: () => openStage(0, "presenting-complaint-heading"),
          }],
        },
        ...(chartNodes.length ? [{ title: en ? "From the chart" : "病歷資料", nodes: chartNodes }] : []),
      ],
    },
    {
      id: "areas",
      title: en ? "Body areas" : "身體範疇",
      groups: [{
        nodes: areaNodes.length ? areaNodes : [{
          id: "area:none", label: en ? "None linked" : "未連結範疇",
          detail: en ? "Record symptoms to link areas" : "記錄症狀以連結範疇",
          state: "empty", onSelect: () => openStage(0, "presenting-complaint-heading"),
        }],
      }],
    },
    {
      id: "findings",
      title: en ? "Findings" : "臨床所見",
      groups: [
        ...(findingNodes.length ? [{ title: en ? "Focused history" : "重點病史", nodes: findingNodes }] : []),
        { title: en ? "Assessment" : "評估", nodes: [urgencyNode, vitalsNode] },
      ],
    },
    { id: "diagnosis", title: en ? "Working diagnosis" : "初步診斷", groups: [{ nodes: diagnosisNodes }] },
    { id: "plan", title: en ? "Plan" : "診療計劃", groups: [{ nodes: planNodes }] },
  ];
  const mapEdges: MapEdge[] = [...symptomEdges, ...chartEdges, ...findingEdges, ...evidenceEdges, ...planEdges, ...cautionEdges];

  function field(key: keyof Note, label = c[key]) {
    return <label className="reasoning-field" htmlFor={key}>{label}
      <textarea id={key} rows={4} maxLength={20000} value={note[key]}
        onChange={(event) => updateNote(key, event.target.value)} />
    </label>;
  }
  function updateNote(field: keyof Note, value: string) {
    setNote({ ...note, [field]: value });
    changed();
  }
  function updatePrescription(index: number, field: keyof Prescription, value: string) {
    setPrescriptions((rows) => rows.map((row, position) =>
      position === index ? { ...row, [field]: value } : row,
    ));
    changed();
  }

  function updateVital(key: string, value: string) {
    setVitals((values) => ({ ...values, [key]: value }));
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
  useEffect(() => {
    if (!chartOpen) return;
    chartClose.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setChartOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [chartOpen]);
  function changed() {
    setDirty(true);
    setSaved(false);
    setError(null);
  }
  async function save(intent: Consultation["intent"]) {
    if (pending) return;
    if (prescriptions.some((item) => !item.medicationId)) {
      setError(en ? "Choose a medicine or remove the empty prescription." : "請選擇藥物或移除空白處方。");
      openStage(3, "prescriptions-heading");
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

  const age = ageFrom(patient.birth_date);
  const sex = patient.sex === "female" ? copy.female : patient.sex === "male" ? copy.male
    : patient.sex === "other" ? copy.other : copy.unknown;
  const shownProblems = patient.problems.slice(0, 2);
  const selected = previous.find((item) => item.id === previousId);
  const statusText = pending ? c.saving : saved ? c.saved : dirty ? c.unsaved : c.draft;

  return (
    <div className="consult" data-view={view} data-chart-open={chartOpen || undefined}>
      <header className="consult-bar" aria-label={c.demographics}>
        <Link href={"/patients/" + patient.id} className="consult-back" aria-label={c.back}>
          <ArrowLeft size={22} aria-hidden="true" />
        </Link>
        <div className="consult-who">
          <h1>{patient.name}</h1>
          <p>
            <span>{patient.chart_number}</span>
            <span>{age !== null ? (en ? age + " y" : age + " 歲") : patient.birth_date}</span>
            <span>{sex}</span>
          </p>
        </div>
        <ul className="consult-flags" aria-label={en ? "Chart alerts" : "病歷提示"}>
          {patient.allergies.length ? patient.allergies.map((item) => (
            <li key={item.id} className="flag-allergy">
              <ShieldAlert size={16} aria-hidden="true" />
              <span className="sr-only">{c.allergies}: </span>{item.substance}
            </li>
          )) : (
            <li className="flag-quiet">{en ? "No allergies recorded" : "未有過敏紀錄"}</li>
          )}
          {shownProblems.map((item) => <li key={item.id}>{item.description}</li>)}
          {patient.problems.length > shownProblems.length && (
            <li>+{patient.problems.length - shownProblems.length}</li>
          )}
        </ul>
        <span className={"consult-save" + (saved ? " saved" : dirty ? " dirty" : "")} aria-live="polite" title={c.savedHint}>
          {saved ? <Check size={16} aria-hidden="true" /> : <Clock3 size={16} aria-hidden="true" />}
          {statusText}
        </span>
        <button type="button" className="consult-chart-toggle" aria-expanded={chartOpen}
          aria-controls="visit-reference" onClick={() => setChartOpen(true)}>
          <BookOpen size={20} aria-hidden="true" />
          {en ? "Chart" : "病歷"}
        </button>
      </header>

      <div className="consult-grid">
        <ConsultRail locale={locale} steps={steps} stage={stage} onStep={(index) => openStage(index)}
          linked={linkedAreas} others={otherAreas} />

        <form
          ref={(node) => { formRef.current = node; noteRef.current = node; }}
          id="consultation-form"
          className="consult-note"
          onInvalidCapture={(event) => {
            setView("note");
            const input = event.target as HTMLInputElement;
            if (input.closest(".vitals-block")) setVitalsOpen(true);
            const section = input.closest("section[data-stage]");
            if (section instanceof HTMLElement && section.hidden) {
              event.preventDefault();
              setStage(Number(section.dataset.stage));
              requestAnimationFrame(() => { input.focus(); input.reportValidity(); });
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void save("draft");
          }}
        >
          <div className="consult-step-head">
            <h2 tabIndex={-1}>{view === "map" ? (en ? "Consultation map" : "診症流程圖") : stages[stage]}</h2>
            {view === "note" && <span>{en ? `Step ${stage + 1} of ${stages.length}` : `第 ${stage + 1} / ${stages.length} 步`}</span>}
            <div className="view-switch" role="group" aria-label={en ? "View" : "檢視"}>
              <button type="button" aria-pressed={view === "note"} onClick={() => setView("note")}>
                {en ? "Note" : "病歷"}
              </button>
              <button type="button" aria-pressed={view === "map"} onClick={() => { setView("map"); window.scrollTo({ top: 0 }); }}>
                {en ? "Map" : "流程圖"}
              </button>
            </div>
          </div>
          {view === "map" && <ConsultMap locale={locale} columns={mapColumns} edges={mapEdges} />}
          <fieldset disabled={pending} className="consult-fields" hidden={view === "map"}>

            <section hidden={stage !== 0} data-stage="0" id="visit-complaint" className="consult-section">
              <div className="section-title">
                <h3 id="presenting-complaint-heading" tabIndex={-1}>{c.complaint}</h3>
                <span className="tag-required">{c.required}</span>
              </div>
              <p className="section-help">{en ? "Tap every symptom the patient describes. Each one links its body area in the steps list."
                : "點選病人描述的所有症狀，相關身體範疇會在步驟列表中標示。"}</p>
              <div className="symptom-groups">
                {symptomGroups.map((group) => (
                  <VisitChoices key={group.id} title={group.label} options={group.options}
                    aliases={group.aliases} separator=" · " value={note.complaint} onChange={(value) => updateNote("complaint", value)} />
                ))}
              </div>
              <label className="reasoning-field" htmlFor="complaint">
                {en ? "Complaint as recorded" : "已記錄的主訴"}
                <input
                  id="complaint"
                  maxLength={20000}
                  placeholder={en ? "Add anything else in the patient’s words" : "以病人的說法補充其他內容"}
                  value={note.complaint}
                  onChange={(event) => updateNote("complaint", event.target.value)}
                />
              </label>
            </section>

            <section hidden={stage !== 1} data-stage="1" className="consult-section">
              <h3 id="urgency-review" tabIndex={-1}>{en ? "Urgency and complication review" : "緊急程度及併發症評估"}</h3>
              <VisitChoices title={en ? "Clinician’s disposition" : "醫生的處置判斷"}
                prefix={en ? "Disposition · " : "處置 · "} exclusive
                options={en ? ["Routine assessment", "Urgent assessment", "Emergency escalation"]
                  : ["常規評估", "緊急評估", "即時轉介急症"]}
                value={note.examination} onChange={(value) => updateNote("examination", value)} />
              <VisitChoices title={en ? "Complication review" : "併發症評估"}
                prefix={en ? "Complication review · " : "併發症評估 · "} exclusive
                options={en ? ["Concern identified", "No concern documented after review", "Assessment pending"]
                  : ["發現疑慮", "評估後未記錄疑慮", "待評估"]}
                value={note.examination} onChange={(value) => updateNote("examination", value)} />
            </section>
            <section hidden={stage !== 1} data-stage="1" className="consult-section">
              <h3 id="focused-history" tabIndex={-1}>{en ? "Focused history and examination" : "重點病史及檢查"}</h3>
              {focusedAreas.length === 0 && (
                <p className="section-help">{en ? "No body area is linked yet. Record symptoms first, or open an area from the steps list."
                  : "尚未連結身體範疇。請先記錄症狀，或在步驟列表開啟範疇。"}</p>
              )}
              {respiratory && (
                <div className="area-block" data-open={missingFindings.length > 0 || undefined}>
                  <h4 id="respiratory-questions" tabIndex={-1}>{en ? "Respiratory" : "呼吸系統"}</h4>
                  {respiratoryFindings.map((finding) => {
                    const label = en ? finding.en : finding.zh;
                    return (
                      <VisitChoices key={finding.en} title={label} prefix={label + " · "} exclusive
                        options={en ? ["Reported", "Denied"] : ["有", "否認"]}
                        value={note.history} onChange={(value) => updateNote("history", value)} />
                    );
                  })}
                </div>
              )}
              {palpitations && (
                <div className="area-block" data-open={areaOpenQuestions("cardiac") > 0 || undefined}>
                  <h4 id="palpitation-questions" tabIndex={-1}>{en ? "Palpitations" : "心悸"}</h4>
                  <div className="chart-link" role="note">
                    <History size={18} aria-hidden="true" />
                    <div>
                      <strong>{en ? "From this chart" : "病歷資料"}</strong>
                      {rhythmProblem && <p>{en ? "Active condition: " : "持續健康問題："}{rhythmProblem.description}</p>}
                      {rhythmVisit && <p>{en ? "Palpitations visit on " : "過往心悸診症："}{rhythmVisit.date}</p>}
                      {!recordedRhythmContext && <p>{en ? "No rhythm condition or earlier palpitations visit recorded."
                        : "病歷中未有心律問題或過往心悸診症紀錄。"}</p>}
                    </div>
                    {rhythmVisit && (
                      <button type="button" className="button secondary" onClick={() => {
                        setPreviousId(rhythmVisit.id);
                        setChartOpen(true);
                        requestAnimationFrame(() => document.getElementById("previous-" + rhythmVisit.id)?.scrollIntoView({ block: "nearest" }));
                      }}>{en ? "Open visit" : "查看診症"}</button>
                    )}
                  </div>
                  <VisitChoices title={en ? "When did the palpitations start?" : "心悸何時開始？"}
                    prefix={palpitationPrefixes.started[en ? 0 : 1]} exclusive
                    options={en ? ["Today", "This week", "More than one week ago"] : ["今天", "本週", "一週前"]}
                    value={note.history} onChange={(value) => updateNote("history", value)} />
                  {recordedRhythmContext && (
                    <VisitChoices title={en ? "Compared with the previous rhythm history" : "與過往心律病史比較"}
                      prefix={palpitationPrefixes.compared[en ? 0 : 1]} exclusive
                      options={en ? ["Similar", "Different", "Unclear"] : ["相似", "不同", "未能確定"]}
                      value={note.history} onChange={(value) => updateNote("history", value)} />
                  )}
                </div>
              )}
              {focusedAreas.filter((area) => area.id !== "respiratory" && area.id !== "cardiac").map((area) => (
                <div key={area.id} className="area-block" data-open={areaOpenQuestions(area.id) > 0 || undefined}>
                  <h4 id={"area-" + area.id} tabIndex={-1}>{en ? area.en : area.zh}</h4>
                  <p className="section-help">{en ? area.detailEn : area.detailZh}</p>
                  <VisitChoices title={en ? "History reviewed" : "已查問病史"}
                    options={[en ? "Reviewed " + area.en.toLowerCase() + " history" : "已查問" + area.zh + "病史"]}
                    value={note.history} onChange={(value) => updateNote("history", value)} />
                </div>
              ))}
              <VisitChoices title={en ? "Symptom course" : "症狀變化"} prefix={en ? "Course · " : "病程 · "} exclusive
                options={en ? ["Improving", "Unchanged", "Worsening"] : ["好轉", "無變化", "惡化"]}
                value={note.history} onChange={(value) => updateNote("history", value)} />
              {field("history")}{field("examination")}
            </section>
            <section hidden={stage !== 1} data-stage="1" id="visit-vitals" className="consult-section">
              <details className="vitals-block" open={vitalsOpen}
                onToggle={(event) => setVitalsOpen((event.currentTarget as HTMLDetailsElement).open)}>
              <summary id="vitals-heading" tabIndex={-1}>
                <h3>{c.vitals}</h3>
                <span className="tag-optional">{c.optional}</span>
                <span className="vitals-recorded">
                  {vitalCount
                    ? Object.entries(vitalDefinitions).filter(([key]) => vitals[key]?.trim())
                      .map(([key, item]) => (en ? item.label : item.zh) + " " + vitals[key]).join(" · ")
                    : (en ? "None recorded" : "未記錄")}
                </span>
              </summary>
              <div className="vitals-grid">
                {Object.entries(vitalDefinitions).map(([key, definition]) => {
                  const before = lastVitals?.vitals.find((item) => item.code === key);
                  return (
                    <div key={key} className="vital-card">
                      <label htmlFor={"vital-" + key}>{en ? definition.label : definition.zh}</label>
                      <div className="vital-entry">
                        <input id={"vital-" + key} type="number" inputMode="decimal" step="any"
                          min={definition.min} max={definition.max}
                          value={vitals[key] ?? ""}
                          onChange={(event) => updateVital(key, event.target.value)} />
                        <span className="vital-unit">{definition.unit}</span>
                        <TouchNumber id={"vital-" + key} label={(en ? definition.label : definition.zh) + " (" + definition.unit + ")"}
                          value={vitals[key] ?? ""} locale={locale} min={definition.min} max={definition.max}
                          onChange={(value) => updateVital(key, value)} />
                      </div>
                      <div className="vital-meta">
                        {referenceRange(key as Vital) && (
                          <span>{en ? "Ref" : "參考"} <data>{referenceRange(key as Vital)}</data></span>
                        )}
                        {before && <span>{en ? "Last" : "上次"} <data>{before.value}</data></span>}
                        {vitals[key]?.trim() && referenceFlag(key as Vital, Number(vitals[key])) && (
                          <strong className="vital-flag" data-flag={referenceFlag(key as Vital, Number(vitals[key]))}>
                            {referenceFlag(key as Vital, Number(vitals[key])) === "H" ? (en ? "High" : "偏高") : (en ? "Low" : "偏低")}
                          </strong>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {chartVisits.length > 0 && (
                <details className="visit-trends">
                  <summary>{en ? "Compare previous vitals" : "比較過往生命表徵"}</summary>
                  <ClinicalTrend visits={chartVisits} locale={locale} />
                </details>
              )}
              </details>
            </section>

            <section hidden={stage !== 2} data-stage="2" id="visit-diagnoses" className="consult-section">
              <VisitChoices title={en ? "Body system under consideration" : "考慮涉及的身體系統"}
                prefix={en ? "Body system · " : "身體系統 · "}
                options={en ? ["Respiratory", "Cardiovascular", "Digestive", "Neurological", "Musculoskeletal"]
                  : ["呼吸系統", "心血管系統", "消化系統", "神經系統", "肌肉骨骼系統"]}
                value={note.assessment} onChange={(value) => updateNote("assessment", value)} />
              <VisitChoices title={en ? "Possible mechanism" : "可能的病理機制"}
                prefix={en ? "Possible mechanism · " : "可能機制 · "}
                options={en ? ["Infection", "Inflammation", "Trauma", "Neoplasm"]
                  : ["感染", "發炎", "創傷", "腫瘤"]}
                value={note.assessment} onChange={(value) => updateNote("assessment", value)} />
              <VisitChoices title={en ? "Diagnostic uncertainty" : "診斷不確定性"}
                options={en ? ["Cause remains uncertain"] : ["病因尚未確定"]}
                value={note.assessment} onChange={(value) => updateNote("assessment", value)} />
              {field("assessment", en ? "Working diagnosis, evidence for and against, and alternatives" : "初步診斷、支持及反對證據與其他可能")}
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
              <label htmlFor="diagnoses" className="reasoning-field">
                {c.diagnoses}
                <span className="field-help">{c.diagnosisHelp}</span>
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
              </label>
            </section>

            <section hidden={stage !== 3} data-stage="3" id="visit-plan" className="consult-section">
              <h3 id="investigation-heading" tabIndex={-1}>{en ? "Investigations" : "檢查"}</h3>
              <VisitChoices title={en ? "Planned investigations" : "擬安排檢查"}
                options={en ? ["Full blood count", "Chest X-ray", "Urinalysis"] : ["全血計數", "胸部 X 光", "尿液分析"]}
                value={note.plan} onChange={(value) => updateNote("plan", value)} />
            </section>
            <section hidden={stage !== 3} data-stage="3" className="consult-section">
              <h3 id="treatment-heading" tabIndex={-1}>{en ? "Treatment and referral" : "治療及轉介"}</h3>
              <VisitChoices title={en ? "Management discussed" : "已討論的處理安排"}
                options={en ? ["Treatment options discussed", "Observation agreed", "Referral discussed"]
                  : ["已討論治療選項", "已同意觀察", "已討論轉介"]}
                value={note.plan} onChange={(value) => updateNote("plan", value)} />
              {field("plan")}
            </section>
            <section hidden={stage !== 3} data-stage="3" className="consult-section">
              <h3 id="follow-up-heading" tabIndex={-1}>{en ? "Follow-up and safety net" : "跟進及求醫指示"}</h3>
              <VisitChoices title={en ? "Follow-up plan" : "跟進安排"}
                options={en ? ["Review pending results", "Arrange reassessment"] : ["覆核待查結果", "安排再次評估"]}
                value={note.followUp} onChange={(value) => updateNote("followUp", value)} />
              {field("followUp", en ? "Follow-up, pending results and when to seek help" : "覆診、待查結果及求醫指示")}
            </section>
            <section hidden={stage !== 3} data-stage="3" id="visit-prescriptions" className="consult-section">
              <h3 id="prescriptions-heading" tabIndex={-1}>{c.prescriptions}</h3>
              {withheld.length > 0 && (
                <details className="rule-note" open>
                  <summary>{en ? "Medicines excluded by chart rules" : "病歷規則已排除的藥物"}</summary>
                  <ul>
                    {withheld.map((rule) => (
                      <li key={rule.id + rule.reason}><strong>{rule.name}</strong><p>{rule.reason}</p></li>
                    ))}
                  </ul>
                </details>
              )}
              {!prescriptions.length && (
                <p className="section-help">{c.noPrescription}</p>
              )}
              <div className="prescription-list">
                {prescriptions.map((item, index) => (
                  <div className="rx-card" key={index}>
                    <div className="rx-top">
                      <span className="rx-number" aria-hidden="true">{index + 1}</span>
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
                      <button
                        type="button"
                        className="icon-button danger"
                        aria-label={c.remove + " " + c.medicine + " " + (index + 1)}
                        onClick={() => {
                          setPrescriptions(prescriptions.filter((_, i) => i !== index));
                          changed();
                        }}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    {withheld.some((rule) => rule.id === item.medicationId) && (
                      <p className="error-message" role="alert">
                        {withheld.find((rule) => rule.id === item.medicationId)?.name} · {c.blocked}
                      </p>
                    )}
                    <div className="rx-fields">
                      <div>
                        <label htmlFor={"dose-" + index}>{c.dose}</label>
                        <div className="vital-entry">
                          <input id={"dose-" + index} maxLength={2000} value={item.dose}
                            onChange={(event) => updatePrescription(index, "dose", event.target.value)} />
                          <TouchNumber id={"dose-" + index} label={c.dose} value={item.dose}
                            locale={locale} units={doseUnits}
                            onChange={(value) => updatePrescription(index, "dose", value)} />
                        </div>
                      </div>
                      {(["route", "frequency"] as const).map((key) => {
                        const id = key + "-" + index;
                        return (
                          <div key={key} className={key + "-choices"}>
                            <label htmlFor={id}>{c[key]}</label>
                            <div className="rx-quick" role="group" aria-label={c[key]}>
                              {quickChoices[key].map((option) => (
                                <button type="button" key={option} aria-pressed={item[key] === option}
                                  onClick={() => updatePrescription(index, key, option)}>{option}</button>
                              ))}
                              <select aria-label={(en ? "More " : "更多") + c[key].toLocaleLowerCase()}
                                value={prescriptionChoices[key].includes(item[key]) && !quickChoices[key].includes(item[key]) ? item[key] : ""}
                                onChange={(event) => updatePrescription(index, key, event.target.value)}>
                                <option value="" disabled>{en ? "More…" : "更多…"}</option>
                                {prescriptionChoices[key].filter((option) => !quickChoices[key].includes(option))
                                  .map((option) => <option key={option}>{option}</option>)}
                              </select>
                            </div>
                            <input id={id} maxLength={2000} value={item[key]}
                              placeholder={en ? "Or type an instruction" : "或輸入指示"}
                              onChange={(event) => updatePrescription(index, key, event.target.value)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {available.length ? (
                <button
                  type="button"
                  className="button secondary add-rx"
                  onClick={() => {
                    setPrescriptions([
                      ...prescriptions,
                      { medicationId: "", dose: "", route: "", frequency: "" },
                    ]);
                    changed();
                  }}
                >
                  <Plus size={18} />
                  {c.addPrescription}
                </button>
              ) : (
                <p className="field-help">{c.noMedicine}</p>
              )}
            </section>

            {stage === 4 && <section data-stage="4" className="consult-section">
              {reviewItems.length > 0 ? (
                <div className="review-missing" role="status">
                  <strong>{en ? "Required before completing" : "完成前必須填寫"}</strong>
                  <ul>
                    {reviewItems.map((item) => (
                      <li key={item.id}>
                        <button type="button" onClick={() => openStage(item.step, item.id)}>
                          <span>{item.label}</span>
                          <span className="review-add">{en ? "Add" : "加入"} <ArrowRight size={16} aria-hidden="true" /></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="review-ready" role="status"><Check size={18} aria-hidden="true" />
                  {en ? "All required parts are recorded. Check the summary, then complete the visit."
                    : "所有必填部分已記錄。請核對摘要，然後完成診症。"}</p>
              )}
              {missingFindings.length > 0 && respiratory && (
                <div className="review-prompt">
                  <p><strong>{en ? "Respiratory questions not asked: " : "未查問的呼吸系統問題："}</strong>
                    {missingFindings.join(en ? ", " : "、")}</p>
                  <button type="button" className="button secondary"
                    onClick={() => openStage(1)}>{en ? "Ask now" : "現在查問"}</button>
                </div>
              )}
              <dl className="visit-summary">
                {[[c.complaint,note.complaint,0],[c.history,note.history,1],[c.examination,note.examination,1],
                  [c.vitals,Object.entries(vitalDefinitions).filter(([key]) => vitals[key]).map(([key,v]) => (en ? v.label : v.zh) + " " + vitals[key] + " " + v.unit).join(" · "),1],
                  [c.assessment,note.assessment,2],[c.diagnoses,diagnoses,2],[c.plan,note.plan,3],
                  [c.prescriptions,prescriptions.map((rx) => [medications.find((m) => m.id === rx.medicationId)?.name,rx.dose,rx.route,rx.frequency].filter(Boolean).join(" · ")).join("\n"),3],
                  [c.followUp,note.followUp,3]].map(([label,value,index]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd data-empty={!value || undefined}>{value || (en ? "Not recorded" : "未記錄")}</dd>
                      <button type="button" onClick={() => openStage(Number(index))}>
                        {en ? "Edit" : "編輯"}<span className="sr-only"> {label}</span>
                      </button>
                    </div>
                  ))}
              </dl>
            </section>}
          </fieldset>

          <div className="consult-actions">
            {stage > 0 && (
              <button type="button" className="button secondary back-step" disabled={pending} onClick={() => openStage(stage - 1)}>
                <ArrowLeft size={18} aria-hidden="true" />
                {stages[stage - 1]}
              </button>
            )}
            {error ? <p className="error-message" role="alert">{error}</p> : <span className="consult-actions-spacer" />}
            <button type="submit" className="button secondary" disabled={pending}>
              {c.saveDraft}
            </button>
            {stage < 4 ? (
              <button type="button" className="button primary" disabled={pending} onClick={() => openStage(stage + 1)}>
                {stages[stage + 1]}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="button primary complete" disabled={pending || reviewItems.length > 0}
                onClick={() => void save("complete")}>
                <Check size={18} aria-hidden="true" />
                {c.complete}
              </button>
            )}
          </div>
        </form>

        <aside id="visit-reference" className="consult-chart" aria-label={en ? "Patient chart" : "病人病歷"}>
          <div className="consult-chart-head">
            <h2>{en ? "Chart" : "病歷"}</h2>
            <button ref={chartClose} type="button" className="icon-button" aria-label={en ? "Close chart" : "關閉病歷"}
              onClick={() => setChartOpen(false)}>
              <X size={22} />
            </button>
          </div>
          {context}
          {lastVitals && (
            <section className="panel">
              <div className="panel-heading">
                <h2>{en ? "Last vitals" : "上次生命表徵"}</h2>
                <span className="count">{lastVitals.date}</span>
              </div>
              <dl className="chart-vitals">
                {lastVitals.vitals.map((item) => {
                  const definition = vitalDefinitions[item.code];
                  return (
                    <div key={item.code}>
                      <dt>{en ? definition.label : definition.zh}</dt>
                      <dd>{item.value} <small>{item.unit}</small></dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          )}
          <section className="panel">
            <div className="panel-heading">
              <h2 id="reference-history-heading" tabIndex={-1}>{c.visits}</h2>
              <span className="count">{previous.length}</span>
            </div>
            {previous.length ? (
              <ul className="previous-visits">
                {previous.map((item) => (
                  <li key={item.id} id={"previous-" + item.id}>
                    <button type="button" aria-expanded={previousId === item.id}
                      onClick={() => setPreviousId(previousId === item.id ? null : item.id)}>
                      <strong>{item.date}</strong>
                      <span>{item.note.complaint || c.consultation}</span>
                    </button>
                    {selected?.id === item.id && (
                      <div className="reference-record">
                        <VisitRecord visit={selected} locale={locale} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-copy">{c.noVisits}</p>
            )}
          </section>
        </aside>
        <button type="button" className="consult-scrim" tabIndex={-1} aria-hidden="true"
          onClick={() => setChartOpen(false)} />
      </div>
    </div>
  );
}
