/**
 * Lightweight migration runner for Supabase.
 *
 * Migrations live in ./migrations/ as plain SQL files.
 * Naming convention: YYYYMMDD_NNN_short_description.sql
 *   e.g. 20260310_001_supplier_ap_accounts.sql
 *
 * Each file is applied once, in alphabetical order.
 * Applied migrations are tracked in the public._migrations table.
 *
 * Prerequisites:
 *   Create the exec_sql RPC function and _migrations table in your
 *   Supabase SQL editor (see bootstrap SQL in functions.sql).
 *
 * Usage:
 *   node src/database/migrate.js          (applies pending migrations)
 *   node src/database/migrate.js --status (lists applied & pending)
 *
 * The canonical schema.sql remains the source of truth for the current
 * database shape. Migrations capture the *transitions* between versions.
 */

const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

function loadEnv() {
  if (!process.env.SUPABASE_URL) {
    require("dotenv").config({ path: path.join(__dirname, "../../.env") });
  }
}

function getSupabase() {
  loadEnv();
  return require("../config/supabase")();
}

async function getApplied(supabase) {
  const { data, error } = await supabase
    .from("_migrations")
    .select("name")
    .order("name", { ascending: true });

  if (error) {
    // Table might not exist yet — prompt to bootstrap
    if (error.message.includes("does not exist") || error.code === "42P01") {
      console.error(
        "The _migrations table does not exist.\n" +
        "Run the bootstrap SQL from functions.sql in your Supabase SQL editor first."
      );
      process.exit(1);
    }
    throw error;
  }
  return (data || []).map((r) => r.name);
}

function getPendingFiles(applied) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => !applied.includes(f));
}

async function applyMigration(supabase, fileName) {
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  const sql = fs.readFileSync(filePath, "utf-8").trim();

  if (!sql) {
    console.log(`  SKIP (empty) ${fileName}`);
    return;
  }

  // Execute the migration SQL via the exec_sql RPC function
  const { error } = await supabase.rpc("exec_sql", { query: sql });
  if (error) {
    throw new Error(`Migration ${fileName} failed: ${error.message}`);
  }

  // Record that we applied it
  const { error: insertErr } = await supabase
    .from("_migrations")
    .insert({ name: fileName });

  if (insertErr) {
    throw new Error(`Failed to record migration ${fileName}: ${insertErr.message}`);
  }

  console.log(`  APPLIED  ${fileName}`);
}

async function run() {
  const statusOnly = process.argv.includes("--status");
  const supabase = getSupabase();

  const applied = await getApplied(supabase);
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
    await applyMigration(supabase, file);
  }

  console.log(`\nDone. ${pending.length} migration(s) applied.`);
}

// Allow programmatic use
module.exports = { run, getApplied, getPendingFiles };

// Run if invoked directly
if (require.main === module) {
  run().catch((err) => {
    console.error("Migration failed:", err.message);
    process.exit(1);
  });
}
