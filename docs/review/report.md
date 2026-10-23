# 전체 코드 리뷰 보고서 (2026-10-23)

모듈 20개를 따로 리뷰했고 발견마다 반박 검증을 붙였다. 반박되지 않은 발견만 심각도순으로 적는다. 코드는 고치지 않았다.

- **기준 커밋**: `e57f4e2c` (PR #397 병합 직후). 줄 번호는 이 커밋 기준이라 지금 main 과 몇 줄 어긋날 수 있다
- **규모**: 리뷰 에이전트 20개가 발견 79건을 냈다. 검증 에이전트 91개 가운데 11개가 반박했고 80개는 반박하지 못했다
- **판정 규칙**: high · critical 발견은 코드 대조와 재현 두 갈래로, 나머지는 코드 대조 한 갈래로 검증했다. 한 갈래라도 반박하지 못하면 살렸다. 심각도는 검증이 고친 값(`adjusted_severity`)을 따른다
- **합친 것**: 같은 문제를 여러 모듈이 낸 4묶음(9건)을 하나씩으로 합쳤다. 그래서 살아남은 69건이 **64건**이 됐다 — high 6 · medium 19 · low 39
- **원자료**: `~/.claude/plans/full-code-review-results.json` (리뷰 · 검증 출력 원문)

「검증 방법」 칸의 뜻은 이렇다.
- **재현** — 검증 에이전트가 저장소 밖 임시 폴더에 스크립트나 테스트를 만들어 실제 함수를 돌려 봤다
- **코드** — 호출 경로를 코드로 끝까지 따라가 판정했다(DB · docker 가 필요한 검사는 이 맥에 부하를 주지 않으려고 돌리지 않았다)

| 모듈 | 읽은 파일 | 발견 | 모듈 | 읽은 파일 | 발견 |
|---|---|---|---|---|---|
| sec-isolation | 52 | 4 | server-auth | 35 | 4 |
| sec-secrets-auth | 78 | 3 | server-authoring | 33 | 2 |
| server-execution | 27 | 4 | server-catalog | 31 | 4 |
| server-scenario | 16 | 4 | server-perf | 40 | 4 |
| server-prd-reporting | 42 | 0 | db | 53 | 2 |
| runner | 29 | 7 | kit | 22 | 3 |
| perf-agent-infra | 19 | 7 | harness | 16 | 5 |
| scripts-1 | 42 | 1 | scripts-2 | 55 | 2 |
| web-1 | 50 | 5 | web-2 | 64 | 6 |
| web-3 | 92 | 7 | web-4 | 139 | 5 |

---

## High — 6건

### H1. 작성 뿌리 잠금 안에서 풀 연결을 또 잡아, 동시 요청 10건이면 admin 전체가 멈춘다
- **위치**: `apps/admin/src/authoring/held-routes.ts:132` (같은 꼴: `held-routes.ts:151` · `authoring/routes.ts:196` · `:290` · `agentRoutes.ts:236`) — server-authoring
- **문제**: `뿌리잠그고`(history.ts:129-143)는 풀에서 연결 하나를 꺼내 BEGIN 과 advisory lock 을 건 채 콜백을 돈다. 그런데 이 다섯 곳의 콜백은 받은 `손` 을 쓰지 않고 `(await db()).query` 로 풀을 다시 부른다. 풀은 `new Pool({ connectionString })`(db/index.ts:11)이라 최대 10개이고 연결 대기 시간 제한이 없다. 잠금을 쥔 요청이 10개 겹치면 각자 연결 하나를 쥔 채 11번째를 끝없이 기다린다. 없는 요청 번호(`PUT /api/authoring/requests/999999/held/XYZ-001`)도 문을 지나가므로 작성 쓰기 권한만 있으면 일으킬 수 있다
- **검증 근거**: 두 갈래 모두 반박하지 못했다. 진짜 `보류통로` 를 Fastify 에 붙이고 pg.Pool 만 「진짜 pg-pool + 가짜 Client」로 바꿔 동시 요청 10개를 보내자 모든 요청이 멈췄다. 풀이 차도 풀어 줄 장치(타임아웃 · 오류 처리)가 없다
- **검증 방법**: 재현 2

### H2. 병합된 AI 작성 케이스를 admin 프로세스가 직접 import 해 최상위 코드를 그대로 실행한다
- **위치**: `apps/admin/src/catalog/scanner.ts:50` — sec-isolation · server-catalog 가 같이 냄
- **문제**: `scan()` 은 `tests/<서비스>` 의 모든 `.spec.ts` 를 admin 프로세스 안에서 `await import()` 한다. 파일 최상위 문장과 그 파일이 가져오는 Page Object · helpers 의 최상위 문장이 `DATABASE_URL`(postgres 슈퍼유저) · `SESSION_SECRET` · `AUTH_CLIENT_SECRET` 을 쥔 admin 권한으로 돈다. 작성 에이전트는 같은 파일을 「import 하면 실행된다」며 빈 환경의 하위 프로세스에서만 읽는데(authoring-held.ts:82-91), admin 은 그 격리 없이 부른다. K 규칙도 막지 못한다 — import 허용 목록(`importRule`)은 케이스가 아닌 파일에만 걸리고, 케이스 파일에는 K7 · K15 만 걸린다. 병합 뒤 훑기(agentRoutes.ts:252)가 이 길을 자동으로 연다
- **검증 근거**: 네 갈래 모두 반박하지 못했다. 실제 `scan()` 을 가짜 비밀값을 넣은 환경에서 돌리자 정상 `defineCase` 옆에 둔 최상위 한 줄(`fetch` + `node:child_process`)이 스캔 중에 실행됐고 env 전체가 로컬 수신 서버로 넘어왔다. 스캔 결과는 「케이스 1건 · 실패 0」이라 겉으로는 멀쩡했고, `checkSource` · `checkSpec` 도 위반 0건이었다. `node:fs` 로 `SESSION_SECRET` 을 파일에 쓰는 케이스도 위반 0건으로 통과했다
- **검증 방법**: 재현 3 · 코드 1

### H3. 절차 기록에 jsonb 가 못 받는 글자가 섞이면 항목 결과가 통째로 사라지고 실행이 RUNNING 에 남는다
- **위치**: `apps/admin/src/execution/runLifecycle.ts:78` — server-execution
- **문제**: `finishItem` 은 러너가 준 `assertions` · `http_trace` · `error` · `shape_checks` 를 `JSON.stringify` 그대로 jsonb 칸에 넣는다. PostgreSQL jsonb 는 `\u0000` 과 짝 없는 서로게이트(`\ud83d`)를 거절한다. kit 은 응답 본문을 `response.text().slice(0, 2000)` 으로 자르므로 바이너리 응답(xlsx · PNG)의 0x00 과 2000자 경계에 걸린 이모지 반쪽이 그대로 실린다. INSERT 하나가 깨지면 트랜잭션 전체가 ROLLBACK 되어 판정과 절차가 다 사라지고, dispatcher 는 로그만 남겨 그 항목의 `finished_at` 이 영원히 NULL 이다
- **검증 근거**: 두 갈래 모두 반박하지 못했다. 진짜 kit `traced()` · runner `parseResult` 를 import 해 실제 xlsx 바이트를 넣자 `runLifecycle.ts:28` 의 `http_trace` 값에 `\u0000` 이스케이프가 실렸다. 이모지가 2000자 경계에 걸린 응답은 `\ud83d` 가 실렸다. kit → 리포터 → 러너 → admin 사이에 이 글자를 지우는 마디가 없다. PostgreSQL 거절은 DB 를 띄우지 않고 문서 근거로 판정했다
- **검증 방법**: 재현 2

### H4. grafana_ro 가 run_item 을 표 통째로 읽어, 실행 입력값에 든 비밀번호 원문이 대시보드 권한자 누구에게나 열린다
- **위치**: `db/migrations/20260917000001_service_user_snapshot.sql:104` — db · sec-secrets-auth 가 같이 냄
- **문제**: 이 마이그레이션은 `GRANT SELECT ON test_run, run_item TO grafana_ro` 로 run_item 을 칸 제한 없이 연다. run_item.params · expected 에는 비밀값이 평문으로 박제된다. 앱은 화면과 응답에서만 `********` 로 가린다. 2026-10-12(PRD-F9-01)부터는 `createRun` 이 대상 서버 줄의 `login_password` · `role_accounts` 비밀번호(운영 줄 포함)를 params 에 채운다. service_env 를 grafana_ro 에 주지 않은 설계가 이 사본 때문에 뚫린다. `/grafana/**` 문은 로그인과 `perm_dashboard='read'` 만 보므로, 프로젝트 권한이 없는 member 도 `POST /grafana/api/ds/query` 로 `SELECT params FROM run_item` 을 보낼 수 있다
- **검증 근거**: 네 갈래 모두 반박하지 못했다. 실제 `createRun` 을 가짜 DB 연결로 돌리자 run_item INSERT 의 params 에 `login_password` · 역할 계정 비밀번호 · secret 칸(`apiToken`) 원문이 실렸다. 저장소의 `accountFill.test.ts` 도 `'pw-member'` · `'pw-live'`(운영 줄) 원문이 들어가는 것을 기대값으로 단언한다. run_item 권한을 거두는 REVOKE · 칸 단위 권한 · RLS 는 어느 마이그레이션에도 없다
- **검증 방법**: 재현 2 · 코드 2

### H5. AI 작성 케이스를 돌리는 러너가 postgres 와 같은 망에 있고, DB 슈퍼유저 비밀번호가 고정값이다
- **위치**: `docker-compose.yml:99` (postgres 망 `:24`) — sec-isolation · runner · perf-agent-infra 가 같이 냄
- **문제**: runner 에는 `networks` 키가 없어 default 망에 붙고 postgres 도 default 에 있다. 계정은 compose 에 박힌 슈퍼유저 `platform/platform` 이다. 러너 이미지는 루트 `npm ci` 로 `pg` 를 깔고 `/node_modules` 링크를 걸어 `/tests` 의 케이스가 `pg` 를 바로 가져올 수 있다. 러너는 DB 를 쓰지 않는데 길이 열려 있다. 같은 compose 가 author · perf-agent · grafana 는 「postgres 에 못 닿게」 망을 갈라 두었고, AI 가 쓴 코드를 실제로 실행하는 러너만 남았다. 케이스 한 줄 `new (require('pg').Client)('postgres://platform:platform@postgres:5432/platform')` 로 app_user · service_env 를 읽거나 고칠 수 있다
- **검증 근거**: 여섯 갈래 모두 반박하지 못했다(perf-agent-infra 쪽 코드 갈래 하나만 medium 으로 낮췄다). 저장소의 `checkSource` · `checkNonCase` 를 그대로 불러 보니 케이스 파일에 `import pg` · `import node:net` 을 넣어도 위반 0건이었다. compose 를 YAML 로 읽자 runner `["default"]`, postgres `["default","dashboard"]` 였다. db/init 은 pg_hba 를 건드리지 않아 공식 이미지 기본값(어느 주소든 비밀번호 접속)이 그대로다
- **검증 방법**: 재현 3 · 코드 3

### H6. 이어서 작성 때 root 가 앞 자식이 심은 링크를 따라 자료 파일을 쓴다
- **위치**: `scripts/authoring-run.ts:178` — sec-isolation · scripts-2 가 같이 냄
- **문제**: 멈춘(STOPPED) 작성은 작업 폴더를 남기고, 이어서 작성은 그 폴더를 `renameSync` 로 넘겨받는다. 자료 폴더는 앞 자식 uid 소유 0700 그대로 남고 `chown -hR` 은 링크를 링크째 둔다. 그 뒤 root 가 `writeFileSync(c.받을자리, 답.몸, { mode: 0o644 })` 로 자료를 쓰는데 `rmSync` 도 flag `'wx'` 도 없어 링크를 따라간다. 받을자리 이름(`<자료 번호><확장자>`)은 앞 자식이 프롬프트에서 본 그 이름이다. 같은 위험 때문에 `authoring-prd-io.ts:87-89` · `authoring-ledger-io.ts:42-43` · `authoring-screens-keep-io.ts:45-46` 은 먼저 지우고 `'wx'` 로 쓰는데 이 자리만 빠졌다. `/repo` 는 호스트 저장소를 쓰기로 붙인 마운트라 `/repo/.git/hooks/post-merge` 같은 파일까지 덮을 수 있다
- **검증 근거**: 네 갈래 모두 반박하지 못했다. 저장소의 실제 `자료계획` · `자료목록글` · `넘겨받기명령` · `잠그기명령` 을 import 해 1회차에 링크를 심고 폴더를 넘긴 뒤 같은 `writeFileSync` 를 치자 트리 밖 파일이 덮였다. STOPPED 는 자식이 마음대로 만들 수 있다 — `out/prd.json` 을 안 쓰거나 tests · docs 밖 파일을 고치면 올리기 거절로 STOPPED 가 된다. guard 훅은 `ln -sf` 를 막지 않는다
- **검증 방법**: 재현 2 · 코드 2

---

## Medium — 19건

### M1. 스캔마다 케이스 파일 전부를 새 URL(`?scan=N`)로 import 해 ESM 모듈 캐시가 끝없이 커진다
- **위치**: `apps/admin/src/catalog/scanner.ts:50` — server-catalog
- **문제**: 같은 프로세스에서 새 내용을 읽으려고 두 번째 스캔부터 `${url}?scan=${gen}` 으로 import 한다. Node ESM 로더는 URL 마다 모듈을 캐시하고 지우는 API 가 없다. 스캔 한 번에 그 서비스 케이스 수만큼(MKT 약 1,100개) 모듈 레코드(tsx 변환 원문 · 소스맵 · spec 객체 · zod 스키마)가 쌓여 admin 이 꺼질 때까지 남는다. `POST /api/catalog/scan` 은 cases write 만 있으면 부를 수 있고 동시 실행을 막는 장치도 없다. 힙 한도를 넘으면 admin 이 죽고 메모리에만 있던 실행 대기열도 사라진다
- **검증 근거**: 반박하지 못했다(크기만 medium 으로 고쳤다). `scanner.ts:50` 과 같은 import 를 하는 스크립트를 `node --expose-gc --import tsx` 로 `tests/mku` 에 여러 번 돌리자 스캔마다 힙이 늘고 gc 뒤에도 줄지 않았다
- **검증 방법**: 재현 1
- **참고**: 원자료에서는 이 발견이 H2 와 같은 검증 이름표(`server-catalog:scanner.ts:50`)를 써서 H2 의 high 판정이 섞여 들어갔다. 이 발견을 직접 본 검증은 medium 이라 그 값을 따랐다

### M2. 사람 PR 에서 비밀값 이름 검사 · 증적 형식 검사 · 보류 케이스 검사가 어디서도 안 돈다
- **위치**: `.claude/hooks/pre-push:117` — harness
- **문제**: `ci.yml` 은 「사람 PR 은 맥의 pre-push 가 같은 검사를 이미 돌린다」고 적고 `author-` 브랜치에서만 돈다. 그런데 pre-push 에는 `check:secret-names` 가 없고, `check:tests` 를 `--no-held` 없이 돌린다. `check-evidence-formats.test.mjs` 는 `.claude/` 가 바뀐 push 에서만 돈다. 예를 들어 `collect.ts` 의 SECRET_NAMES 에만 `'otp'` 를 더하는 사람 PR 은 다섯 목록이 어긋나도 그대로 들어간다
- **검증 근거**: 반박하지 못했다. pre-push 의 모든 차선(79-117행)과 `check:workflow` · `test:always` · vitest 어디에도 다섯 목록을 견주는 검사가 없다. 각 목록은 export 되지 않아 견줄 방법도 없다
- **검증 방법**: 코드 1

### M3. API 문서 `$ref` 풀기 예산이 참조 개수만 세서, 큰 스키마를 여러 번 가리키는 문서 하나로 admin 이 메모리 초과로 죽는다
- **위치**: `apps/admin/src/apidoc/doc.ts:62` — server-catalog
- **문제**: 풀기는 `$ref` 를 만날 때마다 대상 하위 트리를 통째로 복사한다(`v.map` · `Object.fromEntries`). 예산 20,000 은 펼친 참조 개수만 세고 복사 크기는 안 센다. 큰 스키마 하나를 2만 번 가리키는 1~2MB 문서도 업로드(상한 5MB)를 통과하고, 커버리지 · 버전 비교 · 다시 작성이 펼칠 때 20,000 × (대상 크기)를 동기로 할당한다
- **검증 근거**: 반박하지 못했다. `문서읽기`(doc.ts:11-25)는 JSON · openapi 3.x · `\u0000` 만 보고 1.2MB 업로드는 201 로 들어간다. 줄인 크기로 재현하자 펼친 결과가 min(참조 수, 20000) × 대상 칸 수에 비례했다. 화면(ApiDocs.tsx:56 · 60)은 버전이 있으면 열자마자 커버리지와 비교를 부르고 버전을 지우는 코드가 없어, 한 번 저장되면 그 화면을 열 때마다 다시 죽는다(admin 은 `mem_limit` 없이 `restart: unless-stopped`)
- **검증 방법**: 재현 1

### M4. 스크린샷 · 디바이스 팜 증적 통로가 공유 볼륨 안 심볼릭 링크를 따라가 admin 컨테이너의 아무 파일이나 내준다
- **위치**: `apps/admin/src/execution/routes.ts:250` — server-execution
- **문제**: 스크린샷 통로는 「경로를 정수로만 조립해 볼륨 밖으로 못 나간다」고 적었지만 `readFile` 이 링크를 따라간다. 팜 통로의 `stat` · `sendFile` 도 같다. 링크 대상은 읽는 쪽, 곧 admin 컨테이너에서 풀린다. 볼륨에 쓰는 쪽은 러너의 테스트 코드(root)라 링크를 막는 장치가 없다. 케이스가 `fs.symlinkSync('/proc/self/environ', '/artifacts/runs/<R>/<H>/1.png')` 를 만들면 그 실행을 읽을 수 있는 사람이 `GET /api/screenshots/R/H/1.png` 로 admin 의 env 를 받는다
- **검증 근거**: 반박하지 못했다. admin 과 runner 가 같은 artifacts 볼륨을 쓰고(compose:94 · :116), 러너 자식은 `PLATFORM_ARTIFACTS_DIR` · `RUN_ID` · `HISTORY_ID` 를 받아 그 폴더를 직접 만든다. `routes.ts:242-250` 은 `lstat` · `realpath` 확인 없이 `readFile` 하고, 팜 통로가 쓰는 `@fastify/send` 에도 링크를 막는 코드가 없다. 두 컨테이너 다 root 라 `/proc/self/environ` 이 읽힌다. 남은 문은 「실행 읽기」 권한 하나다
- **검증 방법**: 재현 1

### M5. 녹화 가리기가 폼 인코딩된 비밀번호(`!` · 공백 등)를 놓쳐 AI 재료와 녹화 파일에 그대로 남는다
- **위치**: `apps/admin/src/perf/har.ts:134` — server-perf
- **문제**: `가림표()` 는 비밀값마다 `encodeURIComponent` 꼴 하나만 더한다. 브라우저 폼 전송과 `URLSearchParams` 는 `!` `'` `(` `)` `~` 를 `%21` 처럼 바꾸고 공백을 `+` 로 바꾸는데 `encodeURIComponent` 는 이 글자들을 그대로 둔다. 비밀번호가 `Qwer1234!` 인 HTML 폼 로그인을 녹화하면 HAR 본문의 `Qwer1234%21` 이 가려지지 않는다
- **검증 근거**: 반박하지 못했다. 녹화는 `recordHar` 를 `content:'embed'` 로 켜고 Playwright 1.63 은 본문 원문을 `postData.text` 에 넣는다. 실제 `har.ts` 함수에 폼 본문을 넣자 비밀번호가 그대로 남았다
- **검증 방법**: 재현 1

### M6. 번호 겹침을 고른 뒤 반영이 끝나면 작성 상세가 옛 번호로 「바로 실행」과 케이스 고리를 만든다
- **위치**: `apps/admin/src/web/AuthoringDetail.tsx:119` — web-1
- **문제**: 반영이 성공하면 서버는 겹침 목록을 더 싣지 않는다(최근 반영이 FAILED 일 때만 싣는다). 그래서 화면은 작성 시점 번호(`result.cases`)를 그대로 쓴다. 「둘 다 유지」를 고르면 새 케이스는 반영 때 새 번호를 받고, 「새 케이스 제외」를 고르면 파일째 지워진다. 어느 쪽이든 옛 번호는 main 에 이미 있던 다른 케이스다. 예: 새 케이스 MKT-FN-001 이 MKT-FN-014 로 들어갔는데 상세의 고리와 「바로 실행」은 기존 MKT-FN-001(로그인 성공)을 가리킨다
- **검증 근거**: 반박하지 못했다. `routes.ts:260-262` 의 `겹침상세` · `행케이스`, `최근겹침` 의 FAILED 조건, 화면의 `뺀번호` 처리를 차례로 따라가 장면이 그대로 성립했다
- **검증 방법**: 코드 1

### M7. 반영 행이 최신 실행이 되면 「산출물」 내려받기 고리가 반영 행 번호로 만들어져 404 가 난다
- **위치**: `apps/admin/src/web/AuthoringDetail.tsx:295` — web-1
- **문제**: 산출물 목록은 작성 실행의 자료(`작성.assets`)인데 고리는 최신 실행 번호 `data.id` 로 만든다. 최신 실행이 반영(MERGE)이면 두 번호가 다르고, 서버는 요청 번호와 자료 번호가 둘 다 맞아야 파일을 준다. 반영이 선 뒤에는 「표시한 기획서 내려받기」 단추도 안 그려져 산출물을 받을 길이 사라진다
- **검증 근거**: 반박하지 못했다. `버튼번호` · `작성번호` 를 고르는 47-58행과 97행 Loading 검사가 `data.id` 를 반영 행 번호로 굳히는 것을 따라갔다
- **검증 방법**: 코드 1

### M8. 가이드 저장이 GUIDE_STALE 로 거절된 뒤 다시 저장하면 손대지 않은 구획까지 옛 글로 덮는다
- **위치**: `apps/admin/src/web/Guide.tsx:114` — web-2
- **문제**: 글 칸을 처음 고칠 때 `on글` 이 세 구획(intro · policy · rules)을 통째로 초안에 복사한다. 다른 사람이 먼저 저장해 GUIDE_STALE 이 나면 화면은 버전만 다시 읽고 초안은 그대로 둔다. 화면은 `글 = 초안 ?? now` 라서 다른 사람이 바꾼 구획의 새 글이 어디에도 안 보인다. 안내대로 다시 저장하면 새 버전 번호를 기준 삼아 초안 세 구획을 다 보내 다른 사람의 고침을 조용히 지운다
- **검증 근거**: 반박하지 못했다. 초안을 비우는 곳은 저장 성공 뒤(57행) 한 곳뿐이고, GUIDE_STALE 때는 `판.reload()` 만 부른다
- **검증 방법**: 코드 1

### M9. `use주소조건` 이 같은 화면 안의 조건 다른 고리를 옛 조건으로 되돌려 「RUN N에서 통과/실패」 꼬리표가 아무 일도 안 한다
- **위치**: `apps/admin/src/web/leaveGuard.tsx:85` — web-2
- **문제**: hashchange 듣개는 새 주소가 같은 화면이기만 하면 `맞춘다()` 를 불러, 조건 글자가 다르면 무조건 화면이 들고 있던 옛 조건을 다시 적는다. 70행 주석은 「조건 없는 주소(메뉴를 다시 누름)」일 때만 되돌린다고 적었지만 코드는 새 주소에 조건이 있는지 안 본다. RunList 는 조건을 마운트 때 한 번만 읽으므로 `#/runs/fn?run=129` 의 결과 칸에서 「RUN 130에서 통과」(`?run=130&tc=…`)를 눌러도 129 로 되돌아간다
- **검증 근거**: 반박하지 못했다. 고리는 평범한 `<a>` 이고 클릭을 가로채는 곳이 없다. leaveGuard.tsx:78-86 과 route.ts:82 를 떼어 재현하자 주소가 옛 조건으로 돌아갔다
- **검증 방법**: 재현 1

### M10. PRD 관리에서 검색어를 지우면 검색으로 펴진 묶음이 접히면서 고치던 요구 내용이 묻지 않고 사라진다
- **위치**: `apps/admin/src/web/PrdList.tsx:70` — web-3
- **문제**: 묶음이 열렸는지는 `찾는말 !== '' || 연묶음.has(feature)` 로 정한다. 검색 중에는 맞은 묶음이 다 펴지지만 `연묶음` 에는 안 들어간다. 그 상태에서 「고치기」로 글을 고치다 검색칸을 비우면 묶음이 접히며 `PrdItemForm` 이 언마운트된다. 검색칸 onChange 는 `setQ` 만 불러 `떠나기상자` 가 물어볼 기회가 없다. 명세(공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)와 어긋난다
- **검증 근거**: 반박하지 못했다. 46 · 70 · 88 · 126행을 따라간 뒤 재현 테스트에서 고친 글이 사라졌다
- **검증 방법**: 재현 1

### M11. 시나리오 단계 순서를 바꾸거나 빼도 API 호출 단계의 값 주입 번호(`fromSeq`)는 그대로 남는다
- **위치**: `apps/admin/src/web/scenarioView.ts:179` — web-4
- **문제**: `다시가리킴()` 은 `kind === 'case'` 단계의 links 만 새 번호로 고친다. API 호출 단계(`kind: 'api'`)의 `values[].value.fromSeq` 는 `순서바꾸기()` · `빼기()` 가 건드리지 않는다. 빈 가리킴을 잡는 `가리킴빈곳()` 도 case 단계만 봐서 저장 · 시험 실행 전 검사가 놓친다. 예: [1 주문 생성, 2 장바구니, 3 api ← 1번 응답 id] 에서 2번을 위로 올리면 3번은 여전히 1번(이제 장바구니)을 가리킨다
- **검증 근거**: 반박하지 못했다. `scenarioView.ts:169-216` 원문을 떼어 재현 코드를 붙여 돌리자 `fromSeq` 가 바뀌지 않았다. 화면의 ↑ · ↓ · ✕ 는 결과를 그대로 `set단계들` 에 넣는다
- **검증 방법**: 재현 1

### M12. 더미 클라이언트 zip 받기가 startAt 을 넘기면 30초 뒤 AGENT_LOST 로 끊기고, 짧아도 실행 시간과 가상 사용자 수가 어긋난다
- **위치**: `apps/perf-agent/src/dummy.ts:67` — perf-agent-infra
- **문제**: 에이전트는 일을 받은 다음에야 zip(최대 200MB)을 받고 푼다. 그동안 1초 숫자를 하나도 안 보낸다. 서버는 startAt 을 일 생성 +5초로 잡고 claim 때 `heard` 를 startAt 으로 둔 뒤, 30초 동안 숫자가 없으면 AGENT_LOST 로 끊는다. 받기가 끝나면 `pumpSeconds` 가 지난 초를 한꺼번에 채워 보낸다
- **검증 근거**: 반박하지 못했다. 30초마다 가는 hello 는 `heard` 를 고치지 않는다(`heard` 를 고치는 곳은 engine.ts:129 · :160 둘뿐). 가짜 서버로 zip 을 7초 늦게 보내자 첫 숫자가 startAt + 6.5초에 나갔고 sec 0~4 가 「요청 0」으로 한꺼번에 들어갔다
- **검증 방법**: 재현 1

### M13. 기기 성능 읽기가 간격보다 길어 틱을 건너뛰면 gfxinfo FPS 가 2배 · 3배로 찍힌다
- **위치**: `apps/runner/src/perfRead.ts:96` — runner
- **문제**: 기록기는 앞 읽기가 안 끝났으면 그 틱을 건너뛴다(perfDevice.ts:54). 한 줄 읽기는 `dumpsys meminfo` 를 포함한 adb 명령 넷을 다 기다려 1초를 넘기기 쉽다. 그런데 FPS 는 쌓인 프레임 수를 실제 경과 시간이 아니라 간격 한 칸으로 나눈다. 60fps 앱에서 meminfo 가 1.3초 걸리면 줄마다 fps 120 이 남는다
- **검증 근거**: 반박하지 못했다. 건너뛰기는 작성자도 주석(64행 · perfRead.ts:115)과 명세(러너.md:541)에 「일어나는 일」로 적어 두었다. 실제 기록기를 가짜 adb 로 돌리자 2배 FPS 가 나왔다
- **검증 방법**: 재현 1

### M14. 게임(SurfaceFlinger) FPS 가 간격 5초에선 25.4, 2초에선 63.5 에서 잘린다
- **위치**: `apps/runner/src/perfRead.ts:82` — runner
- **문제**: `dumpsys SurfaceFlinger --latency <층>` 은 층마다 최근 127 프레임만 돌려준다. `표시프레임으로` 는 그 안에서 지난 간격의 새 프레임을 세어 간격으로 나누므로 127/간격에서 잘린다. 화면 「수집 간격」은 1 · 2 · 5 를 다 받는데, 검사는 가짜 adb 60줄 · 간격 1초만 본다
- **검증 근거**: 반박하지 못했다. 게임은 gfxinfo 가 0 이라 이 길로 넘어간다(perfRead.ts:91-100). 실제 `한줄을읽는다` 에 300프레임 가짜 adb 를 물리자 간격 5초에서 25.4 가 나왔다
- **검증 방법**: 재현 1

### M15. 시나리오 크기 검사가 파일로 뺄 apiDoc 원문까지 세어 큰 API 문서가 붙은 시나리오를 400 으로 거절한다
- **위치**: `apps/runner/src/routes.ts:249` — runner
- **문제**: `/execute-scenario` 는 부품의 apiDoc(최대 5MB)을 받고, `판을파일로` 가 원문을 파일로 빼 경로만 `PLATFORM_SCENARIO` 에 싣는다. 그런데 라우트의 120,000바이트 검사는 apiDoc 이 그대로 든 parts 를 잰다. 200KB OpenAPI 버전이 붙은 계약대로의 요청이 「단계 목록이 120000바이트를 넘는다」로 거절된다
- **검증 근거**: 반박하지 못했고 low 에서 medium 으로 올렸다. 발견은 「지금 admin 은 부품에 apiDoc 을 안 싣는다」고 했지만 검증은 시험 실행(`apps/admin/src/scenario/trial.ts:107`)과 정식 실행(`runStore.ts:196`)이 `부품판(p)` 으로 버전 원문을 이미 싣는 것을 찾았다. 지금도 터지는 경로다. admin 의 100,000 상한은 apiDoc 을 붙이기 전 값을 재서 걸러 내지 못한다. 저장소 zod 로 라우트 스키마를 재현하자 400 이 났다
- **검증 방법**: 재현 1

### M16. 러너가 artifacts 볼륨 전체를 쓰기로 붙여 perf-dummy zip 을 바꿔치기할 수 있고, 부하 에이전트는 그 zip 을 root 로 실행한다
- **위치**: `docker-compose.yml:116` — perf-agent-infra
- **문제**: admin 은 더미 클라이언트 zip 을 `/artifacts/perf-dummy/<id>.zip` 에 두고 에이전트에 그대로 내준다. runner 도 같은 볼륨을 쓰기 모드로 붙이고 케이스 코드는 root 로 돈다. 부하 에이전트는 받은 zip 을 풀어 `sh -c <command>` 로 root 실행한다. 러너에서 도는 케이스가 zip 을 덮으면 다음 성능 실행에서 그 더미를 맡은 모든 부하 에이전트가 덮은 코드를 돌린다
- **검증 근거**: 반박하지 못했다. 두 서비스가 `${PLATFORM_ARTIFACTS_VOLUME:-artifacts}` 를 `:ro` · 하위 경로 분리 · `user:` 없이 붙인다. zip 의 지문을 확인하는 단계도 없다
- **검증 방법**: 코드 1

### M17. Postgres · grafana_ro 비밀번호가 평문 `platform` · `grafana_ro` 로 저장소에 박혀 있고 바꿀 칸이 없다
- **위치**: `docker-compose.yml:11` (`:37` · `:57`, `db/init/01-grafana-readonly.sql:3`) — sec-secrets-auth
- **문제**: `POSTGRES_PASSWORD` 와 admin · migrate 의 `DATABASE_URL` 에 `${...}` 치환이 없다. grafana_ro 계정도 SQL 과 Grafana 데이터소스 설정에 같은 값이 박혀 있다. 같은 호스트에 접근할 수 있는 사람은 `127.0.0.1:5433` 으로 `platform/platform` 에 붙어 DB 전체를 읽고 고칠 수 있다. H5 의 「고정 비밀번호」가 이 문제다
- **검증 근거**: 반박하지 못했고 low 에서 medium 으로 올렸다. `.env.example` 과 `docs/SETUP.md` 에 DB 비밀번호를 바꾸는 칸이나 절차가 없고, 고정해 두기로 한 결정도 명세에 없다. 「통로가 없다」는 조금 넓게 말했다 — `docker-compose.override.yml` 로는 덮을 수 있다
- **검증 방법**: 코드 1

### M18. 서버 주소의 경로 · scheme 변수를 `'0'` 으로 채워 앞 경로가 틀어지고, 응답 형식 검사가 소리 없이 전부 빠진다
- **위치**: `packages/kit/src/runtime/apiShape.ts:49` — kit
- **문제**: `틀찾기` 는 `servers[0].url` 의 모든 변수를 글자 `'0'` 으로 바꾼 뒤 pathname 을 앞 경로로 붙인다. 호스트 · 포트 자리 변수는 괜찮지만 `{basePath}` 는 앞 경로가 `/0` 이 되고, `{scheme}` · `{baseUrl}` 은 `/0://host/…` 같은 엉뚱한 앞 경로가 된다. 그러면 어떤 틀도 실제 요청과 안 맞아 `undefined` 가 되고 검사가 조용히 빠진다
- **검증 근거**: 반박하지 못했다. 버전이 들어오는 길(admin `문서읽기` → store → runner `판쓰기` → kit `판읽기`)에 servers 를 정리하는 곳이 없다. 실제 `모양확인` 에 OpenAPI 명세 예시(`https://{username}.gigantic-server.com:{port}/{basePath}`)를 넣자 앞 경로가 `/0` 이 되어 틀찾기가 `undefined` 를 돌렸고, FAIL 이어야 할 응답(필수 필드 `id` 없음)이 검사 없이 지나갔다. 절차는 FAIL 줄이 있을 때만 실패하므로(step.ts:67) 소리 없이 PASS 가 된다
- **검증 방법**: 재현 1

### M19. 작성 「마지막」 모드의 바뀐 파일 판정이 `.git` 없는 트리에서 GIT_DIR 없이 git 을 쳐 늘 실패한다
- **위치**: `scripts/authoring-run3.ts:181` — scripts-2
- **문제**: `바뀐것(트리, 기준)` 은 cwd=트리에서 `git diff --name-only <기준>` · `git ls-files` · `git status` 를 친다. 사본의 트리에는 `.git` 이 없다 — `사본준비` 는 bare git 을 따로 두고 `--work-tree` 로 체크아웃만 한다. 자식에게 넘기는 환경에도 GIT_DIR 이 없다. 그래서 `npm run -s authoring:run -- 마지막 <폴더>` 가 `fatal: not a git repository` 로 EXIT 2 가 된다
- **검증 근거**: 반박하지 못했다. 다만 제목의 「한번」 모드는 잘못 읽은 것이고, 영향을 받는 것은 「마지막」 모드뿐이다(212-219행)
- **검증 방법**: 코드 1

---

## Low — 39건

### 하네스

**L1. pre-push 가 올리는 커밋이 아니라 작업 폴더(HEAD + 커밋 안 한 파일)를 검사한다** — `.claude/hooks/pre-push:108` (harness)
- 문제: 차선은 올리는 sha 의 차이로 고르는데 typecheck · test:changed · check:tests · 임시 DB 마이그레이션은 디스크를 본다. `git add` 를 잊은 새 파일도 통과한다
- 검증: 49 · 79 · 96 · 108 · 117행과 vitest `--changed` 동작을 따라가 성립 (medium → low) · 코드 1

**L2. 금지 명령 판정이 같은 뜻의 흔한 꼴을 못 잡는다** — `.claude/scripts/guard.mjs:30` (harness)
- 문제: `--force-with-lease` · `-fu` 같은 묶은 깃발 · `rm -rf ~` · `dbmate rollback` · `bash -c` 로 감싼 명령이 지나간다
- 검증: `isBanned` 에 31개 꼴을 넣자 9개만 걸렸다. 일부는 HOOKS.md 가 「완벽하지 않다」고 적어 둔 범위라 medium → low · 재현 1

**L3. 훑기 보조의 「막기를 걸었다」 표시가 작업 폴더 단위라 다른 폴더의 같은 이름 세션에 막기가 안 걸린다** — `.claude/scripts/guard.mjs:157` (harness)
- 문제: 표시 파일은 sha1(cwd + 세션 이름)인데 playwright cli 세션은 `.playwright` 폴더나 설치 경로 단위로 묶인다. 맥에서 역방향 작성 둘이 `rev-1-0` 을 같이 쓰면 B 의 새 브라우저에 막기가 없다
- 검증: 임시 폴더 둘에 같은 설치를 링크해 세션 공간 키가 같아지는 것을 확인 · 재현 1

**L4. 진행판이 근거 줄을 바로 다음 줄에서만 읽어 완료 24건의 PR 번호와 날짜를 버린다** — `.claude/scripts/wbs.mjs:35` (harness)
- 문제: 설명 줄(「항목: …」 등)을 먼저 두고 근거 줄을 그 뒤에 적은 태스크는 pr · date 가 null 이 된다. 자가 검사는 체크 줄 수만 본다
- 검증: 지금 `docs/wbs.md` 로 `parseWbs` 를 돌리자 24건이 비었다(WEB-F4 14건 등). 원인 절반은 규칙(근거는 바로 다음 줄)을 어긴 진행판 쪽 · 재현 1

### admin 서버

**L5. API 문서 읽기가 짝 없는 서로게이트(`\ud800`)를 못 걸러 저장 단계에서 500 이 난다** — `apps/admin/src/apidoc/doc.ts:20` (server-catalog)
- 문제: `\u0000` 만 거르는데 jsonb 는 짝 없는 서로게이트도 거절한다. 업로드 라우트가 이 오류를 잡지 않아 400 대신 500 이 된다
- 검증: 해당 문서로 `문서읽기` 를 지나고 `JSON.stringify` 가 `\ud800` 을 되살리는 것을 확인 · 재현 1

**L6. SSO 로 이미 묶인 계정이 나중에 작성 에이전트 계정(`AUTHORING_AGENT_USER`)이 되면 그 Auth_platform 사용자가 에이전트로 로그인한다** — `apps/admin/src/auth/sso.ts:32` (server-auth)
- 문제: `계정찾기` 는 sub 로 찾으면 바로 돌려주고, `작성계정인가` 검사(36행)는 처음 묶을 때만 돈다
- 검증: 출입증에 username 과 method 만 담기고 뒷단에서 다시 막는 곳이 없음 · 코드 1

**L7. 폐기한 작성 요청에도 머지 요청이 서서 폐기가 풀리고 PR 이 병합된다** — `apps/admin/src/authoring/routes.ts:278` (server-authoring)
- 문제: 재실행(176-181행)과 이어 작성(continue.ts:145)은 `discardedAt` 을 막는데 머지 통로만 안 본다. 새로 고치지 않은 상세에서 「반영」을 누르면 통과한다
- 검증: `원본확인` · `머지보류판정` · `반영겹침` 어디에도 폐기 확인이 없음 · 코드 1

**L8. 멈춘 직후 Slack 완료 알림이 두 번 갈 수 있다** — `apps/admin/src/execution/notify.ts:101` (server-execution)
- 문제: `notified_at IS NULL` 로 고른 뒤 보내고 나서야 채운다. 중단 통로와 디스패처가 거의 동시에 `notifyRun` 을 부른다
- 검증: 잠금 · 조건부 UPDATE · 메모리 Set 어느 것도 없음 · 코드 1

**L9. 대기 중 성능 실행을 엔진이 막 시작할 때 중단하면 부하 발생 에이전트가 영원히 「바쁨」으로 남는다** — `apps/admin/src/perf/engine.ts:52` (server-perf)
- 문제: `시작하기()` 가 `대기에서시작` 뒤에 실행이 닫혔는지 다시 안 본다. 중단 쪽 `에이전트풀기` 가 먼저 끝나면 그 뒤의 `에이전트맡기` 가 닫힌 실행 번호를 남긴다
- 검증: 도는중 깃발은 틱끼리만 막고 중단 요청과는 무관 · 코드 1

**L10. 기기 성능 실행을 엔진이 집기 직전에 중단하면 기록기 · 5초 틱이 정리되지 않아 팜 폰을 계속 잡는다** — `apps/admin/src/perf/finish.ts:66` (server-perf)
- 문제: `기기닫기()` 는 맵에 항목이 없으면 true 를 준다. 그 await 사이에 대기열이 항목을 넣고 RUNNING 을 먼저 커밋할 수 있다
- 검증: deviceRun.ts:279-281 과 두 흐름의 순서를 맞추는 장치가 없음 · 코드 1

**L11. 중간 마디에 `:n` 이 있는 모음에 수정 요청을 제안하면 `:n` 글자가 남은 주소가 나온다** — `apps/admin/src/scenario/linkSuggest.ts:80` (server-scenario)
- 문제: `to.path` 를 지도 틀 그대로 `${모음}/{}` 로 만든다. `/api/carts/:n/items` 의 `:n` 은 조립 검사와 러너 입구 검사를 다 통과해 없는 주소로 간다
- 검증: 실제 `값연결제안들` 로 확인 (medium → low) · 재현 1

**L12. 값 연결 제안에 부품 수 상한이 없어 O(n²) 계산으로 서버가 수 초 멈춘다** — `apps/admin/src/scenario/linkSuggest.ts:65` (server-scenario)
- 문제: 제안 통로는 일부러 조립 거절을 안 걸어 크기 상한도 없다. 단계 8,000개(약 616KB) 초안에 약 7.5초가 걸렸다
- 검증: 실제 함수로 2,000 · 4,000 · 8,000개를 재 이차로 늘어나는 것을 확인 · 재현 1

**L13. 값 주입마다 API 본문 전체를 다시 `JSON.stringify` 해 조립 하나로 서버가 수 초 멈춘다** — `apps/admin/src/scenario/validate.ts:209` (server-scenario)
- 문제: 100KB 크기 상한은 부품 루프가 끝난 뒤(224행)에야 본다. 1MiB 본문 안에서 「값 주입 수 × 본문 크기」만큼 동기 계산이 돈다
- 검증: zod 스키마에 개수 · 크기 상한이 없음. 209행 식을 옮겨 재자 요청 하나에 6초 넘게, 본문 모양에 따라 12초까지 멈췄다 · 재현 1

**L14. 대상 서버 주소(baseUrl)를 바꿔도 API 인증 비밀값을 그대로 이어받는다** — `apps/admin/src/settings/envs.ts:105` (server-auth)
- 문제: `API인증이어받기` 는 이름과 tokenUrl 글자만 견준다. tokenUrl 이 상대 경로면 baseUrl 만 바꿔도 비밀값 원문이 새 서버로 간다. 98-99행 주석이 막겠다고 한 바로 그 장면이다
- 검증: 권한 경계를 넘지는 않아 medium → low · 코드 1

**L15. 설정에서 같은 env 이름이 두 줄 오면 400 이 아니라 500 이 난다** — `apps/admin/src/settings/envs.ts:161` (server-auth)
- 문제: 스키마가 envs 안의 겹침을 안 보고 둘째 INSERT 가 PRIMARY KEY 위반을 낸다. 에러 처리기는 `설정오류` 만 상태 코드로 옮긴다
- 검증: 재현으로 500 확인 · 재현 1

**L16. 마지막 운영자 보호(LAST_ADMIN)가 동시 요청 둘에 뚫려 운영자가 0명이 될 수 있다** — `apps/admin/src/settings/users.ts:138` (server-auth)
- 문제: 고칠 계정 한 줄만 `FOR UPDATE` 로 잠그고 남은 운영자 수는 잠그지 않는 `count(*)` 로 센다. READ COMMITTED 에서 alice · bob 을 동시에 내리면 둘 다 통과한다
- 검증: 격리 수준을 올리는 곳이 없음 · 코드 1

### 관리 화면

**L17. 작성 목록 5초 다시 읽기가 한 번 실패하면 열어 둔 「새 작성 요청」 서랍이 내려가 고른 파일 · 피그마 주소가 사라진다** — `apps/admin/src/web/Authoring.tsx:144` (web-1)
- 문제: error 가 있으면 맨 앞에서 `<Failed>` 만 돌려줘 같은 트리의 서랍이 언마운트된다
- 검증: 실제 Authoring 컴포넌트를 렌더하는 재현 테스트에서 폼 상태가 사라짐 · 재현 1

**L18. 건수가 50의 배수일 때 「다음」으로 간 빈 쪽에서 작성 목록의 쪽 넘기기가 사라지고 「기록이 없다」고 말한다** — `apps/admin/src/web/Authoring.tsx:196` (web-1)
- 문제: 0건이면 쪽 넘기기를 통째로 감춰 「이전」 단추도 없어진다. `page=2` 가 주소에 남아 새로고침해도 같다
- 검증: 재현 스크립트로 세 장면 모두 확인 · 재현 1

**L19. 케이스 고리(`#/cases/fn?case=…`)는 그 케이스가 목록 첫 쪽(50건) 밖이면 상세 칸을 못 연다** — `apps/admin/src/web/CaseList.tsx:79` (web-1)
- 문제: 주소에 `case=` 만 실리고 받은 쪽 안에서만 찾는다. 없으면 아무 안내도 없다
- 검증: route.ts:62 와 CaseList 조회 경로를 따라감 · 코드 1

**L20. 대시보드에서 실행 기록으로 가는 고리가 늘 기능 테스트 목록이라 UI 테스트 실패로는 못 내려간다** — `apps/admin/src/web/DashboardPick.tsx:112` (web-2)
- 문제: 집계는 UI · FN 을 같이 세는데 `실행목록주소` 는 `#/runs/fn` 고정이다
- 검증: dashboardSql.ts:42 의 `kind IN ('UI','FN')` 과 고리 주소를 대조 · 코드 1

**L21. 가이드 저장 요청이 오가는 동안 친 글자가 저장이 끝나면 경고 없이 사라진다** — `apps/admin/src/web/Guide.tsx:57` (web-2)
- 문제: 저장 중에도 글 칸이 안 잠기고, 끝나면 보낸 글과 견주지 않고 `set초안(null)` 로 비운다
- 검증: `짓기` 의 await 순서와 덮어쓰기 갱신을 따라감 · 코드 1

**L22. 항목 상세에서 리포트를 만들면 「생성 중」에서 안 바뀌고 자동 내려받기도 없다** — `apps/admin/src/web/ItemRunContext.tsx:64` (web-2)
- 문제: 실행 결과 화면은 PENDING 이면 2초마다 다시 읽는데 항목 상세는 처음 한 번과 누른 직후 한 번만 읽는다
- 검증: ItemRunContext · ItemDetail 어디에도 setInterval 이 없음 · 코드 1

**L23. 영어 표끼리 같은 한국어 키에 다른 영어를 적어 다른 뜻의 영어가 화면에 뜬다** — `apps/admin/src/web/messages.ts:32` (web-2)
- 문제: 표를 펼침으로 합쳐 나중 표가 덮는다. 키 14개가 어긋나고, `'실행자'` 는 `'Run by'` 가 `'Runner'` 로 덮여 E2E 결과 머리에 뜬다
- 검증: TypeScript 파서로 표를 합쳐 14개 확인. 발견이 든 두 장면 중 하나(대조 화면 서버 `'No trace'`)는 실제로 일어나지 않음 · 재현 1

**L24. 긴 기기 측정을 실행 중에 열면 `Math.max` 펼침 인자 초과(RangeError)로 화면이 멈춘다** — `apps/admin/src/web/PerfDeviceLive.tsx:46` (web-3)
- 문제: 처음 읽을 때 쌓인 줄 전부를 `Math.max(...배열)` 로 펼친다. 약 11만 개를 넘으면 V8 이 던진다(기기 5대 · 간격 1초 · 6~7시간)
- 검증: node 로 한계가 110,312~110,781 개임을 확인, 서버도 줄을 나눠 주지 않음 · 재현 1

**L25. 성능 결과의 「다시 실행」이 부하 중 페이지 측정(pageCheck)을 빼고 새 실행을 만든다** — `apps/admin/src/web/PerfRunResult.tsx:72` (web-3)
- 문제: 요청에 `run.config.pageCheck` 를 안 싣고 서버 기본값은 false 다. 마법사와 정기 실행은 싣는다
- 검증: 화면이 원래 값을 알고 있는데 안 보냄 · 코드 1

**L26. AI 가져오기 · 목표 추천이 끝나면 기다리는 동안 고친 입력이 맡긴 때 값으로 돌아간다** — `apps/admin/src/web/PerfStepScenario.tsx:78` (web-3)
- 문제: `usePerfJob` 이 맡긴 순간의 콜백을 들고 몇 분 뒤 `고침({ ...값, … })` 으로 그때의 값 전체를 다시 넣는다
- 검증: 재현 테스트로 두 단계 모두 확인 · 재현 1

**L27. 다른 서비스 실행의 실패 카드에서 요구 번호를 누르면 지금 고른 서비스의 PRD 관리가 열린다** — `apps/admin/src/web/RunFailedReqs.tsx:11` (web-3)
- 문제: 고리를 보일지는 그 실행의 서비스로 정하는데 주소는 `#/prd/<reqId>` 뿐이라 PRD 화면은 띠 서비스로 읽는다
- 검증: 띠 DEMO · 실행 MKT 로 순수 함수를 재현 · 재현 1

**L28. 실행 기록 오른쪽 결과 칸이 그 실행의 서비스가 아니라 띠 서비스의 권한으로 버튼을 가른다** — `apps/admin/src/web/RunList.tsx:230` (web-3)
- 문제: `?run=` 의 실행이 다른 서비스여도 `판정하기={() => 할수}` 를 넘긴다. B 의 read 만 있는 사람에게 「실행 중단」 · 「버그」 단추가 보인다
- 검증: Slack 고리 → 항목 상세 → 「실행 결과」 길로 띠를 안 바꾸고 닿는다. ef2f4158(⑫-5)에서 ItemDetail 고리가 바뀌며 생긴 회귀 · 코드 1

**L29. 「직전 실행 RUN N」으로 옮기면 앞 실행에서 누른 「신규/연속 실패」 거르개가 남아 실패 카드가 사라진다** — `apps/admin/src/web/RunResultBody.tsx:96` (web-3)
- 문제: `#/runs/:id` 는 key 없이 그려 같은 인스턴스를 다시 쓰고, 자식 `끝난결과` 의 `변화` 상태가 남는다. 새 실행에 직전 실행이 없으면 거르개를 풀 칸도 없다
- 검증: 재현 테스트로 카드가 사라지는 것을 확인 · 재현 1

**L30. SSO 로그인 직후 `history.state` 를 null 로 덮어 떠나기 막기의 칸 번호가 지워진다** — `apps/admin/src/web/main.tsx:240` (web-4)
- 문제: `useHash()` 가 적은 `navIndex` 를 SSO effect 의 `replaceState(null, …)` 가 지운다. 그 첫 칸으로 뒤로 가면 앱 밖으로 나갈 수 있다
- 검증: 결함은 성립하지만 발견의 장면 그대로는 아니고 조건이 더 좁다 · 코드 1

**L31. 시험 실행 결과를 지금 초안의 단계로 이름 붙여, 실행 뒤 단계를 고치면 결과 줄이 다른 단계로 보인다** — `apps/admin/src/web/ScenarioTrial.tsx:113` (web-4)
- 문제: 결과에는 seq 만 있고 이름 · 종류는 `초안.단계들[p.seq - 1]` 에서 가져온다. 1번 단계를 지우면 결제 FAIL 이 「주문 확인」 이름으로 보인다
- 검증: `ScenarioPartResult` 에 tcId · kind 가 없음(ScenarioBuild.tsx:284) · 코드 1

**L32. 애플리케이션 비활성화 · 다시 활성화를 누르면 적다 만 설정이 사라지고 「저장했습니다」가 뜬다** — `apps/admin/src/web/SettingsService.tsx:95` (web-4)
- 문제: `isActive` 만 보낸 뒤 패널 key 를 바꿔 새로 그린다. 저장 안 한 대상 서버 줄 · Slack 웹훅 등이 버려진다
- 검증: 서버 PATCH 는 부분 수정이라 성공하고 화면만 지운다 (medium → low) · 코드 1

**L33. StrictMode 개발 모드에서 「살았나」 ref 가 영원히 false 가 되어 성능 AI 일이 끝나도 화면에 안 들어온다** — `apps/admin/src/web/usePerfJob.ts:19` (web-4)
- 문제: effect 가 정리 단계에서만 false 로 바꾸고 설정 단계에서 true 로 안 되돌린다. 운영 빌드는 영향이 없다
- 검증: 실제 `usePerfJob.ts` 를 jsdom 에서 StrictMode 로 돌려 확인 · 재현 1

### 성능 에이전트 · 러너 · kit

**L34. 모니터링 일을 startAt 보다 늦게 받으면 지난 초를 몇 ms 간격 읽기로 채워 가짜 CPU · 네트워크 숫자를 보낸다** — `apps/perf-agent/src/agent.ts:205` (perf-agent-infra)
- 문제: `runMonitor` 가 지난 초를 건너뛰지 않고 `pause` 는 0 이하면 바로 돈다. startAt 이 20초 지난 일은 sec 0~19 가 0.5초 안에 몰려 나간다
- 검증: 실제 함수로 재현 · 재현 1

**L35. 모니터링 네트워크 숫자가 lo 만 빼고 docker0 · br-\* · veth\* 까지 더해 2~3배로 부푼다** — `apps/perf-agent/src/proc.ts:47` (perf-agent-infra)
- 문제: `--network host` 라 호스트의 모든 인터페이스가 보이고, 컨테이너 서비스의 요청 하나가 세 곳에 잡힌다
- 검증: 계산 결함은 성립하지만 지금 코드에서 사용자가 겪는 피해는 없어 medium → low · 재현 1

**L36. 프로세스가 끝난 뒤 몰아 보내기에서 한 번만 실패해도 남은 초를 모두 버린다** — `apps/perf-agent/src/sendLoop.ts:39` (perf-agent-infra)
- 문제: 실패하면 「다음 틱」으로 미루는데 마지막 flush(46행)에는 다음 틱이 없다
- 검증: 0~9초 중 sec 3 을 실패시키자 [0,1,2] 만 나감 · 재현 1

**L37. 미룬 삭제가 요청 본문과 문자열 · URLSearchParams 꼴 params 를 버리고 주소만으로 다시 보낸다** — `apps/runner/scenario/window.ts:78` (runner)
- 문제: `쿼리()` 가 객체가 아닌 params 를 버리고 `sendDelete` 는 url 만 보낸다. `request.delete('/api/cart', { params: 'itemId=7' })` 는 쿼리 없는 DELETE 가 된다
- 검증: 실제 window.ts · links.ts 로 재현 (medium → low) · 재현 1

**L38. 폰에 앱이 없으면 400 대신 500 RUNNER_ERROR 가 난다** — `apps/runner/src/perfDevice.ts:146` (runner)
- 문제: `pm path` 는 패키지가 없으면 종료 코드 1 을 내고 adb 가 그대로 넘겨 execFile 이 reject 한다. 빈 출력 분기(400)에 닿지 않는다
- 검증: AOSP 원문과 이 맥의 adb 동작을 확인한 뒤 가짜 adb 로 재현 · 재현 1

**L39. `request.fetch()` 로 보낸 요청이 절차 기록에 메서드 `'FETCH'` 로 남는다** — `packages/kit/src/runtime/http.ts:74` (kit)
- 문제: traced 프록시가 가로챈 속성 이름을 method 로 넘긴다. 같은 함수의 모양 확인(85행)은 `options.method` 로 바꿔 보므로 둘이 어긋난다
- 검증: 실제 kit http.ts 로 재현 · 재현 1

---

## 반박된 발견 — 10건 (검증 11번)

`docker-compose.yml:19` 하나만 두 갈래가 함께 반박해 검증 수는 11이다.

1. `docker-compose.yml:166` (sec-isolation) 맥 Docker Desktop 에서 작성 자식이 `host.docker.internal` 로 DB 에 닿는다 — 길은 열리지만 명세(작성.md:123-129 「남는 한계」 · SETUP.md:285)가 맥은 격리 대상이 아니라고 미리 적었다
2. `docker-compose.yml:19` (perf-agent-infra) 같은 문제를 author 쪽에서 본 것 — 같은 까닭으로 두 갈래 모두 반박
3. `apps/admin/src/execution/farmEvidence.ts:68` (server-execution) 팜 증적 저장형 XSS — 화면은 `download` 고리로만 그려 브라우저가 파일로 받고, 받은 파일은 file:// 출처라 세션이 안 실린다
4. `apps/admin/src/scenario/runResult.ts:50` (server-scenario) 실패 기록 재료를 못 읽으면 trace.zip 을 지운다 — pg-pool 이 끊긴 쉬는 연결을 바로 빼서 그 장면이 이 배포에서 생기지 않는다
5. `packages/kit/src/runtime/app.ts:52` (kit) Appium 주소 안 계정이 첫 요청에만 실린다 — 러너.md:407 에 적힌 한계이고 진행판 `APP-F1-13` 으로 미뤄 둔 일이다
6. `apps/runner/src/perfRead.ts:68` (runner) 층 이름이 바뀌면 FPS 가 끝까지 null — 「광고 전에는 SurfaceView 층에서 읽혔다」는 전제가 실기기에서 성립하지 않는다
7. `db/migrations/20261021000002_perf.sql:10` (db) 빈 프로젝트 삭제가 모니터링 에이전트를 CASCADE 로 지운다 — 명세 정본 SQL(4-데이터모델.md:1665)이 정한 동작이고 피해는 옮기기 자체에서 생긴다
8. `apps/admin/src/auth/sso.ts:39` (sec-secrets-auth) SSO 가 `preferred_username` 으로 기본 admin 계정에 묶인다 — 인증.md:148-151 · SETUP.md:188 이 정한 동작이고 sso.test.ts 가 검사한다
9. `apps/admin/src/perf/har.ts:33` (server-perf) `x-` 로 시작하지 않는 비밀 헤더 값이 안 모인다 — 가리기는 값으로 하므로 다른 다섯 자리에서 모인 값이 같이 가린다
10. `scripts/authoring-agent.ts:301` (scripts-1) claude 최신화 점검 실패 때 직전 버전을 못 읽으면 되돌리지 않는다 — 깃발이 바뀐 claude 는 인자 오류로 멈춰 제약 없이 도는 일이 없다
