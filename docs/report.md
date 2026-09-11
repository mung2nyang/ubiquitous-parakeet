# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(아코디언 인라인 시트 애니메이션 1~6차 `[x]`, 부가세
> 레이블 크기 `[x]`, 거래처 스코프 종결 `[x]`) 상세는
> `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`로 옮김(동결).

---

## 다크모드에서 거래처 드롭다운 선택 시 입력창이 라이트모드처럼 밝아짐 (§1-F)

### 원인

`#callClient`(거래처, `list="callClientOptions"`)처럼 `<datalist>`가 붙은
입력창에서 목록에서 값을 고르면, 크롬이 이걸 "자동완성됨"(`:-webkit-autofill`)
으로 취급해 **앱 CSS와 무관하게 브라우저가 강제로 밝은 배경(`rgb(232,240,254)`)
+ 검은 글자**를 입힌다(실측: `el.matches(':-webkit-autofill')` → `true`).
이 강제 스타일은 일반 `background-color`로 덮어쓸 수 없고, 반드시
`-webkit-box-shadow` inset 트릭으로 덮어써야 한다(크롬 자동완성의 잘
알려진 동작·해결법).

앱 전체에서 `list=` 쓰는 입력창은 정확히 2곳 — `#callClient`(일일운행
콜상세, 거래처)와 `#drvCar`(기사 관리, 차량번호) — 둘 다 같은 문제.
공용 클래스 `.input-box`에 고치면 한 번에 다 잡힘.

### 목표 상태

다크모드에서 거래처/차량번호 드롭다운으로 값을 골라도 입력창이 다른
입력창들과 같은 다크 배경·글자색을 유지한다.

### 수정안 (`shared-controls.css`, `.input-box` 규칙 바로 아래에 추가)

```css
.input-box:-webkit-autofill,
.input-box:-webkit-autofill:hover,
.input-box:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--text-color);
  -webkit-box-shadow: 0 0 0 1000px var(--input-bg) inset;
  box-shadow: 0 0 0 1000px var(--input-bg) inset;
  caret-color: var(--text-color);
  transition: background-color 9999s ease-in-out 0s;
}
```

`--input-bg`/`--text-color`는 이미 라이트/다크 테마별로 정의된 변수라
(`account-flow.css`) 새 변수 불필요 — 라이트모드에서도 자동으로 맞는 색.
`transition` 줄은 크롬이 자동완성 시 배경색을 애니메이션으로 슬쩍
밝게 보여주는 것까지 막는 표준 트릭.

### 건드릴 파일 (정확히 1개)

`react-app/src/shared-controls.css` — `.input-box` 규칙(175번째 줄)
바로 다음에 위 9줄 추가.

### 안 건드릴 것

`CallDetailForm.jsx`/`DriverFormModal.jsx` 무변경 — 마크업·로직 그대로,
공용 CSS 한 곳만 고치면 둘 다 해결.

### §6 200줄 참고

이 파일은 이미 201줄(기존 상태, 승인 이력 없음) — 이번에 9줄 추가로
210줄. 필요하면 분리설계 검토하겠습니다, 우선 이대로 진행해도 괜찮은지
알려주세요.

### §8 4대 질문

1~5 무관 — 순수 CSS, 구독/값 출처/쓰기창구/hydrate/DB 전부 무변경.

### 검증 방법

- CI 자동(test·typecheck·build).
- 보리 브라우저 실검증(다크모드): 거래처 등록 → 일일운행 콜상세에서
  드롭다운으로 그 거래처 선택 → 입력창이 밝아지지 않는지. 기사 관리 →
  차량번호 드롭다운도 동일하게 확인.

바로 진행해도 될지 확인 부탁드립니다.
