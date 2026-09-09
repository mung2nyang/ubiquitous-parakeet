# STATUS — 현재 상태 한눈에

> **매 세션 이 파일부터 읽는다.** "지금 어디까지 왔나"의 정본.
> 상세 이력은 `docs/archive/audit.md`(동결, 필요할 때만 찾아봄).
> 갱신 규칙: 슬라이스 착수·완료 때마다 이 파일을 **덮어쓴다**(append 아님).
> 최종 갱신: 2026-09-09 (**`main-calendar.css` 책임 분리 1~10차 전부 `[x]` 완료**
> (이력 `docs/archive/main-calendar-css-split.md`). **이관 계획 ④(매출 탭 수치
> 불일치 조사)는 삭제 확정**(예전에 이미 죽였던 항목이 문서 사고로 되살아났던
> 것 — 상세 경위는 git 이력 `0c0dc3a` 커밋 메시지 참고).
>
> **미연동 서브차량(연동 안 된 기사차량 — 차주가 대신 일지를 쓰는 차) 데이터
> 분리 작업 — 4단계(①진입점 `0cc99c3` → ②③거래처+콜상세 연결 `17937e9`+
> `70d14f5` → ④정비/주유/기타 연결 `2f52ef4`) 전부 `[x]` 완료, 이어서 코드
> 정리 §12(헤더 중복 제거, 254→245줄) `[x]`도 완료(react-app `2c660d3`,
> 보리 승인 "승인 A" 2026-09-09). 도메인 개념 정의는 `docs/sot.md` §0.
> 상세 이력 `docs/report.md` §1~§12.
>
> **사이드메뉴 UI 정리(§1-1) 1번(순서반전)·3번(배너 이미지) `[x]` 완료**
> (react-app `c8647fc`) — CI green + 감시관 브라우저 실측(라이트·다크
> 순서 일치, 배너 토글 정확) §5 7항목 전부 통과, 보리 명시 승인
> **"승인"**(2026-09-09, `docs/report.md` §13-9). **§14(미연동 등록 시
> 기사명·연락처 필수 해제) 구현·검증 완료**(react-app `ffc4e2d`) — CI
> green + 감시관 브라우저 실측까지는 문제없었으나, **보리가 미승인 처리 —
> 착오 원인 확인 완료**(2026-09-09). 정확한 착오: `domain/cars.js`의
> `upsertCar`가 이름·연락처 검증에서 **`draft.connectMode`("기사 연동"/
> "운행 일지" 탭)를 전혀 안 봐서**, "기사 연동" 탭을 선택하고 이름·연락처
> 없이 저장해도 차단 없이 그냥 미연동 차량으로 저장돼버림 — 탭 선택이
> 무의미해짐. **§16**(정정 착수지시서, `domain/cars.js`에
> `validateDriverLinkFields` 신규 함수 + `CarListPage.jsx`의 `save()`에
> `cloud && connectMode==='link'`일 때만 막는 사전 검사 추가, `openEdit()`
> 기본값도 수정) 작성 완료, **사용자 착수 승인 대기 중**(`ffc4e2d`는
> `[~]` 유지, `domain/cars.js`의 §14 변경 자체는 되돌리지 않음 —
> `docs/report.md` §16). **§15(타이틀 통일)는 이 결정과 무관하게 보리가
> 작업자에게 바로 진행 지시 — 순서 안 기다리고 작업자가 이미 작업 중.**
> 2번(톱니바퀴/
> 세부입력 토글)은 미연동 서브차량 일지 원본대조 작업 때 함께(보리 결정,
> 2026-09-09). 4번("기사 기사 관리")은 코드 대조 결과 **원본
> `driver-link.js:29-33`도 완전히 동일한 로직**임을 확인 — 이관 버그
> 아님. **후속으로 보리가 직접 지적**: 미연동 서브차량 등록 시 기사명·
> 연락처를 무조건 필수로 막아둔 건 보리 의도가 아니었음(`domain/cars.js`)
> — ①이름·연락처 필수 해제(전화번호는 입력 시에만 형식 검증, 기사 연동/
> 초대 쪽 `domain/drivers.js`는 그대로 필수 유지) `docs/report.md` §14,
> ②그 결과 사이드메뉴·관리 화면 타이틀을 "{기사이름 또는 차량번호뒷자리}
> 기사 관리"로 통일 §15. **§15는 구현·커밋·push 완료 + 감시관 검토
> 완료**(react-app `537cd48`, 보리 push) — CI green(`CI`·`Deploy GitHub
> Pages` 둘 다 success), 감시관 정적 대조(범위 4개 파일 정확히 일치·타입
> 꼼수 0·200줄 이내·테스트 진실성) + **게스트 브라우저 실측까지 완료**
> (기사명 없음 "2222 기사 관리", 기사명 있음 "테스트기사 기사 관리",
> `notFound` "9999 기사 관리" 전부 사이드메뉴·관리화면 제목 일치 확인,
> 연동 기사 분기는 diff 미변경으로 회귀 없음 확인). **AGENTS §5 7항목
> 전부 통과 — `537cd48`은 보리 최종 승인만 남았다**(승인 문구 오면
> `[x]` 확정). 상세 `docs/report.md` §15-6~15-7. (§14/§16은 별도
> 세션에서 보리와 진행 중 — 이 갱신에서 다루지 않음.)

---

## 우선순위 원칙 (보리 지시, 2026-09-05)
**"완벽한 react 이관"이 최우선.** 매출제/월급제 전환(Step 9-A~D)은 방향성이 중요해 예외적으로
이관 중간에 끼워 넣은 새 기능이었지만, 앞으로는 **원본(`ubiquitous-parakeet`)에 있던 기능을
react-app으로 옮기는 작업(Step 10·11, 이관 로드맵 본편)을 먼저 끝낸다.** 새 방향/기능 강화
아이디어(토글, 역할전환 UI 등 원본에도 없던 것)는 이관과 무관하므로 **"이관 완료 후
진행사항"**으로 따로 모아두고, 이관 완료 전까지는 착수하지 않는다. 단, 이관 완료에 필요한
버그 수정·정합성 문제는 즉시 처리(위 슬라이스들처럼).

## 지금 하는 일

### 지금 하는 일 (2026-09-09, 미연동 서브차량 관리 진입점)

`main-calendar.css` 책임 분리 전체 완료(이력 archive), 이관 계획 ④ 삭제 확정 후
보리가 실제 버그(기사일지↔메인일지 데이터 섞임)를 직접 설명 — 미연동 서브차량
데이터 분리 작업 진행 중.

- **도메인 개념**: `docs/sot.md` §0에 "미연동 서브차량도 실제 기사가 있고 정산이
  필요하다(차주가 대신 입력할 뿐)"는 정의를 보리 설명대로 기록(2026-09-09,
  `6858c92`) — 감시관이 재조사 중 "미연동은 정산 개념 없다"고 잘못 짐작했다가
  정정받은 경위 포함.
- **1단계(관리 진입점 신설) `[x]` 완료** — react-app `0cc99c3`(정확히 지시한
  5파일: 신규 `domain/driverManagementContext.js` 53줄 + 수정 4). 기존
  `LinkedDriverManagementPage.jsx`의 정산 계산 함수들이 `link` 없이도 안전하게
  동작한다는 확인이 실데이터 실측(콜상세 300,000원 → 정산요약·세금계산서
  정확히 반영)으로도 증명됨. `linked-driver.css`는 **0줄 변경**(기존
  `.linked-driver-chip` 클래스 재사용) — 보리가 걱정하던 side-menu.css류 CSS
  거대화 없음. CI green + 감시관 §5 7항목 통과 + 보리 명시 승인 **"승인"**
  2026-09-09.
- **계획 정정(2026-09-09)**: 2단계 착수 전 재확인하다 1차 조사가 틀렸음을
  발견 — "콜상세 입력 시 새 거래처가 태그 없이 자동 생성돼 섞인다"고 했었는데,
  실제로는 **콜상세 입력에서 새 거래처가 자동 생성되는 경로 자체가 없음**(원본·
  react-app 둘 다). 진짜 문제는 `scopedToVehicleNumber`를 붙여 거래처를 만드는
  화면이 전부 연동 기사 전용이라 미연동 서브차량은 전용 거래처를 만들 방법
  자체가 없다는 것 — 즉 "2단계(태깅 버그 수정)"와 "3단계(거래처 연결)"는 같은
  작업이었음. 보리 확인·승인("좋아") — 두 단계를 "거래처 연결"로 합침.
  **정비/주유/기타**는 원래 진단 그대로 유효(저장은 `vehicleNumber`로 잘
  갈라지는데 `MaintFuelPage.jsx`가 필터 없이 다 합쳐서 보여줌, 이건 나중
  단계). **운송비 내역서**는 보리가 의도적으로 서브차량 지원을 빼놓은 것(버그
  아님). "연습운수" 미스터리는 여전히 미해결(코드 문제 아닐 가능성, 실제
  데이터 확인 필요).
- **"거래처 연결" `[x]` 완료** — react-app `17937e9`(정확히 지시한 3파일, 전부 수정
  신규 없음): 1단계의 `domain/driverManagementContext.js`를 그대로 재사용,
  `LinkedDriverClientsPage.jsx` 두 모드 지원 확장 + 라우트 1개 + 1단계 화면
  "거래처" 칩 연결선 1줄. CI green + 감시관 §5 7항목 통과 + 게스트 실측으로
  **스코프 격리 양방향 확인**(미연동 전용 화면에서 등록한 거래처가 일반
  거래처 목록엔 안 보이고, 그 반대도 안 섞임 — notFound·다크모드 포함).
- **콜상세 폼(일일 세부 일지)에 스코프 거래처 연결 `[x]` 완료**(react-app
  `70d14f5`, 정확히 3파일: `domain/clients.js`(`getClientsForLog` 신규 +
  `pinnedClients` 계약 정리)·`CallDetailForm.jsx`·`DayLogPage.jsx`
  `logId` 전달 1줄). CI green + 감시관 §5 통과 + 게스트 end-to-end 실측(메인/
  서브 일지 자동완성이 정확히 갈리고, 저장한 콜상세가 "2222 관리" 화면 정산·
  세금계산서에 정확히 집계).
- **`domain/clients.js` 185→204줄, 200줄 초과(+4) — 보리 명시 승인 완료**
  ("필요하다면 알겠어", 2026-09-09). 위 두 슬라이스(거래처 연결·콜상세 폼
  연결) 함께 `[x]` 확정. 상세 `docs/report.md` §10-4.
- **④정비/주유/기타 연결(마지막 4단계) — 구현·검증 완료, 보리 확인 대기**
  (react-app `2f52ef4`, 보리 push). 정확히 지시한 4파일(신규
  `domain/expenseScope.js` 18줄 + 수정 3)만 변경. CI green(verify·deploy) +
  감시관이 typecheck·test(154/154) 로컬 재실행 + 게스트 브라우저 실측으로
  **§11-5의 3개 시나리오 전부 확인**: (1) 메인 등록 항목이 "2222 관리"
  화면엔 안 보임 (2) "2222 관리"에서 등록한 항목이 메인 메뉴엔 안 보임
  (3) "2222" 일지 인라인으로 이미 태깅된 기존 데이터가 "2222 관리" 화면에
  정확히 합쳐 보임. `MaintFuelPage.jsx` 207줄(사전 승인한 ~205~210 범위 내).
  **⚠️ 다만 `LinkedDriverManagementPage.jsx`가 칩 연결(8줄)로 248→254줄,
  이 파일의 기존 "§6 응집도 ≤250" 예외마저 재초과(+4) — §11에서 사전 승인
  안 한 부분(감시관 실수), 보리 확인 필요.** 상세 `docs/report.md` §11-6.
  **→ 보리 결정(2026-09-09): 분할 대신 중복 제거로 줄이기 — 구현·검증 완료
  (react-app `2c660d3`, 보리 push). 254→245줄로 목표 달성, 상단 주석에
  "이번이 마지막 여유분, 다음에 또 넘기면 진짜 분리설계로 간다"는 문구도
  명문화됨. CI green + 감시관 브라우저 실측(연동·미연동 헤더·`notFound`·
  다크모드) 전부 정상.
  지시하지 않은 "정비/주유/기타" 칩 JSX 한 줄 압축이 diff에 같이 포함됐던
  건(동작 회귀 없음) — **보리 명시 승인 "승인 A"**(2026-09-09, 되돌리지
  않고 그대로 둠) — **§12(헤더 중복 제거·245줄 정리) `[x]` 완료.**
  미연동 서브차량 데이터 분리 4단계 전체(①~④) + 이번 §12 코드 정리까지
  전부 마무리. 상세 `docs/report.md` §12-6~8.
- **남은 백로그**: "정산·계산서 설정"→"운송내역서"(이름만, 공제후지급액 고정은
  별도 결정), "상세 설정"→"정비/주유/기타"(이름만, ④단계에서 연결).
  사이드메뉴 톱니바퀴 버튼 복원은 **취소** — 미연동 서브차량 일지 화면 자체
  UI 작업 때 그 화면에 넣기로 함.

---

**구 이관 계획 ③ "홈 캘린더 9/6 칩 렌더링 버그" — 계획에서 삭제
(2026-09-07, 보리 지시 "아무문제없는데 그거 계획한애가 헛소리한거니까
지워").** 착수 전 감시관이 관련 코드(`domain/calendarBadges.js`·
`CalendarGrid.jsx`·`CalendarPage.jsx`)를 읽어봐도 결함을 못 찾아 보리에게
실제 화면 재확인을 요청 → **보리가 직접 확인한 결과 홈 캘린더 지출 칩(빨간
배지)이 정상적으로 잘 보임 — 실제 버그 아님.** 1차 조사(`docs/archive/audit.md`
"1. 홈(메인 캘린더)")의 "9월 6일 칩 누락" 항목은 그 시점의 오판이었던
것으로 결론(원본 문서 자체는 동결 이력이라 안 고침, 이 정정만 기록).

**이관 계획 ③ "월간 운송료 정산" 위젯 구조 통일 — 3슬라이스(③-1/③-2/③-3)
중 ③-1 완료, ③-2 착수 전.** 배경: 원본 `updateSummary`(script.js:3529-3634)가
거래처별 매출·수수료 스냅샷·파렛트·기사차량 수수료·실운행거리·지출 3종을
전부 포함하는데, 홈 캘린더·리포트 요약 카드가 공유하던 계산 함수
(`monthWorkFareSummary`)는 이걸 다 못 담아 두 화면 다 원본과 구조가 다름.
보리가 범위를 **"캘린더+리포트 함께"**(계산 함수 통일)로 확정 → 원본 로직
크기 때문에 "한 세션에 커밋까지" 원칙(AGENTS §3)에 맞춰 3슬라이스로 분할:
③-1(신규 공용 계산 함수, 화면 연결 없음) → ③-2(캘린더 카드 연결) →
③-3(리포트 요약 화면 연결). ③-1 완료 상세는 아래 "완료" 절.

**이관 계획 ③ "월간 운송료 정산" 위젯 구조 통일 — 전체 완료.** ③-1(공용
계산 함수)·③-2(캘린더 연결)·③-3(리포트 요약 연결)·③-4(리포트 일자별 표)
전부 `[x]`, 마지막으로 ③-4가 §6 200줄 상한을 넘겨 필요했던 분리설계
슬라이스도 `[x]`(2026-09-08, 보리 명시 승인 "승인" 2회 — 기능 슬라이스·
분리설계 슬라이스 각각). 상세는 아래 "완료" 절.

**(삭제됨, 2026-09-09) ④ 매출 탭 수치 불일치·거래처/미수금 데이터 차이 원인
조사** — 위 최종 갱신 절 참고. 매출 화면 자체엔 문제 없음, 진짜 원인은
기사일지·메인일지 쪽(보리가 추후 직접 설명 예정). 아래 "원본 vs react-app
UI 전체 비교" 작업이 이어서 우선.

원본↔React UI 전수 대조 1차 조사 전체 내용(재무 숫자 불일치 등 나머지 발견 항목)은
`docs/archive/audit.md` "원본↔React UI 전수 대조 — 1차 조사" 절로 옮김(동결, 참고용).

## 지금 하는 일 (2026-09-08, CSS 책임 분리 우선)

**`react-app/src/main-calendar.css` 책임 분리 — 1차 홈 달력 전용 이동 `[x]`,
전체 해체 `[~]`.** 전수 조사·분리설계 후 작업자가 승인 범위 그대로
`main-calendar.css`의 홈 전용 규칙만 기존 `components/calendar/calendar.css`로
이동했고 보리가 push했다(`ca80554`). 변경은 이 CSS 2파일뿐이며 하단 네비·일지·
메시지·공통, `account-flow.css`·`side-menu.css`, React/Store/DB/동기화는 무변경.

- **CI/정적 대조 통과**: CI `34194765082` headSha 일치, test·typecheck·build 성공.
  PostCSS 전후 규칙 186→186, 선택자·선언·값 multiset 차이 0. 줄 수는
  `main-calendar.css` 1,081, `calendar.css` 246(사전 승인한 단일 화면 응집도 예외).
- **감시관 브라우저 직접 비교 통과**: 분리 전 `b7104e1`·후 `ca80554`의 Pages
  산출물을 동일한 배포 모드/390×844/같은 게스트 데이터로 대조. 홈 라이트·다크,
  일일운행, 문자 양식 선택창, 매출, 정비/주유/기타, 운송비 내역서,
  세금계산서, 하단 네비 캡처가 전부 바이트 단위 일치(불일치 0).
- **감시관 §5 7항목 통과 + 보리 명시 승인 “문서도 커밋 후 승인”(2026-09-08).**
  첫 슬라이스 `[x]`; 전체 책임 분리는 후속 슬라이스가 남아 `[~]`.
- **2차 메시지 선택창 CSS 분리 `[x]`.** `main-calendar.css` 692~728의
  `.message-template-*` 37줄을 신규 `components/day-log/message-template.css`로
  옮기고 `MessageTemplateSheet.jsx`가 직접 import(react-app `bafccfb`, 정확히
  지시한 3파일만 변경). CI green(3게이트) + 감시관이 분리 전(`ca80554`)·후
  (`bafccfb`)를 각각 로컬 빌드해 라이트/다크 메시지 선택창의 컴퓨티드 스타일
  11개 요소·`getBoundingClientRect()`를 문자열 비교(완전 일치)·스크린샷 육안
  대조·닫기 동작까지 실측 확인, §5 7항목 통과 + 보리 명시 승인 **"승인
  다음진행"** 2026-09-08(작업자가 push까지 완료했던 관찰도 이 승인으로 수용).
  상세 `docs/report.md` §7~§8.
- **3차 하단 네비게이션 CSS 분리 `[x]`.** `main-calendar.css` 994~1043(파일 끝,
  `.bottom-nav-bar`~`.nav-item.active`) 50줄을 신규 `src/components/bottom-nav.css`로
  옮기고 `BottomNav.jsx`가 직접 import(react-app `0be168f`, 정확히 지시한
  3파일만 변경 — 기존 2+신규 1). CI green(verify/deploy) + 감시관이 분리 전
  (`bafccfb`)·후(`0be168f`)를 각각 로컬 빌드해 라이트/다크 하단 네비 컴퓨티드
  스타일 완전 일치·탭 전환(active 상태) 동작까지 실측 확인, §5 7항목 통과.
  이번엔 작업자가 커밋까지만 하고 보리가 직접 push해 §3 절차 정상 진행.
  보리 명시 승인 **"승인/다음 진행해"** 2026-09-08. 상세 `docs/report.md` §9~§10.
- **4차 일지 정비/주유/기타(day-log-expenses) CSS 분리 `[x]`.**
  `main-calendar.css` 609~690(`.work-log-page .maint-fuel-item`~`.work-log-page
  .maint-fuel-select-inline .expense-kind-pick .modal-btn`, 82줄)을 신규
  `src/components/day-log/day-log-expenses.css`로 옮기고 `DayLogExpenses.jsx`가
  직접 import(react-app `688c3c0`). CI green + 감시관이 분리 전(`0be168f`)·후
  (`688c3c0`)를 각각 로컬 빌드해 게스트로 정비 항목 1건 추가 후 라이트/다크
  카드 컴퓨티드 스타일 완전 일치 확인, `action-icon-btn` 클래스명 겹침
  (`MaintFuelPage`)도 실제 무영향 재확인, §5 7항목 통과. 보리 명시 승인
  **"승인/다음 진행해"** 2026-09-08.
- **5차 고정노선/파렛트(fixed-route) CSS 분리 `[x]`.** `main-calendar.css`
  645~657 + 673~751(중간 공유 `.input-box`는 제외, 총 92줄)을 신규
  `src/components/day-log/fixed-route.css`로 옮기고 `DayLogPage.jsx`가
  `day-log.css` 앞에 직접 import(react-app `4fe84e8`). CI green + 감시관
  실측(운행 횟수 빠른 버튼 라이트/다크 완전 일치, 제외한 `.input-box`도
  재검증), §5 7항목 통과. 보리 명시 승인 **"승인/다음 진행해"** 2026-09-08.
- **남은 구간 재조사 — 이중 레이어 구조 발견.** 착수 전 콜상세 폼·카드·목록
  +일지 셸 구간(현재 195~815줄)을 조사하다가, `.work-log-page` 스코프
  규칙(현재 실제 적용)과 스코프 없는 bare 규칙(다수가 스코프 규칙에 덮여
  **죽은 코드**)이 이중으로 겹쳐 있는 걸 발견했다. 삭제하지 않고 그대로
  보존 이동한다는 기존 원칙(`.summary-hint` 등 전례)을 그대로 적용.
- **6차 day-log-shell.css 분리 `[x]`.** `main-calendar.css` 195~278(연속
  84줄) + 609~612(죽은 bare `.btn-group-toggle`) + 627~636
  (`.toggle-btn.active-off`+`.modal-work-details.is-off`), 총 98줄을 신규
  `src/components/day-log/day-log-shell.css`로 옮기고 `DayLogPage.jsx`가
  `fixed-route.css` import 바로 앞에 직접 import(react-app `99e6724`). CI
  green + 감시관 실측(셸 스타일 라이트/다크 완전 일치, 휴무 토글로 살아있는
  블록 재확인, 공유 규칙 보존 확인), §5 7항목 통과. 보리 명시 승인
  **"승인/다음 진행해"** 2026-09-08.
- **7차 콜 목록·일일 합계(call-detail-list) CSS 분리 `[x]`.**
  `main-calendar.css` 495~522(`.work-log-page .call-detail-daily-summary`
  등 28줄) + 558~561(bare `.call-detail-section`, 유일한 정의) +
  694~706(죽은 bare `.call-detail-daily-summary`, 보존 이동), 총 45줄을
  신규 `src/components/day-log/call-detail-list.css`로 옮기고
  `CallDetailList.jsx`가 직접 import(react-app `07346a8`). CI green +
  감시관 실측(일일 합계 카드 라이트/다크 완전 일치, 공유·인접 규칙 보존
  확인), §5 7항목 통과. 보리 명시 승인 **"승인하고 오늘작업 그만"**
  2026-09-08 — 세션 종료.
- **8차 콜상세 카드(call-detail-card) CSS 분리 `[x]`.**
  `main-calendar.css` 359~410(스코프+`.action-icon-btn` 합쳐진
  선택자)·412~493(스코프)·529~600·635~658(bare 보존) 총 230줄을 신규
  `src/components/day-log/call-detail-card.css`(217줄)로 옮기고, 합쳐진
  `.action-icon-btn`(콜상세 카드+정비/주유/기타 공유, 6차 선례대로) 18줄은
  `day-log-shell.css`로, `CallDetailCard.jsx`가 신규 CSS를 직접 import(react-app
  `a731ca1`, 정확히 지시한 4파일만 변경 — 기존 3+신규 1). CI green(verify/deploy,
  headSha 일치) + 감시관이 분리 전(`07346a8`)·후(`a731ca1`)를 각각 로컬 빌드해
  독립적으로 게스트 데이터(콜상세 카드 2건 — 수금 1·미수 1, 뱃지 2종·전화/문자
  버튼 포함)를 재현, 라이트·다크 각각 카드·헤드·노선·메타·운송료·풋·뱃지·버튼·
  토글·공유 아이콘 등 13항목 컴퓨티드 스타일을 문자열 비교해 **완전 일치**
  확인, `.action-icon-btn` 번들 CSS 중복 없음도 재확인, §5 7항목 통과. 작업자가
  커밋 후 보리가 직접 push. 보리 명시 승인 **"승인/다음 진행해"** 2026-09-09 —
  상세 `docs/report.md` §20~§21.
- **9차 콜상세 폼(call-detail-form) CSS 분리 `[x]`.**
  `main-calendar.css` 195~357(폼 스코프 전체)·396~427·430~432·
  434~436(bare/소비처 0 보존) 총 206줄을 신규 `src/components/day-log/
  call-detail-form.css`(207줄)로 옮기고, `CallDetailForm.jsx`가 직접
  import(react-app `8a93668`, 정확히 지시한 3파일만 변경 — 기존 2+신규 1).
  재조사 중 `.billing-settings-note` 클래스명이 다른 화면(BillingSettingsPage)
  에도 있는 걸 발견했으나 그쪽은 별도 파일(`linked-driver.css`)의 다른 스코프에서
  받는 걸 확인해 실제 공유 아님(예외 처리 불필요). CI green(verify/deploy, headSha
  일치) + 감시관이 분리 전(`a731ca1`)·후(`8a93668`)를 각각 로컬 빌드해 독립적으로
  게스트 데이터(콜상세 폼 전 필드 — 상하차지·운송료·톤수·시간·계기판(정상+오류)·
  플랫폼·거래처·계산서·부가세해제·입금예정일·비고, "직전 항목 복사" 버튼 포함)를
  재현, 라이트·다크 각각 25항목 컴퓨티드 스타일을 문자열 비교해 **완전 일치**
  확인, §5 7항목 통과. 작업자가 커밋 후 보리가 직접 push. 보리 명시 승인
  **"승인/다음 진행해"** 2026-09-09 — 상세 `docs/report.md` §22~§23.
- **10차(해체) 공통/공유 규칙 재배치 `[x]`.**
  `main-calendar.css`에 남았던 마지막 230줄(전부 여러 화면 공동 소비)을 신규
  `app-shell-base.css`(29줄, 테마 변수·body·컨테이너)·`shared-controls.css`
  (187줄, 날짜 이동기·요약 카드·설정 헤더·아이콘 버튼·토글·입력 기본형)로
  나누고 `App.jsx`에 전역 import 2줄 추가, `CalendarPage.jsx`·`RevenuePage.jsx`·
  `LinkedDriverManagementPage.jsx`의 개별 import 제거(react-app `18a1693`, 정확히
  지시한 8파일만 변경). 재조사 중 발견했던 `.modal-title-stack`·`.autosave-status`
  (일지 전용, 16줄)는 `day-log-shell.css`로 이동 완료. `main-calendar.css`는
  삭제 대신 "의도적으로 비어 있음" 주석 1줄만 남긴 스텁으로 보존(`inlineSheetCss.
  test.js`의 회귀 검사 유지 확인 — 감시관이 해당 테스트 단독 재실행 + 전체
  154개 테스트 통과 재확인). CI green(verify/deploy, headSha 일치) + 감시관이
  분리 전(`8a93668`)·후(`18a1693`)를 각각 로컬 빌드해 홈·일지·매출 3화면에서
  라이트·다크 각각 13항목 컴퓨티드 스타일을 문자열 비교해 **완전 일치** 확인,
  §5 7항목 통과(기사연동관리 화면은 게스트 모드 접근 불가로 감시관이 직접 못
  봄 — 보리에게 확인 요청). 작업자가 커밋 후 보리가 직접 push. 보리 명시 승인
  **"승인"** 2026-09-09 — 상세 `docs/report.md` §24~§25.
  **이걸로 `main-calendar.css` 책임 분리(§3 설계표) 1~10차 전체 완료.**
- **§1 홈 캘린더 UI 5건 — 기능 검증 완료, 전체 상태 `[~]`.** 마지막
  `b7104e1`(`white-space: nowrap`)은 CI "verify" 초록(run `34191474760`,
  headSha 일치, test·typecheck·build 성공) + 보리 브라우저 검증·승인 완료.
  감시관 §5는 7항목 중 범위·증설·타입·테스트·문서·요구사항 6개 통과,
  `main-calendar.css` 1,282줄 §6 문제만 남아 위 책임 분리로 해소 중.
- **§1-1 사이드메뉴 및 §2~13 다음 UI 수정은 CSS 책임 분리 완료 전 착수 금지.**
  `account-flow.css`·`side-menu.css` 자체 분리는 이번 범위에서 제외한다.

### 1차 조사에서 발견한 것 (요약, 상세는 `docs/archive/audit.md` "원본↔React UI 전수 대조 — 1차 조사")

- **우선 확인 필요(재무 숫자 불일치)**: 매출 화면 "전체 손익"·"기사" 탭 순이익이
  원본과 react-app에서 부호까지 반대로 나옴. 거래처 목록에 react-app에만 있는
  "연습운수", 미수금도 원본 0건 vs react-app 2건 — 셋 다 서브차량(22나2222) 관련
  데이터 처리 차이로 추정(위 audit.md 절의 §4·§6-1·§6-2).
- **원인이 좁혀진 버그**: 홈 캘린더·운송비 내역서 "월간 운송료 정산" 위젯이 원본은
  거래처별, react-app은 횟수·단가별로 다르게 집계(데이터 조회 자체는 정상 —
  위 audit.md 절의 §1·§7·§9).
- **이관 안 된 실제 기능**: 마이페이지 "문자 문구 설정"·"공지사항" — 원본엔 실제
  기능 있음, react-app은 "준비 중" 스텁이었음(공지사항은 위 "완료" 절 참고,
  `[x]` 완료됨. 문자 문구 설정은 현재 진행 중인 ②-1).
- **개별 승인 기록이 있는 건 차주 뱃지 삭제 1건뿐** — 테마 저장 위치(로컬↔클라우드)·
  서브차량 설정 배치·차량관리 라벨·기사연동관리 UI 패턴은 "이관 후 UI 정리는 나중에"
  라는 초반 방침 때문에 그대로 남아있던 것(2026-09-07 보리 정정 — 감시관이 처음엔
  "승인된 변경"으로 잘못 분류했었음, 위 audit.md 절 참고).
- **일치 확인된 화면**: 일일운행·매출(차주 탭)·정비/주유/기타·세금계산서·개인정보·
  고객센터.
- **이번엔 안 본 것**: 기사 연동 상세·Billing·미수금 상세·모든 모달·온보딩 폼 내부
  (위 audit.md 절 "다음 세션에서 이어갈 것" 참고).
- **이관 계획(보리 승인 완료, 진행 중)**: 위 "다음 할 일" 절의 최신 순서 참고.

※ **저장소 상태 (2026-09-07, 이관 계획 ① 완료 시점)**: react-app
`origin/main`=`HEAD`=`41e9fd9`(공지사항 이관), 클린. ubiquitous-parakeet 로컬
`HEAD`=`d6a3c79`(문서 갱신), **아직 미push**(감시관은 커밋만, push는 보리가).

---

**Step 11 JS→TS 전환 슬라이스 19 완료·`[x]` 확정 (2026-09-06).**
`src/lib/syncWorkData.js` — 작업자 `cc286bd`·보리 push·CI "verify" 초록(run
`34026552370`, conclusion=success, headSha 일치, test·typecheck·build 3게이트 green)·
감시관 §5 7항목 통과(diff가 §1-G와 byte 단위 일치 + 감시관이 typecheck·test·
strict-inventory 직접 재실행해 420·`syncWorkData.js(` 0줄·561/135 확인)·보리 최종 `[x]`.
- `// @ts-check` + `CarLike`/`ClientLike` 재사용 + 함수 2개 JSDoc + `record`를
  `Record<string, unknown>` 캐스팅(도메인 타입 단언 안 함 — 보리 결정, 기존 런타임 가드가
  좁힘, 신규 검증기 0) + `data.id`→`data?.id` + `upsertDailyLog` `@returns {Promise<string>}`.
- §4 필수 대상(Supabase 원격 mutation)이나 페이로드·호출 순서·에러 분기 무변경, §1-F 검증기 없음.
- strict-inventory 434→420(−14). 68→83줄.

---

**Step 11 JS→TS 전환 슬라이스 18 완료·`[x]` 확정 (2026-09-06).**
`src/domain/receivables.js` — 작업자 `f161361`·보리 push·CI "verify" 초록(run
`34022719470`, conclusion=success, headSha 일치, test·typecheck·build 3게이트 green)·
감시관 §5 7항목 통과(diff가 §1-G와 라인 단위 일치 + 감시관이 typecheck·test·
strict-inventory 직접 재실행해 434·561/135 확인)·보리 최종 `[x]`.
- `// @ts-check` + `ReceivableGroup` typedef + 함수 8개 JSDoc(`financeReceivables.js`의
  `ReceivableItemLike` 재사용). `daysUntil` `(due-today)` → `(due.getTime()-today.getTime())`
  1줄(보리 승인, `Date` 산술 강제변환이라 동작 동일).
- 순수 표시·계산 함수(저장·동기화·JSON 파싱 0) → §4 "참고" 수준, §133 무관.
- strict-inventory 465→434(−31, 27건 이 파일 + 소비처 파생 4건). 72→121줄.

---

**Step 11 JS→TS 전환 슬라이스 17 완료·`[x]` 확정 (2026-09-06).**
`src/lib/cloudStorage.js` + `src/domain/clientTypes.js` — 작업자 `87ab7fd`·보리 push·
CI "verify" 초록(run `34021045759`, conclusion=success, headSha 일치, test·typecheck·
build 3게이트 전부 green)·감시관 §5 7항목 통과(diff가 §1-G와 라인 단위 일치 + 감시관이
typecheck·test·strict-inventory 직접 재실행해 작업자 숫자 완전 일치)·보리 최종 `[x]`.
- `cloudStorage.js`: `// @ts-check` + 죽은 함수 3개 삭제(`collectPracticeSnapshot`·
  `practiceSnapshotForProfile`·`applyPracticeSnapshot` — 전 저장소 호출부 0, `store/
  owner-state.js`로 대체됨, **보리 삭제 승인**) + 남은 6개 함수 JSDoc. 126→125줄.
- `clientTypes.js`: `ClientLike`에 `taxInvoiceEnabled` 1줄 additive(착수 전 TS2339 해소).
- **§133 런타임 검증기 불필요**: `readJson` 반환을 `unknown`으로 둠(슬라이스 12·13 선례).
- 원시 helper 계층이라 단독 브라우저 검증 대상 없음 — 소비처 6파일이 CI `npm test`
  통과로 회귀 없음. strict-inventory 503→465(−38).

최근 완료: 24(taxInvoices.js+test) `3352601` · 23(outboxReconcile.js+hydrateMerge.js) `33c0420` ·
22(expenses.js) `01bcca4` — 전부 CI 초록·보리 `[x]` 2026-09-06.
슬라이스별 이력은 아래 "완료" 절.

## 다음 할 일

**`main-calendar.css` 책임 분리(보리 지시, 2026-09-08) — 전체 완료 `[x]`**:
① 전수 조사·분리설계 → ②~⑩ 홈 달력·메시지 선택창·하단 네비·일지 정비/주유/
기타·고정노선/파렛트·일지 셸·콜 목록·콜상세 카드·콜상세 폼·해체(공통/공유
규칙 재배치) 총 10개 슬라이스 — **전부 `[x]` 완료(2026-09-09, 보리 명시
승인 "승인")**. `docs/report.md` §1~§25 전체 이력.

**다음 순서**: 이관 계획 ④(매출 탭 수치 불일치 조사)는 **삭제됨**(위 최종
갱신 절 참고 — 보리가 이미 예전에 죽인 항목이 문서 사고로 되살아났던 것).

**미연동 서브차량 데이터 분리 4단계**(보리 지시, 2026-09-09): ①~④ +
후속 코드 정리 §12 전부 `[x]` 완료(위 최종 갱신 절 참고).

**사이드메뉴 UI 정리(§1-1) 진행 중**: 1번(순서반전)·3번(배너 이미지)
**`[x]` 완료**(react-app `c8647fc`, 보리 승인 "승인" 2026-09-09,
`docs/report.md` §13). 2번(톱니바퀴/세부입력 토글 메인·서브 분리)은
**보리 결정으로 이번 범위
제외** — 원본에 있던 기능이라 이관 우선순위 대상은 맞지만, 시점상
"미연동 서브차량 일지 원본대조" 작업 때 함께 진행하기로 함(아래 "후속
nit" 절에 백로그로 기록). 4번("기사 기사 관리" 중복, 연동 기사 쪽)은
**원본도 완전히 동일한 로직임을 코드로 확인**(이관 버그 아님, `domain/
drivers.js` 흐름은 이름이 항상 필수라 실질 발생 안 함) — 그대로 두기로
하고 §15에도 포함 안 시킴.
`docs/ui-comparison-report.md`의 §2~13은 **보리 확인 결과 내용이 다 틀려
폐기됨**(2026-09-09), §1·§1-1만 유효.

**후속 발견 — 미연동 서브차량 등록 검증 규칙 (보리 지시, 2026-09-09)**:
4번 조사 중 보리가 지적 — `domain/cars.js`가 미연동 서브차량(`type==='sub'`)
등록 시에도 기사명·연락처를 필수로 막아둔 건 보리 의도가 아님(진짜 필수
여야 하는 건 `domain/drivers.js`의 "기사 연동/초대" 저장뿐). **§14**(검증
해제: 이름 완전 선택, 전화번호는 입력 시에만 형식 검증) 구현까지 됐으나
**보리 미승인** — "기사 연동" 탭 선택 시 이름·연락처 없으면 여전히
차단돼야 하는데 그 관문이 빠졌던 게 원인. **§16**(정정 착수지시서 작성
완료, 사용자 착수 승인 대기 중)으로 이어감 — 상세 위 최종 갱신 절.
**§15**(사이드메뉴·"관리" 화면 제목을 "{기사이름 또는 차량번호뒷자리}
기사 관리"로 통일)는 §14 결론과 무관하게 **보리가 작업자에게 바로 진행
지시, 현재 작업자 작업 중**(감시관의 정식 착수 승인 절차 없이 진행됨 —
작업자 완료 시 §5 리뷰는 그대로 진행).

### 감시관 관찰 (미확인 — 실행 지시 아님)
- **홈 화면 하단 "{이름}님 · 달력에 횟수 기록" 문구 고정 표시 의심**(구 ③
  조사 중 감시관이 코드만 보고 떠올린 관찰, 보리에게 확인 요청한 적 없음):
  `CalendarPage.jsx` 맨 아래 이 문구가 `inputMode` 설정(횟수/금액 표시)과
  무관하게 항상 고정 텍스트로 보임. 원본엔 이 문구 자체가 없어서, 만약
  `inputMode==='fare'`인 계정이라면 "횟수 기록"이라는 표시가 실제 설정과
  안 맞을 수 있음 — 다만 구 ③처럼 오판일 가능성도 있어 **보리가 실제 화면
  확인 전까진 등재 안 함**.

미룸("이관 후 UI 정리" — 이관 로드맵 다 끝난 뒤): 테마 저장 위치, 서브차량 설정
페이지 배치, 차량관리 카드 라벨, 기사연동관리 UI 패턴.

**원본↔React UI 전수 대조에서 아직 안 본 범위**(이관 계획과 별개, 필요해지면
이어감): 기사 연동 상세·Billing·미수금 상세·모든 모달·온보딩 폼 내부 —
`docs/archive/audit.md` "원본↔React UI 전수 대조" 절 "미실시 목록" 참고.

보류 중(보리 결정 대기, 급하지 않음):
1. **`.test.js` 나머지 strict 진단 정책** — migration 원칙 "증가 금지"는 지켰으나 "전부 수정"은
   안 함. 별도로 다룰지 / 그대로 둘지 보리 결정.
2. **`.ts`/`.tsx` 확장자 실전환** — JSDoc 타입 → 실제 TS. 보리가 "이 작업 끝난 뒤 별도 단계"로
   미뤄둔 것(2026-09-05).

### 후속 nit (급하지 않음)
- **리포트 화면 자체가 메인 차량 전용**[확인: 2026-09-07, 세부 내역서 조사 중
  발견] — `AppShellRoutes.jsx`의 `report` 라우트가 `logId` 없이 고정, 원본엔 있는
  서브차량(소속기사) 리포트·기사 수수료 줄이 react-app엔 아예 없음. 원본에 있던
  기능이라 이관 우선순위 대상이지만 범위가 커서 별도 상의 필요 — 위 세부
  내역서 슬라이스와는 분리.
- **`receivables/*` 중첩 라우트 뒤로가기 `?back=` 유실**[스코프 제외로 이미 문서화,
  2026-09-07] — `ReceivablesDetailPage.jsx`가 `navigate('/app/receivables')`로
  돌아갈 때 `?back=` 쿼리를 안 들고 감. 마이페이지에서 들어가 상세까지 갔다 나오면
  그 시점부턴 홈으로 떨어짐. 드문 경로라 이번 네비게이션 슬라이스에서 안 고침.
- **사이드메뉴 "{번호} 관리" 톱니바퀴/세부입력 토글 메인·서브 분리**[확인:
  2026-09-09, `docs/ui-comparison-report.md` §1-1 2번] — 원본은 메인·서브
  차량별로 "운행 일지 세부 입력" 토글 6종(달력표시방식·결제수금·운행시간·
  플랫폼·계기판·화물톤수)을 각각 따로 갖는데, react-app은
  `practiceSettings.js` 기준 메인/서브 구분 없이 한 벌뿐 — 화면 위치만
  옮기는 수준이 아니라 서브차량 전용 데이터 필드를 새로 만들어야 하는
  작업. 원본에 있던 기능이라 이관 우선순위 대상이지만, 보리 결정으로
  "미연동 서브차량 일지 원본대조" 작업 때 함께 진행(2026-09-09).

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
- **리포트 모듈 분리설계 — §6 200줄 상한 준수**: ③-4 리뷰 중 발견된
  `ReportDetailView.jsx`(333줄)·`lib/report.js`(290줄)의 사전 승인 없는 §6
  초과를 해소. 감시관이 분리설계안 작성(요약/세부 화면 경계, 공용/요약계산/
  세부계산 경계) → 보리 착수 승인 → 작업자가 **로직 변경 없이 파일만 이동**:
  `ReportDetailView.jsx`(요약 부분)를 신규 `ReportSummaryContent.jsx`로,
  `lib/report.js`의 계산 함수들을 신규 `reportSummary.js`(`buildReportDayRows`·
  `buildMonthReport`)·`reportDetail.js`(`detailReportClientOptions`·
  `buildDetailReport`)로 분리, 소비처(`ReportPage.jsx`·`report.test.js`) import
  갱신, 테스트 파일 `ReportDetailView.test.js`→`ReportSummaryContent.test.js`
  이름 변경. `ReportShareModal.jsx`는 영향 없어 무변경. — react-app
  `602f75f`(8 files). 결과 줄수: `ReportSummaryContent.jsx` 190·
  `ReportDetailView.jsx` 143·`report.js` 69·`reportSummary.js` 99·
  `reportDetail.js` 131 — 전부 200줄 이내. (CI "verify" 초록 run
  `34180988394` conclusion=success·headSha 일치·3게이트 green·감시관 §5
  통과 — **감시관이 이동된 함수 5개·컴포넌트 조각 4개를 이동 전/후로 직접
  byte 단위 diff 대조해 로직 완전 무변경 확인**(단순 주장이 아니라 실측),
  타입 꼼수 0, `.md` 변경 0. 순수 리팩터링이라 브라우저 검증은 착수지시서
  단계에서부터 불필요로 합의) + **보리 명시 승인("승인") + `[x]` 2026-09-08**.
  상세 `docs/report.md`(다음 슬라이스 착수지시서로 리셋됨).
- **이관 계획 ③-4 — 리포트 요약 화면 "중간 일자별 표" 이관**: ③-3 브라우저
  검증 중 보리가 발견한 누락분(원본은 정보표-표-요약카드 3단 구조인데
  react-app은 표가 아예 없었음). 신규 `buildReportDayRows`(`lib/report.js`,
  이후 분리설계로 `reportSummary.js`로 이동)가 원본 `buildReportPage`의
  `workList` 규칙(레코드 없는 날 제외, `isOff`는 "휴무" 행, 작업 0건인 날
  제외, 혼짐/공차 카운트 규칙)을 그대로 포팅 — 기존 `getFixedCount`·
  `getPalletCount`·`callFareTotal`·`dayTripCount` 재사용, 새 계산기 없음.
  `ReportSummaryContent`에 정보표와 요약카드 사이 표 렌더 추가, PDF/이미지
  저장 중이면(`isExporting`) 원본처럼 표를 2단(`report-split-container`/
  `-column`, `ubiquitous-parakeet/style.css:2880-2889`와 동일 값 포팅)으로
  분할, 빈 달이면 원본 문구("해당 월의 운송 내역이 없습니다.") 표시. —
  react-app `cc5583d`(6 files). (CI "verify" 초록 run `34180303423`
  conclusion=success·headSha 일치·3게이트 green·감시관 §5 기능 리뷰 통과(원본
  로직과 대조 완료, 신규 테스트 5+4케이스 손계산 대조, 타입 꼼수 0, `.md`
  변경 0) — 단 `ReportDetailView.jsx` 333줄·`lib/report.js` 290줄로 §6 200줄
  상한을 사전 승인 없이 초과해 있어 위 분리설계 슬라이스로 해소 후 함께
  **`[x]` 2026-09-08**("승인" 2회 — 기능·분리설계 각각). `side-menu.css`
  새 한글 주석이 인코딩 문제로 `"????"`로 깨진 것 발견(③-3에 이어 2번째,
  기능 무관, 급하지 않아 보류). 상세 `docs/report.md`(다음 슬라이스
  착수지시서로 리셋됨).
- **이관 계획 ③-3 — 리포트 요약 화면을 공용 계산 함수로 연결**: `lib/report.js`의
  `buildMonthReport`가 `monthWorkFareSummary` 대신 ③-1의 `monthSettlementSummary`를
  쓰도록 교체. 착수 전 조사로 원본 리포트 화면(`buildReportPage`,
  `script.js:4789-5078`)이 캘린더 위젯(`updateSummary`)과 애초에 다른 화면임을
  발견(캘린더엔 있고 리포트엔 없는 것: 파렛트·서브차량수수료·지출3종·1회단가·
  상단타이틀 / 리포트에만 있는 것: 월간 총 운행거리, 조건 없이 항상 표시) →
  **보리 확인 → "원본 그대로"로 확정** — 리포트 화면에 파렛트·서브수수료·
  지출3종을 새로 추가하지 않음. `ReportSummaryContent`(`ReportDetailView.jsx`)를
  원본 `baseFareHtml` 순서(총 운행거리 → 기본 운송료(고정+미지정 합산 1행) →
  거래처별 매출/수수료 인덴트 행 → 부가세 → 계)로 재작성, 타이틀·1회단가·
  지출3종 행 삭제. `domain/day-record.js`의 `monthWorkFareSummary`는 프로덕션
  소비처가 0이 되지만 `workData.test.js`가 직접 단위 테스트하는 대상이라 이번
  슬라이스에서 삭제 보류(범위 확대 방지, 다음에 별도 재검토). — react-app
  `e71f82b`(6 files: `lib/report.js`+34·`ReportDetailView.jsx`+74·신규
  `ReportDetailView.test.js`+62·`report.test.js`+86·`side-menu.css`+28(캘린더가
  쓰던 `.summary-client-commission-*` 클래스를 `.report-page-wrap` 스코프로
  재사용, 새 클래스 발명 아님)·`TaxInvoicePage.workInvoiceSoT.test.js`(착수지시서
  밖 파일이었으나, 요약 화면에서 삭제된 "횟수 N회" 문구를 검증하던 기존 SoT
  리마운트 테스트가 새 화면 구조에 맞춰 불가피하게 갱신된 것으로 확인 — 검증
  대상은 그대로, 금액 어서션 추가로 오히려 더 엄격해짐, 문제 없음)). (CI "verify"
  초록 run `34179530108` conclusion=success·headSha 일치·3게이트 green·감시관
  §5 7항목 통과(diff가 지시서와 정확히 일치, 지시서 밖 파일 2개는 사유 확인
  완료, 타입 꼼수 0, `.md` 변경 0, 241/244줄 §6 이내, 신규 테스트 5케이스(손계산
  4+렌더 1) 전부 실제 값 대조, 기존 테스트 삭제·약화 0건)+**보리 브라우저
  실검증 통과 + `[x]` 2026-09-08("승인")**). 발견한 사소한 흠(기능 무관):
  `side-menu.css` 새 한글 주석이 인코딩 문제로 `"????"`로 깨짐 — 급하지 않아
  보류. 상세 `docs/report.md`(다음 슬라이스 착수지시서로 리셋됨).
- **이관 계획 ③-2 — 캘린더 카드를 공용 계산 함수로 연결**: `CalendarPage.jsx`가
  ③-1의 `monthSettlementSummary`를 쓰도록 교체 — 거래처별 매출/수수료 행·
  파렛트 행·기사차량 수수료 행·거리 행(메인만, 서브는 `subDistanceOn` 설정
  자체가 없어 미이관)·지출 3종(정비/주유/기타, 지금까지 카드에 아예 없던
  행) 렌더링 추가, 기존 `getOwnerMonthlyFinanceDetail` 경유 합산
  `commissionTotal`(안 쓰게 된 `useOwnerProfile`/`useOwnerDrivers` 구독
  2개 포함) 제거 — 보리 확인("원본대로") 반영. 부가세 계산도 원본대로
  (flat 10%, `vatExempt` 미고려)로 바뀜. 원본 수수료 들여쓰기 CSS를
  `.main-page` 스코프로 포팅. — react-app `e00a004`(5 files). 브라우저
  검증 중 보리가 발견한 원본 불일치 3건, 전부 같은 슬라이스 수정 커밋으로
  반영:
  1. `3045c45` — 정산 카드 제목이 원본 "총 N회 운행"이 아니라 "횟수 N회 ·
     세부 입력 M건"으로 돼 있던 것 수정, 원본에 없던 하단 안내 문구
     ("{이름}님 · 달력에 횟수 기록")·로그아웃 버튼("처음으로 돌아가기",
     원본 로그아웃은 개인정보 페이지 1곳뿐임을 감시관이 확인) 제거.
  2. `74e90ae` — 정비/주유/기타 지출 3행에 원본엔 있던 아이콘(렌치/주유기/
     목록)·색상(주유비 `--primary-color`, 기타 `--sunday-color`)·위쪽
     점선 구분선이 빠져 있던 것 발견(감시관이 원본 static 서버·react-app
     dev 서버를 동시에 띄우고 보리가 보낸 주석 캡처와 원본
     `index.html:481-508`·`style.css:364-378`을 대조해 정확한 수정 지시문
     작성) + "기사차량 수수료 → 파렛트" 행 순서도 원본과 맞춤. 신규
     `.inline-icon`/`.inline-icon.sm` CSS 유틸리티 추가.
  네 커밋(`e00a004`/`3045c45`/`74e90ae`+아래 `showToast` 관련은 커밋 아님)
  전부 CI "verify" 초록(3게이트 green)·감시관 §5 7항목 통과(diff가
  지시서·수정 지시문과 정확히 일치, 타입 꼼수 0, `.md` 변경 0, 138/127줄
  (§6 이내), 신규 `CalendarMonthSummary.test.js`(아이콘·색상·순서 케이스
  포함)+기존 `CalendarPage.test.js` 갱신 전부 실제 렌더 결과 대조).
  `showToast: _showToast` 구조분해(지시서 밖 손질)는 작업자 확인 결과
  정당한 사유(재작성 중 빠뜨렸던 부모(`MainPageRoute.jsx`) 호환 prop을
  복구한 것, 동작 무변화)로 결론 — 별도 조치 불필요. 미세한 색상 차이
  1건(추정: 테마별 `--primary-color`/`--sunday-color` 실제 값 차이)은
  보리가 확인 후 의도적으로 수용[확인: 2026-09-08], 추가 수정 안 함.
  ⚠️ **감시관이 보리의 애매한 상태 보고("검증완")를 명시 승인으로
  잘못 해석해 한 번 `[x]`로 오기했다가 보리가 즉시 정정한 사례 있음**
  ([[watchdog-explicit-approval-only]] 메모리 기록) — 이후 실제 문제
  확인→수정→**보리 명시 승인("응 확정")** 받고 `[x]` 2026-09-08. 상세
  `docs/report.md`.
- **이관 계획 ③-1 — "월간 정산" 공용 계산 함수**: 신규
  `domain/monthSettlement.js`의 `monthSettlementSummary(workData, year,
  month, options)` — 원본 `updateSummary`(script.js:3529-3634)+호출부
  루프(script.js:3330-3436)를 1:1 포팅(거래처별 매출·수수료(고정노선+
  콜상세 통합)·파렛트·기사차량 수수료·실운행거리(콜상세 distanceKm 있으면
  합산, 없으면 `dailyDistance` 폴백)·지출 3종(차량 매칭, `expensesForVehicleDay`와
  같은 동등비교 규칙 재사용)·부가세·합계). 기존 `getFixedRouteClient`/
  `resolveFixedUnitPrice`/`getCallDetailCommissionAmount`/
  `calculateDriverVehicleCommission`/`countCallTrips`/`monthTotal` 재사용,
  새 계산기 발명 0. **아직 어느 화면에도 연결 안 함**(③-2/③-3에서 연결) —
  이번 슬라이스만으로는 브라우저에서 보이는 변화 없음. —
  react-app `63d48e3`(2 files: `monthSettlement.js`+155·
  `monthSettlement.test.js`+246, 8케이스). (CI "verify" 초록 run
  `34175418374` conclusion=success·headSha 일치·3게이트(test·typecheck·
  build) green — 작업자 로컬 `npm run build`가 클린 트리에서도 크래시났다고
  보고했으나 CI 빌드는 정상 통과해 무관한 로컬 환경 문제로 확인·감시관 §5
  7항목 통과(diff가 지시서와 정확히 일치(함수 시그니처·반환 필드·업무 규칙
  전부 원본과 대조 완료), 타입 꼼수 0, `.md` 변경 0, 155줄 §6 이내, 테스트
  8케이스 전부 손계산 기대값과 대조하는 실제 검증(회귀 케이스 "메인/서브
  지출 섞여도 분리" 포함), `financeOwnerDetail.js`(오너 손익용, 스코프·비용
  소스 다름) 등 기존 파일 전부 무변경 확인) + `[x]` 2026-09-08). 화면 연결이
  없는 순수 함수 슬라이스라 브라우저 실검증 대상 없음 — CI+§5 리뷰만으로
  완료 조건 충족, 보리 별도 브라우저 확인 불필요. 상세 `docs/report.md`.
- **이관 계획 ②-4 — 리포트 카카오톡/문자 공유 모달(이관 계획 ② 전체 완료)**:
  리포트 화면 "공유" 버튼 → 모달(카카오톡 Web Share API / 문자 SMS, 각각
  PDF·이미지 선택) — 원본 `openReportShareModal`/`shareReportToKakaoTalk`/
  `shareReportBySms` 이관. 신규 `lib/reportExport.js`(html2canvas/html2pdf로
  File 생성, `ReportPage.jsx`의 기존 PDF/이미지 핸들러는 안 건드리고 별도
  모듈로 분리) + `components/ReportShareModal.jsx`(로컬 state 0개 — `onClose`가
  즉시 부모를 언마운트시키므로 그 뒤에 `setState` 호출 금지 원칙 지킴) +
  `ReportShareModal.test.js`(`mock.module`로 `reportExport.js` 목킹, 5케이스:
  렌더 구조·SMS 연락처 없음 alert·카카오 미지원 안내·**카카오 지원 시
  ②-1 커스텀 공유 문구가 `navigator.share` text에 그대로 반영됨(연결 증명)**·
  `buildReportSmsUrl` UA 분기). `lib/messageTemplates.js`
  +`fillReportShareMessagePattern`, `lib/report.js`+`getReportShareCompanyName`/
  `getDetailReportClientContact`(원본 전역변수 참조를 인자로 받는 순수
  함수로 전환). SMS 실제 전송(`window.location.href`, `URL.createObjectURL`)
  은 jsdom이 못 다뤄 순수 함수 분리 테스트+브라우저 검증으로 커버(선례
  ②-2와 동일 판단). — react-app `7a5131a`(9 files). `lib/report.js`(239줄)·
  `ReportPage.jsx`(240줄) 둘 다 §6 250줄 한도 근접, 다음에 또 손대면
  분리설계 필요함을 문서에 기록. (CI "verify" 초록 run `34113495368`
  conclusion=success·headSha 일치·3게이트 green·감시관 §5 7항목 통과(diff
  9개 파일 전부 지시서와 byte 단위 일치, 타입 꼼수 0, `.md` 변경 0, 기존
  act 경고 3건 그대로(신규 테스트가 새로 안 만듦))+감시관이 typecheck·test
  (604+147)·build 직접 재실행 — **보리가 작업완료+push+CI확인+브라우저확인을
  한 메시지로 한 번에 보고, 감시관이 커밋 존재·CI 실행·diff 내용을 전부
  사후 재확인** + `[x]` 2026-09-07). 상세 `docs/report.md`(다음 슬라이스
  착수지시서로 리셋됨).
- **이관 계획 ②-3 — 리포트 이미지 저장 버튼**: 리포트 화면(요약/세부)에
  "PDF 다운로드" 옆 "이미지 저장" 버튼 추가 — 기존 `handleDownloadPdf`와
  같은 `exportRef`/`pdf-export-mode` 토글 패턴으로 html2canvas 캡처 후 PNG
  다운로드. 신규 `buildReportImageFileName`/`buildDetailReportImageFileName`
  (`lib/report.js`, 기존 PDF 파일명 함수를 `.pdf`→`.png` 치환으로 재사용,
  로직 중복 없음). — react-app `79e549e`(3 files: `report.js`+20·
  `ReportPage.jsx`+53·`report.test.js`+16). 두 파일 다 200줄 초과 예상돼
  지시서에 §6 예외 사유주석 사전 명시 → 작업자가 실제 줄수(217/225)로
  정확히 반영해 작성. (CI "verify" 초록 run `34110355929` conclusion=success·
  headSha 일치·3게이트 green·감시관 §5 7항목 통과(diff가 지시서와 byte
  단위 일치, `worker.get('canvas')`/`new Promise` 반환값을 `HTMLCanvasElement`/
  `Blob`로 안전하게 좁힌 캐스팅 확인, 타입 꼼수 0, `.md` 변경 0)+감시관이
  typecheck·test(600+142)·build 직접 재실행 — **보리가 push+CI초록+브라우저
  검증을 한 메시지로 한 번에 보고해, 감시관이 커밋 존재·CI 실행·diff 내용을
  전부 사후 재확인하는 방식으로 진행** + `[x]` 2026-09-07). 상세
  `docs/report.md` §6(다음 슬라이스 착수지시서로 리셋됨).
- **이관 계획 ②-2 — 콜상세 문자보내기 3종 복원 + ②-1 설정 반영**: 콜상세
  "문자 보내기" 시트(`MessageTemplateSheet.jsx`)가 "미수금 안내" 1종만
  하드코딩돼 있던 것을 원본처럼 3종(미수금 안내/입금 요청/운행 완료)
  선택 시트로 재작성 + ②-1이 저장한 커스텀 문구를 실제로 반영(`getMessageTemplatePatterns`
  재사용) + 문구 미리보기를 실제 채워진 텍스트로 복원(기존 react-app은
  일반 설명 문구만 보여주던 축약이 있었음). 신규 `fillMessageTemplatePattern`
  (`lib/messageTemplates.js` +12줄) + 신규 `MessageTemplateSheet.test.js`
  (154줄, 4케이스). `CallDetailCard.jsx`/`DayLogPage.jsx`는 이미 올바르게
  배선돼 있어 무변경. — react-app `a03d983`(3 files). (CI "verify" 초록 run
  `34107868770` conclusion=success·headSha 일치·3게이트 green·감시관 §5
  7항목 통과(diff가 지시서와 byte 단위 일치, 신규 테스트 4케이스가 ②-1
  설정값 실제 반영을 증명, `buildTemplateSmsUrl` 순수 함수로 분리해 jsdom
  SMS 스킴 네비게이션 미지원 문제 우회, 감시관이 typecheck·test(598+142)·
  build 직접 재실행, act 경고 3건은 이전 커밋으로 되돌려 재현해 기존
  이슈임을 확인)·보리 브라우저 실검증 통과 + `[x]` 2026-09-07). 상세
  `docs/report.md` §6(다음 슬라이스 착수지시서로 리셋됨, git 이력 `84c970b`
  참고).
- **이관 계획 ②-1 — 문자 문구 설정 이관(설정화면만)**: 마이페이지 "문자 문구
  설정"(`onOpen('soon', ...)` 스텁)을 실제 화면으로 이관 — 원본 4문구(미수금
  안내/입금 요청/운행 완료/내역서 공유) 편집·저장·초기화 그대로 포팅. 신규
  `lib/messageTemplates.js`(55줄, get/save/reset + 기본값)+`messageTemplates.test.js`
  (84줄, 5케이스)+`MessageSettingsPage.jsx`(112줄) + `side-menu.css` +12·
  `lazyPages.js`·`AppShellRoutes.jsx`·`MyPage.jsx` 각 1~2줄. **착수 전 조사로
  콜상세 문자보내기 시트가 "미수금 안내" 1종만 있고 리포트 공유 기능은
  아예 없음을 발견해 보리에게 스코프 질문 → "설정화면만 우선"으로 확정** —
  이번 슬라이스가 저장한 문구는 아직 어디에도 소비 안 됨(②-2/②-3에서 연결
  예정, 브라우저 검증 시 정상 동작으로 안내됨). — react-app `a833280`(7
  files). (CI "verify" 초록 run `34106103395` conclusion=success·headSha
  일치·3게이트 green·감시관 §5 7항목 통과(diff가 지시서와 byte 단위 일치,
  신규 테스트 5케이스가 실제 localStorage로 검증, 타입 꼼수 0, `.md` 변경 0,
  감시관이 typecheck·test(598+138)·build 직접 재실행, 빌드 중 `css-syntax-error`
  경고는 이전 커밋에도 있던 무관한 기존 이슈로 직접 대조 확인)·보리 브라우저
  실검증 통과 + `[x]` 2026-09-07). 상세 `docs/report.md` §6(다음 슬라이스
  착수지시서로 리셋됨, git 이력 `03e14ae` 참고).
- **이관 계획 ① — 공지사항 이관**: 마이페이지 "공지사항"(`onOpen('soon', ...)`
  스텁)을 실제 화면으로 이관 — 원본 공지 3건(제목·날짜·본문)을 그대로 옮긴 신규
  `NoticePage.jsx`(65줄, 기존 `CustomerCenterPage.jsx`의 `.support-card`/
  `.faq-item` 아코디언 패턴 재사용, 새 CSS 0개). — react-app `41e9fd9`(4 files:
  신규 `NoticePage.jsx` + `lazyPages.js`·`AppShellRoutes.jsx`·`MyPage.jsx` 각
  1~2줄). (CI "verify" 초록 run `34103326120` conclusion=success·headSha 일치·
  3게이트 green·감시관 §5 7항목 통과(diff가 지시서와 정확히 일치, 원본
  `index.html:713-723`과 직접 대조해 텍스트 100% 일치 확인, 감시관이 typecheck·
  test(593+138)·build 직접 재실행) + **작업자가 처음 보고했을 때 실제로는 커밋
  전이었던 것을 감시관이 `git status`로 발견해 절차 정정 지시한 사례 기록**(작업자
  "CI 통과"는 로컬 3게이트 실행이었을 뿐, 실제 push·GitHub Actions는 그 뒤 별도로
  진행됨)·보리 브라우저 실검증 통과 + `[x]` 2026-09-07). 상세 `docs/archive/audit.md`
  로 이관 예정(당장은 git 이력 `9a92703`·`d6a3c79` 참고).
- **관리 화면 공통 네비게이션 정합성**: A) 뒤로가기 — 마이페이지에서 들어간 화면
  (차량·거래처·정비·미수금·내역서·세금계산서·개인정보·앱설정 8곳 + 기사연동관리
  1곳)에서 뒤로가기 시 무조건 메인으로 가던 버그를 왔던 곳(마이페이지/메인)으로
  복귀하도록 수정 — `goToPage`가 `?back=` 쿼리 추가(`ComingSoonRoute.jsx` 기존
  패턴 재사용), `AppShellRoutes.jsx`가 이를 읽어 `backTarget` 계산. B) 신규 차량
  등록 후 "오늘 일지"로 자동 이동하던 것(원본엔 없는 동작)을 삭제, 원본처럼 차량
  관리 목록에 그대로 머물도록 변경(번호 변경 시 `fromLog` 복귀 로직은 그대로 유지).
  — react-app `eb734e7`(4 files: `AppShell.jsx`·`AppShellRoutes.jsx`·
  `CarListPage.jsx`·`App.clientsCars.test.js`, 테스트 1개 동작 재작성). (CI "verify"
  초록 run `34086676997` conclusion=success·headSha 일치·3게이트 green·감시관 §5
  7항목 통과(`npm run typecheck` 0건·`npm test` 593+138 직접 재실행 확인, diff
  라인 단위로 지시서 8+1개 라우트 전부 대조)·보리 브라우저 실검증 통과 + `[x]`
  2026-09-07). 상세 `docs/report.md` §6.
- **세금계산서 화면 "엑셀 저장" 버튼 이관**: 원본 `exportTaxInvoiceCsv`
  (`finance.js:494-709`) 포팅 — 카드마다 "엑셀 저장" 버튼, 워크북 2시트(공식
  전자세금계산서 양식 + 홈택스 업로드용 "입력자료"), 파일명 규칙. 기존
  `getTaxInvoiceSupplierBiz`·`invoiceCanIssue`(둘 다 다른 화면용, 재사용) 그대로
  써서 새 검증기·사업자 판별 로직 안 만듦. 신규 npm 의존성 `exceljs`(동적
  import, `html2pdf.js`와 같은 패턴). 워크북 빌더를 순수 함수로 분리해 셀 값
  단위 테스트 가능. — react-app `023e17c`(6 files: `package.json`+exceljs, 신규
  `taxInvoiceExcelBuilder.js`(+test)·`taxInvoiceExcel.js`, `TaxInvoicePage.jsx`,
  `TaxInvoiceEntryList.jsx`). (CI "verify" 초록 run `34084548569`
  conclusion=success·headSha 일치·3게이트 green·감시관 §5 통과(지시서와 정확히
  일치, `taxInvoiceExcelBuilder.js` 249줄·`TaxInvoicePage.jsx` 206줄 둘 다 §6
  예외 사유주석 확인, 신규 6테스트가 지시서 §2 시나리오 전부 커버, 타입 꼼수 0,
  `.md` 변경 0, `npm run typecheck` 0건·`npm test` 593+138 직접 재실행 확인)·
  보리 브라우저 실검증 통과 + `[x]` 2026-09-07). 상세 `docs/report.md`.
- **리포트 거래처별 세부 내역서 뷰 이관**: 원본 `viewDetailReport`(`script.js:5080-5338`)
  포팅 — 거래처 선택 모달 → 세부 표(날짜/상차지/하차지/거래처/금액) + 거래처별
  기본 운송료·수수료 차감·부가세·계 요약, PDF 다운로드도 현재 보이는 모드
  그대로 내보냄(파일명에 거래처명/전체 반영), 뒤로가기는 세부→요약→이전화면.
  기존 `getCallDetailCommissionAmount`(다른 화면용, 재사용) 그대로 사용해 새
  커미션 계산기 안 만듦. 서브차량 기사 수수료 줄·PDF 15건 초과 2단 분할은
  스코프 제외(아래 "후속 nit" 참고). — react-app `d5e4a0c`(5 files: `lib/report.js`
  +3함수, 신규 `ReportDetailView.jsx`, `ReportPage.jsx`, `report.test.js`,
  `side-menu.css`). (CI "verify" 초록 run `34083255631` conclusion=success·
  headSha 일치·3게이트 green·감시관 §5 통과(지시서와 정확히 일치, `ReportDetailView.jsx`
  220줄 §6 예외 사유주석 확인, 신규 6테스트, 타입 꼼수 0, `.md` 변경 0, `npm run
  typecheck` 0건·`npm test` 588+138 직접 재실행 확인)·보리 브라우저 실검증
  통과 + `[x]` 2026-09-07). 상세 `docs/report.md`.
- **서브 일지 지출 목록 차량 필터 (987be18 재오픈 수정)**: `DayLogPage.jsx`가
  일지 열었을 때 보여주는 정비/주유/기타 목록이 날짜만 걸렀지 차량은 안 걸러서,
  서브차량 일지에 메인(또는 다른 서브) 지출까지 섞여 보이던 버그. `calendarBadges.js`에
  `dayExpenseBadgeLabel`과 같은 매칭 규칙의 순수 함수 `expensesForVehicleDay` 추가 +
  `DayLogPage.jsx` 1줄 교체. — react-app `f45d198`(3 files, calendarBadges.js·
  DayLogPage.jsx·calendarBadges.test.js). (CI "verify" 초록 run `34081629739`
  conclusion=success·headSha 일치·3게이트 green·감시관 §5 통과(지시서와 정확히
  일치, 신규 4테스트 중 "같은 날짜 메인·서브 동시 존재해도 안 섞임" 핵심 회귀
  케이스 포함, `npm run typecheck` 0건·`npm test` 581+138 직접 재실행 확인)·
  보리 브라우저 실검증 통과 + `[x]` 2026-09-07). 이걸로 987be18 재오픈 건도
  최종 `[x]` 확정. 상세 `docs/report.md` §8.
- **메인 캘린더 지출 칩 복원**: react-app에 통째로 안 이관돼 있던 `.maint-badge`
  계산·렌더·CSS를 복원 — `/app` 메인 캘린더 날짜 셀에 그 날짜 지출 합계가 빨간
  칩으로 표시됨. — react-app `39b9677`(7 files). (CI "verify" 초록·감시관 §5
  7항목 통과(typecheck 0·565/137)·보리 브라우저 실검증 통과 + `[x]` 2026-09-07).
- **차량 등록 모달 "기사연동/운행일지" 탭 버그 수정**: 신규 서브차량 등록 시
  "운행 일지" 탭이 죽은 게이트로 막혀 있었고, 탭 선택과 무관하게 저장 시 항상
  기사 초대(pending)가 생성돼 사이드 메뉴 "일지" 항목이 사라지던 버그. 탭 상태를
  `draft.connectMode`로 승격해 저장 로직까지 전달, 신규 등록에서 "운행 일지"를
  선택하면 `saveInviteAfterVehicle` 호출을 건너뜀. — react-app `0c0ffd1`(6
  files)+`a01cb9f`(테스트 2건 복원, 상세 `docs/report.md` §6~7 정정 참고).
  (CI "verify" 초록 run `34080479095` conclusion=success·headSha 일치·3게이트
  green·감시관 §5 통과·`npm run typecheck` 0건·`npm test` 577+138 직접 재실행
  확인·보리 브라우저 실검증 통과 + `[x]` 2026-09-07). ⚠️ 이 슬라이스는 감시관이
  §1 역할(코드는 작업자만)을 벗어나 직접 구현했고 이를 정당화하는 허위 사용자
  승인 기록까지 남겼던 건 — 보리가 발견해 정정(코드는 유지, 문서만 정정, 재발
  방지 조항 추가). 상세 `docs/report.md` 상단 정정 문구·`STATUS.md` git 이력
  (`2a6825b`).
- **서브 차량 지출(정비/주유/기타) 칩 이관 — 1단계**: `ExpenseItem.vehicleNumber`
  옵션 필드 + 일지 인라인 입력 자동 태그(`useExpenseForm.js`가 `logId` 받음) +
  캘린더 칩 메인/서브 분리 합산(`dayExpenseBadgeLabel` 3번째 인자) + hydrate 3곳
  `raw.vehicleNumber` 복원(`fuelRecords.js`·`maintenanceRecords.js`·
  `miscExpenseRecords.js`). Supabase 쓰기 루프·`vehicle_id` 조회 쿼리는 무변경(2단계
  백로그, 급하지 않음 — "알려진 이슈" 참고). — react-app `987be18`(16 files).
  (CI "verify" 초록 run `34076822470` conclusion=success·headSha 일치·3게이트
  green·감시관 §5 7항목 통과(범위·증설·타입·200줄·테스트진실성·문서정합·요구사항
  전부 확인, `expenses.js` 200줄 정확히·`wc -l`로 작업자 자체보고 오류 정정)·
  감시관이 보리 실계정 로그인 상태로 직접 브라우저 조작해 4단계 실검증(메인/서브
  칩 분리·수정 후 태그 유지·재조회 후 유지, 테스트 데이터 삭제로 원상복구)·보리
  `[x]` 2026-09-07). 상세 `docs/report.md` §0~5.
  **⚠️ 이 `[x]`는 한때 무효 처리됐었음** — 브라우저 검증 당시 못 잡았던 누락
  (일지 지출 목록이 차량별로 안 걸러짐)이 나중에 드러나 재오픈됐고, 위 "서브
  일지 지출 목록 차량 필터 (987be18 재오픈 수정)" 항목(`f45d198`)으로 해소되어
  다시 `[x]` 확정됨(2026-09-07).
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
- **회원탈퇴 기능**: 원본 `requestWithdrawal`/`executeAccountWithdrawal` 이식 — 2단계 `ConfirmModal` 확인 → `delete_own_account` RPC → 성공 시에만 기존 `App.jsx handleLogout`(`onGoAuth`) 재사용, 실패 시 토스트만(로컬 무변경). 신규 `lib/accountWithdrawal.js`(23줄)+테스트, `PersonalInfoPage.jsx`(197줄)+테스트. — react-app `9e381d1`. (CI 초록·감시관 §5 전 항목 통과·브라우저 통과·보리 `[x]` 2026-09-05). 상세 `docs/report.md` §3~4.
- **Step 11 슬라이스 1 — `AuthPage.jsx` 200줄 분리**: intro/login/signup 3화면을 `components/auth/`(`AuthIntroView.jsx` 29줄·`AuthLoginView.jsx` 93줄·`AuthSignupView.jsx` 105줄·`AuthBackIcon.jsx` 6줄)로 분리, `AuthPage.jsx` 284→146줄(핸들러·API 그대로 유지). — react-app `3256d5e`. (CI 초록·감시관 §5 전 항목 통과(로직·문구·CSS 라인 단위 대조, byte-identical)·브라우저 통과·보리 `[x]` 2026-09-05). 상세 `docs/report.md` §3~4.
- **Step 11 슬라이스 2 — `App.jsx` 200줄 분리**: 세션/부트/토스트 state+이펙트+`handleLogout`을 신규 훅 `app/useAppSession.js`(137줄)로 추출, `App.jsx` 239→147줄(인라인 핸들러는 유지). — react-app `6cec49a`. (CI 초록·감시관 §5 전 항목 통과(이펙트·주석·핸들러 라인 단위 대조, byte-identical)·브라우저 통과·보리 `[x]` 2026-09-05). 상세 `docs/report.md` §3~4.
- **Step 11 슬라이스 3 — 200줄 초과 3파일 §6 예외주석**: `domain/cars.js`(219)·`lib/dayLogCloudCommit.js`(209)·`domain/day-record.js`(207) — 실제 분리 대신 왜 안 쪼개는지 사유 주석 1줄씩만 추가(코드 로직 무변경, +3 insertions 0 deletions). — react-app `941d3ab`. (CI 초록·감시관 §5 전 항목 통과(diff 전체 대조로 "코드 변경 없음" 확인)·보리 `[x]` 2026-09-05, 주석만 변경이라 브라우저 검증 대상 없음). 상세 `docs/report.md` §0·§3~4.
- **Step 11 슬라이스 4 — `store/ownerDataHooks.js` 200줄 분리**: 기존 배럴 재수출 패턴을 이어 "일지 데이터" 훅 6개를 신규 `store/ownerWorkDataHooks.js`(81줄)로 분리, `ownerDataHooks.js` 204→138줄. 소비 파일 17개 전부 import 경로 무변경. — react-app `e6e41b9`. (CI 초록·감시관 §5 전 항목 통과(JSDoc·주석·로직 라인 단위 대조, byte-identical)·브라우저 통과·보리 `[x]` 2026-09-05). **이걸로 Step 11의 "200줄 강제" 부분 전체 완료**(초과 파일 9개 전부 처리: 분리 2·예외주석 3·기존예외 1·배럴분리 1 — 회원탈퇴는 별건). 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 1 — 비용 레코드 3파일**: `domain/fuelRecords.js`(128줄)·`maintenanceRecords.js`(122줄)·`miscExpenseRecords.js`(119줄)에 `// @ts-check` + JSDoc 타입 완성(`ExpenseItem` 재사용), 로직 무변경. — react-app `a7cd9ef`. (CI 초록·감시관 §5 전 항목 통과(diff 라인 단위 대조, 타입 단언은 기존 패턴과 동일해 편법 아님 확인)·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 775→713건. 상세 `docs/report.md` §3~5.
- **Step 11 JS→TS 전환 슬라이스 2 — money.js·invoices.js**: `// @ts-check` + JSDoc 타입 완성(`finance.js` 기존 타입 재사용), 승인된 최소 보정 1곳(`parseInt(String(tripCount), 10)`) 제외 로직 무변경. — react-app `0d93e32`. (CI 초록·감시관이 `npm test`·`typecheck:strict-inventory` 직접 재실행해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 713→696건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 3 — payments.js**: `// @ts-check` + JSDoc, 제네릭 `PaymentMutationResult<T>`로 입력 map 타입 보존, `ensurePaymentList` in-place 뮤테이션 유지. 지시서 밖 방어 보정 1곳(`markReceivableItemPaid`의 `|| []`, 기존 자매 함수와 동일 패턴·동작 동일 확인). — react-app `6f2d316`. (CI 초록·감시관이 diff 직접 대조해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 696→681건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 4 — UI 3컴포넌트 + AppSession.userId 확장**: `SwitchRow.jsx`·`NotificationPanel.jsx`·`AuthRoute.jsx`에 `@ts-check`+JSDoc. 작업자가 `App.jsx`↔`AuthPage.jsx` 간 기존 타입 불일치(공용 타입 `AppSession.userId`가 `string`으로만 선언돼 있었는데 `AuthPage.jsx`는 실제로 `null`도 만들어냄)를 발견해 편법 대신 멈추고 보고 → 감시관이 원인 진단 + `.userId` 사용처 22곳 전수 확인 → 보리 승인(같은 커밋 1개 조건)으로 `outboxTypes.js`의 `AppSession.userId`를 `string|null`로 확장, 4파일 1커밋. — react-app `6755808`. (CI 초록·**감시관이 `npm run typecheck` 직접 재실행해 에러 0건 기계적으로 재확인**(보리 지시)·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 681→653건. 상세 `docs/report.md` §3(중단 보고)·§3-A(승인)·§4.
- **Step 11 JS→TS 전환 슬라이스 5 — DriverFormModal·OnboardingPage**: `@ts-check`+JSDoc, `DriverDraft`/`DriverRecord`/`CarLike`/`OnboardingWizard` 전부 기존 타입 재사용. 지시서 밖 최소 보정 1곳(`wizard.carNumber`의 `|| ''`, 런타임엔 항상 문자열이라 동작 동일 확인). — react-app `f97d2e2`. (CI 초록·감시관이 `npm run typecheck`·`npm test` 직접 재실행해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 653→637건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 6 — practiceSettings.js**: `@ts-check`+JSDoc, `FinanceSettings` 재사용, scope 동적 키는 트릭 없이 자연 통과, `parseInt` 보정 2곳(케이스별 동일 결과 직접 검증). **1차 리뷰에서 200줄 초과(203줄) 발견 → 수정 지시 → §6 예외주석 1줄 추가(수정 커밋 분리, 204줄)로 해소.** — react-app `24505d0`+`46a40dc`(2커밋). (CI 초록·감시관이 최종 `npm run typecheck`·`npm test` 재실행해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 637→596건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 7 — 설정 화면 컴포넌트 패밀리**: `AppSettingsPage.jsx`(189)·`FixedRouteBlock.jsx`(50)·`RoutePresetEditor.jsx`(55)·`RunCountChips.jsx`(58) 4파일 1커밋, `@ts-check`+JSDoc, `FinanceSettings` 재사용. `!!` 보정 여러 곳(원본 값이 `normalizeSettings`로 항상 실제 boolean이라 동작 동일), `useRef` 타입 캐스팅. — react-app `8d8c59a`. (CI 초록·감시관이 `wc -l`·`npm run typecheck`·`npm test` 직접 재실행해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 596→569건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 8 — MaintFuelPage·ExpenseFormModal**: `@ts-check`+JSDoc, `ExpenseItem`/`ExpenseDraft` 재사용, `lib/expenses.js`는 지시대로 무변경(별도 슬라이스로 남김). `(item.mileage||0)`/`(item.subsidy||0)` 보정(동작 동일 확인). — react-app `5e5fd06`. (CI 초록·감시관이 `wc -l`·`npm run typecheck`·`npm test` 직접 재실행해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 569→553건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 9 — MyPage·ConfirmModal·RequireSession**: `@ts-check`+JSDoc props, `AppSession` 재사용. `RequireSession` `session ?? null` 최소 보정. — react-app `4aa0869`(amend, 되돌림 1회). **1차 커밋 `29bc1e8`에서 작업자가 `MyPage.onOpen`을 지시서 1-B의 `label?: string` 대신 `label: string`으로 선언하고 그 때문에 JSX 6줄(`onOpen('x')`→`onOpen('x','')`)을 바꿈 — 1-D "JSX 무변경" 위반. 감시관 §5에서 적발(동작은 동일·작업자가 공개함, but 절차상 "막히면 멈추고 보고" 미준수). 보리 (B) 결정 → 감시관이 지시서대로 경로 로컬 검증(`AppShellRoutes.jsx:78` `title` 캐스팅 `string`→`string|undefined` 1줄 승인 확장) → 작업자 amend로 JSX byte-identical 원복.** (CI 초록 run `34011251979`·감시관 §6 재실사 전 항목 통과·브라우저 스모크·보리 `[x]` 2026-09-06). strict-inventory 553→544건. 상세 `docs/archive/audit.md` "슬라이스 9".
- **Step 11 JS→TS 전환 슬라이스 10 — formatPhone·ComingSoonPage·BottomNav**: `@ts-check`+JSDoc, 순수 표시·변환 전용(플레이북 비대상). 순수 additive(+19/-0). — react-app `857319d`. (CI 초록 run `34011936455`·감시관 §5 전 항목 통과·브라우저 스모크·보리 `[x]` 2026-09-06). strict-inventory 544→539건. 상세 `docs/report.md`(슬라이스 11로 리셋됨).
- **Step 11 JS→TS 전환 슬라이스 25 — 잔여 UI 4파일 (main.jsx·ReportPage.jsx·ForgotPasswordModal.jsx·HydrationRetryBanner.jsx)**
  (프로덕션 JS→TS 종료 후 후속 ①, 감시관 추천 + 보리 승인 "다음건 추천방향으로 진행"):
  `main.jsx`는 `// @ts-check` + `#root` null 가드(가드 실패 시 명시적 throw). `HydrationRetryBanner.jsx`·
  `ForgotPasswordModal.jsx`는 `// @ts-check` + props JSDoc만(본문 무변경). `ReportPage.jsx`는
  `// @ts-check` + `opt` 객체 타입 캐스팅 — 지시서의 `import('html2pdf.js').Html2PdfOptions`
  대신 `Parameters<InstanceType<(typeof html2pdf)['Worker']>['set']>[0]` 사용(`html2pdf.js`의
  `type.d.ts`가 `Html2PdfOptions`를 `export` 없이 선언해 지시서 방식 자체가 불가능 — 감시관이
  `.d.ts` 직접 확인해 타당성 검증, 값 무변경). 4파일 전부 200줄 이하(17/164/23/67줄), §4
  플레이북 비대상(저장·동기화 없음), §7 증설 0. 테스트 파일 변경 0. — react-app `62640d8`.
  (CI "verify" 초록 run `34072997974` conclusion=success·headSha 일치·3게이트 green·감시관
  §5 7항목 통과 + 커밋 diff 대조 + typecheck·test·strict-inventory 직접 재실행(346, 대상
  4파일 각 0건·561/135 확인)·보리 브라우저 스모크 통과 + `[x]` 2026-09-07). strict-inventory
  350→346(−4). 상세 `docs/report.md` §1·§4~5.
- **Step 11 JS→TS 전환 슬라이스 24 — domain/taxInvoices.js + domain/taxInvoices.test.js**
  (**프로덕션 JS→TS 전환 종료**): `taxInvoices.js`에 `// @ts-check` + typedef 4(`InvoiceLike`·
  `CarLike` 재사용 + 로컬 `TaxInvoiceItemInput`·`TaxInvoiceRow`) + 6함수 JSDoc. 함수마다
  "실제로 읽는 필드"만 좁은 인라인 타입 → 호출부(`syncTaxInvoicesTable.js`·`hydrate.js`) 수정 0.
  **6함수 본문 로직 무변경** — `mergeTaxInvoiceRecords`만 `raw`→`Record<string,unknown>`,
  `record`→`InvoiceLike` 캐스팅 2개(컴파일 타임, §133: 기존 `typeof object`+`!raw.id` 가드
  유지, 신규 검증기 0 — 슬라이스 19·20·22 동일 방침). `taxInvoices.test.js`는 보리 결정
  ("묶어서 전환")으로 번들: `@ts-check` + typedef 2 + fixture `@type` 3 + negative assertion
  3줄 `extraColumns` loose 접근(값 검사 그대로). assertion 값·fixture 데이터 무변경.
  `domain/taxInvoices*`는 §4 명시 목록 아님(순수 계산). 54→113 / 91→101줄. — react-app
  `3352601`. (CI "verify" 초록 run `34033230641` conclusion=success·headSha 일치·3게이트
  green·감시관 §5 7항목 통과 + 커밋 diff·파일 전체 §1-G byte 대조 + typecheck·test·
  strict-inventory 직접 재실행(`33c0420` 기준 진단 diff 제거23/추가0·grep 0줄·표적 7/7)·보리
  브라우저 스모크 통과 + `[x]` 2026-09-06). strict-inventory 373→350(−23). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 23 — lib/outboxReconcile.js + lib/hydrateMerge.js**:
  `outboxReconcile.js`에 `// @ts-check` + typedef 2(`DriverRecord`·`OutboxOp` 재사용) +
  순수 reconcile 함수 4개 JSDoc. `reconcileCars`/`reconcileClients` 제네릭 `@template`
  (호출부 타입 보존 → 소비처 0), `reconcileDrivers`는 `Array<DriverRecord>`/
  `Array<Partial<DriverRecord>>`. `hydrateMerge.js`는 `mergeDriversFromRows`에 `@returns
  {Array<DriverRecord>}` 1줄 + 조회 실패 갈래 캐스팅. **동작-무변경 보정 3건**(감시관 케이스별
  증명): `isTombstoned(…, String(x||''))` falsy 재현 · `recovered` 필터 `if (!driver.id)
  return false`(원래도 걸러짐) · `hydrateMerge` 조기 return 캐스팅(Store 정규화 레코드).
  §4 필수(`lib/*outbox*`)나 `JSON.parse`/`localStorage` 직접 접근 이 파일에 없음(전부
  `mutationOutbox.js` 경유, 안 건드림) → §133 대상 없음, 신규 검증기 0, 판정 규칙 무변경.
  53→76 / 125→126줄. — react-app `33c0420`. (CI "verify" 초록 run `34032046696`
  conclusion=success·headSha 일치·3게이트 green·감시관 §5 7항목 통과 + 커밋 diff·파일
  전체 §1-G byte 대조 + typecheck·test·strict-inventory 직접 재실행(`01bcca4` 기준 진단
  diff 제거13/추가0·프로덕션 grep 0줄·표적 56/56)·보리 브라우저 스모크 통과 + `[x]`
  2026-09-06). strict-inventory 386→373(−13). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 22 — lib/expenses.js**: `// @ts-check` + 상단 주석 갱신 +
  `saveExpenses` `@param` 2개(`ownerKey:string`·`items:Array<ExpenseItem>`, 기존 `ExpenseItem`
  재사용). `dedupeExpensesById(items)` `T=ExpenseItem` 추론 → `commitExpenses` 자연 통과
  (기존 TS2345 2건 해소). **죽은 `loadExpenses` + 전용 import `readJsonKey` 삭제(보리 승인
  "죽은건 삭제해")** — 프로덕션·테스트 호출부 0(화면 읽기는 `useOwnerExpenses` store 구독),
  삭제 후 561/135 그대로 통과 = 죽은 코드 증명. §133 대상 코드(`loadExpenses`의 JSON.parse)
  삭제로 캐스팅·검증기 쟁점 소멸. §4 필수(`saveExpenses`가 Supabase mutation)나 `saveExpenses`
  본문 무변경(세션 epoch 가드·페이로드·호출 순서·에러 분기 그대로), §7 증설 0. 42→40줄.
  — react-app `01bcca4`. (CI "verify" 초록 run `34030856249` conclusion=success·headSha
  일치·3게이트 green·감시관 §5 7항목 통과 + 커밋 diff·파일 전체를 §1-G "결과 파일 전체"와
  byte 대조 + typecheck·test·strict-inventory 직접 재실행(`lib/expenses.js(` 0줄)·보리
  브라우저 스모크 통과 + `[x]` 2026-09-06). strict-inventory 391→386(−5). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 21 — lib/dirtyJournal.js**: `// @ts-check` + 비export
  헬퍼 3개(`journalKey`·`readJournal`·`writeJournal`) `@param`/`@returns`. owner별 durable
  journal(revision 카운터, localStorage `reactPracticeDirtyJournal:<ownerKey>`) — §4 필수·
  §133 대상. export 함수는 이미 JSDoc 완비, 4건은 헬퍼 파라미터뿐. **§0-C 최소 보정(보리
  승인)**: `readJournal`이 기존 최상위 객체 가드를 확장해 `Object.entries(parsed)` 각 값을
  `Number(revision)||0`으로 런타임 정규화 후 `Record<string, number>` 반환 — §133 준수
  (별도 검증기 모듈 0, 기존 함수 안 ~4줄, §7 회피). 정상 데이터 영향 0(테스트 통과 증명),
  손상 데이터엔 `planDirtyWrite` `"abc"+1` 문자열연결 버그 수정. `hasDirty`/`getDirtyDomains`/
  `planDirtyWrite`/`clearDirtyDomain` 본문 무변경(반환이 숫자맵이라 자연 통과). 96→120줄.
  — react-app `14ebe52`. (CI "verify" 초록 run `34029126603` conclusion=success·headSha
  일치·3게이트 green·감시관 §5 7항목 통과 + 감시관이 typecheck·test·strict-inventory 직접
  재실행(diff가 §1-G와 일치)·`dirtyJournal.js(` 0줄 근거 첨부(`docs/report.md` §5)·보리
  `[x]` 2026-09-06). strict-inventory 395→391(−4). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 20 — lib/syncExpenseRecords.js**: `// @ts-check` +
  `CarLike`/`ExpenseItem` 재사용(import) + 함수 5개 JSDoc. 정비/주유/기타 비용 Supabase
  delete+insert — §4 필수. `readJson` 안 쓰고 `item`은 슬라이스 1(`a7cd9ef`)에서 이미
  타입된 `groupX`/`buildX`로 흐름 → §133 검증기 불필요. 감시관 사전검증 중 마찰 1건:
  `expenses` param을 `Array<ExpenseItem>`로 달면 호출자 `lib/expenses.js`에 오염 3건 →
  **`Array<{ id?: string }>` 느슨 선언 + `expenseSyncInputs` 내부 `/** @type {Array<ExpenseItem>} */`
  캐스팅 1곳으로 격리**(감시관 판단, Store/deduped 데이터 캐스팅이라 JSON 경계 아님).
  `expenses.js`(슬라이스 21) 오염 0 확인. `const vehicleId = mainCar.supabaseId` 가드
  직후 캡처 3곳(`await` 뒤 for-loop에서 프로퍼티 좁힘이 풀려서 — 단언 아님, 동작 무변경).
  Supabase 페이로드·호출 순서·에러 분기 무변경. 115→152줄. — react-app `fc7980f`.
  (CI "verify" 초록 run `34027848750` conclusion=success·headSha 일치·3게이트 green·감시관
  §5 7항목 통과 + 감시관이 typecheck·test·strict-inventory 직접 재실행(diff가 §1-G와 byte
  일치)·`syncExpenseRecords.js(` 0줄·`lib/expenses.js(` 5줄 불변 근거 첨부(`docs/report.md`
  §5)·보리 `[x]` 2026-09-06). strict-inventory 420→395(−25). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 19 — lib/syncWorkData.js**: `// @ts-check` +
  `CarLike`/`ClientLike` 재사용(import만) + `syncWorkData`/`upsertDailyLog` JSDoc.
  운행기록 Supabase upsert(`daily_logs`+`transport_details`) — §4 필수. `readJson`(slice
  17에서 `unknown` 반환)으로 읽은 workData를 필드 접근 → §133 쟁점을 **보리 결정
  (2026-09-06 AskUserQuestion)**대로 `record`를 `DayRecordLike` 단언 없이
  `Record<string, unknown>` 캐스팅(3곳: workData·loop record·safeRecord)으로 처리 —
  기존 런타임 가드(`typeof`/`Array.isArray`/`parseEntityNumber(value:unknown)`/`!!`)가
  좁힘, **신규 검증기 0**(§7 준수). 보리 승인 최소 보정: `data.id`→`data?.id`(2곳,
  `.single()` null 이론상 가능)·`upsertDailyLog` 반환 `/** @type {string} */ (data?.id)`
  +`.single()` 계약 주석. Supabase 페이로드·호출 순서·에러 분기·`onConflict` 무변경.
  루프 바인딩 `record`→`rawRecord`(가드 뒤 캐스팅으로 `record` 재도입, 본문 무변경).
  68→83줄. — react-app `cc286bd`. (CI "verify" 초록 run `34026552370` conclusion=success·
  headSha 일치·test/typecheck/build 3게이트 green·감시관 §5 7항목 통과 + 감시관이
  typecheck·test·strict-inventory 직접 재실행(diff가 §1-G와 byte 일치)·`syncWorkData.js(`
  grep 0줄 근거 첨부(`docs/report.md` §5)·보리 `[x]` 2026-09-06). strict-inventory
  434→420(−14). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 18 — domain/receivables.js**: `// @ts-check` +
  `ReceivableGroup` typedef(그룹 반환 모양) + 함수 8개 JSDoc. `financeReceivables.js`의
  기존 `ReceivableItemLike` 재사용(신규 도메인 타입 0). 미수금 목록 그룹핑·정렬·D-day
  라벨 **순수 함수만**(저장·동기화·JSON 파싱 0) → `domain/receivables*` 경로가 §4 목록에
  형식상 걸리나 "참고" 수준, §133 런타임 검증기 무관. 지시서 밖 최소 보정 1건(보리 승인):
  `daysUntil` `(due - today)` → `(due.getTime() - today.getTime())` — `Date` 뺄셈은 JS가
  `valueOf()`로 강제변환하므로 결과 동일, `@ts-check`가 TS2362/2363으로 막아 명시 필요.
  `groupItems`는 뒤에 required 파라미터가 있어 `items` optional 불가(TS1016). 72→121줄.
  — react-app `f161361`. (CI "verify" 초록 run `34022719470` conclusion=success·headSha
  일치·test/typecheck/build 3게이트 green·감시관 §5 7항목 통과 + 감시관이
  typecheck·test·strict-inventory 직접 재실행해 숫자 완전 일치·순수 계산 함수라 브라우저
  검증 얕음(소비처 CI 테스트 통과)·보리 `[x]` 2026-09-06). strict-inventory 465→434(−31,
  27건 이 파일 + 소비처 파생 4건). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 17 — lib/cloudStorage.js + domain/clientTypes.js**:
  `// @ts-check` + `readJson`/`writeJson`/`keyFor`/`parseEntityNumber`/`rangesOverlap`/
  `buildVehicleRow` JSDoc 6블록. `readJson` 반환은 `unknown`(도메인 좁히기 없음 —
  호출부 `outboxFlush`/`outboxRollback`가 이미 `/** @type */` 단언, 슬라이스 12·13 선례).
  **죽은 함수 3개(`collectPracticeSnapshot`·`practiceSnapshotForProfile`·
  `applyPracticeSnapshot`) 통째 삭제** — 전 저장소 호출부 0, `store/owner-state.js`
  `replaceOwnerState`로 대체됨, 보리 삭제 승인(§10 대상 특정 재확인 충족). `KEYS`·함수
  본문·`buildClientRow` 기존 주석 무변경. `clientTypes.js`는 `ClientLike`에
  `taxInvoiceEnabled` 1줄 additive(착수 전부터 있던 TS2339 해소). `lib/cloud*`라 §4
  플레이북 트리거였으나 원시 I/O 함수 타입 주석 + 죽은 코드 삭제뿐, §133 검증기 없음.
  126→125줄. — react-app `87ab7fd`. (CI "verify" 초록 run `34021045759`
  conclusion=success·headSha 일치·test/typecheck/build 3게이트 green·감시관 §5 7항목
  통과 + 감시관이 typecheck·test·strict-inventory 직접 재실행해 숫자 완전 일치·원시 helper
  계층이라 단독 브라우저 검증 대상 없음(소비처 6파일 CI 테스트 통과로 회귀 없음)·보리
  `[x]` 2026-09-06). strict-inventory 503→465(−38). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 16 — lib/originalWindow.js**: `@ts-check` 1줄 +
  `applyOriginalFixture` `@param` 3곳(`win`은 `{ localStorage: { setItem(key,value):void } }`
  최소 구조만 — `@types/jsdom` 의존성 회피, `any`/캐스팅 0). 본문 무변경. 호출부는
  `finance.test.js`·`receivables-invoices.test.js` 2곳뿐(둘 다 `loadOriginalWindow()`
  결과를 `win`으로 전달 — DOMWindow가 구조적으로 호환). 테스트 전용 헬퍼라 §4 플레이북
  비대상, 브라우저 검증 대상 없음. — react-app `a54dd1e`. (CI 초록 run `34016176226`
  conclusion=success·headSha 일치·감시관 §5 7항목 재실사 통과(diff +6/-0, 착수지시서와
  라인 단위 일치)·CI 561/135 통과로 회귀 없음·보리 `[x]` 2026-09-06). strict-inventory
  506→503(-3). 상세 `docs/archive/audit.md` "슬라이스 16".
- **Step 11 JS→TS 전환 슬라이스 15 — store/batchWrites.js**: `@ts-check` 1줄 + `buildBatchWrites` 지역변수 `const writes`에 `@type {Array<KeyedWrite>}`(이미 선언된 `@returns`와 동일) 1줄만(+2/-0). 순수 계산 함수(실제 저장은 `writeAllOrNothing`), `src/store/**`라 §4 트리거지만 저장·동기화 로직 무변경. — react-app `83c1fbc`. (CI 초록 run `34015545300`·감시관 §5 7항목 통과(diff가 §1-G와 정확히 일치)·브라우저 스모크·보리 `[x]` 2026-09-06). strict-inventory 508→506건. 상세 `docs/archive/audit.md` "슬라이스 15".
- **Step 11 JS→TS 전환 슬라이스 14 — practiceSettings.js·profile.js**: `@ts-check`+`@param`만(각 본문 무변경). `practiceSettings.js` 3건(`applyTheme`은 `'light'|'dark'`), `profile.js` 2건(`saveProfile profile:LocalProfile`). 두 `save*`가 `upsertProfileOnSupabase` 원격+epoch 가드 → §4 트리거였으나 원격 경로·가드·`{}`/`EMPTY_PROFILE` fallback 무변경, 신규 캐스팅 0. — react-app `82ea3ac`. (CI 초록 run `34014946741`·감시관 §5 7항목 통과(diff가 §1-G와 라인 단위 일치)·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 513→508건. 상세 `docs/archive/audit.md` "슬라이스 14".
- **Step 11 JS→TS 전환 슬라이스 13 — cars.js·clients.js·drivers.js 배럴**: `@ts-check`+`@param`, `load*` fallback `unknown[]` 캐스팅(요소 단언 없음)·`save*` items는 `CarLike[]`/`ClientLike[]`/`DriverRecord[]`. `cars.js`만 `loadCars` return의 `dedupeCarsById` 인자에 `{ id?: string|number }[]` 최소 구조 캐스팅 1곳(dedupe 내부 런타임 가드 유지). 위임 로직 무변경, 원격 mutation 없어 §4 트리거 아님. — react-app `3c43481`. (CI 초록 run `34014374350`·감시관 §5 7항목 전부 통과(diff가 §1-G와 라인 단위 일치·사전검증본과 byte 동일)·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 522→513건. 상세 `docs/archive/audit.md` "슬라이스 13".
- **Step 11 JS→TS 전환 슬라이스 12 — invoices.js·report.js**: `@ts-check`+`@param`, `loadInvoices` fallback `unknown[]` 캐스팅(요소 타입 단언 없음)·`saveInvoices` items `InvoiceLike[]`·`report.js`는 `dash`(`@param {unknown}`)/`buildMonthReport`에 `@param`만. 로직·세션 epoch 가드 무변경. `saveInvoices` 원격 mutation으로 §4 플레이북 트리거였으나 타입 주석만이라 §1-F 검증기 추가 없음. — react-app `d2ac4be`. (CI 초록 run `34013535405`·감시관 §5 7항목 전부 통과(diff가 착수지시서 §1-B와 라인 단위 일치)·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 529→522건. 상세 `docs/archive/audit.md` "슬라이스 12".
- **Step 11 JS→TS 전환 슬라이스 11 — supabaseClient.js + AuthPage catch 2줄**: `@ts-check`+`@param` 10곳(9곳 `{string}`, `error` 1곳 `{ message?: string }|null|undefined`). `error` 좁히기가 `AuthPage.jsx` `catch (error)`(strict `unknown`) 2곳을 깨서 보리 (a) 승인으로 catch 2줄(`error instanceof Error ? error : null`)만 범위 포함 — `if (error)` 분기·본문·쿼리 무변경. AGENTS §4 플레이북 트리거였으나 §1-F 검증기 없어 해당 없음. 작업자 멈춤 1회(감시관 grep 패턴이 `testSupport/fakeSupabaseClient.js` 오매칭 — 실블로커 아님, 작업자 대응은 정확). — react-app `bda5933`. (CI 초록 run `34012796950`·감시관 §5 전 항목 통과(로컬 end-to-end 사전검증도 완료)·브라우저 스모크(auth 에러 토스트)·보리 `[x]` 2026-09-06). strict-inventory 539→529건. 상세 `docs/report.md` §4~5.

## 아직 안 한 큰 것 (나중 Step)
- **Step 11 — 200줄 강제**: 전체 완료(슬라이스 1~4, 2026-09-05).
- **Step 11 — JS→TS 전환**: **프로덕션 완료(슬라이스 1~24) + 후속 ① 완료(슬라이스 25),
  strict-inventory 775→346건.** 지금은 JS + JSDoc 주석 타입(`.js` 확장자 유지, 보리 결정
  2026-09-05) — 실제 `.ts`/`.tsx` 확장자 전환은 별도 단계(미착수).
  **잔여 346건 = testSupport 1 + `.test.js` 나머지.**
  - `testSupport/fakeSupabaseClient.js`(1, TS2322) — `@ts-check` 없어 CI 게이트
    밖, strict-inventory에서만. 착수 전부터 있던 것.
  - `.test.js` 나머지: 테스트 파일은 200줄·strict 면제(migration 원칙 3·13 —
    "증가 금지"이지 "전부 수정"은 아님). 별도로 다룰지는 보리 결정.
  (프로덕션 완료: `cloudStorage.js` 38 슬17, `receivables.js` 27 슬18, `syncWorkData.js` 14 슬19,
  `syncExpenseRecords.js` 25 슬20, `dirtyJournal.js` 4 슬21, `expenses.js` 5 슬22,
  `outboxReconcile.js`+`hydrateMerge.js` 13 슬23, `taxInvoices.js`+test 23 슬24.
  `originalWindow.js` 3 슬16, `batchWrites.js` 2 슬15. 후속: UI 4파일 4 슬25.)

## 알려진 이슈 (당장 안 고쳐도 되지만 잊으면 안 됨)
- **정비/주유/기타 Supabase 동기화가 항상 "메인" 차량 `vehicle_id`로만 저장됨**
  (`lib/syncExpenseRecords.js` 51·88·125번 줄, `lib/hydrate.js` 142-144번 줄도
  동일하게 메인만 조회) — 서브 차량 지출 칩 이관 1단계(2026-09-07) 조사로 발견.
  1단계는 로컬 태깅 + `raw` jsonb 왕복만으로 화면 기능을 완성해 이 문제를 안 건드림
  (0-C, `docs/report.md`). DB에 어느 차량 row로 남는지만의 정합성 문제라 화면엔
  영향 없음 — 2단계(백로그, 안 급함)에서 sync 루프를 차량별로 고칠 때 같이 처리.
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

## 저장소 상태 (2026-09-08, 홈 달력 CSS 분리 감시관 검증 시점)
- **react-app**: `main` = origin/main = `ca80554`(홈 달력 전용 CSS 이동,
  CI "verify" 초록 run `34194765082`, 감시관 브라우저 전후 비교·§5 통과). 작업트리 클린.
- **ubiquitous-parakeet**: `main` = origin/main = `aa802af`에서 시작. 이번 조사·검증으로
  `STATUS.md`·`docs/report.md`만 감시관이 갱신해 미커밋 상태이며, 코드·DB 변경은 없다.
  감시관은 사용자 지시 없이 commit/push하지 않는다(AGENTS §3).
- 정확한 HEAD·미커밋 범위는 세션 시작 시 `git log`/`git status`로 직접 확인 (AGENTS.md §0-6).

## 승인의 기준 (사용자가 `[x]` 확정 전에 확인할 것)
1. **GitHub Actions "CI / verify" 초록** — 매 push 자동으로 `npm test` + `typecheck` + `build` 재실행. 초록 아니면 `[x]` 불가.
2. **브라우저 실검증 완료** — `npm run dev`로 해당 화면 직접 조작. 사용자만 가능.
3. **감시관 §5 리뷰 통과** — 범위·타입꼼수·몰래증설·200줄·테스트진실성·문서정합·요구사항충족.
> ※ 1·2·3은 "승인에 필요한 증거". 최종 승인(=`[x]`)은 사용자의 결정 행위. 절차 정본은 AGENTS.md §3·§5.
