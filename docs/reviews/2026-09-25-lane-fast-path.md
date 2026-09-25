# SPEC 검사 결과 — PR #70 차선(lane) 도입 (2026-09-25)

등급: 2 (GUARD · HARNESS · DOC) · 명세(`docs/spec/**`) 변경 없음 · 계약 변경 없음
계획: `docs/plans/2026-09-25-lane-fast-path.md` (할 일 9)
검사 범위: `git diff origin/main...HEAD` (19개 파일) · 독립 세션

## 요약
치명 0건 · 중대 3건 · 경미 4건 — **병합 가능** (중대는 사용자가 판단)

## 중대

### H2 — 옛 규칙 「연속 3회」가 WORKFLOW 완료 조건에 남아 있다
어디:   docs/WORKFLOW.md:513
무엇:   갈래별 완료 조건 G2 가 「`npm test` 를 연속 3회 돌려 전부 통과」라고 적고 있다
왜 문제: CLAUDE.md §3 · spec-review G3 · tpx-impl/tpx-review 는 1회로 바뀌었다. 체크리스트를 따라 하는 세션은 옛 규칙대로 3회를 요구한다
고칠 곳: 이번 PR (CLAUDE.md §2.7 ④ — WORKFLOW.md 는 같이 움직이는 문서)

### H2 — 「병합 직전 다른 세션의 전체 범위 검사」가 WORKFLOW 에 현행 규칙으로 남아 있다
어디:   docs/WORKFLOW.md:18 · docs/WORKFLOW.md:590 (연관: docs/WORKSTREAMS.md:797 「병합 전 전체 검사」 절)
무엇:   590 행이 「병합 직전 전체 범위는 다른 세션이 돌린다 (CLAUDE.md §2.3)」라고 적는데, §2.3 은 그 재검사를 걷었다
왜 문제: 문서가 가리키는 정본(§2.3)과 정반대의 말을 한다. 다음 세션이 없어진 단계를 다시 요구한다
고칠 곳: 이번 PR

### H2 — SETUP 이 「CI 가 npm test 를 3회 돌린다」고 적는다
어디:   docs/SETUP.md:467
무엇:   CI 는 이제 `test:changed` 1회 + `test:always` 다
왜 문제: 결론(「CI 에 따로 이을 줄은 없다」)은 여전히 맞지만 근거 문장이 사실이 아니다
고칠 곳: 이번 PR

## 경미

### G9 — 새/옮긴 CI 단계의 「실패 삼키기」를 검사가 못 잡는다
어디:   .claude/scripts/ci-covers-tests.test.mjs:153 (「실패를 삼키지 않는다」 검사는 `실행단계` 만 본다)
무엇:   `ci.yml` 의 단위 테스트 단계(`npm run test:always || true`)와 `check:spec` 단계(`|| true`)를 넣어 봤는데 ci-covers-tests 25건이 전부 초록이었다 (실측, 원상 복구함). `check:tests` 도 같다 (전부터 있던 구멍)
왜 문제: `check:spec` 은 docs · spec 차선의 **유일한** 검사라고 ci.yml 주석 스스로 말한다. 여기가 조용히 무력화되면 문서 PR 이 아무 검사 없이 병합된다
제안:   `continue-on-error` · `|| true` 금지 단언을 test:changed · check:spec · check:tests 단계에도 건다

### G9 — 훅 검사의 가짜 npm 이 늘 성공한다
어디:   .claude/scripts/hook-contract.test.mjs:102
무엇:   docs 차선에서 `check:spec` 이 **실패하면 막는지**를 보는 경우가 없다. 부르기만 확인한다
제안:   가짜 npm 이 특정 명령에 1 을 내게 해 「막힌다」를 한 건 단언한다

### G8 — 부숴서 확인한 기록이 아직 PR 에 없다
어디:   PR #70 본문
무엇:   lane.test · always-tests · 새 hook/ci 검사의 부숴 보기 결과가 본문에 없다 (6단계 전이라 게이트 2 요약에 실으면 된다)

### C1 — 계획 밖 파일 하나
어디:   .claude/skills/tpx-impl/SKILL.md
무엇:   계획 `files` 에 없다. 이유(tpx-review 와 같은 규칙, chain-contract 검사가 두 스킬을 같이 본다)를 **게이트 2 요약**에 실어야 C1 통과다
참고:   PR 본문의 「폴더를 통째로 읽는 검사 여섯」은 `test:always` 가 9개 파일이라 숫자가 틀렸다 (H5 모양, docs/ 밖이라 경미)

## 확인한 것
- `cases-only.mjs` — origin/main 과 바이트 동일, import 는 node 표준 모듈뿐 (B9)
- 훅·CI·detect-tier 모두 `lane.mjs` 한 곳에서 차선을 받는다. CI 무거운 조건은 「docs·spec·cases 아님」이라 판정이 비면 full 이다
- `vitest --changed` 는 고를 것이 없으면 종료 0 (passWithNoTests 자동), `playwright --only-changed` 도 0건이면 「No tests found」로 안 죽는다 (node_modules 소스 확인)
- `always-tests` 의 `readFileSync` 휴리스틱에 안 걸리는 fs/promises 사용 파일 6개는 전부 자기 임시 파일만 읽는다
- `.claude/scripts/*.test.mjs` 91건 통과 (lane · always-tests · ci-covers-tests · chain-contract · hook-contract)
- 로컬 DB 꺼짐 — DB 검사는 이 세션에서 안 돌렸다 (CI 에 맡김)

## 통과한 항목
A1~A6(변경 없음), B1~B8(해당 없음), B9, C1(게이트 2 요약 조건부), C2~C6, D1~D5(해당 없음), E1~E4(해당 없음), F1~F10(해당 없음), G1~G7, H1, H3, H4, H5

## 후속 조치 (같은 PR, 게이트 2 전)
- 중대 3건(H2) — WORKFLOW.md 3곳 · WORKSTREAMS.md 「병합 전 전체 검사」(걷은 이유 덧붙여 남김, §2.7 ②) · SETUP.md 근거 문장 고침
- G9 — `ci-covers-tests` 의 실패 삼킴 금지를 check 잡 **전 단계**로 넓힘. 훅 검사의 가짜 npm 에 실패 스위치(`NPM_FAIL`)를 달아 docs 차선에서 check:spec · 문서 계약이 실패하면 막히는지 단언
- G8 — `check:spec || true` 를 넣으면 빨개짐, `lane()` 이 코드를 docs 로 내면 lane 검사 11건 이상 빨개짐 (부숴 보고 되돌림)
- 독립 code-review 지적 반영 — 문서 계약 검사(`check:docs-contract`)를 docs·spec 차선에서도 돌림 · vitest 트리거에 lockfile·tsconfig · playwright.config.ts 가 바뀌면 케이스 전부 · docs/ 아래 코드 파일은 full
- C1 — tpx-impl/SKILL.md 는 게이트 2 요약에 이유를 싣는다
- 재검사: check:workflow 158 · vitest 전체 1167 · typecheck · check:spec · check:docs-contract 전부 EXIT=0
