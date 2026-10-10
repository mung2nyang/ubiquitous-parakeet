# docs/report.md — 현재 슬라이스 착수지시서

## 로드맵 29 `commitLocalOnly` 결과 미체크 3곳 + 타입 단언 `[~]` — react-app `0170c9a` + 수정 `16596da`(unknown 표시 제거) 커밋, 보리 push·CI 대기

보리 지시 2026-10-10 ("29번 착수지시서 작성해"). 출시 전 1단계 ③. 저장 경로 → 플레이북 열람 완료(§1·§6·§7·§8).

### 현재 상태 (조사 결과)
- `commitLocalOnly`(`src/lib/outboxCommit.js:34`)는 서버 없이 휴대폰에만 저장하는 공용 함수.
  저장 성공이면 `{ value: 새 목록, failed: false }`, 실패면 `{ value: undefined, failed: true }`를 돌려준다.
- 그런데 함수 설명(타입)이 "value는 목록이거나 비어 있음(undefined)"으로 **성공/실패 구분 없이** 적혀 있어,
  부르는 쪽이 `failed`를 먼저 봐도 타입 검사는 "목록이 비어 있을 수 있다"고 본다.
- 부르는 곳 5곳:
  | 위치 | 상태 |
  |---|---|
  | `directMutationActions.js:45` `requestClientDeletion`(거래처 삭제) | `failed ? clients : value` — 결과 타입에 "비어 있을 수 있음"이 그대로 새어 나감 |
  | `directMutationActions.js:76` `requestDriverStatusChange`(기사 상태변경) | 위와 같음 |
  | `requestDriverInviteSave.js:58`(기사 초대 저장) | `/** @type {Array<DriverRecord>} */ (value)` **타입 단언 — AGENTS §6 위반** |
  | `directMutationActions.js:105` `requestDriverDeletion` | `dd54ca3`에서 이미 고침(`failed \|\| value === undefined` 확인) |
  | `vehicleDeletion.js:54` 차량 삭제 | 앞 두 곳과 같은 모양(로드맵 메모 이후 생긴 곳) |
- **실제 동작은 지금도 맞다** — `failed`가 거짓이면 `value`는 항상 목록(코드상 두 경우뿐).
  문제는 타입 검사가 그걸 모르는 것 + 단언으로 덮은 것. 나중에 누가 결과를 이어 쓰면 검사가 못 잡는다(로드맵 메모 "아무도 체이닝 안 해서 CI가 못 잡을 뿐").

### 목표 상태 (기대 동작)
1. `commitLocalOnly`의 결과 설명을 **"성공이면 목록 있음 / 실패면 비어 있음" 두 갈래**로 고친다(코드 동작은 그대로, 설명만).
   → 부르는 쪽에서 `failed`를 보면 타입 검사가 자동으로 "목록 있음"을 안다. 5곳 모두 덕을 본다.
2. `requestDriverInviteSave.js:58`의 타입 단언을 **지운다**(1번 덕에 필요 없어짐).
3. `requestClientDeletion`·`requestDriverStatusChange`에 돌려주는 값 설명(`@returns`)을 붙여,
   "목록이 절대 비어 있지 않음"을 타입 검사가 **직접 확인**하게 한다.
4. 테스트 2개 추가 — 비회원이 휴대폰 저장에 실패할 때(저장 공간 꽉 참 흉내):
   ① 거래처 삭제 ② 기사 상태변경 → 원래 목록을 돌려주고, 실패 안내, 저장소(Store)·휴대폰 저장값 그대로.
   (기사 초대·차량 삭제의 같은 경우는 기존 테스트가 이미 있음: `directMutationActions.test.js:616`, `vehicleMutations.test.js`)
5. 화면·저장 동작은 바뀌지 않는다.

### 건드릴 파일
| 파일 | 내용 | 줄 수(현재 → 예상) |
|---|---|---|
| `react-app/src/lib/outboxCommit.js` | `commitLocalOnly`의 `@returns` 설명만 두 갈래로 | 88 → 88~89 |
| `react-app/src/lib/directMutationActions.js` | 두 함수에 `@returns` 추가(코드 줄 무변경) | 124 → 126 |
| `react-app/src/lib/requestDriverInviteSave.js` | 58줄 타입 단언 제거 | 117 → 117 |
| `react-app/src/lib/directMutationActions.test.js` | 위 4번 테스트 2개 추가(테스트 파일) | 694 → 약 730 |

### 안 건드릴 것
- `vehicleDeletion.js` — 1번만으로 타입이 바로잡힘(같은 `failed ? cars : value` 모양), 코드 변경 불필요.
- `requestDriverDeletion` — `dd54ca3`에서 이미 확인 코드 있음(`directMutationActions.js:106`).
- `commitWithOutboxAndFlush` 등 outbox 나머지, `commitBatch`·저장 순서 — 손대지 않음.
- 화면 파일 전부.

### §6 200줄
- 바뀌는 프로덕션 파일 3개 모두 200줄 이하 유지(88~89 / 126 / 117). 테스트 파일은 예외.
- 새 `any`·`@ts-ignore`·단언 없음, 오히려 단언 1개 제거.

### §8 5대 질문
1. 구독/스냅샷 — 해당 없음(저장 함수의 결과 타입만). 2. 보이는 값 — Store(변경 순서 그대로).
3. 쓰기 창구 — 기존 `request*` 그대로. 4. 경합 — 저장 순서·시점 변경 없어 영향 없음. 5. DB 권한 — DB 무변경.

### 플레이북 §7 대조 (바뀌는 게 없음을 확인)
- 가장 먼저 바뀌는 상태·readiness 순서·notify·원격 호출 — 모두 기존과 같음(코드 실행 줄 무변경, 설명과 단언만).
- §8 strict-inventory 진단 수: 지금 **454줄**(기준선) → 커밋 전 다시 세서 늘지 않았는지 확인.

### 실패 시 처리
- 새 저장소·재시도·대체 장치 등 **신규 레이어 없음**.
- 만약 1번의 두 갈래 설명을 타입 검사가 부르는 쪽에서 못 알아보면(일부 꺼내 쓰는 방식 한계),
  `dd54ca3`과 같은 방식(`failed || value === undefined`면 원래 목록)으로 각 부르는 곳에 한 줄씩 넣는다 — 이 경우 그대로 보고 후 진행.
- 검증에서 하나라도 실패하면 AGENTS §3대로 수정 착수지시서를 다시 쓴다.

### 검증 (AI)
1. `npm run typecheck` 오류 0, strict-inventory 454 이하.
2. `npm test` 전체 통과.
3. 테스트 진실성: 새 테스트 2개가 실제로 잡는지 — 두 함수에서 `failed ? 원래목록 : value`를 `value`로 잠깐 바꿔 FAIL 확인 후 되돌림,
   FAIL 원문 로그를 아래에 첨부(플레이북 §6).
4. 타입 검사가 실제로 지키는지: 같은 망가뜨림에서 `npm run typecheck`도 오류를 내는지 확인(3번 `@returns` 덕).
5. 화면 변화 없음 → 보리 브라우저 확인 불필요, CI 초록으로 확인.

### 커밋 메시지 초안
`fix: 휴대폰 저장 결과(commitLocalOnly)를 성공/실패 두 갈래로 — 기사 초대 타입 단언 제거, 실패 테스트 2개 추가`

### 진행 결과 (2026-10-10)
- 대체 방법 불필요 — 두 갈래 설명을 타입 검사가 부르는 쪽에서 그대로 알아봄.
- `npm run typecheck` 오류 0, strict-inventory **454 그대로**(새 테스트 도우미 타입 설명 빠져 처음엔 462 → 고쳐서 454).
- `npm test` 전체 통과(832 + 340), 이 파일 35개 통과.
- 진실성: `directMutationActions.js`에서 `failed ? 원래목록 : value`를 `value`로 바꾸면 새 테스트 2개 FAIL(종료 코드 1, 1018ms) +
  `tsc` 오류 2건(47·79줄 "undefined를 목록 자리에 못 넣음") — 되돌림, 커밋 안 됨.
- 참고: 작업 중 다른 커밋 `bb7a03d`(차량 관리 카드 칩 모양, AI 작업 아님)가 들어옴 — 이번 범위 밖, 손대지 않음.

FAIL 원문(발췌, `node --experimental-test-module-mocks --test-force-exit --test src/lib/directMutationActions.test.js`):
```
✖ failing tests:

test at src\lib\directMutationActions.test.js:343:3
✖ 로드맵 29 — 비회원 로컬 거래처 삭제인데 휴대폰 저장이 실패하면: 원래 목록·실패 안내, Store·localStorage 그대로 (1.1399ms)
  AssertionError [ERR_ASSERTION]: 실패하면 원래 목록(비어 있지 않음)
  + actual - expected
  
  + undefined
  - [
  -   {
  -     companyName: '한진',
  -     id: 'client-1'
  -   }
  - ]
  
      at TestContext.<anonymous> (file:///C:/Users/znlsl/OneDrive/%EB%AC%B8%EC%84%9C/GitHub/%F0%9F%A7%AAteat/react-app/src/lib/directMutationActions.test.js:355:12)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: [ { id: 'client-1', companyName: '한진' } ],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }
```
