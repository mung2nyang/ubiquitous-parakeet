# D-3. 정비/주유/기타 TemporalInput 연결 + centered 공용 modifier (2026-09-14, 동결)

`docs/report.md`에서 옮김. CI 초록·보리 브라우저 실검증 완료.
**D(시간입력 위젯, `app-temporal` 대체) 전체 완료.**

---

## 목표

`ExpenseFormModal.jsx`의 `expenseDate` 1개를 `TemporalInput`으로 교체.
D의 마지막 하위 슬라이스.

## 조사 결과 — D-1과 스코프 CSS가 사실상 같음

원본 `style.css:6655-6699`(`#maintRecordModal`/`#fuelDetailModal`)의
트리거 가운데 정렬 CSS가 D-1(콜상세)에서 이미 포팅한 것과 핵심 5개
선언이 완전히 같음. 보리 지시(2026-09-14, "중복 3개 이상은 공용
컴포넌트화")에 따라 화면 2곳에 같은 CSS를 복붙하는 대신
`TemporalInput`에 `centered` prop을 추가하고 공용 `.is-centered`
modifier로 뽑았다.

## 구현

- `ExpenseFormModal.jsx` — `expenseDate` 1줄 교체, `lockDate` prop을
  `TemporalInput`의 `disabled`로 매핑. CSS 파일 변경 없음(공용
  modifier만으로 완결).
- `TemporalInput.jsx` — `centered` prop 추가(트리거에 `is-centered` 클래스).
- `temporal-input.css` — `.is-centered` 공용 모디파이어(핵심 5선언) 추가.
- (동반) `CallDetailForm.jsx`·`call-detail-form.css` — D-1의 중복 CSS를
  공용 modifier로 옮기고 화면 전용 디테일만 남김. **computed style은
  이전과 100% 동일**(순수 소스 정리, 상세는
  `docs/archive/d1-call-detail-form-temporal-2026-09-14.md` 후속 기록).
- `ExpenseDraft.date`가 `string|undefined`라 타입 에러 — `|| ''` 폴백.

## 검증

- `npm test`(787개 전부 통과, D-1 관련 테스트도 회귀 없음).
- `npm run typecheck`(0 에러) · `npm run lint`(경고 없음) ·
  `npm run build`(성공).
- GitHub Actions `CI`/`Deploy GitHub Pages` 초록
  ([run 34819947566](https://github.com/ya01na111/react-app/actions/runs/34819947566)).
- 보리 브라우저 실검증 완료 → `[x]` 확정.

## 결과

react-app 커밋 `93a4f2c`, `main`에 push 완료, origin과 동기화.

## D 전체 마무리

D-0~D-3 전부 `[x]`. `app-temporal` 대체 완료 — 콜상세·기사관리·
세금계산서·정비/주유/기타 4화면, 원본 date/time input 7곳 전부
`TemporalInput` 하나로 통일. 다음은 E(정비/주유/기타 패널, 별도 항목).
