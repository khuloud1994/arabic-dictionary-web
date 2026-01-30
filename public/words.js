fetch("/api/words/all")
  .then(res => res.json())
  .then(data => {
    const ul = document.getElementById("wordsList");

    if (!data.length) {
      ul.innerHTML = "<li>لا توجد كلمات محفوظة</li>";
      return;
    }

    data.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.word} : ${item.meaning}`;
      ul.appendChild(li);
    });
  });
