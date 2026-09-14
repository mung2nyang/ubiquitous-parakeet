# §2-1-C. 차량관리 전용 CSS 분리 — `[x]` 완료 (2026-09-14)

react-app 최종 커밋: `2e1fcac`. CI 초록, 보리 실검증·최종 승인 완료.

**보리 지시(2026-09-14) — "지금 화면별 대조 작업하고 있으니
[차량관리 CSS 분리도] 해야겠지."** `side-menu.css`(1617줄)에서
차량관리 전용 스타일을 떼어내 마이페이지(`mypage.css`)·매출
(`revenue.css`)·일일운행(`day-log-*.css`)과 같은 패턴으로 정리.

## 조사 결과 (원본 아님 — react-app 내부 클래스 사용처 전수 확인)

**"`car-`로 시작하면 차량관리 전용"이라는 가정이 틀렸다** —
`side-menu.css`의 `.car-*` 클래스 17개를 전부 grep으로 실사용처
대조한 결과, 이름과 달리 **대부분 다른 화면과 공유 중**:

- **진짜 차량관리 전용(안전하게 이동 가능)**: `car-list`(147행)·
  `car-info-text`(170행, `.management-list-card` 안에서만 쓰임)·
  `car-settlement-mode-guide`(302행)·`car-driver-connect`/
  `car-driver-connect-tabs`/`car-driver-connect-copy`(446~459행) —
  전부 `components/cars/` 폴더 파일에서만 사용.
- **이름은 `car-`지만 실제로는 전역 공용**(옮기면 다른 화면 깨짐,
  손 안 댐): `car-action-btns`(차량·거래처 2곳·기사연동관리·미수금
  5개 파일 공유) · `car-sub-text`(9개 파일 공유) · `car-type-hint`
  (9개 파일 공유) · `car-commission-value`/`car-commission-type`/
  `car-commission-input`(차량+거래처 `ClientTradeFields.jsx` 공유) ·
  `car-option-copy`/`car-commission-panel`(**거래처 전용**, 이름만
  `car-`).
- **`car-management-page`**(131행)는 11개 페이지 클래스가 한
  선택자에 묶여 `min-height`/`padding-bottom`/`text-align`을
  공유하는 "페이지 셸" 패턴 — 차량관리만 빼내면 나머지 10곳과
  원본이 갈라져서 **안 옮기고 `side-menu.css`에 그대로 둠**.
- **죽은 CSS 발견**: `car-commission-heading`+`strong`+`span`
  (336~353행, 18줄)·`car-daylog-preview`+`li`(461~479행, 19줄) —
  전체 `*.jsx` grep 0건. **보리 결정: 지금 손대지 말고 이관 완료 후
  처리** — `STATUS.md` "이관 완료 시 처리할 숙제"·
  `docs/ui-comparison-report.md` §2에 등재.

## 설계

신규 `react-app/src/components/cars/car-management.css` — "진짜
차량관리 전용" 블록만 그대로 이동(값 변경 없음). `CarListPage.jsx`에
`import './car-management.css'` 1줄 추가(마이페이지가 `MyPage.jsx`에서
`mypage.css`를 import하는 것과 동일 패턴).

## 구현 정정 (착수 시 재검증)

착수지시서는 `.car-list`를 차량관리 전용으로 적었으나, **재grep 결과
`MaintFuelPage.jsx`도 `className="car-list"` 사용** — 옮기면 정비/주유/
기타 목록 레이아웃이 깨짐. 공용 원칙대로 **`.car-list`는
`side-menu.css`에 남김.** 나머지 5블록만 이동.

## 구현 (react-app `2e1fcac`)

1. 신규 `components/cars/car-management.css` —
   `.management-list-card .car-info-text` · `.car-settlement-mode-guide` ·
   `.car-driver-connect` · `.car-driver-connect-tabs` ·
   `.car-driver-connect-copy` (값 변경 없음).
2. `CarListPage.jsx` — `import './car-management.css'`.
3. `side-menu.css` — 위 5블록 삭제(`.car-list`·공유 `car-*`·죽은 CSS
   `car-commission-heading`/`car-daylog-preview`는 그대로).

`npm test` 통과.

## §5 리뷰 (CI 초록 후 확정)

| # | 결과 |
|---|---|
| 1 범위 | 지시서 대비 `.car-list`만 공유로 제외(착수 시 정정)·나머지 일치, 건드린 파일 딱 3개 |
| 2 몰래 증설 | `car-management.css`만 신규, 값/선택자 변경 없음 |
| 3 타입 꼼수 | 없음 |
| 4 200줄 | 신규 33줄, `CarListPage.jsx` +1줄(178줄) |
| 5 테스트 | 테스트 파일 변경 0건 |
| 6 CSS 영향범위 | 이동한 5개 클래스 전부 `components/cars/`에서만 쓰는 것 사전 확인(grep) — 다른 화면 영향 없음. `car-management.css`는 `CarListPage.jsx`가 import, Vite 번들이라 하위 컴포넌트(`CarDriverConnectPanel` 등)에도 정상 적용 |
| 7 요구사항 | 차량관리 전용 CSS 분리 완료(공유 클래스·죽은 CSS는 의도적으로 미이동) |

## 검증 (보리)

- CI(`verify`·`Deploy GitHub Pages`) `2e1fcac` 둘 다 초록.
- 브라우저 실검증: 차량관리 목록 카드·등록/수정 모달 수수료 안내·
  기사연동 탭, 라이트/다크 이전과 동일 확인. 공유 `car-*` 화면
  (정비/주유/기타·거래처·미수금) 회귀 없음. "잘했다" 최종 승인
  (2026-09-14).
- **참고**: `side-menu.css`가 일일운행 완료 시점(1576줄) 대비 이번
  분리 후에도 1586줄로 오히려 10줄 증가 — §2-1-B(아이콘 공용화)가
  새로 추가한 CSS(~35줄)가 이번 분리로 줄인 31줄보다 많았기 때문
  (순감소가 아니라 두 작업을 합친 결과, 이상 없음).
