import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // On deploy builds (--skip-if-unconfigured), a missing DATABASE_URL means "no DB
    // for this environment" (e.g. a preview without env vars) — skip instead of
    // failing the build. Local/manual runs keep the loud failure.
    if (process.argv.includes("--skip-if-unconfigured")) {
      console.warn("DATABASE_URL not set — skipping migrations for this build.");
      process.exit(0);
    }
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const migrationsDir = resolve("db/migrations");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    for (const file of files) {
      const migrationPath = resolve(migrationsDir, file);
      const sql = readFileSync(migrationPath, "utf8");
      await client.query(sql);
      console.log("Migration applied:", migrationPath);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
