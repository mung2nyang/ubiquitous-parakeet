# docs/report.md — ③-4 착수지시서 (이관 계획 ③ "월간 운송료 정산" 위젯 구조 통일, 마지막 조각)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①·②(①~④)·③-1·③-2·③-3은 `[x]` 확정됨 — 상세는 `STATUS.md` "완료" 절 참고.

## ③-3 완료 (2026-09-08)

`lib/report.js`의 `buildMonthReport`를 `monthSettlementSummary`로 교체,
`ReportSummaryContent`를 원본 구조(총 운행거리·기본 운송료 합산 1행·거래처별
행·부가세·계)로 재작성 — react-app `e71f82b`. CI 초록·감시관 §5 통과·보리
브라우저 검증 후 **명시 승인("승인") 받고 `[x]`**. 상세는 `STATUS.md` "완료" 절.

---

## ③-4 착수지시서: 리포트 요약 화면 "중간 일자별 표" 이관

### 배경

③-3 브라우저 검증 중 보리가 발견 — 원본 운송비 내역서 요약 화면은
**상단 정보표 → 중간 일자별 표 → 하단 요약카드** 3단 구조인데, react-app은
정보표 → 바로 요약카드로 건너뛰어 **중간 표가 아예 없다.** ③-3 착수지시서
작성 시 감시관이 조사에서 놓친 부분(감시관 실수, `docs/report.md` 이전 기록
참고). 이관 우선순위 원칙(원본에 있던 기능 최우선)상 이번 슬라이스로 포팅한다.

### 원본 구조 (`ubiquitous-parakeet/script.js`)

- `createTableHTML(items, showPallet)`(`script.js:4756-4787`) — 표 생성.
  - 컬럼: 날짜 / 운행(횟수 또는 "휴무") / 파렛트(옵션) / 금액.
  - `showPallet`이면 날짜 30%·운행 20%·파렛트 20%·금액 30%, 아니면 날짜 35%·
    운행 25%·금액 40%.
  - 각 행: `{월}월 {일}일` · (`isOff`면 "휴무", 아니면 `{workVal}회`) ·
    (파렛트 컬럼 있으면 `{palletCount}장` 또는 "-") · `{amount.toLocaleString()}원`.
- `buildReportPage`(`script.js:4858-5016`) — 표에 들어갈 `workList` 계산.
  - 그 달 1일~말일 순회, `workData[dateKey]`가 **있는 날짜만** 포함(레코드
    자체가 없는 날은 표에 아예 안 나옴).
  - `record.isOff`면 `{day, isOff:true, workVal:0, palletCount:0, amount:0}` 그대로 push.
  - 아니면 `dayWorkCount`(고정노선 횟수 + 콜상세 유효횟수, 공차 제외·혼짐은
    `pending`/`-1`/undefined일 때만 1회 — 기존 `dayTripCount`와 동일 규칙),
    `dayPalletCount`(`showPallet`일 때만 `record.palletCount`),
    `dayFare`(고정노선 금액 + 콜상세 fare 합, 기존 `callFareTotal`+`getFixedCount*unitPrice`와
    동일), `dayPalletFare`(`dayPalletCount * palletUnitPrice`) 계산 →
    `dayWorkCount > 0 || dayPalletCount > 0`일 때만 push(둘 다 0인 날은 레코드가
    있어도 표에서 빠짐), `amount = dayFare + dayPalletFare`.
  - `showPallet = (isMain ? fixedOn : subFixedOn) && fixedRouteClient?.palletOn`
    (리포트는 항상 메인이라 `fixedOn && fixedRouteClient?.palletOn`).
- **PDF/이미지 내보내기 시 2단 분할**: `isForExport`면 `workList`를
  `Math.ceil(length/2)`로 앞/뒤 반씩 나눠 `.report-split-container` 안에
  `.report-split-column` 두 개로 나란히 렌더(원본 CSS는
  `ubiquitous-parakeet/style.css:2880-2889`, `display:flex; gap:8px` +
  `flex:1; width:50%` — 그대로 포팅). 화면에서 볼 땐(내보내기 아닐 때)
  분할 없이 표 하나.

### 재사용할 기존 함수 (새 계산기 만들지 않음)

`domain/day-record.js`의 `getFixedCount`·`getPalletCount`·`callFareTotal`·
`dayTripCount`(고정+콜 횟수 합, 혼짐/공차 규칙 이미 반영됨) 그대로 재사용.
고정노선 단가·파렛트 단가는 `buildMonthReport`에서 이미 계산 중인
`unitPrice`/`fixedRouteClient`에서 그대로 가져다 쓴다(중복 계산 금지).

### 건드릴 파일

1. **`src/lib/report.js`**
   - 신규 순수 함수(예: `buildReportDayRows(workData, year, monthIndex, { unitPrice, fixedRouteClient, showPallet })`)
     — 위 원본 규칙대로 `Array<{ day: number, isOff: boolean, workVal: number, palletCount: number, amount: number }>` 반환.
   - `buildMonthReport`에 `days`(위 배열)·`showPallet`(boolean) 필드 추가.
     `showPallet`은 `!!practiceSettings.fixedOn && !!fixedRouteClient?.palletOn`
     (이미 만들어 둔 `fixedRouteClient`·`practiceSettings` 재사용).

2. **`src/components/ReportDetailView.jsx`**
   - `ReportSummaryContent` 안, `info-table`과 `summary-card` 사이에 표 렌더
     추가(원본 순서 그대로: 정보표 → 표 → 요약카드). 기존 `.report-table` CSS
     클래스 재사용(이미 세부 내역서 표가 쓰고 있음), 새 클래스 발명 최소화.
   - `isExporting` prop 추가(부모가 PDF/이미지 저장 중인지 내려줌) — 켜져
     있으면 `days`를 반으로 나눠 `report-split-container`/`report-split-column`
     두 칸으로, 꺼져 있으면 표 하나로.
   - `days`가 빈 배열이면 원본처럼 "해당 월의 운송 내역이 없습니다." 1행
     표시(`script.js:4997-5003` 문구 그대로).

3. **`src/components/ReportPage.jsx`**
   - `ReportSummaryContent`에 `isExporting={savingPdf || savingImage}` 전달(이미
     있는 두 state 재사용, 새 state 안 만듦).

4. **`src/side-menu.css`**
   - `.report-split-container`/`.report-split-column` 포팅(원본
     `style.css:2880-2889`과 값 동일, 위 참고).

5. **테스트**
   - `report.test.js`에 `buildReportDayRows`(또는 `buildMonthReport`의 `days`)
     케이스: 레코드 없는 날 제외, `isOff` 날 "휴무" 처리, 작업 0건인 날 제외,
     혼짐/공차 카운트 규칙, `showPallet` on/off 금액 대조 — 손계산 기대값과 비교.
   - `ReportDetailView.test.js`에 표 렌더 테스트 추가: 정상 렌더·빈 달 문구·
     `isExporting`일 때 2단 분할(두 `.report-table`로 나뉘는지)·파렛트 컬럼
     on/off.

### 안 건드릴 것

- `ReportDetailContent`(세부 내역서) — 이미 원본과 일치, 이번 슬라이스와 무관.
- `domain/monthSettlement.js`·`CalendarMonthSummary.jsx`·`CalendarPage.jsx` — 무변경.
- ③-3에서 만든 요약카드 구조(총 운행거리·거래처별 행 등) — 무변경, 표만 그
  위에 추가.

### 실패 시 처리

새 저장소/캐시/폴백 레이어 없음(§7 무관, 순수 계산 함수 + 렌더 추가). 데이터
계산 실패 시 원본처럼 빈 배열/`0` 자연 폴백, 새 복구 장치 없음.

### 완료 조건

- CI 초록(test/typecheck/build)
- 감시관 §5 7항목
- 브라우저 실검증: 운송비 내역서 요약 화면에 정보표-표-요약카드 순서로
  보이는지, 표 숫자가 실제 일지 데이터와 맞는지, 파렛트 켜짐/꺼짐일 때
  컬럼 유무, **PDF·이미지 저장** 시 2단으로 나뉘어 보이는지(파일 열어서 확인)
- 보리 최종 `[x]`

## 다음 세션 시작 시 할 일

1. 위 착수지시서로 **보리 착수 승인** 받기.
2. 승인되면 작업자에게 그대로 전달.
3. `[x]` 확정되면 **이관 계획 ③ 전체(③-1~③-4) 완료** — 다음은 `STATUS.md`
   "다음 할 일" ④(매출 탭 수치 불일치 조사)로 이동.
