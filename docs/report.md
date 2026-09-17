# docs/report.md — 현재 슬라이스

## 소속기사 매출화면 정산액 중복표시 버그 + 라벨 변경 `[~]` (코드 커밋 완료, % 표시만 최종확인 보류)

착수 승인(2026-09-17) 후 코드·테스트 완료. 커밋 완료 — 아래 3번(퍼센트
병기)만 별개 버그(다음 슬라이스, 아래 참고) 때문에 실제 %가 붙은 화면을
아직 못 봐서 **명시적 최종 확인은 보류 상태로 커밋**(보리 결정,
2026-09-17 — 두 버그가 얽혀 있어 지금 커밋해두고 다음 슬라이스로 넘어감).

### 구현 요약

| # | 기대 동작 | 상태 |
|---|---|---|
| 1 | 운송 수입 "합계" = 운송료 − 운임수수료 (`settlementTotal` 제거) | 코드 완료·**브라우저 확인됨**(스크린샷: 운송료 200,000 − 수수료 0 = 합계 200,000) |
| 2 | 상단 카드: 월급제 "이번 달 월급" / 매출제 "이번 달 정산액" | 코드 완료·기본 라벨(퍼센트 없음)은 **브라우저 확인됨** |
| 3 | 매출제(%) 기사는 "이번 달 정산액 N%"로 퍼센트 병기(보리 추가 지시, 2026-09-17) | 코드·컴포넌트 테스트 완료, **실제 % 붙은 화면은 미확인**(아래 별도 버그가 막고 있음) |

`netProfit`·`settlement.total`은 정산액 그대로(중복 표시만 해소).
3번: `revenueFormat.js`의 `driverSelfNetProfitLabel`이 `settlement.label`
끝의 `(N%)`를 추출해 병기(`(월급)`·퍼센트 아닌 값·빈 값은 기존대로
퍼센트 없이 "이번 달 정산액"만). `npm test` 172개 통과·`tsc --noEmit`
0에러. 신규 레이어 없음.

### 브라우저 실검증 중 발견 — 별도 버그(다음 슬라이스로 착수)

**고정노선 운송료가 정산액 계산에 안 잡히는 버그.** 원인 확인 과정에서
두 가지를 잘못 짚었다가(①`commEnabled` 기본값, ②`'main'` 대신 번호판
키로 읽어야 한다는 가설 — 둘 다 코드로 확인 후 기각) 스크린샷 두 장
(운송료 200,000·정산액 0원, 차량관리 수수료 20% 정상)으로 교차 검증한
결과 확정. 상세는 아래 새 착수지시서.

---

## 고정노선 운송료가 기사 정산액 계산에서 누락되는 버그 `[ ]` (착수지시서)

### 현재 상태

기사가 "고정노선"(콜상세 아닌 정기 운행, `fixedCount`) 방식으로 운행을
입력하면, 그날 기록(day record)에는 `fixedCount`만 저장되고 운송료
금액 자체는 저장 안 됨(`day-record.js:151-174` `saveDayRecord`) — 화면에
보여줄 때마다 "거래처 고정단가 × 횟수"로 그때그때 계산함
(`getOwnerMonthlyFinanceDetail`/`getMonthlyFareRevenue`,
`financeCore.js`·`financeOwnerDetail.js`의 `resolveFixedUnitPrice(settings)` 사용).

그런데 기사 정산액을 계산하는 `getMonthlyDriverTotals`
(`financeCore.js:92-113`)는 이 "단가×횟수" 계산을 모르고, 그날 기록에
`record.fare`/`fixedFare`/`totalFare` 필드가 **직접 저장돼 있어야만**
금액을 인식한다(`financeCore.js:108`). 고정노선 기록은 그 필드가 아예
없으므로 `grossAmount`가 0으로 계산되고, 운행 **횟수**(`count`)만 맞게
잡힘 — 그 결과 커미션(`calculateDriverVehicleCommission`)도 항상 0.

**증거**(2026-09-17, 스크린샷 2장): 소속기사 매출 화면에서 "운송료
200,000원"(정상, 화면 표시용 계산 경로)·"총 1회 운행"(정상)인데
"이번 달 정산액 0원"(비정상), 그 기사 차량관리 화면엔 "수수료 20%"가
정상 저장돼 있음(`commEnabled`/`commission` 정상, 계산 게이트는
문제없음 — 순수하게 `grossAmount` 누락).

**영향 범위** — `getMonthlyDriverTotals`를 쓰는 곳 전부 같은 버그:
1. `driverSelfRevenue.js:69` — 소속기사 본인 "이번 달 정산액"(이번 건)
2. `driverRevenueShareExpense.js:35` — 차주 쪽 매출제 기사 "기사 급여"
   지출 라인(오너 손익에서 기사에게 줄 수수료를 실제보다 적게 계산 →
   차주 순이익이 실제보다 높게 나올 수 있음)
3. `financeTaxInvoiceGroups.js:94,159` — 세금계산서 원천 그룹(매입/수수료)
   금액 계산

### 목표 상태

`getMonthlyDriverTotals`가 고정노선 운행도 "거래처 고정단가 × 횟수"로
`grossAmount`에 포함시키도록 수정. 계산식은 기존
`getOwnerMonthlyFinanceDetail`(반영/서브차량 스코프의 고정노선 계산)과
동일한 소스(`resolveFixedUnitPrice(settings)`, 파렛트 포함 시
`getFixedRouteClient(settings)`)를 재사용 — 새 계산식 발명 안 함.

`getMonthlyDriverTotals`는 지금 `(data, monthKey, link)` 3개 인자만
받는데, 고정단가 계산에 필요한 `settings`(또는 미리 뽑은
`fixedUnitPrice`/`palletUnitPrice`/`subFixedOn`/파렛트 사용 여부)를
추가로 받아야 함 — **호출부 3곳 전부 시그니처 변경 필요**.

### 건드릴 파일

- `react-app/src/domain/financeCore.js`(198줄, §6 근접 — 아래 참고)
  — `getMonthlyDriverTotals` 시그니처·계산 로직
- `react-app/src/domain/driverSelfRevenue.js`(102줄) — 호출부 1곳
- `react-app/src/domain/driverRevenueShareExpense.js`(50줄) — 호출부 1곳
- `react-app/src/domain/financeTaxInvoiceGroups.js`(193줄, §6 근접)
  — 호출부 2곳
- 위 4개 파일에 대응하는 기존 테스트(`*.test.js`) — 실제 고정노선
  케이스 회귀 테스트 추가

### 안 건드릴 것

- `calculateDriverVehicleCommission`/`isDateWithinAssignment` — 이번
  버그와 무관, 정상 동작 확인됨(`financeCore.js:116-121`,
  `drivers.js:126-131` grep 확인).
- `flattenLinkedDriverTrips`(`financeTaxInvoiceGroups.js:121-144`)의
  운행 목록 드릴다운에서 "고정" 타입 트립의 `fare` 표시(현재도 0으로
  나올 개연성 있음) — **이번 슬라이스 포함 여부 보리 확인 필요**(아래).
- `saveDayRecord`/day record 저장 스키마 — 고정노선은 원래 금액을
  저장 안 하는 게 기존 설계(화면 표시용 계산과 동일 소스 유지가 목적).

### §6 200줄 — 분리설계 필요 가능성

`financeCore.js`(198줄)·`financeTaxInvoiceGroups.js`(193줄) 둘 다 이미
200줄에 근접 — 고정노선 계산 로직을 그대로 추가하면 초과 가능성 높음.
초과하면 기계적 분할이 아니라, 고정노선 금액 계산을 작은 순수 함수로
뽑아(예: `clients.js`에 이미 있는 `resolveFixedUnitPrice` 옆에 배치)
양쪽에서 재사용하는 방향으로 분리설계안을 먼저 보고하겠음(코드
착수 전에 분리설계 확정).

### 실패 시 처리

새 저장·큐·durable 레이어 없음(순수 계산 함수 수정). 실패 시 코드
안 건드리고 "수정 착수지시서"로 재보고(AGENTS.md §3).

---

**보리 확인 필요한 것 2가지**:
1. 위 "안 건드릴 것"의 `flattenLinkedDriverTrips` 드릴다운 표시(고정
   트립의 개별 금액 0으로 보임) — 이번 슬라이스에 포함할지, 별도로
   미룰지.
2. `financeCore.js`/`financeTaxInvoiceGroups.js`가 200줄을 넘으면
   분리설계안을 어느 방향으로 할지(위 제안: 고정단가 계산 헬퍼를
   `clients.js`로) 이대로 괜찮은지.
