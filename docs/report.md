# docs/report.md — 현재 슬라이스 착수지시서

(지난 슬라이스 7-A(연동 중 탈퇴 불가)·7번 조사·결정은 `git show 6d6605a -- docs/report.md`.)

## 배포까지 순서 7-B — 새로 연동한 기사는 이전 기사 기록을 못 본다 (DB 권한) `[x]` (착수지시서 확정 2026-10-01)

> 완료(2026-10-01): DB 적용·검증, 기록 react-app `b14cd0e`(마이그레이션 0010), push·CI 초록·§5 리뷰 통과·사용자 최종 승인.

확정 규칙 `[확인: 2026-10-01 보리]`(로드맵 7번): 기사는 **지금 그 차량에 연동 중일 때만**, 그리고 **자기 연동 기간(이번 + 같은 차량의 예전 기간)에 드는 날짜**의 기록만 보고·고치고·지운다.
그 사이 빈 기간과 다른 기사 기간은 차주만.

### 1. 조사 (2026-10-01, AI가 SQL Editor에서 읽기 전용 조회)
- 연동 4건: 11가1111 `linked` 시작 2026-09-16(기록은 09-27부터), 부산92아5365 `linked` 시작 2026-07-01(기록 07-01부터), 44나4444 `linked` 시작 09-18(기록 없음), 33가3333 `pending`.
  종료일은 모두 비어 있음 → **지금 데이터 기준으로 새 규칙을 켜도 기사에게서 사라지는 기록 없음.**
- 권한 규칙: 하루 기록·콜 상세·정비·유류·기타 5개 표 각각 조회·작성·수정·삭제 4개 규칙이 "내가 쓴 행(`user_id`) **또는** 내 차량 **또는** 그 차량에 `linked`인 기사"로 되어 있고,
  하루 기록·콜 상세에는 "연동 기사 조회" 규칙이 1개씩 더 있음(총 22개). 기간 조건은 어디에도 없음.
- **새로 알게 된 것:** "내가 쓴 행" 조건 때문에 기사는 **연동이 끝난 뒤에도 자기가 쓴 행을 차주 차량에서 계속 조회·수정·삭제할 수 있음**(앱 화면엔 안 나오지만 서버상 가능)
  → "해제 후 서로 관여하지 않음"(로드맵 7번)과 어긋남.

### 2. 설계
- 서버 도우미 함수 `public.driver_can_access_vehicle_date(차량, 날짜)` 1개: "지금 그 차량에 `linked`" **그리고** "그 날짜가 내 연동 기간(`linked` 또는 7-C의 `disconnected`, 시작일 없으면 제한 없음·종료일 없으면 계속) 안".
- 5개 표 22개 규칙을 **"내 차량 또는 위 함수가 참"**으로 교체. **"내가 쓴 행" 조건은 뺌** — 차주는 "내 차량"으로 이미 전부 보이고, 기사는 연동 기간 조건으로만 접근(해제 후 관여 차단).
  작성 규칙은 기존처럼 "쓴 사람 = 나"도 함께 확인.
- 7-C에서 해제된 연동을 `disconnected`+종료일로 남기면 같은 기사 재할당 때 예전 기간이 자동으로 보임(이번에 미리 반영).
- 데이터 변경 없음, 앱 코드 변경 없음(앱은 차량 기준으로 읽고, 권한이 거른 결과만 받음). 기록 파일 `react-app/supabase/migrations/0010_driver_access_by_link_period.sql`.

### 3. 서버 변경 SQL — 착수 승인 후 완성본을 기록 파일에 쓰고 그대로 실행(멱등: `create or replace function` + 규칙마다 `drop policy if exists` → `create policy`, 한 묶음 begin~commit)
규칙 이름은 지금 이름 그대로 유지(운행기록/콜상세/정비기록/유류기록/기타지출 × 조회·작성·수정·삭제, "linked driver reads own assigned vehicle daily_logs/transport_details").
형태(표마다 같음, 예: 유류기록):
```sql
create or replace function public.driver_can_access_vehicle_date(p_vehicle_id uuid, p_work_date date)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.driver_links cur
                 where cur.driver_id = auth.uid() and cur.vehicle_id = p_vehicle_id and cur.status = 'linked')
     and exists (select 1 from public.driver_links dl
                 where dl.driver_id = auth.uid() and dl.vehicle_id = p_vehicle_id
                   and dl.status in ('linked', 'disconnected')
                   and (dl.assignment_start is null or p_work_date >= dl.assignment_start)
                   and (dl.assignment_end is null or p_work_date <= dl.assignment_end));
$$;
drop policy if exists "유류기록 조회" on public.fuel_records;
create policy "유류기록 조회" on public.fuel_records for select using (
  vehicle_id in (select v.id from public.vehicles v where v.user_id = auth.uid())
  or public.driver_can_access_vehicle_date(vehicle_id, work_date));
-- 수정·삭제도 같은 조건, 작성은 with check ((user_id = auth.uid()) and (위 조건)).
```

### 4. 건드릴 파일
- `react-app/supabase/migrations/0010_driver_access_by_link_period.sql`(신규, 실행한 SQL 전체 기록). 앱 코드 없음.

### 5. 안 건드릴 것 (근거)
- 앱 코드: 이 표들은 전부 `vehicle_id`로 조회(5-C 조사 grep), 권한이 걸러도 앱 흐름 동일. 거래처 공유 규칙(0004)·연동 표 규칙 — 이번 범위 아님(7-C).

### 6. §8 5대 질문
1~4 앱 경로 무변경. 5. 권한: 확정 규칙대로 좁힘 — 차주는 무변경(내 차량 전부), 기사는 연동 중·자기 기간만.

### 7. 기대 동작
- 기사: 연동 시작일 이전 날짜 기록은 안 보이고 못 고침(지금 데이터엔 해당 없음). 연동 기간 기록은 지금처럼 보고·고치고·지움(5-B 공용 장부 유지).
- 차주: 무변경. 해제된 기사: 차주 차량 기록에 접근 불가.

### 8. 실패 시 처리
한 묶음이라 실패하면 전부 적용 안 됨. 적용 후 문제가 생기면 같은 방식으로 이전 규칙(조사 1의 조건)으로 되돌리는 SQL을 기록 파일에 함께 적어 둠. **신규 레이어 없음.**

### 9. §6 200줄
해당 없음(SQL 기록).

### 10. 검증
- 사후검증(읽기 전용): 22개 규칙 본문에 새 조건, 함수 존재. 규칙 수 22 유지.
- 앱(AI가 옆 브라우저로): 기사 계정 11가1111 — 9/27·9/30 기록 보이고 비용 저장 가능(5-B 유지). 차주 계정 — 전부 보임·저장 가능.
- 기간 밖 차단 확인: 기사 연동 시작일을 잠깐 미래로 바꿔 보기 등은 **사용자 데이터를 바꾸므로 하지 않음** → 함수 결과를 SQL로 직접 확인(기사 id·날짜를 넣어 참/거짓, 읽기 전용).

### 검증 결과 (2026-10-01)
- 실행: 사용자 지시로 AI가 SQL Editor에서 실행. 긴 SQL이라 편집기에 한 번에 넣고(`monaco setValue`) 기록 파일(주석 제외)과 **7,060자 일치·규칙 22개** 대조 후 실행.
  Supabase "destructive"(drop policy) 경고 → 승인 SQL 그대로·한 묶음이라 진행 → Success.
- 사후검증: 5개 표 규칙 22개 모두 새 함수 조건, 옛 조건(`status = 'linked'` 직접 확인) 0, 함수 1개.
- 기사 계정 가정 조회(읽기 전용, `set local role authenticated` + 기사 id, 끝에 rollback): 11가1111 9/15(시작 전날) false·9/16 true·9/30 true, 차주 메인 차량 false,
  기사에게 보이는 11가1111 정비 1건·차주 메인 0건.
- 앱(차주 계정): 메인·연동 차량 기록 전부 조회, 9/29 정비 추가·삭제 정상(쓴 사람 = 차주).
  **작업 중 실수:** 일지 화면 삭제 버튼이 한 번 누르면 바로 지워지는데 두 번 눌러, 확인용 "5-C확인"에 이어 "0-3확인"까지 지움(둘 다 AI가 넣은 확인용 항목, 사용자 데이터 무영향).
- 기록 파일 `supabase/migrations/0010_driver_access_by_link_period.sql`(되돌리기 SQL 주석 포함). 앱 코드 변경 없음.
