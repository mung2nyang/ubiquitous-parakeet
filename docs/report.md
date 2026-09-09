# docs/report.md — 미연동 서브차량 관리 진입점 신설 (1/4단계)

> `main-calendar.css` 책임 분리(1~10차) 이력은 `docs/archive/main-calendar-css-split.md`로
> 옮김(동결). 이 문서는 새 작업(미연동 서브차량 관리 화면)부터 시작한다.
> 도메인 개념 정의는 `docs/sot.md` §0("도메인 개념 — 차량·기사 관계") 참고 —
> **미연동 서브차량도 실제 기사가 있고 정산이 필요함**(차주가 대신 입력할 뿐).

## 0. 배경과 전체 계획 (보리 지시, 2026-09-09)

미연동 서브차량(연동된 기사 계정이 없는 기사차량 — 차주가 대신 운행일지를 입력)의
거래처·정비/주유/기타가 메인 차량과 섞여 있거나(거래처) 아예 안 갈라 보이는(정비/
주유/기타) 문제를 감시관이 코드 대조로 확인(§부록 참고). 해결 순서를 4단계로 정함,
**이번 슬라이스는 1단계만**:

1. **미연동 서브차량 전용 "관리" 진입점 신설** ← 이번 슬라이스
2. 거래처 태깅 버그 수정(콜상세에서 새 거래처 입력 시 `scopedToVehicleNumber` 안 붙는 문제)
3. 위 관리 화면에 거래처 진입 연결
4. 위 관리 화면에 정비/주유/기타 진입 연결(+ 화면 자체를 차량별로 거르는 기능)

**이번 슬라이스에서 안 하는 것(별도 백로그로 기록만)**:
- 사이드메뉴 배너 이미지 복원, "관리/경영" 순서 반전, "기사 기사 관리" 중복 텍스트 —
  전부 다음 "사이드메뉴 UI 정리" 슬라이스 몫.
- 미연동 서브차량 **일지 화면(콜상세 입력 등) 자체의 UI**를 원본과 맞추는 작업(그
  화면에 톱니바퀴 아이콘을 넣는 것 포함) — 나중에 별도로.
- "정산·계산서 설정"(기사 매입 계산서 기준을 공제후지급액으로 고정, `BillingSettingsPage`
  자체 정리) — 이번엔 그 칩의 이름과 동작만 바꾸고, 실제 고정·페이지 삭제는 별도 결정.

## 1. 현재 코드 확인 (재조사)

- `src/components/drivers/LinkedDriverManagementPage.jsx`(200줄) — 연동 기사 전용
  "기사 관리" 화면. `useParams().linkId`로 `drivers`에서 링크 레코드를 찾고, 없거나
  `status !== 'linked'`면 빈 화면.
- 계산 함수(`domain/financeTaxInvoiceGroups.js`의 `getLinkedDriverSettlementDetail`·
  `flattenLinkedDriverTrips`·`getLinkedDriverClientInvoiceGroups`, `domain/financeCore.js`의
  `getMonthlyDriverTotals`)는 **전부 `link` 매개변수가 없어도(`null`/`undefined`) 이미
  안전하게 동작한다** — `isDateWithinAssignment(dateKey, link?.assignmentStart, ...)`가
  `assignmentStart`가 없으면 무조건 `true`를 돌려주기 때문. 즉 **계산 로직은 수정
  불필요**, `link` 자리에 `null`을 넘기고 `car`만 실제 값을 주면 미연동 서브차량에도
  그대로 재사용된다(실측 확인 완료, 코드 인용 §부록).
- 사이드메뉴 미연동 서브차량 항목: `src/app/subLogMenuItems.js`(34줄, 로직 변경 불필요)가
  만든 목록을 `SideMenu.jsx`가 "{번호} 일지"로 렌더링, 클릭 시 `AppShell.jsx`의
  `onOpenSubLog`가 `/app/logs/{번호}`(운행일지)로 바로 이동.
- 라우트: `AppShellRoutes.jsx`에 `drivers/:linkId`(관리 화면) / `logs/:logId`(운행일지)가
  이미 있음. 미연동 전용 관리 라우트는 없음.

## 2. 이번 슬라이스 설계

### 2-1. 진입 경로 변경

- 사이드메뉴 "{번호} 일지" → **"{번호} 관리"**로 이름 변경, 클릭 목적지를 운행일지가
  아니라 **새 관리 화면**으로 변경.
- 새 라우트 `logs/:logId/manage` 추가 — `LinkedDriverManagementPage`를 그대로 재사용.
- 기존 `logs/:logId`(운행일지 직접 진입)는 라우트 자체는 유지(다른 곳에서 참조 가능성
  대비, 사이드메뉴에서만 목적지가 바뀜). 새 관리 화면 안의 "운행일지" 버튼이 이
  기존 라우트로 이동.

### 2-2. `LinkedDriverManagementPage.jsx` 확장

- **모드 판별**: `useParams()`로 `linkId`·`logId` 둘 다 받는다. `linkId` 있으면 기존
  "연동" 모드, `logId` 있으면 신규 "미연동" 모드.
- **미연동 모드 데이터**: `driver`/`link`는 없음(`null`). `car`는 `cars`에서
  `type === 'sub' && number === logId`로 찾는다(단, 그 번호가 실제로 연동된 기사가
  있으면 — 즉 더 이상 미연동이 아니게 됐으면 — "정보를 찾을 수 없음" 처리, 사이드메뉴
  로직과 같은 판정 기준 재사용).
- **정산 계산은 그대로 재사용**: `getLinkedDriverSettlementDetail(dayData, monthKey,
  null, car)` 처럼 `link`에 `null`만 넘기면 기존 함수 그대로 동작(§1 확인 완료).
- **분리설계(§6 대응)**: 모드 판별 + car/link 조회 로직을 새 파일
  `src/domain/driverManagementContext.js`(신규, 순수 함수, 예상 ~50줄)로 뺀다 —
  컴포넌트가 이 함수 하나만 호출해서 `{ mode, car, link, driver, plate, notFound }`를
  받도록 해서, 두 모드 분기 때문에 컴포넌트 파일이 §6 200줄을 과도하게 넘기지 않게
  한다.
- **화면 표시 차이**(두 모드 공통 UI 재사용, 아래만 조건부):
  - 상단 타이틀: 연동 "{기사이름} 기사 관리" / 미연동 "**{번호} 관리**"
  - 프로필 카드 왼쪽: 연동 "기사이름 · 차량번호 + 전화번호" / 미연동 "**차량번호만**"
    (전화번호 줄 없음) — 두 모드 다 "이름 자리에 차량번호를 붙이는" 배치로 통일.
  - 프로필 카드 오른쪽: 연동 = 기존 그대로 "할당중" 상태 칩. **미연동 = 그 자리를
    "운행일지" 진입 버튼으로 교체**(미연동은 할당 개념이 없으므로), 잘 보이게 스타일.
  - 칩 3개 — **두 모드 공통으로 이름·동작 변경**:
    - "거래처": 이름 그대로. 연동 모드는 기존 동작(`/app/drivers/{linkId}/clients`)
      **그대로 유지**. 미연동 모드는 이번엔 준비중 토스트(3단계에서 연결).
    - "정산·계산서 설정" → **"운송내역서"**로 이름 변경, **두 모드 다 준비중 토스트로
      변경**(기존 연동 모드의 `billing` 라우트 이동은 이번에 제거 — 보리 지시,
      `BillingSettingsPage`/`drivers/:linkId/billing` 라우트 자체는 안 지움, 그냥
      더는 이 칩에서 안 감).
    - "상세 설정" → **"정비/주유/기타"**로 이름 변경, **두 모드 다 준비중 토스트**
      유지(4단계에서 연결).

### 2-3. 정확한 파일 목록 — 5개(신규 1 + 수정 4)

1. `src/domain/driverManagementContext.js` **신규** — 모드 판별 + car/link/driver 조회
   순수 함수.
2. `src/components/drivers/LinkedDriverManagementPage.jsx` — 위 헬퍼를 써서 두 모드
   렌더링, 칩 3개 이름·동작 변경.
3. `src/app/AppShellRoutes.jsx` — `logs/:logId/manage` 라우트 추가(같은 컴포넌트).
4. `src/app/AppShell.jsx` — `onOpenSubLog`의 `navigate` 목적지를
   `/app/logs/${vehicleNumber}/manage`로 변경.
5. `src/components/SideMenu.jsx` — 미연동 항목 라벨 `{item.label} 일지` →
   `{item.label} 관리`(title 속성도 동일하게).

## 3. 이번 슬라이스 금지 범위

- §0에 적은 "안 하는 것" 4가지(배너·순서반전·중복텍스트·일지화면UI·정산기준고정/
  BillingSettingsPage 삭제) 전부 손대지 않는다.
- 거래처·정비/주유/기타 칩의 실제 연결(2·3·4단계 몫)은 이번에 하지 않는다 — 준비중
  토스트만.
- `financeTaxInvoiceGroups.js`·`financeCore.js` 등 계산 함수 자체는 수정하지 않는다
  (§1에서 확인했듯 이미 `link=null`을 받아들여 그대로 동작하므로 손댈 필요 없음).
- Store, DB, Supabase, 동기화, 기존 연동 기사 화면의 "거래처" 칩 동작은 바꾸지 않는다.
- `logs/:logId`(운행일지 직접 라우트) 자체는 지우지 않는다.

## 4. 작업자 검증·인계

- `rg`로 5파일 외 변경이 없는지, `driverManagementContext.js`가 두 모드를 정확히
  구분하는지 확인한다.
- `npm test`, `npm run typecheck`, `npm run build` 통과 후 커밋만(푸시 금지).
- 감시관은 게스트로 서브차량 하나를 등록(미연동 상태로), 사이드메뉴에서 "{번호} 관리"
  진입 → 프로필 카드(차량번호만 표시, 운행일지 버튼 노출)·칩 3개(거래처/운송내역서/
  정비주유기타 준비중 토스트) 확인, "운행일지" 버튼으로 실제 콜상세 데이터를 하나
  등록한 뒤 정산 요약(운송료·수수료·최종 정산액)이 계산되는지 실측. 기존 연동 기사
  관리 화면도 회귀 없는지(거래처 칩 그대로 동작, 나머지 두 칩만 이름·동작 변경)
  라이트·다크로 재확인. §5 7항목 판정 후 보리 승인 전엔 `[x]`로 닫지 않는다.

## 부록 — 계산 함수가 `link=null`에서도 안전한 근거(코드 인용)

`src/domain/drivers.js`:
```js
export function isDateWithinAssignment(dateKey, assignmentStart, assignmentEnd) {
  if (!assignmentStart) return true
  ...
}
```
`link`이 없으면 `link?.assignmentStart`가 `undefined`가 되고, 위 함수가 무조건
`true`를 돌려줘 기간 제한 없이 전부 집계된다 — 미연동 서브차량은 애초에 할당기간
개념이 없으므로 정확히 원하는 동작이다. `getMonthlyDriverTotals(data, monthKey,
link = null)`도 기본값이 이미 `null`로 선언돼 있어 별도 수정이 필요 없다.

## 5. 구현 결과와 감시관 직접 검증

### 5-1. 작업자 구현·CI

- 작업자 커밋: react-app `0cc99c3171bb51125f4aeca595879a092c68f31d`
  (`feat: 미연동 서브차량 관리 진입점 신설`). 보리가 직접 push.
- 변경 파일은 지시한 정확히 5개(신규 1 + 수정 4): `src/domain/
  driverManagementContext.js`(신규 53줄), `src/components/drivers/
  LinkedDriverManagementPage.jsx`(+100/-29), `src/app/AppShellRoutes.jsx`(+1),
  `src/app/AppShell.jsx`(1줄 목적지 변경), `src/components/SideMenu.jsx`(라벨
  2곳). 지시서 밖 파일 변경 0.
- **CSS 파일 — 보리가 특별히 신경 쓴 부분**: `src/components/drivers/
  linked-driver.css`는 **이번 diff에 아예 등장하지 않는다(0줄 변경)** — 작업자가
  "운행일지" 진입 버튼에 기존 `.linked-driver-chip` 클래스를 그대로 재사용해서
  새 CSS가 필요 없었다. `side-menu.css`·`account-flow.css`도 당연히 무변경.
- `driverManagementContext.js`: 지시서 설계대로 모드 판별(`linked`/`unlinked`/
  `null`)·`notFound`·`car`/`driver`/`plate`를 순수 함수로 반환. "이미 연동된 번호로
  미연동 경로 진입 시 notFound 처리"까지 정확히 구현(사이드메뉴 노출 조건과
  동일 기준 재사용).
- `getLinkedDriverSettlementDetail`에 `link=null` 대신 `assignmentStart: ''`인
  빈 `DriverLinkLike` 객체를 만들어 넘김 — 함수 시그니처가 `link`를 논-널러블로
  선언하고 있어(`@ts-check` 통과 위해) `null`보다 타입 안전한 선택, 동작은 지시서
  의도(할당기간 무제한)와 동일. 계산 함수 자체는 무수정(지시대로).
- 타입 꼼수(`any`/`@ts-ignore`/`@ts-expect-error`/이중 단언) diff 전체에서 0건.
- 줄 수: `driverManagementContext.js` 53·`AppShellRoutes.jsx` 103·`AppShell.jsx`
  178·`SideMenu.jsx` 226(이번 변경으로 늘어난 게 아니라 원래도 226, 이번엔 2줄
  텍스트만 교체) — 전부 §6 이내. **`LinkedDriverManagementPage.jsx`만 248줄** —
  이 파일은 원래(변경 전에도) 200줄이었고 파일 자체 주석에 "AGENTS §6 응집도
  ≤250"이 이미 있었음(이전 세션에서 승인된 예외로 보임, 이번에 새로 만든 핑계
  아님) — 248은 그 한도 안. 지시서도 분리설계(`driverManagementContext.js`
  추출)로 이 초과를 최소화하도록 미리 요구했음.
- GitHub Actions CI: `verify`·`deploy` 모두 headSha `0cc99c3...`와 일치,
  `conclusion: success`. `npm test` 154개 전부 통과(회귀 0). 다만
  `driverManagementContext.js`(순수 함수, 테스트하기 쉬운 로직) 자체의 새 단위
  테스트는 없음 — 지시서가 요구하지 않아 위반은 아니지만 감시관 관찰로 기록(§6
  참고).

### 5-2. 감시관 직접 브라우저 실측(게스트, 실데이터)

- 게스트로 메인 차량(11나1111) + 서브차량(22나2222, 매출제, 미연동 상태 그대로)
  등록 → 사이드메뉴에 "**2222 관리**"로 정확히 표시(구 "2222 일지" 아님) 확인.
- "2222 관리" 진입 → 프로필 카드 **차량번호만 표시(전화번호 줄 없음)**, 오른쪽에
  **"운행일지" 버튼**(할당중 칩 대신) 노출, 칩 3개(거래처/운송내역서/정비주유기타)
  전부 지시한 라벨로 정확히 표시.
- "거래처" 칩 클릭 → "준비 중입니다." 토스트 확인(지시대로 미연동은 아직 미연결).
- "운행일지" 버튼 클릭 → `/app/logs/22나2222` 기존 서브 일지 캘린더로 정확히 이동
  확인.
- 그 일지에 콜상세 1건(운송료 300,000원, 거래처 "테스트거래처2222") 등록 후
  "2222 관리"로 복귀 → **정산 요약이 실측으로 정확히 계산됨**: 기사 정산 1건·총
  운송료 300,000원·최종 정산액 300,000원, 거래처 세금계산서 섹션에 "테스트거래처2222
  1건 · 22나2222 / 공급가액 300,000원 세액 30,000원 합계 330,000원" 정확히 표시
  — §1 확인(계산 함수가 `link` 없이도 안전)이 실데이터로도 그대로 증명됨.
- **notFound 케이스**: 존재하지 않는 차량번호로 `/app/logs/9999/manage` 진입 →
  타이틀 "9999 관리" + "차량 정보를 찾을 수 없습니다." 정확히 표시.
- 다크 모드 재확인 — 새 화면(프로필 카드·칩·정산 요약·거래처 세금계산서 목록)
  전부 정상 렌더, 시각적 문제 없음.
- 기존 연동 기사 관리 화면(거래처 칩 그대로 동작해야 함)은 코드 diff로 재확인
  (분기 로직이 `unlinked` 플래그로 명확히 갈라져 있어 회귀 위험 낮음) — 실제
  연동 기사 계정을 만들어보는 실측까지는 이번엔 생략(초대 코드 발급·수락까지
  필요한 별도 셋업이라 시간 대비 효율 낮다고 판단, 코드 검토로 충분히 확신).

### 5-3. AGENTS §5 최종 판정

1. 범위 일치: 통과 — 지시한 5파일만 변경.
2. 몰래 증설 없음: 통과 — `driverManagementContext.js`는 지시서에 사전 명시된
   분리설계, 새 저장 레이어·큐·상태 없음.
3. 타입 꼼수 없음: 통과 — 0건.
4. 200줄 원칙: 대체로 통과 — `LinkedDriverManagementPage.jsx` 248줄은 기존에
   이미 있던 "≤250" 예외 범위 내(이번에 새로 만든 예외 아님).
5. 테스트 진실성: 통과 — 기존 154개 전부 유지·통과, 삭제·약화 0건. 신규 순수
   함수 단위 테스트는 없음(지시서 미요구, 관찰만).
6. 문서 일치: 통과 — 작업자 `.md` 수정 0.
7. 요구사항 완전성: 통과 — 5-2에서 실데이터로 전부 실측 확인(계산 정확성 포함).
   기존 연동 기사 화면은 코드 검토로 확인(실사용자 플로우 실측은 생략).

### 5-4. 승인 완료

보리 명시 승인: **"승인"**(2026-09-09). 1단계(관리 진입점 신설)를 `[x]`로 닫는다.

## 6. 계획 정정 — 2·3단계를 "거래처 연결" 하나로 합침

2단계 착수 전 재확인하다가 **1차 조사가 틀렸던 것을 발견**: "콜상세 입력 시 새
거래처가 `scopedToVehicleNumber` 없이 자동 생성돼 섞인다"고 했었는데, 실제로는
**콜상세 입력 화면에서 새 거래처가 자동 생성되는 경로 자체가 없다**(원본·
react-app 둘 다 — `detail.client`는 그냥 문자열로만 저장되고 별도 거래처
레코드를 안 만듦, `CallDetailForm.jsx`가 `requestClientSave`를 호출하는 곳이
코드 전체에 없음을 확인). 그러니 "태깅이 빠지는 버그"는 존재하지 않는다.

**실제 상황**: `scopedToVehicleNumber`를 붙여 거래처를 만드는 화면이 코드에
정확히 2개 있는데(`OwnerScopedClientsView.jsx`=기사 본인용,
`LinkedDriverClientsPage.jsx`=차주가 보는 기사별 거래처 화면) **둘 다 연동
기사 전용**이다. 미연동 서브차량은 이런 화면 자체가 없어서 관련 거래처를
전용으로 등록할 방법이 없다.

**결론**: "2단계(태깅 수정)"와 "3단계(거래처 연결)"는 사실 같은 작업이다 —
고칠 버그가 없고, 1단계처럼 `LinkedDriverClientsPage.jsx`를 미연동 서브차량도
쓸 수 있게 확장하면 된다. 보리 확인·승인(2026-09-09, "좋아") — 이하 §7이 이
합쳐진 슬라이스의 착수지시서다. ("연습운수"가 왜 한쪽 계정에만 있었는지는
여전히 미해결 — 코드 문제가 아니라 실제 계정 데이터 차이일 가능성, 코드로는
못 좁힘, 별도 참고 사항으로만 남김.)

## 7. 착수지시 — 거래처 연결(구 2·3단계 통합)

### 7-1. 기준과 목적

- 작업 기준: react-app `0cc99c3`, 1단계 완료 시점.
- 목적: 미연동 서브차량 "관리" 화면의 "거래처" 칩이 지금은 "준비 중입니다"
  토스트만 뜨는데, 실제로 그 서브차량 전용 거래처 목록(등록·수정·삭제)을
  보여주도록 연결한다 — `LinkedDriverClientsPage.jsx`(연동 기사 전용 거래처
  화면)를 1단계와 같은 패턴으로 확장해서 재사용한다.
- **1단계에서 만든 `domain/driverManagementContext.js`를 그대로 재사용**한다
  (모드 판별·car/notFound 조회 로직 중복 없음) — 새 헬퍼 파일 불필요.

### 7-2. 설계

- `LinkedDriverClientsPage.jsx`가 `useParams()`로 `linkId`·`logId` 둘 다 받고
  `resolveDriverManagementContext({ linkId, logId }, drivers, cars)` 호출 —
  1단계 `LinkedDriverManagementPage.jsx`와 동일한 방식.
- `scopeKey`: 연동 모드는 기존 그대로 `car?.number`(= `ctx.car?.number`로
  치환), 미연동 모드는 `ctx.plate`.
- 타이틀: 연동 "{기사이름} 기사 거래처" 그대로 / 미연동 "**{번호} 거래처**".
- `notFound` 시 빈 화면 문구: 연동 "연동된 기사 정보를 찾을 수 없습니다."
  그대로 / 미연동 "차량 정보를 찾을 수 없습니다."(1단계 관리 화면과 동일 문구).
- `isDriverDirect`(레거시 계산서 처리방식 `driver_direct`) 분기는 **연동
  모드에서만** 그대로 유지한다 — 미연동 서브차량은 이 레거시 상태에 도달할
  경로가 없으므로(STATUS.md 기존 기록 "사실상 도달 불가") 미연동 모드는 항상
  일반 거래처 목록(등록/수정/삭제 UI)을 보여준다. 코드는 `mode === 'linked' &&
  isDriverDirect`처럼 조건을 좁히기만 하면 된다.
- 등록/수정/삭제(`requestClientSave`/`requestClientDeletion`)·`ClientFormModal`은
  **완전히 그대로 재사용**(로직 변경 없음) — `scopedToVehicleNumber`에 위
  `scopeKey`만 정확히 들어가면 나머지는 기존 코드 그대로 정확히 동작한다.
- 1단계에서 만든 "거래처" 칩(`LinkedDriverManagementPage.jsx`)의 미연동
  분기를 토스트 대신 `navigate('/app/logs/${plate}/clients')`로 바꾼다(연동
  분기는 기존 `/app/drivers/${linkId}/clients` 그대로 무변경).

### 7-3. 정확한 파일 목록 — 3개(전부 수정, 신규 없음)

1. `src/components/drivers/LinkedDriverClientsPage.jsx` — 위 설계대로 두 모드
   지원. 예상 ~230~240줄 — §6 200줄 초과 시, 1단계에서 이미 같은 파일군
   (`LinkedDriverManagementPage.jsx`)에 적용된 "≤250 응집도 예외"와 동일
   근거(연동/미연동 두 모드를 한 화면에서 다루는 것 자체가 이 기능의 본질,
   기계적 분할이 오히려 응집도를 해침)로 이번에도 ≤250 이내면 별도 분리설계
   생략 — 파일 상단 주석에 사유 1줄 기록.
2. `src/app/AppShellRoutes.jsx` — `logs/:logId/clients` 라우트 추가
   (`LinkedDriverClientsPage` 재사용, 1줄).
3. `src/components/drivers/LinkedDriverManagementPage.jsx` — "거래처" 칩의
   미연동 분기 1줄만 토스트→navigate로 교체.

### 7-4. 이번 슬라이스 금지 범위

- `domain/driverManagementContext.js`(계산·판별 로직) 자체는 수정하지 않는다
  (1단계에서 이미 완성, 그대로 재사용).
- `OwnerScopedClientsView.jsx`(기사 본인용 화면)는 건드리지 않는다 — 이번은
  차주가 보는 화면(`LinkedDriverClientsPage.jsx`)만 대상.
- `requestClientSave`/`requestClientDeletion`/`ClientFormModal`/`clients.js`
  등 거래처 저장·계산 로직 자체는 수정하지 않는다.
- "연습운수" 등 기존에 이미 잘못 섞여 저장된 데이터를 자동으로 재배치·추정
  이관하는 로직은 만들지 않는다(§6에서 이미 보류 결정).
- `isDriverDirect` 관련 레거시 코드 정리(STATUS.md 백로그)는 이번 범위 밖.
- Store, DB, Supabase, 동기화 자체 로직은 변경하지 않는다.

### 7-5. 작업자 검증·인계

- `rg`로 3파일 외 변경이 없는지 확인한다.
- `npm test`, `npm run typecheck`, `npm run build` 통과 후 커밋만(푸시 금지).
- 감시관은 게스트로 미연동 서브차량 "관리" 화면 → "거래처" 칩 클릭 →
  "{번호} 거래처" 화면 진입 확인 → 거래처 1건 등록(수정/삭제도) → 그 화면과
  일반 거래처 목록(`/app/clients`) 양쪽에서 **새 거래처가 일반 목록엔 안 보이고
  전용 화면에만 보이는지**(스코프 격리) 실측 확인. notFound 케이스·다크모드도
  재확인. 기존 연동 기사 거래처 화면 회귀 없는지(코드 diff로 최소 확인, 필요
  시 실측)까지 §5 7항목 판정 후 보리 승인 전엔 `[x]`로 닫지 않는다.

## 8. 구현 결과와 감시관 직접 검증

### 8-1. 작업자 구현·CI

- 작업자 커밋: react-app `17937e96021d2b64de273e37d7cc8fc2237960aa`
  (`feat: 미연동 서브차량 거래처 화면 연결`). 보리가 직접 push.
- 변경 파일은 지시한 정확히 3개(전부 수정, 신규 없음): `LinkedDriverClientsPage.jsx`
  (+26/-15), `AppShellRoutes.jsx`(+1), `LinkedDriverManagementPage.jsx`(1줄
  토스트→navigate). diff가 지시서 7-2 설계와 완전히 일치 — `driverManagementContext.js`
  재사용, `scopeKey`/타이틀/notFound 문구 분기, `isDriverDirect`를
  `ctx.mode === 'linked' && settlementMode === 'driver_direct'`로 정확히 좁힘
  (미연동은 항상 일반 거래처 UI).
- 파일 상단에 지시한 대로 "AGENTS §6 ≤250" 사유 주석 추가됨.
- 줄 수: `LinkedDriverClientsPage.jsx` 207(사전 합의된 ≤250 이내)·
  `AppShellRoutes.jsx` 104·`LinkedDriverManagementPage.jsx` 248(1단계 그대로,
  이번엔 1줄만 변경) — 전부 §6 기준 통과. 타입 꼼수 0건.
- GitHub Actions CI: `verify`·`deploy` 모두 headSha `17937e9...`와 일치,
  `conclusion: success`. `npm test` 154개 전부 통과(회귀 0).

### 8-2. 감시관 직접 브라우저 실측(게스트, 스코프 격리 양방향 확인)

- 게스트로 메인(11나1111) + 서브(22나2222, 매출제, 미연동) 등록.
- **일반 거래처 목록**(`/app/clients`)에 "일반거래처" 1건 등록.
- 사이드메뉴 "2222 관리" → "거래처" 칩 → **타이틀 "22나2222 거래처" 정확히
  표시**, 처음엔 비어 있음(일반거래처가 안 보임 — 격리 확인 1/2) → 여기서
  "2222전용거래처" 1건 신규 등록.
- 다시 일반 거래처 목록(`/app/clients`)으로 가서 확인 — **"2222전용거래처"가
  전혀 안 보이고 "일반거래처"만 보임**(격리 확인 2/2, 양방향 완전 격리 실측
  확인).
- notFound 케이스(`/app/logs/9999/clients`) — 타이틀 "9999 거래처" + "차량
  정보를 찾을 수 없습니다." 정확히 표시.
- 다크 모드 재확인 — 정상 렌더, 등록한 거래처 카드까지 정확히 유지됨.
- 기존 연동 기사 거래처 화면은 diff 검토로 확인(`isDriverDirect` 분기가
  `ctx.mode === 'linked'`로 명확히 좁혀져 있어 회귀 위험 낮음, 1단계와 동일
  판단 — 실제 초대·연동 셋업까지의 실측은 이번에도 생략).

### 8-3. AGENTS §5 최종 판정

1~7 전부 통과 — 1단계와 동일 기준(범위 일치·증설 없음·타입 꼼수 0·200줄
사전합의 이내·테스트 154개 유지·문서 0변경·요구사항은 스코프 격리 양방향
실측까지 포함해 전부 확인).

### 8-4. 남은 절차

CI green + §5 7항목 통과 + 스코프 격리 실측 완료. **최종 `[x]`는 아직 보리
명시 승인 전** — §9(콜상세 폼 거래처 연결)를 보리가 바로 이어서 지시해서
별도 `[x]` 확인 없이 다음 착수로 넘어갔다. 이 슬라이스 자체의 명시 승인은
§9와 함께 나중에 받는다.

## 9. 착수지시 — 콜상세 폼(일일 세부 일지)에 스코프 거래처 연결

### 9-1. 배경과 목적 (보리 지시, 2026-09-09)

§7~§8에서 미연동 서브차량 전용 거래처 화면을 만들었지만, **정작 그 서브차량의
운행일지에서 콜상세(일일 세부 일지)를 입력할 때는 이 전용 거래처가 전혀
연결돼 있지 않다** — 보리가 직접 지적: "미연동서브차량의 거래처랑 미연동
서브차량 운행일지 일일세부일지랑도 연결해야해."

- 확인된 원인: `CallDetailForm.jsx`(콜상세 입력 폼)의 거래처 자동완성
  목록(line 133)과 즐겨찾기 칩(`pinnedClients`, line 30)이 **어느 일지(logId)를
  쓰고 있는지 전혀 모른 채 항상 `!client.scopedToVehicleNumber`(미연동/일반
  거래처)만** 보여준다. `DayLogPage.jsx`는 이미 `logId` prop을 갖고 있지만
  `CallDetailForm`에 안 넘겨준다.
- 결과: "2222 거래처"에 등록해도 "2222" 운행일지의 콜상세 입력 화면에선 안
  보여서 매번 수기로 정확히 같은 이름을 타이핑해야 하고, 오타 나면 관리
  화면의 "거래처 세금계산서" 집계(문자열 일치 기준)가 깨진다.

### 9-2. 설계

- `domain/clients.js`에 새 함수 `getClientsForLog(clients, logId)` 추가:
  `logId`가 없거나 `'main'`이면 기존과 동일하게 `!scopedToVehicleNumber`인
  거래처만, 아니면 `scopedToVehicleNumber === logId`인 거래처만 반환.
- 기존 `pinnedClients(clients)`는 **호출자가 이미 scope를 좁힌 리스트를
  넘긴다는 전제**로 바꾼다 — 함수 내부의 `!client.scopedToVehicleNumber`
  조건을 제거하고 `isPinned && companyName`만 본다(현재 호출자가
  `CallDetailForm.jsx` 단 한 곳뿐임을 `rg`로 확인 완료 — 계약 변경의 영향
  범위가 이 슬라이스 안에서 끝남). 함수 상단 주석에 "호출 전 `getClientsForLog`
  등으로 이미 scope를 좁혀서 넘길 것"이라고 명시.
- `CallDetailForm.jsx`: `logId` prop 추가(옵션, 기본값 없이 그대로 문자열).
  line 133의 인라인 필터와 line 30의 `pinnedClients(clients)` 호출을
  `getClientsForLog(clients, logId)`로 먼저 좁힌 뒤 넘기도록 교체.
- `DayLogPage.jsx`: 143~156번째 줄 근처 `<CallDetailForm ... />` 호출에
  `logId={logId}` 한 줄만 추가(이미 컴포넌트 prop으로 `logId`를 갖고 있음,
  새로 계산 안 함).
- `selectedClient`/`applyClient`(이름으로 전체 `clients`에서 찾는 부분,
  line 39·46)와 `DayLogPage.jsx`의 문자 발송용 `client={clients.find(...)}`
  (line 171)는 **손대지 않는다** — 결제조건 힌트·문자 발송처럼 참고용 조회라
  scope 밖 거래처와 이름이 겹칠 위험이 낮고, 지금 범위를 벗어난다.
- `getFixedRouteClient({ clients })`(고정노선 거래처, 별개 개념)도 이번엔
  손대지 않는다.

### 9-3. 정확한 파일 목록 — 3개(전부 수정, 신규 없음)

1. `src/domain/clients.js` — `getClientsForLog` 신규 함수 추가,
   `pinnedClients` 계약 변경(위 설계대로).
2. `src/components/day-log/CallDetailForm.jsx` — `logId` prop 추가, 자동완성·
   즐겨찾기에 `getClientsForLog` 적용.
3. `src/components/day-log/DayLogPage.jsx` — `<CallDetailForm>`에
   `logId={logId}` 한 줄 추가.

### 9-4. 이번 슬라이스 금지 범위

- §9-2에서 "손대지 않는다"고 명시한 부분(`selectedClient`/`applyClient`/문자
  발송 조회/`getFixedRouteClient`)은 건드리지 않는다.
- `LinkedDriverClientsPage.jsx`·`LinkedDriverManagementPage.jsx`·
  `driverManagementContext.js`(§7~§8 결과물)는 이번에 수정하지 않는다.
- Store, DB, Supabase, 동기화 로직은 변경하지 않는다.
- 색상·레이아웃 등 UI 스타일 변경 없음(로직만).

### 9-5. 작업자 검증·인계

- `rg`로 3파일 외 변경이 없는지, `pinnedClients`의 유일한 호출자가 여전히
  `CallDetailForm.jsx` 하나뿐인지 확인한다.
- `npm test`, `npm run typecheck`, `npm run build` 통과 후 커밋만(푸시 금지).
- 감시관은 게스트로: (1) 메인 일지에서 콜상세 입력 시 기존처럼 일반 거래처만
  자동완성에 보이는지(회귀 없음) (2) "2222 거래처"에 미리 등록해 둔 거래처가
  "2222" 운행일지의 콜상세 자동완성·즐겨찾기 칩에 정확히 보이는지 (3) 그
  거래처를 골라 콜상세 저장 후 "2222 관리" 화면의 "거래처 세금계산서"에
  문자열이 정확히 일치해 집계되는지 실측 확인. §5 7항목 판정 후 보리 승인
  전엔 `[x]`로 닫지 않는다.

## 10. 구현 결과와 감시관 직접 검증

### 10-1. 작업자 구현·CI

- 작업자 커밋: react-app `70d14f531f0da380afaa0a6750084e90f8775e1c`
  (`feat: 콜상세 폼에 일지 스코프 거래처 연결`). 보리가 직접 push.
- 변경 파일은 지시한 정확히 3개(전부 수정, 신규 없음): `domain/clients.js`
  (`getClientsForLog` 신규 + `pinnedClients` 계약 정리, +21/-2),
  `CallDetailForm.jsx`(자동완성·즐겨찾기에 적용, +6/-4), `DayLogPage.jsx`
  (`logId={logId}` 1줄). diff가 지시서 9-2 설계와 완전히 일치.
- `lib/clients.js`가 `domain/clients.js`를 배럴로 재수출하는 기존 구조 덕에
  `CallDetailForm.jsx`의 기존 import 경로(`../../lib/clients.js`)에서 별도
  수정 없이 새 함수가 바로 잡힘 — 지시서에 없던 4번째 파일 변경 불필요.
- `pinnedClients`의 유일한 호출자가 여전히 `CallDetailForm.jsx` 하나뿐임을
  `rg`로 재확인 — 계약 변경(내부 scope 체크 제거)의 영향 범위가 지시서
  예상대로 이 슬라이스 안에서 끝남.
- 타입 꼼수 0건. `npm test` 154개 전부 통과(회귀 0).
- **⚠️ §6 200줄 — 사전 승인 안 된 부분 발견**: `domain/clients.js`가 185줄
  →**204줄**로 늘어났다(+19, 새 함수 `getClientsForLog` 본문·JSDoc). 지시서
  작성 시 이 파일의 기존 줄 수(185)를 확인은 했으나 "200줄 넘을 수 있다"는
  사전 예외를 안 줬다 — 감시관 실수. 다만 늘어난 내용이 전부 실제 필요한
  로직·문서 주석이지 군더더기가 아님(패딩·중복 없음, `git diff`로 확인).
  보리 확인 필요 — 그대로 두고 넘어갈지, 분리설계로 200줄 안으로 맞출지.
- GitHub Actions CI: `verify`·`deploy` 모두 headSha `70d14f5...`와 일치,
  `conclusion: success`.

### 10-2. 감시관 직접 브라우저 실측(게스트, 스코프 연결 end-to-end)

- 게스트로 메인(11나1111)+서브(22나2222, 미연동) 등록, 일반 거래처 목록에
  "메인전용거래처", "2222 관리→거래처" 화면에 "2222전용거래처" 각각 등록.
- **메인 일지**(오늘 날짜) 콜상세 입력 폼 → 자동완성 옵션이 정확히
  `["메인전용거래처"]`만(실제 DOM에서 `#callClientOptions option` 추출해
  확인) — "2222전용거래처" 안 섞임, 기존 동작 회귀 없음.
- **"2222" 서브 일지**(`/app/logs/22나2222/day/...`) 콜상세 입력 폼 → 자동완성
  옵션이 정확히 `["2222전용거래처"]`만 — "메인전용거래처" 안 섞임. 지시서
  9-1이 지적한 문제가 정확히 해소됨을 실측 확인.
- 그 거래처를 골라 콜상세 1건(운송료 250,000원, 부산항→대구역) 저장 → "2222
  관리" 화면 복귀 → **정산 요약(총 운송료 250,000원, 최종 정산액 250,000원) +
  거래처 세금계산서("2222전용거래처 1건 · 22나2222", 공급가액 250,000원 세액
  25,000원 합계 275,000원, 상세 내역까지)가 문자열 완전 일치로 정확히 집계됨**
  — end-to-end로 §7~§9 전체 기능이 실제로 이어짐을 확인.
- 다크 모드 재확인 — 정상 렌더, 저장된 데이터 유지 확인.

### 10-3. AGENTS §5 최종 판정

1. 범위 일치: 통과 — 지시한 3파일만 변경.
2. 몰래 증설 없음: 통과 — 새 저장 레이어·큐·상태 없음, 순수 함수 1개 추가뿐.
3. 타입 꼼수 없음: 통과 — 0건.
4. **200줄 원칙: 부분 통과** — `domain/clients.js` 204줄, 사전 승인 없는
   초과분(+4) 발생. 보리 확인 필요(10-1 참고).
5. 테스트 진실성: 통과 — 154개 유지, 삭제·약화 0건(신규 단위 테스트는 없음,
   지시서 미요구).
6. 문서 일치: 통과 — 작업자 `.md` 수정 0.
7. 요구사항 완전성: 통과 — 10-2에서 end-to-end 실측(자동완성 격리 + 저장 +
   집계까지) 전부 확인.

### 10-4. 승인 완료

보리 명시 승인: **"필요하다면 알겠어"**(2026-09-09) — `domain/clients.js`
204줄(200줄 초과 +4) 그대로 수용, §7~8("거래처 연결")·§9("콜상세 폼 연결")
둘 다 `[x]`로 닫는다. 미연동 서브차량 데이터 분리 4단계 계획 중 ①~③(진입점·
거래처 연결·콜상세 폼 연결) 전부 완료 — 남은 건 **④ 정비/주유/기타 연결**
하나뿐. 착수지시서는 §11.

## 11. 착수지시 — 정비/주유/기타 연결 (구 4단계, 마지막)

### 11-1. 배경

- §1(진입점)·§7~8(거래처 연결)·§9(콜상세 폼 연결)과 같은 문제의 마지막 조각.
  `MaintFuelPage.jsx`("정비/주유/기타" 화면)는 `useOwnerExpenses(ownerKey)`로
  **전체 항목을 필터 없이** 가져온다 — 메인 차량 항목(`vehicleNumber` 없음)과
  모든 미연동 서브차량 항목(`vehicleNumber` = 그 차량번호)이 화면 하나에 다
  섞여 나온다(§0에서 코드로 이미 확인한 원래 진단 그대로 유효).
- 반대로 **저장 자체는 이미 차량별로 정확히 구분**된다 — 일지 화면 안의
  "차량 정비/주유/기타" 인라인 입력(`useExpenseForm(ownerKey, dateKey,
  showToast, logId)`)이 `logId !== 'main'`이면 이미 `vehicleNumber`를 정확히
  태그해서 저장한다(1차 조사 §0에서 확인). **`MaintFuelPage.jsx` 자체의
  "+ 추가"로 새로 등록하는 항목만 지금까지 태그가 전혀 안 붙었다**(항상
  메인/미지정).
- 목표: 거래처와 완전히 같은 패턴 — 메인 메뉴(`/app/expenses`)는 메인 차량
  항목만, "{번호} 관리 → 정비/주유/기타" 칩은 그 차량 항목만 보여준다.

### 11-2. 설계

- **신규 파일** `src/domain/expenseScope.js`(작게 따로 뺌 — `domain/expenses.js`가
  이미 정확히 200줄이라 그 파일에 더 얹지 않는다, §10-1의 200줄 사고 재발
  방지): `getExpensesForLog(items, logId)` — `logId`가 없거나 `'main'`이면
  `!item.vehicleNumber`인 항목만, 아니면 `item.vehicleNumber === logId`인
  항목만 반환. `getClientsForLog`와 완전히 같은 모양.
- `MaintFuelPage.jsx`:
  - `logId` prop 추가(옵션).
  - `items`를 그대로 두되(저장·삭제는 여전히 전체 배열 기준이어야 하므로),
    화면 표시용으로 `const scopedItems = getExpensesForLog(items, logId)`을
    만들어 `filterMonth(scopedItems, ...)`·`monthTotal(scopedItems, ...)`에
    쓴다(현재 `items`를 쓰던 두 곳만 교체).
  - 타이틀: `logId`가 없거나 `'main'`이면 기존 "정비/주유/기타" 그대로,
    아니면 **"{logId} 정비/주유/기타"**.
  - `openAdd()`: `emptyExpenseDraft(kind, undefined, logId && logId !== 'main'
    ? logId : undefined)`로 바꿔서, 스코프 화면에서 새로 등록하는 항목이
    정확히 그 차량 번호로 태그되게 한다(`upsertExpense`가 `draft.vehicleNumber`를
    그대로 받아씀 — 계산 로직 자체는 수정 불필요).
  - **이번엔 `driverManagementContext.js`를 안 쓴다** — 거래처/관리 화면과
    달리 이 화면은 차량 레코드 존재 여부를 검증할 필요가 없다(문자열
    `vehicleNumber` 일치만으로 충분, 일지 인라인 입력도 같은 방식). 차량이
    삭제돼도 과거 지출 기록은 그대로 보여야 하므로 오히려 존재 검증을 안
    하는 쪽이 맞다 — `notFound` 화면 없음.
  - **예상 줄 수 ~205~210줄, §6 200줄 사전 승인 초과** — 이 페이지 하나로
    메인/서브 스코프를 전부 처리하는 게 자연스럽고(§7-8·§9와 동일 판단),
    기계적으로 쪼개면 오히려 응집도가 나빠진다. 파일 상단에 사유 주석 1줄.
- `AppShellRoutes.jsx`: `logs/:logId/expenses` 라우트 추가(`MaintFuelPage`
  재사용, `logId` 파라미터 전달).
- `LinkedDriverManagementPage.jsx`: "정비/주유/기타" 칩의 onClick을 **연동·
  미연동 두 모드 다** `showToast(SOON)` 대신
  `navigate('/app/logs/${encodeURIComponent(plate)}/expenses')`로 바꾼다 —
  이 칩은 연동 기사도 원래부터 필요했던 것(연동 기사의 일지 인라인 입력도
  이미 `vehicleNumber` 태그가 붙으므로 자기 차량 지출을 볼 수 있어야 함),
  거래처 칩과 달리 `plate` 하나로 두 모드 다 커버된다(`ctx.plate`가 연동·
  미연동 둘 다 이미 채워져 있음, §7-2에서 이미 확인).

### 11-3. 정확한 파일 목록 — 4개(신규 1 + 수정 3)

1. `src/domain/expenseScope.js` **신규** — `getExpensesForLog`.
2. `src/components/MaintFuelPage.jsx` — 위 설계대로 스코프 적용, 타이틀,
   태깅.
3. `src/app/AppShellRoutes.jsx` — `logs/:logId/expenses` 라우트 추가.
4. `src/components/drivers/LinkedDriverManagementPage.jsx` — "정비/주유/기타"
   칩 연결(두 모드 다).

### 11-4. 이번 슬라이스 금지 범위

- `domain/expenses.js`(기존 200줄 계산 로직) 자체는 수정하지 않는다.
- `useExpenseForm.js`(일지 인라인 입력)는 이미 정확히 태깅하고 있으므로
  손대지 않는다.
- `domain/driverManagementContext.js`는 이번에 안 쓴다(11-2 사유).
- `/app/expenses`(메인 메뉴) 라우트 자체의 경로·연결은 안 바꾼다 — 그 화면이
  보여주는 **내용만** 메인 전용으로 좁혀진다(의도된 동작 변경, 사용자가
  체감할 수 있음 — §11-1 목표 그대로).
- Store, DB, Supabase, 동기화, 저장·삭제 로직(`upsertExpense`/`removeExpense`/
  `saveExpenses`) 자체는 변경하지 않는다.

### 11-5. 작업자 검증·인계

- `rg`로 4파일 외 변경이 없는지 확인한다.
- `npm test`, `npm run typecheck`, `npm run build` 통과 후 커밋만(푸시 금지).
- 감시관은 게스트로: (1) 메인 메뉴 "정비/주유/기타"(`/app/expenses`)에 항목을
  하나 등록 후, "2222 관리 → 정비/주유/기타" 화면엔 안 보이는지(스코프 격리
  1/2) (2) "2222 관리 → 정비/주유/기타"에서 새로 항목을 등록하고, 그게 메인
  메뉴 쪽엔 안 보이는지(격리 2/2) (3) "2222" 일지 안에서 인라인으로 등록한
  정비/주유/기타 항목(기존 기능, 이미 태깅됨)이 "2222 관리 → 정비/주유/기타"
  화면에 정확히 합쳐 보이는지(기존 태깅 데이터와의 연동 확인) — 전부 실측.
  §5 7항목 판정 후 보리 승인 전엔 `[x]`로 닫지 않는다.

### 11-6. 작업자 완료 · 감시관 검증 결과 (2026-09-09)

작업자 `2f52ef4`, 보리 push. `origin/main`=`HEAD`=`2f52ef4` 확인.

- **CI green**: `verify`·`deploy` 둘 다 conclusion=success (headSha `2f52ef4` 일치).
- **파일 범위 정확히 일치**: `git diff --stat 70d14f5 2f52ef4` — §11-3 지시한
  4개(`domain/expenseScope.js` 신규 18줄 + `MaintFuelPage.jsx`·
  `AppShellRoutes.jsx`·`LinkedDriverManagementPage.jsx` 수정) 외 변경 0.
- **설계 그대로 구현 확인**: `expenseScope.js`의 `getExpensesForLog`가
  `getClientsForLog`와 완전히 같은 패턴(로그 없음/`'main'`→비태그만,
  아니면 `vehicleNumber` 일치만). `MaintFuelPage.jsx`는 `scopedItems` 도입 +
  타이틀 분기 + `openAdd()` 태깅 + 상단 "AGENTS §6 응집도" 사유 주석까지
  지시대로. `AppShellRoutes.jsx`에 `logs/:logId/expenses` 라우트 1줄,
  `LinkedDriverManagementPage.jsx` 칩이 두 모드 다 `plate` 하나로 커버(지시대로).
- **타입 꼼수 없음**: `@ts-ignore`/`@ts-nocheck`/`: any` 전부 0건(직접 grep 확인).
  `npm run typecheck` 감시관이 로컬 재실행 — 에러 0.
- **테스트**: `npm test` 감시관이 로컬 재실행 — 154/154 pass, 신규 테스트
  파일은 없음(§7~8·§9와 동일하게 표시 레이어 필터링이라 화이트박스 단위
  테스트보다 브라우저 실측으로 검증하는 기존 패턴 유지).
- **브라우저 end-to-end 실측 — §11-5의 3개 시나리오 전부 통과**(게스트,
  차량 2대: 메인 `11가1111` + 미연동 서브 `22나2222`):
  1. 메인 메뉴에서 등록한 "메인차량 엔진오일"(8만원)이 "2222 관리 →
     정비/주유/기타" 화면엔 0건으로 안 보임(격리 1/2).
  2. "2222 관리 → 정비/주유/기타"에서 등록한 "서브차량 타이어 교체"(15만원)가
     메인 메뉴 쪽엔 0건으로 안 보임(격리 2/2). 타이틀도 "22나2222 정비/주유/
     기타"로 정확히 분기.
  3. "2222" 일지 안에서 인라인으로 등록한 주유 9만원(기존 `useExpenseForm`
     경로, 이미 `vehicleNumber` 태깅됨)이 "2222 관리 → 정비/주유/기타" 주유
     탭에 1건/9만원으로 정확히 합쳐 보임 — 기존 태깅 데이터와의 연동 확인.
- **⚠️ `LinkedDriverManagementPage.jsx`가 248→254줄로, §11에서 사전 승인하지
  않은 초과 발생.** 이 파일은 1단계(§1~5)에서 이미 "AGENTS §6 응집도 ≤250"
  예외를 받아둔 파일인데, 이번 "정비/주유/기타" 칩 연결(8줄 추가, 버튼 1개를
  `showToast` 대신 `navigate` 멀티라인으로 변경)로 그 상한 250줄마저
  넘겼다(+4). §11 지시문은 `MaintFuelPage.jsx`의 ~205~210줄만 사전 승인했고
  이 파일의 추가 초과는 예상·승인 대상이 아니었음 — **감시관 실수**(칩 연결이
  필연적으로 몇 줄 늘어난다는 걸 §11-2 설계 때 미리 계산해서 사전 승인
  요청했어야 함). 코드 자체는 지시대로 정확(§7-8 선례 그대로 `plate` 하나로
  두 모드 커버)이라 되돌릴 필요는 없어 보이지만, **200줄(+cohesion 250줄)
  재초과를 보리가 알고 계셔야 함 — 확인 요청.**
- **결론**: §5 7항목 중 6개(범위·증설·타입·테스트·문서·요구사항 완전성) 통과,
  ⚠️ 200줄(§6) 1건만 보리 확인 대기. 보리 확인 후 `[x]` 확정 예정.

## 12. 착수지시 — `LinkedDriverManagementPage.jsx` 254줄 정리 (분할 아님, 헤더 중복 제거)

### 12-1. 배경과 보리 결정 (2026-09-09)

§11-6에서 보류된 건. 보리 결정: **분할하지 말고 줄이는 걸로 우선 시도** — 감시관이
확인한 유일한 실질 중복은 "뒤로가기 헤더" 블록(`notFound` 분기와 정상 렌더 분기에
거의 동일하게 두 번 등장, [LinkedDriverManagementPage.jsx:104-110](../../react-app/src/components/drivers/LinkedDriverManagementPage.jsx:104)
vs [124-131](../../react-app/src/components/drivers/LinkedDriverManagementPage.jsx:124)) 뿐이다.

**보리가 함께 못박은 규칙**: 이번 정리로 250줄 밑으로 내려가더라도, **앞으로 이
파일이 다시 250줄(또는 §6 기본선 200줄)을 넘기면 이번처럼 "응집도 예외"로
또 봐주지 않는다 — 그땐 진짜 §6 분리설계(책임 경계·모듈 구조를 보고·승인받는
절차)로 들어간다.** 이 결정은 이 파일 상단 주석에도 그대로 남겨서 다음 세션이
바로 알 수 있게 한다(12-2 참고).

### 12-2. 설계 (1개 파일만, 신규 파일 없음)

- `src/components/drivers/LinkedDriverManagementPage.jsx` 안에서만 처리 — 컴포넌트
  함수 내부(또는 파일 스코프의 지역 헬퍼)에 `onBack`을 클로저로 받는 작은 렌더
  헬퍼를 하나 만들어 두 곳의 "뒤로가기 헤더" 블록을 이 헬퍼 호출로 교체한다.
  새 파일·새 export 없음(다른 화면에서 재사용 안 함 — 이 파일 전용 내부 정리).
- 헬퍼가 받는 값은 표시할 타이틀 문자열 하나뿐(`notFound` 분기는
  `unlinked ? title : '기사 관리'`, 정상 분기는 `title`) — 그 외 로직·분기·JSX
  구조는 전혀 바꾸지 않는다(순수 중복 제거, 동작 변경 없음).
- 파일 상단 주석(현재 1~3번째 줄, "AGENTS §6 응집도 ≤250")을 갱신해 12-1의
  결정을 명문화한다: 이번 정리가 이 파일의 **마지막 여유분**이며, 다음에
  200/250줄을 다시 넘기면 예외 재적용 없이 분리설계로 간다는 문장을 1~2줄
  추가.

### 12-3. 파일 목록 — 1개(수정만)

1. `src/components/drivers/LinkedDriverManagementPage.jsx` — 헤더 중복 제거 +
   상단 주석 갱신.

### 12-4. 이번 슬라이스 금지 범위

- 모드 판별·정산 계산·칩 3개 동작 등 **기능 로직은 전혀 건드리지 않는다** —
  순수 렌더 중복 제거만.
- 새 파일 생성(=분할) 금지 — 이번 지시는 명시적으로 "분할 아님".
- 다른 파일(`driverManagementContext.js` 등)은 손대지 않는다.

### 12-5. 작업자 검증·인계

- `rg`로 이 파일 1개 외 변경이 없는지 확인.
- `wc -l`로 최종 줄 수 확인해 보고에 포함(목표: 250줄 미만으로 확실히 내려가는지).
- `npm test`, `npm run typecheck`, `npm run build` 통과 후 커밋만(푸시 금지).
- 감시관은 게스트로 연동·미연동 두 모드의 "뒤로가기" 버튼 동작 + `notFound`
  화면(존재하지 않는 번호로 진입) 타이틀 표시가 기존과 완전히 동일한지만
  재확인(순수 리팩터라 회귀 여부만 보면 됨). §5 7항목 판정 후 보리 승인 전엔
  `[x]`로 닫지 않는다.

### 12-6. 구현 결과와 감시관 직접 검증 (2026-09-09)

- 작업자 커밋: react-app `2c660d3`(`refactor: 기사 관리 화면 헤더 중복 제거`).
  보리가 직접 push, `origin/main`=`HEAD`=`2c660d3` 확인.
- 변경 파일 정확히 1개(`git diff --stat 2f52ef4 2c660d3`): 13줄 추가·22줄
  삭제. 지시서 밖 파일 변경 0.
- 줄 수: 254 → **245줄**(`wc -l`) — 목표(250줄 미만) 달성.
- 상단 주석에 12-1의 결정 문장이 정확히 추가됨: "헤더 중복 제거가 마지막
  여유분이며, 다음 200/250 초과 시 예외 없이 분리설계로 간다." — 다음 세션이
  코드만 봐도 규칙을 알 수 있음.
- 헤더 중복 제거 자체는 지시대로: `pageHeader(onBack, t)` 지역 헬퍼(비export,
  파일 전용) 하나로 `notFound` 분기·정상 분기 두 곳의 동일 블록을 교체.
  로직·JSX 구조 변경 없음.
- **⚠️ 지시서 밖 변경 1건 발견(범위 준수 항목, §5-1)**: "정비/주유/기타" 칩의
  JSX가 여러 줄 → 한 줄로 같이 압축됐다(diff 5번째 hunk). §12-2·12-4가
  명시한 범위는 "헤더 중복 제거만"이었고 이 칩은 헤더와 무관 — 지시에 없던
  포맷 압축이다. 동작·로직 변화는 없음(버튼 텍스트·onClick 100% 동일, 실측
  으로도 정상 동작 확인함, 아래 참고)이나, 이번 대화에서 보리와 "편법 줄
  압축은 안 된다"고 짚었던 것과 정확히 같은 종류의 변경이라 그냥 넘기지
  않고 보고한다. 되돌릴지/허용할지는 보리 판단 필요.
- 타입 꼼수(`any`/`@ts-ignore`/`@ts-expect-error`) 0건. `.md` 파일 변경 0건.
- GitHub Actions CI: `verify`·`deploy` 모두 headSha `2c660d3`와 일치,
  `conclusion: success`(감시관이 CI를 다시 돌리진 않음, 결과만 확인).
- **감시관 직접 브라우저 실측**(게스트, `npm run dev` 로컬):
  - 메인(11가1111)+미연동 서브(22나2222, 매출제) 신규 등록 → 사이드메뉴
    "2222 관리" 진입 → 헤더(뒤로가기 버튼+타이틀 "22나2222 관리")·프로필
    카드·칩 3개 정상 렌더, 뒤로가기 버튼 클릭 시 홈으로 정상 복귀.
  - `notFound` 케이스: 존재하지 않는 번호(`9999`)로 "관리" 진입 → 타이틀
    "9999 관리" + "차량 정보를 찾을 수 없습니다." + 뒤로가기 버튼(같은
    `pageHeader` 재사용) 정상 표시.
  - 다크 모드(앱 자체 테마 토글로 전환) 재확인 — 헤더·프로필 카드·칩·정산
    요약 전부 정상 렌더, 시각적 문제 없음.
  - 지시서 밖 변경이었던 "정비/주유/기타" 칩도 클릭해 실제 이동 확인 —
    "22나2222 정비/주유/기타" 화면으로 정상 이동(§11 기존 로직 그대로,
    포맷만 바뀌었을 뿐 회귀 없음).

### 12-7. AGENTS §5 판정

1. **범위 준수: 부분 위반** — 지시하지 않은 "정비/주유/기타" 칩 JSX 한 줄
   압축이 diff에 포함됨(12-6 참고). 동작 회귀는 없음.
2. 몰래 증설 없음: 통과 — 새 파일·저장 레이어 없음.
3. 타입 꼼수 없음: 통과 — 0건.
4. 200줄/응집도: 통과 — 245줄, 목표 달성 + 향후 규칙 주석 명문화까지 완료.
5. 테스트 진실성: 통과 — 순수 리팩터라 기존 테스트 영향 없음(신규 테스트
   없음, 지시서도 요구 안 함).
6. 문서 일치: 통과 — 작업자 `.md` 수정 0.
7. 요구사항 완전성: 통과 — 헤더 중복 제거·245줄·상단 주석 명문화 전부
   실측·코드 확인 완료.

### 12-8. 승인 완료

보리 명시 승인: **"승인 A"**(2026-09-09) — 1번(범위 준수) 경미 위반은
**되돌리지 않고 그대로 둔다**(A안: 회귀 없으니 유지)로 확정. §12
(헤더 중복 제거·245줄 정리) `[x]`로 닫는다. 이 세션 이후 작업자 대화는
보리가 리셋 예정 — 다음 작업자 세션은 이 기록(§12 전체)과 `AGENTS.md`부터
다시 읽고 시작해야 한다.

## 13. 착수지시 — 사이드메뉴 UI 정리 §1-1 (1번 순서반전 + 3번 배너 이미지)

### 13-1. 배경 (보리 지시, 2026-09-09)

`docs/ui-comparison-report.md` §1-1(2026-09-08, 보리 직접 확정) 4건 중 다음
착수건. **2번(톱니바퀴/세부입력 토글 메인·서브 분리)은 보리 결정으로 이번
범위에서 제외** — "미연동 서브차량 일지 원본대조" 작업 때 함께 다루기로
결정, 아래 "이관 완료 후 진행사항" 백로그로 이동(§13-6 참고). **4번("기사
기사 관리" 중복 텍스트)은 코드 대조 결과 원본(`driver-link.js:29-33`)도
`link.driverName || '기사'` + `${driverLabel} 기사 관리` 템플릿으로 완전히
동일하게 동작함을 확인** — 이관 버그가 아니라 원본과 일치하는 정상 동작.
보리 확인 대기 중(그대로 둘지/원본에 없는 개선을 새로 넣을지) — **이번
슬라이스는 1번·3번만** 진행한다.

### 13-2. 1번 — "관리"↔"경영" 섹션 순서 반전

- **원인**: 원본 [style.css:476-479](../../ubiquitous-parakeet/style.css:476)가
  `.side-menu-sections`(flex 컨테이너) 자식에 `order` 속성을 줘서 DOM 소스
  순서(관리→경영→설정→서류)와 무관하게 시각 순서를 경영(1)→관리(2)→서류(3)→
  설정(4)로 고정한다. [side-menu.css](../../react-app/src/side-menu.css)엔
  이 4줄이 없어 소스 순서(관리→경영→서류→설정)가 그대로 노출됨.
- **설계**: `SideMenu.jsx`는 손대지 않는다(DOM 순서·탭 이동 순서는 원본과
  동일하게 유지 — 원본도 CSS로만 시각 순서를 바꾸고 DOM은 그대로였음).
  `side-menu.css`의 `.management-section .side-menu-section-title::before`
  등 색상 규칙([side-menu.css:105-108](../../react-app/src/side-menu.css:105))
  바로 아래에 원본과 정확히 같은 4줄을 추가:
  ```css
  .business-section { order: 1; }
  .management-section { order: 2; }
  .document-section { order: 3; }
  .settings-section { order: 4; }
  ```

### 13-3. 3번 — 사이드메뉴 배너 이미지 복원

- **원인**: `ubiquitous-parakeet/images/`엔 `banner_image_Light.png`(2.26MB)·
  `banner_image_dark.png`(719KB)가 실재하는데 react-app 이관 때 안 옮겨져
  `public/images/`엔 범용 `banner_image.png` 하나만 있음(다른 화면 —
  `AuthIntroView`·`AuthLoginView`·`AuthSignupView`·`CalendarHeader`·
  `OnboardingPage` — 는 각자 자기 파일 안에 독립된 `BANNER` 상수를 갖고
  있어 이번 변경과 무관, 그대로 둔다).
- **파일 복사** (2개, 이관 누락분 그대로 가져오기):
  - `ubiquitous-parakeet/images/banner_image_Light.png` →
    `react-app/public/images/banner_image_Light.png`
  - `ubiquitous-parakeet/images/banner_image_dark.png` →
    `react-app/public/images/banner_image_dark.png`
- **`SideMenu.jsx`**: `const BANNER = '/images/banner_image.png'`를
  `BANNER_LIGHT`/`BANNER_DARK` 두 상수로 교체. 렌더 부분
  ([SideMenu.jsx:144-147](../../react-app/src/components/SideMenu.jsx:144))을
  ```jsx
  <div className="menu-banner-wrap">
    <img src={BANNER_LIGHT} alt="운행 일지" className="menu-banner-light" />
    <img src={BANNER_DARK} alt="운행 일지" className="menu-banner-dark" />
  </div>
  ```
  로 교체(텍스트 `<span className="menu-banner-text">` 삭제 — 이미지 안에
  이미 "운행 일지" 글자가 들어있어 원본처럼 텍스트 중복 불필요).
- **`side-menu.css`**: 원본 [style.css:546-566](../../ubiquitous-parakeet/style.css:546)+
  [6140-6148](../../ubiquitous-parakeet/style.css:6140)의 전역+사이드메뉴 override
  두 겹을 react-app은 사이드메뉴 전용이므로 한 겹으로 합쳐서 이식.
  [side-menu.css:54-67](../../react-app/src/side-menu.css:54)의 세 규칙을
  아래로 교체:
  ```css
  .menu-banner-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 58px;
  }

  .side-menu .menu-banner-light,
  .side-menu .menu-banner-dark {
    position: relative;
    top: 3px;
    left: -10px;
    height: 56px;
    object-fit: contain;
  }

  .menu-banner-dark { display: none; }
  [data-theme="dark"] .menu-banner-light { display: none; }
  [data-theme="dark"] .menu-banner-dark { display: block; }
  ```
  (`.menu-banner-text` 규칙은 완전히 삭제 — JSX에서 그 요소 자체가 없어지므로
  죽는 CSS, 남겨두면 미사용 코드).

### 13-4. 정확한 파일 목록 — 4개(자산 복사 2 + 코드 수정 2)

1. `react-app/public/images/banner_image_Light.png` **신규(복사)**.
2. `react-app/public/images/banner_image_dark.png` **신규(복사)**.
3. `react-app/src/components/SideMenu.jsx` — 배너 상수·렌더 교체(13-3).
4. `react-app/src/side-menu.css` — 순서 4줄 추가(13-2) + 배너 규칙 교체(13-3).

**참고**: `side-menu.css`는 현재 2,184줄로 이미 §6 200줄을 크게 초과한
기존 파일이지만, **`account-flow.css`·`side-menu.css` 자체 분리는
`STATUS.md`에 이미 명시적으로 범위 제외된 상태**(main-calendar.css 책임
분리 프로젝트 때 보리 결정) — 이번처럼 몇 줄만 추가하는 수정은 그 결정을
다시 여는 게 아니므로 분리설계 재승인 불필요.

### 13-5. 이번 슬라이스 금지 범위

- `SideMenu.jsx`의 DOM 순서·섹션 구조·다른 메뉴 항목은 건드리지 않는다
  (순서는 CSS `order`로만 변경 — 13-2 설계 그대로).
- `AuthIntroView.jsx`·`AuthLoginView.jsx`·`AuthSignupView.jsx`·
  `CalendarHeader.jsx`·`OnboardingPage.jsx`의 `BANNER` 상수·배너 렌더는
  건드리지 않는다(각자 독립, 이번 대상 아님).
- 2번(세부입력 토글 메인/서브 분리)·4번("기사 기사 관리")은 이번에 하지
  않는다(13-1 참고).
- `side-menu.css`의 다른 섹션(콜상세·메시지 등 무관 규칙)은 건드리지 않는다.
- Store, DB, Supabase, 동기화 로직은 변경하지 않는다.

### 13-6. 이관 완료 후 진행사항으로 이동 (백로그 기록)

- **2번(톱니바퀴/세부입력 토글 메인·서브 분리)**: 보리 결정(2026-09-09) —
  "미연동 서브차량 일지 원본대조" 작업 때 함께 진행. 그때까지 UI(기능 포함)
  백로그로 보관.

### 13-7. 작업자 검증·인계

- `rg`로 지시한 4개(자산 2 + 코드 2) 외 변경이 없는지 확인.
- `npm test`, `npm run typecheck`, `npm run build` 통과 후 커밋만(푸시 금지).
- 감시관은 `static-preview`(`ubiquitous-parakeet`, 포트 8791)와
  `react-app-dev`를 나란히 띄워: (1) 사이드메뉴 섹션 순서가 경영→관리→서류→
  설정으로 원본과 일치하는지 (2) 라이트 모드에서 밝은 배너, 다크 모드에서
  어두운 배너 이미지가 정확히 토글되는지(텍스트 span 없이 이미지 자체에
  글자가 보이는지) (3) 배너 위치·크기가 원본과 육안으로 크게 다르지 않은지
  (완전 픽셀일치까지는 요구 안 함, 크게 어긋나면 `top`/`left` 값 조정)
  실측 확인. §5 7항목 판정 후 보리 승인 전엔 `[x]`로 닫지 않는다.

### 13-8. 구현 결과와 감시관 직접 검증 (2026-09-09)

- 작업자 커밋: react-app `c8647fc`(`feat: 사이드메뉴 경영/관리 순서 반전
  및 테마별 배너 복원`). 보리가 직접 push.
- 변경 파일 정확히 지시한 4개(`git diff --stat 2c660d3 c8647fc`):
  `public/images/banner_image_Light.png`·`banner_image_dark.png`(신규),
  `SideMenu.jsx`(+3/-2), `side-menu.css`(+13/-7). diff가 §13-2·13-3 설계와
  완전히 일치 — `order` 4줄, `BANNER_LIGHT`/`BANNER_DARK` 상수 교체,
  `.menu-banner-text` 삭제, `[data-theme="dark"]` 토글 규칙까지 그대로.
  타입 꼼수 0건. 지시서 밖 파일 변경 0.
- GitHub Actions CI: `verify`(test+typecheck+build) `conclusion: success`,
  headSha `c8647fc` 일치(감시관이 CI 자체를 다시 돌리진 않음).
- **감시관 직접 브라우저 실측**(게스트, `npm run dev` 로컬):
  - 라이트·다크 모두 사이드메뉴 순서가 **경영→관리→서류→설정**으로 원본과
    정확히 일치(육안 확인).
  - `getComputedStyle`로 배너 토글 실측: 라이트에서
    `.menu-banner-light { display: block }` / `.menu-banner-dark { display:
    none }`, `[data-theme="dark"]`에서 정반대로 정확히 뒤바뀜 — 텍스트
    span 없이 이미지 자체(라이트/다크 각각 다른 실제 배너 파일)로 표시됨.
- **AGENTS §5 판정**: 7항목 전부 통과(범위·증설·타입·200줄무관·테스트·문서
  ·요구사항 완전성) — 지시서 밖 변경 0건(§12 때와 달리 이번엔 깨끗함).

### 13-9. 승인 완료

보리 명시 승인: **"승인"**(2026-09-09). §13(순서반전+배너 이미지) `[x]`로
닫는다. 이어서 §14(착수 승인)로 진행.

## 14. 착수지시 — 미연동 서브차량 등록 시 기사명·연락처 필수 해제

### 14-1. 배경 (보리 지시, 2026-09-09)

§1-1 4번("기사 기사 관리" 중복) 조사 중 보리가 지적: **미연동 서브차량
등록 시 기사명·연락처를 무조건 입력하게 만든 건 보리의 의도가 아니었다.**
코드 확인 결과 정확히 두 개의 서로 다른 검증이 섞여 있었다:

- `domain/drivers.js`의 `upsertDriver`(진짜 **기사 연동/초대** 저장) —
  이름·전화번호 필수. **이건 그대로 유지**(연동 시엔 실제 사람에게 연락해야
  하므로 필수가 맞음).
- `domain/cars.js`의 `upsertCar`(차량 등록, `type==='sub'`일 때) — **여기도
  이름·전화번호를 필수로 막고 있었다**([cars.js:110-111](../../react-app/src/domain/cars.js:110)).
  `CarFormModal.jsx`의 "기사 등록" 모달엔 "기사 연동"/"운행 일지"(미연동)
  두 탭이 있는데(`CarDriverConnectPanel.jsx`), **탭 선택과 무관하게 이
  `upsertCar` 필수 검증이 먼저 막아버려서** "운행 일지"(미연동, 연동 안 함)
  탭을 골라도 이름·연락처 없이는 저장 자체가 안 됐다 — 이게 보리가
  "내 선택이 아니다"라고 한 부분.
- 보리 확인(대화 중): 전화번호는 **"입력했을 때만 형식 검증"**(비워도 되지만,
  뭔가 입력했는데 10자리 미만이면 막음). 타이틀 표시(15번 슬라이스)는
  사이드메뉴 항목과 관리 화면 제목 **둘 다** 적용.

### 14-2. 설계

- `domain/cars.js`의 `upsertCar` 안 `if (type === 'sub') { ... }` 블록
  ([cars.js:109-113](../../react-app/src/domain/cars.js:109))을:
  ```js
  if (type === 'sub') {
    // 이름·전화번호는 여기서 필수 아님(미연동·운행 일지 전용 등록 허용).
    // 실제 기사 연동(초대) 시 필수 검증은 domain/drivers.js의 upsertDriver가 한다.
    const phoneDigits = extra.driverPhone.replace(/\D/g, '')
    if (extra.driverPhone && phoneDigits.length < 10) {
      return { error: '연락처 형식을 확인해 주세요.', cars }
    }
    if (extra.driverPayMode === 'salary' && !(Number(extra.driverSalaryAmount) > 0)) {
      return { error: '월급제는 급여 금액을 입력해 주세요.', cars }
    }
  }
  ```
  로 교체 — `driverName` 필수 체크 삭제, `driverPhone`은 **입력했을 때만**
  10자리 이상 형식 검사.
- `CarFormModal.jsx`(입력 폼 UI)는 손대지 않는다 — 라벨·placeholder에
  원래도 "필수" 표시(`*` 등)가 없어서 UI 변경 불필요, 검증만 서버 쪽에서
  풀린다.
- `saveInviteAfterVehicle`(`lib/carInviteFromDraft.js`)·`upsertDriver`
  (`domain/drivers.js`)는 **손대지 않는다** — "기사 연동" 탭을 골라
  초대를 실제로 만들 때는 지금처럼 이름·전화번호 필수 그대로 유지된다
  (14-1에서 확인한 대로 이미 올바르게 동작 중).

### 14-3. 정확한 파일 목록 — 2개(전부 수정)

1. `src/domain/cars.js` — `upsertCar`의 `type==='sub'` 검증 블록 교체(14-2).
2. `src/domain/cars.test.js` — 아래 테스트 갱신(§5-5 테스트 진실성 대응,
   지금 있는 테스트가 새 동작과 반대라 그대로 두면 실패함):
   - [cars.test.js:36-44](../../react-app/src/domain/cars.test.js:36) `'기사차량은
     기사명과 연락처가 없으면 거절한다'` → 이름·전화번호 **둘 다 비워도
     저장된다**로 뒤집어 갱신(`assert.equal(result.error, undefined)`).
   - 신규 테스트 추가: "전화번호를 입력했는데 형식이 틀리면 거절한다"
     (이름 비움 + 전화번호 `'010'`처럼 10자리 미만 → 에러), "이름·전화번호
     둘 다 비우면 통과한다"(정상 저장 확인).

### 14-4. 이번 슬라이스 금지 범위

- `domain/drivers.js`(`upsertDriver`, 기사 연동 검증)는 수정하지 않는다.
- `CarFormModal.jsx`·`CarDriverConnectPanel.jsx`(입력 폼 UI)는 수정하지
  않는다.
- 15번(타이틀 표시 변경)은 이 슬라이스에 포함하지 않는다 — 검증 해제부터
  먼저 끝내고 별도로 진행(§15).
- Store, DB, Supabase, 동기화 로직은 변경하지 않는다.

### 14-5. 작업자 검증·인계

- `rg`로 이 2개 파일 외 변경이 없는지 확인.
- `npm test`, `npm run typecheck`, `npm run build` 통과 후 커밋만(푸시 금지).
- 감시관은 게스트로 "차량관리 → + 추가 → 기사 등록"에서 **기사명·연락처를
  모두 비운 채** 차량번호·톤수만 입력해 저장이 되는지, 전화번호만 `010`처럼
  짧게 입력했을 때 형식 오류로 막히는지, 기존처럼 이름·전화번호를 정상
  입력하면 그대로 저장되는지(회귀 없음) 실측 확인. "기사 연동" 탭에서
  초대코드로 저장할 때는 여전히 이름·전화번호가 필수인지도 함께 확인.
  §5 7항목 판정 후 보리 승인 전엔 `[x]`로 닫지 않는다.

### 14-6. 구현 결과와 감시관 직접 검증 (2026-09-09)

- 작업자 커밋: react-app `ffc4e2d`(`fix: 미연동 서브차량 등록 시 기사명·
  연락처 필수 해제`). 보리가 직접 push.
- 변경 파일 정확히 지시한 2개(`git diff --stat c8647fc ffc4e2d`):
  `domain/cars.js`(+4/-2), `domain/cars.test.js`(+26/-2). diff가 §14-2·
  14-3 설계와 완전히 일치 — `driverName` 필수 삭제, `driverPhone`은 입력
  시에만 형식 검사, 에러 메시지 `'연락처 형식을 확인해 주세요.'`로 교체,
  사유 주석 2줄 추가. 테스트도 지시한 그대로: 기존 테스트를 "비어도
  저장된다"로 뒤집고, "형식 틀리면 거절"·"이름·전화 둘 다 비우면 통과"
  신규 테스트 2개 추가. 타입 꼼수 0건. 지시서 밖 변경 0.
- GitHub Actions CI: `verify`(test+typecheck+build) `conclusion: success`,
  headSha `ffc4e2d` 일치.
- **감시관 직접 브라우저 실측**(게스트, `npm run dev` 로컬): (1) 기사명·
  연락처 둘 다 비운 채 차량번호만 입력해 "22나2222" 기사차량 저장 성공
  (2) 전화번호만 `010`으로 짧게 입력 → **"연락처 형식을 확인해 주세요."**
  정확히 표시되며 저장 차단 (3) 정상 값(이름 "테스트기사"·전화
  "010-1234-5678`)으로 수정 → 그대로 저장(회귀 없음). "기사 연동" 탭
  (초대)은 cloud 세션 전용 UI라 게스트로는 실측 불가 — 대신
  `saveInviteAfterVehicle`·`upsertDriver`가 diff에 전혀 없음을 코드로
  확인(회귀 위험 없음, 기존 여러 슬라이스와 같은 판단 기준).
- **AGENTS §5 판정**: 7항목 전부 통과 — 범위 정확히 일치, 새 저장 레이어
  없음, 타입 꼼수 0, 테스트 진실성(기존 테스트를 반대로 뒤집은 이유가
  요구사항과 정확히 일치, 삭제·약화 아님), 문서 변경 0, 요구사항 3가지
  시나리오 전부 실측 확인.

### 14-7. 보류 — 미승인 (보리 정정, 2026-09-09)

보리: **"14는 미승인. 14는 이유있음, 감시관이 내 말을 잘못 이해함."**
CI green·§5 7항목·브라우저 실측 자체는 위 14-6 기록대로 문제없었지만,
**감시관이 §14 착수지시서를 쓸 때 보리의 원 의도를 잘못 해석한 부분이
있었다는 뜻** — 정확히 뭘 잘못 짚었는지는 대화창에서 재확인 중(구두
설명 대기). **그때까지 `ffc4e2d`는 `[x]`로 닫지 않고 `[~]` 유지, 되돌릴지
수정할지도 보리 설명 이후 결정.** §15는 이 결정을 기다리지 않고 보리가
작업자에게 바로 진행 지시 — 아래 §15 참고.

## 15. 착수지시 — "관리" 화면·사이드메뉴 타이틀에 기사명 반영

### 15-1. 배경

§14로 미연동 서브차량은 기사명 없이도 등록 가능해진다. 지금
"{차량번호} 관리"(관리 화면 제목)·"{번호} 관리"(사이드메뉴 항목, 짧은
뒷자리)로 고정된 타이틀을, **기사명이 있으면 "{기사이름} 기사 관리",
없으면 "{차량번호 뒷자리} 기사 관리"**로 바꾼다(보리 확인 완료 — 사이드
메뉴·관리 화면 제목 둘 다 적용). 표기 형식은 기존 연동 기사 화면·원본이
쓰는 "{이름} 기사 관리"(공백 포함) 그대로 맞춘다.

### 15-2. 설계

- `src/app/subLogMenuItems.js`: `buildSubLogMenuItems`가 반환하는 각
  항목에 `driverName` 필드 추가(`car.driverName`을 그대로 옮김,
  `String(car.driverName || '').trim()`). `SubLogMenuItem` typedef도
  `{ number: string, label: string, driverName: string }`로 갱신.
- `src/components/SideMenu.jsx`: `subLogItems.map(...)` 블록의 표시 텍스트를
  `{item.label} 관리` → `{item.driverName || item.label} 기사 관리`로,
  `title` 속성도 동일하게 교체.
- `src/components/drivers/LinkedDriverManagementPage.jsx`: 상단에
  `import { getShortCarNum } from '../../domain/cars.js'` 추가. `title`
  계산([LinkedDriverManagementPage.jsx:107-109](../../react-app/src/components/drivers/LinkedDriverManagementPage.jsx:107))을:
  ```js
  const title = unlinked
    ? `${ctx.car?.driverName || getShortCarNum(plate) || '차량'} 기사 관리`
    : ((link?.driverName || '기사') + ' 기사 관리')
  ```
  로 교체(연동 모드 쪽은 무변경). `notFound` 케이스도 이 `title` 값을
  그대로 재사용하므로 자동으로 같은 표기를 따라간다.

### 15-3. 정확한 파일 목록 — 4개(전부 수정)

1. `src/app/subLogMenuItems.js` — `driverName` 필드 추가.
2. `src/app/subLogMenuItems.test.js` — 기존 `deepEqual` 기대값 2곳에
   `driverName: ''` 추가, 기사명이 있는 차량이 포함될 때 `driverName`이
   그대로 나오는지 확인하는 테스트 1개 신규 추가.
3. `src/components/SideMenu.jsx` — sub 로그 항목 표시 텍스트 교체(15-2).
4. `src/components/drivers/LinkedDriverManagementPage.jsx` — `title`
   계산 교체(15-2). **줄 수 주의**: §12에서 "245줄, 다음 200/250 초과 시
   예외 없이 분리설계"로 못박아 뒀다 — 이번 변경은 import 1줄 + 로직
   1줄 안팎이라 246~248줄 예상(250 이내), **작업자는 반드시 `wc -l`로
   확인해 250을 넘기면 커밋하지 말고 감시관에게 먼저 보고**(§12 약속을
   다시 어기지 않기 위함).

### 15-4. 이번 슬라이스 금지 범위

- `LinkedDriverClientsPage.jsx`("{번호} 거래처")·`MaintFuelPage.jsx`
  ("{logId} 정비/주유/기타") 등 다른 화면의 타이틀은 건드리지 않는다 —
  보리가 확인한 범위는 "관리" 화면 제목 + 사이드메뉴 항목뿐.
  §1-1 4번(연동 기사 쪽 "기사 기사 관리")도 이 슬라이스에 포함하지 않는다
  — 그쪽은 `domain/drivers.js` 흐름이라 이름이 항상 필수라 실질적으로
  발생 안 함(이전 대화 결론 유지, 별도 처리 안 함).
- `domain/cars.js`·`domain/drivers.js` 등 도메인/검증 로직은 §14에서 이미
  끝났으므로 이 슬라이스에서 다시 손대지 않는다.
- Store, DB, Supabase, 동기화 로직은 변경하지 않는다.

### 15-5. 작업자 검증·인계

- `rg`로 이 4개 파일 외 변경이 없는지 확인. `wc -l`로
  `LinkedDriverManagementPage.jsx` 최종 줄 수를 보고에 반드시 포함.
- `npm test`, `npm run typecheck`, `npm run build` 통과 후 커밋만(푸시 금지).
- 감시관은 게스트로: (1) 기사명 없이 등록한 서브차량 — 사이드메뉴 항목이
  "{차량번호 뒷자리} 기사 관리"로, "관리" 화면 진입 시 제목도 동일하게
  표시되는지 (2) 기사명을 입력해 등록한 서브차량 — 사이드메뉴·관리 화면
  제목 둘 다 "{기사이름} 기사 관리"로 표시되는지 (3) 기존 연동 기사 관리
  화면 제목("{이름} 기사 관리")은 회귀 없는지 (4) `notFound` 케이스
  (`/app/logs/9999/manage`) 제목이 "9999 기사 관리"로 나오는지 실측 확인.
  §5 7항목 판정 후 보리 승인 전엔 `[x]`로 닫지 않는다.
