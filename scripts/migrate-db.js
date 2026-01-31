const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "db.json");

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL. Set it before running migration.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined,
});

async function ensurePostgres() {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS words (word TEXT PRIMARY KEY, meaning TEXT NOT NULL, image_url TEXT NOT NULL DEFAULT '')"
  );
}

function loadJsonDb() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`DB file not found: ${DB_PATH}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

async function migrate() {
  const db = loadJsonDb();
  const entries = Object.entries(db);
  if (!entries.length) {
    console.log("No entries found in db.json.");
    return;
  }

  await ensurePostgres();
  let migrated = 0;

  for (const [word, value] of entries) {
    const entry = typeof value === "string"
      ? { meaning: value, imageUrl: "" }
      : value || {};
    const meaning = (entry.meaning || "").trim();
    const imageUrl = (entry.imageUrl || "").trim();
    if (!word || !meaning) continue;

    await pool.query(
      "INSERT INTO words (word, meaning, image_url) VALUES ($1, $2, $3) ON CONFLICT (word) DO UPDATE SET meaning = EXCLUDED.meaning, image_url = EXCLUDED.image_url",
      [word.trim(), meaning, imageUrl]
    );
    migrated += 1;
  }

  console.log(`Migrated ${migrated} words into Postgres.`);
}

migrate()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Migration failed:", err);
    pool.end().finally(() => process.exit(1));
  });
