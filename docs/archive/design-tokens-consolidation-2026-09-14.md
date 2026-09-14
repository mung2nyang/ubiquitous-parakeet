# 디자인 토큰(CSS 변수) 1곳 통합 (2026-09-14, 동결)

`docs/report.md`에서 옮김. CI 초록·AI 재검증·보리 브라우저 실검증 완료.

---

## 배경

`react-app/src/`를 `styles/`·`components/ui/`·`features/` 3계층으로
재개편하는 안을 검토했으나 기존 도메인별 `components/` 경계를 흔드는
전면 개편이라 위험 판단, 보류. 대신 위험이 낮은 **디자인 토큰(CSS
변수) 한 곳 통합만** 먼저 진행.

## 문제

- `:root` 변수 정의가 `account-flow.css`·`app-shell-base.css`·
  `side-menu.css` 3개 파일에 흩어져 있었음(총 28개).
- **`--shadow-sm` 충돌**: 두 파일에 다른 값으로 정의돼 specificity
  때문에 한쪽(`account-flow.css`의 `0 1px 2px …06`)이 이미 죽은 값.

## 구현

1. `variables.css`(신규) — 라이트 `:root` + 다크 `[data-theme="dark"]`.
2. `account-flow.css`·`app-shell-base.css`·`side-menu.css` — 전역 토큰
   블록 삭제(`account-flow.css`의 `body.account-flow-active` 스코프
   오버라이드는 유지).
3. `app/App.jsx` — `import '../variables.css'`를 다른 CSS보다 먼저 추가.

`--shadow-sm`은 `app-shell-base.css` 승자 값(`0 2px 4px rgba(0,0,0,.04)`)
만 채택.

## AI 재검증(2026-09-14, 보리 요청)

diff 직접 재검토 + 로컬 전체 실행 — `npm test`(791개)/`typecheck`/
`lint`/`build` 전부 통과. grep으로 `:root`/`[data-theme="dark"]` 토큰
블록이 `variables.css`에만 있는 것 재확인. 라이트/다크 변수 프로그램적
diff(Node 스크립트)로 대칭성 확인:
- 라이트에만 있고 다크 오버라이드 없는 것: `--fs-floor`~`--fs-7`
  (폰트 크기 — 테마 무관이라 의도적으로 공용, 문제 아님).
- 다크에만 있고 라이트 값 없는 것: `--icon-color`(grep 확인 결과
  사용처 0곳, 죽은 변수 — 화면에 영향 없음, 별도 정리 후보로만 기록).

**부작용 1건(결함 아님)**: `--fs-7`이 원래 라이트 전용 블록에만 있어
다크에서 미정의(사용처 4곳이 다크에서 상속값으로 대체)였는데, 공용
`:root`로 옮겨지며 다크에도 값이 생김 — 다른 `--fs-*`는 이미 전부
공용이라 일관성 쪽으로 맞춰진 것. **보리 확인(2026-09-14): "라이트
전용만 있는 건 다크모드도 적용해야 한다, 앱 통일을 위해서"** — 방향이
맞다고 확정. 재확인 결과 이 건 외 다른 라이트 전용 누락은 없음.

## 검증

- `npm test`(791개 전부 통과) · `npm run typecheck`(0 에러) ·
  `npm run lint`(경고 없음) · `npm run build`(성공).
- GitHub Actions `CI`/`Deploy GitHub Pages` 초록
  ([run 34824600513](https://github.com/ya01na111/react-app/actions/runs/34824600513)).
- 보리 브라우저 실검증(캘린더 홈·사이드메뉴·일일운행, 라이트/다크)
  완료, 문제없음 → `[x]` 확정.

## 결과

react-app 커밋 `ef82306`, `main`에 push 완료, origin과 동기화.

## 후속(비긴급)

- `--icon-color` 사용처 0곳 — 죽은 CSS 변수. 필요 시 별도 정리.
- 하드코딩 색상 중복(`#fff`/`#ffffff` 32회, `#cccccc` 8회 등)은 이번
  슬라이스에서 안 건드림 — 다음 슬라이스 후보.
