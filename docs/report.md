# docs/report.md — Step 9 ① 기사 연동 이관 완성: [기사이름] 기사 관리 화면 + 서브 일지 진입 정리

> Step마다/슬라이스마다 리셋되는 착수지시서·실사 보고서 통합 파일이다(AGENTS.md §12).
> 직전(슬라이스 B 1차: 서브 일지 진입·달력 라우트)은 `react-app`
> `84b5909`·`6109551`·`50f939b`·`11bc798`·`5dc3ab4`로 이미 커밋·푸시됨.
> 이 슬라이스는 그 위에서 **바닐라 "[기사이름] 기사 관리" 화면을 그대로(A안) 이관**하고,
> 서브 일지 메뉴 노출 조건을 바로잡는다. 이전 슬라이스 상세는 `docs/archive/audit.md`
> "슬라이스 B" 절(이 슬라이스 완료 시 함께 기록).

---

## 0. 감시관 사전 조사

### 바닐라 "[기사이름] 기사 관리" 화면 (`showLinkedDriverManagement`, index.html:946)
연동된(`status==='linked'`) 기사마다 사이드 메뉴 `renderLinkedDriverMenu` →
`showLinkedDriverManagement(link.id)`:
1. **헤더**: 뒤로가기(→ 기사 연동 관리) + 제목 "[기사이름] 기사 관리"
2. **프로필 카드** (`linkedDriverProfileCard`): 이니셜 아바타 + 이름 + 연락처 +
   차량번호 + **할당 상태 뱃지**(할당중 / 할당 예정 / 할당 종료 — `getAssignmentState`)
3. **칩 3개**: "거래처"(→ `linkedDriverClientsPage`) / "정산·계산서 설정"(→
   `showBillingSettingsPage`) / "상세 설정"(→ 토스트 "구상중")
4. **기사 정산 요약 카드**: 카드 상단에 **월 네비게이터**(◀ year/month select ▶),
   그 아래 `건수 / 총 운송료 / 수수료(−) / 산재보험(−) / 최종 정산액`
5. **거래처 세금계산서 섹션**: "이 기사가 실제 운송한 거래처별 매출" — 거래처별
   카드(거래처명 · 건수 · 공급가액/세액/합계 + 운송 건 목록). 거래처 미지정 운행 N건
   안내.

**서브 화면 `linkedDriverClientsPage`** ("거래처" 칩): 이 기사 전용 거래처
(`scopedToVehicleNumber` 태그) 목록 + `+ 추가`. **계산서 처리 방식별 권한**:
- 직원기사 / 회사 정산 / 기본값 → 차주가 **직접 등록·수정·삭제**(단 일반 거래처
  관리·자동완성·즐겨찾기엔 안 섞임 — `scopedToVehicleNumber` 태그)
- 기사 직접 정산(`driver_direct`) → 차주는 **조회만**(기사 계정 clients를 그때그때
  읽기만, 차주 로컬 저장 안 함)

### react-app 현황
| 조각 | 상태 |
|---|---|
| 도메인 계산 `getLinkedDriverSettlementDetail(data, monthKey, link, car)` | ✅ 있음(`financeTaxInvoiceGroups.js:158`) — 반환 `{ totalFare, tripCount, commissionAmount, insuranceAmount, finalAmount, trips, tripsFareSum }` = 정산 카드에 그대로 대응 |
| 도메인 계산 `getLinkedDriverClientInvoiceGroups(trips, car, ownerSettings)` | ✅ 있음(같은 파일:176) — 반환 `{ groups: [{ clientName, count, supplyAmount, taxAmount, totalAmount, trips, supplierBiz, vehicleLabel }], unassignedCount }` = 거래처 계산서 섹션에 그대로 대응 |
| `flattenLinkedDriverTrips` | ✅ 있음 |
| 기사 일지 데이터(daily_logs by vehicle_id) | ✅ 차주 hydrate가 이미 `workLogs[ownerKey][번호판]`에 채움 — **새 서버 조회 불필요** |
| `scopedToVehicleNumber` 거래처 데이터 모델 | ✅ 있음(`clientTypes.js`, persist, hydrate) |
| **`getAssignmentState`(할당중/예정/종료)** | ❌ 없음 — 신규(작음, `isDateWithinAssignment` 옆) |
| **`LinkedDriverManagementPage` 컴포넌트** | ❌ 없음 |
| **`renderLinkedDriverMenu` 사이드 메뉴** | ❌ 없음 |
| **`/app/drivers/:linkId` 라우트** | ❌ 없음(`/app/drivers`만 = `DriverConnectionPage` 초대 관리) |
| **`linkedDriverClientsPage`(기사 전용 거래처 CRUD)** | ❌ 없음 |
| **"정산·계산서 설정"(`showBillingSettingsPage`)** | ❌ 별도 화면 미이관(`driverInvoiceBasis`는 `TaxInvoicePage`에서만 사용) |

### 착수 전 4대 질문
1. 구독: `useOwnerDrivers`/`useOwnerCars`/`useOwnerSettings`/`useOwnerWorkDataByLogId`
   /`useOwnerClients`.
2. 값 출처: Store(차주 hydrate). 기사 일지 = `workLogs[ownerKey][번호판]`.
3. 쓰기 창구: 거래처 CRUD만 — 기존 client 저장 경로(`saveClients`/scoped 태그).
   정산·일지 데이터는 조회만.
4. 경합: 없음(조회) / 거래처는 기존 client 저장 경로 재사용.

## 1. 감시관 착수지시서 (보리 결정: A안 — 바닐라 그대로 완전 이관)

### 1-A. "[번호] 일지" 메뉴 노출 조건 정정 (슬라이스 B 잔여)
`src/app/subLogMenuItems.js`: 현재 "모든 sub 차량". → **"연동 안 된 sub
차량"으로 좁힌다** — 그 차량번호로 `status !== 'disconnected'`인 `driverLinks`가
없을 때만. (연동된 차량은 1-B의 "[기사] 기사 관리" 메뉴가 담당.) 관련 테스트
(`subLogMenuItems.test.js`) 케이스 추가.

### 1-B. "[기사이름] 기사 관리" 화면 이관 (신규)

| 파일 | 내용 |
|---|---|
| `src/domain/drivers.js` | `getAssignmentState(link)` 신규 — `{ key: 'scheduled'\|'ended'\|'active', label: '할당 예정'\|'할당 종료'\|'할당 중' }`. `assignmentStart`/`End` + 오늘 비교(바닐라 `getAssignmentState` 그대로). |
| `src/components/drivers/LinkedDriverManagementPage.jsx` (신규) | 헤더(뒤로가기 → `/app/drivers`) + 프로필 카드 + 칩 3개 + 월 네비게이터 + 정산 요약 카드(`getLinkedDriverSettlementDetail`) + 거래처 세금계산서 섹션(`getLinkedDriverClientInvoiceGroups`). **200줄 초과 예상 → §3에 분리설계안**(예: 정산요약/계산서섹션/프로필카드 하위 컴포넌트). |
| `src/components/drivers/LinkedDriverClientsPage.jsx` (신규) | "거래처" 칩 대상. 이 기사 전용(`scopedToVehicleNumber === 차량번호`) 거래처 목록 + `+ 추가`. 권한: 계산서 처리 방식(`getEffectiveDriverSettlementMode(car, settings)`)이 `driver_direct`면 조회만, 아니면 CRUD. **§3에 설계 선제시**(기존 client 모달·저장 경로 재사용 범위). |
| `src/app/AppShellRoutes.jsx` | `<Route path="drivers/:linkId" element={<LinkedDriverManagementPage .../>} />` + `drivers/:linkId/clients`(또는 내부 상태). |
| `src/components/SideMenu.jsx` + `src/app/subLogMenuItems.js`(또는 새 헬퍼) | AppShell이 `status==='linked'` 기사 목록(`{ linkId, driverName }`) 계산 → "관리" 섹션에 "[기사이름] 기사 관리" → `/app/drivers/:linkId`. (§5-1의 prop 방식 — SideMenu 순수 유지.) 소속기사 세션 제외. |
| `src/components/DriverConnectionPage.jsx` | (선택) "연동 중" 기사 항목 클릭 시 `/app/drivers/:linkId`로 — 자연스러운 추가 진입점. §3에서 판단. |
| "정산·계산서 설정" 칩 | §3에 확인: 별도 화면 이관 필요한지 / `driverInvoiceBasis`·정산방식 설정을 어디에 둘지. 최소로는 토스트 or 기존 설정 링크. |
| "상세 설정" 칩 | 토스트 "상세설정은 구상중입니다."(바닐라 그대로). |

### 1-C. 건드리지 않을 것
슬라이스 A 서버 계약, `DayLogPage`, 소속기사 경로(`DriverRevenueView` 등),
`getLinkedDriverSettlementDetail`/`getLinkedDriverClientInvoiceGroups` **로직**
(재사용만), 일반 거래처 관리(`ClientManagementPage`), 매출 화면.

### 1-D. 실패 처리 (§7)
신규 durable/큐 없음. 조회 화면 + 거래처는 기존 저장 경로. DB 작업 없음
(`scopedToVehicleNumber`·정산 컬럼 이미 존재).

### 1-E. 착수 전 작업자 확인 요청 사항 (→ §3)
1. `LinkedDriverManagementPage` 하위 분리(200줄) 설계.
2. `LinkedDriverClientsPage`: 기존 client 모달/`saveClients`/`scopedToVehicleNumber`
   태그 재사용 방식 + `driver_direct` 조회 전용 처리(기사 계정 clients를 어떻게
   읽나 — 이미 있는 RPC/hydrate 경로 확인).
3. "정산·계산서 설정" 칩 대상 결정(감시관 확인).
4. 사이드 메뉴 2종("[번호] 일지" 연동X sub / "[기사] 기사 관리" 연동 기사) 동시
   노출 시 UX·순서.
5. 각 파일 `wc -l` 실측.

### 1-F. 작업자 전달문 (§3 확인 후)
> AGENTS.md의 §1 작업자 규칙을 준수하라. `.md` 파일은 수정하지 말고 지시된
> 코드 작업만 하라. DB 없음. 범위 = §1-A + §1-B. 도메인 계산
> (`getLinkedDriverSettlementDetail`·`getLinkedDriverClientInvoiceGroups`)은
> 재사용만, 로직 무변경. 슬라이스 A·`DayLogPage`·매출 화면·소속기사 경로 무변경.
> §3에 (1)~(5) 답 + 화면 분리설계 먼저 제시하고 감시관 확인 후 구현.
> `npm run typecheck` + `npm test` 전체 통과 후 커밋.

## 2. 착수 전 상태 (2026-09-04)
- `react-app` HEAD `5dc3ab4` = origin/main.
- `ubiquitous-parakeet` `c41b44d` + 문서 갱신분 미커밋.

## 3. 작업자 Phase 1 보고
(§1-E 답 + 설계)

## 4. 작업자 구현 완료 보고

## 5. 감시관 실사
