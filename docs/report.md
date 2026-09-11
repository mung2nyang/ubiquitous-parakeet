# docs/report.md — 현재 슬라이스 착수지시서

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
