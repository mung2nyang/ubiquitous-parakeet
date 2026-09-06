# docs/report.md — Step 11 JS→TS 전환 슬라이스 19: lib/syncWorkData.js

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **슬라이스 19 전체 `[x]` 확정 완료** — react-app `cc286bd`, CI "verify" 초록 run
> `34026552370`(conclusion=success), 감시관 §5 7항목 통과 + 감시관 직접 재실행
> (`syncWorkData.js(` grep 0줄), 보리 `[x]` 2026-09-06. strict-inventory 434→420(−14).
> 상세는 `docs/archive/audit.md` "슬라이스 19". 다음 슬라이스(20 —
> `lib/syncExpenseRecords.js` 25) 착수지시서 작성 시 리셋.

## 0. 조사 메모

**`src/lib/syncWorkData.js`** (68줄, strict-inventory 14건 — 전부 TS7006 파라미터).
`cloudSync.js` 분리 조각 — `syncAll`이 부르는 일반 동기화 큐의 운행기록
(`daily_logs` + `transport_details`) upsert.

### 0-A. §4 플레이북 / §133 판단 (보리 확인 완료 2026-09-06)

- 경로 `lib/sync*` + 실제 Supabase 원격 mutation(`upsert`/`delete`/`insert`) → **§4 필수**.
  플레이북 재정독 완료.
- `readJson(keyFor(KEYS.work, ownerKey), {})` — 슬라이스 17에서 `readJson` 반환이
  `unknown`으로 바뀜 → 이 파일이 localStorage workData를 읽어 `record.isOff`·
  `record.callDetails`·`record.fixedCount` 등 **필드에 접근**. §133 쟁점.
- **보리 결정(AskUserQuestion 2026-09-06)**: `record`를 `DayRecordLike`로 **단언하지
  않고** `Record<string, unknown>`으로 둔다. 기존 런타임 가드(`typeof rawRecord !== 'object'`
  continue, `Array.isArray(record.callDetails)`, `!!record.isOff`,
  `parseEntityNumber(record.fixedCount)` — slice 17에서 `parseEntityNumber(value:unknown)`)가
  그대로 `unknown`을 좁힌다. **신규 검증기 0**(§7 "이름만 바꾼 같은 패턴 금지" 준수).
  §133 위반 아님 — 도메인 타입 단언을 안 하므로.
- **보리 조건**: `data.id` → `data?.id` (`.select('id').single()`은 이론상 null 가능).
  감시관은 완료 후 `npx tsc -p tsconfig.strict-inventory.json --noEmit`의 해당 파일
  **0줄** 출력을 근거로 첨부.
- **슬라이스 분리**: `syncWorkData.js`(14) = 이 슬라이스. `syncExpenseRecords.js`(25) =
  다음 별도 슬라이스(슬라이스 20). **묶지 않는다**(보리 지시).

### 0-B. 타입 소스
- `syncWorkData(userId, ownerKey, cars, clients)`: `userId`/`ownerKey`는 `string`,
  `cars`는 `CarLike[]`(`domain/financeTypes.js`), `clients`는 `ClientLike[]`
  (`domain/clientTypes.js`, slice 17에서 `taxInvoiceEnabled` 추가된 그 타입). 전부 재사용.
- `upsertDailyLog(userId, vehicleId, workDate, record)`: `string` / `string|number`
  (`mainCar.supabaseId`가 `CarLike.supabaseId` = `string|number`) / `string` / `unknown`.
  `@returns {Promise<string>}`.

### 0-C. 소비처
- `syncWorkData` — `syncAll` 파이프라인(일반 동기화 큐).
- `upsertDailyLog` — **`lib/syncExpenseRecords.js`**(슬라이스 20)의 3개 sync 함수가 호출.
  이 슬라이스에서 `Promise<string>` 반환 타입을 붙여야 슬라이스 20의 `dailyLogId`
  흐름이 깨끗해진다(그래서 이 파일이 먼저).
- 테스트: `cloudMemorySave.test.js` 등이 `syncFuelRecords` 경유로 간접 커버.

### 0-D. 감시관 사전검증 (적용→검증→원복 완료, 이번 세션)

아래 §1 설계 그대로 적용 후:
- `npm run typecheck` → **0 에러**
- `npx tsc -p tsconfig.strict-inventory.json --noEmit | grep -cE "error TS"` →
  **434 → 420 (−14)**. `syncWorkData.js(` grep **0줄**.
- `npm test` → unit **561/561** · app **135/135** (fail 0)
- 파일 68 → 83줄(200 이하).
원복함(작업자 커밋 대기).

### 0-E. 지시서 밖 최소 보정 (보리 승인 완료 — §1-B 포함)

1. **`data.id` → `data?.id`** (2곳: `transport_details` delete·insert의 `daily_log_id`).
   보리가 명시 승인. `.single()` 성공 시 정확히 1행을 보장하므로 런타임 동작 사실상 동일
   (`data`가 null이면 원래도 `data.id`에서 TypeError, 이제 `undefined`가 넘어감 —
   실 경로에선 `.single()` 계약상 도달 불가).
2. **`upsertDailyLog` 반환** `return data.id` → `return /** @type {string} */ (data?.id)`.
   `@returns {Promise<string>}`를 맞추기 위한 캐스팅. 바로 위 주석으로 `.single()` 계약
   (error 없으면 non-null) 근거 명시. 도메인 타입 아님(`string`).
3. **루프 바인딩 rename**: `for (const [workDate, record] of ...)` →
   `[workDate, rawRecord]` + 가드 뒤 `const record = /** @type {Record<string, unknown>} */ (rawRecord)`.
   본문의 `record.*` 접근은 무변경(rename은 루프 헤더·가드 2곳 + 새 캐스팅 1줄).
4. **`workData` 캐스팅**: `readJson(...) || {}` 결과를 `/** @type {Record<string, unknown>} */`로.
   `unknown` → 최대한 느슨한 객체 타입(도메인 타입 아님, 슬라이스 12·13 `unknown[]` 선례).
   `Object.entries()` 호출에 필요.

## 1. 착수지시서

### 1-A. 배경
로직 정상 — **타입 주석 + §0-E 최소 보정 4건.** 새 의존성·새 typedef·**런타임 검증기 0**.
`CarLike`/`ClientLike` 재사용. `record`는 `Record<string, unknown>`로 두고 기존 가드가
좁힘(보리 결정). §4 필수 대상이나 §1-F 검증기 없음(도메인 단언 안 함).

### 1-B. 설계 — `src/lib/syncWorkData.js`

1. 1줄째 `// @ts-check`.
2. import 아래:
   ```
   /** @typedef {import('../domain/financeTypes.js').CarLike} CarLike */
   /** @typedef {import('../domain/clientTypes.js').ClientLike} ClientLike */
   ```
3. `syncWorkData`:
   ```
   /**
    * @param {string} userId
    * @param {string} ownerKey
    * @param {Array<CarLike>} cars
    * @param {Array<ClientLike>} clients
    */
   ```
4. `const workData = readJson(keyFor(KEYS.work, ownerKey), {})` →
   `const workData = /** @type {Record<string, unknown>} */ (readJson(keyFor(KEYS.work, ownerKey), {}) || {})`
5. `for (const [workDate, record] of Object.entries(workData || {}))` →
   `for (const [workDate, rawRecord] of Object.entries(workData))`.
   가드 줄: `... || !record || typeof record !== 'object')` → `... || !rawRecord || typeof rawRecord !== 'object')`.
   가드 **다음 줄**에 추가: `const record = /** @type {Record<string, unknown>} */ (rawRecord)`.
   → 이하 본문 `record.callDetails`·`record.isOff`·`record.fixedCount`·`record.palletCount`·
   destructure(`...dailyFields`) 전부 **무변경**.
6. `daily_log_id: data.id`(transport_details delete `.eq`) → `data?.id`.
   `daily_log_id: data.id`(insert map) → `data?.id`.
7. `upsertDailyLog`:
   ```
   /**
    * @param {string} userId
    * @param {string|number} vehicleId
    * @param {string} workDate
    * @param {unknown} record
    * @returns {Promise<string>}
    */
   ```
   `const safeRecord = record && typeof record === 'object' ? record : { isOff: false, fixedCount: 0 }` →
   `const safeRecord = /** @type {Record<string, unknown>} */ (record && typeof record === 'object' ? record : { isOff: false, fixedCount: 0 })`
   `return data.id` → (바로 위 주석 1줄 `// .single()은 성공 시 정확히 1행을 보장 — error가 없으면 data는 non-null.`) + `return /** @type {string} */ (data?.id)`

**그 외 본문 로직 무변경.** `Array.isArray`·`parseEntityNumber`·`!!`·`||` 가드 전부 그대로.
`callDetails.map((detail, index) => ...)` 콜백 무변경(`Array.isArray`가 `any[]`로 좁혀
`detail`은 `any` — TS7006 안 뜸).

### 1-C. 파일
| 파일 | 내용 |
|---|---|
| `src/lib/syncWorkData.js` (수정) | `// @ts-check` + typedef 2 + 함수 2개 JSDoc + `Record<string,unknown>` 캐스팅 3곳 + `data?.id` 2곳 + 반환 캐스팅 1곳 |

### 1-D. 건드리지 않을 것
- Supabase `.upsert`/`.delete`/`.insert` 페이로드 필드(값·키 전부 그대로).
- `if (error) throw error` / `if (deleteError) throw deleteError` / `if (detailError) throw detailError`.
- `onConflict: 'vehicle_id,work_date'`, `.select('id').single()`.
- `Array.isArray(record.callDetails) ? record.callDetails : []` 로직.
- `clientIdByName` Map 구성, `parseEntityNumber` 호출, `!!`·`|| null`·`|| '미수'` 가드.
- 정규식 `/^\d{4}-\d{2}-\d{2}$/`.
- `cloudStorage.js`·`financeTypes.js`·`clientTypes.js`·소비처·테스트.
- `syncExpenseRecords.js` (슬라이스 20에서 별도).

### 1-E. 실패 처리 (§7)
신규 상태 저장소·레이어·큐·tombstone·검증기 0. `data?.id`는 기존 `.single()` 계약 안에서의
방어 표기(신규 fallback 로직 아님). `readJson` 실패 시 `{}` 반환(기존 동작 그대로).

### 1-F. 플레이북 §8 / 4대 질문
§0-A·§3 참조. §4 필수 대상(Supabase 원격 mutation)이나 이 슬라이스는 **타입 주석 +
`Record<string,unknown>` 캐스팅**뿐 — `record`를 도메인 타입으로 좁히지 않음(보리 결정),
신규 durable/retry/tombstone 레이어 0, §1-F 런타임 검증기 없음. hydrate·세션 epoch 가드는
이 파일 범위 밖(호출자 `syncAll`/`cloudSession`).

### 1-G. 작업자 전달문 (보리 착수 승인 완료 2026-09-06 — 이 절만 읽고 그대로 실행)

> **AGENTS.md §1 작업자 규칙을 준수하라. `.md` 파일은 수정하지 말고 지시된 코드 작업만
> 하라. DB 변경 없음.**
>
> **범위 = 1파일**: `src/lib/syncWorkData.js`. **`syncExpenseRecords.js`는 손대지 마라**(다음 슬라이스).
>
> **① `// @ts-check`** 파일 맨 첫 줄.
>
> **② import 아래 typedef 2개**:
> ```
> /** @typedef {import('../domain/financeTypes.js').CarLike} CarLike */
> /** @typedef {import('../domain/clientTypes.js').ClientLike} ClientLike */
> ```
>
> **③ `syncWorkData` JSDoc**: `@param {string} userId` / `@param {string} ownerKey` /
> `@param {Array<CarLike>} cars` / `@param {Array<ClientLike>} clients`.
>
> **④ `workData` 캐스팅**:
> `const workData = readJson(keyFor(KEYS.work, ownerKey), {})` →
> `const workData = /** @type {Record<string, unknown>} */ (readJson(keyFor(KEYS.work, ownerKey), {}) || {})`
>
> **⑤ 루프 바인딩**:
> `for (const [workDate, record] of Object.entries(workData || {})) {` →
> `for (const [workDate, rawRecord] of Object.entries(workData)) {`
> 다음 가드 줄에서 `record` → `rawRecord` 2곳:
> `if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate) || !rawRecord || typeof rawRecord !== 'object') continue`
> 그 **바로 다음 줄** 추가:
> `const record = /** @type {Record<string, unknown>} */ (rawRecord)`
> → 이하 본문의 `record.*` 는 전부 그대로 둔다(수정 금지).
>
> **⑥ `data.id` → `data?.id`** — `syncWorkData` 안 2곳:
> `.delete().eq('daily_log_id', data.id)` → `data?.id`
> insert map 안 `daily_log_id: data.id,` → `daily_log_id: data?.id,`
>
> **⑦ `upsertDailyLog`**:
> JSDoc: `@param {string} userId` / `@param {string|number} vehicleId` /
> `@param {string} workDate` / `@param {unknown} record` / `@returns {Promise<string>}`
> `const safeRecord = record && typeof record === 'object' ? record : { isOff: false, fixedCount: 0 }` →
> `const safeRecord = /** @type {Record<string, unknown>} */ (record && typeof record === 'object' ? record : { isOff: false, fixedCount: 0 })`
> 마지막 `return data.id` →
> ```
>   // .single()은 성공 시 정확히 1행을 보장 — error가 없으면 data는 non-null.
>   return /** @type {string} */ (data?.id)
> ```
>
> **그 외 전부 무변경.** Supabase 페이로드·`throw` 분기·`onConflict`·`Array.isArray`·
> `parseEntityNumber`·`!!`·`||` 전부 그대로. `record`를 `DayRecordLike` 등 도메인 타입으로
> 단언하지 마라(보리 결정 — `Record<string, unknown>`만). 새 typedef·`@ts-ignore` 금지.
> 타입 에러 나면 우회 말고 멈추고 보고(슬라이스 9 교훈).
>
> **완료 후 필수**:
> 1. `npm run typecheck` → **전체 0 에러**. 숫자 보고.
> 2. `npm test` → unit + app 전체 통과. 숫자(예: unit 561 / app 135) 보고.
> 3. `npx tsc -p tsconfig.strict-inventory.json --noEmit 2>&1 | grep -cE "error TS"` → **420**
>    (착수 전 434 → −14). **`grep -E "syncWorkData\.js\("` → 0줄 (이 출력을 보고에 붙여라 — 보리 지시)**.
> 4. `wc -l src/lib/syncWorkData.js` → **83줄** 보고.
> 5. 한국어 커밋 메시지로 **커밋 1개**. **push 하지 마라**.

## 2. 착수 전 상태 (2026-09-06)
- `react-app` HEAD = origin/main = `f161361`(JS→TS 슬라이스 18, CI 초록·보리 `[x]`). 미커밋 없음.
- `ubiquitous-parakeet`: 이번 세션 문서 갱신분 미커밋(슬라이스 16·17·18 `[x]` 기록 +
  슬라이스 19 착수지시서·사전검증).
- strict-inventory 착수 전 434건. 이 슬라이스로 **−14 예상(→420)**.

## 3. AGENTS §8 4대 질문 (착수 전)
1. **구독 vs 스냅샷**: 둘 다 아님 — `syncAll`이 부르는 동기화 실행 함수. 인자로 받은
   `cars`/`clients` + `readJson`으로 읽은 workData를 Supabase에 upsert.
2. **보이는 값 출처**: `workData`는 localStorage(`reactPracticeWorkData:<ownerKey>`),
   `cars`/`clients`는 호출자(`syncAll`)가 넘김.
3. **쓰기 창구**: **Supabase 원격 upsert/delete/insert**(`daily_logs`·`transport_details`).
   이 슬라이스는 그 페이로드·호출 순서·에러 분기를 **한 글자도 안 바꾼다**(타입 주석만).
4. **hydrate·디바운스·동시편집**: 이 파일 범위 밖(호출자 `syncAll` + `cloudSession`
   epoch 가드가 담당). 이 슬라이스는 거기 손대지 않음.

→ 현재/목표: `@ts-check` + JSDoc + `Record<string,unknown>` 캐스팅(도메인 단언 없음) +
`data?.id` 보정 / 건드릴 파일 §1-C 1개 / 안 건드릴 것 §1-D / 실패 시 **신규 레이어·검증기
없음**(§1-E).

## 4. 작업자 구현 완료 보고

- react-app `cc286bd` "types: syncWorkData.js에 @ts-check·JSDoc과 Record 캐스팅 추가"
  (작성자 `ya01na111`, co-author Cursor, 2026-09-06). **push 전(ahead 1)** — 보리 push 대기.
- 변경: `src/lib/syncWorkData.js` (+26/-7, 68→83줄). `// @ts-check` + typedef 2
  (`CarLike`·`ClientLike`) + 함수 2개 JSDoc + `Record<string, unknown>` 캐스팅 3곳
  (workData·loop record·safeRecord) + `data?.id` 2곳 + 반환 캐스팅 1곳(+주석).
- 작업자 보고 숫자: typecheck 0 · npm test unit 561/561 app 135/135 fail 0 ·
  strict-inventory `error TS` 420 · `syncWorkData.js(` grep 0줄 · 줄 수 83.

## 5. 감시관 실사 (push 전 사전 실사 — CI 초록 확인은 push 후)

**감시관이 커밋 `cc286bd` diff 직접 대조 + typecheck·test·strict-inventory 직접 재실행**:

| # | 확인 | 결과 |
|---|---|---|
| 1 | 범위 준수 | ✅ 1파일 +26/-7 = §1-C. §1-D "안 건드릴 것"(Supabase 페이로드 필드·값·키·`throw` 분기·`onConflict`·`.select('id').single()`·`Array.isArray` 로직·`clientIdByName` Map·`parseEntityNumber`·정규식·`syncExpenseRecords.js`) 전부 무변경. `syncExpenseRecords.js` 손 안 댐 |
| 2 | 몰래 증설 없음 | ✅ 신규 파일·의존성·typedef 정의(import만)·저장 키·**런타임 검증기 0**. 캐스팅은 전부 `Record<string, unknown>`(최대 느슨 객체) + 반환 `string` — 도메인 타입 단언 0 |
| 3 | 타입 꼼수 없음 | ✅ diff `^+` grep: `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as`/`DayRecordLike` 0줄. `record`를 `DayRecordLike`로 안 좁힘(보리 결정 준수) |
| 4 | 200줄 | ✅ 83줄 |
| 5 | 테스트 진실성 | ✅ 테스트 파일 변경 0. `cloudMemorySave.test.js`(`syncFuelRecords` 경유 간접) CI 통과. 기존 테스트 약화 0 |
| 6 | 문서 정합 | ✅ react-app diff에 `.md` 0 |
| 7 | 요구사항 충족 | ✅ diff가 §1-G와 **byte 단위 일치**(감시관 사전검증본과도 동일). ①~⑦ 전부 |

**§0-E 최소 보정 확인**:
1. `data.id` → `data?.id` (2곳) — `.single()` 성공 시 정확히 1행 보장이라 런타임 사실상
   동일. 보리 명시 승인.
2. `upsertDailyLog` 반환 `return /** @type {string} */ (data?.id)` + 위 주석 —
   `@returns {Promise<string>}` 충족용 캐스팅, `.single()` 계약 근거.
3·4. 루프 rename + `Record<string, unknown>` 캐스팅 — 본문 `record.*` 무변경.

**감시관 직접 재실행** (커밋된 상태 = `cc286bd`):
- `npm run typecheck` → **0 에러**
- `npx tsc -p tsconfig.strict-inventory.json --noEmit | grep -cE "error TS"` → **420**
  (434 → **−14**, 착수지시서 예측치 정확히 일치 = 파일 진단 14건).
  **`grep -E "syncWorkData\.js\("` → 0줄** (보리 요청 근거):
  ```
  $ npx tsc -p tsconfig.strict-inventory.json --noEmit 2>&1 | grep -E "syncWorkData\.js\(" | wc -l
  0
  ```
- `npm test` → unit **561/561** · app **135/135** (fail 0)
→ 작업자 보고 숫자와 완전 일치.

**§4 플레이북**: `lib/sync*` + Supabase 원격 mutation이라 §4 필수 대상. 그러나 이
슬라이스는 타입 주석 + `Record<string, unknown>` 캐스팅뿐 — `record`를 도메인 타입으로
좁히지 않음(보리 결정), 신규 durable/retry/tombstone/검증기 0. Supabase 페이로드·호출
순서·에러 분기 무변경. §1-F 런타임 검증기 없음.

**§5 사전 실사 전 항목 통과.** 이 파일은 **동기화 실행 함수라 단독 브라우저 검증은
"일지 저장 → Supabase 반영" 경로 스모크** 정도 — 타입 주석 + `data?.id`(계약상 무해)라
동작 영향 없어야 정상. `syncExpenseRecords.js` 경유 테스트가 CI에서 통과.

**CI 확인 (push 후, 2026-09-06):** 보리 push → react-app `main` = origin/main = `cc286bd`.
CI "verify" run `34026552370` **conclusion=success**, headSha `cc286bd…` 일치. job "verify"
스텝 테스트·타입 검사·빌드 **3게이트 전부 success**. → **보리 최종 `[x]` 확정 2026-09-06.**

### 브라우저 테스트 (선택 — 스모크)
> 로그인 후 운행일지 1건 입력·저장 → 새로고침 후 유지되는지(= `daily_logs` upsert 경로).
> 콜상세 1건 있는 날짜로도 확인(= `transport_details` delete+insert). 타입 주석 변경이라
> 동작 영향 없어야 정상. CI `npm test`가 이미 커버.
