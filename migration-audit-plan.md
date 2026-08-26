# React 이관 감사 보고서 (`react-app`)

기준: `migration-plan.md` (2단계 설계안). 대상: `react-app/src`.  
범위: 코드 수정 없음. 기존 React 구현을 설계안·도메인 계약과 대조한 Gap 분석, 재사용/폐기 분류, 재이관 순서, 검증 기준.

한 줄 요약: 현재 `react-app`은 **기능 단위 수직 슬라이스가 아니라 “화면 껍데기 + localStorage 모듈” 1차 이식**이다. 제어 컴포넌트·리스트 `map`·모달 조건부 렌더는 이미 상당 부분 React답다. 그러나 **스토어/라우트/일지 draft/다중 로그**가 빠져 있어, 설계안의 목표 아키텍처와는 아직 다른 앱이다.

---

## 0. 현재 트리 vs 설계안 트리

| 설계안 (`migration-plan.md`) | 실제 `react-app` |
|---|---|
| `src/app` + React Router + `Outlet` | `App.jsx`의 `screen` / `appPage` 문자열 스위치 |
| `src/store` Zustand 단일 소스 | 페이지마다 `useState(() => loadX(ownerKey))` + `localStorage` |
| `src/domain` 순수함수 | `src/lib/*` (일부는 순수, `cloudSync`/`practiceSettings.applyTheme`는 부작용) |
| `src/api` 어댑터 | `src/lib/cloudSync.js` 한 파일 + `supabaseClient.js` |
| `src/ui` 파일당 ≤200줄 | `src/components` 거대 페이지 파일 |
| TypeScript + Router 6 + Zustand | JS + React 19 + Vite. Router/Zustand 없음 |
| 일지 `/app/day/:date`, 서브 `/app/logs/:logId` | 달력 위에 `WorkLogPage` 통째 교체 (`selected` truthy면 홈 언마운트) |

테스트: `package.json`의 `npm test`는 `node --test`로 `src/lib/*.test.js`만 돈다. Testing Library / 컴포넌트 테스트는 없다.

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

## 5. 감사 결론

`react-app`은 바닐라 DOM 조작을 JSX로 나열한 수준을 이미 지났다. 작은 컴포넌트(`BottomNav`, `ConfirmModal`, `ExpenseFormModal`, 설정 스위치)와 `lib` 순수함수·Jest는 **자산**이다.

막힌 지점은 UI 문법이 아니라 **상태 경계**다. 페이지 스냅샷 + 메인 로그 하나 + 콜 인덱스 + 비용 이중 저장 + flush/세션 부재는 설계안 0~1절을 충족하지 않는다. `WorkLogPage.jsx`와 `App.jsx` 스위치, `InlineExpandHost`, `cloudSync.js` 전역 `let`은 패치보다 **교체**가 맞다.

다음 구현은 이 문서 Step 1부터, 코드를 고치지 않은 채 합의한 뒤 진행하면 기존 React 화면을 한 번에 박살 내지 않고 슬라이스할 수 있다.
