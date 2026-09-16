# LEARNINGS.md — 겪은 것들

> 모든 세션이 시작할 때 읽고, 끝날 때 덧붙인다.
> Claude Code 세션은 서로 기억을 공유하지 않는다. 이 파일이 유일한 통로다.
> 여기 적히지 않은 삽질은 다음 세션이 처음부터 다시 한다.

---

## 적는 기준

**적을 것** — 다음 세션이 몰라서 시간을 쓸 것

- 이 환경에서만 걸리는 것 (도커, EC2, Playwright 버전, 노드 버전)
- 처음에 틀리게 만들었다가 고친 것 — **왜 틀렸는지**까지
- SPEC이 애매해서 판단이 필요했던 것과 그 판단
- 특정 라이브러리의 예상 밖 동작
- 되돌린 결정 — 무엇을 왜 되돌렸는지

**적지 않을 것**

- SPEC에 이미 있는 내용 (중복되면 둘이 어긋난다)
- 잘 된 작업의 경과 보고 (`docs/progress/WS-X.md` 담당)
- 일반적인 프로그래밍 지식
- 한 번만 일어나고 재현되지 않는 것

---

## 형식

시간 역순으로 위에 쌓는다. 항목 하나는 5줄을 넘기지 않는다.

```
## [WS-C] 2026-10-02 · Playwright 리포터에서 줄 번호가 안 나옴
증상:  StepResult.line이 항상 undefined
원인:  onTestEnd의 result.error.location이 아니라 result.errors[0].location에 있음
해법:  errors 배열의 첫 항목에서 꺼낸다
주의:  에러가 없는 스텝은 errors가 빈 배열이므로 옵셔널 체이닝 필수
```

태그는 `[WS-A]`~`[WS-E]`, `[Phase0]`, `[병합]`, `[환경]` 중 하나.
여러 갈래에 해당하면 `[공통]`.

---

## 승격 규칙

같은 유형의 실수가 **두 번 이상** 나오면 여기 적는 것으로 끝내지 않는다.

| 반복된 것 | 옮길 곳 |
|-----------|--------|
| SPEC을 잘못 읽어서 생긴 어긋남 | `SPEC.md` 해당 절을 명확하게 고친다 |
| 작업 방식 때문에 생긴 문제 | `CLAUDE.md`에 규칙으로 추가 |
| 검사에서 못 걸러낸 위반 | `spec-review` 체크리스트에 항목 추가 |
| 환경 설정 삽질 | Phase 0 킥오프 프롬프트에 미리 반영 |

**기록은 쌓이기만 하면 소음이 된다.** 반복되는 것은 규칙으로 올려서
다음 세션이 읽지 않아도 안 틀리게 만든다. 그게 이 파일의 목적이다.

승격한 항목은 여기서 지우지 말고 `→ CLAUDE.md §3으로 승격`을 덧붙인다.
나중에 왜 그 규칙이 생겼는지 추적할 수 있어야 한다.

---

## 분량 관리

100줄을 넘으면 정리한다.

- 이미 승격된 항목은 한 줄로 줄인다
- 해당 워크스트림이 완료됐고 다시 볼 일 없는 것은 `## 지난 기록` 아래로 내린다
- 지우지는 않는다. 같은 문제가 재발했을 때 "전에 이랬다"가 남아 있어야 한다

---

## 기록

(여기부터 쌓는다. 가장 최근 것이 위로.)

## [WS-E] 2026-09-16 · Vite 프록시 접두사 '/api'가 소스 파일 /api.ts까지 가로챈다
증상:  화면이 통째로 비었다. 콘솔에 에러가 없고 index.html·main.tsx는 200인데 화면만 안 그려진다
원인:  `proxy: { '/api': ... }`는 **접두사 일치**다. 브라우저가 `/api.ts`(내 소스 파일)를 달라고 하면 그것도 admin으로 넘어가 404가 된다
해법:  `'^/api/'`로 적는다. `^`로 시작하면 Vite가 정규식으로 본다. 파일 이름을 바꿔 피할 수도 있다
주의:  모듈 로드 실패는 콘솔이 아니라 네트워크에 남는다. 화면이 비면 각 소스 파일의 HTTP 코드부터 본다

## [WS-E] 2026-09-16 · POST /api/runs는 입력값을 명세로 검증하지 않는다
증상:  SPEC §8.2는 "검증 실패 시 칸 아래에 이유를 표시"인데, 실행 요청은 title·platforms·케이스 존재만 본다
판단:  화면이 실행 전에 검증한다. 검증기를 새로 쓰지 않고 서버의 `execution/validate.ts`를 그대로 import 했다
왜:    두 벌을 두면 '실행하기'와 '입력값 세트로 저장'(POST param-sets, 서버가 검증)이 같은 값에 다른 사유를 낸다
주의:  그 파일은 순수 함수여야 화면 번들에 들어간다. DB나 fastify를 import 하면 화면 빌드가 깨진다

## [WS-B] 2026-09-16 · reply.type()을 먼저 박으면 404 본문이 500으로 나간다
증상:  없는 스크린샷을 요청하면 404가 아니라 500이 떨어졌다
원인:  `reply.type('image/png').send(await readFile(...))`는 readFile보다 type()이 먼저 평가된다. 실패해서 catch로 가면 응답은 이미 image/png라 JSON 본문을 직렬화하지 못한다
해법:  읽을 것을 손에 쥔 뒤에 형식을 정한다. 먼저 buffer를 받고, 성공했을 때만 type()을 건다
주의:  reply를 체이닝하는 모든 자리에 같은 함정이 있다. 에러 경로가 다른 content-type을 쓴다면 형식은 마지막에 정한다

## [공통] 2026-09-16 · 테스트 정리 구문의 LIKE 패턴이 넓으면 다른 갈래의 테스트를 지운다 (같은 유형 2회)
증상:  따로 돌리면 전부 통과, 같이 돌리면 `RunInputError: 카탈로그에 없는 케이스다: ZZBS-001`로 4~7건이 깨진다
원인:  Vitest는 파일을 **병렬로** 돌린다. `catalog/store.test.ts`의 `DELETE FROM test_case WHERE tc_id LIKE 'ZZ%'`가 `ZZ`로 시작하는 남의 fixture까지, 그쪽이 쓰고 있는 도중에 지웠다
규칙:  정리 구문의 LIKE 패턴은 **자기 파일 fixture에만** 맞아야 한다. 갈래별 접두사 — WS-A `ZZA`, WS-B `XBS`·`XBR`·`XBQ`·`XBX`. **WS-D·WS-E는 `ZZ`로 시작하는 것을 고르지 마라** (`ZZ%`가 통째로 지워진다). 파일이 여러 개면 파일마다 또 갈라야 한다
확인:  `DATABASE_URL='postgres://platform:platform@localhost:5433/platform' npx vitest run`을 **연속 3회**. 1회 통과는 증거가 못 된다 — 이번 건도 1회차에 171건 전부 통과하고 2회차에 4건이 깨졌다
제안:  같은 유형 2회다. CLAUDE.md §3에 "DB 테스트 fixture 접두사는 갈래마다 고유하게, 정리 패턴은 자기 것에만 맞게"를, spec-review에 `G3 — 정리 패턴이 남의 fixture를 지우지 않는가`를 올릴 것을 제안한다. WS-A의 `ZZ%`는 그 갈래 소유라 고치지 않았다

## [환경] 2026-09-16 · 컨테이너가 병합 전 이미지를 물고 있으면 케이스가 전부 FAIL로 보인다
증상:  러너에 DEMO-001을 보내면 `TypeError: (0 , _kit.defineCase) is not a function`. 호스트에서 같은 코드는 멀쩡하다
원인:  이미지가 `packages/kit`을 빌드 시점에 굽는다. WS-C 병합 전에 뜬 컨테이너는 옛 kit을 그대로 들고 있다
해법:  `docker compose build runner && docker compose up -d runner`. admin도 같다
주의:  코드가 아니라 이미지가 낡은 것이다. 러너 응답이 통째로 이상하면 먼저 `docker compose ps`의 CREATED와 마지막 커밋 시각을 대 본다

## [환경] 2026-09-16 · 워크트리 세션의 WORKSTREAM은 메인 체크아웃 설정을 고쳐야 바뀐다
증상:  WS-B 폴더에 파일을 만들려는데 훅이 "WS-A 소유 경로 밖이다"로 막았다
원인:  워크스트림은 `.claude/settings.local.json`으로 지정하는데 이 파일은 gitignore라 새 워크트리에 딸려오지 않는다. 세션 환경변수는 메인 체크아웃 쪽에서 온다
해법:  메인 체크아웃의 `.claude/settings.local.json`을 `{"env":{"WORKSTREAM":"B"}}`로 고친다. 즉시 반영된다 (세션 재시작 불필요)
제안:  같은 유형(설정이 세션에 전달되는 경로)이 두 번째다. SETUP.md §5나 HOOKS.md에 "워크트리로 갈래를 나눌 때는 메인 쪽 WORKSTREAM을 바꾼다"를 규칙으로 올릴 것을 제안한다

## [WS-A] 2026-09-16 · PLATFORM_SCAN이 자식 playwright로 새어 K8이 전부 거짓 위반이 됐다
증상:  `check:tests`가 멀쩡한 10건을 전부 "테스트를 하나도 등록하지 않았다"로 찍었다
원인:  스캐너가 `process.env.PLATFORM_SCAN = '1'`을 켠 채로 두고, 그 뒤 `--list`를 자식으로 띄웠다. 자식이 그대로 물려받아 kit이 등록을 건너뛴다
해법:  자식에게 넘길 env에서 `PLATFORM_SCAN`을 지운다. 순서에 기대지 않으려면 명시적으로 지우는 쪽이 안전하다
주의:  스캐너를 한 프로세스에서 다른 도구와 같이 돌리는 곳은 전부 같은 함정이다

## [WS-A] 2026-09-16 · 스캔이 파일 하나 때문에 통째로 죽으면 다른 파일의 위반이 묻힌다
증상:  `params` 키가 빠진 파일 하나 때문에 스캔이 예외로 끝나, 다른 파일의 tcId 형식·빈 name 위반이 아예 출력되지 않았다
원인:  `scan()`이 첫 실패에서 던지게 만들었다. 검사기는 "한 번에 전부 보여주는" 것이 목적인데 설계가 반대였다
해법:  `{ specs, failures, duplicates }`를 돌려주고 판단은 부르는 쪽이 한다. 기동 시 자동 스캔도 같은 성질이 필요하다(실패해도 admin은 떠야 한다 — SPEC §3.1)
주의:  읽지 못한 파일이 있으면 무엇이 정말 사라졌는지 알 수 없다. 그때는 `is_active=false` 처리를 건너뛴다

## [WS-A] 2026-09-16 · 일부러 규칙을 어긴 테스트 fixture는 저장소에 둘 수 없다
증상:  K4(키 누락) 검사용 fixture를 `apps/**` 안에 두자 `npm run typecheck`가 먼저 터졌다
원인:  `DefineCaseInput`이 `params`·`expected`를 필수 키로 요구한다. tsconfig의 `include`가 `apps/**/*.ts`라 fixture까지 컴파일 대상이다
해법:  소스 규칙 검사기를 `(파일명, 소스문자열) → 위반목록` 순수 함수로 만들었다. fixture가 문자열이면 파일이 아예 필요 없다
주의:  `PLATFORM_TESTS_DIR`로 임시 폴더를 가리켜 손으로 확인할 수는 있다. 그 폴더는 `tests/`가 아니라 자기 소유 경로 안에 둬야 훅이 막지 않는다

## [WS-A] 2026-09-16 · SPEC이 tcId 중복을 한 쌍으로도 여러 쌍으로도 읽힌다
증상:  §3.1은 "중복 발견 시 양쪽 파일 경로를 보고"(한 쌍), §7은 `duplicates[]`(여러 쌍)
판단:  배열로 맞췄다. 한 쌍만 돌려주면 고치고 다시 돌렸을 때 다음 쌍이 또 나와 왕복이 늘어난다
주의:  §7의 POST 응답 줄에는 `scannedAt`·`error?`가 없는데 GET에는 있다. 구현은 둘을 같은 모양으로 돌려준다 (docs/reviews/2026-09-16-WS-A.md 기타 1)

## [WS-C] 2026-09-16 · 러너 이미지의 Node 24에서는 리포터의 상대 import가 안 풀린다
증상:  컨테이너에서만 `Failed to load the ES module: .../protocol.ts` 경고 하나만 남고 실행이 통째로 실패한다. 호스트에서는 멀쩡하다
원인:  호스트는 Node 22라 Playwright 변환기가 `./x.js`를 `x.ts`로 풀어준다. 이미지의 Node 24는 타입 스트리핑이 기본이라 그 변환을 안 타고, Node는 그 변환을 하지 않는다
해법:  Playwright가 직접 로드하는 파일(리포터)에는 **값을 가져오는 상대 import를 두지 않는다.** 타입 import는 지워지므로 괜찮다
주의:  테스트 파일과 kit 본체는 `/tests`에 package.json이 없어 CJS 경로를 타므로 영향이 없다. 러너·admin은 tsx가 풀어준다

## [WS-C] 2026-09-16 · child.kill()은 npx만 죽이고 브라우저가 남는다
증상:  `timeoutMs: 5000`을 준 DEMO-007이 33초 만에 응답했다. 판정은 NA로 맞지만 시간이 6배다
원인:  `npx → node → 브라우저`인데 자식만 죽였다. 손자가 stdout 파이프를 쥔 채 남아 close 이벤트가 30초 뒤에야 왔다
해법:  `spawn(..., { detached: true })`로 띄우고 `process.kill(-pid, 'SIGKILL')`로 그룹째 끊는다
주의:  admin의 HTTP 타임아웃은 `timeoutMs + 30초`다. 이걸 안 고치면 긴 케이스에서 admin이 먼저 끊긴다

## [WS-C] 2026-09-16 · zod-to-json-schema가 zod 4 스키마에서 빈 결과를 뱉는다
증상:  `zodToJsonSchema(z.object({...}))`가 `{"$schema":...}` 하나만 돌려준다. properties도 required도 없다
원인:  설치된 zod는 4.1.12인데 zod-to-json-schema 3.24는 zod 3의 `_def.typeName`을 읽는다. zod 4는 내부 구조가 다르다
해법:  zod 4 내장 `z.toJSONSchema(schema, { io: 'input' })`를 쓴다. `io:'input'`이라야 `.default()`가 있는 필드가 required에서 빠진다
주의:  SPEC §9.1 스택 표에는 아직 `zod-to-json-schema`가 적혀 있다. 새 의존성이 아니라 이미 깔린 zod의 API라 추가 설치는 없다

## [WS-C] 2026-09-16 · Playwright가 테스트 위치를 kit의 래퍼 파일로 잡는다
증상:  `npx playwright test --list`가 모든 케이스를 `packages/kit/src/runtime/test.ts:95`로 표시하고 "1 file"로 센다
원인:  Playwright는 `test()`를 부른 스택의 첫 프레임을 위치로 쓴다. kit 래퍼가 부르므로 래퍼 파일이 찍힌다
해법:  기계 검사는 `--list --reporter=json`을 쓴다. `suites[].file`은 케이스 파일이 정확히 들어오고 파일마다 specs가 1건이다
주의:  WS-A의 K8 검사가 사람이 읽는 `--list` 출력을 파싱하면 어긋난다. JSON으로 봐야 한다

## [WS-C] 2026-09-16 · 스크린샷은 리포터가 아니라 kit이 찍는다
증상:  킥오프는 "리포터가 실패한 스텝의 스크린샷을 저장한다"인데 리포터에는 `page`가 없다
원인:  Playwright 리포터는 결과만 받는 관찰자다. 절차 단위로 화면을 찍으려면 실행 중인 픽스처를 쥔 쪽이어야 한다
해법:  kit의 절차 래퍼가 찍어 경로를 StepResult에 담고, 리포터는 조립·출력만 한다. 계약(`StepResult`)은 그대로다
주의:  경로에 필요한 runId·historyId는 러너가 `PLATFORM_RUN_ID`·`PLATFORM_HISTORY_ID`로 넘긴다. 화면을 연 적 없는 API 케이스는 찍지 않고 `httpTrace`를 남긴다

## [환경] 2026-09-16 · 호스트 5432는 이미 로컬 PostgreSQL이 잡고 있다
증상:  `npm run smoke`가 `role "platform" does not exist`. 컨테이너 안 psql은 정상이었다
원인:  맥에 설치된 PostgreSQL이 127.0.0.1:5432를 선점. 도커는 `*:5432`라 localhost 연결은 로컬 쪽이 받는다
해법:  compose에서 호스트 쪽만 `5433:5432`로 비켜 쓴다. 컨테이너끼리는 그대로 5432
주의:  호스트에서 DB를 열 때는 5433이다. `docker compose exec postgres psql`은 포트와 무관하다

## [Phase0] 2026-09-16 · /tests 안에서 @playwright/test를 못 찾는다
증상:  러너에서 `npx playwright test /tests/...` → `Cannot find module '@playwright/test'`
원인:  Node는 파일 위치에서 루트까지 올라가며 node_modules를 찾는다. `/tests/demo` → `/tests` → `/` 경로는 `/app`을 지나지 않는다
해법:  이미지에 `ln -s /app/node_modules /node_modules`. 루트까지 올라오면 찾는다
주의:  admin도 스캔 때 /tests를 동적 import 하므로 양쪽 Dockerfile에 다 넣어야 한다

## [환경] 2026-09-16 · `ALLOW_PROTECTED=1 claude`로 띄워도 훅이 계속 막는다
증상:  SETUP.md §5대로 띄웠는데 protected 훅이 types.ts·docker-compose.yml을 그대로 차단
원인:  Claude Code가 데몬 구조다. 세션은 터미널이 아니라 상주 데몬에서 태어나므로 터미널 앞에 붙인 환경변수가 세션에 전달되지 않는다
해법:  `.claude/settings.local.json`에 `{"env":{"ALLOW_PROTECTED":"1"}}`. 설정은 데몬을 거쳐도 전달된다
주의:  Phase 0·병합 때만 두고 끝나면 지운다. 남겨두면 Phase 1 내내 잠금이 풀린 채로 돈다
→ SETUP.md §5 · HOOKS.md · setup/install.sh로 승격 (2026-09-16 반영)

## [Phase0] 2026-09-16 · 도커 빌드 컨텍스트를 앱 폴더가 아니라 루트로 잡았다
증상:  SPEC §9의 `build: ./apps/admin` 그대로 두면 `packages/kit`이 빌드 컨텍스트 밖이라 못 넣는다
원인:  모노레포는 워크스페이스 전체가 한 덩어리로 설치돼야 모듈이 resolve 된다
해법:  `context: .` + `dockerfile: apps/<앱>/Dockerfile`. 서비스·포트·볼륨·mem_limit은 SPEC 그대로다
주의:  SPEC §9는 "구조만"이라고 적혀 있어 계약 변경으로 보지 않았다

## [Phase0] 2026-09-16 · PLATFORM_PARAMS에 expected도 같이 싣는다
증상:  SPEC §5.2는 "params를 PLATFORM_PARAMS로 주입"인데 WS-C 킥오프는 "params/expected를 주입"이다
원인:  두 문서가 같은 환경변수를 다르게 적고 있다
해법:  `{"params":{...},"expected":{...}}` 한 객체로 싣는다. 둘 다 만족하는 유일한 형태다
주의:  WS-C의 `test()` 래퍼가 이 모양을 그대로 읽어야 한다

## [Phase0] 2026-09-16 · Vitest가 tests/** 의 Playwright 스펙까지 집어간다
증상:  `npm test`가 `tests/demo/DEMO-*.spec.ts`를 Vitest로 돌리려다 깨진다
원인:  Vitest 기본 include가 `**/*.spec.ts`라 Playwright 전용 폴더까지 들어온다
해법:  `vitest.config.ts`의 include를 `apps/**/*.test.ts`·`packages/**/*.test.ts`로 좁힌다
주의:  단위 테스트 파일은 `*.test.ts`, Playwright는 `*.spec.ts`로 확장자를 갈라 쓴다

## [환경] 2026-09-16 · Bash로 파일을 고치면 protected/ownership 훅이 안 걸렸다
증상:  `sed -i`·`>` 리다이렉트로 보호 파일을 고쳐도 통과했다
원인:  훅 매처가 Edit|Write|MultiEdit에만 걸려 있었다
해법:  bash 모드에 "경로 앞 쓰기 연산자" 휴리스틱 추가 (guard.mjs)
주의:  `python -c` 같은 우회는 못 잡는다. spec-review A1~A3이 최종 방어선

## [환경] 2026-09-16 · bash 훅이 echo 안에 인용된 문구까지 막는다
증상:  훅 검증용으로 강제 push 문구를 echo로 흘려보내자 그 명령 자체가 차단됐다
원인:  bash 검사는 명령 문자열 전체를 정규식으로 본다
해법:  그대로 둔다 (안전 쪽 오탐). 검증할 때는 문구를 쪼개서 쓴다
