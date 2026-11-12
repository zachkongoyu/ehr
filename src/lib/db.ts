import { Pool, types } from "pg";

types.setTypeParser(1082, (value) => value);
types.setTypeParser(1114, (value) => value);
types.setTypeParser(1184, (value) => value);

const globalForPg = globalThis as unknown as { clinicPool?: Pool };

export function getPool() {
  if (!globalForPg.clinicPool) {
    const connectionString =
      process.env.DATABASE_URL ?? "postgresql://127.0.0.1:5432/postgres";
    globalForPg.clinicPool = new Pool({
      connectionString,
      max: 5,
      ssl: connectionString.includes("supabase")
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return globalForPg.clinicPool;
}
