# STATUS — 현재 상태 한눈에

> **매 세션 이 파일부터 읽는다.** "지금 어디까지 왔나"의 정본.
> 상세 이력은 `docs/audit.md`(동결, 필요할 때만 찾아봄).
> 갱신 규칙: 슬라이스 착수·완료 때마다 이 파일을 **덮어쓴다**(append 아님).
> 최종 갱신: 2026-09-03 PM 10:19

---

## 지금 하는 일
**Step 9 ① 슬라이스 C-2** — 소속기사 로그인 시 매출 화면에 "본인 차량 일지만" 표시.
- 상세(착수지시서·실사): **`docs/report.md`**
- 미커밋: `react-app` 의 `RevenuePage.jsx`, `revenue/DriverRevenueView.jsx`
- 상태: 작업자 수정 중 → 브라우저 실검증 → 커밋

## 다음 할 일 (순서대로)
1. 슬라이스 C-2 마무리·커밋
2. **Step 9 ① 슬라이스 B** — 대리작성 진입점 UI (차주가 소속기사 일지를 대신 작성)
3. **Step 9 ②** — 소속기사 로그인 화면 완성 (employerLink, RLS 신규)
   → 위 2·3이 끝나야 Step 9 전체 `[x]` 확정 가능

## 완료 (커밋·푸시됨)
- **Step 0~8**: 전부 완료·승인·푸시 (Step 8: 2026-09-02)
- **Step 9-A~D**: 차량 정산방식(매출제/월급제)·정산 UI — react-app `5d1de1f`
- **Step 9 ① 슬라이스 A**: 기사 차량 일지 서버 동기화 — `ce08638`
- **Step 9 ① 슬라이스 C**: 매출탭에 기사 차량 데이터 연동(`ownerDataHooks` 훅) — 슬라이스 D와 함께 `3d7e0c8`
- **Step 9 ① 슬라이스 D**: 매출 "기사" 탭 개별 기사 드롭다운 — `3d7e0c8`
- **Step 9 ② 슬라이스 E/F**: 소속기사 로그인/연동 + 차량 등록 모달 기사연동 목업 — `192ebe6`

## 아직 안 한 큰 것 (나중 Step)
- **Step 10**: 리포트 PDF / 알림 / 온보딩 / 고객센터
- **Step 11**: 모든 파일 200줄 강제 + JS→TS 전환
  ← **진짜 TypeScript는 여기서.** 지금은 JS + JSDoc 주석 타입.
  strict-inventory 타입 부채 약 1,333건은 Step 11 몫(지금 통과조건 아님).

## 알려진 이슈 (당장 안 고쳐도 되지만 잊으면 안 됨)
- **기사 초대 동시성(TOCTOU) 레이스**: DB 마이그레이션
  `react-app/supabase/migrations/0001_driver_links_idempotency_key.sql` 을 사용자가
  아직 Supabase에 적용 안 함. 적용 + 클라이언트 연결해야 완전히 닫힘.
- `npm run typecheck` → 현재 **0 에러**(정상).

## 저장소 상태
- **react-app**: `main` = `5c47e4f`, CI 🟢. 미커밋 2개(위 "지금 하는 일").
- **ubiquitous-parakeet**: `main` = `2449787`. 미커밋: `AGENTS.md`, `docs/audit.md`,
  `docs/report.md`, `docs/STATUS.md`(신규).

## 승인의 기준 (사용자가 승인·커밋 지시 전에 확인할 것)
1. **GitHub Actions "CI / verify" 초록** — 매 push 자동으로 `npm test` + `typecheck` + `build` 재실행.
2. **브라우저 실검증 완료** — `npm run dev`로 해당 화면 직접 조작. 사용자만 가능.
> ※ 1·2는 "승인에 필요한 증거"다. 최종 승인(=`[x]`, 커밋 지시)은 사용자의 결정 행위(AGENTS.md §1).
>   AGENTS.md §2의 감시관 교차검증 절차를 CI로 어디까지 대체·간소화할지는
>   **미결 — 사용자가 AGENTS.md에서 직접 정한다.** 이 요약본은 절차를 바꾸지 않는다.
