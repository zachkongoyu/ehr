import { getPool } from "@/lib/db";
import { displayName, phrase, t } from "@/lib/copy";
import { intlLocale, type Locale } from "@/lib/locale-shared";
import type { Note, Prescription, Vital } from "@/lib/consultation";

export type Patient = {
  id: string;
  name: string;
  chart_number: string;
  name_text: string;
  family_name: string;
  given_name: string;
  birth_date: string;
  sex: string;
  phone: string | null;
  address: string | null;
  identity_document_type: string | null;
  identity_document_number: string | null;
  ehr_number: string | null;
  last_visit: string | null;
  open_visit: string | null;
};
export type PatientLink = Patient;
export type VisitView = {
  id: string;
  status: string;
  documentation_version: number;
  started_at: string;
  ended_at: string | null;
  provider_name: string | null;
  date: string;
  note: Note;
  vitals: { code: Vital; value: number; unit: string }[];
  diagnoses: { id: string; description: string }[];
  prescriptions: (Prescription & {
    id: string;
    name: string;
    status: string;
  })[];
  answers: { id: string; question: string; answer: string }[];
};

export function formatWhen(value: string | null, locale: Locale) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "Asia/Hong_Kong",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const patientSelect = `
  select patient.id::text, patient.chart_number, patient.name_text, patient.family_name, patient.given_name,
    patient.birth_date::text, patient.sex, patient.phone, patient.address,
    patient.identity_document_type, patient.identity_document_number, patient.ehr_number,
    (select max(started_at)::text from public.visit where patient_id=patient.id) as last_visit,
    (select id::text from public.visit where patient_id=patient.id and status='in-progress' order by started_at desc limit 1) as open_visit
  from public.patient`;

export async function listPatients(
  locale: Locale,
  search = "",
): Promise<Patient[]> {
  const result = await getPool().query<Omit<Patient, "name">>(
    patientSelect +
      `
    where ($1 = '' or concat_ws(' ',name_text,family_name,given_name,chart_number,phone) ilike $2)
    order by chart_number limit 100`,
    [search, "%" + search + "%"],
  );
  return result.rows.map((row) => ({ ...row, name: displayName(locale, row) }));
}

export async function loadHistory(patientId: string, locale: Locale) {
  const db = getPool();
  const result = await db.query<Omit<Patient, "name">>(
    patientSelect + " where patient.id=$1",
    [patientId],
  );
  const patient = result.rows[0];
  if (!patient) return null;
  const [
    visits,
    notes,
    observations,
    problems,
    orders,
    statements,
    answers,
    allergies,
  ] = await Promise.all([
    db.query<{
      id: string;
      status: string;
      documentation_version: number;
      started_at: string;
      ended_at: string | null;
      provider_name: string | null;
    }>(
      "select id::text,status,documentation_version,started_at::text,ended_at::text,provider_name from public.visit where patient_id=$1 order by started_at desc,id desc",
      [patientId],
    ),
    db.query<Note & { visit_id: string; follow_up: string }>(
      "select note.*,note.visit_id::text from public.visit_note note join public.visit on visit.id=note.visit_id where visit.patient_id=$1",
      [patientId],
    ),
    db.query<{ visit_id: string; code: Vital; value: string; unit: string }>(
      "select observation.visit_id::text,code,value::text,unit from public.visit_observation observation join public.visit on visit.id=observation.visit_id where visit.patient_id=$1",
      [patientId],
    ),
    db.query<{
      id: string;
      visit_id: string | null;
      description: string;
      category: string;
      clinical_status: string;
    }>(
      "select id::text,visit_id::text,description,category,clinical_status from public.problem where patient_id=$1 order by recorded_on desc,id desc",
      [patientId],
    ),
    db.query<{
      id: string;
      visit_id: string | null;
      medicationId: string;
      name: string;
      status: string;
      dose: string;
      route: string;
      frequency: string;
    }>(
      `select orders.id::text,visit_id::text,medication_id::text as "medicationId",medication.name,status,coalesce(dose_text,'') as dose,coalesce(route_text,'') as route,coalesce(frequency_text,'') as frequency from public.medication_order orders join public.medication on medication.id=orders.medication_id where patient_id=$1 order by authored_on desc,orders.id desc`,
      [patientId],
    ),
    db.query<{
      id: string;
      name: string;
      dose_text: string | null;
      route_text: string | null;
      frequency_text: string | null;
      status: string;
    }>(
      "select statement.id::text,medication.name,dose_text,route_text,frequency_text,status from public.medication_statement statement join public.medication on medication.id=statement.medication_id where patient_id=$1 and status='active' order by statement.id",
      [patientId],
    ),
    db.query<{
      id: string;
      visit_id: string;
      prompt: string | null;
      link_id: string;
      value_boolean: boolean | null;
      value_coding: string | null;
      value_string: string | null;
      display: string | null;
    }>(
      `select item.id::text,response.visit_id::text,question.prompt,item.link_id,item.value_boolean,item.value_coding,item.value_string,option.display
      from public.questionnaire_response response join public.questionnaire_response_item item on item.response_id=response.id
      left join public.questionnaire_item question on question.questionnaire_id=response.questionnaire_id and question.link_id=item.link_id
      left join public.questionnaire_item_option option on option.item_id=question.id and option.code=item.value_coding
      where response.patient_id=$1 order by response.authored_at desc,question.sequence`,
      [patientId],
    ),
    db.query<{ id: string; substance: string; reaction: string }>(
      "select id::text,substance,reaction from public.patient_allergy where patient_id=$1 order by id",
      [patientId],
    ),
  ]);
  const copy = t(locale);
  return {
    ...patient,
    name: displayName(locale, patient),
    problems: problems.rows
      .filter(
        (row) =>
          row.clinical_status === "active" &&
          row.category === "problem-list-item",
      )
      .map((row) => ({ ...row, description: phrase(locale, row.description) })),
    allergies: allergies.rows,
    medications: statements.rows.map((row) => ({
      ...row,
      name: phrase(locale, row.name),
    })),
    activeOrders: orders.rows
      .filter((row) => row.status === "active")
      .map((row) => ({ ...row, name: phrase(locale, row.name) })),
    visits: visits.rows.map((visit): VisitView => {
      const note = notes.rows.find((row) => row.visit_id === visit.id);
      return {
        ...visit,
        date: formatWhen(visit.started_at, locale),
        note: {
          complaint: note?.complaint ?? "",
          history: note?.history ?? "",
          examination: note?.examination ?? "",
          assessment: note?.assessment ?? "",
          plan: note?.plan ?? "",
          followUp: note?.follow_up ?? "",
        },
        vitals: observations.rows
          .filter((row) => row.visit_id === visit.id)
          .map((row) => ({ ...row, value: Number(row.value) })),
        diagnoses: problems.rows.filter(
          (row) =>
            row.visit_id === visit.id && row.category === "encounter-diagnosis",
        ),
        prescriptions: orders.rows
          .filter((row) => row.visit_id === visit.id)
          .map((row) => ({ ...row, name: phrase(locale, row.name) })),
        answers: answers.rows
          .filter((row) => row.visit_id === visit.id)
          .map((row) => ({
            id: row.id,
            question: phrase(locale, row.prompt ?? row.link_id),
            answer:
              row.value_boolean == null
                ? phrase(
                    locale,
                    row.display ?? row.value_string ?? row.value_coding ?? "—",
                  )
                : row.value_boolean
                  ? copy.yes
                  : copy.no,
          })),
      };
    }),
  };
}
export type PatientChart = NonNullable<Awaited<ReturnType<typeof loadHistory>>>;
export async function listMedications(locale: Locale) {
  const result = await getPool().query<{ id: string; name: string }>(
    "select id::text,name from public.medication order by name",
  );
  return result.rows.map((row) => ({ ...row, name: phrase(locale, row.name) }));
}
