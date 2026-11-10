/* 정식 주소(unnizip.kr)로 모으기: 예전 GitHub Pages 주소, unnizip.co.kr, www, workers.dev 로 들어오면 같은 경로로 이동 */
(function () {
  var h = location.hostname, p = location.pathname;
  if (h === "unnizip.kr" || h === "localhost" || h === "127.0.0.1") return;
  if (h === "mihyun88.github.io") p = p.replace(/^\/goodsister/, "") || "/";
  else if (!/(^|\.)unnizip\.(kr|co\.kr)$/.test(h) && !/\.workers\.dev$/.test(h)) return;
  location.replace("https://unnizip.kr" + p + location.search + location.hash);
})();
