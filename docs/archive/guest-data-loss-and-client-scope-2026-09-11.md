# archive — 게스트 데이터 유실 버그 + 연동 기사 거래처 스코프 불일치 (2026-09-11 동결)

> 둘 다 `[x]` 최종 확정 완료. `docs/report.md`에서 이관(AGENTS §0-2).

> 직전 완료 슬라이스(B그룹 ①산재보험료·②즐겨찾기 칩 `[x]`, ③은 가짜 개념
> 기반이라 완전 폐기, 이어서 발견된 진짜 버그 "콜상세 거래처 +추가 버튼"
> `[x]` 최종 확정까지) 상세는 `docs/archive/b-group-report-2026-09-11.md`로
> 옮김(동결).

---

## 게스트 데이터 유실 버그 — 진짜 원인 확정 (배포앱에서 100% 재현 성공)

### ⚠️ 이전 진단 정정

이 파일 이전 버전에서 "React StrictMode(개발 모드 전용) 이펙트 이중 실행"을
원인으로 지목했었는데, **보리가 실제 배포앱(GitHub Pages)에서도 재현된다고
알려주셔서 다시 조사했고, 배포앱에서 직접 재현·확정한 결과 원인이 전혀
달랐습니다.** StrictMode 건은 그 자체로 사소한 결함이라 아래 "덤으로 발견한
별개 결함"에 정리해뒀지만, **진짜 원인은 아래 스키마 검증 버그입니다.**
혼선 드려 죄송합니다.

### 조사 결과 — 100% 재현 + 원인 확정 (배포앱 `https://mung2nyang.github.io/react-app/app`에서 직접 검증)

**재현 절차:**
1. 배포앱에서 로그아웃 → "비회원으로 시작하기" → 설정에서 "운행 일지 세부
   입력" 켜기 → 아무 날짜에 콜상세 1건 저장(예: 운송료 99,000원, 산재보험료는
   **입력 안 함**, 즉 빈 값).
2. 저장 직후엔 화면·`localStorage` 둘 다 정상.
3. 그 날짜 URL을 새로고침 → **"운행 일지 세부 입력" 섹션 자체가 통째로
   사라짐**(빈 계정처럼 보임). "매출" 화면도 확인해보면 **전체가 0원/0회로
   리셋**돼 있음 — 이 콜상세뿐 아니라 이 계정의 모든 화면이 "데이터 없음"
   상태가 됨.
4. 그런데 `localStorage.getItem('reactPracticeWorkData:guest')`로 직접
   열어보면 **저장했던 데이터가 그대로 다 들어있음.** 디스크(로컬스토리지)엔
   있는데 앱 자체가 그 데이터를 못 읽어들이는 상태 — 이게 "지워진 것처럼
   보이는" 진짜 정체다.
5. 이 상태는 새로고침을 몇 번을 해도, 화면을 아무리 전환해도 **저절로 안
   고쳐진다**(한 번 이 상태가 되면 그 브라우저에서 그 계정은 계속 고장난
   채로 남음).

**직접 확인한 원인 — `insuranceFee`(산재보험료) 필드가 빈 값(`''`)일 때
저장 스키마 검증기가 그 콜상세 전체를, 그리고 그 여파로 앱의 전체 초기
로딩을 통째로 실패시킨다:**

- [lib/callDetailSchema.js:32](../react-app/src/lib/callDetailSchema.js:32)
  `isValidCurrencyAmount(value)`는 문자열이면 `/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\s?원)?$/`
  정규식에 맞아야 통과한다 — **빈 문자열 `''`은 이 정규식에 안 맞아 무조건
  실패.**
- [lib/callDetailSchema.js:132](../react-app/src/lib/callDetailSchema.js:132)
  `matchesCallDetailFields`가 콜상세의 `insuranceFee` 필드에 이 함수를 그대로
  적용한다: `if ('insuranceFee' in item && !isValidCurrencyAmount(item.insuranceFee)) return false`.
- **그런데 B그룹① 산재보험료 슬라이스(react-app `1de2537`)가 `buildCallDetail`에
  `insuranceFee: String(draft.insuranceFee ?? existing?.insuranceFee ?? '').trim()`을
  추가하면서, 산재보험료를 안 채운 콜상세도(=거의 전부) 이제 항상
  `insuranceFee: ''`을 저장 객체에 갖게 됐다.** 즉 그날 이후로 저장되는
  콜상세 대부분이 이 검증을 실패하는 모양이 됐다.
- 이 실패는 `store/persistDayRecord.js`의 `isPersistedDayRecord` →
  `parsePersistedWorkDataMap`으로 전파돼 그 record 하나가 아니라 **그
  owner의 workData 전체 맵 파싱이 `null`**이 되고, `readLogWorkData`가
  `{ ok:false, kind:'schema' }`를 돌려준다.
- 이걸 부르는 [store/owner-state.js:76](../react-app/src/store/owner-state.js:76)
  `initializeOwnerFromPersist`는 `if (!workRead.ok) return`으로 **거기서
  즉시 함수 전체를 중단**한다 — 이미 만들어 둔 `settings`/`cars`/`clients`
  등 다른 도메인 entries조차 `commitBatch`로 반영되지 못한 채 통째로
  버려진다. **결과: 이 owner의 앱 부팅 시 Store 초기화가 전부 무산되고,
  화면은 "아무 데이터도 없는 새 계정"처럼 보인다** — 정작 디스크의
  `localStorage`는 멀쩡한 채로.

**직접 실험으로 확정:** 배포앱에서 저장된 콜상세의 `insuranceFee` 키를
`localStorage`에서 수동으로 지운 뒤 새로고침하니, "운행 일지 세부 입력"
섹션과 "매출" 화면 금액이 **즉시 정상으로 돌아옴.** 이걸로 원인 100% 확정.

### 목표 상태

산재보험료(및 운송료 등 같은 검증기를 쓰는 다른 통화 필드)를 **입력하지
않은 채로 저장해도** 정상적으로 유효한 콜상세로 인정돼야 한다 — 빈 값은
"0원/미입력"으로 취급(이미 `domain/money.js`의 `parseCurrencyValue('')`가
0을 돌려주는 것과 같은 규약).

### 건드릴 파일 (정확히 1개)

**`react-app/src/lib/callDetailSchema.js`** — `isValidCurrencyAmount`
함수에 "빈 문자열(공백 포함)은 유효(0/미입력)"만 추가한다:

```js
export function isValidCurrencyAmount(value) {
  if (typeof value === 'number') return Number.isInteger(value) && Number.isFinite(value) && value >= 0
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  // 빈 값 = 미입력(0) — domain/money.js의 parseCurrencyValue('')===0과 같은 규약.
  // 이게 없어서 산재보험료를 안 채운 콜상세(대부분)가 전부 검증 실패 →
  // 그 owner의 Store 초기화 전체가 무산되는 버그가 있었다(실측: 2026-09-11
  // "게스트 데이터 유실" 재현·원인 확정).
  if (trimmed === '') return true
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\s?원)?$/.test(trimmed)) return false
  const parsed = parseCurrencyValue(trimmed)
  return Number.isFinite(parsed) && parsed >= 0
}
```

이 함수 하나가 `fare`/`fixedFare`/`totalFare`/`insuranceFee`/`payments[].amount`
전부에 공유돼 쓰이므로([grep 결과](../react-app/src/lib/callDetailSchema.js) —
`store/persistDayRecord.js`·`store/persistDayRecordLegacy.js`·
`lib/callDetailSchema.js` 자체), 이 한 곳만 고치면 전부 일관되게 고쳐진다.

### 안 건드릴 것

- `store/owner-state.js`의 "하나라도 실패하면 전체 중단" all-or-nothing
  설계 — 이건 의도된 안전장치(부분적으로 깨진 데이터를 조용히 섞어 쓰지
  않겠다는 것)라 원인이 아니다. 무변경.
- `useDayDraft.js` — 지난 진단(StrictMode)에서 제안했던 수정은 **이번
  건드릴 파일에서 제외.** 이유는 아래 "덤으로 발견한 별개 결함" 참고
  (효과가 없는 건 아니지만, 이번 진짜 원인과 무관해 범위 밖).
- `domain/money.js`의 `parseCurrencyValue` — 이미 빈 값을 0으로 정확히
  처리하고 있어 무변경.

### §8 4대 질문

1. 구독 — 무관. 순수 검증 함수 수정.
2. 화면에 보이는 값 — 무관. "저장을 허용할지"만 바꿈, 계산 로직 무변경.
3. 쓰기 창구 — 무관. 새 창구 없음.
4. hydrate·디바운스·동시편집 — 이 수정으로 오히려 hydrate/부팅 시 Store
   초기화가 안정된다(지금은 이 버그로 전체 초기화가 무산되는 게 문제였음).

### 검증 방법

- CI 자동(test·typecheck·build). `callDetailSchema.test.js`류 기존 테스트가
  있다면 "빈 문자열은 무효"를 가정한 테스트가 있는지 확인 필요(있다면
  "빈 문자열은 유효(0)"로 기대값을 고쳐야 함 — 버그를 테스트가 고정하고
  있었을 가능성).
- 보리 브라우저 실측(**게스트로, 실제 배포앱 또는 `npm run dev` 아무 쪽이나
  동일하게 재현·검증 가능**):
  1. 게스트로 콜상세 저장(산재보험료는 **비워둔 채로**, 즉 지금까지처럼
     대부분의 경우).
  2. 새로고침 → "운행 일지 세부 입력" 섹션에 방금 저장한 콜상세가 계속
     보이는지(핵심 확인 — 지금까지는 여기서 사라졌음).
  3. "매출" 화면에서 방금 저장한 금액이 정상 집계되는지.
  4. 화면 전환을 여러 번 반복해도 계속 정상인지.
  5. 이번엔 산재보험료도 채워서 저장 → 여전히 정상(회귀 없음, 원래도 되던
     케이스).
  6. 기존에 이미 이 버그로 "사라진 것처럼" 보였던 브라우저가 있다면(보리
     테스트 기기), 그 계정의 `localStorage`에서 문제 있는 콜상세들의
     `insuranceFee: ''`가 이 수정 이후 다시 정상적으로 로드되는지도 확인
     가능(과거 "유실"로 보였던 데이터가 사실 복구될 수도 있음 — 안 지워진
     채 디스크에 남아있었으므로).

### 덤으로 발견한 별개 결함 (이번 수정과 무관, 참고용)

조사 과정에서 [useDayDraft.js:149](../react-app/src/components/day-log/useDayDraft.js:149)의
"마운트 첫 렌더는 커밋 스킵" 가드가 React `<StrictMode>`(개발 모드 전용,
[main.jsx:12](../react-app/src/main.jsx:12))의 이펙트 이중 실행에 뚫려
`npm run dev` 환경에서만 별도로 데이터를 덮어쓸 수 있는 결함도 발견했다
(임시 `console.trace`로 스택 확인 후 원복, 커밋 없음). **배포앱에서는
재현 안 됨**(직접 검증). 이번 슬라이스와는 무관한 별개 결함이라 이번엔
안 건드리고, 필요하면 나중에 별도 슬라이스로.

**→ 보리 확인 완료 (2026-09-11).** 위 원인 진단 + 수정(1개 파일, 함수
하나에 3줄 추가)으로 진행 — 작업자 전달. StrictMode 별개 결함은 이번
범위에서 제외, 필요하면 나중에 별도로.

## 구현 결과 + 감시관 검증 (2026-09-11)

작업자 커밋 react-app `0b9358d`(`fix: 통화 금액 빈 문자열을 미입력(0)으로
허용해 게스트 데이터 유실 방지` — 보리 지시로 `DayLogPage.jsx` §6 주석
215줄 수정도 같은 커밋에 포함), 보리 push 완료. CI(run `34571589049`)
**success**.

**§5 체크리스트:**

1. **범위 준수** — `git show --stat`: `callDetailSchema.js`(+5줄)·
   `DayLogPage.jsx`(주석 1줄)·`callDetailSchema.test.js`·
   `pendingWorkDataWrites.test.js` 딱 4개 파일. 지시한 수정 그대로 —
   `isValidCurrencyAmount`에 "빈 문자열은 유효" 3줄 + 설명 주석.
2. **몰래 증설 없음** — 새 저장 레이어·새 창구 없음. 순수 검증 함수 수정.
3. **타입 꼼수 없음** — `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as`
   전부 없음(grep 확인).
4. **200줄** — `DayLogPage.jsx` 215줄(주석도 "215줄"로 정확히 일치),
   `callDetailSchema.js` 144줄. 이상 없음.
5. **테스트 진실성 — 수정됨(약화 아님, 정당함).** `callDetailSchema.test.js`가
   `isValidCurrencyAmount('')`/`('   ')`의 기대값을 `false`→`true`로
   바꿨는데, 이건 **버그를 고정하고 있던 옛 기대값을 새 스펙에 맞게
   고친 것**(주석으로 사유 명시: "빈 값 = 미입력(0)"). `pendingWorkDataWrites.test.js`도
   같은 이유로 빈 문자열 케이스를 "거부 목록"에서 빼고 별도로 "허용·정상
   커밋" 케이스를 새로 추가 — 삭제·완화가 아니라 정확한 스펙 반영.
6. **문서 정합** — diff에 `.md` 없음.
7. **요구사항 충족** — 아래 감시관 브라우저 실측으로 확인.

**감시관 브라우저 실측 (배포앱 `https://mung2nyang.github.io/react-app/app`에서
직접, CI/배포 완료 확인 후):**

1. 게스트로 로그아웃 → 새로 "비회원으로 시작" → 설정에서 "운행 일지 세부
   입력" 켜기 → 콜상세 저장(운송료 77,000원, **산재보험료는 비워둠** —
   버그 트리거 조건 그대로) → 저장 직후 정상 표시.
2. **그 날짜 URL로 새로고침 → "운행 일지 세부 입력" 섹션과 77,000원
   콜상세가 그대로 정상 표시됨(수정 전엔 여기서 섹션 자체가 사라졌음).**
3. "매출" 화면에서 77,000원/1회 운행으로 정상 집계됨(수정 전엔 0원/0회로
   보였음).
4. 한 번 더 새로고침 → 계속 정상(안정적으로 재현되지 않음, 즉 고쳐짐 확인).
5. 테스트 데이터는 삭제로 정리.

**요구사항(빈 산재보험료로 저장한 콜상세가 새로고침 후에도 정상 로드·집계)
배포앱에서 100% 확인.**

**최종 승인 — 보리 `[x]` 2026-09-11.**
**게스트 데이터 유실 버그 — `[x]` 최종 확정 (2026-09-11).**

---

## 연동 기사 본인 로그의 거래처 스코프 불일치

### 배경

"콜상세 거래처 +추가" 슬라이스 조사 중 발견(§8-5번, `docs/archive/b-group-report-2026-09-11.md`
참고). 연동 기사가 **본인 계정으로 로그인**해서 자기 운행일지를 직접 쓸 때,
콜상세 폼의 거래처 자동완성/등록이 "거래처" 관리 화면과 **다른 거래처
묶음**을 보고 있을 수 있는 구조적 문제.

### 조사 결과

**두 화면이 서로 다른 스코프 규칙을 쓰고 있다:**

1. **"거래처" 관리 화면**([OwnerScopedClientsView.jsx:38](../react-app/src/components/clients/OwnerScopedClientsView.jsx:38)) —
   `scopeKey = cars[0]?.number`(이 기사에게 배정된 차량 번호)로 걸러
   `scopedToVehicleNumber === scopeKey`인 거래처만 보여준다. **정확함.**
2. **콜상세 폼(운행일지 세부 입력)** — `CallDetailForm.jsx`가
   `getClientsForLog(clients, logId)`로 거래처를 거르는데, 이 기사의
   운행일지는 [hydrateEmployedDriver.js:59-70](../react-app/src/lib/hydrateEmployedDriver.js:59)
   `remapEmployedDriverWorkLogs`가 항상 `logId='main'`으로 매핑한다(라우팅도
   `/app`(index route)만 쓰고 `/app/logs/:logId`는 이 세션에 안 씀). 그런데
   [domain/clients.js:168](../react-app/src/domain/clients.js:168) `getClientsForLog`는
   `logId==='main'`이면 **스코프 없는(=일반) 거래처**만 보여준다 — 차주의
   일반 거래처지, 이 기사 전용(`scopedToVehicleNumber===차량번호`) 거래처가
   아니다.

**원인이 되는 지점 하나 더** — [hydrateEmployedDriver.js:113](../react-app/src/lib/hydrateEmployedDriver.js:113)
`clientsRes = supabase.from('clients').select('*').eq('user_id', ownerKey)`가
스코프 필터 없이 **차주 계정의 거래처 전체**를 그대로 로컬로 내려받는다.
그래서 로컬 `clients` 배열 자체엔 이 기사 전용 거래처도, 차주 일반 거래처도,
다른 차량 전용 거래처도 전부 섞여 들어와 있다 — `getClientsForLog`가 그중
어느 부분집합을 보여줄지가 관건인데, 지금은 `logId==='main'` 규칙 때문에
엉뚱하게 "일반(무스코프)" 쪽을 보여준다.

**증상(추정, 실측 전):** 이 기사가 콜상세에서 "+추가"로 거래처를 등록하면
`scopedToVehicleNumber` 없이(일반 거래처로) 저장되고, 정작 "거래처" 관리
화면(스코프 있는 것만 봄)엔 안 뜬다. 반대로 "거래처" 화면에서 등록한
진짜 본인 거래처는 콜상세 자동완성엔 안 뜬다(스코프 없는 것만 봄).

### 목표 상태

연동 기사 본인 로그인 세션에서, 콜상세 폼의 거래처 자동완성·"+추가"가
"거래처" 관리 화면과 **같은 스코프**(`scopedToVehicleNumber === 배정
차량번호`)를 보게 한다.

### 건드릴 파일 (보리 지시 2026-09-11 — 하이드레이트 범위도 같이 좁힘, 정확히 5개)

`CallDetailForm.jsx`가 거래처 스코프를 결정할 때 `logId`(workData 저장
키)와 "거래처 스코프 키"를 분리해야 한다 — 지금은 하나의 `logId` prop이
두 역할(① 어느 workData 맵을 쓸지 ② 어느 거래처 스코프를 쓸지)을 같이
하고 있어서 생긴 문제. **더해서, 서버에서 애초에 이 기사와 무관한(남의
차량) 거래처까지 로컬로 내려받지 않도록 하이드레이트 쿼리 자체도 좁힌다
(보리 지시).**

1. **`react-app/src/app/AppShellRoutes.jsx`** — `mainPage()`가
   `MainPageRoute`에 `session`을 새로 전달(현재 미전달).
2. **`react-app/src/app/MainPageRoute.jsx`** — `session?.linkedOwnerId`가
   있으면(=연동 기사 본인 세션) `clientScopeKey = cars[0]?.number || 'main'`,
   아니면 `clientScopeKey = logId` 그대로. `DayLogPage`에 새 prop
   `clientScopeKey`로 전달(workData용 `logId`는 지금처럼 그대로 별도 유지).
3. **`react-app/src/components/day-log/DayLogPage.jsx`** — `clientScopeKey`
   prop을 받아 `CallDetailForm`에 그대로 전달(`logId` 자리에 넣지 않고
   별도 prop으로).
4. **`react-app/src/components/day-log/CallDetailForm.jsx`** — 거래처
   읽기(`getClientsForLog`)와 "+추가" 스코프(`CallClientQuickAdd`)에
   지금 쓰던 `logId` 대신 새 `clientScopeKey`(없으면 `logId`로 폴백 —
   메인/미연동 서브차량은 지금처럼 둘이 같은 값이라 회귀 없음)를 쓴다.
5. **`react-app/src/lib/hydrateEmployedDriver.js`** — 지금은 차량 조회
   (`fetchAssignedVehicleSummary`)와 거래처 조회(`clients` 테이블)를 같은
   `Promise.all`로 **동시에** 날려서, 거래처 쪽엔 아직 모르는 배정 차량
   번호로 거를 방법이 없다(그래서 지금 전체를 다 받아옴). 배정 차량 조회를
   먼저 끝내고, 그 번호로 거래처 쿼리에
   `.eq('raw->>scopedToVehicleNumber', assignedVehicleNumber)`를 추가한
   **다음 단계 조회**로 바꾼다(왕복 1회 늘지만, 이 기사와 무관한 거래처는
   서버에서부터 아예 안 내려받게 됨). 배정 차량이 없으면(드묾) 거래처 조회
   자체를 건너뛰고 빈 배열.

### 안 건드릴 것

- 워크데이터(`logId`) 자체의 'main' 매핑(`remapEmployedDriverWorkLogs`) —
  이건 라우팅·비용 하이드레이트 등 여러 곳이 전제하는 더 큰 구조라 이번
  슬라이스에서 안 건드림(거래처 스코프만 분리해서 고침).
- "거래처" 관리 화면(`OwnerScopedClientsView.jsx`) — 이미 정확해서 무변경.
- `clients` 테이블 RLS 정책 — 서버 쪽 접근 권한 자체는 이미 있는 것으로
  전제(§8-5는 "얼마나 내려받을지"의 효율·최소노출 문제지 권한 누수 문제가
  아님). 정책 변경 없음.

### §8 4대 질문

1. 구독 — 새 구독 없음. `MainPageRoute`가 이미 구독 중인 `cars`/받은
   `session`을 조합만 함.
2. 화면에 보이는 값 — 거래처 목록은 기존 `getClientsForLog` 파생값 그대로,
   넘기는 스코프 키만 바뀜.
3. 쓰기 창구 — 무관(이번엔 읽기·자동완성 스코프만).
4. hydrate·동시편집 — 무관.
5. **(DB) 이 데이터의 읽기 권한이 원본과 동일한가?** → 원본(바닐라)엔 이
   멀티 로그id 개념 자체가 없어서 직접 비교 불가 — react-app 자체 설계
   원칙(`sot.md` "미연동 서브차량 데이터 완전 분리")에 맞추는 방향. **보리
   결정(2026-09-11): 하이드레이트도 같이 좁힌다** — 위 "건드릴 파일" 5번.

### 검증 방법

- CI 자동(test·typecheck·build).
- 보리 브라우저 실검증(연동 기사 계정 필요 — 차주 계정에서 기사 연동 후
  그 기사 계정으로 로그인):
  1. 연동 기사 본인 계정 로그인 → "거래처" 화면에서 거래처 하나 등록.
  2. 자기 운행일지 콜상세 폼 열기 → 방금 등록한 거래처가 자동완성에
     뜨는지(수정 전엔 안 떴을 것).
  3. 콜상세 폼 "+추가"로 새 거래처 등록 → "거래처" 관리 화면에도 나타나는지
     (수정 전엔 서로 다른 목록이라 안 보였을 것).
  4. 차주 계정의 일반 거래처·다른 차량 전용 거래처가 이 기사의 콜상세
     자동완성에도, 로컬 `clients` 배열에도 안 섞여 들어오는지(개발자
     도구로 확인 가능 — 하이드레이트 범위가 실제로 좁혀졌는지의 핵심 확인).
  5. 메인 운행일지·미연동 서브차량 운행일지(오너 시점)는 이번 변경과
     무관하게 기존과 동일하게 동작하는지(회귀 없음).

**→ 보리 확인 완료 (2026-09-11, "좁혀").** 위 목표 상태·건드릴 파일(5개,
하이드레이트 범위 좁히기 포함)로 진행 — 작업자 전달.

## 구현 결과 + 감시관 검증 (2026-09-11)

작업자 커밋 react-app `76d9829`(`fix: 연동 기사 콜상세 거래처 스코프를
배정 차량과 맞춤`), 이미 push·CI 완료 확인(run `34579414463` success).

**§5 체크리스트:**

1. **범위 준수** — `git show --stat`: 지시한 5개 파일(`AppShellRoutes.jsx`·
   `MainPageRoute.jsx`·`DayLogPage.jsx`·`CallDetailForm.jsx`·
   `hydrateEmployedDriver.js`) 정확히 일치 + 관련 테스트 2개
   (`employedDriverClients.test.js`·`hydrateEmployedDriver.test.js`).
2. **몰래 증설 없음** — 새 파일·새 저장 레이어 없음. 병렬→순차 조회 변경은
   지시서 5번 항목(보리 지시) 그대로.
3. **타입 꼼수 없음** — `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as`
   grep 결과 없음.
4. **200줄** — `CallDetailForm.jsx` 226줄, 기존부터 있던 §6 예외(응집도
   사유 주석 기존 보유) 유지. 새로 초과된 게 아님.
5. **테스트 진실성** — 새 테스트가 "배정 차량 scoped 조회"·"배정 차량
   없으면 조회 스킵" 실동작을 검사. mock을 `handlers.rpc` 객체 패턴으로
   바꾼 것도 같은 파일·인접 테스트 파일에 이미 쓰이던 기존 패턴 통일.
6. **문서 정합** — diff에 `.md` 없음.
7. **요구사항 충족** — 5개 파일 수정 내용 지시서대로 전부 구현 확인.

**로컬 재확인**: `npm test`(155개 전부 pass) / `npm run typecheck`(0 에러) /
`npm run build`(성공) — CI와 동일 결과.

**최종 승인 — 보리 `[x]` 2026-09-11("이건 승인처리").**

## 추가 요청 — 거래처 자동완성 3그룹(차주/연동기사/미연동기사) 교차검증 (2026-09-11)

보리 요청: "거래처 자동완성에서 차주/연동기사/미연동기사가 섞이지 않는지
확인". 코드 전수 조사(브라우저 실측 아님 — 세 계정 조합을 한 세션에서
동시 재현하기 어려워 코드 경로 추적으로 확인):

**세 경로의 읽기(자동완성)·쓰기("+추가") 스코프 키가 모두 일치함을 확인:**

| 계정 | 콜상세 폼 스코프 키 | 대응하는 "거래처" 관리 화면 | 스코프 키 |
|---|---|---|---|
| 차주 본인(`logId==='main'`) | `getClientsForLog(clients, 'main')` → 무스코프만 | `ClientListPage.jsx:39` | `!client.scopedToVehicleNumber` |
| 미연동 서브차량(오너가 그 차량 일지 열람, `logId`=차량번호) | `getClientsForLog(clients, logId)` | `LinkedDriverClientsPage.jsx`(unlinked 모드) | `ctx.plate` = 같은 `logId` |
| 연동기사 본인(오늘 수정 후) | `clientScopeKey = cars[0]?.number`(배정 차량, RPC 기반) | ① 기사 본인 `OwnerScopedClientsView.jsx` 동일 계산식 ② 차주가 보는 `LinkedDriverClientsPage.jsx`(linked 모드) `ctx.car?.number` | 배정 차량번호로 동일(단 ②는 아래 참고) |

- `getClientsForLog`(`domain/clients.js:168`) 호출부는 프로덕션에 `CallDetailForm.jsx`
  단 한 곳뿐 — 스코프 없이 `clients` 전체를 보여주는 다른 경로 없음(grep 확인).
- 연동기사 세션은 오늘 수정으로 하이드레이트 자체가 배정 차량 scoped
  거래처만 내려받으므로(§4 "건드릴 파일" 5번), 로컬 `clients` 배열에
  애초에 다른 스코프 데이터가 존재하지 않음 — 키가 살짝 어긋나도 "섞임"이
  아니라 "안 보임"으로만 실패하는 구조(더 안전한 방향).
- **유일하게 발견한 것(버그 아님, 코드 구조상 전제 하나)**:
  `LinkedDriverClientsPage.jsx`(차주가 특정 기사의 "거래처" 화면을 볼 때)의
  연동 모드 스코프 키는 `driver.vehicleNumber`(차주 쪽에 저장된 값)에서
  오는데, 콜상세·`OwnerScopedClientsView`는 배정 차량 RPC
  (`get_assigned_vehicle_summary`) 결과에서 옴 — 오늘 수정 범위 밖의
  기존 코드. 두 값이 항상 같다는 전제인데 실제 불일치 재현은 못 함(정상
  플로우에서 어긋날 시나리오를 못 찾음). `STATUS.md` "후속 nit"에 참고용
  기록.

**결론: 현재 코드에서 3그룹 간 거래처 자동완성 교차 오염 없음.** 브라우저
3계정 동시 재현까지는 안 했으므로, 보리가 직접 세 계정으로 확인하고 싶으면
안내 가능(연동기사 계정 하나 + 미연동 서브차량 하나 준비 필요).
