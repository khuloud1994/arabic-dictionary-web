const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== Database (db.json) =====
const DB_PATH = path.join(__dirname, "db.json");

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== API: Search word =====
app.get("/api/words", (req, res) => {
  const word = (req.query.query || "").trim();
  if (!word) {
    return res.status(400).json({ error: "Missing query" });
  }

  const db = readDb();
  const meaning = db[word];

  if (!meaning) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json({ word, meaning });
});

// ===== API: Add word =====
app.post("/api/words", (req, res) => {
  const { word, meaning } = req.body;

  if (!word || !meaning) {
    return res.status(400).json({ error: "Word and meaning are required" });
  }

  const db = readDb();
  db[word.trim()] = meaning.trim();
  writeDb(db);

  res.json({ success: true });
});
app.get("/api/words/all", (req, res) => {
  const db = readDb();
  const result = Object.keys(db).map(word => ({
    word,
    meaning: db[word]
  }));
  res.json(result);
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
