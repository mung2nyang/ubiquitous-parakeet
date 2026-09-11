# docs/report.md — 현재 슬라이스 착수지시서

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
