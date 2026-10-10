# docs/report.md — 현재 슬라이스 착수지시서

## 로드맵 30 npm 의존성 취약점 정리 `[~]` — react-app `5977a61` 커밋(보리 PDF·엑셀 저장 확인 완료), 보리 push·CI 대기

보리 지시 2026-10-10 ("30번 착수지시서 작성해"). 출시 전 1단계 ③. 로드맵 메모: "`npm audit` 조사부터, 큰 버전 올림은 따로 상의".

### 현재 상태 (`npm audit` 조사 결과, 2026-10-10)
6건(높음 3·보통 2·낮음 1). 누가 끌고 오는지·사용자 휴대폰에 실제로 가는지로 나눴다.

| 묶음 | 어디서 | 사용자 앱에 들어가나 | 고칠 방법 |
|---|---|---|---|
| `source-map-js`(높음) | `vite`(빌드 도구)·`jsdom`(테스트) | 아니오 — 개발·빌드 때만 | `npm audit fix`(호환 범위 안 올림) |
| `undici`(높음) | `jsdom`(테스트) | 아니오 — 테스트 때만 | `npm audit fix` |
| `brace-expansion`(높음) | `exceljs` → `archiver` → 파일 찾기 | 아니오 — 앱은 `exceljs`의 미리 묶인 파일(`dist/exceljs.min.js`)을 쓰고, 그 안에 없음(검색 0건) | `npm audit fix` |
| `dompurify`(보통) | `html2pdf.js`(PDF 저장) | **부분** — 아래 주의 | `npm audit fix`(목록상 해결) |
| `uuid`+`exceljs`(보통 2) | `exceljs`(엑셀 저장) | 예, 하지만 문제 기능(v3/v5/v6)은 안 씀 — `exceljs`는 `v4`만 사용(`cf-rule-ext-xform.js:1`) | 유일한 방법이 `exceljs`를 4.4.0 → **3.4.0으로 내리기**(큰 변경) → **이번엔 안 함** |

**주의(dompurify):** `html2pdf.js`(0.14.0, 지금 최신)는 DOMPurify **3.3.1을 자기 파일 안에 이미 묶어서** 나온다
(`dist/html2pdf.js` 16548줄). 그래서 `npm audit fix`로 목록상 경고는 사라져도 **실제 앱에 들어가는 PDF 코드는 그대로**다.
다만 위험한 기능(`IN_PLACE`)은 쓰이지 않고(기본값 꺼짐, 31996줄은 일반 정리만), 넣는 내용도 우리 앱이 그린 보고서 화면뿐이라
외부 공격 글이 들어갈 길이 없다. `html2pdf.js` 새 버전이 나와야 근본 해결.

### 목표 상태 (기대 동작)
1. `npm audit fix`(강제 옵션 없이)로 호환 범위 안에서만 올린다 → `package-lock.json`만 바뀜, `package.json` 무변경.
2. 남는 경고: `uuid`+`exceljs` 보통 2건 — 위 이유로 그대로 둠(큰 버전 변경 금지, 로드맵 메모대로).
3. **사용자 앱에 들어가는 코드는 바뀌지 않아야 한다** — 빌드 결과를 고치기 전/후 비교해 확인.
4. 개발·테스트·빌드 도구의 취약점은 실제로 해소.

### 건드릴 파일
| 파일 | 내용 |
|---|---|
| `react-app/package-lock.json` | `npm audit fix` 결과(설치 버전 표시만) |

### 안 건드릴 것
- `package.json` — 범위 변경 없음(근거: `npm audit fix`는 지정 범위 안에서만 올림, 커밋 전 `git diff --stat`으로 확인).
- `exceljs`·`html2pdf.js` 버전 — 그대로.
- 소스 코드 전부.
- 플레이북 대상 아님(저장·동기화 코드 무변경).

### §6 200줄
- 소스 변경 없음. `package-lock.json`은 자동 생성 파일이라 해당 없음.

### 실패 시 처리
- 새 저장소·재시도·대체 장치 등 **신규 레이어 없음**.
- `npm audit fix`가 `package.json`을 바꾸거나 큰 버전을 올리려 하면 멈추고 보고.
- 검증에서 하나라도 실패하면 AGENTS §3대로 수정 착수지시서를 다시 쓴다.

### 검증
1. (AI) `npm test`·`npm run typecheck`·`npm run build` 통과.
2. (AI) 빌드 결과 비교: 고치기 전/후 `dist/` 파일 목록·크기 비교 — PDF·엑셀·앱 본체 파일이 같아야 함(다르면 무엇이 왜 다른지 보고).
3. (AI) `npm audit` 다시 실행 → `uuid`+`exceljs` 2건만 남는지.
4. (보리) 브라우저: 서류 발급에서 **PDF 저장**·**엑셀(세금계산서) 저장**이 예전처럼 되는지 한 번씩.

### 보리 확인 질문 (1개)
`html2pdf.js` 안에 묶인 옛 DOMPurify(위 "주의")를 로드맵 "후속 nit"에 **"html2pdf.js 새 버전 나오면 올리기"**로 적어 둘까요?
(AI 관찰 — 답 받기 전엔 어디에도 등재 안 함.)

### 커밋 메시지 초안
`chore: npm audit fix — 개발·빌드 도구 취약점 정리(package-lock만), exceljs의 uuid 경고는 큰 버전 변경이라 보류`

### 진행 결과 (2026-10-10)
- `npm audit fix`(강제 없음): `package-lock.json`만 바뀜(15줄 ±), `package.json` 무변경.
  brace-expansion 1.1.18→1.1.21·2.1.4→2.1.7, dompurify 3.4.14→3.4.16, source-map-js 1.2.1→1.2.2, undici 8.10.0→8.11.2.
- `npm audit`: 6건 → **`uuid`+`exceljs` 보통 2건만** 남음(계획대로 보류).
- 빌드 결과 비교: 고치기 전/후 59개 파일 **해시까지 완전히 같음** — 사용자 앱 코드 변화 없음 확인.
- `npm run typecheck` 오류 0, `npm test` 전체 통과(832 + 340).
- 보리 답 "적어놔"(2026-10-10) → `docs/roadmap.md` "후속 nit"에 html2pdf.js 항목 등재.
