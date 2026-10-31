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
    for i in range(4):
        try:
            return json.loads(urllib.request.urlopen(u, timeout=30).read())
        except Exception:
            if i == 3:
                return None
            time.sleep(2)


def households(key, sgg, bjd, bun, ji):
    """건축물대장 총괄표제부 세대수, 없으면 표제부(동별) 세대수 합."""
    q = f"?serviceKey={key}&sigunguCd={sgg}&bjdongCd={bjd}&bun={bun}&ji={ji}&numOfRows=100&pageNo=1&_type=json"
    for op in ("getBrRecapTitleInfo", "getBrTitleInfo"):
        d = get_json(BLD + op + q)
        try:
            items = d["response"]["body"]["items"]
            items = items["item"] if isinstance(items, dict) else []
            items = items if isinstance(items, list) else [items]
        except (TypeError, KeyError):
            items = []
        n = sum(int(it.get("hhldCnt") or 0) for it in items)
        if n:
            return n
    return 0


def fetch(key, kind, lawd, ymd):
    out, page = [], 1
    while True:
        u = (f"https://apis.data.go.kr/1613000/{EP[kind]}?serviceKey={key}"
             f"&LAWD_CD={lawd}&DEAL_YMD={ymd}&numOfRows=1000&pageNo={page}")
        for i in range(4):
            try:
                root = ET.fromstring(urllib.request.urlopen(u, timeout=30).read())
                break
            except Exception:
                if i == 3:
                    raise
                time.sleep(2)
        code = (root.findtext(".//resultCode") or "").strip()
        if code not in ("", "00", "000"):
            raise SystemExit(f"API 오류 {code}: {root.findtext('.//resultMsg')} ({kind} {lawd} {ymd})")
        items = [{c.tag: (c.text or "").strip() for c in it} for it in root.iter("item")]
        out += items
        total = int(root.findtext(".//totalCount") or 0)
        if len(out) >= total or not items:
            return out
        page += 1


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
    for lawd in gus:
        for ym in tm:
            rows = fetch(key, "apt_trade", lawd, ym)
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
            print(f"매매 {GU[lawd]} {ym}: {len(rows)}건", flush=True)
    if a.households:
        cache = json.loads(HH_CACHE.read_text()) if HH_CACHE.exists() else {}
        for i, c in enumerate(cx.values()):
            sgg, bjd, bun, ji = c["_lot"]
            if not (bjd and bun.strip("0")):
                continue
            ck = f"{sgg}-{bjd}-{bun}-{ji}"
            if ck not in cache:
                cache[ck] = households(key, sgg, bjd, bun, ji)
                if i % 100 == 0:
                    HH_CACHE.write_text(json.dumps(cache))
                    print(f"세대수 {i}/{len(cx)}", flush=True)
            if cache[ck]:
                c["h"] = cache[ck]
        HH_CACHE.write_text(json.dumps(cache))
    for c in cx.values():
        c["t"].sort()
        c.pop("_lot", None)
    write_js("trades.js", "GS_TRADES", {"updated": today, "months": tm,
                                         "source": f"국토교통부 실거래가 공개시스템({tm[0][:4]}.{tm[0][4:]}~{tm[-1][:4]}.{tm[-1][4:]} 신고분)",
                                         "complexes": list(cx.values())})

    # ---- 전월세 (오피스텔 + 아파트, 전용 60㎡ 이하) ----
    rm = months_back(a.rent_months)
    rents = {}
    for lawd in gus:
        rows_out = []
        for ym in rm:
            for kind, tag in (("offi_rent", "O"), ("apt_rent", "A")):
                rows = fetch(key, kind, lawd, ym)
                for r in rows:
                    ar = num(r.get("excluUseAr"))
                    if not ar or ar > 60:
                        continue
                    rows_out.append([r.get("umdNm", ""), tag, round(ar, 1), won(r.get("deposit")),
                                     won(r.get("monthlyRent")), ym,
                                     1 if r.get("contractType", "") == "갱신" else 0])
                print(f"전월세 {GU[lawd]} {ym} {kind}: {len(rows)}건", flush=True)
        rents[GU[lawd]] = rows_out
    write_js("rents.js", "GS_RENTS", {"updated": today, "months": rm,
                                       "source": f"국토교통부 실거래가 공개시스템 오피스텔·아파트 전월세({rm[0][:4]}.{rm[0][4:]}~{rm[-1][:4]}.{rm[-1][4:]} 신고분)",
                                       "rows": rents})
    print("완료. tools/index.html 을 열어 확인하세요.")


if __name__ == "__main__":
    main()
