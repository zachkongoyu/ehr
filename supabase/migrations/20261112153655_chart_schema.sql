-- Clinic chart for a small Hong Kong outpatient practice.
-- Postgres only. Sign-in is Better Auth in the application.
-- Supabase Auth is not used: no auth.uid() policies, no auth users.
-- The server connects as the database owner (DATABASE_URL) and bypasses RLS.
-- anon and authenticated have no grants. The Data API cannot read the chart.

-- Patient. The chart number is the local identifier. ehr_number is only for a
-- person who has enrolled in eHealth, and it is never the only identifier.
create table public.patient (
  id bigint generated always as identity primary key,
  chart_number text not null,
  family_name text not null,
  given_name text not null,
  name_text text not null,
  identity_document_type text,
  identity_document_number text,
  sex text not null,
  birth_date date not null,
  phone text,
  address text,
  ehr_number text,
  created_at timestamptz not null default now(),
  constraint patient_chart_number_key unique (chart_number),
  constraint patient_sex_chk check (sex in ('female', 'male', 'other', 'unknown')),
  constraint patient_birth_date_chk check (birth_date <= current_date),
  constraint patient_name_chk check (
    length(btrim(family_name)) > 0
    and length(btrim(given_name)) > 0
    and length(btrim(name_text)) > 0
  )
);

create unique index patient_ehr_number_key
  on public.patient (ehr_number)
  where ehr_number is not null;

create unique index patient_identity_document_key
  on public.patient (identity_document_type, identity_document_number)
  where identity_document_number is not null;

comment on table public.patient is
  'The person the chart is about. Local chart number, not the eHR number, identifies the row.';
comment on column public.patient.ehr_number is
  'eHealth number for a person who has enrolled. Null when they have not. Never the only identifier.';

-- Visit. An ambulatory encounter the form and the orders hang off.
create table public.visit (
  id bigint generated always as identity primary key,
  patient_id bigint not null references public.patient (id),
  class text not null default 'ambulatory',
  status text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  provider_name text,
  location_name text,
  disposition text,
  created_at timestamptz not null default now(),
  constraint visit_class_chk check (class = 'ambulatory'),
  constraint visit_status_chk check (status in ('planned', 'in-progress', 'finished', 'cancelled')),
  constraint visit_period_chk check (ended_at is null or ended_at >= started_at)
);

create index visit_patient_id_idx on public.visit (patient_id);

comment on table public.visit is
  'An outpatient encounter. Class is ambulatory.';

-- Problem. One row per problem or diagnosis, queryable without opening a form.
-- Prefer an HKCTT Term ID of nature Diagnosis. Keep the ICD-10, SNOMED CT, and
-- ICPC-2 mappings that were published with that term. Free text, with the code
-- columns null, is a legitimate level-1 problem.
create table public.problem (
  id bigint generated always as identity primary key,
  patient_id bigint not null references public.patient (id),
  visit_id bigint references public.visit (id),
  category text not null,
  clinical_status text not null,
  description text not null,
  recorded_on date not null,
  hkctt_term_id text,
  hkctt_description text,
  hkctt_nature text,
  icd10_code text,
  icd10_name text,
  snomed_concept_id text,
  snomed_term text,
  icpc2_code text,
  icpc2_description text,
  created_at timestamptz not null default now(),
  constraint problem_category_chk check (category in ('problem-list-item', 'encounter-diagnosis')),
  constraint problem_status_chk check (clinical_status in ('active', 'inactive', 'resolved')),
  constraint problem_description_chk check (length(btrim(description)) > 0),
  constraint problem_hkctt_nature_chk check (
    hkctt_nature is null or hkctt_nature = 'Diagnosis'
  ),
  constraint problem_hkctt_complete_chk check (
    (
      hkctt_term_id is null
      and hkctt_description is null
      and hkctt_nature is null
    )
    or (
      hkctt_term_id is not null
      and hkctt_description is not null
      and hkctt_nature = 'Diagnosis'
    )
  )
);

create index problem_patient_id_idx on public.problem (patient_id);
create index problem_visit_id_idx on public.problem (visit_id);
create index problem_active_patient_hkctt_idx
  on public.problem (patient_id, hkctt_term_id)
  where clinical_status = 'active' and hkctt_term_id is not null;

comment on table public.problem is
  'Problem list or encounter diagnosis. hkctt_term_id is an HKCTT Term ID of nature Diagnosis when a published term is known.';
comment on column public.problem.hkctt_nature is
  'Must be Diagnosis when a Term ID is stored. Procedure and drug natures do not belong on this table.';

-- The product. An order and a statement point here.
-- Code it with an HKCTT pharmaceutical-product Term ID or an RPP identifier
-- when one is known. Otherwise the name is enough. No RxNorm column.
create table public.medication (
  id bigint generated always as identity primary key,
  local_code text not null,
  name text not null,
  hkctt_term_id text,
  hkctt_description text,
  hkctt_nature text,
  rpp_identifier text,
  created_at timestamptz not null default now(),
  constraint medication_local_code_key unique (local_code),
  constraint medication_name_chk check (length(btrim(name)) > 0),
  constraint medication_hkctt_nature_chk check (
    hkctt_nature is null or hkctt_nature = 'Pharmaceutical Product'
  ),
  constraint medication_hkctt_complete_chk check (
    (
      hkctt_term_id is null
      and hkctt_description is null
      and hkctt_nature is null
    )
    or (
      hkctt_term_id is not null
      and hkctt_description is not null
      and hkctt_nature = 'Pharmaceutical Product'
    )
  )
);

comment on table public.medication is
  'The medicine product. HKCTT pharmaceutical-product Term ID or RPP identifier when known; name alone when not.';

-- A medicine the clinic orders. Not the record of what the patient is already taking.
create table public.medication_order (
  id bigint generated always as identity primary key,
  patient_id bigint not null references public.patient (id),
  visit_id bigint references public.visit (id),
  medication_id bigint not null references public.medication (id),
  status text not null,
  dose_text text,
  route_text text,
  frequency_text text,
  authored_on date not null,
  created_at timestamptz not null default now(),
  constraint medication_order_status_chk check (
    status in ('draft', 'active', 'completed', 'stopped', 'cancelled')
  )
);

create index medication_order_patient_id_idx on public.medication_order (patient_id);
create index medication_order_visit_id_idx on public.medication_order (visit_id);
create index medication_order_medication_id_idx on public.medication_order (medication_id);

comment on table public.medication_order is
  'An order for supply and administration. Use medication_statement when the fact is that the patient is taking the medicine.';

-- A medicine the patient is taking, including one they reported.
create table public.medication_statement (
  id bigint generated always as identity primary key,
  patient_id bigint not null references public.patient (id),
  visit_id bigint references public.visit (id),
  medication_id bigint not null references public.medication (id),
  status text not null,
  source text not null,
  dose_text text,
  route_text text,
  frequency_text text,
  recorded_on date not null,
  created_at timestamptz not null default now(),
  constraint medication_statement_status_chk check (
    status in ('active', 'completed', 'stopped', 'intended')
  ),
  constraint medication_statement_source_chk check (
    source in ('patient', 'clinician', 'record')
  )
);

create index medication_statement_patient_id_idx on public.medication_statement (patient_id);
create index medication_statement_visit_id_idx on public.medication_statement (visit_id);
create index medication_statement_medication_id_idx on public.medication_statement (medication_id);

comment on table public.medication_statement is
  'A record that the patient is taking a medicine. Not the order, the dispense, or a dose given.';

-- The form definition. Close enough to FHIR Questionnaire to export:
-- link id, type, options, repeats, and enableWhen.
create table public.questionnaire (
  id bigint generated always as identity primary key,
  title text not null,
  status text not null,
  version text not null default '1',
  created_at timestamptz not null default now(),
  constraint questionnaire_status_chk check (status in ('draft', 'active', 'retired')),
  constraint questionnaire_title_version_key unique (title, version)
);

create table public.questionnaire_item (
  id bigint generated always as identity primary key,
  questionnaire_id bigint not null references public.questionnaire (id) on delete cascade,
  parent_item_id bigint references public.questionnaire_item (id) on delete cascade,
  link_id text not null,
  sequence integer not null,
  prompt text not null,
  type text not null,
  repeats boolean not null default false,
  required boolean not null default false,
  enable_behavior text,
  created_at timestamptz not null default now(),
  constraint questionnaire_item_link_id_key unique (questionnaire_id, link_id),
  constraint questionnaire_item_sequence_key unique (questionnaire_id, sequence),
  constraint questionnaire_item_type_chk check (
    type in ('boolean', 'choice', 'open-choice', 'group', 'display')
  ),
  constraint questionnaire_item_enable_behavior_chk check (
    enable_behavior is null or enable_behavior in ('all', 'any')
  ),
  constraint questionnaire_item_prompt_chk check (length(btrim(prompt)) > 0)
);

create index questionnaire_item_questionnaire_id_idx
  on public.questionnaire_item (questionnaire_id);
create index questionnaire_item_parent_item_id_idx
  on public.questionnaire_item (parent_item_id);

comment on table public.questionnaire_item is
  'One question. type is the FHIR answer type, not a widget. enableWhen rows say when it is shown.';
comment on column public.questionnaire_item.enable_behavior is
  'FHIR enableBehavior: all or any, when the item has more than one enableWhen row.';

create table public.questionnaire_item_option (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.questionnaire_item (id) on delete cascade,
  sequence integer not null,
  code text not null,
  display text not null,
  constraint questionnaire_item_option_code_key unique (item_id, code),
  constraint questionnaire_item_option_sequence_key unique (item_id, sequence)
);

create index questionnaire_item_option_item_id_idx
  on public.questionnaire_item_option (item_id);

comment on column public.questionnaire_item_option.code is
  'Answer code. For a medicine choice this matches medication.local_code.';

-- FHIR Questionnaire.item.enableWhen. The item is shown only when an earlier
-- item on the same form has a matching answer.
create table public.questionnaire_item_enable_when (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.questionnaire_item (id) on delete cascade,
  question_link_id text not null,
  operator text not null,
  answer_boolean boolean,
  answer_string text,
  answer_coding text,
  constraint questionnaire_item_enable_when_operator_chk check (
    operator in ('exists', '=', '!=', '>', '<', '>=', '<=')
  ),
  constraint questionnaire_item_enable_when_answer_chk check (
    (
      operator = 'exists'
      and answer_boolean is null
      and answer_string is null
      and answer_coding is null
    )
    or (
      operator <> 'exists'
      and (
        (answer_boolean is not null)::integer
        + (answer_string is not null)::integer
        + (answer_coding is not null)::integer
      ) = 1
    )
  )
);

create index questionnaire_item_enable_when_item_id_idx
  on public.questionnaire_item_enable_when (item_id);

comment on table public.questionnaire_item_enable_when is
  'Show this question only when an earlier answer on the same form matches. This does not read the problem list.';

-- A medicine withheld because a problem is already on the chart.
-- The application evaluates this when it opens the form. It is not enableWhen:
-- enableWhen can see only an answer on the same form.
create table public.medication_withhold_rule (
  id bigint generated always as identity primary key,
  questionnaire_id bigint not null references public.questionnaire (id) on delete cascade,
  item_id bigint not null references public.questionnaire_item (id) on delete cascade,
  when_hkctt_term_id text not null,
  when_problem_text text not null,
  withhold_medication_id bigint not null references public.medication (id),
  reason text not null,
  created_at timestamptz not null default now(),
  constraint medication_withhold_rule_text_chk check (
    length(btrim(when_hkctt_term_id)) > 0
    and length(btrim(when_problem_text)) > 0
    and length(btrim(reason)) > 0
  )
);

create index medication_withhold_rule_questionnaire_id_idx
  on public.medication_withhold_rule (questionnaire_id);
create index medication_withhold_rule_item_id_idx
  on public.medication_withhold_rule (item_id);
create index medication_withhold_rule_medication_id_idx
  on public.medication_withhold_rule (withhold_medication_id);

comment on table public.medication_withhold_rule is
  'When the patient has an active problem with this HKCTT diagnosis Term ID, do not offer withhold_medication_id on item_id.';

-- One filled copy of a questionnaire, kept for traceability.
-- A completed response stores only items that were enabled.
create table public.questionnaire_response (
  id bigint generated always as identity primary key,
  questionnaire_id bigint not null references public.questionnaire (id) on delete cascade,
  patient_id bigint not null references public.patient (id),
  visit_id bigint not null references public.visit (id),
  status text not null,
  authored_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint questionnaire_response_status_chk check (
    status in ('in-progress', 'completed', 'amended')
  )
);

create index questionnaire_response_questionnaire_id_idx
  on public.questionnaire_response (questionnaire_id);
create index questionnaire_response_patient_id_idx
  on public.questionnaire_response (patient_id);
create index questionnaire_response_visit_id_idx
  on public.questionnaire_response (visit_id);

create table public.questionnaire_response_item (
  id bigint generated always as identity primary key,
  response_id bigint not null references public.questionnaire_response (id) on delete cascade,
  link_id text not null,
  value_boolean boolean,
  value_coding text,
  value_string text,
  constraint questionnaire_response_item_value_chk check (
    (
      (value_boolean is not null)::integer
      + (value_coding is not null)::integer
      + (value_string is not null)::integer
    ) = 1
  )
);

create index questionnaire_response_item_response_id_idx
  on public.questionnaire_response_item (response_id);

comment on table public.questionnaire_response_item is
  'One answered item. A hidden enableWhen question is omitted, not stored as null.';

-- The visit on an order, statement, problem, or response must be that patient's visit.
create function public.visit_belongs_to_patient()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.visit_id is not null and not exists (
    select 1
    from public.visit
    where id = new.visit_id
      and patient_id = new.patient_id
  ) then
    raise exception 'visit % is not for patient %', new.visit_id, new.patient_id;
  end if;
  return new;
end;
$$;

comment on function public.visit_belongs_to_patient() is
  'Rejects a chart row whose visit belongs to a different patient.';

create trigger problem_visit_belongs_to_patient
  before insert or update on public.problem
  for each row execute function public.visit_belongs_to_patient();

create trigger medication_order_visit_belongs_to_patient
  before insert or update on public.medication_order
  for each row execute function public.visit_belongs_to_patient();

create trigger medication_statement_visit_belongs_to_patient
  before insert or update on public.medication_statement
  for each row execute function public.visit_belongs_to_patient();

create trigger questionnaire_response_visit_belongs_to_patient
  before insert or update on public.questionnaire_response
  for each row execute function public.visit_belongs_to_patient();

revoke all on function public.visit_belongs_to_patient() from public, anon, authenticated;

-- Data API denial. RLS on, and anon/authenticated cannot select or write.
-- The database owner, used by the application server, bypasses RLS.
do $$
declare
  chart_table text;
begin
  foreach chart_table in array array[
    'patient',
    'visit',
    'problem',
    'medication',
    'medication_order',
    'medication_statement',
    'questionnaire',
    'questionnaire_item',
    'questionnaire_item_option',
    'questionnaire_item_enable_when',
    'medication_withhold_rule',
    'questionnaire_response',
    'questionnaire_response_item'
  ]
  loop
    execute format('alter table public.%I enable row level security', chart_table);
    execute format('revoke all on table public.%I from anon, authenticated', chart_table);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (false) with check (false)',
      chart_table || '_api_denied',
      chart_table
    );
  end loop;
end $$;

revoke all on all sequences in schema public from anon, authenticated;
