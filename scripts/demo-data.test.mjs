import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { seedDemo } from "./demo-data.mjs";
import { comparisonCases } from "./correlation-cases.mjs";

test("seed adds varied charts and is safe to repeat", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon;create role authenticated;");
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
    await db.query("begin");
    const added = await seedDemo(db);
    await db.query("commit");
    assert.equal(added.patients, 20);
    assert.equal(added.visits, 93);
    assert.equal(added.notes, 93);
    assert.equal(added.observations, 720);
    assert.equal(added.medicines, 40);
    const comparison = await db.query(
      `select p.chart_number, n.complaint,
              exists(select 1 from problem where patient_id=p.id and hkctt_term_id='7871' and clinical_status='active') as rhythm_history
       from patient p join visit v on v.patient_id=p.id join visit_note n on n.visit_id=v.id
       where p.chart_number = any($1) and v.status='in-progress'
       order by p.chart_number`,
      [comparisonCases.map((item) => item.chart)],
    );
    assert.deepEqual(comparison.rows.map(({ complaint, rhythm_history }) => [complaint, rhythm_history]), [
      ["Palpitations", false],
      ["Palpitations", true],
    ]);
    await db.query("begin");
    const repeated = await seedDemo(db);
    await db.query("commit");
    assert.ok(Object.values(repeated).every((count) => count === 0));
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from patient",
        )
      ).rows[0].count,
      20,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from visit where status='in-progress'",
        )
      ).rows[0].count,
      8,
    );
  } finally {
    await db.close();
  }
});
