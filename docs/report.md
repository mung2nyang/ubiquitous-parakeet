# docs/report.md — 현재 슬라이스 착수지시서

## 0-2. 대표자명·예금주 서버 저장·복원 (코드 부분) — 착수지시서 (작성 2026-09-24, `[확인: 2026-09-24 보리 — 2번으로 진행 요청, DB 부분은 지시서 생략]`)

지난 슬라이스 0-1 착수지시서는 `git show 09dc31f -- docs/report.md`.

### 1. 현재 상태 (원인)

- 보리가 Supabase에서 읽기 전용 쿼리로 확인(2026-09-24): `profiles` 14칸에 **`business_representative`·`account_holder`가 없다**
  (있는 칸: id·account_type·name·phone·business_name·business_number·business_address·business_type·business_item·business_email·bank_name·account_number·settings·updated_at).
- 서버 저장 `profileCloudCommit.js:13-29`는 위 칸 중 `name`~`account_number`만 보내고, 불러오기 `hydrateMerge.js:41-53` `mergeProfileRow`도 두 값을 복원하지 않는다.
  로그인 후 불러오기는 `hydrate.js:121` `mergeProfileRow({}, 서버행)`이라 두 값은 **새로고침·다른 기기 로그인 때 빈 값**이 될 가능성이 크다(브라우저 재현은 미확인).
- 영향: 운송비 내역서 예금주 칸, 세금계산서 공급자 대표자명(`cars.js:191` 등, 성명으로 대신 채워져 피해는 작음). 또 0-1 이후 개인정보 화면에서 입력한 두 값이 새로고침 뒤 사라져 보인다.

### 2. 목표 (기대 동작)

1. 로그인 상태에서 개인정보 화면의 **대표자명**·**예금주**를 입력하면 서버 `profiles`의 `business_representative`·`account_holder`에도 저장된다.
2. 새로고침·다른 기기 로그인 후에도 두 값이 그대로 복원된다.
3. 나머지 프로필 칸 동작은 그대로. 서버 행에 두 칸이 비어 있으면(예: 옛 데이터) 빈 값으로 복원(기존 다른 칸과 같은 규칙).
4. 설정 저장(`practiceSettings.js:35`)이 프로필을 함께 올릴 때도 두 값이 같이 올라간다(같은 함수 `upsertProfileOnSupabase`를 쓰므로 자동).
5. 기사(연동)에게 두 값은 노출되지 않는다 — 기사용 함수 `get_linked_owner_profile_settings`는 이름·상호명·settings만 돌려주고 이 칸은 반환하지 않는다(`0002_driver_invite_redeem.sql:117-129`).

### 3. 건드릴 파일

| 파일 | 내용 | 줄 수(현재→예상) |
|---|---|---|
| `src/lib/profileCloudCommit.js` | upsert에 `business_representative`·`account_holder` 2줄 추가 | 30→32 |
| `src/lib/hydrateMerge.js` | `mergeProfileRow`에 `bizRepresentative`·`accountHolder` 2줄 추가 | 126→128 |
| `src/lib/hydrateMergeTypes.js` | `ProfileRow` 타입에 두 칸 추가 | 51 (같은 줄 수정) |
| 테스트 | `hydrateMerge.test.js`에 복원 검증, 저장 payload 검증 테스트 신규(`profileCloudCommit.test.js`) | — |

### 4. 안 건드릴 것 (근거)

- `PersonalInfoPage.jsx`·`usePersonalInfoDraft.js` — 이미 두 값을 `saveProfile`로 저장 경로에 태움(`saveProfile`이 `{...base, ...draft}` 통째로 `upsertProfileOnSupabase`에 전달, `profile.js:41-51`). 입력 화면 무수정.
- `profile.js`·`hydrate.js` — `mergeProfileRow` 결과를 그대로 Store에 넣음(`hydrate.js:121`), 호출부 무수정.
- `hydrateEmployedDriver.js` — 기사 세션은 차주 두 값을 못 봐야 하므로 그대로(RPC가 이 칸을 안 줌).
- DB — 아래 §9대로 보리가 직접 SQL 실행(착수지시서 생략, 보리 결정).

### 5. §8 확인 5문

1. 구독: 화면은 `useOwnerProfile`(변경 없음). 2. 값 출처: 서버 `profiles` → hydrate → Store. 3. 쓰기 창구: 기존 `saveProfile`(변경 없음).
4. 겹칠 때: hydrate가 두 값을 서버 값으로 채움(다른 칸과 동일 규칙). 5. 권한: 차주 본인 `profiles` 행 읽기·쓰기(기존 정책), 기사는 못 봄(위 2-5).

### 6. 실패 시 처리 — 신규 레이어 없음

기존 `saveProfile`의 서버 실패 처리 그대로(토스트 + 값 무변경). 새 큐·재시도·임시 저장소 없음(§7).
**중요(순서):** 코드가 먼저 배포되고 DB 칸이 아직 없으면 upsert가 "없는 칸" 오류로 **모든 프로필 저장이 실패**한다 → DB SQL을 먼저 실행·검증한 뒤에 push한다.

### 7. §6 200줄

바뀌는 파일 전부 200줄 이하(위 표). `hydrateMerge.test.js`(382줄)는 테스트라 예외.

### 8. 검증

- 로컬 `npm test` + `tsc` + strict 진단 새 파일 몫 0 + 수정 코드를 되돌리면 새 테스트 FAIL 확인.
- 테스트 항목: ① `upsertProfileOnSupabase` 호출 payload에 `business_representative`·`account_holder`가 들어감 / ② `mergeProfileRow`가 서버 행의 두 값을 `bizRepresentative`·`accountHolder`로 복원 /
  ③ 서버 행에 두 값이 없거나 null이면 빈 문자열 / ④ 기존 칸 복원·저장 동작 불변(기존 테스트 통과).
- **브라우저 검증(보리, 로그인 상태):** DB SQL 실행 후 → ① 개인정보에서 대표자명·예금주 입력 → 새로고침 후 남아 있는지. ② 다른 기기(또는 로그아웃 후 재로그인)에서도 보이는지.
  ③ 차량 운송비 내역서 예금주 칸에 표시되는지. ④ 기존 칸(상호·계좌번호 등) 저장·복원이 그대로인지.

### 9. DB (보리가 직접 실행 — 착수지시서 생략, AGENTS §9 절차는 채팅으로 제공)

멱등 추가만(`add column if not exists`, 데이터 삭제·수정 없음, RLS·정책 무변경). 실행 → 사후검증 쿼리 결과 확인 → 그 뒤에 코드 push.
