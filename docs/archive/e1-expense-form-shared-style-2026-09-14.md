# E-1. 정비/주유/기타 공용 스타일(그리드/아이콘/분류칩/결제방식) (2026-09-14, 동결)

`docs/report.md`에서 옮김. CI 초록·보리 브라우저 실검증 완료.

---

## 배경

보리가 화면 5장 스크린샷으로 직접 지시 — "정비창만 바꾸면 되는 게
아니라 정비/주유/기타 공통으로 쓰는 스타일"이라고 명시.
`ExpenseFormModal.jsx`는 이미 세 종류가 공유하는 컴포넌트라 손댄 곳은
한 파일뿐.

## 지시 내용 4가지

1. 날짜·누적거리를 5:5 그리드로.
2. 날짜 트리거 옆 캘린더 아이콘 삭제.
3. 분류 칩을 사각 라운드로.
4. 결제방식 카드/현금을 세그먼트 컨트롤로.

## 조사 결과 (원본 확인)

- **그리드**: 원본 `index.html:1846-1856` `#maintRecordModal`이
  `style="display:flex;gap:10px"` + 자식 `flex:1` 2개로 날짜/누적거리
  배치. react-app엔 이미 같은 용도의 `.personal-inline-fields`(grid
  1fr 1fr, `DriverFormModal.jsx`도 씀)가 있어 재사용. 기존엔 fuel만
  주유량+누적거리로 그리드였고 날짜는 단독이라 종류마다 달랐던 것도
  통일. 누적거리 필드가 kind별로 중복 렌더되던 것도 하나로 합침.
- **아이콘 삭제**: `.app-temporal-icon { display: none }`,
  `.expense-form-content` 스코프만.
- **분류 칩**: 원본 `.pill-btn`은 전역 `border-radius:20px`이지만
  `.modal-content` 안에서는 `border-radius:12px`로 오버라이드됨
  (`style.css:5672-5679`) — react-app `.pill-btn`은 전역이 `999px`
  (완전 펼)이라 이 오버라이드가 없어서 달랐다. 비활성 칩 글자색도
  원본은 `var(--sub-text-color)`(`style.css:6722-6726`)로 옅은데
  react-app은 기본 `--text-color`였음. 둘 다 이 화면 스코프로 포팅.
- **결제방식**: 원본은 전용 클래스 `.segment-control`/`.segment-btn`
  (고정폭 140px, `overflow:hidden`으로 알약이 아니라 사각 통짜,
  `style.css:4602-4619`) + label-좌/컨트롤-우 한 줄 배치
  (`index.html:1884-1890`). react-app이 그동안 설정 페이지 클래스
  (`.toggle-btn`/`.settings-segmented-control`)를 잘못 재사용하고
  있던 것 — 원본 클래스명 그대로 신규 도입.

## 건드린 파일

- `ExpenseFormModal.jsx` — 날짜+누적거리 그리드 이동(kind 공통),
  결제방식 마크업을 `segment-control`/`segment-btn`로 교체,
  `expense-form-content` 스코프 클래스 추가.
- `expense-form.css`(신규) — 위 4가지 스코프 CSS.
- `ExpenseFormModal.test.js`(신규) — 그리드/아이콘/세그먼트 렌더
  검증 4개.

## 검증

- `npm test`(unit 628 + app 163, 신규 4개 포함 전부 통과).
- `npm run typecheck`(0 에러) · `npm run lint`(경고 없음) ·
  `npm run build`(성공).
- AI 브라우저 실기동 확인: 일일운행 인라인(`lockDate`로 트리거
  `disabled` 정상)과 정비/주유/기타 관리 화면(모달) 둘 다 확인.
- 보리 브라우저 실검증 완료 → `[x]` 확정.

## 결과

react-app 커밋 `9e6f93d`(F-3 `83de8e9`에 포함돼 함께 push), `main`에
push 완료, origin과 동기화.
