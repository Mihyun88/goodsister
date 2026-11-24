"""단지 상세용 데이터: 서울·경기 아파트 단지별 매매(12개월) + 전월세(6개월)
   → tools/data/cx/index.json (검색용) , tools/data/cx/{시군구코드}.json (단지별 거래)
   DATA_GO_KR_KEY 필요. 약 30~40분.
   python3 scripts/build_cx.py [--region seoul|gg|all] [--trade-months 12] [--rent-months 6]
   python3 scripts/build_cx.py --recent 2   # 매주: 최근 2개월 거래만 새로 받아 기존 파일에 덮어씀 (약 3~5분)
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


def tr_row(r):
    return [ymd(r), round(num(r.get("excluUseAr")), 2), won(r.get("dealAmount")),
            num(r.get("floor"), int), 1 if "직거래" in r.get("dealingGbn", "") else 0]


def silv_row(r):
    """분양권·입주권: 매매 행 + 6번째 칸 "분"(분양권)/"입"(입주권)"""
    g = (r.get("ownershipGbn") or "").strip()[:1]
    return tr_row(r) + [g if g in ("분", "입") else "분"]


def name_map(by):
    """{sgg: {cid: c}} → {(sgg, 동, 단지명): cid} — 분양권 자료엔 단지 고유번호가 없어 이름으로 붙임"""
    return {(sg, c["d"], c["n"]): cid for sg, d in by.items() for cid, c in d.items()}


def silv_target(code, r, nm, hw_dong):
    umd, n = r.get("umdNm", ""), r.get("aptNm", "")
    if code.startswith("4159"):
        cid = f"41590-{umd}-{n}"; sg = hw_dong.get(umd, code if code != "41590" else "41590")
        return sg, cid
    return code, nm.get((code, umd, n)) or f"{code}-{umd}-{n}"


def rt_row(r):
    ct = r.get("contractType", "").strip()
    return [ymd(r), round(num(r.get("excluUseAr")), 2), won(r.get("deposit")), won(r.get("monthlyRent")),
            num(r.get("floor"), int), 1 if ct == "신규" else 0 if ct == "갱신" else None]


def grab(key, kind, codes, months):
    jobs = [(c, m) for c in codes for m in months]
    res = {}
    with ThreadPoolExecutor(int(os.environ.get("CX_WORKERS", "3"))) as ex:
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
    ap.add_argument("--offi-only", action="store_true", help="오피스텔(서대문·마포)만 다시 만들기")
    ap.add_argument("--recent", type=int, default=0, help="최근 N개월만 새로 받아 기존 cx 파일에 덮어쓰기 (주간 갱신용)")
    ap.add_argument("--silv-only", type=int, default=0, help="분양권·입주권만 최근 N개월 다시 받아 기존 cx 파일에 넣기")
    a = ap.parse_args()
    key = os.environ.get("DATA_GO_KR_KEY") or sys.exit("DATA_GO_KR_KEY 환경변수를 설정하세요.")
    if a.recent:
        return build_recent(key, a.recent)
    if a.silv_only:
        return build_silv(key, a.silv_only)
    if a.offi_only:
        return build_offi(key, a)
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
        P = pickle.loads(Path(cache).read_bytes())
        T, R = P[0], P[1]
        S = P[2] if len(P) > 2 else grab(key, "apt_silv", list(names), tm)
    else:
        T = grab(key, "apt_trade", list(names), tm)
        R = grab(key, "apt_rent", list(names), rm)
        S = grab(key, "apt_silv", list(names), tm)
    if cache:
        import pickle
        Path(cache).write_bytes(pickle.dumps((T, R, S)))
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
    # 분양권·입주권: 같은 시군구·동·단지명의 단지에 붙이고, 없으면(입주 전 단지) 새로 만듦
    nm = name_map(by_sgg)
    for (code, m), rows in S.items():
        for r in rows:
            if (r.get("cdealType") or "").strip():
                continue
            sg, cid = silv_target(code, r, nm, hw_dong)
            d = by_sgg.setdefault(sg, {})
            c = d.get(cid) or d.setdefault(cid, {"n": r.get("aptNm", ""), "d": r.get("umdNm", ""), "y": None, "t": [], "r": []})
            c["t"].append(silv_row(r))
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
         "source": "국토교통부 아파트 매매·분양권·입주권·전월세 실거래가", "cols": ["id", "name", "dong", "year", "sgg", "nTrade", "nRent"],
         "regions": {k: names.get(k, "경기 화성시") for k in by_sgg}, "rows": index}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"완료: 단지 {len(index)}개, 파일 {len(by_sgg) + 1}개 → {OUT}")


OFFI = {"11410": "서울 서대문구", "11440": "서울 마포구"}  # 직접 중개하는 지역만


def build_offi(key, a):
    """서대문·마포 오피스텔 건물별 매매(12개월)·전월세(12개월) → cx/o{sgg}.json, index.json 에 합침"""
    tm = months_back(a.trade_months); rm = months_back(12)
    T = grab(key, "offi_trade", list(OFFI), tm)
    R = grab(key, "offi_rent", list(OFFI), rm)
    today = dt.date.today().isoformat()
    by = {}
    def cxof(code, r):
        cid = f"O{code}-{r.get('umdNm')}-{r.get('offiNm')}"
        d = by.setdefault(code, {})
        return d.setdefault(cid, {"n": r.get("offiNm", ""), "d": r.get("umdNm", ""), "y": num(r.get("buildYear"), int) or None, "k": "o", "t": [], "r": []})
    for (code, m), rows in T.items():
        for r in rows:
            if (r.get("cdealType") or "").strip():
                continue
            cxof(code, r)["t"].append([ymd(r), round(num(r.get("excluUseAr")), 2), won(r.get("dealAmount")), num(r.get("floor"), int), 1 if "직거래" in r.get("dealingGbn", "") else 0])
    for (code, m), rows in R.items():
        for r in rows:
            ct = r.get("contractType", "").strip()
            cxof(code, r)["r"].append([ymd(r), round(num(r.get("excluUseAr")), 2), won(r.get("deposit")), won(r.get("monthlyRent")), num(r.get("floor"), int), 1 if ct == "신규" else 0 if ct == "갱신" else None])
    idx_path = OUT / "index.json"
    I = json.loads(idx_path.read_text(encoding="utf-8"))
    I["rows"] = [r for r in I["rows"] if not str(r[4]).startswith("o")]
    for code, d in by.items():
        sg = f"o{code}"
        for cid, c in d.items():
            c["t"].sort(key=lambda x: x[0]); c["r"].sort(key=lambda x: x[0])
            I["rows"].append([cid, c["n"], c["d"], c["y"], sg, len(c["t"]), len(c["r"])])
        I["regions"][sg] = f"{OFFI[code]} 오피스텔"
        (OUT / f"{sg}.json").write_text(json.dumps({"updated": today, "sgg": sg, "kind": "offi", "name": f"{OFFI[code]} 오피스텔",
            "tm": [tm[0], tm[-1]], "rm": [rm[0], rm[-1]], "cx": d}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    I["rows"].sort(key=lambda x: -(x[5] + x[6]))
    idx_path.write_text(json.dumps(I, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"오피스텔 건물 {sum(len(d) for d in by.values())}개 → cx/o*.json")


def build_recent(key, n):
    """최근 n개월 아파트·오피스텔 거래를 다시 받아, 기존 cx 파일에서 그 기간 거래만 갈아끼운다.
       신고가 늦게 들어오는 최근 거래를 매주 반영하기 위한 가벼운 갱신. 기간 앞쪽(오래된 달)은 월간 전체 갱신이 정리한다."""
    ms = months_back(n); cut = ms[0] + "01"; last = ms[-1]
    I = json.loads((OUT / "index.json").read_text(encoding="utf-8"))
    files = {}
    for sg in I["regions"]:
        files[sg] = json.loads((OUT / f"{sg}.json").read_text(encoding="utf-8"))
    where = {cid: sg for sg, F in files.items() for cid in F["cx"]}          # 단지 id → 파일
    hw_dong = {F["cx"][cid]["d"]: sg for sg, F in files.items() if sg in ("41591", "41593", "41595", "41597") for cid in F["cx"]}
    apt_codes = [k for k in {**SEOUL, **GGN}]
    print(f"최근 {ms[0]}~{last} 다시 받기 (아파트 {len(apt_codes)}곳 + 오피스텔 {len(OFFI)}곳)", flush=True)
    T = grab(key, "apt_trade", apt_codes, ms); R = grab(key, "apt_rent", apt_codes, ms); SV = grab(key, "apt_silv", apt_codes, ms)
    OT = grab(key, "offi_trade", list(OFFI), ms); OR_ = grab(key, "offi_rent", list(OFFI), ms)
    new = {}  # sg -> cid -> {"t": [], "r": [], meta}
    def slot(sg, cid, meta):
        d = new.setdefault(sg, {}).setdefault(cid, {"t": [], "r": [], **meta}); return d
    def apt_target(code, r):
        cid = r.get("aptSeq") or f"{code}-{r.get('umdNm')}-{r.get('aptNm')}"
        if code.startswith("4159"):
            cid = f"41590-{r.get('umdNm')}-{r.get('aptNm')}"
        sg = where.get(cid) or (hw_dong.get(r.get("umdNm"), "41590") if code == "41590" else code)
        return sg, cid, {"n": r.get("aptNm", ""), "d": r.get("umdNm", ""), "y": num(r.get("buildYear"), int) or None}
    def offi_target(code, r):
        cid = f"O{code}-{r.get('umdNm')}-{r.get('offiNm')}"
        return f"o{code}", cid, {"n": r.get("offiNm", ""), "d": r.get("umdNm", ""), "y": num(r.get("buildYear"), int) or None, "k": "o"}
    for src, tgt, key_ in ((T, apt_target, "t"), (R, apt_target, "r"), (OT, offi_target, "t"), (OR_, offi_target, "r")):
        for (code, m), rows in src.items():
            for r in rows:
                if key_ == "t" and (r.get("cdealType") or "").strip():
                    continue
                sg, cid, meta = tgt(code, r)
                if sg not in files:
                    continue
                slot(sg, cid, meta)[key_].append(tr_row(r) if key_ == "t" else rt_row(r))
    nm = name_map({sg: F["cx"] for sg, F in files.items()})
    for (code, m), rows in SV.items():
        for r in rows:
            if (r.get("cdealType") or "").strip():
                continue
            sg, cid = silv_target(code, r, nm, hw_dong)
            if sg not in files:
                continue
            slot(sg, cid, {"n": r.get("aptNm", ""), "d": r.get("umdNm", ""), "y": None})["t"].append(silv_row(r))
    # 안전장치: 새로 받은 최근 거래가 기존보다 크게 적으면(포털 장애 등) 쓰지 않음
    old_n = sum(1 for F in files.values() for c in F["cx"].values() for x in c["t"] + c["r"] if x[0] >= cut)
    new_n = sum(len(c["t"]) + len(c["r"]) for d in new.values() for c in d.values())
    print(f"최근 기간 거래: 기존 {old_n:,}건 → 새로 받은 {new_n:,}건", flush=True)
    if new_n < old_n * 0.9:
        sys.exit("새로 받은 거래가 기존보다 10% 넘게 적어서 파일을 바꾸지 않았어요. 포털 상태를 확인하세요.")
    today = dt.date.today().isoformat(); added = 0
    for sg, F in files.items():
        for c in F["cx"].values():
            c["t"] = [x for x in c["t"] if x[0] < cut]; c["r"] = [x for x in c["r"] if x[0] < cut]
        for cid, d in new.get(sg, {}).items():
            c = F["cx"].get(cid)
            if not c:
                c = F["cx"][cid] = {k: v for k, v in d.items() if k not in ("t", "r")}; c["t"], c["r"] = [], []; added += 1
            c["t"] += d["t"]; c["r"] += d["r"]
        for c in F["cx"].values():
            c["t"].sort(key=lambda x: x[0]); c["r"].sort(key=lambda x: x[0])
        F["updated"] = today; F["tm"][1] = max(F["tm"][1], last); F["rm"][1] = max(F["rm"][1], last)
        (OUT / f"{sg}.json").write_text(json.dumps(F, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    I["rows"] = [[cid, c["n"], c["d"], c.get("y"), sg, len(c["t"]), len(c["r"])] for sg, F in files.items() for cid, c in F["cx"].items()]
    I["rows"].sort(key=lambda x: -(x[5] + x[6]))
    I["updated"] = today; I["tm"][1] = max(I["tm"][1], last); I["rm"][1] = max(I["rm"][1], last)
    (OUT / "index.json").write_text(json.dumps(I, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"완료: 파일 {len(files)}개 갱신, 새 단지 {added}개, 전체 단지 {len(I['rows']):,}개")


def build_silv(key, n):
    """분양권·입주권(6칸 행)만 최근 n개월로 갈아끼움. 일반 매매·전월세는 그대로 둠."""
    ms = months_back(n)
    I = json.loads((OUT / "index.json").read_text(encoding="utf-8"))
    files = {sg: json.loads((OUT / f"{sg}.json").read_text(encoding="utf-8")) for sg in I["regions"]}
    hw_dong = {F["cx"][cid]["d"]: sg for sg, F in files.items() if sg in ("41591", "41593", "41595", "41597") for cid in F["cx"]}
    nm = name_map({sg: F["cx"] for sg, F in files.items()})
    SV = grab(key, "apt_silv", [k for k in {**SEOUL, **GGN}], ms)
    for F in files.values():
        for c in F["cx"].values():
            c["t"] = [x for x in c["t"] if len(x) < 6]
    n_rows = added = 0
    for (code, m), rows in SV.items():
        for r in rows:
            if (r.get("cdealType") or "").strip():
                continue
            sg, cid = silv_target(code, r, nm, hw_dong)
            if sg not in files:
                continue
            c = files[sg]["cx"].get(cid)
            if not c:
                c = files[sg]["cx"][cid] = {"n": r.get("aptNm", ""), "d": r.get("umdNm", ""), "y": None, "t": [], "r": []}; added += 1
            c["t"].append(silv_row(r)); n_rows += 1
    today = dt.date.today().isoformat()
    for sg, F in files.items():
        for c in F["cx"].values():
            c["t"].sort(key=lambda x: x[0])
        F["updated"] = today
        (OUT / f"{sg}.json").write_text(json.dumps(F, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    I["rows"] = [[cid, c["n"], c["d"], c.get("y"), sg, len(c["t"]), len(c["r"])] for sg, F in files.items() for cid, c in F["cx"].items()]
    I["rows"].sort(key=lambda x: -(x[5] + x[6])); I["updated"] = today
    I["source"] = "국토교통부 아파트 매매·분양권·입주권·전월세 실거래가"
    (OUT / "index.json").write_text(json.dumps(I, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"분양권·입주권 {n_rows:,}건 반영, 새 단지(입주 전) {added}개")


if __name__ == "__main__":
    main()
