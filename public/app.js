const form = document.getElementById("searchForm");
const queryInput = document.getElementById("query");
const wordDisp = document.getElementById("wordDisp");
const meaningDisp = document.getElementById("meaningDisp");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const q = queryInput.value.trim();
  wordDisp.textContent = "";
  meaningDisp.textContent = "";

  if (!q) return;

  try {
    const res = await fetch(`/api/words?query=${encodeURIComponent(q)}`);

    if (!res.ok) {
      wordDisp.textContent = `الكلمة: ${q}`;
      meaningDisp.textContent = "تعذر العثور على الكلمة";
      return;
    }

    const data = await res.json();
    wordDisp.textContent = `الكلمة: ${data.word}`;
    meaningDisp.textContent = `المعنى: ${data.meaning}`;
  } catch {
    meaningDisp.textContent = "حدث خطأ في الاتصال بالخادم";
  }
});
