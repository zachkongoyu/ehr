import { notFound } from "next/navigation";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { ClinicShell } from "@/components/clinic-shell";
import { VisitFormCard } from "@/components/visit-form";
import { listPatients, loadHistory, loadVisitForm } from "@/lib/chart";
import { t } from "@/lib/copy";
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
  const copy = t(locale);
  const [patients, history, form] = await Promise.all([
    listPatients(locale),
    loadHistory(id, locale),
    loadVisitForm(id, visitId, locale),
  ]);
  if (!history || !form) notFound();
  return (
    <ClinicShell
      locale={locale}
      copy={copy}
      patients={patients}
      activeId={id}
      chip={<AnimatedBadge status="info">{history.name}</AnimatedBadge>}
    >
      <VisitFormCard copy={copy} patientId={id} visitId={visitId} form={form} />
    </ClinicShell>
  );
}
