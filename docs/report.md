# docs/report.md — 리포트 "세부 내역서(거래처별)" 뷰 이관

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **착수지시서 (2026-09-07). 보리 지시로 진행 — 이관 우선순위 대상(원본에 있던 기능).**
> 스코프 확인 2건 사용자 답변 완료: ① 1단계에 화면 조회 + PDF 다운로드 함께 포함
> (권장안). ② 서브 차량 기사 수수료 줄(원본에만 있음, react-app 리포트는 애초에
> 메인 차량 전용이라 로그 개념 자체가 없음)은 이번 슬라이스에서 제외 — 별도
> 이슈로만 기록.

## 0. 조사 메모

### 0-A. 원본 기능 (`script.js`)

- 리포트 화면 "⋮" 메뉴 → "세부 내역서 조회"(`index.html:60`) → 거래처 선택 모달
  (`detailReportSelectModal`, `index.html:1758`) → "조회 (화면)" → `viewDetailReport()`
  (`script.js:5173-5338`)이 같은 컨테이너(`#reportContentToExport`) 안의 내용을
  요약 표→세부 표로 바꿔치기.
- 거래처 드롭다운 옵션은 `openDetailReportModal()`(`script.js:5080-5117`)이 그 달
  실제 콜상세에 쓰인 거래처명 + 설정에 등록된 거래처 + "미지정"을 합쳐서 매번
  새로 만든다.
- 세부 표 각 행 = 그 달의 `callDetails` 하나(날짜/상차지/하차지/거래처/금액),
  선택한 거래처로 필터링(`clientFilter==='ALL'`이면 전체, 아니면 정확히 일치).
  **고정노선(`fixedCount`) 항목은 세부 표에 안 들어간다** — `callDetails`만 순회.
- 수수료는 저장 시점 스냅샷(`item.commissionSnapshot`) 우선, 없으면 현재 거래처
  설정으로 폴백(`script.js:5217-5224`) — 이 계산은 react-app에 이미
  [`getCallDetailCommissionAmount(detail, fare, settings)`](../react-app/src/domain/financeCore.js)
  로 그대로 존재한다(다른 화면용으로 이미 검증된 함수, **재사용**).
- 하단 요약 박스: 거래처별 "기본 운송료"(등록된 거래처만 이름별로, 미등록/미지정은
  "기본 운송료" 한 줄로 합산 — `defaultBaseFare`) + 그 아래 들여쓴 "수수료" 차감
  줄 + 부가세(10%) + 계. `clientFilter!=='ALL'`이면 그 거래처(또는 미지정) 한
  줄만 사실상 나옴.
- PDF로 내보낼 때 항목 15개 초과면 2단 분할 레이아웃(`script.js:5261-5270`) —
  **이번 1단계에서 제외**(아래 §3 스코프 참고, 백로그).
- "뒤로가기"는 세부 모드면 요약 모드로만 되돌리고(`handleReportBack`,
  `script.js:2293-2299`), 파일명에 "(세부)_거래처명"이 붙는다(`script.js:1657-1663`).

### 0-B. react-app 현재 상태 — 개념 자체가 없음

- [`ReportPage.jsx`](../react-app/src/components/ReportPage.jsx)는 요약만 있고
  거래처·수수료 개념이 리포트에 전혀 없다(수수료 계산 자체는 다른 화면
  — `financeCore.js`/`financeOwnerDetail.js` — 에 이미 있어 새로 안 만들어도 됨).
- [`lib/report.js`](../react-app/src/lib/report.js)의 `buildMonthReport`는
  `fare`(고정노선+콜상세 합산 총액)만 반환 — 거래처별로 안 쪼갠다.
- 리포트 화면은 **메인 차량 전용**(`AppShellRoutes.jsx`의 `report` 라우트가
  `logId` 없이 고정) — 원본의 서브차량(`activeLogId!=='main'`) 기사 수수료 줄은
  애초에 붙일 자리가 없다. 더 큰 별개 이슈(리포트 화면 자체가 서브차량을 지원
  안 함)라 이번 스코프 밖 — STATUS.md에 별도 기록만.
- `.report-table`/`.detail-report-table`/`.detail-*-cell` CSS가 react-app에 아예
  없다(원본 `style.css:2815-2899` 대응 규칙 전무). 다만 react-app은 이미
  `.info-table`(`side-menu.css:1036-1059`)을 원본과 다른 자체 스타일(border-collapse:
  collapse, radius 16px 등)로 재구현해 뒀으므로, **원본 CSS를 그대로 복사하지 말고
  이 파일의 기존 `.info-table`/`.summary-card`/PDF 모드 스타일과 일관된 톤으로
  `.report-table`/`.detail-report-table`을 새로 작성**한다(아래 §1 CSS 요구사항).

### 0-C. §8 4대 질문

1. **구독인가 스냅샷인가?** → 구독. `ReportPage.jsx`는 이미 `useOwnerWorkData`/
   `useOwnerClients` 등으로 store를 직접 구독 중 — 새 훅 불필요, 기존 구독값을
   `buildDetailReport`에 그대로 넘긴다.
2. **지금 보이는 값이 draft/Store/localStorage/Supabase 중 어디 것인가?** →
   Store(위 구독값). 이 슬라이스는 읽기 전용 뷰라 쓰기 경로 자체가 없다.
3. **쓰기 창구가 request\*인가, 배럴 우회인가?** → 해당 없음(쓰기 없음).
4. **hydrate·디바운스·동시편집이 겹치면 누가 이기는가?** → 해당 없음. 화면은
   렌더할 때마다 `useMemo`로 현재 store 값 기준 다시 계산 — 다른 곳에서 값이
   바뀌면 자동으로 최신 반영(기존 `buildMonthReport` 패턴과 동일).

## 1. 수정 계획

**신규 파일 2개 + 수정 3개, 1커밋.** (§3 "1~3개 파일" 기준보다 크지만, 987be18과
같은 사유로 §3/§6 응집도 우선 원칙 준용 — 도메인 계산·페이지·서브컴포넌트·
CSS·테스트가 "세부 내역서 뷰 하나"를 위해 자연히 나뉘는 구조라 더 쪼개면 오히려
흩어진다.)

| 파일 | 변경 |
|---|---|
| `src/lib/report.js` | 신규 함수 3개 추가(아래 §1-A). 기존 `buildMonthReport`/`buildReportFileName`/`dash` 무변경. |
| `src/components/ReportDetailView.jsx` (신규) | 거래처 선택 모달(`ReportClientPickerModal`, named export) + 세부 표·요약 박스(`ReportDetailContent`, default export) 2개 컴포넌트. |
| `src/components/ReportPage.jsx` | `viewMode`('summary'\|'detail')·`clientFilter` state 추가, "세부 내역서" 버튼 1개 추가(기존 "PDF 다운로드" 옆), `viewMode==='detail'`이면 `#reportContentToExport` 안쪽을 `ReportDetailContent`로 교체, PDF 파일명도 모드별로 분기. |
| `src/lib/report.test.js` | 신규 함수 3개 테스트 추가. |
| `src/side-menu.css` | `.report-table`/`.detail-report-table`/`.detail-date-cell`/`.detail-location-cell`/`.detail-amount-cell`/`.detail-text-cell` 추가 + PDF 모드 대응 규칙(아래 §1-C). |

### 1-A. `src/lib/report.js` 신규 함수

원본 `viewDetailReport`(`script.js:5173-5338`)를 그대로 포팅하되, 상수 계산은
`getCallDetailCommissionAmount`(기존 함수, import)로 대체한다. **`callDetails`만
순회, 고정노선(`fixedCount`) 미포함**(원본과 동일 — 0-A 참고).

```js
import { getCallDetails } from '../domain/day-record.js'
import { getCallDetailCommissionAmount } from '../domain/financeCore.js'
import { parseCurrencyValue } from '../domain/money.js'
```

1. **`detailReportClientOptions(workData, year, monthIndex, clients)`** → 원본
   `openDetailReportModal`과 동일한 집합 만들기: 등록된 거래처명(`clients[].companyName`)
   ∪ 그 달 실제 콜상세에 쓰인 거래처명 ∪ `'미지정'`. `'ALL'`을 맨 앞에 붙여 반환
   (`Array<string>`).
2. **`buildDetailReport(workData, year, monthIndex, clientFilter, settings)`** →
   `{ clients?: Array<ClientLike> }` 모양의 `settings`(react-app 훅에서 이미 얻는
   `clients` 배열을 `{ clients }`로 감싸서 전달하면 됨 — `buildFinanceSettings` 같은
   무거운 스냅샷 빌더 새로 안 씀). 그 달 날짜를 오름차순으로 순회하며 `isOff`
   레코드는 건너뛰고, `getCallDetails(record)` 각 항목에 대해 `clientFilter`
   일치 여부를 확인(`'ALL'`이면 전부, 아니면 `detail.client || '미지정'`과 정확히
   일치하는 것만). 등록된 거래처면 `monthFareByClient`에, 아니면 `defaultBaseFare`에
   합산(원본 `isRegisteredClient` 분기 그대로). 커미션은
   `getCallDetailCommissionAmount(detail, fare, settings)`로 계산해 0보다 크면
   `monthCommByClient`/`clientCommLabels`에 반영(라벨은 `type==='direct'`면
   `"${금액.toLocaleString()}원"`, 아니면 `"${value}%"` — 원본 5226-5233과 동일).
   반환: `{ items: Array<{dateStr, loadLoc, unloadLoc, client, fare}>, totalFare,
   totalCommission, defaultBaseFare, monthFareByClient, monthCommByClient,
   clientCommLabels, vat, grandTotal }`. `vat = Math.round(totalFare*0.1)`,
   `grandTotal = totalFare - totalCommission + vat`(원본은 여기에 서브차량 기사
   수수료도 빼지만 이번 슬라이스는 메인 전용이라 그 항목 없음 — §3 스코프 결정).
3. **`buildDetailReportFileName(year, monthIndex, clientFilter)`** → 기존
   `buildReportFileName`은 시그니처 그대로 두고(테스트·요약모드 호출부 무변경),
   세부 모드 전용으로 별도 함수 추가: `` `${year}년_${monthIndex+1}월_운송비내역서(세부)_${clientFilter==='ALL'?'전체':clientFilter}.pdf` ``.

### 1-B. `ReportDetailView.jsx` (신규)

- `export function ReportClientPickerModal({ open, options, value, onChange, onConfirm, onClose })`
  — `<select>`(옵션은 `detailReportClientOptions` 결과, `'ALL'`은 "전체 (모두)"로
  표시) + "조회" 버튼. 기존 `ConfirmModal.jsx` 또는 `AppSettingsPage.jsx`류 모달
  마크업 패턴 참고해서 스타일 일관성 맞출 것(새 모달 CSS 프레임워크 새로 만들지
  말 것).
- `export default function ReportDetailContent({ report, clientFilter, showClientColumn })`
  — 표(날짜/상차지/하차지/[거래처]/금액, `showClientColumn=clientFilter==='ALL'`)
  + 그 아래 요약(거래처별 기본 운송료 + 수수료 차감 줄 + 부가세 + 계, 원본
  `script.js:5296-5331`과 동일 구조이되 CSS 클래스는 react-app 기존
  `.summary-card`/`.summary-row`/`.summary-row.total` 재사용 — `.report-summary-box`
  새로 안 만듦).
- 항목 0건이면 "해당 내역이 없습니다." 행(원본 5167 그대로).

### 1-C. `side-menu.css` 추가 규칙

원본 `style.css:2815-2899`을 그대로 복사하지 말고, 이 파일의 기존 `.info-table`
스타일(1036-1059줄, `border-collapse:collapse`·`border-radius:16px` 톤)과
일관되게 새로 작성. 요구사항만 명시(정확한 px 값은 작업자 재량):
- `.report-table`: `.info-table`과 같은 테두리·배경 톤, 헤더(`th`) 가운데 정렬.
- `.report-table td.amount`: 오른쪽 정렬.
- `.detail-report-table .detail-location-cell`: PDF 모드가 아닐 때만
  줄바꿈 허용(`white-space: normal; word-break: break-all;`) — 화면에서 긴
  상/하차지 주소가 잘리지 않게(원본 2874-2878과 동일 의도).
- PDF 모드(`body.pdf-export-mode`)에서 `.report-table`도 기존 `.info-table`의
  흑백 인쇄 톤(`#f2f2f2`/`#cccccc`/`#000000`)을 따르도록 규칙 추가(기존
  1102-1118줄 패턴 재사용).

## 2. 테스트 계획

`src/lib/report.test.js`에 추가(기존 `buildReportFileName` 테스트는 무변경):

1. `detailReportClientOptions`: 등록된 거래처 + 그 달 콜상세에만 나온
   미등록 거래처명 + `'미지정'`이 전부 포함되는지, 다른 달 콜상세는 안
   섞이는지, `'ALL'`이 맨 앞인지.
2. `buildDetailReport`:
   - `clientFilter='ALL'`이면 그 달 모든 콜상세 항목이 `items`에 포함되고
     고정노선(`fixedCount`)은 안 섞이는지.
   - 특정 거래처로 필터링하면 그 거래처 것만 나오는지(다른 거래처·미지정 제외).
   - 등록된 거래처 fare는 `monthFareByClient`에, 미등록/미지정은
     `defaultBaseFare`에 합산되는지.
   - `commissionSnapshot`이 있으면 그걸 우선 쓰고, 없으면 현재 거래처
     `commEnabled`/`commType`/`commValue`로 폴백하는지(기존
     `getCallDetailCommissionAmount` 테스트와 같은 fixture 재사용 가능).
   - `isOff` 레코드는 완전히 제외되는지.
3. `buildDetailReportFileName`: `'ALL'`이면 "전체", 아니면 거래처명이 파일명에
   들어가는지.

`ReportDetailView.jsx`는 순수 렌더(로직은 위 도메인 함수가 이미 검증) —
별도 렌더 테스트는 필수 아님(기존 `ReportPage.jsx`도 렌더 테스트 없음, 브라우저
검증으로 대체하는 이 코드베이스 기존 관례와 동일).

## 3. 스코프 결정 (사용자 답변, 2026-09-07)

- **PDF 다운로드 포함**: 기존 `handleDownloadPdf`가 `exportRef.current`(현재 화면에
  보이는 내용)를 그대로 내보내는 구조라, `viewMode==='detail'`일 때 그 안에
  `ReportDetailContent`가 렌더돼 있으면 **추가 코드 없이 PDF도 자동으로 세부
  모드로 나간다.** 파일명만 `buildDetailReportFileName`으로 분기하면 됨.
- **서브 차량 기사 수수료 줄 제외**: 리포트 화면 자체가 메인 전용이라 이번
  스코프 아님. STATUS.md "이관 완료 후 진행사항"이 아니라 "알려진 이슈"로 별도
  기록(원본에 있던 기능이라 완전 제외 아님, 리포트 화면의 서브차량 지원 자체가
  선행돼야 함).
- **제외(2단계 백로그)**: PDF 항목 15개 초과 시 2단 분할 레이아웃(원본
  `script.js:5261-5270`). 이번엔 항목이 많아도 1단 그대로 — 화면·PDF 모두 동작은
  하되 인쇄 시 세로로 길어질 수 있음(기능 결손 아님, 레이아웃 최적화만 후순위).

**안 건드릴 것**: `buildMonthReport`·`buildReportFileName`(요약 모드 무변경),
`financeCore.js`/`financeOwnerDetail.js`(재사용만, 로직 무변경), Supabase 스키마,
쓰기 경로 전부.

## 4. 다음 단계

착수 승인 후 작업자에게 이 파일 그대로 전달. 구현 완료 보고는 이 파일 §5에 이어
기록.
