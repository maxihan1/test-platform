# 의존성 설치 누락을 기계가 막는다

등급: 2 · 갈래: 없음(하네스) · 2026-09-18

## 도메인 정리

제품 도메인을 건드리지 않는다. 작업 도구(`.claude/scripts/`)와 기록(`docs/LEARNINGS.md`)만 바꾼다.
관련 SPEC 절: 없음. 계약 변경: 없음.

## 왜

2026-09-18 체인 테스트에서 `main` 이 `@fastify/secure-session` · `exceljs` 를 **선언만 하고
설치가 안 된 상태**로 밝혀졌다. `contracts` 병합 뒤 `npm install` 을 안 돌린 것이다.

증상이 나쁘다 — 푸시 훅이 `npm test` 실패로 막는데, 에러는 `Cannot find package` 라
**내 변경 때문인지 환경 문제인지 그 자리에서 구분이 안 된다.** 확인에 도구 호출 다섯 번이 들었다.

`LEARNINGS.md` 에 같은 유형(`[환경] 워크트리의 node_modules 가 비어 있는데 테스트는 돌았다`)이
이미 한 번 있다. **두 번째다.** CLAUDE.md §2.5 가 「두 번째면 기계가 막도록 옮긴다」고 정한다.

## Plan

### 할 일 1. 선언된 의존성이 실제로 설치됐는지 세는 검사

- **RED** — `check-deps.test.mjs`. 있는 패키지 하나와 없는 패키지 하나를 섞어 주면
  없는 것만 골라 낸다고 단언한다. 지금은 함수가 없어 실패한다
- **GREEN** — `check-deps.mjs`. `package.json` 의 `dependencies` + `devDependencies` 키를
  읽고 각각 `node_modules/<이름>/package.json` 이 있는지 본다. 없으면 목록과 함께 exit 1
- **REFACTOR** — 판정 함수와 출력을 가른다. 판별식이 함수만 부르게

**files**: `.claude/scripts/check-deps.mjs` · `.claude/scripts/check-deps.test.mjs`
**depends-on**: []
**검증**: `npm run check:workflow`

### 할 일 2. 검사를 npm 스크립트와 푸시 훅에 배선

- **RED** — `check-deps.test.mjs` 에 「`package.json` 에 `check:deps` 가 있다」를 더한다. 실패한다
- **GREEN** — `package.json` 에 `check:deps` 추가. `check:workflow` 가 `.claude/scripts/*.test.mjs`
  를 이미 전량 도므로 판별식은 자동으로 걸린다
- **REFACTOR** — 없음

**files**: `package.json` · `.claude/scripts/check-deps.test.mjs`
**depends-on**: [1]
**검증**: `npm run check:deps` · `npm run check:workflow`

### 할 일 3. LEARNINGS 에 적고 승격 표시

- 새 항목을 맨 위에 추가하고, 기존 `[환경] 워크트리의 node_modules` 항목에
  `→ check:deps 로 승격 (2026-09-18)` 을 붙인다 (§2.5 형식)

**files**: `docs/LEARNINGS.md`
**depends-on**: [2]
**검증**: 사람이 읽는다

## Plan 메타

할 일 3개 · 예상 묶음 3개(전부 직렬 — 파일이 겹치고 의존이 있다)
구현 규율: TDD · 추가 검증: `npm run typecheck` · `npm test`

## 리뷰 결과

**렌즈**: `gstack:/plan-eng-review` (2등급 = 1종) · 2026-09-18
**판정**: **BLOCKER 1건** · 주의 1건

### BLOCKER 1 — 디렉터리 존재 확인은 워크트리에서 거짓 양성을 낸다

할 일 1 이 「`node_modules/<이름>/package.json` 이 있는지 본다」고 적었다.
**이 검사는 이 문제가 실제로 터진 자리에서 틀린 답을 낸다.**

워크트리에는 자기 `node_modules` 가 없다. Node 는 상위로 올라가 저장소 루트의 것을 쓴다.
디렉터리만 보면 워크트리에서 전부 「없음」이 되어 **멀쩡한 환경을 빨간불로 만든다.**

실증 — 워크트리에서 `npm ls --depth=0` 을 돌리면 루트에 설치된 것까지
`UNMET DEPENDENCY` 로 찍고 종료 코드 1 을 낸다. 같은 결함이다.

**고칠 것** — `createRequire(...).resolve(<이름>)` 을 쓴다. Node 의 실제 해석 경로를
그대로 따라가므로 워크트리에서도 런타임과 같은 답이 나온다. 이게 판정의 정본이어야 한다.

### 주의 1 — `npm ls` 를 왜 안 쓰는지 계획에 남겨야 한다

사다리 3칸(내장 기능 먼저)을 밟으면 `npm ls --depth=0` 이 먼저 보인다. 실제로
누락을 잡고 종료 코드도 1 을 낸다. **그런데 위 실증대로 워크트리에서 거짓 양성이다.**

이 근거를 계획에 안 적으면 다음 사람이 같은 검토를 다시 한다. `check-deps.mjs` 머리
주석에 한 줄로 남긴다.

### 통과한 것

- 범위 — 파일 3개. 8개 미만이라 복잡도 경고 없음
- 할 일 3개 전부 `files` · `depends-on` · 검증 칸이 차 있다
- 계약 변경 0건 · 소유 경로 밖 수정 0건
- 완결성 — 검사 대상이 `dependencies` + `devDependencies` 전량. 축소 없음
