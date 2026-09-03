# 슬라이스 C 작업 지시 — 차량·거래처 삭제 (Fail-Fast)

역할: 프론트엔드만 수정한다. DB 스키마·마이그레이션·SQL Editor 작업은 하지 마라.

보리(사용자)가 이 지시서를 작업자에게 넘기는 것이 슬라이스 C 착수 승인이다.

슬라이스 A·B(기사)는 완료 `[x]`. 일지 durable(슬라이스 D), 로그인 LS 미러 제거(E), Step 8은 범위 밖.
`docs/business_rules_audit.md` 제약을 이번 슬라이스에서 쳐내거나 새로 넣지 마라.

푸시하지 마라. 커밋은 보리 지시가 있을 때만.
`AGENTS.md` 작업 원칙 본문은 수정하지 마라. 사실 기록은 `docs/sot.md`·`docs/audit.md`에만.

시작 전: `AGENTS.md` (매번). 이 파일. 필요 시 `docs/sot.md` §8–9, `docs/slice-b.md` 보완 절(같은 hydrate 함정).
충돌: 이 지시서 > `AGENTS.md`.

저장소: 구현 `react-app` / 원칙 `ubiquitous-parakeet`
HEAD·미커밋 확인. `supabase/.temp/` 섞지 마라.

---

## 게스트 — 손대지 마라

게스트는 기사 초대·차량(기사 할당) 초대를 쓰지 않는다. 그 UI를 수리·숨김·테스트하지 마라.

게스트 **차량 목록/거래처 목록**(연습 데이터)은 이번 슬라이스의 숨김 대상이 아니다. 로그인 클라우드 **삭제**만 Fail-Fast로 바꾼다.

---

## 목표

로그인 사용자의 **차량 삭제**와 **거래처 삭제**를 mutation outbox / tombstone / 재시도 큐에 넣지 말고,

1. readiness 후
2. 기존 실행기 `deleteVehicleFromSupabase` / `deleteClientFromSupabase`를 **직접 1회**
3. 성공하면 Store만 갱신 (`commitCars`/`commitClients` 또는 동등, **syncToCloud/outbox 없음**)
4. 실패하면 Store/LS/outbox를 더 쌓지 않고 토스트 후 return

실패 토스트(A·B와 동일):

`저장에 실패했습니다. 네트워크 상태를 확인해 주세요.`

로그인 클라우드 경로에서 `연결이 복구되면 자동으로 반영됩니다` pending 토스트는 쓰지 마라.

성공 토스트는 기존: `차량을 삭제했습니다.` / `거래처를 삭제했습니다.`

`supabaseId` 없는 항목은 서버 없이 로컬만 삭제(`commitLocalOnly` 유지).

세션: 원격 전 `captureSession`, 각 await 직후와 Store 반영 직전 `assertSessionStillCurrent`.

차량 삭제의 서브 일지 키 정리(`extraWrites` / `planPendingLogDiscard`)는 **서버 삭제 성공 후**에만 persist. 실패 시 일지 키도 그대로.

---

## 슬라이스 B에서 배운 것 — C에서 빠뜨리면 같은 FAIL

삭제 후 새로고침 ~0.6초에 목록이 돌아오는 원인과 같다.

1. **hydrate 빈 배열 fallback 금지**  
   지금:
   - `mergeCarsFromRows`: `vehicleRows`가 빈 배열이면 **로컬 차량으로 되돌림** (`hydrateMergeCars.js`)
   - `mergeClientsFromRows`: `clientRows`가 빈 배열이면 **로컬 거래처로 되돌림** (`hydrateMergeClients.js`)
   고칠 것: `Array.isArray(rows)`이면(빈 배열 포함) **서버 목록이 정본**. 빈 목록이면 `[]`. fallback은 배열이 아닐 때만.
2. **0행 delete를 성공으로 치지 마라**  
   `vehicles.delete` / `clients.delete` 후 `.select('id')`(또는 동등). 0행이면 throw → Fail-Fast 토스트, Store 유지.  
   기사 `deleteDriverLinkOnSupabase`와 같은 계약. 자식 테이블 0행은 “이미 없음”이라 허용해도 된다. **본체 행**만 0행 실패.

tombstone을 되살리지 마라. 서버가 정본이면 빈 hydrate가 빈 목록이다.

---

## 4대 기준 (C만)

1. 화면은 기존 `useOwnerCars` / `useOwnerClients`. `loadCars`/`loadClients` 스냅샷 복귀 금지.
2. 목록은 Store. 서버 삭제 **성공 후**에만 Store. 실패 시 저장 전 값.
3. 창구 `requestVehicleDeletion` / `requestClientDeletion` 유지. 구현만 outbox 제거. 로그인 경로 `saveCars`/`saveClients` 우회 없음.
4. 재시도 큐 없음. 신규 durable/fallback/unsafe 없음.

**범위에 넣지 말 것:** `requestVehicleSave` / `requestClientSave`(이미 로컬 commit + 기존 sync 큐). 그건 슬라이스 E에 가깝다. C는 **삭제** + 위 hydrate 병합만.

---

## 건드릴 파일 (예상)

- `src/lib/vehicleDeletion.js` — `requestVehicleDeletion`
- `src/lib/directMutationActions.js` — `requestClientDeletion`만 (기사 A·B 함수 되돌리지 마라)
- `src/lib/directMutations.js` — 차량/거래처 delete 0행 검사. 기사 delete 계약은 유지
- `src/lib/hydrateMergeCars.js` / `src/lib/hydrateMergeClients.js` — 빈 배열 정본
- 관련 `*.test.js` (`vehicleMutations.test.js`, `directMutationActions.test.js`, `hydrateMerge.test.js` 등)

건드리지 말 것: `requestDriver*`, `driverLinkRpc.js`, 일지 durable, 게스트 초대 UI, `AGENTS.md` 원칙 본문, Step 8.
`outboxFlush`의 vehicle/client delete 분기는 예전 큐 잔여용. **새 op을 넣지 마라.** 실행기는 더 엄격해져도 된다.

200줄. `vehicleDeletion.js`가 넘치면 분리 설계를 먼저 보고하고 승인 없이 쪼개지 마라. 가능하면 기존 파일 안에서 줄인다.

---

## 테스트

- hydration failed: 차량/거래처 삭제 → Store·LS 유지, 서버 0회, 성공 토스트 없음
- ready + throw / `{ data: null, error }`: Fail-Fast 토스트, `hasPendingOps` false, 저장 전 값
- 성공: 본체 delete 1회, Store에서 사라짐, `hasPendingOps` false
- 0행 본체 delete: 성공 토스트 없음, Store 유지
- `mergeCarsFromRows(로컬 차량 있음, [])` → `[]`
- `mergeClientsFromRows(로컬 거래처 있음, [])` → `[]`
- 세션 전환: Store 미반영
- 유효 테스트 삭제 금지. 게스트 초대 assert 추가 금지

---

## 완료 시

- 프로덕션 200줄. `// @ts-check`. any/unknown/@ts-ignore 금지
- Phase 1 보고 후 대기. `[x]`·커밋·푸시는 보리
- 보리 실검증: 로그인 → 차량/거래처 삭제 → 새로고침 → hydrate 후에도 안 살아나야 함

상태 (2026-09-01): 구현 완료. 보리 실검증 이상 없음. 감독관 `[x]`. 커밋 `react-app` `0050ee4`.
