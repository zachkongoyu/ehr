import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  parseConsultation,
  writeConsultation,
  type Consultation,
} from "./consultation.ts";

test("drafts resume, completion is explicit, duplicate submissions and stale edits cannot change the chart", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated;");
    await db.exec(
      await readFile(
        "supabase/migrations/20261112153655_chart_schema.sql",
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261112163320_consultation_workspace.sql",
        "utf8",
      ),
    );
    await db.exec(`insert into patient (chart_number,family_name,given_name,name_text,sex,birth_date)
      values ('TEST-1','Test','Patient','Test Patient','unknown','1980-01-01');
      insert into visit (patient_id,status,started_at) values (1,'in-progress',now());
      insert into medication (local_code,name) values ('TEST-MED','Test medicine');`);
    await db.exec(`insert into problem (patient_id,visit_id,category,clinical_status,description,recorded_on,hkctt_term_id,hkctt_description,hkctt_nature)
      values (1,1,'encounter-diagnosis','active','Headache',current_date,'TEST-CODE','Test concept','Diagnosis');`);
    const input: Consultation = {
      patientId: "1",
      visitId: "1",
      version: 0,
      intent: "draft",
      note: {
        complaint: "Headache",
        history: "Since yesterday",
        examination: "",
        assessment: "",
        plan: "",
        followUp: "",
      },
      vitals: { systolic: 120, diastolic: 80 },
      diagnoses: ["Headache"],
      prescriptions: [
        {
          medicationId: "1",
          dose: "One tablet",
          route: "Oral",
          frequency: "As directed",
        },
      ],
    };
    const connection = {
      query: <Row extends Record<string, unknown>>(
        sql: string,
        values?: unknown[],
      ) => db.query<Row>(sql, values),
    };
    assert.equal(
      await writeConsultation(
        connection,
        parseConsultation(input),
        "Test doctor",
      ),
      1,
    );
    assert.equal(
      (await db.query<{status:string}>("select status from visit")).rows[0].status,
      "in-progress",
    );
    assert.equal(
      (await db.query<{history:string}>("select history from visit_note")).rows[0].history,
      "Since yesterday",
    );
    assert.equal(
      (await db.query<{status:string}>("select status from medication_order")).rows[0].status,
      "draft",
    );
    await assert.rejects(writeConsultation(connection, input, "Other doctor"), {
      code: "conflict",
    });
    input.version = 1;
    input.note.history = "Updated history";
    assert.equal(await writeConsultation(connection, input, "Test doctor"), 2);
    assert.equal(
      (await db.query("select * from medication_order")).rows.length,
      1,
    );
    assert.equal((await db.query("select * from problem")).rows.length, 1);
    assert.equal(
      (await db.query<{hkctt_term_id:string}>("select hkctt_term_id from problem")).rows[0]
        .hkctt_term_id,
      "TEST-CODE",
    );
    assert.equal(
      (await db.query("select * from visit_observation")).rows.length,
      2,
    );
    input.version = 2;
    input.intent = "complete";
    input.note.assessment = "Clinical assessment";
    input.note.plan = "Management plan";
    assert.equal(
      await writeConsultation(
        connection,
        parseConsultation(input),
        "Test doctor",
      ),
      3,
    );
    assert.equal(
      (await db.query<{status:string}>("select status from visit")).rows[0].status,
      "finished",
    );
    assert.equal(
      (await db.query<{status:string}>("select status from medication_order")).rows[0].status,
      "active",
    );
    await assert.rejects(writeConsultation(connection, input, "Test doctor"), {
      code: "closed",
    });
    assert.equal(
      (await db.query("select * from medication_order")).rows.length,
      1,
    );
    assert.equal(
      (await db.query<{history:string}>("select history from visit_note")).rows[0].history,
      "Updated history",
    );
    assert.equal(
      (
        await db.query<{relrowsecurity:boolean}>(
          "select relrowsecurity from pg_class where relname='visit_note'",
        )
      ).rows[0].relrowsecurity,
      true,
    );
    assert.equal(
      (
        await db.query<{allowed:boolean}>(
          "select has_table_privilege('anon','visit_note','select') as allowed",
        )
      ).rows[0].allowed,
      false,
    );
    await db.exec(`insert into visit (patient_id,status,started_at) values (1,'in-progress',now());
      insert into questionnaire (title,status) values ('Test rule','active');
      insert into questionnaire_item (questionnaire_id,link_id,sequence,prompt,type) values (1,'medicine',1,'Test medicine','choice');
      insert into medication_withhold_rule (questionnaire_id,item_id,when_hkctt_term_id,when_problem_text,withhold_medication_id,reason)
      values (1,1,'TEST-CODE','Test concept',1,'Test restriction');`);
    const blockedInput = {
      ...input,
      visitId: "2",
      version: 0,
      intent: "draft",
    } satisfies Consultation;
    await assert.rejects(
      writeConsultation(connection, blockedInput, "Test doctor"),
      { code: "blocked" },
    );
    assert.equal(
      (await db.query("select * from visit_note where visit_id=2")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from medication_order where visit_id=2")).rows
        .length,
      0,
    );
    await assert.rejects(
      writeConsultation(
        connection,
        { ...blockedInput, patientId: "999" },
        "Test doctor",
      ),
      { code: "closed" },
    );
  } finally {
    await db.close();
  }
});

test("invalid clinical entries are rejected at the boundary", () => {
  const input = {
    patientId: "1",
    visitId: "1",
    version: 0,
    intent: "draft",
    note: {
      complaint: "",
      history: "",
      examination: "",
      assessment: "",
      plan: "",
      followUp: "",
    },
    vitals: {},
    diagnoses: [],
    prescriptions: [],
  };
  assert.equal(parseConsultation(input).intent, "draft");
  assert.throws(() => parseConsultation({ ...input, intent: "complete" }), {
    code: "invalid",
  });
  assert.throws(
    () => parseConsultation({ ...input, vitals: { oxygen: 101 } }),
    { code: "invalid" },
  );
  assert.throws(() => parseConsultation({ ...input, vitals: { pulse: NaN } }), {
    code: "invalid",
  });
  assert.throws(() => parseConsultation({ ...input, patientId: "1 or 1=1" }), {
    code: "invalid",
  });
});
