import { notFound } from "next/navigation";
import { HistoryScreen } from "@/components/history-screen";
import { loadHistory } from "@/lib/chart";
import { getLocale } from "@/lib/locale";
export const dynamic = "force-dynamic";
export default async function PatientHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ visit?: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const locale = await getLocale();
  const [patient, search] = await Promise.all([
    loadHistory(id, locale),
    searchParams,
  ]);
  if (!patient) notFound();
  return (
    <HistoryScreen
      locale={locale}
      patient={patient}
      selectedId={search.visit}
    />
  );
}
