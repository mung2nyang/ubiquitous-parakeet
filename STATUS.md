# STATUS — 현재 상태 한눈에

> **매 세션 이 파일부터 읽는다.** "지금 어디까지 왔나"의 정본.
> 상세 이력은 `docs/archive/audit.md`(동결, 필요할 때만 찾아봄).
> 갱신 규칙: 슬라이스 착수·완료 때마다 이 파일을 **덮어쓴다**(append 아님).
> 최종 갱신: 2026-09-04

---

## 지금 하는 일
**다음 슬라이스 미착수.** 소속기사 지출 입력 1차 완료. 다음 = **2차(차주 화면 반영)** — 착수 전 확인.

## 다음 할 일 (순서대로)
1. **소속기사 지출 입력 2차** — 소속기사가 입력한 정비/주유를 **차주 매출 화면 지출**에도 반영. 차주 hydrate(`hydrate.js`)가 서브 차량 비용도 조회 → `getOwnerMonthlyFinanceDetail`은 이미 `expenses` 읽으므로 데이터만 들어오면 됨. 회귀 검증 범위 큼(차주 화면).
2. **다중 배정 차량** — 현재 소속기사는 첫 배정 차량만 집계(`remapEmployedDriverWorkLogs`/`fetchExpensesForAssignedVehicle` TODO). 2대+ 배정 UI·집계.
3. **Step 9 ① 슬라이스 B** — 대리작성 진입점 UI (차주가 소속기사 일지를 대신 작성)
4. **Step 9 ②** — 소속기사 로그인 화면 완성 (employerLink, RLS 신규; MyPage 메뉴 가드 = audit "문제 A" 포함)
   → 위 1~4가 끝나야 Step 9 전체 `[x]` 확정 가능

### 후속 nit (급하지 않음)
- 소속기사 지출 카드에 값이 뜨는데 순이익은 안 줄어듦 → 브라우저에서 헷갈리는지 보리 확인, 필요 시 "차주 부담(순이익 미반영)" 문구 1줄.
- `fetchExpensesForAssignedVehicle` 단위 테스트 없음 — 다음에 `hydrateEmployedDriver` 건드릴 때 추가.

## 백로그 (급하지 않음 — 이관 끝난 뒤)
- 소속기사 매출 "운송료" 표시: 전체+정산라인(현재) vs 본인 몫만 — 차주가 기사 등록 시 토글 선택.

## 완료 (커밋·푸시됨)
- **Step 0~8**: 전부 완료·승인·푸시 (Step 8: 2026-09-02)
- **Step 9-A~D**: 차량 정산방식(매출제/월급제)·정산 UI — react-app `5d1de1f`
- **Step 9 ① 슬라이스 A**: 기사 차량 일지 서버 동기화 — `ce08638`
- **Step 9 ① 슬라이스 C**: 매출탭에 기사 차량 데이터 연동(`ownerDataHooks` 훅) — 슬라이스 D와 함께 `3d7e0c8`
- **Step 9 ① 슬라이스 D**: 매출 "기사" 탭 개별 기사 드롭다운 — `3d7e0c8`
- **Step 9 ② 슬라이스 E/F**: 소속기사 로그인/연동 + 차량 등록 모달 기사연동 목업 — `192ebe6`
- **Step 9 ① 슬라이스 C-2 (개정)**: 소속기사 매출 ₩0 수정 + 차량관리 화면 소속기사 대응(배정차량 라벨·"+추가" 숨김) — react-app `06b9ca2` (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "슬라이스 C-2 (개정) 최종 [x] 확정".
- **Step 9 ① 슬라이스 C-3**: 매출제(%) 기사 정산액을 매출 손익 "기사 급여"에 반영(월급제와 합산, 펼치면 기사별 내역, 산재 차감) — react-app `eb1ad2e` (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 신규 `domain/driverRevenueShareExpense.js`. 상세 audit "슬라이스 C-3 최종 [x] 확정".
- **Step 9 ① 슬라이스 D-2**: 소속기사 매출 화면을 차주 카드 UI로 재작성(본인 정산 기준, 탭 없음, 순이익 라벨에 `(30%)`). 소속기사 일지 `main` 키 통일(입력·hydrate·매출 일치). — react-app `81ddbbe`+`f219ed5`+`a0037d7`, DB `0003_assigned_vehicle_commission.sql` (라이브 적용). 신규 `domain/driverSelfRevenue.js`, `OwnerMonthlyCards.jsx` `variant='driverSelf'`. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "슬라이스 D-2 최종 [x] 확정".
- **Step 9 ① 소속기사 지출 입력 1차**: 소속기사가 입력한 정비/주유가 서버 저장·hydrate돼 본인 매출 지출 카드에 유지(순이익엔 미반영 — Q1). — react-app `7e66d7d`. `hydrateEmployedDriver`에 비용 3종 조회 추가(`hydrate.js` 패턴 재사용). DB 불필요(RLS 이미 존재). (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "소속기사 지출 입력 — 1차 최종 [x] 확정".

## 아직 안 한 큰 것 (나중 Step)
- **Step 10**: 리포트 PDF / 알림 / 온보딩 / 고객센터
- **Step 11**: 모든 파일 200줄 강제 + JS→TS 전환
  ← **진짜 TypeScript는 여기서.** 지금은 JS + JSDoc 주석 타입.
  strict-inventory 타입 부채 약 1,333건은 Step 11 몫(지금 통과조건 아님).

## 알려진 이슈 (당장 안 고쳐도 되지만 잊으면 안 됨)
- **기사 초대 동시성(TOCTOU) 레이스**: DB 마이그레이션
  `react-app/supabase/migrations/0001_driver_links_idempotency_key.sql` 을 사용자가
  아직 Supabase에 적용 안 함. 적용 + 클라이언트 연결해야 완전히 닫힘.
  (참고: `0002_driver_invite_redeem.sql` 은 슬라이스 E 때 라이브 DB에 적용 완료 —
  `docs/archive/audit.md` "슬라이스 E §0 SQL 실행 완료".)
- **`0003` 마이그레이션**: 라이브 적용 완료(2026-09-04). 파일
  `react-app/supabase/migrations/0003_assigned_vehicle_commission.sql` 커밋됨(`f219ed5`).
- **비용 3종 테이블 RLS**: `fuel_records`/`maintenance_records`/`misc_expense_records` 모두
  연동 기사 전체 CRUD 정책 이미 존재(2026-09-04 진단 확인). 저장소 마이그레이션 파일엔
  없음(수동 or 미기록 마이그레이션) — 필요 시 `0004`로 스냅샷화 검토(급하지 않음).
- **MyPage 메뉴 가드 없음**(audit "문제 A"): 차주/기사 뱃지·기사연동관리가 무조건
  노출. Step 9 ②에서 처리.
- `npm run typecheck` → 현재 **0 에러**(정상).

## 저장소 상태
- **react-app**: `main` = origin/main = `7e66d7d` (소속기사 지출 1차 push·CI 초록). 미커밋 없음.
- **ubiquitous-parakeet**: `main`. 문서 갱신분 미커밋(2026-09-04: `AGENTS.md` 1행 문구·`STATUS.md`·`docs/report.md`·`docs/archive/audit.md` 보리/감시관 갱신).
- 정확한 HEAD·미커밋 범위는 세션 시작 시 `git log`/`git status`로 직접 확인 (AGENTS.md §0-6).

## 승인의 기준 (사용자가 `[x]` 확정 전에 확인할 것)
1. **GitHub Actions "CI / verify" 초록** — 매 push 자동으로 `npm test` + `typecheck` + `build` 재실행. 초록 아니면 `[x]` 불가.
2. **브라우저 실검증 완료** — `npm run dev`로 해당 화면 직접 조작. 사용자만 가능.
3. **감시관 §5 리뷰 통과** — 범위·타입꼼수·몰래증설·200줄·테스트진실성·문서정합·요구사항충족.
> ※ 1·2·3은 "승인에 필요한 증거". 최종 승인(=`[x]`)은 사용자의 결정 행위. 절차 정본은 AGENTS.md §3·§5.
