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
