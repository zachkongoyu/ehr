import { clinicCopy } from "@/lib/clinic-copy";
import { noteFields, vitalDefinitions } from "@/lib/consultation";
import type { Locale } from "@/lib/locale-shared";
import type { VisitView } from "@/lib/chart";

export function VisitRecord({
  visit,
  locale,
}: {
  visit: VisitView;
  locale: Locale;
}) {
  const c = clinicCopy(locale);
  return (
    <div className="visit-record">
      {visit.vitals.length > 0 && (
        <section>
          <h3>{c.vitals}</h3>
          <div className="vital-readings">
            {visit.vitals.map((item) => (
              <div key={item.code}>
                <span>
                  {locale === "en"
                    ? vitalDefinitions[item.code].label
                    : vitalDefinitions[item.code].zh}
                </span>
                <strong>
                  {item.value} <small>{item.unit}</small>
                </strong>
              </div>
            ))}
          </div>
        </section>
      )}
      {noteFields.some((field) => visit.note[field]) ? (
        noteFields.map(
          (field) =>
            visit.note[field] && (
              <section key={field}>
                <h3>{c[field]}</h3>
                <p className="note-text">{visit.note[field]}</p>
              </section>
            ),
        )
      ) : (
        <p className="empty-copy">{c.noNotes}</p>
      )}
      {visit.diagnoses.length > 0 && (
        <section>
          <h3>{c.diagnoses}</h3>
          <ul>
            {visit.diagnoses.map((item) => (
              <li key={item.id}>{item.description}</li>
            ))}
          </ul>
        </section>
      )}
      {visit.prescriptions.length > 0 && (
        <section>
          <h3>{c.prescriptions}</h3>
          <ul className="clinical-list">
            {visit.prescriptions.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong>
                <span>
                  {[item.dose, item.route, item.frequency]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
                <small>
                  {item.status === "draft" ? c.draft : c.prescribed}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}
      {visit.answers.length > 0 && (
        <section>
          <h3>{c.legacy}</h3>
          <dl className="legacy-answers">
            {visit.answers.map((item) => (
              <div key={item.id}>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
