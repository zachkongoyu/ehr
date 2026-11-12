import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { seedDemo } from "./demo-data.mjs";

test("demo seed adds varied synthetic charts and is safe to repeat", async () => {
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
    assert.equal(added.patients, 18);
    assert.equal(added.visits, 90);
    assert.equal(added.notes, 90);
    assert.equal(added.observations, 720);
    assert.equal(added.medicines, 40);
    await db.query("begin");
    const repeated = await seedDemo(db);
    await db.query("commit");
    assert.ok(Object.values(repeated).every((count) => count === 0));
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from patient where chart_number like 'DEMO-%'",
        )
      ).rows[0].count,
      18,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from visit where status='in-progress'",
        )
      ).rows[0].count,
      6,
    );
  } finally {
    await db.close();
  }
});
