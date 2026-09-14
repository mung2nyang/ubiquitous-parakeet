# F-3. 콜상세 폼 아이콘/스핀버튼/즐겨찾기 SVG 통일 (2026-09-14, 동결)

`docs/report.md`에서 옮김. CI 초록·보리 브라우저 실검증 완료.

---

## 배경

보리가 화면 3장 스크린샷으로 직접 지시 — E-1 확인 후 다시 콜상세
폼으로 돌아가 4가지 추가 지시.

## 지시 내용

1. 화물 톤수 입력의 위/아래 스핀 버튼 삭제.
2. 시간 선택(출발/도착) 트리거 옆 시계 아이콘 삭제.
3. 입금예정일 트리거 옆 달력 아이콘 삭제.
4. 상/하차지 즐겨찾기 칩의 별표(★/☆)를 앱 SVG 스타일과 통일.

## 조사 결과

- **스핀 버튼**: 원본 `#callCargoTonnage`(`index.html:1653`)도
  `type="number"`이지만 스핀 버튼을 숨기는 CSS가 원본에 없음(grep
  확인) — "원본 매칭"이 아니라 보리의 새 요청.
- **시계/달력 아이콘**: E-1에서 `ExpenseFormModal`에 쓴
  `.app-temporal-icon { display:none }` 패턴을 콜상세 스코프
  (`.work-log-page`)에도 적용. 기존 아이콘 크기/색 오버라이드 규칙을
  이걸로 교체.
- **즐겨찾기 별표**: 원본(`script.js:2155-2157`,
  `client-management.js:387`)도 유니코드 문자라 "원본 매칭"이 아니라
  **앱 자체 일관성** 문제 — react-app에 이미 있는 Feather 스타일 SVG
  아이콘 규칙(`day-log/icons.jsx`, `day-log-expenses.css`
  `.maint-fuel-icon`: `fill:none;stroke:currentColor;stroke-width:2;
  stroke-linecap/linejoin:round`)과 같은 방식으로 `StarIcon` 신규
  추가, 채워진/빈 상태는 `.is-filled` 클래스로 `fill:currentColor` 토글.

## 건드린 파일

- `call-detail-form.css` — 아이콘 숨김으로 교체, 화물 톤수 스핀버튼
  숨김 규칙 추가.
- `day-log/icons.jsx` — `StarIcon` 추가.
- `day-log/LocationShortcuts.jsx` — 유니코드 문자를
  `<StarIcon filled={isPinned} />`로 교체.
- `day-log/location-shortcuts.css` — `.location-chip-pin` flex 중앙
  정렬, `.star-icon`/`.is-filled` 규칙 추가.

## 검증

- `npm test`(791개 전부 통과) · `npm run typecheck`(0 에러) ·
  `npm run lint`(경고 없음) · `npm run build`(성공).
- GitHub Actions `CI`/`Deploy GitHub Pages` 초록
  ([run 34823011388](https://github.com/ya01na111/react-app/actions/runs/34823011388)).
- 보리 브라우저 실검증 완료(화물 톤수 스핀버튼·시간/입금예정일
  아이콘·즐겨찾기 별표 전부 확인) → `[x]` 확정.

## 결과

react-app 커밋 `83de8e9`, `main`에 push 완료, origin과 동기화.
