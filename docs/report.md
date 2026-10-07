# docs/report.md — 현재 슬라이스 착수지시서

## 입력칸 X(한 번에 지우기) 버튼 — 슬라이스 D: 로그인·첫 설정 화면 `[x]` (react-app `b933d74`, CI 초록, 보리 최종 승인 2026-10-07)

A(react-app `f61a673`)의 공용 부품 `ClearableInput`을 로그인 직후 화면의 남은 칸에 넣는다. 부품·CSS는 안 고친다
(로그인 화면 칸 모양 `auth-input-box`용 여백·왼쪽 정렬은 B `c27be67`에서 이미 추가됨).
A~C의 보리 결정 그대로: 단위(톤 등) 칸 제외, 왼쪽 정렬, 누르는 영역 44px, 회색 동그라미 X.

### 보리 결정 필요

없음 — 남은 칸이 2개뿐이고 기존 결정으로 다 정해짐.

### 현재 상태 (코드 확인)

| 파일 | 줄 수 | 넣을 칸 | 뺄 칸 (이유) |
|---|---|---|---|
| `auth/WelcomeProfileView.jsx` | 82 | 휴대전화 번호 1칸 | 없음(이름 칸은 B에서 완료) |
| `OnboardingPage.jsx` | 149 | 4단계 차량번호 1칸 | 차량 톤수(톤) |

- `auth-input-box`를 쓰는 화면은 이 두 파일뿐(`grep -rl auth-input-box` 결과 2건).
- 첫 설정 화면은 마지막 단계에서 한 번에 저장, 처음 정보 화면은 [시작하기]를 눌러야 저장 — X로 지워도 바로 저장되지 않음.

### 목표 상태 (기대 동작)

1. 위 2칸에서 A와 똑같이 동작(입력 중·글자 있을 때만 X, 누르면 비움, 입력 상태 유지). 휴대전화 번호는 하이픈 정리 처리를 그대로 거침.
2. 톤수 칸은 지금과 똑같음. 저장 방식 그대로.

### 건드릴 파일 (react-app)

- `src/components/auth/WelcomeProfileView.jsx` — 휴대전화 번호 1칸 이름 바꿈(import는 B에서 이미 있음)
- `src/components/OnboardingPage.jsx` — 차량번호 1칸 + import

### 안 건드릴 파일

- `src/components/shared/ClearableInput.jsx`·`clearable-input.css`·`src/account-flow.css` — 부품·로그인 화면 칸 모양 그대로.
- 저장 경로(`ensureProfileRow`·첫 설정 저장) — 화면 태그만 바뀜.

### §6 200줄

- `WelcomeProfileView.jsx` 82줄 그대로. `OnboardingPage.jsx` 149 → 150줄.

### §8 질문

1. 구독/스냅샷: 바뀌지 않음. 2. 보이는 값: 각 화면의 임시 값 그대로. 3. 쓰기 창구: 바뀌지 않음 — X는 기존 onChange를 그대로 거침. 4. 동시 편집: 해당 없음. 5. 권한: DB 안 건드림.

### 테스트

- 새 테스트 없음(부품 동작은 `ClearableInput.test.js`). 기존 `WelcomeProfileView.test.js` 그대로 통과해야 함.
- 브라우저: 두 화면 모두 새로 가입해야 나오는 화면이라 AI가 열기 어려움 → 보리가 새 계정으로 확인하거나, 테스트 통과로 갈음할지 보리 판단.

### 실패 시 처리

- 새 저장소·복구 장치 없음(§7). 브라우저 검증 실패하면 수정 착수지시서를 따로 써서 재승인.

### 다음 (E)

- 운행 상세 입력창 `CallDetailForm.jsx`(236줄)·고객센터 `CustomerCenterPage.jsx`(227줄) — 200줄을 넘어 §6 분리설계안을 먼저 보고·승인받아야 함.
