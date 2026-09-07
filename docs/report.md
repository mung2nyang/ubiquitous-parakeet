# docs/report.md — 관리 화면 공통 네비게이션 정합성 (뒤로가기 원위치 복귀 + 차량 등록 후 목록 유지)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **착수지시서 (2026-09-07). 보리 지시로 진행 — 조사는 이전 세션에서 완료,
> 이번 세션은 STATUS.md 내용을 그대로 옮겨 착수지시서로 확정.**
> 감시관이 아래 코드 근거(파일·줄번호)를 실제 소스와 전부 대조 확인함(2026-09-07).

## 0. 범위 확인 (기 완료, 재확인 불필요)

- "차량/거래처/기사 등 관리 화면 공통" 문제라고 사용자 확인 받음(질문 1건, 2026-09-07).
- **A(뒤로가기)**: 명확한 버그, 바로 고침.
- **B(차량 등록 후 목록 유지)**: 원본 동작 대비 차이 — 사용자 결정 완료(2026-09-07): **원본대로 변경**(모달만 닫고 목록에 머문다).

## 1. A. 뒤로가기 — 왔던 곳(메인 vs 마이페이지)으로 복귀

### 1-A. 문제

- `AppShell.jsx`의 `goToPage(page, title, backFallback)`(`AppShell.jsx:106-113`)가
  `backFallback`을 받긴 하는데(`'soon'` 페이지일 때만 씀, 108줄), 그 외 모든 페이지는
  `navigate(pagePath(page))`(112줄)만 호출 — **`backFallback`을 버린다.**
- 호출부 확인: 사이드메뉴 선택 시 `AppShell.jsx:153`에서 `backFallback='home'`,
  마이페이지 단축 버튼 클릭 시 `AppShellRoutes.jsx:78`에서 `'mypage'`를 이미 넘기고 있음
  — 값은 오고 있는데 라우팅에서 버려짐.
- 그래서 `AppShellRoutes.jsx`의 8개 실제 페이지 라우트 `onBack`이 전부 무조건
  `() => navigate('/app')`(67·74·79·80·81·83·84 등).
- **이미 존재하는 정확한 선례**: `ComingSoonRoute.jsx`가 정확히 이 문제를 쿼리 파라미터로
  풀어놨음 —
  ```js
  const [params] = useSearchParams()
  const backTo = params.get('back') === 'mypage' ? '/app/me' : '/app'
  ```
  (`ComingSoonRoute.jsx:8-10`). 새로고침에도 살아남는 쿼리파라미터 방식.

### 1-B. 수정 (파일 2개)

**`AppShell.jsx`** — `goToPage`(106-113줄)를 수정:
- `'soon'`이 아닌 다른 페이지도 `backFallback`이 있으면 `?back=` 쿼리를 붙여
  `navigate(pagePath(page))` 호출.
- 예: `navigate(backFallback ? `${pagePath(page)}?back=${backFallback}` : pagePath(page))`
  (기존 `'soon'` 분기 로직은 그대로 두고, 아래 else 분기만 추가 — 두 분기 구조 유지).

**`AppShellRoutes.jsx`** — 파일 상단에 `useSearchParams()` 추가해서 `back` 파라미터를
읽고, 아래 **8개 라우트**의 `onBack`을 `() => navigate('/app')` →
`() => navigate(backTarget)`로 교체(`backTarget = back === 'mypage' ? '/app/me' : '/app'`,
`ComingSoonRoute.jsx`와 동일 계산):

| 라우트 path | 현재 줄 |
|---|---|
| `cars` | 67 |
| `clients` (두 분기 모두) | 72, 74 |
| `expenses` | 81 |
| `receivables/*` | 82 (`navigate('/app')` 부분만 교체, `bumpNotifTick()` 유지) |
| `report` | 83 |
| `tax` | 84 |
| `me/profile` | 79 |
| `me/settings` | 80 |

- **`drivers` 라우트는 별개, 더 단순한 버그**: `MyPage.jsx:153`에서만 열림(사이드메뉴엔 없음
  — SideMenu.jsx에 `drivers` pick 없음, 이미 확인). 즉 항상 마이페이지에서만 오므로 조건
  분기 필요 없이 `AppShellRoutes.jsx:88`의 `drivers` 라우트 `onBack`을 무조건
  `() => { navigate('/app/me'); bumpNotifTick() }`로 바꾸면 끝(쿼리파라미터 방식과 무관,
  단순 고정값).
- **다른 라우트는 손대지 않음**: `me`(마이페이지 자체, 78줄)·`me/invite`(89)·`revenue`(90,
  하단 탭 전용이라 진입 경로 하나)·`support`(91, 사이드메뉴 전용, 마이페이지에 없음)·
  `drivers/:linkId*`(85-87, `navigate(-1)`이라 이미 정상)·`soon`(92, 이미 해결됨).

### 1-C. 스코프 제외 (알려진 한계, 후속 nit)

- `receivables/*` 안의 중첩 라우트(`ReceivablesDetailPage.jsx`)가
  `navigate('/app/receivables')`로 뒤로가기 할 때 `?back=` 쿼리를 안 들고 감 — 마이페이지에서
  들어가 상세까지 갔다가 나오면 그 시점부턴 홈으로 떨어짐. 드문 경로라 이번 슬라이스에서
  안 고침. 이번 슬라이스에서 `receivables/*` 진입 자체의 `onBack`(82줄, 목록 화면까지 오는
  경로)만 고치고, 그 안의 하위 라우트는 건드리지 않음.

## 2. B. 차량 등록 후 목록 유지 (원본대로 변경)

### 2-A. 문제

- [`CarListPage.jsx:132`](../react-app/src/components/cars/CarListPage.jsx)
  `if (!editingId && result.saved) navigate(todayLogPath(result.saved))` — 신규 차량 등록
  직후 그 차량의 "오늘 일지"로 자동 이동.
- 원본 `saveNewCar()`(`car-management.js:317-324`)는 모달만 닫고 차량 관리 목록에 그대로
  머문다 — **원본엔 없는 동작.**
- 실제 파일 확인 완료: `todayLogPath` 함수는 42-46줄, `todayWorkLogSelection` import는
  11줄이고 파일 전체에서 `todayLogPath` 내부(43줄)에서만 쓰임 — 삭제하면 완전히 죽는 코드
  맞음(grep으로 재확인).
- **122-131줄의 "번호 변경 시 원래 보던 일지로 돌아가기"(`fromLog`) 로직은 별개 기능이니
  그대로 둘 것 — 지우지 말 것.**

### 2-B. 수정 (파일 1개 + 테스트 1개)

**`CarListPage.jsx`**:
1. 11줄 `import { todayWorkLogSelection } from '../../lib/calendar.js'` 삭제.
2. 42-46줄 `todayLogPath` 함수 전체 삭제.
3. 132줄 `if (!editingId && result.saved) navigate(todayLogPath(result.saved))` 삭제.
4. 122-131줄(`fromLog` 로직)은 그대로 둠.

**`src/app/App.clientsCars.test.js`** (259-290줄, 테스트명
`'차량 추가 직후 오늘 일지로 들어가 저장되고 새로고침 뒤에도 남는다'`):
- **단순 삭제 금지(§5-5 테스트 진실성).** "차량 추가 후 차량 관리 목록에 그대로 머문다"로
  다시 쓸 것.
- 새 테스트가 검증할 것: `+ 추가` → 폼 입력 → 저장 클릭 후, ① `window.location.pathname`이
  여전히 `/app/cars`(오늘 일지 경로로 안 바뀜) ② 새 차량(`12가3456`)이
  `getState().cars[ownerKey]`에 실제로 추가됨(저장 자체는 됐는지 확인) ③ 데이터 영속성:
  기존 테스트의 "새로고침 뒤에도 남는다" 취지를 유지하려면 — 목록에 머문 채로 root
  재마운트(새로고침 시뮬레이션) 후에도 그 차량이 여전히 `getState().cars[ownerKey]`에
  있는지 확인(기존 테스트의 unmountTracked→재마운트 패턴 재사용, 다만 검증 대상을
  `workLogs`가 아니라 `cars`로 바꿈 — 오늘 일지 이동 자체가 없어졌으니 `workLogs`
  `fixedCount` 입력 시나리오는 이 테스트에서 빠짐).
- 참고: `todayWorkLogSelection` import(테스트 파일 275줄에서 씀)가 이 테스트 수정 후에도
  파일 내 다른 곳에서 쓰이는지 확인 후, 안 쓰이면 그 import도 정리(다른 테스트가 쓰고
  있으면 그대로 둠 — 작업자가 실제 파일에서 확인).

### 2-C. 스코프 확인 완료 — 다른 화면엔 같은 문제 없음

- `ClientListPage.jsx`는 `navigate` 자체를 안 씀(이미 원본처럼 목록에 머묾).
- `DriverFormModal.jsx`도 `navigate` 없음.
- **차량 관리 1곳만의 문제.** 다른 파일 손대지 않음.

## 3. 파일 요약 (1커밋, 총 4파일)

| 파일 | 변경 |
|---|---|
| `src/app/AppShell.jsx` | `goToPage` 1개 분기 추가(§1-B) |
| `src/app/AppShellRoutes.jsx` | `useSearchParams` 추가 + 8개 라우트 `onBack` 교체 + `drivers` 라우트 1곳 고정값 교체 |
| `src/components/cars/CarListPage.jsx` | import 1줄 + 함수 1개 + 호출 1줄 삭제(순수 삭제, 추가 없음) |
| `src/app/App.clientsCars.test.js` | 기존 테스트 1개 재작성(단순 삭제 금지) |

**§4 플레이북 해당 없음** — 전부 UI 라우팅/화면 전환, `store/**`·`supabaseClient`·
`localStorage`·`domain/finance*`·`domain/receivables*` 직접 접근 없음. 참고 수준.

**§8 4대 질문** — 데이터 구독/스냅샷/쓰기창구/hydrate 어느 것도 안 바뀜(순수 라우팅 값
전달 + 죽은 코드 삭제). 신규 저장 레이어·durable·fallback 없음(§7 해당 없음).

## 4. 스코프

**포함**: 위 4파일, §1-B의 8+1개 라우트, §2-B의 3줄 삭제 + 테스트 재작성.
**안 건드릴 것**: `receivables/*` 하위 중첩 라우트(§1-C, 후속 nit), `fromLog` 로직
(122-131줄), `ComingSoonRoute.jsx`(이미 정상, 참고용 선례일 뿐), `me`·`me/invite`·
`revenue`·`support`·`drivers/:linkId*` 라우트, Supabase/DB 무관.

## 5. 다음 단계

착수 승인 후 작업자에게 이 파일 그대로 전달. 구현 완료 보고는 이 파일 §6에 이어 기록.

## 6. 구현 완료 · 감시관 §5 리뷰 (2026-09-07)

작업자 커밋 `eb734e7`(react-app) — 사용자 push 완료. CI "verify" run `34086676997`
conclusion=success, headSha=`eb734e7` 일치, 3게이트(test·typecheck·build) green.
감시관이 `npm run typecheck`(0건)·`npm test`(593+138, fail 0) 직접 재실행해 재확인.

| # | 항목 | 결과 |
|---|---|---|
| 1 | 범위 준수 | `git show --stat`로 확인 — 지시서 4파일과 정확히 일치, 그 외 파일 무변경 |
| 2 | 몰래 증설 없음 | 신규 파일·저장 키·durable/큐/fallback/tombstone 0 |
| 3 | 타입 꼼수 없음 | `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as` 신규 0건(diff 확인) |
| 4 | 200줄 | AppShell.jsx 178·AppShellRoutes.jsx 98·CarListPage.jsx 176(전부 감소), 테스트파일은 §6 예외 |
| 5 | 테스트 진실성 | 기존 테스트 1개를 새 동작에 맞게 재작성(단순 삭제 아님) — pathname `/app/cars` 유지 + 신규 차량 상태 반영 + 재마운트 후 영속 3가지 실제 검증. 제거된 `localStorage.getItem(storageKeyForLog(...))` 단언은 옛 "오늘일지 이동" 플로우 전용이라 그 플로우 자체가 삭제되며 같이 무의미해진 것 확인(다른 목적의 검증 아님) |
| 6 | 문서 정합 | `git show --stat`에 `.md` 없음 — 작업자 문서 미수정 확인 |
| 7 | 요구사항 충족 | §1-B의 8+1개 라우트 전부 교체 확인(diff 라인 단위 대조), §2-B의 3줄 삭제 + fromLog 로직(115-124줄) 보존 확인 |

**결론**: 7항목 전부 통과. `[~]` → 브라우저 실검증만 남음.
