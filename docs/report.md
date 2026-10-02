# docs/report.md — 현재 슬라이스 착수지시서

## 글씨 크기·대비 가이드라인 슬라이스 B — 파란색 대비 4.5:1 (로드맵 밖 보리 요청, 2026-10-02)

슬라이스 A(최소 글씨 12px)는 `[x]` 확정(react-app `eb183aa`, 문서 `72c3f51` — 조사 근거·A 검증은 그 커밋의 이 파일).

**현재 상태 (WCAG 보통 글씨 4.5:1 이상 필요)**
- 파란 바탕 + 흰 글씨: 다크 `#4299e1` **3.05:1**, 라이트 `#3182ce` **4.03:1** — 둘 다 미달.
- 파란 글씨: 다크(카드 `#1e1e1e` 위) 5.46:1 통과, 라이트(흰 카드 위) `#3182ce` **4.03:1** 미달.
- 다크에서 한 색으로 "흰 글씨를 얹는 바탕"과 "어두운 카드 위 글씨" 둘 다 4.5:1은 불가능 → 바탕용 색을 따로 둔다.

**목표 상태**
- `variables.css`에 버튼 바탕 전용 `--primary-fill: #2b6cb0` 추가(라이트·다크 같은 값, 흰 글씨 **5.42:1**).
- 라이트 `--primary-color` `#3182ce` → `#2b6cb0`(흰 카드 위 파란 글씨 **5.42:1**, 보리 답변 3). 다크 `--primary-color`는 `#4299e1` 그대로.
- 파란 바탕 + 흰 글씨 규칙 28곳만 `--primary-color` → `--primary-fill`(같은 규칙의 테두리색 포함).

**건드릴 파일 (`variables.css` + 17개, 값만 바꿈 — 줄 수 변화 없음, 단 `variables.css`는 토큰 1줄 추가)**
`src/variables.css` · `account-flow.css`(5곳: 로그인 기본 버튼·저장 중 버튼·426·확인 모달 버튼·538) · `controls-common.css`(2) · `shared-controls.css`(1) · `modal-form.css`(1) ·
`components/app-settings.css`(1) · `customer-center.css`(2) · `day-log/call-detail-form.css`(1) · `day-log/daily-inspection.css`(3) ·
`day-log/fixed-route.css`(1) · `documents/documents.css`(2) · `drivers/car-business-info.css`(1) · `drivers/driver-connection.css`(1) ·
`expense-form.css`(1) · `message-settings.css`(1) · `receivables/receivables.css`(3) · `revenue/revenue.css`(1) · `tax-invoice/tax-invoice.css`(1)
— 근거: `grep -rnE "background(-color)?:\s*var\(--primary-color\)" src` 30줄 중 흰 글씨(`#fff`/`#ffffff`)가 붙은 규칙만.

**안 건드릴 것**
- 글씨 없는 파란색: 사이드메뉴 점(`side-menu.css:83`)·켜짐 스위치(`account-flow.css:469`) — 글씨 대비 대상 아님.
- 다크 파란 글씨 57곳(5.46:1 통과), 비활성 버튼(WCAG 예외), 다른 색(토·일요일 색 등).

**기대 동작**
- 라이트·다크 모두 파란 버튼·선택된 탭이 조금 진해지고 흰 글씨 대비 5.42:1. 라이트 모드 파란 글씨도 조금 진해짐.
- 화면 구조·계산·저장 변화 없음.

**확인 방법**
- `npm test`·`tsc`.
- 브라우저(AI): 라이트·다크 둘 다 — 매출·서류 발급·기사 관리(저장 버튼)·일지·마이페이지·고객센터에서 파란 바탕 글씨 대비를 실제 측정(4.5:1 이상),
  다크 파란 글씨가 그대로인지, 바탕은 진한데 테두리만 밝은 곳이 없는지 확인.

**§6 200줄 / 슬라이스 크기:** 200줄 넘는 파일 5개(`account-flow.css`·`receivables.css`·`call-detail-form.css`·`shared-controls.css`·`daily-inspection.css`)는
값만 바꿔 줄 수 증가 없음, 파일 수(18개)는 AGENTS §3 기준을 넘음 — **둘 다 보리 승인 완료(2026-10-02)**.

**실패 시 처리:** 값 되돌림. 신규 레이어 없음(색 토큰 1개만 추가).

**보리 확인 (2026-10-02 답변 완료):** ① 버튼 색 진해짐 괜찮음 ② §6·파일 수 예외 승인 ③ 라이트 파란 글씨 포함.

---

### 검증 결과 (착수 승인 후, 2026-10-02) — `[~]` push·CI 대기

- `variables.css` 토큰 추가·라이트 값 변경 + 17개 파일 28곳(바탕·같은 규칙 테두리 37줄) 교체. 남은 파란 바탕은 사이드메뉴 점·켜짐 스위치뿐(`grep` 확인).
- `npm test`(unit 775+화면 250)·`tsc` 0에러.
- 브라우저(AI): 라이트·다크 × 12개 화면(매출·서류 발급·기사 관리·기사 연동·마이페이지·고객센터·미수금·거래처·설정·문자 설정·일지·유지비)
  글씨 대비 측정 — 파란 바탕 글씨 최소 **5.42:1**(라이트·다크 각 13곳), 파란 글씨 라이트·다크 모두 4.5:1 이상(라이트 섞은 바탕 위 7곳 포함 재측정 통과).
- 코드 커밋 react-app `d715368`.

- 보리 push·CI 초록(`d715368`).
- **추가(보리 지시 2026-10-02 "그것도 고쳐"):** 선택된 탭 숫자 배지(`tax-invoice.css` `.doc-scope-tab.active .tab-count-badge`) 반투명 흰 바탕 3.14:1 →
  반투명 검정 바탕 **8.59:1**. react-app `7d91eb9`(화면 테스트 250 통과) → 보리 push·CI 초록.
- **추가(보리 지시 2026-10-02 "회색 보조글씨도 기준에 맞춰"):** `--sub-text-color` 라이트 `#718096`→`#5a6778`, 다크 `#a0a0a0`→`#adadad`,
  로그인·회원가입 전용 값(`account-flow.css`)도 `#adadad`. 라이트·다크 × 16개 화면 회색 글씨 173곳 측정 미달 0(라이트 최소 5.11, 다크 최소 4.62).
  react-app `192a442` → 보리 push·CI 초록.
- §5 리뷰 7항목 통과·**최종 `[x]` 승인(2026-10-02)**.
