# docs/report.md — 현재 슬라이스 착수지시서

> §2(차량 관리) 전체 완료 상세는
> `docs/archive/2-2-car-driver-link-and-connectmode-bugs-2026-09-15.md`로
> 옮김(동결). 전역 드롭다운 슬라이스 1(연/월 select → `CalendarDateSelect`,
> react-app `9df06e2`, `[x]` 완료) 상세는
> `docs/archive/dropdown-slice1-calendar-date-select-2026-09-15.md`로
> 옮김(동결). 그 이전 슬라이스들도 전부 `docs/archive/`에 동결돼
> 있음 — 폴더 목록에서 주제별로 찾는다.

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
`.date-select`(네이티브) CSS — 이번 슬라이스 후 사용처 0이면 제거는
후속 nit.
