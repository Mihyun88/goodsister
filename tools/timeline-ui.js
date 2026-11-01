/* 📜 정책·세금 타임라인 탭 (data/timeline.js) */
(() => {
  const D = window.GS_TIMELINE, el = document.getElementById("tl-box");
  if (!D || !el) return;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => /^(https?:|mailto:|tel:)/i.test(String(u).trim()) ? esc(u) : "#"; // SEC-2
  const AREAS = ["살 때", "가질 때", "팔 때", "대출", "규제", "전월세", "증여"];
  const ST = { "시행": "st-on", "정부안": "st-plan", "검토": "st-plan", "종료": "st-off" };
  const state = { area: "", nowOnly: false, q: "" };
  const counts = { all: D.items.length, now: D.items.filter(i => i.now).length, plan: D.items.filter(i => i.st === "정부안" || i.st === "검토").length };
  el.innerHTML = `
    <p class="hook" style="margin-top:0">“세금은 정부마다 바뀌어요. 지금 나한테 적용되는 것만 골라 보세요.”</p>
    <div class="tl-sum"><div><b>${counts.all}</b><span>주요 변화</span></div><div><b>${counts.now}</b><span>지금도 적용 중</span></div><div><b>${counts.plan}</b><span>국회·검토 중</span></div><div><b>${D.govs.length - 1}</b><span>정부</span></div></div>
    <div class="tl-ctrl">
      <input type="search" id="tl-q" placeholder="검색: 생애최초, 중과, 종부세, 전세보증…">
      <label class="row tl-now"><input type="checkbox" id="tl-now"> 지금 적용 중인 것만</label>
      <div class="chips" id="tl-area"><span class="chip on" data-a="">전체</span>${AREAS.map(a => `<span class="chip" data-a="${a}">${a}</span>`).join("")}</div>
    </div>
    <div id="tl-list"></div>
    <div class="check"><b>착한언니 체크포인트</b><br>
      · <b>정부안·검토</b>는 아직 법이 바뀐 게 아니에요. 세금 계산은 항상 <b>시행 중</b>인 기준으로 해요.<br>
      · 같은 '12억'이라도 양도세는 파는 가격, 종부세는 공시가격, 취득세 감면은 사는 가격 기준이에요.<br>
      · 이 타임라인은 착한언니복덕방이 공식 발표·법령을 바탕으로 직접 정리한 요약이에요. 실제 신고·계약 전에는 원문과 세무 전문가 확인이 필요해요. (${esc(D.updated)} 기준)</div>`;
  const list = el.querySelector("#tl-list");
  function render() {
    const q = state.q.trim();
    let html = "", n = 0;
    for (const g of D.govs) {
      const its = D.items.filter(i => i.gov === g.k && (!state.area || i.area === state.area) && (!state.nowOnly || i.now)
        && (!q || (i.t + i.x + i.me + i.area).includes(q)));
      if (!its.length) continue; n += its.length;
      html += `<section class="tl-gov"><div class="tl-gh"><b>${esc(g.n)}</b><span>${esc(g.p)} · ${its.length}건</span><p>${esc(g.s)}</p></div>
        ${its.map(i => `<article class="tl-it ${i.now ? "is-now" : ""}">
          <div class="tl-meta"><span class="tl-d">${esc(i.d)}</span><span class="tag">${esc(i.area)}</span><span class="tag dir-${i.dir === "강화" ? "up" : i.dir === "완화" ? "dn" : "nt"}">${esc(i.dir)}</span><span class="tag ${ST[i.st] || ""}">${esc(i.st)}</span>${i.now ? `<span class="tag st-now">지금 적용</span>` : ""}</div>
          <h4>${esc(i.t)}</h4><p>${esc(i.x)}</p>
          <p class="tl-me">👉 ${esc(i.me)}</p>
          <a class="tl-src" href="${safeUrl(i.src[1])}" target="_blank" rel="noopener">출처: ${esc(i.src[0])} ↗</a></article>`).join("")}</section>`;
    }
    list.innerHTML = html || `<p class="muted" style="padding:1rem 0">조건에 맞는 항목이 없어요.</p>`;
  }
  el.querySelector("#tl-q").addEventListener("input", e => { state.q = e.target.value; render(); });
  el.querySelector("#tl-now").addEventListener("change", e => { state.nowOnly = e.target.checked; render(); });
  el.querySelectorAll("#tl-area .chip").forEach(c => c.addEventListener("click", () => {
    el.querySelectorAll("#tl-area .chip").forEach(x => x.classList.toggle("on", x === c)); state.area = c.dataset.a; render(); }));
  render();
})();
