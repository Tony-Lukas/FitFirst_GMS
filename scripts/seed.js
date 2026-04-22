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
    const seedSql = fs.readFileSync(path.join(process.cwd(), "seeds", "seed.sql"), "utf8");
    await client.query(seedSql);
    console.log("Seed complete");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
