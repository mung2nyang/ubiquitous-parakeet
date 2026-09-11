# docs/report.md — 현재 슬라이스 착수지시서

> 직전 완료 슬라이스(게스트 데이터 유실 버그 `[x]`, 연동 기사 거래처
> 스코프 불일치 `[x]` + 3그룹 교차검증) 상세는
> `docs/archive/guest-data-loss-and-client-scope-2026-09-11.md`로 옮김(동결).

---

## "부가세 해제" 레이블 16px 잔존

### 배경

`ui-comparison-report.md` §1-A(콜상세 폼 CSS 4건) 조사 때 발견, 범위 밖이라
별도 슬라이스로 미뤄둔 항목(`docs/archive/day-log-part2-scroll-card-bugs.md`
"참고 — 범위 밖" 절). STATUS.md "다음 할 일" 1번.

### 조사 결과

원본([style.css:6060-6068](../style.css:6060))은 콜상세 인라인(아코디언)
버전 한정으로 "부가세 해제" 레이블에 작은 글자 크기를 스코프해서 줍니다:

```css
#workModal .call-detail-inline-host .call-vat-row > label:first-child {
    color: var(--text-color);
    font-size: var(--fs-2);
}
```

react-app([call-detail-form.css:131-136](../react-app/src/components/day-log/call-detail-form.css:131))의
대응 규칙 `.work-log-page .call-vat-row { ... }`엔 레이아웃(flex·margin)만
있고 `font-size` 지정이 아예 없습니다 — 그래서 "부가세 해제" 레이블만
브라우저 기본 크기(16px)로 남아 있습니다. `CallDetailForm.jsx`의 두 분기
(`settings.paymentOn` true/false, [CallDetailForm.jsx:186](../react-app/src/components/day-log/CallDetailForm.jsx:186)·
[:208](../react-app/src/components/day-log/CallDetailForm.jsx:208))가 마크업이
동일(`<div className="call-vat-row"><label>부가세 해제</label><label className="switch">…`)해서
CSS 규칙 하나로 둘 다 커버됩니다.

### 목표 상태

"부가세 해제" 레이블이 원본과 같이 `var(--fs-2)` 크기로 표시된다(계산서
켜짐/꺼짐 두 분기 모두).

### 건드릴 파일 (정확히 1개)

**`react-app/src/components/day-log/call-detail-form.css`** — 기존
`.work-log-page .call-vat-row { ... }` 규칙(131번째 줄) 바로 다음에 규칙
추가:

```css
.work-log-page .call-vat-row > label:first-child {
  font-size: var(--fs-2);
}
```

`--fs-2`는 이미 전역 토큰(`account-flow.css`, `App.jsx`에서 1회 import)이라
새 변수 정의 불필요 — 이 파일도 이미 `var(--fs-floor)` 등 같은 토큰군을
쓰고 있음(회귀 없음).

### 안 건드릴 것

- `CallDetailForm.jsx` — 마크업은 이미 원본과 동일 구조, JS 무변경.
- 다른 `.call-vat-row` 사용처(발견 안 됨 — 이 폼 전용 클래스).

### §6 200줄 참고

이 파일은 이미 "한 폼 컴포넌트 응집" 사유로 §6 예외(~250줄)를 받은
파일(251줄, 파일 상단 주석에 명시). 이번 3줄 추가로 254줄이 됨 — 기존
승인된 예외 범위(~250) 근처라 별도 분리설계안 없이 진행하되, 보리가
더 엄격하게 보고 싶으면 알려주세요.

### §8 4대 질문

1~4. 무관 — 순수 CSS 한 줄 추가, 구독·값 출처·쓰기창구·hydrate 전부 무변경.
5. (DB) 무관.

### 검증 방법

- CI 자동(test·typecheck·build) — CSS만 바뀌므로 통과 예상, 스냅샷/시각
  테스트는 없음(코드 리뷰로 대체).
- 보리 브라우저 실검증:
  1. 일일운행 → 콜상세 추가/수정 폼 열기 → "부가세 해제" 레이블 글자
     크기가 다른 레이블(계산서, 입금 예정일 등)보다 작게 보이는지.
  2. 계산서 항목 켜짐/꺼짐(설정 → "일지 세부 입력" 안 계산서 토글)
     두 상태 모두 확인.
  3. 라이트·다크 테마 둘 다 확인(색상 무변경, 크기만 확인).

**→ 보리 확인 완료 (2026-09-11).** 위 목표 상태·건드릴 파일(1개, CSS
3줄)로 진행 — 작업자 전달.
