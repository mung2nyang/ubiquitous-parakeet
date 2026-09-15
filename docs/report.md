# docs/report.md — 현재 슬라이스 착수지시서

> **소급 기록 2/2**: 아래는 미수금 UI 복원(react-app `12a9dbb`) 구현
> 직후 실제로 `docs/report.md`에 있던 내용이다(커밋 안 된 채 워킹카피에만
> 있다가, 이 세션이 다음 슬라이스 설계안으로 덮어써서 유실 — 보리 지적,
> 2026-09-15). 이 세션의 파일 변경 알림에 찍힌 diff에서 그대로 복원.
> 다음 커밋에서 다시 "현재 슬라이스"(side-menu.css 분리설계안)로 교체.

## 미수금/정산 관리 화면 UI 불일치 수정 (보리 스크린샷, 2026-09-15) `[x]`

### 구현 (`12a9dbb`)

원인 5가지(action-icon-btn 오용·원본 버튼/탭/카드 골격 미이관·차량
평문)를 원본 `finance.js`/`style.css` `.receivable-*` 구조로 복원.

1. `receivables.css` 신규 — 탭·카드·버튼·배지·상세 액션 이식 +
   side-menu에 있던 `.receivable-*` 이동.
2. `ReceivablesListPage` — `receivable-tabs`/`receivable-group-card` 세로
   스택, 버튼 "미수금 상세"/"입금완료", 안내문구 삭제, 차량
   `management-badge car-type`.
3. `ReceivableItemCard` — compact=입금예정 카드, detail=원본
   `receivable-detail-item`+전용 버튼 클래스(action-icon-btn 제거).
4. `ReceivablesDetailPage` — 메타·전체입금 버튼을 원본 클래스로.
5. `side-menu.css` receivable 블록 삭제(1520→1421).

로컬 test 163·typecheck 통과.

### §5 리뷰

| # | 결과 |
|---|---|
| 1 범위 | 지시서 파일만(+receivables.css 신규) |
| 2 몰래 증설 | 없음(UI/CSS) |
| 3 타입 꼼수 | 없음 |
| 4 200줄 | List 128·Item 126·Detail 103. CSS 423(화면 전용 스타일 파일) |
| 5 테스트 | 163 통과 |
| 7 요구사항 | 구조·라벨·안내삭제 — 충족(보리 브라우저 실검증 완료) |

### 검증 방법 (브라우저) — 보리 실검증 완료(2026-09-15)

1. 월별 묶음 — 탭 한 컨테이너 2열, 카드 세로스택, 버튼 가로·글자 안 깨짐.
2. 라벨 "미수금 상세"/"입금완료", 안내문구 없음.
3. 서브차량 있으면 차량 배지.
4. 입금 예정 탭·미수금 상세 페이지 버튼도 깨지지 않는지.
5. 라이트/다크.

CI 초록·보리 브라우저 실검증·최종 승인 완료. (원인조사 단계의 원본
착수지시서는 앞 커밋 `c75c7b6` 참고.)
