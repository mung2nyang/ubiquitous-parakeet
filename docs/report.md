# docs/report.md — 착수지시서: 콜상세 문자보내기 3종 복원 + ②-1 설정 반영 (이관 계획 ②-2)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①(공지사항)·②-1(문자 문구 설정 화면)은 `[x]` 확정됨 — 상세는
> `STATUS.md` "완료" 절 참고.

## 0. 배경

react-app 콜상세 화면(`DayLogPage.jsx`)의 "문자 보내기" 버튼은 미수 상태인
콜상세에서만 보이고(`CallDetailCard.jsx:81`, 원본 `settings.paymentOn && unpaid`
조건과 동일 — 이 부분은 이미 맞게 배선돼 있어 무변경), 누르면 `MessageTemplateSheet.jsx`
가 뜬다. 그런데 지금 이 시트는 "미수금 안내" 문구 1종만 하드코딩돼 있어
원본(`script.js:4204-4247`)의 3종 선택 시트(미수금 안내/입금 요청/운행 완료)와
다르고, ②-1에서 새로 만든 `lib/messageTemplates.js`의 커스텀 저장 문구도 전혀
읽지 않는다(하드코딩 문자열 그대로).

## 1. 스코프

**건드릴 파일 3개**:
1. `react-app/src/lib/messageTemplates.js` — 원본 `script.js:4197-4202`의
   `fillMessageTemplatePattern(pattern, values)` 함수 추가(순수 함수, 기존
   4개 함수 옆에 그대로 포팅). 새 저장 키·새 함수 시그니처 변경 없음, 추가만.
2. `react-app/src/components/day-log/MessageTemplateSheet.jsx` — 전체 재작성.
   지금은 하드코딩 문구 1개짜리 버튼 하나만 있는데, 원본처럼 `getMessageTemplatePatterns()`
   (②-1에서 만든 함수, 커스텀 저장값 있으면 그 값·없으면 기본값 반환)로 3개
   문구를 가져와 각각 `fillMessageTemplatePattern`으로 채운 뒤 3개 버튼 목록으로
   보여준다. SMS 발송 시 URL 생성 로직(`sms:` 스킴, iPhone 분기)은 기존 그대로
   유지, 함수명만 `buildTemplateSmsUrl`로 테스트 가능하게 export.
3. **신규** `react-app/src/components/day-log/MessageTemplateSheet.test.js` —
   아래 §3 테스트 계획대로.

**안 건드릴 파일**: `CallDetailCard.jsx`(문자 보내기 버튼 표시 조건 이미 원본과
일치 — `settings.paymentOn && unpaid`, 확인 완료, 무변경) · `DayLogPage.jsx`
(시트 마운트·`messageItem`/`client` 전달 배선 이미 정상, 무변경) · CSS(기존
`.message-template-*` 클래스 그대로 재사용, 새 클래스 0개) · 원본
`ubiquitous-parakeet/*`(읽기 참고만).

## 2. 코드 내용

### 2-1. `src/lib/messageTemplates.js`에 추가할 함수 (파일 끝에 추가)

```js
/**
 * @param {string} pattern
 * @param {{ company: string, route: string, fare: string }} values
 * @returns {string}
 */
export function fillMessageTemplatePattern(pattern, values) {
  return String(pattern)
    .replaceAll('{거래처}', values.company)
    .replaceAll('{운행구간}', values.route)
    .replaceAll('{운송료}', values.fare)
}
```

원본 `script.js:4197-4202`와 로직 완전히 동일(치환 순서·플레이스홀더 문자열
그대로). 기존 4개 함수(`getDefaultMessageTemplatePatterns` 등)는 무변경.

### 2-2. `src/components/day-log/MessageTemplateSheet.jsx` (전체 재작성)

```jsx
// @ts-check
import { parseCurrencyValue } from '../../domain/money.js'
import { fillMessageTemplatePattern, getMessageTemplatePatterns } from '../../lib/messageTemplates.js'

/** @typedef {import('./dayLogTypes.js').CallDetailLike} CallDetailLike */
/** @typedef {import('./dayLogTypes.js').ClientLike} ClientLike */

const TEMPLATE_TITLES = ['미수금 안내', '입금 요청', '운행 완료']

/**
 * @param {string} phone
 * @param {string} body
 */
export function buildTemplateSmsUrl(phone, body) {
  const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?'
  return `sms:${phone}${separator}body=${encodeURIComponent(body)}`
}

/**
 * @param {Object} props
 * @param {CallDetailLike} props.item
 * @param {ClientLike|undefined} props.client
 * @param {() => void} props.onClose
 */
export default function MessageTemplateSheet({ item, client, onClose }) {
  const fare = parseCurrencyValue(item.fare).toLocaleString('ko-KR')
  const route = `${item.loadLoc || '상차지'} → ${item.unloadLoc || '하차지'}`
  const company = item.client || '거래처'
  const templates = getMessageTemplatePatterns().map((pattern, index) => ({
    title: TEMPLATE_TITLES[index],
    body: fillMessageTemplatePattern(pattern, { company, route, fare }),
  }))

  function send(body) {
    const phone = client?.phone || ''
    if (!phone) {
      window.alert('거래처에 등록된 연락처가 없습니다.')
      return
    }
    window.location.href = buildTemplateSmsUrl(phone, body)
    onClose()
  }

  return (
    <div className="message-template-overlay" onClick={onClose}>
      <section className="message-template-sheet" role="dialog" aria-modal="true" aria-label="문자 양식 선택" onClick={(e) => e.stopPropagation()}>
        <div className="message-template-head">
          <div>
            <strong>문자 보내기</strong>
            <span>{company}{client?.phone ? ` · ${client.phone}` : ''}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <p className="message-template-help">보낼 양식을 선택하면 문자 앱에서 내용을 확인하고 수정할 수 있습니다.</p>
        <div className="message-template-list">
          {templates.map((template) => (
            <button type="button" key={template.title} onClick={() => send(template.body)}>
              <strong>{template.title}</strong>
              <span>{template.body}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- **`<span>{template.body}</span>` — 실제 채워진 문구를 미리보기로 보여줌**
  (원본 `script.js:4230`의 `${escapeDetailText(template.body)}`와 동일 동작).
  지금 react-app 버전은 "선택한 거래처로 미수 안내 문자를 보냅니다." 같은
  일반 설명 문구를 보여주고 있었는데, 이건 원본에 없던 축약이었음 — 이번에
  원본대로 실제 문구 미리보기로 되돌림(§7: 새 레이어 아님, 기존 축약을
  원본 스펙으로 복원).
- `onClose`는 연락처 없을 때(alert만 뜨는 경로)는 호출 안 함 — 원본
  `openMessageTemplate`도 클라이언트 연락처 없으면 시트 자체를 안 열고
  모달만 띄우는 것과 동일한 취지(시트를 닫지 않아야 사용자가 다른 템플릿을
  더 시도하거나 취소를 명시적으로 누를 수 있음).
- `buildTemplateSmsUrl`을 export하는 이유는 테스트에서 실제 `window.location`
  네비게이션을 트리거하지 않고 URL 생성 로직만 검증하기 위함(§3 참고, jsdom이
  `sms:` 스킴 네비게이션을 지원하지 않아 실제 대입은 테스트에서 피함).

## 3. 테스트 계획

- **§4 플레이북 비대상**: 순수 로컬 읽기(`localStorage`)+렌더링, 원격/durable
  경로 없음(②-1과 동일 판단).
- **신규 테스트**: `MessageTemplateSheet.test.js` — 기존 `CallDetailList.test.js`
  패턴(jsxLoaderHook+setupDom+createRoot+act) 재사용.
  1. 저장된 커스텀 문구 없을 때 — 3개 버튼이 `TEMPLATE_TITLES` 순서로 보이고,
     첫 버튼(미수금 안내) 본문에 기본 패턴을 거래처/운행구간/운송료로 채운
     텍스트가 그대로 보이는지.
  2. **(핵심, ②-1 연결 증명)** `saveMessageTemplateSettings`로 커스텀 문구
     3개를 저장한 뒤 렌더 — 시트에 하드코딩 기본 문구가 아니라 저장한
     커스텀 문구가 채워져서 보이는지.
  3. 거래처 연락처(`client.phone`)가 없을 때 아무 버튼이나 클릭 — `window.alert`
     가 정확한 메시지("거래처에 등록된 연락처가 없습니다.")로 1회 호출되고
     `onClose`는 호출되지 않는지(`mock.method(window, 'alert', ...)` 사용,
     기존 `App.guestDurable.test.js`의 `mock.method(window, 'confirm', ...)`
     선례와 동일 패턴).
  4. `buildTemplateSmsUrl(phone, body)` 순수 함수 직접 호출 — 기본 UA(jsdom,
     iPhone 아님)에서 구분자 `?`, `encodeURIComponent`로 본문이 인코딩되는지.
     (iPhone UA 분기는 `navigator.userAgent`를 임시로 재정의해 `&` 구분자
     확인 — 실제 `window.location.href` 대입은 하지 않음, jsdom이 `sms:`
     스킴 네비게이션을 지원하지 않아 실제 클릭→이동 경로는 테스트 대상에서
     제외하고 URL 생성 로직만 순수 함수로 분리 검증).
  - 기존 회귀 없음: `CallDetailCard.jsx`/`DayLogPage.jsx`는 무변경이라 관련
    기존 테스트(`CallDetailList.test.js`) 그대로 통과해야 함.
- **§6 200줄**: `MessageTemplateSheet.jsx` 약 55줄, `messageTemplates.js`는
  기존 55줄+7줄 추가로 62줄 — 둘 다 여유.
- **CI**: `npm test`+`npm run typecheck`+`npm run build` 3게이트.
- **브라우저 실검증(보리)**:
  1. 아무 콜상세 항목(운행일지)의 미수 건에서 "문자 보내기" 버튼 클릭 →
     이제 문구 3개(미수금 안내/입금 요청/운행 완료)가 보이는지(예전엔 1개만)
  2. 각 문구 미리보기에 거래처명·운행구간·운송료가 실제로 채워져서 보이는지
  3. 마이페이지 → 문자 문구 설정에서 "미수금 안내" 문구를 수정·저장 → 다시
     콜상세로 가서 문자 보내기 시트를 열면 방금 수정한 문구가 보이는지
     (②-1↔②-2 연결 확인, 이번 슬라이스의 핵심 목표)
  4. 연락처 없는 거래처 콜상세에서 문자 보내기 클릭 → "거래처에 등록된
     연락처가 없습니다." 안내, 시트는 계속 열려있는지
  5. 연락처 있는 거래처에서 문구 하나 선택 → 실제 기기/브라우저에서 문자
     앱으로 넘어가는지(환경상 어려우면 URL만 확인해도 됨)

## 4. 실패 시 처리

새 저장소·durable/fallback 레이어 없음(§7 해당 없음) — 순수 표시·URL 생성
로직 재구성, 저장 실패 개념 자체가 없음(읽기 전용 소비).

## 5. 다음 슬라이스 예고

이 슬라이스가 CI 초록·보리 `[x]` 확정되면, 이관 계획 ②-3(리포트 카카오톡/
문자 공유 기능 신규 이관, 내역서 공유 문구 반영) 착수지시서를 이 파일에
다시 작성. 이걸로 이관 계획 ②(문자 문구 설정 전체) 완료.

## 6. 감시관 §5 리뷰 — CI 초록 확인 (2026-09-07)

작업자 커밋 `a03d983`(react-app), 보리 push, origin/main과 일치, 작업 트리 clean.

- `gh run view 34107868770`: `headSha`=`a03d983fd3f8f7ae1444f3712fc5518277e2195a`
  (커밋과 일치), `conclusion`=`success`, 테스트·타입검사·빌드 3단계 전부 success.
- **diff가 지시서 §2와 byte 단위 일치**: `messageTemplates.js`에 추가된
  `fillMessageTemplatePattern`(+12줄) 그대로, `MessageTemplateSheet.jsx`
  전체 재작성분(67줄)도 지시서 코드 블록과 완전히 동일(작업자가 `send`
  함수에 JSDoc 한 줄 `@param {string} body`를 추가로 붙인 것 외엔 차이 없음
  — 사소한 품질 개선, 문제 아님). `CallDetailCard.jsx`/`DayLogPage.jsx`는
  `git show --stat`에도 안 나옴 — 무변경 확인.
- **신규 테스트**: `MessageTemplateSheet.test.js`(154줄, 4케이스) — 지시서
  §3 계획 4가지 시나리오 전부 커버:
  1. 기본 문구로 3개 버튼 제목 순서(`미수금 안내`/`입금 요청`/`운행 완료`)
     + 첫 버튼 본문이 `fillMessageTemplatePattern`으로 채운 텍스트와 정확히
     일치.
  2. **핵심**: `saveMessageTemplateSettings`로 커스텀 문구 저장 후 렌더 —
     시트 미리보기 3개가 커스텀 문구로 채워짐(②-1↔②-2 연결이 실제로
     동작함을 증명, 하드코딩 문자열이 아니라 저장값을 읽는지 직접 확인).
  3. 연락처 없을 때 `mock.method(window, 'alert', ...)`로 호출 횟수 1회·
     정확한 메시지 인자·`onClose` 호출 0회 전부 assert.
  4. `buildTemplateSmsUrl` 순수 함수를 기본 UA·iPhone UA(임시 재정의 후
     `finally`에서 원복) 양쪽으로 직접 호출해 구분자(`?`/`&`) 검증 —
     jsdom이 `sms:` 스킴 네비게이션을 지원하지 않는 문제를 실제
     `window.location.href` 대입 없이 우회(지시서 §2-2 의도대로).
  - private 변수·내부 Map 직접 조작 없이 전부 실제 렌더·클릭·공개 함수
    호출 경로로 검증(§6 테스트 품질 기준 충족).
- **§4 플레이북 판단 재확인**: 순수 렌더+로컬 읽기, 원격/durable 경로 없음
  — 지시서 §3 판단과 일치.
- **§5 1~7항목**: 범위(정확히 3개 파일) · 증설(신규 저장 없음, 순수 함수/
  컴포넌트 재구성) · 타입 꼼수(diff 전체 grep `any`/`ts-ignore`/
  `ts-expect-error`/`as unknown as` 0건) · 200줄(67/67/154줄 전부 여유) ·
  테스트 진실성(위 참고) · 문서 정합(`.md` 변경 0) · 요구사항(지시서와
  완전 일치, `CallDetailCard.jsx` 표시 조건도 재확인해 무변경임을 검증) —
  전부 통과.
- **감시관이 직접 로컬 재실행**: `npm run typecheck` 0건 · `npm test`
  598+142(전체 day-log 스위트 그룹이 138→142로 +4, 나머지 그룹 598 그대로)
  전부 pass, fail 0 · `npm run build` 성공. 테스트 실행 중 "not wrapped in
  act" 경고 3건이 뜨는데, 이 슬라이스의 파일들을 이전 커밋으로 되돌리고
  신규 테스트 파일을 삭제한 뒤 재실행해도 **똑같이 3건**이 떠서 이 슬라이스가
  새로 만든 문제가 아님을 확인함(기존 다른 테스트 파일 쪽 이슈, 별도
  조사 필요하면 차후 백로그).

**결론**: §5 7항목 전부 통과 + 실제 CI green 확인 완료. 남은 건 보리 브라우저
실검증뿐:
1. 미수 상태인 콜상세(운행일지)에서 "문자 보내기" 버튼 클릭 → 이제 문구
   3개(미수금 안내/입금 요청/운행 완료)가 보이는지
2. 각 미리보기에 거래처명·운행구간·운송료가 실제로 채워져 보이는지
3. 마이페이지 → 문자 문구 설정에서 "미수금 안내" 문구 수정·저장 → 콜상세로
   돌아가 문자 보내기 시트를 다시 열면 방금 수정한 문구가 보이는지(이번
   슬라이스의 핵심 목표)
4. 연락처 없는 거래처 콜상세에서 문자 보내기 클릭 → 안내 메시지, 시트는
   계속 열려있는지

통과하면 보리가 `[x]` 확정 → 이관 계획 ②-3 착수지시서 작성.
