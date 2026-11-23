import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { seedDemo } from "./demo-data.mjs";

const url = process.env.DATABASE_URL;
if (!url || !url.includes("ixbmmqmyxtgrrzaiztwy"))
  throw new Error("Refusing to seed: expected the EHR Supabase project");
if (!process.argv.includes("--apply"))
  throw new Error(
    "Pass --apply to apply the approved additive migration and synthetic seed",
  );
const db = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const client = await db.connect();
try {
  await client.query("begin");
  await client.query("set local lock_timeout='10s'");
  const before = (
    await client.query(
      "select (select count(*) from patient) as patients,(select count(*) from visit) as visits,(select count(*) from medication) as medicines",
    )
  ).rows[0];
  const state = (
    await client.query(
      "select to_regclass('public.visit_note') is not null as notes,to_regclass('public.visit_observation') is not null as observations,to_regclass('public.patient_allergy') is not null as allergies,exists(select 1 from information_schema.columns where table_schema='public' and table_name='visit' and column_name='documentation_version') as version",
    )
  ).rows[0];
  let migrated = false;
  if (Object.values(state).every((value) => value === false)) {
    const sql = await readFile(
      "supabase/migrations/20261112163320_consultation_workspace.sql",
      "utf8",
    );
    await client.query(sql);
    migrated = true;
    const ledger = (
      await client.query(
        "select to_regclass('supabase_migrations.schema_migrations') is not null as present",
      )
    ).rows[0].present;
    if (ledger) {
      const columns = (
        await client.query(
          "select column_name from information_schema.columns where table_schema='supabase_migrations' and table_name='schema_migrations'",
        )
      ).rows.map((row) => row.column_name);
      if (
        ["version", "name", "statements"].every((column) =>
          columns.includes(column),
        )
      )
        await client.query(
          "insert into supabase_migrations.schema_migrations (version,name,statements) values ($1,$2,$3) on conflict (version) do nothing",
          ["20261112163320", "consultation_workspace", [sql]],
        );
    }
  } else if (!Object.values(state).every((value) => value === true))
    throw new Error("Partial migration detected; no records were changed");
  const added = await seedDemo(client);
  const totals = (
    await client.query(
      "select (select count(*) from patient) as patients,(select count(*) from visit) as visits,(select count(*) from medication) as medicines,(select count(*) from visit_note) as notes,(select count(*) from visit_observation) as observations,(select count(*) from patient_allergy) as allergies",
    )
  ).rows[0];
  const rls = (
    await client.query(
      "select relname,relrowsecurity,has_table_privilege('anon',oid,'select') as anon_read from pg_class where oid in ('public.visit_note'::regclass,'public.visit_observation'::regclass,'public.patient_allergy'::regclass)",
    )
  ).rows;
  if (
    rls.length !== 3 ||
    rls.some((row) => !row.relrowsecurity || row.anon_read)
  )
    throw new Error("Clinical table access checks failed; rolling back");
  await client.query("commit");
  console.log(
    JSON.stringify({
      target: "EHR Supabase",
      migrationApplied: migrated,
      before,
      added,
      totals,
      tableAccess: rls,
    }),
  );
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await db.end();
}
