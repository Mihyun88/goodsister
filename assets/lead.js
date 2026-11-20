/* 매물 의뢰 전 확인 시트 (서버 저장 없음)
   GS_lead.open({ kind: "buy"|"rent"|"owner"|"offi"|"gg", cx: { name, area, region } })
   답변 → 등급 태그가 붙은 의뢰 문구 → 복사 후 카카오톡 채널 열기. 시기가 먼 손님은 준비 단계 안내. */
(() => {
  const KAKAO = "https://pf.kakao.com/_xcxoBxnX";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NOTE = "퀄리티 있는 상담을 위해 예약 손님 우선으로 도와드려요. 매물 확인 후 영업일 기준 순서대로 연락드려요.";

  // 질문 정의: q = 질문, k = 키, t = chips|money|date|text, o = 선택지
  const Q = {
    buy: { title: "매물 의뢰 전에<br><em>몇 가지만</em> 확인할게요", deal: "매수", qs: [
      { k: "when", q: "언제까지 매수하고 싶으세요?", t: "chips", o: ["3개월 이내", "3~6개월", "6개월 이후", "미정"] },
      { k: "budget", q: "어느 가격까지 보세요?", sub: "총 매수 가능액", t: "money", unit: "억", ph: "예: 12" },
      { k: "fund", q: "자금 준비는요?", t: "chips", o: ["자기자금으로 가능", "대출 사전상담 완료", "대출 확인 중", "기존 집 매도 후"] },
      { k: "must", q: "꼭 맞아야 하는 조건 하나만", t: "chips", o: ["층", "향", "입주 날짜", "수리 상태", "학군", "없음"], opt: true } ] },
    rent: { title: "전세·월세 매물 의뢰 전에<br><em>몇 가지만</em> 확인할게요", deal: "전월세", qs: [
      { k: "when", q: "언제까지 이사해야 하나요?", t: "chips", o: ["1개월 이내", "1~2개월", "2~3개월", "3개월 이후", "미정"] },
      { k: "type", q: "전세·월세 중에", t: "chips", o: ["전세", "월세", "둘 다"] },
      { k: "dep", q: "보증금은 어디까지?", t: "money", unit: "만 원", ph: "예: 50000" },
      { k: "mon", q: "월세는 어디까지?", sub: "월세일 때만", t: "money", unit: "만 원", ph: "예: 150", opt: true, show: a => a.type && a.type !== "전세" },
      { k: "must", q: "매물 볼 때 꼭 맞아야 하는 조건", t: "chips", o: ["이 단지만", "근처 단지도 괜찮아요", "통근·통학", "방 개수", "보증보험 가입 가능"], opt: true } ] },
    offi: { title: "신촌·이대 오피스텔,<br><em>입주 조건</em>을 알려주세요", deal: "오피스텔 월세", qs: [
      { k: "when", q: "언제부터 살 집이 필요하세요?", t: "chips", o: ["1개월 이내", "1~2개월", "2~3개월", "3개월 이후", "미정"] },
      { k: "dep", q: "보증금은 어디까지?", t: "money", unit: "만 원", ph: "예: 1000" },
      { k: "mon", q: "한 달 주거비는 어디까지?", sub: "월세 + 관리비 합계", t: "money", unit: "만 원", ph: "예: 85" },
      { k: "near", q: "어디까지 걸어서 다니고 싶으세요?", t: "chips", o: ["신촌역", "이대역", "아현역", "홍대입구역", "연세대", "이화여대", "서강대", "회사 근처"] },
      { k: "walk", q: "걸어서 몇 분까지?", t: "chips", o: ["5분", "10분", "15분"] } ] },
    owner: { title: "집을 내놓기 전에<br><em>몇 가지만</em> 알려주세요", deal: "집주인", qs: [
      { k: "deal", q: "어떻게 내놓으세요?", t: "chips", o: ["전세", "월세", "매도", "아직 고민 중"] },
      { k: "when", q: "언제부터 가능해요?", t: "chips", o: ["지금 바로 (공실)", "1개월 이내", "1~3개월", "현 세입자 만기 후", "협의"] },
      { k: "price", q: "희망 조건은요?", sub: "모르시면 비워두세요. 주변 시세와 비교해 드려요", t: "text", ph: "예: 보증금 5억 / 월세 0  또는  매도 18억", opt: true } ] },
    gg: { title: "경기 지역 <em>중개 가능 여부</em><br>먼저 확인해 드려요", deal: "경기 매수", qs: [
      { k: "when", q: "언제까지 매수하고 싶으세요?", t: "chips", o: ["3개월 이내", "3~6개월", "6개월 이후", "미정"] },
      { k: "budget", q: "어느 가격까지 보세요?", sub: "총 매수 가능액", t: "money", unit: "억", ph: "예: 8" },
      { k: "fund", q: "자금 준비는요?", t: "chips", o: ["자기자금으로 가능", "대출 사전상담 완료", "대출 확인 중", "기존 집 매도 후"] } ] },
  };

  // 등급: A 바로 확인 / B 확인 후 연락 / P 준비 단계(의뢰 대신 저장 안내)
  function grade(kind, a) {
    if (kind === "owner") return a.deal && a.when ? { g: a.price ? "임대접수" : "가격상담", ok: true } : null;
    if (kind === "buy" || kind === "gg") {
      if (!a.when || !a.budget || !a.fund) return null;
      if (a.when === "6개월 이후" || a.when === "미정") return { g: "P" };
      if (kind === "gg") return a.when === "3개월 이내" && /자기자금|사전상담/.test(a.fund) ? { g: "경기·확인요청", ok: true } : { g: "P", gg: true };
      const ready = /자기자금|사전상담/.test(a.fund);
      return { g: a.when === "3개월 이내" && ready ? "A" : "B", ok: true,
        note: ready ? "" : a.fund === "기존 집 매도 후" ? "기존 집 매도 일정을 먼저 같이 확인할게요." : "대출 가능 금액을 먼저 확인해 주시면 매물 안내가 빨라져요." };
    }
    const need = kind === "offi" ? ["when", "dep", "mon", "near", "walk"] : ["when", "type", "dep"];
    if (need.some(k => !a[k])) return null;
    if (a.when === "3개월 이후" || a.when === "미정") return { g: "P" };
    return { g: a.when === "2~3개월" ? "B" : "A", ok: true,
      note: kind === "rent" && /보증보험/.test(a.must || "") ? "보증보험 가입 가능 여부는 매물을 고른 뒤 계약 전에 같이 확인해요." : "" };
  }

  const man = v => { v = Math.round(+v); if (!v) return ""; const e = Math.floor(v / 10000), r = v % 10000; return [e ? `${e}억` : "", r ? `${r.toLocaleString()}만` : ""].filter(Boolean).join(" "); };
  function message(kind, ctx, a, gr) {
    const cx = ctx.cx ? `${ctx.cx.name}${ctx.cx.area ? ` ${ctx.cx.area}㎡` : ""}` : "";
    const tag = { buy: "아파트매수", rent: "아파트전월세", offi: "신촌월세", owner: "집주인", gg: "경기매수" }[kind];
    const head = kind === "owner" ? `[${gr.g}]` : kind === "gg" ? `[${gr.g}]` : `[${gr.g}·${tag}]`;
    const parts = {
      buy: [cx, a.when, `${a.budget}억 이하`, a.fund, a.must && a.must !== "없음" ? `${a.must} 중요` : ""],
      gg: [cx, a.when, `${a.budget}억 이하`, a.fund],
      rent: [cx, `입주 ${a.when}`, a.type, `보증금 ${man(a.dep)} 이하`, a.mon ? `월세 ${a.mon}만 이하` : "", a.must],
      offi: [`입주 ${a.when}`, `${a.near} 도보 ${a.walk}`, `보증금 ${man(a.dep)} 이하`, `월세+관리비 ${a.mon}만 이하`],
      owner: [cx, a.deal, a.when, a.price || "희망가 미정 · 시세 비교 요청"],
    }[kind].filter(Boolean);
    return `${head} ${parts.join(" · ")}`;
  }

  let root;
  function open(ctx) {
    const kind = ctx.kind, def = Q[kind], a = Object.assign({}, ctx.preset || {});
    root?.remove();
    root = document.createElement("div"); root.className = "lead-dim"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
    root.innerHTML = `<div class="lead-sheet"><button type="button" class="lead-x" aria-label="닫기">✕</button><div class="lead-body"></div></div>`;
    document.body.appendChild(root); document.body.classList.add("lead-open");
    const close = () => { root.remove(); root = null; document.body.classList.remove("lead-open"); };
    root.addEventListener("click", e => { if (e.target === root || e.target.closest(".lead-x")) close(); });
    document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", k); } });
    const body = root.querySelector(".lead-body");
    const render = () => {
      const gr = grade(kind, a);
      const qs = def.qs.filter(q => !q.show || q.show(a));
      body.innerHTML = `<h2 class="lead-h">${def.title}</h2>
        ${ctx.cx ? `<p class="lead-pre">🏢 ${esc(ctx.cx.name)}${ctx.cx.area ? ` · ${esc(ctx.cx.area)}㎡` : ""} · ${esc(def.deal)}</p>` : ""}
        ${qs.map(q => `<div class="lead-q" data-k="${q.k}"><p class="lead-qt">${q.q}${q.sub ? ` <small>${q.sub}</small>` : ""}</p>
          ${q.t === "chips" ? `<div class="lead-op">${q.o.map(o => `<button type="button" class="${a[q.k] === o ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`
            : `<label class="lead-in"><input ${q.t === "money" ? 'type="number" inputmode="decimal" min="0"' : 'type="text"'} placeholder="${esc(q.ph || "")}" value="${esc(a[q.k] || "")}">${q.unit ? `<span>${q.unit}</span>` : ""}</label>`}</div>`).join("")}
        <div class="lead-out"></div>`;
      body.querySelectorAll(".lead-q").forEach(el => {
        const k = el.dataset.k;
        el.querySelectorAll("button").forEach(b => b.onclick = () => { a[k] = b.dataset.v; render(); });
        const inp = el.querySelector("input"); if (inp) inp.oninput = () => { a[k] = inp.value.trim(); out(); };
      });
      out();
    };
    const out = () => {
      const gr = grade(kind, a), box = body.querySelector(".lead-out");
      if (!gr) { box.innerHTML = `<p class="lead-wait">질문에 답하시면 의뢰 내용이 정리돼요.</p>`; return; }
      if (gr.g === "P") {
        box.innerHTML = `<div class="lead-prep"><b>지금은 준비 단계예요</b>
          <p>${gr.gg ? "경기 지역은 직접 중개하지 않아서, 3개월 안에 매수 계획이 확실할 때만 가능 여부를 확인해 드려요." : "아직 시기가 남았다면 지금은 시세 흐름과 자금 계획을 잡아두는 게 좋아요."} 시기가 가까워지면 그때 의뢰해 주세요.</p>
          <div class="lead-sv">${ctx.cx ? `<a href="/check/?t=imjang&n=${encodeURIComponent(ctx.cx.name)}&a=${encodeURIComponent(ctx.cx.area || "")}">📝 임장 체크리스트</a>` : `<a href="/check/?t=jachwi">📝 계약 체크리스트</a>`}
          <a href="/tools/#budget">💰 예산 계산해 보기</a><a href="/tools/#news">📰 정책 뉴스 보기</a>
          <a href="${KAKAO}/friend" target="_blank" rel="noopener">💬 채널 친구 추가</a></div></div>`;
        return;
      }
      const msg = message(kind, ctx, a, gr);
      box.innerHTML = `<div class="lead-res"><p>✓ ${gr.g === "A" ? "바로 매물 확인이 가능한 조건이에요" : gr.g === "B" ? "확인 후 연락드릴게요" : kind === "owner" ? "이 내용으로 접수할게요" : "가능 여부를 확인해 드릴게요"}</p>
        ${gr.note ? `<p class="lead-note">${gr.note}</p>` : ""}<pre class="lead-msg">${esc(msg)}</pre></div>
        <button type="button" class="lead-go">의뢰 내용 복사하고 카톡 열기</button>
        <p class="lead-fine">카톡 창이 열리면 붙여넣기만 하세요 · 입력한 내용은 사이트에 저장되지 않아요<br>${NOTE}</p>`;
      box.querySelector(".lead-go").onclick = async () => {
        let ok = false;
        try { await navigator.clipboard.writeText(msg); ok = true; } catch (e) { /* 아래에서 수동 복사 안내 */ }
        window.open(`${KAKAO}/chat`, "_blank", "noopener");
        box.querySelector(".lead-fine").innerHTML = ok ? "✓ 복사됐어요. 카톡 대화창에 붙여넣기 해주세요." : "자동 복사가 안 됐어요. 위 내용을 길게 눌러 복사해 주세요.";
      };
    };
    render();
  }
  window.GS_lead = { open };
})();
