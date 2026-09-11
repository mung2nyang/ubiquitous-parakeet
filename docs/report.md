# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(아코디언 인라인 시트 애니메이션 1~3차 `[x]`, 부가세
> 레이블 크기 `[x]`, 거래처 스코프 종결 `[x]`) 상세는
> `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`로 옮김(동결).

---

## 아코디언 "열기"가 처음부터 안 보임 — 리뷰 4차

### 원인

닫기(3차, `a019e68`)와 달리 열기는 애초에 클립(reveal) 자체가 없었다.
`is-visible`이 붙는 순간 패널이 곧바로 `overflow: visible` +
`min-height: min-content`가 되어, **클릭한 그 프레임에 폼 내용물이 이미
100% 다 그려진다.** 그 아래로 "빈 공간"만 0.4초에 걸쳐 조용히 자라날
뿐이라 — 실제 내용물은 처음부터 끝까지 그대로 보여서 슬라이드가 안
보이는 게 당연했다(실측: `panel.getBoundingClientRect().height`가 바깥
박스는 아직 624px인 시점에 이미 1156px로 완성).

### 목표 상태

열 때도 닫을 때처럼 실제로 내용물이 점차 드러나는 게 보인다.

### 수정안

닫기 때 쓴 것과 같은 원리 — 열리는 동안에도 패널을 `overflow: hidden`
상태로 유지해 실제로 점차 드러나게 하고, 전환이 "완전히 끝난 후"에만
`overflow: visible`(닫힌 뒤 폼 내용이 늘어나도 안 잘리게)로 바꾼다.
opacity는 닫기(빠른 페이드아웃)와 반대로 **늦게, 짧게** 페이드인해서
초반 reflow 구간을 가린다.

**`InlineSheet.jsx`** — `settled` state 추가(전환 완료 후에만 true),
`onTransitionEnd`에서 열기 완료 시 `setSettled(true)`, 닫기 시작하면
`setSettled(false)`. 클래스에 `is-settled` 추가.

**`day-log.css`**:

```css
.inline-sheet-panel {
  overflow: hidden;
  min-height: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.inline-sheet.is-visible .inline-sheet-panel {
  opacity: 1;
  transition: opacity 0.15s ease 0.25s; /* 0.4s 성장 중 후반 150ms에만 페이드인 */
}
.inline-sheet.is-settled .inline-sheet-panel {
  min-height: min-content;
  overflow: visible;
}
```

### 건드릴 파일 (정확히 2개)

1. `react-app/src/components/day-log/InlineSheet.jsx` — `settled` state.
2. `react-app/src/components/day-log/day-log.css` — 위 CSS.

### 안 건드릴 것

`forceInstant`/`mounted` 로직(닫기용, 3차까지 완성됨) 무변경.
`DayLogPage.jsx`/`DayLogExpenses.jsx` 무변경(새 prop 불필요).

### 위험 요소 — 미리 알려드림

닫기 때와 같은 이유로, 열기도 매 프레임 실제 레이아웃이 다시 계산되는
방식이라 복잡한 폼에선 여전히 약간 뻑뻑해 보일 수 있다. opacity 지연으로
초반(0~250ms, reflow가 가장 심한 구간)은 가리지만, 완벽히 매끈한
"슬라이드"는 아닐 수 있음 — 브라우저 확인 후 여전히 어색하면 지속시간·
지연값을 더 조정하거나, 아예 열기도 페이드 위주(클립 없이 부드럽게
나타나기만)로 바꾸는 대안도 있음.

### §8 4대 질문

1~5 무관 — UI 전환 타이밍만, 구독/값 출처/쓰기창구/hydrate/DB 무변경.

### 검증 방법

- `npm run test:app`.
- 보리 브라우저 실검증: "+ 운행 일지 추가" 클릭 → 이번엔 실제로 내용이
  점차 드러나는 느낌인지, 닫기처럼 이상하게 잘리거나 말리는 느낌은
  없는지.

바로 진행해도 될지 확인 부탁드립니다.
