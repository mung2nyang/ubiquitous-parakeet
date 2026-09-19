# docs/report.md — 현재 슬라이스 착수지시서

## 이관 완전성 감사 (화면·기능 기준, 읽기 전용)

> **이 지시서는 다른 AI가 이어받아 수행한다.** 시작 전 `AGENTS.md`와 루트
> `STATUS.md`를 먼저 읽고 그 규칙(§1 승인 흐름·§3 커밋 흐름·의견 표시 규칙)을
> 따른다. 이 작업은 **코드를 한 줄도 고치지 않는 조사**다.

### 0. 왜 하는가
UI 이관 §1~§16은 2026-09-19 "완료"로 확정됐다(보리). 그러나 그 근거는
`docs/ui-comparison-report.md`의 **화면 단위 대조**다 — 화면이 원본과 같아 보이는지를
본 것이지 "원본에 있던 기능·동작·조건이 하나도 안 빠졌다"는 확인이 아니다.
실제로 놓친 사례(보정용 정답, §5에서 재사용):
- 원본 **소속기사(연동기사 본인) 화면**의 고정노선은 전체 거래처 폼이 아니라 "읽기 전용
  카드 + 토글 1개짜리 미니 모달"이다(`client-management.js:236-271,338-369`,
  `index.html:2314-2331`). 화면 목록에 안 잡혀서 AI가 "원본엔 없다"고 오판했고, 보리가
  브라우저 대조로 바로잡았다.
- 미연동 고정노선 숨김을 AI가 "원본 설계·의도적"으로 적었으나 실제 이유는 저장공간
  겹침(`driver-link.js:932-935` 주석)이라는 구현 사정이었다 — 근거 없는 의도 단정.

**목표:** 원본의 사용자 조작 단위(화면·모달·버튼·토글·입력 동작)를 빠짐없이 뽑아, 각
항목이 react-app에 있는지·같은지·다른지·없는지를 **증거(파일:줄)와 함께 표로** 남긴다.
판단(고칠지 말지)은 보리가 한다. 이 작업은 판단 재료만 만든다.

### 1. 조사 대상 (원본 = `ubiquitous-parakeet/` 루트의 바닐라 앱)
측정값(2026-09-19): 화면 22개, 모달 13개, 이벤트 핸들러 종류 202개(index.html 168 +
JS 템플릿 문자열 40, 중복 포함), `addEventListener` 57곳, JS 10개(`script.js` 5576줄,
`finance.js` 1753, `supabase-sync.js` 1749, `driver-link.js` 1200, `client-management.js`
888, `maint-fuel-misc.js` 831, `car-management.js` 816, `ui-widgets.js` 539,
`notifications.js` 347, `mypage.js` 336) + `index.html` 2468줄.
- 화면 id(22): loginPage onboardingPage mainPage reportPage taxInvoicePage myPage
  billingSettingsPage noticePage messageSettingsPage personalInfoPage carManagementPage
  driverConnectionManagementPage linkedDriverManagementPage linkedDriverClientsPage
  clientManagementPage receivablesManagementPage receivableDetailPage revenuePage
  maintManagementPage settingsPage subCarSettingsPage customerCenterPage
- 모달 id(13): callDetailModal detailReportSelectModal maintFuelSelectModal fuelDetailModal
  maintRecordModal carModal carDriverInviteModal reportCarSelectModal reportShareModal
  clientModal driverClientFixedRouteModal taxInvoiceModal confirmModal
- **주의: 핸들러는 `index.html`에만 있지 않다.** JS가 만들어 넣는 HTML 문자열 속
  `onclick=`(예: `client-management.js:266`)도 사용자 조작이다 — 반드시 포함.
- **주의: 같은 화면도 계정 종류에 따라 다르다.** 원본은 `isOwnerAccountType`(7곳)·
  `isDriverAccount`(5곳) 등으로 분기한다. 계정 종류 = ①차주 ②연동기사 본인 ③차주가
  보는 미연동 서브차량 ④게스트. 항목마다 **어느 계정에서 보이는지**를 함께 적는다.

### 2. 안 하는 것 (범위 밖)
- 순수 스타일·색·간격 차이(§1~§16에서 보리가 확정한 영역).
- 계산 수치 대조(`finance.js` 함수 값 비교) — 별도 조사. 단 "계산이 얽힌 동작이 있는가"는
  표에 표시만 한다.
- 고칠지 말지의 판단, 코드 수정, 새 기능 제안.

### 3. 방법
1. **읽기:** `docs/ui-comparison-report.md`(§1~§16 완료 항목), `docs/roadmap.md`(이관 후
   진행사항 = 이미 알려진 명시적 제외), `docs/sot.md`(계정·데이터 규칙), `STATUS.md`.
2. **원본 인벤토리 자동 추출** (예시 명령, 결과를 표의 뼈대로 쓴다):
   - 모달: `grep -oE '<div id="[a-zA-Z]+" class="modal-overlay' index.html`
   - 핸들러(html+js 전체): `grep -ohE '(onclick|onchange|oninput|onsubmit)="[a-zA-Z_]+' index.html *.js | sort -u`
   - 리스너: `grep -n addEventListener *.js`
   - 화면별 진입 함수: 각 `xxxPage` id를 여는 코드(`classList.remove('hidden')` 등)와
     역할 분기(`isOwnerAccountType`/`isDriverAccount`)를 grep해서 계정 종류별 진입점 정리.
3. **단위 만들기:** 핸들러 202종을 그대로 202행으로 쓰지 말고 **사용자가 인식하는 기능
   단위**로 묶는다(예: 같은 토글의 on/off 핸들러 2개 = 1행). 묶은 근거(원본 함수명 목록)를
   행에 적는다.
4. **react-app 대응 찾기 — 함수명이 아니라 화면에 보이는 한글 문구로 찾는다.**
   `react-app/src`에서 라벨/버튼/모달 제목 문자열을 grep, 라우트는
   `src/app/AppShellRoutes.jsx`, 계정별 분기 화면(예: `clients/ClientListPage.jsx`
   vs `clients/OwnerScopedClientsView.jsx`, `drivers/LinkedDriverClientsPage.jsx`)을 모두 확인.
5. **판정 + 증거:** §4 기준으로 분류하고 **원본 파일:줄과 react-app 파일:줄을 같은 행에**
   적는다(AGENTS §5 "단정문엔 근거 병기").

### 4. 판정 기준 (5종만 사용)
| 표기 | 의미 | 필수 증거 |
|---|---|---|
| ✅ 동등 | react-app에 같은 동작·조건·계정 범위로 있음 | 원본·react-app 파일:줄 |
| 🟡 차이 | 있으나 동작·조건·계정 범위·입력 항목이 다름 | 무엇이 어떻게 다른지 1줄 + 양쪽 파일:줄 |
| ❌ 없음 | react-app에서 대응을 못 찾음 | **찾은 방법**(grep한 문구·확인한 파일) — 못 찾은 게 아니라 정말 없는지 다른 문구로도 재확인 |
| ⚪ 승인된 제외 | 보리가 서면으로 제외를 승인한 것 | 그 서면 위치 인용(`roadmap.md`/`ui-comparison-report.md`/`STATUS.md` 줄). **서면이 없으면 ⚪를 쓰지 말고 ❓** |
| ❓ 판단 보류 | 위로 확정 못 함 | 이유 |

**금지:** (a) 서면 근거 없이 "의도적 제외/원본 설계"라고 쓰기(과거 오기록 사례),
(b) 화면 차이를 "이미 승인됨"으로 단정(STATUS `[x]` 기록이 없으면 `[x]` 아님),
(c) 조사 결과를 확정 사실처럼 기록 — 전부 **AI관찰(미확인)**이다. 보리가 확인한 것만
나중에 `[확인: YYYY-MM-DD]`를 붙인다.

### 5. 보정용 정답 (이 둘을 표에서 이렇게 판정해야 한다 — 방법이 맞는지 자가검증)
1. **기사(연동기사 본인) 거래처 고정노선** — 원본: 소속기사 화면은 읽기 전용 카드+토글 1개
   미니 모달(`client-management.js:236-271,338-369`), 단가 입력 없음. react-app: 기사 본인
   화면 `OwnerScopedClientsView.jsx`가 전체 폼 모달에서 토글+단가 입력(슬라이스 E,
   `8c2bf61`). → **🟡 차이**(구조 다름), 계정 종류 = ②.
2. **미연동 서브차량 거래처 고정노선** — 원본: 숨김(`driver-link.js:932-935`, 이유는 저장공간
   겹침). react-app: 사용 가능(sot §4-4c "그 운행일지 안에서 1곳", `c8939c2`). → **🟡 차이**,
   ⚪가 아니다(승인된 제외 서면 없음, 오히려 sot가 사용 가능으로 확정).
이 둘이 표에 없거나 다르게 판정되면 인벤토리 방법이 잘못된 것이니 방법부터 고친다.

### 6. 산출물
- **신규 파일 1개: `docs/migration-audit.md`** (표가 커서 report.md와 분리. 새 파일이라
  보리가 이 지시서를 확정하면 승인으로 본다. `docs/archive/`에는 만들지 않는다.)
- 구성: ①요약(✅/🟡/❌/⚪/❓ 개수, 계정 종류별 개수) ②화면별 표 22개 섹션 — 열: `#` /
  기능 단위 / 원본(파일:줄·함수) / 계정 종류(①~④) / react-app(파일:줄) / 판정 / 비고
  ③❌·🟡 목록만 따로 모은 "보리 확인 요청" 표 ④조사하지 못한 것(있으면).
- 큰 표라 한 파일이 200줄을 넘어도 된다(문서, §6은 코드 파일 규칙). 다만 화면 섹션별로
  끊어 읽을 수 있게 한다.
- 조사 중간에 커밋하지 않는다. 작업 파일은 워킹카피에만 둔다.

### 7. 건드릴 파일 / 안 건드릴 파일
- **건드릴 파일:** `docs/migration-audit.md`(신규)만. (`docs/report.md`는 이 지시서 자체.)
- **안 건드릴 파일:** `react-app/`의 모든 파일, 원본(`ubiquitous-parakeet/` 루트의 `*.js`·
  `index.html`), `AGENTS.md`, `docs/sot.md`(규칙 확정은 보리 확인 후), `docs/roadmap.md`·
  `STATUS.md`(결과를 어디에 반영할지는 보리 지정 후). 데이터·DB·로그인 조작 금지.

### 8. §6 200줄 / 실패 시 처리
- §6: 코드 수정 없음 → 해당 없음(위 6번 문서 예외).
- 실패 시: 새 저장소·레이어 없음(§7). 산출물 파일을 삭제하면 원상 복귀, 코드·데이터 영향 0.
- 결정이 필요하면 코드를 쓰기 전이 아니라 **조사 중 막힌 지점에서 멈추고 보리에게 질문**
  (AGENTS §11 — 무응답 시 추정 진행 금지, 질문·안전 상태를 이 파일에 기록하고 종료).

### 9. 검증 (보리)
1. 요약의 개수와 표 행 수가 맞는지.
2. §5 보정용 정답 2건이 지시대로 판정됐는지.
3. **표본 확인:** ✅ 3건·🟡 3건·❌ 3건을 골라 보리가 원본과 react-app을 브라우저로 직접
   대조(AI가 준 파일:줄이 실제로 그 동작인지). 표본에서 오판이 나오면 그 계열 전체를
   재조사한다.
4. ❌·🟡 목록을 보고 각 항목을 "고침 / 안 고침(승인된 제외로 서면 기록) / 더 조사"로 보리가
   지정한다 — 이 결정이 이후 슬라이스가 된다.

### 10. 수행 AI에게: 보고 형식
작업 끝나면 한국어(비개발자 눈높이) 3~5줄: 개수 요약, 가장 중요한 ❌·🟡 3개, 조사 못 한
범위, 표본 확인 요청. 긴 내용은 대화창이 아니라 `docs/migration-audit.md`에.
`AGENTS.md` §3 흐름대로 **보리 "검증 통과"·최종 승인 전에는 STATUS `[x]`·커밋을 하지 않는다.**
