# docs/report.md — ③-2 브라우저 검증 결과 확인 중 (이관 계획 ③ "월간 운송료 정산" 위젯 구조 통일)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①·②(①~④)·③-1은 `[x]` 확정됨 — 상세는 `STATUS.md` "완료" 절 참고.

## ③-2 — `[~]` 진행 중, `[x]` 아님 (2026-09-08 정정)

`CalendarPage.jsx`/`CalendarMonthSummary.jsx`를 ③-1의
`monthSettlementSummary`로 연결(`e00a004`) + 보리 브라우저 검증 중 발견한
원본 불일치 2건(제목 문구·원본에 없던 하단 안내/로그아웃 버튼) 수정
(`3045c45`). 코드는 CI 초록·감시관 §5 통과. **감시관이 보리의 애매한
상태 보고를 명시 승인으로 잘못 해석해 `[x]`로 적었다가 보리가 즉시
정정("그럼 확정아니야") — `[~]`로 되돌림.** 지금 보리가 실제로 본 문제
내용 확인 중, 확인되면 여기 기록.

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
