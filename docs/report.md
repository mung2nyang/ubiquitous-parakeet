# docs/report.md — Step 10 1차: 게스트 백업 내보내기/가져오기 + 백업 권장 알림

> 슬라이스마다 리셋되는 착수지시서·실사 통합 파일(AGENTS §12). Step 9(①+②) 전체 `[x]`
> 완료. 이제 **Step 10(리포트 PDF/알림/온보딩/고객센터)** 착수 — 보리 지시로 "완벽한 이관"이
> 우선(`STATUS.md` "우선순위 원칙" 참고). Step 10의 "알림" 항목 중 가장 작은 조각(백업
> 알림+기능)부터.

---

## 1. 착수지시서

### 1-A. 배경
- 원본(`ubiquitous-parakeet`)엔 "데이터 백업 권장" 알림(로컬 백업 안 하면 날아간다는 경고,
  `script.js` `getBackupNotificationItem`)이 있는데 react-app엔 이 알림 자체가 없다.
- 원본은 로그인/게스트 둘 다에 이 알림을 띄우지만(로그인 시 더 느슨한 기준), **보리 결정:
  이번 슬라이스는 게스트만** — 로그인(클라우드) 세션은 Supabase 자동 저장이 정본이라 이번엔
  범위 밖(원본과 다른 점, 명시적 결정).
- react-app엔 백업 **내보내기/가져오기 기능 자체가 아직 없어서**, 알림만 만들면 "지금 백업"
  버튼이 갈 곳이 없다 — 기능도 같이 만든다(보리 지시).

### 1-B. 설계 — 신규 저장소·복구 레이어 없음(§7), 기존 스냅샷 메커니즘 재사용
- **내보내기**: `store/owner-state.js`의 `SLICE_DOMAINS`(`cars`·`clients`·`settings`·
  `expenses`·`invoices`·`drivers`·`profile`·`dismissedNotifications`·`workDataDeletedDates`)
  각각을 `store/persistDomainRead.js`의 `readPersistDomain(domain, 'guest')`로 읽고,
  `workData`는 `store/persist.js`의 `readLogWorkData('guest', logId)`를 `cars`(type='sub')
  전부 + `'main'`에 대해 돌며 모은다(원본 `subWorkData` 패턴과 동일). 하나의 JSON 객체로
  묶어 `Blob`+`<a download>`로 파일 다운로드(원본 `exportData()` 참고, `html2pdf` 같은
  외부 라이브러리 불필요 — 순수 JS).
- **가져오기**: 파일 선택 → JSON.parse → 최상위가 객체인지, 예상 도메인 키가 있는지 런타임
  검증(AGENTS §6 "외부 경계 값은 중첩까지 검증") → **`store/owner-state.js`의
  `replaceOwnerState('guest', snapshot, { sync: false })`를 그대로 호출**해서 한 번에
  반영(새 배치 함수 작성 금지 — 이미 hydrate/스냅샷 복원에 쓰는 검증된 원자적 경로 재사용).
  `sync: false`는 게스트라 어차피 무관하지만 명시.
- **원본과 의도적으로 다르게 하는 것**: 원본의 `IMPORT_PROTECTED_IDENTITY_FIELDS`(계정
  간 정체성 보호 로직)는 **이번 스코프에서 구현하지 않는다** — 게스트는 항상 `ownerKey==='guest'`
  하나뿐이라 여러 계정 간 데이터가 섞일 위험 자체가 없다(원본은 로그인 다계정 환경이라
  필요했던 방어). 이 로직을 굳이 옮기지 말 것 — 신규 검증 레이어를 게스트 스코프에 억지로
  넣지 않는다.
- **알림**: `lib/notifications.js`의 `collectNotifications`에 항목 추가. 게스트 전용
  (`ownerKey === 'guest'` 또는 `!isCloudSession(session)` — 기존 판별 방식과 맞출 것,
  `MyPage.jsx`/`DriverConnectionPage.jsx`가 쓰는 `isCloudSession` 재사용). `lastBackupAt`
  타임스탬프(신규 로컬스토리지 키 하나, 게스트는 항상 `ownerKey='guest'`라 별도 스코프 불필요)
  가 없거나 14일(원본 `BACKUP_REMINDER_DAYS` 그대로) 넘게 지났으면 알림. 내보내기 성공 시
  이 키를 현재 시각으로 갱신.

### 1-C. 파일 (예상 3~4개, 신규 코드 최소화)
| 파일 | 내용 |
|---|---|
| `src/lib/guestBackup.js` (신규) | `buildGuestBackupData()`(내보내기용 JSON 조립) / `applyGuestBackupData(parsed)`(검증 후 `replaceOwnerState` 호출) / `getLastBackupAt()`·`markBackupDone()`(타임스탬프 키) — 순수 로직 + 위 두 저장소 함수 호출만, DOM 없음. |
| `src/components/AppSettingsPage.jsx` | 게스트 세션에서만 보이는 "백업" 섹션 추가(내보내기 버튼 → `guestBackup.js` 호출 + Blob 다운로드, 가져오기 `<input type="file">` → 파싱 후 `guestBackup.js` 호출). 200줄 넘으면 §6에 따라 분리설계 먼저 보고(현재 107줄이라 여유 있어 보이나 실제 추가 후 재확인). |
| `src/lib/notifications.js` | `collectNotifications`에 백업 알림 항목 추가(게스트 전용). |
| 신규 테스트 | `guestBackup.test.js`(내보내기→가져오기 왕복 후 각 도메인 값 일치 assert, 손상된 JSON 거부) + `notifications.test.js`(있으면 기존에 추가, 없으면 신규 — 게스트/로그인 세션 분기, 14일 경계값). |

### 1-D. 건드리지 않을 것
- 로그인(클라우드) 세션 쪽 백업/알림 로직 — 이번 스코프 아님, 원본의 "로그인 시 30일 기준"
  분기 옮기지 않는다.
- `replaceOwnerState`/`readPersistDomain`/`readLogWorkData` 등 기존 저장소 함수 시그니처 —
  무변경, 그대로 호출만.
- DB 무변경.

### 1-E. 실패 처리 (§7)
가져오기 파일이 손상됐거나 예상 구조가 아니면 **토스트 안내 후 아무것도 반영하지 않는다**
(부분 반영 금지 — `replaceOwnerState` 호출 전 검증에서 걸러야 함). 신규 durable/재시도
레이어는 만들지 않는다 — 실패하면 그냥 실패로 끝(게스트 로컬 작업이라 재시도 큐 불필요).

### 1-F. 작업자 전달문
> AGENTS.md §1 준수. `.md` 수정 금지. DB 변경 없음. 범위 = 위 표의 파일들만(3~4개).
> 신규 저장소/복구 레이어 금지 — 내보내기는 기존 `readPersistDomain`/`readLogWorkData`로 읽고,
> 가져오기는 반드시 기존 `replaceOwnerState('guest', snapshot, { sync: false })`를 그대로
> 호출할 것(새 배치 함수 작성 금지). 원본의 "계정 간 정체성 보호" 로직은 게스트 단일 계정
> 환경이라 옮기지 않는다(이유: 1-B 참고). 로그인(클라우드) 세션은 이번 스코프 아님 — 알림도
> 백업 섹션 UI도 게스트에서만 노출.
> `npm run typecheck` + `npm test` 통과 → 커밋 1개 → push 안 함(보리).
> 줄수·테스트 개수는 실제 실행 결과 그대로 정확히 보고(지난 두 번 오기재 있었음 — 재발 금지).

## 2. 착수 전 상태 (2026-09-05)
- `react-app` HEAD `f1d25c6` = origin/main (한 기사 차량 다중배정 금지, CI 초록·보리 `[x]`).
  미커밋 없음.
- `ubiquitous-parakeet`: 문서 갱신분 미커밋.

## 3. 작업자 구현 완료 보고

## 4. 감시관 실사
