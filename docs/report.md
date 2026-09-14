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

---

## 다음 슬라이스 (착수 전 대기)

**E의 나머지 항목** — "지금 3개는 목록 미완성"이라던 것 중 아직 안
나온 게 있으면 보리가 계속 줄 것. 나머지가 다 모이면 슬라이스 재분할.

**E 착수 전 P0 — 아직 미해결**: `useExpenseForm.js`의 `setTimeout(420)`
이 `day-log.css` `0.4s` 전환 시간과 숫자로만 묶여 있는 문제
(`docs/sot.md` §4-11) — E-1·F-3은 마크업/CSS만이라 안 건드림. E가
인라인 시트 열림/닫힘 로직 자체를 만질 차례가 오면 그때 결정.

상세·근거는 `docs/ui-comparison-report.md` §1.
