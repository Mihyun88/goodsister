/* 도구 페이지 공통 UI (SEC-6: 인라인 스크립트 분리)
   - 모바일: 결과가 나오면 결과로 스크롤, 탭 전환 시 맨 위로, 활성 탭을 화면 안으로
   - T3: 긴 표는 5행만 보이고 '더 보기', 모든 표는 가로 스크롤 상자 안에
   - T6: 금액 입력칸 아래 실시간 단위 환산
   - S-7: data-track 클릭 추적 (측정 ID 없으면 아무 일도 안 함) */
(() => {
  const mob = () => matchMedia("(max-width:860px)").matches;

  // ---------- 결과로 스크롤 · 탭 ----------
  ["budget", "rent", "check", "cost"].forEach(k => {
    const f = document.getElementById("f-" + k); if (!f) return;
    f.addEventListener("submit", () => setTimeout(() => { if (mob()) document.getElementById("o-" + k).scrollIntoView({ behavior: "smooth", block: "start" }); }, 120));
  });
  const keep = () => { const a = document.querySelector(".tab.active"); a && a.scrollIntoView({ inline: "center", block: "nearest" }); };
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => { scrollTo({ top: 0, behavior: "instant" }); setTimeout(keep); }));
  addEventListener("hashchange", () => setTimeout(keep)); setTimeout(keep, 50);

  // ---------- 맨 위로 버튼 ----------
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const tb = document.createElement("button");
  tb.type = "button"; tb.className = "totop"; tb.setAttribute("aria-label", "맨 위로");
  tb.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg>';
  tb.addEventListener("click", () => { scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); const a = document.querySelector(".tab.active"); a && a.focus({ preventScroll: true }); });
  document.body.appendChild(tb);
  const tOn = () => tb.classList.toggle("show", scrollY > 500);
  addEventListener("scroll", tOn, { passive: true }); tOn();

  // ---------- T3: 표 정리 ----------
  const SHOW = 5;
  function tidy(out) {
    out.querySelectorAll("table").forEach(t => {
      if (!t.parentElement.classList.contains("tblwrap") && !t.closest(".tblwrap")) {
        const w = document.createElement("div"); w.className = "tblwrap"; t.before(w); w.appendChild(t);
      }
      if (t.dataset.tidy || t.closest("#o-cost")) return; t.dataset.tidy = "1";
      const body = [...t.querySelectorAll("tr")].filter(tr => tr.querySelector("td"));
      const extra = body.length - SHOW;
      if (extra < 2) return;
      body.slice(SHOW).forEach(tr => tr.hidden = true);
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "more-rows"; btn.textContent = `더 보기 (${extra}개)`;
      btn.addEventListener("click", () => { body.forEach(tr => tr.hidden = false); btn.remove(); });
      t.closest(".tblwrap").after(btn);
    });
  }
  ["o-budget", "o-check", "o-rent", "o-cost"].forEach(id => {
    const out = document.getElementById(id); if (!out) return;
    new MutationObserver(() => tidy(out)).observe(out, { childList: true });
  });

  // ---------- T6: 단위 환산 ----------
  const money = man => {
    man = Math.round(man); if (!man) return "0원";
    const eok = Math.floor(man / 10000), rest = man % 10000;
    return (eok ? `${eok}억` : "") + (rest ? `${eok ? " " : ""}${rest.toLocaleString()}만` : "") + " 원";
  };
  document.querySelectorAll("#f-budget input[type=number], #f-rent input[type=number], #f-cost input[type=number]").forEach(inp => {
    const label = inp.closest("label"); if (!label) return;
    const unit = (label.querySelector(".u") || {}).textContent || "";
    const isEok = /억 원/.test(unit), isMan = /만 원/.test(unit);
    if (!isEok && !isMan) return;
    const yearly = /연소득|연 원리금/.test(label.textContent);
    const monthly = /월세|월 저축/.test(label.textContent) && !/보증금/.test(label.textContent);
    const hint = document.createElement("small"); hint.className = "conv"; hint.setAttribute("aria-live", "polite");
    inp.after(hint);
    const upd = () => {
      const v = parseFloat(inp.value);
      hint.textContent = isNaN(v) || v === 0 ? "" : `= ${yearly ? "연 " : monthly ? "월 " : ""}${money(isEok ? v * 10000 : v)}`;
    };
    inp.addEventListener("input", upd); upd();
  });

  // ---------- S-7: 클릭 추적 ----------
  const track = (name, params) => { try { window.gtag && window.gtag("event", name, params); } catch {} };
  document.addEventListener("click", e => { const a = e.target.closest("[data-track]"); if (a) track("cta_click", { cta: a.dataset.track }); });
})();
