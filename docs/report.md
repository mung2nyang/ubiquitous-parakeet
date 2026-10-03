# docs/report.md — 현재 슬라이스 착수지시서

## 로드맵 10-L — 로딩 표시 + 불러오는 동안 테마 깜빡임 + 탭 제목 + 트럭 아이콘 (보리 요청, 2026-10-03)

10번 조사·10-A(`[x]` `e135398`) 기록은 문서 커밋 `ea0eaa7`의 이 파일. 다음은 10-B(검증·배포 합치기, 계획은 그 커밋 참고).

**보리 요청:** 휴대폰은 통신·기종 때문에 늦을 수밖에 없으니 기다리는 동안 로딩 표시를. 모양 = **🚚 배너 + "운행 일지" + 차례로 깜빡이는 점 세 개(● ● ●)**(점이 포인트, 별도 회전 아이콘 없음).
불러오는 화면이 다크/라이트를 안 따라 **다크 사용자가 눈부심**. 탭 제목 "운행 일지 React 연습장" → "운행 일지". 휴대폰에 보이는 **번개 아이콘** 교체.

**현재 상태 (근거)**
- 앱 파일(gzip 약 210KB)이 오기 전엔 `index.html`의 빈 `<div id="root">` — **하얀 화면**.
- 앱이 뜬 뒤 "불러오는 중..." 글자 3곳: `AuthRoute.jsx:16`(부트 중 첫 화면), `RequireSession.jsx:23`(부트 중 앱 화면), `AppShell.jsx:134`(화면 처음 열 때 `Suspense`).
- 테마 깜빡임 원인 ①: 다크 설정은 앱 코드가 떠야 읽힘(`practiceSettings.js` `applyTheme`가 `<html data-theme>`를 씀). 원인 ②: 부트 중엔 세션이 아직 없어 ownerKey가 `guest` →
  `useAppSession.js:103-105`가 **비회원 설정(라이트)**을 적용 → 다크 회원은 부트 동안 하얗게 번쩍.
- 번개 = Vite 기본 아이콘 `public/favicon.svg`(`index.html:5`). `public/icons.svg`(Vite 템플릿 잔재)는 쓰는 곳 0(grep).

**목표 상태**
1. **첫 HTML 안 로딩 표시:** `index.html`의 `#root` 안에 "🚚 운행 일지 ● ● ●"(앱이 뜨면 React가 자동으로 지움) + 그 모양 CSS를 `<style>`로 같은 파일에.
   `<head>`의 작은 스크립트가 **기억된 테마**를 읽어 바로 `data-theme`을 붙여 배경·글씨를 맞춤(없으면 휴대폰 다크 설정 `prefers-color-scheme`).
2. **새 `LoadingScreen.jsx`:** 같은 모양·같은 CSS 클래스(1의 `<style>`을 그대로 씀 — 모양 정의 한 곳) → 3곳의 "불러오는 중..."을 교체.
3. **테마 기억:** `applyTheme`가 테마를 바꿀 때 기기 저장소에 `lastTheme`('dark'|'light') 한 칸 저장(실패해도 무시). **부트 중엔 비회원 라이트로 덮지 않음**(`useAppSession` 테마 효과에서 `booting`이면 건너뜀).
4. 탭 제목 "운행 일지".
5. `favicon.svg`를 트럭 그림(마이페이지 "차량 관리" 트럭, 앱 파란 `#2b6cb0`)으로 교체, `icons.svg` 삭제.

**건드릴 파일:** `index.html`, `public/favicon.svg`, `public/icons.svg`(삭제), 새 `src/components/LoadingScreen.jsx`, `src/app/AuthRoute.jsx`·`RequireSession.jsx`·`AppShell.jsx`(각 1줄),
`src/lib/practiceSettings.js`(`applyTheme`에 저장 2~3줄), `src/app/useAppSession.js`(1줄), 테스트(로딩 표시·테마 저장·부트 중 덮지 않음).
**안 건드릴 것:** 화면 안 작은 "불러오는 중"(고객센터 목록·점검표 표·기사 소속 카드 — 글자 그대로), 계정 화면(로그인·첫 설정)의 어두운 배경 규칙, 저장·동기화, DB.

**AGENTS 승인 필요**
- **§7 새 저장 키 1개 `lastTheme`:** 화면 색 기억용(기록·계산과 무관, 지워지면 휴대폰 다크 설정을 따를 뿐). 기존 테마 정본은 설정(`settings.theme`) 그대로.
- **§3 파일 수:** 코드 7개 + 그림 2개 — 한 화면(로딩)의 같은 모양을 앱 전·후 두 곳에 맞추는 일이라 나누면 모양이 어긋난 중간 상태.
- §6: `AppShell.jsx` 184줄·나머지 200 이하, 줄 수 거의 그대로. §4 플레이북: `practiceSettings.js`가 localStorage를 직접 씀 → 화면 표시용 한 칸, 저장·동기화 경로 아님.

**확인:** `npm test`·`tsc`·되돌리면 FAIL. 브라우저(AI): 느린 통신 흉내(개발자 도구 네트워크 제한)로 첫 로딩 표시가 다크/라이트 맞게 뜨는지, 3곳 교체, 탭 제목·아이콘.
보리: 휴대폰 다크 모드 계정으로 새로고침해 눈부심 없는지. **실패 시:** 되돌림. 신규 레이어 없음(저장 키 1개만).

---

**진행 (착수 승인 2026-10-03, §7 `lastTheme`·§3 파일 수 예외 포함):** `index.html`(제목·테마 스크립트·로딩 CSS·로딩 표시), 새 `LoadingScreen.jsx`, 3곳 교체(Suspense는 `inline`),
`applyTheme` `lastTheme` 저장, `useAppSession` 부트 중 테마 덮지 않음, `favicon.svg` 트럭(`#2b6cb0`), `icons.svg` 삭제.
**테스트 수정(지시서 밖, 의도 같음):** `App.test.js` 2곳이 "불러오는 중" 글자가 사라질 때까지 기다리던 것을 `.boot-loading`이 사라질 때까지로(새 표시엔 그 글자가 없어 안 바꾸면 기다리지 않고 통과).
새 테스트 `LoadingScreen.test.js` 3개(저장 줄 되돌리면 FAIL). `npm test`(unit 777+화면 266)·`tsc` 0에러.
배포 빌드 확인: `index.html`의 배너·아이콘 주소가 `/react-app/…`으로 바뀜(예전 `./favicon.svg` 상대 주소는 깊은 주소에서 깨지던 것도 해결). 브라우저(AI): 로딩 표시 라이트·다크 모양, 탭 제목, 트럭 아이콘.
보리 요청: "운행 일지" 글꼴을 홈 배너와 같은 Jua로(첫 HTML에서 기다리지 않게 불러옴), 색은 앱 파란색 유지(보리 결정). 보리 PC 확인 통과 → 코드 커밋 react-app `0d83ce6` → 보리 push·CI 초록.

#### 휴대폰 검증에서 발견 (보리, 2026-10-03) — `[~]`, 수정 착수지시서

**증상:** 앱을 껐다 다시 켤 때 로그인 화면이 아주 짧게 비침(PC는 거의 안 보임).
**원인(코드 추적):** 다시 켜면 `/auth`에서 시작 → 부트 복원 끝에 `useAppSession.js`가 `goHome`(홈 이동)과 `setBooting(false)`를 같이 부름 →
React Router `BrowserRouter`는 주소 변경을 `startTransition`으로 늦게 처리(라이브러리 `react-router/dist/development/chunk-62JRHF6Z.mjs` `BrowserRouter` setState) →
"부트 끝 + 아직 `/auth`" 상태가 한 번 그려져 `AuthRoute`가 로그인 첫 화면을 보여 줌.
**수정:** `AuthRoute`가 `booting`뿐 아니라 **세션이 이미 있으면** 로딩 표시를 계속 보여 줌(홈·기본 정보로 넘어가는 순간까지). 안전장치: 세션이 있는데 1.5초 안에 다른 화면으로 안 넘어가면
(주소창에 `/auth` 직접 입력 등) `/app`으로 이동. **건드릴 파일:** `src/app/AuthRoute.jsx`, `src/app/App.jsx`(`session` 넘겨주기 1줄), 테스트(세션 있으면 로딩·로그인 화면 안 그림).
**안 건드릴 것:** `BrowserRouter`의 전환 방식(끄면 앱 전체 화면 전환이 바뀌어 영향 큼), 부트 순서. **실패 시:** 되돌림. 신규 레이어 없음.
**수정 결과 (승인 2026-10-03):** 위대로 수정, 새 테스트 `AuthRoute.test.js` 2개(되돌리면 1개 FAIL). `npm test`(unit 777+화면 268)·`tsc` 0에러.
브라우저(AI): 로그인 상태로 `/auth` 진입 → 로그인 버튼 0회·로딩 → `/app`. 코드 커밋 react-app `84c87a5` → 보리 push·CI 초록·휴대폰 확인 통과·§5 리뷰 7항목 통과·**10-L 전체 최종 `[x]` 승인(2026-10-03)**.

