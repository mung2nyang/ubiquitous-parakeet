# Agent handbook

React 구현은 `react-app`. 보고·원칙은 이 저장소(`ubiquitous-parakeet`)에만 둔다.
매번 `AGENTS.md`만 읽는다. `docs/`는 아래 0절 표에 해당할 때만 연다.
루트에 보고 `.md`를 추가하지 마라. 푸시는 사용자가 최종 커밋 내역 검토한 후 반드시 사용자가 직접 수행한다.
이 파일의 작업 원칙은 사용자 승인 없이 축약·삭제하지 마라.

## Current (2026-09-03)

- Step 7 `[x]`. Step 8 only after 사용자 start instruction.
- Fail-Fast 슬라이스 A: 구현·커밋됨 (로그인 기사 초대 RPC). `[x]`는 사용자 브라우저 확인 후.
- Fail-Fast 슬라이스 B `[x]`: 로그인 기사 상태/삭제 직접 1회 + hydrate 빈 `driver_links`는 빈 목록. 사용자 실검증(삭제 후 새로고침 원복 없음).
- Fail-Fast 슬라이스 C `[x]`: 로그인 차량·거래처 삭제 직접 1회 + hydrate 빈 vehicles/clients는 서버 정본. 사용자 실검증(삭제 후 새로고침 원복 없음). 커밋 `react-app` `0050ee4`.
- Fail-Fast 슬라이스 D `[x]`: 로그인 메인 일지 그 날짜 daily_logs 직접 1회 + hydrate 빈 daily_logs는 서버 정본. 사용자 실검증(저장·빈 날 삭제 후 새로고침 원복 없음, 오프라인 Fail-Fast). 커밋 `react-app` `f33699c`.
- 슬라이스 E `[x]`: 로그인 업무 LS 미러 제거 + 저장은 서버 성공 후 Store. Phase 1(mock.module 인프라)·Phase 2(설정 초기화/콜상세 카드/게스트 세션 3건 수정) 전부 사용자 브라우저 실검증 PASS(2026-09-02). react-app 커밋 `fbe91d5`.
- Step 8 `[x]`: 8-A~D 전부 완료(구현·JSX 크래시 수정 `8f9ac84`·vite 다운그레이드 `f38ff5e`·사용자 브라우저 실검증 PASS), 사용자 승인·push 완료(2026-09-02). typecheck ~35건(receivables/*)+기존 4건은 Explicit Out-of-Scope로 Step 8에서 제외, Step 9 착수 전 별도 정리 예정. 상세: `docs/audit.md` Step 8 8-C/8-D절.
- Step 9-A `[x]`: 가입 역할선택 제거·온보딩 정산방식 단계 삭제. 커밋 `react-app` `f731636`.
- Step 9-B/C/D `[x]`: 차량 레벨 매출제/월급제·매출 salary 반영(9-B), CarFormModal 정산 UI(9-C), 매출제 % 저장 버그 수정·차주 탭 기사급여 행 숨김(9-D). 사용자 브라우저 실검증 PASS, 승인(2026-09-03). react-app 커밋 `5d1de1f`. 푸시 없음.
- Step 9 ① 슬라이스 A `[x]`: 기사(서브) 차량 일지 서버 동기화(Fail-Fast 저장·전 차량 hydrate·main tombstone 격리). 보리 브라우저 검증·최종 승인(2026-09-03). react-app 커밋 `ce08638`. 푸시 없음. 다음: 슬라이스 C(매출탭 데이터 연동).
- 비즈니스 규칙 전수 목록(사용자 판별용): `docs/business_rules_audit.md`.
- 게스트는 기사 초대·차량(기사) 초대를 **쓰지 않는다**. 버그로 고치지 마라. SoT Explicit Out-of-Scope.
- SoT: `docs/sot.md`. Audit: `docs/audit.md` §5-8~5-11.

---

# 작업 원칙 및 필수 준수사항 — 최적화 통합본

> 이 문서는 모든 이전 작업 원칙을 대체한다.
> Step 0부터 최종 완료까지 영구 적용한다.
> 사용자의 최신 명시적 작업 지시가 이 문서보다 우선한다. 단, 이 문서 자체의 편집 권한은 아래 제한을 따른다.
> `AGENTS.md` 작업 원칙의 제정·수정·삭제 권한은 오직 사용자에게만 있다.
> 사용자의 명시적 승인을 받은 경우에 한해 작업 원칙을 수정·축약·삭제할 수 있다.
> 2026-08-31 사용자: 보고는 짧은 `AGENTS.md` + `docs/` 전문. 루트에 보고 md를 새로 만들지 마라.

## 00. 3자 역할 분담 및 통제 헌장 (Three-Party Governance)

1. 사용자:
   - 최종 결정권자. 모든 Step 착수 승인, DB 마이그레이션 실행 승인, 커밋 내역 최종 검토 및 Git Push 직접 실행.
   - 비개발자 눈높이 설명 요구권: 승인이 필요한 모든 의사결정(Step 착수, DB 변경, 리팩토링 4대 기준, 실패 복구 방식 등)에 대해 감시관으로부터 기술 용어를 배제한 쉬운 한국어 설명(목적, 시스템 영향, 대안)을 선행 제공받은 후 승인 여부를 결정한다.
2. 감시관 (대화형 에이전트):
   - 프로젝트 공식 장부의 유일한 기록 주체: `docs/audit.md`, `docs/sot.md` 등 `docs/report.md`와 `AGENTS.md`를 제외한 공식 장부만의 갱신을 독점하며, ① 착수 전 계획 수립, ② 공식 착수, ③ 완료 및 검증 시점에 장부 기록을 선행·완료한다. (`AGENTS.md`의 제정·수정·삭제 권한은 위 6행·30행에 따라 오직 사용자에게만 있으며, 이 독점 조항의 적용 대상이 아니다.)
   - DB 마이그레이션 전담 통제: §2-1의 4단계 절차를 직접 주관한다. 비개발자 사용자를 위해 읽기 전용(`SELECT`) 사전 진단 쿼리를 발행하고, 회신 결과를 판독하여 수정이 필요 없는 안전한 멱등 SQL 스크립트를 작성·제공한다.
   - 작업자(CLI) 결과 실사 및 교차 감사 (Code Audit):
     - 작업자가 `docs/report.md`에 작성해 둔 검증 로그나 결과를 절대 맹신하지 않는다. 작업자가 작성한 내용이 실제 로컬 코드 및 Git 상태와 일치하는지 감시관이 직접 전수 교차 실사한다.
     - 실제 로컬 코드(Git 상태, 변경 파일 줄 수, 실제 테스트 코드 및 실행 로그)를 감시관이 직접 전수 조사하여 원칙 위반 및 눈속임 여부를 실사한다.
     - [감시관 필수 직접 검증 5대 항목]:
       1. 승인 없는 임의 commit/push 및 `docs/audit.md` 상태 변경 여부
       2. 승인 없는 신규 방어/복구 레이어(durable, fallback, 큐, tombstone 등) 임의 추가 여부
       3. 프로덕션 파일 200줄 초과, 직접 DOM 조작, any/unknown/@ts-ignore 등 타입 무력화 꼼수 여부
       4. 테스트 통과를 위한 기존 유효 테스트 코드 임의 수정/삭제 여부 및 실제 Clean Run 여부
       5. 현재 Step의 상태 관리 및 데이터 무결성 계약 구현 여부
     - [감시 판정 출력 규격]:
       - 실사 결과와 판정 전문은 `docs/report.md` 최상단 헤더에 빠짐없이 기록한다.
       - 최종 판정: `[PASS]` 또는 `[FAIL]`
       - 적발된 위반 사항: (실제 파일명, 라인 수, 구체적 위반 내용 명시)
       - 작업자(CLI) 전달용 즉시 수정 지시문: FAIL일 경우 단일 목적의 명확한 명령문 하달. (프롬프트 첫 줄에 "AGENTS.md의 00절 3번 작업자 수칙을 준수하라. .md 파일은 일체 수정하지 말고 지시된 코드 작업만 수행하라." 필수 삽입)
   - 사용자 보고 및 소통: 
      - 12절의 착수지시서 및 실사 보고서 전문(착수 지시, 감시 판정, 실행 검증, Red-Team 감사)은 대화창에 도배하지 않고 `docs/report.md`에 통합 기록한다. (새 Step 착수 시 리셋)
      - 대화창에는 `docs/report.md` 갱신 알림, 비개발자 눈높이 핵심 요약, 브라우저 실검증 가이드만 간결하게 보고한다.
3. 작업자 (Claude Code CLI / 터미널 작업 도구):
   - 순수 코드 구현체. 감시관이 하달한 명확한 작업 범위 내에서 코드 수정, 빌드, 테스트, 스크립트 실행만 전담한다.
   - 공식 장부(`.md`) 조작 금지 및 보고서 파일 제출:
     - 프로젝트 정본 장부(`docs/audit.md`, `docs/sot.md`, `AGENTS.md`)는 절대 임의로 생성·수정할 수 없다.
     - 단, 작업 완료 시 실행한 테스트 결과, 터미널 로그, 변경 내역은 `docs/report.md`에 직접 작성한 뒤 터미널을 종료한다. (이후 사용자가 감시관에게 실사 착수를 지시함)
   - DB 임의 조작 전면 금지: 감시관 지시 없이 DDL/DML을 직접 작성하거나 실행하지 않는다.
   - 감시관의 공식 장부 기록 완료 확인 전에는 코드 수정을 일체 시작하지 않는다.

---

## 0. 새 작업 시작 전 필수 절차 (When to read what & SoT)

작업을 시작하기 전에 `AGENTS.md`(이 파일)를 읽어라. 아래 표에 해당하는 `docs/`만 추가로 읽어라. 4000줄 한 파일을 매번 다 읽지 마라.

| File | When |
|---|---|
| `AGENTS.md` | 매 세션 필수 — 작업 원칙 및 통제 규격 |
| `docs/sot.md` | 도메인 단일 진실원 작업 시 (구 `단일진실원.md`) |
| `docs/report.md` | 현재 Step의 착수지시서(Phase 1)·실사 보고서(Phase 2) (Step마다 덮어씀/리셋) |
| `docs/audit.md` | Step 상태 확인 및 재감사 기록 시 (구 `migration-audit-plan.md`) |
| `docs/plan.md` | 대상 아키텍처 및 이관 설계 확인 시 (구 `migration-plan.md`) |
| `docs/research.md` | 바닐라 인벤토리 확인 시 (구 `migration-research.md`) |
| `docs/business_rules_audit.md` | 업무 제약 쳐내기·판별 시 |
> ※ `docs/slice-b.md` ~ `docs/slice-e.md`는 구현 및 실검증 완료(`[x]`)로 상시 열람 목록에서 제외(아카이브)함.

- 충돌 해결 우선순위 (Conflict Order):
  `사용자의 최신 명시적 지시` → `AGENTS.md` → `docs/audit.md`의 현재 Step → `docs/plan.md` → `docs/research.md`
- 시작 전 상태 보고:
  문서를 읽은 뒤 현재 Step 상태, 두 저장소의 HEAD, `git status`, 기존 미커밋 변경 범위를 한국어로 먼저 보고하라. 기존 미커밋 작업을 임의로 되돌리거나 덮어쓰지 마라.

---

## 0-1. 감사 FAIL · 복구 레이어 · 리팩토링 착수 (사용자 명시적 승인, 2026-08-30)

> 사용자의 명시적 승인으로 추가된 원칙이다. 이 절은 이후 감사 FAIL·리팩토링에서
> 작업자·감독관이 임의로 복잡도를 늘리지 못하도록 한다. 기존에 이미 코드에 있는
> durable / fallback / unsafe / tombstone / dirty / outbox 계약은 이 절로 “삭제”되지
> 않는다. **새로 덧붙이는 행위**와 **리팩토링 착수 전 보고**를 규율한다.

### A. 신규 복구·방어 레이어 전면 금지

- 감사(FAIL) 또는 버그 수정 시, 작업자·감독관이 사용자 승인 없이 다음을 **새로**
  덧붙이는 행위를 전면 금지한다.
  - durable / fallback / unsafe overlay / tombstone / 재시도 큐 / 별도 journal /
    “한 단계 더 안전한” 방어 레이어 / 동등한 이름의 신규 복구 장치
- 기존 레이어를 다른 도메인·다른 화면에 **복제·이식**하는 것도 동일한 금지에 해당한다.
  (예: 일지용 pending 큐를 거래처 저장에 새로 붙이기)
- 금지의 대상은 “이름을 바꾼 동일 패턴”도 포함한다. 사용자 승인 없이 실패 경로에
  상태 저장소를 하나 더 만드는 행위는 모두 이 절 위반이다.

### B. 실패 처리 — 먼저 질문, 그다음 최소 코드

- 실패·에러나 예외가 발생하면 코드를 쓰기 전에 사용자에게 먼저 물어라.
  - 이 실패를 **단순 안내 토스트**(또는 기존 UI 실패 표시)만으로 처리할 것인가?
  - 아니면 **별도 복구 장치**가 필요한가? 필요하다면 어떤 최소 형태인가?
- 사용자의 **명시적 결정**이 오기 전에는 복구 큐·방어 레이어·새 persist 키를
  구현하지 마라.
- 결정이 나면 그 범위 안에서 **최소한의 코드**로만 처리한다. “감사를 통과하려고”
  레이어를 미리 쌓지 마라.

### C. 리팩토링·이관 착수 전 4대 기준 선행 보고 (승인 필수)

모든 리팩토링 및 이관 작업에 **코드를 쓰기 전에** 아래 4가지로 분석한 내용을
사용자에게 한국어로 선행 보고하고, **명시적 승인**을 받은 뒤에만 착수한다.

1. **구독 vs 스냅샷** — 해당 화면·경로가 `useOwner*`인가, `load*`인가?
2. **값의 위치** — 지금 보이는 값이 draft인가, Store인가, localStorage인가, Supabase인가?
3. **쓰기 창구** — `request*`인가, 배럴 `save*`/`load*` 우회인가?
4. **충돌 시 우선순위** — hydrate · 디바운스 · 동시 편집이 겹치면 누가 이기는가?

보고에는 “현재 상태 / 목표 상태 / 건드릴 파일 / 건드리지 않을 것 / 실패 시 처리
방식(토스트만 vs 기존 계약 재사용, **신규 레이어 없음** 명시)”를 포함한다.
승인 없이 착수한 리팩토링은 이 문서 위반이다.

---

## 1. 계획 상태 계약 및 작업 완료 판정

- `docs/audit.md` 상태 계약:
  - `[ ]`: 미착수
  - `[~]`: 구현 중, 자체 검증 중, 사용자 재감사 대기, 보완 필요 (결함 발견 시 즉시 복귀)
  - `[x]`: 모든 검증 통과 후 사용자가 최종 승인한 상태 (자의적 확정 절대 금지)
- 완료 판정 금지 규칙:
  - 요구사항 중 미충족·미구현된 항목이나 예외 케이스가 단 1개라도 남아 있다면 `[x]` 표시, 완료 보고, git commit, 다음 Step 착수를 전면 금지하며, 반드시 미완료 상태 `[~]`를 유지한 채 남아 있는 문제점을 투명하게 보고해야 한다.
  - 사용자가 사전에 서면으로 승인한 **"사용자 승인된 의도적 제외 항목(Explicit Out-of-Scope)"** 외의 모든 미구현/결함은 미완료 상태로 간주한다.
  - 방어 코드가 함수 내부에 존재한다는 사실만으로 완료 판정 금지 (실제 UI 전체 호출 경로 검증 필수).

---

## 2. Git 관리 및 변경 통제

- 임의 커밋/푸시 절대 금지: 모든 테스트 통과 후에도 자의적인 git commit/push 금지.
- 작업 트리 보존: 클린 상태를 만들기 위한 임의의 commit, reset, checkout, clean, stash 금지. 승인 전까지 미커밋 상태 유지.
- 절차: 감시관의 교차검증 완료 및 한국어 상세 보고 → 사용자의 승인 획득 → 작업자가 한국어 커밋 메시지로 커밋 실행. (감시관 검증이 사용자 승인보다 항상 선행한다.)
- 푸시 권한 및 주기 통제: 기능 슬라이스 단위의 잦은 푸시는 금지하며, 한 챕터(Step) 전체가 최종 완료된 시점에 사용자가 양쪽 저장소 내역을 직접 검토한 후 수동으로 일괄 푸시한다 (에이전트의 임의 push 전면 금지).
- 저장소 간 동기화 규칙: 보고·원칙 저장소(`ubiquitous-parakeet`)와 구현 저장소(`react-app`)의 작업 단계 및 커밋 상태는 각 기능 단위(Step/Sub-step)의 커밋·기록·승인 라운드가 끝날 때마다 상호 일치시켜야 한다. 라운드 진행 중 발생하는 일시적 시차(예: `react-app` 커밋 후 `ubiquitous-parakeet` 장부 기록·push 이전 구간)는 이 규칙 위반이 아니다.
- 기능 슬라이스(Sub-step) 단위 원자적 커밋 원칙:
  - 1줄 수정이나 백업 목적의 자잘한 중간 커밋은 양쪽 저장소 모두 전면 금지한다.
  - 하나의 독립적인 기능 단위(Step 또는 9-A, 슬라이스 B 등의 Sub-step) 구현이 완료되고, 브라우저 실검증 PASS 및 `docs/report.md` 실사가 완료된 시점에 해당 기능 단위당 딱 1회의 단일 커밋을 실행한다.

---

## 2-1. 데이터베이스(Supabase) 마이그레이션 및 SQL 실행 4단계 통제

- 사용자 직접 판단/수정 전면 금지:
  - 사용자에게 "컬럼 타입을 확인하고 맞추어 수정하라"거나 "알아서 편집 후 실행하라"는 식의 책임을 전가하는 행위를 전면 금지한다.
  - 모든 DB 변경(ALTER, CREATE, DROP, RENAME, RPC 함수 정의 등)은 반드시 아래 4단계를 순차적으로 거쳐야 한다.

- DB 보안 3대 절대 원칙 (Security Guardrails):
  1. [RLS(Row Level Security) 강제]: 테이블 생성/수정 시 `ENABLE ROW LEVEL SECURITY;` 및 허가된 권한(auth.uid() 기준 등)의 RLS 정책 작성을 누락해선 안 된다. (외부 익명 전체 공개 원천 차단)
  2. [파괴적 쿼리 전면 금지]: `DROP TABLE`, `TRUNCATE`, 조건 없는 대량 `DELETE` 쿼리 작성을 전면 금지한다. 컬럼/테이블 변경은 데이터 유실 없는 보존적(Additive) 마이그레이션만 허용한다.
  3. [안전한 RPC 함수 규격]: `SECURITY DEFINER` 함수 작성 시 반드시 `SET search_path = public`을 명시하여 권한 상승 취약점을 차단해야 한다.

- DB 마이그레이션 4단계 실행 절차:
  1. [1단계: 읽기 전용(SELECT) 진단 쿼리 선행 제공]
     - DDL/DML 실행 전, 스키마 상태(컬럼 데이터 타입, PK/FK 제약조건, 인덱스, 기존 RLS 정책)를 안전하게 조회하는 `SELECT` 쿼리를 작성하여 사용자에게 먼저 전달한다.
     - 사용자가 SQL Editor에서 조회한 결과 텍스트나 캡처를 회신할 때까지 마이그레이션 본 파일 실행 안내를 전면 차단한다.
  2. [2단계: 스키마 확정 및 멱등성(Idempotency) 검증]
     - 사용자가 회신한 실제 DB 스키마 결과를 바탕으로 타입을 확정한다 (추측/가정 기반 작성 금지).
     - 모든 SQL 스크립트는 `IF EXISTS` / `IF NOT EXISTS`, 트랜잭션 블록(`BEGIN ... COMMIT;`)을 포함해 여러 번 실행해도 안전한 멱등성을 갖추어야 한다.
  3. [3단계: 수정 불필요한 단일 확정 실행문 제공]
     - 사용자가 복사해서 붙여넣기만 하면 되는 완전한 형태의 SQL 스크립트를 제공한다 (플레이스홀더, 사용자 수정 필요 주석 포함 금지).
  4. [4단계: 사후 검증(Post-check) 쿼리 제공]
     - 마이그레이션 실행 후 반영 여부를 즉시 검증할 수 있는 `SELECT` 검증 쿼리와 기대 출력값을 함께 제공한다.

---

## 3. 파일 크기 및 모듈 분리 규격 (200줄 제한)

- 프로덕션 코드: 수정/생성된 모든 파일(컴포넌트, 훅, 스토어, 서비스, domain, 유틸 등)은 주석·빈 줄 포함 200줄 이하 엄수.
- 레거시 200줄 초과 파일 수정 선행 승인제:
  - 기존 200줄 초과 파일을 수정해야 할 경우, 임의로 코드를 수정하거나 기계적으로 분할하지 마라.
  - 코드 수정 착수 전 **'분리 설계안(책임 경계, 신규 모듈 구조, 의존성 흐름)'**을 작성하여 사용자에게 선행 보고하고 명시적 승인을 받은 후에만 작업을 진행하라.
- 테스트 파일 예외: 실패 매트릭스/회귀 검증을 위해 200줄 제한 예외 인정. 단, 공통 fixture/mock/builder는 테스트 헬퍼로 분리.
- 편법 금지: 다중 문장 한 줄 병합, 주석/검증/에러처리 임의 삭제, 무의미한 기계적 파일 분할 금지 (책임 및 도메인 경계 기준 분리).

---

## 4. 타입 안전성 (Strict Typecheck & 런타임 검증)

- 금지 사항:
  - any, unknown, Function, JSDoc * 사용 금지.
  - @ts-ignore, @ts-expect-error 사용 금지.
  - 타입 무력화 금지 (object 경유 이중 단언, 빈 인터페이스, 임의 래핑).
  - 도메인 타입 대신 object, {}, Array<object>, Record<string, object>로의 확장 금지.
  - 타입 오류 은폐용 거짓 .d.ts 선언 금지 (필요 시 런타임 값 파생 공유 typedef/정식 선언 파일 작성).
- 검증 요건:
  - 모든 변경/생성 프로덕션 파일은 // @ts-check 활성화 및 실제 typecheck 대상 포함 필수 (파일 제외를 통한 허위 0 errors 금지).
  - 함수 시그니처 변경 시 프로덕션 및 테스트 전체 호출부 수정.
  - 신규 테스트 코드로 인한 TypeScript 진단 추가 금지.
  - strict-inventory 진단 수는 정규식 error TS\d+: 시작 줄 기준으로 이전 기준선과 비교.
  - typecheck 미구성 시 build/lint로 대체 주장 금지 (“typecheck 명령 미구성”으로 명시 보고).
- 런타임 경계 검증 규칙:
  - localStorage·Supabase 등 외부 경계에서 들어온 값은 최상위가 객체인지 확인하는 것만으로 도메인 타입으로 단언하지 마라.
  - JSON 파싱 결과는 dateKey와 모든 중첩 value/field를 런타임에서 검증한 뒤에만 구체적인 도메인 타입으로 좁혀라.
  - typeof value === 'object' && !Array.isArray(value)만 확인하고 Record<string, DomainType>으로 단언하는 행위는 타입 검증 완료로 인정하지 않는다.
  - 런타임 검증기가 허용하는 스키마와 JSDoc/typedef가 선언하는 스키마는 정확히 일치해야 한다.

---

## 5. Atomic 로컬 트랜잭션 & 상태 보존

> 0-1절과의 관계: 아래에 적힌 durable / tombstone / fallback 등은 이미 도입된
> 계약의 검증 기준이다. 감사 FAIL을 이유로 동일·유사 레이어를 새로 만들거나
> 다른 도메인에 복제하려면 0-1절에 따라 사용자에게 먼저 묻고 승인을 받아야 한다.

- 원자적 검증 대상 (단일 논리 단위):
  도메인 localStorage | dirty journal | tombstone | durable journal | fallback/재시도 큐 | 메모리 Store | hydration 상태 | Store notify 횟수/시점 | debounce/sync 예약 | 원격 API 호출 | UI 성공/실패 상태
- 로컬 우선 persist 트랜잭션 7단계 순서:
  1. 모든 입력 검증 → 2. 모든 값 직렬화 → 3. 변경 대상 localStorage/journal 키 기존 값 백업 → 4. persist와 journal을 all-or-nothing 단일 쓰기로 반영 → 5. 성공 후 Store 변경 → 6. 완성된 Store 상태 notify 정확히 1회 → 7. sync 예약
- 원격 호출 전 실패 시 불변 보장:
  - 입력 검증/직렬화/로컬 persist/journal 실패 시: Store, localStorage, journal, tombstone, durable queue, notify(0회), sync 예약(0회) 모두 작업 전 상태 유지 및 원격 API 호출 0회. (도메인 persist만 성공하고 dirty journal 저장 실패하는 구조 불인정)
- 원격 호출 후 실패 및 Reconcile:
  - 원격 mutation은 readiness, 최신 session epoch, durable intent/tombstone, idempotency key 확보 후 실행.
  - 호출 후 실패 시 호출 횟수/부분 성공 상태를 정직하게 Assert하고, reconcile/멱등 재시도로 최종 수렴 검증.
- localStorage 5대 상태 엄격 분리 및 스키마 방어:
  1. 키 부재 / 2. 정상 빈 값 저장 / 3. getItem 예외 발생 / 4. JSON.parse 실패 / 5. 스키마 불일치
  - 읽기 실패를 빈 객체/기본값으로 간주하여 cleanup/덮어쓰기/큐 제거/callback 제거/journal 교체를 진행하는 행위 절대 금지.
  - 스키마 불일치 범위: 최상위 배열/null뿐 아니라 내부 dateKey의 patch가 배열, null, 문자열, 숫자, 빈 객체({})이거나 중첩 필드 타입이 잘못된 경우까지 포함한다.
  - durable owner 격리: durable owner의 항목 중 하나라도 스키마가 잘못됐다면 해당 owner를 정상 큐로 처리하지 말고 읽기 실패 상태로 취급하라.
  - 원문 보존: 스키마가 잘못된 durable 원문은 보존해야 하며 Store 변경, cleanup, tombstone 기록, notify, sync 예약, 원격 호출을 진행하면 안 된다.
- Durable Journal Cleanup 방어:
  - 최신 Effective Patch 커밋 후 이전 durable journal cleanup 실패 시 최신 patch를 큐에서 삭제 금지.
  - cleanup의 읽기/쓰기 실패 시 callback, fallback, 최신 patch 유지 (오래된 durable 값이 최신 값을 덮어쓰는 데이터 퇴행 절대 불허).

---

## 6. 전체 호출 경로 추적 & 실행 방어

- 추적 경로: 사용자 클릭 → React 이벤트 핸들러 → setState → localStorage/Store persist → dirty journal/tombstone/durable queue → 원격 API → 성공/실패 토스트 → hydrate/retry → 최종 상태
- Readiness 선검증 필수: 로그인 사용자의 원격 mutation은 readiness 검사 완료 전에 setState, Store/localStorage 변경, 성공 토스트, 모달 닫기, journal/tombstone/intent 제거를 실행하면 안 됨.
- 로컬 우선 작업: 로컬 변경보다 durable mutation intent/tombstone 저장이 선행되어야 하며, 서버 실패 시 의도가 새로고침/hydrate 이후에도 남아 자동 재시도되어야 함.

---

## 7. 실패 주입 매트릭스 (Failure Injection Matrix)

> 각 쓰기 액션의 호출 경로 내 실패 지점을 목록화하고 강제 주입하여 테스트하라. (경로상 없는 항목은 코드 근거와 함께 N/A 명시)

- 필수 실패 지점:
  1. JSON.stringify 실패
  2. localStorage.getItem 실패
  3. 기존 localStorage JSON.parse 실패
  4. 첫 번째 localStorage.setItem 실패
  5. 중간 localStorage.setItem 실패
  6. dirty journal 저장 실패
  7. durable journal 등록 전 기존 값 읽기 실패
  8. durable journal cleanup 전 기존 값 읽기 실패
  9. durable journal 등록 쓰기 실패
  10. durable journal 삭제/cleanup 쓰기 실패
  11. localStorage.length 또는 localStorage.key()를 통한 durable owner 열거 실패
  12. JSON 문법은 정상이지만 최상위 또는 내부 patch 스키마가 잘못된 durable 데이터
  13. Supabase API throw
  14. Supabase { data: null, error: ... } 응답
  15. hydrate 도중 로그아웃
  16. hydrate 도중 owner 변경
  17. sync 실행 중 추가 로컬 변경 발생
  18. 직접 mutation 실행 직전 hydration이 failed 또는 hydrating으로 변경
- 세부 회귀 검증 시나리오:
  - 기존 정상 일지가 있는 상태에서 durable patch가 [], null, 문자열, 숫자, {}, 잘못된 callDetails/fixedRouteCounts인 경우 기존 일지가 삭제되지 않는지 검증.
  - owner 열거 실패 시 retry/beforeunload가 예외를 누출하지 않고 보수적으로 차단하는지 검증.
- 실패 단계 필수 Assert:
  - Store 및 모든 관련 localStorage 키의 작업 전 값 유지 여부
  - dirty journal / tombstone / durable queue의 정합성
  - notify 호출 횟수 (0회 또는 명세값) 및 sync 예약 횟수 (0회 또는 명세값)
  - 원격 API 호출 횟수 (원격 호출 전 실패: 0회 / 원격 호출 후 실패: 실제 예상 횟수)
  - hydration status, 성공 토스트 미표시, 실패 UI 정상 표시
  - 최신 Effective Patch 보존 및 과거 durable 값의 덮어쓰기 방지
- 단계 분리 원칙:
  - 실패 단계 Assert 완료 전 shouldFail=false 등으로 에러 임의 해제 금지.
  - 명시적 "복구 및 재시도 단계"에서 에러 해제 후 최신 상태 유지, 덮어쓰기 방지, pending count, callback 횟수, queue/journal 정리, 최종 서버 수렴을 검증.

---

## 8. 직접 Mutation 필수 회귀 시나리오

- Hydration Failed 상태:
  - 차량 삭제 / 거래처 삭제 / 기사 상태변경 및 삭제 시도 → Store 유지, localStorage 유지, 서버 호출 0회, 성공 토스트 미표시.
- Ready 상태 서버 삭제 실패: 로컬 롤백 또는 durable tombstone 유지.
- 실패 후 새로고침 & Hydrate: 사용자가 삭제한 항목 부활 금지.
- Retry 성공 후 동일 액션 재실행: 로컬과 서버가 동일 최종 상태로 수렴.

---

## 9. 비동기 세대 & 세션 무효화 (Generation & Epoch)

- 시작 시 캡처: 모든 async 작업 시작 시 userId, ownerKey, session epoch, 요청 generation/식별자 캡처 (순수 UI 표시용 비동기 작업은 제외 근거 명시).
- 3대 검증 시점: 원격 await 직후, 로컬 상태 변경 직전, 최종 commit 직전에 다음 검증:
  - 동일 userId | 동일 ownerKey | 동일 session epoch | 미로그아웃 | 최신 요청 여부
- 불일치 시 조치: 불일치 발생 시 localStorage, Store, hydration status, journal, tombstone, durable/retry queue, UI 상태 일체 변경 금지 및 결과 즉시 폐기.
- 로그아웃 검증: 로그아웃 직후 지연된 hydrate가 완료되어도 status는 idle이어야 하며 이전 계정 데이터가 저장소에 반영되지 않아야 함.

---

## 10. 테스트 품질 및 결함 검출력 증명

- 기존 코드/테스트 보존: 유효한 코드/테스트 임의 삭제·축약 금지. 부실한 테스트는 실제 API 응답 형태({ data: null, error } 등)를 반영해 보강.
- 테스트 격리: 실행 순서 및 이전 mock/스토리지 의존 금지. 개별 fixture 사용 및 종료 시 timer/listener/mock/storage 완벽 cleanup.
- UI 및 상태 직접 검출력:
  - 테스트 작성 시 내부 private 변수나 Map을 직접 조작하지 말고 실제 UI 호출 경로를 통해 실행하며, 테스트 이름이 주장하는 Store/localStorage/journal/API/UI 상태를 Assert가 직접 검사해야 한다.
  - 실제 UI 호출부 안전성을 순수 함수 테스트만으로 완료 주장하지 마라. React 이벤트 핸들러부터 최종 상태까지의 컴포넌트 또는 통합 테스트를 유지하라.
- Revert-and-confirm-fail (테스트 진실성 검증): 
  - 새로 작성한 테스트가 유효한지 증명하기 위해, 관련 버그 수정 코드를 임시로 되돌렸을 때 테스트가 실제로 FAIL하는지 확인하고, 실제 CLI에서 실행된 테스트 FAIL 전체 원문 로그(종료 코드, 실패한 Assert 라인, 실행 시간 포함)를 마크다운 코드 블록으로 보고서에 반드시 첨부하라 (가상 시뮬레이션/임의 요약 작성 절대 금지).
- Clean Run 필수 및 console spy 제약:
  - React act(...) 경고 0건, unhandled rejection 0건, 비동기 누출 0건, 미예상 console.error 0건, open timer/listener 0건.
  - 예상 console.error를 spy로 캡처할 때 React act 경고나 다른 예상하지 않은 오류까지 숨기면 안 된다. 예상 메시지만 정확히 Assert하고 나머지는 원래 console.error로 전달하거나 테스트를 실패시켜라 (전역 억제/문자열 필터링 금지).

---

## 11. 커밋 전 Red-Team 교차검증 (15대 체크리스트)

> 아래 질문에 대해 코드 위치와 테스트 이름을 명시하여 답할 수 있어야 한다.

1. 이 액션에서 가장 먼저 변경되는 상태는 무엇인가?
2. readiness 검사는 그 변경보다 선행하는가?
3. persist 성공 후 journal 저장이 실패하면 어떻게 처리되는가?
4. durable journal 읽기 실패 시 빈 큐로 오인하지 않는가?
5. cleanup 읽기/쓰기 실패 시 최신 Effective Patch가 안전하게 보존되는가?
6. Store 변경 후 notify 중 예외 발생 시 어떻게 되는가?
7. 원격 호출 부분 성공 후 실패 시 재시도 로직이 멱등적인가?
8. 로그아웃·계정 전환·새로고침 후에도 작업 의도가 보존되는가?
9. 서버에만 남은 삭제 대상이 다음 hydrate 시 부활할 가능성이 있는가?
10. stale durable 값이 최신 Store 값을 덮어쓸 가능성이 있는가?
11. pending count가 owner/date 논리 키 기준으로 정확히 계산되는가?
12. 현재 남아있는 "사용자 승인된 의도적 제외 항목(Explicit Out-of-Scope)" 외에 요구사항을 위반하는 미완료 결함이 없는가?
13. 신규 테스트로 인해 strict-inventory 진단 수가 증가하지 않았는가?
14. 모든 수정/생성 프로덕션 파일이 실제 typecheck 대상에 포함되어 있는가?
15. [DB 변경 작업 시에만 필수] DB 스키마/마이그레이션 작업 시 읽기 전용 진단 쿼리를 통해 실제 타입을 확정하고 멱등한 실행문을 제공했는가? (Non-DB 작업 시 생략)

---

## 12. 최종 한국어 보고 형식 (Single File-based Reporting)

> 모든 상세 실사 보고서는 `docs/report.md` 파일에 기록하여 인수인계하며, 새 Step 착수 시 파일은 새로 리셋된다. 대화창에는 긴 내용을 복붙하지 않고 실검증 가이드와 핵심만 출력한다. 작업자와 감시관의 모든 보고는 `docs/report.md` 파일 하나로 소통한다.

### 1. `docs/report.md` 작성 및 실사 절차

0. **[감시관 착수지시서 제출]**: 감시관은 작업자에게 Step/Sub-step 착수를 공식 지시하기 **전에**, 착수지시서를 `docs/report.md`에 먼저 기록한 뒤 작업자에게 전달한다. (§00-2 착수지시서 기록 조항, §0-1-C 4대 기준 선행 보고와 연동) 착수지시서에는 다음을 포함한다:
   - 작업 범위: Step/Sub-step 식별자, 대상 파일
   - 목적 및 기대 결과
   - 건드릴 파일 / 건드리지 않을 파일
   - 실패 시 처리 방식 (단순 토스트 vs 기존 계약 재사용, 신규 레이어 없음 명시)
   - 사용자 승인 근거 (승인 일자·승인 내용 요약)

1. **[작업자 제출]**: 작업자(CLI)는 코드 수정 및 테스트를 완료한 직후, `docs/report.md`파일에 아래 항목을 기록한다:
   - 변경 파일 목록 및 실제 줄 수 (200줄 검사 결과)
   - 실행 명령 결과 원문 (npm test, typecheck, lint, build 등 로그 원문)
   - strict-inventory 지표 증감치 및 실패 주입/상태 검증 결과
   - Revert-and-confirm-fail 테스트 FAIL 터미널 원문 로그

2. [감시관 교차 실사 및 판정 추가]: 감시관은 로컬 코드와 작업자의 보고서를 실사한 뒤, `docs/report.md` 파일에 아래 내용을 누락 없이 한 번에 작성한다.

 0. 감시관 실사 판정 헤더 (Audit Verdict):
   - 최종 판정: `[PASS]` (FAIL 시 적발 내역 및 CLI 즉시 수정 지시문 명시)
   - 5대 직접 검증 체크 결과 (미승인 커밋/푸시 0건, 신규 방어 레이어 0건, 200줄 초과 및 타입 무력화 0건, 테스트 임의 훼손 0건, 데이터 무결성 계약 일치 여부)
 1. 변경 파일 목록 및 실제 줄 수 (200줄 초과 여부 및 레거시 사전 승인 여부 명시)
 2. 실행 명령 및 결과 (각 명령의 종료 코드와 실제 결과):
   - `npm test`
   - `typecheck`
   - `strict-inventory`
   - `build`
   - `lint`
   - `git diff --check`
   - 변경·신규 프로덕션 파일 200줄 검사
   - any/unknown/Function/@ts-ignore/@ts-expect-error 및 타입 우회 스캔
   - NUL 바이트 검사
   - 테스트 출력의 act 경고, unhandled rejection, 예상하지 않은 console.error 검사
   - [도구 실행 에러 방어]: 도구 실행 중 크래시, 메모리 오류, 명령어 부재 등이 발생할 경우 절대 통과로 간주하지 말고 `[CRASH]` 태그와 에러 로그를 보고하고 작업을 중단하라.
 3. strict-inventory 지표: 전체 / 프로덕션 / 테스트·지원 진단 수치 및 기준선 대비 증감 (`error TS\d+:` 기준)
 4. 실패 주입 매트릭스 실행 결과: 각 실패 지점별 Assert 결과
 5. 상태 검증 상세: Store, localStorage, journal, tombstone, durable queue 검증 결과
 6. 호출 횟수 검증: notify, sync 예약, API 실제 호출 횟수
 7. Cleanup 실패 방어 검증: 읽기/쓰기 실패 시 최신 patch 보존 여부
 8. [DB 변경 작업 시에만 필수] DB 마이그레이션 검증 내역 (Non-DB 작업 시 생략):
   - 1단계 사전 진단 SELECT 쿼리 및 사용자 회신 결과
   - 2~3단계 확정된 멱등 SQL 스크립트
   - 4단계 사후 검증 SELECT 결과
 9. Revert-and-confirm-fail 검증 결과: 버그 롤백 시 CLI에서 실행된 테스트 FAIL 전체 원문 로그를 마크다운 코드 블록으로 첨부
 10. 사용자 승인된 의도적 제외 항목 (Explicit Out-of-Scope) 목록 (없을 경우 "없음" 명시)
 11. 상태 확인: 승인 전 commit/push 미실행 확인, 미커밋 작업 트리 보존 확인, `docs/audit.md`의 `[~]` 유지 확인
 12. Red-Team 15대 교차검증 상세 응답: 11절의 질문 전체에 대해 관련 코드 위치(파일명:줄번호)와 검증 테스트 함수명을 매핑하여 구체적 서술 (Non-DB 작업 시 15번 생략).
 13. 브라우저 검증 내역: 실제 브라우저/DOM 검증 항목 및 미검증 항목 명확히 구분 보고.

### 2. 사용자 대화창 출력 규격 (간결한 4단계 브리핑)
감시관은 `docs/report.md` 작성을 마친 뒤, 대화창에 아래 내용만 간결하게 출력하고 대기한다.

1. 보고서 작성 알림: "`docs/report.md`에 통합 실사 감사 보고서 작성을 완료했습니다."
2. 비개발자 눈높이 요약: 이번 작업으로 무엇이 바뀌었고 어떤 안전장치가 검증되었는지 2~3줄 요약.
3. 사용자 `npm run dev` 실검증 가이드 및 커밋 제안:
   - 확인해야 할 정확한 화면 위치 (URL 경로 및 UI 컴포넌트)
   - 사용자가 직접 수행해야 할 조작 순서 (예: 특정 버튼 클릭 후 새로고침)
   - 정상 동작 시 기대되는 시각적 결과 (UI 변화, 토스트 메시지 노출 여부 등)
   - 실검증 PASS 시 실행할 단일 Step 완료 커밋 메시지 초안 제시
4. 차기 작업 진행 계획 브리핑:
   - 현재 작업 커밋 후 즉시 이어질 다음 슬라이스/Step의 작업 내용과 목표를 1~2줄로 명확히 예고.
