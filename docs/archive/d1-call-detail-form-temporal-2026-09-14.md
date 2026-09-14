# D-1. 콜상세 폼 TemporalInput 연결 (2026-09-14, 동결)

`docs/report.md`에서 옮김. CI 초록·보리 브라우저 실검증 완료.

---

## 목표

`CallDetailForm.jsx`의 출발/도착 시간·입금예정일 3개 네이티브
date/time input을 D-0의 `TemporalInput`으로 교체.

## 구현

- `CallDetailForm.jsx` — 3줄 교체(태그명 + `className="input-box"`
  제거만, `value`/`onChange`는 기존 `draft` state 그대로 연결).
- `call-detail-form.css` — 원본 `style.css:6621-6660`(트리거 가운데
  정렬 + 아이콘 우측 고정)을 `.work-log-page` 스코프로 포팅, 35줄 추가.

**메뉴 스코프 CSS는 포팅 안 함**: D-0의 메뉴는 `document.body`에
포털되므로 `.work-log-page`의 자손이 아니다. 원본의
`#callDetailModal .app-temporal-menu` 류 선택자도 같은 DOM 구조적
이유로 조상 선택자로는 절대 안 걸려, 원본에서도 사실상 죽은 CSS였던
것으로 판단(사용자가 실제로 본 적 없는 규칙이라 동작에 차이 없음).

## 검증

- `npm test`(unit 628 + app 159, D-0 테스트도 회귀 없이 통과).
- `npm run typecheck` 0 에러 · `npm run lint` 경고 없음 · `npm run build` 성공.
- GitHub Actions `CI`/`Deploy GitHub Pages` 초록
  ([run 34816401384](https://github.com/ya01na111/react-app/actions/runs/34816401384)).
- 보리 브라우저 실검증(다크모드 포함) 완료 → `[x]` 확정.

## 결과

react-app 커밋 `b14fcd8`, `main`에 push 완료, origin과 동기화.

## 후속 (2026-09-14, D-3 작업 중 발견)

D-3(정비/주유/기타)의 원본 스코프 CSS가 이 화면 것과 핵심 5개 선언이
동일해, "중복 3개 이상은 공용 컴포넌트화"(보리 지시) 원칙에 따라
`TemporalInput`에 `centered` prop을 추가하고 공용 `.is-centered`
modifier로 옮김(`temporal-input.css`). 이 화면 CSS는 화면 전용
디테일(말줄임표·gap·아이콘 색·열림 모서리)만 남기고 291→280줄로
축소. **computed style은 리팩터 전과 100% 동일**(순수 소스 정리) —
react-app `93a4f2c`. 상세는 `docs/archive/d3-expense-form-temporal-2026-09-14.md`
(작성 예정) 참고.
