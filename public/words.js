const list = document.getElementById("wordsList");
const counter = document.getElementById("counter");

async function loadWords() {
  const res = await fetch("/api/words/all");
  const data = await res.json();

  list.innerHTML = "";
  const keys = Object.keys(data);

  counter.textContent = `عدد الكلمات: ${keys.length}`;

  keys.forEach(word => {
    const li = document.createElement("li");
    li.style.marginBottom = "12px";

    li.innerHTML = `
      <strong>${word}</strong> — ${data[word]}
      <br>
      <button onclick="editWord('${word}')">✏️ تعديل</button>
      <button onclick="deleteWord('${word}')">🗑 حذف</button>
    `;

    list.appendChild(li);
  });
}

async function deleteWord(word) {
  if (!confirm("هل أنت متأكدة من حذف الكلمة؟")) return;
  await fetch(`/api/words/${word}`, { method: "DELETE" });
  loadWords();
}

async function editWord(word) {
  const newMeaning = prompt("المعنى الجديد:");
  if (!newMeaning) return;

  await fetch(`/api/words/${word}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meaning: newMeaning })
  });

  loadWords();
}

loadWords();
