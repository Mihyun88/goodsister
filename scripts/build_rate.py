"""한국은행 ECOS: 예금은행 주택담보대출 금리(신규취급액, 월) → tools/data/rate.js
   ECOS_KEY 환경변수가 없으면 ECOS 공개 샘플키(최근 10건까지)로 조회합니다.
   python3 scripts/build_rate.py
"""
import datetime as dt, json, os, urllib.request
from pathlib import Path

KEY = os.environ.get("ECOS_KEY") or "sample"
OUT = Path(__file__).resolve().parent.parent / "tools" / "data" / "rate.js"
ITEMS = {"mortgage": "BECBLA0302", "fixed": "BECBLA030201"}  # 121Y006 예금은행 대출금리(신규취급액)


def series(item):
    end = dt.date.today()
    start = (end.replace(day=1) - dt.timedelta(days=300)).strftime("%Y%m")
    u = f"https://ecos.bok.or.kr/api/StatisticSearch/{KEY}/json/kr/1/10/121Y006/M/{start}/{end:%Y%m}/{item}"
    rows = json.load(urllib.request.urlopen(u, timeout=30))["StatisticSearch"]["row"]
    return [[r["TIME"], float(r["DATA_VALUE"])] for r in rows]


def main():
    d = {k: series(v) for k, v in ITEMS.items()}
    last = d["mortgage"][-1]
    obj = {"updated": dt.date.today().isoformat(), "month": last[0], "mortgage": last[1],
           "fixed": d["fixed"][-1][1], "history": d["mortgage"],
           "source": "한국은행 ECOS 예금은행 대출금리(신규취급액 기준) 주택담보대출"}
    OUT.write_text("// 한국은행 주택담보대출 금리 — scripts/build_rate.py 가 매달 갱신\nwindow.GS_RATE = "
                   + json.dumps(obj, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"{last[0]} 주담대 {last[1]}% → {OUT}")


if __name__ == "__main__":
    main()
