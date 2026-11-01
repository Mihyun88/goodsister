/* 결과 공유: 요약 복사 · 공유하기(카톡·문자) · 같은 결과가 열리는 링크
   링크 형식: tools/#budget?cash=3&inc=6000...  → 열면 입력값을 채우고 자동 계산 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const T = s => (s || "").replace(/\s+/g, " ").trim();
  const KAKAO = "http://pf.kakao.com/_xcxoBxnX";
  const FORMS = { budget: "f-budget", rent: "f-rent", check: "f-check", cost: "f-cost" };

  // ---------- 입력값 ↔ 링크 ----------
  function params(key) {
    const f = document.getElementById(FORMS[key]), q = new URLSearchParams();
    for (const el of f.elements) {
      if (!el.name || el.name === "cx") continue;
      if (el.type === "radio") { if (el.checked) q.set(el.name, el.value); continue; }
      if (el.type === "checkbox") q.set(el.name, el.checked ? 1 : 0);
      else if (el.value !== "") q.set(el.name, el.value);
    }
    if (key === "budget") { const g = [...document.querySelectorAll("#gu-chips .on")].map(c => c.textContent); if (g.length) q.set("gu", g.join(",")); }
    if (key === "check") { const s = $("#apt-sel"); if (s.selectedIndex >= 0 && s.value !== "") q.set("cxl", s.options[s.selectedIndex].text); }
    return q;
  }
  const linkFor = key => `${location.origin}${location.pathname}#${key}?${params(key).toString()}`;

  function restore() {
    const h = decodeURIComponent(location.hash.slice(1)), [key, qs] = h.split("?");
    if (!FORMS[key] || !qs) return;
    const q = new URLSearchParams(qs), f = document.getElementById(FORMS[key]);
    for (const [k, v] of q) {
      const el = f.elements[k];
      if (!el || k === "cx" || k === "ar") continue;
      if (el instanceof RadioNodeList) { el.value = v; continue; }
      if (el.type === "checkbox") el.checked = v === "1"; else el.value = v;
    }
    if (key === "budget" && window.GS_syncLoan) window.GS_syncLoan();
    if (key === "cost" && window.GS_syncCost) window.GS_syncCost();
    if (key === "budget" && q.get("gu")) {
      const set = new Set(q.get("gu").split(","));
      document.querySelectorAll("#gu-chips .chip").forEach(c => c.classList.toggle("on", set.has(c.textContent)));
    }
    if (key === "check") {
      const qi = $("#apt-q"); qi.dispatchEvent(new Event("input"));
      const s = $("#apt-sel"), want = q.get("cxl");
      const opt = [...s.options].find(o => o.text === want);
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event("change")); }
      if (q.get("ar")) $("#ar-sel").value = q.get("ar");
      if (!opt) return; // 단지를 못 찾으면 자동 계산하지 않음
    }
    f.requestSubmit();
  }

  // ---------- 요약 문장 ----------
  const head = t => `🏠 착한언니복덕방 AI | ${t}`;
  const tail = key => `\n\n🔗 결과 다시 보기\n${linkFor(key)}\n\n※ 국토부 실거래가·한국부동산원 자료 기준 참고용이에요.\n💬 상담: 착한언니복덕방 카카오톡 ${KAKAO}`;
  const rows = (sel, n, fn) => [...document.querySelectorAll(sel)].slice(0, n).map(fn).filter(Boolean);

  function summary(key) {
    if (key === "budget") {
      const f = $("#f-budget"), v = n => f.elements[n].value;
      const hz = rows("#o-budget .hz", 4, b => `· ${T($(".t", b).textContent)}: ${T($(".p", b).textContent)}`);
      const cur = T($("#o-budget .hz.on .t")?.textContent);
      const lim = T($("#o-budget .lim")?.textContent).replace(/^.*?기준 · /, "").split(" · 월 상환")[0].replace(/ (5년|[0-9]+년) 뒤 집값.*$/, "");
      const dongs = rows("#o-budget .kpis .kpi", 3, k => T($(".v", k)?.textContent)).join(", ");
      const top = rows("#o-budget table tr", 6, (tr, i) => {
        const td = tr.querySelectorAll("td"); if (!td.length) return null;
        return `${T(td[0].firstChild?.textContent || td[0].textContent)} (${T(td[1].textContent)}) ${T(td[2].textContent)} ${T(td[3].textContent)}`;
      }).slice(0, 5).map((s, i) => `${i + 1}. ${s}`);
      return `${head("내 예산으로 서울 어디까지?")}
\n📝 조건: 현금 ${v("cash")}억 · 보증금 ${v("dep")}억 · 연소득 ${Number(v("inc")).toLocaleString()}만 · 월 저축 ${v("save")}만${f.elements.first.checked ? " · 생애최초" : ""} · 대출 ${{ max: "최대한", custom: `${v("loan")}억까지`, none: "없이" }[f.loanmode.value]}
\n💰 살 수 있는 최대 매매가 (오늘 시세 기준)\n${hz.join("\n")}
\n📌 ${cur} 기준: ${lim}${dongs ? `\n📍 이 가격대 거래 많은 동네: ${dongs}` : ""}
${top.length ? `\n🏢 추천 단지 (최근 6개월 중위가)\n${top.join("\n")}` : ""}${tail("budget")}`;
    }
    if (key === "rent") {
      const f = $("#f-rent"), v = n => f.elements[n].value, dest = f.elements.dest.selectedOptions[0]?.text;
      const verdict = T($("#o-rent .verdict")?.textContent);
      const top = rows("#o-rent table tr", 6, tr => {
        const td = tr.querySelectorAll("td"); if (!td.length) return null;
        return `${T(td[0].textContent)} · 통근 ${T(td[1].textContent)} · 조건 맞는 집 ${T(td[2].textContent).split(" ")[0]} · 월세 중위 ${T(td[3].textContent)}`;
      }).slice(0, 5).map((s, i) => `${i + 1}. ${s}`);
      return `${head("첫 자취 동네 추천")}
\n📝 조건: ${dest} · 보증금 ${Number(v("dep")).toLocaleString()}만 · 월세 ${v("mon")}만 이하 · ${f.elements.size.selectedOptions[0].text.split(" (")[0]} · 편도 ${v("max")}분
\n✅ ${verdict}
${top.length ? `\n🗺️ 동네 비교\n${top.join("\n")}` : ""}${tail("rent")}`;
    }
    if (key === "cost") {
      const verdict = T($("#o-cost .verdict")?.textContent);
      const blocks = [...document.querySelectorAll("#o-cost h3")].map(h => {
        const t = h.nextElementSibling; if (!t || t.tagName !== "TABLE") return "";
        const lines = [...t.querySelectorAll("tr")].slice(1).map(tr => { const td = tr.querySelectorAll("td"); return td.length >= 2 ? `· ${T(td[0].textContent)}: ${T(td[1].textContent)}${td[2] && T(td[2].textContent) && !/소계/.test(td[0].textContent) ? ` (${T(td[2].textContent)})` : ""}` : ""; }).filter(Boolean);
        return `\n${T(h.textContent)}\n${lines.join("\n")}`;
      }).join("\n");
      return `${head("부대비용 계산")}\n\n🧮 ${verdict}\n${blocks}${tail("cost")}`;
    }
    if (key === "check") {
      const verdict = T($("#o-check .verdict")?.textContent);
      const k = rows("#o-check .kpis .kpi", 4, d => `· ${T($(".l", d).textContent)}: ${T($(".v", d).textContent)}`);
      const deals = rows("#o-check table tr", 4, tr => {
        const td = tr.querySelectorAll("td"); if (td.length < 4) return null;
        return `· ${T(td[0].textContent).replace("직거래", " (직거래)")} ${T(td[2].textContent)} ${T(td[3].textContent)}`;
      }).slice(0, 3);
      return `${head("이 아파트, 비싸게 사는 걸까?")}
\n⚖️ ${verdict}
\n${k.join("\n")}
${deals.length ? `\n📄 같은 면적 최근 거래\n${deals.join("\n")}` : ""}${tail("check")}`;
    }
  }

  // ---------- 복사 · 공유 ----------
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove(); return ok;
    }
  }
  const toastEl = Object.assign(document.createElement("div"), { className: "toast" }); document.body.appendChild(toastEl);
  const toast = m => { toastEl.textContent = m; toastEl.classList.add("on"); clearTimeout(toastEl.t); toastEl.t = setTimeout(() => toastEl.classList.remove("on"), 2200); };

  function addBar(key) {
    const out = document.getElementById("o-" + key);
    if (out.querySelector(".sharebar") || !out.querySelector(".check")) return;
    const canShare = !!navigator.share;
    const bar = document.createElement("div"); bar.className = "sharebar";
    bar.innerHTML = `<b>📤 이 결과를 가족·친구와 같이 보세요</b>
      <div class="sb-btns">
        ${canShare ? `<button type="button" data-a="share" class="sb-main">카톡·문자로 공유하기</button>` : ""}
        <button type="button" data-a="copy" class="${canShare ? "" : "sb-main"}">📋 요약 복사</button>
        <button type="button" data-a="link">🔗 결과 링크 복사</button>
      </div>`;
    bar.addEventListener("click", async e => {
      const a = e.target.closest("button")?.dataset.a; if (!a) return;
      const text = summary(key);
      if (a === "copy") toast(await copy(text) ? "요약을 복사했어요. 카톡 대화창에 붙여넣기 하세요!" : "복사가 안 됐어요. 화면을 길게 눌러 복사해 주세요.");
      if (a === "link") toast(await copy(linkFor(key)) ? "링크를 복사했어요. 열면 같은 결과가 보여요!" : "복사가 안 됐어요.");
      if (a === "share") { try { await navigator.share({ title: "착한언니복덕방 AI 결과", text }); } catch (err) { if (err && err.name !== "AbortError") toast(await copy(text) ? "요약을 복사했어요." : "공유가 안 됐어요."); } }
    });
    out.querySelector(".check").insertAdjacentElement("beforebegin", bar);
  }
  for (const key of Object.keys(FORMS)) {
    const out = document.getElementById("o-" + key);
    new MutationObserver(() => addBar(key)).observe(out, { childList: true });
  }

  // 공유 링크로 들어온 경우 자동 계산
  setTimeout(restore, 0);
  addEventListener("hashchange", () => setTimeout(restore, 0));
})();
