# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(게스트 데이터 유실 버그 `[x]`, 연동 기사 거래처
> 스코프 불일치 `[x]` + 3그룹 교차검증) 상세는
> `docs/archive/guest-data-loss-and-client-scope-2026-09-11.md`로 옮김(동결).

---

## "부가세 해제" 레이블 16px 잔존

### 배경

`ui-comparison-report.md` §1-A(콜상세 폼 CSS 4건) 조사 때 발견, 범위 밖이라
별도 슬라이스로 미뤄둔 항목(`docs/archive/day-log-part2-scroll-card-bugs.md`
"참고 — 범위 밖" 절). STATUS.md "다음 할 일" 1번.

### 조사 결과

원본([style.css:6060-6068](../style.css:6060))은 콜상세 인라인(아코디언)
버전 한정으로 "부가세 해제" 레이블에 작은 글자 크기를 스코프해서 줍니다:

```css
#workModal .call-detail-inline-host .call-vat-row > label:first-child {
    color: var(--text-color);
    font-size: var(--fs-2);
}
```

react-app([call-detail-form.css:131-136](../react-app/src/components/day-log/call-detail-form.css:131))의
대응 규칙 `.work-log-page .call-vat-row { ... }`엔 레이아웃(flex·margin)만
있고 `font-size` 지정이 아예 없습니다 — 그래서 "부가세 해제" 레이블만
브라우저 기본 크기(16px)로 남아 있습니다. `CallDetailForm.jsx`의 두 분기
(`settings.paymentOn` true/false, [CallDetailForm.jsx:186](../react-app/src/components/day-log/CallDetailForm.jsx:186)·
[:208](../react-app/src/components/day-log/CallDetailForm.jsx:208))가 마크업이
동일(`<div className="call-vat-row"><label>부가세 해제</label><label className="switch">…`)해서
CSS 규칙 하나로 둘 다 커버됩니다.

### 목표 상태

"부가세 해제" 레이블이 원본과 같이 `var(--fs-2)` 크기로 표시된다(계산서
켜짐/꺼짐 두 분기 모두).

### 건드릴 파일 (정확히 1개)

**`react-app/src/components/day-log/call-detail-form.css`** — 기존
`.work-log-page .call-vat-row { ... }` 규칙(131번째 줄) 바로 다음에 규칙
추가:

```css
.work-log-page .call-vat-row > label:first-child {
  font-size: var(--fs-2);
}
```

`--fs-2`는 이미 전역 토큰(`account-flow.css`, `App.jsx`에서 1회 import)이라
새 변수 정의 불필요 — 이 파일도 이미 `var(--fs-floor)` 등 같은 토큰군을
쓰고 있음(회귀 없음).

### 안 건드릴 것

- `CallDetailForm.jsx` — 마크업은 이미 원본과 동일 구조, JS 무변경.
- 다른 `.call-vat-row` 사용처(발견 안 됨 — 이 폼 전용 클래스).

### §6 200줄 참고

이 파일은 이미 "한 폼 컴포넌트 응집" 사유로 §6 예외(~250줄)를 받은
파일(251줄, 파일 상단 주석에 명시). 이번 3줄 추가로 254줄이 됨 — 기존
승인된 예외 범위(~250) 근처라 별도 분리설계안 없이 진행하되, 보리가
더 엄격하게 보고 싶으면 알려주세요.

### §8 4대 질문

1~4. 무관 — 순수 CSS 한 줄 추가, 구독·값 출처·쓰기창구·hydrate 전부 무변경.
5. (DB) 무관.

### 검증 방법

- CI 자동(test·typecheck·build) — CSS만 바뀌므로 통과 예상, 스냅샷/시각
  테스트는 없음(코드 리뷰로 대체).
- 보리 브라우저 실검증:
  1. 일일운행 → 콜상세 추가/수정 폼 열기 → "부가세 해제" 레이블 글자
     크기가 다른 레이블(계산서, 입금 예정일 등)보다 작게 보이는지.
  2. 계산서 항목 켜짐/꺼짐(설정 → "일지 세부 입력" 안 계산서 토글)
     두 상태 모두 확인.
  3. 라이트·다크 테마 둘 다 확인(색상 무변경, 크기만 확인).

**→ 보리 확인 완료 (2026-09-11).** 위 목표 상태·건드릴 파일(1개, CSS
3줄)로 바로 진행.

---

## `LinkedDriverClientsPage` 스코프 키 출처 — 후속 nit 재조사 결론

### 배경

STATUS.md "후속 nit"[확인 2026-09-11, 거래처 스코프 교차검증 중 발견]:
`LinkedDriverClientsPage`(차주가 보는 "기사 거래처" 화면)의 연동 모드
스코프 키가 콜상세·`OwnerScopedClientsView`(기사 본인 화면)와 "다른 소스"
(`driver.vehicleNumber`, owner 쪽 기록)에서 온다고 기록해두고 "버그 아님·
데이터정합 전제로만 기록·급하지 않음"으로 미뤄둔 항목. 이번 세션에서
"처리" 지시를 받아 출처를 끝까지 추적했다.

### 조사 결과 (코드 추적, 재현 실험 아님)

- **`LinkedDriverClientsPage.jsx:58`** → `scopeKey = ctx.car?.number`
  (연동 모드). `ctx.car`는 [`driverManagementContext.js:31-33`](../react-app/src/domain/driverManagementContext.js:31)에서
  `driver.vehicleNumber`(문자열)를 owner의 `cars` 배열과 매칭해 찾은
  차량 객체 — 즉 `ctx.car.number`는 사실상 `driver.vehicleNumber`와
  같은 값이다(매칭 실패 시에만 빈 값).
- **`driver.vehicleNumber`의 출처** → [`hydrateMerge.js:78-84`](../react-app/src/lib/hydrateMerge.js:78):
  owner hydrate마다 서버 `driver_links` 행(`row.vehicle_id`)을 owner 자신의
  `vehicles` 병합 결과(`mergedCars`)와 클라이언트에서 조인해 채운다.
  **정본은 `driver_links.vehicle_id`** — owner 쪽 로컬 캐시 문자열이
  아니라 매 hydrate마다 서버 값으로 새로 계산된다.
- **`get_assigned_vehicle_summary()` RPC의 출처** →
  [`0002_driver_invite_redeem.sql:94-98`](../react-app/supabase/migrations/0002_driver_invite_redeem.sql:94):
  `vehicles v join driver_links dl on dl.vehicle_id = v.id where dl.driver_id = auth.uid() and dl.status='linked'`.
  **똑같이 `driver_links.vehicle_id` 조인.**

### 결론

두 화면이 "서로 다른 소스"를 쓰는 게 아니라, **같은 정본 컬럼
(`driver_links.vehicle_id`)을 서로 다른 위치(서버 RPC vs 클라이언트
hydrate 병합)에서 조인**할 뿐이다. 둘 다 각자의 hydrate/호출 시점마다
서버 값으로 새로 계산되므로 구조적 어긋남 지점이 없다. 유일한 이론적
창구는 "기사 재배정 직후, owner가 아직 재hydrate 안 한 그 찰나"인데
이는 이 화면 고유의 결함이 아니라 owner 쪽 모든 hydrate 기반 화면에
공통인 일반적 지연이다 — 스코프 키 로직만 따로 손볼 대상이 아니다.

**제안: 코드 변경 없음. STATUS.md "후속 nit" 이 항목을 "확인 완료 —
버그 아님, 종결"로 갱신.** 갱신 문구 초안:

> **`LinkedDriverClientsPage` 스코프 키 출처 — 종결**[재확인
> 2026-09-11] — 콜상세/`OwnerScopedClientsView`의 `get_assigned_vehicle_summary`
> RPC와 `LinkedDriverClientsPage`의 `driver.vehicleNumber` 둘 다 정본은
> `driver_links.vehicle_id`(서버 조인 위치만 다름, [report.md](docs/report.md)
> 조사). 구조적 어긋남 없음 — 버그 아님, 코드 변경 불필요.

### 건드릴 파일

없음 — react-app 코드 무변경. 승인되면 `STATUS.md` 한 곳만 AI가 직접 갱신.

### 검증 방법

코드 3파일 대조로 결론 도출(위 근거) — 재현할 불일치 자체가 없어 브라우저
검증 대상 없음. 원한다면 실제 기사 재배정 후 두 화면을 번갈아 열어
동시에 갱신되는지 육안 확인 가능(선택, 급하지 않음).

**→ 보리 확인 완료 (2026-09-11).** "종결" 갱신 문구 승인 — STATUS.md
"완료" 절로 반영 완료(코드 변경 없음).
