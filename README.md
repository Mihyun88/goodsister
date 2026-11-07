# goodsister — 착한언니복덕방 AI 부동산 도구

사이트: https://mihyun88.github.io/goodsister/tools/

- `index.html` — 사이트 첫 주소로 들어오면 `tools/` 로 이동
- `tools/index.html` — **착한언니 AI 부동산 도구** (브라우저에서 바로 열기)
  1. 내 예산으로 서울 어디까지 가능할까? — 현금·대출·희망 지역 → 예산 맞는 단지와 최근 실거래 중위가
  2. 첫 자취 동네 추천기 — 학교·직장, 보증금, 월세 한도 → 통근시간(추정)·조건 충족률로 구별 비교
  3. 이 아파트, 비싸게 사는 걸까? — 단지·면적·희망가 → 최근 거래, 유사 단지, 거래량 비교

## 실거래 데이터 채우기

도구는 `tools/data/trades.js`, `tools/data/rents.js` 를 읽습니다. 처음에는 비어 있으므로 한 번 생성해야 합니다.

```bash
export DATA_GO_KR_KEY='공공데이터포털 Encoding 키'   # 파일에 저장되지 않음
python3 scripts/build_data.py --trade-months 12 --rent-months 6
# 일부 구만: python3 scripts/build_data.py --gu 11440 11410
```

- 출처: 국토교통부 실거래가 공개시스템 (아파트 매매, 오피스텔·아파트 전월세)
- 해제된 매매는 제외, 전월세는 전용 60㎡ 이하만 수집합니다.
- 서울 25개 구 × 12개월 기준 약 1,000회 내외 호출이며, 공공데이터포털 일일 한도를 확인하세요.
