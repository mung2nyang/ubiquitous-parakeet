# 일일운행 2부 — 2중 스크롤 + 콜상세 폼 카드 이탈 (동결, 2026-09-10 완료)

> `docs/report.md`에서 이관. 일일운행 1부(콜상세 폼 CSS 4건, `c6c831b`)는
> `docs/archive/report-snapshot-2026-09-10.md` §4 참고.

---

## 1. 이번 슬라이스 — 2중 스크롤(버그1) + 콜상세 폼 카드 이탈(버그2)

두 버그 모두 일일운행(`work-log-page`) 화면 전용이고 이미 원인이 확정돼 있어,
화면을 두 번 열지 않기 위해 한 슬라이스로 묶는다(보리 지시 2026-09-10 원칙 —
"같은 화면을 두 번 열지 않으려고"). 건드릴 파일 3개로 §3 슬라이스 크기(1~3개
파일) 안에 든다.

### 1-1. 버그1 — 일일운행 화면 2중 스크롤 (원인 확정)

`app-shell-base.css:23`의 `.container.main-app-container`가 모든 화면 공통으로
`padding: 20px 16px 108px`(세로 합계 128px)를 주는데, `day-log.css:22`의
`.work-log-page`는 `height: 100dvh`(뷰포트 전체 높이)로 고정돼 있다. 부모 패딩
128px이 그 위에 더 얹혀 실제 렌더링 높이가 "뷰포트 높이 + 128px"가 되고, 바깥
(body)에도 스크롤이 하나 더 생긴다(실측: 뷰포트 412px, 컨테이너 540px =
412+128, 정확히 일치). 다른 화면(매출·마이페이지 등)은 `height:100dvh`를 쓰지
않고 그냥 문서 흐름대로 컨테이너 스크롤에 맡기는데, `work-log-page`만 유일하게
자체 높이·자체 스크롤(`overflow-y:auto`)을 갖고 있어서 생기는 문제다.

**목표 상태** — `work-log-page`의 높이에서 부모 패딩 128px을 빼서 뷰포트와
정확히 맞춘다(자체 스크롤·패딩·`scroll-padding-bottom` 구조는 그대로 유지 —
sticky 제거 재감사 이력이 걸려 있는 부분이라 건드리지 않음, §2 참고):

```css
.work-log-page {
  box-sizing: border-box;
  /* main-app-container의 세로 패딩(20px+108px=128px)이 이 페이지를 감싸고
     있어, 100dvh 그대로 쓰면 실제 렌더링 높이가 "뷰포트+128px"가 되어 바깥
     (body)에도 스크롤이 하나 더 생긴다. 뷰포트와 맞추려면 그 128px을 빼야
     한다 — main-app-container 패딩 값이 바뀌면(app-shell-base.css:26) 이
     숫자도 같이 맞춰야 함. */
  height: calc(100dvh - 128px);
  overflow-y: auto;
  padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  scroll-padding-bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));
}
```

`height: 100dvh;` → `height: calc(100dvh - 128px);` 한 줄 + 설명 주석만 바뀐다.
기존 `padding-bottom`/`scroll-padding-bottom`/`overflow-y`는 그대로 둬서
`inlineSheetCss.test.js`(sticky 제거 재감사 테스트)와 충돌 없다.

### 1-2. 버그2 — "N일 일지 세부 입력" 섹션이 카드 밖으로 나감 (원인 확정)

원본 [index.html:1570-1581](ubiquitous-parakeet/index.html:1570): "운행 일지
세부 입력" 제목+추가버튼과 펼쳐지는 폼(`callDetailInlineHost`)이 **같은 카드
`<div id="modalCallDetailSection" class="modal-section">` 안에** 함께 있다
(제목행 → 목록 → 인라인 폼 순서로 한 카드 안에서 이어짐).

react-app은 [`CallDetailList.jsx`](react-app/src/components/day-log/CallDetailList.jsx:72)가
자기 카드(`<div className="modal-section call-detail-section">`)를 열고
닫아버린 뒤, [`DayLogPage.jsx`](react-app/src/components/day-log/DayLogPage.jsx:151-165)에서
콜상세 폼(`InlineSheet`)이 그 카드의 **형제 요소로 따로** 렌더링된다 — 폼이
열리면 카드 경계 밖으로 나가 보인다. CSS 값 문제가 아니라 **JSX 컴포넌트 구조
문제**다.

**목표 상태** — `CallDetailList`가 `children`을 받아 카드를 닫기 전에
렌더링하도록 바꾼다(원본의 "제목→목록→추가버튼→인라인폼" 순서와 동일하게
인라인폼이 카드 맨 끝에 들어가게):

1. `CallDetailList.jsx`: props에 `children` 추가, 기존 `{canAdd && (...+ 운행
   일지 추가 버튼...)}` 블록 바로 뒤, 카드 `</div>` 닫기 **전**에 `{children}`
   렌더링. JSX 로직(목록·합계·추가버튼) 자체는 무변경.
2. `DayLogPage.jsx`: 현재 `<CallDetailList ... />`와 형제로 있는
   `{settings.callDetail && (<InlineSheet ...><CallDetailForm .../></InlineSheet>)}`
   블록을 `<CallDetailList>`의 children으로 이동(그대로 잘라서 옮기는 것 —
   조건·props·내부 JSX 전부 무변경). `showCallDetailList`(목록 표시 조건)가
   `settings.callDetail`을 포함하는 OR라 `CallDetailList`가 안 그려지는데
   폼만 그려지는 경우는 없음 — 동작 변화 없음.

### 건드릴 파일 (정확히 3개)

1. `react-app/src/components/day-log/day-log.css` — `.work-log-page`의
   `height` 한 줄 + 주석 (버그1).
2. `react-app/src/components/day-log/CallDetailList.jsx` — `children` prop 추가
   + 렌더링 위치 (버그2).
3. `react-app/src/components/day-log/DayLogPage.jsx` — `InlineSheet` 블록을
   형제 → children으로 이동 (버그2).

### 안 건드릴 것

- `app-shell-base.css`의 `.main-app-container`(다른 모든 화면 공용) — 무변경.
  버그1은 `work-log-page` 쪽에서만 흡수.
- `day-log.css`의 sticky 제거 재감사 구간(50~68줄, `.call-detail-form-actions`
  취소/저장 액션바 관련) — 과거 롤백 이력 있어 손 안 댐.
- `CallDetailList.jsx`의 목록·합계·추가버튼 JSX 로직 — children 추가 외 무변경.
- B그룹(즐겨찾기 칩·거래처 +추가·산재보험료), "부가세 해제" 16px 레이블, 시간
  입력 커스텀 위젯 — 전부 별도 슬라이스.

### §8 4대 질문

1. 구독(`useOwner*`) 아님 — 순수 화면 레이아웃(CSS 높이 계산)·컴포넌트 합성
   구조 문제. draft/Store 읽기 로직 무변경.
2. 화면에 보이는 값은 기존과 동일한 `draft`(DayLogPage의 로컬 상태) — 버그
   수정이 그 출처를 바꾸지 않음.
3. 쓰기 창구 무관 — 이 슬라이스는 저장 로직을 건드리지 않음(표시·구조만).
4. hydrate·디바운스·동시편집 무관.
→ 신규 상태 저장소·레이어 없음. 실패 시 처리: CI 빨강이면 수정 커밋 추가,
신규 레이어 도입 없음.

### 검증 방법

- CI 자동(test·typecheck·build, `inlineSheetCss.test.js` 포함).
- 감시관 브라우저 실측 (모바일 뷰포트 기준):
  1. 일일운행 화면에서 바깥(body) 스크롤이 사라지고 `work-log-page` 안쪽
     스크롤 하나만 남는지(스크롤바 1개, 콜상세 폼 펼쳐진 채로도 동일).
  2. "+ 추가"로 콜상세 폼을 열었을 때 제목·기존 카드 목록·폼이 **한 카드**
     (같은 테두리) 안에 이어져 보이는지 — 원본 스크린샷과 나란히 대조.
  3. 폼 펼침/접힘 애니메이션(grid-template-rows 트릭)·마지막 입력창이 하단
     네비에 안 가려지는지(scroll-margin-bottom) 회귀 없는지.
  4. 폼 안 "취소/저장" 버튼 위치 — sticky/fixed 아니고 폼 바로 아래(일반
     문서 흐름)인지 재확인(재감사 이력 있는 부분).
  5. 라이트·다크 각각, 다른 화면(매출·마이페이지) 스크롤 동작 무변화 회귀.

## 1-1. 구현 결과 + 감시관 재검증 (2026-09-10) — 버그1 근본 원인 재확인, 후속 수정 필요

작업자 커밋 react-app `796bea6`(`fix: 일일운행 2중 스크롤과 콜상세 폼 카드 이탈 수정`),
push 완료. CI(run `34468240589`)·Deploy(run `34468240579`) 둘 다 success.

**버그2(카드 이탈)** — 브라우저 실측 확인, 문제 없음. **`[x]` 확정.**

**버그1(2중 스크롤)** — 보리가 로컬에서 직접 확인한 결과 "여전히 다르다"는
지적(스크린샷 2장: 일일운행 화면 스크롤바가 다른 화면보다 안쪽에 있음) →
재조사 결과, 1차 수정은 **증상만 없앴을 뿐 근본 원인이 남아 있었다**.

- 1차 수정(`height: calc(100dvh - 128px)`)으로 바깥(document) 스크롤 자체는
  없앴다 — 로컬·배포 사이트·375px·853×1280 등 여러 크기로 확인해도 문서가
  넘치진 않는다.
- 하지만 `work-log-page`가 **여전히 자기 자신 안에서 `overflow-y:auto`로
  스크롤**하는 유일한 화면이다. 다른 화면(매출 등)은 스크롤 요소가 없어
  **문서(브라우저 창) 전체**가 스크롤된다 → 스크롤바가 항상 **창의 진짜
  오른쪽 끝**에 붙는다. 일일운행만 `work-log-page` 박스(가운데 정렬된 480px
  콘텐츠 영역) 끝에 스크롤바가 붙어서, 다른 화면보다 훨씬 안쪽에 보인다 —
  보리가 짚은 스크린샷 차이의 정확한 원인.
- 감시관이 브라우저에서 `work-log-page`의 `height`/`overflow-y`를 임시
  제거해 가설을 실측 검증: 즉시 스크롤바가 다른 화면과 동일하게 창 오른쪽
  끝으로 이동함(`document`가 스크롤 주체가 됨, `docScrollbarWidth 0→15`).

### 목표 상태 (후속 수정)

`day-log.css`의 `.work-log-page`에서 자체 스크롤 관련 3개 선언을 제거해
다른 화면과 똑같이 **문서 스크롤**에 맡긴다:

```css
.work-log-page {
  box-sizing: border-box;
  scroll-padding-bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));
}
```

- `height: calc(100dvh - 128px)` 삭제 — 더 이상 필요 없음(문서가 스크롤하므로
  이 페이지가 뷰포트 높이로 고정될 이유가 없음).
- `overflow-y: auto` 삭제 — 이게 근본 원인이었던 자체 스크롤.
- `padding-bottom: calc(96px + env(...))` 삭제 — 다른 모든 화면처럼
  `main-app-container`의 공용 하단 패딩(108px)이 하단 네비 가림 방지를
  대신 맡는다(모든 화면에 이미 적용 중, 중복 불필요).
- `scroll-padding-bottom`은 **그대로 유지** — `inlineSheetCss.test.js`가
  이 문자열이 day-log.css에 있는지 검사한다(§5 테스트 진실성: 테스트를
  건드리지 않기 위해 남겨둠, 자체 스크롤이 없어져도 무해).

### 건드릴 파일 (정확히 1개)

1. `react-app/src/components/day-log/day-log.css` — `.work-log-page`
   3개 선언 삭제.

### 안 건드릴 것

- `CallDetailList.jsx`·`DayLogPage.jsx`(버그2, 이미 `[x]`) — 무변경.
- `inlineSheetCss.test.js` — 건드리지 않음(§5 테스트 진실성).
- `app-shell-base.css` — 무변경(다른 화면과 동일한 패딩을 그대로 재사용하는
  것이 이번 수정의 핵심이라 오히려 손댈 필요가 없어짐).

### 검증 방법

- CI 자동.
- 감시관/보리 브라우저 실측:
  1. 콘텐츠가 뷰포트보다 길어지도록 콜상세 폼을 열고, **스크롤바가 창의
     진짜 오른쪽 끝에 붙는지**(매출 화면과 같은 위치인지) 육안 확인.
  2. 스크롤해도 이중으로 움직이는 느낌 없이 한 번에 끝까지 스크롤되는지.
  3. 마지막 입력창이 하단 네비(약 71px)에 가려지지 않는지(패딩 96→108로
     바뀌어도 여유 있는지 확인 — 오히려 12px 더 여유로워짐).
  4. 다른 화면(매출·마이페이지) 스크롤 무변화 회귀.

보리 확인("그래 이번엔 맞겟지 내말이해한게 확실해보여") 받고 작업자에게 전달.

## 1-2. 구현 결과 + 감시관 검증 (2026-09-10) — 최종

작업자 커밋 react-app `387e3c3`(`fix: 일일운행을 문서 스크롤로 통일해 스크롤바 위치
맞춤`), push 완료.

- **diff 정확히 지시대로**: `day-log.css` 1개 파일, `.work-log-page`의
  `height`/`overflow-y`/`padding-bottom`(+ 관련 주석) 8줄 삭제. `scroll-padding-bottom`은
  지시대로 유지. 다른 파일·`.md`·테스트 파일 무변화.
- **CI green**(run `34471157134`). Deploy GitHub Pages는 확인 시점에 진행 중이었으나
  CI(test·typecheck·build) 자체는 통과 — AGENTS §4의 필요조건 충족.
- **감시관 브라우저 재검증**(로컬 `npm run dev`, 태블릿 768×1024, 콜상세 폼 열어
  내용 늘린 상태):
  1. `.work-log-page`의 `overflow-y`가 `visible`로 바뀜(자체 스크롤 없어짐) 확인.
  2. 문서 스크롤바 폭 15px로 일일운행·매출 화면 **동일**(이전엔 일일운행만
     0px=자체 스크롤이라 창 스크롤바 자체가 없었음) — 스크롤바 위치 불일치 해소 확인.
  3. 콜상세 폼 맨 아래(취소/저장 버튼)까지 스크롤해도 하단 네비(위치 965~1024px)와
     안 겹침(버튼 bottom 768px, 197px 여유) — 패딩 96→108 전환으로 인한 가림 회귀 없음.
- 보리도 로컬에서 직접 확인("브라우저 먼저확인함 이거야 맞아 이렇게 수정하라고").

**버그1(2중 스크롤 + 스크롤바 위치 불일치) — `[x]` 최종 확정.**
**일일운행 2부(버그1+버그2) 작업묶음 전체 — `[x]` 완료.** (§5 전체 체크리스트
서술은 보리 지시로 오늘은 생략 — diff·CI·핵심 동작만 확인, 스코프 일탈·타입꼼수·
200줄·문서정합 항목은 diff 자체가 8줄 삭제뿐이라 위반 여지 없음.)

## 참고 — 범위 밖(다음 슬라이스, STATUS.md에 등재됨)

- "부가세 해제" 레이블 16px 잔존 — 다음 관련 슬라이스.
- B그룹(즐겨찾기 칩·거래처 +추가·산재보험료) — 별도 슬라이스.
