/* 노션 가이드 보기 + 주소(#) 이동. 데이터: guide/pages.js (scripts/sync_notion.py 로 생성) */
(() => {
  const G = window.GS_GUIDE;
  const TABS = ["budget", "rent", "check", "cost", "market", "news", "jachwi", "tips"];
  const rootOf = {}; // pageId -> 탭 키
  if (G) for (const [k, ids] of Object.entries(G.roots)) ids.forEach(id => { if (!rootOf[id]) rootOf[id] = k; });

  function showTab(key) {
    document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x.dataset.tab === key));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + key));
  }

  function renderGuide(key, pageId) {
    const el = document.querySelector(`.guide[data-root="${key}"]`);
    if (!G) { el.innerHTML = `<p class="muted">가이드 데이터가 없습니다. <code>python3 scripts/sync_notion.py</code> 를 실행해 주세요.</p>`; return; }
    const rootId = G.roots[key][0], id = pageId && G.pages[pageId] ? pageId : rootId, pg = G.pages[id], root = G.pages[rootId];
    el.innerHTML = `
      ${id !== rootId ? `<div class="crumb"><a href="#${key}">← ${root.icon} ${root.title}</a></div>` : ""}
      <h1>${pg.icon} ${pg.title}</h1>
      ${pg.html}
      <p class="synced">노션 원본 동기화: ${G.synced}</p>`;
    // 노션의 체크박스는 보기용: 클릭해도 저장되지 않음
    el.querySelectorAll('input[type=checkbox]').forEach(c => c.addEventListener("click", e => e.stopPropagation()));
  }

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.startsWith("g-") && G) {
      const id = G.short[h.slice(2)];
      if (id) { const key = rootOf[id] || "tips"; showTab(key); renderGuide(key, id); scrollTo(0, 0); return; }
    }
    const base = h.split("?")[0], key = TABS.includes(base) ? base : null;
    if (key) { showTab(key); if (key === "jachwi" || key === "tips") renderGuide(key); }
  }

  // 탭 클릭 → 주소에 반영 (공유 가능한 링크)
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    if (location.hash.slice(1).split("?")[0] !== b.dataset.tab) history.replaceState(null, "", "#" + b.dataset.tab);
    if (b.dataset.tab === "jachwi" || b.dataset.tab === "tips") renderGuide(b.dataset.tab);
  }));
  window.addEventListener("hashchange", route);
  route();

  // 도구 결과 아래에 관련 가이드 링크 붙이기
  const find = re => G && Object.entries(G.pages).find(([, p]) => re.test(p.title));
  const link = re => { const f = find(re); return f ? `<a href="#g-${f[0].slice(0, 8)}${f[0].slice(-4)}">${f[1].icon} ${f[1].title.replace(/\s*\|.*$/, "")}</a>` : ""; };
  const related = {
    "o-budget": [/첫 집, 내 현금/, /대출용어/, /사야할 집/, /토지거래허가/, /잔금일 체크/],
    "o-rent": [/동네 고르기/, /부동산 전화/, /방 보기/, /등기부등본/, /여자 혼자/, /보증금 사수/],
    "o-check": [/사야할 집/, /갈아타기/, /토지거래허가/, /첫 집, 내 현금/],
  };
  for (const [id, res] of Object.entries(related)) {
    const out = document.getElementById(id);
    new MutationObserver(() => {
      if (out.querySelector(".more") || !out.querySelector(".check")) return;
      const links = res.map(link).filter(Boolean).join("");
      if (links) out.insertAdjacentHTML("beforeend", `<div class="more"><b style="width:100%;font-size:.85rem">📚 같이 보면 좋은 착한언니 가이드</b>${links}</div>`);
    }).observe(out, { childList: true });
  }
})();
