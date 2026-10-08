# docs/report.md — 현재 슬라이스 착수지시서

## 로드맵 19 — 앱 켤 때 연동 확인이 실패하면 차주 칸 대신 본인 칸으로 잡히는 문제 `[x]`

보리 지시(2026-10-08): 19번 먼저, 빨리. 데이터가 엉뚱한 칸에 저장될 수 있음(급한 순서 ①). 플레이북 확인함(`docs/testing-playbook.md` §2 호출 경로·§3 실패 주입).

### 현재 상태 (코드 확인)

- 앱을 켜면 `boot.js:103` `buildCloudAppSession` → `:60` `fetchLinkedDriverLink`(`driverLinkRpc.js:102-115`)로 "차주와 연동 중인지" 확인.
- 이 확인이 **서버 오류·인터넷 불안정으로 실패해도 `null`**(= "연동 없음"과 똑같이 취급)을 돌려줌 → `boot.js:61-66` `linkedOwnerId: null`, `accountType`은 프로필 값 → `ownerKeyFromSession`(`:76-80`)이 **기사 본인 id** → `hydrateFromSupabase(본인 id, …, employedDriver: false)`.
  - 결과: 기사 화면에 차주 데이터 대신 빈 칸, 그 상태로 입력하면 **본인 칸에 저장·서버로 올라감** → 다음에 정상으로 켜면 안 보임.
- 프로필 유형으로는 구별 못 함: 연동 기사도 프로필은 `owner_driver`일 수 있음(`bootSettleUnlink.test.js:20`).
- 같은 함수 다른 사용처: `EmployerLinkCard.jsx:42`(연동 해제 뒤)·`InviteRedeemModal.jsx:23`(초대코드 연동 뒤)·`hydrate.js:196-198`(불러오기 다시 시도) — 이번엔 **앱 켤 때만** 고침(아래 "안 건드릴 것").
- 앱 켤 때 확인 결과가 오류(`reject`)면 `useAppSession.js:67` `.then`만 있어 **로딩 화면에서 멈춤** → 오류를 던지지 않고 결과로 돌려줘야 함.

### 목표 상태 (기대 동작)

1. 앱 켤 때 연동 확인이 **실패**하면(연동 "없음"이 아니라 확인 자체가 실패) **1초 뒤 1번 더** 확인.
2. 그래도 실패하면 **본인 칸으로 들어가지 않고** 안내 화면: "네트워크 연결이 불안정합니다. / 연결 상태를 확인해 주세요." + [다시 시도](= 앱 다시 열기). 18-E 안내 화면과 같은 문구·모양.
3. 확인 성공(연동 있음/없음)이면 **지금과 완전히 같음**. 차주 계정도 확인이 성공하면 그대로.
4. 차주 계정도 앱 켤 때 이 확인이 두 번 다 실패하면 같은 안내 화면(연동 여부를 모르는 상태로 들어가지 않음). 들어간 뒤 데이터 불러오기 실패는 지금처럼 "일부 못 불러왔습니다" 안내 후 계속.

### 건드릴 파일

| 파일 | 내용 | 줄 수 |
|---|---|---|
| `react-app/src/lib/driverLinkRpc.js` | 확인 실패와 "연동 없음"을 구별하는 `checkLinkedDriverLink`(성공/실패 결과) 추가, 기존 `fetchLinkedDriverLink`는 이걸 감싸 지금과 같게 | 136 → ~150 |
| `react-app/src/app/boot.js` | 앱 켤 때만 엄격 확인(실패면 1초 뒤 재확인, 또 실패면 `linkCheckFailed` 결과로 돌려줌) | 119 → ~140 |
| `react-app/src/app/useAppSession.js` | `linkCheckFailed`면 세션 없이 안내 화면 표시 상태로 | 141 → ~146 |
| `react-app/src/app/App.jsx` | 안내 화면 표시 상태면 안내 화면만 그림 | 146 → ~149 |
| `react-app/src/components/BootRetryScreen.jsx` (새 파일) | 안내 화면(문구·[다시 시도]) | ~25 |
| `react-app/src/app/bootLinkCheck.test.js` (새 파일) | 아래 테스트 | — |

### 안 건드릴 것

- `EmployerLinkCard.jsx`·`InviteRedeemModal.jsx`·`hydrate.js retryHydrate` — 그대로(`fetchLinkedDriverLink` 동작 같음). 앱이 이미 켜진 뒤의 사용처라 이번 범위 밖. 필요하면 AI관찰로 따로 여쭘.
- 저장·동기화(`store/**`·`lib/*outbox*`·`hydrate*` 본체) — 그대로. 들어가는 칸을 정하는 단계만 막음.
- 18-E 안내 화면(`public/offline.html`) — 그대로(이건 앱 파일도 못 받을 때, 19는 앱은 열렸는데 확인만 실패할 때).

### 실패 시 처리 — **신규 레이어 없음**

- 새 저장소·큐·기억 장치 없음(마지막 연동 상태를 기기에 기억하는 방식은 새 저장 장치라 안 씀 — AGENTS §7). 다시 시도 = 앱 다시 열기.

### §6 200줄

- 모두 200 이하(최대 `boot.js` ~140).

### §8 질문 답

- 1. 저장 대상: 없음(어느 칸으로 들어갈지 정하는 단계). 2. 구독: 없음. 3. 쓰기 창구: 실패 시 들어가지 않아 **잘못된 칸 쓰기 자체를 막음**. 4. 실패 경로: 위 목표 1·2. 5. 권한: 서버 권한 변경 없음.

### 테스트 (`bootLinkCheck.test.js`, 가짜 서버)

1. 연동 확인 1번 실패 → 재확인 성공(연동 있음) → 차주 칸(`linkedOwnerId`)으로 시작.
2. 두 번 다 실패 → `linkCheckFailed`, 본인 칸으로 불러오기(`hydrate`) **안 함**.
3. 확인 성공 + 연동 없음 → 지금처럼 본인 칸(재확인 안 함).
4. 화면: `linkCheckFailed`면 안내 화면 문구·[다시 시도], 로딩에서 멈추지 않음.
- 기존 `bootSettleUnlink`·`bootNeedsProfile`·`bootHomeGuard` 테스트 그대로 통과 확인. 새 테스트는 연결을 잠시 빼서 FAIL 확인(플레이북 §6).
- **보리 휴대폰 확인**: 평소 켜기(차주·기사) 그대로. (실패 상황은 휴대폰에서 만들기 어려워 테스트로 확인.)

### 진행 기록 (2026-10-08)

- 보리 "착수지시서 확정, 작업 진행해". 구현: `driverLinkRpc.js` 136→147(`checkLinkedDriverLink` 추가, `fetchLinkedDriverLink`는 그걸 감싸 결과 그대로), `boot.js` 119→157(`buildBootSession`·`sessionFromLink` 분리, `buildCloudAppSession` 결과 그대로), `useAppSession.js` 141→145, `App.jsx` 146→150, `BootRetryScreen.jsx` 22줄(새), 테스트 `bootLinkCheck.test.js`(새, 4건).
  - **지시서 밖 1개**: 안내 화면 모양 파일 `components/boot-retry.css`(22줄, 새) — 지시서엔 화면 파일만 적었는데 모양을 따로 둠. 18-E `offline.html`과 같은 모양, 버튼은 앱 버튼 색(`--primary-fill`).
  - 연동 확인이 오류를 "던지면"(드묾)도 실패로 보고 재확인 — 로딩에서 멈추지 않음.
- 로컬 `npm test` 전체 통과(unit 794 + 화면 320), `tsc` 오류 0. 기존 `bootSettleUnlink`·`bootNeedsProfile`·`bootHomeGuard` 그대로 통과.
- 되돌림 확인(플레이북 §6): 실패도 "연동 없음"으로 보던 예전 방식으로 바꾸면 → 1·2번 FAIL, 3·4번 PASS, 복구 후 4건 PASS.
- AI 개발 서버: 안내 화면만 띄워 모양 확인(모바일·다크, 버튼 `#2b6cb0`). `useAppSession`→`App` 연결은 화면 테스트 없음(앱 켜기 전체를 흉내 내는 테스트는 범위 밖) — 코드 확인.
- 코드 커밋 **react-app `4282283`**(push 전). 다음: 보리 push·배포 → **휴대폰**: 차주·기사 계정 평소처럼 켜기 그대로.
- push(보리) → CI "verify" 초록(`4282283`) → §5 리뷰 문제 없음(범위 = 지시서 + 모양 파일 1개(위 기록), 새 저장 장치·타입 꼼수 없음, 모두 200 이하, 기존 테스트 변경 없음) → 보리 휴대폰 확인·최종 `[x]` 승인("확인완료 다음", 2026-10-08).
