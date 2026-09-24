# docs/report.md — 현재 슬라이스 착수지시서

## 이관 마무리 ① — 기사차량 폼에 "산재보험 적용" 토글 복원 (이관 감사 11-7) `[x]`

**완료:** react-app `fc4ec83`. `npm test`(unit 661+화면 175)·`tsc` 0에러·strict 진단 418 불변·revert-and-confirm-fail(새 테스트 4개 FAIL 확인)·
CI 초록·보리 브라우저 실검증·§5 리뷰·최종 승인 완료(2026-09-24). 확인 필요 ①②는 보리가 "1번승인,2번 동의"로 답변 완료 — 200줄 초과 두 파일
소량 추가 허용, 기사 본인 세션 반영은 별도 DB 슬라이스로 분리(`docs/roadmap.md` 등재).

**근거:** `docs/migration-audit.md` 11-7(❌ 없음 → 보리 "복원 필요", 정산 금액에 영향이라 이관 마무리 1순위 — `docs/roadmap.md` "이관 마무리 범위").
원본은 기사차량(서브)에만 이 토글이 있었다: "산재보험 적용 — 기사차량의 산재보험 정산에 반영합니다."(`index.html:2033-2041`, 저장 `car-management.js:294,364`, 불러오기 `:786`, 기본 꺼짐, 메인 차량은 항상 false).

### 1. 현재 상태 (증거 병기)
- **계산부는 이미 `car.insuranceOn`을 읽는다** — 켜져 있어야만 콜상세에 입력한 산재보험료(`CallDetailForm.jsx:195` → `insuranceFee`)가 기사 정산에서 차감된다:
  `driverRevenueShareExpense.js:37`(차주 기사 지급 지출) · `financeTaxInvoiceGroups.js:99`(기사 매입 계산서)·`:174`(차주가 보는 연동기사 정산 상세) · `driverSelfRevenue.js:72`(기사 본인 매출).
- **그런데 값을 켜는 화면이 없다.** `CarFormModal.jsx`(146줄)에 토글이 없고, `upsertCar`([cars.js:101](react-app/src/domain/cars.js:101))의 `driverFieldsFromDraft`가
  `insuranceOn`을 다루지 않는다(신규 등록은 미설정, 수정은 기존 값을 spread로 보존만). 결과적으로 새로 등록한 기사차량은 산재보험이 **항상 차감 안 됨**.
- **데이터 경로는 이미 갖춰져 있다(새 저장 필드·서버 변경 없음):** 로컬 persist 허용(`persistDomainRecords.js:40,78`), hydrate 복원(`hydrateMergeCars.js:90-91`),
  서버 저장은 차량 전체를 `raw`로 통째 저장(`cloudStorage.js:96` `raw: car`).
- **기사 본인 세션의 차량은 다른 경로다:** 서버 RPC `get_assigned_vehicle_summary`(`driverLinkRpc.js:117`) 요약 컬럼으로 만든다(`carFromAssignedSummary`,
  `hydrateEmployedDriver.js:33-51`) — 여기엔 `insuranceOn`이 없다. 이 화면(기사 본인 매출)까지 반영하려면 **DB 함수 변경**이 필요해 이번 범위 밖(아래 4번).

### 2. 목표 상태
- 차주가 **기사차량** 등록·수정 폼에서 "산재보험 적용" 토글을 켜고 저장할 수 있고, 다시 열면 값이 유지된다(로컬·로그인 계정 모두, 새로고침·다른 기기 포함).
- 켜면 콜상세의 산재보험료가 차주 화면의 기사 정산·기사 매입 계산서·연동기사 정산 상세에서 **기존 계산 코드 그대로** 차감된다(계산부는 안 바꿈).
- **메인 차량 폼에는 토글이 안 보이고** 저장값은 항상 false(원본과 동일).

### 3. 건드릴 파일 (수정 3 + 테스트)
1. `react-app/src/domain/cars.js`(**237줄, 이미 200 초과**, 파일 머리말에 "§6 예외" 기록 있음) — `CarUpsertDraft`에 `insuranceOn?: boolean` 추가,
   `driverFieldsFromDraft`가 서브차량이면 `insuranceOn: !!draft.insuranceOn`, 메인이면 `false`를 반환. 증가 약 3줄 → ~240줄(≤250 응집도 예외).
2. `react-app/src/components/cars/CarFormModal.jsx`(146줄) — `CarFormDraft`에 `insuranceOn?: boolean`, **기사차량(`isSub`) 정산 그룹 아래**에 토글 행 추가
   (라벨 "산재보험 적용", 설명 "기사차량의 산재보험 정산에 반영합니다.", 기존 `setting-item`/`switch`/`slider` 클래스 재사용 — `ClientTradeFields.jsx`와 같은 모양). 증가 약 14줄 → ~160줄.
3. `react-app/src/components/cars/CarListPage.jsx`(**231줄, 이미 200 초과**) — `openEdit`이 만드는 draft에 `insuranceOn: !!car.insuranceOn` 1줄(수정 화면에서 값 불러오기).
   `emptyDraft`는 옵셔널이라 미수정. 증가 1줄 → 232줄.
4. 테스트(새 파일 없음): `domain/cars.test.js`에 `upsertCar` 케이스 추가 — 서브차량 신규 등록 시 `insuranceOn: true` 저장, 메인은 항상 `false`, 수정 시 토글 끄기 반영, draft에 값 없으면 `false`.

### 4. 안 건드릴 것 (근거 병기)
- **계산부 4곳**(`driverRevenueShareExpense.js`·`financeTaxInvoiceGroups.js`·`driverSelfRevenue.js`) — 이미 `car.insuranceOn`을 읽음(위 1번). 기존 테스트(`driverRevenueShareExpense.test.js:24,61`, `cars.test.js`)가 켠/끈 경우를 검사 중.
- **hydrate·persist·서버 저장 경로**(`hydrateMergeCars.js`·`persistDomainRecords.js`·`cloudStorage.js`) — 이미 `insuranceOn`을 보존(1번 근거). `vehicleMutations.js`도 draft를 `upsertCar`에 그대로 넘기므로 미수정.
- **기사 본인 세션 정산의 산재보험 반영**(`hydrateEmployedDriver.js`·RPC `get_assigned_vehicle_summary`) — 요약 컬럼에 `insuranceOn`이 없어 DB 함수 변경이 필요하다. AGENTS §9(진단 SELECT → 멱등 SQL → 사후검증)를 따라 **별도 슬라이스**로 roadmap에 등재한다.
- 11-5 사업자정보·11-6 계좌 — "기사 관리" 화면 하단에 넣기로 한 **별도 슬라이스**(이관 마무리 ③).
- `CarListItem.jsx`(목록 카드 표시) — 이번 범위 밖.

### 5. 실패 시 처리
새 필드·저장소·레이어 없음(§7) — 이미 있는 `insuranceOn`을 폼에서 입력·저장할 뿐이다. 문제가 생기면 3개 파일을 되돌리면 "토글 없음" 상태로 복귀하고, 이미 저장된 값은 그대로 남는다(계산부가 계속 읽음).
읽기/쓰기 권한(§8-5): 차주가 자기 차량을 수정하는 기존 권한 그대로, 새 권한 없음. 기사 본인은 차량 폼을 열지 못한다(감사 11-2·11-3, 의도적 변경).
플레이북: 트리거 경로(`store/**`·`lib/*mutation*`·`domain/finance*` 등)는 수정하지 않으나 **저장되는 차량 데이터에 폼 입력을 추가**하므로 `docs/testing-playbook.md`를 열람하고, §6(새 테스트가 수정 코드를 되돌리면 실제로 FAIL하는지 확인)을 적용한다.

### 6. §6 200줄 확인
`cars.js` 237 → ~240, `CarListPage.jsx` 231 → 232는 **이미 200 초과인 파일에 소량 추가**(≤250, 응집도 예외 — 아래 "확인 필요 ①"). `CarFormModal.jsx` 146 → ~160은 200 이내.

### 기대 동작 (브라우저 검증 — 차주 계정, `npm run dev`)
1. 차량 관리 → **기사차량** 수정(또는 "+ 추가"로 기사차량 등록) 폼의 "정산" 아래에 **"산재보험 적용"** 토글이 보인다. **메인 차량 폼에는 안 보인다.**
2. 토글을 켜고 저장 → 그 차량 수정을 다시 열면 **켜져 있다.** 새로고침 후에도 유지(로그인 계정은 다른 기기에서도).
3. **정산 반영:** 그 기사차량 일지의 콜상세에 산재보험료를 입력해 두고, "기사 관리"의 정산 요약에서 토글 **켬 = 산재보험 차감 반영 / 끔 = 차감 안 됨**을 확인. 세금계산서 "기사 매입" 항목에도 같은 차감이 반영.
4. **회귀:** 기존 기사차량을 수정해도 다른 항목(정산 방식·수수료·기사명·연락처)이 그대로 유지되고, 메인 차량 등록·수정은 이전과 동일.
5. **알려진 한계(범위 밖):** 기사 **본인 계정**의 매출 화면에서는 산재보험 차감이 아직 반영되지 않는다(위 4번 — DB 함수 변경 필요).

### 문서 반영 (승인 후 문서 커밋)
`docs/roadmap.md`: 11-7 `[x]` + **후속 항목 신규 등재 — "기사 본인 세션 산재보험 반영(`get_assigned_vehicle_summary` 컬럼 추가, DB 변경 §9)"**, `docs/migration-audit.md`: 11-7 조치 완료, `STATUS.md` `[x]`.

### 확인 필요 (보리)
① **200줄 초과 두 파일**(`cars.js` 237→~240, `CarListPage.jsx` 231→232)에 소량 추가하는 것을 응집도 예외(≤250)로 허용할지. (허용 안 하면 `CarListPage.jsx` 수정 없이 수정 폼에서 값을 못 불러오므로 슬라이스가 성립하지 않음.)
② 기사 본인 세션 반영을 이번엔 빼고 **별도 슬라이스(DB 함수 변경)**로 두는 것에 동의하는지.
