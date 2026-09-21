# docs/report.md — 현재 슬라이스 착수지시서

## 스코프 수정 묶음 1 — 연동기사 본인 달력·매출이 본인 고정노선 단가를 쓰게

**근거:** `docs/scope-audit.md` Q1·Q2(🔧 관찰), 보리가 브라우저로 확인(2026-09-21). 슬라이스 E(`8c2bf61`)로 기사가 본인 고정노선을
설정할 수 있게 됐지만 **기사 본인 달력·매출에는 반영되지 않는다.** 이 슬라이스는 그 두 화면만 고친다(내역서는 묶음 2).

### 1. 현재 상태 (증거 병기)
- 기사 세션의 거래처는 **배정 차량번호로 스코프된 것만** 내려온다 — 서버 조회가 `raw->>scopedToVehicleNumber = 배정 차량번호`
  ([hydrateEmployedDriver.js:152-163](react-app/src/lib/hydrateEmployedDriver.js:152)). 차주의 스코프 없는 고정노선은 내려오지 않는다.
- 기사 세션은 일지를 `logId='main'`으로 쓰고 거래처 스코프는 `clientScopeKey = cars[0].number`로 따로 계산한다
  ([MainPageRoute.jsx:60-63](react-app/src/app/MainPageRoute.jsx:60)). **일지(`DayLogPage`)는 이 `clientScopeKey`를 받지만
  달력(`CalendarPage`)에는 안 넘긴다**([MainPageRoute.jsx:111-120](react-app/src/app/MainPageRoute.jsx:111)).
- 그래서 달력은 `resolveFixedUnitPrice({ clients }, logId='main')`·`getFixedRouteClient({ clients }, 'main')`
  ([CalendarPage.jsx:61,65](react-app/src/components/calendar/CalendarPage.jsx:61))로 찾는데 스코프 `'main'` 것은 없고 차주 것(스코프 없음)도
  없어 **단가 0원·거래처 없음**. 달력 셀 금액 배지도 같은 `unitPrice`를 받는다(`CalendarGrid.jsx:27,38-46`, `calendarBadges.js:51-68`).
- 기사 본인 매출: `getDriverSelfMonthlyDetail`([driverSelfRevenue.js:52-69](react-app/src/domain/driverSelfRevenue.js:52))이
  `getOwnerMonthlyFinanceDetail(monthKey,'owner',…)`를 불러 운송료를 만드는데, 이 함수가 메인 소스를 `getFixedRouteClient(settings,'main')`
  ([financeOwnerDetail.js:62,65](react-app/src/domain/financeOwnerDetail.js:62))으로 읽어 **운송료 0원**. 반면 정산액은 `link.vehicleNumber`로
  `getMonthlyDriverTotals`를 불러 본인 단가를 쓴다 → 한 화면에서 **운송료(0원)와 정산 계산(본인 단가)이 어긋남**.
- 재현(2026-09-21, 조사용 스크립트): 기사 본인 달력 단가 0원(스코프를 넘기면 100,000원) · 기사 본인 매출 운송료 0원 vs 정산 총매출 100,000원.

### 2. 목표 상태
- **기사 본인 달력**(월 정산 카드·셀 금액 배지)이 배정 차량 스코프 고정노선 단가를 쓴다 — 본인이 10만원으로 설정했으면 고정운행 1회 = 100,000원.
- **기사 본인 매출**의 운송료가 정산 계산과 같은 스코프 단가를 쓴다(운송료 = 100,000원, 정산 총매출과 같은 값).
- 다른 맥락은 **결과 동일**: 차주 메인·차주가 서브차량을 볼 때(달력·매출)·연동기사 정산 경로·게스트.

### 3. 건드릴 파일 (수정 4 + 테스트 2)
1. `react-app/src/app/MainPageRoute.jsx`(134줄) — 달력 렌더에 `clientScopeKey={clientScopeKey}` 1줄 전달.
2. `react-app/src/components/calendar/CalendarPage.jsx`(121줄) — `clientScopeKey` prop을 받아 `resolveFixedUnitPrice`·`getFixedRouteClient`에
   `clientScopeKey || logId`를 넘김(`DayLogPage.jsx:80`과 같은 규칙). 차주 세션에서는 `clientScopeKey === logId`라 결과 동일.
3. `react-app/src/domain/financeOwnerDetail.js`(162줄, `domain/finance*`) — `getOwnerMonthlyFinanceDetail`에 **선택 인자**(메인 소스의 고정노선
   스코프 키)를 추가하고, 있을 때만 메인 소스 조회에 그 키를 쓴다. **인자를 안 주면 지금과 100% 동일**(하위호환).
4. `react-app/src/domain/driverSelfRevenue.js`(102줄) — 배정 차량번호(`firstAssignedSubCar`)를 위 인자로 넘김.
5. 테스트: `driverSelfRevenue.test.js`(스코프 단가일 때 운송료 = 정산 총매출, 인자 없으면 기존과 동일), `CalendarPage.test.js`(기사 세션 모양 —
   스코프 거래처만 있고 `logId='main'`·`clientScopeKey=차량번호` → 100,000원). 새 파일 없음.

### 4. 안 건드릴 파일 (근거 병기)
- `hydrateEmployedDriver.js` — 기사에게 내려오는 거래처를 넓히지 않는다(차주 스코프 없는 거래처 미전달은 기존 설계, 아래 AI관찰).
- `domain/clients.js` — `getFixedRouteClient`/`resolveFixedUnitPrice`가 이미 스코프 인자 지원(`clients.js:23-42`).
- `DayLogPage.jsx`·`financeCore.js`(`getMonthlyDriverTotals`)·`financeTaxInvoiceGroups.js` — 이미 스코프 적용됨(scope-audit ✅).
- `reportSummary.js`·`ReportPage.jsx`(운송비 내역서) — **묶음 2**.
- `OwnerRevenueView.jsx`·`driverRevenueScope.js` — 차주가 특정 기사를 볼 때는 이미 ✅(scope-audit §4 "차주가 특정 기사만 고른 매출").
- `ownerFinance.js:117` `unitPrice` — 소비처 없음(scope-audit Q4 ➖).

### 5. 실패 시 처리
새 저장소·필드·레이어 없음(§7). 읽기 전용 계산·표시 변경(저장·동기화 경로 미접촉) — 문제가 생기면 해당 줄을 되돌리면 이전(0원) 동작으로 복귀,
데이터 유실 경로 없음. 읽기/쓰기 권한(§8-5): 해당 없음(이미 내려오는 데이터를 읽기만 함).
플레이북: `domain/finance*`를 수정하므로 착수 전 `docs/testing-playbook.md` 열람(AGENTS §4 트리거). 저장·동기화 무관이라 §6(새 테스트가 수정 코드를
되돌리면 실제로 FAIL하는지 확인)·§8(시그니처 변경 시 호출부·테스트 전체 수정)을 적용한다. 함수 시그니처는 선택 인자 추가라 기존 호출부는 무변경.

### 6. §6 200줄 확인
수정 파일 모두 200 이내(134·121·162·102), 증가 각 1~3줄.

### 기대 동작 (브라우저 검증 — 기사 계정 + 차주 계정, `npm run dev`)
**기사 계정** (차주 25만원 / 기사 차량 스코프 10만원 / 고정운행 1회로 준비 — 10만원은 **차주가 "기사 관리 → 거래처"에서 설정하든 기사가 본인 거래처 화면에서 설정하든 동일**, 둘 중 편한 쪽으로)
1. 달력: 그날 셀 금액 배지와 월 정산 카드의 고정노선 기본 운송료가 **100,000원**(수정 전 0원).
2. 매출: 운송료 줄이 **100,000원**이고 정산액 계산과 같은 총매출 기준(수정 전 운송료 0원 / 정산액만 값).
**회귀**
3. 차주 계정 메인 달력·매출: 이전과 동일(차주 25만원 기준).
4. 차주 계정에서 서브차량(미연동·연동) 달력·매출: 이전과 동일(서브 스코프 10만원 기준 — `c8939c2`).
5. 기사 계정 일지 입력 화면·정산 요약: 이전과 동일.

### 문서 반영 (승인 후 문서 커밋에 함께)
`docs/roadmap.md` 묶음 1 `[x]`, `docs/scope-audit.md` Q1·Q2 표에 "조치 완료(react-app `<해시>`)" 메모, STATUS `[x]`.
sot 규칙 초안 6개(`scope-audit.md` §6)는 **묶음 2까지 끝난 뒤** 실제 동작 기준으로 확정해 기록한다.

### 확인된 사실 (보리 2026-09-21)
**고정노선은 차주나 기사 둘 다 설정할 수 있다**("기사 본인이 설정해야 한다"가 의도가 아님). 코드로도 같은 레코드를 공유한다 —
차주가 "기사 관리 → 연동기사 → 거래처"에서 저장하면 `scopedToVehicleNumber = 그 기사의 배정 차량번호`
(`LinkedDriverClientsPage.jsx` `scopeKey`)로 저장되고, 기사 세션은 바로 그 스코프의 거래처를 내려받는다
(`hydrateEmployedDriver.js:152-163`). 그래서 기사 세션에 차주의 "스코프 없는" 거래처가 안 내려오는 것은 문제가 아니며 **이번 범위에서 손대지 않는다.**
(수정 후 기사 달력·매출이 스코프 단가를 쓰면, 누가 설정했든 같은 값을 본다.)

### AI관찰 (미확인 — 실행 지시 아님)
- `MainPageRoute.jsx:60-63`의 `cars[0]?.number || 'main'`: 배정 차량이 아직 hydrate되지 않은 순간에는 `'main'`으로 폴백한다(짧은 로딩 구간 0원 표시 가능).
