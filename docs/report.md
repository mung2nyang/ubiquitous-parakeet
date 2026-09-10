# docs/report.md — 마이페이지 (`ui-comparison-report.md` §2~)

> 이전 작업(공용 헤더 `PageHeader` 통일, §1~§31 전체 `[x]` 완료) 이력은
> `docs/archive/pageheader-unification.md`로 옮김(동결). `side-menu.css`
> 다이어트(§32~§41 전체 `[x]` 완료) 이력은 `docs/archive/side-menu-css-diet.md`로
> 옮김(동결). 이 문서는 새 작업(`docs/ui-comparison-report.md` §2 "마이페이지")
> 부터 시작한다.

## 1. 이번 슬라이스 — 마이페이지(`ui-comparison-report.md` §2): 톱니바퀴 아이콘 경로 오타 수정 + 전용 CSS 분리

`docs/ui-comparison-report.md` 최상단 필수 원칙(보리 지시, 2026-09-10)에 따라
"화면 대조 + 그 화면 전용 CSS를 side-menu.css에서 분리"를 한 슬라이스로 진행.
대상은 §2 마이페이지, 발견 항목은 1건: "앱 설정 좌측의 톱니바퀴 아이콘 아래가
찌그러져 있음(스타일 충돌인 듯)".

### 조사 결과 (1차: 재현 안 됨 → 보리 스크린샷으로 재조사 → 원인 확정)

1차 조사(컴퓨티드 스타일·CSS 충돌 grep)로는 못 찾았는데, 보리가 실제
화면 스크린샷에 빨간 밑줄로 정확히 짚어줘서 재조사 — **CSS 문제가
아니라 아이콘 SVG `d`(도형 경로) 데이터 자체의 오타였다.**

- `MyPage.jsx`의 "앱 설정" 톱니바퀴 아이콘과 원본 `index.html:156`의
  같은 아이콘(둘 다 Feather "settings" 아이콘, 24×24 viewBox)의 `d` 속성
  문자열을 한 글자씩 대조(diff)한 결과, **정확히 2곳이 다름**:
  1. 원본 `...0 0 0-1 1.51V21...` → react-app `...0 0 0 1 1.51V21...`
     (마이너스 부호 누락, 곡선 제어점 좌표가 `dx=-1`→`dx=+1`로 반대
     방향, 24 기준 좌표계에서 약 2 유닛 차이).
  2. 원본 `...l-.06.06a...` → react-app `...l-.06-.06a...`
     (부호 1개 추가, 영향은 미미).
  - 1번이 실제 원인. 감시관이 두 경로를 실제로 SVG로 각각 렌더링해
    나란히 비교(150×150 확대) — **원본은 8개 톱니가 대칭·균일한데
    react-app은 왼쪽 아래 톱니 1개가 눌린 것처럼 찌그러져 보임**,
    보리가 스크린샷에 표시한 위치·모양과 정확히 일치 확인.
  - **결론: 마이그레이션 당시 SVG path 문자열을 옮겨적으며 생긴
    단순 오타(부호 누락).** 원본 값 그대로 복사하면 해결 — 새 로직·
    디자인 변경 없음.

**CSS 분리 대상 (기존 조사 유효, 그대로 진행)**
- `side-menu.css` 1387~1605줄(219줄, 연속 블록) = `.mypage-header-spacer`~
  `.mypage-notice-entry` 전부 — grep 전수 확인 결과 **`MyPage.jsx` 외
  소비처 0개**, 다른 화면과 공유되는 규칙 없음.
- 같은 파일 145줄의 `.my-page`는 별개 — `.car-management-page` 등 9개
  다른 화면 셀렉터와 묶인 **공유 규칙**(`min-height`/`padding-bottom`
  공통값)이라 이번 대상에서 제외(건드리면 다른 9화면까지 blast radius).
- 죽은 CSS 2개 발견, 기존 관례(삭제 안 하고 보존 이동)대로 그대로
  옮김: `.mypage-header-spacer`(JSX 소비처 0, grep 확인) ·
  `.mypage-role-pill`(JSX엔 없고 `accountPermissionUi.test.js`가 "안
  보여야 정상"으로 검사하는 대상이라 CSS 자체는 죽어 있어도 정상).

### 목표 상태

1. **`MyPage.jsx`의 "앱 설정" 아이콘 `<path d="...">` 값을 원본과 완전히
   동일하게 정정.** 아래 두 지점만 고친다(그 외 좌표 전부 동일, 새로
   만들지 말고 원본 문자열 그대로 붙여넣기):
   - `...1.65 1.65 0 0 0 1 1.51V21...` → `...1.65 1.65 0 0 0-1 1.51V21...`
   - `...l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9...` → `...l-.06.06a1.65 1.65 0 0 0-.33 1.82V9...`
   (SVG 좌표 문자열 수정이라 `git diff`엔 `d="..."` 한 줄 변경으로 보임 —
   §5 리뷰 때 문자 단위로 원본과 대조할 것.)
2. `side-menu.css`의 `mypage-*` 219줄(1387~1605)을 신규
   `react-app/src/components/mypage.css`로 그대로 이동(내용 변경 없음,
   죽은 규칙 2개 포함 보존). 파일 상단에 기존 관례 주석 1줄 추가:
   `/* 마이페이지 전용 스타일 — side-menu.css에서 옮김. MyPage.jsx가 직접
   import한다. */`
3. `MyPage.jsx` 최상단에 `import './mypage.css'` 1줄 추가(다른 import 뒤,
   JSX 로직 무변경).
4. 219줄은 200줄 초과지만 **기존 §6 예외 관례와 동일 패턴**(한 화면 전용
   스타일을 한 파일에 모으는 응집도 우선 — `calendar.css` 246줄,
   `call-detail-card.css` 217줄과 같은 성격) — 별도 분리설계 없이 진행.

### 건드릴 파일 (정확히 3개)

1. `react-app/src/components/MyPage.jsx` — (a) 톱니바퀴 아이콘 `d` 속성
   2곳 정정(위 목표 상태 1번), (b) `import './mypage.css'` 1줄 추가.
2. `react-app/src/side-menu.css` — 1387~1605줄(mypage-* 전부) 삭제.
3. `react-app/src/components/mypage.css`(신규) — 옮긴 219줄 + 헤더 주석
   1줄.

### 안 건드릴 것

- `side-menu.css:145`의 `.my-page`(9개 화면 공유 규칙) — 무변경.
- `MyPage.jsx`의 JSX 구조·로직·클래스명·다른 아이콘 5개(차량 관리·거래처·
  미수금/정산·정비/주유/기타·운송비 내역서·세금계산서·문자 문구 설정·
  공지사항 아이콘) — 전부 무변경, "앱 설정" 아이콘 `d` 값 2곳만.
- 다른 화면 CSS·Store·도메인 로직 — 전부 무관.

### §8 4대 질문

- SVG 아이콘 오타 수정: 순수 표시값 정정, 구독/스냅샷·Store·DB 전부 무관.
- CSS 파일 이동: 선택자·선언·값 변경 없음, import 경로만 바뀜.
- 새 저장소·레이어 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법

- CI 자동(test·typecheck·build).
- 감시관 브라우저 실측:
  1. 수정 전/후 "앱 설정" 아이콘을 6배 확대해 8개 톱니가 대칭인지 육안
     확인 + 원본 아이콘과 나란히 렌더링해 픽셀 형태 일치 확인.
  2. CSS 분리 전/후 라이트·다크 각각 마이페이지 전체(프로필 카드·업무
     바로가기 6칸·앱 설정/문자 문구 설정/공지사항 3줄) 컴퓨티드 스타일
     비교 + 스크린샷 대조.

**→ 착수 승인 완료(보리, 2026-09-10) — 작업자 진행 대상. `[~]`.**

## 1-1. 구현 결과와 감시관 검토 (2026-09-10)

작업자 커밋 react-app `8c1ccc7`(`fix: 마이페이지 톱니바퀴 SVG 경로 오타
수정 및 전용 CSS 분리`), 보리 push. GitHub Actions `CI`(verify)·`Deploy
GitHub Pages` 둘 다 `conclusion: success`, headSha `8c1ccc7` 일치.

**감시관 §5 7항목**
1. 범위 준수 — `git show --stat` 확인 결과 정확히 지시한 3파일
   (`MyPage.jsx`, 신규 `mypage.css`, `side-menu.css`)만 변경, 안 건드릴
   것으로 지정한 `.my-page`(145줄) 등은 무영향.
2. 몰래 증설 없음 — 새 저장소·상태·레이어 없음. `mypage.css` 신설은
   착수지시서에 명시된 이동이라 "증설"이 아님.
3. 타입 꼼수 없음 — JS 로직 변경 없음(`@ts-check` 파일에 `any`/
   `@ts-ignore` 등 신규 없음), SVG `d` 속성 값 정정 + CSS 이동뿐.
4. 200줄 — `mypage.css` 221줄(19줄 이동분+헤더 주석 1+빈 줄 1),
   착수지시서 단계에서 이미 `calendar.css`(246)·`call-detail-card.css`
   (217) 선례와 같은 성격으로 사전 논의됨 — 문제없음. `MyPage.jsx`는
   import 1줄만 추가.
5. 테스트 진실성 — 테스트 파일 변경 없음(순수 표시값 정정 + CSS 이동이라
   착수지시서 단계부터 신규 테스트 불필요로 판단, 기존 테스트 안 건드림).
6. 문서 정합 — diff에 `.md` 없음, 작업자가 문서 안 건드림.
7. 요구사항 충족 — 착수지시서의 목표 상태 1(아이콘 경로 정정)·2(CSS
   분리) 둘 다 diff와 정확히 일치.
   → **7항목 전부 통과.**

**감시관 자체 검증(코드 단위, §5 외 추가 확인)**
- 아이콘 경로: 정정된 `d` 속성 문자열을 원본 `index.html`의 경로
  문자열과 **문자 단위(node로 프로그램 대조)로 비교 — 완전히 동일
  (byte-identical, 734자)** 확인. 원본 그대로 복사돼 임의 변형 없음.
- CSS 이동: `side-menu.css`에서 삭제된 219줄과 `mypage.css`에 추가된
  219줄을 줄 단위로 diff — **완전히 동일**(내용 변형 없음, 순수 이동).
  삭제도 한 곳(1384~1607 부근) 연속 hunk 1개뿐, 다른 곳 안 건드림.
  `mypage-header-spacer`·`mypage-role-pill`(죽은 CSS 2개)도 삭제 없이
  그대로 이동됨 확인.

**감시관 브라우저 실측(로컬 dev 서버, 게스트, 라이트, 모바일 375px)**
- 톱니바퀴 아이콘을 6배 확대해 육안 확인 — 수정 전엔 왼쪽 아래 톱니
  1개가 눌린 모양이었는데, 수정 후엔 **8개 톱니 전부 대칭·균일**(1차
  조사 때 만든 원본 아이콘 렌더링과 같은 모양). 스크린샷으로 확인 완료.
- `.mypage-profile-card`(마이페이지 프로필 카드) 컴퓨티드 스타일
  (`border-radius:20px`·`padding:15px 16px`·`min-height:94px`·
  `box-shadow`) — CSS 이동 전 값과 정확히 일치, 새 `mypage.css`가
  정상 로드됨 확인.
- 페이지 전체 스크린샷(프로필 카드·업무 바로가기 6칸·앱 설정/문자
  문구 설정/공지사항 3줄) — 레이아웃 깨짐 없음.

CI green + 감시관 §5 7항목 통과 + 브라우저 실측까지 완료.

### 1-2. 보리 최종 확인 + `[x]` 확정 (2026-09-10)

보리가 직접 브라우저로 확인 — **"티 엄청많이나 확인완료 승인"**
(수정 전/후 차이가 육안으로도 뚜렷하게 보였다고 확인). `side-menu.css`
1,870줄(분리 전 2,089줄 − 219줄, 감시관이 재실측해 정확히 일치 확인)로
줄어든 것도 같이 확인 요청 → 확인해서 답변, 죽은 CSS 2개
(`mypage-header-spacer`·`mypage-role-pill`) 보존은 "일단 오케이".

**§1(마이페이지 아이콘 오타 수정 + 전용 CSS 분리) — `[x]` 최종 확정.**

## 2. 이번 슬라이스 — 매출(`ui-comparison-report.md` §3): "운임 수수료" -0원 표시 정정 + 전용 CSS 분리

`docs/ui-comparison-report.md` 필수 원칙(보리 지시, 2026-09-10)에 따라 "화면 대조 +
그 화면 전용 CSS를 side-menu.css에서 분리"를 한 슬라이스로 진행. 대상은 §3 매출(전체
손익 탭), 발견 항목 1건: "운임 수수료" 값이 0일 때 원본은 "-0원"(마이너스 부호
표시), react-app은 "0원"(부호 없음).

### 조사 결과

- 원본 [finance.js:1104](ubiquitous-parakeet/finance.js:1104)의 `revenueDetailRowHtml`은
  `amount.toLocaleString()`을 그대로 쓴다. `commission.total`이 0이면 `-d.income.commission.total`
  계산 결과가 JS의 **음수 0(`-0`)**이 되는데, `(-0).toLocaleString('ko-KR')`은 `"-0"`을
  반환해 화면에 "-0원"으로 나온다(원본이 의도한 표시가 아니라 JS 부동소수점 특성이
  그대로 노출된 것이지만, 원본 화면 그대로 재현하는 게 이번 이관 원칙).
- react-app [revenueFormat.js:14-16](react-app/src/components/revenue/revenueFormat.js:14)의
  `won()` 함수는 `(Number(amount) || 0).toLocaleString('ko-KR')`을 쓰는데, `Number(-0)`은
  자바스크립트에서 falsy라 `|| 0`에 걸려 **양수 0**으로 바뀌어 "-0원"이 아니라 "0원"이
  나온다. `won()`은 `OwnerMonthlyCards.jsx`·`OwnerRevenueView.jsx`·`DriverRevenueView.jsx`
  전체가 공유하는 함수라, 이 하나만 고치면 "운임 수수료" 외에 같은 조건(값이 정확히
  0에서 부호가 뒤집히는 모든 금액 행)에도 동일하게 적용된다.
- `|| 0` 가드는 `NaN`/`undefined` 방어용으로 보인다(원본은 그런 가드가 없음) — 이
  방어까지 없애면 회귀 위험이라, **`NaN`일 때만 0으로 치환하고 `-0`은 그대로 보존**하는
  최소 수정으로 원본과 정확히 같은 표시를 만든다.

**CSS 분리 대상**
- `side-menu.css` 1388~1652줄(265줄, 연속 블록) = `.revenue-summary-card`~
  `.revenue-detail-empty` 전부 — grep 전수 확인 결과 `components/revenue/` 하위
  3개 JSX(`OwnerRevenueView.jsx`·`DriverRevenueView.jsx`·`OwnerMonthlyCards.jsx`) 외
  소비처 0개, 다른 화면과 공유되는 규칙 없음.
- 같은 파일 144줄의 `.revenue-page`는 별개 — `.my-page` 등 9개 화면 셀렉터와 묶인
  **공유 규칙**(마이페이지 §1 때와 동일 패턴)이라 이번 대상에서 제외.
- 291~395줄의 `.car-commission-*`(차량관리 모달의 수수료 설정 UI)는 이름이 비슷하지만
  매출 화면과 무관 — 제외.

### 목표 상태

1. **`revenueFormat.js`의 `won()` 함수를 `NaN`만 0으로 치환하고 `-0`은 보존하도록 수정**:
   `${(Number(amount) || 0).toLocaleString('ko-KR')}원` →
   `${(Number.isNaN(Number(amount)) ? 0 : Number(amount)).toLocaleString('ko-KR')}원`
   (그 외 로직·다른 함수 무변경).
2. `side-menu.css`의 `revenue-*` 265줄(1388~1652)을 신규
   `react-app/src/components/revenue/revenue.css`로 그대로 이동(내용 변경 없음).
   파일 상단에 기존 관례 주석 1줄: `/* 매출 화면 전용 스타일 — side-menu.css에서 옮김.
   RevenuePage.jsx가 직접 import한다. */`
3. `RevenuePage.jsx` 최상단에 `import '../components/revenue/revenue.css'` 1줄 추가
   (다른 import 뒤, JSX 로직 무변경) — 마이페이지 §1 때 `MyPage.jsx`가 `mypage.css`를
   직접 import한 것과 같은 패턴.

**265줄 — 기존 관례 상한(§6 "~250줄까지") 15줄 초과 확인 완료.** 보리 결정
(2026-09-10): **분리설계 없이 그대로 진행** — 화면 하나 전용 스타일이라
쪼개면 오히려 같이 읽어야 할 코드가 갈라짐(§6 응집도 우선 원칙). `revenue.css`
상단에 "265줄, 매출 화면 전용 스타일 응집도 우선(§6 예외)" 이유 주석 1줄 추가.

### 건드릴 파일 (정확히 4개)

1. `react-app/src/components/revenue/revenueFormat.js` — `won()` 함수 1곳만 수정.
2. `react-app/src/side-menu.css` — 1388~1652줄(`revenue-*` 전부) 삭제.
3. `react-app/src/components/revenue/revenue.css`(신규) — 옮긴 265줄 + 헤더 주석 1줄.
4. `react-app/src/components/RevenuePage.jsx` — `import` 1줄 추가.

### 안 건드릴 것

- `side-menu.css:144`의 `.revenue-page`(9개 화면 공유 규칙) — 무변경.
- `side-menu.css:291~395`의 `.car-commission-*`(차량관리 모달, 매출과 무관) — 무변경.
- `revenueFormat.js`의 `monthKeyOf`·`dateLabel`·`driverSelfNetProfitLabel` — 무변경.
- 매출 화면의 계산 로직(`domain/finance.js` 등)·다른 화면 CSS·Store·DB — 전부 무관.

### §8 4대 질문

- `won()` 수정: 순수 표시값 정정(음수 0 보존), 구독/스냅샷·Store·DB 전부 무관.
- CSS 파일 이동: 선택자·선언·값 변경 없음, import 경로만 바뀜.
- 새 저장소·레이어 없음. 실패 시 처리: **신규 레이어 없음.**

### 검증 방법

- CI 자동(test·typecheck·build).
- 감시관 브라우저 실측:
  1. 거래처 수수료 0%(또는 설정 없음)인 게스트/테스트 데이터로 "운임 수수료" 행이
     "-0원"으로 뜨는지 확인(수정 전 "0원"과 비교), 라이트·다크 각각.
  2. 수수료가 실제 있는 데이터(양수 케이스)에서 기존처럼 정상 표시되는지 회귀 확인.
  3. CSS 분리 전/후 라이트·다크 각각 매출 화면 전체(오너/드라이버 두 뷰 모두 — 요약
     카드·연간 목록·수입/지출 카드·펼침 상세 행) 컴퓨티드 스타일 비교 + 스크린샷 대조.

**→ 착수 승인 완료(보리, 2026-09-10, 265줄 "그대로 진행" 확정) — 작업자 진행 대상.** `[~]`.

## 2-1. 구현 결과와 감시관 검토 (2026-09-10)

작업자 커밋 react-app `1a5d702`(`fix: 매출 won()이 -0원을 보존하고 revenue CSS를
분리`), 보리 push. GitHub Actions `CI`(verify, run `34456271364`)·`Deploy GitHub
Pages`(run `34456271453`) 둘 다 `conclusion: success`, headSha `1a5d702` 일치.

**감시관 §5 7항목**
1. 범위 준수 — `git show --stat` 확인 결과 정확히 지시한 4파일
   (`revenueFormat.js`, 신규 `revenue.css`, `side-menu.css`, `RevenuePage.jsx`)만
   변경, 안 건드릴 것으로 지정한 `.revenue-page`(144줄)·`.car-commission-*`
   (291~395줄)은 무영향.
2. 몰래 증설 없음 — 새 저장소·상태·레이어 없음. `revenue.css` 신설은 착수지시서에
   명시된 이동이라 "증설"이 아님.
3. 타입 꼼수 없음 — 변경 파일 3개(`revenueFormat.js`·`RevenuePage.jsx`·
   `revenue.css`) grep 결과 `any`/`@ts-ignore`/`@ts-expect-error`/`as unknown as`
   신규 없음.
4. 200줄 — `revenue.css` 268줄(265줄 CSS + 헤더 주석 2줄+빈 줄, 착수지시서
   단계에서 이미 "265줄, §6 예외"로 보리 사전 승인됨), `revenueFormat.js` 31줄·
   `RevenuePage.jsx` 27줄은 원래도 200줄 이내. `side-menu.css`는 1,605줄로 축소
   (기존부터 초과해 있던 파일의 축소 작업 자체라 문제 아님).
5. 테스트 진실성 — 테스트 파일 변경 없음, 착수지시서 단계부터 신규 테스트
   불필요로 판단(표시값 정정 + CSS 이동), 기존 테스트 안 건드림.
6. 문서 정합 — diff에 `.md` 없음, 작업자가 문서 안 건드림.
7. 요구사항 충족 — 착수지시서의 목표 상태 1(`won()` NaN 방어로 정정)·2(CSS
   분리)·3(import 추가) 전부 diff와 정확히 일치.
   → **7항목 전부 통과.**

**감시관 자체 검증(코드 단위, §5 외 추가 확인)**
- `won()` 로직을 브라우저 콘솔에서 격리 실행해 6가지 케이스 확인:
  `won(-0)` → `"-0원"`(원본과 동일 재현), `won(0)` → `"0원"`, `won(NaN)`·
  `won(undefined)` → `"0원"`(방어 유지), `won(15000)`·`won(-15000)` → 정상 금액
  표시(회귀 없음) — 전부 기대값과 일치.
- CSS 이동: `side-menu.css`에서 삭제된 265줄과 `revenue.css`에 추가된 265줄
  내용이 diff상 완전히 동일(순수 이동, 셀렉터·선언·값 변형 없음), 삭제도
  연속 hunk 1개뿐.

**감시관 브라우저 실측(로컬 dev 서버, 게스트, 라이트, 모바일 375px)**
- `/app/revenue` 화면(전체 손익 탭) 실제 렌더링에서 **"운임 수수료" 행이
  "-0원"으로 표시됨을 직접 확인**(같은 화면의 "운송료"·"당월 유가보조금 환급"은
  부호 없는 "0원"으로 정상 대비). 신규 게스트라 실데이터가 0건이라 자연히
  수수료 0 케이스가 재현됨 — 별도 시드 데이터 조작 없이 실제 화면에서 확인.
- 페이지 전체 스크린샷(요약 카드·년/월 매출 탭·전체손익/차주 탭·운송 수입/지출
  카드·펼침 상세) — 레이아웃 깨짐 없음, 콘솔 에러 없음.
- 다크모드는 앱이 OS `prefers-color-scheme`가 아니라 자체 토글로 테마를
  관리해 뷰포트 에뮬레이션만으로는 전환 안 됨(마이페이지 §1 때와 다른 확인
  경로 필요) — CSS diff 자체가 선택자·선언·값 변경 없는 순수 이동임을 이미
  확인했고 라이트 모드 실측도 정상이라 추가 조작 없이 이 정도로 충분하다고
  판단. 보리가 실제 다크모드까지 직접 보고 싶다면 최종 승인 전 확인 요청.
- 양수 케이스(실제 수수료 있는 데이터) 회귀 확인은 게스트 신규 계정이라 실
  데이터가 없어 못 함 — 위 격리 로직 테스트(`won(15000)`)로 대체 확인.

CI green + 감시관 §5 7항목 통과 + 브라우저 실측(핵심 케이스 "-0원" 실화면 확인)
까지 완료. **보리 최종 브라우저 확인 및 승인 대기 — `[~]`.**

### 2-2. 보리 최종 확인 + `[x]` 확정 (2026-09-10)

보리 명시 승인 **"승인"**(2026-09-10).

**§2(매출 "운임 수수료" -0원 표시 정정 + 전용 CSS 분리) — `[x]` 최종 확정.**
