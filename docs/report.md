# docs/report.md — 현재 슬라이스 착수지시서

## 문구 정리 3-B — 관리·내역서·확인 창·저장 쪽 문장 `[x]`

로드맵 밖 보리 요청. 전수 조사·수정안 `docs/copy-review.md` C·D·E절. 보리 결정: 말투 "~습니다". 3-A `[x]` `8750267` 다음, 문구 정리 3의 마지막.

### 현재 상태 → 목표 상태

| 위치 | 현재 | 바뀐 문구 |
|---|---|---|
| `DataDownloadModal.jsx:159` | …내 기기로 다운로드합니다.\n세무 증빙이나 개인 보관을 위한 내보내기 기능입니다. | 지금까지 입력한 운행·정산·차량 기록 전체를 내 기기로 다운로드합니다. (둘째 줄 삭제) |
| `lib/notifications.js:101` (일상점검 의무화 알림) | …의무화되었습니다. 안전한 운행을 위해 아래 버튼을 눌러 기능을 켜주세요. | …의무화되었습니다. 아래 버튼을 눌러 일상점검표 기능을 켜 주세요. |
| `lib/notifications.js:120` (백업 알림) | 마지막 백업으로부터 N일이 지났습니다. 최신 데이터로 백업해 주세요. | 마지막 백업 후 N일이 지났습니다. 지금 백업해 주세요. |
| `PersonalInfoPage.jsx:18` (탈퇴 2단계) | 이 작업은 취소할 수 없습니다. 한 번 더 확인해 주세요 | 탈퇴하면 되돌릴 수 없습니다. 마지막으로 한 번 더 확인해 주세요. |
| `ReportPage.jsx:154` | 세부 내역서가 조회되었습니다. | 세부 내역서를 불러왔습니다. |
| `ReportPage.jsx:166` (탭 이름) | 세부내역(거래처선택) | 세부 내역 (거래처 선택) |
| `ReportShareModal.jsx:44` | 내보낼 화면을 찾지 못했습니다. | 내역서를 만들지 못했습니다. 창을 닫았다가 다시 시도해 주세요. |
| `ReportShareModal.jsx:62` | 이 기기에서는 파일 공유를 지원하지 않습니다. | 이 휴대폰에서는 파일 공유를 할 수 없습니다. [PDF 다운로드]로 저장한 뒤 보내 주세요. |
| `ReportShareModal.jsx:81` | 특정 거래처의 상세내역을 조회하고, 거래처 연락처가 등록되어 있는지 확인해 주세요. | 문자로 보내려면 [세부 내역]에서 거래처를 하나 고르고, 그 거래처에 연락처가 있는지 확인해 주세요. |
| `documents/DailyInspectionExportBar.jsx:39` | 내보낼 서식을 찾지 못했습니다. | 점검표를 만들지 못했습니다. 창을 닫았다가 다시 시도해 주세요. |
| `cars/CarListPage.jsx:29` | 해당 차량을 삭제하시겠습니까? 이 차량으로 기록된 운행 내역도 함께 삭제되며 복구할 수 없습니다. | 이 차량을 삭제하시겠습니까? 이 차량의 운행 기록도 함께 지워지며 되돌릴 수 없습니다. |
| `clients/ClientListPage.jsx:114`, `clients/OwnerScopedClientsView.jsx:148`, `drivers/LinkedDriverClientsPage.jsx:168` | 해당 업체를 삭제하시겠습니까? | 이 거래처를 삭제하시겠습니까? |
| `cars/CarFormModal.jsx:110` | 해당 차량(기사) 운행 매출 중 기사에게 지급할 비율(%)을 설정합니다. | 이 차량 매출 중 기사에게 지급할 비율(%)을 설정합니다. |
| `AppSettingsPage.jsx:113` | 금액은 만 원 단위로 요약되어 표시됩니다. | 금액은 만 원 단위로 줄여서 표시합니다. |
| `drivers/EmployerLinkCard.jsx:59` | 연동된 차주와의 연결 관리 | 차주와 연결 관리 |
| `lib/durableWriteGuard.js:78` (나가기 확인) | 마지막 편집을 아직 안전하게 저장하지 못했습니다. 그래도 나가시겠습니까? | 방금 고친 내용이 아직 저장되지 않았습니다. 그래도 나가시겠습니까? |
| `lib/outboxFlush.js:65` | 같은 차량에 이미 겹치는 기간으로 연결되어 있거나 초대된 기록이 있습니다. | 이 차량은 같은 기간에 이미 다른 기사가 연결(또는 초대)되어 있습니다. |
| `domain/invoices.js:83` | 사업자등록번호란이 입력이 안 되어 있어요. 먼저 입력해 주세요. | 사업자등록번호를 먼저 입력해 주세요. |
| `receivables/ReceivableItemCard.jsx:60` | 상차지 미상 → 하차지 미상 | 상차지 없음 → 하차지 없음 (3-A 배포 확인 때 발견) |
| `receivables/ReceivableItemCard.jsx:101` (버튼) | 이 건 입금 완료 | 입금 완료 |
| `DriverConnectionPage.jsx:147` | (계약기간) 2026-10-01 ~ 계속 | 2026-10-01 ~ 종료일 없음 |
| `documents/TaxInvoiceTab.jsx:32·33` | 2. 홈택스에서 사업자로 로그인을 해주세요. / 3. *일괄작성 파일에서 파일 선택을 눌러 앱에서 다운받은 엑셀을 등록해 주세요. | 2. 홈택스에 사업자로 로그인해 주세요. / 3. [일괄작성 파일]에서 [파일 선택]을 눌러 앱에서 받은 엑셀을 올려 주세요. |

- 동작·조건 그대로, 문구만. "운행 일지 → 운행일지" 등 용어 통일은 문구 정리 4에서.

### 건드릴 파일

| 파일 | 줄 수 |
|---|---|
| `react-app/src/components/DataDownloadModal.jsx` | 176 |
| `react-app/src/lib/notifications.js` | 133 |
| `react-app/src/components/PersonalInfoPage.jsx` | 194 |
| `react-app/src/components/ReportPage.jsx` | **234** |
| `react-app/src/components/ReportShareModal.jsx` | 139 |
| `react-app/src/components/documents/DailyInspectionExportBar.jsx` | 88 |
| `react-app/src/components/cars/CarListPage.jsx` | **227** |
| `react-app/src/components/clients/ClientListPage.jsx` | 118 |
| `react-app/src/components/clients/OwnerScopedClientsView.jsx` | 155 |
| `react-app/src/components/drivers/LinkedDriverClientsPage.jsx` | 175 |
| `react-app/src/components/cars/CarFormModal.jsx` | 160 |
| `react-app/src/components/AppSettingsPage.jsx` | 175 |
| `react-app/src/components/drivers/EmployerLinkCard.jsx` | 73 |
| `react-app/src/lib/durableWriteGuard.js` | 79 |
| `react-app/src/lib/outboxFlush.js` | 197 |
| `react-app/src/domain/invoices.js` | 88 |
| `react-app/src/components/receivables/ReceivableItemCard.jsx` | 127 |
| `react-app/src/components/DriverConnectionPage.jsx` | 194 |
| `react-app/src/components/documents/TaxInvoiceTab.jsx` | 196 |
| 테스트 `ReportPage.test.js:1·52·66·70·72·90·113` | 탭 이름 "세부내역(거래처선택)" → "세부 내역 (거래처 선택)" (버튼 찾기·확인 5곳 + 테스트 제목·주석 2곳) |
| 테스트 `ReportShareModal.test.js:117·160` | 기대 문구 2개 새 문구로 |
| 테스트 `lib/notifications.dailyInspection.test.js:20` | 기대 문구 새 문구로 |
| 테스트 `lib/notifications.test.js:41·49` | 기대 문구 "마지막 백업 후 N일…" |

- 19개 + 테스트 4개. 모두 문구만, 줄 수 변화 없음(데이터 다운로드 안내만 한 줄 안에서 짧아짐). AGENTS §3 "1~3개 파일"보다 많음 — 같은 종류 문구 정리라 묶음, **승인 요청**.

### §6 200줄 — **예외 2건 승인 요청**

- `ReportPage.jsx` 234줄, `CarListPage.jsx` 227줄 — 둘 다 이미 200 초과. 이번엔 문구만(각 2곳·1곳) 바꾸고 줄 수 그대로. 책임·구조 변화 없음 — 예외 승인 요청. 나머지 17개는 200 이하.

### 안 건드릴 것 (근거)

- `PersonalInfoPage.test.js:91`은 "한 번 더 확인해 주세요"가 들어있는지 봄 → 새 문구에도 들어 있어 그대로 통과(수정 불필요).
- 테스트 이름에 "해당 차량"이 들어간 것(`CalendarPage.test.js:309`·`financeOwnerExpenseSweep.test.js:38`)과 "마지막 편집을" 주석(`App.test.js:394`) — 화면 문구와 무관, 그대로.
- 저장·동기화 동작 — 그대로. `outboxFlush.js`·`durableWriteGuard.js`는 오류·확인 문구 글자만(아래 플레이북).
- 온보딩 문구·`App.jsx:119` — 보리 결정으로 제외.

### 플레이북 트리거 (AGENTS §4) — 해당, 열람함

- `lib/*outbox*`(`outboxFlush.js`) 포함. 이번엔 `throw new PermanentFailureError('…')`·`window.confirm('…')` 안의 **글자만** 바꾸고 실패 분류·재시도·저장 순서는 그대로 → 플레이북 §1~§5 대상 동작 변화 없음. 기존 저장 테스트 전체 통과로 확인.

### 실패 시 처리 — **신규 레이어 없음**

- 문구만. 새 저장소·장치 없음(AGENTS §7).

### §8 질문 답

- 1~5 무관(표시 문구만, 권한 변경 없음).

### 테스트·확인

- 착수 전 옛 문구 조각으로 테스트 전체 검색함: 위 4개 테스트 파일 + 무관 4곳뿐(위 "안 건드릴 것").
- 새 테스트 없음. 기대 문구 테스트 4개 파일만 새 문구로, 코드 쪽을 옛 문구로 되돌리면 FAIL하는지 확인(결과 첨부).
- 기존 테스트 전체 통과, `tsc` 0.
- AI 개발 서버: 서류 발급 탭 이름, 거래처·차량 삭제 확인 창, 데이터 다운로드 창, 세금계산서 발급 방법.
- **보리 휴대폰 확인**: 서류 발급 → 운송비 내역서 탭 "세부 내역 (거래처 선택)", 거래처 삭제 확인 창, 미수금 카드 버튼 "입금 완료", 세금계산서 "홈택스 발급 방법".

### 진행 기록 (2026-10-09)

- 보리 "착수지시서 확정, 작업 진행해"(19개 파일·`ReportPage.jsx` 234·`CarListPage.jsx` 227 예외 포함). 19개 파일 + 테스트 4개 문구 교체(37줄, 줄 수 변화 없음).
- 로컬 `npm test` 전체 통과(unit 824 + 화면 326), `tsc` 오류 0. 새 테스트 없음(지시서대로).
- 되돌림 확인(플레이북 §6): 코드 쪽 문구를 옛 것으로 → `ReportPage.test.js`·`ReportShareModal.test.js` 8건 중 5건 FAIL(`[세부 내역 (거래처 선택)] 탭 → 창 [조회]…`·`[세부내역] 창에서 [취소]…`·`세부 보기에서도 머리 뒤로가기…`·`SMS: 연락처 없으면 alert 1회…`·`카카오톡: navigator.share 없으면…`), `notifications*.test.js`에서 2건 FAIL(`로그인 계정 + 메인 스위치 꺼짐…`·`14일 경계값…`). 복구 후 전부 PASS.
- AI 개발 서버(5174, 비회원): 서류 발급 → 운송비 내역서 탭 "전체 / 세부 내역 (거래처 선택)" 한 줄에 들어감. 콘솔 오류 없음. (세금계산서 발급 방법·삭제 확인 창 등은 내역이 있어야 보여 테스트·코드 확인으로 대신.)
- 코드 커밋 **react-app `e40f83f`**(push 전). 다음: 보리 push·CI → 휴대폰 확인.
- push(보리) → CI "verify"·"deploy" 초록(`e40f83f`) → 배포본 확인(AI): 새 문구 들어감("세부 내역 (거래처 선택)"·"이 거래처를 삭제하시겠습니까"(3곳)·"종료일 없음"·"마지막 백업 후"), 옛 문구("세부내역(거래처선택)"·"해당 업체를"·"상차지 미상"·"이 건 입금 완료"·"백업으로부터") 0건. §5 리뷰 문제 없음(범위 23개 파일 = 지시서, 문구만·새 저장 장치·타입 꼼수 없음, `ReportPage.jsx` 234·`CarListPage.jsx` 227 예외 승인·나머지 200 이하, 테스트는 기대 문구만·되돌림 FAIL 확인, CSS 변경 없음, 기대 동작 전부 구현). 보리 휴대폰 확인 대기.
- 보리 휴대폰 확인·최종 `[x]` 승인(2026-10-09).
