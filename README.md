# Clinic EHR

An outpatient patient chart and consultation workspace, in Traditional Chinese and English.

## Workflow

- Search the patient directory by name, chart number or phone. Register patients and edit their demographics.
- Open a chart to review allergies, ongoing problems, current medication records and previous visits. Record allergies and ongoing problems directly on the chart.
- Start a consultation, or resume the patient's existing open visit. Previous documentation remains available beside the editor.
- Record the complaint, history, examination, assessment, management plan, follow-up, vitals, encounter diagnoses and prescriptions.
- **Save draft** keeps the visit open. Reloading restores its entries. **Complete visit** requires a complaint, assessment, plan and complete prescription instructions, and makes the visit read-only.

Prescription drafts become active orders only on completion. Saves are transactional and check the visit's documentation version, preventing stale tabs from overwriting each other. Repeated completion cannot create duplicate orders. Existing coded diagnoses retain their codes when their descriptions are unchanged. Existing medication-withholding rules are checked on the server.

## Run

Run `npm ci`, then `npm run dev`. Set `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in an untracked `.env.local`; see `.env.example`. Authentication remains Better Auth, with public signup disabled.

The hosted database must contain the migrations in `supabase/migrations`. The original chart migration may already have been applied from PR #1; do not rerun it against an existing chart. The new consultation migration is additive: a documentation version on visits and new note, observation and allergy tables. Apply it transactionally through the project's approved database workflow before deploying this app version. This repository does not automatically migrate or deploy.

The server connects directly to Postgres. The new clinical tables enable RLS and grant no Data API access to `anon`, `authenticated` or `PUBLIC`.

## Verification and disposable preview

`npm test` exercises validation and PostgreSQL-backed draft/completion behavior. `npm run typecheck` checks application and test types. `npm run build` builds the production app; provide local test auth environment values when building without deployment configuration.

After building, run `npm run preview` in one terminal. It creates a disposable, in-memory PostgreSQL database, applies the schema and fake sample seed, and starts the built app on port 3100. Open the printed local preview link to enter its test session. The preview never reads the hosted database connection string. Restarting it clears all preview changes.

Run `npm run test:preview` in another terminal to check the running app's authentication, registration, search, allergies, visit resume, draft saving/reload, stale-edit rejection, completion, duplicate prevention and history. These checks use disposable records and HTTP requests; they do not verify browser interactions or appearance.

## Data scope

The database uses relational clinical records; it is not a validated FHIR server or a FHIR export API. Patient, encounter, problem, medication-order and questionnaire concepts are kept separate. Consultation notes, measurements and allergies have explicit storage rather than being squeezed into questionnaire choices. Historical questionnaire responses remain visible.

Diagnosis entry currently accepts free text; existing HKCTT mappings are preserved. Prescriptions use the existing medication catalogue and record dose, route and frequency. The sample withholding rules are not a complete prescribing-safety system. Completed records are read-only; signed amendments, catalogue administration and terminology search are not implemented in this change.
