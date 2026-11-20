/* 선 아이콘 (메인 페이지와 같은 1.6 두께). 마크업에 <i class="ic" data-i="이름"></i> 을 두면 채워짐 */
(() => {
  const P = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/><path d="M10 21v-3h4v3"/>',
    ticket: '<path d="M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4z"/><path d="M14 7v2M14 11v2M14 15v2"/>',
    news: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h6M7 12.5h10M7 16h7"/>',
    check: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 11l2 2 4-4"/><path d="M9 17h6"/>',
    report: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/><path d="M9 9h2"/>',
    train: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12"/><circle cx="9" cy="13" r=".6"/><circle cx="15" cy="13" r=".6"/><path d="M8 21l2-5M16 21l-2-5"/>',
    receipt: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><path d="M16 14.5h2"/><path d="M6 6l9-3 1 3"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>',
    scale: '<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-3 6a3 3 0 006 0z"/><path d="M19 7l-3 6a3 3 0 006 0z"/>',
    chart: '<path d="M3 20h18"/><path d="M6 20v-7M11 20V5M16 20v-10"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><rect x="7" y="14" width="10" height="7"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    cart: '<path d="M3 4h2l2 12h11l2-8H7"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };
  const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;
  const fill = root => root.querySelectorAll("i.ic[data-i]:not([data-done])").forEach(el => { el.innerHTML = svg(el.dataset.i); el.dataset.done = "1"; });
  window.GS_ic = svg;
  const start = () => { fill(document); new MutationObserver(() => fill(document)).observe(document.body, { childList: true, subtree: true }); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();
/* 미리보기(/v2/)에서 넘어온 경우, 단지 시세·체크리스트 머리말에 '미리보기 홈' 복귀 링크 */
(() => {
  try {
    if (location.pathname.startsWith("/v2")) { sessionStorage.setItem("gs_from_v2", "1"); return; }
    if (sessionStorage.getItem("gs_from_v2") !== "1") return;
    const go = () => { const nav = document.querySelector(".hd nav"); if (!nav || nav.querySelector(".v2back")) return;
      nav.insertAdjacentHTML("afterbegin", '<a class="v2back" href="/v2/" style="border-color:#C2325F;color:#C2325F;font-weight:700">← 미리보기 홈</a>'); };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go) : go();
  } catch (e) { /* 저장 불가 환경 */ }
})();
