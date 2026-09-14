# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(아코디언 인라인 시트 애니메이션 1~6차 `[x]`, 부가세
> 레이블 크기 `[x]`, 거래처 스코프 종결 `[x]`) 상세는
> `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`로 옮김(동결).
> F-1(부가세 해제 레이블 글자 굵기 `[x]`, react-app `8ced672`) 상세는
> `docs/archive/f1-vat-label-font-weight-2026-09-14.md`로 옮김(동결).
> F-2(다크모드 datalist 자동완성 입력창 밝아짐 `[x]`, react-app `ed83703`)
> 상세는 `docs/archive/f2-autofill-dark-mode-2026-09-14.md`로 옮김(동결).

---

## 다음 슬라이스 (착수 전 대기)

**§1 남은 순서: E → D.** 둘 다 아직 착수지시서 작성 전 — 착수 조건 미충족.

- **E. 정비/주유/기타 패널** — 착수 전 보리가 나머지 항목부터 설명 필요
  (지금 3개는 목록 미완성). 다 모이면 슬라이스 재분할.
  + E 착수 전 P0 먼저 확인: `useExpenseForm.js`의 `setTimeout(420)`이
  `day-log.css` `0.4s` 전환 시간과 숫자로만 묶여 있는 문제
  (`docs/sot.md` §4-11) — `InlineSheet`가 자기 전환 종료를 이벤트로
  알려주는 방식으로 바꿀지 여부를 E 시작 전에 결정.
- **D. 시간입력 위젯(`app-temporal` 대체)** — 새 공용 컴포넌트 작업이라
  한 슬라이스로 안 끝남, §1 중 제일 크고 마지막. 착수 전 별도 하위
  슬라이스 계획 필요.

상세·근거는 `docs/ui-comparison-report.md` §1.
