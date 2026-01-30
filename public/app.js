// الكلمات التي أضفتِها من صفحة add.html (خاصة بك)
let myWords = JSON.parse(localStorage.getItem("my_dictionary")) || [] ;

const form = document.getElementById("searchForm");
const queryInput = document.getElementById("query");
const wordDisp = document.getElementById("wordDisp");
const meaningDisp = document.getElementById("meaningDisp");
const imageWrap = document.getElementById("imageWrap");
const imageEl = document.getElementById("generatedImage");

function clearImage() {
  imageEl.removeAttribute("src");
  imageWrap.classList.add("hidden");
}

function showImage(url) {
  if (!url) {
    clearImage();
    return;
  }
  imageEl.src = url;
  imageWrap.classList.remove("hidden");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const q = queryInput.value.trim();
  // تحديث الكلمات المضافة (من add.html) كل مرة
myWords = JSON.parse(localStorage.getItem("my_dictionary")) || [];

// ابحثي أولاً في كلماتك الخاصة
const found = myWords.find(item => item.word === q);

if (found) {
  wordDisp.textContent = `الكلمة: ${found.word}`;
  meaningDisp.textContent = `المعنى: ${found.meaning}`;
  showImage(found.imageUrl || "");
  return; // مهم: نوقف هنا ولا نذهب للسيرفر
}

  wordDisp.textContent = "";
  meaningDisp.textContent = "";
  clearImage();

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
    showImage(data.imageUrl || "");
  } catch {
    meaningDisp.textContent = "حدث خطأ في الاتصال بالخادم";
    clearImage();
  }
});
