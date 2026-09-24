# STATUS — 현재 상태 한눈에

> **매 세션 이 파일부터 읽는다.** "지금 어디까지 왔나"의 정본.
> **갱신 규칙(엄수): 이 파일은 슬라이스마다 관련 절을 고쳐 쓴다 — append 금지.**
> "이전 최종 갱신 …" 을 위에 쌓지 마라. "완료" 절은 한 줄 요약만 추가하고,
> 슬라이스 상세는 `docs/report.md`(현재 슬라이스)에만 둔다. 끝난 슬라이스는
> 커밋 메시지가 기록이다(`docs/archive/` 새 파일 안 만듦, 2026-09-15부터 —
> `AGENTS.md` §0-2). 지난 내용은 `git log -p -- docs/report.md` 또는 아래
> 커밋 해시로 `git show`.
> 이 파일이 150줄을 넘으면 오래된 "완료" 항목을 요약만 남기고 줄인다.
> 최종 갱신: 2026-09-24 (이관 마무리 ③ 11-5·11-6 기사 관리 화면 사업자·정산 계좌 카드 `[x]` — react-app `41f9539`.
> 앞서 ② 5-5 `[x]`(`550bca5`)·① 11-7 `[x]`(`fc4ec83`). 진행 중인 슬라이스 없음. 다음은 보리가 지시한 별건 0-1(개인정보 입력 오류)·0-2(대표자·예금주 서버 저장), 그다음 ④.)
> 이전 갱신: 2026-09-21 (**UI 이관 §1~§16 전부 완료**(보리 확정),
> `side-menu.css` 정리 트랙 전체 완료. 고정노선: §15 슬라이스 E(`8c2bf61`)·
> 미연동 고정노선 + 차주 집계 서브차량 스코프(`c8939c2`) `[x]`. **이관 완전성
> 감사(화면·기능 기준) 완료** — 결과·보리 결정은 `docs/migration-audit.md`,
> 확정된 원본과의 차이는 `docs/sot.md` §8-2. 감사에서 나온 7-1 "공제 전" 화면
> 삭제(`3bc860a`) `[x]` push·CI 초록·보리 최종 승인 완료. 고정노선 무스코프 호출부
> 전수 조사 `[x]`(`docs/scope-audit.md`), 스코프 수정 묶음 1 `[x]`(`1413e8e`)·묶음 2 `[x]`(`1c5c7b1`,
> 스코프 규칙은 `docs/sot.md` §4-4e). 이관 감사 B 결과·보리 결정(`docs/finance-parity.md`). 이관 마무리 범위
> 확정(`docs/roadmap.md`). 진행 중인 슬라이스 없음)

---

## 우선순위 원칙 (보리 지시, 2026-09-24 변경)

**목표는 배포.** 아직 실사용자는 없다. 완벽한 UI보다 **계산 오류 없음 +
실사용자 편의 + 빠른 배포**가 우선이고, 일상점검표는 배포에 포함한다.
계산식은 현직자 조언에 따라 바뀔 수 있다. 순서는 AI가 급한 순서로 정해
`docs/roadmap.md` "배포까지 순서"에 둔다(AGENTS §1). 보리의 모바일
셀프 테스트 버그 제보는 항상 최우선으로 끼워 넣는다.
(이전 원칙 "완벽한 react 이관 최우선"(2026-09-05)은 이관 완료로 종료.)

**비대칭 발견 시 앱 통일 우선 원칙**(보리 지시, 2026-09-14 라이트/다크
건에서 확인, 09-15 칩 스타일 건에도 적용) — 원본 자체에 라이트 전용
스타일이나 칩/텍스트 비대칭이 있어도, react-app에선 발견 즉시 통일
우선으로 처리.

## 지금 하는 일

**UI 이관(`ui-comparison-report.md` §1~§16) 전부 완료**(보리 확정,
2026-09-19). 다음 할 일은 `docs/roadmap.md` "배포까지 순서"(2026-09-24).

UI가 아닌 기능 작업이라 이관 범위에서 뺀 것(명시적 제외·AGENTS §2,
전부 `docs/roadmap.md` "이관 완료 후 진행사항"):
- **이관 마무리(보리 확정 2026-09-21, 순서는 AI 위임)** — `docs/roadmap.md` "이관 마무리 범위": ~~①11-7 산재보험 토글~~ `[x]`·~~②5-5 계산서 모달 세무정보 + 작성 완료 배지~~ `[x]`·~~③11-5 차량별 사업자정보 + 11-6 정산 계좌~~ `[x]`(2026-09-24, 아래 "완료")
  다음은 ④10-7 기사 본인 연동 해제(권한 확인 먼저).
  11-1·F-02~F-04는 "이관 후 개선". 근거는 `docs/migration-audit.md`·`docs/finance-parity.md`(결정 완료, F-07 패스).
- §16 후속 — "결제 및 수금 입력" 토글 신설·"고정 노선" 차량별 분리
  (매출/정산 계산 엔진을 같이 고쳐야 함).

이관 후 정리 트랙 `side-menu.css`(사이드메뉴 규칙만 남기기) **전체 완료**
(2026-09-19) — 정밀 조사·설계는 `docs/ui-comparison-report.md`
"`side-menu.css` 정밀 조사"·"③ 공용 블록 분리 설계안". ① 단일 화면 블록 이동
A(`fd00727`)·B(`6a9b860`)·C(`2d35b06`), ② 죽은 CSS 삭제(`48c8a79`),
③ 공용 분리 A(`700ed8e`)·B(`b7bae84`). 최종 구조: `side-menu.css`(129줄,
사이드메뉴만) + `management-common.css`(관리형 공용) + `controls-common.css`
(폼·컨트롤 공용), `App.jsx`가 같은 자리에서 3줄로 import. 771→129줄.

## 다음 할 일

`docs/roadmap.md` "배포까지 순서"(2026-09-24, AI가 급한 순서로 정함) 참고.
1·2번(② 5-5, ③ 11-5·11-6) `[x]` 완료. 보리 지시로 0-1(개인정보 로그인 입력 오류)·0-2(대표자·예금주 서버 저장)를 먼저 진행한다.

> 후속 nit·보류 항목·이관 완료 후 진행사항은 `docs/roadmap.md`로 이동
> (2026-09-17 분리). 이관 완료 후 순서(사이드메뉴/모달 버그 → 빌드
> 최적화 → 새 기능 → 일상점검표 신규 기능)도 그 문서에 있다.

## 완료 (커밋·푸시됨 — 상세는 각 커밋 diff/메시지 참고, git log -- docs/report.md)

- 이관 마무리 ③ 기사 관리 화면 "사업자·정산 계좌 정보" 카드(이관 감사 11-5·11-6) `[x]` — react-app `41f9539`.
  기사 관리 화면(연동·미연동) 맨 아래 카드. "내 사업자 정보와 동일" 스위치 하나가 사업자정보와 계좌를 함께 정함(보리 결정: 계좌는 항상
  사업자 명의자의 것). 켜짐=차주 정보 표시(복사 안 함), 꺼짐=사업자 7칸+계좌 3칸 입력 → `car.businessInfo`·`car.personalInfo` 저장
  (`requestCarBusinessInfoSave`, 기존 차량 저장과 같은 순서). 세금계산서 공급자·상대방과 운송비 내역서 계좌 칸이 이 값을 따름, 금액 계산 무변경.
  `npm test`(unit 678+화면 182)·`tsc` 0에러·strict 진단 새 파일 몫 0·수정 코드를 되돌리면 새 테스트 7개 FAIL 확인·CI 초록·보리 브라우저
  실검증·최종 승인 완료. **알려진 한계(범위 밖):** 기사 본인 계정 화면은 RPC 요약에 이 값이 없어 미반영. 켜짐 화면의 차주 예금주는 앱
  프로필 값이라 0-2가 끝나기 전엔 새로고침 뒤 빈칸일 수 있음.
- 이관 마무리 ② 계산서 작성 모달 세무정보 복원 + 거래처 "정보 작성 완료" 배지(이관 감사 5-5) `[x]` — react-app `550bca5`.
  `TaxInvoiceDraftModal.jsx`에 이메일·업태·종목·사업장 주소 입력칸 추가(저장 경로는 원래 있었음, 입력칸만 없었음).
  `ClientListItem.jsx`에 세무정보 6칸(사업자번호·대표자·주소·업태·종목·이메일)이 다 채워지면 배지 표시(원본에 없던 신규, 보리 요청).
  `npm test`(unit 661+화면 179)·`tsc` 0에러·수정 코드를 되돌리면 새 테스트 3개 FAIL 확인·CI 초록·보리 브라우저 실검증·최종 승인 완료.
- 이관 마무리 ① 기사차량 폼 "산재보험 적용" 토글 복원(이관 감사 11-7) `[x]` — react-app `fc4ec83`. 계산부(`driverRevenueShareExpense.js`·
  `financeTaxInvoiceGroups.js`·`driverSelfRevenue.js`)는 이미 `car.insuranceOn`을 읽었지만 켜는 화면이 없어 새 기사차량은 산재보험이
  항상 차감 안 됐음. `CarFormModal.jsx` 기사차량 폼에 토글 추가, `upsertCar`/`openEdit`이 저장·복원. 메인 차량 폼엔 안 보이고 항상 false.
  `npm test`(unit 661+화면 175)·`tsc` 0에러·strict 진단 418 불변·수정 코드를 되돌리면 새 테스트 4개 FAIL 확인·CI 초록·보리 브라우저
  실검증·최종 승인 완료. **알려진 한계(범위 밖):** 기사 본인 계정 매출 화면은 RPC `get_assigned_vehicle_summary`에 `insuranceOn`이 없어
  아직 미반영 — 별도 슬라이스로 `docs/roadmap.md` 등재.
- 스코프 수정 묶음 2(운송비 내역서가 그 차량 스코프 고정노선 단가를 씀) `[x]` — react-app `1c5c7b1`. `buildMonthReport`가 대상 차량(`mainCar`)이
  서브차량일 때 그 번호를 스코프 키로 사용(서브차량 내역서 250,000→100,000원, 연동기사 본인 내역서 0→100,000원), 메인 차량은 기존과 동일, 수수료 계산
  불변(운송내역서는 회사 제출용 — 기사차량 수수료 미차감, F-06). `npm test`(unit 657+화면 175)·`tsc` 0에러·strict 진단 418 불변·수정 코드를 되돌리면
  새 테스트 2개 FAIL 확인·CI/Deploy 초록·보리 브라우저 실검증·최종 승인 완료. 스코프 규칙 확정 기록 `docs/sot.md` §4-4e, 업무 흐름 §0.
- 스코프 수정 묶음 1(연동기사 본인 달력·매출이 배정 차량 스코프 고정노선 단가를 씀) `[x]` — react-app
  `1413e8e`. 기사 세션은 일지가 main·거래처가 배정 차량 스코프라 달력이 단가 0원, 매출은 운송료 0원 vs
  정산액(본인 단가)이 어긋나던 것을 수정(`clientScopeKey` 달력 전달, `getOwnerMonthlyFinanceDetail` 선택 인자
  추가). 차주·기사 둘 다 고정노선 설정 가능(보리 확인). `npm test`(unit 652+화면 175)·`tsc` 0에러·strict 진단
  418 불변·수정 코드를 되돌리면 새 테스트 3개 FAIL 확인·CI/Deploy 초록·보리 브라우저 실검증·최종 승인 완료.
- 이관 완전성 감사 B(계산 로직 수치 대조, 읽기 전용) — 결과 `docs/finance-parity.md`(31행: ✅ 17 · 🟡 6 · ⚪ 7 ·
  ❓ 1). 재현 명령·표 행 수 검증. F-01~F-07 보리 결정 완료(🔧 F-02~F-04는 이관 후 개선, ⚪ F-01·F-05·F-06·F-07).
- 고정노선 무스코프 호출부 전수 조사(읽기 전용) `[x]` — 결과 `docs/scope-audit.md`. 프로덕션 142줄
  판정 ✅ 80 · 🔧 11 · ➖ 51(맥락 ①차주 메인 ②차주 서브차량 ③연동기사 본인 ④게스트), Q1~Q6 전부
  결론. 🔧 11행은 세 곳으로 모임: 연동기사 본인 달력(0원)·기사 본인 매출(운송료/정산액 불일치)·운송비
  내역서(서브차량이 차주 단가). 보리가 §5 표본 4건을 브라우저로 확인. 수정 착수는 roadmap의 스코프
  수정 묶음 1·2(완료). 확정 규칙은 `docs/sot.md` §4-4e에 기록.
- 이관 감사 7-1: 기사 계산서 기준 "공제 전/후" 선택 화면 삭제 `[x]` — react-app `3bc860a`.
  `BillingSettingsPage`·라우트·`billing-settings.css` 삭제(기사관리 진입 버튼은 감사 7-2로 이미
  제거된 상태), 공제후 고정(sot §4-5c). 금액 변화 없음. `driverInvoiceBasis` 스키마와 도달 불가한
  `gross` 분기는 일부러 유지. `npm test`(unit 649+화면 174)·`tsc` 0에러·`vite build`·CI/Deploy 초록·
  보리 외부 브라우저 실검증·최종 승인 완료.
- 이관 완전성 감사(화면·기능 기준, 읽기 전용) — 착수지시서 `f2f1fdf`, 결과·보리 결정 `1bfb98f`
  (`docs/migration-audit.md`). 124행 재집계: ✅ 92 · 🟡 5 · ❌ 4 · ⚪ 23. 조치 필요 7(→ 7-1 완료로 6)·
  이관 후 도입 3. 확정된 "원본과 다른 점"은 `docs/sot.md` §8-2.
- 미연동 기사 거래처 고정노선 사용 가능 + 차주 집계 서브차량 스코프 `[x]` —
  react-app `c8939c2`. `LinkedDriverClientsPage`의 미연동 숨김·강제 off 제거
  (sot §4-4c "그 운행일지 안에서 1곳") + 차주 월 매출(`financeCore`)·상세 손익
  (`financeOwnerDetail`)·세금계산서 매출(`financeTaxInvoiceGroups`)·서브차량
  달력(`CalendarPage`)이 서브차량별로 스코프 고정노선 우선·없으면 차주 것
  fallback(스코프 없는 차량은 결과 동일, 연동기사 차량도 같은 규칙).
  `financeCore`(217)·`financeTaxInvoiceGroups`(206)는 줄 수 증가 없는 제자리
  수정(§6 응집도 예외, 보리 승인). `npm test`(unit 649+화면 174)·`tsc`
  0에러·strict-inventory 진단 불변·수정 코드 되돌리면 새 테스트 4개 FAIL 확인·
  CI/Deploy 초록·보리 브라우저 실검증·최종 승인 완료.
- §15 슬라이스 E(연동기사 거래처 고정노선 토글 노출 — 기사 본인 화면
  `OwnerScopedClientsView` + 차주가 보는 `LinkedDriverClientsPage`) `[x]` —
  react-app `8c2bf61`. 모달에서 숨겨져 있던 고정노선 토글·단가 입력을 열고
  수정 화면 열기·저장 때 값을 강제로 끄던 것을 실제 값으로 바꿈(슬라이스 D
  스코프 엔진 위에 화면만 개방). `isDriverDirect` 분기(기사직접정산 조회
  전용 목록)와 죽은 파일 3개 삭제. 미연동은 임시로 토글 숨김 유지.
  `npm test`(unit 645+화면 172)·`tsc` 0에러·CI/Deploy 초록·보리 브라우저
  실검증(기사·차주 양쪽, 회귀 없음)·최종 승인 완료. 함께 `docs/sot.md`
  §4-4c 미연동 규칙을 "그 운행일지 안에서 1곳"으로 확정(보리 확인).
- `side-menu.css` 정리 ③-B(공용 규칙을 원래 순서 그대로 연속 조각 2개로 분리:
  신규 `management-common.css` 166줄·`controls-common.css` 121줄, `App.jsx`
  import 1줄→3줄 같은 자리, 낡은 "side-menu.css에 둠" 주석 3곳 정정 = 7파일)
  `[x]` — react-app `b7bae84`. 값·서식·순서 무변경(삭제 247줄=추가 247줄
  일치), `side-menu.css` 414→129줄(사이드메뉴 클래스만). **빌드 CSS 17개
  파일 전후 바이트 동일**(해시 파일명까지 동일)로 로드 순서 불변 증명.
  `npm test` 817개·`tsc` 0에러·build·CI 초록·보리 브라우저 실검증·§5 리뷰
  7항목·최종 승인 전부 완료. 이로써 `side-menu.css` 정리 트랙 전체 완료.
- `side-menu.css` 정리 ③-A(단일 화면 잔여 2블록 이동: `.pill-group/.pill-btn`→
  `expense-form.css`(기존 pill 규칙 뒤에 배치)·`.tree-line-group`→
  `app-settings.css` 끝(199줄), + `.car-sub-text span + span` 규칙을 같은
  파일 안 형제 규칙 옆으로 재배치 = 3파일) `[x]` — react-app `700ed8e`.
  값·서식 무변경(삭제=추가 일치), `side-menu.css` 456→414줄. 빌드 CSS 전후
  비교로 순서 불변 증명(index 규칙 476→474, 사라진 것 트리선 2개뿐·추가 0,
  `AppSettingsPage` CSS 19→21, `.pill-btn.active`가 여전히
  `.expense-form-content .pill-btn` 뒤). `npm test` 817개·`tsc` 0에러·build·
  CI 초록·보리 브라우저 실검증·§5 리뷰 7항목·최종 승인 전부 완료.
- `side-menu.css` 정리 ②(죽은 CSS 2건 삭제: `.car-commission-panel`·
  `.work-log-expense-head` + `client-management.css` 머리말 주석 1줄 정정)
  `[x]` — react-app `48c8a79`. 소비처 0곳을 src 전체 grep·동적 클래스
  조합 배제까지 확인 후 삭제(화면 변화 없음), `side-menu.css` 471→456줄.
  `npm test` 817개·`tsc` 0에러·build·CI 초록·보리 브라우저 실검증·§5
  리뷰 7항목·최종 승인 전부 완료.
- `side-menu.css` 정리 ①-C(초대코드 `.personal-intro*`→`InviteRedeemPage.css`·
  `.message-settings-*`→`message-settings.css`·캘린더 알림 버튼/배지→
  `calendar/calendar-header.css`, 신규 CSS 3개 + JSX import 3줄 +
  `PersonalInfoPage.css` 머리말 정정 = 8파일) `[x]` — react-app `2d35b06`.
  규칙 값·서식 무변경(삭제 60줄=추가 60줄 일치), `side-menu.css`
  538→471줄. `npm test` 817개·`tsc` 0에러·build·CI 초록·보리 브라우저
  실검증·§5 리뷰 7항목·최종 승인 전부 완료. 이로써 ① 전체 완료.
- `side-menu.css` 정리 ①-B(알림 패널 규칙 10개를 신규
  `notification-panel.css`로 이동 + `NotificationPanel.jsx` import 1줄)
  `[x]` — react-app `6a9b860`. 규칙 값 무변경(삭제 75줄=추가 75줄 일치),
  `side-menu.css` 623→538줄. `npm test` 817개·`tsc` 0에러(`@ts-check`
  파일 CSS import 확인)·build·CI 초록·보리 브라우저 실검증·§5 리뷰
  7항목·최종 승인 전부 완료. 리뷰 중 문서 오류 1건 발견·정정(알림
  버튼·배지는 준공용이 아니라 캘린더 전용 — ①-C로 이관).
- `side-menu.css` 정리 ①-A(한 화면만 쓰는 규칙 3블록을 그 화면 CSS로
  이동: `.car-option-copy`→`client-management.css`·`.car-commission-*`→
  `car-management.css`·일지 비용 위젯→`day-log-expenses.css`) `[x]` —
  react-app `fd00727`. 규칙 값 무변경 복사 이동(삭제 130줄=추가 130줄
  일치 확인), `side-menu.css` 771→623줄. `npm test` 817개·`tsc` 0에러·
  build·CI 초록·보리 브라우저 실검증(라이트/다크)·§5 리뷰 7항목·최종
  승인 전부 완료.
- 죽은 CSS 5건 삭제(`side-menu.css` 3곳: `.action-text-btn` 복합 선택자·
  `.car-commission-heading`·`.car-daylog-preview` / `mypage.css` 2곳:
  `.mypage-header-spacer`·`.mypage-role-pill`) `[x]` — react-app
  `8fe5269`. 소비처 0곳을 src 전체 grep으로 확인 후 삭제(화면 변화 없음),
  `npm test` 817개(도메인 645+컴포넌트 172)·`tsc` 0에러·build·CI 초록·
  보리 브라우저 실검증·§5 리뷰 7항목·최종 승인 전부 완료.
- §16 슬라이스 D(일지·달력 화면이 차량별 설정값 읽도록 배선) `[x]` —
  react-app `d7ff955`. `domain/carSettingsScope.js`의
  `resolveLogSettings`(서브차량이면 세부입력 5종+`inputMode`를 그 차량
  저장값으로 덮어쓴 읽기 전용 사본, 저장값 없으면 기본값=전부 꺼짐)를
  `MainPageRoute`(일지)·`CalendarPage`(달력 표시 방식)에 연결. 결제·
  고정노선·횟수 프리셋·자주 쓰는 위치는 공용 유지. 저장 구조 변경 없음.
  `npm test` 817개(도메인 645+컴포넌트 172)·`tsc` 0에러·CI 초록·보리
  브라우저 실검증·§5 리뷰 7항목·최종 승인 전부 완료. 지시서 원문은
  이 문서 커밋의 `docs/report.md`.
- §16 슬라이스 C(차량별 설정값 배선, 안전한 부분만) `[x]` — react-app
  `b94eb30`. "운행 일지 세부 입력" 5종(시간/플랫폼/계기판/톤수+부모
  토글)·달력 표시 방식을 차량마다 따로 저장. `domain/financeTypes.js`
  `subCarSettings` 필드 신설, `domain/practiceSettings.js`
  `defaultCarSettings`/`normalizeCarSettings` 추가, `AppSettingsPage.jsx`가
  `logId`로 차량 인지(제목도 "{이름} 운행일지 설정"으로). 구현 중
  `npm test`로 실제 버그 발견해 같이 수정 — `store/persistDomainSchema.js`의
  설정 허용 필드 목록에 `subCarSettings`가 없어 백업 복원 시 설정
  전체가 거부되던 문제. "결제 및 수금 입력"·"고정 노선"은 이미 매출/
  정산 계산(`financeReceivables.js`·`domain/clients.js` 등)에 쓰이는
  공용값이라 이번 범위 밖(별도 세션, 아래 "다음 할 일"·`docs/roadmap.md`
  참고). `npm test` 812개·`tsc` 0에러·CI 초록·보리 브라우저(외부)
  실검증·최종 승인 전부 완료.
- §16 슬라이스 B(미연동 기사관리 톱니바퀴 버튼 → 설정화면 라우트
  연결) `[x]` — react-app `a8115c4`. `logs/:logId/settings` 라우트
  신설(`AppSettingsPage` 재사용, 기존 `logId` 라우트 4개와 동일
  패턴), 톱니바퀴 클릭 시 뜨던 토스트를 그 라우트 이동으로 교체.
  `AppSettingsPage.jsx` 자체는 무수정(코드가 `logId`를 안 써서 그대로
  렌더됨) — 제목·보이는 값은 지금은 공용 설정 그대로(의도된 임시
  상태, 차량별 값은 슬라이스 C). `npm test` 172개·`tsc` 0에러·CI
  초록·보리 브라우저(외부) 실검증·최종 승인 전부 완료.
- §16 슬라이스 A(미연동 기사관리 톱니바퀴 버튼+프로필 카드 이름/
  전화번호 표시) `[x]` — react-app `9de8a69`. "운행일지" 칩 옆
  톱니바퀴 버튼 추가(클릭 시 토스트만, 설정화면 연결은 슬라이스 B).
  프로필 카드가 미연동 모드에서 차량번호만 보여주고 등록된 기사
  이름·전화번호를 무시하던 버그도 같이 수정. `npm test` 172개·`tsc`
  0에러·CI 초록·보리 브라우저(외부) 실검증·최종 승인 전부 완료.
- §15 운송내역서 토스트 삭제(연동/미연동 기사 관리 화면 → 운송비
  내역서 진입 연결) `[x]` — `e269e6d`. `LinkedDriverManagementPage.jsx`의
  "운송내역서" 칩이 "준비 중입니다." 토스트만 띄우던 것을 삭제하고,
  그 기사/서브차량 건으로 스코프된 `ReportPage`(운송비 내역서)로
  이동하도록 연결(`logs/:logId/report` 라우트 신설, `ReportPage`가
  `logId`로 cars/workData를 그 차량 하나로 필터링). 기존
  `/app/report`(메인 진입)는 회귀 없이 동일 동작. 원본 앱의 "메인/
  기사차량 선택 모달"은 부활시키지 않고, 이미 특정 건으로 들어와
  있는 이 화면에서 바로 그 건으로 스코프하는 방식으로 처리(보리
  확인). `npm test` 172개·`tsc` 0에러·CI 초록·보리 브라우저 실검증·
  최종 승인 전부 완료.
- §15 슬라이스 D(고정노선 "1곳 제한"을 차주 본인·연동기사 각자 스코프로
  분리) `[x]` — `10cba09`. Step 9(2026-09-05)가 연동기사 거래처를
  차주와 레코드 공유로 바꾸면서 원래 "차주 계정 1곳"이던 고정노선
  제한이 공유 배열 전체에 적용되던 문제를 `getFixedRouteClient`/
  `resolveFixedUnitPrice`/`upsertClient`/`getMonthlyDriverTotals`/
  `flattenLinkedDriverTrips`/`DayLogPage`에 스코프 인자(하위호환 기본값)
  추가로 해결. 화면 변화 없음(계산 엔진만), 새 테스트 8개로 검증.
  `npm test` 812개(도메인 640+컴포넌트 172, 이날부터 정확한 총합으로
  기록)·`tsc` 0에러·CI 초록·보리 최종 승인 전부 완료. **슬라이스 E
  (연동기사 거래처 화면에 고정노선 입력 UI 노출) 남음** —
  `docs/ui-comparison-report.md` §15 참고.
- §15 슬라이스 C(연동·미연동 거래처 화면 수정/삭제 아이콘 오른쪽 정렬)
  `[x]` — `54f9a3b`. `.management-card-inner`/`.client-card-copy`
  클래스가 3개 화면(연동·미연동 기사관리 거래처 탭·기사 계정 거래처
  메인 화면·기사직접정산 조회 목록)에서 쓰이는데 CSS 정의가 없어 flex
  정렬이 끊기던 버그, `client-management.css` 1개 파일만 수정해 해결.
  `npm test` 172개·`tsc` 0에러·CI 초록·보리 브라우저 실검증·최종 승인
  전부 완료. `docs/ui-comparison-report.md` §15 해당 항목 `[x]` 반영.
- §15 슬라이스 B(정비/주유/기타·거래처 화면 제목이 기사 이름 대신
  차량번호로 나오던 버그) `[x]` — `2a9d249`. `domain/
  driverManagementContext.js`에 `resolveDriverOrPlateLabel` 신설
  (연동기사 이름 → 서브차량 기사 이름 → 차량번호 축약 순),
  `MaintFuelPage.jsx`·`LinkedDriverClientsPage.jsx`(미연동 거래처)
  제목에 적용해 일관성 확보. `npm test` 172개·`tsc` 0에러·CI 초록·
  보리 브라우저 실검증(연동/미연동/메인 3케이스 회귀 없음)·최종 승인
  전부 완료. `docs/ui-comparison-report.md` §15 해당 항목 `[x]` 반영.
- §15 슬라이스 A(기사정산·거래처 세금계산서 배경카드+왼쪽정렬) `[x]` —
  `94e4471`/`f7e7582`. `.tax-invoice-summary`/`.driver-list-section`
  이관 누락 CSS 복원 + `.driver-section-heading` 왼쪽정렬(부수로 §12
  DriverConnectionPage도 개선) + "N건·차량번호" 굵기 통일. §6:
  200줄 넘었던 `linked-driver.css`(343줄)를 `linked-driver.css`
  (180)/`driver-connection.css`(133)/`billing-settings.css`(60) 3개로
  분리. `npm test` 172개·`tsc` 0에러·CI·Deploy 초록·보리 브라우저
  실검증(1차 지적 반영한 재검증 포함)·최종 승인 전부 완료.
  `docs/ui-comparison-report.md` §15 해당 항목 `[x]` 반영.
- side-menu.css L블록(고객센터) 분리 `[x]` — `37772c3`.
  `customer-center.css`/`notice.css` 신설(공유 클래스는 두 lazy
  청크에 각각 복제, §9 전례와 동일 방식). `npm test` 172개·`tsc`
  0에러·CI·Deploy 초록·보리 브라우저 실검증·최종 승인 전부 완료.
- §14(고객센터) 전체 `[x]` — `136efd1`. 카드 라벨(FAQ/1:1 SUPPORT/
  MY INQUIRIES) 삭제·"문의 유형" 드롭다운 글자 굵기 통일.
  `docs/ui-comparison-report.md` §14 `[x]` 반영. CI·Deploy 초록·
  `npm test` 172개·`tsc` 0에러·보리 브라우저 실검증·최종 승인 완료.
- 고정노선 운송료가 기사 정산액 계산에서 누락되는 버그 `[x]` —
  `c906ca4`. `getMonthlyDriverTotals`/`flattenLinkedDriverTrips`/
  `getLinkedDriverSettlementDetail`이 고정노선(fixedCount만 저장되고
  fare 필드는 없는 실제 day record 모양)을 단가×횟수로 계산 안 해
  소속기사 정산액·차주 기사급여 지출·세금계산서 원천그룹·드릴다운이
  0으로 나오던 버그 수정. `npm test` 172개·`tsc` 0에러·CI·Deploy
  초록·보리 브라우저 실검증·최종 승인 전부 완료.
- 소속기사 매출화면 정산액 중복표시 버그 + 라벨 변경 `[x]` —
  `63ef902`. "합계"에서 `settlementTotal` 중복 제거, 상단 카드
  월급제/매출제(%) 라벨 분기. CI·Deploy 초록·보리 브라우저 실검증
  (위 고정노선 버그 수정 후 % 표시까지)·최종 승인 전부 완료.
- §13(앱 설정) 전체 `[x]` — 테마 해/달 아이콘·횟수/금액 세그먼트 통일
  (§8 결제방식 재사용)·게스트 백업 섹션(위치·문구·시각·아이콘)·
  "기사차량 운행 일지 설정" 섹션 삭제(§15로 이월)·`app-settings.css`
  신설(side-menu.css K블록 분리) `32dcaf1`. CI·Deploy 초록·`npm test`
  170개·`tsc` 0에러·§5 리뷰·보리 브라우저 실검증·최종 승인 전부 완료.
- §12(기사연동관리) 전체 `[x]` — 슬라이스 1+2(`e079822`/`b88a5f0`) + 이름/
  전화번호 소실 버그(`2f050f0`) + 소속기사 개인정보 차주이름 덮어쓰기 버그
  (`54881c3`) + 잔여 CSS(`driver-code-row`) 분리(`3201308`). CI·Deploy
  초록·npm test 전체 통과·typecheck 0에러·보리 브라우저 실검증 전부 완료.
  `docs/ui-comparison-report.md` §12 `[x]` 반영.

> `docs/archive/`의 상세 파일들은 2026-09-15 정리됨(git 이력엔 그대로
> 있음, `git log --diff-filter=D -- docs/archive` 로 찾을 수 있음).
> 커밋 해시로 `git show <해시>` 하면 각 슬라이스 diff를 볼 수 있다.

- §11(개인정보) 전체 `[x]` — MY PROFILE 카드 삭제(원본에도 있으나
  뜬금없어 다르게 처리)·섹션 간격·계정 부제 문구·"OOO 계정으로 사용
  중입니다" 삭제·회원탈퇴 밑줄 링크 전환·`PersonalInfoPage.css` 분리
  (공유 클래스 `.personal-intro`/`.personal-inline-fields`/
  `.personal-account-btn`은 다른 화면과 공유돼 `side-menu.css`에
  유지) `9d22284`. CI·Deploy 초록·`npm test` 170개 통과·보리 브라우저
  실검증(원본과 외관 일치) 완료(2026-09-17).
- §10(운송비 내역서) 전체 `[x]` — 슬라이스 A(요약 카드 콘텐츠 정합 +
  검수반려 보완 4건) `10af31b`/`bcc6419` + 슬라이스 B(상단 카드 통합·
  4버튼 균등폭·세부내역서 버튼 유지·정보표 복원) `d751d38` + PDF 버튼
  한글 단어단위 줄바꿈(`word-break:keep-all`) `c17755f`. CI·Deploy
  초록·`npm test` 170개 통과·보리 브라우저 실검증 전부 완료. 요약·
  세부내역서 두 화면 다 일관성 맞춤(정보표 중앙정렬, 중복 타이틀
  제거, 표 중앙정렬, 총 N회 운행 상시, 상단 카드 통합).
- §9 세부 재작업 3연속 슬라이스(UI 대조 5건·거래처 카드 세로 스택+
  칩 버튼 재구성·글씨/간격/구분선/버튼폭 조정) `[x]` — `e55c044`/
  `2ac7e73`/`3e22169`, CI 초록·`npm test` 163개 통과·보리 브라우저
  실검증(원본과 외관 일치) 완료. §9 전용 CSS는 전부
  `tax-invoice.css`로 분리 완료(파일 자체 200줄 초과는 §6 예외 주석
  처리, 224줄).
- `.toggle-btn` 알약 라운드 공용 버그(§9 2곳·§3 2곳·§5·§13 총 6곳,
  `settings-segmented-control .toggle-btn`에 `border-radius: 12px` 1줄
  추가로 해결) `[x]` — `eba8eb1`, CI·Deploy 초록·보리 브라우저 실검증
  완료(6곳 전부 사각 라운드 정상 확인).
- §9 슬라이스 2(카드 액션 버튼 텍스트 깨짐 버그 — `action-icon-btn`
  오용으로 세로 깨짐, 신규 `action-text-btn` 변형 클래스로 수정) `[x]` —
  `03e1e86`(`.claude/settings.json` 권한 게이트 변경 보리 지시로 동봉),
  CI·Deploy 초록·AI 코드 리뷰(선택자 명시도 요구사항 정확 구현·
  typecheck 0에러·test 163개 통과) 완료·**보리 브라우저 실검증 완료**.
- §9 슬라이스 1(UI 대조: 공급가액 라벨·카드 상태 뱃지·탭 숫자 뱃지·
  안내박스 제목·금액 박스 + `tax-invoice.css` 분리) `[x]` — `6ee827f`,
  CI·Deploy 초록·AI 코드 리뷰(§5 7항목 이상없음, typecheck 0에러·test
  163개 통과) 완료. 브라우저 실검증은 이때만 보리 지시로 생략(§2 예외).
  시각 결과 세부 재작업은 후속 슬라이스로 예정(위 "다음 할 일").
- GitHub Pages 배포 시 배너 이미지 경로 깨짐 수정 `[x]` — `4840148`
  (Cursor 작업, `src/lib/assetPath.js` 신설), CI·Deploy 초록·AI
  코드 리뷰(§5 7항목 이상없음)·보리 브라우저 실검증 완료(2026-09-16).
- §8 정비/주유/기타 전체 `[x]` — `eda52e4`/`16ff413`/`8d9e06a`/
  `bb359b4`, CI·Deploy 초록·보리 브라우저 실검증·AI 코드 리뷰
  완료(2026-09-15).
- "원" 앞 공백 제거 `[x]` — `241d4db`/`86d805e`(2026-09-15).
- side-menu.css 분리 슬라이스 G(리포트) `[x]` — `cf54899`(2026-09-15).
- 미수금/정산 관리 UI 복원 `[x]` — `12a9dbb`(2026-09-15).
- §6 거래처 CSS 분리·수수료/파렛트 배지 `[x]` — `9bb204f`/`1a3d6aa`~
  `2065755`(2026-09-15).
- 전역 드롭다운 슬라이스 1·2 `[x]` — `9df06e2`/`88ba0fb`+`4e3aeea`
  (2026-09-15).
- §4(일일운행) A~D·E-1·F-1~F-3·디자인 토큰 `[x]` — `e65b2c0`~
  `ef82306`(2026-09-14). 남은 토글 닫기 1건은 `InlineSheet` 리팩토링
  뒤로 이월(위 "이관 완료 후 진행사항").
- §5(차량 관리) 전체·§2-1-A/B/C `[x]` — `f4de520`~`028af8e`,
  `8641be3`~`a0f6d6a`(2026-09-14, CSS 블라스트반경 문제 발견 →
  `AGENTS.md` §5 항목6 신설 계기).
- 아코디언 슬라이드·연동 기사/거래처 스코프·B그룹(산재보험료 등)
  `[x]` — `67762ff`~`0db5bde`(2026-09-11).
- Step 0~10·200줄 강제·JS→TS(JSDoc) `[x]`(잔여는 위 "보류") · 미연동
  서브차량 분리 4단계 `[x]` · `PageHeader` 통일·`side-menu.css`
  다이어트·`main-calendar.css` 분리 `[x]`.
- `ui-comparison-report.md` §1~§7 전부 `[x]`.

## 알려진 이슈 (안 고쳐도 되지만 잊으면 안 됨)

### 이관 완료 후 처리할 숙제 (UI 이관은 2026-09-19 완료 — 착수 시점은 보리 지정)

- **`ModalShell` 공용 컴포넌트 미추출** — 바깥 클릭 닫힘+`stopPropagation`
  래퍼가 9개 파일 중 8개 복붙. "이관 중 전면 리팩터 안 함" 원칙으로 보류.
- **"재감사/FAIL 지적" 주석 다이어트** — 실제 후보는
  `pendingWorkDataWritesTypes.js`(7)·`durableStorage.js`(6) 소수뿐.
- **정비/주유/기타 Supabase 동기화가 항상 "메인" 차량으로만 저장**
  (`lib/syncExpenseRecords.js`/`lib/hydrate.js`) — 서브차량 sync 루프
  고칠 때 같이 처리(백로그).
- **게스트 백업 가져오기가 `dismissedNotifications`·
  `workDataDeletedDates` 복원 안 함**(`OwnerSnapshot` 구조적 한계).
- **비용 3종 테이블 RLS** — 정책은 라이브에 존재, 마이그레이션 파일엔
  없음(필요 시 `0005`로 스냅샷화).
- DB 마이그레이션 `0001`~`0004` 라이브 적용·검증 완료 ·
  `npm run typecheck` → 0 에러.

## 저장소 상태

- **react-app**: `41f9539`까지(이관 마무리 ③, push·CI 초록·보리 최종 승인 완료).
  정확한 HEAD·미커밋 범위는 매 세션 `git status`로 확인(AGENTS §0-6).
- **ubiquitous-parakeet**: local이 origin보다 앞섬(이번 문서 정리
  커밋 포함). **AI는 push 안 함.** 정확한 HEAD는 매 세션 시작 시
  재확인(AGENTS §0-6).

## 승인의 기준 (사용자가 `[x]` 확정 전에 확인할 것)

1. **GitHub Actions "CI / verify" 초록** — 초록 아니면 `[x]` 불가.(사용자가 푸시후 확인)
2. **브라우저 실검증 완료** — 사용자만 가능.
3. **§5 리뷰 통과** — 범위·타입꼼수·몰래증설·200줄·테스트진실성·문서정합·요구사항충족.
> ※ 1·2·3은 "승인에 필요한 증거". 최종 승인(=`[x]`)은 사용자의 결정 행위. 절차 정본은 AGENTS §3·§5.
