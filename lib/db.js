import { Pool } from "pg";

let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DB_URL) {
      throw new Error("DB_URL is not configured");
    }

    pool = new Pool({
      connectionString: process.env.DB_URL,
    });
  }

  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withTransaction(callback) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
