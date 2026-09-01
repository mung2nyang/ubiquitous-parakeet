# 슬라이스 D 작업 지시 — 로그인 일지 저장 (Fail-Fast)

역할: 프론트엔드만 수정한다. DB 스키마·마이그레이션·SQL Editor 작업은 하지 마라.

보리(사용자)가 이 지시서를 작업자에게 넘기는 것이 슬라이스 D 착수 승인이다.

슬라이스 A·B·C는 `[x]`·커밋됨. 로그인 LS 미러 제거(E), Step 8, 차량·거래처 **저장** outbox는 범위 밖.
`docs/business_rules_audit.md` 제약을 이번 슬라이스에서 쳐내거나 새로 넣지 마라.

푸시하지 마라. 커밋은 보리 지시가 있을 때만.
`AGENTS.md` 작업 원칙 본문은 수정하지 마라. 사실 기록은 `docs/sot.md`·`docs/audit.md`에만.

시작 전: `AGENTS.md` (매번). 이 파일. `docs/sot.md` §8–9. hydrate 함정은 `docs/slice-b.md` 보완 절·`docs/slice-c.md`와 같다(빈 서버 ≠ 로컬 원복).
충돌: 이 지시서 > `AGENTS.md`.

저장소: 구현 `react-app` / 원칙 `ubiquitous-parakeet`
HEAD·미커밋 확인. `supabase/.temp/` 섞지 마라.

---

## 게스트 — 손대지 마라

게스트는 기사 초대·차량(기사) 초대를 쓰지 않는다. 그 UI를 수리·숨김·테스트하지 마라.

게스트 **일지**(연습 데이터, 서버 없음)는 제품 연습 경로다. 로그인 클라우드 일지만 Fail-Fast로 바꾼다. 게스트 일지를 숨기거나 JSON 백업을 넣지 마라.

---

## 목표

로그인 사용자의 **메인 차량 일지**(날짜 저장·빈 날 삭제, 콜상세 포함)를 durable journal / fallback / unsafe overlay / tombstone / `retryPendingDayWrites` / `syncWorkData` 일괄 upsert에 맡기지 말고,

1. readiness 후
2. `daily_logs` (+ 그 날짜 `transport_details`)에 **직접 1회** (기존 `upsertDailyLog` 등 실행기 재사용 가능. 새 RPC·새 큐 없음)
3. 성공하면 Store만 갱신 (`commitWorkData` 또는 동등, **`syncToCloud: false`**. dirty journal에 `workData`를 올리지 마라)
4. 실패하면 Store/LS/durable/tombstone을 더 쌓지 않고 토스트 후 return. draft는 화면에 남아도 된다(확정본은 저장 전 Store)

실패 토스트(A·B·C와 동일):

`저장에 실패했습니다. 네트워크 상태를 확인해 주세요.`

로그인 클라우드 경로에서 쓰지 말 것:

- `연결이 복구되면 자동으로 반영됩니다`
- `queueFailedDayWrite` / `registerPendingDayWrite` / `markUnsafeRegistrationFailure`로 클라우드 실패를 숨기기
- 부팅·online 타이머가 옛 durable을 재시도해 Store·서버에 넣는 것

로컬 persist(quota) 실패 토스트 `자동 저장에 실패했습니다. 저장 공간을 확인해 주세요.`는 **게스트 LS**에 남겨도 된다. 로그인 원격 실패에 그 문구를 쓰지 마라.

세션: 원격 전 `captureSession`, 각 await 직후와 Store 반영 직전 `assertSessionStillCurrent`.

빈 날 삭제(`saveDayRecord`가 dateKey를 지우는 경우): 서버에서 그 날짜 `daily_logs`(및 자식 상세) **삭제 1회** 성공 후에만 Store에서 뺀다. **새 workData tombstone을 로그인 경로에 쓰지 마라.** 이미 없는 날짜의 delete 0행은 성공으로 쳐도 된다(멱등). upsert가 `{ data: null, error }` / throw면 Fail-Fast.

서브 차량 일지(`/app/logs/:logId`, `syncWorkData`가 원래 안 올리는 것)는 **이번 슬라이스에서 클라우드로 확장하지 마라.** 로컬만 유지.

---

## 슬라이스 B·C에서 배운 것 — D에서 빠뜨리면 같은 FAIL

저장 토스트 성공 → 새로고침 ~0.6초 뒤 예전 일지가 돌아오거나, 지운 날이 다시 생김.

1. **hydrate가 로컬 맵을 밑바탕으로 깔면 서버 빈 목록이 이긴다**  
   지금 `mergeWorkDataFromRows`: `merged = { ...localWorkData, ...byDate }`. `dailyRows`가 `[]`이면 `byDate`가 비어 **로컬 날짜가 전부 남는다.**  
   고칠 것: `dailyRows`가 배열이면(빈 배열 포함) **서버 날짜 맵이 정본**. 로컬 dateKey를 깔지 마라. fallback은 `dailyRows`가 배열이 아닐 때만.  
   `hydrate.js`가 `dailyRes.data || []`로 null을 빈 배열로 바꾸면 C와 같은 함정이다. 조회 실패는 이미 throw. merge에는 실제 `data`를 넘기고 `Array.isArray`로만 정본 여부를 가라.
2. **dirty journal / durable overlay가 hydrate 결과를 덮으면 서버 정본이 죽는다**  
   `hydrate.js`의 `getDirtyDomains`가 `workData`를 로컬로 되돌리는 경로, `useDayDraft`의 `getPendingDayWrite` 초기 overlay. 로그인 Fail-Fast 저장 후에는 둘 다 **새 항목을 만들지 마라.** 남아 있는 옛 durable 키를 로그인 hydrate·draft 초기화에 **적용하지 마라**(최신 서버를 덮음).
3. **tombstone을 되살리지 마라.** 서버에서 지웠으면 hydrate에 그 날짜가 없다. 로그인 새 삭제에 tombstone이 필요 없다.

---

## 4대 기준 (D만)

1. 화면은 기존 `useOwnerWorkData` / `useDayDraft`. `loadWorkData` 스냅샷 복귀 금지.
2. 확정 값은 Store. 서버 쓰기 **성공 후**에만 Store. 실패 시 저장 전 값. 입력 중 draft는 그대로(기존 디바운스 계약).
3. 로그인 클라우드 창구는 `useDayDraft` `commitNow`(및 그것이 부르는 일지 저장). 로그인에서 배럴 `saveWorkData` / `scheduleCloudSync` / `syncWorkData` 전체 맵 upsert로 우회하지 마라. 게스트는 지금처럼 LS `commitWorkData`.
4. 재시도 큐 없음. 신규 durable/fallback/unsafe/tombstone **없음**. 기존 `pendingWorkDataWrites.js` 파일을 한 번에 지울 필요는 없다. **로그인 경로가 새 항목을 넣지 않고, 재시도가 로그인 Store/서버를 덮지 않으면** 된다.

**범위에 넣지 말 것:** `requestVehicleSave` / `requestClientSave`, 비용·설정·계산서, 로그인 업무 LS 미러 제거(E), Step 8, 서브 일지 클라우드 신규 동기화.

---

## 건드릴 파일 (예상)

- `src/components/day-log/useDayDraft.js` — 로그인 클라우드: 서버 1회 후 Store. durable 등록 제거
- `src/components/day-log/dayDraftLifecycle.js` — 로그인에서 `queueFailedDayWrite` 안 탐
- `src/lib/hydrateMergeWork.js` — 빈 `dailyRows` 배열 = 빈 일지 맵
- `src/lib/hydrate.js` — merge에 넘기는 `dailyRows`(null을 `[]`로 위장하지 않기). 로그인 durable overlay 금지
- 일지 서버 실행기: `src/lib/syncWorkData.js`의 `upsertDailyLog` 재사용 또는 같은 파일에 날짜 단위 delete. **`syncWorkData` 전체 루프를 저장 창구로 쓰지 마라.** `syncDeletedWorkDates.js`에 **새** tombstone 의존을 넣지 마라
- `src/lib/workData.js` — 로그인 클라우드는 tombstone check 커밋을 쓰지 않을 수 있음. 게스트/서브는 최소 변경
- 관련 테스트: `useDayDraft` / `hydrateMerge` / `pendingWorkDataWrites` / `App` 일지. 로그인 Fail-Fast 계약을 깨는 assert만 바꿔라

건드리지 말 것: `requestDriver*` / `driverLinkRpc.js`, C 차량·거래처 **삭제**, 게스트 초대 UI, `AGENTS.md` 원칙 본문, Step 8.
`pendingWriteRetryListeners.js`: 로그인 사용자에게 클라우드 재시도를 돌리지 마라. 모듈 삭제는 필수 아님.

200줄. `useDayDraft.js`가 넘치면 분리 설계를 먼저 보고하고 승인 없이 쪼개지 마라.

---

## 테스트

- hydration failed: 로그인 일지 커밋 → Store·LS 유지, 서버 0회, 성공 저장 상태 아님
- ready + throw / `{ data: null, error }`: Fail-Fast 토스트, `hasPendingDayWrites`에 **새** 항목 없음, Store 저장 전 값
- 성공(저장): `daily_logs` upsert(또는 동등) **해당 날짜 1회**, Store 반영, dirty/`syncToCloud`로 전체 맵 재upsert 없음
- 성공(빈 날 삭제): 서버 delete 후 Store에서 그 dateKey 없음. 새 tombstone 없음
- `mergeWorkDataFromRows(로컬 날짜 있음, dailyRows: [])` → `{}` (로컬 날짜 잔존 금지). `dailyRows`가 배열 아니면 로컬 유지
- 세션 전환: Store 미반영
- 유효 테스트 삭제 금지. 게스트 초대 assert 추가 금지. durable 모듈의 **게스트·순수 큐** 테스트는 로그인 경로가 안 타면 유지해도 된다

---

## 완료 시

- 프로덕션 200줄. `// @ts-check`. any/unknown/@ts-ignore 금지
- Phase 1 보고 후 대기. `[x]`·커밋·푸시는 보리
- 보리 실검증: 로그인 → 일지 저장 → 새로고침·hydrate 후에도 값 유지. 빈 날로 지운 뒤 새로고침해도 안 살아남. 네트워크 차단 시 Fail-Fast 토스트, 새로고침 후 서버(저장 전) 값. pending/자동재시도로 조용히 올라가지 않음

상태 (2026-09-01): 구현 완료(옵션 A, `commitNow`는 클라우드 저장을 fire-and-forget). 보리 실검증 이상 없음. 감독관 `[x]`. 커밋 `react-app` `f33699c`.
