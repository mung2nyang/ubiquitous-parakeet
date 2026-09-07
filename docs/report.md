# docs/report.md — 차량 등록 모달 "기사연동/운행일지" 탭 무의미 버그 수정

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12).
> **착수지시서 + 구현 (2026-09-07). 사용자 지시: "버그 고쳐" — 이번 건은 감시관이
> 직접 코드까지 작성(앞 슬라이스의 "감시관은 코드 작성 안 함" 지시는 이 건엔
> 적용 안 됨, 사용자가 새로 "고쳐"라고 명시).**

## 0. 배경 — 어떻게 발견했나

서브 차량 지출 칩 슬라이스(직전 완료) 브라우저 검증 중 보리가 "서브차량등록 →
기사연동/운행일지 클릭하는 것 중 운행일지 클릭밖에 안 된다"며 서브 캘린더 진입이
막혀 테스트를 못 하겠다고 보고. 감시관이 보리 실계정으로 직접 재현·코드 추적한
결과, 보고와는 다른 정확한 원인을 특정했다(추론이 아니라 실제 코드 실행으로
확인 — 아래 각 항목에 `javascript_exec`로 직접 값을 찍어 확인한 근거 있음).

## 1. 원인 (3단 연쇄)

1. `src/components/cars/CarDriverConnectPanel.jsx:35` — "운행 일지" 탭이
   `disabled={!logEnabled}`(`logEnabled = !!editingId`)라 **신규 등록 시엔 고를 수
   없다.** 실측: 새 차량 등록 모달에서 `disabled: true` 확인.
   - **왜 이렇게 됐나**: 2026-09-04 커밋 `5dc3ab4`가 이 탭 안의 "이 차량 일지
     열기" 버튼(저장된 차량이어야 갈 수 있어서 `editingId` 필요)을 지우고 안내
     문구("기사 연동 없이, 차주가 운행 일지를 직접 작성합니다")로 단순화했는데,
     `disabled` 게이트를 지우는 걸 빠뜨렸다 — **지금은 그 탭 안에 `editingId`가
     필요한 게 아무것도 없는데 여전히 막혀 있는 죽은 게이트.**
2. `src/lib/carInviteFromDraft.js:39-46`(`saveInviteAfterVehicle`) — 탭에서 뭘
   골랐는지 전혀 확인하지 않는다. `connectTab`(탭 선택)은 `CarFormModal.jsx`
   안의 로컬 `useState`일 뿐 `draft`에 담기지도 않아서 `save()`가 접근조차 못
   한다. `inviteCode`가 6자리 숫자면(신규 등록 시 `openAdd()`가 자동 생성,
   `CarListPage.jsx:72`) **무조건** `upsertDriver`로 `status:'pending'` 기사
   레코드를 만든다.
3. `src/app/subLogMenuItems.js:21` — `status !== 'disconnected'`(즉 `'pending'`도
   포함)인 초대가 걸린 차량번호는 사이드 메뉴 "[번호] 일지" 목록에서 제외한다.

**결과**: 서브차량을 새로 등록하면(탭 선택과 무관하게) 즉시 pending 초대가
생기고, 그 순간 사이드 메뉴에서 "일지" 항목이 사라져 조회 전용 "기사 관리"만
남는다 — 오너가 그 차량 캘린더에 들어갈 메뉴 경로가 없어진다. (URL 직접 이동
`/app/logs/<번호>`는 라우트 가드가 없어 우회 가능 — 직전 슬라이스 브라우저
검증에 이 방법을 씀.)

## 2. 수정 방향 — 블라스트 반경 최소화

**안 건드리는 것**: `subLogMenuItems.js`의 필터 로직 자체(기존에 이미
linked/pending인 차량들의 메뉴 분류 규칙은 그대로 — 그 규칙을 바꾸면 기존 연동
차량들의 메뉴 표시가 전부 영향받아 블라스트 반경이 커짐). 기존 차량을
**편집**할 때의 초대 저장 로직(무조건 `saveInviteAfterVehicle` 호출)도 무변경
— 이미 linked/pending인 관계를 건드리는 건 "연동 해제"라는 별개 기능이라 이번
버그 수정 범위 밖.

**건드리는 것**: 신규 등록(`!editingId`)에서만 "운행 일지" 탭을 실제로 선택
가능하게 하고, 그 탭을 고른 채 저장하면 `saveInviteAfterVehicle` 자체를
건너뛰어 pending 초대가 애초에 안 생기게 한다 — 탭 문구가 약속하는 "기사 연동
없이"를 실제로 지키게 하는 것.

## 3. 수정 계획 (5파일 1커밋)

| 파일 | 변경 |
|---|---|
| `CarDriverConnectPanel.jsx` | "운행 일지" 탭의 `disabled`/`onClick` 가드 제거(항상 선택 가능). 죽은 `logEnabled` prop 삭제(JSDoc 포함). |
| `CarFormModal.jsx` | 로컬 `useState('link')` 제거 → `draft.connectMode`(`'link'|'log'`, 기본 `'link'`)로 승격. `onTab`이 `setDraft`로 `connectMode` 갱신. `CarDriverConnectPanel`에 `logEnabled` 전달 제거. |
| `CarListPage.jsx` | `emptyDraft`에 `connectMode: 'link'` 추가. `openEdit`도 기존 동작 유지 위해 `connectMode: 'link'`(무변경 — 편집 흐름은 안 건드림). `save()`가 `saveInviteAfterVehicle` 호출 시 `skipInvite: !editingId && draft.connectMode === 'log'` 전달. |
| `carInviteFromDraft.js` | `saveInviteAfterVehicle`에 `skipInvite` 파라미터 추가, `true`면 `upsertDriver` 호출 전 조기 `return null`. |
| `CarDriverConnectPanel.test.js` | 기존 테스트에서 죽은 `logEnabled: true` prop 제거(더 이상 컴포넌트가 안 받음). |

**신규 저장소·검증기·DB 변경 없음(§7)**. `subLogMenuItems.js`·기존 편집 흐름·
Supabase 스키마 무변경.

## 4. 테스트 계획

- `CarDriverConnectPanel.test.js`: 기존 케이스에서 `logEnabled` prop 제거하고
  통과 확인 + "운행 일지" 탭이 `disabled` 속성 자체를 안 가지는지 케이스 추가.
- `carInviteFromDraft.test.js`(신규 또는 기존 파일에 추가): `skipInvite: true`면
  `upsertDriver`/`requestDriverInviteSave`가 전혀 호출되지 않고 `null`을
  반환하는지, `skipInvite` 없거나 `false`면 기존과 동일하게 동작하는지.

## 5. 구현 완료 보고

_(구현 후 채움)_

## 6. 검증

_(typecheck·test 재실행 후 채움)_
