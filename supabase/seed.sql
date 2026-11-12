-- Fake chart for the sample visit form. Re-running replaces these sample rows only.
-- No real patients. Identity numbers are marked SAMPLE and are not HKIDs.
--
-- Dependent question (FHIR enableWhen, same form):
--   palpitation is a yes/no: "Palpitations today?"
--   palpitation_duration is a choice: "How long have the palpitations lasted?"
--   palpitation_duration is enabled only when palpitation = true.
--   SAMPLE-0001 answered no, so the completed response has no palpitation_duration row.
--   SAMPLE-0002 answered yes, so the completed response stores palpitation_duration = this-week.
--
-- Medicine withheld because a problem is already on the chart (not enableWhen):
--   medication_withhold_rule: if an active problem has HKCTT Term ID 7871
--   (Sick sinus syndrome, nature Diagnosis), do not offer Atenolol on symptom_medicine.
--   SAMPLE-0001 has that active problem, and the visit orders paracetamol, not atenolol.
--   SAMPLE-0002 does not have that problem, and the visit orders atenolol.
--
-- HKCTT terms below are the ones printed in the eHealth editorial guides.
--   7871 Sick sinus syndrome, nature Diagnosis, ICD-10 I49.5.
--     Problem & Procedure guide v1.5, section 5.3.3, qualifying mapping.
--   37121 Chemical pneumonitis, nature Diagnosis, ICD-10 J68.0, SNOMED CT 22343003.
--     Overview guide v1.5, section 3.2.5.4. The SNOMED term stored here is the
--     SNOMED-sourced alias that guide prints for this Term ID.
-- The two sample medicines are stored by name. No HKCTT pharmaceutical-product
-- Term ID or RPP identifier for them was taken from those pages.

begin;

delete from public.questionnaire_response_item
where response_id in (
  select response.id
  from public.questionnaire_response as response
  join public.questionnaire on questionnaire.id = response.questionnaire_id
  where questionnaire.title = 'Sample visit form'
    and questionnaire.version = '1'
);

delete from public.questionnaire_response
where questionnaire_id in (
  select id
  from public.questionnaire
  where title = 'Sample visit form'
    and version = '1'
);

delete from public.medication_order
where patient_id in (
  select id from public.patient where chart_number like 'SAMPLE-%'
);

delete from public.medication_statement
where patient_id in (
  select id from public.patient where chart_number like 'SAMPLE-%'
);

delete from public.problem
where patient_id in (
  select id from public.patient where chart_number like 'SAMPLE-%'
);

delete from public.visit
where patient_id in (
  select id from public.patient where chart_number like 'SAMPLE-%'
);

delete from public.patient
where chart_number like 'SAMPLE-%';

delete from public.questionnaire
where title = 'Sample visit form'
  and version = '1';

delete from public.medication
where local_code like 'sample-%';

insert into public.patient (
  chart_number,
  family_name,
  given_name,
  name_text,
  identity_document_type,
  identity_document_number,
  sex,
  birth_date,
  phone,
  address,
  ehr_number
) values
  (
    'SAMPLE-0001',
    '陳',
    '大文',
    '陳大文',
    'other',
    'SAMPLE-DOC-0001',
    'male',
    '1972-04-08',
    '00000001',
    '100 Sample Street, Kowloon, Hong Kong',
    null
  ),
  (
    'SAMPLE-0002',
    '李',
    '美玲',
    '李美玲',
    'other',
    'SAMPLE-DOC-0002',
    'female',
    '1990-09-21',
    '00000002',
    '200 Sample Street, Kowloon, Hong Kong',
    null
  );

insert into public.medication (local_code, name) values
  ('sample-paracetamol-500', 'Paracetamol 500 mg tablet'),
  ('sample-atenolol-50', 'Atenolol 50 mg tablet');

insert into public.visit (
  patient_id,
  status,
  started_at,
  ended_at,
  provider_name,
  location_name,
  disposition
)
select
  patient.id,
  'finished',
  timestamptz '2026-11-12 09:00:00+08',
  timestamptz '2026-11-12 09:20:00+08',
  'Dr Sample',
  'Sample Clinic, Mong Kok',
  'home'
from public.patient
where patient.chart_number = 'SAMPLE-0001';

insert into public.visit (
  patient_id,
  status,
  started_at,
  ended_at,
  provider_name,
  location_name,
  disposition
)
select
  patient.id,
  'finished',
  timestamptz '2026-11-12 10:00:00+08',
  timestamptz '2026-11-12 10:20:00+08',
  'Dr Sample',
  'Sample Clinic, Mong Kok',
  'home'
from public.patient
where patient.chart_number = 'SAMPLE-0002';

-- Already on the chart before the visit, so the form can see it when it opens.
insert into public.problem (
  patient_id,
  category,
  clinical_status,
  description,
  recorded_on,
  hkctt_term_id,
  hkctt_description,
  hkctt_nature,
  icd10_code,
  icd10_name
)
select
  patient.id,
  'problem-list-item',
  'active',
  'Sick sinus syndrome',
  '2026-06-01',
  '7871',
  'Sick sinus syndrome',
  'Diagnosis',
  'I49.5',
  'Sick sinus syndrome'
from public.patient
where patient.chart_number = 'SAMPLE-0001';

insert into public.problem (
  patient_id,
  category,
  clinical_status,
  description,
  recorded_on,
  hkctt_term_id,
  hkctt_description,
  hkctt_nature,
  icd10_code,
  snomed_concept_id,
  snomed_term
)
select
  patient.id,
  'problem-list-item',
  'active',
  'Chemical pneumonitis',
  '2026-03-01',
  '37121',
  'Chemical pneumonitis',
  'Diagnosis',
  'J68.0',
  '22343003',
  'Pneumonitis due to fumes AND/OR vapors (disorder)'
from public.patient
where patient.chart_number = 'SAMPLE-0002';

-- Level 1: no recognised code. Legitimate on the problem list.
insert into public.problem (
  patient_id,
  category,
  clinical_status,
  description,
  recorded_on
)
select
  patient.id,
  'problem-list-item',
  'active',
  'Occasional headache',
  '2026-08-01'
from public.patient
where patient.chart_number = 'SAMPLE-0002';

-- What SAMPLE-0001 was already taking, reported by the patient. Not an order.
insert into public.medication_statement (
  patient_id,
  medication_id,
  status,
  source,
  dose_text,
  route_text,
  frequency_text,
  recorded_on
)
select
  patient.id,
  medication.id,
  'active',
  'patient',
  '500 mg',
  'oral',
  'when needed',
  '2026-06-01'
from public.patient
join public.medication on medication.local_code = 'sample-paracetamol-500'
where patient.chart_number = 'SAMPLE-0001';

insert into public.questionnaire (title, status, version) values
  ('Sample visit form', 'active', '1');

insert into public.questionnaire_item (
  questionnaire_id,
  link_id,
  sequence,
  prompt,
  type,
  repeats,
  required
)
select
  questionnaire.id,
  'palpitation',
  1,
  'Palpitations today?',
  'boolean',
  false,
  true
from public.questionnaire
where questionnaire.title = 'Sample visit form'
  and questionnaire.version = '1';

insert into public.questionnaire_item (
  questionnaire_id,
  link_id,
  sequence,
  prompt,
  type,
  repeats,
  required,
  enable_behavior
)
select
  questionnaire.id,
  'palpitation_duration',
  2,
  'How long have the palpitations lasted?',
  'choice',
  false,
  false,
  'all'
from public.questionnaire
where questionnaire.title = 'Sample visit form'
  and questionnaire.version = '1';

insert into public.questionnaire_item (
  questionnaire_id,
  link_id,
  sequence,
  prompt,
  type,
  repeats,
  required
)
select
  questionnaire.id,
  'symptom_medicine',
  3,
  'Medicine to order for this visit',
  'choice',
  false,
  true
from public.questionnaire
where questionnaire.title = 'Sample visit form'
  and questionnaire.version = '1';

insert into public.questionnaire_item_enable_when (
  item_id,
  question_link_id,
  operator,
  answer_boolean
)
select
  item.id,
  'palpitation',
  '=',
  true
from public.questionnaire_item as item
join public.questionnaire on questionnaire.id = item.questionnaire_id
where questionnaire.title = 'Sample visit form'
  and questionnaire.version = '1'
  and item.link_id = 'palpitation_duration';

insert into public.questionnaire_item_option (item_id, sequence, code, display)
select item.id, option.sequence, option.code, option.display
from public.questionnaire_item as item
join public.questionnaire on questionnaire.id = item.questionnaire_id
cross join (
  values
    (1, 'today', 'Today'),
    (2, 'this-week', 'This week'),
    (3, 'longer', 'Longer than a week')
) as option (sequence, code, display)
where questionnaire.title = 'Sample visit form'
  and questionnaire.version = '1'
  and item.link_id = 'palpitation_duration';

insert into public.questionnaire_item_option (item_id, sequence, code, display)
select item.id, option.sequence, option.code, option.display
from public.questionnaire_item as item
join public.questionnaire on questionnaire.id = item.questionnaire_id
cross join (
  values
    (1, 'sample-paracetamol-500', 'Paracetamol 500 mg tablet'),
    (2, 'sample-atenolol-50', 'Atenolol 50 mg tablet')
) as option (sequence, code, display)
where questionnaire.title = 'Sample visit form'
  and questionnaire.version = '1'
  and item.link_id = 'symptom_medicine';

insert into public.medication_withhold_rule (
  questionnaire_id,
  item_id,
  when_hkctt_term_id,
  when_problem_text,
  withhold_medication_id,
  reason
)
select
  questionnaire.id,
  item.id,
  '7871',
  'Sick sinus syndrome',
  medication.id,
  'Atenolol is withheld when sick sinus syndrome (HKCTT 7871) is already an active problem on the chart.'
from public.questionnaire
join public.questionnaire_item as item on item.questionnaire_id = questionnaire.id
join public.medication on medication.local_code = 'sample-atenolol-50'
where questionnaire.title = 'Sample visit form'
  and questionnaire.version = '1'
  and item.link_id = 'symptom_medicine';

-- SAMPLE-0001 answered "no" to palpitations. The duration question stays hidden,
-- so this completed response does not contain link_id palpitation_duration.
-- Sick sinus syndrome is active, so the medicine ordered is paracetamol.
insert into public.questionnaire_response (
  questionnaire_id,
  patient_id,
  visit_id,
  status,
  authored_at
)
select
  questionnaire.id,
  patient.id,
  visit.id,
  'completed',
  timestamptz '2026-11-12 09:10:00+08'
from public.questionnaire
join public.patient on patient.chart_number = 'SAMPLE-0001'
join public.visit on visit.patient_id = patient.id
where questionnaire.title = 'Sample visit form'
  and questionnaire.version = '1';

insert into public.questionnaire_response_item (response_id, link_id, value_boolean)
select response.id, 'palpitation', false
from public.questionnaire_response as response
join public.patient on patient.id = response.patient_id
where patient.chart_number = 'SAMPLE-0001';

insert into public.questionnaire_response_item (response_id, link_id, value_coding)
select response.id, 'symptom_medicine', 'sample-paracetamol-500'
from public.questionnaire_response as response
join public.patient on patient.id = response.patient_id
where patient.chart_number = 'SAMPLE-0001';

insert into public.medication_order (
  patient_id,
  visit_id,
  medication_id,
  status,
  dose_text,
  route_text,
  frequency_text,
  authored_on
)
select
  patient.id,
  visit.id,
  medication.id,
  'active',
  '500 mg',
  'oral',
  'when needed',
  '2026-11-12'
from public.patient
join public.visit on visit.patient_id = patient.id
join public.medication on medication.local_code = 'sample-paracetamol-500'
where patient.chart_number = 'SAMPLE-0001';

-- SAMPLE-0002 answered "yes". palpitation_duration is enabled and stored.
-- No sick sinus syndrome on the chart, so atenolol is ordered.
insert into public.questionnaire_response (
  questionnaire_id,
  patient_id,
  visit_id,
  status,
  authored_at
)
select
  questionnaire.id,
  patient.id,
  visit.id,
  'completed',
  timestamptz '2026-11-12 10:10:00+08'
from public.questionnaire
join public.patient on patient.chart_number = 'SAMPLE-0002'
join public.visit on visit.patient_id = patient.id
where questionnaire.title = 'Sample visit form'
  and questionnaire.version = '1';

insert into public.questionnaire_response_item (response_id, link_id, value_boolean)
select response.id, 'palpitation', true
from public.questionnaire_response as response
join public.patient on patient.id = response.patient_id
where patient.chart_number = 'SAMPLE-0002';

insert into public.questionnaire_response_item (response_id, link_id, value_coding)
select response.id, 'palpitation_duration', 'this-week'
from public.questionnaire_response as response
join public.patient on patient.id = response.patient_id
where patient.chart_number = 'SAMPLE-0002';

insert into public.questionnaire_response_item (response_id, link_id, value_coding)
select response.id, 'symptom_medicine', 'sample-atenolol-50'
from public.questionnaire_response as response
join public.patient on patient.id = response.patient_id
where patient.chart_number = 'SAMPLE-0002';

insert into public.medication_order (
  patient_id,
  visit_id,
  medication_id,
  status,
  dose_text,
  route_text,
  frequency_text,
  authored_on
)
select
  patient.id,
  visit.id,
  medication.id,
  'active',
  '50 mg',
  'oral',
  'once daily',
  '2026-11-12'
from public.patient
join public.visit on visit.patient_id = patient.id
join public.medication on medication.local_code = 'sample-atenolol-50'
where patient.chart_number = 'SAMPLE-0002';

commit;
