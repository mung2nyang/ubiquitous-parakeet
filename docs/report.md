# docs/report.md — ③-3 착수지시서 (이관 계획 ③ "월간 운송료 정산" 위젯 구조 통일)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①·②(①~④)·③-1·③-2는 `[x]` 확정됨 — 상세는 `STATUS.md` "완료" 절 참고.

## ③-2 완료 (2026-09-08)

기본 커밋 `e00a004` + 수정 커밋 2개(`3045c45` 제목·안내문구/로그아웃,
`74e90ae` 지출 3행 아이콘·색상·순서) — 전부 CI 초록·감시관 §5 통과,
보리 명시 승인("응 확정") 받고 `[x]`. 상세는 `STATUS.md` "완료" 절.

---

## ③-3 착수지시서: 리포트 요약 화면을 공용 계산 함수로 연결 (원본 그대로)

### 배경 · 착수 전 조사에서 발견한 것

③-1(공용 계산 함수 `monthSettlementSummary`)·③-2(캘린더 카드 연결) 완료. 이번엔
리포트(운송비 내역서) **"요약" 화면**(`ReportPage.jsx`의 `viewMode==='summary'`,
`buildMonthReport` 경로) 차례.

**중요 발견**: 원본 리포트 요약 화면(`buildReportPage`, `ubiquitous-parakeet/script.js:4789-5078`)은
캘린더 홈 위젯(`updateSummary`, `script.js:3529-3634`)과 **애초에 서로 다른 화면**이었다.

- 캘린더에만 있고 리포트엔 없는 것: 파렛트 회수 청구액 행, 서브차량(기사) 수수료 행,
  차량 정비비/주유비/통행료 지출 3종 행(아이콘 포함), 상단 타이틀("월간 운송료 정산" +
  "총 N회 운행"), "1회 단가" 행.
- 리포트에만 있고 캘린더엔 없는 것: **월간 총 운행거리 행**(조건·토글 없이 항상 표시,
  캘린더는 `distanceOn` 설정이 켜져 있어야 보임).
- `index.html`엔 파렛트(`rptPalletTotalRow`)·서브차량수수료(`rptSubCarCommissionRow`)
  자리표시 HTML이 남아있지만, `buildReportPage`가 `.report-summary-box` 전체를
  `innerHTML`로 통째로 덮어써서 그 자리표시들은 **실제로 렌더된 적이 없는 죽은
  마크업**임을 `script.js`에서 해당 id 참조가 0건인 것으로 확인.
- "기본 운송료"도 원본 리포트는 고정노선분(미등록)과 콜상세분(미등록)을 **하나의
  변수로 합쳐서 한 줄**로 보여준다(캘린더처럼 "고정 기본 운송료"/"미지정 거래처
  운송료" 두 줄로 안 나눔).

지금 react-app 리포트 요약 화면(`ReportSummaryContent`)은 반대로 원본에 없는
"1회 단가" 행·상단 타이틀이 있고, 원본에 있는 "거래처별 매출 내역"·"월간 총
운행거리"가 아예 없다(지금은 총액 하나만 보여줌).

**보리 확인 결과 "원본 그대로"로 확정(2026-09-08)** — 리포트 요약 화면에 파렛트·
서브차량수수료·지출3종·1회단가·상단타이틀을 새로 추가하지 않는다.

### 목표

`lib/report.js`의 `buildMonthReport`가 `monthWorkFareSummary` 대신
`domain/monthSettlement.js`의 `monthSettlementSummary`(③-1/③-2와 동일 계산
함수)를 쓰도록 교체 — 위젯 구조 통일 목적 달성. `ReportSummaryContent`
(`ReportDetailView.jsx`)를 원본 `buildReportPage`가 실제로 그리는 항목만
반영하도록 다시 그린다.

### 건드릴 파일

1. **`src/lib/report.js` — `buildMonthReport` 함수만.**
   - import 교체: `monthWorkFareSummary`(`./workData.js`) 삭제 →
     `monthSettlementSummary`(`../domain/monthSettlement.js`) 추가.
     `getFixedRouteClient`를 `../domain/clients.js`에서 추가 import
     (`resolveFixedUnitPrice`는 이미 import돼 있고 `unitPrice` 계산에 계속 필요,
     그대로 유지).
   - `monthTotal(expenses, 'maint'|'fuel'|'misc', ...)` 호출 3줄 삭제(화면에서
     안 씀) — `monthTotal` import는 이 함수에서만 쓰였으므로 import 줄도 삭제.
   - 반환 객체 필드:
     - 삭제: `trips`, `callTrips`, `unitPrice`, `maint`, `fuel`, `misc`
     - 추가: `distanceKm`, `fixedBaseFare`, `defaultBaseFare`, `fareByClient`,
       `commissionByClient`, `commissionLabelByClient`
     - 유지: `year`, `monthIndex`, `title`, `profile`, `mainCar`, `vat`, `total`
       (`monthSettlementSummary`가 반환하는 `vat`/`total`을 그대로 사용 — 파렛트·
       서브차량수수료가 화면엔 안 보여도 "계" 합계 계산엔 원본처럼 그대로
       반영됨. 새 계산 만들지 않음.)
   - `monthSettlementSummary` 호출 옵션: `{ unitPrice, fixedRouteClient:
     getFixedRouteClient({ clients }), activeFixedOn: !!practiceSettings.fixedOn,
     clients }` — 캘린더의 메인 차량 분기와 같은 패턴. `logId`/`car`/`expenses`는
     안 넘김(리포트 요약엔 서브차량 수수료·지출을 안 보여주므로 불필요, 기존
     "리포트는 메인 차량 전용" 범위 그대로 유지 — 이 nit은 이번 슬라이스 대상 아님).

2. **`src/components/ReportDetailView.jsx` — `ReportSummaryContent` 함수만**
   (다른 export 3개 `ReportClientPickerModal`/`ReportDetailContent`/타입 무변경).
   - JSDoc `@param {Object} props.report` 타입을 새 필드로 갱신.
   - 렌더 순서(원본 `baseFareHtml` 순서 그대로):
     1. **월간 총 운행거리** — 조건 없이 항상 표시(원본처럼 0이어도 행이 보임),
        원본 인라인 스타일 그대로 포팅(`color: var(--primary-color)`,
        `font-weight: 700`, `border-bottom: 1px dashed var(--border-color)`,
        `padding-bottom: 10px`, `margin-bottom: 10px`).
     2. **기본 운송료** — `report.fixedBaseFare + report.defaultBaseFare`를 합친
        값 1줄로(원본이 애초에 합쳐서 한 줄로 보여줬으므로 그대로), 조건은
        `합친 값 > 0 || 거래처 없음`(원본 조건 그대로).
     3. **거래처별 행** — `Object.keys(report.fareByClient)` map, 각 항목 아래
        `commissionByClient[client] > 0`이면 인덴트 수수료 행(캘린더 카드 패턴
        재사용, `summary-client-commission-row`/`summary-client-commission-label`
        클래스 그대로).
     4. 부가세, 5. 계 — 기존 그대로.
   - 삭제: 상단 `summary-title`(월간 운송료 정산/횟수), "1회 단가" 행, 정비비/
     주유비/통행료 3행(아이콘 포함).
   - 정보 표(성명/연락처/차량번호 등 `info-table`)는 무변경.

3. **테스트** — `src/lib/report.test.js`에 `buildMonthReport` 케이스 신규 추가
   (지금 0건). `monthSettlement.test.js`/`CalendarMonthSummary.test.js`처럼
   손계산 기대값과 대조: 거래처별 매출+수수료 분리 케이스, 미지정거래처+고정노선이
   하나의 "기본 운송료" 행으로 합쳐지는 케이스, distanceKm이 0이어도 행이 뜨는지.
   `ReportSummaryContent` 렌더 결과도 최소 1개 테스트로 확인(새 파일
   `ReportDetailView.test.js` 또는 기존 파일에 추가, 작업자 재량).

### 안 건드릴 것

- `ReportDetailContent`(세부 내역서, `buildDetailReport` 경로) — 이미 원본과
  일치(파렛트/서브차량수수료/지출3종 없음 확인됨), 이번 슬라이스와 무관.
- `ReportClientPickerModal` — 무변경.
- `domain/day-record.js`의 `monthWorkFareSummary` — 이번 슬라이스에서 **삭제하지
  않는다**. 프로덕션 소비처는 0이 되지만 `workData.test.js`가 이 함수를 직접
  단위 테스트하는 대상이라 삭제하면 테스트도 같이 정리해야 해서 범위가 커짐 —
  그대로 둔 채 다음 세션에 별도로 삭제 여부 재검토(감시관 판단, 보리 착수 승인
  시 이견 있으면 정정).
- `ReportPage.jsx` — `report` 객체를 그대로 `ReportSummaryContent`에 넘기는
  배선만 하고 있어 구조상 변경 불필요. 단, 지운 필드(`report.trips` 등)를 참조하는
  줄이 있으면 그 줄만 최소 수정.
- 캘린더 쪽(`CalendarMonthSummary.jsx`/`CalendarPage.jsx`/`monthSettlement.js`) —
  무변경.

### 실패 시 처리

새 저장소/캐시/폴백 레이어 없음(§7 무관, 순수 계산 함수 교체 + 렌더 교체).
계산 실패 시 기존처럼 `|| 0` 등 원본과 동일한 방어 패턴 유지, 새 복구 장치 없음.

### 완료 조건

- CI 초록(test/typecheck/build)
- 감시관 §5 7항목
- 브라우저 실검증: 운송비 내역서(요약) 화면에서 거래처별 매출·합계가 캘린더
  카드 숫자와 일치하는지, 정비/주유/기타·파렛트·서브차량수수료·1회단가·상단
  타이틀이 안 보이는지, 월간 총 운행거리 행이 새로 보이는지 확인
- 보리 최종 `[x]`

## 다음 세션 시작 시 할 일

1. 위 착수지시서로 **보리 착수 승인** 받기.
2. 승인되면 작업자에게 그대로 전달(파일 3개 범위: `lib/report.js`,
   `ReportDetailView.jsx`, 관련 테스트).
