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

## 4. 다음 슬라이스 로드맵(③~⑤, 착수지시서는 각 착수 시점에 별도 작성)

전부 같은 패턴 반복(화면당 로직 분기 없음).

- **③** 미수금/정산(`receivables/ReceivablesListPage.jsx`) · 정비/주유/기타
  (`MaintFuelPage.jsx`, `expenses` 라우트) · 세금계산서(`TaxInvoicePage.jsx`) —
  라우팅 포함 4파일. (※`MaintFuelPage`가 쓰이는 `logs/:logId/expenses`(미연동
  서브차량 전용)에도 넣을지는 이 슬라이스 착수 전 보리 확인 필요 — 기사연동관리처럼
  "둘 다"인지 별도 질문.)
- **④** 운송비 내역서(`ReportPage.jsx`) · 개인정보(`PersonalInfoPage.jsx`) ·
  기사 연동 관리(`drivers/LinkedDriverManagementPage.jsx`, `drivers/:linkId`·
  `logs/:logId/manage` 두 라우트 모두 — 보리 확정) — 라우팅 포함 4파일.
- **⑤** 앱 설정(`AppSettingsPage.jsx`) · 공지(`NoticePage.jsx`) — 라우팅 포함
  3파일.

각 슬라이스 착수 전 감시관이 해당 파일들의 현재 헤더 마크업을 재확인하고 착수
지시서를 이 문서에 이어서 작성한다.
