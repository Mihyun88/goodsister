/* v2 미리보기: 홈 · 내집마련 진단 리포트 · 청약 · 뉴스
   계산은 기존 도구와 같은 규칙(10.15 대책 LTV·가격별 상한·스트레스 DSR, GS_COST.buyTotal)을 씀. 입력값은 폰에만 저장. */
(() => {
  const $ = s => document.querySelector(s), main = $("#main");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } } };
  const toast = t => { const el = document.createElement("div"); el.className = "toast"; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 2200); };
  const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const money = v => { v = Math.round(v); if (!v) return "0원"; const e = Math.floor(v / 10000), r = v % 10000; return (e ? `${e}억` : "") + (r ? `${e ? " " : ""}${r.toLocaleString()}만` : "") + " 원"; };
  const short = v => { v = Math.round(v); const e = Math.floor(v / 10000), r = v % 10000; if (!e) return `${v.toLocaleString()}만`; if (!r) return `${e}억`; return r % 1000 === 0 ? `${e}억 ${r / 1000}천` : `${e}억 ${r.toLocaleString()}만`; };
  const han = v => (+v ? `= ${money(+v)}` : "");
  const ymL = ym => `${ym.slice(0, 4)}.${ym.slice(4, 6)}`;
  const KAKAO = "https://pf.kakao.com/_xcxoBxnX";
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  let TR = null; const trades = async () => TR || (TR = window.GS_TRADES || (await loadScript("../tools/data/trades.js"), window.GS_TRADES));
  let APPLY = null; const apply = async () => APPLY || (APPLY = await (await fetch("../tools/data/apply.json")).json());

  // ---------- 계산 규칙 (tools/app.js 와 같음) ----------
  const RATE = window.GS_RATE ? Math.round(window.GS_RATE.mortgage * 10) / 10 : 4.5, STRESS = 3, TERM = 30, DSR = 40, RET = 0.03, IG = 0.03, HG = 0.03;
  const principal = (m, r, y) => { const i = r / 1200, n = y * 12; return m <= 0 ? 0 : i ? m * (1 - (1 + i) ** -n) / i : m * n; };
  const payment = (L, r, y) => { const i = r / 1200, n = y * 12; return i ? L * i / (1 - (1 + i) ** -n) : L / n; };
  const buyCost = (p, o) => window.GS_COST.buyTotal(p, { relief: o.first ? "first" : "", area: o.band === "l" ? 100 : 84 });
  function loanParts(p, o, income) {
    const eok = p / 10000, cap = eok <= 15 ? 60000 : eok <= 25 ? 40000 : 20000, ltv = p * (o.first ? 0.7 : 0.4);
    const dsr = principal((income * DSR / 100 - o.debt) / 12, RATE + STRESS, TERM);
    const parts = { "LTV": ltv, "가격별 상한": cap, "스트레스 DSR": Math.max(0, dsr) };
    const [by, amt] = Object.entries(parts).sort((a, b) => a[1] - b[1])[0];
    return { amt: Math.max(0, Math.min(amt, p)), by, parts };
  }
  function solve(assets, o, income) {
    let lo = 0, hi = 1000000;
    for (let i = 0; i < 60; i++) { const p = (lo + hi) / 2; if (p + buyCost(p, o).total <= assets + loanParts(p, o, income).amt) lo = p; else hi = p; }
    return { P: lo, loan: loanParts(lo, o, income), cost: buyCost(lo, o) };
  }

  // ---------- 라우팅 ----------
  const routes = { home, report, apply: applyPage, news, tools: toolsPage };
  function route() {
    const r = (location.hash.slice(1).split("?")[0]) || "home";
    (routes[r] || home)();
    document.querySelectorAll(".tabbar a").forEach(a => a.classList.toggle("on", a.dataset.t === (r === "report" ? "home" : r)));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  // ---------- 도구 모음 (기존 /tools/ 를 같은 메뉴 안으로) ----------
  function toolsPage() {
    const T = (href, i, t, d) => `<a class="trow" href="${href}"><span class="e"><i class='ic' data-i='${i}'></i></span><span><b>${t}</b><small>${d}</small></span><span class="arr">›</span></a>`;
    main.innerHTML = `<h1>도구</h1><p class="lead">숫자로 먼저 확인하고, 필요할 때 착한언니에게 물어보세요.</p>
      <p class="sec">계산하기</p><div class="tgrp">
        ${T("#report", "report", "내 상황 진단 리포트", "예산·대출·잔금·볼 만한 단지·청약까지 한 장으로")}
        ${T("/tools/#budget", "wallet", "예산으로 단지 찾기", "현금·소득으로 지금, 1·3·5년 뒤 살 수 있는 단지")}
        ${T("/tools/#rent", "train", "자취 동네 찾기", "학교·직장 통근 시간과 실제 월세로 동네 비교")}
        ${T("/tools/#cost", "receipt", "세금·복비 계산", "취득세·등기비용·중개보수·전세보증보험")}</div>
      <p class="sec">확인하기</p><div class="tgrp">
        ${T("/apt/", "building", "단지·오피스텔 시세", "면적별 매매·전세·월세 실거래 · 가격 검토도 여기서")}
        ${T("/check/?t=imjang", "check", "임장 체크리스트", "단지 보러 갈 때 · 별점·메모로 비교")}
        ${T("/check/?t=jangeum", "calendar", "잔금 30일 체크리스트", "잔금일 넣으면 캘린더에 한 번에")}
        ${T("/check/?t=jachwi", "key", "자취방 계약 체크리스트", "계약 전·당일·입주 후")}</div>
      <p class="sec">읽어보기</p><div class="tgrp">
        ${T("/tools/#market", "chart", "서울 시황 자세히", "구별 변동률·수급지수·거래 많은 단지")}
        ${T("/tools/#timeline", "calendar", "세금 타임라인", "정부별 부동산 세금 변화")}
        ${T("/tools/#jachwi", "home", "첫 자취방 가이드", "방 구하기부터 입주까지")}
        ${T("/tools/#tips", "bulb", "부동산 꿀팁", "현장에서 매일 받는 질문 정리")}
        ${T("/guide/jangeum/", "doc", "잔금 가이드", "잔금날까지 뭐부터 해야 하지?")}</div>
      <p class="why" style="margin-top:14px">가격 검토는 단지 시세 화면으로, 정책 뉴스는 뉴스·시황 탭으로 합쳤어요.</p>`;
  }

  // ---------- 홈 ----------
  function home() {
    const last = store.get("gs_report", null), M = window.GS_MARKET;
    let mk = "";
    if (M) { const s = M.series.sale["서울"], ch = (s[s.length - 1] / s[s.length - 2] - 1) * 100;
      const up = Object.keys(M.series.sale).filter(k => /구$/.test(k)).filter(k => { const x = M.series.sale[k]; return x[x.length - 1] > x[x.length - 2]; }).length;
      mk = `<a class="mkline" href="#news"><span><i class='ic' data-i='chart'></i>이번 주 서울 아파트 <small style="color:var(--mut)">${M.dates[M.dates.length - 1].slice(5).replace("-", ".")} 기준</small></span><span><b class="${ch >= 0 ? "up" : "dn"}">${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%</b> · ${up}개 구 상승 ›</span></a>`; }
    const saved = store.get("gs_lead_saved", []), watch = store.get("gs_watch", []);
    const KN = { offi: "신촌 월세 조건", rent: "전월세 조건", buy: "매수 조건", owner: "임대 내놓기 조건", gg: "경기 매수 조건" };
    main.innerHTML = `<h1 class="h0">서울·경기 실거래가,<br><em>어디가 궁금하세요?</em></h1>
      <form class="hsearch" role="search" action="../apt/" method="get"><i class='ic' data-i='search'></i><input name="q" type="search" placeholder="단지명·동네 (예: 아현동)" aria-label="단지명·동네 검색" autocomplete="off" required><button type="submit">검색</button></form>
      ${saved[0] ? `<button type="button" class="resume" id="resume"><i class='ic' data-i='clock'></i><span><b>${KN[saved[0].kind] || "저장한 조건"} 이어보기</b>${saved[0].cx ? ` · ${esc(saved[0].cx.name)}` : ""}</span><span>›</span></button>` : ""}
      ${watch.length ? `<a class="resume" href="../apt/?id=${encodeURIComponent(watch[0].id)}&s=${watch[0].s}&a=${watch[0].a}"><i class='ic' data-i='star'></i><span><b>관심 단지 ${watch.length}곳</b> · ${esc(watch[0].n || "")} 새 거래 확인</span><span>›</span></a>` : ""}
      <div class="tiles">
        <a class="tile" href="../apt/"><span class="ti"><i class='ic' data-i='building'></i></span><b>아파트 시세</b><small>서울·경기</small></a>
        <a class="tile" href="#home?rk=offi" data-rk="offi"><span class="ti"><i class='ic' data-i='key'></i></span><b>신촌·이대 오피스텔</b><small>건물별 월세</small></a>
        <a class="tile" href="../tools/#rent"><span class="ti"><i class='ic' data-i='train'></i></span><b>원룸·빌라 동네</b><small>통근 + 실제 월세</small></a>
        <a class="tile" href="#apply"><span class="ti"><i class='ic' data-i='ticket'></i></span><b>청약</b><small>분양가 vs 주변 시세</small></a>
      </div>
      <div class="tcards">
        <button type="button" class="tcard" data-g="buy"><span class="tg">내 예산</span><b>얼마짜리 집까지 살 수 있을까?</b><small>질문 7개로 예산·대출·볼 만한 단지까지</small><span class="arr">›</span></button>
        <button type="button" class="tcard" data-g="owner"><span class="tg dk">집 내놓기</span><b>우리 집, 얼마에 내놓을까?</b><small>같은 건물 최근 계약 보고 같이 정해요</small><span class="arr">›</span></button>
        <button type="button" class="tcard" id="offi"><span class="tg">방 구하기</span><b>신촌·이대 오피스텔 찾기</b><small>입주일·월세+관리비·주차 기준으로 찾아요</small><span class="arr">›</span></button>
        <button type="button" class="tcard" data-g="rent"><span class="tg lt">전월세</span><b>아파트 전세·월세 구하기</b><small>입주 3개월 안이면 매물 확인해 드려요</small><span class="arr">›</span></button>
      </div>
      ${last && !last.sample ? `<a class="recent" href="#report"><span><i class='ic' data-i='report'></i>지난번 진단: <b>현금 ${short(last.cash)} → 예상 상한 ${short(last.P)}</b></span><span>›</span></a>` : ""}
      <div class="secrow"><p class="sec" style="margin:0">도구</p><a href="#tools">전체보기 ›</a></div>
      <div class="ttiles">
        <a href="#report"><span><i class='ic' data-i='report'></i></span>진단<br>리포트</a>
        <a href="../check/?t=imjang"><span><i class='ic' data-i='check'></i></span>임장<br>체크</a>
        <a href="../check/?t=jangeum"><span><i class='ic' data-i='calendar'></i></span>잔금<br>30일</a>
        <a href="../tools/#cost"><span><i class='ic' data-i='receipt'></i></span>세금·<br>복비</a>
      </div>
      <section class="rank" id="rank"><div class="secrow"><p class="sec" style="margin:0">착한언니 동네 순위</p></div><div id="rkbox"><p class="empty">불러오는 중…</p></div></section>
      ${mk}
      <section class="why2">
        <p class="q1">“부동산이 이런 것까지 해줘요?”</p>
        <p class="q2">착한언니가 손님들께 자주 듣는 말이에요.</p>
        <h2>그래서 상담할 때 매번 해드리던 계산을<br><em>누구나 쓸 수 있게</em> 열어뒀어요</h2>
        <p class="body">집 사라는 말은 많은데, 뭐부터 봐야 하는지 알려주는 곳은 드물어요. 부동산 강의 30만 원, 100만 원 안 들어도 되게, <b>내 동생한테 알려준다는 마음</b>으로 만들었어요.</p>
        <div class="four"><b>12년 동안 계약 전에 꼭 확인해온 네 가지</b>
          <ol><li><strong>등기부등본, 잔금날 아침에 한 번 더</strong> 계약 때 깨끗했던 등기부가 잔금날까지 깨끗하다는 보장은 없어요.</li>
          <li><strong>전입신고 · 보증보험 가능 여부</strong> 대출·보증보험이 안 되는 집은 보러 가기 전에 먼저 걸러요.</li>
          <li><strong>내 상황에 맞는 특약</strong> 수리 약속, 보증금 반환, 근저당 말소처럼 꼭 필요한 특약을 넣어요.</li>
          <li><strong>밤길까지 생각한 동네 추천</strong> 낮 2시 골목이 아니라 밤 11시에 걷는 길을 기준으로 봐요.</li></ol></div>
        <p class="body" style="margin-top:14px">이 사이트의 숫자는 시작일 뿐이에요. 계약서 한 줄, 등기부 한 장까지 같이 보는 것, 그게 착한언니가 하는 일이에요.</p>
        <div class="team2">${[["1", "신혜선", "대표 공인중개사"], ["3", "신수경", "대표 공인중개사"], ["2", "신수진", "공인중개사"], ["4", "윤미현", "공인중개사"]].map(([i, n, r]) => `<figure><img src="../tools/img/team-${i}.jpg" width="640" height="800" alt="${n} ${r}" loading="lazy" decoding="async"><figcaption><b>${n}</b>${r}</figcaption></figure>`).join("")}</div>
        <p class="sign">카톡 너머에는 이 네 사람이 있어요. 첫 문의부터 잔금날까지 직접 답하고 챙겨요.</p>
        <div class="office"><p><b>신촌자이엘라부동산</b> 대표 신수경 · 등록번호 11410-2019-00062 · 서대문구 대현동</p><p><b>마포그랑자이(착한언니)부동산</b> 대표 신혜선 · 등록번호 11440-2022-00085 · 마포구 대흥동</p></div>
        <a class="more2" href="../#about">착한언니 이야기 더 보기 ›</a>
      </section>`;
    $("#offi").onclick = () => GS_lead.open({ kind: "offi" });
    main.querySelectorAll("[data-g]").forEach(b => b.onclick = () => {
      const g = b.dataset.g;
      if (g === "buy") location.hash = "#report";
      else if (g === "rent") GS_lead.open({ kind: "rent" });
      else GS_lead.open({ kind: "owner", hint: "우리 집을 단지 시세에서 찾으면 같은 면적 최근 계약을 보면서 정할 수 있어요" });
    });
    $("#resume") && ($("#resume").onclick = () => GS_lead.open({ kind: saved[0].kind, cx: saved[0].cx || undefined }));
    main.querySelector("[data-rk]").onclick = e => { e.preventDefault(); RK.t = "offi"; rankDraw(); $("#rank").scrollIntoView({ behavior: "smooth" }); };
    rankDraw();
  }

  // ---------- 순위표: 마포·서대문 아파트 / 신촌 오피스텔 / 서울 구별 주간 ----------
  const RK = { t: "apt", d: "m", s: "n" }, CXD = {};
  const cxFile = async s => CXD[s] || (CXD[s] = await (await fetch(`../tools/data/cx/${s}.json`)).json());
  async function rankDraw() {
    const box = $("#rkbox"); if (!box) return;
    const T = [["apt", "마포·서대문 아파트"], ["offi", "신촌 오피스텔"], ["seoul", "서울 구별"]];
    const D = RK.t === "seoul" ? [["sale", "매매"], ["jeonse", "전세"]] : RK.t === "offi" ? [["w", "월세"], ["j", "전세"]] : [["m", "매매"], ["j", "전세"], ["w", "월세"]];
    if (!D.some(x => x[0] === RK.d)) RK.d = D[0][0];
    const S = RK.t === "seoul" ? [["up", "많이 오른 순"], ["dn", "많이 내린 순"]] : [["n", "거래 많은 순"], ["p", RK.d === "w" ? "월세 낮은 순" : "가격 높은 순"]];
    if (!S.some(x => x[0] === RK.s)) RK.s = S[0][0];
    let rows = [], note = "";
    try {
      if (RK.t === "seoul") {
        const M = window.GS_MARKET, ser = M.series[RK.d];
        rows = Object.keys(ser).filter(k => /구$/.test(k)).map(k => { const x = ser[k]; return { n: k, v: (x[x.length - 1] / x[x.length - 2] - 1) * 100 }; })
          .sort((a, b) => RK.s === "up" ? b.v - a.v : a.v - b.v).slice(0, 6)
          .map(r => ({ name: r.n, sub: "주간 변동", val: `${r.v >= 0 ? "+" : ""}${r.v.toFixed(2)}%`, cls: r.v >= 0 ? "up" : "dn", tag: ["마포구", "서대문구"].includes(r.n) ? "착한언니 동네" : "" }));
        note = `한국부동산원 주간 아파트가격 · ${M.dates[M.dates.length - 1]} 기준`;
      } else {
        const files = RK.t === "offi" ? ["o11410", "o11440"] : ["11410", "11440"];
        const F = await Promise.all(files.map(cxFile));
        const cut = (() => { const e = F[0].tm[1]; let y = +e.slice(0, 4), m = +e.slice(4) - 5; while (m < 1) { m += 12; y--; } return `${y}${String(m).padStart(2, "0")}01`; })();
        const all = [];
        const SINCHON = /^(창천동|대현동|대신동|신촌동|봉원동|북아현동|충정로2가|충정로3가|합동|미근동|냉천동|연희동|노고산동|신수동|대흥동|염리동|아현동|공덕동|신공덕동|창전동|서교동|동교동|상수동|도화동|용강동)$/;
        F.forEach(f => Object.entries(f.cx).forEach(([id, c]) => {
          if (RK.t === "offi" && !SINCHON.test(c.d)) return;
          const L = RK.d === "m" ? c.t.filter(x => x[0] >= cut) : c.r.filter(x => x[0] >= cut && (RK.d === "w" ? x[3] > 0 : x[3] === 0));
          if (L.length < 3) return;
          const byA = {}; L.forEach(x => (byA[Math.floor(x[1])] ||= []).push(x));
          const [ar, xs] = Object.entries(byA).sort((a, b) => b[1].length - a[1].length)[0];
          const v = RK.d === "w" ? median(xs.map(x => x[3])) : median(xs.map(x => x[2])), dep = RK.d === "w" ? median(xs.map(x => x[2])) : 0;
          all.push({ id, s: f.sgg, a: ar, c, n: L.length, v, dep, gu: f.name.split(" ")[1] });
        }));
        all.sort((a, b) => RK.s === "n" ? b.n - a.n : RK.d === "w" ? a.v - b.v : b.v - a.v);
        rows = all.slice(0, 6).map(r => ({ name: r.c.n, sub: `${r.gu} ${r.c.d} · 전용 ${r.a}㎡ 기준`, val: RK.d === "w" ? `월 ${Math.round(r.v)}만` : short(r.v), val2: RK.d === "w" ? `보증금 ${short(r.dep)}` : "", n: r.n,
          href: `../apt/?id=${encodeURIComponent(r.id)}&s=${r.s}&a=${r.a}`, tag: RK.d === "m" ? "매매" : RK.d === "j" ? "전세" : "월세" }));
        note = `${RK.t === "offi" ? "신촌·이대·아현·공덕·홍대 일대 · " : ""}국토교통부 실거래 · 최근 6개월 ${RK.d === "m" ? "매매" : RK.d === "j" ? "전세" : "월세"} 3건 이상 · 가장 거래 많은 면적의 중간값`;
      }
    } catch (e) { box.innerHTML = `<p class="empty">순위를 불러오지 못했어요.</p>`; return; }
    box.innerHTML = `<div class="rtab">${T.map(([k, t]) => `<button type="button" data-t="${k}" class="${RK.t === k ? "on" : ""}">${t}</button>`).join("")}</div>
      <div class="rfil"><div class="rseg">${D.map(([k, t]) => `<button type="button" data-d="${k}" class="${RK.d === k ? "on" : ""}">${t}</button>`).join("")}</div>
        <div class="rsort">${S.map(([k, t]) => `<button type="button" data-s="${k}" class="${RK.s === k ? "on" : ""}">${t}</button>`).join("")}</div></div>
      <ol class="rlist">${rows.map((r, i) => `<li>${r.href ? `<a href="${r.href}">` : "<div>"}<span class="rn">${i + 1}</span><span class="rm"><b>${esc(r.name)}</b><small>${r.tag ? `<em class="rt">${esc(r.tag)}</em>` : ""}${esc(r.sub)}${r.n ? ` · ${r.n}건` : ""}</small></span><span class="rv ${r.cls || ""}">${r.val}${r.val2 ? `<small>${r.val2}</small>` : ""}</span>${r.href ? "</a>" : "</div>"}</li>`).join("") || `<li><div>해당하는 거래가 없어요</div></li>`}</ol>
      <p class="why" style="margin-top:8px">${note}</p>`;
    box.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { RK.t = b.dataset.t; RK.d = ""; RK.s = ""; rankDraw(); });
    box.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { RK.d = b.dataset.d; rankDraw(); });
    box.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { RK.s = b.dataset.s; rankDraw(); });
  }

  // ---------- 진단 리포트: 7단계 입력 ----------
  const GUS = ["종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구"];
  const STEPS = [
    { k: "cash", t: "STEP 1 · 지금 가진 돈", h: "지금 바로 쓸 수 있는<br><em>현금</em>은 얼마예요?", type: "money", label: "현금·예금·주식 등 (만 원)", quick: [1000, 5000, 10000], hint: "부모님 지원금처럼 확실히 받을 돈도 넣어요." },
    { k: "dep", t: "STEP 2 · 돌려받을 보증금", h: "지금 사는 집 <em>보증금</em>,<br>돌려받을 게 있나요?", type: "money", label: "전세·월세 보증금 (만 원)", quick: [1000, 5000, 10000], hint: "없으면 0으로 두고 다음으로 넘어가요.", opt: true },
    { k: "inc", t: "STEP 3 · 소득", h: "부부 합산 <em>세전 연소득</em>은요?", type: "money", label: "세전 연소득 (만 원)", quick: [500, 1000, 3000], hint: "대출 한도(DSR)는 세전 소득으로 계산해요. 실수령액을 넣으면 한도가 작게 나와요.",
      extra: { k: "debt", label: "이미 갚고 있는 대출 (연 원리금, 만 원)", ph: "없으면 0" } },
    { k: "save", t: "STEP 4 · 저축", h: "한 달에 <em>얼마씩 모을 수</em> 있어요?", type: "money", label: "월 저축 (만 원)", quick: [10, 50, 100], hint: "1·3·5년 뒤 예산을 계산할 때만 써요.", opt: true },
    { k: "band", t: "STEP 5 · 원하는 집", h: "어떤 <em>평수</em>를 찾으세요?", type: "chips", o: [["s", "60㎡ 이하 (~24평)"], ["m", "60~85㎡ (25~34평)"], ["l", "85㎡ 초과"]],
      chips2: { k: "gus", label: "희망 지역 (여러 개, 비우면 서울 전체)", o: GUS } },
    { k: "first", t: "STEP 6 · 청약·감면 자격", h: "<em>집을 사본 적</em>이 있나요?", type: "chips", o: [["1", "한 번도 없어요 (생애최초)"], ["0", "있어요"]],
      nums: [{ k: "homeless", label: "무주택 기간 (년)", ph: "예: 4" }, { k: "fam", label: "부양가족 (명, 본인 제외)", ph: "예: 1" }, { k: "acct", label: "청약통장 가입 (년)", ph: "예: 3" }] },
    { k: "when", t: "STEP 7 · 시기", h: "언제쯤 <em>살 계획</em>이에요?", type: "chips", o: [["3", "3개월 안"], ["6", "6개월 안"], ["12", "1년 안"], ["99", "아직 몰라요"]] },
  ];
  const DEFAULT = { cash: "", dep: "0", inc: "", debt: "0", save: "100", band: "m", gus: [], first: "1", homeless: "", fam: "", acct: "", when: "" };
  const EXAMPLE = { cash: "30000", dep: "0", inc: "6000", debt: "0", save: "150", band: "m", gus: [], first: "1", homeless: "4", fam: "1", acct: "3", when: "6" };
  let A = null, step = 0;

  function report() {
    const p = new URLSearchParams(location.hash.split("?")[1] || "");
    if (p.get("s")) { try { A = JSON.parse(decodeURIComponent(escape(atob(p.get("s"))))); return result(); } catch (e) { /* 무시 */ } }
    const last = store.get("gs_report", null);
    if (last && last.A && !A) { A = last.A; return result(); }
    A = A || { ...DEFAULT }; step = 0; ask();
  }
  function ask() {
    const S = STEPS[step];
    const ok = () => S.opt || (S.type === "money" ? +A[S.k] > 0 : !!A[S.k]);
    main.innerHTML = `<div class="stepbar">${STEPS.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
      <p class="stepn">${S.t}</p><h1>${S.h}</h1>
      ${S.type === "money" ? `<div class="bin"><label>${S.label}</label><div class="num"><input id="v" type="number" inputmode="numeric" min="0" value="${esc(A[S.k])}" placeholder="0"><span>만 원</span></div>
        <p class="han" id="hn">${han(A[S.k])}</p><div class="quick2">${S.quick.map(q => `<button type="button" data-q="${q}">+${short(q)}</button>`).join("")}<button type="button" data-q="0">지우기</button></div>
        ${S.hint ? `<small class="h"><i class='ic' data-i='bulb'></i>${S.hint}</small>` : ""}</div>` : ""}
      ${S.extra ? `<div class="bin"><label>${S.extra.label}</label><div class="num"><input id="x" type="number" inputmode="numeric" min="0" value="${esc(A[S.extra.k])}" placeholder="${S.extra.ph}"><span>만 원</span></div></div>` : ""}
      ${S.type === "chips" ? `<div class="bin"><div class="opts" id="o">${S.o.map(([v, t]) => `<button type="button" data-v="${v}" class="${A[S.k] === v ? "on" : ""}">${t}</button>`).join("")}</div></div>` : ""}
      ${S.chips2 ? `<div class="bin"><label>${S.chips2.label}</label><div class="opts" id="o2">${S.chips2.o.map(g => `<button type="button" class="${A.gus.includes(g) ? "on" : ""}">${g}</button>`).join("")}</div></div>` : ""}
      ${S.nums ? `<div class="bin"><label>청약 가점 계산용 <small style="font-weight:400;color:var(--mut)">(모르면 비워두세요)</small></label>${S.nums.map(n => `<div style="margin-top:10px"><small class="h" style="margin:0">${n.label}</small><div class="num"><input data-n="${n.k}" type="number" inputmode="decimal" min="0" value="${esc(A[n.k])}" placeholder="${n.ph}"></div></div>`).join("")}</div>` : ""}
      ${step === 0 ? `<p class="ex2">처음이라 막막하면 <button type="button" id="ex">예시(현금 3억·맞벌이 6천)로 먼저 보기</button></p>` : ""}
      <div class="navbtn">${step ? `<button type="button" class="g" id="prev">이전</button>` : ""}<button type="button" id="next" ${ok() ? "" : "disabled"}>${step === STEPS.length - 1 ? "리포트 보기" : "다음"}</button></div>`;
    const sync = () => { $("#next").disabled = !ok(); };
    const v = $("#v"); if (v) { v.oninput = () => { A[S.k] = v.value; $("#hn").textContent = han(v.value); sync(); }; v.focus(); }
    main.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { A[S.k] = b.dataset.q === "0" ? "" : String((+A[S.k] || 0) + +b.dataset.q); v.value = A[S.k]; $("#hn").textContent = han(A[S.k]); sync(); });
    const x = $("#x"); if (x) x.oninput = () => { A[S.extra.k] = x.value; };
    main.querySelectorAll("#o button").forEach(b => b.onclick = () => { A[S.k] = b.dataset.v; main.querySelectorAll("#o button").forEach(y => y.classList.toggle("on", y === b)); sync(); });
    main.querySelectorAll("#o2 button").forEach(b => b.onclick = () => { const g = b.textContent; A.gus = A.gus.includes(g) ? A.gus.filter(y => y !== g) : [...A.gus, g]; b.classList.toggle("on"); });
    main.querySelectorAll("[data-n]").forEach(i => i.oninput = () => { A[i.dataset.n] = i.value; });
    $("#prev") && ($("#prev").onclick = () => { step--; ask(); });
    $("#next").onclick = () => { if (step < STEPS.length - 1) { step++; ask(); window.scrollTo(0, 0); } else result(); };
    $("#ex") && ($("#ex").onclick = () => { A = { ...EXAMPLE, _sample: 1 }; result(); });
  }

  // 청약 가점 (주택공급에 관한 규칙 별표1): 무주택 32 + 부양가족 35 + 통장 17 = 84
  function gajeom(a) {
    if (a.homeless === "" && a.fam === "" && a.acct === "") return null;
    const h = a.first === "0" && !+a.homeless ? 0 : Math.min(32, 2 * (Math.floor(+a.homeless || 0) + 1));
    const f = Math.min(35, 5 + 5 * Math.floor(+a.fam || 0));
    const y = +a.acct || 0, c = y < 0.5 ? 1 : y < 1 ? 2 : Math.min(17, Math.floor(y) + 2);
    return { h, f, c, sum: h + f + c };
  }

  async function result() {
    main.innerHTML = `<p class="empty">리포트를 만드는 중이에요…</p>`;
    const T = await trades().catch(() => null);
    const o = { first: A.first === "1", band: A.band, debt: +A.debt || 0 };
    const start = (+A.cash || 0) + (+A.dep || 0), save = +A.save || 0, inc = +A.inc || 0;
    const hz = [0, 1, 3, 5].map(n => { const assets = start * (1 + RET) ** n + save * 12 * (((1 + RET) ** n - 1) / RET || n); const s = solve(assets, o, inc * (1 + IG) ** n); return { n, assets, ...s, P0: s.P / (1 + HG) ** n }; });
    const h = hz[0], cost = h.cost, need = h.P - h.loan.amt + cost.total, left = start - need;
    const pay = payment(h.loan.amt, RATE, TERM), payR = inc ? pay / (inc / 12) * 100 : 0;
    const safe = left < 1000 ? solve(start - 1000, o, inc).P : null;
    // 볼 만한 단지: ① 조건에 맞는 곳 ② 면적을 한 단계 조정하면 ③ 옆 동네
    const NB = { 종로구: ["중구", "서대문구", "성북구", "은평구", "동대문구"], 중구: ["종로구", "용산구", "성동구", "서대문구"], 용산구: ["중구", "마포구", "성동구", "동작구", "서초구"], 성동구: ["중구", "광진구", "동대문구", "용산구", "강남구"], 광진구: ["성동구", "동대문구", "중랑구", "송파구", "강동구"], 동대문구: ["성북구", "중랑구", "성동구", "종로구", "광진구"], 중랑구: ["동대문구", "노원구", "광진구", "성북구"], 성북구: ["종로구", "동대문구", "강북구", "노원구", "중랑구"], 강북구: ["성북구", "도봉구", "노원구"], 도봉구: ["강북구", "노원구"], 노원구: ["도봉구", "강북구", "성북구", "중랑구"], 은평구: ["서대문구", "마포구", "종로구"], 서대문구: ["마포구", "은평구", "종로구", "중구"], 마포구: ["서대문구", "용산구", "영등포구", "은평구"], 양천구: ["강서구", "영등포구", "구로구"], 강서구: ["양천구", "영등포구"], 구로구: ["양천구", "영등포구", "금천구", "관악구"], 금천구: ["구로구", "관악구", "영등포구"], 영등포구: ["마포구", "양천구", "구로구", "동작구", "강서구"], 동작구: ["영등포구", "관악구", "용산구", "서초구"], 관악구: ["동작구", "금천구", "서초구", "구로구"], 서초구: ["강남구", "동작구", "관악구", "용산구"], 강남구: ["서초구", "송파구", "성동구"], 송파구: ["강남구", "강동구", "광진구"], 강동구: ["송파구", "광진구"] };
    const BANDN = { s: "60㎡ 이하", m: "60~85㎡", l: "85㎡ 초과" }, ALT = { s: "m", m: "s", l: "m" };
    let rows = [], alt = [], near = [], home = [], dongs = [];
    const P = safe || h.P;
    if (T) {
      const lastYM = T.months[T.months.length - 1]; let y = +lastYM.slice(0, 4), m = +lastYM.slice(4) - 5; while (m < 1) { m += 12; y--; } const from = `${y}${String(m).padStart(2, "0")}`;
      const inB = (bd, a) => bd === "s" ? a <= 60 : bd === "m" ? a > 60 && a <= 85 : a > 85;
      const nbs = [...new Set(A.gus.flatMap(g => NB[g] || []))].filter(g => !A.gus.includes(g));
      for (const c of T.complexes) {
        const by = {};
        for (const t of c.t) if (t[0].slice(0, 6) >= from) { const bd = inB("s", t[1]) ? "s" : inB("m", t[1]) ? "m" : "l"; (by[bd + Math.floor(t[1])] ||= []).push(t); }
        for (const [k, ts] of Object.entries(by)) {
          const bd = k[0], md = median(ts.map(t => t[2])); if (md > P) continue;
          const r = { c, a: +k.slice(1), med: md, n: ts.length, last: ts[ts.length - 1][0] };
          const inGu = !A.gus.length || A.gus.includes(c.g);
          if (bd === A.band && inGu) rows.push(r);
          else if (bd === ALT[A.band] && inGu) alt.push(r);
          if (bd === A.band && nbs.includes(c.g)) near.push(r);
          if (bd === A.band && (c.g === "마포구" || c.g === "서대문구")) home.push(r);
        }
      }
      // 예산에 가깝고(80% 이상) 비교 거래가 많은 순
      const rank = L => L.filter(r => r.med >= P * 0.8).sort((a, b) => b.n - a.n || b.med - a.med).concat(L.filter(r => r.med < P * 0.8).sort((a, b) => b.med - a.med));
      rows = rank(rows); alt = rank(alt); near = rank(near); home = rank(home);
      const dm = {}; rows.filter(r => r.med >= P * 0.8).forEach(r => { const k = `${r.c.g} ${r.c.d}`; dm[k] = (dm[k] || 0) + r.n; }); dongs = Object.entries(dm).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }
    const cand = (L, k) => L.slice(0, 3).map((r, i) => `<label class="cand"><input type="checkbox" data-c="${k}${i}" data-n="${esc(r.c.n)} ${r.a}㎡"><span><b>${esc(r.c.n)}</b><small>${esc(r.c.g)} ${esc(r.c.d)} · 전용 ${r.a}㎡${r.c.y ? ` · ${r.c.y}년` : ""}</small><small>비교 거래 <b>${r.n}건</b> · 최근 계약 ${r.last.slice(2, 4)}.${r.last.slice(4, 6)}.${r.last.slice(6, 8)}${r.n < 3 ? " · 건수가 적어 참고만" : ""}</small></span><span class="cp">${short(r.med)}<a href="../apt/?q=${encodeURIComponent(r.c.n)}">시세 ›</a></span></label>`).join("");
    const G = gajeom(A);
    let ap = null; try { ap = await apply(); } catch (e) { /* 청약 데이터 없음 */ }
    const today = new Date().toISOString().slice(0, 10);
    const openAp = ap ? ap.items.filter(x => x.rcpt[1] >= today && x.types.length && x.types.some(t => t.top && t.top <= (safe || h.P) * 1.0)) : [];
    const pol = (window.GS_NEWS?.items || []).filter(x => (x.who || []).includes("buy") || (A.when !== "99" && (x.who || []).includes("apply"))).slice(0, 3);
    const rules = (window.GS_NEWS?.rules || []).slice(0, 1);
    const whenTxt = { 3: "3개월 안", 6: "6개월 안", 12: "1년 안", 99: "시기 미정" }[A.when] || "";
    const sample = !!A._sample;
    if (!sample) store.set("gs_report", { A, cash: start, P: h.P, at: new Date().toISOString() });
    const say = left < 1000
      ? `소득 대비 상환 부담${payR <= 30 ? "은 괜찮은데" : "도 큰 편이고"}, 현금을 거의 다 쓰는 구조예요. 최대 한도보다 낮춰 잡고 <b>비상금 1,000만 원 이상</b>은 남겨두세요. 그게 첫 집을 오래 편하게 사는 방법이에요.`
      : payR > 35 ? `현금은 여유가 있지만 <b>월 상환이 세전 월소득의 ${payR.toFixed(0)}%</b>로 큰 편이에요. 대출을 조금 줄이면 생활이 훨씬 편해져요.`
      : `현금과 상환 부담 모두 무리 없는 범위예요. 후보 단지를 3곳 정도로 좁혀 <b>실제 매물 가격</b>을 확인해 보는 단계예요.`;
    main.innerHTML = `
      ${sample ? `<div class="sample"><b>샘플 결과예요</b> 현금 3억·맞벌이 연 6천만 원 예시로 계산했어요.<button type="button" id="mine">내 조건으로 시작</button></div>` : ""}
      <div class="rp-h"><small>착한언니 내집마련 진단 리포트</small><h1>${esc(short(start))}으로 시작하는<br>첫 집 진단</h1></div>
      <div class="who"><span>현금 ${short(+A.cash || 0)}${+A.dep ? ` + 보증금 ${short(+A.dep)}` : ""}</span><span>세전 연소득 ${short(inc)}</span><span>${o.first ? "생애최초" : "주택 보유 이력 있음"}</span><span>월 저축 ${short(save)}</span><span>${{ s: "60㎡ 이하", m: "60~85㎡", l: "85㎡ 초과" }[A.band]}</span>${whenTxt ? `<span>${whenTxt}</span>` : ""}</div>
      <div class="verdict"><small>한 줄 결론</small>
        <h2>입력한 조건 기준 예상 상한은 <em>${short(h.P)}</em>이에요.${left < 1000 ? `<br>비상금을 남기려면 <em>${short(safe)}</em>까지 보세요.` : ""}</h2>
        <div class="kpi3"><div>예상 상한<b>${short(h.P)}</b><i>대출 ${short(h.loan.amt)} 포함</i></div><div class="w">비상금 남긴 예산<b>${short(safe || h.P)}</b><i>${safe ? "1,000만 원 남김" : "이미 여유 있음"}</i></div><div>잔금에 필요한 현금<b>${short(need)}</b><i>세금·등기·복비 포함</i></div></div>
        <p class="vsub">월 상환 약 ${Math.round(pay).toLocaleString()}만 원 (금리 ${RATE}%) · 실제 대출 한도는 은행 심사로 정해져요</p></div>

      <h3 class="rs"><i>01</i> 예산은 이렇게 정해졌어요</h3>
      <p class="why">대출 한도는 세 규칙 중 가장 작은 값이에요. 이번엔 <b>${h.loan.by}</b>에서 막혔어요.</p>
      <table class="tb"><tr><th>규칙</th><th>기준</th><th class="r">한도</th></tr>
        <tr class="${h.loan.by === "LTV" ? "hl" : ""}"><td>LTV</td><td>${o.first ? "생애최초 70%" : "40%"}</td><td class="r">${short(h.loan.parts["LTV"])}</td></tr>
        <tr class="${h.loan.by === "가격별 상한" ? "hl" : ""}"><td>가격별 상한</td><td>15억 이하 최대 6억</td><td class="r">${short(h.loan.parts["가격별 상한"])}</td></tr>
        <tr class="${h.loan.by === "스트레스 DSR" ? "hl" : ""}"><td>스트레스 DSR</td><td>연소득 ${DSR}%, 금리 ${RATE}%+${STRESS}%p</td><td class="r">${short(h.loan.parts["스트레스 DSR"])}</td></tr></table>
      <div class="flag ${payR <= 30 ? "fo" : "fw"}"><b>${payR <= 30 ? "✓" : "⚠"} 월 상환 부담: 세전 월소득의 약 ${payR.toFixed(0)}%</b>월 상환 ${Math.round(pay).toLocaleString()}만 원 ÷ 세전 월소득 ${Math.round(inc / 12).toLocaleString()}만 원. 흔히 30% 안쪽이면 무리 없는 수준으로 봐요.</div>
      <p class="why" style="margin-top:6px">금리는 한국은행 ${window.GS_RATE ? ymL(window.GS_RATE.month) : ""} 신규 주담대 평균(${window.GS_RATE?.mortgage ?? RATE}%)이에요.</p>

      <h3 class="rs"><i>02</i> 금리가 오르면?</h3>
      <p class="why">대출 ${short(h.loan.amt)}, ${TERM}년 원리금균등</p>
      <div class="bars">${[RATE, RATE + 1, RATE + 2].map((r, i) => { const v = payment(h.loan.amt, r, TERM), mx = payment(h.loan.amt, RATE + 2, TERM); return `<div class="br ${i ? "up" : ""}"><span>금리 ${r.toFixed(1)}%</span><span class="t"><i style="width:${(v / mx * 100).toFixed(0)}%"></i></span><b>월 ${Math.round(v).toLocaleString()}만${i ? ` (+${Math.round(v - pay)})` : ""}</b></div>`; }).join("")}</div>

      <h3 class="rs"><i>03</i> 잔금날 필요한 돈</h3>
      <p class="why">${short(h.P)} 아파트 기준 · ${o.first ? "생애최초 취득세 감면 반영 · " : ""}부대비용 탭과 같은 계산</p>
      <table class="tb"><tr><td>세금 (취득세 등${cost.first ? `, 감면 −${Math.round(cost.first)}만` : ""})</td><td class="r">${short(cost.taxSum)}</td></tr>
        <tr><td>등기비용 (채권 할인·인지세·법무사)</td><td class="r">${short(cost.regSum)}</td></tr>
        <tr><td>중개보수 상한 (부가세 포함)</td><td class="r">${short(cost.feeV)}</td></tr>
        <tr class="hl"><td>집값 − 대출 + 부대비용 = 내 현금에서 나갈 돈</td><td class="r">${short(need)}</td></tr></table>
      ${left < 1000 ? `<div class="flag fw"><b>⚠ 잔금 후 남는 현금이 ${left < 10 ? "거의 없어요" : `약 ${Math.round(left).toLocaleString()}만 원이에요`}</b>이사비·가전·수리비를 생각하면 빠듯해요. 비상금 1,000만 원을 남기려면 <b>${short(safe)}</b> 이하로 보는 걸 추천해요.</div>` : ""}

      <h3 class="rs"><i>04</i> 이 예산으로 비교할 단지</h3>
      <p class="why">${safe ? `비상금을 남긴 ${short(safe)} 기준` : `${short(h.P)} 기준`} · 최근 6개월 실거래 중간값 · 실거래는 과거 계약이고, 지금 매물은 담당자가 확인해요</p>
      ${T ? `
      <p class="cg">① 조건에 맞는 단지 <small>${BANDN[A.band]} · ${A.gus.length ? A.gus.join("·") : "서울 전체"}</small></p>
      <div class="lst">${cand(rows, "a") || `<div class="li">조건에 맞는 최근 거래가 없어요.</div>`}</div>
      ${rows.length < 3 ? `<div class="flag fw"><b>후보를 늘리려면</b>${alt.length ? `같은 예산으로 <b>면적을 ${BANDN[ALT[A.band]]}</b>로 바꾸면 ${alt.length}곳이 있어요. ` : ""}${near.length ? `희망 지역 옆 <b>${[...new Set(near.map(r => r.c.g))].slice(0, 2).join("·")}</b>까지 보면 ${near.length}곳이 있어요.` : A.gus.length ? "" : "희망 지역을 정하면 옆 동네 비교도 보여드려요."}</div>` : ""}
      ${alt.length ? `<p class="cg">② 면적을 조정하면 <small>${BANDN[ALT[A.band]]}</small></p><div class="lst">${cand(alt, "b")}</div>` : ""}
      ${near.length ? `<p class="cg">③ 옆 동네에서 비교 <small>${[...new Set(near.slice(0, 3).map(r => r.c.g))].join("·")}</small></p><div class="lst">${cand(near, "c")}</div>`
        : !A.gus.length && dongs.length ? `<p class="cg">③ 이 가격대 거래가 많은 동네</p><div class="lst">${dongs.map(([k, n], i) => `<div class="li"><span>${i + 1}. ${esc(k)}</span><span>최근 6개월 ${n}건</span></div>`).join("")}</div>` : ""}
      ${home.length && !(A.gus.includes("마포구") || A.gus.includes("서대문구")) ? `<p class="cg">착한언니 동네(마포·서대문)라면</p><div class="lst">${cand(home, "d")}</div>` : ""}
      <button type="button" class="ac main" id="candGo" style="margin-top:12px"><b>고른 단지들 매물 확인 요청 ›</b><span id="candN">위에서 단지를 골라주세요 (최대 3곳)</span></button>` : `<p class="empty">실거래 데이터를 불러오지 못했어요.</p>`}

      <h3 class="rs"><i>05</i> 기다리면 어떻게 돼요?</h3>
      <p class="why">월 ${short(save)} 저축 + 자산 연 3%, 소득 연 3% 증가 가정 · 집값 연 3% 오른다고 보고 오늘 가격으로 환산 · 집값 예측이 아니에요</p>
      <div class="bars">${hz.map(x => `<div class="br"><span>${x.n ? `${x.n}년 뒤` : "지금"}</span><span class="t"><i style="width:${(x.P0 / Math.max(...hz.map(z => z.P0)) * 100).toFixed(0)}%"></i></span><b>${short(x.P0)}</b></div>`).join("")}</div>

      <h3 class="rs"><i>06</i> 청약도 같이 볼까요?</h3>
      ${G ? `<div class="flag fo" style="background:#fff;color:#1F1F1F"><b>내 청약 가점: <span style="color:var(--pink);font-size:20px">${G.sum}점</span> / 84점</b>무주택 ${G.h} + 부양가족 ${G.f} + 통장 ${G.c}. ${G.sum < 40 ? "가점제로는 어려운 편이라 <b>특별공급(생애최초·신혼부부·신생아)이나 추첨 물량</b>을 노리는 게 현실적이에요." : G.sum < 60 ? "인기 단지 가점제는 빠듯할 수 있어요. 특별공급과 함께 보세요." : "가점이 높은 편이에요. 가점제 일반공급도 노려볼 만해요."}</div>` : `<p class="why">STEP 6에서 무주택 기간·부양가족·통장 기간을 넣으면 가점을 계산해 드려요.</p>`}
      ${openAp.length ? `<p class="why" style="margin-top:8px">지금 접수 예정·진행 중인 수도권 공고 중 <b>분양가가 내 예산 안에 드는 주택형이 있는 곳</b></p><div class="lst">${openAp.slice(0, 4).map(x => `<a href="#apply"><span>${esc(x.name)}<small>${esc(x.addr.split(" ").slice(0, 3).join(" "))} · 접수 ${x.rcpt[0].slice(5).replace("-", ".")}~</small></span><b>${short(Math.min(...x.types.map(t => t.top).filter(Boolean)))}~</b></a>`).join("")}</div>` : ""}

      <h3 class="rs"><i>07</i> 나에게 해당하는 정책</h3>
      ${rules.map(r => `<div class="pol"><b><i class='ic' data-i='pin'></i>${esc(r.t)}</b><p>${esc(r.d)}</p></div>`).join("")}
      ${pol.map(x => `<div class="pol"><b>${esc(x.t)}</b><p>${esc(x.me || x.d)}</p></div>`).join("")}

      <h3 class="rs"><i>08</i> 다음 할 일</h3>
      <ul class="chk2" style="background:#fff;border-radius:14px;padding:4px 14px">
        <li>은행 2곳 이상 대출 사전 상담 (스트레스 DSR 한도 확인)</li>
        <li>비상금 포함한 최종 예산 정하기${safe ? ` (추천: ${short(safe)} 이하)` : ""}</li>
        <li>후보 단지 3곳 주말 임장 (<a href="../check/?t=imjang">임장 체크리스트</a>)</li>
        <li>토지거래허가 신청 일정 확인 (서울 아파트는 계약 전 허가)</li>
        <li>계약 전 등기부등본 확인</li></ul>
      <div class="say"><b>착한언니 한마디</b> ${say}</div>
      ${+A.when && +A.when <= 6 ? `<div class="act" style="margin-top:14px"><button type="button" class="ac main" id="lead"><b>이 리포트로 매물 의뢰하기 ›</b><span>예산·시기·자금 상황이 의뢰 내용에 그대로 들어가요 · 예약 손님 우선</span></button></div>`
        : `<div class="flag fw" style="margin-top:14px"><b>지금은 준비 단계예요</b>시기가 가까워지면 이 리포트를 다시 열어 의뢰해 주세요. 아래에서 저장해 두면 편해요.</div>`}
      <div class="rbtn"><button type="button" id="print"><i class='ic' data-i='print'></i>PDF 저장</button><button type="button" id="link"><i class='ic' data-i='link'></i>링크 복사</button><button type="button" id="redo"><i class='ic' data-i='pencil'></i>조건 바꾸기</button></div>
      <p class="basis"><b>이 리포트의 근거</b> 국토교통부 아파트 매매 실거래가(${T ? `${ymL(T.months[0])}~${ymL(T.months[T.months.length - 1])}` : ""} 신고분, 해제 거래 제외) · 한국은행 예금은행 주택담보대출 금리(신규취급액) · 10.15 주택시장 안정화 대책 대출 규칙 · 지방세법 취득세율·생애최초 감면 · 공인중개사법 중개보수 상한 · 청약홈 분양정보<br>
      <b>이 리포트가 하지 않는 것</b> 집값 예측 · 실제 대출 승인 · 등기부 권리 분석 · 매물 추천. 입력한 정보는 이 폰에만 저장되고 서버로 보내지 않아요.<br>만든 사람: 착한언니복덕방 공인중개사 4명 (신혜선·신수경 대표) · 신촌자이엘라부동산 · 마포그랑자이(착한언니)부동산 · unnizip.kr</p>`;
    $("#print").onclick = () => window.print();
    $("#mine") && ($("#mine").onclick = () => { A = { ...DEFAULT }; step = 0; ask(); window.scrollTo(0, 0); });
    const picked = () => [...main.querySelectorAll(".cand input:checked")].map(i => i.dataset.n);
    main.querySelectorAll(".cand input").forEach(i => i.onchange = () => { const L = picked(); if (L.length > 3) { i.checked = false; toast("3곳까지 고를 수 있어요"); return; } $("#candN").textContent = L.length ? L.join(" / ") : "위에서 단지를 골라주세요 (최대 3곳)"; });
    $("#candGo") && ($("#candGo").onclick = () => { const L = picked(); if (!L.length) { toast("비교할 단지를 먼저 골라주세요"); return; }
      GS_lead.open({ kind: "buy", cx: { name: L.join(" / "), area: "" }, preset: { when: A.when === "3" ? "3개월 이내" : A.when === "6" ? "3~6개월" : A.when === "12" ? "6개월 이후" : "미정", budget: String(Math.round((safe || h.P) / 1000) / 10) } }); });
    $("#link").onclick = async () => { const u = `${location.origin}${location.pathname}#report?s=${btoa(unescape(encodeURIComponent(JSON.stringify(A))))}`; try { await navigator.clipboard.writeText(u); toast("링크를 복사했어요"); } catch (e) { prompt("링크를 복사하세요", u); } };
    $("#redo").onclick = () => { step = 0; ask(); window.scrollTo(0, 0); };
    $("#lead") && ($("#lead").onclick = () => GS_lead.open({ kind: "buy", cx: { name: `진단 리포트 · 최대 ${short(h.P)}${safe ? `(추천 ${short(safe)})` : ""}${A.gus.length ? ` · ${A.gus.join("·")}` : ""}`, area: "" },
      preset: { when: A.when === "3" ? "3개월 이내" : "3~6개월", budget: String(Math.round((safe || h.P) / 1000) / 10) } }));
  }

  // ---------- 청약 ----------
  async function applyPage() {
    main.innerHTML = `<p class="empty">청약 공고를 불러오는 중…</p>`;
    let D; try { D = await apply(); } catch (e) { main.innerHTML = `<p class="empty">청약 데이터를 불러오지 못했어요.</p>`; return; }
    const today = new Date().toISOString().slice(0, 10), dd = d => Math.round((new Date(d) - new Date(today)) / 864e5);
    const g0 = store.get("gs_gj", { homeless: "", fam: "", acct: "", first: "1" });
    let f = "open", area = "all";
    const draw = () => {
      const list = D.items.filter(x => (area === "all" || x.area === area) && (f === "open" ? x.rcpt[1] >= today : x.rcpt[1] < today))
        .sort((a, b) => f === "open" ? a.rcpt[0].localeCompare(b.rcpt[0]) : b.rcpt[0].localeCompare(a.rcpt[0]));
      const G = gajeom(g0);
      main.innerHTML = `<h1>청약, <em>뭐가 나왔어요?</em></h1>
        <p class="lead">서울·경기·인천 아파트 분양 공고를 정리했어요. 분양가 옆에 <b>같은 동네 최근 실거래</b>를 같이 보여드려요.</p>
        <details class="gj" style="margin-top:14px" ${G ? "" : ""}><summary><b style="font-size:14.5px">내 청약 가점 계산</b> <span style="color:var(--pink);font-weight:800">${G ? `${G.sum}점` : "열기 ›"}</span></summary>
          <div class="row3" style="margin-top:10px"><label>무주택 (년)<input data-g="homeless" type="number" min="0" inputmode="decimal" value="${esc(g0.homeless)}"></label><label>부양가족 (명)<input data-g="fam" type="number" min="0" inputmode="numeric" value="${esc(g0.fam)}"></label><label>통장 (년)<input data-g="acct" type="number" min="0" inputmode="decimal" value="${esc(g0.acct)}"></label></div>
          <div class="gjr"><b id="gjs">${G ? G.sum : "-"}</b><span>/ 84점 ${G ? `· 무주택 ${G.h} + 부양가족 ${G.f} + 통장 ${G.c}` : "· 세 칸을 채우면 계산돼요"}</span></div>
          <p class="why" style="margin:6px 0 0">무주택 기간은 만 30세(그 전에 혼인했다면 혼인신고일)부터 세요. 단지별 당첨 가점은 청약홈 당첨자 발표에서 확인할 수 있어요. 신청 자격(소득·자산·지역 요건)은 공고마다 달라서 공고 원문으로 확인해야 해요.</p></details>
        <div class="ftab">${[["open", "접수 예정·진행"], ["past", "지난 공고 (경쟁률)"]].map(([k, t]) => `<button type="button" data-f="${k}" class="${f === k ? "on" : ""}">${t}</button>`).join("")}</div>
        <div class="ftab" style="margin-top:0">${["all", "서울", "경기", "인천"].map(k => `<button type="button" data-a="${k}" class="${area === k ? "on" : ""}">${k === "all" ? "전체" : k}</button>`).join("")}</div>
        ${list.map(x => card(x)).join("") || `<p class="empty">해당하는 공고가 없어요.</p>`}
        <p class="src">출처: ${esc(D.source)} · 갱신 ${esc(D.updated)} · 공고일 ${esc(D.since)} 이후 · 신청 전 반드시 입주자모집공고 원문을 확인하세요. 청약 권유가 아니에요.</p>`;
      main.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { f = b.dataset.f; draw(); });
      main.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { area = b.dataset.a; draw(); });
      main.querySelectorAll("[data-g]").forEach(i => i.onchange = () => { g0[i.dataset.g] = i.value; store.set("gs_gj", g0); draw(); });
    };
    const card = x => {
      const tops = x.types.map(t => t.top).filter(Boolean), lo = Math.min(...tops), hi = Math.max(...tops);
      const ppm = x.types.filter(t => t.top && t.ar).map(t => t.top / t.ar), myppm = ppm.length ? median(ppm) : null;
      const sp = {}; x.types.forEach(t => Object.entries(t.sp_d).forEach(([k, v]) => sp[k] = (sp[k] || 0) + (+v || 0)));
      const spAll = x.types.reduce((a, t) => a + (+t.sp || 0), 0);
      const spTxt = Object.entries(sp).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(" · ") || (spAll ? `${spAll}세대${/신혼희망/.test(x.name) ? " (신혼부부·예비신혼·한부모 대상)" : ""}` : "");
      const gen = x.types.reduce((s, t) => s + (+t.gen || 0), 0);
      const cm = x.types.filter(t => t.cmp && t.cmp.n != null).map(t => t.cmp.n), cmpMax = cm.length ? Math.max(...cm) : null;
      const d = dd(x.rcpt[0]), d2 = dd(x.rcpt[1]);
      const st = d > 0 ? `D-${d}` : d2 >= 0 ? "접수 중" : "마감";
      const steps = [["특별공급", x.sp[0]], ["1순위", x.r1[0]], ["당첨 발표", x.win], ["계약", x.contract[0]]].filter(s => s[1]);
      return `<div class="ap"><p class="apl"><b>${st === "마감" ? "마감" : `접수 ${x.rcpt[0].slice(5).replace("-", ".")}~${x.rcpt[1].slice(5).replace("-", ".")}`}</b> · ${esc(x.area)} · ${x.kind === "국민" ? "공공분양" : "민영"}${/신혼희망/.test(x.name) ? " · 신혼희망타운" : ""}</p><div class="badges">${x.kind === "국민" ? `<span class="s">공공</span>` : `<span class="p">민영</span>`}<span>${esc(x.area)}</span>${x.ceiling ? `<span class="y">분양가상한제</span>` : ""}${x.speculative ? `<span class="y">투기과열지구</span>` : ""}${x.adj ? `<span class="y">조정대상지역</span>` : ""}</div>
        <div class="hh"><div><h3>${esc(x.name)}</h3><p class="sub">${esc(x.addr)}${x.total ? ` · ${x.total}세대` : ""}${x.move ? ` · ${x.move.slice(0, 4)}.${x.move.slice(4)} 입주 예정` : ""}</p></div><span class="dday ${st === "마감" ? "g" : ""}">${st}</span></div>
        <div class="cmp3"><div>분양가 (최고가 기준)<b>${tops.length ? (lo === hi ? short(lo) : `${short(lo)}~${short(hi)}`) : "-"}</b></div>
          <div>분양가 ㎡당 (전용)<b>${myppm ? `${Math.round(myppm).toLocaleString()}만` : "-"}</b></div>
          <div>같은 동 실거래 ㎡당<b>${x.near ? `${x.near.ppm.toLocaleString()}만` : "-"}</b></div></div>
        ${x.near ? `<p class="spl"><i class='ic' data-i='pin'></i>${esc(x.near.dong)} 최근 6개월 아파트 매매 ${x.near.n}건 중위${x.near.new_ppm ? ` · 10년 이내 신축 ${x.near.new_n}건 중위 ${x.near.new_ppm.toLocaleString()}만/㎡` : ""} (구축 포함, 면적·층 차이로 단순 비교는 참고만)</p>` : ""}
        <p class="spl"><i class='ic' data-i='ticket'></i>특별공급 ${spTxt || "-"}${gen ? ` · 일반공급 ${gen}세대` : ""}${cmpMax != null ? ` · <b>1순위 해당지역 최고 ${cmpMax}:1</b>` : ""}</p>
        <div class="sched">${steps.map(([t, v]) => `<div class="${v && dd(v) >= 0 && dd(v) <= 7 ? "now" : ""}"><b>${t}</b>${v.slice(5).replace("-", ".")}</div>`).join("")}</div>
        <div class="lk"><a href="${esc(x.url)}" target="_blank" rel="noopener">공고 원문</a><a href="#report">내 예산 보기</a>${x.hp ? `<a href="${esc(/^https?:/.test(x.hp) ? x.hp : "https://" + x.hp)}" target="_blank" rel="noopener">분양 홈페이지</a>` : ""}</div></div>`;
    };
    draw();
  }

  // ---------- 뉴스 ----------
  function news() {
    const N = window.GS_NEWS, M = window.GS_MARKET; if (!N) { main.innerHTML = `<p class="empty">뉴스를 불러오지 못했어요.</p>`; return; }
    const P = { all: "전체", buy: "<i class='ic' data-i='home'></i>집 살 사람", rent: "<i class='ic' data-i='key'></i>전월세", apply: "<i class='ic' data-i='ticket'></i>청약", own: "<i class='ic' data-i='wallet'></i>집 있는 사람" };
    const IM = { g: ["유리", "g"], b: ["불리", "b"], i: ["참고", "i"] };
    let who = store.get("gs_who", "all");
    const today = new Date(new Date().toISOString().slice(0, 10));
    const draw = () => {
      const fit = x => who === "all" || (x.who || []).includes(who);
      const solo = x => who !== "all" && (x.who || []).length === 1;
      const top = (N.top || []).map(i => N.items[i]).filter(Boolean).filter(fit).sort((a, b) => solo(b) - solo(a));
      const rest = N.items.filter(x => fit(x) && !top.includes(x)).sort((a, b) => solo(b) - solo(a) || b.date.localeCompare(a.date));
      const isNew = x => (Date.now() - new Date(x.date.length === 7 ? x.date + "-01" : x.date)) / 864e5 <= 3;
      const line = x => `<details class="nli"><summary><span class="nlt">${isNew(x) ? `<em class="newb">N</em>` : ""}${esc(x.t)}</span><span class="nld">${esc(x.date.slice(2).replace(/-/g, "."))} · ${esc(x.tag)}</span></summary>
        ${x.me ? `<p class="me"><b>그래서 나는?</b> ${esc(x.me)}</p>` : `<p class="me">${esc(x.d)}</p>`}<a class="nsrc" href="${esc(x.url)}" target="_blank" rel="noopener">원문 보기 · ${esc(x.src)} ↗</a></details>`;
      const row = (x, i) => `<div class="${i != null ? "t3" : "it2"}">${i != null ? `<span class="n">${i + 1}</span>` : ""}
        <div class="nm">${isNew(x) ? `<em class="newb">N</em>` : ""}<span class="nb ${IM[x.impact || "i"][1]}">${IM[x.impact || "i"][0]}</span><span class="nb c">${esc(x.tag)}</span>${esc(x.date.slice(5).replace("-", "."))} · ${esc(x.src)}</div>
        <p class="nt">${esc(x.t)}</p>${x.me ? `<p class="me"><b>그래서 나는?</b> ${esc(x.me)}</p>` : ""}<a class="nsrc" href="${esc(x.url)}" target="_blank" rel="noopener">원문 보기 ↗</a></div>`;
      let mk = "";
      if (M) {
        const s = M.series.sale, gus = Object.keys(s).filter(k => /구$/.test(k)).map(k => [k, (s[k][s[k].length - 1] / s[k][s[k].length - 2] - 1) * 100]).sort((a, b) => b[1] - a[1]);
        const se = (s["서울"][s["서울"].length - 1] / s["서울"][s["서울"].length - 2] - 1) * 100, mx = Math.max(...gus.map(g => Math.abs(g[1])));
        mk = `<p class="sec"><i class='ic' data-i='chart'></i>이번 주 서울 아파트 <small>${M.dates[M.dates.length - 1]} 기준 · 한국부동산원</small></p><div class="mkb"><span class="big ${se >= 0 ? "up" : "dn"}">${se >= 0 ? "+" : ""}${se.toFixed(2)}%</span> <span style="color:var(--mut);font-size:13px">서울 평균 · 오른 구 ${gus.filter(g => g[1] > 0).length}개 · 내린 구 ${gus.filter(g => g[1] < 0).length}개</span>
          ${[...gus.slice(0, 3), ...gus.slice(-2)].map(([k, v]) => `<div class="mkrow"><span>${k}</span><span class="t"><i style="${v >= 0 ? "left:50%" : `right:50%`};width:${(Math.abs(v) / mx * 50).toFixed(0)}%;background:${v >= 0 ? "#C2325F" : "#2457A6"}"></i></span><b class="${v >= 0 ? "up" : "dn"}">${v >= 0 ? "+" : ""}${v.toFixed(2)}%</b></div>`).join("")}
          <a class="nsrc" href="../tools/#market">구별 전체 보기 ›</a></div>`;
      }
      main.innerHTML = `<h1>이번 주 부동산 뉴스,<br><em>나한테 뭐가 바뀌어요?</em></h1>
        <p class="lead">착한언니가 원문을 확인하고 쉽게 다시 썼어요 · ${esc(N.updated.slice(5).replace("-", "."))} 업데이트</p>
        <div class="per">${Object.entries(P).map(([k, t]) => `<button type="button" data-w="${k}" class="${who === k ? "on" : ""}">${t}</button>`).join("")}</div>
        ${top.length ? `<p class="sec"><i class='ic' data-i='star'></i>이번 주 꼭 알아야 할 ${top.length}개</p>${top.map((x, i) => row(x, i)).join("")}` : ""}
        ${(N.dates || []).length ? `<p class="sec"><i class='ic' data-i='calendar'></i>다가오는 날짜</p><div class="cal2">${N.dates.map(d => { const dt = new Date(d.d.length === 7 ? d.d + "-01" : d.d), n = Math.round((dt - today) / 864e5);
          return `<div class="cd2"><p class="d">${d.d.length === 7 ? `${+d.d.slice(5)}월` : esc(d.d.slice(5).replace("-", "."))}</p><p class="dd ${n < 0 ? "gray" : ""}">${d.d.length === 7 ? (n < 31 ? "이번 달" : `${+d.d.slice(5)}월`) : n < 0 ? "시행 중" : n === 0 ? "D-day" : `D-${n}`}</p><p>${esc(d.t)}</p></div>`; }).join("")}</div>` : ""}
        ${mk}
        <p class="sec"><i class='ic' data-i='folder'></i>지난 뉴스 <small>${rest.length}개</small></p><div class="nl2">${rest.map(line).join("")}</div>
        <details class="fold2"><summary><i class='ic' data-i='pin'></i>지금 서울에 적용 중인 핵심 규칙 ${N.rules.length}개</summary><div class="in">${N.rules.map(r => `<p><b>${esc(r.t)}</b><br>${esc(r.d)} <a class="nsrc" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.src)} ↗</a></p>`).join("")}</div></details>
        <p class="src">세금 변화를 정권별로 보려면 <a href="../tools/#timeline">세금 타임라인 ›</a></p>`;
      main.querySelectorAll("[data-w]").forEach(b => b.onclick = () => { who = b.dataset.w; store.set("gs_who", who); draw(); });
    };
    draw();
  }

  route();
})();
