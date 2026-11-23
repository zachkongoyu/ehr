-- One-off update for databases seeded before the demo labels were removed.
-- Renames the existing synthetic records in place so they match what
-- scripts/demo-data.mjs, scripts/correlation-cases.mjs and supabase/seed.sql
-- now produce. Safe to run twice: every statement only matches old values.
begin;

-- Patients from scripts/demo-data.mjs: DEMO-0101 … DEMO-0118.
update public.patient
set chart_number = 'C' || (204117 + (substr(chart_number, 6)::int - 101) * 389)::text,
    name_text = regexp_replace(name_text, '^示例\s*·\s*', ''),
    given_name = replace(given_name, ' (Demo)', ''),
    address = (array['Kwun Tong, Kowloon', 'Sha Tin, New Territories', 'Mong Kok, Kowloon',
                     'Tseung Kwan O, New Territories', 'Wan Chai, Hong Kong Island', 'Tuen Mun, New Territories',
                     'Sham Shui Po, Kowloon', 'Tai Po, New Territories', 'North Point, Hong Kong Island',
                     'Tsuen Wan, New Territories'])[((substr(chart_number, 6)::int - 101) % 10) + 1]
where chart_number ~ '^DEMO-0[0-9]{3}$';

-- Patients from supabase/seed.sql: SAMPLE-0001 and SAMPLE-0002.
update public.patient
set chart_number = case chart_number when 'SAMPLE-0001' then 'C103285' else 'C106914' end,
    address = case chart_number when 'SAMPLE-0001' then 'Yau Ma Tei, Kowloon' else 'Tai Kok Tsui, Kowloon' end,
    identity_document_type = null,
    identity_document_number = null,
    phone = null
where chart_number in ('SAMPLE-0001', 'SAMPLE-0002');

-- Comparison patients from scripts/correlation-cases.mjs, if present.
update public.patient
set chart_number = case chart_number when 'DEMO-RHYTHM-A' then 'C207842' else 'C208376' end,
    family_name = case chart_number when 'DEMO-RHYTHM-A' then 'Wong' else 'Ho' end,
    given_name = case chart_number when 'DEMO-RHYTHM-A' then 'Chi Keung' else 'Suk Yee' end,
    name_text = case chart_number when 'DEMO-RHYTHM-A' then '黃志強' else '何淑儀' end,
    sex = case chart_number when 'DEMO-RHYTHM-A' then 'male' else 'female' end,
    birth_date = case chart_number when 'DEMO-RHYTHM-A' then date '1970-01-01' else date '1966-03-14' end,
    address = case chart_number when 'DEMO-RHYTHM-A' then 'Kowloon City, Kowloon' else 'Chai Wan, Hong Kong Island' end
where chart_number in ('DEMO-RHYTHM-A', 'DEMO-RHYTHM-B');

-- Clinicians and rooms.
update public.visit
set provider_name = case provider_name
      when 'Demo Dr Chan' then 'Dr Chan Ka Wai'
      when 'Demo Dr Wong' then 'Dr Wong Siu Fung'
      when 'Demo Dr Lee' then 'Dr Lee Hoi Ying'
      when 'Dr Sample' then 'Dr Lee Hoi Ying'
      when 'Demo clinician' then 'Duty doctor'
      else provider_name end,
    location_name = case
      when location_name like 'Demo clinic · %' then replace(location_name, 'Demo clinic · ', '')
      when location_name = 'Sample Clinic, Mong Kok' then 'Consultation room 1'
      else location_name end
where provider_name in ('Demo Dr Chan', 'Demo Dr Wong', 'Demo Dr Lee', 'Dr Sample', 'Demo clinician')
   or location_name like 'Demo clinic · %' or location_name = 'Sample Clinic, Mong Kok';

update public.visit_note
set author_name = case author_name
      when 'Demo Dr Chan' then 'Dr Chan Ka Wai'
      when 'Demo Dr Wong' then 'Dr Wong Siu Fung'
      when 'Demo Dr Lee' then 'Dr Lee Hoi Ying'
      when 'Dr Sample' then 'Dr Lee Hoi Ying'
      else 'Duty doctor' end
where author_name in ('Demo Dr Chan', 'Demo Dr Wong', 'Demo Dr Lee', 'Dr Sample', 'Demo clinician');

-- Clinical notes written as placeholders.
update public.visit_note n
set history = s.history, examination = s.examination, assessment = s.assessment,
    plan = replace(n.plan, ' This is demonstration data, not prescribing guidance.', '')
from (values
  ('Blood pressure follow-up',
   'Home readings mostly 130s/80s. No headache, chest pain or breathlessness. Taking amlodipine every morning.',
   'Alert and comfortable. Heart sounds normal. No ankle oedema.',
   'Hypertension, controlled on current treatment.'),
  ('Diabetes review',
   'Fasting glucose 6–8 mmol/L at home. No polyuria and no hypoglycaemic episodes. Diet reviewed with patient.',
   'Feet: pulses present, monofilament sensation intact, no ulcers.',
   'Type 2 diabetes mellitus, stable.'),
  ('Nasal symptoms review',
   'Sneezing and nasal blockage, worse in the morning and with dust. No fever or facial pain.',
   'Nasal mucosa pale and swollen. Throat clear. Chest clear.',
   'Allergic rhinitis.'),
  ('Reflux symptoms review',
   'Heartburn after late meals, better on omeprazole. No dysphagia, weight loss or black stools.',
   'Abdomen soft and non-tender.',
   'Gastro-oesophageal reflux, improving.'),
  ('Skin symptoms follow-up',
   'Itchy dry patches on both elbows, flaring in dry weather. Using emollient twice daily.',
   'Dry, lichenified patches in both antecubital fossae. No signs of infection.',
   'Atopic eczema, mild.'),
  ('Routine health review',
   'No new symptoms. Non-smoker, drinks socially, exercises twice a week.',
   'Well. Cardiovascular and respiratory examination normal.',
   'Health maintenance review; no new concerns.')
) as s(complaint, history, examination, assessment)
where n.complaint = s.complaint and n.history like 'Synthetic record for workflow testing.%';

-- Allergy and medicine codes.
update public.patient_allergy set substance = 'Penicillin', reaction = 'Rash'
where substance = 'Demo allergen — penicillin';
update public.medication set local_code = 'LOC-' || substr(local_code, 10)
where local_code like 'DEMO-MED-%';

commit;
