import { schema } from "./schema";
import { AppError } from "@/lib/domain";
export interface DB {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
}
const globalDb = globalThis as unknown as { certiioDb?: Promise<DB> };
export async function localDatabase(path?: string): Promise<DB> {
  if (path) {
    const fs = await import("node:fs/promises");
    const paths = await import("node:path");
    await fs.mkdir(paths.dirname(path), { recursive: true });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(path);
  await pg.exec(schema);
  const wrap = (source: { query: typeof pg.query }): DB => ({
    query: (text, params) => source.query(text, params),
    transaction: (fn) =>
      pg.transaction((tx) => fn(wrap(tx as unknown as typeof pg))),
  });
  return wrap(pg);
}
export function getDb(): Promise<DB> {
  if (!globalDb.certiioDb)
    globalDb.certiioDb = (async () => {
      if (!process.env.DATABASE_URL) {
        if (process.env.NODE_ENV === "production")
          throw new AppError(
            503,
            "The demo database is awaiting setup. Ask the demo administrator to connect the Neon database.",
          );
        return localDatabase(
          process.env.TEST_DATABASE_PATH || ".data/postgres",
        );
      }
      const { Pool } = await import("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 3,
        idleTimeoutMillis: 10000,
      });
      const wrap = (client: {
        query: (...args: any[]) => Promise<any>;
      }): DB => ({
        query: (text, params) => client.query(text, params),
        transaction: async (fn) => {
          const connection = await pool.connect();
          try {
            await connection.query("BEGIN");
            const result = await fn(wrap(connection));
            await connection.query("COMMIT");
            return result;
          } catch (e) {
            await connection.query("ROLLBACK");
            throw e;
          } finally {
            connection.release();
          }
        },
      });
      return wrap(pool);
    })().catch((error) => {
      globalDb.certiioDb = undefined;
      throw error;
    });
  return globalDb.certiioDb;
}
export function setTestDatabase(db: DB) {
  globalDb.certiioDb = Promise.resolve(db);
}
