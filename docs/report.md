# docs/report.md — 현재 슬라이스 착수지시서

## `side-menu.css` 분리설계안 (보리 지시, 2026-09-15) `[ ]` 슬라이스1 승인 대기

### 왜 설계안부터(AGENTS §6)

`side-menu.css` 현재 1421줄. 200줄 초과 파일을 손대려면 기계적 분할이
아니라 책임 경계부터 보고·승인받아야 함. 파일명과 달리 실제 내용은
사이드메뉴 자체보다 **다른 여러 화면 스타일이 뒤섞인 잡동사니** —
한 번에 나누면 3조각 이상 슬라이스가 뻔해서, 먼저 전체 경계를 지도로
그리고 **이번엔 그중 1개만** 착수.

### 전체 경계 지도 (grep으로 실사용처 확인함)

| # | 내용 | 줄수 | 실제 사용 파일 | 비고 |
|---|---|---|---|---|
| A | 사이드메뉴 자체(`.side-menu*`, `.dropdown-item`) | ~129 | `SideMenu.jsx` | 독립적, 이름과 실제 내용주인이 맞는 유일한 덩어리 |
| B | 관리화면 공용(`.management-list-card`/`.action-icon-btn`/`.management-badge`/`.empty-state` 등) | ~134 | 차량·거래처·미수금 등 다수 | **여러 화면 공유 — 특정 화면 파일로 옮기면 안 됨.** 별도 "공용" 파일 필요 |
| C | 차량 커미션 잔재(`.car-commission-*` 등, 죽은 CSS 2개 포함) | ~185 | 주로 `CarManagementPage`류 | §2-1-C 차량 CSS 분리 때 누락분으로 추정 — 죽은 CSS 처리 방침과 얽힘(STATUS "알려진 이슈") |
| D | 개인정보 일부(`.personal-intro*`/`.personal-card*`) | ~102 | `PersonalInfoPage.jsx` | **주의**: 같은 구역의 `.personal-account-btn`은 7개 파일(거래처·기사·초대 등)이 공유 — 화면 전용 부분과 공용 버튼을 분리해서 다뤄야 함 |
| E | 설정 공용(`.setting-section`/`.settings-segmented-control` 등) | ~74 | `AppSettingsPage` 외 다수 | 공용 — B와 유사 성격 |
| F | 정비/주유/기타(`.maint-fuel-*`/`.management-day-*` 등) | ~164 | **12개 파일**(`day-log/*`·`revenue/*`·`TaxInvoicePage`·`cars/*` 등) | **화면 전용 아님 — 이관 코드 전반의 공용 위젯.** MaintFuelPage만의 것으로 착각하기 쉬운 함정 |
| G | 리포트/운송비내역서(`.report-*`/`.info-table`/PDF출력모드) | ~233 | **`ReportPage`/`ReportDetailView`/`ReportShareModal`/`ReportSummaryContent` 4개뿐, 전부 확인** | **완전 독립. 가장 크고 가장 안전** |
| H | 세금계산서 금액그리드(`.tax-invoice-amount-grid`) | ~28 | `TaxInvoicePage` 계열 | J와 겹치는 셀렉터 있어 분리 시 재확인 필요 |
| I | 알림(`.notification-*`/`.top-notification-btn`) | ~114 | `NotificationPanel.jsx`+`CalendarHeader.jsx` | 2파일, 비교적 안전 |
| J | 기사연동관리 카운트(`.driver-management-counts`/`.driver-code-row`)+세금계산서 가이드 | ~31 | `DriverConnectionPage`/`DriverFormModal`/`CarDriverConnectPanel`+`TaxInvoicePage` | H와 마찬가지로 두 화면이 섞여 있어 그대로 자르면 안 됨 |
| K | 앱설정 프리셋(`.run-count-preset-*`/`.fixed-route-preset-*`) | ~172 | `RunCountChips.jsx`/`RoutePresetEditor.jsx` | 2파일, 안전 |
| L | 고객센터(`.support-*`/`.faq-item*`/`.my-inquir*`) | ~33 | `CustomerCenterPage.jsx`/`NoticePage.jsx` | 안전 |
| M | 메시지설정(`.message-settings-*`) | ~12 | `MessageSettingsPage.jsx` | 안전하지만 너무 작아 단독 슬라이스 가치 낮음 |

**A는 파일명이 뜻하는 원래 주인이라 마지막에 남겨도 됨(제일 헷갈릴
일 없음).** B·E는 여러 슬라이스가 공유할 "공용" 파일이 필요해서
후순위(먼저 화면 전용 것부터 빼고 남는 게 진짜 공용). F·D·H·J는
겉보기와 달리 여러 화면이 얽혀 있어 **그대로 자르면 다른 화면을
깨뜨림** — 나중에 더 잘게 나눠 다룰 것.

### 이번 슬라이스 제안: **G — 리포트/운송비내역서**

가장 크고(233줄, 전체 감축분의 1/6) `ReportPage`류 4개 파일 외
어디서도 안 씀(grep 확인 완료) — 블라스트 반경 0, 가장 안전하게
큰 걸 먼저 뺄 수 있음.

#### 현재 상태

`report-*`/`info-table`/`detail-report-table`/PDF 출력모드 CSS
(`side-menu.css:800-1032`, 233줄)가 사이드메뉴 파일에 섞여 있음.
소비처는 `ReportPage.jsx`/`ReportDetailView.jsx`/`ReportShareModal.jsx`/
`ReportSummaryContent.jsx` 4개뿐(전체 `*.jsx` grep 확인).

#### 목표 상태

해당 233줄을 `components/report/report.css`(신규)로 이동, 값 변경
없이 그대로 옮기고 위 4개 파일에 import. `side-menu.css`
1421→약 1188줄.

#### 건드릴 파일

- `react-app/src/components/report/report.css` (신규)
- `react-app/src/components/ReportPage.jsx`(import 추가)
- `react-app/src/components/ReportDetailView.jsx`(import 추가)
- `react-app/src/components/ReportShareModal.jsx`(import 추가, 필요 시)
- `react-app/src/components/ReportSummaryContent.jsx`(import 추가, 필요 시)
- `react-app/src/side-menu.css`(800-1032행 삭제)

#### 안 건드릴 것

- 로직·데이터 흐름 전부(순수 CSS 이동).
- 위 표의 B~F·H~M(다른 경계) — 이번엔 손 안 댐.
- `.summary-card`/`.summary-row` 등 다른 화면(정비/주유/기타·기사정산
  등)이 쓰는 **같은 이름이지만 다른 스코프**(`.report-page-wrap` 접두사
  없는 것)의 규칙 — 그건 이 233줄 밖에 있음, 안 건드림.

#### 실패 시 처리

신규 레이어 없음. 값 변경 없는 순수 이동이라 실패해도 되돌리면 그만.

---

## 다음 슬라이스 (착수 전 대기, 순서 미정 — 매번 보리 확인 후 진행)

G 완료 후 I(알림)·K(프리셋)·L(고객센터)처럼 독립적인 것부터, 얽힌
D·F·H·J는 더 잘게 쪼개 별도 설계 필요. A(사이드메뉴 자체)는 제일
나중. B·E(공용)는 화면 전용 분리가 어느 정도 끝난 뒤 정리.
