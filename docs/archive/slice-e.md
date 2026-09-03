# 슬라이스 E 작업 지시 — 로그인 업무 데이터 localStorage 미러 제거 (Fail-Fast)

역할: 프론트엔드만 수정한다. DB 스키마·마이그레이션·SQL Editor 작업은 하지 마라.

보리(사용자)가 이 지시서를 작업자에게 넘기는 것이 슬라이스 E 착수 승인이다. 아래 4대 기준이 §0-1 C의 선행 보고를 대체한다(이 파일 = 승인된 범위).

슬라이스 A~D는 `[x]`·커밋됨. Step 8(매출/미수 화면 재작성), 게스트 JSON 백업, 서브 일지 클라우드 신규 동기화는 범위 밖.
`docs/business_rules_audit.md` 제약을 이번 슬라이스에서 쳐내거나 새로 넣지 마라.

푸시하지 마라. 커밋은 보리 지시가 있을 때만.
`AGENTS.md` 작업 원칙 본문은 수정하지 마라. 사실 기록은 `docs/sot.md`·`docs/audit.md`에만.

시작 전: `AGENTS.md` (매번). 이 파일. `docs/sot.md` §8–9-1.
충돌: 이 지시서 > `AGENTS.md`.

저장소: 구현 `react-app` / 원칙 `ubiquitous-parakeet`
HEAD·미커밋 확인. `supabase/.temp/` 섞지 마라.

---

## 게스트 — 손대지 마라

게스트는 기사 초대·차량(기사) 초대를 쓰지 않는다. 수리·숨김·테스트하지 마라.

게스트 **업무 데이터는 계속 localStorage가 정본**이다. 게스트 `commitBatch` persist·체험 일지·차량·거래처를 끄거나 숨기지 마라.

---

## 왜 저장 Fail-Fast와 미러 제거를 한 슬라이스에 묶는가

지금 로그인 저장 일부(`requestVehicleSave` / `requestClientSave` / 비용·설정·계산서·프로필)는 Store+**LS** 후 dirty journal → `scheduleCloudSync` → `syncAll`이 **`collectPracticeSnapshot`(LS)** 을 서버에 올린다.

로그인 LS 쓰기만 끄고 `syncAll`을 그대로 두면, 다음 동기화가 **빈(또는 오래된) LS**를 서버에 올려 서버 정본을 지운다. 그래서 E는

1. 로그인 업무 도메인을 LS에 쓰지 않고
2. 그 도메인의 로그인 저장을 A~D처럼 **서버 1회 성공 후 Store(메모리)** 로 바꾸며
3. 로그인에서 `syncAll`/`dirty`로 업무 맵을 재업로드하지 않는다.

신규 durable / fallback / unsafe / tombstone / outbox **넣지 마라.** 기존 `mutationOutbox`에 **새 op을 넣지 마라.**

---

## 목표 (SoT §9-1)

로그인 사용자:

| 남을 것 | 빠질 것 |
|---|---|
| 테마, ‘오늘 하루 보지 않기’(`dismissedNotifications`), 인증 세션 | `cars` `clients` `drivers` `workData`(메인·서브 키) `expenses` `invoices` `profile` `workDataDeletedDates` 및 그 extraWrites |
| 메모리 Store + Supabase | dirty journal로 업무 동기화 예약 |

`settings` 전체(단가 토글·콜상세 등)를 LS에 미러하지 마라. **theme만** 로그인 LS에 남겨 `applyTheme`이 새로고침 전에 쓸 수 있게 해도 된다. 그 외 settings는 서버+Store.

실패 토스트(로그인 원격): `저장에 실패했습니다. 네트워크 상태를 확인해 주세요.`
로그인 pending 토스트·`scheduleCloudSync` 일괄 upsert 금지.

세션: 원격 전 `captureSession`, await 직후·Store 직전 `assertSessionStillCurrent`.

기존 LS 키를 hydrate 성공 때 **지우지 마라**(읽기 실패를 빈 값으로 오인·cleanup 금지, AGENTS §5). 로그인 경로가 **읽지 않고 쓰지 않으면** 된다.

---

## 4대 기준 (E)

1. 화면은 기존 `useOwner*` 유지. `load*` 스냅샷 복귀 금지.
2. 로그인 확정 값은 Store(메모리). 서버 성공 후에만 Store. 부트~hydrate 전 업무 목록은 비어 있을 수 있다(LS로 미리 채우지 마라). `hydration` ready/failed UI는 기존 계약을 깨지 마라.
3. 로그인 쓰기 창구는 기존 `requestVehicleSave` / `requestClientSave`(및 같은 파일의 단가·세무·순서) / `saveExpenses` / `savePracticeSettings` / `saveInvoices` / `saveProfile` 유지. 구현만 서버 직접 1회. 배럴 `saveCars`/`saveClients` 우회 없음. 게스트는 persist 유지.
4. 재시도 큐 없음. `syncAll`을 로그인 저장 창구로 쓰지 마라. A~D 경로(`requestDriver*` / `requestVehicleDeletion` / `requestClientDeletion` / `commitMainDayLogToCloud`)를 되돌리지 마라.

---

## 건드릴 곳 (예상)

- `src/store/batchWrites.js` / `app-store.js` — 로그인 업무 도메인 persist·dirty 생략. `dismissedNotifications`(+ theme)는 persist 가능
- `src/store/owner-state.js` `initializeOwnerFromPersist` — 클라우드 세션이면 업무 도메인을 LS에서 Store로 넣지 마라
- `src/lib/hydrate.js` — `collectPracticeSnapshot`을 로그인 업무 밑바탕으로 쓰지 마라(빈/서버 정본). dirty로 로컬 업무를 다시 덮지 마라(D의 `workData`와 같은 함정)
- `src/lib/syncQueue.js` — 로그인 업무는 `syncAll` 재업로드 안 함. 게스트/미호출이면 최소 변경. **파일을 한 번에 지우지 마라**
- `src/lib/vehicleMutations.js` / `clientMutations.js` — 로그인: `syncVehiclesClients` 실행기 **직접 1회** 후 Store(`syncToCloud: false`, persist 없음). 로컬 먼저+dirty 금지
- 비용·설정·계산서·프로필: 기존 `syncExpenseRecords` / `syncTaxInvoicesTable` / profiles upsert 등을 **항목·도메인 단위 1회**로 재사용. `syncWorkData` 전체 루프를 다시 저장 창구로 쓰지 마라
- 서브 일지 키 extraWrites: 로그인은 LS에 안 씀. 서브 클라우드 확장 금지(D와 동일). Store `workLogs`만
- 테스트: persist/hydrate/App 차량·거래처 저장. 로그인 경로에서 업무 키 `setItem` 0회를 직접 assert하는 편이 검출력 있음

건드리지 말 것: A~D 완료 경로, 게스트 초대 UI, `AGENTS.md` 원칙 본문, Step 8, `pendingWorkDataWrites.js` 본체 삭제(게스트·미동기화는 D 계약).

200줄. 넘치면 분리 설계를 먼저 보고하고 승인 없이 쪼개지 마라. `syncQueue.js`/`hydrate.js`가 이미 크면 **이번 E 변경만** 최소로 넣고, 기계적 분할은 보고 후.

---

## 테스트

- 로그인+ready: 차량/거래처 저장 성공 → 서버 insert/update 1회(해당 행), Store 반영, `reactPracticeCars:` / `reactPracticeClients:` `setItem` 0회, `hasDirty`에 그 도메인 없음
- hydration failed: 저장 시도 → 서버 0회, Store 저장 전, Fail-Fast 토스트
- throw / `{ data: null, error }`: 동일 Fail-Fast, LS 업무 키 불변
- 새로고침 시뮬레이션: 로그인 Store를 persist에서 다시 채우지 않음. hydrate 서버 행이 목록
- 게스트: 차량 저장 후 `reactPracticeCars:guest`에 남음(회귀)
- 테마·알림 닫기: 로그인에서도 LS에 남을 수 있음
- 유효 테스트 삭제 금지. 게스트 초대 assert 추가 금지

---

## 완료 시

- 프로덕션 200줄. `// @ts-check`. any/unknown/@ts-ignore 금지
- Phase 1 보고 후 대기. `[x]`·커밋·푸시는 보리
- 보리 실검증: 로그인 → 차량/거래처/설정(테마 제외 업무)/비용 등 저장 → 새로고침 후에도 서버 값. DevTools Application에서 해당 owner의 `reactPracticeCars` 등이 **저장 직후 안 늘거나 안 바뀜**. 게스트는 예전처럼 LS. 네트워크 차단 시 Fail-Fast, 새로고침 후 서버(저장 전) 값
