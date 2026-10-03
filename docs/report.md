# docs/report.md — 현재 슬라이스 착수지시서

(지난 작업 10-S-1은 `git log -p -- docs/report.md`, 커밋 8821832.)

## 10-S-2 초대코드 강화 — 착수지시서 (작성 2026-10-03, `[x]` — 보리 최종 승인 2026-10-03)

> **진행(2026-10-03):** 보리 "착수지시서 확정, 작업 진행해". 0019 SQL·서버 시험 SQL 작성(아직 실서버 미적용 — AI의 실서버 쓰기는 자동 차단, 보리가 붙여넣어 실행).
> 화면 6파일 수정 + 테스트(`inviteCode.security.test.js` 신규 7개, `drivers-cloud.test.js` 6자리 예시 코드를 10자리로). `npm test` unit 777·app 269 통과(신규 제외 기준), `tsc` 0에러. `directMutations.js` 200줄 유지(재시도 생성기를 동적 import로).
> 브라우저(dev, 저장 안 함): 기사 초대 창 코드 `66SWQ-AN8HQ` 형식·읽기 전용·[코드 생성] 동작, 375px 넘침 없음.
> **범위 추가 승인(보리 "그 파일도 수정해서 진행해"):** `src/lib/carInviteFromDraft.js` 6자리 검사 → 빈 코드만 건너뛰고 형식은 `upsertDriver`가 검사, 테스트 예시 교체 + 6자리 안내 테스트 1개. 차량 등록 화면 코드 `HBYQD-VPJUB`·읽기 전용 확인(저장 안 함).
> `npm test` unit 785·app 269 통과, `tsc` 0에러. react-app `3fe7975` 커밋(push 없음). 보리 push 후 0019 실서버 적용(2026-10-03) — 사후 SELECT: 트리거 guard_invite_code·guard_unlink, 시도 표 RLS 켜짐·정책 0·authenticated 조회 불가, 수락 함수 postgres·definer·search_path=public·anon 실행 불가, 대기 초대 1건 중 사용 가능 0(원래 2건 중 1건은 S-1 앱 확인에서 쓰임). 서버 시험 SQL(주석·PASS 표시 줄만 뺀 본문) Success — 형식 거절 4·기한 무시·재발급 7일·틀림 5회 기록 후 6번째 차단·만료 거절·소문자/하이픈 연결·anon 거절 통과, 전부 ROLLBACK. CI `3fe7975` 초록. AI 앱 확인(보리 지시, localhost dev = 배포와 같은 코드·실서버, 차주 계정): 코드 칸 입력 무시·[코드 생성] `KVYYJ-DRP4K`, 시험 초대 저장 → 실서버 10자리 저장·새로고침 유지, 초대코드 입력에 틀린 코드 1번째 "맞지 않거나 기한(7일)" 안내·6번째 "여러 번 틀렸습니다" 차단, 시험 초대 취소로 정리(대기 0). 두 번째 계정이 없어 정상 코드 수락은 앱에서 못 봄(서버 시험 6번 항목으로 확인). 보리 최종 승인(2026-10-03). 목록 화면 하이픈 표시는 S-2 밖 소수정으로 따로(보리 "나").(10자리 초대·소문자 입력 연결·6번째 틀림 안내·기존 대기 초대 재발급) → CI → 최종 승인.

> **착수 조건:** S-1 `[x]` 확정(2026-10-03). 보리 "착수지시서 확정, 작업 진행해" 전에는 코드·DB를 건드리지 않는다.

**목적(보리님용):** 지금 초대코드는 숫자 6자리(90만 가지)라, 로그인한 누구나 자동으로 계속 넣어 보면 남의 대기 중 초대에 들어가 그 차량 기록·차주 이름을 볼 수 있다. 코드를 길게, 기한을 두고, 틀린 시도를 제한한다.

**현재 상태(근거):**
- 코드는 화면에서 `Math.random` 6자리 숫자로 만들고 차주가 직접 입력도 가능(`domain/drivers.js:19`, `CarDriverConnectPanel.jsx:55`, `DriverFormModal.jsx:61`), 저장 실패 재시도도 6자리(`directMutations.js:163`).
- 서버 수락 함수(`0017` `redeem_driver_invite_code`)는 코드 형식·만료·시도 횟수를 안 본다. `driver_links`에 만료 칸 없음.
- 문자 초대는 저장 전 화면의 코드로 보냄(`DriverFormModal.jsx:29`, `driverInviteSms.js` 6자리 숫자 검사) → 서버가 코드를 새로 정하면 문자와 어긋나므로, **화면이 강한 코드를 만들고 서버는 형식만 강제**하는 방식으로 설계.

### 기대 동작
1. **코드:** 영문 대문자+숫자 10자리(헷갈리는 0·O·1·I·L 제외, 31종 → 약 800조 가지), `crypto.getRandomValues`로 생성. 화면 표시는 `ABCDE-FGHJK`. 차주 직접 입력 칸은 읽기 전용, [코드 생성]만. 기사 입력은 대소문자·하이픈·공백 무시.
2. **서버 형식 강제:** `driver_links` 감시 트리거에서 INSERT·코드 변경 때 형식이 아니면 거절(약한 코드·옛 6자리 새로 못 만듦).
3. **만료:** `invite_expires_at` 칸 추가. 코드 생성·변경 때 서버가 지금+**7일**로 설정(화면 값 무시). 수락 함수는 만료면 "만료된 코드입니다. 차주에게 새 코드를 요청해 주세요." 차주는 초대 수정 → [코드 생성] → 저장으로 재발급(기한도 새로).
4. **시도 제한:** 계정당 실패 **10분 5회·하루 20회** 넘으면 수락 함수가 거절("잠시 후 다시 시도"). 실패 기록이 오류와 함께 되돌려지지 않도록, 못 찾음·만료는 오류 대신 빈 결과로 돌려주고 화면(`driverLinkRpc.js`)이 문구로 바꾼다.
5. **기존 대기 초대:** 결정 ④에 따름. 연결된(linked) 줄은 코드를 안 쓰므로 영향 없음.
6. 비회원(로컬) 초대도 같은 생성기 사용 — 서버 없음, 동작 동일.

### 건드릴 파일 (보안 묶음이라 평소 1~3개보다 많음 — 형식 하나가 아래 전부에 박혀 있어 나누면 중간 상태에서 문자 초대가 깨짐)
- `react-app/supabase/migrations/0019_driver_invite_code_hardening.sql` 신규 — 만료 칸, 형식·만료 트리거 보강, 시도 기록 표, 수락 함수 교체, 기존 대기 초대 처리.
- `react-app/supabase/tests/driver_invite_security.sql` 신규 — 일반 로그인 역할로 약한 코드 INSERT·만료 수락·6회째 실패·만료일 조작 거절, 정상 생성·수락·재발급 통과, 전부 ROLLBACK.
- `src/domain/drivers.js`(생성기·형식 검사), `src/lib/driverInviteSms.js`(형식 검사), `src/lib/directMutations.js`(재시도 생성기 교체, **200줄 — 줄 수 늘리지 않음**), `src/lib/driverLinkRpc.js`(입력 정리·빈 결과 문구), `src/components/DriverFormModal.jsx`·`src/components/cars/CarDriverConnectPanel.jsx`(입력 읽기 전용·표시).
- 테스트: 관련 `*.test.js` 보강·신규.
- 문서: `docs/report.md`, `docs/roadmap.md`, `STATUS.md`.

### 안 건드릴 것
- `InviteRedeemModal.jsx` — 입력이 자유 글자이고 정리는 `driverLinkRpc.js`에서 함(근거: `InviteRedeemModal.jsx:13-15` 길이 4 이상만 검사).
- 0001~0018 파일, 연동 해제·기록 복사·접근 규칙(S-1 범위), 금액 계산, 디자인.

### §6 200줄
- SQL 각 200줄 이하 예상. `directMutations.js`는 지금 200줄 — 생성기 호출 교체로 줄 수 그대로 유지, 늘어나면 분리설계안 먼저 보고. `DriverConnectionPage.jsx` 194줄은 수정 대상 아님.

### §7 새 저장소 (승인 필요)
- 시도 제한용 **새 표 1개**(`driver_invite_redeem_attempts`: 사용자·시각, RLS 켜고 정책 없음 = 수락 함수만 씀, 하루 지난 기록은 함수가 정리). 결정 ③에서 승인 여부.

### 검증·실패 처리
- S-1과 같은 절차: 실서버 SELECT 확인 → 멱등 BEGIN…COMMIT 완성본 → 보리 실행 지시 → BEGIN…ROLLBACK 시험 PASS 후 적용 → 사후 SELECT.
- 브라우저(보리): 차주 초대 생성(10자리 표시)·문자 내용·기사 입력(소문자·하이픈 섞어)·연동 성공, 틀린 코드 6번째 거절 문구, 재발급.
- 실패 시 신규 레이어 추가 없이 중단·수정 지시서. 데이터 삭제 없음.

### 결정 (보리 "권장대로 1~4 전부 진행해", 2026-10-03)
1. 코드 형식: 영문+숫자 10자리.
2. 만료 기간: 7일.
3. 시도 제한 새 표(§7): 승인 — `driver_invite_redeem_attempts` 1개만, 계정당 10분 5회·하루 20회.
4. 기존 대기 초대 2건: 0019 적용 때 바로 만료, 차주가 재발급.
