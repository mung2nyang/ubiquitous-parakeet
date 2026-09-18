# STATUS — 현재 상태 한눈에

> **매 세션 이 파일부터 읽는다.** "지금 어디까지 왔나"의 정본.
> **갱신 규칙(엄수): 이 파일은 슬라이스마다 관련 절을 고쳐 쓴다 — append 금지.**
> "이전 최종 갱신 …" 을 위에 쌓지 마라. "완료" 절은 한 줄 요약만 추가하고,
> 슬라이스 상세는 `docs/report.md`(현재 슬라이스)에만 둔다. 끝난 슬라이스는
> 커밋 메시지가 기록이다(`docs/archive/` 새 파일 안 만듦, 2026-09-15부터 —
> `AGENTS.md` §0-2). 지난 내용은 `git log -p -- docs/report.md` 또는 아래
> 커밋 해시로 `git show`.
> 이 파일이 150줄을 넘으면 오래된 "완료" 항목을 요약만 남기고 줄인다.
> 최종 갱신: 2026-09-18 (§15 운송내역서 토스트 삭제(연동/미연동 기사
> 관리 화면 → 운송비 내역서 진입 연결) `[x]` push·CI 초록·보리 최종
> 승인까지 전부 완료. §15 슬라이스 E는 여전히 보류)

---

## 우선순위 원칙 (보리 지시, 2026-09-05)

**"완벽한 react 이관"이 최우선.** 원본에 있던 기능을 react-app으로
옮기는 작업을 먼저 끝낸다. 원본에 없던 새 방향·기능 강화는 아래
"이관 완료 후 진행사항"으로 모아두고 이관 전엔 착수 안 함(이관에
필요한 버그 수정·정합성 문제는 예외, 즉시 처리).

**비대칭 발견 시 앱 통일 우선 원칙**(보리 지시, 2026-09-14 라이트/다크
건에서 확인, 09-15 칩 스타일 건에도 적용) — 원본 자체에 라이트 전용
스타일이나 칩/텍스트 비대칭이 있어도, react-app에선 발견 즉시 통일
우선으로 처리.

## 지금 하는 일

§15 운송내역서 토스트 삭제(연동/미연동 기사 관리 화면 → 운송비
내역서 진입 연결) `[x]` 완료. §15 슬라이스 E(연동기사 거래처 화면에
고정노선 입력 UI 노출)는 여전히 보류 중. 경위: 차주가 보는
`LinkedDriverClientsPage.jsx`를 고쳤는데, 보리가 실제 테스트한 화면은
연동기사 본인이 로그인해서 보는 `OwnerScopedClientsView.jsx`
(같은 "강제 false·토글 숨김" 패턴 있음, 미수정)였던 것으로 확인 —
`LinkedDriverClientsPage.jsx` 쪽 수정은 working copy에 남아있으나 미커밋,
`[~]` 유지. 보리 지시로 지금은 추가로 고치지 않음. `[x]` 아님.

## 다음 할 일

§15 슬라이스 E는 `OwnerScopedClientsView.jsx` 쪽 재조사·수정이 남음 —
**추후 예정**(보리 지시, 지금 착수 안 함). §16 착수 순서는 보리 지정
대기.

> 후속 nit·보류 항목·이관 완료 후 진행사항은 `docs/roadmap.md`로 이동
> (2026-09-17 분리). 이관 완료 후 순서(사이드메뉴/모달 버그 → 빌드
> 최적화 → 새 기능 → 일상점검표 신규 기능)도 그 문서에 있다.

## 완료 (커밋·푸시됨 — 상세는 각 커밋 diff/메시지 참고, git log -- docs/report.md)

- §15 운송내역서 토스트 삭제(연동/미연동 기사 관리 화면 → 운송비
  내역서 진입 연결) `[x]` — `e269e6d`. `LinkedDriverManagementPage.jsx`의
  "운송내역서" 칩이 "준비 중입니다." 토스트만 띄우던 것을 삭제하고,
  그 기사/서브차량 건으로 스코프된 `ReportPage`(운송비 내역서)로
  이동하도록 연결(`logs/:logId/report` 라우트 신설, `ReportPage`가
  `logId`로 cars/workData를 그 차량 하나로 필터링). 기존
  `/app/report`(메인 진입)는 회귀 없이 동일 동작. 원본 앱의 "메인/
  기사차량 선택 모달"은 부활시키지 않고, 이미 특정 건으로 들어와
  있는 이 화면에서 바로 그 건으로 스코프하는 방식으로 처리(보리
  확인). `npm test` 172개·`tsc` 0에러·CI 초록·보리 브라우저 실검증·
  최종 승인 전부 완료.
- §15 슬라이스 D(고정노선 "1곳 제한"을 차주 본인·연동기사 각자 스코프로
  분리) `[x]` — `10cba09`. Step 9(2026-09-05)가 연동기사 거래처를
  차주와 레코드 공유로 바꾸면서 원래 "차주 계정 1곳"이던 고정노선
  제한이 공유 배열 전체에 적용되던 문제를 `getFixedRouteClient`/
  `resolveFixedUnitPrice`/`upsertClient`/`getMonthlyDriverTotals`/
  `flattenLinkedDriverTrips`/`DayLogPage`에 스코프 인자(하위호환 기본값)
  추가로 해결. 화면 변화 없음(계산 엔진만), 새 테스트 8개로 검증.
  `npm test` 812개(도메인 640+컴포넌트 172, 이날부터 정확한 총합으로
  기록)·`tsc` 0에러·CI 초록·보리 최종 승인 전부 완료. **슬라이스 E
  (연동기사 거래처 화면에 고정노선 입력 UI 노출) 남음** —
  `docs/ui-comparison-report.md` §15 참고.
- §15 슬라이스 C(연동·미연동 거래처 화면 수정/삭제 아이콘 오른쪽 정렬)
  `[x]` — `54f9a3b`. `.management-card-inner`/`.client-card-copy`
  클래스가 3개 화면(연동·미연동 기사관리 거래처 탭·기사 계정 거래처
  메인 화면·기사직접정산 조회 목록)에서 쓰이는데 CSS 정의가 없어 flex
  정렬이 끊기던 버그, `client-management.css` 1개 파일만 수정해 해결.
  `npm test` 172개·`tsc` 0에러·CI 초록·보리 브라우저 실검증·최종 승인
  전부 완료. `docs/ui-comparison-report.md` §15 해당 항목 `[x]` 반영.
- §15 슬라이스 B(정비/주유/기타·거래처 화면 제목이 기사 이름 대신
  차량번호로 나오던 버그) `[x]` — `2a9d249`. `domain/
  driverManagementContext.js`에 `resolveDriverOrPlateLabel` 신설
  (연동기사 이름 → 서브차량 기사 이름 → 차량번호 축약 순),
  `MaintFuelPage.jsx`·`LinkedDriverClientsPage.jsx`(미연동 거래처)
  제목에 적용해 일관성 확보. `npm test` 172개·`tsc` 0에러·CI 초록·
  보리 브라우저 실검증(연동/미연동/메인 3케이스 회귀 없음)·최종 승인
  전부 완료. `docs/ui-comparison-report.md` §15 해당 항목 `[x]` 반영.
- §15 슬라이스 A(기사정산·거래처 세금계산서 배경카드+왼쪽정렬) `[x]` —
  `94e4471`/`f7e7582`. `.tax-invoice-summary`/`.driver-list-section`
  이관 누락 CSS 복원 + `.driver-section-heading` 왼쪽정렬(부수로 §12
  DriverConnectionPage도 개선) + "N건·차량번호" 굵기 통일. §6:
  200줄 넘었던 `linked-driver.css`(343줄)를 `linked-driver.css`
  (180)/`driver-connection.css`(133)/`billing-settings.css`(60) 3개로
  분리. `npm test` 172개·`tsc` 0에러·CI·Deploy 초록·보리 브라우저
  실검증(1차 지적 반영한 재검증 포함)·최종 승인 전부 완료.
  `docs/ui-comparison-report.md` §15 해당 항목 `[x]` 반영.
- side-menu.css L블록(고객센터) 분리 `[x]` — `37772c3`.
  `customer-center.css`/`notice.css` 신설(공유 클래스는 두 lazy
  청크에 각각 복제, §9 전례와 동일 방식). `npm test` 172개·`tsc`
  0에러·CI·Deploy 초록·보리 브라우저 실검증·최종 승인 전부 완료.
- §14(고객센터) 전체 `[x]` — `136efd1`. 카드 라벨(FAQ/1:1 SUPPORT/
  MY INQUIRIES) 삭제·"문의 유형" 드롭다운 글자 굵기 통일.
  `docs/ui-comparison-report.md` §14 `[x]` 반영. CI·Deploy 초록·
  `npm test` 172개·`tsc` 0에러·보리 브라우저 실검증·최종 승인 완료.
- 고정노선 운송료가 기사 정산액 계산에서 누락되는 버그 `[x]` —
  `c906ca4`. `getMonthlyDriverTotals`/`flattenLinkedDriverTrips`/
  `getLinkedDriverSettlementDetail`이 고정노선(fixedCount만 저장되고
  fare 필드는 없는 실제 day record 모양)을 단가×횟수로 계산 안 해
  소속기사 정산액·차주 기사급여 지출·세금계산서 원천그룹·드릴다운이
  0으로 나오던 버그 수정. `npm test` 172개·`tsc` 0에러·CI·Deploy
  초록·보리 브라우저 실검증·최종 승인 전부 완료.
- 소속기사 매출화면 정산액 중복표시 버그 + 라벨 변경 `[x]` —
  `63ef902`. "합계"에서 `settlementTotal` 중복 제거, 상단 카드
  월급제/매출제(%) 라벨 분기. CI·Deploy 초록·보리 브라우저 실검증
  (위 고정노선 버그 수정 후 % 표시까지)·최종 승인 전부 완료.
- §13(앱 설정) 전체 `[x]` — 테마 해/달 아이콘·횟수/금액 세그먼트 통일
  (§8 결제방식 재사용)·게스트 백업 섹션(위치·문구·시각·아이콘)·
  "기사차량 운행 일지 설정" 섹션 삭제(§15로 이월)·`app-settings.css`
  신설(side-menu.css K블록 분리) `32dcaf1`. CI·Deploy 초록·`npm test`
  170개·`tsc` 0에러·§5 리뷰·보리 브라우저 실검증·최종 승인 전부 완료.
- §12(기사연동관리) 전체 `[x]` — 슬라이스 1+2(`e079822`/`b88a5f0`) + 이름/
  전화번호 소실 버그(`2f050f0`) + 소속기사 개인정보 차주이름 덮어쓰기 버그
  (`54881c3`) + 잔여 CSS(`driver-code-row`) 분리(`3201308`). CI·Deploy
  초록·npm test 전체 통과·typecheck 0에러·보리 브라우저 실검증 전부 완료.
  `docs/ui-comparison-report.md` §12 `[x]` 반영.

> `docs/archive/`의 상세 파일들은 2026-09-15 정리됨(git 이력엔 그대로
> 있음, `git log --diff-filter=D -- docs/archive` 로 찾을 수 있음).
> 커밋 해시로 `git show <해시>` 하면 각 슬라이스 diff를 볼 수 있다.

- §11(개인정보) 전체 `[x]` — MY PROFILE 카드 삭제(원본에도 있으나
  뜬금없어 다르게 처리)·섹션 간격·계정 부제 문구·"OOO 계정으로 사용
  중입니다" 삭제·회원탈퇴 밑줄 링크 전환·`PersonalInfoPage.css` 분리
  (공유 클래스 `.personal-intro`/`.personal-inline-fields`/
  `.personal-account-btn`은 다른 화면과 공유돼 `side-menu.css`에
  유지) `9d22284`. CI·Deploy 초록·`npm test` 170개 통과·보리 브라우저
  실검증(원본과 외관 일치) 완료(2026-09-17).
- §10(운송비 내역서) 전체 `[x]` — 슬라이스 A(요약 카드 콘텐츠 정합 +
  검수반려 보완 4건) `10af31b`/`bcc6419` + 슬라이스 B(상단 카드 통합·
  4버튼 균등폭·세부내역서 버튼 유지·정보표 복원) `d751d38` + PDF 버튼
  한글 단어단위 줄바꿈(`word-break:keep-all`) `c17755f`. CI·Deploy
  초록·`npm test` 170개 통과·보리 브라우저 실검증 전부 완료. 요약·
  세부내역서 두 화면 다 일관성 맞춤(정보표 중앙정렬, 중복 타이틀
  제거, 표 중앙정렬, 총 N회 운행 상시, 상단 카드 통합).
- §9 세부 재작업 3연속 슬라이스(UI 대조 5건·거래처 카드 세로 스택+
  칩 버튼 재구성·글씨/간격/구분선/버튼폭 조정) `[x]` — `e55c044`/
  `2ac7e73`/`3e22169`, CI 초록·`npm test` 163개 통과·보리 브라우저
  실검증(원본과 외관 일치) 완료. §9 전용 CSS는 전부
  `tax-invoice.css`로 분리 완료(파일 자체 200줄 초과는 §6 예외 주석
  처리, 224줄).
- `.toggle-btn` 알약 라운드 공용 버그(§9 2곳·§3 2곳·§5·§13 총 6곳,
  `settings-segmented-control .toggle-btn`에 `border-radius: 12px` 1줄
  추가로 해결) `[x]` — `eba8eb1`, CI·Deploy 초록·보리 브라우저 실검증
  완료(6곳 전부 사각 라운드 정상 확인).
- §9 슬라이스 2(카드 액션 버튼 텍스트 깨짐 버그 — `action-icon-btn`
  오용으로 세로 깨짐, 신규 `action-text-btn` 변형 클래스로 수정) `[x]` —
  `03e1e86`(`.claude/settings.json` 권한 게이트 변경 보리 지시로 동봉),
  CI·Deploy 초록·AI 코드 리뷰(선택자 명시도 요구사항 정확 구현·
  typecheck 0에러·test 163개 통과) 완료·**보리 브라우저 실검증 완료**.
- §9 슬라이스 1(UI 대조: 공급가액 라벨·카드 상태 뱃지·탭 숫자 뱃지·
  안내박스 제목·금액 박스 + `tax-invoice.css` 분리) `[x]` — `6ee827f`,
  CI·Deploy 초록·AI 코드 리뷰(§5 7항목 이상없음, typecheck 0에러·test
  163개 통과) 완료. 브라우저 실검증은 이때만 보리 지시로 생략(§2 예외).
  시각 결과 세부 재작업은 후속 슬라이스로 예정(위 "다음 할 일").
- GitHub Pages 배포 시 배너 이미지 경로 깨짐 수정 `[x]` — `4840148`
  (Cursor 작업, `src/lib/assetPath.js` 신설), CI·Deploy 초록·AI
  코드 리뷰(§5 7항목 이상없음)·보리 브라우저 실검증 완료(2026-09-16).
- §8 정비/주유/기타 전체 `[x]` — `eda52e4`/`16ff413`/`8d9e06a`/
  `bb359b4`, CI·Deploy 초록·보리 브라우저 실검증·AI 코드 리뷰
  완료(2026-09-15).
- "원" 앞 공백 제거 `[x]` — `241d4db`/`86d805e`(2026-09-15).
- side-menu.css 분리 슬라이스 G(리포트) `[x]` — `cf54899`(2026-09-15).
- 미수금/정산 관리 UI 복원 `[x]` — `12a9dbb`(2026-09-15).
- §6 거래처 CSS 분리·수수료/파렛트 배지 `[x]` — `9bb204f`/`1a3d6aa`~
  `2065755`(2026-09-15).
- 전역 드롭다운 슬라이스 1·2 `[x]` — `9df06e2`/`88ba0fb`+`4e3aeea`
  (2026-09-15).
- §4(일일운행) A~D·E-1·F-1~F-3·디자인 토큰 `[x]` — `e65b2c0`~
  `ef82306`(2026-09-14). 남은 토글 닫기 1건은 `InlineSheet` 리팩토링
  뒤로 이월(위 "이관 완료 후 진행사항").
- §5(차량 관리) 전체·§2-1-A/B/C `[x]` — `f4de520`~`028af8e`,
  `8641be3`~`a0f6d6a`(2026-09-14, CSS 블라스트반경 문제 발견 →
  `AGENTS.md` §5 항목6 신설 계기).
- 아코디언 슬라이드·연동 기사/거래처 스코프·B그룹(산재보험료 등)
  `[x]` — `67762ff`~`0db5bde`(2026-09-11).
- Step 0~10·200줄 강제·JS→TS(JSDoc) `[x]`(잔여는 위 "보류") · 미연동
  서브차량 분리 4단계 `[x]` · `PageHeader` 통일·`side-menu.css`
  다이어트·`main-calendar.css` 분리 `[x]`.
- `ui-comparison-report.md` §1~§7 전부 `[x]`.

## 알려진 이슈 (안 고쳐도 되지만 잊으면 안 됨)

### 이관 완료 시 처리할 숙제 (§1~§14 UI 대조·이관 전부 끝난 뒤 한꺼번에)

- **`side-menu.css`의 `.action-text-btn` 죽은 CSS**(§9에서 만들었지만
  §12가 결국 안 쓰고 `driver-card-action-btn`을 새로 만들어 씀, 2026-09-17
  확인) — `side-menu.css:224-231`, JSX 소비처 0곳(`docs/ui-comparison-report.md`
  §12 섹션 참고). 이관 완료 후 처리.
- **`side-menu.css` 죽은 CSS 2개**(§2-1-C 조사 중 발견, 2026-09-14) —
  `car-commission-heading`+`strong`+`span`(336~353행)·
  `car-daylog-preview`+`li`(461~479행), 둘 다 `*.jsx` grep 0건. 보리
  결정: 이관 완료 후 처리.
- **`mypage.css` 죽은 CSS 2개** — `.mypage-header-spacer`/
  `.mypage-role-pill`(JSX 소비처 0). 2026-09-10 §2 CSS 분리 때 "삭제
  안 하고 보존 이동" 관례로 같이 옮김.
- **`ModalShell` 공용 컴포넌트 미추출** — 바깥 클릭 닫힘+`stopPropagation`
  래퍼가 9개 파일 중 8개 복붙. "이관 중 전면 리팩터 안 함" 원칙으로 보류.
- **"재감사/FAIL 지적" 주석 다이어트** — 실제 후보는
  `pendingWorkDataWritesTypes.js`(7)·`durableStorage.js`(6) 소수뿐.
- **정비/주유/기타 Supabase 동기화가 항상 "메인" 차량으로만 저장**
  (`lib/syncExpenseRecords.js`/`lib/hydrate.js`) — 서브차량 sync 루프
  고칠 때 같이 처리(백로그).
- **게스트 백업 가져오기가 `dismissedNotifications`·
  `workDataDeletedDates` 복원 안 함**(`OwnerSnapshot` 구조적 한계).
- **비용 3종 테이블 RLS** — 정책은 라이브에 존재, 마이그레이션 파일엔
  없음(필요 시 `0005`로 스냅샷화).
- DB 마이그레이션 `0001`~`0004` 라이브 적용·검증 완료 ·
  `npm run typecheck` → 0 에러.

## 저장소 상태

- **react-app**: local·origin 동기, `e269e6d`까지(§15 운송내역서 진입
  연결, CI 초록·보리 최종 승인 완료).
- **ubiquitous-parakeet**: local이 origin보다 앞섬(이번 문서 정리
  커밋 포함). **AI는 push 안 함.** 정확한 HEAD는 매 세션 시작 시
  재확인(AGENTS §0-6).

## 승인의 기준 (사용자가 `[x]` 확정 전에 확인할 것)

1. **GitHub Actions "CI / verify" 초록** — 초록 아니면 `[x]` 불가.(사용자가 푸시후 확인)
2. **브라우저 실검증 완료** — 사용자만 가능.
3. **§5 리뷰 통과** — 범위·타입꼼수·몰래증설·200줄·테스트진실성·문서정합·요구사항충족.
> ※ 1·2·3은 "승인에 필요한 증거". 최종 승인(=`[x]`)은 사용자의 결정 행위. 절차 정본은 AGENTS §3·§5.
