/* 📊 시황분석 탭: R-ONE 주간 지수(data/market.js) + 실거래 월별 거래량·TOP 단지(data/trades.js) */
(() => {
  const M = window.GS_MARKET; let T = window.GS_TRADES;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const eok = man => man >= 10000 ? `${(man / 10000).toFixed(man >= 100000 ? 1 : 2).replace(/\.?0+$/, "")}억` : `${Math.round(man).toLocaleString()}만`;
  const pct = (x, d = 2) => x == null || isNaN(x) ? "-" : `${x > 0 ? "▲" : x < 0 ? "▼" : ""}${Math.abs(x).toFixed(d)}%`;
  const ym = s => `${s.slice(0, 4)}.${s.slice(4, 6)}`;
  const GU = Object.keys(window.GS_GU);
  /* 변동률 셀 색: 상승 빨강 / 하락 파랑 / 0 근처 회색 (diverging, 중간은 무채색) */
  const div = (x, scale) => {
    if (x == null || isNaN(x)) return "";
    const t = Math.min(1, Math.abs(x) / scale);
    if (t < 0.04) return "background:#f0efec";
    const [r, g, b] = x > 0 ? [227, 73, 72] : [42, 120, 214];
    return `background:rgba(${r},${g},${b},${(0.10 + 0.45 * t).toFixed(2)})`;
  };
  const tipEl = document.createElement("div"); tipEl.className = "tip"; document.body.appendChild(tipEl);
  const tip = (e, html) => { if (!html) { tipEl.style.display = "none"; return; } tipEl.innerHTML = html; tipEl.style.display = "block";
    const x = Math.min(e.clientX + 14, innerWidth - tipEl.offsetWidth - 8); tipEl.style.left = x + "px"; tipEl.style.top = (e.clientY + 14) + "px"; };

  // ================= ① 주간 시황 (R-ONE) =================
  function weekly() {
    const el = $("#mk-weekly");
    if (!M) { el.innerHTML = `<p class="muted">부동산원 데이터가 없습니다. <code>python3 scripts/build_market.py</code> 를 실행해 주세요.</p>`; return; }
    const S = M.series, n = M.weeks.length, last = n - 1;
    const chg = (arr, k = 1) => arr && arr[last] != null && arr[last - k] != null ? (arr[last] / arr[last - k] - 1) * 100 : null;
    const sd = (arr) => arr ? arr[last] : null;
    const seoulSale = S.sale["서울"], seoulJ = S.jeonse["서울"];
    const sdTxt = v => v == null ? "-" : `${v.toFixed(1)}`;
    const sdNote = (v, j) => v == null ? "" : v >= 100 ? (j ? "전세 구하려는 사람이 더 많음" : "사려는 사람이 더 많음") : (j ? "전세 매물이 더 많음" : "팔려는 사람이 더 많음");
    const rows = GU.filter(g => S.sale[g]).map(g => ({ g, w: chg(S.sale[g]), m: chg(S.sale[g], 4), h: chg(S.sale[g], last), jw: chg(S.jeonse[g]), jm: chg(S.jeonse[g], 4) }));
    rows.sort((a, b) => b.w - a.w);
    const top3 = rows.slice(0, 3).map(r => `<b>${esc(r.g)}</b>(${pct(r.w)})`).join(" · ");
    const zones = ["도심권", "동북권", "서북권", "서남권", "동남권"];
    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><div class="l">서울 매매가 (주간)</div><div class="v">${pct(chg(seoulSale))}</div><div class="l">4주 ${pct(chg(seoulSale, 4))} · ${n - 1}주 ${pct(chg(seoulSale, last))}</div></div>
        <div class="kpi"><div class="l">서울 전세가 (주간)</div><div class="v">${pct(chg(seoulJ))}</div><div class="l">4주 ${pct(chg(seoulJ, 4))} · ${n - 1}주 ${pct(chg(seoulJ, last))}</div></div>
        <div class="kpi"><div class="l">서울 매매수급지수</div><div class="v">${sdTxt(sd(S.sale_sd["서울"]))}</div><div class="l">${sdNote(sd(S.sale_sd["서울"]))}</div></div>
        <div class="kpi"><div class="l">서울 전세수급지수</div><div class="v">${sdTxt(sd(S.jeonse_sd["서울"]))}</div><div class="l">${sdNote(sd(S.jeonse_sd["서울"]), 1)}</div></div>
      </div>
      <p class="lim">${esc(M.dates[last])} 기준 · 이번 주 매매가가 가장 많이 오른 구: ${top3}</p>
      <h3>서울 아파트 가격지수 추이 (${esc(M.dates[0])} ~ ${esc(M.dates[last])})</h3>
      <div class="legend"><span><i style="background:#2a78d6"></i>매매가격지수</span><span><i style="background:#eb6834"></i>전세가격지수</span></div>
      <div class="chart" id="mk-line"></div>
      <h3>구별 주간 변동률 <span class="muted" style="font-size:.8rem;font-weight:400">빨강 상승 · 파랑 하락</span></h3>
      <div class="tblwrap"><table class="mk"><tr><th>구</th><th class="r">매매 이번 주</th><th class="r">매매 4주</th><th class="r">매매 ${n - 1}주</th><th class="r">전세 이번 주</th><th class="r">전세 4주</th></tr>
      ${rows.map(r => `<tr><td>${esc(r.g)}</td><td class="r" style="${div(r.w, .3)}">${pct(r.w)}</td><td class="r" style="${div(r.m, 1)}">${pct(r.m)}</td><td class="r" style="${div(r.h, 6)}">${pct(r.h, 1)}</td>
        <td class="r" style="${div(r.jw, .3)}">${pct(r.jw)}</td><td class="r" style="${div(r.jm, 1)}">${pct(r.jm)}</td></tr>`).join("")}</table></div>
      <h3>권역별 수급지수 <span class="muted" style="font-size:.8rem;font-weight:400">100보다 크면 사려는(구하려는) 사람이 더 많아요</span></h3>
      <div class="tblwrap"><table class="mk"><tr><th>권역</th><th class="r">매매수급</th><th class="r">4주 전</th><th class="r">전세수급</th><th class="r">4주 전</th></tr>
      ${zones.filter(z => S.sale_sd[z]).map(z => `<tr><td>${esc(z)}</td><td class="r"><b>${sdTxt(sd(S.sale_sd[z]))}</b></td><td class="r muted">${sdTxt(S.sale_sd[z][last - 4])}</td>
        <td class="r"><b>${sdTxt(sd(S.jeonse_sd[z]))}</b></td><td class="r muted">${sdTxt(S.jeonse_sd[z][last - 4])}</td></tr>`).join("")}</table></div>
      <p class="muted" style="font-size:.78rem;margin-top:.5rem">도심권 종로·중구·용산 / 동북권 성동·광진·동대문·중랑·성북·강북·도봉·노원 / 서북권 은평·서대문·마포 / 서남권 양천·강서·구로·금천·영등포·동작·관악 / 동남권 서초·강남·송파·강동</p>`;
    lineChart($("#mk-line"), M.dates, [{ name: "매매", color: "#2a78d6", v: seoulSale }, { name: "전세", color: "#eb6834", v: seoulJ }]);
  }

  function lineChart(el, xs, series) {
    const W = el.clientWidth || 700, H = 220, P = { l: 44, r: 44, t: 12, b: 26 };
    const all = series.flatMap(s => s.v.filter(v => v != null)), lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * .1 || 1;
    const y0 = lo - pad, y1 = hi + pad, X = i => P.l + i * (W - P.l - P.r) / (xs.length - 1), Y = v => P.t + (y1 - v) * (H - P.t - P.b) / (y1 - y0);
    const ticks = [0, 1, 2, 3].map(i => y0 + (y1 - y0) * i / 3);
    const path = s => s.v.map((v, i) => v == null ? "" : `${i && s.v[i - 1] != null ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
    const xl = [0, Math.floor(xs.length / 2), xs.length - 1];
    el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="서울 매매·전세 가격지수 추이">
      ${ticks.map(t => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${P.l - 6}" y="${Y(t) + 4}" class="ax" text-anchor="end">${t.toFixed(1)}</text>`).join("")}
      ${xl.map(i => `<text x="${X(i)}" y="${H - 6}" class="ax" text-anchor="middle">${xs[i].slice(2).replace(/-/g, ".")}</text>`).join("")}
      ${(() => { const ys = series.map(s => Y(s.v[xs.length - 1]) + 4); if (ys.length === 2 && Math.abs(ys[0] - ys[1]) < 14) { const m = (ys[0] + ys[1]) / 2, up = ys[0] <= ys[1] ? 0 : 1; ys[up] = m - 7; ys[1 - up] = m + 7; }
        return series.map((s, k) => `<path d="${path(s)}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>
        <text x="${X(xs.length - 1) + 6}" y="${ys[k]}" class="dl">${s.name}</text>`).join(""); })()}
      <line class="xh" y1="${P.t}" y2="${H - P.b}" style="display:none"/>
      ${series.map((s, k) => `<circle class="dot" data-k="${k}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2" style="display:none"/>`).join("")}
      <rect x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}" fill="transparent" class="hit"/></svg>`;
    const svg = el.querySelector("svg"), xh = svg.querySelector(".xh");
    svg.querySelector(".hit").addEventListener("mousemove", e => {
      const r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(xs.length - 1, Math.round((e.clientX - r.left - P.l) / ((W - P.l - P.r) / (xs.length - 1)))));
      xh.setAttribute("x1", X(i)); xh.setAttribute("x2", X(i)); xh.style.display = "";
      svg.querySelectorAll(".dot").forEach(d => { const s = series[d.dataset.k]; d.setAttribute("cx", X(i)); d.setAttribute("cy", Y(s.v[i])); d.style.display = ""; });
      tip(e, `<b>${esc(xs[i])}</b><br>${series.map(s => `<i style="background:${s.color}"></i>${s.name} ${s.v[i] != null ? s.v[i].toFixed(2) : "-"}${i && s.v[i - 1] ? ` (${pct((s.v[i] / s.v[i - 1] - 1) * 100)})` : ""}`).join("<br>")}`);
    });
    svg.querySelector(".hit").addEventListener("mouseleave", e => { xh.style.display = "none"; svg.querySelectorAll(".dot").forEach(d => d.style.display = "none"); tip(e); });
  }

  // ================= ② 월별 거래량 · ③ 구별 TOP 단지 (실거래) =================
  let deals = null; // [{c, ym, a, p, nh}]
  const bigOnly = () => { const b = document.getElementById("mk-big"); return !b || b.checked; };
  function prep() {
    if (deals) return deals;
    deals = [];
    for (const c of T.complexes) {
      const best = {};
      for (const t of c.t) { // t: [yyyymmdd, 면적, 가격, 층, 직거래]
        const a = Math.floor(t[1]), prev = best[a];
        deals.push({ c, ym: t[0].slice(0, 6), a, p: t[2], nh: prev != null && t[2] > prev });
        best[a] = Math.max(prev || 0, t[2]);
      }
    }
    return deals;
  }

  function monthly() {
    const el = $("#mk-monthly");
    if (!T) { el.innerHTML = `<p class="muted">실거래 데이터가 없습니다.</p>`; return; }
    const D = prep().filter(d => !bigOnly() || ((!d.c.h || d.c.h >= 100) && !(d.c.y && d.c.y >= +d.ym.slice(0, 4) - 1))), months = T.months, byM = {};
    D.forEach(d => (byM[d.ym] ||= []).push(d));
    const counts = months.map(m => (byM[m] || []).length), mx = Math.max(...counts);
    const sel = $("#mk-month"), gsel = $("#mk-gu");
    if (!sel.options.length) {
      months.slice().reverse().forEach((m, i) => sel.appendChild(new Option(`${ym(m)}${i < 2 ? " (신고 진행 중)" : ""}`, m)));
      sel.appendChild(new Option(`최근 3개월 (${ym(months[months.length - 3])}~)`, "r3"));
      sel.value = months[months.length - 2];
      gsel.appendChild(new Option("서울 전체", "")); GU.forEach(g => gsel.appendChild(new Option(g, g)));
      sel.onchange = gsel.onchange = document.getElementById("mk-big").onchange = () => { monthly(); };
    }
    const m = sel.value, pick = m === "r3" ? D.filter(d => d.ym >= months[months.length - 3]) : (byM[m] || []);
    const prevM = m === "r3" ? null : months[months.indexOf(m) - 1], prev = prevM ? (byM[prevM] || []) : [];
    const lagged = new Set(months.slice(-2));
    // 월별 막대
    $("#mk-bars").innerHTML = `<div class="vbars">${months.map((mm, i) => `<div class="vb ${lagged.has(mm) ? "lag" : ""} ${mm === m ? "on" : ""}" data-m="${mm}" data-tip="${esc(ym(mm))} · ${counts[i].toLocaleString()}건${lagged.has(mm) ? " (신고 진행 중)" : ""}">
        <span class="vv">${counts[i] >= 1000 ? (counts[i] / 1000).toFixed(1) + "k" : counts[i]}</span><div style="height:${counts[i] / mx * 100}%"></div><span class="vl">${mm.slice(2, 4)}.${mm.slice(4)}</span></div>`).join("")}</div>`;
    $("#mk-bars").querySelectorAll(".vb").forEach(b => {
      b.onmousemove = e => tip(e, esc(b.dataset.tip)); b.onmouseleave = e => tip(e);
      b.onclick = () => { sel.value = b.dataset.m; monthly(); };
    });
    // 구별 거래량 표
    const agg = (arr) => { const o = {}; arr.forEach(d => { const g = (o[d.c.g] ||= { n: 0, ps: [], nh: 0, cx: {} }); g.n++; g.ps.push(d.p / d.a); if (d.nh) g.nh++; g.cx[d.c.n] = (g.cx[d.c.n] || 0) + 1; }); return o; };
    const A = agg(pick), P = agg(prev);
    const rows = GU.map(g => ({ g, n: A[g]?.n || 0, pn: P[g]?.n || 0, ppm: A[g] ? median(A[g].ps) : 0, nh: A[g]?.nh || 0,
      top: A[g] ? Object.entries(A[g].cx).sort((a, b) => b[1] - a[1])[0] : null })).sort((a, b) => b.n - a.n);
    const tot = pick.length, ptot = prev.length;
    $("#mk-gutable").innerHTML = `
      <p class="lim">${m === "r3" ? "최근 3개월" : ym(m)} 서울 아파트 매매 <b>${tot.toLocaleString()}건</b>${prevM ? ` · 전월 대비 ${pct(ptot ? (tot / ptot - 1) * 100 : null, 1)}` : ""}${lagged.has(m) || m === "r3" ? ` <span class="tag">최근 달은 신고 진행 중이라 더 늘어나요</span>` : ""}</p>
      <div class="tblwrap"><table class="mk"><tr><th>구</th><th class="r">거래량</th>${prevM ? `<th class="r">전월 대비</th>` : ""}<th class="r">평당 중위가</th><th class="r">최고가 갱신</th><th>거래 1위 단지</th></tr>
      ${rows.map(r => `<tr class="click" data-g="${esc(r.g)}"><td>${esc(r.g)}</td><td class="r"><b>${r.n}</b></td>${prevM ? `<td class="r">${pct(r.pn ? (r.n / r.pn - 1) * 100 : null, 0)}</td>` : ""}
        <td class="r">${r.ppm ? eok(r.ppm * 3.3058) : "-"}</td><td class="r">${r.nh || "-"}</td><td>${r.top ? `${esc(r.top[0])} <span class="muted">${r.top[1]}건</span>` : "-"}</td></tr>`).join("")}</table></div>`;
    $("#mk-gutable").querySelectorAll("tr.click").forEach(tr => tr.onclick = () => { gsel.value = tr.dataset.g; monthly(); $("#mk-top").scrollIntoView({ behavior: "smooth", block: "start" }); });
    // TOP 단지
    const gu = gsel.value, inG = pick.filter(d => !gu || d.c.g === gu), cx = new Map();
    inG.forEach(d => { const o = cx.get(d.c) || { c: d.c, n: 0, ps: [], as: {}, nh: 0, max: 0 }; o.n++; o.ps.push(d.p); o.as[d.a] = (o.as[d.a] || 0) + 1; if (d.nh) o.nh++; o.max = Math.max(o.max, d.p); cx.set(d.c, o); });
    const top = [...cx.values()].sort((a, b) => b.n - a.n || b.max - a.max).slice(0, 15);
    $("#mk-toplist").innerHTML = top.length ? `<div class="tblwrap"><table class="mk"><tr><th>#</th><th>단지</th><th>위치</th><th class="r">세대수</th><th class="r">거래</th><th class="r">주력 면적</th><th class="r">중위가</th><th class="r">최고가</th><th class="r">최고가 갱신</th><th></th></tr>
      ${top.map((o, i) => { const fa = Object.entries(o.as).sort((a, b) => b[1] - a[1])[0][0];
        return `<tr><td>${i + 1}</td><td><b>${esc(o.c.n)}</b> <span class="tag">${o.c.y || "-"}년</span></td><td>${esc(o.c.g)} ${esc(o.c.d)}</td><td class="r">${o.c.h ? o.c.h.toLocaleString() : "-"}</td>
        <td class="r"><b>${o.n}</b></td><td class="r">${fa}㎡</td><td class="r">${eok(median(o.ps))}</td><td class="r">${eok(o.max)}</td><td class="r">${o.nh || "-"}</td>
        <td><a href="#check" class="go" data-i="${T.complexes.indexOf(o.c)}">가격 검토 →</a></td></tr>`; }).join("")}</table></div>`
      : `<p class="muted">이 기간에 거래가 없습니다.</p>`;
    $("#mk-toplist").querySelectorAll("a.go").forEach(a => a.onclick = e => {
      e.preventDefault(); const c = T.complexes[+a.dataset.i];
      document.querySelector('.tab[data-tab="check"]').click(); history.replaceState(null, "", "#check");
      const q = $("#apt-q"); q.value = c.n; q.dispatchEvent(new Event("input"));
      const s = $("#apt-sel"); s.value = a.dataset.i; s.dispatchEvent(new Event("change")); scrollTo(0, 0);
    });
    $("#mk-toptitle").textContent = `${gu || "서울 전체"} 거래량 TOP 단지 · ${m === "r3" ? "최근 3개월" : ym(m)}`;
  }

  let done = false;
  const render = async () => {
    if (done) return; done = true; weekly();
    if (!T) { const ok = window.GS_ensure ? await window.GS_ensure("trades", $("#mk-gutable")) : false; T = window.GS_TRADES; if (!ok || !T) return; }
    monthly();
  };
  document.querySelectorAll('.tab[data-tab="market"]').forEach(b => b.addEventListener("click", () => setTimeout(render)));
  if (location.hash === "#market") setTimeout(render);
  window.addEventListener("hashchange", () => location.hash === "#market" && setTimeout(render));
})();
