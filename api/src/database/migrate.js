/**
 * Migration runner for local PostgreSQL.
 *
 * Migrations live in ./migrations/ as plain SQL files.
 * Naming convention: YYYYMMDD_NNN_short_description.sql
 *   e.g. 20260310_001_supplier_ap_accounts.sql
 *
 * Each file is applied once, in alphabetical order.
 * Applied migrations are tracked in the public._migrations table.
 *
 * Usage:
 *   node src/database/migrate.js          (applies pending migrations)
 *   node src/database/migrate.js --status (lists applied & pending)
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

function loadEnv() {
  if (!process.env.DATABASE_URL) {
    require("dotenv").config({ path: path.join(__dirname, "../../.env") });
  }
}

function getPool() {
  loadEnv();
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getApplied(pool) {
  const { rows } = await pool.query(
    "SELECT name FROM _migrations ORDER BY name ASC"
  );
  return rows.map((r) => r.name);
}

function getPendingFiles(applied) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => !applied.includes(f));
}

async function applyMigration(pool, fileName) {
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  const sql = fs.readFileSync(filePath, "utf-8").trim();

  if (!sql) {
    console.log(`  SKIP (empty) ${fileName}`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO _migrations (name) VALUES ($1)", [fileName]);
    await client.query("COMMIT");
    console.log(`  APPLIED  ${fileName}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw new Error(`Migration ${fileName} failed: ${err.message}`);
  } finally {
    client.release();
  }
}

async function run() {
  const statusOnly = process.argv.includes("--status");
  const pool = getPool();

  try {
    await ensureMigrationsTable(pool);

    const applied = await getApplied(pool);
    const pending = getPendingFiles(applied);

    if (statusOnly) {
      console.log(`\nApplied (${applied.length}):`);
      applied.forEach((n) => console.log(`  + ${n}`));
      console.log(`\nPending (${pending.length}):`);
      pending.forEach((n) => console.log(`  - ${n}`));
      console.log();
      return;
    }

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    console.log(`Applying ${pending.length} migration(s)...\n`);

    for (const file of pending) {
      await applyMigration(pool, file);
    }

    console.log(`\nDone. ${pending.length} migration(s) applied.`);
  } finally {
    await pool.end();
  }
}

module.exports = { run, getApplied, getPendingFiles };

if (require.main === module) {
  run().catch((err) => {
    console.error("Migration failed:", err.message);
    process.exit(1);
  });
}
