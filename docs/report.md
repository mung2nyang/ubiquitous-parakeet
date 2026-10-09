# docs/report.md — 현재 슬라이스 착수지시서

## 문구 정리 4-A — 앱 이름·"운행 일지" → "운행일지" `[x]`

로드맵 밖 보리 요청. 조사 `docs/copy-review.md` "문구 정리 4 조사". 보리 결정(2026-10-09): "운행일지"로 붙여 씀, **앱 이름 포함**, 온보딩은 **로고 글자만** 바꾸고 문장은 그대로.
문구 정리 4는 4-A(앱 이름·운행일지)와 4-B(나머지 용어)로 나눔 — 이번은 4-A.

### 현재 상태 → 목표 상태

| 위치 | 어디에 보이나 | 현재 → 바뀐 글자 |
|---|---|---|
| `index.html:19` | 브라우저 탭 제목 | 운행 일지 → 운행일지 |
| `index.html:71` | 앱 켤 때 로딩 화면 | 운행 일지 → 운행일지 |
| `index.html:20·37` | 주석(화면에 안 보임) | 운행 일지 → 운행일지(설명 맞춤) |
| `public/manifest.webmanifest:2·3` | 홈 화면 아이콘 이름·설치 앱 이름 | 운행 일지 → 운행일지 |
| `LoadingScreen.jsx:15` | 화면 안 로딩 표시 | 운행 일지 → 운행일지 |
| `auth/AuthIntroView.jsx:31` | 첫 화면 로고 글자 | 운행 일지 → 운행일지 |
| `auth/WelcomeProfileView.jsx:36` | 처음 정보 입력 화면 로고 | 운행 일지 → 운행일지 |
| `OnboardingPage.jsx:57` | 온보딩 로고 글자(**로고만**) | 운행 일지 → 운행일지 |
| `calendar/CalendarHeader.jsx:52·53` | 홈 상단 배너 글자·그림 설명 | 운행 일지 / 운행 일지 로고 → 운행일지 / 운행일지 로고 |
| `SideMenu.jsx:65` | 사이드메뉴 배너 그림 설명 | 운행 일지 → 운행일지 |
| `calendar/CalendarSubLogBanner.jsx:14` | 기사 차량 달력 위 띠 | ○○ 운행 일지 → ○○ 운행일지 |
| `day-log/DayLogPage.jsx:150` | 일일운행 화면 제목 | 10월 9일 운행 일지 → 10월 9일 운행일지 |
| `day-log/CallDetailList.jsx:38·74` | 세부 입력 묶음 제목·추가 버튼 | 운행 일지 세부 입력 / + 운행 일지 추가 → 운행일지 세부 입력 / + 운행일지 추가 |
| `AppSettingsPage.jsx:146` | 설정 스위치 이름 | 운행 일지 세부 입력 → 운행일지 세부 입력 |
| `TaxInvoiceDraftModal.jsx:74` | 세금계산서 작성 창 안내 | …운행 일지 세부 입력에서… → …운행일지 세부 입력에서… |
| `cars/CarDriverConnectPanel.jsx:37·46·71` | 차량 등록 창 탭·안내 | 운행 일지 → 운행일지(탭 이름 1, 안내 2) |

- 글자만. 그림(`banner_image.png`)에는 글자가 없어 그대로.
- 같은 줄에 있는 "배정차량"(`DayLogPage.jsx:150`) 등 다른 용어는 4-B에서.

### 건드릴 파일

| 파일 | 줄 수 |
|---|---|
| `react-app/index.html` | 그대로 |
| `react-app/public/manifest.webmanifest` | 그대로 |
| `react-app/src/components/LoadingScreen.jsx` | 그대로 |
| `react-app/src/components/auth/AuthIntroView.jsx` | 그대로 |
| `react-app/src/components/auth/WelcomeProfileView.jsx` | 그대로 |
| `react-app/src/components/OnboardingPage.jsx` | 150 그대로 |
| `react-app/src/components/calendar/CalendarHeader.jsx` | 그대로 |
| `react-app/src/components/SideMenu.jsx` | 그대로 |
| `react-app/src/components/calendar/CalendarSubLogBanner.jsx` | 그대로 |
| `react-app/src/components/day-log/DayLogPage.jsx` | **229** 그대로 |
| `react-app/src/components/day-log/CallDetailList.jsx` | 그대로 |
| `react-app/src/components/AppSettingsPage.jsx` | 175 그대로 |
| `react-app/src/components/TaxInvoiceDraftModal.jsx` | 그대로 |
| `react-app/src/components/cars/CarDriverConnectPanel.jsx` | 그대로 |
| 테스트 `app/pwaManifest.test.js:16·17` | 기대 이름 "운행일지" |
| 테스트 `LoadingScreen.test.js:39·42·48·50` | 기대 글자·탭 제목 "운행일지"(테스트 제목 2줄 포함) |
| 테스트 `calendar/CalendarPage.test.js:349` | "9999 운행일지" |
| 테스트 `cars/CarDriverConnectPanel.test.js:35·61` | 안내 문구·탭 이름 "운행일지" |

- 14개 + 테스트 4개. AGENTS §3 "1~3개 파일"보다 많음 — 같은 이름을 한 번에 바꿔야 섞이지 않음, **승인 요청**.

### §6 200줄 — **예외 1건 승인 요청**

- `DayLogPage.jsx` 이미 229줄. 제목 글자 1곳만 바꾸고 줄 수 그대로 — 예외 승인 요청. 나머지 13개는 200 이하.

### 안 건드릴 것 (근거)

- 온보딩 문장(`OnboardingPage.jsx:107` "…운행 일지와 정산에 자동으로 연결돼요.") — 보리 결정으로 로고만 바꿈.
- 테스트 제목·설명 글에만 있는 "운행 일지"(`CarDriverConnectPanel.test.js:17·45`, `CallDetailList.test.js:64` 설명, `inlinePanelActions.test.js:24`, `carInviteFromDraft.test.js:33`) — 화면 무관, 그대로.
- 앱 밖: 처리방침 초안 9곳(10-P ⓒ-2에서), Google Cloud 로그인 화면 앱 이름(보리 설정), 이미 설치한 홈 화면 앱(다시 설치해야 바뀜 — 아래).
- CSS·화면 구조 — 그대로(글자 1칸 줄어 배너·로딩 글자가 조금 짧아짐).

### 실패 시 처리 — **신규 레이어 없음**

- 글자만. 저장·동기화 무관, 새 장치 없음(AGENTS §7). 플레이북 트리거 파일 없음.

### §8 질문 답

- 1~5 무관(표시 글자만, 권한 변경 없음).

### 알아둘 것

- **이미 설치한 홈 화면 앱**은 아이콘 이름이 바로 안 바뀔 수 있음(휴대폰이 설치 정보를 늦게 새로 받음) — 지웠다 다시 설치하면 "운행일지"로 보임.

### 테스트·확인

- 착수 전 "운행 일지"로 테스트 전체 검색함 → 글자를 검사하는 곳은 위 4개 파일뿐.
- 새 테스트 없음. 기대 글자 테스트 4개 파일만 바꾸고, 코드 쪽을 옛 글자로 되돌리면 FAIL하는지 확인(결과 첨부).
- 기존 테스트 전체 통과, `tsc` 0, 빌드 결과 `index.html`·`manifest.webmanifest`에 "운행일지".
- AI 개발 서버: 첫 화면 로고, 홈 배너, 탭 제목, 일일운행 제목, 설정 스위치 이름.
- **보리 휴대폰 확인**: 브라우저 탭 제목, 첫 화면·홈 상단 "운행일지", 일일운행 제목, 홈 화면 앱 다시 설치 → 아이콘 이름 "운행일지".

### 진행 기록 (2026-10-09)

- 보리 "착수지시서 확정, 작업 진행해"(14개 파일·`DayLogPage.jsx` 229 예외 포함). 14개 파일 + 테스트 4개 글자 교체(34줄, 줄 수 변화 없음). 같은 파일 안 주석의 "운행 일지"(`index.html:20·37`, `LoadingScreen.jsx:2`, `CarDriverConnectPanel.jsx:7`, `LoadingScreen.test.js:1`)도 맞춰 바꿈(화면 무관).
- 로컬 `npm test` 전체 통과(unit 824 + 화면 326), `tsc` 오류 0. 빌드 결과 `index.html` 탭 제목·로딩 글자 "운행일지", `manifest.webmanifest` name·short_name "운행일지".
- 되돌림 확인(플레이북 §6): 코드 쪽 5개 파일을 옛 글자로 → 4개 테스트 파일 20건 중 6건 FAIL(`설정 파일: 이름·…`·`배너 + "운행일지"…`·`index.html도 같은 모양…`·`슬라이스 B: 서브 달력…`·`운행 일지 탭은 안내 문구만…`·`신규 등록(…) — 운행 일지 탭은 항상 클릭 가능`), 복구 후 20건 PASS.
- AI 개발 서버(5174, 비회원): 탭 제목 "운행일지", 홈 배너 "운행일지", 일일운행 제목 "10월 9일 운행일지", "운행일지 세부 입력"·"+ 운행일지 추가". 콘솔 오류 없음.
- **지시서에 없던 곳 발견**: `public/offline.html:6` 인터넷 끊겼을 때 안내 화면의 탭 제목 "운행 일지"(로드맵 18-E에서 새로 생긴 파일, 착수 전 조사가 `src`·`index.html`·`manifest`만 봄). 지시서 범위 밖이라 이번 커밋엔 안 넣음 — 보리 확인 후 처리.
- 코드 커밋 **react-app `f0dd7c9`**(push 전).
- push(보리) → CI "verify"·"deploy" 초록(`f0dd7c9`) → 배포본 확인(AI): `getdrivelog.com` 탭 제목·로딩 글자 "운행일지", `manifest.webmanifest` name·short_name "운행일지", 앱 파일 안 "운행 일지" 1건 = 온보딩 문장(보리 결정으로 제외), "운행일지" 41건. §5 리뷰 문제 없음(범위 18개 파일 = 지시서, 글자만·새 저장 장치·타입 꼼수 없음, `DayLogPage.jsx` 229 예외 승인·나머지 200 이하, 테스트는 기대 글자만·되돌림 FAIL 확인, CSS 변경 없음, 기대 동작 전부 구현). `offline.html` 1줄은 보리 확인 대기. 보리 휴대폰 확인 대기.
- 보리 휴대폰 확인·최종 `[x]` 승인(2026-10-09). `offline.html:6` 한 줄은 보리 지시로 4-B에 넣음.
