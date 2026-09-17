# docs/report.md — 현재 슬라이스 착수지시서

## §12(기사연동관리) 슬라이스 1+2 — 코드 완료, 브라우저 재검증 대기 `[~]`

### 한 일 (react-app 커밋 완료, 아직 push 전)
- 슬라이스 1(`e079822`): 상단 히어로 카드(`personal-intro`) 제거 →
  `driver-summary-card`(제목+설명+연동 중/초대 대기 카운트 칩)로 교체.
- 슬라이스 2(`b88a5f0`): 기사 카드 전체 재구성.
  - 세로 글자 깨짐 버그 수정(`receivable-card-actions` 미import +
    `action-icon-btn` 34px 고정폭 조합 → `driver-connection-card`/
    `driver-card-action-btn` 신설로 교체).
  - "할당 차량/할당 기간" 2단 정보 박스(`driver-assignment-grid`) 추가,
    "할당 중" 칩 제거, 초대코드 줄을 이름 바로 아래 별도 줄로 분리.
  - 버튼 재구성 — 연동 중: 기사 관리/수정/연동 해제(완전 삭제).
    초대 대기: 초대 수정/연동 완료/초대 취소.
  - 기사 초대 모달: 날짜 트리거 아이콘 scoped 숨김(이 모달만,
    `expense-form.css`와 같은 방식 — 공용 `TemporalInput` 컴포넌트는
    안 건드림. 앱 전체로 넓힐지는 보류, 다른 화면 가서 볼 때 재논의).
  - 원본 `driver-link.js`의 `sendDriverInviteSms()` 이관 — "문자 발송"
    버튼 추가(`lib/driverInviteSms.js`). 서버 SMS API 아닌 기기 문자 앱
    `sms:` 스킴이라 새 인프라 없음.

### 알려진 이슈 (보리 확인, 2026-09-17, 미해결 — 기록만 하고 이번 라운드는 안 고침)
- **차량번호(`drvCar`) 필드 삼각 아이콘이 CSS(`::-webkit-calendar-picker-indicator`
  숨김)로도 안 없어짐.** 원인 재조사 필요(다른 pseudo-element이거나
  브라우저별 차이일 수 있음).
- **"문자 발송" 버튼 동작을 보리가 확인 못 함** — 원인 미상 버그로 추정.
  다음 세션에 재조사 필요(어떤 버그인지부터 재확인).

### 다음 세션 시작 시
1. 위 두 알려진 이슈부터 재조사(원인 파악 → 착수지시서 → 승인 → 수정).
2. 문제 없으면 CI push는 보리가 직접 진행 → 초록 확인 → 최종 `[x]` 승인
   → 그때 STATUS.md·본 문서 정리.

### §6 (200줄)
`DriverConnectionPage.jsx` 185줄, `DriverFormModal.jsx` 90줄,
`lib/driverInviteSms.js` 25줄(신규, 순수 함수) — 전부 200줄 이내.
