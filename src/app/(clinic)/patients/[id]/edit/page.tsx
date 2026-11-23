import { notFound } from "next/navigation";
import { ClinicShell } from "@/components/clinic-shell";
import { PatientForm } from "@/components/patient-form";
import { loadHistory } from "@/lib/chart";
import { clinicCopy } from "@/lib/clinic-copy";
import { getLocale } from "@/lib/locale";
export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const locale = await getLocale();
  const patient = await loadHistory(id, locale);
  if (!patient) notFound();
  const c = clinicCopy(locale);
  return (
    <ClinicShell locale={locale}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {patient.chart_number} · {patient.name}
          </span>
          <h1>{c.editPatient}</h1>
        </div>
      </div>
      <PatientForm locale={locale} patient={patient} />
    </ClinicShell>
  );
}
