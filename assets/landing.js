/* 착한언니복덕방 랜딩 스크립트
   각 기능을 따로 try/catch 로 감싸, 데이터 하나가 깨져도 나머지가 동작하게 한다 (P0-1). */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KAKAO = "https://pf.kakao.com/_xcxoBxnX";
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn(`[landing] ${name} 실패`, e); } };

  // ---------- 0. 첫 진입은 항상 맨 위에서 + 맨 위로 버튼 ----------
  safe("top", () => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
      const up = () => scrollTo({ top: 0, behavior: "instant" });
      up(); addEventListener("load", up, { once: true });
    }
  });
  safe("totop", () => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "totop"; b.setAttribute("aria-label", "맨 위로");
    b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg>';
    b.addEventListener("click", () => { scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); (document.querySelector("header a, header button") || document.body).focus({ preventScroll: true }); });
    document.body.appendChild(b);
    const on = () => b.classList.toggle("show", scrollY > 500);
    addEventListener("scroll", on, { passive: true }); on();
  });

  // ---------- 1. 등장 효과 (가장 먼저) ----------
  safe("reveal", () => {
    const els = document.querySelectorAll(".rv");
    if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("in")); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach(el => io.observe(el));
  });

  // ---------- 공통: 복사 · 토스트 · 클릭 추적 ----------
  const toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl);
  const toast = m => { toastEl.textContent = m; toastEl.classList.add("on"); clearTimeout(toastEl.t); toastEl.t = setTimeout(() => toastEl.classList.remove("on"), 2600); };
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove(); return ok;
    }
  }
  // S-7: 측정 ID 가 없으면 아무 일도 하지 않음 ([사람 확인 필요] gtag 설치 시 동작)
  const track = (name, params) => { try { window.gtag && window.gtag("event", name, params); } catch {} };
  document.addEventListener("click", e => { const a = e.target.closest("[data-track]"); if (a) track("cta_click", { cta: a.dataset.track }); });

  // ---------- 2. 내비 · 모바일 메뉴 (U4) ----------
  safe("nav", () => {
    addEventListener("scroll", () => $("nav").classList.toggle("scrolled", scrollY > 8), { passive: true });
    const btn = $("burger"), dr = $("drawer");
    const set = open => { dr.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open)); btn.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기"); };
    btn.addEventListener("click", () => set(!dr.classList.contains("open")));
    dr.addEventListener("click", e => { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && dr.classList.contains("open")) { set(false); btn.focus(); } });
  });

  // ---------- 3. 실거래 건수 ----------
  safe("summary", () => {
    const S = window.GS_SUMMARY;
    if (S && S.deals) $("s-deals").textContent = (Math.floor(S.deals / 1000) * 1000).toLocaleString() + "+건";
  });

  // ---------- 4. 히어로 차트 (P0-3: 실제 비율, 변화율 라벨) ----------
  safe("hero-chart", () => {
    const M = window.GS_MARKET, v = (M && M.series && M.series.sale && M.series.sale["서울"] || []).filter(x => x != null);
    if (v.length < 2) return;
    const chg = (v[v.length - 1] / v[0] - 1) * 100;
    const months = Math.max(1, Math.round((v.length - 1) / 4.345));
    const lo = v[0] * 0.85, hi = Math.max(...v) * 1.02;
    const W = 1000, H = 240, Y = y => H - (y - lo) / (hi - lo) * H;
    const pts = v.map((y, i) => [i / (v.length - 1) * W, Y(y)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join("");
    const last = pts[pts.length - 1], yPct = (last[1] / H * 100).toFixed(1);
    const lbl = `${chg >= 0 ? "+" : ""}${chg.toFixed(1)}% · ${months}개월`;
    const fmt = s => String(s).slice(2).replace(/-/g, ".");
    $("hero-chart").innerHTML = `<svg width="100%" height="100%">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="100%">
        <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C2325F" stop-opacity=".12"/><stop offset="1" stop-color="#C2325F" stop-opacity="0"/></linearGradient></defs>
        <path d="${d}L${W},${H}L0,${H}Z" fill="url(#hg)"/><path d="${d}" fill="none" stroke="#C2325F" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
      </svg>
      <text class="lbl" x="99%" y="${yPct}%" dy="-12" text-anchor="end">${esc(lbl)}</text>
    </svg>
    <span class="cap">서울 아파트 매매가격지수 ${esc(fmt(M.dates[0]))} ~ ${esc(fmt(M.dates[M.dates.length - 1]))} · 한국부동산원</span>`;
  });

  // ---------- 5. 시황 카드 (U7: 서대문·마포 기준) ----------
  safe("live", () => {
    const M = window.GS_MARKET; if (!M || !M.series) return;
    const n = M.weeks.length - 1, R = M.series;
    const ch = a => a && a[n] != null && a[n - 1] ? (a[n] / a[n - 1] - 1) * 100 : null;
    const f = x => x == null ? "-" : `${x > 0 ? "▲" : x < 0 ? "▼" : ""}${Math.abs(x).toFixed(2)}%`;
    const pick = g => ch(R.sale[g]);
    const gu = Object.keys(R.sale).filter(g => g.endsWith("구")).map(g => [g, pick(g)]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);
    const cards = [];
    for (const g of ["서대문구", "마포구"]) {
      const x = pick(g);
      cards.push(x != null ? [`${g} 매매가 · 이번 주`, f(x)] : ["가장 많이 오른 구", gu[0] ? gu[0][0] : "-"]);
    }
    cards.push(["서울 매매가 · 이번 주", f(ch(R.sale["서울"]))]);
    cards.push(["서울 매매수급지수", R.sale_sd && R.sale_sd["서울"] && R.sale_sd["서울"][n] != null ? R.sale_sd["서울"][n].toFixed(1) : "-"]);
    $("live").innerHTML = cards.map(([l, val]) => `<div><small>${esc(l)}</small><b>${esc(val)}</b></div>`).join("");
    $("live-note").innerHTML = `한국부동산원 주간 아파트가격동향 <span class="nw">${esc(M.dates[n])} 기준</span> · <span class="nw">매주 자동 업데이트</span>`;
    // 히어로 오른쪽 카드 (V3)
    const dds = document.querySelectorAll("#side-live dd");
    [pick("서대문구"), pick("마포구"), ch(R.sale["서울"])].forEach((x, i) => { if (dds[i]) dds[i].textContent = f(x); });
    $("side-note").textContent = `한국부동산원 주간 아파트가격동향 · ${M.dates[n]} 기준`;
  });

  // ---------- 6. 대표 사진 슬롯 (V4) ----------
  safe("photo", () => {
    const src = $("pcard").dataset.photo; if (!src) return;
    const img = new Image();
    img.onload = () => { img.className = "photo"; img.alt = "착한언니복덕방 신수경 대표 공인중개사"; $("pcard").prepend(img); $("pcard").classList.add("has-photo"); };
    img.src = src;
  });

  // ---------- 7. 30초 진단 (U2) ----------
  safe("quiz", () => {
    const Q = [
      { k: "찾는 집", q: "지금 어떤 집을 찾고 있나요?", o: [["first", "첫 자취방 · 원룸/오피스텔", "학교·회사 근처 월세·전세"], ["home", "첫 내 집 마련", "생애최초·신혼부부"], ["move", "갈아타기 · 매매", "지금 집 팔고 더 좋은 곳으로"], ["learn", "아직은 공부 중", "시장 흐름부터 알고 싶어요"]] },
      { k: "걱정", q: "가장 걱정되는 건 뭔가요?", o: [["money", "예산 · 대출 한도", "얼마까지 가능한지 모르겠어요"], ["area", "동네 · 출퇴근 · 안전", "어디에 살아야 할지"], ["price", "가격이 적당한지", "비싸게 사는 건 아닐까"], ["safe", "계약 · 보증금 안전", "사기·특약이 걱정돼요"]] },
      { k: "시기", q: "언제쯤 움직일 계획인가요?", o: [["now", "3개월 안에", "바로 집을 보러 다닐 예정"], ["soon", "6개월~1년 안에", "미리 준비하고 싶어요"], ["later", "1년 이후", "천천히 계획 중이에요"]] },
    ];
    const TYPE = { first: "안전한 첫 자취러", home: "현실적인 첫 집 준비생", move: "전략적인 갈아타기", learn: "차근차근 공부파" };
    const T = window.GS_TOC || {}, all = [...(T.jachwi || []), ...(T.tips || [])];
    const g = re => { const p = all.find(p => re.test(p.t)); return p ? [`tools/#${p.h}`, p.t.trim().replace(/\s*\|.*$/, "")] : null; };
    const box = $("quizbox"); let ans = []; // [{v, t}]
    function links(kind, worry) {
      const L = [];
      if (kind === "first") L.push(["tools/#rent", "첫 자취 동네 추천기"], g(/동네 고르기/), g(worry === "safe" ? /등기부등본/ : /방 보기/), g(/여자 혼자/));
      if (kind === "home") L.push(["tools/#budget", "내 예산으로 서울 어디까지?"], g(/첫 집, 내 현금/), g(/대출 완전정복/), g(worry === "price" ? /사야할|알아보기 시작/ : /진짜 드는 돈/));
      if (kind === "move") L.push(["tools/#check", "이 아파트, 비싸게 사는 걸까?"], g(/갈아타기/), ["tools/#market", "이번 주 서울 시황"], g(/토지거래허가/));
      if (kind === "learn") L.push(["tools/#market", "이번 주 서울 시황"], ["tools/#news", "부동산 정책 뉴스"], g(/알아보기 시작/), ["tools/#budget", "내 예산으로 서울 어디까지?"]);
      if (worry === "safe" && kind !== "first") L.splice(1, 0, g(/보증금 사수|등기부등본/));
      if (worry === "money" && kind === "first") L.splice(1, 0, g(/전화하기/));
      return [...new Map(L.filter(Boolean).map(x => [x[0], x])).values()].slice(0, 4);
    }
    const focusTitle = () => { const h = box.querySelector("h3"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } };
    function render(moveFocus) {
      if (ans.length === Q.length) {
        const [kind, worry, when] = ans.map(a => a.v), type = TYPE[kind];
        const tip = when === "now" ? "3개월 안에 움직이신다면 지금 바로 카톡으로 조건을 보내주세요. 나오자마자 나가는 매물이 많아요."
          : when === "soon" ? "지금부터 예산과 동네 기준을 세워두면, 매물이 나왔을 때 빠르게 결정할 수 있어요." : "매주 바뀌는 시황과 정책만 챙겨도 기준이 생겨요. 블로그 이웃추가로 소식을 받아보세요.";
        box.innerHTML = `<div class="res"><div class="step">진단 결과</div><div class="bar"><i style="width:100%"></i></div>
          <h3>나는 '${esc(type)}' 타입</h3><p>${esc(tip)}</p>
          <button class="btn btn-k" type="button" id="q-kakao" data-track="quiz_result_kakao">이 결과로 착한언니에게 물어보기</button>
          <div class="list">${links(kind, worry).map(([h, t]) => `<a href="${esc(h)}">${esc(t)}<span aria-hidden="true">→</span></a>`).join("")}</div>
          <button class="again" type="button">다시 하기</button></div>`;
        box.querySelector(".again").addEventListener("click", () => { ans = []; render(true); });
        $("q-kakao").addEventListener("click", async () => {
          const text = `[착한언니 30초 진단 결과]\n유형: ${type}\n${Q.map((q, i) => `${q.k}: ${ans[i].t}`).join("\n")}`;
          const ok = await copy(text);
          toast(ok ? "진단 결과를 복사했어요. 카톡 창에 붙여넣기 하세요" : "복사가 안 됐어요. 카톡에서 진단 결과를 알려주세요");
          window.open(KAKAO, "_blank", "noopener");
        });
      } else {
        const i = ans.length, q = Q[i];
        box.innerHTML = `<div class="step"><span>질문 ${i + 1} / ${Q.length}</span>${i ? `<button class="back" type="button">← 이전</button>` : ""}</div>
          <div class="bar"><i style="width:${i / Q.length * 100}%"></i></div>
          <h3>${esc(q.q)}</h3><div class="opts">${q.o.map(([v, t, s]) => `<button type="button" class="opt" data-v="${esc(v)}" data-t="${esc(t)}">${esc(t)}<small>${esc(s)}</small></button>`).join("")}</div>
          <p class="meta">30초 소요 · 개인정보를 받지 않아요</p>`;
        box.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => { ans.push({ v: b.dataset.v, t: b.dataset.t }); render(true); }));
        const back = box.querySelector(".back"); if (back) back.addEventListener("click", () => { ans.pop(); render(true); });
      }
      if (moveFocus) focusTitle();
    }
    render(false);
  });

  // ---------- 8. 상담 양식 복사 (U3) ----------
  safe("contact", () => {
    const FORM = "[상담 요청]\n찾는 집: (월세/전세/매매 · 원룸/오피스텔/아파트)\n예산: 보증금 __만 원 / 월세 __만 원 (또는 현금 __억 원 · 연소득 __만 원)\n출퇴근지:\n입주 희망일:\n꼭 필요한 조건 2가지:";
    $("copy-form").addEventListener("click", async () => toast(await copy(FORM) ? "상담 양식을 복사했어요. 카톡 창에 붙여넣고 채워주세요" : "복사가 안 됐어요"));
  });

  // ---------- 9. 꿀팁 목차 (노션에서 자동 반영) ----------
  safe("tips", () => {
    const T = window.GS_TOC; if (!T) return;
    const item = (p, k) => `<a href="tools/#${esc(p.h)}" class="${k >= 3 ? "x" : ""}"><span class="i">${String(k + 1).padStart(2, "0")}</span>${esc(String(p.t).trim().replace(/\s*\|.*$/, ""))}</a>`;
    const el = $("tiplist");
    el.innerHTML = `<h3>첫 자취방 가이드</h3>${(T.jachwi || []).map(item).join("")}<h3>내 집 마련 · 계약 꿀팁</h3>${(T.tips || []).map(item).join("")}
      <button class="btn btn-line more" type="button">꿀팁 전체 보기</button>`;
    el.querySelector(".more").addEventListener("click", () => el.classList.remove("fold"));
  });
})();
