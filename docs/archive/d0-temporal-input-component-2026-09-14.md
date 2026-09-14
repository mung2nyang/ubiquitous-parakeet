# D-0. 공용 TemporalInput 컴포넌트 (2026-09-14, 동결)

`docs/report.md`에서 옮김. CI 초록·사용자 확인 완료.

---

## 목표

원본 `ui-widgets.js`의 `initAppTemporalInputs`를 포팅 — 네이티브
`<input type="date">`/`<input type="time">`와 동일한 `value`/`onChange`
계약을 유지하는 React 컴포넌트. 트리거 버튼 + `document.body` 포털
스크롤 컬럼 메뉴(date: 연/월/일 3컬럼, time: 시/분 2컬럼).

## 구현

200줄 대응으로 3개 파일 분리:
- `react-app/src/components/shared/TemporalInput.jsx`(155줄) — 오케스트레이션
  (포지셔닝, 열림/닫힘, 외부 클릭/Escape, 커밋 규칙)
- `react-app/src/components/shared/TemporalColumns.jsx`(83줄) — 연/월/일·
  시/분 컬럼 렌더
- `react-app/src/components/shared/temporalValue.js`(38줄) — `pad`/
  `daysInMonth`/`parseCursor` 순수 함수
- `react-app/src/components/shared/temporal-input.css` — 원본
  `style.css:935-1034` 기본 스타일 포팅(`--subtext-color`는 react-app
  실제 변수명 `--sub-text-color`로 정정)

커밋 규칙은 원본과 동일: 날짜는 연/월 클릭이 로컬 상태만 바꾸고 일
클릭에서만 `onChange` 호출+닫힘. 시간은 시 클릭에서 즉시 `onChange`
호출하되 메뉴는 유지, 분 클릭에서 최종 커밋+닫힘.

포지셔닝은 부모 modal의 `overflow:hidden`을 벗어나야 해서 앞서 있던
`CalendarDateSelect`(비-modal, `position:absolute`)와 달리
`createPortal` + `position:fixed`(원본 `positionAnchoredOverlay` 로직
포팅: 우측 뷰포트 초과 시 좌측으로 당김).

## 테스트로 잡은 버그 2개

1. 외부 클릭 판정에 쓴 전역 `Node`가 테스트 환경(jsdom, `setupDom.js`)엔
   없어 `ReferenceError` — `window.Node`로 수정.
2. 포지셔닝 테스트의 기대값이 작성자 산수 오류(224가 아니라 232)였던
   걸 재확인해 테스트 쪽을 고침(컴포넌트 로직 자체는 원본과 정확히
   일치, 문제없었음).

## 검증

- `npm test`(unit 628 + app 159, 신규 테스트 4개 포함 전부 통과).
- `npm run typecheck` 0 에러(cursor 상태를 date/time 공용 shape로
  통일해 union 타입 좁히기 에러 해결).
- `npm run lint` 신규 파일 경고 없음.
- `npm run build` 성공.
- GitHub Actions `CI`/`Deploy GitHub Pages` 초록
  ([run 34815168484](https://github.com/ya01na111/react-app/actions/runs/34815168484)).
- 화면 미연결이라 브라우저 실검증은 대상 없음(D-1부터 해당).

## 결과

react-app 커밋 `e65b2c0`, `main`에 push 완료, origin과 동기화. 기존
파일(호출부) 무변경 — D-1~D-3에서 화면별로 연결.
