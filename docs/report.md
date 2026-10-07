# docs/report.md — 현재 슬라이스 착수지시서

## 입력칸 X(한 번에 지우기) 버튼 — 슬라이스 A: 공용 부품 + 거래처 창 `[x]` (react-app `f61a673`, CI 초록, 보리 최종 승인 2026-10-07)

보리 요청(2026-10-07, 브라우저 지적): 입력 중일 때만 입력칸 오른쪽에 X가 보이고, 누르면 입력한 글자를 한 번에 지운다.
범위는 **앱 전체 입력칸**, 방식은 **공용 부품으로 빼서** 진행(보리 지시). 저장 방식·데이터는 안 바뀜(화면 동작만).

### 전체 계획 (슬라이스 나눔 — 한 번에 하나씩, 슬라이스마다 지시서·승인)

앱 안 글자 입력칸은 약 20개 파일에 흩어져 있어(조사: `grep "<input\|<textarea"`, 91곳 중 체크박스·파일·날짜 제외) 한 번에 못 한다.

| 슬라이스 | 내용 | 파일 |
|---|---|---|
| **A (이번)** | 공용 부품 만들기 + 거래처 등록·수정 창에 적용(보리가 지적한 화면) | 새 부품 2개 + 거래처 창 1개 + 테스트 1개 |
| B | 내 정보·기사·차량 창 | `PersonalInfoPage`·`DriverFormModal`·`CarFormModal`·`CarBusinessInfoSection`·`CarDriverConnectPanel`·`CarDriverIncomeFields`·`InviteRedeemModal` |
| C | 경비·계산서·미수금·고정노선 | `ExpenseFormModal`·`TaxInvoiceDraftModal`·`ReceivableItemCard`·`RoutePresetEditor`·`FixedRouteClientModal` |
| D | 로그인·첫 설정 화면(`auth-input-box`) | `WelcomeProfileView`·`OnboardingPage` |
| E | 200줄 넘는 파일 — 분리설계 먼저(§6) | `CallDetailForm.jsx`(236줄)·`CustomerCenterPage.jsx`(227줄) |

B~E는 마구 고치지 않고, A가 `[x]` 된 뒤 하나씩 지시서를 쓴다. 파일 수가 많아서(§3 "1~3개 파일" 기준 초과) B·C는 "태그 이름만 바꾸는 기계적 교체"라는 조건으로 묶었다. 보리가 더 잘게 나누라면 따른다.

### 보리 결정 (2026-10-07, 착수 승인 "a진행")

1. **제외:** 여러 줄 입력칸(textarea), 날짜·시간 칸, 단위(원·km·톤·%)가 붙은 칸, 좁은 숫자칸(파렛트·횟수).
2. **가운데 정렬 칸에 넣게 되면 왼쪽 정렬로 바꾼다** — X가 붙는 칸은 글자를 왼쪽 정렬.
3. 누르는 영역 44×44px, 화면 읽기 이름 "입력 지우기"(ui-ux-pro-max 규칙 `touch-target-size`·아이콘 버튼 이름).
4. 이에 따라 A 범위에서 **거래처 수수료 칸(원/%)·결제 날짜 칸(며칠 후/날짜) 제외** → `ClientTradeFields.jsx` 안 건드림.

### 현재 상태 (코드 확인)

- 거래처 창 `ClientFormModal.jsx`(96줄): 업체명·담당자·대표자·연락처·사업자번호·업태·종목·주소·이메일·결제 날짜 = 글자칸 10개. `ClientTradeFields.jsx`(59줄)에 수수료 값 칸 1개.
- 각 칸은 고칠 때마다 저마다의 정리 함수를 거친다(예: 연락처 `formatPhoneNumber`, 사업자번호 `formatBizNumber`, 수수료 `formatCurrencyInput`).
- 지우기 버튼 비슷한 기존 부품은 없음(`grep "clear-btn\|input-clear"` 결과 0건). `src/components/shared/`에 공용 부품 폴더가 이미 있음.
- 공용 입력칸 모양 `.input-box`(`shared-controls.css:72`)는 글자 가운데 정렬·폭 100%.

### 목표 상태 (기대 동작)

1. 입력칸을 눌러 **입력 중이고 글자가 1자 이상**일 때만 칸 오른쪽 안쪽에 작은 X가 보인다. 칸에서 나가거나 글자가 없으면 X가 사라진다.
2. X를 누르면 그 칸이 빈 칸이 되고, 키보드·입력 상태는 그대로 유지(바로 다시 입력 가능).
3. 지울 때도 그 칸의 원래 입력 처리(정리 함수)를 그대로 거친다 — 즉 "사용자가 글자를 다 지운 것"과 똑같이 처리된다. 저장은 지금처럼 [저장]을 눌러야 됨.
4. X가 보일 때 긴 글자가 X 밑으로 들어가지 않게 칸 오른쪽 여백을 늘린다. X가 붙는 칸 글자는 왼쪽 정렬.
5. X는 눈에 보이는 크기 작게(약 18px), 누르는 영역 44×44px. 화면 읽기 기능용 이름 "입력 지우기". 라이트·다크 둘 다 맞는 색.

### 만드는 방법 (설명)

- 새 공용 부품 `ClearableInput`: 지금의 입력칸과 똑같이 쓰되(넘기는 값 그대로), 안에 X 버튼만 더 붙인다. 각 화면에서는 `<input` → `<ClearableInput` 으로 **이름만 바꾸면** 된다.
- X를 누르면 부품이 그 칸에 "빈 글자를 입력한 것"과 같은 신호를 보낸다 → 각 화면에 이미 있는 입력 처리가 그대로 돌아서 화면마다 지우기 코드를 따로 쓸 필요가 없다.
- 감싸는 상자(`span`)가 하나 생기므로 칸 배치가 흐트러지지 않게 상자 폭은 입력칸이 원래 차지하던 폭을 그대로 따른다.

### 건드릴 파일 (react-app)

- **새 파일** `src/components/shared/ClearableInput.jsx` — 공용 부품 (예상 50줄 이내)
- **새 파일** `src/components/shared/clearable-input.css` — X 버튼 모양·위치 (예상 40줄 이내)
- **새 파일** `src/components/shared/ClearableInput.test.js` — 아래 테스트
- `src/components/clients/ClientFormModal.jsx` — 글자칸 9개(업체명·담당자·대표자·연락처·사업자번호·업태·종목·주소·이메일) `<input` → `<ClearableInput`

### 안 건드릴 파일

- `src/lib/clients.js`·`src/store/**`·저장 관련 전부 — 화면 입력 처리만 바뀌고 저장 경로는 그대로(이 슬라이스 파일 목록에 저장 코드 없음, §4 플레이북 트리거 해당 없음).
- `src/shared-controls.css`의 `.input-box` — 공용 모양은 안 바꾸고, 새 CSS 파일에서 X가 있을 때만 오른쪽 여백을 늘린다(§5-6 공용 클래스 영향 없음).
- `src/components/clients/ClientTradeFields.jsx` — 수수료 칸은 단위(원/%)가 붙어 제외(보리 결정 1).
- B~E 슬라이스 파일 전부.

### §6 200줄

- `ClientFormModal.jsx` 96줄 → 태그 이름만 바뀌고 import 1줄 추가, 약 97줄.
- 새 파일 2개 모두 100줄 이내 예정. 200줄 넘는 파일 없음.

### §8 질문

1. 구독/스냅샷: 해당 없음(입력 창 안의 임시 값만 다룸). 2. 보이는 값: 창 안의 임시 값(draft). 3. 쓰기 창구: 안 바뀜(기존 [저장] 그대로). 4. 동시 편집: 해당 없음. 5. 권한: 해당 없음(DB 안 건드림).

### 테스트

- `ClearableInput.test.js`: ① 글자 있고 입력 중일 때만 X가 보임 ② 빈 칸·입력 중 아님이면 X 없음 ③ X 누르면 그 칸의 입력 처리가 빈 글자로 불리고 칸이 비워짐 ④ 정리 함수(예: 연락처 하이픈)가 있는 칸에서도 비워짐.
- 기존 거래처 화면 테스트 그대로 통과.
- 브라우저: 거래처 등록·수정 창에서 칸마다 X 보임/숨김·지우기, 라이트·다크, 휴대폰 폭.

### 실패 시 처리

- 새 저장소·복구 장치 없음(§7). 브라우저 검증 실패하면 수정 착수지시서를 따로 써서 재승인.
