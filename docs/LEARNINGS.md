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
