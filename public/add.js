const form = document.getElementById("addForm");
const msg = document.getElementById("msg");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const wordEl = document.getElementById("word");
  const meaningEl = document.getElementById("meaning");
  const imageUrlEl = document.getElementById("imageUrl");

  const word = (wordEl?.value || "").trim();
  const meaning = (meaningEl?.value || "").trim();
  const imageUrl = (imageUrlEl?.value || "").trim();

  msg.textContent = "";

  if (!word || !meaning) {
    msg.textContent = "⚠️ الرجاء إدخال الكلمة والمعنى";
    msg.style.color = "red";
    return;
  }

  try {
    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, meaning, imageUrl }),
    });

    if (!res.ok) {
      msg.textContent = "⚠️ لم يتم الحفظ. تحققي من البيانات.";
      msg.style.color = "orange";
      return;
    }

    msg.textContent = "✅ تم حفظ الكلمة بنجاح";
    msg.style.color = "green";
    form.reset();
  } catch {
    msg.textContent = "⚠️ حدث خطأ في الاتصال بالخادم";
    msg.style.color = "red";
  }
});
