# docs/report.md — 현재 슬라이스 착수지시서

## 배포까지 순서 3번 — 테스트 원본 의존 제거 `[x]` 착수지시서 (react-app `5277b91`, 2026-09-27 최종 승인)

### 1. 목적 (비개발자용)
돈 계산 테스트가 지금은 옛 원본 앱을 실제로 돌려서 "금액이 같은가"를 비교한다. 앞으로 계산식을 일부러
원본과 다르게 바꾸면(F-02~F-04, 현직자 조언) 정상 변경인데도 테스트가 실패한다. 그래서 원본과 비교하는 대신
**"이 입력이면 이 금액이 나와야 한다"는 값을 직접 적어 두고 검사**하도록 바꾼다. 앱 화면·동작은 안 바뀐다.

### 2. 현재 → 목표
- 현재: `finance.test.js`·`receivables-invoices.test.js`가 `src/lib/originalWindow.js`로 옆 저장소(`ubiquitous-parakeet`)의
  원본 파일 5개를 불러와 결과를 비교. CI도 원본 저장소를 따로 받아 온다(`ci.yml` 26~30행).
- 목표: 두 테스트가 원본 없이 통과. `originalWindow.js` 삭제, CI의 원본 checkout 제거. 검사 항목 수는 줄이지 않는다.

### 3. 건드릴 파일
| 파일 | 할 일 |
|---|---|
| `src/domain/finance.test.js` (460줄) | 원본 비교 → 직접 금액 검사로 전환. 원본과 무관한 후반부 테스트(비용·급여·서브차량 고정노선)는 그대로 |
| `src/domain/receivables-invoices.test.js` (141줄) | 위와 같음. 부분 입금·전액 입금 등 기능 검사는 그대로(값만 원본 대신 직접 값) |
| `src/lib/originalWindow.js` (39줄) | 삭제 |
| `.github/workflows/ci.yml` | 원본 checkout 단계 + 머리말 주석 4~6행 정리 |
| `src/testSupport/setupDom.js` | 주석 1줄만(삭제될 `originalWindow.js` 언급 문구) |
| `scripts/guest-durable-header.js` (156줄) | 삭제 — `package.json`·소스 어디서도 안 부름(전수 grep: 참조는 `_scratch/`뿐) |
| `_scratch/migrate-guest-durable-tests.mjs` | 삭제 — 위 파일을 가리키는 일회성 스크립트. **`_scratch/`는 `.gitignore` 27행 대상이라 커밋엔 안 잡힘** |

### 4. 안 건드릴 것 (근거 병기)
- 프로덕션 코드(`domain/`·`lib/`·`store/`) — `originalWindow` 참조처 전수 grep 결과: 테스트 2개 + 주석 2곳(`ci.yml`·`setupDom.js`)뿐.
- 원본 저장소의 `tests/core-logic.test.js` — 원본 관리 종료 때까지 유지(보리 확정). react-app에서 `core-logic`을 언급하는 파일은 `finance.test.js` 하나뿐.
- 원본과 무관한 다른 테스트 — `originalWindow`를 import하는 테스트는 위 두 개뿐(전수 grep).
- `_scratch/guest-durable-header-load-output.txt` — 로드맵 범위(스크립트 2개)에 없어 그대로 둠.

### 5. 방식
1. 현재 원본과 일치하는 값(=지금 react-app 출력, 두 파일의 비교가 통과 중이라는 게 근거)을 실행해 뽑아 **직접 값**으로 적고, 어떤 입력에서 나온 값인지 1줄 주석.
   원본과 다르다고 이미 확정된 부분(예: 월 운송료 +80,000·+1회, `finance.test.js` 102행)은 확정 규칙 값 그대로.
2. F-02~F-04 관련 값은 지금 동작 값을 박는다(나중에 그 슬라이스가 값을 고침).
3. `getDetailPaymentSummary` 등 객체 비교(`same(...)`)는 기대 객체를 직접 적는다.

### 6. 정정 및 삭제 대상 확인 (보리 승인: "콘솔 비교표 테스트 삭제")
`finance.test.js` 368~405행 "숫자 비교표용 스냅샷" 테스트는 콘솔 출력만 하는 게 아니라 **16개 행에 `assert.equal(ours, theirs)`도 함께 한다**
(제가 앞서 "숫자를 출력만 한다"고 설명한 것은 부정확했음). 15개 행은 위쪽 테스트가 이미 같은 값을 검사해 삭제해도 손실이 없다.
**"연체 미수 건수"(`getOverdueReceivableItems`, 기준일 2026-08-25) 1개만 다른 곳에 검사가 없어서**, 삭제하지 않고 직접 값 검사로 옮긴다
(예: '미수금 잔액' 테스트 옆). 콘솔 출력 부분만 삭제.

### 7. 검증
- `npm test`(unit + 화면 둘 다) 통과, `npm run typecheck` 0에러, `originalWindow`·`loadOriginalWindow` grep 결과 0건.
- **테스트 진실성 확인**: 계산 코드(예: 수수료율)를 임시로 한 줄 바꿨을 때 새 직접 값 테스트가 실제로 FAIL하는지 확인하고 즉시 원복(커밋에 안 남김).
- push 후 CI "verify" 초록 — 원본 checkout을 뺀 CI가 통과하는 것이 "원본 의존 제거"의 최종 증거.
- 브라우저 검증: 화면·런타임 코드 무변경이라 대상 없음. **생략 승인 요청**(AGENTS §2 예외는 사전 서면 승인 필요).

### 8. 실패 시 처리·신규 레이어
- 신규 저장소·큐·fallback 없음(테스트·CI 정리만, AGENTS §7 해당 없음). 플레이북 트리거 경로(`store/**`·저장·동기화·`domain/finance*` 소스) 수정 없음 — `finance.test.js`는 테스트 파일이라 트리거 아님.
- 원본 없이 통과 못하는 항목이 나오면 값 임의 조정 금지, 어떤 값이 왜 다른지 보고하고 대기.

### 9. §6 (200줄)
신규 프로덕션 파일 0개, 삭제 2개(`originalWindow.js`·`guest-durable-header.js`). 수정하는 프로덕션 파일은 `setupDom.js`(주석 1줄)뿐.
`finance.test.js`(460)·`receivables-invoices.test.js`는 테스트 파일이라 200줄 예외. 기존 200줄 초과 프로덕션 파일 수정 없음.

### 10. 커밋 (승인·검증 후 1회, push는 보리)
초안: `test: 돈 계산 테스트가 원본 앱 없이 확정 규칙 값으로 검사하게 한다 (로드맵 3번)` — 본문에 위 §2·§6 요약.
