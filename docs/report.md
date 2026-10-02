# docs/report.md — 현재 슬라이스 착수지시서

## 글씨 크기·색 대비 가이드라인 맞추기 (로드맵 밖 보리 요청, 2026-10-02)

보리가 연동 기사 관리 화면을 보고 글씨가 작다고 느껴, AI가 WCAG·Apple HIG·Material 기준으로 쟀다.
보리가 고른 것: **② 앱 전체 최소 글씨 크기 올리기**, **③ 파란 바탕 흰 글씨 색 대비 맞추기**.
둘은 건드리는 파일 수와 위험이 달라 **슬라이스 두 개로 나눈다(A 먼저, A `[x]` 뒤에 B 지시서 확정)**.

### 조사 결과 (근거)

- 글자 크기 단계는 `src/variables.css` 한 곳에서 정함. 가장 작은 단계 `--fs-floor: 0.72rem` = **11.52px**.
  29개 파일 90곳이 이 단계를 씀(`grep -rn "fs-floor" src` 90줄). 금액·운행 내역·버튼 같은 본문에도 쓰임.
- 기준: Apple 최소 11pt(본문 17pt), Material 작은 본문 12px·가장 작은 꼬리표 11px, WCAG는 크기 대신 대비.
  → 11.52px는 Apple 하한만 넘고 Material 작은 본문(12px)보다 작음.
- 색 대비(WCAG 보통 글씨 4.5:1 이상): 파란 바탕(`--primary-color`) 위 흰 글씨가
  다크 `#4299e1` **3.05:1**, 라이트 `#3182ce` **4.03:1** — 두 모드 모두 미달.
  같은 파란색을 다크 화면 **글씨 색**으로도 57곳 쓰는데 그쪽은 5.46:1로 통과.
  다크에서 한 색으로 둘 다 4.5:1을 넘기는 건 불가능(흰 글씨용은 더 어둡게, 글씨용은 더 밝게 필요) →
  **버튼 바탕용 색을 따로 둬야 함**.

---

### 슬라이스 A — 앱 전체 최소 글씨 11.52px → 12px

**현재 상태:** `--fs-floor: 0.72rem`(11.52px).
**목표 상태:** `--fs-floor: 0.75rem`(12px, Material 작은 본문 기준). 그 위 단계(`--fs-2` 12.48px~)는 그대로.

**건드릴 파일**
- `react-app/src/variables.css` — 숫자 1개(58줄, 줄 수 변화 없음).

**안 건드릴 것**
- 다른 크기 단계(`--fs-2`~`--fs-7`) — 보리가 고른 범위가 "최소 크기"라서.
- 숫자를 직접 적은 11px 3곳·9px 1곳: `components/documents/legal-form.css`(일상점검표 법정 서식 A4 출력물 — 종이 한 장 맞춤이라 제외),
  `components/calendar/calendar-header.css:19`(알림 숫자 배지), `components/app-settings.css:85`(동그란 도움말 버튼 글자) — 배지·아이콘 글자는 Material 꼬리표 11px 기준 안.

**기대 동작**
- `--fs-floor`를 쓰는 90곳 글씨가 0.48px씩 커진다. 화면 구조·계산·저장 변화 없음.

**확인 방법**
- `npm test`·`tsc`(글씨 크기를 검사하는 테스트 없음 — 통과가 기대값).
- 브라우저(AI): 폰 너비(375px)에서 주요 화면(홈 달력·일지·매출·서류 발급·기사 관리·미수금·거래처·마이페이지·설정·고객센터)을 돌며
  가로 넘침·줄바꿈 깨짐·말줄임 새로 생긴 곳이 있는지 확인, 있으면 목록으로 보고(고치지 않고 수정 착수지시서).

**§6 200줄:** `variables.css` 58줄, 해당 없음.
**실패 시 처리:** 숫자 1개 되돌림. 신규 레이어 없음.

#### 슬라이스 A 검증 결과 (2026-10-02) — `[~]`, 수정 착수지시서 대기

- `--fs-floor` 0.72 → 0.75rem 적용. `npm test`(unit 775+화면 250) 통과·`tsc` 0에러.
- 브라우저(AI, 375px): 15개 화면(홈·일지·매출·서류 발급·기사 연동·기사 관리·미수금·거래처·차량·유지비·마이페이지·개인정보·설정·고객센터·문자 설정)에서
  두 크기를 번갈아 넣어 비교 — 가로 넘침 0곳, **한 줄 →두 줄로 바뀐 곳 2곳**:
  1. 기사 관리 "사업자·정산 계좌 정보" 스위치 설명 — "…내 사업자 기준입니 / 다." (글자 하나만 다음 줄)
  2. 마이페이지 업무 바로가기 "차량 유지비" 설명 — "월별 비용과 내 / 역"
- 원인: 두 곳 모두 한국어를 **단어 중간에서도 끊는** 기본 줄바꿈. 마이페이지 바로가기는 크기를 바꾸기 전부터
  "차량 정보와 기 / 사차량", "입금 예정과 수 / 금 관리"처럼 이미 단어 중간에서 끊기고 있었다(이번에 1곳 늘어남).

#### 수정 착수지시서 (슬라이스 A 안)

**목표:** 두 설명 글이 단어 단위(띄어쓰기 자리)에서만 줄바꿈되게. 글씨 크기는 12px 그대로.

**건드릴 파일**
- `react-app/src/components/drivers/car-business-info.css` — `.car-biz-toggle p` 한 줄에 `word-break: keep-all;` 추가(37줄, 줄 수 변화 없음).
- `react-app/src/components/mypage.css` — `.mypage-shortcut small`에 `word-break: keep-all;` 한 줄 추가(199 → 200줄).
  근거: 앱에 이미 같은 방식 5곳(`call-detail-form.css:89`·`documents.css:60·148`·`report.css:61` 등).

**안 건드릴 것:** 앱 전체(`body`)에 일괄 적용 — 모든 화면 줄바꿈이 바뀌어 다시 전 화면 확인 필요라 범위 밖.
두 클래스는 각각 그 화면에서만 쓰임(`grep`: `car-biz-toggle` → `CarBusinessInfoSection.jsx:68`, `mypage-shortcut` → `MyPage.jsx`만).

**기대 동작:** "…내 사업자 / 기준입니다.", "월별 비용과 / 내역", 기존 "차량 정보와 / 기사차량", "입금 예정과 / 수금 관리"도 단어 단위로.
**확인:** 375px에서 두 화면 다시 보기·`npm test`. **실패 시:** 두 줄 되돌림. 신규 레이어 없음.

**수정 결과 (승인 후 진행, 2026-10-02):** 두 곳 모두 단어 단위 줄바꿈 확인("…내 사업자 / 기준입니다.", "월별 비용과 / 내역",
"차량 정보와 / 기사차량", "입금 예정과 / 수금 관리"), 넘침 0. `npm test` 통과(PersonalInfoPage.typing 1개 가끔 실패 —
단독 3회·재실행 통과, 기존 알려진 현상)·`tsc` 0에러. `mypage.css` 200줄. 코드 커밋 react-app `eb183aa` → 보리 push·CI 초록·§5 리뷰 7항목 통과·**최종 `[x]` 승인(2026-10-02)**.

---

### 슬라이스 B — 파란 바탕 버튼 색 대비 4.5:1 (A `[x]` 뒤 확정)

**목표 상태:** `variables.css`에 버튼 바탕 전용 색 `--primary-fill: #2b6cb0` 추가(흰 글씨 대비 **5.42:1**, 라이트·다크 같은 값).
파란 바탕 + 흰 글씨 규칙만 `--primary-color` → `--primary-fill`로 바꿈(같은 규칙의 테두리색 포함). 글씨 색·점·스위치 등 글씨 없는 파란색은 그대로.

**건드릴 파일 (17개 + variables.css, 규칙 28곳, 값 바꿈만 — 줄 수 변화 없음)**
`account-flow.css`(로그인·확인 버튼·토스트 등 5곳) · `controls-common.css`(2) · `shared-controls.css`(1) · `modal-form.css`(1) ·
`components/app-settings.css`(1) · `customer-center.css`(2) · `day-log/call-detail-form.css`(1) · `day-log/daily-inspection.css`(3) ·
`day-log/fixed-route.css`(1) · `documents/documents.css`(2) · `drivers/car-business-info.css`(1) · `drivers/driver-connection.css`(1) ·
`expense-form.css`(1) · `message-settings.css`(1) · `receivables/receivables.css`(3) · `revenue/revenue.css`(1) · `tax-invoice/tax-invoice.css`(1)
— 근거: `grep -rnE "background(-color)?:\s*var\(--primary-color\)" src` 30줄 중 흰 글씨가 붙은 규칙만(점 `side-menu.css:83`·스위치 `account-flow.css:469` 제외).

**안 건드릴 것:** 파란 글씨 57곳(다크 5.46:1 통과), 비활성 버튼(WCAG 예외).

**§6 200줄:** 200줄 넘는 파일 5개(`account-flow.css` 549·`receivables.css` 423·`call-detail-form.css` 311·`shared-controls.css` 286·
`daily-inspection.css` 251)를 건드리지만 **값만 바꾸고 줄 수 증가 없음** — 제자리 수정 예외 승인 필요.
**슬라이스 크기:** 파일 수가 AGENTS §3 기준(1~3개)을 넘음 — 같은 값 바꾸기 한 종류라 한 슬라이스로 두는 것 승인 필요.

**보리 확인 (2026-10-02 답변 완료)**
1. 버튼 파란색이 지금보다 조금 진해짐 — **괜찮음**.
2. §6 제자리 수정 예외·파일 수 예외 — **승인**.
3. 라이트 모드 파란 글씨(`#3182ce`, 흰 카드 위 4.03:1) — **B에 넣음**: 라이트 `--primary-color`도 `#2b6cb0`(5.42:1)으로.

---

**진행:** 슬라이스 A 착수 승인(2026-10-02) → `[~]` 작업 중. B는 A `[x]` 뒤 착수 승인 받고 진행.
