# docs/report.md — 현재 슬라이스 착수지시서

## 이관 완전성 감사 B — 계산 로직 수치 대조 (읽기 전용)

> **이 지시서는 다른 AI가 이어받아 수행한다.** 시작 전 `AGENTS.md`와 루트 `STATUS.md`를 먼저 읽고 그 규칙
> (§1 승인 흐름·§3 커밋 흐름·의견 표시 규칙)을 따른다. 이 작업은 **코드를 한 줄도 고치지 않는 조사**다.

### 0. 왜 하는가
이관 완전성 감사 A(`docs/migration-audit.md`)는 **화면·기능이 있는지**를 봤고 계산 숫자는 범위 밖이었다
(`migration-audit.md` §5). B는 그 빈 자리 — **원본과 react-app이 같은 입력에서 같은 숫자를 내는가**를 확인한다.
이미 `react-app/src/domain/finance.test.js`가 원본 함수 14개를 실제로 돌려 비교하고 있으나, 원본 계산 함수는
그보다 훨씬 많다(`finance.js` 함수 63개 중 화면 렌더링을 뺀 계산 함수 + `finance-sync.js` 4개 + 다른 파일의
월 정산·내역서 계산). 이번 조사는 **아직 비교 안 한 계산을 비교해 표로 남기는 것**이다.

**주의 — 이것은 "무스코프 호출부 전수 조사"와 다른 조사다.** 그쪽은 react-app이 새로 만든 스코프 규칙이 모든
호출부에 적용됐는지를 보며 원본 대조로는 못 잡는다. 여기서는 스코프 관련 차이를 만나도 **기록만 하고
그 조사 몫으로 넘긴다**(§4 ⚪ 처리).

### 1. 이미 갖춰진 도구 (새로 만들지 말고 재사용)
- `react-app/src/lib/originalWindow.js` — `loadOriginalWindow()`가 원본 JS(`finance.js`·`client-management.js`·
  `car-management.js`·`driver-link.js`·`script.js`)를 JSDOM에 올려 원본 함수를 그대로 실행하게 해 준다.
  `applyOriginalFixture(win, settings, workDataByLogId)`로 입력 데이터를 원본 localStorage에 넣는다.
- `react-app/src/domain/finance.test.js` — 위 하네스로 14개 함수를 비교 중(`original.<함수>` 호출). 사용법의 모범.
- `react-app/src/domain/finance.fixtures.js` — 기본 입력 데이터(`FIXTURE_SETTINGS`·`FIXTURE_WORK`).
- **이미 비교 중인 14개(다시 하지 말고 "기준선"으로만 확인):** `calculateDriverVehicleCommission`,
  `calculatePaymentDueDate`, `getCallDetailCommissionAmount`, `getDetailPaymentSummary`,
  `getEffectiveDriverSettlementMode`, `getLinkedDriverSettlementDetail`, `getMonthlyDriverTotals`,
  `getMonthlyFareRevenue`, `getOverdueReceivableItems`, `getOwnerMonthlyFinanceDetail`, `getReceivableItems`,
  `getTaxInvoiceSourceGroups`, `isDateWithinAssignment`, `parseCurrencyValue`.

### 2. 조사 대상 (후보 — 수행 AI가 원본 코드를 읽고 확정)
1. **원본 `finance.js`(63개)에서 화면 렌더링·이벤트를 뺀 계산 함수.** 이름에 `render*`·`show*`·`toggle*`·`open*`·`close*`·
   `select*`·`change*`가 붙은 것은 화면이라 제외. 남는 후보 예: `getCallDetailDurationMinutes`,
   `getDriverCarWorkData`, `getTaxInvoicePartyInfo`, `getTaxInvoiceRecordId`, `buildTaxInvoiceEntry`,
   `getTaxInvoiceSupplierBiz`, `getTaxInvoiceFlowMeta`, `getCurrentReceivableDetailItems`, 부분입금·완납 계산
   (`addPartialPayment`·`confirmPartialPayment`·`undoLastPayment`·`markReceivableItemPaid` 등 — **상태를 바꾸는
   함수이므로 "결과로 남는 금액·잔액"을 비교**), 매출 화면 집계(`renderRevenue*`가 내부적으로 부르는 계산).
2. **`finance-sync.js`** 4개(`resolveTaxInvoiceVehicleId` 등) — 서버 호출이 섞인 것은 ❓(대조 불가)로 두되 순수 부분만 비교.
3. **다른 원본 파일의 월 정산·내역서·달력 계산:** `script.js`의 월간 정산 카드·달력 셀·운송비 내역서 합계 계산
   (함수명을 `grep -nE 'function .*(Summary|Settle|Total|Fare|Monthly|Calc|calc)' script.js`로 찾는다),
   `client-management.js`·`car-management.js`·`driver-link.js`의 금액·수수료·정산 계산.
4. react-app 대응 위치: `react-app/src/domain/`(`finance*.js`, `monthSettlement.js`, `calendarBadges.js`,
   `receivables.js`, `payments.js`, `financeReceivables.js`, `driverSelfRevenue.js`, `driverRevenueShareExpense.js` 등)와
   `react-app/src/lib/reportSummary.js`.
후보 확정 결과(대상 함수 목록·제외한 것과 이유)를 산출물 §1에 먼저 적는다.

### 3. 방법
1. **읽기:** `docs/migration-audit.md`(A 결과), `docs/sot.md` §0·§4-4c·§4-5c·§8-2(이미 승인된 차이), `docs/roadmap.md`.
2. **기준선 확인:** `react-app`에서 `finance.test.js`를 돌려 기존 14개 비교가 통과하는지 확인(수정 금지, 결과만 기록).
3. **입력 시나리오 만들기(다양하게):** 기본 픽스처 하나로는 부족하다. 함수마다 경계 조건을 표로 만든다 —
   월 경계(전월·익월 날짜), 혼짐·공차·`linkedLoadIndex`, `vatExempt`, 파렛트, 수수료(비율/건당/없음), 매출제·월급제,
   `isOff`, 배정 기간 경계(시작·종료일), 결제 예정일 5가지 규칙, 부분입금·초과입금, 빈 데이터, 문자열 금액("100,000") 등.
4. **같은 입력을 원본(`loadOriginalWindow`)과 react-app 함수에 넣어 결과를 비교.** 숫자뿐 아니라 반환 구조(필드 유무)도 본다.
5. **조사용 스크립트는 저장소 밖(임시 폴더)에 둔다.** react-app 테스트 폴더에 새 테스트를 추가하지 않는다 —
   비교 결과를 본 뒤 회귀 테스트로 남길지는 보리가 별도로 정한다. 단 **재현 명령을 산출물에 적는다**.

### 4. 판정 기준 (5종만 사용)
| 표기 | 의미 | 필수 증거 |
|---|---|---|
| ✅ 동일 | 모든 시나리오에서 값·구조 동일 | 시나리오 수, 원본·react-app 파일:줄 |
| 🟡 차이 | 일부 시나리오에서 값·구조가 다름 | **어떤 입력에서 어떻게 다른지**(원본 값 vs react-app 값) |
| ❌ 대응 없음 | 원본 계산에 대응하는 react-app 계산을 못 찾음 | 찾은 방법(grep한 이름·확인한 파일) |
| ⚪ 승인된 차이 | 서면으로 승인된 의도적 차이 | **서면 위치 인용**: `sot.md` §0(정산은 매출제/월급제만)·§4-4c(고정노선 계정별 스코프 — 이 건은 스코프 조사 몫)·§4-5c(공제후 고정)·§8-2, `roadmap.md`, `migration-audit.md` §4 등. 서면이 없으면 ⚪ 금지 → ❓ |
| ❓ 보류 | 서버·DOM 의존 등으로 정적으로 못 비교 | 이유 |

**금지:** (a) 서면 없이 "의도적/원본 오류"라고 단정, (b) 차이를 "버그"로 확정(전부 **AI관찰·미확인**으로만 적고 보리가
확인한 것만 `[확인: 날짜]`), (c) 이유를 추정해 채우기(모르면 "이유 미기록"), (d) 코드 수정·테스트 추가·커밋.

### 5. 보정용 기준 (이 셋이 표에서 이렇게 나와야 방법이 맞다)
1. **기준선 14개는 ✅ 동일**이어야 한다(현재 `finance.test.js` 통과). 아니면 하네스 사용법부터 점검.
2. **`finance.test.js`의 "숫자 비교표용 스냅샷" 테스트**에는 이미 `+ 80000`, `+ 1`이라는 **하드코딩된 차이**가 있다
   (react-app `getMonthlyFareRevenue` 결과가 원본보다 80,000원·1건 더 나온다 — 픽스처상 서브차량 `부산33나1111`의
   80,000원 콜 1건으로 보이나 **원인은 미확인**). 이 차이의 **원인(어느 필드·조건 때문인지)을 코드로 밝혀** 🟡 또는
   ⚪로 분류해야 한다 — 밝히지 못하면 조사 실패.
3. **`getEffectiveDriverSettlementMode`** 는 원본 4종(회사정산·기사직접·직원·미사용)과 react-app이 다르게 동작하는 것으로
   알려져 있다(sot §0·§8-2: 정산 방식은 매출제/월급제만). 어떤 입력에서 값이 갈리는지 표로 밝히고 ⚪(근거 인용)로 분류.

### 6. 산출물
- **신규 파일 1개: `docs/finance-parity.md`**(이 지시서를 확정하면 승인으로 본다. `docs/archive/`에는 만들지 않는다.)
- 구성: ①대상 함수 목록·제외 이유 ②함수별 표(열: 원본 함수(파일:줄) / react-app 함수(파일:줄) / 시나리오 수 /
  판정 / 차이 내용·비고) ③🟡·❌·❓만 모은 "보리 확인 요청" 표 ④요약(판정별 개수) ⑤재현 방법(명령) ⑥조사 못 한 것.
- 조사 중간에 커밋하지 않는다. 작업 파일은 워킹카피에만 둔다.

### 7. 건드릴 파일 / 안 건드릴 파일
- **건드릴 파일:** `docs/finance-parity.md`(신규)만. (`docs/report.md`는 이 지시서 자체.)
- **안 건드릴 파일:** `react-app/` 전부(테스트 포함), 원본 `*.js`·`index.html`, `AGENTS.md`, `docs/sot.md`(규칙 확정은 보리 확인 후),
  `docs/roadmap.md`·`STATUS.md`(결과를 어디에 반영할지는 보리 지정 후). 데이터·DB·로그인 조작 금지.

### 8. §6 200줄 / 실패 시 처리
- §6: 코드 수정 없음 → 해당 없음(문서 예외).
- 실패 시: 새 저장소·레이어 없음(§7). 산출물 파일을 지우면 원상 복귀, 코드·데이터 영향 0.
- 막히거나 판단이 필요하면 추정하지 말고 **질문 후 멈춘다**(AGENTS §11 — 무응답 시 진행 금지, 질문·안전 상태를 이 파일에 기록하고 종료).

### 9. 검증 (보리)
1. §5 보정 기준 3건이 지시대로 나왔는지.
2. 요약 개수와 표 행 수가 맞는지, 재현 명령을 실제로 돌려 같은 결과가 나오는지.
3. **표본:** ✅ 3건·🟡 3건을 골라 원본과 react-app에 같은 값을 직접 입력해 비교(파일:줄이 실제 그 계산인지). 한 건이라도 오판이면 그 계열
   전체를 재조사.
4. 🟡·❌·❓ 목록을 보고 각 항목을 "고침 / 안 고침(승인된 차이로 서면 기록) / 더 조사"로 보리가 지정한다 — 이 결정이 이후 슬라이스가 된다.

### 10. 수행 AI에게: 보고 형식
끝나면 한국어(비개발자 눈높이) 3~5줄: 대상 함수 수, 판정 개수, 가장 중요한 🟡·❌ 3개, 못 한 범위, 표본 확인 요청. 긴 내용은 대화창이 아니라
`docs/finance-parity.md`에. `AGENTS.md` §3대로 **보리 "검증 통과"·최종 승인 전에는 STATUS `[x]`·커밋을 하지 않는다.**
