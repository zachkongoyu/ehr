"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { isItemEnabled, type AnswerValue, type EnableWhen } from "@/lib/enable-when";
import type { Locale } from "@/lib/locale-shared";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/copy";

export async function setLocale(locale: Locale) {
  const jar = await cookies();
  jar.set("locale", locale, { path: "/", sameSite: "lax" });
}

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session.user;
}

export async function startVisit(patientId: string) {
  await requireUser();
  const inserted = await getPool().query<{ id: string }>(
    `insert into public.visit (patient_id, status, started_at)
     values ($1, 'in-progress', now())
     returning id::text`,
    [patientId],
  );
  const id = inserted.rows[0]?.id;
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}/visits/${id}`);
}

export async function saveVisit(input: {
  patientId: string;
  visitId: string;
  questionnaireId: string;
  answers: Record<string, AnswerValue>;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const locale = await getLocale();
  const copy = t(locale);
  const pool = getPool();
  const visit = await pool.query(
    `select id from public.visit where id = $1 and patient_id = $2`,
    [input.visitId, input.patientId],
  );
  if (visit.rowCount === 0) return { error: copy.required };

  const items = await pool.query<{
    link_id: string;
    type: string;
    required: boolean;
    enable_behavior: "all" | "any" | null;
  }>(
    `select link_id, type, required, enable_behavior
     from public.questionnaire_item
     where questionnaire_id = $1
     order by sequence`,
    [input.questionnaireId],
  );
  const rules = await pool.query<{
    link_id: string;
    question_link_id: string;
    operator: string;
    answer_boolean: boolean | null;
    answer_string: string | null;
    answer_coding: string | null;
  }>(
    `select item.link_id, rule.question_link_id, rule.operator,
            rule.answer_boolean, rule.answer_string, rule.answer_coding
     from public.questionnaire_item_enable_when rule
     join public.questionnaire_item item on item.id = rule.item_id
     where item.questionnaire_id = $1`,
    [input.questionnaireId],
  );
  const options = await pool.query<{ link_id: string; code: string }>(
    `select item.link_id, option.code
     from public.questionnaire_item_option option
     join public.questionnaire_item item on item.id = option.item_id
     where item.questionnaire_id = $1`,
    [input.questionnaireId],
  );
  const blocked = await pool.query<{ local_code: string }>(
    `select medication.local_code
     from public.medication_withhold_rule rule
     join public.medication on medication.id = rule.withhold_medication_id
     join public.problem
       on problem.patient_id = $1
      and problem.clinical_status = 'active'
      and problem.hkctt_term_id = rule.when_hkctt_term_id
     where rule.questionnaire_id = $2`,
    [input.patientId, input.questionnaireId],
  );
  const blockedCodes = new Set(blocked.rows.map((row) => row.local_code));
  const conditions = new Map<string, EnableWhen[]>();
  for (const rule of rules.rows) {
    const list = conditions.get(rule.link_id) ?? [];
    list.push({
      questionLinkId: rule.question_link_id,
      operator: rule.operator,
      answerBoolean: rule.answer_boolean,
      answerString: rule.answer_string,
      answerCoding: rule.answer_coding,
    });
    conditions.set(rule.link_id, list);
  }

  const enabled = items.rows.filter((item) =>
    isItemEnabled(conditions.get(item.link_id) ?? [], item.enable_behavior, input.answers),
  );
  for (const item of enabled) {
    const answer = input.answers[item.link_id];
    if (!item.required) continue;
    if (item.type === "boolean" && answer?.boolean == null) return { error: copy.required };
    if ((item.type === "choice" || item.type === "open-choice") && !answer?.coding) {
      return { error: copy.required };
    }
  }
  for (const item of enabled) {
    const coding = input.answers[item.link_id]?.coding;
    if (coding && blockedCodes.has(coding)) return { error: copy.withheld };
    if (coding) {
      const allowed = options.rows.some(
        (option) => option.link_id === item.link_id && option.code === coding,
      );
      if (!allowed) return { error: copy.required };
    }
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const response = await client.query<{ id: string }>(
      `insert into public.questionnaire_response
         (questionnaire_id, patient_id, visit_id, status, authored_at)
       values ($1, $2, $3, 'completed', now())
       returning id::text`,
      [input.questionnaireId, input.patientId, input.visitId],
    );
    const responseId = response.rows[0].id;
    for (const item of enabled) {
      const answer = input.answers[item.link_id];
      if (!answer) continue;
      if (item.type === "boolean" && answer.boolean == null) continue;
      if (item.type !== "boolean" && !answer.coding && !answer.text) continue;
      await client.query(
        `insert into public.questionnaire_response_item
           (response_id, link_id, value_boolean, value_coding, value_string)
         values ($1, $2, $3, $4, $5)`,
        [
          responseId,
          item.link_id,
          item.type === "boolean" ? answer.boolean : null,
          answer.coding ?? null,
          answer.text ?? null,
        ],
      );
      if (answer.coding && !blockedCodes.has(answer.coding)) {
        const medication = await client.query<{ id: string }>(
          `select id::text from public.medication where local_code = $1`,
          [answer.coding],
        );
        const medicationId = medication.rows[0]?.id;
        if (medicationId) {
          await client.query(
            `insert into public.medication_order
               (patient_id, visit_id, medication_id, status, authored_on)
             values ($1, $2, $3, 'active', (now() at time zone 'Asia/Hong_Kong')::date)`,
            [input.patientId, input.visitId, medicationId],
          );
        }
      }
    }
    await client.query(
      `update public.visit
       set status = 'finished', ended_at = coalesce(ended_at, now()),
           provider_name = coalesce(provider_name, $2)
       where id = $1 and status = 'in-progress'`,
      [input.visitId, user.name],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath(`/patients/${input.patientId}`);
  redirect(`/patients/${input.patientId}`);
}
