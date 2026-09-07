# docs/report.md — 캘린더 지출 칩(maint-badge) 복원

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **작업자 구현 완료 + CI 초록 확인 (2026-09-07) — 보리 브라우저 실검증만 남음.**
> react-app `39b9677`, CI "verify" run `34074679875`(conclusion=success), 감시관 §5
> 7항목 통과. STATUS.md "후속 nit"의 "캘린더 날짜 아래 지출 칩이 안 보임"[확인:
> 2026-09-05] 복원 — §0-D 범위(메인 캘린더 전용) 그대로 승인·구현됨.

## 0. 조사 메모

### 0-A. 원본 동작 (`ubiquitous-parakeet/script.js` `buildCalendar`)

`script.js:3459-3481` — 하루 레코드(`workData[dateKey]`)에 박혀 있는 `maintItems`/
`fuelItems`/`miscItems` 배열의 비용 합(정비·기타는 `.fare`, 주유는 `.cost`)이 0보다 크면
`.maint-badge` 뱃지를 그 날짜 셀에 추가한다(`formatFareShort`로 짧게 표기). `.work-badge`
(운행)·`.off-badge`(휴무)·`.unpaid-dot`(미수)과 같은 칸에 나란히 쌓인다.

### 0-B. react-app 현재 상태 — 왜 안 보이나

`domain/calendarBadges.js`에 `dayWorkBadgeLabel`(work-badge)·`dayHasUnpaid`(unpaid-dot)는
있지만 **지출(maint-badge) 계산 함수 자체가 없다.** `CalendarGrid.jsx`도 `workData`만 받고
`expenses`는 아예 안 받는다. `CalendarCell.jsx`에도 `.maint-badge`를 그릴 자리가 없다.
CSS도 `--maint-badge-bg`/`--maint-badge-text`·`.maint-badge` 클래스 자체가 react-app
어디에도 없음(grep 0건) — **버그가 아니라 이관 자체가 안 된 상태**(STATUS 판단과 일치,
회귀 아님).

### 0-C. 데이터 모델 차이 (원본 vs react-app) — 왜 "그대로 포팅"이 아닌가

- **원본**: `workData`가 로그(메인/서브 차량)별로 완전히 분리된 저장소(`loadWorkDataForLog`)라
  `maintItems`/`fuelItems`/`miscItems`가 그 안에 박혀 있으면 **로그별로 자동 분리**된다.
- **react-app**: 정비/주유/기타는 `domain/expenseTypes.js`의 `ExpenseItem`(`date` 필드만
  있고 로그/차량 구분 필드 없음) 하나로 통합돼 `useOwnerExpenses(ownerKey)`가 **소유자
  전체 1개 목록**을 돌려준다. `/app/expenses`(`MaintFuelPage`) 진입점도 하나뿐 — 서브
  차량 로그 전용 지출 입력 화면 자체가 없다(react-app에서 다차량 로그 기능이 나중에
  생기면서 지출 쪽은 그대로 owner-단일 목록으로 남은 것으로 보임).
- 즉 **서브 차량 캘린더**(`CalendarPage`의 `logId !== 'main'`)에 이 owner 전체 지출을
  그대로 붙이면, 다른 차량 날짜에 쓴 기름값이 지금 보고 있는 차량 캘린더에도 뜨는
  **의미상 오류**가 생길 수 있다. 같은 파일에서 `commissionTotal`도 이미 `isMain`일
  때만 계산한다(81번 줄) — 지출 데이터가 owner 단일 개념이라는 걸 이미 인정한 전례.

### 0-D. 범위 질문 (1건 — 착수 전 확인)

**추천**: 지출 칩은 **메인 캘린더에서만** 표시(서브 차량 로그 캘린더는 이번엔 손 안 댐).
근거: §0-C처럼 지출 데이터가 로그별로 분리돼 있지 않아 서브에도 그대로 붙이면 다른
차량 지출이 섞여 보이는 부정확함이 생기고, 이걸 제대로 하려면 지출에 차량/로그 구분
필드를 새로 추가하는 별도 작업(§7 "새 레이어" 취급 대상)이 필요해 이번 슬라이스
범위를 벗어난다. 같은 파일의 `commissionTotal` 전례와도 일치.
→ **이대로 진행해도 될지 승인만 받으면 착수**(다르면 서브 포함 여부·기준을 다시 논의).

## 1. 수정 계획

| 파일 | 변경 |
|---|---|
| `src/domain/calendarBadges.js` | `dayExpenseBadgeLabel(expenses, dateKey)` 함수 추가. 기존 `expenses.js`의 `filterByDate` 재사용 + `.cost` 합 → 0보다 크면 `formatFareShort`, 아니면 `null`. 기존 3함수 무변경. |
| `src/components/calendar/CalendarGrid.jsx` | `expenses` prop 추가(옵션, 메인일 때만 넘어옴) → 셀마다 `dayExpenseBadgeLabel(expenses, cell.key)` 계산해 `CalendarCell`에 `expenseBadgeLabel`로 전달. |
| `src/components/calendar/CalendarCell.jsx` | `expenseBadgeLabel` prop 추가, `{expenseBadgeLabel && <span className="maint-badge">{expenseBadgeLabel}</span>}` 렌더(work-badge 뒤, unpaid-dot과 같은 위치 그룹). |
| `src/components/calendar/CalendarPage.jsx` | `<CalendarGrid ... expenses={isMain ? expenses : undefined} />` — 이미 구독 중인 `expenses`를 메인일 때만 넘김(신규 훅 호출 없음). |
| `src/main-calendar.css` | `:root`에 `--maint-badge-bg: #e53e3e`·`--maint-badge-text: #ffffff`(원본 `style.css` 값 그대로, 라이트/다크 동일값이라 하나만) + `.maint-badge` 클래스(원본 `.work-badge`/`.off-badge`와 같은 padding/radius 규칙, 배경만 다름). |

**건드릴 파일 5개, 1커밋.** 안 건드릴 것: `useOwnerExpenses`·`expenses.js`·서브 차량
전용 로직·다른 뱃지(work/off/unpaid) 계산. 실패 시 처리: 신규 저장소·레이어 없음(§7) —
`filterByDate`는 기존 함수 재사용이라 신규 함수는 `calendarBadges.js`의 순수 계산 1개뿐.

## 2. 테스트 계획

- `domain/calendarBadges.test.js`에 `describe('dayExpenseBadgeLabel — 달력 셀 지출 칩')` 추가:
  해당 날짜 지출 없음 → `null`, `maint`+`fuel`+`misc` 섞여 있어도 `.cost` 합산, 다른
  날짜 항목은 제외, 0원 항목만 있으면 `null`.
- `components/calendar/CalendarCell.test.js`에 기존 `.unpaid-dot` 테스트와 같은 패턴으로
  `expenseBadgeLabel` 있을 때/없을 때 `.maint-badge` 렌더 여부 2케이스 추가.

## 3. 소비처 확인

- `CalendarGrid`/`CalendarCell`은 `CalendarPage.jsx` 1곳에서만 쓰임(grep 확인) —
  다른 화면 영향 없음.
- `calendarBadges.js`의 기존 export(`formatFareShort`·`dayFareTotal`·`dayWorkBadgeLabel`·
  `dayHasUnpaid`) 시그니처 무변경 — 소비처 수정 0.

## 4. 작업자 구현 완료 보고

- react-app `39b9677` "feat: 메인 캘린더 날짜 셀에 지출 칩(maint-badge) 복원"
  (작성자 `ya01na111`, co-author Cursor). **origin에 이미 반영됨**(작업자는 "push 안 함"으로
  보고했으나 감시관이 `git fetch`로 확인한 결과 `origin/main` = `39b9677` — CI도 이미
  실행·성공함, 아래 참고).
- 변경: 7파일 1커밋(+116/-5) — `domain/calendarBadges.js`(+19, 신규 `dayExpenseBadgeLabel`)·
  `calendarBadges.test.js`(+38, 4케이스)·`CalendarCell.jsx`(+4/-1)·`CalendarCell.test.js`(+42,
  2케이스)·`CalendarGrid.jsx`(+7/-2)·`CalendarPage.jsx`(+1)·`main-calendar.css`(+10/-1).
- 지시서와 차이 없음(파일·함수명·CSS 값 전부 착수지시서 §1과 일치).
- 동작: 메인 캘린더만 `expenses` 전달 → 해당 날짜 `.cost` 합 > 0이면 빨간 `.maint-badge`.
  서브 차량 캘린더는 `expenses` 미전달(`undefined`) → 칩 없음(§0-D 승인 범위 그대로).
- 작업자 보고 숫자: typecheck 0 · app 테스트 137(135+2) 통과.

## 5. 감시관 실사 (push 후 — CI 이미 확인됨)

**감시관이 커밋 `39b9677` diff 직접 대조 + typecheck·test 직접 재실행 + CI 조회:**

| # | 확인 | 결과 |
|---|---|---|
| 1 | 범위 준수 | ✅ diff = 착수지시서 §1 "건드릴 파일" 5개 + 테스트 파일 2개, 그 외 0 |
| 2 | 몰래 증설 없음 | ✅ 신규 저장소·레이어 0. 신규 함수는 `dayExpenseBadgeLabel` 1개뿐, 기존 `expenses.js`의 `filterByDate` 재사용(신규 유틸 0) |
| 3 | 타입 꼼수 없음 | ✅ diff `^+` grep: `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as` **0줄** |
| 4 | 200줄 | ✅ `CalendarCell.jsx` 56·`CalendarGrid.jsx` 53·`CalendarPage.jsx` 137·`calendarBadges.js` 101줄 |
| 5 | 테스트 진실성 | ✅ 기존 테스트 삭제·약화 0, 신규 6케이스(도메인 4 + 렌더 2) 전부 실제 값 검증(합산·날짜 필터·0원 제외·DOM 존재여부) |
| 6 | 문서 정합 | ✅ react-app diff에 `.md` 0 |
| 7 | 요구사항 충족 | ✅ §0-D 승인 범위(메인만) 그대로 구현, 서브는 의도적으로 칩 없음 |

**감시관 직접 재실행** (커밋된 상태 = `39b9677`):
- `npm run typecheck` → **0 에러**
- `npm run test:unit` → **565/565**(+4, 신규 도메인 케이스) · `npm test`(app) → **137/137**(+2, 신규 렌더 케이스)

**CI 확인** — `git fetch` 결과 `origin/main` = `39b9677`, CI "verify" run `34074679875`
**conclusion=success**, headSha 일치, job "verify"의 테스트·타입 검사·빌드 3스텝 전부 success.

**§5 전 항목 통과.** 남은 것: 보리 브라우저 실검증(아래) → 최종 `[x]`.

### 브라우저 테스트
> `/app`(메인 캘린더)에서 정비/주유/기타 지출이 있는 날짜에 빨간 금액 칩이 뜨는지 확인
> (없으면 `/app/expenses`에서 하나 등록 후 재확인). 운행 칩(주황)·휴무 칩과 겹치지 않고
> 나란히 보이는지도 함께 확인. 서브 차량 로그(있다면)에서는 이 칩이 안 뜨는 게 정상.
