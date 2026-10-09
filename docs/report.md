# docs/report.md — 현재 슬라이스 착수지시서

## 문구 정리 3-A — 일지·홈·일상점검·문자 화면의 문장·맞춤법·말투 `[x]`

로드맵 밖 보리 요청. 전수 조사·수정안 `docs/copy-review.md` C·D·E·G절. 보리 결정: 말투 "~습니다", 온보딩 제외.
문구 정리 3은 고칠 파일이 약 28개라 **3-A 일지·홈·일상점검·문자(12개 + 테스트 3개)**와 **3-B 관리·내역서·확인 창·저장 쪽(16개)**으로 나눔 — 이번은 3-A.

### 현재 상태 → 목표 상태

| 위치 | 현재 | 바뀐 문구 |
|---|---|---|
| `day-log/CallDetailForm.jsx:74` | ↺ 직전 항목과 동일하게 채우기 | ↺ 바로 전 내역 그대로 채우기 |
| `CallDetailForm.jsx:104` | 부가세 포함 금액으로 계약하셨다면 ÷1.1 한 금액을 입력해 주세요. | 부가세 포함 금액이면 1.1로 나눈 금액을 입력해 주세요. (예: 110,000원 → 100,000원) |
| `CallDetailForm.jsx:151·163` (입력칸 흐린 글씨) | 직접입력 또는 선택 | 직접 입력 또는 선택 |
| `CallDetailForm.jsx:194·220` (체크 이름) | 부가세 해제 | 부가세 없음 |
| `CallDetailForm.jsx:204` (입력칸 흐린 글씨) | 금액입력 | 금액 입력 |
| `day-log/CallDetailCard.jsx:28` | 운행거리:12km | 운행거리 12km |
| `CallDetailCard.jsx:37·39` | 상차지 미상 / 하차지 미상 | 상차지 없음 / 하차지 없음 |
| `CallDetailCard.jsx:48` | 출발:09:00 ➜ 도착:11:00 | 출발 09:00 ➜ 도착 11:00 |
| `CallDetailCard.jsx:56` | 비고:- | 비고: - |
| `CallDetailCard.jsx:70` (전화 버튼 이름) | 전화걸기 | 전화 걸기 |
| `day-log/DailyInspectionNotice.jsx:86` | …일상점검표 작성이 완료 되었습니다. | …일상점검표 작성이 완료되었습니다. |
| `day-log/DailyInspectionModal.jsx:122` (입력칸 흐린 글씨) | (예시)창닦이기 불량 | 예: 창닦이기 불량 → 와이퍼 교체 |
| `documents/DailyInspectionExportBar.jsx:71` | ※ PDF,이미지 등 내보내기시 선택된 '월'의 전체 점검표가 '법정 서식'으로 저장됩니다. | ※ PDF·이미지로 내보내면 선택한 달의 전체 점검표가 법정 서식으로 저장됩니다. |
| `calendar/CalendarMonthSummary.jsx:11` (홈 합계 설명) | …+ 부가세예요. …차량 지출 기록이에요. | …+ 부가세입니다. …차량 지출 기록입니다. |
| `CalendarMonthSummary.jsx:21` | …이 거래처 운송료에서 빼요. | …이 거래처 운송료에서 뺍니다. |
| `CalendarMonthSummary.jsx:28` | 차량 관리에 적은 이 차량의 수수료(…)예요. 운송료에서 거래처 수수료를 뺀 금액을 기준으로 계산해 빼요. | 차량 관리에 적은 이 차량의 수수료(…)입니다. 거래처 수수료를 뺀 운송료에서 이만큼 다시 뺍니다. |
| `CalendarMonthSummary.jsx:49` | 이번 달 총 N원의 미수금이 있습니다. | 이번 달 미수금 N원이 있습니다. |
| `MessageSettingsPage.jsx:69·78·87` | …문자보내기에 사용됩니다. | …문자 보내기에 사용됩니다. |
| `FixedRouteClientModal.jsx:106` | 고정노선 거래처 연결을 해제할까요? | 고정 노선 거래처 연결을 해제하시겠습니까? |
| `RunCountChips.jsx:98` | N회 버튼을 삭제할까요? | N회 버튼을 삭제하시겠습니까? |
| `app/useBackToExit.js:7` | 뒤로가기를 한 번 더 누르면 종료돼요 | 뒤로가기를 한 번 더 누르면 종료됩니다. |
| `app/App.jsx:68` | …마이페이지에서 로그인할 수 있어요. | …마이페이지에서 로그인할 수 있습니다. |
| `auth/WelcomeProfileView.jsx:41` | 처음 오셨네요. 이름과 휴대전화 번호를 알려 주시면 바로 시작할 수 있어요. | 이름과 휴대전화 번호를 입력하면 바로 시작할 수 있습니다. |

- 동작·계산·조건 그대로, 문구만. "운행 일지 → 운행일지" 같은 용어 통일은 문구 정리 4에서(이번 문구 안에 나와도 4에서 한꺼번에).

### 건드릴 파일

| 파일 | 줄 수 |
|---|---|
| `react-app/src/components/day-log/CallDetailForm.jsx` | **237** 그대로 |
| `react-app/src/components/day-log/CallDetailCard.jsx` | 99 |
| `react-app/src/components/day-log/DailyInspectionNotice.jsx` | 101 |
| `react-app/src/components/day-log/DailyInspectionModal.jsx` | 136 |
| `react-app/src/components/documents/DailyInspectionExportBar.jsx` | 88 |
| `react-app/src/components/calendar/CalendarMonthSummary.jsx` | 161 |
| `react-app/src/components/MessageSettingsPage.jsx` | 108 |
| `react-app/src/components/FixedRouteClientModal.jsx` | 111 |
| `react-app/src/components/RunCountChips.jsx` | 105 |
| `react-app/src/app/useBackToExit.js` | 57 |
| `react-app/src/app/App.jsx` | 150 |
| `react-app/src/components/auth/WelcomeProfileView.jsx` | 82 |
| 테스트 `calendar/CalendarMonthSummary.test.js:227·247` | 기대 문구 "빼요" → "뺍니다", "…예요" → "…입니다" |
| 테스트 `day-log/DailyInspectionNotice.test.js:132` | 기대 문구 "완료 되었습니다" → "완료되었습니다" |
| 테스트 `RunCountChips.test.js:70` | 기대 문구 "삭제할까요?" → "삭제하시겠습니까?" |

- 12개 + 테스트 3개. 모두 문구만, 줄 수 변화 없음. AGENTS §3 "1~3개 파일"보다 많음 — 같은 종류 문구 정리라 묶음, **승인 요청**.

### §6 200줄 — **예외 1건 승인 요청**

- `CallDetailForm.jsx`는 이미 237줄. 이번엔 문구만(6곳) 바꾸고 줄 수 그대로. 책임·구조 변화 없음 — 예외 승인 요청. 나머지 11개는 200 이하.

### 안 건드릴 것 (근거)

- `App.jsx:119` "설정을 저장했어요." — 온보딩 마친 직후 안내라 **온보딩 제외 결정에 따라 그대로**(보리가 온보딩 다듬을 때 함께).
- 문자 기본 문구(`lib/messageTemplates.js`) — 거래처에 보내는 글이라 그대로.
- 테스트에서 `EXIT_HINT`는 상수로 비교(`useBackToExit.test.js:64·68`) → 문구 바꿔도 테스트 수정 불필요. `CallDetailForm.test.js:52` "부가세 해제"는 주석이라 그대로. `modalOutsideClick.test.js:82` "삭제할까요?"는 테스트가 직접 넣는 예시 문구라 무관.
- CSS·화면 구조 — 그대로.

### 실패 시 처리 — **신규 레이어 없음**

- 문구만, 저장·동기화 무관. 새 장치 없음(AGENTS §7). 플레이북 트리거 파일 없음.

### §8 질문 답

- 1~5 무관(표시 문구만, 권한 변경 없음).

### 테스트·확인

- 새 테스트 없음. 기대 문구 테스트 3개 파일(4곳)만 새 문구로 고치고, 코드 쪽을 옛 문구로 되돌리면 FAIL하는지 확인(결과 첨부).
- 착수 전 옛 문구 조각으로 테스트 전체 검색함(2-B 때 놓친 일 재발 방지): "직전 항목과·÷1.1·부가세 해제·직접입력·금액입력·미상·운행거리:·출발:·비고:·전화걸기·완료 되었습니다·예시)·내보내기시·부가세예요·빼요·미수금이 있습니다·문자보내기·해제할까요·삭제할까요·종료돼요·로그인할 수 있어요·알려 주시면" → 위 4곳 + 무관 3곳뿐.
- 기존 테스트 전체 통과, `tsc` 0.
- AI 개발 서버: 일일운행 세부 입력 창·카드, 홈 합계 (i) 설명, 문자 문구 설정, 횟수 버튼 삭제 확인 창.
- **보리 휴대폰 확인**: 일일운행 세부 입력(바로 전 내역 채우기·부가세 안내·부가세 없음), 입력한 운행 카드(운행거리·출발/도착·비고), 홈 정산 카드 (i), 뒤로가기 두 번 안내(설치 앱).

### 진행 기록 (2026-10-09)

- 보리 "착수지시서 확정, 작업 진행해"(12개 파일·`CallDetailForm.jsx` 237줄 예외 포함). 12개 파일 + 테스트 3개 문구 교체(32줄, 줄 수 변화 없음).
- 로컬 `npm test` 전체 통과(unit 824 + 화면 326), `tsc` 오류 0. 새 테스트 없음(지시서대로).
- 되돌림 확인(플레이북 §6): 코드 쪽 4곳을 옛 문구로 → 3개 테스트 파일 18건 중 4건 FAIL(`길게 누르면 확인 창이 뜨고…`·`로드맵 12번: 수수료 있는 거래처 줄에만 (i)…`·`로드맵 12번: 기사차량 수수료가 있을 때만…`·`작성 전 [+ 입력] → … "작성 완료 [보기]"`), 복구 후 18건 PASS.
- AI 개발 서버(5174, 비회원): 홈 정산 카드 (i) "…부가세입니다. …차량 지출 기록입니다.", 일일운행 세부 입력 창(부가세 안내·"직접 입력 또는 선택"·"부가세 없음"), 저장한 운행 카드 "상차지 없음 ➜ 하차지 없음 / 거래처: - / 운행거리 12km / 비고: -". 콘솔 오류 없음. (확인용으로 이 테스트 기기 설정의 세부 입력·시간·계기판을 켜고 운행 1건 저장 — 로컬 개발 주소 전용 데이터.)
- 코드 커밋 **react-app `8750267`**(push 전). 다음: 보리 push·CI → 휴대폰 확인.
- push(보리) → CI "verify"·"deploy" 초록(`8750267`) → 배포본 확인(AI): 새 문구 들어감("바로 전 내역 그대로 채우기"·"부가세 없음"·"상차지 없음"·"작성이 완료되었습니다"·"종료됩니다."), 옛 문구("직전 항목과 동일하게"·"부가세 해제"·"종료돼요") 0건. "상차지 미상" 1건 남음 → 미수금 화면 `receivables/ReceivableItemCard.jsx:60`(같은 표현, 3-A 범위 밖 파일) — **3-B에 추가**. §5 리뷰 문제 없음(범위 15개 파일 = 지시서, 문구만·새 저장 장치·타입 꼼수 없음, `CallDetailForm.jsx` 237 예외 승인·나머지 200 이하, 테스트는 기대 문구만·되돌림 FAIL 확인, CSS 변경 없음, 기대 동작 전부 구현). 보리 휴대폰 확인 대기.
- 보리 휴대폰 확인·최종 `[x]` 승인(2026-10-09).
