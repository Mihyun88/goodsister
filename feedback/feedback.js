/* 의견 양식: 답변을 글로 정리 → 복사 → 카톡 채널 열기 (저장·전송 없음) */
(() => {
  const KAKAO = "https://pf.kakao.com/_xcxoBxnX";
  const f = document.getElementById("fb"), cnt = document.getElementById("cnt");
  const toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl);
  const toast = m => { toastEl.textContent = m; toastEl.classList.add("on"); clearTimeout(toastEl.t); toastEl.t = setTimeout(() => toastEl.classList.remove("on"), 3000); };
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove(); return ok;
  }
  const one = n => (f.querySelector(`[name="${n}"]:checked`) || {}).value || "";
  const many = n => [...f.querySelectorAll(`[name="${n}"]:checked`)].map(i => i.value).join(", ");
  const val = n => (f.elements[n].value || "").trim();
  const QS = ["who", "used", "overall", "best", "pain", "trust", "wish", "nps", "consult", "etc"];
  function build() {
    const L = [];
    const add = (k, v) => v && L.push(`${k}: ${v}`);
    L.push("[착한언니 AI 도구 의견]");
    add("상황", [one("who"), one("device")].filter(Boolean).join(" · "));
    add("써본 기능", many("used"));
    add("전체 만족도", one("overall") && `${one("overall")}/5`);
    add("가장 쓸만했던 기능", val("best"));
    add("좋았던 점", val("best_why"));
    add("아쉬운 점", many("pain"));
    add("아쉬운 점 자세히", val("pain_detail"));
    add("결과 신뢰도", one("trust") && `${one("trust")}/5`);
    add("더 있었으면 하는 것", val("wish"));
    add("추천 의향", one("nps") && `${one("nps")}/10`);
    add("상담 의향", one("consult"));
    add("하고 싶은 말", val("etc"));
    return L;
  }
  const upd = () => { const n = build().length - 1; cnt.textContent = n ? `${n}개 항목에 답해주셨어요` : ""; };
  f.addEventListener("input", upd); f.addEventListener("change", upd); upd();
  const mail = document.getElementById("mail");
  mail.addEventListener("click", () => {
    const L = build();
    mail.href = `mailto:ellarang@naver.com?subject=${encodeURIComponent("착한언니 AI 도구 의견")}&body=${encodeURIComponent(L.join("\n"))}`;
  });
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const L = build();
    if (L.length < 2) { toast("한 가지 이상 답해주세요"); f.querySelector("input").focus(); return; }
    const text = L.join("\n");
    const ok = await copy(text);
    const pv = document.getElementById("pv"), pt = document.getElementById("pv-t");
    pt.value = text; pv.hidden = ok;
    toast(ok ? "답변을 복사했어요. 카톡 창에 붙여넣기 해주세요" : "복사가 안 됐어요. 아래 내용을 직접 복사해주세요");
    if (ok) setTimeout(() => window.open(KAKAO, "_blank", "noopener"), 700);
    else pt.focus();
  });
})();
