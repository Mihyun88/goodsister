# 데이터 갱신

```bash
export DATA_GO_KR_KEY='공공데이터포털 Encoding 키'   # 파일에 저장하지 않기
python3 scripts/build_data.py --trade-months 12 --rent-months 6 --households   # 실거래 (약 20~30분)
python3 scripts/sync_notion.py                                                   # 노션 가이드 (약 1분, 키 불필요)
```

- `households_cache.json`: 지번별 세대수 캐시. 새 단지만 조회하므로 두 번째부터 빨라집니다.
- 노션 동기화 대상: `sync_notion.py` 의 `ROOTS` (첫 자취방 가이드, 부동산 꿀팁 모음)와 거기서 바로 연결된 하위 페이지.
  노션에서 **웹에 게시**가 켜진 페이지만 가져옵니다.
