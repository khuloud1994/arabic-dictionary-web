const form = document.getElementById("addForm");
const msg = document.getElementById("msg");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const wordEl = document.getElementById("word");
  const meaningEl = document.getElementById("meaning");

  const word = (wordEl?.value || "").trim();
  const meaning = (meaningEl?.value || "").trim();

  msg.textContent = "";

  if (!word || !meaning) {
    msg.textContent = "⚠️ الرجاء إدخال الكلمة والمعنى";
    msg.style.color = "red";
    return;
  }

  let words = JSON.parse(localStorage.getItem("my_dictionary")) || [];

  // منع التكرار
  if (words.some(w => (w.word || "").trim() === word)) {
    msg.textContent = "⚠️ الكلمة موجودة مسبقًا";
    msg.style.color = "orange";
    return;
  }

  words.push({ word, meaning });
  localStorage.setItem("my_dictionary", JSON.stringify(words));

  msg.textContent = "✅ تم حفظ الكلمة بنجاح";
  msg.style.color = "green";

  form.reset();
});
