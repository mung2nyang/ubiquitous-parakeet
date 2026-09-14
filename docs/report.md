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

## D-1. 콜상세 폼(일일운행) `TemporalInput` 연결

### 목표

`CallDetailForm.jsx`의 출발/도착 시간·입금예정일 3개 네이티브
date/time input을 D-0의 `TemporalInput`으로 교체. `value`/`onChange`
계약이 기존 native input과 동일해 호출부는 태그명+`className="input-box"`
제거만 바뀐다(로직 무변경).

### 건드릴 파일

- `react-app/src/components/day-log/CallDetailForm.jsx` — 3줄
  ([113](../react-app/src/components/day-log/CallDetailForm.jsx:113)
  출발시간, [117](../react-app/src/components/day-log/CallDetailForm.jsx:117)
  도착시간, [201](../react-app/src/components/day-log/CallDetailForm.jsx:201)
  입금예정일 — `<input type="date|time" .../>` → `<TemporalInput type="date|time" .../>`).
- `react-app/src/components/day-log/call-detail-form.css` — 원본
  `style.css` 6498~6660줄의 `#callDetailModal`/`#workModal
  .call-detail-inline-host` 스코프를 `.work-log-page`로 포팅(아래 참고).

### 스코프 CSS — 트리거만 포팅, 메뉴는 포팅 안 함(원본도 사실상 죽은 CSS)

원본은 이 화면에서 트리거를 **가운데 정렬 + 아이콘 우측 절대위치**로
꾸민다(`justify-content:center`, `.app-temporal-value{padding:0 22px;
text-align:center}`, `.app-temporal-icon{position:absolute;right:12px}`).
이건 포털되지 않는 트리거/래퍼 요소라 `.work-log-page .app-temporal-trigger`
조상 선택자로 정상 적용된다 — 이 부분만 포팅.

원본은 메뉴에도 스코프 CSS(`#callDetailModal .app-temporal-menu`
padding/radius, `.app-temporal-option` 크기 등)를 두는데, **D-0에서
메뉴는 `document.body`에 포털**되므로 `#callDetailModal`(또는
`.work-log-page`)의 자손이 아니게 된다 — 조상 선택자로는 절대 안 걸리는
선택자라, 원본에서도 사실상 죽은 CSS였던 것으로 판단(DOM 구조상 불가능).
그래서 메뉴 쪽은 포팅하지 않고 D-0 기본 스타일(모든 화면 공통)을 그대로
쓴다 — 실제 사용자가 보는 화면도 어차피 그 죽은 CSS 영향을 받은 적이
없으므로 동작 동일.

### §6 200줄

`CallDetailForm.jsx` 226줄(기존 초과, 교체라 순증 거의 없음 — 실측
보고). `call-detail-form.css` 257줄(기존 초과, "§6 응집도 우선" 주석
있음)에 트리거 스코프 규칙 약 15줄 추가 → 272줄. 분리 없이 진행(F-2와
같은 전례 — 기존 초과 파일에 소량 추가).

### §8 4대 질문

1~5 무관 — 마크업만 교체, `value`/`onChange`로 기존 `draft` state에
그대로 연결(구독/값 출처/쓰기창구/hydrate/DB 전부 무변경).

### 검증 방법

- `npm test` 전체.
- 보리 브라우저 실검증(다크모드 포함): 콜상세 폼에서 출발/도착 시간,
  입금예정일 트리거 클릭 → 스크롤 픽커로 값 선택 → 폼에 반영되는지,
  가운데 정렬 스타일이 유지되는지.

### 구현 (2026-09-14)

지시서대로 3줄 교체(`CallDetailForm.jsx` 226→227줄, 순증 거의 없음
— 예상대로) + 스코프 CSS 35줄 추가(`call-detail-form.css` 257→292줄,
지시서엔 "약 15줄"로 적었으나 주석 포함 실측 35줄 — 여기 정정). 메뉴
스코프는 지시서대로 포팅 안 함(포털 구조상 조상 선택자로 안 닿음).

검증: `npm test`(unit 628 + app 159 전부 통과, D-0 테스트도 그대로 통과
— 회귀 없음) · `npm run typecheck`(0 에러) · `npm run lint`(경고 없음)
· `npm run build`(성공). **이 세션 환경에서 로컬 dev 서버 브라우저
프리뷰가 열리지 않아(권한/네트워크 문제로 `navigate`가 매번 거부됨)
AI 쪽 브라우저 실검증은 이번엔 못 했다** — 지시서에 적은 대로 순수
마크업 교체(로직 무변경)라 리스크는 낮다고 판단하지만, 보리 브라우저
실검증은 그대로 필요.

react-app 로컬 커밋 `b14fcd8`. **AI는 push 안 함.**

push 후 브라우저 실검증 부탁드립니다.
