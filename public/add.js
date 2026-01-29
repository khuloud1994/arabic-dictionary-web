const form = document.getElementById("addForm");
const msg = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";

  const word = document.getElementById("word").value.trim();
  const meaning = document.getElementById("meaning").value.trim();

  if (!word || !meaning) {
    msg.textContent = "الرجاء إدخال الكلمة والمعنى";
    return;
  }

  const res = await fetch("/api/words", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word, meaning })
  });

  const data = await res.json();

  if (!res.ok) {
    msg.textContent = data.error || "حدث خطأ";
    return;
  }

  msg.textContent = "تم الحفظ ✅";
  form.reset();
});
