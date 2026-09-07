# docs/report.md — Step 11 JS→TS 전환 슬라이스 24: domain/taxInvoices.js (+ .test.js 번들)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **슬라이스 24 전체 `[x]` 확정 (2026-09-06)** — react-app `3352601`, CI "verify" 초록
> run `34033230641`(conclusion=success, 3게이트 green), 감시관 §5 7항목 통과 + 직접
> 재실행(진단 diff 회귀 0), 보리 브라우저 스모크 통과 + `[x]`. strict-inventory 373→350(−23).
> **이걸로 프로덕션 JS→TS 전환 종료.** 다음(슬라이스 25 — 잔여 UI 4파일 or `.test.js` 정책)
> 착수지시서 작성 시 리셋.
> 대상 = `domain/taxInvoices.js`(19건) + `domain/taxInvoices.test.js`(4건) **번들 전환**
> (보리 결정 2026-09-06 "묶어서 전환하자").
> **이걸로 프로덕션 JS→TS 종료** — 남는 건 UI 4파일(각 1) + `.test.js` 나머지(정책 결정 대기).

## 0. 조사 메모

### 0-A. 왜 번들인가

`domain/taxInvoices.js`는 순수 계산이라 원래 production-only 전환이 목표였으나,
`domain/taxInvoices.test.js`가 **의도적으로 "없는 컬럼"을 검증**한다(`row.daily_log_id`
=== undefined 등 — 원본 finance-sync가 10컬럼만 쓴다는 회귀 방어). 프로덕션에 정확한
반환 타입을 달면 그 negative assertion이 TS2339가 되고, 테스트 fixture(부분 객체)도
strict 진단이 는다(4 → ~15). **원칙 13("strict 증가 금지")** 위반. → 보리 결정으로 test
파일도 같이 `@ts-check`+타입 정리해 한 커밋으로 처리.

### 0-B. 파일 개요

**`src/domain/taxInvoices.js`** (54줄, `@ts-check` 없음, strict 19건). 세금계산서 순수 계산
6함수. 실제 Supabase I/O는 `lib/syncTaxInvoicesTable.js`(이미 `@ts-check`)가, 하이드레이트
병합 호출은 `lib/hydrate.js:161`이 한다.

| 함수 | 하는 일 | 읽는 필드 |
|---|---|---|
| `parseEntityNumber(value)` | `'630,000'` → `630000` | — (문자열화) |
| `resolveTaxInvoiceVehicleId(item, settings)` | 차량 supabaseId 해소 | `item.carNumber`·`item.vehicleNumbers`, `settings.cars` |
| `matchTaxInvoiceClientId(item, clients)` | 거래처 supabaseId 해소 | `item.clientName`, `client.companyName`·`client.supabaseId` |
| `buildTaxInvoiceRow(item, {userId,vehicleId,clientId})` | tax_invoices 10컬럼 행 조립 | `item.flow/monthKey/supplyAmount/taxAmount/totalAmount/status`, 전체를 `raw`에 |
| `mergeTaxInvoiceRecords(localRecords, rows)` | 서버 행을 로컬 초안에 id 기준 병합 | `row.raw`(jsonb), `row.id` |
| `applyInsertedTaxInvoiceId(records, localId, supabaseId)` | insert 성공 후 supabaseId 부착 | `item.id` |

### 0-C. 타입 전략 (신규 도메인 typedef 최소 — 재사용 우선)

- `import('./financeTaxInvoiceEntries.js').InvoiceLike` 재사용 — `mergeTaxInvoiceRecords`·
  `applyInsertedTaxInvoiceId`의 레코드(= app-store `invoices` 슬라이스 값).
- `import('./financeTypes.js').CarLike` 재사용 — `settings.cars`.
- **함수별 "실제로 읽는 필드"만 좁은 인라인 타입**으로(호출부·테스트 fixture 오염 최소):
  - `resolveTaxInvoiceVehicleId` item → `{ carNumber?: string|null, vehicleNumbers?: Array<string>|null }`
  - `matchTaxInvoiceClientId` item → `{ clientName?: string }`, clients → `Array<{ companyName?: string, supabaseId?: string|number }>`
  - `buildTaxInvoiceRow` item → 신규 `TaxInvoiceItemInput`(읽는 6필드 + `id`, 전부 optional,
    금액은 `number|string`) — 실제론 `InvoiceLike`가 넘어오지만 test가 문자열 금액을 넣어봄.
  - `syncTaxInvoicesTable.js`는 `InvoiceLike`를 넘김 → 위 좁은 타입들에 **구조적으로 assign 가능**,
    호출부 수정 0.
- 신규 typedef 2개(`TaxInvoiceItemInput`·`TaxInvoiceRow`) — 전부 **이 파일 로컬**, 다른 도메인
  타입 파일 안 건드림.

### 0-D. §133 — `mergeTaxInvoiceRecords`의 `row.raw`

`row.raw`는 Supabase jsonb(하이드레이트 서버 행). 기존 런타임 가드:
`row?.raw && typeof row.raw === 'object'` + `if (!raw.id) return`.
- **처리(보리 standing 결정, STATUS)**: `raw`를 `/** @type {Record<string, unknown>} */`로
  좁히고(도메인 단언 아님), `record`를 `/** @type {InvoiceLike} */ ({ ...raw, supabaseId })`로 —
  **신규 검증기 모듈 0**, 기존 가드 그대로, 슬라이스 19·20·22와 동일 방침.
- 런타임 **byte 무변경**(캐스팅은 컴파일 타임만).

### 0-E. 동작 변경 여부

**프로덕션 런타임 변경 0.** 6함수 전부 본문 무변경 — `mergeTaxInvoiceRecords`만 `raw`/
`record`에 `/** @type */` 캐스팅 2개 추가(컴파일 타임 전용). `parseEntityNumber`엔
`@param {unknown}`만. 테스트는 assertion **결과 동일**(negative 3개는 loose 접근으로 바꿔도
값 검사 그대로).

### 0-F. 소비처

- `lib/syncTaxInvoicesTable.js`(`@ts-check`) — `resolveTaxInvoiceVehicleId`·
  `matchTaxInvoiceClientId`·`buildTaxInvoiceRow`·`applyInsertedTaxInvoiceId`·상수. `InvoiceLike`
  넘김 → 좁은 인라인 타입에 assign OK, **수정 0**.
- `lib/hydrate.js`(`@ts-check`) — `mergeTaxInvoiceRecords(nextInvoices, taxInvoicesRes.data || [])`.
  `nextInvoices`는 `Array<InvoiceLike>`, `.data`는 `Array<{id, raw?}>`에 assign OK, **수정 0**.
- `domain/financeTaxInvoiceEntries.js` — `taxInvoices`를 import하지 않음(grep 오탐 — 파일명
  문자열). 무관.

### 0-G. 감시관 사전검증 결과 (로컬 적용 → 검증 → `git checkout` 원복 완료)

착수지시서 §1-B대로 적용 후:
- `npm run typecheck` → **0 에러**
- `npx tsc -p tsconfig.strict-inventory.json --noEmit | grep -cE "error TS"` → **373 → 350 (−23)**.
  `33c0420`(슬라이스 23) 기준 before/after 진단 목록 diff: **제거 23, 추가 0**(회귀 0).
  `taxInvoices.js(`·`taxInvoices.test.js(` grep → **0줄**.
  (`TaxInvoicePage.workInvoiceSoT.test.js(11,12)` TS7017은 착수 전부터 있던 **별개** 진단 —
  이 슬라이스 대상 아님.)
- `npm run test:unit` → **561/561** · `npm test`(app) → **135/135** (fail 0).
- 표적 `taxInvoices.test.js` → **7/7** (fail 0).
- `wc -l`: `taxInvoices.js` 54→**113**, `taxInvoices.test.js` 91→**101** (둘 다 200 이하).
- 원복 후 `git status` 클린 확인.

## 1. 착수지시서

### 1-A. 배경
로직 정상. 프로덕션 6함수 본문 무변경 + 타입 주석 + `mergeTaxInvoiceRecords` 캐스팅 2개
(§0-D, 컴파일 타임). test 파일은 `@ts-check` + fixture 타입 주석 3곳 + negative assertion
loose 접근 1곳. **신규 도메인 타입 파일·검증기·레이어 0.**

### 1-B. 설계

**파일 1 — `src/domain/taxInvoices.js`** — 아래 "결과 파일 전체"로 교체(1-G [A]).
- `// @ts-check` + 상단 주석 + typedef 4개(`InvoiceLike`·`CarLike` 재사용 import 2 +
  로컬 `TaxInvoiceItemInput`·`TaxInvoiceRow` 2).
- 6함수에 JSDoc. `parseEntityNumber` `@param {unknown}`. 좁은 인라인 타입(§0-C).
- `mergeTaxInvoiceRecords`: `raw` → `/** @type {Record<string, unknown>} */ (row.raw)`,
  `record` → `/** @type {InvoiceLike} */ ({ ...raw, supabaseId: row.id })`. 그 외 본문 무변경.

**파일 2 — `src/domain/taxInvoices.test.js`** — 5곳(1-G [B]):
1. 맨 첫 줄 `// @ts-check`.
2. import 뒤 typedef 2줄(`InvoiceLike`·`CarLike`).
3. `const CARS` 앞에 `/** @type {Array<CarLike>} */`.
4. `row.daily_log_id/work_date/sequence` 3줄 → `const extraColumns = /** @type {Record<string, unknown>} */ (row)` 경유 접근(값 검사는 그대로).
5. `const records = [{ id: …, status: 'draft' }]` 앞에 `/** @type {Array<InvoiceLike>} */`.
- 그 외 test 본문·assertion 값·`describe`/`test` 구조 **무변경**.

### 1-C. 파일
| 파일 | 내용 |
|---|---|
| `src/domain/taxInvoices.js` (수정) | `@ts-check` + typedef 4 + 6함수 JSDoc + `mergeTaxInvoiceRecords` 캐스팅 2 |
| `src/domain/taxInvoices.test.js` (수정) | `@ts-check` + typedef 2 + fixture `@type` 3 + negative assertion loose 접근 1 |

### 1-D. 건드리지 않을 것
- 6함수 **본문 로직**(`parseEntityNumber` 정규식·`resolveTaxInvoiceVehicleId` 분기·
  `matchTaxInvoiceClientId` find·`buildTaxInvoiceRow` 10필드·`mergeTaxInvoiceRecords`
  findIndex/push·`applyInsertedTaxInvoiceId` map). `mergeTaxInvoiceRecords`는 캐스팅 2개만.
- `TAX_INVOICE_VEHICLE_RETRY_ERROR` 문자열.
- `lib/syncTaxInvoicesTable.js`·`lib/hydrate.js`·`domain/financeTaxInvoiceEntries.js`·
  `domain/financeTypes.js`·`domain/clientTypes.js` (전부 그대로).
- test의 assertion **값**·`ORIGINAL_COLUMNS` 배열·`describe`/`test` 이름·fixture **데이터**
  (타입 주석만 추가, 값 변경 0).
- `TaxInvoicePage.workInvoiceSoT.test.js`(별개 TS7017, 이 슬라이스 밖).

### 1-E. 실패 처리 (§7)
- 6함수 순수 계산. 신규 durable/retry/tombstone/journal/fallback/**검증기 레이어 0**.
- `mergeTaxInvoiceRecords`의 `raw` 캐스팅은 기존 `typeof object` + `!raw.id` 가드 유지 —
  손상 행은 기존처럼 `return`으로 건너뜀.

### 1-F. 플레이북 §8 / §133
- `domain/taxInvoices*`는 §4 명시 목록 아님(순수 계산). `mergeTaxInvoiceRecords`가 하이드레이트
  경로에서 서버 jsonb를 읽으므로 §133 형식상 대상 → `Record<string, unknown>` + 기존 가드로
  좁힘, **신규 검증기 0**(보리 standing 결정, 슬라이스 19·20·22 동일).
- `buildTaxInvoiceRow`는 Supabase 행을 **조립**만(전송은 `syncTaxInvoicesTable.js`) — 이
  슬라이스는 그 컬럼·값 매핑 무변경.
- §7 증설 0. 세션 epoch·원자적 쓰기는 이 파일 영역 아님.

### 1-G. 작업자 전달문 (보리 착수 승인 시 이 절만 읽고 그대로 실행)

> **AGENTS.md §1 작업자 규칙을 준수하라. `.md` 파일은 수정하지 말고 지시된 코드 작업만
> 하라. DB 변경 없음.**
>
> **범위 = 2파일**: `src/domain/taxInvoices.js`, `src/domain/taxInvoices.test.js`.
>
> **[A] `src/domain/taxInvoices.js`** — 파일 전체를 아래로 교체:
> ```js
> // @ts-check
> // 세금계산서(tax_invoices) 순수 계산 — 금액 파싱, 차량/거래처 id 해소, upsert 행 조립,
> // 서버 행 병합. 실제 Supabase I/O는 lib/syncTaxInvoicesTable.js가, 하이드레이트 병합
> // 호출은 lib/hydrate.js가 한다. 타입은 기존 InvoiceLike/CarLike 재사용.
> /** @typedef {import('./financeTaxInvoiceEntries.js').InvoiceLike} InvoiceLike */
> /** @typedef {import('./financeTypes.js').CarLike} CarLike */
>
> /**
>  * @typedef {Object} TaxInvoiceItemInput buildTaxInvoiceRow가 읽는 필드만 — 실제로는 InvoiceLike가 넘어온다
>  * @property {string} [id] raw로 저장돼 mergeTaxInvoiceRecords가 병합 키로 다시 읽는다
>  * @property {string} [flow]
>  * @property {string} [monthKey]
>  * @property {number|string} [supplyAmount]
>  * @property {number|string} [taxAmount]
>  * @property {number|string} [totalAmount]
>  * @property {string} [status]
>  */
>
> /**
>  * @typedef {Object} TaxInvoiceRow tax_invoices 테이블 insert/update 행 (원본 finance-sync 10컬럼)
>  * @property {string} user_id
>  * @property {string|number|null} vehicle_id
>  * @property {string|number|null} client_id
>  * @property {string|null} flow
>  * @property {string|null} month_key
>  * @property {number} supply_amount
>  * @property {number} tax_amount
>  * @property {number} total_amount
>  * @property {string} status
>  * @property {TaxInvoiceItemInput} raw
>  */
>
> /** @param {unknown} value */
> export function parseEntityNumber(value) {
>   const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
>   return Number.isFinite(parsed) ? parsed : 0
> }
>
> export const TAX_INVOICE_VEHICLE_RETRY_ERROR = '차량 정보가 아직 서버에 등록되지 않았습니다. 잠시 후 다시 시도해 주세요.'
>
> /**
>  * @param {{ carNumber?: string|null, vehicleNumbers?: Array<string>|null }} item
>  * @param {{ cars?: Array<CarLike> }} [settings]
>  * @returns {string|number|null}
>  */
> export function resolveTaxInvoiceVehicleId(item, settings = {}) {
>   const cars = Array.isArray(settings.cars) ? settings.cars : []
>   const carNumber = item?.carNumber || (Array.isArray(item?.vehicleNumbers) ? item.vehicleNumbers[0] : null)
>   if (carNumber) {
>     const car = cars.find((entry) => entry.number === carNumber)
>     return car?.supabaseId || null
>   }
>   const mainCar = cars.find((entry) => entry.type === 'main')
>   return mainCar?.supabaseId || null
> }
>
> /**
>  * @param {{ clientName?: string }} item
>  * @param {Array<{ companyName?: string, supabaseId?: string|number }>} [clients]
>  * @returns {string|number|null}
>  */
> export function matchTaxInvoiceClientId(item, clients = []) {
>   const matched = (clients || []).find((client) => client.companyName === item?.clientName)
>   return matched?.supabaseId || null
> }
>
> /**
>  * @param {TaxInvoiceItemInput} item
>  * @param {{ userId: string, vehicleId: string|number|null, clientId?: string|number|null }} params
>  * @returns {TaxInvoiceRow}
>  */
> export function buildTaxInvoiceRow(item, { userId, vehicleId, clientId }) {
>   return {
>     user_id: userId,
>     vehicle_id: vehicleId,
>     client_id: clientId || null,
>     flow: item?.flow || null,
>     month_key: item?.monthKey || null,
>     supply_amount: parseEntityNumber(item?.supplyAmount),
>     tax_amount: parseEntityNumber(item?.taxAmount),
>     total_amount: parseEntityNumber(item?.totalAmount),
>     status: item?.status || 'draft',
>     raw: item,
>   }
> }
>
> /**
>  * @param {Array<InvoiceLike>} localRecords
>  * @param {Array<{ id: string|number, raw?: unknown }>} rows tax_invoices 서버 행
>  * @returns {Array<InvoiceLike>}
>  */
> export function mergeTaxInvoiceRecords(localRecords, rows) {
>   const merged = [...(localRecords || [])]
>   ;(rows || []).forEach((row) => {
>     const raw = row?.raw && typeof row.raw === 'object' ? /** @type {Record<string, unknown>} */ (row.raw) : {}
>     if (!raw.id) return
>     const record = /** @type {InvoiceLike} */ ({ ...raw, supabaseId: row.id })
>     const index = merged.findIndex((item) => item.id === record.id)
>     if (index >= 0) merged[index] = record
>     else merged.push(record)
>   })
>   return merged
> }
>
> /**
>  * @param {Array<InvoiceLike>} records
>  * @param {string} localId
>  * @param {string|number} supabaseId
>  * @returns {Array<InvoiceLike>}
>  */
> export function applyInsertedTaxInvoiceId(records, localId, supabaseId) {
>   return (records || []).map((item) => (item.id === localId ? { ...item, supabaseId } : item))
> }
> ```
>
> **[B] `src/domain/taxInvoices.test.js`** — 딱 5곳:
> - **첫 줄**에 `// @ts-check`.
> - import 블록 다음 빈 줄 아래에:
>   ```
>   /** @typedef {import('./financeTaxInvoiceEntries.js').InvoiceLike} InvoiceLike */
>   /** @typedef {import('./financeTypes.js').CarLike} CarLike */
>   ```
> - `const CARS = [` **바로 위 줄**에 `/** @type {Array<CarLike>} */`.
> - 다음 3줄:
>   ```
>   assert.equal(row.daily_log_id, undefined)
>   assert.equal(row.work_date, undefined)
>   assert.equal(row.sequence, undefined)
>   ```
>   을:
>   ```
>   // 원본 finance-sync 행엔 이 3개 컬럼이 없다 — 부재를 명시적으로 검증(빌더 반환 타입엔 없어 loose 접근)
>   const extraColumns = /** @type {Record<string, unknown>} */ (row)
>   assert.equal(extraColumns.daily_log_id, undefined)
>   assert.equal(extraColumns.work_date, undefined)
>   assert.equal(extraColumns.sequence, undefined)
>   ```
> - `const records = [{ id: 'sales|2026-05|한진', status: 'draft' }]` **바로 위 줄**에
>   `/** @type {Array<InvoiceLike>} */`.
> - **그 외 test 파일은 한 줄도 건드리지 마라**(assertion 값·fixture 데이터·`describe`/`test` 무변경).
>
> `any`/`unknown` 파라미터·다른 도메인 타입 파일 수정·`@ts-ignore`·`as unknown as` 금지.
> 타입 에러 나면 우회하지 말고 **멈추고 보고**.
>
> **완료 후 필수** (숫자를 보고에 붙여라):
> 1. `npm run typecheck` → **전체 0 에러**.
> 2. `npm run test:unit` → **561**, `npm test`(app) → **135** (fail 0).
> 3. `npx tsc -p tsconfig.strict-inventory.json --noEmit 2>&1 | grep -cE "error TS"` → **350**
>    (착수 전 373 → −23). `... | grep -E "taxInvoices\.js\(|taxInvoices\.test\.js\("` → **0줄**
>    (출력을 보고에 붙여라).
> 4. `node --experimental-test-module-mocks --test-force-exit --test "src/domain/taxInvoices.test.js"` → **7/7**.
> 5. `wc -l src/domain/taxInvoices.js src/domain/taxInvoices.test.js` → **113 / 101**.
> 6. 한국어 커밋 메시지로 **커밋 1개**. **push 하지 마라.**

## 2. 착수 전 상태 (2026-09-06)
- `react-app` HEAD = origin/main = `33c0420`(JS→TS 슬라이스 23, CI 초록·보리 `[x]`). 미커밋 없음.
- `ubiquitous-parakeet`: `main` `7f2c550`(슬라이스 21 기록, **push 대기**) + 슬라이스 22·23
  `[x]` 기록 + 이 슬라이스 24 착수지시서 미커밋.
- strict-inventory 착수 전 **373건**. 이 슬라이스로 **−23 예상(→350)**.

## 3. AGENTS §8 4대 질문 (착수 전)
1. **구독 vs 스냅샷**: 둘 다 아님 — 세금계산서 순수 계산 함수(파싱·매핑·병합). 구독/스냅샷은
   호출부(`hydrate.js`·`syncTaxInvoicesTable.js`).
2. **보이는 값 출처**: 입력은 app-store `invoices` 슬라이스(`InvoiceLike`) + `tax_invoices`
   서버 행(`.data`, jsonb `raw` 포함). 이 슬라이스는 읽기·매핑만.
3. **쓰기 창구**: 이 파일 **쓰기 없음**. `buildTaxInvoiceRow` 결과를 `syncTaxInvoicesTable.js`가
   `supabase.from('tax_invoices').insert/update`. 이 슬라이스는 그 행 shape·값 무변경.
4. **hydrate·디바운스·동시편집**: `mergeTaxInvoiceRecords`가 하이드레이트에서 "서버 발급상태 vs
   로컬 초안"을 id 기준 병합 — 이 슬라이스는 그 병합 규칙 무변경(캐스팅만). 경합 무관.

→ 현재/목표: `@ts-check` + 6함수 JSDoc(기존 타입 재사용 + 로컬 typedef 2) + `raw`/`record`
캐스팅 2 + test 파일 `@ts-check`·fixture 타입 5곳 / 건드릴 파일 §1-C 2개 / 안 건드릴 것
§1-D / 실패 시 **신규 레이어·검증기 없음, 증설 0**(§1-E·§1-F).

## 4. 작업자 구현 완료 보고

- react-app `3352601` "types: taxInvoices.js·test에 @ts-check와 TaxInvoice JSDoc 추가"
  (작성자 `ya01na111`, co-author Cursor, 2026-09-06). **push 전(ahead 1)** — 보리 push 대기.
- 변경: `src/domain/taxInvoices.js`(+63/-4) + `src/domain/taxInvoices.test.js`(+12/-3). 2파일 1커밋.
- 작업자 보고 숫자: typecheck 0 · test:unit 561/561 · test:app 135/135 · strict-inventory
  `error TS` 350(−23) · 프로덕션+test grep 0줄 · 표적 7/7 · 줄 수 113/101.

## 5. 감시관 실사 (push 전 사전 실사 — CI 초록 확인은 push 후)

**감시관이 커밋 `3352601` diff 직접 대조 + typecheck·test·strict-inventory 직접 재실행 +
`33c0420` 기준 진단 목록 before/after diff:**

| # | 확인 | 결과 |
|---|---|---|
| 1 | 범위 준수 | ✅ 2파일 = §1-C. `taxInvoices.js`는 §1-G [A] "파일 전체"와 byte 일치(6함수 본문 로직 무변경, `mergeTaxInvoiceRecords` 캐스팅 2개만). `taxInvoices.test.js`는 §1-G [B] 딱 5곳(`@ts-check`·typedef 2·`CARS` `@type`·negative 3줄 `extraColumns` 경유·`records` `@type`) |
| 2 | 몰래 증설 없음 | ✅ 신규 파일·저장 키·durable/큐/tombstone/**검증기 0**. typedef 4개 중 2는 기존 재사용 import(`InvoiceLike`·`CarLike`), 2는 이 파일 로컬(`TaxInvoiceItemInput`·`TaxInvoiceRow`) |
| 3 | 타입 꼼수 없음 | ✅ diff `^+` grep: `@ts-ignore`/`@ts-expect-error`/`as unknown as` **0줄**. `@param {unknown} value`는 `String(value ?? '')`로 즉시 처리하는 파서라 정당. `/** @type {Record<string, unknown>} */`·`/** @type {InvoiceLike} */` 캐스팅 2곳은 §0-D·§133 처리(기존 `typeof object`+`!raw.id` 가드 유지, 신규 검증기 0 — 보리 standing 결정, 슬라이스 19·20·22 동일) |
| 4 | 200줄 | ✅ 113 / 101 |
| 5 | 테스트 진실성 | ✅ assertion **값**·fixture **데이터**·`describe`/`test` 구조 무변경. negative 3개(`daily_log_id`/`work_date`/`sequence` === undefined)는 `extraColumns` 경유로 **동일 값 검사 유지**. `33c0420` 기준 strict 진단 diff = **제거 23, 추가 0**. test:unit 561·app 135·표적 7/7 통과 |
| 6 | 문서 정합 | ✅ react-app diff에 `.md` 0 |
| 7 | 요구사항 충족 | ✅ §1-G [A] 파일 전체 + [B] 5곳 전부 |

**감시관 직접 재실행** (커밋된 상태 = `3352601`):
- `npm run typecheck` → **0 에러**
- `npx tsc -p tsconfig.strict-inventory.json --noEmit | grep -cE "error TS"` → **350**
  (`33c0420` 373 → **−23**, 착수지시서 예측치 정확히 일치). before/after 목록 diff:
  **제거 23 · 추가 0**. `taxInvoices.js(`·`taxInvoices.test.js(` grep → **0줄**.
  (`TaxInvoicePage.workInvoiceSoT.test.js(11,12)` TS7017은 착수 전부터 있던 별개 진단 — 무관.)
- `npm run test:unit` → **561/561** · `npm test`(app) → **135/135** (fail 0)
- 표적 `taxInvoices.test.js` → **7/7** (fail 0)
→ 작업자 보고 숫자와 완전 일치.

**§4 플레이북 / §133**: `domain/taxInvoices*`는 §4 명시 목록 아님(순수 계산). `buildTaxInvoiceRow`는
Supabase 행 **조립**만(전송은 `syncTaxInvoicesTable.js`), `mergeTaxInvoiceRecords`가 하이드레이트
경로에서 서버 jsonb `raw`를 읽으므로 §133 형식상 대상 → `Record<string, unknown>` + 기존
런타임 가드로 좁힘, **신규 검증기 모듈 0**. 6함수 본문 로직 무변경. §7 증설 0.

**§5 사전 실사 전 항목 통과.** 순수 계산 함수라 단독 브라우저 검증은 "세금계산서 저장 →
새로고침 후 발급상태 유지" 시나리오 — `taxInvoices.test.js`가 CI에서 커버.

### 브라우저 테스트 (스모크)
> 로그인 상태 → 세금계산서 화면에서 1건 발급/저장 → 새로고침 → 발급 상태·금액이 그대로인지.
> (거래처·차량이 매칭돼 금액이 정상 표시되는지도.)

**CI 확인 (push 후, 2026-09-06):** 보리 push(1차 미도달 → 재푸시) → `origin/main` = `3352601`.
CI "verify" run `34033230641` **conclusion=success**, headSha `3352601…` 일치. job "verify"
스텝 **테스트·타입 검사·빌드 3게이트 전부 success**. → 남은 것: 보리 브라우저 스모크 → 최종 `[x]`.
**이 슬라이스로 프로덕션 JS→TS 전환 종료** — 잔여는 UI 4파일(각 1) + `.test.js` 나머지(정책 결정).
