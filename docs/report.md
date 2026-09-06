# docs/report.md — Step 11 JS→TS 전환 슬라이스 21: lib/dirtyJournal.js

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **슬라이스 21 전체 `[x]` 확정 완료** — react-app `14ebe52`, CI "verify" 초록 run
> `34029126603`(conclusion=success), 감시관 §5 7항목 통과 + 감시관 직접 재실행
> (`dirtyJournal.js(` 0줄), 보리 `[x]` 2026-09-06. strict-inventory 395→391(−4).
> 상세는 `docs/archive/audit.md` "슬라이스 21". 다음 슬라이스(22 — `outboxReconcile.js`
> 13 등) 착수지시서 작성 시 리셋.
>
> ※ `taxInvoices.js`(19)는 `taxInvoices.test.js` 커플링(부분 fixture + `row.daily_log_id`
>   회귀검증)으로 production-only 불가 → test 파일 번들 필요, 보리 결정으로 뒤로 미룸.

## 0. 조사 메모

**`src/lib/dirtyJournal.js`** (96줄, strict-inventory 4건). owner별·슬라이스별 durable
journal — "이 owner의 이 도메인은 아직 서버에 못 보낸 로컬 변경이 있다"를 새로고침 후에도
남긴다(localStorage `reactPracticeDirtyJournal:<ownerKey>`). revision = commit마다 +1
카운터.

### 0-A. §4 플레이북 / §133 판단

- `lib/*` + **durable journal** + `localStorage` 직접 읽기·쓰기 → **§4 필수**(플레이북 §1
  "durable journal" 명시). 재정독 완료.
- `readJournal`이 `JSON.parse(localStorage)` → revision 카운터로 사용 → **§133 대상**.
- 이미 전 export 함수에 `@param`/`@returns` JSDoc 완비. strict-inventory 4건은 **비export
  헬퍼 3개**(`journalKey`·`readJournal`·`writeJournal`)의 무타입 파라미터뿐.
- **§133 처리**: `readJournal` 반환을 `Record<string, number>`로 정직하게 하되, 기존
  최상위 객체 가드(`typeof parsed === 'object' && !Array.isArray`)를 **각 domain 값을
  `Number(revision) || 0`으로 정규화**하는 데까지 확장한다(§0-C). 신규 모듈·레이어·검증기
  파일 0 — 같은 함수 안 ~4줄. §133 "모든 중첩 value/field를 런타임에서 검증한 뒤에만
  좁혀라"를 그대로 만족.

### 0-B. 소비처 (전부 `@ts-check`)
- `lib/hydrate.js` — `clearDirty` (동기화 성공 후)
- `store/batchWrites.js` — `planDirtyWrite` (commitBatch가 도메인 값+저널을 원자적으로 씀)
- (`markDirty`·`hasDirty`·`getDirtyDomains`·`clearDirtyDomain`은 재시도/배너 경로)
- 타입 변경이 소비처에 **영향 없음**(export 시그니처의 JSDoc은 이미 있었고 그대로).

### 0-C. 지시서 밖 최소 보정 (보리 승인 대상 — §1-B 포함)

**`readJournal` 값 정규화** (1개 함수, ~4줄 교체):
```
// 전
return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
// 후
if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
/** @type {Record<string, number>} */
const journal = {}
for (const [domain, revision] of Object.entries(parsed)) {
  journal[domain] = Number(revision) || 0
}
return journal
```
- **왜**: `@ts-check` + `@returns {Record<string, number>}`를 정직하게 하려면 값이 숫자임을
  런타임에서 확인해야 함(§133). 기존 코드는 최상위 객체 여부만 봤다.
- **동작**: 정상 데이터(revision은 항상 숫자)엔 영향 0. 손상 데이터엔 오히려 **버그 수정** —
  기존엔 `planDirtyWrite`의 `(next[domain] || 0) + 1`이 `next[domain]`가 `"abc"`면
  `"abc1"` 문자열 연결로 깨졌는데, 이제 `Number("abc") || 0 = 0` → `1`. `hasDirty`/
  `getDirtyDomains`의 `> 0` 판정 결과는 정상·손상 모두 기존과 동일.
- **신규 레이어 아님**(§7): 기존 `readJournal` 함수 안의 가드 완성. 새 모듈·큐·tombstone 0.
- 이 정규화 덕에 `hasDirty`/`getDirtyDomains`/`planDirtyWrite`/`clearDirtyDomain` 본문은
  **한 글자도 안 바꿔도** 타입 통과(반환이 `Record<string, number>`라).

### 0-D. 감시관 사전검증 결과 (적용→검증→원복 완료)

- `npm run typecheck` → **0 에러**
- `npx tsc -p tsconfig.strict-inventory.json --noEmit | grep -cE "error TS"` → **395 → 391 (−4)**.
  `dirtyJournal.js(` grep **0줄**.
- `npm test` → unit **561/561** · app **135/135** (fail 0). dirtyJournal 관련 테스트
  (markDirty/clearDirty·failed→retry→flush·single-flight·commitBatch journal 실패) 전부 통과.
- 파일 96 → 120줄(200 이하).

## 1. 착수지시서

### 1-A. 배경
로직 정상(revision 카운터) — **비export 헬퍼 3개 `@param` + `readJournal` 값 정규화(§0-C).**
새 의존성·새 typedef·**신규 검증기 모듈 0**. `Record<string, number>`는 도메인 타입 아님.

### 1-B. 설계 — `src/lib/dirtyJournal.js`

1. 파일 **맨 첫 줄**에 `// @ts-check`.
2. `journalKey`: `@param {string} ownerKey` / `@returns {string}`.
3. `readJournal`: `@param {string} ownerKey` / `@returns {Record<string, number>}` +
   본문을 §0-C대로:
   ```
   function readJournal(ownerKey) {
     try {
       const raw = localStorage.getItem(journalKey(ownerKey))
       const parsed = raw ? JSON.parse(raw) : {}
       if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
       /** @type {Record<string, number>} */
       const journal = {}
       for (const [domain, revision] of Object.entries(parsed)) {
         journal[domain] = Number(revision) || 0
       }
       return journal
     } catch {
       return {}
     }
   }
   ```
   (기존 주석 위에 "각 domain revision을 `Number()||0`으로 정규화" 한 줄 사유 주석 추가 가능.)
4. `writeJournal`: `@param {string} ownerKey` / `@param {Record<string, number>} journal`.

**그 외 함수(`markDirty`·`planDirtyWrite`·`hasDirty`·`getDirtyDomains`·`clearDirty`·
`clearDirtyDomain`) 본문·JSDoc 무변경.** (이미 `@param`/`@returns` 있고, `readJournal`
반환이 `Record<string, number>`라 자연 통과.)

### 1-C. 파일
| 파일 | 내용 |
|---|---|
| `src/lib/dirtyJournal.js` (수정) | `// @ts-check` + 헬퍼 3개 JSDoc + `readJournal` 값 정규화(§0-C) |

### 1-D. 건드리지 않을 것
- `JOURNAL_PREFIX` 상수, `journalKey` 반환식.
- `markDirty`/`planDirtyWrite`/`hasDirty`/`getDirtyDomains`/`clearDirty`/`clearDirtyDomain`
  본문·기존 JSDoc.
- `planDirtyWrite`의 `next[domain] = (next[domain] || 0) + 1`, `hasDirty`의
  `.some((revision) => revision > 0)`, `getDirtyDomains`의 `.filter((domain) => journal[domain] > 0)`.
- `writeJournal`의 `localStorage.setItem(...)` 호출.
- 소비처(`hydrate.js`·`batchWrites.js`), 테스트.

### 1-E. 실패 처리 (§7)
`readJournal` try/catch·`return {}` fallback **그대로**(기존 동작). 값 정규화는 기존 가드의
완성 — 신규 durable/retry/tombstone/journal **레이어 0**. 읽기 실패를 빈 객체로 오인해
cleanup하는 경로 없음(`readJournal`은 순수 읽기, 쓰기는 별도).

### 1-F. 플레이북 §8 / §133
- §4 필수(durable journal + localStorage). §133 대상(`JSON.parse` → 카운터).
- **§133 준수**: `readJournal`이 최상위 객체 + **각 값을 `Number()||0`으로 런타임 정규화**
  후에만 `Record<string, number>`로 좁힌다. JSDoc 스키마(`Record<string, number>`)와
  런타임 정규화가 정확히 일치. 별도 검증기 모듈 없음(§7 "이름만 바꾼 같은 패턴" 회피 —
  기존 함수 안에서 처리).
- durable journal cleanup 방어(§1): 이 슬라이스는 `clearDirty`/`clearDirtyDomain` 본문
  무변경 — cleanup 로직 안 건드림.

### 1-G. 작업자 전달문 (보리 착수 승인 완료 2026-09-06 — 이 절만 읽고 그대로 실행)

> **AGENTS.md §1 작업자 규칙을 준수하라. `.md` 파일은 수정하지 말고 지시된 코드 작업만
> 하라. DB 변경 없음.**
>
> **범위 = 1파일**: `src/lib/dirtyJournal.js`.
>
> **① `// @ts-check`** 를 파일 **맨 첫 줄**에.
>
> **② `journalKey`** JSDoc: `@param {string} ownerKey` / `@returns {string}`.
>
> **③ `readJournal`** JSDoc: `@param {string} ownerKey` / `@returns {Record<string, number>}`.
> 본문 마지막 `return` 한 줄을 다음으로 교체:
> ```
>     if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
>     /** @type {Record<string, number>} */
>     const journal = {}
>     for (const [domain, revision] of Object.entries(parsed)) {
>       journal[domain] = Number(revision) || 0
>     }
>     return journal
> ```
> (`const parsed = raw ? JSON.parse(raw) : {}` 줄과 `try`/`catch { return {} }`는 그대로.)
>
> **④ `writeJournal`** JSDoc: `@param {string} ownerKey` / `@param {Record<string, number>} journal`.
>
> **그 외 함수(`markDirty`·`planDirtyWrite`·`hasDirty`·`getDirtyDomains`·`clearDirty`·
> `clearDirtyDomain`)는 본문·JSDoc 전부 무변경.** `planDirtyWrite`의 `+ 1`, `hasDirty`의
> `revision > 0`, `getDirtyDomains`의 `journal[domain] > 0` 손대지 마라 —
> `readJournal` 반환이 `Record<string, number>`라 그대로 통과한다.
> `any`/`unknown` 파라미터·새 typedef·`@ts-ignore` 금지. 타입 에러 나면 우회 말고 멈추고 보고.
>
> **완료 후 필수**:
> 1. `npm run typecheck` → **전체 0 에러**. 숫자 보고.
> 2. `npm test` → unit + app 전체 통과. 숫자(예: unit 561 / app 135) 보고.
>    특히 dirtyJournal 관련(markDirty/clearDirty·failed→retry→flush·commitBatch journal
>    실패) 통과 확인.
> 3. `npx tsc -p tsconfig.strict-inventory.json --noEmit 2>&1 | grep -cE "error TS"` → **391**
>    (착수 전 395 → −4). `grep -E "dirtyJournal\.js\("` → **0줄**(출력 보고에 붙여라 — 보리 지시).
> 4. `wc -l src/lib/dirtyJournal.js` → **120줄** 보고.
> 5. 한국어 커밋 메시지로 **커밋 1개**. **push 하지 마라**.

## 2. 착수 전 상태 (2026-09-06)
- `react-app` HEAD = origin/main = `fc7980f`(JS→TS 슬라이스 20, CI 초록·보리 `[x]`). 미커밋 없음.
- `ubiquitous-parakeet`: `main` `4bfbf28`(슬라이스 20 기록, **push 대기**) + 이번 갱신분
  (슬라이스 21 착수지시서·사전검증) 미커밋.
- strict-inventory 착수 전 395건. 이 슬라이스로 **−4 예상(→391)**.

## 3. AGENTS §8 4대 질문 (착수 전)
1. **구독 vs 스냅샷**: 둘 다 아님 — durable journal I/O 유틸(순수 read/write).
2. **보이는 값 출처**: `localStorage[reactPracticeDirtyJournal:<ownerKey>]` (JSON, revision
   카운터 맵).
3. **쓰기 창구**: `writeJournal`(단독) + `planDirtyWrite`(값만 계산, 쓰기는 commitBatch가
   `writeAllOrNothing`으로). 이 슬라이스는 쓰기 경로·호출자 **무변경**.
4. **hydrate·디바운스·동시편집**: `hydrate.js`가 `clearDirty`를 부르지만 그 본문은 이
   슬라이스가 안 건드림. 정규화는 read 시점이라 경합 무관.

→ 현재/목표: `@ts-check` + 헬퍼 3개 `@param` + `readJournal` 값 정규화(§133 준수, 동작
무변경/버그수정) / 건드릴 파일 §1-C 1개 / 안 건드릴 것 §1-D / 실패 시 **신규 레이어·검증기
모듈 없음**(§1-E).

## 4. 작업자 구현 완료 보고

- react-app `14ebe52` "types: dirtyJournal.js에 @ts-check·헬퍼 JSDoc과 revision 정규화
  추가" (작성자 `ya01na111`, co-author Cursor, 2026-09-06). **push 전(ahead 1)** — 보리 push 대기.
- 변경: `src/lib/dirtyJournal.js` (+23/-1, 96→120줄). `// @ts-check`(1줄째) + 헬퍼 3개
  (`journalKey`·`readJournal`·`writeJournal`) JSDoc + `readJournal` 본문 마지막 `return`을
  §0-C 정규화 루프로 교체. 그 외 함수 무변경(diff는 `writeJournal`에서 끝).
  ※ 작업자가 `// @ts-check` 뒤·주석블록 앞뒤에 빈 줄 추가(순수 스타일, `@ts-check`는
  여전히 1줄째라 활성 — CI typecheck가 확인).
- 작업자 보고 숫자: typecheck 0 · npm test unit 561/561 app 135/135 fail 0 ·
  strict-inventory `error TS` 391 · `dirtyJournal.js(` grep 0줄 · 줄 수 120.

## 5. 감시관 실사 (push 전 사전 실사 — CI 초록 확인은 push 후)

**감시관이 커밋 `14ebe52` diff 직접 대조 + typecheck·test·strict-inventory 직접 재실행**:

| # | 확인 | 결과 |
|---|---|---|
| 1 | 범위 준수 | ✅ 1파일 +23/-1 = §1-C. §1-D "안 건드릴 것"(`JOURNAL_PREFIX`·`markDirty`·`planDirtyWrite`·`hasDirty`·`getDirtyDomains`·`clearDirty`·`clearDirtyDomain` 본문·`+ 1`·`revision > 0`·`journal[domain] > 0`·`writeJournal` setItem·소비처·테스트) 전부 무변경. diff가 `writeJournal` JSDoc에서 끝남 |
| 2 | 몰래 증설 없음 | ✅ 신규 파일·의존성·typedef·저장 키·durable/retry/tombstone **레이어 0**. `readJournal` 정규화는 기존 함수 안 ~4줄(별도 검증기 모듈 아님) |
| 3 | 타입 꼼수 없음 | ✅ diff `^+` grep: `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as` 0줄. `Record<string, number>`는 도메인 타입 아님. `/** @type {Record<string, number>} */ const journal = {}`는 빈 객체 초기화 주석(단언 아님) |
| 4 | 200줄 | ✅ 120줄 |
| 5 | 테스트 진실성 | ✅ 테스트 파일 변경 0. dirtyJournal 관련 테스트(markDirty/clearDirty·failed→retry→flush·single-flight·commitBatch journal 실패) 전부 통과 — 정규화가 정상 경로 동작 유지 확인 |
| 6 | 문서 정합 | ✅ react-app diff에 `.md` 0 |
| 7 | 요구사항 충족 | ✅ diff가 §1-G와 일치(빈 줄 추가 제외 byte 동일, 감시관 사전검증본과도 동일). ①~④ 전부 |

**§0-C `readJournal` 값 정규화 확인**:
- 기존 `parsed && typeof === 'object' && !Array.isArray ? parsed : {}` (최상위만) →
  최상위 가드 + `Object.entries(parsed)` 각 값 `Number(revision) || 0`.
- **§133 준수**: JSON.parse 결과의 모든 value를 런타임 정규화 후에만
  `Record<string, number>`로 좁힘. JSDoc 스키마와 런타임 정규화 정확히 일치.
- **동작**: 정상 데이터(revision 항상 숫자) 영향 0 — dirtyJournal 테스트 통과가 증명.
  손상 데이터엔 버그 수정(`planDirtyWrite`의 `"abc" + 1` → `0 + 1`). `hasDirty`/
  `getDirtyDomains`의 `> 0` 판정은 정상·손상 모두 기존과 동일.
- **§7 신규 레이어 아님**: 기존 `readJournal` try/catch·`return {}` fallback 그대로,
  기존 top-level 가드의 완성. cleanup(`clearDirty`/`clearDirtyDomain`) 본문 안 건드림.

**감시관 직접 재실행** (커밋된 상태 = `14ebe52`):
- `npm run typecheck` → **0 에러**
- `npx tsc -p tsconfig.strict-inventory.json --noEmit | grep -cE "error TS"` → **391**
  (395 → **−4**, 착수지시서 예측치 정확히 일치 = 파일 진단 4건).
  `grep -E "dirtyJournal\.js\("` → **0줄**.
- `npm test` → unit **561/561** · app **135/135** (fail 0)
→ 작업자 보고 숫자와 완전 일치.

**§4 플레이북**: `lib/*` + durable journal + localStorage → §4 필수. §133 대상이었으나
`readJournal` 값 정규화로 준수(별도 검증기 모듈 없음, §7 회피). durable journal cleanup
방어(§1)는 이 슬라이스가 `clearDirty*` 본문 안 건드려 무영향.

**§5 사전 실사 전 항목 통과.** 이 파일은 **durable journal I/O 유틸이라 단독 브라우저
검증은 "실패 → 로컬 편집 → 새로고침 → 재시도 → 정확히 1회 flush"** 시나리오 —
`dirtyJournal 통합` 테스트가 CI에서 커버.

**CI 확인 (push 후, 2026-09-06):** 보리 push → react-app `main` = origin/main = `14ebe52`.
CI "verify" run `34029126603` **conclusion=success**, headSha `14ebe52…` 일치. job "verify"
스텝 테스트·타입 검사·빌드 **3게이트 전부 success**. → **보리 최종 `[x]` 확정 2026-09-06.**

### 브라우저 테스트 (선택 — 스모크)
> 로그인 실패 상태에서 차량/거래처 1건 수정 → 새로고침 → 재시도 배너에서 재시도 →
> 딱 한 번만 서버 반영되는지. 정규화는 read 시점이라 revision이 정상 숫자면 동작 동일.
