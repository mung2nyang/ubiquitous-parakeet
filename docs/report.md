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
> 디자인 토큰 통합(`[x]`, react-app `ef82306`) 상세는
> `docs/archive/design-tokens-consolidation-2026-09-14.md`로 옮김(동결).

---

## §2-1-A. 차량 카드 라벨칩/정산정보 복원 — 구현 완료 `[~]`

**보리가 화면 스크린샷 + 설명으로 직접 지시(2026-09-14).** §2(차량
관리) 첫 슬라이스. **이번엔 A만 진행 — B(수정/삭제 아이콘 공용화)는
A `[x]` 확정 후 별도 착수지시서로 분리**(이전 세션에서 A·B를 한
커밋에 묶어 진행한 순서 위반 재발 방지, 보리 2026-09-14 지적).

### 지시 내용 (A만)

- 카드의 전화번호(`driverName`·`driverPhone`) 표시 삭제. 기존
  `[기사: 이름]` 브래킷 텍스트는 원본과 동일하게 유지(대상 아님).
- `driverLinkEnabled`/`logEnabled`를 "기사연동"/"운행일지" 칩으로 표시.
- 수수료(`commEnabled`/`commission`/`commType`) 표시 복원, 월급
  (`driverPayMode === 'salary'`) 표시 신규 추가 — 둘 다
  `formatCurrencyInput`으로 천단위 콤마 처리.

### 조사 결과 (원본 재확인 — 이전 세션 조사 오류 정정, 보리 지적
2026-09-14)

- **정정**: 이전 세션 착수지시서는 "원본은 브래킷 텍스트뿐, 칩화는
  신규 개선"이라 적었는데 **틀렸음**. `car-management.js:66` 원본
  코드를 다시 보면 "기사연동"/"운행일지"는 원본에서도 이미
  `<span class="management-badge log-enabled">`로 **칩**이었다 —
  원본 매칭이 맞다.
  ```js
  ${car.type==='sub' && car.driverLinkEnabled ? '<span class="management-badge log-enabled">기사연동</span>' : ''}
  ${car.type==='sub' && car.logEnabled ? '<span class="management-badge log-enabled">운행일지</span>' : ''}
  ```
- **재사용할 CSS는 `.management-badge.commission`이 아니라
  `.management-badge.log-enabled`**(`style.css:3793`,
  `background: var(--today-bg); color: var(--sub-text-color);`).
  `.commission`(금색 pill, `style.css:3777`)은 원본에서 실제로는
  `settlementBadge`(회사정산/기사직접정산/직원기사 라벨,
  `car-management.js:60`) 전용이었음 — 이 개념은
  [[react-app-driver-settlement-mode-taxonomy]] 메모리로 이미 금지된
  "AI가 지어낸 가짜 개념"이라 손대면 안 됨. `.commission` 재사용은
  잘못된 클래스를 갖다 붙일 뻔한 것 — 반드시 `.log-enabled`로 신규
  추가.
  `--today-bg`는 `react-app/src/variables.css`에 라이트/다크 둘 다
  이미 정의돼 있어(23/43줄) 새로 만들 필요 없음.
- 수수료·월급 필드는 `react-app/src/domain/financeTypes.js`에 이미
  있음(`CarFormModal.jsx`가 입력은 받는데 `CarListItem.jsx`가 표시를
  안 하던 상태) — 새 필드 추가 없이 기존 데이터 노출만.

### 건드릴 파일 (A 범위만)

- `react-app/src/components/cars/CarListItem.jsx` — 전화번호 제거,
  칩+수수료+월급 표시.
- `react-app/src/side-menu.css` — `.management-badge.log-enabled` 신규
  (원본 값 이식, `.commission`은 건드리지 않음).

### §6 200줄

`CarListItem.jsx` 여유(현재 33줄 + 추가분).

### §8 4대 질문

1~5 무관 — 마크업/CSS + 기존 필드 노출뿐, 구독/값 출처/쓰기창구/
hydrate/DB 전부 무변경.

### 구현 (2026-09-14, react-app `8641be3`)

- `CarListItem.jsx` — 전화번호 제거, `[기사: 이름]` 유지, "기사연동"/
  "운행일지" 칩(`management-badge log-enabled`), 수수료/월급 표시(
  `formatCurrencyInput`으로 천단위 콤마). `formatCurrencyInput`은
  `lib/money.js`가 아니라 `domain/money.js`에 있어 import 경로 수정.
- `side-menu.css` — `.management-badge.log-enabled` 신규(`.commission`
  은 그대로 둠).

### 검증 (2026-09-14)

- `npm test`(unit 628 + app 163, 전부 통과) · `typecheck`(0 에러) ·
  `lint`(변경 파일 경고 0건) · `build`(성공).
- **AI 브라우저 프리뷰 실기동 확인함**(이전 세션과 달리 이번엔 열림):
  guest 모드로 메인 차량 1대 + 기사차량 1대 등록 →
  - 전화번호 미표시, `[기사: 홍길동]` 정상 표시 확인.
  - 월급제 `3,500,000` 입력 → "· 월급 3,500,000원" 콤마 정상.
  - 매출제 `15` 입력 → "· 수수료 15%" 정상.
  - `driverLinkEnabled`/`logEnabled`는 guest 모드 UI에 토글이 없어
    (실제 연동 흐름 필요) localStorage에 직접 `true`로 세팅 후 재확인
    — "기사연동"/"운행일지"가 **칩(둥근 배지, 회색 배경)으로 렌더**,
    텍스트 아님 확인(스크린샷 확인, `--today-bg` 라이트/다크 변수라
    다크모드도 자동 대응).
  - 검증용으로 넣은 guest 테스트 데이터는 확인 후 localStorage에서
    제거함.

react-app 로컬 커밋 `8641be3`. **AI는 push 안 함. B(수정/삭제
아이콘)는 별도 슬라이스 — 이번엔 손대지 않음.**

push·보리 실사용 데이터(실제 기사연동 흐름) 기준 실검증 부탁드립니다.

---

## 다음 슬라이스 (착수 전 대기)

**§2-1-B. 수정/삭제 아이콘 공용화** — A `[x]` 확정 후 별도
착수지시서. 적용 대상: 차량관리·거래처·정비/주유/기타·기사연동관리
(6곳), `shared/CardActionButtons` 공용 컴포넌트로.

**E의 나머지 항목** — "지금 3개는 목록 미완성"이라던 것 중 아직 안
나온 게 있으면 보리가 계속 줄 것. 나머지가 다 모이면 슬라이스 재분할.

**E 착수 전 P0 — 아직 미해결**: `useExpenseForm.js`의 `setTimeout(420)`
이 `day-log.css` `0.4s` 전환 시간과 숫자로만 묶여 있는 문제
(`docs/sot.md` §4-11) — E-1·F-3·디자인 토큰 통합 전부 마크업/CSS/
변수만이라 안 건드림. E가 인라인 시트 열림/닫힘 로직 자체를 만질
차례가 오면 그때 결정.

**후속(비긴급, 디자인 토큰 작업 중 발견)**:
- `--icon-color`(다크 전용 변수) 사용처 0곳 — 죽은 CSS 변수.
- 하드코딩 색상 중복(`#fff`/`#ffffff` 32회, `#cccccc` 8회 등) —
  다음 슬라이스 후보.

상세·근거는 `docs/ui-comparison-report.md` §1.
