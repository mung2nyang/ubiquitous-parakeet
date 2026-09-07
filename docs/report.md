# docs/report.md — Step 11 JS→TS 전환 슬라이스 25: 잔여 UI 4파일

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **슬라이스 25 전체 `[x]` 확정 (2026-09-07)** — react-app `62640d8`, CI "verify" 초록
> run `34072997974`(conclusion=success, 3게이트 green), 감시관 §5 7항목 통과, 보리 브라우저
> 스모크 통과 + `[x]`. strict-inventory 350→346(−4). 대상 = `src/main.jsx`·
> `src/components/ReportPage.jsx`·`src/components/ForgotPasswordModal.jsx`·
> `src/app/HydrationRetryBanner.jsx`(감시관 추천 방향 ①, 보리 "다음건 추천방향으로 진행" 승인).
> 다음(슬라이스 26 — `.test.js` 정책 / `.ts` 실전환 / 이관 로드맵 잔여) 착수지시서 작성 시 리셋.

## 0. 왜 이 방향인가 (감시관 추천 근거)

STATUS.md "다음 할 일"에 있던 4후보 비교:

| 후보 | 스코프 상태 | 이번에 안 고른 이유 |
|---|---|---|
| ① 잔여 UI 4파일 | 파일 4개·에러 4건, 원인 전부 확인됨 | (선택) |
| ② `.test.js` 나머지 strict 정책 | "다룰지 말지" 자체가 미정 | 정책 결정이 먼저 필요 — 스코프 미확정 |
| ③ `.ts`/`.tsx` 실전환 | 보리가 "별도 단계"로 명시적으로 미뤄둠(2026-09-05) | 이미 유예된 항목, 지금 열 필요 없음 |
| ④ 이관 로드맵 잔여(거래처별 세부 보고서 뷰 등) | "새로 만들지 여부"부터 미정 — 사실상 신규 기능 스코핑 | 1회 질문으로 못 끝남(AGENTS §3 "범위 대화 N라운드 금지") |

①만 착수지시서를 바로 쓸 수 있는 상태라서 추천. ②·③·④는 이번 슬라이스 완료 후 별도로 상의.

## 1. 파일별 분석

### 1-A. `src/main.jsx` (14줄, `@ts-check` 없음)

- 에러: `TS2345 Argument of type 'HTMLElement | null' is not assignable to parameter of type 'Container'` — `document.getElementById('root')`가 `createRoot`에 그대로 들어감.
- 수정: null 가드 추가 후 throw(캐스팅 대신 실제 런타임 체크로 좁힘):
  ```js
  const rootEl = document.getElementById('root')
  if (!rootEl) throw new Error('#root not found')
  createRoot(rootEl).render(...)
  ```
- 동작 변경: `#root`가 없으면 지금도 `createRoot(null)` 내부에서 에러가 나므로(암묵적 크래시), 이건 그 크래시를 앱 코드 레벨에서 명시적으로 만드는 것뿐 — 정상 경로(항상 `#root` 존재) 동작은 무변경.
- 소비처 없음(엔트리포인트). 브라우저 검증: 앱이 정상 로드되는지만 확인하면 됨.

### 1-B. `src/app/HydrationRetryBanner.jsx` (62줄, `@ts-check` 없음)

- 에러: `TS7031 Binding element 'showToast' implicitly has an 'any' type`.
- 수정: JSDoc만 추가, 본문 무변경.
  ```js
  /**
   * @param {Object} props
   * @param {(message: string) => void} [props.showToast]
   */
  export default function HydrationRetryBanner({ showToast }) {
  ```
- 소비처: `AppShell.jsx`에서 `<HydrationRetryBanner showToast={showToast} />` 1곳뿐, 항상 함수 전달 — optional로 잡아도 구조적으로 문제 없음(기존 코드도 `showToast?.(...)` 방어 호출).

### 1-C. `src/components/ForgotPasswordModal.jsx` (18줄, `@ts-check` 없음)

- 에러: `TS7031 Binding element 'onClose' implicitly has an 'any' type`.
- 수정: JSDoc만 추가, 본문 무변경.
  ```js
  /**
   * @param {Object} props
   * @param {() => void} props.onClose
   */
  export default function ForgotPasswordModal({ onClose }) {
  ```
- 소비처: `App.jsx`에서 `<ForgotPasswordModal onClose={() => setForgotOpen(false)} />` 1곳뿐.

### 1-D. `src/components/ReportPage.jsx` (162줄, JSDoc 있음·`@ts-check` 없음)

- 에러: `TS2345` — `html2pdf().set(opt)`의 `opt` 리터럴이 `html2pdf.js`의 `Html2PdfOptions`(예: `image.type: "jpeg"|"png"|"webp"`, `jsPDF.orientation: "portrait"|"landscape"`)에 안 맞음. 리터럴 값 자체는 맞는 값인데, 일반 객체 리터럴이라 TS가 필드를 `string`으로 넓게 추론해서 생기는 흔한 추론 문제.
- 수정: 값 변경 없이 컴파일 타임 캐스팅 1줄만 추가(기존 슬라이스들의 §0-D 캐스팅 방침과 동일):
  ```js
  /** @type {import('html2pdf.js').Html2PdfOptions} */
  const opt = {
    margin: [12, 10, 12, 10],
    filename: buildReportFileName(year, month),
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }
  ```
- 이 파일은 이미 컴포넌트 props에 JSDoc이 있음(`@ts-check`만 없던 상태) — 파일 전체에 `@ts-check` 추가 시 strict-inventory(checkJs:true, 동일 strict 규칙)가 이미 이 파일에서 정확히 이 1건만 잡고 있었으므로 추가 에러 없음(사전 확인 완료 — 아래 §2).
- 소비처: `AppShellRoutes.jsx`(lazy route) 1곳, props 구조 무변경.

## 2. 사전 확인 (감시관, 로컬)

- `npx tsc -p tsconfig.strict-inventory.json --noEmit`로 4파일 각각 정확히 1건씩, 합 4건만 나옴을 확인(전체 350건 중 4건).
- 4파일 전부 200줄 이하(14/62/18/162줄) — §6 분리설계 대상 아님.
- AGENTS §4 플레이북 트리거 대상 아님: `src/store/**`·`supabaseClient`·`cloud*`·`hydrate*`·`outbox*`·`mutation*`·`commit*`·`localStorage` 직접 접근·`domain/finance*`·`domain/receivables*` 전부 무관(4파일 다 순수 UI/마운트, 저장·동기화 없음).
- §133(외부 경계 런타임 검증) 대상 없음 — `html2pdf.js` 캐스팅은 라이브러리 옵션 타입이지 외부 데이터가 아님.
- 4파일 소비처 전수 확인(위 1-A~1-D) — 호출부 수정 0.

## 3. 요약 (현재/목표/건드릴 파일/안 건드릴 것/실패 시 처리)

- **현재**: 4파일 `@ts-check` 없음, strict-inventory 4건.
- **목표**: 4파일 `// @ts-check` + 위 최소 수정, strict-inventory 350→346, `npm run typecheck` 계속 0 에러.
- **건드릴 파일(4, 1커밋)**: `src/main.jsx`·`src/app/HydrationRetryBanner.jsx`·
  `src/components/ForgotPasswordModal.jsx`·`src/components/ReportPage.jsx`.
- **안 건드릴 것**: 4파일 소비처(`AppShell.jsx`·`App.jsx`·`AppShellRoutes.jsx`), `lib/report.js`
  등 다른 모듈, 다른 strict-inventory 잔여 항목(`.test.js`·`testSupport/fakeSupabaseClient.js`).
- **실패 시 처리**: 신규 레이어·검증기 없음(§7). 막히면 작업자가 멈추고 보고(AGENTS §3).

## 4. 작업자 구현 완료 보고

- react-app `62640d8` "types: 잔여 UI 4파일에 @ts-check와 최소 타입 수정 추가"
  (작성자 `ya01na111`, co-author Cursor). **push 전(ahead 1)** — 보리 push 대기.
- 변경: 4파일 1커밋(+16/-1) — `main.jsx`(+5/-1)·`HydrationRetryBanner.jsx`(+5)·
  `ForgotPasswordModal.jsx`(+5)·`ReportPage.jsx`(+2).
- **지시서와의 차이 1건(작업자가 사전 보고)**: `ReportPage.jsx`의 `opt` 타입을
  `import('html2pdf.js').Html2PdfOptions` 대신
  `Parameters<InstanceType<(typeof html2pdf)['Worker']>['set']>[0]`로 — `html2pdf.js`의
  `type.d.ts`가 `Html2PdfOptions`를 `export` 없이 모듈 내부 interface로만 선언해서
  `import('html2pdf.js').Html2PdfOptions` 자체가 타입 레벨에서 존재하지 않음(감시관이
  `.d.ts` 직접 확인, §5-3에서 재검증). `Worker`의 `set()` 시그니처에서 역으로 뽑아내는
  방식으로 동일 목적(컴파일 타임 좁히기, 값 무변경) 달성.
- 작업자 보고 숫자: typecheck 0 · strict-inventory 346(−4, 대상 4파일 각 0건) ·
  test:unit 561/561 · app 135/135.

## 5. 감시관 실사 (push 전 사전 실사 — CI 초록 확인은 push 후)

**감시관이 커밋 `62640d8` diff 직접 대조 + typecheck·test·strict-inventory 직접 재실행:**

| # | 확인 | 결과 |
|---|---|---|
| 1 | 범위 준수 | ✅ diff = §3 "건드릴 파일" 4개와 정확히 일치, 그 외 파일 0 |
| 2 | 몰래 증설 없음 | ✅ 신규 파일·저장 키·durable/큐/tombstone/검증기 0. `main.jsx` null 가드는 지시서에 이미 명시된 최소 보정 그대로 |
| 3 | 타입 꼼수 없음 | ✅ diff `^+` grep: `@ts-ignore`/`@ts-expect-error`/`as unknown as`/`: any`/`<any>` **0줄**. `ReportPage.jsx`의 `Parameters<InstanceType<...>['set']>[0]` 식은 라이브러리 자체 타입을 조합해 뽑아낸 것뿐 — 단언·무력화 아님(감시관이 `node_modules/html2pdf.js/type.d.ts` 직접 열어 `Html2PdfOptions`가 non-export interface임을 확인해 작업자 판단이 타당함을 검증) |
| 4 | 200줄 | ✅ 17/67/23/164줄 |
| 5 | 테스트 진실성 | ✅ 이번 슬라이스는 테스트 파일 변경 0(순수 타입 주석 + null 가드 1건). 기존 561+135 테스트 전부 그대로 통과, 약화·삭제 없음 |
| 6 | 문서 정합 | ✅ react-app diff에 `.md` 0 (작업자 규칙 준수) |
| 7 | 요구사항 충족 | ✅ 4파일 전부 `@ts-check` + 지시서 §1 수정 내용 반영(1건은 위 사유로 동등한 대안), 로직·값 변경 0 |

**감시관 직접 재실행** (커밋된 상태 = `62640d8`):
- `npm run typecheck` → **0 에러**
- `npx tsc -p tsconfig.strict-inventory.json --noEmit | grep -cE "error TS"` → **346**
  (350 → **−4**, 지시서 예측치와 정확히 일치). 4파일 grep → **0줄**.
- `npm run test:unit` → **561/561** · `npm test`(app) → **135/135** (fail 0)
→ 작업자 보고 숫자와 완전 일치.

**§4 플레이북 / §133**: 4파일 전부 비대상(저장·동기화·localStorage·Supabase 접근 없음).
신규 검증기 0. §7 증설 0.

**§5 사전 실사 전 항목 통과.** 순수 타입 주석 + 1개 null 가드뿐이라 브라우저 검증은
가벼운 스모크로 충분.

### 브라우저 테스트 (스모크)
> 앱 정상 로드(콘솔 에러 없음, 화면이 뜨는지 = `#root` 마운트 확인) → 로그인 화면에서
> "비밀번호를 잊으셨나요" 모달 열기/닫기 → 리포트 화면에서 PDF 다운로드 1회 정상 동작.
> (`HydrationRetryBanner`는 로직 무변경이라 클라우드 동기화 실패를 일부러 재현할 필요는 없음.)

**다음 단계**: 보리 push → CI "verify" 확인(감시관) → 위 브라우저 스모크(보리) → 최종 `[x]`.
