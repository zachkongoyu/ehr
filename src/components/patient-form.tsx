"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePatient } from "@/app/actions";
import { clinicCopy } from "@/lib/clinic-copy";
import type { Patient } from "@/lib/chart";
import type { Locale } from "@/lib/locale-shared";
export function PatientForm({
  locale,
  patient,
}: {
  locale: Locale;
  patient: Patient | null;
}) {
  const c = clinicCopy(locale),
    router = useRouter();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const fields = [
    { name: "chart_number", label: c.chartNumber, required: true },
    { name: "name_text", label: c.name, required: true },
    { name: "family_name", label: c.familyName, required: true },
    { name: "given_name", label: c.givenName, required: true },
    { name: "birth_date", label: c.birthDate, type: "date", required: true },
    { name: "phone", label: c.phone, type: "tel" },
    { name: "identity_document_type", label: c.identityType },
    { name: "identity_document_number", label: c.identityNumber },
    { name: "ehr_number", label: c.ehrNumber },
  ] as const;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return (
    <form
      className="panel patient-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setPending(true);
        setError("");
        try {
          const result = await savePatient(patient?.id ?? null, data);
          if ("error" in result)
            setError(result.error === "invalid" ? c.invalid : c.patientFailed);
          else {
            router.push("/patients/" + result.id);
            router.refresh();
          }
        } catch {
          setError(c.failed);
        } finally {
          setPending(false);
        }
      }}
    >
      <fieldset disabled={pending}>
        <div className="demographics-grid">
          {fields.map((field) => (
            <label key={field.name} htmlFor={field.name}>
              {field.label}
              {"required" in field && <span className="required-mark"> *</span>}
              <input
                id={field.name}
                name={field.name}
                type={"type" in field ? field.type : "text"}
                defaultValue={patient?.[field.name] ?? ""}
                required={"required" in field}
                maxLength={2000}
                max={field.name === "birth_date" ? today : undefined}
              />
            </label>
          ))}
          <label htmlFor="sex">
            {c.sex} *
            <select
              id="sex"
              name="sex"
              defaultValue={patient?.sex ?? "unknown"}
            >
              <option value="unknown">
                {locale === "en" ? "Unknown" : "不詳"}
              </option>
              <option value="female">
                {locale === "en" ? "Female" : "女"}
              </option>
              <option value="male">{locale === "en" ? "Male" : "男"}</option>
              <option value="other">
                {locale === "en" ? "Other" : "其他"}
              </option>
            </select>
          </label>
          <label className="full-width" htmlFor="address">
            {c.address}
            <textarea
              id="address"
              name="address"
              rows={3}
              maxLength={2000}
              defaultValue={patient?.address ?? ""}
            />
          </label>
        </div>
      </fieldset>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <footer className="form-footer">
        <Link
          className="button secondary"
          href={patient ? "/patients/" + patient.id : "/patients"}
        >
          {c.cancel}
        </Link>
        <button className="button primary" disabled={pending}>
          {pending ? c.saving : c.savePatient}
        </button>
      </footer>
    </form>
  );
}
