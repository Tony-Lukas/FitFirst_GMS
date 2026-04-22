const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { loadEnv } = require("./load-env");

loadEnv();

async function run() {
  if (!process.env.DB_URL) {
    throw new Error("DB_URL is required");
  }

  const pool = new Pool({ connectionString: process.env.DB_URL });
  const client = await pool.connect();

  try {
    const migrationsDir = path.join(process.cwd(), "migrations");
    const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`Running migration: ${file}`);
      await client.query(sql);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
