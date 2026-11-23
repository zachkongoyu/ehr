const cases = [
  { suffix: "A", rhythm: false },
  { suffix: "B", rhythm: true },
];

export async function seedCorrelationCases(db, anchor, added) {
  for (const { suffix, rhythm } of cases) {
    const created = await db.query(
      `insert into public.patient (chart_number,family_name,given_name,name_text,sex,birth_date,address)
       values ($1,'Demo',$2,$3,'unknown','1970-01-01','Synthetic comparison case')
       on conflict (chart_number) do nothing returning id::text`,
      ["DEMO-RHYTHM-" + suffix, suffix, "Rhythm Demo " + suffix],
    );
    const patient = created.rows[0];
    if (!patient) continue;
    added.patients++;

    if (rhythm) {
      await db.query(
        `insert into public.problem
         (patient_id,category,clinical_status,description,recorded_on,hkctt_term_id,hkctt_description,hkctt_nature)
         values ($1,'problem-list-item','active','Sick sinus syndrome',$2,'7871','Sick sinus syndrome','Diagnosis')`,
        [patient.id, anchor],
      );
      added.problems++;

      const prior = await db.query(
        `insert into public.visit (patient_id,status,started_at,ended_at,provider_name)
         values ($1,'finished',$2::date - interval '30 days',$2::date - interval '30 days' + interval '20 minutes','Demo Dr Chan')
         returning id::text`,
        [patient.id, anchor],
      );
      await db.query(
        `insert into public.visit_note (visit_id,complaint,history,assessment,plan,author_name)
         values ($1,'Palpitations','Prior rhythm review. Intermittent symptoms were documented.',
                 'Sick sinus syndrome recorded on the problem list.','Review this record if symptoms recur.','Demo Dr Chan')`,
        [prior.rows[0].id],
      );
      added.visits++;
      added.notes++;
    }

    const draft = await db.query(
      `insert into public.visit (patient_id,status,started_at,provider_name)
       values ($1,'in-progress',$2::date + interval '2 hours','Demo Dr Chan') returning id::text`,
      [patient.id, anchor],
    );
    await db.query(
      "insert into public.visit_note (visit_id,complaint,author_name) values ($1,'Palpitations','Demo Dr Chan')",
      [draft.rows[0].id],
    );
    added.visits++;
    added.notes++;
  }
}
