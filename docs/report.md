# docs/report.md — 현재 슬라이스 착수지시서

## 문구 정리 4-B — 나머지 용어 통일 (고정 노선·초대 코드·배정·기사 차량·사업자등록번호 등) `[x]`

로드맵 밖 보리 요청. 조사 `docs/copy-review.md` "문구 정리 4 조사". 보리 결정: 용어는 F절 추천대로. 4-A `[x]` `f0dd7c9` 다음, **문구 정리의 마지막**.
보리 지시(2026-10-09): 4-A 때 발견한 `offline.html` 탭 제목도 여기서.

### 현재 상태 → 목표 상태

| 용어 | 위치 | 바뀌는 글자 |
|---|---|---|
| 운행 일지 → 운행일지 | `public/offline.html:6` (인터넷 끊김 안내 화면 탭 제목) | 운행 일지 → 운행일지 |
| 고정노선 → 고정 노선 | `FixedRouteClientModal.jsx:72·75`, `RunCountChips.jsx:69`(2), `clients/ClientListItem.jsx:35`, `domain/clients.js:100`, `domain/financeOwnerDetail.js:65` | 고정노선 거래처 / 고정노선 횟수 버튼 설정 / 고정노선 연동 / 고정노선 1회 단가를 입력해 주세요. / (이름 없는 고정 노선 거래처의 기본 표시) 고정노선 → 모두 "고정 노선" |
| 초대코드 → 초대 코드 | `DriverConnectionPage.jsx:137`, `DriverFormModal.jsx:68`, `InviteRedeemModal.jsx:36·46·48·52·56`, `MyPage.jsx:156`, `lib/driverLinkRpc.js:90·93` | 초대코드 → 초대 코드 (10곳) |
| 할당 → 배정 | `DriverConnectionPage.jsx:142`, `DriverFormModal.jsx:74·92`, `domain/drivers.js:83·85·102·171~173`, `lib/requestDriverInviteSave.js:108` | 할당 차량 → 배정 차량 / "한 차량은 한 기사에게만 배정할 수 있습니다. 종료일이 없으면 계속 배정됩니다. 메인 차량은 배정할 수 없습니다." / 할당 예정·중·종료 → 배정 예정·중·종료 / 기사 할당 정보를 수정했습니다 → 기사 배정 정보를… |
| 기사차량 → 기사 차량 | `RunCountChips.jsx:69`, `calendar/CalendarMonthSummary.jsx:102`, `cars/CarListItem.jsx:37`, `drivers/LinkedDriverManagementPage.jsx:155·156`, `domain/drivers.js:83`, `domain/monthSettlement.js:133` | 기사차량 → 기사 차량 |
| 배정차량 → 배정 차량 | `cars/CarListItem.jsx:37`, `day-log/DayLogPage.jsx:150` | 배정차량 → 배정 차량 |
| 기사연동관리 | `MyPage.jsx:144` | 기사 연동 관리 |
| 미수금/정산 | `MyPage.jsx:45` | 미수금/정산 관리 (사이드메뉴와 같게) |
| 문자 발송 | `DriverFormModal.jsx:64` (기사 초대 창 버튼) | 문자 보내기 |
| 업체명 → 거래처명 | `clients/ClientFormModal.jsx:33·34`, `domain/clients.js:80` | 업체명 (거래처명) → 거래처명 / 업체명 입력 → 거래처명 입력 / 업체명을 입력해 주세요 → 거래처명을 입력해 주세요 |
| 사업자 번호 → 사업자등록번호 | `PersonalInfoPage.jsx:89`, `clients/ClientFormModal.jsx:51`, `drivers/CarBusinessInfoSection.jsx:107`, `TaxInvoiceEntryList.jsx:55`, `shared/BizNumberHint.jsx:8` | 사업자 번호 / 사업자번호 미입력 / * 사업자번호를 다시 확인해 주세요 → 사업자등록번호 |
| 차량톤수·입금은행 | `ReportDetailView.jsx:91·95`, `ReportSummaryContent.jsx:131·135` (운송비 내역서 표 머리) | 차량 톤수 / 입금 은행 |

### 글자만 바꾸면 고장 나는 곳 — 1줄 함께 고침

- 홈 정산 카드의 기사 차량 수수료 (i) 설명(`CalendarMonthSummary.jsx:26`)은 줄 이름에서 "○○ 차량 " 뒤를 잘라 설정 값으로 씀(예: "3456 차량 10%" → "10%"). 기본 이름을 "기사 차량 수수료"로 띄어 쓰면 "수수료"를 설정 값으로 잘못 잘라 설명이 **"이 차량의 수수료(수수료)입니다"**가 됨.
- 고침: 자르는 규칙을 "○○ 차량 " 뒤가 **"건당 …" 또는 숫자**일 때만으로 좁힘(정규식 1줄). 기본 이름이면 괄호 없이 "이 차량의 수수료입니다."
- 새 테스트 1건: 기본 이름 "기사 차량 수수료"일 때 설명에 "(수수료)"가 없고, "3456 차량 10%"는 지금처럼 "(10%)".

### 건드릴 파일

| 파일 | 줄 수 |
|---|---|
| `react-app/public/offline.html` | 그대로 |
| `react-app/src/components/FixedRouteClientModal.jsx` | 111 |
| `react-app/src/components/RunCountChips.jsx` | 105 |
| `react-app/src/components/clients/ClientListItem.jsx` | 그대로 |
| `react-app/src/domain/clients.js` | **243** |
| `react-app/src/domain/financeOwnerDetail.js` | 그대로 |
| `react-app/src/components/DriverConnectionPage.jsx` | 194 |
| `react-app/src/components/DriverFormModal.jsx` | 그대로 |
| `react-app/src/components/InviteRedeemModal.jsx` | 그대로 |
| `react-app/src/components/MyPage.jsx` | 196 |
| `react-app/src/lib/driverLinkRpc.js` | 그대로 |
| `react-app/src/domain/drivers.js` | 그대로 |
| `react-app/src/lib/requestDriverInviteSave.js` | 그대로 |
| `react-app/src/components/calendar/CalendarMonthSummary.jsx` | 161 (정규식 1줄 포함) |
| `react-app/src/components/cars/CarListItem.jsx` | 그대로 |
| `react-app/src/components/drivers/LinkedDriverManagementPage.jsx` | 199 |
| `react-app/src/domain/monthSettlement.js` | 그대로 |
| `react-app/src/components/day-log/DayLogPage.jsx` | **229** |
| `react-app/src/components/clients/ClientFormModal.jsx` | 그대로 |
| `react-app/src/components/PersonalInfoPage.jsx` | 194 |
| `react-app/src/components/drivers/CarBusinessInfoSection.jsx` | 그대로 |
| `react-app/src/components/TaxInvoiceEntryList.jsx` | 그대로 |
| `react-app/src/components/shared/BizNumberHint.jsx` | 그대로 |
| `react-app/src/components/ReportDetailView.jsx` | 그대로 |
| `react-app/src/components/ReportSummaryContent.jsx` | 그대로 |

테스트(기대 글자만 새 용어로, + 위 새 테스트 1건):

| 테스트 | 곳 |
|---|---|
| `calendar/CalendarMonthSummary.test.js` | 29(시험 데이터 기본 이름)·238·244 + **새 테스트 1건** |
| `DriverConnectionPage.security.test.js` | 38 "초대 코드 123456" |
| `FixedRouteClientLink.test.js` | 147 "고정 노선 1회 단가…" |
| `MyPage.inviteModal.test.js` | 50·54 "초대 코드 입력"·"…초대 코드를 입력해 주세요." |
| `ReportDetailView.test.js` / `ReportSummaryContent.test.js` | 103 / 117 "입금 은행" |
| `TaxInvoiceDraftModal.test.js` | 111 "* 사업자등록번호를 다시 확인해 주세요" |
| `domain/drivers-cloud.test.js` | 19·44 "배정"·"기사 차량" |
| `domain/drivers.assignment.test.js` | 10·17·24 "배정 예정/종료/중" |
| `lib/inviteCode.security.test.js` | 78 "초대 코드가 맞지 않거나…" |

- 25개 파일 + 테스트 10개. AGENTS §3 "1~3개 파일"보다 많음 — 같은 용어를 한 번에 바꿔야 섞이지 않음, **승인 요청**.

### §6 200줄 — **예외 2건 승인 요청**

- `domain/clients.js` 243줄(글자 2곳), `DayLogPage.jsx` 229줄(글자 1곳) — 이미 200 초과, 줄 수 그대로. 예외 승인 요청. 나머지 23개는 200 이하(`CalendarMonthSummary.jsx` 정규식은 같은 줄 안에서 바뀜).

### 안 건드릴 것 (근거)

- 테스트 제목·설명 글에 있는 옛 용어(`drivers-cloud.test.js:7·17`, `finance.test.js:328`, `report.test.js:299`, `modalOutsideClick.test.js:43` 테스트 이름 등) — 화면 무관.
- `inviteCode.security.test.js:86` "초대코드를 여러 번 틀렸습니다…" — **서버(DB 함수)가 보내는 문구**를 흉내 낸 시험값. 앱 글자가 아니라 이번엔 그대로(DB 함수 문구까지 바꾸려면 따로 DB 변경 필요 — 범위 밖).
- 세금계산서 엑셀 칸 이름(홈택스 서식) — 그대로.
- 저장·계산 동작 — 그대로. `financeOwnerDetail.js:65`는 이름 없는 고정 노선 거래처의 **표시 이름**만 바뀜(금액 계산 무관). `monthSettlement.js:133`도 표시 이름만.
- `CalendarPage.test.js:371·400`의 "고정노선"은 시험용 거래처 이름(시험 데이터)이라 그대로 통과.

### 플레이북 트리거 (AGENTS §4) — 해당, 열람함

- `domain/finance*`(`financeOwnerDetail.js`) 포함. 표시용 기본 이름 글자만 바뀌고 금액 계산·묶음 방식은 그대로 → 플레이북 대상 동작 변화 없음. 기존 정산·매출 테스트 전체 통과로 확인.

### 실패 시 처리 — **신규 레이어 없음**

- 글자 + 표시용 정규식 1줄. 새 저장소·장치 없음(AGENTS §7).

### §8 질문 답

- 1~5 무관(표시 글자만, 권한 변경 없음).

### 테스트·확인

- 착수 전 옛 용어로 테스트 전체 검색함(위 표 10개 + 무관한 제목·설명).
- 기대 글자 테스트 10개 파일 수정 + 새 테스트 1건(되돌림 FAIL 확인 — 정규식을 옛것으로 되돌리면 새 테스트 FAIL).
- 기존 테스트 전체 통과, `tsc` 0.
- AI 개발 서버: 마이페이지 메뉴 이름("기사 연동 관리"·"미수금/정산 관리"·"초대 코드 입력"), 거래처 등록 창 칸 이름, 개인정보 "사업자등록번호", 운송비 내역서 표 머리.
- **보리 휴대폰 확인**: 마이페이지 메뉴 이름, 거래처 등록 창("거래처명"·"사업자등록번호"), 기사 초대 창("배정 차량"·"문자 보내기"), 홈 정산 카드의 기사 차량 수수료 (i) 설명(기사 차량이 있을 때).

### 진행 기록 (2026-10-09)

- 보리 "착수지시서 확정, 작업 진행해"(25개 파일·`domain/clients.js` 243·`DayLogPage.jsx` 229 예외 포함). 25개 파일 글자 교체 + `CalendarMonthSummary.jsx:26` 자르는 규칙 1줄(`/^\S+ 차량 (?=건당 |\d)/`), 테스트 10개 파일 기대 글자 + 새 테스트 1건. `FixedRouteClientModal.jsx:2` 주석의 "고정노선 거래처"도 함께 맞춤(화면 무관). 줄 수 변화 없음(새 테스트만 추가).
- 로컬 `npm test` 전체 통과(unit 824 + 화면 327), `tsc` 오류 0.
- 되돌림 확인(플레이북 §6): 자르는 규칙·"배정 중"·"초대 코드를 입력해 주세요"·"입금 은행"·"사업자등록번호"를 옛것으로 → 5개 테스트 파일 19건 중 5건 FAIL(새 테스트 `문구 정리 4-B: 기본 이름 "기사 차량 수수료"면…`·`기간 안이면 할당 중…`·`초대코드 입력 버튼을 누르면 팝업이…`·`세부내역서: info-table에…`·`사업자등록번호 검증번호가 틀리면…`), 복구 후 19건 PASS.
- AI 개발 서버(5174, 비회원): 운송비 내역서 표 머리 "차량 톤수"·"입금 은행", 거래처 등록 창 "거래처명"·"거래처명 입력"·"사업자등록번호". 콘솔 오류 없음. 마이페이지 "기사 연동 관리"·"미수금/정산 관리"·"초대 코드 입력"은 로그인 회원 메뉴라 테스트(`MyPage.inviteModal.test.js`)로 확인.
- 코드 커밋 **react-app `601c68d`**(35개 파일, push 전). 다음: 보리 push·CI → 휴대폰 확인.
- push(보리) → CI "verify"·"deploy" 초록(`601c68d`) → 배포본 확인(AI): `offline.html` 탭 제목 "운행일지", 앱 파일 안 옛 용어(고정노선·초대코드·할당·기사차량·배정차량·기사연동관리·문자 발송·업체명·사업자 번호·사업자번호·차량톤수·입금은행) **모두 0건**, 새 용어 들어감("초대 코드 입력" 2·"배정 차량" 6·"사업자등록번호" 8·"기사 연동 관리" 2). §5 리뷰 문제 없음(범위 35개 파일 = 지시서, 글자 + 표시용 정규식 1줄·새 저장 장치·타입 꼼수 없음, `clients.js` 243·`DayLogPage.jsx` 229 예외 승인·나머지 200 이하, 테스트는 기대 글자만 + 새 테스트 1건·되돌림 FAIL 확인, CSS 변경 없음, 기대 동작 전부 구현). 보리 휴대폰 확인 대기.
- 보리 휴대폰 확인·최종 `[x]` 승인(2026-10-09). **문구 정리 전체 완료**(1·2-A·2-B·3-A·3-B·4-A·4-B). 남은 것: 온보딩 문구(보리 직접, `App.jsx:119` 온보딩 직후 안내 포함), 앱 밖 "운행 일지"(처리방침 초안 — 10-P ⓒ-2, Google 로그인 화면 앱 이름 — 보리 설정), 서버(DB) 문구 "초대코드를 여러 번 틀렸습니다".
