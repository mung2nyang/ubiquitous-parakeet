# docs/report.md — 착수지시서: 공지사항 이관 (이관 계획 ①)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이전 "원본↔React UI 전수 대조" 1차 조사 전체 내용은 `docs/archive/audit.md`
> "원본↔React UI 전수 대조 — 1차 조사 (2026-09-07)" 절로 이동(참고용, 동결).
> 보리 승인(2026-09-07 "그 순서로 진행해") — 이관 계획 ①번 항목 착수.

## 0. 배경

마이페이지 "공지사항" 메뉴가 react-app에선 `onOpen('soon', '공지사항')`로 "준비 중"
스텁(`/app/soon`)에 연결돼 있어 실제 기능이 없음. 원본(`ubiquitous-parakeet`)의
`noticePage`(`index.html:713-725`)는 공지 3건(제목·날짜·펼치면 본문)을 보여주는
정적 목록 화면 — DB 조회 없음, 하드코딩된 데이터.

## 1. 스코프

**건드릴 파일 4개**:
1. **신규** `react-app/src/components/NoticePage.jsx` — 공지 목록 화면. 원본의
   `support-card`(안내 카드) + `support-list-item`(아코디언 목록) 패턴을 react-app에
   이미 있는 동일 계열 컴포넌트 `CustomerCenterPage.jsx`의 FAQ 아코디언과 같은 방식
   (`.support-card`/`.faq-item`/`.support-detail`, `side-menu.css:2088-2098`에 이미
   스타일 존재)으로 구현 — **새 CSS 클래스 0개**.
2. `react-app/src/app/lazyPages.js` — `NoticePage` lazy export 1줄 추가
   (`CustomerCenterPage` 옆에).
3. `react-app/src/app/AppShellRoutes.jsx` — import 목록에 `NoticePage` 추가 +
   라우트 1줄 추가: `<Route path="notice" element={<NoticePage onBack={() => navigate(backTarget)} />} />`
   (기존 `backTarget` 계산 그대로 재사용 — `?back=mypage`면 마이페이지로, 아니면 홈으로).
4. `react-app/src/components/MyPage.jsx:179` — `onClick={() => onOpen('soon', '공지사항')}`
   → `onClick={() => onOpen('notice')}` 로 1줄 교체.

**안 건드릴 파일**: `ComingSoonRoute.jsx`(다른 스텁들이 계속 씀 — "문자 문구 설정" 등
이관 계획 ②는 별도 슬라이스), 원본 `ubiquitous-parakeet/*`(읽기 참고만), 그 외 전부.

**PAGE_PATH 매핑 불필요**: `AppShell.jsx`의 `pagePath(page)`가 `PAGE_PATH[page] ?? page`로
매핑 안 된 키는 그대로 URL 세그먼트로 쓰므로 `onOpen('notice')` → `/app/notice`로
자동 연결됨(`AppShell.jsx:41-44`, 기존 동작 그대로 재사용, 새 코드 없음).

## 2. NoticePage.jsx 내용 (원본 공지 3건 그대로 이관)

```jsx
// @ts-check
import { useState } from 'react'

const NOTICES = [
  {
    title: '[필독] 서비스 이용 안내',
    date: '2026.08.11',
    body: '더 편리한 운행 기록을 위해 고객센터 메뉴가 새롭게 추가되었습니다.',
  },
  {
    title: '데이터 백업 권장 안내',
    date: '2026.08.05',
    body: '중요한 운행 기록은 앱 설정의 백업 기능을 이용해 정기적으로 보관해 주세요.',
  },
  {
    title: '최근 업데이트 안내',
    date: '2026.08.01',
    body: '사용성을 개선하고 일부 화면의 디자인을 다듬었습니다.',
  },
]

/**
 * @param {Object} props
 * @param {() => void} [props.onBack]
 */
export default function NoticePage({ onBack }) {
  const [openIndex, setOpenIndex] = useState(/** @type {number|null} */ (null))

  /** @param {number} index */
  function toggle(index) {
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  return (
    <div className="page notice-page">
      <div className="settings-header">
        <button type="button" className="icon-btn" title="뒤로가기" onClick={onBack}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div className="settings-title">공지사항</div>
        <div style={{ width: 40 }}></div>
      </div>

      <section className="support-panel" aria-label="공지사항">
        <div className="support-card">
          <div className="support-card-label">NOTICE</div>
          <h3>새로운 소식을 확인하세요</h3>
          <p>서비스 업데이트와 중요한 안내를 가장 먼저 전해드립니다.</p>
        </div>
        {NOTICES.map((notice, index) => (
          <button
            key={notice.title}
            type="button"
            className={`faq-item${openIndex === index ? ' open' : ''}`}
            onClick={() => toggle(index)}
          >
            <span>{notice.title} · {notice.date}</span>
            <i>{openIndex === index ? '−' : '+'}</i>
            <div className="support-detail">{notice.body}</div>
          </button>
        ))}
      </section>
    </div>
  )
}
```

- 원본 공지 3건의 제목·날짜·본문 텍스트를 그대로 옮김(원본 `index.html:721-723`과
  1:1 대조 완료). "필독" 뱃지는 원본이 `<b>필독</b>`로 제목 앞에 굵게 붙이는데,
  react-app은 `[필독]` 접두어 텍스트로 대체(기존 `faq-item` grid가 제목 한 칸이라
  굵은 글씨 분리 마크업 대신 텍스트로 표현 — 새 CSS 없이 기존 컴포넌트 그대로 재사용
  하기 위한 최소 타협, 의미 전달은 동일).
- 날짜는 원본처럼 별도 `<small>` 칸이 아니라 제목 옆에 " · 날짜"로 붙임(기존
  `.faq-item` 2열 그리드(제목/+아이콘)를 그대로 쓰기 위함 — 3열로 새로 만들지 않음,
  §7 "새 레이어·새 CSS 금지" 취지에 맞춤).

## 3. 테스트 계획

- **§4 플레이북 비대상**: 정적 데이터만 렌더 — localStorage/Supabase 읽기·쓰기·
  동기화 없음.
- **신규 테스트 없음**: 같은 패턴의 기존 컴포넌트(`CustomerCenterPage.jsx`,
  `ComingSoonPage.jsx`)도 전용 테스트 파일이 없음(확인함) — 이번에도 없이 진행,
  기존 관례와 일치.
- **§6 200줄**: 새 파일 약 55줄, 여유 있음.
- **CI**: `npm test`+`npm run typecheck`+`npm run build` 3게이트, 기존과 동일하게
  통과해야 함(신규 로직 없어 실패 요인 없음).
- **브라우저 실검증(보리)**: 마이페이지 → "공지사항" 클릭 → 공지 3건 보임 → 하나
  눌러서 펼쳐지는지 → 뒤로가기가 마이페이지로 돌아오는지.

## 4. 실패 시 처리

새 저장소·durable/fallback 레이어 없음(§7 해당 없음 — 정적 데이터라 저장할 것 자체가
없음).

## 5. 다음 슬라이스 예고

이 슬라이스가 CI 초록·보리 `[x]` 확정되면, 이관 계획 ②(문자 문구 설정 이관)
착수지시서를 다시 이 파일에 작성.
