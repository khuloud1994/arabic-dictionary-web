const form = document.getElementById("adminForm");
const list = document.getElementById("adminList");
const msg = document.getElementById("msg");

const CLOUDINARY_CLOUD_NAME = "dtceilobz";
const CLOUDINARY_UPLOAD_PRESET = "Arabic";

const wordEl = document.getElementById("word");
const meaningEl = document.getElementById("meaning");
const imageUrlEl = document.getElementById("imageUrl");
const originalWordEl = document.getElementById("originalWord");
const cancelBtn = document.getElementById("cancelEdit");
const imagePreviewWrap = document.getElementById("imagePreviewWrap");
const imagePreview = document.getElementById("imagePreview");
const cloudinaryFileEl = document.getElementById("cloudinaryFile");
const uploadMsg = document.getElementById("uploadMsg");

function setMessage(text, color) {
  msg.textContent = text;
  msg.style.color = color || "black";
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

function normalizeEntry(word, value) {
  if (typeof value === "string") {
    return { word, meaning: value, imageUrl: "" };
  }
  return {
    word,
    meaning: value?.meaning || "",
    imageUrl: value?.imageUrl || "",
  };
}

async function loadAll() {
  list.innerHTML = "";
  const res = await fetch("/api/words/all");
  const data = await res.json();

  const counter = document.createElement("p");
  counter.textContent = `📊 عدد الكلمات: ${Object.keys(data).length}`;
  counter.style.fontWeight = "bold";
  list.appendChild(counter);

  for (const word in data) {
    const entry = normalizeEntry(word, data[word]);
    const li = document.createElement("li");
    li.style.margin = "12px 0";
    li.innerHTML = `
      <strong>${entry.word}</strong> : ${entry.meaning}
      ${
        entry.imageUrl
          ? `<div class="image-wrap" style="margin-top:8px;">
               <img src="${entry.imageUrl}" alt="صورة للكلمة" style="max-width:140px; border-radius:6px;">
             </div>`
          : ""
      }
      <br>
      <button data-edit="${entry.word}">✏️ تعديل</button>
      <button data-del="${entry.word}">🗑 حذف</button>
    `;
    list.appendChild(li);
  }
}

function resetForm() {
  form.reset();
  originalWordEl.value = "";
  setMessage("", "");
  updatePreview("");
}

list.addEventListener("click", async (e) => {
  const editWord = e.target.getAttribute("data-edit");
  const delWord = e.target.getAttribute("data-del");

  if (editWord) {
    const res = await fetch(`/api/words?query=${encodeURIComponent(editWord)}`);
    if (!res.ok) return;
    const data = await res.json();
    wordEl.value = data.word || "";
    meaningEl.value = data.meaning || "";
    imageUrlEl.value = data.imageUrl || "";
    originalWordEl.value = data.word || "";
    M.updateTextFields();
    updatePreview(imageUrlEl.value.trim());
    return;
  }

  if (delWord) {
    if (!confirm(`هل تريد حذف كلمة "${delWord}"؟`)) return;
    await fetch(`/api/words/${delWord}`, { method: "DELETE" });
    loadAll();
  }
});

cancelBtn.addEventListener("click", () => {
  resetForm();
});

cloudinaryFileEl.addEventListener("change", async () => {
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

    imageUrlEl.value = data.secure_url;
    M.updateTextFields();
    updatePreview(data.secure_url);
    setUploadMessage("✅ تم رفع الصورة", "green");
  } catch {
    setUploadMessage("⚠️ حدث خطأ أثناء الرفع", "red");
  }
});

imageUrlEl.addEventListener("input", () => {
  updatePreview((imageUrlEl.value || "").trim());
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const word = (wordEl.value || "").trim();
  const meaning = (meaningEl.value || "").trim();
  const imageUrl = (imageUrlEl.value || "").trim();
  const originalWord = (originalWordEl.value || "").trim();

  if (!word || !meaning) {
    setMessage("⚠️ الرجاء إدخال الكلمة والمعنى", "red");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("word", word);
    formData.append("meaning", meaning);
    if (imageUrl) formData.append("imageUrl", imageUrl);

    if (originalWord && originalWord !== word) {
      await fetch(`/api/words/${originalWord}`, { method: "DELETE" });
      await fetch("/api/words", {
        method: "POST",
        body: formData,
      });
    } else if (originalWord) {
      await fetch(`/api/words/${word}`, {
        method: "PUT",
        body: formData,
      });
    } else {
      await fetch("/api/words", {
        method: "POST",
        body: formData,
      });
    }

    setMessage("✅ تم الحفظ", "green");
    resetForm();
    loadAll();
  } catch {
    setMessage("حدث خطأ أثناء الحفظ", "red");
  }
});

loadAll();
