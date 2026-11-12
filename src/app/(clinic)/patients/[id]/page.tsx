import { notFound } from "next/navigation";
import { HistoryScreen } from "@/components/history-screen";
import { listPatients, loadHistory } from "@/lib/chart";
import { t } from "@/lib/copy";
import { getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function PatientHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const locale = await getLocale();
  const [patients, history] = await Promise.all([
    listPatients(locale),
    loadHistory(id, locale),
  ]);
  if (!history) notFound();
  return (
    <HistoryScreen
      locale={locale}
      copy={t(locale)}
      patients={patients}
      patient={history}
    />
  );
}
