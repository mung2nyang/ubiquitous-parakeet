# 전역 드롭다운 슬라이스 2 — 개별 select 5곳 → `AppDropdown` 공용화 `[x]` 완료 (2026-09-15)

react-app 최종 커밋: `88ba0fb`(공용화) + `4e3aeea`(회귀 수정).
CI 초록(`gh run list` 재확인), 보리 승인 완료.

보리 결정(2026-09-15): A안 — 범용 이름으로 일반화. 착수 승인 후 구현.

## 구현 (`88ba0fb`)

1. `shared/AppDropdown.jsx` + `app-dropdown.css` — `CalendarDateSelect` 로직·범용 CSS 이동, `className` prop 추가.
2. `CalendarDateSelect` → `AppDropdown className="app-date-dropdown"` 얇은 래퍼(24줄). CSS는 `.date-select-group` min-width 2줄만 잔존.
3. 개별 select 5곳 → `AppDropdown` 1:1 교체. `BillingSettingsPage.handleChange`는 문자열 인자로 변경(파일 내부만).
4. `CustomerCenterPage.test.js` — `select` → `.app-dropdown-trigger` 검사로 교체(의도 동일).

| 파일 | 줄 수(후) |
|---|---|
| `AppDropdown.jsx` | 128 |
| `app-dropdown.css` | 89 |
| `CalendarDateSelect.jsx` | 24 |
| `calendar-date-select.css` | 2 |
| `CustomerCenterPage.jsx` | 228 (기존 초과 승계) |
| `ClientFormModal.jsx` | 94 |
| `BillingSettingsPage.jsx` | 73 |
| `ReportDetailView.jsx` | 141 |
| `OwnerRevenueView.jsx` | 169 |

로컬 `npm test`(163 pass)·`npm run typecheck` 통과.
슬라이스 1 사용처(`CalendarHeader`+연/월 5파일)는 API 무변경으로 손대지 않음.

### §5 리뷰

| # | 결과 |
|---|---|
| 1 범위 | 지시서 10파일(신규 2·래퍼 2·사용처 5·테스트 1)만 |
| 2 몰래 증설 | 없음(로직 이동+마크업 치환) |
| 3 타입 꼼수 | 없음 |
| 4 200줄 | CustomerCenter 228 — 기존 초과 승계. AppDropdown 128 ≤200 |
| 5 테스트 | 163 통과, CustomerCenter 검사 대상만 DOM에 맞게 교체(약화 아님) |
| 7 요구사항 | 5곳 교체+공용화 완료 |

## 회귀 발견·수정 (`4e3aeea`)

브라우저 실검증 중 발견: `AppDropdown`으로 교체된 5곳이 기존
`<select className="input-box">`(테두리·배경·`width:100%`·
`min-height:44px`)를 잃고, 캘린더 연/월용 "테두리 없는 미니멀" 기본
스타일을 그대로 물려받음. `docs/plan.md`의 "완벽한 이관" 원칙 위반이라
코드부터 고치지 않고 착수지시서를 먼저 남긴 뒤 진행([[kickoff-approval-before-code-edit]]).

`app-dropdown.css`에 `.app-dropdown-boxed` 추가(`.input-box`와 동일
테두리·배경·폭·높이·포커스). 폼 사용처 5곳(`ClientFormModal.jsx`·
`BillingSettingsPage.jsx`·`CustomerCenterPage.jsx`·
`ReportDetailView.jsx`·`OwnerRevenueView.jsx`)에
`className="app-dropdown-boxed"` 부여. `AppDropdown.jsx`·
`CalendarDateSelect` 무변경. `CalendarDateSelect`(연/월,
`className="app-date-dropdown"`) 5개 사용처는 원래 테두리 없는
디자인이 맞으므로 대상 아님. 로컬 test 163·typecheck 통과.

| 파일 | 줄 수(후) |
|---|---|
| `app-dropdown.css` | 약 100~105 |
| `ClientFormModal.jsx` | 95 |
| `BillingSettingsPage.jsx` | 74 |
| `CustomerCenterPage.jsx` | 229 (기존 초과 승계) |
| `ReportDetailView.jsx` | 142 |
| `OwnerRevenueView.jsx` | 170 |

**CI**: `gh run list --branch main`으로 `88ba0fb`·`4e3aeea` 두 커밋 모두
"CI"·"Deploy GitHub Pages" 워크플로우 success 확인(2026-09-15).

**최종 승인(2026-09-15): 보리 승인 완료, `[x]` 확정.**
