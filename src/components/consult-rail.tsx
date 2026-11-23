"use client";
import { Check } from "lucide-react";
import type { Locale } from "@/lib/locale-shared";

export type RailState = "done" | "todo" | "attention";

export type RailStep = {
  label: string;
  hint: string;
  state: RailState;
  count?: number;
  subs?: { id: string; label: string; onSelect: () => void }[];
};

export type RailArea = {
  id: string;
  label: string;
  detail: string;
  state: RailState;
  count?: number;
  onSelect: () => void;
};

export function ConsultRail({
  locale, steps, stage, onStep, linked, others,
}: {
  locale: Locale;
  steps: RailStep[];
  stage: number;
  onStep: (index: number) => void;
  linked: RailArea[];
  others: RailArea[];
}) {
  const en = locale === "en";
  return (
    <nav id="visit-workspace" className="consult-rail" aria-label={en ? "Consultation steps" : "診症步驟"} tabIndex={-1}>
      <ol className="rail-steps">
        {steps.map((step, index) => (
          <li key={step.label} data-state={step.state}>
            <button type="button" aria-current={stage === index ? "step" : undefined} onClick={() => onStep(index)}>
              <span className="rail-mark" aria-hidden="true">
                {step.state === "done" ? <Check size={16} strokeWidth={2.5} /> : index + 1}
              </span>
              <span className="rail-text">
                <strong>{step.label}</strong>
                <small>{step.hint}</small>
              </span>
              {step.count ? (
                <span className="rail-count">
                  {step.count}
                  <span className="sr-only">{en ? " open questions" : " 項待答問題"}</span>
                </span>
              ) : null}
            </button>
            {stage === index && step.subs?.length ? (
              <ul className="rail-subs">
                {step.subs.map((sub) => (
                  <li key={sub.id}>
                    <button type="button" onClick={sub.onSelect}>{sub.label}</button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
      <section className="rail-areas" aria-labelledby="rail-areas-title">
        <h3 id="rail-areas-title">{en ? "Linked to today" : "今日相關範疇"}</h3>
        {linked.length ? (
          <ul>
            {linked.map((area) => (
              <li key={area.id} data-state={area.state}>
                <button type="button" onClick={area.onSelect}>
                  <span className="rail-text">
                    <strong>{area.label}</strong>
                    <small>{area.detail}</small>
                  </span>
                  {area.count ? <span className="rail-count">{area.count}</span>
                    : area.state === "done" ? <Check size={16} aria-label={en ? "Recorded" : "已記錄"} /> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rail-empty">{en ? "Tap a symptom to link a body area." : "點選症狀以連結身體範疇。"}</p>
        )}
        {others.length > 0 && (
          <details className="rail-other">
            <summary>{en ? "Other areas" : "其他範疇"} <span>{others.length}</span></summary>
            <div>
              {others.map((area) => (
                <button type="button" key={area.id} onClick={area.onSelect}>{area.label}</button>
              ))}
            </div>
          </details>
        )}
      </section>
    </nav>
  );
}
