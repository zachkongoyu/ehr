// Two patients with palpitations today: the first has no rhythm history,
// the second has sick sinus syndrome and an earlier palpitations visit.
export const comparisonCases = [
  { chart: "C207842", family: "Wong", given: "Chi Keung", name: "黃志強", sex: "male", birth: "1970-01-01", address: "Kowloon City, Kowloon", rhythm: false },
  { chart: "C208376", family: "Ho", given: "Suk Yee", name: "何淑儀", sex: "female", birth: "1966-03-14", address: "Chai Wan, Hong Kong Island", rhythm: true },
];

export async function seedCorrelationCases(db, anchor, added) {
  for (const { chart, family, given, name, sex, birth, address, rhythm } of comparisonCases) {
    const created = await db.query(
      `insert into public.patient (chart_number,family_name,given_name,name_text,sex,birth_date,address)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (chart_number) do nothing returning id::text`,
      [chart, family, given, name, sex, birth, address],
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
         values ($1,'finished',$2::date - interval '30 days',$2::date - interval '30 days' + interval '20 minutes','Dr Chan Ka Wai')
         returning id::text`,
        [patient.id, anchor],
      );
      await db.query(
        `insert into public.visit_note (visit_id,complaint,history,assessment,plan,author_name)
         values ($1,'Palpitations','Prior rhythm review. Intermittent symptoms were documented.',
                 'Sick sinus syndrome recorded on the problem list.','Review this record if symptoms recur.','Dr Chan Ka Wai')`,
        [prior.rows[0].id],
      );
      added.visits++;
      added.notes++;
    }

    const draft = await db.query(
      `insert into public.visit (patient_id,status,started_at,provider_name)
       values ($1,'in-progress',$2::date + interval '2 hours','Dr Chan Ka Wai') returning id::text`,
      [patient.id, anchor],
    );
    await db.query(
      "insert into public.visit_note (visit_id,complaint,author_name) values ($1,'Palpitations','Dr Chan Ka Wai')",
      [draft.rows[0].id],
    );
    added.visits++;
    added.notes++;
  }
}
