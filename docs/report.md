# docs/report.md — 리포트 파일 분리설계 착수지시서 (AGENTS §6 200줄 규칙 준수)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①·②(①~④)·③-1·③-2·③-3은 `[x]` 확정됨 — 상세는 `STATUS.md` "완료" 절 참고.

## ③-4 기능 자체는 완료, `[x]`는 이 분리설계 슬라이스 끝난 뒤

작업자 커밋 `cc5583d`("운송비 내역서 요약에 일자별 운행 표 이관") — push 확인됨,
CI "verify" 초록(run `34180303423`, headSha 일치, 3게이트 green), 기능·로직·
테스트는 감시관 §5 리뷰에서 전부 통과(원본과 정확히 대조 확인).

**단, `ReportDetailView.jsx`(333줄)·`lib/report.js`(290줄)가 `AGENTS.md` §6의
"~250줄까지" 상한을 사전 승인 없이 넘어서 `[x]` 보류.** §6은 이 경우
"기계적 분할 말고 분리설계안을 먼저 보고·승인"하도록 정하는데, 작업자가
그 절차 없이 주석만 바꿔 진행했음. **보리 결정(2026-09-08): "분리설계 후속
슬라이스로 진행"** — 아래가 그 분리설계안이다. 기능 변경 없는 순수 파일
분리 리팩터링(§6 예외 조항: "§6이 요구하는 200줄 초과 파일 분리설계... 1회
보고로 끝낸다").

## 분리설계안

### `src/components/ReportDetailView.jsx` (333줄) → 2개 파일로

- **신규 `src/components/ReportSummaryContent.jsx`** — "요약" 화면 전용.
  - `formatWon` import.
  - `ReportDayRow` typedef.
  - `ReportDayTable`(내부)·`renderSummaryDayTables`(내부) 그대로 이동.
  - `export function ReportSummaryContent(...)` 그대로 이동.
  - 예상 ≈195줄.
- **`ReportDetailView.jsx`** (남는 것) — "세부" 화면 + 공용 모달.
  - `formatWon` import.
  - `DetailReportItem`·`DetailReport` typedef.
  - `export function ReportClientPickerModal(...)` 그대로 유지.
  - `export default function ReportDetailContent(...)` 그대로 유지.
  - 예상 ≈145줄.
- 함수 본문은 **한 글자도 바꾸지 않고 파일만 옮긴다**(§6 "기계적 절단 금지"는
  "의미 없이 반으로 자르기" 금지이지, 이번처럼 이미 존재하는 두 화면 경계를
  따라가는 분리는 해당 없음 — 원래도 "요약/세부/모달 응집" 사유였는데, 지금은
  요약 쪽만 커져서 그 경계로 다시 나누는 것).

### `src/lib/report.js` (290줄) → 3개 파일로

- **`report.js`** (남는 것, 공용 계층 — 파일명·공유 헬퍼) — `dash`,
  `buildReportFileName`, `buildDetailReportFileName`, `buildReportImageFileName`,
  `buildDetailReportImageFileName`, `getReportShareCompanyName`,
  `getDetailReportClientContact`. 예상 ≈95줄. (`ReportShareModal.jsx`는 이
  7개만 쓰고 있어 **import 줄 변경 불필요**.)
- **신규 `src/lib/reportSummary.js`** — `buildReportDayRows`·`buildMonthReport`
  그대로 이동(관련 import: `getFixedRouteClient`/`resolveFixedUnitPrice`,
  `callFareTotal`/`dayTripCount`/`getFixedCount`/`getPalletCount`,
  `monthSettlementSummary`, `readOwnerCars` 등 `ownerDataHooks`). 예상 ≈90줄.
- **신규 `src/lib/reportDetail.js`** — `detailReportClientOptions`·
  `detailCommissionLabel`(내부)·`buildDetailReport` 그대로 이동(관련 import:
  `getCallDetails`/`isOffDay`, `getCallDetailCommissionAmount`, `parseCurrencyValue`).
  예상 ≈120줄.
- 여기도 로직 무변경, 이동만.

### 소비처 import 갱신 (로직 변경 없음, import 줄만)

- **`ReportPage.jsx`**: 지금 한 줄로 `../lib/report.js`에서 8개 다 받던 걸
  3줄로 나눔(`report.js`에서 `dash`/`buildReportFileName`류, `reportSummary.js`
  에서 `buildMonthReport`, `reportDetail.js`에서 `buildDetailReport`/
  `detailReportClientOptions`). `ReportDetailContent`/`ReportClientPickerModal`은
  계속 `./ReportDetailView.jsx`에서, `ReportSummaryContent`는 새
  `./ReportSummaryContent.jsx`에서.
- **`ReportShareModal.jsx`**: 무변경(위에서 확인, 4개 함수 전부 `report.js`에
  남음).
- **`src/lib/report.test.js`**: import 3줄로 갱신(어느 파일에서 뭘 가져오는지만
  변경), **테스트 본문·파일 자체는 안 나눔**(테스트 파일은 §6 200줄 예외
  대상이라 나눌 이유 없음, 불필요한 파일 증식 방지).
- **`src/components/ReportDetailView.test.js`** → **`ReportSummaryContent.test.js`로
  파일명 변경**(테스트 대상이 `ReportSummaryContent`이므로 컴포넌트 파일명과
  맞춤), import를 `./ReportSummaryContent.jsx`로 갱신, 본문 무변경.

### 건드릴 파일 요약 (7개, 전부 이동·import 갱신뿐, 로직 변경 0)

1. `src/components/ReportDetailView.jsx` (축소)
2. 신규 `src/components/ReportSummaryContent.jsx`
3. `src/components/ReportDetailView.test.js` → `ReportSummaryContent.test.js`(이름 변경)
4. `src/lib/report.js` (축소)
5. 신규 `src/lib/reportSummary.js`
6. 신규 `src/lib/reportDetail.js`
7. `src/components/ReportPage.jsx` (import 줄만)
8. `src/lib/report.test.js` (import 줄만)

### 안 건드릴 것

- 함수 본문·JSX 마크업·CSS·테스트 assertion — **전부 그대로**, 위치만 이동.
- `ReportShareModal.jsx` — import 그대로라 파일 자체도 무변경.
- `domain/monthSettlement.js`·캘린더 쪽 — 무관.

### 완료 조건

- CI 초록(test/typecheck/build) — **기존 테스트 통과 개수 그대로**(로직
  무변경이므로 결과 달라지면 오히려 실수).
- 감시관 §5: 이번엔 특히 "로직 diff가 실제로 0인지"(이동만 했는지) 확인,
  전 파일 200줄(또는 §6 명시 예외) 이내 확인.
- 브라우저 실검증: **불필요** — 화면 동작 변화 없는 순수 리팩터링(단, 혹시
  모를 import 누락 등 빌드 깨짐은 CI가 이미 잡음).
- 보리 최종 `[x]` — 이 슬라이스 확정되면 **③-4도 함께 `[x]`** 처리(같은
  커밋의 후속 정리이므로).

## 다음 세션 시작 시 할 일

1. 위 분리설계안으로 **보리 착수 승인** 받기.
2. 승인되면 작업자에게 전달.
3. CI 초록 + 감시관 §5 확인되면(브라우저 검증 불필요, 순수 리팩터링) 보리
   `[x]` — ③-4까지 함께 확정.
4. 그 다음은 **이관 계획 ③ 전체 완료** → `STATUS.md` "다음 할 일" ④(매출 탭
   수치 불일치 조사)로 이동.
