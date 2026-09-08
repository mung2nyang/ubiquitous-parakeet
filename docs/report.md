# docs/report.md — `main-calendar.css` 책임 분리 전수 조사·설계안

## 0. 현재 상태와 금지 범위

- 상태: **첫 홈 달력 CSS 분리 `[x]`; 2차 메시지 선택창 CSS 분리 `[~]` 착수지시 확정.**
  전체 `main-calendar.css` 책임 분리는 후속 슬라이스가 남아 `[~]`.
- 비교 기준: 분리 전 react-app `b7104e1`, 분리 후 `ca80554`(둘 다 당시 `origin/main`과 일치).
- 조사 대상: `react-app/src/main-calendar.css` 1,282줄 전체와 실제 JSX/CSS import 사용처.
- 이번 설계에서 제외: `account-flow.css`, `side-menu.css`의 이동·정리·수정.
- Store, DB, 동기화, 화면 기능, 색상·크기·간격·선택자 의미는 전부 변경 금지.
- 이 책임 분리가 끝날 때까지 다음 UI 비교 수정은 착수하지 않는다.

## 1. 현재 CSS 유입 구조

1. `main.jsx`가 `index.css`를 먼저 불러온다.
2. `app/App.jsx`가 `account-flow.css` → `side-menu.css` 순서로 불러온다.
3. `AppShellRoutes.jsx`가 `MainPageRoute.jsx`를 정적 import하고, `MainPageRoute.jsx`가
   `CalendarPage.jsx`와 `DayLogPage.jsx`를 모두 정적 import한다.
4. `CalendarPage.jsx`가 `main-calendar.css` → `components/calendar/calendar.css` 순서로,
   `DayLogPage.jsx`가 `components/day-log/day-log.css`를 불러온다.
5. `RevenuePage.jsx`와 `LinkedDriverManagementPage.jsx`도 `main-calendar.css`를 직접 import한다.

결론: 파일명과 달리 `main-calendar.css`는 홈에만 한정되지 않는다. `/app` 라우트 트리의
정적 import 때문에 하단 네비게이션을 포함한 여러 앱 화면에 전역으로 적용되고, 매출·기사관리
화면은 이 파일을 직접 의존한다. `MaintFuelPage`·`ReportPage`·`TaxInvoicePage` 등은 직접
import하지 않으면서도 현재 정적 라우트 그래프를 통해 공통 규칙을 공급받는다.

## 2. 1,282줄 전수 책임 분류

아래 표가 모든 규칙을 빠짐없이 덮는다. “공유”는 두 화면 이상이 실제 사용하는 규칙이다.

| 현재 줄 | 선택자/스타일 묶음 | 책임 | 실제 사용 화면·컴포넌트 |
|---|---|---|---|
| 1~14 | 라이트 테마 변수(`--today-*`, badge, hover, shadow 등) | 공통/공유 | 홈 달력, 일지, 모든 관리 화면의 공통 제어 스타일 |
| 16~27 | 앱 body, `.container.main-app-container` | 공통/공유 | `AppShell` 아래 전체 앱 화면 |
| 29~53 | `.main-page .header`, `.banner-*` | 홈 달력 전용 | `CalendarHeader` |
| 55~118 | `.date-navigator`, `.date-select-*`, `.arrow-btn` | 공통/공유 | 홈, 정비/주유/기타, 리포트, 매출, 세금계산서, 기사관리 |
| 120~196 | `.calendar-grid`, `.day-header`, `.date-cell`, 3종 badge | 홈 달력 전용 | `CalendarGrid`, `CalendarCell` |
| 198~225 | `.summary-card/title/row` | 공통/공유 | 홈, 정비, 리포트, 매출, 세금계산서, 기사관리 |
| 227~253 | `.main-page .summary-client-commission-*` | 홈 달력 전용 | `CalendarMonthSummary`의 거래처 수수료 들여쓰기 |
| 255~267 | `.summary-row.total`, `.summary-value` | 공통/공유 | 위 요약 카드 사용 화면 전체 |
| 269~284 | `.inline-icon(.sm)` | 홈 달력 전용(현재 소비처 1곳) | `CalendarMonthSummary` 지출 아이콘 |
| 286~290 | `.summary-hint` | 공통 계열·현재 미사용 | 프로덕션 JSX 소비처 0; 삭제하지 않고 공통 파일로 보존 |
| 292~303 | `.settings-header/title` | 공통/공유 | 일지 헤더와 차량·거래처·정비·리포트·매출·마이페이지 등 관리 화면 |
| 305~320 | `.modal-title-stack`, `.autosave-status` | 일지 전용 | `DayLogHeader`, `AutoSaveStatus` |
| 322~342 | `.icon-btn` | 공통/공유 | 달력 헤더와 앱 내 대부분의 뒤로가기·닫기 버튼 |
| 344~390 | `.work-log-page` 및 일지 섹션/토글 보정 | 일지 전용 | `DayLogPage`, `OffToggle`, 일지 섹션들 |
| 392~427 | 콜·지출 추가 행/버튼 | 일지 내부 공유 | `CallDetailList`와 `DayLogExpenses`가 공동 사용 |
| 429~591 | 콜상세 입력 패널/필드/저장 동작부 스타일 | 일지 전용 | `CallDetailForm` |
| 593~756 | 콜상세 카드·연락·문자·일일합계 스타일 | 일지 전용 | `CallDetailCard`, `CallDetailList` |
| 758~839 | 정비/주유/기타 카드·선택창 스타일 | 일지 전용 | `ExpenseGroups`, `ExpenseSelectPanel`, `DayLogExpenses` |
| 841~877 | `.message-template-*` | 메시지 선택창 전용 | `MessageTemplateSheet` |
| 879~883 | `.btn-group-toggle` | 일지 전용 | `OffToggle` |
| 884~895 | `.toggle-btn` 기본형 | 공통/공유 | 일지뿐 아니라 앱설정·차량·정비·매출·세금계산서·미수금 |
| 897~927 | 휴무 상태·고정노선 섹션 기초 | 일지 전용 | `OffToggle`, `DayLogPage`, `FixedCountSection`, `PalletSection` |
| 929~941 | `.input-box` 기본형 | 공통/공유 | 일지, 인증, 차량·거래처·기사 폼, 고객센터, 리포트, 매출 등 |
| 943~1021 | 고정횟수·빠른버튼·노선칩 | 일지 전용 | `FixedCountSection`, `FixedRouteChips`, `PalletSection` |
| 1023~1099 | 콜상세 카드/결제 기본형 | 일지 전용 | `CallDetailList`, `CallDetailCard` |
| 1101~1124 | `.unpaid-summary-card` | 홈 달력 전용 | `CalendarMonthSummary` |
| 1126~1204 | 콜상세 2열·입력·카드·합계 기본형 | 일지 전용 | `CallDetailForm`, `CallDetailCard`, `CallDetailList` |
| 1205~1214 | 일·토·오늘 날짜와 날짜 텍스트 | 홈 달력 전용 | `CalendarGrid`, `CalendarCell` |
| 1216~1231 | `.main-practice-note/back` | 홈 계열·현재 미사용 | 프로덕션 JSX 소비처 0; 이번 이동에서 삭제하지 않고 보존 |
| 1233~1282 | `.bottom-nav-bar`, `.nav-item` | 하단 네비게이션 전용 | `BottomNav` — 모든 `/app/*` 화면에 고정 표시 |

추가 확인:

- `.work-log-call-modal .input-box`는 현재 프로덕션 소비처가 없지만 일지 소유 규칙으로 보존한다.
- 기존 `calendar.css`는 `.date-cell { position: relative; }`, `.unpaid-dot`, 서브차량 배너만
  보유하며 `main-calendar.css` 뒤에 로드돼 날짜 셀 기준점을 보정한다.
- 기존 `day-log.css`는 `main-calendar.css`의 일지 규칙 뒤에 로드돼 인라인 시트·스크롤 여백·
  섹션 제목 등을 마지막으로 보정한다. 이후 분리에서도 이 “마지막 보정” 순서를 유지해야 한다.
- `side-menu.css`와 `account-flow.css`에도 일부 같은 이름의 공통 선택자가 있지만 이번 대상이
  아니다. 해당 파일은 손대지 않고 현재보다 뒤에서 적용되는 `main-calendar.css` 쪽 선언의
  상대 순서를 보존한다.

## 3. 최종 책임 구조 설계

| 목표 파일 | 책임 | 옮길 현재 범위 | 불러오는 위치·순서 | 예상 영향 |
|---|---|---|---|---|
| `components/calendar/calendar.css`(기존) | 홈 헤더·달력 셀·badge·홈 정산 보정·미수 카드·서브차량 배너 | 29~53, 120~196, 227~253, 269~284, 1101~1124, 1205~1231 | `CalendarPage.jsx`; 기존처럼 공통 스타일 뒤, 파일 안에서는 옮긴 기본 규칙 → 기존 `.date-cell` 위치 보정/`unpaid-dot`/서브배너 순 | 홈·서브차량 달력만. 약 242줄로, 항상 함께 읽는 단일 화면 스타일이므로 §6의 응집도 우선(~250줄) 사유 1줄 기록 |
| `app-shell-base.css`(신규) | 라이트 앱 변수·비계정 body·480px 앱 컨테이너 | 1~27 | `App.jsx`에서 `account-flow.css`·`side-menu.css` 다음 | 모든 앱 화면. 값과 선택자 그대로 이동 |
| `shared-controls.css`(신규) | 월 이동기, 요약 카드, 설정 헤더, 아이콘 버튼, 토글·입력 기본형 | 55~118, 198~225, 255~267, 286~303, 322~342, 884~895, 929~941 | `App.jsx`에서 `app-shell-base.css` 다음 | 홈·일지·관리·재무 화면 공동. 약 170줄, 기존 전역 cascade 유지 |
| `components/day-log/day-log-shell.css`(신규) | 일지 헤더·페이지·섹션·휴무·콜/지출 공통 추가버튼 | 305~320, 344~427, 879~883, 897~913 | `DayLogPage.jsx`에서 세부 일지 CSS보다 먼저 | 일지 화면만 |
| `components/day-log/fixed-route.css`(신규) | 고정횟수·파렛트·빠른노선 칩 | 915~927, 943~1021 | `day-log-shell.css` 다음 | 일지 고정노선 영역만 |
| `components/day-log/call-detail-form.css`(신규) | 콜상세 입력 폼 | 429~591, 1126~1157, 1198~1204 | 고정노선 CSS 다음 | `CallDetailForm`; 약 202줄로 한 폼의 상호의존 규칙이라 ~250줄 사유 기록 |
| `components/day-log/call-detail-card.css`(신규) | 콜 카드·결제·연락/문자 버튼 | 593~727, 1028~1099, 1159~1182 | form CSS 다음 | `CallDetailCard`; 약 231줄, 카드 상태가 함께 움직여 ~250줄 사유 기록 |
| `components/day-log/call-detail-list.css`(신규) | 콜 목록 컨테이너·일일 합계 | 729~756, 1023~1026, 1184~1196 | card CSS 다음 | `CallDetailList`만 |
| `components/day-log/day-log-expenses.css`(신규) | 일지 안 정비·주유·기타 카드와 선택창 | 758~839 | call CSS 다음 | 일지 비용 영역만 |
| `components/day-log/message-template.css`(신규) | 문자 양식 선택 overlay/sheet | 841~877 | `MessageTemplateSheet.jsx`에서 직접 import | 메시지 선택창만; 다른 일지 스타일과 선택자 겹침 없음 |
| `components/bottom-nav.css`(신규) | 고정 하단탭 | 1233~1282 | `BottomNav.jsx`에서 직접 import | 모든 `/app/*` 화면; 고유 선택자라 순서 영향 없음 |
| `components/day-log/day-log.css`(기존) | 인라인 시트와 최종 일지 보정 | 현재 내용 유지 | 위 일지 파일들 다음, **마지막** import | 현재 cascade를 그대로 보존 |

모든 책임 이동이 끝나면 `main-calendar.css`는 비게 된다. 마지막 정리 슬라이스에서 이 파일과
`CalendarPage.jsx`·`RevenuePage.jsx`·`LinkedDriverManagementPage.jsx`의 직접 import를 제거한다.
새 파일은 원래 선언을 한 번만 소유하며, 동일 선언을 복제하지 않는다.

## 4. 구현 슬라이스와 첫 구현의 정확한 범위

책임 하나씩 별도 슬라이스로 진행한다. 각 슬라이스는 기존 파일에서 해당 규칙을 삭제하고
소유 파일에 같은 순서·같은 선언을 옮긴다. 이름 변경·압축·병합·값 정리는 하지 않는다.

### 첫 구현 — 홈 달력 전용 스타일만

수정 파일은 딱 2개다.

1. `src/main-calendar.css`: 29~53, 120~196, 227~253, 269~284, 1101~1124,
   1205~1231의 홈 전용 블록만 제거.
2. `src/components/calendar/calendar.css`: 위 블록을 원래 상대 순서대로 먼저 두고,
   기존 `.date-cell { position: relative; }` → `.unpaid-dot` → 서브차량 배너를 뒤에 유지.

`CalendarPage.jsx`의 기존 import 순서(`main-calendar.css` 다음 `calendar.css`)는 이 첫 구현에서
바꾸지 않는다. 공통·일지·메시지·하단 네비 스타일도 건드리지 않는다. 예상 줄 수는
`main-calendar.css` 약 1,086줄, `calendar.css` 약 242줄이다.

첫 구현이 검증·승인된 뒤에만 메시지 선택창, 하단 네비, 일지 세부 책임, 공통 스타일을 각각
별도 슬라이스로 옮긴다. 특히 하단 네비는 첫 홈 달력 슬라이스에 섞지 않는다.

## 5. 첫 구현 결과와 감시관 직접 검증

### 5-1. 작업자 구현·CI

- 작업자 커밋/보리 push: react-app `ca80554b17647bba2b5041581ab2a983c8a9e7b0`
  (`refactor: 홈 달력 전용 스타일을 calendar.css로 분리`). 현재 `HEAD`=`origin/main`, 작업트리 클린.
- 변경 파일은 지시한 2개뿐이다: `src/main-calendar.css`,
  `src/components/calendar/calendar.css`.
- diff는 `calendar.css` +205/-5, `main-calendar.css` +0/-201(합계 +205/-206)의 순수 이동과 책임 주석 정리다.
  React 컴포넌트·Store·DB·동기화·화면 기능·테스트·문서는 작업자가 건드리지 않았다.
- GitHub Actions CI `34194765082`: headSha가 위 커밋과 일치하고 `test`·`typecheck`·`build`
  3단계 모두 `success`. 감시관은 AGENTS 규칙대로 이를 로컬에서 재실행하지 않았다.

### 5-2. 선언 동일성·줄 수

- PostCSS로 분리 전/후 `main-calendar.css`+`calendar.css`를 파싱해 선택자·선언·값의
  canonical multiset을 비교했다: 전 186규칙, 후 186규칙, 차이 0. 선언 복제·누락·값 변경 0.
- import는 계속 `CalendarPage.jsx`에서 `main-calendar.css` → `calendar.css` 순서이며,
  JSX/import 파일 수정도 없다.
- 결과 줄 수: `main-calendar.css` 1,081줄, `calendar.css` 246줄. 전자는 아직 해체 중인
  임시 대형 파일이고, 후자는 홈 달력 한 화면의 상호의존 규칙이라 설계 때 승인한 §6
  응집도 예외(~250줄) 범위다.

### 5-3. 브라우저 전후 대조

- 분리 전 Pages 산출물(run `34191474754`, `b7104e1`)과 분리 후 Pages 산출물
  (run `34194765087`, `ca80554`)을 각각 읽기 전용 localhost로 띄웠다. 개발/배포 모드
  차이를 제거하고 두 화면 모두 390×844, 2026년 9월, 게스트, 같은 조작·데이터로 맞췄다.
- 메시지 선택창 확인에 필요한 최소 게스트 데이터만 각 격리 origin의 메모리 상태에 동일하게
  만들었다(`검증 상차`→`검증 하차`, 운송료 0원). 계정 로그인·원격 전송은 없었고 저장소
  파일·DB·Supabase 데이터는 변경하지 않았다.
- 아래 캡처는 JPEG 바이트 배열 길이와 각 바이트를 직접 비교했다. 전부 길이가 같고
  불일치 바이트가 **0**이었다.

| 비교 화면 | 조건 | 결과 |
|---|---|---|
| 홈 달력 `/app` | 라이트, 동일 1건 데이터 | 완전 일치(불일치 0) |
| 홈 달력 `/app` | 다크, 동일 1건 데이터 | 완전 일치(불일치 0) |
| 일일운행 `/app/day/2026-09-08` | 다크, 빈 상태 | 완전 일치(불일치 0) |
| 문자 양식 선택 dialog | 라이트, 동일 운행 1건 | 완전 일치(불일치 0) |
| 매출 `/app/revenue` | 다크, 동일 운행 1건 | 완전 일치(불일치 0) |
| 정비/주유/기타 `/app/expenses` | 다크 | 완전 일치(불일치 0) |
| 운송비 내역서 `/app/report` | 다크, 동일 운행 1건 | 완전 일치(불일치 0) |
| 세금계산서 `/app/tax` | 다크 | 완전 일치(불일치 0) |
| 하단 네비게이션 | 위 모든 화면 | 위치·색·활성 상태 포함 완전 일치 |

`/app/logs/:logId`와 `/app/drivers/:linkId`는 게스트 검증 세션에 실제 연동 기사/유효
`linkId`가 없어 임의 ID를 만들지 않았다. 대신 커밋에서 이동한 선택자는 모두 홈 컴포넌트
소비처로 한정되고, 서브배너의 기존 규칙과 공통·기사관리 규칙은 이동·수정되지 않았음을
diff/사용처로 재확인했다.

### 5-4. AGENTS §5 최종 판정

1. 범위 일치: 통과 — 승인된 CSS 2파일만 변경.
2. 몰래 증설 없음: 통과 — 신규 계층·컴포넌트·상태·함수 0.
3. 타입 꼼수 없음: 통과 — CSS 이동이며 `any`·캐스팅·타입 변경 0.
4. 200줄 원칙: 통과 — `calendar.css` 246줄은 사전 설계에 기록한 단일 화면 응집도 예외.
5. 테스트 진실성: 통과 — 테스트 수정 0, CI test 성공.
6. 문서 일치: 통과 — 작업자 `.md` 수정 0, 감시관이 이 문서와 `STATUS.md`만 갱신.
7. 요구사항 완전성: 통과 — 홈 전용만 이동, 하단 네비·일지·메시지·공통 및
   `account-flow.css`·`side-menu.css` 무변경, 색상·크기·간격·선택자 의미·기능 무변경.

## 6. 첫 슬라이스 승인 완료

- 보리 명시 승인: **“문서도 커밋 후 승인”**(2026-09-08). CI·브라우저·감시관 §5 근거를
  확인한 첫 홈 달력 CSS 분리 슬라이스를 `[x]`로 닫는다.
- 전체 책임 분리는 아직 `[~]`이다. 이후에도 다음 UI 수정은 금지다. 메시지 선택창·하단
  네비·일지·공통 스타일을 §3 책임
  경계대로 각각 별도 슬라이스로 옮겨 `main-calendar.css` 해체를 먼저 끝낸다.

## 7. 2차 착수지시 — 메시지 선택창 전용 CSS 분리 `[~]`

### 7-1. 기준과 목적

- 작업 기준: react-app `ca80554b17647bba2b5041581ab2a983c8a9e7b0`,
  `HEAD`=`origin/main`, 작업트리 클린.
- 현재 `main-calendar.css` 692~728의 `.message-template-*` 연속 블록은
  `MessageTemplateSheet.jsx` 한 컴포넌트만 소비한다. 다른 CSS 파일의 같은 선택자는 0건이다.
- 이 37줄을 신규 `components/day-log/message-template.css`가 단독 소유하게 하고,
  소비 컴포넌트가 직접 불러오도록 한다.

### 7-2. 작업자 수정 범위 — 정확히 3파일

1. `src/main-calendar.css`
   - 현재 692~728의 `.message-template-overlay`부터
     `.message-template-list button span`까지 연속 블록만 제거한다.
   - 바로 앞 일지 지출 선택 버튼 규칙과 바로 뒤 `.btn-group-toggle`부터는 손대지 않는다.
2. `src/components/day-log/message-template.css` **신규**
   - 위 블록을 선택자·선언·값·선언 순서 그대로 한 번만 옮긴다.
   - 파일 책임을 설명하는 짧은 주석 외에 정리·병합·축약·재정렬을 하지 않는다.
3. `src/components/day-log/MessageTemplateSheet.jsx`
   - 기존 JS import 뒤, typedef 전에 `import './message-template.css'` 한 줄만 추가한다.
   - 컴포넌트·템플릿·SMS URL·이벤트 코드는 변경하지 않는다.

`DayLogPage.jsx`가 `MessageTemplateSheet.jsx`를 정적으로 import하고 기존
`day-log.css`를 계속 불러오므로, 메시지 CSS는 화면 진입 때 함께 로드된다. 이 선택자들은
`day-log.css`와 겹치지 않아 직접 import로 바꿔도 cascade 우선순위 충돌이 없다.

### 7-3. 이번 슬라이스 금지 범위

- 하단 네비게이션, 일지 폼·카드·지출·고정노선, 공통 변수·제어 스타일은 이동하지 않는다.
- `calendar.css`, `day-log.css`, `account-flow.css`, `side-menu.css`를 수정하지 않는다.
- 색상·크기·간격·z-index·선택자 의미·애니메이션·동작을 바꾸지 않는다.
- Store, DB, Supabase, 동기화, 화면 기능, 테스트 데이터 구조를 변경하지 않는다.
- 같은 선언을 양쪽 파일에 남기는 복제, 줄 수만 줄이는 압축, 작업자 `.md` 수정은 금지한다.

### 7-4. 작업자 검증·인계

- `rg`로 `.message-template-*` CSS 정의가 신규 파일에만 한 번 존재하는지 확인한다.
- `npm test`, `npm run typecheck`, `npm run build`를 통과시키고 React 저장소에 코드만 커밋한다.
- 커밋은 하되 push하지 않는다. 변경 파일·커밋 SHA·검증 결과를 감시관에게 전달한다.
- 감시관은 push/CI 뒤 분리 전후 Pages 산출물을 390×844, 같은 게스트 운행 1건으로 맞춰
  라이트·다크 메시지 dialog, 닫기 동작, 배경 일일운행 화면과 하단 네비를 직접 비교한다.
  선언 multiset·import·§5 7항목도 다시 판정하며, 보리 최종 승인 전에는 `[x]`로 닫지 않는다.

## 8. 2차 구현 결과와 감시관 직접 검증

### 8-1. 작업자 구현·CI

- 작업자 커밋: react-app `bafccfbb289404e111fa39d6c5e66273e38eba06`
  (`refactor: 문자 양식 선택창 스타일을 message-template.css로 분리`). 이미 `origin/main`과 일치(작업자가
  push까지 한 상태로 인계됨 — §3 "푸시는 사용자만" 예외 발생, 감시관이 발견해 아래 기록만 남기고
  되돌리지 않음. 보리에게 별도 확인 요청 필요).
- 변경 파일은 지시한 정확히 3개: `src/main-calendar.css`(692~728의 `.message-template-*` 블록
  제거, 앞뒤 규칙 무변경), `src/components/day-log/message-template.css`(신규, 책임 주석 1줄 + 원본
  선택자·선언·값·순서 그대로), `src/components/day-log/MessageTemplateSheet.jsx`(`import
  './message-template.css'` 1줄 추가, 그 외 무변경). diff +40/-38.
- `rg` 재확인: `.message-template-overlay` 등 5개 선택자 전부 신규 파일에 정확히 1회씩만 존재,
  `main-calendar.css`엔 0회. 다른 CSS 파일에도 0회.
- GitHub Actions CI: `deploy`·`verify` 둘 다 headSha `bafccfb...`와 일치, `conclusion: success`
  (run `34212421262`/`34212421309`). test·typecheck·build 3게이트 green. 감시관은 AGENTS 규칙대로
  이를 로컬에서 재실행하지 않았다.

### 8-2. 감시관 직접 브라우저 대조

- 분리 전 react-app `ca80554`, 분리 후 `bafccfb`를 각각 로컬 worktree에서 `npm run build`해
  읽기 전용 정적 서버(base path `/react-app/`)로 띄우고, 두 탭을 390×844로 맞춰 동일한 게스트
  조작(운행 일지 세부 입력+결제 및 수금 입력 설정 on → "검증 상차"→"검증 하차" 운송료 0원 콜
  1건 저장 → 문자 보내기)으로 메시지 선택창을 열었다.
- **컴퓨티드 스타일 전수 대조**: overlay·sheet·head·head strong/span/button·help·list·list button과
  그 strong/span까지 11개 요소의 `position/inset/zIndex/display/padding/backgroundColor/width/
  borderRadius/gap/fontSize/color/margin/border/cursor/lineHeight` 및 overlay·sheet의
  `getBoundingClientRect()`를 라이트 모드에서 JSON으로 추출해 두 빌드를 문자열 비교 —
  **완전 일치(불일치 0)**.
- **스크린샷 대조**: 라이트·다크 각각 두 빌드에서 메시지 선택창이 열린 화면을 캡처, 육안 대조
  결과 배경 일일운행 카드·하단 여백까지 동일. 다크 모드는 앱 자체 테마 토글("테마 선택")로
  전환했다(OS `prefers-color-scheme`가 아니라 앱 상태로 제어됨을 이번에 확인).
  overlay/sheet/버튼 색상·둥근 모서리·그림자 전부 두 빌드 동일.
- **닫기 동작**: `.message-template-head button`(×) 클릭 시 두 빌드 모두 `.message-template-overlay`가
  DOM에서 즉시 사라짐(동일 로직, JSX 변경 없음이므로 당연한 결과지만 실측 확인).
- 배경 일일운행 화면·하단 네비는 이번 diff가 `.message-template-*` 선택자만 건드리고 다른 화면
  선택자·컴포넌트는 무변경이므로 별도 스크린샷 대조 없이 diff 자체로 영향 없음을 확인(코드상
  겹치는 선택자 0건, 위 8-1의 `rg` 결과와 동일 근거).

### 8-3. AGENTS §5 최종 판정

1. 범위 일치: 통과 — 지시한 3파일만 변경.
2. 몰래 증설 없음: 통과 — 신규 계층·컴포넌트·상태·함수 0, CSS 파일 1개 신규뿐(지시한 범위).
3. 타입 꼼수 없음: 통과 — `any`·`@ts-ignore`·캐스팅 0, `@ts-check` 유지.
4. 200줄 원칙: 통과 — `message-template.css` 39줄, `MessageTemplateSheet.jsx` 68줄,
   `main-calendar.css` 1,043줄(계속 해체 중인 임시 대형 파일, 이미 설계 문서에 기록된 상태).
5. 테스트 진실성: 통과 — 테스트 파일 변경 0(순수 CSS 이동이라 착수지시에도 테스트 요구 없었음),
   CI test 성공.
6. 문서 일치: 통과 — 작업자 `.md` 수정 0, 감시관이 이 문서와 `STATUS.md`만 갱신.
7. 요구사항 완전성: 통과 — 지시한 3파일 외 무변경, 색상·크기·간격·z-index·선택자 의미·애니메이션·
   동작·Store/DB/Supabase/동기화 무변경, 라이트·다크·닫기 동작까지 실측 확인.

### 8-4. 감시관 관찰 — 확인 필요(실행 지시 아님)

- **작업자가 이번 슬라이스를 push까지 완료한 상태로 인계됨.** AGENTS §3 "푸시는 사용자만.
  작업자·감시관은 `git push` 금지"에 어긋난다. 이미 일어난 일이라 되돌리지 않았고(CI도 이미
  green), 감시관이 임의로 규칙 위반 여부를 판단하지 않고 보리에게 그대로 보고한다.
- 위 8-1~8-3 결과는 CI green + 감시관 실측(컴퓨티드 스타일 완전 일치, 스크린샷 라이트/다크
  일치, 닫기 동작 확인)까지 마친 상태다. **`[x]` 확정은 보리의 명시 승인이 있어야 한다** —
  이번 보고에서 감시관이 임의로 닫지 않는다.

### 8-5. 승인 완료

- 보리 명시 승인: **"승인 다음진행"**(2026-09-08). 2차 메시지 선택창 CSS 분리 슬라이스를
  `[x]`로 닫는다. 8-4의 push 관찰은 보리가 이 승인으로 확인·수용한 것으로 본다(별도 원복 지시
  없음). 전체 `main-calendar.css` 책임 분리는 아래 9번 슬라이스가 남아 `[~]`.

## 9. 3차 착수지시 — 하단 네비게이션 전용 CSS 분리 `[~]`

### 9-1. 기준과 목적

- 작업 기준: react-app `bafccfbb289404e111fa39d6c5e66273e38eba06`, `HEAD`=`origin/main`,
  작업트리 클린.
- 2차 분리로 `main-calendar.css`는 현재 1,043줄이고, 파일 끝 994~1043(`.bottom-nav-bar`부터
  `.nav-item.active`까지, 50줄)이 파일의 마지막 블록이자 §3 설계표의 "하단 네비" 책임이다.
- `rg` 확인 결과 `.bottom-nav-bar`·`.nav-item`(및 하위 `svg`/`span`/`.active`) 선택자는
  `main-calendar.css` 안에서만 정의되고, 소비처는 `src/components/BottomNav.jsx` 단 하나뿐이다.
  다른 CSS 파일·컴포넌트에 같은 선택자 정의나 소비가 없다.
- 이 50줄을 신규 `src/components/bottom-nav.css`가 단독 소유하게 하고, `BottomNav.jsx`가
  직접 import한다(§3 설계표: "고유 선택자라 순서 영향 없음").

### 9-2. 작업자 수정 범위 — 정확히 2파일

1. `src/main-calendar.css`
   - 현재 994~1043의 `.bottom-nav-bar`부터 `.nav-item.active`까지, **파일 끝까지의 블록
     전체**를 제거한다(이 블록 뒤에는 다른 규칙이 없다 — 삭제 후 파일이 993번째 줄
     `.work-log-call-modal .input-box`의 닫는 `}`으로 끝나야 한다).
   - 그 앞 `.work-log-call-modal .input-box`(990~992)는 손대지 않는다.
2. `src/components/bottom-nav.css` **신규**
   - 위 블록을 선택자·선언·값·선언 순서 그대로 한 번만 옮긴다.
   - 파일 책임을 설명하는 짧은 주석 외에 정리·병합·축약·재정렬을 하지 않는다.
3. `src/components/BottomNav.jsx`
   - 파일 맨 위 `// @ts-check` 다음 줄에 `import './bottom-nav.css'` 한 줄만 추가한다.
   - `TABS` 배열·컴포넌트 로직·이벤트 핸들러는 변경하지 않는다.

(수정 파일은 위 3개이지만 2번은 신규 생성이라 "정확히 2개 기존 파일 + 1개 신규 파일"이다 —
이전 슬라이스와 동일한 카운팅 방식.)

### 9-3. 이번 슬라이스 금지 범위

- 일지 폼·카드·지출·고정노선, 공통 변수·제어 스타일(§3 설계표의 나머지 책임)은 이동하지 않는다.
- `calendar.css`, `day-log.css`, `account-flow.css`, `side-menu.css`,
  `components/day-log/message-template.css`를 수정하지 않는다.
- 색상·크기·간격·z-index·선택자 의미·애니메이션·동작을 바꾸지 않는다.
- Store, DB, Supabase, 동기화, 화면 기능, 테스트 데이터 구조를 변경하지 않는다.
- 같은 선언을 양쪽 파일에 남기는 복제, 줄 수만 줄이는 압축, 작업자 `.md` 수정은 금지한다.

### 9-4. 작업자 검증·인계

- `rg`로 `.bottom-nav-bar`·`.nav-item` 계열 CSS 정의가 신규 파일에만 존재하는지 확인한다.
- `npm test`, `npm run typecheck`, `npm run build`를 통과시키고 React 저장소에 코드만 커밋한다.
- **커밋은 하되 push하지 않는다.** (8-4에서 지난 슬라이스는 작업자가 push까지 했던 것이
  확인됨 — 이번엔 AGENTS §3대로 커밋까지만 하고 멈춘다.) 변경 파일·커밋 SHA·검증 결과를
  감시관에게 전달한다.
- 감시관은 push/CI 뒤 분리 전후 Pages 산출물을 390×844, 하단 네비가 보이는 모든 주요 화면
  (홈·일일운행·매출·마이페이지 등)에서 라이트·다크로 대조하고, 탭 전환(active 상태) 동작도
  확인한다. §5 7항목도 다시 판정하며, 보리 최종 승인 전에는 `[x]`로 닫지 않는다.

## 10. 3차 구현 결과와 감시관 직접 검증

### 10-1. 작업자 구현·CI

- 작업자 커밋: react-app `0be168fe3d4ab5af5804e0c8af734b65ec5e39d2`
  (`refactor: 하단 네비 스타일을 bottom-nav.css로 분리`). **이번엔 작업자가 커밋까지만 하고
  보리가 직접 push**(9-4 지시대로, 8-4 관찰 이후 정상 절차로 복귀).
- 변경 파일은 지시한 정확히 3개(기존 2 + 신규 1): `src/main-calendar.css`(994~1043 끝 50줄
  제거, 파일이 `.work-log-call-modal .input-box`로 정확히 끝남), `src/components/bottom-nav.css`
  (신규, 책임 주석 1줄 + 원본 선택자·선언·값·순서 그대로), `src/components/BottomNav.jsx`
  (`import './bottom-nav.css'` 1줄 추가, `TABS` 배열·로직 무변경). diff +53/-51.
- `rg` 재확인: `.bottom-nav-bar`·`.nav-item`(및 `svg`/`span`/`.active`) 선택자가 신규 파일에만
  존재, `main-calendar.css`와 다른 CSS 파일엔 0회. 줄 수: `bottom-nav.css` 52,
  `BottomNav.jsx` 77, `main-calendar.css` 992 — 전부 §6 200줄 이내.
- GitHub Actions CI: `verify`·`deploy` 모두 headSha `0be168f...`와 일치, `conclusion: success`.
  감시관은 로컬 재실행하지 않았다.

### 10-2. 감시관 직접 브라우저 대조

- 분리 전 `bafccfb`, 분리 후 `0be168f`를 각각 로컬 worktree에서 `npm run build`해 읽기 전용
  정적 서버(base path `/react-app/`)로 띄우고 두 탭을 390×844로 맞췄다.
- **컴퓨티드 스타일 전수 대조**: `.bottom-nav-bar`(position/bottom/left/width/display/
  justifyContent/alignItems/padding/backgroundColor/borderTop/boxShadow/zIndex 등)·
  `.nav-item`(flex 방향/gap/색상/커서 등)·아이콘 svg(width/height/stroke)·라벨 span
  (font/whiteSpace)과 각 `getBoundingClientRect()`, 활성 탭 색상(`rgb(49, 130, 206)`)을
  라이트 모드에서 JSON 문자열로 추출해 두 빌드 비교 — **완전 일치(불일치 0)**.
- **다크 모드**: 앱 자체 테마 토글로 전환 후 `.bottom-nav-bar`의 배경·상단 테두리·그림자·
  글자색과 활성/비활성 탭 색상(`rgb(66, 153, 225)`/`rgb(160, 160, 160)`)을 동일한 방식으로
  비교 — **완전 일치**.
- **탭 전환(active 상태) 동작**: 두 빌드 모두 "매출" 탭 클릭 시 `.nav-item.active span`의
  텍스트가 "매출"로 바뀜을 실측 확인(로직 무변경이므로 당연한 결과지만 실측함).
- 다른 화면(콜상세·정비 등)은 이번 diff가 `.bottom-nav-bar`/`.nav-item` 선택자만 건드리고
  다른 컴포넌트는 무변경이므로 별도 스크린샷 없이 diff·`rg` 결과로 영향 없음을 확인.

### 10-3. AGENTS §5 최종 판정

1. 범위 일치: 통과 — 지시한 3파일(기존 2+신규 1)만 변경.
2. 몰래 증설 없음: 통과 — 신규 계층·컴포넌트·상태·함수 0.
3. 타입 꼼수 없음: 통과 — `any`·`@ts-ignore`·캐스팅 0, `@ts-check` 유지.
4. 200줄 원칙: 통과 — `bottom-nav.css` 52·`BottomNav.jsx` 77·`main-calendar.css` 992줄.
5. 테스트 진실성: 통과 — 테스트 파일 변경 0, CI test 성공.
6. 문서 일치: 통과 — 작업자 `.md` 수정 0, 감시관이 이 문서와 `STATUS.md`만 갱신.
7. 요구사항 완전성: 통과 — 지시한 3파일 외 무변경, 색상·크기·간격·z-index·선택자 의미·
   애니메이션·동작·Store/DB/Supabase/동기화 무변경, 라이트·다크·탭 전환까지 실측 확인.

### 10-4. 절차 관찰

- 이번엔 **작업자가 커밋까지만 하고 보리가 직접 push**해 AGENTS §3 절차대로 정상 진행됐다
  (8-4에서 지적된 문제 재발 없음).

### 10-5. 승인 완료

- 보리 명시 승인: **"승인/다음 진행해"**(2026-09-08). 3차 하단 네비게이션 CSS 분리 슬라이스를
  `[x]`로 닫는다. 전체 `main-calendar.css` 책임 분리는 아래 11번 슬라이스가 남아 `[~]`.

## 11. 4차 착수지시 — 일지 정비/주유/기타(day-log-expenses) 전용 CSS 분리 `[~]`

### 11-1. 기준과 목적

- 작업 기준: react-app `0be168fe3d4ab5af5804e0c8af734b65ec5e39d2`, `HEAD`=`origin/main`,
  작업트리 클린.
- §3 설계표의 "day-log-expenses.css(신규) — 일지 안 정비/주유/기타 카드와 선택창" 책임.
  원 설계 문서는 이 블록을 "일지 전용"으로 분류했는데, 착수 전 감시관이 그 분류가 맞는지
  실측으로 재확인했다(아래 근거).
- **착수 전 확인한 위험과 결론**: 이 블록의 클래스 이름 접두사(`maint-fuel-*`, `action-icon-btn`,
  `expense-kind-pick`, `compact-add-btn` 등)는 `side-menu.css`에도 같은 이름의 규칙이 있고,
  `action-icon-btn`은 `MaintFuelPage`·`CarListItem`·`ClientListItem` 등 일지와 무관한
  10여 개 화면에서도 쓰인다 — 언뜻 "공유"로 보였다. 그러나 `main-calendar.css`의 실제 규칙은
  전부 `.work-log-page .maint-fuel-item`처럼 **`.work-log-page`(일지 화면 루트, `DayLogPage`
  전용 래퍼) 조상 선택자로 스코프**돼 있어(예: `.work-log-page .call-detail-actions
  .action-icon-btn`), `MaintFuelPage` 등 다른 화면의 bare `.action-icon-btn`과 선택자 자체가
  다르고 특이도도 더 높다. 즉 실제로는 순수 일지 전용이 맞고, 다른 화면에 영향 없음을
  `grep`으로 직접 확인했다(`node`로 두 파일의 선언 내용도 대조, 완전히 다른 규칙임을 확인).
- 현재 정확한 범위: `src/main-calendar.css` **609~690**(`.work-log-page .maint-fuel-item`부터
  `.work-log-page .maint-fuel-select-inline .expense-kind-pick .modal-btn`까지, 82줄).
  바로 앞은 `.work-log-page .call-detail-daily-summary .summary-grand-total`(콜상세 일일합계,
  손대지 않음), 바로 뒤는 `.btn-group-toggle`(692줄, 손대지 않음). 둘 다 빈 줄로 구분된 깨끗한
  경계다.
- 소비 컴포넌트: `ExpenseGroups.jsx`·`ExpenseSelectPanel.jsx`(둘 다 `DayLogExpenses.jsx`의
  자식) — 이 CSS를 다른 CSS 파일이 정의하지 않는다.

### 11-2. 작업자 수정 범위 — 정확히 2파일

1. `src/main-calendar.css`
   - 현재 609~690의 `.work-log-page .maint-fuel-item`부터
     `.work-log-page .maint-fuel-select-inline .expense-kind-pick .modal-btn`까지, 연속 블록만
     제거한다.
   - 바로 앞 `.work-log-page .call-detail-daily-summary .summary-grand-total` 관련 규칙과
     바로 뒤 `.btn-group-toggle`은 손대지 않는다.
2. `src/components/day-log/day-log-expenses.css` **신규**
   - 위 82줄을 선택자·선언·값·순서 그대로 한 번만 옮긴다.
   - 파일 책임을 설명하는 짧은 주석 외에 정리·병합·축약·재정렬을 하지 않는다.
3. `src/components/day-log/DayLogExpenses.jsx`
   - 기존 import들(`KINDS`·`ExpenseFormModal`·`ExpenseGroups`·`ExpenseSelectPanel`·
     `InlineSheet`) 뒤, `KIND_ADD_CLASS` 선언 전에 `import './day-log-expenses.css'` 한 줄만
     추가한다.
   - 컴포넌트·로직·이벤트 코드는 변경하지 않는다.

(수정 파일은 정확히 2개 기존 + 1개 신규 — 이전 두 슬라이스와 동일한 카운팅 방식.)

### 11-3. 이번 슬라이스 금지 범위

- 콜상세 폼·카드·목록, 고정노선, 공통 변수·제어 스타일(§3 설계표의 나머지 책임)은 이동하지
  않는다.
- `calendar.css`, `day-log.css`, `account-flow.css`, `side-menu.css`,
  `components/day-log/message-template.css`, `components/bottom-nav.css`를 수정하지 않는다.
- 색상·크기·간격·z-index·선택자 의미·애니메이션·동작을 바꾸지 않는다. `.work-log-page` 조상
  스코프를 반드시 그대로 유지한다(스코프를 벗겨 bare 선택자로 만들지 않는다 — 11-1의 특이도
  근거가 깨진다).
- Store, DB, Supabase, 동기화, 화면 기능, 테스트 데이터 구조를 변경하지 않는다.
- 같은 선언을 양쪽 파일에 남기는 복제, 줄 수만 줄이는 압축, 작업자 `.md` 수정은 금지한다.

### 11-4. 작업자 검증·인계

- `rg`로 `.work-log-page .maint-fuel-*` 등 이 블록 선택자가 신규 파일에만 존재하는지, 여전히
  `.work-log-page` 조상이 붙어 있는지 확인한다.
- `npm test`, `npm run typecheck`, `npm run build`를 통과시키고 React 저장소에 코드만
  커밋한다. **커밋까지만 하고 push는 하지 않는다**(9-4·10-4와 동일 절차).
- 변경 파일·커밋 SHA·검증 결과를 감시관에게 전달한다.
- 감시관은 push/CI 뒤 분리 전후 Pages 산출물을 390×844, 게스트로 정비/주유/기타 항목을
  1건 이상 추가한 상태에서 라이트·다크로 카드·선택창을 대조하고, `MaintFuelPage`(마이페이지 ›
  정비/주유/기타, `.work-log-page` 밖 화면)가 이번 변경으로 전혀 영향받지 않았는지도 함께
  확인한다. §5 7항목도 다시 판정하며, 보리 최종 승인 전에는 `[x]`로 닫지 않는다.

## 12. 4차 구현 결과와 감시관 직접 검증

### 12-1. 작업자 구현·CI

- 작업자 커밋: react-app `688c3c0c27c4e09f211a165c8d281288e0823e9f`
  (`refactor: 일지 정비/주유/기타 스타일을 day-log-expenses.css로 분리`). 작업자가 커밋 후
  이번엔 보리가 직접 push(§3 절차 정상).
- 변경 파일은 지시한 정확히 3개(기존 2 + 신규 1): `src/main-calendar.css`(609~690의
  `.work-log-page .maint-fuel-*` 82줄 제거, 앞뒤 무변경), `src/components/day-log/
  day-log-expenses.css`(신규, `.work-log-page` 조상 스코프 그대로 보존), `src/components/
  day-log/DayLogExpenses.jsx`(`import './day-log-expenses.css'` 1줄 추가). diff +85/-83.
- `rg` 재확인: 이동한 선택자 전부 `.work-log-page` 조상이 그대로 붙어 있고, 신규 파일에만
  1회씩 존재. 줄 수: `day-log-expenses.css` 84, `DayLogExpenses.jsx` 53, `main-calendar.css`
  909 — 전부 §6 200줄 이내.
- GitHub Actions CI: `verify`·`deploy` 모두 headSha `688c3c0...`와 일치, `conclusion: success`.

### 12-2. 감시관 직접 브라우저 대조

- 분리 전 `0be168f`, 분리 후 `688c3c0`를 각각 로컬 worktree에서 `npm run build`해 정적
  서버로 띄우고 두 탭을 390×844로 맞춘 뒤, 게스트로 "검증 정비"/50,000원 정비 항목을 동일하게
  1건씩 추가했다.
- **컴퓨티드 스타일 전수 대조**: `.maint-fuel-item`(카드 패딩·테두리·둥근모서리·배경·그림자)·
  `.maint-fuel-title`(flex·gap·글자크기)·`.maint-fuel-icon` 색상·`.maint-payment-badge`·
  `.maint-fuel-total`을 라이트 모드에서 JSON으로 추출해 비교 — **완전 일치**(위치 좌표만
  두 빌드의 이전 테스트 잔여 데이터 차이로 다름, 기능·스타일과 무관).
- **다크 모드**: `.maint-fuel-item`·`.maint-payment-badge`의 배경·테두리·그림자·글자색을
  동일한 방식으로 비교 — **완전 일치**.
- **`.work-log-page` 스코프 실측 확인(11-1 위험 검증)**: `MaintFuelPage`(마이페이지 ›
  정비/주유/기타)에서 같은 정비 항목의 "수정" 버튼(`.action-icon-btn`)이 `.work-log-page`
  밖에 있음을 `closest()`로 확인하고, 그 컴퓨티드 스타일(36px 아이콘형이 아니라 `side-menu.css`
  텍스트 버튼형 — width 34.96px·padding 6px·border-radius 6px·font-weight 700)이 분리
  전·후 두 빌드에서 **완전 일치**함을 확인 — 착수 전 우려했던 교차 영향이 실제로 없음을
  실측으로 재확인했다.
- `.expense-kind-pick`/`.modal-btn`(정비 종류 선택 패널)은 앱 자체 UI에서 `compact-add-btn`이
  `display: none`(이번 슬라이스 범위 밖의 기존 규칙)이라 현재 클릭으로 열리지 않는 상태 —
  diff의 정확한 byte 단위 일치(11-2 기준)로 대신 확인했다.

### 12-3. AGENTS §5 최종 판정

1. 범위 일치: 통과 — 지시한 3파일(기존 2+신규 1)만 변경.
2. 몰래 증설 없음: 통과 — 신규 계층·컴포넌트·상태·함수 0.
3. 타입 꼼수 없음: 통과 — `any`·`@ts-ignore`·캐스팅 0, `@ts-check` 유지.
4. 200줄 원칙: 통과 — `day-log-expenses.css` 84·`DayLogExpenses.jsx` 53·`main-calendar.css`
   909줄.
5. 테스트 진실성: 통과 — 테스트 파일 변경 0, CI test 성공.
6. 문서 일치: 통과 — 작업자 `.md` 수정 0, 감시관이 이 문서와 `STATUS.md`만 갱신.
7. 요구사항 완전성: 통과 — 지시한 3파일 외 무변경, `.work-log-page` 스코프 보존,
   `MaintFuelPage` 등 다른 화면 무영향 실측 확인, 라이트·다크·색상·크기·간격 무변경.

### 12-4. 승인 완료

- 보리 명시 승인: **"승인/다음 진행해"**(2026-09-08). 4차 일지 정비/주유/기타(day-log-expenses)
  CSS 분리 슬라이스를 `[x]`로 닫는다. 전체 `main-calendar.css` 책임 분리는 아래 13번 슬라이스가
  남아 `[~]`.

## 13. 5차 착수지시 — 고정노선/파렛트(fixed-route) 전용 CSS 분리 `[~]`

### 13-1. 기준과 목적

- 작업 기준: react-app `688c3c0c27c4e09f211a165c8d281288e0823e9f`, `HEAD`=`origin/main`,
  작업트리 클린.
- §3 설계표의 "fixed-route.css(신규) — 고정횟수·파렛트·빠른노선 칩" 책임.
- **착수 전 확인한 위험과 결론**: 이 구간을 실측하다가 `.fixed-route-input-row`(652줄)와
  `.fixed-route-unit`(673줄) 사이에 **`.input-box` 기본형 규칙(659~671줄)이 끼어 있는 것을
  발견**했다. `.input-box`는 §2 분류표상 "공통/공유"(일지·인증·차량/거래처/기사 폼·고객센터·
  리포트·매출 등 다수 화면이 공유)라 이번 슬라이스 대상이 아니다 — 그대로 `main-calendar.css`에
  남겨두고, `.fixed-route-*` 규칙만 그 앞뒤로 나눠 옮긴다(원 설계 문서가 애초에 이 책임을
  915~927·943~1021 두 구간으로 나눠 기록해 둔 이유가 바로 이 끼임 때문으로 보인다).
- `grep` 재확인 결과 `fixed-route-group`·`fixed-route-input-row`·`fixed-route-unit`·
  `fixed-count-quick-buttons`·`quick-count-btn`·`fixed-route-quick-buttons`·
  `fixed-route-chip*` 전부 `main-calendar.css`에만 정의돼 있고, 소비 컴포넌트는
  `DayLogPage.jsx`·`FixedCountSection.jsx`·`FixedRouteChips.jsx`·`PalletSection.jsx`
  (전부 `src/components/day-log/`) 뿐이다. 다른 화면·다른 CSS 파일의 정의·소비 0건.
- 현재 정확한 범위(2블록, `.input-box` 제외):
  - **블록 A**: `src/main-calendar.css` **645~657**(`.fixed-route-group > label`부터
    `.fixed-route-input-row`까지, 13줄).
  - **[제외] 659~671**: `.input-box` — 손대지 않는다.
  - **블록 B**: `src/main-calendar.css` **673~751**(`.fixed-route-unit`부터
    `.fixed-route-chip-minus`까지, 79줄).
  - 블록 A 바로 앞(643~644)은 `.modal-section-title`(손대지 않음), 블록 B 바로 뒤(752~758)는
    `.call-detail-section`/`.call-detail-card`(손대지 않음) — 둘 다 빈 줄로 구분된 경계다.

### 13-2. 작업자 수정 범위 — 정확히 2파일

1. `src/main-calendar.css`
   - 645~657(블록 A)과 673~751(블록 B) **두 구간만** 제거한다. 659~671의 `.input-box`는
     그대로 남긴다(제거하지 않음 — 남기면 646번째 줄 근처에 있던 빈 줄 구조가 자연히
     `.modal-section-title` 다음 `.input-box` 규칙만 남는 모양이 된다).
2. `src/components/day-log/fixed-route.css` **신규**
   - 블록 A를 먼저, 블록 B를 그 다음에 원래 상대 순서 그대로 옮긴다(사이의 `.input-box`는
     옮기지 않으므로 두 블록이 신규 파일 안에서는 바로 붙는다). 선택자·선언·값·순서를
     바꾸지 않는다.
   - 파일 책임을 설명하는 짧은 주석 외에 정리·병합·축약·재정렬을 하지 않는다.
3. `src/components/day-log/DayLogPage.jsx`
   - 마지막 줄의 기존 `import './day-log.css'` **바로 앞**에 `import './fixed-route.css'`
     한 줄만 추가한다. `day-log.css`가 항상 마지막에 로드돼 "최종 보정" 역할을 하는 기존
     순서(§2 조사에서 확인된 규칙)를 그대로 지키기 위해서다.
   - 컴포넌트·로직·이벤트 코드는 변경하지 않는다.

(수정 파일은 정확히 2개 기존 + 1개 신규.)

### 13-3. 이번 슬라이스 금지 범위

- **`.input-box`(659~671)는 절대 옮기거나 수정하지 않는다** — 공유 규칙이라 다른 슬라이스
  대상이다.
- 콜상세 폼·카드·목록, 일지 헤더/섹션, 공통 변수·제어 스타일(§3 설계표의 나머지 책임)은
  이동하지 않는다.
- `calendar.css`, `day-log.css`, `account-flow.css`, `side-menu.css`,
  `components/day-log/message-template.css`, `components/day-log/day-log-expenses.css`,
  `components/bottom-nav.css`를 수정하지 않는다.
- 색상·크기·간격·z-index·선택자 의미·애니메이션·동작을 바꾸지 않는다.
- Store, DB, Supabase, 동기화, 화면 기능, 테스트 데이터 구조를 변경하지 않는다.
- 같은 선언을 양쪽 파일에 남기는 복제, 줄 수만 줄이는 압축, 작업자 `.md` 수정은 금지한다.

### 13-4. 작업자 검증·인계

- `rg`로 `.fixed-route-*`·`.quick-count-btn` 계열 선택자가 신규 파일에만 존재하는지, 그리고
  `.input-box`가 여전히 `main-calendar.css`에 그대로 남아 있는지 확인한다.
- `npm test`, `npm run typecheck`, `npm run build`를 통과시키고 React 저장소에 코드만
  커밋한다. **커밋까지만 하고 push는 하지 않는다.**
- 변경 파일·커밋 SHA·검증 결과를 감시관에게 전달한다.
- 감시관은 push/CI 뒤 분리 전후 Pages 산출물을 390×844, 게스트로 "고정 노선" 켠 상태에서
  운행 횟수 빠른 버튼·자주 다니는 노선 칩·파렛트 섹션을 라이트·다크로 대조한다. §5 7항목도
  다시 판정하며, 보리 최종 승인 전에는 `[x]`로 닫지 않는다.
