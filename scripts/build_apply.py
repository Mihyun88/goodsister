"""청약홈 APT 분양 공고(서울·경기·인천) → tools/data/apply.json
   공고별 주택형 분양가·특별공급 물량, 지난 공고 경쟁률, 같은 동 최근 아파트 실거래 ㎡당 중위(tools/data/cx 기준)
   DATA_GO_KR_KEY 필요. python3 scripts/build_apply.py
"""
import datetime as dt, json, os, re, statistics as st, sys, time, urllib.parse, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_cx import GG, SEOUL  # noqa: E402

KEY = os.environ.get("DATA_GO_KR_KEY") or sys.exit("DATA_GO_KR_KEY 환경변수를 설정하세요.")
B = "https://api.odcloud.kr/api/"
ROOT = Path(__file__).resolve().parent.parent / "tools" / "data"


def get(path, **cond):
    q = {"page": 1, "perPage": 1000, "serviceKey": urllib.parse.unquote(KEY)}
    q.update({f"cond[{k}]": v for k, v in cond.items()})
    u = B + path + "?" + urllib.parse.urlencode(q)
    for i in range(5):
        try:
            return json.loads(urllib.request.urlopen(u, timeout=40).read()).get("data", [])
        except Exception:
            time.sleep(2 * (i + 1))
    return []


def sgg_of(addr):
    a = re.sub(r"^(서울특별시|서울시|서울)\s*", "서울 ", addr or "")
    a = re.sub(r"^(경기도|경기)\s*", "경기 ", a)
    for code, name in {**SEOUL, **{k: f"경기 {v}" for k, v in GG.items()}}.items():
        if a.startswith(name + " ") or a.startswith(name.replace(" ", "") + " "):
            return code
    return None


def main():
    today = dt.date.today()
    since = (today - dt.timedelta(days=75)).isoformat()
    rows = get("ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail", **{"RCRIT_PBLANC_DE::GTE": since})
    rows = [r for r in rows if (r.get("SUBSCRPT_AREA_CODE_NM") or "") in ("서울", "경기", "인천")]
    cmp = {}
    for r in get("ApplyhomeInfoCmpetRtSvc/v1/getAPTLttotPblancCmpet", **{"HOUSE_MANAGE_NO::GTE": str(int(min((x["HOUSE_MANAGE_NO"] for x in rows), default="0")))}):
        k = r["HOUSE_MANAGE_NO"]
        if r.get("RESIDE_SENM") == "해당지역" and r.get("SUBSCRPT_RANK_CODE") == 1:
            m = re.search(r"[\d.]+", str(r.get("CMPET_RATE") or ""))
            cmp.setdefault(k, {})[r["HOUSE_TY"].strip()] = {"rate": r.get("CMPET_RATE"), "req": r.get("REQ_CNT"), "sup": r.get("SUPLY_HSHLDCO"),
                                                          "n": float(m.group()) if m and "△" not in str(r.get("CMPET_RATE")) else None}
    cxc = {}
    out = []
    for r in sorted(rows, key=lambda x: x.get("RCEPT_BGNDE") or ""):
        no = r["HOUSE_MANAGE_NO"]
        types = []
        for m in get("ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl", **{"HOUSE_MANAGE_NO::EQ": no}):
            ar = float(re.sub(r"[^\d.]", "", m.get("HOUSE_TY") or "0") or 0)
            types.append({"ty": (m.get("HOUSE_TY") or "").strip(), "ar": round(ar, 2), "top": int(m.get("LTTOT_TOP_AMOUNT") or 0),
                          "gen": m.get("SUPLY_HSHLDCO") or 0, "sp": m.get("SPSPLY_HSHLDCO") or 0,
                          "sp_d": {"신혼부부": m.get("NWWDS_HSHLDCO") or 0, "생애최초": m.get("LFE_FRST_HSHLDCO") or 0,
                                   "신생아": m.get("NWBB_HSHLDCO") or 0, "다자녀": m.get("MNYCH_HSHLDCO") or 0,
                                   "노부모": m.get("OLD_PARNTS_SUPORT_HSHLDCO") or 0, "청년": m.get("YGMN_HSHLDCO") or 0,
                                   "기관추천": m.get("INSTT_RECOMEND_HSHLDCO") or 0},
                          "cmp": cmp.get(no, {}).get((m.get("HOUSE_TY") or "").strip())})
        addr = r.get("HSSPLY_ADRES") or ""
        sgg = sgg_of(addr)
        dong = None
        mm = re.search(r"\s(\S+[동가리읍면])\s", addr + " ")
        if mm:
            dong = mm.group(1)
        near = None
        if sgg and dong:
            if sgg not in cxc:
                f = ROOT / "cx" / f"{sgg}.json"
                cxc[sgg] = json.loads(f.read_text()) if f.exists() else None
            F = cxc[sgg]
            if F:
                cut = (today - dt.timedelta(days=183)).strftime("%Y%m%d")
                ppm = [t[2] / t[1] for c in F["cx"].values() if c["d"] == dong for t in c["t"] if t[0] >= cut and t[1] > 0]
                new = [t[2] / t[1] for c in F["cx"].values() if c["d"] == dong and (c.get("y") or 0) >= today.year - 10 for t in c["t"] if t[0] >= cut and t[1] > 0]
                if len(ppm) >= 5:
                    near = {"dong": dong, "ppm": round(st.median(ppm)), "n": len(ppm),
                            "new_ppm": round(st.median(new)) if len(new) >= 3 else None, "new_n": len(new)}
        out.append({"no": no, "name": r.get("HOUSE_NM"), "area": r.get("SUBSCRPT_AREA_CODE_NM"), "addr": addr, "sgg": sgg,
                    "kind": r.get("HOUSE_DTL_SECD_NM"), "rent": r.get("RENT_SECD_NM"), "total": r.get("TOT_SUPLY_HSHLDCO"),
                    "notice": r.get("RCRIT_PBLANC_DE"), "sp": [r.get("SPSPLY_RCEPT_BGNDE"), r.get("SPSPLY_RCEPT_ENDDE")],
                    "r1": [r.get("GNRL_RNK1_CRSPAREA_RCPTDE"), r.get("GNRL_RNK1_ETC_AREA_ENDDE") or r.get("GNRL_RNK1_CRSPAREA_ENDDE")],
                    "rcpt": [r.get("RCEPT_BGNDE"), r.get("RCEPT_ENDDE")], "win": r.get("PRZWNER_PRESNATN_DE"),
                    "contract": [r.get("CNTRCT_CNCLS_BGNDE"), r.get("CNTRCT_CNCLS_ENDDE")], "move": r.get("MVN_PREARNGE_YM"),
                    "speculative": r.get("SPECLT_RDN_EARTH_AT") == "Y", "adj": r.get("MDAT_TRGET_AREA_SECD") == "Y",
                    "ceiling": r.get("PARCPRC_ULS_AT") == "Y", "url": r.get("PBLANC_URL"), "hp": r.get("HMPG_ADRES"),
                    "types": types, "near": near})
        time.sleep(0.2)
    (ROOT / "apply.json").write_text(json.dumps({"updated": today.isoformat(), "since": since,
        "source": "한국부동산원 청약홈 분양정보·경쟁률 / 국토교통부 실거래가", "items": out}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"공고 {len(out)}건 (경쟁률 {len(cmp)}건) → tools/data/apply.json")


if __name__ == "__main__":
    main()
