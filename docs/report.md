# docs/report.md — ③-2 완료, 보리 브라우저 실검증 대기 (이관 계획 ③ "월간 운송료 정산" 위젯 구조 통일)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①·②(①~④)·③-1은 `[x]` 확정됨 — 상세는 `STATUS.md` "완료" 절 참고.

## ③-2 진행 상태 (2026-09-08)

작업자 완료·push(`e00a004`), CI "verify" 초록(run `34176240684`), 감시관
§5 7항목 통과 — 아래 착수지시서는 실행 완료된 기록으로 남긴다. **`[x]`는
보리 브라우저 실검증 후 확정**(순서는 `STATUS.md` "지금 하는 일" 참고).

감시관이 리뷰 중 발견한 지시서 밖 손질 1건(대화창에서 질문만, 답변
대기): `CalendarPage.jsx`의 `showToast` prop 구조분해(`showToast:
_showToast`) — 이전에도 지금도 컴포넌트 안에서 안 쓰는 prop이라 동작
변화는 없음, 다만 지시서에 없던 변경이라 왜 건드렸는지 확인 중.

## 범위 확정 (2026-09-08)

③-2 착수 전 발견한 의미 차이(캘린더 "운임 수수료"가 지금은 메인+수익공유
서브차량 합산인데, ③-1 함수는 그 화면 자신의 수수료만 계산)에 대해
보리에게 질문 → **"원본대로"(그 화면 자신의 수수료만) 선택.** 매출("전체
손익") 화면은 이미 합산 수수료를 보여주고 있어 중복 표시 불필요.

## ③-2 착수지시서

### 배경 (AGENTS §8 4대 질문)

1. **구독인가 스냅샷인가?** — 구독 그대로 유지(`useOwnerWorkData`/
   `useOwnerSettings`/`useOwnerClients`/`useOwnerCars`/`useOwnerExpenses`
   전부 기존 그대로). 오히려 이제 안 쓰는 구독 2개(`useOwnerProfile`/
   `useOwnerDrivers`, 아래 참고) 제거로 구독 **줄어듦**.
2. **지금 보이는 값이 어디 것인가?** — Store 구독값 그대로, 그 값들로
   만드는 **파생 계산(순수 함수)만** `monthWorkFareSummary`+
   `getOwnerMonthlyFinanceDetail` 조합 → `monthSettlementSummary`
   1개로 교체. 원본 데이터 소스 무변경.
3. **쓰기 창구** — 이 슬라이스는 표시만, 쓰기 없음.
4. **hydrate·동시편집 충돌** — 쓰기 없어 해당 없음.

### 건드릴 파일 (2개)

1. **`src/components/calendar/CalendarPage.jsx`**
2. **`src/components/calendar/CalendarMonthSummary.jsx`**
3. **`src/main-calendar.css`** — 거래처 수수료 들여쓰기 줄만 12줄 내외 추가
   (원본 `style.css:1303-1327` `#mainPage .summary-client-commission-row`/
   `-label`을 `.main-page` 스코프로 포팅, 이름 그대로 재사용 — 새 클래스
   발명 아님).

### 안 건드릴 파일

- `domain/day-record.js`의 `monthWorkFareSummary` — **그대로 둔다**(③-3까지
  `lib/report.js`가 여전히 씀, 지금 지우지 않음).
- `lib/report.js`·`ReportPage.jsx`(③-3에서 연결) — 무변경.
- `domain/monthSettlement.js` — ③-1에서 이미 완성, 로직 무변경(호출부만 연결).
- `domain/financeOwnerDetail.js`/`lib/finance.js`의 `getOwnerMonthlyFinanceDetail`
  자체 — 무변경(매출 화면은 계속 이 함수 씀, 캘린더만 안 씀).

### 구현 내용

**`CalendarPage.jsx`**:
- `import { getFixedRouteClient, resolveFixedUnitPrice } from '../../domain/clients.js'`
  로 `getFixedRouteClient` 추가.
- `import { monthSettlementSummary } from '../../domain/monthSettlement.js'`
  추가, 기존 `monthWorkFareSummary` import는 제거(이 파일에서만).
- **제거**(이제 안 씀 — 지시서 없이 방치하면 미사용 import로 남음):
  `getOwnerMonthlyFinanceDetail`(`lib/finance.js`) import, `buildFinanceSettings`
  (`lib/ownerFinance.js`) import, `monthKeyOf`(`revenue/revenueFormat.js`) import,
  `useOwnerProfile`/`useOwnerDrivers` 훅 호출과 `profile`/`drivers` 변수,
  `financeSettings`/`commissionTotal` useMemo 블록 전체.
- 새로 계산:
  ```js
  const fixedRouteClient = getFixedRouteClient(settings)
  const activeFixedOn = isMain ? !!settings.fixedOn : !!settings.subFixedOn
  const car = isMain ? null : (cars || []).find((c) => c.number === logId) || null
  // 서브차량 실거리 표시는 설정에 subDistanceOn이 없어 이번 슬라이스는 메인만(아래 "알려진 제한" 참고)
  const distanceOn = isMain && !!settings.distanceOn
  const summary = useMemo(
    () => monthSettlementSummary(workData, year, month, {
      logId, unitPrice, fixedRouteClient, activeFixedOn, clients, car, expenses,
    }),
    [workData, year, month, logId, unitPrice, fixedRouteClient, activeFixedOn, clients, car, expenses],
  )
  ```
- `<CalendarMonthSummary paymentOn unpaidTotal summary distanceOn />`로 교체
  (기존 `fareSummary`/`commissionTotal` prop 제거).

**`CalendarMonthSummary.jsx`** — props를 `{ paymentOn, unpaidTotal, summary,
distanceOn }`로 교체(`FareSummary` typedef는 `monthSettlementSummary` 반환
타입 참조로 갱신). 렌더 내용(기존 "미수금 미니 카드"는 무변경):

- 제목 줄(횟수/세부입력 문구)은 **지금 그대로 유지** — 이번 슬라이스는
  구조(거래처별 분류·파렛트·서브차량 수수료·지출 3종) 통일이 목적, 문구
  변경은 범위 밖(별도 "이관 후 UI 정리" 대상).
- 거리 행: `distanceOn && summary.distanceKm > 0`일 때만 `{summary.distanceKm}
  km` 표시.
- 거래처별 매출: `summary.fixedBaseFare > 0`이면 "고정 기본 운송료" 행,
  `summary.defaultBaseFare > 0`이면 "미지정 거래처 운송료" 행, 그다음
  `Object.keys(summary.fareByClient)`를 순회하며 `{client} 기본 운송료` 행
  + `summary.commissionByClient[client] > 0`이면 바로 아래
  `summary-client-commission-row`(들여쓰기, "└" 없이 원본처럼 곡선 CSS로)
  로 `{client} 수수료 ({commissionLabelByClient[client]})` 행 —
  **`ReportDetailView.jsx`의 `ReportDetailContent`가 이미 같은 패턴을
  쓰고 있으니 그 구조를 참고**(단 그쪽 CSS 클래스(`summary-row-indent`)는
  `.report-page-wrap` 스코프라 재사용 불가 — 이 슬라이스는 원본 클래스명
  (`summary-client-commission-row`/`-label`)을 새로 포팅해서 씀).
- 파렛트 행: `summary.palletFare > 0`일 때만.
- 서브차량 수수료 행: `summary.subCarComm > 0`일 때만, 라벨은
  `summary.subCarCommLabel`.
- 부가세 행: `summary.vat`(라벨 "부가세 (공급가액 기준 10%)" 유지).
- 합계 행: `summary.total`(기존 `fareSummary.total - commission` 수식 삭제 —
  `summary.total`이 이미 전부 반영된 값).
- 지출 3종: `summary.maint`/`summary.fuel`/`summary.misc` 각각 0 초과일 때만
  행 추가(지금 카드엔 아예 없던 행 — 리포트 화면의 "차량 정비비"/
  "차량 주유비"/"통행료/기타" 라벨과 같은 문구 재사용).

### 알려진 제한 (이번 슬라이스에서 안 고침, 기록만)

- **서브차량 캘린더의 실거리 표시** — 원본은 `subDistanceOn` 설정이 따로
  있어 서브 로그도 거리 표시를 켤 수 있는데, react-app 설정엔 이 필드
  자체가 없다(새 설정 필드+토글 UI 추가는 이 슬라이스 범위 밖). 그래서 이번
  슬라이스는 메인만 거리 표시, 서브는 표시 안 함(지금까지도 표시 안
  했으므로 **회귀 아님**, 그냥 원본 기능 중 아직 안 옮긴 부분).
- **부가세 계산 방식 변경** — ③-1이 원본 그대로 포팅한 flat 10%(콜상세
  `vatExempt` 무시)가 이제 화면에 실제로 나타남. 지금 방식(건별 `vatExempt`
  제외)과 달라짐 — **원본대로 맞추는 게 목적이라 의도된 변화**, 브라우저
  검증 때 `vatExempt` 건이 있는 달로 확인 필요.

### 테스트 계획

- 기존 `CalendarPage.test.js`(있다면) 회귀 확인 — 새 prop 구조에 맞춰 조정.
- `CalendarMonthSummary.jsx`에 새 테스트 파일 추가(또는 기존 확장):
  거래처별 행/파렛트 행/서브차량 수수료 행/지출 3종 행 각각 값 0일 때 숨김,
  0 초과일 때 정확한 텍스트로 렌더되는지.

### 완료 조건

- CI(test·typecheck·build) 초록.
- 보리 브라우저 실검증: 홈 캘린더(메인) + 서브차량 로그인 계정 각각에서
  고정노선 거래처·콜상세 여러 거래처·파렛트·서브차량 수수료·정비/주유/기타
  지출이 섞인 실제 달을 열어 원본 화면과 숫자 대조.
- `.md` 변경 0.

---

## 다음 세션 시작 시 할 일

1. 위 착수지시서를 작업자에게 전달(사용자 착수 승인 후).
2. ③-2 완료·`[x]` 확정 후 ③-3(`lib/report.js`+`ReportPage.jsx` 연결)
   착수지시서를 이 파일에 새로 작성(리셋).
