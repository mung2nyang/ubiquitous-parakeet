# docs/report.md — 현재 슬라이스 착수지시서

## 구글 로그인 추가 (로드맵 밖 보리 요청, 2026-10-03)

**배경:** 지금 로그인은 휴대전화 번호를 가짜 이메일(`숫자@runlog-user.com`, `supabaseClient.js:14`)로 바꿔 쓰는 방식이라
비밀번호 찾기(메일 발송)가 불가능하다. 보리 결정(2026-10-03): **전화번호 로그인을 없애고 구글 로그인으로 바꾼다.** 카카오는 나중.
**순서 원칙:** 구글이 처음 로그인·첫 정보 입력까지 다 되는 걸 확인한 **뒤에** 전화번호 로그인을 지운다(G-1·G-2 동안은 둘 다 있음 — 중간에 로그인할 길이 끊기지 않게). DB 표 변경 없음.

**조사 (근거)**
- 새로고침 때 로그인 복원은 `app/boot.js` `restoreSessionOnBoot` → `supabase.auth.getSession()` → `buildCloudAppSession`(profiles·연동 조회) → hydrate.
  구글 로그인은 구글 화면으로 갔다가 앱으로 **되돌아오면서 새로 열리는** 방식이라, 돌아온 뒤에는 이 복원 경로를 그대로 탄다.
- 라우터는 `BrowserRouter`(`main.jsx:13`), 배포 주소 `https://mung2nyang.github.io/react-app/`(`vite.config` base `/react-app/`, `pages.yml` 404 복사) — 되돌아올 주소에 문제 없음.
- 가입 때 `profiles` 행(이름·전화번호·유형)을 `ensureProfileRow`(`supabaseClient.js:67`)가 만든다. 구글 첫 로그인은 이 행이 없고 전화번호도 구글이 주지 않는다.

---

### 슬라이스 G-0 — 보리 설정 (코드 없음, AI가 화면 순서 안내)

1. Google Cloud Console: 프로젝트 → OAuth 동의 화면(외부, 앱 이름 "운행 일지") → 사용자 인증 정보 → OAuth 클라이언트 ID(웹 애플리케이션)
   - 승인된 리디렉션 URI: `https://wphlnkfymvpnklgbuxrk.supabase.co/auth/v1/callback`
2. Supabase → Authentication → Providers → Google 켜고 1번의 클라이언트 ID·보안 비밀 입력.
3. Supabase → Authentication → URL Configuration → Redirect URLs에 `http://localhost:*/**`, `https://mung2nyang.github.io/react-app/**` 추가.
- 보안 비밀은 **Supabase 화면에만** 넣는다(코드·대화창·문서에 적지 않음).

### 슬라이스 G-1 — [Google로 계속하기] 버튼 + 돌아온 뒤 로그인 유지

**건드릴 파일**
- `react-app/src/supabaseClient.js`(76줄) — `signInWithGoogle()` 추가: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 지금 주소의 앱 시작 경로 + 'auth' } })`.
- `react-app/src/components/auth/AuthIntroView.jsx`(31줄) — 첫 화면 [로그인][회원가입] 아래 [Google로 계속하기] 버튼(실패 시 토스트).
- `react-app/src/components/AuthPage.jsx`(146줄) — 버튼 누름 처리(바쁨 표시·오류 토스트)만 연결.

**안 건드릴 것:** 전화번호 로그인·가입(`signInWithPhone`·`signUpWithPhone` 그대로), `boot.js`·`useAppSession.js`(되돌아온 뒤 기존 복원 경로가 그대로 처리 —
`restoreSessionOnBoot`가 `getSession()`만 보므로 로그인 방식과 무관), 저장·동기화 경로, DB.

**기대 동작:** 첫 화면 버튼 → 구글 계정 선택 → 앱으로 돌아와 홈으로. 새로고침해도 로그인 유지, 로그아웃 정상.
**알려진 한계(G-2에서):** 구글로 **처음** 들어온 사람은 `profiles` 행이 없어 이름·전화번호가 빈 채로 홈에 들어간다(유형은 기존 기본값 `owner_driver`).

**확인:** `npm test`·`tsc`·새 화면 테스트(버튼 누르면 구글 로그인 함수 호출·실패 시 토스트). 브라우저: 보리 구글 계정으로 로컬에서 로그인→새로고침→로그아웃
(구글 계정 비밀번호 입력은 AI가 하지 않음 — 보리가 직접).
**§6:** 세 파일 모두 200줄 이하, 늘어나는 줄 소량. **실패 시:** 버튼만 빼면 원래대로. 신규 레이어 없음.
**§8 질문 5(권한):** 로그인 방식만 다르고 `auth.uid()`는 같은 방식으로 생겨 기존 권한 규칙 그대로.

### 슬라이스 G-2 — 구글 첫 로그인 때 이름·전화번호 받기 (G-1 `[x]` 뒤 지시서 확정)

- 되돌아왔을 때 `profiles` 행이 없으면 홈 대신 "기본 정보" 화면(이름·전화번호) → `ensureProfileRow` → 기존 가입과 같은 온보딩(`/onboarding`).
- 예상 파일: `boot.js`(행 없음 표시), `useAppSession.js`(그 경우 화면 이동), 새 화면 1개 + `App.jsx` 경로 1줄 — 파일 수가 AGENTS §3 기준(1~3개)을 넘을 수 있어 G-2 지시서에서 다시 정함.

### 슬라이스 G-3 — 전화번호 로그인·가입·비밀번호 찾기 삭제 (G-2 `[x]` 뒤 지시서 확정)

- 첫 화면 = [Google로 시작하기] + [비회원으로 시작하기]. 전화번호 로그인·가입 화면(`AuthLoginView.jsx`·`AuthSignupView.jsx`), 비밀번호 찾기 안내 창(`ForgotPasswordModal.jsx` —
  지금 없는 기능 "사장님 임시 비밀번호 재발급"을 안내 중), `supabaseClient.js`의 전화번호 함수, `AuthPage.jsx`·`App.jsx`·`useAppSession.js` 연결부, 관련 테스트 3개(`App*.test.js`) 정리.
  근거: `grep -rln "signInWithPhone|signUpWithPhone|phoneToFakeEmail|AuthLoginView|AuthSignupView|ForgotPasswordModal|forgotOpen|runlog-user" src` 10개 파일.
- 비밀번호 변경·찾기는 구글이 맡으므로 앱에서 만들 필요 없어짐.

### 이번 범위 밖

카카오 로그인.

**보리 확인 필요 — 기존 전화번호 계정(테스트용 차주·기사 계정과 그 기록):** G-3 뒤에는 로그인할 수 없게 된다(서버 기록은 남음).
- 가. 버리고 구글로 새로 가입해 테스트(가장 간단).
- 나. G-3 전에 마이페이지에 임시 [구글 계정 연결] 버튼을 넣어, 전화번호로 로그인한 채 구글을 연결 → 같은 계정·기록을 구글로 계속 사용
  (Supabase "수동 계정 연결" 설정 켜기 필요, 슬라이스 하나 추가).

---

**보리 답변 (2026-10-03):** ① G-0 지금 진행(AI 안내) ② 기존 테스트 계정 **가**(버리고 구글로 새로 가입) ③ G-1은 **보리가 G-0을 마치면 진행**(착수 승인 — G-0 완료 보고가 시작 조건).

**진행:**
- G-0 완료(2026-10-03): 보리 설정, AI 확인 — Supabase Google **Enabled**, Site URL `https://mung2nyang.github.io/react-app/`, Redirect URLs 2개 저장 확인(새로고침 후). Client ID는 AI가 입력, Secret·저장은 보리.
- G-1 `[~]`: 3개 파일 + 새 테스트 `AuthPage.google.test.js` 2개(연결 끊으면 2개 FAIL 확인) + **지시서 밖** `App.test.js`·`App.clientsCars.test.js`·`App.guestDurable.test.js`의
  supabaseClient 가짜 목록에 `signInWithGoogle` 1줄씩(없으면 AuthPage 불러오기 실패). `npm test`(unit 775+화면 252)·`tsc` 0에러. 브라우저(보리): 구글 로그인→복귀→새로고침 유지→로그아웃 통과.
  코드 커밋 react-app `123da52` → 보리 push·CI 초록·§5 리뷰 7항목 통과·**최종 `[x]` 승인(2026-10-03)**.
