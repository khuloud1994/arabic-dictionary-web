const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

/* ===== جلب جميع الكلمات ===== */
app.get("/api/words/all", (req, res) => {
  const db = readDb();
  res.json(db);
});

/* ===== البحث ===== */
app.get("/api/words", (req, res) => {
  const q = (req.query.query || "").trim();
  const db = readDb();

  if (!db[q]) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json({ word: q, meaning: db[q] });
});

/* ===== إضافة كلمة ===== */
app.post("/api/words", (req, res) => {
  const { word, meaning } = req.body;
  if (!word || !meaning) {
    return res.status(400).json({ error: "Missing data" });
  }

  const db = readDb();
  db[word.trim()] = meaning.trim();
  writeDb(db);

  res.json({ success: true });
});

/* ===== حذف كلمة ===== */
app.delete("/api/words/:word", (req, res) => {
  const db = readDb();
  delete db[req.params.word];
  writeDb(db);
  res.json({ success: true });
});

/* ===== تعديل كلمة ===== */
app.put("/api/words/:word", (req, res) => {
  const { meaning } = req.body;
  const db = readDb();
  db[req.params.word] = meaning;
  writeDb(db);
  res.json({ success: true });
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
