"""단지 상세용 데이터: 서울·경기 아파트 단지별 매매(12개월) + 전월세(6개월)
   → tools/data/cx/index.json (검색용) , tools/data/cx/{시군구코드}.json (단지별 거래)
   DATA_GO_KR_KEY 필요. 약 30~40분.
   python3 scripts/build_cx.py [--region seoul|gg|all] [--trade-months 12] [--rent-months 6]
"""
import argparse, datetime as dt, json, os, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_data import GU, fetch, months_back, num, won  # noqa: E402

GG = {"41111": "수원시 장안구", "41113": "수원시 권선구", "41115": "수원시 팔달구", "41117": "수원시 영통구",
      "41131": "성남시 수정구", "41133": "성남시 중원구", "41135": "성남시 분당구", "41150": "의정부시",
      "41171": "안양시 만안구", "41173": "안양시 동안구", "41192": "부천시 원미구", "41194": "부천시 소사구",
      "41196": "부천시 오정구", "41210": "광명시", "41220": "평택시", "41250": "동두천시",
      "41271": "안산시 상록구", "41273": "안산시 단원구", "41281": "고양시 덕양구", "41285": "고양시 일산동구",
      "41287": "고양시 일산서구", "41290": "과천시", "41310": "구리시", "41360": "남양주시", "41370": "오산시",
      "41390": "시흥시", "41410": "군포시", "41430": "의왕시", "41450": "하남시", "41461": "용인시 처인구",
      "41463": "용인시 기흥구", "41465": "용인시 수지구", "41480": "파주시", "41500": "이천시", "41550": "안성시",
      "41570": "김포시", "41590": "화성시", "41591": "화성시 만세구", "41593": "화성시 효행구",
      "41595": "화성시 병점구", "41597": "화성시 동탄구", "41610": "광주시", "41630": "양주시", "41650": "포천시",
      "41670": "여주시", "41800": "연천군", "41820": "가평군", "41830": "양평군"}
SEOUL = {k: f"서울 {v}" for k, v in GU.items()}
GGN = {k: f"경기 {v}" for k, v in GG.items()}
OUT = Path(__file__).resolve().parent.parent / "tools" / "data" / "cx"
TRADES_JS = OUT.parent / "trades.js"


def ymd(r):
    return f"{r.get('dealYear')}{int(num(r.get('dealMonth'), int)):02d}{int(num(r.get('dealDay'), int)):02d}"


def grab(key, kind, codes, months):
    jobs = [(c, m) for c in codes for m in months]
    res = {}
    with ThreadPoolExecutor(6) as ex:
        futs = {ex.submit(fetch, key, kind, c, m): (c, m) for c, m in jobs}
        for i, f in enumerate(futs):
            res[futs[f]] = f.result()
            if i % 50 == 0:
                print(f"  {kind} {i}/{len(jobs)}", flush=True)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--region", default="all", choices=["seoul", "gg", "all"])
    ap.add_argument("--trade-months", type=int, default=12)
    ap.add_argument("--rent-months", type=int, default=6)
    a = ap.parse_args()
    key = os.environ.get("DATA_GO_KR_KEY") or sys.exit("DATA_GO_KR_KEY 환경변수를 설정하세요.")
    names = {**(SEOUL if a.region in ("seoul", "all") else {}), **(GGN if a.region in ("gg", "all") else {})}
    tm, rm = months_back(a.trade_months), months_back(a.rent_months)
    # 세대수: 기존 trades.js(서울)에서 (구, 동, 단지명)으로 가져옴
    hh = {}
    if TRADES_JS.exists():
        s = TRADES_JS.read_text(encoding="utf-8")
        for c in json.loads(s[s.index("{"):s.rindex("}") + 1])["complexes"]:
            if c.get("h"):
                hh[(c["g"], c["d"], c["n"])] = c["h"]
    print(f"매매 {tm[0]}~{tm[-1]}, 전월세 {rm[0]}~{rm[-1]}, 지역 {len(names)}곳", flush=True)
    cache = os.environ.get("CX_CACHE")  # 원자료 임시 저장 경로(저장소 밖). 다시 돌릴 때 API 재호출 생략
    if cache and Path(cache).exists():
        import pickle
        T, R = pickle.loads(Path(cache).read_bytes())
    else:
        T = grab(key, "apt_trade", list(names), tm)
        R = grab(key, "apt_rent", list(names), rm)
        if cache:
            import pickle
            Path(cache).write_bytes(pickle.dumps((T, R)))
    OUT.mkdir(parents=True, exist_ok=True)
    today = dt.date.today().isoformat()
    by_sgg, index = {}, []
    # 같은 지번에 여러 단지가 있으면(예: 1~4단지) 세대수가 합계로 잡혀 있어 단지별로는 쓰지 않음
    from collections import Counter
    dup = Counter((g, d, h) for (g, d, n), h in hh.items())
    hh = {k: h for k, h in hh.items() if dup[(k[0], k[1], h)] == 1}
    # 화성시(41590)는 2026.2 구 출범 전 거래 → 동 이름으로 새 구에 합침
    hw_dong = {}
    def cxof(code, r):
        cid = r.get("aptSeq") or f"{code}-{r.get('umdNm')}-{r.get('aptNm')}"
        if code.startswith("4159"):  # 화성: 구 출범 전후로 aptSeq 앞자리가 달라져 동·단지명으로 묶음
            cid = f"41590-{r.get('umdNm')}-{r.get('aptNm')}"
        sgg = code
        if code == "41590":
            sgg = hw_dong.get(r.get("umdNm"), "41590")
        d = by_sgg.setdefault(sgg, {})
        c = d.get(cid)
        if not c:
            c = d[cid] = {"n": r.get("aptNm", ""), "d": r.get("umdNm", ""), "y": num(r.get("buildYear"), int) or None,
                          "t": [], "r": []}
        return c
    for (code, m), rows in list(T.items()) + list(R.items()):
        if code in ("41591", "41593", "41595", "41597"):
            for r in rows:
                hw_dong.setdefault(r.get("umdNm"), code)
    for (code, m), rows in T.items():
        for r in rows:
            if r.get("cdealType"):
                continue
            cxof(code, r)["t"].append([ymd(r), round(num(r.get("excluUseAr")), 2), won(r.get("dealAmount")),
                                       num(r.get("floor"), int), 1 if "직거래" in r.get("dealingGbn", "") else 0])
    for (code, m), rows in R.items():
        for r in rows:
            ct = r.get("contractType", "").strip()
            cxof(code, r)["r"].append([ymd(r), round(num(r.get("excluUseAr")), 2), won(r.get("deposit")),
                                       won(r.get("monthlyRent")), num(r.get("floor"), int),
                                       1 if ct == "신규" else 0 if ct == "갱신" else None])
    # 41590 에 남은(동 매칭 안 된) 단지는 그대로 화성시로 둠
    for sgg, d in by_sgg.items():
        region = names.get(sgg, "경기 화성시")
        gu = region.split(" ", 1)[1]
        for cid, c in d.items():
            c["t"].sort(key=lambda x: x[0]); c["r"].sort(key=lambda x: x[0])
            h = hh.get((gu, c["d"], c["n"]))
            if h:
                c["h"] = h
            index.append([cid, c["n"], c["d"], c["y"], sgg, len(c["t"]), len(c["r"])])
        (OUT / f"{sgg}.json").write_text(json.dumps(
            {"updated": today, "sgg": sgg, "name": region, "tm": [tm[0], tm[-1]], "rm": [rm[0], rm[-1]], "cx": d},
            ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    index.sort(key=lambda x: -(x[5] + x[6]))
    (OUT / "index.json").write_text(json.dumps(
        {"updated": today, "tm": [tm[0], tm[-1]], "rm": [rm[0], rm[-1]],
         "source": "국토교통부 아파트 매매·전월세 실거래가", "cols": ["id", "name", "dong", "year", "sgg", "nTrade", "nRent"],
         "regions": {k: names.get(k, "경기 화성시") for k in by_sgg}, "rows": index}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"완료: 단지 {len(index)}개, 파일 {len(by_sgg) + 1}개 → {OUT}")


if __name__ == "__main__":
    main()
