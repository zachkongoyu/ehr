import type { QueryResultRow } from "pg";

export interface Connection {
  query<Row extends QueryResultRow>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: Row[] }>;
}

export const noteFields = [
  "complaint",
  "history",
  "examination",
  "assessment",
  "plan",
  "followUp",
] as const;
export type Note = Record<(typeof noteFields)[number], string>;
export const vitalDefinitions = {
  systolic: {
    label: "Systolic BP",
    zh: "收縮壓",
    unit: "mmHg",
    min: 1,
    max: 400,
  },
  diastolic: {
    label: "Diastolic BP",
    zh: "舒張壓",
    unit: "mmHg",
    min: 1,
    max: 300,
  },
  pulse: { label: "Pulse", zh: "脈搏", unit: "/min", min: 1, max: 400 },
  temperature: {
    label: "Temperature",
    zh: "體溫",
    unit: "°C",
    min: 20,
    max: 50,
  },
  respiratory: {
    label: "Respiratory rate",
    zh: "呼吸頻率",
    unit: "/min",
    min: 1,
    max: 150,
  },
  oxygen: {
    label: "Oxygen saturation",
    zh: "血氧飽和度",
    unit: "%",
    min: 1,
    max: 100,
  },
  weight: { label: "Weight", zh: "體重", unit: "kg", min: 0.1, max: 1000 },
  height: { label: "Height", zh: "身高", unit: "cm", min: 1, max: 300 },
} as const;
export type Vital = keyof typeof vitalDefinitions;
export type Prescription = {
  medicationId: string;
  dose: string;
  route: string;
  frequency: string;
};
export type Consultation = {
  patientId: string;
  visitId: string;
  version: number;
  intent: "draft" | "complete";
  note: Note;
  vitals: Partial<Record<Vital, number>>;
  diagnoses: string[];
  prescriptions: Prescription[];
};

export class ChartError extends Error {
  code: "invalid" | "closed" | "conflict" | "blocked";
  constructor(code: ChartError["code"]) {
    super(code);
    this.code = code;
  }
}

function text(value: unknown): string {
  if (typeof value !== "string" || value.length > 20000)
    throw new ChartError("invalid");
  return value.trim();
}

export function parseConsultation(value: unknown): Consultation {
  if (
    !value ||
    typeof value !== "object" ||
    !("patientId" in value) ||
    !("visitId" in value) ||
    !("version" in value) ||
    !("intent" in value) ||
    !("note" in value) ||
    !("vitals" in value) ||
    !("diagnoses" in value) ||
    !("prescriptions" in value)
  )
    throw new ChartError("invalid");
  const patientId = text(value.patientId),
    visitId = text(value.visitId);
  if (
    !/^\d+$/.test(patientId) ||
    !/^\d+$/.test(visitId) ||
    !Number.isSafeInteger(value.version) ||
    typeof value.version !== "number" ||
    value.version < 0 ||
    (value.intent !== "draft" && value.intent !== "complete")
  )
    throw new ChartError("invalid");
  const rawNote = value.note;
  if (!rawNote || typeof rawNote !== "object") throw new ChartError("invalid");
  const note: Note = {
    complaint: "",
    history: "",
    examination: "",
    assessment: "",
    plan: "",
    followUp: "",
  };
  for (const field of noteFields) {
    if (!(field in rawNote)) throw new ChartError("invalid");
    note[field] = text(Reflect.get(rawNote, field));
  }
  if (
    value.intent === "complete" &&
    (!note.complaint || !note.assessment || !note.plan)
  )
    throw new ChartError("invalid");
  if (!value.vitals || typeof value.vitals !== "object")
    throw new ChartError("invalid");
  const vitals: Consultation["vitals"] = {};
  for (const key of Object.keys(value.vitals)) {
    if (!Object.hasOwn(vitalDefinitions, key)) throw new ChartError("invalid");
  }
  for (const key of Object.keys(vitalDefinitions)) {
    const field = vitalKey(key);
    const number: unknown = Reflect.get(value.vitals, field);
    if (number === undefined) continue;
    const definition = vitalDefinitions[field];
    if (
      typeof number !== "number" ||
      !Number.isFinite(number) ||
      number < definition.min ||
      number > definition.max
    )
      throw new ChartError("invalid");
    vitals[field] = number;
  }
  if (
    !Array.isArray(value.diagnoses) ||
    value.diagnoses.length > 50 ||
    !Array.isArray(value.prescriptions) ||
    value.prescriptions.length > 50
  )
    throw new ChartError("invalid");
  const diagnoses = [...new Set(value.diagnoses.map(text).filter(Boolean))];
  const prescriptions = value.prescriptions.map(
    (item: unknown): Prescription => {
      if (
        !item ||
        typeof item !== "object" ||
        !("medicationId" in item) ||
        !("dose" in item) ||
        !("route" in item) ||
        !("frequency" in item)
      )
        throw new ChartError("invalid");
      const prescription = {
        medicationId: text(item.medicationId),
        dose: text(item.dose),
        route: text(item.route),
        frequency: text(item.frequency),
      };
      if (
        !/^\d+$/.test(prescription.medicationId) ||
        (value.intent === "complete" &&
          (!prescription.dose ||
            !prescription.route ||
            !prescription.frequency))
      )
        throw new ChartError("invalid");
      return prescription;
    },
  );
  if (
    new Set(prescriptions.map((item) => item.medicationId)).size !==
    prescriptions.length
  )
    throw new ChartError("invalid");
  return {
    patientId,
    visitId,
    version: value.version,
    intent: value.intent,
    note,
    vitals,
    diagnoses,
    prescriptions,
  };
}

export function vitalKey(key: string): Vital {
  switch (key) {
    case "systolic":
    case "diastolic":
    case "pulse":
    case "temperature":
    case "respiratory":
    case "oxygen":
    case "weight":
    case "height":
      return key;
    default:
      throw new ChartError("invalid");
  }
}

export async function writeConsultation(
  db: Connection,
  input: Consultation,
  author: string,
) {
  await db.query("begin");
  try {
    const locked = await db.query<{
      status: string;
      documentation_version: number;
    }>(
      "select status, documentation_version from public.visit where id = $1 and patient_id = $2 for update",
      [input.visitId, input.patientId],
    );
    const visit = locked.rows[0];
    if (!visit || visit.status !== "in-progress")
      throw new ChartError("closed");
    if (visit.documentation_version !== input.version)
      throw new ChartError("conflict");
    for (const prescription of input.prescriptions) {
      const medication = await db.query<{ id: string }>(
        "select id::text from public.medication where id = $1",
        [prescription.medicationId],
      );
      if (!medication.rows[0]) throw new ChartError("invalid");
      const blocked = await db.query(
        `select rule.id from public.medication_withhold_rule rule
         join public.problem on problem.patient_id = $1 and problem.clinical_status = 'active'
          and problem.hkctt_term_id = rule.when_hkctt_term_id
         where rule.withhold_medication_id = $2`,
        [input.patientId, prescription.medicationId],
      );
      if (blocked.rows.length) throw new ChartError("blocked");
    }
    await db.query(
      `insert into public.visit_note (visit_id, complaint, history, examination, assessment, plan, follow_up, author_name)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (visit_id) do update set complaint=excluded.complaint, history=excluded.history,
        examination=excluded.examination, assessment=excluded.assessment, plan=excluded.plan,
        follow_up=excluded.follow_up, author_name=excluded.author_name, updated_at=now()`,
      [
        input.visitId,
        input.note.complaint,
        input.note.history,
        input.note.examination,
        input.note.assessment,
        input.note.plan,
        input.note.followUp,
        author,
      ],
    );
    await db.query("delete from public.visit_observation where visit_id=$1", [
      input.visitId,
    ]);
    for (const key of Object.keys(input.vitals)) {
      const code = vitalKey(key);
      await db.query(
        "insert into public.visit_observation (visit_id, code, value, unit) values ($1,$2,$3,$4)",
        [input.visitId, code, input.vitals[code], vitalDefinitions[code].unit],
      );
    }
    await db.query(
      "delete from public.problem where visit_id=$1 and category='encounter-diagnosis' and not (description=any($2::text[]))",
      [input.visitId, input.diagnoses],
    );
    for (const diagnosis of input.diagnoses) {
      await db.query(
        `insert into public.problem (patient_id,visit_id,category,clinical_status,description,recorded_on)
         select $1,$2,'encounter-diagnosis','active',$3,(now() at time zone 'Asia/Hong_Kong')::date
         where not exists (select 1 from public.problem where visit_id=$2 and category='encounter-diagnosis' and description=$3)`,
        [input.patientId, input.visitId, diagnosis],
      );
    }
    await db.query(
      "delete from public.medication_order where visit_id=$1 and status='draft'",
      [input.visitId],
    );
    for (const prescription of input.prescriptions) {
      await db.query(
        `insert into public.medication_order (patient_id,visit_id,medication_id,status,dose_text,route_text,frequency_text,authored_on)
         values ($1,$2,$3,$4,$5,$6,$7,(now() at time zone 'Asia/Hong_Kong')::date)`,
        [
          input.patientId,
          input.visitId,
          prescription.medicationId,
          input.intent === "complete" ? "active" : "draft",
          prescription.dose,
          prescription.route,
          prescription.frequency,
        ],
      );
    }
    const updated = await db.query<{ documentation_version: number }>(
      `update public.visit set documentation_version=documentation_version+1,
       provider_name=coalesce(provider_name,$2), status=$3,
       ended_at=case when $3='finished' then now() else ended_at end
       where id=$1 returning documentation_version`,
      [
        input.visitId,
        author,
        input.intent === "complete" ? "finished" : "in-progress",
      ],
    );
    await db.query("commit");
    return updated.rows[0].documentation_version;
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
}
