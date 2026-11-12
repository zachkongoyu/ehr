import { ClinicShell } from "@/components/clinic-shell";
import { PatientForm } from "@/components/patient-form";
import { clinicCopy } from "@/lib/clinic-copy";
import { getLocale } from "@/lib/locale";
export default async function NewPatientPage() {
  const locale = await getLocale();
  const c = clinicCopy(locale);
  return (
    <ClinicShell locale={locale}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{c.patients}</span>
          <h1>{c.newPatient}</h1>
        </div>
      </div>
      <PatientForm locale={locale} patient={null} />
    </ClinicShell>
  );
}
