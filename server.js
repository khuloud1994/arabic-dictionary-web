require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const OPENAI_IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || "1024x1024";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DB_PATH = path.join(__dirname, "db.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOADS_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "image", ext);
    const safe = base.replace(/[^\w.-]/g, "_");
    cb(null, `${Date.now()}_${safe}${ext}`);
  },
});

const upload = multer({ storage });

app.use("/uploads", express.static(UPLOADS_DIR));

// Explicit admin route for platforms that don't serve static files as expected
app.get(["/admin", "/admin.html"], (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

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

  const entry = db[q];
  if (typeof entry === "string") {
    return res.json({ word: q, meaning: entry, imageUrl: "" });
  }

  res.json({
    word: q,
    meaning: entry?.meaning || "",
    imageUrl: entry?.imageUrl || "",
  });
});

/* ===== إضافة كلمة ===== */
app.post("/api/words", upload.single("image"), (req, res) => {
  const { word, meaning, imageUrl } = req.body;
  if (!word || !meaning) {
    return res.status(400).json({ error: "Missing data" });
  }

  const db = readDb();
  const storedImageUrl = req.file
    ? `/uploads/${req.file.filename}`
    : (imageUrl || "").trim();
  db[word.trim()] = {
    meaning: meaning.trim(),
    imageUrl: storedImageUrl,
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
app.put("/api/words/:word", upload.single("image"), (req, res) => {
  const { meaning, imageUrl } = req.body;
  const db = readDb();
  const prev = db[req.params.word];
  const prevImageUrl =
    prev && typeof prev !== "string" ? (prev.imageUrl || "") : "";
  const storedImageUrl = req.file
    ? `/uploads/${req.file.filename}`
    : (imageUrl ? imageUrl.trim() : prevImageUrl);
  db[req.params.word] = {
    meaning: (meaning || "").trim(),
    imageUrl: storedImageUrl,
  };
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

    const item = data?.data?.[0];
    const b64 = item?.b64_json;
    const url = item?.url;

    if (b64) {
      return res.json({ imageDataUrl: `data:image/png;base64,${b64}` });
    }

    if (url) {
      return res.json({ imageUrl: url });
    }

    return res.status(502).json({ error: "No image data returned" });
  } catch (err) {
    res.status(500).json({ error: "Image generation error" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
