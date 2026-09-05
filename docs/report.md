# docs/report.md — 회원탈퇴 기능 구현 (필수)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12). Step 10 5차(고객센터)
> 전체 `[x]` 완료. 이번은 "고객센터"와 별개지만 보리가 필수 기능으로 지정한 회원탈퇴 —
> DB 진단 완료(`delete_own_account` RPC 이미 라이브 확인, `docs/archive/audit.md`
> "Step 10 5차 DB 진단 완료" 참고).

---

## 1. 착수지시서

### 1-A. 배경
react-app엔 회원탈퇴 기능이 전혀 없다. 원본(`mypage.js` `requestWithdrawal`/
`executeAccountWithdrawal`)은: 2단계 확인(경고 → 최종 확인) → `delete_own_account`
RPC(서버가 계정+연결된 모든 데이터를 cascade 삭제) → **성공 확인 후에만** 로그아웃+로컬
정리 → 첫 화면으로. **서버 삭제가 실패하면 로컬은 절대 안 건드린다**(사용자가 데이터를
잃어버리는 최악 상황 방지) — 이 순서가 핵심.

### 1-B. 설계 — 신규 저장소 없음(§7), 기존 함수 재사용
- **RPC만 새로 호출**: `supabase.rpc('delete_own_account')` — 이미 라이브에 있는 함수,
  DB 작업 없음.
- **성공 후 처리는 새로 만들지 않는다** — `App.jsx`의 `handleLogout({ signOut: true })`
  (`onGoAuth` prop으로 이미 라우트까지 내려와 있음, `PersonalInfoPage.jsx`가 로그아웃
  버튼에 이미 씀)를 **그대로 재사용**한다. 이 함수가 이미 `flushCloudSync`→
  `supabase.auth.signOut()`→`endCloudSession()`→`clearGuestModePersisted()`→세션 null→
  `/auth` 이동을 다 한다 — 탈퇴 성공 시에도 이 동일한 함수를 부르면 된다(별도 정리
  로직 새로 안 짬).
- **확인 모달**: 이미 있는 `ConfirmModal.jsx`(title/message/onCancel/onConfirm)를
  **2번 순차로** 쓴다(원본의 setTimeout 트릭은 React state로 충분히 대체 가능 —
  `withdrawStep: null|'first'|'second'` 같은 state 하나로 어느 모달을 보여줄지 결정).
  1단계 "정말 탈퇴하시겠습니까? 모든 운행 기록, 거래처, 정산 데이터가 영구적으로
  삭제되며 복구할 수 없습니다." → 확인하면 2단계 "이 작업은 취소할 수 없습니다. 한 번
  더 확인해 주세요" → 확인하면 RPC 호출.
- **게스트는 버튼 자체가 안 보인다**(탈퇴할 계정이 없음 — 로그인 세션에서만 노출).

### 1-C. 파일
| 파일 | 내용 |
|---|---|
| `src/lib/accountWithdrawal.js` (신규) | `requestAccountWithdrawal()` — RPC 호출 + 성공/실패만 반환(`{ ok, toast }`), 세션 정리·네비게이션은 안 함(그건 호출부가 `onGoAuth`로). |
| `src/components/PersonalInfoPage.jsx` | "04 계정" 섹션에 회원탈퇴 버튼(로그인 세션에서만) + 2단계 `ConfirmModal` state + 최종 확인 시 `requestAccountWithdrawal()` 호출 → 성공하면 성공 토스트 + `onGoAuth?.()` 호출 → 실패하면 실패 토스트만(세션·화면 그대로 유지). |
| 신규 테스트 | `accountWithdrawal.test.js`: RPC 성공/실패 케이스(가짜 supabase). `PersonalInfoPage.test.js`(신규): 게스트 세션엔 탈퇴 버튼 없음 / 로그인 세션엔 버튼 있음 → 클릭 시 1단계 모달 → 확인 시 2단계 모달 → 최종 확인 시 RPC 호출되고 성공하면 `onGoAuth` 호출됨(mock으로 확인) / RPC 실패 시 `onGoAuth` 호출 안 됨(세션 안 건드림 확인). |

### 1-D. 건드리지 않을 것
- `App.jsx`의 `handleLogout`/`onGoAuth` — 무변경, 그대로 호출만.
- `ConfirmModal.jsx` — 무변경(기존 그대로 2번 씀).
- DB(`delete_own_account` RPC 자체) — 무변경, 이미 라이브.
- 로그아웃 버튼·다른 계정 섹션 — 무변경.

### 1-E. 실패 처리 (§7)
RPC 실패 시 로컬/세션 절대 안 건드림(원본과 동일한 안전장치) — 신규 재시도 큐 없음,
실패하면 토스트만 보고 사용자가 다시 시도.

### 1-F. 작업자 전달문
> AGENTS.md §1 준수. `.md` 수정 금지. DB 변경 없음(기존 RPC 호출만). 범위 = 위 표의
> 파일들(3개).
> **핵심 순서**: RPC 성공 확인 **후에만** `onGoAuth?.()` 호출(로그아웃+세션정리+이동).
> RPC 실패하면 절대 `onGoAuth`를 부르지 말고 토스트만 — 로컬 데이터가 멀쩡한 채로
> 남아있어야 한다. 새 로그아웃/정리 로직을 만들지 말고 기존 `onGoAuth`(=
> `App.jsx handleLogout`) 그대로 재사용. 게스트 세션엔 탈퇴 버튼 자체가 안 보인다.
> `npm run typecheck` + `npm test` 통과 → 커밋 1개 → push 안 함(보리). 줄수·테스트 개수는
> 실제 실행 결과 그대로 정확히 보고(`wc -l`).

## 2. 착수 전 상태 (2026-09-05)
- `react-app` HEAD `253198d` = origin/main (Step 10 5-3, CI 초록·보리 `[x]`). 미커밋 없음.
- `ubiquitous-parakeet`: 문서 갱신분 미커밋.
- DB 진단 완료(위 배경 참고) — `delete_own_account` RPC 존재 확인됨, 스키마 변경 없음.

## 3. 작업자 구현 완료 보고

## 4. 감시관 실사
