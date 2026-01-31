require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "db.json");
const USE_POSTGRES = Boolean(process.env.DATABASE_URL);

const pool = USE_POSTGRES
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : null;

async function ensurePostgres() {
  if (!pool) return;
  await pool.query(
    "CREATE TABLE IF NOT EXISTS words (word TEXT PRIMARY KEY, meaning TEXT NOT NULL, image_url TEXT NOT NULL DEFAULT '')"
  );
}

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const storage = {
  async getAll() {
    if (!pool) return readDb();
    const { rows } = await pool.query(
      "SELECT word, meaning, image_url FROM words ORDER BY word ASC"
    );
    return rows.reduce((acc, row) => {
      acc[row.word] = { meaning: row.meaning, imageUrl: row.image_url || "" };
      return acc;
    }, {});
  },
  async getWord(word) {
    if (!pool) {
      const db = readDb();
      if (!db[word]) return null;
      const entry = typeof db[word] === "string"
        ? { meaning: db[word], imageUrl: "" }
        : db[word] || {};
      return { word, meaning: entry.meaning || "", imageUrl: entry.imageUrl || "" };
    }

    const { rows } = await pool.query(
      "SELECT word, meaning, image_url FROM words WHERE word = $1",
      [word]
    );
    if (!rows.length) return null;
    return { word, meaning: rows[0].meaning, imageUrl: rows[0].image_url || "" };
  },
  async upsertWord(word, meaning, imageUrl) {
    if (!pool) {
      const db = readDb();
      db[word] = { meaning, imageUrl };
      writeDb(db);
      return;
    }
    await pool.query(
      "INSERT INTO words (word, meaning, image_url) VALUES ($1, $2, $3) ON CONFLICT (word) DO UPDATE SET meaning = EXCLUDED.meaning, image_url = EXCLUDED.image_url",
      [word, meaning, imageUrl]
    );
  },
  async deleteWord(word) {
    if (!pool) {
      const db = readDb();
      delete db[word];
      writeDb(db);
      return;
    }
    await pool.query("DELETE FROM words WHERE word = $1", [word]);
  },
  async updateWord(word, meaning, imageUrl) {
    if (!pool) {
      const db = readDb();
      const current = db[word];
      const currentEntry = typeof current === "string"
        ? { meaning: current, imageUrl: "" }
        : current || {};

      db[word] = {
        meaning: meaning || currentEntry.meaning || "",
        imageUrl: typeof imageUrl === "string" ? imageUrl : (currentEntry.imageUrl || ""),
      };
      writeDb(db);
      return;
    }

    const current = await storage.getWord(word);
    if (!current) return;
    const nextMeaning = meaning || current.meaning || "";
    const nextImageUrl = typeof imageUrl === "string" ? imageUrl : (current.imageUrl || "");
    await pool.query(
      "UPDATE words SET meaning = $2, image_url = $3 WHERE word = $1",
      [word, nextMeaning, nextImageUrl]
    );
  },
};

/* ===== جلب جميع الكلمات ===== */
app.get("/api/words/all", async (req, res) => {
  const db = await storage.getAll();
  res.json(db);
});

/* ===== البحث ===== */
app.get("/api/words", async (req, res) => {
  const q = (req.query.query || "").trim();

  const entry = await storage.getWord(q);
  if (!entry) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json({ word: entry.word, meaning: entry.meaning || "", imageUrl: entry.imageUrl || "" });
});

/* ===== إضافة كلمة ===== */
app.post("/api/words", async (req, res) => {
  const { word, meaning, imageUrl } = req.body;
  if (!word || !meaning) {
    return res.status(400).json({ error: "Missing data" });
  }

  await storage.upsertWord(
    word.trim(),
    meaning.trim(),
    (imageUrl || "").trim()
  );

  res.json({ success: true });
});

/* ===== حذف كلمة ===== */
app.delete("/api/words/:word", async (req, res) => {
  await storage.deleteWord(req.params.word);
  res.json({ success: true });
});

/* ===== تعديل كلمة ===== */
app.put("/api/words/:word", async (req, res) => {
  const { meaning, imageUrl } = req.body || {};
  const nextMeaning = typeof meaning === "string" && meaning.trim()
    ? meaning.trim()
    : "";
  const nextImageUrl = typeof imageUrl === "string"
    ? imageUrl.trim()
    : undefined;

  await storage.updateWord(req.params.word, nextMeaning, nextImageUrl);
  res.json({ success: true });
});

ensurePostgres()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`✅ Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ Failed to initialize storage", err);
    process.exit(1);
  });
