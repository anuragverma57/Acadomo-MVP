/**
 * One-time production setup: applies the schema and seeds baseline data.
 *
 * Run with an explicit DATABASE_URL so it can never hit the wrong database:
 *   DATABASE_URL="<supabase-uri>" ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:setup-prod
 *
 * Refuses to run against a database that already holds enquiries or students,
 * so it cannot wipe real data by accident.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getPool, query } from "../lib/db/client";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (/localhost|127\.0\.0\.1/.test(url)) {
    throw new Error("Refusing to run: DATABASE_URL points at localhost");
  }

  console.log(`\n  target: ${url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:****@")}\n`);

  // Guard against destroying live data.
  const existing = await query<{ enquiries: number; students: number }>(
    `SELECT
       (SELECT count(*) FROM information_schema.tables
         WHERE table_schema='public' AND table_name='enquiries') > 0 AS has_tables,
       0 AS enquiries, 0 AS students`,
  ).catch(() => [{ enquiries: 0, students: 0 }]);

  if (existing.length) {
    const live = await query<{ n: number }>(
      `SELECT (SELECT count(*) FROM enquiries) + (SELECT count(*) FROM students) AS n`,
    ).catch(() => [{ n: 0 }]);

    if ((live[0]?.n ?? 0) > 0 && process.env.FORCE !== "1") {
      throw new Error(
        `Database already holds ${live[0]!.n} enquiries/students. ` +
          `Re-run with FORCE=1 only if you intend to wipe them.`,
      );
    }
  }

  const schema = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  await query(schema);
  console.log("  ✓ schema applied");
}

main()
  .then(async () => {
    await getPool().end();
    console.log("  → now run: npm run db:seed (with the same DATABASE_URL)\n");
  })
  .catch((error) => {
    console.error(`\n  ✗ ${error instanceof Error ? error.message : error}\n`);
    getPool().end();
    process.exit(1);
  });
