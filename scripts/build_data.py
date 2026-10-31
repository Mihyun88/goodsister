#!/usr/bin/env python3
"""착한언니 AI 도구용 실거래 데이터 생성기.

국토교통부 실거래가 API(공공데이터포털)에서 서울 25개 구의
  - 아파트 매매 (최근 N개월, 해제건 제외)
  - 오피스텔·아파트 전월세 (최근 M개월, 전용 60㎡ 이하)
를 받아 tools/data/*.js 로 저장한다. 인증키는 환경변수로만 받고 파일에 쓰지 않는다.

사용법:
  export DATA_GO_KR_KEY='공공데이터포털 Encoding 키'
  python3 scripts/build_data.py --trade-months 12 --rent-months 6
  # 세대수(500세대 필터용, 건축물대장 조회 — 단지 수만큼 호출, 결과는 캐시됨):
  python3 scripts/build_data.py --households
"""
import argparse, datetime as dt, json, os, sys, time, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

GU = {"11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구", "11215": "광진구",
      "11230": "동대문구", "11260": "중랑구", "11290": "성북구", "11305": "강북구", "11320": "도봉구",
      "11350": "노원구", "11380": "은평구", "11410": "서대문구", "11440": "마포구", "11470": "양천구",
      "11500": "강서구", "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구",
      "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구", "11740": "강동구"}
EP = {"apt_trade": "RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev",
      "apt_rent": "RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
      "offi_rent": "RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent"}
OUT = Path(__file__).resolve().parent.parent / "tools" / "data"
HH_CACHE = Path(__file__).resolve().parent / ".households_cache.json"
BLD = "https://apis.data.go.kr/1613000/BldRgstHubService/"


def get_json(u):
    for i in range(6):
        try:
            return json.loads(urllib.request.urlopen(u, timeout=30).read())
        except Exception:
            if i == 5:
                return None
            time.sleep(1.5 * (i + 1))


def households(key, sgg, bjd, bun, ji):
    """건축물대장 총괄표제부 세대수, 없으면 표제부(동별) 세대수 합."""
    q = f"?serviceKey={key}&sigunguCd={sgg}&bjdongCd={bjd}&bun={bun}&ji={ji}&numOfRows=100&pageNo=1&_type=json"
    failed = True
    for op in ("getBrRecapTitleInfo", "getBrTitleInfo"):
        d = get_json(BLD + op + q)
        if d is not None:
            failed = False
        try:
            items = d["response"]["body"]["items"]
            items = items["item"] if isinstance(items, dict) else []
            items = items if isinstance(items, list) else [items]
        except (TypeError, KeyError):
            items = []
        n = sum(int(it.get("hhldCnt") or 0) for it in items)
        if n:
            return n
    return None if failed else 0


def fetch(key, kind, lawd, ymd):
    """한 달·한 구 전체 페이지. 포털이 간헐적으로 내는 APPLICATION_ERROR/끊김은 재시도한다."""
    out, page = [], 1
    while True:
        u = (f"https://apis.data.go.kr/1613000/{EP[kind]}?serviceKey={key}"
             f"&LAWD_CD={lawd}&DEAL_YMD={ymd}&numOfRows=1000&pageNo={page}")
        for i in range(8):
            try:
                root = ET.fromstring(urllib.request.urlopen(u, timeout=60).read())
                code = (root.findtext(".//resultCode") or "").strip()
                if code in ("00", "000"):
                    break
                err = root.findtext(".//returnReasonCode") or code
                if err in ("22",):
                    raise SystemExit(f"일일 호출 한도 초과 ({kind} {lawd} {ymd})")
                if err in ("30", "12"):
                    raise SystemExit(f"API 오류 {err}: 키/경로 확인 필요 ({kind})")
            except (SystemExit, KeyboardInterrupt):
                raise
            except Exception:
                pass
            if i == 7:
                raise RuntimeError(f"재시도 실패: {kind} {lawd} {ymd} p{page}")
            time.sleep(1.5 * (i + 1))
        items = [{c.tag: (c.text or "").strip() for c in it} for it in root.iter("item")]
        out += items
        total = int(root.findtext(".//totalCount") or 0)
        if len(out) >= total or not items:
            return out
        page += 1


def fetch_many(key, kind, jobs, workers=6):
    """[(lawd, ym)] -> {(lawd, ym): rows}"""
    from concurrent.futures import ThreadPoolExecutor
    res = {}
    with ThreadPoolExecutor(workers) as ex:
        futs = {ex.submit(fetch, key, kind, l, y): (l, y) for l, y in jobs}
        for f in futs:
            l, y = futs[f]
            res[(l, y)] = f.result()
            print(f"{kind} {GU[l]} {y}: {len(res[(l, y)])}건", flush=True)
    return res


def won(s):
    s = (s or "").replace(",", "").strip()
    return int(s) if s else 0


def num(s, f=float):
    try:
        return f((s or "").strip())
    except ValueError:
        return 0


def months_back(n, end=None):
    d = end or dt.date.today().replace(day=1)
    res = []
    for _ in range(n):
        res.append(d.strftime("%Y%m"))
        d = (d - dt.timedelta(days=1)).replace(day=1)
    return sorted(res)


def write_js(name, var, obj):
    OUT.mkdir(parents=True, exist_ok=True)
    body = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    (OUT / name).write_text(f"window.{var}={body};\n", encoding="utf-8")
    print(f"  -> tools/data/{name} ({len(body)//1024} KB)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trade-months", type=int, default=12)
    ap.add_argument("--rent-months", type=int, default=6)
    ap.add_argument("--gu", nargs="*", help="LAWD_CD 일부만 (기본: 서울 25개 구 전체)")
    ap.add_argument("--households", action="store_true", help="건축물대장으로 단지 세대수 조회")
    a = ap.parse_args()
    key = os.environ.get("DATA_GO_KR_KEY")
    if not key:
        sys.exit("DATA_GO_KR_KEY 환경변수를 설정하세요 (공공데이터포털 Encoding 키).")
    gus = a.gu or list(GU)
    today = dt.date.today().isoformat()

    # ---- 아파트 매매: 단지별 거래 리스트 ----
    tm = months_back(a.trade_months)
    cx = {}  # (gu, dong, name) -> complex
    got = fetch_many(key, "apt_trade", [(l, y) for l in gus for y in tm])
    for (lawd, ym), rows in got.items():
        for r in rows:
            if r.get("cdealType"):  # 해제된 거래 제외
                continue
            name, dong = r.get("aptNm", ""), r.get("umdNm", "")
            k = r.get("aptSeq") or (lawd, dong, name)
            c = cx.setdefault(k, {"g": GU[lawd], "d": dong, "n": name,
                                  "y": num(r.get("buildYear"), int), "t": [],
                                  "_lot": (r.get("sggCd") or lawd, r.get("umdCd", ""),
                                           (r.get("bonbun") or "").zfill(4), (r.get("bubun") or "").zfill(4))})
            c["t"].append([f"{r.get('dealYear')}{int(num(r.get('dealMonth'), int)):02d}"
                           f"{int(num(r.get('dealDay'), int)):02d}",
                           round(num(r.get("excluUseAr")), 2), won(r.get("dealAmount")),
                           num(r.get("floor"), int), 1 if "직거래" in r.get("dealingGbn", "") else 0])
    if a.households:
        from concurrent.futures import ThreadPoolExecutor
        cache = json.loads(HH_CACHE.read_text()) if HH_CACHE.exists() else {}
        lots = {}
        for c in cx.values():
            sgg, bjd, bun, ji = c["_lot"]
            if bjd and bun.strip("0"):
                c["_ck"] = f"{sgg}-{bjd}-{bun}-{ji}"
                lots[c["_ck"]] = c["_lot"]
        todo = [k for k in lots if k not in cache]
        print(f"세대수 조회: {len(todo)}개 지번 (캐시 {len(lots) - len(todo)}개)", flush=True)
        with ThreadPoolExecutor(6) as ex:
            for i, (k, n) in enumerate(zip(todo, ex.map(lambda k: households(key, *lots[k]), todo))):
                if n is not None:
                    cache[k] = n
                if i % 200 == 0:
                    HH_CACHE.write_text(json.dumps(cache))
                    print(f"  세대수 {i}/{len(todo)}", flush=True)
        HH_CACHE.write_text(json.dumps(cache))
        for c in cx.values():
            if cache.get(c.get("_ck")):
                c["h"] = cache[c["_ck"]]
    for c in cx.values():
        c["t"].sort()
        c.pop("_lot", None)
        c.pop("_ck", None)
    write_js("trades.js", "GS_TRADES", {"updated": today, "months": tm,
                                         "source": f"국토교통부 실거래가 공개시스템({tm[0][:4]}.{tm[0][4:]}~{tm[-1][:4]}.{tm[-1][4:]} 신고분)",
                                         "complexes": list(cx.values())})

    # ---- 전월세 (오피스텔 + 아파트, 전용 60㎡ 이하) ----
    rm = months_back(a.rent_months)
    rents = {}
    got = {tag: fetch_many(key, kind, [(l, y) for l in gus for y in rm])
           for kind, tag in (("offi_rent", "O"), ("apt_rent", "A"))}
    for lawd in gus:
        rows_out = []
        for ym in rm:
            for tag in ("O", "A"):
                rows = got[tag][(lawd, ym)]
                for r in rows:
                    ar = num(r.get("excluUseAr"))
                    if not ar or ar > 60:
                        continue
                    rows_out.append([r.get("umdNm", ""), tag, round(ar, 1), won(r.get("deposit")),
                                     won(r.get("monthlyRent")), ym,
                                     1 if r.get("contractType", "") == "갱신" else 0])
        rents[GU[lawd]] = rows_out
    write_js("rents.js", "GS_RENTS", {"updated": today, "months": rm,
                                       "source": f"국토교통부 실거래가 공개시스템 오피스텔·아파트 전월세({rm[0][:4]}.{rm[0][4:]}~{rm[-1][:4]}.{rm[-1][4:]} 신고분)",
                                       "rows": rents})
    print("완료. tools/index.html 을 열어 확인하세요.")


if __name__ == "__main__":
    main()
