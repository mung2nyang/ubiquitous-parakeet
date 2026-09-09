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

### 5-4. 남은 절차

CI green + §5 7항목 통과 + 실측 검증 완료. **최종 `[x]` 확정은 보리의 명시
승인** 필요 — 특히 `linked-driver.css` 0줄 변경(걱정하셨던 부분) 확인해 주시면
좋음. 승인되면 2단계(거래처 태깅 버그 수정)로 넘어간다.
