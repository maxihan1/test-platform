# WS-C 진행 기록 — 러너 + 테스트 킷

## 2026-09-19
- 완료: **개정 SPEC 의 WS-C 할 일 넷이 전부 닫혔다.** 이번에 만든 것은 B 하나다
  - **B 바깥에서 끊을 통로** — `POST /abort`. `historyId → 자식 프로세스` 지도를 메모리에 두고
    `killTree` 로 그룹째 끊는다. 끊긴 실행은 타임아웃과 **같은 모양**으로 돌아온다
    (200 + `NA` + `error.message: 'ABORTED'`). 모르는 `historyId` 는 `200 { aborted: false }` — 404 가 아니다
  - **A · C · D 는 이미 코드에 있었다.** 착수 때 확인하고 범위에서 뺐다 —
    `baseUrl` → `PLATFORM_BASE_URL` 전달, `retries: 0` 고정, 러너는 DB 를 모른다
- 같이 고친 것 (게이트 2 에서 사용자가 「WS-B 2건도 지금 고친다」를 골랐다)
  - `finishItem()` 에 `AND finished_at IS NULL` 이 없어 **멈춘 실행이 늦게 온 러너 응답에 `PASS` 로 덮어써졌다.**
    재현 테스트가 실제로 `PASS` 를 뱉었다. 0행이면 절차 기록도 넣지 않고 `ROLLBACK` 한다
  - `recoverRunning()` 이 DB 전체를 훑어 병렬로 돌던 다른 파일의 fixture 를 닫았다 →
    `vitest.config.ts` 에 `fileParallelism: false`. 313건 2.6초 → 314건 15.3초
- 미완: 없음
- 막힌 것: 없음
- 다음 세션이 알아야 할 것:
  - **라우트는 이제 `apps/runner/src/routes.ts` 에 있다.** `server.ts` 는 Fastify 를 만들고
    `registerRoutes(app)` 를 부르고 `listen` 만 한다. 최상위 `listen` 때문에 테스트가 못 붙던 것을 갈랐다.
    라우트 검사는 `routes.test.ts` 에서 `app.inject()` 로 한다 — 포트를 열지 않는다
  - **끊는 사유는 `running` 지도의 핸들에 붙는다.** `execute()` 의 지역 변수가 아니다 —
    `abort()` 는 바깥에서 불려서 지역 변수에 닿을 수 없다. **먼저 찍힌 사유가 이긴다**
    (제한 시간으로 죽은 것이 「사람이 끊음」으로 뒤집히면 안 된다)
  - **러너가 정상 종료했는데 `close` 전인 밀리초 창은 러너에서 안 막는다.** 막는 자리는
    admin 의 `finishItem()` 이고 이번에 가드를 붙였다
  - **테스트가 순차로 돈다.** 같은 DB 하나를 쓰는 검사 파일들이 서로 간섭해서 끊었다.
    새 테스트를 더할 때 병렬을 가정하지 않는다
  - 범위 밖 남은 것 — `docs/spec/도메인/러너.md` 끝의 `[계약 변경 필요]` 블록이
    **이미 반영이 끝난 제안**인데 아직 「필요」라고 적혀 있다. SPEC 은 3등급이라 손대지 않았다

## 2026-09-16
- 완료: 테스트 킷 런타임 전부(`defineCase` · `test()` 래퍼 · `test.step()` · `verify` · 커스텀 리포터),
  러너 `POST /execute`의 실제 결과 조립, 데모 10건 `defineCase` 전환, 단위 테스트 41건
- 확인함:
  - verify 실패 규칙 — 기본은 계속, blocker면 그 절차를 끝으로 중단(뒤 절차는 결과에 아예 없음), 절차 밖 호출은 에러, 예외는 FAIL + error
  - `@@RESULT@@` 한 줄로 `ExecuteResponse` 전달. 실패한 절차와 `capture: true` 절차에 스크린샷,
    실패 지점 줄 번호(`line`), API 절차에 `httpTrace`
  - 러너 HTTP 4경로 — 200 PASS/FAIL · 200 NA+TIMEOUT · 404 CASE_NOT_FOUND · 400 INVALID_REQUEST
  - 컨테이너(러너 이미지)에서 `/artifacts/runs/{runId}/{historyId}/{seq}.png`에 스크린샷이 실제로 쌓임
  - `PLATFORM_SCAN=1`이면 테스트가 등록되지 않음(스캐너가 이 상태로 import 한다)
  - 코드 수정 없이 `PLATFORM_PARAMS`로 기대값만 바꿔 같은 케이스를 FAIL → PASS로 뒤집음
  - 두 환경 전체 실행: 9 통과 · 3 실패(DEMO-002 의도적 · DEMO-007 제한 시간 · DEMO-009 모바일) · 8 건너뜀
- 미완: 없음
- 막힌 것: 없음. 컨테이너에서만 터진 두 건(Node 24 상대 import, 프로세스 그룹 종료)은 고쳤고 LEARNINGS에 적었다
- 다음 세션이 알아야 할 것:
  - 테스트 코드는 `@platform/kit`의 `defineCase` · `test` · `verify` 셋만 쓴다. `test.step(제목, 본문, { capture })`는 kit이 감싼 것이다
  - 러너가 자식에 넘기는 환경변수는 `PLATFORM_PARAMS`(`{params, expected}`), `PLATFORM_RUN_ID`, `PLATFORM_HISTORY_ID`다.
    앞의 둘이 없으면 스키마 기본값이 들어가므로 사람이 `npx playwright test <파일> --project=desktop`으로 바로 돌려볼 수 있다
  - 리포터는 `--reporter=packages/kit/src/runtime/reporter.ts`로 넘긴다. `playwright.config.ts`는 Phase 0 공용 골격이라 건드리지 않았다
  - **WS-A 주의**: `--list`의 사람용 출력은 케이스 위치를 kit 래퍼 파일로 표시한다.
    K8 검사는 `--list --reporter=json`의 `suites[].file`로 봐야 파일당 1건이 정확히 잡힌다
  - **WS-B 주의**: 러너는 판정을 exit code가 아니라 `@@RESULT@@` 줄에서 만든다.
    타임아웃은 200 + `NA` + `error.message = 'TIMEOUT'`이고, 선언하지 않은 환경으로 부르면 200 + `NA` + 사유 문장이다
  - JSON Schema 변환은 zod 4 내장 `z.toJSONSchema(schema, { io: 'input' })`를 쓴다. `zod-to-json-schema`는 zod 4에서 못 쓴다 (LEARNINGS)

## 2026-09-21
- 완료: **`tests/todo/` 에 서비스 케이스 4건이 들어왔다 — 데모가 아닌 케이스가 저장소에 처음 생긴 것이다.**
  `tpx-cases` 스킬(신설)이 기획서 한 장에서 만들었고 검증 관문 넷을 통과했다 (PR #37)
- 미완: 없음
- 막힌 것: 없음
- 다음 세션이 알아야 할 것:
  - **`check:tests` 건수가 11 → 15 가 됐다.** 그래서 `spec-review` **E2** 를
    「`DEMO-` 로 시작하는 것만 세어 SPEC §10 표와 대조」로 고쳤다. 안 고쳤으면
    **서비스 케이스가 한 건만 들어와도 멀쩡한 저장소에 중대 위반이 떴다**
  - **케이스를 기계가 만드는 길이 생겼다** — `.claude/skills/tpx-cases/SKILL.md`.
    기획서 → 요구사항 표(`docs/cases/<접두사>.md`) → `.spec.ts`. 만드는 동안은 **표가 정본**이고
    **게이트 2 승인 뒤부터 코드가 정본**이다 (SPEC §3.1)
  - `docs/cases/TODO-기획서.md` 는 **영구 fixture** 다. 스킬을 고칠 때마다 이걸로 다시 돌려
    함정 다섯이 그대로 걸리는지 본다. 지우지 않는다
  - **selector 는 추측하지 않는다.** `ariaSnapshot` 탐침으로 실제 화면을 읽고,
    `docs/cases/<접두사>.md` 의 용어 사전에 **화면 스냅샷 해시**를 적어 둔다 —
    다음 실행은 해시가 같으면 화면 해석을 건너뛴다
  - **`tests/todo/` 는 todomvc 대상이라 데모와 같은 공개 사이트를 쓴다.**
    `npx playwright test tests/todo --project=desktop` 으로 바로 돌려볼 수 있다.
    인자 없이 전체를 돌리면 `DEMO-002`(일부러 실패)·`DEMO-009`(모바일 실패)가 섞여 빨강이 정상값이다

## 2026-09-21 — 절차 단위 진행
- 완료: **실행이 도는 동안 「지금 몇 번째 절차를 몇 초째」가 화면에 흐른다.**
  kit 이 절차를 시작할 때 stdout 에 `@@PROGRESS@@{StepProgress}` 한 줄을 흘리고(`runtime/progress.ts`),
  **리포터의 `onStdOut` 이 워커 출력을 진짜 stdout 으로 되돌려 쓰고**(`runtime/reporter.ts`),
  러너가 줄을 모아(`apps/runner/src/progress.ts`) 자기 지도를 고쳐 쓰고 `GET /progress` 로 답한다.
  admin 이 자기 실행 것만 걸러 `GET /api/runs/:runId/progress` 로 내고 모달이 그린다.
  계약 셋(`StepProgress` · `RunningStep` · `PROGRESS_MARKER`)은 SPEC 공통/3-공유계약 §5.1 ·
  도메인/러너 §5.2 · 도메인/실행 §7 에 박혀 있다. **DB 도 마이그레이션도 없다**
- 미완: 없음
- 막힌 것: 없음
- 다음 세션이 알아야 할 것:
  - **진입점은 `packages/kit/src/runtime/progress.ts` 의 `알린다()` 다.** `step.ts` 가 절차마다 부른다
  - **★ `reporter.ts` 의 `onStdOut` 을 지우지 마라.** 지워도 **단위 검사는 전부 초록이고
    케이스도 통과한다** — 진행만 조용히 0 이 된다. Playwright 워커가 `process.stdout.write` 를
    갈아치워 IPC 로만 보내기 때문이고, vitest 에는 그 갈아치우기가 없다 (LEARNINGS 2026-09-21).
    그리고 **받은 것을 전부 되돌려 써야 한다** — 골라 쓰면 워커 stdio 가 `pipe` 로 바뀐 뒤
    `execute.ts` 가 오류 문장으로 쓰는 stdout 꼬리가 빈 문자열이 된다
  - **방향은 당김이다** (admin 이 러너에게 묻는다). 밀기(`ExecuteRequest.progressUrl`)는
    게이트 0 에서 접었다 — 러너에 로그인 세션이 없어 admin 문에 구멍을 내야 했다.
    그 계약 블록은 `docs/plans/2026-09-21-청사진스킨.md` 에 `철회됨` 으로 닫혀 있다
  - **러너는 거르지 않는다.** `GET /progress` 응답에 `runId` 도 `serviceId` 도 없다 —
    러너가 그것을 알면 §3.4 무상태가 깨진다. **경과는 러너가 자기 시계로 잰다**
  - **분모(전체 절차 수)는 만들 수 없다.** 케이스가 끝나기 전에는 Playwright 도 모른다.
    분모를 대신하는 것이 경과 시간과 제한 시간이다 (SPEC 공통/3-공유계약 §5.1)
  - **확인은 실물로 한다** — `docker compose up -d --build admin runner` 를 **둘 다** 돌린 뒤
    절차가 여럿인 케이스(`DEMO-006`)로 실행을 건다. 러너를 안 다시 빌드하면 절차 줄이 안 나온다.
    자세한 길은 `docs/WORKFLOW.md` 의 「눌러볼 길 — 「절차단위진행」 을 병합한 뒤」
## 2026-09-21 (2차)
- 완료: `tpx-cases` 를 **같은 화면에 두 번째로 돌렸다.** 1차가 「스킬이 한 번 도는가」를 봤다면
  2차는 **두 번째 실행에만 나타나는 것 셋**을 쟀다 — 스냅샷 해시 캐시 · 규칙 R9(기존 표 합치기) · 재현성
- 미완: 없음
- 막힌 것: 없음
- 다음 세션이 알아야 할 것:

  **잰 결과 셋**

  | 무엇 | 결과 |
  |---|---|
  | **캐시** | 적중. 빈 화면 sha256 이 `73d937f42658` 로 1차와 같아 그 일곱 줄을 다시 해석하지 않았다 |
  | **R9** | 더하기 10 · **바꾸기 2(`TODO-002`·`TODO-004`, 번호 유지)** · 없애기 1(마감일 `철회됨`) |
  | **재현성** | §5 한 문단이 1차 §2 와 같은 모양(「~보여 주고」·「~남기며」)이었고 **똑같이 셋으로 갈렸다** |

  **케이스가 12건이 됐다** (`TODO-001`~`TODO-012`). `check:tests` 전체 건수는 23건이다.
  `spec-review` **E2** 는 `DEMO-` 만 세므로 여기서 또 고칠 것은 없다.

  **2차가 스킬의 결함 셋을 드러냈고 전부 고쳤다.**
  ① 캐시 해시의 **알고리즘이 안 적혀 있었다** → 탐침이 `sha256` 앞 12자를 직접 찍는다
  ② 「해시가 같으면 화면 해석을 하지 않는다」가 **너무 셌다** → 사전에 없는 새 요소는 그 상태를
  따로 탐침한다고 못박았다. 캐시는 **지어내도 된다는 허가가 아니다**
  ③ **규칙 R13 신설** — `count()`·`allInnerTexts()`·`isVisible()` 은 재시도를 안 하므로
  앞에 앵커를 둔다. **`waitForURL` 은 앵커가 못 된다**

  **가장 비쌌던 실패는 빨강이 아니라 「조용히 묵은 값」이었다.** 관문 3 첫 실행 빨강 8개 중 여섯이
  「보기를 바꿨는데 한 단계 전 값을 읽은」 것이었고 **에러 메시지가 원인을 전혀 안 가리켰다.**
  자세한 것은 `docs/cases/TODO.md` 의 「이 화면에서 걸린 것」과 `docs/LEARNINGS.md` 맨 위 둘.

  **`docs/cases/TODO-기획서-2.md` 도 영구 fixture 다.** v0.3 과 함께 쓴다 — 지우지 않는다.
  v0.4 는 **변경분만 적는 개정판**이라 R9 를 거는 유일한 입력이다.
