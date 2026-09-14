# D-2. 기사 관리·세금계산서 TemporalInput 연결 (2026-09-14, 동결)

`docs/report.md`에서 옮김. CI 초록·보리 브라우저 실검증 완료.

---

## 목표

`DriverFormModal.jsx`(할당 시작일·종료일)·`TaxInvoiceDraftModal.jsx`
(작성일자) 네이티브 date input 3개를 `TemporalInput`으로 교체.

## 조사 결과

원본 `style.css` grep 결과 `driverModal`/`taxInvoiceModal`에 대한
`app-temporal` 스코프 규칙이 하나도 없음(D-1의 `#callDetailModal`과
다름) — CSS 변경 없이 D-0 기본 스타일만으로 원본과 동일.

## 구현

- `DriverFormModal.jsx` 2줄, `TaxInvoiceDraftModal.jsx` 1줄 교체.
- 도중 발견: `DriverDraft.startDate`/`endDate`가 `string|undefined`라
  `TemporalInput`의 `value: string` 계약과 안 맞아 타입 에러 — 호출부에
  `|| ''` 폴백 추가(`TaxInvoiceDraftModal`의 기존 관례와 동일).
- CSS 추가 0줄 — 공용 `temporal-input.css`만으로 완결(4개 연결 화면 중
  가장 깔끔한 사례, "중복 3개 이상만 공용화" 원칙이 CSS에도 자연히
  적용된 것을 보리가 확인).

## 검증

- `npm test`(787개 전부 통과) · `npm run typecheck`(0 에러) ·
  `npm run lint`(경고 없음) · `npm run build`(성공).
- GitHub Actions `CI`/`Deploy GitHub Pages` 초록
  ([run 34818179006](https://github.com/ya01na111/react-app/actions/runs/34818179006)).
- 보리 브라우저 실검증 완료 → `[x]` 확정.

## 결과

react-app 커밋 `c395ab3`, `main`에 push 완료, origin과 동기화.
