# docs/report.md — 현재 슬라이스 착수지시서

## 기사 "차주 연동" 초대코드 입력 화면 → 팝업(모달)으로 변경 (로드맵 밖 보리 요청, 2026-10-02)

> 상태: **착수지시서 확정(2026-10-02, 보리) — 진행 중 `[~]`.** 로드맵 10번(배포)과 무관한 별도 작업.

### 1. 현재 상태
- 마이페이지의 "차주 연동" 버튼(`MyPage.jsx:156`, `onOpen('invite')`)을 누르면 **전체 화면**(`/app/me/invite`, `InviteRedeemPage.jsx`)으로 이동한다.
- 그 화면: 제목 "차주 연동" · 안내 카드 · 초대코드 입력칸 · [연동하기](4자 이상일 때 활성).
- 연동 성공 시: 서버 연동 → 세션 새로 만들기 → 서버 데이터 불러오기 → 토스트 → 세션 갱신 후 홈(`/app`)으로 이동.
- 이 화면으로 가는 입구는 마이페이지 버튼 하나뿐이다(`'invite'`·`me/invite` 전체 검색 확인). 이 화면을 검사하는 테스트는 없다.

### 2. 목표 상태
- "차주 연동"을 누르면 마이페이지 **위에 팝업**이 뜬다(뒤에 마이페이지가 어둡게 보임).
- 팝업 구성: 제목 "차주 연동" · 안내 문구 2줄 · 초대코드 입력칸 · [취소] [연동하기]. 안내 카드(DRIVER INVITE 그라데이션)는 쓰지 않고 제목 아래 회색 글씨로만 표시(보리 확정: A안). 문구(보리 확정): "차주에게 전달받은 초대코드를 입력해 주세요." / "연동이 완료되면 기사님이 입력한 운행·매출 내역이 차주에게 공유됩니다."
- 입력칸이 있는 팝업이므로 **바깥을 눌러도 닫히지 않음**, [취소]로만 닫힘(로드맵 8번 규칙과 동일).
- 연동 처리(서버 호출·세션 재생성·데이터 불러오기·토스트·성공 후 홈 이동)는 **지금 코드를 그대로 옮긴다. 동작 변경 없음.**
- 전체 화면 라우트 `/app/me/invite`는 삭제한다.

### 3. 건드릴 파일 (5곳 + 새 파일 1 + 삭제 1)
| 파일 | 변경 |
|---|---|
| `src/components/InviteRedeemModal.jsx` (신규) | `InviteRedeemPage.jsx`의 연동 로직을 **그대로** 옮기고 껍데기만 팝업(`modal-overlay`/`modal-content`)으로 교체 |
| `src/components/InviteRedeemPage.jsx` (삭제) | 위 파일로 대체 |
| `src/components/InviteRedeemPage.css` → `InviteRedeemModal.css` | 안내 카드(`.personal-intro*`)를 팝업 안 안내 문구용으로 정리. `.personal-intro`는 이 화면에서만 쓰임(검색 확인) |
| `src/components/MyPage.jsx` (181줄) | "열림" 상태 1개 + 팝업 렌더 + `onLinked` prop 추가. `onOpen('invite')` 대신 상태를 켬. 예상 190줄 안팎 |
| `src/app/AppShellRoutes.jsx` (106줄) | `me/invite` 라우트 삭제, `me` 라우트에서 MyPage에 `onLinked`(= `onSessionUpdate` 후 `/app` 이동, 지금 코드와 동일) 전달 |
| `src/app/AppShell.jsx`, `src/app/lazyPages.js` | `PAGE_PATH.invite`, lazy `InviteRedeemPage` 정리 |
| `src/components/modalOutsideClick.test.js` + 새 화면 테스트 | 바깥 클릭 규칙에 이 팝업 추가, 열기/취소/4자 미만 비활성 검사 |

### 4. 안 건드릴 것
- `redeemDriverInviteCode`(`lib/driverLinkRpc.js`), `buildCloudAppSession`, `hydrateFromSupabase` — 호출만 하고 수정 없음. 서버(DB)·RPC 변경 없음.
- 기사 연동 해제·차주 쪽 초대 화면(`DriverConnectionPage`, `DriverFormModal`) — 무관.
- 마이페이지의 다른 버튼 동작.

### 5. §8 5대 질문
1. 구독 아님 — 팝업이 열릴 때 한 번 호출하는 일회성 처리(스냅샷). 2. 입력값은 팝업 안 지역 상태(`code`)뿐, Store·localStorage·Supabase에 쓰지 않음(연동 성공 후 기존 hydrate가 처리). 3. 쓰기 창구는 기존 RPC 그대로(우회 없음). 4. 동시편집·디바운스 없음. 5. DB 권한 변경 없음.
- `lib/hydrate*` 호출 코드를 옮기므로 **착수 때 `docs/testing-playbook.md` §4를 먼저 연다.**

### 6. 실패 시 처리·200줄
- 연동 실패 시 지금처럼 오류 토스트만, 팝업은 열린 채 유지. **신규 저장소·큐·fallback 레이어 없음.**
- §6 200줄: 새 파일 약 70줄, MyPage 약 190줄, AppShellRoutes 100줄대로 모두 200줄 이내 예상. 넘으면 착수 중 보고.

### 진행 결과 (2026-10-02, 코드 커밋 완료 — react-app `fbc609c`, 같은 날 화면 다듬기 `6d0a889`와 분리 커밋. 보리 폰 확인 후 push·CI·최종 `[x]` 대기)
- `npm test` unit 776 + 화면 246 전부 통과, `tsc` 0에러. 새 테스트 `MyPage.inviteModal.test.js`, `modalOutsideClick.test.js`에 "차주 연동" 추가.
- AI 브라우저 확인: 팝업 열림·문구·바깥 클릭 안 닫힘·취소 닫힘. 실제 연동 성공은 미확인(보리 테스트 계정으로 확인 필요).
- 지시서 밖 변경 1건: 연동 처리 중에는 [취소]가 막히고 버튼 글씨가 "연동 중…"으로 바뀜(처리 도중 창이 닫히는 것 방지).

### 7. 검증
- `npm test`·`tsc` 통과, 브라우저(보리): 마이페이지 → 차주 연동 → 팝업 확인 → 바깥 클릭해도 안 닫힘 → [취소] 닫힘 → 코드 4자 미만이면 [연동하기] 비활성. **실제 연동(성공) 확인은 서버 데이터가 바뀌므로 보리 테스트 계정으로만.**
- 커밋은 코드 1회(`feat: …`), 문서(`[x]` 확정)는 최종 승인 뒤 1회. push는 보리.
