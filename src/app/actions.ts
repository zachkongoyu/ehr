"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getPool } from "@/lib/db";
import {
  ChartError,
  parseConsultation,
  writeConsultation,
} from "@/lib/consultation";
import type { Locale } from "@/lib/locale-shared";

export async function setLocale(locale: Locale) {
  if (locale !== "en" && locale !== "zh-HK")
    throw new Error("Invalid language");
  (await cookies()).set("locale", locale, { path: "/", sameSite: "lax" });
}
const clinician = "Demo clinician";
export async function startVisit(patientId: string) {
  if (!/^\d+$/.test(patientId)) throw new Error("Invalid patient");
  const client = await getPool().connect();
  let visitId: string;
  try {
    await client.query("begin");
    const patient = await client.query(
      "select id from public.patient where id=$1 for update",
      [patientId],
    );
    if (!patient.rows.length) throw new Error("Patient not found");
    const existing = await client.query<{ id: string }>(
      "select id::text from public.visit where patient_id=$1 and status='in-progress' order by started_at desc limit 1",
      [patientId],
    );
    if (existing.rows[0]) visitId = existing.rows[0].id;
    else {
      const inserted = await client.query<{ id: string }>(
        "insert into public.visit (patient_id,status,started_at,provider_name) values ($1,'in-progress',now(),$2) returning id::text",
        [patientId, clinician],
      );
      visitId = inserted.rows[0].id;
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  revalidatePath("/patients");
  redirect("/patients/" + patientId + "/visits/" + visitId);
}
export async function saveVisit(
  raw: unknown,
): Promise<
  { ok: true; version: number } | { ok: false; error: ChartError["code"] }
> {
  try {
    const input = parseConsultation(raw);
    const client = await getPool().connect();
    let version: number;
    try {
      version = await writeConsultation(client, input, clinician);
    } finally {
      client.release();
    }
    revalidatePath("/patients/" + input.patientId);
    revalidatePath("/patients");
    return { ok: true, version };
  } catch (error) {
    if (error instanceof ChartError) return { ok: false, error: error.code };
    throw error;
  }
}
function field(form: FormData, name: string, required = false) {
  const value = form.get(name);
  if (
    typeof value !== "string" ||
    value.length > 2000 ||
    (required && !value.trim())
  )
    throw new Error("Invalid " + name);
  return value.trim();
}
export async function savePatient(
  patientId: string | null,
  form: FormData,
): Promise<{ error: string } | { id: string }> {
  const chartNumber = field(form, "chart_number", true),
    name = field(form, "name_text", true),
    family = field(form, "family_name", true),
    given = field(form, "given_name", true),
    birth = field(form, "birth_date", true),
    sex = field(form, "sex", true);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
    !["female", "male", "other", "unknown"].includes(sex) ||
    (patientId !== null && !/^\d+$/.test(patientId))
  )
    return { error: "invalid" };
  const values = [
    chartNumber,
    name,
    family,
    given,
    birth,
    sex,
    field(form, "phone") || null,
    field(form, "address") || null,
    field(form, "identity_document_type") || null,
    field(form, "identity_document_number") || null,
    field(form, "ehr_number") || null,
  ];
  try {
    const result =
      patientId === null
        ? await getPool().query<{ id: string }>(
            `insert into public.patient (chart_number,name_text,family_name,given_name,birth_date,sex,phone,address,identity_document_type,identity_document_number,ehr_number) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id::text`,
            values,
          )
        : await getPool().query<{ id: string }>(
            `update public.patient set chart_number=$1,name_text=$2,family_name=$3,given_name=$4,birth_date=$5,sex=$6,phone=$7,address=$8,identity_document_type=$9,identity_document_number=$10,ehr_number=$11 where id=$12 returning id::text`,
            [...values, patientId],
          );
    if (!result.rows[0]) return { error: "invalid" };
    revalidatePath("/patients");
    revalidatePath("/patients/" + result.rows[0].id);
    return { id: result.rows[0].id };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      ["23505", "23514", "22008", "22007"].includes(String(error.code))
    )
      return { error: "patientFailed" };
    throw error;
  }
}
export async function addAllergy(patientId: string, form: FormData) {
  if (!/^\d+$/.test(patientId)) throw new Error("Invalid patient");
  await getPool().query(
    "insert into public.patient_allergy (patient_id,substance,reaction) values ($1,$2,$3)",
    [patientId, field(form, "substance", true), field(form, "reaction")],
  );
  revalidatePath("/patients/" + patientId);
}
export async function addProblem(patientId: string, form: FormData) {
  if (!/^\d+$/.test(patientId)) throw new Error("Invalid patient");
  await getPool().query(
    "insert into public.problem (patient_id,category,clinical_status,description,recorded_on) values ($1,'problem-list-item','active',$2,(now() at time zone 'Asia/Hong_Kong')::date)",
    [patientId, field(form, "description", true)],
  );
  revalidatePath("/patients/" + patientId);
}
