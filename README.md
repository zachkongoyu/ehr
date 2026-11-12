# Clinic EHR

A proof-of-concept outpatient patient chart and consultation workspace, in Traditional Chinese and English. It opens directly on the dashboard without authentication, as requested for the demo. Changes are attributed to "Demo clinician". Use synthetic records only; this version does not restrict access to patient charts or editing.

## Workflow

- Use the clinic overview for monthly visit activity, today's status breakdown, a short list of open consultations and recently completed visits. The Consultations page holds the full searchable worklist. Completed visits are green.
- Search the patient directory by name, chart number or phone. Register patients and edit their demographics.
- Open a chart to review allergies, ongoing problems, current medication records and previous visits. Record allergies and ongoing problems directly on the chart.
- Switch between overview, clinical data, medication history, documented care plans and patient profile. The visit timeline stays visible beside each section; on a narrow screen it appears above the chart.
- Start a consultation, or resume the patient's existing open visit. Previous documentation remains available beside the editor.
- Record the complaint, history, examination, assessment, management plan, follow-up, vitals, encounter diagnoses and prescriptions.
- **Save draft** keeps the visit open. Reloading restores its entries. **Complete visit** requires a complaint, assessment, plan and complete prescription instructions, and makes the visit read-only.

Prescription drafts become active orders only on completion. Saves are transactional and check the visit's documentation version, preventing stale tabs from overwriting each other. Repeated completion cannot create duplicate orders. Existing coded diagnoses retain their codes when their descriptions are unchanged. Existing medication-withholding rules are checked on the server.

Search medicines by name or strength within each prescription. Route and frequency fields offer suggestions and accept clinician-entered instructions. The separate medication catalogue searches stored product names and identifiers; local demo products do not claim HKCTT or RPP mappings.

## Run

Run `npm ci`, then `npm run dev`. Set `DATABASE_URL` in an untracked `.env.local`; see `.env.example`. The demo has no login page or authentication dependency.

The hosted database must contain the migrations in `supabase/migrations`. The original chart migration may already have been applied from PR #1; do not rerun it against an existing chart. The new consultation migration is additive: a documentation version on visits and new note, observation and allergy tables. Apply it transactionally through the project's approved database workflow before deploying this app version. This repository does not automatically migrate or deploy.

The server connects directly to Postgres. The new clinical tables enable RLS and grant no Data API access to `anon`, `authenticated` or `PUBLIC`.

## Verification and disposable preview

`npm test` exercises validation and PostgreSQL-backed draft/completion behavior. `npm run typecheck` checks application and test types. `npm run build` builds the production app.

After building, run `npm run preview` in one terminal. It creates a disposable, in-memory PostgreSQL database, applies the schema and synthetic seed, and starts the built app on port 3100. Open `http://localhost:3100/dashboard` directly. The preview never reads the hosted database connection string. Restarting it clears all preview changes.

Run `npm run test:preview` in another terminal to check direct demo entry, dashboard chart data, the separate consultation worklist, registration, search, allergies, visit resume, draft saving/reload, stale-edit rejection, completion, duplicate prevention and history. These checks use disposable records and HTTP requests; they do not verify browser interactions or appearance.

The blue and neutral interface uses a persistent left navigation and white cards. The dashboard gives activity and status charts more space than its compact resume list. Patient charts prioritise clinical context, current measurements and visit documentation, with a smaller longitudinal chart for blood pressure, weight or pulse. Charts use beUI source from its registry and include accessible values; missing clinical measurements are not converted to zero.

The preview includes 18 clearly marked synthetic patients with five visits each, clinical notes, vitals, allergies and a broader medicine catalogue, alongside the original sample seed. `npm test` verifies that repeating the synthetic seed creates no duplicates.

`scripts/seed-demo.mjs --apply` is restricted to the configured EHR Supabase project and requires its database connection in the environment. It seeds in one transaction, preserves existing records and checks clinical table access before commit. Applying the migration requires a schema-owner connection; the restricted application role can seed after the migration has been applied. Do not run the original `supabase/seed.sql` against hosted data. The approved consultation migration and synthetic seed were applied to the EHR project on 13 November 2026: totals were 20 patients, 96 visits, 41 medicines, 90 notes, 720 vital measurements and 5 allergy entries.

## Data scope

The database uses relational clinical records; it is not a validated FHIR server or a FHIR export API. Patient, encounter, problem, medication-order and questionnaire concepts are kept separate. Consultation notes, measurements and allergies have explicit storage rather than being squeezed into questionnaire choices. Historical questionnaire responses remain visible.

Diagnosis entry currently accepts free text; existing HKCTT mappings are preserved. Prescriptions use the existing medication catalogue and record dose, route and frequency. The sample withholding rules are not a complete prescribing-safety system. Completed records are read-only; signed amendments, catalogue administration and terminology search are not implemented in this change.
