import { phrase, t, displayName, type Copy } from "@/lib/copy";
import { getPool } from "@/lib/db";
import type { EnableWhen } from "@/lib/enable-when";
import { intlLocale, type Locale } from "@/lib/locale-shared";

export type PatientLink = { id: string; name: string };

export type VisitView = {
  id: string;
  iso: string;
  title: string;
  statusLabel: string;
  badge: "neutral" | "info" | "success" | "danger";
  date: string;
  ended: string;
  doctor: string;
  place: string;
  answers: { id: string; question: string; answer: string }[];
};

export type FormOption = { code: string; label: string };

export type FormItem = {
  linkId: string;
  prompt: string;
  type: string;
  required: boolean;
  options: FormOption[];
  enableWhen: EnableWhen[];
  enableBehavior: "all" | "any" | null;
};

export type VisitForm = {
  questionnaireId: string;
  title: string;
  items: FormItem[];
  withheld: { code: string; reason: string }[];
};

type Sql = Record<string, unknown>;

function str(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function formatWhen(value: string, locale: Locale, withTime: boolean) {
  if (!value) return "";
  const date = new Date(value.includes("T") || value.includes("+") ? value : `${value.slice(0, 10)}T12:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function visitBadge(status: string): VisitView["badge"] {
  if (status === "finished") return "success";
  if (status === "in-progress") return "info";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function answerText(
  locale: Locale,
  copy: Copy,
  item: Sql,
  options: Map<string, string>,
) {
  if (item.value_boolean === true) return copy.yes;
  if (item.value_boolean === false) return copy.no;
  if (item.value_coding) {
    return options.get(String(item.value_coding)) ?? phrase(locale, String(item.value_coding));
  }
  if (item.value_string) return phrase(locale, String(item.value_string));
  return copy.empty;
}

export async function listPatients(locale: Locale): Promise<PatientLink[]> {
  const result = await getPool().query<Sql>(
    `select id::text, name_text, family_name, given_name
     from public.patient
     order by chart_number`,
  );
  return result.rows.map((row) => ({
    id: str(row.id),
    name: displayName(locale, {
      name_text: str(row.name_text),
      family_name: str(row.family_name),
      given_name: str(row.given_name),
    }),
  }));
}

export async function loadHistory(patientId: string, locale: Locale) {
  const copy = t(locale);
  const patient = await getPool().query<Sql>(
    `select id::text, name_text, family_name, given_name
     from public.patient where id = $1`,
    [patientId],
  );
  const row = patient.rows[0];
  if (!row) return null;

  const visits = await getPool().query<Sql>(
    `select id::text, status, started_at::text, ended_at::text, provider_name, location_name
     from public.visit
     where patient_id = $1
     order by started_at`,
    [patientId],
  );
  const answers = await getPool().query<Sql>(
    `select response.visit_id::text as visit_id,
            item.id::text,
            item.link_id,
            item.value_boolean,
            item.value_coding,
            item.value_string,
            question.prompt,
            question.sequence
     from public.questionnaire_response response
     join public.questionnaire_response_item item on item.response_id = response.id
     left join public.questionnaire_item question
       on question.questionnaire_id = response.questionnaire_id
      and question.link_id = item.link_id
     where response.patient_id = $1
     order by response.authored_at, question.sequence nulls last, item.id`,
    [patientId],
  );
  const optionRows = await getPool().query<Sql>(
    `select code, display from public.questionnaire_item_option`,
  );
  const options = new Map(
    optionRows.rows.map((option) => [
      str(option.code),
      phrase(locale, str(option.display)),
    ]),
  );

  const byVisit = new Map<string, VisitView["answers"]>();
  for (const item of answers.rows) {
    const visitId = str(item.visit_id);
    const list = byVisit.get(visitId) ?? [];
    list.push({
      id: str(item.id),
      question: phrase(locale, str(item.prompt || item.link_id)),
      answer: answerText(locale, copy, item, options),
    });
    byVisit.set(visitId, list);
  }

  return {
    id: str(row.id),
    name: displayName(locale, {
      name_text: str(row.name_text),
      family_name: str(row.family_name),
      given_name: str(row.given_name),
    }),
    visits: visits.rows.map((visit) => {
      const status = str(visit.status);
      const started = str(visit.started_at);
      const statusLabel =
        status === "finished" ||
        status === "in-progress" ||
        status === "cancelled" ||
        status === "planned"
          ? copy[status]
          : status;
      return {
        id: str(visit.id),
        iso: started,
        title: `${formatWhen(started, locale, true)} · ${copy.visit}`,
        statusLabel,
        badge: visitBadge(status),
        date: formatWhen(started, locale, true),
        ended: formatWhen(str(visit.ended_at), locale, true) || copy.empty,
        doctor: str(visit.provider_name) || copy.empty,
        place: str(visit.location_name) || copy.empty,
        answers: byVisit.get(str(visit.id)) ?? [],
      } satisfies VisitView;
    }),
  };
}

export async function loadVisitForm(
  patientId: string,
  visitId: string,
  locale: Locale,
): Promise<VisitForm | null> {
  const copy = t(locale);
  const visit = await getPool().query(
    `select id from public.visit where id = $1 and patient_id = $2`,
    [visitId, patientId],
  );
  if (visit.rowCount === 0) return null;

  const questionnaire = await getPool().query<Sql>(
    `select id::text, title from public.questionnaire
     where status = 'active'
     order by id
     limit 1`,
  );
  const form = questionnaire.rows[0];
  if (!form) return null;

  const items = await getPool().query<Sql>(
    `select id::text, link_id, prompt, type, required, enable_behavior
     from public.questionnaire_item
     where questionnaire_id = $1
     order by sequence`,
    [form.id],
  );
  const options = await getPool().query<Sql>(
    `select item_id::text, code, display
     from public.questionnaire_item_option
     order by sequence`,
  );
  const rules = await getPool().query<Sql>(
    `select item_id::text, question_link_id, operator, answer_boolean, answer_string, answer_coding
     from public.questionnaire_item_enable_when`,
  );
  const problems = await getPool().query<Sql>(
    `select hkctt_term_id, description
     from public.problem
     where patient_id = $1 and clinical_status = 'active'`,
    [patientId],
  );
  const withhold = await getPool().query<Sql>(
    `select rule.when_hkctt_term_id, rule.when_problem_text, rule.reason,
            medication.local_code, medication.name
     from public.medication_withhold_rule rule
     join public.medication on medication.id = rule.withhold_medication_id
     where rule.questionnaire_id = $1`,
    [form.id],
  );

  const activeTerms = new Set(
    problems.rows.map((problem) => str(problem.hkctt_term_id)).filter(Boolean),
  );
  const withheld = withhold.rows
    .filter((rule) => activeTerms.has(str(rule.when_hkctt_term_id)))
    .map((rule) => {
      const medicine = phrase(locale, str(rule.name));
      const problem = phrase(locale, str(rule.when_problem_text));
      const reason =
        locale === "zh-HK"
          ? `病歷已有${problem}，所以不提供${medicine}。`
          : `${medicine} is not offered because ${problem} is already on the chart.`;
      return { code: str(rule.local_code), reason };
    });
  const hidden = new Set(withheld.map((item) => item.code));

  return {
    questionnaireId: str(form.id),
    title: phrase(locale, str(form.title)),
    withheld,
    items: items.rows.map((item) => ({
      linkId: str(item.link_id),
      prompt: phrase(locale, str(item.prompt)),
      type: str(item.type),
      required: item.required === true,
      enableBehavior:
        item.enable_behavior === "any" || item.enable_behavior === "all"
          ? item.enable_behavior
          : null,
      enableWhen: rules.rows
        .filter((rule) => str(rule.item_id) === str(item.id))
        .map((rule) => ({
          questionLinkId: str(rule.question_link_id),
          operator: str(rule.operator),
          answerBoolean:
            rule.answer_boolean == null ? null : rule.answer_boolean === true,
          answerString: rule.answer_string == null ? null : str(rule.answer_string),
          answerCoding: rule.answer_coding == null ? null : str(rule.answer_coding),
        })),
      options: options.rows
        .filter((option) => str(option.item_id) === str(item.id))
        .filter((option) => !hidden.has(str(option.code)))
        .map((option) => ({
          code: str(option.code),
          label: phrase(locale, str(option.display)),
        })),
    })),
  };
}
