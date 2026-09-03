# docs/report.md — 슬라이스 C: 매출탭 기사(서브 차량) 데이터 연동

> Step마다/슬라이스마다 리셋되는 착수지시서·실사 보고서 통합 파일이다(AGENTS.md §12).
> 슬라이스 A(기사 차량 일지 서버 동기화)는 보리 브라우저 검증 완료로 최종 승인됐다 —
> 배경은 `docs/audit.md`의 "Step 9 ① 슬라이스 A 최종 승인 + 판정 부기① 처리" 및
> "Step 9 ① 매출 연동 — 신규 요청 조사" 절(2026-09-03) 참고. 이 파일은 그 다음
> 작업(슬라이스 C)의 착수지시서와 이후 작업자·감시관 보고를 담는다.

## 0. 지난 라운드 지적사항 (감시관 → 작업자, 보리 지시로 전달)

슬라이스 A에서 `lib/dayLogCloudCommit.js`(라운드 시작 전 이미 200줄을 초과해 있던
레거시 파일)를 수정하면서, AGENTS.md §3이 요구하는 "수정 전 별도 분리설계안
(책임경계/신규모듈구조/의존성흐름) 보고 및 승인" 절차를 거치지 않았다. 이번엔
보리가 착수지시서에 그 파일이 이미 "건드릴 파일"로 명시돼 있었다는 점을 감안해
그대로 승인했지만(A안), **다음부터 200줄을 초과한 기존 파일을 건드릴 때는 착수
지시서에 이름이 올라 있더라도 반드시 별도의 분리설계안을 먼저 작성해 감시관·
사용자 승인을 받은 뒤 수정할 것**. 이번 라운드에 새로 손댈 파일 중 200줄을 넘는
것은 없지만, 작업 중 파일이 커져 200줄에 근접하거나 다른 기존 대형 파일을 만지게
되면 코드를 쓰기 전에 먼저 보고할 것.

## 1. 감시관 착수지시서 (2026-09-03)

### 작업 범위
- 대상 저장소: `react-app`
- 식별자: Step 9(기사 연동) 잔여 작업 중 "① 기사관리 대리작성"의 슬라이스 C
- 슬라이스 C = 매출 화면이 서브 차량(기사) 일지 데이터를 계산에 반영하도록
  데이터 연동만. 기사별 드롭다운 선택 UI(슬라이스 D)는 별도 착수, 이번 범위 아님.

### 목적 및 기대 결과
차주가 기사(서브) 차량으로 저장한 일지가 매출 화면의 "전체"/"기사" 탭 손익·미수금
계산에 즉시 반영된다. `domain/financeOwnerDetail.js`의 `getOwnerMonthlyFinanceDetail`
과 `getReceivableItems`는 이미 `workDataByLogId[car.number]`(= `getDriverCarWorkData`)
를 통해 서브 차량별 소스를 순회하도록 만들어져 있음을 감시관이 코드로 확인했다 —
즉 **계산 로직 자체는 이미 완성돼 있고, 그 계산 로직에 서브 차량 데이터를 실제로
넘겨주는 통로 하나가 빠져 있을 뿐**이다.

### 건드릴 파일 (예상 — 착수 전 재확인 후 실제 범위를 Phase 1 보고에 포함)
- `src/store/ownerDataHooks.js`의 `readOwnerWorkDataByLogId`/`useOwnerWorkDataByLogId`
  (현재 63~74행 부근) — `{ main: readOwnerWorkData(ownerKey) }`로 main만 반환하던
  것을, `getState().workLogs[ownerKey]` 전체(main + 슬라이스 A로 이미 채워지고 있는
  서브 logId들)를 반환하도록 확장. 슬라이스 A 이전부터 있던 주석("서브 일지 persist
  창구는 이 이관 범위 밖")은 이제 사실이 아니므로 같이 정리.

### 건드리지 않을 파일 (Explicit Out-of-Scope, 이번 라운드)
- `src/domain/financeOwnerDetail.js`, `financeCore.js`, `financeReceivables.js` —
  이미 `workDataByLogId`를 범용적으로 순회하므로 로직 변경 불필요(확인 결과 무수정
  이어야 정상 — 만약 작업자가 이 파일들을 건드려야만 매출 반영이 된다고 판단하면,
  그건 감시관의 사전 조사가 틀렸다는 뜻이니 착수 전에 먼저 보고할 것).
- `src/components/revenue/OwnerRevenueView.jsx`, `DriverRevenueView.jsx`, `RevenueNav.jsx`
  — UI는 슬라이스 D 대상, 이번 라운드 무변경.
- `src/components/DriverConnectionPage.jsx`, `DriverFormModal.jsx`, `src/domain/drivers.js`
  — 기사-차량 연결(1:1, `vehicleNumber`) 규칙은 이미 존재, 무변경.

### 실패 시 처리 방식
이 슬라이스는 서버 쓰기가 없는 순수 읽기용 파생 데이터 훅 확장이라 "저장 실패"
개념 자체가 없다. 대신 계산 정확성이 핵심 리스크이므로, 작업자는 반드시 **서브
차량 일지가 있을 때 매출 "전체"/"기사" 탭 합계가 그 데이터를 포함해 정확히
계산되는지 확인하는 신규 테스트**를 작성해 Phase 1 보고에 포함할 것(예:
`ownerDataHooks.test.js` 또는 `financeOwnerDetail`을 사용하는 기존 테스트 확장).

### 사용자 승인 근거
- 2026-09-03, 보리: "차주가 서브차량운행일지 기입후 매출에서 기사탭이 연동되어야함"
  (신규 요청).
- 2026-09-03, 감시관 조사 후 슬라이스 분리 여부 질의 → 보리: "나눠서: C(데이터연동)
  먼저"(AskUserQuestion 응답). 기사별 드롭다운 UI(슬라이스 D)는 이후 별도 착수.
- 4대 기준(§0-1 C) 상세는 `docs/audit.md`의 "Step 9 ① 매출 연동 — 신규 요청 조사"
  절 참고. 계산 로직 무변경이라 신규 durable/fallback 레이어 해당 사항 없음(§0-1 A).

### 착수 전 작업자 확인 요청 사항
아래는 감시관이 코드를 직접 훑어 예상한 범위다 — 착수 전 작업자가 실제 코드로
재확인하고 Phase 1 보고에 반영할 것:
1. `useOwnerWorkDataByLogId`/`readOwnerWorkDataByLogId`를 소비하는 곳이
   `components/revenue/OwnerRevenueView.jsx` 외에 더 있는지(예: 세금계산서/계산서
   관련 화면) grep으로 재확인 — 있다면 그 화면도 이번 변경으로 서브 차량 데이터가
   섞여 들어가는 게 맞는지, 아니면 그 화면만 별도로 main만 유지해야 하는지 판단해
   보고.
2. `workLogs[ownerKey]`에 아직 `supabaseId`가 없어 서버 미동기 상태인 게스트/로컬
   전용 사용자의 서브 로그도 이번 변경으로 매출에 잡히는 게 맞는지(감시관 판단으로는
   맞다 — 로컬에만 있어도 차주가 입력한 실제 데이터이므로 매출에는 반영돼야 한다.
   다만 작업자가 다른 판단이면 착수 전 보고).

---


## 2. 작업자 Phase 1 보고
(작업자가 이 아래에 기입)

---
(감시관 Phase 2 실사 판정은 작업자 보고 이후 이어서 기록한다.)
