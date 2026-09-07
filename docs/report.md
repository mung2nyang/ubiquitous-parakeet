# docs/report.md — 착수지시서: 문자 문구 설정 이관 (이관 계획 ②-1)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①(공지사항)은 `[x]` 확정됨 — 상세는 `docs/archive/audit.md`로 옮길 예정,
> 당장은 STATUS.md "완료" 절 참고.
> 보리 승인(2026-09-07, "설정화면만 우선(권장)") — 착수 전 스코프 확인 질문에 대한 답.

## 0. 배경 및 스코프 확인 (질문·답변 기록)

마이페이지 "문자 문구 설정"이 react-app에선 `onOpen('soon', '문자 문구 설정')`로
"준비 중" 스텁 연결. 원본(`ubiquitous-parakeet`)엔 설정화면(`index.html:728-770`,
`mypage.js:86-147`)에서 문구 4종(미수금 안내/입금 요청/운행 완료/내역서 공유)을
편집·저장·초기화하는 기능이 실제로 있음(`script.js:4176-4202`, `1736-1751`).

**착수 전 조사에서 발견한 것(감시관이 보리에게 질문·확인 완료)**: react-app은 이미
콜상세 화면에 문자보내기 기능이 부분 구현돼 있음(`components/day-log/
MessageTemplateSheet.jsx`) — 그런데 원본과 달리 "미수금 안내" 1종만 하드코딩돼
있고 입금요청·운행완료는 없음. 원본의 리포트 화면 카카오톡/문자 공유 기능
(`script.js:1766-1820`, 내역서 공유 문구를 씀)은 react-app에 아예 없음(PDF 다운로드
버튼만 있음, `ReportPage.jsx`).

**보리 결정(2026-09-07)**: 이번 슬라이스는 **설정화면 자체만** 이관한다.
"미수금 안내" 문구는 이번엔 `MessageTemplateSheet.jsx`에 연결하지 않는다(그건
②-2). 즉 이번 슬라이스가 끝나도 저장된 문구 4종은 **아직 어디에도 실제로
소비되지 않는다** — 원본과 화면·저장 동작은 100% 동일하지만, "이 설정이 실제
문자에 반영되는지"는 다음 슬라이스들이 마저 연결한다. 이 사실을 브라우저 검증
시 보리가 인지하고 있어야 함(설정 저장은 되는데 콜상세 문자보내기 화면엔 아직
반영 안 보임 — 정상임, 버그 아님).

**후속 슬라이스로 새로 등재(이번 스코프 아님, `STATUS.md`에도 기록)**:
- 이관 계획 ②-2: 콜상세 문자보내기 시트에 3종 전부 복원(입금요청·운행완료 추가) +
  이번 슬라이스가 저장한 커스텀 문구를 실제로 반영.
- 이관 계획 ②-3: 리포트 화면 카카오톡/문자 공유 기능 자체(신규 기능, `Web Share
  API`/`navigator.share` 파일 첨부 + 문자 링크, 내역서 공유 문구 반영).

## 1. 스코프

**건드릴 파일 6개**:
1. **신규** `react-app/src/lib/messageTemplates.js` — 원본 `script.js:4176-4202`
   (`getDefaultMessageTemplatePatterns`/`getMessageTemplatePatterns`)와
   `script.js:1736-1747`(`getDefaultReportShareMessagePattern`/
   `getReportShareMessagePattern`)를 그대로 포팅 + 저장/초기화 함수 2개 추가
   (원본 mypage.js가 inline으로 하던 `localStorage.setItem`/`removeItem`을 이
   모듈로 옮김 — ②-2/②-3에서 같은 get 함수를 재사용하기 위해 원본처럼 "문구
   read/write는 한 곳"으로 유지, 새 저장 키·새 레이어 없음, 기존 키 2개
   그대로: `messageTemplateCustomBodies`·`reportShareMessagePattern`).
2. **신규** `react-app/src/components/MessageSettingsPage.jsx` — 설정 화면.
   원본 `mypage.js:86-147`의 검증(4개 다 채워야 저장)·토스트 문구·초기화 동작을
   그대로 이관, CSS 클래스명도 원본 그대로 재사용(`message-settings-*`).
3. `react-app/src/side-menu.css` — 원본 `style.css:1662-1749`의
   `.message-settings-*` 규칙 12개를 이 파일 기존 압축 표기(한 줄 1규칙)
   스타일로 옮겨 추가(값 변경 없음, `.support-*` 옆 §7 "새 CSS 레이어 아님").
4. `react-app/src/app/lazyPages.js` — `MessageSettingsPage` lazy export 1줄
   추가.
5. `react-app/src/app/AppShellRoutes.jsx` — import 추가 + 라우트 1줄 추가:
   `<Route path="message-settings" element={<MessageSettingsPage onBack={() => navigate(backTarget)} showToast={showToast} />} />`
   (`backTarget` 재사용, 공지사항과 동일 패턴).
6. `react-app/src/components/MyPage.jsx` — `onClick={() => onOpen('soon', '문자 문구 설정')}`
   → `onClick={() => onOpen('message-settings')}` 1줄 교체.

**안 건드릴 파일**: `MessageTemplateSheet.jsx`(②-2 대상, 이번엔 무변경),
`ReportPage.jsx`(②-3 대상), `ComingSoonRoute.jsx`, 원본 `ubiquitous-parakeet/*`
(읽기 참고만), 그 외 전부.

**PAGE_PATH 매핑 불필요**: 공지사항과 동일 이유로 `onOpen('message-settings')`
→ `/app/message-settings` 자동 연결(`AppShell.jsx:41-44`, 무변경 재사용).

## 2. 코드 내용

### 2-1. `src/lib/messageTemplates.js` (신규, 원본 로직 그대로)

```js
// @ts-check

const CUSTOM_BODIES_KEY = 'messageTemplateCustomBodies'
const REPORT_SHARE_KEY = 'reportShareMessagePattern'

/** @returns {[string, string, string]} */
export function getDefaultMessageTemplatePatterns() {
  return [
    '안녕하세요, {거래처} 담당자님. {운행구간} 운송료 {운송료}원이 미수 상태입니다. 확인 부탁드립니다.',
    '안녕하세요. {운행구간} 운송 건 운송료 {운송료}원 입금 부탁드립니다. 감사합니다.',
    '안녕하세요, {거래처} 담당자님. {운행구간} 운행이 완료되었습니다. 이용해 주셔서 감사합니다.',
  ]
}

/** @returns {[string, string, string]} */
export function getMessageTemplatePatterns() {
  const defaults = getDefaultMessageTemplatePatterns()
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_BODIES_KEY) || 'null')
    if (!Array.isArray(saved) || saved.length !== defaults.length) return defaults
    return /** @type {[string, string, string]} */ (
      defaults.map((body, index) => String(saved[index] || body))
    )
  } catch {
    return defaults
  }
}

/** @returns {string} */
export function getDefaultReportShareMessagePattern() {
  return '안녕하세요, {거래처} 담당자님. 운송비 내역서입니다. 확인 부탁드립니다.'
}

/** @returns {string} */
export function getReportShareMessagePattern() {
  try {
    return localStorage.getItem(REPORT_SHARE_KEY)?.trim() || getDefaultReportShareMessagePattern()
  } catch {
    return getDefaultReportShareMessagePattern()
  }
}

/**
 * @param {[string, string, string]} patterns
 * @param {string} reportMessage
 */
export function saveMessageTemplateSettings(patterns, reportMessage) {
  localStorage.setItem(CUSTOM_BODIES_KEY, JSON.stringify(patterns))
  localStorage.setItem(REPORT_SHARE_KEY, reportMessage)
}

export function resetMessageTemplateSettings() {
  localStorage.removeItem(CUSTOM_BODIES_KEY)
  localStorage.removeItem(REPORT_SHARE_KEY)
}
```

- 저장 실패(quota 등)·읽기 실패(파싱 실패·getItem 예외) 모두 원본과 동일하게
  기본값으로 폴백(§133: 새 검증기 없음, 원본의 `try/catch` 그대로).
- `saveMessageTemplateSettings`/`resetMessageTemplateSettings`는 그대로
  `localStorage` 예외를 던진다(원본 mypage.js가 호출부에서 catch하던 구조를
  페이지 컴포넌트로 그대로 옮김 — 아래 2-2 참고).

### 2-2. `src/components/MessageSettingsPage.jsx` (신규)

```jsx
// @ts-check
import { useState } from 'react'
import {
  getDefaultMessageTemplatePatterns,
  getDefaultReportShareMessagePattern,
  getMessageTemplatePatterns,
  getReportShareMessagePattern,
  resetMessageTemplateSettings,
  saveMessageTemplateSettings,
} from '../lib/messageTemplates.js'

/**
 * @param {Object} props
 * @param {() => void} [props.onBack]
 * @param {(message: string) => void} [props.showToast]
 */
export default function MessageSettingsPage({ onBack, showToast }) {
  const initial = getMessageTemplatePatterns()
  const [unpaid, setUnpaid] = useState(initial[0])
  const [paymentRequest, setPaymentRequest] = useState(initial[1])
  const [tripComplete, setTripComplete] = useState(initial[2])
  const [reportShare, setReportShare] = useState(getReportShareMessagePattern())

  function handleSave() {
    const unpaidMessage = unpaid.trim()
    const paymentRequestMessage = paymentRequest.trim()
    const tripCompleteMessage = tripComplete.trim()
    const reportMessage = reportShare.trim()

    if (!unpaidMessage || !paymentRequestMessage || !tripCompleteMessage || !reportMessage) {
      showToast?.('모든 문자 문구를 입력해 주세요.')
      return
    }

    try {
      saveMessageTemplateSettings([unpaidMessage, paymentRequestMessage, tripCompleteMessage], reportMessage)
      showToast?.('문자 문구를 저장했습니다.')
    } catch (error) {
      console.error('문자 문구 저장 실패:', error)
      showToast?.('문자 문구를 저장하지 못했습니다.')
    }
  }

  function handleReset() {
    try {
      resetMessageTemplateSettings()
    } catch (error) {
      console.error('기본 문자 문구 복원 실패:', error)
      showToast?.('기본 문구를 복원하지 못했습니다.')
      return
    }
    const defaults = getDefaultMessageTemplatePatterns()
    setUnpaid(defaults[0])
    setPaymentRequest(defaults[1])
    setTripComplete(defaults[2])
    setReportShare(getDefaultReportShareMessagePattern())
    showToast?.('기본 문구로 복원했습니다.')
  }

  return (
    <div className="page message-settings-page">
      <div className="settings-header">
        <button type="button" className="icon-btn" title="뒤로가기" onClick={onBack}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div className="settings-title">문자 문구 설정</div>
        <div style={{ width: 40 }}></div>
      </div>

      <section className="message-settings-section">
        <div className="message-settings-heading">
          <h3>미수금 안내 문자</h3>
          <p>운행일지의 미수금 문자보내기에 사용됩니다.</p>
        </div>
        <textarea className="message-settings-textarea" maxLength={500} aria-label="미수금 안내 문자 문구" value={unpaid} onChange={(e) => setUnpaid(e.target.value)} />
        <p className="message-settings-variables"><b>자동 입력:</b> {'{거래처} · {운행구간} · {운송료}'}</p>
      </section>

      <section className="message-settings-section">
        <div className="message-settings-heading">
          <h3>입금 요청 문자</h3>
          <p>운행일지의 입금 요청 문자보내기에 사용됩니다.</p>
        </div>
        <textarea className="message-settings-textarea" maxLength={500} aria-label="입금 요청 문자 문구" value={paymentRequest} onChange={(e) => setPaymentRequest(e.target.value)} />
        <p className="message-settings-variables"><b>자동 입력:</b> {'{거래처} · {운행구간} · {운송료}'}</p>
      </section>

      <section className="message-settings-section">
        <div className="message-settings-heading">
          <h3>운행 완료 문자</h3>
          <p>운행일지의 운행 완료 문자보내기에 사용됩니다.</p>
        </div>
        <textarea className="message-settings-textarea" maxLength={500} aria-label="운행 완료 문자 문구" value={tripComplete} onChange={(e) => setTripComplete(e.target.value)} />
        <p className="message-settings-variables"><b>자동 입력:</b> {'{거래처} · {운행구간} · {운송료}'}</p>
      </section>

      <section className="message-settings-section">
        <div className="message-settings-heading">
          <h3>운송비 내역서 공유 문구</h3>
          <p>카카오톡과 문자 공유에 함께 포함됩니다.</p>
        </div>
        <textarea className="message-settings-textarea" maxLength={500} aria-label="운송비 내역서 공유 문구" value={reportShare} onChange={(e) => setReportShare(e.target.value)} />
        <p className="message-settings-variables"><b>자동 입력:</b> {'{거래처}'}</p>
      </section>

      <div className="message-settings-actions">
        <button type="button" className="message-settings-reset" onClick={handleReset}>기본 문구로 복원</button>
        <button type="button" className="message-settings-save" onClick={handleSave}>저장</button>
      </div>
    </div>
  )
}
```

- 원본과 화면 문구·순서·검증 메시지·초기화 동작 100% 동일. `runSaveAction`
  래퍼(로딩 스피너용)는 원본 특유의 DOM 헬퍼라 React 쪽엔 없음 — 기존
  `BillingSettingsPage.jsx` 등도 동일하게 안 씀(선례, 새로 안 만듦).
- **의도적으로 `useOwnerSettings`/`savePracticeSettings`(Supabase 동기화) 안 씀**
  — 원본 문구 설정은 기기 로컬 전용(계정 간 동기화 대상 아님).
- **알려진 이슈(이번 스코프 아님)**: 원본은 이 두 키(`APP_BACKUP_TEXT_KEYS`)가
  게스트 백업 내보내기/가져오기 대상인데, react-app `lib/guestBackup.js`는
  `SLICE_DOMAINS`(cars/clients/settings/expenses/invoices/drivers/profile/
  workData 등)만 백업해 `messageTemplateCustomBodies`·`reportShareMessagePattern`은
  포함 안 됨(직접 코드 확인 완료 — 자동 포함 아님). 게스트가 백업 내보내기→가져오기
  하면 문자 문구 설정이 초기화된다는 뜻이지만, `dismissedNotifications`/
  `workDataDeletedDates`도 이미 같은 구조적 한계로 "알려진 이슈"로 남아있는 것과
  동일 성격이라 이번 슬라이스에서 새로 고치지 않음(범위 밖, 필요해지면 별도 논의).

### 2-3. `src/side-menu.css` 추가분 (기존 `.support-*` 규칙 옆에)

```css
.message-settings-section { margin-bottom: 10px; padding: 14px; border: 1px solid var(--border-color); border-radius: 16px; background: var(--card-bg); box-shadow: var(--shadow-sm); }
.message-settings-heading { margin-bottom: 10px; }
.message-settings-heading h3, .message-settings-heading p, .message-settings-variables { margin: 0; }
.message-settings-heading h3 { color: var(--text-color); font-size: var(--fs-3); font-weight: 850; }
.message-settings-heading p { margin-top: 4px; color: var(--sub-text-color); font-size: var(--fs-floor); line-height: 1.45; }
.message-settings-textarea { display: block; width: 100%; min-height: 104px; padding: 11px 12px; resize: vertical; border: 1px solid var(--border-color); border-radius: 12px; outline: none; box-sizing: border-box; background: var(--input-bg); color: var(--text-color); font: inherit; font-size: var(--fs-2); font-weight: 500; line-height: 1.55; }
.message-settings-variables { margin-top: 8px; color: var(--sub-text-color); font-size: var(--fs-floor); line-height: 1.4; }
.message-settings-variables b { color: var(--primary-color); }
.message-settings-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.message-settings-actions button { min-height: 44px; margin: 0; border-radius: 12px; font: inherit; font-size: var(--fs-floor); font-weight: 850; cursor: pointer; }
.message-settings-reset { border: 1px solid var(--border-color); background: var(--input-bg); color: var(--sub-text-color); }
.message-settings-save { border: 1px solid var(--primary-color); background: var(--primary-color); color: #ffffff; }
```

값은 원본 `style.css:1662-1749`와 동일, 표기만 `side-menu.css` 기존 압축 스타일
(한 줄 1규칙)에 맞춤. 필요한 CSS 변수(`--card-bg`·`--border-color`·`--text-color`·
`--sub-text-color`·`--primary-color`·`--input-bg`·`--shadow-sm`·`--fs-2`·`--fs-3`·
`--fs-floor`) 전부 `account-flow.css` `:root`에 이미 정의돼 있어 새 토큰 없음(확인
완료).

## 3. 테스트 계획

- **§4 플레이북 열람 완료**: `docs/testing-playbook.md` 확인함 — Supabase
  원격 mutation·durable journal·tombstone·hydrate/세션 경합이 이 슬라이스엔
  전혀 없음(순수 로컬 `localStorage` 키 2개, 원본도 마찬가지로 단순 try/catch뿐).
  플레이북의 실패주입 매트릭스(§3)·세대검증(§5) 등은 원격/durable 경로가 없어
  대부분 N/A — `lib/guestBackup.js`(비슷한 성격의 플레인 로컬 키) 선례와 동일
  수준으로 취급.
- **신규 테스트**: `src/lib/messageTemplates.test.js` —
  1. 저장된 값 없을 때 `getMessageTemplatePatterns`/`getReportShareMessagePattern`이
     기본값 반환.
  2. `saveMessageTemplateSettings` 후 `getMessageTemplatePatterns`가 저장한 값
     반환(순서 보존).
  3. `localStorage.getItem` 예외 발생 시 기본값 폴백(원본 동작 재현).
  4. 저장된 배열 길이가 다르거나(JSON 스키마 불일치) 파싱 실패 시 기본값 폴백.
  5. `resetMessageTemplateSettings` 후 다시 기본값으로 돌아옴.
  - 컴포넌트 자체 테스트는 안 만듦(선례: `guestBackup.js`도 `AppSettingsPage`
    백업 섹션 전용 컴포넌트 테스트 없이 도메인 함수 테스트만 있음, 화면은
    브라우저 실검증으로 커버).
- **§6 200줄**: `messageTemplates.js` 약 45줄, `MessageSettingsPage.jsx` 약
  100줄 — 둘 다 여유 있음.
- **CI**: `npm test`+`npm run typecheck`+`npm run build` 3게이트.
- **브라우저 실검증(보리)**:
  1. 마이페이지 → "문자 문구 설정" 클릭 → 원본과 동일한 기본 문구 4개 보임
  2. 아무 문구나 수정 → 저장 → 토스트 "문자 문구를 저장했습니다."
  3. 뒤로가기 → 다시 들어가면 수정한 문구가 유지되는지(새로고침 없이/후 둘 다)
  4. "기본 문구로 복원" → 원래 문구로 돌아가는지 + 토스트 "기본 문구로
     복원했습니다."
  5. 문구 하나를 빈 칸으로 지우고 저장 → "모든 문자 문구를 입력해 주세요." 토스트,
     저장 안 됨
  6. **(중요, 버그 아님)** 콜상세 화면 "문자 보내기"는 아직 "미수금 안내" 문구가
     이 설정과 무관하게 하드코딩 그대로 나옴 — ②-2에서 연결 예정.

## 4. 실패 시 처리

새 durable/fallback 레이어 없음(§7 해당 없음) — 저장 실패 시 원본과 동일하게
토스트만 띄우고 끝(재시도 큐 없음, 원본에도 없던 것이므로 신규로 안 만듦).

## 5. 다음 슬라이스 예고

이 슬라이스가 CI 초록·보리 `[x]` 확정되면, 이관 계획 ②-2(콜상세 문자보내기
시트 3종 복원 + 이번 슬라이스 설정 반영) 착수지시서를 이 파일에 다시 작성.

## 6. 감시관 §5 리뷰 — CI 초록 확인 (2026-09-07)

작업자 커밋 `a833280`(react-app), 보리 push, origin/main과 일치, 작업 트리 clean.

- `gh run view 34106103395`: `headSha`=`a833280f8448258829595beb4f1be3a7592de031`
  (커밋과 일치), `conclusion`=`success`, "테스트 (npm test)"·"타입 검사 (npm run
  typecheck)"·"빌드 (npm run build)" 3단계 전부 success.
- **diff가 지시서 §2와 byte 단위로 일치**: `lib/messageTemplates.js`(55줄)·
  `components/MessageSettingsPage.jsx`(112줄) 전부 지시서 코드 블록 그대로,
  `side-menu.css`(+12, 기존 압축 포맷 유지)·`lazyPages.js`(+1)·
  `AppShellRoutes.jsx`(+2, import+라우트)·`MyPage.jsx`(+1/-1) 전부 지시서
  §1 그대로. 지난 슬라이스 때 지적했던 "여분 빈 줄" 같은 편차 이번엔 없음.
- **신규 테스트**: `messageTemplates.test.js`(84줄, 5케이스) — 지시서 §3 계획
  5가지 시나리오(기본값 폴백·저장 후 순서 보존·getItem 예외 폴백·스키마 불일치
  폴백·reset) 전부 커버. private 변수 직접 조작 없이 실제 `localStorage`
  Storage API를 최소 in-memory 구현으로 대체해 공개 함수만 호출 → 실제 동작
  경로 검증. `beforeEach`로 매 테스트 격리.
- **§4 플레이북 판단 재확인**: Supabase mutation·durable journal·tombstone·
  hydrate 경합 전부 없음(순수 로컬 `localStorage` 키 2개) — 감시관이 코드
  직접 읽어 재확인, 지시서 §3 판단과 일치.
- **§5 1~7항목**: 범위(6개+테스트 1개 파일, 지시서와 일치) · 증설(신규 저장
  키·durable·큐 없음, 기존 키 2개 그대로) · 타입 꼼수(전체 diff grep `any`/
  `ts-ignore`/`ts-expect-error`/`as unknown as` 0건) · 200줄(55/84/112줄 전부
  여유) · 테스트 진실성(위 참고, 기존 테스트 약화 없음) · 문서 정합(`.md`
  변경 0) · 요구사항(지시서 §2 코드와 완전 일치) — 전부 통과.
- **감시관이 직접 로컬 재실행**: `npm run typecheck` 0건 · `npm test` 598+138
  전부 pass(기존 593+138에서 신규 5개 증가, fail 0) · `npm run build` 성공,
  `dist/assets/MessageSettingsPage-*.js`(4.72kB) 청크 생성 확인. 빌드 로그에
  `[esbuild css minify] Unexpected "}" [css-syntax-error]`(같은 줄 번호)가
  뜨는데, 직전 커밋(`41e9fd9`)으로 되돌려 빌드해도 동일하게 뜨는 걸 확인함 —
  이 슬라이스가 새로 만든 문제 아니라 기존에 있던 무관한 경고(원인은 별도
  조사 필요하면 차후 백로그).

**결론**: §5 7항목 전부 통과 + 실제 CI green 확인 완료. 남은 건 보리 브라우저
실검증뿐:
1. 마이페이지 → "문자 문구 설정" 클릭 → 기본 문구 4개(미수금 안내/입금
   요청/운행 완료/내역서 공유) 보임
2. 아무 문구나 수정 → 저장 → "문자 문구를 저장했습니다." 토스트
3. 뒤로가기 → 다시 들어가면 수정한 문구 유지되는지
4. "기본 문구로 복원" → 원래 문구로 돌아가고 "기본 문구로 복원했습니다." 토스트
5. 문구 하나를 빈 칸으로 지우고 저장 → "모든 문자 문구를 입력해 주세요." 토스트,
   저장 안 됨
6. (버그 아님, 확인만) 콜상세 "문자 보내기"는 아직 이 설정과 무관 — ②-2에서 연결

통과하면 보리가 `[x]` 확정 → 이관 계획 ②-2 착수지시서 작성.
