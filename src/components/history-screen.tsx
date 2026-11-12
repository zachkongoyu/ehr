"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/motion/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/motion/card";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { Timeline } from "@/components/motion/timeline";
import { startVisit } from "@/app/actions";
import { ClinicShell } from "@/components/clinic-shell";
import type { Copy } from "@/lib/copy";
import type { Locale } from "@/lib/locale-shared";
import { intlLocale } from "@/lib/locale-shared";
import type { PatientLink, VisitView } from "@/lib/chart";

export function HistoryScreen({
  locale,
  copy,
  patients,
  patient,
}: {
  locale: Locale;
  copy: Copy;
  patients: PatientLink[];
  patient: { id: string; name: string; visits: VisitView[] };
}) {
  const [visitId, setVisitId] = useState(patient.visits[0]?.id ?? "");
  const selected =
    patient.visits.find((visit) => visit.id === visitId) ?? patient.visits[0];

  return (
    <ClinicShell
      locale={locale}
      copy={copy}
      patients={patients}
      activeId={patient.id}
      chip={<AnimatedBadge status="info">{patient.name}</AnimatedBadge>}
    >
      {patient.visits.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{copy.history}</CardTitle>
            <CardDescription>{copy.noVisits}</CardDescription>
          </CardHeader>
          <CardFooter>
            <form action={startVisit.bind(null, patient.id)}>
              <Button type="submit" size="sm">
                {copy.newVisit}
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <>
          <Timeline
            aria-label={copy.history}
            height={320}
            value={selected?.id}
            onValueChange={setVisitId}
            events={patient.visits.map((visit) => ({
              id: visit.id,
              date: visit.iso,
              title: visit.title,
              meta: (
                <AnimatedBadge status={visit.badge} size="sm">
                  {visit.statusLabel}
                </AnimatedBadge>
              ),
            }))}
            formatDate={(date) =>
              new Intl.DateTimeFormat(intlLocale(locale), {
                timeZone: "Asia/Hong_Kong",
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(date)
            }
            formatYear={(date) =>
              new Intl.DateTimeFormat(intlLocale(locale), {
                timeZone: "Asia/Hong_Kong",
                year: "numeric",
              }).format(date)
            }
            labels={{
              label: copy.history,
              hint: locale === "zh-HK" ? "用左右方向鍵切換就診" : "Use the arrow keys to move between visits.",
            }}
          />
          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle>{selected.date}</CardTitle>
                <CardDescription>{copy.visit}</CardDescription>
                <CardAction>
                  <AnimatedBadge status={selected.badge}>{selected.statusLabel}</AnimatedBadge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Fact label={copy.ended} value={selected.ended} />
                  <Fact label={copy.doctor} value={selected.doctor} />
                  <Fact label={copy.place} value={selected.place} />
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-muted-foreground">{copy.answers}</dt>
                    <dd className="mt-2 grid gap-2">
                      {selected.answers.length === 0 ? (
                        <span>{copy.noAnswers}</span>
                      ) : (
                        selected.answers.map((answer) => (
                          <span key={answer.id}>
                            {answer.question} {answer.answer}
                          </span>
                        ))
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
              <CardFooter>
                <ButtonLink href={`/patients/${patient.id}/visits/${selected.id}`} size="sm">
                  {copy.record}
                </ButtonLink>
                <form action={startVisit.bind(null, patient.id)}>
                  <Button type="submit" size="sm" variant="outline">
                    {copy.newVisit}
                  </Button>
                </form>
              </CardFooter>
            </Card>
          ) : null}
        </>
      )}
    </ClinicShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
