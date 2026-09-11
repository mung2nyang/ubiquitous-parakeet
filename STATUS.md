# STATUS — 현재 상태 한눈에

> **매 세션 이 파일부터 읽는다.** "지금 어디까지 왔나"의 정본.
> **갱신 규칙(엄수): 이 파일은 슬라이스마다 관련 절을 고쳐 쓴다 — append 금지.**
> "이전 최종 갱신 …" 을 위에 쌓지 마라. "완료" 절은 한 줄 요약만 추가하고,
> 슬라이스 상세는 `docs/report.md`(현재 슬라이스) / `docs/archive/`(끝난 것)에만 둔다.
> 이 파일이 150줄을 넘으면 오래된 "완료" 항목을 archive로 옮기고 요약만 남긴다.
> 직전 스냅샷: `docs/archive/status-snapshot-2026-09-10.md` (1093줄까지 커졌던 것 정리).
> 최종 갱신: 2026-09-11

---

## 우선순위 원칙 (보리 지시, 2026-09-05)

**"완벽한 react 이관"이 최우선.** 원본(`ubiquitous-parakeet`)에 있던 기능을 react-app으로
옮기는 작업을 먼저 끝낸다. 원본에 없던 새 방향·기능 강화 아이디어(토글, 역할전환 UI 등)는
아래 "이관 완료 후 진행사항"으로 모아두고 이관 완료 전엔 착수하지 않는다.
단, 이관 완료에 필요한 버그 수정·정합성 문제는 즉시 처리.

## 지금 하는 일

**§1(일일운행) 마무리 중 — 주말 전 정리, 다음 세션 진행 순서 확정.**
(보리 2026-09-11: 오늘은 여기까지, 주말 지나고 아래 순서대로 계속.)

**§1 남은 순서(F-1 → F-2 → E → D):**
1. **F-1. 부가세 해제 글자 굵기** `[~]` — `call-detail-form.css` 1줄,
   착수지시서 완료·승인 대기.
2. **F-2. 다크모드 드롭다운(`:-webkit-autofill`) 입력창 밝아짐** `[~]` —
   `shared-controls.css` 1개 파일, 착수지시서 완료·승인 대기.
3. **E. 정비/주유/기타 패널** `[ ]` — **착수 전 보리가 나머지 항목부터
   설명 필요**(지금 3개는 목록 미완성). 다 모이면 슬라이스 재분할.
4. **D. 시간입력 위젯(`app-temporal` 대체)** `[ ]` — 새 공용 컴포넌트
   작업이라 한 슬라이스로 안 끝남, §1 중 제일 크고 마지막. 착수 전 별도
   하위 슬라이스 계획 필요.

상세·근거는 `docs/ui-comparison-report.md` §1, 착수지시서는 `docs/report.md`.

## 다음 할 일

1. §1 전부 끝나면 §2~§14(보리가 직접 작성한 화면별 대조 기록)를 순차로.
   각 화면 = 대조 + 그 화면 전용 CSS 분리 한 슬라이스.

### AI 관찰 (미확인 — 실행 지시 아님)

- **홈 하단 "{이름}님 · 달력에 횟수 기록" 문구 고정 표시 의심** — AI가 코드만
  보고 떠올림, 보리 확인 전. `inputMode==='fare'` 계정이면 "횟수 기록" 표시가
  실제 설정과 안 맞을 수 있음. 오판 가능성 있어 보리 실화면 확인 전엔 등재 안 함.

### 후속 nit (확인된 것만)

- **리포트 화면이 메인 차량 전용**[확인 2026-09-07] — `report` 라우트가 `logId` 고정.
  원본엔 있는 서브차량(소속기사) 리포트·기사 수수료 줄이 react-app엔 없음. 범위 커서
  별도 상의 필요.
- **`receivables/*` 뒤로가기 `?back=` 유실**[문서화 2026-09-07] — `ReceivablesDetailPage`가
  `navigate('/app/receivables')` 시 `?back=` 안 들고 감. 드문 경로라 미루는 중.
- **사이드메뉴 "{번호} 관리" 톱니바퀴/세부입력 토글 메인·서브 분리**[확인 2026-09-09,
  `ui-comparison-report.md` §1-1 2번] — 원본은 메인·서브 차량별 세부입력 토글 6종을
  각각 갖는데 react-app은 공유. 미연동 서브차량 일지 화면 작업 때 함께.
### 보류 (보리 결정 대기, 급하지 않음)

1. **`.test.js` 나머지 strict 진단** — migration 원칙 "증가 금지"는 지킴, "전부 수정"은 안 함.
2. **`.ts`/`.tsx` 확장자 실전환** — JSDoc 타입 → 실제 TS. 보리가 "별도 단계"로 미뤄둠(2026-09-05).

## 이관 완료 후 진행사항 (원본에 없던 새 방향 — 이관 끝난 뒤에만)

- 이중역할(기사+차주)·역할전환 UI (2026-09-03 슬라이스 E 때 "이번은 단순하게"로 보류)
- 소속기사 매출 "운송료" 표시 토글 / 배정기간 필터 여부
- Billing(net/gross) 삭제 or "공제 후" 고정 — 보리 고민 중(원본 기능 자체는 이관됨)
- `driver_direct` 관련 죽은 코드 정리 (매출제/월급제 도입으로 도달 불가)
- 다중 배정 차량 집계 — `upsertDriver`가 신규 배정 자체를 막아 사실상 닫힌 문제(참고용)
- 미룸("이관 후 UI 정리"): 테마 저장 위치, 서브차량 설정 배치, 차량관리 라벨, 기사연동관리 UI 패턴

## 완료 (커밋·푸시됨 — 상세는 archive)

- **일일운행 인라인 폼 아코디언 슬라이드 애니메이션 — 전부 완료 1~6차**
  (콜상세·정비/주유/기타 열기·닫기·종류선택 전환 전부) —
  react-app `67762ff`(min-content→1fr) → `d575247`(닫기 forceInstant +
  열기 0.4s) → `a019e68`(닫기 opacity 페이드) → `355b865`(열기 클립 복원) →
  `9bb0b53`(종류선택→폼 재오픈) → `6c5ba8d`(닫기 시 이중 조건부 렌더링
  버그 수정). 보리 브라우저 확인 완료·푸시됨(2026-09-11). `ui-comparison-report.md`
  §1-D 정정 완료(원래 "이미 구현됨"으로 오판했던 항목). 상세
  `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`.
- **"부가세 해제" 레이블 16px → `var(--fs-2)`** — react-app `3ae7db9`.
  `call-detail-form.css`에 `.call-vat-row > label:first-child` 규칙 추가.
  푸시됨. 보리 브라우저 확인 완료 기록은 착수지시서에 있음(2026-09-11).
- **`LinkedDriverClientsPage` 스코프 키 출처 — 종결(코드 변경 없음)**
  [재확인 2026-09-11] — 콜상세·`OwnerScopedClientsView`가 쓰는
  `get_assigned_vehicle_summary` RPC와 `LinkedDriverClientsPage`가 쓰는
  `driver.vehicleNumber` 둘 다 정본은 같은 `driver_links.vehicle_id`(서버
  RPC 조인 vs owner hydrate 클라이언트 조인 — 계산 위치만 다름) 코드
  추적으로 확인. 구조적 어긋남 지점 없음 — 버그 아님. 상세
  `docs/report.md`. 보리 `[x]` 2026-09-11.
- **연동 기사 본인 로그의 거래처 스코프 불일치 수정** — react-app `76d9829`.
  콜상세 폼이 쓰는 `logId`(workData용)와 "거래처 스코프 키"를 분리하고,
  하이드레이트 쿼리도 배정 차량(`scopedToVehicleNumber`)으로 좁힘 — 5개
  파일 지시대로. CI green. 보리 `[x]` 2026-09-11. 이어서 보리 요청으로
  차주/연동기사/미연동기사 3그룹의 거래처 자동완성 스코프가 서로 안
  섞이는지 코드 전수 교차검증[확인 2026-09-11] — 세 경로(차주 본인
  `logId='main'`→무스코프, 미연동 서브차량 `logId`=차량번호,
  연동기사 본인 `clientScopeKey`=배정 차량번호) 모두 읽기·쓰기 스코프
  키가 일치해 섞임 없음 확인. 유일한 발견은 위 "후속 nit"의 전제 기반
  항목(버그 아님). 상세 `docs/archive/guest-data-loss-and-client-scope-2026-09-11.md`.
- **B그룹 ① 산재보험료 필드** — react-app `1de2537`. 보리 `[x]` 2026-09-11.
- **B그룹 ② 즐겨찾기 칩(상차지/하차지 빈도·고정)** — react-app `6b4a9b7`
  + 200줄 주석 수정 `f55815d`. 보리 `[x]` 2026-09-11(로그인 계정으로 직접
  브라우저 검증 완료).
- **B그룹 ③ 거래처 "+추가" 버튼(원안) — 완전 폐기(보리 결정, 2026-09-11).**
  삭제 지시난 "계산서 처리 방식" 가짜 개념 기반 + `sot.md` 기승인 결정과
  상충. B그룹은 ①②로 종료.
- **콜상세 "거래처 +추가" 버튼(진짜 이관 누락, ③과 별개)** — react-app
  `0db5bde`. 보리 `[x]` 2026-09-11(로그인 계정으로 직접 브라우저 검증
  완료). 메인/미연동 서브차량 스코프 둘 다 확인됨.
  상세 전부 `docs/archive/b-group-report-2026-09-11.md`.
- **게스트 데이터 유실 버그 — 근본 원인 수정** — react-app `0b9358d`.
  `insuranceFee` 등 통화 필드가 빈 문자열이면 스키마 검증 실패 → owner
  Store 초기화 전체가 무산돼 앱이 "빈 계정"처럼 보이던 버그(디스크
  `localStorage`는 안 지워짐). `isValidCurrencyAmount`가 빈 값을 유효(0)로
  인정하도록 수정. 보리 `[x]` 2026-09-11(AI 배포앱 실측 + 보리 확인).
  상세 `docs/archive/guest-data-loss-and-client-scope-2026-09-11.md`.
- **Step 0~10 전부 완료·푸시.** Step 9(매출제/월급제·기사연동), Step 10(백업·알림·PDF·
  온보딩·고객센터), 회원탈퇴 등. 슬라이스별 상세: `docs/archive/audit.md`,
  `docs/archive/status-snapshot-2026-09-10.md`.
- **Step 11 — 200줄 강제**: 완료(슬라이스 1~4, 2026-09-05).
- **Step 11 — JS→TS(JSDoc 방식, `.js` 유지)**: **프로덕션 전체 완료(슬라이스 1~25),
  strict-inventory 775→346.** 잔여 346 = testSupport 1 + `.test.js` 나머지(위 "보류" 1번).
  실제 `.ts` 확장자 전환은 미착수(위 "보류" 2번).
- **미연동 서브차량 데이터 분리** — 4단계(①진입점 ②③거래처·콜상세 ④정비/주유/기타)
  + 코드정리 §12 전부 `[x]` (2026-09-09). 도메인 정의 `docs/sot.md` §0.
- **사이드메뉴 UI 정리(§1-1)** — 1·3번 + 검증 규칙(§14~16) `[x]` (2026-09-09).
  2번(토글 분리)은 위 "후속 nit"으로 이동.
- **공용 헤더 `PageHeader` 통일** — 22개 화면 + 홈 캘린더 전체 `[x]`.
  이력 `docs/archive/pageheader-unification.md`.
- **`side-menu.css` 다이어트** — 공용화(shared-controls/modal-form) + 죽은 클래스 제거 `[x]`.
  이력 `docs/archive/side-menu-css-diet.md`.
- **`main-calendar.css` 책임 분리** — 1~10차 전체 `[x]` (2026-09-09).
  이력 `docs/archive/main-calendar-css-split.md`.
- **`ui-comparison-report.md` §2 마이페이지** — 톱니바퀴 SVG 오타 수정 + `mypage.css` 분리.
  react-app `8c1ccc7`. 보리 `[x]` 2026-09-10. 상세 `docs/archive/report-snapshot-2026-09-10.md` §1.
- **`ui-comparison-report.md` §3 매출** — `won()` -0원 보존 + `revenue.css` 분리.
  react-app `1a5d702`. 보리 `[x]` 2026-09-10. 상세 `docs/archive/report-snapshot-2026-09-10.md` §2.
- **`ui-comparison-report.md` §1-A 일일운행(콜상세 폼 CSS 4건)** — 헤더 날짜·
  포커스 테두리·계기판 km 위치·레이블 2단계 크기. react-app `c6c831b`. 보리
  `[x]` 2026-09-10. 상세 `docs/archive/report-snapshot-2026-09-10.md` §4.
- **일일운행 2부 — 2중 스크롤 + 콜상세 폼 카드 이탈** — 카드 이탈은 JSX
  구조 수정(`796bea6`)으로 해결. 2중 스크롤은 1차 수정(`796bea6`, 부모 패딩만큼
  높이 보정)으로 바깥 넘침은 없앴으나 스크롤바 위치가 다른 화면과 달라 보리가
  재지적 → `work-log-page` 자체 스크롤을 완전히 제거하고 문서 스크롤로 통일하는
  근본 수정(`387e3c3`)으로 재해결. react-app `[x]` 2026-09-10. 상세
  `docs/archive/day-log-part2-scroll-card-bugs.md`.
- **홈 캘린더 UI·이관 계획 ②③** — 문자문구·공지·PDF저장·리포트 세부내역서·엑셀저장·
  월간정산 위젯 통일 등 전부 `[x]`. 상세 `docs/archive/status-snapshot-2026-09-10.md` "완료" 절.

## 알려진 이슈 (안 고쳐도 되지만 잊으면 안 됨)

- **`react-app/src/components/mypage.css`에 죽은 CSS 규칙 2개 보존돼 있음**
  (`.mypage-header-spacer`, `.mypage-role-pill` — 둘 다 JSX 소비처 0,
  `grep` 확인됨). 출처: 2026-09-10 §2 마이페이지 CSS 분리 때
  `side-menu.css` 1387~1605줄을 그대로 옮기며 "삭제 안 하고 보존 이동"
  관례에 따라 죽은 채로 같이 옮김(상세
  `docs/archive/report-snapshot-2026-09-10.md`). 안 급함 — **§1~§14 UI
  대조·이관이 전부 끝난 뒤 한꺼번에 죽은 CSS 정리할 때 같이 처리** (보리
  개인 메모로 이미 추적 중, 여기 동기화만).
- **정비/주유/기타 Supabase 동기화가 항상 "메인" 차량 `vehicle_id`로만 저장**
  (`lib/syncExpenseRecords.js` 51·88·125 / `lib/hydrate.js` 142-144). DB row 정합성만의
  문제라 화면엔 영향 없음 — 서브차량 sync 루프 고칠 때 같이 처리(백로그).
- **게스트 백업 가져오기가 `dismissedNotifications`·`workDataDeletedDates` 복원 안 함**
  (`store/owner-state.js` `OwnerSnapshot` 구조적 한계). 핵심 데이터엔 영향 없음.
- **비용 3종 테이블 RLS** — 정책은 라이브에 이미 존재(진단 확인), 마이그레이션 파일엔
  없음. 필요 시 `0005`로 스냅샷화(안 급함).
- DB 마이그레이션 `0001`~`0004` 전부 라이브 적용·검증 완료.
- `npm run typecheck` → 현재 **0 에러**.

## 저장소 상태

- **react-app**: `main` = `6c5ba8d`(인라인 시트 닫기 이중 조건부 버그 수정,
  보리 푸시 완료). 클린.
- **ubiquitous-parakeet**: `main` = 이 세션의 문서 커밋 예정
  (`STATUS.md`/`docs/report.md`/`docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`/
  `docs/ui-comparison-report.md` — 아코디언 1~6차 전부 완료 기록·archive 정리·
  §1-D 정정, report.md 리셋).
  **AI는 push 안 함 — 보리가 push.**
- 확인 2026-09-11(AI 세션, 코드 커밋 확인 + 보리 최종 승인 + 추가
  교차검증 요청 처리). 정확한 HEAD·미커밋 범위는 매 세션 시작 시
  `git log`/`git status`로 직접 재확인 (AGENTS §0-6).

## 승인의 기준 (사용자가 `[x]` 확정 전에 확인할 것)

1. **GitHub Actions "CI / verify" 초록** — 초록 아니면 `[x]` 불가.(사용자가 푸시후 확인)
2. **브라우저 실검증 완료** — 사용자만 가능.
3. **§5 리뷰 통과** — 범위·타입꼼수·몰래증설·200줄·테스트진실성·문서정합·요구사항충족.
> ※ 1·2·3은 "승인에 필요한 증거". 최종 승인(=`[x]`)은 사용자의 결정 행위. 절차 정본은 AGENTS §3·§5.
