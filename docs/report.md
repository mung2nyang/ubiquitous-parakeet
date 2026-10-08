# docs/report.md — 현재 슬라이스 착수지시서

## 로드맵 18-D — 불러오는 동안 뼈대 화면 `[x]`

보리 확인(2026-10-08): 로드맵 18번 6개 전부 진행, 슬라이스 범위는 AI가 정함.

### 현재 상태 (코드 확인)

- **화면 처음 열 때**(`AppShell.jsx:141` `Suspense` 대기): 화면 파일 17개가 처음 열 때 따로 받아짐(`lazyPages.js`). 받는 동안 화면 가운데에 **트럭 그림 + "운행 일지 ● ● ●"**(`LoadingScreen inline`, 높이 60%)가 뜸 — 앱 시작 화면과 같은 모양이라 "앱이 다시 켜지나?" 싶음.
  주로 새로고침·주소 직접 열기·처음 들어가는 화면에서 보임(앱 안 이동은 앞 화면을 잠깐 유지).
- **글자만 뜨는 곳 3곳**:
  - `CustomerCenterPage.jsx:128` 내 문의 목록 "불러오는 중…"
  - `documents/DailyInspectionMonthSheet.jsx:91` 서류 발급 일상점검표 "불러오는 중입니다."
  - `drivers/EmployerLinkCard.jsx:68` 기사 본인 연동 정보 "연동 정보를 불러오는 중입니다."
- 뼈대 화면은 일상점검 안내 줄 한 곳만 있음(`DailyInspectionNotice.jsx:47-55` + `daily-inspection-loading.css`, 막대 위로 빛이 지나감·동작 줄이기면 멈춤).
- 앱을 처음 켤 때의 시작 화면(`AuthRoute.jsx:30`·`RequireSession.jsx:24` `LoadingScreen`)은 앱 첫 화면 역할이라 이번 대상 아님.

### 목표 상태 (기대 동작)

1. **화면 처음 열 때**: 트럭 그림 대신 **화면 모양 뼈대**(맨 위 제목 자리 막대 1개 + 카드 자리 상자 3개)가 회색으로 뜨고, 그 위로 빛이 천천히 지나감. 하단 메뉴는 그대로.
2. **글자만 뜨던 3곳**: 글자 대신 그 자리 크기의 **막대 2~3줄 뼈대**. 화면 읽기 프로그램에는 지금처럼 "불러오는 중"이라고 읽힘.
3. 일상점검 안내 줄 뼈대와 **같은 색·같은 빛 효과**. 다크 모드는 빛을 약하게. 휴대폰 "동작 줄이기"면 빛 없이 회색만.
4. 불러오기가 끝나면 지금과 똑같이 내용이 나타남(동작·문구 변화 없음).

### 건드릴 파일

| 파일 | 내용 | 줄 수 |
|---|---|---|
| `react-app/src/components/shared/Skeleton.jsx` (새 파일) | 막대 줄 뼈대(`SkeletonLines`, 줄 수 지정) + 화면 뼈대(`PageSkeleton`) | ~40 |
| `react-app/src/components/shared/skeleton.css` (새 파일) | 뼈대 색·빛 효과·다크·동작 줄이기 | ~40 |
| `react-app/src/app/AppShell.jsx` | `Suspense` 대기 화면을 `PageSkeleton`으로 교체(가져오기 줄 바꿈) | 192 → 192 |
| `react-app/src/components/CustomerCenterPage.jsx` | 128번 한 줄 교체 + 가져오기 1줄 | 228 → 229 |
| `react-app/src/components/documents/DailyInspectionMonthSheet.jsx` | 91번 한 줄 교체 + 가져오기 1줄 | 123 → 124 |
| `react-app/src/components/drivers/EmployerLinkCard.jsx` | 68번 한 줄 교체 + 가져오기 1줄 | 72 → 73 |
| `react-app/src/components/shared/Skeleton.test.js` (새 파일) | 아래 테스트 | — |

### §6 200줄 — **예외 1건 승인 요청**

- `CustomerCenterPage.jsx`는 이미 228줄(200 초과). 이번엔 128번 한 줄 교체 + 가져오기 1줄 → **229줄**. 책임·구조 변화 없음, 분리설계는 범위 밖(따로 필요하면 별도 슬라이스). 이 수정을 예외로 승인 요청.
- 나머지는 200 이하.

### 안 건드릴 것

- `LoadingScreen.jsx`·앱 시작 화면 — 그대로(앱 켤 때 트럭 화면은 유지). `inline` 모양도 남겨 둠(기존 테스트 `LoadingScreen.test.js:45`).
- `DailyInspectionNotice.jsx`·`daily-inspection-loading.css` — 그대로(이미 뼈대, 같은 모양으로 맞춤만).
- 불러오기 동작·실패 안내·다시 시도 — 그대로.

### 실패 시 처리 — **신규 레이어 없음**

- 저장·동기화 무관(보이는 것만). 새 저장소·장치 없음(AGENTS §7).

### §8 질문 답

- 1~4: 저장·구독·쓰기 창구 무관. 5: 권한 변경 없음.

### 테스트 (`Skeleton.test.js`)

1. `SkeletonLines`: 지정한 줄 수만큼 막대, "불러오는 중" 상태 알림(`role="status"`·읽기용 문구) 있음.
2. `PageSkeleton`: 제목 막대 1 + 카드 상자 3, 상태 알림 있음.
- 새 테스트는 연결을 잠시 빼서 FAIL 확인 후 결과 첨부(플레이북 §6). 기존 테스트 전체 통과 확인.
- AI 개발 서버: 화면 대기(새로고침으로 화면 파일 처음 받기)·글자 3곳 자리에 뼈대가 뜨는지, 라이트·다크.
- **보리 휴대폰 확인**: 새로고침 직후 화면·고객센터 내 문의·서류 발급 일상점검표에서 뼈대가 자연스러운지.

### 진행 기록 (2026-10-08)

- 보리 "착수지시서 확정, 작업 진행해"(`CustomerCenterPage.jsx` 229줄 예외 포함). 구현: `Skeleton.jsx` 29줄·`skeleton.css` 40줄(새), `AppShell.jsx` 192(그대로)·`CustomerCenterPage.jsx` 229·`DailyInspectionMonthSheet.jsx` 124·`EmployerLinkCard.jsx` 73, 테스트 `Skeleton.test.js`(새, 3건).
- 로컬 `npm test` 전체 통과(unit 791 + 화면 311), `tsc` 오류 0.
- 되돌림 확인(플레이북 §6): 막대·카드를 안 그리게 바꾸면 → 3건 모두 FAIL, 복구 후 3건 PASS.
- AI 개발 서버(모바일 375px·다크): 뼈대 모양 확인(색 `--hover-bg`, 빛 효과 적용) — 화면 대기 자체는 순간이라 같은 모양을 잠시 끼워 넣어 확인. 콘솔 오류는 12:14 18-B 작업 중 지난 기록 1건뿐(지금 오류 없음).
- 코드 커밋 **react-app `bf7afb8`**(push 전). 다음: 보리 push·배포 → **휴대폰**: 새로고침 직후 화면·고객센터 "나의 문의·건의 확인"·서류 발급 일상점검표에서 뼈대가 자연스러운지(라이트·다크).
- push(보리) → CI "verify" 초록(`bf7afb8`) → §5 리뷰 문제 없음(범위 7개 파일 = 지시서, 새 저장 장치·타입 꼼수 없음, `CustomerCenterPage.jsx` 229는 예외 승인·나머지 200 이하, 기존 테스트 변경 없음, 뼈대 클래스 다른 곳 사용 없음) → 보리 휴대폰 확인 "문제없음"·최종 `[x]` 승인(2026-10-08).
