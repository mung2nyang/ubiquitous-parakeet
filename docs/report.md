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

### 3차 착수지시서 — CI 타입체크 실패 수정 (`[ ]` 착수 전)

**보리 지시(2026-09-14)**: 코드는 건드리지 말고 착수지시서만 작성.

`gh run list`로 확인(2026-09-14) — `bc25009` push 후 "CI" 워크플로우
`failure`(`Deploy GitHub Pages`는 success, "CI"만 실패). 실패 로그:

```
src/components/cars/CarListPage.jsx(137,9): error TS18048: 'del.drivers' is possibly 'undefined'.
src/components/cars/CarListPage.jsx(137,21): error TS2339: Property 'some' does not exist on type
  'CarLike[] | ClientLike[] | DriverRecord[] | ExpenseItem[] | InvoiceLike[] | string[] |
  DriverRecord[] | FinanceSettings | LocalProfile | Record<...> | WorkDataTombstones'.
  Property 'some' does not exist on type 'FinanceSettings'.
src/components/cars/CarListPage.jsx(137,27): error TS7006: Parameter 'd' implicitly has an 'any' type.
src/components/cars/CarListPage.jsx(143,22): error TS2345: Type '... | undefined' is not
  assignable to parameter of type 'DriverRecord[]'.
```

**원인(코드 직접 확인)**: `outboxCommit.js`의 `commitLocalOnly({ domain, value,
... })`가 `value`를 **모든 도메인을 아우르는 유니언 타입** `DomainValue`(`app-store.js`
정의 — cars/clients/drivers/expenses/... 전부 합친 타입)로만 받고 그대로
돌려준다. 제네릭이 없어서, 호출부가 실제로 `DriverRecord[]`를 넘겨도 반환값의
`value`는 항상 넓은 `DomainValue` 유니언으로 추론된다.

`directMutationActions.js`의 `requestDriverDeletion`이 이 값을 그대로
`drivers` 필드로 돌려주는데, 이 함수에도 명시적 `@returns` 타입이 없어
호출부가 그 넓은 유니언을 그대로 받는다. 지금까지는 아무도 그 반환값에
배열 메서드를 체이닝하지 않아 드러나지 않았던 타입 구멍인데,
`CarListPage.jsx`의 새 `confirmDisconnect()`가 처음으로
`del.drivers.some(...)`를 호출하면서(137번 줄) CI에서 드러남.

**런타임 동작은 이미 브라우저로 확인 완료(위 §"AI 브라우저 실검증" 참고) —
순수 타입 수정만 필요, 동작 자체는 안 바꾼다.**

#### 기대 동작

`npm run typecheck` 통과. `del.drivers`가 `Array<DriverRecord>`로 좁혀져서
137·143번 줄의 `.some()`/`requestVehicleSave` 인자 전달이 타입 에러 없이
통과해야 한다.

#### 조사 필요(구현 세션에서 방향 결정)

두 방향 중 하나(또는 검토 후 더 적합한 쪽):

1. **근본 수정(권장)** — `outboxCommit.js`의 `commitLocalOnly`에
   `@template T` 제네릭을 추가해 `value: T` / 반환 `value: T|undefined`로
   좁힌다. `commitLocalOnly` 호출부가 이 저장소에 4곳
   (`directMutationActions.js`·`outboxCommit.js` 자신·
   `requestDriverInviteSave.js`·`vehicleDeletion.js`) — 전부 `npm run
   typecheck`로 자동 검증되므로 특별한 blast-radius grep은 불필요(타입
   에러면 CI가 바로 잡아줌).
2. **최소 범위** — `requestDriverDeletion`에만 명시적 `@returns` 좁히기.
   단 제네릭 없이는 `value`가 여전히 넓은 유니언이라 이것만으론 안 풀릴
   가능성이 높음 — 시도 전 직접 확인 필요.

어느 쪽이든 `any`/`@ts-ignore`/`as unknown as` 금지(AGENTS.md §6) —
타입을 실제로 좁히는 방식으로.

#### 건드릴 파일(예상)

- `react-app/src/lib/outboxCommit.js` (86줄) — 제네릭 추가 시.
- `react-app/src/lib/directMutationActions.js` (122줄) — `@returns` 추가
  시(1번 방향과 병행 가능).
- `CarListPage.jsx`는 이번엔 손댈 필요 없을 가능성 높음(타입 쪽만 수정).

#### §4 플레이북 트리거

해당 — `outboxCommit.js`는 `lib/*commit*` 패턴. 착수 전
`docs/testing-playbook.md` 열람 필수. (단, 이번은 순수 타입 수정이라
런타임 동작 변경 없음 — 플레이북에서도 "화면에 보여주기만? → 참고"
쪽에 가까울 수 있음, 구현 세션에서 판단)

#### 검증 방법

1. 로컬 `npm run typecheck` 그린.
2. `npm test` 그린(기존 테스트 깨지지 않는지).
3. commit → push → CI "verify"·"CI" 둘 다 초록 확인(`gh run list`).
4. 브라우저 재검증은 생략 가능(런타임 동작 변경 없음 — 타입만 수정).

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
