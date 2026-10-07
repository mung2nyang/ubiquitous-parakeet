# docs/report.md — 현재 슬라이스 착수지시서

## 입력칸 X(한 번에 지우기) 버튼 — 슬라이스 B: 내 정보·기사·차량 창 `[x]` (react-app `c27be67`, CI 초록, 보리 최종 승인 2026-10-07)

슬라이스 A(react-app `f61a673`)에서 만든 공용 부품 `ClearableInput`을 내 정보·기사·차량 관련 창에 넣는다.
부품 자체는 안 고친다. 각 칸의 `<input` → `<ClearableInput`(이름만 바꿈) + import 1줄.
A의 보리 결정 그대로 적용: 여러 줄·날짜·단위(원·km·톤·%) 칸 제외, X 붙는 칸은 왼쪽 정렬, 누르는 영역 44px, 회색 동그라미 X.

### 보리 결정 (2026-10-07, 착수 승인)

1. 내 정보 화면(자동 저장)에도 **넣는다**.
2. 내 정보 성명·연락처 2칸은 **뺀다** — 비우면 가입 때 이름·번호가 다시 나타나는 구조(`PersonalInfoPage.jsx:134`·`138`). 실명 안내 문구는 로드맵 16번으로 따로.
3. **처음 이름 입력 화면(`WelcomeProfileView.jsx`) 이름 칸에도 넣는다** — 구글 계정 이름이 미리 채워져 들어오므로 한 번에 지우고 실명을 쓰기 쉽게(D에서 하려던 것 중 이 1칸만 앞당김).

### 현재 상태 (코드 확인)

| 파일 | 줄 수 | 넣을 칸 | 뺄 칸 (이유) |
|---|---|---|---|
| `PersonalInfoPage.jsx` | 193 | 사업자명·대표자명·사업자번호·주소·업태·종목·이메일·입금 은행·예금주·계좌번호 = 10칸 | 성명·연락처(질문 2) |
| `DriverFormModal.jsx` | 99 | 기사 이름·전화번호·할당 차량 = 3칸 | 초대 코드(읽기 전용) |
| `cars/CarFormModal.jsx` | 159 | 차량번호·기사명·연락처 = 3칸 | 톤수(톤)·정산 값(원/%) |
| `drivers/CarBusinessInfoSection.jsx` | 123 | 칸 그리는 함수 `Field` 1곳 → 차량 사업자정보 11칸 전부 | 없음 |
| `InviteRedeemModal.jsx` | 69 | 초대코드 1칸 | 없음 |
| `auth/WelcomeProfileView.jsx` | 81 | 이름 1칸(`auth-input-box` 모양) | 휴대전화 번호(D에서) |

- 할당 차량 칸은 목록 고르기(datalist)가 붙어 있지만 오른쪽 화살표는 이미 숨겨져 있어(`driver-connection.css:138`) X와 안 겹침.
- 내 정보 칸은 직원 기사일 때 잠김(`disabled`) — 잠긴 칸은 누를 수 없어 X도 안 나옴.

### 목표 상태 (기대 동작)

1. 위 표의 "넣을 칸" 29칸에서 A와 똑같이 동작(입력 중·글자 있을 때만 X, 누르면 비움, 입력 상태 유지).
2. "뺄 칸"은 지금과 똑같음.
3. 각 칸의 기존 입력 처리(사업자번호·전화번호 하이픈 등)·저장 방식은 그대로.

### 건드릴 파일 (react-app)

- `src/components/PersonalInfoPage.jsx` — 10칸 이름 바꿈 + import
- `src/components/DriverFormModal.jsx` — 3칸 + import
- `src/components/cars/CarFormModal.jsx` — 3칸 + import
- `src/components/drivers/CarBusinessInfoSection.jsx` — `Field` 안 1곳 + import
- `src/components/InviteRedeemModal.jsx` — 1칸 + import
- `src/components/auth/WelcomeProfileView.jsx` — 이름 1칸 + import
- `src/components/shared/clearable-input.css` — 로그인 화면 칸 모양(`auth-input-box`)에도 X 여백·왼쪽 정렬이 걸리게 선택자 추가(부품 동작은 안 바뀜)

7개 파일이라 §3 "1~3개 파일" 기준을 넘지만, 전부 태그 이름만 바꾸는 같은 작업이라 한 슬라이스로 묶음(A 지시서 계획대로).

### 안 건드릴 파일

- `src/components/shared/ClearableInput.jsx` — A에서 끝난 부품 동작 그대로.
- `src/components/cars/CarDriverConnectPanel.jsx` — 초대 코드 칸이 읽기 전용이라 넣을 칸 없음.
- `src/components/cars/CarDriverIncomeFields.jsx` — 칸이 전부 %가 붙은 칸이라 제외.
- 저장 경로(`src/lib/**`·`src/store/**`) — 화면 태그만 바뀜. 내 정보 자동 저장 코드(`PersonalInfoPage.jsx:40~43`)도 안 고침.

### §6 200줄

- `PersonalInfoPage.jsx` 193줄 → import 1줄 추가로 **194줄**(200 이하).
- 나머지는 각각 +1줄(100·160·124·70·82줄), `clearable-input.css` 약 +4줄.

### §8 질문

1. 구독/스냅샷: 바뀌지 않음(태그 이름만). 2. 보이는 값: 각 화면의 기존 값 그대로. 3. 쓰기 창구: 바뀌지 않음 — X는 "글자를 다 지운 입력"과 같아서 기존 onChange를 그대로 거침. 4. 동시 편집: 해당 없음. 5. 권한: DB 안 건드림.
- §4 플레이북: 내 정보 화면은 저장하는 화면이지만 저장 코드는 안 바뀜 → 참고만.

### 테스트

- 새 테스트 없음 — 부품 동작은 A의 `ClearableInput.test.js`가 확인함. 기존 화면 테스트(`PersonalInfoPage.*.test.js`·`CarBusinessInfoSection.test.js`·`MyPage.inviteModal.test.js`·`App.clientsCars.test.js`)가 칸 id로 입력하므로 그대로 통과해야 함.
- 브라우저: 화면마다 1~2칸 X 보임/지우기, 반쪽 폭 칸(업태/종목·은행/예금주), 휴대폰 폭, 내 정보에서 X로 지운 뒤 다시 들어가 저장 결과 확인.

### 실패 시 처리

- 새 저장소·복구 장치 없음(§7). 브라우저 검증 실패하면 수정 착수지시서를 따로 써서 재승인.
