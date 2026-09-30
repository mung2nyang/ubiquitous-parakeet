# docs/report.md — 현재 슬라이스 착수지시서

(지난 슬라이스 6(고정노선 자동 해제 서버 반영)은 `git show 0ce6062 -- docs/report.md`.)

## 배포까지 순서 7 (10-7) — 연동 해제·탈퇴 규칙 — 조사·설계 보고 (착수지시서 전)

확정 규칙 `[확인: 2026-10-01 보리]`(로드맵 7번): ① 양쪽 동의로 해제 ② 해제 후 차주·기사 각자 기록 고스란히 보관(기사 쪽 "배정차량 00가0000" 표시, 위치는 착수 때 물음)
③ 연동 중 차주·기사 모두 탈퇴 불가 ④ 새로 연동한 기사는 이전 기사 기록을 못 봄.

### 조사 1 — 코드
- 해제: 차주 화면 2곳(`DriverConnectionPage.jsx`·`CarListPage.jsx`) → `requestDriverDeletion` → `driver_links` 행 **삭제**(기록은 안 지움). 기사 쪽 해제 기능 없음.
- 계정 구분: `boot.js:49` — `linked` 연동이 있을 때만 `employed_driver`(ownerKey = 차주 id). **해제되면 기사는 일반 계정**(ownerKey = 자기 id, 자기 차량·자기 메인 일지)이 됨.
- 탈퇴: `PersonalInfoPage.jsx` → `delete_own_account()`(auth.users 삭제 1줄, 5-C 조사). 연동 여부 확인 없음.
- 기사 권한: 운행·비용 표 조회·수정·삭제 = "그 차량에 `linked`인 기사"(5-B 조사 3) — 연동 기간 조건 없음 → ④ 위반(새 기사가 이전 기록 봄).

### 조사 2 — 서버 (2026-10-01, AI가 SQL Editor에서 읽기 전용 조회)
- `driver_links` 칸: id·owner_id·driver_id·vehicle_id·invite_code·**status**(text)·**assignment_start/end**(date)·linked_at·created_at·updated_at·idempotency_key·settlement_mode·salary_amount.
  해제 요청자·요청 시각을 담을 칸 **없음**. 쓰이는 status: `pending`·`linked`(4행).
- `driver_links` 권한: 조회 = 차주·기사 본인, **작성·수정·삭제 = 차주만** → 기사가 해제 요청을 남기려면 서버 함수(RPC) 필요.
- 연결: `driver_id`·`owner_id` → profiles CASCADE, `vehicle_id` → vehicles CASCADE.
- **연동 기사들이 가진 자기 차량: 0대** → 해제 후 기사 쪽 기록을 둘 자기 메인 차량이 없음(해제 때 만들어야 함).

### 설계안 — 슬라이스 4개 (1회 보고)
| 순서 | 슬라이스 | 내용 | 변경 |
|---|---|---|---|
| 7-A | 연동 중 탈퇴 불가 | 탈퇴 버튼에서 연동 중이면 막고 "연동을 먼저 해제해야 탈퇴할 수 있습니다." 안내 + 서버 탈퇴 함수도 연동 중이면 거절 | 화면 1곳 + DB 함수 |
| 7-B | 새 기사는 이전 기록 못 봄 | 기사의 운행·비용 조회·수정·삭제 권한을 "그 연동의 시작일(`assignment_start`) 이후 날짜"로 좁힘 | DB 권한 5개 표 |
| 7-C | 양쪽 동의 해제 | `driver_links`에 해제 요청 칸(요청자·시각) 추가, 요청·동의·취소 서버 함수, 차주·기사 화면에 요청/동의 버튼·표시 | DB + 화면 |
| 7-D | 해제 시 기사 쪽 기록 보관 | 동의로 해제되는 순간 서버 함수가 그 연동 기간 기록을 기사 메인 차량(없으면 만듦)으로 복사, 기사 화면에 "배정차량 00가0000" 표시 | DB 함수 + 화면 |
- 7-A·7-B는 독립이라 먼저, 7-D는 7-C(해제 순간)에 붙음.

### 결정·확인 요청
1. 슬라이스 4개·순서(7-A → 7-B → 7-C → 7-D)로 갈지.
2. (7-D) 기사 쪽에 남길 기록 = **연동 기간 그 차량 기록 전부**(차주가 넣은 비용·콜 포함)인지, **기사가 직접 입력한 것만**인지.
3. (7-C) 상대가 해제에 동의하지 않을 때 빠져나갈 길 — 예: 요청 후 N일 지나면 자동 해제 / 없음(끝까지 동의 필요).
4. (7-B) 연동 시작일 이전 기록: 기사가 연동하며 옮겨 온 과거 기록(원본 앱의 "과거 기록 동기화")이 있다면 시작일 이전이라 안 보이게 됨 — 괜찮은지(react-app엔 그 기능 없음, 참고).

### 결정 `[확인: 2026-10-01 보리]`
1. 슬라이스 7-A → 7-B → 7-C → 7-D. 2. 기사 쪽 보관 = 연동 기간 그 차량 기록 전부. 3. 무응답 자동 해제 = 요청 후 3일.
4. 재할당: 같은 기사는 자기 예전 연동 기간 + 이번 기간(사이 빈 기간은 차주만), 새 기사는 이번 기간만. 해제 시 연동 정보는 "해제됨"+종료일로 남김.
   재할당 때 예전 기간은 차주 차량 버전을 따르고 기사 사본과 합치지 않음. 다시 해제 시 기사 쪽 복사는 이번 기간만.

---

## 배포까지 순서 7-A — 연동 중에는 차주·기사 모두 탈퇴 불가 `[x]` (착수지시서 확정 2026-10-01)

> 완료(2026-10-01): react-app `231df2e`(마이그레이션 0009 포함), 브라우저 확인·push·CI 초록·§5 리뷰 통과·사용자 최종 승인.

### 1. 목적 (쉬운 말)
연동 중인 차주나 기사가 탈퇴하면 상대의 기록이 사라지거나 정리가 안 된다. 연동 중이면 탈퇴를 막고 **"연동을 먼저 해제해야 탈퇴할 수 있습니다."**라고 안내한다.
화면에서 먼저 막고, 서버 탈퇴 함수도 한 번 더 막는다(화면을 우회해도 안전).

### 2. "연동 중"의 뜻
- 차주: 내 기사 중 `status = 'linked'`인 연동이 1건 이상. 초대만 하고 수락 전(`pending`)은 연동 중 아님 → 탈퇴 가능(초대는 탈퇴와 함께 사라짐).
- 기사: `linked` 연동이 있음(= 앱의 `employed_driver` 세션, `boot.js:49`).
- 7-C에서 "해제 요청 중" 상태가 생기면 그것도 연동 중으로 포함(그때 함께 고침).

### 3. 건드릴 파일
1. `react-app/src/components/PersonalInfoPage.jsx`(182줄) — "회원 탈퇴"를 누를 때 연동 중이면 확인 창 대신 안내 토스트(차주: store 기사 목록의 `linked`, 기사: `session.accountType === 'employed_driver'`).
2. 서버 함수 `delete_own_account` 교체(아래 SQL) + 기록 파일 `react-app/supabase/migrations/0009_block_withdraw_while_linked.sql`(신규).
3. 테스트: `react-app/src/components/PersonalInfoPage.withdrawLinked.test.js`(신규) — 차주(연동 기사 있음)·기사 세션은 확인 창이 안 열리고 안내 토스트·서버 호출 0회, 연동 없으면 지금처럼 확인 창.

### 4. 서버 변경 SQL (멱등 — AI가 SQL Editor에서 실행, 사용자 지시 시)
```sql
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.driver_links
    where status = 'linked' and (owner_id = auth.uid() or driver_id = auth.uid())
  ) then
    raise exception '연동을 먼저 해제해야 탈퇴할 수 있습니다.' using errcode = 'P0001';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
```
- 기존 함수와 이름·인자·보안 설정 동일(`create or replace`라 실행 권한 유지). 데이터 변경 없음.
- 앱은 서버 오류 문구를 그대로 토스트로 보여 줌(`lib/accountWithdrawal.js:18-21`) → 화면을 우회해도 같은 안내.

### 5. 사후검증 (읽기 전용)
`select pg_get_functiondef('public.delete_own_account()'::regprocedure);` → 위 본문(연동 확인 후 삭제)인지.

### 6. 안 건드릴 것 (근거)
- `lib/accountWithdrawal.js` — 서버 오류 문구 표시가 이미 있음(위). 해제 흐름(7-C)·권한(7-B) — 이번 범위 아님.

### 7. §8 5대 질문
1. 기사 목록은 store 구독(`useOwnerDrivers`). 2. 보이는 값 = store(서버에서 불러온 연동 상태). 3. 쓰기 없음(막기만). 4. 해당 없음. 5. 권한: 탈퇴 함수 본인만 — 무변경, 조건만 추가.

### 8. 기대 동작
- 연동 중인 차주·기사가 "회원 탈퇴" → 확인 창 없이 "연동을 먼저 해제해야 탈퇴할 수 있습니다." 토스트.
- 연동 없는 계정(초대만 있는 차주 포함)은 지금처럼 두 번 확인 후 탈퇴.
- 화면 판단이 틀려도 서버가 거절하고 같은 문구 표시.

### 9. 실패 시 처리
기존과 같음(서버 오류 → 토스트, 세션 유지). **신규 레이어 없음.**

### 10. §6 200줄
`PersonalInfoPage.jsx` 182 → 190 안팎.

### 11. 검증
- 테스트 3개 + 되돌리면 FAIL. `npm test`·`tsc`·strict 427 불변. 사후검증 쿼리.
- 브라우저(AI가 옆 브라우저로): 차주 계정(11가1111 기사 연동 중) "회원 탈퇴" → 안내 토스트·확인 창 없음. **실제 탈퇴는 하지 않음.**

### 검증 결과 (2026-10-01, 커밋 전)
- 바뀐 파일: `PersonalInfoPage.jsx`(182→191)·테스트 `PersonalInfoPage.withdrawLinked.test.js`(신규 3개)·`supabase/migrations/0009_block_withdraw_while_linked.sql`(신규). 지시서 3번과 일치.
- `npm test`: unit 740·화면 211 전부 통과. `tsc` 0에러, strict 427 불변.
- 되돌려서 FAIL 확인: 화면 막기를 빼면 "차주 연동 중"·"기사 계정" 2개 FAIL / 원복 3/3 통과.
- 서버: 사용자 지시로 AI가 SQL Editor에서 실행(Supabase가 본문의 `delete from auth.users` 때문에 "destructive" 경고 — 함수 교체만이고 실행 시 삭제 없음, 승인된 SQL 그대로 진행)
  → Success. 사후검증: 본문 = 연동 확인 후 삭제. 실행 권한: PUBLIC·anon·authenticated·service_role·postgres(교체 전과 같음 — anon은 auth.uid()가 없어 삭제 대상 없음, 관찰만).
- 브라우저(AI가 옆 브라우저로, 사용자가 차주 계정 로그인): 개인정보 → "회원 탈퇴" → "연동을 먼저 해제해야 탈퇴할 수 있습니다." 토스트, 확인 창 없음. 통과.
  서버 거절은 실제 호출로 시험하지 않음(막기가 틀리면 계정이 지워짐) — 본문 사후검증으로 대신.
