# §2-1-A. 차량 카드 라벨칩/정산정보 복원 — `[x]` 완료 (2026-09-14)

react-app 최종 커밋: `8641be3`(원안)/`032e807`(후속 수정)/`15bfc43`(칩
조건 버그 수정). 전부 CI 초록, 보리 실계정 브라우저 검증 통과, 최종
승인 완료.

**보리가 화면 스크린샷 + 설명으로 직접 지시(2026-09-14).** §2(차량
관리) 첫 슬라이스. **이번엔 A만 진행 — B(수정/삭제 아이콘 공용화)는
A `[x]` 확정 후 별도 착수지시서로 분리**(이전 세션에서 A·B를 한
커밋에 묶어 진행한 순서 위반 재발 방지, 보리 2026-09-14 지적).

### 지시 내용 (A만)

- 카드의 전화번호(`driverName`·`driverPhone`) 표시 삭제. 기존
  `[기사: 이름]` 브래킷 텍스트는 원본과 동일하게 유지(대상 아님).
- `driverLinkEnabled`/`logEnabled`를 "기사연동"/"운행일지" 칩으로 표시.
- 수수료(`commEnabled`/`commission`/`commType`) 표시 복원, 월급
  (`driverPayMode === 'salary'`) 표시 신규 추가 — 둘 다
  `formatCurrencyInput`으로 천단위 콤마 처리.

### 조사 결과 (원본 재확인 — 이전 세션 조사 오류 정정, 보리 지적
2026-09-14)

- **정정**: 이전 세션 착수지시서는 "원본은 브래킷 텍스트뿐, 칩화는
  신규 개선"이라 적었는데 **틀렸음**. `car-management.js:66` 원본
  코드를 다시 보면 "기사연동"/"운행일지"는 원본에서도 이미
  `<span class="management-badge log-enabled">`로 **칩**이었다 —
  원본 매칭이 맞다.
  ```js
  ${car.type==='sub' && car.driverLinkEnabled ? '<span class="management-badge log-enabled">기사연동</span>' : ''}
  ${car.type==='sub' && car.logEnabled ? '<span class="management-badge log-enabled">운행일지</span>' : ''}
  ```
- **재사용할 CSS는 `.management-badge.commission`이 아니라
  `.management-badge.log-enabled`**(`style.css:3793`,
  `background: var(--today-bg); color: var(--sub-text-color);`).
  `.commission`(금색 pill, `style.css:3777`)은 원본에서 실제로는
  `settlementBadge`(회사정산/기사직접정산/직원기사 라벨,
  `car-management.js:60`) 전용이었음 — 이 개념은
  [[react-app-driver-settlement-mode-taxonomy]] 메모리로 이미 금지된
  "AI가 지어낸 가짜 개념"이라 손대면 안 됨. `.commission` 재사용은
  잘못된 클래스를 갖다 붙일 뻔한 것 — 반드시 `.log-enabled`로 신규
  추가.
  `--today-bg`는 `react-app/src/variables.css`에 라이트/다크 둘 다
  이미 정의돼 있어(23/43줄) 새로 만들 필요 없음.
- 수수료·월급 필드는 `react-app/src/domain/financeTypes.js`에 이미
  있음(`CarFormModal.jsx`가 입력은 받는데 `CarListItem.jsx`가 표시를
  안 하던 상태) — 새 필드 추가 없이 기존 데이터 노출만.

### 건드릴 파일 (A 범위만)

- `react-app/src/components/cars/CarListItem.jsx` — 전화번호 제거,
  칩+수수료+월급 표시.
- `react-app/src/side-menu.css` — `.management-badge.log-enabled` 신규
  (원본 값 이식, `.commission`은 건드리지 않음).

### §6 200줄

`CarListItem.jsx` 여유(현재 33줄 + 추가분).

### §8 4대 질문

1~5 무관 — 마크업/CSS + 기존 필드 노출뿐, 구독/값 출처/쓰기창구/
hydrate/DB 전부 무변경.

### 구현 (2026-09-14, react-app `8641be3`)

- `CarListItem.jsx` — 전화번호 제거, `[기사: 이름]` 유지, "기사연동"/
  "운행일지" 칩(`management-badge log-enabled`), 수수료/월급 표시(
  `formatCurrencyInput`으로 천단위 콤마). `formatCurrencyInput`은
  `lib/money.js`가 아니라 `domain/money.js`에 있어 import 경로 수정.
- `side-menu.css` — `.management-badge.log-enabled` 신규(`.commission`
  은 그대로 둠).

### 검증 (2026-09-14)

- `npm test`(unit 628 + app 163, 전부 통과) · `typecheck`(0 에러) ·
  `lint`(변경 파일 경고 0건) · `build`(성공).
- **AI 브라우저 프리뷰 실기동 확인함**(이전 세션과 달리 이번엔 열림):
  guest 모드로 메인 차량 1대 + 기사차량 1대 등록 →
  - 전화번호 미표시, `[기사: 홍길동]` 정상 표시 확인.
  - 월급제 `3,500,000` 입력 → "· 월급 3,500,000원" 콤마 정상.
  - 매출제 `15` 입력 → "· 수수료 15%" 정상.
  - `driverLinkEnabled`/`logEnabled`는 guest 모드 UI에 토글이 없어
    (실제 연동 흐름 필요) localStorage에 직접 `true`로 세팅 후 재확인
    — "기사연동"/"운행일지"가 **칩(둥근 배지, 회색 배경)으로 렌더**,
    텍스트 아님 확인(스크린샷 확인, `--today-bg` 라이트/다크 변수라
    다크모드도 자동 대응).
  - 검증용으로 넣은 guest 테스트 데이터는 확인 후 localStorage에서
    제거함.

react-app 로컬 커밋 `8641be3`.

### 후속 수정 (2026-09-14, react-app `032e807`)

보리 지시 — `[기사: 이름]` 브래킷 텍스트를 `[이름]`으로("기사:" 라벨
제거). `npm test`(791) 재통과, 브라우저 확인.

### 버그 수정: "기사연동"/"운행일지" 칩 조건 (2026-09-14, react-app
`15bfc43`)

**보리가 실제 로그인 계정에서 직접 확인해 발견** — 기사명란에
"기사연동"/"운행일지"라고 직접 타이핑해 넣었더니 그냥 `[기사연동]`
`[운행일지]`로 브래킷 텍스트만 뜨고 칩이 전혀 안 나타남.

**원인 조사**: `car.driverLinkEnabled`/`car.logEnabled` 필드가
**react-app 어디에서도 실제로 true로 세팅되지 않음** — 코드 전체
검색 결과 `domain/cars.js`(`upsertCar`)·`lib/vehicleMutations.js`·
`CarFormModal.jsx`·`CarListPage.jsx` 전부 이 두 필드를 쓰지 않음.
`hydrateMergeCars.js`(레거시 데이터 가져오기 전용)와 테스트 픽스처만
참조함 — 즉 지금 앱에서 기사를 실제로 연동해도 이 필드는 절대 안
바뀌는 죽은 필드. §2-1-A 착수지시서를 쓸 때 원본(`car-management.js`)
필드명만 그대로 가져오고, react-app이 이미 별도 메커니즘(아래)으로
바뀌어 있는지 확인 안 한 게 원인 — 다시 한번 "원본에 있으니 그대로
이관 대상"으로 속단한 실수.

**실제 react-app의 기사 연동 상태**: 차량 객체가 아니라 별도
`drivers` 배열(`DriverRecord`: `vehicleNumber`/`status`
`'pending'|'linked'`)에 저장됨. `CarListPage.jsx:76`이 이미
`drivers.find(d => d.vehicleNumber === car.number)`로 이 방식을
씀(수정 모달 열 때 `connectMode` 판단용). 연동 해제는 레코드 자체
삭제라 `'disconnected'` 상태는 react-app엔 없음(원본과 다름).

**건드릴 파일**:
- `react-app/src/components/cars/CarListItem.jsx` — 칩 조건 교체,
  `drivers` prop 신규 수신.
- `react-app/src/components/cars/CarListPage.jsx` — `<CarListItem>`에
  이미 갖고 있는 `drivers` 전달 추가(신규 구독·조회 없음).

**§6 200줄**: `CarListItem.jsx` 현재 44줄 — 여유. `CarListPage.jsx`
현재 176줄 — 여유 24줄.

**§8 4대 질문**: 1(구독 소스) — `drivers` 구독 자체는 `CarListPage`가
이미 하고 있어 새 구독 추가 아님, prop으로 내려주기만. 2~5 무관.

**구현**:
- `CarListItem.jsx` — `drivers.some(d => d.vehicleNumber === car.number)`
  있으면 "기사연동", 서브인데 없으면 "운행일지".
- `CarListPage.jsx` — 이미 구독 중인 `drivers`를 prop으로 전달.
- `npm test` 통과(unit+app). 줄 수: CarListItem 53 / CarListPage 178.

**검증**: `npm test`·`typecheck`·`lint`·`build` 전부 통과, CI(`verify`)
초록. 보리 실제 로그인 계정 브라우저 검증 — 연동된 서브는 "기사연동"
칩, 미연동(차주 직접) 서브는 "운행일지" 칩. 기사명에 글자를 넣어도
칩과 무관하게 `[이름]`만 표시. **"UI확인 문제없음" 최종 승인
(2026-09-14).**

### 검증 중 발견한 별개 버그 (2026-09-14, 보리 발견 — 이관 완료 후 처리 예정)

**월급제 기사 등록(미연동 서브차량) 시 월급 입력하면 연동기사로
바뀌며 미연동 차량이 저장 안 됨.** §2-1-A 범위 밖의 별개 버그 —
지금 손대지 않음. `STATUS.md` "이관 완료 시 처리할 숙제"에 등재,
UI 이관 전체 완료 후 처리.
