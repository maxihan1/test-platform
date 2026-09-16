# WS-C 진행 기록 — 러너 + 테스트 킷

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
