# STATUS — 현재 상태 한눈에

> **매 세션 이 파일부터 읽는다.** "지금 어디까지 왔나"의 정본.
> 상세 이력은 `docs/archive/audit.md`(동결, 필요할 때만 찾아봄).
> 갱신 규칙: 슬라이스 착수·완료 때마다 이 파일을 **덮어쓴다**(append 아님).
> 최종 갱신: 2026-09-05

---

## 우선순위 원칙 (보리 지시, 2026-09-05)
**"완벽한 react 이관"이 최우선.** 매출제/월급제 전환(Step 9-A~D)은 방향성이 중요해 예외적으로
이관 중간에 끼워 넣은 새 기능이었지만, 앞으로는 **원본(`ubiquitous-parakeet`)에 있던 기능을
react-app으로 옮기는 작업(Step 10·11, 이관 로드맵 본편)을 먼저 끝낸다.** 새 방향/기능 강화
아이디어(토글, 역할전환 UI 등 원본에도 없던 것)는 이관과 무관하므로 **"이관 완료 후
진행사항"**으로 따로 모아두고, 이관 완료 전까지는 착수하지 않는다. 단, 이관 완료에 필요한
버그 수정·정합성 문제는 즉시 처리(위 슬라이스들처럼).

## 지금 하는 일
**회원탈퇴 기능 구현 (필수, 착수 2026-09-05).**
**Step 10(전체) `[x]` 완료** — 1차(백업+알림)~5차(고객센터) 전부, react-app `253198d`까지
CI 초록·보리 `[x]`. 회원탈퇴는 "고객센터"와 별개지만 보리가 필수로 지정한 기능.

**설계**: 원본 `requestWithdrawal`/`executeAccountWithdrawal`(2단계 확인 →
`delete_own_account` RPC → 성공 확인 후에만 로그아웃+정리) 이식. **새 로그아웃/정리
로직을 만들지 않고 기존 `App.jsx`의 `handleLogout`(`onGoAuth` prop)을 그대로 재사용** —
RPC 성공 후에만 호출, 실패하면 로컬/세션 절대 안 건드림. 확인 모달도 기존
`ConfirmModal.jsx`를 2번 순차로 씀(신규 모달 없음). 착수지시서 = `docs/report.md` §1
(리셋됨). 대상 3파일(`lib/accountWithdrawal.js` 신규·`PersonalInfoPage.jsx`·테스트).
DB 변경 없음(기존 RPC 호출만). 작업자 구현 대기.

## 다음 할 일 (순서대로 — 이관 로드맵 본편)
1. **회원탈퇴 기능 구현** (위) — 작업자 구현 대기.
2. Step 11 — 200줄 강제 + JS→TS 전환 (이관 로드맵 마지막 단계).

### 후속 nit (급하지 않음)
- **리포트 "세부 보고서(거래처별)" 뷰 자체가 없음** — 원본엔 월간 요약 외에 거래처별 세부
  내역 뷰(`isDetailReportView`)가 있는데 react-app `report.js`/`ReportPage.jsx`엔 이
  개념 자체가 없음(2026-09-05 Step 10 3차 착수 조사로 발견). 원본에 있던 기능이라 "이관
  완료 후"가 아니라 이관 우선순위 대상 — Step 10 PDF 슬라이스와는 별개로 이 뷰 자체를
  새로 만들지 여부·순서는 보리 결정 대기.

## 이관 완료 후 진행사항 (원본에 없던 새 방향 — 이관 끝난 뒤에만 착수)
- **이중역할(기사+차주 동시)·다단계 역할전환 UI** — 원본에 없는 개념(react-app에서 처음
  나온 이슈). 2026-09-03 슬라이스 E 때 감시관이 발견: DB상 한 계정이 기사이면서 동시에
  차주(자기 하위기사를 둠)인 것 자체는 막혀 있지 않은데, `App.jsx` ownerKey 해석("기사면
  무조건 연동된 차주만 본다")이 단순 설계라 그런 계정이 로그인하면 자기 자신의 차주 데이터
  (자기 차량·자기 하위기사)가 화면에서 안 보임. 보리 결정(당시): "이번은 단순하게" — 역할전환
  UI(마이페이지 "차주로 보기/기사로 보기") 제외, 필요해지면 별도 슬라이스. 상세 audit
  "슬라이스 E 결정 — 이중역할(기사+차주 동시) 범위 확인".
- **소속기사 매출 "운송료" 표시 토글**: 전체+정산라인(현재) vs 본인 몫만 — 차주가 기사 등록
  시 선택하는 UX 개선 아이디어(원본엔 없음).
- **소속기사 매출 운송료 표시 라인 배정기간 필터 여부**(현재 미필터 — 차주 [기사] 탭과는
  일치하니 당장 불일치는 아님).
- **Billing(정산·계산서 설정, net/gross) 삭제 또는 "공제 후" 고정** — 보리가 아직 고민
  중(2026-09-05 지시로 일단 그대로 둠). 원본 기능 자체는 이미 이관됨, 이건 "구조를 더
  단순화할지"의 정책 결정이라 이관 완료 여부와 무관.
- **`driver_direct`(기사 직접 정산) 관련 코드 정리** — 매출제/월급제 도입(Step 9-A~D, 새
  방향)으로 생긴 죽은 코드 정리. `LinkedDriverDirectClientsList.jsx`·`lib/fetchDriverOwnClients.js`·
  `LinkedDriverClientsPage.jsx`의 `isDriverDirect` 분기. 순수 코드 정리, 급하지 않음.
- **다중 배정 차량(집계 TODO)** — 소속기사 차량 2대+ 배정 시 첫 차량만 집계
  (`remapEmployedDriverWorkLogs`/`fetchExpensesForAssignedVehicle`/`fetchOwnerDriverExpenses`
  TODO). 2026-09-05부터 신규 배정 자체는 `upsertDriver`가 막아서(완료 목록 참고) 새로 이
  상태가 생기진 않음 — 기존 데이터에도 없음(보리 확인) — 사실상 닫힌 문제, 참고용으로만 유지.

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
- **Step 9 ① 기사 연동 이관 슬라이스 A**: 연동 기사 관리 화면(조회 전용 — 프로필·월 정산 요약·거래처별 세금계산서) + 사이드 메뉴 연동 기사 항목 + "[번호] 일지"=미연동 sub만(§1-A) + 기사 연동 관리 "기록 조회" 진입. 칩은 토스트(Billing·거래처는 슬라이스 B). — react-app `24f49aa`+`c041f6b`. 신규 `components/drivers/` 폴더(`LinkedDriverManagementPage.jsx`·`linkedDriverLink.js`·`linked-driver.css`), `domain/drivers.js` `getAssignmentState`+`// @ts-check`. SideMenu 226줄(§6 응집도 규칙 ≤250). 쓰기 경로 0. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "슬라이스 A ... 최종 [x] 확정".
- **Step 9 ① 기사 연동 이관 슬라이스 B**: 기사 전용 거래처 CRUD(권한별: `driver_direct`=조회/그 외=차주 CRUD) + Billing 설정(`driverInvoiceBasis` net/gross, 설정 저장 탈락 버그도 해소) + 일반 거래처 3곳 숨김 필터 — react-app `945dfdf`. 신규 `LinkedDriverClientsPage.jsx`·`LinkedDriverDirectClientsList.jsx`·`fetchDriverOwnClients.js`·`BillingSettingsPage.jsx`. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-05). 상세 audit "슬라이스 B ... 최종 [x] 확정"(작업자 `.md` 자가수정 프로세스 이탈 건도 기록됨).
- **Step 9 ① 기사 연동 이관 슬라이스 C (개정)**: 소속기사↔차주 거래처 상호 편집(등록·수정·삭제 하나의 레코드 공유) — react-app `0f6a18a`+`facdb7e`, DB `0004_owner_scoped_clients_shared_write.sql`(라이브 적용, 보리 직접 실행). 핵심: `buildClientRow`가 `user_id`에 로그인자 자신 대신 `ownerKey`(연동 차주 id) 사용 → 기존 CRUD 재사용. `hydrateEmployedDriver.js`가 이제 `clients`를 실제로 hydrate. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-05). 상세 audit "슬라이스 C (개정) ... 최종 [x] 확정".
- **Step 9 ① 기사 연동 이관 — 전체 `[x]`** (2026-09-05, 슬라이스 A+B+C 완료).
- **Step 9 ② 1차 — 계정별 화면 권한 정리**: 마이페이지 "차주"/"소속 기사" 뱃지 삭제, 사이드 메뉴 정적 "기사 연동 관리" 버튼 삭제(동적 연동 기사 목록은 유지), 소속기사 차량 관리 조회전용(수정/삭제 버튼 숨김). — react-app `d037979`. 신규 `accountPermissionUi.test.js`(3케이스, 실제 DOM 렌더 검증). (CI 초록 확인·브라우저 통과·보리 `[x]` 2026-09-05). 상세 `docs/report.md` §4~5(작업자가 SideMenu 줄수 오기재한 건도 기록 — 재발 방지 지시).
- **`fetchExpensesForAssignedVehicle` 단위 테스트 보강**: 소속기사 배정차량 비용 3종 조회(정상/배정 0대) + vehicle_id 필터 실제값 검증. — react-app `fcdc953`+`90689a7`(수정 1회, 감시관 §5 리뷰에서 필터 미검증 발견 → 수정 지시 → 탐지력 직접 증명). (CI 초록·보리 `[x]` 2026-09-05). ⚠️ 이 슬라이스 검증 중 감시관이 실수로 `git push` 직접 실행(AGENTS §3 위반, 재발 방지 기록됨). 상세 `docs/report.md` §4~6.
- **한 기사, 차량 2대 이상 동시 배정 금지**: `domain/drivers.js` `upsertDriver`에 전화번호 기준 활성 배정 중복 체크 추가(148줄) + `drivers-cloud.test.js` 3케이스(172줄). — react-app `f1d25c6`. (CI 초록 run `33947661550`·보리 `[x]` 2026-09-05). 신규 저장소·DB 없음, 기존 "같은 차량은 한 기사에게만" 체크와 대칭 설계. 상세 `docs/report.md` §4~5.
- **Step 10 1차 — 게스트 백업 내보내기/가져오기 + 백업 권장 알림**: 신규 `lib/guestBackup.js`(기존 `readPersistDomain`/`readLogWorkData`/`replaceOwnerState` 재사용, 신규 저장소 없음) + `AppSettingsPage.jsx` 백업 섹션(게스트 전용) + `notifications.js` 백업 권장 알림(게스트 전용, 14일 기준) + 테스트 3개. — react-app `8d0ea50`+`d988b14`+`0987658`(감시관 §5 리뷰에서 `any` 타입 2건 발견·수정 지시 2회, 두 번째는 감시관 자체 확인 오류 정정 포함). (CI 초록 run `33950653110`·브라우저 통과·보리 `[x]` 2026-09-05). `dismissedNotifications`/`workDataDeletedDates`는 가져오기로 복원 안 됨(기존 `replaceOwnerState` 구조적 한계, 핵심 데이터엔 영향 없음 — 알려진 이슈로 기록). 상세 `docs/report.md` §4~9.
- **Step 10 2차 — 오늘일지 알림 원본 사양 맞춤**: "오늘 운행일지 미입력" 알림에 저녁 6시 이후에만 뜨는 시간 게이트 + `isOff`/`callDetails`/`fixedCount` 셋 다 없으면 여전히 미입력으로 보는 판정(원본 `hasEntry` 그대로) 추가. — react-app `5d564b1`(`notifications.js` 119줄+`notifications.test.js` 124줄, `mock.timers`로 시각 결정론적 통제). (CI 초록 run `33951700869`·감시관이 프로덕션 코드 버그 주입해 탐지력 직접 증명·브라우저 통과(저녁 6시 이후 실제 확인)·보리 `[x]` 2026-09-05). 상세 `docs/archive/audit.md` "Step 10 2차 — 오늘일지 알림 원본 사양 맞춤".
- **Step 10 3차 — 리포트 PDF 저장**: `ReportPage.jsx`에 PDF 다운로드 버튼(html2pdf.js, 버튼 클릭 시 동적 import로 별도 청크 976KB 분리), `lib/report.js`에 `buildReportFileName` 순수함수 분리, `.pdf-export-mode` 인쇄용 CSS(`side-menu.css`), 실패 시 토스트. — react-app `40c5550`(7 files, `AppShellRoutes.jsx` 1줄 배선 포함). "세부 보고서(거래처별)" 뷰는 원본에 있지만 react-app 데이터 모델에 없어 스코프 밖(백로그 등재). (CI 초록 run `33957448600`·브라우저 통과(보리 본인 터미널)·보리 `[x]` 2026-09-05). 상세 `docs/report.md` §4.
- **Step 10 4차 — 온보딩 완료 저장 배선 수정**: `App.jsx`의 `onFinish`가 `wizard` 인자를 안 받아 온보딩 4단계 답변(설정·차량)이 전부 버려지던 버그 수정. 신규 `lib/onboardingFinish.js`(`buildOnboardingSettingsPatch`+`applyOnboardingWizard`, 기존 `savePracticeSettings`/`requestVehicleSave` 재사용). 정산방식 스텝은 매출제/월급제로 대체된 옛 개념이라 이번엔 추가 안 함(보리 결정). — react-app `6ba08d6`. (CI 초록 run `33958459077`·감시관이 프로덕션 코드 버그 주입해 탐지력 직접 증명·브라우저 통과·보리 `[x]` 2026-09-05). 상세 `docs/archive/audit.md` "Step 10 4차 — 온보딩 완료 저장 배선 수정".
- **Step 10 4차 후속 — 온보딩 1단계 파렛트 토글 삭제**: 저장 안 되는 죽은 UI 삭제(원본부터 있던 오류, 보리가 4차 브라우저 검증 중 발견). — react-app `a17220a`(1 file, +1/-15). (CI 초록 run `33958986627`·보리 `[x]` 2026-09-05). 상세 `docs/archive/audit.md` "Step 10 4차 후속".
- **Step 10 5-1 — 고객센터 진입점 + FAQ 탭**: 신규 `CustomerCenterPage.jsx`(FAQ 4문항 원본 기반 각색, 1:1문의·내문의확인 placeholder만), `/app/support` 라우트, 사이드메뉴 진입 항목. — react-app `bf147c6`(6 files). (CI 초록 run `33959778962`·보리 `[x]` 2026-09-05). 상세 `docs/archive/audit.md` "Step 10 5-1".
- **Step 10 5-2 — 고객센터 1:1 문의 작성**: 로그인 세션만 Fail-Fast로 `support_inquiries` insert(로컬 캐시 없음), 게스트는 폼 미마운트+로그인 안내. — react-app `6a44600`(6 files, `assertCloudWriteReady()` 추가로 지시보다 더 안전). (CI 초록 run `33960442746`·보리 `[x]` 2026-09-05). 상세 `docs/archive/audit.md` "Step 10 5-2".
- **Step 10 5-3 — 고객센터 나의 문의·건의 확인**: `fetchMyInquiries`(로컬 캐시 없이 탭마다 직접 조회, 외부 응답 필드별 런타임 검증), 답변 대기/완료 배지. — react-app `253198d`(5 files, `CustomerCenterPage.jsx` 230줄 §6 응집 사유주석 포함). (CI 초록 run `33961129711`·보리 `[x]` 2026-09-05). **Step 10 전체 완료**. 상세 `docs/archive/audit.md` "Step 10 5-3".

## 아직 안 한 큰 것 (나중 Step)
- **Step 10**: 리포트 PDF / 알림 / 온보딩 / 고객센터
- **Step 11**: 모든 파일 200줄 강제 + JS→TS 전환
  ← **진짜 TypeScript는 여기서.** 지금은 JS + JSDoc 주석 타입.
  strict-inventory 타입 부채 약 1,333건은 Step 11 몫(지금 통과조건 아님).

## 알려진 이슈 (당장 안 고쳐도 되지만 잊으면 안 됨)
- ~~**기사 초대 동시성(TOCTOU) 레이스**: `0001_driver_links_idempotency_key.sql` 미적용~~ →
  **정정(2026-09-05)**: 낡은 기록이었음. 보리가 Supabase에서 진단 쿼리 3종(컬럼·유니크
  인덱스·함수) 직접 실행 — 전부 `true`, **이미 적용·검증된 상태**(2026-09-01 슬라이스 A 때
  적용된 것으로 보이며 문서만 안 지워져 있었음). 클라이언트(`driverLinkRpc.js`)도 이미
  연결돼 있음 — 완전히 닫힌 상태, 재작업 불필요.
  (참고: `0002_driver_invite_redeem.sql` 도 슬라이스 E 때 라이브 DB에 적용 완료 —
  `docs/archive/audit.md` "슬라이스 E §0 SQL 실행 완료".)
- **`0003` 마이그레이션**: 라이브 적용 완료(2026-09-04). 파일
  `react-app/supabase/migrations/0003_assigned_vehicle_commission.sql` 커밋됨(`f219ed5`).
- **비용 3종 테이블 RLS**: `fuel_records`/`maintenance_records`/`misc_expense_records` 모두
  연동 기사 전체 CRUD 정책 이미 존재(2026-09-04 진단 확인). 저장소 마이그레이션 파일엔
  없음(수동 or 미기록 마이그레이션) — 필요 시 `0005`로 스냅샷화 검토(급하지 않음, `0004`는
  슬라이스 C의 clients 쓰기 정책으로 이미 씀).
- ~~**MyPage 메뉴 가드 없음**(audit "문제 A")~~ → Step 9 ② 1차에서 해소(뱃지·정적 기사연동관리 버튼 삭제, 2026-09-05).
- **게스트 백업 가져오기가 `dismissedNotifications`·`workDataDeletedDates` 복원 안 함** —
  `store/owner-state.js`의 `OwnerSnapshot`/`replaceOwnerState`가 이 두 도메인을 아예
  지원 안 해서(2026-09-05 Step 10 1차 리뷰로 확인). 차량·거래처·기사·정산·일지 등 핵심
  데이터엔 영향 없음(정상 복원) — 영향은 "복원 후 예전에 닫았던 알림이 다시 뜰 수 있다"
  정도. 필요해지면 `OwnerSnapshot` 확장 검토(지금은 급하지 않음).
- `npm run typecheck` → 현재 **0 에러**(정상).

## 저장소 상태
- **react-app**: `main` = origin/main = `253198d`(Step 10 5-3: 고객센터 나의 문의 확인, CI 초록·보리 `[x]` — Step 10 전체 완료). 미커밋 없음(작업트리 클린).
- **ubiquitous-parakeet**: `main` `97813a6`(미푸시) + 이번 세션 문서 갱신분 미커밋(`STATUS.md`·`docs/report.md`·`docs/archive/audit.md` — Step 9 ① 전체 `[x]` 기록).
- 정확한 HEAD·미커밋 범위는 세션 시작 시 `git log`/`git status`로 직접 확인 (AGENTS.md §0-6).

## 승인의 기준 (사용자가 `[x]` 확정 전에 확인할 것)
1. **GitHub Actions "CI / verify" 초록** — 매 push 자동으로 `npm test` + `typecheck` + `build` 재실행. 초록 아니면 `[x]` 불가.
2. **브라우저 실검증 완료** — `npm run dev`로 해당 화면 직접 조작. 사용자만 가능.
3. **감시관 §5 리뷰 통과** — 범위·타입꼼수·몰래증설·200줄·테스트진실성·문서정합·요구사항충족.
> ※ 1·2·3은 "승인에 필요한 증거". 최종 승인(=`[x]`)은 사용자의 결정 행위. 절차 정본은 AGENTS.md §3·§5.
