# docs/report.md — 현재 슬라이스 착수지시서

(지난 슬라이스 7-D-1(서버)과 7-D 설계 결정은 `git show b0af467 -- docs/report.md`. 7-C-2는 `git show 1fd9d72 -- docs/report.md`.)

## 배포까지 순서 7-D-2 — 일지 날짜 옆 "배정차량" 표시 + 소속 연결 카드 글씨 `[x]` (착수지시서 확정 2026-10-01)

> 완료(2026-10-01): react-app `33e39b4`, 브라우저 확인·push·CI 초록·§5 리뷰·사용자 최종 승인.

### 1. 목적 (쉬운 말)
연동이 해제되면 서버가 이전 기록을 기사 본인 계정으로 복사해 둔다(7-D-1). 이 기록의 하루 정보에는 "어느 배정 차량에서 한 일인지"(`assignedVehicleNumber`)가 들어 있는데,
지금 앱은 이 값을 모르는 이름이라 **불러올 때 버리고, 그날을 고쳐 저장하면 서버에서도 지워진다.** 앱이 이 값을 읽고 보존하고, 일일운행 입력 화면 날짜 옆에 "배정차량 00가0000"으로 보여 준다.
함께(보리 확인 2026-10-01) 기사 개인정보 화면 "소속 연결" 카드의 안내 글씨가 모양 없이(16px 흰 글씨) 나오는 것도 고친다.

### 2. 현재 상태 (근거)
- 하루 정보 허용 이름 목록 `DAY_RECORD_KEYS`(`store/persistDayRecord.js:10`)에 없어서 ① 불러올 때 버림(`hydrateMergeWork.js:39` `pickKnownKeys`) ② 저장 검사 `isPersistedDayRecord`가 모르는 이름이 있으면 **그날 기록 전체를 거부**(`hasOnlyKeys`, 32행 — 하루 기록 맵은 하나라도 틀리면 전부 거부).
- 저장은 이미 이름을 보존함: 일지 저장 두 경로(`useDayDraft.js:121`·`pendingWorkDataWrites.js:150`)가 모두 `saveDayRecord`(앞선 값 `restPrev`를 펼침, `day-record.js:167`)를 쓰고, 서버 쓰기는 하루 정보 전체에서 콜·비용 목록만 빼고 `raw`에 넣음(`syncWorkData.js:70` `upsertDailyLog`). → **목록에 이름만 추가하면** 읽기·저장·서버 쓰기가 이어짐.
- 일지 제목은 `PageHeader title="{월}월 {일}일 운행 일지"`(`DayLogPage.jsx:149`), 제목은 화면 노드를 받을 수 있음(`PageHeader.jsx` `title: ReactNode`). 이 화면은 이미 그 차량 하루 기록을 구독 중(`workData`, `DayLogPage.jsx:66`).
- 카드 글씨: `EmployerLinkCard.jsx:62·68`의 `<p className="car-sub-text">`는 카드별로만 모양을 정해 둔 클래스(`driver-connection.css:66`·`management-common.css:41`·`tax-invoice.css:167`)라 이 카드엔 모양이 없음. 개인정보 카드 설명줄 모양은 `PersonalInfoPage.css:40`(`--sub-text-color`·`--fs-floor`·`line-height 1.3`).

### 3. 하는 일
1. `persistDayRecord.js`: `DAY_RECORD_KEYS`에 `'assignedVehicleNumber'` 추가 + 검사 한 줄(문자열일 때만 통과, 아니면 거부) — 숫자·객체 등이 들어오면 기존 값 검사처럼 거부.
2. `dayRecordTypes.js`: `DayRecordLike`에 `assignedVehicleNumber` 문자열 속성 1줄(타입이 실제 검사와 같게).
3. 새 `AssignedVehicleTag.jsx`(day-log 폴더): 값이 비어 있으면 아무것도 안 그리고, 있으면 `<span className="assigned-vehicle-tag">배정차량 {값}</span>`.
4. `DayLogPage.jsx`: **제목 한 줄을 제자리 수정**(줄 수 증가 없음) — `title`에 날짜 글씨 뒤로 `<AssignedVehicleTag value={workData[dateKey]?.assignedVehicleNumber} />`를 붙임. (이 파일은 이미 227줄이라 §6상 승인 필요 → 아래 질문 1)
5. `day-log-shell.css`(143줄): `.assigned-vehicle-tag`(새 클래스) — 제목 옆 작은 보조 글씨(`--sub-text-color`·`--fs-floor`, 왼쪽 여백 6px). 새 클래스라 다른 화면 영향 없음(§5-6 해당 없음).
6. `EmployerLinkCard.jsx`: `<section>`에 `employer-link-card` 클래스 1개 추가. `driver-connection.css`(139줄): `.employer-link-card .car-sub-text`(카드 안 **전부** — 연동 정보 줄 + 버튼 영역의 "해제 요청 중 …"·"차주가 해제를 요청했습니다 …" 상태 문구 `DriverUnlinkControls.jsx:23·30`)를 개인정보 카드 설명줄과 같은 모양(위 `PersonalInfoPage.css:40` 값)으로. 이 클래스는 기사 카드에만 붙어 차주 화면(`DriverConnectionPage`)엔 영향 없음.
7. `src/domain/day-record.js`(207줄) `saveDayRecord`: **배정차량 값이 있는 날은 콜·횟수를 다 비워도 하루 기록을 지우지 않음** — 빈 날 판정 조건에 `&& !prev.assignedVehicleNumber` 1개를 제자리 추가(줄 수 증가 없음, §6 → 질문 1).
   그러면 그날은 "값만 남은 빈 기록"으로 남고, 서버 쓰기는 지우기 경로(`dailyLogRemoval.js:29` — 빈 줄을 `raw: {}`로 덮어 값이 사라짐) 대신 하루 줄 저장 경로(`syncWorkData.js:70`, 콜은 비움)를 탐 → 화면·서버 모두 값 유지.
   (보리 결정 2026-10-01: 비용만 있는 날 등을 비워도 배정차량 표시는 남김.) 빈 하루 줄은 지금도 비용 있는 날에 존재하는 형태(0-3-A)라 달력 표시 영향 없음 — 달력 배지는 횟수·콜로 계산(`CalendarGrid.jsx:39-47`).

### 4. 건드릴 파일
`src/store/persistDayRecord.js`(+2줄) · `src/domain/dayRecordTypes.js`(+1줄) · `src/components/day-log/AssignedVehicleTag.jsx`(신규) · `DayLogPage.jsx`(제자리 1줄) · `day-log-shell.css`(+약 8줄) · `src/components/drivers/EmployerLinkCard.jsx`(+0줄, 1줄 수정) · `driver-connection.css`(+약 8줄) · `src/domain/day-record.js`(제자리 1줄) · 테스트(§7).
모두 200줄 이하 유지(`DayLogPage.jsx` 227줄·`day-record.js` 207줄은 이미 초과 — 둘 다 줄 수 증가 없는 제자리 수정, §6 승인 요청).
프로덕션 파일 8개로 AGENTS §3 크기(1~3개)를 넘지만 대부분 1~2줄 변경이고 화면 표시·카드 글씨·값 보존이 서로 묶여 있어 한 슬라이스로 둠(새 파일은 `AssignedVehicleTag.jsx` 1개 — 값 있음/없음을 따로 테스트하려고).

### 5. 안 건드릴 것 (근거)
- 서버(DB)·마이그레이션: 7-D-1이 이미 `raw`에 값을 넣음, 변경 없음.
- `dailyLogRemoval.js`: 배정차량 날은 7번으로 지우기 경로를 안 타므로 그대로(빈 날 지우기 규칙은 다른 날에 그대로 적용).
- `hydrateMergeWork.js`·`syncWorkData.js`·`useDayDraft.js`: 이름 목록만 늘리면 그대로 동작 — `hydrateMergeWork.js:39`는 목록(`DAY_RECORD_KEYS`)을 가져다 쓰는 줄이고 `saveDayRecord`는 `restPrev` 펼침이라 새 이름이 따라감(§7 테스트로 증명, 못 증명하면 이 문장이 틀린 것).
- `PageHeader.jsx`·`management-common.css`·`tax-invoice.css`: 다른 화면 공유라 건드리지 않음(그래서 새 클래스).
- 기사 계정 메인 일지 외 화면(달력·매출 등)에는 표시하지 않음 — 보리 결정은 "일일운행 입력 화면 날짜 옆"뿐.

### 6. §8 5대 질문
1. 구독(`useOwnerWorkData`) 값을 표시만 함. 2. 값은 Supabase `daily_logs.raw` → 불러오기 → Store(하루 정보). 3. 쓰기 창구는 그대로 `saveDayRecord` — 바뀌는 건 "배정차량 날은 비워도 안 지움" 조건 1개뿐(표시는 읽기 전용). 4. hydrate·동시편집 규칙 변경 없음(필드 하나가 더 실릴 뿐). 5. 권한 변경 없음.
플레이북 트리거 해당(`src/store/**`·저장 경로 값 보존) — 착수 전 `docs/testing-playbook.md` §1(스키마 불일치 방어)·§6(검출력) 확인.

### 7. 기대 동작 / 테스트
- 하루 정보에 `assignedVehicleNumber: "11가1111"`이 있는 날의 일지 제목 옆에 "배정차량 11가1111" 표시, 값이 없는 날(보통 날·차주·게스트)은 아무것도 안 보임.
- 그날을 고쳐 저장해도 값이 Store·서버 쓰기 내용에 그대로 남음(보존). 새로고침(불러오기) 후에도 표시.
- 값이 문자열이 아니면(손상) 기존 규칙대로 거부(스키마 방어 유지).
- 배정차량 값이 있는 날의 콜·횟수를 모두 지워도 그날 기록이 값만 남은 채 유지되고 제목 옆 표시도 그대로, 서버엔 하루 줄 삭제·`raw` 비우기가 일어나지 않음. 값 없는 보통 날은 예전처럼 비우면 사라짐.
- 폰 너비(375px)에서 제목 줄이 넘치거나 가로 스크롤이 생기지 않음(넘치면 배정차량 글씨만 줄바꿈 허용 — 제목·버튼 위치·저장 상태 표시 위치는 그대로).
- 카드 안내 글씨가 개인정보 카드 설명줄과 같은 크기·색, 다크/라이트 모두 읽힘.
- 새·보강 테스트 — 전부 "코드를 되돌리면 FAIL" 확인: ① `persist.test.js`에 허용·문자열 아님 거부 케이스 ② 불러오기 병합(`hydrateMerge.test.js` 계열)에서 값 유지 ③ `saveDayRecord`·일지 저장 경로에서 값 유지(서버 쓰기 payload 포함) ③-2 배정차량 날을 비우면 기록 유지·지우기 함수 호출 없음, 값 없는 날은 예전처럼 삭제 ④ 새 화면 테스트 `AssignedVehicleTag.test.js`(값 있음/없음) ⑤ `EmployerLinkCard.test.js`에 카드 클래스 확인.
- `npm test`·`tsc`·strict 진단 불변.

### 8. 실패 시 처리
검사 변경이 기존 저장 기록을 거부하게 되면(`isPersistedDayRecord` 회귀) 즉시 되돌리고 보고. 새 상태 저장소·레이어 없음(이름 1개 추가 + 표시 컴포넌트 1개 + 빈 날 조건 1개).

### 9. 브라우저 검증 (AI가 옆 브라우저로 — 로그인은 보리)
- 카드 글씨: 기사 계정 개인정보 화면 "04 소속 연결" 안내 줄과 [해제 요청] 후 상태 문구가 다른 카드 설명줄과 같은 크기·색인지(라이트/다크) → [요청 취소]로 원복.
- 배정차량 표시: 실제 해제가 필요한 기능이라, **시험용 차주 계정의 하루 기록 1건 `raw`에 값을 임시로 넣어 확인한 뒤 원복**하는 방법을 제안(아래 질문 2). 확인 항목: 제목 옆 표시(폰 너비 375px 포함) → 그날 수정 저장 → 새로고침 후에도 표시 → 서버 `raw`에 값 유지.

### 10. 확인 요청
1. `DayLogPage.jsx`(227줄) 제목 1줄·`day-record.js`(207줄) 빈 날 조건 1줄을 줄 수 증가 없이 제자리 수정해도 되는지(§6, 지난 `financeCore` 전례처럼).
2. 배정차량 표시 확인용으로, AI가 SQL Editor에서 **시험용 계정의 하루 기록 1건 `raw`에 값 1개를 임시 추가했다가 확인 후 원래대로 되돌려도** 되는지 — 대상은 **이미 있는 하루 줄 1개로 한정**(새 줄을 만들지 않음 — 원복이 `raw` 값 1개 제거로 끝나게). 확인 중 그날을 비우는 시험도 하므로 시험 전 그날 콜·비용을 기록해 두고 원복(대상은 어떤 계정·날짜로 할지 알려 주세요. 안 되면 단위 테스트까지만 하고 표시 확인은 실제 해제 때로 미룸).
3. 지난 7-D-1에서 말씀드린 알려진 한계 2건(고정노선 칩 횟수·콜에 안 쓰인 고정노선 전용 거래처)은 이번 지시서에 넣지 않았습니다 — 별도 슬라이스로 만들지, 그냥 둘지 정해 주세요.

### 결정 `[확인: 2026-10-01 보리]`
1. `DayLogPage.jsx`(227줄) 제목 1줄·`day-record.js`(207줄) 빈 날 조건 1줄 제자리 수정 승인(§6). 2. 표시 확인용 서버 하루 줄 1개 `raw` 임시 추가·원복 승인 — 대상(계정·날짜)은 착수 때 AI가 시험용 계정의 이미 있는 날로 골라 보고 후 진행.
3. 7-D-1 알려진 한계 2건 = **별도 슬라이스 7-D-3**(서버, 7-D-2 다음)으로 고침 — 로드맵 7번 등재. 이번 지시서 범위 아님.

### 검증 결과 (2026-10-01) — react-app `33e39b4`
- **지시서와 다른 점 3개:** ① 새 파일 `AssignedVehicleTag.jsx` 안 만듦 — 쓰면 `DayLogPage.jsx`에 불러오기 1줄이 늘어 승인된 "줄 수 그대로"를 어김 → 제목 줄 안에 바로 표시(227줄 그대로),
  대신 표시는 단위 테스트 없이 브라우저로 확인. ② 테스트를 기존 3곳에 나누지 않고 새 파일 `src/lib/assignedVehicleDay.test.js` 하나에(저장 검사·불러오기·하루 저장·서버 쓰기).
  ③ 지시서 밖 `src/lib/hydrateMergeTypes.js` 1칸 — 불러온 하루 기록 타입에 배정차량 칸이 없어 strict 진단 +1 → 실제 값과 타입을 맞춤(우회 없음).
- 줄 수: `persistDayRecord.js` 82, `dayRecordTypes.js` 28, `day-record.js` 207(그대로), `DayLogPage.jsx` 227(그대로), `day-log-shell.css` 153, `driver-connection.css` 148, `hydrateMergeTypes.js` 51.
- `npm test`: unit 753·화면 218 전부 통과. `tsc` 0, strict 427 불변. 되돌려서 FAIL: 이름 목록 → 2개 / 문자열 검사 → 1개 / 빈 날 조건 → 2개 / 카드 클래스 → 1개, 원복 전부 통과.
- 브라우저(AI, 기사 계정 — 이미 로그인돼 있었음):
  - 카드: 연동 정보 줄·[해제 요청] 후 상태 문구 모두 11.52px·회색 = 카드 제목 설명줄과 같음(다크). [요청 취소]로 원복. 앱 테마가 설정으로 다크 고정이라 라이트는 같은 색 변수 사용으로 갈음.
  - 배정차량: 11가1111 차량 9월 30일 하루 줄(원래 `{"isOff": false, "fixedCount": 1, "palletCount": 0, "fixedRouteCounts": {}}`, 비용 2·콜 0)에 SQL로 값 임시 추가 →
    제목 옆 "배정차량 11가1111" 표시 → 횟수 0으로 비움(비용만 남은 빈 날) → 서버 같은 줄 유지·횟수 0·값 유지·비용 2 → 새로고침 후에도 표시, 폰 너비 375px 한 줄·가로 스크롤 없음
    → 앱에서 횟수 1로 되돌림 → SQL로 값 제거 → 서버 하루 정보 원래와 동일·비용 2·콜 0, 앱 표시 사라짐. 콘솔 오류 없음.

### §5 리뷰 (2026-10-01, push·CI 초록 사용자 확인)
| # | 확인 | 결과 |
|---|---|---|
| 1 | 범위 | 프로덕션 8개 = 지시서 파일에서 `AssignedVehicleTag.jsx` 빠지고 `hydrateMergeTypes.js` 1칸 추가(위 "다른 점"에 보고). 서버·`dailyLogRemoval.js`·`PageHeader.jsx` 변경 없음 |
| 2 | 몰래 증설 | 새 저장 키·큐·fallback 없음. 하루 정보 이름 1개 + 빈 날 조건 1개 |
| 3 | 타입 꼼수 | 추가 0건 |
| 4 | 200줄 | `DayLogPage.jsx` 227·`day-record.js` 207 줄 수 그대로(제자리 수정 승인), 나머지 153 이하 |
| 5 | 테스트 진실성 | 기존 테스트 삭제·약화 0줄. 새 테스트 7개 + 카드 확인 1개, 되돌리면 FAIL |
| 6 | 공용 클래스·상태값 | 새 클래스 2개(`employer-link-card`·`assigned-vehicle-tag`)는 각 1곳만 사용. 공용 `saveDayRecord`(일지 저장 2곳: `useDayDraft.js`·`pendingWorkDataWrites.js`)는 배정차량 값이 있을 때만 동작이 달라짐 — 차주·일반 날은 값이 없어 그대로(전체 테스트 통과) |
| 7 | 요구사항 | 기대 동작 전부 — 표시·보존·비워도 유지·폰 너비·카드 글씨 |
