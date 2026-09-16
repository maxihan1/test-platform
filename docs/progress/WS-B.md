# WS-B 진행 기록 — 실행

## 2026-09-16
- 완료: 입력값 검증기 · 실행 저장(스냅샷) · 러너 호출 · 디스패처(동시 2) ·
  실행 API 5종 · ParamSet CRUD 3종 · 스크린샷 서빙 · 케이스별 마지막 결과 일괄 조회.
  단위 테스트 71건 (DB 없는 환경에서는 50건 건너뜀)
- 확인함 (전부 **진짜 러너**로. 가짜 응답이 아니다):
  - 한 번의 실행에 5항목(DEMO-002·007·008×2환경·010)을 넣어 `POST /api/runs`가
    **0.046초**에 `runId`를 돌려주고, 뒤에서 동시 2로 돌아 `FINISHED`가 됐다
  - `DEMO-008`을 두 환경으로 고르니 `run_item` 2행. `DEMO-010`은 모바일 1행
  - `DEMO-007`을 `timeoutMs: 5000`으로 주니 **5021ms**에 `NA` + `TIMEOUT`.
    러너가 먼저 끊어 부분 결과가 남는다 (HTTP 제한 시간은 timeoutMs + 30초)
  - `DEMO-002`(의도적 실패)의 상세에 절차 2건 · 검증 문장("목록에 보이는 할 일 개수가
    기대와 같다  기대 2  실제 1") · 실패 줄 26 · 스크린샷 경로가 전부 들어왔다
  - `GET /api/screenshots/123/161/2.png` → 공유 볼륨의 1280×720 PNG 32KB를 그대로 서빙
  - 선언하지 않은 환경(`DEMO-001`을 모바일로)은 200 + `NA` + "DEMO-001은 모바일 환경을
    선언하지 않았다". 그 항목만 NA로 접히고 나머지는 계속 돈다
  - **코드를 고치지 않고 입력값만 바꿔** DEMO-003을 다시 실행 → PASS. `run_item.params`에
    바꾼 값이 스냅샷으로 남았다
  - ParamSet 저장 전 검증이 칸별 사유를 돌려준다 — "글 제목(title)은 비워 둘 수 없다",
    "작성자 번호(userId)은 숫자여야 한다", "typo은 이 케이스에 선언되지 않은 칸이다"
- 미완: 없음
- 막힌 것: 없음. 걸린 네 건(러너 이미지가 낡음, 테스트 fixture 접두사 충돌,
  reply.type 순서, 워크트리의 WORKSTREAM)은 고쳤고 LEARNINGS에 적었다
- SPEC 검사: `docs/reviews/2026-09-16-WS-B.md` — 치명 0 · 중대 0 · 경미 0 (자기검사)

### 사용자 승인을 받고 SPEC §7에 없던 것을 3개 넣었다 — SPEC 반영 완료

승인받아 구현한 뒤 **SPEC §7·§7.1·§8.1에 반영했다.** 문서와 코드가 어긋난 곳은 없다.

| 무엇 | 모양 | 왜 |
|------|------|-----|
| `GET /api/runs/last-by-case` | `{ items: [{ tcId, platform, status, historyId, runId, durationMs, finishedAt }] }` | 목록 화면이 케이스마다 이력을 또 부르지 않게 |
| `POST /api/runs`의 `triggeredBy` | 선택. 없으면 `'admin'` | `test_run.triggered_by`가 NOT NULL |
| `items[]`의 `timeoutMs` | 선택. 없으면 300000 | SPEC §10이 DEMO-007을 5초로 확인하라고 적고 있다 |

### 다음 세션이 알아야 할 것

- **진입점**: 실행 생성·결과 되쓰기는 `store.ts`, 러너 호출은 `runner.ts`,
  동시성 대기줄은 `dispatcher.ts`, 실행 축 조회는 `queries.ts`, 케이스 축 조회는 `history.ts`,
  입력값 묶음은 `paramSets.ts`, HTTP는 `routes.ts`뿐이다
- **동시 2는 실행 묶음마다가 아니라 서버 전체다.** `dispatcher.ts`의 대기줄이 모듈 전역이다.
  실행 묶음마다 2개씩 돌면 두 사람이 동시에 누를 때 4개가 된다 (대상 서버는 2코어)
- **`POST /api/runs`는 기다리지 않는다.** `{ runId }`를 바로 주고 뒤에서 돈다.
  끝났는지는 `GET /api/runs/:runId`의 `status`가 `FINISHED`인지로 본다.
  `counts.running`이 0이 아닌 채 멈춰 있으면 admin이 도중에 죽은 것이다 (되살리는 장치 없음)
- **판정은 러너가 만든다.** exit code로 다시 계산하지 않는다.
  `runner.ts`는 200이면 응답을 그대로 싣고, 400·404·500·연결 실패만 NA로 접는다
- **카탈로그 코드를 import 하지 않는다.** `tc_name`·`precondition`·`file_path`·스키마는
  전부 `test_case`에서 SQL로 읽는다 (컨텍스트 경계)
- **DB가 필요한 테스트는 `describe.skipIf(DATABASE_URL 없음)`이다.** 손으로 돌릴 때는
  `DATABASE_URL='postgres://platform:platform@localhost:5433/platform' npx vitest run apps/admin/src/execution/`
- **DB fixture 접두사는 파일마다 다르다** (`ZZBS`·`ZZBR`·`ZZBQ`·`ZZBX`). 한 파일만 돌려서
  통과하는 것은 증거가 못 된다 (LEARNINGS)
- **컨테이너로 확인할 때**는 이미지를 다시 굽는다. 병합 전 이미지는 옛 `packages/kit`을 물고 있다
