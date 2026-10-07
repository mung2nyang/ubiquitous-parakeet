# docs/report.md — 현재 슬라이스 착수지시서

## 로드맵 14번 화면 손질 A·B — 하단 메뉴 첫 화면 뒤로가기 + 자주 누르는 버튼 44px `[x]`

보리 결정(2026-10-07): 배포 전 작은 슬라이스로 A·B만. 원본과 비교하지 않음(이관 끝남). C(빈 카드·트럭 그림 늦게 뜸)는 15번 별도 슬라이스.

### 현재 상태 (2026-10-07 AI 앱 확인, 휴대폰 크기 375px)

- **A** — 하단 메뉴 4칸 중 매출(`/app/revenue`)·마이페이지(`/app/me`) 첫 화면 왼쪽 위에 `<` 뒤로가기가 있음. 누르면 홈으로 감
  (`AppShellRoutes.jsx:86`·`:96` `onBack={() => navigate('/app')}`). 홈 첫 화면엔 없음 → 화면마다 달라 헷갈림.
- 일일운행(`/app/day/날짜`)의 뒤로가기는 성격이 다름 — 달력 날짜를 눌러 들어온 경우 달력으로 돌아가는 "닫기" 역할이고(`workLogNavigation.test.js:6`),
  나갈 때 입력 즉시 저장에도 쓰임(`App.test.js:398-405`).
- **B** — 실제 잰 크기: 상단 뒤로가기·메뉴·알림 버튼 40×40(`shared-controls.css:130` `.icon-btn`), 달 이동 화살표 34×34
  (`shared-controls.css:41` `.arrow-btn`, 그림 22 + 여백 6), 홈 연·월 선택 칸 높이 32(`app-dropdown.css:6` `min-height: 32px`). 권장 44px보다 작음.

### 목표 상태 (기대 동작)

1. **A**: 매출·마이페이지 첫 화면에 뒤로가기 버튼이 없다. 왼쪽은 빈 자리(제목이 가운데 그대로). 오른쪽 메뉴 버튼은 그대로.
   - 일일운행 화면의 뒤로가기는 **그대로 둔다**(위 이유). → 보리 확인 필요(아래 "결정할 것" 1).
   - 하단 메뉴로 열리지 않는 화면(차량 관리·거래처·개인정보 등)은 지금처럼 뒤로가기 있음.
2. **B**: 상단 뒤로가기·메뉴·알림 버튼 44×44. 그림 크기(20px)는 그대로, 누르는 영역만 커짐.
3. **B**: 달 이동 화살표 44×44(그림 22px 그대로). 같은 버튼을 쓰는 다른 화면도 같이 커짐(아래 영향 목록).
4. **B**: 홈 달력 연·월 선택 칸 높이 44. **홈 달력만** — 다른 화면 드롭다운(15곳)은 안 바뀜.
5. 빈 자리 자리채움(`width: 40` 3곳)도 44로 맞춰 제목이 가운데에서 안 밀림.

### 건드릴 파일

| 파일 | 내용 | 줄 수 |
|---|---|---|
| `react-app/src/components/PageHeader.jsx` | `onBack` 없으면 뒤로가기 대신 빈 자리, 빈 자리 40→44 | 37 → ~40 |
| `react-app/src/components/RevenuePage.jsx` | `PageHeader`에 `onBack` 안 넘김, 안 쓰는 `onBack` 인자 삭제 | 소폭 감소 |
| `react-app/src/components/MyPage.jsx` | 위와 같음 | 195 → ~193 |
| `react-app/src/app/AppShellRoutes.jsx` | `:86`·`:96` `onBack` 넘기기 삭제 | 103 → 103 |
| `react-app/src/components/calendar/CalendarHeader.jsx` | 빈 자리 2곳 40→44 | 83 → 83 |
| `react-app/src/components/calendar/calendar-date-select.css` | 홈 달력 연·월 칸만 `min-height: 44px` | 2 → 3 |
| `react-app/src/shared-controls.css` 또는 새 파일 | `.icon-btn` 44, `.arrow-btn` 최소 44 — **200줄 초과 파일**, 아래 §6 | — |
| 테스트(새 파일 1개) | 아래 테스트 | — |

### 공용 클래스 영향 범위 (§5-6, `grep` 결과)

- `.icon-btn`(크기 변경): `PageHeader.jsx`(뒤로가기·메뉴 — 이 헤더를 쓰는 화면 약 20곳 전부), `CalendarHeader.jsx`(알림·메뉴),
  `NotificationPanel.jsx`(알림 창 닫기 버튼 1곳). `action-icon-btn`·`di-icon-btn`·`auth-back-icon-btn`은 다른 클래스라 영향 없음.
- `.arrow-btn`(크기 변경): `CalendarHeader.jsx`(홈 달력), `RevenueNav.jsx`(매출), `MonthNavigator.jsx`(서류 발급),
  `MaintFuelPage.jsx`(차량 유지비), `SettlementSummaryCard.jsx`(기사 정산) — 5곳 모두 달 이동 줄. 둥근 달 이동 상자가 34→44로 조금 높아짐.
- `.app-dropdown-trigger`는 **안 바꿈**(15곳 공용). 홈 달력 안(`.date-select-group`)에서만 높이 지정.
- 브라우저 확인 때 위 5개 달 이동 줄·알림 창·하단 메뉴 첫 화면 4개를 전부 본다.

### 안 건드릴 것

- `BottomNav.jsx`·`bottom-nav.css` — 이미 44px(앱 실측 60×44).
- `DayLogPage.jsx`(229줄) — 일일운행 뒤로가기 그대로(결정 1이 "그대로"일 때).
- `app-dropdown.css`·`AppDropdown.jsx` — 공용이라 그대로.
- 저장·계산 코드 없음. 화면 크기·버튼 표시만.

### 실패 시 처리 — **신규 레이어 없음**

- 저장·동기화를 안 건드림. 새 저장소·큐·fallback 없음(AGENTS §7).

### §6 200줄

- `shared-controls.css`가 **287줄**(이미 200 초과)이라 고치려면 분리설계안 승인이 필요함(AGENTS §6). 제안:
  - **분리안**: 앞부분 "월 이동기·설정 헤더·아이콘 버튼" 규칙(`.date-navigator`·`.date-select-group`·`.date-select`·`.arrow-btn`·
    `.settings-header`·`.settings-title`·`.icon-btn`, 약 100줄)을 새 파일 `header-controls.css`로 **그대로 옮기고** 거기서 크기를 고침.
    `App.jsx`의 `shared-controls.css` import 바로 앞줄에 같은 자리로 import → 적용 순서 그대로. `shared-controls.css`는 약 185줄로 줄어듦
    (남는 것: 요약 카드·토글·입력·세그먼트·백업 버튼 — 폼·카드 기본형). 책임 경계 = "화면 맨 위 줄" vs "폼·카드".
  - 이 경우 건드릴 파일에 `App.jsx`(import 1줄)·`header-controls.css`(새, ~105줄) 추가.
- 나머지 파일은 전부 200줄 이하 유지(`MyPage.jsx` 195 → ~193).

### §8 질문 답

- 1~4: 저장·구독·쓰기 창구와 무관(화면 모양만). 5: 권한 변경 없음.

### 테스트 (새 파일 `PageHeader.test.js`)

1. `onBack`을 넘기면 뒤로가기 버튼이 있고 누르면 불린다.
2. `onBack`이 없으면 뒤로가기 버튼이 없고 빈 자리가 있다(제목·메뉴 버튼은 그대로).
3. 매출·마이페이지 화면을 그리면 뒤로가기 버튼이 없다. 일일운행 화면엔 있다(기존 `App.test.js:398` 그대로 통과).
- 새 테스트는 바꾼 코드를 잠시 되돌려 FAIL 확인 후 결과 첨부(플레이북 §6). 크기(44px)는 테스트 환경이 CSS를 안 그려 브라우저에서 잰다.

### 결정할 것 (보리)

1. **일일운행 화면 뒤로가기** — AI 추천: **그대로 둠**(달력에서 들어온 날짜 닫기 + 나갈 때 즉시 저장 역할). 다른 의견 있으면 말씀.
2. **`shared-controls.css` 분리** — AI 추천: **위 분리안**. 다른 길: 이번만 예외로 그 파일 안 숫자 2개만 고치기(287줄 유지).

### 보리 결정 (2026-10-07)

1. 일일운행 뒤로가기 **그대로 둠**(추천대로). 2. `shared-controls.css` **분리안**(추천대로). → "착수지시서 확정, 작업 진행해".

### 진행 기록 (2026-10-07)

- 구현(커밋 전). 줄 수: `PageHeader.jsx` 41, `RevenuePage.jsx` 26, `MyPage.jsx` 194, `AppShellRoutes.jsx` 103, `CalendarHeader.jsx` 83,
  `calendar-date-select.css` 3, `App.jsx` 146(import 1줄), `shared-controls.css` 287→184, `header-controls.css` 103(새).
- 분리는 규칙을 글자 그대로 옮김 — 옮기기 전후 두 파일 합친 규칙 줄이 원본과 같음을 비교로 확인(머리 주석 제외). 그 뒤 `.icon-btn` 40→44, `.arrow-btn` `min-width`·`min-height` 44 추가.
- 지시서 밖 추가 수정(타입 검사가 잡음): 마이페이지에 더는 없는 `onBack`을 넘기던 테스트 3개 파일에서 그 한 줄만 삭제 —
  `MyPage.dataDownload.test.js`·`MyPage.inviteModal.test.js`·`accountPermissionUi.test.js`(검사 내용 변경 없음).
- 로컬 `npm test` 전체 통과(unit 788 + 화면 287), `tsc` 오류 0. 새 테스트 `PageHeader.test.js` 3건.
- 되돌림 확인(플레이북 §6): `PageHeader.jsx`만 예전 것으로 되돌려 실행 → 2·3번 FAIL, 복구 후 3건 PASS.

```
✔ onBack을 넘기면 뒤로가기 버튼이 있고 누르면 불린다
✖ onBack이 없으면 뒤로가기 대신 빈 자리, 제목·메뉴는 그대로  — true !== false
✖ 하단 메뉴 첫 화면: 마이페이지·매출에는 뒤로가기가 없다  — true !== false
ℹ pass 1 / ℹ fail 2
```

- AI 앱 확인(375px, 다크): 홈 알림·메뉴 44×44, 달 이동 44×44, 연·월 칸 높이 44, 매출·서류 발급 달 이동 44×44,
  매출·마이페이지 뒤로가기 없음(제목 가운데 그대로), 일일운행·거래처·서류 발급·차량 유지비 뒤로가기 44×44, 가로 넘침 없음.
- 보리 브라우저 확인 후 코드 커밋 **react-app `1e4f638`**(push 전). 다음: 보리 push → CI "verify" 확인 → §5 리뷰 → 최종 `[x]` 승인.

### 확정 (2026-10-07)

- 보리 push → CI "verify" 초록(`1e4f638`) → §5 리뷰 7항목 문제 없음 → 보리 최종 `[x]` 승인.
