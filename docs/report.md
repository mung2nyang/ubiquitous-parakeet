# docs/report.md — 서브 차량 지출(정비/주유/기타) 칩 이관 — 1단계

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **착수지시서 (2026-09-07) — 작업자 전달 대기. 감시관은 코드 작성 안 함(사용자 지시:
> "감시관이 관할할거니 너가 작업하지마 기록만해").**
> 원본 확인 결과 "서브 차량도 지출 칩이 있다"는 사용자 지적이 맞음(§0). 추가 조사로
> 애초 예상보다 위험이 작다는 걸 확인해 **2단계 계획을 재구성**했다(§0-D) — 1단계만으로
> 사용자가 보는 기능은 완성되고, 2단계는 DB 내부 정합성만 다루는 급하지 않은 후속.
> **2026-09-07 감시관 교차검증(별도 세션)**: react-app 실제 코드 전부 대조해 §0의
> 기술적 주장을 검증(전부 일치) + 누락됐던 §8 4대 질문 답변 보강(§0-E) + 200줄 위험
> 사전 경고(§1) + `DriverExpenseItem.vehicleNumber`와의 이름 교차 확인 추가. 계획
> 자체(파일 목록·안 건드릴 것)는 변경 없음 — 여전히 작업자 전달 대기.

## 0. 조사 메모

### 0-A. 원본 재확인 — 사용자 말이 맞다

`script.js`의 `workData`는 전역 변수라 `activeLogId`가 바뀔 때마다
`loadWorkDataForLog(carNum)`으로 통째로 다른 로그 저장소로 교체된다(`script.js:1364-1369`).
`maint-fuel-misc.js`도 이 전역 `workData`에 직접 쓴다(`saveDataToStorage()`가
`writeWorkDataStoreForLog(activeLogId, workData)`). 즉 **어느 로그를 보고 있을 때
정비/주유/기타를 입력하느냐에 따라 자동으로 그 차량 것으로 갈린다** — 메인만 되는 게
아니라 서브 차량도 원본대로 이미 되는 기능이었다.

### 0-B. react-app 현재 상태 — 지출에 "어느 차량"이라는 개념 자체가 없음

- `domain/expenseTypes.js`의 `ExpenseItem`에 차량 구분 필드가 없다.
- 일지 상세 화면의 정비/주유/기타 인라인 입력(`day-log/useExpenseForm.js`)이
  `logId`를 아예 안 받는다(`DayLogPage.jsx:50`) — 서브 차량 일지를 보고 있어도
  무조건 owner 전체 통합 목록(`expenses[ownerKey]`)에 태그 없이 저장됨.
- `/app/expenses`(`MaintFuelPage.jsx`, 로그와 무관한 전체 목록 화면)도 마찬가지.

### 0-C. Supabase 쪽 — 처음 생각보다 위험이 작음 (재조사)

- `lib/syncExpenseRecords.js`는 세 함수(`syncFuelRecords`/`syncMaintenanceRecords`/
  `syncMiscExpenseRecords`) 전부 **무조건 "메인" 차량의 `vehicle_id`로만 저장**한다
  (`cars.find(car => car.type === 'main' ...)`, 51·88·125번 줄).
- `lib/hydrate.js`도 이 세 테이블을 **무조건 메인 차량의 `vehicle_id`로만 조회**한다
  (142-144번 줄, `.eq('vehicle_id', mainCar.supabaseId)`).
- 두 가지가 **항상 같은 차량(메인)을 가리키므로 서로 정합적** — 태그를 로컬에만
  추가해도 지금 sync/hydrate 경로를 안 건드리면 **데이터 유실·조회 누락 위험이 없다.**
  단, `buildFuelRecordRow` 등이 아이템 전체를 `raw`(jsonb)로 그대로 저장하므로,
  새 필드(`vehicleNumber`)도 이미 `raw`에 자동으로 실려서 서버에 저장된다 — 다시
  불러올 때(`expenseFromFuelRecord` 등)만 `raw.vehicleNumber`를 읽어오게 1줄씩
  추가하면 새로고침·재로그인 후에도 태그가 그대로 유지된다(기존 `subsidy`/`mileage`와
  동일한 패턴, §133 대상 아님 — 이미 저장된 원시 필드를 추가로 읽는 것뿐).
- **즉 "메인 차량의 DB row에 전부 몰아 쓴다"는 사실 자체는 이번 1단계에서 안 고친다.**
  기능은 100% 동작하지만(로컬 계산·표시가 전부 태그 기준으로 정확히 필터링됨),
  서버 쪽 `vehicle_id` 컬럼 값 자체는 여전히 항상 메인 차량 것 — 이건 지금 화면에
  아무 영향이 없는 "DB 내부 정합성" 문제라 2단계(백로그, 안 급함)로 미룬다(§0-E).

### 0-D. 계획 변경 — 왜 위험이 작아졌는가

애초엔 "동기화 루프를 차량별로 고쳐야 한다"고 봐서 2단계 다 필요하다고 판단했는데,
`raw` 컬럼이 이미 아이템 전체를 실어 나른다는 걸 재확인하면서, **sync/hydrate의 쓰기
루프·조회 필터 자체는 안 바꾸고 "다시 읽을 때 한 필드 더 읽기"만 추가**하면 화면
기능은 완성된다는 걸 확인했다. 그래서:
- **1단계(이 지시서)**: 로컬 태깅 + 인라인 입력 자동 태그 + 캘린더 칩 필터링(메인/서브
  둘 다) + hydrate 3곳 1줄씩(`raw.vehicleNumber` 복원). **Supabase 쓰기 루프·조회
  필터·`vehicle_id` 값 자체는 무변경** — §4 플레이북 "저장·동기화" 정의상 hydrate
  읽기 함수 3곳을 건드리긴 하지만, 기존 패턴 그대로 필드 하나 추가일 뿐 새 검증기·
  새 쓰기 경로·새 쿼리 없음.
- **2단계(백로그, 급하지 않음)**: `syncFuelRecords` 등이 아이템의 `vehicleNumber`로
  실제 그 차량의 `vehicle_id`를 찾아 쓰게 고치고, `hydrate.js`도 owner의 모든 차량을
  순회해 조회하게 고친다. 화면엔 영향 없고 "DB에 어느 차량 row로 남아있나"만 바뀌는
  정합성 개선 — 서두를 이유 없음, STATUS.md 알려진 이슈로 등재.

### 0-E. §8 리팩토링·이관 착수 전 4대 질문 (2026-09-07, 감시관 교차검증 세션에서 보강)

react-app 코드를 직접 대조해 확인한 답변 — 전부 "기존 방어·채널 그대로 재사용"으로
귀결돼 새 위험 없음:

1. **구독인가 스냅샷인가?** → 구독. `CalendarPage.jsx`는 `useOwnerExpenses`/
   `useOwnerWorkDataByLogId`로 store를 직접 구독한다(`CalendarPage.jsx:57-68`,
   자기만의 스냅샷 아님). `useExpenseForm.js`의 화면 렌더도 `useOwnerExpenses`
   구독값을 그대로 쓴다(`useExpenseForm.js:29`).
2. **지금 보이는 값이 draft/Store/localStorage/Supabase 중 어디 것인가?** → Store.
   `useOwnerExpenses(ownerKey)` 구독값이며, 저장 직전엔 `readOwnerExpenses`로 store
   최신값을 한 번 더 읽어 그 위에 merge한다(`useExpenseForm.js:68,76`) — draft는
   폼 입력 임시값일 뿐 표시 값의 출처가 아니다.
3. **쓰기 창구가 request\*인가, 배럴 save\*/load\* 우회인가?** → 기존 정식 채널
   `saveExpenses`(`lib/expenses.js`) 그대로. `useExpenseForm.js`자체 주석대로
   "commitExpenses→commitBatch→writeAllOrNothing이 이미 원자적"이라 새 쓰기 경로·
   우회 없음(`useExpenseForm.js:35-41`).
4. **hydrate·디바운스·동시편집이 겹치면 누가 이기는가?** → 이 슬라이스가 새로
   만드는 로직이 아니라 `useExpenseForm.js`에 이미 있는 이중 방어를 그대로 탄다:
   화면은 store를 항상 구독해 다른 탭/hydrate의 변경이 즉시 보이고, `save()`/
   `remove()`는 쓰기 직전 `readOwnerExpenses`로 최신값을 다시 읽어 그 위에
   merge한다(재감사 2차 FAIL 지적 2번 대응, `useExpenseForm.js:6-12`). `vehicleNumber`는
   기존 필드들과 동일하게 이 병합 대상에 포함되므로 별도 처리 불필요.

**교차 확인(신규 발견, 2026-09-07)**: `domain/expenseTypes.js:36-39`에 이미
`DriverExpenseItem`(소속기사 서브차량 비용 표시용, `store/app-store.js`의
`driverExpenses` 슬라이스 전용)가 `vehicleNumber` 필드를 갖고 있고, 주석에
"ExpenseItem에 vehicleNumber만 덧붙인 형태. expenses 배열·ExpenseItem 정본에는
넣지 않는다(Q3)"라고 명시돼 있다(그 Q3의 원 결정은 `docs/archive/audit.md`
"소속기사 지출 입력 — 2차": "별도 읽기전용 버킷, expenses 배열·저장 경로 무변경").
이번 슬라이스가 `ExpenseItem`(정본)에 추가하는 `vehicleNumber`는 **완전히 다른
개념**(차주 본인 소유 서브 차량 로그 구분)이고 스토어 슬라이스도 다르다
(`expenses[ownerKey]` vs `driverExpenses`, 서로 안 섞임 — `CalendarPage.jsx`는
`useOwnerExpenses`만 쓰고 `useOwnerDriverExpenses`는 안 씀) — 기능 충돌은 없다.
다만 같은 파일에 이름이 같은 필드가 두 타입에 걸쳐 존재하게 되므로, 작업자는
`ExpenseItem.vehicleNumber` JSDoc에 "차주 본인 서브 로그 태그(DriverExpenseItem의
동명 필드와 무관)"임을 한 줄 명시할 것.

## 1. 수정 계획 (1단계, 응집도상 분리 어려워 10파일 — §3/§6 "응집도 우선" 원칙 준용,
§6 자체의 "200줄 초과 파일 분리" 예외 조항과는 별개)

| 파일 | 변경 |
|---|---|
| `src/domain/expenseTypes.js` | `ExpenseItem`에 `@property {string} [vehicleNumber]` 추가(옵션, 없으면 메인). |
| `src/domain/expenses.js` | `emptyExpenseDraft(kind, date, vehicleNumber)` 3번째 옵션 파라미터 추가. `upsertExpense`가 `draft.vehicleNumber`를 결과에 포함(trim, 빈 문자열은 undefined 취급). |
| `src/components/day-log/useExpenseForm.js` | `useExpenseForm(ownerKey, dateKey, showToast, logId)` 4번째 파라미터 추가. `openAdd`가 `emptyExpenseDraft(kind, dateKey, logId !== 'main' ? logId : undefined)` 호출. `openEdit`가 `item.vehicleNumber`를 draft에 보존. |
| `src/components/day-log/DayLogPage.jsx` | `useExpenseForm(ownerKey, dateKey, showToast, logId)` 호출부에 `logId` 추가(이미 props로 받고 있음, 전달만 추가). |
| `src/components/MaintFuelPage.jsx` | `openEdit`가 `item.vehicleNumber`를 draft에 보존(수정 저장 시 태그 유실 방지). 이 화면 자체엔 차량 선택 UI 추가 안 함(로그 비종속 전체 목록이라 원본에도 대응 화면 없음 — 범위 밖). |
| `src/domain/calendarBadges.js` | `dayExpenseBadgeLabel(expenses, dateKey, vehicleNumber)` 3번째 옵션 파라미터 추가 — `item.vehicleNumber`가 그 값과 일치(둘 다 없으면 "메인"으로 간주)하는 것만 합산. |
| `src/components/calendar/CalendarGrid.jsx` | `expenseVehicle` prop 추가(메인이면 undefined, 서브면 `logId`) → `dayExpenseBadgeLabel(expenses, cell.key, expenseVehicle)`로 전달. |
| `src/components/calendar/CalendarPage.jsx` | `expenses`를 메인/서브 구분 없이 항상 전달(기존 `isMain ? expenses : undefined` 제거) + `expenseVehicle={isMain ? undefined : logId}` 전달. |
| `src/domain/fuelRecords.js`·`maintenanceRecords.js`·`miscExpenseRecords.js` | 각 `expenseFrom*Record` 함수에 `vehicleNumber: raw.vehicleNumber || undefined` 1줄 추가(기존 `subsidy`/`mileage` 패턴과 동일, `row.*` 컬럼에서 오는 값 없음 — `raw`에서만). |

**건드릴 파일 10개, 1커밋 목표(응집도상 쪼개면 "차량 태그가 입력→표시→복원까지
한 기능"이 흩어짐).** 안 건드릴 것: `lib/syncExpenseRecords.js`(쓰기
루프)·`lib/hydrate.js`의 조회 쿼리(`.eq('vehicle_id', ...)`)·`MaintFuelPage.jsx`의
차량 선택 UI(범위 밖, 2단계에서도 아님 — 원본에 대응 화면 없음). 실패 시 처리: 신규
저장소·검증기 없음(§7), 기존 `raw` jsonb 왕복 패턴 재사용뿐.

**⚠️ 200줄 위험(2026-09-07 감시관 교차검증에서 사전 점검, 착수 전 필수 확인)**:
`src/domain/expenses.js`(현재 193줄)·`src/components/MaintFuelPage.jsx`(현재
198줄) 둘 다 한도에 임박해 있다. 특히 `expenses.js`는 `emptyExpenseDraft`(파라미터+
JSDoc 추가)와 `upsertExpense`(trim/undefined 처리+결과 필드 추가) 두 함수를
동시에 건드려야 해서 200줄을 넘길 가능성이 실질적으로 있다. **작업자는 커밋 전
`wc -l`로 이 두 파일을 직접 확인**하고, 200줄을 넘으면 임의로 로직을 줄이거나
다른 파일로 흩어 넣지 말고 §6 절차(초과분을 최소화하는 표현으로 조정 → 그래도
넘으면 사유 1줄 주석 + ~250줄까지 허용, 기계적 절단 금지) 그대로 따를 것. 이
슬라이스 안에서 자체 판단으로 처리 가능(추가 착수지시서 불필요) — 단 감시관
리뷰 시 §5 #4 항목에서 실제 줄 수와 처리 방식을 대조한다.

## 2. 테스트 계획

- `domain/expenses.test.js`: `emptyExpenseDraft`가 `vehicleNumber`를 draft에 담는지,
  `upsertExpense`가 그 값을 결과 아이템에 유지/trim하는지.
- `domain/calendarBadges.test.js`: `dayExpenseBadgeLabel`에 `vehicleNumber` 인자
  추가 — 태그 없는 항목만 메인에 합산되는지, 특정 차량 태그 항목만 그 서브에
  합산되는지, 다른 차량 태그는 서로 안 섞이는지 3케이스 이상.
- `domain/fuelRecords.test.js`/`maintenanceRecords.test.js`/`miscExpenseRecords.test.js`:
  `raw.vehicleNumber`가 있는 행을 `expenseFrom*Record`에 넣었을 때 결과 아이템에
  `vehicleNumber`가 복원되는지 1케이스씩.

## 3. 소비처 확인

- `dayExpenseBadgeLabel`·`emptyExpenseDraft`·`expenseFrom*Record` 시그니처가 파라미터
  "추가"(옵션)라 기존 호출부(슬라이스 25에서 만든 메인 칩 호출부 포함)는 인자 없이도
  그대로 동작 — 무변경 호출부는 전부 "메인과 동일" 취급.
- `useExpenseForm` 호출부는 `DayLogPage.jsx` 1곳뿐(grep 확인).

## 4. 작업자 구현 완료 보고

_(작업자 커밋 후 이 절 채움)_

## 5. 감시관 실사

_(CI 초록 확인 후 §5 7항목 채움)_
