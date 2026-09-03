# docs/report.md — 슬라이스 D: 매출 화면 "기사" 탭 개별 기사 드롭다운

> Step마다/슬라이스마다 리셋되는 착수지시서·실사 보고서 통합 파일이다(AGENTS.md §12).
> 배경은 `docs/audit.md`의 "Step 9 ① 매출 연동 — 신규 요청 조사"(2026-09-03) 및
> "Step 9 ① 슬라이스 C 최종 완료" 절 참고. Step 9의 ①(기사관리 대리작성: 슬라이스
> A/B/C 완료) + ②(소속기사 로그인/employerLink: 슬라이스 E, 차량 등록 모달 목업:
> 슬라이스 F) 모두 커밋·푸시까지 완료됨. 이번은 그 다음 백로그 항목인 원래
> 슬라이스 D — "차주가 여러 기사 중 하나를 골라보는" 기능.

## 0. DB 작업

**없음.** 순수 클라이언트 UI 필터링 작업 — Store에 이미 있는 데이터(슬라이스
A로 `workLogs[ownerKey][logId]`에 기사 차량별 일지가 이미 들어있음)를
화면단에서 필터링만 한다. 새 테이블·RPC·RLS 정책 불필요, 새 DB 쓰기 없음
(순수 읽기/파생 화면).

## 1. 감시관 착수지시서 (2026-09-03)

### 배경 (보리 요청 원문 요지)
"매출" 화면(월 매출/년 매출)의 "전체 손익 / 차주 / 기사" 3탭 중 "기사" 탭이
현재는 연동된 기사(서브 차량) 전체를 합산해서 하나로 보여준다. 보리 요청:
기사가 여러 명일 때 "기사" 탭에 드롭다운을 붙여서 — **기본값은 지금처럼
전체 기사 합산**, 드롭다운을 열면 **개별 기사 한 명씩 골라서 그 기사만의
손익을 볼 수 있게** 한다. (스크린샷으로 매출 화면의 "기사" 탭 위치를 직접
지목해 확인함 — `components/revenue/OwnerRevenueView.jsx`의 `SCOPES` 중
`{ value: 'driver', label: '기사' }` 탭이 대상.)

### 감시관 사전 조사 결과 (착수 전 코드 확인, 코드 작성 없음)
- `domain/financeOwnerDetail.js`의 `getOwnerMonthlyFinanceDetail(monthKey,
  scope, settings, workDataByLogId, expenses)`는 `scope==='driver'`일 때
  `settings.cars`에서 `type==='sub'`인 차량 전부(`subCarsInScope`)를 루프
  돌아 합산한다 — **이 함수 자체는 건드릴 필요가 전혀 없다.** `settings.cars`를
  호출 전에 한 대로 미리 걸러서 넘기면, 이 함수는 자동으로 그 한 대만
  계산한다.
- 슬라이스 C-2에서 이미 정확히 이 용도의 함수가 만들어져 있다:
  `components/revenue/driverRevenueScope.js`의 `scopeSettingsToVehicle(settings,
  vehicleNumber)`(→ `settings.cars`를 그 차량번호 하나로 필터)와
  `scopeWorkDataToVehicle(workDataByLogId, vehicleNumber)`(→
  `{ [vehicleNumber]: data }` 형태로 축소). **이번 슬라이스는 이 두 함수를
  그대로 재사용한다 — 새 필터링 로직을 복제하지 않는다.**
- `components/revenue/OwnerMonthlyCards.jsx`는 `scope`를 "기사 급여" 행
  노출 여부(`scope !== 'owner'`)에만 쓰고, 기사 개인 식별 정보는 전혀
  참조하지 않는다 — **이 컴포넌트는 무변경.** `detail`에 이미 스코프된
  숫자만 들어오면 그대로 렌더된다.
- 기사 목록은 `OwnerRevenueView.jsx`가 이미 `useOwnerDrivers(ownerKey)`로
  `drivers`를 가져오고 있다(27~30행 부근) — 추가 훅 불필요. `status===
  'linked'`이고 `vehicleNumber`가 있는 기사만 드롭다운 후보로 쓴다(1
  차량=1기사 규칙은 `drivers.js`의 `upsertDriver`가 이미 보장).
- 이 앱의 기존 드롭다운 관례는 네이티브 `<select>`다(Step 7에서 커스텀
  Portal 드롭다운 대신 네이티브로 확정된 바 있음) — 새 커스텀 드롭다운
  컴포넌트를 만들지 말고 네이티브 `<select>`를 쓸 것.

### 대상 코드 (감시관이 직접 확인)
`src/components/revenue/OwnerRevenueView.jsx` (현재 106줄, 유일한 변경
파일):
- 12~16행 `SCOPES` 배열: 무변경.
- 72~83행 `revenue-scope-tabs` div(탭 3개 렌더): 무변경.
- 이 div 바로 아래, `scope === 'driver'`이고 연동된(linked) 기사가 1명
  이상일 때만 렌더되는 `<select>` 드롭다운을 새로 추가.
- 41~44행 `monthly` useMemo와 46~53행 `yearlyRows` useMemo 양쪽 모두에
  선택된 기사 차량번호에 따라 `settings`/`workDataByLogId`를 스코프해서
  `getOwnerMonthlyFinanceDetail`에 넘기도록 수정(연/월 두 뷰 모두 동일하게
  적용 — 한쪽만 하면 안 됨).

### 기대 동작
1. "기사" 탭 최초 진입 시 기본값 = 전체 기사 합산(현재와 동일한 화면).
2. 연동된 기사가 1명 이상이면 탭 아래에 `<select>` 드롭다운 노출. 첫 옵션
   "전체 기사 합산"(선택 시 필터 없음, 현재 동작과 동일), 그 아래 연동된
   기사 각각을 "이름(차량번호)" 형식으로 나열.
3. 특정 기사를 선택하면 `scopeSettingsToVehicle`/`scopeWorkDataToVehicle`로
   그 기사의 차량 하나만 걸러서 `getOwnerMonthlyFinanceDetail(..., 'driver',
   scopedSettings, scopedWorkData, expenses)`에 넘기고, 그 결과만 카드에
   표시된다(월 매출/년 매출 둘 다).
4. 연동된 기사가 0명이면 드롭다운 자체를 노출하지 않는다 — 현재 동작(빈
   합계) 그대로 유지.
5. 기사 목록이 바뀌어(연동 해제 등) 선택돼 있던 차량번호가 더 이상 연동
   목록에 없으면, 선택을 "전체 기사 합산"으로 되돌린다(빈 화면으로 방치하지
   않을 것).

### Explicit Out-of-Scope (이번 라운드)
- `domain/financeOwnerDetail.js`, `domain/financeCore.js` — 계산 엔진
  무변경.
- `components/revenue/OwnerMonthlyCards.jsx` — 무변경.
- `components/revenue/DriverRevenueView.jsx`(기사 본인 로그인 매출 화면,
  슬라이스 C-2로 이미 본인 차량만 보이게 완료됨) — 이번 건과 무관, 무변경.
- `components/revenue/driverRevenueScope.js` — 기존 함수 재사용만, 함수
  자체 수정 없음(수정이 필요해 보이면 착수 전 감시관에게 먼저 보고).
- 차주/기사 역할전환, 게스트 관련 로직 — 이번 슬라이스와 무관.

### 실패 처리 방식
해당 없음에 가까움 — 이번 작업은 서버 쓰기가 전혀 없는 순수 클라이언트
필터링/파생 화면이다. 실패 모드 자체가 새로 생기지 않는다(§0-1 A/B와
무관 — 신규 durable/retry 레이어 대상 아님).

### 사용자 승인 근거
- 2026-09-03, 보리: "원래 슬라이스 D(차주 화면 기사별 드롭다운)" 선택 →
  스크린샷으로 매출 화면 "기사" 탭 위치 직접 지목 → 감시관 확인 질문(드롭다운
  구성/기본값) → "맞아 그렇게 진행하는거 기본이 전체 기사 합산이고 클릭하면
  드롭다운형식에 개별기사 한명씩볼수잇게"로 최종 확정.

### 착수 전 작업자 확인 요청 사항
1. `OwnerRevenueView.jsx`의 `monthly`/`yearlyRows` 두 useMemo 모두에
   동일하게 스코프 로직을 적용할 것 — 한쪽만 적용하는 실수 주의.
2. 드롭다운 옵션 정렬 순서(등록 순/이름순 등)는 작업자 재량이되, "전체 기사
   합산"이 항상 첫 옵션일 것.
3. 이 파일이 이번 추가로 200줄을 넘을지 미리 가늠 — 넘을 것 같으면 착수 전
   분리설계안 보고(§3 절차, 임의 진행 금지). 현재 106줄 + 드롭다운
   JSX·상태·스코프 로직 추가분을 감안하면 넘지 않을 가능성이 높지만 확정은
   아님.
4. 가능하면 `driverRevenueScope.js`의 기존 순수 함수를 그대로 쓰는
   필터링 동작을 검증하는 가벼운 테스트 1~2개 추가(과한 신규 테스트
   인프라는 불필요 — 기존 `driverRevenueScope.test.js` 패턴 참고).

## 2. 작업자 Phase 1 보고
(2026-09-03, 작업자)

### 시작 전 상태
- `react-app` HEAD `192ebe6`(E/F 커밋), 미커밋: 매출 C-2 잔여(`DriverRevenueView`/`driverRevenueScope` 등) — **슬라이스 D는 `OwnerRevenueView`(+기존 scope 함수 재사용)만**.
- `OwnerRevenueView.jsx` 106줄 → 드롭다운·스코프 추가 후 **약 155줄**(200줄 이하, 분리 불필요).

### 확인
1. `monthly`/`yearlyRows` 둘 다 `financeSettings`/`financeWork` 공유 스코프 적용.
2. 드롭다운: 첫 옵션 "전체 기사 합산", 이하 linked+vehicleNumber 기사 `이름(차량번호)`.
3. 선택 차량이 목록에서 사라지면 `useEffect`로 전체 합산으로 복귀.
4. `scopeSettingsToVehicle`/`scopeWorkDataToVehicle` 재사용, finance 엔진·OwnerMonthlyCards 무변경.

착수·구현 완료 → §3.

## 3. 작업자 구현 완료 보고
(2026-09-03)

### 변경 파일
| 파일 | 줄 | 내용 |
|---|---:|---|
| `components/revenue/OwnerRevenueView.jsx` | 155 | 기사 탭 native `<select>` + 월/년 동일 스코프 |
| `side-menu.css` | — | `.revenue-driver-select` |
| `components/revenue/driverRevenueScope.test.js` | — | 슬라이스 D용 필터 테스트 1건 추가 |

### 검증
- `node --test src/components/revenue/driverRevenueScope.test.js` → **3 pass**
- 해당 파일 typecheck 신규 에러 없음(테스트 assert 보강 후)
- 커밋/푸시 미실행

---

## 4. 감시관 Phase 2 실사 및 최종 판정 (2026-09-03)

### 실사 방법
`OwnerRevenueView.jsx`, `driverRevenueScope.test.js`, `side-menu.css`(해당
클래스) 전량 직접 읽음. 아울러 `domain/financeOwnerDetail.js`,
`domain/financeCore.js`, `components/revenue/OwnerMonthlyCards.jsx`,
`components/revenue/DriverRevenueView.jsx`, `components/revenue/
driverRevenueScope.js`(함수 본체)의 수정시각(mtime)을 직접 조회해 **전부
무변경임을 확인** — 착수지시서의 Out-of-Scope가 그대로 지켜졌다.

### 확인 결과
1. **계산 엔진 무변경**: `financeOwnerDetail.js`/`financeCore.js` mtime
   무변경 확인. `getOwnerMonthlyFinanceDetail` 시그니처·로직 그대로.
2. **기존 함수 재사용, 신규 복제 없음**: `driverRevenueScope.js`(함수 정의
   파일) mtime 무변경 — `scopeSettingsToVehicle`/`scopeWorkDataToVehicle`를
   수정 없이 그대로 import해 사용(`OwnerRevenueView.jsx` 12행).
3. **월/년 두 뷰 모두 스코프 적용**: `monthly`(67~70행)·`yearlyRows`
   (72~79행) 두 useMemo 모두 동일한 `financeSettings`/`financeWork`를
   참조 — 착수지시서에서 특히 강조했던 "한쪽만 적용하는 실수"가 없음.
4. **기본값·드롭다운 구성**: `driverVehicle` 초기값 `ALL_DRIVERS`(`''`,
   전체 합산) 확인. `<select>` 첫 옵션 "전체 기사 합산"(119행), 이후
   linked+vehicleNumber 기사만 "이름(차량번호)" 형식으로 나열(120~128행) —
   보리가 확정한 사양과 정확히 일치.
5. **네이티브 `<select>` 사용**: 커스텀 드롭다운 컴포넌트 신설 없음, 기존
   `.input-box` 클래스 재사용(113행) — 프로젝트 관례 준수.
6. **0명일 때 드롭다운 숨김**: `showDriverSelect = scope === 'driver' &&
   linkedDrivers.length > 0`(82행) — 정확히 지시대로.
7. **연동 해제 시 자동 복귀**: `useEffect`(51~55행)가 `driverVehicle`이
   더 이상 `linkedDrivers`에 없으면 `ALL_DRIVERS`로 되돌림 — 착수지시서
   기대 동작 5번과 정확히 일치, 빈 화면 방치 없음.
8. **부수 개선(지시에 없었지만 타당함)**: `OwnerMonthlyCards`의 `key`에
   `driverVehicle`을 포함(134행)해, 기사 전환 시 상세 접이식 행이 이전
   선택의 펼침 상태를 그대로 들고 있지 않도록 함 — 사이드 이펙트 없는 UX
   보강으로 판단, 문제 없음.
9. **CSS**: `side-menu.css`에 `.revenue-driver-select`/`.revenue-driver-
   select .input-box` 존재 확인 — 드롭다운이 스타일 없이 날것으로 뜨는
   문제 없음.
10. **줄 수**: `OwnerRevenueView.jsx` 실측 154줄(트레일링 개행 포함
    155) — 작업자 보고 155와 일치, 200줄 이내.
11. **테스트**: `driverRevenueScope.test.js`에 슬라이스 D용 테스트 1건
    추가(57~64행) — 기존 C-2 테스트와 같은 실제 fixture(`FIXTURE_SETTINGS`/
    `FIXTURE_WORK`) 기반 진짜 테스트(허위 아님). 다만 이 테스트는
    `scopeSettingsToVehicle`/`scopeWorkDataToVehicle` 함수 자체(이미 C-2로
    검증됨)만 재확인할 뿐, `OwnerRevenueView.jsx`의 신규 UI 로직(드롭다운
    렌더 조건, 연동 해제 시 자동 복귀 `useEffect`)에 대한 컴포넌트 테스트는
    없다 — 슬라이스 F 때와 동일한 성격의 얕음이며, 이 프로젝트의 기존
    테스트 관례(무거운 컴포넌트 테스트 인프라를 매번 새로 만들지 않음)에는
    부합한다. **차단 사유 아님, 참고로만 기록.**
12. **범위 밖 미침범**: `financeOwnerDetail.js`/`financeCore.js`/
    `OwnerMonthlyCards.jsx`/`DriverRevenueView.jsx`/`driverRevenueScope.js`
    함수 본체 — 전부 mtime 무변경으로 직접 확인.
13. **절차 준수**: 위 §3이 "커밋/푸시 미실행"·"(감시관 Phase 2 실사
    대기)"에서 정확히 멈춰 있고, 작업자가 감시관 판정 절을 대신 쓰지
    않았다 — 계속 준수되고 있음.

### 최종 판정: **[PASS]**
계산 엔진(`financeOwnerDetail.js`)을 전혀 건드리지 않고, 슬라이스 C-2의
기존 스코프 함수를 그대로 재사용해 신규 로직 복제 없이 구현했다. 보리가
확정한 사양(기본값 전체 합산, 드롭다운으로 개별 기사 선택, 0명일 때 숨김,
연동 해제 시 자동 복귀)이 정확히 반영됐고, 월/년 두 뷰 모두 일관되게
적용됐다. DB 작업·서버 쓰기가 없는 순수 클라이언트 필터링이라 신규
durable/retry 레이어 문제도 발생하지 않는다(§0-1 A/B 해당 없음). 200줄
규칙 준수. 커밋/푸시는 보리 승인 후 §2 절차(감시관 커밋 지시서 작성 →
작업자 커밋 실행 후 report.md 기록 → 보리 푸시)대로 진행.

---

## 5. 보리 브라우저 실검증 — 발견 사항 및 보완 지시서 (2026-09-03)

코드 리뷰 [PASS] 직후 보리가 직접 브라우저에서 확인, 스크린샷 2장에 직접
주석 표시(X, 동그라미)해 문제 3건을 지적했다. **§4의 [PASS]는 코드 검증
기준으로는 유효하지만, 실제 화면 동작 사양이 미확정이었던 부분(1, 2번)이
브라우저 검증에서 드러났다 — 커밋 전 아래 3건 보완 필요.**

### 발견 사항 1 — 기사를 아예 등록 안 했으면 "기사" 탭 자체를 숨길 것
현재는 `SCOPES` 3개 탭(전체 손익/차주/기사)이 항상 고정 렌더된다. 보리
요청: 기사(서브 차량)를 하나도 등록 안 했으면 "기사" 탭 자체가 안 보이고
"전체 손익"/"차주" 2개만 보여야 한다.
- 판단 기준은 `useOwnerDrivers`가 아니라 **`cars`(이미 `useOwnerCars`로
  가져오고 있음)에 `type === 'sub'`인 차량이 하나라도 있는지**로 할 것 —
  이 앱에서 "기사 등록"은 곧 "서브 차량 등록"(`CarFormModal`의 "기사 등록"
  모달)을 의미하고, "기사" 탭이 실제로 합산하는 데이터(`financeOwnerDetail.js`의
  `subCarsInScope`)도 `type==='sub'` 차량 기준이지 `drivers[]`/연동 상태
  기준이 아니기 때문 — 연동(초대) 안 된 서브 차량이라도 그 차량의 매출
  데이터는 존재할 수 있으므로, `linkedDrivers` 기준으로 탭을 숨기면 실제
  있는 데이터가 화면에서 사라지는 역효과가 생긴다.
- 현재 `scope==='driver'`인 상태에서 마지막 서브 차량이 삭제되는 등으로
  탭이 사라지는 경우, `scope`를 유효한 다른 값(예: `'owner'`)으로
  되돌릴 것 — `driverVehicle` 리셋과 동일한 방어 패턴.

### 발견 사항 2 — 기사가 1명일 때도 드롭다운 불필요
착수지시서 원문에 "연동된 기사가 1명 이상이면 드롭다운 노출"이라고 썼던
부분이 보리 의도와 달랐다(감시관 실수 — 애초에 명확히 안 정해두고 넘어간
부분). 정정: **연동된 기사가 2명 이상일 때만** 드롭다운을 보여준다. 1명뿐이면
"전체 기사 합산"과 "그 기사 1명"이 사실상 같은 데이터라 선택지가 무의미하다.
- `showDriverSelect` 조건을 `linkedDrivers.length > 0` → `linkedDrivers.length
  > 1`로 수정.
- (기사가 정확히 1명뿐일 때는 지금처럼 드롭다운 없이 "기사" 탭 = 그 1명의
  손익이 자동으로 보이면 된다 — 별도 처리 불필요, `financeOwnerDetail.js`가
  `subCarsInScope` 전체를 합산하는데 서브 차량이 1대뿐이면 결과가 이미 그
  1명 손익과 같다.)

### 발견 사항 3 — 드롭다운 화살표 아이콘을 기존 "▷" 아이콘과 통일
보리가 스크린샷에서 `<select>`의 기본 브라우저 화살표(▽)와, 그 아래
"미입금 운송료(0건)" 옆의 ">" 아이콘을 비교하며 "같은 류로 통일"을 요청.
후자는 `components/revenue/OwnerMonthlyCards.jsx`의 `revenue-detail-chevron`
클래스 — 감시관이 직접 CSS 확인: `<svg viewBox="0 0 24 24"><polyline
points="9 18 15 12 9 6"></polyline></svg>`, `stroke: currentColor`,
`stroke-width: 2`, `stroke-linecap/linejoin: round`, 16×16px,
`.revenue-detail-head.expanded .revenue-detail-chevron { transform:
rotate(90deg); }`(펼쳐지면 90도 회전해 아래를 향함).
- **`<select>` 자체는 계속 네이티브로 유지**(프로젝트 관례, 접근성 유지) —
  다만 브라우저 기본 화살표는 `appearance: none`(관련 벤더 프리픽스 포함)으로
  숨기고, 그 자리에 위 `revenue-detail-chevron`과 동일한 stroke 스타일의
  얇은 폴리라인 쉐브론 아이콘을 CSS 배경 이미지 또는 겹쳐진 아이콘 요소로
  넣어서 시각적으로 통일할 것. 새 커스텀 드롭다운 위젯을 만들라는 뜻이 아님
  — 순수 CSS 스타일링 문제.
- 정확한 구현 방식(배경 이미지 SVG data URI vs 절대 위치 아이콘 겹치기)은
  작업자 재량, 단 위 stroke 사양(두께 2, round cap/join, `--sub-text-color`
  계열 색)과 시각적으로 어긋나지 않을 것.

### 착수 전 작업자 확인 요청 사항 (보완분)
1. 발견 사항 1의 탭 숨김 기준(`cars`의 `type==='sub'` 존재 여부)과 발견
   사항 2의 드롭다운 기준(`linkedDrivers.length > 1`)이 서로 다른 데이터
   소스를 쓴다는 점을 착오 없이 반영할 것 — 하나로 통일하지 말 것(위 근거
   참고).
2. 세 가지 수정 모두 `OwnerRevenueView.jsx`(+ CSS) 안에서 끝나는지 재확인.
   200줄 재초과 여부 다시 확인.
3. 기존 §4 실사에서 확인했던 항목(계산 엔진 무변경, 월/년 동일 스코프,
   연동 해제 시 자동 복귀 등)이 이번 수정으로 깨지지 않는지 스스로 재확인
   후 보고할 것.

## 6. 작업자 보완 완료 보고 (2026-09-03, §5 대응)

### 변경
| # | 내용 | 구현 |
|---|---|---|
| 1 | 서브 차량 없으면 「기사」탭 숨김 | `hasSubCar`(cars `type==='sub'`) → `visibleScopes`. `scope==='driver'`인데 탭 사라지면 `owner`로 리셋 |
| 2 | 드롭다운은 연동 기사 **2명 이상**만 | `showDriverSelect = scope==='driver' && linkedDrivers.length > 1` |
| 3 | select 화살표 = detail chevron과 동일 | native select 유지, `appearance:none` + `revenue-driver-select-chevron`(polyline 9 18 15 12 9 6, stroke 2, rotate 90°) |

### 재확인(§4 유지)
- 월/년 동일 `financeSettings`/`financeWork` 스코프 유지
- 연동 해제 시 `driverVehicle` → 전체 합산 유지
- finance 엔진·OwnerMonthlyCards·driverRevenueScope 함수 본체 무변경
- `OwnerRevenueView.jsx` 줄 수: ~175(<200)

### 검증
- `driverRevenueScope.test.js` 3 pass (회귀)
- 커밋/푸시 미실행

---

## 7. 감시관 재실사 — 원인 규명 및 재수정 지시서 (2026-09-03)

### 보리 재확인 보고
"기사차량 두대로 늘려도 드롭다운이 안나와" (기사 미등록 시 탭 숨김은
정상 동작 확인).

### 원인 규명 (감시관, 코드 직접 확인 — 작업자 구현 결함 아님)
§5 지시서 자체가 잘못됐다 — **감시관의 설계 오류**, 작업자는 그 지시를
정확히 그대로 구현했다(§6 확인).

`domain/drivers.js` 70행: 기사를 신규 등록하면(`upsertDriver`) 항상
`status: 'pending'`으로 생성된다. `'linked'`로 바뀌는 시점은 그 기사 본인이
별도 계정으로 로그인해 초대코드를 실제로 redeem한 뒤(슬라이스 E)뿐이다.
즉 **보리가 차주 계정 하나로 서브 차량(기사) 2대를 등록해서 테스트하면,
두 기사 모두 영구히 `status==='pending'`** — `linkedDrivers.length`가
0으로 고정되니 드롭다운이 몇 대를 등록하든 절대 안 뜬다. §5의
`showDriverSelect = ... && linkedDrivers.length > 1` 조건 자체가 실사용
동선과 맞지 않았다.

더 결정적으로: `financeOwnerDetail.js`의 `subCarsInScope`(기사 탭 합산
대상)는 애초에 `status`를 전혀 보지 않고 `settings.cars`에서
`type==='sub' && isVehicleRevenueSharedWithOwner(car)`인 차량을 전부
합산한다 — **"전체 기사 합산"에는 이미 연동 안 된(pending) 기사 차량도
다 들어가고 있는데, 개별 선택 드롭다운만 "연동된" 기사로 좁혀놓은
자기모순**이었다. 슬라이스 D 최초 설계(§1)에서 감시관이 드롭다운 후보를
`drivers[]`(연동 여부)로 잡은 것 자체가 잘못 — 계산 엔진과 다른 데이터
소스를 썼다.

### 재수정 지시 — 데이터 소스 통일
드롭다운·기사 탭 숨김·계산 엔진 셋 다 **동일한 기준**으로 통일한다:
`cars`에서 `type==='sub' && isVehicleRevenueSharedWithOwner(car)`인 차량
(`domain/cars.js`의 기존 함수 재사용 — `financeOwnerDetail.js`가 쓰는 것과
동일 함수, 신규 로직 아님).

1. `subCars = cars.filter(car => car?.type === 'sub' &&
   isVehicleRevenueSharedWithOwner(car))`로 새로 정의(useMemo).
2. `hasSubCar`(탭 숨김 기준)를 `subCars.length > 0`으로 교체 — 기존
   `cars.some(type==='sub')`보다 정확해짐(revenue 공유 꺼둔 차량은 애초에
   기사 탭에 표시할 데이터가 없으므로).
3. `showDriverSelect`을 `scope==='driver' && subCars.length > 1`로 교체 —
   `linkedDrivers` 대신 `subCars` 기준.
4. 드롭다운 옵션을 `subCars.map(car => ...)`로 교체. 표시 이름은
   `car.driverName`(이미 차량 등록 시점에 저장되는 필드, `CarFormModal.jsx`
   74~80행 부근) 사용 — `이름 없으면 '기사'` 폴백. **`drivers[]`/연동
   상태와 완전히 무관하게 만들 것.**
5. `driverVehicle` 자동 리셋 `useEffect`도 판단 기준을 `linkedDrivers` →
   `subCars`(차량번호 존재 여부)로 교체 — 차량 삭제/타입 변경 시에만
   리셋, 연동 여부와 무관.
6. `useOwnerDrivers`/`linkedDrivers`가 이 컴포넄트에서 더 이상 필요
   없으면 죽은 코드로 남기지 말고 제거(필수는 아니나 권장).
7. `isVehicleRevenueSharedWithOwner`는 `domain/cars.js`에서 import(이미
   `financeOwnerDetail.js`가 쓰는 것과 동일 export) — 새 함수 작성 금지.

### 착수 전 작업자 확인 요청 사항
1. 이 변경으로 §4/§6에서 확인했던 나머지 항목(월/년 동일 스코프, 화살표
   아이콘 통일, 200줄, 계산 엔진 무변경)이 깨지지 않는지 재확인.
2. `isVehicleRevenueSharedWithOwner` import 경로(`domain/cars.js`)와
   `financeOwnerDetail.js`가 실제로 쓰는 import를 대조해 동일 함수인지
   재확인(다른 이름의 유사 함수가 있다면 즉시 보고).

### 작업자 착수 전 확인 (답)
1. 유지 항목: 월/년 동일 `financeSettings`/`financeWork` 스코프, chevron CSS 무변경,
   `financeOwnerDetail`/`financeCore`/`driverRevenueScope` 본체 무변경, 줄 수 <200.
2. import 대조: `financeOwnerDetail.js` → `from './cars.js'` =
   `OwnerRevenueView` → `from '../../domain/cars.js'` — **동일 export**.
   유사 이름 다른 함수 없음.

## 8. 작업자 재수정 완료 보고 (2026-09-03, §7 대응)

### 변경 (`OwnerRevenueView.jsx`만)
| # | 내용 | 구현 |
|---|---|---|
| 1 | `subCars` | `cars.filter(type==='sub' && isVehicleRevenueSharedWithOwner)` |
| 2 | 탭 숨김 | `hasSubCar = subCars.length > 0` |
| 3 | 드롭다운 노출 | `showDriverSelect = scope==='driver' && subCars.length > 1` |
| 4 | 옵션 소스 | `subCars` + `car.driverName`/`car.number` (drivers[] 무관) |
| 5 | 자동 리셋 | `subCars`에 차량번호 없으면 `ALL_DRIVERS` |
| 6 | 죽은 코드 | `linkedDrivers` 제거. `useOwnerDrivers`는 `buildFinanceSettings` 의존용으로 유지 |

### 검증
- `OwnerRevenueView.jsx` ~172줄 (<200)
- chevron / 월·년 스코프 / 엔진 무변경
- `driverRevenueScope.test.js` 3 pass
- 커밋/푸시 미실행

---

## 9. 감시관 재실사 및 최종 판정 (2026-09-03)

### 실사 방법
`OwnerRevenueView.jsx` 전량 재대조. `domain/cars.js`,
`domain/financeOwnerDetail.js`, `domain/financeCore.js`,
`components/revenue/OwnerMonthlyCards.jsx`,
`components/revenue/DriverRevenueView.jsx`,
`components/revenue/driverRevenueScope.js`/`.test.js`의 수정시각을 직접
재조회해 이번 라운드에도 **`OwnerRevenueView.jsx` 단 하나만 변경**됐음을
확인.

### 확인 결과
1. `subCars = cars.filter(car => car?.type==='sub' &&
   isVehicleRevenueSharedWithOwner(car))`(47~52행) — `domain/cars.js`에서
   import(5행), `financeOwnerDetail.js`가 쓰는 것과 동일 함수. 새 함수
   작성 없음.
2. 탭 숨김(`hasSubCar`, 54행)·드롭다운 노출(`showDriverSelect`, 95행)·
   드롭다운 옵션(133~141행)·자동 리셋(64~68행) **넷 다 `subCars` 하나로
   통일** — §7에서 지적한 "데이터 소스 이원화" 문제 해소 확인.
3. 드롭다운 표시 이름이 `car.driverName`(135행) — `drivers[]`/연동 상태와
   완전히 무관, 계산 엔진(`subCarsInScope`)과 정확히 같은 대상 집합.
4. `useOwnerDrivers`/`drivers`는 제거되지 않고 `settings` useMemo의
   `buildFinanceSettings` 의존성 목록(41행 `void drivers`)에만 남아있음 —
   죽은 코드 아님, 정당한 유지.
5. 계산 엔진·`OwnerMonthlyCards.jsx`·`DriverRevenueView.jsx`·
   `driverRevenueScope.js`(함수 본체) — 전부 mtime 무변경 재확인.
6. 화살표 아이콘(`revenue-driver-select-chevron`, 143~145행) 무변경 유지.
7. 줄 수 실측 170줄(트레일링 개행 포함 171) — 작업자 보고 "~172"와 근접,
   200줄 이내.

### 보리 브라우저 실검증
"확인해줘 브라우저 테스트 정상이야" — 기사 차량 2대 등록 시 드롭다운 정상
노출 확인(2026-09-03).

### 최종 판정: **[PASS]**
§7 재수정 지시(탭 숨김·드롭다운 노출·후보 목록·계산 엔진을 전부
`subCars`로 통일)가 정확히 반영됐고, 보리의 실제 브라우저 검증으로도
확인됐다. 계산 엔진·타 컴포넌트 무변경 유지, 200줄 이내. 이번 라운드를
포함해 슬라이스 D 전체(§1~9) 완료 — 커밋/푸시는 보리 승인 후 §2 절차
(감시관 커밋 지시서 → 작업자 커밋 실행 후 report.md 기록 → 보리 푸시)대로
진행.

---

## 10. 감시관 → 작업자 커밋 지시서 (2026-09-03)

> 근거: 슬라이스 D 전체(§1~9) 감시관 교차검증 [PASS] + 보리 브라우저
> 실검증 완료 + 보리 승인("응 작성해줘", 2026-09-03). AGENTS.md §2
> 절차에 따라 감시관이 이 지시서를 작성하고, **보리가 작업자에게 전달**,
> 작업자가 아래 범위·메시지로 커밋 실행 후 **완료 보고를 이 절 바로
> 아래에 직접 작성**한다(§2 최신 절차 — 채팅으로만 보고하지 말 것).
> **push는 이 지시서에 포함되지 않는다 — 절대 실행하지 말 것.** 클린업
> 목적의 임의 reset/checkout/clean/stash도 금지.

### 10-1. 저장소 A: `react-app`

**⚠️ 주의**: 지난 슬라이스 E+F 커밋(`192ebe6`) 이후에도 "매출 C-2" 잔여
미커밋 변경(`RevenuePage`/`DriverRevenueView`/`ownerDataHooks`/
`driverRevenueScope*` 등, §2 시작 전 상태 메모 참고)이 작업 트리에 남아
있을 수 있다. **`git add -A`/`git add .` 절대 금지** — 아래 파일만 개별
경로로 `git add`할 것.

**커밋 전 필수 절차**: `git status --short`(또는 `git diff --stat`) 결과를
`docs/report.md`의 이 절 아래(작업자 완료 보고에 포함)에 먼저 남겨, 아래
목록과 실제 변경 파일이 일치하는지 — 매출 C-2 관련 파일이 섞여 있지 않은지
— 확인한 뒤에 `add`/`commit`을 실행할 것.

**포함 대상(슬라이스 D 전 라운드에서 변경된 파일 전부 — 감시관이 매 라운드
mtime으로 직접 확인함)**:
- `src/components/revenue/OwnerRevenueView.jsx`
- `src/components/revenue/driverRevenueScope.test.js`(슬라이스 D용 테스트
  1건 추가분 — 함수 정의 파일인 `driverRevenueScope.js` 자체는 무변경이라
  이 목록에 없음)
- `src/side-menu.css`(`.revenue-driver-select`,
  `.revenue-driver-select .input-box`, `.revenue-driver-select-chevron`
  등 슬라이스 D 관련 클래스만 — 이 파일은 슬라이스 F 때도 수정됐었지만
  그 변경은 이미 `192ebe6`으로 커밋됨. 만약 side-menu.css에 매출 C-2 관련
  미커밋 스타일도 섞여 있다면 임의로 판단하지 말고 보리에게 먼저 확인받을
  것.)

**정정(2026-09-03, 작업자 지적으로 발견)**: `src/components/revenue/
driverRevenueScope.js`를 위 목록에서 빠뜨렸었다 — 감시관이 "슬라이스 D
라운드 중 무변경"과 "이미 커밋됨"을 혼동한 지시서 오류. 실제로는 이
파일이 git에 한 번도 커밋되지 않은 채(`??` untracked) 작업 트리에만
존재하며, 그 위에서 `OwnerRevenueView.jsx`와
`driverRevenueScope.test.js`가 이를 import하므로 이 파일 없이 커밋하면
클론/빌드가 즉시 깨진다. 감시관이 파일 내용을 직접 확인 —
`phoneDigits`/`resolveDriverVehicleNumber`/`scopeSettingsToVehicle`/
`scopeWorkDataToVehicle` 순수 함수 4개뿐, 부작용 없음, C-2 UI 파일
(`RevenuePage.jsx`/`DriverRevenueView.jsx`/`ownerDataHooks.js`)에 대한
참조 전혀 없음 — 이번 커밋에 포함해도 안전하다고 판단, **포함 대상에
추가한다**:
- `src/components/revenue/driverRevenueScope.js` (신규 추가 — 위 사유)

**2차 정정(2026-09-03, 작업자가 요청한 `git status --short` 확인 중
감시관이 발견)**: 지시서상 제외 대상이던 `src/store/ownerDataHooks.js`가
`M`(수정, 미커밋) 상태였다. `OwnerRevenueView.jsx`가 이 파일의
`useOwnerCars`/`useOwnerDrivers`/`useOwnerExpenses`/`useOwnerProfile`/
`useOwnerSettings`/`useOwnerWorkDataByLogId` 6개 훅을 import하므로,
작업자에게 `git diff HEAD -- src/store/ownerDataHooks.js` 전체를
요청·대조(§10-4 보강 참고). 결과: 6개 심볼 자체는 전부 이미 HEAD에
존재(신규 추가 아님)하지만, 그중 **`readOwnerWorkDataByLogId`/
`useOwnerWorkDataByLogId`의 본체가 실제로 바뀌어 있었다** — HEAD는
`{ main: readOwnerWorkData(ownerKey) }`(main 차량만 반환)인데 반해 작업
트리는 `workLogs[ownerKey]` 전체(서브 차량 로그 포함)를 반환하도록 이미
고쳐져 있음. `src/store/ownerDataHooks.test.js`(마찬가지로 미커밋)를
감시관이 직접 읽어 이 차이를 검증하는 진짜 회귀 테스트("sub logIds are
included and raise all/driver fare")임을 확인. 즉 이 수정이 빠지면
Slice D의 드롭다운뿐 아니라 **"기사" 탭 자체(기존 전체 합산 기본값
포함)가 HEAD 기준으로는 항상 0/빈 값**이 된다 — 지금까지의 모든 브라우저
검증은 이 미커밋 수정이 이미 적용된 작업 트리 위에서 이뤄진 것.
diff 자체는 이 함수 하나(+상수 하나)만 바꾸며 C-2 UI 파일 참조 없음 —
안전 확인. 보리 승인("알겟어") 확보 — **포함 대상에 추가한다**:
- `src/store/ownerDataHooks.js` (Slice C 당시 shipped된
  `readOwnerWorkDataByLogId`의 사후 버그 수정 — Slice D "기사" 탭의 하드
  디펜던시)
- `src/store/ownerDataHooks.test.js` (위 수정을 검증하는 회귀 테스트)

**최종 포함 대상 확정(6개 파일)**: OwnerRevenueView.jsx,
driverRevenueScope.test.js, driverRevenueScope.js, side-menu.css,
store/ownerDataHooks.js, store/ownerDataHooks.test.js.

**제외 기준**: 위 6개 목록에 없는 파일, 특히 매출 C-2 UI 잔여
(`RevenuePage.jsx`, `DriverRevenueView.jsx` — `ownerDataHooks.js`는 위
2차 정정으로 포함 대상 이동), `scripts/*.mjs`, 빌드/테스트 로그 산출물
(`*.txt`), `supabase/.temp/`, `node_modules`, `dist` — 전부 제외.

**커밋 메시지 (한국어, 작업자가 그대로 사용)**:
```
feat: 매출 화면 "기사" 탭에 개별 기사 선택 드롭다운 추가(슬라이스 D)

- 기본값은 기존과 동일한 전체 기사(서브 차량) 합산.
- 서브 차량이 2대 이상일 때만 드롭다운 노출, 선택 시 슬라이스 C-2의
  scopeSettingsToVehicle/scopeWorkDataToVehicle(driverRevenueScope.js,
  이번 커밋으로 최초 반영)을 재사용해 해당 차량 하나만 필터링(계산 엔진
  domain/financeOwnerDetail.js는 무변경).
- 서브 차량이 하나도 없으면 "기사" 탭 자체를 숨김.
- 드롭다운 후보·탭 숨김·자동 리셋 전부 동일 기준(서브 차량 +
  isVehicleRevenueSharedWithOwner)으로 통일 — 연동(초대) 상태와 무관하게
  동작하도록 설계.
- 드롭다운 화살표 아이콘을 기존 상세 접이식 행의 쉐브론과 시각적으로 통일.
- 부수 수정: store/ownerDataHooks.js의 readOwnerWorkDataByLogId가
  main 차량만 반환하던 Slice C 당시 버그를 고쳐 서브 차량(기사) 로그까지
  포함하도록 수정(회귀 테스트 ownerDataHooks.test.js 포함) — "기사" 탭
  전체(기존 합산 기본값 + 이번 드롭다운)가 실제로 값을 표시하기 위한 필수
  선행 조건.

감시관 교차검증 [PASS](docs/report.md §9, docs/audit.md 참고), 보리 승인
완료, 브라우저 실검증 완료(기사 2대 등록 시 드롭다운 정상 동작 확인). 이
커밋에는 push를 포함하지 않음 — Step 9 전체 완료 후 보리가 별도로
검토·푸시함.
```

### 10-2. 저장소 B: `ubiquitous-parakeet` (docs)

**포함 대상**:
- `docs/report.md`
- `docs/audit.md`

(이번 슬라이스는 새 이미지/에셋 없음.)

**커밋 메시지 (한국어)**:
```
docs: 슬라이스 D(매출 기사 탭 드롭다운) 감시관 실사 기록

- docs/report.md: 슬라이스 D 착수지시서, 작업자 Phase 1/구현 완료 보고,
  감시관 Phase 2 [PASS], 보리 브라우저 실검증 발견 사항 3건 + 보완
  지시서, 드롭다운 데이터 소스 설계 오류 발견 및 재수정 지시서, 최종
  재검증 [PASS], 커밋 지시서 기록
- docs/audit.md: 슬라이스 D 전 과정(착수 → 1차 PASS → 브라우저 검증
  보완 → 설계 오류 정정 → 최종 PASS) 영구 이력 추가
```

### 10-3. 공통 준수사항
- 두 저장소 모두 **커밋까지만** — `git push`는 절대 실행하지 않는다.
- 커밋 완료 후 각 저장소의 `git log -1 --stat` 결과와 커밋 전 공유한
  `git status --short` 결과를 **`docs/report.md`의 이 절 바로 아래에
  직접 작성**할 것(AGENTS.md §2 최신 절차 — 채팅으로만 보고하지 말 것).
- 커밋 대상 파일이 이 지시서와 다르면(예: side-menu.css에 C-2 스타일이
  섞여 있는 등) 임의로 판단하지 말고 보리에게 먼저 확인받을 것.

### 10-4. 커밋 전 `git status --short` 전체 (작업자 공유, add/commit 미실행)

캡처 시각: 2026-09-03. **add/commit 아직 실행하지 않음** — 감시관·보리 대조 후 진행 지시 대기.

**저장소 A `react-app`**

```
 M src/components/RevenuePage.jsx
 M src/components/revenue/DriverRevenueView.jsx
 M src/components/revenue/OwnerRevenueView.jsx
 M src/side-menu.css
 M src/store/ownerDataHooks.js
?? App.test-standalone-output-utf8.txt
?? App.test-standalone-output.txt
?? build-9b-rework-output.txt
?? build-crash-output-attempt2.txt
?? build-crash-output-fresh.txt
?? build-crash-output.txt
?? build-debug-output.txt
?? build-no-dev-1.txt
?? build-no-dev-2.txt
?? build-slice-a-output.txt
?? build-slice-a-retry.txt
?? call-detail-list-output-utf8.txt
?? call-detail-list-output.txt
?? callDetail-reset-measurement-output.txt
?? guest-durable-header-load-output.txt
?? npm-test-9b-rework-output.txt
?? npm-test-fixtures-output.txt
?? npm-test-full-output-after-mock-fix.txt
?? npm-test-full-output.txt
?? npm-test-slice-a-output.txt
?? npm-test-split-timing.txt
?? npm-test-three-fixes-output.txt
?? npm-test-three-fixes-utf8.txt
?? npm-test-three-fixes.txt
?? owner-state-theme-merge-output-utf8.txt
?? owner-state-theme-merge-output.txt
?? phase2-typecheck-output.txt
?? remaining-7-mock-fix-output.txt
?? scripts/measure-callDetail-reset.mjs
?? scripts/migrate-guest-durable-tests.mjs
?? scripts/remove-guest-migrated-skips.mjs
?? src/components/revenue/driverRevenueScope.js
?? src/components/revenue/driverRevenueScope.test.js
?? src/store/ownerDataHooks.test.js
?? strict-inventory-slice-a.txt
?? supabase/.temp/
?? test-8d-output.txt
?? test-isolation-process-App-guest-output-utf8.txt
?? test-isolation-process-App-guest-output.txt
?? test-output.txt
?? typecheck-slice-a-output.txt
?? typecheck-step9-survey.txt
```

지시서 포함 예정 4파일: `OwnerRevenueView.jsx`(M), `side-menu.css`(M),
`driverRevenueScope.js`(??), `driverRevenueScope.test.js`(??).

제외 예정(C-2·로그 등): `RevenuePage.jsx`, `DriverRevenueView.jsx`,
`ownerDataHooks.js`, `ownerDataHooks.test.js`, `scripts/*`, `*.txt`,
`supabase/.temp/` 등 위 목록 나머지 전부.

**저장소 B `ubiquitous-parakeet`**

```
 M AGENTS.md
 M docs/audit.md
 M docs/report.md
```

지시서 포함 예정: `docs/report.md`, `docs/audit.md`. 제외: `AGENTS.md`.

### 10-4 보강. `git diff HEAD -- src/store/ownerDataHooks.js` (전체, 커밋 미실행)

요청 목적: `useOwnerCars` / `useOwnerDrivers` / `useOwnerExpenses` /
`useOwnerProfile` / `useOwnerSettings` / `useOwnerWorkDataByLogId` 6개 함수가
이번 diff에 **신규로 걸리는지**, 아니면 이미 HEAD에 있는지 대조.

작업자 사전 메모(감시관 판정용): HEAD에 6개 심볼 모두 존재 —
`useOwnerCars`/`useOwnerExpenses`/`useOwnerSettings`/`useOwnerWorkDataByLogId`는
본 파일 export, `useOwnerDrivers`/`useOwnerProfile`은
`ownerProfileDriversHooks.js`에서 re-export. 이번 diff에 함수 **시그니처
신규 추가 없음**. 변경은 `EMPTY_WORK_DATA_BY_LOG_ID` 상수 추가 +
`readOwnerWorkDataByLogId` / `useOwnerWorkDataByLogId` **본체만**
(main-only → workLogs 전체 반환, C-2 잔여). 나머지 5 hooks는 hunk에 미포함.

```diff
diff --git a/src/store/ownerDataHooks.js b/src/store/ownerDataHooks.js
index 1c33f09..447cce5 100644
--- a/src/store/ownerDataHooks.js
+++ b/src/store/ownerDataHooks.js
@@ -15,6 +15,10 @@ import { normalizeSettings } from '../domain/practiceSettings.js'
 /** @typedef {import('../domain/expenseTypes.js').ExpenseItem} ExpenseItem */
 
 const EMPTY_WORK_DATA = /** @type {Record<string, DayRecordLike>} */ ({})
+/** 손익·미수·계산서용 — owner에 workLogs가 없을 때 고정 참조(useSyncExternalStore). */
+const EMPTY_WORK_DATA_BY_LOG_ID = /** @type {import('../domain/financeTypes.js').WorkDataByLogId} */ ({
+  main: EMPTY_WORK_DATA,
+})
 // 재감사 2차(FAIL 지적 2번) — useExpenseForm.js가 마운트 시 한 번만 loadExpenses로
 // 스냅샷을 뜨고 그 이후엔 다시 안 읽어서, 그 사이 다른 경로(hydrate, 다른 탭, 또는
 // 같은 화면의 다른 조작)로 store에 반영된 항목이 다음 save()/remove()에서 통째로
@@ -58,19 +62,22 @@ export function useOwnerWorkData(ownerKey) {
 }
 
 /**
- * 손익·계산서·미수용 logId→일지 맵. 기존 `loadWorkDataByLogId`와 같이 main만 담는다
- * (서브 일지 persist 창구는 이 이관 범위 밖). `{ main }` 래퍼는 getSnapshot에 넣지 않는다.
+ * 손익·계산서·미수용 logId→일지 맵(Step 9 슬라이스 C).
+ * `workLogs[ownerKey]` 전체(main + 서브 차량번호)를 그대로 돌려준다 — 계산 엔진은
+ * 이미 logId별 소스를 순회하므로, 여기만 main에 묶여 있으면 매출/미수에 기사가 안 잡힌다.
+ * store 참조를 유지해 useSyncExternalStore 스냅샷이 안정적이다.
  * @param {string} ownerKey
  * @returns {import('../domain/financeTypes.js').WorkDataByLogId}
  */
 export function readOwnerWorkDataByLogId(ownerKey) {
-  return { main: readOwnerWorkData(ownerKey) }
+  const logs = getState().workLogs[ownerKey]
+  if (!logs || typeof logs !== 'object') return EMPTY_WORK_DATA_BY_LOG_ID
+  return logs
 }
 
 /** @param {string} ownerKey */
 export function useOwnerWorkDataByLogId(ownerKey) {
-  const main = useOwnerWorkData(ownerKey)
-  return useMemo(() => ({ main }), [main])
+  return useSyncExternalStore(subscribe, () => readOwnerWorkDataByLogId(ownerKey))
 }
 
 /**
```

### 11. 작업자 커밋 완료 보고 (2026-09-03, §10 실행)

push 미실행. `git add -A`/`git add .` 미사용 — 지시서 6파일(+docs 2파일)만
개별 경로 add.

#### 11-1. 커밋 전 `git status --short`

저장소 A / B 전체 출력은 §10-4에 기록. 최종 포함은 §10-1 2차 정정 후
**6파일**로 확정(§10-4의 "포함 예정 4파일" 문구는 정정 전 캡처 메모).

#### 11-2. 저장소 A `react-app`

**커밋**: `3d7e0c8dfb75457112481bac1c31b1ee315d315e`

**`git log -1 --stat`**:
```
commit 3d7e0c8dfb75457112481bac1c31b1ee315d315e
feat: 매출 화면 "기사" 탭에 개별 기사 선택 드롭다운 추가(슬라이스 D)
(본문: 지시서 메시지와 동일)

 src/components/revenue/OwnerRevenueView.jsx       | 78 +++++++++++++++++++++--
 src/components/revenue/driverRevenueScope.js      | 54 +++++++
 src/components/revenue/driverRevenueScope.test.js | 65 +++++++++++++++++++
 src/side-menu.css                                 | 34 ++++++++++
 src/store/ownerDataHooks.js                       | 17 +++--
 src/store/ownerDataHooks.test.js                  | 53 +++++++++++++++
 6 files changed, 289 insertions(+), 12 deletions(-)
```

**커밋 후 `git status --short`(잔여 — 의도적 제외)**:
```
 M src/components/RevenuePage.jsx
 M src/components/revenue/DriverRevenueView.jsx
?? App.test-standalone-output-utf8.txt
?? App.test-standalone-output.txt
?? build-9b-rework-output.txt
?? build-crash-output-attempt2.txt
?? build-crash-output-fresh.txt
?? build-crash-output.txt
?? build-debug-output.txt
?? build-no-dev-1.txt
?? build-no-dev-2.txt
?? build-slice-a-output.txt
?? build-slice-a-retry.txt
?? call-detail-list-output-utf8.txt
?? call-detail-list-output.txt
?? callDetail-reset-measurement-output.txt
?? guest-durable-header-load-output.txt
?? npm-test-9b-rework-output.txt
?? npm-test-fixtures-output.txt
?? npm-test-full-output-after-mock-fix.txt
?? npm-test-full-output.txt
?? npm-test-slice-a-output.txt
?? npm-test-split-timing.txt
?? npm-test-three-fixes-output.txt
?? npm-test-three-fixes-utf8.txt
?? npm-test-three-fixes.txt
?? owner-state-theme-merge-output-utf8.txt
?? owner-state-theme-merge-output.txt
?? phase2-typecheck-output.txt
?? remaining-7-mock-fix-output.txt
?? scripts/measure-callDetail-reset.mjs
?? scripts/migrate-guest-durable-tests.mjs
?? scripts/remove-guest-migrated-skips.mjs
?? strict-inventory-slice-a.txt
?? supabase/.temp/
?? test-8d-output.txt
?? test-isolation-process-App-guest-output-utf8.txt
?? test-isolation-process-App-guest-output.txt
?? test-output.txt
?? typecheck-slice-a-output.txt
?? typecheck-step9-survey.txt
```

#### 11-3. 저장소 B `ubiquitous-parakeet`

포함: `docs/report.md`, `docs/audit.md`. 제외: `AGENTS.md`. push 미실행.
(docs 커밋 직후 해시·stat을 이 절에 이어서 기록.)
