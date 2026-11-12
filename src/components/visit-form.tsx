"use client";

import { useState } from "react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertTitle,
} from "@/components/motion/alert";
import { Button } from "@/components/motion/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/motion/card";
import { RadioGroup, RadioGroupItem } from "@/components/motion/radio";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { saveVisit } from "@/app/actions";
import type { Copy } from "@/lib/copy";
import { isItemEnabled, type AnswerValue } from "@/lib/enable-when";
import type { VisitForm } from "@/lib/chart";

export function VisitFormCard({
  copy,
  patientId,
  visitId,
  form,
}: {
  copy: Copy;
  patientId: string;
  visitId: string;
  form: VisitForm;
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const visible = form.items.filter((item) =>
    isItemEnabled(item.enableWhen, item.enableBehavior, answers),
  );

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const result = await saveVisit({
          patientId,
          visitId,
          questionnaireId: form.questionnaireId,
          answers,
        });
        if (result?.error) {
          setError(result.error);
          setPending(false);
        }
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{form.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          {form.withheld.map((rule) => (
            <Alert key={rule.code} variant="warning">
              <AlertContent>
                <AlertTitle>{copy.withheld}</AlertTitle>
                <AlertDescription>{rule.reason}</AlertDescription>
              </AlertContent>
            </Alert>
          ))}
          {visible.map((item) =>
            item.type === "boolean" ? (
              <RadioGroup
                key={item.linkId}
                aria-label={item.prompt}
                orientation="horizontal"
                value={
                  answers[item.linkId]?.boolean == null
                    ? ""
                    : answers[item.linkId]?.boolean
                      ? "yes"
                      : "no"
                }
                onValueChange={(value) =>
                  setAnswers((current) => ({
                    ...current,
                    [item.linkId]: { boolean: value === "yes" },
                  }))
                }
              >
                <span className="w-full text-sm">{item.prompt}</span>
                <RadioGroupItem value="yes" label={copy.yes} />
                <RadioGroupItem value="no" label={copy.no} />
              </RadioGroup>
            ) : (
              <Select
                key={item.linkId}
                value={answers[item.linkId]?.coding ?? ""}
                onValueChange={(value) =>
                  setAnswers((current) => ({
                    ...current,
                    [item.linkId]: { coding: value },
                  }))
                }
              >
                <span className="text-sm">{item.prompt}</span>
                <SelectTrigger>
                  <SelectValue placeholder={copy.choose} />
                </SelectTrigger>
                <SelectContent>
                  {item.options.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ),
          )}
          {error ? (
            <Alert variant="destructive">
              <AlertContent>
                <AlertDescription>{error}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" size="sm" disabled={pending}>
            {copy.save}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
