# docs/report.md — UI 비교 수정 슬라이스: 홈(캘린더) 화면

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> 이관 계획 ①~③은 전부 `[x]` 확정됨(상세는 `STATUS.md` "완료" 절).
> ④(매출 탭 수치 불일치 조사)는 보리 지시(2026-09-08)로 "원본 vs react-app
> UI 전체 비교" 작업이 새로 우선순위에 올라오면서 뒤로 밀림 — 조사 자체는
> 진행 안 됨, 필요해지면 이 파일에 다시 착수지시서 작성.

## 배경

`docs/ui-comparison-report.md` §1(홈 캘린더)에 보리가 직접 화면을 짚고
감시관이 코드로 원인까지 확인해 확정한 6개 항목 중, 실제 수정이 필요한
5개를 이번 슬라이스로 고친다. (3번 "벨/햄버거 아이콘 배경"은 문제 아님으로
확인돼 제외.)

## 이번 슬라이스에서 고칠 것 (5건)

| # | 문제 | 원인 | 고칠 파일 |
|---|---|---|---|
| 1 | 연/월 옆에 원본엔 없는 "▼" 화살표가 보임 | `CalendarDateSelect`의 화살표 아이콘(`span.app-dropdown-chevron`)이 항상 보이는 상태 — 원본은 이 위치에서 화살표가 안 보임(이 컴포넌트는 홈 화면에만 쓰여서 다른 화면 영향 없음) | `src/components/calendar/calendar-date-select.css` |
| 2 | 상단 헤더(로고~날짜 알약)가 원본보다 위로 붙음 | 원본은 헤더 위쪽 여백이 `margin-top: 40px`인데 react-app엔 이 여백이 아예 없음(0) | `src/main-calendar.css` |
| 4 | 날짜 칸 클릭 시 다크모드에서 흰색이 뜸 | 다크 전용 색 변수(`--hover-bg`/`--today-bg` 등)가 `account-flow.css`의 `[data-theme="dark"]`에서 정해지는데, `main-calendar.css`의 무조건 `:root { ... }`가 같은 변수를 라이트 값으로 다시 선언 — 코드 로딩 순서상 이게 나중에 적용돼 다크모드에서도 라이트 색이 이김 | `src/main-calendar.css` |
| 5 | "차량 정비비" 글자가 빨간색이어야 하는데 기본색으로 보임 | 정비비 줄(`div`)에만 색 지정이 빠져 있음(바로 아래 "차량 주유비"/"통행료·기타" 줄은 각각 파란/빨간 지정이 있음) | `src/components/calendar/CalendarMonthSummary.jsx` |
| 6 | 하단 네비 "마이페이지" 글자가 "마이페이"/"지"로 줄바꿈됨 | 전체 앱 글꼴 목록이 원본보다 짧아서(`system-ui, "Segoe UI", sans-serif`), 이 환경에서 같은 글자를 그리는 데 더 넓은 폭이 필요해져 60px 칸에서 넘침 | `src/account-flow.css` |

## 구체적으로 바꿀 내용

1. **`calendar-date-select.css`**: `.app-dropdown-chevron`에 `display: none;` 한 줄 추가(화살표 완전히 숨김, 클릭·키보드 조작 등 드롭다운 동작 자체는 그대로 — 장식용 아이콘만 안 보이게 함).
2. **`main-calendar.css`**: `.main-page .header { margin-bottom: 10px; }` → `margin-top: 40px;` 한 줄 추가(원본 값 그대로). `margin-bottom`은 이번에 보고된 문제가 아니므로 손대지 않음.
3. **`main-calendar.css`**: 파일 맨 위 `:root { ... }` 선택자를 `:root:not([data-theme="dark"]) { ... }`로 변경(이 앱은 다크모드를 `<html data-theme="dark">` 속성 하나로만 켜고 끔 — "시스템 자동" 같은 제3의 모드가 없어서 이 조건 하나로 라이트/다크가 정확히 나뉨). 블록 안 변수 값·개수는 그대로, 선택자만 바뀜.
4. **`CalendarMonthSummary.jsx`**: "차량 정비비" 줄의 `<div className="summary-row" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border-color)' }}>`에 `color: 'var(--sunday-color)'`를 같은 style 객체 안에 추가. **굵게(font-weight)는 넣지 않는다** (보리 결정, `ui-comparison-report.md` §1-5 참고).
5. **`account-flow.css`**: `body { font-family: system-ui, 'Segoe UI', sans-serif; }`를 원본과 동일한 `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`로 교체. 이 줄은 앱 전체 기본 글꼴이라 모든 화면에 적용되지만, 원본도 원래 전체 화면에 이 글꼴을 쓰고 있어서 이게 정확한 원본 일치 방향.

## 안 건드릴 것

- `docs/ui-comparison-report.md` §1-1(사이드메뉴) 4건 — 별도 슬라이스(아래 "다음" 참고).
- §2~13(마이페이지~고객센터) — 아직 보리 검토 전 초안, 이번 슬라이스 대상 아님.
- 데이터 저장·동기화 로직, Store, Supabase 관련 코드 — 이번 슬라이스는 전부 화면에 "어떻게 보이는지"만 다루는 CSS·인라인 스타일 수정이라 해당 없음.

## §4 플레이북 해당 여부

**미해당.** 건드리는 파일 5곳 모두 `src/store/**`·`supabaseClient`·`cloud*`·`hydrate*`·`outbox*`·`mutation*`·`commit*`·`localStorage`·`domain/finance*`·`domain/receivables*` 어디에도 안 걸림 — 화면 표시(CSS·인라인 스타일)만 바꾸는 슬라이스.

## 실패 시 처리

신규 저장소·복구 레이어 없음(§7 해당 없음). 전부 기존 CSS 규칙·JSX 인라인 style에 값 추가/선택자 조정뿐이라 실패할 경우 원인은 오타·선택자 실수 정도 — 롤백은 해당 줄만 되돌리면 됨.

## 기대 동작 (완료 판정 기준)

- [ ] 홈 화면 연/월 옆에 화살표가 안 보인다(라이트·다크 모두).
- [ ] 홈 화면 상단 헤더가 원본만큼 아래로 내려와 있다(로고~날짜 알약 시작 위치).
- [ ] 다크모드에서 날짜 칸을 눌렀을 때 흰색이 아니라 회색 계열로 하이라이트된다.
- [ ] "차량 정비비" 글자·금액이 빨간색으로 보인다(굵게는 아님).
- [ ] 하단 네비 "마이페이지" 글자가 두 줄로 안 깨지고 한 줄로 보인다.
- [ ] `npm test` / `npm run typecheck` / `npm run build` 통과(CI에서 자동 확인).

## 다음 슬라이스 예고

`docs/ui-comparison-report.md` §1-1(사이드메뉴) 4건 중 작은 것부터:
- "관리"/"경영" 순서 반전, 배너 이미지(라이트/다크 전용 PNG 2장) 복원,
  "{기사이름} 기사 관리" 문구 중복(이건 먼저 "이름이 비는 게 정상 데이터
  상태인지" 확인 질문 필요).
- 톱니바퀴(서브차량 전용 설정) 항목은 **범위가 훨씬 큼**(설정값 자체를
  메인/서브로 나눠 새로 저장해야 함) — 별도 세션에서 범위부터 다시 잡아야
  함, 이번 다음 슬라이스에 포함 안 함.
