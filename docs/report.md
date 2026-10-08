# docs/report.md — 현재 슬라이스 착수지시서

## 문구 정리 2-A — 화면에 보이는 개발 용어 (클라우드·로컬·원탭 등) `[x]`

로드맵 밖 보리 요청(2026-10-08). 전수 조사·수정안 `docs/copy-review.md` B절. 보리 결정: 말투 "~습니다", 용어 추천대로.
문구 정리 2(개발 용어)는 고칠 파일이 25개라 **2-A 화면 쪽(9개)**과 **2-B 저장·서버 쪽(16개 + 테스트 3개)**으로 나눔 — 이번은 2-A.

### 현재 상태 (코드 확인)

| 위치 | 언제 보이나 | 현재 문구 |
|---|---|---|
| `app/HydrationRetryBanner.jsx:61` | 로그인 후 서버 기록을 못 불러왔을 때 위쪽 띠 | 클라우드 데이터를 불러오지 못했습니다. 로컬 데이터로 계속 쓸 수 있어요. |
| `app/HydrationRetryBanner.jsx:63` | 띠의 [다시 시도] 누른 동안 | 재시도 중... |
| `app/HydrationRetryBanner.jsx:50·53` | 다시 시도 결과 안내 | 클라우드 데이터를 다시 불러왔습니다. / 다시 시도했지만 아직 클라우드 데이터를 불러오지 못했습니다. |
| `app/useAppSession.js:74` | 로그인 직후 일부 실패 | 로그인은 유지됐지만 클라우드 데이터를 일부 못 불러왔습니다. |
| `components/InviteRedeemModal.jsx:31` | 기사 초대 코드 연동 직후 일부 실패 | 연동은 됐지만 클라우드 데이터를 일부 못 불러왔습니다. |
| `components/drivers/EmployerLinkCard.jsx:14` | 기사 연동 해제 직후 일부 실패 | 연동은 해제됐지만 내 계정 데이터를 일부 못 불러왔습니다. |
| `components/AppSettingsPage.jsx:87`, `components/PersonalInfoPage.jsx:70` | 서버 기록을 불러오는 동안(`useHydrationLock`) 설정·개인정보 위 안내 | 클라우드 동기화 중입니다. 잠시 후 다시 시도해 주세요. |
| `components/AppSettingsBackupSection.jsx:75` | 백업 불러오기에서 엉뚱한 파일을 골랐을 때 | 파일 내용이 손상되었거나 JSON 파일이 아닙니다. |
| `components/RoutePresetEditor.jsx:36` | 자주 다니는 노선 설정 설명 | …일일운행에서 원탭으로 횟수를 기록하세요. |
| `components/day-log/FixedRouteChips.jsx:19` | 노선 버튼 묶음의 화면 읽기용 이름(눈에 안 보임) | 자주 다니는 노선 원탭 기록 |

### 목표 상태 (기대 동작)

| 위치 | 바뀐 문구 |
|---|---|
| `HydrationRetryBanner.jsx:61` | 서버에서 기록을 불러오지 못했습니다. 이 휴대폰에 있는 기록으로 계속 쓸 수 있습니다. |
| `HydrationRetryBanner.jsx:63` | 다시 시도하는 중… |
| `HydrationRetryBanner.jsx:50·53` | 기록을 다시 불러왔습니다. / 다시 시도했지만 아직 불러오지 못했습니다. |
| `useAppSession.js:74` | 로그인은 됐지만 기록 일부를 불러오지 못했습니다. |
| `InviteRedeemModal.jsx:31` | 연동은 됐지만 기록 일부를 불러오지 못했습니다. |
| `EmployerLinkCard.jsx:14` | 연동은 해제됐지만 내 기록 일부를 불러오지 못했습니다. |
| `AppSettingsPage.jsx:87`, `PersonalInfoPage.jsx:70` | 서버에서 기록을 불러오는 중입니다. 잠시 후 다시 시도해 주세요. |
| `AppSettingsBackupSection.jsx:75` | 백업 파일이 아니거나 파일이 손상되었습니다. |
| `RoutePresetEditor.jsx:36` | …일일운행에서 한 번 눌러 횟수를 기록하세요. |
| `FixedRouteChips.jsx:19` | 자주 다니는 노선 (누르면 1회 추가) |

- 동작·조건은 그대로, 문구만.

### 건드릴 파일

| 파일 | 줄 수 |
|---|---|
| `react-app/src/app/HydrationRetryBanner.jsx` | 그대로 |
| `react-app/src/app/useAppSession.js` | 그대로 |
| `react-app/src/components/InviteRedeemModal.jsx` | 그대로 |
| `react-app/src/components/drivers/EmployerLinkCard.jsx` | 그대로 |
| `react-app/src/components/AppSettingsPage.jsx` | 175 그대로 |
| `react-app/src/components/PersonalInfoPage.jsx` | 194 그대로 |
| `react-app/src/components/AppSettingsBackupSection.jsx` | 그대로 |
| `react-app/src/components/RoutePresetEditor.jsx` | 그대로 |
| `react-app/src/components/day-log/FixedRouteChips.jsx` | 그대로 |

- 9개 파일이지만 모두 문구 1~4줄 교체. AGENTS §3 "1~3개 파일"보다 많음 — 같은 종류 문구라 한 번에 보는 게 낫다고 판단, **승인 요청**.

### §6 200줄

- 9개 모두 200줄 이하, 줄 수 변화 없음.

### 안 건드릴 것 (근거)

- 저장·서버 쪽 오류 문구(`lib/*`·`domain/taxInvoices.js` — 세션·행·형식 등) — 2-B에서.
- 이 문구들을 검사하는 테스트 — 없음(`grep` "클라우드 데이터를·일부 못 불러왔·클라우드 동기화 중·JSON 파일이 아닙니다·원탭·재시도 중..." → 테스트 0건. `practiceSettings.test.js:74` describe 이름 "원탭 노선 기록"은 테스트 제목이라 그대로).
- `settingsHydrationLockNotice` id·`locked` 조건 — 그대로(문구만).

### 실패 시 처리 — **신규 레이어 없음**

- 문구만. 저장·동기화 동작 무관, 새 장치 없음(AGENTS §7). 플레이북 트리거 파일 없음(`lib/*`는 2-B).

### §8 질문 답

- 1~5 무관(표시 문구만, 권한 변경 없음).

### 테스트·확인

- 문구 교체라 새 테스트 없음. 기존 테스트 전체 통과 확인.
- AI 개발 서버: 자주 다니는 노선 설정 설명, 백업 불러오기에 엉뚱한 파일 → 안내 문구. (서버 불러오기 실패 띠·잠금 안내는 일부러 만들기 어려워 코드 확인으로 대신.)
- **보리 휴대폰 확인**: 고정 노선 설정의 "자주 다니는 노선 등록" 설명 / 앱 설정 → 백업 불러오기에서 사진 파일 등을 골라 안내 문구 보기.

### 진행 기록 (2026-10-08)

- 보리 "착수지시서 확정, 작업 진행해"(9개 파일 승인 포함). 9개 파일 문구만 교체(12줄 바뀜, 줄 수 변화 없음).
- 로컬 `npm test` 전체 통과(unit 824 + 화면 326), `tsc` 오류 0. 새 테스트 없음(지시서대로).
- AI 개발 서버(5174): 고정 노선 설정 "…일일운행에서 한 번 눌러 횟수를 기록하세요." 확인(확인 후 설정 되돌림), 앱 설정 → 백업 불러오기에 사진 파일 → 안내 "백업 파일이 아니거나 파일이 손상되었습니다." 확인. 콘솔 오류 없음. 서버 불러오기 실패 띠·잠금 안내는 코드 확인으로 대신(지시서대로).
- 코드 커밋 **react-app `545ff2f`**(push 전). 다음: 보리 push·배포 → 휴대폰 확인.
- push(보리) → CI 초록(`545ff2f`, run 37764829499) → §5 리뷰 문제 없음(범위 9개 파일 = 지시서, 문구만·새 저장 장치·타입 꼼수 없음, 모두 200줄 이하, 테스트 변경 없음, CSS 변경 없음, 기대 동작 전부 구현) → 보리 최종 `[x]` 승인(2026-10-08).
