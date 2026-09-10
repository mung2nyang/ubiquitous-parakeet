# docs/report.md — 공용 헤더 스타일 통일 (§1-2)

> 이전 작업(미연동 서브차량 관리 + 사이드메뉴 UI 정리, §1~§16 전체 `[x]` 완료) 이력은
> `docs/archive/sub-vehicle-management-and-side-menu.md`로 옮김(동결). 이 문서는
> 새 작업(`docs/ui-comparison-report.md` §1-2 "공용 헤더 스타일")부터 시작한다.

## 0. 배경과 전체 계획

`docs/ui-comparison-report.md` §1-2(보리 직접 확인, 2026-09-09): 화면 우측 상단
햄버거 메뉴 버튼이 없거나 스타일이 뒤로가기 버튼과 안 맞음(뒤로가기는 투명 배경
아님·아이콘이 사각 버튼 안에 들어간 스타일). 알람벨 아이콘도 마찬가지로 통일 필요.
적용 대상(햄버거 버튼이 있어야 하는 전 화면): 마이페이지, 차량 관리, 거래처,
미수금/정산, 정비/주유/기타, 세금계산서, 운송비 내역서, 개인정보, 기사 연동 관리,
앱 설정, 공지 등.

**감시관 코드 확인 결과(2026-09-10)**:
1. 뒤로가기 버튼(`.icon-btn`, `shared-controls.css:130` — 테두리+카드배경 40×40
   사각 버튼)과 홈/일지 화면에만 이미 있는 햄버거·알람벨 버튼이 `side-menu.css`의
   `.top-menu-btn.icon-btn`·`.top-notification-btn.icon-btn` 오버라이드(배경 없음·
   테두리 없음·원형)로 인해 다르게 보임. 같은 선택자가 파일 안에 두 번(17~23줄,
   1327~1343줄) 중복 정의돼 있어 잉여 레이어까지 있음(기존 버그, §7 예외 해당 —
   기존 규칙의 버그 수정이라 새 레이어 아님).
2. 마이페이지·차량관리·거래처·미수금정산·정비주유기타·세금계산서·운송비내역서·
   개인정보·기사연동관리·앱설정·공지 11개 화면 전부 `.settings-header`에
   `<div style={{ width: 40 }}></div>` 빈 스페이서만 있고 햄버거 버튼 자체가 없음.
   `AppShellRoutes.jsx`도 이 화면들 라우트엔 `onOpenMenu`를 안 넘기고 있음(홈·
   일지 라우트에만 연결).
3. `CarManagementPage.jsx`·`ClientManagementPage.jsx`는 각각 `CarListPage.jsx`·
   `ClientListPage.jsx`를 그대로 재수출하는 얇은 배럴이라 추가 파일 아님.

**보리 확정 사항(2026-09-10)**:
- 슬라이스 분할: ①CSS 스타일 통일(이번 슬라이스, 1파일) → ②~⑤ 화면 3~4개씩 묶어
  햄버거 버튼 추가(총 4슬라이스). 전체 5슬라이스 계획.
- "기사 연동 관리" 햄버거는 연동 기사(`drivers/:linkId`)·미연동 서브차량 관리
  (`logs/:logId/manage`) **두 라우트 모두** 적용(같은 `LinkedDriverManagementPage.jsx`
  컴포넌트, `AppShellRoutes.jsx`에서 두 라우트 등록 각각에 `onOpenMenu` 연결).

## 1. 이번 슬라이스(①) — CSS 스타일 통일만

### 현재 상태
- `react-app/src/side-menu.css`:
  - 7~23줄: `.top-btn-group`(홈 화면 우측 상단 고정 위치 컨테이너) 뒤에
    `.top-menu-btn.icon-btn { background:none; border:none; box-shadow:none;
    border-radius:50%; color:var(--icon-color,#4a5568); }` — 원형 투명 오버라이드.
  - 1298~1309줄: `.top-notification-btn { position:fixed; top:15px; left:15px;
    z-index:100; overflow:visible; background:none; border:none; box-shadow:none;
    border-radius:50%; color:var(--icon-color,#4a5568); }` — 알람벨 자체도 원형
    투명.
  - 1327~1343줄: 위 두 선택자를 다시 한번 반복하는 중복 규칙(`.top-notification-btn.icon-btn,
    .top-menu-btn.icon-btn { background:none; border:none; box-shadow:none; }` +
    `.top-notification-btn.icon-btn { position:fixed; display:grid; }` — `display:grid`는
    `shared-controls.css`의 기본 `.icon-btn`에 이미 있어 중복) + hover
    (`background-color:var(--hover-bg); color:var(--text-color)`).
- 기본 `.icon-btn`(`shared-controls.css:130`)은 이미 원하는 스타일: 40×40, 테두리
  `1px solid var(--border-color)`, `border-radius:12px`, `background:var(--card-bg)`,
  `color:var(--text-color)`, 아이콘 20×20 중앙 정렬.

### 목표 상태
- 햄버거(`top-menu-btn`)·알람벨(`top-notification-btn`) 버튼이 위치(고정 배치·
  z-index·좌우 좌표)는 그대로 유지한 채, 배경·테두리·모양은 기본 `.icon-btn`을
  그대로 물려받아 뒤로가기 버튼과 **완전히 동일한 사각 카드 스타일**로 보인다.
  hover 시 배경 강조(`--hover-bg`)는 그대로 유지(기존에도 있던 사용성 장치, 문제
  지적 대상 아님).

### 건드릴 파일 (정확히 1개)
- `react-app/src/side-menu.css`
  1. 7~23줄: `.top-menu-btn.icon-btn` 규칙 삭제(배경/테두리/모양 오버라이드 전부
     제거), `.top-btn-group`만 남김.
  2. 1298~1309줄: `.top-notification-btn` 규칙에서 `background`·`border`·
     `box-shadow`·`border-radius`·`color` 5개 선언 삭제, `position`·`top`·`left`·
     `z-index`·`overflow`만 남김(고정 위치 유지).
  3. 1327~1337줄: 중복 규칙(`.top-notification-btn.icon-btn, .top-menu-btn.icon-btn
     {...}` 및 `.top-notification-btn.icon-btn {position:fixed; display:grid;}`)
     전체 삭제 — 둘 다 위 정리 후 남은 값과 겹치거나(`position:fixed`) 기본
     `.icon-btn`에 이미 있는 값(`display:grid`)이라 불필요.
  4. hover 규칙(`.top-notification-btn.icon-btn:hover, .top-menu-btn.icon-btn:hover
     { background-color: var(--hover-bg); color: var(--text-color); }`)은 **그대로
     유지**.

### 안 건드릴 것
- JSX 파일 전부(버튼 마크업·prop 변경 없음 — 이번 슬라이스는 이미 버튼이 있는
  홈·일지 화면의 스타일만 고침).
- `shared-controls.css`의 기본 `.icon-btn` 정의 자체(무변경, 그대로 상속받음).
- 햄버거 버튼이 없는 11개 화면(②~⑤ 슬라이스 몫).
- Store·DB·동기화·색상 변수·다른 컴포넌트 CSS.

### §8 4대 질문 (참고 — 순수 CSS라 대부분 해당 없음)
1. 구독/스냅샷 여부 — 해당 없음(정적 스타일시트, 데이터 구독 없음).
2. 값 출처 — 해당 없음(하드코딩 CSS 값, Store/localStorage/Supabase 무관).
3. 쓰기 창구 — 해당 없음(쓰기 동작 없음).
4. hydrate·디바운스 충돌 — 해당 없음.
실패 시 처리: **신규 레이어 없음.** 기존 선택자 정리(버그 수정)만, 새 CSS
파일·클래스·상태 저장소 추가 없음(§7 예외 대상 확인됨).

### 검증 방법
- CI(test·typecheck·build)는 자동.
- 감시관 브라우저 실측: 변경 전/후 각각 로컬 빌드해 홈 화면(햄버거+알람벨)과
  일지 화면(햄버거) 라이트/다크 컴퓨티드 스타일(`background-color`·`border`·
  `border-radius`) 대조 — 뒤로가기 버튼과 값이 일치하는지 확인. hover 상태도
  확인.

### 1-1. 구현 결과와 감시관 검토 (2026-09-10)

- 작업자 커밋 react-app `a351340`(`style: 햄버거·알람벨을 뒤로가기와 같은 사각
  icon-btn 스타일로 통일`), 보리가 직접 push. `git show --stat` 확인 결과
  `src/side-menu.css` 딱 1개, 25줄 삭제만(추가 0) — 착수지시서 3곳과 정확히
  일치, hover 규칙은 그대로 남김.
- GitHub Actions: `CI`(verify) `conclusion: success`, `Deploy GitHub Pages`도
  success, 둘 다 headSha `a351340` 일치.
- **감시관 §5 7항목**:
  1. 범위 준수 — 지시 파일(`side-menu.css`) 1개만, 지시한 3곳 정확히 일치.
  2. 몰래 증설 없음 — 순수 삭제, 새 파일·클래스·상태 없음.
  3. 타입 꼼수 없음 — CSS라 해당 없음(`any`/`@ts-ignore` 등 무관).
  4. 200줄 — `side-menu.css`는 이번 범위에서 기존부터 제외 대상(§0 CSS 분리
     작업 때부터 "제외" 명시), 이번 diff는 25줄 삭제뿐이라 더 줄어듦. 새 초과
     아님.
  5. 테스트 진실성 — 테스트 파일 변경 없음(순수 스타일이라 착수지시서 단계
     부터 신규 테스트 불필요로 합의, 대신 브라우저 컴퓨티드 스타일 실측).
  6. 문서 정합 — diff에 `.md` 없음, 작업자가 문서 안 건드림.
  7. 요구사항 충족 — 지시서의 4개 세부 항목(메뉴 오버라이드 삭제·알람벨
     5선언 삭제·중복 규칙 삭제·hover 유지) 전부 diff와 정확히 일치.
  → 7항목 전부 통과.
- **감시관 브라우저 실측**: `npm run dev`로 로컬 기동 후, `icon-btn`/
  `icon-btn top-menu-btn`/`icon-btn top-notification-btn` 3개 버튼을 실제
  DOM에 붙여 `getComputedStyle` 비교 — `background-color`(`rgb(57,57,57)`)·
  `border`(`0.857143px solid rgb(74,74,74)`)·`border-radius`(`12px`)·크기
  (40×40)·`display`(`grid`) **전부 3개 버튼이 완전히 일치**. `side-menu.css`
  잔여 규칙 재확인(`grep`) 결과 이 클래스들 관련 규칙은 위치 지정 1개 +
  hover 1개만 남아 라이트/다크 분기 있는 별도 오버라이드 없음(테마 무관하게
  항상 동일 적용 확인). hover 규칙(`background-color: var(--hover-bg)`)도
  스타일시트에 그대로 남아있음 재확인.
- CI green + 감시관 §5 통과 + 브라우저 컴퓨티드 스타일 실측까지 완료.
  **§5 7항목 판정 후 보리 승인 전엔 `[x]`로 닫지 않는다.**

### 1-2. 브라우저 실검증 가이드 (보리용)

1. `npm run dev`(또는 배포된 Pages)로 접속 → 비회원(게스트)으로 시작.
2. 홈 화면 우측 상단 **햄버거 메뉴 버튼**과 **알람벨 아이콘**이 왼쪽 위
   **뒤로가기 버튼과 같은 사각형 카드 모양**(테두리 있음, 배경 채워짐)으로
   보이는지 확인 — 이전엔 투명 원형이었음.
3. 일지 화면(달력에서 날짜 탭)에 들어가 상단 햄버거 버튼도 뒤로가기 버튼과
   같은 모양인지 확인.
4. 라이트/다크 모드 전환해서 둘 다 확인.
5. 버튼에 마우스를 올렸을 때 살짝 배경이 진해지는 hover 효과가 그대로
   있는지 확인.
6. 문제없으면 "승인" — 있으면 어느 화면·어떤 부분이 다른지 알려주면 됨.

## 3. 이번 슬라이스(②) — 마이페이지·차량 관리·거래처 햄버거 버튼 추가

### 현재 상태 (감시관 재확인, 2026-09-10)

4개 화면 전부 같은 모양(`.settings-header`에 뒤로가기+제목+스페이서), 스페이서만
다름:

- `components/MyPage.jsx:97,107-113` — `export default function MyPage({ session,
  ownerKey = 'guest', onOpen, onBack })`, 스페이서 `<span className=
  "mypage-header-spacer" aria-hidden="true"></span>`(189줄).
- `components/cars/CarListPage.jsx:48,142-148` — `export default function
  CarListPage({ ownerKey = 'guest', session = null, onBack, showToast })`,
  스페이서 `<div style={{ width: 40 }}></div>`(180줄).
- `components/clients/ClientListPage.jsx:30,89-95` — `export default function
  ClientListPage({ ownerKey = 'guest', onBack, showToast })`, 스페이서 동일
  (121줄).
- `components/clients/OwnerScopedClientsView.jsx:32,98-104` — `export default
  function OwnerScopedClientsView({ ownerKey = 'guest', onBack, showToast })`,
  스페이서 동일(156줄).
- `app/AppShellRoutes.jsx:75-86` — `cars`·`clients`(두 분기)·`me` 라우트가 각각
  `<CarManagementPage .../>`·`<OwnerScopedClientsView .../>`·
  `<ClientManagementPage .../>`·`<MyPage .../>`를 렌더링하는데 `onOpenMenu` 전달
  안 함(함수 파라미터엔 이미 있음, 홈/일지 라우트에만 씀).
- 참고: `CarManagementPage.jsx`·`ClientManagementPage.jsx`는 각각
  `CarListPage.jsx`·`ClientListPage.jsx`를 재수출만 하는 배럴이라 별도 파일 아님.

### 목표 상태

4개 화면 전부 `DayLogHeader.jsx`(기존 코드)와 같은 패턴 — `onOpenMenu`가 있으면
햄버거 버튼, 없으면 기존 스페이서 그대로 유지(하위 호환):

```jsx
{onOpenMenu ? (
  <button type="button" className="icon-btn top-menu-btn" title="메뉴" onClick={onOpenMenu}>
    <svg viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  </button>
) : <div style={{ width: 40 }}></div> /* MyPage.jsx만 기존 mypage-header-spacer 유지 */}
```

`AppShellRoutes.jsx`의 `cars`·`clients`(두 분기 모두)·`me` 라우트 엘리먼트에
`onOpenMenu={onOpenMenu}` prop 1개씩 추가.

### 건드릴 파일 (정확히 5개)
1. `react-app/src/app/AppShellRoutes.jsx` — 4곳(`cars`, `clients` 두 분기,
   `me`)에 `onOpenMenu={onOpenMenu}` 추가.
2. `react-app/src/components/MyPage.jsx` — JSDoc에 `@param {(() => void)}
   [props.onOpenMenu]` 추가, 함수 시그니처에 `onOpenMenu` 추가, 스페이서를 위
   조건부 버튼으로 교체(폴백은 기존 `mypage-header-spacer` 유지).
3. `react-app/src/components/cars/CarListPage.jsx` — 동일 패턴(폴백은
   `<div style={{width:40}}></div>` 유지).
4. `react-app/src/components/clients/ClientListPage.jsx` — 동일 패턴.
5. `react-app/src/components/clients/OwnerScopedClientsView.jsx` — 동일 패턴.

### 안 건드릴 것
- 나머지 8개 화면(③~⑤ 슬라이스 몫).
- `side-menu.css`(①에서 이미 완료).
- 뒤로가기 버튼 로직, `onBack`·`onOpen` 등 기존 prop, Store/DB/동기화.

### §8 4대 질문 — 순수 UI prop 추가라 해당 없음(①과 동일 논리).
실패 시 처리: **신규 레이어 없음.** 기존 `SideMenu`/`onOpenMenu` 메커니즘(이미
`AppShell.jsx`에 있음) 재사용만, 새 상태·새 컨텍스트 없음.

### 검증 방법
- CI 자동.
- 감시관 브라우저 실측: 게스트로 마이페이지·차량관리·거래처(차주 모드)
  3화면 진입해 햄버거 버튼이 보이고 클릭 시 사이드메뉴가 열리는지 확인,
  라이트/다크 모두. 거래처의 소속기사(`OwnerScopedClientsView`) 모드는 게스트
  계정으로 직접 재현 어려우면 코드 대조(같은 패턴 적용됐는지)로 대체하고 보리
  확인 요청.

### 3-1. 구현 결과와 감시관 검토 (2026-09-10)

- 작업자 커밋 react-app `3fb533a`(`feat: 마이페이지·차량·거래처 헤더에
  햄버거 메뉴 버튼 추가`), 보리 push. `git show --stat` 확인 결과 정확히
  지시한 5파일(`AppShellRoutes.jsx`+화면 4개)만, diff가 착수지시서 마크업과
  라인 단위로 완전 일치(폴백까지 그대로).
- GitHub Actions: `CI`(verify) success, `Deploy` success, 둘 다 headSha
  `3fb533a` 일치.
- **감시관 §5 7항목**: 범위 준수(1~7 전부)·몰래 증설 없음·타입 꼼수 0건
  (`any`/`@ts-ignore`/`as unknown as` 검색 결과 없음)·200줄(`MyPage.jsx`
  198줄로 근접, 나머지 3개는 여유 있음, 이번 diff로 새로 초과한 파일 없음)·
  테스트 파일 변경 없음(순수 prop 추가라 착수지시서 단계부터 신규 테스트
  불필요로 합의, DayLogHeader 선례와 동일)·문서(`.md`) 변경 없음·요구사항
  4개 화면 전부 diff와 정확히 일치 — **전부 통과**.
- 브라우저 실검증은 **보리가 직접** 진행(2026-09-10) — 마이페이지·차량관리·
  거래처 3화면에서 햄버거 버튼 확인. 보리 명시 승인 **"승인/다음 진행해"**
  (2026-09-10). `3fb533a` `[x]`로 닫는다.

## 4. 다음 슬라이스(③) 착수 전 확인 (2026-09-10)

로드맵 초안(§2 참고) 재조사 중 두 가지 불명확한 점을 발견해 질문, 보리 확정:

1. **`MaintFuelPage.jsx`가 이미 207줄**(§11-6 때 사전 승인받은 ~205~210
   범위). 햄버거 버튼(~8줄) 추가하면 약 215줄로 그 범위마저 넘음 →
   **보리 확정: "이번에도 그냥 초과해서 진행(여유분 한 번 더)"** —
   `LinkedDriverManagementPage.jsx` §12 선례와 동일하게, 다음에 또 늘면
   그때 분리설계.
2. **서브차량 전용 경로(`logs/:logId/expenses`)에도 햄버거를 넘길지** →
   **보리 확정: "메인+서브차량 둘 다(기사연동관리와 동일 규칙)"**.
3. **`receivables/*` 라우트의 실제 구조 재확인**: `AppShellRoutes.jsx`의
   `receivables/*`는 `ReceivablesPage.jsx`(중첩 라우터 셸, 8-C)를 거쳐
   `index` 라우트에서 `ReceivablesListPage.jsx`를 렌더링 — 즉 로드맵
   초안의 "4파일" 추정이 하나 빠졌음. 정확한 목록은 아래 참고.

## 5. 이번 슬라이스(③) — 미수금/정산·정비주유기타·세금계산서 햄버거 버튼 추가

### 현재 상태
- `components/receivables/ReceivablesListPage.jsx:21,34~40` — `export
  default function ReceivablesListPage({ ownerKey = 'guest', onBack,
  showToast, onWorkChanged })`, 스페이서 `<div style={{width:40}}></div>`
  (91줄).
- `components/ReceivablesPage.jsx`(8-C 중첩 라우터 셸, 22줄) —
  `export default function ReceivablesPage({ ownerKey = 'guest', onBack,
  showToast, onWorkChanged })`가 `<Routes>`로 `index`(→`ReceivablesListPage`)·
  `:client/:month`(→`ReceivablesDetailPage`) 둘로 나눔. `onOpenMenu`는
  index 쪽에만 전달해야 함(상세 화면은 이번 대상 아님).
- `components/MaintFuelPage.jsx:27,102~108` — `export default function
  MaintFuelPage({ ownerKey = 'guest', logId: logIdProp, onBack, showToast })`,
  스페이서 동일 패턴(**이미 207줄** — 위 §4-1 보리 확정대로 이번엔 그대로
  초과 진행).
- `components/TaxInvoicePage.jsx:32,139~145` — `export default function
  TaxInvoicePage({ ownerKey = 'guest', onBack, showToast })`, 스페이서 동일
  패턴(206줄).
- `app/AppShellRoutes.jsx:72,89~92` — `logs/:logId/expenses`·`expenses`
  (둘 다 `MaintFuelPage`)·`receivables/*`(`ReceivablesPage`)·`tax`
  (`TaxInvoicePage`) 라우트 전부 `onOpenMenu` 없음.

### 목표 상태
①·②와 동일한 조건부 버튼 패턴(`onOpenMenu`가 있으면 햄버거, 없으면 기존
`<div style={{width:40}}></div>` 유지). `MaintFuelPage`는 `expenses`·
`logs/:logId/expenses` **두 라우트 모두** `onOpenMenu` 연결(보리 확정).
`ReceivablesPage`는 받은 `onOpenMenu`를 `index` 라우트의
`ReceivablesListPage`에만 전달, `:client/:month`(상세)는 그대로 둠.

### 건드릴 파일 (정확히 5개)
1. `react-app/src/app/AppShellRoutes.jsx` — 4곳(`logs/:logId/expenses`,
   `expenses`, `receivables/*`, `tax`)에 `onOpenMenu={onOpenMenu}` 추가.
2. `react-app/src/components/ReceivablesPage.jsx` — JSDoc·시그니처에
   `onOpenMenu` 추가, `index` 라우트의 `<ReceivablesListPage .../>`에만
   `onOpenMenu={onOpenMenu}` 전달(`shared` 객체에 넣지 말 것 — 상세 화면엔
   안 감).
3. `react-app/src/components/receivables/ReceivablesListPage.jsx` — ①·②와
   동일 조건부 버튼 패턴.
4. `react-app/src/components/MaintFuelPage.jsx` — 동일 패턴. **200줄 초과
   진행 승인됨(보리 확정, §4-1) — 별도 분리설계 없이 그대로.**
5. `react-app/src/components/TaxInvoicePage.jsx` — 동일 패턴.

### 안 건드릴 것
- `ReceivablesDetailPage.jsx`(상세 화면, 이번 대상 아님).
- 나머지 6개 화면(④~⑤ 슬라이스 몫).
- Store·DB·동기화, `onBack`·`onWorkChanged` 등 기존 prop.

### §8 4대 질문 — 순수 UI prop 추가라 해당 없음(①·②와 동일 논리).
실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관 브라우저 실측: 게스트로 미수금/정산·정비주유기타(메인 경로)·
  세금계산서 3화면 진입해 햄버거 버튼 확인. 서브차량 전용
  `logs/:logId/expenses`는 게스트 계정에 서브차량이 없으면 코드 대조로
  대체하고 보리 확인 요청.

## 6. 다음 슬라이스 로드맵(④~⑤, 착수지시서는 각 착수 시점에 별도 작성)

전부 같은 패턴 반복(화면당 로직 분기 없음).

- **④** 운송비 내역서(`ReportPage.jsx`) · 개인정보(`PersonalInfoPage.jsx`) ·
  기사 연동 관리(`drivers/LinkedDriverManagementPage.jsx`, `drivers/:linkId`·
  `logs/:logId/manage` 두 라우트 모두 — 보리 확정) — 라우팅 포함 4파일.
- **⑤** 앱 설정(`AppSettingsPage.jsx`) · 공지(`NoticePage.jsx`) — 라우팅 포함
  3파일.

각 슬라이스 착수 전 감시관이 해당 파일들의 현재 헤더 마크업을 재확인하고 착수
지시서를 이 문서에 이어서 작성한다.

## 7. ③ 슬라이스 완료 확인 (2026-09-10)

작업자 커밋(`06d9516`) → 보리가 직접 push·브라우저 검증까지 마치고
"작업자 작업완/내가 푸시함/브라우저 검증완... 리뷰 체크리스트하지말고
나머지만 진행" 지시. **§5 리뷰 체크리스트는 생략**, CI 상태만 확인:
verify(`34427840763`)·deploy(`34427840793`) 둘 다 success, headSha
일치. `git show --stat`로 정확히 지시한 5파일(`AppShellRoutes.jsx`,
`ReceivablesPage.jsx`, `receivables/ReceivablesListPage.jsx`,
`MaintFuelPage.jsx`, `TaxInvoicePage.jsx`)만 변경된 것 확인. 보리 명시
승인 **"승인"** — `[x]` 확정.

부수 확인(체크리스트는 아니고 다음 슬라이스 준비 중 발견): `MaintFuelPage.jsx`
216줄(사전 승인대로 초과 진행), `TaxInvoicePage.jsx`는 착수 전부터 이미
206줄이었는데 §5 착수지시서에 초과 승인 대상으로 명시가 안 됐던 채 215줄로
진행됨 — 재작업 요구 안 하고 기록만 남김.

## 8. ④ 슬라이스 착수 전 확인 필요 (2026-09-10, 질문 중 — 아직 미착수)

§6 로드맵대로 라우팅 포함 4파일(`AppShellRoutes.jsx`, `ReportPage.jsx`,
`PersonalInfoPage.jsx`, `drivers/LinkedDriverManagementPage.jsx`)에
①~③과 같은 패턴을 적용하려 했으나, 착수지시서 작성 전 재확인하다
두 파일이 이미 200줄 초과 상태에서 더 늘어나는 걸 발견:

- **`LinkedDriverManagementPage.jsx`(현재 246줄)** — §12(`2c660d3`)에서
  헤더 중복 제거로 254→245줄 줄이며 보리가 직접 "이번이 마지막
  여유분, 다음에 또 넘기면 진짜 분리설계로 간다"는 문구를 파일 상단
  주석에 명문화(현재도 그대로 남아 있음, `drivers/LinkedDriverManagementPage.jsx:4`).
  이번에 두 라우트(`drivers/:linkId`, `logs/:logId/manage`) 각각에
  헤더 버튼(~8~16줄) 추가하면 그 "다음 초과"에 해당함.
- **`ReportPage.jsx`(현재 241줄)** — 상단 주석에 자체 예외치 "240줄"이
  적혀 있는데 이미 241줄(이유 불명, 이번 조사 중 발견 — 별건이라 추적
  안 함)이고, 버튼 추가하면 더 늘어남.
- `PersonalInfoPage.jsx`(197줄)는 문제없음.

AGENTS §6·§12의 "예외 없이 분리설계" 약속 때문에 ①~③처럼 단순 진행은
불가 — 보리에게 **대화창에서 먼저 질문**(착수지시서 작성 전, §3
"불명확하면 질문 1회로 확정" 절차). **보리 답변(2026-09-10)**:
1. `LinkedDriverManagementPage.jsx` → **"약속대로 분리설계 먼저"** —
   이번 ④ 슬라이스에서 이 파일은 아예 건드리지 않는다. 분리설계안은
   별도 슬라이스(④-2, 아래 §10)로 뺀다.
2. `ReportPage.jsx` 240→241줄 드리프트 → **"먼저 원인부터 확인"** —
   조사 결과는 아래 §9.

## 9. `ReportPage.jsx` 240→241줄 드리프트 원인 조사 (2026-09-10)

`git log --follow`로 추적: `7a5131a`(운송비 내역서 공유 모달 이관,
2026-09-08)에서 240줄 + 상단 주석 "240줄" 기록 → 바로 다음 커밋
`cc5583d`("운송비 내역서 요약에 일자별 운행 표 이관", 2026-09-08,
원본에 있던 기능을 옮긴 정상적인 이관 작업)이 표 1줄을 추가하며
241줄이 됨 — **주석 갱신만 누락된 정상 드리프트**, 버그나 몰래 증설
아님. 그 뒤 `602f75f`(§6 파일 분리 리팩터)는 import 4줄만 바꿔 줄수
불변(241 유지). 두 커밋 다 CI green으로 이미 main에 병합된 지 이틀 지난
상태(이번 세션 착수 대상 아님) — 재작업 불필요, 주석 숫자만 이번
슬라이스에서 "241줄"로 같이 고친다.

## 10. 이번 슬라이스(④) — 운송비 내역서·개인정보 헤더에 햄버거 메뉴 버튼 추가 (축소 범위)

위 §8-9 결론에 따라 원래 로드맵의 "라우팅 포함 4파일" 중
`LinkedDriverManagementPage.jsx`(연동·미연동 두 라우트)는 이번에서
제외, 분리설계 슬라이스(④-2, 별도 착수지시서 예정)로 미룬다.

### 현재 상태
- `components/ReportPage.jsx:28,163` — `export default function
  ReportPage({ ownerKey = 'guest', onBack, showToast })`, 스페이서
  `<div style={{ width: 40 }}></div>`(241줄, 상단 주석 "240줄"은 §9
  드리프트로 실제와 1줄 어긋남).
- `components/PersonalInfoPage.jsx:23,57` — `export default function
  PersonalInfoPage({ ownerKey = 'guest', session, onBack, onGoAuth,
  showToast })`, 동일 스페이서 패턴(197줄, 문제없음).
- `app/AppShellRoutes.jsx:87,91` — `report`·`me/profile` 두 라우트 모두
  `onOpenMenu` 없음.

### 목표 상태
①·②·③과 동일한 조건부 버튼 패턴(`onOpenMenu`가 있으면 햄버거, 없으면
기존 스페이서 유지).

### 건드릴 파일 (정확히 3개)
1. `react-app/src/app/AppShellRoutes.jsx` — `report`·`me/profile` 두
   곳에 `onOpenMenu={onOpenMenu}` 추가.
2. `react-app/src/components/ReportPage.jsx` — 동일 패턴. 상단 주석의
   "240줄"을 실제 줄수(버튼 추가 후 최종 줄수)로 갱신. §9 조사로
   240→241 드리프트가 정상 이관 결과임은 확인됐으나, 버튼 추가로
   약 249줄까지 더 늘어나는 것 자체는 **이 착수지시서로 승인 요청
   중**(아래 착수 승인 시 확정).
3. `react-app/src/components/PersonalInfoPage.jsx` — 동일 패턴.

### 안 건드릴 것
- `LinkedDriverManagementPage.jsx`와 관련 라우트(`drivers/:linkId`,
  `logs/:logId/manage`) — ④-2로 이관.
- 나머지 화면(⑤ 슬라이스 몫: 앱 설정·공지).
- Store·DB·동기화, `onBack`·`onWorkChanged` 등 기존 prop.

### §8 4대 질문 — 순수 UI prop 추가라 해당 없음(①~③과 동일 논리).
실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관 브라우저 실측: 게스트로 운송비 내역서·개인정보 2화면 진입해
  햄버거 버튼 확인(단, 이번 슬라이스도 보리 지시로 §5 체크리스트
  생략 여부는 완료 보고 시점에 다시 확인).

## 11. ④-2 — `LinkedDriverManagementPage.jsx` 분리설계안 (승인 필요, 2026-09-10)

현재 246줄 1파일. 내용 구성(읽어서 확인):
1. `pageHeader()` 헬퍼(8줄) — 뒤로가기+타이틀+스페이서.
2. 데이터/로직(46~126줄, ~80줄) — hooks 구독, `driverManagementContext`
   판별, `detail`/`invoice` 계산(`useMemo`).
3. JSX 렌더(128~245줄, ~118줄) — 안에서도 **3개 독립 섹션**으로 이미
   나뉘어 있음: (a) 프로필 카드+칩 3개(131~170, 40줄), (b) 날짜
   이동기+정산 요약 카드(172~194, 23줄), (c) 거래처별 세금계산서 목록
   (196~243, 48줄) — 이 3개는 서로 데이터만 주고받지 로직 공유 없음
   (각각 `detail`/`invoice`/`ctx` 중 필요한 것만 씀).

### 제안 — (b)·(c)를 같은 폴더(`components/drivers/`)의 독립 컴포넌트로 분리
기존 관행(day-log 하위 컴포넌트를 `components/day-log/`에 모으는 방식)과
동일하게, 같은 화면의 하위 조각이니 **새 폴더 만들지 않고 기존
`components/drivers/`에 파일만 추가**.

1. **`SettlementSummaryCard.jsx`(신규, ~30줄)** — 172~194줄 이동. 책임:
   월 선택 날짜 이동기 + 정산 요약 카드 표시. Props: `viewDate`,
   `onPrevMonth`, `onNextMonth`, `onYearChange`, `onMonthChange`,
   `detail`(정산 상세, null 허용). 내부 상태 없음(순수 표시).
2. **`ClientInvoiceGroups.jsx`(신규, ~50줄)** — 196~243줄 이동. 책임:
   거래처별 세금계산서 그룹 목록 표시. Props: `invoice`(groups+
   unassignedCount). 내부 상태 없음.
3. **`LinkedDriverManagementPage.jsx`(기존, 246→약 170줄)** — 위 둘을
   import해 조립 + 프로필 카드/칩 3개는 그대로 유지(이 부분은 로직과
   얽혀 있어 분리 실익 적음) + 이번에 햄버거 버튼(`onOpenMenu`, 두
   라우트 모두)도 같이 추가. 최종 약 178줄 예상 — 200줄 아래로 안전하게
   내려감.

### 안 건드릴 것
- (a) 프로필 카드+칩 섹션, `pageHeader()` 헬퍼, hooks/로직 부분 — 그대로
  `LinkedDriverManagementPage.jsx`에 유지.
- `domain/driverManagementContext.js`, `domain/finance.js` 등 계산 로직
  — 로직 이동 없음, JSX만 이동(순수 리팩터).
- 연동·미연동 두 모드 판별 로직(`ctx.mode`) — 변경 없음.

### 의존성
- `SettlementSummaryCard.jsx`·`ClientInvoiceGroups.jsx` 둘 다 이 화면
  전용(다른 화면에서 재사용 계획 없음) — `linked-driver.css`는 기존
  그대로 메인 파일에서 import 유지.

### 건드릴 파일 (정확히 4개 — 신규 2 + 수정 2)
1. `react-app/src/components/drivers/SettlementSummaryCard.jsx`(신규)
2. `react-app/src/components/drivers/ClientInvoiceGroups.jsx`(신규)
3. `react-app/src/components/drivers/LinkedDriverManagementPage.jsx`(수정
   — JSX 2섹션 추출 + 두 라우트 모두 햄버거 버튼 추가)
4. `react-app/src/app/AppShellRoutes.jsx`(수정 — `drivers/:linkId`·
   `logs/:logId/manage` 두 곳에 `onOpenMenu={onOpenMenu}` 추가)

### §8 4대 질문 — 순수 UI 리팩터+prop 추가, 해당 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관 브라우저 실측: 연동 기사(`drivers/:linkId`)·미연동 서브차량
  (`logs/:logId/manage`) 두 모드 모두 진입해 정산 요약 카드·거래처
  세금계산서 목록이 분리 전과 동일하게 보이는지 + 햄버거 버튼 확인.
  두 라우트 다 게스트 계정으로 접근 가능 여부 확인 필요(안 되면 코드
  대조 + 보리 확인 요청).

**→ 이 분리설계안 승인 후 착수.**

## 12. ④-2 완료 확인 + 이번 슬라이스(⑤, 마지막) — 앱 설정·공지 헤더 햄버거 버튼 (2026-09-10)

④-2(`ff322d6`) 설계안대로 정확히 4파일만 변경, CI green, 보리 직접
커밋·push·브라우저 검증(연동·미연동 두 모드) 완료 확인 — `[x]`.

§1-2(공용 헤더 스타일 통일) 5슬라이스 계획의 마지막, ⑤ 착수지시서.

### 현재 상태
- `components/AppSettingsPage.jsx:18,96` — `export default function
  AppSettingsPage({ ownerKey = 'guest', onBack, showToast })`, 스페이서
  `<div style={{ width: 40 }}></div>`(189줄, 문제없음).
- `components/NoticePage.jsx:26,41` — `export default function
  NoticePage({ onBack })`(다른 화면과 달리 `ownerKey`·`showToast` 없음
  — 기존 시그니처 그대로 둠), 스페이서 동일 패턴(65줄, 문제없음).
- `app/AppShellRoutes.jsx:88,100` — `me/settings`(→`AppSettingsPage`)·
  `notice`(→`NoticePage`) 두 라우트 모두 `onOpenMenu` 없음.

### 목표 상태
①~④-2와 동일한 조건부 버튼 패턴(`onOpenMenu` 있으면 햄버거, 없으면
기존 스페이서 유지).

### 건드릴 파일 (정확히 3개)
1. `react-app/src/app/AppShellRoutes.jsx` — `me/settings`·`notice` 두
   곳에 `onOpenMenu={onOpenMenu}` 추가.
2. `react-app/src/components/AppSettingsPage.jsx` — 동일 패턴.
3. `react-app/src/components/NoticePage.jsx` — 동일 패턴(`onOpenMenu`
   prop 신규 추가, 기존 `onBack`만 있던 시그니처에 추가).

### 안 건드릴 것
- Store·DB·동기화, 기존 prop 전부.
- 이걸로 §1-2 원안 5슬라이스(①~⑤) 전체 종료 — 후속 화면(§2~14)은
  보리가 직접 작성해둔 기록이 있으나 아직 착수지시서 없음(다음 세션
  범위).

### §8 4대 질문 — 순수 UI prop 추가라 해당 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관/보리 브라우저 실측: 앱 설정·공지 2화면 진입해 햄버거 버튼 확인.

**→ 착수 승인 대기.**

## 13. ⑤ 푸시 확인 + 누락분 발견 (2026-09-10)

**⑤(`56a6f76`, 앱 설정·공지)는 작업자 커밋까지는 됐지만 아직 GitHub에
푸시가 안 된 상태 확인.** `git fetch` 후 `origin/main`이 여전히
`ff322d6`(④-2)에 머물러 있고, 로컬 `main`이 `[origin/main: ahead 1]`.
보리가 "푸시함"이라 하셨는데 실제로는 로컬에만 있어 **CI가 아직 한 번도
안 돌았음**(`gh run list`에 `56a6f76` 관련 run 없음) — 착수 승인/완료
확정 전에 먼저 실제 push 확인 필요.

**보리가 브라우저 확인 중 발견한 누락 화면 4곳**(고객센터·매출·연동
기사관리 거래처·미연동 기사관리 거래처 — 전부 §1-2 원 계획 밖, §2~14
쪽 화면):
- `components/CustomerCenterPage.jsx`(176~181줄, 헤더 1곳) — **이미
  230줄, 200줄 초과.**
- `components/RevenuePage.jsx`(30줄, 문제없음)는 실제 헤더가 아니라
  `components/revenue/RevenueNav.jsx`의 `PageShell`(17~22줄, 59줄 전체,
  문제없음)을 그대로 씀 — `RevenuePage.jsx`→`PageShell`로 `onOpenMenu`
  전달만 추가하면 됨.
- `components/drivers/LinkedDriverClientsPage.jsx`(연동
  `drivers/:linkId/clients`·미연동 `logs/:logId/clients` 두 라우트 모두
  이 컴포넌트 공유) — **이미 207줄, 200줄 초과.** 헤더가 2곳(129·147줄,
  `notFound` 분기 + 정상 분기)이라 버튼도 2곳 다 추가해야 함.
- `app/AppShellRoutes.jsx`의 `revenue`·`logs/:logId/clients`·
  `drivers/:linkId/clients` 세 라우트 전부 `onOpenMenu` 없음.

두 파일(`CustomerCenterPage.jsx`·`LinkedDriverClientsPage.jsx`)이 이미
200줄 초과라 ①~⑤처럼 단순 진행 불가 — 착수지시서 작성 전 대화창에서
먼저 확인 필요(§6·§7).

조사 결과 두 파일 다 이미 기존에 승인된 "≤250줄 응집 예외" 주석이
상단에 있어(`CustomerCenterPage.jsx`는 `253198d`, `LinkedDriverClientsPage.jsx`는
`17937e9` 때 정상 승인 절차로 들어간 것) 버튼 추가해도 그 한도 안(각각
~238줄·~218~220줄)이라고 감시관이 보고 → **보리가 "상의좀하자"로 잠깐
멈췄다가, 최종적으로 화면별 방식 자체를 중단시킴.**

## 14. 🛑 화면별 햄버거 버튼 방식 전면 중단 + 공용 헤더 컴포넌트 방향 전환 (2026-09-10, 보리 지시)

> "아짜증나네 걍 중단해 하지마. 자꾸 쪼개지고 줄수가 늘어나서 안되겠어.
> 착수지시서 쓰지마. 넌 내가 착수지시서 만들라할때까지 하지마.
> 모든 화면이 공유할 수 있는 공용 헤더 컴포넌트 하나 만들어"

- **①~⑤(+④-2)까지의 화면별 조건부 헤더 JSX 복붙 패턴은 여기서 멈춘다.**
  ⑤(`56a6f76`)는 push 여부와 무관하게 이 시점 기준 마지막 슬라이스.
  고객센터·매출·연동/미연동 기사관리 거래처 4화면은 이번 방식으로
  이어가지 않는다.
- **감시관은 다음 착수지시서를 쓰지 않는다.** 보리가 "착수지시서
  만들어"라고 명시할 때까지 대기(§1 감시관 역할 ①번 일시 정지, 보리
  직접 지시). 이 문서에도 새 착수지시서 절을 추가하지 않는다.
- **새 방향(아직 설계 미확정, 지시만 있고 착수지시서 없음)**: 화면마다
  반복되는 `settings-header` 마크업(`grep -rl 'settings-header'
  src/components src/app` 기준 22개 파일)을 공용 컴포넌트 하나로
  통일. 구체 설계(파일 위치, prop 인터페이스, 기존 22개 파일 중 몇 개를
  이번에 옮길지 등)는 보리가 착수지시서 작성을 지시하는 시점에 다시
  조사해 확정한다 — 지금 미리 설계하지 않음(지시 위반 방지).

## 15. 보리 지시로 재개 (2026-09-10) — 공용 헤더 컴포넌트 `PageHeader` 설계 + 전체 로드맵

> "22개 심각하네 공용 헤더 컴포넌트 만들어서 settings-header 패턴 쓰는
> 파일 22개 전부 기존 중복 헤더 코드를 공용 컴포넌트 호출로 대체해.
> 리팩토링 후 기존 화면 디자인/기능 깨짐 없는지 검증도 해야하고 22개가
> 전부인지 확인해. 코드가 몇 줄 남지 않는 불필요한 하위/껍데기 컴포넌트
> 파일이 생기면 독립 파일로 남겨두지 말고 부모 컴포넌트에 다시
> 흡수시켜. 그렇다고 흡수할 때 250 이상 줄이면 그냥 둬"

§14의 대기 지시가 이 메시지로 풀림 — 착수지시서 재작성 시작.

### 15-1. "22개가 전부인가" 검증

세 가지 독립 검색으로 교차 확인:
- `grep -rl "settings-header" src/components src/app` → **22개**.
- `grep -rl "settings-title" src/components src/app` → **22개, 파일
  목록 완전히 동일**(클래스 페어라 당연히 일치, 교차검증용).
- `grep -rl "뒤로가기" src/components src/app` → 32개(22개 포함, 나머지
  10개는 개별 확인):
  - `auth/AuthLoginView.jsx`·`auth/AuthSignupView.jsx` — 로그인 전
    화면, `auth-topbar`/`auth-back-icon-btn`이라는 **완전히 다른
    헤더**(햄버거 메뉴 자체가 없는 화면, 사이드메뉴 개념 없음) — 대상
    아님.
  - `day-log/DayLogPage.jsx`·`app/AppShell.jsx`·`app/MainPageRoute.jsx`·
    `app/workLogNavigation.js` — "뒤로가기"라는 **단어가 주석에만**
    등장(실제 헤더 마크업 없음) — 대상 아님.
  - `*.test.js` 4개 — 테스트 파일, 대상 아님.
- 추가로 홈 캘린더(`calendar/CalendarHeader.jsx`)도 확인 — 뒤로가기
  버튼이 없고(홈이라 없음) 월 이동·알람벨·햄버거로 구성된 **별도
  헤더**(다만 햄버거 버튼 마크업 자체는 22개와 byte 단위로 동일 —
  향후 참고사항, 이번 22개 범위엔 포함 안 함).

**→ 22개가 맞다. 빠진 화면 없음.**

### 15-2. 22개 파일 현황 (2026-09-10 조사)

| 파일 | 줄수 | onOpenMenu | 비고 |
|---|---|---|---|
| AppSettingsPage.jsx | 198 | ✅ | |
| cars/CarListPage.jsx | 189 | ✅ | |
| clients/ClientListPage.jsx | 130 | ✅ | |
| clients/OwnerScopedClientsView.jsx | 165 | ✅ | |
| ComingSoonPage.jsx | 21 | ❌ | §2~14 범위, 이번엔 마크업만 |
| CustomerCenterPage.jsx | 230 | ❌ | **누락분 — 이번에 추가** |
| day-log/DayLogHeader.jsx | 33 | ✅ | 타이틀 옆 `AutoSaveStatus` 특수 케이스 |
| DriverConnectionPage.jsx | 174 | ❌ | §2~14 범위, 이번엔 마크업만 |
| drivers/BillingSettingsPage.jsx | 70 | ❌ | §2~14 범위, 이번엔 마크업만 |
| drivers/LinkedDriverClientsPage.jsx | 207 | ❌ | **누락분 — 이번에 추가**, 헤더 2곳(notFound+정상) |
| drivers/LinkedDriverManagementPage.jsx | 197 | ✅ | 로컬 `pageHeader()` 헬퍼 있음 — 흡수 대상 |
| InviteRedeemPage.jsx | 83 | ❌ | §2~14 범위, 이번엔 마크업만(스페이서가 `<span className="mypage-header-spacer">`로 미세하게 다름 — 통일) |
| MaintFuelPage.jsx | 216 | ✅ | |
| MessageSettingsPage.jsx | 112 | ❌ | §2~14 범위, 이번엔 마크업만 |
| MyPage.jsx | 198 | ✅ | |
| NoticePage.jsx | 74 | ✅ | |
| PersonalInfoPage.jsx | 206 | ✅ | |
| receivables/ReceivablesDetailPage.jsx | 103 | ❌ | 원래 의도적 제외(§5) — 이번에도 마크업만, 동작 유지 |
| receivables/ReceivablesListPage.jsx | 100 | ✅ | |
| ReportPage.jsx | 250 | ✅ | |
| revenue/RevenueNav.jsx | 59 | ❌ | **누락분 — 이번에 추가**. `PageShell` 함수가 흡수 대상 |
| TaxInvoicePage.jsx | 215 | ✅ | |

13곳은 이미 `onOpenMenu` 정상 작동 중(마크업만 교체, 동작 무변경).
`ComingSoonPage.jsx`·`DriverConnectionPage.jsx`·
`drivers/BillingSettingsPage.jsx`·`InviteRedeemPage.jsx`·
`MessageSettingsPage.jsx`·`receivables/ReceivablesDetailPage.jsx`(6개)는
§2~14 범위라 **이번엔 마크업만 통일, `onOpenMenu` 추가 안 함**(동작
무변경 원칙 — 별도 지시 없이 기능 확장 안 함). `CustomerCenterPage.jsx`·
`revenue/RevenueNav.jsx`·`drivers/LinkedDriverClientsPage.jsx`(3개)는
지난번 보리가 브라우저에서 직접 찾아낸 누락분이라 **이번에 `onOpenMenu`
같이 추가**(원래 목적이었던 것 그대로 수행).

### 15-3. 22개 헤더 마크업 실제 대조

세 가지 독립 grep(`icon-btn.*뒤로가기`, `top-menu-btn`, 각 파일의
`settings-header` 블록 전체)으로 22개를 서로 비교 — **뒤로가기
버튼·햄버거 버튼 마크업은 22개 전부 byte 단위로 완전히 동일**(온클릭
핸들러 이름만 다름 — `onBack`/`handleBack`/`handleHeaderBack`/화살표
함수, 전부 prop으로 흡수 가능). 예외 2건:
- `InviteRedeemPage.jsx`의 오른쪽 스페이서만 `<span
  className="mypage-header-spacer" aria-hidden="true"></span>`(다른
  21개는 `<div style={{ width: 40 }}></div>`) — 시각적으로 동일한
  40px 스페이서, 공용 컴포넌트로 흡수하며 자연스럽게 통일(부수
  정리, 회귀 아님 — 계산된 폭이 같은지 감시관이 브라우저에서 재확인).
- `day-log/DayLogHeader.jsx`만 타이틀 칸이 `<div
  className="modal-title-stack"><div className="settings-title">…</div>
  <AutoSaveStatus .../></div>`로, 타이틀 옆에 자동저장 상태를 추가로
  보여줌 — 유일한 구조적 예외.

### 15-4. `PageHeader` 컴포넌트 설계

**신규 파일**: `react-app/src/components/PageHeader.jsx`(다른
공용급 컴포넌트처럼 최상위, 새 폴더 안 만듦).

```jsx
// @ts-check
/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.title
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onOpenMenu]
 * @param {import('react').ReactNode} [props.titleExtra]
 */
export default function PageHeader({ title, onBack, onOpenMenu, titleExtra }) {
  return (
    <div className="settings-header">
      <button type="button" className="icon-btn" title="뒤로가기" onClick={onBack}>
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      {titleExtra ? (
        <div className="modal-title-stack">
          <div className="settings-title">{title}</div>
          {titleExtra}
        </div>
      ) : (
        <div className="settings-title">{title}</div>
      )}
      {onOpenMenu ? (
        <button type="button" className="icon-btn top-menu-btn" title="메뉴" onClick={onOpenMenu}>
          <svg viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      ) : (
        <div style={{ width: 40 }}></div>
      )}
    </div>
  )
}
```
약 28줄. `titleExtra`는 `DayLogHeader.jsx` 전용(다른 21개는 안 씀).
CSS는 무변경(`settings-header`·`settings-title`·`icon-btn`·
`top-menu-btn`은 이미 `shared-controls.css`에 있음, §1-2 ①·10차
작업 결과 — 새 CSS 없음).

### 15-5. "껍데기 파일 흡수" 원칙 적용 대상 2건

- **`drivers/LinkedDriverManagementPage.jsx`의 로컬 `pageHeader()`
  헬퍼(8줄, 별도 파일 아니고 같은 파일 안의 지역 함수)** — `PageHeader`
  호출로 대체되며 완전히 불필요해짐 → **삭제**(파일이 아니라 함수라
  "부모에 흡수"할 것도 없이 그냥 제거, 호출부 2곳이 `PageHeader`를
  직접 씀).
- **`revenue/RevenueNav.jsx`의 `PageShell` 함수(17줄)** — 헤더 마크업을
  `PageHeader` 호출로 바꾸면 `<div className="page ...">{header}
  {children}</div>` 정도의 3~4줄짜리 순수 껍데기로 줄어듦. 이 함수의
  **유일한 소비처가 `RevenuePage.jsx`(현재 30줄) 하나뿐**이라 지시대로
  `RevenuePage.jsx`에 흡수: `PageShell`을 지우고 `RevenuePage.jsx`가
  `PageHeader`+`<div className="page ...">`를 직접 렌더링. 결과
  예상 줄수 `RevenuePage.jsx` 30→약 40줄(250 미만이라 흡수 조건
  충족). `RevenueNav.jsx`엔 `DateNav`가 남아 파일 자체는 안 없어짐
  (42줄 정도로 축소).
- 나머지 20개는 각 파일 안에서 인라인 JSX만 교체하는 것이라 "껍데기
  파일"이 새로 생기지 않음 — 해당 없음.

### 15-6. 슬라이스 로드맵 (6개, 착수지시서는 각 슬라이스 시작 시 이 문서에 추가)

전부 **동작 무변경**(behavior-preserving) 리팩터이고, 딱 3개 파일만
`onOpenMenu` 신규 추가(원래 누락분 해소) — 그 3개는 별도 슬라이스로
분리해 리스크를 격리한다.

1. **① `PageHeader.jsx` 신규 + 4파일**: `AppSettingsPage.jsx`·
   `MyPage.jsx`·`NoticePage.jsx`·`PersonalInfoPage.jsx`(전부 이미
   `onOpenMenu` 있음, 마크업 교체만) — 패턴 검증용 첫 배치.
2. **② 4파일**: `TaxInvoicePage.jsx`·`MaintFuelPage.jsx`·
   `ReportPage.jsx`·`receivables/ReceivablesListPage.jsx`.
3. **③ 4파일**: `cars/CarListPage.jsx`·`clients/ClientListPage.jsx`·
   `clients/OwnerScopedClientsView.jsx`·
   `drivers/LinkedDriverManagementPage.jsx`(로컬 `pageHeader()` 삭제
   포함).
4. **④ 2파일(특수 케이스)**: `day-log/DayLogHeader.jsx`(`titleExtra`로
   `AutoSaveStatus` 유지 확인)·`receivables/ReceivablesDetailPage.jsx`
   (동작 무변경 확인).
5. **⑤ 누락분 해소(동작 변경 포함) 3파일+라우팅**:
   `revenue/RevenueNav.jsx`(`PageShell`→`RevenuePage.jsx` 흡수)·
   `CustomerCenterPage.jsx`·`drivers/LinkedDriverClientsPage.jsx`(헤더
   2곳) + `app/AppShellRoutes.jsx`(`revenue`·`support`(고객센터)·
   `logs/:logId/clients`·`drivers/:linkId/clients` 4곳에 `onOpenMenu`
   추가).
6. **⑥ 나머지 5파일(동작 무변경)**: `ComingSoonPage.jsx`·
   `DriverConnectionPage.jsx`·`drivers/BillingSettingsPage.jsx`·
   `InviteRedeemPage.jsx`·`MessageSettingsPage.jsx`.

각 슬라이스 검증 방법(전 슬라이스 공통): CI 자동 + 감시관이 슬라이스
전/후 커밋을 각각 로컬 빌드해 대상 화면의 컴퓨티드 스타일·스크린샷을
문자열/육안 대조(§1-2 CSS 분리 작업 때 쓰던 방식 재사용) — 순수
마크업 교체이므로 완전 일치가 나와야 정상.

## 16. 이번 슬라이스(①, 공용 헤더 첫 배치) — 착수지시서

### 현재 상태
- `PageHeader.jsx` 없음(22개 파일이 각자 마크업 중복).
- `AppSettingsPage.jsx`·`MyPage.jsx`·`NoticePage.jsx`·
  `PersonalInfoPage.jsx` 4개 전부 §15-3에서 확인한 표준 마크업 그대로,
  전부 `onOpenMenu` 정상 작동 중.

### 목표 상태
4개 파일의 `settings-header` 블록을 `<PageHeader title=... onBack={...}
onOpenMenu={onOpenMenu} />` 한 줄로 교체. **화면에 보이는 결과·동작은
100% 동일해야 함**(순수 리팩터).

### 건드릴 파일 (정확히 5개 — 신규 1 + 수정 4)
1. `react-app/src/components/PageHeader.jsx`(신규, §15-4 설계 그대로).
2. `react-app/src/components/AppSettingsPage.jsx`
3. `react-app/src/components/MyPage.jsx`
4. `react-app/src/components/NoticePage.jsx`
5. `react-app/src/components/PersonalInfoPage.jsx`

### 안 건드릴 것
- 나머지 17개 화면(②~⑥ 몫), `AppShellRoutes.jsx`, CSS 전부.
- 각 파일의 기존 `onBack`/`onOpenMenu` prop 시그니처·호출부(그대로
  받아서 `PageHeader`에 전달만).

### §8 4대 질문 — 순수 리팩터(로직·prop 계약 무변경), 해당 없음.
실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관이 이번 커밋 전/후 각각 로컬 빌드 → 4화면 모두 라이트/다크
  컴퓨티드 스타일 + 스크린샷 대조(완전 일치 확인) + 뒤로가기·햄버거
  버튼 클릭 동작 확인.

**→ 착수 승인 대기.**

## 17. ① 슬라이스 완료 확인 (2026-09-10)

작업자 커밋(`1f63ae1`) → 보리 push(`origin/main` 일치 확인) →
"진행해" 지시. CI green(verify `34433286140` success, deploy
`34433286008` success) + `git show --stat`로 정확히 지시한 5파일(신규
`PageHeader.jsx` 37줄 + 수정 4)만 변경 확인 + 각 파일 diff를 코드로
직접 대조(4파일 다 `<PageHeader title=... onBack={onBack}
onOpenMenu={onOpenMenu} />` 한 줄로 정확히 치환, 로직·prop 계약
무변경). 줄수도 예상대로 감소: `AppSettingsPage.jsx` 198→185,
`MyPage.jsx` 198→185, `NoticePage.jsx` 74→61, `PersonalInfoPage.jsx`
206→193.

**발견(재작업 요구 안 함, 기록만)**: `MyPage.jsx`의 원래 스페이서가
다른 3개와 달리 `<span className="mypage-header-spacer"
aria-hidden="true">`(CSS: 44×44px)였는데, `PageHeader.jsx`의 공용
스페이서는 21개 파일 기준의 `<div style={{ width: 40 }}></div>`라
이번에 40px로 통일됨. `.icon-btn` 자체가 40×40px라 오히려 대칭이 더
정확해진 변경이고, 실제 라우팅에서 `MyPage`는 `onOpenMenu`가 항상
전달돼 스페이서 분기 자체가 렌더링된 적이 없어(햄버거 버튼만 항상
보임) **현재 화면엔 시각적 영향 없음** — 다만 §15-3 조사 때
`InviteRedeemPage.jsx`만 예외로 적었던 게 부정확했음(이 파일도 같은
예외였는데 감시관이 놓침, 이번에 뒤늦게 발견). `[x]` 확정.

## 18. 이번 슬라이스(②) — TaxInvoicePage·MaintFuelPage·ReportPage·ReceivablesListPage

§15-6 로드맵 그대로. 4개 전부 §15-3에서 확인한 표준 마크업(스페이서도
전부 `<div style={{ width: 40 }}></div>`, ①에서 발견한 것 같은 예외
없음 — 이번엔 재확인 완료) + `onOpenMenu` 이미 정상 작동 중.

### 건드릴 파일 (정확히 4개, 전부 수정)
1. `react-app/src/components/TaxInvoicePage.jsx`
2. `react-app/src/components/MaintFuelPage.jsx`
3. `react-app/src/components/ReportPage.jsx`
4. `react-app/src/components/receivables/ReceivablesListPage.jsx`

각 파일의 `settings-header` 블록을 `<PageHeader title="..." onBack={...}
onOpenMenu={onOpenMenu} />` 한 줄로 교체(①과 동일 패턴). `ReportPage.jsx`는
`onBack` 대신 `handleHeaderBack`을 그대로 전달.

### 안 건드릴 것
- `PageHeader.jsx`(이미 완성, 무변경). 나머지 16개 화면(③~⑥ 몫).

### §8 4대 질문 — 순수 리팩터, 해당 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관 커밋 전/후 대조(①과 동일 방식).

**→ 착수 승인 대기.**

## 19. ② 슬라이스 완료 확인 (2026-09-10)

작업자 커밋(`7283a33`) → 보리 push 확인 → "진행해". CI green(verify
`34433839580`·deploy `34433839544` 둘 다 success) + 정확히 지시한
4파일만 변경 + diff 전체를 직접 대조(4곳 다 `<PageHeader .../>` 한
줄 치환, `ReportPage.jsx`는 `handleHeaderBack` 그대로 전달 — 로직
무변경, 이번엔 스페이서 예외도 없음). 줄수 전부 감소:
`MaintFuelPage.jsx` 216→203, `ReportPage.jsx` 250→237,
`TaxInvoicePage.jsx` 215→202, `ReceivablesListPage.jsx` 100→87.
**200줄 넘던 4개 다 줄었고, 남은 초과분(203·237)도 리팩터 덕에 이전보다
여유 커짐(추가 조치 불필요).** `[x]` 확정.

## 20. 이번 슬라이스(③) — CarListPage·ClientListPage·OwnerScopedClientsView·LinkedDriverManagementPage

§15-6 로드맵 그대로. 앞의 세 화면은 표준 마크업(스페이서 포함 예외
없음, 재확인 완료). `LinkedDriverManagementPage.jsx`는 로컬 `pageHeader()`
헬퍼 함수(30~49줄, JSDoc 포함 약 20줄)가 있고 호출부가 2곳(129·144줄,
함수 호출 문법 `pageHeader(onBack, t, onOpenMenu)`) — §15-5에서 결정한
대로 이번에 **삭제**.

### 건드릴 파일 (정확히 4개, 전부 수정)
1. `react-app/src/components/cars/CarListPage.jsx` — `<PageHeader
   title="차량 관리" onBack={onBack} onOpenMenu={onOpenMenu} />`.
2. `react-app/src/components/clients/ClientListPage.jsx` — 동일
   패턴(`title="거래처"`).
3. `react-app/src/components/clients/OwnerScopedClientsView.jsx` —
   동일 패턴(`title="거래처"`).
4. `react-app/src/components/drivers/LinkedDriverManagementPage.jsx` —
   로컬 `pageHeader()` 함수 삭제, 두 호출부(129·144줄)를
   `<PageHeader title={...} onBack={onBack} onOpenMenu={onOpenMenu} />`
   JSX로 직접 교체(함수 호출 문법 → JSX 문법 전환, 인자 순서·값 그대로).

### 안 건드릴 것
- `PageHeader.jsx`(무변경). 나머지 14개 화면(④~⑥ 몫).
- `LinkedDriverManagementPage.jsx`의 다른 로직(정산 계산, `SettlementSummaryCard`/
  `ClientInvoiceGroups` 등 ④-2 결과물) — 헤더 부분만.

### §8 4대 질문 — 순수 리팩터, 해당 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관 커밋 전/후 대조 + `LinkedDriverManagementPage.jsx`는 연동·
  미연동 두 모드 헤더(제목이 `unlinked ? title : '기사 관리'` /
  `title`로 서로 다름) 둘 다 확인.

**→ 착수 승인 대기.**

## 21. ③ 슬라이스 완료 확인 (2026-09-10)

작업자 커밋(`e2ec81e`) → 보리 첫 push 시도 때 실제로는 반영 안 됨
확인(`git fetch` 후 `origin/main` 그대로) → 보리 재push 확인 →
CI green(verify `34434256007` success, 로그로 typecheck·test·build
3게이트 확인). 정확히 지시한 4파일 + diff 전체 대조: 앞 3개는
`<PageHeader .../>` 한 줄 치환, `LinkedDriverManagementPage.jsx`는
로컬 `pageHeader()` 함수 삭제 + 호출부 2곳 JSX 직접 교체(인자·순서
그대로, 로직 무변경). 줄수 전부 감소: `CarListPage.jsx` 189→176,
`ClientListPage.jsx` 130→117, `OwnerScopedClientsView.jsx` 165→152,
`LinkedDriverManagementPage.jsx` 197→176. `[x]` 확정.

## 22. 이번 슬라이스(④) — day-log 헤더 흡수 + ReceivablesDetailPage

§15-6 로드맵의 "특수 케이스" 슬라이스. 착수 전 재확인하다 §15-5에서
예상 못 했던 흡수 대상 하나를 추가로 발견:

- **`day-log/DayLogHeader.jsx`(현재 33줄)** — `titleExtra`로
  `AutoSaveStatus`를 넘기게 바꾸면 이 파일 자체가 `<PageHeader
  title={...} titleExtra={<AutoSaveStatus .../>} onBack={onClose}
  onOpenMenu={onOpenMenu} />` 한 줄짜리 순수 pass-through로 줄어듦
  (약 15줄). **유일한 소비처가 `DayLogPage.jsx`(현재 178줄) 하나뿐**
  이라 보리 지시("껍데기 파일은 부모로 흡수, 250줄 넘으면 그냥 둬")
  대로 흡수 대상 — 흡수해도 `DayLogPage.jsx`는 약 188줄 예상(250 미만,
  조건 충족). **`DayLogHeader.jsx` 파일 자체를 삭제**하고
  `DayLogPage.jsx`가 `PageHeader`·`AutoSaveStatus`를 직접 import해
  렌더링.
- **`receivables/ReceivablesDetailPage.jsx`(103줄)** — 특수 구조
  없음, 단순 `<PageHeader .../>` 치환. `onOpenMenu` 없음(원래
  의도적 제외, 동작 무변경 유지 — 이번에도 추가 안 함).

### 건드릴 파일 (정확히 2개 수정 + 1개 삭제)
1. `react-app/src/components/day-log/DayLogPage.jsx`(수정) —
   `DayLogHeader` import 제거, `PageHeader`·`AutoSaveStatus` 직접
   import, 117번째 줄 렌더링부를 `<PageHeader title={\`${month}월
   ${day}일 운행 일지\`} titleExtra={<AutoSaveStatus
   status={autoSaveStatus} />} onBack={handleClose} onOpenMenu={onOpenMenu}
   />`로 교체(현재 `onClose` prop이 실제로는 `handleClose`를 받으므로
   변수명 그대로 대응).
2. `react-app/src/components/day-log/DayLogHeader.jsx`(**삭제**) —
   다른 소비처 0곳 확인됨(`grep -rl DayLogHeader src/` 결과 자기
   자신+`DayLogPage.jsx` 둘뿐).
3. `react-app/src/components/receivables/ReceivablesDetailPage.jsx`
   (수정) — `<PageHeader title="미수금 상세" onBack={() =>
   navigate('/app/receivables')} />` 한 줄로 교체(`onOpenMenu` 없음
   유지).

### 안 건드릴 것
- `PageHeader.jsx`(무변경). 나머지 12개 화면(⑤~⑥ 몫).
- `AutoSaveStatus.jsx` 자체(내용 무변경, import 위치만 이동).

### §8 4대 질문 — 순수 리팩터, 해당 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관 커밋 전/후 대조: 일지 화면 헤더(자동저장 상태 표시 포함)·
  미수금 상세 화면 둘 다 라이트/다크 확인.

**→ 착수 승인 대기.**
