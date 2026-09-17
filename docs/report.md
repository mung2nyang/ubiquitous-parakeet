# docs/report.md — 현재 슬라이스

## §13(앱 설정) `[~]`

착수 승인(2026-09-17) 후 코드·테스트 완료. §5 리뷰 완료(아래).
**브라우저 실검증 대기.**

### 추가 변경 (보리 지시, 리뷰 도중, 2026-09-17)

"기사차량 운행 일지 설정" 섹션(서브차량 고정노선/운행횟수 설정,
`FixedRouteBlock scope="sub"`) 통째 삭제 — §15에서 미연동기사 관리
화면에 새로 만들 예정이라 지금 화면에 남겨둘 이유 없음(보리 확인,
공백기간 감수 결정). **영향 고지**: §15 완료 전까지 미연동 서브차량의
고정노선/운행횟수 설정을 켜고 끄거나 편집할 UI가 없음(기존 값 자체는
안 지워짐, 데이터 유실 아님). `AppSettingsPage.jsx` 136줄 → §6 여유.
`npm test` 170개 재통과·`tsc --noEmit` 0에러 확인(AI, 이 세션에서 직접
수정 후 검증).

### §5 리뷰 체크리스트 (AI, 2026-09-17)

| # | 확인 | 결과 |
|---|---|---|
| 1 범위 준수 | 지시서 파일(`AppSettingsPage.jsx`/`shared-controls.css`/`expense-form.css`) + 사전 승인된 200줄 분리(`AppSettingsBackupSection.jsx`, §6 예외) + 테스트 2개 일치. `side-menu.css`는 지시서에 없었으나 `.settings-theme-card .theme-toggle-btn`(이 화면 전용 클래스, 다른 소비처 0곳 확인) 6줄 추가로 블라스트반경 없음 — 경미한 지시서 범위 밖 추가지만 문제 없음. | 이상 없음 |
| 2 몰래 증설 | 신규 durable/큐/tombstone 없음. `AppSettingsBackupSection.jsx` 신설은 지시서 §6에 이미 명시된 분리. | 이상 없음 |
| 3 타입 꼼수 | 변경 파일 `grep -n "ts-ignore\|ts-expect-error\|: any\|as unknown as"` 0건. | 이상 없음 |
| 4 200줄 | `AppSettingsPage.jsx` 136줄, `AppSettingsBackupSection.jsx` 110줄 — 문제 없음. **다만 `shared-controls.css`가 이번 슬라이스 전에 이미 211줄(200줄 초과)이었는데, 분리설계안 없이 +75줄(→286줄) 추가됨.** 내용 자체(세그먼트 이동, 백업 버튼 스타일, `.inline-icon` 전역 규칙)는 정상이지만 절차상 §6 "기존 200줄 초과 파일 수정 시 분리설계안 먼저" 규칙을 안 거쳤음 — 보리 확인 필요(아래). | **확인 필요** |
| 5 테스트 진실성 | `AppSettingsPage.backup.test.js`: 버튼 텍스트를 실제 원본 라벨("백업 저장하기" 등)로 갱신 + "데이터 관리 (백업 / 복구)" 제목·마지막 백업 문구 assert 추가(약화 아니라 강화). `AppSettingsPage.settingsSoT.test.js`: `active-work`→`active`는 마크업 교체에 따른 정합 변경, 검증 대상(리마운트 없이 반영)은 동일. | 이상 없음 |
| 6 공용 CSS 블라스트반경 | `.settings-segmented-control`/`.toggle-btn` 전역 정의 미변경(다른 5개 소비처 무영향, `grep` 확인). `.segment-control`/`.segment-btn`은 복제가 아니라 **이동**이라 `ExpenseFormModal.jsx` 쪽도 그대로 동작(둘 다 전역 로드되는 `shared-controls.css` 기준). `.inline-icon`을 `calendar.css`와 중복 선언한 건 의도적 — 이 앱은 라우트별 코드분할(`lazyPages.js`)이 있어 앱설정 청크가 calendar 청크를 안 불러올 수 있음, 두 정의는 바이트 단위로 동일해 불일치 위험 없음. | 이상 없음 |
| 7 요구사항 충족 | A(테마 아이콘)·B(세그먼트 재사용)·C(백업 위치·문구·시각·아이콘) 지시서 목표 전부 구현 확인(코드 대조). | 이상 없음 |

**보리 확인 필요한 것 1가지**: `shared-controls.css` 200줄 초과 상태에서 분리설계안
없이 수정된 부분 — 지금처럼 넘어갈지, 별도로 분리설계안을 받을지 결정 필요
(`linked-driver.css` 343줄 때와 같은 종류의 미결 항목, `STATUS.md` 후속 nit 참고).
**→ 보리 결정(2026-09-17): 일단 둠, 지금 안 고침.**

### CSS 분리 — `app-settings.css` 신설 (보리 지시, 2026-09-17, 브라우저 검증 후)

`side-menu.css` "잔여 경계 지도" K블록(앱설정 프리셋)에 해당. §13 전용으로만
쓰이는 두 블록을 새 [app-settings.css](react-app/src/components/app-settings.css)로
이동(스타일 변경 없음, 그대로 옮김):

- `run-count-preset-*`/`fixed-route-preset-*`(171줄) — 소비처
  [RunCountChips.jsx](react-app/src/components/RunCountChips.jsx)·
  [RoutePresetEditor.jsx](react-app/src/components/RoutePresetEditor.jsx) 둘 뿐
  (`grep` 확인, 둘 다 `AppSettingsPage.jsx`에서만 렌더).
- `.settings-theme-card .theme-toggle-btn`(5줄, 이번 슬라이스에서 신설한 규칙).

`.setting-item`/`.setting-section`/`.app-settings-page`는 개인정보·거래처 등
다른 화면과 공유돼(`grep` 확인) `side-menu.css`에 그대로 유지 — 이동 안 함.
`AppSettingsPage.jsx`에 `import './app-settings.css'` 추가.

검증: `npm test` 170개 재통과·`tsc --noEmit` 0에러·`side-menu.css` 852줄(1030→852)·
`app-settings.css` 181줄. **브라우저 실측(AI, mobile 375px)**: 고정노선
On→"자주 다니는 노선 등록"(입력창 라운드 테두리 정상)·운행횟수버튼 On→
프리셋 칩(테두리·×삭제 버튼 원형 배지 정상 위치) 둘 다 스타일 그대로 렌더
확인, 콘솔 에러 없음.

### 구현 요약

| # | 기대 동작 | 상태 |
|---|---|---|
| A | 테마 버튼 해/달 SVG 아이콘 | 코드 완료 |
| B | 횟수/금액 → `.segment-control`/`.segment-btn` | 코드 완료 |
| C | 게스트 백업: 맨 아래·원본 문구·시각·아이콘 버튼 | 코드 완료 |

부가: `AppSettingsPage.jsx`가 200줄 초과 예정이라 백업 섹션을
`AppSettingsBackupSection.jsx`로 분리(§6, 지시서 허용). segment CSS는
`shared-controls.css`로 이동·`expense-form.css` 중복 삭제. 테마 아이콘
정렬용 `.settings-theme-card .theme-toggle-btn` flex만 `side-menu.css`에
좁게 추가(전역 `.theme-toggle-btn`·`.settings-segmented-control` 5곳
미변경).

`npm test` 170개 통과. 신규 durable/큐 없음.

### 브라우저 실검증 (보리)

1. 앱 설정 — 라이트=해 / 다크=달 아이콘
2. 횟수·금액이 **이어진 세그먼트** 모양(개별 테두리 없음), 전환 동작
3. 게스트: **맨 아래** "데이터 관리 (백업 / 복구)" + 설명 + 마지막
   백업 시각(또는 "아직 백업한 적 없음") + 아이콘 버튼
4. 로그인 사용자: 백업 섹션 안 보임
5. "기사차량 운행 일지 설정" 섹션 자체가 화면에서 사라졌는지 (§15로 이월,
   지금은 삭제 상태 — 의도된 변경)
6. 정비 폼 결제방식 세그먼트·세금계산서 등 segmented-control 화면
   이상 없는지(공유 클래스 안 건드림)

통과 시 커밋 초안:
`§13 앱 설정: 테마 아이콘·횟수/금액 세그먼트·게스트 백업 UI 정합`
