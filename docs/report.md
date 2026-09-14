# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(아코디언 인라인 시트 애니메이션 1~6차 `[x]`, 부가세
> 레이블 크기 `[x]`, 거래처 스코프 종결 `[x]`) 상세는
> `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`로 옮김(동결).
> F-1(`[x]`, react-app `8ced672`) 상세는
> `docs/archive/f1-vat-label-font-weight-2026-09-14.md`로 옮김(동결).
> F-2(`[x]`, react-app `ed83703`) 상세는
> `docs/archive/f2-autofill-dark-mode-2026-09-14.md`로 옮김(동결).
> D-0~D-3(`[x]` 전체, react-app `e65b2c0`/`b14fcd8`/`c395ab3`/`93a4f2c`)
> 상세는 `docs/archive/d0-`~`d3-` 동일 접두 파일로 옮김(동결).
> E-1(`[x]`, react-app `9e6f93d`) 상세는
> `docs/archive/e1-expense-form-shared-style-2026-09-14.md`로 옮김(동결).
> F-3(`[x]`, react-app `83de8e9`) 상세는
> `docs/archive/f3-call-detail-icons-star-2026-09-14.md`로 옮김(동결).

---

## 진행 중 — 디자인 토큰(CSS 변수) 1곳으로 통합 `[~]` (보리 지시, 2026-09-14)

**배경**: `react-app/src/` 최상위에 `styles/`·`components/ui/`·`features/` 3계층
구조 도입을 검토했으나 기존 도메인별 `components/` 경계를 흔드는 전면
재개편이라 위험 판단, 보류. 대신 위험이 낮은 **디자인 토큰(CSS 변수)
한 곳 통합만** 먼저 진행하기로 함.

**현재 문제(조사 완료)**:
- `:root` 변수 정의가 `account-flow.css`·`app-shell-base.css`·`side-menu.css`
  3개 파일에 흩어져 있음(총 28개, App.jsx가 이 순서로 import).
- 하드코딩 색상 중복: `#fff`/`#ffffff` 32회, `#cccccc` 8회 등 — 이번
  슬라이스에서는 안 건드림(다음 슬라이스 후보로 남겨둠).
- **`--shadow-sm` 충돌**: `account-flow.css`의 죽은 값 버리고
  `app-shell-base.css` 승자(`0 2px 4px rgba(0,0,0,.04)`)만 채택.

**건드릴 파일(5개)** — 구현 완료:
1. `react-app/src/variables.css` (신규) — 라이트 `:root` + 다크
   `[data-theme="dark"]`.
2. `account-flow.css` — 전역 토큰 블록 삭제(`body.account-flow-active`
   스코프 오버라이드는 유지).
3. `app-shell-base.css` — `:root:not([data-theme="dark"])` 블록 삭제.
4. `side-menu.css` — `:root:not([data-theme="dark"])` 블록 삭제.
5. `app/App.jsx` — `import '../variables.css'`를 기존 CSS보다 먼저 추가.

**안 건드린 것**: 하드코딩 hex 치환, 다크모드 누락 보완(의도적),
폴더 재개편, 인쇄용 `!important` 토큰 오버라이드(`side-menu.css`).

### 구현 (2026-09-14)

- react-app `ef82306`. **push 완료·CI 초록 확인.**

### AI 재검증 (2026-09-14, 보리 요청)

diff 직접 재검토 + 로컬 전체 실행:
- `npm test`(unit 628 + app 163, 791개 전부 통과) · `npm run typecheck`
  (0 에러) · `npm run lint`(경고 없음) · `npm run build`(성공).
- grep: `:root` / `[data-theme="dark"] {` 토큰 블록은 `variables.css`만
  (재확인).
- 값 대조: `--shadow-sm` 라이트(`app-shell-base` 승자 `0 2px 4px …04`)·
  다크(`account-flow` `…0.4`), `--icon-color`(다크 전용, 라이트 없음)
  등 전부 원본 그대로 이동 확인.
- **부작용 1건 발견(결함 아님)**: `--fs-7`이 원래 `:root:not([data-theme=
  "dark"])`(라이트 전용)에만 있어 다크에서는 미정의(참조하는 4곳
  — `shared-controls.css` 2곳, `side-menu.css` 2곳 — 다크에서
  상속값으로 대체되던 상태)였는데, 이번에 공용 `:root`로 옮겨지며
  다크에도 값이 생김. 다른 `--fs-*` 전부 이미 공용이라 이 변수만
  예외였던 것 — 일관성 쪽으로 맞춰진 부수효과로 판단(값 자체 변경은
  아니라 지시서 "값 이동만" 범위 내로 봄).
- AI 브라우저 프리뷰는 이 세션에서 계속 안 열려 육안 스크린샷 대조는
  못 함 — **보리 스크린샷 대조 필요**(아래 검증 방법 그대로).

### 검증 방법

- CI(test·typecheck·build) — 통과 확인됨.
- 보리: 캘린더 홈·사이드메뉴·일일운행(라이트/다크) 스크린샷 대조.
  `--shadow-sm` 사용처(카드·드롭다운 그림자) 육안 동일 여부.

### §5 리뷰

| # | 결과 |
|---|---|
| 1 범위 | 지시서 5파일과 일치 |
| 2 몰래 증설 | `variables.css`만 신규(토큰 이동), 저장소/큐 없음 |
| 3 타입 꼼수 | CSS·import만 |
| 4 200줄 | `variables.css` 58줄, 기존 파일은 줄 수 감소 |
| 5 테스트 | 기존 테스트 변경 없음, 791개 통과 |
| 7 요구사항 | 값 이동 + `--shadow-sm` 승자만 채택, `--fs-7` 부작용 위 기록 |
