# docs/report.md — 현재 슬라이스 착수지시서

## 구글 로그인 G-2 — 구글 첫 로그인 때 이름·전화번호 받기 (로드맵 밖 보리 요청, 2026-10-03)

로그인 개편(전화번호 → 구글, 보리 결정) 계획·G-0·G-1 기록은 문서 커밋 `819ff74`의 이 파일. G-1 `[x]`(react-app `123da52`).
남은 순서: **G-2(이 지시서)** → G-3 전화번호 로그인·가입·비밀번호 찾기 삭제.

**현재 상태 (근거)**
- 구글로 처음 들어오면 `profiles` 행이 없다. 전화번호 가입은 가입 순간 `ensureProfileRow`(`supabaseClient.js:78`, 호출부 `AuthPage.jsx:96` 1곳)가 이름·전화번호·유형 행을 만드는데, 구글 경로엔 그 단계가 없다.
- 그래서 부트 복원(`boot.js` `restoreSessionOnBoot` → `buildCloudAppSession`)이 이름은 구글 메타데이터(`user_metadata.name`), 전화번호는 빈칸, 유형은 기본값 `owner_driver`로 세션을 만들고 바로 홈으로 간다.
- 전화번호 가입 뒤엔 첫 설정 화면(`/onboarding`)을 거치는데(`App.jsx:91-102`), 구글은 이것도 건너뛴다.

**목표 상태**
- 앱을 열거나 구글에서 돌아왔을 때 로그인돼 있는데 **내 `profiles` 행이 없으면**(조회 성공 + 행 없음일 때만, 조회 실패는 지금처럼 홈) 홈 대신 **"기본 정보" 화면 `/welcome`**:
  이름(구글 이름 미리 채움)·휴대전화 번호(010-0000-0000 형식, 10자리 이상) → [시작하기] → `profiles` 행 만들기(유형 `owner_driver`) → 전화번호 가입과 같은 첫 설정 화면 `/onboarding`.
- 행 만들기가 실패하면 토스트 + 화면 유지(다시 누를 수 있음). 중간에 앱을 닫으면 다음에 열 때 다시 이 화면.
- 이미 행이 있는 계정(전화번호 가입자·이 화면을 마친 구글 계정)은 지금과 똑같이 홈.

**건드릴 파일 (코드 5개 + 테스트)**
- `src/app/boot.js`(103줄) — 부트 복원 결과에 "행 없음" 표시(`needsProfile`) 추가: 행 유무만 보는 조회 1번(`profiles` select id, 내 행만 — 기존 권한 그대로).
- `src/app/useAppSession.js`(137줄) — 부트 결과가 "행 없음"이면 홈 대신 `/welcome`, 계정 화면 모양(`inAccountFlow`)에 `/welcome` 포함.
- `src/app/App.jsx`(153줄) — `/welcome` 경로 1개(로그인 필요, 끝나면 `/onboarding`).
- `src/supabaseClient.js`(86줄) — `ensureProfileRow`가 실패를 돌려주게(지금은 콘솔만 찍고 삼킴) — 기존 호출부 1곳은 반환값을 안 써서 동작 같음.
- **새 파일** `src/components/auth/WelcomeProfileView.jsx` — 이름·전화번호 입력 화면(가입 화면 `AuthSignupView`와 같은 모양·같은 전화번호 형식 함수, 비밀번호 칸 없음).
- 테스트: 새 `WelcomeProfileView.test.js`(입력 조건·[시작하기] → 행 만들기 호출·실패 토스트), `boot` 테스트에 "행 없음/있음/조회 실패" 3경우.

**안 건드릴 것:** 전화번호 로그인·가입(G-3), 첫 설정 화면(`OnboardingPage`) 자체, 저장·동기화 경로(hydrate는 지금처럼 부트에서 한 번), DB 표·권한.

**AGENTS 예외 승인 필요:** 코드 파일 5개(새 파일 1개 포함)로 §3 "1~3개" 기준을 넘음 — 부트·경로·화면이 한 흐름이라 나누면 중간 상태에서 화면이 안 열림.
§6 200줄: 모두 200줄 이하 유지 예상(`App.jsx` 153 → ~165).

**§8 5대 질문:** ① 화면은 세션 값만 씀 ② 이름·전화번호는 화면 임시값 → `profiles` 행 ③ 쓰기는 기존 `ensureProfileRow`(가입과 같은 창구) ④ 부트 1회·사용자 버튼 1회, 겹침 없음
⑤ 권한: 내 `profiles` 행 만들기는 전화번호 가입이 이미 쓰는 권한 그대로(새 권한 없음).
**실패 시 처리:** 토스트 + 화면 유지. 신규 레이어 없음.

**확인:** `npm test`·`tsc`·새 테스트 되돌리면 FAIL. 브라우저(보리): G-1 때 만든 구글 계정(행 없음)으로 로그인 → 기본 정보 화면 → 입력 → 첫 설정 → 홈 → 새로고침해도 홈(다시 안 뜸) → 개인정보에 이름·전화번호 보임.

---

**진행:** 착수 승인(2026-10-03, 파일 수 예외 포함) → `[~]`. 5개 파일 + 새 테스트 2파일(6개, 핵심 줄 되돌리면 2개 FAIL 확인), `npm test`(unit 775+화면 258)·`tsc` 0에러.
브라우저(AI): 기존 전화번호 계정은 기본 정보 화면 없이 홈 유지. 보리 확인 중 로고 줄 세로 정렬 발견 → 첫 칸 빈자리로 바로 수정(`WelcomeProfileView.jsx` 1줄, 공용 CSS 무변경).

#### 검증 실패 (보리, 2026-10-03)

기본 정보 → 첫 설정 → 홈 → 새로고침 → 개인정보(이름·전화번호 보임)까지는 통과. **로그아웃 → 구글로 다시 로그인하면 기본 정보 화면은 안 나오지만 개인정보의 전화번호가 비어 있음.**

**원인 (코드 추적):**
1. 부트 때 hydrate는 행이 없는 상태에서 돌아 앱 저장소(Store)의 내 프로필은 이름·전화번호 빈칸.
2. [시작하기]가 서버 `profiles` 행에 이름·전화번호를 쓰지만 **Store는 그대로 빈칸**(전화번호 가입은 행 만든 뒤 hydrate를 다시 돌려 Store를 채움 — `App.jsx` onSignup).
3. 첫 설정 마침(`onboardingFinish.js:51` → `savePracticeSettings` → `upsertProfileOnSupabase(userId, readOwnerProfile(ownerKey), …)`, `practiceSettings.js:35`)이
   설정과 함께 **Store의 빈 이름·전화번호로 서버 행을 덮어씀** → 전화번호 null.
4. 그 직후 화면은 세션 값(`PersonalInfoPage.jsx:121` `get('phone') || sessionPhone`)으로 보여서 정상처럼 보였고, 다시 로그인하면 서버 행(null)을 읽어 빈칸.

#### 수정 착수지시서

**목표:** [시작하기]로 행을 만든 직후, 전화번호 가입과 같은 방식으로 **hydrate를 한 번 더** 돌려 Store 프로필을 서버 행(이름·전화번호)으로 채운 뒤 첫 설정으로.
**건드릴 파일:** `react-app/src/app/App.jsx` `/welcome` 처리에 `hydrateFromSupabase(userId, ownerKeyFromSession(session))` 1줄(이미 import돼 있음, onSignup과 같은 호출). hydrate 실패는 onSignup처럼 콘솔만(행은 이미 저장됨).
**안 건드릴 것:** `savePracticeSettings`·`upsertProfileOnSupabase`(기존 경로 — 프로필을 Store 값으로 같이 쓰는 건 원래 설계, 전화번호 가입도 같은 경로로 문제없음), DB.
**테스트:** 화면 테스트로 이 순서를 직접 재현하기 어렵다(App 전체 + 가짜 서버) — 브라우저 재확인으로 검증. **확인(보리):** 새 구글 계정 또는 지금 계정에서 개인정보에 전화번호 다시 입력 후 →
로그아웃 → 구글 재로그인 → 전화번호 유지. 가능하면 Supabase에서 지금 구글 계정 `profiles` 행을 지우고 처음부터(기본 정보 → 첫 설정 → 로그아웃 → 재로그인).
**실패 시:** 1줄 되돌림. 신규 레이어 없음.

**수정 진행(승인 2026-10-03):** `App.jsx` `/welcome` 처리에 hydrate 1회 추가(185줄). `npm test`(unit 775+화면 258)·`tsc` 0에러.
**추가(보리 지시 2026-10-03 "2번으로"):** 로그아웃 후 [Google로 계속하기]가 브라우저가 기억한 구글 계정으로 바로 넘어가 다른 계정 테스트 불가 →
`supabaseClient.js` `signInWithGoogle`에 `queryParams: { prompt: 'select_account' }`(매번 계정 선택 화면). 실사용에서도 폰 하나를 여럿이 쓰는 경우에 필요.
→ 보리 브라우저 재확인 **통과**(2026-10-03, 다른 구글 계정으로 기본 정보 → 첫 설정 → 로그아웃 → 재로그인 → 전화번호 유지).
코드 커밋 react-app `9a0f04d` → 보리 push·CI 초록·§5 리뷰 7항목 통과·**최종 `[x]` 승인(2026-10-03)**.
