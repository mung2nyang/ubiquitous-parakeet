# 슬라이스 B 작업 지시 — 기사 상태변경·삭제 (Fail-Fast)

역할: 프론트엔드만 수정한다. DB 스키마·마이그레이션·SQL Editor 작업은 하지 마라.
(슬라이스 A RPC `upsert_driver_link_idempotent`는 이미 라이브 적용됨. B는 그 RPC를 쓰지 않는다.)

보리(사용자)가 이 지시서를 작성하라고 했고, **코드 착수는 보리의 명시적 시작 지시가 온 뒤에만** 한다.
이 파일을 읽었다고 바로 구현하지 마라.

슬라이스 C~E(차량·거래처 outbox, 일지 durable, 로그인 LS 미러 제거)와 Step 8(매출/미수)은 이번 범위 밖이다.

푸시하지 마라. 커밋은 보리 지시가 있을 때만.
`ubiquitous-parakeet/AGENTS.md`의 작업 원칙 본문은 수정하지 마라. 사실 기록은 `docs/sot.md`·`docs/audit.md`에만.

시작 전 읽을 것: `AGENTS.md` (매번). 이 파일. 필요 시 `docs/sot.md` §8–9.
충돌 시: 이 지시서(보리 승인) > `AGENTS.md`.

저장소:

- 구현: `react-app`
- 원칙/계획: `ubiquitous-parakeet`

HEAD와 미커밋을 확인한 뒤, 무관한 파일을 되돌리거나 섞어 커밋하지 마라.

---

## 게스트 — 손대지 마라 (Explicit Out-of-Scope)

**게스트는 기사 초대와 차량(기사 할당) 초대를 쓰지 않는다.** 제품 기능이 아니다.

- 게스트 연동이 “안 된다”고 수리하지 마라.
- 게스트 초대 UI를 숨기거나, `saveDrivers` 게스트 분기를 “고치거나”, 게스트 초대 테스트를 메인 회귀로 추가하지 마라.
- `npm run dev`에서 게스트로 기사/차량 초대를 확인할 필요 없다.
- 게스트 JSON 백업/불러오기도 이번 범위 밖(추후).

코드에 `DriverConnectionPage`의 `!cloud` → `saveDrivers`가 남아 있어도 **버그로 취급하지 않는다.** 숨김은 보리의 별도 지시가 있을 때만.

로그인 사용자의 상태변경·삭제만 Fail-Fast로 바꾼다.

---

## 목표

로그인 사용자의 **기사 연동 상태변경**과 **초대 삭제**를 mutation outbox / durable / fallback / unsafe / 재시도 큐에 넣지 말고,

1. readiness 검사 후
2. 서버 `driver_links`에 **직접 1회** `update`(status) 또는 `delete`
3. 성공하면 Store `drivers`만 갱신 (`commitDrivers` 또는 동등, **syncToCloud/outbox 없음**)
4. 실패하면 Store/LS/outbox를 더 쌓지 않고 토스트 후 return

실패 토스트(로그인 원격 실패, 슬라이스 A와 동일 문구):

`저장에 실패했습니다. 네트워크 상태를 확인해 주세요.`

이미 있는 헬퍼를 재사용해도 된다. 새 큐를 만들지 마라.

- 상태: `updateDriverLinkStatusOnSupabase` (`directMutations.js`) — outbox flush가 아니라 `requestDriverStatusChange`가 **직접** 1회 호출
- 삭제: `deleteDriverLinkOnSupabase` — 동일

`supabaseId`가 없는 항목(아직 서버에 없는 로컬만)은 서버 호출 없이 로컬 목록에서만 제거/상태변경. 게스트 초대 제품화와 혼동하지 마라 — 이건 로그인 사용자가 서버 올리기 전 초안을 지우는 경로일 수 있다. 게스트 화면 초대 플로우는 위에서 금지.

기간 겹침 조회를 상태/삭제에 **새로 넣지 마라.** 차량번호 1기사 규칙은 `upsertDriver`(슬라이스 A)에 이미 있다.

---

## 4대 기준 (B만)

1. **구독 vs 스냅샷** — `DriverConnectionPage`는 계속 `useOwnerDrivers`. `loadDrivers` 스냅샷으로 되돌리지 마라.
2. **값의 위치** — 목록은 Store. 서버 반영은 update/delete **성공 후**에만 Store.
3. **쓰기 창구** — `requestDriverStatusChange` / `requestDriverDeletion` 유지. 구현만 outbox 제거. 로그인 경로에서 배럴 `saveDrivers` 우회 없음.
4. **충돌** — 실패하면 저장 전 값 유지, 재시도 큐 없음. 세션이 바뀌면 로컬/원격 부작용 없이 중단 (`captureSession` / `assertSessionStillCurrent`, 슬라이스 A와 같음).

현재: 두 함수가 `commitWithOutboxAndFlush` + tombstone/mutation op. `outboxFlush.js`가 `driverLink` `updateStatus`/`delete`를 실행.

목표: 로그인 클라우드 경로가 A와 같이 **직접 1회 + Fail-Fast**. 신규 레이어 없음.

---

## 건드릴 파일 (예상)

- `src/lib/directMutationActions.js` — `requestDriverStatusChange`, `requestDriverDeletion`
- `src/lib/directMutationActions.test.js` — outbox pending 기대를 Fail-Fast(원격 0회 또는 1회 + 토스트 + `hasPendingOps===false`)로
- 필요 시 `src/lib/directMutations.js` 주석만. 실행기 시그니처를 바꾸면 호출부·테스트 전부

건드리지 말 것:

- `requestDriverInviteSave.js` / `driverLinkRpc.js` (A 완료)
- 차량·거래처 `requestVehicle*` / `requestClientDeletion` outbox (슬라이스 C)
- 일지 durable (`pendingWorkDataWrites` 등) (슬라이스 D)
- 게스트 초대 UI, JSON 백업
- `AGENTS.md` 작업 원칙 본문
- Step 8 화면

`outboxFlush.js`의 `driverLink` upsert/status/delete 분기는 **예전 큐에 남은 op** 때문에 당장 지울지 여부는 최소 변경으로 판단하라. 새 op을 넣지 않으면 flush는 돌지 않는다. 게스트 초대를 고치려고 flush를 확장하지 마라.

---

## 테스트

- hydration failed: 상태/삭제 → Store 유지, 서버 0회, 성공 토스트 없음 (기존 §8)
- ready + 서버 throw / `{ data: null, error }`: 지정 Fail-Fast 토스트, outbox에 새 op 없음
- 성공: `driver_links` update 또는 delete **1회**, Store 반영, `hasPendingOps===false`
- 세션 전환: await 이후 Store 미반영
- 유효한 기존 테스트 삭제 금지. outbox 성공을 전제로 하던 B 해당 테스트만 계약을 바꿔라
- 게스트 초대 성공을 새로 assert하지 마라

---

## 완료 시

- 프로덕션 200줄. `// @ts-check`. any/unknown/@ts-ignore 금지
- Phase 1 보고 후 대기 (`AGENTS.md` §12). `[x]`·커밋·푸시는 보리
- 신규 durable/큐 없음
