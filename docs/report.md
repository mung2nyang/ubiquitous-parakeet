# docs/report.md — 현재 슬라이스 착수지시서

## 고정노선 무스코프 호출부 전수 조사 (읽기 전용)

> **이 지시서는 다른 AI가 수행해도 되도록 자기완결적으로 썼다.** 시작 전 `AGENTS.md`와 루트 `STATUS.md`를 먼저 읽고 그 규칙
> (§1 승인 흐름·§3 커밋 흐름·의견 표시 규칙)을 따른다. 이 작업은 **코드를 한 줄도 고치지 않는 조사**다.

### 0. 왜 하는가
고정노선은 "계정마다·일지마다 1곳"이 원칙이고(`docs/sot.md` §4-4c: 차주 본인 / 연동기사 배정 차량 / 미연동 서브차량 각자 스코프),
원본은 계정마다 저장공간이 나뉘어 있어 스코프라는 개념이 없었다. react-app은 거래처 레코드를 공유하면서 `scopedToVehicleNumber`
(차량번호)로 스코프를 나눴고, **호출부를 하나씩 고쳐 왔다** — 슬라이스 D(`10cba09`, 연동기사 정산 경로), 슬라이스 E(`8c2bf61`, 연동기사 화면),
미연동(`c8939c2`, 차주 집계 4곳). 매번 다른 호출부가 뒤늦게 발견됐다. **이번엔 고정노선을 읽는 모든 곳을 한 번에 목록화해서, 각 호출부가 자기
실행 맥락에 맞는 스코프로 읽는지 표로 남긴다.** 이 조사는 원본 대조가 아니다(원본엔 스코프가 없다) — react-app 안의 **일관성** 조사다.
(원본 대비 계산 수치 조사는 별개: `docs/finance-parity.md`.) 조사 결과의 규칙은 끝난 뒤 보리 확인을 거쳐 `docs/sot.md`에 기록한다.

### 1. 스코프 규칙 (판정 기준선 — `docs/sot.md` §0·§4-4c, 구현 `react-app/src/domain/clients.js:23-31`)
- `getFixedRouteClient(settings, scopeKey)`: `scopeKey`가 있으면 **그 차량번호로 스코프된 고정노선 거래처를 먼저** 찾고, 없으면 **차주 본인(스코프 없는) 것으로 fallback**.
  `scopeKey`를 안 넘기면 차주 본인 것(계정 전체)만 본다.
- 스코프 키의 값: 차주 세션에서 서브차량 일지 = 그 차량번호(`logId`), 메인 일지 = `'main'`(스코프에 안 걸려 차주 것). 연동기사 본인 세션 = 배정 차량번호
  (`MainPageRoute.jsx:61-63`의 `clientScopeKey = cars[0].number`, 일지 `logId`는 `'main'`).
- 쓰기: `upsertClient`는 같은 스코프끼리만 "1곳" 자동 해제(`clients.js:137-142`). (이 규칙은 추후 삭제 예정 — roadmap. 이번 조사 범위 밖.)

### 2. 실행 맥락 4종 (각 호출부가 어느 맥락에서 실행되는지 표에 적는다)
① **차주 계정, 메인 차량** 화면 ② **차주 계정이 서브차량**(연동·미연동)을 볼 때 ③ **연동기사 본인 로그인** ④ **게스트(비회원)**.
같은 함수도 맥락에 따라 올바른 스코프가 다르다 — 호출부 하나에 맥락이 여러 개일 수 있다.

### 3. 조사 대상 (전수 — 아래는 출발점이며 누락 없이 더 찾는다)
**A. 읽기(계산·표시)** — 고정노선 거래처·단가·파렛트를 읽는 모든 곳:
1. `getFixedRouteClient(`·`resolveFixedUnitPrice(` 호출부. 현재 grep 기준 14곳:
   `CalendarPage.jsx:61,65` · `DayLogPage.jsx:80` · `financeCore.js:105,107,160,162` · `financeOwnerDetail.js:62,65` ·
   `financeTaxInvoiceGroups.js:55,128,130` · **`ownerFinance.js:117`** · **`reportSummary.js:66,67`**.
   (굵게 표시한 3곳은 스코프 인자가 없다.)
2. 이 함수를 거치지 않고 거래처 필드를 직접 읽는 곳: `fixedRouteLinked`·`fixedUnitPrice`·`palletOn`·`palletPrice` 사용처
   (예: `ClientListItem.jsx` 배지, `PalletSection.jsx`, `CallDetailForm.jsx`, `calendarBadges.js`, `monthSettlement.js`, `CalendarGrid.jsx`).
3. **간접 경로** — 호출부가 값을 옵션(`unitPrice`·`fixedRouteClient`)으로 받아 계산하는 곳: `monthSettlement.js`, `reportSummary.js`(`buildReportDayRows` 등),
   `driverSelfRevenue.js`·`driverRevenueScope.js`(기사 본인 매출), `financeReceivables.js`. **누가 그 값을 만들어 넘기는지 끝까지 추적**한다.
**B. 쓰기·저장** — `upsertClient`, `updateClientFixedUnitPrice`/`requestClientFixedUnitPrice`(달력 단가 편집), `requestClientSave`(클라우드는 저장한 1건만 올림
`clientMutations.js:65`), hydrate·persist가 `scopedToVehicleNumber`·`fixedRouteLinked`를 보존하는지(`hydrateMergeClients.js`, `persistDomainRecords.js`).
**C. 화면 노출 조건** — `hideFixedRoute`·고정노선을 강제로 끄는 곳(`CallClientQuickAdd.jsx:41,67` 등)이 sot 규칙과 맞는지.

### 4. 반드시 답해야 할 질문 (증거와 함께)
Q1. **연동기사 본인 세션**의 달력·월 정산 카드(`CalendarPage.jsx:61,65`는 `logId`를 넘기는데 그 세션에서 `logId`는 `'main'`)가 **본인 스코프 고정노선 단가**를 쓰는가, 차주 것을 쓰는가?
Q2. **기사 본인 매출 화면**(`DriverRevenueView` → `getDriverSelfMonthlyDetail`)의 고정노선 금액은 어떤 스코프로 계산되는가?
Q3. `reportSummary.js:66-67`(운송비 내역서)은 메인 일지 전용인가? 서브차량 내역서(`logs/:logId/report`)는 어떤 경로로 단가를 얻는가?
Q4. `ownerFinance.js:117`의 `unitPrice`는 실제로 소비되는가(소비처를 끝까지 추적)?
Q5. 달력에서 단가를 수정하는 경로(`requestClientFixedUnitPrice`)는 어느 거래처(스코프 있는/없는)를 수정하는가?
Q6. 게스트에게 스코프가 필요한 경우가 있는가(게스트는 기사 초대·서브차량 연동이 없다 — `docs/sot.md` §8)?

### 5. 방법
1. **읽기:** `docs/sot.md` §0·§4-4c·§8-2, `docs/roadmap.md`, `docs/migration-audit.md`, 위 슬라이스 커밋(`git show 10cba09 8c2bf61 c8939c2`)의 변경 이유.
2. **호출부 인벤토리:** `grep -rnE "getFixedRouteClient|resolveFixedUnitPrice|fixedRouteLinked|fixedUnitPrice|palletOn|palletPrice|scopedToVehicleNumber" react-app/src`
   (테스트 파일은 별도 표시하고 제외). 결과의 **각 줄을 표 한 행**으로.
3. **맥락 추적:** 호출부에서 위로 올라가 어떤 화면·세션이 그 코드를 실행하는지(라우트 `AppShellRoutes.jsx`, `MainPageRoute.jsx`, 세션 분기)를 확인해 맥락 ①~④를 채운다.
4. **판정:** §6 기준으로 분류. **코드를 실행하지 않고 읽어서** 판정하되, 필요하면 임시 스크립트(저장소 밖)로 작은 입력을 돌려 확인해도 된다. react-app에 테스트를 추가하지 않는다.

### 6. 판정 기준 (4종)
| 표기 | 의미 | 필수 증거 |
|---|---|---|
| ✅ 스코프 맞음 | 그 맥락에서 §1 규칙대로 올바른 스코프로 읽음 | 호출부 파일:줄 + 스코프 키가 어디서 오는지(파일:줄) |
| 🔧 스코프 필요 | 그 맥락에서 스코프가 필요한데 무스코프(또는 잘못된 스코프)로 읽음 | 어떤 맥락·입력에서 **어떤 값이 어떻게 틀리는지**(예: 차주 단가 vs 스코프 단가) |
| ❓ 판단 보류 | 정적으로 확정 못 함(맥락 불명·사용처 불명) | 이유 |
| ➖ 스코프 무관 | 고정노선 값을 읽지 않거나 스코프가 의미 없는 곳 | 근거(파일:줄) |

**금지:** (a) 서면 근거 없이 "의도적"이라고 단정, (b) 🔧를 확정 버그로 기록(전부 **AI관찰·미확인** — 보리가 확인한 것만 `[확인: 날짜]`), (c) 이유 추정으로 채우기, (d) 코드 수정·테스트 추가·커밋.

### 7. 보정용 정답 (이 항목들이 표에서 이렇게 나와야 방법이 맞다)
1. `DayLogPage.jsx:80`, `financeCore.js:160,162`, `financeOwnerDetail.js:62,65`, `financeTaxInvoiceGroups.js:55`, `CalendarPage.jsx:61,65`(맥락 ②의 서브차량 달력) = ✅ (`c8939c2`).
2. `financeCore.js:105,107`, `financeTaxInvoiceGroups.js:128,130` = ✅ (슬라이스 D, 연동기사 정산 경로 — 스코프 키는 `link.vehicleNumber`).
3. §4 Q1~Q5는 **결론을 반드시 낸다**(✅/🔧/➖ 중 하나, 증거 포함). "확인 못 함"으로 끝내면 조사 미완.

### 8. 산출물
- **신규 파일 1개: `docs/scope-audit.md`**(이 지시서를 확정하면 승인으로 본다. `docs/archive/` 금지.)
- 구성: ①요약(판정·맥락별 개수) ②호출부 전수 표(열: `#` / 호출부(파일:줄) / 무엇을 읽나 / 실행 맥락 ①~④ / 스코프 인자·출처 / 판정 / 비고) ③Q1~Q6 답변 ④🔧·❓만 모은 "보리 확인 요청" 표
  ⑤확정하면 sot에 남길 규칙 초안(**초안일 뿐 sot는 수정하지 않는다**) ⑥조사 못 한 것.
- 조사 중간에 커밋하지 않는다. 작업 파일은 워킹카피에만 둔다.

### 9. 건드릴 파일 / 안 건드릴 파일
- **건드릴 파일:** `docs/scope-audit.md`(신규)만.
- **안 건드릴 파일:** `react-app/` 전부(테스트 포함), 원본 `*.js`·`index.html`, `AGENTS.md`, `docs/sot.md`·`docs/roadmap.md`·`STATUS.md`(반영 위치는 보리 지정 후), `docs/finance-parity.md`(다른 조사 산출물).
  데이터·DB·로그인 조작 금지.

### 10. §6 200줄 / 실패 시 처리
- §6: 코드 수정 없음 → 해당 없음(문서 예외). 실패 시: 새 저장소·레이어 없음(§7), 산출물 파일 삭제로 원상 복귀.
- 막히면 추정하지 말고 **질문 후 멈춘다**(AGENTS §11).

### 11. 검증 (보리)
1. §7 보정 정답이 지시대로 나왔는지, §4 Q1~Q5에 결론이 있는지.
2. 요약 개수와 표 행 수가 맞는지(`grep` 결과 줄 수와 표 행 수 대조).
3. **표본:** ✅ 3건·🔧 3건을 골라 실제로 그 화면에서 값을 확인(예: 연동기사 계정에서 본인 고정노선 단가를 다르게 설정하고 달력·매출에 반영되는지). 한 건이라도 오판이면 그 계열 전체 재조사.
4. 🔧 목록을 보고 각 항목을 "고침 / 안 고침 / 더 조사"로 보리가 지정한다 — 그 결정이 이후 슬라이스가 된다(이 조사는 **1곳 규칙 삭제 + 자유 추가** 기능의 설계 재료이기도 하다 — roadmap).

### 12. 수행 AI에게: 보고 형식
끝나면 한국어(비개발자 눈높이) 3~5줄: 호출부 총수, 판정 개수, 가장 중요한 🔧 3개, Q1~Q6 결론 한 줄씩, 못 한 범위, 표본 확인 요청. 긴 내용은 `docs/scope-audit.md`에.
`AGENTS.md` §3대로 **보리 "검증 통과"·최종 승인 전에는 STATUS `[x]`·커밋을 하지 않는다.**
