/* 착한언니 AI 부동산 도구 — 데이터는 data/*.js (scripts/build_data.py 로 생성) */
(() => {
  const T = window.GS_TRADES, R = window.GS_RENTS, GU = window.GS_GU, DEST = window.GS_DEST;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- 공통 유틸 ----------
  const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  /** 만원 → "8억 5,500만 원" */
  const money = man => {
    man = Math.round(man); if (!man) return "0원";
    const eok = Math.floor(man / 10000), rest = man % 10000;
    return (eok ? `${eok}억` : "") + (rest ? `${eok ? " " : ""}${rest.toLocaleString()}만` : "") + " 원";
  };
  const pct = (x, d = 1) => `${x > 0 ? "+" : ""}${x.toFixed(d)}%`;
  const ymLabel = ym => `${ym.slice(0, 4)}.${ym.slice(4, 6)}`;
  const addMonths = (ym, n) => { let y = +ym.slice(0, 4), m = +ym.slice(4, 6) + n; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return `${y}${String(m).padStart(2, "0")}`; };
  const lastYM = () => T.months[T.months.length - 1];
  const sinceYM = n => addMonths(lastYM(), -(n - 1)); // 최근 n개월 시작월
  const area = a => Math.floor(a); // 84.95㎡ → 84㎡ (관례 표기)

  // ---------- 탭 ----------
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === b));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + b.dataset.tab));
  }));

  // ---------- 데이터 상태 ----------
  const missing = [];
  if (!T) missing.push("아파트 매매(trades.js) — 도구 ①③");
  if (!R) missing.push("전월세(rents.js) — 도구 ②");
  if (missing.length) {
    const n = $("#nodata"); n.hidden = false;
    n.innerHTML = `<b>실거래 데이터가 아직 없습니다.</b> 없는 데이터: ${missing.map(esc).join(", ")}<br>
      공공데이터포털 키를 넣고 <code>python3 scripts/build_data.py</code> 를 한 번 실행하면 <code>tools/data/</code> 가 채워집니다.
      (본 도구는 임의의 예시 숫자를 쓰지 않습니다.)`;
  }
  $("#src").textContent = [T && `매매: ${T.source}, ${T.updated} 수집`, R && `전월세: ${R.source}, ${R.updated} 수집`].filter(Boolean).join(" · ") || "출처: 국토교통부 실거래가 공개시스템";
  const needData = (el, ok, what) => { if (!ok) el.innerHTML = `<p class="muted">${what} 데이터가 없어 계산할 수 없습니다. 상단 안내를 확인해 주세요.</p>`; return ok; };

  // ======================================================
  // ① 내 예산으로 서울 어디까지? (지금·1·3·5년 후)
  // ======================================================
  const chipBox = $("#gu-chips");
  Object.keys(GU).forEach(g => {
    const c = document.createElement("span"); c.className = "chip"; c.textContent = g;
    c.onclick = () => c.classList.toggle("on"); chipBox.appendChild(c);
  });
  const hasHH = !!(T && T.complexes.some(c => c.h));
  if (!hasHH) {
    const r = $("#hh-row"); r.querySelector("input").disabled = true;
    r.insertAdjacentHTML("beforeend", ` <small>(세대수 데이터 없음: <code>build_data.py --households</code> 실행 필요)</small>`);
  }

  /** 1주택 취득세(+지방교육세) + 중개보수 상한 추정 (만원) */
  function buyCost(p) {
    const eok = p / 10000;
    let tax = eok <= 6 ? 0.01 : eok <= 9 ? (eok * 2 / 3 - 3) / 100 : 0.03;
    tax *= 1.1; // 지방교육세(취득세의 10%) 근사
    const fee = eok < 9 ? 0.004 : eok < 12 ? 0.005 : eok < 15 ? 0.006 : 0.007;
    return p * (tax + fee);
  }
  /** 원리금균등: 월 상환 가능액 m 으로 빌릴 수 있는 원금 */
  const principal = (m, ratePct, years) => { const i = ratePct / 1200, n = years * 12; return m <= 0 ? 0 : i ? m * (1 - (1 + i) ** -n) / i : m * n; };
  const payment = (L, ratePct, years) => { const i = ratePct / 1200, n = years * 12; return i ? L * i / (1 - (1 + i) ** -n) : L / n; };
  /** 서울 주담대 한도: LTV(2025.10.15 대책, 서울 전역 규제지역) · 가격별 상한 · 스트레스 DSR 중 가장 작은 값 */
  function loanParts(p, o, income) {
    const eok = p / 10000;
    const cap = eok <= 15 ? 60000 : eok <= 25 ? 40000 : 20000;
    const ltv = p * (o.first ? 0.7 : 0.4);
    const dsr = principal((income * o.dsr / 100 - o.debt) / 12, o.rate + o.stress, o.term);
    const parts = { LTV: ltv, "가격별 상한": cap, "스트레스 DSR": dsr };
    const [by, amt] = Object.entries(parts).sort((a, b) => a[1] - b[1])[0];
    return { amt: Math.max(0, Math.min(amt, p)), by };
  }
  /** 대출 선택: max(한도 최대) · custom(원하는 금액, 한도 이내) · none(대출 없음) */
  function loanFor(p, o, income) {
    if (o.mode === "none") return { amt: 0, by: "대출 없음" };
    const lim = loanParts(p, o, income);
    if (o.mode === "custom" && o.loan != null && o.loan < lim.amt) return { amt: Math.min(o.loan, p), by: "희망 대출액" };
    return lim;
  }
  function solve(assets, o, income) {
    let lo = 0, hi = 1000000;
    for (let i = 0; i < 60; i++) {
      const p = (lo + hi) / 2;
      const loan = loanFor(p, o, income).amt;
      if (p + buyCost(p) <= assets + loan) lo = p; else hi = p;
    }
    const loan = loanFor(lo, o, income);
    return { P: lo, loan, cost: buyCost(lo) };
  }

  // 대출 선택에 따라 입력칸 보이기
  const fb = $("#f-budget"), hintTxt = {
    max: "LTV · 가격별 상한 · 스트레스 DSR 안에서 가장 많이 받는 경우로 계산해요.",
    custom: "원하는 금액만큼만 빌려요. 규제 한도보다 크게 넣으면 한도까지만 계산해요.",
    none: "대출 없이 현금(과 돌려받을 보증금)만으로 살 수 있는 집을 찾아요." };
  const syncLoan = () => { const m = fb.loanmode.value; fb.querySelector(".loan-amt").hidden = m !== "custom";
    fb.querySelector(".need-loan legend").textContent = m === "none" ? "소득 (N년 후 저축 계산용)" : "소득 (DSR 계산용)"; $("#seg-hint").textContent = hintTxt[m]; };
  fb.querySelectorAll('[name=loanmode]').forEach(r => r.addEventListener("change", syncLoan)); syncLoan();
  window.GS_syncLoan = syncLoan;

  let budgetState = null;
  $("#f-budget").addEventListener("submit", e => {
    e.preventDefault();
    const out = $("#o-budget"); if (!needData(out, T, "아파트 매매")) return;
    const f = e.target, v = n => +f[n].value || 0;
    const o = { first: f.first.checked, rate: v("rate"), stress: v("stress"), term: v("term") || 30, dsr: v("dsr"), debt: v("debt"),
      mode: f.loanmode.value, loan: f.loan.value === "" ? null : v("loan") * 10000 };
    const r = v("ret") / 100, ig = v("incg") / 100, hg = v("hpg") / 100, save = v("save");
    const start = (v("cash") + v("dep")) * 10000;
    const hz = [0, 1, 3, 5].map(n => {
      const assets = start * (1 + r) ** n + save * 12 * (r ? ((1 + r) ** n - 1) / r : n);
      const income = v("inc") * (1 + ig) ** n;
      const s = solve(assets, o, income);
      return { n, assets, income, ...s, P0: s.P / (1 + hg) ** n }; // P0: 오늘 시세로 환산한 가격
    });
    budgetState = { hz, sel: 0, o, hg, ret: v("ret"), band: f.band.value, big: hasHH && f.big.checked,
      gus: [...chipBox.querySelectorAll(".on")].map(c => c.textContent) };
    renderBudget();
  });

  function renderBudget() {
    const { hz, sel, o, hg, band, big, gus } = budgetState, h = hz[sel], out = $("#o-budget");
    const from = sinceYM(6);
    const inBand = a => !band || (band === "s" ? a <= 60 : band === "m" ? a > 60 && a <= 85 : a > 85);
    const rows = [];
    for (const c of T.complexes) {
      if (gus.length && !gus.includes(c.g)) continue;
      if (big && !(c.h >= 500)) continue;
      const byA = {};
      for (const t of c.t) if (t[0].slice(0, 6) >= from && inBand(t[1])) (byA[area(t[1])] ||= []).push(t);
      for (const [a, ts] of Object.entries(byA)) {
        const med = median(ts.map(t => t[2]));
        if (med <= h.P0) rows.push({ c, a: +a, med, n: ts.length, last: ts[ts.length - 1] });
      }
    }
    rows.sort((x, y) => y.med - x.med);
    // 가격대 안에서 거래가 가장 많은 동 TOP3 (예산의 80~100% 구간)
    const dongs = {};
    rows.filter(r => r.med >= h.P0 * 0.8).forEach(r => { const k = `${r.c.g} ${r.c.d}`; dongs[k] = (dongs[k] || 0) + r.n; });
    const topDong = Object.entries(dongs).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const label = n => n ? `${n}년 후` : "지금";
    const mpay = payment(h.loan.amt, o.rate, o.term);

    out.innerHTML = `
      <div class="horizon">${hz.map((x, i) => `<button type="button" class="hz ${i === sel ? "on" : ""}" data-i="${i}">
        <div class="t">${label(x.n)}</div><div class="p">${money(x.P0)}</div>
        <div class="s">${x.n ? `명목 ${money(x.P)}` : "최대 매매가"}</div></button>`).join("")}</div>
      <p class="lim">${label(h.n)} 기준 · 자산 <b>${money(h.assets)}</b> + 대출 <b>${money(h.loan.amt)}</b>
        <span class="tag">${o.mode === "none" ? "대출 없이 계산" : o.mode === "custom" && h.loan.by === "희망 대출액" ? "희망 대출액만큼" : `${esc(h.loan.by)}에서 막힘`}</span> − 취득세·중개보수 <b>${money(h.cost)}</b>
        ${h.loan.amt ? `· 월 상환 약 <b>${Math.round(mpay).toLocaleString()}만 원</b> (금리 ${o.rate}%, ${o.term}년)` : ""}
        ${h.n ? `<br>${h.n}년 뒤 집값이 연 ${(hg * 100).toFixed(1)}% 오른다고 보고 <b>오늘 시세로 환산</b>한 가격(${money(h.P0)})으로 단지를 골랐습니다.` : ""}</p>
      ${topDong.length ? `<h3>이 가격대에서 거래가 가장 많은 동네 TOP3</h3>
        <div class="kpis">${topDong.map(([d, n], i) => `<div class="kpi"><div class="l">${i + 1}위</div><div class="v" style="font-size:1rem">${esc(d)}</div><div class="l">최근 6개월 ${n}건</div></div>`).join("")}</div>` : ""}
      ${rows.length ? `<h3>예산에 가장 가까운 단지 TOP ${Math.min(30, rows.length)}${big ? " (500세대 이상)" : ""}</h3>
      <table><tr><th>단지</th><th>위치</th><th class="r">전용</th><th class="r">최근 6개월 중위가</th>${h.n ? `<th class="r">${h.n}년 후 예상</th>` : ""}<th class="r">거래</th><th>최근 거래</th></tr>
      ${rows.slice(0, 30).map(r => `<tr><td>${esc(r.c.n)}<span class="tag">${r.c.y || "-"}년</span>${r.c.h ? `<span class="tag">${r.c.h.toLocaleString()}세대</span>` : ""}</td><td>${esc(r.c.g)} ${esc(r.c.d)}</td>
        <td class="r">${r.a}㎡</td><td class="r"><b>${money(r.med)}</b></td>${h.n ? `<td class="r">${money(r.med * (1 + hg) ** h.n)}</td>` : ""}<td class="r">${r.n}건</td>
        <td>${r.last[0].slice(2, 4)}.${r.last[0].slice(4, 6)} · ${r.last[3]}층 · ${money(r.last[2])}</td></tr>`).join("")}</table>`
        : `<p class="verdict na">최근 6개월 실거래 중 이 예산에 맞는 거래가 없습니다. 평형·지역·세대수 조건을 넓혀 보세요.</p>`}
      <div class="check"><b>착한언니 체크포인트</b><br>
        ${o.mode === "none" ? "· 대출 없이 현금(과 돌려받을 보증금)만으로 계산했어요. 대출을 쓰면 볼 수 있는 단지가 크게 늘어나요.<br>" : ""}
        · 대출 한도 = <b>LTV</b>(${o.first ? "생애최초 70%" : "40%"}) · <b>가격별 상한</b>(15억 이하 6억, 25억 이하 4억, 초과 2억) · <b>스트레스 DSR</b>(연소득 ${o.dsr}%, 금리 ${o.rate}%+가산 ${o.stress}%p) 중 가장 작은 값입니다. 2025.10.15 대책 기준이라 이후 바뀌었을 수 있어요. 은행 상담으로 꼭 확인하세요.<br>
        · DSR은 <b>세전 소득</b> 기준입니다. 실수령액을 넣으면 한도가 작게 나옵니다.<br>
        · N년 후 자산은 현금·보증금이 연 ${budgetState.ret}%로 불고, 매달 같은 금액을 모은다고 가정했습니다. 수익률은 보장되지 않습니다.<br>
        · 취득세는 1주택 기준(생애최초 감면 미반영). 중위가는 ${ymLabel(from)}~${ymLabel(lastYM())} 신고분이며 최근 1~2개월은 더 신고될 수 있습니다.</div>`;
    out.querySelectorAll(".hz").forEach(b => b.onclick = () => { budgetState.sel = +b.dataset.i; renderBudget(); });
  }

  // ======================================================
  // ② 첫 자취 동네 추천기
  // ======================================================
  const destSel = $("#dest-sel");
  for (const [grp, items] of Object.entries(DEST)) {
    const og = document.createElement("optgroup"); og.label = grp;
    for (const k of Object.keys(items)) og.appendChild(new Option(k, grp + "|" + k));
    destSel.appendChild(og);
  }
  const km = (a, b) => { const r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
  /** 대중교통 편도 시간 대략 추정: 도로 우회 1.3배, 평균 22km/h, 도보·대기 12분 */
  const commute = km => Math.round(12 + km * 1.3 / 22 * 60);
  const CONV = 0.05; // 보증금 → 월세 환산 연 5%
  const conv = (dep, mon) => mon + dep * CONV / 12;

  $("#f-rent").addEventListener("submit", e => {
    e.preventDefault();
    const out = $("#o-rent"); if (!needData(out, R, "전월세")) return;
    const f = e.target, [grp, dname] = f.dest.value.split("|"), dpos = DEST[grp][dname];
    const dep = +f.dep.value, mon = +f.mon.value, maxMin = +f.max.value, big = f.size.value === "2";
    const fit = r => (big ? r[2] > 33 : r[2] <= 33) && !r[6]; // 신규 계약만
    const res = Object.keys(GU).map(g => {
      const rows = (R.rows[g] || []).filter(fit), wolse = rows.filter(r => r[4] > 0), jeonse = rows.filter(r => r[4] === 0);
      const ok = rows.filter(r => r[3] <= dep && (r[4] > 0 ? r[4] <= mon : true));
      const dongs = {}; ok.forEach(r => dongs[r[0]] = (dongs[r[0]] || 0) + 1);
      return { g, min: commute(km(GU[g], dpos)), n: rows.length, ok: ok.length, share: rows.length ? ok.length / rows.length : 0,
        mDep: median(wolse.map(r => r[3])), mMon: median(wolse.map(r => r[4])), mConv: median(wolse.map(r => conv(r[3], r[4]))),
        mJeon: median(jeonse.map(r => r[3])), dongs: Object.entries(dongs).sort((a, b) => b[1] - a[1]).slice(0, 3) };
    });
    const near = res.filter(r => r.min <= maxMin && r.n >= 5).sort((a, b) => (b.share - a.share) || (a.mConv - b.mConv));
    const home = [...res].sort((a, b) => a.min - b.min)[0]; // 학교/직장이 있는 구
    const top = near.filter(r => r.ok > 0).slice(0, 3);

    out.innerHTML = `
      <div class="kpis">
        <div class="kpi"><div class="l">${esc(dname)} 바로 앞(${esc(home.g)}) 월세 중위</div><div class="v">${home.n ? `${money(home.mDep)} / ${Math.round(home.mMon)}만` : "표본 없음"}</div></div>
        <div class="kpi"><div class="l">내 조건</div><div class="v">${money(dep)} / ${mon}만</div></div>
        <div class="kpi"><div class="l">편도 ${maxMin}분 안의 구</div><div class="v">${near.length}곳</div></div>
      </div>
      ${top.length ? `<div class="verdict ok">추천: ${top.map(r => `${esc(r.g)}${r.dongs.length ? ` (${r.dongs.map(d => esc(d[0])).join("·")})` : ""}`).join(" → ")}</div>`
        : `<div class="verdict warn">편도 ${maxMin}분 안에서 이 조건에 맞는 최근 계약이 거의 없습니다. 보증금·월세·통근시간을 조금 늘려 보세요.</div>`}
      <h3>통근 가능한 동네 비교</h3>
      <table><tr><th>구</th><th class="r">통근(추정)</th><th class="r">조건 충족</th><th class="r">월세 중위 (보증금/월)</th><th class="r">환산 월세</th><th class="r">전세 중위</th><th>많이 나온 동</th></tr>
      ${near.map(r => `<tr class="${r.g === home.g ? "hl" : ""}"><td>${esc(r.g)}</td><td class="r">${r.min}분</td>
        <td class="r">${Math.round(r.share * 100)}% <span class="muted">(${r.ok}/${r.n})</span></td>
        <td class="r">${r.mMon ? `${money(r.mDep)} / ${Math.round(r.mMon)}만` : "-"}</td><td class="r">${r.mConv ? Math.round(r.mConv) + "만" : "-"}</td>
        <td class="r">${r.mJeon ? money(r.mJeon) : "-"}</td><td>${r.dongs.map(d => `${esc(d[0])}(${d[1]})`).join(", ") || "-"}</td></tr>`).join("")}</table>
      <div class="check"><b>착한언니 체크포인트</b><br>
        · 통근시간은 구청 위치 기준 <b>직선거리로 추정</b>한 값입니다. 실제 집 주소로 지도앱 경로를 꼭 확인하세요.<br>
        · 시세는 <b>오피스텔·아파트</b> 신규 전월세 신고분(${R.months.map(ymLabel)[0]}~${ymLabel(R.months[R.months.length - 1])})이며, 신고 대상이 아닌 다가구 원룸 시세와는 차이가 날 수 있습니다.<br>
        · 환산 월세 = 월세 + 보증금 × 연 5% ÷ 12. 보증금이 큰 집과 월세가 큰 집을 같은 기준으로 비교할 때 쓰세요.<br>
        · 계약 전 등기부등본(근저당), 전입신고·확정일자, 보증보험 가입 가능 여부를 반드시 확인하세요.</div>`;
  });

  // ======================================================
  // ③ 이 아파트, 비싸게 사는 걸까?
  // ======================================================
  const q = $("#apt-q"), sel = $("#apt-sel"), arSel = $("#ar-sel"), dl = $("#apt-list");
  const cxLabel = c => `${c.n} (${c.g} ${c.d}${c.y ? `, ${c.y}년` : ""})`;
  function fillAreas() {
    arSel.innerHTML = "";
    const c = T && T.complexes[+sel.value]; if (!c) return;
    const cnt = {}; c.t.forEach(t => cnt[area(t[1])] = (cnt[area(t[1])] || 0) + 1);
    Object.entries(cnt).sort((a, b) => a[0] - b[0]).forEach(([a, n]) => arSel.appendChild(new Option(`전용 ${a}㎡ (${n}건)`, a)));
    arSel.value = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0];
  }
  q.addEventListener("input", () => {
    if (!T) return;
    const s = q.value.replace(/\s/g, "");
    sel.innerHTML = ""; dl.innerHTML = "";
    if (s.length < 2) { sel.appendChild(new Option("두 글자 이상 입력하세요", "")); arSel.innerHTML = ""; return; }
    const hits = T.complexes.map((c, i) => [c, i]).filter(([c]) => c.n.replace(/\s/g, "").includes(s))
      .sort((a, b) => b[0].t.length - a[0].t.length).slice(0, 50);
    if (!hits.length) { sel.appendChild(new Option("검색 결과 없음", "")); arSel.innerHTML = ""; return; }
    hits.forEach(([c, i]) => { sel.appendChild(new Option(cxLabel(c), i)); dl.appendChild(new Option(c.n)); });
    fillAreas();
  });
  sel.addEventListener("change", fillAreas);

  $("#f-check").addEventListener("submit", e => {
    e.preventDefault();
    const out = $("#o-check"); if (!needData(out, T, "아파트 매매")) return;
    const c = T.complexes[+sel.value], A = +arSel.value, hope = +e.target.price.value * 10000;
    if (!c || !A) { out.innerHTML = `<p class="muted">단지와 면적을 선택해 주세요.</p>`; return; }
    if (!hope) { out.innerHTML = `<p class="muted">매수 희망 가격을 입력해 주세요.</p>`; return; }
    const same = c.t.filter(t => Math.abs(t[1] - A) <= 1.5);
    const r3 = same.filter(t => t[0].slice(0, 6) >= sinceYM(3)), r6 = same.filter(t => t[0].slice(0, 6) >= sinceYM(6));
    const base = r3.length >= 3 ? r3 : r6, baseLbl = r3.length >= 3 ? "최근 3개월" : "최근 6개월";
    const med = median(base.map(t => t[2]));
    const prices = same.map(t => t[2]), hi = Math.max(...prices), lo = Math.min(...prices);
    const rank = r6.length ? r6.filter(t => t[2] < hope).length / r6.length : null;
    const diff = med ? (hope / med - 1) * 100 : null;

    // 유사 단지: 같은 동(부족하면 같은 구), 비슷한 면적(±5㎡), 준공 ±7년, 최근 6개월
    const similar = scope => T.complexes.filter(o => o !== c && (scope === "d" ? o.g === c.g && o.d === c.d : o.g === c.g) && (!c.y || !o.y || Math.abs(o.y - c.y) <= 7))
      .map(o => { const ts = o.t.filter(t => Math.abs(t[1] - A) <= 5 && t[0].slice(0, 6) >= sinceYM(6));
        return ts.length ? { o, n: ts.length, med: median(ts.map(t => t[2])), ppm: median(ts.map(t => t[2] / t[1])) } : null; }).filter(Boolean);
    let sims = similar("d"), simScope = `${c.d}`; if (sims.length < 3) { sims = similar("g"); simScope = `${c.g}`; }
    sims.sort((a, b) => b.n - a.n); sims = sims.slice(0, 8);
    const simPpm = median(sims.map(s => s.ppm)), hopePpm = hope / A;

    // 월별 거래량 (단지 전체 면적)
    const vol = T.months.map(m => [m, c.t.filter(t => t[0].startsWith(m)).length]), vmax = Math.max(1, ...vol.map(v => v[1]));

    let cls = "na", msg = "같은 면적 최근 거래가 3건 미만이라 판단하기 어렵습니다(표본 적음). 유사 단지 비교를 참고하세요.";
    if (base.length >= 3 && diff != null) {
      if (diff <= -3) { cls = "ok"; msg = `${baseLbl} 중위가보다 ${pct(diff)} 낮아요. 싸게 나온 이유(층·향·수리 상태)를 확인해 보세요.`; }
      else if (diff <= 3) { cls = "ok"; msg = `${baseLbl} 중위가와 비슷한 시세 수준(${pct(diff)})이에요.`; }
      else if (diff <= 7) { cls = "warn"; msg = `${baseLbl} 중위가보다 ${pct(diff)} 높아요. 로열층·올수리라면 납득 가능한 범위입니다.`; }
      else { cls = "bad"; msg = `${baseLbl} 중위가보다 ${pct(diff)} 높아요. 비싸게 사는 신호일 수 있으니 협상 여지를 확인하세요.`; }
    }
    if (hope > hi && same.length) msg += ` 이 가격이면 최근 ${T.months.length}개월 최고가(${money(hi)})를 넘는 신고가입니다.`;

    out.innerHTML = `
      <div class="verdict ${cls}">${esc(c.n)} 전용 ${A}㎡ · 희망가 ${money(hope)} — ${msg}</div>
      <div class="kpis">
        <div class="kpi"><div class="l">${baseLbl} 중위가 (${base.length}건)</div><div class="v">${med ? money(med) : "-"}</div></div>
        <div class="kpi"><div class="l">${T.months.length}개월 최저 ~ 최고</div><div class="v" style="font-size:1rem">${same.length ? `${money(lo)} ~ ${money(hi)}` : "-"}</div></div>
        <div class="kpi"><div class="l">최근 6개월 거래 중 위치</div><div class="v">${rank == null ? "-" : `하위 ${Math.round(rank * 100)}%`}</div></div>
        <div class="kpi"><div class="l">㎡당 가격 (희망 / 유사단지)</div><div class="v" style="font-size:1rem">${Math.round(hopePpm).toLocaleString()} / ${simPpm ? Math.round(simPpm).toLocaleString() : "-"}만</div></div>
      </div>
      <h3>같은 면적 최근 거래</h3>
      <table><tr><th>계약일</th><th class="r">전용</th><th class="r">층</th><th class="r">거래가</th><th class="r">희망가 대비</th></tr>
      ${same.slice(-10).reverse().map(t => `<tr><td>${t[0].slice(0, 4)}.${t[0].slice(4, 6)}.${t[0].slice(6, 8)}${t[4] ? '<span class="tag">직거래</span>' : ""}</td>
        <td class="r">${t[1]}㎡</td><td class="r">${t[3]}층</td><td class="r">${money(t[2])}</td><td class="r">${pct((hope / t[2] - 1) * 100)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">거래 없음</td></tr>`}</table>
      <h3>월별 거래량 (단지 전체)</h3>
      <div class="bars">${vol.map(v => `<div style="height:${v[1] / vmax * 100}%" title="${ymLabel(v[0])}: ${v[1]}건"></div>`).join("")}</div>
      <div class="bars-l">${vol.map(v => `<span>${v[0].slice(4)}</span>`).join("")}</div>
      <h3>유사 단지 비교 (${esc(simScope)}, 전용 ${A}±5㎡, 최근 6개월)</h3>
      <table><tr><th>단지</th><th class="r">준공</th><th class="r">거래</th><th class="r">중위가</th><th class="r">㎡당</th></tr>
      <tr class="hl"><td>${esc(c.n)} (검토 단지)</td><td class="r">${c.y || "-"}</td><td class="r">${r6.length}</td><td class="r">${r6.length ? money(median(r6.map(t => t[2]))) : "-"}</td><td class="r">${r6.length ? Math.round(median(r6.map(t => t[2] / t[1]))).toLocaleString() + "만" : "-"}</td></tr>
      ${sims.map(s => `<tr><td>${esc(s.o.n)} <span class="muted">${esc(s.o.d)}</span></td><td class="r">${s.o.y || "-"}</td><td class="r">${s.n}</td><td class="r">${money(s.med)}</td><td class="r">${Math.round(s.ppm).toLocaleString()}만</td></tr>`).join("") || `<tr><td colspan="5" class="muted">비교할 단지가 없습니다</td></tr>`}</table>
      <div class="check"><b>착한언니 체크포인트</b><br>
        · 해제된 거래는 뺐고, <b>직거래</b>는 가족 간 거래 등으로 시세와 다를 수 있어 표시해 두었습니다.<br>
        · 같은 단지라도 층·향·동 위치·수리 상태에 따라 수천만 원 차이가 납니다. 저층 거래가 많으면 중위가가 낮게 보일 수 있어요.<br>
        · ${ymLabel(lastYM())} 등 최근 1~2개월은 신고 기한(30일) 때문에 거래가 더 늘어날 수 있습니다. 거래량이 급감했다면 매수자 우위 시장일 수 있어 협상 카드로 쓰세요.</div>`;
  });
})();
