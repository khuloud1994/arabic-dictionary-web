const form = document.getElementById("wordForm");
const wordEl = document.getElementById("word");
const meaningEl = document.getElementById("meaning");
const imageUrlEl = document.getElementById("imageUrl");
const originalWordEl = document.getElementById("originalWord");
const cancelBtn = document.getElementById("cancelEdit");
const msgEl = document.getElementById("msg");
const counterEl = document.getElementById("counter");
const listEl = document.getElementById("wordsList");
const emptyStateEl = document.getElementById("emptyState");
const searchInputEl = document.getElementById("searchInput");
const addWordBtn = document.getElementById("addWordBtn");
const cloudinaryFileEl = document.getElementById("cloudinaryFile");
const uploadMsg = document.getElementById("uploadMsg");
const imagePreviewWrap = document.getElementById("imagePreviewWrap");
const imagePreview = document.getElementById("imagePreview");

const CLOUDINARY_CLOUD_NAME = "dtceilobz";
const CLOUDINARY_UPLOAD_PRESET = "Arabic";
let wordsCache = {};
let wordsList = [];

function setMessage(text, color) {
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.style.color = color || "black";
}

function renderEmpty(message) {
  if (counterEl) counterEl.textContent = "0";
  if (listEl) listEl.innerHTML = "";
  if (emptyStateEl) emptyStateEl.textContent = message;
}

function setUploadMessage(text, color) {
  if (!uploadMsg) return;
  uploadMsg.textContent = text;
  uploadMsg.style.color = color || "black";
}

function updatePreview(url) {
  if (!imagePreview || !imagePreviewWrap) return;
  if (!url) {
    imagePreview.removeAttribute("src");
    imagePreviewWrap.classList.add("hidden");
    return;
  }
  imagePreview.src = url;
  imagePreviewWrap.classList.remove("hidden");
}

function resetForm() {
  if (!form) return;
  form.reset();
  if (originalWordEl) originalWordEl.value = "";
  setMessage("", "");
  updatePreview("");
  setUploadMessage("", "");
  if (window.M) window.M.updateTextFields();
}

async function loadWords() {
  if (!counterEl || !listEl) return;

  try {
    const res = await fetch("/api/words/all");
    if (!res.ok) {
      renderEmpty("تعذر تحميل الكلمات");
      return;
    }

    const data = await res.json();
    const words = Object.keys(data);
    wordsCache = data;
    wordsList = words;

    if (!words.length) {
      renderEmpty("لا توجد كلمات محفوظة");
      return;
    }

    renderList(words);
  } catch {
    renderEmpty("حدث خطأ أثناء الاتصال بالخادم");
  }
}

function renderList(words) {
  if (!counterEl || !listEl) return;
  counterEl.textContent = String(wordsList.length);
  listEl.innerHTML = "";
  if (emptyStateEl) emptyStateEl.textContent = "";

  if (!words.length) {
    if (emptyStateEl) emptyStateEl.textContent = "لا توجد نتائج مطابقة";
    return;
  }

  words.forEach((word) => {
    const entry = typeof wordsCache[word] === "string"
      ? { meaning: wordsCache[word], imageUrl: "" }
      : wordsCache[word] || {};
    const meaning = entry?.meaning || "";
    const imageUrl = entry?.imageUrl || "";

    const row = document.createElement("tr");

    const wordCell = document.createElement("td");
    wordCell.className = "vertical-word";
    wordCell.textContent = word;

    const meaningCell = document.createElement("td");
    meaningCell.textContent = meaning;

    const imageCell = document.createElement("td");
    if (imageUrl) {
      const wrap = document.createElement("div");
      wrap.className = "image-wrap";
      wrap.style.marginTop = "0";
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = "صورة للكلمة";
      img.style.maxWidth = "100px";
      img.style.borderRadius = "6px";
      wrap.appendChild(img);
      imageCell.appendChild(wrap);
    } else {
      imageCell.textContent = "—";
    }

    const actionsCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "btn-flat";
    editBtn.textContent = "✏️ تعديل";
    editBtn.setAttribute("data-edit", word);

    const delBtn = document.createElement("button");
    delBtn.className = "btn-flat red-text";
    delBtn.textContent = "🗑 حذف";
    delBtn.setAttribute("data-del", word);

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(delBtn);

    row.appendChild(wordCell);
    row.appendChild(meaningCell);
    row.appendChild(imageCell);
    row.appendChild(actionsCell);
    listEl.appendChild(row);
  });
}

function applySearchFilter() {
  const query = (searchInputEl?.value || "").trim().toLowerCase();
  if (!query) {
    renderList(wordsList);
    return;
  }
  const filtered = wordsList.filter((word) =>
    word.toLowerCase().includes(query)
  );
  renderList(filtered);
}

listEl?.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("[data-edit]");
  const delBtn = e.target.closest("[data-del]");
  const editWord = editBtn ? editBtn.getAttribute("data-edit") : null;
  const delWord = delBtn ? delBtn.getAttribute("data-del") : null;

  if (editWord) {
    const res = await fetch(`/api/words?query=${encodeURIComponent(editWord)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (wordEl) wordEl.value = data.word || "";
    if (meaningEl) meaningEl.value = data.meaning || "";
    if (imageUrlEl) imageUrlEl.value = data.imageUrl || "";
    if (originalWordEl) originalWordEl.value = data.word || "";
    if (window.M) window.M.updateTextFields();
    updatePreview((imageUrlEl?.value || "").trim());
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (delWord) {
    if (!confirm(`هل تريد حذف كلمة "${delWord}"؟`)) return;
    await fetch(`/api/words/${delWord}`, { method: "DELETE" });
    loadWords();
  }
});

cancelBtn?.addEventListener("click", () => {
  resetForm();
});

addWordBtn?.addEventListener("click", () => {
  resetForm();
  form?.scrollIntoView({ behavior: "smooth", block: "start" });
});

searchInputEl?.addEventListener("input", () => {
  applySearchFilter();
});

cloudinaryFileEl?.addEventListener("change", async () => {
  const file = cloudinaryFileEl.files?.[0];
  if (!file) return;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    setUploadMessage("⚠️ أضيفي Cloud name و Upload preset أولاً", "orange");
    return;
  }

  try {
    setUploadMessage("⏳ جاري الرفع...", "gray");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    if (!res.ok || !data?.secure_url) {
      setUploadMessage("⚠️ فشل رفع الصورة", "red");
      return;
    }

    if (imageUrlEl) imageUrlEl.value = data.secure_url;
    if (window.M) window.M.updateTextFields();
    updatePreview(data.secure_url);
    setUploadMessage("✅ تم رفع الصورة", "green");
  } catch {
    setUploadMessage("⚠️ حدث خطأ أثناء الرفع", "red");
  }
});

imageUrlEl?.addEventListener("input", () => {
  updatePreview((imageUrlEl.value || "").trim());
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const word = (wordEl?.value || "").trim();
  const meaning = (meaningEl?.value || "").trim();
  const imageUrl = (imageUrlEl?.value || "").trim();
  const originalWord = (originalWordEl?.value || "").trim();

  if (!word || !meaning) {
    setMessage("⚠️ الرجاء إدخال الكلمة والمعنى", "red");
    return;
  }

  try {
    if (originalWord && originalWord !== word) {
      await fetch(`/api/words/${originalWord}`, { method: "DELETE" });
    }

    if (originalWord && originalWord === word) {
      await fetch(`/api/words/${word}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meaning, imageUrl }),
      });
    } else {
      await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, meaning, imageUrl }),
      });
    }

    setMessage("✅ تم الحفظ", "green");
    resetForm();
    loadWords();
    if (searchInputEl) searchInputEl.value = "";
  } catch {
    setMessage("حدث خطأ أثناء الحفظ", "red");
  }
});

loadWords();
