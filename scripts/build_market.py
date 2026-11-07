#!/usr/bin/env python3
"""한국부동산원 R-ONE 주간 아파트 통계 → tools/data/market.js

매매가격지수·전세가격지수·매매수급동향·전세수급동향(주간)을 최근 N주 받아
서울 25개 구와 서울·수도권·전국의 주간 변동률을 계산한다.

사용법:
  export RONE_KEY='R-ONE 인증키'
  python3 scripts/build_market.py --weeks 26
"""
import argparse, datetime as dt, json, os, sys, time, urllib.request
from pathlib import Path

TBL = {"sale": "T244183132827305", "jeonse": "T247713133046872",
       "sale_sd": "T248163133074619", "jeonse_sd": "T245423133086632"}
OUT = Path(__file__).resolve().parent.parent / "tools" / "data" / "market.js"
SEOUL_GU = ["종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구", "도봉구", "노원구", "은평구",
            "서대문구", "마포구", "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구"]
KEEP_TOP = {"전국", "서울", "수도권", "지방", "강북지역", "강남지역", "도심권", "동북권", "서북권", "서남권", "동남권"}


def get(key, tbl, wk):
    u = (f"https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do?KEY={key}&Type=json&STATBL_ID={tbl}"
         f"&DTACYCLE_CD=WK&WRTTIME_IDTFR_ID={wk}&pSize=1000")
    for i in range(5):
        try:
            d = json.loads(urllib.request.urlopen(u, timeout=40).read())
            body = d.get("SttsApiTblData")
            if not body:  # 데이터 없음(아직 발표 전 주차 등)
                return []
            return body[1]["row"]
        except Exception:
            if i == 4:
                raise
            time.sleep(2 * (i + 1))


def region(row):
    """서울 구는 '구 이름', 상위 지역은 이름 그대로. 그 외는 None."""
    full = row.get("CLS_FULLNM") or ""
    nm = row.get("CLS_NM")
    if full.startswith("서울>") and nm in SEOUL_GU:
        return nm
    if nm in KEEP_TOP and (full == nm or full.startswith("서울>") or full in ("수도권", "지방")):
        return nm
    return None


def weeks_back(n):
    d = dt.date.today()
    out = []
    for i in range(n + 2):
        y, w, _ = (d - dt.timedelta(weeks=i)).isocalendar()
        out.append(f"{y}{w:02d}")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", type=int, default=26)
    a = ap.parse_args()
    key = os.environ.get("RONE_KEY")
    if not key:
        sys.exit("RONE_KEY 환경변수를 설정하세요.")
    series = {k: {} for k in TBL}  # kind -> region -> {wk: (date, val)}
    got_weeks = []
    for wk in weeks_back(a.weeks):
        rows = get(key, TBL["sale"], wk)
        if not rows:
            continue
        got_weeks.append(wk)
        for kind, tbl in TBL.items():
            rs = rows if kind == "sale" else get(key, tbl, wk)
            for r in rs:
                reg = region(r)
                if reg and r.get("DTA_VAL") is not None:
                    series[kind].setdefault(reg, {})[wk] = (r.get("WRTTIME_DESC"), round(float(r["DTA_VAL"]), 4))
        print(f"R-ONE {wk}: 지역 {len(series['sale'])}", flush=True)
        if len(got_weeks) >= a.weeks + 1:
            break
    got_weeks.sort()
    dates = {}
    for kind in series:
        for reg in series[kind].values():
            for wk, (d, _) in reg.items():
                dates[wk] = d
    out = {"updated": dt.date.today().isoformat(), "weeks": got_weeks, "dates": [dates.get(w) for w in got_weeks],
           "source": "한국부동산원 R-ONE 주간 아파트가격동향",
           "series": {kind: {reg: [v.get(w, (None, None))[1] for w in got_weeks] for reg, v in regs.items()}
                      for kind, regs in series.items()}}
    OUT.write_text("window.GS_MARKET=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"완료: {len(got_weeks)}주 ({out['dates'][0]} ~ {out['dates'][-1]}) -> tools/data/market.js")


if __name__ == "__main__":
    main()
