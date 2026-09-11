# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(아코디언 인라인 시트 애니메이션 1~4차 `[x]`, 부가세
> 레이블 크기 `[x]`, 거래처 스코프 종결 `[x]`) 상세는
> `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`로 옮김(동결).

---

## 정비/주유/기타 "종류 선택 → 실제 폼" 전환이 애니메이션 없이 즉시 바뀜 — 5차

### 원인

`grid-template-rows`는 **값 자체가 바뀔 때만**(0fr↔1fr) 전환이 걸린다.
종류를 고르면 시트는 계속 열려 있는 채(값은 내내 `1fr`) 안의 내용물만
바뀌는데, 이건 "값 변화"가 아니라 콘텐츠 크기 변화라 전환이 아예 안
걸린다 — CSS만으로는 못 고친다(실측: 219px→511px가 25ms 안에 즉시 점프,
`is-settled` 상태 그대로 유지된 채였음).

### 목표 상태

종류를 고르면 실제 폼이 나타날 때도 슬라이드가 보인다.

### 수정안

내용 교체를 "잠깐 닫혔다가 새 내용으로 다시 열리는" 것으로 처리한다 —
이미 검증된 열기/닫기 사이클을 그대로 재사용(InlineSheet 안 건드림).

**`useExpenseForm.js`의 `openAdd(kind)`** — 종류 선택 패널에서 불렸을 때만
(`kindPick`이 이미 true인 경우) 즉시 열지 않고, 먼저 `kindPick`을 꺼서
닫히게 한 뒤(닫기 애니메이션 재생) 그 시간만큼 지나서 `modalOpen`을 켠다
(직접 "+ 정비 추가" 버튼처럼 이미 닫힌 상태에서 부르는 경우는 지금처럼
즉시 처리, 무변경):

```js
function openAdd(kind) {
  if (kindPick) {
    setKindPick(false)
    setTimeout(() => {
      setEditingId(null)
      setDraft(emptyExpenseDraft(kind, dateKey, logId !== 'main' ? logId : undefined))
      setModalOpen(true)
    }, 420)
    return
  }
  setKindPick(false)
  setEditingId(null)
  setDraft(emptyExpenseDraft(kind, dateKey, logId !== 'main' ? logId : undefined))
  setModalOpen(true)
}
```

### 미리 알려드릴 트레이드오프

종류를 고른 뒤 실제 폼이 뜰 때까지 **약 0.4~0.5초 더 걸립니다**(짧게
접혔다가 다시 펼쳐지는 동작 하나가 끼어듦). CSS 트릭의 구조적 한계상
"즉시 전환 + 슬라이드 둘 다"는 안 되고 이 중 하나만 고를 수 있음 —
이 지연이 거슬리면 5차는 접고 "종류 선택 후 폼은 즉시 나타난다"로
그대로 두는 것도 방법입니다.

### 건드릴 파일 (정확히 1개)

`react-app/src/components/day-log/useExpenseForm.js` — `openAdd` 함수만.

### 안 건드릴 것

`InlineSheet.jsx`·`day-log.css`(1~4차 완성본) 무변경. `openEdit`(기존
항목 수정)은 kindPick을 거치지 않아 무변경.

### §8 4대 질문

1~5 무관 — 폼 여닫는 타이밍만, 구독/값 출처/쓰기창구/hydrate/DB 무변경.

### 검증 방법

- `npm run test:app`.
- 보리 브라우저 실검증: "차량 정비/주유/기타" → "+ 추가" → "정비" 선택 →
  실제 정비 폼이 슬라이드로 나타나는지(살짝 늦게 뜨는 건 의도된 지연).

이 방향(0.4~0.5초 지연 감수)으로 진행해도 될지 확인 부탁드립니다.
