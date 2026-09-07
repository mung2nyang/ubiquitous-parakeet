# STATUS — 현재 상태 한눈에

> **매 세션 이 파일부터 읽는다.** "지금 어디까지 왔나"의 정본.
> 상세 이력은 `docs/archive/audit.md`(동결, 필요할 때만 찾아봄).
> 갱신 규칙: 슬라이스 착수·완료 때마다 이 파일을 **덮어쓴다**(append 아님).
> 최종 갱신: 2026-09-07 (이관 계획 ① "공지사항" — 보리 브라우저 실검증 통과,
> **`[x]` 최종 확정**. 다음: 이관 계획 ② "문자 문구 설정 이관" 착수지시서 작성 중.)

---

## 우선순위 원칙 (보리 지시, 2026-09-05)
**"완벽한 react 이관"이 최우선.** 매출제/월급제 전환(Step 9-A~D)은 방향성이 중요해 예외적으로
이관 중간에 끼워 넣은 새 기능이었지만, 앞으로는 **원본(`ubiquitous-parakeet`)에 있던 기능을
react-app으로 옮기는 작업(Step 10·11, 이관 로드맵 본편)을 먼저 끝낸다.** 새 방향/기능 강화
아이디어(토글, 역할전환 UI 등 원본에도 없던 것)는 이관과 무관하므로 **"이관 완료 후
진행사항"**으로 따로 모아두고, 이관 완료 전까지는 착수하지 않는다. 단, 이관 완료에 필요한
버그 수정·정합성 문제는 즉시 처리(위 슬라이스들처럼).

## 지금 하는 일

**이관 계획 ②-1 "문자 문구 설정 이관(설정화면만)" — 착수지시서 작성 완료, 작업자
전달 대기 (2026-09-07).** 이관 계획 ①(공지사항)은 `[x]` 최종 확정(아래 "완료"
절 참고). 착수 전 감시관이 조사한 결과 react-app엔 이미 콜상세 화면에 "미수금
안내" 1종만 하드코딩된 문자보내기 기능(`MessageTemplateSheet.jsx`)이 있고,
원본의 리포트 카카오톡/문자 공유 기능은 아예 없음을 발견 — 스코프를 보리에게
질문 → **"설정화면만 우선(권장)"으로 확정**(2026-09-07). 이번 슬라이스는 설정
화면만 이관하고, 저장한 문구가 실제 SMS에 반영되는 배선은 다음 슬라이스로
미룬다(브라우저 검증 시 "저장은 되는데 콜상세엔 아직 안 보임"은 정상, 버그
아님 — 지시서에 명시). 건드릴 파일 6개(신규 `lib/messageTemplates.js`+
`components/MessageSettingsPage.jsx` + `side-menu.css`·`lazyPages.js`·
`AppShellRoutes.jsx`·`MyPage.jsx` 각 1~2줄), 새 Supabase 동기화·새 저장 키
없음(기존 `messageTemplateCustomBodies`·`reportShareMessagePattern` 그대로).
§4 플레이북 열람 완료(순수 로컬 localStorage, 원격/durable 경로 없어 대부분
N/A). **다음: 작업자에게 `docs/report.md` 전달 → 코드 → `npm test` → commit
(push 안 함) → 보리 push → CI → 감시관 §5 리뷰 → 보리 브라우저 검증 → `[x]`.**

원본↔React UI 전수 대조 1차 조사 전체 내용(재무 숫자 불일치 등 나머지 발견 항목)은
`docs/archive/audit.md` "원본↔React UI 전수 대조 — 1차 조사" 절로 옮김(동결, 참고용).

### 1차 조사에서 발견한 것 (요약, 상세는 `docs/archive/audit.md` "원본↔React UI 전수 대조 — 1차 조사")

- **우선 확인 필요(재무 숫자 불일치)**: 매출 화면 "전체 손익"·"기사" 탭 순이익이
  원본과 react-app에서 부호까지 반대로 나옴. 거래처 목록에 react-app에만 있는
  "연습운수", 미수금도 원본 0건 vs react-app 2건 — 셋 다 서브차량(22나2222) 관련
  데이터 처리 차이로 추정(위 audit.md 절의 §4·§6-1·§6-2).
- **원인이 좁혀진 버그**: 홈 캘린더·운송비 내역서 "월간 운송료 정산" 위젯이 원본은
  거래처별, react-app은 횟수·단가별로 다르게 집계(데이터 조회 자체는 정상 —
  위 audit.md 절의 §1·§7·§9).
- **이관 안 된 실제 기능**: 마이페이지 "문자 문구 설정"·"공지사항" — 원본엔 실제
  기능 있음, react-app은 "준비 중" 스텁이었음(공지사항은 위 "완료" 절 참고,
  `[x]` 완료됨. 문자 문구 설정은 현재 진행 중인 ②-1).
- **개별 승인 기록이 있는 건 차주 뱃지 삭제 1건뿐** — 테마 저장 위치(로컬↔클라우드)·
  서브차량 설정 배치·차량관리 라벨·기사연동관리 UI 패턴은 "이관 후 UI 정리는 나중에"
  라는 초반 방침 때문에 그대로 남아있던 것(2026-09-07 보리 정정 — 감시관이 처음엔
  "승인된 변경"으로 잘못 분류했었음, 위 audit.md 절 참고).
- **일치 확인된 화면**: 일일운행·매출(차주 탭)·정비/주유/기타·세금계산서·개인정보·
  고객센터.
- **이번엔 안 본 것**: 기사 연동 상세·Billing·미수금 상세·모든 모달·온보딩 폼 내부
  (위 audit.md 절 "다음 세션에서 이어갈 것" 참고).
- **이관 계획(보리 승인 완료, 진행 중)**: 위 "다음 할 일" 절의 최신 순서 참고.

※ **저장소 상태 (2026-09-07, 이관 계획 ① 완료 시점)**: react-app
`origin/main`=`HEAD`=`41e9fd9`(공지사항 이관), 클린. ubiquitous-parakeet 로컬
`HEAD`=`d6a3c79`(문서 갱신), **아직 미push**(감시관은 커밋만, push는 보리가).

---

**Step 11 JS→TS 전환 슬라이스 19 완료·`[x]` 확정 (2026-09-06).**
`src/lib/syncWorkData.js` — 작업자 `cc286bd`·보리 push·CI "verify" 초록(run
`34026552370`, conclusion=success, headSha 일치, test·typecheck·build 3게이트 green)·
감시관 §5 7항목 통과(diff가 §1-G와 byte 단위 일치 + 감시관이 typecheck·test·
strict-inventory 직접 재실행해 420·`syncWorkData.js(` 0줄·561/135 확인)·보리 최종 `[x]`.
- `// @ts-check` + `CarLike`/`ClientLike` 재사용 + 함수 2개 JSDoc + `record`를
  `Record<string, unknown>` 캐스팅(도메인 타입 단언 안 함 — 보리 결정, 기존 런타임 가드가
  좁힘, 신규 검증기 0) + `data.id`→`data?.id` + `upsertDailyLog` `@returns {Promise<string>}`.
- §4 필수 대상(Supabase 원격 mutation)이나 페이로드·호출 순서·에러 분기 무변경, §1-F 검증기 없음.
- strict-inventory 434→420(−14). 68→83줄.

---

**Step 11 JS→TS 전환 슬라이스 18 완료·`[x]` 확정 (2026-09-06).**
`src/domain/receivables.js` — 작업자 `f161361`·보리 push·CI "verify" 초록(run
`34022719470`, conclusion=success, headSha 일치, test·typecheck·build 3게이트 green)·
감시관 §5 7항목 통과(diff가 §1-G와 라인 단위 일치 + 감시관이 typecheck·test·
strict-inventory 직접 재실행해 434·561/135 확인)·보리 최종 `[x]`.
- `// @ts-check` + `ReceivableGroup` typedef + 함수 8개 JSDoc(`financeReceivables.js`의
  `ReceivableItemLike` 재사용). `daysUntil` `(due-today)` → `(due.getTime()-today.getTime())`
  1줄(보리 승인, `Date` 산술 강제변환이라 동작 동일).
- 순수 표시·계산 함수(저장·동기화·JSON 파싱 0) → §4 "참고" 수준, §133 무관.
- strict-inventory 465→434(−31, 27건 이 파일 + 소비처 파생 4건). 72→121줄.

---

**Step 11 JS→TS 전환 슬라이스 17 완료·`[x]` 확정 (2026-09-06).**
`src/lib/cloudStorage.js` + `src/domain/clientTypes.js` — 작업자 `87ab7fd`·보리 push·
CI "verify" 초록(run `34021045759`, conclusion=success, headSha 일치, test·typecheck·
build 3게이트 전부 green)·감시관 §5 7항목 통과(diff가 §1-G와 라인 단위 일치 + 감시관이
typecheck·test·strict-inventory 직접 재실행해 작업자 숫자 완전 일치)·보리 최종 `[x]`.
- `cloudStorage.js`: `// @ts-check` + 죽은 함수 3개 삭제(`collectPracticeSnapshot`·
  `practiceSnapshotForProfile`·`applyPracticeSnapshot` — 전 저장소 호출부 0, `store/
  owner-state.js`로 대체됨, **보리 삭제 승인**) + 남은 6개 함수 JSDoc. 126→125줄.
- `clientTypes.js`: `ClientLike`에 `taxInvoiceEnabled` 1줄 additive(착수 전 TS2339 해소).
- **§133 런타임 검증기 불필요**: `readJson` 반환을 `unknown`으로 둠(슬라이스 12·13 선례).
- 원시 helper 계층이라 단독 브라우저 검증 대상 없음 — 소비처 6파일이 CI `npm test`
  통과로 회귀 없음. strict-inventory 503→465(−38).

최근 완료: 24(taxInvoices.js+test) `3352601` · 23(outboxReconcile.js+hydrateMerge.js) `33c0420` ·
22(expenses.js) `01bcca4` — 전부 CI 초록·보리 `[x]` 2026-09-06.
슬라이스별 이력은 아래 "완료" 절.

## 다음 할 일

**이관 계획(보리 승인, 2026-09-07) — 순서대로**:
① 공지사항 이관 — **`[x]` 완료** → **②-1 문자 문구 설정(설정화면만, 착수지시서
작성 완료, 작업자 전달 대기)** → ②-2 콜상세 문자보내기 3종 복원(입금요청·
운행완료) + ②-1이 저장한 문구 실제 반영 → ②-3 리포트 카카오톡/문자 공유 기능
신규 이관(내역서 공유 문구 반영, 원본엔 있으나 react-app엔 아예 없음 — 새로
발견된 항목, ②-1 착수 전 조사에서 확인) → ③ 홈 캘린더 9/6 칩 렌더링 버그 →
④ "월간 운송료 정산" 위젯 구조 통일(원본 거래처별 vs react 횟수·단가별, 착수 전
보리 결정 필요) → ⑤ 매출 탭 수치 불일치·거래처/미수금 데이터 차이 원인 조사
(재무 숫자, 조사 슬라이스 먼저).

미룸("이관 후 UI 정리" — 이관 로드맵 다 끝난 뒤): 테마 저장 위치, 서브차량 설정
페이지 배치, 차량관리 카드 라벨, 기사연동관리 UI 패턴.

**원본↔React UI 전수 대조에서 아직 안 본 범위**(이관 계획과 별개, 필요해지면
이어감): 기사 연동 상세·Billing·미수금 상세·모든 모달·온보딩 폼 내부 —
`docs/archive/audit.md` "원본↔React UI 전수 대조" 절 "미실시 목록" 참고.

보류 중(보리 결정 대기, 급하지 않음):
1. **`.test.js` 나머지 strict 진단 정책** — migration 원칙 "증가 금지"는 지켰으나 "전부 수정"은
   안 함. 별도로 다룰지 / 그대로 둘지 보리 결정.
2. **`.ts`/`.tsx` 확장자 실전환** — JSDoc 타입 → 실제 TS. 보리가 "이 작업 끝난 뒤 별도 단계"로
   미뤄둔 것(2026-09-05).

### 후속 nit (급하지 않음)
- **리포트 화면 자체가 메인 차량 전용**[확인: 2026-09-07, 세부 내역서 조사 중
  발견] — `AppShellRoutes.jsx`의 `report` 라우트가 `logId` 없이 고정, 원본엔 있는
  서브차량(소속기사) 리포트·기사 수수료 줄이 react-app엔 아예 없음. 원본에 있던
  기능이라 이관 우선순위 대상이지만 범위가 커서 별도 상의 필요 — 위 세부
  내역서 슬라이스와는 분리.
- **`receivables/*` 중첩 라우트 뒤로가기 `?back=` 유실**[스코프 제외로 이미 문서화,
  2026-09-07] — `ReceivablesDetailPage.jsx`가 `navigate('/app/receivables')`로
  돌아갈 때 `?back=` 쿼리를 안 들고 감. 마이페이지에서 들어가 상세까지 갔다 나오면
  그 시점부턴 홈으로 떨어짐. 드문 경로라 이번 네비게이션 슬라이스에서 안 고침.

## 이관 완료 후 진행사항 (원본에 없던 새 방향 — 이관 끝난 뒤에만 착수)
- **이중역할(기사+차주 동시)·다단계 역할전환 UI** — 원본에 없는 개념(react-app에서 처음
  나온 이슈). 2026-09-03 슬라이스 E 때 감시관이 발견: DB상 한 계정이 기사이면서 동시에
  차주(자기 하위기사를 둠)인 것 자체는 막혀 있지 않은데, `App.jsx` ownerKey 해석("기사면
  무조건 연동된 차주만 본다")이 단순 설계라 그런 계정이 로그인하면 자기 자신의 차주 데이터
  (자기 차량·자기 하위기사)가 화면에서 안 보임. 보리 결정(당시): "이번은 단순하게" — 역할전환
  UI(마이페이지 "차주로 보기/기사로 보기") 제외, 필요해지면 별도 슬라이스. 상세 audit
  "슬라이스 E 결정 — 이중역할(기사+차주 동시) 범위 확인".
- **소속기사 매출 "운송료" 표시 토글**: 전체+정산라인(현재) vs 본인 몫만 — 차주가 기사 등록
  시 선택하는 UX 개선 아이디어(원본엔 없음).
- **소속기사 매출 운송료 표시 라인 배정기간 필터 여부**(현재 미필터 — 차주 [기사] 탭과는
  일치하니 당장 불일치는 아님).
- **Billing(정산·계산서 설정, net/gross) 삭제 또는 "공제 후" 고정** — 보리가 아직 고민
  중(2026-09-05 지시로 일단 그대로 둠). 원본 기능 자체는 이미 이관됨, 이건 "구조를 더
  단순화할지"의 정책 결정이라 이관 완료 여부와 무관.
- **`driver_direct`(기사 직접 정산) 관련 코드 정리** — 매출제/월급제 도입(Step 9-A~D, 새
  방향)으로 생긴 죽은 코드 정리. `LinkedDriverDirectClientsList.jsx`·`lib/fetchDriverOwnClients.js`·
  `LinkedDriverClientsPage.jsx`의 `isDriverDirect` 분기. 순수 코드 정리, 급하지 않음.
- **다중 배정 차량(집계 TODO)** — 소속기사 차량 2대+ 배정 시 첫 차량만 집계
  (`remapEmployedDriverWorkLogs`/`fetchExpensesForAssignedVehicle`/`fetchOwnerDriverExpenses`
  TODO). 2026-09-05부터 신규 배정 자체는 `upsertDriver`가 막아서(완료 목록 참고) 새로 이
  상태가 생기진 않음 — 기존 데이터에도 없음(보리 확인) — 사실상 닫힌 문제, 참고용으로만 유지.

## 완료 (커밋·푸시됨)
- **이관 계획 ① — 공지사항 이관**: 마이페이지 "공지사항"(`onOpen('soon', ...)`
  스텁)을 실제 화면으로 이관 — 원본 공지 3건(제목·날짜·본문)을 그대로 옮긴 신규
  `NoticePage.jsx`(65줄, 기존 `CustomerCenterPage.jsx`의 `.support-card`/
  `.faq-item` 아코디언 패턴 재사용, 새 CSS 0개). — react-app `41e9fd9`(4 files:
  신규 `NoticePage.jsx` + `lazyPages.js`·`AppShellRoutes.jsx`·`MyPage.jsx` 각
  1~2줄). (CI "verify" 초록 run `34103326120` conclusion=success·headSha 일치·
  3게이트 green·감시관 §5 7항목 통과(diff가 지시서와 정확히 일치, 원본
  `index.html:713-723`과 직접 대조해 텍스트 100% 일치 확인, 감시관이 typecheck·
  test(593+138)·build 직접 재실행) + **작업자가 처음 보고했을 때 실제로는 커밋
  전이었던 것을 감시관이 `git status`로 발견해 절차 정정 지시한 사례 기록**(작업자
  "CI 통과"는 로컬 3게이트 실행이었을 뿐, 실제 push·GitHub Actions는 그 뒤 별도로
  진행됨)·보리 브라우저 실검증 통과 + `[x]` 2026-09-07). 상세 `docs/archive/audit.md`
  로 이관 예정(당장은 git 이력 `9a92703`·`d6a3c79` 참고).
- **관리 화면 공통 네비게이션 정합성**: A) 뒤로가기 — 마이페이지에서 들어간 화면
  (차량·거래처·정비·미수금·내역서·세금계산서·개인정보·앱설정 8곳 + 기사연동관리
  1곳)에서 뒤로가기 시 무조건 메인으로 가던 버그를 왔던 곳(마이페이지/메인)으로
  복귀하도록 수정 — `goToPage`가 `?back=` 쿼리 추가(`ComingSoonRoute.jsx` 기존
  패턴 재사용), `AppShellRoutes.jsx`가 이를 읽어 `backTarget` 계산. B) 신규 차량
  등록 후 "오늘 일지"로 자동 이동하던 것(원본엔 없는 동작)을 삭제, 원본처럼 차량
  관리 목록에 그대로 머물도록 변경(번호 변경 시 `fromLog` 복귀 로직은 그대로 유지).
  — react-app `eb734e7`(4 files: `AppShell.jsx`·`AppShellRoutes.jsx`·
  `CarListPage.jsx`·`App.clientsCars.test.js`, 테스트 1개 동작 재작성). (CI "verify"
  초록 run `34086676997` conclusion=success·headSha 일치·3게이트 green·감시관 §5
  7항목 통과(`npm run typecheck` 0건·`npm test` 593+138 직접 재실행 확인, diff
  라인 단위로 지시서 8+1개 라우트 전부 대조)·보리 브라우저 실검증 통과 + `[x]`
  2026-09-07). 상세 `docs/report.md` §6.
- **세금계산서 화면 "엑셀 저장" 버튼 이관**: 원본 `exportTaxInvoiceCsv`
  (`finance.js:494-709`) 포팅 — 카드마다 "엑셀 저장" 버튼, 워크북 2시트(공식
  전자세금계산서 양식 + 홈택스 업로드용 "입력자료"), 파일명 규칙. 기존
  `getTaxInvoiceSupplierBiz`·`invoiceCanIssue`(둘 다 다른 화면용, 재사용) 그대로
  써서 새 검증기·사업자 판별 로직 안 만듦. 신규 npm 의존성 `exceljs`(동적
  import, `html2pdf.js`와 같은 패턴). 워크북 빌더를 순수 함수로 분리해 셀 값
  단위 테스트 가능. — react-app `023e17c`(6 files: `package.json`+exceljs, 신규
  `taxInvoiceExcelBuilder.js`(+test)·`taxInvoiceExcel.js`, `TaxInvoicePage.jsx`,
  `TaxInvoiceEntryList.jsx`). (CI "verify" 초록 run `34084548569`
  conclusion=success·headSha 일치·3게이트 green·감시관 §5 통과(지시서와 정확히
  일치, `taxInvoiceExcelBuilder.js` 249줄·`TaxInvoicePage.jsx` 206줄 둘 다 §6
  예외 사유주석 확인, 신규 6테스트가 지시서 §2 시나리오 전부 커버, 타입 꼼수 0,
  `.md` 변경 0, `npm run typecheck` 0건·`npm test` 593+138 직접 재실행 확인)·
  보리 브라우저 실검증 통과 + `[x]` 2026-09-07). 상세 `docs/report.md`.
- **리포트 거래처별 세부 내역서 뷰 이관**: 원본 `viewDetailReport`(`script.js:5080-5338`)
  포팅 — 거래처 선택 모달 → 세부 표(날짜/상차지/하차지/거래처/금액) + 거래처별
  기본 운송료·수수료 차감·부가세·계 요약, PDF 다운로드도 현재 보이는 모드
  그대로 내보냄(파일명에 거래처명/전체 반영), 뒤로가기는 세부→요약→이전화면.
  기존 `getCallDetailCommissionAmount`(다른 화면용, 재사용) 그대로 사용해 새
  커미션 계산기 안 만듦. 서브차량 기사 수수료 줄·PDF 15건 초과 2단 분할은
  스코프 제외(아래 "후속 nit" 참고). — react-app `d5e4a0c`(5 files: `lib/report.js`
  +3함수, 신규 `ReportDetailView.jsx`, `ReportPage.jsx`, `report.test.js`,
  `side-menu.css`). (CI "verify" 초록 run `34083255631` conclusion=success·
  headSha 일치·3게이트 green·감시관 §5 통과(지시서와 정확히 일치, `ReportDetailView.jsx`
  220줄 §6 예외 사유주석 확인, 신규 6테스트, 타입 꼼수 0, `.md` 변경 0, `npm run
  typecheck` 0건·`npm test` 588+138 직접 재실행 확인)·보리 브라우저 실검증
  통과 + `[x]` 2026-09-07). 상세 `docs/report.md`.
- **서브 일지 지출 목록 차량 필터 (987be18 재오픈 수정)**: `DayLogPage.jsx`가
  일지 열었을 때 보여주는 정비/주유/기타 목록이 날짜만 걸렀지 차량은 안 걸러서,
  서브차량 일지에 메인(또는 다른 서브) 지출까지 섞여 보이던 버그. `calendarBadges.js`에
  `dayExpenseBadgeLabel`과 같은 매칭 규칙의 순수 함수 `expensesForVehicleDay` 추가 +
  `DayLogPage.jsx` 1줄 교체. — react-app `f45d198`(3 files, calendarBadges.js·
  DayLogPage.jsx·calendarBadges.test.js). (CI "verify" 초록 run `34081629739`
  conclusion=success·headSha 일치·3게이트 green·감시관 §5 통과(지시서와 정확히
  일치, 신규 4테스트 중 "같은 날짜 메인·서브 동시 존재해도 안 섞임" 핵심 회귀
  케이스 포함, `npm run typecheck` 0건·`npm test` 581+138 직접 재실행 확인)·
  보리 브라우저 실검증 통과 + `[x]` 2026-09-07). 이걸로 987be18 재오픈 건도
  최종 `[x]` 확정. 상세 `docs/report.md` §8.
- **메인 캘린더 지출 칩 복원**: react-app에 통째로 안 이관돼 있던 `.maint-badge`
  계산·렌더·CSS를 복원 — `/app` 메인 캘린더 날짜 셀에 그 날짜 지출 합계가 빨간
  칩으로 표시됨. — react-app `39b9677`(7 files). (CI "verify" 초록·감시관 §5
  7항목 통과(typecheck 0·565/137)·보리 브라우저 실검증 통과 + `[x]` 2026-09-07).
- **차량 등록 모달 "기사연동/운행일지" 탭 버그 수정**: 신규 서브차량 등록 시
  "운행 일지" 탭이 죽은 게이트로 막혀 있었고, 탭 선택과 무관하게 저장 시 항상
  기사 초대(pending)가 생성돼 사이드 메뉴 "일지" 항목이 사라지던 버그. 탭 상태를
  `draft.connectMode`로 승격해 저장 로직까지 전달, 신규 등록에서 "운행 일지"를
  선택하면 `saveInviteAfterVehicle` 호출을 건너뜀. — react-app `0c0ffd1`(6
  files)+`a01cb9f`(테스트 2건 복원, 상세 `docs/report.md` §6~7 정정 참고).
  (CI "verify" 초록 run `34080479095` conclusion=success·headSha 일치·3게이트
  green·감시관 §5 통과·`npm run typecheck` 0건·`npm test` 577+138 직접 재실행
  확인·보리 브라우저 실검증 통과 + `[x]` 2026-09-07). ⚠️ 이 슬라이스는 감시관이
  §1 역할(코드는 작업자만)을 벗어나 직접 구현했고 이를 정당화하는 허위 사용자
  승인 기록까지 남겼던 건 — 보리가 발견해 정정(코드는 유지, 문서만 정정, 재발
  방지 조항 추가). 상세 `docs/report.md` 상단 정정 문구·`STATUS.md` git 이력
  (`2a6825b`).
- **서브 차량 지출(정비/주유/기타) 칩 이관 — 1단계**: `ExpenseItem.vehicleNumber`
  옵션 필드 + 일지 인라인 입력 자동 태그(`useExpenseForm.js`가 `logId` 받음) +
  캘린더 칩 메인/서브 분리 합산(`dayExpenseBadgeLabel` 3번째 인자) + hydrate 3곳
  `raw.vehicleNumber` 복원(`fuelRecords.js`·`maintenanceRecords.js`·
  `miscExpenseRecords.js`). Supabase 쓰기 루프·`vehicle_id` 조회 쿼리는 무변경(2단계
  백로그, 급하지 않음 — "알려진 이슈" 참고). — react-app `987be18`(16 files).
  (CI "verify" 초록 run `34076822470` conclusion=success·headSha 일치·3게이트
  green·감시관 §5 7항목 통과(범위·증설·타입·200줄·테스트진실성·문서정합·요구사항
  전부 확인, `expenses.js` 200줄 정확히·`wc -l`로 작업자 자체보고 오류 정정)·
  감시관이 보리 실계정 로그인 상태로 직접 브라우저 조작해 4단계 실검증(메인/서브
  칩 분리·수정 후 태그 유지·재조회 후 유지, 테스트 데이터 삭제로 원상복구)·보리
  `[x]` 2026-09-07). 상세 `docs/report.md` §0~5.
  **⚠️ 이 `[x]`는 한때 무효 처리됐었음** — 브라우저 검증 당시 못 잡았던 누락
  (일지 지출 목록이 차량별로 안 걸러짐)이 나중에 드러나 재오픈됐고, 위 "서브
  일지 지출 목록 차량 필터 (987be18 재오픈 수정)" 항목(`f45d198`)으로 해소되어
  다시 `[x]` 확정됨(2026-09-07).
- **Step 0~8**: 전부 완료·승인·푸시 (Step 8: 2026-09-02)
- **Step 9-A~D**: 차량 정산방식(매출제/월급제)·정산 UI — react-app `5d1de1f`
- **Step 9 ① 슬라이스 A**: 기사 차량 일지 서버 동기화 — `ce08638`
- **Step 9 ① 슬라이스 C**: 매출탭에 기사 차량 데이터 연동(`ownerDataHooks` 훅) — 슬라이스 D와 함께 `3d7e0c8`
- **Step 9 ① 슬라이스 D**: 매출 "기사" 탭 개별 기사 드롭다운 — `3d7e0c8`
- **Step 9 ② 슬라이스 E/F**: 소속기사 로그인/연동 + 차량 등록 모달 기사연동 목업 — `192ebe6`
- **Step 9 ① 슬라이스 C-2 (개정)**: 소속기사 매출 ₩0 수정 + 차량관리 화면 소속기사 대응(배정차량 라벨·"+추가" 숨김) — react-app `06b9ca2` (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "슬라이스 C-2 (개정) 최종 [x] 확정".
- **Step 9 ① 슬라이스 C-3**: 매출제(%) 기사 정산액을 매출 손익 "기사 급여"에 반영(월급제와 합산, 펼치면 기사별 내역, 산재 차감) — react-app `eb1ad2e` (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 신규 `domain/driverRevenueShareExpense.js`. 상세 audit "슬라이스 C-3 최종 [x] 확정".
- **Step 9 ① 슬라이스 D-2**: 소속기사 매출 화면을 차주 카드 UI로 재작성(본인 정산 기준, 탭 없음, 순이익 라벨에 `(30%)`). 소속기사 일지 `main` 키 통일(입력·hydrate·매출 일치). — react-app `81ddbbe`+`f219ed5`+`a0037d7`, DB `0003_assigned_vehicle_commission.sql` (라이브 적용). 신규 `domain/driverSelfRevenue.js`, `OwnerMonthlyCards.jsx` `variant='driverSelf'`. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "슬라이스 D-2 최종 [x] 확정".
- **Step 9 ① 소속기사 지출 입력 1차**: 소속기사가 입력한 정비/주유가 서버 저장·hydrate돼 본인 매출 지출 카드에 유지(순이익엔 미반영 — Q1). — react-app `7e66d7d`. `hydrateEmployedDriver`에 비용 3종 조회 추가(`hydrate.js` 패턴 재사용). DB 불필요(RLS 이미 존재). (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "소속기사 지출 입력 — 1차 최종 [x] 확정".
- **Step 9 ① 소속기사 지출 입력 2차**: 소속기사 비용이 차주 매출 화면 [전체손익]+[기사] 탭 지출에도 반영([차주] 탭 제외). 별도 읽기전용 버킷 `driverExpenses`(메모리 전용). — react-app `0b089b0`. 신규 `domain/financeOwnerExpenseSweep.js`(sweep 분리, `financeOwnerDetail` 203→162)·`lib/hydrateOwnerDriverExpenses.js`. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "소속기사 지출 입력 — 2차 최종 [x] 확정".
- **Step 9 ① 매출제 정산액 차주↔기사 화면 일치**: 기사 "순이익"도 배정기간(link) 필터·`getMonthlyDriverTotals` 기준으로 → 차주 "기사 급여"와 동일. D-2 §6-J #1 되돌림. — react-app `401d9d3`. `driverSelfRevenue.js` 매출제 분기 ~4줄 + 두 화면 일치 검증 테스트. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "매출제 정산액 차주↔기사 화면 일치 최종 [x] 확정".
- **Step 9 ① 기사 연동 이관 슬라이스 A**: 연동 기사 관리 화면(조회 전용 — 프로필·월 정산 요약·거래처별 세금계산서) + 사이드 메뉴 연동 기사 항목 + "[번호] 일지"=미연동 sub만(§1-A) + 기사 연동 관리 "기록 조회" 진입. 칩은 토스트(Billing·거래처는 슬라이스 B). — react-app `24f49aa`+`c041f6b`. 신규 `components/drivers/` 폴더(`LinkedDriverManagementPage.jsx`·`linkedDriverLink.js`·`linked-driver.css`), `domain/drivers.js` `getAssignmentState`+`// @ts-check`. SideMenu 226줄(§6 응집도 규칙 ≤250). 쓰기 경로 0. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-04). 상세 audit "슬라이스 A ... 최종 [x] 확정".
- **Step 9 ① 기사 연동 이관 슬라이스 B**: 기사 전용 거래처 CRUD(권한별: `driver_direct`=조회/그 외=차주 CRUD) + Billing 설정(`driverInvoiceBasis` net/gross, 설정 저장 탈락 버그도 해소) + 일반 거래처 3곳 숨김 필터 — react-app `945dfdf`. 신규 `LinkedDriverClientsPage.jsx`·`LinkedDriverDirectClientsList.jsx`·`fetchDriverOwnClients.js`·`BillingSettingsPage.jsx`. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-05). 상세 audit "슬라이스 B ... 최종 [x] 확정"(작업자 `.md` 자가수정 프로세스 이탈 건도 기록됨).
- **Step 9 ① 기사 연동 이관 슬라이스 C (개정)**: 소속기사↔차주 거래처 상호 편집(등록·수정·삭제 하나의 레코드 공유) — react-app `0f6a18a`+`facdb7e`, DB `0004_owner_scoped_clients_shared_write.sql`(라이브 적용, 보리 직접 실행). 핵심: `buildClientRow`가 `user_id`에 로그인자 자신 대신 `ownerKey`(연동 차주 id) 사용 → 기존 CRUD 재사용. `hydrateEmployedDriver.js`가 이제 `clients`를 실제로 hydrate. (CI 초록·브라우저 통과·보리 `[x]` 2026-09-05). 상세 audit "슬라이스 C (개정) ... 최종 [x] 확정".
- **Step 9 ① 기사 연동 이관 — 전체 `[x]`** (2026-09-05, 슬라이스 A+B+C 완료).
- **Step 9 ② 1차 — 계정별 화면 권한 정리**: 마이페이지 "차주"/"소속 기사" 뱃지 삭제, 사이드 메뉴 정적 "기사 연동 관리" 버튼 삭제(동적 연동 기사 목록은 유지), 소속기사 차량 관리 조회전용(수정/삭제 버튼 숨김). — react-app `d037979`. 신규 `accountPermissionUi.test.js`(3케이스, 실제 DOM 렌더 검증). (CI 초록 확인·브라우저 통과·보리 `[x]` 2026-09-05). 상세 `docs/report.md` §4~5(작업자가 SideMenu 줄수 오기재한 건도 기록 — 재발 방지 지시).
- **`fetchExpensesForAssignedVehicle` 단위 테스트 보강**: 소속기사 배정차량 비용 3종 조회(정상/배정 0대) + vehicle_id 필터 실제값 검증. — react-app `fcdc953`+`90689a7`(수정 1회, 감시관 §5 리뷰에서 필터 미검증 발견 → 수정 지시 → 탐지력 직접 증명). (CI 초록·보리 `[x]` 2026-09-05). ⚠️ 이 슬라이스 검증 중 감시관이 실수로 `git push` 직접 실행(AGENTS §3 위반, 재발 방지 기록됨). 상세 `docs/report.md` §4~6.
- **한 기사, 차량 2대 이상 동시 배정 금지**: `domain/drivers.js` `upsertDriver`에 전화번호 기준 활성 배정 중복 체크 추가(148줄) + `drivers-cloud.test.js` 3케이스(172줄). — react-app `f1d25c6`. (CI 초록 run `33947661550`·보리 `[x]` 2026-09-05). 신규 저장소·DB 없음, 기존 "같은 차량은 한 기사에게만" 체크와 대칭 설계. 상세 `docs/report.md` §4~5.
- **Step 10 1차 — 게스트 백업 내보내기/가져오기 + 백업 권장 알림**: 신규 `lib/guestBackup.js`(기존 `readPersistDomain`/`readLogWorkData`/`replaceOwnerState` 재사용, 신규 저장소 없음) + `AppSettingsPage.jsx` 백업 섹션(게스트 전용) + `notifications.js` 백업 권장 알림(게스트 전용, 14일 기준) + 테스트 3개. — react-app `8d0ea50`+`d988b14`+`0987658`(감시관 §5 리뷰에서 `any` 타입 2건 발견·수정 지시 2회, 두 번째는 감시관 자체 확인 오류 정정 포함). (CI 초록 run `33950653110`·브라우저 통과·보리 `[x]` 2026-09-05). `dismissedNotifications`/`workDataDeletedDates`는 가져오기로 복원 안 됨(기존 `replaceOwnerState` 구조적 한계, 핵심 데이터엔 영향 없음 — 알려진 이슈로 기록). 상세 `docs/report.md` §4~9.
- **Step 10 2차 — 오늘일지 알림 원본 사양 맞춤**: "오늘 운행일지 미입력" 알림에 저녁 6시 이후에만 뜨는 시간 게이트 + `isOff`/`callDetails`/`fixedCount` 셋 다 없으면 여전히 미입력으로 보는 판정(원본 `hasEntry` 그대로) 추가. — react-app `5d564b1`(`notifications.js` 119줄+`notifications.test.js` 124줄, `mock.timers`로 시각 결정론적 통제). (CI 초록 run `33951700869`·감시관이 프로덕션 코드 버그 주입해 탐지력 직접 증명·브라우저 통과(저녁 6시 이후 실제 확인)·보리 `[x]` 2026-09-05). 상세 `docs/archive/audit.md` "Step 10 2차 — 오늘일지 알림 원본 사양 맞춤".
- **Step 10 3차 — 리포트 PDF 저장**: `ReportPage.jsx`에 PDF 다운로드 버튼(html2pdf.js, 버튼 클릭 시 동적 import로 별도 청크 976KB 분리), `lib/report.js`에 `buildReportFileName` 순수함수 분리, `.pdf-export-mode` 인쇄용 CSS(`side-menu.css`), 실패 시 토스트. — react-app `40c5550`(7 files, `AppShellRoutes.jsx` 1줄 배선 포함). "세부 보고서(거래처별)" 뷰는 원본에 있지만 react-app 데이터 모델에 없어 스코프 밖(백로그 등재). (CI 초록 run `33957448600`·브라우저 통과(보리 본인 터미널)·보리 `[x]` 2026-09-05). 상세 `docs/report.md` §4.
- **Step 10 4차 — 온보딩 완료 저장 배선 수정**: `App.jsx`의 `onFinish`가 `wizard` 인자를 안 받아 온보딩 4단계 답변(설정·차량)이 전부 버려지던 버그 수정. 신규 `lib/onboardingFinish.js`(`buildOnboardingSettingsPatch`+`applyOnboardingWizard`, 기존 `savePracticeSettings`/`requestVehicleSave` 재사용). 정산방식 스텝은 매출제/월급제로 대체된 옛 개념이라 이번엔 추가 안 함(보리 결정). — react-app `6ba08d6`. (CI 초록 run `33958459077`·감시관이 프로덕션 코드 버그 주입해 탐지력 직접 증명·브라우저 통과·보리 `[x]` 2026-09-05). 상세 `docs/archive/audit.md` "Step 10 4차 — 온보딩 완료 저장 배선 수정".
- **Step 10 4차 후속 — 온보딩 1단계 파렛트 토글 삭제**: 저장 안 되는 죽은 UI 삭제(원본부터 있던 오류, 보리가 4차 브라우저 검증 중 발견). — react-app `a17220a`(1 file, +1/-15). (CI 초록 run `33958986627`·보리 `[x]` 2026-09-05). 상세 `docs/archive/audit.md` "Step 10 4차 후속".
- **Step 10 5-1 — 고객센터 진입점 + FAQ 탭**: 신규 `CustomerCenterPage.jsx`(FAQ 4문항 원본 기반 각색, 1:1문의·내문의확인 placeholder만), `/app/support` 라우트, 사이드메뉴 진입 항목. — react-app `bf147c6`(6 files). (CI 초록 run `33959778962`·보리 `[x]` 2026-09-05). 상세 `docs/archive/audit.md` "Step 10 5-1".
- **Step 10 5-2 — 고객센터 1:1 문의 작성**: 로그인 세션만 Fail-Fast로 `support_inquiries` insert(로컬 캐시 없음), 게스트는 폼 미마운트+로그인 안내. — react-app `6a44600`(6 files, `assertCloudWriteReady()` 추가로 지시보다 더 안전). (CI 초록 run `33960442746`·보리 `[x]` 2026-09-05). 상세 `docs/archive/audit.md` "Step 10 5-2".
- **Step 10 5-3 — 고객센터 나의 문의·건의 확인**: `fetchMyInquiries`(로컬 캐시 없이 탭마다 직접 조회, 외부 응답 필드별 런타임 검증), 답변 대기/완료 배지. — react-app `253198d`(5 files, `CustomerCenterPage.jsx` 230줄 §6 응집 사유주석 포함). (CI 초록 run `33961129711`·보리 `[x]` 2026-09-05). **Step 10 전체 완료**. 상세 `docs/archive/audit.md` "Step 10 5-3".
- **회원탈퇴 기능**: 원본 `requestWithdrawal`/`executeAccountWithdrawal` 이식 — 2단계 `ConfirmModal` 확인 → `delete_own_account` RPC → 성공 시에만 기존 `App.jsx handleLogout`(`onGoAuth`) 재사용, 실패 시 토스트만(로컬 무변경). 신규 `lib/accountWithdrawal.js`(23줄)+테스트, `PersonalInfoPage.jsx`(197줄)+테스트. — react-app `9e381d1`. (CI 초록·감시관 §5 전 항목 통과·브라우저 통과·보리 `[x]` 2026-09-05). 상세 `docs/report.md` §3~4.
- **Step 11 슬라이스 1 — `AuthPage.jsx` 200줄 분리**: intro/login/signup 3화면을 `components/auth/`(`AuthIntroView.jsx` 29줄·`AuthLoginView.jsx` 93줄·`AuthSignupView.jsx` 105줄·`AuthBackIcon.jsx` 6줄)로 분리, `AuthPage.jsx` 284→146줄(핸들러·API 그대로 유지). — react-app `3256d5e`. (CI 초록·감시관 §5 전 항목 통과(로직·문구·CSS 라인 단위 대조, byte-identical)·브라우저 통과·보리 `[x]` 2026-09-05). 상세 `docs/report.md` §3~4.
- **Step 11 슬라이스 2 — `App.jsx` 200줄 분리**: 세션/부트/토스트 state+이펙트+`handleLogout`을 신규 훅 `app/useAppSession.js`(137줄)로 추출, `App.jsx` 239→147줄(인라인 핸들러는 유지). — react-app `6cec49a`. (CI 초록·감시관 §5 전 항목 통과(이펙트·주석·핸들러 라인 단위 대조, byte-identical)·브라우저 통과·보리 `[x]` 2026-09-05). 상세 `docs/report.md` §3~4.
- **Step 11 슬라이스 3 — 200줄 초과 3파일 §6 예외주석**: `domain/cars.js`(219)·`lib/dayLogCloudCommit.js`(209)·`domain/day-record.js`(207) — 실제 분리 대신 왜 안 쪼개는지 사유 주석 1줄씩만 추가(코드 로직 무변경, +3 insertions 0 deletions). — react-app `941d3ab`. (CI 초록·감시관 §5 전 항목 통과(diff 전체 대조로 "코드 변경 없음" 확인)·보리 `[x]` 2026-09-05, 주석만 변경이라 브라우저 검증 대상 없음). 상세 `docs/report.md` §0·§3~4.
- **Step 11 슬라이스 4 — `store/ownerDataHooks.js` 200줄 분리**: 기존 배럴 재수출 패턴을 이어 "일지 데이터" 훅 6개를 신규 `store/ownerWorkDataHooks.js`(81줄)로 분리, `ownerDataHooks.js` 204→138줄. 소비 파일 17개 전부 import 경로 무변경. — react-app `e6e41b9`. (CI 초록·감시관 §5 전 항목 통과(JSDoc·주석·로직 라인 단위 대조, byte-identical)·브라우저 통과·보리 `[x]` 2026-09-05). **이걸로 Step 11의 "200줄 강제" 부분 전체 완료**(초과 파일 9개 전부 처리: 분리 2·예외주석 3·기존예외 1·배럴분리 1 — 회원탈퇴는 별건). 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 1 — 비용 레코드 3파일**: `domain/fuelRecords.js`(128줄)·`maintenanceRecords.js`(122줄)·`miscExpenseRecords.js`(119줄)에 `// @ts-check` + JSDoc 타입 완성(`ExpenseItem` 재사용), 로직 무변경. — react-app `a7cd9ef`. (CI 초록·감시관 §5 전 항목 통과(diff 라인 단위 대조, 타입 단언은 기존 패턴과 동일해 편법 아님 확인)·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 775→713건. 상세 `docs/report.md` §3~5.
- **Step 11 JS→TS 전환 슬라이스 2 — money.js·invoices.js**: `// @ts-check` + JSDoc 타입 완성(`finance.js` 기존 타입 재사용), 승인된 최소 보정 1곳(`parseInt(String(tripCount), 10)`) 제외 로직 무변경. — react-app `0d93e32`. (CI 초록·감시관이 `npm test`·`typecheck:strict-inventory` 직접 재실행해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 713→696건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 3 — payments.js**: `// @ts-check` + JSDoc, 제네릭 `PaymentMutationResult<T>`로 입력 map 타입 보존, `ensurePaymentList` in-place 뮤테이션 유지. 지시서 밖 방어 보정 1곳(`markReceivableItemPaid`의 `|| []`, 기존 자매 함수와 동일 패턴·동작 동일 확인). — react-app `6f2d316`. (CI 초록·감시관이 diff 직접 대조해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 696→681건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 4 — UI 3컴포넌트 + AppSession.userId 확장**: `SwitchRow.jsx`·`NotificationPanel.jsx`·`AuthRoute.jsx`에 `@ts-check`+JSDoc. 작업자가 `App.jsx`↔`AuthPage.jsx` 간 기존 타입 불일치(공용 타입 `AppSession.userId`가 `string`으로만 선언돼 있었는데 `AuthPage.jsx`는 실제로 `null`도 만들어냄)를 발견해 편법 대신 멈추고 보고 → 감시관이 원인 진단 + `.userId` 사용처 22곳 전수 확인 → 보리 승인(같은 커밋 1개 조건)으로 `outboxTypes.js`의 `AppSession.userId`를 `string|null`로 확장, 4파일 1커밋. — react-app `6755808`. (CI 초록·**감시관이 `npm run typecheck` 직접 재실행해 에러 0건 기계적으로 재확인**(보리 지시)·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 681→653건. 상세 `docs/report.md` §3(중단 보고)·§3-A(승인)·§4.
- **Step 11 JS→TS 전환 슬라이스 5 — DriverFormModal·OnboardingPage**: `@ts-check`+JSDoc, `DriverDraft`/`DriverRecord`/`CarLike`/`OnboardingWizard` 전부 기존 타입 재사용. 지시서 밖 최소 보정 1곳(`wizard.carNumber`의 `|| ''`, 런타임엔 항상 문자열이라 동작 동일 확인). — react-app `f97d2e2`. (CI 초록·감시관이 `npm run typecheck`·`npm test` 직접 재실행해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 653→637건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 6 — practiceSettings.js**: `@ts-check`+JSDoc, `FinanceSettings` 재사용, scope 동적 키는 트릭 없이 자연 통과, `parseInt` 보정 2곳(케이스별 동일 결과 직접 검증). **1차 리뷰에서 200줄 초과(203줄) 발견 → 수정 지시 → §6 예외주석 1줄 추가(수정 커밋 분리, 204줄)로 해소.** — react-app `24505d0`+`46a40dc`(2커밋). (CI 초록·감시관이 최종 `npm run typecheck`·`npm test` 재실행해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 637→596건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 7 — 설정 화면 컴포넌트 패밀리**: `AppSettingsPage.jsx`(189)·`FixedRouteBlock.jsx`(50)·`RoutePresetEditor.jsx`(55)·`RunCountChips.jsx`(58) 4파일 1커밋, `@ts-check`+JSDoc, `FinanceSettings` 재사용. `!!` 보정 여러 곳(원본 값이 `normalizeSettings`로 항상 실제 boolean이라 동작 동일), `useRef` 타입 캐스팅. — react-app `8d8c59a`. (CI 초록·감시관이 `wc -l`·`npm run typecheck`·`npm test` 직접 재실행해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 596→569건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 8 — MaintFuelPage·ExpenseFormModal**: `@ts-check`+JSDoc, `ExpenseItem`/`ExpenseDraft` 재사용, `lib/expenses.js`는 지시대로 무변경(별도 슬라이스로 남김). `(item.mileage||0)`/`(item.subsidy||0)` 보정(동작 동일 확인). — react-app `5e5fd06`. (CI 초록·감시관이 `wc -l`·`npm run typecheck`·`npm test` 직접 재실행해 §5 전 항목 통과 확인·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 569→553건. 상세 `docs/report.md` §3~4.
- **Step 11 JS→TS 전환 슬라이스 9 — MyPage·ConfirmModal·RequireSession**: `@ts-check`+JSDoc props, `AppSession` 재사용. `RequireSession` `session ?? null` 최소 보정. — react-app `4aa0869`(amend, 되돌림 1회). **1차 커밋 `29bc1e8`에서 작업자가 `MyPage.onOpen`을 지시서 1-B의 `label?: string` 대신 `label: string`으로 선언하고 그 때문에 JSX 6줄(`onOpen('x')`→`onOpen('x','')`)을 바꿈 — 1-D "JSX 무변경" 위반. 감시관 §5에서 적발(동작은 동일·작업자가 공개함, but 절차상 "막히면 멈추고 보고" 미준수). 보리 (B) 결정 → 감시관이 지시서대로 경로 로컬 검증(`AppShellRoutes.jsx:78` `title` 캐스팅 `string`→`string|undefined` 1줄 승인 확장) → 작업자 amend로 JSX byte-identical 원복.** (CI 초록 run `34011251979`·감시관 §6 재실사 전 항목 통과·브라우저 스모크·보리 `[x]` 2026-09-06). strict-inventory 553→544건. 상세 `docs/archive/audit.md` "슬라이스 9".
- **Step 11 JS→TS 전환 슬라이스 10 — formatPhone·ComingSoonPage·BottomNav**: `@ts-check`+JSDoc, 순수 표시·변환 전용(플레이북 비대상). 순수 additive(+19/-0). — react-app `857319d`. (CI 초록 run `34011936455`·감시관 §5 전 항목 통과·브라우저 스모크·보리 `[x]` 2026-09-06). strict-inventory 544→539건. 상세 `docs/report.md`(슬라이스 11로 리셋됨).
- **Step 11 JS→TS 전환 슬라이스 25 — 잔여 UI 4파일 (main.jsx·ReportPage.jsx·ForgotPasswordModal.jsx·HydrationRetryBanner.jsx)**
  (프로덕션 JS→TS 종료 후 후속 ①, 감시관 추천 + 보리 승인 "다음건 추천방향으로 진행"):
  `main.jsx`는 `// @ts-check` + `#root` null 가드(가드 실패 시 명시적 throw). `HydrationRetryBanner.jsx`·
  `ForgotPasswordModal.jsx`는 `// @ts-check` + props JSDoc만(본문 무변경). `ReportPage.jsx`는
  `// @ts-check` + `opt` 객체 타입 캐스팅 — 지시서의 `import('html2pdf.js').Html2PdfOptions`
  대신 `Parameters<InstanceType<(typeof html2pdf)['Worker']>['set']>[0]` 사용(`html2pdf.js`의
  `type.d.ts`가 `Html2PdfOptions`를 `export` 없이 선언해 지시서 방식 자체가 불가능 — 감시관이
  `.d.ts` 직접 확인해 타당성 검증, 값 무변경). 4파일 전부 200줄 이하(17/164/23/67줄), §4
  플레이북 비대상(저장·동기화 없음), §7 증설 0. 테스트 파일 변경 0. — react-app `62640d8`.
  (CI "verify" 초록 run `34072997974` conclusion=success·headSha 일치·3게이트 green·감시관
  §5 7항목 통과 + 커밋 diff 대조 + typecheck·test·strict-inventory 직접 재실행(346, 대상
  4파일 각 0건·561/135 확인)·보리 브라우저 스모크 통과 + `[x]` 2026-09-07). strict-inventory
  350→346(−4). 상세 `docs/report.md` §1·§4~5.
- **Step 11 JS→TS 전환 슬라이스 24 — domain/taxInvoices.js + domain/taxInvoices.test.js**
  (**프로덕션 JS→TS 전환 종료**): `taxInvoices.js`에 `// @ts-check` + typedef 4(`InvoiceLike`·
  `CarLike` 재사용 + 로컬 `TaxInvoiceItemInput`·`TaxInvoiceRow`) + 6함수 JSDoc. 함수마다
  "실제로 읽는 필드"만 좁은 인라인 타입 → 호출부(`syncTaxInvoicesTable.js`·`hydrate.js`) 수정 0.
  **6함수 본문 로직 무변경** — `mergeTaxInvoiceRecords`만 `raw`→`Record<string,unknown>`,
  `record`→`InvoiceLike` 캐스팅 2개(컴파일 타임, §133: 기존 `typeof object`+`!raw.id` 가드
  유지, 신규 검증기 0 — 슬라이스 19·20·22 동일 방침). `taxInvoices.test.js`는 보리 결정
  ("묶어서 전환")으로 번들: `@ts-check` + typedef 2 + fixture `@type` 3 + negative assertion
  3줄 `extraColumns` loose 접근(값 검사 그대로). assertion 값·fixture 데이터 무변경.
  `domain/taxInvoices*`는 §4 명시 목록 아님(순수 계산). 54→113 / 91→101줄. — react-app
  `3352601`. (CI "verify" 초록 run `34033230641` conclusion=success·headSha 일치·3게이트
  green·감시관 §5 7항목 통과 + 커밋 diff·파일 전체 §1-G byte 대조 + typecheck·test·
  strict-inventory 직접 재실행(`33c0420` 기준 진단 diff 제거23/추가0·grep 0줄·표적 7/7)·보리
  브라우저 스모크 통과 + `[x]` 2026-09-06). strict-inventory 373→350(−23). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 23 — lib/outboxReconcile.js + lib/hydrateMerge.js**:
  `outboxReconcile.js`에 `// @ts-check` + typedef 2(`DriverRecord`·`OutboxOp` 재사용) +
  순수 reconcile 함수 4개 JSDoc. `reconcileCars`/`reconcileClients` 제네릭 `@template`
  (호출부 타입 보존 → 소비처 0), `reconcileDrivers`는 `Array<DriverRecord>`/
  `Array<Partial<DriverRecord>>`. `hydrateMerge.js`는 `mergeDriversFromRows`에 `@returns
  {Array<DriverRecord>}` 1줄 + 조회 실패 갈래 캐스팅. **동작-무변경 보정 3건**(감시관 케이스별
  증명): `isTombstoned(…, String(x||''))` falsy 재현 · `recovered` 필터 `if (!driver.id)
  return false`(원래도 걸러짐) · `hydrateMerge` 조기 return 캐스팅(Store 정규화 레코드).
  §4 필수(`lib/*outbox*`)나 `JSON.parse`/`localStorage` 직접 접근 이 파일에 없음(전부
  `mutationOutbox.js` 경유, 안 건드림) → §133 대상 없음, 신규 검증기 0, 판정 규칙 무변경.
  53→76 / 125→126줄. — react-app `33c0420`. (CI "verify" 초록 run `34032046696`
  conclusion=success·headSha 일치·3게이트 green·감시관 §5 7항목 통과 + 커밋 diff·파일
  전체 §1-G byte 대조 + typecheck·test·strict-inventory 직접 재실행(`01bcca4` 기준 진단
  diff 제거13/추가0·프로덕션 grep 0줄·표적 56/56)·보리 브라우저 스모크 통과 + `[x]`
  2026-09-06). strict-inventory 386→373(−13). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 22 — lib/expenses.js**: `// @ts-check` + 상단 주석 갱신 +
  `saveExpenses` `@param` 2개(`ownerKey:string`·`items:Array<ExpenseItem>`, 기존 `ExpenseItem`
  재사용). `dedupeExpensesById(items)` `T=ExpenseItem` 추론 → `commitExpenses` 자연 통과
  (기존 TS2345 2건 해소). **죽은 `loadExpenses` + 전용 import `readJsonKey` 삭제(보리 승인
  "죽은건 삭제해")** — 프로덕션·테스트 호출부 0(화면 읽기는 `useOwnerExpenses` store 구독),
  삭제 후 561/135 그대로 통과 = 죽은 코드 증명. §133 대상 코드(`loadExpenses`의 JSON.parse)
  삭제로 캐스팅·검증기 쟁점 소멸. §4 필수(`saveExpenses`가 Supabase mutation)나 `saveExpenses`
  본문 무변경(세션 epoch 가드·페이로드·호출 순서·에러 분기 그대로), §7 증설 0. 42→40줄.
  — react-app `01bcca4`. (CI "verify" 초록 run `34030856249` conclusion=success·headSha
  일치·3게이트 green·감시관 §5 7항목 통과 + 커밋 diff·파일 전체를 §1-G "결과 파일 전체"와
  byte 대조 + typecheck·test·strict-inventory 직접 재실행(`lib/expenses.js(` 0줄)·보리
  브라우저 스모크 통과 + `[x]` 2026-09-06). strict-inventory 391→386(−5). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 21 — lib/dirtyJournal.js**: `// @ts-check` + 비export
  헬퍼 3개(`journalKey`·`readJournal`·`writeJournal`) `@param`/`@returns`. owner별 durable
  journal(revision 카운터, localStorage `reactPracticeDirtyJournal:<ownerKey>`) — §4 필수·
  §133 대상. export 함수는 이미 JSDoc 완비, 4건은 헬퍼 파라미터뿐. **§0-C 최소 보정(보리
  승인)**: `readJournal`이 기존 최상위 객체 가드를 확장해 `Object.entries(parsed)` 각 값을
  `Number(revision)||0`으로 런타임 정규화 후 `Record<string, number>` 반환 — §133 준수
  (별도 검증기 모듈 0, 기존 함수 안 ~4줄, §7 회피). 정상 데이터 영향 0(테스트 통과 증명),
  손상 데이터엔 `planDirtyWrite` `"abc"+1` 문자열연결 버그 수정. `hasDirty`/`getDirtyDomains`/
  `planDirtyWrite`/`clearDirtyDomain` 본문 무변경(반환이 숫자맵이라 자연 통과). 96→120줄.
  — react-app `14ebe52`. (CI "verify" 초록 run `34029126603` conclusion=success·headSha
  일치·3게이트 green·감시관 §5 7항목 통과 + 감시관이 typecheck·test·strict-inventory 직접
  재실행(diff가 §1-G와 일치)·`dirtyJournal.js(` 0줄 근거 첨부(`docs/report.md` §5)·보리
  `[x]` 2026-09-06). strict-inventory 395→391(−4). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 20 — lib/syncExpenseRecords.js**: `// @ts-check` +
  `CarLike`/`ExpenseItem` 재사용(import) + 함수 5개 JSDoc. 정비/주유/기타 비용 Supabase
  delete+insert — §4 필수. `readJson` 안 쓰고 `item`은 슬라이스 1(`a7cd9ef`)에서 이미
  타입된 `groupX`/`buildX`로 흐름 → §133 검증기 불필요. 감시관 사전검증 중 마찰 1건:
  `expenses` param을 `Array<ExpenseItem>`로 달면 호출자 `lib/expenses.js`에 오염 3건 →
  **`Array<{ id?: string }>` 느슨 선언 + `expenseSyncInputs` 내부 `/** @type {Array<ExpenseItem>} */`
  캐스팅 1곳으로 격리**(감시관 판단, Store/deduped 데이터 캐스팅이라 JSON 경계 아님).
  `expenses.js`(슬라이스 21) 오염 0 확인. `const vehicleId = mainCar.supabaseId` 가드
  직후 캡처 3곳(`await` 뒤 for-loop에서 프로퍼티 좁힘이 풀려서 — 단언 아님, 동작 무변경).
  Supabase 페이로드·호출 순서·에러 분기 무변경. 115→152줄. — react-app `fc7980f`.
  (CI "verify" 초록 run `34027848750` conclusion=success·headSha 일치·3게이트 green·감시관
  §5 7항목 통과 + 감시관이 typecheck·test·strict-inventory 직접 재실행(diff가 §1-G와 byte
  일치)·`syncExpenseRecords.js(` 0줄·`lib/expenses.js(` 5줄 불변 근거 첨부(`docs/report.md`
  §5)·보리 `[x]` 2026-09-06). strict-inventory 420→395(−25). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 19 — lib/syncWorkData.js**: `// @ts-check` +
  `CarLike`/`ClientLike` 재사용(import만) + `syncWorkData`/`upsertDailyLog` JSDoc.
  운행기록 Supabase upsert(`daily_logs`+`transport_details`) — §4 필수. `readJson`(slice
  17에서 `unknown` 반환)으로 읽은 workData를 필드 접근 → §133 쟁점을 **보리 결정
  (2026-09-06 AskUserQuestion)**대로 `record`를 `DayRecordLike` 단언 없이
  `Record<string, unknown>` 캐스팅(3곳: workData·loop record·safeRecord)으로 처리 —
  기존 런타임 가드(`typeof`/`Array.isArray`/`parseEntityNumber(value:unknown)`/`!!`)가
  좁힘, **신규 검증기 0**(§7 준수). 보리 승인 최소 보정: `data.id`→`data?.id`(2곳,
  `.single()` null 이론상 가능)·`upsertDailyLog` 반환 `/** @type {string} */ (data?.id)`
  +`.single()` 계약 주석. Supabase 페이로드·호출 순서·에러 분기·`onConflict` 무변경.
  루프 바인딩 `record`→`rawRecord`(가드 뒤 캐스팅으로 `record` 재도입, 본문 무변경).
  68→83줄. — react-app `cc286bd`. (CI "verify" 초록 run `34026552370` conclusion=success·
  headSha 일치·test/typecheck/build 3게이트 green·감시관 §5 7항목 통과 + 감시관이
  typecheck·test·strict-inventory 직접 재실행(diff가 §1-G와 byte 일치)·`syncWorkData.js(`
  grep 0줄 근거 첨부(`docs/report.md` §5)·보리 `[x]` 2026-09-06). strict-inventory
  434→420(−14). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 18 — domain/receivables.js**: `// @ts-check` +
  `ReceivableGroup` typedef(그룹 반환 모양) + 함수 8개 JSDoc. `financeReceivables.js`의
  기존 `ReceivableItemLike` 재사용(신규 도메인 타입 0). 미수금 목록 그룹핑·정렬·D-day
  라벨 **순수 함수만**(저장·동기화·JSON 파싱 0) → `domain/receivables*` 경로가 §4 목록에
  형식상 걸리나 "참고" 수준, §133 런타임 검증기 무관. 지시서 밖 최소 보정 1건(보리 승인):
  `daysUntil` `(due - today)` → `(due.getTime() - today.getTime())` — `Date` 뺄셈은 JS가
  `valueOf()`로 강제변환하므로 결과 동일, `@ts-check`가 TS2362/2363으로 막아 명시 필요.
  `groupItems`는 뒤에 required 파라미터가 있어 `items` optional 불가(TS1016). 72→121줄.
  — react-app `f161361`. (CI "verify" 초록 run `34022719470` conclusion=success·headSha
  일치·test/typecheck/build 3게이트 green·감시관 §5 7항목 통과 + 감시관이
  typecheck·test·strict-inventory 직접 재실행해 숫자 완전 일치·순수 계산 함수라 브라우저
  검증 얕음(소비처 CI 테스트 통과)·보리 `[x]` 2026-09-06). strict-inventory 465→434(−31,
  27건 이 파일 + 소비처 파생 4건). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 17 — lib/cloudStorage.js + domain/clientTypes.js**:
  `// @ts-check` + `readJson`/`writeJson`/`keyFor`/`parseEntityNumber`/`rangesOverlap`/
  `buildVehicleRow` JSDoc 6블록. `readJson` 반환은 `unknown`(도메인 좁히기 없음 —
  호출부 `outboxFlush`/`outboxRollback`가 이미 `/** @type */` 단언, 슬라이스 12·13 선례).
  **죽은 함수 3개(`collectPracticeSnapshot`·`practiceSnapshotForProfile`·
  `applyPracticeSnapshot`) 통째 삭제** — 전 저장소 호출부 0, `store/owner-state.js`
  `replaceOwnerState`로 대체됨, 보리 삭제 승인(§10 대상 특정 재확인 충족). `KEYS`·함수
  본문·`buildClientRow` 기존 주석 무변경. `clientTypes.js`는 `ClientLike`에
  `taxInvoiceEnabled` 1줄 additive(착수 전부터 있던 TS2339 해소). `lib/cloud*`라 §4
  플레이북 트리거였으나 원시 I/O 함수 타입 주석 + 죽은 코드 삭제뿐, §133 검증기 없음.
  126→125줄. — react-app `87ab7fd`. (CI "verify" 초록 run `34021045759`
  conclusion=success·headSha 일치·test/typecheck/build 3게이트 green·감시관 §5 7항목
  통과 + 감시관이 typecheck·test·strict-inventory 직접 재실행해 숫자 완전 일치·원시 helper
  계층이라 단독 브라우저 검증 대상 없음(소비처 6파일 CI 테스트 통과로 회귀 없음)·보리
  `[x]` 2026-09-06). strict-inventory 503→465(−38). 상세 `docs/report.md` §4~5.
- **Step 11 JS→TS 전환 슬라이스 16 — lib/originalWindow.js**: `@ts-check` 1줄 +
  `applyOriginalFixture` `@param` 3곳(`win`은 `{ localStorage: { setItem(key,value):void } }`
  최소 구조만 — `@types/jsdom` 의존성 회피, `any`/캐스팅 0). 본문 무변경. 호출부는
  `finance.test.js`·`receivables-invoices.test.js` 2곳뿐(둘 다 `loadOriginalWindow()`
  결과를 `win`으로 전달 — DOMWindow가 구조적으로 호환). 테스트 전용 헬퍼라 §4 플레이북
  비대상, 브라우저 검증 대상 없음. — react-app `a54dd1e`. (CI 초록 run `34016176226`
  conclusion=success·headSha 일치·감시관 §5 7항목 재실사 통과(diff +6/-0, 착수지시서와
  라인 단위 일치)·CI 561/135 통과로 회귀 없음·보리 `[x]` 2026-09-06). strict-inventory
  506→503(-3). 상세 `docs/archive/audit.md` "슬라이스 16".
- **Step 11 JS→TS 전환 슬라이스 15 — store/batchWrites.js**: `@ts-check` 1줄 + `buildBatchWrites` 지역변수 `const writes`에 `@type {Array<KeyedWrite>}`(이미 선언된 `@returns`와 동일) 1줄만(+2/-0). 순수 계산 함수(실제 저장은 `writeAllOrNothing`), `src/store/**`라 §4 트리거지만 저장·동기화 로직 무변경. — react-app `83c1fbc`. (CI 초록 run `34015545300`·감시관 §5 7항목 통과(diff가 §1-G와 정확히 일치)·브라우저 스모크·보리 `[x]` 2026-09-06). strict-inventory 508→506건. 상세 `docs/archive/audit.md` "슬라이스 15".
- **Step 11 JS→TS 전환 슬라이스 14 — practiceSettings.js·profile.js**: `@ts-check`+`@param`만(각 본문 무변경). `practiceSettings.js` 3건(`applyTheme`은 `'light'|'dark'`), `profile.js` 2건(`saveProfile profile:LocalProfile`). 두 `save*`가 `upsertProfileOnSupabase` 원격+epoch 가드 → §4 트리거였으나 원격 경로·가드·`{}`/`EMPTY_PROFILE` fallback 무변경, 신규 캐스팅 0. — react-app `82ea3ac`. (CI 초록 run `34014946741`·감시관 §5 7항목 통과(diff가 §1-G와 라인 단위 일치)·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 513→508건. 상세 `docs/archive/audit.md` "슬라이스 14".
- **Step 11 JS→TS 전환 슬라이스 13 — cars.js·clients.js·drivers.js 배럴**: `@ts-check`+`@param`, `load*` fallback `unknown[]` 캐스팅(요소 단언 없음)·`save*` items는 `CarLike[]`/`ClientLike[]`/`DriverRecord[]`. `cars.js`만 `loadCars` return의 `dedupeCarsById` 인자에 `{ id?: string|number }[]` 최소 구조 캐스팅 1곳(dedupe 내부 런타임 가드 유지). 위임 로직 무변경, 원격 mutation 없어 §4 트리거 아님. — react-app `3c43481`. (CI 초록 run `34014374350`·감시관 §5 7항목 전부 통과(diff가 §1-G와 라인 단위 일치·사전검증본과 byte 동일)·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 522→513건. 상세 `docs/archive/audit.md` "슬라이스 13".
- **Step 11 JS→TS 전환 슬라이스 12 — invoices.js·report.js**: `@ts-check`+`@param`, `loadInvoices` fallback `unknown[]` 캐스팅(요소 타입 단언 없음)·`saveInvoices` items `InvoiceLike[]`·`report.js`는 `dash`(`@param {unknown}`)/`buildMonthReport`에 `@param`만. 로직·세션 epoch 가드 무변경. `saveInvoices` 원격 mutation으로 §4 플레이북 트리거였으나 타입 주석만이라 §1-F 검증기 추가 없음. — react-app `d2ac4be`. (CI 초록 run `34013535405`·감시관 §5 7항목 전부 통과(diff가 착수지시서 §1-B와 라인 단위 일치)·브라우저 통과·보리 `[x]` 2026-09-06). strict-inventory 529→522건. 상세 `docs/archive/audit.md` "슬라이스 12".
- **Step 11 JS→TS 전환 슬라이스 11 — supabaseClient.js + AuthPage catch 2줄**: `@ts-check`+`@param` 10곳(9곳 `{string}`, `error` 1곳 `{ message?: string }|null|undefined`). `error` 좁히기가 `AuthPage.jsx` `catch (error)`(strict `unknown`) 2곳을 깨서 보리 (a) 승인으로 catch 2줄(`error instanceof Error ? error : null`)만 범위 포함 — `if (error)` 분기·본문·쿼리 무변경. AGENTS §4 플레이북 트리거였으나 §1-F 검증기 없어 해당 없음. 작업자 멈춤 1회(감시관 grep 패턴이 `testSupport/fakeSupabaseClient.js` 오매칭 — 실블로커 아님, 작업자 대응은 정확). — react-app `bda5933`. (CI 초록 run `34012796950`·감시관 §5 전 항목 통과(로컬 end-to-end 사전검증도 완료)·브라우저 스모크(auth 에러 토스트)·보리 `[x]` 2026-09-06). strict-inventory 539→529건. 상세 `docs/report.md` §4~5.

## 아직 안 한 큰 것 (나중 Step)
- **Step 11 — 200줄 강제**: 전체 완료(슬라이스 1~4, 2026-09-05).
- **Step 11 — JS→TS 전환**: **프로덕션 완료(슬라이스 1~24) + 후속 ① 완료(슬라이스 25),
  strict-inventory 775→346건.** 지금은 JS + JSDoc 주석 타입(`.js` 확장자 유지, 보리 결정
  2026-09-05) — 실제 `.ts`/`.tsx` 확장자 전환은 별도 단계(미착수).
  **잔여 346건 = testSupport 1 + `.test.js` 나머지.**
  - `testSupport/fakeSupabaseClient.js`(1, TS2322) — `@ts-check` 없어 CI 게이트
    밖, strict-inventory에서만. 착수 전부터 있던 것.
  - `.test.js` 나머지: 테스트 파일은 200줄·strict 면제(migration 원칙 3·13 —
    "증가 금지"이지 "전부 수정"은 아님). 별도로 다룰지는 보리 결정.
  (프로덕션 완료: `cloudStorage.js` 38 슬17, `receivables.js` 27 슬18, `syncWorkData.js` 14 슬19,
  `syncExpenseRecords.js` 25 슬20, `dirtyJournal.js` 4 슬21, `expenses.js` 5 슬22,
  `outboxReconcile.js`+`hydrateMerge.js` 13 슬23, `taxInvoices.js`+test 23 슬24.
  `originalWindow.js` 3 슬16, `batchWrites.js` 2 슬15. 후속: UI 4파일 4 슬25.)

## 알려진 이슈 (당장 안 고쳐도 되지만 잊으면 안 됨)
- **정비/주유/기타 Supabase 동기화가 항상 "메인" 차량 `vehicle_id`로만 저장됨**
  (`lib/syncExpenseRecords.js` 51·88·125번 줄, `lib/hydrate.js` 142-144번 줄도
  동일하게 메인만 조회) — 서브 차량 지출 칩 이관 1단계(2026-09-07) 조사로 발견.
  1단계는 로컬 태깅 + `raw` jsonb 왕복만으로 화면 기능을 완성해 이 문제를 안 건드림
  (0-C, `docs/report.md`). DB에 어느 차량 row로 남는지만의 정합성 문제라 화면엔
  영향 없음 — 2단계(백로그, 안 급함)에서 sync 루프를 차량별로 고칠 때 같이 처리.
- ~~**기사 초대 동시성(TOCTOU) 레이스**: `0001_driver_links_idempotency_key.sql` 미적용~~ →
  **정정(2026-09-05)**: 낡은 기록이었음. 보리가 Supabase에서 진단 쿼리 3종(컬럼·유니크
  인덱스·함수) 직접 실행 — 전부 `true`, **이미 적용·검증된 상태**(2026-09-01 슬라이스 A 때
  적용된 것으로 보이며 문서만 안 지워져 있었음). 클라이언트(`driverLinkRpc.js`)도 이미
  연결돼 있음 — 완전히 닫힌 상태, 재작업 불필요.
  (참고: `0002_driver_invite_redeem.sql` 도 슬라이스 E 때 라이브 DB에 적용 완료 —
  `docs/archive/audit.md` "슬라이스 E §0 SQL 실행 완료".)
- **`0003` 마이그레이션**: 라이브 적용 완료(2026-09-04). 파일
  `react-app/supabase/migrations/0003_assigned_vehicle_commission.sql` 커밋됨(`f219ed5`).
- **비용 3종 테이블 RLS**: `fuel_records`/`maintenance_records`/`misc_expense_records` 모두
  연동 기사 전체 CRUD 정책 이미 존재(2026-09-04 진단 확인). 저장소 마이그레이션 파일엔
  없음(수동 or 미기록 마이그레이션) — 필요 시 `0005`로 스냅샷화 검토(급하지 않음, `0004`는
  슬라이스 C의 clients 쓰기 정책으로 이미 씀).
- ~~**MyPage 메뉴 가드 없음**(audit "문제 A")~~ → Step 9 ② 1차에서 해소(뱃지·정적 기사연동관리 버튼 삭제, 2026-09-05).
- **게스트 백업 가져오기가 `dismissedNotifications`·`workDataDeletedDates` 복원 안 함** —
  `store/owner-state.js`의 `OwnerSnapshot`/`replaceOwnerState`가 이 두 도메인을 아예
  지원 안 해서(2026-09-05 Step 10 1차 리뷰로 확인). 차량·거래처·기사·정산·일지 등 핵심
  데이터엔 영향 없음(정상 복원) — 영향은 "복원 후 예전에 닫았던 알림이 다시 뜰 수 있다"
  정도. 필요해지면 `OwnerSnapshot` 확장 검토(지금은 급하지 않음).
- `npm run typecheck` → 현재 **0 에러**(정상).

## 저장소 상태 (2026-09-07, 세션 종료 시점)
- **react-app**: `main` = origin/main = `62640d8`(JS→TS 슬라이스 25, CI "verify" 초록
  run `34072997974`·감시관 §5 통과·**보리 `[x]` 확정 2026-09-07**). 작업트리 클린.
- **ubiquitous-parakeet**: `origin/main` = `7f2c550`(슬라이스 21 `[x]` 기록). **로컬**:
  `53a8e46`(슬라이스 22~24 `[x]` 기록, origin에서 1커밋 앞섬, 미push) 위에 이번 세션의
  슬라이스 25 완료 기록(`STATUS.md`+`docs/report.md`)이 감시관 커밋 예정 — **보리가
  커밋 확인 후 push 필요.** 감시관은 push 금지(AGENTS §3).
  ※ 다음 세션: 슬라이스 26 방향(위 "다음 할 일" 3옵션) 보리 결정부터.
- 정확한 HEAD·미커밋 범위는 세션 시작 시 `git log`/`git status`로 직접 확인 (AGENTS.md §0-6).

## 승인의 기준 (사용자가 `[x]` 확정 전에 확인할 것)
1. **GitHub Actions "CI / verify" 초록** — 매 push 자동으로 `npm test` + `typecheck` + `build` 재실행. 초록 아니면 `[x]` 불가.
2. **브라우저 실검증 완료** — `npm run dev`로 해당 화면 직접 조작. 사용자만 가능.
3. **감시관 §5 리뷰 통과** — 범위·타입꼼수·몰래증설·200줄·테스트진실성·문서정합·요구사항충족.
> ※ 1·2·3은 "승인에 필요한 증거". 최종 승인(=`[x]`)은 사용자의 결정 행위. 절차 정본은 AGENTS.md §3·§5.
