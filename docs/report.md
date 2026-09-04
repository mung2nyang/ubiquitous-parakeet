# docs/report.md — Step 9 ①: 소속기사 지출(정비/주유/기타) 입력 기능

> Step마다/슬라이스마다 리셋되는 착수지시서·실사 보고서 통합 파일이다(AGENTS.md §12).
> 이전 내용(슬라이스 D-2)은 `react-app` `81ddbbe`+`f219ed5`+`a0037d7` + DB `0003`,
> `docs/archive/audit.md` "슬라이스 D-2 최종 [x] 확정"(2026-09-04)으로 보존.

---

## 0. 감시관 사전 조사 (착수 전, 코드만 확인 — 코드 작성 없음)

### 현재 상태
- 소속기사 "일일운행" 화면(`day-log/DayLogPage.jsx`)에는 **비용 입력 섹션이
  이미 렌더된다**(`useExpenseForm` — 계정 유형 가드 없음). 소속기사가 정비/주유를
  입력할 수는 있다.
- 하지만 저장 경로 `lib/expenses.js`의 `saveExpenses(ownerKey, next)`:
  - 소속기사는 `getCloudOwnerKey() !== ownerKey`(ownerKey=linkedOwnerId) →
    **`commitExpenses` 로컬 저장만, 서버 동기화 안 함.**
- `hydrateEmployedDriver.js`는 주석대로 **"Skip clients / fuel / maint / misc"**
  — 소속기사는 비용을 **서버에서 안 불러온다**(`expenses: []`).
- 그래서 소속기사가 입력한 비용은 **새로고침하면 사라진다**(D-2 버그 B와 같은
  패턴, 더 심함 — 아예 hydrate 안 됨).
- D-2 `driverSelfRevenue.js`는 소속기사 매출의 `expense`를 **전부 0**으로 둔다
  (지출 카드는 자리만 있고 항상 0).

### 서버 비용 저장 구조 (참고)
- 비용 3종은 `fuel_records` / `maintenance_records` / `misc_expense_records`
  테이블에 **`daily_log_id` 기준**으로 저장(`lib/syncExpenseRecords.js` — delete
  후 insert). 차주 경로는 `saveExpenses` → `syncFuel/Maint/MiscRecords`.
- 소속기사 RLS: `daily_logs`/`transport_details`는 0002에서 **SELECT만** 열림.
  일지 쓰기는 되는 것으로 관측됨(D-2에서 재로그인 후 서버 데이터 확인) — 비용
  3종 테이블에는 소속기사 INSERT 정책이 **없을 가능성이 높음**(확인 필요).

### 착수 전 4대 질문 (AGENTS.md §8)
1. 구독/스냅샷: `useExpenseForm`은 별도 expenses 스토어 즉시 저장. 매출 화면은
   `useOwner*` 훅 구독.
2. 값의 출처: 지금은 localStorage(`readJsonKey('expenses')`) → 소속기사는 서버
   미연동.
3. 쓰기 창구: `saveExpenses`(배럴). 소속기사 분기가 로컬로 빠짐.
4. 경합: hydrate가 expenses를 안 건드려서(소속기사) 지금은 경합 없음 — 서버
   연동하면 D-2 일지처럼 키·hydrate 정합 설계 필요.

## 1. 보리 결정 (2026-09-04 확정)
- **Q1 = 안 깎음(정보용)**: 소속기사 순이익 = 정산액. 지출 카드는 "내가 쓴 돈"
  기록용, 순이익 계산에 안 들어감.
- **Q2 = 차주 지출에도 반영**: 차주가 내는 돈이므로 차주 손익에도 잡혀야 함.
  → **2차 슬라이스**.
- **Q3 = "일일운행" 화면 비용 섹션 그대로** (이미 렌더됨 — 저장/hydrate만 연결).
- **Q4 = 1차·2차 분할**:
  - **1차** = 소속기사 입력 → 서버 저장 → hydrate → **본인 지출 카드 표시**
    (순이익 불변).
  - **2차** = 그 비용이 **차주 매출 화면 지출**에도 반영.

---

## 2. 감시관 착수지시서 — **1차 (소속기사 쪽)**

### 2-0. DB 작업 — **불필요(2026-09-04 진단으로 확인)**
보리 진단 SELECT 결과: `fuel_records`/`maintenance_records`/`misc_expense_records`
**3개 테이블 모두 이미 연동 기사 전체 CRUD 정책 보유**:
- 작성/수정/삭제/조회 각 정책의 조건에 `EXISTS (select 1 from driver_links dl
  where dl.vehicle_id = <table>.vehicle_id and dl.driver_id = auth.uid()
  and dl.status = 'linked')` 포함. INSERT는 추가로 `user_id = auth.uid()`.
- `daily_logs`도 동일(그래서 기사 일지 쓰기가 통과함).
- 컬럼: 3개 테이블 공통 `id/daily_log_id/user_id/vehicle_id(uuid)`,
  `work_date(date)`, `sequence(int)`, `cost_amount(numeric)`, `raw(jsonb)`.
  fuel은 추가 `subsidy_amount`/`volume_liter`/`mileage_km`, maint는 `mileage_km`.

→ **새 마이그레이션 없음.** 서버 쓰기/읽기 권한은 이미 열려 있다. 1차는
**순수 클라이언트 작업**(hydrate에 조회 추가 + 저장 경로 확인 + 매출 계산 연결).

### 2-1. 코드 (진단·`0004` 후 최종화)
| 파일 | 변경(예상) |
|---|---|
| `src/lib/expenses.js` `saveExpenses` | 소속기사도 클라우드 동기화 경로를 타는지 확인. `blockedReasonForOwnerDataWrite`는 소속기사를 안 막는 것으로 보임(`cloudOwnerKey==ownerKey`, `userId` 일치). `syncFuel/Maint/MiscRecords`는 `mainCar = cars.find(main) \|\| cars.find(supabaseId)` → 소속기사는 배정 차량 사용 → **경로는 이미 맞을 수 있음**. 실제로 되는지 확인, 안 되면 최소 보정. |
| `src/lib/hydrateEmployedDriver.js` | 배정 차량 `supabaseId`로 `fuel_records`/`maintenance_records`/`misc_expense_records` 조회 → **`hydrate.js:138-153`과 같은 패턴**(`mergeExpenseKind` + `expenseFromFuelRecord`/`expenseFromMaintenanceRecord`/`expenseFromMiscRecord`)으로 `expenses` 채움. 스냅샷 `expenses: []` → 실제 배열. |
| `src/domain/driverSelfRevenue.js` | `getDriverSelfMonthlyDetail`에 `expenses` 파라미터 추가. `base = getOwnerMonthlyFinanceDetail(monthKey, 'owner', settings, work, expenses)`(빈 배열 → 실제 배열). 반환의 `expense`를 `base.expense`로(현재는 전부 0으로 덮어씀). **단 `netProfit`·`income.total`은 `settlementTotal` 유지**(Q1 — 지출로 안 깎음). |
| `src/components/revenue/DriverRevenueView.jsx` | `useOwnerExpenses(ownerKey)` 구독 → `getDriverSelfMonthlyDetail(monthKey, settings, work, expenses)`로 전달. |
| `src/components/revenue/OwnerMonthlyCards.jsx` driverSelf | 지출 카드가 이제 값이 참(0 아님). 순이익 카드와 시각적으로 이미 분리돼 있음 — 추가 변경 최소. 필요 시 "본인 부담(순이익 미반영)" 힌트 1줄(보리 확인). |

### 2-2. 건드리지 않을 파일
차주 hydrate(`hydrate.js`)·차주 매출(`OwnerRevenueView`)·`getOwnerMonthlyFinanceDetail`
본체 — **2차 몫**. `financeCore.js`·D-2/C-3 신규 모듈 — 재사용만.
`useExpenseForm`/`DayLogExpenses`(비용 입력 UI 자체는 이미 있음).

### 2-3. 실패 처리 (§7)
신규 durable/큐 없음. 기존 `saveExpenses` Fail-Fast 경로 재사용. hydrate에
비용 3종 조회 추가(D-2 일지 hydrate와 같은 성격).

### 2-4. 착수 전 작업자 확인 요청 사항
1. **먼저 실측**: 소속기사 계정에서 "일일운행" 비용 입력 시 `saveExpenses`가
   서버까지 가는지(네트워크 `fuel_records` insert 확인). `0004` 적용 전에는
   RLS로 막힐 것 — 그 에러 원문을 §3에 기록.
2. hydrate 비용 조회는 배정 차량 1대 기준(다중 배정 TODO — D-2와 같은 한계).
3. `driverSelfRevenue` 변경 후 **순이익이 지출과 무관하게 정산액 그대로**인지
   테스트로 고정.
4. 각 파일 200줄 이하 실측.

### 2-5. 진행 순서 (DB 불필요 — 바로 착수 가능)
1. 작업자: §3에 실측(소속기사 비용 입력이 서버까지 가는지) + 설계 제시 →
   감시관 확인.
2. 작업자 구현 → `npm test` → 커밋(`a0037d7` 위).
3. 감시관 §5 → 보리 브라우저(소속기사: 비용 입력 → 새로고침 후 지출 카드에
   유지, **순이익 불변**) → push → CI → `[x]`.

### 2-6. 작업자 전달문
> AGENTS.md의 §1 작업자 규칙을 준수하라. `.md` 파일은 수정하지 말고 지시된
> 코드 작업만 하라. DB 작업 없음(비용 3종 테이블 RLS는 이미 기사 CRUD 허용 —
> §2-0). 범위 = §2-1 5개 파일 + 테스트. **차주 hydrate/매출 무변경(2차 몫).**
> `driverSelfRevenue` 변경 후 순이익은 지출과 무관하게 정산액. `hydrateEmployedDriver`
> 비용 조회는 `hydrate.js:138-153` 패턴(`mergeExpenseKind` 재사용). §3에 실측
> (소속기사 비용 입력 → `fuel_records` 서버 도달 여부)·설계 먼저 제시하고
> 감시관 확인 후 구현. `npm test` 전체 통과 후 커밋. 각 파일 200줄 이하 실측.

## 3. 작업자 Phase 1 — 실측 + 설계 (2026-09-04)

**실측(코드 추적)**: `saveExpenses`는 소속기사도 클라우드 경로를 탄다
(`getCloudOwnerKey() === ownerKey`, `blockedReasonForOwnerDataWrite` 통과).
`syncFuel/Maint/MiscRecords`의 차량은 `cars.find(main) || cars.find(supabaseId)`
= 배정 sub 차량. RLS는 §2-0으로 이미 허용. → **쓰기 경로는 이미 서버까지 갈
가능성 높음.** 진짜 결함은 `hydrateEmployedDriver`가 `expenses: []` 고정 →
새로고침 시 지출이 사라짐. 라이브 INSERT 여부는 구현 후 브라우저 Network로 최종 확인.

**설계**:
- A. `expenses.js` — **무변경 우선**. "소속기사도 `syncFuelRecords` 호출" 테스트만 고정. 막히면 최소 보정.
- B. `hydrateEmployedDriver.js` — `remapEmployedDriverWorkLogs` 이후, `nextCars[0]?.supabaseId` 있으면 `hydrate.js:138-153` 동일: fuel/maint/misc `select * where vehicle_id = 배정차.supabaseId` → `mergeExpenseKind` + `expenseFromFuel/Maint/MiscRecord` → `snapshot.expenses`. 배정 0대 → `[]`. 2대+ 첫 차량만(주석 TODO).
- C. `driverSelfRevenue.js` — `getDriverSelfMonthlyDetail(monthKey, settings, work, expenses = [])`, `base = getOwnerMonthlyFinanceDetail(..., expenses)`, `expense = base.expense`(표시용), `netProfit`/`income.total` = `settlementTotal`(불변), `income.fuelSubsidy` = EMPTY 유지.
- D. `DriverRevenueView.jsx` — `useOwnerExpenses(ownerKey)` → 전달.
- E. `OwnerMonthlyCards.jsx` — 추가 UI 없음(지출 카드 값만 참).

### 3-1. 감시관 회신 (2026-09-04) — **설계 승인.**
1. **쓰기 경로 무변경 + hydrate·매출 연결만 — 동의.** 단 A의 테스트(소속기사
   분기가 `syncFuelRecords`에 도달)는 반드시 넣을 것. 라이브 INSERT 검증은
   구현 후 보리 브라우저 Network(질문 3 답).
2. **`OwnerMonthlyCards` 힌트 — 이번엔 생략.** 지출 카드에 값이 뜨는데 순이익은
   안 줄어드는 게 브라우저에서 헷갈리는지 보리가 확인 → 필요하면 후속에 문구 1줄.
   (감시관이 브라우저 검증 가이드에 이 확인 항목 명시.)
3. **라이브 Network 실측은 구현 후 브라우저 검증에서.** 구현 전 보리 사전
   입력 불요 — 코드 경로가 충분히 추적됨. 막히면 그때 소폭 보정.

추가 유의:
- `base.expense.salary`도 owner scope면 0(무배정 시). driverSelf는 "기사 급여"
  라인 숨김 유지 — `expense.salary` 값이 뭐든 렌더 안 함. OK.
- `expenseFromFuel/Maint/MiscRecord`·`mergeExpenseKind` import는 `hydrateMerge.js`
  또는 실제 위치 확인해서. `hydrate.js`가 쓰는 것과 **같은 함수** 재사용(복제 금지).

→ 승인. `a0037d7` 위 커밋 1개로 구현 → `npm test` 전체 → 커밋. §4에 `wc -l`
실측·테스트 원문.

## 4. 작업자 구현 완료 보고 (2026-09-04)
`react-app 7e66d7d` (5 files): `hydrateEmployedDriver.js` 174줄 /
`driverSelfRevenue.js` 96줄 / `DriverRevenueView.jsx` 88줄 / `expenses.js` 무변경 /
`OwnerMonthlyCards.jsx` 142줄. `npm test` unit 504 + app 111, fail 0, typecheck 0.

## 5. 감시관 실사 — **1차 최종 [x] 확정 (2026-09-04)**

| # | 결과 |
|---|---|
| 1 범위 | ✅ 5파일(prod 3 + test 2), §2-1 범위. `expenses.js` 무변경(설계대로). 차주 hydrate/매출 무변경(2차). |
| 2 몰래 증설 | ✅ `fetchExpensesForAssignedVehicle` = `hydrate.js:138-153` 패턴 + 같은 도메인 함수 재사용. 새 저장소 0. |
| 3 타입 꼼수 | ✅ 없음. `@typedef ExpenseItem` 정상. |
| 4 200줄 | ✅ 174 / 96 / 88 / 142. |
| 5 테스트 진실성 | ⚠️ 신규 2건 정직(지출 있어도 netProfit 불변 / 소속기사 saveExpenses가 fuel insert 도달). **단 `fetchExpensesForAssignedVehicle` 단위 테스트 없음**(§3 계획엔 있었음) — `hydrate.js` 재사용 + 브라우저 검증으로 갈음, nit. |
| 6 문서 정합 | ✅ |
| 7 요구사항 | ✅ 1차 목표 달성 — 소속기사 지출 hydrate → 지출 카드 표시, 순이익 불변(Q1). |

독립 확인: `origin/main` = `7e66d7d`, CI "CI" = **success**. 보리 브라우저 검증
(Network `fuel_records` insert + 새로고침 후 지출 카드 유지 + 순이익 불변) 통과.
→ `[x]` 확정. 영구 기록: `docs/archive/audit.md` "소속기사 지출 입력 — 1차 최종
[x] 확정". 다음 슬라이스 착수 시 이 파일 리셋.
