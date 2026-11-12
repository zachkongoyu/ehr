import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";

// This process owns an ephemeral database and never reads DATABASE_URL.
const db = await PGlite.create();
await db.exec("create role anon; create role authenticated;");
for (const file of (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()) {
  await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
}
await db.exec(await readFile("supabase/seed.sql", "utf8"));
const socket = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port: 55432,
  maxConnections: 8,
});
await socket.start();
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:55432/postgres";
const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const secret = randomBytes(32).toString("hex");
const options = {
  database: pool,
  secret,
  baseURL: "http://localhost:3100",
  emailAndPassword: { enabled: true },
};
await (await getMigrations(options)).runMigrations();
const auth = betterAuth(options);
const login = await auth.api.signUpEmail({
  body: {
    name: "Preview Doctor",
    email: "preview@example.invalid",
    password: randomBytes(24).toString("hex"),
  },
  returnHeaders: true,
});
const cookie = login.headers.get("set-cookie");
if (!cookie) throw new Error("Preview session was not created");
const previewToken = randomBytes(16).toString("hex");
const entry = createServer((request, response) => {
  if (request.url !== "/" + previewToken) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(302, {
    "set-cookie": [cookie, "locale=en; Path=/; SameSite=Lax"],
    location: "http://localhost:3100/patients",
  });
  response.end();
});
entry.listen(3101, "127.0.0.1");
const app = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3100", "-H", "127.0.0.1"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_SECRET: secret,
      BETTER_AUTH_URL: "http://localhost:3100",
    },
  },
);
console.log("Disposable preview: http://localhost:3101/" + previewToken);
await mkdir(".scratch", { recursive: true });
await writeFile(
  ".scratch/preview-url",
  "http://localhost:3101/" + previewToken,
);
process.on("SIGINT", () => {
  app.kill();
  entry.close();
  void pool
    .end()
    .then(() => socket.stop())
    .then(() => db.close())
    .finally(() => process.exit());
});
