import { ArrowRight, GitBranch } from "lucide-react";
import type { Locale } from "@/lib/locale-shared";

type Node = {
  id: string;
  label: string;
  detail?: string;
  active?: boolean;
  onSelect: () => void;
};

export function VisitDecisionPath({
  locale, branches, decisions, onStory,
}: {
  locale: Locale;
  branches: Node[];
  decisions: Node[];
  onStory: () => void;
}) {
  const en = locale === "en";
  const hasActive = branches.some((branch) => branch.active);

  return (
    <section className="decision-path clinical-map" aria-labelledby="decision-path-title">
      <div className="clinical-map-heading">
        <GitBranch size={22} aria-hidden="true" />
        <h2 id="decision-path-title">{en ? "Consultation map" : "診症流程圖"}</h2>
        <details className="clinical-map-key">
          <summary>{en ? "Path key" : "路徑說明"}</summary>
          <p>{en ? "Blue marks areas linked to this visit’s recorded symptoms. Grey areas can still be opened."
            : "藍色是與已記錄症狀相關的範疇。灰色範疇仍可開啟。"}</p>
        </details>
      </div>
      <button type="button" className="clinical-map-story button secondary small" onClick={onStory}>
        {en ? "Record symptoms" : "記錄症狀"} <ArrowRight size={15} aria-hidden="true" />
      </button>
      <div className="clinical-map-grid">
        <section className="clinical-map-areas">
          <h3>{en ? "Presenting areas" : "就診範疇"}</h3>
          <ul className="decision-branches">
            {branches.map((branch) => (
              <li key={branch.id} data-state={branch.active ? "active" : hasActive ? "alternate" : "available"}>
                <button type="button" className="decision-node" onClick={branch.onSelect}>
                  <span>
                    <strong>{branch.label}</strong>
                    {branch.active && <span className="sr-only">{en ? "Active path" : "相關路徑"}</span>}
                    <small>{branch.detail}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="clinical-map-decisions">
          <h3>{en ? "Clinical decisions" : "臨床決策"}</h3>
          <ol>
            {decisions.map((item) => (
              <li key={item.id} data-active={item.active}>
                <button type="button" className="decision-node" onClick={item.onSelect}>
                  <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}
