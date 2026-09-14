# F-1. "부가세 해제" 레이블 글자 굵기 누락 (2026-09-14, 동결)

`docs/report.md`에서 옮김. 보리 확인·커밋·푸시·CI 초록·확정 완료.

---

## 원인

원본(`style.css:3283-3284`)엔 `.call-vat-row > label:first-child`에
`font-weight: 750`을 주는 **일반 규칙**이 인라인 폼 전용 스코프 규칙과
별도로 있는데, react-app 이식(`3ae7db9`) 때 스코프 규칙(`color`/`font-size`)만
옮기고 이 굵기 규칙을 빠뜨렸다 — "부가세 해제"만 `font-weight: 400`,
옆 레이블("산재보험료"·"거래처" 등)은 750~800.

## 수정

`react-app/src/components/day-log/call-detail-form.css` —
`.work-log-page .call-vat-row > label:first-child { font-size: var(--fs-2); }`에
`font-weight: 750;` 한 줄 추가. 그 외 파일·마크업·로직 무변경.

## 검증

- `npm run test:app` 로컬 통과.
- GitHub Actions `CI`/`Deploy GitHub Pages` 초록
  ([run 34812586948](https://github.com/ya01na111/react-app/actions/runs/34812586948)).
- 원본 `style.css:3284` 값(`750`)과 일치 확인.
- 보리 브라우저 실검증 완료 → `[x]` 확정.

## 결과

- react-app 커밋 `8ced672`("fix: 부가세 해제 레이블 글자 굵기(font-weight 750) 복원"),
  `main`에 push 완료, origin과 동기화.
