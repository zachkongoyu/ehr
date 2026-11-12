alter table public.visit add column documentation_version integer not null default 0;

create table public.visit_note (
  visit_id bigint primary key references public.visit(id),
  complaint text not null default '',
  history text not null default '',
  examination text not null default '',
  assessment text not null default '',
  plan text not null default '',
  follow_up text not null default '',
  author_name text not null,
  updated_at timestamptz not null default now()
);

create table public.visit_observation (
  visit_id bigint not null references public.visit(id),
  code text not null check (code in ('systolic','diastolic','pulse','temperature','respiratory','oxygen','weight','height')),
  value numeric not null,
  unit text not null,
  primary key (visit_id, code)
);

alter table public.visit_note enable row level security;
alter table public.visit_observation enable row level security;
revoke all on public.visit_note, public.visit_observation from public, anon, authenticated;

comment on table public.visit_note is 'Consultation documentation. Completed visits are read-only in the application.';
comment on table public.visit_observation is 'Recorded vital measurements with their units, associated with an encounter.';

create table public.patient_allergy (
  id bigint generated always as identity primary key,
  patient_id bigint not null references public.patient(id),
  substance text not null check (length(btrim(substance)) > 0),
  reaction text not null default '',
  recorded_at timestamptz not null default now()
);
create index patient_allergy_patient_idx on public.patient_allergy(patient_id);
alter table public.patient_allergy enable row level security;
revoke all on public.patient_allergy from public, anon, authenticated;
