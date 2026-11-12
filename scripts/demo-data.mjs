export const medicines = [
  ["PARACETAMOL-500", "Paracetamol 500 mg tablet"],
  ["IBUPROFEN-200", "Ibuprofen 200 mg tablet"],
  ["NAPROXEN-250", "Naproxen 250 mg tablet"],
  ["CETIRIZINE-10", "Cetirizine 10 mg tablet"],
  ["LORATADINE-10", "Loratadine 10 mg tablet"],
  ["FEXOFENADINE-120", "Fexofenadine 120 mg tablet"],
  ["CHLORPHENAMINE-4", "Chlorphenamine 4 mg tablet"],
  ["AMLODIPINE-5", "Amlodipine 5 mg tablet"],
  ["AMLODIPINE-10", "Amlodipine 10 mg tablet"],
  ["LOSARTAN-50", "Losartan 50 mg tablet"],
  ["VALSARTAN-80", "Valsartan 80 mg tablet"],
  ["RAMIPRIL-2.5", "Ramipril 2.5 mg capsule"],
  ["BISOPROLOL-2.5", "Bisoprolol 2.5 mg tablet"],
  ["INDAPAMIDE-2.5", "Indapamide 2.5 mg tablet"],
  ["METFORMIN-500", "Metformin 500 mg tablet"],
  ["METFORMIN-850", "Metformin 850 mg tablet"],
  ["GLICLAZIDE-80", "Gliclazide 80 mg tablet"],
  ["SITAGLIPTIN-100", "Sitagliptin 100 mg tablet"],
  ["EMPAGLIFLOZIN-10", "Empagliflozin 10 mg tablet"],
  ["ATORVASTATIN-10", "Atorvastatin 10 mg tablet"],
  ["ATORVASTATIN-20", "Atorvastatin 20 mg tablet"],
  ["ROSUVASTATIN-5", "Rosuvastatin 5 mg tablet"],
  ["SIMVASTATIN-20", "Simvastatin 20 mg tablet"],
  ["OMEPRAZOLE-20", "Omeprazole 20 mg capsule"],
  ["PANTOPRAZOLE-40", "Pantoprazole 40 mg tablet"],
  ["FAMOTIDINE-20", "Famotidine 20 mg tablet"],
  ["SALBUTAMOL-100", "Salbutamol 100 micrograms/dose inhaler"],
  ["BUDESONIDE-200", "Budesonide 200 micrograms/dose inhaler"],
  [
    "FLUTICASONE-NASAL",
    "Fluticasone propionate 50 micrograms/spray nasal spray",
  ],
  ["MOMETASONE-NASAL", "Mometasone 50 micrograms/spray nasal spray"],
  ["HYDROCORTISONE-1", "Hydrocortisone 1% cream"],
  ["CLOTRIMAZOLE-1", "Clotrimazole 1% cream"],
  ["BETAMETHASONE-0.1", "Betamethasone valerate 0.1% cream"],
  ["EMOLLIENT", "Emollient cream"],
  ["ARTIFICIAL-TEARS", "Hypromellose 0.3% eye drops"],
  ["MACROGOL", "Macrogol oral powder sachet"],
  ["LACTULOSE", "Lactulose oral solution"],
  ["FERROUS-FUMARATE", "Ferrous fumarate 210 mg tablet"],
  ["FOLIC-ACID-5", "Folic acid 5 mg tablet"],
  ["COLECALCIFEROL", "Colecalciferol 1000 IU capsule"],
];

const people = [
  ["Chan", "Mei Lin", "陳美蓮", "female", "1968-04-12"],
  ["Wong", "Chi Ho", "黃志豪", "male", "1975-08-23"],
  ["Lee", "Wing Yan", "李詠欣", "female", "1992-02-17"],
  ["Cheung", "Ka Ming", "張家明", "male", "1984-11-06"],
  ["Lam", "Siu Man", "林小敏", "female", "1955-09-30"],
  ["Ho", "Pak Hei", "何柏熙", "male", "2001-05-19"],
  ["Ng", "Yee Ting", "吳綺婷", "female", "1988-07-08"],
  ["Lau", "Kwok Keung", "劉國強", "male", "1962-12-03"],
  ["Chow", "Tsz Ching", "周梓晴", "female", "1998-03-26"],
  ["Yeung", "Man Kit", "楊文傑", "male", "1979-06-15"],
  ["Cheng", "Hoi Yan", "鄭凱欣", "female", "1986-10-21"],
  ["Tang", "Wai Lun", "鄧偉倫", "male", "1949-01-09"],
  ["Leung", "Sze Wing", "梁思穎", "female", "2004-04-14"],
  ["Tsang", "Kin Fai", "曾健輝", "male", "1971-09-02"],
  ["Mak", "Pui Shan", "麥佩珊", "female", "1995-12-11"],
  ["Yip", "Chun Wai", "葉俊偉", "male", "1982-08-05"],
  ["Fung", "Lok Yi", "馮樂怡", "female", "1965-02-28"],
  ["Au", "Tak Shing", "區德成", "male", "1958-07-16"],
];
const scenarios = [
  {
    complaint: "Blood pressure follow-up",
    problem: "Hypertension",
    medication: "AMLODIPINE-5",
    dose: "1 tablet",
    route: "Oral",
    frequency: "Once daily",
    plan: "Review the recorded blood-pressure diary and discuss the follow-up plan.",
    followUp: "Follow-up review in four weeks.",
  },
  {
    complaint: "Diabetes review",
    problem: "Type 2 diabetes mellitus",
    medication: "METFORMIN-500",
    dose: "1 tablet",
    route: "Oral",
    frequency: "Once daily with a meal",
    plan: "Review the available glucose records and discuss ongoing monitoring.",
    followUp: "Arrange the next chronic-disease review.",
  },
  {
    complaint: "Nasal symptoms review",
    problem: "Allergic rhinitis",
    medication: "CETIRIZINE-10",
    dose: "1 tablet",
    route: "Oral",
    frequency: "Once daily",
    plan: "Review symptom triggers and the agreed symptom-management plan.",
    followUp: "Return for symptom review if the agreed plan is not effective.",
  },
  {
    complaint: "Reflux symptoms review",
    problem: "Gastro-oesophageal reflux",
    medication: "OMEPRAZOLE-20",
    dose: "1 capsule",
    route: "Oral",
    frequency: "Once daily",
    plan: "Discuss the symptom diary and review the existing treatment plan.",
    followUp: "Review at the next scheduled consultation.",
  },
  {
    complaint: "Skin symptoms follow-up",
    problem: "Atopic eczema",
    medication: "EMOLLIENT",
    dose: "Apply a thin layer",
    route: "Topical",
    frequency: "As documented in the care plan",
    plan: "Review skin-care measures and document the agreed plan.",
    followUp: "Follow-up if symptoms persist.",
  },
  {
    complaint: "Routine health review",
    problem: "Health maintenance review",
    medication: null,
    dose: "",
    route: "",
    frequency: "",
    plan: "Review preventive-care history and agree the next review interval.",
    followUp: "Routine review as discussed.",
  },
];
export const demoPatients = people.map(
  ([family, given, chinese, sex, birth], index) => ({
    chartNumber: "DEMO-" + String(index + 101).padStart(4, "0"),
    family,
    given: given + " (Demo)",
    name: "示例 · " + chinese,
    sex,
    birth,
    scenario: scenarios[index % scenarios.length],
    index,
  }),
);

export async function seedDemo(db, { anchor = "2026-11-13" } = {}) {
  const hasNotes = (
    await db.query(
      "select to_regclass('public.visit_note') is not null as present",
    )
  ).rows[0].present;
  const added = {
    patients: 0,
    visits: 0,
    medicines: 0,
    problems: 0,
    orders: 0,
    statements: 0,
    notes: 0,
    observations: 0,
    allergies: 0,
  };
  await db.query("select pg_advisory_xact_lock(hashtext('ehr-demo-seed-v1'))");
  const medicineIds = new Map();
  for (const [code, name] of medicines) {
    const existing = await db.query(
      "select id::text from public.medication where lower(name)=lower($1) order by id limit 1",
      [name],
    );
    if (existing.rows[0]) {
      medicineIds.set(code, existing.rows[0].id);
      continue;
    }
    const inserted = await db.query(
      "insert into public.medication (local_code,name) values ($1,$2) on conflict (local_code) do nothing returning id::text",
      ["DEMO-MED-" + code, name],
    );
    added.medicines += inserted.rows.length;
    const result = await db.query(
      "select id::text from public.medication where local_code=$1",
      ["DEMO-MED-" + code],
    );
    medicineIds.set(code, result.rows[0].id);
  }
  for (const person of demoPatients) {
    const inserted = await db.query(
      `insert into public.patient (chart_number,family_name,given_name,name_text,sex,birth_date,address)
   values ($1,$2,$3,$4,$5,$6,'Synthetic demonstration record — not a real patient')
   on conflict (chart_number) do nothing returning id::text`,
      [
        person.chartNumber,
        person.family,
        person.given,
        person.name,
        person.sex,
        person.birth,
      ],
    );
    added.patients += inserted.rows.length;
    const patient = (
      await db.query(
        "select id::text from public.patient where chart_number=$1",
        [person.chartNumber],
      )
    ).rows[0];
    const scene = person.scenario;
    if (inserted.rows.length) {
      await db.query(
        `insert into public.problem (patient_id,category,clinical_status,description,recorded_on) values ($1,'problem-list-item','active',$2,$3)`,
        [patient.id, scene.problem, anchor],
      );
      added.problems++;
      if (scene.medication) {
        await db.query(
          `insert into public.medication_statement (patient_id,medication_id,status,source,dose_text,route_text,frequency_text,recorded_on)
     values ($1,$2,'active','record',$3,$4,$5,$6)`,
          [
            patient.id,
            medicineIds.get(scene.medication),
            scene.dose,
            scene.route,
            scene.frequency,
            anchor,
          ],
        );
        added.statements++;
      }
    }
    if (hasNotes && person.index % 4 === 0) {
      const allergies = await db.query(
        "insert into public.patient_allergy (patient_id,substance,reaction) select $1,'Demo allergen — penicillin','Synthetic example: reported rash' where not exists (select 1 from public.patient_allergy where patient_id=$1 and substance='Demo allergen — penicillin') returning id",
        [patient.id],
      );
      added.allergies += allergies.rows.length;
    }
    for (let visitIndex = 0; visitIndex < 5; visitIndex++) {
      const dayOffset = [180, 90, 30, 7, 0][visitIndex];
      const date = new Date(anchor + "T01:00:00.000Z");
      date.setUTCDate(date.getUTCDate() - dayOffset);
      date.setUTCMinutes((person.index % 10) * 25);
      const started = date.toISOString();
      const status =
        visitIndex === 4 && person.index % 3 === 0 ? "in-progress" : "finished";
      const doctor = ["Demo Dr Chan", "Demo Dr Wong", "Demo Dr Lee"][
        person.index % 3
      ];
      const existing = await db.query(
        "select id::text from public.visit where patient_id=$1 and started_at=$2 order by id limit 1",
        [patient.id, started],
      );
      let visit = existing.rows[0];
      if (!visit) {
        const ended =
          status === "finished"
            ? new Date(date.getTime() + 20 * 60000).toISOString()
            : null;
        visit = (
          await db.query(
            "insert into public.visit (patient_id,status,started_at,ended_at,provider_name,location_name) values ($1,$2,$3,$4,$5,'Demo clinic · Consultation room '||$6) returning id::text",
            [
              patient.id,
              status,
              started,
              ended,
              doctor,
              String((person.index % 3) + 1),
            ],
          )
        ).rows[0];
        added.visits++;
        await db.query(
          `insert into public.problem (patient_id,visit_id,category,clinical_status,description,recorded_on) values ($1,$2,'encounter-diagnosis','active',$3,$4)`,
          [
            patient.id,
            visit.id,
            scene.problem,
            date.toISOString().slice(0, 10),
          ],
        );
        added.problems++;
        if (scene.medication) {
          await db.query(
            `insert into public.medication_order (patient_id,visit_id,medication_id,status,dose_text,route_text,frequency_text,authored_on) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              patient.id,
              visit.id,
              medicineIds.get(scene.medication),
              status === "in-progress" ? "draft" : "completed",
              scene.dose,
              scene.route,
              scene.frequency,
              date.toISOString().slice(0, 10),
            ],
          );
          added.orders++;
        }
      }
      if (hasNotes) {
        const notes = await db.query(
          `insert into public.visit_note (visit_id,complaint,history,examination,assessment,plan,follow_up,author_name)
     values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (visit_id) do nothing returning visit_id`,
          [
            visit.id,
            scene.complaint,
            "Synthetic record for workflow testing. Review " +
              (visitIndex + 1) +
              " of five; prior documentation is available in the visit timeline.",
            "Synthetic examination entry. Recorded measurements are demonstration values.",
            scene.problem + " — synthetic assessment.",
            scene.plan +
              " This is demonstration data, not prescribing guidance.",
            scene.followUp,
            doctor,
          ],
        );
        added.notes += notes.rows.length;
        const values = {
          systolic: 118 + (person.index % 8) * 3 + visitIndex,
          diastolic: 72 + (person.index % 6) * 2,
          pulse: 66 + (person.index % 7) * 3,
          temperature: 36.5 + (person.index % 3) / 10,
          respiratory: 14 + (person.index % 4),
          oxygen: 97 + (person.index % 3),
          weight: 54 + person.index * 2 + visitIndex / 10,
          height: 155 + (person.index % 10) * 2,
        };
        const units = {
          systolic: "mmHg",
          diastolic: "mmHg",
          pulse: "/min",
          temperature: "°C",
          respiratory: "/min",
          oxygen: "%",
          weight: "kg",
          height: "cm",
        };
        for (const [code, value] of Object.entries(values)) {
          const observations = await db.query(
            "insert into public.visit_observation (visit_id,code,value,unit) values ($1,$2,$3,$4) on conflict (visit_id,code) do nothing returning code",
            [visit.id, code, value, units[code]],
          );
          added.observations += observations.rows.length;
        }
      }
    }
  }
  return added;
}
