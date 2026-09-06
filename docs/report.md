# docs/report.md — Step 11 JS→TS 전환 슬라이스 20: lib/syncExpenseRecords.js

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **슬라이스 20 전체 `[x]` 확정 완료** — react-app `fc7980f`, CI "verify" 초록 run
> `34027848750`(conclusion=success), 감시관 §5 7항목 통과 + 감시관 직접 재실행
> (`syncExpenseRecords.js(` 0줄·`lib/expenses.js(` 5줄 불변), 보리 `[x]` 2026-09-06.
> strict-inventory 420→395(−25). 상세는 `docs/archive/audit.md` "슬라이스 20".
> 다음 슬라이스(21 — `domain/taxInvoices.js` 등) 착수지시서 작성 시 리셋.
>
> ※ `ubiquitous-parakeet` `b8d4d62`(슬라이스 16~19) + 슬라이스 20 기록분 — 보리 push 대기.

## 0. 조사 메모

**`src/lib/syncExpenseRecords.js`** (115줄, strict-inventory 25건 — 전부 TS7006 파라미터).
`cloudSync.js` 분리 조각 — `syncAll`이 부르는 일반 동기화 큐의 정비/주유/기타 비용
(`fuel_records`/`maintenance_records`/`misc_expense_records`) delete+insert. 구조 동일한
async 함수 3개 + 헬퍼 2개(`expenseSyncInputs`·`dailyLogIdsByDate`).

### 0-A. §4 플레이북 / §133 판단

- 경로 `lib/sync*` + Supabase 원격 mutation → **§4 필수**. 플레이북 재정독.
- 이 파일의 입력: `cars`/`expenses`/`workData`(호출자 `expenses.js`가 넘김) + `getState()`
  (타입 있는 메모리 Store) + Supabase `daily_logs` id 조회(`.select('id, work_date')`).
  **`JSON.parse`(localStorage) → 도메인 좁히기 지점 없음** — `readJson` 안 씀.
- `item`(비용)은 슬라이스 1(`a7cd9ef`)에서 이미 타입된 `groupFuelExpensesByDate`
  (→`Record<string, Array<ExpenseItem|JsonRecord>>`)·`buildFuelRecordRow`
  (`item: ExpenseItem|Record<string, unknown>`)로 흐름 → 이 슬라이스는 그 위에 param 타입만.
- **§133 런타임 검증기 불필요** — 슬라이스 11·12(Supabase 원격 mutation은 §4 트리거지만
  타입 주석만)·19 선례. Supabase id 조회 결과(`row.id`/`row.work_date`)는 `Map` 키/값으로만
  쓰이고 도메인 타입 단언 안 함.

### 0-B. 슬라이스 19 의존
슬라이스 19에서 `upsertDailyLog`가 `@returns {Promise<string>}`를 받았으므로
`dailyLogId = await upsertDailyLog(...)` 흐름이 `string`으로 깨끗하게 정리됨(슬라이스 20이
슬라이스 19 뒤인 이유).

### 0-C. 감시관 사전검증 중 발견한 마찰 + 해결 (보리 확인 대상)

`syncFuelRecords(userId, ownerKey, cars, expenses, workData)`의 `expenses` 파라미터를
`Array<ExpenseItem>`로 달면, **유일 호출자 `lib/expenses.js:34~36`이 `dedupeExpensesById(items)`
(items 무타입 → `{ id?: string }[]`)를 넘겨서** `expenses.js`에 신규 TS2345 3건이 생김
(slice 21 파일에 오염).

**해결(감시관 판단 — 보리 승인 대상)**:
- `expenses` 파라미터를 `Array<{ id?: string }>`(느슨 — 호출자 실제형과 일치)로 선언.
- `expenseSyncInputs` 내부에서 `expenses || getState().expenses[ownerKey] || []` 결과에
  `/** @type {Array<ExpenseItem>} */` 캐스팅 1곳 → 이하 `groupFuelExpensesByDate` 등에
  깨끗하게 흐름. 이건 **Store 데이터/`dedupeExpensesById` 출력(실제 비용 배열)을 도메인
  타입으로 보는 캐스팅**이지 `JSON.parse` 경계가 아님(§133 무관). 슬라이스 13
  `dedupeCarsById` 인자 캐스팅과 같은 범주.
- 결과: `expenses.js`(슬라이스 21) **오염 0**, `syncExpenseRecords.js` 25건 전부 해소.

대안(**보리가 원하면**): 슬라이스 20 = `syncExpenseRecords.js` + `lib/expenses.js`(5건,
직접 호출자) 묶음 — `saveExpenses(items: ExpenseItem[])`로 달면 캐스팅 없이 깨끗. 단
`loadExpenses`/`readJsonKey`가 슬라이스 21쪽으로 번질 수 있어 파일 2개+α. 감시관 권장은
**단독 + 캐스팅 1곳**(슬라이스 경계 유지, 보리 "묶지 말 것" 방침과 일치).

### 0-D. 그 외 최소 보정

- `const vehicleId = mainCar.supabaseId` — `if (!mainCar?.supabaseId) return` 가드 **직후**
  `const`로 캡처. `mainCar.supabaseId`(`CarLike.supabaseId` = `string|number|undefined`)는
  프로퍼티 접근이라 `await` 뒤 for-loop 안에서 TS 좁힘이 풀림 → `const`가 `string|number`로
  고정. **런타임 동작 0 변화**(단언 아님, 좁힘 캡처). 3개 함수 각 1줄 + 이하
  `mainCar.supabaseId` 3곳(`dailyLogIdsByDate` 인자·`upsertDailyLog` 인자·row builder)을
  `vehicleId`로. row builder는 `vehicleId: mainCar.supabaseId` → `vehicleId` (shorthand).
- `dailyLogIdsByDate` `@returns {Promise<Map<string, string>>}`.
- `expenseSyncInputs` `@returns {{ expenses: Array<ExpenseItem>, workData: Record<string, unknown> }}`.

### 0-E. 감시관 사전검증 결과 (적용→검증→원복 완료)

- `npm run typecheck` → **0 에러**
- `npx tsc -p tsconfig.strict-inventory.json --noEmit | grep -cE "error TS"` → **420 → 395 (−25)**.
  `syncExpenseRecords.js(` grep **0줄**. `lib/expenses.js(` grep **5줄(불변 — 오염 0)**.
- `npm test` → unit **561/561** · app **135/135** (fail 0)
- 파일 115 → 152줄(200 이하).

## 1. 착수지시서

### 1-A. 배경
로직 정상 — **타입 주석 + 캐스팅 1곳(`expenseSyncInputs`) + `vehicleId` const 캡처 3곳.**
새 의존성·새 typedef·**런타임 검증기 0**. `CarLike`/`ExpenseItem` 재사용. §4 필수 대상이나
§1-F 검증기 없음(도메인 단언은 Store/deduped 데이터에 대한 것, JSON 경계 아님).

### 1-B. 설계 — `src/lib/syncExpenseRecords.js`

1. 1줄째 `// @ts-check`.
2. import 아래:
   ```
   /** @typedef {import('../domain/financeTypes.js').CarLike} CarLike */
   /** @typedef {import('../domain/expenseTypes.js').ExpenseItem} ExpenseItem */
   ```
3. `expenseSyncInputs`:
   ```
   /**
    * @param {string} ownerKey
    * @param {Array<{ id?: string }>|null|undefined} expenses
    * @param {Record<string, unknown>|null|undefined} workData
    * @returns {{ expenses: Array<ExpenseItem>, workData: Record<string, unknown> }}
    */
   ```
   `expenses: expenses || getState().expenses[ownerKey] || [],` →
   `expenses: /** @type {Array<ExpenseItem>} */ (expenses || getState().expenses[ownerKey] || []),`
4. `dailyLogIdsByDate`: `@param {string|number} vehicleSupabaseId` · `@returns {Promise<Map<string, string>>}`.
   본문 무변경.
5. `syncFuelRecords`/`syncMaintenanceRecords`/`syncMiscExpenseRecords` 3개 전부:
   ```
   /**
    * @param {string} userId
    * @param {string} ownerKey
    * @param {Array<CarLike>} cars
    * @param {Array<{ id?: string }>} [expenses]
    * @param {Record<string, unknown>} [workData]
    */
   ```
   본문: `if (!mainCar?.supabaseId) return` **다음 줄**에 `const vehicleId = mainCar.supabaseId` 추가.
   이후 `dailyLogIdsByDate(mainCar.supabaseId)` → `dailyLogIdsByDate(vehicleId)`,
   `upsertDailyLog(userId, mainCar.supabaseId, ...)` → `upsertDailyLog(userId, vehicleId, ...)`,
   `vehicleId: mainCar.supabaseId,`(row builder 인자) → `vehicleId,`.
   그 외 본문(루프·정규식·`fuelItems`/`record` 로직·delete/insert·`throw`) **전부 무변경**.

### 1-C. 파일
| 파일 | 내용 |
|---|---|
| `src/lib/syncExpenseRecords.js` (수정) | `// @ts-check` + typedef 2 + 함수 5개 JSDoc + `expenseSyncInputs` 캐스팅 1 + `vehicleId` const 3 (+사용처 치환) |

### 1-D. 건드리지 않을 것
- Supabase `.select`/`.delete`/`.insert` 페이로드·`.eq` 인자(`dailyLogId` 등)·`throw` 분기.
- `groupFuelExpensesByDate`/`buildFuelRecordRow` 등 도메인 헬퍼(이미 타입됨, import만).
- 루프 정규식 `/^\d{4}-\d{2}-\d{2}$/`, `fuelItems`/`record`/`dailyLogId` 판정 로직.
- `lib/expenses.js`(슬라이스 21), `lib/syncWorkData.js`(슬라이스 19 완료), 테스트.
- `mainCar` 계산식(`cars.find(...)`), `if (!mainCar?.supabaseId) return` 가드.

### 1-E. 실패 처리 (§7)
신규 상태 저장소·레이어·큐·검증기 0. `expenseSyncInputs` 캐스팅은 Store/deduped
데이터를 도메인 타입으로 보는 것(신규 fallback 로직 아님). `vehicleId` const는 좁힘 캡처
(단언 아님).

### 1-F. 플레이북 §8 / 4대 질문
§0-A·§3 참조. §4 필수 대상(Supabase 원격 mutation)이나 타입 주석 + 캐스팅 1곳 +
`vehicleId` const뿐 — `JSON.parse` 경계 없음, 신규 durable/retry/tombstone/검증기 0,
Supabase 페이로드·호출 순서·에러 분기 무변경. hydrate·세션 epoch는 이 파일 밖.

### 1-G. 작업자 전달문 (보리 착수 승인 완료 2026-09-06 — 이 절만 읽고 그대로 실행)

> **AGENTS.md §1 작업자 규칙을 준수하라. `.md` 파일은 수정하지 말고 지시된 코드 작업만
> 하라. DB 변경 없음.**
>
> **범위 = 1파일**: `src/lib/syncExpenseRecords.js`. **`lib/expenses.js`·`syncWorkData.js`는 손대지 마라.**
>
> **① `// @ts-check`** 파일 맨 첫 줄.
>
> **② import 아래 typedef 2개**:
> ```
> /** @typedef {import('../domain/financeTypes.js').CarLike} CarLike */
> /** @typedef {import('../domain/expenseTypes.js').ExpenseItem} ExpenseItem */
> ```
>
> **③ `expenseSyncInputs`** JSDoc:
> ```
> /**
>  * @param {string} ownerKey
>  * @param {Array<{ id?: string }>|null|undefined} expenses
>  * @param {Record<string, unknown>|null|undefined} workData
>  * @returns {{ expenses: Array<ExpenseItem>, workData: Record<string, unknown> }}
>  */
> ```
> 그리고 return 객체의 `expenses:` 줄만:
> `expenses: expenses || getState().expenses[ownerKey] || [],` →
> `expenses: /** @type {Array<ExpenseItem>} */ (expenses || getState().expenses[ownerKey] || []),`
>
> **④ `dailyLogIdsByDate`** JSDoc: `@param {string|number} vehicleSupabaseId` /
> `@returns {Promise<Map<string, string>>}`. 본문 무변경.
>
> **⑤ `syncFuelRecords`·`syncMaintenanceRecords`·`syncMiscExpenseRecords` 3개 전부**:
> JSDoc:
> ```
> /**
>  * @param {string} userId
>  * @param {string} ownerKey
>  * @param {Array<CarLike>} cars
>  * @param {Array<{ id?: string }>} [expenses]
>  * @param {Record<string, unknown>} [workData]
>  */
> ```
> 본문에서 `if (!mainCar?.supabaseId) return` 바로 다음 줄에:
> `const vehicleId = mainCar.supabaseId`
> 그리고 그 함수 안의 `mainCar.supabaseId` 3곳을 `vehicleId`로:
> - `dailyLogIdsByDate(mainCar.supabaseId)` → `dailyLogIdsByDate(vehicleId)`
> - `upsertDailyLog(userId, mainCar.supabaseId, workDate, record)` → `upsertDailyLog(userId, vehicleId, workDate, record)`
> - row builder 인자 `dailyLogId, userId, vehicleId: mainCar.supabaseId, workDate,` →
>   `dailyLogId, userId, vehicleId, workDate,`
>
> **그 외 전부 무변경.** 루프·정규식·`fuelItems`/`record`/`dailyLogId` 판정·delete/insert·
> `throw` 분기·Supabase 페이로드 그대로. `any`/`unknown` 파라미터 새로 넣지 마라
> (`expenses`는 `Array<{ id?: string }>`, `workData`는 `Record<string, unknown>`).
> 새 typedef·`@ts-ignore`·`DayRecordLike` 단언 금지. 타입 에러 나면 우회 말고 멈추고 보고.
>
> **완료 후 필수**:
> 1. `npm run typecheck` → **전체 0 에러**. 숫자 보고.
> 2. `npm test` → unit + app 전체 통과. 숫자(예: unit 561 / app 135) 보고.
> 3. `npx tsc -p tsconfig.strict-inventory.json --noEmit 2>&1 | grep -cE "error TS"` → **395**
>    (착수 전 420 → −25). 다음 2개 grep 출력을 **보고에 붙여라**(보리 지시):
>    - `grep -E "syncExpenseRecords\.js\("` → **0줄**
>    - `grep -E "lib/expenses\.js\("` → **5줄**(불변 — 오염 0 확인용)
> 4. `wc -l src/lib/syncExpenseRecords.js` → **152줄** 보고.
> 5. 한국어 커밋 메시지로 **커밋 1개**. **push 하지 마라**.

## 2. 착수 전 상태 (2026-09-06)
- `react-app` HEAD = origin/main = `cc286bd`(JS→TS 슬라이스 19, CI 초록·보리 `[x]`). 미커밋 없음.
- `ubiquitous-parakeet`: `main` `b8d4d62`(슬라이스 16~19 기록, 보리 push 대기) + 이번
  갱신분(슬라이스 20 착수지시서·사전검증) 미커밋.
- strict-inventory 착수 전 420건. 이 슬라이스로 **−25 예상(→395)**.

## 3. AGENTS §8 4대 질문 (착수 전)
1. **구독 vs 스냅샷**: 둘 다 아님 — `syncAll`/`saveExpenses`가 부르는 동기화 실행 함수.
2. **보이는 값 출처**: `expenses`/`cars`/`workData`는 호출자(`lib/expenses.js`)가 넘김.
   `getState()`는 메모리 Store. Supabase `daily_logs`는 id 조회용.
3. **쓰기 창구**: Supabase 원격 `delete`+`insert`(`*_records` 3테이블). 이 슬라이스는
   페이로드·호출 순서·에러 분기 **무변경**(타입 주석만).
4. **hydrate·디바운스·동시편집**: 이 파일 밖(`syncAll` + `cloudSession`).

→ 현재/목표: `@ts-check` + JSDoc + `expenseSyncInputs` 캐스팅 1(§133 무관) + `vehicleId`
const 캡처 3(좁힘 유지, 동작 무변경) / 건드릴 파일 §1-C 1개 / 안 건드릴 것 §1-D /
실패 시 **신규 레이어·검증기 없음**(§1-E).

## 4. 작업자 구현 완료 보고

- react-app `fc7980f` "types: syncExpenseRecords.js에 @ts-check·JSDoc과 vehicleId 좁힘
  추가" (작성자 `ya01na111`, co-author Cursor, 2026-09-06). **push 전(ahead 1)** — 보리 push 대기.
- 변경: `src/lib/syncExpenseRecords.js` (+48/-10, 115→152줄). `// @ts-check` + typedef 2
  (`CarLike`·`ExpenseItem`) + 함수 5개 JSDoc + `expenseSyncInputs` 캐스팅 1
  (`/** @type {Array<ExpenseItem>} */`) + `const vehicleId = mainCar.supabaseId` 3곳
  (+사용처 각 3곳 치환).
- 작업자 보고 숫자: typecheck 0 · npm test unit 561/561 app 135/135 fail 0 ·
  strict-inventory `error TS` 395 · `syncExpenseRecords.js(` grep 0줄 ·
  `lib/expenses.js(` grep 5줄(불변, 같은 5건) · 줄 수 152.

## 5. 감시관 실사 (push 전 사전 실사 — CI 초록 확인은 push 후)

**감시관이 커밋 `fc7980f` diff 직접 대조 + typecheck·test·strict-inventory 직접 재실행**:

| # | 확인 | 결과 |
|---|---|---|
| 1 | 범위 준수 | ✅ 1파일 +48/-10 = §1-C. §1-D "안 건드릴 것"(Supabase 페이로드·`.eq` 인자·`throw` 분기·`groupX`/`buildX` 도메인 헬퍼·루프 정규식·`fuelItems`/`record`/`dailyLogId` 판정·`mainCar` 계산·가드) 전부 무변경. `lib/expenses.js`·`syncWorkData.js` 손 안 댐 |
| 2 | 몰래 증설 없음 | ✅ 신규 파일·의존성·저장 키·**런타임 검증기 0**. 캐스팅 1곳은 `Array<ExpenseItem>`(Store/deduped 데이터 → 도메인, `JSON.parse` 경계 아님). `vehicleId` const는 좁힘 캡처(단언 아님) |
| 3 | 타입 꼼수 없음 | ✅ diff `^+` grep: `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as`/`DayRecordLike` 0줄. `expenses`는 `Array<{ id?: string }>`(느슨, 호출자 실제형), `workData`는 `Record<string, unknown>` |
| 4 | 200줄 | ✅ 152줄 |
| 5 | 테스트 진실성 | ✅ 테스트 파일 변경 0. `cloudMemorySave.test.js`(`syncFuelRecords` 도달) CI 통과. 기존 테스트 약화 0 |
| 6 | 문서 정합 | ✅ react-app diff에 `.md` 0 |
| 7 | 요구사항 충족 | ✅ diff가 §1-G와 **byte 단위 일치**(감시관 사전검증본과도 동일). ①~⑤ 전부 |

**핵심: `lib/expenses.js`(슬라이스 21) 오염 0 확인** — `grep -E "lib/expenses\.js\("` →
착수 전과 동일한 5건(2×TS7006 params, 1×TS7005 parsed, 2×TS2345 `dedupeExpensesById`
기존 이슈). 감시관 판단(§0-C)대로 `expenseSyncInputs` 캐스팅으로 격리 성공.

**§0-D `vehicleId` const 확인**: `if (!mainCar?.supabaseId) return` 직후
`const vehicleId = mainCar.supabaseId` — `CarLike.supabaseId`(`string|number|undefined`)가
프로퍼티 접근이라 `await` 뒤 for-loop에서 TS 좁힘이 풀리는 걸 `const`로 고정. 런타임
동작 0 변화(단언 아님). row builder는 `vehicleId: mainCar.supabaseId` → `vehicleId`
(shorthand).

**감시관 직접 재실행** (커밋된 상태 = `fc7980f`):
- `npm run typecheck` → **0 에러**
- `npx tsc -p tsconfig.strict-inventory.json --noEmit | grep -cE "error TS"` → **395**
  (420 → **−25**, 착수지시서 예측치 정확히 일치 = 파일 진단 25건).
  `grep -E "syncExpenseRecords\.js\("` → **0줄** · `grep -E "lib/expenses\.js\("` → **5줄**(불변).
- `npm test` → unit **561/561** · app **135/135** (fail 0)
→ 작업자 보고 숫자와 완전 일치.

**§4 플레이북**: `lib/sync*` + Supabase 원격 mutation이라 §4 필수. 이 슬라이스는 타입
주석 + 캐스팅 1곳 + `vehicleId` const뿐 — `JSON.parse` 경계 없음(`readJson` 안 씀),
`item`은 슬라이스 1에서 이미 타입됨, 신규 durable/retry/tombstone/검증기 0. Supabase
페이로드·호출 순서·에러 분기 무변경. §1-F 런타임 검증기 없음.

**§5 사전 실사 전 항목 통과.** 이 파일은 **동기화 실행 함수라 단독 검증은 "비용 입력 →
Supabase *_records 반영" 스모크** 정도. `syncFuelRecords` 도달 테스트가 CI에서 통과.

**CI 확인 (push 후, 2026-09-06):** 보리 push → react-app `main` = origin/main = `fc7980f`.
CI "verify" run `34027848750` **conclusion=success**, headSha `fc7980f…` 일치. job "verify"
스텝 테스트·타입 검사·빌드 **3게이트 전부 success**. → **보리 최종 `[x]` 확정 2026-09-06.**

### 브라우저 테스트 (선택 — 스모크)
> 로그인 후 정비/주유/기타 비용 1건씩 입력·저장 → 새로고침 후 유지되는지(= `*_records`
> delete+insert 경로). 타입 주석 변경이라 동작 영향 없어야 정상. CI `npm test` 커버.
