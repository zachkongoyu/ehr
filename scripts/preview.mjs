import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { seedDemo } from "./demo-data.mjs";

// The preview owns its synthetic database and never reads DATABASE_URL.
const db = await PGlite.create();
await db.exec("create role anon; create role authenticated;");
for (const file of (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()) {
  await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
}
await db.exec(await readFile("supabase/seed.sql", "utf8"));
await db.query("begin");
await seedDemo(db);
await db.query("commit");
const socket = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port: 55432,
  maxConnections: 8,
});
await socket.start();
const app = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3100", "-H", "127.0.0.1"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55432/postgres",
    },
  },
);
const url = "http://localhost:3100/dashboard";
console.log("Disposable clinic demo: " + url);
await mkdir(".scratch", { recursive: true });
await writeFile(".scratch/preview-url", url);
process.on("SIGINT", () => {
  app.kill();
  void socket
    .stop()
    .then(() => db.close())
    .finally(() => process.exit());
});
