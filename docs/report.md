# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(아코디언 인라인 시트 애니메이션 1~6차 `[x]`, 부가세
> 레이블 크기 `[x]`, 거래처 스코프 종결 `[x]`) 상세는
> `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`로 옮김(동결).
> F-1(`[x]`, react-app `8ced672`) 상세는
> `docs/archive/f1-vat-label-font-weight-2026-09-14.md`로 옮김(동결).
> F-2(`[x]`, react-app `ed83703`) 상세는
> `docs/archive/f2-autofill-dark-mode-2026-09-14.md`로 옮김(동결).

---

## D. 시간입력 위젯(`app-temporal` 대체) — 하위 슬라이스 계획

**D를 E보다 먼저 진행(보리 2026-09-14 지시).** E는 여전히 항목 설명 대기.

### 조사 결과 (원본 `ui-widgets.js` `initAppTemporalInputs`, 159~347줄)

원본은 `input[type="date"|"time"]` 전부를 자동으로 감싸는 전역 위젯이다:
네이티브 input은 화면에서 숨기고(값만 유지), 트리거 버튼 + 연/월/일(날짜)
또는 시/분(시간) **스크롤 컬럼 메뉴**를 보여준다. 메뉴는 `document.body`에
포털돼(부모 `overflow:hidden` 탈출) `position: fixed`로 트리거 위치를
따라간다(`positionAnchoredOverlay`, resize/scroll마다 재계산).

**앱 전체 date/time input 10곳**(원본 `index.html` grep): 콜상세(출발/도착
시간·입금예정일) 3, 기사 연동 할당기간 2, 정비일자·주유일자 2, 차량 초대
할당기간 2, 세금계산서 작성일자 1. **react-app엔 현재 7곳**(4개 파일 —
`CallDetailForm.jsx` 3·`DriverFormModal.jsx` 2·`ExpenseFormModal.jsx` 1·
`TaxInvoiceDraftModal.jsx` 1)이 전부 **네이티브 그대로**(브라우저 기본
캘린더/시계 아이콘) — 이게 "시계 아이콘 vs 원본 '시간 선택' 텍스트" 불일치의
원인. 나머지 3곳(할당기간·차량초대)은 그 기능 자체가 react-app에 아직
없어 이번 범위 아님(기존 백로그 항목, D와 무관).

화면별로 원본 CSS 오버라이드가 다르다(`style.css` 6498~6710줄 —
`#callDetailModal`/`#maintRecordModal`/`#fuelDetailModal` 각각 트리거·메뉴
색상 다름). 공용 컴포넌트 하나로 기본기를 만들고, 화면마다 필요하면 스코프
CSS를 따로 얹는 구조가 원본과 같은 설계.

### 왜 한 슬라이스로 안 되는지

1. 완전히 새로운 공용 컴포넌트(네이티브 input `value`/`onChange` 계약을
   유지하는 래퍼) — portal, viewport 기반 위치 계산, 외부 클릭/Escape 닫기,
   스크롤 컬럼 렌더 전부 신규. react-app에 이런 portal 기반 오버레이
   컴포넌트 전례가 없음(`createPortal` 사용처 0곳, grep 확인) — 설계
   확정과 화면 연결을 한 슬라이스에 같이 하면 리뷰 범위가 너무 커짐.
2. 화면 4곳 각각 스코프 CSS가 다르고, 그 중 `ExpenseFormModal.jsx`
   (정비/주유/기타)는 **E가 곧 더 건드릴 예정인 파일** — D가 먼저 손대면
   E 착수 시 레이아웃이 다시 흔들릴 수 있어 별도 슬라이스로 분리해두는 게
   안전(순서는 아래 D-4 참고).

### 하위 슬라이스 순서

| # | 내용 | 대상 파일 | 리스크 |
|---|---|---|---|
| **D-0** | 공용 `TemporalInput` 컴포넌트 + 기본 CSS 신규 작성(화면 연결 없음) | 신규 파일만 | 설계 확정이 핵심, 화면 미연결이라 기존 코드 영향 없음 |
| D-1 | 콜상세 폼(일일운행) 연결 | `CallDetailForm.jsx`(day-log) 3필드 + `#callDetailModal` 스코프 CSS | 이 파일 이미 226줄(기존 초과) — 교체라 순증 적을 것으로 예상, 실측 후 보고 |
| D-2 | 기사 관리 + 세금계산서 연결 | `DriverFormModal.jsx` 2필드, `TaxInvoiceDraftModal.jsx` 1필드 | 낮음, 파일 여유 충분(69/56줄) |
| D-3 | 정비/주유/기타 연결 | `ExpenseFormModal.jsx` 1필드 | **E와 같은 파일 — E 착수 전/후 순서를 보리가 정할 것.** 지금은 D 안에서 순서상 마지막으로 둠 |

**D-0부터 승인 요청.** 각 하위 슬라이스는 끝날 때마다 이 섹션을 갱신하고
완료분은 F-1/F-2처럼 `docs/archive/`로 옮긴다.

---

## D-0. 공용 `TemporalInput` 컴포넌트 + 기본 CSS

### 목표

네이티브 `<input type="date">`/`<input type="time">`와 동일한
`value`(문자열)/`onChange`(문자열 인자) 계약을 갖는 React 컴포넌트를 만들어
호출부 변경을 최소화한다. 렌더:

- 트리거 버튼(값 없으면 "날짜 선택"/"시간 선택", 있으면 `YYYY.MM.DD`/`HH:MM`)
- 클릭 시 `document.body`에 포털된 메뉴: date는 연/월/일 3컬럼, time은
  시/분 2컬럼 스크롤 리스트, 각 옵션 클릭 시 값 반영 + 자동 닫힘(일/분
  선택 시)
- 메뉴 위치: 트리거 `getBoundingClientRect` 기준 `position: fixed`,
  뷰포트 우측 초과 시 좌측으로 당김(원본 `positionAnchoredOverlay` 로직
  포팅), `resize`/`scroll`마다 재계산
- 외부 클릭·Escape로 닫힘, 포커스 트리거로 복귀

### 건드릴 파일 (신규만, 기존 파일 무변경)

- `react-app/src/components/shared/TemporalInput.jsx`(신규)
- `react-app/src/components/shared/temporal-input.css`(신규, 원본
  `style.css:935-1034` 기본 스타일 포팅)

### §6 200줄

신규 파일 — 렌더 로직(트리거+메뉴+포지셔닝)과 옵션 리스트 빌드를 분리하면
200줄 안에 들어갈 것으로 예상. 넘으면 `TemporalInput.jsx`(오케스트레이션)
+ `useTemporalPosition.js`(포지셔닝 훅) 분리 검토.

### §8 4대 질문

1~5 무관 — 신규 UI 컴포넌트, 구독/값 출처/쓰기창구/hydrate/DB 전부
관계없음(부모가 넘긴 `value`/`onChange`만 사용).

### 검증 방법

- `npm run test:app`(신규 컴포넌트 유닛 테스트 추가 — 값 선택 시
  `onChange` 호출, 외부 클릭 시 닫힘, 뷰포트 우측 초과 시 좌측 정렬).
- 화면 미연결이라 브라우저 실검증은 D-1부터(이 슬라이스는 컴포넌트
  단독 완성까지).

### 구현 (2026-09-14)

지시서대로 진행하되 200줄 초과해 3개 파일로 분리(계획된 대안):
- `TemporalInput.jsx`(155줄) — 오케스트레이션(포지셔닝, 열림/닫힘, 커밋 규칙)
- `TemporalColumns.jsx`(83줄) — 연/월/일·시/분 컬럼 렌더
- `temporalValue.js`(38줄) — `pad`/`daysInMonth`/`parseCursor` 순수 함수
- `temporal-input.css`(94줄) — 원본 포팅(`--subtext-color`는 react-app
  실제 변수명 `--sub-text-color`로 정정, grep으로 확인 후 반영)
- `TemporalInput.test.js`(신규, 지시서에 적은 3가지 시나리오 + 날짜
  연/월/일 커밋 규칙 검증 1개 추가 — 총 4개 테스트)

버그 2개를 테스트로 잡아 자체 수정: ① 외부 클릭 판정에 쓴 전역 `Node`가
이 테스트 환경(jsdom, `setupDom.js`)엔 없어 `ReferenceError` — `window.Node`로
수정. ② 포지셔닝 테스트에서 직접 계산한 기대값이 산수 오류(224 아니라
232)였던 걸 재확인해 테스트 쪽을 고침(컴포넌트는 원본 로직 그대로 정확).

검증: `npm test`(unit 628 + app 159 전부 통과) · `npm run typecheck`(0 에러,
cursor 상태를 date/time 공용 shape로 통일해 union 타입 좁히기 에러 해결) ·
`npm run lint`(신규 파일 경고 없음) · `npm run build`(성공).

react-app 로컬 커밋 `e65b2c0`. **AI는 push 안 함 — 사용자가 push해야
CI(GitHub Actions)가 돈다.** 화면 미연결이라 브라우저 실검증은 D-1부터.

push 후 CI 확인 부탁드립니다. 초록 확인되면 D-0 `[x]` 확정하고 D-1(콜상세
폼 연결)로 넘어가겠습니다.
