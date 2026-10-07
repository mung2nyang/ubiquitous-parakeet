# docs/report.md — 현재 슬라이스 착수지시서

## 입력칸 X(한 번에 지우기) 버튼 — 슬라이스 C: 경비·계산서·미수금 `[x]` (react-app `bcb5f9a`, CI 초록, 보리 최종 승인 2026-10-07)

A(react-app `f61a673`)의 공용 부품 `ClearableInput`을 경비·세금계산서·미수금 화면에 넣는다. 부품 자체는 안 고친다.
A·B의 보리 결정 그대로: 여러 줄·날짜·단위(원·km·톤·%·L) 칸 제외, X 붙는 칸 왼쪽 정렬, 누르는 영역 44px, 회색 동그라미 X.

### 보리 결정 (2026-10-07, 착수 승인)

1. 미수금 "입금액 입력" 칸(`ReceivableItemCard.jsx:112`) **넣는다** — 줄 CSS(`receivables.css:380`) 1곳 같이 고침.
2. 앱 설정 노선 칩 상차지·하차지 칸(`RoutePresetEditor.jsx`) **뺀다** — 좁은 줄, 유지·삭제 고민 중인 기능.

### 현재 상태 (코드 확인)

| 파일 | 줄 수 | 넣을 칸 | 뺄 칸 (이유) |
|---|---|---|---|
| `ExpenseFormModal.jsx` | 181 | (정비/기타) 항목명 1칸 | 누적거리(km)·비용(원)·유가보조금(원)·주유량(L) |
| `TaxInvoiceDraftModal.jsx` | 81 | 사업자등록번호·대표자·이메일·업태·종목·주소·품목·비고 = 8칸 | 거래처명(읽기 전용)·작성일자(날짜) |
| `receivables/ReceivableItemCard.jsx` | 126 | 입금액 1칸(질문 1) | 없음 |
| `RoutePresetEditor.jsx` | 55 | 없음(질문 2) | 상차지·하차지 |
| `FixedRouteClientModal.jsx` | 111 | 없음 | 1회 단가·파렛트 단가(원) |

- 세금계산서 창·경비 창은 [저장]을 눌러야 저장(지운 뒤 [취소]로 되돌릴 수 있음).
- 입금액 칸 줄: `.receivable-partial-input-row .input-box { flex: 1 }`(`receivables.css:380`) — 칸이 감싸는 상자 안으로 들어가면 이 "남는 폭 채우기"가 칸에 안 먹힘 → 상자에 걸어 줘야 함.
  이 클래스는 `ReceivableItemCard.jsx:111` 한 곳에서만 씀(`grep receivable-partial-input-row` 결과 1건, §5-6).

### 목표 상태 (기대 동작)

1. 위 표의 "넣을 칸" 10칸(질문 1 "넣는다"일 때)에서 A와 똑같이 동작.
2. 입금액 줄은 지금처럼 칸이 남는 폭을 채우고 [확인] 버튼이 오른쪽에 붙음 — 줄 모양이 안 바뀜.
3. "뺄 칸"은 지금과 똑같음. 저장 방식·각 칸 입력 처리는 그대로.

### 건드릴 파일 (react-app)

- `src/components/ExpenseFormModal.jsx` — 1칸 + import
- `src/components/TaxInvoiceDraftModal.jsx` — 8칸 + import
- `src/components/receivables/ReceivableItemCard.jsx` — 1칸 + import(질문 1)
- `src/components/receivables/receivables.css` — 입금액 줄 규칙 1곳: 남는 폭 채우기를 감싸는 상자(`.clearable-input`)에 걸기(질문 1)

4개 파일. 질문 1을 "뺀다"로 하면 2개 파일.

### 안 건드릴 파일

- `src/components/shared/ClearableInput.jsx`·`clearable-input.css` — 부품 그대로.
- `src/components/RoutePresetEditor.jsx`(질문 2)·`src/components/FixedRouteClientModal.jsx`(전부 원 칸).
- 저장 경로(`src/lib/**`·`src/store/**`·미수금 입금 처리) — 화면 태그만 바뀜.

### §6 200줄

- `ExpenseFormModal.jsx` 181 → **182줄**. `TaxInvoiceDraftModal.jsx` 81 → 82줄. `ReceivableItemCard.jsx` 126 → 127줄. 200줄 넘는 파일 없음.

### §8 질문

1. 구독/스냅샷: 바뀌지 않음. 2. 보이는 값: 각 창의 임시 값 그대로. 3. 쓰기 창구: 바뀌지 않음 — X는 "글자를 다 지운 입력"과 같아 기존 onChange를 그대로 거침. 4. 동시 편집: 해당 없음. 5. 권한: DB 안 건드림.
- §4 플레이북: `receivables*` 화면이지만 입금 처리·저장 코드는 안 바뀜(태그·CSS만) → 참고만.

### 테스트

- 새 테스트 없음(부품 동작은 A의 `ClearableInput.test.js`). 기존 `TaxInvoiceDraftModal.test.js`·`App.test.js`·`App.guestDurable.test.js` 그대로 통과해야 함.
- 브라우저: 세금계산서 창 반쪽 폭 칸(대표자/이메일·업태/종목), 경비 창 항목명, 미수금 입금액 줄 모양·X, 휴대폰 폭. 전부 [취소]로 닫아 저장 안 함.

### 실패 시 처리

- 새 저장소·복구 장치 없음(§7). 브라우저 검증 실패하면 수정 착수지시서를 따로 써서 재승인.
