# docs/report.md — 현재 슬라이스 착수지시서

## §15 슬라이스 E — 보류 (원인 화면 오판, 추후 재개)

### 경위
1차: `LinkedDriverClientsPage.jsx`(차주가 "기사 관리"에서 특정 연동기사를
눌러 보는 화면)에 고정노선 노출 수정 적용.
2차(이번 세션): 브라우저 검증 실패 → 그 화면의 `isDriverDirect` 분기(정산
방식이 "기사 직접 정산"이면 조회 전용 화면으로 바뀜)가 원인이라고 보고
그 분기를 제거·관련 죽은 파일 삭제(`npm test`/`typecheck` 통과).

**그런데 보리가 실제로 테스트한 화면은 이게 아니었다.** 보리가 본 안내문구
"차주와 공유하는 거래처 목록입니다. 등록·수정·삭제가 차주 화면에도 함께
반영됩니다"는 `LinkedDriverClientsPage.jsx`가 아니라 **`OwnerScopedClientsView.jsx`**
(소속기사 본인이 로그인해서 보는 "거래처" 화면, 파일 상단 주석: "소속기사용
거래처 관리 화면(기사↔차주 상호 편집)")에만 있는 문구 — 즉 보리는 연동기사
본인 계정 쪽 화면을 테스트했는데, 이번 세션의 수정은 차주 쪽에서 보는
화면만 고쳤다. 그래서 "+추가" 버튼은 원래도 됐고(그 화면은 처음부터 정상
동작), 고정노선만 여전히 안 되는 게 당연했다 — `OwnerScopedClientsView.jsx`도
`LinkedDriverClientsPage.jsx`가 이번에 고치기 전과 똑같은 패턴으로
`openEdit`/`save`에서 `fixedRouteLinked`를 강제로 `false`로 덮어쓰고
(23·66·73행), `hideFixedRoute={true}`로 토글 자체를 숨기고 있다(144행) —
**아직 손대지 않음.**

### 지금 상태 (보리 지시: 지금 고치지 말고 기록만)
- `LinkedDriverClientsPage.jsx`의 `isDriverDirect` 분기 제거 + 죽은 파일
  3개 삭제(`LinkedDriverDirectClientsList.jsx`/`fetchDriverOwnClients.js`+
  테스트) 커밋은 **아직 안 함**(working copy에만 있음). 이 정리 자체는
  SoT(§0, "연동 서브차량 거래처는 차주·기사 둘 다 CRUD 가능")와 맞고
  테스트도 전부 통과하지만, 보리가 본 증상의 원인은 아니었던 것으로
  확인됨 — 별도로 커밋할지 그대로 둘지는 다음 슬라이스 착수 시 같이 정리.
- §15 슬라이스 E는 `[~]`(미해결) 유지. `[x]` 아님.

### 다음에 할 일 (추후 예정 — 지금 착수 안 함)
`OwnerScopedClientsView.jsx`가 이번 슬라이스의 진짜 대상일 가능성이 높음.
착수 시 확인할 것:
1. 이 화면이 정확히 어떤 라우트/진입점에서 뜨는지(연동기사 본인 로그인
   후 어느 메뉴).
2. `LinkedDriverClientsPage.jsx`와 이 화면이 서로 다른 진입점(차주용 vs
   기사 본인용)으로 둘 다 살아있는 게 맞는지, 아니면 하나가 안 쓰이는
   중복 화면인지.
3. 맞다면 `LinkedDriverClientsPage.jsx`에 적용한 것과 같은 패턴(openEdit/
   save에서 실제 값 사용, `hideFixedRoute` 조건부화)을 이 화면에도 적용.

이 항목은 보리가 "착수지시서 확정, 작업 진행해"라고 말하기 전까지 착수
안 함.
