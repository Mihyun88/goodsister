/* 협업 문의 메일: 페이지 코드에 완성된 주소를 두지 않고, 버튼을 누를 때 조립해 보여줌 (수집 방지) */
(function () {
  document.querySelectorAll("[data-mail]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var p = btn.getAttribute("data-mail").split("|"), u = p[0] + "@" + p[1] + "." + p[2];
      var a = document.createElement("a"); a.className = "tel mail"; a.href = "mailto:" + u; a.textContent = u;
      var s = document.createElement("span"); s.className = "addr"; s.textContent = "눌러서 메일 보내기 · 길게 눌러 복사";
      btn.replaceWith(a); a.after(s);
    });
  });
})();
