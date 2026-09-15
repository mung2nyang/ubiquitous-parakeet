# docs/report.md — 현재 슬라이스 착수지시서

## §8. 정비/주유/기타 — 탭/월합계/추가버튼 하단 dock 이관 — `eda52e4`

### 1. 현재 상태 (react-app `MaintFuelPage.jsx`)
- 탭(정비/주유/기타) 3개가 화면 맨 위(제목 바로 아래)에 있음.
- 월 합계 카드("이번 달 {kindLabel}" + "N건" + "합계 {금액}")가 날짜
  네비게이터 다음, 목록 위에 있음. "N건" 표시는 원본에 없음.
- "+추가" 버튼이 화면 우하단에 떠 있는 별도 원형 FAB
  (`management-add-fab`, 다른 화면과 공유 클래스).

### 2. 목표 상태 (원본 `maint-fuel-misc.js:515-522`,
`index.html:1211-1221`, `style.css:4413-4490`+`:5508-5534` 기준)
- 탭 3개 + 월합계 + "+추가" 버튼을 화면 **하단 고정 dock** 하나로 합침
  (목록은 위에서 스크롤, dock은 `position: fixed; bottom` 값으로 하단
  고정 — 원본 최종 값 `bottom: 64px, right/left: max(12px, calc((100vw
  - 480px)/2 + 12px)), padding: 9px, border-radius: 17px`).
- Dock 내부 순서: ① 요약 행 — 레이블 "{N}월 {정비/주유/기타}" + "합계"
  + 금액 + "+추가" 버튼(한 줄, 버튼은 pill 스타일) → ② 탭 버튼 3개 행
  (grid 3열).
- "N건" 항목 개수 표시 제거.
- 레이블 텍스트 "이번 달 {kindLabel}" → "{month+1}월 {kindLabel}"로
  변경, kind별 색상(정비=`--sunday-color`/주유=`--primary-color`/
  기타=`#d97706`) 원본과 동일하게.
- 날짜 네비게이터(연/월 선택)는 그대로 목록 위 상단 유지 — 변경 없음.

### 3. 건드릴 파일
- `react-app/src/components/MaintFuelPage.jsx` — JSX 구조 변경(탭/
  요약/추가버튼을 하단 dock으로 이동, "건" 제거, 레이블 텍스트 변경).
  현재 213줄.
- `react-app/src/components/maint-fuel.css` (신규) — dock 전용 CSS.
- `react-app/src/side-menu.css` — 이 슬라이스로 안 쓰게 되는
  `.maint-fuel-page .summary-card`(650~653행, 4줄)만 제거. 나머지
  기존 규칙은 안 건드림(아래 4번).

### 4. 안 건드릴 것 (blast radius grep 확인, AGENTS §5-6)
- `.management-add-fab`(원형 FAB 기본 스타일, `side-menu.css:275`) —
  `CarListPage`/`ClientListPage`/`OwnerScopedClientsView`/
  `DriverConnectionPage`/`LinkedDriverClientsPage` 5곳 공유. 정비/주유/
  기타는 이 클래스를 더 안 쓰게 되지만 클래스 자체·다른 화면 사용은
  그대로 둠.
- `.summary-card` 기본 규칙(`shared-controls.css:68`) —
  `CalendarMonthSummary`/`ReportDetailView`/`ReportSummaryContent`/
  `TaxInvoicePage`/`revenue/OwnerMonthlyCards` 등 다수 공유, 그대로 둠.
- `.maint-fuel-tabs`/`.maint-fuel-nav` 기본 규칙 —
  `TaxInvoicePage`/`TaxInvoiceToolbar`/`revenue/DriverRevenueView`/
  `revenue/OwnerRevenueView`/`CarDriverConnectPanel` 공유. 마크업만
  새 dock 안으로 옮기고, 클래스 자체 스타일은 안 바꿈.
- `.maint-fuel-item`/`.maint-fuel-head`/`.maint-fuel-info`/
  `.maint-fuel-total` — 이름은 비슷하지만 실제로는 일일운행 화면
  (`day-log/ExpenseGroups.jsx`)이 쓰는 별개 클래스, 이번 작업과 무관
  — 안 건드림.
- 데이터 계층(`domain/expenses.js`, `lib/expenses.js`, `store/*`,
  Supabase 동기화) — 순수 레이아웃 변경, 전혀 안 건드림. AGENTS §8
  5대질문(데이터 권한 등)은 데이터 변경이 없어 해당 없음.

### 5. 실패 시 처리
- 새 저장소·durable/fallback/재시도 레이어 없음(AGENTS §7 해당 없음,
  순수 화면 레이아웃 변경).
- 신규 dock CSS는 새 클래스만 추가하는 방식이라 다른 화면 영향 없을
  것으로 예상 — 만약 문제 생기면 즉시 되돌리고 원인 파악 후 재작성.

### 6. §6 200줄 체크
- `MaintFuelPage.jsx`: 현재 213줄 → 목표 250줄 이내. 넘으면 분리설계
  안을 별도 보고 후 진행(기계적 절단 금지).
- `maint-fuel.css`(신규): 예상 60~80줄, 200줄 문제 없음.

### 7. 승인 상태
보리 승인 완료(2026-09-15) — 1(하단 dock 구조)·2("N건" 제거·레이블
변경)만 진행. 착수.

### 8. 브라우저 검증 결과 (2026-09-15) — 승인 불가(1차)
- 목록 항목 분류 라벨("카드", "엔진/미션" 등)이 원본은 칩(pill) 스타일인데
  react-app은 평문 텍스트임. 재작업 필요.

### 9. 최종 승인 — 완료 `[x]` (2026-09-15)
§8-A(`16ff413`)·§8-B(`8d9e06a`/`bb359b4`)로 재작업 후 보리 브라우저
실검증 완료("이상없어"), push 완료, CI·Deploy 초록 확인(AI 코드
리뷰로 재확인). 탭/월합계/추가버튼 dock 이관 자체는 이 커밋
(`eda52e4`) 기준 완료.

---

## §8-A. 정비/주유/기타 — 항목 카드 SVG 아이콘 복원 — `16ff413` — 완료 `[x]`

### 1. 현재 상태 (react-app `MaintFuelPage.jsx:150-153`)
- `.management-record-title`가 `<strong>{title}</strong>`만 렌더링,
  아이콘 자체가 없음(종류 불문 항상 없음).

### 2. 목표 상태 (원본 `maint-fuel-misc.js:411-451,504`,
`style.css:4345-4369` 기준)
- 항목 카드 제목 앞에 종류별 SVG 아이콘을 title과 함께 렌더링:
  - 정비: 렌치 아이콘(`maint-fuel-misc.js:421`
    `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6
    6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1
    7.94-7.94l-3.76 3.76z"></path>`) — react-app `MyPage.jsx:62`에 동일
    path가 이미 있음(재사용 가능).
  - 주유: `fuelIconSvg()`(`script.js:4253-4257`, 2개 line + 2개 path,
    주유펌프 아이콘).
  - 기타: 삼선(list) 아이콘(`maint-fuel-misc.js:447`
    `<path d="M3 6h18M3 12h18M3 18h18"></path>`).
- 아이콘 색상은 종류별 stroke(`style.css:4352-4369`): 정비=
  `var(--sunday-color)`, 주유=`var(--primary-color)`, 기타=`#d97706`,
  크기 18×18, `fill:none; stroke-width:2; stroke-linecap/linejoin:round`.

### 3. 건드릴 파일
- `react-app/src/components/MaintFuelPage.jsx` — `management-record-title`
  안에 종류별 아이콘 svg 분기 추가(kind별 3종). 현재 213줄.
- `react-app/src/components/maint-fuel.css` — `.management-record-title
  svg` 기본 스타일 + kind별 stroke 색상 규칙 추가(신규, 원본
  `style.css:4352-4369` 이식). 현재 81줄.

### 4. 안 건드릴 것 (blast radius grep 확인)
- `management-record-title`/`management-record-item` 등
  `.management-record-*`·`.management-day-*` 클래스는 react-app 전체에서
  `MaintFuelPage.jsx` 1곳만 사용(grep 확인, 2026-09-15) — 다른 화면
  영향 없음.
- `side-menu.css`의 구버전 `.management-record-*` 규칙(675~741행) 삭제
  여부는 이 슬라이스 범위 밖(§8-B에서 같이 정리할지 판단).

### 5. 실패 시 처리
- 순수 표시(마크업+CSS) 추가, 데이터 계층 무관. 문제 생기면 되돌림.

### 6. §6 200줄 체크
- `MaintFuelPage.jsx`: 213줄 → 아이콘 분기(kind별 svg 3종) 추가 시 소폭
  증가 예상, 250줄 이내로 예상.
- `maint-fuel.css`: 81줄 → 소폭 증가, 200줄 문제 없음.

### 7. 승인 상태
완료 `[x]`(2026-09-15) — 보리 브라우저 실검증("이상없어") + push + CI
초록 + AI 코드 리뷰(아이콘 path 원본과 문자 단위 대조 일치, typecheck
0 에러·lint 신규 경고 없음·테스트 163개 통과·build 성공) 전부 확인.

**아쉬운 점**: 아이콘 렌더 검증용 `.test.js`가 새로 안 붙음(E-1 때는
`ExpenseFormModal.test.js`를 추가했던 전례가 있음). 순수 CSS+마크업이라
리스크는 낮다고 판단해 이번엔 그대로 두지만, AI가 이 점을 보리에게
코드 리뷰 결과로 보고함(2026-09-15) — 다음에 비슷한 화면 작업할 때
렌더 검증 테스트를 같이 붙일지는 그때 판단.

---

## §8-B. 정비/주유/기타 — 결제수단/분류 칩(pill) 스타일 복원 — `8d9e06a`/`bb359b4` — 완료 `[x]`

### 1. 현재 상태 (react-app `side-menu.css:685-741`)
- `.management-record-info > div span`이 전부 민무늬 텍스트(색상+글자크기만),
  칩/카드 형태 없음. `.management-record-item`도 `border-top: 1px`만
  있고(717~720행) 원본처럼 카드 셸(테두리 전체+radius+그림자)이 아님.

### 2. 목표 상태 (원본 `style.css:4336-4407` 기준 + 보리 통일성 원칙 적용)
- `.management-record-item` — `padding:12px 12px 10px; border:1px solid
  var(--border-color); border-radius:15px; background:var(--input-bg);
  box-shadow:var(--shadow-md);` (카드 셸 전체, 지금은 위쪽 선 하나뿐).
- **원본은 `.management-record-info > div span:first-child`(결제수단)만
  칩이고 두 번째 이후 span(분류 등)은 민무늬 텍스트** — 하지만 이건
  이관 목표가 아니라 원본 자체의 비대칭임. **보리 지시(2026-09-15):
  원본에 비대칭이 있어도 발견 시 앱 통일 우선 원칙**
  ([ui-comparison-report.md:188-190](docs/ui-comparison-report.md:188),
  §6 수수료 칩 통일 사례[ui-comparison-report.md:306-308](docs/ui-comparison-report.md:306)와
  동일 기준) — 그대로 포팅하지 않고 `:first-child` 한정을 없애서
  **`.management-record-info > div span` 전체**(결제수단·분류 등 전부)를
  동일한 칩 스타일로 통일: `padding:3px 7px; border:1px solid
  var(--border-color); border-radius:6px; background:var(--card-bg);
  box-shadow:var(--shadow-sm);`.
- `.management-record-info > div span` 공통 — `color:var(--sub-text-color);
  font-size:var(--fs-2);`.

### 3. 건드릴 파일
- `react-app/src/components/maint-fuel.css` — 위 3개 규칙 신규 추가.
- `react-app/src/side-menu.css` — 685~741행 구버전
  `.management-record-*`/`.management-day-head`/`.management-day-items`/
  `.management-day-card` 규칙 제거(§8-A 확인대로 `MaintFuelPage.jsx` 외
  소비처 0, 안전하게 이동 가능 — 단 `.management-day-card`는
  이 블록 안에 있는지 재확인 필요, 아래 4번 참고).

### 4. 안 건드릴 것 (blast radius grep 확인)
- `.management-badge`(거래처·차량관리 배지, §6 이관 때 사용)는 이름은
  비슷하지만 완전히 다른 클래스 — 안 건드림.
- 원본 `style.css:4326-4333`의 종류별 일합계 색상(`.fuel-day
  .management-day-head > div span/b`, `.misc-day ...`)은 이 슬라이스
  범위 밖(현재 발견 안 된 별개 항목) — 필요하면 추후 별도 기재.

### 5. 실패 시 처리
- 순수 CSS 이동+추가, 문제 생기면 되돌림.

### 6. §6 200줄 체크
- `maint-fuel.css`: §8-A 반영 후 기준으로 소폭 증가, 200줄 이내 예상.
- `side-menu.css`: 감소(구버전 규칙 제거).

### 7. 승인 상태
완료 `[x]`(2026-09-15) — §8-A 먼저 진행 후 §8-B 진행(원칙대로 순서
지킴). `8d9e06a`로 1차(결제수단만 칩) 적용했으나 보리가 "원본이
비대칭이어도 앱 통일성 우선" 원칙([ui-comparison-report.md:188-190](ui-comparison-report.md:188))을
다시 짚어줘서 `bb359b4`로 분류 span까지 전부 칩으로 통일. 보리 브라우저
실검증("이상없어") + push + CI 초록 + AI 코드 리뷰 전부 확인(§8-A와
동일 기준, 아쉬운 점도 §8-A와 동일 — 렌더 검증 테스트 미추가, 보리에게
보고함).
