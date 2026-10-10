# docs/report.md — 현재 슬라이스 착수지시서

## 새 홈 3단계 — 운행 탭 달력 위쪽을 홈 위쪽과 같은 모양으로(알림 종만 뺌) `[x]`

보리 요청 2026-10-10(로드맵 밖), 2단계 `[x]`(react-app `new-home` `e60e329`) 다음. 같은 브랜치 `new-home`.
이 단계가 끝나면 `new-home`을 main에 합쳐 배포(별도 확인 후).
보리 지시(2026-10-10): "운행탭 상단을 홈상단과 동일하게 바꾸고 종만 없애자" — 처음 안(가운데 제목 "운행")은 폐기.

### 현재 상태 (코드 확인)
- 운행 탭 달력(`/app/calendar`) 위쪽이 예전 홈 머리 그대로: 왼쪽 알림 종, 가운데 큰 로고(트럭 그림 + "운행일지"), 오른쪽 메뉴, 그 아래 달 선택(`CalendarHeader.jsx`).
- 홈 위쪽은 1단계 수정 1로 한 줄(왼쪽 작은 로고, 오른쪽 알림 종 + 메뉴, `HomePage.jsx` 안에 직접 그림).

### 목표 상태 (기대 동작)
1. 운행 탭 달력 위쪽 = **홈과 똑같은 한 줄**: 왼쪽 작은 로고(트럭 그림 + "운행일지"), 오른쪽 **메뉴만**(알림 종 없음).
2. 큰 로고 줄은 없어지고 그 아래 달 선택(◀ 2026년 10월 ▶)은 그대로, 위로 당겨짐.
3. 홈 위쪽은 지금 그대로(알림 종 + 메뉴).
4. 두 화면이 같은 모양을 쓰도록 홈 위쪽 줄을 공용 부품 `AppTopBar` 하나로 빼서 홈·달력이 같이 씀(알림은 넘길 때만 보임).
5. 사이드메뉴에서 여는 서브차량 달력(`/app/logs/번호`)도 같은 머리 + 지금 있는 "○○ 운행일지 [메인 일지로]" 띠 그대로.
6. 달력 칸·정산 카드·날짜 누르기·월 이동 그대로.

### 건드릴 파일
| 파일 | 내용 | 줄 수(현재 → 예상) |
|---|---|---|
| `react-app/src/components/shared/AppTopBar.jsx` (새) | 홈 위쪽 줄을 그대로 옮긴 공용 부품(작은 로고 + [알림] + 메뉴) | 새로 약 45 |
| `react-app/src/components/shared/app-top-bar.css` (새) | `home.css`의 위쪽 줄 규칙 + `calendar-header.css`의 알림 버튼·숫자 배지 규칙을 옮김(이름 `app-topbar…`) | 새로 약 60 |
| `react-app/src/components/home/HomePage.jsx` | 위쪽 줄 → `AppTopBar`(알림 넘김) | 95 → 약 70 |
| `react-app/src/components/home/home.css` | 위쪽 줄 규칙 삭제(옮김) | 190 → 약 160 |
| `react-app/src/components/calendar/CalendarHeader.jsx` | 위쪽 줄·큰 로고 → `AppTopBar`(알림 안 넘김) | 83 → 약 45 |
| `react-app/src/components/calendar/calendar-header.css` | 규칙이 전부 `app-top-bar.css`로 옮겨져 **파일 삭제** | 26 → 삭제 |
| `react-app/src/components/calendar/CalendarPage.jsx` | 머리에 알림 값 안 넘김 | 99 → 약 97 |
| `react-app/src/app/MainPageRoute.jsx` | 달력에 알림 값 안 넘김 | 136 → 약 132 |
| `react-app/src/app/AppShellRoutes.jsx` | 달력 쪽에 알림 값 안 넘김(홈은 그대로) | 105 → 약 105 |
| `react-app/src/components/calendar/calendar.css` | 큰 로고용 규칙(`.banner-*`, 머리 위쪽 -30px 당김) 삭제 — 이제 아무도 안 씀 | 252 → 약 231 |
| `react-app/src/components/home/HomePage.test.js` | 위쪽 줄 확인 이름만 새 이름으로 | 소폭 |

### 안 건드릴 것
- `controls-common.css`의 `.top-notification-btn` 누름·올림 색 규칙 — 클래스 이름 그대로 써서 그대로 적용(근거: `controls-common.css:122·128`).
- 큰 로고 클래스(`banner-container` 등)는 `CalendarHeader.jsx`만 씀(근거: 전체 `grep`) → 같이 지워도 다른 화면 영향 없음.
- 달 선택(`CalendarDateSelect`)·정산 카드·칸 — 그대로.
- 저장·계산 무변경, 플레이북 대상 아님.

### 테스트
- 새: 달력 위쪽에 작은 로고·메뉴 버튼이 있고 알림 버튼·큰 로고가 없음, 월 이동 버튼 그대로. 홈은 알림 + 메뉴 그대로.
- 기존 달력·앱 테스트 그대로 통과(메뉴 버튼은 그대로라 `App.guestDurable.test.js:808` "달력 헤더 메뉴 버튼" 영향 없음).
- 되돌림 FAIL 확인.

### §6 200줄
- `calendar.css`는 이미 252줄(18-C 때 예외 승인 `2345f7b`) — 이번엔 지우기만 해서 약 231로 줄어듦, 새로 늘지 않음. 나머지는 200줄 이하.

### 실패 시 처리
- 새 저장소·재시도·대체 장치 등 **신규 레이어 없음**.

### 보리 결정 (2026-10-10)
- 더 넣을 다듬기 없음 — 이것만 하고 main 합치기로.

착수지시서 확정, 작업 진행 승인(2026-10-10).

### 진행 (2026-10-10)
- react-app `new-home` 커밋 `99a317d`(push 안 함). 새 `shared/AppTopBar.jsx`(43)·`shared/app-top-bar.css`(56), `calendar-header.css` 삭제, `calendar.css` 252 → 230, `home.css` 190 → 156, `CalendarHeader.jsx` 83 → 51, `HomePage.jsx` 95 → 67.
- typecheck 통과, 화면 테스트 357 전부 통과(새 1건). 되돌림 FAIL 확인: 옛 달력 머리로 되돌리면 새 테스트 실패.
- AI 브라우저 확인: 운행 탭 위쪽 = 작은 로고 + 메뉴, 달 선택 바로 아래, 홈은 알림 + 메뉴 그대로.
- 남은 것: push(브랜치) → CI → 보리 휴대폰 확인.
- push(보리) → CI 초록, 보리 최종 승인 `[x]`(2026-10-10). 이후 보리 지시: 착수지시서 없이 바로 수정.
