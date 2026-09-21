# 재무 기능 원본 ↔ React 동등성 조사

> 문서 성격: **AI 관찰(미확인 — 실행 지시 아님)**  
> 조사 기준: 원본 `80dfee5`, React 앱 `3bc860a`  
> 작성 원칙: 차이는 모두 미확인 관찰로 기록하며, 이 문서는 버그 판정이나 수정 승인을 뜻하지 않는다.

## 1. 조사 범위와 방법

원본의 재무 계산·세금계산서·미수금·월 정산·보고서 흐름과 React 앱의 대응 순수 함수를 비교했다. 저장소 코드는 수정하지 않았고, 기존 재무 기준선 테스트와 저장하지 않는 `node -e` 조사 명령만 실행했다. 외부 서버가 필요한 동기화는 정적 코드 비교까지만 했다.

판정은 다음 다섯 종류만 사용했다.

- ✅ 동일: 조사한 시나리오에서 결과와 의미가 같았다.
- 🟡 차이: 결과 또는 자료 구조 차이를 확인했으나 원인·의도·수정 필요성은 미확인이다.
- ❌ 대응 없음: 원본 기능에 대응하는 React 구현을 찾지 못했다.
- ⚪ 승인된 차이: 저장소의 서면 근거가 차이를 명시적으로 허용하거나 확정했다.
- ❓ 보류: 현재 조사 조건으로 실행 검증을 끝낼 수 없었다.

### 제외한 항목

| 제외 대상 | 제외 이유 | 원본 증거 | React 증거 |
|---|---|---|---|
| 화면 배치·문구·CSS | 이번 착수지시서는 재무 계산과 자료 흐름 비교가 대상이다. | `index.html:1`, `script.js:1` | `react-app/src/components/TaxInvoicePage.jsx:1`, `react-app/src/components/ReportPage.jsx:1` |
| 인증·Supabase 서버 자체 | 로컬 순수 함수 비교로 서버 상태를 재현할 수 없다. 호출 경계는 아래 동기화 항목에서 별도 보류했다. | `finance-sync.js:35-130` | `react-app/src/lib/syncTaxInvoicesTable.js:21-66` |
| `getLinkedRecordSummary` | 정의만 있고 원본 저장소의 호출 위치를 찾지 못해 실제 사용 기능 목록에서 제외했다. | `driver-link.js:538-545` | `react-app/src/domain/financeCore.js:143-201` |

## 2. 지시서 §5 보정 기준 우선 확인

이 표는 조사표 집계와 별도로, 착수지시서가 지정한 세 가지 보정 기준이 먼저 성립하는지 확인한 결과다.

| 보정 기준 | 결과 | 근거 |
|---|---|---|
| 기존 재무 기준선 | ✅ 동일 | 지정 명령에서 30개 모두 통과했다. 원본 함수 주입은 `react-app/src/domain/finance.test.js:68-93`, 월 운송료의 문서화된 기대 보정은 `react-app/src/domain/finance.test.js:97-105`에 있다. 비교 대상 React 함수는 `react-app/src/domain/financeCore.js:31-216`이다. |
| 월 운송료 `+80,000원 / +1건` | ⚪ 승인된 차이 | 원본은 회사·직원 정산 차량만 수입에 포함한다(`finance.js:1695-1699`). React는 매출분배 대상 보조차량도 포함한다(`react-app/src/domain/financeCore.js:143-201`). 기준 자료의 수익/급여 이원화와 보조차량 정산 규칙은 `docs/sot.md:12-40`, `docs/sot.md:482-483` 및 `docs/migration-audit.md:171-176`에 서면으로 명시되어 있다. 기준 fixture에서는 원본 1,110,000원·6건, React 1,190,000원·7건으로 표의 기대값과 일치했다. |
| 운전자 정산 방식 | ⚪ 승인된 차이 | 과거 값을 해석하는 보조 함수 자체는 원본 `script.js:641-654`와 React `react-app/src/domain/cars.js:178-181`이 같았다. 실제 입력·비용 계산은 원본 4개 방식과 React의 수익/급여 방식이 다르며(`script.js:641-653`, `react-app/src/components/cars/CarFormModal.jsx:38-65`, `react-app/src/domain/cars.js:71-93`, `react-app/src/domain/financeCore.js:204-216`, `react-app/src/domain/driverRevenueShareExpense.js:22-49`), 이 전환은 `docs/sot.md:20`, `docs/sot.md:36-40`, `docs/sot.md:482-483`에 서면으로 명시되어 있다. |

기준선의 14개 함수는 착수지시서 §1에 적힌 목록 전부이며, 기존 테스트가 작성해 둔 비교 규칙으로는 모두 통과했다. 아래 함수별 표는 그 결과를 뒤집는 것이 아니라, 기존 테스트가 숫자 일부만 비교한 함수도 반환 구조와 추가 경계 입력까지 넓혀 별도로 기록한 것이다.

정산 방식 보정 기준은 “과거 값 해석 함수”와 “현재 화면에서 저장·계산하는 방식”을 나눠 확인했다.

| 입력·상황 | 원본 결과 | React 결과 | 판정·증거 |
|---|---|---|---|
| `settlementMode`가 `company`·`driver_direct`·`employee`·`none`인 과거 자료 | 각각 같은 4개 값을 반환 | 과거 값 해석 함수는 원본과 같은 값을 반환 | ✅ 동일 — `script.js:641-654`, `react-app/src/domain/cars.js:178-181` |
| 새 보조차량에서 급여 방식을 지정하지 않음 | `defaultDriverSettlementMode`에 따라 과거 4개 방식 중 하나 | `driverPayMode: 'revenue'`로 저장하고 수익분배 계산 경로 사용 | ⚪ 승인된 차이 — `script.js:641-654`, `react-app/src/components/cars/CarListPage.jsx:36-40`, `react-app/src/domain/cars.js:71-93`, `react-app/src/domain/driverRevenueShareExpense.js:22-49`; 서면 `docs/sot.md:482-483` |
| 현재 화면에서 월급제를 선택 | 원본에는 `driverPayMode: 'salary'` 입력 경로가 없음 | `driverPayMode: 'salary'`와 급여액을 저장하고 월 급여 경로 사용 | ⚪ 승인된 차이 — `script.js:641-654`, `react-app/src/components/cars/CarFormModal.jsx:38-57`, `react-app/src/domain/financeCore.js:204-216`; 서면 `docs/sot.md:482-483` |

## 3. 함수별 조사표

시나리오 수는 같은 의미를 여러 입력으로 확인한 횟수다. 모든 🟡 항목은 **차이가 있다는 관찰만 확인된 상태**이며 버그로 확정하지 않았다.

| 번호 | 원본 함수(파일:줄) | React 대응 함수(파일:줄) | 시나리오 수 | 판정 | 차이·관찰 내용 |
|---:|---|---|---:|---|---|
| 1 | `parseCurrencyValue` (`script.js:1582`) | `parseCurrencyValue` (`react-app/src/domain/money.js:7-9`) | 6 | ✅ 동일 | 빈 값, 숫자, 쉼표 문자열, 원 단위 문자열을 같은 숫자로 바꿨다. |
| 2 | 지급기한·라벨 계산 (`client-management.js:551-597`) | `calculatePaymentDueDate`, `getPaymentTermLabel` (`react-app/src/domain/clientPaymentTerms.js:26-77`) | 12 | ✅ 동일 | 당일·익월·며칠 뒤 조건의 날짜와 표시 문구가 같았다. |
| 3 | `getCallDetailDurationMinutes` (`finance.js:894-903`) | `getCallDetailDurationMinutes` (`react-app/src/domain/financeCore.js:61-72`) | 5 | ✅ 동일 | 시간 값, 시작·종료 시각, 자정 통과, 누락 입력이 같았다. |
| 4 | `getDetailPaymentSummary`, `syncDetailPaymentStatus` (`script.js:5511-5537`) | 같은 이름의 함수 (`react-app/src/domain/financeCore.js:31-57`) | 8 | ✅ 동일 | 미결제·부분결제·완납의 결제액, 잔액, 상태가 같았다. |
| 5 | 결제 추가·취소·완납 (`finance.js:1505-1629`) | 결제 변경 함수 (`react-app/src/domain/payments.js:73-155`) | 8 | ✅ 동일 | 부분 결제 추가, 한 건 취소, 전액 결제 뒤 최종 금액·잔액·상태가 같았다. |
| 6 | `getTaxInvoiceFlowMeta`, `getTaxInvoiceRecordId` (`finance.js:47-58`) | 같은 이름의 함수 (`react-app/src/domain/financeTaxInvoiceEntries.js:53-68`) | 7 | ✅ 동일 | 매출·매입·수수료 항목의 구분과 식별자가 같았다. |
| 7 | `getTaxInvoicePartyInfo` (`finance.js:165-175`) | `getTaxInvoicePartyInfo` (`react-app/src/domain/financeTaxInvoiceEntries.js:75-96`) | 3 | ✅ 동일 | 고객·차량·수수료 당사자의 이름과 사업자 정보 선택이 같았다. |
| 8 | `buildTaxInvoiceEntry` (`finance.js:176-218`) | `buildTaxInvoiceEntry` (`react-app/src/domain/financeTaxInvoiceEntries.js:110-125`) | 3 | ✅ 동일 | 세 흐름의 금액, 공급가액, 부가세와 핵심 자료 구조가 같았다. |
| 9 | `getTaxInvoiceSupplierBiz` (`finance.js:442-445`) | `getTaxInvoiceSupplierBiz` (`react-app/src/domain/financeTaxInvoiceEntries.js:132-142`) | 3 | ✅ 동일 | 사업자 정보가 있는 경우와 없는 경우의 선택 결과가 같았다. |
| 10 | `resolveTaxInvoiceVehicleId` (`finance-sync.js:20-33`) | `resolveTaxInvoiceVehicleId` (`react-app/src/domain/taxInvoices.js:46-55`) | 6 | ✅ 동일 | 직접 차량 ID, 등록번호 연결, 차량 없음의 처리 결과가 같았다. |
| 11 | `getCarBusinessInfo`, `getVehicleSupplierIdentity` (`car-management.js:193-250`) | 같은 이름의 함수 (`react-app/src/domain/cars.js:184-236`) | 8 | ✅ 동일 | 사업자명·등록번호·대표자와 공급자 식별 결과가 같았다. |
| 12 | `isVehicleRevenueSharedWithOwner` (`car-management.js:225-235`) | `isVehicleRevenueSharedWithOwner` (`react-app/src/domain/cars.js:212-215`) | 3 | ✅ 동일 | 매출분배 표시가 켜짐·꺼짐·누락인 조건의 판단이 같았다. |
| 13 | 과거 정산 방식 해석 (`script.js:641-654`) | `getEffectiveDriverSettlementMode` (`react-app/src/domain/cars.js:178-181`) | 6 | ✅ 동일 | 회사·기사직접·직원·없음 등 과거 값 해석 함수의 반환값이 같았다. |
| 14 | 실제 운전자 비용 분기 (`script.js:641-653`) | 차량 입력·비용 분기 (`react-app/src/components/cars/CarFormModal.jsx:38-65`, `react-app/src/domain/cars.js:71-93`, `react-app/src/domain/financeCore.js:204-216`, `react-app/src/domain/driverRevenueShareExpense.js:22-49`) | 4 | ⚪ 승인된 차이 | 원본의 네 방식이 React에서는 수익분배/급여 모델로 정리됐다. 서면 근거는 `docs/sot.md:20`, `docs/sot.md:36-40`, `docs/sot.md:482-483`이다. |
| 15 | `getCallDetailCommissionAmount` (`finance.js:910-930`) | `getCallDetailCommissionAmount` (`react-app/src/domain/financeCore.js:74-90`) | 6 | ✅ 동일 | 비율·직접 입력·비활성·저장값 우선 조건의 결과가 같았다. |
| 16 | `calculateDriverVehicleCommission` (`finance.js:1671-1678`) | `calculateDriverVehicleCommission` (`react-app/src/domain/financeCore.js:135-139`) | 6 | ✅ 동일 | 일반·보조차량, 비율 유무, 0원 조건에서 결과가 같았다. |
| 17 | `getMonthlyFareRevenue` (`finance.js:1690-1753`) | `getMonthlyFareRevenue` (`react-app/src/domain/financeCore.js:143-201`) | 4 | ⚪ 승인된 차이 | 보정 fixture에서 React가 80,000원·1건 더 포함했다. 차량 정산 모델 전환의 서면 근거는 `docs/sot.md:12-40`, `docs/sot.md:482-483`이고, 범위가 있는 고정노선 선택 근거는 `docs/sot.md:262-298`이다. |
| 18 | `getMonthlyDriverTotals` (`finance.js:1648-1668`) | `getMonthlyDriverTotals` (`react-app/src/domain/financeCore.js:104-131`) | 4 | ⚪ 승인된 차이 | 고정노선에 저장 운송료가 없고 횟수만 있을 때 원본은 0원, React는 단가×횟수 250,000원이었다. 해당 누락 보정은 `STATUS.md:233-239`에 완료 근거가 있다. |
| 19 | `flattenLinkedDriverTrips` (`driver-link.js:559-594`) | `flattenLinkedDriverTrips` (`react-app/src/domain/financeTaxInvoiceGroups.js:127-169`) | 4 | ⚪ 승인된 차이 | 횟수만 있는 고정노선에서 React는 계산 단가를 운행에 넣고 원본은 저장된 운송료만 읽는다. 서면 근거는 `STATUS.md:233-239`이다. |
| 20 | `getLinkedDriverSettlementDetail` (`driver-link.js:596-615`) | `getLinkedDriverSettlementDetail` (`react-app/src/domain/financeTaxInvoiceGroups.js:171-187`) | 4 | ⚪ 승인된 차이 | 같은 횟수 전용 자료에서 원본 금액은 0원, React는 총 250,000원·수수료 37,500원·최종 212,500원이었다. 서면 근거는 `STATUS.md:233-239`이다. |
| 21 | `getLinkedDriverClientInvoiceGroups` (`driver-link.js:617-633`) | `getLinkedDriverClientInvoiceGroups` (`react-app/src/domain/financeTaxInvoiceGroups.js:189-206`) | 4 | ✅ 동일 | 같은 운행 목록을 넣었을 때 일반 호출, 과세·면세, 빈 자료의 고객별 묶음과 합계가 같았다. 운행 목록을 만드는 단계의 차이는 19번에 따로 기록했다. |
| 22 | `getTaxInvoiceSourceGroups` (`finance.js:60-162`) | `getTaxInvoiceSourceGroups` (`react-app/src/domain/financeTaxInvoiceGroups.js:22-120`) | 6 | ⚪ 승인된 차이 | 일반 매출·매입·수수료는 같았다. 원본은 첫 연결 고객을 전역에서 고르지만 React는 차량 범위를 먼저 적용하며, 범위 분리는 `docs/sot.md:262-298`에 승인되어 있다. |
| 23 | `getOwnerMonthlyFinanceDetail` (`finance.js:932-1085`) | `getOwnerMonthlyFinanceDetail` (`react-app/src/domain/financeOwnerDetail.js:35-162`) | 4 | 🟡 차이 | 핵심 숫자 합계는 같았다. React 결과에는 `expense.salary`가 있고, 미수 상세 키는 원본 `detailIndex`와 React `detailId`로 달랐다. 이 구조 차이의 확정 근거는 찾지 못했다. |
| 24 | `getReceivableItems`, `getOverdueReceivableItems` (`finance.js:1202-1266`) | 같은 이름의 함수 (`react-app/src/domain/financeReceivables.js:40-111`) | 4 | 🟡 차이 | ID가 있는 정상 자료의 금액은 같았다. 상세 ID가 없는 과거 형태 한 건은 원본이 100,000원 미수로 포함했지만 React는 건너뛰어 0건이었다(`react-app/src/domain/financeReceivables.js:67-70`). |
| 25 | `getCurrentReceivableDetailItems` (`finance.js:1404-1408`) | `groupItems` (`react-app/src/domain/receivables.js:43-47`) | 4 | ✅ 동일 | 선택한 고객·월에 해당하는 상세 묶음이 같았다. |
| 26 | `getFixedRouteClient` (`script.js:274-275`) | `getFixedRouteClient`, `resolveFixedUnitPrice`, `computeFixedRouteFare` (`react-app/src/domain/clients.js:23-62`) | 4 | ⚪ 승인된 차이 | 원본은 전체에서 첫 연결 고객을 고르고 React는 차량 범위를 우선한다. 범위 분리는 `docs/sot.md:262-298`에 승인되어 있으며, 단가×횟수 보정은 `STATUS.md:233-239`에 기록되어 있다. |
| 27 | `buildCalendar` 월 정산 합계 (`script.js:3232-3526`) | `monthSettlementSummary` (`react-app/src/domain/monthSettlement.js:56-154`) | 4 | 🟡 차이 | 정상 자료의 운행 4건·운송료 630,000원 등은 같았다. 휴무 표시와 운행 자료가 함께 남은 입력에서는 원본이 2건·150,000원을 합산했고 React는 0건·0원으로 제외했다(`script.js:3321-3435`, `react-app/src/domain/monthSettlement.js:80-85`). |
| 28 | 짧은 운송료 표시 (`script.js:255-262`) | `formatFareShort` (`react-app/src/domain/calendarBadges.js:37-40`) | 5 | 🟡 차이 | 0원과 양수는 같았지만 -5원은 원본 `-5원`, React `0원`이었다. 음수 입력의 업무상 의미는 확인되지 않았다. |
| 29 | `getDdayText` (`script.js:5542-5554`) | `getDdayLabel` (`react-app/src/domain/receivables.js:54-61`, `react-app/src/domain/receivables.js:97-103`) | 5 | 🟡 차이 | 정상 날짜는 같았다. 빈 값·잘못된 날짜는 원본이 `D+NaN 연체`, React가 빈 문자열이었다. 어떤 표시가 기준인지는 확인되지 않았다. |
| 30 | 월 요약·상세 보고서 (`script.js:4789-5078`, `script.js:5173-5337`) | `buildMonthReport`, `buildDetailReport` (`react-app/src/lib/reportSummary.js:33-100`, `react-app/src/lib/reportDetail.js:73-130`) | 4 | 🟡 차이 | 주 차량의 표준 자료는 같았다. 수수료 10%인 보조차량의 운송료 100,000원 사례에서 원본 보고 합계는 100,000원, React는 110,000원이었다. React 요약 호출은 차량 정보를 전달하지 않는다(`react-app/src/lib/reportSummary.js:64-79`). |
| 31 | 세금계산서 동기화 (`finance-sync.js:35-130`) | 테이블 동기화·초기 적재 (`react-app/src/domain/taxInvoices.js:72-112`, `react-app/src/lib/syncTaxInvoicesTable.js:21-66`) | 0(정적 확인) | ❓ 보류 | 양쪽 모두 서버 읽기·쓰기와 결합되어 있어 실제 동일 서버 상태에서 실행하지 못했다. 차량 식별 순수 함수는 10번 항목에서 별도로 같음을 확인했다. |

## 4. 보리 확인 요청

아래는 🟡 차이와 ❓ 보류만 모은 목록이다. 모두 **미확인 관찰**이며, 수정 여부를 뜻하지 않는다.

| ID | 판정 | 확인이 필요한 내용 | 원본 증거 | React 증거 | 보리 결정 (2026-09-21) |
|---|---|---|---|---|---|
| F-01 | 🟡 차이 | 소유주 월 상세의 `salary` 필드 추가와 `detailIndex`→`detailId` 구조를 현재 계약으로 볼지 | `finance.js:932-1085` | `react-app/src/domain/financeOwnerDetail.js:35-162` | ⚪ 현재 유지(원칙 확인) `[확인: 2026-09-21 보리 설명]` — 운송내역서는 회사에 제출하는 서류(기사가 벌어온 돈을 차주가 회사에 지급 요청하는 영수증)라 **기사 급여·수수료 항목을 넣지 않는다.** 이미 운송내역서 경로에는 `salary`가 없음(`reportSummary.js`·`reportDetail.js`). 매출 화면의 월급제 기사 급여 줄(`OwnerMonthlyCards.jsx:132-133`)은 차주·기사 본인 돈 흐름이라 유지 — AI 해석(보리의 업무 흐름 설명에서 도출, 다르면 정정) |
| F-02 | 🟡 차이 | 상세 ID가 없는 과거 미수 자료도 표시해야 하는지 | `finance.js:1202-1257` | `react-app/src/domain/financeReceivables.js:40-96` | 🔧 원본 방식으로 변경 `[확인: 2026-09-21 보리]` — 상세 ID 없는 옛 미수 자료도 표시 |
| F-03 | 🟡 차이 | 휴무일에 운행 자료가 함께 남아 있을 때 합산할지 제외할지 | `script.js:3321-3435` | `react-app/src/domain/monthSettlement.js:80-85` | 🔧 원본 방식으로 변경 `[확인: 2026-09-21 보리]` — 휴무 표시와 운행 자료가 함께 남은 날도 합산 |
| F-04 | 🟡 차이 | 음수 운송료 표시를 그대로 둘지 0원으로 제한할지 | `script.js:255-262` | `react-app/src/domain/calendarBadges.js:37-40` | 🔧 원본 방식으로 변경 `[확인: 2026-09-21 보리]` — 음수 운송료도 그대로 표시(예: -5원) |
| F-05 | 🟡 차이 | 빈 값·잘못된 지급기한의 D-day 표시 기준 | `script.js:5542-5554` | `react-app/src/domain/receivables.js:54-61`, `react-app/src/domain/receivables.js:97-103` | ⚪ 현재 방식 유지 `[확인: 2026-09-21 보리]` — 빈 값·잘못된 지급기한의 D-day는 빈 문자열 |
| F-06 | 🟡 차이 | 보조차량 보고서 합계에 차량 수수료를 반영하는 현재 기준 | `script.js:5020-5031`, `script.js:5279-5292` | `react-app/src/lib/reportSummary.js:64-79`, `react-app/src/lib/reportDetail.js:73-130` | ⚪ 현재 방식 유지 `[확인: 2026-09-21 보리 설명]` — 기사차량 수수료는 차주가 기사에게 지급하는 월급/매출 몫이라 회사 제출용 운송내역서에서 차감하지 않는다(= 원본 메인차량 방식을 서브차량에도 적용). 원본이 서브차량 내역서에서만 기사차량 수수료를 차감한 것(`script.js:5018-5031`)은 채택하지 않음 — 합계 원본 100,000원 vs react-app 110,000원 차이는 이 때문이며 react-app이 맞다. 스코프 수정 묶음 2는 스코프 문제만 고친다 |
| F-07 | ❓ 보류 | 동일한 Supabase 시험 환경에서 세금계산서 초기 적재·저장·삭제 동기화 검증이 필요한지 | `finance-sync.js:35-130` | `react-app/src/domain/taxInvoices.js:72-112`, `react-app/src/lib/syncTaxInvoicesTable.js:21-66` | ⚪ 패스(추가 조사 안 함) `[확인: 2026-09-21 보리]` — 서버 동기화는 모바일 실사용 테스트 중 이상이 보이면 그때 고친다. 순수 계산 부분(`resolveTaxInvoiceVehicleId`)은 ✅ |

### 결정 요약 (2026-09-21, 진행 중)

- 🔧 원본 방식으로 변경 3건: **F-02**(상세 ID 없는 옛 미수 표시), **F-03**(휴무일 운행 자료 합산), **F-04**(음수 운송료 표시) — `docs/roadmap.md`
- ⚪ 현재 방식 유지 3건: F-01(운송내역서에 기사 급여 미포함 원칙), F-05, F-06(운송내역서에서 기사차량 수수료 미차감 — react-app이 맞음)
- ⚪ 패스 1건: F-07(세금계산서 서버 동기화 — 실사용 중 이상이 보이면 수정)


## 5. 판정 요약

함수별 조사표 31개 항목의 집계다. 보정 기준 표는 중복이므로 포함하지 않았다.

| 판정 | 수 |
|---|---:|
| ✅ 동일 | 17 |
| 🟡 차이 | 6 |
| ❌ 대응 없음 | 0 |
| ⚪ 승인된 차이 | 7 |
| ❓ 보류 | 1 |
| 합계 | 31 |

가장 눈에 띄는 미확인 관찰은 다음 세 가지다.

1. 상세 ID가 없는 미수 자료 한 건이 원본에서는 100,000원으로 보이지만 React에서는 제외됐다.
2. 휴무 표시와 운행 자료가 함께 남은 날을 원본은 2건·150,000원으로 합산하고 React는 0건·0원으로 제외했다.
3. 수수료 10%인 보조차량의 100,000원 운송 사례에서 보고서 합계가 원본 100,000원, React 110,000원이었다.

이 세 항목도 버그 확정이 아니라 입력 규칙과 업무 기준 확인이 필요한 관찰이다.

## 6. 재현 명령과 확인 결과

작업 위치는 `C:\Users\znlsl\OneDrive\문서\GitHub\🧪teat\react-app`이다.

```powershell
node --experimental-test-module-mocks --test-force-exit --test-timeout=60000 --test "src/domain/finance.test.js"
```

결과: 30개 통과, 0개 실패. 이 테스트의 월 운송료 비교는 `finance.test.js:97-105`에 적힌 80,000원·1건 보정을 포함한다.

대표 결과는 아래처럼 저장 파일을 만들지 않는 `node --input-type=module -e` 방식으로 원본 함수를 주입하고 React 순수 함수와 같은 입력을 넣어 재현할 수 있다. 각 명령은 위 작업 위치에서 실행한다.

```powershell
# 월 운송료: {"original":[1110000,6],"react":[1190000,7]}
node --experimental-test-module-mocks --input-type=module -e "import {loadOriginalWindow,applyOriginalFixture} from './src/lib/originalWindow.js'; import {FIXTURE_SETTINGS,FIXTURE_WORK,MONTH_KEY} from './src/domain/finance.fixtures.js'; import {getMonthlyFareRevenue} from './src/domain/finance.js'; const w=loadOriginalWindow(); applyOriginalFixture(w,FIXTURE_SETTINGS,FIXTURE_WORK); const o=w.getMonthlyFareRevenue(MONTH_KEY), r=getMonthlyFareRevenue(MONTH_KEY,FIXTURE_SETTINGS,FIXTURE_WORK); console.log(JSON.stringify({original:[o.totalFare,o.tripCount],react:[r.totalFare,r.tripCount]}));"

# 횟수만 있는 고정노선: {"original":[0,1],"react":[250000,1]}
node --input-type=module -e "import {loadOriginalWindow,applyOriginalFixture} from './src/lib/originalWindow.js'; import {getMonthlyDriverTotals} from './src/domain/finance.js'; const s={clients:[{companyName:'한진',fixedRouteLinked:true,fixedUnitPrice:250000}],cars:[]}, data={'2026-05-12':{fixedCount:1}}; const w=loadOriginalWindow(); applyOriginalFixture(w,s,{main:data}); const o=w.getMonthlyDriverTotals(data,'2026-05'), r=getMonthlyDriverTotals(data,'2026-05',null,s); console.log(JSON.stringify({original:[o.grossAmount,o.count],react:[r.grossAmount,r.count]}));"

# 상세 ID가 없는 미수 자료: {"original":[100000],"react":[]}
node --input-type=module -e "import {loadOriginalWindow,applyOriginalFixture} from './src/lib/originalWindow.js'; import {getReceivableItems} from './src/domain/finance.js'; const s={paymentOn:true,cars:[],clients:[]}, d={main:{'2026-05-12':{callDetails:[{client:'한진',fare:100000,paymentStatus:'미수'}]}}}; const w=loadOriginalWindow(); applyOriginalFixture(w,s,d); console.log(JSON.stringify({original:w.getReceivableItems().map(x=>x.remainingAmount),react:getReceivableItems(s,d).map(x=>x.remainingAmount)}));"

# 음수 운송료 표시: {"original":"-5원","react":"0원"}
node --input-type=module -e "import {loadOriginalWindow} from './src/lib/originalWindow.js'; import {formatFareShort} from './src/domain/calendarBadges.js'; const w=loadOriginalWindow(); console.log(JSON.stringify({original:w.formatFareShort(-5),react:formatFareShort(-5)}));"

# 빈 지급기한 D-day: {"original":"D+NaN 연체","react":""}
node --input-type=module -e "import {loadOriginalWindow} from './src/lib/originalWindow.js'; import {getDdayLabel} from './src/domain/receivables.js'; const w=loadOriginalWindow(); console.log(JSON.stringify({original:w.getDdayText(''),react:getDdayLabel('')}));"
```

위 다섯 명령은 실제로 다시 실행해 주석에 적은 결과와 같음을 확인했다. 조사 스크립트 파일은 저장소 안팎에 남기지 않았다.

## 7. 남은 조사 한계

- Supabase에 연결되는 세금계산서 동기화는 동일한 시험 계정·자료가 없어 실행 비교하지 못했다.
- 과거 운영 자료 전체를 받은 것이 아니므로, 상세 ID 누락이나 휴무일 잔존 자료가 실제로 얼마나 존재하는지는 확인하지 못했다.
- 화면에서 사용자가 수행하는 전체 클릭 흐름은 이번 함수 단위 조사 범위에 포함하지 않았다.
- 범위가 있는 고정노선 차이는 `docs/sot.md:262-298`의 서면 기준에 따라 승인된 차이로 분류했으며, 별도 범위 감사의 결론을 대신하지 않는다.

## 8. 작업 준수 기록

- 코드, 원본 HTML·JavaScript, `AGENTS.md`, `docs/sot.md`, `docs/roadmap.md`, `STATUS.md`를 수정하지 않았다.
- React 테스트를 추가하지 않았다.
- 커밋과 push를 하지 않았다.
- `STATUS.md`의 체크 표시를 바꾸지 않았다.
- 이번 작업에서 만든 파일은 `docs/finance-parity.md` 하나뿐이다.
