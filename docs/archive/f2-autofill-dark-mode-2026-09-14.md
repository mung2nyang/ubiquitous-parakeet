# F-2. 다크모드 datalist 자동완성 입력창 밝아짐 (2026-09-14, 동결)

`docs/report.md`에서 옮김. 보리 확인·커밋·푸시·CI 초록·브라우저 실검증·확정 완료.

---

## 원인

`#callClient`(거래처, `list="callClientOptions"`)처럼 `<datalist>`가 붙은
입력창에서 목록에서 값을 고르면, 크롬이 이걸 "자동완성됨"(`:-webkit-autofill`)
으로 취급해 앱 CSS와 무관하게 브라우저가 강제로 밝은 배경(`rgb(232,240,254)`)
+ 검은 글자를 입힌다(실측: `el.matches(':-webkit-autofill')` → `true`).
일반 `background-color`로 덮어쓸 수 없고 `-webkit-box-shadow` inset
트릭으로 덮어써야 한다.

앱 전체에서 `list=` 쓰는 입력창은 정확히 2곳 — `#callClient`(일일운행
콜상세, 거래처)와 `#drvCar`(기사 관리, 차량번호) — 둘 다 같은 문제이고
둘 다 공용 클래스 `.input-box`를 쓰므로 한 곳만 고치면 다 잡힘.

## 수정

`react-app/src/shared-controls.css` — `.input-box` 규칙 바로 다음에
`.input-box:-webkit-autofill`(+`:hover`/`:focus`) 9줄 추가
(`-webkit-text-fill-color`, `-webkit-box-shadow`/`box-shadow` inset,
`caret-color`, `transition: background-color 9999s` — 크롬 자동완성
슬쩍 밝아지는 애니메이션까지 차단). `CallDetailForm.jsx`/
`DriverFormModal.jsx` 무변경.

## 200줄

기존 201줄(승인 이력 없음) +10줄 → 211줄. 분리설계 없이 진행 —
보리 「f2진행해」(2026-09-14) 승인.

## 검증

- `npm run test:app` 로컬 통과.
- GitHub Actions `CI`/`Deploy GitHub Pages` 초록
  ([run 34813340222](https://github.com/ya01na111/react-app/actions/runs/34813340222)).
- 적용 대상 확인: `CallDetailForm.jsx:156` `#callClient`,
  `DriverFormModal.jsx:44` `#drvCar` 둘 다 `.input-box` 클래스 사용.
- 보리 브라우저 실검증(다크모드, 거래처/차량번호 드롭다운 둘 다) 완료
  → `[x]` 확정.

## 결과

- react-app 커밋 `ed83703`("fix: 다크모드 datalist 자동완성 시 입력창
  밝은 배경 덮어쓰기"), `main`에 push 완료, origin과 동기화.
