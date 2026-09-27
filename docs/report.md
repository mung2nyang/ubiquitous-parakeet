# docs/report.md — 현재 슬라이스 착수지시서

## 배포까지 순서 4번 — 기사 본인 매출 화면 산재보험 반영 `[x]` 착수지시서 (react-app `8a0bdee`, DB `0006`, 2026-09-27 최종 승인)

### 1. 목적 (비개발자용)
차주 화면은 기사차량의 산재보험료를 정산액에서 빼는데, **기사 본인 계정 화면은 빼지 않아 같은 달 정산액이 서로 다르게 보인다**(금액 오류).
원인은 기사 화면이 차량 정보를 서버 함수 `get_assigned_vehicle_summary`로 받는데, 이 함수가 "산재보험 적용 여부"를 안 돌려주기 때문이다.
서버 함수가 그 값을 함께 돌려주게 하고, 기사 화면이 그 값을 쓰게 한다. **새 저장 칸·새 데이터 없음** — 차주가 저장한 값을 읽어 오기만 한다.

### 2. 현재 → 목표
- 현재: `vehicles.raw`(차량 전체 통짜 저장)에 `insuranceOn`이 이미 들어 있다(`cloudStorage.js:90` `raw: car`, 차주 화면은 `hydrateMergeCars.js:90`으로 읽음).
  그러나 기사용 함수(`0003` 마이그레이션)는 컬럼 10개만 돌려주고 `insuranceOn`이 없어 `carFromAssignedSummary`(`hydrateEmployedDriver.js:33`)가 산재를 모른다.
- 목표: 함수가 `insurance_on`(참/거짓)을 추가로 돌려주고, `carFromAssignedSummary`가 `car.insuranceOn`을 채운다 → `driverSelfRevenue.js:72`가 이미 그 값을 읽어 산재를 뺀다.

### 3. 진행 순서 (DB 먼저, 그다음 코드 — 0-2에서 배운 순서)
1. AI: 읽기 전용 진단 쿼리 제공(§4) → 보리가 Supabase에서 실행해 결과 회신. **이 단계엔 코드·DB 변경 없음.**
2. AI: 회신 결과로 SQL 확정본 제공(§5는 초안) → 보리가 실행 → AI가 사후검증 쿼리 제공·확인.
3. AI: 코드 수정 + 테스트 → 브라우저 검증(보리) → 코드 커밋 1회 → push·CI 초록 → 최종 `[x]`.
- 서버를 먼저 고쳐도 안전: 지금 배포된 앱은 모르는 컬럼을 그냥 무시한다.

### 4. 진단 쿼리 (읽기 전용 SELECT — 개인정보·차량번호 안 나옴)
```sql
-- Q1: vehicles 칸 목록(raw가 있고 jsonb인지)
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='vehicles' order by ordinal_position;
-- Q2: 라이브 함수 정의(0003과 같은지)
select pg_get_functiondef('public.get_assigned_vehicle_summary()'::regprocedure);
-- Q3: raw 안의 산재 값 분포(건수만)
select type, jsonb_typeof(raw::jsonb -> 'insuranceOn') as kind, raw::jsonb ->> 'insuranceOn' as val, count(*)
from public.vehicles group by 1,2,3 order by 1,2,3;
-- Q4: 함수 실행 권한
select grantee, privilege_type from information_schema.routine_privileges
where routine_schema='public' and routine_name='get_assigned_vehicle_summary' order by 1;
```
**중단 조건:** Q1에 `raw`가 없거나, Q2가 0003과 다르거나(누가 손댐), Q3에 `true`가 하나도 없으면(차주 저장이 `raw`에 안 올라감 = 더 큰 문제) 수정 계획을 다시 세워 보고한다.

### 5. SQL 초안 (Q1~Q4 결과 확인 후 확정본으로 교체 — 결과 보기 전엔 확정 아님)
`supabase/migrations/0006_assigned_vehicle_insurance.sql` 신규. 0003 방식 그대로(drop 후 create, 기존 10개 컬럼 순서 유지 + 끝에 1개 추가, 권한 재부여):
`insurance_on boolean` = `case when jsonb_typeof(v.raw::jsonb -> 'insuranceOn') = 'boolean' then (v.raw::jsonb ->> 'insuranceOn')::boolean else false end`
(`case`로 감싸는 이유: `raw`에 이상한 값이 있어도 함수 전체가 에러 나 기사 화면이 통째로 죽지 않게). `begin…commit`, `security definer` + `set search_path = public` 유지, `revoke … from public/anon`, `grant … to authenticated`.

### 6. 건드릴 파일
| 파일 | 할 일 |
|---|---|
| `supabase/migrations/0006_assigned_vehicle_insurance.sql` | **신규**(SQL, 위 §5) — DB는 보리가 직접 실행 |
| `src/lib/driverLinkRpc.js` (133줄) | `fetchAssignedVehicleSummary` 반환 타입 JSDoc에 `insurance_on` 추가(제자리 수정) |
| `src/lib/hydrateEmployedDriver.js` (**199줄**) | 파라미터 JSDoc에 `insurance_on` 추가(제자리) + `insuranceOn: row.insurance_on === true,` 1줄 추가 → **200줄, §6 한도 이내**. 넘어가면 멈추고 보고 |
| `src/app/employedDriverSession.test.js` | `carFromAssignedSummary` 테스트에 산재 참/거짓/없음 3케이스 추가 |
| `docs/` (STATUS.md 390행) | "필요 시 `0006`으로 스냅샷화" 문구를 `0007`로 정정(0006이 이 슬라이스로 사용됨) — [x] 커밋 때 |

### 7. 안 건드릴 것 (근거 병기)
- `driverSelfRevenue.js` — 이미 `assigned.insuranceOn`을 읽어 산재를 뺀다(72행), 기존 테스트 `driverSelfRevenue.test.js` 66행 "(c) insuranceOn이면 산재 차감"이 검증 중. 수정 불필요.
- 차주 쪽 `hydrateMergeCars.js`·`CarFormModal.jsx`·`buildVehicleRow` — 이미 `raw`로 저장·복원 중(위 §2 근거). 저장·쓰기 경로는 전혀 안 건드림.
- 다른 소비처 — `carFromAssignedSummary`·`fetchAssignedVehicleSummary` 호출부 전수 grep: `hydrateEmployedDriver.js:141`(1곳)과 테스트뿐.

### 8. AGENTS §8 5대 질문
1. 스냅샷: 기사 세션 hydrate가 RPC를 불러 한 번에 받는다(구독 아님). 2. 값의 출처: 서버 `vehicles.raw` → RPC → `carFromAssignedSummary` → Store의 cars. 이 슬라이스는 그 변환 중간에 값 1개를 더할 뿐.
3. 쓰기 창구: **없음(읽기 전용)**. 4. hydrate·동시편집 경합: 기존 흐름 그대로, 필드 1개 추가라 새 경합 없음.
5. **권한(보리 확인 필요):** 기사는 자기 배정 차량의 "산재 적용 여부(참/거짓)"를 **읽기만** 한다(쓰기 권한 변화 없음). 이미 정산율·급여방식은 같은 함수로 읽고 있다. 원본에서 기사가 이 값을 보던지 불확실 → 보여줘도 되는가?

### 9. 검증
- `npm test`(unit + 화면), `npm run typecheck` 0에러, strict-inventory 진단 수 불증가(플레이북 §7-12).
- **테스트 진실성**(플레이북 §6): `insuranceOn:` 줄을 되돌리면 새 테스트가 FAIL하는지 CLI 원문 로그로 확인 후 원복.
- 외부 경계값: RPC 값은 `=== true`일 때만 참으로 인정(문자열 "true"·null·없음은 거짓 — 플레이북 §8).
- **브라우저 검증(보리):** ① 차주 계정에서 기사차량 "산재보험 적용" ON ② 그 차량에 연동된 기사 계정으로 로그인해 해당 월 매출 화면 열기 ③ 정산액 = 수수료 − 산재이고 차주 화면의 그 기사 정산액과 같은지. OFF로 바꾼 뒤 산재가 안 빠지는지도 확인.
- push 후 CI "verify" 초록.

### 10. 실패 시 처리·신규 레이어
새 저장소·큐·fallback·tombstone 없음(AGENTS §7 해당 없음). 함수 실행 실패 시 기사 화면 전체가 영향받으므로 SQL은 `case`로 방어하고, 사후검증에서 함수 결과 타입·권한을 확인한다.
문제가 생기면 0003 정의로 되돌리는 SQL을 즉시 제공(컬럼 추가뿐이라 되돌려도 데이터 유실 없음).

### 11. §6 (200줄)
신규 프로덕션 파일 0개(SQL 1개 제외). 수정 프로덕션 파일 2개 모두 200줄 이내(`hydrateEmployedDriver.js`는 199→200, 한도 정확히). 테스트 파일 예외.

### 12. 커밋 (검증 후 코드 1회, push는 보리)
초안: `fix: 기사 본인 매출 화면에도 산재보험을 반영한다 (서버 함수가 산재 적용 여부를 함께 돌려줌, 로드맵 4번)`
