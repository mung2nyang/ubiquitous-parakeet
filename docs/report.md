# docs/report.md — 현재 슬라이스 착수지시서

> **소급 기록**: 아래는 미수금 UI 복원(react-app `12a9dbb`) 착수 전
> 이 세션이 작성한 원인조사 착수지시서다. 당시 커밋을 안 해서 다른
> AI의 구현 이후 이 파일 내용이 구현요약으로 덮어써졌고, 그 뒤 이
> 세션이 다음 슬라이스 설계안으로 다시 덮어쓰며 원본 조사 내용이
> 유실됐었다. 대화 기록에서 복원해 커밋으로 남긴다(보리 지적,
> 2026-09-15). 다음 커밋에서 다시 "현재 슬라이스"(side-menu.css
> 분리설계안)로 교체.

## 미수금/정산 관리 화면 UI 불일치 수정 (보리 스크린샷, 2026-09-15)

### 현재 상태 (원인)

react-app 미수금 화면이 원본과 다른 건 사소한 스타일 차이가 아니라,
**이관 당시 원본 전용 CSS/구조를 안 옮기고 다른 화면(차량·거래처 목록)의
공용 컴포넌트를 잘못 재사용**한 결과. 확인된 원인 5가지:

1. **액션 버튼 글자가 세로로 깨짐(스크린샷의 핵심 증상)** — "상세"·
   "입금 완료" 같은 텍스트 버튼에 `action-icon-btn`을 썼는데, 이
   클래스는 다른 화면 SVG 아이콘 버튼 전용이라 `.management-list-card
   .action-icon-btn{width:34px;height:34px}` 고정 정사각형(`side-menu.css:219-223`).
   텍스트가 34px 폭 안에서 한 글자씩 줄바꿈됨.
   (`ReceivablesListPage.jsx:62-63`, `ReceivableItemCard.jsx:57,70-73`)
2. **원본 전용 버튼 클래스 자체가 이관 안 됨** — 원본
   `.receivable-detail-btn`/`.receivable-complete-btn`(자동 폭,
   `min-height:44px`, 테두리+텍스트 스타일, `style.css:6385-6413`)가
   react-app 어디에도 없음.
3. **카드 골격이 다른 화면 것** — 원본은 세로 스택(제목→기간→차량배지→
   요약→구분선→가로 버튼줄, `style.css:6314-6413`). react-app은
   `management-list-card`(정보 왼쪽/버튼 오른쪽 가로분할, 다른 관리
   화면 공용)를 그대로 씀 — `.receivable-card-actions{flex-direction:
   column}`(`side-menu.css:819-824`)이 그 흔적.
4. **차량 구분이 배지가 아니라 평문** — 원본은 `<span class=
   "management-badge car-type main">메인 차량</span>` 배지
   (`finance.js:1313`). react-app은 `car-sub-text`에 텍스트만 join
   (`ReceivablesListPage.jsx:53`).
5. **탭이 다른 화면 컴포넌트 재사용** — 원본 전용 `.receivable-tabs`/
   `.receivable-tab`(단일 컨테이너, 그리드 2열, `style.css:6284-6312`)
   대신 정비/주유/기타 탭 것(`settings-segmented-control`+`toggle-btn`)을
   재사용 — 분리된 알약 버튼 2개로 보임(스크린샷).

"입금 예정 미수금" 탭 카드(`ReceivableItemCard.jsx`)와 상세 페이지
(`ReceivablesDetailPage.jsx`)도 1·2·3과 같은 `action-icon-btn` 텍스트
버튼 패턴이라 스크린샷엔 안 보여도 똑같이 깨질 것으로 추정 — 브라우저로
확인 필요.

### 확인 필요 → 보리 답변(2026-09-15)

- 안내문구("운행 일지 세부 입력에서 자동으로 모읍니다...") → **삭제**.
- 버튼 라벨 → "상세"는 **"미수금 상세"**로(원본과 동일), "입금 완료"는
  **"입금완료"**로(원본 "입금 완료 처리"와 다름 — 보리가 고른 표현,
  그대로 반영). `ReceivablesListPage.jsx:62-63`.

### 목표 상태

원본 `finance.js`/`style.css`의 `.receivable-*` 전용 클래스 구조를
react-app에 온전히 이식 — 카드 골격(세로 스택+하단 버튼줄)·버튼 스타일
(auto-width 텍스트 버튼)·차량 배지·탭 바를 원본과 동일하게. 단, 안내문구는
삭제하고 버튼 라벨은 "미수금 상세"/"입금완료"(보리 결정, 위).

### 건드릴 파일

- `react-app/src/components/receivables/ReceivablesListPage.jsx`
- `react-app/src/components/receivables/ReceivableItemCard.jsx`
- `react-app/src/components/receivables/ReceivablesDetailPage.jsx`
- `react-app/src/components/receivables/receivables.css` (신규 —
  `side-menu.css`에 흩어진 `.receivable-*` 블록 이동 + 누락된
  `.receivable-detail-btn`/`.receivable-complete-btn`/`.receivable-tabs`/
  `.receivable-tab` 추가)
- `react-app/src/side-menu.css` (이동한 블록 삭제, 1520→더 줄어듦)

### 안 건드릴 것

- `finance.js`/`useReceivablesActions.js`/`useReceivablesData.js` 등
  로직·데이터 흐름 (순수 UI/CSS 문제).
- 다른 관리 화면(차량·거래처)의 `management-list-card`/`action-icon-btn`
  자체 — 그 화면들엔 맞는 스타일이라 안 건드림.
- DB/Supabase 스키마.

### 실패 시 처리

신규 레이어 없음. 실패해도 기존 `management-list-card`/`action-icon-btn`
재사용 상태로 되돌리면 그만(구조적 되돌리기 리스크 없음).

### 실제 구현 결과 (react-app `12a9dbb`, 다른 AI 진행)

`receivables.css` 신규 + 목록/카드/상세 3개 JSX를 위 목표대로 이식.
CI 초록·보리 브라우저 실검증·최종 승인(2026-09-15). §5 리뷰·상세
diff는 `git show 12a9dbb`(react-app).
