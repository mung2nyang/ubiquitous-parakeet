# `side-menu.css` 다이어트 — 공용 컴포넌트화 이력 (동결)

> 2026-09-10 완료. 아래는 요약 + `docs/report.md`에 있던 상세 착수지시서·
> 검증 로그(구 §32~§41) 전체를 그대로 옮긴 원본(동결, 재사용·수정 금지).

## 배경

PageHeader 통일 작업 완료 후, 보리가 "화면별 CSS 분리보다 공용
컴포넌트화·전용 스타일 정립을 최우선으로" 방향을 확정(2026-09-10).
당시 2,155줄이던 `side-menu.css`를 감시관이 전수 조사해 Rule of
Three(3회 이상 완전히 동일한 반복)가 확실한 패턴부터 순서대로
공용화했다.

## 진행

1. **form-group/input-box 공용 클래스** — 차량/거래처/개인정보·앱설정
   모달의 `form-group`/`label`/`input-box` 완전 동일 중복 3곳을
   `shared-controls.css`에 조합 셀렉터로 통합, `side-menu.css` 중복
   9블록 삭제. 조사 중 스코프가 없어 미적용 상태였던
   `ReportDetailView.jsx`의 거래처 선택 모달도 같이 통일(보리 승인,
   작은 시각적 변화 1건).
2. **`shared-controls.css` 200줄 초과 주석 추가** — 187→215줄로 처음
   200줄을 넘은 것을 사후 발견, 보리 확인 후 1줄 주석으로 마무리.
3. **`.car-modal`/`.client-modal` shell 통합** — 완전 동일 4선언,
   5개 소비처를 하나로 통합.
4. **죽은 클래스 `dark-pill-group` 제거**.
5. **`shared-controls.css` 분할** — 224줄까지 늘어 "범용 컨트롤"과
   "모달 폼 패턴" 두 성격으로 갈라져 있던 걸 신규 `src/modal-form.css`
   (37줄)로 분리, `shared-controls.css`는 187줄로 복귀.
6. `pill-btn`/`dark-pill-btn`은 용도·클릭동작·컨텍스트별 실제 모양이
   달라 **병합 보류로 결론**(조사만 하고 손 안 댐).

## 결과

- `side-menu.css` 중복 제거로 다이어트, 2,155줄에서 지속 감소.
- 전수조사 결과 남은 건 화면별 전용 스타일뿐, 더 뽑아낼 진짜 중복은
  없음(감시관 확인).
- 다음 순서로 `docs/ui-comparison-report.md` §2~14(화면별 UI 대조)를
  진행하면서, 그 화면을 열어보는 김에 전용 CSS도 같이 떼어내기로
  확정(2026-09-10, 상세는 `docs/report.md` 최신 슬라이스).

## 사고 기록 (참고, 문제 없음으로 종결)

`47f92af`(`side-menu.css` 여분 `}` 제거) 커밋이 감시관 리뷰 때 범위
밖으로 플래그됐으나, **보리 본인이 파일 확인 중 직접 고쳐 커밋·push한
것으로 확인**(작업자 범위 규칙은 작업자에게 적용되는 것이라 사용자
본인 직접 수정은 해당 사항 아님) — 문제없음.

---

## 상세 원본 로그 (구 `docs/report.md` §32~§41, 2026-09-10 그대로 이관)

> 아래는 `docs/report.md`에서 슬라이스 진행 중 실시간으로 작성됐던
> 착수지시서·완료확인·리뷰 원문이다. 이관 과정에서 문구를 고치지
> 않았다 — 섹션 번호(§32, §33 등)도 당시 report.md 안에서의 번호
> 그대로다.

## 32. 이번 슬라이스 — form-group/input-box 공용 클래스 도입 (side-menu.css 다이어트 1차)

보리 지시(2026-09-10) "side-menu.css 화면별 분리보다 공용 컴포넌트화·전용
스타일 정립을 최우선으로" 반영 — 감시관이 side-menu.css 2,155줄 전수
조사 후 Rule of Three(3회 이상 반복) 확실한 첫 패턴부터 착수.

### 조사 결과
- `.car-modal .form-group`(side-menu.css:265)·`.client-modal .form-group`(:503)·
  `.personal-info-page .form-group, .app-settings-page .form-group`(:597) —
  3개 스코프에 `margin-bottom:14px; text-align:left` **완전히 동일한 선언**이
  반복. `.form-group label`(:270,:508,:603)·`.input-box`의 `text-align:left`
  오버라이드(:277,:515,:611)도 각각 동일 패턴 반복.
- 전체 코드베이스에서 `.form-group`을 쓰는 파일은 14개(day-log 폼, 각종
  모달, 리포트 모달 등) — 그중 `CarFormModal`·`DriverFormModal`·
  `TaxInvoiceDraftModal`·`ClientFormModal`·`ExpenseFormModal`(비인라인)은
  이미 `car-modal`/`client-modal` 래퍼 클래스를 쓰고 있어 위 3스코프로
  이미 커버됨(확인 완료, 영향 없음).
- **`ReportDetailView.jsx`의 `ReportClientPickerModal`**(거래처 선택
  모달, 리포트 "세부 내역서 조회")만 스코프 클래스가 없어 지금은
  `.form-group`/`.input-box`에 위 규칙이 하나도 안 걸림(여백 없음,
  select 기본 가운데정렬) — **보리 확인·승인 완료**: 이 모달도 같은
  패턴으로 통일해 여백·왼쪽정렬이 새로 생기는 것(작은 시각적 변화)까지
  포함해서 진행.
- `CallDetailForm.jsx`·`PalletSection.jsx`·`ClientTradeFields.jsx`
  등 나머지 소비처는 **이번에 건드리는 스코프 목록에 안 들어가므로
  무영향**(아래 "안 건드릴 것" 참고) — 전역 `.form-group`/`.input-box`를
  스코프 없이 통째로 바꾸는 게 아니라, **명시적 스코프 목록에 추가하는
  방식**이라 다른 화면 blast radius 없음.

### 목표 상태
`shared-controls.css`(기존 "여러 화면 공유 CSS" 파일, 10차 해체 슬라이스
때 신설)에 아래 조합 셀렉터 규칙 1벌만 추가하고, `side-menu.css`의 중복
9블록을 삭제한다. `ReportDetailView.jsx`의 모달 래퍼에 새 스코프
클래스 1개만 추가(그 외 JSX/로직 무변경).

```css
/* shared-controls.css에 추가 */
.car-modal .form-group,
.client-modal .form-group,
.personal-info-page .form-group,
.app-settings-page .form-group,
.report-picker-modal .form-group {
  margin-bottom: 14px;
  text-align: left;
}

.car-modal .form-group label,
.client-modal .form-group label,
.personal-info-page .form-group label,
.app-settings-page .form-group label,
.report-picker-modal .form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: var(--fs-2);
  font-weight: 750;
}

.car-modal .input-box,
.client-modal .input-box,
.personal-info-page .input-box,
.app-settings-page .input-box,
.report-picker-modal .input-box {
  text-align: left;
}
```

### 건드릴 파일 (정확히 3개)
1. `react-app/src/shared-controls.css` — 위 조합 규칙 3블록 추가(파일 끝).
2. `react-app/src/side-menu.css` — 아래 9블록(3스코프×3규칙) **삭제**:
   - 265~279줄(`.car-modal .form-group`/`label`/`.input-box`)
   - 503~517줄(`.client-modal .form-group`/`label`/`.input-box`)
   - 597~614줄(`.personal-info-page`+`.app-settings-page .form-group`/
     `label`/`.input-box`)
   (`.car-modal`·`.client-modal` 모달 shell 크기 규칙 자체는 무변경, 그
   앞뒤 다른 규칙도 무변경.)
3. `react-app/src/components/ReportDetailView.jsx` — `ReportClientPickerModal`의
   `<div className="modal-content">`를
   `<div className="modal-content report-picker-modal">`로 클래스 1개
   추가(다른 로직·마크업 무변경).

### 안 건드릴 것
- `CallDetailForm.jsx`·`PalletSection.jsx`·`ClientTradeFields.jsx`·
  `CarDriverConnectPanel.jsx`·`call-detail-form.css`·`fixed-route.css` 등
  나머지 `.form-group`/`.input-box` 소비처 — 스코프 목록에 없으므로
  현재 동작 그대로.
- `.car-modal`/`.client-modal`(모달 shell 너비·높이 규칙) 자체 — 무변경.
- `shared-controls.css`의 기존 `.input-box` 기본 정의(175번대,
  `text-align:center`) — 그대로 둠. 이번 추가 규칙은 `.form-group`/
  `.car-modal`/`.client-modal`/`.report-picker-modal` 등 **조상 스코프가
  있을 때만** 걸리는 하위 선택자라 전역 기본값에 영향 없음.

### §8 4대 질문 — 순수 UI 스타일 통합(회귀 없는 3곳 + 승인된 시각적
변화 1곳), 새 저장소·레이어 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동(test·typecheck·build).
- 감시관 브라우저 실측: 라이트/다크 각각
  1. 차량관리·거래처관리·개인정보·앱설정 모달 폼 — 분리 전/후 컴퓨티드
     스타일(margin-bottom·text-align) 완전 일치 확인
  2. 리포트 "세부 내역서 조회" 거래처 선택 모달 — 새로 여백·왼쪽정렬이
     적용됐는지 스크린샷 확인(승인된 의도된 변화)
  3. `CallDetailForm`(콜상세 폼) 최소 1개 필드 — 분리 전/후 무변화 확인
     (스코프 밖 소비처 무영향 재확인)

**→ 착수 승인 대기.**

## 33. §32 슬라이스 완료 확인 (2026-09-10)

작업자 커밋(`99c5c6e0`) → 보리 push 확인 → CI green(verify
`34440701811`·deploy `34440701795` 둘 다 success, headSha 일치).

- **§5 7항목 검토**: ①범위 준수 — 지시한 3파일(`shared-controls.css`·
  `side-menu.css`·`ReportDetailView.jsx`)만 변경, diff가 지시서와
  라인 단위 일치 ②몰래 증설 없음 — 새 파일·저장키·durable 레이어 0,
  순수 CSS 이동 + 클래스명 1개 추가뿐 ③타입 꼼수 없음(`any`/
  `@ts-ignore`/`@ts-expect-error`/`as unknown as` grep 0건) ④200줄 —
  `side-menu.css` 2104줄(감소)·`ReportDetailView.jsx` 143줄 문제없음,
  **`shared-controls.css`만 187→215줄로 이번에 처음 200줄을 넘김**(아래
  참고, 사용자 확인 필요) ⑤테스트 파일 변경 0 ⑥`.md` 변경 0 ⑦요구사항
  — 지시서의 3블록 조합 셀렉터 그대로 구현, `ReportClientPickerModal`에
  `report-picker-modal` 클래스 추가까지 확인.
- **감시관 브라우저 실측**(로컬 dev 서버, 게스트 세션, 375×812):
  1. 차량관리 수정 모달 — `getComputedStyle`로 `.form-group`
     (`margin-bottom:14px`/`text-align:left`)·`label`(`display:block`/
     `margin-bottom:8px`/`font-weight:750`)·`.input-box`
     (`text-align:left`) 전부 지시서 값과 완전 일치 확인.
  2. 리포트 "세부 내역서 조회" 거래처 선택 모달 — 동일 3항목 전부
     지시서 값과 일치 확인 + 스크린샷으로 여백·왼쪽정렬 적용된 모습
     시각 확인(승인된 의도된 변화 그대로).
  3. 콜상세 폼(`CallDetailForm.jsx`/`call-detail-form.css`) — 두 파일
     모두 diff 0줄, 새로 추가된 조합 셀렉터의 조상 스코프
     (`.car-modal`/`.client-modal`/`.personal-info-page`/
     `.app-settings-page`/`.report-picker-modal`) 중 콜상세 폼을 감싸는
     것이 하나도 없어 **정적으로 매칭 자체가 불가능**함을 셀렉터
     대조로 확인(런타임 진입은 입력모드 전환이 필요해 스킵, 셀렉터
     대조로 충분히 갈음).
  - 변경된 속성(margin-bottom·text-align·display·font-size·font-weight)이
    전부 비색상 값이라 라이트/다크 테마 차이 없음 — 다크모드 별도
    재확인 생략.

**⚠️ `shared-controls.css` 187→215줄, 이번 슬라이스에서 처음 200줄
초과(+15). §6 "응집도 우선, ~250줄까지 이유 1줄 주석" 예외 범위 안에
있고(기존 `linked-driver.css` 220·`calendar.css` 246·
`call-detail-card.css` 217·`call-detail-form.css` 207 선례와 같은 폭),
착수지시서 단계에서 이 임계값 교차를 미리 못 짚어 사전 승인이 없었음
— 보리 확인 필요(주석 추가 여부 포함).**

`[x]` — 아래 §35(200줄 주석 추가) 완료로 확정.

## 34. §32 후속 — shared-controls.css 200줄 초과 주석 추가 (보리 지시)

보리 결정(2026-09-10): "여러 화면 공유 CSS라 200줄 넘김"인데, **다음에
또 추가할 땐 분할**한다는 걸 파일에 주석으로 남기고 `[x]` 확정.

### 건드릴 파일 (정확히 1개)
`react-app/src/shared-controls.css` — 1번째 줄 기존 주석 끝에 아래
문구만 이어 붙임(다른 내용 무변경):

```
/* 월 이동기·요약 카드·설정 헤더·아이콘 버튼·토글·입력 기본형 — main-calendar.css에서 옮김. App.jsx가 app-shell-base.css 다음에 import. */
/* 여러 화면 공유로 200줄 초과 — 다음에 늘면 분할. */
```

### 안 건드릴 것
- 이 파일의 CSS 규칙 자체(§32에서 추가한 3블록 포함) — 무변경.
- 그 외 모든 파일 — 무변경.

### 검증 방법
- CI 자동(주석 1줄이라 빌드 영향 없음, test·typecheck 그대로 통과 확인만).
- 감시관: `git show --stat`로 이 파일 1줄만 바뀐 것 확인 후 바로 `[x]`.

**→ 착수 승인됨(보리 지시 그대로), 작업자 전달.**

## 35. §34 완료 확인 (2026-09-10) — `[x]` 최종 확정

작업자 커밋(`d58c05c`) → 보리 push 확인 → CI green(verify
`34441813867`·deploy `34441813855` 둘 다 success, headSha 일치).
`git show --stat` 확인 결과 `shared-controls.css` 1파일·1줄 추가뿐
(지시서 문구 그대로, 축약 반영됨). 별도 브라우저 재검증 불필요(주석
전용, 렌더링 영향 없음).

**§32(form-group/input-box 공용화) 전체 `[x]` 확정.** `STATUS.md` 갱신
완료.

## 36. 이번 슬라이스 — `.car-modal`/`.client-modal` shell 규칙 통합

조사(대화창) 결과: `.car-modal`(side-menu.css:265)·`.client-modal`(:480)이
`width`/`max-height`/`overflow-y`/`text-align` 4개 선언 **byte 단위로
완전히 동일**. 실사용 5곳(`CarFormModal`·`ClientFormModal`·
`DriverFormModal`·`ExpenseFormModal`(비인라인)·`TaxInvoiceDraftModal`) —
Rule of Three 충족. 다른 모달(`call-detail-modal-content`·
`maint-fuel-select-inline`·`report-share-content`)은 폭·패딩이 달라
이번 대상 아님(대화창에서 확인 완료).

### 목표 상태
`shared-controls.css`(§32에서 이미 이 두 클래스를 나란히 다루는 곳)에
조합 셀렉터로 옮기고 `side-menu.css`의 중복 2블록 삭제. **JSX 변경
없음**(`car-modal`/`client-modal` 클래스명 그대로 유지, CSS 정의
위치만 통합) — 시각적 변화 0.

```css
/* shared-controls.css에 추가 */
.car-modal,
.client-modal {
  width: min(92vw, 360px);
  max-height: min(82vh, 640px);
  overflow-y: auto;
  text-align: left;
}
```

### 건드릴 파일 (정확히 2개)
1. `react-app/src/shared-controls.css` — 위 조합 규칙 추가.
2. `react-app/src/side-menu.css` — 265~270줄(`.car-modal`)·480~485줄
   (`.client-modal`) 두 블록 삭제.

### 안 건드릴 것
- 5개 소비처 JSX 전부 — 클래스명 무변경.
- `.client-modal-header`(별도 규칙, 이번 대상 아님).
- §32에서 추가한 `.form-group`/`.input-box` 조합 규칙 — 무변경.

### §8 4대 질문 — 순수 CSS 위치 통합, 해당 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관 브라우저 실측: 차량관리 수정 모달·거래처 등록 모달 2곳
  컴퓨티드 스타일(`width`·`max-height`·`text-align`) 분리 전/후 일치
  확인.

---

## 37. 이번 슬라이스 — 죽은 클래스 `dark-pill-group` 제거

조사(대화창) 결과: `dark-pill-group`은 `CallDetailForm.jsx` 3곳에만
클래스로 붙어 있고 **CSS 정의가 전체 코드베이스에 하나도 없음**(전체
`*.css` grep 0건) — 실제 레이아웃은 같이 붙은 `call-platform-quick-list`/
`call-client-shortcuts`/`call-receipt-group`이 전담. 지워도 렌더링
무변화(죽은 클래스명 제거일 뿐).

### 건드릴 파일 (정확히 1개)
`react-app/src/components/day-log/CallDetailForm.jsx` — 아래 3곳에서
`dark-pill-group ` 문자열만 제거(나머지 클래스·로직 무변경):
- `className="dark-pill-group call-platform-quick-list"` →
  `className="call-platform-quick-list"`
- `className="dark-pill-group call-client-shortcuts"` →
  `className="call-client-shortcuts"`
- `className="dark-pill-group call-receipt-group"` →
  `className="call-receipt-group"`

### 안 건드릴 것
- `dark-pill-btn`(버튼 클래스 자체, CSS 정의 있음, 이번 대상 아님) — 무변경.
- 그 외 모든 파일.

### §8 4대 질문 — 순수 죽은 클래스 제거, 해당 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관 브라우저 실측: 콜상세 폼 플랫폼/거래처빠른선택/계산서여부
  3구역 분리 전/후 컴퓨티드 스타일·레이아웃 완전 일치 확인.

**→ §36·§37 둘 다 착수 승인됨(순서대로 진행). 작업자 전달.**

## 38. §36·§37 완료 확인 (2026-09-10)

작업자 커밋(`10a78cb`·`803a1ac`) → 보리 push 확인 → CI green(verify
`34443433275`·deploy `34443433294` 둘 다 success, headSha 일치).

- **§36(모달 shell 통합)**: diff가 지시서와 라인 단위 일치(2파일만).
  감시관 브라우저 실측(게스트, 로컬 dev): 차량관리 수정 모달(`.car-modal`)·
  거래처 등록 모달(`.client-modal`) 둘 다 `getComputedStyle`로
  `width`(323.049px, `min(92vw,360px)` 그대로)·`max-height`·
  `overflow-y`(auto)·`text-align`(left) **완전히 일치** 확인.
- **§37(`dark-pill-group` 제거)**: diff가 지시서와 라인 단위 일치(1파일).
  "운행 일지 세부 입력"+"플랫폼 입력"+"결제 및 수금 입력" 설정을 켜고
  실제 콜상세 폼 진입해 확인: `.call-platform-quick-list`(display:grid,
  3열, gap:6px)·`.call-receipt-group`(display:flex, gap:5px) 컨테이너
  레이아웃 그대로, 내부 `.dark-pill-btn`도 컨텍스트 오버라이드값
  (min-height 44px·border-radius 10px·padding 6px 4px) 그대로 확인 —
  죽은 클래스 제거가 실제로 무영향임을 런타임으로도 재확인.
- **§5 7항목**: 범위 준수·몰래 증설 없음·타입 꼼수 없음(grep 0건)·200줄
  (아래 §39 참고)·테스트 변경 없음·문서 변경 없음·요구사항 충족 — 전부 통과.

**§36·§37 `[x]` 확정.**

## 39. `shared-controls.css` 분할 제안 (보리 관찰, 2026-09-10)

보리가 "분할 해야할거같아"로 제기 — 감시관 검토 결과:

**지금 당장 위험 수준은 아님**: 224줄로 기존 §6 "~250줄 응집 예외"
선례(`linked-driver.css` 220·`calendar.css` 246) 범위 안. 다만 내용이
**두 성격으로 이미 갈라져 있음**:
1. 진짜 범용 원자 컨트롤(4~188줄, ~185줄) — `date-navigator`·
   `summary-card`·`icon-btn`·`toggle-btn`·`input-box` 등, 화면 무관하게
   그냥 쓰는 것들.
2. **모달 폼 전용 패턴**(190~224줄, ~35줄) — `.car-modal`/`.client-modal`
   shell + 그 안의 `form-group`/`label`/`.input-box` 조합 규칙. §32·§36에서
   이번 세션에 추가한 것들.

**제안**: 지금 224줄이라 급하진 않지만, 앞으로 이런 "모달 폼 중복
정리" 작업이 더 나올 가능성이 있어 그때마다 `shared-controls.css`가
계속 늘어나는 것보다 **지금 한 번에 분리**하는 게 안전 — 신규 파일
`src/modal-form.css`(35줄)로 190~224줄을 그대로 옮기고
`shared-controls.css`는 188줄로 되돌아감(상단 "200줄 초과" 주석도
불필요해져 제거).

### 건드릴 파일 (정확히 3개)
1. `react-app/src/modal-form.css`(신규) — `shared-controls.css`
   190~224줄(`.car-modal,.client-modal` shell + form-group/label/
   input-box 조합 3블록) 그대로 이동.
2. `react-app/src/shared-controls.css` — 위 35줄 삭제, 1번째 줄 주석에서
   "여러 화면 공유로 200줄 초과 — 다음에 늘면 분할." 문구 삭제(더는
   해당 없음).
3. `react-app/src/app/App.jsx` — `import '../shared-controls.css'`
   다음 줄에 `import '../modal-form.css'` 추가.

### 안 건드릴 것
- CSS 선언 내용 자체 — 파일 위치만 이동, 값 변경 0.
- 그 외 모든 파일.

### §8 4대 질문 — 순수 파일 분할, 해당 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법
- CI 자동.
- 감시관: `.car-modal`/`.client-modal` 모달 1곳 컴퓨티드 스타일 분리
  전/후 일치 재확인(§36과 동일 방법).

**→ 착수 승인됨(보리, 2026-09-10). 작업자 전달.**

## 40. §39 완료 확인 + 범위 밖 커밋 발견 (2026-09-10, 보리 확인 필요)

작업자 커밋 확인 결과 **2개**가 올라옴:
- `ee1ba1f`(지시한 §39 그대로 — `App.jsx`+`modal-form.css`(신규)+
  `shared-controls.css` 정확히 3파일, diff 라인 단위 일치)
- **`47f92af`("side-menu.css 여분 `}` 제거") — §39 지시서에 없던
  `side-menu.css` 수정.** `.car-daylog-preview li` 규칙 뒤에 있던
  중복 닫는 괄호 1개 삭제(437~441줄 부근). 감시관이 이번 세션 맨 처음
  side-menu.css 전수조사 때도 봤던 것과 같은 지점 — **§32~§39 이전부터
  있던 기존 버그**로 보임(이번 슬라이스들이 새로 만든 게 아님). CSS
  파서가 최상위 잉여 `}`를 무시해 지금까지 CI·렌더링에 실제 영향은
  없었던 것으로 보이나, **지시서 "건드릴 파일" 밖이라 §5 ①범위 준수
  위반**.

### CI/실측
- CI green(`ee1ba1f`, verify+deploy 둘 다 success, headSha 일치).
- 감시관 브라우저 실측(게스트, 로컬 dev): 차량관리 수정 모달
  `.car-modal`(`width`323.049px·`text-align`left)·`.form-group`
  (`margin-bottom`14px·`text-align`left) — `modal-form.css` 분리
  후에도 값 완전 일치 확인.
- `shared-controls.css` 187줄로 정상 복귀, `modal-form.css` 37줄(신규).

### 판단 보류 — 보리 확인 필요
`47f92af`은 내용상 무해한(오히려 정상적인) 수정이지만, 지시 범위
밖이라 감시관이 임의로 `[x]` 처리 안 함. 아래 중 선택:
1. **그대로 승인**(무해한 사전 버그 수정으로 인정, 추가 조치 없음)
2. 다음부터 작업자에게 "지시 범위 밖 발견 시 먼저 보고만, 임의 수정
   금지" 재공지
둘 다 할 수도 있음(승인 + 재공지).

`[x]` — 아래 §41(보리 본인 확인)로 확정.

## 41. §40 후속 — `47f92af`는 보리 본인 직접 수정으로 확인, `[x]` 확정

보리 확인(2026-09-10): "그거 내가했어 — 저번 작업 때 거대 파일이라
확인하다 빨갛게 오류 표시된 여분 `}`를 발견해서 직접 지우고 커밋·
푸시함." 커밋 작성자도 보리 본인(Cursor 공동작성자 트레일러 없음,
다른 작업자 커밋들과 구분됨)과 일치 — **작업자 범위 규칙(AGENTS §1)은
작업자에게 적용되는 것이라 사용자 본인 직접 수정은 해당 사항 아님.**
추가 조치 불필요.

**§39(shared-controls.css 분할) + 보리의 side-menu.css 사전 버그 수정,
전체 `[x]` 확정.**

