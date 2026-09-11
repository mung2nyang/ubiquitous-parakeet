# 아코디언 인라인 시트 애니메이션 + 부가세 굵기 + 거래처 스코프 종결 (2026-09-11, 동결)

`docs/report.md`에서 옮김. 전부 보리 확인·커밋·(react-app은) 푸시 완료.

---

## 일일운행 인라인 폼(콜상세/정비/주유/기타) 아코디언 슬라이드 애니메이션이 안 보임 — 1차

### 배경

보리가 일일운행 화면에서 폼을 여닫을 때 아코디언 슬라이드 애니메이션이
안 보인다고 지적. 예전 세션에서 "문제없다"는 답을 들었으나 실제로는
안 보여 원인 조사를 요청받음.

### 조사 결과

`InlineSheet.jsx` + `day-log.css`가 `.inline-sheet`에 `grid-template-rows`
0fr↔1fr 그리드 트릭을 씀. 당시 `.inline-sheet.is-visible`은
`grid-template-rows: min-content`.

- `0fr`(flex 타입) → `min-content`(intrinsic-sizing 타입) 전환은 트랙
  사이징 "타입"이 달라 CSS 스펙상 보간이 안 되고 discrete 전환(중간
  지점에서 순간 전환)으로 처리됨.
- 브라우저(dev 서버, 프레임별 실제 렌더 높이를 rAF로 실측)로 확인:
  `transitionrun`~`transitionend` 이벤트는 0.32초 정상 발생하지만, 렌더
  높이는 0으로 머물다가 중간에 한 번에 최종값(1156px)으로 점프 — 슬라이드
  없음.
- `.is-visible`을 임시로 `grid-template-rows: 1fr`로 바꿔 재실측:
  0.32초에 걸쳐 부드럽게 증가(정상 슬라이드), 최종 높이는 `min-content`와
  동일.

### 적용 (react-app `67762ff`)

`.inline-sheet.is-visible { grid-template-rows: min-content; }` →
`grid-template-rows: 1fr;`. `inlineSheetCss.test.js`도 `1fr` 검사로 갱신.

**→ 보리 `[x]`.**

---

## 아코디언 열기/닫기 애니메이션 — 리뷰 2차 (닫기 애니메이션 안 보임 + 열기 체감 속도)

1차(`67762ff`) 적용 후 실브라우저 확인 결과 2건.

### ② 열기 지속시간

1156px가 0.32s 만에 열려 체감상 너무 빠름 → `transition:
grid-template-rows 0.32s ease` → `0.4s ease-out`.

### ① 닫기만 애니메이션 안 보임 — B안 채택

**원인**: `InlineSheet.jsx`가 `open=false`가 되는 순간 자식을 동기
언마운트 → `grid-template-rows: 1fr`이 기준으로 삼던 콘텐츠가 즉시
사라져 전환할 대상이 없어짐.

**B안**: `InlineSheet`에 `forceInstant` prop 추가.
- `forceInstant=false`(취소/저장으로 직접 닫기) → 자식을
  `onTransitionEnd`(grid-template-rows)까지 살려둔 뒤 제거 → 실제
  슬라이드 보임.
- `forceInstant=true`(다른 인라인 시트가 열려서 이 시트가 닫히는 경우) →
  즉시 제거 → Step 6 FAIL-6("두 폼 동시 DOM 금지", App.test.js:746)
  그대로 유지. 콜상세 쪽엔 `expenseForm.kindPick || expenseForm.modalOpen`을,
  정비/주유/기타 쪽엔 `callFormOpen`을 `forceInstant`로 넘겨 서로 감지 —
  리듀서 액션 무변경, 파생값만 씀.

### 적용 (react-app `d575247`)

파일 4개: `InlineSheet.jsx`(forceInstant prop, mounted state, onTransitionEnd
지연 언마운트), `DayLogPage.jsx`·`DayLogExpenses.jsx`(forceInstant 배선),
`day-log.css`(지속시간).

**→ 보리 `[x]`.**

---

## 아코디언 "닫기"가 종이 말리듯 보임 — 리뷰 3차

**원인**: 닫힐 때 패널이 `overflow: hidden`으로 바뀐 채 0.4초 내내 실제
높이가 계속 줄어들어, 안의 둥근 입력창들이 매 프레임 중간에서 잘림(둥근
모서리가 사라지고 직선으로 잘림) — 220ms 지점을 멈춰 캡처해 확인. 열 때는
패널이 처음부터 완성 크기(overflow: visible)로 존재해 안 잘림.

### 적용 (react-app `a019e68`)

`day-log.css` 1개 파일, opacity 페이드 추가:

```css
.inline-sheet-panel {
  overflow: hidden;
  min-height: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.inline-sheet.is-visible .inline-sheet-panel {
  min-height: min-content;
  overflow: visible;
  opacity: 1;
}
```

닫기 시작 0.15초 안에 내용이 흐려져, 남은 0.25초의 "잘리는 구간"이 안 보임.

**→ 보리 브라우저 확인 완료, 푸시됨 (2026-09-11).**

---

## 아코디언 "열기"가 처음부터 안 보임 — 4차

### 원인

닫기(3차)와 달리 열기는 애초에 클립(reveal) 자체가 없었다. `is-visible`이
붙는 순간 패널이 곧바로 `overflow: visible` + `min-height: min-content`가
되어, 클릭한 그 프레임에 폼 내용물이 이미 100% 다 그려짐(실측: 바깥
박스 624px일 때 패널 자체는 이미 1156px). 그 아래 "빈 공간"만 조용히
자라날 뿐이라 슬라이드가 안 보였다.

### 적용 (react-app `355b865`)

`InlineSheet.jsx`에 `settled` state 추가(전환 완료 후에만 true), 열리는
동안은 `overflow: hidden`으로 클립하고 전환 완료(`is-settled`) 후에만
`visible`로 전환. `day-log.css`의 opacity 페이드도 열기 방향엔 후반
150ms(0.25s 지연)에만 걸리게 분리.

**→ 보리 브라우저 확인 완료(2026-09-11), 콜상세 폼 기준.**

### 후속 — "종류 선택 → 실제 폼" 2단계 전환은 안 고쳐짐 (5차로 이어짐)

정비/주유/기타의 "+ 추가"(종류 먼저 고르는 버튼)는 종류를 고르는 순간
`kindPick`→`modalOpen`이 **한 렌더에서 같이** 바뀌어 `open` prop 자체가
계속 true로 유지된다 — 그래서 위 4차가 고친 "열기(0fr→1fr)" 전환이
재발동되지 않고, 종류 선택 패널→실제 폼 내용 교체가 즉시 점프한다("+
정비 추가" 같은 직접 버튼은 처음부터 닫힌 상태에서 여는 거라 정상 작동,
실측 확인). 상세 `docs/report.md` 5차.

---

## "부가세 해제" 레이블 16px 잔존

### 조사 결과

원본(`style.css:6060-6068`)은 콜상세 인라인 버전 한정으로 "부가세 해제"
레이블에 `color`+`font-size: var(--fs-2)`를 스코프. react-app의 대응 규칙엔
`font-size` 지정이 아예 없어 브라우저 기본 크기(16px)로 남아 있었음.

### 적용 (react-app `3ae7db9`)

`call-detail-form.css`에 `.work-log-page .call-vat-row > label:first-child { font-size: var(--fs-2); }` 추가.

**→ 보리 `[x]` 2026-09-11.**

### 후속 — 글자 굵기 누락 발견·수정

원본엔 `.call-vat-row > label:first-child`에 `font-weight: 750`을 주는
**일반 규칙**(`style.css:3283-3284`)이 스코프 규칙과 별도로 있는데, 위
`3ae7db9` 이식 때 스코프 규칙(`color`/`font-size`)만 옮기고 이 굵기
규칙을 빠뜨렸다 — "부가세 해제"만 `font-weight: 400`, 옆 레이블은
750~800. STATUS.md "다음 할 일"에 기록, 별도 슬라이스로 처리 예정.

---

## `LinkedDriverClientsPage` 스코프 키 출처 — 후속 nit 재조사 결론

### 배경

STATUS.md "후속 nit"[확인 2026-09-11]: `LinkedDriverClientsPage`의 연동
모드 스코프 키가 콜상세·`OwnerScopedClientsView`와 "다른 소스"에서 온다고
기록해두고 미뤄둔 항목. "처리" 지시로 출처를 끝까지 추적.

### 조사 결과 (코드 추적)

- `LinkedDriverClientsPage.jsx:58` → `scopeKey = ctx.car?.number` →
  `driverManagementContext.js:31-33`에서 `driver.vehicleNumber`로 매칭.
- `driver.vehicleNumber`의 출처 → `hydrateMerge.js:78-84`: owner
  hydrate마다 서버 `driver_links.vehicle_id`를 클라이언트에서 조인.
- `get_assigned_vehicle_summary()` RPC(`0002_driver_invite_redeem.sql:94-98`)도
  **똑같이 `driver_links.vehicle_id` 조인.**

### 결론

두 화면이 "다른 소스"가 아니라 같은 정본 컬럼을 서로 다른 위치(서버 RPC
vs 클라이언트 hydrate 병합)에서 조인할 뿐 — 구조적 어긋남 지점 없음,
버그 아님. 코드 변경 없음, STATUS.md "후속 nit" 항목을 "확인 완료 — 종결"로
갱신.

**→ 보리 확인 완료 (2026-09-11).**
