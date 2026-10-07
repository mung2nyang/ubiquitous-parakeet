# docs/report.md — 현재 슬라이스 착수지시서

## 고정노선 거래처 연결 — 앱 설정에서 거래처 고르기·1회 단가 저장 `[x]`

보리 지시(2026-10-05): 앱 설정 "고정 노선 사용" 카드에 거래처 연결란 추가(B안, 착수지시서 절차).
로드맵 순서(12번 → 10-P) 사이에 끼워 넣는 작업.

### 현재 상태

- 고정노선 거래처 연결은 **거래처 추가·수정 창**에서만 한다(`ClientTradeFields.jsx:25-50` "고정노선 연동" 스위치 + "1회 단가").
- 한 스코프에 한 곳만 연결된다. 다른 거래처를 켜고 저장하면 이전 거래처는 자동 해제(`domain/clients.js:137-143`),
  클라우드 저장 때 해제된 거래처도 함께 저장(`lib/clientMutations.js:74-80`).
- 앱 설정 고정 노선 카드(`FixedRouteBlock.jsx`)에는 연결 상태가 안 보인다.
- 스코프 규칙(`docs/sot.md` §4-4e): 차주 메인 = 스코프 없는 거래처, 차주가 서브차량 설정을 볼 때 = 그 차량번호(라우트 `logId`).
  서브차량에 연결 거래처가 없으면 차주 메인 것으로 물러난다(`clients.js:23-31`).

### 목표 상태 (기대 동작)

1. "고정 노선 사용"이 켜져 있으면 하위 상자 맨 위에 **거래처 연결** 줄이 생긴다.
   - 거래처 고르기 드롭다운: "연결 안 함" + 그 화면 스코프의 거래처 목록
     (차주 앱 설정 = 스코프 없는 거래처, 서브차량 운행일지 설정 = 그 차량번호 거래처,
     **연동기사 본인 앱 설정 = 배정 차량번호 거래처** — `MainPageRoute.jsx:61-63`의 `clientScopeKey`와 같은 규칙).
   - 거래처를 고르면 **1회 단가** 칸이 보이고, 그 거래처에 저장된 단가가 미리 채워진다.
   - **저장** 버튼을 눌러야 저장된다(바꾼 게 없으면 버튼 비활성).
2. 저장은 기존 거래처 저장 창구 `requestClientSave` 그대로 쓴다.
   - 고른 거래처 = `fixedRouteLinked: true` + 단가. 이전 연결 거래처는 기존 1곳 규칙으로 자동 해제.
   - "연결 안 함" 저장 = 지금 연결된 거래처를 `fixedRouteLinked: false`로 저장(단가는 기존 동작대로 비워짐).
   - 단가 비어 있으면 기존 안내 "고정노선 1회 단가를 입력해 주세요." 그대로.
3. 서브차량 설정에서 연결이 없으면 "연결 안 하면 차주 메인 연결 거래처(○○)를 씁니다" 안내 한 줄.
4. 거래처가 하나도 없으면 "먼저 거래처를 등록해 주세요" 안내.

### 건드릴 파일

| 파일 | 내용 | 예상 줄 수 |
|---|---|---|
| `react-app/src/components/FixedRouteClientLink.jsx` (새 파일) | 거래처 연결 줄(드롭다운·단가·저장) | ~110 |
| `react-app/src/domain/clientDraft.js` (새 파일) | 저장된 거래처 → 저장용 draft 변환 순수 함수(빠진 칸이 지워지지 않게 전 필드 복사) | ~40 |
| `react-app/src/components/FixedRouteBlock.jsx` | 새 줄 끼우기, `ownerKey`·`scopeKey` 받기 | 52 → ~58 |
| `react-app/src/components/AppSettingsPage.jsx` | 거래처 스코프 키 계산(서브=`logId`, 연동기사=배정 차량, 차주=없음) 후 `FixedRouteBlock`에 넘기기 | 166 → ~172 |
| `react-app/src/app/AppShellRoutes.jsx` | `AppSettingsPage` 두 곳에 `session` 넘기기(연동기사 판별용) | 103 → 103 |
| `react-app/src/components/app-settings.css` | 연결 줄 모양 | 187 → ~197 |
| `react-app/src/components/FixedRouteClientLink.test.js` (새 파일) | 아래 테스트 | — |

### 안 건드릴 것

- `lib/clientMutations.js`·`domain/clients.js`(저장·1곳 규칙·검증) — 그대로 호출만 한다.
- 거래처 추가·수정 창의 기존 연동 스위치 — 그대로 둔다(두 곳 어디서 바꿔도 같은 레코드).
- 정산·달력·내역서 계산(`getFixedRouteClient` 호출부) — 읽는 값이 같아 변경 없음.

### 실패 시 처리 — **신규 레이어 없음**

- 새 저장소·큐·fallback·tombstone 없음(AGENTS §7). 저장 실패·차단은 `requestClientSave`가 돌려준 안내 토스트만 띄우고
  화면 값은 그대로 둔다(다시 저장 가능).
- 동기화 중이면 기존 `fieldset disabled`(`AppSettingsPage.jsx:88`)로 입력 자체가 막힌다.

### §6 200줄

- 새 파일 둘 다 200줄 이하. `app-settings.css` ~197줄로 200 이하 유지(넘으면 연결 줄 CSS를 새 파일로 분리하고 보고).

### §8 질문 답

1. 구독/스냅샷: `useOwnerClients` 구독. 2. 보이는 값: Store. 3. 쓰기 창구: `requestClientSave`(우회 없음).
4. 겹침: 저장은 한 번에 한 건, 결과 목록으로 Store 교체 — 기존 거래처 창과 같은 경로.
5. 권한: 차주 = 읽기·쓰기(기존과 동일). 연동기사 본인 = 배정 차량 스코프 거래처 읽기·쓰기 — 기사 본인 거래처 화면
   (`OwnerScopedClientsView.jsx:74` `requestClientSave`)과 같은 권한·같은 레코드(`docs/sot.md` §4-4e 3번, 보리 확인 2026-09-21).

### 테스트 (`FixedRouteClientLink.test.js`, 화면 조작 → Store 확인)

1. 거래처 고르고 단가 입력 → 저장 → 그 거래처만 `fixedRouteLinked`·단가 저장, 이전 연결 거래처는 해제, 다른 칸(업체명·사업자번호 등) 보존.
2. "연결 안 함" 저장 → 연결 거래처 해제.
3. 단가 빈칸 저장 → 안내 토스트, Store 그대로.
4. 서브차량 화면 → 그 차량번호 거래처만 목록에 나옴, 연결 없으면 차주 메인 안내.
5. 연동기사 본인 세션 → 배정 차량 거래처만 목록에 나오고 저장됨.
6. `clientDraft.js` 변환이 거래처 전 필드를 보존(빠진 필드로 데이터가 지워지지 않음).
- 새 테스트는 연결 코드를 잠시 되돌려 FAIL 확인 후 결과 첨부(플레이북 §6).

### 보리 결정 (2026-10-05)

1. 연동기사 본인 앱 설정에도 **보인다**(배정 차량 스코프).
2. **저장 버튼**으로 저장.
3. "연결 안 함" 저장 시 그 거래처 단가도 지워짐 — **승인**(기존 거래처 창과 같은 동작).

### 진행 기록 (2026-10-05)

- 착수 승인 후 구현(커밋 전). 파일·줄 수: `FixedRouteClientLink.jsx` 92, `domain/clientDraft.js` 44, `FixedRouteBlock.jsx` 54,
  `AppSettingsPage.jsx` 175, `AppShellRoutes.jsx` 103, `app-settings.css` 197, 테스트 `FixedRouteClientLink.test.js`.
- 로컬 `npm test` 전체 통과(1,071건), 타입체크 오류 0. 새 테스트 6건, act 경고·console.error 0건.
- 되돌림 확인(플레이북 §6): `FixedRouteBlock`에서 연결 줄을 빼고 `clientToDraft`에서 `managerName`을 지운 상태로 실행 → 6건 전부 FAIL,
  복구 후 6건 PASS.

```
✖ 거래처 고르고 단가 입력 → 저장: 그 거래처만 연결, 이전 연결 해제, 다른 칸 보존 (63.7687ms)
✖ "연결 안 함" 저장 → 연결 거래처 해제(단가 비움) (11.9511ms)
✖ 단가 빈칸 저장 → 기존 안내, Store 그대로 (8.9536ms)
✖ 서브차량 운행일지 설정: 그 차량번호 거래처만, 연결 없으면 차주 메인 거래처 안내 (11.3554ms)
✖ 연동기사 본인: 배정 차량 거래처만 나오고 저장됨 (9.4347ms)
✖ clientToDraft: 저장된 거래처 전 필드를 그대로 옮긴다 (1.6967ms)
ℹ pass 0
ℹ fail 6
ℹ duration_ms 2432.322
(exit=1)
```

- 남은 것: 보리 브라우저 실검증(로그인 상태에서 앱 설정 → 고정 노선 사용 → 거래처 연결).

### 수정 사항 1 (보리 브라우저 확인 후, 2026-10-05 승인)

- 문제: 고르기 버튼 첫 항목 "연결 안 함"이 늘 보여 헷갈림.
- 수정: 연결이 없으면 버튼에 **"선택"**(목록엔 거래처만), 연결이 있으면 목록 맨 아래 **"연결 해제"** 항목.
- 건드릴 파일 추가: `components/shared/AppDropdown.jsx`(128줄) — 값과 맞는 항목이 없을 때 보여줄 `placeholder` 선택 인자 추가.
  안 넘기면 지금과 동일(공용 사용처 8곳 영향 없음). `FixedRouteClientLink.jsx`·테스트 수정.
- 수정 사항 1 반영: `AppDropdown.jsx` 130줄, `FixedRouteClientLink.jsx` 94줄. 테스트에 "연결 없으면 버튼 '선택'·목록엔 거래처만",
  "연결 있으면 맨 아래 '연결 해제'" 확인 추가. 전체 `npm test` 1,071건 통과, 타입체크 0.

### 수정 사항 2 (2026-10-05 승인)

- 거래처 추가·수정 창(`ClientTradeFields.jsx`)에서 "고정노선 연동"·"파렛트 단가" 칸 삭제. 저장된 값은 draft로 그대로 보존.
- 파렛트 단가(켜기 + 단가)를 앱 설정 "거래처 연결" 줄로 이동 — 운행일지 파렛트 입력란은 고정노선 연결 거래처의 `palletOn`만 보므로
  (`DayLogPage.jsx:83`) 연결 줄에 두는 게 맞음. 저장은 같은 `requestClientSave` 한 번.
- 건드릴 파일 추가: `ClientTradeFields.jsx`, `App.clientsCars.test.js`. `app-settings.css` 200줄 넘으면 연결 줄 CSS를 새 파일로 분리.
- 수정 사항 2 반영: `ClientTradeFields.jsx` 두 칸 삭제(59줄), 쓰지 않게 된 `hideFixedRoute` 인자를 `ClientFormModal.jsx`·`CallClientQuickAdd.jsx`에서도 제거.
  `FixedRouteClientLink.jsx` 125줄(파렛트 스위치·단가), `app-settings.css` 198줄.
  `App.clientsCars.test.js`의 "거래처 폼 고정노선 1곳" 테스트를 앱 설정 연결 줄 경로로 바꿈(클라우드 저장·id 보존 확인 유지).
  파렛트 테스트 추가. 전체 `npm test` 1,072건 통과, 타입체크 0.

### 수정 사항 3 (2026-10-05 승인)

- 설정 화면 연결 줄 UI가 별로 → 설정 화면엔 요약만(연결 없음: "+ 추가" / 연결 있음: 거래처명·1회 단가·파렛트 + "수정"),
  고르기·단가·파렛트·저장은 **팝업 창**(`FixedRouteClientModal.jsx` 새 파일, 기존 `modal-overlay`·`modal-content`·`modal-btns` 모양).
- 팝업: 저장 성공 시 닫힘, 실패·안내 시 유지. 수정일 때만 "연결 해제"(확인 창 한 번). 저장 경로·1곳 규칙은 그대로.
- 건드릴 파일: `FixedRouteClientLink.jsx`, `FixedRouteClientModal.jsx`(새), `app-settings.css`, `FixedRouteClientLink.test.js`, `App.clientsCars.test.js`.
- 수정 사항 3 반영: `FixedRouteClientLink.jsx` 63줄(요약 + "+ 추가"/"수정"), `FixedRouteClientModal.jsx` 111줄(새, `createPortal`로 body에 그림,
  모양은 기존 `client-modal` 틀 재사용), `app-settings.css` 199줄. 테스트를 팝업 경로로 고침(저장 성공 시 닫힘·실패 시 유지·연결 해제 확인 창 포함).
  전체 `npm test` 1,072건 통과, 타입체크 0. 브라우저: 앱 설정 요약 줄·팝업 열림·왼쪽 정렬 확인(저장은 안 누름).

### 수정 사항 4 (2026-10-05 보리 "A로 해봐")

- 연결 줄 배치: "+ 추가"/"수정" 버튼을 제목+설명 두 줄의 세로 가운데 오른쪽에, 연결 상태 글("연결된 거래처가 없습니다." 또는
  거래처명·단가)은 설명 바로 아래 줄로. `FixedRouteClientLink.jsx`·`app-settings.css`만.
- 간격·버튼 위치 손질(설명과 연결 상태 사이 0, 버튼은 왼쪽 세 줄 세로 가운데). `app-settings.css` 200줄, `FixedRouteClientLink.jsx` 68줄.
- 보리 브라우저 확인 후 코드 커밋 **react-app `461fced`**(push 전). 전체 `npm test` 1,072건 통과, 타입체크 0.
- 다음: 보리 push → CI "verify" 확인 → §5 리뷰 → 최종 `[x]` 승인.

### 확정 (2026-10-07)

- 보리 push → CI "verify" 초록(`461fced`) → §5 리뷰 7항목 문제 없음(범위 13개 파일 = 지시서+수정 사항 1~4, 새 저장 레이어·타입 꼼수 없음, 전부 200줄 이하, 테스트 6건 추가·기존 테스트는 경로만 교체) → 보리 최종 `[x]` 승인.
