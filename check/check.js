/* 체크리스트: 체크·별점·메모는 이 폰(localStorage)에만 저장. 서버 전송 없음.
   내보내기: 노션 붙여넣기용 복사 · 공유 · 이어하기 링크 · 파일 저장/불러오기 · 캘린더(.ics) · 인쇄 */
(() => {
  const $ = s => document.querySelector(s), main = $("#main");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }, keys() { try { return Object.keys(localStorage); } catch (e) { return []; } } };
  const toast = t => { const el = document.createElement("div"); el.className = "toast"; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 2200); };

  // [id, 항목, 설명, (잔금) 잔금일 기준 일수]
  const LISTS = {
    imjang: { title: "임장 체크리스트", emoji: "<i class='ic' data-i='check'></i>", desc: "단지를 직접 보러 갈 때. 항목마다 별점과 메모를 남기면 다녀온 단지끼리 비교할 수 있어요.", stars: true, ctx: ["단지명", "면적(㎡)"],
      groups: [
        ["<i class='ic' data-i='train'></i>교통", [["t1", "역까지 실제 걸린 시간", "출퇴근 시간대에 직접 걸어보기"], ["t2", "버스 정류장·노선", "회사·학교 방향 노선이 있는지"], ["t3", "출퇴근길 언덕·횡단보도", "지도 거리보다 체감이 중요해요"]]],
        ["<i class='ic' data-i='building'></i>단지", [["d1", "동 위치·동 간 거리", "앞 동에 가리는지, 사생활 노출"], ["d2", "주차", "세대당 대수, 지하주차장 엘리베이터 연결"], ["d3", "관리 상태", "복도·엘리베이터·외벽·분리수거장"], ["d4", "단지 안 경사·커뮤니티", "유모차·노약자 동선"]]],
        ["<i class='ic' data-i='home'></i>집 안 (매물 볼 때)", [["h1", "채광·방향", "오전/오후 해 드는 방향, 앞 건물"], ["h2", "소음", "도로·층간·학교·상가 소음"], ["h3", "누수·결로·곰팡이", "창틀·천장 모서리·베란다·욕실"], ["h4", "수압·배수", "욕실·주방 물 틀어보기"], ["h5", "수리 상태", "샷시·욕실·주방, 수리 비용 예상"], ["h6", "조망", "막힘 여부, 앞으로 들어설 건물"]]],
        ["<i class='ic' data-i='cart'></i>주변", [["s1", "학교·학원 거리", "초등학교 배정과 통학로"], ["s2", "마트·병원·공원", "걸어서 갈 수 있는지"], ["s3", "공사·유해시설", "근처 공사 예정, 소음·냄새"], ["s4", "밤 분위기", "저녁에 한 번 더 가보기"]]],
        ["<i class='ic' data-i='doc'></i>매물 서류 (중개사와 확인)", [["p1", "등기부등본", "소유자 일치, 근저당·압류"], ["p2", "건축물대장", "위반건축물 여부"], ["p3", "관리비·체납", "최근 관리비와 미납"], ["p4", "토지거래허가 대상 여부", "서울 아파트는 허가·실거주 의무 확인"]]],
      ] },
    jangeum: { title: "잔금 30일 체크리스트", emoji: "<i class='ic' data-i='calendar'></i>", desc: "계약 후 잔금일까지. 잔금일을 넣으면 할 일을 휴대폰 캘린더에 한 번에 넣을 수 있어요.", ctx: ["단지·주소", "잔금일"], date: true,
      groups: [
        ["D-30 ~ D-14", [["j1", "주택담보대출 신청·서류 제출", "은행 2곳 이상 비교", -30], ["j2", "이사업체 예약", "손 없는 날·주말은 일찍 마감돼요", -30], ["j3", "법무사 견적 비교", "보수·채권 할인율 확인", -21], ["j4", "대출 승인·실행일 확정", "잔금일 오전 실행으로 맞추기", -14], ["j5", "입주 청소·수리 예약", "잔금 다음 날 이후로", -14]]],
        ["D-7 ~ D-1", [["j6", "관리비·공과금 정산 방법 확인", "관리사무소에 중간 정산 요청", -7], ["j7", "인터넷·도시가스 이전 신청", "", -7], ["j8", "계좌 이체 한도 늘리기", "잔금 이체 금액 이상으로", -3], ["j9", "등기부등본 다시 확인", "계약 뒤 새 근저당·압류가 없는지", -1]]],
        ["잔금일", [["j10", "잔금 전 등기부 최종 확인", "당일 아침", 0], ["j11", "선수관리비·장기수선충당금 정산", "", 0], ["j12", "열쇠·비밀번호·관리사무소 등록", "", 0], ["j13", "소유권이전등기 신청", "보통 법무사가 당일 접수", 0]]],
        ["잔금 후", [["j14", "취득세 신고·납부", "취득일부터 60일 안 (보통 등기 때 함께)", 0], ["j15", "전입신고", "이사 후 14일 안 · 정부24", 14], ["j16", "감면·허가 조건 지키기", "생애최초 감면은 3개월 안 실거주 시작, 토지거래허가는 허가받은 대로 입주", 90]]],
      ] },
    jachwi: { title: "자취방 계약 체크리스트", emoji: "<i class='ic' data-i='key'></i>", desc: "원룸·오피스텔 전월세 계약 전후로 꼭 볼 것만.", ctx: ["건물명·주소", "보증금/월세"],
      groups: [
        ["계약 전", [["c1", "등기부등본 발급", "소유자, 근저당·압류·가압류"], ["c2", "집주인 신분증과 소유자 일치", "대리인이면 위임장·인감증명서"], ["c3", "건축물대장 용도", "주거용인지, 위반건축물인지"], ["c4", "선순위 보증금·근저당 합계", "다가구라면 먼저 들어온 세입자 보증금까지"], ["c5", "전세보증보험 가입 가능 여부", "전세·고액 보증금이라면"], ["c6", "관리비 포함 항목", "인터넷·수도·가스·청소비"], ["c7", "옵션·하자 사진", "에어컨·세탁기·벽지·바닥"]]],
        ["계약 당일", [["c8", "특약 확인", "수리 책임, 원상복구 범위, 반려동물, 중도 퇴실"], ["c9", "계약금은 집주인 명의 계좌로", "다른 사람 명의면 멈추기"]]],
        ["입주 후", [["c10", "전입신고", "이사 후 14일 안 · 정부24"], ["c11", "확정일자", "인터넷등기소 또는 주민센터"], ["c12", "입주 날 하자 사진 남기기", "퇴실 때 분쟁 예방"], ["c13", "공과금·인터넷 명의 변경", ""]]],
      ] },
  };

  const P = new URLSearchParams(location.search), type = P.get("t");
  if (!LISTS[type]) return home();
  const L = LISTS[type], key = `gs_chk:${type}:${P.get("n") || ""}`;
  let S = store.get(key, null) || { c: {}, m: {}, s: {}, ctx: [P.get("n") || "", P.get("a") || ""] };
  // 이어하기 링크(#s=...)로 들어오면 그 상태로 시작
  if (location.hash.startsWith("#s=")) {
    try { S = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(3).replace(/-/g, "+").replace(/_/g, "/"))))); toast("이어서 체크할게요"); } catch (e) { toast("링크를 읽지 못했어요"); }
    history.replaceState(null, "", location.pathname + location.search);
  }
  const items = L.groups.flatMap(g => g[1]);
  let saved = false;
  const persist = () => { S.at = new Date().toISOString(); if (!store.set(key, S) && !saved) { toast("이 브라우저는 자동 저장이 안 돼요. 아래 ‘내 폰에 저장’을 눌러주세요"); saved = true; } nudge(); bar(); };

  function draw() {
    document.title = `${L.title} · 착한언니복덕방`;
    main.innerHTML = `<a class="back" href="./">‹ 체크리스트 목록</a>
      <h1 style="margin-top:6px">${L.emoji} ${L.title}</h1><p class="lead">${L.desc}</p>
      <p class="privacy"><i class='ic' data-i='lock'></i>체크한 내용은 <b>이 폰에만</b> 저장되고 착한언니 서버로 보내지 않아요.</p>
      <div class="ctx">${L.ctx.map((t, i) => `<label>${t}<input data-ctx="${i}" ${L.date && i === 1 ? 'type="date"' : 'type="text"'} value="${esc(S.ctx[i] || "")}"></label>`).join("")}</div>
      <div class="prog"><i></i></div><div class="progrow"><p class="progt"></p><label class="onlyopen"><input type="checkbox" id="onlyopen"> 미완료만 보기</label></div>
      ${L.groups.map(([g, list]) => `<section class="grp"><h2>${g}</h2>${list.map(([id, t, d, off]) => `
        <div class="it ${S.c[id] ? "done" : ""}" data-id="${id}"><label class="row"><input type="checkbox" ${S.c[id] ? "checked" : ""}>
          <span class="t">${off != null && L.date ? `<span class="dd">${off === 0 ? "D-day" : off < 0 ? `D${off}` : `D+${off}`}</span>` : ""}${esc(t)}${d ? `<small>${esc(d)}</small>` : ""}</span></label>
          <div class="ex">${L.stars ? `<span class="stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" class="${(S.s[id] || 0) >= n ? "on" : ""}" aria-label="${n}점">★</button>`).join("")}</span>` : ""}
            <input class="memo" placeholder="메모" value="${esc(S.m[id] || "")}"></div></div>`).join("")}</section>`).join("")}
      <section class="save"><h2>내가 원하는 곳에 저장하기</h2><p>이 폰에 자동 저장돼요. 브라우저 기록을 지우면 사라지니, 다 하면 아래로 옮겨두세요.</p>
        <div class="btns">
          <button type="button" class="p" data-x="notion"><i class='ic' data-i='report'></i>노션에 붙여넣기용 복사</button>
          <button type="button" data-x="share"><i class='ic' data-i='chat'></i>카톡·문자로 보내기</button>
          <button type="button" data-x="link"><i class='ic' data-i='link'></i>이어하기 링크 복사</button>
          <button type="button" data-x="file"><i class='ic' data-i='save'></i>내 폰에 파일로 저장</button>
          <label><i class='ic' data-i='upload'></i>파일 불러오기<input type="file" accept=".json,application/json" data-x="load"></label>
          <button type="button" data-x="print"><i class='ic' data-i='print'></i>인쇄·PDF</button>
        </div>
        ${L.date ? `<div class="cal"><span style="font-size:13px;font-weight:700"><i class='ic' data-i='calendar'></i>캘린더</span><button type="button" class="p" data-x="ics" style="border:0;border-radius:10px;padding:9px 12px;font:inherit;font-weight:700;background:var(--navy);color:#fff;cursor:pointer">할 일 일정으로 넣기</button></div><p class="progt">위에 잔금일을 넣으면 D-30부터 날짜가 계산돼요.</p>` : ""}
      </section>
      ${cta()}`;
    bind(); bar();
  }
  function cta() {
    if (type === "imjang") return `<div class="cta2 no-print"><b>다녀온 단지, 매물까지 보고 싶다면</b><br>임장 메모 요약이 의뢰 내용에 같이 들어가요. 서울 아파트만 직접 중개해요.<br><button type="button" id="ask">이 단지 매물 의뢰하기</button></div>`;
    if (type === "jangeum") return `<div class="cta2 no-print"><b>착한언니 고객이라면</b><br>법무사·세무사·입주 청소까지 믿을 만한 곳으로 연결해 드려요. 담당 중개사에게 말씀해 주세요.</div>`;
    return `<div class="cta2 no-print"><b>신촌·서대문·마포 오피스텔을 찾고 있다면</b><br>입주일과 주거비만 알려주시면 조건에 맞는 방을 확인해 드려요.<br><button type="button" id="ask">입주 조건 알려주기</button></div>`;
  }
  function bar() {
    const n = items.filter(x => S.c[x[0]]).length;
    $(".prog i").style.width = `${Math.round(n / items.length * 100)}%`;
    $(".progt").textContent = `${items.length}개 중 ${n}개 확인${L.stars ? ` · 평균 ★ ${avg(S)}` : ""}`;
  }
  function avg(s) { const v = Object.values(s.s || {}).filter(Boolean); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "-"; }
  function bind() {
    $("#onlyopen").onchange = e => main.classList.toggle("hide-done", e.target.checked);
    main.querySelectorAll("[data-ctx]").forEach(inp => inp.oninput = () => { S.ctx[+inp.dataset.ctx] = inp.value; persist(); });
    main.querySelectorAll(".it").forEach(el => {
      const id = el.dataset.id;
      el.querySelector("input[type=checkbox]").onchange = e => { S.c[id] = e.target.checked; el.classList.toggle("done", e.target.checked); persist(); };
      el.querySelector(".memo").oninput = e => { S.m[id] = e.target.value; persist(); };
      el.querySelectorAll(".stars button").forEach(b => b.onclick = () => { S.s[id] = S.s[id] === +b.dataset.n ? 0 : +b.dataset.n;
        el.querySelectorAll(".stars button").forEach(x => x.classList.toggle("on", +x.dataset.n <= (S.s[id] || 0))); persist(); });
    });
    main.querySelectorAll("[data-x]").forEach(b => (b.type === "file" ? b.onchange = () => act("load", b) : b.onclick = () => act(b.dataset.x)));
    const ask = $("#ask");
    if (ask) ask.onclick = () => type === "imjang"
      ? GS_lead.open({ kind: "buy", cx: { name: S.ctx[0] || "임장한 단지", area: S.ctx[1] || "" } })
      : GS_lead.open({ kind: "offi" });
  }

  function text(md) {
    const head = `${L.title}${S.ctx.filter(Boolean).length ? ` — ${S.ctx.filter(Boolean).join(" · ")}` : ""}`;
    const lines = [md ? `# ${head}` : head, ""];
    for (const [g, list] of L.groups) {
      lines.push(md ? `## ${g}` : `[${g}]`);
      for (const [id, t] of list) {
        const st = S.s[id] ? ` (★${S.s[id]})` : "", m = S.m[id] ? ` — ${S.m[id]}` : "";
        lines.push(md ? `- [${S.c[id] ? "x" : " "}] ${t}${st}${m}` : `${S.c[id] ? "☑" : "☐"} ${t}${st}${m}`);
      }
      lines.push("");
    }
    lines.push(`착한언니복덕방 체크리스트 · unnizip.kr/check/`);
    return lines.join("\n");
  }
  const copy = async (t, ok) => { try { await navigator.clipboard.writeText(t); toast(ok); } catch (e) { prompt("아래 내용을 복사하세요", t); } };
  const fname = ext => `${L.title.replace(/\s/g, "")}${S.ctx[0] ? "_" + S.ctx[0].replace(/[\\/:*?"<>|\s]/g, "") : ""}.${ext}`;
  async function saveFile(name, data, mime) {
    const file = new File([data], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === "AbortError") return; } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  async function act(x, el) {
    if (x === "notion") return copy(text(true), "복사됐어요. 노션에 붙여넣으면 체크박스로 바뀌어요");
    if (x === "share") { const t = text(false); if (navigator.share) { try { await navigator.share({ title: L.title, text: t }); } catch (e) { /* 취소 */ } } else copy(t, "복사됐어요. 카톡 ‘나와의 채팅’에 붙여넣으세요"); return; }
    if (x === "link") { const b = btoa(unescape(encodeURIComponent(JSON.stringify(S)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return copy(`${location.origin}${location.pathname}${location.search}#s=${b}`, "링크를 복사했어요. 다른 폰에서 열면 이어서 체크돼요"); }
    if (x === "file") return saveFile(fname("json"), JSON.stringify({ app: "unnizip-check", type, S }, null, 1), "application/json");
    if (x === "load") { const f = el.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (d.app !== "unnizip-check" || d.type !== type) throw 0; S = d.S; persist(); draw(); toast("불러왔어요"); } catch (e) { toast("이 체크리스트 파일이 아니에요"); } return; }
    if (x === "print") return window.print();
    if (x === "ics") {
      const d0 = S.ctx[1]; if (!d0) { toast("잔금일을 먼저 넣어주세요"); $("[data-ctx='1']").focus(); return; }
      const base = new Date(d0 + "T00:00:00"), pad = n => String(n).padStart(2, "0"), ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
      const ev = items.filter(it => it[3] != null).map(([id, t, d, off]) => { const s = new Date(base); s.setDate(s.getDate() + off); const e = new Date(s); e.setDate(e.getDate() + 1);
        return ["BEGIN:VEVENT", `UID:${id}-${ymd(base)}@unnizip.kr`, `DTSTAMP:${ymd(new Date())}T000000Z`, `DTSTART;VALUE=DATE:${ymd(s)}`, `DTEND;VALUE=DATE:${ymd(e)}`,
          `SUMMARY:[잔금] ${t}`.replace(/[,;]/g, " "), `DESCRIPTION:${(d || "").replace(/[,;\n]/g, " ")}`, "END:VEVENT"].join("\r\n"); });
      return saveFile("잔금일정.ics", ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//unnizip.kr//check//KO", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n"), "text/calendar");
    }
  }
  // 몇 개 체크하면 한 번만 저장 안내
  function nudge() {
    if (sessionStorage.getItem("gs_nudged") || Object.values(S.c).filter(Boolean).length < 3) return;
    try { sessionStorage.setItem("gs_nudged", "1"); } catch (e) { /* 무시 */ }
    const n = document.createElement("div"); n.className = "nudge";
    n.innerHTML = `<span>체크한 내용은 이 폰에만 있어요. 노션이나 파일로 옮겨둘까요?</span><button type="button">저장하기</button><button type="button" class="x" aria-label="닫기">✕</button>`;
    document.body.appendChild(n);
    n.querySelector("button").onclick = () => { n.remove(); $(".save").scrollIntoView({ behavior: "smooth" }); };
    n.querySelector(".x").onclick = () => n.remove(); setTimeout(() => n.remove(), 9000);
  }

  function home() {
    const visits = store.keys().filter(k => k.startsWith("gs_chk:imjang:") && k !== "gs_chk:imjang:").map(k => ({ k, s: store.get(k, {}) }))
      .filter(v => v.s && v.s.ctx).sort((a, b) => (b.s.at || "").localeCompare(a.s.at || ""));
    main.innerHTML = `<h1>공인중개사가 <em>실제로 보는 것</em> 그대로</h1>
      <p class="lead">체크한 내용은 이 폰에만 저장되고, 노션·카톡·캘린더·파일로 내가 원하는 곳에 가져갈 수 있어요.</p>
      <div class="cards">${Object.entries(LISTS).map(([k, l]) => `<a class="path" href="?t=${k}"><b>${l.emoji} ${l.title}</b><span>${l.desc}</span></a>`).join("")}</div>
      ${visits.length ? `<p class="sec">내가 다녀온 단지 <small>이 폰에 저장된 임장 기록</small></p>
        <div class="visits">${visits.map(v => `<a href="?t=imjang&n=${encodeURIComponent(v.k.slice(14))}"><span>${esc(v.s.ctx[0] || v.k.slice(14))}${v.s.ctx[1] ? ` · ${esc(v.s.ctx[1])}㎡` : ""}</span><b>★ ${avg(v.s)}</b></a>`).join("")}</div>` : ""}`;
  }
  draw();
})();
