const form = document.getElementById("adminForm");
const list = document.getElementById("adminList");
const msg = document.getElementById("msg");

const wordEl = document.getElementById("word");
const meaningEl = document.getElementById("meaning");
const imageUrlEl = document.getElementById("imageUrl");
const imageFileEl = document.getElementById("imageFile");
const originalWordEl = document.getElementById("originalWord");
const cancelBtn = document.getElementById("cancelEdit");

function setMessage(text, color) {
  msg.textContent = text;
  msg.style.color = color || "black";
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
      ${entry.imageUrl ? `<br><small>${entry.imageUrl}</small>` : ""}
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

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const word = (wordEl.value || "").trim();
  const meaning = (meaningEl.value || "").trim();
  const imageUrl = (imageUrlEl.value || "").trim();
  const originalWord = (originalWordEl.value || "").trim();
  const imageFile = imageFileEl?.files?.[0] || null;

  if (!word || !meaning) {
    setMessage("⚠️ الرجاء إدخال الكلمة والمعنى", "red");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("word", word);
    formData.append("meaning", meaning);
    if (imageUrl) formData.append("imageUrl", imageUrl);
    if (imageFile) formData.append("image", imageFile);

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
