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

**§1(일일운행) 마무리 중** — 주말 전 정리(보리 2026-09-11: 오늘은 여기까지, 주말 지나고 아래 순서대로 계속).

**§1 남은 순서(F-1 → F-2 → E → D):**
1. **F-1. 부가세 해제 글자 굵기** `[~]` — `call-detail-form.css` 1줄,
   착수지시서 완료·승인 대기.
2. **F-2. 다크모드 드롭다운(`:-webkit-autofill`) 입력창 밝아짐** `[~]` —
   `shared-controls.css` 1개 파일, 착수지시서 완료·승인 대기.
3. **E. 정비/주유/기타 패널** `[ ]` — **착수 전 보리가 나머지 항목부터
   설명 필요**(지금 3개는 목록 미완성). 다 모이면 슬라이스 재분할.
   **+ E 착수 전 P0도 먼저 확인**: architecture-audit(2026-09-11, Cursor)이
   지적한 `useExpenseForm.js`의 `setTimeout(420)`이 `day-log.css` `0.4s`
   전환 시간과 숫자로만 묶여 있는 문제(`docs/sot.md` §4-11과 같은 지점) —
   `InlineSheet`가 자기 전환 종료를 이벤트로 알려주는 방식으로 바꿀지
   여부를 E 작업 시작 전에 결정한다. E가 이 컴포넌트를 더 건드릴 예정이라
   먼저 정리 안 하면 또 어긋날 여지가 큼.
4. **D. 시간입력 위젯(`app-temporal` 대체)** `[ ]` — 새 공용 컴포넌트
   작업이라 한 슬라이스로 안 끝남, §1 중 제일 크고 마지막. 착수 전 별도
   하위 슬라이스 계획 필요.

상세·근거는 `docs/ui-comparison-report.md` §1, 착수지시서는 `docs/report.md`.

## 다음 할 일

1. §1 전부 끝나면 §2~§14(보리가 직접 작성한 화면별 대조 기록)를 순차로.
   각 화면 = 대조 + 그 화면 전용 CSS 분리 한 슬라이스.

### 후속 nit (확인된 것만)

- **리포트 화면이 메인 차량 전용**[확인 2026-09-07] — 서브차량(소속기사) 리포트·
  수수료 줄이 react-app엔 없음. 범위 커서 별도 상의 필요.
- **`receivables/*` 뒤로가기 `?back=` 유실**[문서화 2026-09-07] — 드문 경로라 미루는 중.
- **사이드메뉴 "{번호} 관리" 톱니바퀴/세부입력 토글 메인·서브 분리**[확인 2026-09-09,
  `ui-comparison-report.md` §1-1 2번] — 미연동 서브차량 일지 화면 작업 때 함께.

### 보류 (보리 결정 대기, 급하지 않음)

1. **`.test.js` 나머지 strict 진단** — migration 원칙 "증가 금지"는 지킴, "전부 수정"은 안 함.
2. **`.ts`/`.tsx` 확장자 실전환** — JSDoc 타입 → 실제 TS. 보리가 "별도 단계"로 미뤄둠(2026-09-05).

## 이관 완료 후 진행사항 (원본에 없던 새 방향 — 이관 끝난 뒤에만)

- 이중역할(기사+차주)·역할전환 UI(보류) / 소속기사 매출 "운송료" 토글·배정기간 필터.
- Billing(net/gross) 삭제 or "공제 후" 고정(보리 고민 중, 기능 자체는 이관됨).
- `driver_direct` 죽은 코드 정리 / 다중 배정 차량 집계(`upsertDriver`가 막아 사실상 닫힘, 참고용).
- 미룸("이관 후 UI 정리"): 테마 저장 위치, 서브차량 설정 배치, 차량관리 라벨, 기사연동관리 UI 패턴.

## 완료 (커밋·푸시됨 — 상세는 각 archive/report.md, 아래는 한 줄 요약만)

- 일일운행 아코디언 슬라이드 애니메이션 1~6차 `[x]` — react-app `67762ff`~`6c5ba8d`.
  상세 `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`.
- "부가세 해제" 레이블 16px→fs-2 `[x]` — react-app `3ae7db9`(상세는 위 아카이브).
- `LinkedDriverClientsPage` 스코프 종결(버그 아님, 코드 변경 없음) `[x]` — 확인 2026-09-11.
- 연동 기사 거래처 스코프 수정 + 3그룹 교차검증 `[x]` — react-app `76d9829`.
  상세 `docs/archive/guest-data-loss-and-client-scope-2026-09-11.md`.
- B그룹 ①산재보험료·②즐겨찾기 칩·콜상세 "거래처+추가" `[x]`(③원안은 폐기) —
  react-app `1de2537`/`6b4a9b7`/`0db5bde`. 상세 `docs/archive/b-group-report-2026-09-11.md`.
- 게스트 데이터 유실 버그 근본 수정 `[x]` — react-app `0b9358d`.
  상세 `docs/archive/guest-data-loss-and-client-scope-2026-09-11.md`.
- Step 0~10 전부 `[x]`(매출제/월급제·기사연동·백업·알림·PDF·온보딩·고객센터 등) —
  상세 `docs/archive/audit.md`, `docs/archive/status-snapshot-2026-09-10.md`.
- Step 11 200줄 강제 `[x]`, JS→TS(JSDoc) 프로덕션 전체 `[x]`(잔여는 위 "보류" 참고).
- 미연동 서브차량 데이터 분리 4단계 `[x]` — 도메인 정의 `docs/sot.md` §0.
- 사이드메뉴 UI 정리(§1-1) 1·3번 `[x]`(2번은 위 "후속 nit").
- 공용 헤더 `PageHeader` 통일(22개 화면) `[x]` — `docs/archive/pageheader-unification.md`.
- `side-menu.css` 다이어트 `[x]` — `docs/archive/side-menu-css-diet.md`.
- `main-calendar.css` 책임 분리 1~10차 `[x]` — `docs/archive/main-calendar-css-split.md`.
- `ui-comparison-report.md` §2 마이페이지·§3 매출·§1-A 일일운행(CSS 4건)·
  일일운행 2부(2중스크롤+카드이탈)·홈 캘린더 ②③ 전부 `[x]` — react-app
  `8c1ccc7`/`1a5d702`/`c6c831b`/`796bea6`+`387e3c3`. 상세
  `docs/archive/report-snapshot-2026-09-10.md`,
  `docs/archive/day-log-part2-scroll-card-bugs.md`,
  `docs/archive/status-snapshot-2026-09-10.md`.

## 알려진 이슈 (안 고쳐도 되지만 잊으면 안 됨)

### 이관 완료 시 처리할 숙제 (§1~§14 UI 대조·이관 전부 끝난 뒤 한꺼번에)

- **`react-app/src/components/mypage.css`에 죽은 CSS 규칙 2개 보존돼 있음**
  (`.mypage-header-spacer`, `.mypage-role-pill` — 둘 다 JSX 소비처 0,
  `grep` 확인됨). 출처: 2026-09-10 §2 마이페이지 CSS 분리 때
  `side-menu.css` 1387~1605줄을 그대로 옮기며 "삭제 안 하고 보존 이동"
  관례에 따라 죽은 채로 같이 옮김(상세
  `docs/archive/report-snapshot-2026-09-10.md`). 보리 개인 메모로 이미
  추적 중, 여기 동기화만.
- **`ModalShell` 공용 컴포넌트 미추출** — `modal-overlay`/`modal-content`
  CSS는 `account-flow.css`에 이미 통일돼 있는데, JSX 래퍼(바깥 클릭 시
  닫힘 + `stopPropagation`)는 9개 파일 중 8개(`CarFormModal`,
  `ClientFormModal`, `ConfirmModal`, `DriverFormModal`,
  `ForgotPasswordModal`, `ReportDetailView`, `ReportShareModal`,
  `TaxInvoiceDraftModal`)에 완전히 동일하게 복붙돼 있음(`grep` 확인,
  2026-09-11 architecture-audit 발견). `ExpenseFormModal`만 구조가 달라
  (stopPropagation 래퍼 없음) 추출 시 별도 확인 필요. 순수 구조적
  중복이라 뽑아내도 안전(로직 변경 없음) — 다만 "이관 중 전면 리팩터
  안 함" 원칙 때문에 지금은 보류.
- **"재감사/FAIL 지적" 감사 이력 주석 다이어트** — 코드 전체 242곳 중
  테스트 파일(`App.test.js` 등) 비중이 커서 그건 있는 게 맞는 종류.
  실제 다이어트 후보는 `pendingWorkDataWritesTypes.js`(7)·
  `durableStorage.js`(6)·`useDayDraft.js`(5)·`ownerDataHooks.js`(4) 등
  durable-write 관련 lib 파일 소수(2026-09-11 architecture-audit 발견).
  ModalShell 건과는 겹치는 파일이 없는 별개 작업.
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

- **react-app**: `main` = `6c5ba8d`, 클린, origin과 동기화.
- **ubiquitous-parakeet**: `main` = `82638f9`. `STATUS.md` 수정 중(150줄
  초과 정리, 아직 미커밋 — 작은 문서 수정은 모아뒀다 의미 있는 단위로
  커밋, 매번 커밋 안 함). **AI는 push 안 함.**
- 정확한 HEAD·미커밋 범위는 매 세션 시작 시 재확인 (AGENTS §0-6).

## 승인의 기준 (사용자가 `[x]` 확정 전에 확인할 것)

1. **GitHub Actions "CI / verify" 초록** — 초록 아니면 `[x]` 불가.(사용자가 푸시후 확인)
2. **브라우저 실검증 완료** — 사용자만 가능.
3. **§5 리뷰 통과** — 범위·타입꼼수·몰래증설·200줄·테스트진실성·문서정합·요구사항충족.
> ※ 1·2·3은 "승인에 필요한 증거". 최종 승인(=`[x]`)은 사용자의 결정 행위. 절차 정본은 AGENTS §3·§5.
