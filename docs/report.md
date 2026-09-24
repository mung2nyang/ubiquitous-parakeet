# docs/report.md — 현재 슬라이스 착수지시서

## 이관 마무리 ② — 세금계산서 작성 모달 세무정보 복원 + 거래처 "작성 완료" 힌트 (이관 감사 5-5)

**근거:** `docs/migration-audit.md` 5-5(🟡 차이 → 보리 "원본 복원 필요" — `docs/roadmap.md` "이관 마무리 범위" ②).
원본 계산서 작성 모달(`index.html:2334-2370`)은 상호·사업자등록번호·대표자·**이메일**·**사업장 주소**·**업태**·**종목**·작성일자·품목·금액·비고를 편집한다.
react-app `TaxInvoiceDraftModal.jsx`(58줄)는 상호(읽기전용)·사업자등록번호·대표자·품목·작성일자·금액·비고만 있고 **이메일·주소·업태·종목 입력 UI가 없다.**

### 1. 현재 상태 (증거 병기)
- **데이터·저장 경로는 이미 다 있다(새 필드·새 레이어 없음):**
  - 타입: `InvoiceLike`에 `clientAddress`·`clientBizType`·`clientBizItem`·`clientEmail`이 이미 선언됨(`financeTaxInvoiceEntries.js:44-49`).
  - 초기값: 거래처 발행이면 `client.taxAddress`/`taxBizType`/`taxBizItem`/`taxEmail`에서, 기사 매입이면 `car.personalInfo`에서 이미 채워 옴(`financeTaxInvoiceEntries.js:75-101` `getTaxInvoicePartyInfo`).
  - 저장: 거래처 발행 저장 시 이미 이 4개 필드를 거래처 레코드로 되돌려 쓴다(`taxInvoiceActions.js:36-43` `requestClientTaxInfo` patch에 `taxEmail`·`taxAddress`·`taxBizType`·`taxBizItem` 포함). 기사 매입은 지금도 `clientBizNumber`/`clientRepresentative`처럼 계산서 레코드 자체에만 저장되고 차량으로 되돌리지 않음(기존 동작, 이번에 안 바꿈).
  - **품목 기본값도 이미 있음** — 원본처럼 "화물운송료"를 하드코딩하지 않고 흐름별로 다르게 자동 세팅됨(`financeTaxInvoiceEntries.js:55-57` `getTaxInvoiceFlowMeta`, `TaxInvoicePage.jsx:85`). **이번 작업 범위 아님.**
- **없는 건 모달의 입력칸 4개뿐.** `TaxInvoiceDraftModal.jsx`에서 `clientEmail`/`clientAddress`/`clientBizType`/`clientBizItem`을 렌더하는 JSX 없음(파일 전체 grep 결과 0건).
- **"작성 완료" 힌트는 원본에 없던 신규 기능**(원본 `index.html`·`*.js`에 "작성 완료"·"정보 작성" 문자열 검색 0건 — 보리가 이번에 새로 요청).
  거래처의 세무정보(`bizNumber`·`taxRepresentative`·`taxAddress`·`taxBizType`·`taxBizItem`·`taxEmail`)는 이미 거래처 등록 폼(`ClientFormModal.jsx:31-70`)에서 전부 입력 가능하다 — 그런데 다 채웠는지 거래처 목록에서 확인할 방법이 없다.

### 2. 목표 상태
- 세금계산서 작성 모달(매출·매입·수수료 공통)에서 이메일·사업장 주소·업태·종목을 직접 입력·수정할 수 있다(원본과 동일한 3그룹 배치: 대표자+이메일 한 줄, 업태+종목 한 줄, 주소 단독 줄).
- 거래처 목록 카드에서, 그 거래처의 세무정보 6칸(사업자번호·대표자·주소·업태·종목·이메일 — 계산서 작성에 실제로 쓰이는 세트와 동일)이 전부 채워져 있으면 "정보 작성 완료" 배지가 보인다. 하나라도 비어 있으면 안 보인다.

### 3. 건드릴 파일 (수정 2 + 테스트 2)
1. `react-app/src/components/TaxInvoiceDraftModal.jsx`(58줄) — `personal-inline-fields` 재사용해 대표자 옆 이메일, 업태+종목 묶음, 주소 단독 `form-group` 추가.
   기존 `clientBizNumber`/`clientRepresentative`와 같은 `onChange={(e) => onChange({ ...modalItem, clientXxx: e.target.value })}` 패턴 그대로. 증가 약 25줄 → ~83줄(200 이내).
2. `react-app/src/components/clients/ClientListItem.jsx`(60줄) — 파일 내 지역 함수 `hasCompleteTaxInfo(client)`(6개 필드 전부 비어있지 않은지만 확인하는 순수 boolean 체크, export 안 함 — 이 화면 전용)를 추가하고, 회사명 옆 `기존 client.fixedRouteLinked` 배지와 같은 자리에
   `{hasCompleteTaxInfo(client) && <span className="management-badge tax-invoice">정보 작성 완료</span>}` 추가. 증가 약 8줄 → ~68줄(200 이내). **`domain/clients.js`에 안 넣는 이유:** 그 파일은 이미 §6 예외로 243줄(승인 한도 ~250)까지 차 있어 새 함수를 더 넣을 여유가 빠듯하고, 이 체크는 이 카드 표시 전용이라 재사용처가 없음.
3. 신규 테스트 `react-app/src/components/TaxInvoiceDraftModal.test.js` — `ExpenseFormModal.test.js`와 같은 직접 렌더 패턴으로 이메일·주소·업태·종목 입력이 렌더되는지, 입력 시 `onChange`가 해당 필드만 바꿔 호출되는지 확인.
4. 신규 테스트 `react-app/src/components/clients/ClientListItem.test.js` — 6칸 모두 채운 거래처는 배지가 보이고, 하나라도 비면 안 보이는 것을 확인.

### 4. 안 건드릴 것 (근거 병기)
- `financeTaxInvoiceEntries.js`·`taxInvoiceActions.js`·`financeTaxInvoiceGroups.js` — 이미 4개 필드를 채우고 저장한다(위 1번 근거). 로직 변경 없음, 모달에 입력칸만 새로 연결.
- 품목(`itemName`) 기본값 — 이미 흐름별 자동 세팅됨(`TaxInvoicePage.jsx:85`), 원본의 하드코딩 방식으로 되돌리지 않음.
- 기사 매입 계산서의 사업자정보 저장 방식(차량으로 되돌려쓰지 않음) — 기존 동작 그대로, 11-5(차량별 사업자정보 입력 UI, 다음 슬라이스 후보)와 합쳐지는 부분이라 이번엔 손대지 않음.
- `ClientFormModal.jsx` — 세무정보 입력은 이미 다 있다(§1 근거). 손댈 이유 없음.

### 5. 실패 시 처리
새 필드·저장소·레이어 없음 — 이미 있는 `clientEmail`/`clientAddress`/`clientBizType`/`clientBizItem`을 모달에서 입력만 가능하게 한다. 문제가 생기면 `TaxInvoiceDraftModal.jsx`를 되돌리면 "입력칸 없음" 상태로 복귀하고 이미 저장된 값은 그대로 남는다. 배지는 순수 표시 로직이라 되돌려도 다른 화면에 영향 없음.
플레이북: `domain/finance*` 근처지만 이번엔 `financeTaxInvoiceEntries.js`/`taxInvoiceActions.js` 자체는 안 바꾸고 모달 UI만 바꾼다 — 그래도 저장 흐름과 맞닿아 있어 착수 전 `docs/testing-playbook.md` 열람.

### 6. §6 200줄 확인
`TaxInvoiceDraftModal.jsx` 58 → ~83, `ClientListItem.jsx` 60 → ~68 모두 200줄 이내로 예외 불필요.

### 기대 동작 (브라우저 검증 — 차주 계정, `npm run dev`)
1. 매출/기사 매입/수수료 계산서 작성 모달을 열면 대표자 옆에 이메일, 그 아래 업태·종목, 그 아래 사업장 주소 입력칸이 보인다.
2. 값을 입력하고 저장 → 같은 계산서를 다시 열면 값이 유지된다. 거래처 발행 건은 거래처 등록 폼에서도 같은 값이 보인다(되돌려 저장 확인).
3. 거래처 관리 화면에서: 사업자번호·대표자·주소·업태·종목·이메일을 전부 채운 거래처 카드에 "정보 작성 완료" 배지가 보인다. 하나라도 비운 거래처는 배지가 없다.
4. **회귀:** 기존 상호·사업자번호·대표자·품목·작성일자·금액·비고 입력/표시가 그대로 동작한다. 고정노선 연동 배지 등 기존 거래처 카드 배지들도 그대로 보인다.

### 진행 상태 `[x]` (2026-09-24)
코드 완료, 보리 브라우저 검증 통과 → react-app `550bca5` 커밋·push·CI 초록·§5 리뷰 7항목 이상 없음·보리 최종 승인. 모달 58→78줄, 카드 60→71줄. `npm test`(unit 661+화면 179)·`tsc` 0에러.
수정 코드를 되돌리면 새 테스트 3개 FAIL 확인(나머지 1개는 "배지 없음" 확인이라 원래도 통과). CSS 변경 없음(기존 `personal-inline-fields`·`management-badge tax-invoice` 재사용).

### 문서 반영 (승인 후 문서 커밋)
`docs/roadmap.md`: 5-5 `[x]`, `docs/migration-audit.md`: 5-5 조치 완료, `STATUS.md` `[x]`.
