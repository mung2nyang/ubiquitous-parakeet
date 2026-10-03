# docs/report.md — 현재 슬라이스 착수지시서

## 10-S-1 차량·프로필 접근 차단 (2026-10-03, 구현·검증 중 `[~]`)

**목적·현재 상태:** 보리 요청으로 10번 완료 후 10-S를 즉시 처리 순서에 등록. 시작 앱 `0511e2e`·문서 `dcbbf8d`; 앱 미커밋 없음, 문서는 계획 3개 변경 상태에서 시작. 보리 “착수지시서 확정, 작업 진행해”로 구현 승인. 완성본 제시 후 DB 적용·시험 질문에 보리 “계속 진행해”로 실행 승인(2026-10-03). 0017·0018 실제 적용 및 순차 공격·정상 경로 검증 통과.
**실제 서버 근거:** 로그인된 Supabase `wphlnkfymvpnklgbuxrk`에서 SELECT 확인. 초대 INSERT/UPDATE는 owner_id만 확인, 감시 트리거는 BEFORE UPDATE만, 접근 함수는 차량 소유 불검사, 프로필 조회는 status 불검사. 수락 함수는 내부 허용 표시를 쓰지 않는다. pending 2·linked 3·차량 소유 불일치 0건. 이 항목은 적용 전 진단이며, 적용 후 공격 INSERT 시험 결과는 아래 검증 기록에 있다.

### 기대 동작

1. **공격 INSERT 차단:** 내 소유 차량 + pending + driver_id NULL + 해제 요청 두 칸 NULL만 허용. 남의 차량, 처음부터 linked/disconnected, 자기 또는 타인 기사 지정, 해제 요청 조작은 RLS와 BEFORE INSERT/UPDATE 감시로 거절한다. 사용자 입력 상태값에 신뢰를 두지 않는다.
2. **UPDATE 우회 차단:** 변경 전후 차량 소유 확인, owner_id·driver_id·status 직접 변경 및 연동 후 차량 교체 차단. 동일 값 재저장·정상 계약기간 수정은 유지. 정상 수락 RPC만 검증·행 잠금 후 내부 허용 표시를 최소 구간에서 쓰고 복원한다. 해제·복사 내부 경로와 일반 API를 통한 내부 표시 우회 가능성도 점검한다.
3. **읽기 이중 방어:** driver_can_access_vehicle_date의 현재 연동·과거 계약 양쪽에 실제 차량 소유자 일치 추가. 현재 연동이 있어야 같은 기사·차량의 과거 계약기간을 읽는 7-B 규칙 유지. profiles 상대 조회는 유효한 linked 관계만; 본인 조회 유지. 차량 SELECT도 소유 불일치 연동으로 열리지 않게 보강하고 정책 순환 참조를 방지한다. 적용 직전 불일치 행을 재조회하며 발견 시 임의 정리하지 않는다.
4. **실행권:** delete_own_account·driver_can_access_vehicle_date의 anon 및 PUBLIC 상속 실행권 점검·회수, 필요한 authenticated 실행권 유지. SECURITY DEFINER는 search_path=public, 새 보조 함수도 최소 실행권으로 제한.

### 건드릴 파일

- `react-app/supabase/migrations/0017_driver_link_write_guard.sql` 신규 — 쓰기 정책·트리거·정상 수락 함수.
- `react-app/supabase/migrations/0018_driver_link_read_guard.sql` 신규 — 차량·프로필 조회, 접근 판단 함수·실행권.
- `react-app/supabase/tests/driver_link_security.sql` 신규 — 일반 사용자 역할의 공격·정상 경로 검증, 시험 변경은 같은 트랜잭션에서 전부 ROLLBACK.
- **추가 승인(2026-10-03):** `react-app/src/components/DriverConnectionPage.jsx`, `DriverConnectionPage.security.test.js` 신규. 보리 “화면·테스트 수정도 추가 승인”. 로그인 상태의 수동 [연동 완료] 버튼 숨김, 비회원 로컬 동작 유지.
- 문서: `ubiquitous-parakeet/docs/report.md`, `docs/roadmap.md`, `STATUS.md` — 계획·검증·승인 기록.

### §6 200줄

프로덕션 SQL 각각 주석·빈 줄 포함 200줄 이하. 책임은 쓰기(0017) → 읽기(0018)이며 기존 0001~0016은 보존한다. 검증 SQL·JS는 테스트 파일 예외. 추가 승인된 화면 파일은 194줄로 분리 불필요. 줄 압축·기계적 분할 금지.

### 영향·검증·실패 처리

- 권한 정본은 Supabase, 화면 데이터는 기존 Store/hydrate 경로 유지. 저장 창구 directMutations의 초대 insert/update와 RPC가 대상. directMutationActions.js·outboxFlush.js의 직접 상태 변경 호출이 정상 흐름에서 쓰이는지 먼저 추적; 호환 수정이 필요하면 범위 보완 후 재승인. 정상 CRUD·계약기간·공유 장부·해제 복사 규칙은 유지하고 불법 연동 경로를 차단한다(sot §0).
- 브라우저에서 실제 관련 정책·함수·컬럼 권한을 추가 SELECT 확인 후 멱등 BEGIN…COMMIT 완성 SQL과 사후 SELECT·기대 결과를 작성한다. 라이브 적용·되돌림 시험은 완성 SQL과 대상·복구 범위를 제시한 뒤 보리의 실행 지시를 받는다.
- **필수 공격 시험:** authenticated 역할 + 실제 JWT 사용자 문맥으로 남의 차량 INSERT, linked INSERT, 기사 지정 INSERT, 요청 조작 INSERT, pending→linked UPDATE, 차량·기사 바꿔치기, disconnected 재활성화 모두 거절 및 행 잔류 없음 확인. 관리자 권한 성공/실패로 대체 금지. anon 거절도 확인.
- **필수 회귀:** 정상 초대 생성·수정·수락(중복·동시 수락 포함), linked 계약기간 수정, 해제 요청·취소·동의·3일 처리와 기록 복사, 해제 후 상대 프로필·차량·기록 6종 접근 차단, 같은 기사 재연동의 과거 기간 접근. 시험은 기존 기록을 영구 변경하지 않고 전부 되돌린다.
- 브라우저: 보리 차주 초대→기사 수락→계약 수정→해제→새로고침 후 각자 정보 확인. 서버 사후검증·§5 리뷰·사용자 push 후 CI 초록·보리 최종 승인 전 완료 표시 금지. 기존 CI 검증 반복 실행은 하지 않는다.
- 실패 시 신규 저장소·큐·fallback 없이 중단, 수정 지시서 작성. 데이터 삭제·취약 정책 자동 복구 없음. 커밋 메시지: `fix: 기사 연동 조작과 해제 후 개인정보 접근 차단 (10-S-1)`; 보리의 “커밋해” 지시(2026-10-03)로 남은 검증 전 현재 변경을 커밋. 최종 완료 승인을 뜻하지 않으며 push는 하지 않음.

**안 건드릴 것·남는 위험:** 초대코드 난수·만료·시도 제한은 다음 S-2(로드맵 필수 후속, 아직 미해결). npm 의존성·출시 URL·Google 설정·금액 계산·화면 디자인은 S-1 범위 밖. S-1 완료를 보안 전체 완료로 보고하지 않는다.
### 구현·검증 기록

- 0017 쓰기 보호 + 초대 수락 잠금, 0018 유효 연동 읽기 + 실행권, 되돌림 검증 SQL 작성. 기존 0001~0016 무수정. 2026-10-03 Supabase 브라우저 SQL Editor에서 실제 적용. 먼저 두 파일 본문+시험을 BEGIN…ROLLBACK으로 실행해 PASS·변경/시험 계정 모두 복구 확인 → 두 본문을 한 BEGIN…COMMIT으로 정식 적용 → 시험만 다시 실행해 PASS·ROLLBACK 확인.
- 추가 실서버 SELECT: 공개 함수 16개·테이블 권한·기록 6종 RLS·fixture 필수 컬럼 확인. `upsert_driver_link_idempotent`는 invoker이고 내부 표시를 설정하지 않음. `DriverConnectionPage.jsx`의 로그인 사용자에게도 열린 수동 연동 버튼 확인 → 추가 승인 후 로그인 때 숨김. outbox의 직접 status 변경도 서버에서 거절되며 새 우회 경로를 만들지 않음.
- 관련 화면 테스트 4개 통과(초대 버튼 보안·해제 컨트롤·기사 Store·차량 Store, 4424.5016ms). 전체 CI test/typecheck/build는 반복하지 않았음. 새 테스트는 실제 비회원 클릭 후 상태 변경 및 서버 UPDATE 0회까지 확인.
- 실서버 검증: 일반 authenticated 역할·JWT 문맥으로 남의 차량/linked/disconnected/기사 지정/요청 조작 INSERT, status·차량·기사·소유자 UPDATE, 내부 표시 흉내, disconnected 재활성화 차단. 정상 생성·수정·수락·중복 수락 차단·해제 요청/취소/동의·6종 기록 복사·해제 후 CRUD 차단·같은 기사 과거 기간·3일 처리·anon 거절 PASS.
- 사후 조회: INSERT 정책에 소유·pending·기사 미지정·요청 없음, UPDATE 전후 소유 확인, 트리거 BEFORE INSERT OR UPDATE, 프로필/차량 조회 보조 함수 확인. delete_own_account·driver_can_access_vehicle_date 포함 새 보조 함수 5개의 anon=false/authenticated=true·search_path=public 확인. 원래 연동 5(대기2·연동3)·사용자11·차량12 유지, 임시 프로필0.
- 실행 본문은 주석·공백 정규화 후 파일과 길이/체크섬 대조: 0017 4940/3274680972, 0018 2622/3017669502, 시험 11319/1598791560. 정식 실행의 본문은 동일하고 트랜잭션만 합침. 파일 사후 SELECT는 한 조회로 합쳐 같은 항목을 확인.
- 미완료: 두 연결 동시 수락 실측(잠금 코드 검토와 순차 중복 시험으로 대체하지 않음), 보리 앱 브라우저 실검증, 사용자 push·CI·최종 승인. 아직 `[x]` 아님. 초대코드 추측 위험은 S-2로 남음.

**실행 승인 이력:** DB 적용·임시 계정3개 시험·ROLLBACK 질문에 보리 “계속 진행해” 승인. 위 절차 실행 완료, 같은 작업 재승인 불필요.
**현재 상태:** 앱 화면 1개·테스트 1개·신규 SQL 3개 및 계획 문서 수정. 라이브 보안 규칙은 적용됨. 시험 레코드는 전부 복구했고 실제 사용자 데이터 변경 없음. react-app `e003f0f` 커밋 완료(보리 명시 지시). 진행 기록도 문서 커밋에 보존하며 `[~]` 유지. 푸시 없음.

### 서버 검증 검출력 — 수정 전 예상 실패

보안 변경을 롤백한 기존 규칙에서 같은 시험을 실행하자 남의 차량 INSERT가 허용되어 아래 지점에서 실패했다. 의도한 검출력 시험이며, 실제 사용자 대신 임시 fixture로 수행·복구했다. 브라우저 실행이므로 프로세스 종료코드/시간 출력은 제공되지 않음.

```text
Failed to run sql query: ERROR:  P0001: FAIL: 허용되면 안 되는 SQL: insert into public.driver_links(owner_id,vehicle_id) values('4e0748d9-a3ab-4baa-bdf6-682bedee4897','369a0805-cc66-4062-ae87-db0f62c21b1c')
CONTEXT:  PL/pgSQL function pg_temp_59.expect_denied(text) line 8 at RAISE
SQL statement "SELECT pg_temp.expect_denied(format('insert into public.driver_links(owner_id,vehicle_id) values(%L,%L)', owner_a,car_b))"
PL/pgSQL function inline_code_block line 47 at PERFORM
```

### 테스트 검출력 증거 — 의도적으로 버튼 보호를 빼면 실패, 즉시 복원

명령: `node --experimental-test-module-mocks --test-force-exit --test-timeout=60000 --test src/components/DriverConnectionPage.security.test.js`
종료 코드 1, 실제 출력(예상 실패이며 제품 오류 재승인 대상 아님):

```text
(node:40276) ExperimentalWarning: Module mocking is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:40276) DeprecationWarning: mock.module(): options.namedExports is deprecated. Use options.exports instead.
✖ 로그인 초대는 수동 연동 버튼 없이 수정·취소만, 비회원 수동 연동은 유지 (51.5253ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3302.3212

✖ failing tests:

test at src\components\DriverConnectionPage.security.test.js:17:1
✖ 로그인 초대는 수동 연동 버튼 없이 수정·취소만, 비회원 수동 연동은 유지 (51.5253ms)
  AssertionError [ERR_ASSERTION]: 차주가 기사 동의 없이 연동시키는 버튼은 없어야 함

  true !== false

      at TestContext.<anonymous> (file:///C:/Users/znlsl/OneDrive/%EB%AC%B8%EC%84%9C/GitHub/%F0%9F%A7%AAteat/react-app/src/components/DriverConnectionPage.security.test.js:35:12)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: true,
    expected: false,
    operator: 'strictEqual',
    diff: 'simple'
  }
revert-check exit=1; original fixed source restored
```
