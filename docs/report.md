# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(아코디언 인라인 시트 애니메이션 1~6차 `[x]`, 부가세
> 레이블 크기 `[x]`, 거래처 스코프 종결 `[x]`) 상세는
> `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`로 옮김(동결).
> F-1(`[x]`, react-app `8ced672`) 상세는
> `docs/archive/f1-vat-label-font-weight-2026-09-14.md`로 옮김(동결).
> F-2(`[x]`, react-app `ed83703`) 상세는
> `docs/archive/f2-autofill-dark-mode-2026-09-14.md`로 옮김(동결).
> D-0(`[x]`, react-app `e65b2c0`) 상세는
> `docs/archive/d0-temporal-input-component-2026-09-14.md`로 옮김(동결).
> D-1(`[x]`, react-app `b14fcd8`, 이후 `93a4f2c`에서 `centered` 공용
> modifier로 리팩터·재검증 필요 없음: computed style 동일) 상세는
> `docs/archive/d1-call-detail-form-temporal-2026-09-14.md`로 옮김(동결).
> D-2(`[x]`, react-app `c395ab3`) 상세는
> `docs/archive/d2-driver-tax-invoice-temporal-2026-09-14.md`로 옮김(동결).
> D-3(`[x]`, react-app `93a4f2c`) 상세는
> `docs/archive/d3-expense-form-temporal-2026-09-14.md`로 옮김(동결).
> **D(시간입력 위젯) 전체 완료.**

---

## E-1. 정비/주유/기타 공용 스타일(그리드/아이콘/분류칩/결제방식)

**보리가 화면 5장 스크린샷으로 직접 지시(2026-09-14)** — "정비창만
바꾸면 되는 게 아니라 정비/주유/기타 공통으로 쓰는 스타일"이라고 명시.
`ExpenseFormModal.jsx`는 이미 세 종류가 공유하는 컴포넌트라 손댄 곳은
한 파일뿐.

### 지시 내용 4가지

1. 날짜·누적거리를 5:5 그리드로.
2. 날짜 트리거 옆 캘린더 아이콘 삭제.
3. 분류 칩을 사각 라운드(사진4→사진5)로.
4. 결제방식 카드/현금을 세그먼트 컨트롤(사진3)로.

### 조사 결과 (원본 확인)

- **그리드**: 원본 `index.html:1846-1856` `#maintRecordModal`이
  `style="display:flex;gap:10px"` + 자식 `flex:1` 2개로 날짜/누적거리
  배치. react-app엔 이미 같은 용도의 `.personal-inline-fields`(grid
  1fr 1fr, `DriverFormModal.jsx`도 씀)가 있어 재사용 — 새 클래스 안 만듦.
  기존엔 fuel만 주유량+누적거리로 그리드였고 날짜는 단독이라 종류마다
  달랐던 것도 통일. 누적거리 필드가 kind별로 중복 렌더되던 것도 하나로 합침.
- **아이콘 삭제**: 지시대로 `.app-temporal-icon { display: none }`,
  이 화면 스코프(`.expense-form-content`)만 — 콜상세 등 다른 화면은
  원본도 아이콘을 그대로 두므로 안 건드림.
- **분류 칩**: 원본 `.pill-btn`은 전역 `border-radius:20px`이지만
  `.modal-content` 안에서는 `border-radius:12px`로 오버라이드됨
  (`style.css:5672-5679`) — react-app `.pill-btn`은 전역이 `999px`(완전
  펼)이라 이 오버라이드가 없어서 달랐다. 비활성 칩 글자색도 원본은
  `var(--sub-text-color)`(`style.css:6722-6726`)로 옅은데 react-app은
  기본 `--text-color`였음. 둘 다 이 화면 스코프로 포팅.
- **결제방식**: 원본은 `.toggle-btn`/`.settings-segmented-control`이
  아니라 **전용 클래스 `.segment-control`/`.segment-btn`**(고정폭
  140px, `overflow:hidden`으로 알약이 아니라 사각 통짜, `style.css:
  4602-4619`) + `label`-왼쪽/컨트롤-오른쪽 한 줄 배치
  (`index.html:1884-1890`). react-app이 그동안 설정 페이지 클래스를
  잘못 재사용하고 있던 것 — 원본 클래스명 그대로 신규 도입(react-app에
  기존 사용처 0곳 확인, 충돌 없음).

### 건드린 파일

- `react-app/src/components/ExpenseFormModal.jsx` — 날짜+누적거리
  그리드 이동(kind 공통 위치로), 결제방식 마크업을 `segment-control`/
  `segment-btn`로 교체, 최상위에 `expense-form-content` 스코프 클래스 추가.
- `react-app/src/components/expense-form.css`(신규) — 위 4가지 스코프
  CSS + `.segment-control`/`.segment-btn` 베이스.
- `react-app/src/components/ExpenseFormModal.test.js`(신규) — 그리드
  구조, 아이콘 엘리먼트 존재(숨김은 CSS), 세그먼트 컨트롤 2개·기본
  선택("카드"), 주유엔 결제방식 없음 — 4개 테스트.

### §6 200줄

`ExpenseFormModal.jsx` 172줄(오히려 184→172, 중복 필드 제거 덕),
`expense-form.css` 56줄 — 문제 없음.

### §8 4대 질문

1~5 무관 — 마크업 재배치 + CSS, `draft`/`onChange` 로직 무변경.

### 검증 (2026-09-14)

- `npm test`(unit 628 + app 163, 신규 4개 포함 전부 통과).
- `npm run typecheck`(0 에러) · `npm run lint`(경고 없음) ·
  `npm run build`(성공).
- **AI 브라우저 실기동 확인**(이번엔 로컬 dev 서버가 정상 열림):
  일일운행 인라인(`lockDate`로 트리거 `disabled` — 의도대로 날짜 잠김
  확인)과 정비/주유/기타 관리 화면(모달, 잠김 없음) 둘 다 확인. 그리드
  배치, 아이콘 삭제, 분류 칩 사각 라운드, 결제방식 세그먼트 토글(카드
  ↔현금 클릭 정상) 전부 스크린샷과 일치.

react-app 로컬 커밋 `9e6f93d`. **AI는 push 안 함.**

### 참고 — E 착수 전 P0는 아직 미해결

STATUS.md에 적힌 `useExpenseForm.js`의 `setTimeout(420)` vs
`day-log.css` 전환 시간 문제(`docs/sot.md` §4-11)는 이번 작업이
안 건드린 부분(순수 마크업/CSS만) — E가 인라인 시트 열림/닫힘 로직
자체를 만질 차례가 오면 그때 결정 필요.

push 후 확인 부탁드립니다. "지금 3개는 목록 미완성"이라던 E의 나머지
항목이 더 있으면 알려주세요.
