import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/motion/card";
import { ClinicShell } from "@/components/clinic-shell";
import { listPatients } from "@/lib/chart";
import { t } from "@/lib/copy";
import { getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const locale = await getLocale();
  const copy = t(locale);
  const patients = await listPatients(locale);
  return (
    <ClinicShell locale={locale} copy={copy} patients={patients}>
      <Card>
        <CardHeader>
          <CardTitle>{copy.patients}</CardTitle>
          <CardDescription>{copy.pickPatient}</CardDescription>
        </CardHeader>
      </Card>
    </ClinicShell>
  );
}
