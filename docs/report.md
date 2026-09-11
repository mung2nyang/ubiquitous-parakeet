# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(아코디언 인라인 시트 애니메이션 1~5차 `[x]`, 부가세
> 레이블 크기 `[x]`, 거래처 스코프 종결 `[x]`) 상세는
> `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`로 옮김(동결).

---

## 정비/주유/기타 "취소/저장"으로 닫을 때 슬라이드가 안 보임 — 6차 (진짜 버그)

### 원인

`InlineSheet.jsx`는 자기 wrapper(`mounted` state)는 전환(`transitionend`)이
끝날 때까지 잘 살려두는데, **실제 내용물은 부모가 별도로 이중 조건부
렌더링** 하고 있었다 —
[`DayLogExpenses.jsx:42-54`](../react-app/src/components/day-log/DayLogExpenses.jsx:42):
`{expenseForm.kindPick && <ExpenseSelectPanel/>}` /
`{expenseForm.modalOpen && <ExpenseFormModal/>}`.

"취소"를 누르면 `modalOpen`이 꺼지고, 이건 `InlineSheet`의 `open` prop도
꺼지게 하지만 **동시에** 부모 쪽 조건부가 즉시 `false`가 되어 실제 폼
내용물이 그 자리에서 사라진다. `InlineSheet`의 wrapper(`inline-sheet-panel`
div)는 0.4초 동안 DOM에 남아있지만 **그 안이 비어서** `min-content`가
0이 되고, 결국 높이가 처음부터 끝까지 0으로 렌더된다(실측:
MutationObserver로 확인 — wrapper는 409ms까지 남아있는데 내용물/높이는
4ms만에 이미 0).

콜상세가 이 문제가 없었던 이유: `CallDetailForm`은 이런 이중 조건부 없이
그냥 계속 자식으로 넘어가서, `InlineSheet`의 `mounted` 하나로만 제어된다.
정비/주유/기타만 부모 쪽에 (kindPick/modalOpen 전환용으로 원래 있던)
중복 조건이 있어서 이 사각지대에 걸렸다.

### 목표 상태

정비/주유/기타 폼도 콜상세처럼 취소/저장으로 닫을 때 실제 슬라이드가
보인다.

### 수정안

`InlineSheet`가 "열려 있던 동안의 마지막 children"을 기억해뒀다가,
닫히는 동안(`!open` && 아직 `mounted`)엔 부모가 그 사이 새로 넘긴(이미
비어버렸을 수 있는) children 대신 그 마지막 내용물을 계속 보여준다.

```jsx
// InlineSheet.jsx
import { useEffect, useRef, useState } from 'react'

export default function InlineSheet({ open, forceInstant = false, className = '', children }) {
  const [mounted, setMounted] = useState(open)
  const [settled, setSettled] = useState(false)
  const lastChildrenRef = useRef(children)
  if (open) lastChildrenRef.current = children

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    setSettled(false)
    if (forceInstant) setMounted(false)
  }, [open, forceInstant])

  function handleTransitionEnd(event) {
    if (event.target !== event.currentTarget) return
    if (event.propertyName !== 'grid-template-rows') return
    if (open) setSettled(true)
    else setMounted(false)
  }

  return (
    <div
      className={`inline-sheet ${className}${open ? ' is-visible' : ''}${settled ? ' is-settled' : ''}`.trim()}
      aria-hidden={!open}
      onTransitionEnd={handleTransitionEnd}
    >
      {mounted && <div className="inline-sheet-panel">{open ? children : lastChildrenRef.current}</div>}
    </div>
  )
}
```

바뀐 줄은 `useRef` import, `lastChildrenRef` 선언·갱신 한 줄, children
렌더 부분 삼항연산자 하나뿐 — 나머지 로직(mounted/settled/forceInstant)은
무변경.

### 건드릴 파일 (정확히 1개)

`react-app/src/components/day-log/InlineSheet.jsx`만.

### 안 건드릴 것

`DayLogExpenses.jsx`/`DayLogPage.jsx`/`day-log.css` 무변경 — 부모의 이중
조건부는 그대로 둬도 된다(정비 종류 전환 자체엔 필요한 로직이라 건드릴
필요 없음, `InlineSheet` 쪽에서 흡수).

### §8 4대 질문

1~5 무관 — children 렌더 타이밍만, 구독/값 출처/쓰기창구/hydrate/DB 무변경.

### 검증 방법

- `npm run test:app`.
- 보리 브라우저 실검증:
  1. "차량 정비/주유/기타" → "+ 정비 추가" → 폼 열기(정상 확인됨) →
     "취소" → 이번엔 실제로 접히는 슬라이드가 보이는지.
  2. "+ 추가"(종류 선택) → 종류 고름(5차 재열림 확인됨) → 그 폼도
     "취소"/"저장"으로 닫을 때 슬라이드 보이는지.
  3. 콜상세 열기/닫기는 이번 수정으로 회귀 없는지(그대로 잘 되어야 함).

바로 진행해도 될지 확인 부탁드립니다.
