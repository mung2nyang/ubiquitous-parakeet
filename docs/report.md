# docs/report.md — 현재 슬라이스 착수지시서

(지난 슬라이스 0-3-B는 `git show a4c59d8 -- docs/report.md`, 0-3-A·0-3 원인 조사는 `git show 81fb8ca -- docs/report.md`.)

## 배포까지 순서 5-C — 기사 계정이 삭제되면 그 기사가 입력한 비용이 차주 장부에서도 사라짐 — 조사 (착수지시서 전)

`[확인: 2026-09-27]` 고친다(DB 변경, AGENTS §9 절차). 근거: 5-B 조사 3 — 정비·유류·기타 `user_id`가 `profiles`에 `ON DELETE CASCADE`.

### 조사 1 — 코드
- 계정 삭제 경로는 **회원 탈퇴** 1곳: `PersonalInfoPage.jsx` → `lib/accountWithdrawal.js`가 서버 함수 `delete_own_account`만 호출. 무엇을 지우는지는 서버 함수 안에 있어 코드로는 모름.
  탈퇴 안내 문구: "모든 운행 기록, 거래처, 정산 데이터가 영구적으로 삭제" — 차주에겐 맞지만, **연동 기사가 차주 차량에 입력한 공용 장부 항목**은 차주 것이기도 함(5-B 결정).
- `daily_logs`도 `user_id`가 `profiles`에 `ON DELETE CASCADE`(5-B 조사 3) → 기사가 만든 하루 기록 줄이 지워지면 0-3과 같은 연쇄로 **그날 차주 비용·콜 상세까지** 사라질 수 있음.
  (0-3-A 방어는 앱 일지 저장 경로에만 있어 계정 삭제 연쇄는 못 막음.)

### 조사 2 — 서버 확인 요청 (AGENTS §9 ①, 읽기 전용 — SQL Editor에서 **하나씩 따로** 실행)
```sql
-- 1) 계정(profiles·auth.users)에 묶인 모든 연결과 삭제 규칙
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f' AND confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
ORDER BY 1, 2;
```
```sql
-- 2) 회원 탈퇴 서버 함수 내용
SELECT pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'delete_own_account';
```
```sql
-- 3) user_id 칸이 비어 있어도 되는지(설정 변경 방식 결정용)
SELECT table_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'user_id'
ORDER BY 1;
```

### 조사 3 — 서버 회신 결과 (2026-10-01, AI가 옆 브라우저 SQL Editor로 읽기 전용 조회 실행)
- **탈퇴 함수:** `delete_own_account()` = `delete from auth.users where id = auth.uid()` 한 줄(SECURITY DEFINER, search_path=public). 지우는 범위는 전부 연결 설정이 결정.
- **연결(public):** `profiles.id → auth.users` CASCADE, 그리고 `clients`·`daily_logs`·`transport_details`·`fuel_records`·`maintenance_records`·`misc_expense_records`·
  `tax_invoices`·`vehicles`의 `user_id → profiles` 전부 CASCADE, `driver_links`의 `driver_id`·`owner_id → profiles` CASCADE, `support_inquiries.user_id → auth.users` CASCADE.
- **user_id 비어도 되나:** `support_inquiries`만 YES, 나머지 전부 NO.
- **앱 코드:** 이 표들의 `user_id`를 읽거나 그 칸으로 거르는 곳 없음(grep 0건) — 조회는 전부 `vehicle_id` 기준.

### 조사로 커진 위험 (연동 기사가 탈퇴하면)
1. 기사가 입력한 정비/주유/기타가 차주 장부에서 사라짐(원래 5-C).
2. 기사가 입력한 **콜 상세(`transport_details`) = 차주 차량의 운송 매출 기록**이 사라짐.
3. 기사가 만든 **하루 기록 줄(`daily_logs`)**이 사라지면 그 줄에 묶인 그날 **차주 비용·콜 상세까지** 연쇄 삭제(0-3과 같은 구조).
- 차주가 탈퇴하면: 차주 `vehicles`가 지워지며 그 차량의 모든 기록이 삭제 — 안내 문구대로라 의도된 동작.

### 설계안 (1회 보고 — 승인 전, 아무것도 안 바꿈)
**추천: 운행·비용 5개 표의 "쓴 사람" 연결을 `ON DELETE SET NULL`로 바꾼다** — `daily_logs`·`transport_details`·`fuel_records`·`maintenance_records`·`misc_expense_records`.
- 계정이 지워져도 그 사람이 쓴 행은 남고 "쓴 사람"만 비워진다. 차주는 차량 소유로 계속 보고·고치고·지움(권한 규칙이 `vehicle_id` 기준 포함, 조사 3·5-B 조사 3).
- 기사 본인 차량(연동 전 개인 차량)의 기록은 `vehicles` 삭제 연쇄로 지금처럼 지워짐 → 기사 개인 데이터는 탈퇴 시 삭제 유지.
- `clients`·`tax_invoices`·`vehicles`·`driver_links`는 개인 데이터라 그대로(CASCADE).
- 필요한 변경: 5개 표 `user_id`의 "비어 있으면 안 됨" 해제 + 연결 규칙 교체. 데이터 삭제·표 삭제 없음(AGENTS §9 보존적). 새로 쓰는 행은 권한 규칙상 계속 쓴 사람이 채워짐.
- 코드 변경 없음, 기록 파일 `react-app/supabase/migrations/0008_…sql` 1개(0005~0007과 같은 방식).
- (대안, 비추천) 탈퇴 함수가 기사 행의 쓴 사람을 차주로 바꾼 뒤 지우기 — 함수가 복잡해지고 "누가 썼는지"가 틀어짐.

### 결정·확인 요청
1. 위 추천(5개 표 SET NULL)으로 갈지. 콜 상세·하루 기록까지 포함(2·3번 위험 때문).
2. 탈퇴 안내 문구("모든 운행 기록 … 영구적으로 삭제")를 기사 계정용으로 바꿀지 — 바꾸면 화면 문구 1곳 추가 작업.

### 결정 `[확인: 2026-10-01 보리]`
1. 추천 설계(5개 표 `ON DELETE SET NULL`)로 진행.
2. 탈퇴 문구는 바꾸지 않음 — 대신 **연동 중에는 차주·기사 모두 탈퇴 불가**, 10-7에 포함(로드맵 7번).
3. 새로 연동한 기사는 이전 기사 기록을 보면 안 됨 → 10-7 서버 권한 작업(로드맵 7번). 5-C 범위 아님.
4. 연동 해제는 양쪽 동의 + 해제 후 각자 기록 보관 → 10-7(로드맵 7번). 5-C 범위 아님.

---

## 배포까지 순서 5-C — 계정이 지워져도 운행·비용 기록은 남기고 "쓴 사람"만 비운다 (DB) `[x]` (착수지시서 확정 2026-10-01)

> 완료(2026-10-01): DB 적용·사후검증, 기록 파일 react-app `4a1068a`, push·CI 초록·§5 리뷰 통과·사용자 최종 승인.

### 1. 목적 (쉬운 말)
계정이 삭제(탈퇴)돼도, 그 사람이 **남의 차량(연동 차량)에 입력한 운행·비용 기록**이 차주 장부에서 연쇄로 사라지지 않게 한다. 기록은 남고 "쓴 사람" 칸만 비워진다.
자기 차량의 기록은 지금처럼 차량이 지워질 때 함께 지워진다.

### 2. 현재 → 목표
| 표 | 현재 | 목표 |
|---|---|---|
| `daily_logs`·`transport_details`·`fuel_records`·`maintenance_records`·`misc_expense_records` | `user_id` 필수 + 계정 삭제 시 **행 삭제**(CASCADE) | `user_id` 비어도 됨 + 계정 삭제 시 **`user_id`만 비움**(SET NULL) |
| `clients`·`tax_invoices`·`vehicles`·`driver_links`·`profiles`·`support_inquiries` | CASCADE | **그대로**(개인 데이터) |

### 3. 서버 변경 SQL (AGENTS §9 ②③ — 멱등, 사용자가 SQL Editor에 그대로 붙여 실행)
```sql
begin;

alter table public.daily_logs alter column user_id drop not null;
alter table public.daily_logs drop constraint if exists daily_logs_user_id_fkey;
alter table public.daily_logs add constraint daily_logs_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.transport_details alter column user_id drop not null;
alter table public.transport_details drop constraint if exists transport_details_user_id_fkey;
alter table public.transport_details add constraint transport_details_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.fuel_records alter column user_id drop not null;
alter table public.fuel_records drop constraint if exists fuel_records_user_id_fkey;
alter table public.fuel_records add constraint fuel_records_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.maintenance_records alter column user_id drop not null;
alter table public.maintenance_records drop constraint if exists maintenance_records_user_id_fkey;
alter table public.maintenance_records add constraint maintenance_records_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.misc_expense_records alter column user_id drop not null;
alter table public.misc_expense_records drop constraint if exists misc_expense_records_user_id_fkey;
alter table public.misc_expense_records add constraint misc_expense_records_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

commit;
```
- 데이터 삭제·표 삭제 없음(보존적). 한 묶음(begin~commit)이라 중간 실패 시 전부 되돌아감.
- 권한 규칙(RLS) 무변경: 조회·수정·삭제는 "내 차량 또는 연동 차량" 조건으로 계속 보임, 새로 쓰는 행은 작성 규칙(`user_id = auth.uid()`)상 계속 쓴 사람이 채워짐.

### 4. 사후검증 (AGENTS §9 ④, 읽기 전용)
```sql
select string_agg(conrelid::regclass::text || ' | ' || pg_get_constraintdef(oid), E'\n' order by conrelid::regclass::text) as fks
from pg_constraint
where contype = 'f' and confrelid = 'public.profiles'::regclass
  and conrelid::regclass::text in ('daily_logs','transport_details','fuel_records','maintenance_records','misc_expense_records');
```
기대: 5줄 모두 `FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL`.
```sql
select string_agg(table_name || '=' || is_nullable, ', ' order by table_name) as nullable
from information_schema.columns
where table_schema = 'public' and column_name = 'user_id'
  and table_name in ('daily_logs','transport_details','fuel_records','maintenance_records','misc_expense_records');
```
기대: 5개 모두 `YES`.

### 5. 건드릴 파일 (react-app)
- `supabase/migrations/0008_log_rows_keep_on_account_delete.sql`(신규) — 위 SQL 기록(0005~0007과 같은 형식, 실행·검증 날짜 머리 주석).
- 앱 코드 변경 없음(근거: 이 5개 표의 `user_id`를 읽거나 그 칸으로 거르는 코드 grep 0건, 조사 3).

### 6. §8 5대 질문
1~4 앱 경로 무변경. 5. 권한: 조회·수정·삭제 규칙 무변경(조사 3·5-B 조사 3), 계정 삭제 시 행 처리만 바뀜 — 확인된 결정(위 1).

### 7. 실패 시 처리
SQL은 한 묶음이라 실패하면 전부 적용 안 됨 → 오류 문구를 받아 다시 판단. 앱 코드 무변경. **신규 레이어 없음.**

### 8. §6 200줄
해당 없음(SQL 기록 파일 1개).

### 9. 검증
- 사후검증 쿼리 2개 기대값 일치.
- 실제 계정 삭제로 시험하지 않음(되돌릴 수 없음). 대신 앱 동작 확인: 차주·기사 계정으로 비용 1건 저장·새로고침 정상(작성 규칙 무변경 확인) — AI가 옆 브라우저로.
- `npm test`는 코드 변경이 없어 영향 없음(기록 파일만 추가).

### 10. 알려진 한계
- 연동 중 탈퇴 막기·해제 후 각자 보관·새 기사 이전 기록 차단은 10-7.

### 검증 결과 (2026-10-01)
- **SQL 실행:** 사용자 지시("SQL은 너가 실행해")로 AI가 옆 브라우저 SQL Editor에서 3번 SQL 그대로 실행(실행 전 편집기 처음~끝 확인) → "Success. No rows returned".
- **사후검증(읽기 전용):** 5개 표 모두 `FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL`, `user_id` nullable 5개 모두 `YES` — 기대값 일치.
- **앱 동작:** 차주 계정으로 메인 9/29에 정비 "5-C확인" 2원 저장 → 서버 행 생성, 쓴 사람 = 차주(작성 규칙 무변경 확인). 기사 계정 저장은 경로·규칙이 같아 따로 안 봄.
  (확인용 "0-3확인" 1원·"5-C확인" 2원이 차주 메인 9/29에 남아 있음 — 필요하면 지워도 됨.)
- 기록 파일: `supabase/migrations/0008_log_rows_keep_on_account_delete.sql`(react-app `4a1068a`). 앱 코드 변경 없음 → `npm test` 영향 없음(CI가 확인).
- 실제 계정 삭제 시험은 안 함(되돌릴 수 없음) — 사후검증으로 대신.
