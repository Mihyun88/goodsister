/* 매물 의뢰 전 확인 시트 (사이트 서버에 저장하지 않음)
   GS_lead.open({ kind: "buy"|"rent"|"owner"|"offi"|"gg", cx: { name, area, region }, preset })
   답변 → 손님이 읽기 자연스러운 의뢰 문구(+ 끝에 작은 접수 표시) → 복사 후 카카오톡 채널 열기.
   문구는 "· 항목: 값" 줄 형식이라 노션 매칭 루틴이 그대로 읽을 수 있음. 시기가 먼 손님은 준비 단계 안내. */
(() => {
  const KAKAO = "https://pf.kakao.com/_xcxoBxnX";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NOTE = "퀄리티 있는 상담을 위해 예약 손님 우선으로 도와드려요. 매물 확인 후 영업일 기준 순서대로 연락드려요.";
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const days = s => s ? Math.round((new Date(s + "T00:00:00") - today()) / 864e5) : null;
  const man = v => { v = Math.round(+v); if (!v) return ""; const e = Math.floor(v / 10000), r = v % 10000; return [e ? `${e}억` : "", r ? `${r.toLocaleString()}만` : ""].filter(Boolean).join(" ") + " 원"; };
  const ymd = s => s ? s.replace(/-/g, ".") : "";
  const inPreview = () => location.pathname.startsWith("/app");

  // t: chips | money | date | text | tel. date 질문은 alt 칩(미정·협의)도 받음
  const MOVE = ["미정"];
  const Q = {
    buy: { title: "매물 의뢰 전에<br><em>몇 가지만</em> 확인할게요", deal: "매수", qs: [
      { k: "when", q: "언제까지 매수하고 싶으세요?", t: "chips", o: ["3개월 이내", "3~6개월", "6개월 이후", "미정"] },
      { k: "budget", q: "어느 가격까지 보세요?", sub: "총 매수 가능액", t: "money", unit: "억", ph: "예: 12" },
      { k: "fund", q: "자금 준비는요?", t: "chips", o: ["자기자금으로 가능", "대출 사전상담 완료", "대출 확인 중", "기존 집 매도 후"] },
      { k: "must", q: "꼭 맞아야 하는 조건 하나만", t: "chips", o: ["층", "향", "입주 날짜", "수리 상태", "학군", "없음"], opt: true } ] },
    rent: { title: "전세·월세 매물 의뢰 전에<br><em>몇 가지만</em> 확인할게요", deal: "전월세", qs: [
      { k: "where", q: "어느 동네·단지를 보세요?", t: "text", ph: "예: 공덕역 근처, 마포래미안푸르지오", show: (a, ctx) => !ctx.cx },
      { k: "move", q: "언제 입주하고 싶으세요?", t: "date", alt: MOVE },
      { k: "type", q: "전세·월세 중에", t: "chips", o: ["전세", "월세", "둘 다"] },
      { k: "dep", q: "보증금은 어디까지?", t: "money", unit: "만 원", ph: "예: 50000" },
      { k: "mon", q: "월세+관리비는 어디까지?", sub: "월세일 때만", t: "money", unit: "만 원", ph: "예: 150", opt: true, show: a => a.type && a.type !== "전세" },
      { k: "park", q: "주차가 필요해요?", t: "chips", o: ["필요 없음", "필요", "꼭 필요"], opt: true },
      { k: "must", q: "매물 볼 때 꼭 맞아야 하는 조건", t: "chips", o: ["이 단지만", "근처 단지도 괜찮아요", "통근·통학", "방 개수", "보증보험 가입 가능"], opt: true } ] },
    offi: { title: "신촌·이대 오피스텔,<br><em>입주 조건</em>을 알려주세요", deal: "오피스텔 월세", area: "신촌·서대문·마포 오피스텔을 직접 중개해요", qs: [
      { k: "move", q: "언제부터 살 집이 필요하세요?", t: "date", alt: MOVE },
      { k: "dep", q: "보증금은 어디까지?", t: "money", unit: "만 원", ph: "예: 1000" },
      { k: "mon", q: "한 달 주거비는 어디까지?", sub: "월세 + 관리비 합계", t: "money", unit: "만 원", ph: "예: 85" },
      { k: "near", q: "어디까지 걸어서 다니고 싶으세요?", t: "chips", o: ["신촌역", "이대역", "아현역", "홍대입구역", "연세대", "이화여대", "서강대", "회사 근처"] },
      { k: "nearTxt", q: "회사 이름이나 가까운 역", t: "text", ph: "예: 공덕역, ○○빌딩", show: a => a.near === "회사 근처" },
      { k: "walk", q: "걸어서 몇 분까지?", t: "chips", o: ["5분", "10분", "15분"] },
      { k: "park", q: "주차가 필요해요?", sub: "차가 있다면", t: "chips", o: ["필요 없음", "필요", "꼭 필요"] } ] },
    owner: { title: "집을 내놓기 전에<br><em>몇 가지만</em> 알려주세요", deal: "집주인", area: "아파트는 서울 전역, 오피스텔은 신촌·서대문·마포를 직접 중개해요", qs: [
      { k: "bld", q: "어느 집이에요?", sub: "단지·건물 이름", t: "text", ph: "예: 신촌○○오피스텔", show: (a, ctx) => !ctx.cx },
      { k: "ar", q: "전용면적", t: "money", unit: "㎡", ph: "예: 23", opt: true, show: (a, ctx) => !ctx.cx || !ctx.cx.area },
      { k: "deal", q: "어떻게 내놓으세요?", t: "chips", o: ["월세", "전세", "매도", "아직 고민 중"] },
      { k: "avail", q: "언제부터 들어올 수 있어요?", sub: "입주 가능일", t: "date", alt: ["지금 바로 (공실)", "협의"] },
      { k: "dep", q: "희망 보증금", sub: "모르면 비워두세요. 주변 시세와 같이 정해요", t: "money", unit: "만 원", opt: true, show: a => a.deal && a.deal !== "매도" },
      { k: "mon", q: "희망 월세", t: "money", unit: "만 원", opt: true, show: a => a.deal === "월세" },
      { k: "fee", q: "관리비", sub: "알면 적어주세요", t: "money", unit: "만 원", opt: true, show: a => a.deal === "월세" || a.deal === "전세" },
      { k: "park", q: "주차 되나요?", sub: "오피스텔은 세입자가 꼭 물어봐요", t: "chips", o: ["가능(무료)", "가능(유료)", "불가", "잘 모르겠어요"], show: a => a.deal === "월세" || a.deal === "전세" },
      { k: "parkFee", q: "주차비", t: "money", unit: "만 원/월", opt: true, show: a => a.park === "가능(유료)" },
      { k: "sale", q: "희망 매도가", t: "money", unit: "억", opt: true, show: a => a.deal === "매도" } ] },
    gg: { title: "경기 지역 <em>중개 가능 여부</em><br>먼저 확인해 드려요", deal: "경기 매수", qs: [
      { k: "when", q: "언제까지 매수하고 싶으세요?", t: "chips", o: ["3개월 이내", "3~6개월", "6개월 이후", "미정"] },
      { k: "budget", q: "어느 가격까지 보세요?", sub: "총 매수 가능액", t: "money", unit: "억", ph: "예: 8" },
      { k: "fund", q: "자금 준비는요?", t: "chips", o: ["자기자금으로 가능", "대출 사전상담 완료", "대출 확인 중", "기존 집 매도 후"] } ] },
  };

  // 등급: A 바로 확인 / B 확인 후 연락 / P 준비 단계
  function grade(kind, a, ctx) {
    if (kind === "owner") {
      if ((!ctx.cx && !a.bld) || !a.deal || !a.avail || ((a.deal === "월세" || a.deal === "전세") && !a.park)) return null;
      return { g: (a.dep || a.mon || a.sale) ? "A" : "B", ok: true, priced: !!(a.dep || a.mon || a.sale) };
    }
    if (kind === "buy" || kind === "gg") {
      if (!a.when || !a.budget || !a.fund) return null;
      if (a.when === "6개월 이후" || a.when === "미정") return { g: "P" };
      if (kind === "gg") return a.when === "3개월 이내" && /자기자금|사전상담/.test(a.fund) ? { g: "A", ok: true } : { g: "P", gg: true };
      const ready = /자기자금|사전상담/.test(a.fund);
      return { g: a.when === "3개월 이내" && ready ? "A" : "B", ok: true,
        note: ready ? "" : a.fund === "기존 집 매도 후" ? "기존 집 매도 일정을 먼저 같이 확인할게요." : "대출 가능 금액을 먼저 확인해 주시면 매물 안내가 빨라져요." };
    }
    const need = kind === "offi" ? ["move", "dep", "mon", "near", "walk", "park"] : ["move", "type", "dep", ...(ctx.cx ? [] : ["where"])];
    if (need.some(k => !a[k])) return null;
    const d = days(a.move);
    if (a.move === "미정" || d > 92) return { g: "P" };
    return { g: d > 60 ? "B" : "A", ok: true,
      note: kind === "rent" && /보증보험/.test(a.must || "") ? "보증보험 가입 가능 여부는 매물을 고른 뒤 계약 전에 같이 확인해요." : d < 0 ? "입주일이 지났어요. 날짜를 다시 확인해 주세요." : "" };
  }

  // 손님이 보내는 문구: 첫 줄은 자연스러운 문장, 그다음 "· 항목: 값" 줄, 끝에 작은 접수 표시
  function message(kind, ctx, a, gr) {
    const cx = ctx.cx ? `${ctx.cx.name}${ctx.cx.area ? ` ${ctx.cx.area}㎡` : ""}` : "";
    const dt = v => /^\d{4}-/.test(v || "") ? ymd(v) : v;
    const L = [];
    if (kind === "buy") { L.push(`${cx ? cx + " " : ""}매수 문의예요.`); L.push(`· 매수 시기: ${a.when}`, `· 예산: ${a.budget}억 원 이하`, `· 자금: ${a.fund}`); if (a.must && a.must !== "없음") L.push(`· 중요한 조건: ${a.must}`); }
    if (kind === "gg") { L.push(`${cx ? cx + " " : ""}경기 매수 중개 가능 여부 문의예요.`); L.push(`· 매수 시기: ${a.when}`, `· 예산: ${a.budget}억 원 이하`, `· 자금: ${a.fund}`); }
    if (kind === "rent") { L.push(`${cx ? cx + " " : ""}${a.type === "전세" ? "전세" : a.type === "월세" ? "월세" : "전월세"} 문의예요.`); if (a.where) L.push(`· 희망 지역: ${a.where}`); L.push(`· 입주 희망일: ${dt(a.move)}`, `· 보증금: ${man(a.dep)} 이하`); if (a.mon) L.push(`· 월세+관리비: ${a.mon}만 원 이하`); if (a.park) L.push(`· 주차: ${a.park}`); if (a.must) L.push(`· 중요한 조건: ${a.must}`); }
    if (kind === "offi") { L.push("신촌·이대 오피스텔 월세 문의예요."); L.push(`· 입주 희망일: ${dt(a.move)}`, `· 보증금: ${man(a.dep)} 이하`, `· 월세+관리비: ${a.mon}만 원 이하`, `· 위치: ${a.near === "회사 근처" && a.nearTxt ? a.nearTxt : a.near} 도보 ${a.walk}`, `· 주차: ${a.park}`); }
    if (kind === "owner") {
      L.push(`${cx || a.bld}${!cx && a.ar ? ` ${a.ar}㎡` : ""} ${a.deal === "매도" ? "매도" : a.deal === "아직 고민 중" ? "내놓기" : a.deal + " 임대"} 문의예요.`);
      L.push(`· 거래: ${a.deal}`, `· 입주 가능일: ${dt(a.avail)}`);
      if (a.dep) L.push(`· 보증금: ${man(a.dep)}`); if (a.mon) L.push(`· 월세: ${a.mon}만 원`); if (a.fee) L.push(`· 관리비: ${a.fee}만 원`); if (a.park) L.push(`· 주차: ${a.park === "잘 모르겠어요" ? "확인 필요" : a.park}${a.parkFee ? ` (월 ${a.parkFee}만 원)` : ""}`); if (a.sale) L.push(`· 희망 매도가: ${a.sale}억 원`);
      if (!gr.priced) L.push("· 희망가: 주변 시세 보고 같이 정하고 싶어요");
    }
    if (a.phone) L.push(`· 연락처: ${a.phone}`);
    L.push(`(접수 ${gr.g})`);
    return L.join("\n");
  }

  function saveCond(kind, ctx, a) {
    try { const k = "gs_lead_saved"; const L = JSON.parse(localStorage.getItem(k) || "[]").filter(x => x.kind !== kind); L.unshift({ kind, cx: ctx.cx || null, a, at: new Date().toISOString() }); localStorage.setItem(k, JSON.stringify(L.slice(0, 5))); return true; } catch (e) { return false; }
  }

  let root;
  function open(ctx) {
    const kind = ctx.kind, def = Q[kind];
    let saved = null; try { saved = JSON.parse(localStorage.getItem("gs_lead_saved") || "[]").find(x => x.kind === kind && (!ctx.cx || (x.cx && x.cx.name === ctx.cx.name))); } catch (e) { /* 무시 */ }
    const a = Object.assign({}, saved ? saved.a : {}, ctx.preset || {});
    root?.remove();
    root = document.createElement("div"); root.className = "lead-dim"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
    root.innerHTML = `<div class="lead-sheet"><button type="button" class="lead-x" aria-label="닫기">✕</button><div class="lead-body"></div></div>`;
    document.body.appendChild(root); document.body.classList.add("lead-open");
    const close = () => { root.remove(); root = null; document.body.classList.remove("lead-open"); };
    root.addEventListener("click", e => { if (e.target === root || e.target.closest(".lead-x")) close(); });
    document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", k); } });
    const body = root.querySelector(".lead-body");
    const render = () => {
      const qs = def.qs.filter(q => !q.show || q.show(a, ctx));
      body.innerHTML = `<h2 class="lead-h">${def.title}</h2>
        ${ctx.cx ? `<p class="lead-pre"><i class='ic' data-i='building'></i>${esc(ctx.cx.name)}${ctx.cx.area ? ` · ${esc(ctx.cx.area)}㎡` : ""} · ${esc(def.deal)}</p>` : ""}
        ${def.area ? `<p class="lead-area">${def.area}</p>` : ""}${ctx.hint ? `<p class="lead-area"><a href="/apt/">${esc(ctx.hint)} ›</a></p>` : ""}${saved ? `<p class="lead-area">지난번에 저장한 조건을 불러왔어요.</p>` : ""}
        ${qs.map(q => `<div class="lead-q" data-k="${q.k}"><p class="lead-qt">${q.q}${q.sub ? ` <small>${q.sub}</small>` : ""}${q.opt ? ` <small>(선택)</small>` : ""}</p>
          ${q.t === "chips" ? `<div class="lead-op">${q.o.map(o => `<button type="button" class="${a[q.k] === o ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`
            : q.t === "date" ? `<div class="lead-op"><label class="lead-in lead-date"><input type="date" value="${/^\d{4}-/.test(a[q.k] || "") ? esc(a[q.k]) : ""}"></label>${q.alt.map(o => `<button type="button" class="${a[q.k] === o ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`
            : `<label class="lead-in"><input ${q.t === "money" ? 'type="number" inputmode="decimal" min="0"' : 'type="text"'} placeholder="${esc(q.ph || "")}" value="${esc(a[q.k] || "")}">${q.unit ? `<span>${q.unit}</span>` : ""}</label>`}</div>`).join("")}
        <div class="lead-out"></div>`;
      body.querySelectorAll(".lead-q").forEach(el => {
        const k = el.dataset.k, q = def.qs.find(x => x.k === k);
        el.querySelectorAll("button").forEach(b => b.onclick = () => { a[k] = b.dataset.v; render(); });
        const inp = el.querySelector("input");
        if (inp) inp.oninput = () => { a[k] = inp.value.trim(); if (q.t === "date") el.querySelectorAll("button").forEach(b => b.classList.remove("on")); out(); };
      });
      out();
    };
    const out = () => {
      const gr = grade(kind, a, ctx), box = body.querySelector(".lead-out");
      if (!gr) {
        const miss = def.qs.filter(q => !q.opt && (!q.show || q.show(a, ctx)) && !a[q.k]).map(q => q.q.replace(/[?？].*$/, ""));
        box.innerHTML = `<button type="button" class="lead-go" disabled>의뢰 내용 확인</button><p class="lead-wait">${miss.length ? `<b>${esc(miss.slice(0, 2).join(" · "))}</b>${miss.length > 2 ? ` 외 ${miss.length - 2}개` : ""}에 답해 주세요` : "질문에 답하시면 의뢰 내용이 정리돼요."}</p>`; return;
      }
      if (gr.g === "P") {
        const condTxt = message(kind, ctx, a, { g: "준비" }).replace(/\n\(접수 준비\)$/, "");
        box.innerHTML = `<div class="lead-prep"><b>지금은 준비 단계예요</b>
          <p>${gr.gg ? "경기 지역은 직접 중개하지 않아서, 3개월 안에 매수 계획이 확실할 때만 가능 여부를 확인해 드려요." : "아직 시기가 남았다면 지금은 시세 흐름과 자금 계획을 잡아두는 게 좋아요."} 시기가 가까워지면 저장한 조건 그대로 의뢰할 수 있어요.</p>
          <button type="button" class="lead-go lead-save">내 조건 저장하기</button>
          <div class="lead-sv">${kind === "buy" || kind === "gg" ? `<a href="${inPreview() ? "#report" : "/tools/#budget"}"><i class='ic' data-i='report'></i>${inPreview() ? "진단 리포트로" : "예산 계산하기"}</a>`
            : `<a href="${kind === "offi" ? "/tools/#rent" : "/apt/"}"><i class='ic' data-i='building'></i>이 조건으로 시세 보기</a>`}
          ${ctx.cx ? `<a href="/check/?t=imjang&n=${encodeURIComponent(ctx.cx.name)}&a=${encodeURIComponent(ctx.cx.area || "")}"><i class='ic' data-i='check'></i>임장 체크리스트</a>` : `<a href="/check/?t=jachwi"><i class='ic' data-i='check'></i>계약 체크리스트</a>`}
          <a href="${KAKAO}/friend" target="_blank" rel="noopener"><i class='ic' data-i='chat'></i>채널 친구 추가</a></div></div>`;
        box.querySelector(".lead-save").onclick = async e => { const ok = saveCond(kind, ctx, a); try { await navigator.clipboard.writeText(condTxt); } catch (er) { /* 복사 안 돼도 저장은 됨 */ }
          e.target.textContent = ok ? "✓ 이 폰에 저장했어요 (복사도 했어요)" : "✓ 복사했어요"; };
        return;
      }
      box.innerHTML = `<div class="lead-res"><p>✓ 이렇게 보낼게요 · 고칠 게 있으면 위에서 바꾸세요</p>
          ${gr.note ? `<p class="lead-note">${gr.note}</p>` : ""}<pre class="lead-msg"></pre></div>
        <div class="lead-q"><p class="lead-qt">연락받을 전화번호 <small>(선택)</small></p>
          <label class="lead-in"><input type="tel" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000" value="${esc(a.phone || "")}" id="lead-phone"></label>
          <p class="lead-fine" style="text-align:left;margin-top:6px">적지 않아도 카톡으로 상담해 드려요. 적으면 이 상담 연락에만 쓰고, 상담이 끝나거나 마지막 연락 후 3개월이 지나면 지워요. <a href="/privacy/" target="_blank" rel="noopener">개인정보처리방침</a></p></div>
        <button type="button" class="lead-go">문의 내용 복사하고 카톡 열기</button>
        <p class="lead-fine lead-strong" id="lead-hint">카톡 창에 붙여넣고 보내면 문의가 접수돼요</p>
        <p class="lead-fine">입력한 내용은 이 사이트 서버에 저장되지 않아요 · ${NOTE}</p>`;
      const pre = box.querySelector(".lead-msg"), ph = box.querySelector("#lead-phone");
      const upd = () => { pre.textContent = message(kind, ctx, a, gr); };
      ph.oninput = () => { a.phone = ph.value.replace(/[^\d-]/g, "").slice(0, 13); upd(); }; upd();
      box.querySelector(".lead-go").onclick = async () => {
        const msg = message(kind, ctx, a, gr); let ok = false;
        try { await navigator.clipboard.writeText(msg); ok = true; } catch (e) { /* 수동 복사 안내 */ }
        saveCond(kind, ctx, { ...a, phone: "" });
        window.open(`${KAKAO}/chat`, "_blank", "noopener");
        box.querySelector("#lead-hint").innerHTML = ok ? "✓ 복사됐어요. 카톡 대화창에 붙여넣고 보내면 문의가 접수돼요." : "자동 복사가 안 됐어요. 위 내용을 길게 눌러 복사해서 카톡으로 보내주세요.";
      };
    };
    render();
  }
  window.GS_lead = { open };
})();
