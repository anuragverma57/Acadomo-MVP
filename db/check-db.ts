/**
 * Connection smoke test. Run: npm run db:check
 * Prints where it is connected and what is in there, without exposing secrets.
 */
import { getPool, query } from "../lib/db/client";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set in .env.local");

  const redacted = url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:****@");
  console.log(`\n  target: ${redacted}\n`);

  const [info] = await query<{ db: string; usr: string; version: string }>(
    `SELECT current_database() AS db, current_user AS usr, version() AS version`,
  );

  console.log(`  connected : ${info.db} as ${info.usr}`);
  console.log(`  server    : ${info.version.split(",")[0]}`);

  // pg_stat_ssl reflects the POOLER's own backend connection, not ours, so it
  // reads false even on a TLS link. The client socket is the real signal.
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  if (isLocal) {
    console.log(`  TLS       : not used (local)`);
  } else {
    const client = await getPool().connect();
    const socket = (
      client as unknown as { connection?: { stream?: Record<string, unknown> } }
    ).connection?.stream;
    const encrypted = Boolean(socket?.encrypted);
    const authorized = Boolean(socket?.authorized);
    const protocol =
      typeof socket?.getProtocol === "function"
        ? (socket.getProtocol as () => string)()
        : "?";
    client.release();

    console.log(
      `  TLS       : ${
        encrypted
          ? `${protocol} ${authorized ? "· certificate verified ✓" : "· ENCRYPTED BUT UNVERIFIED"}`
          : "NOT ENCRYPTED ✗"
      }`,
    );
  }

  const tables = await query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1",
  );

  if (tables.length === 0) {
    console.log(`\n  tables    : none — run "npm run db:reset && npm run db:seed"\n`);
    return;
  }

  console.log(`\n  tables    : ${tables.map((t) => t.tablename).join(", ")}`);

  const [counts] = await query<{ properties: number; admins: number }>(
    `SELECT (SELECT count(*) FROM properties)  AS properties,
            (SELECT count(*) FROM admin_users) AS admins`,
  );
  console.log(`  rows      : ${counts.properties} properties, ${counts.admins} admin\n`);
}

main()
  .then(() => getPool().end())
  .catch((error) => {
    console.error(`\n  ✗ ${error instanceof Error ? error.message : error}\n`);
    getPool().end();
    process.exit(1);
  });
