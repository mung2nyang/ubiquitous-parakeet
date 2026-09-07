# docs/report.md — 세금계산서 화면 "엑셀 저장" 버튼 이관

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **착수지시서 (2026-09-07). 보리 지시로 진행 — 이관 우선순위 대상(원본에 있던 기능).**

## 0. 조사 메모

### 0-A. 원본 기능 (`finance.js:494-709`)

- 세금계산서 카드마다(발행 전/후 무관, 매출·매입·수수료 flow 전부) "엑셀 저장"
  버튼(`finance.js:307`)이 있고, 누르면 `exportTaxInvoiceCsv(partyKey)`
  (`finance.js:494-709`, 함수명과 달리 실제로는 `.xlsx`)가 실행된다.
- **검증**: 공급자(`getTaxInvoiceSupplierBiz`)와 공급받는자(`item.clientBizNumber`)
  사업자번호가 둘 다 없으면 안내만 하고 중단(`finance.js:500-504`).
- **라이브러리**: `exceljs`를 CDN(`jsdelivr`)에서 동적 `<script>` 태그로 그때그때
  로드(`loadTaxInvoiceExcelLibrary`, `finance.js:476-492`).
- **워크북 구조**: 시트 2개.
  1. `'세금계산서'` — 공식 전자세금계산서 양식을 셀 병합·테두리·배경색으로 그대로
     재현(공급자/공급받는자 박스, 품목 표, 합계금액 박스 등). A1:J19 정확한 셀
     주소로 값·스타일 지정(`finance.js:546-688`).
  2. `'입력자료'` — 홈택스 일괄등록용 평문 표 1행(헤더)+1행(값)
     (`finance.js:690-697`).
  - 파일명: `` `${월}_${거래처명}_${flow라벨}_계산서.xlsx` ``, 특수문자 제거
    (`finance.js:516`).
  - 완성된 워크북을 buffer로 변환 → Blob → `<a download>` 클릭으로 저장
    (`finance.js:699-703`).

### 0-B. react-app 현재 상태 — 버튼 자체가 없음, 하지만 대부분의 재료는 이미 있음

- [`TaxInvoicePage.jsx`](../react-app/src/components/TaxInvoicePage.jsx)·
  [`TaxInvoiceEntryList.jsx`](../react-app/src/components/TaxInvoiceEntryList.jsx)에
  "엑셀 저장" 버튼·핸들러가 전혀 없다.
- **하지만 재사용할 게 많다** — 새로 만들 필요 없음:
  - `getTaxInvoiceSupplierBiz(item, settings)`
    ([`financeTaxInvoiceEntries.js:132`](../react-app/src/domain/financeTaxInvoiceEntries.js))
    가 원본과 **바이트 단위로 동일한 로직**으로 이미 있음.
  - `invoiceCanIssue(item, settings)`
    ([`domain/invoices.js:71`](../react-app/src/domain/invoices.js))가 원본의
    "공급자·공급받는자 사업자번호 확인" 검증과 사실상 동일한 체크(공급자
    이름·번호·대표자 + 클라이언트 사업자번호)를 이미 하고 있음 — **엑셀
    저장 전 검증도 이 함수를 그대로 재사용**(발행 가능 여부와 같은 기준이라
    합리적).
  - `getTaxInvoiceFlowMeta(flow)`(`lib/finance.js`, 이미 import돼 있음)가
    `.label`/`.itemName` 제공.
  - 거래처 쪽 필드(`clientBizNumber`·`clientRepresentative`·`clientAddress`·
    `clientBizType`·`clientBizItem`·`clientEmail`)는 이미
    `financeTaxInvoiceEntries.js`가 만드는 `InvoiceLike`에 전부 존재(Step 24
    이관 때 이미 들어감) — 새 필드 배선 불필요.
  - 공급자 쪽 사업자 정보(`bizName`/`bizNumber`/`bizRepresentative`/`bizAddress`/
    `bizType`/`bizItem`/`bizEmail`)와 `cars`는 `buildFinanceSettings(ownerKey)`
    (`lib/ownerFinance.js`, `TaxInvoicePage.jsx`가 이미 `settings`로 갖고 있음)에
    다 있음.
  - **단, 계좌 메모용 `bankName`/`accountNumber`/개인 `userName`은
    `buildFinanceSettings`엔 없다** — 원본은 `getUserSettings()` 하나로 전부
    묶여 있었지만, react-app은 이미 분리돼 있어 `TaxInvoicePage.jsx`가 이미 갖고
    있는 `profile`(`useOwnerProfile`, `profile.bankName`/`profile.accountNumber`/
    `profile.name`)에서 따로 가져와야 한다(ReportPage.jsx가 `profile`/`settings`를
    이미 이렇게 나눠 쓰는 것과 같은 패턴).
- `exceljs`가 `package.json`에 없음 — **신규 npm 의존성 추가 필요**. 원본처럼
  CDN `<script>` 동적 삽입 대신, 이 코드베이스가 이미 `html2pdf.js`에 쓰는 패턴
  (`ReportPage.jsx`의 `await import('html2pdf.js')`, 정식 npm 패키지 + 동적
  import로 번들 분리)을 그대로 따른다 — 오프라인 대응·번들 최적화 둘 다 원본보다
  낫다.

## 1. 수정 계획

**신규 파일 3개 + 수정 3개, 1커밋.** (§3/§6 응집도 예외 — "엑셀 양식 빌더"는
쪼개면 시각적 레이아웃이 흩어짐, 987be18·리포트 세부내역서와 같은 사유.)

| 파일 | 변경 |
|---|---|
| `package.json` | `dependencies`에 `"exceljs": "^4.4.0"` 추가(원본 CDN 버전과 동일 고정). |
| `src/lib/taxInvoiceExcelBuilder.js` (신규) | `buildTaxInvoiceWorkbook(ExcelJS, item, settings, profile, monthKey)` — 순수 함수(DOM·다운로드 없음, ExcelJS 모듈은 인자로 받음 → 테스트 시 정적 import로 직접 넣을 수 있음). `finance.js:525-697`(시트 2개 만드는 부분, `writeBuffer` 이전까지)을 필드명만 아래 매핑대로 바꿔 그대로 포팅. |
| `src/lib/taxInvoiceExcelBuilder.test.js` (신규) | 아래 §2 테스트 계획. |
| `src/lib/taxInvoiceExcel.js` (신규) | `buildTaxInvoiceExcelFileName(monthKey, item)`(`finance.js:516` 그대로 포팅) + `async function exportTaxInvoiceExcel(item, settings, profile, monthKey)`(동적 `import('exceljs')` → `buildTaxInvoiceWorkbook` 호출 → `workbook.xlsx.writeBuffer()` → Blob·`<a download>` 클릭, `finance.js:699-703` 그대로). 검증(사업자번호 체크)은 여기 안 넣음 — 호출부(`TaxInvoicePage.jsx`)가 `invoiceCanIssue` 재사용. |
| `src/components/TaxInvoicePage.jsx` | `invoiceCanIssue`(`lib/invoices.js`, 이미 그 파일에서 export됨 — import 추가) + `exportTaxInvoiceExcel` import. 새 핸들러 `async function exportExcel(item)`: `invoiceCanIssue(item, settings)` 실패면 `showToast?.(check.error)`(원본처럼 모달 대신 이 코드베이스 기존 toast 패턴), 성공이면 `try { await exportTaxInvoiceExcel(item, settings, profile, monthKey) ; showToast?.('세금계산서 엑셀 파일을 저장했습니다.') } catch { showToast?.('엑셀 저장에 실패했습니다.') }`. `TaxInvoiceEntryList`에 `onExportExcel={exportExcel}` 전달. |
| `src/components/TaxInvoiceEntryList.jsx` | `onExportExcel` prop 추가, `.receivable-card-actions` 안에 "내용 보기/작성하기" 버튼과 발급상태 버튼 사이에 "엑셀 저장" 버튼 추가(원본 카드의 버튼 순서와 동일, `finance.js:305-309`). |

### 1-A. 필드명 매핑 (원본 `finance.js` → react-app)

원본은 `getUserSettings()` 하나가 전부 갖고 있었지만 react-app은 이미
`settings`(`FinanceSettings`)/`profile`로 나뉘어 있다 — 빌더 함수 인자 2개로 받기만
하면 되고, 그 외 필드명은 전부 동일(`item.supplyAmount`·`item.taxAmount`·
`item.totalAmount`·`item.clientBizNumber`·`item.clientName`·
`item.clientRepresentative`·`item.clientAddress`·`item.clientBizType`·
`item.clientBizItem`·`item.clientEmail`·`item.carNumber`·`item.itemName`·
`item.remark`·`item.flow`·`item.issueDate`·`item.taxAmount`·`item.supplierBiz` —
전부 react-app `InvoiceLike`에 이미 존재, 새로 안 만듦):

| 원본 | react-app |
|---|---|
| `settings.bizName`/`bizNumber`/`bizRepresentative`/`bizAddress`/`bizType`/`bizItem`/`bizEmail` | 그대로 `settings.*` (`FinanceSettings`) |
| `settings.cars` | 그대로 `settings.cars` |
| `settings.bankName`/`accountNumber`/`userName` (계좌 메모용) | `profile.bankName`/`profile.accountNumber`/`profile.name` |
| `taxInvoiceViewMonth`(전역 문자열 `YYYY-MM`) | 함수 인자 `monthKey`(`TaxInvoicePage.jsx`가 이미 계산해 둔 값) |

## 2. 테스트 계획

`buildTaxInvoiceWorkbook`을 순수 함수로 분리한 이유 — ExcelJS로 워크북을 만든
뒤 `sheet.getCell(address).value`로 바로 읽어서 검증 가능(다운로드·Blob 불필요).
`src/lib/taxInvoiceExcelBuilder.test.js`에 실제 `exceljs`를 정적 import해서:

1. 공급가액·세액·합계금액이 정확한 셀(`C9`/`E9`/`A18`)에 숫자로 들어가는지
   (문자열 아님 — `numFmt`가 아니라 `.value` 타입 확인).
2. 공급자 사업자번호(`C3`)·상호(`C4`)가 `getTaxInvoiceSupplierBiz` 결과와
   일치하는지(매출 flow에서 `item.supplierBiz`가 있을 때 그걸 쓰는지, 없을 때
   `settings` 폴백을 쓰는지 — `getTaxInvoiceSupplierBiz` 자체 테스트가 이미
   있다면 그 케이스 재사용).
3. 공급받는자(거래처) 사업자번호(`H3`)·상호(`H4`)가 `item.clientBizNumber`/
   `item.clientName`과 일치하는지(매입(`purchase`) flow면 supplier/buyer가
   뒤바뀌는 것까지 — `finance.js:513-514` 그대로).
4. "입력자료" 시트(2번째 워크시트) 2번째 행이 헤더와 같은 순서로 실제 값을
   담는지.
5. `buildTaxInvoiceExcelFileName`: 특수문자(`/`,`:` 등)가 포함된 거래처명이
   파일명에서 `_`로 치환되는지(`finance.js:516`의 정규식 그대로 포팅했는지 확인).

`TaxInvoiceEntryList.jsx`/`TaxInvoicePage.jsx` 쪽은 버튼 배선만이라 렌더
테스트 필수 아님(기존 관례, `ReportDetailView.jsx`도 렌더 테스트 없음) — 브라우저
검증으로 대체.

## 3. 스코프

**포함**: 화면의 "엑셀 저장" 버튼, 워크북 2개 시트(세금계산서 양식 + 입력자료),
파일명 규칙, 검증(기존 `invoiceCanIssue` 재사용). **안 건드릴 것**:
`getTaxInvoiceSupplierBiz`·`invoiceCanIssue`·`InvoiceLike` 필드 정의·PDF 리포트
기능(`lib/report.js` 등, 이번 슬라이스와 무관)·Supabase 스키마·발행/취소 로직.

## 4. 다음 단계

착수 승인 후 작업자에게 이 파일 그대로 전달. 구현 완료 보고는 이 파일 §5에
이어 기록.
