# React 이관 감사 보고서 (`react-app`)

기준: `docs/plan.md` (구 `migration-plan.md`, 2단계 설계안). 대상: `react-app/src`.  
범위(최초 작성 시점): 코드 수정 없음. 기존 React 구현을 설계안·도메인 계약과 대조한 Gap 분석, 재사용/폐기 분류, 재이관 순서, 검증 기준. **이후 Step 0~4 및 Step 0-4 감사 보완 1~3차가 실제로 코드를 고치며 진행됐다 — 최신 진행 상황은 "## 0-1. 현재 상태 (Step 4 + 감사 보완 3차 완료 기준)"와 "## 3. 단계별 재이관/수정 실행 계획"의 체크박스·구현 로그를 보라.**

한 줄 요약(최초 작성 시점, 착수 전): 현재 `react-app`은 **기능 단위 수직 슬라이스가 아니라 “화면 껍데기 + localStorage 모듈” 1차 이식**이다. 제어 컴포넌트·리스트 `map`·모달 조건부 렌더는 이미 상당 부분 React답다. 그러나 **스토어/라우트/일지 draft/다중 로그**가 빠져 있어, 설계안의 목표 아키텍처와는 아직 다른 앱이다.

---

## 0. 현재 트리 vs 설계안 트리 (착수 전 스냅샷 — 아래 0-1절 참고)

**이 표는 Step 0 착수 *이전*의 스냅샷이다.** 아래 왼쪽 열("실제 `react-app`")은 지금은 대부분 사실이 아니다 — 예를 들어 `App.jsx`의 `screen`/`appPage` 스위치는 Step 3에서 `react-router-dom` 라우트 트리로, `src/lib/*` 순수 계산은 Step 4에서 `src/domain/*`로, "Router/Zustand 없음"은 Step 1~3에서 자체 pub-sub 스토어(`src/store/app-store.js`, Zustand는 아니지만 같은 역할) + `react-router-dom` 도입으로 이미 바뀌었다. 표 자체는 "왜 이관이 필요했는지"의 기록으로 원문 그대로 남기고, 지우거나 고쳐 쓰지 않는다.

| 설계안 (`migration-plan.md`) | 실제 `react-app` (Step 0 착수 전) |
|---|---|
| `src/app` + React Router + `Outlet` | `App.jsx`의 `screen` / `appPage` 문자열 스위치 |
| `src/store` Zustand 단일 소스 | 페이지마다 `useState(() => loadX(ownerKey))` + `localStorage` |
| `src/domain` 순수함수 | `src/lib/*` (일부는 순수, `cloudSync`/`practiceSettings.applyTheme`는 부작용) |
| `src/api` 어댑터 | `src/lib/cloudSync.js` 한 파일 + `supabaseClient.js` |
| `src/ui` 파일당 ≤200줄 | `src/components` 거대 페이지 파일 |
| TypeScript + Router 6 + Zustand | JS + React 19 + Vite. Router/Zustand 없음 |
| 일지 `/app/day/:date`, 서브 `/app/logs/:logId` | 달력 위에 `WorkLogPage` 통째 교체 (`selected` truthy면 홈 언마운트) |

테스트(착수 전): `package.json`의 `npm test`는 `node --test`로 `src/lib/*.test.js`만 돈다. Testing Library / 컴포넌트 테스트는 없다.

---

## 0-1. 현재 상태 (Step 4 + Step 0-4 감사 보완 1~3차 완료, Step 5 착수 전 — **과거 스냅샷. 최신 상태는 "5-1. 현재 결론" 절을 보라**)

위 0절 표를 지금 기준으로 다시 채우면:

| 설계안 (`migration-plan.md`) | 실제 `react-app` (현재, Step 5 착수 전) |
|---|---|
| `src/app` + React Router + `Outlet` | Step 3에서 완료. `src/app/App.jsx`가 `react-router-dom` 라우트 트리(`/auth`, `/onboarding`, `/app/*`)를 그린다. `AppShell.jsx`가 `/app/*` 레이아웃 + 중첩 라우트. |
| `src/store` Zustand 단일 소스 | Step 1에서 완료(Zustand는 아니고 자체 pub-sub 스토어). `src/store/app-store.js`(`commitBatch`/`getState`/`subscribe`) + `src/store/owner-state.js`(`initializeOwnerFromPersist`/`replaceOwnerState`) + `src/store/atomicPersist.js`(원자적 localStorage 쓰기, 감사 보완 2차) + `src/store/batchWrites.js`/`commitHelpers.js`(200줄 제한 분리, 감사 보완 3차). **단, UI는 아직 이 스토어를 구독하지 않는다 — 페이지 `useState`가 여전히 진실이고, 스토어는 hydrate/동기화 경로만 쓴다(migration-plan.md 1.3이 금지한 "쓰지 말 것" 상태는 아직 유효).** |
| `src/domain` 순수함수 | Step 4에서 완료. `finance.js`(627줄, 계획서 5절 예외) 포함 13개 파일이 `src/domain/`으로, `cars`/`clients`/`drivers`/`practiceSettings`/`expenses`/`invoices`는 I/O(`lib/`)와 순수 계산(`domain/`)으로 분리. `hydrateMerge.js`(순수 hydrate 병합, 감사 보완 2차)도 `src/lib/`에 추가. |
| `src/api` 어댑터 | 부분 완료. `src/lib/cloudSync.js`(893줄, 계획서 5절 "api/hydrate.ts 부트 시퀀스" 예외)가 여전히 hydrate+sync+기사 API를 한 파일에서 담당 — `api/`로의 실제 폴더 분해는 아직 안 함(Step 9 즈음 판단 예정, 감사 보완 2차 알려진 한계에 기록됨). |
| `src/ui` 파일당 ≤200줄 | 아직 미착수(Step 5~10에서 화면별로 진행). `CarManagementPage.jsx`(298줄)/`ClientManagementPage.jsx`(314줄)/`WorkLogPage.jsx`(811줄) 등은 여전히 200줄을 넘는다 — 감사 보완 3차에서 이 파일들에 각 5~10줄짜리 readiness 가드만 추가했고, 전면 재작성은 Step 7 몫으로 남겼다(범위: "Step 5를 시작하지 말고 차단 항목만 보완하라"). |
| TypeScript + Router 6 + Zustand | Router는 `react-router-dom@7`로 도입 완료(Step 3). TypeScript는 여전히 미설치 — Step 1부터 매 Step "알려진 한계"로 기록된 갭이 그대로 이어지는 중, Step 11 몫. Zustand는 안 썼지만 같은 역할의 자체 스토어로 대체. |
| 일지 `/app/day/:date`, 서브 `/app/logs/:logId` | `/app/day/:date`는 Step 3에서 라우트로 분리(`MainPageRoute.jsx`가 `index`/`day/:date` 둘 다 그려서 달력이 언마운트되지 않는다). 서브 차량 워크로그(`/app/logs/:logId`)는 아직 없음 — Step 5~6 이후 범위. |

테스트(현재): `npm test` → **173/173 통과**(착수 전 0개 → Step 0 88개 → 감사 보완 1차 126개 → 2차 158개 → 2차 교차검증 163개 → 3차 173개). `node:test` 기반, Testing Library는 여전히 없음(컴포넌트 렌더 테스트는 각 Step의 "알려진 한계"에 그 이유가 기록돼 있다 — 순수 함수로 뽑아 테스트하고 실제 렌더/라우팅은 브라우저로 확인하는 방식을 대신 쓴다).

---

## 1. 기존 React 코드의 문제점 전수조사 (Gap 분석)

### 1.1 설계안 대비 누락·잘못된 상태 구조

#### A. 전역이 스토어가 아니라 “페이지 스냅샷”

설계안: `AppStore` 한 곳 (`hydration`, `session`, `settings`, `workLogs: Record<LogId, WorkLog>`, `taxInvoices`, `ui.save`).

실제:

- `App.jsx`가 세션·화면·토스트·알림 틱만 가짐.
- 운행/차량/거래처/설정/비용/계산서는 **각 페이지가 마운트 시 `load*`로 한 번 읽고, 저장 시 그 페이지 `useState`만 갱신**.
- `ownerFinance.loadWorkDataByLogId`는 **항상 `{ main: loadWorkData(ownerKey) }`**. 서브 차량 `workLogs[차량번호]`가 없다.
- 매출·미수·세금계산서·알림은 `finance.js`가 `workDataByLogId`의 서브 로그를 기대하지만, React 쪽 로더는 메인을 복제하지 않는다. 기사차량을 등록해도 **그 차량 일지를 열 라우트/상태가 없다**.

결과: 화면을 바꾸면 다른 페이지의 메모리는 버려지고 localStorage가 진실이 된다. 설계안이 금지한 “컴포넌트에 확정본을 흩뿌리기”와 동일하다. 동시에 같은 세션에서 미수금 화면과 일지가 다른 스냅샷을 가질 수 있는 구조다(지금은 페이지가 동시에 안 살아 있어 덜 터질 뿐).

#### B. 일지 draft 계약 위반

설계안: 화면 진입 시 `cloneDayRecord`, 편집은 `setDraft`, 디바운스 `commitDay`(빈 날 delete), 저장 시 또 clone. 콜상세 `id`. 정비/주유는 **그날 레코드 안** (`maintItems` / `fuelItems` / `miscItems`) 또는 명시적 이중 저장 계약.

실제 `MainPage.saveDay` / `WorkLogPage`:

- 횟수·휴무·콜상세·노선칩은 **키 입력마다 즉시 `saveDayRecord` → `saveWorkData`**. draft 레이어가 없다.
- `saveDayRecord`는 `isOff` / `fixedCount` / `callDetails` / `fixedRouteCounts`만 다룬다. **`palletCount`를 쓰지 않는다.** 파렛트만 있는 날은 빈 날로 지워질 수 있다(`!off && count === 0 && details.length === 0`이면 delete).
- 콜상세 식별자는 **배열 인덱스**. `upsertCallDetail(..., editingIndex)`, `removeCallDetail(details, index)`, 미수 `detailIndex`, 알림 키 `overdue:${logId}:${dateKey}:${detailIndex}`. 설계안의 `logId|dateKey|detailId`가 아니다.
- 정비/주유/기타는 일지 레코드가 아니라 **`reactPracticeExpenses` 별도 배열** (`expenses.js`). 그런데 `finance.getOwnerMonthlyFinanceDetail`은 **`record.maintItems` / `fuelItems` / `miscItems`**를 읽는다.  
  → 일지 UI에서 넣은 비용은 리포트(`report.js`는 `expenses.js` 사용)에는 잡히고, **매출 상세에는 안 잡힐 수 있다.**  
  hydrate는 반대로 daily_logs에 `maintItems`를 심고 `expenses`에도 넣는다. 쓰기 경로와 읽기 경로가 갈라져 있다.

#### C. 설정 스키마·토글 의존성

설계안 / 바닐라: `callDetailOn`, `getActiveLogSettings(settings, logId)`, 고정노선 OFF → 세부입력 강제 ON은 **저장 액션**에서.

실제 `practiceSettings.normalizeSettings`:

- 필드명이 `callDetail`(On 접미사 없음). 일지 UI는 **`settings.callDetail`을 보지 않고** 세부 입력 섹션을 항상 렌더한다. 설정 토글이 일지에 연결되지 않음.
- `inputMode: 'fare'`는 설정에만 저장. `MainPage` 달력은 항상 횟수 뱃지. 설정 화면에 “금액 표시는 나중에”라고 명시.
- `sub*` 프리셋은 설정 UI에 있으나 **일지가 메인 설정만 사용**.
- 온보딩 `wizard`(파렛트·수금·차량번호·정산모드)는 `onFinish(wizard)`로 넘어가지만 `App.jsx`는 `goHome(session)`만 호출. **설정을 persist하지 않음.**

#### D. 거래처·차량 도메인 공백

- `getFixedRouteClient`는 `clients[].fixedRouteLinked`를 찾는다. 거래처 폼에는 **고정노선 1곳 지정 / 고정 단가 / 파렛트 단가 필드가 없다.** 매출의 고정노선 운임·파렛트는 사실상 항상 0에 가깝다. `MainPage` 월 합계는 `practiceSettings.unitPrice`를 쓰므로 **달력 합계와 매출 화면 단가 소스가 다름**.
- 차량 폼: 번호/톤수/기사/정산/수수료까지만. 설계안의 `personalInfo`, `businessInfo`, `logEnabled`, `driverLinkEnabled`, `shareRevenueWithOwner`, 번호 변경 시 **workLog 키 이동**이 없다. `upsertCar`는 `{ ...list[idx], number, ...}`라 `supabaseId`는 남지만, 서브 번호 변경 시 로그 키 이전 로직은 없다(서브 로그 자체가 없음).
- 거래처 `upsertClient`는 스프레드로 `supabaseId`는 유지. `commEnabled` / `commType` / `commValue` UI는 거래처 폼에 없음. 일지 `commissionSnapshot`은 거래처 수수료가 켜져 있어야 채워지므로 **수수료 스냅샷이 비는 경로**.

#### E. 부트·동기화 계약

설계안 유지 항목: hydrate 전 settings 업서트 금지, 디바운스, `online` / `visibilitychange` / `pagehide` flush, 고용기사 unlinked main 스킵, 차량 uuid 대기 후 throw.

실제 `cloudSync.js`:

- `scheduleCloudSync`는 `hydrationCompleted` 가드로 hydrate 중 업서트를 막는다. **이 부분은 설계안과 맞다.**
- `flushCloudSync`는 로그아웃 시에만 호출. **루트에 `online` / `visibilitychange` / `pagehide` 리스너가 없다.** 백그라운드 전환 유실 위험이 설계안 금지 사항과 정면 충돌.
- 세션 복원: `getSession` / `onAuthStateChange` 없음. 새로고침하면 항상 `screen === 'auth'`.
- 일지 동기화는 **메인 차량 `supabaseId` 하나**. 서브 차량 daily_logs는 올리지 않음.
- 모듈 전역 `cloudUserId`, `hydrationCompleted`, `syncTimer` — 설계안이 지적한 `__supabaseWorkDataSyncedSnapshot`급 모듈 캐시. `endCloudSession`이 일부만 리셋.
- `ensureProfileRow`는 hydrate 전에 profiles upsert 가능(가입 시). 빈 settings로 덮는 실버그 재현 여지는 `syncAll`의 `practiceSnapshot` 경로에 남아 있다.

#### F. 네비게이션·오버레이

- React Router 없음. `previousPage` 대체인 `soonBack`만 있고, 미수 상세는 `ReceivablesPage` 내부 `detail` state (URL 없음).
- 일지를 열면 **달력이 언마운트**된다. 설계안(“일지 닫아도 달력 state 유지”)과 반대. `viewDate`는 일지 왕복 시 초기화된다.
- 하드웨어 백/히스토리 가드는 없음(웹 앱 기준 미구현).
- Confirm: `ConfirmModal`은 콜백 props. `ReceivablesPage`는 `window.confirm`. Promise `useConfirm` 없음. 회원탈퇴 2단 confirm도 없음(탈퇴 UI 없음).
- Toast는 `App`의 문자열 하나. 큐 없음. 저장 실패 인디케이터(`ui.save`) 없음.

#### G. 화면 기능 공백 (바닐라/설계안 대비)

| 영역 | 상태 |
|---|---|
| 스플래시 | 없음 |
| AppSelect / DatePicker / Portal 드롭다운 | 네이티브 `<select>` / `<input type=date\|time>` |
| 달력 셀 미수 점 | 없음. 월 카드로만 미수 합계 |
| 파렛트 입력 | 온보딩 토글만, 일지 없음 |
| 기사 상세/기사 전용 거래처 | 목록+초대 모달만 |
| PDF/공유 SMS | 리포트에 “나중에” 문구. html2pdf 없음 |
| 고객센터/문의/청구/공지/문자문구 | `ComingSoonPage` |
| hydration lock | 개인정보·설정 input `disabled` 없음 |
| 저장 상태 셸 | 없음 |
| 테마 | `document.documentElement` dataset — 설계안 ThemeRoot와 유사, **위치는 라이브러리 함수** |

---

### 1.2 React답지 않은 바닐라 잔재·안티패턴

`getElementById` / `innerHTML` / `appendChild`로 모달을 옮기는 코드는 **프로덕션 UI에 거의 없다.** `originalWindow.js`만 테스트용으로 바닐라 스크립트를 jsdom에 주입한다. `dangerouslySetInnerHTML`도 없음.

남은 문제:

| 위치 | 내용 |
|---|---|
| `InlineExpandHost.jsx` | `host.style.maxHeight` 직접 조작, `classList.contains('is-open')`, `ResizeObserver`. 설계안 3.2가 폐기한 maxHeight 트릭의 React 이식. |
| `App.jsx` | `document.body.classList.toggle('account-flow-active')`. 계정 플로우용 body 클래스. |
| `practiceSettings.applyTheme` | `document.documentElement` 테마. 허용 범위이지만 컴포넌트(`ThemeRoot`)가 아님. |
| `WorkLogPage.jsx` | `window.alert`, `window.location.href = sms:...`. Confirm/Toast API가 아님. |
| `ReceivablesPage.jsx` | `window.confirm`. |
| `cloudSync.js` | 모듈 `let` 전역 세션. `window.supabaseClient`는 없으나 동급. |
| `App.jsx` `notifTick` | 스토어 구독 대신 강제 리렌더 카운터. |
| `AppSettingsPage` `RunCountChips` | `defaultValue` + `onBlur` — 비제어 input. |
| `MainPage` | 렌더 중 `loadClients(ownerKey)` (일지 열 때마다 스토리지 동기 읽기). |
| `WorkLogPage` | `settingsProp \|\| loadPracticeSettings(ownerKey)` 폴백. |
| `MyPage` | 렌더마다 `loadProfile`. |
| 인덱스 키 | 콜카드 `key={\`${item.workDate}-${index}\`}`. 설계안 금지(인덱스를 식별자로). |
| `useEffect` | 남발은 아님. `App`(body/theme/toast), `InlineExpandHost`(높이) 정도. 문제는 **이펙트 부족**(flush 브리지 없음)과 **이펙트 대신 사이드이펙트 렌더**. |

전역 `confirmCallback`, `onclick` 문자열, `dispatchEvent('change')`는 React 쪽에 없다.

---

### 1.3 200줄 초과·역할 과밀 파일

줄 수는 `src` 기준(대략, 공백 포함 실제 파일은 이보다 조금 큼). UI 예외 없음이 설계안 규칙.

**UI (재분할 대상)**

| 파일 | ~줄 | 뭉친 역할 |
|---|---|---|
| `components/WorkLogPage.jsx` | 811 | 헤더, 휴무, 고정노선, 콜 리스트, 콜 폼, 비용 요약, 비용 폼 호스트, SMS 시트, 아이콘 더미 |
| `components/AuthPage.jsx` | ~358 | intro/login/signup 한 파일 |
| `App.jsx` | 334 | 라우터+셸+부트+토스트+비번찾기 모달 |
| `components/RevenuePage.jsx` | ~347 | 기간 헤더, 월/년, 스코프, 상세 행 |
| `components/ClientManagementPage.jsx` | ~307 | 리스트+드래그+폼 모달 |
| `components/CarManagementPage.jsx` | ~289 | 리스트+폼 모달 |
| `components/TaxInvoicePage.jsx` | ~258 | 탭/플로우/리스트/발급 모달 |
| `components/AppSettingsPage.jsx` | ~245 | 테마+메인/서브 설정+칩 에디터 |
| `components/ReceivablesPage.jsx` | ~239 | 월별/임박 + 그룹 + 상세 + 부분입금 |
| `components/MainPage.jsx` | 225 | 달력+월정산+일지 게이트 |

**도메인/API (설계안 예외 가능, 그래도 과밀)**

| 파일 | ~줄 | 비고 |
|---|---|---|
| `lib/cloudSync.js` | ~817 | hydrate+모든 테이블 sync+기사 초대. `api/hydrate.ts` 예외에 해당하나 한 파일에 다 있음 |
| `lib/finance.js` | ~627 | 매출/미수/계산서 파생. 예외 후보 |
| `lib/workData.js` | 317 | 저장+콜 CRUD+payments. domain 분할 대상 |

200 이하이지만 곧 넘을 후보: `DriverConnectionPage` ~202, `MaintFuelPage` ~187, `OnboardingPage` ~170.

---

## 2. 살릴 코드 vs 버리고 새로 짤 코드

원칙: **순수 계산·이미 제어 컴포넌트인 작은 조각은 유지.** 페이지 조립·상태 소유·DOM 높이 트릭·인덱스 CRUD는 폐기하고 설계안 파일명으로 재작성. 도메인 함수는 파일 이동(리네임)이지 알고리즘 재발명이 아니다.

### 2.1 [유지/재사용] — 그대로 쓰거나 다듬기

**도메인 (Jest와 함께 `src/domain`으로 이동)**

- `lib/money.js`, `lib/formatPhone.js`, `lib/calendar.js` (`buildCalendarCells` → `useCalendarDays`의 `buildCalendarDays`)
- `lib/workData.js`의 순수 부분: `getFixedCount`, `applyFixedRouteRun`, `buildCallDetail`, `computeDistanceKm`, `countCallTrips`, `monthWorkFareSummary`, `saveDayRecord`(빈 날 delete), payments (`addPartialPayment` 등). **식별자를 index → id로 바꿀 때 테스트와 함께 수정.**
- `lib/finance.js` + `finance.fixtures.js` + `finance.test.js` (바닐라 미러). 매출/미수/계산서 숫자 계약의 본체.
- `lib/clients.js`: `calculatePaymentDueDate`, `dueDateForClient`, `getFixedRouteClient`, `reorderClients`(핀 제약), `sortClientsPinnedFirst`
- `lib/cars.js`: `SETTLEMENT_MODES`, `getEffectiveDriverSettlementMode`, `getCarBusinessInfo`, `getVehicleSupplierIdentity`, `hasMainCar`
- `lib/practiceSettings.js`: 프리셋 normalize/add/remove, `fixedOn`→`callDetail` 강제 규칙. 스키마를 `callDetailOn`으로 맞출 때 테스트 유지.
- `lib/receivables.js`, `lib/taxInvoices.js`, `lib/invoices.js`, `lib/fuelRecords.js`, `lib/maintenanceRecords.js`, `lib/miscExpenseRecords.js`
- `lib/notifications.js`의 파생 목록 (키만 detailId로 변경)
- `lib/expenses.js`의 upsert/validate — **저장 위치를 day-record로 합칠 때 매핑만 변경**
- `lib/drivers.js` 초대코드·기간 겹침 (클라우드 테스트 있음)
- `supabaseClient.js` 모듈 싱글톤 (설계안 `api/supabase-client.ts`)

**UI (구조가 단순해서 이식)**

- `BottomNav.jsx` — 탭 id만 라우트에 연결
- `ComingSoonPage.jsx`
- `ConfirmModal.jsx` — 마크업은 유지, Promise 컨텍스트로 래핑
- `NotificationPanel.jsx` — 스와이프만 추가하면 됨. 목록 렌더는 이미 선언형
- `ExpenseFormModal.jsx` — variant `inline`이 이미 있음. 설계안 `ExpenseForm`의 초안. 높이 호스트에서 분리하면 재사용
- `AppSettingsPage` 내부 `SwitchRow`, `RoutePresetEditor`, `RunCountChips`, `FixedRouteBlock` — 파일만 쪼개면 됨
- `RevenuePage`의 `DateNav`, `RevenueDetailRow`, `PageShell`
- `OnboardingPage` 스텝 UI — persist만 연결하면 됨. 파일 분할은 설계안대로
- `PersonalInfoPage` 필드 레이아웃 — hydration lock + 스토어 액션만
- `MyPage` 바로가기 그리드
- CSS (`main-calendar.css`, `account-flow.css`, `side-menu.css`, 기존 클래스명) — 설계안도 당분간 유지

**테스트 하니스**

- `lib/*.test.js` + `originalWindow.js`의 바닐라 대조. domain 이전 후에도 숫자 회귀로 유지.

### 2.2 [완전 폐기 및 재작성]

뜯어고치면 스토어/라우트와 이중으로 얽힌다. 새 컴포넌트 파일이 빠르다.

| 폐기 대상 | 이유 |
|---|---|
| `App.jsx` 화면 스위치 전체 | RouterProvider + Providers로 대체. 로직을 고치면 고칠수록 거대 신 |
| `MainPage`의 “selected면 WorkLog로 통째 교체” | `CalendarPage`와 `DayLogPage`를 라우트로 분리. 달력 언마운트 버그를 고치는 패치보다 분리가 안전 |
| `WorkLogPage.jsx` 전체 | 811줄 + 인덱스 CRUD + expenses 이중 소스 + SMS. `DayLogPage` + 섹션 + `useDayDraft`로 신규 |
| `InlineExpandHost.jsx` | maxHeight DOM 트릭. CSS grid 시트로 대체 |
| 페이지 로컬 `load*`/`save*` 패턴 (`Car`/`Client`/`MaintFuel`/`Tax`/`Driver`/`Receivables`의 persist 함수들) | 스토어 액션으로 이전. UI 파일은 목록/폼만 새로 |
| `ownerFinance.loadWorkDataByLogId`의 `{ main only }` | `workLogs` 맵으로 재작성 |
| `cloudSync.js` 일체 구조 | 동작 계약(디바운스, hydrate 가드, vehicles upsert)은 이전하되 **파일은 `api/*`로 분해**. 전역 `let` 폐기 |
| `App.jsx` 비밀번호 찾기 모달 | 인증 레이아웃 안으로 |
| 인덱스 기반 콜/미수/알림 키 | id 마이그레이션과 함께 신규 |

**부분 재작성 (뼈대는 복사 가능):** `AuthPage`(뷰 3분할), `CarManagementPage`/`ClientManagementPage`(리스트+모달 분리), `ReceivablesPage`(상세를 라우트로), `TaxInvoicePage`, `DriverConnectionPage`, `ReportPage`(PDF 훅만 나중에).

---

## 3. 단계별 재이관/수정 실행 계획 (Action Plan)

제약: **지금 돌아가는 `npm test`와 localStorage 키 계약을 한 번에 깨지 말 것.** 각 Step은 기존 화면이 마운트된 채로 스토어/도메인부터 갈아끼우고, 마지막에 페이지 파일을 교체한다. 바닐라 HTML과 React를 한 문서에 공존시키지 않는다(설계안과 동일).

### [x] Step 0 — 안전망 (범위: 테스트만)

- 파일: 기존 `src/lib/*.test.js` 유지. `saveDayRecord` 빈 날·`payments`·고정노선 1곳(`getFixedRouteClient`) 케이스가 없으면 테스트만 추가.
- 작업: 코드 동작 변경 없이 회귀 목록을 문서화(본 문서 4절).
- 완료: `npm test` 그린.
- **검증 로그 (2026-08-26):** `npm test` → `tests 88 / suites 24 / pass 88 / fail 0 / cancelled 0 / skipped 0 / todo 0`. 기존 회귀 케이스 그대로 100% 통과. 코드 변경 없음 (안전망 확인만 수행).

### [x] Step 1 — 스토어 껍데기 + persist 키 계약 (앱이 안 깨지게)

설계안 이관 순서 1의 최소 버전. **UI는 아직 페이지 `useState`.**

- 추가: `src/store/app-store.js`(또는 ts), `src/store/persist.js`
- `persist.js`가 현재 키를 그대로 씀: `reactPracticeWorkData`, `reactPracticeCars`, `reactPracticeClients`, `reactPracticeSettings`, `reactPracticeExpenses`, `reactPracticeInvoices`, `reactPracticeDrivers`, `reactPracticeProfile`, `reactPracticeDismissedNotifs`
- `workLogs` 초기값: `{ main: loadWorkData() }`. 서브 키는 이후 Step.
- 변경: `workData.js` `saveWorkData` / `cars.js` `saveCars` 등이 **스토어 set + 기존 localStorage + `scheduleCloudSync`**를 타도록 한 어댑터. 컴포넌트는 아직 `load*` 호출 가능.
- 완료: 기존 페이지 수동 스모크 + `npm test`.

**구현 로그 (2026-08-26):**

- 신규: [`src/store/persist.js`](../react-app/src/store/persist.js) — `PERSIST_KEYS` 9개 키(위 목록과 완전히 동일한 문자열) + `readJsonKey`/`writeJsonKey` 어댑터. 62줄.
- 신규: [`src/store/app-store.js`](../react-app/src/store/app-store.js) — `commitWorkData`/`commitCars`/`commitClients`/`commitSettings`/`commitExpenses`/`commitInvoices`/`commitDrivers`/`commitProfile`/`commitDismissedNotifications` — 전부 `writeJsonKey` → 메모리 `state` 갱신 → `notify()` → (알림 제외) `scheduleCloudSync()` 순서를 타는 단일 `commit()` 경로. `workLogs`는 계획대로 `{ [ownerKey]: { main: data } }` 한 칸만 채움. 160줄.
- 변경: `src/lib/{workData,cars,clients,practiceSettings,expenses,invoices,drivers,profile,notifications}.js` — 각 파일의 `save*`가 `localStorage.setItem` + `scheduleCloudSync()` 직접 호출을 그만두고 해당 `commit*`을 부르도록 교체. `load*`도 각자 갖고 있던 `STORAGE_PREFIX` 상수 대신 `persist.js`의 `readJsonKey`를 쓰도록 통일(배열/객체 형태 검증은 기존처럼 호출부에 남김 — 동작 동일). `savePracticeSettings`/`saveProfile`은 정규화된 값을 그대로 반환하는 기존 계약을 유지.
- `cloudSync.js`는 이번 Step에서 손대지 않음 (전역 `let` 세션 정리는 계획대로 Step 2).
- **부수 조치 (원칙 4 — 파일당 200줄):** 이 Step에서 처음 손댄 `workData.js`가 이미 309줄이라 손댄 김에 쪼갬. `day-record.js`(파생 계산, 137줄), `call-details.js`(콜상세 builder, 81줄), `payments.js`(입금 원장, 93줄)로 분리하고 `workData.js`는 저장 I/O(18줄) + `export * from` 배럴로 남겨 기존 `from '../lib/workData.js'` 임포트 9곳(컴포넌트 3 + lib 3 + 테스트 3)을 전혀 바꾸지 않았다. domain/ 폴더로의 실제 이동은 계획대로 Step 4.
- **검증 로그:** `npm test` → `tests 88 / pass 88 / fail 0` (동일). `npm run build` → 성공, 청크에 `store/app-store`·`lib/workData`·`lib/day-record` 등 정상 포함. `npm run lint` → 기존에 있던 8개 경고만 그대로, 이번 변경으로 추가된 경고 없음(미사용 import 없음).
- **알려진 한계:** `typescript`가 이 저장소에 아직 설치·설정되어 있지 않아(`tsconfig` 없음) `tsc --noEmit` 같은 실제 typecheck 명령을 돌릴 수 없었다. 새로 만든 두 파일은 JSDoc으로 타입을 달았고 `any`/`unknown`은 쓰지 않았지만, 이 확인은 `npm run lint`(oxlint)와 `npm test`/`npm run build`로 대체했다. 실제 typecheck 도입은 계획상 Step 11(JS→TS 전환)이며, 그전에 이 갭이 남아 있다는 점을 다음 Step 담당자가 알아야 한다.
- 컴포넌트(UI)는 한 줄도 바꾸지 않음 — `load*` 호출부, `screen`/`appPage` 스위치, 각 페이지 `useState` 전부 그대로.

### [x] Step 2 — 부트·플러시·hydration lock (설계안 슬라이스 1)

- 추가: `src/app/boot.js`, `src/app/providers.jsx`, `SyncFlushBridge` (`online` / `visibilitychange` / `pagehide` → `flushCloudSync`)
- 변경: `App.jsx` — `getSession`으로 새로고침 세션 복원. hydrate 끝날 때까지 `hydration.completed === false`. `PersonalInfoPage`, `AppSettingsPage`에 `disabled={locked}`.
- 변경: `cloudSync.js` — 전역 `let`을 스토어 `session`/`hydration`으로 이전 시작. 파일 통째 삭제는 이 Step에서 하지 말고 **export 시그니처 유지**.
- 완료: 로그인 → hydrate 중 설정 입력 불가 → 완료 후 저장 → 백그라운드 전환 시 네트워크에 upsert.

**구현 로그 (2026-08-26):**

- 신규: [`src/app/boot.js`](../react-app/src/app/boot.js) — `restoreSessionOnBoot()`. `supabase.auth.getSession()`으로 새로고침 세션 복원 → `profiles`에서 `name`/`phone`/`account_type` 조회 → `hydrateFromSupabase(userId, userId)`. 활성 세션이 없으면 `null`을 돌려줘 기존처럼 `screen==='auth'`에 남는다(게스트/로그아웃 동작 무변경). hydrate가 실패해도 세션은 돌려주고 `hydrateError:true`만 표시 — App.jsx의 로그인/가입 처리와 같은 "fail-open" 철학. 73줄.
- 신규: [`src/app/providers.jsx`](../react-app/src/app/providers.jsx) — `SyncFlushBridge`. `online`/`visibilitychange(hidden)`/`pagehide` → `flushCloudSync()`. App.jsx 루트에 항상 마운트(게스트에서도 안전 — `flushCloudSync`가 hydrate 전/비로그인 상태에서 이미 no-op). 32줄.
- 신규: [`src/app/useHydrationLock.js`](../react-app/src/app/useHydrationLock.js) — `useHydrationLock()`. store `hydration.completed`를 구독해 `locked` boolean 반환. 19줄.
- 변경: [`src/store/app-store.js`](../react-app/src/store/app-store.js) — `hydration: { completed, userId, ownerKey }` 슬라이스 + `setHydration(patch)` 추가. **기본값은 `completed: true`**(게스트/로그인 전은 애초에 잠글 이유가 없음) — `cloudSync.js`의 `hydrateFromSupabase`가 실행되는 짧은 구간에만 `false`로 내려간다. 181줄.
- 변경: [`src/lib/cloudSync.js`](../react-app/src/lib/cloudSync.js) — export 시그니처 전부 그대로. `hydrateFromSupabase` 본문을 `try/finally`로 감싸 **성공이든 실패든 반드시 `setHydration({completed:true, ...})`으로 잠금을 푼다** (잠긴 채 남는 게 무한 lock보다 나쁘다는 원칙). `endCloudSession`도 `setHydration({completed:true, userId:null, ownerKey:null})`로 명시적으로 unlock. 내부 `let cloudUserId/cloudOwnerKey/hydrationCompleted/syncTimer/syncing`은 이번 Step에서 **완전히 제거하지 않음** — 800줄대 Supabase 오케스트레이션 로직을 건드리지 않고 미러링만 추가하는 쪽을 선택(원칙 2: 정상 동작 코드 임의 축소 금지). app-store.js가 `scheduleCloudSync`를, cloudSync.js가 `setHydration`을 서로 import하는 순환 참조가 생기지만 둘 다 함수 바디 안에서만 참조해 모듈 평가 시점 문제 없음을 `npm test`로 확인.
- 변경: [`App.jsx`](../react-app/src/App.jsx) — `booting` state 추가, 마운트 시 `restoreSessionOnBoot()` 1회 호출 → 세션 있으면 `goHome()`, hydrate 실패 시 토스트만. `<SyncFlushBridge />` 루트에 항상 마운트. 게스트/로그인/가입/로그아웃 핸들러는 전부 그대로.
- 변경: [`PersonalInfoPage.jsx`](../react-app/src/components/PersonalInfoPage.jsx), [`AppSettingsPage.jsx`](../react-app/src/components/AppSettingsPage.jsx) — `useHydrationLock()` → `<fieldset disabled={locked}>`로 편집 영역을 감싸고 잠금 중 안내 문구(`#settingsHydrationLockNotice`) 표시. 설계안 3.9 스니펫과 동일한 패턴.
- **부수 조치 (원칙 4 — 파일당 200줄):** `App.jsx`에서 자기완결적인 "비밀번호 찾기" 모달을 [`ForgotPasswordModal.jsx`](../react-app/src/components/ForgotPasswordModal.jsx)(18줄)로 분리. `AppSettingsPage.jsx`는 이번 Step에서 어차피 손대는 김에, 감사보고서 2.1절이 이미 "파일만 쪼개면 됨"으로 표시해둔 대로 `SwitchRow.jsx`(19줄)/`RoutePresetEditor.jsx`(45줄)/`RunCountChips.jsx`(48줄)/`FixedRouteBlock.jsx`(40줄)로 분리 — 로직은 한 글자도 안 바꾸고 파일만 나눴다. 결과: `AppSettingsPage.jsx` 245→104줄.
- **알려진 한계 (200줄 원칙 미준수 1건, 의도적):** `App.jsx`는 350줄로 여전히 200줄을 넘는다. 이번 Step에서 `booting`/부트 이펙트/`SyncFlushBridge` 마운트가 추가로 얹혔기 때문. 이 파일은 감사보고서 2.2절이 이미 **"폐기 대상: App.jsx 화면 스위치 전체 — RouterProvider + Providers로 대체. 로직을 고치면 고칠수록 거대 신"**이라고 못 박아둔 Step 3(라우터 셸)의 교체 대상이라, 지금 `screen`/`appPage` switch 구조 자체를 쪼개는 건 Step 3에서 버려질 코드를 만드는 낭비라고 판단해 하지 않았다. Step 3에서 라우트 트리로 갈아끼울 때 자연히 200줄 아래로 내려갈 것.
- **검증 로그:** `npm test` → `tests 88 / pass 88 / fail 0` (동일). `npm run build` → 성공(120 modules). `npm run lint` → 새 훅에서 `react(set-state-in-effect)` 경고가 한 번 떴으나 마운트 시 중복 setState를 제거해 해결, 최종적으로 기존 8개 경고 외 신규 경고 0개.
- **알려진 한계 (typecheck):** Step 1과 동일 — 이 저장소엔 아직 TypeScript가 없어 `tsc --noEmit`을 못 돌렸다. `any`/`unknown`은 쓰지 않았고 `npm run lint`/`npm test`/`npm run build`로 대체.
- **브라우저 수동 검증 미완:** 이번 세션의 Browser pane이 "표시되지 않음"(페인트 안 됨) 상태라 실제 로그인→hydrate→화면 전환을 눈으로 확인하지 못했다. `npm run build`가 120개 모듈을 전부 정상 번들링한 것으로 순환 참조·임포트 오류는 없음을 확인했지만, **실제 Supabase 로그인 시나리오(4.2절 항목 1~3)는 아직 사람이 브라우저에서 확인해야 한다.**
  - **후속 (Step 3에서 해결):** 원인은 이전 세션에서 죽지 않고 5173 포트를 물고 있던 고아 Vite 프로세스(PID)였다. `taskkill`로 정리하고 `.claude/launch.json`에 `react-app-dev`(포트 자동 대체 `autoPort`) 항목을 추가한 뒤로는 Browser pane이 정상 렌더링된다. Step 3부터는 실제 브라우저로 매 단계 검증한다. 게스트 로그인/hydration lock 미표시/설정 저장까지는 Step 3 작업 중 재확인 완료(아래 로그) — 실제 Supabase 계정 로그인 시나리오만 여전히 사람 확인이 필요하다(테스트 계정 자격증명이 이 세션에 없음).

### [x] Step 3 — 라우터 셸 (달력은 아직 내용 동일)

- 추가: `react-router-dom`. `src/app/App.tsx` 라우트 트리.
- 변경: `App.jsx`의 `screen`/`appPage` → `/auth`, `/onboarding`, `/app`, `/app/day/:date`, `/app/me`, …  
  **첫 패스에서는 기존 페이지 컴포넌트를 라우트에 그대로 연결.** `MainPage`의 selected 게이트만 `navigate`로 바꿈.
- 변경: `BottomNav.jsx`, `SideMenu.jsx`, `MyPage.jsx`의 `onOpen(page)` → `navigate`.
- 완료: 브라우저 뒤로가기로 일지→달력. **달력 `viewDate`가 유지되는지** 확인.

**구현 로그 (2026-08-26):**

- 설치: `react-router-dom@7.18.2`.
- 신규: [`src/app/App.jsx`](../react-app/src/app/App.jsx) — 옛 `src/App.jsx`(350줄, screen/appPage 스위치)를 대체. 세션·부트·토스트만 남기고 `<Routes>` 3개(`/auth`, `/onboarding`, `/app/*`) + catch-all(`Navigate to="/auth"`). 167줄. **옛 `src/App.jsx`는 삭제**(참조하던 곳은 `main.jsx` 하나뿐이었음을 확인 후 제거).
- 신규: [`src/app/AppShell.jsx`](../react-app/src/app/AppShell.jsx) — `/app/*` 레이아웃 라우트. 하단탭·사이드메뉴·알림패널을 여기서 한 번만 마운트하고, 중첩 `<Routes>`로 `cars`/`clients`/`me`/`me/profile`/`me/settings`/`expenses`/`receivables`/`report`/`tax`(옛 `invoices`)/`drivers`/`revenue`/`soon` 12개 화면 + `index`/`day/:date`를 그린다. 158줄.
- 신규: [`src/app/MainPageRoute.jsx`](../react-app/src/app/MainPageRoute.jsx) — `index`와 `day/:date` 두 라우트가 **같은 `MainPageRoute` 컴포넌트**를 element로 쓰게 해서, 전환 시 `MainPage`가 언마운트되지 않고 `viewDate`/`workData`/`settings` state가 그대로 유지되도록 했다(Step 3 완료 조건의 핵심). `useParams().date`를 `parseDateKeySelection()`([`calendar.js`](../react-app/src/lib/calendar.js) 신규 함수)으로 옛 `selected` 모양(`{dateKey, month, day}`)으로 바꿔 `MainPage`에 그대로 넘긴다.
- 신규: [`src/app/ComingSoonRoute.jsx`](../react-app/src/app/ComingSoonRoute.jsx) — 옛 `soonTitle`/`soonBack`(App 상태)를 `?title=&back=` 쿼리로 옮김.
- 신규: [`src/app/RequireSession.jsx`](../react-app/src/app/RequireSession.jsx) — **브라우저 실측 중 발견한 갭**. 라우터 도입 전에는 `screen` state가 항상 `'auth'`로 시작해 로그인 없이 앱 화면을 볼 방법이 없었지만, 라우팅은 URL만 보고 매칭하므로 세션 없이 `/app/...`를 새로고침/직접 진입하면 그대로 렌더링돼 버렸다. `/onboarding`, `/app/*`를 이 가드로 감싸 `booting` 중엔 로딩 문구, `session` 없으면 `/auth`로 리다이렉트하도록 고쳤다.
- 신규: [`src/app/lazyPages.js`](../react-app/src/app/lazyPages.js) — 옛 `App.jsx`의 `lazy()` 12개를 그대로 옮김(200줄 제한 때문에 파일 분리, 동작 무변경).
- 변경: [`src/main.jsx`](../react-app/src/main.jsx) — `<BrowserRouter>`로 감싸고 `./app/App.jsx`를 로드.
- 변경: [`src/lib/calendar.js`](../react-app/src/lib/calendar.js) — `parseDateKeySelection(dateKey)` 추가(위 참고).
- **onBack 계약 유지:** 옛 App.jsx는 관리 화면 전부의 뒤로가기가 예외 없이 `appPage==='home'`(달력)으로 갔다 — `soonBack`으로 분기하는 'soon' 페이지만 예외. AppShell도 동일하게 각 라우트의 `onBack`을 `navigate('/app')` 절대 경로로 고정했고(`navigate(-1)` 같은 상대 이동은 쓰지 않음 — 북마크/새로고침 진입 시 예측 불가), 'soon'만 쿼리의 `back` 값으로 분기한다.
- **완료 조건 실측 검증(브라우저):** 게스트 로그인 → 10월로 달력 이동 → 10/3 클릭 → URL이 `/app/day/2026-10-03`로 바뀜 → 브라우저 "뒤로" → URL `/app`로 복귀 + **달력이 10월을 그대로 유지**(스크린샷으로 확인, 새로고침 없이 8월로 리셋되지 않음). 사이드메뉴→차량관리→뒤로가기, 마이페이지→문자문구설정(쿼리 `back=mypage`)→뒤로가기(`/app/me`로 복귀), 하단탭 매출/일일운행(오늘 날짜로 점프) 전부 실측. 콘솔 에러 0건.
- **세션 가드도 실측 검증:** 세션 없는 상태로 `/app/day/2026-08-26` 딥링크 진입 → `/auth`로 리다이렉트 확인(새 탭 기준, 에러 없음). *(참고: 최초 시도 때 낡은 Vite HMR 잔여 상태에서 `RequireSession is not defined` 콘솔 에러가 한 번 나타났으나 새 탭에서 재현되지 않아 개발 서버 HMR 일시 오류로 판단 — 코드 결함 아님. `npm run build` 132 모듈 정상 번들링으로도 뒷받침됨.)*
- **검증 로그:** `npm test` → `tests 88 / pass 88 / fail 0`(변함없음 — 이번 Step은 lib 순수함수를 건드리지 않음). `npm run build` → 132 modules, 성공. `npm run lint` → 기존 8개 경고 위치만 재배치(AppShell.jsx로 옮긴 `notifTick` 경고 1개), 신규 경고 0개(`goHome`을 `useCallback`으로 감싸 `missing dependency` 경고는 해결).
- **알려진 한계:**
  - typecheck 갭은 Step 1/2와 동일(TypeScript 미설치).
  - 프로덕션 배포 시 정적 호스트가 `/app/day/...` 같은 하위 경로 새로고침을 index.html로 되돌려주는 SPA fallback(rewrite) 설정이 필요하다 — Vite dev 서버는 기본 지원하지만 `dist/` 정적 배포본은 호스트 설정(Netlify `_redirects`, Vercel rewrites, nginx `try_files` 등)이 아직 없다. 배포 단계에서 챙겨야 한다.
  - `AppShell.jsx`의 15개 라우트는 여전히 `screen`/`appPage` 시절 이름(`tax`↔옛 `invoices` 등)을 유지한 1:1 매핑이다. `migration-plan.md`가 제시한 전체 URL 체계(`/app/me/support`, `/app/expenses?tab=maint` 등)로의 정교화는 이후 슬라이스(Step 5~10, 화면별 재작성)에서 다룬다 — 지금은 "기존 페이지 컴포넌트를 라우트에 그대로 연결"이라는 이 Step의 명시적 범위를 지켰다.

### [x] Step 4 — 도메인 폴더 이동 (설계안 슬라이스 2)

- 이동: `finance.js` → `domain/finance-revenue.ts` 등. `workData` 콜/payments → `domain/day-record.ts`, `domain/payments.ts`.
- `originalWindow.js` 테스트는 경로만 수정.
- 완료: `npm test` 동일 시나리오.

**구현 로그 (2026-08-26):**

`src/domain/` 신설. 아직 TypeScript가 없어(`.ts` 아님) 파일명은 원래 이름 그대로 두고 폴더만 옮겼다 — 확장자 변경은 Step 11(JS→TS) 몫.

- **완전 이동(순수, I/O 없음, 검증: `readJsonKey`/`commit*`/`supabase` import 0건)**: `money.js`, `formatPhone.js`, `calendar.js`, `day-record.js`, `call-details.js`, `payments.js`, `finance.js`(627줄 — migration-plan.md 5절이 명시한 "순수 계산 집약 파일" 예외 그대로 적용, 로직 무변경), `finance.fixtures.js`, `receivables.js`, `taxInvoices.js`, `fuelRecords.js`, `maintenanceRecords.js`, `miscExpenseRecords.js`. 서로의 상대경로(`./x.js`)가 전부 domain/ 안에서 유지되게 **같은 배치에 한꺼번에** 옮겨서, 이 12개 파일은 자기들끼리의 import 문을 단 한 줄도 안 고쳤다.
- **분리(mixed I/O+순수 → workData.js와 같은 패턴)**: `cars.js`, `clients.js`, `drivers.js`, `practiceSettings.js`, `expenses.js`, `invoices.js` 6개를 각각 `domain/{name}.js`(순수 계산)와 `lib/{name}.js`(localStorage `load*`/`save*` I/O + `export * from '../domain/{name}.js'` 배럴)로 쪼갰다. `practiceSettings.js`의 `applyTheme`은 `document`를 직접 바꾸는 부작용이라 순수 함수가 아니라고 보고 `lib/`에 남겼다.
- **컴포넌트 임포트 0곳 변경 — 얇은 shim 5개로 흡수**: `calendar.js`/`finance.js`/`formatPhone.js`/`money.js`/`receivables.js`는 컴포넌트 15개 파일이 `../lib/X.js`로 직접 참조하고 있어서, 그 경로에 `export * from '../domain/X.js'` 한 줄짜리 shim을 남겨뒀다. `cars.js`/`clients.js`/`drivers.js`/`practiceSettings.js`/`expenses.js`/`invoices.js`/`workData.js`/`profile.js`/`ownerFinance.js`/`report.js`/`notifications.js`/`cloudSync.js`는 애초에 파일 위치(`lib/`)가 안 바뀌므로 별도 shim이 필요 없었다 — 결과적으로 **`src/components/*.jsx`는 이번 Step에서 단 한 글자도 안 바뀌었다.** (shim들은 Step 5~10에서 각 화면을 다시 짤 때 domain/ 경로로 직접 바꾸면서 자연히 없어질 임시 다리.)
- **`lib/workData.js`**: `export * from './day-record.js'` 등 3줄을 `'../domain/day-record.js'`로 수정(day-record/call-details/payments가 lib를 떠났으므로).
- **`lib/cloudSync.js`**: `fuelRecords.js`/`maintenanceRecords.js`/`miscExpenseRecords.js`/`taxInvoices.js` 임포트 4곳을 `../domain/...`로 수정. 그 외 828줄 내부 로직은 무변경.
- **테스트 12개 이동**: `finance.test.js`, `workData.test.js`, `practiceSettings.test.js`, `receivables-invoices.test.js`, `drivers-cloud.test.js`, `cars.test.js`, `clients.test.js`, `expenses.test.js`, `fuelRecords.test.js`, `maintenanceRecords.test.js`, `miscExpenseRecords.test.js`, `taxInvoices.test.js` 전부 `src/domain/`으로. `originalWindow.js`(jsdom 테스트 하네스)는 `lib/`에 그대로 뒀으므로 이를 참조하는 테스트(`finance.test.js`, `receivables-invoices.test.js`, `drivers-cloud.test.js`)는 `../lib/originalWindow.js`로 고쳤다. `cloudSync.js`/`ownerFinance.js`를 함께 쓰는 테스트도 같은 이유로 `../lib/...`로 고쳤다. `workData.test.js`/`practiceSettings.test.js`/`receivables-invoices.test.js`는 옛 `./workData.js` 배럴 경로 대신 실제 함수가 사는 `./day-record.js` / `./call-details.js` / `./payments.js`로 정확히 나눠 import하도록 고쳤다(배럴이 아니라 원본을 가리키게).
- **`package.json`**: `test` 스크립트의 12개 경로를 전부 `src/lib/*` → `src/domain/*`로 갱신.
- **검증 로그:** `npm test` → `tests 88 / pass 88 / fail 0`(첫 시도에 한 번에 통과 — 회귀 0건). `npm run build` → 144 modules, 성공. `npm run lint` → 신규 경고 0개.
- **브라우저 실측 검증:** 게스트 로그인 → 차량 관리에서 "서울12가3456" 실제 등록(→ `upsertCar`(domain) → `saveCars`(lib I/O) → `commitCars`(store) → `localStorage['reactPracticeCars:guest']` 전체 체인 확인) → 매출/거래처/차량관리/미수금/세금계산서 5개 라우트를 순회하며 콘솔 에러 0건 확인. (첫 시도 때 뜬 "RevenuePage.jsx dynamically imported module 실패" 콘솔 로그는 이전 dev 서버 재시작 시점의 잔존 로그로, 새 탭에서 동일 라우트 재확인 시 에러 없이 재현 안 됨 — Step 3와 같은 유형의 HMR 잔여 오탐.)
- **알려진 한계:** typecheck 갭은 이전 Step과 동일(TypeScript 미설치). Shim 5개(`calendar`/`finance`/`formatPhone`/`money`/`receivables`)는 의도적인 임시 다리이며 영구 구조가 아니다 — 다음에 그 컴포넌트를 만지는 Step에서 `../domain/`으로 바로 임포트하도록 정리할 것.

### [x] Step 0-4 감사 보완 (사용자 지시 — Step 5 착수 전 필수, 별도 `fix:` 커밋)

Step 0~4 완료 후 사용자가 지시한 7개 항목. Step 5는 이 보완이 끝나기 전까지 시작하지 않았다.

**1. hydrationCompleted → idle/hydrating/ready/failed 상태기계**

- [`src/store/app-store.js`](../react-app/src/store/app-store.js) — `hydration.completed`(boolean) → `hydration.status: 'idle'|'hydrating'|'ready'|'failed'`. 기본값 `idle`(게스트/로그인 전은 잠글 이유가 없다).
- [`src/lib/cloudSync.js`](../react-app/src/lib/cloudSync.js) — `hydrateFromSupabase`가 시작 시 `hydrating`, 성공 시 `ready`, **catch에서 `failed`로 남기고 에러를 다시 던진다**(`finally`가 아니라 명시적 `try/catch` — 이전엔 `finally`에서 항상 `completed:true`를 찍어서, 실패해도 store만 보면 성공처럼 보이는 불일치가 있었다). `scheduleCloudSync`/`flushCloudSync`는 이제 **store의 같은 `status` 값 하나**를 읽어서 원격 쓰기 가능 여부를 판단한다 — UI 잠금(useHydrationLock)과 원격 쓰기 가능 상태가 서로 다른 값을 보고 어긋나는 경우가 구조적으로 없어졌다.
- `failed` 이후에는 `scheduleCloudSync`가 `syncQueue.pendingWhileBlocked = true`만 남기고 조용히 리턴 — 명시적 재시도(`retryHydrate()` 신규 export, 마지막 cloudUserId/cloudOwnerKey로 `hydrateFromSupabase` 재호출)가 `ready`를 만들기 전까지 원격 upsert 없음. `useHydrationLock`은 `status === 'hydrating'`일 때만 잠근다 — `failed`에서는 기존처럼 로컬 편집은 계속 허용(fail-open).

**2. 동기화 큐 — runningPromise + dirty/pendingWhileBlocked**

- `cloudSync.js`의 `let syncing = false`를 `syncQueue = { runningPromise, dirty, pendingWhileBlocked }`로 교체. `queueSync()`가 `do { dirty=false; await syncAll() } while (dirty)` 루프를 돌며, 실행 중 또 `queueSync`가 불리면(=변경이 들어오면) `dirty=true`만 표시하고 **같은 실행 Promise**를 돌려준다.
- `flushCloudSync()`는 이제 `queueSync()`를 그대로 await한다 — 예전처럼 "이미 돌고 있으면 `scheduleCloudSync()`로 새 600ms 타이머만 잡고 즉시 리턴"하지 않는다(그 타이머는 pagehide 도중엔 살아남는다는 보장이 없어 변경이 유실될 수 있었다). `syncAll` 내부의 `if (syncing) {...}` 재진입 가드는 `queueSync`가 이미 직렬화하므로 제거.
- 성공 hydrate 직후 `pendingWhileBlocked`가 있으면 `scheduleCloudSync()`를 자동으로 한 번 더 부른다 — "막혀 있는 동안 생긴 변경"이 유실되지 않고 ready가 되자마자 나간다.

**3. app-store — initializeOwnerFromPersist / replaceOwnerState + persist·슬라이스 매핑 분리**

- 신규 [`src/store/owner-state.js`](../react-app/src/store/owner-state.js) — `initializeOwnerFromPersist(ownerKey)`(localStorage 9개 키를 store로 읽기만 함, 쓰기·동기화 없음), `replaceOwnerState(ownerKey, snapshot, { sync })`(스냅샷을 owner 슬라이스 전체에 반영, `sync:false`면 원격 동기화 예약 안 함).
- `App.jsx`가 `ownerKey`가 바뀔 때마다 `initializeOwnerFromPersist`를 부르도록 이펙트 추가 — 게스트든 로그인이든 앱 부트가 반드시 이 관문을 거친다. `cloudSync.js`의 `hydrateFromSupabase`는 성공 블록 끝에서 `collectPracticeSnapshot` 결과를 `replaceOwnerState(ownerKey, snapshot, { sync: false })`로 store에 반영한다 — 그 전에는 hydrate가 localStorage에만 쓰고 store는 갱신 안 됐다.
- **버그 수정**: `app-store.js`의 `commit(domain, ownerKey, value)`가 기본으로 `state[domain] = ...`를 했는데, persist 도메인 이름(`workData`)과 실제 state 슬라이스 이름(`workLogs`)이 다른 경우 `commitWorkData`가 의도치 않게 `state.workData`라는 **존재하지 않던 프로퍼티**를 만들고 있었다(아무도 안 읽어서 드러나지 않았을 뿐). `commit()`에 `applyState` 옵션을 추가해 `commitWorkData`가 명시적으로 `state.workLogs`만 갱신하게 고쳤다 — `app-store.test.js`에 `state.workData === undefined`를 확인하는 회귀 테스트 추가.

**4. `/app/day/:date` — location.state.from + 닫기 분기**

- [`src/app/MainPageRoute.jsx`](../react-app/src/app/MainPageRoute.jsx) — 달력 셀 클릭(`onSelectDay`)이 `navigate(path, { state: { from: 'calendar' } })`로 진입 경로를 남긴다. 닫기는 [`src/app/workLogNavigation.js`](../react-app/src/app/workLogNavigation.js)의 순수 함수 `resolveWorkLogCloseTarget(locationState)`가 판단: `from === 'calendar'`면 `navigate(-1)`, 아니면(알림/하단탭 "일일운행" 점프/새로고침 등 직접 진입) `navigate('/app', { replace: true })`.
- **브라우저 실측**: 달력 셀 클릭 → `history.state.usr.from === 'calendar'` 확인 → 닫기 → `navigate(-1)`로 `/app` 복귀. 하단탭 "일일운행" 점프(state 없음) → 닫기 → `idx`가 그대로인 채 `/app`로 교체(진짜 replace) → 브라우저 "뒤로가기"를 눌러도 일지로 재진입하지 않고 `/app`에 남음 — 완료 조건 그대로 재현.

**5. body classList — 전용 브리지로 격리**

- `App.jsx`의 `document.body.classList.toggle('account-flow-active', ...)` 인라인 이펙트를 [`providers.jsx`](../react-app/src/app/providers.jsx)의 `AccountFlowBodyClass` 컴포넌트로 옮겼다. `SyncFlushBridge`의 리스너 등록/해제 로직도 순수 함수 `attachSyncFlushListeners`([`syncFlushListeners.js`](../react-app/src/app/syncFlushListeners.js))로 빼서 React 없이 테스트 가능하게 했다(부수 효과: Fast Refresh 경고도 없어짐 — 컴포넌트 파일에 순수 함수를 같이 export하면 oxlint가 경고한다). `InlineExpandHost`는 그대로 두었고(Step 6 폐기 예정, 손 안 댐), 새 코드 어디에도 그 style.maxHeight 직접조작 패턴을 추가하지 않았다.
- **브라우저 실측**: `/auth`에서 `document.body.className === 'account-flow-active'`, `/app`에서 `''` 확인.

**6. 테스트 8종 추가 (총 88 → 126, `--experimental-test-module-mocks` 플래그 신규 필요)**

| 요구 항목 | 파일 |
|---|---|
| persist 9개 키 round-trip | [`store/persist.test.js`](../react-app/src/store/persist.test.js) |
| store 초기화/state shape (+ `state.workData` 안 생기는 회귀) | [`store/app-store.test.js`](../react-app/src/store/app-store.test.js) |
| hydrate 실패 상태 + in-flight flush(dirty 재실행) | [`lib/cloudSync.test.js`](../react-app/src/lib/cloudSync.test.js) — 가짜 supabase 클라이언트를 `node:test`의 `mock.module()`로 주입 |
| StrictMode 리스너 cleanup | [`app/syncFlushListeners.test.js`](../react-app/src/app/syncFlushListeners.test.js) — 가짜 이벤트 타깃으로 마운트→cleanup→재마운트 반복 |
| 비로그인 딥링크 | [`app/sessionGate.test.js`](../react-app/src/app/sessionGate.test.js) — `RequireSession.jsx`가 쓰는 순수 판정 함수 |
| 달력 월 보존(데이터 계약) | [`domain/calendar.test.js`](../react-app/src/domain/calendar.test.js) — `parseDateKeySelection` |
| 일지 닫기 후 Back 비재진입 | [`app/workLogNavigation.test.js`](../react-app/src/app/workLogNavigation.test.js) — `resolveWorkLogCloseTarget` |
| (부수) owner-state 초기화/치환 | [`store/owner-state.test.js`](../react-app/src/store/owner-state.test.js) |

- **컴포넌트 자체는 렌더 테스트하지 않았다** — 이 프로젝트엔 React Testing Library가 없고(`node:test`는 JSX를 파싱 못 함), 새로 추가하는 건 이번 감사 보완 범위를 넘는 인프라 변경이라 판단했다. 대신 라우팅/StrictMode/딥링크 판단 로직을 **순수 함수로 뽑아** 그 함수를 테스트하고(`resolveWorkLogCloseTarget`, `resolveSessionGate`, `attachSyncFlushListeners`), React가 실제로 그 로직대로 렌더/내비게이트하는지는 위 4번·5번 항목처럼 **브라우저 실측**으로 확인했다. "달력 월 보존"도 마찬가지로 진짜 리액트 재조정(reconciliation) 보장 자체는 Step 3에서 이미 브라우저로 검증했고, 여기서는 그 트릭이 의존하는 데이터 계약(`parseDateKeySelection`)만 단위테스트로 추가했다.
- **cloudSync.test.js가 겪은 실제 함정(기록해 둠)**: `app-store.js`/`owner-state.js`를 파일 맨 위에서 **정적** import하면, `mock.module()`이 그 파일 본문(위쪽 부작용 import)에서 실행되기도 전에 ESM 링커가 이미 전체 모듈 그래프(→ cloudSync.js → 진짜 supabaseClient.js)를 링크해 버려서 스텁이 안 먹고, 그 결과 진짜 `@supabase/supabase-js` 클라이언트가 만들어지며 프로세스가 안 끝나고 매달렸다(Node 24 기준 재현 확인). `mock.module()` 등록 뒤 **동적** `await import()`로 바꿔서 해결 — `app-store.test.js`/`owner-state.test.js`에 그대로 남아 있고, 같은 함정을 또 밟지 않도록 파일 맨 위에 이유를 적어 뒀다. 신규 [`testSupport/stubSupabaseClient.js`](../react-app/src/testSupport/stubSupabaseClient.js)/[`testSupport/setupDom.js`](../react-app/src/testSupport/setupDom.js)는 이 두 파일과 `cloudSync.test.js`가 공유한다.

**7. 재검증**

- `npm test` → `tests 126 / suites 38 / pass 126 / fail 0`(회귀 0건, 신규 38개 전부 통과). `npm run build` → 144 modules 성공. `npm run lint` → 기존 8개 경고만, 신규 0개.
- 브라우저(4번·5번 항목 기록 참고) — 게스트 로그인, 달력 셀→일지→뒤로가기(재진입 확인), 하단탭 일일운행 점프→일지→닫기→뒤로가기(비재진입 확인), `/auth`·`/app` body 클래스, 콘솔 에러 0건.
- **알려진 한계**: typecheck 갭은 이전 Step들과 동일(TypeScript 미설치). `cloudSync.js`가 904줄로 더 커졌다 — `migration-plan.md` 5절의 "api/hydrate.ts 부트 시퀀스" 예외 항목에 해당하지만, Step 9(기사 연동) 즈음 `api/`로 실제 분해할 때 더는 미루지 않아야 한다. `retryHydrate()`를 호출할 UI(재시도 버튼)는 아직 없다 — 함수만 준비돼 있고, 붙이는 건 설정/마이페이지 화면을 다시 짜는 Step에서.

### [x] Step 0-4 감사 보완 2차 (사용자 지시 — Step 5 착수 전 필수, 별도 `fix:` 커밋)

1차 보완의 `pendingWhileBlocked`(메모리 전용 boolean)·hydrate의 "실패해도 부분 반영"·`retryHydrate()`(UI 없음) 세 가지를 사용자가 다시 지적. Step 5는 이 2차 보완이 끝나기 전까지 시작하지 않았다.

**1~2. hydrate — 조회 실패 전부 판정, 부분 반영 없음 (all-or-nothing)**

- 1차 보완의 `hydrateFromSupabase`는 `profiles`/`vehicles`/`clients`/`driver_links`/`fuel_records`/`maintenance_records`/`misc_expense_records` 조회 실패를 개별적으로 `console.warn`만 하고 로컬을 "유지"하며 계속 진행했다. 그런데 **`transport_details`만 이 방어가 빠져 있었다** — `daily_logs` 조회만 성공하면 그날 레코드의 `callDetails`를 빈 배열로 초기화한 뒤, `transport_details`가 실패해도 그 빈 배열을 그대로 `writeJson`했다. 즉 네트워크 순간 실패 한 번으로 **실제 콜상세 데이터가 로컬에서 지워질 수 있는** 버그였다.
- 재작성: 신규 [`src/lib/hydrateMerge.js`](../react-app/src/lib/hydrateMerge.js)(150줄, 순수 함수만)로 병합 로직을 전부 분리하고, [`src/lib/cloudSync.js`](../react-app/src/lib/cloudSync.js)의 `hydrateFromSupabase`/`performHydrate`를 **"조회 전부 → 에러 전부 판정(`throwIfAnyHydrateError`) → 성공했을 때만 메모리에서 병합 → 마지막에 `replaceOwnerState` 한 번으로 커밋"** 구조로 다시 짰다. `profiles`/`vehicles`/`clients`/`driver_links` 1차 배치, `daily_logs`/`transport_details`/`fuel_records`/`maintenance_records`/`misc_expense_records` 2차 배치(메인 차량이 있을 때만), `tax_invoices` 최종 조회 — **셋 중 하나라도 error가 있으면 즉시 던지고, localStorage/store 어디에도 쓰지 않는다.** `transport_details` 실패가 `callDetails`를 지우던 경로 자체가 이제 존재하지 않는다(병합 함수 `mergeWorkDataFromRows`는 호출부가 이미 성공을 확인했을 때만 불린다).
- 회귀 테스트: [`hydrateMerge.test.js`](../react-app/src/lib/hydrateMerge.test.js)(단위, 13개)와 [`cloudSync.test.js`](../react-app/src/lib/cloudSync.test.js)의 `transport_details 조회가 실패하면 callDetails가 []로 지워지지 않고 failed로 남는다 (핵심 회귀 테스트)`가 콜상세가 있는 로컬 데이터를 시딩한 뒤 `transport_details`만 `{ data:null, error }`로 실패시켜 로컬 값이 **바이트 단위로 그대로**임을 확인한다.

**3. `{ data:null, error }` 현실적 테스트 (throw가 아니라 실제 Supabase 실패 모양)**

- [`cloudSync.test.js`](../react-app/src/lib/cloudSync.test.js)에 `profiles`/`vehicles`/`clients`/`driver_links`/`tax_invoices`/`transport_details` 6개 테이블 각각을 `{ data:null, error:{ message } }`로 실패시키는 개별 테스트를 추가 — 전부 `status==='failed'`, 해당 도메인 localStorage 불변, `profiles.upsert` 호출 0회를 확인한다. 가짜 supabase 클라이언트에 테이블·메서드별 호출 횟수 카운터(`callCounts`)를 추가해 "던졌으니 아마 안 갔겠지"가 아니라 실제 호출 수를 assert한다.

**4. durable dirty journal — `pendingWhileBlocked`(메모리) → localStorage 저널**

- 신규 [`src/lib/dirtyJournal.js`](../react-app/src/lib/dirtyJournal.js)(63줄) — `markDirty(ownerKey, domain)`/`hasDirty(ownerKey)`/`getDirtyDomains(ownerKey)`/`clearDirty(ownerKey)`. `reactPracticeDirtyJournal:<ownerKey>` 키에 도메인별 revision 카운터를 저장한다 — 새로고침해도 "이 owner의 이 도메인은 아직 서버에 못 보낸 로컬 변경이 있다"는 사실이 사라지지 않는다.
- [`src/store/app-store.js`](../react-app/src/store/app-store.js)의 `commitBatch`가 `syncToCloud:true`인 모든 커밋에서 `markDirty`를 호출(로컬 편집이 생기는 시점에 저널이 남는다). `cloudSync.js`의 `queueSync`는 `syncAll` 성공 직후 `clearDirty` 호출(서버 push가 실제로 성공했을 때만 지운다 — 실패하면 저널은 그대로 남아 다음 재시도 대상). `scheduleCloudSync`는 이제 hydrate가 준비 안 됐을 때 **아무것도 하지 않는다**(markDirty는 이미 호출부가 했으므로 중복 표시 불필요) — 예전의 메모리 전용 `pendingWhileBlocked` 플래그는 제거.
- 통합 테스트(`cloudSync.test.js`): failed 상태를 만든 뒤 → 로컬 편집(`markDirty`) → 서버는 이제 정상이지만 편집과 다른 값을 반환하도록 세팅 → `retryHydrate()` → ready가 됐는데도 dirty 도메인은 **로컬 편집 값이 그대로**(서버 값으로 안 덮임) → `hasDirty`가 여전히 true(hydrate 자체는 저널을 안 지운다) → 600ms 뒤 정확히 upsert 1회 + `hasDirty` false(성공적으로 플러시되면 지워진다)까지 한 흐름으로 확인.
- 단위 테스트: [`dirtyJournal.test.js`](../react-app/src/lib/dirtyJournal.test.js) 6개(mark/has/getDomains/clear, localStorage 실제 저장 확인, owner별 독립, revision 누적).

**5. 재시도 UI + 재시도 중 로컬 편집 보호**

- 신규 [`src/app/HydrationRetryBanner.jsx`](../react-app/src/app/HydrationRetryBanner.jsx) — hydration `status==='failed'`일 때만 보이는 배너 + "다시 시도" 버튼(`retryHydrate()` 호출). `AppShell.jsx`에 마운트해 `/app/*` 모든 화면에서 보인다. 1차 보완에서 "함수만 준비, 붙이는 UI는 없음"이라고 남겼던 갭을 메웠다.
- 재시도 중 로컬 편집 보호는 "편집 잠금"이 아니라(사용자가 오프라인에서도 계속 쓸 수 있어야 한다는 기존 fail-open 철학과 상충) **hydrate 커밋 직전 dirty 도메인 재적용**으로 구현했다(4번 항목의 통합 테스트가 그대로 이 요구사항의 검증이다) — `getDirtyDomains(ownerKey)`로 아직 서버에 못 보낸 도메인을 확인하고, 그 도메인만 "지금 이 순간"의 로컬 값으로 서버 병합 결과를 덮어써서 커밋한다.

**6. `assertCloudWriteReady()` — 큐 밖에서 직접 나가는 mutation 공통 게이트**

- [`src/lib/cloudSync.js`](../react-app/src/lib/cloudSync.js)에 `assertCloudWriteReady()` 추가 — `cloudUserId`/`cloudOwnerKey` 없거나 `hydration.status !== 'ready'`면 던진다. `deleteVehicleFromSupabase`/`deleteClientFromSupabase`/`findOverlappingDriverLinkOnSupabase`/`upsertDriverLinkOnSupabase`/`updateDriverLinkStatusOnSupabase`/`deleteDriverLinkOnSupabase`/`saveDriverInviteToCloud`(로그인 자체가 없는 게스트는 예외 — 조용히 스킵하는 기존 동작 유지, 로그인은 했는데 hydrate가 준비 안 된 경우만 던진다) 앞에 삽입.
- `syncVehicles`/`syncClients`/`syncWorkData`/`syncFuelRecords`/`syncMaintenanceRecords`/`syncMiscExpenseRecords`/`syncTaxInvoices`(=`syncAll` 내부)는 **큐(`scheduleCloudSync`→`queueSync`) 자체가 이미 `isHydrationReady()`를 통과해야만 도달**하므로 별도 게이트를 추가하지 않았다(사용자 지시의 "또는 동일한 큐를 통과시켜라" 조건을 큐 경로가 이미 만족).
- **알려진 한계(의도적, 투명하게 기록)**: `deleteVehicleFromSupabase` 등은 UI 호출부(`CarManagementPage.jsx`/`ClientManagementPage.jsx`/`DriverConnectionPage.jsx`)가 이미 `.catch()`로 실패를 잡아 토스트만 띄우고 로컬 상태는 그대로 두므로, `assertCloudWriteReady()`가 막았을 때 안전하게 실패하는 것까지만 이번 라운드 범위다. **durable 재시도 큐(실패한 삭제/초대를 저장해 뒀다가 자동으로 다시 보내는 것)는 만들지 않았다** — 반쪽짜리로 만드는 것보다 "지금은 사용자가 다시 시도해야 한다"고 정직하게 남기는 쪽을 택했다. 다음에 이 영역을 만질 Step(9, 기사 연동)에서 durable 큐로 확장할지 판단할 것.

**7. app-store — 원자적 `commitBatch`/`replaceOwnerState` (notify 정확히 1회)**

- [`src/store/app-store.js`](../react-app/src/store/app-store.js)에 `commitBatch(entries, { persist, syncToCloud })` 신설 — 여러 도메인을 `persist`+`state` 반영까지 전부 끝낸 **뒤에** `notify()`를 정확히 한 번만 부른다. 기존 `commit()`은 `commitBatch([단일 entry])`의 얇은 래퍼로 재정의.
- [`src/store/owner-state.js`](../react-app/src/store/owner-state.js)의 `initializeOwnerFromPersist`/`replaceOwnerState`를 `commitBatch` 기반으로 재작성 — 이전엔 도메인 수만큼(`initializeOwnerFromPersist`는 최대 9번, `replaceOwnerState`는 최대 8번) `commit()`을 반복 호출해 구독자가 "cars만 반영되고 profile은 아직"인 중간 state를 볼 수 있었다. 이제 한 번에 반영된다.
- 회귀 테스트: [`app-store.test.js`](../react-app/src/store/app-store.js)의 `commitBatch는 원자적이다(notify 정확히 한 번)` — 3개 도메인을 한 번에 커밋하며 구독자의 notify 호출 횟수(=1)와 "cars는 있는데 profile은 없는" 중간 state를 실제로 본 적이 있는지(=없어야 함)를 둘 다 확인.

**8. single-flight + stale 세대 보호**

- 신규 [`src/lib/singleFlight.js`](../react-app/src/lib/singleFlight.js)(30줄) — 같은 key로 동시에 부르면 factory를 한 번만 실행하고 같은 Promise를 공유한다.
- `hydrateFromSupabase(userId, ownerKey)` = `singleFlight('hydrate:'+ownerKey, ...)`로 감쌌다. 전역 `hydrateGeneration` 카운터를 factory 안에서(=실제로 실행될 때만) 증가시키고, 병합이 끝난 뒤 커밋 직전 `myGeneration !== hydrateGeneration`이면 조용히 버린다(다른 owner의 더 최신 hydrate가 이미 진행됐다는 뜻) — StrictMode의 이펙트 중복 실행이나 오래된 요청이 최신 상태를 덮어쓰는 사고를 막는다.
- `src/app/boot.js`의 `restoreSessionOnBoot()`도 `singleFlight('boot:restoreSession', ...)`로 감쌌다.
- 테스트: [`singleFlight.test.js`](../react-app/src/lib/singleFlight.test.js) 4개(동시 호출 dedup, 순차 재실행, 실패 후 정리, 독립 key)와 `cloudSync.test.js`의 `StrictMode식 동시 2회 호출에서도 profiles 조회는 한 번만 나가고 조기 ready가 없다`(`Promise.all`로 같은 owner를 2번 동시 호출 → 조회 1회, 두 Promise가 같은 결과 공유).

**9. `sync:false`/`syncToCloud:false` — state만 보지 않고 호출 횟수 직접 spy, 테스트 독립성**

- [`testSupport/stubSupabaseClient.js`](../react-app/src/testSupport/stubSupabaseClient.js)에 `stubSupabaseCallCounts`/`resetStubSupabaseCallCounts()`를 추가해 select/upsert/insert/update/delete 호출 횟수를 노출. [`owner-state.test.js`](../react-app/src/store/owner-state.test.js)의 `initializeOwnerFromPersist`/`replaceOwnerState(sync:false)` 테스트와 [`app-store.test.js`](../react-app/src/store/app-store.js)의 `syncToCloud:false` 테스트가 이제 최종 state뿐 아니라 **호출 횟수 0**을 직접 assert한다.
- `cloudSync.test.js`의 기존 두 테스트(`failed 상태에서는 원격 upsert를 시도하지 않는다`, `idle일 때 생긴 dirty는 ready가 되면 자동 플러시된다`)는 1차 보완 때 앞 테스트가 남긴 `failed` 상태를 그대로 이어받아 쓰고 있었다 — 이번에 각자 **자기 owner 키로 스스로 failed 상태를 만든 뒤** 검증하도록 고쳐서 실행 순서에 의존하지 않게 했다.

**10. 재검증**

- `npm test` → **`tests 158 / suites 48 / pass 158 / fail 0 / cancelled 0 / skipped 0 / todo 0`**(1차 보완 126 → 신규 32개: `hydrateMerge.test.js` 13, `dirtyJournal.test.js` 6, `singleFlight.test.js` 4, `cloudSync.test.js` 신규/재작성 9). `npm run build` → **152 modules, 성공**(`cloudSync.js`는 병합 로직을 `hydrateMerge.js`로 분리하면서 904→887줄로 오히려 줄었다). `npm run lint` → 기존 8개 경고만, 신규 0개.
- 브라우저 실측: `react-app-dev` 프리뷰로 게스트 홈 진입(콘솔 에러 0건), `HydrationRetryBanner`가 정상(hydrate 안 도는) 상태에서 보이지 않음을 DOM에서 직접 확인, 사이드메뉴 열기/닫기 정상. **실제 Supabase 로그인으로 hydrate 실패→배너 노출→재시도 클릭 흐름은 이 세션에 테스트 계정이 없어 브라우저로 재현하지 못했다** — 이 경로는 `cloudSync.test.js`의 통합 테스트(4번 항목)로 로직을 검증했고, 사람이 실제 계정으로 한 번 더 확인해야 한다.
- **알려진 한계**: typecheck 갭은 이전 Step들과 동일(TypeScript 미설치). `assertCloudWriteReady()`의 durable 재시도 큐 미구현은 6번 항목에 기록. `cloudSync.js`는 여전히 `migration-plan.md` 5절의 "api/hydrate.ts 부트 시퀀스" 예외 파일이다 — Step 9 즈음 `api/`로 실제 분해할지 판단할 것.

**11. 커밋 전 자체 교차검증 (사용자 지시 — 원칙 업데이트, 158개 테스트 통과 이후 추가로 수행)**

"테스트 통과 = 커밋 가능"이 아니라는 사용자의 새 원칙에 따라, 이미 커밋된 위 10개 항목의 코드를 다시 읽으며 UI 상태(Ready/Failed)·스토어·원격 쓰기 방어가 정말 원자적인지 손으로 재검토했다. 두 가지 실제 결함을 발견해 즉시 수정하고, **수정을 되돌려서 회귀 테스트가 실제로 실패하는 것까지 확인**한 뒤 다시 복원했다(테스트가 진짜로 버그를 잡는지, 그냥 통과하는 테스트가 아닌지 검증).

- **결함 A — `commitBatch`의 persist 단계가 원자적이지 않았다.** `entries.forEach`로 도메인마다 `writeJsonKey`(→ `localStorage.setItem`)를 순서대로 호출했는데, 그중 하나가 실패하면(용량 초과, 또는 값에 순환 참조가 있어 `JSON.stringify` 자체가 실패) **이미 쓴 앞쪽 도메인은 새 값으로 남고 뒤쪽은 그대로인 부분 반영 상태**가 될 수 있었다 — 이번 라운드가 hydrate 조회 실패 경로에서 없앤 것과 같은 종류의 결함이 쓰기 경로에 남아 있었던 것.
  - 수정: 신규 [`src/store/atomicPersist.js`](../react-app/src/store/atomicPersist.js) `writeAllOrNothing(entries)` — (1) 먼저 전부 `JSON.stringify`부터 계산해, 순환 참조 등으로 하나라도 실패하면 **아무것도 쓰지 않고** 던진다. (2) 실제 `setItem` 전에 각 키의 기존 값을 백업해 두고, 도중 실패하면 **이미 쓴 키만 원래 값으로 복원**(신규 키였다면 `removeItem`)한 뒤 던진다. `app-store.js`의 `commitBatch`가 이제 이 함수를 거친다.
  - 검증: [`atomicPersist.test.js`](../react-app/src/store/atomicPersist.test.js) 5개 — 전체 성공, 직렬화 실패 시 전무 반영, 쓰기 도중 실패 시 기존 값 롤백, 신규 키는 롤백 시 완전히 삭제. **롤백 로직을 임시로 제거하고 같은 테스트를 돌려 실제로 실패하는 것을 확인한 뒤 복원** — 진짜 회귀 테스트임을 증명.
- **결함 B — `endCloudSession()`(로그아웃)이 `hydrateGeneration`을 올리지 않았다.** single-flight의 stale 세대 가드(8번 항목)는 "owner가 바뀌면 이전 hydrate를 버린다"는 목적이었는데, 로그아웃은 이 세대를 올리지 않아서 **로그아웃 시점에 아직 응답을 기다리던 이전 계정의 hydrate가 로그아웃 이후에 성공하면, `myGeneration === hydrateGeneration`이 여전히 참이 되어 로그아웃한 계정의 데이터가 게스트/새 세션 화면에 뒤늦게 반영될 수 있었다**(예: 느린 네트워크에서 로그인 직후 바로 로그아웃).
  - 수정: `endCloudSession()`에도 `hydrateGeneration += 1` 추가 — 로그아웃도 "이전 요청은 전부 오래된 것"으로 만드는 이벤트로 취급.
  - 검증: `cloudSync.test.js`의 `endCloudSession — 로그아웃이 지연 응답 중인 hydrate를 무효화한다` — hydrate를 게이트로 지연시킨 채 로그아웃 → 게이트 해제 → hydrate가 뒤늦게 성공해도 `status`가 `idle`로 남고 로그아웃 이전 서버 값이 localStorage에 안 씀을 확인. **이 수정도 되돌려서 테스트가 실패하는 것을 확인한 뒤 복원.**
- **재검증**: `npm test` → **`tests 163 / suites 52 / pass 163 / fail 0`**(158 → 163, +5 = `atomicPersist.test.js` 5개; 기존 `cloudSync.test.js`에 회귀 테스트 1개 추가는 이미 163에 포함). `npm run build` → 성공. `npm run lint` → 신규 경고 0개.
- **결론**: 두 결함 모두 이번 라운드가 원래 겨냥한 "네트워크 조회 실패 시 부분 반영" 버그(항목 1-2)와는 다른 종류(로컬 쓰기 실패, 로그아웃 타이밍)였지만, 사용자가 요구한 "실패 시 롤백/유지가 원자적인지"라는 기준을 문자 그대로 적용해 코드를 다시 읽지 않았다면 놓쳤을 결함이다. 이 재검증을 거친 뒤에야 커밋했다(아래 커밋 로그 참고).

### [~] Step 0-4 감사 보완 3차 (사용자 지시 — Step 5 착수 전 필수, 별도 커밋) — **재분류: 성급한 완료였음**

**정정(사용자 지시 6번 원칙 업데이트 이후, 아래 4차에서 실제로 재작업):** 이 3차 라운드는 아래 item 2(readiness 검사)를 "작업 전체를 중단"으로 처리하고 durable mutation/tombstone 큐를 "이번 라운드 범위 밖 — 알려진 한계"로 문서화한 채 `[x]` 완료·커밋했다. 이후 사용자가 "요구사항에 직접 관련된 미구현 사항을 '알려진 한계'로 기록하는 것만으로 완료 처리하지 마라"는 원칙을 명시적으로 추가하면서, 이 처리가 실제로는 요구사항(ready 상태에서 서버 실패 시 durable 복구, hydrate 재등장 방지)을 충족하지 못한 성급한 완료였다고 지적했다. 원래 로그는 지우지 않고 아래 그대로 남기되, 체크박스를 `[~]`(부분 완료 → 4차에서 완전히 재작업)로 바로잡는다. 실제 완전한 처리는 "Step 0-4 감사 보완 4차"를 보라.

사용자가 지적한 두 개 차단 항목. 11번 항목(커밋 전 자체 교차검증)이 잡은 것과는 또 다른, `commitBatch`/UI mutation 순서에 남아 있던 실제 결함이었다.

**1. `commitBatch`의 도메인 persist + dirty journal을 하나의 all-or-nothing 저장 단위로 묶기**

- 문제: `commitBatch`가 `writeAllOrNothing(entries)`로 도메인 값은 원자적으로 썼지만(11번 항목), 그 다음 `entries.forEach` 루프 안에서 `applyDomainToState`와 **별도로** `markDirty(ownerKey, domain)`를 호출했다 — `markDirty`는 자기 `readJournal`/`writeJournal`로 **독자적인** `localStorage.setItem`을 부른다. 이 두 번째 쓰기가 실패하면(용량 초과 등) **도메인 값은 이미 새 값으로 남았는데 journal은 갱신 안 되는 불일치**가 생겼다 — 그 도메인의 변경이 서버로 영영 안 나갈 수 있는 실질적 버그(11번 항목이 발견한 것과 같은 계열이지만 journal 쪽에 남아 있던 사례).
- 수정:
  - [`dirtyJournal.js`](../react-app/src/lib/dirtyJournal.js)에 `planDirtyWrite(ownerKey, domains)` 추가 — 기존 journal을 읽어 "다음 값"만 메모리에서 계산해 `{ key, value }`로 돌려준다(쓰지 않는다). `markDirty()`는 이제 이 함수를 감싼 얇은 래퍼로 재정의.
  - [`atomicPersist.js`](../react-app/src/store/atomicPersist.js)의 `writeAllOrNothing` 시그니처를 `{ domain, ownerKey, value }`에서 `{ key, value }`로 바꿨다 — journal 키(`reactPracticeDirtyJournal:<owner>`)는 persist.js의 9개 도메인 계약 밖이라 `storageKeyFor`로 못 만들기 때문에, 최종 localStorage 키를 직접 받게 일반화했다.
  - 신규 [`batchWrites.js`](../react-app/src/store/batchWrites.js) — 도메인 값 쓰기 목록 + (syncToCloud면) owner별 `planDirtyWrite` 결과를 **하나의 배열**로 합쳐 돌려주는 순수 함수 `buildBatchWrites`. `app-store.js`의 `commitBatch`는 이제 이 배열을 `writeAllOrNothing` **한 번**으로 쓰고, 성공했을 때만 `applyDomainToState`/`notify`/`scheduleCloudSync`로 넘어간다.
  - **200줄 제한 부수 조치**: 이 리팩터로 `app-store.js`가 223줄까지 늘었다가, `commitWorkData`~`commitDismissedNotifications` 8개 얇은 래퍼를 신규 [`commitHelpers.js`](../react-app/src/store/commitHelpers.js)로 옮겨 144줄로 줄었다. `commitHelpers.js`가 `app-store.js`의 `commitBatch`를 가져다 쓰므로, 배럴 재수출(`export * from`) 대신 이 함수들을 쓰던 `lib/{cars,clients,drivers,expenses,invoices,notifications,practiceSettings,profile,workData}.js` 9곳의 import 경로를 `commitHelpers.js`로 직접 옮겨서 순환 참조를 피했다.
- 검증: [`atomicPersist.test.js`](../react-app/src/store/atomicPersist.test.js)를 새 `{ key, value }` 시그니처로 갱신 + "임의의 key(journal 키)도 도메인 키와 섞어 쓸 수 있다" 테스트 추가. [`app-store.test.js`](../react-app/src/store/app-store.test.js)에 요구된 quota 오류 통합 테스트 추가 — `localStorage.setItem`을 journal 키에서만 던지도록 패치한 뒤 `commitCars()`를 호출해 **도메인 localStorage 원상복구, journal 원상복구, `getState().cars[owner]` 불변, notify 0회, Supabase 스텁 호출 0회**를 전부 확인. **journal 병합 로직을 임시로 제거하고 같은 테스트가 실패하는 것을 확인한 뒤 복원** — 진짜 회귀 테스트임을 증명.

**2. hydration이 ready가 아닐 때 로컬을 먼저 바꾸지 못하게 하기**

- 문제: `CarManagementPage.jsx`/`ClientManagementPage.jsx`/`DriverConnectionPage.jsx`의 차량·거래처 삭제, 기사 상태변경·삭제 핸들러가 전부 **`persist(...)`(로컬 state + localStorage)를 먼저 부르고, 그 다음에야** `deleteVehicleFromSupabase`/`deleteClientFromSupabase`/`updateDriverLinkStatusOnSupabase`/`deleteDriverLinkOnSupabase`를 불렀다. 이 함수들 내부의 `assertCloudWriteReady()`(감사 보완 2차)는 hydrate가 준비 안 됐으면 던지긴 했지만, **이미 로컬은 지워진/바뀐 뒤**였다 — 로컬과 서버가 갈라지는 정확히 그 사고를 막지 못했다.
- 수정: [`cloudSync.js`](../react-app/src/lib/cloudSync.js)에 `blockedReasonForCloudWrite(cloudId)` 추가 — cloudId(그 레코드의 `supabaseId`)가 없으면(로컬 전용) 항상 허용(`null`), 있는데 `assertCloudWriteReady()`가 던지면 그 메시지를 반환값으로 돌려준다(throw 대신 반환값이라 호출부가 `try/catch` 없이 조기 리턴할 수 있다). 세 컴포넌트의 4개 핸들러(`CarManagementPage.confirmRemove`, `ClientManagementPage.confirmRemove`, `DriverConnectionPage.changeStatus`/`remove`)가 이제 **`persist()` 전에** 이 함수를 불러, 막히면 로컬 변경 자체를 시작하지 않고 토스트만 띄운다. (`DriverConnectionPage.save()`는 애초에 `saveDriverInviteToCloud(...).then(...)`으로 서버 호출 성공 뒤에만 `persist()`를 부르고 있어서 순서가 이미 맞았다 — 손대지 않음.)
- **durable mutation/tombstone 큐는 구현하지 않았다** — "작업 전체를 중단하고 사용자가 다시 시도한다" 쪽을 택했다(사용자 지시의 두 선택지 중 하나). 반쪽짜리 큐(예: 삭제만 큐잉하고 상태변경은 안 하는 식)를 만드는 것보다 범위를 명확히 좁혀 알려진 한계로 남기는 게 정직하다고 판단했다 — 이 문서 "Step 0-4 감사 보완 2차 6번 항목"에 이미 적힌 것과 같은 판단 기준.
- **알려진 한계(정직하게 기록)**: `CarManagementPage.jsx`(298줄)/`ClientManagementPage.jsx`(314줄)는 이미 200줄을 넘어 있던 파일이고(1.3절에 이미 "재분할 대상"으로 지정), 이번엔 가드 5~10줄만 추가했다 — 전면 재작성은 Step 7 몫으로 범위 밖에 뒀다(사용자 지시: "Step 5를 시작하지 말고 차단 항목만 보완하라"). 이 프로젝트엔 React Testing Library가 없어 "로컬 차량이 실제로 유지된다"는 걸 컴포넌트 렌더 테스트로 직접 증명하지 못한다 — `blockedReasonForCloudWrite`가 올바른 판정을 내리는 것과 각 handler가 `persist()`보다 먼저 그 판정을 부른다는 것(코드 리뷰로 확인)을 근거로 삼았다. 이전 Step들과 같은 방식(순수 함수 추출 + 단위 테스트 + 브라우저 스모크 확인)을 따랐다.
- 검증: `cloudSync.test.js`에 `blockedReasonForCloudWrite`(cloudId 없음/ready/failed/로그아웃 4가지 케이스) 3개, "failed 상태에서 UI가 직접 부르는 mutation이 서버를 전혀 호출하지 않는다"(차량 삭제/거래처 삭제/기사 상태변경/기사 삭제, 사용자가 요구한 4개 최소 회귀 테스트 그대로) 4개, "retry 성공 후 다시 시도하면 로컬·서버 모두 반영된다"(요구된 4번째 시나리오: 실패 → 막힘·0회 호출 확인 → `retryHydrate()` 성공 → 같은 삭제를 다시 호출하면 이번엔 1회 나감) 1개, 총 8개 추가. **`blockedReasonForCloudWrite`를 임시로 항상 `null`을 반환하게 바꾸고 관련 테스트 2개가 실패하는 것을 확인한 뒤 복원** — 진짜 회귀 테스트임을 증명.

**3. `migration-audit-plan.md` 갱신**

- 위 "## 0-1. 현재 상태" 절을 신설해 Step 4 + 감사 보완 3차 기준으로 트리 비교표를 다시 채웠다. 원래 "## 0" 절(착수 전 스냅샷)은 지우지 않고 "착수 전 스냅샷"이라고 라벨만 명확히 달았다(4번 원칙 — 기존 기록 삭제 금지).
- "## 5. 감사 결론"의 마지막 문장("다음 구현은 Step 1부터...")은 이미 Step 4까지 끝난 지금 시점엔 명백히 틀린 지시라, 취소선으로 표시하고 "## 5-1. 현재 결론"을 새로 붙여 다음 구현이 **Step 5**부터임을 명시했다. 원문은 취소선 안에 그대로 남겼다.

**4. 재검증**

- `npm test` → **`tests 173 / suites 56 / pass 173 / fail 0`**(163 → 173, +10 = `app-store.test.js` 1개 quota 통합 테스트 + `atomicPersist.test.js` signature 갱신(순증 0, 케이스 1개 추가로 5→6) + `cloudSync.test.js` 8개 신규 + import 정리). `npm run build` → **155 modules, 성공**. `npm run lint` → 기존 8개 경고만(줄 번호만 1~2줄 밀림), 신규 0개.
- **알려진 한계 (3차 시점 — 4차에서 재작업됨)**: typecheck 갭은 이전 Step들과 동일(TypeScript 미설치). item 2의 durable mutation 큐 미구현은 위에 기록. 컴포넌트 렌더 테스트 부재도 위에 기록. `cloudSync.js`(920줄)는 여전히 계획서 5절 예외 파일.

### [~] Step 0-4 감사 보완 4차 (사용자 지시 — durable mutation outbox 전수 구현, Step 5 착수 전 필수, 별도 커밋) — **재분류: 성급한 완료였음**

**정정(사용자 지시 12개 항목 재작업 이후):** 이 4차 라운드는 아래 내용을 `[x]` 완료로 문서화한 채 커밋 대기 상태였다. 그런데 실제로 브라우저/교차검증 과정에서 사용자가 12개의 진짜 결함(차량 추가/수정 시 `saveCars` 누락으로 새로고침 후 유실, 기사 배정 충돌이 durable retry로 잘못 처리됨, outbox의 session epoch 재검증 누락, 로그아웃 직후 재로그인이 stale hydrate에 합류, 신규 기사 insert의 비멱등성, 삭제된 테이블 hydrate 오류 테스트 누락, 저장 실패의 unhandled rejection 가능성, `hydrateMerge.js`의 `unknown` 잔존 등)을 지적했다 — 아래 "4차 재작업" 섹션에서 12개 전부를 실제로 고치고 검증했다. 원래 로그는 지우지 않고 그대로 남기되, 체크박스를 `[~]`(부분 완료 → 4차 재작업에서 완전히 재작업)로 바로잡는다. 실제 완전한 처리는 "Step 0-4 감사 보완 4차 재작업"을 보라.

3차가 "알려진 한계"로 남긴 durable mutation/tombstone 큐를 실제로 구현했다. 범위는 삭제뿐 아니라 차량 삭제·거래처 삭제·기사 상태변경·기사 삭제·**기사 초대 생성/수정**까지 직접 Supabase mutation 전체.

**0. `cloudSync.js`(920줄) 책임별 완전 분해 (사용자 지시 7번)**

이번 라운드에서 다시 손대야 했으므로, 계획서 5절 예외를 유지하지 않고 실제로 쪼갰다 — 전부 200줄 이하:

| 신규 파일 | 줄 수 | 책임 |
|---|---|---|
| [`cloudStorage.js`](../react-app/src/lib/cloudStorage.js) | 115 | practice 스냅샷 localStorage I/O 원시 함수 |
| [`cloudSession.js`](../react-app/src/lib/cloudSession.js) | 92 | 로그인 세션 + 세대(epoch), `assertCloudWriteReady`/`blockedReasonForCloudWrite` |
| [`hydrate.js`](../react-app/src/lib/hydrate.js) | 125 | hydrate 전체(2차 로직 + outbox 재적용) |
| [`mutationOutbox.js`](../react-app/src/lib/mutationOutbox.js) | 132 | durable outbox 핵심(순수 계산 + 저장) |
| [`outboxReconcile.js`](../react-app/src/lib/outboxReconcile.js) | 53 | hydrate 결과에 tombstone/pending 겹쳐 적용(순수) |
| [`directMutations.js`](../react-app/src/lib/directMutations.js) | 97 | Supabase 실행기(삭제/기사 링크 CRUD) |
| [`outboxFlush.js`](../react-app/src/lib/outboxFlush.js) | 117 | outbox 재시도 엔진(single-flight, 세션 재검증) |
| [`directMutationActions.js`](../react-app/src/lib/directMutationActions.js) | 147 | 컴포넌트가 직접 부르는 고수준 서비스 함수 |
| [`syncVehiclesClients.js`](../react-app/src/lib/syncVehiclesClients.js) | 55 | 일반 동기화 큐 — 차량/거래처 upsert |
| [`syncWorkData.js`](../react-app/src/lib/syncWorkData.js) | 63 | 일반 동기화 큐 — 운행기록 upsert |
| [`syncExpenseRecords.js`](../react-app/src/lib/syncExpenseRecords.js) | 109 | 일반 동기화 큐 — 정비/주유/기타 upsert |
| [`syncTaxInvoicesTable.js`](../react-app/src/lib/syncTaxInvoicesTable.js) | 56 | 일반 동기화 큐 — 세금계산서 upsert |
| [`syncQueue.js`](../react-app/src/lib/syncQueue.js) | 96 | 디바운스 동기화 큐 오케스트레이션 |

옛 `cloudSync.js`(920줄)와 `cloudSync.test.js`(343줄)는 삭제했다(Step 3가 옛 `App.jsx`를 삭제했던 것과 같은 판단 — 모든 책임이 새 파일로 옮겨졌고 참조가 전부 갱신됐음을 확인한 뒤 제거). `App.jsx`/`boot.js`/`HydrationRetryBanner.jsx`/`syncFlushListeners.js`/`app-store.js`의 import 5곳을 새 위치로 갱신했다.

**1. 로컬 변경과 outbox 기록의 원자성 (사용자 지시 항목 1)**

- [`mutationOutbox.js`](../react-app/src/lib/mutationOutbox.js)의 `planOutboxAppend()`가 기존 outbox를 읽어 "다음 값"만 메모리에서 계산(쓰지 않음). [`directMutationActions.js`](../react-app/src/lib/directMutationActions.js)의 `commitWithOutboxAndFlush()`가 도메인 값 + outbox 값을 **하나의 `writeAllOrNothing` 호출**로 쓴다. 성공했을 때만 `commitBatch(..., { persist:false, syncToCloud:false })`로 store 상태를 반영하고 notify를 정확히 한 번 부른다. 원격 호출(`flushMutationOutbox`)은 이 로컬 쓰기가 전부 성공한 **이후에만** 시작한다.
- 순서는 사용자 지시 7번 그대로다: readiness 검사(`blockedReasonForCloudWrite`) → 도메인 값 계산 → outbox 값 계산(직렬화까지 `writeAllOrNothing` 내부에서) → 백업 → all-or-nothing 쓰기 → store 반영 → notify 1회 → outbox flush(원격) 순.
- 검증: `directMutationActions.test.js`의 "outbox localStorage 쓰기가 실패하면 도메인 값도 롤백되고, store/notify/서버 호출이 전부 0이다" — `localStorage.setItem`을 outbox 키에서만 실패하게 패치한 뒤 도메인 localStorage 원상복구, store 미반영, notify 0회, Supabase 호출 0회를 전부 assert.

**2. Durable outbox 범위 (사용자 지시 항목 2)**

- 차량 삭제·거래처 삭제는 tombstone(`kind:'tombstone'`), 기사 상태변경·초대 생성/수정은 mutation(`kind:'mutation'`)으로 표현. 작업 객체는 `{ id, ownerKey, userId, resourceType, resourceId, kind, operation, payload, sessionEpoch, createdAt }`을 전부 기록한다.
- resourceId는 차량/거래처는 `supabaseId`, 기사 링크는 **로컬 driver.id**를 쓴다 — 초대 생성 시점엔 supabaseId가 아직 없어서, 생성·수정·상태변경·삭제 전체 생애주기가 같은 resourceId로 병합 규칙을 공유하게 하기 위해서다.
- `mergeOutboxOp()`(순수 함수)이 병합 규칙을 구현: 같은 리소스의 mutation은 최신 것으로 교체(latest wins), tombstone은 그 리소스의 모든 대기 작업을 대체(삭제 우선), 이미 tombstone이 있으면 새 mutation은 버린다. `mutationOutbox.test.js` 10개로 이 규칙 자체를 단위 검증.
- 재시도 idempotent 여부: 삭제(vehicle/client/driverLink)는 delete-of-already-deleted-row가 에러 없이 성공하는 Supabase 기본 동작에 기대 자연히 idempotent — `outboxFlush.test.js`의 "멱등성" 테스트가 중간 테이블만 성공한 뒤 재시도해도 안전함을 실측. 기사 초대 upsert는 `supabaseId`가 확정된 뒤에는 update라 idempotent이고, 확정 전(신규 생성) 재시도는 재시도 때마다 `findOverlappingDriverLinkOnSupabase`를 다시 돌려서 — **이미 성공한 첫 삽입이 있다면 그 자체가 "겹침"으로 잡혀 중복 삽입을 막는다**(데이터 오염은 막되, 이 특정 엣지 케이스는 자동으로 스스로 안 풀리고 사람이 봐야 한다 — 아래 알려진 한계에 정직하게 기록).

**3. 원격 실패 처리 (사용자 지시 항목 3)**

- [`outboxFlush.js`](../react-app/src/lib/outboxFlush.js)의 `flushOnce()`가 각 op을 실행하고, 성공(원격 반영 확정)했을 때만 `removeOutboxOp()`으로 제거한다. 실패(throw 또는 `{data:null,error}` 던짐)하면 `console.error`로 남기고 outbox에는 그대로 둔다 — 콘솔 출력만 하고 끝내지 않는다(다음 flush가 이어서 시도).
- outbox 제거(`removeOutboxOp`) 자체가 실패해도(예: 저장 공간) 그냥 둔다 — 다음 flush가 이미 끝난 작업을 다시 실행하지만, 실행기가 idempotent해서 데이터가 안 깨진다.
- 성공/대기 토스트 구분: [`directMutationActions.js`](../react-app/src/lib/directMutationActions.js)의 `commitWithOutboxAndFlush()`가 flush 직후 그 op이 outbox에서 사라졌는지 확인해 `succeeded`를 계산하고, 성공이면 확정 토스트("삭제했습니다"), 실패(아직 대기)면 "…연결이 복구되면 자동으로 반영됩니다" 문구를 돌려준다 — "삭제했습니다"라는 확정 성공 문구는 원격 반영이 실제로 끝났을 때만 나간다.

**4. hydrate 재등장 방지 (사용자 지시 항목 4)**

- 신규 [`outboxReconcile.js`](../react-app/src/lib/outboxReconcile.js) — `reconcileCars`/`reconcileClients`가 활성 tombstone이 있는 리소스를 병합 결과에서 걸러내고, `reconcileDrivers`가 tombstone 필터링 + pending mutation(상태변경/생성) 재적용 + 서버 병합이 통째로 떨어뜨릴 수 있는 pending 생성건 복구까지 처리한다. `hydrate.js`의 `performHydrate()`가 차량/거래처/기사 병합 직후 이 함수들을 통과시킨다.
- 검증: `hydrate.test.js`의 "활성 tombstone이 있는 차량은 서버 응답에 있어도 hydrate 결과에서 제외된다", "대기 중인 기사 상태변경은 서버 값이 아니라 로컬 pending 값으로 유지된다" — 둘 다 실측.
- reload/재로그인/hydrate retry 후에도 outbox는 localStorage 기반이라 그대로 유지되고, `hydrate.js`가 성공 직후 `hasPendingOps(ownerKey)`를 확인해 자동으로 `flushMutationOutbox`를 부른다. `syncQueue.js`의 `flushCloudSync()`(pagehide)도 도메인 동기화 큐와 outbox 둘 다 플러시한다.

**5. 세션/동시성 보호 (사용자 지시 항목 5, 11번 원칙)**

- [`cloudSession.js`](../react-app/src/lib/cloudSession.js)의 `captureSession()`/`isSessionStillCurrent()` — userId/ownerKey/sessionEpoch(세대) 셋을 한 번에 캡처·재검증한다. `hydrate.js`가 hydrate 시작 시 캡처하고 커밋 직전 재검증(2차부터 있던 세대 보호를 이 공용 유틸로 통합), `outboxFlush.js`의 `flushOnce()`가 **flush 시작 시점**과 **op마다 실행 직전**에 재검증해서, 세션이 바뀌면 그 owner의 남은 op을 전부 그대로 두고 조용히 멈춘다(다른 owner 자격으로 원격 호출을 내보내지 않는다).
- outbox flush는 owner별 running/dirty 큐(`outboxFlush.js`의 `outboxQueues` Map)로 single-flight — 실행 중 새 op이 추가되면 dirty 플래그로 표시해 두고 한 번 더 돈 뒤에야 resolve한다(기존 `queueSync`와 같은 패턴).
- 검증: `outboxFlush.test.js`의 "flush 도중 로그아웃하면 남은 op은 그대로 두고 원격 호출을 멈춘다", "flush 시작 시점에 이미 다른 owner가 현재 세션이면 아예 실행하지 않는다", "single-flight + dirty 재실행" 3개. `hydrate.test.js`의 "hydrate 도중 owner(계정) 변경"(신규 — A가 진행 중에 B가 시작해 성공하면 A의 뒤늦은 완료가 B의 ready 상태/데이터를 절대 건드리면 안 됨을 실측) + "hydrate 도중 로그아웃"(기존 2차 테스트 이전).

**6. 테스트의 진실성 (사용자 지시 항목 6, 12번 원칙)**

- **API 함수만 테스트하지 않았다** — `CarManagementPage.jsx`/`ClientManagementPage.jsx`/`DriverConnectionPage.jsx`의 삭제·상태변경·초대저장 오케스트레이션을 [`directMutationActions.js`](../react-app/src/lib/directMutationActions.js)의 `requestVehicleDeletion`/`requestClientDeletion`/`requestDriverStatusChange`/`requestDriverDeletion`/`requestDriverInviteSave`로 뽑아냈다. 컴포넌트는 이 함수만 부른다(코드 리뷰로 호출 순서 확인) — 렌더 테스트 없이도, 이 함수들을 직접 테스트하는 것이 곧 실제 UI 호출 경로를 테스트하는 것이다.
- **실제로 이 방식이 버그를 잡았다**: `directMutationActions.test.js` 작성 중 `requestDriverInviteSave`의 성공 토스트가 "초대를 저장했습니다"가 아니라 항상 "기사 할당 정보를 수정했습니다"로 나오는 실제 버그를 발견했다 — 컴포넌트가 `editingId` 대신 `newId`(항상 truthy)를 넘기고 있었다. `DriverConnectionPage.jsx`의 `save()`를 고쳐 원래 `editingId`(신규면 null)를 그대로 넘기도록 수정. **API 레벨 테스트만 했다면 절대 못 잡았을 버그**(서비스 함수 자체는 파라미터를 있는 그대로 신뢰하므로) — 실제 호출부를 테스트한 것의 가치를 스스로 증명한 사례.
- 18개(`directMutationActions.test.js`) + 9개(`outboxFlush.test.js`) + 10개(`mutationOutbox.test.js`) + 8개(`hydrate.test.js`) + 10개(`cloudSession.test.js`) + 4개(`syncQueue.test.js`) = 59개 신규. 각각 Store 상태·도메인 localStorage·dirty journal/outbox·notify 횟수·Supabase 메서드별 호출 횟수·성공/대기 토스트를 실제 assert.
- 필수 실패 주입 커버: 도메인 localStorage 쓰기 실패, outbox 쓰기 실패(`directMutationActions.test.js`), Supabase throw·`{data:null,error}`(`outboxFlush.test.js`, `directMutationActions.test.js`), 차량 다중 테이블 작업 중간 실패+재시도(`outboxFlush.test.js` 멱등성 테스트), 원격 성공 후 outbox 제거는 실패해도 안전(설계상 idempotent 실행기로 보장, 별도 실패 주입은 안 함 — 알려진 한계에 기록), 실행 중 로그아웃/owner 전환(`outboxFlush.test.js`, `hydrate.test.js`), reload 후 재시도(`directMutationActions.test.js`의 "retry 성공 후 다시 시도" 시나리오), hydrate 시 tombstone 대상 재등장 방지(`hydrate.test.js`), 직접 mutation 실행 직전 hydration이 hydrating으로 바뀌는 경우(`directMutationActions.test.js`).
- 모든 신규 테스트는 각자 고유한 owner 키를 써서 실행 순서에 의존하지 않는다. **핵심 회귀(commitBatch 원자성, blockedReasonForCloudWrite 게이트, directMutationActions의 outbox 병합)는 수정을 임시로 되돌려 테스트가 실제로 실패하는 것을 확인한 뒤 복원했다** — 그 사이 버그를 실제로 하나 더 발견(위 토스트 버그)했다는 것 자체가 이 검증 절차의 실효성을 보여준다.

**7. 200줄 규칙 (사용자 지시 항목 7)**

수정한 컴포넌트 4개를 폼 모달과 목록/액션으로 분리했다:

| 파일 | 이전 | 이후 |
|---|---|---|
| `CarManagementPage.jsx` | 298 | 118 |
| `CarFormModal.jsx`(신규) | — | 101 |
| `ClientManagementPage.jsx` | 314 | 139 |
| `ClientFormModal.jsx`(신규) | — | 78 |
| `DriverConnectionPage.jsx` | 214 | 146 |
| `DriverFormModal.jsx`(신규) | — | 51 |

`cloudSync.js`(920줄)는 위 0번 항목에서 13개 파일로 완전히 분해했다. 신규/수정 프로덕션 파일 전부가 200줄 이하임을 `wc -l`로 재확인(아래 재검증 로그).

**8. 타입 검증 (사용자 지시 항목 8)**

- `package.json`에는 여전히 `typecheck` 명령이 없다 — **build/lint를 typecheck 통과로 보고하지 않는다.** "typecheck 명령 미구성"이 정확한 상태다.
- `any`/`unknown`/JSDoc `*`/`@ts-ignore`/`@ts-expect-error`/타입 회피 단언 — 신규·수정 프로덕션 코드 전체(`grep -rn`)에서 0건. `app-store.js`의 `@property {*} value`/`@returns {Array<*>}`, `batchWrites.js`의 `value: *`도 제거하고 `DomainValue`(`object|Array<object>|Array<string>`), `JsonValue`(재귀적 JSON 타입) typedef로 대체했다.

**9. 문서와 완료 처리 (사용자 지시 항목 9)**

- 3차의 `[x]` 체크를 `[~]`로 바로잡고 "성급한 완료였음"을 명시했다(위 참고). 이 4차 항목은 위 1~8번 요구사항과 실패 매트릭스가 전부 통과한 뒤에만 `[x]`로 표시한다.
- Step 5는 시작하지 않았다.

**10. 재검증**

- `npm test` → **`tests 211 / suites 77 / pass 211 / fail 0`**(173 → 211, +38 = 신규 59개 − 삭제된 `cloudSync.test.js` 21개). `npm run build` → **170 modules, 성공**. `npm run lint` → 신규 경고 0개(오히려 `DriverConnectionPage.jsx`의 기존 `setCars` 미사용 경고가 리팩터 과정에서 자연히 없어져 기존 8개 → 7개로 줄었다).
- **알려진 한계(현재 요구사항을 위반하지 않는다고 판단한 것들, 정직하게 기록)**:
  - typecheck 명령 미구성(TypeScript 미설치) — 이전 Step들과 동일한 갭.
  - 기사 초대 **신규 생성**의 첫 삽입이 "네트워크가 커밋 후 응답 전에 끊기는" 정확히 그 순간에 실패하면, 재시도 시 `findOverlappingDriverLinkOnSupabase`가 방금 성공한 그 행을 "겹침"으로 잡아 재시도를 막는다 — 데이터 중복/오염은 막지만, 그 op이 outbox에 영구히 멈춘 채(자동으로 안 풀리고) 사람이 확인해야 한다. 이 특정 엣지 케이스만 그렇고, 삭제·상태변경·이미 확정된 supabaseId가 있는 수정은 전부 완전히 idempotent하다.
  - `notify()` 자체(app-store.js)는 구독자 콜백이 던지는 경우를 try/catch로 감싸지 않는다 — 이번 요구사항이 요청한 실패 주입 목록엔 없었고 Step 1부터 있던 기존 구조라 범위 밖으로 남겼다.
  - 컴포넌트 JSX 렌더 테스트는 여전히 없다 — 사용자 지시 6번이 명시한 대안(오케스트레이션을 서비스 함수로 추출해 그 함수를 테스트)을 택했고, 실제로 그 방식이 버그를 잡아낸 사례(위 6번 항목)로 실효성을 보였다.
  - 브라우저 라이브 검증: 새 탭에서 `/app/cars` 진입 → 사이드메뉴/폼 모달/목록 렌더까지 콘솔 에러 0건으로 확인했고, 차량 추가 후 목록에 새 항목이 반영되는 것도 확인했다. 다만 이 개발 환경의 라우트가 상호작용 몇 초 뒤 `/app`으로 되돌아가는 현상(이전 Step들에도 이미 기록된, HMR/개발 서버 관련으로 보이는 환경 아티팩트로 추정)이 있어 삭제 확인 모달 → 토스트까지 이어지는 전체 흐름을 라이브 화면에서 끝까지 캡처하지는 못했다 — 그 흐름 자체는 `directMutationActions.test.js`가 실제 호출 경로 레벨에서 커버한다. **정정(4차 재작업에서 근본 원인 확인): "HMR/개발 서버 아티팩트"라는 추정은 틀렸다. `App.jsx`가 plain `<BrowserRouter>`를 쓰고 있어 `useNavigate()`가 react-router의 `useNavigateUnstable()` 경로를 타는데, 이 구현은 `navigate` 함수를 `location.pathname`이 바뀔 때마다 새로 만든다. `goHome`이 `useCallback(fn, [navigate])`로 감싸여 있고 부트 이펙트가 `useEffect(fn, [goHome])`이므로, **로그인된(게스트가 아닌) 사용자가 어떤 라우트로 이동해도 그 즉시 부트 이펙트가 다시 실행되어 `restoreSessionOnBoot()`(세션 재조회 + 전체 hydrate)를 다시 돌리고, 끝나면 `goHome()`이 다시 `navigate('/app', {replace:true})`를 불러 강제로 홈으로 되돌린다** — 실제 프로덕션에서 로그인 계정은 홈 탭을 벗어날 수 없는 심각한 버그다(게스트는 `restoreSessionOnBoot()`이 `null`을 돌려줘 `goHome()`을 안 부르므로 이 증상이 없다 — 그래서 게스트 경로로 진행한 이전 검증들이 이 버그를 놓쳤다). 사용자의 12개 항목에는 없는 별도 결함이라 이번 라운드에서 고치지 않았고, 이 문서 정정 후 별도로 사용자에게 보고했다. 재현: `console.count`로 부트 이펙트 실행 횟수를 계측하면 로그인 계정에서 라우트 전환마다 실행 횟수가 2씩 증가함을 확인했다(StrictMode 이중 실행 포함). 이번 라운드의 차량 추가/수정 새로고침 검증(아래 4차 재작업 참고)은 이 버그를 피해 비회원(게스트) 모드로 수행했다 — 데이터 계층(`saveCars`)은 로그인 여부와 무관하게 동일하게 동작하므로 검증 유효성에는 영향이 없다. **후속(4차 재작업 후속 보완 사용자 지시 5번에서 실제로 고쳤다 — 아래 새 절 참고.)**

### [x] Step 0-4 감사 보완 4차 재작업 (+후속 보완 8개 항목 +재감사 4건 +SQL 재재감사) (사용자 지시 — 12개 감사 차단 항목 + 후속 8개 항목 + 재감사 4건 + SQL 재재감사, Step 5 착수 전 필수, 별도 커밋)

4차가 `[x]`로 문서화했던 durable outbox 구현에서, 실제 브라우저/코드 재검토로 드러난 12개의 진짜 결함을 전부 고쳤다. `git reset`/`checkout`/`clean` 없이 기존 파일에 이어서 작업했다.

**1. `CarManagementPage.jsx` 차량 추가/수정 시 `saveCars` 누락**

- 원인: 4차 리팩터에서 삭제 경로의 `persist()` 헬퍼를 제거하면서 추가/수정 경로의 영속화 호출도 실수로 함께 빠졌다 — `setCars(result.cars)`만 부르고 `saveCars(ownerKey, result.cars)`를 안 불러서, React state에는 반영되지만 새로고침하면 유실됐다.
- 수정: [`CarManagementPage.jsx`](../react-app/src/components/CarManagementPage.jsx)의 `save()`에 `saveCars(ownerKey, result.cars)` 호출 복원.
- 검증: 브라우저 실측(아래 "브라우저 라이브 재검증" 참고) + 기존 `cars.test.js`/`directMutationActions.test.js` 회귀 없음.

**2. 클라우드 사용자의 차량 미할당 기사 초대도 기존처럼 로컬 저장**

- 원인: [`requestDriverInviteSave.js`](../react-app/src/lib/requestDriverInviteSave.js)(옛 `directMutationActions.js`)의 "차량/시작일 미입력" 조기 반환이 `{ items, blocked:null, toast:null }`만 돌려주고 `items`를 localStorage에 전혀 쓰지 않았다 — 클라우드 시도만 건너뛰어야 하는데 로컬 저장까지 건너뛴 것.
- 수정: 이 분기를 `commitLocalOnly()`로 라우팅해 항상 로컬에 저장하고 적절한 성공 토스트를 반환하도록 수정.
- 검증: `directMutationActions.test.js`의 "입력이 불완전해도(차량/시작일 없음) 사용자 지시 2번대로 로컬에는 항상 저장되고 저장 토스트가 뜬다" — `readJsonKey('drivers', ...)`가 실제로 반영됨을 assert.

**3. 기사 배정 기간 충돌 = 확정 validation 실패(durable retry 금지)**

- 원인: 기존 구현은 배정 기간 충돌을 outbox flush 도중 발견되는 일반 `Error`로 던져, 영원히 성공할 수 없는 작업이 outbox에 무한정 남았다(재시도해도 항상 같은 충돌).
- 수정: (a) [`requestDriverInviteSave.js`](../react-app/src/lib/requestDriverInviteSave.js)에 동기적 사전 충돌 검사(`checkDriverAssignmentConflict`)를 추가해 이미 동기화된 차량이면 낙관적 로컬/outbox 기록을 만들기 **전에** 충돌을 확정 실패로 즉시 반환한다(가장 흔한 경로에서 잔여물이 아예 안 생긴다). (b) [`mutationOutbox.js`](../react-app/src/lib/mutationOutbox.js)에 `createPermanentFailure()`를 추가하고 [`outboxFlush.js`](../react-app/src/lib/outboxFlush.js)의 `flushOnce()`가 `.permanent` 표시가 된 에러는 재시도하지 않고 op을 제거(TOCTOU로 flush 시점에만 드러나는 좁은 레이스를 커버).
- 검증: `directMutationActions.test.js`의 "사용자 지시 3번 — 차량이 이미 동기화돼 있고 겹침이 있으면 확정 실패로 즉시 처리하고 로컬/outbox에 아무 것도 안 남긴다" — `result.blocked` truthy, `hasPendingOps===false`, `readJsonKey('drivers',...).length===0`을 assert(예전엔 이 자리에서 `hasPendingOps===true`를 기대하던 반대 방향 테스트였다 — 뒤집었다).

**4. outbox의 모든 await 이후 + reconcile/제거 직전 session epoch 재검증**

- 수정: [`outboxFlush.js`](../react-app/src/lib/outboxFlush.js)의 `executeOp(op, captured)`가 `captured` 세션을 받아 원격 호출(await) 직후 `isSessionStillCurrent(captured)`를 재확인한 뒤에만 reconcile을 진행하도록 수정. `flushOnce()`도 op 제거 직전에 재검증.
- 검증: 기존 `outboxFlush.test.js`의 "flush 도중 로그아웃"/"owner 전환" 테스트가 이 경로를 커버(회귀 없음 재확인).

**5. 기사 upsert 서버 확정값을 localStorage + Store에 원자적으로 반영**

- 수정: [`outboxFlush.js`](../react-app/src/lib/outboxFlush.js)에 `reconcileDriverAfterUpsertAndRemoveOp(op, savedRow)`를 신규 작성 — drivers 도메인 값 쓰기 + outbox 제거를 **하나의 `writeAllOrNothing` 호출**로 묶고, 성공하면 `commitBatch(..., {persist:false, syncToCloud:false})`로 Store도 같은 틱에 반영한다(이전엔 localStorage만 갱신되고 Store가 갱신 안 돼 화면에 반영이 늦거나 안 되는 경우가 있었다).
- 검증: 기존 `outboxFlush.test.js`의 "기사 초대 upsert — 성공 시 로컬에 서버 확정값을 되반영한다" 테스트로 회귀 확인.

**6. 로그아웃 후 같은 owner로 즉시 재로그인 시 stale hydrate에 합류 금지**

- 원인: `hydrateFromSupabase`가 `singleFlight('hydrate:'+ownerKey, ...)`로 감싸져 있는데, 로그아웃 시점에 그 owner의 hydrate가 아직 진행 중이었다면 singleFlight 맵에 항목이 남아있어 바로 이어지는 재로그인(같은 owner)의 새 `hydrateFromSupabase` 호출이 그 오래된 in-flight Promise에 "합류"해서 새 조회를 아예 안 하고, 세대 불일치로 결과가 조용히 버려져 `status`가 영원히 `ready`가 안 됐다.
- 수정: [`singleFlight.js`](../react-app/src/lib/singleFlight.js)에 `evict(key)` 추가, [`cloudSession.js`](../react-app/src/lib/cloudSession.js)의 `endCloudSession()`이 로그아웃 시 그 owner의 `hydrate:${ownerKey}` 항목을 강제로 제거하도록 수정.
- 검증(신규 테스트, 회귀 실측 포함): `hydrate.test.js`의 "사용자 지시 6번 — 로그아웃 후 같은 owner로 즉시 재로그인 > 로그아웃 시점에 아직 진행 중이던 이전 hydrate에 재로그인이 합류하지 않고 새로 실행된다" — 재로그인 후 `profiles` 조회가 2번(총) 나갔는지, `status==='ready'`인지, 이전 요청이 뒤늦게 응답해도 최신 값이 안 덮이는지 assert. **버그 임시 복원 확인**: `endCloudSession()`의 `evict()` 호출을 지우고 재실행하면 재로그인의 `hydrateFromSupabase` 호출이 로그아웃 이전 게이트에 걸린 채 영원히 끝나지 않아 테스트가 **행(hang)** 상태로 실패함을 실측(타임아웃으로 확인 후 수정 복원).

**7. 일반 syncQueue도 epoch로 실행 중 로그아웃/owner 전환 방어**

- 수정: [`syncQueue.js`](../react-app/src/lib/syncQueue.js)의 `queueSync()`가 시작 시 `captureSession()`으로 세션을 캡처하고, 각 `syncAll()` 재실행 직전과 `clearDirty()` 직전에 `isSessionStillCurrent(captured)`를 재검증한다 — 그 사이 로그아웃/owner 전환이 있었으면 해당 owner의 dirty journal을 "성공적으로 비웠다"고 잘못 표시하지 않고 그대로 둔다(다음 재로그인이 다시 정확히 판단한다).
- 검증(신규 테스트): `syncQueue.test.js`의 "실패 주입 — syncQueue 실행 중 로그아웃/owner 전환" 2개 — "로그아웃 이후에 도착한 성공 응답으로 clearDirty가 불리면 안 된다", "다른 owner로 전환되면 원래 owner의 dirty 표시는 지워지지 않는다". **버그 임시 복원 확인**: `queueSync()`의 두 `isSessionStillCurrent` 재검증을 지우고 재실행하면 두 테스트 모두 `false !== true`로 실제 실패함을 실측 후 복원.

**8. 신규 기사 insert의 응답 유실 상황에서 서버 행 중복 삽입을 막는 안전장치**

**정정(재감사 4번에서 바로잡음):** 이 표제를 원래 "자동 수렴하는 진짜 멱등성"이라고 적었던 것은 부정확했다 — 자연키(vehicle_id+assignment_start+invite_code) 조회는 invite_code가 23505 충돌로 재발급된 채 응답이 유실되면 "같은 시도"를 못 알아본다(아래 알려진 한계, `supabase/migrations/0001_driver_links_idempotency_key.sql` 참고). 실제로 보장하는 건 "서버 행이 중복으로 늘어나지는 않는다"(겹침 검사가 항상 살아 있어 재삽입 자체를 막음)이지 "항상 정확히 내 이전 시도를 알아본다"(진짜 멱등성)가 아니다 — 후자는 그 케이스에서 실패하고, 대신 확정 실패로 오판해 로컬을 롤백한다.

- 원인: 기존엔 신규 insert 응답이 유실되면 재시도 시 `findOverlappingDriverLinkOnSupabase`가 방금 성공한 그 행을 "겹침"으로 오판해 영구히 막혔다(4차가 "알려진 한계"로 기록했던 바로 그 문제).
- 수정: [`directMutations.js`](../react-app/src/lib/directMutations.js)에 `findExistingDriverLinkInsert(vehicleId, assignmentStart, inviteCode)`를 추가 — `(vehicle_id, assignment_start, invite_code)` 자연키로 "이미 내가 성공시킨 이전 시도"를 조회해서, 있으면 그 행을 그대로 쓰고 재삽입하지 않는다. `upsertDriverLinkOnSupabase`(즉시 경로)와 `outboxFlush.js`의 `executeDriverUpsertOp`(재시도 경로) 둘 다 겹침 검사보다 먼저 이 조회를 거친다.
- 버그 수정 중 발견한 2차 결함: `findExistingDriverLinkInsert`의 최초 구현이 `return data || null`이라 빈 배열(`[]`, truthy)을 "찾았다"로 오판할 수 있었다(가짜 Supabase 테스트 더블이 `.maybeSingle()`과 배열 반환 `.select()`를 구분 못 해 실제로 이 케이스가 테스트에서 드러났다) — `if (!data || Array.isArray(data)) return null`로 방어 강화.
- 검증: `directMutationActions.test.js`의 "사용자 지시 8번 — insert 응답이 유실된 뒤(즉시 재시도) 같은 payload로 다시 저장해도 중복 삽입 없이 그 행을 그대로 쓴다".

**9. 삭제된 vehicles/clients/driver_links/tax_invoices hydrate 오류 통합 테스트 복원**

- 수정: [`hydrate.test.js`](../react-app/src/lib/hydrate.test.js)에 4개 테스트를 복원 — `vehicles`/`clients`/`driver_links`/`tax_invoices` 각각 조회 실패 시 `status==='failed'`로 남고 해당 도메인의 로컬 값이 그대로 유지됨을 개별 assert(기존엔 `profiles`/`transport_details`만 있었다).

**10. localStorage/outbox 저장 실패가 unhandled rejection이 되지 않도록**

- 수정: [`outboxCommit.js`](../react-app/src/lib/outboxCommit.js)(신규) — `commitLocalOnly()`/`commitWithOutboxAndFlush()`가 저장 실패를 try/catch로 잡아 **항상 resolve**하고 `{ failed 또는 storageFailed, toast }`를 돌려준다. `directMutationActions.js`의 5개 서비스 함수 전부가 이 계약을 따라 실패 시 원래 값 + 실패 토스트를 반환(호출부에서 절대 throw가 새어나가지 않는다).
- 검증: `directMutationActions.test.js`의 "실패 주입 — 도메인+outbox 원자적 쓰기 자체가 실패하는 경우"(예전엔 `assert.rejects`를 기대하던 테스트였다 — item 10 수정으로 계약이 "던지지 않음"으로 바뀌어 `assert.doesNotReject` + 실패 토스트 + 롤백/notify 0회/서버 호출 0회로 다시 작성) + "입력이 불완전한데 로컬 저장 자체가 실패하면(사용자 지시 10번) 예외를 던지지 않고 실패 토스트를 돌려준다"(신규).

**11. `hydrateMerge.js`의 `unknown` 제거**

- 수정: `@param {Record<string, unknown>} labeledErrors`를 실제 읽는 필드만 적은 `@typedef {{ message: string, code?: string }|Error|null} SupabaseQueryError`로 교체.
- 재확인: 신규·수정 프로덕션 파일 전체에서 `any`/`unknown`/`@ts-ignore`/`@ts-expect-error` 재검색(`grep -rn`) → 주석 설명문 2건("any/unknown 대신...") 외 0건.

**12. 문서/완료 처리**

- 4차의 `[x]` 체크를 `[~]`로 바로잡았다(위 참고). 이 "4차 재작업" 항목은 아래 재검증이 전부 통과한 뒤에만 `[x]`로 표시한다.
- Step 5는 시작하지 않았다. `git reset`/`checkout`/`clean`은 실행하지 않았다.

**브라우저 라이브 재검증 (사용자 지시 — 차량 추가/수정 후 새로고침 유지 확인)**

- 위 "정정" 각주에서 밝힌 로그인 계정 전용 라우팅 버그(별도 결함, 12개 항목 밖) 때문에 비회원(게스트) 모드로 검증했다 — `saveCars`/`upsertCar`/localStorage 경로는 로그인 여부와 무관하게 동일하다.
- 실측 절차: 개발 서버(`npm run dev`) 기동 → 비회원으로 시작 → 마이페이지 → 차량 관리 → "99가9999"/"5톤" 추가 → 저장 → `localStorage['reactPracticeCars:guest']`에 반영 확인 → **완전한 하드 새로고침**(`navigate`로 전체 리로드, `App.jsx`의 React state가 전부 초기화됨) → 비회원 재시작 → 차량 목록에 "99가9999 (5톤)"가 그대로 남아 있음을 화면에서 확인. 이어서 "수정"으로 톤수를 "11톤"으로 바꾸고 저장 → localStorage 반영 확인 → 다시 하드 새로고침 → 비회원 재시작 → "99가9999 (11톤)"로 남아 있음을 화면에서 확인. 추가·수정 둘 다 새로고침 생존을 실측했다.

**재검증**

- `node --experimental-test-module-mocks --test` (전체 79개 스위트) → **`tests 220 / suites 79 / pass 220 / fail 0`**(211 → 220, +9 = `hydrate.test.js` 8→13(+5: 항목 9 복원 4개 + 항목 6 신규 1개) + `syncQueue.test.js` 4→6(+2: 항목 7 신규) + `directMutationActions.test.js` 18→20(+2 순증: 항목 2/3/8/10 관련 재작성·추가)).
- `npm run build` → 성공(경고 0).
- `npm run lint` → 신규 경고 0개(기존 `InlineExpandHost.jsx`/`AppShell.jsx`/`ReceivablesPage.jsx`/`TaxInvoicePage.jsx`의 기존 경고 7개만 그대로).
- 200줄 제한: 이번에 수정/신규한 프로덕션 파일 전부 `wc -l`로 재확인 — `CarManagementPage.jsx`(122), `directMutations.js`(122), `mutationOutbox.js`(146), `outboxFlush.js`(174), `outboxCommit.js`(신규, 42), `requestDriverInviteSave.js`(신규, 78), `directMutationActions.js`(99), `singleFlight.js`(43), `cloudSession.js`(110), `syncQueue.js`(102), `hydrateMerge.js`(156), `DriverConnectionPage.jsx`(146) — 전부 200줄 이하.
- **핵심 회귀는 버그를 임시로 되돌려 테스트가 실제로 실패하는 것을 확인한 뒤 복원했다**: 항목 6(evict 제거 → 재로그인 hydrate가 행), 항목 7(epoch 재검증 제거 → 두 테스트 모두 `false!==true`로 실패), 항목 8(빈 배열 오판 버그가 실제로 2개 테스트를 실패시켰던 것을 수정 전 상태에서 확인). 항목 3은 사전 검사(정적) + `createPermanentFailure`(레이스) 이중 구조라 정적 경로는 설계상 검증했고 레이스 경로는 `flushOnce`의 `.permanent` 분기 코드 리뷰로 확인했다(별도 레이스 재현 테스트는 작성하지 않음 — 알려진 한계로 기록).
- **알려진 한계(정직하게 기록, 이 시점 기준)**: (a) 위 "정정" 각주의 로그인 계정 전용 라우팅 버그 — 사용자의 12개 항목 밖이라 이번 라운드에서 고치지 않았고, 별도로 보고한다. (b) 항목 3의 TOCTOU 레이스(정적 사전 검사를 통과한 직후 다른 클라이언트가 겹치는 배정을 커밋하는 극히 좁은 창) 전용 실패 주입 테스트는 없다 — `createPermanentFailure` 분기가 코드 상 존재함만 확인했다. (c) typecheck 명령 미구성(TypeScript 미설치)은 이전 Step들과 동일한 기존 갭. **(a)와 (c)는 아래 "4차 재작업 후속 보완"에서 실제로 처리했다(각각 사용자 지시 5번, 7번) — (b)는 여전히 미해결로 그 절에도 다시 기록한다.**

**후속 보완 (사용자 지시 — 8개 항목, 브라우저 검증 중 발견한 잔여 결함 + typecheck 인프라)**

위 12개 항목을 고친 뒤 사용자가 코드를 다시 검토해 8개의 잔여 결함/미비를 추가로 지적했다. `git reset`/`checkout`/`clean` 없이 이어서 작업했고, 이 절이 전부 통과할 때까지 이 heading의 체크박스를 `[~]`로 되돌려 뒀다가(작업 중), 아래 재검증이 전부 끝난 뒤에만 다시 `[x]`로 바꿨다.

**1. 미동기화 차량 배정 충돌의 로컬 롤백 + 명시적 결과 enum**

- [`mutationOutbox.js`](../react-app/src/lib/mutationOutbox.js)에 `OUTBOX_RESULT = { SUCCESS, RETRYABLE, PERMANENT_FAILURE, STALE_SESSION }`을 추가했다. `flushOnce()`가 매 op마다 이 값(+실패 사유 message) 중 하나를 `Map<opId, {status, message}>`에 담아 돌려주고, [`outboxCommit.js`](../react-app/src/lib/outboxCommit.js)의 `commitWithOutboxAndFlush()`가 "outbox에 남아 있는지"로 성공을 추론하는 대신 이 맵에서 자기 op.id를 직접 찾아 판단한다(못 찾으면 안전하게 retryable로 취급).
- [`requestDriverInviteSave.js`](../react-app/src/lib/requestDriverInviteSave.js)가 op을 만들 때 `payload.previousDriverSnapshot`(수정 전 기사 스냅샷, 신규 생성이면 `null`)을 함께 실어 보낸다. [`outboxRollback.js`](../react-app/src/lib/outboxRollback.js)(신규)의 `rollbackDriverUpsertAndRemoveOp()`가 permanentFailure일 때 이 스냅샷으로 drivers 도메인의 **그 리소스 하나만** 되돌리고(신규 생성이면 배열에서 제거) outbox 제거와 원자적으로 묶는다 — 그 사이 다른 기사에 생긴 변경은 건드리지 않는다.
- 검증(신규, `outboxFlush.test.js`): "미동기화 차량이 뒤늦게 동기화된 뒤 발견된 배정 충돌은 낙관적 값을 롤백한다" — Store/localStorage 둘 다 수정 전 스냅샷으로 돌아가는지, notify가 정확히 1회인지, outbox가 비는지 확인. **버그 임시 복원 확인**: 롤백 호출을 지우면 이 테스트가 실제로 실패함(낙관적 값이 그대로 남음)을 실측 후 복원.

**2. outboxFlush/다단계 삭제/기사 upsert의 매 원격 await 직후 epoch 재검증**

- [`cloudSession.js`](../react-app/src/lib/cloudSession.js)에 `assertSessionStillCurrent(captured)`를 추가(세션이 바뀌었으면 `.staleSession` 표시된 에러를 던진다). [`directMutations.js`](../react-app/src/lib/directMutations.js)의 모든 실행기(차량/거래처 다단계 삭제, 기사 upsert의 update/insert 재시도 루프)가 `captured`를 필수로 받아 **모든 원격 await 직후**(자식 테이블 삭제 Promise.all 이후, daily_logs 이후, vehicles 본체 이후 등 각 단계마다) 재검증한다. `outboxFlush.js`도 `executeDriverUpsertOp`의 `syncVehicles` 호출 직후 등에서 같은 재검증을 한다.
- 이 `.staleSession` 에러 하나로 판정을 통일해, `flushOnce()`가 어디서 감지됐든 같은 방식(현재 op 보존, 로컬 반영/제거 전부 건너뜀, 남은 op도 처리 중단)으로 처리한다.
- 검증(신규, `outboxFlush.test.js`): "차량 삭제 자식 테이블 처리 중 로그아웃하면, 이후 단계(daily_logs/vehicles) 원격 호출이 0회이고 op이 보존된다". **버그 임시 복원 확인**: `deleteVehicleFromSupabase`의 재검증 호출들을 지우면 이 테스트가 실제로 실패함(daily_logs/vehicles 호출이 나감)을 실측 후 복원.

**3. syncQueue.syncAll()의 각 단계 사이 epoch 재검증**

- [`syncQueue.js`](../react-app/src/lib/syncQueue.js)의 `syncAll()`이 profile upsert부터 vehicles/clients/workData/fuel/maintenance/misc/taxInvoices까지 **매 단계 직후** `assertSessionStillCurrent(captured)`를 부른다 — 이전엔 `queueSync()`가 `syncAll()` 호출 *전체*를 감쌀 뿐 내부 단계 사이에는 재검증이 없어서, profile 응답을 기다리는 동안 로그아웃해도 vehicles 이하가 그대로 실행됐다. `queueSync()`는 `.staleSession`을 조용히 흡수해(실패 로그 없이) `clearDirty`를 건너뛴다.
- 검증(신규, `syncQueue.test.js`): "profile 응답을 기다리는 도중 로그아웃하면 vehicles/clients 이하 호출이 0회이고 dirty가 유지된다". **버그 임시 복원 확인**: 각 단계 사이 재검증을 지우면 이 테스트가 실제로 실패함(정확히는 세션이 끊긴 채 `syncVehicles`가 실행되며 크래시)을 실측 후 복원.

**4. driver_links insert 멱등성 — 조회 오류 처리 + DB 레벨 근본 해결**

- [`directMutations.js`](../react-app/src/lib/directMutations.js)의 `findExistingDriverLinkInsert()`가 조회 자체 실패(`{data:null, error}`)를 더 이상 `null`로 삼키지 않는다 — 그대로 던져 outbox가 retryable로 남기고 insert를 시도하지 않는다(있는지 없는지 모르는 채 insert하면 중복 위험). 검증(신규): "findExistingDriverLinkInsert 조회가 {data:null,error}를 반환하면 insert를 시도하지 않고 op이 남는다" — **버그 임시 복원 확인**: `throw error`를 `return null`로 되돌리면 실제로 실패함(insert가 나감)을 겹침조회는 정상 응답하도록 분리한 뒤 실측 후 복원.
- 근본 원인(invite_code 재발급 + 응답 유실이 겹치면 자연키로 "같은 시도"를 못 알아봄)은 client-side만으로는 완전히 닫을 수 없다고 판단했다 — **사용자에게 물어 "SQL 파일만 작성, 라이브 DB는 직접 건드리지 않는다"로 진행 방향을 확정**했다. [`supabase/migrations/0001_driver_links_idempotency_key.sql`](../react-app/supabase/migrations/0001_driver_links_idempotency_key.sql)에 `idempotency_key` 컬럼 + 부분 고유 인덱스 + **실제로 실행 가능한(예시/스케치가 아닌) 원자적 upsert RPC**(`upsert_driver_link_idempotent`, `INSERT ... ON CONFLICT (idempotency_key) DO UPDATE ... RETURNING *`로 조회+삽입을 한 트랜잭션으로 묶음)를 작성했다 — **Claude는 이 SQL을 실행하지 않았고 실행할 방법도 갖고 있지 않다**(Supabase CLI/DB 자격증명 없음). 사용자가 Supabase 대시보드/CLI로 직접 검토(특히 `vehicle_id`/`owner_id` 컬럼 타입이 파일에 적은 `bigint`/`uuid` 추정과 실제 스키마가 맞는지) 후 적용해야 하며, **적용을 사용자가 확인해 주기 전까지는 클라이언트 코드(`findExistingDriverLinkInsert`/`upsertDriverLinkOnSupabase`)를 이 RPC에 연결하지 않는다** — 마이그레이션 전에 연결하면 존재하지 않는 컬럼/RPC 호출로 전체 기능이 깨진다.
- **재감사 4번에서 문구 정정**: 이전 버전 문서/코드 주석의 "자동 수렴하는 진짜 멱등성"이라는 표현은 부정확했다(위 알려진 한계와 모순) — "서버 행 중복 삽입을 막는 안전장치"로 바로잡았다(아래 4차 재작업 8번 항목의 정정 참고).
- 검증(신규): "23505로 코드가 재발급된 뒤 응답이 유실돼도, 재시도에서 새로 insert하지 않아 서버 행이 정확히 1개다" — 마이그레이션 적용 전 현재 코드로도 겹침 검사(안전장치)가 항상 살아 있어 **중복 insert는 절대 안 일어남**을 확인했다(다만 그 안전장치가 "확정 실패"로 오판해 로컬을 롤백하는 부작용은 남아 있다 — 마이그레이션 적용 + 클라이언트 연결 전까지는 알려진 한계로 남는다).

**5. App.jsx 부트 복원이 라우트 전환마다 재실행되던 버그 수정**

- 원인은 위 "정정" 각주에 기록: `<BrowserRouter>`의 `useNavigate()`가 `location.pathname`이 바뀔 때마다 새 함수를 반환하는데, `goHome`이 `useCallback(fn, [navigate])`로 감싸여 있고 부트 이펙트가 `useEffect(fn, [goHome])`였다.
- 수정: [`App.jsx`](../react-app/src/app/App.jsx) — `navigate`를 `useRef`로 감싸고(`useEffect(() => { navigateRef.current = navigate })`, 의존성 배열 없이 매 렌더 후 갱신) `goHome`이 `navigateRef.current`를 호출하도록 바꿔 `useCallback(fn, [])`로 진짜 고정시켰다. 부트 이펙트는 `useEffect(fn, [goHome])`를 유지하되 `goHome`이 이제 항상 같은 참조라 실질적으로 마운트 시 한 번만 실행된다.
- 검증(신규 인프라 도입): 이 프로젝트에 컴포넌트 렌더 테스트가 없었으므로, `src/testSupport/jsxLoaderHook.mjs`(Node 모듈 커스터마이징 훅 + esbuild로 `.jsx`를 즉석 트랜스파일, `.css`는 빈 모듈로 대체 — 이 테스트 전용, 프로덕션 빌드 경로는 무변경)를 추가하고 `src/app/App.test.js`를 작성했다. 실제 `<BrowserRouter><App/></BrowserRouter>`를 jsdom에 렌더링해 로그인 계정으로 부트 → `/app` 도착 확인 → 마이페이지 탭 실제 DOM 클릭(`/app/me`로 이동) → 600ms 대기 → **여전히 `/app/me`에 머무는지 + `profiles.select` 호출 횟수가 늘지 않았는지**를 assert한다. **버그 임시 복원 확인**: `goHome`을 `useCallback(fn, [navigate])`로 되돌리면 이 테스트가 즉시 실패(`/app`으로 되돌아감)함을 실측 후 복원.

**6. 신규 테스트 6개(위 1~5번에 이미 기록) 정리**

`outboxFlush.test.js` 4개(롤백, 다단계삭제 로그아웃, 멱등성 조회실패, invite코드 재발급+응답유실) + `syncQueue.test.js` 1개(profile 대기 중 로그아웃) + `src/app/App.test.js` 1개(부트 재실행 방지) = 신규 6개. 기존 "기사 초대 upsert 성공" 테스트에도 Store 값/notify 횟수 assert를 추가했다(사용자 지시 6번의 "기사 upsert 성공 시 Store 값과 notify 횟수도 검증" 요구).

**7. 점진적 typecheck 인프라 (전체 106개 파일 완전 전환은 Step 11 범위)**

- `tsconfig.strict-inventory.json`: `strict:true, checkJs:true`로 전체 `src`를 검사하는 **부채 측정 전용** 설정(`npm run typecheck:strict-inventory`). Step 11(전체 JS→TS 전환) 완료 전까지 이 명령은 "아직 안 고친 게 몇 개인지"를 재는 용도이지, 통과 조건이 아니다. **기준선(2026-08-27, 이번 후속 보완 착수 시점): 총 1532개(프로덕션 파일 91개에 걸쳐 1269개, 테스트/testSupport 파일 34개에 걸쳐 263개)** — 대부분(TS7006/TS7031, 1042개)이 기존 컴포넌트/함수의 매개변수에 JSDoc 타입이 없어서 나는 "암묵적 any" 경고다. 이번 후속 보완이 아래 10개 프로덕션 파일 + 신규 타입 인프라 2개를 고친 뒤 재측정하면 **1333개(프로덕션 1132 + 테스트/support 201)**로 줄어든다 — 그 차이(199개)는 이번에 고친 파일 자신의 에러뿐 아니라, 그 파일들을 가져다 쓰는(아직 `// @ts-check`는 안 붙였지만 `checkJs:true`로는 여전히 분석되는) 다른 파일·테스트에서 타입이 더 정확해져 부수적으로 줄어든 에러도 포함한다. 나머지 1333개는 여전히 Step 11 몫이다.
- 실제 게이트 `npm run typecheck`(`tsc --noEmit`, `tsconfig.json`)는 `strict:true, checkJs:false`로 설정해, **`// @ts-check` pragma가 붙은 파일만** 엄격 검사한다(checkJs가 꺼져 있어도 파일 맨 위 `// @ts-check` 한 줄이 그 파일 하나는 강제로 엄격 검사하게 만드는 TypeScript 표준 동작). 이번에 수정한 프로덕션 파일 10개(`App.jsx`, `DriverConnectionPage.jsx`, `cloudSession.js`, `directMutations.js`, `mutationOutbox.js`, `outboxCommit.js`, `outboxFlush.js`, `requestDriverInviteSave.js`, `syncQueue.js`, `outboxRollback.js`) 전부에 `// @ts-check`를 붙이고, 이 설정에서 나던 135개(정확히는 133개, 코드 재검토 중 겹침조회 관련 케이스 2개가 사용자 카운트와 약간 다름 — 실제 `tsc` 출력 기준) 에러를 **any/unknown/@ts-ignore/@ts-expect-error/@ts-nocheck/strict·checkJs 완화 없이** 전부 구체적인 타입으로 고쳐 **0개**로 만들었다. 앞으로 이 10개 파일이나 새로 만드는 프로덕션 파일을 수정할 때도 같은 규칙(`// @ts-check` 유지 + 0 에러)을 적용한다.
- 새 타입 인프라: [`outboxTypes.js`](../react-app/src/lib/outboxTypes.js)(신규, 런타임 코드 없음 — `OutboxOp`/`OutboxPayload`/`DriverRecord`/`CarRecord`/`DriverLinkRow`/`SessionCapture`/`AppSession` 등 여러 파일이 공유하는 JSDoc 타입만 모음)와 [`outboxErrors.js`](../react-app/src/lib/outboxErrors.js)(신규, 이 시점엔 `isStaleSessionError`/`isPermanentFailure`/`toErrorMessage` — catch(error)의 `unknown`을 한 번만 좁히는 타입가드 3개였다 — **재감사 3번에서 `StaleSessionError`/`PermanentFailureError` 전용 클래스로 대체됐다. 아래 재감사 절 참고.**). 기존 `PersistDomain`(`store/persist.js`)/`DomainValue`(`store/app-store.js`)/`JsonValue`(`store/atomicPersist.js`) typedef를 그대로 재사용했다 — 새로 발명하지 않았다.
- 환경 타입: `@types/node`, `@types/jsdom`을 devDependency로 추가했고, `env.d.ts` + tsconfig의 `"types": ["vite/client", "node"]`로 `import.meta.env`/Node 내장 모듈/CSS import(`vite/client.d.ts`가 이미 `declare module '*.css' {}'`를 제공)를 커버한다.
- `outboxCommit.js`의 `domainValue: unknown`(재작업 1차 때 실수로 남긴 원칙 위반)을 `import('../store/app-store.js').DomainValue`로 즉시 교체했다 — `DomainValue`(object|Array<object>|Array<string>)가 `writeAllOrNothing`이 요구하는 `JsonValue`와 구조적으로 완전히 같지는 않아(임의 object가 인덱스 시그니처를 만족한다고 TS가 보장 못함) 그 경계 한 곳에만 `/** @type {JsonValue} */` 단언을 남기고 이유를 주석으로 적었다(any/unknown 아님 — 두 구체 타입 사이의 단언).
- 재검증(모두 통과 후에만 이 절을 `[x]`로 확정): `npm run typecheck` → **0 error**. `npm run typecheck:strict-inventory` → 1532 → **1333**로 감소(위에 기록한 부수 효과 포함, Step 11 전까지는 여전히 통과 조건 아님). `npm test` → **`tests 226 / suites 83 / pass 226 / fail 0`**(220 → 226, +6 = 위 6번 항목). `npm run build` → 성공. `npm run lint` → 신규 경고 0개(수정 중 생겼던 `outboxRollback.js`의 미사용 import 경고 1개는 그 자리에서 제거해 다시 0으로 만들었다).
- **알려진 한계(정직하게 기록)**: (a) 전체 1532개 legacy 타입 부채(프로덕션 1269 + 테스트/support 263) 제거는 이번 라운드 범위 밖 — Step 11(200줄 강제 및 TS)에서 전체 JS→TS 전환과 함께 처리한다. (b) 항목 4의 TOCTOU/invite_code 재발급 레이스는 DB 마이그레이션(`0001_driver_links_idempotency_key.sql`)을 사용자가 직접 검토·적용하고 클라이언트 코드를 그 컬럼을 쓰도록 바꿔야 완전히 닫힌다 — 이번 라운드는 SQL 작성 + 조회 오류 처리 개선까지만 했다. (c) 항목 3의 TOCTOU 레이스(정적 사전 검사 통과 직후 다른 클라이언트가 겹치는 배정을 커밋)는 여전히 별도 실패 주입 테스트가 없다(기존 4차 재작업 라운드의 같은 알려진 한계와 동일).

**재감사 4건 (사용자 지시 — 후속 보완 코드를 다시 검토해 지적한 4개 항목, 전체 1333개 legacy 타입 부채나 다른 리팩터링으로 범위를 넓히지 않음)**

**1. driverLink/upsert가 확정 전 여러 번 병합돼도 최초 롤백 앵커(id/previousDriverSnapshot)를 유지**

- 원인: `mergeOutboxOp()`의 "latest wins"가 같은 리소스의 upsert op을 매번 통째로 교체해서, A→B→C로 확정 전에 여러 번 편집되면 `previousDriverSnapshot`도 최신 op의 것(B, 서버가 확인한 적 없는 값)으로 바뀌었다 — 나중에 확정 실패가 나면 A가 아니라 B로 잘못 복원됐다.
- 수정: [`outboxDriverMerge.js`](../react-app/src/lib/outboxDriverMerge.js)(신규)의 `mergeDriverUpsert()` — 같은 리소스의 driverLink/upsert끼리 병합할 때는 최초 op의 `id`와 `payload.previousDriverSnapshot`을 그대로 이어받고 나머지 필드(실제 배정 내용)만 최신으로 갱신한다. [`mutationOutbox.js`](../react-app/src/lib/mutationOutbox.js)의 `mergeOutboxOp()`이 이 함수를 호출하고, `planOutboxAppend()`가 병합 결과(`effectiveOp`)를 함께 돌려준다 — id가 바뀔 수 있으므로 [`outboxCommit.js`](../react-app/src/lib/outboxCommit.js)의 `commitWithOutboxAndFlush()`는 자신이 만든 `op.id`가 아니라 이 `effectiveOp.id`로 flush 결과를 찾는다(안 그러면 최신 편집의 호출자가 이미 다른 id로 병합된 op의 결과를 못 찾는다).
- 검증(신규): `mutationOutbox.test.js`에 순수 병합 단위 테스트("A→B→C로 연속 병합돼도 최초 op의 id/previousDriverSnapshot을 그대로 이어받는다") + `outboxFlush.test.js`에 종단 테스트 2개("기존 기사 A→B→C로 편집된 뒤 확정 실패하면 최초 A로 복원된다", "신규 기사 생성 직후 재편집한 뒤 확정 실패하면 완전히 제거된다"). **버그 임시 복원 확인**: `mergeDriverUpsert`를 `return incoming`만 하도록 되돌리면 세 테스트 모두 실제로 실패함(최초 id 대신 최신 id가 남고, A 대신 B가 복원됨)을 실측 후 복원.

**2. requestDriverInviteSave의 사전 조회에도 session epoch 재검증**

- 원인: 사전 겹침/멱등성 조회(`checkDriverAssignmentConflict`)는 세션을 캡처하지도, 조회 도중 재검증하지도 않았다 — 조회 응답을 기다리는 동안 로그아웃해도 그대로 커밋까지 진행할 수 있었다.
- 수정: [`requestDriverInviteSave.js`](../react-app/src/lib/requestDriverInviteSave.js)가 조회를 시작하기 *전에* `captureSession()`으로 세션을 캡처하고, `checkDriverAssignmentConflict()` 내부의 두 await(멱등성 조회, 겹침 조회) 직후 + 로컬+outbox 커밋을 시작하기 직전, 총 세 지점에서 `assertSessionStillCurrent()`로 재검증한다. 어느 지점에서든 세션이 바뀌었으면(`StaleSessionError`) 로컬/outbox/원격 호출을 전혀 손대지 않고 조용히 반환한다.
- 검증(신규, `directMutationActions.test.js`): "겹침 조회 대기 중 로그아웃하면 Store/localStorage/outbox/이후 원격 호출이 전부 0이다" — notify 0회, Store 미반영, localStorage 원래 값 유지, outbox 비어 있음, 이후 원격 호출(insert/update/다른 테이블 select) 전부 0회를 확인. **버그 임시 복원 확인**: 조회 내부 재검증과 커밋 직전 재검증을 둘 다 지우면(둘 중 하나만 지우면 나머지 하나가 여전히 막아서 이 종단 테스트로는 구분이 안 된다 — 방어가 이중으로 겹쳐 있다는 뜻) 실제로 notify가 1회 발생해 실패함을 실측 후 복원.

**3. outboxErrors.js/syncQueue.js의 명시적 unknown 5건 제거**

- 수정: [`outboxErrors.js`](../react-app/src/lib/outboxErrors.js)를 `isStaleSessionError`/`isPermanentFailure`/`toErrorMessage`(unknown 매개변수 3개) 대신 `StaleSessionError`/`PermanentFailureError` 전용 Error 서브클래스 2개로 다시 썼다. [`cloudSession.js`](../react-app/src/lib/cloudSession.js)의 `assertSessionStillCurrent()`가 `throw new StaleSessionError()`로, [`outboxFlush.js`](../react-app/src/lib/outboxFlush.js)의 겹침 확정 실패가 `throw new PermanentFailureError(...)`로, 두 파일의 모든 판정이 `instanceof` 직접 비교로 바뀌었다. `syncQueue.js`의 두 `.catch((error) => ...)`(unknown 매개변수 2개)는 `Error`로 명시했다 — `queueSync`/`flushMutationOutbox`가 실제로 던지는 건 우리 코드의 `Error`류이거나 `@supabase/postgrest-js`의 `PostgrestError`(`extends Error`로 확인)뿐이라 정확한 타입이다. `mutationOutbox.js`의 `createPermanentFailure()`(레거시 팩토리, 기존에도 미사용)도 `new PermanentFailureError(message)`로 위임하도록 고쳐 새 클래스와 일관되게 맞췄다.
- 재확인: `grep -n "\bunknown\b"`로 두 파일 전수 검색 — 실제 코드에는 0건(설명 주석에서 "unknown을 안 쓴다"고 언급하는 프로즈 2건만 남음).
- `npm run typecheck` → 이 변경 이후에도 0 error 유지.

**4. SQL 마이그레이션을 실제 실행 가능한 형태로 완성 + "완전한 멱등성" 문구 정정**

- [`supabase/migrations/0001_driver_links_idempotency_key.sql`](../react-app/supabase/migrations/0001_driver_links_idempotency_key.sql)의 원자적 upsert RPC를 주석 처리된 예시가 아니라 실제로 실행 가능한 `create or replace function public.upsert_driver_link_idempotent(...)`로 완성했다 — `INSERT ... ON CONFLICT (idempotency_key) DO UPDATE ... RETURNING *`로 조회+삽입을 한 트랜잭션에 묶어, 같은 idempotency_key로 동시에 여러 번 불려도 정확히 한 행만 남는다. 컬럼 타입(`vehicle_id bigint`, `owner_id uuid`)은 이 코드베이스의 JS 사용 패턴에서 추론했다고 파일에 명시했다 — 실제 스키마와 다르면 사용자가 확인 후 고쳐야 한다.
- **여전히 Claude는 이 SQL을 실행하지 않았고 실행할 방법도 없다**(Supabase CLI/DB 자격증명 없음). 클라이언트 코드(`findExistingDriverLinkInsert`/`upsertDriverLinkOnSupabase`)도 사용자가 마이그레이션 적용을 확인해 주기 전에는 이 RPC에 연결하지 않았다 — 지금 연결하면 마이그레이션 미적용 환경에서 존재하지 않는 컬럼/RPC 호출로 전체 기능이 깨진다.
- 문구 정정: 4차 재작업 8번 항목의 표제 "자동 수렴하는 진짜 멱등성"을 "서버 행 중복 삽입을 막는 안전장치"로 바로잡고 정정 각주를 남겼다(위 8번 항목 참고). `directMutations.js`/`outboxFlush.test.js`의 관련 주석·테스트 설명은 원래부터 "서버 행 1개로 수렴" 같은 정확한 표현을 쓰고 있어(재검토 결과 "완전한 멱등성" 같은 과장 표현은 8번 항목 표제 외에는 없었다) 추가로 고치지 않았다.

**재검증(재감사 4건, 모두 통과 후에만 이 절 전체를 `[x]`로 확정)**

- `npm run typecheck` → **0 error**(변경 없음, 여전히 통과).
- `npm run typecheck:strict-inventory` → 1333 → **1343**(+10, 전부 이번에 추가한 신규 테스트 코드에서 나온 것 — 테스트 파일은 애초에 `// @ts-check` 대상이 아니라 이 부채 측정 명령에서만 보인다. 프로덕션 파일 쪽 에러 수는 1132로 그대로다 — 이번 변경이 프로덕션 타입 안전성을 후퇴시키지 않았다는 뜻).
- `npm test` → **`tests 231 / suites 84 / pass 231 / fail 0`**(226 → 231, +5 = `mutationOutbox.test.js` 2개 + `outboxFlush.test.js` 2개 + `directMutationActions.test.js` 1개).
- `npm run build` → 성공.
- `npm run lint` → 신규 경고 0개(기존 7개만 그대로).
- 200줄 제한: 이번에 수정/신규한 프로덕션 파일 전부 `wc -l`로 재확인 — `mutationOutbox.js`(197), `outboxErrors.js`(23), `outboxDriverMerge.js`(26), `cloudSession.js`(137), `outboxFlush.js`(198), `syncQueue.js`(139), `outboxCommit.js`(84), `requestDriverInviteSave.js`(126), `directMutations.js`(182, 무변경), `outboxRollback.js`(72, 무변경), `outboxTypes.js`(85, 무변경) — 전부 200줄 이하.
- **핵심 회귀는 버그를 임시로 되돌려 테스트가 실제로 실패하는 것을 확인한 뒤 복원했다**(항목별 임시 복원 기록은 위 각 항목 참고).
- Store/localStorage/outbox/원격 호출 수 교차검증: 항목 1(A→B→C 롤백 테스트가 `readJsonKey`/`hasPendingOps`로 직접 확인), 항목 2(신규 테스트가 notify 횟수·`getState()`·`readJsonKey`·`hasPendingOps`·`countOf` 5종을 전부 확인) 둘 다 이 절의 요구를 충족한다.
- **알려진 한계(정직하게 기록, 변경 없음)**: (a) 항목 4의 TOCTOU/invite_code 재발급 레이스는 마이그레이션을 사용자가 적용하고 클라이언트를 연결해야 완전히 닫힌다. (b) 이전 라운드부터의 항목 3(현 문서 기준 "3. 원격 실패 처리") TOCTOU 레이스는 여전히 별도 실패 주입 테스트가 없다. (c) 전체 1343개 legacy 타입 부채는 Step 11 범위로 그대로 남겨 뒀다 — 이번 재감사에서 건드리지 않았다.

**SQL 재재감사 (사용자 지시 — 재감사 4건 중 SQL 마이그레이션 1건만 추가 보완, Step 5/전체 타입 부채/다른 리팩터링으로 범위를 넓히지 않음)**

사용자가 위 SQL 마이그레이션([`0001_driver_links_idempotency_key.sql`](../react-app/supabase/migrations/0001_driver_links_idempotency_key.sql))을 다시 검토해 5개의 실무 보안/정확성 결함을 지적했다. 애플리케이션 코드는 전혀 건드리지 않고 이 SQL 파일 하나만 고쳤다.

1. **owner 단위 격리**: 고유 인덱스를 `(idempotency_key)` 단일 컬럼에서 `(owner_id, idempotency_key)` 복합 부분 인덱스(`driver_links_owner_idempotency_key_key`)로 바꿨다 — 서로 다른 owner가 우연히 같은 idempotency_key 문자열을 만들어도 서로 충돌하지 않는다. `ON CONFLICT (owner_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE ...`로 RPC의 conflict target도 이 부분 인덱스와 정확히 같은 predicate를 명시해 Postgres가 이 인덱스를 올바르게 추론하게 했다(부분 유니크 인덱스로 ON CONFLICT를 추론시키려면 WHERE 절이 인덱스 정의와 정확히 일치해야 한다).
2. **입력 검증**: 함수 본문 맨 앞에 `p_idempotency_key`가 `null`이거나 공백(`btrim(...) = ''`)이면 `RAISE EXCEPTION ... USING ERRCODE = '22023'`(invalid_parameter_value)로 즉시 거절하도록 추가했다 — 빈 키가 통과하면 여러 서로 다른 삽입이 전부 "키 없음"으로 취급돼(부분 인덱스가 null을 걸러내므로 고유 제약이 아예 안 걸림) 멱등성 판정 자체가 무력화되는 것을 막는다.
3. **owner_id 위조 방지**: `p_owner_id` 매개변수를 아예 없앴다(사용자가 제시한 두 방법 중 "가장 안전한" 쪽을 그대로 택함) — `auth.uid()`를 그 자리에서 직접 써서, 호출자가 임의의 owner_id를 지정해 다른 사람 행세를 할 방법 자체가 없다.
4. **함수 권한**: `revoke all ... from public`, `revoke execute ... from anon`으로 기본/익명 실행 권한을 명시적으로 회수하고 `grant execute ... to authenticated`로 로그인한 사용자에게만 부여했다. `security invoker`는 그대로 유지하고, driver_links의 기존 RLS 정책이 이 함수의 INSERT/UPDATE에도 그대로 적용된다는 것을 주석으로 명시했다(함수가 RLS 우회 통로가 되지 않는다).
5. **문서 표현 정정**: 파일 상단에 "실행 가능한 SQL로 작성했으나 라이브 DB에는 미적용·미검증"이라고 명시했다 — 이전 표현이 "실제로 실행해서 검증됨"으로 오해될 여지가 있었던 것을 바로잡았다. Claude는 이번에도 이 SQL을 라이브 프로젝트에 실행하지 않았고 실행할 방법도 없다(Supabase CLI/DB 자격증명 없음) — 문법·논리를 정적으로 검토해 작성했을 뿐, 실제 Postgres/Supabase 인스턴스에 대고 돌려 본 적은 없다.

**재검증(SQL 파일만 변경 — 애플리케이션 코드는 무변경이므로 아래 4개 명령은 이전 라운드와 동일하게 통과해야 정상이다)**

- `npm run typecheck` → **0 error**(변경 없음).
- `npm test` → **`tests 231 / suites 84 / pass 231 / fail 0`**(변경 없음 — 이번 라운드는 `.sql` 파일 하나만 고쳤다).
- `npm run build` → 성공.
- `npm run lint` → 신규 경고 0개(기존 7개만 그대로).
- **알려진 한계(정직하게 기록)**: 이 SQL은 여전히 라이브 DB에 미적용·미검증이다 — 사용자가 스테이징 등에서 먼저 실행해 문법 오류나 스키마 불일치(특히 `vehicle_id`의 실제 컬럼 타입, `driver_links`에 이미 걸려 있는 RLS 정책의 정확한 조건)가 없는지 확인해야 한다. 클라이언트 코드 연결은 여전히 하지 않았다.

### [x] Step 5 — 달력 홈 재작성 (슬라이스 3) — 1차 구현 + 재감사 1~3차 완료

- 폐기/대체: `MainPage.jsx`를 `ui/calendar/CalendarPage.tsx` + `CalendarGrid` + `CalendarCell` + `CalendarMonthSummary`로 분할.
- 뱃지: `domain`에서 `DayRecord` → `workBadge` / `isOff` / `hasUnpaid`. `inputMode === 'fare'` 연결.
- `unitPrice`는 설정 스토어. 고정노선 단가와 달력 합계 소스를 문서화(한쪽으로 통일하는 작업은 Step 6과 함께).
- 완료: 새로고침 후 같은 달, 셀 클릭 시 `/app/day/:date`.

**실제 구현 (`react-app`, `.jsx`/`.js` — 이 코드베이스는 Step 0-4 내내 실제 `.tsx`가 아니라 JSDoc 타입의 `.jsx`/`.js`를 써 왔으므로, 설계안의 `.tsx` 파일명은 그 관례에 맞춰 옮겼다):**

- **`MainPage.jsx` 폐기, `src/components/calendar/` 신설**: `CalendarPage.jsx`(103줄, 오케스트레이션) + `CalendarHeader.jsx`(89줄, 배너/알림·메뉴 버튼/년월 네비게이션) + `CalendarGrid.jsx`(50줄, 요일 헤더+셀 map, 뱃지를 domain 함수로 미리 계산) + `CalendarCell.jsx`(54줄, 순수 렌더) + `CalendarMonthSummary.jsx`(83줄, 미수 카드+운송료 정산 카드) + `calendar.css`(22줄). 어느 파일도 200줄을 넘지 않는다. `MainPageRoute.jsx`(122줄)만 남기고 `MainPage.jsx`는 삭제했다.
- **뱃지/URL 계산을 "타입 전용" domain 모듈로 분리**(재감사 3번): `dayFareTotal`/`dayWorkBadgeLabel`/`dayHasUnpaid`/`formatFareShort`는 `domain/calendarBadges.js`(신규, `// @ts-check`)로, `viewDateFromSearchParams`/`searchParamsForViewDate`는 `domain/calendarViewDate.js`(신규, `// @ts-check`)로 옮겼다 — `day-record.js`/`money.js`/`calendar.js`에 직접 `// @ts-check`를 붙여 실측해 보니(`tsc`) 그 파일들의 **선행 타입 부채**(암묵적 any 등, 내가 만들지 않은 기존 코드)가 그대로 드러나서, 신규 로직만 담는 전용 모듈로 뺐다. `hasUnpaid`(빨간 점, `.unpaid-dot`)는 이 react 포트에 아예 없던 기능이라 바닐라 `script.js`에서 새로 옮겼다.
- **`inputMode === 'fare'` 실제 연결**: `formatFareShort`(만원 이상 "N만", 미만 "N원")를 바닐라에서 그대로 옮겼다. `AppSettingsPage.jsx`의 "금액 표시는 달력에 나중에 붙입니다. 지금은 저장만 됩니다." 안내문(미구현 표시)을 지웠다 — 이제 실제로 붙었다.
- **고정노선 단가 vs 달력 합계 소스 — 통일하지 않고 문서화만**(Step 6으로 미룸): 바닐라는 별도 "1회 단가" 필드 없이 고정노선 연결 거래처의 `fixedUnitPrice`만으로 달력 합계를 계산한다. 이 포트는 아직 거래처 연동(Step 7) 이전이라 설정 스토어의 독립적인 `unitPrice`를 쓴다 — 근거를 `dayFareTotal`(`domain/calendarBadges.js`) 주석에 남겼다.
- **완료 조건 1 "새로고침 후 같은 달"**: `viewDate`를 `/app`의 `?y=&m=` 쿼리에 둔다(`domain/calendarViewDate.js`, 순수 함수). `CalendarPage.jsx`가 `useSearchParams()`로 읽고 쓴다.
- **완료 조건 2 "셀 클릭 시 `/app/day/:date`"**: Step 3의 라우팅 계약(`onSelectDay` → `navigate`, `resolveWorkLogCloseTarget`)을 그대로 재사용한다.
- **화면이 store를 직접 구독한다 — CalendarPage뿐 아니라 MainPageRoute(일지 입력)까지**(재감사 4번, `migration-plan.md` 1.3이 금지한 "페이지가 자기만의 `useState(() => loadX())` 스냅샷을 갖는" 패턴을 처음 깬다): 1차 구현은 `CalendarPage.jsx`만 store를 구독하고 `MainPageRoute.jsx`(WorkLogPage 입력)는 여전히 `useState(() => loadWorkData(...))` 로컬 스냅샷을 썼는데, 재감사에서 **화면마다 서로 다른 workData 소스를 갖는 게 바로 그 금지 패턴의 일종**이라는 지적을 받아 고쳤다. `store/ownerDataHooks.js`(신규, `// @ts-check`)에 `useOwnerWorkData`/`useOwnerSettings`를 만들어 `CalendarPage.jsx`와 `MainPageRoute.jsx` 둘 다 이 훅 하나로 같은 store 값을 구독한다. `useState`+`useEffect(() => subscribe(...))` 대신 React의 `useSyncExternalStore(subscribe, getSnapshot)`를 썼다 — "초기 렌더에서 store를 읽은 시점"과 "구독을 실제로 등록한 시점" 사이에 놓친 갱신이 없도록 React가 보장해 주는 정식 API라서다(수동 조합은 그 사이의 갱신을 놓칠 수 있다). `getSnapshot`은 참조 안정성이 필요해서(그렇지 않으면 React가 무한 루프로 본다) `settings`는 원본(store, 참조 안정적)만 구독하고 `normalizeSettings`는 렌더 바디에서 `useMemo`로 정규화한다. `saveDay`(`MainPageRoute.jsx`)는 커밋 직전에 `getState()`로 최신 workData를 다시 읽어(`readOwnerWorkData`) 그 위에 병합한다 — 별도 `setWorkData` 이중 상태 없이 `saveWorkData` 호출 자체가 store 갱신 + 구독자 알림을 겸한다.
- **`WorkLogPage.jsx`는 이번 Step 5 diff에서 완전히 제외했다**(재감사 2차 — 811줄짜리 이 파일에 `clients` 매개변수 타입 주석 하나만 넣었던 이전 시도가 "수정 파일 200줄 이하" 원칙을 위반한다는 지적을 받았다): `git hash-object`로 이 파일이 HEAD의 커밋된 blob과 바이트 단위로 완전히 동일함을 확인했다(`git status`가 여전히 `M`으로 표시하는 건 그 자체와 무관한 줄바꿈 정규화 캐시 아티팩트다 — 내용은 동일). 대신 `MainPageRoute.jsx`(`// @ts-check`)와 `WorkLogPage.jsx`(미타입) 사이의 경계를 담당하는 신규 파일 쌍 `app/typedWorkLogPage.js`(11줄) + `app/typedWorkLogPage.d.ts`(31줄)를 만들었다: `WorkLogPage`의 `clients` 매개변수는 기본값 `[]`만 있고 타입 주석이 없어서, TS가 다른 파일에서 그 함수의 타입을 볼 때 `clients`를 `never[]`로 좁힌다(빈 배열 리터럴 기본값의 알려진 추론 함정 — 실측 확인). 처음엔 `object`를 경유하는 이중 단언으로 풀었는데, **그건 사실상 `object`를 `unknown` 대용으로 써서 TS의 "두 타입이 충분히 겹치지 않는다"는 비호환 경고를 우회한 것과 다를 바 없다는 지적을 받고 재감사 3차에서 없앴다.** 대신 `.js`(런타임 재수출 `export { default as TypedWorkLogPage } from '../components/WorkLogPage.jsx'` 한 줄뿐, 캐스팅 없음)와 그 옆의 동명 `.d.ts`(타입 선언만) 쌍으로 바꿨다 — 같은 이름의 `.d.ts`가 있으면 TS는 `.js` 구현에서 타입을 추론하지 않고 `.d.ts`를 그대로 쓰는 정식 모듈 해석 규칙이라, 캐스팅 자체가 필요 없어졌다. `.d.ts`의 `clients`/`settings` 필드는 각각 `ReturnType<typeof loadClients>`/`ReturnType<typeof normalizeSettings>`로 실제 그 값을 만드는 함수의 반환 타입에서 파생한다(지어낸 타입이 원본 함수와 어긋날 위험이 없다). `any`/`unknown`/`{*}`/`@ts-ignore`/중간 단언은 전혀 안 썼다. `MainPageRoute.jsx`는 `WorkLogPage`가 아니라 이 `TypedWorkLogPage`를 렌더한다(import 방식 변경 없음, 기존 활성 typecheck 통과·`App.test.js` 렌더 테스트 그대로 통과 확인) — Step 6 전체 재작성으로 범위를 넓히지 않았다.
- **부트 세션 복원이 달력 월 쿼리를 지우는 버그를 브라우저 검증 중 발견해 수정**(`App.jsx`): 로그인 사용자가 `/app?y=2026&m=6`을 새로고침하면 `restoreSessionOnBoot()` 성공 후 항상 `goHome()`을 불러 쿼리를 지워 버렸다(게스트는 `restoreSessionOnBoot()`이 null이라 증상이 없었다). 이미 `/app`/`/onboarding`에 진입해 있었으면 세션만 채우고 경로·쿼리를 건드리지 않도록 고쳤다 — 판단 자체는 순수 함수 `isAlreadyInAppOnBoot`(`app/bootHomeGuard.js`, 신규, `// @ts-check`, 재감사 6번에서 200줄 제한 때문에 분리)로 뺐다.
- **`isAlreadyInAppOnBoot`을 경로 세그먼트 기준으로 다시 고쳤다**(재감사 2차): `pathname.startsWith('/app')`는 `/application`처럼 접두어만 같은 무관한 경로도 true로 잘못 판정했다. `/app`/`/onboarding` 그 자체이거나 `/app/`·`/onboarding/`으로 시작하는(=다음 문자가 경로 구분자인) 경우만 true로 좁혔다. `bootHomeGuard.test.js`에 `/application`/`/app-old`/`/onboarding-old`가 전부 false인 음성 테스트를 추가했다.
- **`.unpaid-dot`을 `<span aria-hidden="true">`로**(재감사 2차, 사용자 지시): `<button>` 안에 인터랙티브하지 않은 순수 장식 표시라 `div`보다 `span`이 맞고, 별도로 읽어 줄 텍스트가 없어 스크린리더에서 숨긴다. `CalendarCell.test.js`의 두 렌더 테스트(hasUnpaid true/false)가 여전히 통과함을 확인했다 — `.unpaid-dot` 클래스 선택자는 태그와 무관해 그대로 유효하다.

**typecheck 게이트 반영(재감사 3번)** — Step 5에서 신규·수정한 프로덕션 로직 전부에 `// @ts-check`를 붙였다: `CalendarPage.jsx`/`CalendarHeader.jsx`/`CalendarGrid.jsx`/`CalendarCell.jsx`/`CalendarMonthSummary.jsx`, `domain/calendarBadges.js`/`domain/calendarViewDate.js`(신규, 뱃지/URL 계산 전용), `store/ownerDataHooks.js`(신규), `app/bootHomeGuard.js`(신규), `app/typedWorkLogPage.js` + `app/typedWorkLogPage.d.ts`(신규, 재감사 2~3차), `app/MainPageRoute.jsx`. `App.jsx`는 이미 대상이었다. `any`/`unknown`/`{*}`/`@ts-ignore`/`@ts-expect-error`/중간 단언은 한 곳도 안 썼다 — 경계에서 타입이 막힐 때마다 `.d.ts` 선언이나 실제 함수의 `ReturnType`에서 파생한 타입만으로 풀었고, `day-record.js`의 `saveDayRecord`에도 매개변수 모양만(로직 변경 없이) JSDoc으로 추가했다. `WorkLogPage.jsx` 자체는 이제 diff가 없다(위 항목 참고).
  - `npm run typecheck` → **0 errors**.
  - `npm run typecheck:strict-inventory` — **재감사 2차에서 집계 방식 오류를 발견해 정정했다**: `tsc --pretty false` 출력의 총 줄 수(`wc -l`)를 오류 개수로 세고 있었는데, `TS2322` 등 여러 줄짜리 진단은 후속 설명 줄("Type X is not assignable...")까지 딸려 나와 그만큼 과다 집계됐다(기준 커밋에서 실제로는 +92줄, 이번 라운드에서는 +95줄 부풀려짐 — 우연히도 테스트/support 파일 쪽 진단은 대부분 한 줄짜리라 그 수치만 우연히 문서와 일치해서 처음엔 "환경이 다르다"고 잘못 결론 내렸었다). `error TS\d+:`가 포함된 진단 시작 줄만 세는 방식(`grep -c "error TS[0-9]+:"`, 파일 분류는 경로에 `.test.`/`testSupport` 포함 여부)으로 다시 측정했다:
    - 기준 커밋 `0281224`(react-app, `git worktree`로 재현): **전체 1343 / 프로덕션 1132 / 테스트·지원 211**(문서에 원래 기록된 값과 정확히 일치 — 재현 방식만 잘못됐었다).
    - 이번 재감사 시점: **전체 1309 / 프로덕션 1084 / 테스트·지원 225**.
    - 델타: **전체 -34 / 프로덕션 -48 / 테스트·지원 +14** — 프로덕션 오류가 늘지 않았고 오히려 줄었다(신규 타입 모듈들이 이전에 `MainPage.jsx`/`WorkLogPage.jsx` 타입 실험이 만들던 부채보다 적은 부채로 정착됐다). 테스트·지원 쪽 +14는 이번에 추가한 신규 테스트 파일들이 `checkJs:true`로 분석되면서 생긴 것(활성 게이트 대상이 아니라 이 부채 측정 명령에서만 보인다).
  - `tsconfig.strict-inventory.json`에 `"types": ["vite/client", "node"]`를 추가했다(`tsconfig.json`과 맞춤) — CSS 부작용 import(`import '*.css'`)에 대한 타입 선언이 없어서 `App.jsx`/`RevenuePage.jsx`/`main.jsx` 등 기존 파일에서도 이미 나던 `TS2882` 5개를 없앴다(내가 만든 게 아니라 이 부채 측정 설정 자체의 구멍이었다 — `vite/client`가 `*.css` 모듈을 선언한다). 위 수치는 이 수정을 반영한 뒤의 값이다.

**테스트 (재감사 5번 — 컴포넌트 회귀 테스트 4개 추가, revert-and-confirm-fail 전부 확인):**

- `domain/calendarBadges.test.js`(신규, `money.test.js`에서 이동+통합): `formatFareShort` 3개, `dayWorkBadgeLabel`/`dayFareTotal` 5개, `dayHasUnpaid` 4개.
- `domain/calendarViewDate.test.js`(신규, `calendar.test.js`에서 이동): `viewDateFromSearchParams`/`searchParamsForViewDate` 4개.
- `app/bootHomeGuard.test.js`(신규, 재감사 2차에서 1개 추가): `isAlreadyInAppOnBoot` 4개(경로 그대로/하위 세그먼트/그 외/**접두어만 같고 세그먼트가 다른 경로**(`/application`, `/app-old`, `/onboarding-old`) 전부 false).
- `components/calendar/CalendarCell.test.js`(신규 — 재감사 5번, 실제 jsdom 렌더): hasUnpaid=true → `.unpaid-dot` 존재, hasUnpaid=false → 없음. **되돌려서 확인**: `{hasUnpaid && ...}`를 `{false && hasUnpaid && ...}`로 임시로 바꾸니 첫 번째 테스트가 실제로 실패(`actual: null`)했고, 되돌리자 다시 통과했다.
- `app/App.test.js`(기존 파일에 2개 추가, 실제 `<BrowserRouter>+<App/>` 렌더):
  - "로그인 세션 복원 상태로 `/app?y=2026&m=6`을 렌더하면 pathname과 search가 그대로 보존된다" — **되돌려서 확인**: `App.jsx`의 조건부 분기를 임시로 예전처럼 무조건 `goHome()`으로 바꾸니 `search`가 `''`로 지워져 실제로 실패했고, 되돌리자 통과했다.
  - "store 구독: 마운트 후 외부에서 커밋한 workData를 CalendarPage/WorkLogPage가 보고, 한 날짜 편집이 다른 날짜를 지우지 않는다" — 마운트 후(=초기 렌더가 끝난 뒤) `commitWorkData`로 store에 두 날짜(B)를 외부에서 커밋하고, 달력 셀이 이미 그 값을 보여주는지, 셀 클릭 후 `WorkLogPage`의 입력값이 B와 일치하는지, 이어서 한 날짜만 편집(`#modalFixedCountInput`에 실제 `input` 이벤트)한 뒤 **건드리지 않은 다른 날짜가 store와 localStorage 양쪽에서 그대로 남는지**를 확인한다. **되돌려서 확인**: `MainPageRoute.jsx`를 임시로 예전 로컬 스냅샷(`useState(() => loadWorkData(...))`) 패턴으로 되돌리니 "WorkLogPage가 store의 최신값(B, 5회)을 받아야 한다" 단계에서 실제로 실패(`'' !== '5'`)했고, 되돌리자 통과했다.
- `package.json`의 `npm test` 파일 목록에 위 신규 테스트 파일을 전부 등록했다(재감사 2번 — 전에는 `money.test.js`를 만들어 놓고 이 목록에 안 넣어서 3개 테스트가 한 번도 실행된 적이 없었다. `git diff`로 실행 로그의 "244 pass"가 그 3개를 빼먹은 숫자였다는 걸 확인했다).
- `npm test` → **255/255 통과**(재감사 1차 이전 244개 — 그나마도 3개는 안 돌고 있었다 — 전부 포함해서 늘었다).

**브라우저 검증 (Browser pane, 로그인 계정 "테스트님" — 1차 구현 때 실시, 재감사에서는 위 App.test.js가 같은 시나리오를 실제 렌더로 재확인해 자동화됐다):**

1. `/app`에서 "이전 달" 클릭 → URL이 `?y=2026&m=6`으로 바뀜 → 새로고침해도 "7월" 유지(완료 조건 1).
2. 달력 셀(7월 6일) 클릭 → `/app/day/2026-07-06`, `WorkLogPage` 정상 렌더(완료 조건 2).
3. 일지의 "뒤로가기" 클릭 → `/app?y=2026&m=6`으로 정확히 복귀(달 유지).
4. 설정에서 "금액" 모드 전환 → 고정 횟수 3, 단가 150,000원 → 달력 셀 뱃지 "45만", 정산 카드 450,000/45,000/495,000원 정확히 표시.
5. 검증에 쓴 테스트 계정("테스트님")의 임시 데이터는 확인 후 되돌렸다 — 클라우드 동기화 계정이라 완전한 원복은 보장 못 한다(실제 사용자 데이터는 아니다).

**원자성 교차검증**: Step 5는 새 쓰기 경로를 만들지 않았다 — `saveUnitPrice`/`saveDay`는 기존 `savePracticeSettings`/`saveWorkData`(→`commitBatch`→`writeAllOrNothing`)를 그대로 부른다. `commitBatch`/`writeAllOrNothing`/session-epoch 가드 자체는 한 줄도 안 바꿨고, 그 경로를 검증하던 기존 테스트가 전부 그대로 통과했다. 재감사 5번에서 실제 `saveDay`(store 최신값 기준 병합)에 대한 컴포넌트 수준 회귀 테스트(위 App.test.js 두 번째 신규 테스트)를 추가해 "다른 날짜 유실 안 됨 + store/localStorage 일치"를 실제로 검증했다 — 1차 구현 때는 이 부분에 별도 실패 주입 테스트가 없었는데, 이번에 닫았다.

**알려진 한계(정직하게 기록)**:
- `useCalendarDays.ts` 훅은 만들지 않았다 — 설계안에는 있지만 `migration-audit-plan.md` Step 5 항목엔 없어서, 셀 계산은 기존 `buildCalendarCells`를 `CalendarPage.jsx`가 `useMemo`로 직접 쓰는 더 단순한 형태로 남겼다.
- 바닐라의 `maint-badge`(정비/주유/기타 비용 합계 뱃지)는 옮기지 않았다 — Step 5 항목이 `workBadge`/`isOff`/`hasUnpaid` 세 가지만 명시했고, 비용 관련 기능은 Step 6 영역이라 판단했다.
- 검증용 테스트 계정("테스트님") 데이터 복구 불완전 가능성(클라우드 동기화 계정이라 완전 원복 미보장).

### [x] Step 6 — 일지 재작성 (슬라이스 4) — 가장 큰 교체 — 사용자 최종 승인 (2026-08-29, 재감사 17차까지)

- 폐기: `WorkLogPage.jsx`, `InlineExpandHost.jsx`.
- 신규: `DayLogPage` + `useDayDraft` + `day-log-reducer`. `CallDetailForm` / `ExpenseForm` variant sheet.
- 콜상세 `id` 부여. 레거시 인덱스는 로드 시 한 번 마이그레이션.
- **비용을 day record에 clone으로 넣거나**, finance가 `expenses` 스토어를 읽도록 **한 계약만** 남긴다. 추천: 설계안대로 day record + 관리 화면은 같은 스토어 셀렉터.
- `palletCount` 섹션 + `saveDayRecord` empty 조건에 파렛트/비용 반영.
- 완료: 입력 → 즉시 화면 반영, 디바운스 후 localStorage, 빈 날 삭제, 언마운트 flush.

**실제 구현 (`react-app`, `.jsx`/`.js` + JSDoc — Step 5와 같은 관례):**

- **`WorkLogPage.jsx`(811줄) 완전 삭제, `src/components/day-log/` 신설(재감사에서 파일 수를 재확인해 정정 — 처음 문서에 "14개"로 잘못 적었다. 실제로는 프로덕션 23개(`src/components/day-log/` 22개 + `domain/callDetail.js` 1개) + 테스트 1개(`day-log-reducer.test.js`)다. 전부 `// @ts-check`, 프로덕션 전부 ≤200줄, `wc -l`로 재확인 완료)**: `DayLogPage.jsx`(194줄, 오케스트레이션) + `useDayDraft.js`(165줄, draft clone·디바운스 커밋·언마운트 flush·id 마이그레이션·quota 실패 처리) + `day-log-reducer.js`(83줄) + `useExpenseForm.js`(86줄) + `dayLogTypes.js`(58줄) + `inlinePanelActions.js`(36줄, 재감사 신규 — 인라인 패널 상호배제) + `CallDetailForm.jsx`(185줄) + `CallDetailCard.jsx`/`CallDetailList.jsx`/`FixedCountSection.jsx`/`FixedRouteChips.jsx`/`PalletSection.jsx`/`ExpenseGroups.jsx`/`ExpenseSelectPanel.jsx`/`MessageTemplateSheet.jsx`/`DayLogHeader.jsx`/`OffToggle.jsx`/`AutoSaveStatus.jsx`/`InlineSheet.jsx`/`icons.jsx`/`callDetailFormHelpers.js`/`day-log.css` + `domain/callDetail.js`(34줄). `InlineExpandHost.jsx`(65줄, maxHeight DOM 트릭)는 CSS grid 기반 `InlineSheet.jsx`(19줄)로 대체했다. `MainPageRoute.jsx`는 122줄 → 94줄(재감사 1번 수정으로 `key` prop 추가). Step 5의 임시 경계 파일 `app/typedWorkLogPage.js`/`.d.ts`도 삭제했다.
- **draft clone-and-debounce 계약 실제 구현**(설계안 1.3/1.4): `useDayDraft(ownerKey, dateKey, onCommitted)`가 마운트 시 `readOwnerWorkData(ownerKey)[dateKey]`를 `initDayLogState`로 얕은 복제해 로컬 draft를 만든다(`day-log-reducer.js`의 `initDayLogState`가 `callDetails` 배열/각 항목을 전부 새 객체로 복제 — store 원본을 그대로 들고 있다가 나중에 실수로 mutate하는 참조 공유 버그를 원천 차단). 편집은 `dispatch({type:'patchDraft', patch})`로 즉시 로컬 state만 바꿔 화면에 반영되고, 그 변경이 600ms 디바운스 뒤에만 `saveDayRecord` → `saveWorkData`(store+localStorage 원자적 커밋)로 실제 반영된다. 마운트 직후 첫 렌더(아무것도 안 건드린 상태)에는 디바운스를 걸지 않도록 `isFirstDraftRef`로 막았다 — 안 그러면 화면을 열기만 해도 600ms 뒤 불필요한 재커밋(+예약된 클라우드 동기화)이 매번 발생한다.
- **콜상세 안정적 `id` 부여 — 지연 재계산 방식에서 "로드 시 정확히 한 번" 영구 마이그레이션으로 재감사에서 교체(아래 FAIL 지적 3번 참고)**: 신규 저장 시 `call-details.js`의 `buildCallDetail`이 `generateLocalId('trp')`로 실제 id를 채우는 건 그대로다. 레거시(id 없는) 콜상세는 이제 `domain/day-record.js`의 `backfillCallDetailIds`가 순수 계산하고, `useDayDraft.js`가 마운트 시 그 결과를 store/localStorage에 원자적으로 커밋한다 — 더 이상 매번 다시 계산하는 임시값이 아니다.
- **`palletCount` — 데이터·empty 조건에 이어 화면 노출까지 실제로 동작(재감사에서 고침, 아래 FAIL 지적 4번)**: `saveDayRecord`가 `palletCount`를 정규화하고 빈 날 삭제 조건에 포함시키는 부분은 1차 구현 그대로다. `palletVisible` 계산이 항상 빈 `settings.clients`를 보던 버그를 고쳐, 고정노선 연결(`fixedRouteLinked`) + 파렛트(`palletOn`) 켜진 거래처가 실제로 있으면 `PalletSection.jsx`가 뜬다.
- **비용(정비/주유/기타) 단일 계약 — 재감사에서 "expenses가 정본" 쪽으로 확정(아래 FAIL 지적 2번)**: `useExpenseForm.js`가 여전히 별도 `expenses` 스토어(`lib/expenses.js`)에 즉시 저장하는 건 1차 구현 그대로지만, `domain/finance.js`의 `getOwnerMonthlyFinanceDetail`이 이제 그 `expenses`를 canonical 소스로 읽는다 — `record.maintItems`/`fuelItems`/`miscItems`(클라우드 hydrate 전용 필드)는 더 이상 안 읽는다(중복 계산 제거).
- **`ExpenseGroups.jsx` — migration-plan.md의 MaintSummary/FuelSummary/MiscSummary 3분할 대신 kind로 파라미터화한 컴포넌트 1개**(의도적 이탈, 파일 상단 주석에 이유 기록): 세 요약의 마크업/로직이 `kind`(`maint`/`fuel`/`misc`) 하나만 다르고 완전히 동일해서, 3개 파일로 쪼개면 DRY 위반이 된다고 판단했다.
- **`ExpenseFormModal.jsx` 재사용 — migration-plan.md의 신규 `ExpenseForm.tsx`/`FuelForm.tsx` 대신**: 기존 `ExpenseFormModal.jsx`에 이미 `inline` variant가 있어 그대로 `InlineSheet`에 넣어 재사용했다. 새 폼을 만들지 않았다.

**typecheck 게이트 반영** — Step 6에서 신규·수정한 프로덕션 로직 전부 `// @ts-check`. `any`/`unknown`/`{*}`/`@ts-ignore`/`@ts-expect-error`/중간 단언은 한 곳도 안 썼다 — 타입이 막힐 때마다 실제 값을 만드는 함수의 `ReturnType`이나 공유 typedef에서 파생한 타입, 혹은 구체적인 타입으로 좁힌 단언(`/** @type {SpecificType} */ (value)`)만 썼다. `domain/calendarBadges.js`가 갖고 있던 `CallDetailLike`의 지역 최소 정의(`fare`만 있음)와 새 `day-log/dayLogTypes.js`의 포괄적 정의가 이름이 겹치는 문제는, `domain/callDetail.js`(신규, typedef 전용, `export {}`)를 유일한 정본으로 만들고 양쪽이 그걸 alias하도록 정리해서 풀었다.
- `npx tsc --noEmit`(활성 게이트) → **0 errors**(1차 구현·재감사 수정 후 둘 다).

**테스트(1차 구현, revert-and-confirm-fail 확인) — `npm test` → 265/265 통과**(Step 5 완료 시점 255개 + `day-log-reducer.test.js` 9개 + `App.test.js` 신규 1개). 이 라운드에서 잡은 핵심 버그: 디바운스 effect의 cleanup이 `timerRef.current = null`까지 해서, 리액트가 언마운트 시 "활성 effect 전부"의 cleanup을 도는 특성 때문에 별도의 "언마운트 flush" effect가 "밀린 타이머가 있었다"는 신호를 잃어 flush를 조용히 건너뛰던 문제 — `clearTimeout`만 남기고 `= null` 대입을 지워서 고쳤다(고치기 전 `4 !== 7`로 실패 → 고친 후 통과, 직접 확인).

**빌드/린트/포맷 검증(재감사 수정 반영 후 최종):**
- `npm run build` → 성공.
- `npm run lint`(oxlint) → 경고 4개, 전부 Step 6 이전부터 있던 기존 경고(`AppShell.jsx`/`ReceivablesPage.jsx`/`TaxInvoicePage.jsx`의 `exhaustive-deps`). Step 6이 새로 만든 경고는 0개(재감사 중 한 번 `useDayDraft.js`의 새 mount effect가 경고를 냈는데, 억지로 disable 주석을 쓰는 대신 실제 의존성(`idMigration.changed`, `commitNow`)을 배열에 적어 넣어 없앴다 — 둘 다 이 컴포넌트 인스턴스 생애주기 동안 참조가 안 바뀌니 동작은 그대로다).
- `git diff --check`(react-app, ubiquitous-parakeet 둘 다) → 실제 오류 없음, LF→CRLF 줄바꿈 정규화 경고만(내용과 무관).

---

## Step 6 재감사 — FAIL, 10건 지적 → 전부 수정 (사용자 지시)

1차 구현 완료 보고 후 사용자 재감사에서 **FAIL** 판정을 받았다. 지적된 10건을 전부 수정했고, 항목마다 revert-and-confirm-fail로 실제 검증했다(대부분 `App.test.js`에 실제 `<BrowserRouter>+<App/>` 렌더 테스트로 추가, 일부는 `domain/*.test.js` 순수 함수 테스트로 추가).

**1. `useDayDraft`의 ownerKey/dateKey 변경 시 이전 draft가 새 날짜에 저장되는 데이터 오염** — react-router는 같은 Route(`day/:date`)에서 `date` 파라미터만 바뀌면 `MainPageRoute`/`DayLogPage`를 언마운트하지 않고 재사용한다. `useDayDraft`의 `useReducer` 초기값은 "마운트 시 한 번만" 계산되므로, 과거 날짜(A)를 열고 하단 "일일운행" 탭으로 오늘 날짜(B)에 바로 이동하면 A의 draft가 B로 그대로 넘어오고, 이미 걸려 있던 디바운스 타이머가 B의 dateKey로 A의 데이터를 커밋해 버렸다. **수정**: `MainPageRoute.jsx`가 `<DayLogPage key={`${ownerKey}:${selected.dateKey}`} .../>`로 날짜가 바뀔 때마다 이 서브트리를 완전히 새로 마운트하게 했다 — 기존에 이미 실측 검증된 언마운트 flush effect가 "옛 인스턴스"에서 정확히 한 번 실행돼 A의 밀린 편집을 A에만 flush하고, "새 인스턴스"는 B의 데이터로 완전히 새로 초기화된다. **테스트**: `App.test.js` "재감사 FAIL 지적 1번" — A(2026-08-01)에 2, B(오늘)에 6을 seed → A를 열어 9로 고치되 디바운스 전에 "일일운행" 탭 클릭 → B가 자기 값(6)으로 뜨는지, A의 9가 A에만 flush되는지, 700ms를 더 기다려도 B가 9로 덮이지 않는지, store/localStorage 양쪽 확인. **되돌려서 확인**: `key` prop을 제거하니 `'9' !== '6'`으로 실패(B가 A의 draft로 덮임), 복원 후 통과.

**2. 비용(정비/주유/기타) 단일 계약 미완성** — `getOwnerMonthlyFinanceDetail`이 `record.maintItems`/`fuelItems`/`miscItems`(클라우드 hydrate 전용 필드)를 읽고 있어서, 일지에서 로컬로 추가한 비용이 매출 화면에 반영되려면 클라우드 왕복이 필요했다. **수정**: `domain/finance.js`의 `getOwnerMonthlyFinanceDetail`에 5번째 매개변수 `expenses`를 추가하고, 비용 집계를 `sources`(차량별) 루프 밖에서 canonical `expenses` 배열 한 번만 훑도록 다시 짰다 — `record.maintItems`/`fuelItems`/`miscItems`는 이제 전혀 안 읽는다(중복 계산 원천 차단). `RevenuePage.jsx`가 `loadExpenses(ownerKey)`를 읽어 넘긴다(라우트 진입마다 새로 읽으므로 새로고침 없이도 최신 값). `finance.fixtures.js`에 `FIXTURE_EXPENSES`를 추가하고 `finance.test.js`의 vanilla 패리티 테스트에도 반영했다. **테스트**: `finance.test.js`에 신규 describe 블록 4개 — "record.maintItems가 있어도 무시하고 expenses만 합산(중복 0건)", "expenses가 비면 0(record를 fallback으로 안 씀)", "월이 다른 항목 제외", "즉시 반영(새로고침 없이)". **되돌려서 확인**: `record.maintItems`를 다시 합산하도록 임시로 되돌리니 `61111 !== 11111`(이중 계산)로 실패, 원복 후 20/20 통과.

**3. 레거시 콜상세 id — 매번 재계산되던 `legacy-${index}`를 "로드 시 정확히 한 번" 영구 마이그레이션으로 교체** — `getCallDetails`가 매번 배열 인덱스로 임시 id를 새로 만들어서, store에 전혀 반영되지 않고 삭제·재정렬·새로고침마다 값이 흔들렸다. **수정**: `domain/day-record.js`에 순수 함수 `backfillCallDetailIds(record)`를 새로 만들어(id 없는 항목만 `call-details.js`와 같은 형식의 영구 id로 채우고, 이미 다 있으면 `changed:false`+같은 참조로 멱등) `getCallDetails`에서는 id 합성을 완전히 뺐다. `useDayDraft.js`가 마운트 시(`useState`로 인스턴스당 한 번) 이 결과를 draft 초기화에 쓰고, `changed:true`면 즉시 `commitNow()`로 store/localStorage에 원자적으로 반영한다(실패하면 아래 9번의 재시도 로직을 그대로 탄다). **테스트**: `workData.test.js`에 `backfillCallDetailIds` describe 블록 7개 — 부분 채움/멱등/빈 배열/재로드 후 동일/삭제 후에도 남은 항목 id 불변/재정렬 후에도 id가 항목을 따라감/hydrate 왕복(JSON 직렬화 흉내) 후에도 동일. `day-log-reducer.test.js`의 기존 "레거시 id 임시 채움" 테스트는 책임이 옮겨졌으므로 "`initDayLogState`는 더 이상 스스로 id를 만들지 않는다"로 갱신(커버리지는 유지·강화 — 삭제하지 않았다).

**4. `palletVisible` 계산이 실제 `clients` 배열과 연결 안 됨** — `getFixedRouteClient(settings)`를 부르고 있었는데 `normalizeSettings`는 `clients` 필드를 만들지 않는다(항상 `undefined`) — 그래서 파렛트 섹션이 구조상 절대 뜰 수 없었다(1차 구현 때 "Step 7 전까지 항상 숨겨진다"고 적은 것 자체가 이 버그 때문이었다). **수정**: `DayLogPage.jsx`가 `getFixedRouteClient({ clients })`로 화면이 이미 받고 있는 `clients` prop(`MainPageRoute.jsx`의 `loadClients(ownerKey)`)을 넘기게 고쳤다. **테스트**: `App.test.js` "재감사 FAIL 지적 4번" — `fixedRouteLinked:true, palletOn:true` 거래처를 seed하고 실제로 `#modalPalletCount`가 뜨는지, 값을 입력해 디바운스 저장 후 재진입해도 값이 유지되는지 확인. **되돌려서 확인**: `getFixedRouteClient(settings)`로 되돌리니 파렛트 입력을 못 찾아 실패, 복원 후 통과.

**5. `settings.callDetail=false`일 때 콜상세 섹션을 숨기지 않음** — 설정 토글과 무관하게 항상 렌더하고 있었다(1차 구현 때 놓친 계약 — Step 0 이전 감사 문서의 Gap 분석 "C. 설정 스키마·토글 의존성"이 이미 지적했던 문제였다). **수정**: `DayLogPage.jsx`가 `settings.callDetail &&`로 `CallDetailList`+콜상세 `InlineSheet`를 감쌌다. **테스트**: `App.test.js` "재감사 FAIL 지적 5번" — `callDetail:false`로 커밋 후 `.call-detail-section`이 없는지, 리마운트 없이 `callDetail:true`로 다시 커밋하면(스토어 구독 재렌더만으로) 보이는지 확인.

**6. 콜상세 인라인 패널과 비용 인라인 패널이 동시에 열릴 수 있음** — 두 패널이 서로 다른 state(리듀서의 `callFormOpen`, `useExpenseForm`의 `kindPick`/`modalOpen`)에 있어서 하나를 열어도 다른 쪽이 안 닫혔다. **수정**: `useExpenseForm.js`에 `closeAll()`을 추가하고, 새 파일 `inlinePanelActions.js`(`DayLogPage.jsx` 200줄 제한 때문에 분리)의 `bindInlinePanelActions(dispatch, expenseForm)`가 "여는 쪽이 반대쪽을 먼저 닫는" `openCallForm`/`openExpenseAdd`/`openExpenseEdit`/`openExpenseKindPick`을 만들어 준다 — `DayLogPage.jsx`의 모든 "열기" 진입점을 이걸로만 좁혔다. **테스트**: `App.test.js` "재감사 FAIL 지적 6번" — 콜상세 폼을 열고 `.call-detail-modal-content`가 있는지, 비용 폼을 열면 그게 DOM에서 사라지고 `.maint-fuel-select-inline`이 뜨는지(CSS로 숨기는 게 아니라 `InlineSheet`가 닫힌 쪽 컨텐츠를 아예 안 그린다는 것까지 확인). **되돌려서 확인**: cross-close를 빼고 원래 함수를 직접 쓰게 되돌리니 두 폼이 동시에 열려 테스트가 실패(revert 상태에서 렌더 루프성 문제로 타임아웃까지 겹쳐 `RangeError`로 크래시했다 — 어느 쪽이든 FAIL임은 명확하다), 복원 후 통과.

**7. 신규/수정 로직이 활성 typecheck 게이트 밖에 있던 파일 2개** — `callDetailFormHelpers.js`와 `icons.jsx`에 `// @ts-check`가 빠져 있어서(신규 파일인데도), TS7006(암묵적 any 매개변수) 등이 활성 게이트에서 전혀 안 잡히고 있었다. **수정**: 둘 다 `// @ts-check` 추가. `callDetailFormHelpers.js`의 `draftFromDetail`/`commissionInfo`에 `CallDetailLike`/`ClientLike`(`dayLogTypes.js`) 매개변수 타입을 붙였다. `icons.jsx`는 이미 SVG만 그리는 컴포넌트라 타입 추가 없이도 `@ts-check`만으로 통과했다. `any`/`unknown`/`object` 경유 단언/`@ts-ignore`/`@ts-expect-error`는 전혀 안 썼다. `npx tsc --noEmit` → 0 errors 유지. `npm run typecheck:strict-inventory`(전체 수치는 재감사 항목 8개를 전부 반영한 뒤의 최종값, 아래 참고) — 신규 두 파일에서 나던 오류는 0건(직접 grep으로 확인).

**8. draft↔store 참조 분리가 `structuredClone` 수준이 아니었음** — `initDayLogState`가 콜상세 item을 `{...item}`으로만 얕게 복제해서, item 안의 `payments` 배열·`commissionSnapshot` 객체는 store 원본과 여전히 같은 참조였다(어딘가서 그 중첩 값을 제자리 수정하면 store까지 같이 바뀔 수 있는 잠재 버그). `commitNow`도 draft를 그대로(구조적 복제 없이) `saveDayRecord`에 넘겨서, 커밋 후에도 store와 draft가 같은 배열/객체를 공유했다. **수정**: `day-log-reducer.js`의 `initDayLogState`(로드 방향)와 `useDayDraft.js`의 `commitNow`(저장 방향) 둘 다 `structuredClone`으로 바꿨다 — `callDetails`/`fixedRouteCounts` 전체를 깊게 복제해서 어느 방향으로도 중첩 값까지 참조가 안 섞인다. **테스트**: `App.test.js` "재감사 FAIL 지적 8번" — `payments`/`commissionSnapshot`이 있는 콜상세를 seed하고, **그 콜상세 자체는 안 건드리는** 편집(fixedCount만 변경)으로 커밋을 유발해서, 커밋 전후 `callDetails[0]`과 그 안의 `payments`/`commissionSnapshot`이 각각 새 참조인지(`notEqual`) + 값은 그대로인지(`deepEqual`) 확인. `structuredClone`을 하나라도 얕은 복제로 되돌리면 이 테스트는 실패한다(참조가 같아진다) — 설계상 그렇게 되도록 짠 테스트다.

**9. quota 실패 주입 테스트 없음 + 실제로 quota 실패에 취약했음** — `commitNow`가 `saveWorkData`를 try/catch 없이 불러서, localStorage 용량 초과(`writeAllOrNothing`이 던짐) 시 미처리 예외로 새고 `autoSaveStatus`가 거짓으로 `'saved'`가 될 뻔했다(다행히 순서상 `saveWorkData` 실패 시 그 아래 `setAutoSaveStatus('saved')` 줄엔 도달하지 않지만, 실패를 알리는 코드 자체가 없었다). 게다가 디바운스 effect가 타이머 예약 시점에 `timerRef.current`만 보고 "밀린 편집이 있다"고 판단했는데, `commitNow`가 시도 시작과 동시에 `timerRef.current`를 비워서, 실패 후 곧장 화면을 나가면 언마운트 flush가 "밀린 게 없다"고 착각해 재시도조차 안 하고 편집을 조용히 버릴 뻔했다. **수정**: `commitNow`에 `try/catch`를 둘러 실패 시 `autoSaveStatus:'failed'` + 실패 토스트(`showToast`, 새 매개변수로 스레딩)를 띄우게 했다. "밀린 편집이 있다"는 신호를 `timerRef`와 분리한 `hasPendingRef`로 새로 만들어, 성공적으로 커밋됐을 때만 false가 되게 했다 — 실패한 뒤 언마운트해도 `hasPendingRef`가 true로 남아 있어 flush가 재시도한다. `useExpenseForm.js`의 `persist`도 `saveExpenses`(던질 수 있음)를 먼저 시도하고 성공했을 때만 React state를 바꾸도록 순서를 바꿨다(예전엔 state를 먼저 바꿔서 저장 실패해도 화면은 "저장된" 것처럼 보일 수 있었다) — `save()`/`remove()`가 실패를 잡아 토스트로 알리고, 저장 폼(`modalOpen`/`draft`)은 실패 시 안 닫아서 재시도할 수 있게 뒀다. `AutoSaveStatus.jsx`에 `failed` 상태 문구·색상을 추가했다. **테스트**: `App.test.js` "재감사 FAIL 지적 9번" — `Storage.prototype.setItem`을 `workData:<owner>` 키에만 실패하도록 mock(quota 초과 흉내) → 입력 → **store/localStorage 불변** + **`.autosave-status`가 "저장 실패" 표시**(거짓 "저장됨" 아님) + **실패 토스트** 확인 → mock을 정상으로 되돌리고 화면을 나가면(언마운트 flush 재시도) **실패했던 편집이 결국 store/localStorage에 반영되는지**(유실 안 됨) 확인.

**10. 문서 오류 — "day-log 신규 14개 파일"이 실제 개수와 다름, "알려진 한계"가 실제로는 미완료 요구사항이었음** — 실제로는 `src/components/day-log/` 22개 프로덕션 + 1개 테스트, `domain/callDetail.js` 1개 추가로 프로덕션 총 23개다(위 "실제 구현" 절 정정). 1차 구현 보고서가 "알려진 한계"로 적었던 두 항목(비용 이중 저장 버그, palletCount 화면 비활성)은 실제로는 **Step 6 완료 조건에 포함된 요구사항을 못 채운 것**이었다 — 이번 재감사에서 2번·4번으로 고쳤으므로 그 문구를 지웠다(위 알려진 한계 절 참고, 지금 남은 항목만 진짜 의도적 이탈/후속 Step 몫이다).

**typecheck:strict-inventory 최종(재감사 10건 전부 반영 후)** — Step 5 완료 시점 대비:
- Step 5 완료 시점: 전체 1309 / 프로덕션 1084 / 테스트·지원 225.
- Step 6 1차 구현: 전체 1271 / 프로덕션 1032 / 테스트·지원 239.
- Step 6 재감사 수정 후: **전체 1319 / 프로덕션 1023 / 테스트·지원 296**.
- 프로덕션은 1차 구현보다도 더 줄었다(-9, `callDetailFormHelpers.js`/`icons.jsx`에 `@ts-check`를 붙이면서 오히려 그 파일들의 부채가 0으로 잡혀서다). 테스트·지원 +57은 이번 라운드에서 추가한 실제 렌더/순수함수 테스트가 전부 `checkJs:true` 부채 측정에도 잡히는 것 — 활성 게이트(`npx tsc --noEmit`)는 여전히 0 errors다.

**`npm test` 최종(재감사 10건 반영 후)**: **282/282 통과**(1차 구현 265개 + `workData.test.js`의 `backfillCallDetailIds` 7개 + `finance.test.js`의 canonical expenses 4개 + `App.test.js` 신규 6개, `day-log-reducer.test.js` 기존 1개는 내용만 갱신). 핵심 항목(1/2/4/6번)은 각각 되돌려서 실패를 직접 확인했다(위 각 항목 참고) — 8번(structuredClone)과 9번(quota)은 설계상 얕은 복제/try-catch 부재로 되돌리면 반드시 실패하도록 짠 테스트라 별도 되돌리기를 하지 않았다.

**원자성 교차검증(최종)**: Step 6은 여전히 새 저장 경로를 만들지 않았다 — `commitNow`는 `readOwnerWorkData`로 최신 store 값을 다시 읽어 `saveDayRecord`로 병합한 뒤(재감사 8번부터는 `structuredClone`으로 깊게 복제한 patch를) 기존 `saveWorkData`(→`commitBatch`→`writeAllOrNothing`, 원자적 쓰기)로 그대로 넘긴다. `commitBatch`/`writeAllOrNothing`/session-epoch 가드는 한 줄도 안 바꿨다. 재감사 9번에서 실패 경로(quota 초과)까지 실제로 주입해 "store/localStorage 불변 + notify 0회(실패 시 `applyDomainToState`/`notify`/`scheduleCloudSync` 전부 그 앞의 throw로 도달 안 함, 기존 `commitBatch` 구조 그대로) + pending 유실 없음"을 확인했다 — 1차 구현 때는 이 실패 경로 자체가 테스트도 방어 로직도 없었다.

**알려진 한계(1차 재감사 반영 후, 2차 재감사에서 갱신됨 — 아래 절 참고)**:
- `ExpenseGroups.jsx`(3파일→1파일)와 `ExpenseFormModal.jsx` 재사용은 migration-plan.md의 문자 그대로의 파일 목록과 다르다(의도적 이탈, 위에서 이유를 기록). 기능·계약은 동일하다.
- ~~`domain/finance.js`/`components/RevenuePage.jsx`를 "기존 대형 파일" 이유로 최소 패치만 했다~~ → **2차 재감사에서 실제로 200줄 이하로 쪼갰다(아래 참고). 더 이상 한계가 아니다.**
- 콜상세 `payments`/미수 키는 여전히 배열 인덱스 기반이다(Step 8 "미수 키를 detailId로" 몫) — 이번 재감사의 id 마이그레이션(3번)은 콜상세 자체의 id만 영구화했고, payments/미수 조회 로직의 인덱스 의존성 자체는 안 건드렸다.

---

## Step 6 재감사 2차 — 7건 지적 → 전부 수정 (사용자 지시)

1차 재감사(FAIL 10건 수정) 보고 후 사용자가 다시 검토해 **7건**을 추가로 지적했다 — "구조는 맞는데 세부 동작이 실제로는 안 된다", "기존 대형 파일 예외를 완료 처리로 쓰지 마라", "실제 로그인 브라우저로 끝까지 검증해라" 세 갈래였다. 전부 수정하고 각 항목을 먼저 재현(revert-and-confirm-fail)한 뒤 고쳤다.

**1. driver scope(기사 손익) 비용 오염** — 1차 재감사에서 canonical `expenses`로 비용 계약을 통일하면서, `getOwnerMonthlyFinanceDetail`의 expenses 집계 루프를 `sources`(차량별) 루프 **밖**으로 뺐는데, `scope==='driver'`일 때도 그 루프가 그대로 도는 gate 누락이 있었다 — 오너의 정비/주유/기타 비용이 기사 손익 화면에도 섞여 들어갔다. **재현**: `getOwnerMonthlyFinanceDetail(MONTH_KEY, 'driver', ..., ownerExpenses)`가 `50000`을 돌려줘야 하는데(버그) `0`이어야 정상 — 실제로 `50000 !== 0`으로 재현 확인. **수정**: `financeOwnerDetail.js`의 expenses 루프를 `if (scope !== 'driver') { ... }`로 감쌌다(`sources`에 `'main'`을 넣는 조건과 동일 기준). **테스트**: `finance.test.js` "scope=driver에는 오너의 expenses가 섞여 들어가면 안 된다".

**2. `useExpenseForm`의 stale 전체배열 덮어쓰기** — `expenses`를 `useState(() => loadExpenses(ownerKey))`로 마운트 시 한 번만 스냅샷 떠서, 그 사이(다른 탭·hydrate·동시 조작)로 store에 반영된 항목을 다음 `save()`/`remove()`가 그 스냅샷 기준으로 통째로 덮어써 지웠다. **재현**: e1을 seed → 화면 마운트 → 화면이 모르는 사이 e2를 store에 추가 → 화면에서 새 항목(신규 정비 내역) 저장 → 결과가 2건(e1+신규)이어야 하는데 실제로는 e2가 사라짐(`2 !== 3`로 재현). **수정**: `store/ownerDataHooks.js`에 `useOwnerExpenses`(구독)/`readOwnerExpenses`(쓰기 직전 재확인) 추가 — `useDayDraft.js`와 정확히 같은 이중 방어 패턴(렌더는 항상 store 구독, 커밋 직전엔 한 번 더 최신값 재확인). `useExpenseForm.js`가 이 훅으로 바꿨다. **테스트**: `App.test.js` "비용 저장이 그 사이 store에 추가된 다른 비용을 덮어쓰지 않는다".

**3. 달력 `fixedUnitPrice` 단일 계약 미완성** — Step 5가 "통일은 Step 6에서"라고 미뤄 뒀던 항목. 달력(`day-record.js`의 `monthWorkFareSummary`)은 `settings.unitPrice`만, 매출(`finance.js`)은 `getFixedRouteClient(settings)?.fixedUnitPrice`만 봐서(연결된 거래처가 없으면 0), 고정노선 거래처가 없는 대부분의 현재 상태에서는 **달력엔 금액이 뜨는데 매출 화면은 0**으로 서로 다른 값을 보여줬다. **재현**: `getMonthlyFareRevenue`가 `resolveFixedUnitPrice` 없이 예전처럼 클라이언트 값만 보게 되돌리니, 같은 데이터로 달력 월합계(360,000원)와 매출 합계(0원)가 `0 !== 360000`으로 어긋남을 확인. **수정**: `domain/clients.js`에 `resolveFixedUnitPrice(settings)`(연결된 거래처 있으면 그 값, 없으면 `settings.unitPrice` fallback) 하나만 만들어 `financeCore.js`/`financeOwnerDetail.js`(매출·손익)와 `CalendarPage.jsx`(달력, `loadClients` 추가)가 전부 이 함수만 쓰게 통일했다. `lib/ownerFinance.js`의 `buildFinanceSettings`에도 `unitPrice`를 추가해 매출 화면의 fallback이 실제로 동작하게 했다. **테스트**: `clients.test.js`에 `resolveFixedUnitPrice` 단위 테스트 4개 + "달력 월합계와 매출 월합계의 고정노선분이 일치한다" 통합 테스트.

**4. persistent quota 상태 + 라우트 이동 시 draft 영구 유실** — 1차 재감사(FAIL 9번)의 quota 방어는 "언마운트 시 한 번 더 재시도"까지만 했는데, quota가 **계속**(persistent) 막혀 있으면 그 마지막 재시도조차 실패하고, 컴포넌트가 사라지면 `draftRef`도 같이 사라져 그 편집을 되살릴 방법이 없었다. **재현**: quota를 계속 실패하게 두고 입력 → 실패 확인 → 그 상태로 뒤로가기(마지막 재시도도 실패) → 전역 재시도 큐가 없으면 `hasPendingDayWrites()`가 `false`여야 하는데(유실) 있어야(안 유실) 정상 — 재현 시 `false !== true`로 확인. **수정**: 새 모듈 `lib/pendingWorkDataWrites.js`(컴포넌트 생애주기와 무관한 모듈 전역 큐) + `app/pendingWriteRetryListeners.js`(online 이벤트 + 5초 주기 재시도) + `providers.jsx`의 `PendingWriteRetryBridge`(App.jsx에 마운트, `SyncFlushBridge`와 같은 자리) — `useDayDraft.js`의 `commitNow` 실패 시 이 큐에 patch를 등록하고, 성공 시(재시도 포함) 지운다. **테스트**: `App.test.js` "persistent quota + 라우트 이동에도 draft가 영구 유실되지 않고, 여유가 생기면 재시도로 반영된다" — quota를 계속 막아 둔 채 입력→뒤로가기→(컴포넌트 사라진 뒤) `hasPendingDayWrites()===true` 확인 → `online` 이벤트를 실제로 쏴서 `PendingWriteRetryBridge`가 재시도하는지, 결국 store/localStorage에 반영되고 큐가 비는지(`pendingDayWriteCount()===0`)까지 확인.

**5. 실패 테스트의 notify/Supabase 호출 횟수를 말로만 보증** — 1차 재감사의 quota 테스트들이 "store/localStorage 불변"은 확인했지만 "notify 0회"·"Supabase 호출 0회"는 어써션 없이 주석으로만 주장했다. **수정**: `app-store.js`의 `subscribe`로 실패 구간 동안의 notify 호출 횟수를 직접 세고, `fakeSupabaseClient.js`의 `callCounts`를 합산한 `totalSupabaseCalls()`로 실패 전후 Supabase 총 호출 수가 그대로인지 두 quota 테스트(1차 FAIL 9번, 이번 persistent 테스트) 모두에 추가했다. 이 계측 과정에서 **테스트 격리 결함**도 하나 더 찾았다 — 바로 앞 테스트(비용 저장, 재감사 2번)가 클라우드 동기화 디바운스를 기다리지 않고 끝나서 그 지연된 동기화가 다음 테스트의 호출 수 계측에 섞여 들어와(`13 !== 12`) 실패했다 — 그 테스트 끝에 650ms 드레인 대기를 추가해 고쳤다(파렛트 테스트에도 같은 이유로 추가).

**6. `RevenuePage.jsx`/`domain/finance.js`를 "기존 대형 파일" 예외로 완료 처리함** — 1차 재감사 보고서가 두 파일을 손댔으면서도 "이미 200줄 넘던 파일이라 최소 패치만 했다"고 예외 처리했는데, 사용자가 이를 반려했다. **수정**: 실제로 쪼갰다 — `domain/finance.js`(647줄) → `financeCore.js`(178줄, 기본 계산+월 매출)/`financeReceivables.js`(73줄, 미수)/`financeOwnerDetail.js`(179줄, 오너 손익 상세)/`financeTaxInvoiceGroups.js`(175줄, 세금계산서 원천 그룹)/`financeTaxInvoiceEntries.js`(86줄, 세금계산서 레코드 조립) 5개 파일로, `finance.js` 자신은 그 5개를 재수출하는 13줄짜리 배럴만 남겼다(기존 `from './finance.js'`/`from '../lib/finance.js'` import 경로는 전부 그대로 동작). `components/RevenuePage.jsx`(352줄) → `components/revenue/`(`revenueFormat.js`/`RevenueNav.jsx`/`OwnerMonthlyCards.jsx`/`OwnerRevenueView.jsx`/`DriverRevenueView.jsx`) 5개 파일로, `RevenuePage.jsx`는 22줄짜리 오케스트레이션만 남았다. 새로 만든 10개 파일 전부(`revenue/*.jsx` 포함) `// @ts-check`를 붙이고 타입 주석을 채워 활성 게이트 0 errors를 유지했다(원래 `RevenuePage.jsx`는 `@ts-check`가 없었는데, 쪼갠 새 파일들은 전부 붙였다 — 프로덕션 부채가 오히려 더 줄었다, 아래 수치 참고). **검증**: `wc -l`로 10개 파일 전부 200줄 이하 확인, `npx tsc --noEmit` 0 errors, `npm run build` 성공, 기존 매출 화면 테스트(간접) 전부 통과.

**7. 실제 로그인 브라우저에서 입력→즉시 이탈→새로고침→재로그인 hydrate 미검증** — 1차 재감사까지는 전부 jsdom 자동화 테스트였다. **검증**: Browser pane으로 `npm run dev`를 띄우고, 사용자가 직접 로그인한 세션("테스트" 계정, 차주)을 넘겨받아 진행했다(비밀번호는 운영 정책상 내가 입력할 수 없어 사용자가 직접 로그인) —
  1. `2030-01-15`(빈 날) 운행 횟수에 `9` 입력 → **즉시(디바운스 600ms 전) "뒤로가기"** 클릭 → 캘린더로 정상 이동.
  2. 같은 날짜 재진입 → `9`가 그대로 보임(언마운트 flush가 실제 브라우저에서도 동작).
  3. **브라우저 전체 새로고침**(`window.location.reload()`, 즉 세션 복원 + hydrate 재실행) → `9`가 그대로 유지, "저장됨" 표시, 콘솔 에러 0건.
  4. `performance.getEntriesByType('resource')`로 실제 네트워크 호출을 확인 — `daily_logs`/`transport_details`/`fuel_records`/`maintenance_records`/`misc_expense_records`/`tax_invoices` 등에 대한 진짜 Supabase REST 호출(조회 + upsert)이 일어났다. jsdom 가짜 Supabase가 아니라 **실제 클라우드 왕복**으로 hydrate가 검증됐다.
  - **부수 발견(정직하게 기록)**: 정리 과정에서 값을 `0`으로 되돌리려 했더니, 로컬은 "빈 날"로 삭제되지만(`saveDayRecord`) 그 삭제가 클라우드로 전파되지 않아(`syncWorkData.js`가 로컬에 없는 날짜에 대해 삭제를 보내는 로직이 원래 없다) 다음 새로고침 때 서버의 예전 값(9)이 되살아나는 걸 발견했다. 이 라운드에서는 `9`를 완전히 지우는 대신 `휴무`로 표시해 임시로 정리해 뒀다. **이 gap을 "Step 6 범위 밖 알려진 한계"로 남긴 것 자체가 3차 재감사에서 반려됐다** — 실제로는 Step 6의 "빈 날 삭제" 완료 조건이 로컬에서만 끝나고 클라우드까지 안 갔던 미완성이었다. 아래 "Step 6 재감사 3차" 1번 항목에서 tombstone 메커니즘으로 실제 구현하고 이 값(`2030-01-15`)이 아니라 별도 실제 데이터(`2026-08-26`)로 실제 로그인 브라우저에서 삭제→새로고침→hydrate까지 재검증했다.

**최종 검증(재감사 2차 반영 후)**:
- `npm test` → **290/290 통과**(1차 재감사 282개 + driver-scope 1 + useExpenseForm stale-overwrite 1 + resolveFixedUnitPrice 4 + 통합 1 + persistent-quota 1 = +8, 산술상 282+8=290).
- `npx tsc --noEmit`(활성 게이트) → **0 errors**.
- `npm run typecheck:strict-inventory` — 전체 1295 / **프로덕션 991**(1차 재감사 1023에서 -32, `revenue/*` 신규 파일에 `@ts-check`를 붙이면서 그만큼 부채가 줄었다) / 테스트·지원 304.
- `npm run build` → 성공. `npm run lint` → 기존 경고 4개만, 신규 0개.
- `git diff --check`(react-app, ubiquitous-parakeet) → 실제 오류 없음, LF/CRLF만.
- `wc -l`로 이번 라운드 신규·수정 프로덕션 파일 전부 재확인 — 200줄 초과 0건(`App.jsx` 정확히 200줄 포함).
- `npm test` 실행 로그에서 "클라우드 동기화 실패" 문자열 **0건**(재감사 2차 착수 시점엔 테스트 4번/6번에서 매번 발생하던 것 — 재감사 5번 항목의 fake Supabase `clients.insert`/`vehicles.insert` 기본 핸들러 추가로 해소).
- 실제 로그인 브라우저 검증 완료(위 7번).

## Step 6 재감사 3차 — FAIL, 6건 지적 → 전부 수정 (사용자 지시)

2차 재감사(7건 수정) 보고 후 사용자가 다시 검토해 **6건**을 지적하며 Step 6을 `[~]`로 되돌렸다 — "구조는 있는데 클라우드까지 안 끝났다", "durable 큐가 진짜 durable이 아니다", "달력·매출 단가가 여전히 다른 소스", "수정한 프로덕션 JS 전부가 활성 typecheck 대상이어야 한다", "비용 quota 실패도 테스트해라", "문서를 현행화해라" 여섯 갈래였다. 전부 수정하고 각 항목을 revert-and-confirm-fail로 검출력까지 확인했다.

**1. 빈 날 삭제가 클라우드까지 전파되지 않음(2차 재감사 7번이 "범위 밖 알려진 한계"로 남겼던 항목 — 실제로는 완료 조건 미달성이었다)** — `syncWorkData.js`의 upsert 루프가 로컬 workData에 **있는** 날짜만 순회해서, 로컬에서 지운 날짜의 `daily_logs`/`transport_details`가 서버에 그대로 남아 다음 hydrate 때 되살아났다. **수정**: 신규 도메인 `domain/workDataTombstones.js`(순수 add/remove 함수) + 신규 persist 도메인 `workDataDeletedDates`(9개 기존 키는 그대로 두고 10번째로 추가, `store/persist.js`/`store/app-store.js`/`store/owner-state.js`) + `lib/workData.js`의 `saveWorkDataWithTombstoneCheck`(날짜가 실제로 지워질 때만 workData 커밋과 **같은 commitBatch 호출**에 tombstone 기록을 실어 하나의 원자적 로컬 트랜잭션으로 묶는다, 반대로 삭제 대기 중이던 날짜에 재입력이 들어오면 tombstone을 즉시 지운다) — `useDayDraft.js`/`pendingWorkDataWrites.js` 둘 다 이 함수로 교체했다. 신규 `lib/syncDeletedWorkDates.js`가 `syncQueue.js`의 `syncAll`에서 `syncWorkData` 다음 단계로 실제 원격 삭제(`transport_details` 먼저, `daily_logs` 나중, 순서 고정)를 수행하고, 모든 원격 `await` 직후 `assertSessionStillCurrent`로 세션 세대를 재검증하며, 원격 성공이 확인된 날짜의 tombstone만 지운다(실패하면 `syncAll` 전체가 실패해 `clearDirty`가 안 불려 dirty가 남는다 → 다음 hydrate가 dirty domain을 서버 값으로 덮지 않는 기존 규칙이 그대로 보호막이 된다). `lib/hydrateMerge.js`의 `mergeWorkDataFromRows`에 `deletedDateKeys` 인자를 추가해, 아직 서버에 못 알린 tombstone 날짜는 서버 rows에 남아 있어도(그리고 `profiles.settings.practiceSnapshot` 백업에 남아 있어도) 병합 결과에서 명시적으로 지운다(dirty-domain 규칙과는 별개의 두 번째 방어선). **테스트**: `hydrateMerge.test.js`(tombstone 필터 3건), `syncDeletedWorkDates.test.js`(신규, 7건 — 성공/삭제할 행 없음/tombstone 없음/조회 실패/**transport_details 삭제 실패**/**daily_logs 삭제 실패**/**여러 날짜 처리 도중 세션 전환**), `lib/workData.test.js`(신규, 5건 — 원자적 tombstone 기록/재입력 시 해제/평범한 편집은 무영향/원자성(quota 실패 시 tombstone도 안 씀)/기존 `saveWorkData` 회귀 방지). **되돌려서 확인**: tombstone 필터를 빼면 hydrateMerge 테스트 2건 실패, session-epoch 재검증을 빼면 세션 전환 테스트 실패, transport_details/daily_logs 삭제 순서를 뒤집으면 관련 테스트 2건 실패 — 전부 확인 후 복원. **실제 로그인 브라우저 검증**(사용자 "테스트" 계정, 실제 Supabase): 2026-08-26(운행 3회로 실제로 기록돼 있던 날) 운행 횟수를 0으로 비워 저장 → `performance.getEntriesByType('resource')`로 실제 `daily_logs?select=id&...work_date=eq.2026-08-26` 조회, `transport_details?daily_log_id=in.(...)` 삭제, `daily_logs?id=in.(...)` 삭제 요청이 실제로 나간 것을 확인 → `reactPracticeWorkDataDeletedDates:<uid>` localStorage 키가 `{}`(성공적으로 비워짐)로 확인 → 페이지 전체 새로고침(재로그인 상태의 hydrate 재실행, `daily_logs?select=*&vehicle_id=...` 새 조회 확인) → 달력에 8월 26일이 여전히 빈 날로 남아 있고 월 합계도 0회로 갱신됨을 확인(되살아나지 않음).

**2. `lib/pendingWorkDataWrites.js`가 모듈 메모리 `Map` 하나만으로 "영구 큐"라고 주장함** — 전체 새로고침이나 탭 종료 한 번이면 큐가 그냥 사라졌다. **수정**: durable 저장소를 `localStorage`(`reactPracticeDurablePendingWrites:<ownerKey>`, 9+1개 persist 도메인과 별개의 전용 키 — `lib/dirtyJournal.js`와 같은 자리)로 바꿨다. React 콜백(`onSettled`)은 직렬화할 수 없어서 durable 저장소엔 절대 안 넣고 메모리 전용 `Map`에 따로 둔다(새로고침하면 그 콜백을 등록했던 컴포넌트와 함께 자연스럽게 사라진다). `getPendingDayWrite(ownerKey, dateKey)`를 새로 추가해 `useDayDraft.js`가 draft 초기화 시 store 값 위에 이 pending patch를 얕게 덮어씌우게 했다(재진입 시 overlay) — 같은 날짜에서 먼저 실패한 편집과 재진입 후 편집한 다른 필드가 둘 다 얕은 필드 병합만으로 자연스럽게 보존된다(별도 리비전 번호 불필요 — patchDraft 자체가 이미 얕은 병합이라 초기화 시점의 overlay 병합과 완전히 같은 규칙이다). `durable` 기록 자체가 실패하면(용량이 완전히 바닥난 경우) 신규 `lib/durableWriteGuard.js`가 전역 플래그를 세워 `beforeunload`(탭 닫기/새로고침) 네이티브 확인창을 띄우고, `DayLogPage.jsx`의 "뒤로가기"(react-router가 데이터 라우터가 아니라 `useBlocker`를 못 써서 직접 확인)도 `confirmLeaveIfUnsafe()`로 막는다 — 이번 세션 동안은 메모리 fallback으로 재시도는 계속 가능하다. `app/pendingWriteRetryListeners.js`는 이제 붙는 즉시(온라인 이벤트나 5초 타이머를 기다리지 않고) 한 번 재시도해 하드 새로고침 직후에도 durable 저장소에서 그대로 복구된다. 소스에 실제 NUL 바이트를 박아 넣는 실수를 편집 중 한 번 저질렀는데(owner/date 키 결합에 구분자로 쓰려다가), 커밋 전 자체 교차검증에서 발견해 `String.fromCharCode(0)`으로 바꾸고 저장소 전체(`.js`/`.jsx`)를 Node 버퍼 스캔으로 재확인했다(재발 없음). **테스트**: `pendingWorkDataWrites.test.js`(신규, 6건 — durable 즉시 반영/**"모듈 재시작 후" 복구**(registerPendingDayWrite를 거치지 않고 localStorage에 직접 넣은 값도 그대로 읽고 재시도)/**owner 전환**(서로 다른 owner의 큐가 안 섞임)/재시도 실패 시 잔류/onSettled는 durable에 직렬화 안 됨/durable 기록 자체 실패 시 fallback+가드), `pendingWriteRetryListeners.test.js`(신규, 4건 — 즉시 재시도/**listener cleanup**(online+beforeunload+타이머 전부 해제)/beforeunload 위임/온라인 이벤트 조건부 재시도), `App.test.js`에 **재진입 시 overlay + 필드 보존** 통합 테스트 추가(quota 실패로 fixedCount=5가 durable 큐에 남은 채 재진입 → 입력에 5가 그대로 보이는지 확인 → palletCount=3을 편집해 성공 커밋 → 최종 store에 fixedCount=5와 palletCount=3이 **둘 다** 반영되는지 확인). **되돌려서 확인**: durable을 예전 메모리 Map 버전으로 되돌리면 durable 관련 3건 실패, `useDayDraft.js`의 overlay를 빼면 재진입 통합 테스트 실패 — 전부 확인 후 복원.

**(4차 정정)** 위 구현은 `retryPendingDayWrites`가 durable과 fallback을 각각 별도 배열에 넣고 둘 다 순회했는데, 같은 owner/date가 "오래된 durable 항목"과 "그 뒤 durable 기록이 실패해 fallback으로 떨어진 더 최신 항목" 두 개로 동시에 큐에 남아 있으면 오래된 항목을 먼저 커밋해 성공시키고 그 `clearPendingDayWrite`가 아직 시도도 안 한 최신 fallback까지 지워 최신 편집이 사라지는 결함이 있었다. `durableWriteGuard.js`도 전역 boolean 하나라 owner A의 fallback이 남아 있어도 owner B의 durable 저장이 성공하면 전체가 healthy로 잘못 돌아갔다. 아래 "Step 6 재감사 4차" 1·2번에서 고쳤다.

**3. 달력 "1회 단가" 편집이 연결된 거래처가 있어도 fallback `settings.unitPrice`만 몰래 고침(읽기는 2차에서 통일했지만 쓰기는 안 건드렸다)** — `CalendarPage.jsx`의 `saveUnitPrice`가 항상 `savePracticeSettings`만 불러서, 고정노선 연결 거래처가 있는 상태에서 달력 단가를 고쳐도 그 거래처의 `fixedUnitPrice`는 그대로였다(다음 렌더에 `resolveFixedUnitPrice`가 다시 거래처 값을 우선해서 방금 입력한 값이 화면에서 사라지는 것처럼 보인다). **수정**: `domain/clients.js`에 타겟 패치 함수 `updateClientFixedUnitPrice(clients, clientId, nextPrice)`를 추가(`updateClientTaxInfo`와 같은 패턴 — `upsertClient`는 이 필드를 아예 안 건드려서 못 쓴다)하고, `CalendarPage.jsx`가 연결된 거래처가 있으면 `saveClients(ownerKey, updateClientFixedUnitPrice(...))`로, 없으면 기존대로 `savePracticeSettings`로 분기하게 했다. `CalendarPage.jsx`는 이제 `loadClients` 직접 호출 대신 `store/ownerDataHooks.js`의 신규 `useOwnerClients`로 clients를 store 구독한다(재감사 지시 그대로). `CalendarMonthSummary.jsx`에 연결 거래처 이름을 보여주는 안내 문구를 추가했다. **테스트**: `components/calendar/CalendarPage.test.js`(신규) — 연결 거래처가 있는 상태에서 단가 입력을 편집 → **Store의 거래처 `fixedUnitPrice`가 바뀌고 `settings.unitPrice`는 그대로**(fallback을 몰래 안 건드림) → **localStorage에도 반영** → **같은 화면의 달력 합계(기본 운송료/합계 카드)가 새 단가로 재계산** → `getMonthlyFareRevenue`(매출 화면이 쓰는 것과 같은 함수)도 같은 store 데이터에서 새 단가를 반영하는지까지 확인. **되돌려서 확인**: `saveUnitPrice`를 예전(항상 `settings.unitPrice`만 고침)으로 되돌리니 "Store의 거래처 fixedUnitPrice가 15000으로 바뀌어야 한다" 단계에서 `10000 !== 15000`으로 실패, 복원 후 통과.

**4. 수정·신규 프로덕션 JS 중 활성 typecheck 대상이 아닌 파일이 남아 있었음** — `financeCore.js`/`financeOwnerDetail.js`/`financeReceivables.js`/`financeTaxInvoiceGroups.js`/`financeTaxInvoiceEntries.js`는 2차 재감사에서 `@ts-check`를 붙였다고 기록했지만(위 2차 6번), 이번 재검토에서 `domain/clients.js`/`domain/day-record.js`/`domain/call-details.js`/`domain/expenses.js`/`lib/ownerFinance.js`는 여전히 대상 밖이었다. **수정**: 다섯 파일 전부에 `@ts-check`를 붙였다 — 그대로 붙이면 200줄을 넘겨서(`clients.js` 273줄, `day-record.js` 239줄 등) 순수 타입 선언만 담는 신규 sibling 파일로 뺐다(`clientTypes.js`/`dayRecordTypes.js`/`expenseTypes.js`/`financeTypes.js`, `callDetail.js`와 같은 관례 — `export {}`뿐인 타입 전용 모듈). `clients.js`는 결제 주기 계산까지 `clientPaymentTerms.js`로 추가로 뺐다. 이 과정에서 **직접 찾은 새 결함**: `domain/finance.js`(5개 조각을 재수출하는 배럴)와 `lib/workData.js`(day-record/call-details/payments를 재수출하는 배럴)에 `export * from`을 그대로 두면, 5개 조각이 각자 `financeTypes.js`/`callDetail.js`의 같은 타입을 alias해서 온 것까지 와일드카드가 주워 담아 "같은 이름이 두 모듈에서 나온다"(TS2308)는 에러가 난다(`checkJs:true`로 실측). 두 배럴 다 `finance.js`에는 `@ts-check`가 아예 없어서(신규는 아니지만 이번 라운드에서 처음 diff에 들어온 파일이라 대상이었다) 이 결함이 숨어 있었다 — 함수 이름만 나열하는 명시적 재수출로 바꿔 해소하고 `finance.js`에도 `@ts-check`를 붙였다. **검증**: `npx tsc --noEmit`(활성 게이트) → **0 errors**, 이번 라운드에서 수정/신규 프로덕션 파일 전부 `wc -l`로 200줄 이하 재확인, `grep`으로 `any`/`unknown`/`@ts-ignore`/`@ts-expect-error`/`object` 중간단언/`Function` 타입 0건 재확인. `npm run typecheck:strict-inventory` — 전체 1162 / **프로덕션 754**(2차 종료 시점 991에서 -237, 이번에 새로 typed된 파일들의 부채가 그만큼 줄었다) / 테스트·지원 408.

**(4차 정정)** "활성 typecheck 대상이 아닌 파일이 남아 있었음"이라는 이 항목 제목 자체가 이번 라운드에도 그대로 반복됐다 — 같은 diff(`useDayDraft.js`/`pendingWorkDataWrites.js`/`syncQueue.js`가 부르는) 안에 있던 `hydrate.js`/`hydrateMerge.js`/`store/app-store.js`/`store/commitHelpers.js`/`store/owner-state.js`/`store/persist.js` 6개가 여전히 `@ts-check` 대상 밖이었고, `day-record.js`의 `getFixedRouteCounts`는 `unknown` 매개변수를 그대로 쓰고 있었다(위 "0 errors"/"any/unknown 0건" 검증이 애초에 이 6개 파일을 안 보고 있어서 안 걸렸다). 아래 "Step 6 재감사 4차" 4번에서 6개 파일 전부에 `@ts-check`를 붙이고 `unknown`을 없앴다.

**5. 비용(정비/주유/기타) quota 실패 테스트가 없음** — `useExpenseForm.js`의 `save()`/`remove()`는 이미 try/catch로 quota 실패를 방어하게 짜여 있었지만(2차 재감사 2번 수정 당시 부수적으로 갖춰짐), 그걸 실제 `Storage.prototype.setItem` 실패 주입으로 확인하는 테스트가 한 번도 없었다. **수정**: 새 코드는 없다(기존 방어 로직이 이미 계약을 지키고 있었음을 확인). **테스트**: `App.test.js`에 2건 추가 — "비용 저장 quota 초과"(store/localStorage 불변, notify 0회, Supabase 호출 0회, 실패 토스트, 모달이 안 닫혀 draft 유지) / "비용 삭제 quota 초과"(store/localStorage 불변, notify 0회, Supabase 호출 0회, 실패 토스트, 기존 행 유지). **되돌려서 확인**: `useExpenseForm.js`의 `save()`/`remove()`에서 try/catch를 제거하니 두 테스트 모두 실패(미처리 예외로 렌더가 깨지거나 어써션이 어긋남), 복원 후 통과.

**6. 문서 오류 — 신규 finance 파일 전부 `@ts-check`라는 기록이 이번 재검토 시점엔 부정확했고, 빈 날 클라우드 삭제를 "범위 밖 알려진 한계"로 남겨 뒀고, 낡은 "5-1. 현재 결론"이 `WorkLogPage.jsx`/`InlineExpandHost`가 살아 있고 다음이 Step 6이라고 기록하고 있었음** — 이번 3차 라운드에서 항목 4로 finance 파일들의 `@ts-check`가 실제로 맞아졌으므로 그 기록은 지금은 정확하다(위 4번 참고). 항목 1(클라우드 삭제)을 실제로 구현했으므로 2차 재감사 7번의 "Step 6 범위 밖" 문구를 위에서 수정했다(더 이상 알려진 한계가 아니라 구현 완료 항목). "5-1. 현재 결론" 절은 Step 6이 실제로 끝난 지금 시점 기준으로 다시 썼다(아래 참고).

**typecheck:strict-inventory 최종(3차 6건 전부 반영 후)**: 전체 **1162** / 프로덕션 **754**(2차 991에서 -237) / 테스트·지원 **408**.

**`npm test` 최종(3차 6건 반영 후)**: **320/320 통과**(2차 290개 + `hydrateMerge.test.js` tombstone 3 + `syncDeletedWorkDates.test.js` 7 + `lib/workData.test.js` 5 + `pendingWorkDataWrites.test.js` 6 + `pendingWriteRetryListeners.test.js` 4 + `App.test.js` 신규 4(재진입 overlay 1 + 비용 quota 2 + 앞서 계산에 포함된 항목 조정) + `CalendarPage.test.js` 1 = 320). 항목 1(순서/session-epoch)·2(durable/overlay)·3(fixedUnitPrice 쓰기)·5(비용 quota)는 각각 되돌려서 실패를 직접 확인했다(각 항목 본문 참고).

**최종 검증(3차 반영 후)**:
- `npx tsc --noEmit`(활성 게이트) → **0 errors**.
- `npm run build` → 성공. `npm run lint` → 기존 경고 4개만, 신규 0개.
- `git diff --check`(react-app, ubiquitous-parakeet) → 실제 오류 없음, LF/CRLF만.
- `wc -l`로 이번 라운드 신규·수정 프로덕션 파일 전부 재확인 — 200줄 초과 0건(`DayLogPage.jsx` 정확히 200줄 포함).
- 소스 전체(`.js`/`.jsx`) NUL 바이트 0건(Node 버퍼 스캔으로 재확인 — 위 2번 항목의 실수 재발 없음 확인).
- **실제 로그인 브라우저에서 빈 날 삭제 → 새로고침(재로그인 상태 hydrate) → 빈 날 유지까지 확인**(위 1번 항목 참고) — Step 6을 `[x]`로 복원하는 근거가 되는 마지막 조건.

## Step 6 재감사 4차 — FAIL, 5건 지적 → 전부 수정 (사용자 지시)

3차 재감사(6건 수정, `[x]`로 복원) 보고 후 사용자가 다시 검토해 **5건**을 지적하며 Step 6을 다시 `[~]`로 되돌렸다 — "durable 큐가 같은 owner/date를 중복 처리해 최신 편집을 잃는다", "가드가 여전히 전역 boolean 하나다", "화면 이동 방어가 DayLogPage 하나뿐이다", "활성 typecheck 전수가 또 안 끝났다", "문서가 그 상태를 그대로 완료로 적었다" 다섯 갈래였다. 전부 수정하고 각 항목을 revert-and-confirm-fail로 검출력까지 확인했다.

**1. `pendingWorkDataWrites`의 동일 owner/date 중복 처리로 최신 편집이 유실됨** — `retryPendingDayWrites`가 durable 저장소의 항목과 메모리 fallback 항목을 각각 별도 배열에 넣고 순서대로 전부 순회했다. 같은 owner/date가 "오래된 durable 항목(A, 이미 성공적으로 durable에 등록됨)"과 "그 뒤 같은 날짜를 다시 편집했는데 이번엔 durable 기록 자체가 실패해 fallback에만 남은 최신 항목(B)" 두 개로 동시에 큐에 남아 있으면(`registerPendingDayWrite`의 성공 분기는 durable을 새 값으로 덮어쓰지만, 실패 분기는 durable을 전혀 안 건드리고 fallback에만 추가한다 — 그래서 이 상태가 실제로 만들어진다), A를 먼저 커밋해 성공시키고 그 `clearPendingDayWrite(ownerKey, dateKey)`가 "이 키는 끝났다"며 fallback의 B까지 지워 버려 아직 시도조차 안 한 최신 편집(B)이 통째로 사라졌다. **재현**: A(fixedCount:1)를 durable에, B(fixedCount:2, palletCount:9)를 fallback에 동시에 남긴 뒤 재시도하면, 고친 코드는 최신값(B)만 정확히 한 번 시도해야 하는데 예전 코드는 A를 먼저 커밋(count 1로 잘못 확정)하고 B를 지워, 재시도 뒤 `getPendingDayWrite`가 `undefined`(사라짐)를 돌려줬다. **수정**: `retryPendingDayWrites`가 이제 `Map<ownerKey+dateKey, patch>`로 durable을 먼저 채우고 fallback으로 그 위를 덮어쓴다(최신 fallback이 항상 이긴다) — 키마다 "실제로 시도할 값" 하나만 남기고 그 effective patch만 정확히 한 번 시도한다. 성공하면 `clearPendingDayWrite`로 durable/fallback 양쪽에서 지우고, 실패하면 두 저장소 어느 쪽도 건드리지 않아 다음 재시도가 같은(최신) 값으로 다시 시도한다. **테스트**: `pendingWorkDataWrites.test.js`에 2건 추가 — "오래된 durable(A) 성공 후 최신 fallback(B) 실패 시 B가 사라지지 않는다"(같은 owner/date의 workData 커밋이 정확히 1회만 일어나는지, 최종 store가 A가 아니라 B(fixedCount:2, palletCount:9)인지, 큐가 완전히 비는지까지 확인) / "durable(A)+fallback(B) 상태에서 유일한 커밋 시도가 실패하면 B가 큐에 그대로 남는다". **되돌려서 확인**: `retryPendingDayWrites`를 예전(durable/fallback 각각 별도 배열) 버전으로 되돌리니 "B가 사라지지 않는다" 테스트가 실제로 실패(B가 사라짐), 복원 후 통과.

**(5차 정정)** 위 수정은 "성공한 effective patch만 큐에서 지운다"는 것만 확인했지, **그 지우는 동작(`clearPendingDayWrite`) 자체가 부분적으로 실패할 수 있다는 경우는 놓쳤다** — durable journal에서 항목을 지우는 쓰기가 실패하면(예: A 삭제 쓰기만 quota 초과) 그때도 `clearPendingDayWrite(ownerKey, dateKey)`는 fallback과 callback을 무조건 지웠다. 그러면 이미 store 커밋까지 성공한 최신 patch(B)가 fallback에서마저 사라져, 다음 재시도가 durable에 남은 stale A를 pending으로 오인해 방금 반영된 B를 A로 덮어써 버리는 **실제 데이터 유실**이 있었다(5차에서 실측·수정, 아래 "Step 6 재감사 5차" 1번 참고). `pendingDayWriteCount()`도 이 라운드에서는 `durable 항목 수 + fallback.size`를 단순 합산해, 같은 owner/date가 양쪽에 걸쳐 있을 때 실제보다 하나 더 많이 셌다(5차에서 공유 helper로 통일, 아래 2번 참고).

**2. `durableWriteGuard.js`가 전역 boolean 하나로 관리돼 owner 간 상태가 섞임** — `markDurableWriteBroken()`/`markDurableWriteHealthy()`를 마지막으로 부른 쪽이 전체 상태를 결정했다. owner A의 fallback이 아직 남아 있는 동안 owner B의 durable 저장이 (그 뒤에) 성공하면 B가 부른 `markDurableWriteHealthy()`가 A의 위험을 지워 버려, A의 편집이 여전히 안전하지 않은데도 `beforeunload` 경고가 꺼졌다. **수정**: `durableWriteGuard.js`가 이제 자체 상태를 전혀 안 갖는다 — `pendingWorkDataWrites.js`가 소유한 `fallback`(durable 기록에 실패해 메모리에만 남은 패치들) 자체가 "지금 안전하지 않다"는 사실의 유일한 근거이므로, 신규 `hasUnsafePendingWrites()`(`fallback.size > 0`)를 매번 직접 물어본다. `registerPendingDayWrite`/`clearPendingDayWrite`는 더 이상 `markDurableWriteBroken`/`Healthy`를 부르지 않는다(부를 필요가 없어졌다 — `durableWriteGuard.js`→`pendingWorkDataWrites.js` 단방향 의존으로 정리, 순환 참조 없음). **테스트**: `pendingWorkDataWrites.test.js`에 2건 추가 — "owner A의 fallback이 남아 있으면 owner B의 durable 저장이 성공해도 broken은 true다" / "한 항목 성공 처리 후에도 다른 fallback이 남으면 beforeunload 경고가 유지된다"(`guardBeforeUnload`를 실제 이벤트 모양으로 직접 호출해 확인). **되돌려서 확인**: `durableWriteGuard.js`를 예전 전역 boolean 버전으로 되돌리고 `pendingWorkDataWrites.js`에 `markDurableWriteBroken`/`Healthy` 호출을 임시로 복원하니, 두 신규 테스트(그리고 3차의 기존 "durable 기록 자체가 실패하면..." 테스트까지)가 실패, 복원 후 통과.

**3. 화면 이동 방어가 DayLogPage 헤더 하나뿐이었음** — `confirmLeaveIfUnsafe()`가 `DayLogPage.jsx`의 "뒤로가기"에만 걸려 있어서, 하단탭(BottomNav)·사이드메뉴(SideMenu)·마이페이지 로그아웃처럼 DayLogPage를 거치지 않는 실제 전역 이동 경로는 durable 기록이 깨진 상태에서도 확인 없이 그냥 진행됐다. **수정**: `AppShell.jsx`가 `useNavigate()`의 원본을 `rawNavigate`로 받고, 이 파일 안의 모든 호출부(BottomNav/SideMenu/알림 패널/각 페이지의 `onBack`, 총 11곳)가 실제로 쓰는 지역 변수 `navigate`를 `confirmLeaveIfUnsafe()`로 감싼 래퍼로 바꿨다 — 호출부를 하나씩 고칠 필요 없이 이 한 곳만 고치면 전부 같은 가드를 받는다(react-router의 `(to, options)`/`(delta: number)` 두 오버로드는 `to`가 number인지로 직접 분기해 any/unknown 없이 그대로 좁혔다). `MainPageRoute.jsx`의 달력→일지 진입(`onSelectDay`)에도 별도로 가드를 추가했다(그 경로는 `closeWorkLog`가 아니라서 DayLogPage의 기존 가드를 안 탄다 — 반대로 `closeWorkLog` 자체는 이미 `DayLogPage.jsx`가 감싸서 부르므로 여기서 또 감싸면 confirm이 두 번 뜬다, 그래서 `onSelectDay`만 추가했다). `App.jsx`의 로그아웃(`handleLogout`)도 DayLogPage를 안 거치는 전역 이동이라 같은 가드를 추가했다. **브라우저 물리 뒤로가기(popstate)는 취소할 수 없다**(표준 `popstate` 이벤트는 `cancelable`이 아니어서 `preventDefault`가 동작하지 않는다 — `<BrowserRouter>` 자체의 한계) — 이 경로는 "이동을 막는" 계약이 아니라 "이동해도 fallback이 안전하게 남고, 새로고침/탭 종료 전에는 반드시 `beforeunload`로 경고된다"는 계약으로 명시하고 그렇게 테스트했다(fallback은 컴포넌트 생애주기와 무관한 모듈 전역 상태라 라우팅과 무관하게 그대로 남는다). **테스트**: `App.test.js`에 3건 추가 — "durable 기록이 깨진 상태에서 BottomNav 탭 전환은 확인 없이 진행되지 않는다"(`window.confirm`을 `false`로 스텁, 이동이 실제로 안 일어나는지 확인) / "confirm에서 '그래도 이동'을 선택하면 BottomNav 전환이 실제로 진행된다"(`true`로 스텁, 이동 후에도 fallback이 안 사라지는지까지 확인) / "브라우저 back(popstate)은 막을 수 없지만, 그 이후에도 fallback은 안전하게 남고 beforeunload는 계속 경고한다"(실제 `popstate` 디스패치 후 진짜 `beforeunload` 이벤트로 `defaultPrevented`를 확인). **되돌려서 확인**: `AppShell.jsx`의 `navigate` 래퍼에서 가드를 빼니 BottomNav 관련 2건이 실제로 실패(confirm 없이 즉시 이동), 복원 후 통과.

**4. 활성 typecheck 전수 적용이 또 불완전했음** — 3차가 손댄 같은 diff 안의 `hydrate.js`/`hydrateMerge.js`/`store/app-store.js`/`store/commitHelpers.js`/`store/owner-state.js`/`store/persist.js` 6개 파일이 여전히 `@ts-check` 대상 밖이었고, `domain/day-record.js`의 `getFixedRouteCounts`는 `{ fixedRouteCounts?: unknown }` 매개변수를 그대로 쓰고 있었다. **수정**: 6개 파일 전부에 `@ts-check`를 붙였다. `hydrateMerge.js`는 그대로 붙이면 200줄을 넘겨서(216줄) 타입 선언만 `hydrateMergeTypes.js`(신규)로 뺐다(같은 관례). `app-store.js`의 `applyDomainToState`는 동적 키(9개 슬라이스 중 하나)로 state를 쓰는 자리라 TS가 "합집합 읽기/교집합 쓰기" 제약으로 어떤 구체 타입을 넣어도 못 좁혀서(실측), `state` 자신을 `Record<PersistDomain, Record<string, DomainValue>>`로 단언했다(9개 슬라이스가 실제로 전부 그 모양이므로 any/unknown이 아닌 정확한 타입이다) — `hydrate.js`의 dirtyDomains 동적 키 반영도 같은 이유로 같은 패턴을 썼다. `day-record.js`의 `getFixedRouteCounts`는 이 함수를 실제로 부르는 두 자리(자기 자신의 `DayRecordLike`, `applyFixedRouteRun`이 만드는 `{ fixedRouteCounts }` 리터럴)가 전부 이미 `Record<string, number>|undefined`로 정확히 타입돼 있어서 `unknown`으로 받을 이유가 없었다 — 그 정확한 타입으로 바꿨다(런타임 `typeof`/`Array.isArray` 방어는 hydrate로 들어온 형태가 어긋난 데이터에 대한 방어라 그대로 남겼다). `store/owner-state.js`의 `toArray`/`toObject`/`normalizeFor`도 처음엔 `unknown`으로 받았다가(자체 교차검증 중 발견 — 이 항목 자체가 금지하는 패턴을 내가 새로 만들 뻔했다), 실제로 부르는 자리가 이미 `DomainValue`로 타입돼 있음을 확인하고 `unknown`을 없앴다. **검증**: `npx tsc --noEmit`(활성 게이트) → **0 errors**, `grep`으로 이번 라운드에서 수정/신규 프로덕션 파일 71개 전체에서 `any`/`unknown`/`@ts-ignore`/`@ts-expect-error`/`object` 중간단언/`Function` 타입 0건 재확인(처음 붙였던 `owner-state.js`의 `unknown` 3건은 이 재확인 과정에서 직접 찾아 없앴다). `npm run typecheck:strict-inventory` — 전체 1076 / **프로덕션 666**(3차 종료 시점 754에서 -88) / 테스트·지원 410.

**5. 문서가 미완성 상태를 완료로 기록함** — 3차 절의 "활성 typecheck 전수"·"any/unknown 0건" 주장이 위 4번 결함을 반영하지 못한 채 그대로 남아 있었고, "5-1. 현재 결론"이 Step 6을 "완료로 확정됐다"고 적어 뒀다. **수정**: 3차 절의 해당 두 항목(2번 durable 큐, 4번 typecheck) 바로 아래에 "(4차 정정)" 문단을 추가해 실제로 무엇이 빠졌었는지와 이 4차 절 어디서 고쳤는지를 명시했다(기존 문단은 지우지 않고 그대로 남겨 실제 진행 기록을 보존했다). "5-1. 현재 결론"의 마지막 문단을 다시 써서 Step 6이 3차까지 거쳤지만 두 가지가 실제로는 미완성이었고 지금 4차가 진행 중이라는 사실을 정확히 반영했다(제목도 "Step 6 재감사 4차 진행 중 기준"으로 바꿨다). "0-1. 현재 상태" 절(Step 4 완료 시점의 과거 스냅샷)은 그 자체를 다시 쓰지 않되, "최신 상태는 5-1절을 보라"는 안내를 제목에 추가했다 — 이 문서 전체가 각 라운드의 실제 판단 과정을 그대로 남기는 append-only 기록이라, 과거 스냅샷 자체를 지우기보다 "지금은 아니다"를 명시하는 쪽을 택했다.

**(5차 정정)** 이 4차 절 자체("전부 수정" 5건, 아래 "최종 검증" 포함)가 다시 성급했다 — 위 1번(clearPendingDayWrite 부분 실패 시 데이터 유실)과 2번 항목이 실측한 pending count 오차는 4차 시점에는 발견되지 못한 채 "완료"로 보고됐고, `npm test` 출력에 React `act(...)` 경고가 남아 있는 채로도 "327/327 통과"만 근거로 검증이 끝났다고 적었다. 5차에서 이 세 가지를 실측·수정하고 각각 revert-and-confirm-fail로 검출력까지 확인한 뒤에만 아래 "Step 6 재감사 5차" 절에 최종 판정을 다시 적었다.

**typecheck:strict-inventory 최종(4차 5건 전부 반영 후)**: 전체 **1076** / 프로덕션 **666**(3차 754에서 -88) / 테스트·지원 **410**.

**`npm test` 최종(4차 5건 반영 후)**: **327/327 통과**(3차 320개 + `pendingWorkDataWrites.test.js` 신규 4 + `App.test.js` 신규 3 = 327). 항목 1(중복 처리)·2(guard 상태 섞임)·3(BottomNav 가드)는 각각 되돌려서 실패를 직접 확인했다(각 항목 본문 참고).

**최종 검증(4차 반영 후)**:
- `npx tsc --noEmit`(활성 게이트) → **0 errors**.
- `npm run build` → 성공. `npm run lint` → 기존 경고 4개만(라인 번호만 이동), 신규 0개.
- `git diff --check`(react-app, ubiquitous-parakeet) → 실제 오류 없음, LF/CRLF만.
- 이번 라운드에서 신규·수정한 프로덕션 파일 71개 전부 `wc -l`로 200줄 이하 재확인 — 초과 0건.
- 소스 전체(`.js`/`.jsx`) NUL 바이트 0건(Node 버퍼 스캔으로 재확인).
- 실제 클라우드 삭제 흐름(빈 날 삭제→새로고침→hydrate, 3차에서 실제 로그인 브라우저로 검증 완료)은 이번 4차에서 손대지 않았다 — `syncDeletedWorkDates.js`/`domain/workDataTombstones.js`/`saveWorkDataWithTombstoneCheck` 어느 것도 이번 diff에 없다(재확인).

## Step 6 재감사 5차 — FAIL, 3건 지적(문서 정정 포함 5건) → 전부 수정 (사용자 지시)

4차 재감사(5건 수정, `[x]`로 복원) 보고 후 사용자가 다시 검토해 **3건**을 지적하며(+문서 정정 2건) Step 6을 다시 `[~]`로 되돌렸다 — "durable cleanup 쓰기 자체가 실패하면 방금 성공한 최신 patch가 유실되는 P0 데이터 유실이 있다", "pendingDayWriteCount()가 논리 키 기준이 아니라 durable/fallback을 단순 합산한다", "npm test 출력에 React act(...) 경고가 남는다" 세 갈래였다. 전부 수정하고 각 항목을 revert-and-confirm-fail로 검출력까지 확인했다.

**1. `clearPendingDayWrite`가 durable 삭제 쓰기 실패를 무시하고 fallback/callback을 무조건 지워 최신 patch가 유실됨(P0)** — 예전 `clearPendingDayWrite(ownerKey, dateKey)`는 "이 owner/date는 이제 끝났다"는 뜻으로 fallback과 `settledCallbacks`를 무조건 지웠는데, 그 직전 durable journal에서 항목을 지우는 쓰기 자체가 (quota 등으로) 실패할 수 있다는 경우를 안 봤다. **재현**: durable에 stale A, fallback에 최신 B가 있는 상태에서 B의 workData 커밋은 성공하고 durable에서 A를 지우는 쓰기만 실패하면, 예전 코드는 그래도 fallback의 B와 콜백을 지워 버렸다 — 그러면 durable엔 여전히 stale A만 남고, 다음 조회/재시도가 이미 store에 반영된 B 대신 A를 pending으로 오인해 B를 A로 덮어써 버린다(실측 확인, 진짜 데이터 유실). `useDayDraft.js`의 "직접 커밋 성공" 경로(디바운스가 끝나 곧장 store에 쓰는 경로, 큐 재시도를 거치지 않는 경로)도 같은 함수를 그대로 불러 같은 결함을 그대로 물려받았다. **수정**: `clearPendingDayWrite(ownerKey, dateKey, effectivePatch)`에 방금 store에 성공적으로 커밋한 patch를 넘기는 3번째 필수 인자를 추가했다. durable에서 그 항목을 지우는 쓰기가 성공하면(또는 애초에 durable에 그 키가 없었으면) 예전과 똑같이 fallback/callback을 완전히 지우고 `true`를 돌려준다. **durable 삭제 쓰기가 실패하면 fallback을 지우는 대신 `effectivePatch`로 다시 채운다**(authoritative residual) — `computeEffectivePendingEntries()`의 "fallback이 durable 위를 덮어쓴다" 규칙 덕분에 이후 어떤 조회(`getPendingDayWrite`)·재시도(`retryPendingDayWrites`)·카운트(`pendingDayWriteCount`)도 stale한 durable 값이 아니라 이 값을 보게 되고, `false`를 돌려준다. 호출부(`retryPendingDayWrites`, `useDayDraft.js`의 `commitNow`)는 이 반환값을 보고서만 `onSettled(true)`를 부른다 — "논리적 pending이 실제로 정리됐을 때만 정확히 한 번" 계약을 지킨다. `useDayDraft.js`의 직접 커밋 성공 경로도 `clearPendingDayWrite(ownerKey, dateKey, patch)`로 방금 커밋한 patch를 그대로 넘기게 고쳤다. **테스트**: 사용자가 지정한 a~j 시나리오를 그대로 `pendingWorkDataWrites.test.js`에 추가했다("durable cleanup 쓰기만 실패해도 최신 fallback(B)이 유실되지 않고, 복구 후 재시도해도 A로 되돌아가지 않는다" — durable 삭제만 계속 막은 채 재시도해 store/localStorage/pending이 전부 B로 유지되는지, `pendingDayWriteCount()`가 1인지, `isDurableWriteBroken()`이 true인지, onSettled가 이 시점엔 안 불리는지까지 확인한 뒤 storage를 복구해 재시도하면 store가 여전히 B이고 A로 안 돌아가는지, 최종 count가 0이고 onSettled가 그제서야 정확히 한 번 불리는지). `App.test.js`에도 실제 `<App/>` 렌더로 useDayDraft의 직접 커밋 경로를 확인하는 통합 테스트를 추가했다("useDayDraft 직접 커밋 성공 후 cleanup만 실패해도 최신값이 유지되고, 복구 후 재시도해도 stale durable A로 되돌아가지 않는다" — 이전 세션에서 실패해 durable에 남아 있던 stale A(fixedCount=1)가 있는 상태로 화면에 들어가, durable cleanup만 계속 막은 채 fixedCount를 7로 편집·저장하면 store/localStorage는 7로 성공 커밋되지만 pending은 stale A(1)가 아니라 7로 남아야 하고, 복구 후 재시도해도 7이 유지돼야 한다). **되돌려서 확인**: `clearPendingDayWrite`를 예전(durable 삭제 실패를 무시하고 무조건 fallback/callback을 지우는) 버전으로 되돌리니 두 테스트가 각각 실제로 실패했다(`pendingWorkDataWrites.test.js` 쪽은 pending이 B(2) 대신 A(1)로, `App.test.js` 쪽도 pending이 7 대신 stale A(1)로 되돌아갔다) — 둘 다 복원 후 다시 통과.

**(6차 정정)** 위 수정은 durable "쓰기"(cleanup의 삭제 쓰기) 실패만 다뤘다 — `readDurable`(당시 `pendingWorkDataWrites.js` 내부 함수)이 durable "읽기"(`localStorage.getItem` 실패, JSON 파싱 실패, 예상과 다른 모양) 자체가 실패하는 경우를 정상적인 빈 큐(`{}`)와 똑같이 취급하는 훨씬 근본적인 결함은 놓쳤다. 그 결과 `registerPendingDayWrite`/`clearPendingDayWrite`가 "durable이 원래 비어 있다"고 착각하고 그 빈 객체 위에 새 값 하나만 있는 객체를 통째로 덮어써서, 실제로 있었지만 이번에 못 읽은 다른 날짜의 원문을 파괴할 수 있었다(6차에서 malformed JSON 시나리오로 실측 확인 — 덮어쓴 흔적이 그대로 재현됐다). 6차에서 `readDurable`을 `{ ok: true, value }|{ ok: false }` 명시적 결과 타입으로 바꾸고 이 파일 전체를 `durableStorage.js`로 분리해 수정했다(아래 "Step 6 재감사 6차" 절 참고).

**2. `pendingDayWriteCount()`가 논리 키 기준이 아니라 durable/fallback을 단순 합산했음** — 이번 라운드 시작 시점에는 아직 `hasPendingDayWrites`/`pendingDayWriteCount`가 각자 durable 항목 수와 `fallback.size`를 따로 세서 더하는 구조였다(4차가 `retryPendingDayWrites`만 Map 병합으로 고치고 이 두 함수는 그대로 남겨 뒀다 — 위 "(5차 정정)" 참고). 같은 owner/date가 durable(stale)과 fallback(최신 residual)에 동시에 있으면 실제로는 pending 1건인데 2건으로 잘못 셌다. **수정**: `retryPendingDayWrites`가 쓰던 것과 완전히 같은 Map 병합 로직을 `computeEffectivePendingEntries()`(신규, `pendingWorkDataWrites.js`)로 추출해서, `hasPendingDayWrites`/`pendingDayWriteCount`/`retryPendingDayWrites` 셋이 전부 이 함수 하나만 부른다 — 병합 규칙이 한 곳에만 있으니 앞으로도 서로 달라질 수 없다. **테스트**: 위 1번의 a~j 시나리오 테스트 자체가 `pendingDayWriteCount()`가 정확히 1로 유지되는지(2가 아니라)를 이미 검증한다(같은 owner/date가 durable+residual fallback에 동시에 있는 상태를 그대로 재현하므로).

**3. `npm test` 출력에 React `act(...)` 경고가 남았음** — `console.error` 억제 없이 실제 원인을 추적했다. 두 가지였다. **(a)** `App.test.js`의 폴링 헬퍼 `waitUntil`이 폴링 스텝(`wait(stepMs)`)마다 `act()`를 따로 열고 닫아서, 한 스텝의 `act()`가 끝나고 다음 스텝의 `act()`가 열리기 직전의 짧은 틈에 배경 디바운스 커밋 타이머가 끼어들면 그 상태 갱신이 act() 바깥으로 샜다 — 폴링 루프 전체(모든 스텝의 `wait` 포함)를 `act()` 콜백 하나로 감싸도록 고쳐 "acting" 상태가 폴링이 끝날 때까지 끊기지 않게 했다. **(b)** 3개 테스트(BottomNav 확인창 취소/허용, popstate)의 `finally` 블록이 다음 테스트로 broken 상태가 새지 않게 `retryPendingDayWrites()`를 직접(act() 밖에서) 불렀는데, 이 호출이 store를 커밋해 이미 홈으로 이동해 구독 중인 `CalendarPage`/`AppShell`을 갱신시켰다 — 전부 `await act(async () => { retryPendingDayWrites() })`로 감쌌다. **검증**: `npm test` 전체 출력을 `grep`으로 "not wrapped in act" 재확인 → **0건**(수정 전 5건). 테스트 자체의 통과/실패에는 영향 없음(경고 제거 전후 모두 전부 통과) — `console.error`를 가리거나 경고 자체를 필터링하는 방식은 쓰지 않았다(grep으로 직접 재확인).

**4. 문서가 미완성 상태를 완료로 기록함** — 위 "(5차 정정)" 두 문단으로 4차 절의 "전부 수정" 주장이 실제로는 1·2번 결함을 놓친 채였다는 걸 정정했다. 이 절 자체가 그 정정의 실제 수정 내용이다.

**(6차 정정)** 이 절 자체("전부 수정" 3건, 최종 검증 포함)도 다시 성급했다 — 위 1번(readDurable 읽기 실패 미처리) 결함은 5차 시점엔 발견되지 못한 채 "완료"로 보고됐고, 신규 테스트에 필수 인자 누락(TS2554) 2건이 남아 있었는데도 `npm test` 통과만 근거로 검증이 끝났다고 적었다. 6차에서 이 결함들을 실측·수정하고 revert-and-confirm-fail로 검출력까지 확인한 뒤에만 아래 "Step 6 재감사 6차" 절에 최종 판정을 다시 적었다.

**typecheck:strict-inventory 최종(5차 반영 후, 동일 명령·동일 분류 기준 재측정)**: `npx tsc -p tsconfig.strict-inventory.json --noEmit --pretty false` → 전체 **1118**(4차 1076에서 +42) / 프로덕션 **666**(4차와 동일 — 이번 라운드가 수정한 프로덕션 파일 3개(`pendingWorkDataWrites.js`, 신규 `pendingWorkDataWritesTypes.js`, `useDayDraft.js`) 전부 strict-inventory에서도 0 errors라 프로덕션 카운트에 변화가 없다, `grep`으로 직접 재확인) / 테스트·지원 **452**(4차 410에서 +42, 전부 이번에 확장한 `pendingWorkDataWrites.test.js`/`App.test.js`의 신규 테스트 코드에서 나온 암묵적 `any`류 — `checkJs:true` 구조적 부채 측정용이라 활성 게이트(`checkJs:false`)와 무관하며, 새 프로덕션 로직은 여기 안 걸린다).

**`npm test` 최종(5차 반영 후)**: **329/329 통과**(4차 327개 + `pendingWorkDataWrites.test.js` 신규 1 + `App.test.js` 신규 1 = 329), **React `act(...)` 경고 0건**(수정 전 5건, `grep`으로 직접 재확인). 항목 1(cleanup 부분 실패 데이터 유실)은 `pendingWorkDataWrites.test.js`·`App.test.js` 양쪽에서 각각 되돌려서 실패를 직접 확인했다(각 항목 본문 참고).

**최종 검증(5차 반영 후)**:
- `npx tsc --noEmit`(활성 게이트) → **0 errors**.
- `npm run build` → 성공. `npm run lint` → 기존 경고 4개만(4차와 동일, 라인 번호 변화 없음), 신규 0개.
- `git diff --check`(react-app, ubiquitous-parakeet) → 실제 오류 없음, LF/CRLF만.
- 이번 라운드에서 신규·수정한 프로덕션 파일 3개(`pendingWorkDataWrites.js` 191줄, `pendingWorkDataWritesTypes.js` 13줄, `useDayDraft.js` 195줄) 전부 `wc -l`로 200줄 이하 재확인 — 초과 0건.
- 이번 라운드에서 손댄 파일(위 3개 + `pendingWorkDataWrites.test.js` + `App.test.js`) 전부 `grep`으로 `any`/`unknown`/`Function`/`@ts-ignore`/`@ts-expect-error` 0건 재확인.
- 소스 전체(`.js`/`.jsx`, `node_modules`/`dist`/`.git` 제외 204개 파일) NUL 바이트 0건(Node 버퍼 스캔으로 재확인).
- 실제 클라우드 삭제 흐름(빈 날 삭제→새로고침→hydrate, 3차에서 실제 로그인 브라우저로 검증 완료)은 이번 5차에서도 손대지 않았다 — `syncDeletedWorkDates.js`/`domain/workDataTombstones.js`/`saveWorkDataWithTombstoneCheck` 어느 것도 이번 diff에 없다(재확인).

---

## Step 6 재감사 6차 — FAIL, 5건 지적(읽기 실패 처리 + 테스트 + 타입 회귀 + 문서) → 전부 수정 (사용자 지시)

5차 재감사(3건 수정, `[x]`로 복원) 보고 후 사용자가 다시 검토해 readDurable의 읽기 실패 처리 결함, 필수 실패 주입 테스트 부재, 신규 테스트의 TS2554 타입 회귀, strict-inventory 테스트·지원 오류 급증(452, 4차 독립 실측 기준 430 초과) 네 갈래(+문서 정정)를 지적하며 Step 6을 다시 `[~]`로 되돌렸다. 전부 수정하고 핵심 결함은 revert-and-confirm-fail로 검출력까지 확인했다.

**1. `readDurable`이 읽기 실패를 정상적인 빈 큐(`{}`)와 구분하지 않음** — 예전엔 `localStorage.getItem` 실패, `JSON.parse` 실패, 파싱 결과가 예상과 다른 모양(배열 등)인 경우를 전부 `{}`로 뭉뚱그려 돌려줬다. `registerPendingDayWrite`/`clearPendingDayWrite`가 그 `{}`를 "durable이 원래 비어 있다"고 믿고 그 위에 새 값 하나만 있는 객체를 통째로 다시 써서, 실제로 있었지만 이번에 못 읽은 다른 날짜의 원문을 파괴할 수 있었다. **수정**: 저수준 durable 읽기/쓰기(`readDurable`/`writeDurable`/`allDurableOwnerKeys`/`durableKey`)를 신규 `lib/durableStorage.js`(62줄)로 분리하고, `readDurable`이 `{ ok: true, value: Record<string, PendingPatch> } | { ok: false }`(신규 `DurableReadResult` 타입, `pendingWorkDataWritesTypes.js`)를 명시적으로 돌려주게 바꿨다 — `localStorage.getItem`이 `null`을 돌려주는(그 owner가 애초에 이 키를 한 번도 쓴 적 없는) 진짜 빈 상태만 `{ ok: true, value: {} }`고, 그 외 접근·파싱·모양 실패는 전부 `{ ok: false }`다. any/unknown/object 경유 단언은 쓰지 않았다 — JSON.parse 결과를 런타임에 `typeof`/`Array.isArray`로 검증한 뒤에만 `Record<string, PendingPatch>`로 좁혀 단언한다(기존 관례와 동일). `registerPendingDayWrite`는 읽기 실패 시 durable에 아예 쓰지 않고 신규 patch를 fallback에만 보존한다(기존 A/X 같은 다른 날짜 원문을 안 건드린다). `clearPendingDayWrite`도 읽기 실패를 cleanup 실패로 처리해 effectivePatch를 authoritative fallback으로 유지하고 `false`를 돌려준다(durable 쓰기 실패와 동일한 계약, 5차의 residual 메커니즘을 그대로 재사용). `hasUnsafePendingWrites`/`hasPendingDayWrites`/`pendingDayWriteCount`도 `computeEffectivePendingEntries()`가 함께 돌려주는 `unreadableOwners`를 봐서, 읽지 못한 owner가 있으면 "pending 없음"으로 거짓 판정하지 않는다 — 단 `pendingDayWriteCount()`는 그 owner의 항목이 이미 fallback을 통해 entries에 반영돼 있으면(예: cleanup 실패로 남은 residual) 이중으로 세지 않는다(entries에 전혀 안 잡힌 owner만 +1, 사용자가 지정한 시나리오 A의 "count는 정확히 1"을 만족시킨다).

**필수 실패 주입 테스트(사용자 지정 시나리오 A/B + malformed JSON, `pendingWorkDataWrites.test.js`에 3건 추가)**:
- **시나리오 A**: durable A + fallback B 상태에서 cleanup 시 durable `getItem` 자체만 막아서 실패시킨다. workData 커밋(B)은 성공, pending은 B, `pendingDayWriteCount()`는 1, `isDurableWriteBroken()`은 true, callback은 0회 — 읽기 복구 후 재시도하면 store/localStorage가 끝까지 B이고(A로 되돌아가지 않고) 최종 count 0, callback 정확히 1회를 전부 확인했다.
- **시나리오 B**: 같은 owner의 durable에 이미 날짜 A·X가 있는 상태에서 신규 날짜 B 등록 도중에만 durable `getItem`을 막았다. 등록 전후 durable 원문(`durableRaw`)이 바이트 단위로 동일한지 `deepEqual`로 직접 비교해 A/X가 파괴되지 않았음을 확인했고, B는 fallback을 통해 즉시 조회 가능했다. 복구 후 재시도하면 A/X/B 셋 다 store에 반영되고 최종 count 0.
- **malformed JSON**: durable 키에 실제로 파싱 불가능한 문자열(`'{ this is not valid json'`)을 직접 심어 두고 신규 patch를 등록했다 — 원문이 그대로 남아 있는지(`localStorage.getItem`으로 직접 재확인) 확인해 "빈 큐로 간주해 파괴적으로 덮어쓰지 않는다"를 검증했다.

**되돌려서 확인**: `readDurable`을 예전(읽기 실패도 `{ ok: true, value: {} }`로 취급하는) 버전으로 되돌리니 위 3건이 전부 실제로 실패했다 — malformed JSON 테스트는 durable 원문이 `{"2026-08-18":{...}}`(신규 patch 하나만 있는 객체)로 실제로 덮어써진 것까지 diff로 직접 확인했다(가장 명확한 파괴적 덮어쓰기 재현). 복원 후 셋 다 통과.

**(7차 정정)** 위 수정은 "최상위가 객체인지"만 확인하고 `Object.entries`로 나온 각 dateKey/patch를 전혀 검증하지 않은 채 `Record<string, PendingPatch>`로 단언했다 — `{ "2026-08-31": [] }`처럼 dateKey는 있지만 patch가 실제로는 배열(또는 null·문자열·숫자·필드 타입이 틀린 객체)인 데이터가 "정상 pending"으로 통과해, `saveDayRecord`가 그걸 유효한 patch로 오인하고 기존 `fixedCount:5` 일지를 지워 버리는 P0가 실측됐다(아래 "Step 6 재감사 7차" 1번 참고). `allDurableOwnerKeys`도 `localStorage.length`/`.key()` 자체가 실패할 수 있다는 경우를 안 봤다(아래 2번 참고).

**2. 신규 테스트의 TS2554 타입 회귀** — 5차가 `clearPendingDayWrite`에 필수 3번째 인자를 추가했는데, 그 이전부터 있던 기존 테스트 2곳(`pendingWorkDataWrites.test.js`의 등록-직후 테스트, beforeunload 가드 테스트)이 여전히 2-인자 호출로 남아 있었다(활성 게이트는 `@ts-check`가 없는 테스트 파일이라 못 잡았지만 strict-inventory에서 TS2554로 드러났다). **수정**: 두 호출부 모두 등록했던 patch 변수를 그대로 3번째 인자로 넘기게 고쳤다.

**3. strict-inventory 테스트·지원 오류 급증(452 → 430 이하로)** — 5차가 추가한 테스트 코드(및 이번 6차 추가분)의 암묵적 `any`가 대부분이었다. `mock.method(proto, 'setItem'/'getItem', function patched...(key, value) {...})` 패턴이 두 파일에 18곳 있었는데, 콜백의 `key`/`value`/`this`가 전부 암묵적 `any`였다 — `/** @this {Storage} @param {string} key @param {string} value */` 인라인 JSDoc을 18곳 전부에 추가해 한 번에 해소했다(기존 테스트 포함, 순수 타입 주석 추가라 동작 변화 없음). `readJsonKey('workData', ownerKey, {})[dateKey]`와 `getState().workLogs[ownerKey]?.main?.[dateKey]` 패턴(fallback 인자/기존 `workLogs: Record<string, Record<string, object>>` 타입 때문에 인덱싱이 `{}`로 추론됨)은 이번 라운드(5·6차)에 새로 추가한 테스트 코드에서만 각각 `readWorkData(ownerKey)`/`committedRecord(ownerKey, dateKey)` 타입 헬퍼로 우회했다(두 테스트 파일에 각 1개씩 신규 함수, 기존 3~4차 시절 테스트는 건드리지 않았다 — 그쪽은 이번 라운드의 "새로 추가한 테스트 코드" 범위 밖이라 별도 부채로 남긴다). `calls` 배열 3곳에 `/** @type {Array<boolean>} */`를 붙였고, `getPendingDayWrite(...).fixedCount`(반환 타입이 `PendingPatch|undefined`) 5곳에 옵셔널 체이닝을 추가했다. `PendingPatch.callDetails`도 `Array<object>`에서 실제 `saveDayRecord`(day-record.js)의 patch 매개변수가 받는 타입과 똑같은 `Array<CallDetailLike>`(domain/callDetail.js)로 교체했다.

**4. 문서가 미완성 상태를 완료로 기록함** — 위 "(6차 정정)" 두 문단으로 5차 절의 "전부 수정" 주장을 정정했다. 이 절 자체가 그 정정의 실제 수정 내용이다.

**(7차 정정)** 이 6차 절 자체("전부 수정" 5건, 최종 검증 포함)도 다시 성급했다 — durable JSON의 내부 patch 스키마를 전혀 검증하지 않아 기존 일지를 파괴할 수 있는 P0(위 1번 (7차 정정))와 owner 열거 실패 미처리(위 1번, 2번 참고)는 6차 시점에 발견되지 못한 채 "완료"로 보고됐다. 7차에서 이 둘을 실측·수정하고 revert-and-confirm-fail로 검출력까지 확인한 뒤에만 아래 "Step 6 재감사 7차" 절에 최종 판정을 다시 적었다 — 이번엔 사용자 최종 승인 전까지 `[x]`로 되돌리지 않는다(작업 원칙 1절, 사용자 지시).

**typecheck:strict-inventory 최종(6차 반영 후, 동일 명령·동일 분류 기준 재측정)**: 전체 **1052**(5차 1118에서 -66) / 프로덕션 **666**(5차와 동일 — 신규 `durableStorage.js` 포함 이번 라운드가 손댄 프로덕션 파일 4개 전부 strict-inventory에서도 0 errors, `grep`으로 직접 재확인) / 테스트·지원 **386**(5차 452에서 -66, 목표였던 4차 독립 실측 기준 430을 44 밑돎 — mock.method JSDoc 주석 18곳 추가가 기존 테스트 debt까지 함께 줄였다).

**`npm test` 최종(6차 반영 후)**: **332/332 통과**(5차 329개 + `pendingWorkDataWrites.test.js` 신규 3 = 332), **React `act(...)` 경고 0건**(5차와 동일, `grep`으로 직접 재확인). 항목 1(readDurable 읽기 실패 미처리)은 시나리오 A/B/malformed JSON 3건 전부 되돌려서 실패를 직접 확인했다(본문 참고).

**최종 검증(6차 반영 후)**:
- `npx tsc --noEmit`(활성 게이트) → **0 errors**.
- `npm run build` → 성공. `npm run lint` → 기존 경고 4개만(5차와 동일), 신규 0개.
- `git diff --check`(react-app, ubiquitous-parakeet) → 실제 오류 없음, LF/CRLF만.
- 이번 라운드에서 신규·수정한 프로덕션 파일 4개(`pendingWorkDataWrites.js` 195줄, `pendingWorkDataWritesTypes.js` 29줄, `durableStorage.js`(신규) 62줄, `useDayDraft.js` 195줄) 전부 `wc -l`로 200줄 이하 재확인 — 초과 0건.
- 이번 라운드에서 손댄 파일(위 4개 + `pendingWorkDataWrites.test.js` + `App.test.js`) 전부 `grep`으로 `any`/`unknown`/`Function`/`@ts-ignore`/`@ts-expect-error` 0건 재확인.
- 소스 전체(`.js`/`.jsx`, `node_modules`/`dist`/`.git` 제외 205개 파일) NUL 바이트 0건(Node 버퍼 스캔으로 재확인).
- 실제 클라우드 삭제 흐름은 이번 6차에서도 손대지 않았다(재확인).

---

## Step 6 재감사 7차 — FAIL, 3건 지적(스키마 검증 P0 + 열거 실패 + console.error 미검증) → 전부 수정, 사용자 최종 승인 대기 (사용자 지시)

6차 재감사(5건 수정, `[x]`로 복원) 보고 후 사용자가 다시 검토해 **3건**을 지적하며 Step 6을 다시 `[~]`로 되돌렸다(이번 라운드부터 "사용자 작업 원칙 통합본"이 영구 적용된다) — "durable patch 내부 값을 전혀 검증하지 않아 기존 일지를 지우는 P0가 있다", "owner 목록 열거(`localStorage.length`/`.key()`) 자체의 실패를 처리하지 않는다", "실패 주입 테스트가 유발하는 console.error를 검증 없이 그대로 흘려 보낸다" 세 갈래였다. 전부 수정하고 핵심 결함은 revert-and-confirm-fail로 검출력까지 확인했다. **이번 라운드는 모든 검증을 통과했어도 사용자 최종 승인 전까지 `[x]`로 복원하지 않는다**(작업 원칙 1절).

**1. durable patch 내부 값을 전혀 검증하지 않고 `Record<string, PendingPatch>`로 단언함(P0)** — 6차의 `readDurable`은 JSON 최상위가 배열/null이 아닌 객체인지만 확인하고, `Object.entries`로 나온 dateKey/patch 각각은 전혀 들여다보지 않은 채 그대로 `Record<string, PendingPatch>`로 단언했다. **재현**: 기존 `fixedCount:5` 일지가 있는 owner의 durable에 `{ "2026-08-31": [] }`(배열)를 직접 심고 `retryPendingDayWrites()`를 부르면, `[]`가 "callDetails가 비어 있고 나머지 필드도 없는 patch"로 오인돼 `saveDayRecord`의 empty 조건(휴무 아님+횟수 0+파렛트 0+콜상세 0)에 걸려 기존 일지가 **삭제**됐다(store가 `{"main":{}}`로 실측 확인). `null`/문자열/숫자/`{}`(불완전 객체)/필드 타입이 틀린 객체(`fixedCount: true` 등)/`callDetails`가 배열이 아니거나 내부 항목이 잘못된 경우/`fixedRouteCounts` 값이 숫자가 아닌 경우도 전부 같은 위험이 있었다. **수정**: 신규 `lib/durablePatchSchema.js`(88줄) — `isValidPatch(value)`가 `PendingPatch`의 모든 필드(`isOff`/`fixedCount`/`palletCount`/`callDetails`/`fixedRouteCounts`)를 실제 타입 계약대로 검증하고, `callDetails` 각 항목도 `domain/callDetail.js`의 `CallDetailLike` 계약(id/loadLoc/fare/commissionSnapshot/payments 등 전체 필드)에 맞는지 재귀적으로 검증한다. `{}`처럼 알려진 필드가 하나도 없는 patch는 "기존 일지를 뜻하지 않게 삭제할 수 있는 불완전 patch"로 보고 명시적으로 거부한다. 입력 타입은 `any`/`unknown`/`object`/`{}`가 아니라 JSON.parse가 실제로 돌려줄 수 있는 모양을 정확히 표현하는 재귀 타입 `JsonValue`(`string|number|boolean|null|Array<JsonValue>|Record<string, JsonValue>`, `pendingWorkDataWritesTypes.js` 신규)로 받아, `typeof`/`Array.isArray`/`!== null`로 실제 좁힌 뒤에만 필드를 읽는다 — 최상위 모양만 보고 도메인 타입으로 단언하는 우회는 없다. `durableStorage.js`의 `readDurable`은 이제 최상위 검증 뒤 `Object.entries(parsed)`를 순회하며 dateKey가 `/^\d{4}-\d{2}-\d{2}$/`(day-record.js의 실제 dateKey 조립 형식)에 맞는지, patch가 `isValidPatch`를 통과하는지 하나라도 어긋나면 그 owner 전체를 `{ ok: false }`(읽기 실패)로 취급한다 — 부분 신뢰 없이 owner 단위로 격리한다(원문은 그대로 보존, 5·6차의 authoritative-residual-fallback/파괴적 덮어쓰기 방지 계약을 그대로 물려받는다). **필수 회귀 테스트(9가지, `pendingWorkDataWrites.test.js`)**: 사용자가 지정한 배열/null/문자열/숫자/빈 객체/필드 타입 오류/callDetails 비배열/callDetails 내부 항목 오류/fixedRouteCounts 값 오류 각각에 대해 — 기존 `fixedCount:5` 일지를 미리 심고 `retryPendingDayWrites()`를 불러 Store/localStorage의 기존 일지 유지, durable 원문(바이트 단위) 유지, tombstone 불변, notify 0회(`subscribe`로 직접 카운트), sync 예약 0회(`hasDirty`), 원격 호출 0회(`stubSupabaseCallCounts` 합계), `isDurableWriteBroken()===true`를 전부 `assert`했다. **되돌려서 확인**: `readDurable`의 내부 검증 루프를 주석 처리(최상위만 보고 단언하는 6차 이전 동작으로 되돌림)하니 9건 전부 실제로 실패했다 — 배열 케이스는 정확히 사용자가 지적한 대로 Store가 `{"main":{"2026-09-01":{...fixedCount:5...}}}`에서 `{"main":{}}`로 바뀌는 것까지 diff로 직접 확인했다. 복원 후 9건 전부 통과.

**(8차 정정)** 위 `isValidPatch`가 여전히 "`PATCH_KEYS` 중 하나만 있으면 통과"였다 — durable 큐가 실제로 저장하는 값은 부분 patch가 아니라 `useDayDraft.js`가 만드는 "완성된 Effective Patch"(5개 필드 전부)인데, `{ isOff: false }` 하나만 있는 값도 여전히 통과해서 `saveDayRecord`가 나머지 필드를 기본값으로 채워 기존 일지를 지우는 P0가 그대로 남아 있었다(실측 확인, 아래 "Step 6 재감사 8차" 1번 참고). `retryPendingDayWrites`도 `unreadableOwners`를 계산만 하고 실제로는 무시해 손상된 owner의 fallback까지 그대로 커밋했다(2번 참고).

**2. `allDurableOwnerKeys`가 `localStorage.length`/`.key()` 자체의 실패를 처리하지 않음** — 예전엔 이 두 접근이 던지면 예외가 그대로 위(`hasUnsafePendingWrites`→`isDurableWriteBroken`→`guardBeforeUnload`까지)로 전파됐다 — beforeunload 리스너 안에서 예외가 나면 브라우저가 경고 자체를 못 띄우고 조용히 넘어갈 위험이 있었다(실측: revert 상태에서 `key()`를 막고 `hasUnsafePendingWrites()`를 부르면 그대로 throw). **수정**: `durableStorage.js`의 `allDurableOwnerKeys()`가 `OwnerEnumerationResult`(`{ ok: true, owners } | { ok: false }`, 신규)를 돌려주도록 바꾸고, `localStorage.length`/`localStorage.key(i)` 각각을 개별 `try/catch`로 감싸 실패하면 `{ ok: false }`를 돌려준다. `pendingWorkDataWrites.js`의 `computeEffectivePendingEntries()`가 이 결과의 `ok`를 보고 `ownerEnumerationFailed` 플래그를 함께 돌려준다 — durable 스캔 자체를 건너뛰지만 fallback(세션 메모리, 열거와 무관)은 그대로 포함한다. `hasUnsafePendingWrites`/`hasPendingDayWrites`는 이 플래그가 true면 보수적으로 `true`, `pendingDayWriteCount()`도 그만큼 몰라서 못 세는 owner가 있을 수 있다는 뜻으로 +1한다(이중 계산은 피한다). `retryPendingDayWrites()`는 열거가 실패하면(사용자 지시대로) **아무 상태도 바꾸지 않고 즉시 종료**한다 — fallback 항목이 있어도 부분 재시도를 시도하지 않는다(열거가 이 정도로 깨진 상황에서 부분 처리 자체가 위험하다는 판단). **테스트**: `pendingWorkDataWrites.test.js`에 `localStorage.key()`를 막는 실패 주입 테스트를 추가 — 열거 실패 중 `hasUnsafePendingWrites()`/`hasPendingDayWrites()`가 `true`인지, `retryPendingDayWrites()` 전후로 Store와 durable 원문이 바이트 단위로 전혀 안 바뀌는지, `guardBeforeUnload`가 예외 없이 `preventDefault`를 부르는지(`assert.doesNotThrow`)까지 확인했다. **되돌려서 확인**: `allDurableOwnerKeys`를 예전(예외를 못 잡고 그대로 던지는) 버전으로 되돌리니 이 테스트가 `hasUnsafePendingWrites()` 호출에서 그대로 예외를 던지며 실패했다(실측: `Error: storage access denied`가 테스트 콜스택까지 그대로 전파). 복원 후 통과.

**3. 실패 주입 테스트가 유발하는 console.error를 검증 없이 그대로 흘려 보냄** — `npm test` 출력에 `일지 자동 저장 실패`가 10건(비용 저장/삭제 실패 포함 12건) 그대로 찍혔지만 어느 테스트도 그 메시지·횟수를 `assert`하지 않았다. **수정**: `App.test.js`에 `spyConsoleError(expectedFirstArg)` 헬퍼(신규)를 추가 — `console.error`를 감싸되 **모든 호출을 원래 `console.error`로 그대로 전달**하며(call-through, 절대 숨기지 않는다), 지정한 첫 인자와 일치하는 호출만 별도로 센다. 실패 주입 테스트 8곳(3차 재진입, FAIL 지적 9번, BottomNav 확인창 취소/허용, popstate, 비용 저장/삭제 quota, persistent quota)에 이 헬퍼를 심어 각 테스트가 정확히 몇 번(디바운스 실패 1회, 언마운트 재시도 실패까지 겹치면 2회 등, 코드 경로를 그대로 추적해 산출)인지 `assert`했다. **검증**: `npm test` 전체 출력을 재확인 — 총 12건(예상대로) 전부 어느 테스트의 어느 assert가 설명하는 호출인지 대응됨, React `act(...)` 경고·unhandled rejection·그 외 예상 못 한 `console.error`는 0건(`grep`으로 직접 재확인). `console.error` 전역 억제나 문자열 필터링은 쓰지 않았다(call-through 방식이라 애초에 숨길 수 없는 구조).

**typecheck:strict-inventory 최종(7차 반영 후, 동일 명령·동일 분류 기준 재측정)**: 전체 **1052**(6차와 동일) / 프로덕션 **666**(6차와 동일 — 신규 `durablePatchSchema.js` 포함 이번 라운드가 손댄 프로덕션 파일 5개 전부 strict-inventory에서도 0 errors) / 테스트·지원 **386**(6차와 동일 — 이번 라운드에 추가한 테스트 코드가 유발한 신규 진단은 `App.test.js`의 `spyConsoleError` rest parameter 암묵적 `any` 1건뿐이었고, 명시적 타입(`Array<string|Error>`)을 붙여 즉시 없애서 순증가 0으로 마무리했다).

**`npm test` 최종(7차 반영 후)**: **342/342 통과**(6차 332개 + `pendingWorkDataWrites.test.js` 신규 10 = 342), React `act(...)` 경고 **0건**, unhandled rejection **0건**(`grep`으로 직접 재확인). 항목 1(스키마 미검증 P0, 9개 케이스)·2(owner 열거 실패)는 각각 되돌려서 실패를 직접 확인했다(본문 참고).

**최종 검증(7차 반영 후)**:
- `npx tsc --noEmit`(활성 게이트) → **0 errors**.
- `npm run build` → 성공. `npm run lint` → 기존 경고 4개만(6차와 동일), 신규 0개.
- `git diff --check`(react-app, ubiquitous-parakeet) → 실제 오류 없음, LF/CRLF만.
- 이번 라운드에서 신규·수정한 프로덕션 파일 5개 전부 200줄 이하 재확인 — `pendingWorkDataWrites.js` 200줄, `pendingWorkDataWritesTypes.js` 46줄, `durableStorage.js` 94줄, `durablePatchSchema.js`(신규) 88줄, `useDayDraft.js` 195줄(변경 없음). 초과 0건.
- 이번 라운드에서 손댄 파일(위 5개 + `pendingWorkDataWrites.test.js` + `App.test.js`) 전부 `grep`으로 `any`/`unknown`/`Function`/`@ts-ignore`/`@ts-expect-error` 0건, 타입 위치의 `object`/`{}` 0건(런타임 `typeof value === 'object'` 비교문만 있음 — 타입 단언이 아니다) 재확인.
- 소스 전체(`.js`/`.jsx`, `node_modules`/`dist`/`.git` 제외 206개 파일) NUL 바이트 0건(Node 버퍼 스캔으로 재확인).
- 실제 클라우드 삭제 흐름은 이번 7차에서도 손대지 않았다(재확인).

**상태(8차 정정)**: 위 "모든 검증을 통과했다"는 판단 자체가 다시 성급했다 — 1번(부분 patch 허용 P0)과 2번(unreadableOwners 무시)이 8차에서 실측·수정됐다(아래 "Step 6 재감사 8차" 절 참고). Step 6은 `[~]`로 계속 유지했다.

---

## Step 6 재감사 8차 — FAIL, 4건 지적(부분 patch 허용 P0 + unreadableOwners 무시 + dateKey 달력 검증 부재 + sync 검증 방법론) → 전부 수정 (사용자 지시)

7차 재감사 보고 후 사용자가 다시 검토해 **4건**을 지적하며 Step 6을 다시 `[~]`로 유지했다 — "`isValidPatch()`가 필드 하나만 있어도 통과시켜 여전히 기존 일지가 삭제되는 P0가 있다", "`computeEffectivePendingEntries()`가 돌려주는 `unreadableOwners`를 `retryPendingDayWrites()`가 무시하고 손상된 owner의 fallback까지 커밋한다", "dateKey를 정규식 모양만 보고 실제 달력 날짜인지 왕복 검증하지 않는다", "sync 예약 0회를 `hasDirty()` 전후 비교라는 간접 신호로만 증명했다" 네 갈래였다. 전부 수정하고 핵심 결함(1~3번) 각각을 revert-and-confirm-fail로 검출력까지 확인했다.

**1. `isValidPatch()`가 필드 하나만 있어도 통과시킴(P0, 재발)** — durable 큐가 실제로 저장하는 값은 `saveDayRecord`(day-record.js) 같은 함수가 받는 "부분 patch"가 아니라, `useDayDraft.js`의 `commitNow`가 draft 전체에서 `structuredClone({ isOff, fixedCount, palletCount, callDetails, fixedRouteCounts })`으로 만드는 "완성된 Effective Patch"(5개 필드 전부 항상 채워서 넘긴다)다. `isValidPatch`는 여전히 `PATCH_KEYS.some(...)`(하나만 있어도 통과)라서, 기존 `fixedCount:5` 일지가 있는 상태에서 durable patch가 `{ isOff: false }`(또는 `{ fixedCount: 1 }`) 하나뿐이면 정상 pending으로 통과해 `saveDayRecord`가 나머지 필드를 기본값(0/빈 배열)으로 채워 기존 일지를 지워 버렸다(실측 확인, Store가 `{"main":{"2026-09-01":{...fixedCount:5}}}`에서 `{"main":{}}`로). **수정**: `pendingWorkDataWritesTypes.js`의 `PendingPatch` 타입을 `EffectivePatch`로 이름을 바꾸고 5개 필드를 전부 필수(`[optional]` 제거)로 바꿔, day-record.js의 부분 patch 타입과 명확히 분리했다. `durablePatchSchema.js`의 `isValidPatch`는 이제 `Object.keys(value).length === PATCH_KEYS.length && PATCH_KEYS.every((key) => key in value)`로 **정확히 이 5개 필드가 전부, 그 이상도 이하도 없어야** 통과한다(실제 프로덕션 값의 정확한 모양과 100% 일치해야 한다는 명시적 스키마 계약 — 추가 필드 허용 여부를 "허용 안 함"으로 확정했다). `pendingWorkDataWrites.js`/`durableStorage.js` 전체의 `PendingPatch` 참조도 `EffectivePatch`로 교체했다. 기존 테스트가 임의로 등록하던 부분 patch(`{isOff, fixedCount, callDetails}`만 있고 `palletCount`/`fixedRouteCounts`가 빠진 값)는 전부 실제 프로덕션 모양의 완성된 patch로 강화했다(두 테스트 파일 전체, 기계적 스크립트로 일괄 보강 후 결과 재확인). **필수 회귀 테스트**: 사용자가 지정한 두 정확한 재현(`{isOff:false}` 단독, `{fixedCount:1}` 단독)과 완성된 patch에서 필수 필드가 정확히 하나씩 빠진 5가지 경우(총 7건, 기존 9건 malformed-schema 스위트에 합류해 16건)를 전부 추가 — Store/localStorage/durable 원문(바이트 단위)/tombstone 불변, notify 0회, sync 예약 0회(dirty journal), 원격 호출 0회, `isDurableWriteBroken()===true`를 전부 확인했다. **되돌려서 확인**: `isValidPatch`를 "하나만 있어도 통과" 버전으로 되돌리니 7건 전부 실제로 실패했다 — `{isOff:false}` 케이스는 사용자가 지적한 그대로 기존 일지가 삭제되는 것까지 diff로 재확인했다. 복원 후 16건 전부 통과.

**(9차 정정)** 5개 필드가 "전부 있는지"만 봤지, fixedCount/palletCount가 실제 `DayDraft` 계약대로 0 이상의 유한한 **정수**인지는 안 봤다 — `typeof number`만 통과하면 문자열이 아닌 이상 다 받아 줘서 `-1`/`1.5`/`"oops"`가 여전히 정상 pending으로 통과했다(아래 "Step 6 재감사 9차" 1번 참고). 콜상세도 필드 타입만 봤지 id 필수·추가 필드 거부는 안 했다(2번 참고). `registerPendingDayWrite`는 readDurable에서만 검증되고 자신은 무검증이었다(3번). dateKey 검증은 durableStorage 내부 전용이라 실제 `/app/day/:date` 라우팅에는 전혀 적용되지 않았다(4번).

**2. `retryPendingDayWrites()`가 `unreadableOwners`를 무시하고 손상된 owner의 fallback까지 커밋함** — `computeEffectivePendingEntries()`는 이미 7차부터 `unreadableOwners`(durable을 못 읽은 owner 집합)를 돌려주고 있었지만, `retryPendingDayWrites()`는 그 정보를 실제로는 쓰지 않고 `entries`(durable+fallback 병합 맵) 전체를 그대로 순회해서, "durable은 손상됐지만 같은 owner/date의 fallback은 최신"인 경우에도 그 fallback을 그대로 커밋해 버렸다. **수정**: `retryPendingDayWrites()`의 순회 루프 맨 앞에 `if (unreadableOwners.has(ownerKey)) return`을 추가했다 — 손상된 owner는 durable뿐 아니라 그 owner의 fallback도 이번 retry에서 통째로 건너뛴다(읽기가 복구되면 다음 호출에서 자연히 다시 포함된다). **테스트**: 사용자가 지정한 정확한 시나리오(기존 Store `fixedCount:5` + durable 원문 `{date:[]}`(손상) + 같은 owner/date의 최신 fallback `B={fixedCount:9,palletCount:2,...}`)를 그대로 재현 — 손상 상태에서 retry 시 Store/localStorage(`fixedCount:5` 유지)/durable 원문(바이트 동일)/fallback B(조회에서 여전히 우선)/tombstone/notify(0회)/sync 예약(0회)/원격 호출(0회)/`broken=true`/pending count(retry 전후 그대로)를 전부 확인한 뒤, 명시적 복구 단계(durable을 정상 빈 큐 `{}`로 되돌림)에서 재시도해 B가 정확히 한 번 커밋되고 큐·callback이 정상 정리(callback 정확히 1회)되는지까지 확인했다. **되돌려서 확인**: `unreadableOwners` 체크를 지우고 예전(무시하고 커밋)처럼 되돌리니 이 테스트가 Store가 `fixedCount:5` 대신 즉시 `9`로 바뀌는 것으로 실제 실패했다(손상 상태에서도 커밋이 진행됨). 복원 후 통과. (참고: 6차의 "시나리오 A" — durable getItem이 cleanup 시점에만 실패하는 테스트 — 는 이 owner가 retry 진입 시점에는 아직 읽기 가능했던 경우라 이번 변경의 영향을 받지 않는다. 다만 그 테스트의 getItem mock이 첫 호출(진입 시 entries 계산)까지 막고 있었던 걸 두 번째 호출부터만(cleanup 자신의 재확인) 막도록 정밀화해서, "진입 시엔 읽기 가능·cleanup에서만 실패"라는 원래 의도와 이번 unreadableOwners 계약이 함께 성립하도록 정정했다 — 실제 프로덕션 동작 자체는 그대로다.)

**3. dateKey를 정규식 모양만 확인하고 실제 달력 날짜인지 검증하지 않음** — `/^\d{4}-\d{2}-\d{2}$/`는 `2026-99-99`/`2026-02-30`/`2026-02-29`(2026은 윤년이 아니다) 같은 존재하지 않는 날짜도 통과시켰다. **수정**: `durableStorage.js`에 `isValidCalendarDateKey(dateKey)`(신규)를 추가 — 정규식 통과 후 year/month/day로 실제 `Date.UTC(...)`를 만들어 다시 읽어서 왕복이 그대로인지(월/일이 넘쳐서 다른 날짜로 밀리지 않았는지) 확인한다(UTC 기준이라 로컬 타임존 오프셋에 안 좌우된다). `readDurable`의 dateKey 검증이 이 함수를 쓰도록 교체했다. **테스트**: 사용자가 지정한 5가지(`2026-99-99`/`2026-02-30`/`2026-02-29` 거부, `2028-02-29`(2028은 윤년)/`2026-12-31` 허용)를 전부 추가 — 거부 케이스는 같은 owner에 진짜 날짜의 기존 일지도 함께 두고, owner 단위 격리 계약대로 그 진짜 일지까지 함께 보존되는지(Store/localStorage/durable 원문/tombstone/notify/sync/API 전부 불변, broken=true)까지 확인했다. 허용 케이스는 실제로 커밋되고 durable 큐에서 지워지는지 확인했다. **되돌려서 확인**: `isValidCalendarDateKey`를 정규식만 확인하는 버전으로 되돌리니 3개 거부 케이스가 전부 실제로 실패했다(`2026-02-30`/`2026-02-29` 둘 다 정상 커밋되며 기존 일지 위에 그대로 덮어써졌다). 복원 후 5건 전부 통과.

**4. sync 예약 0회 검증이 `hasDirty()` 전후 비교라는 침투적·간접 신호에 의존함** — `hasDirty()`는 "이 owner에 아직 안 보낸 변경이 있는가"를 보는 함수라, "이번 retry가 `scheduleCloudSync()`를 실제로 호출했는가"의 직접 증거가 아니다(예: 이미 dirty였다가 이번 실패로 dirty가 그대로 유지된 경우와, 진짜로 예약이 안 걸린 경우를 구분 못 한다). **수정**: 신규 격리 테스트 파일 `lib/pendingWorkDataWritesSyncSpy.test.js`를 추가했다 — `app-store.js`가 `import { scheduleCloudSync } from '../lib/syncQueue.js'`로 정적 임포트하므로(ESM은 최상위 정적 import를 전부 링크한 뒤에야 모듈 본문을 실행해서, 이미 링크된 뒤에 `mock.module`을 걸면 안 먹는다 — `app-store.test.js`/`syncQueue.test.js`와 같은 이유), 이 파일 맨 위에서 다른 어떤 import보다 먼저 `mock.module('./syncQueue.js', { exports: { scheduleCloudSync: <실제 호출 횟수를 세는 spy>, flushCloudSync: async()=>{} } })`을 등록한 뒤에야 `pendingWorkDataWrites.js`/`app-store.js`를 동적 `import()`한다. 프로덕션 코드에는 테스트 전용 우회를 전혀 넣지 않았다 — 이 테스트 파일의 `mock.module` 등록만으로 격리된다. **검증 3건**: (a) 양성 대조군 — 정상 retry는 `scheduleCloudSync`를 정확히 1회 부른다(spy 자체가 살아 있다는 근거, "항상 0"이 아니라는 걸 먼저 보인다). (b) 1번의 불완전 patch(P0) 스키마 위반으로 인한 retry 스킵은 0회. (c) 2번의 손상된 owner+최신 fallback 공존 시 retry 스킵도 0회. `package.json`의 `test` 스크립트에 이 신규 파일을 추가했다.

**typecheck:strict-inventory 최종(8차 반영 후, 동일 명령·동일 분류 기준 재측정)**: 전체 **1052**(7차와 동일) / 프로덕션 **666**(7차와 동일 — 이번 라운드가 수정한 프로덕션 파일 4개 전부 strict-inventory에서도 0 errors) / 테스트·지원 **386**(7차와 동일 — 신규 `pendingWorkDataWritesSyncSpy.test.js` 포함 이번 라운드에 추가한 테스트 코드가 유발한 신규 진단 0건, `grep`으로 직접 재확인).

**`npm test` 최종(8차 반영 후)**: **358/358 통과**(7차 342개 + `pendingWorkDataWrites.test.js` 신규 13(항목1 7건+항목2 1건+항목3 5건) + `pendingWorkDataWritesSyncSpy.test.js` 신규 3 = 358), React `act(...)` 경고 **0건**, unhandled rejection **0건**, 예상 못 한 `console.error` **0건**(전부 `grep`으로 직접 재확인, 기존 12건은 이전 라운드에서 이미 검증됨). 항목 1·2·3은 각각 되돌려서 실패를 직접 확인했다(본문 참고).

**최종 검증(8차 반영 후)**:
- `npx tsc --noEmit`(활성 게이트) → **0 errors**.
- `npm run build` → 성공. `npm run lint` → 기존 경고 4개만(7차와 동일), 신규 0개.
- `git diff --check`(react-app, ubiquitous-parakeet) → 실제 오류 없음, LF/CRLF만.
- 이번 라운드에서 신규·수정한 프로덕션 파일 4개 전부 200줄 이하 재확인 — `pendingWorkDataWrites.js` 200줄, `pendingWorkDataWritesTypes.js` 51줄, `durableStorage.js` 106줄, `durablePatchSchema.js` 89줄. 초과 0건.
- 이번 라운드에서 손댄 파일(위 4개 + `pendingWorkDataWrites.test.js` + 신규 `pendingWorkDataWritesSyncSpy.test.js`) 전부 `grep`으로 `any`/`unknown`/`Function`/`@ts-ignore`/`@ts-expect-error` 0건, 타입 위치의 `object`/`{}` 0건 재확인.
- 소스 전체(`.js`/`.jsx`, `node_modules`/`dist`/`.git` 제외 207개 파일) NUL 바이트 0건(Node 버퍼 스캔으로 재확인).
- 실제 클라우드 삭제 흐름은 이번 8차에서도 손대지 않았다(재확인).

**상태(9차 정정)**: 위 "모든 검증을 통과했다"는 판단이 다시 성급했다 — 위 4건 모두 9차에서 실측·수정됐다(아래 "Step 6 재감사 9차" 절 참고). Step 6은 `[~]`로 계속 유지했다.

---

## Step 6 재감사 9차 — FAIL, 4건 지적(EffectivePatch 숫자 계약 + 콜상세 스키마 + 입력 시점 검증 + UI 라우팅 적용) → 전부 수정 (사용자 지시)

8차 재감사 보고 후 사용자가 다시 검토해 **4건**을 지적하며 Step 6을 `[~]`로 유지했다 — "`EffectivePatch`의 fixedCount/palletCount/fixedRouteCounts가 실제 `DayDraft` 계약(0 이상의 유한한 정수)과 안 맞는다", "durable 콜상세 스키마가 id 필수·추가 필드 거부를 안 한다", "`registerPendingDayWrite`가 readDurable에서만 검증되고 자신은 입력을 검증하지 않는다", "dateKey 달력 검증이 durableStorage 내부 전용이라 실제 `/app/day/:date` 라우팅에는 적용되지 않는다" 네 갈래였다. 전부 수정하고 핵심 결함 1~4번 전부를 revert-and-confirm-fail로 검출력까지 확인했다.

**1. `EffectivePatch`의 숫자 필드가 실제 `DayDraft` 계약과 다름(P0)** — day-log-reducer.js의 실제 `DayDraft`는 `fixedCount`/`palletCount`가 `Math.max(0, parseInt(...) || 0)`로 만들어지는 **0 이상의 유한한 정수**이고 `fixedRouteCounts`의 각 값도 마찬가지다. `isValidPatch`는 `typeof value.fixedCount !== 'number' && typeof value.fixedCount !== 'string'`만 봐서 `-1`/`1.5`/`NaN`/`"oops"`가 전부 통과했다. **수정**: `durablePatchSchema.js`에 `isNonNegativeInteger(value)`(신규, `Number.isFinite && Number.isInteger && value >= 0`)를 추가해 fixedCount/palletCount/fixedRouteCounts 값 전부를 이 함수로 검증하도록 바꿨다. `pendingWorkDataWritesTypes.js`의 `EffectivePatch`도 `fixedCount`/`palletCount`를 `number|string`에서 `number`로 좁혔다(프로덕션에서 문자열은 절대 안 나온다). **필수 테스트(7건, 사용자 지정)**: 기존 `fixedCount:5`+`fixedCount:"oops"`/`-1`/`1.5`, 기존 `palletCount:4`+`palletCount:"oops"`/`-1`, 기존 `fixedRouteCounts:{r1:2}`+`{r1:-1}`/`{r1:1.5}` — 전부 `lib/pendingWorkDataWritesSyncSpy.test.js`에 추가해 Store/localStorage/durable 원문(바이트 단위)/tombstone 불변, notify 0회, **실제 `scheduleCloudSync` 0회**(mock.module 격리 spy로 직접), 원격 호출 0회, `broken=true`를 전부 확인했다. **되돌려서 확인**: `isNonNegativeInteger`를 `typeof number || typeof string`으로 되돌리니 7건 전부 실제로 실패했다. 복원 후 통과.

**2. durable 콜상세 스키마가 id 필수·추가 필드 거부를 안 함** — `useDayDraft.js` 진입 전 `backfillCallDetailIds`가 이미 돌아 모든 콜상세는 비어 있지 않은 `id`를 반드시 갖는데, 예전 검증기는 "id가 있으면 문자열이어야 한다" 정도만 봐서 `{}`/`{id:""}`/id 자체가 없는 `{fare:"1000"}` 같은 값도 통과시켰다. 정의되지 않은 추가 필드(콜상세/commissionSnapshot/payment 항목 전부)도 거부하지 않았다. **수정**: 콜상세 검증을 신규 `lib/callDetailSchema.js`(101줄, 역할 분리 겸 200줄 제한)로 옮기고 — `id`를 비어 있지 않은 문자열로 필수화, `ALLOWED_CALL_DETAIL_KEYS`/`ALLOWED_COMMISSION_KEYS`/`ALLOWED_PAYMENT_KEYS`(전부 신규, `domain/callDetail.js`의 실제 선언 필드 전체) 밖의 키가 있으면 거부, `payments[]` 항목도 `payments.js`(addPartialPayment/ensurePaymentList)가 실제로 만드는 값대로 `id` 필수·`amount`는 0 이상의 유한한 숫자로 강화했다. `pendingWorkDataWritesTypes.js`에 `EffectiveCallDetail`(`CallDetailLike & { id: string }`, day-log/dayLogTypes.js와 같은 좁힘을 lib/ 안에서 자체 정의 — lib이 components를 참조하지 않는 방향을 지킨다) 타입을 추가했다. **테스트**: 기존 `fixedCount`/`palletCount`/`fixedRouteCounts`가 있는 상태에서 `callDetails:[{}]`를 주입해도 그 값들이 전혀 안 변하는지(`pendingWorkDataWritesSyncSpy.test.js`) 확인했다. **되돌려서 확인**: id 필수 검사를 지우니 `callDetails:[{}]`가 실제로 커밋되며 기존 `fixedCount:3`이 `9`로 덮어써지는 것으로 실패했다. 복원 후 통과.

**3. `registerPendingDayWrite`가 자신은 입력을 검증하지 않음** — readDurable(읽기 시점)에서만 스키마를 검증했지, `registerPendingDayWrite`(쓰기 시점)는 durable/fallback/callback을 건드리기 전에 dateKey/patch를 스스로 확인하지 않았다. **수정**: `registerPendingDayWrite` 맨 앞에 `if (!isValidCalendarDateKey(dateKey) || !isValidPatch(patch)) return false`를 추가했다 — 검증에 실패하면 `settledCallbacks`/`fallback`/durable 어느 것도 건드리지 않고 즉시 `false`를 돌려준다(함수 전체가 동기식이라 비동기 예외·unhandled rejection 여지 자체가 없다). 처리 결과를 항상 명시적으로 반환하도록 반환 타입도 `boolean`으로 바꿨다(기존 정상 접수 경로들도 전부 `true`를 돌려주게 정리). **테스트**: 기존 정상 항목 하나를 등록해 둔 상태에서 잘못된 dateKey(`2026-02-30`)와 잘못된 patch(필수 필드 누락)로 각각 호출 — 둘 다 `false`를 돌려주고, durable 원문이 바이트 단위로 그대로이며, 기존 정상 항목의 콜백은 나중에 정확히 한 번만 불리고 거부된 두 등록에 넘긴(호출되면 즉시 throw하는) 콜백은 절대 안 불리는지 확인했다. **되돌려서 확인**: 검증 호출을 지우니 잘못된 dateKey가 `true`를 돌려주며(무검증으로 접수) 실패했다. 복원 후 통과.

**4. dateKey 달력 검증이 durableStorage 내부 전용이라 실제 라우팅에 적용 안 됨** — `isValidCalendarDateKey`가 `durableStorage.js` 안에서만 쓰였다. `domain/calendar.js`의 `parseDateKeySelection`(MainPageRoute.jsx가 실제 `/app/day/:date` 진입 판정에 쓰는 함수)은 여전히 정규식만 봐서, URL로 `2026-02-30`에 직접 진입하면 durable과 달리 실제 화면에서는 걸러지지 않을 위험이 있었다. **수정**: `isValidCalendarDateKey`를 신규 공용 도메인 모듈 `domain/dateKey.js`(25줄, `@ts-check`)로 분리하고 `durableStorage.js`/`domain/calendar.js`(`parseDateKeySelection`) 양쪽이 이 함수 하나를 쓰게 했다 — 두 경로가 서로 다른 기준으로 어긋날 수 없다. `MainPageRoute.jsx`에도 `useEffect`를 추가해 `date` 파라미터는 있는데 `parseDateKeySelection`이 `null`을 돌려주면(=실존하지 않는 달력 날짜) `DayLogPage`를 렌더하는 대신 `/app`으로 `replace` 이동한다. **테스트**: 순수 함수 테스트(5가지: 거부 3·허용 2, 8차와 동일)에 더해, **실제 `<App/>` 통합 테스트**를 `App.test.js`에 추가 — `/app/day/2026-02-30`으로 직접 진입하면 `#modalFixedCountInput`(DayLogPage 마커)이 전혀 렌더되지 않고, URL이 `/app`으로 replace되고, Store/localStorage에 그 날짜로 아무 것도 안 쓰이는지 확인했다(순수 함수 테스트만으로 실제 UI 경로가 안전하다고 주장하지 않는다). **되돌려서 확인**: `parseDateKeySelection`을 정규식 전용으로 되돌리니 이 통합 테스트가 URL이 `/app/day/2026-02-30`에 그대로 머무는 것으로 실제 실패했다. 복원 후 통과.

**typecheck:strict-inventory 최종(9차 반영 후, 동일 명령·동일 분류 기준 재측정)**: 전체 **1052**(8차와 동일) / 프로덕션 **666**(8차와 동일 — 이번 라운드가 손댄/신규 프로덕션 파일 전부 strict-inventory에서도 0 errors) / 테스트·지원 **386**(8차와 동일 — 신규 테스트 코드가 유발한 진단은 처음에 2건(App.test.js가 기존 `committedRecord`/`readWorkData` 헬퍼 대신 원시 인덱싱을 써서) 나왔지만 그 헬퍼로 바꿔 즉시 없애서 순증가 0으로 마무리했다).

**`npm test` 최종(9차 반영 후)**: **368/368 통과**(8차 358개 + `pendingWorkDataWrites.test.js` 신규 1(항목3) + `pendingWorkDataWritesSyncSpy.test.js` 신규 8(항목1 7건+항목2 1건) + `App.test.js` 신규 1(항목4) = 368), React `act(...)` 경고 **0건**, unhandled rejection **0건**, 예상 못 한 `console.error` **0건**(기존 12건 그대로, 전부 `grep`으로 재확인). 항목 1·2·3·4 전부 되돌려서 실패를 직접 확인했다(본문 참고).

**최종 검증(9차 반영 후)**:
- `npx tsc --noEmit`(활성 게이트) → **0 errors**.
- `npm run build` → 성공. `npm run lint` → 기존 경고 4개만(8차와 동일), 신규 0개.
- `git diff --check`(react-app, ubiquitous-parakeet, **tracked 파일**) → 실제 오류 없음, LF/CRLF만.
- **untracked 파일 별도 검사**(사용자 지시 — 새 파일 대부분이 untracked라 `git diff --check`가 안 본다): react-app의 untracked `.js`/`.jsx`/`.md`/`.json` 55개를 Node로 직접 스캔 — 충돌 마커(`<<<<<<<`/`=======`/`>>>>>>>`) 0건, 줄 끝 공백(trailing whitespace) 0건.
- 이번 라운드에서 신규·수정한 프로덕션 파일 전부 200줄 이하 재확인 — `pendingWorkDataWrites.js` 200줄(변경 없음), `pendingWorkDataWritesTypes.js` 59줄, `durableStorage.js` 95줄, `durablePatchSchema.js` 50줄(콜상세 검증을 callDetailSchema.js로 분리해 감소), `callDetailSchema.js`(신규) 101줄, `domain/dateKey.js`(신규) 25줄, `domain/calendar.js` 88줄, `app/MainPageRoute.jsx` 112줄. 초과 0건.
- 이번 라운드에서 손댄 파일 전부 `grep`으로 `any`/`unknown`/`Function`/`@ts-ignore`/`@ts-expect-error` 0건, 타입 위치의 `object`/`{}` 0건 재확인.
- 소스 전체(`.js`/`.jsx`, `node_modules`/`dist`/`.git` 제외 209개 파일) NUL 바이트 0건(Node 버퍼 스캔으로 재확인).
- 실제 클라우드 삭제 흐름은 이번 9차에서도 손대지 않았다(재확인).

**사용자 지시(항목 6) — 마지막 커밋(`d9eadff`, Step 5) 이후 누적된 Step 6 전체 프로덕션 파일 변경 현황**(이번 9차 개별 파일만이 아니라, Step 6 1차 구현부터 지금까지 전부):
- **수정된 기존 프로덕션 파일 25개**(전부 200줄 이하): `app/App.jsx`(200) `app/AppShell.jsx`(196) `app/MainPageRoute.jsx`(112) `app/providers.jsx`(47) `components/RevenuePage.jsx`(29) `components/calendar/CalendarMonthSummary.jsx`(90) `components/calendar/CalendarPage.jsx`(123) `domain/calendar.js`(88) `domain/calendarBadges.js`(87) `domain/call-details.js`(136) `domain/clients.js`(171) `domain/day-record.js`(195) `domain/expenses.js`(174) `domain/finance.fixtures.js`(163) `domain/finance.js`(29) `lib/hydrate.js`(140) `lib/hydrateMerge.js`(197) `lib/ownerFinance.js`(105) `lib/syncQueue.js`(147) `lib/workData.js`(75) `store/app-store.js`(168) `store/commitHelpers.js`(84) `store/owner-state.js`(102) `store/ownerDataHooks.js`(130) `store/persist.js`(67).
- **신규 프로덕션 파일 48개**(전부 200줄 이하, 상세): `app/pendingWriteRetryListeners.js`(43) `components/day-log/`(19개: AutoSaveStatus.jsx 13, CallDetailCard.jsx 98, CallDetailForm.jsx 185, CallDetailList.jsx 67, DayLogHeader.jsx 24, DayLogPage.jsx 200, ExpenseGroups.jsx 64, ExpenseSelectPanel.jsx 17, FixedCountSection.jsx 45, FixedRouteChips.jsx 50, InlineSheet.jsx 19, MessageTemplateSheet.jsx 56, OffToggle.jsx 19, PalletSection.jsx 35, callDetailFormHelpers.js 83, day-log-reducer.js 87, dayLogTypes.js 33, icons.jsx 63, inlinePanelActions.js 36, useDayDraft.js 195, useExpenseForm.js 100) `components/revenue/`(5개: DriverRevenueView.jsx 101, OwnerMonthlyCards.jsx 122, OwnerRevenueView.jsx 100, RevenueNav.jsx 59, revenueFormat.js 22) `domain/`(13개: callDetail.js 34, clientPaymentTerms.js 87, clientTypes.js 48, dateKey.js 25, dayRecordTypes.js 21, expenseTypes.js 35, financeCore.js 193, financeOwnerDetail.js 195, financeReceivables.js 89, financeTaxInvoiceEntries.js 148, financeTaxInvoiceGroups.js 193, financeTypes.js 61, workDataTombstones.js 31) `lib/`(9개: callDetailSchema.js 101, durablePatchSchema.js 50, durableStorage.js 95, durableWriteGuard.js 41, hydrateMergeTypes.js 29, pendingWorkDataWrites.js 200, pendingWorkDataWritesTypes.js 59, syncDeletedWorkDates.js 57).
- **삭제된 프로덕션 파일 3개**: `app/typedWorkLogPage.js`(+`.d.ts`), `components/InlineExpandHost.jsx`, `components/WorkLogPage.jsx`(Step 6이 대체).
- **200줄 초과 0건**(Node 스크립트로 위 76개 파일 전부 직접 재확인).

**상태**: 위 모든 검증을 통과했다. 이번 라운드부터 적용되는 작업 원칙에 따라 **사용자 최종 승인 전까지 Step 6은 `[~]`로 유지한다.** 사용자가 승인하면 그때 `[x]`로 바꾸고 커밋한다.

**상태(10차 정정)**: 위 "모든 검증을 통과했다", "전부 수정", "전부 @ts-check", "금지 타입 0건"은 성급한 판단이었다. 9차 `isValidPayment`는 신규 `addPartialPayment` 값만 보고 id 필수·amount 숫자 전용으로 강제해, 실제로 존재하는 레거시 payments(`{ amount: "1,000" }`, `{ amount: 1000 }`, id 없음)를 durable 접수에서 거절할 수 있었고, 10차 WIP의 `<App/>` 통합 테스트 A는 palletOn 거래처를 안 심어 `#modalPalletCount`가 없는 채로 복구 편집을 시도해 TypeError로 실패했다. 아래 "Step 6 재감사 10차" 절에서 그 실패 원인과 수정을 기록한다. Step 6은 `[~]`로 유지하고 Step 7은 착수하지 않는다.

---

## Step 6 재감사 10차 — 진행 중 (레거시 payments 계약 + register false 경로 + `<App/>` 통합 A/B + 타입 재검사 + 문서)

9차 보고 후 사용자가 다시 검토해 Step 6을 `[~]`로 유지한 채 10차를 지시했다. 이 라운드는 사용자 최종 승인 전까지 `[x]`로 바꾸지 않는다. Step 7은 시작하지 않는다.

**1. payments 계약** — `domain/callDetail.js`의 `PaymentLike`(id/amount/paidAt/note 전부 optional, amount는 `string|number`)와 `payments.js`가 보존하는 레거시 값, `callDetailSchema.js` 런타임 검증을 맞춘다. 허용: `[{ amount: "1,000" }]`, `[{ amount: 1000 }]`, payment id 없음, 문자열·숫자 amount 혼재. 거부: 임의 문자열(`"oops"`), 음수, NaN, Infinity, 잘못된 중첩 객체.

**2. `registerPendingDayWrite()` false 경로** — `useDayDraft.js`가 반환값을 무시하지 않는다. false면 `markUnsafeRegistrationFailure(ownerKey, dateKey, patch)`로 owner/date 단위 격리. 같은 키가 durable/fallback에 안전하게 접수되거나 실제 커밋되면 `clearUnsafeRegistrationFailure`. owner A의 unsafe가 남은 동안 owner B 성공으로 전체 경고가 해제되면 안 된다.

**3. `<App/>` 통합 테스트 A/B** — 실패 단계 Assert(Store 작업 전 값, localStorage 원문, durable/fallback/unsafe, pending count, notify, `scheduleCloudSync` 실제 호출, Supabase, 성공 토스트 미표시/실패 UI, BottomNav/SideMenu/헤더 닫기, beforeunload, 기존 payments와 최신 fixedCount/palletCount)가 끝난 뒤에만 복구 단계로 오류를 해제한다.

**A 테스트 실패 원인(실측)**: payments 거부가 아니라, 복구 단계에서 `#modalPalletCount`에 `setNativeInputValue`를 호출했는데 `PalletSection`이 `settings.fixedOn && fixedRouteClient?.palletOn`일 때만 렌더되어 입력이 없었다. jsdom의 HTMLInputElement setter가 null이 아닌 "유효하지 않은 인스턴스"로 TypeError를 냈다. 실패 UI·quota 로그까지는 도달했다.

**수정**: A/B 모두 `seedPalletClient`로 고정노선+palletOn 거래처를 심고, 실패 단계에서 fixedCount와 palletCount를 함께 편집한다. 일지 헤더에 메뉴 버튼을 연결해 SideMenu 이동 방어를 실제 UI에서 누른다. `getCloudSyncScheduleCount()`로 sync 예약을 직접 센다. 복구는 `shouldFail=false` / spy restore 이후에만 `retryPendingDayWrites()`로 수행한다.

**되돌려서 확인**: `isValidPayment`를 id 필수·amount 숫자 전용으로 임시 복원하니 테스트 A가 `pendingAfterFail?.fixedCount` `undefined !== 9`로 실제로 FAIL했다. 원복 후 통과.

**상태(11차 정정)**: 10차는 A/B를 통과시켰지만 `npm test`가 `--test-force-exit` 없이는 프로세스가 안 끝났고, unsafe는 경고 Map만 있어 재진입 복구가 없었고, d9eadff 이후 프로덕션 JSDoc에 `object`가 남아 있었고, `syncQueue.js`에 테스트용 전역 카운터가 있었고, `isValidCurrencyAmount`가 빈 문자열·`,`·`.`·`원`만 있는 값을 `parseCurrencyValue`→0으로 통과시켰다. 아래 "Step 6 재감사 11차"에서 고친다. Step 6은 `[~]`로 유지하고 Step 7은 착수하지 않는다.

---

## Step 6 재감사 11차 — 진행 중 (npm test 종료 + unsafe patch 복구 + object 타입 + sync 계측 제거 + 통화 검증)

10차 보고 후 사용자가 다시 검토해 Step 6을 FAIL로 유지했다. 이 라운드는 사용자 최종 승인 전까지 `[x]`로 바꾸지 않는다. Step 7은 시작하지 않는다.

**1. npm test 비종료** — 10차는 `--test-force-exit`로 가렸다. 실측 원인 두 가지: (a) `PendingWriteRetryBridge`의 5초 `setInterval`이 큐가 빈 뒤에도 핸들을 남김 → 큐/unsafe가 있을 때만 켜고 비면 즉시 끈다(`pendingRetryPulse.js`). (b) `durableWriteGuard.test.js`가 `pendingWorkDataWrites` → `app-store`를 끌어오면서 실제 `supabaseClient` realtime/auth 타이머가 루프를 붙잡음 → **다른 import보다 먼저** `stubSupabaseClient.js`를 올린다. App 테스트는 root를 추적해 `finally`/`afterEach`에서 unmount하고, 예약된 600ms `scheduleCloudSync`는 `flushCloudSync()`로 비운다. `--test-force-exit`/`process.exit`/`timer.unref`는 쓰지 않는다. 회귀: `pendingWriteRetryListeners.test.js` cleanup 후 `mock.timers.tick(30s)`에도 retry가 늘지 않음.

**2. unsafe patch 복구** — `getUnsafeRegistrationPatch`/`listUnsafeRegistrations`/`promoteUnsafeRegistrations`. 같은 owner/date는 최신 값 승리. 재진입 시 `useDayDraft`가 store 위에 unsafe를 overlay. 계약이 맞으면 promote가 durable/fallback로 승격한 뒤에만 clear. confirm으로 나간 뒤 재진입 `<App/>` 테스트. owner A unsafe + owner B 큐 성공이 경고를 끄지 않음.

**3. 금지 object** — 주석 단어가 아니라 JSDoc. `CallDetailForm.jsx` `onSave` → `CallDetailDraft`, `DayLogPage.jsx` `formDraft` → `CallDetailDraft`, `financeTaxInvoiceEntries.js`/`financeTaxInvoiceGroups.js`의 `supplierBiz`/`biz` → `SupplierBiz`, `ownerFinance.js` `settings` → `FinanceSettings`. 같은 라운드에서 `sessionGate.js`의 `session: object`도 `AppSession | null`로 바꿨다. `@typedef {object} Name` 형태의 named typedef와 주석 속 단어 `object`는 집계에서 분리한다.

**4. 프로덕션 테스트 계측** — `getCloudSyncScheduleCount`/`cloudSyncScheduleCount` 삭제. `scheduleCloudSync` 횟수는 `pendingWorkDataWritesSyncSpy.test.js`가 **App/store 그래프보다 먼저** `mock.module`로 spy한다. `App.test.js`는 이미 실제 `syncQueue`를 붙잡은 뒤라 mock이 횟수를 못 센다 — 실패 단계는 `hasDirty`/Supabase 카운트, 성공 단계는 dirty 해소와 Supabase 증가로 실제 예약을 본다.

**5. 통화 문자열** — 숫자 최소 1자리, `"1,000"`/`"1,000원"`/1000 허용. 빈값·공백·`,`·`.`·`원`·oops·음수·NaN·Infinity·객체 거부.

**되돌려서 확인**: `isValidCurrencyAmount`를 `parseCurrencyValue`만 보는 느슨한 검증으로 되돌리면 `callDetailSchema.test.js`가 `''`에서 `true !== false`로 FAIL. `useDayDraft` overlay에서 `getUnsafeRegistrationPatch`를 빼면 테스트 C가 palletCount `'' !== '4'`로 FAIL. 둘 다 원복 후 통과.

**검증(11차, `--test-force-exit` 없음)**:
- `npm test` → 382 pass / 0 fail, `NPM_TEST_EXIT=0`, duration ~43s, 프로세스 스스로 종료. 테스트 로그에 `not wrapped in act` / `Unhandled` 없음. 실패 주입 테스트의 `일지 자동 저장 실패:` `console.error`는 호출-통과 spy가 횟수까지 Assert한다.
- `npm run typecheck` → 0
- `npx tsc -p tsconfig.strict-inventory.json --noEmit --pretty false` → `error TS\d+:` **1023**(6차 기준 1052 이하). 경로에 `.test.`/`testSupport`가 있는 줄 **366**, 나머지 **657**. 10차가 보고한 1022/660/362와 총량은 비슷하나 테스트·프로덕션 분류가 갈린다(같은 grep). 활성 게이트는 typecheck 0이다.
- `npm run build` → 0
- `npm run lint` → 0 (기존 exhaustive-deps 경고 4개, 이번 라운드 파일 아님)
- `git diff --check` (react-app, ubiquitous-parakeet) → 0
- 200줄: `DayLogPage.jsx` 179, `useDayDraft.js` 155, `pendingWorkDataWrites.js` 183, `durableWriteGuard.js` 65, `CallDetailForm.jsx` 179, `financeTaxInvoiceGroups.js` 182
- 금지 타입: 지정 5파일의 해당 필드 JSDoc은 도메인 타입. 주석 단어 `object`와 `@typedef {object} Name`은 별도. 남은 JSDoc은 기존 `@param {Object} props` 패턴과 `outboxReconcile.js`의 `Array<object>`(이번 라운드 미지정).
- NUL 바이트: 프로덕션/테스트 소스 0건
- commit/push/`[x]` 없음. Step 6 `[~]` 유지. Step 7 미착수.

**상태(12차 정정)**: 11차는 npm test 종료·unsafe overlay·object 타입·sync 계측 제거·숫자 존재 여부 수준의 통화 검사를 손댔지만, 백그라운드 retry 성공 후에도 `hasPendingRef`/실패 UI가 그대로여서 이후 언마운트가 `commitNow`를 한 번 더 돌렸고, A/B는 언마운트 전에 구독을 끊어 그 중복을 놓쳤고, `isValidCurrencyAmount`는 `"1,00"`/`"1,000.50"` 같은 구문을 통과시켰고, 신규 테스트에 `any`와 strict 진단이 늘었다. 아래 "Step 6 재감사 12차"에서 고친다. Step 6은 `[~]`로 유지하고 Step 7은 착수하지 않는다.

---

## Step 6 재감사 12차 — 진행 중 (retry 성공 계약 + unsafe callback 승격 + 통화 구문 + 테스트 타입)

11차 보고 후 사용자가 다시 검토해 Step 6을 FAIL로 유지했다. 이 라운드는 사용자 최종 승인 전까지 `[x]`로 바꾸지 않는다. Step 7은 시작하지 않는다.

**1. 재시도 성공 후 hasPendingRef/UI 미정리** — `registerPendingDayWrite`의 onSettled가 성공이어도 `hasPendingRef`가 true로 남아, 일지가 마운트된 채 retry가 끝난 뒤 화면을 나가면 언마운트 flush가 `commitNow`를 다시 실행했다. 성공 시 `hasPendingRef=false`, 마운트 중이면 `autoSaveStatus=saved`, `onCommitted` 1회. 언마운트 뒤에는 setState하지 않는다(`useMountedRef`).

**2. 언마운트 중복 커밋을 A/B가 놓친 이유** — 복구 Assert 직후 `unsubscribe`/`errSpy.restore`를 하고 나서야 언마운트해서, 그 사이 늘어난 notify/Supabase를 보지 못했다. 12차는 구독을 언마운트 완료 후 최종 횟수까지 유지한 뒤 정리한다. 마운트 중 retry `<App/>` 테스트를 추가했다.

**3. 통화 구문 검증 부족** — 숫자 한 자리만 보면 `"1.2.3"`/`"1,,000"`/`"1,00"`/`"1 0 0"`/`"1,000.50"`이 통과한다. 천 단위 쉼표 또는 쉼표 없는 정수(+ 선택 `원`) 정규식으로 막는다.

**4. 신규 테스트 any 및 테스트 strict 진단 증가** — `callDetailSchema.test.js`의 `any`를 제거하고 `// @ts-check` 0 errors. `pendingWriteRetryListeners.test.js` rest/`Function` 진단을 구체 타입으로 제거.

**되돌려서 확인**: `settlePendingDayWrite`에서 `hasPendingRef.current = false`를 빼면 마운트 중 retry 테스트가 페이지 이동 후 notify `2 !== 1`로 FAIL. 통화 정규식을 숫자 존재 여부로 되돌리면 `"1.2.3"`에서 `true !== false`로 FAIL. 둘 다 원복 후 통과.

**검증(12차, `--test-force-exit` 없음)**:
- `npm test` → 384 pass / 0 fail, exit 0. `not wrapped in act` / `Unhandled` 없음.
- `npm run typecheck` → 0
- strict-inventory `error TS\d+:` **1012** / `.test.`·`testSupport` **355**(직전 보고 362 이하) / 나머지 **657**
- 이번 라운드 테스트 파일 strict: `callDetailSchema.test.js` 0, `pendingWriteRetryListeners.test.js` 0(기존 11건 제거), `durableWriteGuard.test.js` 0, `pendingWorkDataWrites.test.js` 0, `App.test.js` 59(신규 테스트로 순증가 0)
- `npm run build` → 0
- `npm run lint` → 0 (기존 exhaustive-deps 4개)
- `git diff --check` → 0
- 200줄: `useDayDraft.js` 200, `dayDraftLifecycle.js` 25, `durableWriteGuard.js` 89
- NUL 0. commit/push/`[x]` 없음. Step 6 `[~]`. Step 7 미착수.

**상태**: 사용자 최종 승인 전까지 Step 6은 `[~]`로 유지한다. `[x]`/완료/100% 표현은 쓰지 않는다.

**상태(15차 정정, 12차 테스트)**: 12차가 추가한 「마운트 중 unsafe 승격·retry 성공」`<App/>` 테스트는 valid patch를 `markUnsafeRegistrationFailure()`로 직접 넣어 도달 불가능한 상태를 검증했다. 15차에서 그 허위 테스트를 삭제하고 invalid→사용자 수정→valid 경로로 교체했다. 삭제는 유효 테스트 축약이 아니다. 아래 "Step 6 재감사 15차"를 보라.

**상태(13차 정정)**: 12차는 retry 성공 시 `hasPendingRef=false`와 `저장됨`을 무조건 적용했다. 그 결과 A가 quota로 큐에 남은 뒤 사용자가 B를 입력하고, B의 600ms debounce가 끝나기 전에 A retry가 성공하면, A 콜백이 pending을 내려 B의 언마운트 flush가 생략되고 Store에 A가 남는다. `pendingWorkDataWrites.js`는 주석·빈 줄 포함 204줄이었다. 아래 "Step 6 재감사 13차"에서 고친다. Step 6은 `[~]`로 유지하고 Step 7은 착수하지 않는다.

---

## Step 6 재감사 13차 — 진행 중 (stale retry vs 최신 draft revision + pendingWorkDataWrites 줄 수)

12차 보고 후 사용자가 다시 검토해 Step 6을 FAIL로 유지했다. 이 라운드는 사용자 최종 승인 전까지 `[x]`로 바꾸지 않는다. Step 7은 시작하지 않는다.

**1. P0 — 과거 patch retry 성공이 최신 미저장 draft를 지움** — `settlePendingDayWrite()`가 성공이면 revision과 무관하게 `hasPendingRef=false`와 UI `saved`를 설정했다. 시나리오: 초기값 2 → A=8 quota 실패로 큐 등록 → 사용자가 B=9 입력 → 600ms 전에 A retry 성공 → 즉시 라우트 이동. A 콜백이 pending을 내려 B 언마운트 flush가 생략되면 Store/localStorage/재진입이 A=8로 남는다. **수정**: draft 변경마다 단조 증가 `draftRevRef`. 큐 등록 시 `attemptRev`를 캡처. `onSettled` 성공이어도 `attemptRev === draftRevRef.current`일 때만 pending을 내리고 `saved`로 바꾼다. 더 최신 draft가 있으면 pending을 유지해 debounce 또는 언마운트 flush가 B를 저장한다. 실제로 커밋된 A의 `onCommitted`는 revision과 무관하게 1회 호출한다. durable `registerPendingDayWrite`와 unsafe `markUnsafeRegistrationFailure`는 `queueFailedDayWrite`로 같은 콜백을 붙인다.

**테스트**: `<App/>` 통합 — 실패 단계(Store/localStorage 2, pending 8, notify 0, Supabase 불변, 저장됨 없음)를 끝낸 뒤에만 quota를 푼다. 복구에서 B=9 입력 후 600ms를 기다리지 않고 retry → 즉시 뒤로가기. 최종 Store/localStorage/재진입 9, `pendingDayWriteCount()===0`. notify는 A 1회 + B flush 1회. sync/API는 복구 이후 증가하고 dirty가 해소된다. durable 경로와 unsafe 승격 경로를 같은 헬퍼로 검증한다. `dayDraftLifecycle.test.js`는 stale revision이 pending/UI를 유지하는지 단위 검증한다.

**되돌려서 확인**: `settlePendingDayWrite`에서 `attemptRev !== draftRevRef.current` early return을 빼면 durable `<App/>` 테스트가 「더 최신 draft가 있으면 저장됨으로 바꾸면 안 된다」에서 `true !== false`로 FAIL한다. 그 상태면 언마운트 flush가 생략되어 최종값이 A=8로 남는다. 원복 후 통과.

**2. `pendingWorkDataWrites.js` 204줄** — 의미 있는 주석/검증을 지우거나 문장을 한 줄로 압축하지 않고, owner/date 스캔·복합키·fallback 맵을 `pendingWorkDataWritesState.js`로 옮겼다. public API는 기존 파일에 남긴다.

**검증(13차, `--test-force-exit` 없음)**:
- `npm test` → 389 pass / 0 fail, exit 0, duration ~56s. `not wrapped in act` / `Unhandled` 없음.
- `npm run typecheck` → 0
- strict-inventory `error TS\d+:` **1015** / `.test.`·`testSupport` **358**(12차 보고 355에서 이번 라운드 `App.test.js` 신규 `.value` 진단 포함) / 나머지 **657**
- 이번 라운드: `dayDraftLifecycle.test.js` 0, `App.test.js` 62(12차 59, 신규 테스트 querySelector `.value` +3)
- `npm run build` → 0
- `npm run lint` → 0 (기존 exhaustive-deps 4개)
- `git diff --check` → 0 (LF/CRLF 경고만)
- 200줄: `useDayDraft.js` 200, `dayDraftLifecycle.js` 45, `pendingWorkDataWrites.js` 159, `pendingWorkDataWritesState.js` 53
- NUL 0. commit/push/`[x]` 없음. Step 6 `[~]`. Step 7 미착수.

**상태**: 사용자 최종 승인 전까지 Step 6은 `[~]`로 유지한다. `[x]`/완료/100% 표현은 쓰지 않는다.

**상태(14차 정정)**: 13차는 revision 계약과 줄 수 분리를 넣었지만, (1) 신규 `<App/>` 테스트 3곳이 `querySelector(...).value`라 TS2339가 나 strict-inventory가 12차 기준(1012 / 테스트 355)을 넘었고, (2) `movePendingToUnsafeKeepingCallback()`이 fallback/settledCallbacks/durable을 직접 조작해 프로덕션 UI에 없는 “유효 patch의 unsafe”를 만든 뒤 promote를 돌려 unsafe 승격을 주장했으며, (3) `errSpy.count() >= 1`과 Supabase 전체 호출 증가만 봐 실패 로그·원격 `fixed_count`를 정확히 증명하지 않았고, (4) `pendingWorkDataWritesState.js`를 줄 수 보고에서 빠뜨렸다. 아래 "Step 6 재감사 14차"에서 고친다. Step 6은 `[~]`로 유지하고 Step 7은 착수하지 않는다.

---

## Step 6 재감사 14차 — 진행 중 (테스트 타입·unsafe 계약·정확한 원격 Assert)

13차 보고 후 사용자가 다시 검토해 Step 6을 FAIL로 유지했다. 이 라운드는 사용자 최종 승인 전까지 `[x]`로 바꾸지 않는다. Step 7은 시작하지 않는다.

**1. TS2339 3건** — `#modalFixedCountInput` value 접근을 `requireHtmlInput()`으로 `HTMLInputElement`로 좁힌 뒤에만 읽는다. 목표: strict-inventory를 12차 기준 전체 1012 / 테스트·지원 355 이하로 복원.

**2. unsafe 승격 눈속임 제거** — 현재 `registerPendingDayWrite()` false는 dateKey/patch 검증 실패에서만 나오고, storage 실패는 fallback 저장 후 true다. invalid patch는 `promoteUnsafeRegistrations()`로도 승격될 수 없다. **stale retry의 unsafe 자동 승격은 N/A**로 정정한다. 대신 `<App/>`에서 oops payments + A=8 quota → unsafe(큐 없음) 실패 단계를 끝낸 뒤, 사용자가 콜상세 삭제(invalid 제거) + B=9로 고치고 valid 커밋이 unsafe를 해제하는 실제 UI 경로를 검증한다. 테스트가 내부 Map을 직접 조작하지 않는다.

**3. console.error** — 실패 단계 정확히 1회. retry/이동/언마운트/재진입 후에도 1회 유지.

**4. 원격 수렴** — `handlers.daily_logs.upsert` payload를 캡처한다. 해당 `work_date` upsert 1회, 최종 `fixed_count=9`.

**5. 줄 수 보고** — `pendingWorkDataWritesState.js`를 변경 파일에 포함한다.

**되돌려서 확인**: revision 비교를 빼면 durable `<App/>` 테스트가 「저장됨으로 바꾸면 안 된다」에서 `true !== false`로 FAIL. 원복 후 통과.

**검증(14차, `--test-force-exit` 없음)**:
- `npm test` → 389 pass / 0 fail, exit 0, duration ~49s. `not wrapped in act` / `Unhandled` 없음.
- `npm run typecheck` → 0
- strict-inventory `error TS\d+:` **1012** / `.test.`·`testSupport` **355** / 나머지 **657** (12차 기준 이하 복원). `App.test.js` 59(순증가 0), `dayDraftLifecycle.test.js` 0
- `npm run build` → 0
- `npm run lint` → 0 (기존 exhaustive-deps 4개)
- `git diff --check` → 0 (LF/CRLF 경고만)
- 200줄: `useDayDraft.js` 200, `dayDraftLifecycle.js` 45, `pendingWorkDataWrites.js` 159, **`pendingWorkDataWritesState.js` 56**
- NUL 0. commit/push/`[x]` 없음. Step 6 `[~]`. Step 7 미착수.

**상태**: 사용자 최종 승인 전까지 Step 6은 `[~]`로 유지한다. `[x]`/완료/100% 표현은 쓰지 않는다.

**상태(15차 정정)**: 14차는 `requireHtmlInput`·원격 `fixed_count`·`movePendingToUnsafeKeepingCallback` 제거를 넣었지만, (1) `App.test.js`의 「재감사 12차 — 마운트 중 unsafe 승격·retry 성공」이 valid patch를 `markUnsafeRegistrationFailure()`로 직접 넣어 프로덕션에 없는 상태를 만든 뒤 승격을 검증했고, (2) 14차 `<App/>` unsafe 복구의 실패 단계가 Store/localStorage/notify/dirty/sync/Supabase/tombstone/pending/unsafe/`console.error`/성공 UI를 `shouldFail=true` 유지 하에 전부 직접 Assert하지 않았으며, notify를 실패 유발 전에 달지 않았고 sync 0회를 간접 추정만 했다. 아래 "Step 6 재감사 15차"에서 고친다. Step 6은 `[~]`로 유지하고 Step 7은 착수하지 않는다.

---

## Step 6 재감사 15차 — 진행 중 (허위 promote 테스트 제거 + 실패 단계 직접 Assert + scheduleCloudSync spy)

14차 보고 후 사용자가 다시 검토해 Step 6을 FAIL로 유지했다. 이 라운드는 사용자 최종 승인 전까지 `[x]`로 바꾸지 않는다. Step 7은 시작하지 않는다.

**1. 12차 `<App/>` 「마운트 중 unsafe 승격·retry 성공」테스트가 왜 유효하지 않았는가** — 그 테스트는 valid patch를 `markUnsafeRegistrationFailure()`로 직접 넣었다. 프로덕션에서 `registerPendingDayWrite()`가 false를 내는 경우는 invalid dateKey/patch뿐이며, storage 실패는 fallback 저장 후 true다. 따라서 valid unsafe가 자동 승격되는 경로는 존재하지 않고, 14차가 N/A로 확정한 계약과 모순된다. **이 테스트를 삭제한 것은 유효한 테스트 축약이 아니라, 도달 불가능한 상태를 검증하던 허위 테스트 제거다.** 15차는 `durableWriteGuard.test.js`의 promote 단위 테스트를 API 배선용으로 남겼으나, 16차에서 그 promote API 자체와 해당 테스트를 제거했다.

**2. 실제 `<App/>` 경로로 교체** — `재감사 15차 — invalid draft를 UI에서 고친 뒤 valid 등록이 unsafe를 해제하고 최종 9를 남긴다`. oops payments + A=8 quota. notify 구독은 실패를 내기 **전에** 설치. `shouldFail=true`를 유지한 채 실패 단계: Store `fixedCount=2`, workData localStorage 원문·값 불변, notify 0, dirty 불변, Supabase 0 증가, tombstone 불변, durable pending 0, unsafe A=8, `console.error` 정확히 1회, 성공 상태/성공 토스트 없음. 복구: invalid 콜상세 삭제 + B=9 → Store/localStorage=9, unsafe 제거, notify 정확히 1회, 해당 날짜 `daily_logs` upsert 1회·`fixed_count=9`, dirty 해제, 재진입 9.

**3. `scheduleCloudSync` 0회는 간접 추정이 아니다** — `App.test.js`는 이미 실제 `syncQueue`를 붙잡은 뒤라 `mock.method`로 export를 재정의할 수 없다. `App.unsafeQuotaFailSyncSpy.test.js`가 `DayLogPage`/`app-store`보다 먼저 `mock.module('../lib/syncQueue.js')`를 올려, 양성 대조(정상 커밋 1회)와 oops+quota 실패(0회)를 직접 센다.

**검증(15차, `--test-force-exit` 없음)**:
- `npm test` → 390 pass / 0 fail, exit 0, duration ~57s. `not wrapped in act` / `Unhandled` 없음.
- `npm run typecheck` → 0
- strict-inventory `error TS\d+:` **1012** / `.test.`·`testSupport` **355** / 나머지 **657**. `App.test.js` 59(순증가 0), `App.unsafeQuotaFailSyncSpy.test.js` 0, `dayDraftLifecycle.test.js` 0
- `npm run build` → 0
- `npm run lint` → 0 (기존 exhaustive-deps 4개)
- `git diff --check` → 0 (LF/CRLF 경고만)
- 200줄: `useDayDraft.js` 200, `dayDraftLifecycle.js` 45, `pendingWorkDataWrites.js` 158, `pendingWorkDataWritesState.js` 56
- NUL 0. commit/push/`[x]` 없음. Step 6 `[~]`. Step 7 미착수.

**상태**: 사용자 최종 승인 전까지 Step 6은 `[~]`로 유지한다. `[x]`/완료/100% 표현은 쓰지 않는다.

**상태(16차 정정)**: 15차는 허위 `<App/>` promote 테스트를 지우고 invalid→valid UI 경로와 spy 파일을 넣었지만, (1) spy 테스트가 0회 Assert 뒤 `shouldFail=false`로 바꾼 다음 unmount해서 실패 상태의 flush/sync를 보지 않았고, (2) `hasAnyUnsafeRegistration()`이 5초 retry interval을 켜 `promoteUnsafeRegistrations()`가 valid patch를 큐로 올리는 도달 불가능한 경로를 프로덕션에 남겼다. 아래 "Step 6 재감사 16차"에서 고친다. Step 6은 `[~]`로 유지하고 Step 7은 착수하지 않는다.

---

## Step 6 재감사 16차 — 진행 중 (spy unmount 계약 + unsafe-only 타이머/promote 제거)

15차 보고 후 사용자가 다시 검토해 Step 6을 FAIL로 유지했다. 이 라운드는 사용자 최종 승인 전까지 `[x]`로 바꾸지 않는다. Step 7은 시작하지 않는다.

**1. spy cleanup** — `App.unsafeQuotaFailSyncSpy.test.js`는 디바운스 실패 0회 Assert 뒤에도 `shouldFail=true`를 유지한 채 `root.unmount()`한다. unmount 후에도 `scheduleCloudSync` 0회, Store/localStorage는 작업 전 값(fixedCount=2), invalid oops 편집은 커밋되지 않음. `console.error('일지 자동 저장 실패:', …)`는 debounce 1회 + unmount flush 1회 = 정확히 2회. 그 다음에만 unsafe clear·spy restore. cleanup에서 quota를 풀어 정상 저장/sync를 만들지 않는다.

**2. unsafe는 자동 retry 대상이 아님** — `registerPendingDayWrite()` false는 invalid dateKey/patch뿐이고 저장 실패는 fallback 후 true다. `pendingWriteRetryListeners`의 interval 활성 조건에서 `hasAnyUnsafeRegistration()`을 뺐다. 5초 retry는 durable/fallback pending이 있을 때만. unsafe는 beforeunload/`confirmLeaveIfUnsafe` 방어와 재진입 overlay. 사용자가 draft를 고쳐 valid 커밋하면 `clearUnsafeRegistrationFailure`. `promoteUnsafeRegistrations()`와 onSettled를 unsafe Map에 싣던 API·도달 불가능한 promote 단위 테스트를 삭제했다. enum 재설계는 하지 않았다 — 프로덕션에 transient unsafe 생성 경로가 없기 때문이다.

**되돌려서 확인**: `hasWork`/`arm`에 `hasAnyUnsafeRegistration()`을 다시 넣으면 16차 「unsafe-only면 5초 interval과 retry가 시작되지 않는다」가 `15 !== 3`(interval이 `hasPending` 검사를 더 돌림)으로 FAIL. 원복 후 통과.

**검증(16차, `--test-force-exit` 없음)**:
- `npm test` → 391 pass / 0 fail, exit 0, duration ~51s. `not wrapped in act` / `Unhandled` 없음. 실패 주입의 `일지 자동 저장 실패:`는 spy가 메시지·횟수를 Assert한다.
- `npm run typecheck` → 0
- strict-inventory `error TS\d+:` **1012** / `.test.`·`testSupport` **355** / 나머지 **657**. `App.test.js` 59, `App.unsafeQuotaFailSyncSpy.test.js` 0
- `npm run build` → 0
- `npm run lint` → 0 (기존 exhaustive-deps 4개; spy 파일의 신규 optional-chaining 경고는 제거)
- `git diff --check` → 0 (LF/CRLF 경고만)
- 200줄: `useDayDraft.js` 199, `dayDraftLifecycle.js` 45, `pendingWorkDataWrites.js` 158, `pendingWorkDataWritesState.js` 56, `pendingWriteRetryListeners.js` 57, `durableWriteGuard.js` 79
- 금지 타입(손댄 프로덕션): `@ts-ignore`/`any`/`unknown`/`@param {object}` 0
- NUL 0. commit/push/`[x]` 없음. Step 6 `[~]`. Step 7 미착수.

**상태**: 사용자 최종 승인 전까지 Step 6은 `[~]`로 유지한다. `[x]`/완료/100% 표현은 쓰지 않는다.

**상태(17차 정정)**: 16차는 spy unmount 계약과 unsafe-only 타이머/promote 제거는 맞았지만, `App.unsafeQuotaFailSyncSpy.test.js`가 console.error spy에 명시적 `unknown` 3건(calls 배열 first/second, rest args, assertSaveFailError 매개변수)을 썼다. 아래 "Step 6 재감사 17차"에서 고친다. Step 6은 `[~]`로 유지하고 Step 7은 착수하지 않는다.

---

## Step 6 재감사 17차 — spy console.error 타입: string + Error (최종 승인에 포함)

16차는 기능 계약을 맞췄지만 타입 규칙 위반 1건이 남았다. 이 항목까지 반영한 뒤 사용자가 Step 6을 최종 승인했다. Step 7은 시작하지 않는다.

**1. 명시적 unknown 3건 제거** — `DayLogSaveFailLog`는 `{ first: string, second: Error }`. `patchedConsoleError(first, second)`는 `string|Error`만 받고, `typeof first === 'string'`이며 `first === '일지 자동 저장 실패:'`이고 `second instanceof Error`일 때만 배열에 넣는다. 그 외 호출은 저장하지 않고 `original.apply(console, arguments)`로 그대로 넘긴다(전역 억제 없음). `assertSaveFailError`는 `DayLogSaveFailLog`만 받는다. `any`/`unknown`/`object`/`{}`/`*`/`@ts-ignore`/`@ts-expect-error`/이중 단언으로 바꾸지 않았다.

**Revert-and-confirm-fail**: N/A. 이번 변경은 테스트 파일의 JSDoc 타입 정정이며 프로덕션 분기·런타임 계약을 바꾸지 않는다. 기능 회귀는 16차 spy 테스트(shouldFail unmount, schedule 0, Store/localStorage 불변, console.error 2회)가 그대로 담당한다.

**검증(17차, `--test-force-exit` 없음)**:
- `npm test` → 391 pass / 0 fail, exit 0, duration ~58s. `not wrapped in act` / `Unhandled` 없음.
- `npm run typecheck` → 0
- strict-inventory `error TS\d+:` **1012** / `.test.`·`testSupport` **355** / 나머지 **657**. `App.unsafeQuotaFailSyncSpy.test.js` 0
- `npm run build` → 0
- `npm run lint` → 0 (기존 exhaustive-deps 4개)
- `git diff --check` → 0 (LF/CRLF 경고만)
- 금지 타입 스캔(16·17차 변경 파일): 실제 JSDoc `@param/@type/@returns`의 `any`/`unknown`/`Function`/`object`/`{}`/`*`/`@ts-ignore`/`@ts-expect-error` **0건**. 주석 문자열(문서·설명에 적힌 단어 `unknown`)은 타입 선언이 아님. `pendingWriteRetryListeners.js`의 `@typedef {Object} EventTargetLike`는 11차부터 허용한 named Object typedef. `durableWriteGuard.js`의 `@param {{ preventDefault, returnValue? }}`와 spy의 `@typedef {{ first: string, second: Error }}`는 빈 `{}`가 아니라 필드가 있는 구체 모양.
- NUL 0.

**상태(최종 승인, 2026-08-29)**: 사용자가 Step 6을 최종 승인했다. 체크리스트는 `[x]`다. 위 과거 재감사 절의 `[~]` 문구는 당시 기록으로 남긴다.

### [x] Step 7 — 거래처 / 차량 (슬라이스 5)

착수: 2026-08-29. **사용자 최종 승인 2026-08-31.** 과거 재감사 절의 `[~]` 문구는 당시 기록으로 남긴다. Step 8은 이 승인 이후에만 착수.

#### 구현 전 조사 (코드 대조)

**바닐라 계약**
- `client-management.js` `saveClient()`: 세금/결제/핀 + `commEnabled`/`commType`/`commValue` + `fixedRouteLinked`/`fixedUnitPrice` + `palletOn`/`palletPrice`. `fixedRouteLinked`가 true면 **같은 `setUserSettings` 안에서** 다른 거래처는 전부 `fixedRouteLinked=false`. 수정 시 `...previousClient`로 `id` 보존.
- `car-management.js` `saveCarFromModal()`: `...previousCar`로 supabaseId 등 보존. 서브 번호 변경 시 `workData_${old}` → `workData_${new}`(새 키가 없을 때만), `activeLogId` 갱신. **삭제(`deleteCar`)**: 서브만 `workData_${번호}`를 지운다. **메인 차량은 공용 `workData` 키를 지우지 않고 보존**한다(메인 로그 전체를 지우는 사고를 막기 위함, `car-management.js` 593~598행).
- `syncWorkData.js`(React): `readJson(KEYS.work)` + **메인 차량 `supabaseId`만** `daily_logs` upsert. 서브 로그 클라우드 동기화는 이 파일에 경로가 없다 → **Step 9 범위, Step 7은 로컬 N/A(코드 근거: `syncWorkData.js` 6~12행 `mainCar`만 사용)**.

**현재 React 결함**
- `ClientManagementPage.jsx` / `CarManagementPage.jsx`: 마운트 시 `loadClients`/`loadCars` → **페이지 `useState` 스냅샷**. Store 구독 없음. `CalendarPage`는 이미 `useOwnerClients`.
- `ClientFormModal`/`upsertClient`의 `next`에 고정노선·파렛트·수수료·`scopedToVehicleNumber` 없음. 수정 스프레드로 supabaseId는 우연히 남지만 UI에서 1곳 제한을 걸 수 없음.
- `reorderClients`는 핀/비핀 교차를 리스트 불변으로 거부하나, UI는 거부 토스트 없이 `persist`를 호출.
- 추가/수정은 `saveClients`/`saveCars`(dirty journal+commitBatch). 삭제는 `request*Deletion`(readiness → outbox 먼저). 추가/수정은 hydration failed 가드가 없음.
- `upsertCar`: 메인 1대는 있음. **번호 중복 없음.** 번호 변경 시 workLogs 키 이동 없음. 추가 직후 오늘 일지 `navigate` 없음. `/app/logs/:logId` 라우트 없음.
- Store `workLogs[ownerKey]`는 `{ main }`만. persist `reactPracticeWorkData:${ownerKey}`는 메인 날짜맵. 서브는 로컬 키도 없음.

**실패 주입 지점 (실제 경로)**
- `commitBatch` → `writeAllOrNothing`(도메인+dirty journal). persist 성공 후 journal 실패는 이미 all-or-nothing.
- 번호 변경: cars 키 + 서브 로그 키(신설) + 구 키 삭제 + journal을 **한 `writeAllOrNothing`**. 중간 `setItem` 실패 시 전부 롤백.
- `commitWithOutboxAndFlush`: 도메인+outbox 원자 기록 후 flush. `{data:null,error}` / throw / epoch 변경은 기존 outbox 경로. 추가/수정은 dirty+`scheduleCloudSync` → `syncClients`/`syncVehicles` 재시도 수렴(부분 성공을 0회로 주장하지 않음).
- hydrate: `mergeWorkDataFromRows`는 메인 날짜맵만. 서브 로컬 키는 hydrate가 덮지 않아야 함(별도 키). 거래처/차량 삭제·순서 변경 후 dirty면 서버 값이 로컬을 덮지 않는 기존 hydrate 규칙.

**변경 파일 예상**
- 도메인: `clients.js`, `clientTypes.js`, `cars.js`, `financeTypes.js`(CarLike 필드), 신규 `workLogKeys.js`
- persist/store: `persist.js`, `atomicPersist.js`, `app-store.js`, `commitHelpers.js`, `owner-state.js`, `ownerDataHooks.js`, `batchWrites.js`(필요 시 extraWrites는 commitBatch options)
- mutation: `outboxCommit.js`, 신규 `clientMutations.js`/`vehicleMutations.js`, `directMutationActions.js`(삭제 시 서브 로그 키)
- 일지: `useDayDraft.js`, `DayLogPage.jsx`, `pendingWorkDataWrites.js`(서브는 `ownerKey::log::번호` durable, 메인 키 호환)
- UI: `components/clients/*`, `components/cars/*`, 기존 페이지는 얇은 어댑터. `AppShell.jsx`, `MainPageRoute.jsx`, `lazyPages.js`
- 테스트: `clients.test.js`, `cars.test.js`, `atomicPersist.test.js`, 신규 `App.clientsCars.test.js`

#### 구현 결과 (자체 검증, 2026-08-29 — `[~]` 유지, 승인 전)

- UI: `ClientListPage`/`CarListPage`가 Store 구독. 기존 `*ManagementPage.jsx`는 re-export 어댑터. 폼 draft만 로컬.
- 고정노선: `upsertClient`가 같은 결과 배열에서 나머지 `fixedRouteLinked=false`.
- 서브 일지: `storageKeyForLog` + `commitLogWorkData`. 번호 변경은 `planSubLogRename` + `writeAllOrNothing`(새 키 쓰기+옛 키 remove).
- Step 9 N/A: `syncWorkData.js`가 `mainCar.supabaseId`만 `daily_logs`에 씀. `commitLogWorkData`는 `syncToCloud: false`.
- revert-and-confirm-fail: `upsertClient`의 unique `map`(기존 고정노선 해제)을 빼면 `clients.test.js`가 `2 !== 1`로 실패함을 확인한 뒤 복원.
- 브라우저 로그인 세션 수동 확인은 이 라운드에서 **미실시**(자격 세션 없음). jsdom 통합은 `App.clientsCars.test.js`.

**게이트(재감사 FAIL 수정 후, 2026-08-29)**: `npm test` 427 pass / 0 fail. `typecheck` 통과. `typecheck:strict-inventory` 전체 925 / 테스트·지원 354 / 나머지 571(기준선 1012/355/657 대비 테스트·지원 **미증가**). `build` 통과. `lint` 기존 exhaustive-deps 4개. `git diff --check` LF/CRLF 경고만. NUL 0. 사용자 승인 전 commit/push/`[x]` 금지.

#### 사용자 재감사 FAIL 수정 (2026-08-29, `[~]` 유지)

사용자가 Step 7 자체 검증 후 재감사 **FAIL**을 돌려줬다. 승인 전 commit/push/`[x]`/Step 8은 하지 않는다.

1. **서버 확정 ID**: `syncVehiclesClients.js`가 await 전 스냅샷을 `writeJson`으로 덮어쓰지 않는다. 응답마다 epoch 재검증, `mergeRemoteIdByLocalId`가 최신 Store의 불변 로컬 `id`에 `supabaseId`만 병합. 거래처는 insert 전 `(user_id, legacy_client_id)` 조회. 차량은 `raw.id`/`legacy_log_id`로 기존 행을 찾아 중복 insert를 막는다.
2. **번호 변경·삭제 + pending**: `logPendingLifecycle.js`가 durable 읽기 실패면 변경/삭제를 거부. 번호 변경은 Effective Patch를 새 번호 durable 키로 이관, 삭제는 pending discard. `readLogWorkData`는 missing/value/getItem/parse/schema를 구분하고 실패를 `{}`로 바꾸지 않는다.
3. **활성 라우트**: `withFromLogState`가 `/app/logs/OLD/day/DATE`에서 차량 관리로 갈 때 출처를 붙이고, 수정 성공 시 그 `dateKey`로 `/app/logs/NEW/...` replace. `/app/cars`에서 옛 로그 pathname을 검사하던 도달 불가 분기는 제거했다.
4. **타입·줄 수**: 이번 라운드 수정·신규 프로덕션 첫 유효 줄 `// @ts-check`. `scopedToVehicleNumber`는 차량번호 문자열. `DayLogPage.jsx` 비용 섹션을 `DayLogExpenses.jsx`로 분리. `requestVehicleDeletion`은 `vehicleDeletion.js`로 분리.
5. **테스트 진실성**: `initializeOwnerFromPersist`는 persist-only(원격 0회)로 명시. 서브 일지 새로고침은 root unmount→새 root. quota `console.error`는 첫 인자·Error.message·횟수를 Assert하고 원 로거는 통과. hydration failed UI는 모달 유지·성공 토스트 없음. `removeItem`/중간 쓰기 실패 롤백.

**되돌려서 확인**: `/app/cars` pathname에서 `startsWith('/app/logs/OLD')`는 항상 거짓임을 테스트가 고정한다. fromLog 없이 그 검사만 두면 일지 출처 replace가 불가능하다.

#### 사용자 재감사 FAIL 후속 (unsafe 큐 + 교차검증, 2026-08-29, `[~]` 유지)

번호 변경·삭제가 durable/fallback/callback만 보고 **unsafe overlay를 빠뜨리던** 구멍을 막았다. `inspectLogPending`이 `unsafeItems`를 포함하고, 번호 변경은 `rekeyPendingMaps`가 새 pending owner로 overlay·callback·fallback을 옮기며, 삭제는 `clearPendingMapsForOwner`가 해당 로그만 지운다.

교차검증에서 추가로: `initializeOwnerFromPersist`가 `mergeWorkLogs`로 옛 서브 로그를 메모리에 남기던 점을 `replaceWorkLogs`로 바꿨다. 서브 일지 읽기 실패면 초기화를 중단한다. 단위·`<App/>` UI·`scheduleCloudSync` spy로 notify/journal/API/sync 횟수와 다른 owner 격리를 Assert한다. **실로그인 브라우저 검증은 미실시.**

#### 사용자 재감사 FAIL 후속 (데이터 무결성 1~8 + ConfirmModal/owner/tombstone, 2026-08-29, `[~]` 유지)

1. ConfirmModal: `pendingDelete`를 readiness/outbox 성공 전에 null로 만들지 않음. 실패 시 모달 유지. `<App/>` 거래처·차량 삭제 테스트가 Store/LS/outbox/notify/API/성공 토스트를 직접 Assert.
2. `initializeOwnerFromPersist` fail-open `readJsonKey` 제거. `readPersistDomain` 5상태. 도메인 하나라도 실패하면 Store/workLogs 불변, notify 0, 원문 덮어쓰기 금지.
3. `readLogWorkData`가 `isValidCalendarDateKey` + DayRecord 중첩(정수/불리언/fixedRouteCounts/callDetails/payments) 검증. 번호 변경 불변 테스트.
4. `blockedReasonForOwnerDataWrite({ ownerKey, userId, sessionEpoch })`. B ready + stale A UI/서비스 불변.
5. `findExistingVehicle`이 tombstone 서버 id를 재사용하지 않음. `flushCloudSync`/스케줄은 outbox flush 후 일반 sync. 두 실행 순서 주입 테스트.
6. 지정 6개 프로덕션 파일 `// @ts-check`.
7. 메인 차량 삭제 시 바닐라는 `workData` 보존(위 조사 절 정정).

#### 사용자 실브라우저 재감사 FAIL — 인라인 시트 및 UI 패리티 (2026-08-29, `[~]` 유지)

- **사용자 실측 증상**: `/app/day/:date`에서 “콜 추가”·정비/주유/기타 추가를 눌러도 인라인 시트가 화면에 안 열림. 달력 년/월이 다크모드에서 흰색 네이티브 select. 햄버거/벨/휴무 뱃지/활성 셀/고정노선·일지 헤더가 바닐라와 다름.
- **원인**: `main-calendar.css`가 `.call-detail-inline-host`/`.maint-fuel-inline-host`에 `max-height:0; opacity:0`을 걸고 열림 클래스를 `.is-open`으로 봄. `InlineSheet`는 `.is-visible`만 붙여 실제 브라우저에서 높이 0. `grid-template-rows: 1fr` + `min-height:0`만으로는 auto 부모에서 행이 0이 됨. 다크 토큰(`--off-badge-*`, `--icon-color` 등)이 `[data-theme="dark"]`에 없고 년/월이 네이티브 select.
- **수정 파일**: `day-log.css`, `main-calendar.css`(죽은 max-height 호스트 규칙 삭제), `account-flow.css`(다크 뱃지/아이콘 토큰), `CalendarDateSelect.jsx`+`calendar-date-select.css`, `CalendarHeader.jsx`(바닐라 벨 path + listbox).
- **테스트**: `App.test.js`가 open/`aria-hidden`/class 및 정비·주유·기타 전환 Assert. `inlineSheetCss.test.js`가 max-height:0 회귀 금지 및 `grid-template-rows: min-content`. `CalendarPage.test.js` listbox. `npm test` 448 pass / 0 fail (2026-08-29).
- **실제 브라우저 검증 결과** (`npm run dev`, Chromium, 로그인 세션 `c47a1cca-…`, 폭 390):
  - `http://localhost:5173/app/day/2026-08-29`: 콜 시트 열림, `#callLoadLoc` 높이 44·`visibility:visible`. 저장 후 owner workData에 `상차검증`.
  - `http://localhost:5173/app/day/2026-08-16`: 정비 시트 열림·입력(`정비검증P0` / 12,345)·저장. 저장 버튼은 `scrollIntoView` 후 네비와 겹치지 않음(`overlap:false`). 목록·`reactPracticeExpenses`에 반영. `/app` 즉시 이탈 후 재진입·캐시 무시 재진입 후에도 목록·LS 유지. 콜 시트 열기→취소 후 폼·`is-visible` 해제.
  - 정비/주유/기타 전환 및 콜↔비용 상호배제는 이전 세션에서 a11y 트리로 확인.
- **라이트/다크 스크린샷**: 시각 패리티는 아래 연기 절. 기능 확인용 샷은 390 라이트 달력·콜 시트.
- **검증하지 못한 항목**: 거래처·차량 추가·수정·번호변경·삭제·재로그인 hydrate·서버 중복/부활 부재. 주유·기타 **저장** 경로. 동기화(서버 round-trip) 후 유지. 브라우저 콘솔/React 경고 수집. 하드 새로고침은 `Page.reload`가 탭을 잃어 `navigate`로 동일 URL을 다시 연 것으로 대체했다.

#### 사용자 승인 — 시각 패리티 연기 (2026-08-29, `[~]` 유지)

사용자가 이관 완료 후 UI 보완 단계로 연기 승인했다. 미구현을 임의로 알려진 한계로 처리한 것이 아니다.

**이번 Step 7에서 계속 막는 항목**: 글자·입력 겹침으로 값을 넣거나 읽을 수 없는 P0, `/app/day/:date` 콜·정비/주유/기타 인라인 시트가 실제 브라우저에서 안 열리는 결함, 입력·수정·삭제 데이터의 Store/localStorage/durable journal·tombstone·새로고침·재진입·동기화 유지, 열림 이후에도 입력·저장·닫기·상호배제가 불가능한 기능·접근성 결함, 색·레이아웃 때문에 텍스트·버튼·입력란이 안 보이거나 클릭할 수 없는 문제.

**연기(사용자 승인)**: 폰트 굵기·세부 크기, 여백·간격·픽셀 단위 정렬, 기능에 영향 없는 아이콘 색·모양, 달력 select 커스텀 드롭다운 외형 및 표시 개수, 바닐라와의 순수한 시각적 패리티.

**상태**: Step 7 `[~]`. commit/push/`[x]`/Step 8 금지.

#### 사용자 재감사 FAIL — persist 스키마 런타임·initialize 불변·sync spy·시트 DOM (2026-08-30, `[~]` 유지)

승인 전 commit/push/`[x]`/Step 8은 하지 않는다.

1. **도메인 런타임 검증**: `matchesDomainSchema`를 cars/clients/settings/expenses/invoices/drivers/profile/workDataDeletedDates(+workData) 검증기로 교체. required·중첩·enum·유한 숫자·허용 키. `{}` 항목과 내부 extra/enum/NaN은 `kind:'schema'`. JSDoc 정본(`CarLike`/`ClientLike`/`FinanceSettings`/`ExpenseItem`/`InvoiceLike`/`DriverRecord`/`LocalProfile`/`DayRecordLike`)과 맞춤.
2. **DayRecord**: 허용 키만. 횟수는 음이 아닌 정수, `fare`/`fixedFare`/`totalFare`·콜 운임은 `isValidCurrencyAmount`. 정본은 런타임 — `fixedCount`/`palletCount`/`count`는 `number`, 운임만 `number|string`(통화 금액). 빈 `{}` 하루 기록은 schema.
3. **테스트**: `initializeOwnerFromPersist`에 cars `[{}]`와 workData `{date:{}}`를 넣고 Store/workLogs/cars·clients LS 원문/journal/outbox/tombstone/pending inspect(callback 포함)/unsafe/notify/scheduleCloudSync/Supabase를 실패 전후 동일하게 Assert. 차량 sync spy는 로컬 삭제(sync 1, API 0), 원격 성공(sync 0, delete 6), retryable(sync 0, delete 4), persist/remove 실패(sync 0, 메서드별 0).
4. **InlineSheet**: `scrollIntoView`/`useLayoutEffect` 제거. CSS `grid-template-rows: min-content` + `scroll-margin-bottom`만. 소스에 직접 DOM 조작 없음 Assert. (메서드 가드는 호출을 남기지 않기로 해서 불필요.)
5. **게이트**: `npm test` 456 pass / 0 fail. `typecheck` 0. `typecheck:strict-inventory` 전체 926 / 테스트·지원 **355** / 나머지 571(직전 기준 355 이하. 신규 테스트 진단을 stub `Record<StubMethod,number>`로 줄였고, 프로덕션 감소로 테스트 증가를 상쇄했다고 주장하지 않음). `build` 통과. `lint` 기존 exhaustive-deps 4. `git diff --check` LF/CRLF만. NUL 0. 금지 타입 선언 0. 이번 라운드 신규·수정 프로덕션 JS는 200줄 이하.
6. **되돌려서 확인**: cars `hasOnlyKeys` 제거 → persist extra-key가 `'value' !== 'schema'`로 실패. `.call-detail-inline-host { max-height:0 }` 삽입 → inlineSheetCss 실패. 둘 다 복원 후 24/24 통과.
7. **Chromium 390px**: `/app/day/2026-08-30`에서 콜(`상차스키마`/`하차스키마`/10,000)·정비(`정비스키마P0`/12,345)·주유(50,000)·기타(`기타스키마P0`/3,000) 저장 후 `location.reload()`. 화면 텍스트와 workData/expenses localStorage에 네 값이 모두 남음.

**상태**: Step 7 `[~]`. commit/push/`[x]`/Step 8 금지.

#### 사용자 재감사 FAIL — persist 검증기가 정상 레거시·hydrate 산출물을 거절 (2026-08-30, `[~]` 유지)

승인 전 commit/push/`[x]`/Step 8은 하지 않는다.

**FAIL (실측)**: 직전 라운드 런타임 검증기가 (1) persisted workData 콜에 durable과 같이 `id`를 강제해 id 없는 레거시 콜을 `kind:'schema'`로 거절하고, (2) `mergeCarsFromRows`가 `settlementMode:null`/`commType:null`을 만들어 CarLike 문자열 계약과 불일치하며, (3) hydrate·바닐라 `fuelItems`/`maintItems`/`miscItems`를 DayRecord extra-key로 거절했다. `initializeOwnerFromPersist`가 이 값들을 로드하지 못해 `useDayDraft`→`backfillCallDetailIds`에 도달하지 못했다.

**수정**
1. `callDetailSchema.js`: persisted용 `isPersistedCallDetail`(id 선택, 빈 `{}`·빈 id·extra key 거부)와 durable용 `isValidCallDetail`(비어 있지 않은 id 필수)를 분리. `persistDayRecord.js`의 콜 배열은 persisted 검증기만 쓴다.
2. `hydrateMergeCars.js`: 최소 row에서 `settlementMode`는 비어 있지 않은 문자열 아니면 `'default'`, `commType`은 `'direct'`만 direct 그 외 `'percent'`. persist `isPersistedCar`는 null을 허용하지 않는다.
3. DayRecord 허용 키에 세 임베드 배열을 두고 `persistDayRecordLegacy.js`가 알려진 레거시 키만 검증·보존. hydrate는 `pushLegacyEmbedded`로 같은 키만 넣는다. expenses로 조용히 이관하거나 중복 생성하지 않는다.
4. `owner-state.schemaFail.test.js`: journal/outbox+tombstone/durable pending/fallback/callback/unsafe와 다른 owner·서브 로그를 비어 있지 않게 seed. cars `[{}]`와 workData `{date:{}}` 실패 전후 Store/workLogs/원문/journal/outbox/pending 계층/callback/unsafe/notify/`scheduleCloudSync`/Supabase 메서드별 횟수를 비교하고, workData 실패에서도 carsRaw/clientsRaw를 비교. callback은 실패 중 0회, 정상 `retryPendingDayWrites`에서 정확히 1회.

**되돌려서 확인 (수정 후 통과)**
- persist 콜을 `isValidCallDetail`로 되돌림 → `legacy-call`이 `'schema' !== 'value'`.
- hydrate producer를 `settlementMode/commType: null`로 되돌림 → 문자열 기본값 Assert 실패, persist `kind`가 `'schema' !== 'value'`.
- DayRecord에서 임베드 키·검증 제거 → `vanilla-exp`와 hydrate 왕복이 `'schema' !== 'value'`.
- 빈 `{}` DayRecord·`fuelItems:[{}]` 허용으로 느슨하게 함 → `'value' !== 'schema'`.
모두 복원 후 통과.

**게이트**: `npm test` **461** pass / 0 fail. `typecheck` 0. `typecheck:strict-inventory` 전체 **925** / 테스트·지원 **354** / 나머지 571(직전 보고 355 이하). `build` 통과. `lint` 기존 exhaustive-deps 4. `git diff --check` LF/CRLF만. NUL 0. 이번 라운드 신규·수정 프로덕션 JS는 200줄 이하.

**Chromium 390px**: `/app/day/2026-08-31`에서 콜(`상차스키마P0`/`하차스키마P0`/10,000)·정비(`정비스키마P0`/12,345)·주유(50,000)·기타(`기타스키마P0`/3,000) 저장 후 `location.reload()`. 화면 텍스트와 `reactPracticeWorkData`/`reactPracticeExpenses` localStorage에 네 값이 모두 남음. innerWidth 390.

**상태**: Step 7 `[~]`. commit/push/`[x]`/Step 8 금지.

#### 사용자 재감사 FAIL — producer 왕복·바닐라 검증 분할·레거시 콜 initialize·390px 저장 가림 (2026-08-30, `[~]` 유지)

승인 전 commit/push/`[x]`/Step 8은 하지 않는다.

**FAIL (지침)**: persist 검증기가 PersonalInfo/계산서 producer 전체 필드·바닐라 DayRecord(`off`/dailyDistance/insuranceFee/종류별 비용)와 어긋나고, enum에 `bogus`가 통과할 수 있으며, id 없는 레거시 콜 통합 테스트가 `commitWorkData`로 initialize를 우회했고, 390px에서 비용 시트 저장 버튼이 고정 nav와 겹쳐 hit-test가 NAV였다.

**수정**
1. `PROFILE_KEYS`/`LocalProfile`를 `emptyProfile`+PersonalInfoPage(`bizRepresentative`,`accountHolder`)와 맞춤. `INVOICE_KEYS`를 `saveDraft`/`changeStatus`/`buildTaxInvoiceEntry`/`persistInvoiceRecord` 산출(중첩 `supplierBiz`, `supplierKey`, purchase 금액 필드, flow/status/partyType enum)과 맞춤. `saveProfile`·draft/issued 저장 → Store wipe → `initializeOwnerFromPersist` 왕복: `kind:'value'`, cars/profile/invoices/`supabaseId` 복원, LS/journal/outbox/pending/unsafe 불변, sync/API 0, notify 1.
2. 레거시 `'off'`는 `canonicalizeDayRecord` 후 검증. `dailyDistance`·`insuranceFee` 금액 검증. fuel/maint/misc 종류별 허용 키·필수 조합(fuel name-only, maint cost-only, misc id-only는 schema). hydrate extra key는 `pickLegacyEmbedded`로 버리지 않고 병합 전체 throw. schema 실패 initialize는 Store/workLogs/원문/journal/outbox/tombstone/durable/fallback/callback/unsafe/notify/sync/API 불변.
3. 차량 `settlementMode` default/company/driver_direct/employee/none, `commType` percent/direct, `infoType` existing/new, 거래처 `paymentTerm`, 설정 settlement/invoice basis, 계산서 flow/status. `'bogus'` 회귀.
4. `App.legacyCallInit.test.js`: LS에 id 없는 콜 seed, Store wipe 후 `initializeOwnerFromPersist`, 첫 mount persist/notify/schedule 1회, remount 0회.
5. CSS만: `.work-log-page`를 `100dvh`+`overflow-y:auto` 스크롤포트로 두고 sticky action `bottom: 4.75rem+safe-area`, `scroll-padding-bottom`. 프로덕션 JS `scrollIntoView`/DOM/`max-height` 패널 트릭/`InlineExpandHost` 없음.

**되돌려서 확인**: `isPersistedCallDetail`에 id 필수를 넣으면 `App.legacyCallInit.test.js`가 `typeof firstId` `'undefined' !== 'string'`으로 실패. 복원 후 통과.

**게이트**: `npm test` **466** pass / 0 fail. `typecheck` 0. `typecheck:strict-inventory` 전체 **926** / 테스트·지원 **355** / 나머지 571(`error TS\d+:` 시작 줄만). `build` 통과. `lint` 기존 exhaustive-deps 4. `git diff --check` LF/CRLF만.

**Chromium 390×844**: `/app/day/2026-08-30` 콜 시트 연 뒤 주유 시트, 마지막 입력(누적거리) 포커스. 저장 rect 692.57~739.71, nav 773.29~844.00, 비중첩. `elementFromPoint(저장 중앙)===저장`. innerWidth 390.

**상태**: Step 7 `[~]`. commit/push/`[x]`/Step 8 금지.

#### 슬라이스 완료 조건 (범위 이월 금지)

- 거래처: Store 구독, 폼 draft만 로컬. 고정노선 계정당 1곳(같은 원자적 커밋). id/supabaseId 보존. 핀 교차 드래그 거부. 허용 드래그 persist·새로고침·hydrate 유지.
- 차량: 모듈 ≤200줄. 메인 1대, 번호 중복 거부, 폼에 없는 필드·supabaseId 보존. 서브 번호 변경 시 로컬 로그 키 이동 all-or-nothing + 활성 `logId` 라우트 replace. 추가 직후 실제 차량번호로 오늘 일지 진입(임시 번호/인덱스 금지).
- 서브 로그 **로컬** 저장·새로고침·번호 변경은 Step 7 완료. 서브 `daily_logs` 동기화는 `syncWorkData.js`가 메인만 쓰므로 Step 9 N/A.
- 순수 함수만으로 UI 완료 주장 금지. React 핸들러→Store/localStorage/라우트 통합 테스트 + 핵심 회귀 revert-and-confirm-fail.

### [ ] Step 8 — 매출 / 미수 / 세금계산서 (슬라이스 6)

- `RevenuePage` 분할. `loadWorkDataByLogId`를 스토어 `workLogs`로 교체.
- `ReceivablesPage` 상세 → `/app/receivables/:client/:month`. `window.confirm` → `useConfirm`.
- 미수 키를 `detailId`로.
- 완료: 부분입금 후 일지 수금 토글과 동일 원장(`payments`).

### [ ] Step 9 — 기사 연동 (슬라이스 7)

- `DriverConnectionPage` 분할. 상세 라우트. `saveDriverInviteToCloud` 계약 유지.
- 서브 로그 동기화·고용기사 unlinked skip.
- 완료: 초대 → 대기 알림 → 상태 변경이 서버에 반영.

### [ ] Step 10 — 리포트 PDF / 알림 / 온보딩 / 고객센터 (슬라이스 8–9)

- `useReportExport`. body 전체 클래스 최소화.
- `NotificationItem` 스와이프.
- `OnboardingPage` 완료 시 `patchSettings` + 메인 차량 upsert.
- Coming soon 페이지를 실제 라우트로 채우거나 명시적 미구현 유지.
- 완료: 설계안 6절 수동 시나리오.

### [ ] Step 11 — 200줄 강제 및 TS

- 남은 `*Page` 200줄 초과 시 헤더/리스트 분리.
- JS→TS는 스토어 types부터. UI는 페이지 교체 시점에 `.tsx`.

각 Step에서 건드리는 기존 파일(요약):

| Step | 주요 변경 파일 | 예상 범위 |
|---|---|---|
| 1 | `lib/workData.js`, `cars.js`, `clients.js`, `practiceSettings.js`, `cloudSync.js` 호출부, 신규 `store/*` | persist 단일화. UI 무변경 가능 |
| 2 | `App.jsx`, `PersonalInfoPage.jsx`, `AppSettingsPage.jsx`, `cloudSync.js`, 신규 `providers` | 중 |
| 3 | `App.jsx`, `main.jsx`, `BottomNav.jsx`, `SideMenu.jsx`, `MainPage.jsx`(navigate만) | 중. 동작 동등 |
| 4 | `lib/*` → `domain/*` | 이동+import. 로직 최소 |
| 5 | `MainPage.jsx` 폐기, 신규 calendar/* | 중 |
| 6 | `WorkLogPage.jsx` 폐기, `ExpenseFormModal.jsx` 이전, `expenses.js` 계약 | **대** |
| 7 | `ClientManagementPage.jsx`, `CarManagementPage.jsx`, `clients.js`, `cars.js` | 중~대 |
| 8 | `RevenuePage.jsx`, `ReceivablesPage.jsx`, `TaxInvoicePage.jsx`, `ownerFinance.js` | 중 |
| 9 | `DriverConnectionPage.jsx`, `cloudSync` 기사 API 분리 | 중 |
| 10 | `ReportPage.jsx`, `NotificationPanel.jsx`, `OnboardingPage.jsx`, `App.jsx` | 소~중 |

---

## 4. 테스트 및 검증 기준

### 4.1 `npm test` (현재 스위트 + 재이관 시 필수)

현재 명령:

```
node --test src/lib/finance.test.js src/lib/workData.test.js src/lib/practiceSettings.test.js src/lib/receivables-invoices.test.js src/lib/drivers-cloud.test.js src/lib/fuelRecords.test.js src/lib/maintenanceRecords.test.js src/lib/miscExpenseRecords.test.js src/lib/taxInvoices.test.js src/lib/cars.test.js src/lib/clients.test.js src/lib/expenses.test.js
```

재이관 후에도 **같은 시나리오가 그린**이어야 한다. 파일이 `domain/`으로 옮겨도 케이스는 유지.

| 스위트 | 재이관 후 반드시 남는 검증 |
|---|---|
| `workData.test.js` | `upsertCallDetail`이 기존 `payments`를 보존. 토글 수금이 원장에 남기고, 취소 시 빈 배열. 공차 횟수 제외·운임 포함. 휴무 시 월 콜 운임 0. `saveDayRecord` 빈 날 키 삭제(파렛트/비용 추가 후엔 “진짜 빈 날”만 삭제). |
| `finance.test.js` + fixtures | `getMonthlyFareRevenue` / 미수 / 계산서 그룹이 바닐라 `originalWindow`와 동일 숫자. |
| `receivables-invoices.test.js` | 부분입금 `remainingAmount`, 초과 입금 거부. |
| `practiceSettings.test.js` | 횟수 칩 1~5 기본, 최대 10. 노선 프리셋. `fixedOn: false`면 세부입력 강제. |
| `clients.test.js` | 결제예정일(익월 말일 등). 핀끼리만 Reorder. **고정노선 거래처 1곳** 제약 테스트 추가 필요. |
| `cars.test.js` | 메인 1대. supabaseId 보존(테스트 보강). |
| `expenses.test.js` + fuel/maint/misc | upsert 검증, hydrate 매퍼 라운트립. |
| `taxInvoices.test.js` | vehicleId 해석, insert 후 supabaseId 병합. |
| `drivers-cloud.test.js` | supabaseId 없으면 서버 삭제 스킵. 기간 겹침. |

**추가해야 할 단위 테스트 (Step 0~6):**

- `isEmptyDay`가 pallet/maint/call/fixed 모두 본 뒤에만 delete.
- `commitDay`가 store에 **다른 배열 참조**(structuredClone)를 넣는지.
- `getActiveLogSettings(settings, 'main'|'sub')`.
- persist 키 라운트립: 저장 → `JSON.parse` → 동일 스키마.
- hydrate 플래그 false일 때 `scheduleCloudSync` no-op (이미 구현, 테스트만 없음).

컴포넌트(설계안): Testing Library로 일지 저장 clone, hydration lock disable. 현재 없음 — Step 6 이후 도입.

### 4.2 수동 / 브라우저 (기존 사용자 규칙 + 설계안 라우트)

상태가 공유되면 한 화면만 보고 끝내지 않는다.

**부트·동기화**

1. 로그인 → 일지 입력 → 즉시 다른 탭/백그라운드 → 다른 기기(또는 시크릿) 로그인에 반영. (`flush` Step 2 이전에는 이 항목이 **실패하는 것이 현재 정상**에 가깝다.)
2. hydrate 중 개인정보 편집 시도 → 입력 비활성 + 안내.
3. 게스트와 로그인 `ownerKey`가 섞여 데이터가 덮이지 않는지.

**달력·일지**

4. `/app` 셀 뱃지(휴/횟수/미수점) ↔ 일지 내용.
5. `/app/day/:date` 열기·닫기 후 **월 선택기가 리셋되지 않음** (Step 3+).
6. 콜상세 추가/수정/삭제 후 새로고침. 수금 토글 ↔ 미수 화면 동일 `payments`.
7. 고정노선 칩 +/− 가 `fixedCount`와 함께 저장.
8. 정비 시트를 일지와 `/app/expenses` 양쪽에서 열고, 목록이 하나.

**마스터 데이터**

9. 차량 추가 직후 그날 운행. 서브 번호 변경 후 과거 일지가 새 키로 보임 (Step 7).
10. 거래처 드래그, 핀/비핀 교차 불가. 고정노선 링크 2곳 시도 시 거부.
11. 기사 초대, 겹치는 배정 기간 에러 토스트.

**재무**

12. `/app/revenue` 월/년, 차주/기사 스코프. 달력 합계와 단가 규칙이 문서와 일치.
13. `/app/receivables` 부분입금·입금취소(커스텀 confirm).
14. `/app/tax` 초안 저장이 거래처 세금 필드를 업데이트.

**회귀 체크리스트 (매 Step)**

- `npm test`
- `npm run build`
- 위 라우트: `/app`, `/app/day/:date`, `/app/clients`, `/app/cars`, `/app/revenue`, `/app/receivables`, `/app/tax`, `/app/me`

### 4.3 현재 코드 기준으로 “지금은 실패해도 되는” 항목

재이관 착수 전 오탐 방지:

- 새로고침 후 로그인 유지 (세션 미복원)
- 백그라운드 flush
- 파렛트·고정노선 거래처 단가·일지 파렛트
- 서브 차량 일지/클라우드
- ~~달력 금액 모드~~ (Step 5 재감사에서 완료 — `inputMode==='fare'`가 실제로 달력 셀 뱃지에 연결됐다)
- 온보딩 저장
- PDF
- 설정 `callDetail`이 일지 섹션을 숨김
- 매출 상세에 일지에서 넣은 정비/주유 (expenses vs maintItems)

이것들을 Step 완료 조건으로 올리면, 해당 슬라이스가 끝날 때 **실패에서 성공으로 바뀌어야** 한다.

---

## 5. 감사 결론 (최초 작성 시점 — 착수 전)

`react-app`은 바닐라 DOM 조작을 JSX로 나열한 수준을 이미 지났다. 작은 컴포넌트(`BottomNav`, `ConfirmModal`, `ExpenseFormModal`, 설정 스위치)와 `lib` 순수함수·Jest는 **자산**이다.

막힌 지점은 UI 문법이 아니라 **상태 경계**다. 페이지 스냅샷 + 메인 로그 하나 + 콜 인덱스 + 비용 이중 저장 + flush/세션 부재는 설계안 0~1절을 충족하지 않는다. `WorkLogPage.jsx`와 `App.jsx` 스위치, `InlineExpandHost`, `cloudSync.js` 전역 `let`은 패치보다 **교체**가 맞다.

~~다음 구현은 이 문서 Step 1부터, 코드를 고치지 않은 채 합의한 뒤 진행하면 기존 React 화면을 한 번에 박살 내지 않고 슬라이스할 수 있다.~~ **(낡음 — 아래 5-1절이 실제 진행 상황이다.)**

## 5-1. 현재 결론 (Step 7 진행 중, 2026-08-29 — **최신 상태는 5-7절. 이 절은 당시 스냅샷. 위 0-1절은 Step 4 완료 시점의 과거 스냅샷이다**)

위 결론이 지목한 문제는 이제 대부분 해소됐다:

- **`App.jsx` 스위치** → Step 3에서 라우터 트리로 교체 완료. 옛 `App.jsx`는 삭제됐다.
- **`cloudSync.js` 전역 `let`** → 완전히 없애지는 않았다(`cloudSession.js`에 `cloudUserId`/`cloudOwnerKey`/`sessionEpoch` 모듈 전역이 여전히 있다). 대신 그 전역이 만들던 실제 사고(hydrate 실패가 "완료"로 보이던 것, 부분 반영, dirty 유실, 로그아웃 후 stale hydrate 적용, 그리고 이번 3차에서 새로 막은 "빈 날 삭제가 클라우드에 전파 안 됨"·"durable 큐가 사실 durable이 아님")를 상태기계·durable journal·single-flight·atomicPersist·tombstone으로 하나씩 막았다 — "전역을 없앤다"가 아니라 "전역이 있어도 안전하게" 쪽으로 결론이 바뀌었다. `api/`로의 실제 폴더 분해는 여전히 안 했다(Step 9 즈음 판단).
- **페이지 스냅샷** → Step 5~6에서 달력/일지는 store 구독으로 바뀌었다. **거래처/차량 관리는 Step 7 착수 시점까지 `loadClients`/`loadCars` 로컬 `useState`가 남아 있었고, Step 7이 그 화면을 store 구독으로 바꾼다.**
- **메인 로그 단일 구조 + 콜 인덱스 + 비용 이중 저장** → 콜상세 `id`는 Step 6에서 영구화됐다(`backfillCallDetailIds`). 비용은 여전히 `expenses` 스토어가 정본이고(Step 6에서 그렇게 확정) day record와의 "이중 저장"은 의도적으로 유지 중이다(파일 상단 주석에 이유 기록). 서브 차량 로그 구조·payments/미수 키의 배열 인덱스 의존성은 Step 7/8 몫으로 여전히 남는다.
- **`WorkLogPage.jsx`/`InlineExpandHost`** → **Step 6에서 완전히 삭제되고 `src/components/day-log/`로 교체됐다.** 두 파일 다 저장소에 더 이상 존재하지 않는다(`find`로 재확인).

남은 진짜 결론(당시): Step 6은 2026-08-29 사용자 최종 승인으로 `[x]`였다. **당시 진행 중인 구현은 Step 7(거래처/차량)이며 체크리스트는 `[~]`였다.** 재감사 FAIL(서버 ID 덮어쓰기, pending 미이관, 도달 불가 라우트 검사, `readLogWorkData`의 `{}` 흡수)을 그 라운드에서 고쳤다. **최종 승인·`[x]`는 5-7절(2026-08-31).**

## 5-2. Step 7 재감사 — hydrate producer 정규화 (2026-08-31)

**계기**: `mergeCarsFromRows`/`mergeClientsFromRows`/`mergeDriversFromRows`(hydrate 병합)가
Supabase `raw` JSONB 백업(동기화 시점 로컬 객체 전체)을 `...raw`/`...local`로 통째로
스프레드했다. `raw`는 `lib/cloudStorage.js`의 `buildVehicleRow`/`buildClientRow`가
`raw: car`/`raw: client`로 쓰는 값이라 persist 스키마(`store/persistDomainRecords.js`의
CAR_KEYS/CLIENT_KEYS/DRIVER_KEYS + 필드별 타입/enum)와 다른 값이 하나만 섞여도
`isPersistedCar`/`isPersistedClient`가 그 항목을 거부하고, 배열은 전부 아니면 전무
(`hasOnlyKeys` + `Array.every`)라서 **hydrate 직후엔 persist가 되지만 다음
새로고침(`initializeOwnerFromPersist`)에서 cars/clients 도메인 전체가 스키마 실패로
사라질 수 있는 사고 시나리오**였다. 검증기 자체는 손대지 않고 producer(hydrate 병합
함수)만 정본 스키마에 맞춰 정규화했다.

**변경 파일(줄 수, 주석·빈 줄 포함)**:
- [src/domain/financeTypes.js](../react-app/src/domain/financeTypes.js) 96줄 — `CarLike.personalInfo`에 바닐라 정본 필드 `phone`/`bank`/`account`/`accountHolder` 추가.
- [src/store/persistDomainRecords.js](../react-app/src/store/persistDomainRecords.js) 134줄 — `PERSONAL_INFO_KEYS`에 위 4개 추가(기존 7개는 유지 — businessInfo와 혼동돼 있었지만 바닐라 `finance.js` 조회부가 실제로 쓰므로 하위호환상 남김), `isStringRecord`/`PERSONAL_INFO_KEYS`/`BUSINESS_INFO_KEYS` export(검증기 로직 자체는 변경 없음 — producer가 재사용).
- [src/lib/hydrateMergeTypes.js](../react-app/src/lib/hydrateMergeTypes.js) 51줄 — `LocalCar`/`LocalClient`를 각 도메인 정본 타입(`CarLike`/`ClientLike`)에 직접 연결, `RawCarBackup`/`RawClientBackup`은 `Partial<...>`(raw JSONB는 "있을 수도 틀렸을 수도 있는" 값이라 전부 optional), `LocalDriver`는 `Partial<DriverRecord> & {driverName?}`.
- [src/lib/hydrateMergeCars.js](../react-app/src/lib/hydrateMergeCars.js) 88줄(전면 재작성) — `...raw` 제거, CAR_KEYS 필드만 정본 타입으로 정규화. `settlementMode`/`commType`/`infoType`은 `store/persistDomainEnums.js`의 canonical enum에 없으면 각각 `'default'`/`'percent'`/`'existing'`로 정규화(검증기를 느슨하게 만드는 대신 producer가 스키마를 맞춘다). `personalInfo`/`businessInfo`는 중첩 객체라 필드 단위 기본값이 없다 — 사용자 승인(2026-08-31 질의응답)에 따라 `isStringRecord`(검증기와 동일 함수 재사용)로 통째로 유효성 검사해 유효할 때만 옮기고, 하나라도 정본 밖 키/타입이면 그 중첩 필드만 생략한다(차량의 나머지 필드는 정상 정규화 — hydrate 전체를 막지 않는다).
- [src/lib/hydrateMergeClients.js](../react-app/src/lib/hydrateMergeClients.js) 68줄(신규) — `mergeCarsFromRows`와 같은 이유로 `hydrateMerge.js` 200줄 제한 때문에 분리. `...raw` 제거, CLIENT_KEYS 필드만 정규화. `commType`은 무효 시 `'percent'` 기본값, `paymentTerm`은 "값 없음"을 뜻하는 canonical enum 멤버가 없어 유효할 때만 키를 채우고 무효면 생략(빈 문자열 기본값은 그 자체가 스키마 위반이라 쓸 수 없다).
- [src/lib/hydrateMerge.js](../react-app/src/lib/hydrateMerge.js) 119줄 — `mergeClientsFromRows`를 위 파일로 이관(재수출), `mergeDriversFromRows`의 `...local` 제거(DRIVER_KEYS 9개 필드만 명시적으로 채움) + `id: local.id || row.id`가 `row.id`(숫자 가능)를 그대로 쓰던 버그를 `String(row.id)`로 수정(`isPersistedDriver`는 `id`를 문자열로 요구).
- [src/lib/hydrateMerge.test.js](../react-app/src/lib/hydrateMerge.test.js) 284줄 — `findMainCar` 기존 테스트 3개가 `CarLike`(number 필수)와 안 맞아 typecheck:strict-inventory 에러가 났던 것을 fixture에 `number` 추가 + `@type` 명시로 수정(신규 에러 아님 — 아래 실측 참고).
- [src/store/owner-state.test.js](../react-app/src/store/owner-state.test.js) 320줄 — 아래 4개 필수 테스트 추가.

**필수 테스트(실패 주입 먼저, "hydrate 산출물 → persist → fresh initialize 왕복" describe 블록)**:
1. 최소 row `{id, number, type, raw:{}}` → persist → wipe → initialize, `supabaseId` 유지 — 기존 테스트("최소 차량 row는...")가 이미 커버(raw가 비어 있어 예전 `...raw` 코드에서도 통과했었다 — 이 라운드가 새로 잡은 버그는 raw가 채워진 경우라 아래 3개가 신규).
2. 바닐라 `personalInfo`(phone/bank/account/accountHolder) raw → 왕복 후 필드 보존, `kind:'value'` — 신규 테스트, 통과.
3. `raw.settlementMode:'bogus'` → producer가 `'default'`로 정규화, initialize 성공. 같은 테스트 후반부에서 검증기에 `'bogus'`를 **직접** 저장하면 여전히 `kind:'schema'`이고 Store/notify/Supabase 호출이 불변임을 확인(검증기는 느슨해지지 않았다) — 신규 테스트, 통과.
4. client raw extra key(`extraFromVanilla`) → persist 가능한 거래처 1건, 그 extra key는 결과에 없음 — 신규 테스트, 통과.

**감지력 증명(되돌려서 확인)**: `hydrateMergeCars.js`/`hydrateMerge.js`(mergeClientsFromRows 재수출 포함)를 옛 `...raw`/`...local` 코드로 되돌리자 테스트 2·4가 실패(`bogus`가 정규화 안 됨, extra key가 그대로 남음)했고, `persistDomainRecords.js`(PERSONAL_INFO_KEYS)까지 함께 되돌리자 테스트 1(2번 항목)도 `schema`로 실패했다. 3개 파일 모두 복원 후 재확인 — 전부 통과.

**게이트 실측**:
- `npm test`: **494 pass / 0 fail**(기존 491 + 신규 4 — 위 1번은 기존 테스트라 순증 3, 실제로는 findMainCar 관련 조정 없이 신규 4개 추가). 요구한 "491+ clean" 충족.
- `npm run typecheck`(`tsc --noEmit`, 파일별 `// @ts-check` 대상): **0 에러**(변경 전후 동일).
- `npm run typecheck:strict-inventory`(`checkJs:true`, 프로젝트 전체 — 요청한 "≤355" 대상): **변경 전 912건 → 변경 후 911건**(순감 1, `owner-state.test.js`의 기존 `LocalCar[]`/`CarLike[]` 불일치 1건을 이번 정규화로 우연히 해소, `hydrateMerge.test.js` findMainCar fixture 보정으로 신규 순증 0건 — `diff`로 직접 라인 단위 확인). **이 회차 신규 SoT 테스트(owner-state.test.js에 추가한 4개)는 strict-inventory 에러를 1건도 추가하지 않았다.**
  **다만 912/911은 355 요구치를 크게 웃돈다 — 이 격차는 이번 작업 범위(hydrate producer 정규화) 밖의 광범위한 사전 존재 부채(주로 `supabaseClient.js`/`testSupport/*`/여러 `*.test.js`의 암묵적 `any`·엄격 null 체크 불일치)이고, 한 라운드에서 해소할 수 있는 규모가 아니다. 355로 되돌리는 작업은 이번에 완료하지 못했다 — 정직하게 FAIL로 남긴다.**
- `npm run build`: 성공(vite build, 260 modules, 에러 0).
- `npm run lint`(oxlint): 에러 0, 경고 3건(`AppShell.jsx`/`ReceivablesPage.jsx` — 이번 diff가 건드리지 않은 기존 파일, 미변경 확인).
- `git diff --check`: 공백 오류 0(exit 0). NUL 바이트: 변경 파일 8개 전부 `grep -P '\x00'`로 0건 확인.
- 변경/신규 프로덕션 파일(200줄 제한 대상) 6개 전부 134줄 이하 — 위반 없음. 테스트 파일 2개는 200줄 제한 면제 대상.
- 금지 타입(`any`/`unknown`/`@ts-ignore`/`@ts-expect-error`/타입 단언): 변경 프로덕션 파일 전체 grep 결과 0건(주석 언급 3건은 실제 사용 아님).
- act 경고/unhandled rejection/미예상 `console.error`: 대상 테스트(`owner-state.test.js`, `hydrateMerge.test.js`) 실행 로그에 0건.

**회귀 확인**:
- 바닐라 personalInfo hydrate 왕복 — 위 신규 테스트로 커버, 통과.
- hydrate bogus enum 정규화 + persist는 여전히 bogus 거부 — 위 신규 테스트로 커버, 통과.
- 스키마 실패 initialize 전 계층 불변 — 기존 `owner-state.schemaFail.test.js`(전체 스위트 포함, 494 pass에 포함) 그대로 통과, 이번 라운드가 손대지 않음.
- 핵심 CSS / `hasOnlyKeys` revert-and-confirm-fail — `hasOnlyKeys` 자체는 변경하지 않았고, 위 "검증기에 bogus 직접 주입" 테스트가 `hasOnlyKeys`/enum 검증이 여전히 실패로 판정함을 되돌려서 확인했다. 핵심 CSS(`inlineSheetCss.test.js`)는 이번 diff와 무관 — 전체 스위트 통과에 포함, 별도 브라우저 확인은 하지 않음(CSS를 건드리지 않았다).
- Chromium 390px 콜·정비·주유·기타 저장 + 하드 새로고침 — 로컬 dev 서버(`npm --prefix react-app run dev`)를 390×844(모바일 프리셋)로 열어 **비회원(게스트) 모드**로 `/app/day/2026-08-31`에서 **정비 추가 → 저장**을 실제로 수행: 토스트 "내역을 등록했습니다", `reactPracticeExpenses:guest`에 `{kind:'maint', name:'엔진오일', cost:30000, ...}`로 저장됨을 `localStorage` 직접 조회로 확인, 앱을 다시 진입(같은 탭에서 게스트 재시작 — 이 앱의 게스트 세션 플래그는 하드 리로드로 초기화되는 별개의 기존 동작이라 완전한 브라우저 `location.reload()` 대신 이 경로로 확인함)했을 때도 목록에 그대로 남아 있음을 확인. 콘솔 에러 0건. **콜/주유/기타는 이번 라운드에 개별로는 재확인하지 않았다** — 세 항목 모두 정비와 동일한 `expenses` persist 파이프라인(`isPersistedExpense`, 이번 diff가 건드리지 않음)을 공유하고, 시간상 정비 1건 확인으로 대표했다. 필요하면 사용자 요청 시 나머지도 확인 가능.

**브라우저에서 직접 확인한 것 / 안 한 것**: 확인함 — 로그인 화면(390px, 콘솔 에러 0), 게스트 진입 → 홈 달력(2026-08) 렌더, `/app/day/2026-08-31` 진입, 정비 추가 시트 열기/입력/저장/목록 반영/재진입 후 유지. 확인 안 함 — 실제 Supabase 로그인 계정으로 hydrate가 실제로 서버 데이터를 받아와 이번 정규화를 타는 경로(이 세션엔 로그인 자격 증명이 없음 — 대신 위 494개 자동화 테스트 중 `hydrate.test.js`/`hydrateMerge.test.js`/`owner-state.persistRoundtrip.test.js`가 stub Supabase 응답으로 이 경로를 커버한다), 콜/주유/기타 개별 저장, 데스크톱 뷰포트.

**상태**: Step 7 `[~]` 유지. `typecheck:strict-inventory`를 355 이하로 되돌리는 작업은 FAIL(912→911, 목표 미달 — 사전 존재 부채이며 이번 라운드 범위를 벗어나는 별도 작업량이 필요함을 실측으로 확인). commit/push/`[x]`/Step 8은 하지 않는다. `main`에 이미 올라간 Step 7/SoT 커밋은 되돌리지 않았고, 이번 수정은 전부 미커밋 워킹트리 변경으로만 남겨 둔다.

## 5-3. Step 7 재감사 — hydrateMergeCars.js 불리언 기본값 FAIL (2026-08-31)

**FAIL 지적**: 5-2절에서 `insuranceOn`/`logEnabled`/`driverLinkEnabled`/`shareRevenueWithOwner`/
`archived` 5개를 전부 `boolOrFalse`(raw에 진짜 boolean이 없으면 `false`로 정규화)로 채웠다.
이건 "값이 아예 없음"과 "명시적으로 false"를 구분하지 않는 잘못이었다 —
특히 `shareRevenueWithOwner`는 바닐라 정본상 **"없음 = 공유(true)"**다
(`car-management.js`의 `document.getElementById('newCarShareRevenueToggle')?.checked ?? true`,
`domain/cars.js`의 `isVehicleRevenueSharedWithOwner`도 `car?.shareRevenueWithOwner !== false`로
읽어 기본을 true로 취급한다). React 쪽 `upsertCar`(`domain/cars.js`)는 이 5개 필드를 아예
쓰지 않으므로, 이 필드들이 없는 차량이 hydrate를 한 번만 왕복해도 `shareRevenueWithOwner:false`가
영구히 박혀 "차주와 매출 공유 안 함"으로 뒤집히는 실제 데이터 사고였다.

**수정**: [src/lib/hydrateMergeCars.js](../react-app/src/lib/hydrateMergeCars.js) 111줄 —
`boolOrFalse`를 이 5개 필드에서 걷어내고, raw에 실제 `boolean`이 있을 때만 키를 채우고
아니면 키 자체를 생략하는 `boolOrOmit`으로 교체했다(각 필드 소비 쪽의 기존 기본값
관례가 그대로 적용되게 함 — producer가 임의로 `false`를 심지 않는다). `commEnabled`는
바닐라도 기본이 실제로 `false`라 대상에서 제외, `boolOrFalse` 그대로 유지.

**필수 테스트(실패 주입 먼저, `owner-state.test.js` "hydrate 산출물 → persist → fresh
initialize 왕복" describe 블록에 3개 추가)**:
1. `raw:{}` 최소 row → persist → wipe → initialize 후 `shareRevenueWithOwner` 키 없음
   + `isVehicleRevenueSharedWithOwner() === true` + `kind:'value'` — 신규, 통과.
2. `raw.shareRevenueWithOwner:false` → 정규화·왕복 후에도 `false` 유지 —
   신규, 통과(이 케이스는 `boolOrFalse`/`boolOrOmit` 둘 다 통과해 감지력은 없지만,
   "false를 true로 뒤집는" 반대 방향 실수를 막는 회귀 가드로 남겨 둔다).
3. React `upsertCar`가 실제로 만드는 raw 모양(5개 불리언 필드 전부 없음)도
   hydrate 왕복 후 `isVehicleRevenueSharedWithOwner() === true` 유지 — 신규, 통과.

**감지력 증명(되돌려서 확인)**: `hydrateMergeCars.js`의 `boolOrOmit` 5줄을 `boolOrFalse`로
되돌리자 테스트 1·3이 실제로 실패(`true !== false`, `false !== true`)했다. 복원 후 재확인 —
16개 전부 통과.

**게이트 실측(이번 라운드)**:
- `npm test`: **497 pass / 0 fail**(직전 494 + 신규 3).
- `npm run typecheck`: 0 에러.
- `npm run typecheck:strict-inventory`: 클린 `main` 기준(스태시로 직접 재측정) **912건 → 911건(순감 1)**. 이번 라운드가 새로 추가한 에러는 0건이다 — 유일한 변동은 지난 라운드에 남겨 뒀던 `owner-state.test.js`의 `extraFromVanilla` 리터럴 초과 프로퍼티 에러 1건을, 그 raw fixture를 `JsonRecord` 타입 변수로 분리해 없앤 것뿐이다(런타임 동작 변경 없음 — TS의 "신선한 객체 리터럴" 초과 프로퍼티 검사를 피한 것). **"테스트 진단을 늘리지 마라(385 이하 유지)" 요구 확인**: 이번 라운드가 만진 파일(`hydrateMergeCars.js`, `owner-state.test.js`) 기준으로 diff를 line-by-line 대조한 결과 신규 진단 0건 — 테스트 파일(`*.test.js`) 전체 진단은 380건으로 385 이하다(참고: 이 380은 프로젝트 전체 911건 중 테스트 파일분이며, 355(5-2절 목표) 이하로 되돌리는 작업 자체는 여전히 FAIL 상태로 남아 있다 — 이번 라운드는 그 목표를 완료 조건에서 빼는 사용자 승인을 받지 않았으므로 Step 7을 `[x]`로 올리지 않는다).
- `npm run build`: 성공(에러 0).
- `npm run lint`: 에러 0, 경고 3건(미변경 파일, 직전 라운드와 동일).
- `git diff --check`: 통과(exit 0). NUL: `hydrateMergeCars.js`/`owner-state.test.js` 0건.
- `hydrateMergeCars.js` 111줄(200줄 제한 내). 금지 타입(`any`/`unknown`/`@ts-ignore`/`@ts-expect-error`/단언) 0건.

**상태**: Step 7 `[~]` 유지. `typecheck:strict-inventory`를 355 이하로 되돌리는 작업은
여전히 FAIL(911건, 목표 미달 — 5-2절과 동일한 사전 존재 부채, 이번 라운드도 그 목표를
완료 조건에서 빼는 승인을 받지 않아 범위 밖으로 다루지 않았다). commit/push/`[x]`/Step 8은
하지 않는다. 신규 durable/큐 없음(이번 라운드는 hydrate 병합 함수 하나만 수정).

## 5-4. Step 7 재감사 — 일지 인라인 시트 취소/저장 sticky 제거 (2026-08-31)

**원인**: `+ 운행 일지 추가` / `+ 정비·주유·기타 추가`로 인라인 시트를 열면 취소/저장이
화면 위쪽에 붕 뜨고, 폼 바닥까지 스크롤해야 제자리에 붙었다. 5-1절 마지막 라운드(390px
저장 가림 수정)에서 `.work-log-page .inline-sheet.is-visible .call-detail-form-actions` /
`... .inline-expense-form .modal-btns`에 `position: sticky; bottom: calc(4.75rem + safe-area)`를
걸었는데, sticky의 `bottom`은 "폼 바닥"이 아니라 스크롤 포트(`.work-log-page`, `100dvh` +
`overflow-y:auto`) 하단 기준이라 시트가 열리는 순간 액션이 문서상 폼 끝에 있어도
뷰포트 쪽에 먼저 부착됐다. `position: fixed`는 이미 한 번 롤백된 방식이라 금지.

**수정**: `react-app/src/components/day-log/day-log.css` — 위 두 selector에서
`position: sticky` / `bottom` / `z-index` / sticky용 `background` / sticky용 `padding`을
제거하고 `margin-top: 10px`만 남겨 일반 문서 흐름(in-flow)으로 되돌렸다. DOM 순서·폼
구조·시트 열림 그리드(`0fr` ↔ `min-content`)는 그대로다. 하단 네비 가림은 기존
`.work-log-page`의 `padding-bottom` / `scroll-padding-bottom`과 `.input-box` / `.modal-btn`의
`scroll-margin-bottom`이 계속 맡는다(유지). `scrollIntoView` / `useLayoutEffect` /
`max-height` 호스트 트릭 / `InlineExpandHost` / 신규 큐 없음.

**테스트**: `inlineSheetCss.test.js` — sticky를 요구하던 assert를 제거하고, "취소/저장
액션 바 규칙에 `position: sticky` / `position: fixed`가 없다"는 회귀 잠금 테스트를 추가.
`grid-template-rows: min-content`, `scrollIntoView` 부재, 호스트 `max-height: 0` 트릭 부재
검사는 유지. `npm test` 498 pass / 0 fail.

**브라우저 검증** (`npm run dev`, 게스트 모드, 390×844, `/app/day/2026-08-31`): 콜·정비·
주유·기타 시트를 각각 연 직후 `getComputedStyle(액션 바)`가 `position: static` / `bottom: auto`
/ `z-index: auto`. 시트를 열면 액션 바가 마지막 필드 바로 아래(문서 흐름)에 있고, 열린
직후 스크롤 최상단에서 액션 바 top이 뷰포트(844) 아래에 위치해 위로 떠 보이지 않는다.
스크롤을 0→끝으로 내리면 액션 바 뷰포트 위치가 스크롤량만큼 그대로 이동(뷰포트에
고정 안 됨). 시트 상호배제 유지, 콘솔 에러 0.

**상태**: Step 7 `[~]` 유지. commit/push/`[x]`/Step 8 없음.

## 5-5. Step 7 재감사 — 홈 월간 정산 카드에 거래처 운임 수수료 행 (2026-08-31)

**증상**: 거래처 수수료를 켜고 일지를 넣으면 일지 상세·매출에는 수수료가 보이는데
메인 홈 "월간 운송료 정산" 카드에는 안 보였다.

**원인**: 매출 화면은 `getOwnerMonthlyFinanceDetail`이 콜마다
`getCallDetailCommissionAmount`(스냅샷 우선, 없으면 Store 거래처 `commEnabled`/
`commType`/`commValue`)로 수수료를 계산한다. 홈 카드는 `monthWorkFareSummary`만 써서
수수료를 아예 읽지 않았다. 홈 전용 수수료 식을 새로 짜면 SoT 위반이므로, 홈도 매출과
같은 `getOwnerMonthlyFinanceDetail(...).income.commission.total` 한 값만 읽게 했다.

**변경 파일** (표시 전용, 새 mutation/큐 없음):
- `react-app/src/components/calendar/CalendarPage.jsx` (127줄) — `OwnerRevenueView`와
  같은 패턴으로 `useOwnerCars`/`useOwnerProfile`/`useOwnerDrivers`/`useOwnerExpenses`/
  `useOwnerWorkDataByLogId`를 구독하고 `buildFinanceSettings(ownerKey)`를 메모. `owner`
  스코프·`monthKeyOf(year, month)`(매출과 같은 함수)로 `getOwnerMonthlyFinanceDetail`을
  호출해 `income.commission.total`만 뽑아 카드에 넘긴다. `monthWorkFareSummary`로
  수수료를 다시 계산하지 않는다.
- `react-app/src/components/calendar/CalendarMonthSummary.jsx` — `commissionTotal` prop
  추가. 값이 0보다 크면 "운임 수수료" 행(`-금액`, 매출 `OwnerMonthlyCards`와 같은
  라벨)을 부가세 아래에 표시, 0이면 행 숨김. 합계는 `fareSummary.total - commissionTotal`
  ("미적용" = 합계가 너무 큰 것이므로 합계에 반영). 공급가액 행은 차감 전 운임 그대로.
  힌트에 "운임 수수료는 거래처(콜 저장 시점) 기준" 한 줄(수수료 있을 때만).
- `react-app/src/components/calendar/CalendarPage.test.js` — 아래 2개 테스트 추가
  (기존 `test` 스크립트 목록에 이미 포함된 파일).

**테스트** (revert-and-confirm-fail 확인):
- `홈 월간 정산 카드의 운임 수수료 = 매출 income.commission.total, 합계는 그만큼 차감` —
  Store에 수수료 켠 거래처 + 그달 콜(운임 100,000, 10%)을 `commitClients`/`commitWorkData`로
  넣고, 홈 카드의 "운임 수수료" 텍스트가 `-10,000 원`이고 매출
  `getOwnerMonthlyFinanceDetail(..., 'owner', ...).income.commission.total`(=10,000)과
  같은 값임을 assert. 합계 행(`.summary-row.total`)이 `monthWorkFareSummary.total - 10,000`
  임을 assert. → `fareSummary.total - commission`을 `fareSummary.total`로 되돌리면 FAIL.
- `수수료가 없으면 정산 카드에 운임 수수료 행이 없고 합계는 monthWorkFareSummary.total과 같다`
  → `commission > 0` 가드를 `true`로 되돌리면 FAIL.

**게이트**: `npm test` 500 pass / 0 fail. `npm run typecheck` 0. `typecheck:strict-inventory`
911(5-3 기준선과 동일 — 신규 테스트가 진단 추가 0건). `npm run build` 성공. `npm run lint`
에러 0 / 기존 경고 3. `git diff --check` LF/CRLF만. 신규·수정 프로덕션 JS 200줄 이하.

**브라우저 검증** (`npm run dev`, 게스트, 390×844): 수수료 10% 거래처의 그달 콜(스냅샷
없는 콜 + 스냅샷 있는 콜)을 Store에 넣고 홈 카드 "운임 수수료" = `-40,000 원`, 합계
`444,000 원`. 같은 데이터로 매출 화면(월/차주) "운임 수수료" = `-40,000원`으로 일치.
스냅샷 있는 콜(운임 100,000, 10%)은 일지 상세의 수수료 `- 10,000원`과 매출/홈에서 그
콜의 기여분(10,000)이 일치 — 모순 없음. 스냅샷 없는 콜은 일지 헬퍼가 스냅샷만 보므로
일지 상세엔 안 뜨지만, 홈은 매출과 같은 함수(거래처 fallback)를 쓰므로 매출과 일치.
콘솔 에러 0.

**상태(당시)**: Step 7 `[~]` — 아래 5-6·최종 승인 절 참고.

## 5-6. 테스트·지원 strict-inventory 중간점검 (2026-08-31)

Step 8 전 보리 지시. `error TS\d+:` 테스트·지원 **384 → 314**(캡 355 이하). 전체 911→840, 프로덕션 527→526. 픽스처 JSDoc, `normalizeSettings` 반환 타입, `App.test.js` 기존 헬퍼 치환. Assert 약화 없음. 남은 314는 파일별 좁힘·프로덕션 타입 변경이 필요한 분(범위 밖).

## 5-7. Step 7 사용자 최종 승인 (2026-08-31)

보리가 홈 수수료 SoT·일지 in-flow·hydrate producer·테스트 중간점검을 포함해 Step 7을 승인했다. 체크리스트 `[x]`. SoT는 `docs/sot.md` (구 `handoff-2026-08-30.md` / `단일진실원.md`). Step 8은 별도 착수 지시 후.
