# docs/report.md — 착수지시서: 리포트 이미지 저장 버튼 (이관 계획 ②-3)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①·②-1·②-2는 `[x]` 확정됨 — 상세는 `STATUS.md` "완료" 절 참고.

## 0. 배경 및 스코프 확인 (질문·답변 기록)

원본 리포트 화면의 "PDF 메뉴" 드롭다운(`index.html:59-83`)엔 4개 버튼이 있다:
① 세부 내역서 조회(이미 이관됨) ② PDF 다운로드(이미 이관됨) ③ **"한 장
이미지 저장"**(`downloadReportImage`, PNG 다운로드 — react-app에 없음)
④ **"거래처에 파일 보내기"**(`openReportShareModal`, 카카오톡 Web Share
API+문자 SMS 공유 모달 — react-app에 없음).

**보리 결정(2026-09-07)**: ③(이미지 저장)만 이번 슬라이스. ④(공유 모달)는
파일이 5~6개(모달 컴포넌트+공유 로직+파일 생성 함수 등)로 커지는 별도
슬라이스라 ②-4로 분리, 이번엔 손 안 댐.

## 1. 스코프

**건드릴 파일 3개**:
1. `react-app/src/lib/report.js` — 기존 `buildReportFileName`/
   `buildDetailReportFileName`(PDF 파일명, `.pdf` 확장자 하드코딩) 바로
   아래에 PNG용 파일명 함수 2개 추가. 기존 함수를 그대로 재사용해
   `.pdf`→`.png` 치환만 하므로 이름 규칙 로직 중복 없음.
2. `react-app/src/components/ReportPage.jsx` — 기존 `handleDownloadPdf`
   (html2pdf.js 동적 import + `pdf-export-mode` 토글 패턴)와 나란히
   `handleDownloadImage`를 추가하고, "PDF 다운로드" 버튼 옆에 "이미지 저장"
   버튼 1개 추가(`.theme-toggle-btn` 클래스 그대로 재사용, 새 CSS 0개).
3. `react-app/src/lib/report.test.js` — 신규 함수 2개에 대한 테스트 추가
   (기존 `buildReportFileName`/`buildDetailReportFileName` 테스트 옆에).

**안 건드릴 파일**: 공유 모달 관련 전부(②-4 대상) · `ReportDetailView.jsx`
(export 대상 콘텐츠만 제공, 변경 불필요) · 원본 `ubiquitous-parakeet/*`
(읽기 참고만).

**§6 200줄 예외 (사전 승인 요청)**: 두 파일 다 이번 추가로 200줄을 넘을
것으로 예상된다 — `lib/report.js` 198→약 213줄, `ReportPage.jsx` 172→약
212줄. 기계적으로 쪼개는 대신 **1줄 사유 주석**만 추가할 것:
- `lib/report.js`: 리포트 파일명 생성 함수들(PDF·PNG 전부)이 한곳에 있어야
  이름 규칙을 한 번에 대조할 수 있음(응집도).
- `ReportPage.jsx`: PDF/이미지 두 내보내기 핸들러가 같은 `exportRef`·
  `pdf-export-mode` 토글·`viewMode`/`clientFilter` 분기를 공유해 나란히
  있어야 유지보수 시 같이 읽힘(응집도). 250줄 한도 안에 들어오므로 분리
  설계 보고 없이 사유 주석만으로 진행(선례: `domain/cars.js`·
  `practiceSettings.js` 등).

## 2. 코드 내용

### 2-1. `src/lib/report.js`에 추가 (기존 `buildDetailReportFileName` 함수 뒤)

```js
/**
 * 월간 운송비 내역서 PNG 파일명(이미지 저장용, PDF 파일명 규칙 재사용).
 * @param {number} year
 * @param {number} monthIndex
 */
export function buildReportImageFileName(year, monthIndex) {
  return buildReportFileName(year, monthIndex).replace(/\.pdf$/, '.png')
}

/**
 * 세부 내역서 PNG 파일명.
 * @param {number} year
 * @param {number} monthIndex
 * @param {string} clientFilter
 */
export function buildDetailReportImageFileName(year, monthIndex, clientFilter) {
  return buildDetailReportFileName(year, monthIndex, clientFilter).replace(/\.pdf$/, '.png')
}
```

파일 맨 위(§6 예외 사유주석 위치는 파일 첫 줄 `// @ts-check` 다음 줄에
1줄, 기존 예외 파일들과 같은 스타일)에:
```js
// @ts-check
// §6: 리포트 파일명 생성 함수(PDF·PNG)를 한곳에 모아 이름 규칙을 한 번에 대조하기 위해 분리하지 않음(213줄)
```

### 2-2. `src/components/ReportPage.jsx` 변경

**import 블록**(파일 상단)에 2개 추가:
```jsx
import {
  buildDetailReport,
  buildDetailReportFileName,
  buildDetailReportImageFileName,
  buildMonthReport,
  buildReportFileName,
  buildReportImageFileName,
  dash,
  detailReportClientOptions,
} from '../lib/report.js'
```

**state**(`savingPdf` 선언 바로 아래)에 1줄 추가:
```jsx
  const [savingImage, setSavingImage] = useState(false)
```

**`handleDownloadPdf` 함수 뒤**에 새 함수 추가:
```jsx
  async function handleDownloadImage() {
    const element = exportRef.current
    if (!element || savingImage) return
    setSavingImage(true)
    document.body.classList.add('pdf-export-mode')
    let imageUrl = ''
    try {
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
      const canvas = /** @type {HTMLCanvasElement} */ (await worker.get('canvas'))
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 이미지 생성 실패'))), 'image/png')
      })
      const fileName = viewMode === 'detail'
        ? buildDetailReportImageFileName(year, month, clientFilter)
        : buildReportImageFileName(year, month)
      imageUrl = URL.createObjectURL(/** @type {Blob} */ (blob))
      const link = document.createElement('a')
      link.download = fileName
      link.href = imageUrl
      document.body.appendChild(link)
      link.click()
      link.remove()
      showToast?.('이미지를 저장했습니다.')
    } catch (error) {
      console.error('운송비 내역서 이미지 저장 실패:', error)
      showToast?.('이미지 저장에 실패했습니다.')
    } finally {
      if (imageUrl) setTimeout(() => URL.revokeObjectURL(imageUrl), 1000)
      document.body.classList.remove('pdf-export-mode')
      setSavingImage(false)
    }
  }
```

**버튼**(`.report-pdf-actions` 안, "PDF 다운로드" 버튼 뒤에 추가):
```jsx
        <button type="button" className="theme-toggle-btn" disabled={savingImage} onClick={handleDownloadImage}>
          {savingImage ? '이미지 저장 중…' : '이미지 저장'}
        </button>
```

- `html2canvas` 옵션(`scale:2`, `windowWidth`/`windowHeight` 등)은 원본
  `script.js:1667-1679`의 `createReportCanvasFromElement`와 완전히 동일.
  `worker.get('canvas')`는 `html2pdf.js`의 `type.d.ts`가 `Promise<any>`로
  선언(라이브러리 자체 타입 한계, 슬라이스 25 선례와 동일 문제) — 우리
  코드에서 `any`를 선언하지 않고 결과를 `HTMLCanvasElement`로 즉시 캐스팅해
  좁힘(타입 무력화 아님, 라이브러리 반환값을 아는 실제 타입으로 좁히는
  것).
- 파일 하나 만드는 흐름(`createObjectURL`→`<a download>` 클릭→`revokeObjectURL`)은
  원본 `downloadReportImage`(`script.js:1690-1707`)와 동일.

### 2-3. `src/lib/report.test.js`에 추가 (기존 `buildDetailReportFileName` describe 뒤)

```js
describe('buildReportImageFileName', () => {
  test('PDF 파일명 규칙을 재사용해 확장자만 png로 바꾼다', () => {
    assert.equal(buildReportImageFileName(2026, 8), '2026년_9월_운송비내역서.png')
    assert.equal(buildReportImageFileName(2025, 11), '2025년_12월_운송비내역서.png')
  })
})

describe('buildDetailReportImageFileName', () => {
  test('ALL이면 전체, 아니면 거래처명이 파일명에 들어간다(png)', () => {
    assert.equal(buildDetailReportImageFileName(2026, 8, 'ALL'), '2026년_9월_운송비내역서(세부)_전체.png')
    assert.equal(buildDetailReportImageFileName(2026, 0, '한진'), '2026년_1월_운송비내역서(세부)_한진.png')
  })
})
```

(import 블록에 `buildReportImageFileName, buildDetailReportImageFileName`
추가 필요.)

## 3. 테스트 계획

- **§4 플레이북 비대상**: 순수 파일 생성·다운로드(브라우저 `<a download>`),
  저장·동기화·localStorage 없음.
- **신규 테스트**: 위 2-3 대로 파일명 함수 2개(4 assertion). 기존
  `handleDownloadPdf`도 컴포넌트 레벨 테스트가 없는 선례를 따라
  `handleDownloadImage`도 컴포넌트 테스트는 만들지 않음(html2pdf.js 동적
  import+canvas.toBlob 목킹 비용 대비 실익 낮음, 브라우저 실검증으로 커버).
- **§6 200줄 예외**: 위 §1 사유주석 대로 처리, 250줄 한도 안(213/212 예상).
- **CI**: `npm test`+`npm run typecheck`+`npm run build` 3게이트.
- **브라우저 실검증(보리)**:
  1. 운송비 내역서(요약 화면) → "이미지 저장" 클릭 → PNG 파일 다운로드되고
     내용이 화면과 일치하는지
  2. "세부 내역서" 조회 후 → "이미지 저장" → 파일명에 `(세부)_거래처명`이
     들어가는지
  3. 저장 중 버튼이 "이미지 저장 중…"으로 바뀌고 중복 클릭이 막히는지

## 4. 실패 시 처리

새 저장소·durable/fallback 레이어 없음(§7 해당 없음) — 실패 시 원본과
동일하게 토스트만(`이미지 저장에 실패했습니다.`), 재시도 큐 없음.

## 5. 다음 슬라이스 예고

이 슬라이스가 CI 초록·보리 `[x]` 확정되면, 이관 계획 ②-4(리포트 카카오톡/
문자 공유 모달, 내역서 공유 문구 반영) 착수지시서를 이 파일에 다시 작성.
