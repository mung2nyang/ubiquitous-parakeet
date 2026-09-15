# STATUS — 현재 상태 한눈에

> **매 세션 이 파일부터 읽는다.** "지금 어디까지 왔나"의 정본.
> **갱신 규칙(엄수): 이 파일은 슬라이스마다 관련 절을 고쳐 쓴다 — append 금지.**
> "이전 최종 갱신 …" 을 위에 쌓지 마라. "완료" 절은 한 줄 요약만 추가하고,
> 슬라이스 상세는 `docs/report.md`(현재 슬라이스) / `docs/archive/`(끝난 것)에만 둔다.
> 이 파일이 150줄을 넘으면 오래된 "완료" 항목을 archive로 옮기고 요약만 남긴다.
> 직전 스냅샷: `docs/archive/status-snapshot-2026-09-10.md` (1093줄까지 커졌던 것 정리).
> 최종 갱신: 2026-09-15

---

## 우선순위 원칙 (보리 지시, 2026-09-05)

**"완벽한 react 이관"이 최우선.** 원본(`ubiquitous-parakeet`)에 있던 기능을 react-app으로
옮기는 작업을 먼저 끝낸다. 원본에 없던 새 방향·기능 강화 아이디어(토글, 역할전환 UI 등)는
아래 "이관 완료 후 진행사항"으로 모아두고 이관 완료 전엔 착수하지 않는다.
단, 이관 완료에 필요한 버그 수정·정합성 문제는 즉시 처리.

## 지금 하는 일

**§1(일일운행) 사실상 마무리 — §2(차량 관리)로 넘어갈 수 있음.**
A~D·E-1·F-1~F-3·디자인 토큰 전부 `[x]` 확정 완료(react-app
`e65b2c0`/`b14fcd8`/`c395ab3`/`93a4f2c`/`9e6f93d`/`8ced672`/`ed83703`/
`83de8e9`/`ef82306`, 전부 CI 초록·보리 확인). **남은 토글 닫기 기능
1건(정비/주유/기타 "+추가"/분류칩 재클릭)은 원본에도 있지만
`useExpenseForm.js`가 `InlineSheet` 리팩토링 대상이라 그거 끝난 뒤로
이월(2026-09-14 보리 결정, UI 대조상 급하지 않음) — §1을 더 막지 않음.

**§2(차량 관리) `[x]` 전체 완료(2026-09-15).** §2-1-A·B·C +
기사연동 전환 버그(`f4de520`/`bc25009`/`dd54ca3`) + 신규등록
connectMode 기본값 버그(`028af8e`) 전부 CI 초록·보리 브라우저
실검증·최종 승인. 상세
`docs/archive/2-2-car-driver-link-and-connectmode-bugs-2026-09-15.md`.

**지금 하는 일: 전역 드롭다운 통일 슬라이스 1 착수지시서 작성 완료,
착수 승인 대기(2026-09-15)** — 연/월 `<select>` 5파일(10곳)을
`CalendarDateSelect` 재사용으로 교체. 상세 `docs/report.md`.

**보리 지시(2026-09-14, 디자인 토큰 건에서 확인): "라이트 전용만
있는 건 다크모드도 적용해야 한다, 앱 통일을 위해서."** — 일반 원칙으로
기록. 토큰 파일 재검토 결과 이 원칙에 걸리는 나머지 사례는 없음
(`--fs-7` 1건은 이미 이 작업으로 해결됨, 상세는 archive 참고). 앞으로
비슷한 라이트 전용/다크 전용 비대칭을 발견하면 이 원칙대로 처리.

상세·근거는 `docs/ui-comparison-report.md` §1·§2, 착수지시서는
`docs/report.md`.

## 다음 할 일

1. **전역 드롭다운 슬라이스 1**(위 "지금 하는 일") 착수 승인 →
   진행. 슬라이스 2(개별 select 5곳 공용화 여부, 보리 결정 필요)는
   그 다음. 착수지시서 `docs/report.md`.
2. §3~§14(보리가 직접 작성한 화면별 대조 기록)를 순차로. 각 화면 =
   대조 + 그 화면 전용 CSS 분리 한 슬라이스.

*(grep 재확인 결과 후보가 10파일/14곳 → **10파일/15곳**으로 정정됨 —
근거는 `docs/report.md` 참고.)*

### 후속 nit (확인된 것만)

- **`commitLocalOnly` 호출부 4곳 중 3곳에 같은 undefined 미체크 패턴
  잔존**[확인 2026-09-14, 보리 "지금은 안 고침" 결정] — `dd54ca3`가
  `requestDriverDeletion`(`directMutationActions.js`) 1곳만 제네릭+런타임
  체크로 고쳤고, 나머지 `requestClientDeletion`(46행)·
  `requestDriverStatusChange`(77행, 둘 다 `directMutationActions.js`)·
  `requestDriverInviteSave`(`requestDriverInviteSave.js:58`)는 여전히
  `failed ? x : value`(undefined 가능성 미체크) 패턴. 특히
  `requestDriverInviteSave.js:58`은 `/** @type {Array<DriverRecord>} */
  (value)` **타입 단언**까지 있어 AGENTS.md §6 "타입 꼼수 금지"에 걸림
  (이번 슬라이스가 만든 건 아니고 기존부터 있던 것). 지금 당장은 아무도
  이 3곳 반환값에 배열 메서드를 체이닝 안 해서 CI가 못 잡을 뿐 — 나중에
  누가 체이닝하면 똑같이 터짐. 정리 시점 미정, 보리 결정 대기.
- **outbox 9개 파일 사실상 죽은 코드**[확인 2026-09-14] — `react-app/src/lib/`
  `mutationOutbox.js`·`outboxFlush.js`·`outboxCommit.js`·`outboxRollback.js`·
  `outboxReconcile.js`·`outboxDriverMerge.js`·`outboxTypes.js`·`outboxErrors.js`·
  `syncQueue.js`. 새 op를 넣는 유일 함수 `commitWithOutboxAndFlush`(`outboxCommit.js`)를
  프로덕션 어디서도 안 부름(차량/거래처/기사초대/삭제 창구 전부 `commitLocalOnly`/
  `STORAGE_FAIL_TOAST`만 씀) — 남은 역할은 이관 전 예전 큐 잔여 flush뿐
  (`docs/sot.md` §8). 정리 여부·시점 미정, 보리 결정 대기.
- **`workDataDeletedDates`(tombstone) 삭제-flush 절반 죽음**[확인 2026-09-14] —
  실제 원격 삭제 함수 `syncDeletedWorkDates()`(`react-app/src/lib/syncDeletedWorkDates.js`)와
  `syncWorkData.js`의 구 `syncWorkData()`(bulk syncAll) 둘 다 프로덕션 호출부 없음
  (`syncQueue.js`/`clientMutations.js`/`clientCloudSave.js` 주석 "syncAll은 쓰지
  않는다"로 명시). 읽기 쪽(hydrate 필터, `hydrateMergeWork.js:34,38,65`)은 살아있어
  화면엔 안 보이지만, 그 좁은 엣지케이스(로그인했지만 그 차량이 아직 Supabase
  미동기화일 때 빈 날 삭제)에서 생긴 tombstone은 서버 쪽 원본 행을 영원히 못 지움.
  정리 여부·시점 미정, 보리 결정 대기.
- **리포트 화면이 메인 차량 전용**[확인 2026-09-07] — 서브차량(소속기사)
  리포트·수수료 줄이 react-app엔 없음. 범위 커서 별도 상의 필요.
- **`receivables/*` 뒤로가기 `?back=` 유실**[문서화 2026-09-07] — 드문 경로라 미루는 중.
- **사이드메뉴 "{번호} 관리" 톱니바퀴/세부입력 토글 분리**[확인 2026-09-09,
  `ui-comparison-report.md` §1-1 2번] — 미연동 서브차량 일지 작업 때.

### 보류 (보리 결정 대기, 급하지 않음)

1. **`.test.js` 나머지 strict 진단** — "증가 금지"는 지킴, "전부 수정"은 안 함.
2. **`.ts`/`.tsx` 실전환** — JSDoc 타입 → 실제 TS. "별도 단계"로 미뤄둠(2026-09-05).

## 이관 완료 후 진행사항 (원본에 없던 새 방향 — 이관 끝난 뒤에만)

- 이중역할(기사+차주)·역할전환 UI(보류) / 소속기사 매출 "운송료" 토글·배정기간 필터.
- Billing(net/gross) 삭제 or "공제 후" 고정(보리 고민 중, 기능 자체는 이관됨).
- `driver_direct` 죽은 코드 정리 / 다중 배정 차량 집계(`upsertDriver`가 막아 사실상 닫힘, 참고용).
- 미룸("이관 후 UI 정리"): 테마 저장 위치, 서브차량 설정 배치, 차량관리 라벨, 기사연동관리 UI 패턴.
- **`InlineSheet` 전환 리팩토링**(보리 지시, 2026-09-14) — **결정: 이벤트
  기반 확정(다시 고민 불필요).** `useExpenseForm.js`의 `setTimeout(420)`
  (매직넘버, `day-log.css` `0.4s`와 숫자로만 동기화, `clearTimeout` 정리도
  없어 언마운트 레이스 위험)을 `InlineSheet`의 `onTransitionEnd` 기반
  콜백(`onClosed` prop 신설 등)으로 바꾼다. 원본에 없던 새 개선이라
  이관 완료 후. **스크롤 애니메이션 추가는 별개 후보(미확정, 그때 판단).**
  **E의 "정비/주유/기타 토글 닫기" 기능도 같이 처리**(같은
  `useExpenseForm.js` 흐름을 건드리므로 리팩토링 먼저 — 원본에도 있는
  기능이지만 이 이유로 §1에서 이관 완료 후로 이월).

## 완료 (커밋·푸시됨 — 상세는 각 archive/report.md, 아래는 한 줄 요약만)

- §2(차량 관리) 전체 `[x]` — 기사연동 전환 버그 + 신규등록 connectMode
  기본값 버그 포함, react-app `f4de520`/`bc25009`/`dd54ca3`/`028af8e`,
  전부 CI 초록·보리 최종 승인(2026-09-15). 상세
  `docs/archive/2-2-car-driver-link-and-connectmode-bugs-2026-09-15.md`.
- §2-1-C 차량관리 전용 CSS 분리 `[x]` — react-app `2e1fcac`, CI
  초록·보리 실검증·최종 승인(2026-09-14). 상세
  `docs/archive/2-1-c-car-management-css-split-2026-09-14.md`.
- §2-1-B 수정/삭제 아이콘 공용화(5곳) + 일일운행 세로쌓임 회귀 수정
  `[x]` — react-app `489e9fd`/`a0f6d6a`, CI 초록·보리 실검증·최종
  승인(2026-09-14). 검증 중 발견한 CSS 블라스트 반경 문제로 `AGENTS.md`
  §5에 리뷰 항목 6(공용 CSS 클래스 영향범위) 신규 추가. 상세
  `docs/archive/2-1-b-card-action-icons-2026-09-14.md`.
- §2-1-A 차량 카드 라벨칩/정산정보 복원 + 칩 조건 버그 수정 `[x]` —
  react-app `8641be3`/`032e807`/`15bfc43`, CI 초록·보리 실검증·최종
  승인(2026-09-14). 상세 `docs/archive/2-1-a-car-card-label-chips-2026-09-14.md`.
- D-0~D-3·E-1·F-1~F-3·디자인 토큰 통합(시간입력 위젯 전체+정비/주유/기타
  공용 스타일+콜상세 아이콘/별표 SVG+CSS 변수 1곳화) `[x]` — react-app
  `e65b2c0`/`b14fcd8`/`c395ab3`/`93a4f2c`/`9e6f93d`/`8ced672`/`ed83703`/
  `83de8e9`/`ef82306`, 전부 CI 초록·확인 완료(2026-09-14). 상세
  `docs/archive/d0-`~`d3-`·`e1-`·`f1-`~`f3-`·
  `design-tokens-consolidation-2026-09-14.md`.
- 일일운행 아코디언 슬라이드 1~6차·"부가세 해제" 16px→fs-2 `[x]` —
  react-app `67762ff`~`6c5ba8d`/`3ae7db9`. 상세
  `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`.
- 연동 기사·거래처 스코프 3건(종결 확인·스코프 수정+교차검증·게스트 데이터
  유실 근본 수정) `[x]` — react-app `76d9829`/`0b9358d`. 상세
  `docs/archive/guest-data-loss-and-client-scope-2026-09-11.md`.
- B그룹 ①산재보험료·②즐겨찾기 칩·콜상세 "거래처+추가" `[x]`(③원안은 폐기) —
  react-app `1de2537`/`6b4a9b7`/`0db5bde`. 상세 `docs/archive/b-group-report-2026-09-11.md`.
- Step 0~10 전부 `[x]`(매출제/월급제·기사연동·백업·알림·PDF·온보딩·고객센터 등,
  상세 `docs/archive/audit.md`·`status-snapshot-2026-09-10.md`) · Step 11
  200줄 강제·JS→TS(JSDoc) 프로덕션 전체 `[x]`(잔여는 위 "보류" 참고).
- 미연동 서브차량 데이터 분리 4단계 `[x]`(도메인 정의 `docs/sot.md` §0) ·
  사이드메뉴 UI 정리(§1-1) 1·3번 `[x]`(2번은 위 "후속 nit").
- `PageHeader` 통일(22개 화면) `[x]`·`side-menu.css` 다이어트 `[x]`·
  `main-calendar.css` 책임 분리 1~10차 `[x]` — 상세 각 archive 동명 파일.
- `ui-comparison-report.md` §2 마이페이지·§3 매출·§1-A 일일운행(CSS 4건)·
  일일운행 2부(2중스크롤+카드이탈)·홈 캘린더 ②③ 전부 `[x]` — 상세
  `docs/archive/report-snapshot-2026-09-10.md`·`day-log-part2-scroll-card-bugs.md`·
  `status-snapshot-2026-09-10.md`.

## 알려진 이슈 (안 고쳐도 되지만 잊으면 안 됨)

### 이관 완료 시 처리할 숙제 (§1~§14 UI 대조·이관 전부 끝난 뒤 한꺼번에)

- **`react-app/src/side-menu.css`에 죽은 CSS 규칙 2개 보존돼 있음**
  (§2-1-C 차량관리 CSS 분리 조사 중 발견, 2026-09-14) —
  `car-commission-heading`+`strong`+`span`(336~353행, 18줄): 전체
  `*.jsx` grep 0건. `car-daylog-preview`+`li`(461~479행, 19줄): 마찬가지
  0건이고, `CarDriverConnectPanel.test.js`가 오히려 "이 클래스로
  렌더된 요소가 0개"임을 검증하는 대상. **보리 결정: 지금 안 건드림,
  이관 완료 후 처리.** 상세는
  `docs/archive/2-1-c-car-management-css-split-2026-09-14.md`.
- **`react-app/src/components/mypage.css`에 죽은 CSS 규칙 2개 보존돼 있음**
  (`.mypage-header-spacer`, `.mypage-role-pill` — 둘 다 JSX 소비처 0,
  `grep` 확인됨). 출처: 2026-09-10 §2 마이페이지 CSS 분리 때
  `side-menu.css` 1387~1605줄을 그대로 옮기며 "삭제 안 하고 보존 이동"
  관례에 따라 죽은 채로 같이 옮김(상세
  `docs/archive/report-snapshot-2026-09-10.md`). 보리 개인 메모로 이미
  추적 중, 여기 동기화만.
- **`ModalShell` 공용 컴포넌트 미추출** — 바깥 클릭 닫힘+`stopPropagation`
  JSX 래퍼가 9개 파일 중 8개에 동일 복붙(`ExpenseFormModal`만 다름).
  안전하게 뽑아낼 수 있으나 "이관 중 전면 리팩터 안 함" 원칙으로 보류.
- **"재감사/FAIL 지적" 감사 이력 주석 다이어트** — 242곳 중 테스트 파일은
  정상. 실제 후보는 `pendingWorkDataWritesTypes.js`(7)·`durableStorage.js`(6)
  등 durable-write lib 소수(2026-09-11, ModalShell과 무관한 별개 작업).
- **정비/주유/기타 Supabase 동기화가 항상 "메인" 차량 `vehicle_id`로만 저장**
  (`lib/syncExpenseRecords.js`/`lib/hydrate.js`). DB row 정합성만의 문제라
  화면 영향 없음 — 서브차량 sync 루프 고칠 때 같이 처리(백로그).
- **게스트 백업 가져오기가 `dismissedNotifications`·`workDataDeletedDates` 복원 안 함**
  (`store/owner-state.js` `OwnerSnapshot` 구조적 한계). 핵심 데이터엔 영향 없음.
- **비용 3종 테이블 RLS** — 정책은 라이브에 이미 존재, 마이그레이션 파일엔 없음.
  필요 시 `0005`로 스냅샷화(안 급함).
- DB 마이그레이션 `0001`~`0004` 전부 라이브 적용·검증 완료 · `npm run typecheck` → 0 에러.

## 저장소 상태

- **react-app**: `main` = `028af8e`(신규등록 connectMode 기본값 수정) —
  push됨, origin과 동일. §2 관련 CI "verify" 전부 초록·보리 최종
  `[x]` 승인 완료(2026-09-15).
- **ubiquitous-parakeet**: 이번 갱신분(§2 완료 archive + 드롭다운
  슬라이스 1 착수지시서) 커밋 예정. **AI는 push 안 함.**
- 정확한 HEAD·미커밋 범위는 매 세션 시작 시 재확인 (AGENTS §0-6).

## 승인의 기준 (사용자가 `[x]` 확정 전에 확인할 것)

1. **GitHub Actions "CI / verify" 초록** — 초록 아니면 `[x]` 불가.(사용자가 푸시후 확인)
2. **브라우저 실검증 완료** — 사용자만 가능.
3. **§5 리뷰 통과** — 범위·타입꼼수·몰래증설·200줄·테스트진실성·문서정합·요구사항충족.
> ※ 1·2·3은 "승인에 필요한 증거". 최종 승인(=`[x]`)은 사용자의 결정 행위. 절차 정본은 AGENTS §3·§5.
