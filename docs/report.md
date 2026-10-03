# docs/report.md — 현재 슬라이스 착수지시서

## 10-B 검증·배포 합치기 — 착수지시서 (작성 2026-10-03, 승인 2026-10-03)

> 진행: `[~]` react-app `0511e2e` 커밋(`ci.yml` 79줄·`pages.yml` 삭제, YAML 문법 확인). 보리 push 후 Actions·배포 주소 확인 대기.

### 목적 (보리님용 한 줄)
지금은 테스트가 빨강이어도 배포 주소에 그대로 올라갑니다. 앞으로는 **검증(초록)을 통과한 빌드만** 배포되게 하고, 매 push마다 두 번 하던 빌드를 한 번으로 줄입니다.

### 현재 상태
- `react-app/.github/workflows/ci.yml`(이름 "CI", 작업 `verify`): 모든 push·PR·수동 실행. `npm ci` → 테스트 → 타입 검사 → 빌드. 세 단계 모두 `if: !cancelled()`(하나 실패해도 계속). 체크아웃 `path: react-app`, 작업 폴더 `react-app`.
- `react-app/.github/workflows/pages.yml`(이름 "Deploy GitHub Pages"): main push·수동 실행. CI와 따로 `npm ci` → 빌드 → `404.html` 복사 → `configure-pages@v5` → `upload-pages-artifact@v3`(`dist`) → `deploy-pages@v4`. 권한 `pages: write`·`id-token: write`·`contents: read`, `concurrency: pages`(cancel-in-progress), 체크아웃 기본 경로(저장소 최상위).

### 목표 상태 (기대 동작)
1. `ci.yml` 하나에 작업 2개: `verify`(지금 그대로) → `deploy`(`needs: verify`).
2. `deploy`는 **main 브랜치에서만** 돈다. PR·다른 브랜치는 `verify`만.
   - 조건: `github.ref == 'refs/heads/main' && github.event_name != 'pull_request'` (main push + main 수동 실행. 지금 `pages.yml`의 수동 재배포 기능 유지)
3. **같은 빌드 결과를 배포**: `verify` 끝에 `404.html` 복사 → `upload-pages-artifact`(path `react-app/dist`). `deploy`는 `configure-pages` + `deploy-pages`만, 다시 빌드 안 함.
4. 복사·업로드 두 단계는 `if: success() && (위 main 조건)` — 테스트가 실패하면 업로드 자체를 안 함. PR·다른 브랜치에서도 업로드 안 함.
5. 권한: 파일 맨 위는 `contents: read`만. `pages: write`·`id-token: write`, `environment: github-pages`, `concurrency: pages`(cancel-in-progress 그대로)는 `deploy` 작업에만.
6. `pages.yml` 삭제.
7. 작업 이름 `verify`·워크플로 이름 "CI" 유지 — AGENTS §4의 "CI verify 초록" 확인 습관 그대로.

### 건드릴 파일
- `react-app/.github/workflows/ci.yml` — 수정 (배포 작업 추가)
- `react-app/.github/workflows/pages.yml` — 삭제

### 안 건드릴 것
- 앱 코드(`src/**`)·`package.json`·`vite.config.js`(`base: '/react-app/'` 그대로) — 이번엔 배포 설정만 바꿈.
- 저장소 설정 Settings → Pages → Source "GitHub Actions" — 지금도 같은 방식(`pages.yml`이 `deploy-pages` 사용)이라 변경 불필요.
- 플레이북 트리거 해당 없음(저장·동기화 파일 아님).

### §6 200줄
- 새 `ci.yml` 예상 약 70줄. 200줄 이하. 코드 파일 아님(타입 규칙 해당 없음).

### 실패 시 처리
- **신규 레이어 없음.** 배포 설정 파일 1개 수정·1개 삭제뿐.
- push 후 배포가 안 되면 `deploy` 작업 로그를 보고 수정 착수지시서를 다시 씀(AGENTS §3, 수정 커밋 추가 — 이력 되감기 없음).

### 검증 방법
- 로컬: 워크플로 파일이라 `npm test`로는 확인 불가. 문법은 파일 구조만 대조.
- 보리님 push 후: Actions에서 "CI" 안에 `verify` → `deploy` 순서로 초록인지.
- 배포 주소 `https://mung2nyang.github.io/react-app/` 열림, 깊은 주소(`/react-app/app/me`) 새로고침도 정상.
- 일부러 깨뜨리는 시험은 안 함(설정 대조로 확인).

### 참고
- 10-A·10-L 완료, 10-C(라이브러리 떼기) 보류(보리 결정). 다음은 10-P 출시 준비(`docs/roadmap.md`).
- 도메인을 사면 `base`(`/react-app/` → `/`)와 배포 주소가 바뀜 — 그때 404 복사·주소 확인 부분 다시 봄.
