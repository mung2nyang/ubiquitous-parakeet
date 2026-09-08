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

## ③-3 완료 — CI 초록 + 감시관 §5 리뷰 통과, 보리 브라우저 검증 대기

작업자 커밋 `e71f82b`("운송비 내역서 요약을 monthSettlementSummary로 연결").
1차 보고 때 보리 "푸시완"이었으나 감시관이 `git status`로 재확인해보니
로컬에만 있어 재푸시 요청 → 재확인 결과 `origin/main`=`e71f82b` 반영 완료.

- **CI "verify" 초록**: run `34179530108`, conclusion=success, headSha
  `e71f82b` 일치, 테스트·타입검사·빌드 3게이트 전부 success.
- **감시관 §5 7항목**:
  1. 범위 — `lib/report.js`·`ReportDetailView.jsx`·`report.test.js`·신규
     `ReportDetailView.test.js`는 지시서와 일치. 지시서에 없던 파일 2개 발견해
     사유 확인: `side-menu.css`(`.summary-client-commission-row`/`-label`을
     `.report-page-wrap` 스코프로 추가 — 캘린더 카드가 이미 쓰던 클래스를
     리포트 화면에도 재사용하려면 필수, 새 클래스 발명 아님) /
     `TaxInvoicePage.workInvoiceSoT.test.js`(요약 화면에서 삭제된 "횟수 N회"
     문구를 검증하던 기존 SoT 리마운트 테스트가 깨져서 새 화면 구조(거래처
     매출·거리)로 불가피하게 갱신 — 검증 대상(커밋 후 리마운트 없이 갱신되는지)
     자체는 그대로, 오히려 "40,000원" 금액 어서션 추가돼 더 엄격해짐).
     둘 다 정당한 부수 변경으로 판단, 문제 없음.
  2. 몰래 증설 없음 — 신규 저장 키·durable·폴백·큐 0건, 순수 계산 함수 교체 +
     CSS + 테스트뿐.
  3. 타입 꼼수 없음 — `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as`
     diff 전체 0건. `void expenses`(미사용 매개변수 명시, 위치 인자라 서명
     유지 목적)는 타입 무력화 아님.
  4. 200줄 — `report.js` 241줄, `ReportDetailView.jsx` 244줄, 둘 다 기존 §6
     예외("응집") 범위 안. (사소한 흠: `report.js` 상단 예외 사유 주석이
     예전 줄수 "238줄"을 그대로 두고 있어 지금 241줄과 3줄 차이 — 기능 무관,
     원하면 다음 수정 커밋 때 갱신.)
  5. 테스트 진실성 — 신규 `report.test.js` 4케이스(거래처별 매출/수수료 분리,
     미지정+고정노선 합산, distanceKm 폴백, distanceKm 0 케이스)가 전부 손계산
     기대값과 대조. 신규 `ReportDetailView.test.js` 1케이스가 새 행 존재 +
     삭제된 행(1회단가·타이틀·지출3종·파렛트) 부재를 모두 어서션. 기존 테스트
     삭제 0건, 약화 0건.
  6. 문서 정합 — diff에 `.md` 파일 0건(작업자 규칙 준수).
  7. 요구사항 충족 — 지시서의 렌더 순서(거리→기본운송료→거래처별→부가세→계)·
     표시 조건(거리 무조건, 기본운송료는 `>0 || 거래처없음`)·제거 대상(타이틀·
     1회단가·지출3종) 전부 diff와 일치.
- **발견한 사소한 흠(기능 무관)**: `side-menu.css`에 새로 추가된 한글 주석이
  `"???? ?? ??? ??? ????(summary-client-commission-*)"`로 인코딩 깨짐
  (파일에 실제로 물음표 문자가 저장됨, 터미널 표시 문제 아님). 렌더링·동작엔
  영향 없음 — 보리 판단에 따라 다음 수정 커밋 때 정상 한글로 고칠지 결정.

### 발견: 리포트 요약 화면 "중간 일자별 표"가 애초에 이관 안 돼 있음 (감시관 조사 누락)

보리가 브라우저에서 화면 보다가 발견해 질문 → 확인 결과, 원본
`createTableHTML`(`script.js:4756-4787`, `reportTableContainer`에 삽입)이
만드는 **일자별 표(날짜/운행횟수 또는 휴무/파렛트(옵션)/금액, PDF 내보내기
땐 2단 분할)**가 react-app 리포트 요약 화면엔 아예 없음(상단 정보표 → 바로
하단 요약카드로 감). ③-3 착수지시서 작성 시 이 부분을 조사에서 놓쳐서
범위에 못 넣었음 — 감시관 실수로 기록.

이관 우선순위 원칙(`AGENTS.md` 우선순위 절)상 원본에 있던 기능이라 이관
대상. **다음 슬라이스(③-4)로 착수지시서 작성 예정** — ③-3이 push·CI·
브라우저 검증·`[x]` 확정까지 끝난 뒤 시작(진행 중인 슬라이스 위에 범위
추가 안 함, AGENTS §3 슬라이스 크기 원칙).

## 다음 세션 시작 시 할 일

1. **보리 브라우저 실검증** → 최종 `[x]` (아래 검증 가이드 참고).
2. `[x]` 확정 후 ③-4(리포트 요약 화면 일자별 표 이관, `script.js` `createTableHTML`
   `reportTableContainer` 포팅) 착수지시서 작성.

## ③-3 브라우저 검증 가이드 (보리용)

`npm run dev` → 마이페이지 → 운송비 내역서(요약 화면, "세부 내역서" 안 누른 기본 화면).
1. **거래처별 매출**이 캘린더 홈 카드와 같은 금액으로 나오는지.
2. **월간 총 운행거리** 행이 새로 보이는지(값이 0이어도 행 자체는 보여야 함).
3. **없어야 할 것들**: "월간 운송료 정산" 타이틀/횟수, "1회 단가" 행, 차량
   정비비/주유비/통행료 행, 파렛트·기사차량 수수료 행 — 전부 안 보여야 정상
   (원본 리포트 화면엔 원래 없던 항목들).
4. "계"(합계) 금액이 예전 화면과 달라졌다면 — 정상입니다(거래처별 매출 방식으로
   바뀌어서 계산 기준 자체가 정확해진 것, 캘린더 카드 합계와 맞는지로 대조).
