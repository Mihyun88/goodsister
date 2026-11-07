/* 🗞️ 정책 뉴스 탭 (data/news.js) */
(() => {
  const N = window.GS_NEWS, el = document.getElementById("news-box");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => /^(https?:|mailto:|tel:)/i.test(String(u).trim()) ? esc(u) : "#"; // SEC-2
  if (!N) { el.innerHTML = `<p class="muted">뉴스 데이터가 없습니다.</p>`; return; }
  const tags = ["전체", ...new Set(N.items.map(i => i.tag))];
  let cur = "전체";
  const render = () => {
    const items = N.items.filter(i => cur === "전체" || i.tag === cur).sort((a, b) => b.date.localeCompare(a.date));
    el.innerHTML = `
      <p class="hook" style="margin-top:0">“집 사기 전에 꼭 알아야 할 부동산 정책, 한 번에 정리했어요.”</p>
      <a class="tl-link" href="#timeline">📜 문재인·윤석열·이재명 정부 부동산 세금 변화, <b>세금 타임라인</b>으로 한눈에 보기 →</a>
      <h3>📌 지금 서울에 적용 중인 핵심 규칙</h3>
      <div class="rules">${N.rules.map(r => `<div class="rule"><b>${esc(r.t)}</b><p>${esc(r.d)}</p><a href="${safeUrl(r.url)}" target="_blank" rel="noopener">출처: ${esc(r.src)} ↗</a></div>`).join("")}</div>
      <h3>🗞️ 최근 정책 뉴스</h3>
      <div class="ntags">${tags.map(t => `<button type="button" class="chip ${t === cur ? "on" : ""}" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <ul class="news">${items.map(i => `<li><div class="nd">${esc(i.date.replace(/-/g, "."))} <span class="tag">${esc(i.tag)}</span></div>
        <a href="${safeUrl(i.url)}" target="_blank" rel="noopener" class="nt">${esc(i.t)}</a><p>${esc(i.d)}</p><span class="muted ns">${esc(i.src)}</span></li>`).join("")}</ul>
      <h3>🔗 공식 원문 바로가기</h3>
      <div class="more">${N.official.map(o => `<a href="${safeUrl(o.url)}" target="_blank" rel="noopener">${esc(o.t)} ↗</a>`).join("")}</div>
      <div class="check"><b>착한언니 체크포인트</b><br>· 정책은 발표·입법예고·시행 날짜가 다 달라요. 계약 전에는 꼭 시행일과 적용 대상을 원문으로 확인하세요.<br>· 요약은 착한언니가 이해하기 쉽게 다시 쓴 문장이며, 세부 조건은 출처 원문이 기준이에요. (${esc(N.updated)} 기준)</div>`;
    el.querySelectorAll(".ntags .chip").forEach(b => b.onclick = () => { cur = b.dataset.t; render(); });
  };
  render();
})();
