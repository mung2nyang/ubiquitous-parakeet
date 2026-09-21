# docs/report.md — 현재 슬라이스 착수지시서

## 기사 계산서 기준 "공제 전" 선택지 화면에서 삭제 (이관 감사 7-1)

**결정(이미 확정):** 기사 매입 계산서 기준은 **공제후로 고정**한다(`docs/sot.md` §4-5c,
`docs/roadmap.md:87-92`, 보리 재확인 2026-09-21 — "공제후 고정, 전/후 계속 지웠는데"). 이 슬라이스는
"이관 완료 후 화면에서 제거"로 미뤄 두었던 그 **삭제를 실행**한다. 계산은 이미 공제후 고정이라 금액은 안 바뀐다.

### 1. 현재 상태
- 화면: `BillingSettingsPage.jsx`(74줄)에 "공제 후 지급액 / 공제 전 운송료" 드롭다운이 있다
  ([:10-13](react-app/src/components/drivers/BillingSettingsPage.jsx:10)). 이 페이지의 기능은 이것 하나뿐이다.
- 진입: 기사관리 화면의 "정산·계산서 설정" 버튼은 이미 없다(보리가 일부러 뺌, 감사 7-2·13-6). 남은 것은
  라우트뿐이다 — `AppShellRoutes.jsx:97`(`drivers/:linkId/billing`) + `AppShellRoutes.jsx:8` import +
  `lazyPages.js:17`. 그래서 지금은 주소창에 직접 입력해야만 열린다.
- 계산은 이미 고정: `ownerFinance.js:119` `buildFinanceSettings`가 `driverInvoiceBasis: 'net'`을 하드코딩한다.
  세금계산서 그룹(`financeTaxInvoiceGroups.js:102`)과 매입 탭 안내문(`TaxInvoicePage.jsx:157`)이
  `'gross'` 분기를 갖고 있지만 프로덕션에서는 도달하지 않는다(같은 하드코딩 값을 받음).
- 이 페이지 소개 문구에는 이관하면서 없앤 "계산서 처리 방식(회사 정산/기사 직접 정산 등)은 차량 정보 화면에서
  설정합니다"라는 낡은 문장도 들어 있다(`BillingSettingsPage.jsx:54`) — 페이지가 사라지면 함께 없어진다.

### 2. 목표 상태
- "공제 전 / 공제 후" 선택 화면이 앱에서 완전히 사라진다(페이지·라우트·전용 CSS 삭제).
- 기사 매입 계산서 금액·안내문은 지금과 동일(공제후 기준).
- 저장된 설정값(`driverInvoiceBasis`)은 손대지 않는다 — 예전에 토글로 `gross`를 저장한 계정이 있어도
  로그인·hydrate가 깨지지 않게 스키마는 그대로 둔다(아래 4번).

### 3. 건드릴 파일
1. `react-app/src/components/drivers/BillingSettingsPage.jsx`(74줄) — **삭제**.
2. `react-app/src/components/drivers/billing-settings.css`(60줄) — **삭제**(이 페이지 전용, 아래 4번 근거).
3. `react-app/src/app/AppShellRoutes.jsx`(108줄) — `BillingSettingsPage` import 1줄과 `drivers/:linkId/billing` Route 1줄 삭제.
4. `react-app/src/app/lazyPages.js`(24줄) — `BillingSettingsPage` lazy 선언 1줄 삭제.

### 4. 안 건드릴 파일 (근거 병기)
- `domain/financeTaxInvoiceGroups.js`(**206줄, 이미 200 초과**)·`TaxInvoicePage.jsx`의 `'gross'` 분기 —
  `buildFinanceSettings`가 항상 `'net'`을 넣어(`ownerFinance.js:119`) 도달 불가한 죽은 분기이고, 200줄 초과
  파일과 `domain/finance*`(플레이북 트리거)를 이번에 건드리지 않기 위해 남긴다. 정리는 필요하면 별도 처리.
- `domain/practiceSettings.js:131`·`store/persistDomainSchema.js:19,70`·`domain/financeTypes.js:71`의
  `driverInvoiceBasis` — 스키마가 `gross`를 허용해야 예전에 `gross`를 저장한 계정의 hydrate가 스키마 위반으로
  깨지지 않는다(`practiceSettings.test.js:93-105`, `persist.test.js:195`가 이 계약을 검사). 그대로 둔다.
- `day-log/call-detail-form.css:151-158`의 `.billing-settings-note` — 콜상세 폼이 쓰는 **별개 규칙**
  (`.work-log-page` 하위). 삭제 대상 `billing-settings.css`의 같은 이름 규칙은 `.billing-settings-card` 안에
  한정된 것(`:55`)이라 영향 없음. `.billing-settings-hero/card/guide`는 삭제 대상 페이지 외 사용처 없음
  (`grep` 결과: 그 페이지 파일뿐).
- 테스트 파일 — `BillingSettingsPage`를 참조하는 테스트가 없다(`grep billing`, 테스트 0건).
- `linked-driver.css:2-3`의 옛 파일 분리 주석 — 주석뿐이라 이번 범위 밖.

### 5. 실패 시 처리
새 저장소·필드·레이어 없음(§7). 삭제뿐이라 문제가 생기면 4개 파일을 되돌리면 원상 복귀. 저장된 사용자 설정은
건드리지 않으므로 데이터 유실 경로 없음. 저장·hydrate·finance 경로 미접촉 → 플레이북은 "참고"(§4 판별).
읽기/쓰기 권한(§8-5): 해당 없음(화면 삭제).

### 6. §6 200줄 확인
수정 파일 `AppShellRoutes.jsx` 108 → 106줄, `lazyPages.js` 24 → 23줄(모두 감소, 200 이내). 삭제 파일 2개.
200줄 초과 파일(`financeTaxInvoiceGroups.js`)은 건드리지 않는다.

### 기대 동작 (브라우저 검증, `npm run dev`)
1. 차주 계정 "기사 관리" → 연동기사 화면의 버튼 줄(거래처·운송내역서·비용)은 이전과 동일.
2. 세금계산서 → 기사 매입 탭: 안내문 "수수료·산재보험 차감 후 기사 정산액 기준"과 금액이 이전과 동일.
3. 주소창에 `/app/drivers/<기사id>/billing`을 직접 입력해도 "공제 전/후" 화면이 뜨지 않는다(라우트 삭제).
4. 콜상세 폼의 안내문구(`billing-settings-note` — "부가세 포함 금액으로 계약하셨다면…")가 이전과 같은 모양으로 보인다(CSS 회귀 없음).
5. 앱 전체가 정상 로드된다(삭제한 lazy import 잔재로 인한 콘솔 오류 없음).

### 문서 반영 (착수 아님 — 최종 승인 후 문서 커밋에 함께)
`docs/sot.md` §4-5c와 `docs/roadmap.md:87-92`의 "삭제 예정" 서술을 "삭제 완료(react-app `<해시>`)"로 정리,
`docs/migration-audit.md` 7-1 행 조치 완료 표기. **보리 지시: 현재 워킹카피에 있는 `docs/sot.md` §8-2(초안)도
이 문서 커밋에 함께 커밋한다.**

### 확인 필요 (1건)
페이지 전체를 삭제하는 안(위)으로 잡았다 — "공제 전" 선택지가 사라지면 이 페이지에 남는 기능이 없고 진입 버튼도
이미 빼셨기 때문이다. **"공제 후 고정"이라는 안내만 남기는 작은 페이지를 유지하는 쪽**을 원하시면 알려주세요
(그 경우 페이지와 CSS는 남기고 드롭다운만 제거).
