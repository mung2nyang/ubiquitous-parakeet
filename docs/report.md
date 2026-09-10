# docs/report.md — 일일운행 콜상세 폼 CSS 4건 (`ui-comparison-report.md` §1-A)

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 직전 완료 슬라이스(§2 마이페이지 `8c1ccc7`, §3 매출 `1a5d702`) 상세는
> `docs/archive/report-snapshot-2026-09-10.md` §1·§2로 옮김(동결).

---

## 1. 이번 슬라이스 — 일일운행 1부: 콜상세 폼 CSS 4건

`ui-comparison-report.md` §1(일일운행) 재정리(2026-09-10, 보리가 원본
localhost:8791을 직접 띄워 대조해준 목록 + 감시관 재조사) 기준, **A그룹(콜상세 폼
CSS 4건)**만 이번 슬라이스. 누락 기능 3건(B그룹: 즐겨찾기 칩·거래처 +추가
버튼·산재보험료 필드)은 별도 슬라이스, 레이아웃 틀어짐(C)은 재현 못 해 보류,
시간 입력 커스텀 위젯은 별도 대형 작업.

### ⚠️ 1차 조사 오류 정정

1차 조사 때 `#callDetailModal`(순수 모달 팝업 버전) CSS만 보고 판단했는데,
**실제 일일운행 화면에서 쓰이는 건 `#workModal .call-detail-inline-host`(인라인
아코디언 버전)** 였다. 두 버전 값이 다른 곳이 있어 아래 2곳 정정:
- ~~`.load-label`/`.unload-label`의 `font-weight:800` 제거~~ → **원본 인라인
  버전([style.css:5964](ubiquitous-parakeet/style.css:5964))에도 있음 — 그대로 둠.**
- ~~레이블 전체를 `fs-3`로 통일~~ → **원본은 두 그룹 설계**: `.form-group` 안
  레이블(상차지·하차지·시간·계기판·입금예정일)=`fs-3`, `.call-detail-panel` 직계
  레이블(거래처·계산서·비고) 및 `.call-inline-field` 레이블(운송료·톤수·플랫폼)=`fs-2`.

### 조사 결과 (원본 인라인 버전 vs react-app)

**A-1. 헤더 "N일 일지 세부 입력" 날짜 숫자 누락** — 원본은 "5일 일지 세부 입력"처럼
날짜가 들어감(`.call-detail-modal-title`). react-app은 "운행 일지 세부 입력"(날짜 없음).

**A-2. 입력창 focus 파란 라운드 테두리 전체 누락 (앱 전역 버그)** — 원본
[style.css:6905](ubiquitous-parakeet/style.css:6905)에 `input:focus { border-color:
var(--primary-color); outline: 2px solid …; outline-offset: -2px }` 전역 규칙이
있는데 react-app 전체 CSS에 없음(`.auth-input-box:focus` 하나뿐). **콜상세 폼만이
아니라 앱 전체 모든 입력창.** 수정 위치 = 전역 `shared-controls.css`.

**A-3. 계기판 "km" 단위가 입력창 안쪽에 있어야 함** — 원본은
`.input-with-suffix{position:relative}` + `.suffix{position:absolute;right:10px}`
([style.css:6604](ubiquitous-parakeet/style.css:6604))로 "km"이 입력창 **안쪽**에
겹침. react-app `call-detail-form.css`는 `display:flex;gap:6px`로 **바깥**에 배치.

**A-4. 글자 크기·입력창 스타일 불일치 — 원인 2가지**
1. 원본 전역 [style.css:2686](ubiquitous-parakeet/style.css:2686) `.form-group label
   { font-size: var(--fs-3); font-weight: 600; color: var(--sub-text-color);
   padding-left: 4px }` 이 react-app에 없음 — **앱 전역**. `shared-controls.css`에 추가.
2. 원본 인라인 [style.css:6029](ubiquitous-parakeet/style.css:6029)의
   `.call-client-panel > label, #callDetailReceiptSection > label, .call-remarks-panel
   > label { font-size: var(--fs-2); font-weight: 800 }` 중 "거래처"·"비고"는
   react-app에 이미 있고, **"계산서" 레이블만 빠짐**(전용 스코프 없어 기본값 16px).
   `.call-detail-panel .input-box`(원본 `padding:8px 10px; border-radius:11px;
   font-size:var(--fs-2)`, [style.css:5969](ubiquitous-parakeet/style.css:5969))도 없음.

**참고** — §32~41 다이어트 중 지운 `dark-pill-group`은 무해 확인(플랫폼 퀵리스트·
계산서 그룹은 `call-detail-form.css`에 자체 grid/flex 있음), 롤백 불필요.

### 목표 상태

1. `shared-controls.css`에 원본과 동일한 전역 규칙 2개 추가:
   ```css
   :where(input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea, select):focus {
     border-color: var(--primary-color);
     outline: 2px solid var(--primary-color);
     outline-offset: -2px;
     box-shadow: none;
   }
   .form-group label {
     font-size: var(--fs-3);
     font-weight: 600;
     color: var(--sub-text-color);
     padding-left: 4px;
   }
   ```
   (다른 화면이 더 구체적인 선택자로 이미 오버라이드하면 그 화면엔 영향 없음 —
   §5 리뷰에서 다른 화면 회귀 확인.)
2. `CallDetailForm.jsx`: 헤더 타이틀에 날짜 삽입 —
   `{value ? '운행 일지 세부 입력 수정' : '운행 일지 세부 입력'}` →
   `` `${Number(dateKey.slice(8,10))}일 일지 세부 입력${value ? ' 수정' : ''}` ``;
   "계산서" 섹션 `<div className="call-detail-panel">`에 `call-receipt-panel` 클래스
   추가(스코프 확보용, JSX 로직 무변경).
3. `call-detail-form.css`:
   - `.input-with-suffix`를 절대위치 겹침 방식으로(`position:relative` +
     `.suffix{position:absolute;right:10px}`), 입력창 `padding-right`로 공간 확보.
   - `.work-log-page .call-detail-panel .input-box { padding: 8px 10px;
     border-radius: 11px; font-size: var(--fs-2) }` 추가(원본 인라인 값).
   - `.work-log-page .call-receipt-panel > label { font-size: var(--fs-2);
     font-weight: 800; margin: 0 0 7px 1px; color: var(--text-color) }` 추가.
   - `.load-label`/`.unload-label`의 `font-weight:800`은 **그대로 유지**(원본에도 있음).
4. CSS 분리: `side-menu.css` 811~835줄(`.call-client-shortcuts`·`.dark-pill-btn`·
   `.dark-pill-btn.active`, 25줄)을 `call-detail-form.css`로 그대로 이동(내용 무변경).

### 건드릴 파일 (정확히 4개)

1. `react-app/src/shared-controls.css` — 전역 focus + `.form-group label` 규칙 추가.
2. `react-app/src/components/day-log/CallDetailForm.jsx` — 헤더 날짜 삽입,
   `call-receipt-panel` 클래스 추가.
3. `react-app/src/components/day-log/call-detail-form.css` — input-with-suffix·
   input-box·계산서 레이블 규칙 추가(load/unload-label 무변경).
4. `react-app/src/side-menu.css` — 811~835줄 삭제.

### 안 건드릴 것

- `.load-label`/`.unload-label`의 `font-weight:800` — 원본에도 있음, 무변경.
- 구 항목4(시간입력 커스텀 위젯)·B그룹(누락 기능 3건)·C(레이아웃 틀어짐) — 전부 제외.
- `.call-platform-quick-list`·`.call-receipt-group`(자체 grid/flex 정상) — 무변경.
- `dark-pill-group` 관련 롤백 — 불필요 확인됨.
- 다른 화면 CSS·Store·DB — 무관(단 `.form-group label` 전역 추가라 §5에서 회귀 확인).

### §8 4대 질문

- CSS 정정 3건 + JSX 표시값 2곳(날짜 텍스트, 스코프용 className) + 파일 이동 1건.
  전부 순수 표시값/스타일. 구독/스냅샷·Store·DB 무관. 신규 레이어 없음.

### 검증 방법

- CI 자동(test·typecheck·build).
- 감시관 브라우저 실측:
  1. 콜상세 폼 헤더에 날짜(예: "10일 일지 세부 입력").
  2. 입력창 클릭 시 파란 테두리 — 콜상세 폼 + 다른 화면 입력창 1곳 샘플(전역 규칙).
  3. 계기판 "km"이 입력창 안쪽 우측에 겹쳐 보이는지.
  4. 레이블 크기 재실측 — 상차지/하차지/시간/계기판/입금예정일=fs-3,
     거래처/계산서/비고/운송료/플랫폼=fs-2로 두 그룹 정확히 갈리는지.
  5. `.form-group label` 전역 추가 후 다른 화면(차량관리 모달 등) 레이블 회귀 없는지.
  6. 라이트·다크 각각, 플랫폼/계산서 pill 그룹 레이아웃 무변화 회귀.

**→ 착수 승인 완료(보리) — 작업자 진행, 커밋 완료.** `[~]`.

## 1-1. 구현 결과와 감시관 검증 (2026-09-10)

작업자 커밋 react-app `c6c831b`(`fix: 콜상세 폼 CSS 4건을 원본 인라인 버전에
맞춤`), push 완료. GitHub Actions `CI`(run `34463131787`)·`Deploy GitHub Pages`
(run `34463131794`) 둘 다 `conclusion: success`, headSha `c6c831b` 일치.

**감시관 §5 7항목**
1. 범위 준수 — `git show --stat` 확인, 정확히 지시한 4파일(`shared-controls.css`·
   `CallDetailForm.jsx`·`call-detail-form.css`·`side-menu.css`)만 변경.
2. 몰래 증설 없음 — 새 저장소·상태·레이어 없음, 규칙 추가/이동뿐.
3. 타입 꼼수 없음 — 4파일 grep 결과 `any`/`@ts-ignore`/`@ts-expect-error`/
   `as unknown as` 신규 없음.
4. 200줄 — `call-detail-form.css` 251줄(§6 예외 상한 "~250줄까지"를 1줄 초과,
   경미), `shared-controls.css` 201줄(예외 범위 내), `CallDetailForm.jsx` 189줄.
   추후 정리 필요시 참고, 이번엔 보류 가능한 수준으로 판단.
5. 테스트 진실성 — 테스트 파일 변경 없음, 착수지시서 단계부터 계획대로.
6. 문서 정합 — diff에 `.md` 없음.
7. 요구사항 충족 — **브라우저 실측으로 4건 전부 확인**:
   - 헤더 "10일 일지 세부 입력" 날짜 정상 삽입.
   - 계기판 "km" — `position:absolute; right:10px`로 입력창 안쪽 겹침 확인.
   - 레이블 2단계 — 상차지/하차지/출발·도착시간/출발·마감계기판/입금예정일=13.6px
     (`fs-3`), 거래처/계산서/비고/운송료/플랫폼=12.48px(`fs-2`)로 정확히 갈림
     (계산서 레이블도 새 스코프로 정상 12.48px 확인).
   - **입력창 포커스 테두리 — 실측 결과 정상 작동**(`outline: solid 2px
     rgb(49,130,206)` 확인). 1차 점검 때 감시관이 CSS 명시도를 잘못 계산해
     "안 먹힌다"고 오판했던 것 — `:where(...):focus`와 `.input-box`가 실제로는
     동일 명시도(0,1,0)라 나중에 선언된 focus 규칙이 정상적으로 이김. 클릭
     테스트가 실제 포커스를 못 준 상태(`document.activeElement`가 계속
     `BODY`)에서 "안 보인다"고 잘못 판단했던 것도 원인 — 보리가 실제 화면
     스크린샷으로 정정해줌.
   - `.form-group label` 전역 규칙 추가로 인한 다른 화면 회귀 — 차량관리 등록
     모달에서 재확인, 기존 로컬 규칙(fs-2, weight 750)이 그대로 유지돼 회귀 없음.
   → **7항목 전부 통과.**

CI green + §5 7항목 통과 + 브라우저 실측 완료. 보리 최종 승인 **"승인"**(2026-09-10).

**A그룹(콜상세 폼 CSS 4건) — `[x]` 최종 확정.**

## 2. 앞으로 해야할 일 (이번 슬라이스 조사 중 발견, 착수 전)

### 2-1. 일일운행 화면 2중 스크롤 (원인 확정)

`app-shell-base.css`의 `.container.main-app-container`가 모든 화면 공통으로
`padding: 20px 16px 108px`(위+아래 128px)를 주는데, `day-log.css`의
`.work-log-page`는 `height: 100dvh`(뷰포트 전체 높이)로 고정돼 있어 실제
페이지 높이가 "뷰포트 높이 + 128px"가 되어 버려 바깥(body)에도 스크롤이 하나
더 생김(실측: 뷰포트 412px, 컨테이너 540px = 412+128, 정확히 일치). 콜상세 폼
CSS 4건(`c6c831b`)과는 무관한 `day-log.css`의 기존 구조 문제 — 보리가 스크린샷
으로 직접 짚어줌(2026-09-10). 다음 슬라이스(B그룹 또는 별도)에서 착수지시서
작성 필요.

### 2-2. "N일 일지 세부 입력" 섹션이 카드 밖으로 나감 (원인 확정, 1차 오판 정정)

**1차 판단 오류**: 감시관이 CSS만 보고 "원본도 카드 아닌 플랫 구조"라고
잘못 결론냈었음 — 보리가 원본·react-app 스크린샷을 나란히 짚어줘서 재조사,
**실제로는 구조적 버그가 맞음.**

- 원본 [index.html:1570-1581](ubiquitous-parakeet/index.html:1570): "운행 일지
  세부 입력" 제목+추가버튼과 펼쳐지는 폼(`callDetailInlineHost`)이 **같은 카드
  `<div id="modalCallDetailSection" class="modal-section">` 안에** 함께 있음
  (제목행 → 목록 → 인라인 폼 순서로 한 카드 안에서 이어짐).
- react-app: `CallDetailList.jsx`가 자기 카드(`<div className="modal-section
  call-detail-section">`)를 열고 [72번째 줄](react-app/src/components/day-log/CallDetailList.jsx:72)에서
  **닫아버린 뒤**, `DayLogPage.jsx` [151-165번째 줄](react-app/src/components/day-log/DayLogPage.jsx:151)에서
  콜상세 폼(`InlineSheet`)이 그 카드의 **형제 요소로 따로** 렌더링됨 — 그래서
  폼이 열리면 카드 경계 밖으로 나가 보임. CSS 값 문제가 아니라 **JSX 컴포넌트
  구조 문제** — 별도 수정지시서 필요(`CallDetailList`가 `children`을 받아 카드
  안에서 폼을 렌더링하도록 구조 변경, 또는 동일 효과의 대안).

### 2-3. "부가세 해제" 레이블도 16px로 남아있음 (범위 밖 발견)

원본 `.call-vat-row > label:first-child`에 `font-size:var(--fs-2)` 지정이
있는데(이번 착수지시서 조사에서 이 셀렉터를 놓침) react-app엔 없어 16px로
나옴. 이번 A그룹 4건 범위 밖이라 손 안 댐 — 다음 관련 슬라이스에서 같이 처리.

### 2-4. B그룹(누락 기능 3건) — 다음 슬라이스 예정

상차지/하차지 즐겨찾기 칩(`#callLocShortcuts`)·거래처 "+추가" 버튼·산재보험료
입력 필드 — `ui-comparison-report.md` §1-B 참고, 보리 결정으로 별도 슬라이스.
