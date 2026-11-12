import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { encodeReply } from "next/dist/compiled/react-server-dom-webpack/client.node.js";
import { Pool } from "pg";

const entryUrl = (await readFile(".scratch/preview-url", "utf8")).trim();
if (!/^http:\/\/localhost:3101\/[a-f0-9]{32}$/.test(entryUrl))
  throw new Error("Run npm run preview first");
const origin = "http://localhost:3100";
const login = await fetch(entryUrl, { redirect: "manual" });
const cookie = login.headers
  .getSetCookie()
  .map((value) => value.split(";")[0])
  .join("; ");
assert.ok(cookie.includes("session_token"));
const manifest = JSON.parse(
  await readFile(".next/server/server-reference-manifest.json", "utf8"),
);
const actions = Object.fromEntries(
  Object.entries(manifest.node).map(([id, entry]) => [entry.exportedName, id]),
);
async function page(path) {
  const response = await fetch(origin + path, { headers: { cookie } });
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(!html.includes("Application error"), path);
  return html;
}
async function action(name, args, path = "/patients") {
  const body = await encodeReply(args);
  const headers = { cookie, origin, "next-action": actions[name] };
  if (typeof body === "string")
    headers["content-type"] = "text/plain;charset=UTF-8";
  const response = await fetch(origin + path, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
  });
  assert.equal(response.status, 200, name);
  const wire = await response.text();
  const values = [];
  for (const line of wire.split("\n")) {
    const separator = line.indexOf(":");
    try {
      values.push(JSON.parse(line.slice(separator + 1)));
    } catch {
      /* RSC also carries module and text records. */
    }
  }
  return { values, wire, redirect: response.headers.get("x-action-redirect") };
}
const db = new Pool({
  connectionString: "postgresql://postgres:postgres@127.0.0.1:55432/postgres",
  max: 1,
});
try {
  const denied = await fetch(origin + "/patients", { redirect: "manual" });
  assert.equal(denied.status, 307);
  assert.ok(denied.headers.get("location").includes("sign-in"));
  assert.ok((await page("/patients")).includes("Patient directory"));
  assert.ok((await page("/patients?q=SAMPLE-0001")).includes("SAMPLE-0001"));
  assert.ok(
    !(await page("/patients?q=NO-SUCH-PATIENT")).includes(
      'class="patient-name"',
    ),
  );
  const data = new FormData();
  for (const [key, value] of Object.entries({
    chart_number: "CHECK-" + Date.now(),
    name_text: "Workflow Test",
    family_name: "Test",
    given_name: "Workflow",
    birth_date: "1980-01-01",
    sex: "unknown",
    phone: "55500000",
    address: "Test address",
    identity_document_type: "",
    identity_document_number: "",
    ehr_number: "",
  }))
    data.set(key, value);
  const registered = await action("savePatient", [null, data], "/patients/new");
  const registration = registered.values.find(
    (value) =>
      value && typeof value === "object" && typeof value.id === "string",
  );
  assert.ok(registration, registered.wire.slice(-500));
  const patientId = registration.id;
  assert.ok((await page("/patients/" + patientId)).includes("Workflow Test"));
  await action(
    "addAllergy",
    [
      patientId,
      (() => {
        const form = new FormData();
        form.set("substance", "Test substance");
        form.set("reaction", "Test reaction");
        return form;
      })(),
    ],
    "/patients/" + patientId,
  );
  assert.ok((await page("/patients/" + patientId)).includes("Test reaction"));
  const started = await action("startVisit", [patientId]);
  const visitPath = started.redirect.split(";")[0];
  const visitId = visitPath.split("/").at(-1);
  assert.equal(
    (await action("startVisit", [patientId])).redirect,
    started.redirect,
  );
  const editor = await page(visitPath);
  for (const label of [
    "Presenting complaint",
    "Management plan",
    "Vitals",
    "Prescriptions",
    "Save draft",
    "Complete visit",
  ])
    assert.ok(editor.includes(label), label);
  const medicine = (
    await db.query("select id::text from medication order by id limit 1")
  ).rows[0];
  const input = {
    patientId,
    visitId,
    version: 0,
    intent: "draft",
    note: {
      complaint: "Workflow complaint",
      history: "A saved history",
      examination: "Test examination",
      assessment: "Test assessment",
      plan: "Test plan",
      followUp: "Test follow-up",
    },
    vitals: { systolic: 120, pulse: 72 },
    diagnoses: ["Test diagnosis"],
    prescriptions: [
      {
        medicationId: medicine.id,
        dose: "Test dose",
        route: "Test route",
        frequency: "Test frequency",
      },
    ],
  };
  const draft = await action("saveVisit", [input], visitPath);
  assert.ok(
    draft.values.some((value) => value?.ok === true && value.version === 1),
  );
  assert.ok((await page(visitPath)).includes("A saved history"));
  assert.equal(
    (await db.query("select status from visit where id=$1", [visitId])).rows[0]
      .status,
    "in-progress",
  );
  const stale = await action("saveVisit", [input], visitPath);
  assert.ok(
    stale.values.some(
      (value) => value?.ok === false && value.error === "conflict",
    ),
  );
  input.version = 1;
  assert.ok(
    (await action("saveVisit", [input], visitPath)).values.some(
      (value) => value?.version === 2,
    ),
  );
  input.version = 2;
  input.intent = "complete";
  assert.ok(
    (await action("saveVisit", [input], visitPath)).values.some(
      (value) => value?.version === 3,
    ),
  );
  assert.ok(
    (await action("saveVisit", [input], visitPath)).values.some(
      (value) => value?.error === "closed",
    ),
  );
  const orders = (
    await db.query("select * from medication_order where visit_id=$1", [
      visitId,
    ])
  ).rows;
  assert.equal(orders.length, 1);
  assert.equal(orders[0].status, "active");
  const history = await page("/patients/" + patientId + "?visit=" + visitId);
  for (const text of [
    "A saved history",
    "Test assessment",
    "Test plan",
    "Test follow-up",
    "Test diagnosis",
    "Test dose",
  ])
    assert.ok(history.includes(text), text);
  console.log(
    "Passed: authentication, patient search and registration, allergy recording, resume, editor rendering, draft reload, stale-edit rejection, completion, repeat submission, prescription deduplication, and visit history.",
  );
} finally {
  await db.end();
}
