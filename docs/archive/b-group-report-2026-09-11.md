# B그룹 슬라이스 아카이브 (2026-09-11) — 동결

> `docs/report.md`에서 옮김. B그룹 ①산재보험료·②즐겨찾기 칩 `[x]` 완료,
> ③거래처 CRUD 제한(가짜 개념 기반) 완전 폐기, 이어서 발견된 진짜 버그
> "콜상세 거래처 +추가 버튼" `[x]` 완료까지 전부 끝난 뒤 동결. 현재 진행 중인
> 착수지시서는 `docs/report.md` 참고.

---

# (원본 그대로) docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(일일운행 2부: 2중 스크롤 + 콜상세 폼 카드 이탈,
> react-app `387e3c3`, 작업묶음 전체 보리 `[x]` 2026-09-10) 상세는
> `docs/archive/day-log-part2-scroll-card-bugs.md`로 옮김(동결).
> 일일운행 1부(콜상세 폼 CSS 4건, `c6c831b`)는
> `docs/archive/report-snapshot-2026-09-10.md` §4 참고.

---

## B그룹 재분할 (보리 확인 2026-09-11)

`ui-comparison-report.md` §1-B "B그룹"(즐겨찾기 칩·거래처 +추가 버튼·산재보험료)을
조사해 보니 셋의 난이도·성격이 서로 달라 별도 슬라이스 3개로 나눈다. 진행 순서
(보리 확인 2026-09-11): **① 산재보험료 → ② 즐겨찾기 칩 → ③ 거래처 +추가 버튼**.

- ①은 데이터/계산 로직이 이미 다 연결돼 있어 가장 단순.
- ②는 신규 저장 필드(`settings.pinnedLocations`) + 랭킹 로직이 필요.
- ③은 직원기사 계정의 거래처 등록 제한(권한모델)까지 옮겨야 해 가장 무거움.

---

## 이번 슬라이스 — ① 산재보험료 필드 추가

### 조사 결과 (원본 vs react-app)

원본([index.html:1729-1733](ubiquitous-parakeet/index.html:1729))은 콜상세 폼의
계산서 섹션 안에 "부가세 해제" 토글과 "입금 예정일" 사이에 산재보험료 입력창을
두고, [script.js:4094](ubiquitous-parakeet/script.js:4094)·4100·4141·4146에서
그 날짜의 합계에 반영(총 운송료 - 수수료 - **산재보험료** + 부가세 = 합계)한다.

react-app은 데이터 계층은 이미 다 준비돼 있다 — `domain/callDetail.js`의
`CallDetailLike.insuranceFee`, `lib/callDetailSchema.js`의 `ALLOWED_CALL_DETAIL_KEYS`
+ 금액 검증, `domain/financeCore.js`의 `getMonthlyDriverTotals`(월 정산 집계),
정산 화면(`SettlementSummaryCard.jsx` 등)까지 `insuranceFee`/`insuranceAmount`를
전제로 이미 동작한다. **딱 두 구멍만 있다:**

1. 사용자가 값을 입력할 UI 자체가 없다 (`CallDetailForm.jsx`에 입력창 없음).
2. 폼이 저장을 만드는 경로(`domain/call-details.js`의 `buildCallDetail`)가
   `insuranceFee`를 최종 저장 객체에 옮기지 않는다 — **입력창만 추가하면
   입력한 값이 저장 시 조용히 사라지는 상태**가 된다(허용 목록엔 있지만 여기서
   빠짐).
3. 일지 화면의 "세부 내역 합계" 카드(`CallDetailList.jsx`)가 산재보험료 총액을
   표시하거나 합계에서 빼지 않는다 — 원본은 이걸 보여준다.

### 목표 상태

원본과 동일하게: 폼에 입력창 추가 → 저장 시 값이 실제로 남음 → 일지 하루
합계에 "산재보험료 -N원" 줄이 뜨고 총합계에서 빠짐.

### 건드릴 파일 (정확히 4개)

1. **`react-app/src/domain/call-details.js`** — `CallDetailDraft` typedef에
   `@property {string} [insuranceFee]` 추가 + `buildCallDetail`이 반환하는
   `item`에 `insuranceFee: String(draft.insuranceFee ?? existing?.insuranceFee ?? '').trim(),`
   한 줄 추가(바로 위 `receipt` 줄과 동일한 패턴).
2. **`react-app/src/components/day-log/callDetailFormHelpers.js`** —
   `emptyDraft`에 `insuranceFee: ''` 추가, `draftFromDetail`에
   `insuranceFee: formatCurrencyInput(item.insuranceFee)` 추가(둘 다 `receipt`
   바로 옆에 한 줄씩).
3. **`react-app/src/components/day-log/CallDetailForm.jsx`** — `settings.paymentOn`
   블록 안, 부가세 해제(`call-vat-row`)와 `payment-due-date-box` 사이에
   원본과 동일한 위치로 입력창 추가:
   ```jsx
   <div className="call-inline-field">
     <label htmlFor="callInsuranceFee">산재보험료</label>
     <input id="callInsuranceFee" className="input-box" inputMode="numeric" placeholder="금액입력" value={draft.insuranceFee} onChange={(e) => setDraft({ ...draft, insuranceFee: formatCurrencyInput(e.target.value) })} />
     <span>원</span>
   </div>
   ```
   (`settings.paymentOn`이 꺼졌을 때 보이는 `!settings.paymentOn` 대체 블록
   170~178줄은 원본에서도 이 섹션 전체가 함께 숨겨지는 대상이라 무관 — 이번
   슬라이스에서 손대지 않음.)
4. **`react-app/src/components/day-log/CallDetailList.jsx`** — 하루 합계 카드에
   원본 script.js:4141/4146과 동일한 규칙으로 산재보험료 반영:
   ```js
   import { parseCurrencyValue } from '../../lib/money.js'
   // ...
   const totalInsuranceFee = details.reduce((sum, item) => sum + parseCurrencyValue(item.insuranceFee || ''), 0)
   const grandTotal = callFare - totalCommission - totalInsuranceFee + callVat
   ```
   그리고 `totalCommission > 0 && (...)` 줄 바로 아래에 같은 패턴으로
   ```jsx
   {totalInsuranceFee > 0 && (
     <div className="commission-row"><b>산재보험료</b><strong>- {totalInsuranceFee.toLocaleString('ko-KR')}원</strong></div>
   )}
   ```
   추가(`grandTotal` 계산식도 위처럼 `- totalInsuranceFee`를 넣어야 함 — 안 넣으면
   화면엔 보이는데 합계엔 안 빠지는 반쪽짜리가 됨).

### 안 건드릴 것

- `financeCore.js`·`financeTaxInvoiceGroups.js`·정산 화면(`SettlementSummaryCard.jsx`
  등) — 이미 `insuranceFee`/`insuranceAmount`를 올바르게 소비하고 있어 무변경.
- `lib/callDetailSchema.js` — 이미 `insuranceFee`를 허용·검증하고 있어 무변경.
- 즐겨찾기 칩·거래처 +추가 버튼 — 다음·다다음 슬라이스.

### §8 4대 질문

1. 구독(`useOwner*`) 아님 — `DayLogPage`의 로컬 `draft` state(폼 입력)와 순수
   도메인 함수(`buildCallDetail`) 문제.
2. 화면에 보이는 값은 draft(폼 입력 중)와 저장된 `callDetails` 배열 항목 — 기존과
   동일한 출처, 새 필드 하나만 그 출처를 통해 흐르게 함.
3. 쓰기 창구는 기존 `handleSaveCall` → `upsertCallDetail` → `buildCallDetail`
   그대로. 새 창구 없음.
4. hydrate·디바운스·동시편집 무관 — 이미 허용 목록에 있는 필드라 hydrate/
   Supabase 직렬화 쪽은 무변경.
→ 신규 상태 저장소·레이어 없음.

### 검증 방법

- CI 자동(test·typecheck·build).
- 감시관 브라우저 실측:
  1. 일일운행 → 콜상세 추가/수정 폼에서 "부가세 해제" 밑, "입금 예정일" 위에
     "산재보험료" 입력창이 보이는지.
  2. 금액 입력 후 저장 → 다시 그 항목을 열어 값이 그대로 남아 있는지(버그2 —
     저장 시 사라지는 문제가 실제로 고쳐졌는지 핵심 확인).
  3. 하루 세부 내역 합계 카드에 "산재보험료 - N원" 줄이 뜨고, "세부 내역 합계"
     숫자가 그만큼 줄어드는지(운송료 - 수수료 - 산재보험료 + 부가세).
  4. 산재보험료를 0/빈 값으로 두면 그 줄 자체가 안 보이는지(원본과 동일,
     `totalInsuranceFee > 0` 조건).
  5. 기존 콜상세(산재보험료 없던 데이터) 목록·합계가 회귀 없이 그대로인지.

**→ 착수 전 보리 확인 필요: 위 건드릴 파일 4개(예정보다 1개 많음 — 저장 경로
`call-details.js`를 안 고치면 입력값이 사라지는 걸 조사 중 발견) + 목표 동작
그대로 진행해도 될까요?** `[x]` 보리 확인 2026-09-11 — 작업자 전달 완료.

## 구현 결과 + 감시관 검증 (2026-09-11)

작업자 커밋 react-app `1de2537`(`feat: 콜상세에 산재보험료 입력·저장·일일 합계
반영`), 보리 push 완료. CI(run `34553167623`) **success**(테스트·타입검사·빌드
전부 통과).

**§5 체크리스트:**

1. **범위 준수** — `git show --stat`: 지시한 정확히 4개 파일만 변경
   (`call-details.js`, `callDetailFormHelpers.js`, `CallDetailForm.jsx`,
   `CallDetailList.jsx`), 15줄 추가·1줄 변경. diff 내용도 착수지시서에 적은
   코드와 위치까지 그대로 일치.
2. **몰래 증설 없음** — 새 파일·새 저장 키·새 durable/큐/레이어 없음. 기존
   `insuranceFee` 필드를 폼→저장→합계까지 배관 연결한 것뿐.
3. **타입 꼼수 없음** — `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as`
   전부 없음(grep 확인). JSDoc 프로퍼티 한 줄 추가만.
4. **200줄** — 4개 파일 전부 200줄 이내(최대 194줄, `CallDetailForm.jsx`).
5. **테스트 진실성** — 이번 diff는 테스트 파일을 건드리지 않음(삭제·약화
   없음). 기존 테스트가 CI에서 그대로 통과.
6. **문서 정합** — diff에 `.md` 없음(작업자가 코드만 수정).
7. **요구사항 충족** — 착수지시서의 목표 동작(입력창 위치, 저장 경로 연결,
   합계 반영) 코드상 전부 구현됨.

**감시관 브라우저 실측은 이번엔 미완료** — 로컬 `npm run dev`를 프리뷰로 띄웠으나
포트 자동감지가 실제 vite 포트(5174)와 안 맞아 접속에 시간을 썼고, 겨우 접속한
뒤에도 화면이 "저장 중..." 상태에서 멈춰 클릭이 반응하지 않아(환경 문제로 보임,
코드 결함인지는 미확인) 실제 조작 검증은 못 했다. **코드 리뷰(§5)는 이상 없음이나,
브라우저 실검증은 보리가 직접 확인해 주셔야 합니다.**

### 브라우저 실검증 순서 (보리)

1. `react-app`에서 `npm run dev` 실행 후 일일운행 → 아무 날짜나 클릭 → "+ 운행
   일지 추가".
2. "부가세 해제" 토글 밑, "입금 예정일" 위에 **"산재보험료"** 입력창이 보이는지.
3. 산재보험료에 금액(예: 5,000) 입력 후 저장 → 방금 만든 항목을 다시 열어
   **5,000이 그대로 남아 있는지** (이게 핵심 — 원래 저장 시 사라지는 버그가
   있었음).
4. 그 날짜의 "세부 내역 합계" 카드에 "산재보험료 - 5,000원" 줄이 뜨고,
   "세부 내역 합계" 금액이 그만큼 줄어 있는지.
5. 산재보험료를 비워둔 다른 항목은 그 줄 자체가 안 뜨는지.
6. 기존에 있던 다른 콜상세들(산재보험료 없음)이 평소처럼 보이는지(회귀 확인).

보리 브라우저 실검증 완료("브라우저확인완, 문제없음", 2026-09-11) — 위 6개 항목
전부 이상 없음.

**B그룹 ① 산재보험료 필드 — `[x]` 최종 확정 (2026-09-11).**

## 참고 — 다음·다다음 슬라이스 (착수 전)

- ③ 거래처 "+추가" 버튼 — 직원기사(고용/회사 정산) 계정의 거래처 등록 제한
  권한 로직(`isDriverManagedByOwnerForClients` 상당)을 함께 옮겨야 함.
- "부가세 해제" 레이블 16px 잔존 — B그룹 이후 별도 슬라이스.

---

## 이번 슬라이스 — ② 즐겨찾기 칩(상차지/하차지)

### 조사 결과 (원본 vs react-app)

원본([index.html:1637](ubiquitous-parakeet/index.html:1637),
[script.js:2075-2192](ubiquitous-parakeet/script.js:2075))은 상차지/하차지
입력란 밑에, **이 계정이 지금까지 입력한 모든 날짜**의 상/하차지를 "빈도 많은
순 → 동률이면 최근 순"으로 최대 12개 칩으로 보여준다. 칩엔 별표(☆/★)가 있어
최대 10개까지 "고정"할 수 있고(`settings.pinnedLocations`), 고정된 장소는
랭킹과 무관하게 항상 맨 앞에 나온다. 칩을 누르면 "지금 포커스가 있던(또는
마지막으로 있었던) 입력란"(상차지/하차지 중 어디)에 그 값을 채운다.

react-app은 이 기능 자체가 없다. 게다가 `DayLogPage`가 지금 구독하는 데이터는
**그 날 하루치**(`useDayDraft`)뿐이라, 원본처럼 전체 이력 기반 랭킹을 내려면
새 구독이 필요하다 — 다행히 달력 화면([`CalendarPage.jsx:53-55`](react-app/src/components/calendar/CalendarPage.jsx:53))이
이미 쓰는 기존 훅 `useOwnerWorkData`/`useOwnerWorkDataByLogId`(`store/ownerDataHooks.js`)를
그대로 재사용하면 되므로 **새 저장 레이어는 아니다**(§7 무관).

### 목표 상태

원본과 동일하게: 상차지/하차지 입력란 밑에 빈도+최근순 칩(최대 12개, 고정된
장소 우선) → 클릭 시 마지막으로 포커스했던 입력란에 채움 → 별표로 최대 10개까지
고정/해제, `settings.pinnedLocations`에 영구 저장.

### 건드릴 파일 (정확히 8개 — 예정 7개에서 1개 늘어남, 아래 8번 사유)

1. **`react-app/src/domain/practiceSettings.js`** — `defaults`에
   `pinnedLocations: []` 추가, `normalizeSettings`에
   `pinnedLocations: normalizePinnedLocations(raw.pinnedLocations)` 한 줄
   추가. (실제 정규화·토글 함수는 4번 신규 파일에 둔다 — 이 파일이 이미
   203줄로 §6 예외 승인을 받은 상태라 더 안 늘림.)
2. **`react-app/src/domain/financeTypes.js`** — `FinanceSettings`에
   `@property {Array<string>} [pinnedLocations]` 한 줄 추가.
3. **`react-app/src/store/persistDomainSchema.js`** — `SETTINGS_KEYS`에
   `'pinnedLocations'` 추가 + 검증 한 줄:
   ```js
   if ('pinnedLocations' in value && (!Array.isArray(value.pinnedLocations) || !value.pinnedLocations.every((loc) => typeof loc === 'string'))) return false
   ```
   (이 파일이 실제 저장 관문 — 여기 안 넣으면 저장할 때 조용히 걸러진다.)
4. **신규 `react-app/src/domain/locationShortcuts.js`** — 순수 함수 3개:
   - `normalizePinnedLocations(value)` — trim·중복제거·최대 `PINNED_LOCATION_LIMIT`(10)개.
   - `togglePinnedLocation(settings, location)` — 원본 script.js:2174-2192와 동일
     로직(있으면 제거, 없으면 추가, 10개 초과 시 `{ error, settings }` 반환 —
     `addFixedRoutePreset`과 같은 기존 패턴).
   - `locationShortcutList(workData, currentCallDetails, pinnedLocations)` —
     원본 `getFrequentAndRecentLocations`+`renderLocationShortcuts`의 병합
     로직(빈도→최근순 정렬 후 고정 장소를 앞에 붙이고 12개로 자름)을 그대로
     순수 함수로 옮김. `getCallDetails`(`day-record.js`)로 각 날짜 레코드를
     안전하게 읽음.
5. **`react-app/src/components/day-log/DayLogPage.jsx`** — `useOwnerWorkData`/
   `useOwnerWorkDataByLogId`(`store/ownerDataHooks.js`)로 이 차량(`logId`)의
   전체 이력을 구독(CalendarPage.jsx와 동일 패턴), `locationShortcutList`로
   랭킹 계산(`useMemo`), `savePracticeSettings`(`lib/practiceSettings.js`)로
   고정 토글 저장하는 `handleTogglePinnedLocation` 추가, 두 값(`locationShortcuts`,
   `pinnedLocations`)과 핸들러를 `CallDetailForm`에 prop으로 전달.
6. **`react-app/src/components/day-log/CallDetailForm.jsx`** — 상차지/하차지
   `<input>`에 `onFocus`로 "마지막 활성 입력란"(`activeLocationTarget` 로컬
   state, 기본 `'load'`) 추적 추가, `call-route-panel` 안 두 `form-group` 뒤에
   신규 `LocationShortcuts` 컴포넌트 렌더링. 칩 선택 시 활성 입력란의
   `loadLoc`/`unloadLoc`만 갱신 — 나머지 필드·로직 무변경.
7. **신규 `react-app/src/components/day-log/LocationShortcuts.jsx`** — 칩 UI
   (원본 칩 구조: 선택 버튼 + 별표 고정 버튼). `CallDetailForm.jsx`가 이미
   194줄이라 여기 넣으면 200줄을 넘어 별도 컴포넌트로 분리(§6).
8. **신규 `react-app/src/components/day-log/location-shortcuts.css`** —
   원본 `style.css:3259-3264`의 `.location-shortcuts`/`.location-chip`/
   `.location-chip-select`/`.location-chip-pin` 4규칙 그대로 포팅(색상은
   기존 CSS 변수 `--border-color`/`--input-bg`/`--primary-color`/
   `--sub-text-color` 재사용). **`call-detail-form.css`(이미 251줄, 기존
   §6 초과 상태)에 추가하면 더 위반이 커져서, `CallDetailList.jsx`가
   `call-detail-list.css`를 갖는 것과 같은 관례로 새 컴포넌트 전용 CSS
   파일을 만든다.**

### 안 건드릴 것

- `call-detail-form.css` — 위 사유로 손대지 않음(현상 유지, 더 늘리지 않음).
- 거래처 관련 로직·`isDriverManagedByOwnerForClients` — ③ 슬라이스.
- `useDayDraft.js`(그 날 하루치 편집·저장 로직) — 무변경. 이번 구독은 순수
  읽기 전용 랭킹 계산에만 쓰고 쓰기 경로에 관여하지 않음.

### §8 4대 질문

1. **구독인가 스냅샷인가?** — 이번엔 새 구독 추가: `useOwnerWorkData`/
   `useOwnerWorkDataByLogId`(전체 이력, 읽기 전용). 기존 `useDayDraft`(그 날
   하루치 편집)는 무변경.
2. **화면에 보이는 값 출처?** — 칩 랭킹은 Store의 workData 전체 이력에서
   파생 계산(순수 함수, 저장 안 함). 고정 여부는 `settings.pinnedLocations`
   (이미 구독 중인 `useOwnerSettings`).
3. **쓰기 창구?** — 고정 토글은 기존 배럴 `savePracticeSettings(ownerKey, patch)`
   그대로 사용(다른 설정 페이지들과 동일 패턴, `BillingSettingsPage.jsx` 참고).
   새 창구·우회 없음.
4. **hydrate·디바운스·동시편집 겹치면?** — 랭킹은 읽기 전용 파생값이라 쓰기
   경합 없음. 고정 토글 저장은 기존 설정 저장 경로 그대로라 별도 경합 시나리오
   추가 없음.
→ 신규 상태 저장소·레이어 없음(기존 훅 재사용, 기존 저장 배럴 재사용).

### 검증 방법

- CI 자동(test·typecheck·build).
- 감시관/보리 브라우저 실측:
  1. 일일운행 → 콜상세 추가 폼에서 상차지/하차지 밑에 칩 목록이 뜨는지(과거
     입력 이력이 있는 계정 기준).
  2. 상차지 입력란에 포커스 후 칩 클릭 → 상차지에 채워지는지. 하차지 포커스
     후 다른 칩 클릭 → 하차지에 채워지는지(활성 입력란 추적 확인).
  3. 별표(☆) 클릭 → ★로 바뀌고 그 장소가 맨 앞으로 이동하는지. 다시 클릭 →
     원래 랭킹 위치로 돌아가는지.
  4. 화면을 나갔다가 다시 들어와도(또는 새로고침) 고정 상태가 유지되는지
     (`pinnedLocations` 저장 확인).
  5. 11번째 장소를 고정하려 하면 "고정 장소는 최대 10개까지..." 안내가
     뜨는지.
  6. 과거 입력 이력이 없는 신규 계정은 칩 영역 자체가 안 뜨는지(빈 배열).
  7. 기존 콜상세 저장·조회 동작 회귀 없는지.

**→ 착수 전 보리 확인 필요: 위 건드릴 파일 8개(예정 7개에서 1개 늘어남 —
칩 전용 CSS가 이미 200줄 넘은 기존 파일에 안 들어가 새 파일로 분리) + 목표
동작 그대로 진행해도 될까요?** `[x]` 보리 확인 2026-09-11 — 작업자 전달 완료.

## 구현 결과 + 감시관 검증 (2026-09-11)

작업자 커밋 react-app `6b4a9b7`(`feat: 상·하차지 즐겨찾기 칩(빈도·고정) 추가`),
보리 push 완료. CI(run `34555360606`) **success**.

**§5 체크리스트:**

1. **범위 준수** — `git show --stat`: 지시한 정확히 8개 파일만 변경
   (`practiceSettings.js`·`financeTypes.js`·`persistDomainSchema.js`·신규
   `locationShortcuts.js`(도메인)·`DayLogPage.jsx`·`CallDetailForm.jsx`·신규
   `LocationShortcuts.jsx`·신규 `location-shortcuts.css`), 233줄 추가·5줄
   변경. `locationShortcuts.js`(랭킹 로직)·`persistDomainSchema.js`(저장
   검증)·`LocationShortcuts.jsx`/`location-shortcuts.css`(칩 UI) 전부
   지시서 코드와 일치.
2. **몰래 증설 없음** — 새 저장 레이어 없음. `useOwnerWorkData`/
   `useOwnerWorkDataByLogId`는 달력 화면이 이미 쓰던 기존 훅 재사용, 고정
   토글도 기존 `savePracticeSettings` 배럴 그대로 씀.
3. **타입 꼼수 없음** — `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as`
   전부 없음(grep 확인).
4. **200줄 — 초과 발견, 보리 판단 필요.** `DayLogPage.jsx` 213줄(자체 주석은
   "206줄"이라 적어 실제와 7줄 어긋남), `CallDetailForm.jsx` 212줄(자체 주석
   "210줄", 2줄 어긋남). 둘 다 작업자가 §6 "응집도>줄수, ~250줄까지 이유
   1줄 주석" 예외를 스스로 적용했고(`day-record.js`의 기존 "206줄, §6 예외"
   관행과 같은 방식), 250줄 상한 안쪽이라 규칙 위반은 아니지만, 사전에
   분리설계안으로 보고받은 적은 없고 주석 속 줄수 표기도 부정확합니다.
   `practiceSettings.js`도 208줄(원래 203줄+§6기존예외, 5줄 증가 — 같은
   맥락).
5. **테스트 진실성** — 이번 diff는 테스트 파일 무변경(삭제·약화 없음).
6. **문서 정합** — diff에 `.md` 없음.
7. **요구사항 충족** — 착수지시서의 목표 동작(빈도+최근 랭킹, 활성 입력란
   추적, 고정 토글·저장, 10개 제한) 코드상 전부 구현됨.

**감시관 브라우저 실측은 이번에도 미완료** — 로컬 프리뷰 포트 문제가 여전해
(orphan vite 프로세스가 5173/5174를 계속 점유, 다른 세션 것일 수 있어 강제
종료하지 않음) 접속하지 못했습니다. **코드 리뷰(§5)는 4번 200줄 초과 건 외엔
이상 없음.** 4번은 기능 결함이 아니라 파일 크기 규칙 판단 사항이라 보리
확인이 필요합니다.

### 브라우저 실검증 순서 (보리)

1. 일일운행 → "+ 운행 일지 추가" → 상차지/하차지 밑에 칩 목록이 뜨는지
   (과거 입력 이력 있는 계정 기준).
2. 상차지 포커스 후 칩 클릭 → 상차지에 채워지는지. 하차지 포커스 후 다른
   칩 클릭 → 하차지에 채워지는지.
3. 별표(☆) 클릭 → ★로 바뀌고 맨 앞으로 이동, 다시 클릭 → 원위치.
4. 새로고침해도 고정 상태 유지되는지.
5. 11번째 고정 시도 시 "최대 10개까지" 안내.
6. 이력 없는 신규 계정은 칩 영역이 안 뜨는지.
7. 기존 콜상세 저장·조회 회귀 없는지.

**200줄 초과 건 — 보리 결정(2026-09-11): 구조는 그대로 두고 주석 줄수만
정확히 고친다.** 작업자에게 아래 수정 커밋 지시:

- `DayLogPage.jsx` 7번째 줄 주석 "206줄" → "213줄"로 수정.
- `CallDetailForm.jsx` 2번째 줄 주석 "210줄" → "212줄"로 수정.
- 그 외 로직·구조 변경 없음(§6 응집도 예외 판단은 그대로 유지).

## 주석 수정 커밋 확인 + 감시관 예비 브라우저 검증 (2026-09-11)

작업자 커밋 react-app `f55815d`(`docs: DayLogPage·CallDetailForm §6 주석
줄수를 실제와 맞춤`), 보리 push 완료. CI(run `34555976600`) **success**.

**diff 확인** — 지시 그대로 딱 2줄만 변경:
- `CallDetailForm.jsx`: `// 210줄, §6: ...` → `// 212줄, §6: ...`
- `DayLogPage.jsx`: `// 206줄, §6: ...` → `// 213줄, §6: ...`
로직·구조 변경 없음, `.md` 없음. 지시서와 100% 일치.

**→ 이 커밋으로 200줄 건은 완전히 마무리. B그룹 ② 남은 것은 보리 브라우저
실검증뿐(승인의 기준 #2).**

### 감시관 예비 브라우저 검증 (참고용 — 보리의 최종 실검증을 대체하지 않음)

이전 세션엔 로컬 프리뷰 포트 문제로 못했던 브라우저 확인을 이번엔 성공.
`react-app`을 띄워 직접 확인한 결과:

1. 콜상세 폼에서 상차지에 "서울터미널", 하차지에 "부산터미널" 입력·저장.
2. 새 콜상세를 다시 열어보니 두 값이 빈도 칩으로 나타남.
3. 상차지 입력란 포커스 후 "서울터미널" 칩 클릭 → 상차지에 채워짐. 하차지
   포커스 후 "부산터미널" 칩 클릭 → 하차지에 채워짐(활성 입력란 추적 정상).
4. "서울터미널" 옆 별표(☆) 클릭 → ★로 바뀌고 맨 앞으로 이동.
5. 페이지 새로고침 후에도 `pinnedLocations`가 `localStorage`에 그대로
   남아 있음(`["서울터미널"]`) — 고정 저장 정상.

→ 착수지시서의 목표 동작(빈도 칩, 활성 입력란 채우기, 고정 토글·저장)
**전부 정상 동작 확인.**

**미확인 관찰 하나 (감시관이 스스로 발견 — 보리 확인 전엔 확정 항목 아님):**
위 1번에서 저장한 콜상세 자체("세부 입력을 저장했습니다" 토스트까지 뜸)가,
페이지를 새로고침하니 화면에서도 `localStorage`(`reactPracticeWorkData:guest`)
에서도 사라져 있었다(빈 `{}`). 화면 상단 "저장 중..." 표시도 계속 떠 있는
채였다. 이번 슬라이스 코드(칩 랭킹은 읽기 전용 파생값, 콜상세 저장 경로인
`useDayDraft`/`handleSaveCall`은 무변경)가 원인일 가능성은 낮아 보이지만,
감시관이 쓰는 프리뷰 환경 특유의 문제인지 실제 앱 버그인지 감시관 선에서는
구분이 안 된다. 이전 세션(B그룹① 검증 시도 때)에도 "저장 중..."이 멈춰
있는 비슷한 현상이 있었음(그때도 원인 미확인, 환경 문제로 추정만 함).

**보리께 요청:** 본인 컴퓨터의 실제 `npm run dev`에서 콜상세 하나 저장 →
새로고침 → 그대로 남아있는지만 한 번 확인해 주시면 좋겠습니다(이번
슬라이스의 정식 실검증 순서에 없던 항목이라 추가 부탁드리는 것). 거기서도
사라지면 급히 봐야 할 별도 문제이고, 정상이면 감시관 프리뷰 환경만의
문제로 접어두고 넘어가면 됩니다.

### 후속 확인 (2026-09-11, 보리 질문에 답하며 재현) — "브라우저가 게스트 로컬저장을 할 수 있는 세팅이냐"

보리 질문에 답하려 다시 재현해봄. 결론: **브라우저(감시관이 쓰는 프리뷰)
자체는 `localStorage` 읽기·쓰기·새로고침 직후 유지 전부 정상** — 콜상세
저장 직후, 그리고 그 직후 새로고침한 시점 모두 `reactPracticeWorkData:guest`에
데이터가 그대로 있는 걸 직접 확인함. 즉 브라우저 세팅 문제는 아님.

문제는 그 다음 단계: **새로고침 후 몇 초~화면 전환이 지나면 그 데이터가
다시 빈 `{}`로 리셋됨**(3회 시도 중 2회 재현). 저장 경로 자체(`useDayDraft`
등)는 이번 슬라이스가 안 건드렸고, 원인은 `hydrate.js` /
`pendingWorkDataWrites.js` / `durableWriteGuard.js` 같은 기존 동기화·복구
계층 쪽으로 추정되나 감시관이 코드를 깊이 파고들진 않음(§7 — 새 코드
수정 없이 관찰만). 보리의 실제 브라우저 재확인 요청은 위와 동일하게
유효함.

**보리 확인 완료(2026-09-11) — 재현됨.** 게스트 데이터 유실은 실제 버그로
확정. 보리 지시로 처리 순서는 "B그룹③ 다음, 4번째" — `STATUS.md` "다음
할 일" 4번 참고. 이 버그 자체의 착수지시서는 ③ 완료 후 별도 작성.

**즐겨찾기 칩(B그룹②) 최종 승인 — 보리 `[x]` 2026-09-11.** 로그인 계정으로
직접 브라우저 검증 완료(위 감시관 예비 검증과는 별개로 보리 본인 계정에서
재확인). react-app `6b4a9b7` + `f55815d` 두 커밋 전체가 대상.
**B그룹 ② 즐겨찾기 칩 — `[x]` 최종 확정 (2026-09-11).**

---

## ③ 거래처 "+추가" 버튼 (직원기사 등록 제한 권한) — **완전 폐기 (보리 결정, 2026-09-11)**

**폐기 사유:** 아래 착수지시서 전체가 "계산서 처리 방식"(`settlementMode`/
`driver_direct`/`employee`/`company`) 개념을 근거로 짜여 있는데, 이 개념은
보리가 2026-09-03경 명시적으로 삭제 지시한 **가짜 개념**이다(실재하는 정산
개념은 매출제/월급제뿐). 게다가 `docs/sot.md` §0이 이미 "거래처는 차주·기사
둘 다 등록/수정/삭제 가능(하나의 레코드 공유), 2026-09-05 승인·완료"로
확정해둔 상태라, ③의 "기사 쪽 CRUD를 막자"는 방향은 이미 승인된 결정과도
정반대다. 원본(바닐라)에 있던 동작이라고 이관 대상으로 자동 판단한 게
문제였음 — "매출제/월급제만 실재, 계산서 처리 방식은 되살리지 말 것" 원칙
위반. **B그룹은 ①②만으로 종료. ③은 안건에서 제외.** 아래 조사 내용은
같은 실수 반복 방지용 기록으로만 남겨두고, 참고·재사용 금지.

### (참고용, 폐기됨) 조사 결과 (원본 vs react-app)

**원본**(`client-management.js:19-46`)은 계산서 처리 방식(`settlementMode`)에
따라 소속기사 본인 화면의 거래처 권한이 갈린다:
- `driver_direct`(기사 직접 정산): 기사 본인이 거래처의 실제 주인이라 일반
  화면과 동일하게 자유롭게 추가/수정/삭제.
- `employee`/`company`(직원기사·회사 정산): 차주가 전담. 기사 본인 화면엔
  **"+추가" 버튼 자체가 숨겨지고**, 지금까지 입력해 온 거래처명만 참고로
  읽기전용 표시되며, 유일한 조작은 "고정노선과 연동" 토글뿐(로컬 전용,
  실제 거래처 데이터는 안 건드림).

**react-app 현재 상태 — 두 곳은 이미 돼 있고, 한 곳이 비어 있다:**

1. **차주 쪽(이미 있음, 정상)** — `LinkedDriverClientsPage.jsx`(차주가
   "기사 관리 → 거래처"에서 여는 화면)는 이미 `settlementMode`로 정확히
   갈린다: `driver_direct`면 `LinkedDriverDirectClientsList`(기사 본인
   거래처를 `fetchDriverOwnClients`로 읽기전용 조회), 아니면 차주가
   `scopedToVehicleNumber` 거래처를 직접 추가/수정/삭제. **이 슬라이스가
   손댈 필요 없음.**
2. **기사 본인 쪽(구멍) — `OwnerScopedClientsView.jsx`** — `/app/clients`
   경로에서 `session?.linkedOwnerId`만 있으면(=소속기사 계정이면)
   **`settlementMode`와 무관하게 무조건** 이 화면을 띄우고, "+추가"·수정·
   삭제를 전부 허용한다(`AppShellRoutes.jsx:76-85`). 즉 지금은 직원기사/
   회사 정산 기사도 "+추가"가 그대로 보이고 눌린다 — 원본이 막던 것이
   안 막혀 있다.
3. **`driver_direct` 기사 본인 쪽 — 별도 구조 문제(아래 "안 건드릴 것/
   §8-5번" 참고)** — 기사 본인 하이드레이트(`hydrateEmployedDriver.js`의
   `buildEmployedDriverSnapshot`)는 `settlementMode`를 보지 않고 **항상**
   차주의 실제 거래처 테이블(`clients.user_id = ownerKey`)을 그대로
   읽어온다. 즉 지금은 `driver_direct` 기사가 자기 화면에서 "+추가"로
   거래처를 만들어도 실제로는 차주의 거래처 테이블에 저장되는 구조로
   보인다(차주 쪽 `fetchDriverOwnClients`가 기대하는, 기사 본인 소유의
   별도 `clients.user_id = 기사자신`과 다른 경로). **이건 이번에 요청받은
   "+추가 버튼 제한"보다 범위가 크고 하이드레이트·저장 경로 자체를 바꿔야
   하는 문제라 이번엔 건드리지 않는다.**

### 목표 상태 (이번 슬라이스 범위)

`employee`/`company` 정산 모드의 소속기사 계정이 `/app/clients`를 열면:
원본과 동일하게 "+추가" 버튼이 안 보이고, 각 카드의 수정·삭제 버튼도 안
보이는(읽기전용) 화면이 된다. `driver_direct` 모드는 **지금 동작 그대로
유지**(이 슬라이스에서 안 바꿈 — 위 3번 문제는 별도 확인 필요).

### 건드릴 파일 (정확히 1개)

**`react-app/src/components/clients/OwnerScopedClientsView.jsx`**
- `useOwnerSettings(ownerKey)`(다른 화면들과 동일 패턴, `LinkedDriverClientsPage.jsx`
  참고)로 설정을 구독하고, `getEffectiveDriverSettlementMode(cars[0], settings)`
  (`domain/cars.js`에 이미 있는 함수)로 이 기사에게 배정된 차량의
  정산모드를 구함.
- `const isRestricted = settlementMode !== 'driver_direct'` 계산.
- `isRestricted`면: "+추가" FAB 버튼을 렌더링하지 않고, 각 카드의 수정·삭제
  버튼도 렌더링하지 않음(카드 내용만 읽기전용 표시). `isRestricted`가
  아니면(=`driver_direct`) 지금 코드 그대로(+추가·수정·삭제 전부 노출).

### 안 건드릴 것

- `LinkedDriverClientsPage.jsx`·`fetchDriverOwnClients.js` — 차주 쪽은 이미
  정상, 무변경.
- `hydrateEmployedDriver.js`(`buildEmployedDriverSnapshot`)·저장 경로
  (`requestClientSave`가 어느 `user_id`에 쓰는지) — 위 조사 결과 3번
  문제(`driver_direct` 기사의 거래처가 실제로 어느 테이블에 저장되는지)는
  이번에 안 건드림. **범위가 이번 요청보다 크고, AGENTS §8-5번 질문(이
  데이터의 읽기/쓰기 권한이 원본과 같은지)에 해당하는 사안이라 보리 확인
  없이 진행 안 함.**
- `ClientFormModal.jsx`·`ClientListPage.jsx`(차주 본인 화면) — 무변경.

### §8 4대 질문

1. 구독 — `useOwnerCars`/`useOwnerSettings` 기존 구독 추가 사용(이미 이
   컴포넌트가 `useOwnerClients`로 하던 것과 동일 패턴). 새 구독 아님.
2. 화면에 보이는 값 — Store의 `cars`/`settings`에서 파생 계산(순수 읽기),
   저장 안 함.
3. 쓰기 창구 — 이번 슬라이스는 쓰기 로직을 추가하지 않음(버튼 노출만
   제어). 기존 `requestClientSave`/`requestClientDeletion` 무변경.
4. hydrate·동시편집 — 무관(읽기전용 파생 계산만 추가).
5. **(DB) 이 화면이 다루는 데이터의 읽기/쓰기 권한이 원본과 동일한가?**
   → **아니오, 확실하지 않음** — 위 조사 결과 3번. `driver_direct` 기사가
   "+추가"로 만든 거래처가 실제로 어느 계정 소유로 저장되는지 이번 조사로
   확실히 못 봤다(차주 것으로 저장될 가능성). **이번 슬라이스 범위 밖으로
   미루고 "+추가 버튼 제한"만 먼저 처리하는 게 맞는지, 아니면 이것도 같이
   봐야 하는지 보리 결정 필요.**

### 검증 방법

- CI 자동(test·typecheck·build).
- 보리 브라우저 실검증:
  1. 직원기사(employee) 또는 회사(company) 정산으로 설정된 소속기사
     계정으로 로그인 → 사이드메뉴 "거래처" 진입 → "+추가" 버튼이 안 보이는지,
     기존 거래처 카드에 수정·삭제 버튼이 없는지.
  2. `driver_direct`(기사 직접 정산)로 설정된 소속기사 계정 → 지금처럼
     "+추가"·수정·삭제가 그대로 보이는지(회귀 없음 확인).
  3. 차주 계정에서 "기사 관리 → 거래처" 화면은 이번 변경과 무관하게
     기존과 동일하게 동작하는지.

**→ 착수 전 보리 확인 필요:**
1. 위 "건드릴 파일 1개" + 목표 동작(employee/company 소속기사 화면
   읽기전용화)으로 진행해도 될까요?
2. §8-5번에서 발견한 `driver_direct` 기사의 거래처 저장 위치 문제는 이번
   슬라이스에서 제외하고 넘어가도 될까요, 아니면 먼저 조사가 필요할까요?

---

## 콜상세 폼 "거래처 + 추가" 버튼 — 진짜 이관 누락 (보리 스크린샷 지적, 2026-09-11)

**위 ③은 완전 폐기(맨 위 참고). 이건 보리가 이관 스샷 vs 원본 스샷을
직접 비교해서 새로 잡아낸 별개의 진짜 버그다 — "계산서 처리 방식"과
무관.**

### 조사 결과 (원본 vs react-app)

**원본**(`index.html:1706`, `client-management.js:538` `openClientModalFromCallDetail`):
콜상세(운행 일지 세부 입력) 모달의 "거래처" 입력란 옆에 **"+ 추가" 버튼이
있다.** 누르면 거래처 등록 모달이 그 자리에서 뜨고, 저장하면 모달이 닫히며
방금 등록한 거래처명이 콜상세의 거래처 입력란에 자동으로 채워진다
(`saveClient` 878-888행 `clientModalOpenedFromCallDetail` 분기).

**react-app 현재 상태 — 버튼 자체가 없다.** [CallDetailForm.jsx:148-163](../react-app/src/components/day-log/CallDetailForm.jsx)
거래처 필드는 `<input>` + `<datalist>`(자동완성)만 있고, 새 거래처를 그
자리에서 등록하는 경로가 아예 없다. 등록하려면 폼을 취소하고 "거래처"
관리 화면으로 따로 가야 한다 — 원본 대비 순수 이관 누락.

### 스코프(중요 — 이미 있는 인프라 그대로 재사용)

이 폼은 메인 운행일지·미연동 서브차량 운행일지·연동 기사 본인 운행일지
세 군데에서 전부 재사용된다(`logId` prop 하나로 구분). 다행히 **거래처를
읽는 쪽은 이미 이 스코프를 완벽히 구현해 뒀다** —
[getClientsForLog(clients, logId)](../react-app/src/domain/clients.js:168):
`logId`가 없거나 `'main'`이면 스코프 없는(=메인) 거래처만, 아니면
`scopedToVehicleNumber === logId`인 거래처만. `upsertClient`도 이미
`draft.scopedToVehicleNumber`를 그대로 받아 저장한다
([domain/clients.js:89](../react-app/src/domain/clients.js:89)).

**즉 "+추가"가 새로 만들 거래처에 `scopedToVehicleNumber: (logId === 'main' ? undefined : logId)`만
붙여서 저장하면, 지금 이미 동작 중인 읽기 스코프와 자동으로 맞아떨어진다.**
`LinkedDriverClientsPage.jsx`/`OwnerScopedClientsView.jsx`가 이미 똑같은
패턴(`scopeKey` → `openAdd`에서 `scopedToVehicleNumber: scopeKey` 세팅)을
쓰고 있어 새 개념이 아니다. 보리가 말한 "메인 운행일지 +추가는 메인 거래처,
연동/미연동 운행일지 +추가는 그 차량 전용 거래처에서 끌어오라"는 요구사항이
바로 이 기존 스코프 그대로다.

### ⚠️ 발견한 별도 문제 (이번 슬라이스와 분리, 보리 판단 필요)

**연동 기사가 본인 계정으로 로그인해서 쓰는 자기 운행일지는 위 스코프가
안 맞을 수 있다.** [hydrateEmployedDriver.js:113](../react-app/src/lib/hydrateEmployedDriver.js:113)
는 `clients` 테이블을 `scopedToVehicleNumber` 필터 없이 **차주 계정의
거래처 전체**를 그대로 내려받고, 이 기사의 운행일지는 항상 `logId='main'`으로
취급된다(`remapEmployedDriverWorkLogs`). 그런데 `getClientsForLog(clients,
'main')`은 "스코프 없는(=차주의 일반) 거래처"만 보여준다 — 이 기사 전용
거래처(`OwnerScopedClientsView.jsx`가 보여주는, `scopedToVehicleNumber
=== 본인 차량번호`인 것들)가 아니다. 즉 **연동 기사 본인 화면에서는
"거래처" 관리 화면과 콜상세 자동완성/새 거래처 등록이 서로 다른 거래처
묶음을 보고 있을 가능성이 있다.**

이건 "+추가 버튼 없음"보다 범위가 크고(읽기 쪽 기존 동작을 건드려야
할 수도 있음), 이번에 요청받은 것도 아니라 **이번 슬라이스에서 손대지
않는다.** 다만 "+추가"를 만들면서 그대로 두면 같은 스코프 오류를 새
기능에도 반복하게 되므로 보리 확인이 필요하다.

### 목표 상태 (이번 슬라이스 범위)

콜상세 폼(`CallDetailForm.jsx`) 거래처 입력란 옆에 "+ 추가" 버튼을 추가한다.
누르면 거래처 등록 모달(`ClientFormModal` 재사용)이 뜨고, 저장하면:
1. `scopedToVehicleNumber: logId === 'main' ? undefined : logId`로 저장(메인/
   미연동 서브차량 로그는 확실히 맞는 스코프, 연동 기사 본인 로그는 위
   "별도 문제" 그대로 상속 — 이번 슬라이스가 새로 만드는 오류 아님).
2. 모달 닫힘 + 방금 등록한 거래처명이 거래처 입력란에 자동으로 채워짐
   (원본 동작과 동일).

### 건드릴 파일 (예상 2개)

- **신규 `react-app/src/components/day-log/CallClientQuickAdd.jsx`** — "+추가"
  버튼 + `ClientFormModal` 상태 + 저장 핸들러를 여기 담는다(`CallDetailForm.jsx`가
  이미 212줄/§6 예외 상태라, `LocationShortcuts.jsx`를 분리했던 것과 같은
  이유로 새 컴포넌트로 뺀다).
- **`CallDetailForm.jsx`** — 거래처 `<div className="call-client-row">` 안에
  `<CallClientQuickAdd ... />` 한 줄 추가, `ownerKey`/`showToast` prop 새로
  받기(현재 안 받음 → `DayLogPage.jsx`에서 이미 갖고 있는 값 그대로 통과).
- (`DayLogPage.jsx`는 이미 `ownerKey`/`showToast`를 갖고 있어 `CallDetailForm`에
  넘기는 한 줄만 늘어남 — "건드릴 파일" 集계엔 포함하되 로직 변경 없음.)

### 안 건드릴 것

- `getClientsForLog`/`upsertClient`(`domain/clients.js`) — 이미 맞는 로직,
  무변경.
- `hydrateEmployedDriver.js`/연동 기사 본인 로그 스코프 문제 — 위 "별도 문제"
  절 참고, 보리 결정 전엔 안 건드림.
- "계산서 처리 방식"/`settlementMode` 관련 — 이 슬라이스와 전혀 무관, 재도입 금지.

### §8 4대 질문

1. 구독 — 새 구독 없음. `CallClientQuickAdd`는 부모가 이미 구독 중인
   `clients`/`ownerKey`를 prop으로만 받는다.
2. 화면에 보이는 값 — 거래처 목록은 기존 `getClientsForLog` 파생값 그대로.
3. 쓰기 창구 — 기존 `requestClientSave`(다른 거래처 화면들과 동일 배럴)
   그대로 사용. 새 창구 없음.
4. hydrate·동시편집 — 무관(단순 등록 폼, 새 경합 시나리오 없음).

### 검증 방법

- CI 자동(test·typecheck·build).
- 보리 브라우저 실검증:
  1. 메인 운행일지 콜상세에서 "+추가" → 새 거래처 등록 → 거래처 입력란에
     자동으로 채워지는지, "거래처" 관리 화면(메인)에도 나타나는지.
  2. 미연동 서브차량 운행일지 콜상세에서 "+추가" → 그 차량 전용 거래처로
     등록되는지("기사 관리 → 그 차량 → 거래처" 화면에 나타나는지, 메인
     거래처 목록엔 안 섞이는지).
  3. (참고용, 이번 범위 밖) 연동 기사 본인 계정 로그인 → 자기 운행일지
     "+추가" 결과가 "거래처" 관리 화면과 안 맞을 수 있음 — 재현되면 위
     "별도 문제"로 기록만 하고 이번엔 고치지 않음.

**→ 보리 확인 완료 (2026-09-11).**
1. 위 목표 상태·건드릴 파일 그대로 진행 — 작업자 전달.
2. "연동 기사 본인 로그 스코프 불일치" 문제는 이번엔 빼고, `STATUS.md`
   "다음 할 일" **3번**으로 큐 재배치(보리 지시, 부가세 라벨보다 먼저).

## 구현 결과 + 감시관 검증 (2026-09-11)

작업자 커밋 react-app `0db5bde`(`feat: 콜상세 거래처 입력란 옆에 +추가 버튼
복원`), 보리 push 완료. CI(run `34567090050`) **success**.

**§5 체크리스트:**

1. **범위 준수** — `git show --stat`: 신규 `CallClientQuickAdd.jsx`(72줄)·
   신규 `call-client-quick-add.css`(27줄)·`CallDetailForm.jsx`(+13줄)·
   `DayLogPage.jsx`(+2줄) 딱 4개 파일, 지시한 범위와 정확히 일치.
2. **몰래 증설 없음** — 기존 `ClientFormModal`·`requestClientSave`·
   `getClientsForLog` 그대로 재사용. 새 저장 레이어·새 창구 없음.
3. **타입 꼼수 없음** — `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as`
   전부 없음(grep 확인).
4. **200줄 — 사소한 주석 오차, 보리 판단 필요.** `CallDetailForm.jsx` 실제
   224줄인데 주석 "223줄"(1줄 오차), `DayLogPage.jsx` 실제 215줄인데 주석
   "209줄"(6줄 오차). 둘 다 250줄 상한 안쪽이라 규칙 위반은 아님. B그룹②
   때와 같은 유형의 주석 부정확 — 이번에도 고칠지는 보리 결정.
5. **테스트 진실성** — 이번 diff에 `.test.js` 없음(변경·삭제·약화 없음).
6. **문서 정합** — diff에 `.md` 없음(정상 — 문서는 감시관이 이 슬라이스에서 갱신).
7. **요구사항 충족** — 아래 감시관 브라우저 실측으로 전부 확인.

**감시관 브라우저 실측 (이번엔 성공):**

1. 메인 운행일지 콜상세 → 거래처 "+추가" → 신규 거래처 등록 → 저장 즉시
   토스트 "거래처를 등록했습니다." + 거래처 입력란에 자동으로 채워짐(원본
   동일 동작) 확인.
2. 방금 등록한 거래처가 "거래처"(메인, 스코프 없음) 관리 화면에 나타남 확인.
3. 미연동 서브차량(`22나2222`) 운행일지 콜상세 → "+추가" → 신규 거래처 등록
   → 저장 즉시 자동으로 채워짐 확인. 이 모달엔 "고정노선 연동" 섹션이 안
   보임(`hideFixedRoute={!!scopeKey}` 정상 동작 — `LinkedDriverClientsPage`/
   `OwnerScopedClientsView`와 같은 패턴).
4. 이 거래처가 "22나2222 거래처"(그 차량 전용) 화면에만 나타나고, 메인
   "거래처" 화면에는 안 나타남 — 스코프 누수 없음 확인.
5. 테스트 데이터(감시관테스트거래처·서브차량스코프테스트) 둘 다 삭제로 정리.

**요구사항(메인/미연동 스코프 정확히 갈라짐) 코드·실측 모두 확인. "연동
기사 본인 로그" 케이스는 이번 범위 밖(위 §8-5류 별도 문제, `STATUS.md`
3번으로 대기 중)이라 실측 안 함.**

**최종 승인 — 보리 `[x]` 2026-09-11.** 로그인 계정으로 직접 브라우저
실검증 완료(승인 기준 #2 충족). 200줄 주석 오차(4번)는 보리가 직접
고치기로 함 — 작업자 후속 커밋 없이 종료.
**콜상세 "거래처 +추가" 버튼 — `[x]` 최종 확정 (2026-09-11).**
