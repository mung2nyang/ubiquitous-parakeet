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

## D-3. 정비/주유/기타 `TemporalInput` 연결 (+ `centered` 공용 modifier화)

### 목표

`ExpenseFormModal.jsx`의 `expenseDate` 1개를 `TemporalInput`으로 교체.
D의 마지막 하위 슬라이스 — 여기까지 끝나면 `app-temporal` 대체 4화면
전부 완료.

### 조사 결과 — D-1과 스코프 CSS가 사실상 같음

원본 `style.css:6655-6699`(`#maintRecordModal`/`#fuelDetailModal`)의
트리거 가운데 정렬 CSS가, D-1에서 콜상세용으로 이미 포팅한 것과 **핵심
5개 선언이 완전히 같음**(트리거 `position:relative;justify-content:
center`, 값 `width:100%;padding:0 22px;color/font/text-align`, 아이콘
`position:absolute;right:12px;margin-left:0`). 콜상세만 추가로 갖는
디테일(말줄임표·gap·아이콘 색·열림 모서리)은 원본에도 없음.

**보리 지시(2026-09-14, "중복 3개 이상은 공용 컴포넌트화")에 따라**
화면 2곳에서 완전히 같은 CSS를 또 복붙하는 대신, `TemporalInput`에
`centered` prop을 추가하고 공용 `.is-centered` modifier로 뽑았다
(상세는 아래 "구현"). `lockDate`(정비/주유가 일지 안에서 열릴 때 날짜
고정)는 `TemporalInput`의 기존 `disabled` prop으로 매핑.

### 건드릴 파일

- `react-app/src/components/ExpenseFormModal.jsx` — `expenseDate` 1줄.
- `react-app/src/components/shared/TemporalInput.jsx` — `centered` prop 추가.
- `react-app/src/components/shared/temporal-input.css` — `.is-centered`
  공용 모디파이어(핵심 5선언) 추가.
- (동반) `react-app/src/components/day-log/CallDetailForm.jsx`·
  `call-detail-form.css` — D-1의 중복 CSS를 공용 modifier로 옮기고
  화면 전용 디테일만 남김. **computed style은 이전과 100% 동일**(순수
  소스 정리, D-1의 확정된 `[x]`를 재검증할 필요는 없다고 판단 — 다만
  원하시면 재확인 환영).

### §6 200줄

전부 여유 있음(`ExpenseFormModal.jsx` 183줄, `TemporalInput.jsx` 155줄,
`call-detail-form.css`는 오히려 291→280줄로 줄어듦).

### §8 4대 질문

1~5 무관 — 마크업만 교체, `draft`/`onChange` 그대로 연결. `centered`는
순수 CSS 클래스 토글.

### 검증 방법

- `npm test` 전체.
- 보리 브라우저 실검증: 정비/주유/기타 날짜 트리거(모달·일지 인라인
  둘 다) 클릭 → 값 선택 반영, 가운데 정렬 유지되는지. 콜상세 폼도
  기존과 똑같이 보이는지(회귀 없어야 함) 같이 한 번 봐주시면 좋음.

### 구현 (2026-09-14)

지시서대로 진행. 도중 발견: `ExpenseDraft.date`가 `string|undefined`라
타입 에러 — `|| ''` 폴백 추가(기존 관례와 동일).

검증: `npm test`(787개 전부 통과, D-1 관련 테스트도 회귀 없음) ·
`npm run typecheck`(0 에러) · `npm run lint`(경고 없음) ·
`npm run build`(성공). AI 쪽 브라우저 프리뷰는 이번에도 이 세션에서
안 열려 확인 못 함(환경 문제로 판단, 리스크 낮음).

react-app 로컬 커밋 `93a4f2c`. **AI는 push 안 함.**

push 후 브라우저 실검증 부탁드립니다. D-3까지 확정되면 D(시간입력
위젯) 전체가 끝나고, 다음은 E(정비/주유/기타 패널 — 보리가 나머지
항목 설명 필요) 차례입니다.
