# docs/report.md — 착수지시서: 리포트 카카오톡/문자 공유 모달 (이관 계획 ②-4)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①·②-1·②-2·②-3은 `[x]` 확정됨 — 상세는 `STATUS.md` "완료" 절 참고.
> 이 슬라이스가 끝나면 이관 계획 ② 전체 완료.

## 0. 배경

원본 리포트 화면 "PDF 메뉴" 드롭다운의 마지막 버튼 "거래처에 파일 보내기"
(`index.html:80`, `openReportShareModal`)는 모달을 띄워 **카카오톡**(Web
Share API로 파일+문구 공유) 또는 **문자**(파일 다운로드 후 `sms:` 링크)로
PDF 또는 이미지를 보낼 수 있게 한다(`script.js:1660-1830`). react-app엔
지금 이 기능이 전혀 없다.

**⚠️ 이번 슬라이스는 크다 — 신규 파일 2개+테스트 1개, 기존 파일 4개 수정,
총 7개 파일.** ②-3 때 보리에게 미리 알린 대로(파일 5~6개 예상) 진행한다.

## 1. 스코프

**신규 파일 2개**:
1. `react-app/src/lib/reportExport.js` — `element`(내보낼 DOM)로부터 PNG/PDF
   `File` 객체를 만드는 함수 2개. 원본 `script.js:1667-1679`
   (`createReportCanvasFromElement`)·`1723-1733`(`createReportFile`)를
   그대로 포팅.
2. `react-app/src/components/ReportShareModal.jsx` — 공유 모달. 원본
   `index.html:2165-2183`(마크업)+`script.js:1714-1715, 1753-1830`(로직)를
   포팅.

**신규 테스트 1개**:
3. `react-app/src/components/ReportShareModal.test.js` — §3 참고.

**기존 파일 수정 4개**:
4. `react-app/src/lib/messageTemplates.js` — `fillReportShareMessagePattern`
   함수 추가(원본 `script.js:1749-1751`).
5. `react-app/src/lib/report.js` — `getReportShareCompanyName`·
   `getDetailReportClientContact` 순수 함수 2개 추가(원본 `script.js:1716-1721,
   1753-1757`을 컴포넌트 state를 인자로 받는 순수 함수로 포팅 — 원본은
   전역 변수 `isDetailReportView`/`currentDetailClientFilter`를 직접 읽지만
   react-app은 그 값들이 `ReportPage.jsx`의 지역 state라 인자로 받아야 함).
6. `react-app/src/lib/report.test.js` — 위 2개 함수 테스트 추가.
7. `react-app/src/components/ReportPage.jsx` — "이미지 저장" 버튼 옆에 "공유"
   버튼 추가 + `ReportShareModal` 마운트.
8. `react-app/src/side-menu.css` — `.report-share-*` 12규칙 추가(원본
   `style.css:6863-6879`, `#reportShareModal` ID 접두사는 빼고 클래스만—
   기존 `.modal-overlay`/`.modal-content`는 이미 `account-flow.css`에 있어
   재사용, 새로 안 만듦).

(8개로 셌지만 7번은 파일 하나, 실제 건드리는 파일 수는 위 목록 그대로 8개
— `lib/messageTemplates.js`·`lib/messageTemplates.test.js` 둘 다 세면
9개. 정확히는: 신규 2 + 신규 테스트 1 + 기존 수정 6(`messageTemplates.js`,
`messageTemplates.test.js`, `report.js`, `report.test.js`, `ReportPage.jsx`,
`side-menu.css`) = **9개 파일**.)

**안 건드릴 파일**: `ReportDetailView.jsx`(export 콘텐츠 제공만, 무변경) ·
원본 `ubiquitous-parakeet/*`(읽기 참고만).

**§6 200줄 경보**: `lib/report.js`(218→약 234줄)·`ReportPage.jsx`(225→약
240줄) 둘 다 250줄 한도에 근접한다. 이번엔 사유주석으로 넘어가지만, **다음에
또 이 두 파일에 손댈 일이 생기면 그땐 진짜 분리설계(§6 분리 보고)가
필요하다** — 착수 전에 이 사실을 인지하고 시작할 것.

## 2. 코드 내용

### 2-1. `src/lib/messageTemplates.js`에 추가 (파일 끝)

```js
/**
 * @param {string} pattern
 * @param {string} [company]
 * @returns {string}
 */
export function fillReportShareMessagePattern(pattern, company = '거래처') {
  return String(pattern).replaceAll('{거래처}', company || '거래처')
}
```

### 2-2. `src/lib/report.js`에 추가 (파일 끝, `ClientLike` typedef는 이미 있음)

```js
/**
 * @param {'summary'|'detail'} viewMode
 * @param {string} clientFilter
 * @returns {string}
 */
export function getReportShareCompanyName(viewMode, clientFilter) {
  return viewMode === 'detail' && clientFilter !== 'ALL' ? clientFilter : '거래처'
}

/**
 * @param {'summary'|'detail'} viewMode
 * @param {string} clientFilter
 * @param {Array<ClientLike>|null|undefined} clients
 * @returns {{ name: string, phone: string } | null}
 */
export function getDetailReportClientContact(viewMode, clientFilter, clients) {
  if (viewMode !== 'detail' || clientFilter === 'ALL') return null
  const client = (clients || []).find((item) => item.companyName === clientFilter)
  return client?.phone ? { name: client.companyName, phone: client.phone } : null
}
```

기존 §6 사유주석 첫 줄의 줄수만 실제 값으로 갱신(217→약 234, 정확한 숫자는
`wc -l`로 확인 후 반영).

### 2-3. **신규** `src/lib/reportExport.js`

```js
// @ts-check

/**
 * @param {HTMLElement} element
 * @returns {Promise<HTMLCanvasElement>}
 */
async function renderReportCanvas(element) {
  const mod = await import('html2pdf.js')
  const html2pdf = mod.default
  const worker = html2pdf().set({
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    },
  }).from(element).toCanvas()
  return /** @type {HTMLCanvasElement} */ (await worker.get('canvas'))
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG 이미지 생성 실패'))), 'image/png')
  })
}

/**
 * @param {HTMLElement} element
 * @param {string} baseName 확장자 없는 파일명
 * @returns {Promise<File>}
 */
export async function createReportImageFile(element, baseName) {
  const canvas = await renderReportCanvas(element)
  const blob = await canvasToPngBlob(canvas)
  return new File([blob], `${baseName}.png`, { type: 'image/png' })
}

/**
 * @param {HTMLElement} element
 * @param {string} baseName
 * @returns {Promise<File>}
 */
export async function createReportPdfFile(element, baseName) {
  const mod = await import('html2pdf.js')
  const html2pdf = mod.default
  /** @type {Parameters<InstanceType<(typeof html2pdf)['Worker']>['set']>[0]} */
  const opt = {
    margin: [12, 10, 12, 10],
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }
  const blob = /** @type {Blob} */ (await html2pdf().set(opt).from(element).outputPdf('blob'))
  return new File([blob], `${baseName}.pdf`, { type: 'application/pdf' })
}
```

- `renderReportCanvas`의 html2canvas 옵션은 `ReportPage.jsx`의 기존
  `handleDownloadImage`와 완전히 동일(원본이 `createReportCanvasFromElement`를
  `downloadReportImage`(직접 다운로드)와 `createReportFile`(공유용 File)
  양쪽에서 재사용하는 것과 같은 구도) — **의도적으로 `ReportPage.jsx`의
  기존 핸들러는 이 모듈을 쓰도록 리팩터링하지 않는다**(이미 승인·병합된
  ②-3 코드를 이번 슬라이스에서 다시 건드리는 위험을 피함, 원본도 두 곳에서
  비슷한 옵션 객체를 따로 들고 있어 이 정도 중복은 원본 구조 그대로임).
- `worker.get('canvas')`/`outputPdf('blob')`는 `html2pdf.js`의 `type.d.ts`가
  각각 `Promise<any>`로 선언(라이브러리 자체 한계, 슬라이스 25·②-3 선례와
  동일) — `any`를 우리가 선언하지 않고 실제 타입(`HTMLCanvasElement`/`Blob`)
  으로 즉시 캐스팅해 좁힘.

### 2-4. **신규** `src/components/ReportShareModal.jsx`

```jsx
// @ts-check
import {
  buildDetailReportFileName,
  buildReportFileName,
  getDetailReportClientContact,
  getReportShareCompanyName,
} from '../lib/report.js'
import { fillReportShareMessagePattern, getReportShareMessagePattern } from '../lib/messageTemplates.js'
import { createReportImageFile, createReportPdfFile } from '../lib/reportExport.js'

/** @typedef {import('../domain/clientTypes.js').ClientLike} ClientLike */

/**
 * @param {string} phone
 * @param {string} body
 */
export function buildReportSmsUrl(phone, body) {
  const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?'
  return `sms:${phone}${separator}body=${encodeURIComponent(body)}`
}

/**
 * @param {Object} props
 * @param {{ current: HTMLElement | null }} props.exportRef
 * @param {'summary'|'detail'} props.viewMode
 * @param {string} props.clientFilter
 * @param {Array<ClientLike>|null|undefined} props.clients
 * @param {number} props.year
 * @param {number} props.month 0-based
 * @param {() => void} props.onClose
 * @param {(message: string) => void} [props.showToast]
 */
export default function ReportShareModal({ exportRef, viewMode, clientFilter, clients, year, month, onClose, showToast }) {
  const baseFileName = (viewMode === 'detail'
    ? buildDetailReportFileName(year, month, clientFilter)
    : buildReportFileName(year, month)).replace(/\.pdf$/, '')
  const companyName = getReportShareCompanyName(viewMode, clientFilter)
  const contact = getDetailReportClientContact(viewMode, clientFilter, clients)

  /** @param {'pdf'|'image'} type */
  async function buildFile(type) {
    const element = exportRef.current
    if (!element) throw new Error('내보낼 화면을 찾지 못했습니다.')
    document.body.classList.add('pdf-export-mode')
    try {
      return type === 'image' ? await createReportImageFile(element, baseFileName) : await createReportPdfFile(element, baseFileName)
    } finally {
      document.body.classList.remove('pdf-export-mode')
    }
  }

  /** @param {'pdf'|'image'} type */
  async function shareToKakao(type) {
    onClose()
    try {
      const formatLabel = type === 'image' ? '이미지' : 'PDF'
      showToast?.(`카카오톡으로 보낼 ${formatLabel}를 준비하고 있습니다.`)
      const file = await buildFile(type)
      const nav = /** @type {Navigator & { canShare?: (data: { files: Array<File> }) => boolean }} */ (navigator)
      if (!nav.share || (nav.canShare && !nav.canShare({ files: [file] }))) {
        showToast?.('이 기기에서는 파일 공유를 지원하지 않습니다.')
        return
      }
      await nav.share({
        files: [file],
        title: '운송비 내역서',
        text: fillReportShareMessagePattern(getReportShareMessagePattern(), companyName),
      })
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('카카오톡 내역서 공유 실패:', error)
        showToast?.('카카오톡 파일 공유에 실패했습니다.')
      }
    }
  }

  /** @param {'pdf'|'image'} type */
  async function shareBySms(type) {
    if (!contact) {
      window.alert('특정 거래처의 상세내역을 조회하고, 거래처 연락처가 등록되어 있는지 확인해 주세요.')
      return
    }
    onClose()
    let fileUrl = ''
    try {
      const formatLabel = type === 'image' ? '이미지' : 'PDF'
      showToast?.(`문자로 보낼 ${formatLabel}를 저장하고 있습니다.`)
      const file = await buildFile(type)
      fileUrl = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.download = file.name
      link.href = fileUrl
      document.body.appendChild(link)
      link.click()
      link.remove()
      const message = fillReportShareMessagePattern(getReportShareMessagePattern(), contact.name)
      window.location.href = buildReportSmsUrl(contact.phone, message)
    } catch (error) {
      console.error('문자용 내역서 저장 실패:', error)
      showToast?.('문자용 파일 저장에 실패했습니다.')
    } finally {
      if (fileUrl) setTimeout(() => URL.revokeObjectURL(fileUrl), 1000)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content report-share-content" onClick={(e) => e.stopPropagation()}>
        <div className="report-share-head">
          <strong>내역서 보내기</strong>
          <p>보내는 방법이나 파일 형식을 선택해 주세요.</p>
        </div>
        <div className="report-share-options">
          <section className="report-share-channel">
            <div className="report-share-channel-title">
              <span className="report-share-file-icon kakao">톡</span>
              <span><strong>카카오톡으로 보내기</strong><small>파일과 설정한 안내 문구를 함께 공유합니다.</small></span>
            </div>
            <div className="report-share-format-buttons">
              <button type="button" onClick={() => shareToKakao('pdf')}><strong>PDF로 보내기</strong></button>
              <button type="button" onClick={() => shareToKakao('image')}><strong>이미지로 보내기</strong></button>
            </div>
          </section>
          <section className="report-share-channel">
            <div className="report-share-channel-title">
              <span className="report-share-file-icon sms">문자</span>
              <span><strong>문자로 보내기</strong><small>설정한 안내 문구를 포함해 문자 앱을 엽니다.</small></span>
            </div>
            <div className="report-share-format-buttons">
              <button type="button" onClick={() => shareBySms('pdf')}><strong>PDF로 보내기</strong></button>
              <button type="button" onClick={() => shareBySms('image')}><strong>이미지로 보내기</strong></button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
```

**중요 — `onClose()`를 먼저 호출하는 이유(그대로 지킬 것)**: `ReportPage.jsx`가
이 컴포넌트를 `{shareOpen && <ReportShareModal .../>}`로 조건부 마운트한다
(§2-5 참고). `onClose()`가 부모 state를 바꿔 이 컴포넌트가 **언마운트**되므로,
`onClose()` 호출 **이후**엔 이 컴포넌트 안에서 `setState` 계열 호출을 절대
하면 안 된다(언마운트된 컴포넌트에 상태 갱신 시도 — React 경고/버그).
그래서 이 컴포넌트엔 로컬 `useState`가 하나도 없다 — "전송 중" 표시 같은
로컬 상태를 추가하고 싶어져도 추가하지 말 것(원본에도 그런 로딩 상태 없음,
버튼 disabled 없이 그냈다 바로 닫힘).

### 2-5. `src/components/ReportPage.jsx` 변경

**import**: `lazyPages.js` 패턴이 아니라 일반 import(다른 모달들과 동일,
`ReportDetailContent` 임포트 옆에):
```jsx
import ReportShareModal from './ReportShareModal.jsx'
```

**state**(`savingImage` 아래, 이 슬라이스 이전에 이미 있던 줄):
```jsx
  const [shareOpen, setShareOpen] = useState(false)
```

**버튼**(`.report-pdf-actions` 안, "이미지 저장" 버튼 뒤):
```jsx
        <button type="button" className="theme-toggle-btn" onClick={() => setShareOpen(true)}>공유</button>
```

**모달 마운트**(기존 `<ReportClientPickerModal .../>` 뒤):
```jsx
      {shareOpen && (
        <ReportShareModal
          exportRef={exportRef}
          viewMode={viewMode}
          clientFilter={clientFilter}
          clients={clients}
          year={year}
          month={month}
          onClose={() => setShareOpen(false)}
          showToast={showToast}
        />
      )}
```

(`clients`는 이미 `useOwnerClients(ownerKey)`로 파일 상단에서 읽고 있음 —
새 훅 호출 불필요.)

### 2-6. `src/side-menu.css` 추가분 (원본 `style.css:6863-6879`, ID 접두사 제거)

```css
.report-share-content { width: min(calc(100% - 32px), 390px); padding: 22px; border-radius: 22px; }
.report-share-head strong { display: block; font-size: var(--fs-6); }
.report-share-head p { margin: 5px 0 16px; color: var(--sub-text-color); font-size: var(--fs-2); }
.report-share-options { display: grid; gap: 8px; }
.report-share-channel { padding: 12px; border: 1px solid var(--border-color); border-radius: 16px; background: var(--input-bg); }
.report-share-channel-title { display: grid; grid-template-columns: 42px minmax(0, 1fr); align-items: center; gap: 11px; }
.report-share-channel-title > span:last-child { min-width: 0; }
.report-share-channel-title strong, .report-share-channel-title small { display: block; }
.report-share-channel-title strong { font-size: var(--fs-3); }
.report-share-channel-title small { margin-top: 3px; color: var(--sub-text-color); font-size: var(--fs-floor); }
.report-share-format-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 11px; }
.report-share-format-buttons button { min-height: 42px; padding: 9px 6px; border: 1px solid color-mix(in srgb, var(--primary-color) 28%, var(--border-color)); border-radius: 11px; background: var(--card-bg); color: var(--primary-color); text-align: center; cursor: pointer; touch-action: manipulation; }
.report-share-format-buttons button strong { font-size: var(--fs-2); }
.report-share-file-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: color-mix(in srgb, var(--primary-color) 14%, var(--card-bg)); color: var(--primary-color); font-size: var(--fs-floor); font-weight: 900; }
.report-share-file-icon.kakao { background: #fee500; color: #191919; font-size: var(--fs-2); }
.report-share-file-icon.sms { background: color-mix(in srgb, #40a36f 16%, var(--card-bg)); color: #268a57; font-size: var(--fs-floor); }
```

(원본의 `.report-share-file-icon.image` 규칙은 이번 모달에 이미지 아이콘을
안 써서 — 카카오/문자 2종류만 — 안 옮김. 원본 반응형 규칙
`style.css:7328`도 폭 조정뿐이라 위 `min(calc(100% - 32px), 390px)`가 이미
같은 효과라 생략.)

## 3. 테스트 계획

- **§4 플레이북 비대상**: 파일 생성(html2canvas/html2pdf)+`navigator.share`/
  `sms:` 링크, 저장·동기화·localStorage 쓰기 없음.
- **신규 테스트**: `ReportShareModal.test.js` — `mock.module('../lib/reportExport.js',
  { namedExports: { createReportImageFile: async () => fakeFile, createReportPdfFile:
  async () => fakeFile } })`로 실제 canvas/PDF 생성을 우회(선례:
  `accountWithdrawal.test.js` 등의 `mock.module` 패턴). 5케이스:
  1. 렌더 구조 — 카카오톡/문자 2섹션, 각 PDF/이미지 버튼 4개.
  2. SMS: `contact` prop이 `null`이면 아무 버튼 클릭해도 `window.alert`가
     정확한 메시지로 1회 호출되고 `onClose`는 호출 안 됨(파일 생성·다운로드
     로직 자체가 실행 안 됨 — 안전하게 테스트 가능).
  3. 카카오톡: `navigator.share`가 없을 때(테스트 전 `delete`) 클릭 →
     `onClose` 호출됨(원본처럼 클릭 즉시 닫힘) + "이 기기에서는 파일 공유를
     지원하지 않습니다." 토스트.
  4. **(핵심, ②-1 연결 증명)** 카카오톡: `saveMessageTemplateSettings`로
     내역서 공유 문구를 커스텀 저장한 뒤, `navigator.share`를 모킹한 상태로
     클릭 → `navigator.share`가 `{ files: [파일], title: '운송비 내역서',
     text: <커스텀 문구로 채워진 텍스트> }`로 정확히 1회 호출됐는지.
  5. `buildReportSmsUrl(phone, body)` 순수 함수 — 기본 UA `?`, iPhone UA
     `&` 구분자(②-2의 `buildTemplateSmsUrl` 테스트와 동일 패턴, UA는 테스트
     끝에 원복).
  - **SMS "연락처 있음 → 실제 다운로드+`sms:` 링크 이동까지" 경로는
    컴포넌트 테스트에서 검증 안 함**: `URL.createObjectURL`이 이 테스트
    환경(Node의 전역 `URL`, jsdom 아님 — `testSupport/setupDom.js` 확인
    완료)엔 없어 호출 시 예외가 나고, `window.location.href` 실제 대입도
    jsdom이 처리 못 함(②-2에서 같은 이유로 우회한 선례 그대로 적용) —
    URL 생성 자체는 위 5번 순수 함수 테스트로, 실제 다운로드+링크 이동은
    브라우저 실검증으로 커버.
  - `lib/report.test.js`에 `getReportShareCompanyName`·
    `getDetailReportClientContact` 테스트 추가(순수 함수, 안전).
  - `lib/messageTemplates.test.js`에 `fillReportShareMessagePattern` 테스트
    추가.
  - `reportExport.js` 자체(`createReportImageFile`/`createReportPdfFile`)는
    `ReportPage.jsx`의 `handleDownloadPdf`/`handleDownloadImage`도 컴포넌트
    테스트가 없는 선례를 따라 전용 테스트 없이 진행(html2canvas/html2pdf
    동적 import 목킹 비용 대비 실익 낮음, 브라우저 실검증으로 커버).
- **§6 200줄**: `reportExport.js` 약 55줄, `ReportShareModal.jsx` 약 105줄,
  `ReportShareModal.test.js` 약 110줄 — 전부 여유. `report.js`·`ReportPage.jsx`
  는 위 §1 "200줄 경보" 참고(250줄 한도 안).
- **CI**: `npm test`+`npm run typecheck`+`npm run build` 3게이트.
- **브라우저 실검증(보리)**:
  1. 운송비 내역서 → "공유" 클릭 → 모달에 카카오톡/문자 섹션, 각 PDF/이미지
     버튼 보이는지
  2. 요약 화면에서 "카카오톡으로 보내기 → PDF로 보내기" → 공유 시트(또는
     "지원하지 않습니다" 안내, 데스크톱 브라우저면 이게 정상)가 뜨는지
  3. "세부 내역서" 조회 후 특정 거래처 선택(연락처 등록된 곳) → "문자로
     보내기 → 이미지로 보내기" → 파일 다운로드되고 문자 앱(또는 `sms:` 처리
     안내)으로 넘어가는지
  4. "전체" 상태(특정 거래처 미선택)에서 "문자로 보내기" → 안내 메시지 뜨는지
  5. 마이페이지 → 문자 문구 설정에서 "내역서 공유 문구" 수정·저장 → 공유
     모달에서 카카오톡/문자 보낼 때 그 문구가 반영되는지(육안 확인 어려우면
     문자의 경우 문자 앱에 채워진 내용으로 확인)
  6. 모달 바깥(배경) 클릭 시 닫히는지

## 4. 실패 시 처리

새 저장소·durable/fallback 레이어 없음(§7 해당 없음) — 실패 시 원본과
동일하게 토스트/alert만, 재시도 큐 없음.

## 5. 다음 슬라이스 예고

이 슬라이스가 CI 초록·보리 `[x]` 확정되면 **이관 계획 ② 전체 완료**. 다음은
이관 계획 ③(홈 캘린더 9/6 칩 렌더링 버그) 착수지시서를 이 파일에 새로 작성.
