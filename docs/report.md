# docs/report.md — ③-2 브라우저 검증 결과 확인 중 (이관 계획 ③ "월간 운송료 정산" 위젯 구조 통일)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①·②(①~④)·③-1은 `[x]` 확정됨 — 상세는 `STATUS.md` "완료" 절 참고.

## ③-2 — `[~]` 진행 중, `[x]` 아님 (2026-09-08)

`CalendarPage.jsx`/`CalendarMonthSummary.jsx`를 ③-1의
`monthSettlementSummary`로 연결(`e00a004`) + 수정 커밋 2개:
- `3045c45` — 제목 문구·원본에 없던 하단 안내/로그아웃 버튼 제거.
- `74e90ae` — 지출 3행(정비/주유/기타) 아이콘·색상·점선 구분선·행 순서를
  원본(`index.html:481-508`)과 맞춤. 감시관이 원본·react 두 화면을
  동시에 띄워(`static-preview`/`react-app-dev`) 보리가 보낸 주석 캡처와
  대조해 정확한 차이 특정 후 수정 지시.

세 커밋 다 CI 초록·감시관 §5 통과. 색상 미세 차이 1건은 보리가 확인 후
수용(추가 수정 안 함). **남은 건 보리의 명시적 최종 `[x]` 승인뿐** —
"검증완"류 애매한 상태 보고를 승인으로 넘겨짚지 않는다(감시관이 한 번
실수했던 부분, 정정 기록 위 STATUS.md 참고).

## ③-3(리포트 요약 화면 연결) — ③-2 `[x]` 확정 후 착수, 아직 착수지시서 없음

착수 전 조사·지시서 작성 필요. 미리 확인해둘 것:
- `lib/report.js`의 `buildMonthReport`가 `monthWorkFareSummary`를 쓰고
  있음(③-2 이후 이 함수의 유일한 소비처) → `monthSettlementSummary`로
  교체하면 `domain/day-record.js`의 `monthWorkFareSummary` 자체를
  지울지(소비처 0) 결정 필요.
- `ReportPage.jsx`/`components/ReportDetailView.jsx`의
  `ReportSummaryContent`가 지금 어떤 필드(`trips`/`unitPrice`/`fare`/`vat`/
  `total`/`maint`/`fuel`/`misc`)로 렌더하는지, 캘린더 카드와 같은 구조
  (거래처별 행·파렛트·서브수수료 등)로 갱신할 때 `report.js`(239줄, §6
  250 근접)·`ReportDetailView.jsx`(219줄) 200줄 예외 사유 재검토 필요.
- 리포트 화면은 메인 차량 전용(서브차량 리포트 없음, `STATUS.md` "후속
  nit" 기존 기록) — ③-3에서 이 범위를 넓히지 않음(별도 상의 대상).

## 다음 세션 시작 시 할 일

1. 위 확인 사항 조사 후 ③-3 착수지시서 작성.
2. 사용자 착수 승인 → 작업자 전달.
