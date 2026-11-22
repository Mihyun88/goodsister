/* 사이트 공통 내비게이션: 단지 시세·체크리스트·도구(/tools/) 화면에 앱(/app/)과 같은 하단 탭바와 머리말을 붙인다.
   기존 도구의 '가격 검토'는 단지 시세로, '정책 뉴스'는 앱 뉴스 탭으로 보낸다. */
(() => {
  if (location.pathname.startsWith("/app")) return;
  if (location.pathname.startsWith("/tools")) {
    const h = location.hash.slice(1).split("?")[0];
    if (h === "check") { location.replace("/apt/"); return; }
    if (h === "news") { location.replace("/app/#news"); return; }
    window.addEventListener("hashchange", () => { const k = location.hash.slice(1).split("?")[0]; if (k === "check") location.replace("/apt/"); if (k === "news") location.replace("/app/#news"); });
  }
  const P = location.pathname, isTools = P.startsWith("/tools"), isApt = P.startsWith("/apt"), isCheck = P.startsWith("/check");
  const TITLE = { budget: "예산으로 단지 찾기", rent: "자취 동네 찾기", check: "가격 검토", cost: "세금·복비 계산", market: "서울 시황", news: "정책 뉴스", timeline: "세금 타임라인", jachwi: "첫 자취방 가이드", tips: "부동산 꿀팁" };
  const ic = n => window.GS_ic ? window.GS_ic(n) : "";
  const tab = (href, i, t, active) => `<a href="${href}" class="${active ? "on" : ""}"><i class="ic">${ic(i)}</i>${t}</a>`;
  const go = () => {
    document.body.classList.add("v2nav");
    if (isTools) document.body.classList.add("v2skin");
    const cur = isApt ? "apt" : isTools ? (location.hash.slice(1).split("?")[0] === "market" || location.hash.startsWith("#news") ? "news" : "tools") : isCheck ? "tools" : "";
    document.body.insertAdjacentHTML("beforeend", `<nav class="v2tabbar" aria-label="주 메뉴">
      ${tab("/app/#home", "home", "홈", false)}${tab("/apt/", "building", "단지 시세", cur === "apt")}${tab("/app/#tools", "report", "도구", cur === "tools")}${tab("/app/#apply", "ticket", "청약", false)}${tab("/app/#news", "news", "뉴스·시황", cur === "news")}</nav>`);
    if (isTools) {
      const bar = document.createElement("div"); bar.className = "v2title";
      const set = () => { const k = location.hash.slice(1).split("?")[0] || "budget"; bar.innerHTML = `<a href="/app/#tools">‹ 도구</a><b>${TITLE[k] || "도구"}</b>`; };
      set(); window.addEventListener("hashchange", set);
      document.querySelector("header.top")?.after(bar);
    }
    const nav = document.querySelector(".hd nav");
    if (nav) nav.innerHTML = `<a href="/">착한언니 소개</a>`;
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
  const css = document.createElement("style");
  css.textContent = `
  body.v2nav{padding-bottom:100px}
  .v2tabbar{position:fixed;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:60;display:flex;background:#fff;border:1px solid #E4DED6;border-radius:26px;box-shadow:0 8px 28px rgba(28,26,25,.12);padding:6px;max-width:560px;margin:0 auto}
  .v2tabbar a.on{background:#FBEDF1;border-radius:20px}
  .v2tabbar a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:52px;font-size:12px;font-weight:600;color:#8A847B;text-decoration:none;font-family:inherit}
  .v2tabbar .ic{display:block;width:22px;height:22px;margin-bottom:3px;color:#A9A39A}.v2tabbar .ic svg{width:100%;height:100%}
  .v2tabbar a.on{color:#C2325F}.v2tabbar a.on .ic{color:#C2325F}
  .pvtag{display:inline-block;font-size:12px;font-weight:700;color:#C2325F;border:1px solid #C2325F;border-radius:99px;padding:3px 10px}
  body.v2skin .top .tabs,body.v2skin .top .sns,body.v2skin .mbar,body.v2skin .cta,body.v2skin #share-float{display:none!important}
  body.v2skin .top{position:static}
  .v2title{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:10px;background:rgba(250,248,245,.95);backdrop-filter:blur(8px);border-bottom:1px solid #E4DED6;padding:8px 16px;min-height:52px}
  .v2title a{color:#55524C;text-decoration:none;font-size:14px;min-height:40px;display:inline-flex;align-items:center}
  .v2title b{flex:1;font-size:16px;font-weight:800;color:#1C1A19}
  body.v2skin .card{box-shadow:none;border:1px solid #E4DED6;border-radius:16px}
  body.v2skin .hook{border-left-color:#C2325F}
  body.v2skin .btn{background:#C2325F;min-height:52px;border-radius:12px;font-size:16px}
  body.v2skin main{padding-top:14px}
  body.v2nav .totop{bottom:108px!important}
  body.v2skin .send-k{background:#fff;border:1px solid #E4DED6;color:#1C1A19}`;
  document.head.appendChild(css);
})();
