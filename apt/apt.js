/* 단지 시세: 검색 → 단지 상세(면적별 매매·전세·월세) → 의뢰 / 비교
   데이터: ../tools/data/cx/index.json, ../tools/data/cx/{시군구}.json (scripts/build_cx.py) */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DATA = "../tools/data/cx/";
  const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
  const short = v => { if (v == null) return "-"; v = Math.round(v); const e = Math.floor(v / 10000), r = v % 10000;
    if (!e) return `${v.toLocaleString()}만`; if (!r) return `${e}억`; return r % 1000 === 0 ? `${e}억 ${r / 1000}천` : `${e}억 ${r.toLocaleString()}만`; };
  const full = v => { v = Math.round(v); const e = Math.floor(v / 10000), r = v % 10000; return (e ? `${e}억` : "") + (r ? `${e ? " " : ""}${r.toLocaleString()}만` : "") + " 원"; };
  const dfmt = d => `${d.slice(2, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
  const ym = s => `${s.slice(0, 4)}.${s.slice(4, 6)}`;
  const toast = t => { const el = document.createElement("div"); el.className = "toast"; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 2200); };
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } } };

  let IDX = null; const SGG = {};
  // 행: [id, 단지명, 지역, 동, 준공, 시군구, 매매건수, 전월세건수] (파일에선 지역을 시군구 표로 빼서 저장)
  const loadIndex = async () => IDX || (IDX = await (async () => { const d = await (await fetch(DATA + "index.json")).json();
    d.rows = d.rows.map(r => r.length === 7 ? [r[0], r[1], d.regions[r[4]] || "", r[2], r[3], r[4], r[5], r[6]] : r); return d; })());
  const loadSgg = async s => SGG[s] || (SGG[s] = await (await fetch(DATA + s + ".json")).json());
  const seoul = sgg => String(sgg).startsWith("11");

  // ---------- 검색 ----------
  const q = $("#q"), sug = $("#sug");
  const norm = s => s.replace(/\s+/g, "").toLowerCase();
  let hits = [], sel = -1;
  async function suggest() {
    const v = norm(q.value); if (!v) { sug.hidden = true; return; }
    const I = await loadIndex(), toks = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hit = r => { const all = norm(r[1] + r[2] + r[3]); return norm(r[1]).includes(v) || toks.every(t => all.includes(t)); };
    hits = []; for (const r of I.rows) { if (hit(r)) { hits.push(r); if (hits.length >= 20) break; } }
    sel = -1;
    sug.innerHTML = hits.length ? hits.map((r, i) => `<li role="option" data-i="${i}"><b>${esc(r[1])}</b><span>${esc(r[2])} ${esc(r[3])}${r[4] ? ` · ${r[4]}년` : ""} · 매매 ${r[6]}건 · 전월세 ${r[7]}건</span></li>`).join("")
      : `<li>검색 결과가 없어요. 단지명 일부나 동 이름으로 찾아보세요.</li>`;
    sug.hidden = false;
  }
  q.addEventListener("input", suggest);
  q.addEventListener("focus", () => { loadIndex(); if (q.value) suggest(); });
  q.addEventListener("keydown", e => {
    const li = [...sug.querySelectorAll("li[data-i]")]; if (!li.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + li.length) % li.length; li.forEach((x, i) => x.setAttribute("aria-selected", i === sel)); }
    if (e.key === "Enter") { e.preventDefault(); go(hits[Math.max(sel, 0)]); }
  });
  sug.addEventListener("click", e => { const li = e.target.closest("li[data-i]"); if (li) go(hits[+li.dataset.i]); });
  document.addEventListener("click", e => { if (!e.target.closest(".search")) sug.hidden = true; });
  const go = r => { if (!r) return; sug.hidden = true; nav({ id: r[0], s: r[5] }); };

  // 착한언니 동네 바로가기
  (async () => {
    const I = await loadIndex().catch(() => null); if (!I) return;
    const near = I.rows.filter(r => r[5] === "11440" || r[5] === "11410").slice(0, 6);
    $("#pop").innerHTML = `<small>착한언니가 직접 다니는 동네에서 거래 많은 단지</small>` +
      near.map((r, i) => `<button type="button" data-i="${i}">${esc(r[1])}</button>`).join("");
    $("#pop").onclick = e => { const b = e.target.closest("button"); if (b) nav({ id: near[+b.dataset.i][0], s: near[+b.dataset.i][5] }); };
  })();

  document.querySelectorAll("[data-lead]").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.lead === "offi") GS_lead.open({ kind: "offi" });
    else { q.focus(); toast("내놓을 집의 단지를 먼저 검색해 주세요"); }
  }));

  // ---------- 라우팅 ----------
  function nav(p, replace) {
    const u = new URL(location.href); u.search = new URLSearchParams(p).toString();
    history[replace ? "replaceState" : "pushState"](null, "", u); route();
  }
  window.addEventListener("popstate", route);
  function route() {
    const p = new URLSearchParams(location.search);
    $("#home").hidden = !!(p.get("id") || p.get("cmp")); $("#detail").hidden = !p.get("id"); $("#compare").hidden = !p.get("cmp");
    if (p.get("id")) detail(p.get("id"), p.get("s"), p.get("a"));
    else if (p.get("cmp")) compare();
    else { document.title = "단지 시세 · 착한언니복덕방";
      if (p.get("q")) { q.value = p.get("q"); suggest().then(() => { const ex = hits.filter(r => r[1] === p.get("q")); if (ex.length === 1) nav({ id: ex[0][0], s: ex[0][5] }, true); }); } }
    window.scrollTo(0, 0);
  }

  // ---------- 면적 묶기 ----------
  function bands(c) {
    const cnt = {}; for (const x of [...c.t, ...c.r]) { const k = Math.floor(x[1]); if (k > 0) cnt[k] = (cnt[k] || 0) + 1; }
    const keys = Object.keys(cnt).map(Number).sort((a, b) => a - b), groups = [];
    for (const k of keys) { const g = groups[groups.length - 1]; if (g && k - g.hi <= 2) { g.hi = k; g.n += cnt[k]; if (cnt[k] > cnt[g.label]) g.label = k; } else groups.push({ lo: k, hi: k, label: k, n: cnt[k] }); }
    return groups.filter(g => g.n >= 1).sort((a, b) => a.label - b.label);
  }
  const inBand = (g, ar) => Math.floor(ar) >= g.lo && Math.floor(ar) <= g.hi;
  const monthsBefore = (yyyymm, n) => { let y = +yyyymm.slice(0, 4), m = +yyyymm.slice(4, 6) - n + 1; while (m <= 0) { m += 12; y--; } return `${y}${String(m).padStart(2, "0")}01`; };

  function stats(F, c, g) {
    const t = c.t.filter(x => inBand(g, x[1])), r = c.r.filter(x => inBand(g, x[1]));
    const cut6 = monthsBefore(F.tm[1], 6);
    let t6 = t.filter(x => x[0] >= cut6), tp = "6개월";
    if (t6.length < 3 && t.length > t6.length) { t6 = t; tp = "1년"; }
    const j = r.filter(x => x[3] === 0), w = r.filter(x => x[3] > 0);
    return { t, r, t6, tp, j, w, sale: med(t6.map(x => x[2])), jeon: med(j.map(x => x[2])), wDep: med(w.map(x => x[2])), wMon: med(w.map(x => x[3])),
      lo: t.length ? Math.min(...t.map(x => x[2])) : null, hi: t.length ? Math.max(...t.map(x => x[2])) : null };
  }

  // ---------- 상세 ----------
  let cur = null;
  async function detail(id, sgg, a) {
    const box = $("#detail"); box.innerHTML = `<p class="empty">불러오는 중…</p>`;
    if (!sgg) { const I = await loadIndex(); const r = I.rows.find(x => x[0] === id); sgg = r && r[5]; }
    let F; try { F = await loadSgg(sgg); } catch (e) { box.innerHTML = `<p class="empty">데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>`; return; }
    const c = F.cx[id]; if (!c) { box.innerHTML = `<p class="empty">단지 정보를 찾지 못했어요.</p>`; return; }
    const G = bands(c); if (!G.length) { box.innerHTML = `<p class="empty">최근 거래가 없는 단지예요.</p>`; return; }
    let g = G.find(x => String(x.label) === a) || G.reduce((m, x) => x.n > m.n ? x : m, G[0]);
    cur = { id, sgg, c, F, G, g, filter: "all", all: false };
    document.title = `${c.n} 시세 · 착한언니복덕방`;
    render();
  }
  function render() {
    const { id, sgg, c, F, G, g } = cur, S = stats(F, c, g), se = seoul(sgg), box = $("#detail");
    const rate = S.sale && S.jeon ? Math.round(S.jeon / S.sale * 100) : null;
    const one = [];
    if (rate) one.push(`전세가율 약 <b>${rate}%</b>`);
    if (S.t6.length) one.push(`매매는 최근 ${S.tp} <b>${S.t6.length}건</b>${S.t6.length < 3 ? "으로 드물어 비교 가능한 건수가 적어요" : ""}`);
    else one.push("최근 1년 매매 신고가 없어요");
    if (S.lo != null && S.t.length >= 3 && S.hi / S.lo > 1.08) one.push(`1년 동안 <b>${short(S.lo)}~${short(S.hi)}</b> 사이에서 층·향·시점에 따라 차이가 커요`);
    if (S.j.length) one.push(`전세는 ${S.j.length}건 신고됐어요`);
    const list = [...S.t.map(x => ({ k: "m", d: x[0], f: x[3], p: short(x[2]), ar: x[1], x: x[4] ? "직거래" : "" })),
      ...S.r.map(x => ({ k: x[3] ? "w" : "j", d: x[0], f: x[4], p: x[3] ? `${short(x[2])} / ${x[3]}만` : short(x[2]), ar: x[1], x: x[5] === 1 ? "신규" : x[5] === 0 ? "갱신" : "" }))]
      .filter(x => cur.filter === "all" || x.k === cur.filter).sort((a, b) => b.d.localeCompare(a.d));
    const shown = cur.all ? list : list.slice(0, 6), K = { m: ["매매", "bm"], j: ["전세", "bj"], w: ["월세", "bw"] };
    const inCmp = store.get("gs_cmp", []).some(x => x.id === id && x.a === String(g.label));
    box.innerHTML = `
      <button type="button" class="back" id="back">‹ 검색으로</button>
      <h1 style="margin-top:6px">${esc(c.n)}<span class="tag ${se ? "se" : "gg"}">${se ? "서울" : "경기 · 시세 정보"}</span></h1>
      <p class="meta">${esc(F.name)} ${esc(c.d)}${c.y ? ` · ${c.y}년 준공` : ""}${c.h ? ` · ${c.h.toLocaleString()}세대` : ""}</p>
      <div class="seg" role="tablist">${G.map(x => `<button type="button" role="tab" data-a="${x.label}" class="${x === g ? "on" : ""}">${x.label}㎡<small>${x.n}건</small></button>`).join("")}</div>
      <div class="kp">
        <div class="${S.sale ? "" : "na"}"><small>매매 중위</small><b>${S.sale ? short(S.sale) : "거래 없음"}</b><i>${S.t6.length ? `${S.tp} · ${S.t6.length}건` : "최근 1년"}</i></div>
        <div class="${S.jeon ? "" : "na"}"><small>전세 중위</small><b>${S.jeon ? short(S.jeon) : "거래 없음"}</b><i>6개월 · ${S.j.length}건</i></div>
        <div class="${S.w.length ? "" : "na"}"><small>월세 중위</small><b>${S.w.length ? `${S.wMon}만` : "거래 없음"}</b><i>${S.w.length ? `보증금 ${short(S.wDep)} · ${S.w.length}건` : "6개월"}</i></div>
      </div>
      <p class="one"><b>한 줄 요약</b> ${one.join(". ")}.</p>
      ${chart(S, F)}
      <p class="sec">최근 거래 <small>${g.label}㎡ · 계약일 기준</small></p>
      <div class="flt">${[["all", "전체"], ["m", "매매"], ["j", "전세"], ["w", "월세"]].map(([k, t]) => `<button type="button" data-f="${k}" class="${cur.filter === k ? "on" : ""}">${t}</button>`).join("")}</div>
      <ul class="tx">${shown.map(x => `<li><span class="d"><span class="b ${K[x.k][1]}">${K[x.k][0]}</span>${dfmt(x.d)} · ${x.f}층 · ${x.ar}㎡${x.x ? ` · ${x.x}` : ""}</span><b>${x.p}</b></li>`).join("") || `<li>해당 거래가 없어요</li>`}</ul>
      ${list.length > 6 ? `<button type="button" class="more" id="more">${cur.all ? "접기 ▴" : `전체 ${list.length}건 보기 ▾`}</button>` : ""}
      <p class="src">출처: 국토교통부 아파트 매매·전월세 실거래가 (매매 ${ym(F.tm[0])}~${ym(F.tm[1])}, 전월세 ${ym(F.rm[0])}~${ym(F.rm[1])} 계약분) · 갱신 ${esc(F.updated)} · 최근 1~2개월은 신고가 더 들어올 수 있어요. 해제된 거래는 뺐어요.</p>
      ${se ? `
      <div class="do"><b>의뢰하면 착한언니가 이렇게까지 해요</b>
        <ol><li>같은 면적 <strong>층·향별 실거래</strong>로 매물 가격이 맞는지 검증</li>
        <li>등기부·건축물대장으로 <strong>권리관계·위반건축물</strong> 확인</li>
        <li>대출 한도·<strong>잔금 일정표</strong> 같이 짜기 · 토지거래허가 서류 챙기기</li>
        <li>계약서 <strong>특약</strong> 검토 · 입주 전 하자 체크</li>
        <li><strong>법무사·세무사·입주 청소</strong>까지 믿을 만한 곳으로 연결</li></ol>
        <p>퀄리티 있는 상담을 위해 예약 손님 우선으로 도와드려요.</p></div>
      <div class="act">
        <button type="button" class="ac main" id="want"><b>이 단지 ${g.label}㎡ 구해요 ›</b><span>매수·전세·월세 매물 의뢰 · 조건 확인 후 연락드려요</span></button>
        <div id="pick" class="act" hidden>
          <button type="button" class="ac" data-k="buy"><b>매수할 집 찾아요</b><span>6개월 안에 매수 계획이 있어요</span></button>
          <button type="button" class="ac" data-k="rent"><b>전세·월세 구해요</b><span>3개월 안에 이사해야 해요</span></button></div>
        <button type="button" class="ac" id="own"><b>이 단지 집주인이에요 ›</b><span>전세·월세·매도 내놓기 · 주변 시세와 비교해 드려요</span></button>
      </div>` : ""}
      <div class="tools">
        <a href="../check/?t=imjang&n=${encodeURIComponent(c.n)}&a=${g.label}">📝 임장 체크</a>
        <button type="button" id="cmpadd" class="${inCmp ? "on" : ""}">${inCmp ? "✓ 비교에 담김" : "⚖️ 비교에 담기"}</button>
        <a href="../tools/#cost${S.sale ? `?price=${(S.sale / 10000).toFixed(2)}` : ""}">🧾 부대비용</a>
      </div>
      ${store.get("gs_cmp", []).length ? `<p class="fine"><a href="?cmp=1">담은 단지 ${store.get("gs_cmp", []).length}곳 비교하기 ›</a></p>` : ""}
      ${se ? "" : `<div class="gg"><p>경기 지역은 직접 중개하지 않아요.<br>3개월 안에 매수 계획이 있으시면 가능 여부를 먼저 확인해 드려요.</p><button type="button" id="ggq">중개 가능 여부 문의</button></div>`}`;
    const cx = { name: c.n, area: String(g.label), region: F.name };
    $("#back").onclick = () => history.length > 1 ? history.back() : nav({});
    box.querySelectorAll(".seg button").forEach(b => b.onclick = () => { cur.g = G.find(x => String(x.label) === b.dataset.a); cur.all = false; nav({ id, s: sgg, a: b.dataset.a }, true); });
    box.querySelectorAll(".flt button").forEach(b => b.onclick = () => { cur.filter = b.dataset.f; cur.all = false; render(); });
    $("#more") && ($("#more").onclick = () => { cur.all = !cur.all; render(); });
    $("#want") && ($("#want").onclick = () => { $("#pick").hidden = !$("#pick").hidden; });
    box.querySelectorAll("#pick [data-k]").forEach(b => b.onclick = () => GS_lead.open({ kind: b.dataset.k, cx }));
    $("#own") && ($("#own").onclick = () => GS_lead.open({ kind: "owner", cx }));
    $("#ggq") && ($("#ggq").onclick = () => GS_lead.open({ kind: "gg", cx }));
    $("#cmpadd").onclick = () => {
      let L = store.get("gs_cmp", []); const k = String(g.label);
      if (L.some(x => x.id === id && x.a === k)) L = L.filter(x => !(x.id === id && x.a === k));
      else { if (L.length >= 4) { toast("비교는 4곳까지 담을 수 있어요"); return; } L.push({ id, s: sgg, a: k }); toast("비교에 담았어요"); }
      store.set("gs_cmp", L); render();
    };
  }

  // 최근 1년 매매(분홍)·전세(파랑) 점 그래프
  function chart(S, F) {
    const pts = [...S.t.map(x => [x[0], x[2], "m"]), ...S.j.map(x => [x[0], x[2], "j"])];
    if (pts.length < 2) return "";
    const W = 600, H = 170, P = 34, start = monthsBefore(F.tm[1], 12), end = `${F.tm[1]}31`;
    const tx = d => { const t = (Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8)) - Date.UTC(+start.slice(0, 4), +start.slice(4, 6) - 1, 1)) /
      (Date.UTC(+end.slice(0, 4), +end.slice(4, 6) - 1, 28) - Date.UTC(+start.slice(0, 4), +start.slice(4, 6) - 1, 1)); return P + Math.max(0, Math.min(1, t)) * (W - P - 8); };
    const vs = pts.map(p => p[1]), lo = Math.min(...vs) * 0.92, hi = Math.max(...vs) * 1.04;
    const ty = v => 10 + (1 - (v - lo) / (hi - lo || 1)) * (H - 34);
    const ticks = [lo + (hi - lo) * 0.15, lo + (hi - lo) * 0.85].map(v => Math.round(v / 1000) * 1000).map(v => `<text x="2" y="${ty(v) + 4}" font-size="11" fill="#999">${short(v)}</text><line x1="${P + 30}" x2="${W - 8}" y1="${ty(v)}" y2="${ty(v)}" stroke="#F0EDE8"/>`).join("");
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 1년 매매·전세 거래가">${ticks}
      ${pts.map(p => `<circle cx="${tx(p[0]).toFixed(1)}" cy="${ty(p[1]).toFixed(1)}" r="5" fill="${p[2] === "m" ? "#C2325F" : "#2457A6"}" fill-opacity=".75"/>`).join("")}
      <text x="${P}" y="${H - 4}" font-size="11" fill="#999">${ym(start)}</text><text x="${W - 60}" y="${H - 4}" font-size="11" fill="#999">${ym(F.tm[1])}</text></svg>
      <div class="lg"><span><i style="background:#C2325F"></i>매매</span><span><i style="background:#2457A6"></i>전세</span></div></div>`;
  }

  // ---------- 비교 ----------
  async function compare() {
    const box = $("#compare"), L = store.get("gs_cmp", []);
    document.title = "단지 비교 · 착한언니복덕방";
    if (!L.length) { box.innerHTML = `<button type="button" class="back" id="back">‹ 검색으로</button><p class="empty" style="margin-top:12px">단지 상세에서 ‘비교에 담기’를 눌러주세요.</p>`; $("#back").onclick = () => nav({}); return; }
    box.innerHTML = `<p class="empty">불러오는 중…</p>`;
    const rows = [];
    for (const x of L) {
      const F = await loadSgg(x.s).catch(() => null), c = F && F.cx[x.id]; if (!c) continue;
      const g = bands(c).find(b => String(b.label) === x.a); if (!g) continue;
      const S = stats(F, c, g); rows.push({ x, c, F, S, se: seoul(x.s) });
    }
    box.innerHTML = `<button type="button" class="back" id="back">‹ 검색으로</button>
      <h1 style="margin-top:6px">담은 단지 <em>${rows.length}곳</em> 비교</h1>
      <p class="lead">같은 기준(매매 최근 6개월·없으면 1년, 전월세 6개월)의 중위값이에요.</p>
      <div class="cmp" style="margin-top:14px"><table><thead><tr><th>단지</th><th>매매 중위</th><th>전세 중위</th><th>전세가율</th><th>매매 건수</th><th>준공</th><th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td><a href="?id=${encodeURIComponent(r.x.id)}&s=${r.x.s}&a=${r.x.a}">${esc(r.c.n)}</a><br><small>${esc(r.F.name.replace(/^(서울|경기) /, ""))} · ${r.x.a}㎡</small></td>
        <td>${short(r.S.sale)}</td><td>${short(r.S.jeon)}</td><td>${r.S.sale && r.S.jeon ? Math.round(r.S.jeon / r.S.sale * 100) + "%" : "-"}</td>
        <td>${r.S.t6.length}건 (${r.S.tp})</td><td>${r.c.y || "-"}</td><td><button type="button" class="x" data-i="${i}">빼기</button></td></tr>`).join("")}</tbody></table></div>
      ${rows.some(r => r.se) ? `<div class="act" style="margin-top:16px"><button type="button" class="ac main" id="cbuy"><b>이 중에서 매물 의뢰하기 ›</b><span>비교한 단지 그대로 의뢰 내용에 들어가요</span></button></div>` : ""}
      <div class="tools" style="grid-template-columns:1fr 1fr"><a href="../check/?t=imjang">📝 임장 체크리스트</a><button type="button" id="cclear">비교 비우기</button></div>`;
    $("#back").onclick = () => nav({});
    box.querySelectorAll(".x").forEach(b => b.onclick = () => { const r = rows[+b.dataset.i]; store.set("gs_cmp", store.get("gs_cmp", []).filter(y => !(y.id === r.x.id && y.a === r.x.a))); compare(); });
    $("#cclear").onclick = () => { store.set("gs_cmp", []); compare(); };
    $("#cbuy") && ($("#cbuy").onclick = () => GS_lead.open({ kind: "buy", cx: { name: rows.filter(r => r.se).map(r => `${r.c.n} ${r.x.a}㎡`).join(" / "), area: "" } }));
  }

  route();
})();
