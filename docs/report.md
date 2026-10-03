# docs/report.md — 현재 슬라이스 착수지시서

## 구글 로그인 G-3 — 전화번호 로그인·가입·비밀번호 찾기 삭제 (로드맵 밖 보리 요청, 2026-10-03)

로그인 개편(전화번호 → 구글, 보리 결정) 마지막 단계. G-1 `[x]`(`123da52`)·G-2 `[x]`(`9a0f04d`) — 지난 기록은 문서 커밋 `819ff74`·`5b886ce`의 이 파일.
기존 전화번호 테스트 계정은 버림(보리 결정 "가", 서버 기록은 남음).

**현재 상태 (근거: `grep -rln "signInWithPhone|signUpWithPhone|phoneToFakeEmail|AuthLoginView|AuthSignupView|ForgotPasswordModal|forgotOpen|AuthBackIcon" src`)**
- 첫 화면 `AuthIntroView`: "계정이 있으신가요?" [로그인][회원가입][Google로 계속하기] [비회원으로 시작하기].
- 전화번호 로그인·가입 화면 `auth/AuthLoginView.jsx`·`auth/AuthSignupView.jsx`, 그 둘만 쓰는 뒤로가기 아이콘 `auth/AuthBackIcon.jsx`,
  비밀번호 찾기 안내 창 `ForgotPasswordModal.jsx`(없는 기능 "사장님 임시 비밀번호 재발급"을 안내 중).
- 연결부: `AuthPage.jsx`(화면 전환·전화번호 로그인/가입 처리), `app/AuthRoute.jsx`(onLogin·onSignup·onForgotPassword 전달),
  `app/App.jsx`(onLogin·onSignup 처리 73~102행, 안내 창 180행), `app/useAppSession.js`(`forgotOpen`), `supabaseClient.js`(`phoneToFakeEmail`·`signInWithPhone`·`signUpWithPhone`, 오류 문구의 전화번호 안내).

**목표 상태**
- 첫 화면 = 로고 + **[Google로 시작하기]**(기본 버튼) + [비회원으로 시작하기]. 문구 "계정이 있으신가요?" → 없앰(로그인·가입 구분 없음).
- 위 전화번호 관련 화면·함수·연결부 전부 삭제. 구글 첫 로그인은 G-2의 `/welcome` → `/onboarding`(가입 역할을 대신함).
- 오류 문구 함수 `getSupabaseAuthErrorMessage`는 구글 버튼이 쓰므로 남기되, 전화번호 전용 문구(이미 가입된 번호·이름/전화번호 틀림·6자) 삭제.

**건드릴 파일**
- 삭제 4개: `components/auth/AuthLoginView.jsx`·`AuthSignupView.jsx`·`AuthBackIcon.jsx`, `components/ForgotPasswordModal.jsx`.
- 수정 6개: `components/auth/AuthIntroView.jsx`, `components/AuthPage.jsx`(첫 화면만 남아 크게 줄어듦), `app/AuthRoute.jsx`, `app/App.jsx`, `app/useAppSession.js`, `supabaseClient.js`.
- 테스트: `App.test.js`·`App.clientsCars.test.js`·`App.guestDurable.test.js`·`AuthPage.google.test.js`의 가짜 목록에서 전화번호 함수 삭제, `AuthPage.google.test.js` 버튼 이름 바뀜 반영 + "첫 화면에 전화번호 로그인·가입 버튼 없음" 확인 추가.

**안 건드릴 것:** `/welcome`·`/onboarding`·부트 복원(G-1·G-2 그대로), 마이페이지 "로그인하러 가기"(비회원 → `/auth`, 그대로 동작), DB.
`account-flow.css`(549줄)에 남는 전화번호 화면 전용 클래스(`auth-link-text`·`auth-field-extra` 등) 정리 — 200줄 넘는 파일이라 별도(필요하면 나중에).

**AGENTS 예외 승인 필요:** 삭제 4 + 수정 6 = 10개 파일로 §3 "1~3개" 기준을 넘음 — 한 기능(전화번호 로그인)을 통째로 빼는 일이라 나누면 중간에 연결이 끊긴 화면이 남음.
§6: 수정 파일 모두 줄어들거나 그대로(200줄 이하).

**G-3 뒤 보리 설정 (권장, 코드 없음):** Supabase → Authentication → Providers → **Email 끄기**. 앱에서 버튼을 지워도 공개 키로 전화번호(가짜 이메일) 가입 요청을
직접 보낼 수 있어서, 막으려면 서버에서도 꺼야 한다(기존 전화번호 계정 로그인도 막힘 — "가" 결정과 같음).

**확인:** `npm test`·`tsc`·새 확인 되돌리면 FAIL. 브라우저(AI): 첫 화면 모양(구글·비회원만), 비회원 시작, 콘솔 오류 없음.
브라우저(보리): 구글 로그인 → 홈 → 로그아웃 → 첫 화면, 마이페이지(비회원) "로그인하러 가기" → 첫 화면.
**실패 시:** 되돌림(git). 신규 레이어 없음.

---

**진행:** 착수 승인(2026-10-03, 파일 수 예외 포함, Email 끄기 권장 확인) → 삭제 4·수정 6, 테스트 1개 추가(삭제 전 화면으로 되돌리면 FAIL 확인).
`npm test`(unit 775+화면 259)·`tsc` 0에러. 브라우저 확인 중 개발 서버가 마지막 수정을 놓쳐 옛 모듈(`forgotOpen` 참조)을 보내 빈 화면 — 디스크 파일은 정상,
파일 시각 갱신 후 정상(코드 문제 아님, OneDrive 폴더 파일 감시). 보리 확인 통과(첫 화면·구글 로그인·비회원 → 로그인하러 가기).
코드 커밋 react-app `9d1cf8c` → 보리 push·CI 초록·§5 리뷰 7항목 통과·**최종 `[x]` 승인(2026-10-03)**.
Supabase Email provider 끄기 — 보리 저장, AI 확인(Email Disabled·Google Enabled·Allow new users to sign up 켜짐).
배포 전 할 일(10번): Google 인증 플랫폼 → 대상 → [앱 게시](기본 범위만이라 심사 없음, 로고 등록 시 확인 절차 생길 수 있음). 남은 nit: `account-flow.css`의 지운 전화번호 화면 전용 클래스.
