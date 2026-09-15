# docs/report.md — 현재 슬라이스 착수지시서

## `formatWon()` 금액 뒤 "원" 앞 공백 제거 (보리 지시, 2026-09-15) `[~]`

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

### 구현 (`241d4db`)

지시서 그대로: `money.js` `formatWon()` 1줄(공백 제거) + 조사 단계에서
찾은 21곳(예상 2곳보다 많았음 — 전수 grep으로 확인)을 3개 테스트
파일에서 수정.

- `domain/money.js` — `formatWon()` 공백 제거.
- `calendar/CalendarMonthSummary.test.js` 8곳·`calendar/CalendarPage.test.js`
  12곳·`TaxInvoicePage.workInvoiceSoT.test.js` 1곳 — 렌더링 결과
  하드코딩 기대값에서 공백 제거.

로컬 test 163·typecheck 통과. **push는 보리.**

### §5 리뷰

| # | 결과 |
|---|---|
| 1 범위 | 지시서 4파일 그대로(테스트 파일 수는 조사 단계에 이미 21곳으로 확정) |
| 2 몰래 증설 | 없음 |
| 3 타입 꼼수 | 없음 |
| 4 200줄 | 해당 없음(1줄 + 테스트 기대값 수정) |
| 5 테스트 | 163 통과, 약화 없음(기대값을 새 정답으로 수정한 것뿐) |
| 7 요구사항 | 전 화면 공백 없음 통일 — 브라우저 실검증 중 1건 누락 발견(아래, 착수 승인 대기) |

### 검증 방법 (브라우저) — `241d4db` 범위만

미수금·리포트·세금계산서·정비유류기타·기사정산·캘린더 등 금액이
보이는 화면에서 "OOO원"(공백 없음)으로 통일됐는지 확인. 라이트/다크
무관(텍스트만 바뀜, 레이아웃 영향 없음). **매출(수입/지출 합계) 화면은
아래 추가 건 승인 전까지는 여전히 공백 있음이 정상.**

---

## 추가 발견: 매출 수입/지출 합계 공백 누락 (보리 브라우저 검증 중 발견, 2026-09-15) `[ ]` 승인 대기

### 현재 상태

매출 화면 "운송 수입"/"운행 지출" 카드의 "합계" 행 2곳
(`OwnerMonthlyCards.jsx:105,138`)이 `241d4db` 통일 대상에서 빠져
있음 — 이 두 줄만 `formatWon()`/`won()` 헬퍼를 안 쓰고 자체 인라인
`.toLocaleString('ko-KR')} 원`을 써서 애초에 14개 파일 grep에 안
걸렸음. 같은 파일의 VAT 행(`won(detail.vatAmount)`) 등은 이미
`won()` 헬퍼(공백 없음)를 쓰고 있어 문제 없음.

> 한 번 코드부터 고쳐서 커밋(`383698d`)했다가 지시서 없이 진행한
> 걸 보리가 지적, `git revert`로 되돌림(`da6951c`, 로컬에만 있던
> 커밋이라 origin push 전). 지금은 원래 공백 있는 상태로 복귀.

### 목표 상태

두 줄의 `.toLocaleString('ko-KR')} 원`을 `.toLocaleString('ko-KR')}원`
으로 공백만 제거(로직 변경 없음).

### 건드릴 파일

- `react-app/src/components/revenue/OwnerMonthlyCards.jsx` — 105행·
  138행 공백 문자 각 1개씩만 삭제

### 안 건드릴 것

- 같은 파일의 `won()` 헬퍼 호출부(이미 정상) — 리팩터 안 함, 공백
  문자만 건드림.
- `revenueFormat.js`의 `won()` 자체 — 이미 공백 없음, 안 건드림.

### 실패 시 처리

신규 레이어 없음. 공백 문자 2개 삭제뿐이라 실패해도 그대로 되돌리면 끝.

### 검증 방법 (브라우저)

매출 화면(오너/소속기사 둘 다) "운송 수입"·"운행 지출" 카드 합계가
"OOO원"(공백 없음)으로 바뀌었는지. 다른 화면엔 영향 없음.

---

## 다음 슬라이스 (착수 전 대기)

이 슬라이스 승인·구현 후 `side-menu.css` 분리는 이전 커밋(`7854094`)
경계 지도 참고해 계속(I/K/L 등). `STATUS.md` "다음 할 일" 참고.
