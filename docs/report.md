# docs/report.md — 현재 슬라이스 착수지시서

## 미연동 기사 거래처 고정노선 사용 가능하게 (화면 + 차주 집계 계산)

**규칙(`docs/sot.md` §4-4c, 보리 확인 2026-09-19):** 미연동 기사 거래처도
고정노선을 쓸 수 있고, 그 운행일지(서브차량) 안에서 1곳. 슬라이스 E
(`8c2bf61`)에서 연동기사만 열었고 미연동은 임시로 숨겨 둔 상태.

### 1. 현재 상태
- **화면:** `LinkedDriverClientsPage.jsx`가 미연동이면 토글을 숨기고 값을
  강제로 끈다 — `hideFixedRoute={unlinked}`([:178](react-app/src/components/drivers/LinkedDriverClientsPage.jsx:178)),
  `save()`의 `unlinked ? false : …`([:94](react-app/src/components/drivers/LinkedDriverClientsPage.jsx:94)).
  미연동 스코프 키는 서브차량 번호(`scopeKey = ctx.plate`, `:57`).
- **일지 입력은 이미 스코프 인식:** `getFixedRouteClient({ clients }, clientScopeKey || logId)`
  ([DayLogPage.jsx:80](react-app/src/components/day-log/DayLogPage.jsx:80)),
  차주 세션에선 `clientScopeKey = logId`(=서브차량 번호, `MainPageRoute.jsx:61-63`).
  스코프 것 우선·없으면 차주 것 fallback(`clients.js:23-31`).
- **집계는 스코프 없이 차주 단가 하나로 계산(문제):** 서브차량 일지도 같은
  차주 고정노선을 쓴다 —
  - 월 매출 `financeCore.js:156-162`(서브차량 소스 포함, `:147`)
  - 차주 상세 매출 `financeOwnerDetail.js:48,65`(거래처 라벨 `:49`)
  - 세금계산서(매출) `financeTaxInvoiceGroups.js:53-55`(서브차량 소스 `:29-31`)
  - 서브차량 달력 `CalendarPage.jsx:61,65`(`logId`가 서브차량 번호인데 무스코프)
  → 미연동 거래처에 고정노선을 켜도 이 화면들은 그 단가·거래처명을 안 본다.
- 연동기사 정산 경로는 슬라이스 D에서 이미 스코프 적용(`financeCore.js:105`,
  `financeTaxInvoiceGroups.js:128`) — 이번 변경 대상 아님.

### 2. 목표 상태
- 미연동 서브차량 "거래처" 탭에서 고정노선 토글·단가 입력이 보이고 저장·수정
  값이 유지된다(연동기사 화면과 동일).
- 서브차량 소스마다 그 차량 스코프 고정노선을 먼저 쓰고, 없으면 차주 것으로
  fallback한다 — 위 집계 3곳·서브차량 달력 모두. 스코프 고정노선이 없는
  차량은 결과가 **지금과 100% 동일**(하위호환).
- "스코프 안 1곳·같은 스코프 다른 거래처 자동 해제"는 그대로(`clients.js:137-142`,
  추후 "1곳 규칙 삭제" 기능 때 함께 처리 — roadmap).

### 3. 건드릴 파일
1. `react-app/src/components/drivers/LinkedDriverClientsPage.jsx`(190줄) —
   `hideFixedRoute={unlinked}` 제거, `save()`를 `!!draft.fixedRouteLinked`로.
2. `react-app/src/domain/financeCore.js`(**217줄**) — `getMonthlyFareRevenue`
   루프 안에서 소스별 `getFixedRouteClient(settings, source.logId)` 사용
   (`'main'`은 스코프에 안 걸려 차주 것으로 fallback). 줄 수 증가 0.
3. `react-app/src/domain/financeOwnerDetail.js`(162줄) — 소스별 스코프
   (단가·파렛트·거래처 라벨).
4. `react-app/src/domain/financeTaxInvoiceGroups.js`(**206줄**) — 매출 흐름
   `sources.forEach` 안에서 소스별 스코프. 줄 수 증가 0~+1.
5. `react-app/src/components/calendar/CalendarPage.jsx`(121줄) —
   `resolveFixedUnitPrice`/`getFixedRouteClient`에 `logId` 전달(2곳).
6. 테스트: `finance.test.js`(스코프 우선·fallback 하위호환·라벨·세금계산서 그룹),
   `CalendarPage.test.js`(서브차량 달력 단가). 새 파일 없음.

### 4. 안 건드릴 파일 (근거 병기)
- `clients.js` — `getFixedRouteClient`/`resolveFixedUnitPrice`가 이미 `scopeKey`
  인자 지원(`:23,41`), `upsertClient` 1곳 제한도 이미 같은 스코프끼리(`:137-142`).
- `DayLogPage.jsx`·`MainPageRoute.jsx` — 위 1번 근거(이미 스코프 인식).
- `reportSummary.js` — 메인 일지 리포트 전용(`readOwnerWorkData` 기본값, `:64-67`).
- `ownerFinance.js:117` `unitPrice` — 소비처 없음(`grep \.unitPrice` → 계산은
  `monthSettlement.js`가 옵션으로만 받음).
- 일지 "거래처 빠른 추가"(`CallClientQuickAdd.jsx:67` `hideFixedRoute`) — 콜상세용
  별개 화면, 범위 밖.
- 연동기사 정산 경로(`getMonthlyDriverTotals` 등) — 슬라이스 D에서 완료.

### 5. 실패 시 처리
새 저장소·필드·레이어 없음(§7). 읽기 전용 계산·표시 변경이라 저장/동기화 경로
(`store`·`lib/*mutation*`)를 안 건드림 — 플레이북은 "표시만 → 참고"(§4 판별).
문제가 생기면 해당 줄을 되돌리면 이전 계산으로 복귀, 데이터 유실 경로 없음.
읽기/쓰기 권한(§8-5): 미연동 거래처는 차주가 이미 등록·수정·삭제 가능, 새 권한 없음.

### 6. §6 200줄 확인
`financeCore.js` 217·`financeTaxInvoiceGroups.js` 206은 **이미 200 초과**(수정 후에도
동일, 증가 0~+1). §6 "응집도 > 줄 수"(≤250) 예외로 제자리 수정 —
**보리 승인(2026-09-19)**. 나머지 3개 파일은 200줄 이내.

### 기대 동작 (브라우저 검증, 차주 계정 `npm run dev`)
1. 기사 관리 → 미연동 서브차량 → "거래처" 탭 → "+ 추가"/수정에 고정노선 토글·
   단가 입력이 보이고 저장 후 값 유지. 연동기사 화면은 이전과 동일.
2. 그 서브차량 일지에 고정노선 횟수 입력 → 서브차량 달력 월 합계가 **그
   미연동 거래처 단가×횟수**(차주 고정노선 단가와 다르게 설정해 구분).
3. 차주 매출 화면(서브차량 매출 공유 상태)의 월 합계·거래처별 항목에 그
   단가·거래처명 반영. 세금계산서(매출)도 같은 거래처명·금액.
4. 미연동 서브차량에 자기 고정노선이 없으면 이전처럼 차주 고정노선 단가 그대로.
5. 1곳 규칙: 서브차량 A에서 켜도 차주·서브차량 B의 고정노선은 안 꺼진다.
6. 연동기사 차량: 그 기사가 자기 스코프 고정노선을 설정했다면 차주 매출·달력·
   세금계산서에도 그 단가·거래처명이 반영(미연동과 같은 규칙). 스코프 고정노선이
   없으면 이전과 동일.
7. 회귀: 차주 메인 거래처·연동기사 거래처 화면·연동기사 정산 금액 이전과 동일.
8. 테스트: 새 테스트가 수정 코드를 되돌리면 실제로 FAIL하는지 확인(플레이북 §6
   revert-and-confirm-fail), `npm test`·`tsc` 통과.

### 결정 사항 (보리, 2026-09-19)
① 200 초과 2파일은 §6 응집도 예외로 제자리 수정.
② 스코프는 서브차량 **소스별**로 적용되므로 **연동기사 차량**도 차주 집계(월 매출·
세금계산서)에서 같은 스코프 계산식을 쓴다 — 미연동과 동일 규칙, 연동기사 정산
경로(슬라이스 D)와도 일관. 기대 동작 6번에 연동기사 차량 확인 추가.

### AI관찰 (미확인 — 실행 지시 아님)
- 연동기사 **본인 계정**의 달력·매출 화면도 무스코프 호출(`CalendarPage.jsx:61,65`
  `logId='main'`, 기사 매출은 `driverRevenueScope.js`가 같은 집계 함수를 씀)이라, 방금
  연동기사가 자기 고정노선을 설정해도 그 화면 금액에 반영되는지는 슬라이스 E 검증
  항목에 없었다. 이번 범위 밖이며 확인은 별도.
