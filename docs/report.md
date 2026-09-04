# docs/report.md — Step 9 ①: 매출제 정산액 차주↔기사 화면 일치

> Step마다/슬라이스마다 리셋되는 착수지시서·실사 보고서 통합 파일이다(AGENTS.md §12).
> 이전 내용(소속기사 지출 입력 2차)은 `react-app` `0b089b0`,
> `docs/archive/audit.md` "소속기사 지출 입력 — 2차 최종 [x] 확정"(2026-09-04)으로 보존.

---

## 0. DB 작업

**없음.** 순수 클라이언트 계산 일치 수정.

## 1. 감시관 착수지시서 (2026-09-04)

### 배경
보리 브라우저 검증(2026-09-04): 매출제 20% 기사 + 운송료 500,000 →
**기사 화면 "순이익" 100,000** vs **차주 화면 "기사 급여" 60,000**. 불일치.

원인:
- **차주 "기사 급여"**(C-3 `domain/driverRevenueShareExpense.js`의
  `getMonthlyDriverRevenueShareExpense`): 차량별로
  `getMonthlyDriverTotals(getDriverCarWorkData(car, work), monthKey, **link**)`
  → `calculateDriverVehicleCommission(car, totals.grossAmount, totals.count)`.
  **배정기간(`link.assignmentStart/End`) 필터 적용.**
- **기사 "순이익"**(D-2 `domain/driverSelfRevenue.js`): D-2 §6-J #1에서
  감시관이 `getMonthlyDriverTotals(logData(work,'main'), monthKey, **null**)`로
  지시(당시 "배정기간 필터로 운송료 표시와 어긋남 방지" 목적). 그리고 commission을
  `base.income.fare.total`(배정기간 필터 없는 전체 운송료)에서 계산.
  → **배정기간 필터 없음.**

### 보리 결정
**기사 화면도 배정기간(할당 날짜) 기준으로 계산** → 두 화면 정산액 일치.
(§6-J #1을 되돌린다.)

### 목표 상태
`driverSelfRevenue.js`의 매출제 분기가 C-3의 per-car 계산과 **구조적으로 동일**:
- `link` = `settings.driverLinks`에서 `id === assigned.driverLinkId ||
  vehicleNumber === assigned.number`로 찾기(C-3와 같은 로직).
- `totals = getMonthlyDriverTotals(logData(workDataByLogId, 'main'), monthKey,
  **link**)` — `null` → `link`.
- `commission = calculateDriverVehicleCommission(assigned, **totals.grossAmount**,
  **totals.count**)` — `base.income.fare.total`/`base.tripCount` → `totals` 것.
- 산재·`Math.max(0, ...)`는 그대로.
- 기사 세션의 `logData(work,'main')`와 차주 세션의 `work[번호판]`은 같은 서버
  `daily_logs`/`transport_details` 행 → `getMonthlyDriverTotals` 결과 동일 →
  정산액 동일.

### 대상 파일
| 파일 | 변경 |
|---|---|
| `src/domain/driverSelfRevenue.js` | 매출제 분기 ~4줄: `null` link → 실제 link, commission을 `totals.grossAmount`/`totals.count` 기준으로. `salary` 분기·`base`(운송료 표시·부가세·미수) 무변경. |
| `src/domain/driverSelfRevenue.test.js` | 기존 (b)~(d): 픽스처 `link-1`이 2026-05 전체를 덮으므로 숫자 불변 → 그대로 통과. **신규 테스트 2개**: ① 배정기간 밖 트립이 있으면 정산액이 그만큼 줄어든다. ② `getDriverSelfMonthlyDetail(...).income.settlement.total` === `getOwnerMonthlyFinanceDetail(monthKey, 'all', ...).expense.salary.total`(같은 트립을 기사=`{main}`, 차주=`{번호판}`으로 세팅) — 두 화면 일치 직접 검증. |

### 건드리지 않을 파일
`driverRevenueShareExpense.js`(C-3 — 이미 link 필터, 무변경), `financeOwnerDetail.js`,
`OwnerRevenueView.jsx`, `OwnerMonthlyCards.jsx`, D-2/2차 신규 모듈, hydrate 경로.
**운송료 표시 라인(`base.income.fare.total`)은 그대로** — 배정기간 필터 안 함
(차주 [기사] 탭 운송료 라인도 필터 안 하므로 일치). 표시 라인도 줄일지는
브라우저 보고 별도 판단.

### 실패 처리 (§7)
신규 레이어 없음. 계산 소스 교체(4줄). 서버 쓰기 없음.

### 착수 전 작업자 확인 요청 사항
1. 수정 후 `driverSelfRevenue.js` 매출제 분기가 `getMonthlyDriverRevenueShareExpense`
   의 per-car 로직과 **줄 단위로 대응**하는지 확인(같은 함수·같은 인자 순서).
2. 신규 테스트 ②(두 화면 일치)를 반드시 넣을 것 — 회귀 방지 핵심.
3. 기존 D-2 테스트 (b) 제목이 "운송료 × %"인데 이제 "배정기간 내 운송료 × %"
   — 제목만 정정 재량.
4. 파일 200줄 이하 유지 확인.

### 작업자 전달문 (AGENTS.md §5)
> AGENTS.md의 §1 작업자 규칙을 준수하라. `.md` 파일은 수정하지 말고 지시된
> 코드 작업만 하라. 범위 = `src/domain/driverSelfRevenue.js`(매출제 분기 ~4줄)
> + `.test.js`(신규 2 + 제목 정정). `driverRevenueShareExpense.js`·`financeOwnerDetail.js`
> ·차주 화면·hydrate 무변경. `npm test` 전체 통과 후 `0b089b0` 위 커밋 1개.

## 2. 착수 전 상태 (2026-09-04)
- `react-app` HEAD `0b089b0` = origin/main. 미커밋 없음.

## 3·4. 작업자 구현 완료 (2026-09-04) — `react-app 401d9d3`

`driverSelfRevenue.js`(96줄) 매출제 분기 ~4줄:
- `link = links.find(item => item.id === assigned.driverLinkId || item.vehicleNumber === assigned.number) || null` — C-3 `getMonthlyDriverRevenueShareExpense`와 **동일 라인**.
- `getMonthlyDriverTotals(logData(work,'main'), monthKey, link)` — `null` → `link`.
- `calculateDriverVehicleCommission(assigned, totals.grossAmount, totals.count)` — `base` → `totals`.
- 산재·`Math.max`·`base.income.fare`(운송료 표시)·salary·hydrate·C-3·차주 화면 무변경.
`driverSelfRevenue.test.js`(170줄): 신규 ①②, (b)(c) 제목 정정.
`npm test` 전체 pass.

## 5. 감시관 실사 — **최종 [x] 확정 (2026-09-04)**

`401d9d3` push → CI "CI" **success**(감시관 `gh run list` 독립 확인) + 보리
브라우저(기사 순이익 == 차주 기사급여) 통과 + 감시관 §5 코드 실사 통과 →
보리 `[x]`. 영구 기록: `docs/archive/audit.md` "매출제 정산액 차주↔기사 화면
일치 최종 [x] 확정". 다음 슬라이스 착수 시 이 파일 리셋.

### §5 코드 체크리스트 (2026-09-04)

| # | 확인 | 결과 |
|---|---|---|
| 1 범위 | ✅ `driverSelfRevenue.js` + `.test.js` 2개만. `driverRevenueShareExpense.js`·`financeOwnerDetail.js`·차주 화면·hydrate 무변경(diff 확인). |
| 2 몰래 증설 | ✅ 계산 소스 교체 4줄. 새 함수·저장소 0. |
| 3 타입 꼼수 | ✅ `git show` grep 0. `@typedef DriverLinkLike` 추가(테스트). |
| 4 200줄 | ✅ 96 / 170. |
| 5 테스트 진실성 | ✅ **① 배정기간 밖 트립 제외**(narrow link 15,000 = 100k×15%, full 30,000 = 200k×15%, 운송료 표시는 200k 유지) + **② `getDriverSelfMonthlyDetail` settlement == `getOwnerMonthlyFinanceDetail('all')` salary**(둘 다 64,500, 기사=`{main}`·차주=`{번호판}`) — 두 화면 일치 직접 검증. 기존 테스트 약화 0. |
| 6 문서 정합 | ✅ react-app diff에 `.md` 없음. |
| 7 요구사항 | ✅ 매출제 분기가 C-3 per-car와 줄 단위 대응. 기사 순이익 = 차주 "기사 급여"(배정기간 필터·`totals` 기준). 운송료 표시 라인은 미필터(차주 [기사] 탭과 동일). |

**요약(한국어):** D-2 §6-J #1(null link) 되돌려 기사 매출제 정산액을 C-3
owner "기사 급여"와 같은 경로(배정기간 필터 + `getMonthlyDriverTotals` 기준)로
계산한다. 4줄 교체 + 두 화면 일치 검증 테스트. 남은 확인: CI 초록 + 보리
브라우저(기사 순이익 == 차주 기사급여, 배정기간 밖 트립은 정산 제외).
