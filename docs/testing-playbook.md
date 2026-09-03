# 테스트·데이터 무결성 플레이북 (참고서)

> 원본 `AGENTS.md` §5~§11을 그대로 옮긴 것이다. **매 슬라이스 필수가 아니라**,
> 아래에 해당하는 작업을 할 때 착수 전에 읽는 참고서다:
> - localStorage / Store / durable journal / tombstone / 재시도 큐가 걸린 저장 경로
> - Supabase 원격 mutation(저장·삭제·상태변경)과 그 실패·재시도 처리
> - hydrate / 세션 전환 / 로그아웃 중 경합
>
> 순수 UI·표시·계산만 바꾸는 작업은 이 문서 대상이 아니다.
> "필수"로 승격할지 "참고"로 둘지는 `AGENTS.md` 축약 확정 시 사용자가 정한다.

---

## 1. Atomic 로컬 트랜잭션 & 상태 보존 (원본 §5)

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

## 2. 전체 호출 경로 추적 & 실행 방어 (원본 §6)

- 추적 경로: 사용자 클릭 → React 이벤트 핸들러 → setState → localStorage/Store persist → dirty journal/tombstone/durable queue → 원격 API → 성공/실패 토스트 → hydrate/retry → 최종 상태
- Readiness 선검증 필수: 로그인 사용자의 원격 mutation은 readiness 검사 완료 전에 setState, Store/localStorage 변경, 성공 토스트, 모달 닫기, journal/tombstone/intent 제거를 실행하면 안 됨.
- 로컬 우선 작업: 로컬 변경보다 durable mutation intent/tombstone 저장이 선행되어야 하며, 서버 실패 시 의도가 새로고침/hydrate 이후에도 남아 자동 재시도되어야 함.

## 3. 실패 주입 매트릭스 (원본 §7)

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

## 4. 직접 Mutation 필수 회귀 시나리오 (원본 §8)

- Hydration Failed 상태:
  - 차량 삭제 / 거래처 삭제 / 기사 상태변경 및 삭제 시도 → Store 유지, localStorage 유지, 서버 호출 0회, 성공 토스트 미표시.
- Ready 상태 서버 삭제 실패: 로컬 롤백 또는 durable tombstone 유지.
- 실패 후 새로고침 & Hydrate: 사용자가 삭제한 항목 부활 금지.
- Retry 성공 후 동일 액션 재실행: 로컬과 서버가 동일 최종 상태로 수렴.

## 5. 비동기 세대 & 세션 무효화 (Generation & Epoch, 원본 §9)

- 시작 시 캡처: 모든 async 작업 시작 시 userId, ownerKey, session epoch, 요청 generation/식별자 캡처 (순수 UI 표시용 비동기 작업은 제외 근거 명시).
- 3대 검증 시점: 원격 await 직후, 로컬 상태 변경 직전, 최종 commit 직전에 다음 검증:
  - 동일 userId | 동일 ownerKey | 동일 session epoch | 미로그아웃 | 최신 요청 여부
- 불일치 시 조치: 불일치 발생 시 localStorage, Store, hydration status, journal, tombstone, durable/retry queue, UI 상태 일체 변경 금지 및 결과 즉시 폐기.
- 로그아웃 검증: 로그아웃 직후 지연된 hydrate가 완료되어도 status는 idle이어야 하며 이전 계정 데이터가 저장소에 반영되지 않아야 함.

## 6. 테스트 품질 및 결함 검출력 증명 (원본 §10)

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

## 7. 커밋 전 Red-Team 교차검증 (15대 체크리스트, 원본 §11)

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
15. [DB 변경 작업 시에만] DB 스키마/마이그레이션 작업 시 읽기 전용 진단 쿼리를 통해 실제 타입을 확정하고 멱등한 실행문을 제공했는가?

## 8. 타입 안전성 상세 (원본 §4 검증 요건)

- 모든 변경/생성 프로덕션 파일은 `// @ts-check` 활성화 및 실제 typecheck 대상 포함 필수 (파일 제외를 통한 허위 0 errors 금지).
- 함수 시그니처 변경 시 프로덕션 및 테스트 전체 호출부 수정.
- 신규 테스트 코드로 인한 TypeScript 진단 추가 금지.
- strict-inventory 진단 수는 정규식 `error TS\d+:` 시작 줄 기준으로 이전 기준선과 비교.
- 런타임 경계 검증: JSON 파싱 결과는 dateKey와 모든 중첩 value/field를 런타임에서 검증한 뒤에만 도메인 타입으로 좁혀라. `typeof value === 'object' && !Array.isArray(value)`만 확인하고 `Record<string, DomainType>`로 단언하는 것은 검증 완료로 인정 안 함. 런타임 검증기 스키마와 JSDoc/typedef 스키마는 정확히 일치해야 한다.
