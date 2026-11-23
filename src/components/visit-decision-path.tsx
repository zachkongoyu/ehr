import { ArrowRight, GitBranch } from "lucide-react";
import type { Locale } from "@/lib/locale-shared";

type Branch = {
  id: string;
  label: string;
  detail: string;
  active: boolean;
  onSelect: () => void;
};

export function VisitDecisionPath({
  locale,
  branches,
  onAssessment,
}: {
  locale: Locale;
  branches: Branch[];
  onAssessment: () => void;
}) {
  const en = locale === "en";
  const hasActive = branches.some((branch) => branch.active);

  return (
    <section className="decision-path" aria-labelledby="decision-path-title">
      <div className="decision-path-origin">
        <GitBranch size={18} aria-hidden="true" />
        <h3 id="decision-path-title">{en ? "Consultation paths" : "診症路徑"}</h3>
      </div>
      <ul className="decision-branches">
        {branches.map((branch) => (
          <li key={branch.id} data-state={branch.active ? "active" : hasActive ? "alternate" : "available"}>
            <button type="button" className="decision-node" onClick={branch.onSelect}>
              <span>
                <strong>{branch.label}</strong>
                <small>{branch.detail}</small>
              </span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="decision-merge">
        <button type="button" className="button secondary small" onClick={onAssessment}>
          {en ? "Working diagnosis" : "初步診斷"} <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
