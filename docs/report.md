# docs/report.md — 현재 슬라이스 착수지시서

## 스코프 수정 묶음 2 — 운송비 내역서가 그 차량의 고정노선 단가를 쓰게

**근거:** `docs/scope-audit.md` Q3(🔧 관찰: `reportSummary.js:36,66-68`, 서브차량 내역서 라우트), 보리가 브라우저로 확인(2026-09-21).
묶음 1(`1413e8e`)의 짝이다. **범위는 스코프 문제 하나뿐**이다 — 운송내역서는 회사에 제출하는 영수증이라 기사차량 수수료·기사 급여를 넣지 않는다는
결정(`docs/finance-parity.md` F-06, `docs/sot.md` §0 "업무 흐름")에 따라 **수수료 계산은 지금 방식 그대로** 둔다.

### 1. 현재 상태 (증거 병기)
- 내역서 요약 계산 `buildMonthReport`([reportSummary.js:64-79](react-app/src/lib/reportSummary.js:64))는 고정노선을
  `resolveFixedUnitPrice({ clients })`·`getFixedRouteClient({ clients })`로 **차량번호 없이(=차주 스코프 없는 것만)** 찾는다
  ([:66-67](react-app/src/lib/reportSummary.js:66)). 그 값이 일자별 표(`buildReportDayRows`)와 월 정산(`monthSettlementSummary`)에 그대로 들어간다.
- 내역서 화면 `ReportPage`는 **일지는 맞게 고른다** — `logKey`(`/app/logs/:logId/report`의 차량번호 또는 `main`)로 `workData`를 고르고
  `cars`를 그 차량 하나로 좁힌다([ReportPage.jsx:34-57](react-app/src/components/ReportPage.jsx:34)). 그런데 단가는 위처럼 차량을 모른다.
- 결과(2026-09-21 재현 스크립트): **차주 계정의 서브차량 내역서** — 서브 스코프 10만원/차주 25만원, 고정운행 1회 → 거래처별 `{차주고정: 250,000}`,
  즉 **차주 단가로 계산**. **기사 본인 내역서** — 기사 세션은 스코프 거래처만 있어 **고정 기본운임 0원·합계 0원**.
- 이미 스코프가 맞는 곳(`CalendarPage`·`financeCore`·`financeOwnerDetail`·`financeTaxInvoiceGroups`·`driverSelfRevenue`)과 달리 내역서만 남았다.

### 2. 목표 상태
- 서브차량 내역서(차주 계정)의 고정노선 기본 운송료가 **그 차량 스코프 단가×횟수**(10만원)다. 스코프 고정노선이 없으면 차주 것으로 fallback(기존과 동일).
- 기사 본인 내역서가 **본인 스코프 단가**로 나온다(0원이 아님).
- 차주 메인 내역서·상세(거래처별) 내역서·PDF/이미지/공유 흐름은 **결과 동일**.
- **수수료 관련 계산은 바꾸지 않는다**(기사차량 수수료 미차감 유지 — 위 근거).

### 3. 건드릴 파일 (수정 1 + 테스트 1)
1. `react-app/src/lib/reportSummary.js`(101줄) — `buildMonthReport`에서 이미 계산하는 `mainCar`(`cars`에서 고른 그 내역서의 대상 차량, 현재 `:80`)를
   먼저 구하고 **`mainCar?.type === 'sub'`일 때만 그 차량번호**를 고정노선 스코프 키로 `resolveFixedUnitPrice`·`getFixedRouteClient`(`:66-67`)에 넘긴다.
   메인 차량이면 스코프 키 없음(지금과 동일). **함수 시그니처 불변**(파라미터 추가 없음).
2. 테스트: `react-app/src/lib/report.test.js`(이미 `buildMonthReport` 사용) — 새 파일 없음.

### 4. 안 건드릴 파일 (근거 병기)
- `ReportPage.jsx`(**250줄, 이미 200 초과**) — 수정 불필요: `cars`를 이미 그 차량으로 좁혀 `buildMonthReport`에 넘기므로(`ReportPage.jsx:44-57`) 위 1번만으로 서브·기사 본인 내역서가 모두 맞는다.
  200줄 초과 파일을 건드리지 않는다(§6).
- `reportDetail.js` — 고정노선·단가를 읽지 않는다(`grep fixed|unitPrice|resolveFixed` 0건, `buildDetailReport`는 `{ clients }`만 받아 거래처 필터).
- `domain/monthSettlement.js` — `car`·`logId` 옵션으로 수수료를 다루는 부분은 이번에 넘기지 않는다(F-06 결정). **F-03(휴무일 합산) 수정은 별도 슬라이스**이며 그때 내역서 합계가 영향받는지 재검증한다.
- `domain/clients.js` — 이미 스코프 인자 지원(`clients.js:23-42`).
- `hydrateEmployedDriver.js` — 기사 세션에 내려오는 거래처는 그대로(고정노선은 차주·기사 둘 다 설정 가능 — 같은 스코프 레코드 공유).

### 5. 실패 시 처리
새 저장소·필드·레이어 없음(§7). 읽기 전용 계산 변경(저장·동기화 미접촉)이라 되돌리면 이전 동작(차주 단가/0원)으로 복귀, 데이터 유실 경로 없음.
읽기/쓰기 권한(§8-5): 해당 없음. 플레이북: `lib/reportSummary.js`는 §4 트리거 경로가 아니다(`domain/finance*`·`store`·`lib/*mutation*` 아님) — 참고만.
새 테스트가 수정 코드를 되돌리면 실제로 FAIL하는지 확인한다(플레이북 §6, 이번 슬라이스도 적용).

### 6. §6 200줄 확인
`reportSummary.js` 101 → 약 104줄. `ReportPage.jsx`(250줄)는 수정하지 않는다. 테스트 파일은 §6 예외.

### 기대 동작 (브라우저 검증 — 차주 계정 + 기사 계정, `npm run dev`)
**준비:** 차주 고정노선 25만원(스코프 없음) / 서브차량 스코프 고정노선 10만원 / 서브차량 일지에 고정운행 1회(이번 달). 10만원은 차주가
"기사 관리 → 거래처"에서 설정하든 기사가 본인 거래처 화면에서 설정하든 동일.
1. **차주 계정 — 서브차량 내역서**(`/app/logs/<차량번호>/report`): 고정노선 기본 운송료가 **100,000원**(수정 전 250,000원)이고 거래처명이 서브 스코프 거래처.
2. **기사 계정 — 내역서**(`/app/report`): 고정 기본 운송료가 **100,000원**(수정 전 0원).
**회귀**
3. 차주 계정 메인 내역서: 이전과 동일(차주 25만원 기준). 서브차량에 스코프 고정노선이 없으면 차주 단가 fallback도 이전과 동일.
4. 세부(거래처별) 내역서, PDF·이미지 저장, 공유 문구·파일: 이전과 같이 동작.
5. **수수료:** 수수료 10% 서브차량의 내역서 합계에 **기사차량 수수료가 차감되지 않는다**(이번 변경 전후 동일 — 운송료+부가세 기준).

### 문서 반영 (승인 후 문서 커밋 — 보리 지시: 작업 완료 뒤 **한꺼번에**)
이 슬라이스 승인 시 아래를 한 번에 커밋한다(그 커밋에 이 지시서 포함, 비우기는 그 뒤):
- `docs/roadmap.md`: 묶음 2 `[x]`. `docs/scope-audit.md`: Q3 조치 완료 메모. `STATUS.md`: `[x]`·완료 항목.
- **`docs/sot.md`: scope-audit §6 규칙 초안 6개를 묶음 1·2 실제 동작 기준으로 확정해 기록**(용어는 "연동기사 본인"; 옛 "직원기사" 정산 방식과 혼동 금지)
  + 이미 워킹카피에 있는 §0 "업무 흐름과 문서의 성격".
- `docs/finance-parity.md`: F-01~F-06 결정 기록(이미 워킹카피 수정 중).

### AI관찰 (미확인 — 실행 지시 아님)
- `mainCar = cars.find(main) || cars[0]`의 `cars[0]` 폴백: 메인 차량이 없고 서브 차량만 있는 계정(비정상)이면 그 서브 번호로 스코프가 잡힌다 — 실계정에서는 발생하지 않을 것으로 보이나 확인은 못 함.
