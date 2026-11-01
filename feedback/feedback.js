/* 의견 양식: 답변을 글로 정리 → 복사 → 카톡 채널 열기 (저장·전송 없음) */
(() => {
  const KAKAO = "https://pf.kakao.com/_xcxoBxnX";
  /* 바로 보내기: 구글 폼 한 문항(장문형)에 정리된 답변을 그대로 넣는다.
     설정 전(빈 값)에는 기존처럼 '복사 → 카톡' 방식으로 동작. */
  const GFORM = { action: "", entry: "" }; // 예: { action: "https://docs.google.com/forms/d/e/XXXX/formResponse", entry: "entry.123456789" }
  const direct = !!(GFORM.action && GFORM.entry);
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
  if (direct) { f.querySelector("button[type=submit]").textContent = "보내기"; document.querySelector(".lead").innerHTML = "3분이면 충분해요. 다 채우지 않아도 괜찮아요.<br>맨 아래 <b>보내기</b>만 누르면 바로 착한언니에게 전달돼요."; document.querySelector(".note").textContent = "이름·연락처는 받지 않아요. 고른 답과 적어주신 글만 전달돼요."; }
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
    if (direct) {
      const btn = f.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "보내는 중…";
      try {
        await fetch(GFORM.action, { method: "POST", mode: "no-cors", body: new URLSearchParams({ [GFORM.entry]: text }) });
        f.innerHTML = '<div class="done" tabindex="-1"><h2>보내주셔서 고마워요 🙏</h2><p>남겨주신 의견은 착한언니가 하나하나 읽고 고쳐 나갈게요.</p><a class="btn btn-dark" href="../tools/">AI 도구로 돌아가기</a><a class="btn btn-line" href="' + KAKAO + '" target="_blank" rel="noopener">상담도 받아보고 싶다면 카카오톡</a></div>';
        f.querySelector(".done").focus(); scrollTo({ top: 0 });
        return;
      } catch { btn.disabled = false; btn.textContent = "보내기"; toast("전송이 안 됐어요. 아래 방법으로 보내주세요"); }
    }
    const ok = await copy(text);
    const pv = document.getElementById("pv"), pt = document.getElementById("pv-t");
    pt.value = text; pv.hidden = ok;
    toast(ok ? "답변을 복사했어요. 카톡 창에 붙여넣기 해주세요" : "복사가 안 됐어요. 아래 내용을 직접 복사해주세요");
    if (ok) setTimeout(() => window.open(KAKAO, "_blank", "noopener"), 700);
    else pt.focus();
  });
})();
