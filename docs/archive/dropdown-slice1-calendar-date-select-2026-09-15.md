# 전역 드롭다운 슬라이스 1 — 연/월 select → `CalendarDateSelect` 재사용 `[x]` 완료 (2026-09-15)

react-app 최종 커밋: `9df06e2`. CI 초록(`gh run list` 재확인), 보리
브라우저 실검증·최종 승인 완료.

보리 지시(2026-09-14): 전역 드롭다운(`<select>`) 다크모드·스타일 통일.
착수지시서는 이 세션이 작성, 실제 구현은 다른 AI(Cursor)가 진행 —
이 세션이 §5 리뷰로 검수.

## 구현 (`9df06e2`)

5파일의 연/월 native `<select className="date-select">`를
`CalendarHeader.jsx`와 동일 형태로 `CalendarDateSelect` 재사용
교체. `CalendarDateSelect.jsx`/`calendar-date-select.css` 무변경.
개별 select 5곳(슬라이스 2 대상)·`.date-select` CSS 제거는 이번엔
안 함.

| 파일 | 줄 수(후) |
|---|---|
| `MaintFuelPage.jsx` | 213 (기존 206 초과 승계) |
| `SettlementSummaryCard.jsx` | 57 |
| `ReportPage.jsx` | 244 (기존 237 초과 승계) |
| `RevenueNav.jsx` | 45 (`!yearly` 월 select 조건 유지) |
| `TaxInvoiceToolbar.jsx` | 61 |

로컬 `npm test`(163 pass)·`npm run typecheck` 통과.
`className="date-select"` grep 0건(연/월 네이티브 select 잔존 없음).

## §5 리뷰 (이 세션이 독립 검수, 2026-09-15)

| # | 결과 |
|---|---|
| 1 범위 | `git show --stat 9df06e2`로 직접 확인 — 지시서의 5파일만, 다른 파일 무변경 |
| 2 몰래 증설 | 없음 — 신규 파일·저장 키·큐 없음 |
| 3 타입 꼼수 | 없음 — `diff`에 `any`/`@ts-ignore` 없음 |
| 4 200줄 | `wc -l` 직접 재확인, 표와 일치. MaintFuel 213·Report 244는 기존 초과(206/237)를 그대로 승계한 것 — 이번 슬라이스가 새로 만든 위반 아님 |
| 5 테스트 | 5개 파일 관련 테스트 중 `<select>` DOM을 직접 검사하는 코드 없음(grep 확인) — 마크업 변경으로 약해진 테스트 없음 |
| 6 CSS 블라스트 반경 | 이번 커밋 CSS 변경 없음(`CalendarHeader.jsx`가 이미 쓰던 `.date-select-group`/`app-date-dropdown` 그대로 재사용). `RevenueNav` 연도별 모드처럼 드롭다운 1개만 남을 때 `:last-child` 규칙(`min-width:50px`)이 적용되지만, `min-width`는 하한선이라 텍스트 잘림 없음(CSS 직접 확인) |
| 7 요구사항 | 연/월 10곳 전부 교체 완료, `.date-select` grep 0건으로 확인 |

**CI**: `gh run list --branch main`으로 커밋 `9df06e2`의 "CI" 워크플로우
success 직접 재확인(2026-09-15).

**최종 승인(2026-09-15): 보리 브라우저 실검증 + `[x]` 확정.**
