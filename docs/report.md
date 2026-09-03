# docs/report.md — 슬라이스 F: 차량 등록 모달에 "기사 연동" 목업 반영

> Step마다/슬라이스마다 리셋되는 착수지시서·실사 보고서 통합 파일이다(AGENTS.md §12).
> 배경은 `docs/audit.md`의 "백로그 후보 확인 — 차량 등록 모달에 '기사 연동' UI
> 임베드"(2026-09-03) 및 이어지는 범위 확정 절 참고. 슬라이스 A~E(기사관리
> 대리작성 + 소속기사 로그인/초대코드 연동)는 이미 완료·승인됨.

## 0. DB 작업

**없음.** 이 슬라이스는 기존 초대/연동 로직(슬라이스 A의
`upsert_driver_link_idempotent` RPC, `requestDriverInviteSave`)을 그대로
재사용하는 UI 작업이다 — 새 테이블·RPC·RLS 정책 불필요.

## 1. 감시관 착수지시서 — 클라이언트 코드 (2026-09-03)

### 배경 (보리 요청 원문 요지)
차량 등록/수정 모달(`기사 등록` 시, 즉 서브 차량 등록 시) 하단에 있는 안내
문구를 없애고, 그 자리에 보리가 만든 목업 화면을 반영해 달라는 요청.
정확히는:
- 대상: "차량 관리 → 기사 등록" 모달.
- 지울 것: 하단의 안내 문구(아래 "대상 코드" 참고).
- **"정산"(매출제/월급제, %) 섹션은 그대로 유지** — 그 아래 문구 자리만 교체.
- 그 자리에 넣을 것: 보리가 전달한 목업(`docs/assets/slice-f-driver-connect-mockup.png`,
  본 대화에서 SendUserFile로 저장소에 커밋해 둠) — "기사 연동 / 운행일지" 탭
  토글 + "기사를 초대해 차량을 배정하세요. (배정된 기사가 작성한 운행 일지를
  확인할 수 있습니다.)" 안내 문구 + 취소/저장 버튼.
- 보리 확인: 이건 "운행일지 탭을 새로 만드는" 요청이 아니라, 이미 전달한
  목업 화면 그대로를 그 위치에 반영해 달라는 것 — 목업 자체에 이미 탭
  토글이 그려져 있을 뿐, 탭별 기능을 처음부터 새로 설계해 달라는 뜻이 아님.

### 지켜야 할 기존 계정 규칙 (보리가 이번에 재확인해 준 것 — 전부 슬라이스 E에서
이미 구현·승인됨. 이번 슬라이스가 이 규칙들을 깨지 않는지 확인하는 게 중요)
1. 연동 전에는 차주/기사 구분 없이 기본 일지만 보이며, 마이페이지의 차주/기사
   칩 및 "기사연동관리" 메뉴는 연동 전까지 숨김 처리.
2. 차주든 기사든 상관없이 초대코드 입력이 가능해야 함.
3. 게스트는 기사 등록/초대 버튼 자체가 아예 노출되지 않음.
4. 차주는 기사를 등록하는 시점부터, 기사는 초대코드를 입력해 연동 완료된
   시점부터 각각 기능이 활성화됨.

### 대상 코드 (감시관이 직접 확인)
`src/components/cars/CarFormModal.jsx` 131행:
```jsx
<p className="car-type-hint">{isSub ? '기사 차량으로 등록됩니다. (기사 연동은 나중에)' : '메인 차량으로 등록됩니다.'}</p>
```
- `isSub`(서브 차량 = 기사 차량)일 때만 이 문구가 뜬다. **`isSub`가 아닌
  분기("메인 차량으로 등록됩니다.")는 건드리지 않는다** — 메인 차량엔 기사
  연동 개념이 없다.
- 81~128행의 "정산"(매출제/월급제, `driverPayMode`/`commission`/
  `driverSalaryAmount`) 섹션은 그대로 유지.
- 이 파일은 현재 139줄 — §3 200줄 제한 안쪽이지만, 목업 UI를 통째로 넣으면
  넘어갈 가능성이 있다. 넘어갈 것 같으면 착수 전에 분리설계안부터 보고할 것
  (§3 절차 — 임의로 그냥 진행하지 말 것).

### 기존 코드와의 관계 (중복 구현 금지)
- 기사 초대(이름/전화번호/초대코드 생성/차량 할당) 로직은 이미
  `src/components/DriverConnectionPage.jsx` + `DriverFormModal.jsx` +
  `src/lib/directMutationActions.js`의 `requestDriverInviteSave` +
  `src/lib/drivers.js`의 `generateInviteCode`/`upsertDriver`로 구현돼 있다.
  이번 작업은 **같은 저장 경로(`requestDriverInviteSave`)를 재사용**해야
  한다 — 초대 저장 로직을 이 모달 안에 새로 복제하지 말 것.
- 참고로 `CarFormModal.jsx`는 이미 기사명(`driverName`)·연락처
  (`driverPhone`)를 자체 필드로 받고 있다(74~80행) — 목업의 "기사 연동" 탭이
  이름/전화번호를 또 물어보는 화면이라면, 이미 입력받은 값과 어떻게
  합칠지(재입력 방지) 작업자가 착수 전에 제안할 것.
- `DriverConnectionPage.jsx`("기사연동관리" 페이지)는 없애지 않는다 — 이
  모달에서도 같은 초대 기능을 쓸 수 있게 되는 것뿐, 기존 페이지는 그대로
  둔다(대체 아님, 추가 진입점).

### 목적 및 기대 결과
1. "기사 등록" 모달(서브 차량 등록/수정)에서, "정산" 섹션 아래 안내 문구가
   사라지고 그 자리에 목업과 같은 형태의 "기사 연동" UI가 들어간다.
2. 그 UI로 초대코드를 생성/표시하고 저장하면, 기존
   `requestDriverInviteSave` 경로를 그대로 타서 `driver_links` 행이 생성된다
   (슬라이스 A와 동일한 결과 — 새 DB 동작 없음).
3. "운행일지" 탭: 신규 차량 등록(아직 저장 전, 배정 이력 없음) 시엔 표시할
   데이터가 없으므로 비활성/숨김 처리하고, 기존 차량 수정 시엔 그 차량의
   기존 운행일지를 최소한으로 보여준다(이미 있는 데이터/컴포넌트 재사용 —
   새 화면 설계 금지, 정확한 재사용 대상은 착수 전 확인 결과에 포함).
4. 위 "지켜야 할 기존 계정 규칙" 4가지가 이번 변경으로 깨지지 않는다(특히
   게스트 노출 금지 — 이 모달 자체가 게스트에게도 열리는 화면인지 착수 전
   확인 필요).

### Explicit Out-of-Scope (이번 라운드)
- 슬라이스 D(차주 화면의 기사별 드롭다운) — 무관.
- 이중역할(기사+차주 동시) 역할전환 UI — 여전히 범위 밖.
- `clients` 테이블 접근 — 여전히 열지 않음(슬라이스 E 결정 유지).
- `DriverConnectionPage.jsx`/`DriverFormModal.jsx` 자체의 구조 변경 —
  재사용만 하고 그 파일들을 리팩터링하지 않는다(불필요한 범위 확장 금지).

### 실패 시 처리 방식
기존 원칙 그대로 — durable 재시도 큐 신설 없음(§0-1 A/B), 실패는 토스트만.

### 사용자 승인 근거
- 2026-09-03, 보리: 스크린샷 3장 + "저 위치에 내가 만든 피그마화면을
  만들고싶어" → 감시관 확인 질문(정산 섹션 유지 여부) → "맞아" → 목업이
  기존 화면이 아니라 신규 목업이라는 것과 "운행일지 탭을 새로 만들자는 게
  아니라 목업 그대로 반영해 달라는 것"이라는 정정 → 계정 규칙 4가지 재확인.

### 착수 전 작업자 확인 요청 사항
1. `docs/assets/slice-f-driver-connect-mockup.png`를 보고 정확한 레이아웃
   (탭 토글 스타일, 문구, 버튼 배치)을 확인할 것.
2. `CarFormModal.jsx`가 이미 받는 기사명/연락처 필드와 목업 UI가 겹치는
   부분을 어떻게 처리할지 제안.
3. "운행일지" 탭의 데이터 소스(신규 등록 시 숨김/비활성, 수정 시 어떤 컴포넌트
   재사용할지) 제안.
4. 이 모달이 게스트 세션에도 열리는지 확인 — 열린다면 "기사 연동" 탭이
   게스트에게 안 보이게 가드 추가(계정 규칙 3번).
5. `CarFormModal.jsx`가 목업 UI 추가로 200줄을 넘을지 미리 가늠해서, 넘을 것
   같으면 분리설계안부터 보고.

## 2. 작업자 Phase 1 보고
(2026-09-03, 작업자)

### 시작 전 상태
- `react-app` HEAD `ce08638` + 슬라이스 E 미커밋 + 매출 C-2 미커밋 — **이번 슬라이스는 cars 모달만**, 기존 미커밋 덮어쓰지 않음.
- 목업: `docs/assets/slice-f-driver-connect-mockup.png` 확인 — 탭(기사 연동/운행 일지) + 안내 문구 + 취소/저장.

### 착수 전 확인 결과
1. **기사명/연락처 중복**: 상단 기존 `driverName`/`driverPhone` 필드를 그대로 쓰고, 기사 연동 탭에서는 **초대코드(+생성)**·안내 문구만 추가. 이름/전화 재입력 UI 없음.
2. **운행일지 탭**: 신규(`!editingId`)는 탭 비활성 + 「저장 후 확인할 수 있습니다」. 수정 시 `useOwnerWorkDataByLogId`의 `workLogs[차량번호]`에서 최근 날짜 목록만 최소 표시(새 DayLog 화면 설계 금지).
3. **게스트**: `CarListPage`는 게스트도 열림. `isCloudSession`이 아니면 기사 연동 패널 자체를 숨기고 짧은 「기사 차량으로 등록됩니다.」만 유지(계정 규칙 3).
4. **200줄**: `CarFormModal` 139줄 → 목업 통째 삽입 시 초과 확실 → **분리설계**:
   - `CarFormModal.jsx` — 차량/기사 기본·정산·취소저장
   - `CarDriverConnectPanel.jsx`(신규) — 탭·초대코드·일지 미리보기
5. **저장**: `requestVehicleSave` 성공 후(서버 `supabaseId` 확보), 클라우드·서브·초대코드 6자리 있으면 `upsertDriver` + `requestDriverInviteSave` 재사용. 차량번호=draft.number, 시작일=오늘(또는 draft에 둔 값).

착수 진행.

## 3. 작업자 구현 완료 보고 (2026-09-03)

### 변경 파일·줄 수
| 파일 | 줄 | 비고 |
|---|---:|---|
| `cars/CarDriverConnectPanel.jsx` | 102 | **신규** 탭·초대코드·일지 미리보기 |
| `cars/CarFormModal.jsx` | 150 | 정산 유지, isSub+cloud 시 패널 |
| `cars/CarListPage.jsx` | 183 | session/cloud, 저장 후 초대 연쇄 |
| `lib/carInviteFromDraft.js` | 83 | **신규** `requestDriverInviteSave` 재사용 |
| `app/AppShellRoutes.jsx` | — | cars에 `session` 전달 |
| `side-menu.css` | — | `.car-driver-connect*` 스타일 |
| `lib/carInviteFromDraft.test.js` | — | skip/날짜 단위 테스트 |

### 동작
1. 로그인 + 서브 차량: 정산 아래 목업 탭(기사 연동/운행 일지). 이름·전화은 기존 필드 재사용.
2. 저장: `requestVehicleSave` →(코드 6자리 있으면) `upsertDriver`+`requestDriverInviteSave`.
3. 게스트: 연동 패널 숨김, 「기사 차량으로 등록됩니다.」만.
4. 신규 차량: 운행일지 탭 비활성. 수정: 해당 차량 `workLogs` 최근 날짜 목록.

### 검증
- `carInviteFromDraft.test.js` + `CarListPage.dupKey.test.js` pass
- 해당 파일 typecheck 신규 에러 없음
- 커밋/푸시 미실행

---

## 4. 감시관 Phase 2 실사 및 최종 판정 (2026-09-03)

### 실사 방법
디바이스에서 직접 스테이징 후 6개 변경/신규 파일 전체를 직접 읽었다(서브에이전트
위임 없이 감시관 본인이 직접 확인): `CarFormModal.jsx`, `CarDriverConnectPanel.jsx`,
`CarListPage.jsx`, `carInviteFromDraft.js`, `carInviteFromDraft.test.js`,
`AppShellRoutes.jsx`. 추가로 작업자 보고에 없던 2개 파일도 직접 찾아 확인했다:
`CarManagementPage.jsx`(139자리 재수출 스텁 — `AppShellRoutes.jsx`가 참조하는
이름과 실제 컴포넌트 파일이 달라 라우팅 경로를 끝까지 추적하기 위해 필요했음),
`side-menu.css`(목업 반영 슬라이스이므로 실제 스타일이 붙었는지 확인 필요).

### 확인 결과
1. **정산 섹션 유지**: `CarFormModal.jsx` 94~127행 상당의 "정산"(매출제/월급제,
   %) 섹션 원본 그대로 보존. `isSub`가 아닌 분기("메인 차량으로 등록됩니다.")도
   불변.
2. **목업 UI 반영 위치**: 130~142행, `showConnect = isSub && cloud`일 때만
   `CarDriverConnectPanel`이 렌더되고, 그 외엔 짧은 안내문 한 줄만 남음 — 지시한
   교체 지점과 정확히 일치.
3. **이름/전화번호 중복 없음**: `CarDriverConnectPanel.jsx`에는 초대코드
   입력/생성 UI만 있고 기사명·연락처 재입력 필드 없음 — 상단 기존
   `driverName`/`driverPhone` 필드를 그대로 재사용.
4. **기존 로직 재사용, 신규 복제 없음**: `carInviteFromDraft.js`의
   `saveInviteAfterVehicle`이 `upsertDriver`(`lib/drivers.js`)와
   `requestDriverInviteSave`(`lib/requestDriverInviteSave.js`)를 그대로 호출.
   저장 로직 자체를 새로 구현하지 않았다. (착수지시서에 `directMutationActions.js`
   경유라고 적었던 건 감시관의 경로 표기가 부정확했던 것 — 실제로는 전용 모듈
   `requestDriverInviteSave.js`를 직접 참조하며, 동일 함수이므로 문제 아님.)
5. **저장 순서(Fail-Fast)**: `CarListPage.jsx`의 `save()`가 `requestVehicleSave`
   실패 시 즉시 return하고 초대 저장을 시도하지 않음 — 차량 저장 성공 후에만
   `saveInviteAfterVehicle` 호출. durable 재시도 큐 없음, 실패 시 토스트만(§0-1
   A/B 준수).
6. **게스트 가드(계정 규칙 3)**: `cloud = isCloudSession(session) || !!getCloudUserId()`가
   `false`면 `showConnect`가 `false`가 되어 연동 패널 자체가 렌더되지 않음 —
   기사명/연락처 로컬 입력 필드(연동과 무관, 슬라이스 F 이전부터 존재)만 남고
   초대코드 생성/저장 버튼은 게스트에게 전혀 노출되지 않음.
7. **운행일지 탭 상태 분기**: `CarDriverConnectPanel.jsx`가 `logEnabled`(=
   `!!editingId`) 기준으로 신규/빈 데이터/데이터 있음 3가지 상태를 분기 —
   신규 등록 시 비활성, 기존 차량 수정 시 `dayLogByDate`에서 최근 7일만 표시.
   새 화면 설계 없이 기존 `useOwnerWorkDataByLogId` 데이터 재사용.
8. **세션 전달 경로 끝까지 추적**: `AppShellRoutes.jsx` 61행이 `CarManagementPage`에
   `session` prop 전달 → `lazyPages.js`가 `CarManagementPage`를
   `../components/CarManagementPage.jsx`로 lazy import → 그 파일은
   `export { default } from './cars/CarListPage.jsx'` 재수출 스텁 → 결국
   `CarListPage.jsx`가 `session` prop을 정상적으로 받음. (직접 grep으로는
   `AppShellRoutes.jsx`에서 `CarListPage`라는 이름 자체가 안 잡혀 처음엔
   의심했으나, 재수출 스텁을 통한 간접 참조였을 뿐 실제 결함 아님.)
9. **CSS 반영**: `side-menu.css`에 `.car-driver-connect`,
   `.car-driver-connect-tabs`, `.car-driver-connect-copy`,
   `.car-daylog-preview`, `.driver-code-row` 전부 스타일 존재 확인 — 목업 UI가
   스타일 없이 날것으로 뜨는 문제 없음.
10. **200줄 규칙**: `CarDriverConnectPanel.jsx` 102줄, `CarFormModal.jsx` 150줄,
    `CarListPage.jsx` 183줄, `carInviteFromDraft.js` 83줄 — 보고된 줄 수와 실제
    일치(공백 개행 오차 제외). 사전 분리설계 판단(패널 컴포넌트 분리)이 적절했고
    임의로 200줄을 넘긴 파일 없음.
11. **범위 밖 항목 미침범**: `clients` 테이블 미접근, `DriverConnectionPage.jsx`/
    `DriverFormModal.jsx` 리팩터링 없음(변경 파일 목록에 없음), 이중역할 UI
    미착수, 슬라이스 D 미착수 — 전부 확인.
12. **테스트**: `carInviteFromDraft.test.js`는 `todayIsoDate` 형식 검증과
    `saveInviteAfterVehicle`의 스킵 조건(비클라우드/코드없음)만 검증한다. 실제
    성공 경로(코드 있음 → upsertDriver/requestDriverInviteSave 호출)는 목(mock)
    없이 테스트되지 않아 다소 얕다 — 다만 그 내부 함수들은 슬라이스 A에서 이미
    검증된 기존 코드를 그대로 호출할 뿐이므로 이번 슬라이스의 신규 위험은 아니다.
    **차단 사유는 아니며, 참고 사항으로만 기록.**
13. **절차 준수 확인**: `report.md` §3(작업자 구현 완료 보고)이 "커밋/푸시
    미실행"과 "(감시관 Phase 2 실사 대기)"로 정확히 멈춰 있고, 슬라이스 E에서
    발생했던 "작업자가 감시관 판정 절을 대신 작성"하는 절차 위반이 이번엔
    재발하지 않았다. 개선 확인.

### 최종 판정: **[PASS]**
목업 화면이 정확한 위치에 반영되었고, "정산" 섹션과 4가지 계정 규칙(연동 전
칩/메뉴 숨김 — 이번 슬라이스 무관 영역 미변경으로 자동 보존, 초대코드 양방향
입력 — 기존 경로 무변경, 게스트 비노출, 등록/연동 시점별 활성화 — 기존 로직
무변경)이 모두 보존됐다. 기존 저장 경로(`upsertDriver`/`requestDriverInviteSave`)를
정확히 재사용했고 신규 durable 로직이나 재시도 큐를 도입하지 않았다(§0-1 A/B
준수). 200줄 규칙도 사전 분리설계로 준수했다(§3). 커밋/푸시는 보리 승인 시
슬라이스 E와 함께 배치 처리(§2).

남은 항목(참고, 차단 아님): 슬라이스 E + 슬라이스 F 통합 브라우저 테스트는
보리가 UI 도달 가능해지면 직접 진행하기로 보류된 상태 — 이번 [PASS]로 그
테스트가 가능해졌으므로 재안내 필요.

---

## 5. 감시관 → 작업자 커밋 지시서 (2026-09-03)

> 근거: 슬라이스 E(§0~해당 감시관 판정)·슬라이스 F(§1~4) 모두 감시관
> 교차검증 [PASS] + 보리 브라우저 실검증 완료 + 보리 승인("승인하는데",
> 2026-09-03). AGENTS.md §2 절차에 따라 감시관이 이 지시서를 작성하고,
> **보리가 이 지시서를 작업자에게 전달**, 작업자가 아래 범위·메시지로
> 커밋을 실행한다. **push는 이 지시서에 포함되지 않는다 — 절대 실행하지
> 말 것.** 클린업 목적의 임의 reset/checkout/clean/stash도 금지.

### 5-1. 저장소 A: `react-app`

**⚠️ 주의**: 작업 트리에 이번에 승인되지 않은 "매출 C-2" 등 다른 미커밋
변경이 함께 남아 있을 수 있다(착수 전 상태 메모 참고). **`git add -A`/`git
add .` 같은 전체 스테이징 절대 금지.** 아래 파일만 개별 경로로 `git add`할 것.

**커밋 전 필수 절차**: `git status --short`(또는 `git diff --stat`) 결과를
먼저 `docs/report.md`의 이 절 아래(또는 보리에게 직접) 공유해, 아래 목록과
실제 변경 파일이 일치하는지 — 그리고 매출/C-2 관련 파일이 섞여 있지 않은지
— 먼저 확인받은 뒤에 `add`/`commit`을 실행할 것.

**포함 대상 (감시관이 이번 세션에서 직접 검증 완료한 파일)**:

슬라이스 F (전량 직접 읽고 확인함):
- `src/components/cars/CarFormModal.jsx`
- `src/components/cars/CarDriverConnectPanel.jsx` (신규)
- `src/components/cars/CarListPage.jsx`
- `src/lib/carInviteFromDraft.js` (신규)
- `src/lib/carInviteFromDraft.test.js` (신규)
- `src/app/AppShellRoutes.jsx`
- `src/side-menu.css`

슬라이스 E — DB:
- `supabase/migrations/0002_driver_invite_redeem.sql`

슬라이스 E — 클라이언트 코드 (감시관이 이번 세션 중 파일 수정시각(mtime)
기준으로 재구성한 목록 — **참고용이며 확정 목록 아님**. 작업자가 실제
슬라이스 E 작업 시 변경한 정확한 파일 목록과 대조해 누락·오기재 여부를
최종 확정할 것):
- `src/app/App.jsx`
- `src/app/AppShell.jsx`
- `src/app/boot.js`
- `src/app/employedDriverSession.test.js`
- `src/app/lazyPages.js`
- `src/components/DriverConnectionPage.jsx`
- `src/components/InviteRedeemPage.jsx`
- `src/components/MyPage.jsx`
- `src/lib/driverLinkRpc.js`
- `src/lib/hydrate.js`
- `src/lib/hydrateEmployedDriver.js`
- `src/lib/outboxTypes.js`

**제외 기준(명시적 제외)**: 위 목록에 없는 파일, 특히 매출/정산/C-2
관련 파일(예: `finance` 계열, `revenue` 계열 중 이번 슬라이스와 무관한
변경분), `*.test-standalone-output*.txt`류 빌드/테스트 로그 산출물,
`node_modules`, `dist` — 전부 이번 커밋에서 제외.

**커밋 메시지 (한국어, 작업자가 그대로 사용)**:
```
feat: 소속기사 로그인/연동(슬라이스 E) 및 차량 등록 모달 기사 연동 목업(슬라이스 F) 반영

- 슬라이스 E: driver_links 기반 소속기사 로그인/연동 흐름 구현. RLS 대신
  security definer 함수(get_linked_owner_profile_settings,
  get_assigned_vehicle_summary)로 profiles/vehicles 민감 컬럼 노출 차단.
  초대코드 리딤, 부트스트랩(ownerKeyFromSession/buildCloudAppSession),
  하이드레이션(employedDriver 분기) 구현.
- 슬라이스 F: 차량 등록 모달(CarFormModal)의 안내 문구를 목업 기반 "기사
  연동/운행 일지" UI로 교체. 기존 초대 저장 경로(upsertDriver/
  requestDriverInviteSave)를 재사용해 신규 로직 복제 없음. 200줄 규칙 준수를
  위해 CarDriverConnectPanel 컴포넌트로 분리.

감시관 교차검증 [PASS] (docs/report.md §4, docs/audit.md 참고), 보리 승인
완료, 브라우저 실검증 완료. 이 커밋에는 push를 포함하지 않음 — Step 9 전체
완료 후 보리가 별도로 검토·푸시함.
```

### 5-2. 저장소 B: `ubiquitous-parakeet` (docs)

**포함 대상**:
- `docs/report.md`
- `docs/audit.md`
- `docs/assets/slice-f-driver-connect-mockup.png`

**커밋 메시지 (한국어)**:
```
docs: 슬라이스 E/F 감시관 실사 기록 및 착수지시서 반영

- docs/report.md: 슬라이스 F 착수지시서, 작업자 Phase 1/구현 완료 보고,
  감시관 Phase 2 [PASS] 판정, 커밋 지시서 기록
- docs/audit.md: 슬라이스 E 보안설계(RLS→security definer 함수) 보강 이력,
  슬라이스 E/F 최종 [PASS] 판정, 브라우저 실검증 완료, 커밋 절차 정정 기록
  등 영구 이력 추가
- docs/assets/slice-f-driver-connect-mockup.png: 보리 제공 목업 이미지 신규
  추가
```

### 5-3. 공통 준수사항
- 두 저장소 모두 **커밋까지만** — `git push`는 절대 실행하지 않는다.
- 커밋 완료 후 각 저장소의 `git log -1 --stat` 결과를 보리에게 보고할 것
  (감시관이 사후 대조 검증할 근거 자료).
- 커밋 대상 파일 확정 과정에서 이 지시서와 실제 변경분이 다르면(예: 슬라이스
  E 파일 목록에 누락/추가가 있으면), 임의로 판단하지 말고 보리에게 먼저
  확인받을 것.
