# docs/report.md — 현재 슬라이스 착수지시서

> §2(차량 관리) 전체 완료 상세는
> `docs/archive/2-2-car-driver-link-and-connectmode-bugs-2026-09-15.md`로
> 옮김(동결). 전역 드롭다운 슬라이스 1(연/월 select → `CalendarDateSelect`,
> react-app `9df06e2`, `[x]` 완료) 상세는
> `docs/archive/dropdown-slice1-calendar-date-select-2026-09-15.md`로
> 옮김(동결). 그 이전 슬라이스들도 전부 `docs/archive/`에 동결돼
> 있음 — 폴더 목록에서 주제별로 찾는다.

---

## 전역 드롭다운 통일 — 슬라이스 2: 개별 select 5곳 → 신규 `AppDropdown` 공용화

> 보리 결정(2026-09-15): "A안 — 범용 이름으로 일반화." `CalendarDateSelect`의
> 버튼+listbox 로직 자체는 이미 범용(label/value/options/onChange)이라
> 새로 설계하지 않고, 이름·CSS만 분리해 공용 컴포넌트로 뽑아낸다.

### 현재 상태

`CalendarDateSelect.jsx`(`react-app/src/components/calendar/`)가
버튼+listbox 로직 전체(127줄)를 갖고 있고, 이름·import 경로·CSS
파일명이 전부 "calendar" 전용이라 날짜와 무관한 5곳(문의유형·
결제조건·정산기준·거래처선택·기사선택)에 그대로 갖다 쓰면 코드
가독성이 떨어짐. 이 5곳은 지금 각자 네이티브 `<select className="input-box">`
를 쓰고 있어 슬라이스 1로 통일한 연/월 드롭다운과 스타일이 다름.

### 목표 상태

1. `CalendarDateSelect.jsx`의 버튼+listbox 로직을 범용 컴포넌트
   `src/components/shared/AppDropdown.jsx`로 이동(로직 무변경, 바깥
   `<div>`의 className만 `app-dropdown` + 옵션 `className` prop으로
   변경).
2. `CalendarDateSelect.jsx`는 `AppDropdown`을 `className="app-date-dropdown"`으로
   감싸는 15줄 안팎 얇은 래퍼로 축소. 외부 사용처(`CalendarHeader.jsx`
   등 슬라이스 1의 5개 파일 포함) API·렌더 결과 **무변경**이라 그쪽
   파일들은 안 건드림.
3. 개별 select 5곳을 `AppDropdown`으로 교체(슬라이스 1과 동일한
   1:1 마크업 치환 패턴).

### 건드릴 파일 (10개)

| 파일 | 현재 줄 수 | 변경 |
|---|---|---|
| `src/components/shared/AppDropdown.jsx` (신규) | 0 | `CalendarDateSelect.jsx`의 로직을 그대로 옮기고 className을 `app-dropdown`(+옵션 prop)으로 일반화. 약 125줄 |
| `src/components/shared/app-dropdown.css` (신규) | 0 | `calendar-date-select.css`의 범용 규칙(1~89행, `.date-select-group` 2줄 제외 전부)을 그대로 이동. 약 89줄 |
| `src/components/calendar/CalendarDateSelect.jsx` | 127 | `AppDropdown` 감싸는 래퍼로 축소. 약 15줄 |
| `src/components/calendar/calendar-date-select.css` | 93 | 범용 규칙 이동 후 `.date-select-group .app-date-dropdown:first-child/:last-child` 2규칙만 남김. 약 4줄 |
| `src/components/CustomerCenterPage.jsx` | 226 | 81행 문의유형 select → `AppDropdown`. `INQUIRY_TYPES.map(t => ({value:t,label:t}))` |
| `src/components/clients/ClientFormModal.jsx` | 90 | 71행 결제조건 select → `AppDropdown`. `PAYMENT_TERMS`(이미 `{value,label}` 배열, `domain/clientPaymentTerms.js`) 그대로 사용 |
| `src/components/drivers/BillingSettingsPage.jsx` | 65 | 52행 정산기준 select → `AppDropdown`(옵션 2개 배열화). `handleChange`가 `event` 대신 문자열 인자를 받도록 시그니처 변경(같은 파일 안에서만 쓰임, 외부 영향 없음) |
| `src/components/ReportDetailView.jsx` | 143 | 42행 거래처선택 select(`ReportClientPickerModal`) → `AppDropdown`. `options.map(o => ({value:o, label: o==='ALL'?'전체 (모두)':o}))` |
| `src/components/revenue/OwnerRevenueView.jsx` | 175 | 131행 기사선택 select → `AppDropdown`. `[{value:ALL_DRIVERS,label:'전체 기사 합산'}, ...subCars.map(...)]` |
| `src/components/CustomerCenterPage.test.js` | — | 88행 `assert.ok(container.querySelector('select'))`가 이번 변경으로 깨짐(네이티브 select가 사라짐) — `AppDropdown`의 트리거 버튼(`.app-dropdown-trigger`) 존재로 검사 대상 교체. 검사 의도(문의유형 컨트롤이 렌더됐는지) 동일 유지, 약화 아님 |

**파일 수가 10개로 많지만**, ①신규 2개+래퍼 축소 2개는 슬라이스 1에서
이미 검증된 로직을 옮기기만 하는 것(새 설계 없음), ②5개 사용처
교체는 슬라이스 1과 동일한 1:1 패턴 반복이라 하나의 슬라이스로
묶음(AGENTS §3 "무한 세분화 금지"). 더 쪼개면 로직 이동과 사용처
교체가 서로 다른 커밋에서 어중간하게 걸치게 됨.

### 안 건드릴 것

- `CalendarHeader.jsx`·슬라이스 1의 5개 파일 — `CalendarDateSelect`
  외부 API·렌더 결과 무변경이라 안 건드림.
- `OwnerRevenueView.expensesSoT.test.js` — grep 확인 결과 select/driverVehicle
  DOM 검사 없음, 무관.
- 나머지 도메인 로직(문의 저장, 결제조건 계산, 정산기준 저장, 리포트
  집계, 기사 매출 계산) — 마크업 치환만, 값 계산 로직 무변경.

### §6 200줄 체크

- `CustomerCenterPage.jsx`(226→약 229) — 기존 초과 승계, 신규 위반 아님.
- 나머지 8개 변경 파일은 전부 200줄 이내(가장 큰 `AppDropdown.jsx`도
  ~125줄 예상).

### 실패 시 처리

새 저장소·큐·fallback 없음(§7 해당 없음) — 컴포넌트 추출 + 마크업
치환. 문제 생기면 해당 파일만 되돌리고 나머지는 유지, 어느 화면에서
문제인지 보고 후 재시도.

### 검증 방법 (브라우저, 5개 사용처 + 다크모드)

1. 고객센터 1:1 문의 — 문의유형 드롭다운 클릭·선택·제출.
2. 거래처 등록/수정 — 결제조건 드롭다운, 조건별 추가입력(예: N일 후)
   노출 유지 확인.
3. 정산·계산서 설정 — 기준 드롭다운 선택 시 안내문구·저장 토스트 정상.
4. 운송비 내역서 "세부 내역서 조회" — 거래처선택 드롭다운.
5. 매출(차주) 기사 탭 — 기사선택 드롭다운, "전체 기사 합산" 포함.
6. 다크모드에서 위 5곳 + 기존 연/월 드롭다운(슬라이스 1) 스타일이
   전부 통일돼 보이는지 육안 확인.

---

## 다음 슬라이스 (착수 전 대기)

**§9 기사연동관리 전체 대조** — `docs/ui-comparison-report.md` §9.
착수지시서 별도 작성 필요.

**E의 나머지 항목** / **E 착수 전 P0** (`setTimeout(420)` vs `0.4s`) —
이전과 동일.

**후속(비긴급)**: `--icon-color` 죽은 변수, 하드코딩 hex 중복.
`.date-select`(네이티브) CSS — 이번 슬라이스 후 사용처 0이면 제거는
후속 nit.
