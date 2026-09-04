# STATUS — 현재 상태 한눈에

> **매 세션 이 파일부터 읽는다.** "지금 어디까지 왔나"의 정본.
> 상세 이력은 `docs/archive/audit.md`(동결, 필요할 때만 찾아봄).
> 갱신 규칙: 슬라이스 착수·완료 때마다 이 파일을 **덮어쓴다**(append 아님).
> 최종 갱신: 2026-09-04

---

## 지금 하는 일
**Step 9 ① 기사 연동 이관 완성 — "[기사이름] 기사 관리" 화면(바닐라 그대로 A안) + 서브 일지 메뉴 정리.**
- 슬라이스 B 1차(서브 일지 진입·달력 라우트)는 `84b5909`·`6109551`·`50f939b`·`11bc798`·`5dc3ab4` 커밋·푸시됨. 그 위에서 이어감.
- 보리 지시(2026-09-04): 미루거나 쪼개지 말고, 바닐라 "[기사이름] 기사 관리" 화면(프로필+월별 정산 요약+거래처별 계산서 카드 전부)을 **완전 이관**.
- **도메인 계산은 이미 다 이관됨**(`getLinkedDriverSettlementDetail`·`getLinkedDriverClientInvoiceGroups`·`flattenLinkedDriverTrips`; 기사 일지 데이터도 차주 hydrate가 `workLogs[ownerKey][번호판]`에 채움). **갭 = UI**: `LinkedDriverManagementPage`·`renderLinkedDriverMenu` 사이드 메뉴·`/app/drivers/:linkId` 라우트·`getAssignmentState` 헬퍼·`LinkedDriverClientsPage`(기사 전용 거래처 CRUD, 권한별).
- 착수지시서: **`docs/report.md` §1** (§1-A "[번호] 일지"를 연동 안 된 sub로 좁힘 + §1-B 기사 관리 화면).
- 작업자 §3에 (1)화면 200줄 분리설계 (2)`LinkedDriverClientsPage` 권한·저장 경로 (3)"정산·계산서 설정" 칩 대상 (4)사이드 메뉴 2종 UX (5)wc-l 실측 → 감시관 확인 후 구현.

## 다음 할 일 (순서대로)
1. **Step 9 ① 기사 연동 이관 완성** (위) — 끝나면 Step 9 ① 전체 `[x]`.
2. **Step 9 ②** — 소속기사 로그인 화면 완성 (employerLink, RLS 신규; MyPage 메뉴 가드 = audit "문제 A" — 계정 분화 판별 근거 조사 필요).
   → 위 1·2가 끝나야 Step 9 전체 `[x]` 확정 가능

### 후속 nit (급하지 않음)
- 소속기사 지출 카드에 값이 뜨는데 순이익은 안 줄어듦 → 브라우저에서 헷갈리는지 보리 확인, 필요 시 "차주 부담(순이익 미반영)" 문구 1줄.
- `fetchExpensesForAssignedVehicle` 단위 테스트 없음 — 다음에 `hydrateEmployedDriver` 건드릴 때 추가.

## 백로그 (이관 끝난 뒤 — 보리 지시)
- **다중 배정 차량** — 소속기사 차량 2대+ 배정 시 첫 차량만 집계(`remapEmployedDriverWorkLogs`/`fetchExpensesForAssignedVehicle`/`fetchOwnerDriverExpenses` TODO).
- 소속기사 매출 "운송료" 표시: 전체+정산라인(현재) vs 본인 몫만 — 차주가 기사 등록 시 토글 선택.
- 소속기사 매출 운송료 표시 라인을 배정기간으로 필터할지(현재 미필터 — 차주 [기사] 탭과는 일치).

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
- **Step 9 ① 소속기사 지출 입력 2차**: 소속기사 비용이 차주 매출 화면 [전체손익]+[기사] 탭 지출에도 반영([차주] 탭 제외). 별도 읽기전용 버킷 `driverExpenses`(메모리 전용). — react-app `0b089b0`. 신규 `domain/financeOwnerExpenseSweep.js`(sweep 분리, `financeOwnerDetail` 203→162)·`lib/hydrateOwnerDriverExpenses.js`. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "소속기사 지출 입력 — 2차 최종 [x] 확정".
- **Step 9 ① 매출제 정산액 차주↔기사 화면 일치**: 기사 "순이익"도 배정기간(link) 필터·`getMonthlyDriverTotals` 기준으로 → 차주 "기사 급여"와 동일. D-2 §6-J #1 되돌림. — react-app `401d9d3`. `driverSelfRevenue.js` 매출제 분기 ~4줄 + 두 화면 일치 검증 테스트. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "매출제 정산액 차주↔기사 화면 일치 최종 [x] 확정".

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
- **react-app**: `main` = origin/main = `401d9d3` (매출제 정산 일치 push·CI 초록). 미커밋 없음.
- **ubiquitous-parakeet**: `main` `8a60a10`(미푸시) + 문서 갱신분 미커밋(`STATUS.md`·`docs/report.md`·`docs/archive/audit.md`).
- 정확한 HEAD·미커밋 범위는 세션 시작 시 `git log`/`git status`로 직접 확인 (AGENTS.md §0-6).

## 승인의 기준 (사용자가 `[x]` 확정 전에 확인할 것)
1. **GitHub Actions "CI / verify" 초록** — 매 push 자동으로 `npm test` + `typecheck` + `build` 재실행. 초록 아니면 `[x]` 불가.
2. **브라우저 실검증 완료** — `npm run dev`로 해당 화면 직접 조작. 사용자만 가능.
3. **감시관 §5 리뷰 통과** — 범위·타입꼼수·몰래증설·200줄·테스트진실성·문서정합·요구사항충족.
> ※ 1·2·3은 "승인에 필요한 증거". 최종 승인(=`[x]`)은 사용자의 결정 행위. 절차 정본은 AGENTS.md §3·§5.
