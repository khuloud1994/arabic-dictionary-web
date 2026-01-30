require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const OPENAI_IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || "1024x1024";

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

  const entry = typeof db[q] === "string"
    ? { meaning: db[q], imageUrl: "" }
    : db[q] || {};

  res.json({ word: q, meaning: entry.meaning || "", imageUrl: entry.imageUrl || "" });
});

/* ===== إضافة كلمة ===== */
app.post("/api/words", (req, res) => {
  const { word, meaning, imageUrl } = req.body;
  if (!word || !meaning) {
    return res.status(400).json({ error: "Missing data" });
  }

  const db = readDb();
  db[word.trim()] = {
    meaning: meaning.trim(),
    imageUrl: (imageUrl || "").trim(),
  };
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
  const { meaning, imageUrl } = req.body || {};
  const db = readDb();
  const current = db[req.params.word];
  const currentEntry = typeof current === "string"
    ? { meaning: current, imageUrl: "" }
    : current || {};

  const nextMeaning = typeof meaning === "string" && meaning.trim()
    ? meaning.trim()
    : (currentEntry.meaning || "");
  const nextImageUrl = typeof imageUrl === "string"
    ? imageUrl.trim()
    : (currentEntry.imageUrl || "");

  db[req.params.word] = { meaning: nextMeaning, imageUrl: nextImageUrl };
  writeDb(db);
  res.json({ success: true });
});

/* ===== توليد صورة ===== */
app.post("/api/images", async (req, res) => {
  const { prompt } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  try {
    const isDalle2 = OPENAI_IMAGE_MODEL === "dall-e-2";
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        n: 1,
        size: OPENAI_IMAGE_SIZE,
        ...(isDalle2 ? { response_format: "b64_json" } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("OpenAI image error:", response.status, data);
      return res.status(response.status).json({
        error: "Image generation failed",
        details: data?.error || data,
      });
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(502).json({ error: "No image data returned" });
    }

    res.json({ imageDataUrl: `data:image/png;base64,${b64}` });
  } catch (err) {
    res.status(500).json({ error: "Image generation error" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
