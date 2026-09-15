# docs/report.md — 현재 슬라이스 착수지시서

## `formatWon()` 금액 뒤 "원" 앞 공백 제거 (보리 지시, 2026-09-15) `[ ]` 승인 대기

### 배경

`ui-comparison-report.md` §4(미수금) 검토 중 react-app "100,000 원"
(공백) vs 원본 "100,000원"(공백 없음) 차이 발견. `formatWon()`
(`domain/money.js:27`)이 14개 파일이 공유하는 전역 함수라 원본과
그대로 맞추려고 원본의 공백 규칙을 전수 조사했더니 **원본 자체가
일관성이 없었음**(같은 정산 카드 안에서도 줄마다 공백 유무가 다름,
예: 매출 상세 "순이익"카드 — "당월 순이익"행은 공백 없음인데 바로
아래 "당월 부가세"·"합계"행은 공백 있음). 원본과 맞추는 게 불가능한
상황이라, **보리 결정(2026-09-15): 원본 불일치를 따라가지 말고
react-app을 공백 없음으로 통일** — 이관에서도 일관성이 우선.

### 현재 상태

`formatWon(amount)`이 `"${...}toLocaleString('ko-KR')} 원"`(공백 있음)을
반환 — 미수금·리포트·세금계산서·정비유류기타·기사정산·캘린더 등
14개 파일 전부가 이 함수를 통해 간접적으로 공백을 물려받음.

### 목표 상태

`formatWon()`이 `"${...}원"`(공백 없음)을 반환하도록 한 줄 수정.
14개 소비 파일은 전부 `formatWon()`을 그대로 호출만 하므로 JSX 변경
없이 자동 반영됨. 테스트 중 렌더링 결과 문자열에 공백 있는 금액을
하드코딩한 곳만 기대값 수정.

### 건드릴 파일

- `react-app/src/domain/money.js` — `formatWon()` 1줄(공백 제거)
- `react-app/src/components/calendar/CalendarMonthSummary.test.js` —
  공백 있는 기대값 8곳
- `react-app/src/components/calendar/CalendarPage.test.js` — 공백
  있는 기대값 12곳
- `react-app/src/components/TaxInvoicePage.workInvoiceSoT.test.js` —
  공백 있는 기대값 1곳

(전체 `*.test.js` grep으로 확인 — 이 3개 파일 21곳 외엔 없음.
`callDetailSchema.test.js:20`의 `isValidCurrencyAmount('1,000 원')`은
사용자 입력 파싱 검증이라 `formatWon()` 출력과 무관 — 안 건드림.)

### 안 건드릴 것

- 14개 소비 파일의 JSX 자체 — `formatWon()` 호출부는 그대로, 함수
  내부만 바뀌니 손 안 댐.
- `parseCurrencyValue`/`calcSupplyVat`/`formatCurrencyInput` 등
  `money.js`의 다른 함수 — `formatWon()` 한 함수만.
- `callDetailSchema.test.js`(입력 검증, 무관).

### 실패 시 처리

신규 레이어 없음. 함수 1줄 + 테스트 기대값 문자열 수정뿐이라 실패해도
그대로 되돌리면 끝.

### 검증 방법 (브라우저)

미수금·리포트·세금계산서·정비유류기타·기사정산·캘린더 등 금액이
보이는 화면 전반에서 "OOO원"(공백 없음)으로 통일됐는지 확인. 라이트/
다크 무관(텍스트만 바뀜, 레이아웃 영향 없음).

---

## 다음 슬라이스 (착수 전 대기)

이 슬라이스 승인·구현 후 `side-menu.css` 분리는 이전 커밋(`7854094`)
경계 지도 참고해 계속(I/K/L 등). `STATUS.md` "다음 할 일" 참고.
