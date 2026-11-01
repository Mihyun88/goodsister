/* S-4: 큰 데이터(trades 2.4MB, rents 4.1MB)는 필요한 탭을 처음 열 때만 불러온다.
   전역 변수 이름(GS_TRADES, GS_RENTS)은 그대로. */
window.GS_load = (() => {
  const P = {}, VAR = { trades: "GS_TRADES", rents: "GS_RENTS" };
  return name => P[name] || (P[name] = window[VAR[name]] ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = `data/${name}.js`; s.onload = () => res();
    s.onerror = () => { delete P[name]; rej(new Error(`data/${name}.js 로드 실패`)); };
    document.head.appendChild(s);
  }));
})();
