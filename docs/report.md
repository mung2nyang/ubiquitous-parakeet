# docs/report.md — 현재 슬라이스 착수지시서

## 4-2 산재보험·원천징수 재설계 — 슬라이스 2 "기사 본인 화면 + 서버" `[x]` 착수지시서 (react-app `c7de4f3`, DB `0007`, 2026-09-27 최종 승인)

### 1. 목적 (비개발자용)
슬라이스 1에서 **차주 화면**은 기사차량의 산재보험료·3.3% 세금을 새 규칙(월 단위, 기사 정산액 기준)으로 계산하도록 바꿨다.
**기사 본인 계정 화면**은 아직 옛 방식(콜 상세에 입력한 산재보험료를 그대로 뺌)을 쓰고 있어서, 같은 달 정산액이 두 화면에서 다르게 보일 수 있다.
이번 슬라이스는 기사 본인 화면도 차주 화면과 **같은 계산**을 쓰게 만든다. 서버 함수가 차량의 새 설정(기사 유형·산재·원천징수 토글·필요경비율·요율)을
기사 화면에도 전달해야 해서 서버(DB) 변경이 있다. **금액 규칙 자체는 바뀌지 않는다** — 슬라이스 1에서 이미 확정한 계산을 기사 화면에도 적용할 뿐이다.

### 2. 현재 → 목표 (계산 예시로 확인)
- 현재: 기사 본인 매출 화면(`driverSelfRevenue.js`)이 `totals.insuranceAmount`(콜 상세 건별 산재보험료 합)를 빼는 옛 계산을 쓴다. 서버 함수
  `get_assigned_vehicle_summary`는 새 필드 4개를 안 돌려줘서 기사 화면은 그 값을 모른다.
- 목표: 기사 본인 화면도 `domain/driverIncomeDeductions.js`의 같은 함수(`getDriverSettlementAmount`·`getDriverIncomeDeductions`)를 써서 차주 화면과
  **원 단위까지 같은 값**을 낸다.
- 확인 예시(픽스처 서울12가3456, 매출제 15%, 산재 ON, 운송료 450,000 → 정산액 67,500):
  - **현재(옛 계산)**: 67,500 − (콜 상세 건별 insuranceFee 합) = 64,500
  - **목표(새 계산)**: 67,500 − 산재 기사 몫 422(요율 1.8%·경비율 30.5% 기준) = **67,078**
  - 고정노선만 뛴 달(운송료 250,000, 정산액 37,500)도 마찬가지로 **37,266**으로 바뀐다(옛 계산은 콜 상세가 없어 산재 0원 처리였음).
  - 이 값들은 슬라이스 1에서 차주 화면에 이미 적용된 것과 **정확히 같은 식**이다.

### 3. 진행 순서 (DB 먼저, 그다음 코드)
1. AI: 읽기 전용 진단 쿼리 제공(§4) → 보리가 Supabase에서 실행해 결과 회신.
2. AI: 회신 결과로 SQL 확정본 제공(§5는 초안) → 보리가 실행 → AI가 사후검증 쿼리 제공·확인.
3. AI: 코드 수정 + 테스트 → 브라우저 검증(보리, 기사 계정) → 코드 커밋 1회 → push·CI 초록 → 최종 `[x]`.

### 4. 진단 쿼리 (읽기 전용 SELECT)
```sql
-- Q1: 라이브 함수가 0006과 같은지(누가 손댔는지 확인)
select pg_get_functiondef('public.get_assigned_vehicle_summary()'::regprocedure);
-- Q2: 새 필드 4개가 raw에 실제로 어떤 모양으로 들어와 있는지(슬라이스 1에서 저장된 테스트값 포함)
select type,
       jsonb_typeof(raw -> 'driverIncomeType') as income_type_kind, raw ->> 'driverIncomeType' as income_type,
       jsonb_typeof(raw -> 'withholdingOn') as withholding_kind, raw ->> 'withholdingOn' as withholding,
       raw ->> 'expenseRate' as expense_rate, raw ->> 'insuranceRate' as insurance_rate
from public.vehicles where type = 'sub';
```
**중단 조건:** Q1이 0006과 다르면(누가 손댐) 계획을 다시 세워 보고한다. Q2는 참고용(값이 비어 있어도 정상 — JS가 기본값으로 채운다).

### 5. SQL 초안 (Q1 확인 후 확정본으로 교체)
`supabase/migrations/0007_assigned_vehicle_income_fields.sql` 신규. 0006 방식 그대로(drop 후 create, 기존 11개 컬럼 순서 유지 + 끝에 4개 추가):
`driver_income_type text`(`v.raw ->> 'driverIncomeType'`, 그대로 — `employee`가 아니면 뭐가 와도 JS `driverIncomeFieldsFromDraft`가 `business`로 되돌림),
`withholding_on boolean`(0006의 `insurance_on`과 같은 `case when jsonb_typeof(...) = 'boolean' then ... else false end` 방어),
`expense_rate text`·`insurance_rate text`(`v.raw ->> '...'`, 그대로 — 빈 값·이상한 값은 JS `rateOf()`가 기본값 30.5/1.8로 되돌림).
**기본값 계산은 SQL에 중복해서 넣지 않는다** — `domain/driverIncomeDeductions.js`(JS)가 이미 하는 일이라, SQL은 원값만 안전하게 꺼내고 판단은 JS에 맡긴다(정본 하나만 유지).
`begin…commit`, `security definer` + `set search_path = public`, `revoke … from public/anon`, `grant … to authenticated` 유지.

### 6. 건드릴 파일
| 파일 | 할 일 |
|---|---|
| `supabase/migrations/0007_assigned_vehicle_income_fields.sql` | **신규**(SQL, 위 §5) — DB는 보리가 직접 실행 |
| `src/lib/driverLinkRpc.js` (133줄) | `fetchAssignedVehicleSummary` 반환 타입 JSDoc에 새 필드 4개 추가(제자리) |
| `src/lib/hydrateEmployedDriver.js` (200줄) | `carFromAssignedSummary`가 새 필드를 `driverIncomeFieldsFromDraft()`로 정규화해 채움(기존 검증된 함수 재사용 — 새 방어 로직 안 만듦). **200줄 정확히라 1줄이라도 늘면 분리설계 필요**, 넘으면 멈추고 보고 |
| `src/domain/driverSelfRevenue.js` (103줄) | 옛 `assigned.insuranceOn ? totals.insuranceAmount : 0` 차감을 `getDriverSettlementAmount`+`getDriverIncomeDeductions`(슬라이스 1과 동일 함수)로 교체 |
| `src/app/employedDriverSession.test.js` | `carFromAssignedSummary`에 새 필드 4개 매핑·기본값 테스트 추가 |
| `src/domain/driverSelfRevenue.test.js` | §2 예시대로 기대값 갱신(64,500→67,078, 37,500→37,266) + ②번 테스트는 두 화면이 이제 산재 ON에서도 같아지므로 임시 조건(`insuranceOn: false`) 제거 |

### 7. 안 건드릴 것 (근거 병기)
- `financeTaxInvoiceGroups.js`(기사 매입 세금계산서) — 슬라이스 1에서 이미 "무변경" 결정(3.3% 사업소득자는 세금계산서 대상 아님). 이번에도 그대로.
- `driverIncomeDeductions.js` 계산 함수 자체 — 슬라이스 1에서 만들고 검증됨, 이번엔 재사용만 한다.
- 차주 쪽 화면·저장 경로 — 전혀 안 건드림(이미 슬라이스 1에서 완료).
- 콜 상세 "산재보험료" 칸 — 별도 슬라이스(3번) 대상, 이번엔 그대로.

### 8. AGENTS §8 5대 질문
1. 스냅샷: 기사 세션 hydrate가 RPC를 한 번에 받는다(기존과 동일, 슬라이스 4번에서 이미 확인). 2. 값 출처: 서버 `vehicles.raw` → RPC → `carFromAssignedSummary` → Store cars.
3. 쓰기 창구: **없음(읽기 전용)**. 4. hydrate 경합: 기존 흐름 그대로, 필드 4개 추가뿐. 5. 권한: 4번 슬라이스와 같은 성격(기사가 자기 배정 차량의 설정값을 읽기만 함) — 이미 승인된 방향 그대로라 재확인 불필요.

### 9. 검증
- `npm test`(unit+화면)·`npm run typecheck` 0에러·strict-inventory 진단 불증가(기준선 428).
- **테스트 진실성**: `driverSelfRevenue.js`의 새 계산 줄을 되돌리면 갱신한 테스트가 FAIL하는지 CLI 원문으로 확인 후 원복.
- **차주 화면과 값 일치 확인**: 같은 픽스처로 `getMonthlyDriverRevenueShareExpense`(차주)와 `getDriverSelfMonthlyDetail`(기사 본인)의 산재 ON 결과가 같은 금액인지 테스트로 고정(②번).
- **브라우저 검증(보리, 기사 계정)**: 4번 슬라이스 때 쓴 산재 ON 테스트 차량으로 로그인해 매출 화면을 열고, 같은 달 차주 화면(기사 관리 정산 요약 카드)과 최종 금액이 같은지 확인.
- push 후 CI "verify" 초록.

### 10. 실패 시 처리·신규 레이어
새 저장소·큐·fallback 없음(§7 해당 없음). 함수 실행 실패 시 기사 화면 전체가 영향받으므로 새 컬럼도 0006과 같은 방식으로 방어(boolean만 case로 감싸고 text는 그대로 통과 — JS가 최종 방어).
문제가 생기면 0006 정의로 되돌리는 SQL을 즉시 제공(컬럼 추가뿐이라 되돌려도 데이터 유실 없음).

### 11. §6 (200줄)
신규 프로덕션 파일 0개(SQL 1개 제외). 수정 프로덕션 파일 2개(`driverLinkRpc.js` 133, `driverSelfRevenue.js` 103) 모두 여유 있음. `hydrateEmployedDriver.js`는 200줄 한도에 걸려 있어 §6 참고사항에 명시.

### 12. `docs/sot.md`
이 슬라이스에선 고치지 않는다(로드맵 4-2 방침 — 남은 슬라이스 3(콜 상세 칸 분리)까지 끝나 전체 그림이 확정된 뒤 한 번에 기재).

### 13. 커밋 (검증 후 코드 1회, push는 보리)
초안: `fix: 기사 본인 매출 화면도 산재보험·원천징수를 차주 화면과 같은 방식으로 계산한다 (로드맵 4-2 슬라이스 2)`
