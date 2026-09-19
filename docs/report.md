# docs/report.md — 현재 슬라이스 착수지시서

## §16 슬라이스 D — 일일운행 입력 화면이 차량별 설정값을 실제로 읽게 배선

> 상태: **`[x]` 완료(2026-09-19)** — react-app `d7ff955`, push·CI 초록·보리 브라우저 검증·§5 리뷰 7항목 이상 없음·최종 승인
> 결정: ① 달력 포함(`CalendarPage.jsx` 반영) ② 저장값 없는 서브차량은 기본값(전부 꺼짐)
> 으로 바뀌는 동작 수락.
> 로컬: `npm test` 817개(도메인 645 + 컴포넌트 172, 새 테스트 5개 포함) 통과·`tsc` 0에러.
> 수정 파일 줄 수: `MainPageRoute.jsx` 134·`CalendarPage.jsx` 121·`carSettingsScope.js` 17 — 전부 200줄 이하.

### 1. 목적 (쉬운 말)

슬라이스 C에서 "서브차량 설정화면"이 차량마다 따로 값을 저장하게 됐지만,
정작 그 차량의 일지 입력 화면은 차량과 상관없이 **메인 설정값만** 읽고 있다.
그래서 서브차량 설정에서 "계기판 입력"을 꺼도 그 차량 일지에는 그대로 보인다.
이 슬라이스는 일지 입력 화면이 **그 차량의 설정값**을 읽도록 연결한다.

### 2. 현재 상태 (근거 병기)

- `MainPageRoute.jsx:55` — `useOwnerSettings(ownerKey)` 한 번으로 메인 설정을 읽어
  `:100`에서 `DayLogPage`에 `settings`로 그대로 내려준다. `logId`(`:51`)는 알지만
  설정 선택에는 안 쓴다.
- `DayLogPage.jsx`(`:82,:155,:172,:179`)·`CallDetailForm.jsx`(`:102,110,122,141`)·
  `CallDetailCard.jsx`(`:28,29,46,63`)는 받은 `settings`의 `callDetail`/`timeOn`/
  `platformOn`/`distanceOn`/`cargoTonnageOn`을 읽는다 → 전부 메인 값.
- `AppSettingsPage.jsx:52`는 이미 `settings.subCarSettings?.[logId] || defaultCarSettings()`
  로 차량별 값을 읽고 있다(슬라이스 C).
- **달력도 같은 상태**: `CalendarPage.jsx:103`이 `settings.inputMode`(메인 값)만 읽는다.
  `inputMode`(횟수/금액 표시 방식)를 소비하는 곳은 달력뿐이라
  (`DayLogPage`는 `settings.inputMode`를 안 읽음 — day-log 폴더 grep 0건),
  달력을 안 고치면 차량별 "달력 표시 방식" 설정은 어디에도 반영되지 않는다.

### 3. 목표 상태 / 기대 동작

1. **서브차량 일지 입력 화면**(`/app/logs/:logId/day/:date`)이 시간·플랫폼·계기판·
   톤수·"세부 입력(callDetail)"을 **그 차량의 저장값**(`subCarSettings[logId]`)대로
   보이거나 숨긴다. 서브차량 설정화면에서 끄면 그 차량 일지에서 즉시 사라진다.
2. 저장값이 아직 없는 서브차량은 **설정화면(`AppSettingsPage.jsx:52`)과 똑같이
   기본값(전부 꺼짐)** 으로 보인다 — 설정화면에 보이는 값과 일지 화면이 어긋나지 않게.
3. **메인 일지·연동기사 본인 세션은 변화 없음.** 메인은 `logId==='main'`이라 스코프
   안 함, 연동기사 본인은 `logId`가 항상 `main`(`MainPageRoute.jsx:58` 주석)이라 동일.
4. 결제·고정노선·횟수 프리셋·자주 쓰는 위치(pinned)는 **계속 공용값** — 이번에 안 바꿈.
5. **[결정 필요 ①] 달력** — 서브차량 달력(`/app/logs/:logId`)이 그 차량의
   "표시 방식(횟수/금액)"을 읽게 할지: 아래 §4 참고.

### 4. 사용자 결정 필요 (2개)

- **① 달력 포함 여부.** 포함(권장): `CalendarPage.jsx` 1줄 수정 추가(파일 2~3개 범위 유지).
  제외: 차량별 "달력 표시 방식" 설정은 여전히 어디에도 반영 안 됨 → 별도 슬라이스 필요.
  (참고: `CalendarPage.jsx:67`의 `distanceOn = isMain && ...`는 서브차량 주행거리 요약을
  막고 있음. 이것도 이 슬라이스에서 같이 풀지는 별도 판단 — 이번엔 안 건드림.)
- **② 기존 서브차량 화면 변화 고지.** 지금은 서브차량 일지도 메인의 "시간/계기판" 등이
  켜져 있으면 그대로 보인다. 이번 배선 후엔 **저장값 없는 서브차량은 전부 꺼진
  상태**로 바뀐다(설정화면이 이미 그렇게 보여주는 값과 일치). 이미 쓰던 서브차량은
  설정화면에서 한 번 켜줘야 다시 보인다. 이 동작으로 진행해도 되는지 확인.

### 5. 방식

- **`MainPageRoute.jsx`에서 스코프**: `logId !== 'main'`이면 `settings`에 그 차량의
  세부입력 5종+`inputMode`를 덮어씌운 사본을 `DayLogPage`(와 ①이면 `CalendarPage`)에
  내려준다. 자식(`DayLogPage`/`CallDetailForm`/`CallDetailCard`)은 **수정 없음** —
  이미 `settings.timeOn` 등을 읽는 구조라 값만 바뀐 사본을 받으면 됨.
- 덮어쓰기 규칙은 순수 함수 1개(`resolveLogSettings(settings, logId)`)로 새 파일에 둠.
  `practiceSettings.js`는 이미 250줄이라 거기에 더 넣지 않음(§6).
- 사본은 읽기 전용 파생값 — 저장으로 되돌려 쓰는 경로 없음.
  `DayLogPage.jsx:124-127`은 `pinnedLocations` 한 필드만 `savePracticeSettings`로
  저장하므로(전체 settings 통째 저장 아님) 안전.

### 6. 건드릴 파일 / 안 건드릴 파일

**건드릴 파일 (신규 1 + 수정 1~2 + 테스트 1)**

| 파일 | 변경 | 줄 수(현재 → 예상) |
|---|---|---|
| `src/domain/carSettingsScope.js` (신규) | `resolveLogSettings` 순수 함수 | 0 → 약 25 |
| `src/domain/carSettingsScope.test.js` (신규) | 메인 무변화·서브 덮어쓰기·저장값 없음→기본값·공용값 보존 | 테스트 파일(§6 예외) |
| `src/app/MainPageRoute.jsx` | 스코프한 settings를 `DayLogPage`에 전달 | 132 → 약 140 |
| `src/components/calendar/CalendarPage.jsx` | **①에서 "포함" 선택 시에만** — `inputMode` 소스 1줄 | 119 → 약 122 |

**§6 200줄**: 위 수정 파일은 전부 200줄 이하 유지. 200줄 넘는 `DayLogPage.jsx`(225)·
`CallDetailForm.jsx`(227)·`practiceSettings.js`(250)는 **수정하지 않는다**(분리설계 불필요).

**안 건드릴 파일 (근거)**
- `DayLogPage.jsx`/`CallDetailForm.jsx`/`CallDetailCard.jsx` — `settings.timeOn` 등을
  prop으로 읽기만 함(`grep settings` 결과 위 §2). 들어오는 값만 바뀜.
- `AppSettingsPage.jsx` — 슬라이스 C에서 완료, 읽기 규칙이 이미 `:52`에 있음.
- `src/store/**`·`persistDomainSchema.js`·`practiceSettings.js` — 저장 구조 변경 없음
  (`subCarSettings` 허용 필드는 C에서 이미 추가, `persistDomainSchema.js:23`).
- `domain/finance*`·`clients.js` — 계산 엔진 무관.
- react-app 작업 폴더의 기존 미커밋 변경 4건(`LinkedDriverClientsPage.jsx` 수정,
  `LinkedDriverDirectClientsList.jsx`·`fetchDriverOwnClients.js`·`.test.js` 삭제)은
  §15-E 조사 잔여물 — **이 슬라이스와 무관, 이 슬라이스 커밋에 포함하지 않는다.**

### 7. §8 5대 질문

1. **구독/스냅샷**: 구독. `MainPageRoute`가 이미 `useOwnerSettings`로 구독 중이고,
   스코프 계산도 같은 컴포넌트에서 하므로 설정 변경 시 자동 재계산.
2. **값의 출처**: Store(`useOwnerSettings`)의 `settings.subCarSettings[logId]`.
   draft/localStorage/Supabase 직접 접근 없음.
3. **쓰기 창구**: 이번 슬라이스는 **쓰기 없음**(읽기 배선만). 기존 pinned 저장은 무변경.
4. **hydrate·동시편집**: 파생값이라 충돌 없음. hydrate로 설정이 바뀌면 구독으로 다시 계산.
5. **DB 권한**: 테이블·컬럼·RLS 변경 없음 → 해당 없음.
- 플레이북 트리거(§4): 수정 파일에 `src/store/**`·`supabaseClient`·`localStorage` 직접
  접근·`finance*` 없음 → `testing-playbook.md` 열람 불필요(저장·동기화 아님, 보여주기만).

### 8. 실패 시 처리

**신규 레이어 없음**(새 저장 키·큐·fallback·tombstone 안 만듦). 새 파일은 순수 함수 1개뿐.
문제 나오면 코드 건드리지 않고 "수정 착수지시서"를 이 파일에 쓰고 재승인 대기.

### 9. 검증 계획

- AI: 로컬 `npm test`(+ 새 테스트) 통과.
- 사용자 브라우저(`npm run dev`):
  1. 미연동 서브차량의 톱니바퀴 → 설정에서 "계기판 입력" 켬 → 그 차량 달력에서 날짜 →
     일지에 계기판 입력칸이 **나타남**.
  2. 같은 설정에서 끔 → 일지에서 **사라짐**.
  3. 메인 일지는 메인 설정 그대로(서브차량 설정을 바꿔도 영향 없음).
  4. (①포함 시) 서브차량 설정에서 표시 방식을 "금액"으로 → 그 차량 달력 셀이 금액 표시.
- CI "verify" 초록 → 사용자 최종 `[x]`.
