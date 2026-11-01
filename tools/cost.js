/* 🧮 부대비용 계산기: 취득세·등기비용·중개보수(매매) / 중개보수·전세보증보험(전월세)
   요율 근거(2026.10 기준 확인 필요):
   - 취득세: 지방세법 제11조·제13조의2 (주택 유상취득 1~3%, 조정지역 2주택 8%·3주택 이상 12% 등), 지방교육세, 농어촌특별세
   - 생애최초 감면: 지방세특례제한법 제36조의3 (12억 이하, 최대 200만 원)
   - 국민주택채권: 주택도시기금법 시행령 별표 (서울·광역시 매입률)
   - 인지세: 인지세법 (1억 이하 주택 비과세)
   - 중개보수: 공인중개사법 시행규칙·서울시 조례 (2021.10.19 개정 상한요율)
   - 전세보증금반환보증: HUG 가입요건(주택가격의 90%, 수도권 보증금 7억 이하), 보증료율은 범위로 안내 */
(() => {
  const $ = s => document.querySelector(s);
  const won = man => { man = Math.round(man); if (!man) return "0원"; const e = Math.floor(man / 10000), r = man % 10000;
    return (e ? `${e}억` : "") + (r ? `${e ? " " : ""}${r.toLocaleString()}만` : "") + " 원"; };
  const wonW = w => `${Math.round(w).toLocaleString()}원`; // 원 단위 (소액 표시용)
  const pct = x => `${(x * 100).toFixed(2).replace(/\.?0+$/, "")}%`;

  // ---------- 취득세 ----------
  /** 반환: {rate, tax, edu, rural} 단위 만원 */
  function acqTax(price, o) {
    const eok = price / 10000, big = o.area > 85;
    if (o.kind === "offi") { // 오피스텔(주택 외 건물): 4% + 교육 0.4% + 농특 0.2%
      return { rate: 0.04, tax: price * 0.04, edu: price * 0.004, rural: price * 0.002, note: "오피스텔은 주거용으로 써도 취득 시 주택 외 건물 세율(4.6%)이 적용돼요." };
    }
    let rate, heavy = false;
    const n = o.homes; // 취득 후 주택 수
    if (n <= 1 || (n === 2 && !o.adj)) rate = eok <= 6 ? 0.01 : eok <= 9 ? (eok * 2 / 3 - 3) / 100 : 0.03;
    else if (n === 2 && o.adj || n === 3 && !o.adj) { rate = 0.08; heavy = true; }
    else { rate = 0.12; heavy = true; }
    const tax = price * rate;
    const edu = heavy ? price * 0.004 : tax * 0.1;
    const rural = !big ? 0 : heavy ? price * (rate === 0.08 ? 0.006 : 0.01) : price * 0.002;
    return { rate, tax, edu, rural, heavy };
  }

  // ---------- 국민주택채권 (서울·광역시) ----------
  function bondRate(pub, kind) { // pub: 시가표준액(만원)
    if (kind === "offi") return pub < 1000 ? 0 : pub < 5000 ? 0.025 : pub < 10000 ? 0.04 : 0.05;
    return pub < 2000 ? 0 : pub < 5000 ? 0.013 : pub < 10000 ? 0.019 : pub < 16000 ? 0.021 : pub < 26000 ? 0.023 : pub < 60000 ? 0.026 : 0.031;
  }
  // ---------- 인지세 ----------
  function stamp(price, kind) { // 만원 → 원
    if (kind !== "offi" && price <= 10000) return 0;
    return price <= 1000 ? 0 : price <= 3000 ? 20000 : price <= 5000 ? 40000 : price <= 10000 ? 70000 : price <= 100000 ? 150000 : 350000;
  }
  // ---------- 중개보수 상한 ----------
  function brokerFee(deal, amount, kind, deposit, monthly) { // 만원
    let base = amount, note = "";
    if (deal === "wolse") { base = deposit + monthly * 100; if (base < 5000) { base = deposit + monthly * 70; note = "거래금액 5천만 원 미만이라 월세×70으로 환산했어요."; } else note = "거래금액 = 보증금 + 월세×100"; }
    if (kind === "offi") { const r = deal === "sale" ? 0.005 : 0.004; return { base, rate: r, cap: null, fee: base * r, note: (note ? note + " " : "") + "전용 85㎡ 이하 주거용 오피스텔 요율이에요." }; }
    const T = deal === "sale"
      ? [[5000, .006, 25], [20000, .005, 80], [90000, .004], [120000, .005], [150000, .006], [Infinity, .007]]
      : [[5000, .005, 20], [10000, .004, 30], [60000, .003], [120000, .004], [150000, .005], [Infinity, .006]];
    const [, rate, cap] = T.find(t => base < t[0]);
    const fee = Math.min(base * rate, cap ?? Infinity);
    return { base, rate, cap: cap ?? null, fee, note };
  }

  // ---------- 화면: 모드 전환 ----------
  const form = $("#f-cost");
  const sync = () => {
    const m = form.mode.value;
    form.querySelectorAll("[data-m]").forEach(el => el.hidden = !el.dataset.m.split(" ").includes(m));
    const offi = form.kind.value === "offi";
    form.querySelectorAll("[data-house]").forEach(el => el.hidden = offi || m !== "buy");
    if (m !== "buy") form.querySelectorAll("[data-house]").forEach(el => el.hidden = true);
    const wol = form.deal.value === "wolse";
    form.querySelectorAll("[data-wolse]").forEach(el => el.hidden = !(m === "rent" && wol));
    form.querySelectorAll("[data-jeonse]").forEach(el => el.hidden = !(m === "rent"));
  };
  form.addEventListener("change", sync); sync();
  window.GS_syncCost = sync;
  // 공시가격 자동 추정 (매매가의 약 69%)
  let pubTouched = false;
  form.pub.addEventListener("input", () => pubTouched = true);
  form.price.addEventListener("input", () => { if (!pubTouched) form.pub.value = (Math.round(form.price.value * 0.69 * 100) / 100) || ""; });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const v = n => +form.elements[n].value || 0, out = $("#o-cost");
    const kind = form.kind.value;
    if (form.mode.value === "buy") {
      const price = v("price") * 10000; if (!price) { out.innerHTML = `<p class="muted">매매가를 입력해 주세요.</p>`; return; }
      const o = { kind, area: +form.area.value, homes: +form.homes.value, adj: form.adj.checked };
      const t = acqTax(price, o);
      const RL = { first: [200, "생애최초 감면"], small: [300, "생애최초 감면(소형주택)"], birth: [500, "출산·양육 감면"] }[form.relief.value];
      const reliefOk = RL && kind !== "offi" && price <= 120000 && o.homes <= 1;
      const first = reliefOk ? Math.min(t.tax, RL[0]) : 0;
      const pub = (v("pub") || v("price") * 0.69) * 10000, br = bondRate(pub, kind), bond = pub * br, bondCost = bond * v("disc") / 100;
      const st = stamp(price, kind) / 10000, reg = 1.5, law = v("law");
      const fee = brokerFee("sale", price, kind), feeV = form.vat.checked ? fee.fee * 1.1 : fee.fee;
      const taxSum = t.tax - first + t.edu + t.rural, regSum = bondCost + st + reg + law, total = taxSum + regSum + feeV;
      const R = [
        ["취득세", t.tax, `${pct(t.rate)}${t.heavy ? " (다주택 중과)" : ""}`],
        first ? [RL[1], -first, `취득세 100% 감면, 한도 ${RL[0]}만 원`] : null,
        ["지방교육세", t.edu, t.heavy ? "0.4%" : "취득세의 10%"],
        ["농어촌특별세", t.rural, t.rural ? (o.area > 85 ? "전용 85㎡ 초과" : "") : "전용 85㎡ 이하 비과세"],
      ].filter(Boolean);
      const G = [
        ["국민주택채권 할인 비용", bondCost, `공시가 ${won(pub)} × ${pct(br)} = 채권 ${won(bond)}, 즉시매도 할인율 ${v("disc")}%`],
        ["인지세", st, st ? "계약서 인지세(매수·매도인 나눠 내는 경우가 많아요)" : "1억 이하 주택 비과세"],
        ["등기 신청 수수료", reg, "소유권이전 1건 기준"],
        ["법무사 보수·제비용", law, "견적 입력값 (법무통 등에서 비교)"],
      ];
      const amt = x => Math.abs(x) < 100 && x % 1 ? wonW(Math.abs(x) * 10000) : won(Math.abs(x));
      const tr = r => `<tr><td>${r[0]}</td><td class="r">${r[1] < 0 ? "−" : ""}${amt(r[1])}</td><td class="muted">${r[2] || ""}</td></tr>`;
      out.innerHTML = `
        <div class="verdict ok">매매가 ${won(price)} · 예상 부대비용 <b>${won(total)}</b> (매매가의 ${pct(total / price)})</div>
        <div class="kpis">
          <div class="kpi"><div class="l">세금 (취득세 등)</div><div class="v">${won(taxSum)}</div></div>
          <div class="kpi"><div class="l">등기비용</div><div class="v">${won(regSum)}</div></div>
          <div class="kpi"><div class="l">중개보수 (상한${form.vat.checked ? "·부가세 포함" : ""})</div><div class="v">${won(feeV)}</div></div>
          <div class="kpi"><div class="l">잔금 때 준비할 총액</div><div class="v">${won(price + total)}</div></div>
        </div>
        <h3>세금</h3><table class="mk"><tr><th>항목</th><th class="r">금액</th><th>기준</th></tr>${R.map(tr).join("")}<tr><td><b>소계</b></td><td class="r"><b>${won(taxSum)}</b></td><td></td></tr></table>
        <h3>예상 등기비용</h3><table class="mk"><tr><th>항목</th><th class="r">금액</th><th>기준</th></tr>${G.map(tr).join("")}<tr><td><b>소계</b></td><td class="r"><b>${won(regSum)}</b></td><td></td></tr></table>
        <h3>중개보수</h3><table class="mk"><tr><th>항목</th><th class="r">금액</th><th>기준</th></tr>
          ${tr(["중개보수 상한", fee.fee, `${won(price)} × ${pct(fee.rate)}${fee.cap ? ` (한도 ${won(fee.cap)})` : ""}`])}
          ${form.vat.checked ? tr(["부가세 10%", fee.fee * 0.1, "일반과세자 사무소인 경우"]) : ""}</table>
        <div class="check"><b>착한언니 체크포인트</b><br>
          ${t.note ? `· ${t.note} (주거용 오피스텔 생애최초 감면은 2026.8 지방세 개편안으로 추진 중, 아직 미확정)<br>` : ""}
          ${RL && !reliefOk ? `· 선택한 감면은 <b>12억 이하 주택·1주택(무주택에서 첫 집)</b>일 때만 적용돼요. 이번 조건에서는 빠졌어요.<br>` : ""}
          ${reliefOk ? `· 감면은 2028.12.31까지 취득분에 적용돼요. 실거주·처분 제한을 어기면 추징돼요. 생애최초와 출산 감면은 겹쳐 받지 못해요.${form.relief.value === "small" ? " 소형주택 300만 원 한도는 아파트 제외 등 요건이 있으니 위택스에서 확인하세요." : ""}<br>` : ""}
          · 취득세는 <b>잔금일(또는 등기일) 기준 주택 수</b>로 정해져요. 일시적 2주택(기존 집을 기한 안에 처분)은 1주택 세율이 적용될 수 있어요. 서울→서울(조정지역 간) 이동은 2026.10.1부터 양도세 비과세 처분기한이 <b>2년</b>으로 줄었어요.<br>
          · 중개보수는 <b>법정 상한</b>이에요. 실제 금액은 이 안에서 협의해요.<br>
          · 국민주택채권 할인율은 매일 바뀌어요(보통 수~십 %대). 공시가격을 모르면 매매가의 약 69%로 추정했어요.<br>
          · 대출을 받으면 근저당 설정 비용(대부분 은행 부담)·인지세 일부가 추가될 수 있어요.<br>
          · 정확한 세액은 <a href="https://www.wetax.go.kr/tcp/loi/J030801M01.do" target="_blank" rel="noopener">위택스 지방세 미리계산</a>에서 한 번 더 확인하세요.</div>`;
    } else {
      const deal = form.deal.value, dep = v("dep"), mon = v("mon");
      if (!dep) { out.innerHTML = `<p class="muted">보증금을 입력해 주세요.</p>`; return; }
      const fee = brokerFee(deal === "wolse" ? "wolse" : "jeonse", dep, kind, dep, mon), feeV = form.vat.checked ? fee.fee * 1.1 : fee.fee;
      // 전세보증보험 (HUG 기준 근사)
      const hp = v("hprice") * 10000, senior = v("senior"), cap = hp * 0.9, limitDep = 70000;
      const okPrice = hp ? dep + senior <= cap : null, okDep = dep <= limitDep;
      // HUG 보증료율 (2025.3.31 신청분~): 부채비율((보증금+선순위)÷주택가격) 3구간 × 보증금 4구간. 구간별 범위로 안내
      const apt = form.ins_apt.checked, ratio = hp ? (dep + senior) / hp : null;
      const band = ratio == null ? 1 : ratio <= 0.7 ? 0 : ratio <= 0.8 ? 1 : 2;
      const RATE = apt ? [[0.00097, 0.00113], [0.00117, 0.00138], [0.00137, 0.00164]] : [[0.00111, 0.00132], [0.00142, 0.00172], [0.00172, 0.00211]];
      const [lo, hi] = RATE[band], bandTxt = ["부채비율 70% 이하", "부채비율 70~80%", "부채비율 80% 초과"][band];
      const years = v("years") || 2, dc = +form.ins_dc.value || 0;
      const ok80 = hp ? dep + senior <= hp * 0.8 : null;
      const premLo = dep * lo * years * (1 - dc), premHi = dep * hi * years * (1 - dc);
      const can = okPrice === null ? null : okPrice && okDep;
      out.innerHTML = `
        <div class="verdict ${can === false ? "bad" : can ? "ok" : "na"}">${deal === "wolse" ? `월세 보증금 ${won(dep)} / 월 ${mon}만` : `전세 ${won(dep)}`} · 중개보수 상한 <b>${won(feeV)}</b>
          ${can === null ? " · 주택가격을 넣으면 보증보험 가입 가능 여부도 확인해요." : can ? " · 전세보증보험 가입 요건을 충족할 가능성이 높아요." : " · 전세보증보험 가입이 어려울 수 있어요."}</div>
        <h3>중개보수</h3><table class="mk"><tr><th>항목</th><th class="r">금액</th><th>기준</th></tr>
          <tr><td>거래금액</td><td class="r">${won(fee.base)}</td><td class="muted">${fee.note || "보증금 기준"}</td></tr>
          <tr><td>중개보수 상한</td><td class="r">${won(fee.fee)}</td><td class="muted">${pct(fee.rate)}${fee.cap ? ` (한도 ${won(fee.cap)})` : ""}</td></tr>
          ${form.vat.checked ? `<tr><td>부가세 10%</td><td class="r">${won(fee.fee * 0.1)}</td><td class="muted">일반과세자 사무소인 경우</td></tr>` : ""}</table>
        <h3>전세보증보험 (HUG 전세보증금반환보증 기준)</h3>
        <table class="mk"><tr><th>확인 항목</th><th class="r">값</th><th>판단</th></tr>
          <tr><td>보증금 한도 (수도권 7억 이하)</td><td class="r">${won(dep)}</td><td>${okDep ? "✅ 충족" : "❌ 초과"}</td></tr>
          <tr><td>주택가격 × 90%</td><td class="r">${hp ? won(cap) : "-"}</td><td class="muted">${hp ? "" : "주택가격을 입력하세요"}</td></tr>
          <tr><td>보증금 + 선순위채권(근저당 등)</td><td class="r">${won(dep + senior)}</td><td>${okPrice === null ? "-" : okPrice ? "✅ 90% 이내" : `❌ ${won(dep + senior - cap)} 초과`}</td></tr>
          <tr><td>부채비율 (보증금+선순위 ÷ 주택가격)</td><td class="r">${ratio == null ? "-" : pct(ratio)}</td><td class="muted">${ratio == null ? "주택가격 입력 시 계산" : bandTxt}</td></tr>
          <tr><td>예상 보증료 (${years}년${dc ? `, ${dc * 100}% 감면` : ""})</td><td class="r">${won(premLo)} ~ ${won(premHi)}</td><td class="muted">연 ${pct(lo)}~${pct(hi)} (${apt ? "아파트" : "비아파트"}, ${bandTxt})</td></tr>
          <tr><td>만약 기준이 80%로 바뀌면</td><td class="r">${hp ? won(hp * 0.8) : "-"}</td><td>${ok80 === null ? "-" : ok80 ? "✅ 그래도 가능" : "⚠️ 가입이 어려워져요"}</td></tr></table>
        <div class="check"><b>착한언니 체크포인트</b><br>
          · <b>주택가격</b>은 아파트는 KB·부동산원 시세, 빌라·오피스텔 등은 보통 <b>공시가격 × 140%</b>로 봐요. 그래서 공시가격 기준으로는 <b>공시가격 × 126%</b>까지가 보증금 한도가 돼요.<br>
          · 선순위채권에는 근저당 <b>채권최고액</b>, 다가구라면 먼저 들어온 세입자 보증금도 포함돼요.<br>
          · 보증료율은 2025.3.31 신청분부터 <b>부채비율 3구간 × 보증금 4구간</b>으로 달라져요. 같은 구간 안에서도 보증금 규모에 따라 차이가 있어 범위로 보여드려요. 실제 금액은 <b>HUG 안심전세 앱</b>이나 은행에서 확인하세요.<br>
          · HUG는 가입 기준을 <b>90% → 80%</b>로 낮추는 방안을 추진 중이에요(2026.10 국정감사, 시행 시점 미정).<br>
          · 가입 요건·요율은 정부 정책에 따라 자주 바뀌어요. 계약 전에 꼭 최신 기준을 확인하세요.<br>
          · 중개보수는 법정 상한이며, 실제 금액은 이 안에서 협의해요.</div>`;
    }
  });
  window.GS_COST = { acqTax, bondRate, stamp, brokerFee };
})();
