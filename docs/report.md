# docs/report.md — 현재 슬라이스 착수지시서

## 로드맵 10-P ⓐ — 새 도메인(getdrivelog.com)으로 앱 옮기기 `[x]`

보리 확인(2026-10-08): 도메인 `getdrivelog.com` 구입(가비아, 2년). 로드맵 10-P 순서 ⓐ.

### 이미 끝난 설정 (코드 밖, 2026-10-08)

- 가비아 DNS: A `@` 4개(185.199.108~111.153) + CNAME `www` → `mung2nyang.github.io` — AI가 보리 지시로 입력, 가비아 네임서버 조회로 5개 확인.
- GitHub `react-app` → Settings → Pages → Custom domain `getdrivelog.com` 저장(보리) — "DNS check successful".
- Supabase URL Configuration — AI가 보리 지시로 변경: Site URL `https://getdrivelog.com`, Redirect URLs에 `https://getdrivelog.com/**` 추가(옛 주소·localhost 유지, 총 3개). 아래 진행 순서 2번 완료.
- 조회 결과(curl): `https://getdrivelog.com` 응답 200(인증서 발급됨), 옛 주소 `mung2nyang.github.io/react-app/` → 새 도메인으로 301 이동.

### 현재 상태 (코드 확인)

- **지금 앱이 안 열림**: 배포된 앱은 파일을 `/react-app/assets/...`에서 찾는데(`getdrivelog.com` 응답 HTML에서 확인), 새 도메인에는 그 경로가 없음 → 빈 화면. 옛 주소도 새 도메인으로 넘어가서 마찬가지.
- 원인은 한 줄: `vite.config.js:8` `base: command === 'build' ? '/react-app/' : '/'`.
- 옛 주소가 적힌 주석·문구: `vite.config.js:4`, `ci.yml:4`, `routerBasename.js:2-3`, `assetPath.js:2`, `pwaManifest.test.js:18`(안내 문구).

### 목표 상태 (기대 동작)

1. `https://getdrivelog.com`에서 앱이 열리고, 이미지·아이콘·화면 이동이 정상.
2. 주소를 직접 열거나 새로고침해도(`/app` 등) 정상(404.html 방식 그대로).
3. 구글 로그인 → 구글 화면 → `https://getdrivelog.com/auth`로 돌아와 로그인 유지.
4. 홈 화면 앱 설치가 새 주소 기준으로 됨.
5. 로컬 `npm run dev`(localhost:5173)는 지금과 똑같음.

### 건드릴 파일

| 파일 | 내용 | 줄 수 |
|---|---|---|
| `react-app/vite.config.js` | `base`를 항상 `/`로(빌드·개발 구분 삭제), 4번 주석 새 주소로 | 9 → 8 |
| `react-app/.github/workflows/ci.yml` | 4번 주석 배포 주소만 새 주소로 | 79 → 79 |
| `react-app/src/app/routerBasename.js` | 2~4번 주석만 새 주소 기준으로(동작 그대로) | 11 → 11 |
| `react-app/src/lib/assetPath.js` | 2번 주석만(동작 그대로) | 14 → 14 |
| `react-app/src/app/pwaManifest.test.js` | 18번 안내 문구만 `/react-app/` → 새 주소(검사 내용 그대로) | 40 → 40 |

- 동작이 바뀌는 건 `vite.config.js` 한 줄뿐. 나머지 4개는 옛 주소가 적힌 주석·문구 정리.

### §6 200줄

- 5개 모두 200줄 이하(최대 `ci.yml` 79줄), 줄 수 거의 변화 없음.

### 안 건드릴 것 (근거)

- `routerBasename.js`·`assetPath.js` 동작 — 둘 다 `import.meta.env.BASE_URL`을 읽어 base가 `/`면 자동으로 맞춤(`routerBasename.js:8-9`, `assetPath.js:11-13`).
- `supabaseClient.js` — 구글 복귀 주소를 `window.location.origin + routerBasename()`으로 만듦(`supabaseClient.js:31`) → 새 도메인에서 저절로 `https://getdrivelog.com/auth`.
- `public/manifest.webmanifest` — `start_url`·`scope`가 상대 경로 `./`라 그대로 동작(`pwaManifest.test.js:18-19`).
- `index.html` — `/favicon.svg` 등 절대 경로는 base `/`와 같음.
- `ci.yml` 404.html 복사·배포 단계 — 그대로 필요. CNAME 파일 — Actions 배포라 불필요(저장소 설정에 이미 입력).
- 저장·동기화 코드 — 무관, 플레이북 트리거 없음.

### 실패 시 처리 — **신규 레이어 없음**

- 설정 한 줄 변경. 새 저장소·장치 없음(AGENTS §7). 문제가 생기면 수정 커밋 하나 더.

### §8 질문 답

- 1~4: 저장·구독·쓰기 창구 무관. 5: 권한 변경 없음.

### 이미 합의된 손실 (보리 확인 2026-10-07)

- 옛 주소에서 쓰던 비회원 데이터·로그인 상태·설치한 홈 화면 앱은 새 주소로 안 넘어감(브라우저가 주소별로 따로 보관). 실사용자 없음. 새 주소에서 다시 로그인·재설치.

### 진행 순서

1. AI: 코드 수정 → 로컬 `npm test`·`tsc` → `npm run build` 결과 HTML이 `/assets/...`를 가리키는지 확인 → 커밋(push 안 함).
2. **보리: Supabase → Authentication → URL Configuration** (push 전에 해도 무해)
   - Site URL: `https://getdrivelog.com`
   - Redirect URLs에 추가: `https://getdrivelog.com/**`
   - 옛 주소·localhost 항목은 그대로 둠(정리는 10-P 출시 설정에서).
3. 보리: push → CI "verify" 초록·배포.
4. 보리: GitHub Pages 설정에서 **Enforce HTTPS** 켜기(체크 가능해졌으면).
5. 확인(아래).

### 테스트·확인

- 새 테스트 없음 — 바뀌는 건 빌드 설정 한 줄이고, 결과는 배포된 주소에서만 확인 가능. 대신 빌드 결과와 배포 주소를 직접 확인.
- 기존 테스트 전체 통과 확인(`pwaManifest.test.js`는 문구만 바뀜).
- AI: 배포 후 `https://getdrivelog.com` HTML이 `/assets/...`를 가리키고 그 파일이 200인지, `/app` 직접 열기, 옛 주소 이동 확인.
- **보리 휴대폰·PC 확인**: ① `getdrivelog.com` 열림 ② 구글 로그인 → 돌아와서 로그인 유지 ③ 새로고침해도 그대로 ④ 홈 화면 앱 다시 설치 → 주소창 없이 열림.

### 진행 기록 (2026-10-08)

- 보리 "착수지시서 확정, 작업 진행해"(주석 정리 포함). 구현: `vite.config.js` 9 → 8(base `/`), `ci.yml`·`routerBasename.js`·`assetPath.js`·`pwaManifest.test.js` 주석·문구만.
- 로컬 `npm test` 전체 통과(unit 791 + 화면 311), `tsc` 오류 0.
- 빌드 확인: 결과 `index.html`이 `/assets/...`·`/favicon.svg`·`/manifest.webmanifest`·`/images/...`를 가리킴(`/react-app/` 없음). 개발 서버는 원래 base `/`라 변화 없음 — 화면 확인은 배포 주소에서.
- 코드 커밋 **react-app `cdd1c5d`**(push 전). 다음: 보리 push → CI 초록·배포 → AI 배포 주소 확인 → 보리 휴대폰·PC 확인(위 4개).
- push(보리) → CI "verify" 초록(`cdd1c5d`) → 배포 확인(AI, curl): `https://getdrivelog.com`이 `/assets/...` 새 빌드를 내보내고 파일 200, `/app` 직접 열기 앱 화면, 옛 주소 → 새 도메인 이동, `www` → `https://getdrivelog.com`.
- Enforce HTTPS: 보리 지시로 AI가 GitHub Pages 설정에서 체크·저장 확인. `http://` → `https://` 이동은 GitHub 반영 대기(설정 완료).
- §5 리뷰 문제 없음(범위 5개 파일 = 지시서, 새 저장 장치·타입 꼼수 없음, 모두 200줄 이하, 테스트는 안내 문구만 변경). 보리 휴대폰·PC 확인 ①~④ 문제없음 — 구글 로그인 중 주소창은 구글 사이트(앱 범위 밖)라 정상 → 최종 `[x]` 승인(2026-10-08).
