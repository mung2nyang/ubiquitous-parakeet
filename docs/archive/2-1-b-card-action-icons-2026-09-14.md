# §2-1-B. 수정/삭제 아이콘 공용화 (5곳) — `[x]` 완료 (2026-09-14)

react-app 최종 커밋: `489e9fd`(원안)/`a0f6d6a`(회귀 버그 수정). 전부
CI 초록, 보리 실검증·최종 승인 완료.

**보리 지시(2026-09-14) — "전작업건(이전 세션이 적어둔 '6곳 일괄'
가정) 재활용하지 말고 네가 직접 원본 확인하고 써라."** 아래는 5개
화면 원본을 전부 직접 열어 대조한 결과.

## 지시 내용

차량관리·거래처(차주뷰/기사연동뷰 2곳)·정비주유기타 총 5곳의
카드 "수정"/"삭제" 버튼을 원본처럼 연필/휴지통 **아이콘** 버튼으로
복원하고, 공용 컴포넌트로 통일.

## 조사 결과 (원본 대조, 직접 확인)

- **5곳 전부 원본은 동일 패턴** — `action-icon-btn`/`action-icon-btn
  del` 클래스 + `title="수정"`/`title="삭제"` + `editDetailSvg()`/
  `deleteDetailSvg()`(연필/휴지통 SVG, `script.js:4249`·`4259`).
  원본 근거: `car-management.js:70-71`(차량관리),
  `client-management.js:329-330`(거래처-차주뷰),
  `driver-link.js:909-910`(거래처-기사연동뷰 상세 안 거래처 목록),
  `maint-fuel-misc.js:504`(정비/주유/기타).
- **react-app 5곳 전부 지금은 텍스트만**("수정"/"삭제", 아이콘 없음)
  — 이게 실제 퇴화 지점.
- **6번째(기사연동관리 `DriverConnectionPage.jsx`)는 원본이 아예
  다른 화면**이라 이번 슬라이스에서 제외(보리 확인, 2026-09-14) —
  원본은 아이콘이 아니라 상태별로 문구가 바뀌는 텍스트 버튼
  (`driver-link.js:505-536` `renderLinkedDriverList()`,
  `docs/ui-comparison-report.md` §9에 이미 버튼·표시형식 차이 기록
  돼 있음). §9 전체 대조는 별도 슬라이스로 미룸.
- `EditIcon`/`DeleteIcon` 컴포넌트가 이미
  `react-app/src/components/day-log/icons.jsx`에 있고, SVG path가
  원본 `editDetailSvg`/`deleteDetailSvg`와 완전히 동일(F-3 슬라이스
  때 콜상세용으로 이식된 것) — 새로 안 만들고 import해서 재사용.

## 구현 (react-app `489e9fd`)

1. 신규 `shared/CardActionButtons.jsx` — `EditIcon`/`DeleteIcon` 재사용,
   `title="수정"`/`"삭제"`.
2. 적용 5곳: `CarListItem` · `ClientListItem` · `OwnerScopedClientsView` ·
   `LinkedDriverClientsPage` · `MaintFuelPage` (wrapper는 각 화면 유지).
3. `side-menu.css` — `.action-icon-btn` flex 정렬 + svg stroke 규칙,
   리스트/레코드 컨텍스트 크기(원본 `style.css` 유효값: 버튼 34px,
   리스트 svg 16px, 레코드 svg 15px).
4. 테스트: `accountPermissionUi`·`App.clientsCars`를 텍스트 「수정」이
   아니라 `title`/`[title="수정"]`로 맞춤. `npm test` 통과.

## 검증 중 발견한 버그: 일일운행 인라인 정비/주유/기타 아이콘이 세로로
쌓임 — 수정 완료

**보리가 브라우저 확인 중 발견** — 일일운행 화면 안의 "차량 정비/
주유/기타" 카드(`ExpenseGroups.jsx`)에서 수정(연필)/삭제(휴지통)
아이콘이 가로로 나란히가 아니라 세로로 쌓임. 이번 슬라이스가 손댄
5곳과 콜상세는 문제없음(보리 확인).

**원인**: `side-menu.css`에 이번 슬라이스가 추가한
`.action-icon-btn { display:flex; ... }`이 **전역** 규칙이라 이
클래스를 쓰는 모든 화면에 적용됨. 이번 대상 5곳은 버튼을 감싸는
바깥 div(`car-action-btns`/`management-record-actions`)에 이미
`display:flex`가 있어 괜찮지만, 일일운행 인라인 정비/주유/기타가
쓰는 `.maint-fuel-actions` 감싸는 div는 `display:flex`가 어디에도
없음(`react-app/src/components/day-log/day-log-expenses.css` 전체
확인, `.maint-fuel-actions` 컨테이너 규칙 자체가 없음) — 버튼
자체가 `display:flex`(블록급 박스)로 바뀌면서 세로로 쌓이게 됨.
원본(`ubiquitous-parakeet/style.css:3637-3640`)엔
`.maint-fuel-actions { display:flex; flex-shrink:0; }`이 있는데,
react-app 이관 때 이 규칙만 빠졌던 것(이번 슬라이스 이전부터 잠재돼
있던 gap, 이번 전역 CSS 변경으로 증상만 드러남) — **구조적 버그가
전역 CSS 변경으로 드러난 것**(일시적 현상 아님).

**구현 (react-app `a0f6d6a`)**: `day-log-expenses.css`에
`.work-log-page .maint-fuel-actions { display:flex; flex-shrink:0; }`
추가(원본 값 그대로). `npm run test:app` 통과.

## §5 리뷰 (CI 초록 후 확정)

| # | 결과 |
|---|---|
| 1 범위 | 지시서 파일과 일치(+테스트 2파일은 기대값 정합) |
| 2 몰래 증설 | `CardActionButtons`만 신규, 저장소/큐 없음 |
| 3 타입 꼼수 | 없음 |
| 4 200줄 | LinkedDriverClientsPage=200, MaintFuelPage=206(기존 초과·악화 없음) |
| 5 테스트 | 텍스트→title로 진실성 유지, 약화 없음 |
| 6 CSS 영향범위(신규 §5-6, AGENTS.md에 이번에 추가) | `action-icon-btn` 전체 사용처 grep 전수 확인. `DriverConnectionPage`·`ReceivablesListPage`·`ReceivableItemCard`·`TaxInvoiceEntryList`·`NotificationPanel`(전부 `receivable-card-actions`/`notification-card`, 기존에 이미 `display:flex`)·`CallDetailCard`(`call-detail-actions`, 기존 flex)는 문제없음. `ExpenseGroups`(`maint-fuel-actions`)만 flex 누락 — `a0f6d6a`로 수정 완료, 더 없음. |
| 7 요구사항 | 5곳 아이콘 복원·공용화 완료, 기사연동관리 제외 |

## 검증 (보리)

- CI(`verify`·`Deploy GitHub Pages`) 두 커밋(`489e9fd`/`a0f6d6a`) 다 초록.
- 브라우저 실검증: 5화면(차량관리·거래처 2곳·정비주유기타) 연필/
  휴지통 아이콘·hover·클릭(수정 모달/삭제 확인) 정상. 일일운행 인라인
  정비/주유/기타 아이콘 가로 정렬 복원 확인. 다크모드 포함 "이상 없음"
  최종 승인(2026-09-14).

## 후속 메모

이 슬라이스에서 발견된 CSS 블라스트 반경 문제로 `AGENTS.md` §5
리뷰 체크리스트에 항목 6(공용 CSS 클래스 영향범위) 신규 추가(보리
승인, 2026-09-14) — 앞으로 공용 클래스의 display/position/width/
height/overflow 변경 시 그 클래스 전체 사용처를 grep으로 먼저
확인하는 절차가 리뷰 체크리스트에 정식으로 들어감.
