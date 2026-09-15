# docs/report.md — 현재 슬라이스 착수지시서

## §3(거래처) CSS 분리 (보리 지시, 2026-09-15) `[ ]` 착수 전 대기

**분류**: 정리 작업 — 버그 아님. `side-menu.css`(1632줄, AGENTS §6 200줄
훨씬 초과)에 여러 화면 CSS가 섞여 있는 것을 화면별로 분리하는 작업의
거래처 몫. 이미 차량 화면에서 같은 작업을 해둔 선례(`car-management.css`,
`CarListPage.jsx`가 import)를 그대로 따름.

### 조사 결과 — 거래처 전용 규칙 vs 공용 규칙

`side-menu.css`에서 "거래처"(client) 관련 선택자를 전수 grep하고, 각
클래스를 실제로 쓰는 JSX를 확인해 전용/공용을 나눔.

**이동 대상(거래처 전용, 총 5블록·약 108줄)**
- `side-menu.css:424-456` — `.commission-settings-panel`,
  `.commission-inline-row`(+`.toggle-btn`/`.input-box`) — `ClientTradeFields.jsx`
  전용(차량은 별도 `car-commission-panel` 클래스 씀).
- `side-menu.css:490-518` — `.client-list`, `.client-card-title`/
  `.client-card-badges`(+자식 `strong`/`span`) — `ClientListItem.jsx` 전용.
- `side-menu.css:864-874` — `.client-modal-header`(+`.modal-title`) —
  `ClientFormModal.jsx` 전용.
- `side-menu.css:876-902` — `.client-favorite-star`(+`.active`),
  `.management-badge.pinned` — 즐겨찾기 별 버튼·배지, `ClientListItem.jsx`만
  씀(`pinned` class는 grep 결과 클라이언트 화면 외 사용처 없음 확인).
- `side-menu.css:903-910` — `.client-list-card`(+`.client-dragging`) —
  `ClientListItem.jsx` 전용(드래그 정렬).

**안 옮길 것(공용, grep으로 다른 화면 사용 확인)**
- `.management-badge`(기본)/`.tax-invoice` — `CarListItem.jsx`/
  `SettlementSummaryCard.jsx`/`DriverConnectionPage.jsx`/`TaxInvoicePage.jsx`
  등도 씀.
- `.modal-content .toggle-btn`(오늘 추가한 전역 규칙, `side-menu.css:459`) —
  `CarFormModal`의 `CarDriverConnectPanel`도 씀.
- `.report-page-wrap .summary-client-commission-*`(`side-menu.css:1086-1106`) —
  이름은 client지만 매출 정산 리포트 화면(`ReportDetailView` 계열) 몫,
  건드리지 않음.
- `side-menu.css:131-132`의 `.client-management-page`(다른 페이지 클래스들과
  묶여 있는 공용 리셋 선택자 목록의 일부) — 단독 분리 불가, 그대로 둠.

### 목표 상태

- 새 파일 `react-app/src/components/clients/client-management.css` 생성,
  위 5블록을 그대로 옮김(값 변경 없음, 순수 이동).
- `ClientListPage.jsx`에 `import './client-management.css'` 추가
  (`CarListPage.jsx`가 `car-management.css` import하는 것과 동일 패턴).
- `side-menu.css`에서 위 5블록 삭제.

**건드릴 파일**
- `react-app/src/components/clients/client-management.css` (신규)
- `react-app/src/components/clients/ClientListPage.jsx` (import 1줄 추가)
- `react-app/src/side-menu.css` (5블록 삭제, 순수 이동이라 순감소)

**안 건드릴 것**: 각 규칙의 값 자체(색상·크기·라운드 등) — 이번은 파일
위치만 옮기는 것, 스타일 변경 없음. 위에 나열한 공용 규칙들.

**실패 시 처리**: 새 레이어 없음, CSS 블록 이동+import 1줄뿐이라 실패해도
세 파일(신규 포함) 되돌리면 끝.

**§6(200줄)**: 신규 `client-management.css` 약 110줄. `side-menu.css`
1632→약 1524줄(여전히 초과, §4~§14 후속 분리로 계속 줄여감).
`ClientListPage.jsx`는 1줄 추가.

**검증 방법(브라우저)**: 분리 후 거래처 목록(카드 배지·즐겨찾기 별·드래그
정렬)과 등록/수정 모달(헤더·즐겨찾기 별·수수료 인라인행) 전부 분리 전과
픽셀 단위로 동일한지 확인. 라이트/다크 모두.

---

## 다음 슬라이스 (착수 전 대기)

**§9 기사연동관리 전체 대조** 등 — `STATUS.md` "다음 할 일" 참고.
