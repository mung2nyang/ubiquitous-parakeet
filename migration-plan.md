# ubiquitous-parakeet React 이관 계획

기준 문서: `migration-research.md`. 이 계획은 바닐라 함수를 JSX로 옮기는 번역이 아니라, **같은 도메인 규칙·같은 저장소 계약**을 **선언형 UI + 명시적 스토어**로 다시 짜는 설계다.

금지: `getElementById`, `innerHTML`, `classList`, `appendChild`로 모달 옮기기, `window.foo` + HTML `onclick`, `appState`와 `let` 이중 소스, 배열 인덱스를 식별자로 쓰기.

유지: localStorage 우선 기록, Supabase 디바운스 업서트, hydrate 전 settings 업서트 금지, `payments` 원장, 고정노선 거래처 1곳, 차량 `supabaseId` 보존, 백그라운드 저장 flush(`online` / `visibilitychange` / `pagehide`).

---

## 0. 목표 아키텍처 (1:1 번역을 버리는 이유)

바닐라는 “한 HTML에 모든 화면이 살아 있고, 전역 변수가 화면을 때린다”. React로 옮기면 그 모델이 깨진다.

| 바닐라 | React 재설계 |
|---|---|
| `.page.hidden` 토글 | 라우트 한 개만 마운트 (`<Outlet />`) |
| 전역 `workData` + `currentTemp*` | 스토어의 확정 데이터 + 일지 화면의 **로컬 draft state** |
| `confirmCallback` 한 슬롯 | `ConfirmDialog`를 컨텍스트 큐 또는 Promise API |
| select를 래핑해 body에 메뉴 | `<AppSelect>` / `<AppDatePicker>` 컴포넌트 |
| 모달 DOM을 host로 `appendChild` | 같은 폼 컴포넌트를 `variant="sheet" \| "modal"`로 **두 위치에서 조건부 렌더** |
| `calendarCells` 42칸 패치 | `days[]`를 map. key=`dateKey` |
| `onclick="fn(index)"` | `onClick={() => fn(item.id)}` |
| `dispatchEvent(new Event('change'))` | `onChange`로 값을 직접 올림 |

렌더 트리 한 줄:

```
AppProviders (auth, settings, sync, confirm, toast)
  └── Router
        ├── /auth/*          로그인·가입 (account-flow)
        ├── /onboarding
        └── /app/*           셸(하단탭+사이드+알림)
              ├── /            달력 홈
              ├── /day/:date   일지 (풀스크린)
              ├── /revenue
              ├── /me          마이페이지 및 하위
              └── …관리 화면
```

일지는 바닐라처럼 홈을 hidden으로 남겨두지 않는다. `/`에서 날짜를 누르면 `/day/2026-08-26`으로 이동하고, 닫으면 달력으로 돌아간다. 서브 차량은 `/app?log=12가3456` 또는 `/app/logs/:logId` 쿼리/세그먼트로 `activeLogId`를 라우트 상태로 둔다.

---

## 1. 상태 재설계 (useState를 전역에 뿌리지 말 것)

컴포넌트 `useState`는 **그 화면이 사라지면 같이 사라져도 되는 것**만 가진다. 계정·차량·운행 확정본·동기화 큐는 스토어다.

### 1.1 레이어

```
src/
  domain/          순수 함수. React 없음. Jest로 기존 tests/core-logic 이전
  store/           설정·운행·세금계산서·동기화 (외부 구독)
  api/             Supabase 어댑터 (현재 supabase-sync.js 계약 유지)
  ui/              컴포넌트 (파일당 ≤200줄)
  app/             라우터, 셸, 부트
```

`domain` 예: `getDetailPaymentSummary`, `getFixedRouteClient`, `dedupeCars`, `assignmentRangesOverlap`, `getActiveLogSettings(settings, logId)`, `normalizeLegacyRecord`, `buildTaxInvoiceEntry`. 바닐라에서 DOM을 만지던 계산만 여기로 옮긴다.

### 1.2 스토어 모양 (단일 소스)

```ts
// src/store/types.ts — 개념. 구현은 Zustand 권장 (구독 범위가 잘게 나뉨)

type LogId = 'main' | string; // 서브는 car.number

type AppStore = {
  hydration: { completed: boolean; userId: string | null };
  session: { isLoggedIn: boolean; guestMode: boolean };
  settings: UserSettings;           // getUserSettings와 동일 스키마
  workLogs: Record<LogId, WorkLog>; // WorkLog = Record<YYYY-MM-DD, DayRecord>
  taxInvoices: TaxInvoice[];
  ui: {
    theme: 'light' | 'dark';
    save: { pendingKeys: string[]; failedKeys: string[] };
  };
};
```

바닐라 `let workData`는 `workLogs[activeLogId]`다. 차량을 바꾸면 다른 로그를 구독할 뿐 전역 한 덩어리를 갈아끼우지 않는다.

쓰기는 항상 **불변 업데이트 + persist 미들웨어**:

```ts
function patchSettings(mutator: (draft: UserSettings) => void) {
  const next = structuredClone(get().settings);
  mutator(next);
  set({ settings: next });
  persistSettings(next);           // localStorage 동기
  scheduleSupabaseSettingsSync();  // 기존 디바운스 계약
}
```

바닐라 `const s = getUserSettings(); s.x = 1; setUserSettings(s)`를 컴포넌트에서 재현하지 않는다. 컴포넌트는 `updateClient(id, patch)` 같은 액션만 부른다.

### 1.3 어디에 useState / useEffect를 쓰나

**useState (화면 로컬)**

- 일지 draft: `DayDraft` (`isOff`, `fixedCount`, `palletCount`, `callDetails`, `maintItems`, `fuelItems`, `miscItems`, `fixedRouteCounts`)
- 모달 폼: 차량 등록 필드, 거래처 등록 필드, 콜상세 편집 중인 한 건
- 위젯 열림: 드롭다운 `open`, 알림 패널 `open`
- 탭: 세금계산서 flow/tab, 매출 monthly/yearly, 정비/주유/기타
- 드래그 중 인덱스 (드롭 시에만 스토어 커밋)
- 온보딩 마법사 스텝

**useReducer (한 화면 안 복잡한 폼)**

- `DayDraft` + `editingCallId` + `inlinePanel: null | 'call' | 'maint' | 'fuel' | 'misc' | 'select'`
- 차량 모달: `editingCarId | 'new'` + 기사초대 2차 모달 여부

**useEffect (구독·브라우저 브리지만)**

- 앱 루트 1회: `online` / `visibilitychange` / `pagehide` → `flushAllBackgroundSaves`
- 앱 루트 1회: hydrate (`getSession` → 계정 캐시 클리어 조건 → `hydrateFromSupabase`). **settings patch 금지 until `hydration.completed`**
- `theme` → `document.documentElement.dataset.theme` (body 클래스 남발 대신 한 곳)
- 일지 화면: draft 변경 디바운스 → `commitDay(logId, dateKey, draft)` (빈 날이면 키 delete). cleanup에서 `clearTimeout`
- 라우트 `logId` 변경 시 해당 `workLogs[logId]`가 없으면 load

**쓰지 말 것**

- “페이지 show할 때 `loadSettings()`로 input.value를 채우기” → 제어 컴포넌트 `value={settings.bizName}`
- `useEffect(() => { el.appendChild(modal) })` → 조건부 렌더
- 전역 `confirmCallback` → 아래 Confirm API

### 1.4 일지 draft 계약 (참조 공유 버그 제거)

바닐라 `autoSaveWorkRecord`는 `maintItems: currentTempMaintItems`로 **같은 배열**을 저장한다.

React:

```ts
function commitDay(logId: LogId, dateKey: string, draft: DayDraft) {
  const record = cloneDayRecord(draft); // structuredClone
  if (isEmptyDay(record)) {
    store.removeDay(logId, dateKey);
  } else {
    store.upsertDay(logId, dateKey, record);
  }
}

// 화면 진입
const [draft, setDraft] = useState(() =>
  cloneDayRecord(store.getDay(logId, dateKey) ?? emptyDay())
);
```

저장 시 clone, 편집은 항상 `setDraft`의 새 객체. 콜상세·정비 항목은 생성 시 `id: generateLocalId('trp'|'mnt'|...)`를 부여하고, 레거시 데이터는 로드 시 인덱스 기반으로 id를 채운다(결정론적 hash면 정규화 미러와 맞춰도 됨).

### 1.5 네비게이션 상태를 전역 let에서 제거

| 바닐라 | 대체 |
|---|---|
| `previousPage`, `utilityReturnPage`, `*ReturnLogId` | `location.state.from` 또는 `useNavigate(-1)` + 진입 시 `state: { from, logId }` |
| `activeLinkedDriverId` | `/app/drivers/:linkId` |
| `currentReceivableDetail` | `/app/receivables/:client/:month` |
| `isDetailReportView`, `currentDetailClientFilter` | `/app/report?view=detail&client=` |
| `mobileBackIntegration` pushState 가드 | React Router가 스택을 소유. 오버레이는 **라우트 밖 스택**(아래 3.8)으로 `history`를 오염시키지 않음 |

히스토리 가짜 `appBackGuard`는 폐기한다. 하드웨어 백은 (1) 열린 오버레이 닫기 (2) 아니면 `navigate(-1)` (3) 스택 바닥이면 웹뷰에 종료 신호를 한 번만.

### 1.6 Confirm / Toast

```tsx
// src/ui/overlay/confirm-context.tsx
type ConfirmOpts = { title?: string; cancelLabel?: string; confirmLabel?: string; tone?: 'danger' | 'primary' };

const ConfirmContext = createContext<(msg: string, opts?: ConfirmOpts) => Promise<boolean>>(null!);

export function useConfirm() {
  return useContext(ConfirmContext);
}

// 사용
const ok = await confirm('삭제하시겠습니까?');
if (ok) store.deleteClient(id);
```

회원탈퇴 2단 확인은 `await confirm(A); await confirm(B)`로 직렬화한다. `setTimeout`으로 모달을 다시 여는 트릭은 불필요.

Toast는 동일하게 컨텍스트 + 큐. `save-status-indicator`는 `store.ui.save`를 구독하는 셸 컴포넌트 하나.

---

## 2. 컴포넌트 분리 계획 (파일당 200줄 이하)

규칙: 한 파일 = 한 역할. 페이지 파일은 조립만. 계산은 `domain/`. 목록 아이템은 별도 파일. 200줄이 넘으면 폼 섹션·리스트·훅으로 쪼갠다.

권장 스택: Vite + React 18 + TypeScript + React Router 6 + Zustand. CSS는 기존 `style.css`를 당분간 유지(클래스명 호환). 점진 이관 시 바닐라와 공존하지 말고 **기능 단위로 새 트리에 옮긴다** (한 HTML 두 런타임은 전역 충돌).

### 2.1 디렉터리 트리

```
src/
  app/
    main.tsx
    App.tsx                        # RouterProvider만
    boot.ts                        # hydrate 순서 (React 밖)
    providers.tsx
  store/
    app-store.ts
    persist.ts                     # localStorage 키 계약
    sync-queue.ts                  # queueBackgroundSave 이식
    selectors.ts
  domain/
    settings.ts
    day-record.ts
    payments.ts
    cars.ts
    clients.ts
    driver-links.ts
    finance-revenue.ts
    finance-receivables.ts
    tax-invoices.ts
    report.ts
    ids.ts
  api/
    supabase-client.ts
    auth.ts
    hydrate.ts
    sync-settings.ts
    sync-work.ts
    sync-tax.ts
    sync-inquiries.ts
    driver-links-api.ts
  ui/
    shell/
      AppShell.tsx
      BottomNav.tsx
      SideMenu.tsx
      SideMenuSection.tsx
      NotificationBell.tsx
      NotificationPanel.tsx
      NotificationItem.tsx
      SaveStatusIndicator.tsx
      SplashScreen.tsx
      ThemeRoot.tsx
    overlay/
      Modal.tsx                    # backdrop, role=dialog
      ConfirmDialog.tsx
      ToastHost.tsx
      confirm-context.tsx
      toast-context.tsx
    widgets/
      AppSelect.tsx
      AppSelectOption.tsx
      AppDatePicker.tsx
      AppTimePicker.tsx
      AppAutocomplete.tsx
      OverlayPortal.tsx            # createPortal(menu, document.body)
      CurrencyInput.tsx
      PhoneInput.tsx
      SegmentedControl.tsx
      PillToggle.tsx
    calendar/
      CalendarPage.tsx
      CalendarHeader.tsx
      CalendarGrid.tsx
      CalendarCell.tsx
      CalendarMonthSummary.tsx
      useCalendarDays.ts
    day-log/
      DayLogPage.tsx
      DayLogHeader.tsx
      OffToggle.tsx
      FixedCountSection.tsx
      FixedRouteChips.tsx
      PalletSection.tsx
      CallDetailList.tsx
      CallDetailCard.tsx
      CallDetailForm.tsx           # sheet/modal 공용
      MaintSummary.tsx
      FuelSummary.tsx
      MiscSummary.tsx
      ExpenseForm.tsx              # kind: maint | misc
      FuelForm.tsx
      ExpenseSelectPanel.tsx
      AutoSaveStatus.tsx
      useDayDraft.ts
      day-log-reducer.ts
    auth/
      AuthLayout.tsx
      AuthIntro.tsx
      LoginForm.tsx
      SignupForm.tsx
      SignupRoleTabs.tsx
    onboarding/
      OnboardingPage.tsx
      OnboardingStepWorkStyle.tsx
      OnboardingStepOptions.tsx
      OnboardingStepCar.tsx
      OnboardingStepSettlement.tsx
    cars/
      CarListPage.tsx
      CarListItem.tsx
      CarFormModal.tsx
      CarFormBasicFields.tsx
      CarFormDriverFields.tsx
      CarFormBusinessFields.tsx
      CarFormCommFields.tsx
      CarDriverInviteModal.tsx
    clients/
      ClientListPage.tsx
      ClientListItem.tsx
      ClientFormModal.tsx
      ClientFormTaxFields.tsx
      ClientFormBillingFields.tsx
      ClientPinnedRow.tsx
      useClientReorder.ts
    drivers/
      DriverConnectionPage.tsx
      DriverInviteForm.tsx
      LinkedDriverList.tsx
      LinkedDriverListItem.tsx
      LinkedDriverDetailPage.tsx
      LinkedDriverClientsPage.tsx
      EmployedDriverCard.tsx
    finance/
      RevenuePage.tsx
      RevenuePeriodHeader.tsx
      RevenueMonthlyView.tsx
      RevenueYearlyView.tsx
      RevenueDetailRow.tsx
      ReceivablesPage.tsx
      ReceivableGroupCard.tsx
      ReceivableDetailPage.tsx
      ReceivableItemRow.tsx
      PartialPaymentRow.tsx
      TaxInvoicePage.tsx
      TaxInvoiceTabs.tsx
      TaxInvoiceList.tsx
      TaxInvoiceListItem.tsx
      TaxInvoiceFormModal.tsx
    report/
      ReportPage.tsx
      ReportSummary.tsx
      ReportTable.tsx
      ReportCarSelectModal.tsx
      ReportShareModal.tsx
      useReportExport.ts           # html2pdf는 여기만
    maint/
      MaintFuelPage.tsx
      MaintFuelTabs.tsx
      MaintFuelList.tsx
      MaintFuelDayCard.tsx
      MaintFuelRecordRow.tsx
    settings/
      SettingsPage.tsx
      MainLogSettings.tsx
      SubLogSettings.tsx
      ToggleDependencyHint.tsx
      RunCountPresetChips.tsx
      FixedRoutePresetList.tsx
    me/
      MyPage.tsx
      MyPageShortcuts.tsx
      PersonalInfoPage.tsx
      BillingSettingsPage.tsx
      MessageSettingsPage.tsx
      NoticePage.tsx
      CustomerCenterPage.tsx
      InquiryForm.tsx
      InquiryList.tsx
    notifications/
      notification-items.ts        # 파생 목록 순수함수
```

페이지 파일(`*Page.tsx`)이 200줄을 넘기면 헤더/리스트를 즉시 분리한다. `DayLogPage`는 리듀서 + 섹션 조합만 남긴다.

### 2.2 화면 ↔ 파일 매핑 (바닐라 id 기준)

| 바닐라 | 라우트 | 진입 컴포넌트 |
|---|---|---|
| splash + loginPage | `/auth`, `/auth/login`, `/auth/signup` | `SplashScreen` → `AuthLayout` |
| onboardingPage | `/onboarding` | `OnboardingPage` |
| mainPage | `/app` | `CalendarPage` |
| workModal | `/app/day/:date` | `DayLogPage` |
| reportPage | `/app/report` | `ReportPage` |
| taxInvoicePage | `/app/tax` | `TaxInvoicePage` |
| myPage | `/app/me` | `MyPage` |
| personalInfoPage | `/app/me/profile` | `PersonalInfoPage` |
| settingsPage | `/app/me/settings` | `SettingsPage` |
| carManagementPage | `/app/cars` | `CarListPage` |
| clientManagementPage | `/app/clients` | `ClientListPage` |
| driverConnection* | `/app/drivers`, `/app/drivers/:id` | `DriverConnectionPage` 등 |
| receivables* | `/app/receivables` | `ReceivablesPage` |
| revenuePage | `/app/revenue` | `RevenuePage` |
| maintManagementPage | `/app/expenses?tab=maint` | `MaintFuelPage` |
| customerCenterPage | `/app/me/support` | `CustomerCenterPage` |
| billing / notice / message | `/app/me/...` | 각자 페이지 |

모달은 라우트 없이 페이지 state 또는 `?modal=car` 쿼리. 깊은 링크가 필요 없는 폼(콜상세)은 일지 리듀서의 `inlinePanel`만으로 충분하다.

### 2.3 훅 분리 (컴포넌트에서 부작용 제거)

각 훅 ≤150줄 목표.

- `useDayDraft(logId, date)` — load clone, debounce commit, unmount flush
- `useActiveLogSettings()` — `settings` + `logId` → 메인/sub 토글 머지 (기존 `getActiveLogSettings`)
- `useBackgroundFlush()` — 루트 전용 리스너
- `useHydrationLock()` — 설정 화면 disabled
- `useClientReorder(clients)` — pointer + 순서 커밋
- `useAnchoredOverlay(open)` — 좌표 (위젯 전용)
- `useReportExport()` — pdf-export 클래스 대신 ref + html2canvas 옵션

### 2.4 이관 순서 (기능 단위, 한 번에 한 수직 슬라이스)

바닐라 파일을 React 파일로 1:1 바꾸지 않는다. **사용자 시나리오** 단위로 옮기고, 옮긴 시나리오의 바닐라 진입점을 제거한다.

1. **셸 + 인증 + 부트** — hydrate 순서, guestMode, 테마, 저장 큐. 이게 틀리면 이후 전부 유실 버그.
2. **도메인 순수함수 이전 + Jest** — DOM 없는 계산부터. `core-logic.test.js`가 스토어/도메인을 테스트하도록 바꾼다.
3. **달력 홈** — 셀 뱃지, 월 합계, `logId` 전환.
4. **일지** — draft, 콜상세, 고정노선 칩, 정비/주유 인라인, 자동저장, 수금 토글.
5. **거래처 / 차량** — 폼, 드래그, supabaseId 보존, 번호 변경 시 workLog 키 이동.
6. **매출 / 미수금 / 세금계산서** — 파생 데이터 + 부분입금.
7. **기사 연동** — 서버 대기 초대, 기사 전용 거래처, employerLink.
8. **리포트/PDF/공유 SMS** — export는 마지막 (html2pdf가 DOM에 의존).
9. **알림 / 백업 / 고객센터 / 온보딩** — 파생 + 로컬 키.

각 단계 완료 조건: 해당 흐름을 브라우저에서 끝까지(저장 → 새로고침 → 재로그인 hydrate) 검증. 달력만 옮기고 일지가 바닐라면 전역 `workData`가 다시 생긴다. **슬라이스 경계를 스토어 API로 고정**해야 병행이 된다.

---

## 3. DOM 트릭 → React 표준 패턴 (스니펫)

### 3.1 페이지 `hidden` 토글 → 라우트 조건부 마운트

바닐라: `hideAllPages(); mainPage.classList.remove('hidden')`.

```tsx
// src/app/App.tsx
export function App() {
  return (
    <Routes>
      <Route path="/auth/*" element={<AuthLayout />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<CalendarPage />} />
        <Route path="day/:date" element={<DayLogPage />} />
        <Route path="revenue" element={<RevenuePage />} />
        <Route path="me" element={<MyPage />} />
        {/* ... */}
      </Route>
    </Routes>
  );
}
```

홈에서 날짜 클릭:

```tsx
navigate(`/app/day/${dateKey}`, { state: { logId } });
```

일지를 닫아도 달력 state는 라우트가 언마운트되며 사라지지 않는다. `CalendarPage`의 `viewDate`는 URL `?year=&month=` 또는 페이지 로컬 state + 세션스토리지로 복원한다. 바닐라 `showMain`의 “돌아올 때 buildCalendar 강제”는 **스토어 구독으로 자동 재렌더**가 대체한다.

### 3.2 모달 appendChild 이동 → 같은 컴포넌트, 다른 자리

바닐라: `host.appendChild(maintRecordModal)` / `document.body.appendChild(panel)`.

React에서는 **노드를 옮기지 않고**, 일지에서는 시트, 관리 화면에서는 모달로 **한 폼을 두 번 정의하지 말고 variant만 다르게** 렌더한다.

```tsx
// src/ui/day-log/ExpenseForm.tsx
type Props = {
  kind: 'maint' | 'misc';
  value: MaintItem | null;       // null = 신규
  variant: 'sheet' | 'modal';
  onSave: (item: MaintItem) => void;
  onClose: () => void;
};

export function ExpenseForm({ kind, value, variant, onSave, onClose }: Props) {
  const [form, setForm] = useState(() => value ?? emptyMaint(kind));
  const body = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, id: form.id || createId('mnt') });
      }}
    >
      {/* 필드: 제어 컴포넌트 */}
    </form>
  );

  if (variant === 'sheet') {
    return (
      <section className="inline-sheet is-visible" aria-label="정비 입력">
        {body}
        <button type="button" onClick={onClose}>닫기</button>
      </section>
    );
  }

  return (
    <Modal onBackdrop={onClose} title="정비 내역">
      {body}
    </Modal>
  );
}
```

일지 페이지:

```tsx
// DayLogPage.tsx — inlinePanel만으로 한 장씩
{draft.inlinePanel === 'maint' && (
  <ExpenseForm
    kind="maint"
    variant="sheet"
    value={editingMaint}
    onSave={(item) => {
      dispatch({ type: 'upsertMaint', item });
      dispatch({ type: 'closePanel' });
    }}
    onClose={() => dispatch({ type: 'closePanel' })}
  />
)}
```

정비 관리 페이지:

```tsx
{maintModal && (
  <ExpenseForm
    kind="maint"
    variant="modal"
    value={maintModal.item}
    onSave={...}
    onClose={() => setMaintModal(null)}
  />
)}
```

maxHeight 트릭은 CSS로 대체한다. 시트가 열리면 클래스를 붙이고, 높이는 콘텐츠에 맡긴다.

```css
.inline-sheet { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .42s; }
.inline-sheet.is-visible { grid-template-rows: 1fr; }
.inline-sheet > * { overflow: hidden; }
```

`ResizeObserver`로 host maxHeight를 맞출 필요 없다. `restoreMaintFuelModalToRoot`도 사라진다. 언마운트되면 시트는 없고, 관리 화면 모달은 그 페이지에만 있다.

콜상세도 동일: `CallDetailForm` + `variant="sheet"|"modal"`. `callDetailInlineHost.appendChild` 폐기.

### 3.3 42칸 달력 패치 → days map

바닐라: `calendarCells[i]`, 뱃지 `remove()` 후 `appendChild`.

```tsx
// useCalendarDays.ts
export function useCalendarDays(viewDate: Date, log: WorkLog, settings: UserSettings) {
  return useMemo(() => buildCalendarDays(viewDate, log, settings), [viewDate, log, settings]);
}

// CalendarGrid.tsx
export function CalendarGrid({ days, onSelect }: { days: CalendarDay[]; onSelect: (key: string) => void }) {
  return (
    <div id="calendar-cells" className="calendar-cells">
      {days.map((day) =>
        day.dateKey ? (
          <CalendarCell key={day.dateKey} day={day} onSelect={onSelect} />
        ) : (
          <div key={day.gridIndex} className="date-cell empty" />
        )
      )}
    </div>
  );
}

function CalendarCell({ day, onSelect }: { day: CalendarDay; onSelect: (key: string) => void }) {
  return (
    <button
      type="button"
      className={`date-cell${day.isSunday ? ' sunday' : ''}${day.isSaturday ? ' saturday' : ''}`}
      onClick={() => onSelect(day.dateKey)}
    >
      <span className="cell-date-text">{day.dayOfMonth}</span>
      {day.isOff && <span className="off-badge">휴</span>}
      {day.workBadge && <span className="work-badge">{day.workBadge}</span>}
      {day.hasUnpaid && <span className="unpaid-dot" />}
    </button>
  );
}
```

뱃지 계산은 `domain/calendar-badges.ts`에서 `DayRecord` → `CalendarDay`. 렌더가 곧 패치다.

### 3.4 innerHTML + 인라인 onclick → 리스트 컴포넌트

바닐라: `onclick="${config.editAction(date, idx)}"`.

```tsx
function MaintFuelRecordRow({
  item,
  onEdit,
  onDelete,
}: {
  item: MaintItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="management-record-item">
      <strong>{item.name || '정비'}</strong>
      <span>{parseCurrencyValue(item.fare).toLocaleString()}원</span>
      <button type="button" onClick={() => onEdit(item.id)}>수정</button>
      <button type="button" onClick={() => onDelete(item.id)}>삭제</button>
    </div>
  );
}
```

사용자 문자열은 `{item.name}` 텍스트 노드로만. `dangerouslySetInnerHTML` 금지(아이콘 SVG는 컴포넌트).

### 3.5 body 절대좌표 드롭다운 → Portal + 상태

바닐라: 원본 select 숨김, `document.body.appendChild(menu)`, `MutationObserver`, 네이티브 `change` 재발행.

```tsx
// AppSelect.tsx
export function AppSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 7, left: rect.left, width: rect.width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="app-dropdown-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        {selected?.label ?? label}
      </button>
      {open &&
        createPortal(
          <ul
            role="listbox"
            className="app-dropdown-menu"
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
}
```

날짜/시간도 네이티브 `input[type=date]`를 숨기지 말고, 보이기 싫은 브라우저만 `AppDatePicker`로 대체한다. 값 반영은 `onChange(nextYmd)` 한 길. `setTimeout(0)`으로 `input.value`를 두 번 쓰는 방어는 제어 컴포넌트에서는 불필요하다.

스크롤/리사이즈 시 위치 갱신은 `useAnchoredOverlay` 한곳에서 `visualViewport` 구독, **위젯이 열렸을 때만**. 바닐라처럼 앱 전체에 capture scroll 리스너를 상시 두지 않는다.

### 3.6 거래처 DOM insertBefore 드래그 → 순서 state + FLIP 옵션

바닐라: 실제 DOM 순서를 바꾸고, 드롭 시 쿼리로 인덱스를 읽음.

```tsx
function ClientList({ clients, onReorder }: { clients: Client[]; onReorder: (ids: string[]) => void }) {
  const [order, setOrder] = useState(clients.map((c) => c.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const visible = order
    .map((id) => clients.find((c) => c.id === id))
    .filter(Boolean) as Client[];

  return (
    <ul>
      {visible.map((client) => (
        <ClientListItem
          key={client.id}
          client={client}
          dragging={draggingId === client.id}
          onDragStart={() => setDraggingId(client.id)}
          onDragOver={(overId) => {
            if (!draggingId || draggingId === overId) return;
            setOrder((ids) => moveId(ids, draggingId, overId));
          }}
          onDragEnd={() => {
            setDraggingId(null);
            onReorder(order);
          }}
        />
      ))}
    </ul>
  );
}
```

애니메이션이 필요하면 `item.animate` 대신 CSS `transition: transform` 또는 `@starting-style`. `elementFromPoint` + `insertBefore`는 쓰지 않는다. 핀된 카드끼리만 교환하는 제약은 `onDragOver`에서 `client.isPinned`가 같을 때만 `moveId`.

### 3.7 알림 스와이프 → 항목 로컬 state

```tsx
function NotificationItem({ item, onOpen, onDismiss }: Props) {
  const [dx, setDx] = useState(0);
  const startX = useRef(0);

  return (
    <div className="notification-swipe-shell">
      <button
        type="button"
        className="notification-panel-item"
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        onPointerDown={(e) => {
          startX.current = e.clientX;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          setDx(e.clientX - startX.current);
        }}
        onPointerUp={() => {
          if (Math.abs(dx) > 110) onDismiss(item.key);
          else setDx(0);
        }}
        onClick={() => onOpen(item)}
      >
        {item.title}
      </button>
    </div>
  );
}
```

리스트 리렌더 시 리스너 중복은 React가 처리한다. `initNotificationSwipeInteractions` 재호출은 없다.

### 3.8 모바일 뒤로가기: history.pushState 가드 폐기

```tsx
// AppShell.tsx
const [overlays, setOverlays] = useState<OverlayId[]>([]);
const top = overlays.at(-1);

useEffect(() => {
  if (!top) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOverlays((s) => s.slice(0, -1));
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [top]);

// 웹뷰 백버튼은 popstate 한 종류만: 오버레이가 있으면 prevent + 닫기
useEffect(() => {
  const onPop = () => {
    if (overlays.length) {
      window.history.pushState(null, '');
      setOverlays((s) => s.slice(0, -1));
    }
  };
  if (overlays.length) window.history.pushState(null, '');
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}, [overlays.length]);
```

바닐라 `handleCurrentAppBack`의 “보이는 모달의 취소 버튼을 `.click()`”은 폐기. 오버레이 id → `close` 함수 맵을 셸이 가진다.

주의: 오버레이가 없을 때는 **Router가 popstate를 먹게 둔다.** 가드를 항상 쌓지 않는다.

### 3.9 설정 input.value 주입 → 제어 컴포넌트 + hydration lock

바닐라: `loadSettings()`가 DOM을 채우고, hydrate 중이면 `disabled`.

```tsx
function PersonalInfoPage() {
  const locked = useStore((s) => !s.hydration.completed);
  const profile = useStore((s) => ({
    bizName: s.settings.bizName,
    userName: s.settings.userName,
  }));
  const patch = useStore((s) => s.patchPersonalInfo); // debounce persist

  return (
    <fieldset disabled={locked}>
      {locked && <p id="settingsHydrationLockNotice">클라우드 동기화 중입니다.</p>}
      <input
        value={profile.bizName}
        onChange={(e) => patch({ bizName: e.target.value })}
      />
    </fieldset>
  );
}
```

`toggleFixedSubSettings`의 maxHeight 애니는 `<Collapsible open={fixedOn}>`. 숨은 페이지에서 애니를 끄던 `getClientRects()` 분기는, 언마운트된 설정 페이지가 아예 없으므로 필요 없다.

고정노선 OFF → 세부입력 강제 ON은 `useEffect`로 DOM을 누르지 말고, **저장 액션과 셀렉터에서 규칙을 적용**한다.

```ts
function applyToggleDependencies(s: UserSettings, scope: 'main' | 'sub'): UserSettings {
  const next = structuredClone(s);
  if (scope === 'main' && !next.fixedOn) next.callDetailOn = true;
  return next;
}
```

UI는 `callDetailDisabled={!settings.fixedOn}` props.

### 3.10 PDF export: body 클래스 토글 최소화

바닐라: `pdf-export-mode` 추가 → 리포트 다시 그림 → html2pdf → 다시 화면용 그림.

```tsx
function ReportPage() {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function downloadPdf() {
    setExporting(true);
    try {
      await waitPaint(); // requestAnimationFrame × 2
      await html2pdf().set(opts).from(exportRef.current).save();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div ref={exportRef} className={exporting ? 'pdf-export-mode' : undefined}>
      <ReportTable forExport={exporting} />
    </div>
  );
}
```

가능하면 화면용/내보내기용을 `forExport` 한 props로 분기하고, 전체 `document.body` 클래스는 쓰지 않는다. 라이브러리가 페이지 전체를 캡처하면 그때만 `ThemeRoot`에 클래스를 올린다.

파일 다운로드 `<a click>`는 `URL.createObjectURL` + 임시 앵커를 **훅 안에서만**, cleanup에서 revoke.

### 3.11 전역 리스너: 루트 한 곳 + cleanup

```tsx
// src/app/providers.tsx
function SyncFlushBridge() {
  const flush = useStore((s) => s.flushSaves);

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) void flush();
    };
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  return null;
}
```

`enhanceAccessibility` MutationObserver는 폐기. 각 input에 `aria-label` 또는 `<label htmlFor>`.

`window.supabaseClient` 브릿지는 `api/supabase-client.ts`의 모듈 싱글톤으로 대체. `supabase-ready` 커스텀 이벤트는 `await createClient` 한 번.

### 3.12 계정 전환 시 메모리 캐시

바닐라 `__supabaseWorkDataSyncedSnapshot`을 모듈 전역에 두고 로그아웃 시 일부만 지움.

```ts
// sync-queue.ts
let workSyncSnapshot: Record<string, Record<string, string>> = {};

export function resetSyncSnapshots() {
  workSyncSnapshot = {};
}

// hydrate 시 계정이 바뀌면
resetSyncSnapshots();
store.replaceAll(serverState);
```

React state만 바꾸면 모듈 캐시가 남는 문제를 부트 함수에서 강제한다.

---

## 4. 데이터·동기화 계약 (이관 중 깨면 안 되는 것)

1. **hydrate 전 `patchSettings` 금지.** 세션 플래그만 localStorage 직접 또는 `session` 슬라이스 분리. 기존 실버그 재현 방지.
2. **차량/거래처 upsert 시 `supabaseId` 스프레드 보존.** `updateCar(id, patch)`는 `{ ...prev, ...patch, supabaseId: prev.supabaseId }`.
3. **일지 저장은 clone.** draft 참조를 store에 넣지 않음.
4. **콜상세 id.** UI·미수금·알림 키는 `logId|dateKey|detailId`. 레거시 인덱스는 마이그레이션 한 번.
5. **빈 날 delete.** 바닐라와 동일해야 달력/서버 diff가 맞다.
6. **고용기사 unlinked main 로그**는 서버 동기화 스킵 (저장실패 토스트 금지).
7. **차량 uuid 대기 후 throw** — 조용한 return 금지.
8. **디바운스 320/600ms + hidden/pagehide flush** 유지.
9. **`setUserSettings`마다 정규화 미러**가 아직 필요하면 `persist` 훅에서 `scheduleNormalizedEntitySync`. React 이관 후 미러를 안 쓰면 백업 포맷을 명시적으로 버전업.
10. 서브 차량 번호 변경 시 `workLogs[old]` → `workLogs[new]` 키 이동 + 라우트 `logId` 갱신.

---

## 5. 파일당 200줄 강제 체크리스트

리뷰 질문:

- 이 파일이 스토어와 DOM을 동시에 만지나? → 훅으로 분리.
- 목록과 폼이 한 파일인가? → `*ListItem` / `*Form`.
- `innerHTML` 또는 `document.getElementById`가 있는가? → 머지 거부.
- 200줄 넘는 페이지인가? → 헤더/섹션 파일로 분할.
- `useEffect`가 “마운트 시 DOM 채우기”인가? → 제어 컴포넌트로 삭제.

예외 허용(200줄 초과 가능, 주석으로 이유): `domain/finance-revenue.ts` 같은 순수 계산 집약 파일, `api/hydrate.ts` 부트 시퀀스. UI 파일은 예외 없음.

---

## 6. 테스트·검증

- Jest: `domain/*` + persist 키 라운트립 + `isEmptyDay` + payment summary + 고정노선 1곳 제약.
- 컴포넌트: Testing Library로 일지 저장 시 store에 clone이 들어가는지, hydrate lock이 input을 disable하는지.
- 수동 (기존 사용자 규칙): 로그인 → 일지 입력 → 즉시 백그라운드 전환 → 다른 기기 로그인에 반영. 차량 추가 직후 그날 운행. 기사 초대. 거래처 드래그. 미수 부분입금. 설정 hydrate 중 편집 시도.

브라우저 검증 대상 라우트: `/app`, `/app/day/:date`, `/app/clients`, `/app/cars`, `/app/revenue`, `/app/receivables`, `/app/tax`, `/app/me`. 상태가 공유되면 한 화면만 보고 끝내지 않는다.

---

## 7. 한 줄 정의

이관은 `script.js`를 JSX로 옮기는 일이 아니라, **저장소 계약을 지키는 스토어 + 라우트로 마운트되는 화면 + variant로 나눈 폼**으로 앱을 다시 그리는 일이다. DOM을 옮기던 트릭은 조건부 렌더와 props가 대체하고, 전역 let은 화면 로컬 state와 스토어 액션으로 분해한다.
