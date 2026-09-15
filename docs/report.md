# docs/report.md — 현재 슬라이스 착수지시서

> §2(차량 관리) 전체 완료(§2-1-A/B/C + 기사연동 전환 버그 + 신규등록
> 기본값 버그, 전부 `[x]`) 상세는
> `docs/archive/2-2-car-driver-link-and-connectmode-bugs-2026-09-15.md`로
> 옮김(동결). 그 이전 슬라이스들(§2-1-A/B/C 이전 것 포함)도 전부
> `docs/archive/`에 동결돼 있음 — 폴더 목록에서 주제별로 찾는다.

---

## 전역 드롭다운(`<select>`) 통일 — 슬라이스 1: 연/월 select → `CalendarDateSelect` 재사용

> 보리 지시(2026-09-14): "라이트/다크 스타일 전역 통일 필요, 착수 전
> 계획 필요." `STATUS.md` "다음 할 일" 항목 2. 오늘(2026-09-15) grep
> 재확인 결과로 아래 확정.

### 현재 상태 (grep 재확인, `src/**/*.jsx`)

원본 STATUS.md엔 "10파일/14곳"으로 적혀 있었으나, 오늘 다시 grep한
결과 **10파일/15곳**이 맞음(아래 근거). 이전 집계가 1곳 누락됐던
것으로 보임 — 이 문서로 정정.

- **연/월 `<select className="date-select">` 쌍 — 5파일 × 2곳 = 10곳**
  (전부 `date-select-group` 안에 연/월 select 2개씩):
  `MaintFuelPage.jsx`(126,129행) · `SettlementSummaryCard.jsx`(32,35행) ·
  `ReportPage.jsx`(168,171행) · `RevenueNav.jsx`(24,28행) ·
  `TaxInvoiceToolbar.jsx`(28,31행).
  → **이번 슬라이스 대상.**
- **개별 native `<select>` — 5파일 × 1곳 = 5곳**: `CustomerCenterPage.jsx`
  (81행, 문의유형) · `ClientFormModal.jsx`(71행, 결제조건) ·
  `BillingSettingsPage.jsx`(52행, 정산기준) · `ReportDetailView.jsx`
  (42행, 거래처 선택) · `OwnerRevenueView.jsx`(131행, 기사 선택).
  → **다음 슬라이스(아래 참고), 이번엔 손 안 댐.**

**이미 검증된 대체 패턴 존재**: `CalendarHeader.jsx`가 이미 똑같은
연/월 `date-select-group` 구조를 `CalendarDateSelect.jsx`(버튼+listbox,
`app-dropdown app-date-dropdown` 클래스, 다크모드 대응 완료 —
`calendar-date-select.css`)로 교체해 쓰고 있음. 이번 슬라이스는 **그
컴포넌트를 나머지 5파일에 그대로 재사용**하는 것 — 신규 컴포넌트
설계 없음.

### 목표 상태

5개 파일의 `<select className="date-select" ...>` 연/월 쌍을
`<CalendarDateSelect label=... value=... options=... onChange=... />`
호출로 교체. `CalendarHeader.jsx`(60~71행)와 동일한 형태로:
`options`는 `{ value: String(x), label: '...' }` 배열, `onChange`는
기존 핸들러의 `Number(e.target.value)` 부분만 `Number(next)`로 변경.
시각적으로 네이티브 OS select → 앱 통일 버튼+listbox 드롭다운으로
바뀌고, 다크모드에서 라이트모드처럼 보이는 문제도 함께 해소(F-2와
같은 부류).

### 건드릴 파일 (5개)

| 파일 | 현재 줄 수 | 변경 내용 |
|---|---|---|
| `src/components/MaintFuelPage.jsx` | 206 | 126~131행 select 2개 → `CalendarDateSelect` 2개 + import 추가 |
| `src/components/drivers/SettlementSummaryCard.jsx` | 50 | 32~37행 동일 |
| `src/components/ReportPage.jsx` | 237 | 168~173행 동일 |
| `src/components/revenue/RevenueNav.jsx` | 38 | 24~30행 동일(월 select는 `!yearly` 조건부 — 조건 유지) |
| `src/components/TaxInvoiceToolbar.jsx` | 54 | 28~33행 동일 |

**§6 200줄 체크**: `MaintFuelPage.jsx`(206)·`ReportPage.jsx`(237)는
이미 200줄 초과 상태(이번 슬라이스가 만든 게 아님). 이번 변경은 select
마크업을 컴포넌트 호출 1줄로 줄이는 것이라 **양쪽 다 줄어들면 줄었지
늘지 않음** — 실제 교체 후 `wc -l`로 재확인해 여전히 200줄 초과면
그 사실만 §5 리뷰에 정직하게 기록(신규 분리설계 요구 아님, 기존
초과분 그대로 승계).

### 안 건드릴 것

- 나머지 5개 개별 select(문의유형·결제조건·정산기준·거래처선택·
  기사선택) — 다음 슬라이스, 공용화 여부 미정.
- `shared-controls.css`의 `.date-select`/`.date-select-group` 규칙 —
  이 슬라이스로 5곳 다 옮겨도 `.date-select-group`은 레이아웃
  래퍼로 계속 쓰이므로 유지. `.date-select`(네이티브 select 전용
  스타일)는 이 슬라이스 후 사용처가 0이 될 가능성 있으나, 죽은 CSS
  제거는 별도 후속 nit로만 기록(이번엔 안 지움).
- `CalendarDateSelect.jsx`/`calendar-date-select.css` 자체 — 이미
  검증된 컴포넌트, 무변경.

### 실패 시 처리

새 상태 저장소·큐·fallback 없음(§7 해당 없음) — 순수 마크업 교체.
동작이 기존과 다르면(연/월 선택이 안 먹거나 스타일이 깨지면) 해당
파일만 되돌리고 나머지는 유지, 사용자에게 어느 파일에서 문제가
났는지 보고 후 재시도.

### 검증 방법 (브라우저, 5파일 각각)

1. 정비/주유/기타 내역(`MaintFuelPage`) — 연/월 드롭다운 클릭 →
   버튼+리스트박스로 열리는지, 값 선택 시 월별 데이터 갱신되는지.
2. 기사연동관리 정산 요약(`SettlementSummaryCard`) — 동일.
3. 운송비 내역서(`ReportPage`) — 동일.
4. 매출 화면(`RevenueNav`, 연도별/월별 토글) — 연도별 모드에서 월
   select가 안 보이는 것까지 확인(`!yearly` 조건 유지 확인).
5. 세금계산서 화면(`TaxInvoiceToolbar`) — 동일.
6. 다크모드 토글 후 5곳 전부 스타일이 통일돼 보이는지(라이트모드
   잔재 없는지) 육안 확인.

---

## 다음 슬라이스 (착수 전 대기)

**전역 드롭다운 슬라이스 2 — 개별 select 5곳 공용화 여부**: 문의유형·
결제조건·정산기준·거래처선택·기사선택. `CalendarDateSelect`는 연/월
전용 이름이라 그대로 재사용 불가 — 범용 `AppSelect`류 신규 공용
컴포넌트를 새로 만들지, 5곳 각자 그대로(네이티브 select에 다크모드
색상만 보정) 둘지 **보리 결정 필요**(질문 1회로 확정 예정). 슬라이스
1 완료·승인 후 착수.

**§9 기사연동관리 전체 대조** — `docs/ui-comparison-report.md` §9.
착수지시서 별도 작성 필요.

**E의 나머지 항목** / **E 착수 전 P0** (`setTimeout(420)` vs `0.4s`) —
이전과 동일.

**후속(비긴급)**: `--icon-color` 죽은 변수, 하드코딩 hex 중복.
