import { Pool, types, type PoolClient } from "pg";

// pg returns bigint (int8) as a string to avoid precision loss. Our ids are
// well inside Number.MAX_SAFE_INTEGER, and a string id would leak into every
// component prop and comparison, so parse it once here instead.
types.setTypeParser(types.builtins.INT8, (value) => Number.parseInt(value, 10));

// numeric -> number as well, for any future aggregate (counts, averages).
types.setTypeParser(types.builtins.NUMERIC, (value) => Number.parseFloat(value));

declare global {
  var __acadomoPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  return new Pool({
    connectionString,
    // Neon and most hosted Postgres require TLS; local dev does not offer it.
    ssl: connectionString.includes("localhost")
      ? undefined
      : { rejectUnauthorized: true },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

/**
 * Lazily created on first use.
 *
 * Creating the pool at module scope would make importing ANY query module
 * require a live DATABASE_URL — which breaks unit tests of pure helpers, and
 * would crash a build step that merely imports the module.
 *
 * Next.js dev hot-reloads modules on every edit, so the instance is cached on
 * globalThis; without that, each reload would open a new pool and exhaust
 * Postgres connections within minutes.
 */
export function getPool(): Pool {
  if (!globalThis.__acadomoPool) {
    globalThis.__acadomoPool = createPool();
  }
  return globalThis.__acadomoPool;
}

/**
 * Run a parameterized query. Every value MUST be passed via `params` ($1, $2…)
 * — never interpolated into `text`. See CLAUDE.md §3.
 */
export async function query<T extends Record<string, unknown>>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as unknown[]);
  return result.rows;
}

/** Single-row variant; returns null rather than throwing when nothing matches. */
export async function queryOne<T extends Record<string, unknown>>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Runs `fn` inside a transaction on a single dedicated connection.
 * Commits on success, rolls back on any throw, and always releases.
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
