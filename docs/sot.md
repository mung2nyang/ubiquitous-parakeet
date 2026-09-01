# 단일진실원 (SoT)

> 이전 파일명: `handoff-2026-08-30.md`. 대상: `react-app` (구현) + `ubiquitous-parakeet` (원칙·계획).
> 갱신일: 2026-09-01. 보리 Step 7 최종 승인 + Fail-Fast 슬라이스 A(기사 초대 RPC) 반영.
> 푸시는 별도 지시 전 하지 않는다. 신규 durable/fallback/unsafe/tombstone/큐 금지.

이 문서는 **도메인 읽기=Store** 와 화면이 **같은 계산 함수**를 쓰는지 한곳에 둔다.
다음 도메인·리팩토링 착수 전에 `AGENTS.md` §0-1을 읽고 4대 기준 보고 + 명시적 승인을 받는다.

---

## 1. 한 줄 상태

- **처음 보고된 장애(저장 막힘 / fuel 스키마 / 비용 증식 / 콜상세 증식): 닫힘.**
- **권장 도메인 SoT 완료:** 거래처, 비용, 차량, 설정, 계산서/일지 맵, 프로필, 기사.
- **정산 수수료 SoT (2026-08-31):** 홈 월간 정산 카드의 운임 수수료 = 매출 `getOwnerMonthlyFinanceDetail`.income.commission.total.
- **Step 7 (거래처/차량 슬라이스): 사용자 최종 승인 `[x]`.** Step 8은 이 승인 이후에만.
- **Fail-Fast 방향 (보리 승인, 2026-08-31):** 로그인 SoT = Supabase. 저장 실패는 큐가 아니라 지정 토스트 후 중단. 슬라이스 A(기사 초대 RPC) 구현·커밋. B~E는 미착수.

---

## 2. 오늘 작업 내용 (2026-08-30)

### 2-1. 원칙

- `AGENTS.md`에 **§0-1** 반영 (보리 명시적 승인).
  - 신규 복구 레이어 금지
  - 실패는 먼저 묻고 최소 코드
  - 리팩토링 착수 전 4대 기준 보고 + 승인

### 2-2. 거래처 단일 진실원 (승인 범위, 완료)

목표: 거래처 배열 **읽기 = Store**, **쓰기 = `requestClient*`만**.

| 파일 | 한 일 |
|---|---|
| `react-app/src/lib/clientMutations.js` | `requestClientSave` / `Reorder`에 더해 `requestClientFixedUnitPrice`, `requestClientTaxInfo` 추가. 세션 미준비·persist 실패 시 Store 유지 + 토스트. 신규 큐 없음. |
| `react-app/src/components/calendar/CalendarPage.jsx` | 단가 편집 → `saveClients` 제거, `requestClientFixedUnitPrice`만. `showToast` 연결. |
| `react-app/src/components/TaxInvoicePage.jsx` (+ Draft/Entry/Toolbar 분할) | `loadClients` 스냅샷 제거, `useOwnerClients`. 세무 저장은 `taxInvoiceActions` → `requestClientTaxInfo`. |
| `react-app/src/lib/ownerFinance.js` | `buildFinanceSettings.clients` = `readOwnerClients` (`loadClients` 제거). |
| `react-app/src/lib/taxInvoiceActions.js` | 계산서 초안 저장 시 거래처 세무를 `requestClientTaxInfo`로만. |

프로덕션 UI에서 `saveClients` 직접 호출은 없음. `lib/clients.js`의 `loadClients`/`saveClients`는 배럴로 남음 (테스트·레거시 경로).

### 2-3. 로그인 후 저장이 막히던 문제 (hydrate 스위치)

증상: `클라우드 동기화가 아직 준비되지 않았습니다.`

- `src/lib/hydrate.js` — `finishHydration(epoch)`: 성공/스테일 본인 슬롯 → `ready`, 에러/`finally`가 아직 hydrating이면 `failed`. 로그아웃 epoch `0`.
- `src/store/app-store.js` hydration에 `epoch`.
- `src/lib/hydrate.test.js` 보강.

### 2-4. `hydrate 스키마 위반: fuel`

서버 `fuel_records.raw`가 비용 객체 전체(kind, fuelType, payment 등)인데 persist fuel 스키마는 type/cost 등만 허용 → hydrate 전체가 실패해 `ready`가 안 됨.

- `src/store/persistDayRecordLegacy.js` — fuel/maint/misc coerce, extra 키 흡수.
- 관련 hydrate/persist 테스트 갱신 (extra 키는 throw가 아니라 흡수).

### 2-5. 매출 / 일일운행 탭 — 정비·주유·기타 무한 증식

원인: hydrate가 같은 비용 행을 `workData[date].fuelItems|maintItems|miscItems`와 `expenses[]` **양쪽**에 심음. 일지 저장이 `...prev`로 임베드를 남기고, 재hydrate/탭 이동 때 복제.

한 일 (신규 큐 없음):

- `src/lib/hydrateMergeWork.js` — 일지에 fuel/maint/misc **붙이지 않음**. daily_logs.raw에 있어도 삭제.
- `src/domain/day-record.js` `saveDayRecord` — 저장 시 임베드 키 제거.
- `src/domain/expenses.js` `dedupeExpensesById` — 같은 id 선두 1건.
- `mergeExpenseKind` / `loadExpenses` / `saveExpenses`에서 사용.
- **금지:** `readOwnerExpenses` / `useSyncExternalStore` getSnapshot 안에서 매번 새 배열 dedupe (렌더 루프).

### 2-6. 달력 날짜 클릭 — 운행 일지(콜상세) 무한 증식

원인: `daily_logs.raw.callDetails`와 `transport_details`가 겹치거나, 같은 id가 반복 insert. `syncWorkData`가 transport **delete 실패를 무시하고 insert**. 숫자 id는 persist 스키마에서 스킵·재부여될 수 있음.

한 일:

- `src/domain/callDetailIds.js` (신규, 순수 함수) — 숫자 id → 문자열, id 기준 중복 제거.
- `hydrateMergeWork.js` — daily raw의 `callDetails` 버리고 transport만. 병합 후 dedupe.
- `saveDayRecord` / `backfillCallDetailIds` — 저장·백필도 같은 규칙.
- `src/lib/syncWorkData.js` — `transport_details.delete` 에러면 throw (insert 안 함).
- 테스트: `hydrateMerge.test.js`, `workData.test.js`, `App.legacyCallInit.test.js`.

### 2-7. 오늘 검증

- 관련 단위 테스트(hydrate / hydrateMerge / workData / legacyCallInit 등) 통과.
- `tsc --noEmit` 통과.
- 보리: 브라우저 로그인 + F12, 육안 이상 없음.

에이전트가 브라우저로 본 시점에는 hydrate 배너가 떠 로컬 빈 일지만 확인했다. **실데이터 확인은 보리의 로그인 검증이 정본.**

---

## 3. 처음 보고 대비 — 남은 양

| 항목 | 남은가 |
|---|---|
| 거래처 저장 토스트로 막힘 | 없음 |
| fuel 스키마로 hydrate 실패 | 없음 |
| 탭마다 비용 배열 증식 | 없음 (로직 수정 + 사용자 육안) |
| 달력 클릭 시 콜상세 증식 | 없음 (로직 수정 + 사용자 육안) |
| 거래처 SoT (승인분) | 없음 |
| 비용 expenses SoT (승인분, 2026-08-31) | 없음 (코드·단위 테스트). 로컬 브라우저 확인은 보리 `npm run dev` |
| 차량 cars SoT (승인분, 2026-08-31) | 없음 (코드·단위 테스트). 로컬 브라우저 확인은 보리 `npm run dev` |
| 설정 settings SoT (승인분, 2026-08-31) | 없음 (코드·단위 테스트). 로컬 브라우저 확인은 보리 `npm run dev` |
| 계산서/일지 맵 SoT (승인분, 2026-08-31) | 없음 (코드·단위 테스트). 로컬 브라우저 확인은 보리 `npm run dev` |
| **다른 도메인 SoT** | **없음 — 프로필·기사까지 완료** |
| 기존 일지 durable/fallback/unsafe/tombstone | 걷어내지 않음 (§0-1: 기존 계약 유지, 신규만 금지) |

---

## 4. 2026-08-31 — 비용 expenses 단일 진실원 (승인 범위, 완료)

보리: 「단일진실원 다음거 진행하자」 → 핸드오프 권장 순서의 **비용**만 착수. 거래처와 같이 **읽기 = Store**, **쓰기는 기존 `saveExpenses` → `commitExpenses`**. `requestExpense*` / 신규 큐 **없음**.

| 기준 | 당시 | 한 일 |
|---|---|---|
| 1 subscribe vs load | `useExpenseForm`(일지)만 Store. 매출·정비/주유/기타·리포트는 `loadExpenses` 마운트 스냅샷. | 해당 화면 `useOwnerExpenses`. |
| 2 값의 자리 | Store + persist. UI 스냅샷이 한 박자 늦음. | 화면은 Store. |
| 3 request vs save | `saveExpenses` → `commitExpenses`. | 창구 유지. 새 mutation API 없음. |
| 4 충돌 승자 | 일지에서 넣은 비용이 매출 탭에 안 보이려면 스냅샷 탓. | 구독이면 리마운트 없이 반영. |

| 파일 | 한 일 |
|---|---|
| `react-app/src/components/revenue/OwnerRevenueView.jsx` | `useMemo(() => loadExpenses)` 제거, `useOwnerExpenses`. |
| `react-app/src/components/MaintFuelPage.jsx` | 목록 `useOwnerExpenses`. 저장·삭제는 `readOwnerExpenses` 직후 `saveExpenses`. persist try/catch 토스트, 실패 시 Store 유지. 로컬 `setItems` 없음. |
| `react-app/src/lib/report.js` | `buildMonthReport(..., expenses = readOwnerExpenses(ownerKey))`. 운행/설정/프로필/차량은 아직 `loadWorkData` / `loadPracticeSettings` / `loadProfile` / `loadCars` (이 도메인 밖). |
| `react-app/src/components/ReportPage.jsx` | `useOwnerExpenses` 후 `buildMonthReport`에 전달 (메모가 리마운트 없이 갱신). |
| `react-app/src/components/revenue/OwnerRevenueView.expensesSoT.test.js` | 마운트 후 `commitExpenses` 주유 12345 → 텍스트 `12,345`. `package.json` `test` 스크립트에 포함. |

**금지 유지:** `readOwnerExpenses` / `useSyncExternalStore` getSnapshot 안에서 `dedupe`로 매번 새 배열 만들지 말 것 (렌더 루프).

프로덕션 UI에서 `loadExpenses(` 호출 없음. 정의는 `lib/expenses.js` 배럴 + 주석·테스트 문구만.

검증: 위 컴포넌트 테스트 통과, `tsc --noEmit` 통과. **푸시하지 않음.** 화면은 보리가 `npm run dev`로 확인.

일지 `useExpenseForm`은 이미 Store였음. 회귀시키지 말 것.

---

## 4-2. 2026-08-31 — 차량 cars 단일 진실원 (승인 범위, 완료)

보리: 「차량 시작하자」. **읽기 = Store** (`useOwnerCars` / `readOwnerCars`). 쓰기는 기존 `requestVehicleSave` / `commitCars`. 신규 `requestCar*`·큐 **없음**. `CarListPage` / `MainPageRoute`는 이미 구독.

| 기준 | 당시 | 한 일 |
|---|---|---|
| 1 subscribe vs load | 목록은 Store. 기사 연결은 `useState(() => loadCars)`. `ownerFinance`/`report.js`는 `loadCars`. | 기사 연결·손익 조립·내역서 읽기 Store. |
| 2 값의 자리 | Store + persist. UI 스냅샷이 한 박자 늦음. | 화면은 Store. |
| 3 request vs save | `vehicleMutations` / `requestVehicleSave`. UI `saveCars` 없음. | 창구 유지. |
| 4 충돌 승자 | 차량 추가 후 기사 할당 목록·손익 차량 분해가 안 바뀌면 스냅샷 탓. | 구독이면 리마운트 없이 반영. |

| 파일 | 한 일 |
|---|---|
| `react-app/src/components/DriverConnectionPage.jsx` | `loadCars` 스냅샷 제거, `useOwnerCars`. |
| `react-app/src/lib/ownerFinance.js` | `buildFinanceSettings.cars` = `readOwnerCars`. |
| `react-app/src/lib/report.js` | `buildMonthReport`에 `cars = readOwnerCars` 인자. |
| `react-app/src/components/ReportPage.jsx` | `useOwnerCars` 후 `buildMonthReport`에 전달. |
| `OwnerRevenueView` / `DriverRevenueView` / `ReceivablesPage` / `TaxInvoicePage` | `useOwnerCars`로 `buildFinanceSettings` 메모 무효화 (거래처 `void clients`와 동일). |
| `DriverConnectionPage.carsSoT.test.js` | 초대 모달 연 뒤 `commitCars` 서브 `88나8800` → datalist option. `package.json` `test`에 포함. |

프로덕션 UI에서 `loadCars(` 호출 없음. 정의는 `lib/cars.js` 배럴 + 주석·테스트 문구만.

검증: 위 컴포넌트 테스트 + `tsc`. **푸시하지 않음.** 화면은 보리가 `npm run dev`로 확인.

---

## 4-3. 2026-08-31 — 설정 settings 단일 진실원 (승인 범위, 완료)

보리: 「설정시작하자」. **읽기 = Store** (`useOwnerSettings` / `readOwnerSettings`). 쓰기는 기존 `savePracticeSettings` → `commitSettings`. 신규 `requestSettings*`·큐 **없음**. 달력/메인은 이미 구독.

| 기준 | 당시 | 한 일 |
|---|---|---|
| 1 subscribe vs load | 달력/메인 Store. `AppSettingsPage` 마운트 `loadPracticeSettings`. `App.jsx` 테마 load. `ownerFinance`/`report.js` load. | 설정 화면·테마·손익 조립·내역서 Store. |
| 2 값의 자리 | 설정 페이지 local state가 persist와 어긋날 수 있음. | 화면은 Store. |
| 3 request vs save | `savePracticeSettings` 배럴. | 창구 유지. 패치 병합은 `readOwnerSettings`(persist `load*` 아님). |
| 4 충돌 승자 | 설정 바꾼 뒤 다른 탭 단가/테마가 안 바뀌면 스냅샷 탓. | 구독이면 리마운트 없이 반영. |

| 파일 | 한 일 |
|---|---|
| `react-app/src/store/ownerDataHooks.js` | `readOwnerSettings` 추가. **getSnapshot 안에서 normalize 금지 유지.** |
| `react-app/src/lib/practiceSettings.js` | `savePracticeSettings` 병합 소스를 `readOwnerSettings`. |
| `react-app/src/components/AppSettingsPage.jsx` | `useOwnerSettings`. 로컬 `setSettings` 없음. |
| `react-app/src/app/App.jsx` | 테마는 `useOwnerSettings().theme`. |
| `ownerFinance.js` / `report.js` / `ReportPage` | `readOwnerSettings` / 구독값 전달. |
| 매출·기사손익·미수·계산서 | `useOwnerSettings`로 `buildFinanceSettings` 메모 무효화. |
| `AppSettingsPage.settingsSoT.test.js` | `commitSettings` inputMode fare → 금액 버튼 `active-work`. |

프로덕션 UI에서 `loadPracticeSettings(` 호출 없음. 정의는 `lib/practiceSettings.js` 배럴 + 주석만.

검증: 위 테스트 + `tsc`. **푸시하지 않음.**

---

## 4-4. 2026-08-31 — 차량 id 중복 React key 경고

보리: 새로고침 후 `Encountered two children with the same key, car_1788141346245_c60pq4`. 원인: `mergeCarsFromRows`가 서버 행(raw.id)과 `supabaseId` 없는 로컬을 이어 붙여 같은 id가 두 번 들어감. 신규 큐 없음.

- `domain/cars.js` `dedupeCarsById` (선두 유지). **getSnapshot 안에서 쓰지 않음.**
- `hydrateMergeCars.js` 병합 결과 및 서버 행 없는 로컬 중복에도 적용.
- `loadCars` / `commitCars` / `initializeOwnerFromPersist` / `replaceOwnerState`에서 적용.
- `CarListPage` / `DriverFormModal` key: `id || number || index`.

---

## 4-4b. 2026-08-31 — 메인 달력 1회 단가 = 거래처 단가

보리: 메인 카드 하단 1회 단가는 임시(설정 `unitPrice`)였고 거래처 단가를 봐야 한다. 이어서 **정산 카드의 1회 단가 행·입력은 삭제**. 합산만 고정노선 `fixedUnitPrice`. 단가 편집은 거래처 화면.

---

## 4-5. 2026-08-31 — 계산서 invoices + 일지 맵 workData (승인 범위, 완료)

보리: 「계산서/일지 맵시작하자」. **읽기 = Store**. 쓰기는 기존 `saveInvoices` / `persistWorkDataByLogId` → `saveWorkData`. 신규 `request*`·큐 **없음**. 달력 일지는 이미 `useOwnerWorkData`.

| 기준 | 당시 | 한 일 |
|---|---|---|
| 1 subscribe vs load | 계산서 `loadInvoices` 마운트. 손익·미수·계산서 일지 맵 `loadWorkDataByLogId`(persist). | `useOwnerInvoices` / `useOwnerWorkDataByLogId`. |
| 2 값의 자리 | 목록·맵 스냅샷이 일지 저장보다 한 박자 늦음. 모달 draft는 로컬 유지. | 목록·맵은 Store. |
| 3 request vs save | `saveInvoices`, `saveWorkData`. | 창구 유지. 계산서 쓰기는 `readOwnerInvoices` 직전 재읽기. |
| 4 충돌 승자 | 일지 저장 직후 열린 계산서/매출이 안 바뀌면 스냅샷 탓. | 구독이면 리마운트 없이 반영. |

| 파일 | 한 일 |
|---|---|
| `ownerDataHooks.js` | `readOwnerInvoices` / `useOwnerInvoices`. `useOwnerWorkDataByLogId`는 `main` 구독 후 `{ main }` 메모 (getSnapshot에서 새 객체 만들지 않음). |
| `ownerFinance.js` | `loadWorkDataByLogId` = `readOwnerWorkDataByLogId`. |
| `TaxInvoicePage.jsx` | 목록 Store. 일지 맵 구독. persist는 `saveInvoices`만. |
| `ReceivablesPage` / `OwnerRevenueView` / `DriverRevenueView` | `useOwnerWorkDataByLogId`. 미수는 persist 후 Store 갱신(로컬 setState 제거). |
| `report.js` / `ReportPage` | `readOwnerWorkData` / `useOwnerWorkData`. |
| `TaxInvoicePage.workInvoiceSoT.test.js` | 일지 횟수 4회, 발급 계산서 거래처명. |

맵 모양은 기존과 같이 **main만**. 서브 일지 persist 창구 확대는 이 범위 밖.

---

## 4-6. 2026-08-31 — 프로필 profile + 기사 drivers 단일 진실원 (승인 범위, 완료)

보리: 「프로필·기사 진행하자」. **읽기 = Store** (`useOwnerProfile` / `readOwnerProfile`, `useOwnerDrivers` / `readOwnerDrivers`). 쓰기는 기존 `saveProfile` / `saveDrivers` / `requestDriver*`. 신규 큐 **없음**.

| 기준 | 당시 | 한 일 |
|---|---|---|
| 1 subscribe vs load | 개인정보/마이페이지 `loadProfile`. 기사 연결 `loadDrivers` 마운트. 손익·내역서·알림 load. | 화면·조립 Store. |
| 2 값의 자리 | 스냅샷이 persist와 어긋날 수 있음. | 화면은 Store. 개인정보 로컬 setState 없음. |
| 3 request vs save | `saveProfile` / `saveDrivers` / `requestDriver*`. | 창구 유지. |
| 4 충돌 승자 | 개인정보 저장 후 마이페이지·내역서 상호가 안 바뀌면 스냅샷 탓. | 구독이면 리마운트 없이 반영. |

| 파일 | 한 일 |
|---|---|
| `ownerProfileDriversHooks.js` | raw만 getSnapshot. 빈 필드 병합은 훅 useMemo / `readOwnerProfile`(getSnapshot 금지). |
| `PersonalInfoPage` / `MyPage` | `useOwnerProfile`. |
| `DriverConnectionPage` | `useOwnerDrivers`. 저장 후 로컬 `setDrivers` 없음. |
| `ownerFinance` / `report` / `notifications` | `readOwnerProfile` / `readOwnerDrivers`. |
| 매출·기사손익·미수·계산서 | 프로필·기사 구독으로 `buildFinanceSettings` 메모 무효화. |
| `AppShell` | 기사 구독으로 초대 대기 알림 재계산. |
| `PersonalInfoPage.profileSoT.test.js` / `DriverConnectionPage.driversSoT.test.js` | `commitProfile` 상호·이름, `commitDrivers` 목록. |

프로덕션 UI에서 `loadProfile(` / `loadDrivers(` 호출 없음. 정의는 배럴 + 주석.

검증: 위 테스트 + `tsc`. **푸시하지 않음.** 화면은 보리가 `npm run dev`로 확인.

---

## 4-7. 2026-08-31 — 홈 월간 정산 카드 수수료 = 매출 SoT (승인, Step 7)

보리: 일지·매출에는 거래처 수수료가 보이는데 메인 정산 카드에는 안 보인다. **홈 전용 수수료 식을 새로 짜지 말고** 매출과 같은 함수를 쓴다.

| 기준 | 당시 | 한 일 |
|---|---|---|
| 1 subscribe vs load | 달력은 Store. 수수료는 카드가 안 읽음. | `buildFinanceSettings` + `useOwner*` (매출 `OwnerRevenueView`와 같음). `load*` 없음. |
| 2 값의 자리 | 매출: `getCallDetailCommissionAmount`(스냅샷 우선, 없으면 거래처). 홈: `monthWorkFareSummary`만. | 홈 `commissionTotal` = `getOwnerMonthlyFinanceDetail(..., 'owner', ...).income.commission.total` 한곳. |
| 3 request vs save | 표시만. | 쓰기 창구 없음. |
| 4 충돌 승자 | 일지 저장 후 홈이 안 바뀌면 스냅샷 탓. | 구독 + 동일 함수. |

| 파일 | 한 일 |
|---|---|
| `CalendarPage.jsx` | `monthKeyOf` + `getOwnerMonthlyFinanceDetail` owner 스코프. `monthWorkFareSummary`로 수수료를 다시 계산하지 않음. |
| `CalendarMonthSummary.jsx` | 「운임 수수료」행(`-금액`, 0이면 숨김). 합계 = `fareSummary.total - commission`. 공급가액은 차감 전. |
| `CalendarPage.test.js` | 홈 금액 = 매출 `income.commission.total`. 수수료 0이면 행 없음. |

차량 `calculateDriverVehicleCommission`은 이 행에 쓰지 않음(매출 「운임 수수료」는 거래처).

## 4-8. 2026-08-31 — hydrate producer가 persist 스키마만 남김

`mergeCarsFromRows` / `mergeClientsFromRows` / `mergeDriversFromRows`의 `...raw`/`...local` 제거. CAR/CLIENT/DRIVER_KEYS만. 불리언 5개(`insuranceOn` 등)는 raw에 진짜 boolean일 때만 키를 넣음(`shareRevenueWithOwner` 없음 = 공유). `hydrateMergeClients.js` 분리. 신규 큐 없음.

## 4-9. 2026-08-31 — 일지 인라인 시트 취소/저장 in-flow

`position: sticky; bottom`이 스크롤 포트에 조기 부착되어 버튼이 위쪽에 떴다. sticky/`fixed` 제거, 폼 맨 아래 문서 흐름. `scrollIntoView` / `InlineExpandHost` 없음.

## 4-10. 2026-08-31 — 테스트·지원 strict-inventory 중간점검

Step 8 전. `error TS\d+:` 테스트·지원 **384 → 314**(캡 355 이하). 전체 911→840, 프로덕션 527→526. `finance.fixtures.js` 타입, `normalizeSettings` `@returns`, `App.test.js` 기존 헬퍼 재사용. 프로덕션 런타임 분기 변경 없음(`CalendarPage` `!!paymentOn`은 optional boolean 정합).

---

## 5. 남은 단일 진실원

권장 도메인 SoT와 홈 정산 수수료 SoT는 여기까지다. 신규 큐/overlay는 넣지 말 것.

프로덕션 strict-inventory는 Step 11 몫. 화면마다 `load*` 스냅샷이 다시 생기면 그 도메인만 4대 기준 보고 후 고친다.

로그인 업무 데이터의 정본을 Supabase만으로 옮기는 Fail-Fast는 A~D `[x]`. E(로그인 LS 미러 + 남은 저장 Fail-Fast)는 `docs/slice-e.md` 착수.

## 6. 다음 세션 체크리스트

1. `AGENTS.md` §0 + §0-1 읽기.
2. Step 8(매출/미수/세금계산서)은 보리 착수 지시 후에만.
3. 슬라이스 E는 `docs/slice-e.md`. 보리 작업자 지시 = 착수. D는 `[x]`.
4. 신규 큐/overlay 넣지 않기. 로그인 저장 실패 토스트: `저장에 실패했습니다. 네트워크 상태를 확인해 주세요.`
5. **푸시하지 말 것**(별도 지시 전).
6. **게스트 기사·차량 초대를 고치지 마라** (아래 8절).

---

## 8. 사용자 승인된 의도적 제외 (Explicit Out-of-Scope)

- **게스트는 기사 초대·차량(기사 할당) 초대를 쓰지 않는다.** 제품 기능이 아니다. `DriverConnectionPage`에 게스트 `saveDrivers`가 남아 있어도 **버그가 아니며 지금 수리하지 않는다.** 게스트 초대 UI를 검증·숨김·연동 테스트로 건드리지 마라. 숨기려면 보리의 별도 지시가 필요하다.
- 게스트 JSON 백업/불러오기: 추후. 슬라이스 A~D에서 손대지 않음.
- Step 8: 미착수. E는 `docs/slice-e.md`.
- `requestVehicleSave` / `requestClientSave` 및 비용·설정·계산서·프로필의 로그인 LS+`syncAll`은 E 범위. `outboxFlush`의 기간 겹침·옛 delete op는 **예전 큐 잔여**용으로 남을 수 있다.

---

## 9. Fail-Fast 목표 (보리 승인 2026-08-31)와 슬라이스 A (2026-09-01 커밋)

### 9-1. 목표 구조

| 구분 | 로그인 사용자 | 게스트 |
|---|---|---|
| 업무 데이터 정본 | **Supabase만** | localStorage + (추후) JSON 백업. **기사·차량 초대는 없음** |
| 메모리 Store | 서버(또는 게스트 체험 LS)를 읽어 화면이 구독 | 동일(체험 데이터만) |
| localStorage에 남을 것 (E 이후) | 테마, ‘오늘 하루 보지 않기’, 인증 세션 | 위 + 체험 데이터(초대 제외) |
| 저장 실패 | 큐·저널·unsafe 우회 없음. 지정 토스트 후 **즉시 중단** | 서버 호출 없음 |

A~D는 중간 상태다. E가 끝나야 로그인 업무 미러가 LS에서 빠진다.

### 9-2. 슬라이스 A — 기사 초대 생성/수정 (구현·커밋)

4대 기준:

1. 화면은 `useOwnerDrivers` 유지.
2. 목록은 Store. 서버 행은 RPC/update 성공 후에만 Store.
3. 로그인 초대 쓰기 창구는 `requestDriverInviteSave`만. 구현은 직접 RPC/`driver_links` update. 로그인 경로에서 `saveDrivers` 우회 없음.
4. 같은 `driver.id` = `p_idempotency_key`. 실패 시 화면은 저장 전 값, 재시도 큐 없음.

한 일:

- 신규 `react-app/src/lib/driverLinkRpc.js` — `upsertDriverLinkViaRpc` (`upsert_driver_link_idempotent`), `updateDriverLinkFields`, `driverLinkRowNeedsUpdate`.
- `requestDriverInviteSave.js` — `commitWithOutboxAndFlush` 제거. readiness → 차량 `supabaseId` 없으면 Fail-Fast 토스트 → 세션 캡처 → 기존 `supabaseId`면 update 1회, 없으면 RPC 1회(`p_idempotency_key: driver.id`) → RPC no-op인데 필드가 바뀌었으면 update 1회 → `commitDrivers(..., { syncToCloud: false })`.
- 실패 토스트 고정: `저장에 실패했습니다. 네트워크 상태를 확인해 주세요.`
- 기간 겹침 서버/도메인 차단 제거. 남은 규칙: **같은 차량번호 1명** (`upsertDriver`, 메시지 `이미 다른 기사에게 할당된 차량입니다.`).
- 차량·기간 없는 초안은 `commitLocalOnly`(클라우드 시도 안 함).
- DB: `0001_driver_links_idempotency_key.sql` — `idempotency_key`, unique `(owner_id, idempotency_key)`, RPC `vehicle_id uuid`(라이브 SELECT 확정). 라이브 적용·사후 검증 완료.
- 테스트: `directMutationActions.test.js` 슬라이스 A 스위트, `fakeSupabaseClient` `rpc()`. 달력 `App.test.js` store 구독 테스트는 `/app?y=2026&m=7`(8월, URL `m` 0-based)로 고정 — 오늘 달이 바뀌어도 8월 셀을 찾는다.
- 신규 durable/큐 없음. 상태변경·삭제는 슬라이스 B(직접 update/delete, 2026-09-01 `[x]`).

상태: 구현 커밋. 슬라이스 A `[x]`는 보리 로그인 브라우저 확인 후. Step 7 `[x]`와 별개.

---

## 10. 주요 경로 (react-app)

- 거래처 쓰기: `src/lib/clientMutations.js`
- hydrate: `src/lib/hydrate.js`, `src/lib/hydrateMergeWork.js`
- 일지 저장: `src/domain/day-record.js`, `src/components/day-log/useDayDraft.js`
- 비용 중복 제거: `src/domain/expenses.js`
- 콜상세 id: `src/domain/callDetailIds.js`
- 동기화: `src/lib/syncWorkData.js`
- Store 구독: `src/store/ownerDataHooks.js` (`useOwnerClients`, `useOwnerExpenses`, `useOwnerCars`, `useOwnerSettings`, `useOwnerInvoices`, `useOwnerProfile`, `useOwnerDrivers`, `useOwnerWorkData` / `useOwnerWorkDataByLogId`, `readOwner*`)
- 프로필 쓰기: `src/lib/profile.js` `saveProfile` → `commitProfile`
- 기사 초대(로그인, 슬라이스 A): `src/lib/requestDriverInviteSave.js` → `src/lib/driverLinkRpc.js` (`upsert_driver_link_idempotent`). outbox 없음.
- 기사 상태/삭제(로그인, 슬라이스 B `[x]`): `requestDriverStatusChange` / `requestDriverDeletion` → `driver_links` update·delete 1회. outbox 없음. hydrate `mergeDriversFromRows`: 서버 배열(빈 배열 포함)이 정본.
- 차량·거래처 삭제(로그인, 슬라이스 C `[x]`): `requestVehicleDeletion` / `requestClientDeletion` → 본체 delete 1회 후 Store. outbox/tombstone 없음. hydrate `mergeCarsFromRows` / `mergeClientsFromRows`: 서버 배열(빈 배열 포함)이 정본. `supabaseId` 없는 로컬만 빈 서버에서도 남을 수 있음.
- 메인 일지(로그인, 슬라이스 D `[x]`): `commitMainDayLogToCloud` → 그 날짜 `daily_logs`(+`transport_details`) 1회 후 Store(`syncToCloud: false`). durable/재시도 없음. hydrate `mergeWorkDataFromRows`: `dailyRows` 배열(빈 배열 포함)이 정본.
- 기사 쓰기 배럴: `src/lib/drivers.js` `saveDrivers` (게스트 로컬 잔존 — **초대 제품 기능 아님**, §8 Out-of-Scope)
- 비용 쓰기 창구: `src/lib/expenses.js` `saveExpenses` → `commitExpenses` (신규 `requestExpense*` 없음)
- 차량 쓰기 창구: `src/lib/vehicleMutations.js` `requestVehicleSave` (신규 `requestCar*` 없음)
- 설정 쓰기 창구: `src/lib/practiceSettings.js` `savePracticeSettings` → `commitSettings` (신규 `requestSettings*` 없음)
- 계산서 쓰기 창구: `src/lib/invoices.js` `saveInvoices` → `commitInvoices`
- 일지 맵 쓰기 창구: `persistWorkDataByLogId` → `saveWorkData` (맵은 main만)
- 비용 SoT 테스트: `src/components/revenue/OwnerRevenueView.expensesSoT.test.js`
- 차량 SoT 테스트: `src/components/DriverConnectionPage.carsSoT.test.js`
- 설정 SoT 테스트: `src/components/AppSettingsPage.settingsSoT.test.js`
- 계산서/일지 맵 SoT 테스트: `src/components/TaxInvoicePage.workInvoiceSoT.test.js`
- 프로필 SoT 테스트: `src/components/PersonalInfoPage.profileSoT.test.js`
- 기사 SoT 테스트: `src/components/DriverConnectionPage.driversSoT.test.js`
- 홈 정산 수수료 SoT: `getOwnerMonthlyFinanceDetail` → `CalendarPage` / `OwnerRevenueView`
- 홈 정산 수수료 테스트: `src/components/calendar/CalendarPage.test.js`
