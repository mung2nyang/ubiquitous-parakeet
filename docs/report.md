# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(아코디언 인라인 시트 애니메이션 1~6차 `[x]`, 부가세
> 레이블 크기 `[x]`, 거래처 스코프 종결 `[x]`) 상세는
> `docs/archive/accordion-inline-sheet-and-misc-2026-09-11.md`로 옮김(동결).
> F-1(`[x]`, react-app `8ced672`) 상세는
> `docs/archive/f1-vat-label-font-weight-2026-09-14.md`로 옮김(동결).
> F-2(`[x]`, react-app `ed83703`) 상세는
> `docs/archive/f2-autofill-dark-mode-2026-09-14.md`로 옮김(동결).
> D-0~D-3(`[x]` 전체, react-app `e65b2c0`/`b14fcd8`/`c395ab3`/`93a4f2c`)
> 상세는 `docs/archive/d0-`~`d3-` 동일 접두 파일로 옮김(동결).
> E-1(`[x]`, react-app `9e6f93d`) 상세는
> `docs/archive/e1-expense-form-shared-style-2026-09-14.md`로 옮김(동결).
> F-3(`[x]`, react-app `83de8e9`) 상세는
> `docs/archive/f3-call-detail-icons-star-2026-09-14.md`로 옮김(동결).
> 디자인 토큰 통합(`[x]`, react-app `ef82306`) 상세는
> `docs/archive/design-tokens-consolidation-2026-09-14.md`로 옮김(동결).
> §2-1-A(`[x]` 전체 — 라벨칩/정산정보 복원 + 칩 조건 버그 수정,
> react-app `8641be3`/`032e807`/`15bfc43`) 상세는
> `docs/archive/2-1-a-car-card-label-chips-2026-09-14.md`로 옮김(동결).
> §2-1-B(`[x]` 전체 — 수정/삭제 아이콘 공용화 5곳 + 일일운행 세로쌓임
> 버그 수정, react-app `489e9fd`/`a0f6d6a`) 상세는
> `docs/archive/2-1-b-card-action-icons-2026-09-14.md`로 옮김(동결).
> §2-1-C(`[x]` — 차량관리 전용 CSS 분리, react-app `2e1fcac`) 상세는
> `docs/archive/2-1-c-car-management-css-split-2026-09-14.md`로
> 옮김(동결).

---

## 기사 정보 "운행일지"↔"기사연동" 전환 버그 `[~]`

### 1차 (`f4de520`) — log 유지 수정 시 초대 스킵

`skipInvite = connectMode === 'log'` (신규·수정 공통).

### 2차 후속 (`bc25009`) — link→log 전환 시 연동 해제

**원인**: 배지/모달은 `drivers` 존재 여부로만 판정. log로 바꿔 저장해도
기존 연결 레코드를 지우는 호출이 차량 폼에 없었음.

**구현 정정(§9)**: 신규 DELETE/마이그레이션 불필요 —
`requestDriverDeletion` → `deleteDriverLinkOnSupabase`가 이미
기사연동관리 삭제·`directMutationActions.test.js`로 존재. 차량 폼에서
그 경로를 재사용.

**동작**:
1. 수정에서 "기사 연동"→"운행 일지" 저장 → ConfirmModal
   ("이 차량의 기사 연동을 해제하시겠습니까? …").
2. 확인 → `requestDriverDeletion` 후 차량 저장 + skipInvite.
3. 취소 → 저장 안 함, 수정 모달 유지.

건드릴 파일: `CarListPage.jsx`만(231줄, §6 응집·화면 오케스트레이션
주석). `npm test` 통과.

### 검증 — AI 브라우저 실검증(2026-09-14, 보리 요청으로 대행)

테스트 차량 `77가7777` 새로 등록해 4가지 경로 전부 직접 클릭·확인:

1. 기사연동 신규 등록 → 저장 → 배지 「기사연동」 정상.
2. 수정 → 「운행 일지」로 전환 → 저장 → 경고 팝업 **"이 차량의 기사
   연동을 해제하시겠습니까? 해제하면 되돌릴 수 없습니다."** 노출 →
   **취소** → 모달 닫고 목록 확인 → 배지 **「기사연동」 그대로 유지**
   (회귀 없음).
3. 같은 차량 다시 수정 → 「운행 일지」 전환 → 저장 → 경고 팝업
   **확인** → 토스트 "차량을 수정했습니다." → 배지 **「운행일지」로
   전환**. 다시 수정 모달을 열어 "기사 연동"이 아니라 "운행 일지"가
   선택돼 있는 것까지 재확인(연결 레코드가 실제로 삭제됐음 — 단순
   화면 재렌더 아님).
4. 같은 차량을 다시 「기사 연동」으로 전환(신규 초대코드 자동생성) →
   저장 → 배지 **「기사연동」으로 재연결** 정상.
5. 기존 차량 회귀: `11가1111`(기사연동)·`22가2222`(1차 수정으로
   이미 운행일지 전환된 것) 둘 다 이번 검증 동안 영향 없음.

콘솔에 이번 조작으로 인한 새 에러 없음(기존에 떠 있던
`[requestVehicleDeletion]` 에러 1건은 이전 세션 테스트 잔여, 이번
검증과 무관).

**결론: 브라우저 동작 5개 전부 통과.** 단, push 후 CI 확인 결과
**"CI"(typecheck) 워크플로우 실패** — 아래 3차로 이어짐. `[x]` 보류.
(ahead: `f4de520`+`bc25009`)

### 3차 — CI 타입체크 실패 수정 (`dd54ca3`)

**원인**: `commitLocalOnly`가 `DomainValue` 유니언만 반환 →
`del.drivers.some` 타입 에러.

**구현**:
1. `outboxCommit.js` — `@template {DomainValue} T`로 `value: T` /
   반환 `value: T|undefined`.
2. `directMutationActions.js` — `requestDriverDeletion`에 `@returns`
   + `failed || value === undefined`로 좁힘.

`CarListPage.jsx` 무변경. 로컬 `npm run typecheck`·`npm test` 통과.
런타임 동작 변경 없음.

**CI 재확인(2026-09-14, `gh run view` 직접 열람)**: "verify" 잡의
3단계(테스트·타입검사·빌드) 전부 초록 — 겉으로만 초록이 아니라 실제로
세 단계 다 통과한 것 확인함.

**단, 검증 중 발견**: `commitLocalOnly` 호출부가 이 저장소에 4곳인데
이번엔 `requestDriverDeletion` 1곳만 근본 수정. 나머지
`requestClientDeletion`·`requestDriverStatusChange`
(둘 다 `directMutationActions.js`)·`requestDriverInviteSave`
(`requestDriverInviteSave.js:58`, 타입 단언 포함)는 같은 패턴 잔존 —
지금은 아무도 그 반환값에 배열 메서드를 안 써서 CI가 안 잡을 뿐.
**보리 결정(2026-09-14): 지금 안 고침, `STATUS.md` 후속 nit로만 기록.**

**보리 결정(2026-09-14): 위 CI 확인에도 불구하고 최종 `[x]` 승인은
보류.** 이유 미상 — 다음 세션에서 직접 확인 예정으로 보임. 이 슬라이스
전체(1~3차) `[~]` 유지, archive 안 함.

### §5 리뷰 (CI 초록 후 확정)

| # | 결과 |
|---|---|
| 1 범위 | `CarListPage.jsx`만, 기존 삭제 API 재사용 |
| 2 몰래 증설 | 신규 큐/마이그레이션 없음 |
| 3 타입 꼼수 | 없음 |
| 4 200줄 | 231줄 — 응집 유지(주석), 분리설계 불필요(~250) |
| 5 테스트 | 기존 삭제 테스트 유지, 약화 없음 |
| 7 요구사항 | 양쪽 전환 경로 구현 |

---

## 다음 슬라이스 (착수 전 대기)

**§9 기사연동관리 전체 대조** — `docs/ui-comparison-report.md` §9.
착수지시서 별도 작성 필요.

**E의 나머지 항목** / **E 착수 전 P0** (`setTimeout(420)` vs `0.4s`) —
이전과 동일.

**후속(비긴급)**: `--icon-color` 죽은 변수, 하드코딩 hex 중복.
