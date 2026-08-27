# React 이관 감사 보고서 (`react-app`)

기준: `migration-plan.md` (2단계 설계안). 대상: `react-app/src`.  
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

## 0-1. 현재 상태 (Step 4 + Step 0-4 감사 보완 1~3차 완료, Step 5 착수 전)

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

### [ ] Step 5 — 달력 홈 재작성 (슬라이스 3)

- 폐기/대체: `MainPage.jsx`를 `ui/calendar/CalendarPage.tsx` + `CalendarGrid` + `CalendarCell` + `CalendarMonthSummary`로 분할.
- 뱃지: `domain`에서 `DayRecord` → `workBadge` / `isOff` / `hasUnpaid`. `inputMode === 'fare'` 연결.
- `unitPrice`는 설정 스토어. 고정노선 단가와 달력 합계 소스를 문서화(한쪽으로 통일하는 작업은 Step 6과 함께).
- 완료: 새로고침 후 같은 달, 셀 클릭 시 `/app/day/:date`.

### [ ] Step 6 — 일지 재작성 (슬라이스 4) — 가장 큰 교체

- 폐기: `WorkLogPage.jsx`, `InlineExpandHost.jsx`.
- 신규: `DayLogPage` + `useDayDraft` + `day-log-reducer`. `CallDetailForm` / `ExpenseForm` variant sheet.
- 콜상세 `id` 부여. 레거시 인덱스는 로드 시 한 번 마이그레이션.
- **비용을 day record에 clone으로 넣거나**, finance가 `expenses` 스토어를 읽도록 **한 계약만** 남긴다. 추천: 설계안대로 day record + 관리 화면은 같은 스토어 셀렉터.
- `palletCount` 섹션 + `saveDayRecord` empty 조건에 파렛트/비용 반영.
- 완료: 입력 → 즉시 화면 반영, 디바운스 후 localStorage, 빈 날 삭제, 언마운트 flush.

### [ ] Step 7 — 거래처 / 차량 (슬라이스 5)

- `ClientManagementPage` → `ClientListPage` + `ClientFormModal` + `useClientReorder` (현재 `onDrop` 순서 로직은 `reorderClients`로 재사용).
- 폼에 `fixedRouteLinked` **최대 1곳**, `fixedUnitPrice`, `palletOn`/`palletPrice`, `comm*`.
- `CarForm*` 분리. 번호 변경 시 `workLogs` 키 이동 + 라우트 `logId`.
- `upsertCar`/`upsertClient`의 supabaseId 스프레드를 액션에서 강제.
- 완료: 드래그 후 새로고침 순서 유지. 차량 추가 직후 그날 운행.

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
- 달력 금액 모드
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

## 5-1. 현재 결론 (Step 4 + 감사 보완 3차 완료, 2026-08-26 기준)

위 결론이 지목한 문제 중 상당수가 이미 해소됐다:

- **`App.jsx` 스위치** → Step 3에서 라우터 트리로 교체 완료. 옛 `App.jsx`는 삭제됐다.
- **`cloudSync.js` 전역 `let`** → 완전히 없애지는 않았다(여전히 `cloudUserId`/`cloudOwnerKey`/`syncTimer`/`hydrateGeneration` 모듈 전역이 있다). 대신 감사 보완 1~2차에서 그 전역이 만들던 실제 사고(hydrate 실패가 "완료"로 보이던 것, 부분 반영, dirty 유실, 로그아웃 후 stale hydrate 적용)를 상태기계·durable journal·single-flight·atomicPersist로 하나씩 막았다 — "전역을 없앤다"가 아니라 "전역이 있어도 안전하게" 쪽으로 결론이 바뀌었다. `api/`로의 실제 폴더 분해는 여전히 안 했다(Step 9 즈음 판단).
- **페이지 스냅샷 + 메인 로그 하나 + 콜 인덱스 + 비용 이중 저장** → 아직 그대로다. 이건 Step 5(달력)·Step 6(일지, 콜 `id` 부여)·Step 7(거래처/차량)의 몫이고, 이번 감사 보완 라운드들은 **의도적으로 이 영역을 건드리지 않았다**(사용자 지시: "Step 5를 시작하지 말고 차단 항목만 보완하라").
- **`WorkLogPage.jsx`/`InlineExpandHost`** → 그대로 살아 있다. 폐기 대상이라는 2.2절 판정은 유효하며, Step 6에서 교체된다.

남은 진짜 결론: **상태 경계 문제는 스토어 껍데기(Step 1)와 hydrate/동기화 신뢰성(감사 보완 1~3차)에서는 해소됐지만, 화면이 그 스토어를 실제로 구독하는 지점(Step 5~7)은 아직 시작되지 않았다.** `migration-plan.md` 1.3이 금지한 "쓰지 말 것" 상태 — 즉 컴포넌트가 `useState(() => loadX())`로 자기만의 스냅샷을 갖는 것 — 는 지금도 유효하게 남아 있고, 이걸 깨는 게 Step 5의 정확한 시작점이다. 다음 구현은 이 문서 **Step 5**부터, 사용자 승인 뒤 진행한다.
