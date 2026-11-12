import { notFound, redirect } from "next/navigation";
import { ClinicShell } from "@/components/clinic-shell";
import { PatientHeader, ChartContext } from "@/components/chart-context";
import { VisitFormCard } from "@/components/visit-form";
import { loadHistory, listMedications } from "@/lib/chart";
import { getLocale } from "@/lib/locale";
export const dynamic = "force-dynamic";
export default async function VisitFormPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const { id, visitId } = await params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(visitId)) notFound();
  const locale = await getLocale();
  const [patient, medications] = await Promise.all([
    loadHistory(id, locale),
    listMedications(locale),
  ]);
  if (!patient) notFound();
  const visit = patient.visits.find((item) => item.id === visitId);
  if (!visit) notFound();
  if (visit.status !== "in-progress")
    redirect("/patients/" + id + "?visit=" + visitId);
  return (
    <ClinicShell locale={locale}>
      <PatientHeader patient={patient} locale={locale} mode="consultation" />
      <div className="consultation-context">
        <ChartContext patient={patient} locale={locale} mode="consultation" />
      </div>
      <VisitFormCard
        locale={locale}
        patient={patient}
        visit={visit}
        medications={medications}
      />
    </ClinicShell>
  );
}
