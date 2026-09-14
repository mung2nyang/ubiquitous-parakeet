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
> D-1(`[x]`, react-app `b14fcd8`) 상세는
> `docs/archive/d1-call-detail-form-temporal-2026-09-14.md`로 옮김(동결).

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

## D-2. 기사 관리 + 세금계산서 `TemporalInput` 연결

### 목표

`DriverFormModal.jsx`(할당 시작일·종료일 2개)·`TaxInvoiceDraftModal.jsx`
(작성일자 1개) 네이티브 date input을 `TemporalInput`으로 교체. 둘 다
평범한 `.modal-overlay > .modal-content` 구조라 D-1보다 단순.

### 조사 결과 — 스코프 CSS 불필요

원본 `style.css` grep 결과 `driverModal`/`taxInvoiceModal`에 대한
`app-temporal` 스코프 규칙이 **하나도 없음**(D-1의 `#callDetailModal`,
D-3 예정 대상 `#maintRecordModal`/`#fuelDetailModal`과 다름) — 두
화면 다 D-0 기본 스타일 그대로 써야 원본과 같다. CSS 파일 변경 없음.

### 건드릴 파일 (정확히 2개, 3줄)

- `react-app/src/components/DriverFormModal.jsx` —
  [54](../react-app/src/components/DriverFormModal.jsx:54) 할당
  시작일, [58](../react-app/src/components/DriverFormModal.jsx:58)
  할당 종료일.
- `react-app/src/components/TaxInvoiceDraftModal.jsx` —
  [37](../react-app/src/components/TaxInvoiceDraftModal.jsx:37) 작성일자.

`<input type="date" className="input-box" .../>` →
`<TemporalInput type="date" .../>`, `value`/`onChange`는 기존 그대로.

### §6 200줄

`DriverFormModal.jsx` 69줄, `TaxInvoiceDraftModal.jsx` 56줄 — 여유
충분, 문제 없음.

### §8 4대 질문

1~5 무관 — 마크업만 교체, 기존 `draft`/`modalItem` state 그대로 연결.

### 검증 방법

- `npm test` 전체.
- 보리 브라우저 실검증: 기사 관리(초대/수정) 할당 시작일·종료일,
  세금계산서 작성일자 트리거 클릭 → 스크롤 픽커로 값 선택 → 폼에
  반영되는지.

### 구현 (2026-09-14)

지시서대로 3줄 교체 + CSS 변경 없음. 도중 발견: `DriverDraft.startDate`/
`endDate`가 `string|undefined`라 `TemporalInput`의 `value: string` 계약과
안 맞아 타입 에러 — 호출부에 `|| ''` 폴백 추가(`TaxInvoiceDraftModal`의
기존 관례와 동일, 지시서에 없던 사소한 보완).

검증: `npm test`(787개 전부 통과) · `npm run typecheck`(0 에러) ·
`npm run lint`(경고 없음) · `npm run build`(성공). D-1과 같은 이유로
이번에도 AI 쪽 브라우저 프리뷰는 못 열었다(dev 서버 재기동해 재시도
했으나 동일하게 빈 화면 — 환경 문제로 판단, 순수 마크업 교체라 리스크
낮음).

react-app 로컬 커밋 `c395ab3`. **AI는 push 안 함.**

push 후 브라우저 실검증 부탁드립니다.
