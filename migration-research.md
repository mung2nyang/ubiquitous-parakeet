# ubiquitous-parakeet React 이전 조사

조사 기준: 바닐라 SPA(단일 `index.html` + 전역 스크립트). 화면은 라우터가 아니라 `.page` / `.modal-overlay`의 `hidden` 클래스로 전환한다. 저장은 **로컬 우선(localStorage 동기 기록) + Supabase 백그라운드 업서트**. 모든 도메인 함수는 모듈이 아니라 `window` 전역에 올라가며, `index.html`의 `onclick`/`onchange`가 그 이름을 직접 호출한다.

로드 순서(의존성): `supabase-config.js` → ESM `createClient` → `finance.js` → `finance-sync.js` → `ui-widgets.js` → `maint-fuel-misc.js` → `driver-link.js` → `notifications.js` → `mypage.js` → `client-management.js` → `car-management.js` → `supabase-sync.js` → `script.js`. `script.js`는 파싱 직후 `normalizeLegacyData()` / `syncNormalizedEntityStore()` / `initRevenueDateSelects()` 등을 **즉시 실행**하므로, React로 옮길 때도 “하이드레이션 전에 빈 settings로 Supabase를 덮어쓰면 유실” 같은 부트 순서 제약이 그대로 남는다.

---

## 1. 핵심 데이터 구조와 상태(State) 목록

### 1.1 저장소 경계 (Source of truth)

앱은 메모리를 진실로 두지 않고, **localStorage를 동기 진실**로 둔다.

| 경계 함수 | 역할 |
|---|---|
| `getUserSettings()` / `setUserSettings()` | `userSettings` JSON. `set`은 정규화 미러 + `scheduleSupabaseSettingsSync()`를 예약 |
| `loadWorkDataForLog(logId)` / `saveWorkDataForLog(logId, data)` | 메인: `workData`, 서브: `workData_<차량번호>` |
| `readWorkDataStoreForLog` / `writeWorkDataStoreForLog` | 활성 로그면 전역 `workData` 참조를 공유. 고용기사 연동 시 `linkedDriverWorkData_<inviteCode\|ownerPhone>` 사본도 씀 |
| `getTaxInvoiceRecords()` / `saveTaxInvoiceRecords()` | `taxInvoiceRecords` 배열 |

`setUserSettings`는 읽을 때마다 `JSON.parse`로 **새 객체**를 만든다. 한 화면에서 `const s = getUserSettings(); s.x = 1; setUserSettings(s)` 패턴이 전역에 퍼져 있다. React state로 옮기면 “참조 공유 vs 매번 파싱”이 가장 먼저 깨지는 지점이다.

### 1.2 `userSettings` (계정·설정 루트)

`localStorage.userSettings` 한 덩어리. Supabase `profiles`에는 컬럼으로 빼는 필드(`accountType`, `userName`, `userPhone`, 사업자/계좌, `cars`, `clients`)를 제외한 **나머지 전체가 `profiles.settings` jsonb**로 올라간다 (`buildSettingsJsonbPayload`).

**계정 / 세션**

- `accountType` / `driverType`: `'owner_driver'` | `'employed_driver'`
- `isLoggedIn`, `guestMode`, `onboardingCompleted`
- `theme`: `'light'` | `'dark'` (별도 키 `localStorage.theme`와 이중 저장)

**개인·사업자**

- `userName`, `userPhone`
- `bizName`, `bizRepresentative`, `bizNumber`, `bizAddress`, `bizType`, `bizItem`, `bizEmail`
- `bankName`, `accountNumber`, `accountHolder`
- `carNumber`, `carTonnage` (레거시 메인 차량 보조)

**메인 일지 토글 (`getActiveLogSettings`가 `activeLogId==='main'`일 때 그대로 사용)**

- `inputMode`: `'count'` | `'fare'`
- `fixedOn`, `fixedRouteOn`, `runCountToggle`, `runCountPresets` (숫자 배열, 최대 10)
- `fixedRoutePresets`: `{ id, loadLoc, unloadLoc }[]` — 일지 원탭 노선
- `callDetailOn`(기본 true), `paymentOn`, `timeOn`, `platformOn`, `distanceOn`, `cargoTonnageOn`(기본 true)

**기사차량 일지 토글 (같은 객체에 `sub*` 접두)**

- `subInputMode`, `subFixedOn`, `subFixedRouteOn`, `subRunCountToggle`, `subRunCountPresets`, `subFixedRoutePresets`
- `subCallDetailOn`, `subPaymentOn`, `subTimeOn`, `subPlatformOn`, `subDistanceOn`, `subCargoTonnageOn`

**차량·거래처·연동**

- `cars[]` — 아래 1.3
- `clients[]` — 아래 1.4
- `driverLinks[]` — 차주 쪽 초대/할당 (아래 1.5)
- `employerLink` — 소속 기사 쪽 연결 (아래 1.5)
- `defaultDriverSettlementMode`: `'company'` | `'driver_direct'` | `'employee'` | `'none'`
- `driverInvoiceBasis`: `'net'` | `'gross'`
- `pinnedLocations`: 상·하차지 고정 장소 문자열 배열 (최대 10)

**기타**

- 차량/거래처 객체의 `supabaseId` (서버 uuid 캐시). 저장 시 스프레드로 보존하지 않으면 차량이 중복 insert되는 실제 버그가 있었다.

### 1.3 차량 (`settings.cars[]`)

- `number`, `tonnage`, `type`: `'main'` | `'sub'`
- `driverName`, `driverPhone`
- `settlementMode`: `'default'` 또는 위 정산 모드. `'default'`면 `settings.defaultDriverSettlementMode`
- `driverLinkEnabled`, `driverLinkId`
- `logEnabled`: 메인은 항상 true. 서브는 기사연동이 있으면 false, 아니면 토글
- `insuranceOn` (서브)
- `commEnabled`, `commType` (`'percent'` | `'direct'`), `commission`
- `infoType`: `'existing'` | `'new'`
- `personalInfo`: `{ driverName, name, bizNumber, phone, bank, account, accountHolder, address?, bizType?, bizItem?, email? }` — 내역서/매입 계산서 공급자
- `businessInfo`: `{ sameAsOwner, name, bizNumber, representative, address, bizType, bizItem, email }`
- `shareRevenueWithOwner` (서브, 기본 true)
- `supabaseId`, `archived`

같은 번호의 서브 차량 / 메인 1대 제약은 `dedupeCars`. 번호 변경 시 `workData_<old>` → `workData_<new>` 키 이동 + `activeLogId` 갱신.

### 1.4 거래처 (`settings.clients[]`)

- `id` (로컬 `generateLocalId('client')`), `supabaseId`
- `companyName`, `managerName`, `phone`, `bizNumber`
- 세금계산서: `taxRepresentative`, `taxEmail`, `taxAddress`, `taxBizType`, `taxBizItem`
- `isPinned` (즐겨찾기 칩)
- `commEnabled`, `commType`, `commValue`
- `fixedRouteLinked`, `fixedUnitPrice`, `palletOn`, `palletPrice` — **계정 전체에서 고정노선 연동은 1곳만** (`saveClient`가 나머지 해제)
- `paymentTerm`: `'next_month_end'` | `'next_month_day'` | `'second_month_day'` | `'after_days'` (+ 레거시 `'second_month_end'`는 로드 시 day=31로 변환)
- `paymentTermValue`
- `scopedToVehicleNumber`: 직원기사 전용 거래처. 차주 본인 자동완성에는 숨김
- `displayOrder`는 정규화 미러에만. UI 순서는 배열 순서 + 드래그

### 1.5 기사 연동

**차주 `driverLinks[]`**

- `id`, `supabaseId`, `driverId`(연결된 기사의 auth id)
- `driverName`, `phone`, `inviteCode`
- `vehicleId`, `vehicleNumber`
- `assignmentStart`, `assignmentEnd` (겹침 금지)
- `status` (서버 `driver_links.status`, 예: 초대/연결/해제)
- `linkedAt`, `updatedAt`, `createdAt`
- `shareClientTaxInvoicesWithOwner` (기사 profiles.settings에서 동기화)

**기사 `employerLink`**

- `id`, `supabaseId`, `status: 'linked'`
- `ownerId`, `ownerName`, `ownerPhone`, `inviteCode`
- `vehicleId`, `settlementMode`, `linkedAt`

할당 상태 UI는 `getAssignmentState(link)`가 기간으로 `upcoming` / `active` / `ended`를 계산한다.

### 1.6 일일 운행 기록 `workData[YYYY-MM-DD]`

전역 `workData`는 **현재 `activeLogId` 한 대분만** 메모리에 있다. 다른 차량은 저장소를 그때그때 읽는다.

날짜 값 형태:

```text
{
  isOff: boolean,
  fixedCount: number,          // 고정노선 총 횟수 (매출·세금계산서가 이 숫자만 봄)
  palletCount: number,
  maintItems: [],
  fuelItems: [],
  miscItems: [],
  callDetails: [],
  fixedRouteCounts: { [routeId]: number },  // 노선 칩 원탭 카운트. autoSave가 레코드를 통째로 재작성하므로 빠지면 유실
  dailyDistance?: number       // 레거시. 지금은 콜상세 distanceKm 합이 있으면 그걸 우선
}
```

레거시: 값이 문자열 `'off'`이면 `normalizeLegacyData()`가 위 객체로 바꾼다. `callDetails`/`fuelItems`/`miscItems` 없으면 빈 배열 채움.

**`callDetails[]` (운송 1건, 배열 인덱스가 식별자)**

- 구간/금액: `loadLoc`, `unloadLoc`, `fare`, `client`, `clientId`, `remarks`, `cargoTonnage`, `workDate`
- `commissionSnapshot`: `{ enabled, type, value }` — 저장 시점 거래처 수수료. 이후 거래처 수정이 소급되지 않음
- 시간/거리: `departureTime`, `arrivalTime`, `distanceKm`, `startOdometer`, `endOdometer`
- `vatExempt`, `insuranceFee`, `platform`, `receipt`
- 수금: `paymentStatus` (`'미수'` 등 레거시) + `payments[]`: `{ id, amount, paidAt, note }`
  - `getDetailPaymentSummary`가 `paid` | `partial` | `unpaid`를 계산. 미수금 화면과 일지 토글이 이 원장을 공유
- `paymentDueDate`

**`maintItems[]` / `miscItems[]`**: `{ name, fare, mileage?, category, payment }` (`payment` 기본 `'카드'`)

**`fuelItems[]`**: `{ cost, subsidy, liter, mileage, type }` (`type` 예: `'주유'`)

빈 날(휴무도 횟수도 항목도 없음)은 키 자체를 `delete`한다.

### 1.7 세금계산서 `taxInvoiceRecords[]`

id 규칙: `getTaxInvoiceRecordId(monthKey, partyKey, flow)` → 보통 `flow|monthKey|partyKey`.

필드 요약: `id`, `flow` (`sales` | `purchase` | `commission`), `partyKey`, `partyType` (`client` | `driver`), `logId`/`carNumber`, `monthKey`, `clientName`, 공급받는 자 정보(`clientBizNumber`, `clientRepresentative`, `clientEmail`, `clientAddress`, `clientBizType`, `clientBizItem`), `issueDate`, `itemName`, `remark`, `status` (`draft` | `issued`), `updatedAt`, 금액 필드(`supplyAmount` 등 그룹에서 합성), `supabaseId`.

발행 흐름은 운행 기록에서 월별 그룹을 다시 만들고, 저장된 draft/issued와 머지한다.

### 1.8 정규화 미러 (로컬 전용 2차 스키마)

`buildNormalizedEntitySnapshot()`이 레거시 저장소를 관계형처럼 펼쳐 `entity*` 키에 다시 쓴다. ID는 결정론적 FNV 해시(`createNormalizedId`). React 이전의 서버 스키마가 아니라 **백업/내부 미러**.

키: `normalizedSchemaMeta`, `entityUsers`, `entityVehicles`, `entityDailyLogs`, `entityTransportDetails`, `entityMaintenanceRecords`, `entityFuelRecords`, `entityMiscExpenseRecords`, `entityClients`, `entityTaxInvoices`. 백업 JSON 키 집합(`APP_BACKUP_JSON_KEYS`)에는 `entityMiscExpenseRecords`가 빠져 있다.

`normalizedUserId` (`usr_...`)는 미러용 로컬 유저 id.

### 1.9 그 외 localStorage 키

| 키 | 내용 |
|---|---|
| `theme` | 다크/라이트 (계정 전환 시에도 안 지움) |
| `taxInvoiceRecords` | 세금계산서 |
| `messageTemplateCustomBodies` | 문자 3종 커스텀 본문 배열 |
| `reportShareMessagePattern` | 내역서 공유 SMS |
| `supportInquiries` | 고객센터 문의 |
| `dismissedReceivableNotifications` | 스와이프 무시한 연체 알림 키 |
| `lastOverdueReceivableAlert` | 연체 토스트 중복 방지 |
| `lastBackupAt` | 마지막 백업 ISO |
| `lastHydratedSupabaseUserId` | 계정 전환 시 캐시 클리어 기준 |
| `supabaseMigrationDone` | 로컬→클라우드 1회 마이그레이션 |
| `supabaseAccountEverCreated` | 가입 이력 플래그 |
| `workData_*` / `linkedDriverWorkData_*` | 서브·고용기사 사본 |

Auth 세션은 `createClient(..., storageKey: 'runlog-supabase-auth')`.

### 1.10 런타임(메모리) 상태 — React가 대체해야 할 것들

`appState` 객체가 있으나 **별칭 `let`과 재할당이 어긋난다.** `openModal`만 `appState.selectedDateKey`를 맞춘다. `switchCarLog`의 `workData = loadWorkDataForLog(...)`, `openModal`의 `currentTemp* = []`는 `appState`를 갱신하지 않는다. `viewDate` 등은 Date **뮤테이션**이라 객체 정체성은 공유된다. React에선 이 이중 소스를 버리고 단일 store가 필요하다.

**네비 / 로그 컨텍스트**

- `activeLogId`: `'main'` 또는 서브 차량번호. `document.body.sub-car-log-active`와 연동
- `previousPage`: `'main'` | `'report'` | `'myPage'` 등 설정 화면 복귀
- `utilityReturnPage` / `utilityReturnLogId`
- `personalInfoReturnPage` / `personalInfoReturnLogId`
- `myPageReturnLogId`, `settingsReturnLogId`
- `driverConnectionReturnPage`
- `activeLinkedDriverId`

**달력·일지 편집 세션**

- `viewDate`, `maintViewDate`, `fuelViewDate`, `miscViewDate` (`Date`)
- `selectedDateKey` (`YYYY-MM-DD` | null)
- `isOffSelected`
- `currentTempMaintItems` / `currentTempFuelItems` / `currentTempMiscItems` / `currentTempCallDetails`
- `currentTempFixedRouteCounts`: `{ [routeId]: count }`
- `calendarCells`: 42칸 DOM 노드 배열 (재렌더하지 않고 제자리 패치)
- `isDetailReportView`, `currentDetailClientFilter` (`'ALL'` 또는 거래처명)
- `activeLocationShortcutTarget`: `'load'` | `'unload'`

**금융 UI**

- `taxInvoiceViewMonth` (`YYYY-MM`), `currentTaxInvoiceTab` (`draft`|`issued`), `currentTaxInvoiceFlow`
- `currentReceivableTab` (`monthly`|`due`), `currentReceivableDetail`
- `currentRevenueTab` (`monthly`|`yearly`), `revenueViewYear`, `revenueViewMonth` (0–11), `currentRevenueScope` (`owner` 등)
- `linkedDriverRecordViewDate`

**모달/폼 인덱스**

- `editingCarIndex` (`-1`이면 신규; 저장 실패 재시도 시 중복 push 방지용으로 즉시 인덱스화)
- `editingClientIndex`
- `clientModalOpenedFromCallDetail`
- `linkedDriverFormAutoFilledVehicle`
- `confirmCallback` (확인 모달 1개 슬롯 — 중첩 confirm 불가)
- `onboardingWizardState`, `currentSignupRole`

**저장 인프라**

- `activeSaveActions`: `Set` (버튼 더블클릭 가드)
- `backgroundSaveStates`: `Map<key, { timer, running, runningPromise, nextAction }>` — 디바운스 큐
- `failedBackgroundSaveKeys`
- `toastHideTimer`, `autoSaveStatusHideTimer`
- `clientPressTimer`, `clientDragState`
- `__supabaseWorkDataSyncedSnapshot`: 세션 한정 `{ [logId]: { [date]: json } }` diff. 계정 전환 시 비우지 않으면 다른 계정 운행이 “이미 동기화됨”으로 스킵됨
- `supabaseHydrationCompleted`: false면 설정 화면 입력 lock

**기타 플래그**

- `mobileBackIntegrationReady`, `mobileNativeExitRequested`
- `PINNED_LOCATION_LIMIT` (10), `LOCATION_SHORTCUT_DISPLAY_LIMIT` (12), `RUN_COUNT_PRESET_MAX` (10)
- `TODAY_LOG_REMINDER_HOUR` (18), `BACKUP_REMINDER_DAYS` (14 / 클라우드 동기 시 30)

### 1.11 화면 상태 (DOM 클래스 = 라우터)

한 번에 `.page:not(.hidden)` 하나 + 모달 스택. 페이지 id:

`loginPage`, `onboardingPage`, `mainPage`, `reportPage`, `taxInvoicePage`, `myPage`, `billingSettingsPage`, `noticePage`, `messageSettingsPage`, `personalInfoPage`, `carManagementPage`, `driverConnectionManagementPage`, `linkedDriverManagementPage`, `linkedDriverClientsPage`, `clientManagementPage`, `receivablesManagementPage`, `receivableDetailPage`, `revenuePage`, `maintManagementPage`, `settingsPage`, `subCarSettingsPage`, `customerCenterPage`, **`workModal`(`.page`이면서 일지 전체화면)**.

모달: `callDetailModal`, `detailReportSelectModal`, `maintFuelSelectModal`, `fuelDetailModal`, `maintRecordModal`, `carModal`, `carDriverInviteModal`, `reportCarSelectModal`, `reportShareModal`, `clientModal`, `driverClientFixedRouteModal`, `taxInvoiceModal`, `confirmModal`.

부가 UI: `sideMenu.open`, `notificationPanel.open`, `pdfMenuDropdown.show`, `splashScreen`, `body.account-flow-active`, `body[data-theme=dark]`, `body.pdf-export-mode`.

하단 탭 `setActiveNav`는 인덱스 하드코딩: 0 홈, 1 일일운행, 2 매출, 3 마이페이지.

### 1.12 파생 상태 (저장하지 않고 계산)

미수금 목록, 연체 D-day, 월/년 매출, 기사 정산 합, 세금계산서 소스 그룹, 알림 뱃지 수, 달력 뱃지/미수 점, 내역서 HTML. 콜상세 `payments`와 `paymentStatus`가 어긋나면 화면이 갈라진다 — React에서는 원장 하나만 두고 status는 selector로 두는 편이 안전하다.

---

## 2. 바닐라 DOM 조작 트릭 전수조사

### 2.1 페이지/모달: `hidden` + `display` 혼용

- 대부분의 화면: `classList.add/remove('hidden')`. `hideAllPages()`는 `.page` 전부 hidden, `workModal`도 따로 hidden, 사이드메뉴/PDF/알림벨/서브차량 뒤로가기 display none.
- 설정 접기 `setSettingsGroupExpanded`: `display` / `maxHeight` / `opacity` / `overflow`를 인라인으로 애니메이트. 숨겨진 부모면 애니 없이 최종값만. 타이머는 `element._settingsCollapseTimer`.
- 차량 모달 구역: `style.display = 'none'|'block'` (`driverBasicInfoFields`, `carBusinessInfoFields`, `logToggleContainer`).
- 일지 섹션: `modalFixedSection` 등 `style.display`로 설정 토글 반영.
- 콜상세 옵션: `timeOn` 등이 `grid`/`none`.
- 스플래시: `opacity` 트랜지션 후 `display:none`.
- `body` 클래스: `account-flow-active`, `sub-car-log-active`, `pdf-export-mode`. 테마는 `data-theme`.

React에서 `hidden` CSS와 `style.display`가 같은 노드에 겹치면 레이스가 난다. 특히 인라인 패널 `maxHeight`는 클래스만으로는 재현이 안 된다.

### 2.2 모달을 다른 부모로 강제 이동 (가장 큰 React 지뢰)

정비/주유/선택 모달은 **문서 루트에 정의**되어 있으나, 일지(`#workModal`)가 열려 있으면 `#maintFuelInlineHost` 안으로 `appendChild`한다.

- `openMaintFuelInlinePanel(panel)`: 다른 3개 패널 hidden 후 `host.appendChild(panel)`, `inline-expanded` + `is-visible`, `host.maxHeight = panel.scrollHeight`, rAF + 80ms 후 재측정, `scrollIntoView`.
- `restoreMaintFuelModalToRoot(panel)`: `parentElement !== document.body`이면 `document.body.appendChild(panel)`. 관리 화면에서 열 때 호스트에 남아 있으면 레이아웃이 깨지므로 원위치.
- `closeMaintFuelInlinePanel`: maxHeight 0 → 420ms 후 hidden. `hideMaintFuelInlinePanelImmediately`는 애니 없이 접기(정비↔주유 전환).
- 백드롭 닫기(`initBackdropDismissModals`)는 `event.target === modal`이고 **`inline-expanded`가 아닐 때만** 닫음. 인라인일 때는 오버레이 클릭이 배경 닫기로 안 먹게 한 것.

콜상세도 동일 패턴: `#callDetailModal`을 `#callDetailInlineHost`로 옮김. `ResizeObserver`를 노드에 `_inlineResizeObserver`로 붙여 `scrollHeight+4`를 host maxHeight에 반영. 닫을 때도 420ms. **원 부모로 되돌리는 restore는 콜상세에는 없음** (항상 인라인 전제).

React Portal로 옮기려면 “같은 모달 인스턴스가 두 자리 중 하나에만 존재”와 maxHeight 측정 타이밍을 재현해야 한다. 언마운트하면 observer/원본 노드 참조가 끊긴다.

### 2.3 `innerHTML` 대량 재작성 + 인라인 `onclick`

목록 UI 대부분이 `container.innerHTML = 템플릿`. 콜백은 문자열 `onclick="openMaintRecordModal('2026-08-01', 0)"` 형태(`MAINT_FUEL_KIND_CONFIG.editAction`). 거래처명 등 사용자 입력은 `escapeDetailText`를 쓰는 곳과 안 쓰는 곳이 섞여 있다.

예외적으로 미수금 상세 버튼은 innerHTML 후 `querySelectorAll` + `addEventListener`로 바인딩(주석: 속성 이스케이프만으로는 부족). React 이전 시 **이벤트 위임 vs dangerouslySetInnerHTML** 결정이 필요하다.

달력은 innerHTML을 안 쓰고 **42칸을 재사용**: 뱃지 `querySelectorAll('.work-badge...').forEach(b => b.remove())` 후 `appendChild`로 다시 꽂음. `calendarCells`가 DOM 수명과 묶여 있다.

### 2.4 네이티브 컨트롤을 숨기고 body에 메뉴를 띄움 (`ui-widgets.js`)

`select[data-app-dropdown]`, `input[type=date|time]`, `input[data-app-autocomplete]`를 래핑:

1. `parentNode.insertBefore(wrapper, el)` 후 wrapper 안으로 원본 이동.
2. 트리거 버튼 생성, **메뉴 `div`는 `document.body.appendChild`** (overflow:hidden 부모를 탈출).
3. `getBoundingClientRect` + `visualViewport`로 `left/top/width/maxHeight` 절대 좌표.
4. 원본 `select`/`input`은 숨긴 채 값만 유지. 옵션 클릭 시 `select.value = ...; dispatchEvent(new Event('change', { bubbles: true }))`.
5. date/time은 값 반영 후 **`setTimeout(0)`으로 한 번 더 `input.value`를 덮어씀** — 브라우저 네이티브 픽커/마스크가 값을 되돌리는 것 방어.
6. 라벨 클릭은 `preventDefault` + `stopPropagation` 후 트리거 click (네이티브 date 팝업 차단).
7. 열린 메뉴 위치는 `wrapper._dropdownMenu`, `wrapper._temporalMenu`, `input._autocompleteMenu` 등 **DOM 노드 expando**.
8. `select` 옵션 변경은 `MutationObserver(childList, subtree, attributes)`로 트리거 문구 동기화.
9. 연/월 셀렉트는 `yearSelect.parentElement._dropdownSync?.()`를 `buildCalendar`가 직접 호출.

React `<select>` 재렌더와 이 래핑이 동시에 돌면 `data-dropdown-ready`가 있어도 래퍼가 중복되거나 메뉴가 body에 고아로 남는다. 커스텀 픽커를 React 컴포넌트로 다시 짜는 편이 안전하다.

### 2.5 거래처 롱프레스 드래그 재정렬

- 520ms 타이머 후 `startClientDrag`. 카드에 `client-dragging`, 컨테이너 `client-drag-active`.
- `document.elementFromPoint(window.innerWidth / 2, pointerY)`로 중앙 세로선 위 카드를 찾아 `insertBefore`로 **실제 DOM 순서 변경**.
- FLIP: 이전 `getBoundingClientRect` vs 현재 차이로 `element.animate(translate3d...)`. `getAnimations().forEach(cancel)`.
- 화면 가장자리면 `window.scrollBy`. `prefers-reduced-motion`이면 애니 생략.
- 드롭 시 DOM 순서 → `dataset` 인덱스로 `settings.clients` 재배열 (`scopedToVehicleNumber`는 뒤에 붙임).

React 리스트를 key로 그리면 DOM insertBefore와 충돌한다. 드래그 중엔 uncontrolled DOM이거나 dnd 라이브러리로 대체해야 한다.

### 2.6 알림 스와이프 삭제

`pointerdown/move/up/cancel` + `setPointerCapture`. `translateX` / `scale` 인라인. 임계값 `min(110, width*0.34)` 넘으면 `translateX(±innerWidth)` 후 height 0 collapse. `dataset.swipeDirection`. 리스트가 비면 innerHTML로 empty 문구.

패널 다시 그릴 때마다 리스너를 다시 붙인다(`initNotificationSwipeInteractions`). 중복 바인딩 위험이 있다.

### 2.7 확인 모달 / 토스트 / 문자 시트

- `confirmModal`: 전역 `confirmCallback` 하나. `innerText`로 메시지. `dataset.tone`. 회원탈퇴는 모달 두 개를 **setTimeout으로 다음 태스크에 연다**(첫 닫기가 둘째까지 닫는 문제).
- 토스트: 타이머로 hide.
- `openMessageTemplate`: 기존 `#messageTemplateSheet` `remove()` 후 **동적 생성해 `document.body.appendChild`**. 닫을 때 노드 제거.

### 2.8 파일 다운로드 · 외부 스크립트

PDF: `body.pdf-export-mode` → 리포트 DOM을 내보내기용으로 다시 그림 → `html2pdf.js` → 모드 해제 후 화면용으로 또 그림. 50–80ms `setTimeout` 대기.

이미지/CSV/백업: `<a download>`를 body에 붙이고 `click()` 후 `remove()`, `URL.revokeObjectURL`은 1초 뒤.

세금계산서 엑셀: `document.head.appendChild(script)`로 ExcelJS CDN. `window.ExcelJS` 로드 대기.

SMS: `window.location.href = sms:...`.

### 2.9 달력 셀 클릭 / 히스토리 가짜 스택

셀은 생성 시 한 번 `addEventListener('click')`. `data-date-key`가 있을 때만 `openModal`.

모바일 뒤로가기: `history.replaceState({ appBackRoot })` + `pushState({ appBackGuard })`. `popstate`마다 사이드메뉴 → 알림 → 마지막 `.modal-overlay:not(.hidden)`의 “뒤로가기/취소” 버튼 **`.click()`** → `.page`의 뒤로가기 버튼 click → 서브로그면 `switchCarLog('main')`. 처리할 게 없으면 `history.back()`으로 앱 종료. 처리했으면 다시 `pushState`로 가드를 쌓음.

React Router와 **이중 히스토리**가 된다. SPA 라우터를 쓰면 이 가드를 끄거나 한쪽으로 통합해야 한다.

### 2.10 접근성 MutationObserver

`enhanceAccessibility`가 `img:not([alt])`, 라벨 없는 input에 `aria-label`. **`document.body` childList+subtree 전체 관찰** — React 재렌더마다 전 폼을 다시 훑는다.

추가로 `class` 속성 observer가 `.app-temporal` `_temporalSync`를 돌림 (페이지 hidden 전환 시 트리거 문구 갱신).

### 2.11 기타

- `clientPaymentTerm.parentElement._dropdownSync?.()` — 위젯 expando에 의존.
- `scrollIntoView` (기사 연동 카드, 인라인 패널).
- `host.style.maxHeight = '0px'` vs 콘텐츠 높이: CSS transition과 연동.
- 알림 무시 애니메이션 중 `offsetHeight`를 읽어 height를 px로 고정한 뒤 0으로.
- PDF/리포트는 같은 DOM id를 export 전후로 두 번 채움 (`isForExport`).

---

## 3. React 이전 시 지뢰가 될 전역 변수 · 이벤트 리스너

### 3.1 설계 전제: 전역 함수 + HTML `onclick`

수백 개의 `function foo()`가 스크립트 스코프 = `window.foo`. `index.html`은 `onclick="showMain()"`, `onchange="changeYearMonth()"` 등 **문자열 핸들러**가 매우 많다. React로 옮기면:

- 핸들러를 컴포넌트로 옮기는 순간 HTML 문자열이 깨진다.
- 반대로 `window.foo = foo`를 유지하면 클로저가 오래된 state를 잡는다(stale).
- innerHTML로 심은 `onclick="deleteMaintRecord('...', 0)"`는 인덱스 기반이라 재렌더 후 인덱스가 어긋난다.

### 3.2 모듈 최상위 `let` / `const` (싱글톤 스토어)

파일 로드 시 한 번만 만들어지고, 로그아웃해도 **페이지 리로드가 없으면 안 비워진다.** `clearAccountScopedLocalCache`가 `__supabaseWorkDataSyncedSnapshot`만 비우고, `workData` / `currentTemp*` / `editingCarIndex` / 금융 탭 상태는 그대로일 수 있다.

특히 위험한 것:

| 심볼 | 이유 |
|---|---|
| `workData` + `activeLogId` | 차량 전환 시 통째로 교체. React Query와 이중 소스 |
| `currentTemp*` 다섯 종 | 일지 모달의 draft. `autoSaveWorkRecord`가 전역 `workData[date]`를 통째 교체하며 **배열 참조를 그대로 넣음** (`maintItems: currentTempMaintItems`). 이후 temp를 mutate하면 저장된 객체도 mutate |
| `confirmCallback` | 한 슬롯. 연속 confirm 시 덮어씀 |
| `appState` vs `let` 별칭 | 재할당 불일치 |
| `calendarCells` | DOM 노드 보유. Strict Mode 더블 마운트 시 유령 노드 |
| `backgroundSaveStates` / `failedBackgroundSaveKeys` | 디바운스 타이머가 언마운트 뒤에도 돔을 만짐 (`#saveStatusIndicator`) |
| `editingCarIndex` | 모달 세션. 차량 목록 리렌더와 경합 |
| `clientDragState` | document mousemove가 컴포넌트 밖으로 나감 |
| `supabaseHydrationCompleted` | 설정 lock. hydrate 전에 `setUserSettings` 호출 금지(빈 설정으로 서버 덮어쓰기 실버그) |
| `__supabaseWorkDataSyncedSnapshot` | 계정 전환 누락 동기화 |
| `window.supabaseClient`, `window.__supabaseReadyPromise`, `window.SUPABASE_*` | ESM 모듈과 클래식 스크립트 브릿지 |
| `window.ExcelJS` | 동적 스크립트 |
| `currentSignupRole`, `onboardingWizardState` | 인증 플로우 |
| 금융 `currentTaxInvoice*` / `currentRevenue*` / `currentReceivable*` | 페이지 unmount 없이 hidden만 해서 값이 남아 “돌아왔을 때 이전 월”이 의도된 동작 |

### 3.3 DOM expando (노드에 붙는 숨은 상태)

React가 DOM을 갈아끼우면 전부 사라지거나, 반대로  ple된 노드에 남는 다.

- `wrapper._dropdownMenu`, `_dropdownSync`, `_temporalMenu`, `_temporalSync`, `_temporalPosition`
- `input._autocompleteMenu`, `_autocompleteClose`, `_autocompletePosition`
- `element._settingsCollapseTimer`
- `callDetailModal._inlineResizeObserver`
- `select.dataset.dropdownReady` / `temporalReady` / `autocompleteReady` / `backdropDismissReady`
- `modal.dataset.tone`, `shell.dataset.swipeDirection`, 카드 `dataset.pinned` / `dataset.dateKey`

### 3.4 window / document 리스너 (해제가 거의 없음)

**저장 플러시 (script.js, 앱 수명 전체)**

- `window` `online` → `flushAllBackgroundSaves`
- `document` `visibilitychange` (`document.hidden`일 때 flush)
- `window` `pagehide` → flush  
  모바일에서 setTimeout 디바운스가 죽어서 클라우드 미반영이던 문제를 막기 위한 것. React `useEffect` cleanup에서 빼먹으면 다시 발생하고, Strict Mode에선 이중 등록된다.

**부트**

- `window` `load`: 스플래시, 세션 보정, `hydrateFromSupabaseAndMigrate`, `showMain`/`showLocalLoginPage`. `isLoggedIn`만 고칠 때는 **`setUserSettings` 금지** (localStorage 직접 기록).

**히스토리**

- `window` `popstate` (`setupMobileBackIntegration`). `pushState`로 스택을 오염시킴.

**위젯 (ui-widgets.js, 캡처 스크롤 포함)**

- `document` `click` — 열린 드롭다운/데이트픽커/자동완성 바깥 클릭 닫기
- `window` `resize`, `scroll`(capture true, 메뉴 내부 스크롤은 제외)
- `visualViewport` `resize` / `scroll`
- `document` `DOMContentLoaded` — 위젯 init + 백드롭 + 모바일 백 + temporal class observer
- `MutationObserver` × N: 각 select마다 1개 + body class + body childList(접근성)

**거래처 드래그**

- 카드 `touchstart` / mousedown 계열
- 드래그 중 `document` `mousemove` / `mouseup` (끝난 뒤 제거하는지는 `onUp` 구현에 의존 — 이전 시 누수 확인 필요)

**알림**

- 항목별 `pointerdown/move/up/cancel` / `lostpointercapture`. 리렌더 시 재바인딩.

**달력**

- 42칸 click (initCalendarDOM 1회). React가 `#calendar-cells`를 비우면 리스너와 `calendarCells`가 무효.

**Supabase**

- `window` `supabase-ready` (once) → 클라이언트 Promise resolve.

**동적**

- Excel 스크립트 `load`/`error`
- 인라인 콜상세 `ResizeObserver` (disconnect 없음 — 노드가 body에 남아 있는 한 유지)
- 기사 거래처 모달: `MutationObserver` on `#clientModal` class, hidden 되면 disconnect + 빈 거래처 청소
- 드롭다운 옵션 버튼 click, 자동완성 mousedown `preventDefault`(포커스 유지)

**가짜 네이티브 이벤트**

위젯이 `input`/`change`를 `bubbles: true`로 재발행. React `onChange`는 합성 이벤트라 네이티브 `dispatchEvent(new Event('change'))`를 **못 들을 수 있다.** 커스텀 픽커 값을 React state에 직접 넣어야 한다.

### 3.5 타이머 · 비동기 경합

- `queueBackgroundSave(..., 320|600ms)` / `flush` 재귀. 언마운트 후 `updateSaveStatusIndicator`가 null id면 return하지만, 저장 자체는 계속됨 (원함). React state로 스피너를 묶으면 언마운트 경고.
- `executeApiRequest` 10초 AbortController.
- 차량 uuid 대기: 500ms × 5. 실패 시 throw해야 토스트가 남. 조용히 return하면 “저장 성공처럼 보이는데 서버에 없음”.
- 인라인 패널 80ms / 420ms timeout. 그 사이 다른 화면으로 가면 패널이 잘못된 부모에 남음 → `restoreMaintFuelModalToRoot`가 필요한 이유.
- 알림/토스트/설정 접기/스플래시 타이머.
- `linkedDriver` 비동기 렌더: 응답 도착 시 `activeLinkedDriverId`와 페이지 hidden 여부를 다시 검사. React면 abort/ignore stale response.

### 3.6 `index.html` / 라이브러리 전역

- `html2pdf` 번들 전역.
- `onclick`이 `runSaveAction(this, 'local-login', executeLoginAction)`처럼 **DOM 버튼 참조 `this`**를 넘김. React에선 `event.currentTarget`.
- `onerror="this.style.display='none'"` 배너 이미지.

### 3.7 이전 시 권장 분리 (조사 결론)

1. **데이터 레이어**: `userSettings` / `workData[logId][date]` / `taxInvoiceRecords` / 동기화 큐를 React 바깥 스토어(또는 모듈 싱글톤)로 고정. 컴포넌트는 구독만.
2. **일지 draft**: `currentTemp*`를 모달 로컬 state로 옮기되, 저장 시 **deep copy** (`openModal`은 JSON clone을 쓰지만 `autoSave`는 참조를 넣음).
3. **Portal**: 콜상세·정비/주유 인라인 이동을 `createPortal` + 명시적 `variant="inline"|"modal"`로 대체. 동일 노드 appendChild는 폐기.
4. **위젯**: body 절대 좌표 드롭다운/데이트픽커는 React 컴포넌트로 재구현. MutationObserver 제거.
5. **히스토리**: `setupMobileBackIntegration`과 React Router 중 하나만.
6. **부트**: hydrate 완료 전 settings 업서트 금지. `online`/`visibilitychange`/`pagehide`는 앱 루트에서 1회만.
7. **식별자**: 콜상세/정비/주유는 배열 인덱스 대신 `id`를 저장 시점에 부여. innerHTML onclick 제거.

이 세 가지(데이터 모양, DOM 이식, 전역 수명)를 그대로 컴포넌트 state에 욱이면, 차량 전환·인라인 모달·클라우드 디바운스가 가장 먼저 깨진다.
