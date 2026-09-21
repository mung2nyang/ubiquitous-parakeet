# 고정노선 스코프 호출부 전수 조사

> 조사일: 2026-09-21  
> 범위: `react-app/src` 정적 읽기 전용 조사. 코드·테스트·데이터는 실행하거나 수정하지 않았다.  
> 기준: `docs/report.md` §1·§6. 🔧는 모두 **AI 관찰·미확인**이며 버그 확정이 아니다.

## 1. 먼저 확인한 보정 결과와 Q1~Q6 결론

### 보정 결과

- `DayLogPage.jsx:80`, `financeCore.js:160,162`, `financeOwnerDetail.js:62,65`, `financeTaxInvoiceGroups.js:55`, `CalendarPage.jsx:61,65`의 **차주가 서브차량을 보는 맥락 ②**는 모두 ✅ 스코프 맞음이다. 서브차량 번호는 라우트의 `logId`에서 온다(`react-app/src/app/MainPageRoute.jsx:51-53,112-115`; `react-app/src/components/ReportPage.jsx:34-36`).
- `financeCore.js:105,107`, `financeTaxInvoiceGroups.js:128,130`은 모두 ✅ 스코프 맞음이다. 두 경로 모두 `link.vehicleNumber`를 직접 넘긴다(`react-app/src/domain/financeCore.js:104-110`; `react-app/src/domain/financeTaxInvoiceGroups.js:127-133`).
- Q1~Q5는 아래와 같이 모두 ✅/🔧/➖ 중 하나로 결론을 냈다. ❓ 판단 보류는 없다.

| 질문 | 결론 | 비개발자용 답 | 핵심 증거 |
|---|---|---|---|
| Q1 직원 기사 본인 달력·월 정산 | 🔧 스코프 필요 | 직원 기사 일지는 화면상 `main`이지만 거래처는 배정 차량번호로 저장된다. 달력은 배정 차량번호가 아니라 `main`을 넘기므로, 정상 로그인 직후 자료에서는 본인 단가도 차주 단가도 찾지 못해 0원/거래처 없음이 된다. 차주 거래처가 함께 들어온 비정상·과거 상태라면 차주 값으로 물러날 수 있다. | `react-app/src/app/MainPageRoute.jsx:51-63,112-115`; `react-app/src/components/calendar/CalendarPage.jsx:61,65`; `react-app/src/lib/hydrateEmployedDriver.js:152-163`; `react-app/src/domain/clients.js:23-30` |
| Q2 기사 본인 매출 | 🔧 스코프 필요 | 화면의 운송료 기본 합계는 `main`으로 계산해 본인 고정노선 단가를 놓친다. 다만 기사 정산액 계산은 `link.vehicleNumber`를 넘겨 본인 단가를 제대로 쓴다. 즉 한 화면 안에 🔧 경로와 ✅ 경로가 함께 있다. | `react-app/src/domain/driverSelfRevenue.js:52-69,84-99`; `react-app/src/domain/financeOwnerDetail.js:41,58-66`; `react-app/src/domain/financeCore.js:104-110` |
| Q3 운송비 내역서 | 🔧 스코프 필요 | 메인 전용이 아니다. `/app/logs/:logId/report`가 있고 서브 일지를 읽지만, 단가·고정노선 거래처는 차량번호 없이 계정 기본값을 읽는다. 따라서 서브 10만원/차주 25만원이면 서브 내역서가 25만원으로 계산된다. 직원 기사 본인 내역서는 scoped 거래처만 있으므로 0원이 될 수 있다. | `react-app/src/app/AppShellRoutes.jsx:73,93`; `react-app/src/components/ReportPage.jsx:34-57`; `react-app/src/lib/reportSummary.js:64-79` |
| Q4 `ownerFinance.js:117` 값 소비 여부 | ➖ 스코프 무관 | `unitPrice` 필드는 만들어지지만 프로덕션에서 `settings.unitPrice`를 읽는 곳이 없다. 실제 계산기는 각자 `resolveFixedUnitPrice`를 다시 부르거나 옵션으로 받은 값을 쓴다. 현재 실행 결과를 바꾸지 않는 필드다. | `react-app/src/lib/ownerFinance.js:107-137`; `react-app/src/domain/clients.js:34-42`; `react-app/src/domain/monthSettlement.js:58`; `react-app/src/lib/reportSummary.js:34` |
| Q5 달력 단가 수정 경로 | ➖ 스코프 무관 | `requestClientFixedUnitPrice`를 부르는 프로덕션 화면이 없다. 함수 자체는 스코프를 고르지 않고 전달받은 `clientId` 한 건만 바꾸지만, 현재 달력에서는 호출되지 않는다. 실제 거래처 단가 편집은 거래처 폼 저장 경로다. | `react-app/src/lib/clientMutations.js:103-116`; `react-app/src/domain/clients.js:156-158`; `react-app/src/components/calendar/CalendarPage.jsx:44-75`; `react-app/src/components/clients/ClientListPage.jsx:48-75` |
| Q6 게스트 스코프 필요 여부 | ✅ 스코프 맞음 | 필요하다. 게스트는 기사 초대는 쓰지 않지만, 메인 차량 뒤에 **미연동 서브차량**을 추가할 수 있고 그 일지·거래처 화면은 차량번호 스코프를 쓴다. 달력·일지는 맞고, 서브 내역서는 Q3의 🔧 관찰을 함께 받는다. | `docs/sot.md:463-466`; `react-app/src/components/cars/CarListPage.jsx:53-75`; `react-app/src/app/AppShell.jsx:77-80`; `react-app/src/app/subLogMenuItems.js:14-35`; `react-app/src/app/AppShellRoutes.jsx:70-76` |

### 조치 현황 (2026-09-21 갱신)

- **Q1 연동기사 본인 달력·월 정산 카드 / Q2 기사 본인 매출:** 조치 완료 — react-app `1413e8e`(스코프 수정 묶음 1, 보리 브라우저 확인·최종 승인). 달력에 `clientScopeKey`를 넘기고, 매출 운송료가 배정 차량 스코프 단가를 쓰게 함.
- **Q3 운송비 내역서 / Q3 관련 🔧(reportSummary):** 미조치 — 스코프 수정 묶음 2(roadmap). `finance-parity.md` F-06(서브차량 내역서 합계 원본 100,000원 vs react 110,000원)과 같은 코드 영역이라 함께 조사.
- 위 표·§3~§5의 판정은 **조사 시점(2026-09-21 오전) 기준**이며 그대로 두었다.

## 2. 요약 개수

검색식은 지시서 그대로 `getFixedRouteClient|resolveFixedUnitPrice|fixedRouteLinked|fixedUnitPrice|palletOn|palletPrice|scopedToVehicleNumber`를 사용했다. 테스트·테스트 지원·테스트 fixture 125줄은 아래 본표에서 제외했고, 프로덕션 142줄은 한 줄도 빼지 않고 한 행씩 실었다.

한 행이 맥락에 따라 달라지면 전체 판정 수에서는 더 주의가 필요한 판정(🔧 > ❓ > ✅ > ➖)으로 한 번만 셌다. 맥락별 표에서는 그 맥락의 실제 판정을 셌으며, 여러 맥락에서 실행되는 행은 각 열에 중복 집계했다.

| 구분 | ✅ 스코프 맞음 | 🔧 스코프 필요 | ❓ 판단 보류 | ➖ 스코프 무관 | 합계 |
|---|---:|---:|---:|---:|---:|
| 프로덕션 검색 행(행당 1회) | 80 | 11 | 0 | 51 | 142 |
| ① 차주 메인 | 76 | 0 | 0 | 49 | 125 |
| ② 차주 서브 | 69 | 4 | 0 | 49 | 122 |
| ③ 직원 기사 본인 | 58 | 11 | 0 | 47 | 116 |
| ④ 게스트 | 78 | 4 | 0 | 50 | 132 |

맥락별 합계가 142보다 작거나 큰 것은 정상이다. 예를 들어 직원 전용 hydrate 행은 ③에만 들어가고, 공용 도메인 행은 네 맥락에 모두 들어간다.

## 3. 호출부 전수 표 — 프로덕션 검색 142줄

표의 `①~④`는 지시서 §2의 실행 맥락이다. `①✅/②✅/③🔧`처럼 적힌 행은 같은 코드라도 로그인·화면에 따라 결과가 달라진다는 뜻이다. 모든 ➖도 해당 파일:줄에서 값을 고르지 않는 이유를 붙였다.

| # | 호출부(파일:줄) | 무엇을 읽나 | 실행 맥락 | 스코프 인자·출처 | 판정 | 비고 |
|---:|---|---|---|---|---|---|
| 1 | `react-app/src/domain/calendarBadges.js:45` | 단가 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 주석이며 값 선택은 호출부가 한다(`calendarBadges.js:45-46`). |
| 2 | `react-app/src/domain/calendarBadges.js:46` | resolver 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 실제 호출 없음(`calendarBadges.js:45-46`). |
| 3 | `react-app/src/store/ownerDataHooks.js:54` | 단가 갱신 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 주석만 해당한다(`ownerDataHooks.js:54`). |
| 4 | `react-app/src/domain/clients.js:9` | resolver 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 값 읽기 없음(`clients.js:9`). |
| 5 | `react-app/src/domain/clients.js:23` | 고정노선 거래처 선택 API | ①②③④ | 호출자가 `scopeKey` 전달 | ✅ 스코프 맞음 | 스코프 선택의 단일 창구(`clients.js:23-31`). |
| 6 | `react-app/src/domain/clients.js:27` | 같은 차량 고정노선 | ①②③④ | 정규화한 `scopeKey` | ✅ 스코프 맞음 | 스코프 일치를 먼저 찾는다(`clients.js:24-28`). |
| 7 | `react-app/src/domain/clients.js:30` | 차주 기본 고정노선 | ①②③④ | 스코프 없는 레코드 | ✅ 스코프 맞음 | 같은 스코프가 없을 때만 기본값으로 물러난다(`clients.js:27-30`). |
| 8 | `react-app/src/domain/clients.js:34` | 옛 `settings.unitPrice` 설명 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 주석이며 fallback으로 읽지 않는다(`clients.js:34-42`). |
| 9 | `react-app/src/domain/clients.js:41` | 고정노선 단가 선택 API | ①②③④ | 호출자가 `scopeKey` 전달 | ✅ 스코프 맞음 | 거래처 선택과 같은 키를 받는다(`clients.js:41-42`). |
| 10 | `react-app/src/domain/clients.js:42` | 선택 거래처의 단가 | ①②③④ | `getFixedRouteClient(..., scopeKey)` | ✅ 스코프 맞음 | 선택된 같은 레코드의 단가만 읽는다(`clients.js:42`). |
| 11 | `react-app/src/domain/clients.js:48` | 계산 함수 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 스코프 선택 없음(`clients.js:48`). |
| 12 | `react-app/src/domain/clients.js:51` | 계산 옵션 타입 | ①②③④ | 이미 선택된 숫자 | ➖ 스코프 무관 | 타입 설명일 뿐이다(`clients.js:51`). |
| 13 | `react-app/src/domain/clients.js:57` | 전달받은 단가 | ①②③④ | `opts.fixedUnitPrice` | ➖ 스코프 무관 | 어느 거래처인지 고르지 않고 숫자만 계산한다(`clients.js:51-60`). |
| 14 | `react-app/src/domain/clients.js:94` | 저장 draft의 고정노선 여부 | ①②③④ | 같은 draft | ✅ 스코프 맞음 | scope와 함께 한 레코드로 저장된다(`clients.js:94-123`). |
| 15 | `react-app/src/domain/clients.js:95` | 저장 draft의 고정 단가 | ①②③④ | 같은 draft | ✅ 스코프 맞음 | 같은 레코드의 단가다(`clients.js:94-123`). |
| 16 | `react-app/src/domain/clients.js:96` | 저장 draft의 파렛트 여부 | ①②③④ | 같은 draft | ✅ 스코프 맞음 | 같은 레코드에 보존된다(`clients.js:94-123`). |
| 17 | `react-app/src/domain/clients.js:97` | 저장 draft의 파렛트 단가 | ①②③④ | 같은 draft | ✅ 스코프 맞음 | 같은 레코드에 보존된다(`clients.js:94-123`). |
| 18 | `react-app/src/domain/clients.js:100` | 고정 단가 필수 검사 | ①②③④ | 같은 draft | ✅ 스코프 맞음 | 스코프 선택이 끝난 draft 안에서 검사한다(`clients.js:94-100`). |
| 19 | `react-app/src/domain/clients.js:101` | 파렛트 단가 필수 검사 | ①②③④ | 같은 draft | ✅ 스코프 맞음 | 같은 draft 안에서 검사한다(`clients.js:96-101`). |
| 20 | `react-app/src/domain/clients.js:119` | 저장 고정노선 여부 | ①②③④ | `next` 레코드 | ✅ 스코프 맞음 | `scopedToVehicleNumber`와 같은 객체에 저장된다(`clients.js:113-123`). |
| 21 | `react-app/src/domain/clients.js:120` | 저장 고정 단가 | ①②③④ | `next` 레코드 | ✅ 스코프 맞음 | 고정노선이 켜진 같은 객체에 저장된다(`clients.js:119-123`). |
| 22 | `react-app/src/domain/clients.js:121` | 저장 파렛트 여부 | ①②③④ | `next` 레코드 | ✅ 스코프 맞음 | scope와 같은 객체다(`clients.js:119-123`). |
| 23 | `react-app/src/domain/clients.js:122` | 저장 파렛트 단가 | ①②③④ | `next` 레코드 | ✅ 스코프 맞음 | scope와 같은 객체다(`clients.js:119-123`). |
| 24 | `react-app/src/domain/clients.js:123` | 저장 차량 스코프 | ①②③④ | `draft.scopedToVehicleNumber` | ✅ 스코프 맞음 | 전달된 차량번호를 정리해 보존한다(`clients.js:123`). |
| 25 | `react-app/src/domain/clients.js:136` | 저장 레코드의 scope | ①②③④ | `next.scopedToVehicleNumber` | ✅ 스코프 맞음 | 자동 해제 범위를 정하는 키다(`clients.js:136-142`). |
| 26 | `react-app/src/domain/clients.js:137` | 고정노선 저장 여부 | ①②③④ | `savedScope`와 결합 | ✅ 스코프 맞음 | 켠 경우에만 같은 scope 정리를 한다(`clients.js:136-142`). |
| 27 | `react-app/src/domain/clients.js:140` | 기존 거래처 scope | ①②③④ | `savedScope`와 비교 | ✅ 스코프 맞음 | 다른 차량 것은 건드리지 않는다(`clients.js:139-141`). |
| 28 | `react-app/src/domain/clients.js:141` | 같은 scope 고정노선 해제 | ①②③④ | 같은 `savedScope` | ✅ 스코프 맞음 | 같은 scope에서만 해제한다(`clients.js:136-142`). |
| 29 | `react-app/src/domain/clients.js:148` | 단가 수정 함수 설명 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 주석만 해당한다(`clients.js:148`). |
| 30 | `react-app/src/domain/clients.js:158` | 특정 거래처 단가 수정 | ①②③④ | 명시적 `clientId` | ➖ 스코프 무관 | scope 검색이 아니라 정확한 id 한 건만 바꾼다(`clients.js:156-158`). |
| 31 | `react-app/src/domain/clients.js:180` | 순서변경 대상 기본 거래처 | ①②③④ | scope 없음 필터 | ✅ 스코프 맞음 | 기본 목록만 재정렬한다(`clients.js:179-189`). |
| 32 | `react-app/src/domain/clients.js:181` | 순서변경 제외 scoped 거래처 | ①②③④ | scope 있음 필터 | ✅ 스코프 맞음 | scoped 레코드는 별도로 보존한다(`clients.js:180-189`). |
| 33 | `react-app/src/domain/clients.js:211` | 메인 일지 거래처 | ①②③④ | `logId`가 `main` | ✅ 스코프 맞음 | scope 없는 거래처만 반환한다(`clients.js:201-214`). |
| 34 | `react-app/src/domain/clients.js:213` | 서브 일지 거래처 | ①②③④ | `logId` 차량번호 | ✅ 스코프 맞음 | 정확히 같은 차량번호만 반환한다(`clients.js:201-214`). |
| 35 | `react-app/src/domain/clientTypes.js:16` | scope 타입 선언 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | JSDoc 타입이다(`clientTypes.js:16`). |
| 36 | `react-app/src/domain/clientTypes.js:20` | 고정노선 타입 선언 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | JSDoc 타입이다(`clientTypes.js:20`). |
| 37 | `react-app/src/domain/clientTypes.js:21` | 파렛트 타입 선언 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | JSDoc 타입이다(`clientTypes.js:21`). |
| 38 | `react-app/src/domain/clientTypes.js:22` | 파렛트 단가 타입 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | JSDoc 타입이다(`clientTypes.js:22`). |
| 39 | `react-app/src/domain/clientTypes.js:23` | 고정 단가 타입 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | JSDoc 타입이다(`clientTypes.js:23`). |
| 40 | `react-app/src/domain/clientTypes.js:47` | draft scope 타입 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | JSDoc 타입이다(`clientTypes.js:47`). |
| 41 | `react-app/src/domain/clientTypes.js:51` | draft 고정 여부 타입 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | JSDoc 타입이다(`clientTypes.js:51`). |
| 42 | `react-app/src/domain/clientTypes.js:52` | draft 고정 단가 타입 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | JSDoc 타입이다(`clientTypes.js:52`). |
| 43 | `react-app/src/domain/clientTypes.js:53` | draft 파렛트 타입 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | JSDoc 타입이다(`clientTypes.js:53`). |
| 44 | `react-app/src/domain/clientTypes.js:54` | draft 파렛트 단가 타입 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | JSDoc 타입이다(`clientTypes.js:54`). |
| 45 | `react-app/src/domain/day-record.js:19` | 파렛트 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 필드 설명만 있다(`day-record.js:19-20`). |
| 46 | `react-app/src/components/calendar/CalendarPage.jsx:16` | selector import | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | import 자체는 값을 고르지 않는다(`CalendarPage.jsx:16`). |
| 47 | `react-app/src/components/calendar/CalendarPage.jsx:61` | 달력 고정 단가 | ①②③④ | route `logId` | 🔧 스코프 필요 | ①·②·④는 ✅, ③은 실제 scope가 `cars[0].number`지만 달력은 `main`을 받는다(`MainPageRoute.jsx:60-63,112-115`). |
| 48 | `react-app/src/components/calendar/CalendarPage.jsx:65` | 달력 고정노선 거래처 | ①②③④ | route `logId` | 🔧 스코프 필요 | ①·②·④는 ✅. ②/④ 서브는 차량번호여서 맞고, ③만 `main`이라 맞지 않는다(`CalendarPage.jsx:52-65`). |
| 49 | `react-app/src/store/persistDomainRecords.js:46` | 저장 허용 scope·고정 여부 키 | ①②③④ | 같은 client 객체 | ✅ 스코프 맞음 | 두 키를 모두 허용한다(`persistDomainRecords.js:44-49`). |
| 50 | `react-app/src/store/persistDomainRecords.js:47` | 저장 허용 파렛트·단가 키 | ①②③④ | 같은 client 객체 | ✅ 스코프 맞음 | scope와 함께 보존 가능한 키다(`persistDomainRecords.js:44-49`). |
| 51 | `react-app/src/store/persistDomainRecords.js:98` | 고정 여부 타입 검증 | ①②③④ | 같은 client 객체 | ✅ 스코프 맞음 | 레코드 전체를 그대로 검증한다(`persistDomainRecords.js:93-110`). |
| 52 | `react-app/src/store/persistDomainRecords.js:99` | 파렛트 여부 타입 검증 | ①②③④ | 같은 client 객체 | ✅ 스코프 맞음 | 값 삭제 없이 타입만 검증한다(`persistDomainRecords.js:93-110`). |
| 53 | `react-app/src/store/persistDomainRecords.js:101` | 파렛트 단가 타입 검증 | ①②③④ | 같은 client 객체 | ✅ 스코프 맞음 | scope와 독립 필드로 보존한다(`persistDomainRecords.js:93-110`). |
| 54 | `react-app/src/store/persistDomainRecords.js:102` | 고정 단가 타입 검증 | ①②③④ | 같은 client 객체 | ✅ 스코프 맞음 | scope와 독립 필드로 보존한다(`persistDomainRecords.js:93-110`). |
| 55 | `react-app/src/store/persistDomainRecords.js:107` | scope 문자열 검증 | ①②③④ | 같은 client 객체 | ✅ 스코프 맞음 | `scopedToVehicleNumber`를 허용·검증한다(`persistDomainRecords.js:107-109`). |
| 56 | `react-app/src/domain/financeCore.js:10` | selector import | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | import 자체다(`financeCore.js:10`). |
| 57 | `react-app/src/domain/financeCore.js:105` | 기사 정산 고정 거래처 | ①②③④ | `link.vehicleNumber` | ✅ 스코프 맞음 | 배정 차량번호를 직접 넘긴다(`financeCore.js:104-110`). |
| 58 | `react-app/src/domain/financeCore.js:107` | 기사 정산 고정 단가 | ①②③④ | `link.vehicleNumber` | ✅ 스코프 맞음 | 보정 정답과 일치한다(`financeCore.js:104-110`). |
| 59 | `react-app/src/domain/financeCore.js:108` | 기사 정산 파렛트 단가 | ①②③④ | 57번이 고른 거래처 | ✅ 스코프 맞음 | 같은 scoped 거래처에서 읽는다(`financeCore.js:105-110`). |
| 60 | `react-app/src/domain/financeCore.js:110` | 기사 정산 파렛트 사용 여부 | ①②③④ | 57번이 고른 거래처 | ✅ 스코프 맞음 | 같은 scoped 거래처에서 읽는다(`financeCore.js:105-110`). |
| 61 | `react-app/src/domain/financeCore.js:159` | source scope 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 다음 행의 설명이다(`financeCore.js:159`). |
| 62 | `react-app/src/domain/financeCore.js:160` | 차량별 고정 거래처 | ①②③④ | `source.logId` | ✅ 스코프 맞음 | source는 메인 또는 차량번호다(`financeCore.js:146-160`). |
| 63 | `react-app/src/domain/financeCore.js:161` | 차량별 파렛트 여부 | ①②③④ | 62번이 고른 거래처 | ✅ 스코프 맞음 | 같은 source 거래처다(`financeCore.js:160-163`). |
| 64 | `react-app/src/domain/financeCore.js:162` | 차량별 고정 단가 | ①②③④ | `source.logId` | ✅ 스코프 맞음 | 보정 정답과 일치한다(`financeCore.js:156-163`). |
| 65 | `react-app/src/domain/financeCore.js:163` | 차량별 파렛트 단가 | ①②③④ | 62번이 고른 거래처 | ✅ 스코프 맞음 | 같은 source 거래처다(`financeCore.js:160-163`). |
| 66 | `react-app/src/domain/financeCore.js:173` | 차량별 단가 곱셈 | ①②③④ | 64번이 고른 단가 | ✅ 스코프 맞음 | 동일 반복문의 source별 단가를 쓴다(`financeCore.js:156-173`). |
| 67 | `react-app/src/components/clients/ClientListItem.jsx:31` | 고정노선 배지 | ①④ | 부모가 scope 없는 목록만 전달 | ✅ 스코프 맞음 | 부모 필터는 `ClientListPage.jsx:40,95-98`이다. |
| 68 | `react-app/src/components/clients/ClientListItem.jsx:33` | 파렛트 배지 노출 조건 | ①④ | 부모가 scope 없는 목록만 전달 | ✅ 스코프 맞음 | scoped 레코드는 이 목록에 들어오지 않는다(`ClientListPage.jsx:40`). |
| 69 | `react-app/src/components/clients/ClientListItem.jsx:41` | 파렛트 배지 | ①④ | 부모가 scope 없는 목록만 전달 | ✅ 스코프 맞음 | 67번과 같은 부모 필터다(`ClientListPage.jsx:40,95-98`). |
| 70 | `react-app/src/components/clients/ClientListItem.jsx:42` | 파렛트 단가 표시 | ①④ | 부모가 scope 없는 목록만 전달 | ✅ 스코프 맞음 | 같은 client 객체의 단가다(`ClientListItem.jsx:41-43`). |
| 71 | `react-app/src/domain/financeOwnerDetail.js:9` | selector import | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | import 자체다(`financeOwnerDetail.js:9`). |
| 72 | `react-app/src/domain/financeOwnerDetail.js:61` | source scope 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 다음 행의 설명이다(`financeOwnerDetail.js:61`). |
| 73 | `react-app/src/domain/financeOwnerDetail.js:62` | 매출 상세 고정 거래처 | ①②③④ | `source.logId` | 🔧 스코프 필요 | ①·②·④는 ✅. 기사 본인 base는 일지가 `main`, 거래처는 차량번호 scope다(`driverSelfRevenue.js:52-54`). |
| 74 | `react-app/src/domain/financeOwnerDetail.js:64` | 매출 상세 파렛트 여부 | ①②③④ | 73번이 고른 거래처 | 🔧 스코프 필요 | ①·②·④는 ✅. ③에서 거래처를 못 찾아 false가 된다(`financeOwnerDetail.js:58-66`). |
| 75 | `react-app/src/domain/financeOwnerDetail.js:65` | 매출 상세 고정 단가 | ①②③④ | `source.logId` | 🔧 스코프 필요 | ①·②·④는 ✅. ③은 `main`이라 scoped 단가 대신 0이 된다(`hydrateEmployedDriver.js:152-163`). |
| 76 | `react-app/src/domain/financeOwnerDetail.js:66` | 매출 상세 파렛트 단가 | ①②③④ | 73번이 고른 거래처 | 🔧 스코프 필요 | ①·②·④는 ✅. ③은 거래처 null로 0이 된다(`financeOwnerDetail.js:62-66`). |
| 77 | `react-app/src/domain/financeOwnerDetail.js:75` | 매출 상세 고정 운송료 | ①②③④ | 75번의 source별 단가 | 🔧 스코프 필요 | ①·②·④는 ✅. ③에서 `fixedCount × 0`이 된다(`financeOwnerDetail.js:68-76`). |
| 78 | `react-app/src/components/clients/ClientListPage.jsx:23` | 빈 draft 기본값 | ①④ | scope 선택 없음 | ➖ 스코프 무관 | 상수 초기값일 뿐이다(`ClientListPage.jsx:17-24`). |
| 79 | `react-app/src/components/clients/ClientListPage.jsx:40` | 기본 거래처 목록 | ①④ | scope 없는 레코드 필터 | ✅ 스코프 맞음 | 메인 거래처 화면은 scoped 레코드를 숨긴다(`ClientListPage.jsx:33-40`). |
| 80 | `react-app/src/components/clients/ClientListPage.jsx:66` | 편집 고정 여부 | ①④ | 79번에서 고른 client | ✅ 스코프 맞음 | scope 없는 레코드만 편집한다(`ClientListPage.jsx:40,48-70`). |
| 81 | `react-app/src/components/clients/ClientListPage.jsx:67` | 편집 고정 단가 | ①④ | 79번에서 고른 client | ✅ 스코프 맞음 | 같은 client의 단가다(`ClientListPage.jsx:48-70`). |
| 82 | `react-app/src/components/clients/ClientListPage.jsx:68` | 편집 파렛트 여부 | ①④ | 79번에서 고른 client | ✅ 스코프 맞음 | 같은 client의 값이다(`ClientListPage.jsx:48-70`). |
| 83 | `react-app/src/components/clients/ClientListPage.jsx:69` | 편집 파렛트 단가 | ①④ | 79번에서 고른 client | ✅ 스코프 맞음 | 같은 client의 값이다(`ClientListPage.jsx:48-70`). |
| 84 | `react-app/src/components/drivers/LinkedDriverClientsPage.jsx:32` | 빈 draft 기본값 | ②④ | scope 선택 없음 | ➖ 스코프 무관 | 상수 초기값일 뿐이다(`LinkedDriverClientsPage.jsx:26-33`). |
| 85 | `react-app/src/components/drivers/LinkedDriverClientsPage.jsx:71` | 새 거래처 scope | ②④ | route context의 `scopeKey` | ✅ 스코프 맞음 | 연결/미연결 차량번호를 구한다(`LinkedDriverClientsPage.jsx:44-57,69-72`). |
| 86 | `react-app/src/components/drivers/LinkedDriverClientsPage.jsx:85` | 편집 거래처 scope | ②④ | 기존 scope 또는 현재 차량번호 | ✅ 스코프 맞음 | 해당 scope 목록에서 고른 레코드다(`LinkedDriverClientsPage.jsx:85,136-147`). |
| 87 | `react-app/src/components/drivers/LinkedDriverClientsPage.jsx:87` | 편집 고정 여부 | ②④ | 86번 scoped client | ✅ 스코프 맞음 | 같은 레코드의 값이다(`LinkedDriverClientsPage.jsx:76-89`). |
| 88 | `react-app/src/components/drivers/LinkedDriverClientsPage.jsx:88` | 편집 단가·파렛트 | ②④ | 86번 scoped client | ✅ 스코프 맞음 | 같은 레코드의 값이다(`LinkedDriverClientsPage.jsx:76-89`). |
| 89 | `react-app/src/components/drivers/LinkedDriverClientsPage.jsx:94` | 저장 scope | ②④ | 현재 차량 `scopeKey` | ✅ 스코프 맞음 | 저장 직전에 차량번호를 다시 고정한다(`LinkedDriverClientsPage.jsx:93-101`). |
| 90 | `react-app/src/components/drivers/LinkedDriverClientsPage.jsx:136` | 화면 scoped 목록 | ②④ | 현재 차량 `scopeKey` | ✅ 스코프 맞음 | 정확히 같은 차량번호만 표시한다(`LinkedDriverClientsPage.jsx:136-147`). |
| 91 | `react-app/src/components/clients/ClientTradeFields.jsx:33` | draft 고정 여부 표시 | ①②③④ | 부모가 고른 draft | ➖ 스코프 무관 | 이 표시 컴포넌트는 client/scope를 선택하지 않는다(`ClientTradeFields.jsx:10,22-34`). |
| 92 | `react-app/src/components/clients/ClientTradeFields.jsx:34` | draft 고정 여부 변경 | ①②③④ | 부모가 고른 draft | ➖ 스코프 무관 | 같은 draft 값만 바꾼다(`ClientTradeFields.jsx:33-34`). |
| 93 | `react-app/src/components/clients/ClientTradeFields.jsx:39` | 단가 입력 노출 | ①②③④ | 부모가 고른 draft | ➖ 스코프 무관 | scope 선택 없음(`ClientTradeFields.jsx:39-50`). |
| 94 | `react-app/src/components/clients/ClientTradeFields.jsx:47` | draft 고정 단가 표시 | ①②③④ | 부모가 고른 draft | ➖ 스코프 무관 | scope 선택 없음(`ClientTradeFields.jsx:39-48`). |
| 95 | `react-app/src/components/clients/ClientTradeFields.jsx:48` | draft 고정 단가 변경 | ①②③④ | 부모가 고른 draft | ➖ 스코프 무관 | 같은 draft 값만 바꾼다(`ClientTradeFields.jsx:47-48`). |
| 96 | `react-app/src/components/clients/ClientTradeFields.jsx:62` | draft 파렛트 여부 표시 | ①②③④ | 부모가 고른 draft | ➖ 스코프 무관 | scope 선택 없음(`ClientTradeFields.jsx:54-64`). |
| 97 | `react-app/src/components/clients/ClientTradeFields.jsx:63` | draft 파렛트 여부 변경 | ①②③④ | 부모가 고른 draft | ➖ 스코프 무관 | 같은 draft 값만 바꾼다(`ClientTradeFields.jsx:62-63`). |
| 98 | `react-app/src/components/clients/ClientTradeFields.jsx:68` | 파렛트 단가 입력 노출 | ①②③④ | 부모가 고른 draft | ➖ 스코프 무관 | scope 선택 없음(`ClientTradeFields.jsx:68-79`). |
| 99 | `react-app/src/components/clients/ClientTradeFields.jsx:76` | draft 파렛트 단가 표시 | ①②③④ | 부모가 고른 draft | ➖ 스코프 무관 | scope 선택 없음(`ClientTradeFields.jsx:68-77`). |
| 100 | `react-app/src/components/clients/ClientTradeFields.jsx:77` | draft 파렛트 단가 변경 | ①②③④ | 부모가 고른 draft | ➖ 스코프 무관 | 같은 draft 값만 바꾼다(`ClientTradeFields.jsx:76-77`). |
| 101 | `react-app/src/lib/hydrateEmployedDriver.js:3` | 기사 거래처 hydrate 설명 | ③ | 배정 차량번호 | ✅ 스코프 맞음 | 실제 쿼리와 일치하는 주석이다(`hydrateEmployedDriver.js:152-163`). |
| 102 | `react-app/src/lib/hydrateEmployedDriver.js:109` | 기사 거래처 scope 설명 | ③ | 배정 차량번호 | ✅ 스코프 맞음 | 차량을 먼저 구한 뒤 거래처를 조회한다(`hydrateEmployedDriver.js:109-115,152-163`). |
| 103 | `react-app/src/lib/hydrateEmployedDriver.js:160` | 서버 거래처 scope 필터 | ③ | `assignedVehicleNumber` | ✅ 스코프 맞음 | 정확한 차량번호만 내려받는다(`hydrateEmployedDriver.js:152-163`). |
| 104 | `react-app/src/components/day-log/CallClientQuickAdd.jsx:18` | 빈 draft 기본값 | ①②③④ | scope 선택 없음 | ➖ 스코프 무관 | 상수 초기값이다(`CallClientQuickAdd.jsx:12-19`). |
| 105 | `react-app/src/components/day-log/CallClientQuickAdd.jsx:35` | 빠른 추가 scope | ①②③④ | `logId`에서 만든 `scopeKey` | ✅ 스코프 맞음 | 서브/기사 일지는 차량번호 draft를 만든다(`CallClientQuickAdd.jsx:29-35`; `CallDetailForm.jsx:45,161-166`). |
| 106 | `react-app/src/components/day-log/CallClientQuickAdd.jsx:41` | 빠른 추가 저장 scope·고정 해제 | ①②③④ | `scopeKey` | ✅ 스코프 맞음 | 저장 레코드에 차량번호를 강제한다. 고정노선 false는 아래 노출조건 표에서 별도 기록한다(`CallClientQuickAdd.jsx:39-49`). |
| 107 | `react-app/src/components/clients/OwnerScopedClientsView.jsx:23` | 빈 draft 기본값 | ③ | scope 선택 없음 | ➖ 스코프 무관 | 상수 초기값이다(`OwnerScopedClientsView.jsx:17-24`). |
| 108 | `react-app/src/components/clients/OwnerScopedClientsView.jsx:41` | 기사 본인 scoped 목록 | ③ | `cars[0].number` | ✅ 스코프 맞음 | 배정 차량번호를 scope로 쓴다(`OwnerScopedClientsView.jsx:36-41`). |
| 109 | `react-app/src/components/clients/OwnerScopedClientsView.jsx:50` | 기사 본인 새 거래처 scope | ③ | `cars[0].number` | ✅ 스코프 맞음 | 새 draft에 배정 차량번호를 넣는다(`OwnerScopedClientsView.jsx:40,48-51`). |
| 110 | `react-app/src/components/clients/OwnerScopedClientsView.jsx:64` | 기사 본인 편집 scope | ③ | 기존 scope 또는 배정 차량번호 | ✅ 스코프 맞음 | 108번 목록에서 고른 레코드다(`OwnerScopedClientsView.jsx:54-68`). |
| 111 | `react-app/src/components/clients/OwnerScopedClientsView.jsx:66` | 기사 본인 고정 여부 | ③ | 108번 scoped client | ✅ 스코프 맞음 | 같은 레코드의 값이다(`OwnerScopedClientsView.jsx:54-68`). |
| 112 | `react-app/src/components/clients/OwnerScopedClientsView.jsx:67` | 기사 본인 단가·파렛트 | ③ | 108번 scoped client | ✅ 스코프 맞음 | 같은 레코드의 값이다(`OwnerScopedClientsView.jsx:54-68`). |
| 113 | `react-app/src/components/clients/OwnerScopedClientsView.jsx:73` | 기사 본인 저장 scope | ③ | `cars[0].number` | ✅ 스코프 맞음 | 저장 직전에 배정 차량번호를 다시 넣는다(`OwnerScopedClientsView.jsx:72-80`). |
| 114 | `react-app/src/domain/financeTaxInvoiceGroups.js:9` | selector import | ①②④ | 실행 코드 없음 | ➖ 스코프 무관 | import 자체다(`financeTaxInvoiceGroups.js:9`). |
| 115 | `react-app/src/domain/financeTaxInvoiceGroups.js:54` | source scope 설명 주석 | ①②④ | 실행 코드 없음 | ➖ 스코프 무관 | 다음 행의 설명이다(`financeTaxInvoiceGroups.js:54`). |
| 116 | `react-app/src/domain/financeTaxInvoiceGroups.js:55` | 차량별 계산서 고정 거래처 | ①②④ | `source.logId` | ✅ 스코프 맞음 | source가 메인/차량번호로 만들어진다(`financeTaxInvoiceGroups.js:42-55`). |
| 117 | `react-app/src/domain/financeTaxInvoiceGroups.js:57` | 차량별 계산서 고정 단가 | ①②④ | 116번이 고른 거래처 | ✅ 스코프 맞음 | 같은 source 거래처의 단가다(`financeTaxInvoiceGroups.js:55-57`). |
| 118 | `react-app/src/domain/financeTaxInvoiceGroups.js:74` | 계산서 고정 운송료 | ①②④ | 117번 source별 단가 | ✅ 스코프 맞음 | 같은 반복문의 단가를 쓴다(`financeTaxInvoiceGroups.js:55-74`). |
| 119 | `react-app/src/domain/financeTaxInvoiceGroups.js:128` | 기사 정산 고정 거래처 | ①②④ | `link.vehicleNumber` | ✅ 스코프 맞음 | 배정 차량번호를 직접 넘긴다(`financeTaxInvoiceGroups.js:127-133`). |
| 120 | `react-app/src/domain/financeTaxInvoiceGroups.js:130` | 기사 정산 고정 단가 | ①②④ | `link.vehicleNumber` | ✅ 스코프 맞음 | 보정 정답과 일치한다(`financeTaxInvoiceGroups.js:127-133`). |
| 121 | `react-app/src/domain/financeTaxInvoiceGroups.js:131` | 기사 정산 파렛트 단가 | ①②④ | 119번이 고른 거래처 | ✅ 스코프 맞음 | 같은 scoped 거래처다(`financeTaxInvoiceGroups.js:128-133`). |
| 122 | `react-app/src/domain/financeTaxInvoiceGroups.js:133` | 기사 정산 파렛트 여부 | ①②④ | 119번이 고른 거래처 | ✅ 스코프 맞음 | 같은 scoped 거래처다(`financeTaxInvoiceGroups.js:128-133`). |
| 123 | `react-app/src/lib/hydrateMergeClients.js:45` | hydrate scope 복원 | ①②③④ | 서버 row의 `raw` | ✅ 스코프 맞음 | scope를 문자열로 복원한다(`hydrateMergeClients.js:34-52`). |
| 124 | `react-app/src/lib/hydrateMergeClients.js:49` | hydrate 고정 여부 복원 | ①②③④ | 같은 서버 row | ✅ 스코프 맞음 | scope와 같은 client 객체에 복원한다(`hydrateMergeClients.js:34-52`). |
| 125 | `react-app/src/lib/hydrateMergeClients.js:50` | hydrate 파렛트 여부 복원 | ①②③④ | 같은 서버 row | ✅ 스코프 맞음 | 같은 client 객체에 복원한다(`hydrateMergeClients.js:34-52`). |
| 126 | `react-app/src/lib/hydrateMergeClients.js:51` | hydrate 파렛트 단가 복원 | ①②③④ | 같은 서버 row | ✅ 스코프 맞음 | 같은 client 객체에 복원한다(`hydrateMergeClients.js:34-52`). |
| 127 | `react-app/src/lib/hydrateMergeClients.js:52` | hydrate 고정 단가 복원 | ①②③④ | 같은 서버 row | ✅ 스코프 맞음 | 같은 client 객체에 복원한다(`hydrateMergeClients.js:34-52`). |
| 128 | `react-app/src/domain/monthSettlement.js:111` | 전달받은 파렛트 여부 | ①②③④ | `options.fixedRouteClient` | ➖ 스코프 무관 | 이 함수는 거래처를 고르지 않고 호출자가 준 객체만 쓴다(`monthSettlement.js:49-58,111-112`). |
| 129 | `react-app/src/domain/monthSettlement.js:112` | 전달받은 파렛트 단가 | ①②③④ | `options.fixedRouteClient` | ➖ 스코프 무관 | scope 판정은 상위 호출부에 있다(`monthSettlement.js:111-112`). |
| 130 | `react-app/src/components/day-log/DayLogPage.jsx:11` | selector import | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | import 자체다(`DayLogPage.jsx:11`). |
| 131 | `react-app/src/components/day-log/DayLogPage.jsx:78` | fallback 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 다음 호출의 설명이다(`DayLogPage.jsx:78-80`). |
| 132 | `react-app/src/components/day-log/DayLogPage.jsx:80` | 일지 고정노선 거래처 | ①②③④ | `clientScopeKey` 우선, 없으면 `logId` | ✅ 스코프 맞음 | ③은 배정 차량번호, ②/④ 서브는 logId다(`MainPageRoute.jsx:60-63,99-100`). |
| 133 | `react-app/src/components/day-log/DayLogPage.jsx:81` | 일지 파렛트 노출 | ①②③④ | 132번이 고른 거래처 | ✅ 스코프 맞음 | 같은 scoped 거래처의 `palletOn`을 쓴다(`DayLogPage.jsx:80-81`). |
| 134 | `react-app/src/components/day-log/PalletSection.jsx:3` | 파렛트 노출 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 주석만 해당한다(`PalletSection.jsx:3-4`). |
| 135 | `react-app/src/components/day-log/PalletSection.jsx:4` | 옛 상태 설명 주석 | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | 현재 선택 로직이 아니다(`PalletSection.jsx:3-4`). |
| 136 | `react-app/src/lib/ownerFinance.js:6` | resolver import | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | import 자체다(`ownerFinance.js:6`). |
| 137 | `react-app/src/lib/ownerFinance.js:117` | finance settings의 단가 필드 | ①②③④ | scope 인자 없음 | ➖ 스코프 무관 | 프로덕션 소비처가 없어 결과에 영향이 없다(`ownerFinance.js:107-137`; `monthSettlement.js:58`). |
| 138 | `react-app/src/lib/reportSummary.js:3` | selector import | ①②③④ | 실행 코드 없음 | ➖ 스코프 무관 | import 자체다(`reportSummary.js:3`). |
| 139 | `react-app/src/lib/reportSummary.js:36` | 내역서 파렛트 단가 | ①②③④ | 141번이 고른 거래처 | 🔧 스코프 필요 | ①과 ④ 메인은 ✅. ②·③·④ 서브는 무스코프로 고른 객체를 받는다(`reportSummary.js:64-79`). |
| 140 | `react-app/src/lib/reportSummary.js:66` | 내역서 고정 단가 | ①②③④ | scope 인자 없음 | 🔧 스코프 필요 | ①과 ④ 메인은 ✅. `ReportPage`는 `logKey` 일지를 고르지만 이 함수에 키를 넘기지 않는다(`ReportPage.jsx:34-57`). |
| 141 | `react-app/src/lib/reportSummary.js:67` | 내역서 고정 거래처 | ①②③④ | scope 인자 없음 | 🔧 스코프 필요 | ①과 ④ 메인은 ✅. ②·③·④ 서브에서는 기본 거래처만 찾는다(`clients.js:23-30`; `reportSummary.js:64-68`). |
| 142 | `react-app/src/lib/reportSummary.js:68` | 내역서 파렛트 노출 | ①②③④ | 141번이 고른 거래처 | 🔧 스코프 필요 | ①과 ④ 메인은 ✅. ②·③·④ 서브는 scoped `palletOn` 대신 기본 거래처 값을 본다(`reportSummary.js:67-79`). |

### 테스트 검색 결과(본표 제외)

- 테스트·test support·fixture에서 같은 검색식에 걸린 것은 125줄이다. 프로덕션 판정 개수에는 넣지 않았다.
- 대표 범위: `react-app/src/domain/clients.test.js:27-205`, `react-app/src/components/calendar/CalendarPage.test.js:30-453`, `react-app/src/domain/finance.test.js:204-418`, `react-app/src/lib/employedDriverClients.test.js:24-217`, `react-app/src/testSupport/fakeSupabaseClient.js:150-153`, `react-app/src/domain/finance.fixtures.js:34-37`.
- 이번 작업에서는 테스트를 추가·수정·실행하지 않았다(`docs/report.md:49-54,77-80`).

## 4. 검색식 밖의 쓰기·노출·실행 흐름 보조 추적

아래 행은 142줄 grep 개수에는 넣지 않았지만, 지시서 §3-B·C와 Q1~Q6을 끝까지 추적하는 데 필요하다.

| 경로 | 맥락 | 판정 | 근거와 관찰 |
|---|---|---|---|
| 직원 기사 일지 scope 전달 | ③ | ✅ 스코프 맞음 | 일지는 `clientScopeKey=cars[0].number`를 받는다(`react-app/src/app/MainPageRoute.jsx:60-63,99-100`; `react-app/src/components/day-log/DayLogPage.jsx:80`). |
| 직원 기사 달력 scope 전달 | ③ | 🔧 스코프 필요 | 달력에는 `clientScopeKey`가 없고 `logId='main'`만 전달된다(`react-app/src/app/MainPageRoute.jsx:51-63,111-120`). AI 관찰·미확인이다. |
| 달력 금액 배지 간접 전달 | ①②③④ | 🔧 스코프 필요 | `CalendarPage`가 고른 `unitPrice`가 `CalendarGrid`를 거쳐 배지 계산으로 그대로 간다(`react-app/src/components/calendar/CalendarPage.jsx:61,101-110`; `react-app/src/components/calendar/CalendarGrid.jsx:27,38-46`; `react-app/src/domain/calendarBadges.js:51-68`). 따라서 ①·②·④는 ✅, ③은 달력 상위 선택 때문에 🔧다. AI 관찰·미확인이다. |
| 단가 전용 수정 함수 | ①②③④ | ➖ 스코프 무관 | `requestClientFixedUnitPrice`는 명시적 `clientId`를 `updateClientFixedUnitPrice`에 넘기지만 프로덕션 호출자가 없다(`react-app/src/lib/clientMutations.js:103-116`; `react-app/src/domain/clients.js:156-158`). |
| 일반 거래처 저장 | ①②③④ | ✅ 스코프 맞음 | `requestClientSave`는 draft를 `upsertClient`에 그대로 넘기고 저장된 id 한 건만 클라우드에 올린다(`react-app/src/lib/clientMutations.js:53-72`). scope 보존은 `clients.js:123`이다. |
| 콜상세 빠른 추가의 고정노선 숨김 | ①②③④ | ➖ 스코프 무관 | scoped 빠른 추가는 고정노선을 false로 저장하고 입력을 숨긴다(`react-app/src/components/day-log/CallClientQuickAdd.jsx:39-49,61-68`). 이 경로는 고정노선 값을 읽거나 다른 scope를 고르지 않는다. 별도 scoped 거래처 화면은 고정노선 입력을 제공한다(`LinkedDriverClientsPage.jsx:69-101`; `OwnerScopedClientsView.jsx:48-80`). |
| 직원 기사 거래처 hydrate | ③ | ✅ 스코프 맞음 | 일지는 배정 차량 자료를 `main`으로 옮기고(`react-app/src/lib/hydrateEmployedDriver.js:60-70,166-177`), 거래처는 배정 차량번호만 조회한다(`hydrateEmployedDriver.js:152-163`). |
| 차주가 특정 기사만 고른 매출 | ② | ✅ 스코프 맞음 | 선택 차량번호로 cars와 workData를 좁힌 뒤(`react-app/src/components/revenue/OwnerRevenueView.jsx:72-87`; `react-app/src/components/revenue/driverRevenueScope.js:36-53`), `financeOwnerDetail`이 source 차량번호를 selector에 넘긴다(`react-app/src/domain/financeOwnerDetail.js:42-65`). |
| 기사 본인 매출 간접 전달 | ③ | 🔧 스코프 필요 | 기본 운송료는 owner scope의 `main`으로 계산하고, 정산액만 `link.vehicleNumber` 경로를 쓴다(`react-app/src/domain/driverSelfRevenue.js:52-69,84-99`; `react-app/src/domain/financeOwnerDetail.js:41,58-76`; `react-app/src/domain/financeCore.js:104-110`). AI 관찰·미확인이다. |
| 미수금 계산 | ①②③④ | ➖ 스코프 무관 | 고정노선 거래처·단가를 읽지 않고 콜상세에 저장된 `detail.fare`만 읽는다(`react-app/src/domain/financeReceivables.js:40-53,59-92`). `buildFinanceSettings`를 받아도 `unitPrice`는 소비하지 않는다(`react-app/src/components/receivables/useReceivablesData.js:21-31`; `react-app/src/lib/notifications.js:36-45`). |
| 서버 hydrate 필드 보존 | ①②③④ | ✅ 스코프 맞음 | scope·고정노선·파렛트·두 단가를 같은 객체에 복원한다(`react-app/src/lib/hydrateMergeClients.js:34-52`). |
| 로컬 persist 필드 보존 | ①②③④ | ✅ 스코프 맞음 | 허용 키와 타입 검사에 scope·고정노선·파렛트·두 단가가 모두 포함된다(`react-app/src/store/persistDomainRecords.js:44-49,93-110`). |
| 서브차량 내역서 라우트 | ②④ | 🔧 스코프 필요 | 라우트는 존재하고(`react-app/src/app/AppShellRoutes.jsx:73`), `ReportPage`는 서브 일지를 고르지만(`ReportPage.jsx:34-57`) 단가 함수에는 차량번호를 전달하지 않는다(`reportSummary.js:64-79`). AI 관찰·미확인이다. |
| 게스트 미연동 서브차량 | ④ | ✅ 스코프 맞음 | 게스트도 메인 다음 차량을 sub로 추가할 수 있고(`react-app/src/components/cars/CarListPage.jsx:53-75`), 초대 없이 서브 일지 메뉴가 만들어진다(`react-app/src/app/AppShell.jsx:77-80`; `react-app/src/app/subLogMenuItems.js:14-35`). |

## 5. 보리 확인 요청 — 🔧·❓만

❓ 판단 보류는 없다. 아래는 모두 코드만 읽어 얻은 **AI 관찰·미확인**이다.

| 확인할 화면 | 관찰 | 서로 다른 값으로 확인할 표본 | 근거 |
|---|---|---|---|
| 직원 기사 본인 달력·월 정산 카드 | 거래처는 배정 차량 scope만 내려오는데 달력은 `main`으로 찾으므로 고정노선 단가 0원·파렛트 숨김이 예상된다. | 차주 기본 25만원, 기사 차량 10만원, 고정운행 1회로 기사 계정 달력 확인 | `react-app/src/lib/hydrateEmployedDriver.js:152-163`; `react-app/src/app/MainPageRoute.jsx:60-63,111-115`; `react-app/src/components/calendar/CalendarPage.jsx:61-65` |
| 기사 본인 매출의 운송료 줄 | 운송료 기본 합계는 `main`으로 고정노선을 찾아 0원이 예상되지만, 정산액은 차량번호 10만원을 쓰는 혼합 결과가 예상된다. | 위 자료로 기사 매출의 운송료와 정산액을 함께 확인 | `react-app/src/domain/driverSelfRevenue.js:52-69,84-99`; `react-app/src/domain/financeOwnerDetail.js:41,58-76`; `react-app/src/domain/financeCore.js:104-110` |
| 차주/게스트 서브차량 운송비 내역서 | 서브 일지는 맞게 고르지만 단가는 무스코프라 차주 기본 25만원이 적용될 것으로 예상된다. | 차주 기본 25만원, 서브 10만원, 서브 고정운행 1회로 `/app/logs/{차량번호}/report` 확인 | `react-app/src/components/ReportPage.jsx:34-57`; `react-app/src/lib/reportSummary.js:64-79`; `react-app/src/app/AppShellRoutes.jsx:73` |
| 직원 기사 본인 운송비 내역서 | scoped 거래처만 있는데 무스코프로 찾으므로 0원이 예상된다. | 기사 차량 10만원, 고정운행 1회로 `/app/report` 확인 | `react-app/src/lib/hydrateEmployedDriver.js:152-163`; `react-app/src/components/ReportPage.jsx:34-57`; `react-app/src/lib/reportSummary.js:64-79` |

## 6. 보리 확인 뒤 SoT에 남길 규칙 초안

아래는 **초안**이며 `docs/sot.md`에는 반영하지 않았다.

1. 고정노선 거래처·단가·파렛트를 읽는 화면은 화면의 일지 키가 아니라 **실제 거래처 소유 차량번호**를 `getFixedRouteClient`/`resolveFixedUnitPrice`에 넘긴다. 차주 메인은 scope 없음, 차주·게스트 서브는 route `logId`, 직원 기사 본인은 배정 차량번호다. 근거 구현은 `react-app/src/domain/clients.js:23-42`, 현재 전달 기준은 `react-app/src/app/MainPageRoute.jsx:60-63`이다.
2. 일지를 `main`으로 재매핑한 직원 기사 세션에서는 `main`을 거래처 scope로 재사용하지 않는다. 일지 키와 거래처 scope 키는 별개다(`react-app/src/lib/hydrateEmployedDriver.js:60-70,152-177`).
3. 차량 하나의 내역서·매출·정산 계산은 그 차량의 `logId`/`vehicleNumber`로 고정노선 거래처를 먼저 고르고, 없을 때만 scope 없는 차주 기본값으로 물러난다(`react-app/src/domain/clients.js:23-30`).
4. 하위 계산 함수가 `unitPrice`나 `fixedRouteClient`를 옵션으로 받으면, 선택 책임은 그 값을 만드는 상위 호출부에 있다(`react-app/src/domain/monthSettlement.js:49-58,111-112`; `react-app/src/lib/reportSummary.js:33-36`).
5. 단가 수정은 scope 문자열로 재검색하지 않고, 화면이 이미 고른 거래처의 `clientId` 한 건을 수정한다(`react-app/src/domain/clients.js:156-158`). 현재 전용 함수는 미사용이므로 활성화할 때 호출 화면 증거를 다시 확인한다(`react-app/src/lib/clientMutations.js:103-116`).
6. 게스트의 기사 초대는 범위 밖이지만 미연동 서브차량은 제품 경로에 있으므로, 그 차량의 거래처·일지·내역서에는 차량번호 scope가 필요하다(`docs/sot.md:463-466`; `react-app/src/app/subLogMenuItems.js:14-35`).

## 7. 조사 못 한 것

- 실제 계정·DB·화면 표본 실행은 지시서대로 하지 않았다. 따라서 §5의 네 🔧 관찰은 보리가 실제 화면에서 확인해야 한다.
- 네트워크 데이터, 과거에 저장된 비정상 혼합 데이터, 운영 DB의 레코드 구성은 조사하지 않았다. 직원 hydrate의 현재 코드가 만드는 정상 스냅샷만 기준으로 했다(`react-app/src/lib/hydrateEmployedDriver.js:152-192`).
- `requestClientFixedUnitPrice`는 프로덕션 호출자가 없어서 실제 사용자 진입 경로를 재현할 수 없다. 함수의 정적 동작만 확인했다(`react-app/src/lib/clientMutations.js:103-116`).
- 테스트 125줄은 존재 여부와 대표 범위만 별도 표시했으며 판정 표에는 넣지 않았다. 테스트 추가·수정·실행은 하지 않았다.
