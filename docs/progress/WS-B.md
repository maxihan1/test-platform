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
- 막힌 것: 없음. 걸린 다섯 건(러너 이미지가 낡음, 내 파일끼리 fixture 충돌,
  WS-A와 fixture 충돌, reply.type 순서, 워크트리의 WORKSTREAM)은 고쳤고 LEARNINGS에 적었다
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
- **DB fixture 접두사는 `XBS`·`XBR`·`XBQ`·`XBX`다.** `ZZ`로 시작하면 안 된다 —
  `catalog/store.test.ts`가 `DELETE FROM test_case WHERE tc_id LIKE 'ZZ%'`로 정리하면서
  다른 갈래의 fixture까지 지운다. 한 파일만 돌려서 통과하는 것은 증거가 못 된다 (LEARNINGS)
  → 2026-09-18 에 그 정리 구문은 `'ZZA%'` 로 좁혀졌고, 진짜 범인이던 `save()` 의
  비활성 범위도 서비스 접두사 안으로 제한됐다. 접두사 규칙 자체는 그대로 지킨다
- **컨테이너로 확인할 때**는 이미지를 다시 굽는다. 병합 전 이미지는 옛 `packages/kit`을 물고 있다

## 2026-09-18 — 개정 SPEC 반영 (A~K 전부)

contracts 와 WS-A 를 끝낸 세션이 이어서 돌렸다. 킥오프 A~K 열한 가지를 전부 넣었다.

| 킥오프 | 무엇 |
|-------|------|
| D·E·F | 서비스를 `tcId` 접두사에서 알아낸다(섞이면 400 `MIXED_SERVICE`). `env` 키로 `service_env` 에서 주소를 찾아 `test_run.base_url` 에 박제. `run_item` 에 `file_path`·`param_schema`·`expected_schema`·`timeout_ms` 박제 |
| B·C | `repeat` 로 회차를 1부터 만든다. 만들어질 항목이 1000건을 넘으면 400 `{ error, limit, requested }` |
| A·G·J | `POST /api/runs/:runId/abort` (이미 끝났으면 409). 부팅 직후 `RUNNING` 복구. 「러너에 닿지 못했습니다」 |
| H | Slack 알림. `notify_slack` 이 켜진 실행만, 서비스의 웹훅으로 |
| I·K | `GET /api/runs` 의 `?service=` 필수. 실행 상세에 증적 목록과 상태 |

### 확인 방법

```
curl -X POST localhost:3000/api/runs -H 'content-type: application/json' \
  -d '{"title":"확인","env":"qa","items":[{"tcId":"DEMO-001","platforms":["desktop"]}]}'
curl 'localhost:3000/api/runs?service=DEMO'        # 그 서비스의 실행만
curl 'localhost:3000/api/runs'                     # 400 SERVICE_REQUIRED
curl -X POST localhost:3000/api/runs/<끝난RUN>/abort   # 409 NOT_RUNNING
```

### 다음 세션이 알아야 할 것

- **`createRun` 은 이제 `env` 를 반드시 받는다.** 기본값을 두지 않는 이유는 §6 에 있다 —
  안 채우면 빈 칸이 아니라 **틀린 값**이 증적에 남는다
- **주소는 요청이 싣지 않는다.** `service_env` 에서 서버가 찾는다. 요청이 실으면 아무 데나 쏠 수 있다
- **닫는 UPDATE 에는 언제나 `AND finished_at IS NULL`.** `CLOSE_UNFINISHED` 한 상수로 모아 뒀다.
  중단·재기동 복구가 같은 구문을 쓴다
- **`markAborted()` 는 모듈 전역 Set 이다.** 대기줄에 이미 들어간 일은 빼낼 수 없어
  자기 차례가 왔을 때 스스로 물러나게 했다
- **Slack 은 `notify.ts` 하나다.** 본문 만들기(`본문`)와 보내기(`notifyRun`)가 갈려 있어
  본문은 DB·네트워크 없이 테스트한다
- **`PLATFORM_PUBLIC_URL` 이 새로 생겼다** (§9, 2026-09-18 승인). 비면 알림에 링크를 안 넣는다

## 2026-09-26 — 역방향: 미확정 항목을 따로 센다 (PR #76)

- 완료: `createRun` 이 `test_case.unconfirmed` 를 `run_item.unconfirmed` 에 박제 · `counts.unconfirmed` 묶음(pass·fail·na 는 확정만) ·
  `state=failed`·`allPass`·`hasFail` 확정만 · 항목 응답에 `unconfirmed` · Slack 머리·숫자 줄·실패 목록의 미확정 표기
- 미완: 없음. 화면(막대·목록 색·배지)은 WS-E — WORKSTREAMS WS-E 줄에 중간 상태의 증상을 적었다
- 막힌 것: 없음

### 다음 세션이 알아야 할 것

- **집계 규칙의 정본은 명세 도메인/실행 §3.2 「미확정 항목은 따로 센다」다.** 코드에서는 `i.unconfirmed IS NULL` 이 붙은 FILTER 가 확정이다
- `queries.ts` 가 300줄을 넘어 셋으로 갈렸다 — 거르개·머리 집계는 `runSummary.ts`, 응답 타입은 `runTypes.ts`(`queries.ts` 가 다시 내보낸다)
- 미확정 미실행은 Slack 머리에서 실패로 센다(2026-09-26 게이트 1) — 러너가 죽어 못 돈 것을 가리지 않으려고
- DB 검사 접두사는 `XBU`(`execution/unconfirmed.test.ts`)

## 2026-09-29 — 케이스마다 실행 입력값 한 벌 저장 (PR #113)

- 완료: 표 `case_input` · `PUT/DELETE /api/cases/:tcId/saved-input` · 케이스 응답 `savedInput`(비밀값은 이름만 `savedSecrets.params/expected`) ·
  `createRun` 이 요청에 없는 칸을 지금 명세로 걸러 저장값으로 채움(정기 실행 포함) · 다시 저장할 때 안 보낸 비밀값은 앞 저장값 이어받기(트랜잭션 `FOR UPDATE`) ·
  실행 조회 응답의 비밀값 가림 · 화면: 여러 건 실행 창 빈 값 버그 · 목록 줄 「저장」 · 실행 설정 「다음에도 이 값으로 채우기」·「코드 기본값으로」(두 단계) · 묶음 이름 안내
- 미완: 묶음(param-set) 응답은 여전히 비밀값 평문 · required 비밀값을 비운 채 묶음 저장은 400 (원래 동작)
- 막힌 것: 없음

### 다음 세션이 알아야 할 것

- 채우기 정본은 `execution/savedInput.ts` 의 `저장값을채운다` · 화면 쪽 같은 규칙은 `web/schema.ts` `명세에맞나`(둘 다 `validate` 한 칸씩)
- 비밀값 판단·나누기는 `web/mask.ts`(`가려야하나`·`저장값나누기`·`가린값들`)를 서버도 쓴다
- 이어받기 때문에 케이스 쓰기 권한자는 앞사람 비밀값을 다시 입력하지 않고도 다른 칸을 바꿔 저장할 수 있다 — 게이트 2 에서 그대로 두기로 했다
- DB 검사 접두사 `XCI`(`db/case-input-columns.test.ts`) · `XSI`(`execution/savedInput.test.ts`)
- `execution/queries.ts` 는 딱 300줄이다 — 더 넣으려면 먼저 나눈다

## 2026-09-30 — 케이스 테스트 실행 · 실행 화면 개선 (PR #115)
- 완료: 케이스 「테스트 실행」 — `POST /api/cases/:tcId/test-run` · `GET …/:trialId`(실행 기록 안 만듦, 결과는 메모리 24시간 · 사람당 1건 · 전체 50건) ·
  `LOCAL_RUNNER_URL`(기본 없음 → 409 `TRIAL_OFF`) · 러너 `PLATFORM_HEADED`·`HOST` · 루트 `npm run runner:local` · compose `extra_hosts` · 결과 비밀값 가림 · 요청에 없는 칸은 저장값으로 채움
- 미완: 리눅스 Docker 에서 127.0.0.1 전용 러너에 닿는지 미확인(맥 Docker Desktop 만 확인) · 사용자별 로컬 러너 등록(원격 서버용) · 시간 초과로 끝난 항목의 「러너에 닿지 못했습니다」 라벨 점검
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 진입점 `execution/trialRoutes.ts` · `execution/trial.ts`. 「내 컴퓨터」는 관리 서버와 브라우저가 같은 기계일 때만 뜻이 맞는다(SETUP §10). DB 검사 접두사 `XTR`.
  RUN 20388 의 MKT-030·032 미실행은 저장된 로그인 값이 없어서였고, RUN 20389 의 0·0·0 은 전부 미확정이라 확정 집계에서 빠진 것이었다(설계대로)

## 2026-10-02 — 실행 하나에 한 종류 (PR #131)

- 완료: 마이그레이션 `20261002000001_run_kind.sql` — `test_run.kind` `UI · FN · SCENARIO` · 기본값 `FN` · 옛 `CASE` 실행 삭제(증적 문서 → 실행 항목 → 실행)
- 완료: `execution/runKind.ts`(종류 판정 · 「케이스 실행」 조건 글자 한 자리) · `createRun` 의 `MIXED_KIND` · 목록 `?kind=` · 줄마다 `kind` · 견주기 같은 종류 · 증적 머리 「종류」(엑셀 맨 끝 칸) · 정해진 시간 실행 둘 · Grafana 네 패널
- 미완: 화면(사이드바 하위 메뉴 · 실행 기록 나누기) — #132(AUT-F3-26)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 코드에 `'CASE'` 를 다시 쓰지 않는다(`종류조건`). 로컬 DB 에 이 마이그레이션을 걸면 실행 기록이 지워진다 — DB 테스트는 임시 DB 에 마이그레이션을 전부 걸어 돌렸다(LEARNINGS 2026-10-02 PR #131)
