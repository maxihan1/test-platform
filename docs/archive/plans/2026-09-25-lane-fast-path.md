# 바뀐 만큼만 검사하는 차선(lane) 도입

등급: 2 · 갈래: 없음(하네스) · 2026-09-25

## 도메인 정리

제품 도메인은 건드리지 않는다. 표면은 GUARD(CI · 훅 · `.claude/scripts`), HARNESS(스킬 · CLAUDE.md), DOC 이다.
**맥 작성 경로는 바꾸지 않는다.** `cases-only.mjs` 와 `scripts/authoring-*.ts` 는 한 글자도 고치지 않는다.

## 왜

문서 한 줄만 바꿔도 CI 가 DB 준비 · migration · chromium 설치 · 전체 vitest 3회 · Playwright 를 전부 돈다. pre-push 도 전체 `npm test` 를 돌리고 오늘 날짜 검사 기록을 요구한다.

- **2026-09-25 실측**: 이 PR 의 빈 시작 커밋 push 에서 vitest 58초(1167건)가 돌았고, 끝에 「검사 기록 없음」으로 막혔다.
- **같은 막힘이 세 번째다**: LEARNINGS 09-23 · 09-24 에 이미 있다. CLAUDE.md §2.5 에 따라 이번에 기계로 막는다(할 일 5).

사용자 결정과 eng review 결정 D1~D6 은 `~/.claude/plans/gleaming-growing-oasis.md` 에 있다. 요약하면 이렇다.
- 차선 판정은 새 `lane.mjs` 가 한다.
- 판정을 못 하면 full 로 보낸다.
- 폴더를 훑는 검사 여섯은 항상 돈다.
- docs · spec 차선은 npm ci 를 생략한다.

## Plan

### 할 일 1. lane() 이 차선 넷을 판정한다

- **RED**: `lane.test.mjs` 에 표 테스트를 쓴다. `lane.mjs` 가 없어서 import 가 실패한다.
  - `docs/SETUP.md` → docs
  - `docs/spec/도메인/작성.md` → spec
  - `docs/SPEC.md` + `docs/HOOKS.md` → spec
  - 기존 폴더의 `tests/todo/x.spec.ts` → cases
  - `docs/cases/a.md` 와 `docs/SETUP.md` 가 섞이면 → docs. cases 판정이 먼저 거짓이 되고, 둘 다 DOC 이기 때문이다
  - `apps/admin/src/app.ts` → full
  - `docs/spec/x.md` + `apps/admin/src/app.ts` → full
  - `CLAUDE.md` → full (HARNESS)
  - `README.md` → docs
  - 빈 목록 → full
  - `..` 이 든 경로 → full
  - 미분류 경로(`foo/bar.txt`) → full
- **GREEN**: `lane(파일들, 기존폴더)` 를 쓴다. `테스트만인가` 가 참이면 cases 다. 아니면 `surfaces.mjs` 의 표로 표면을 매기고, 모두 DOC 이면 docs, 모두 DOC 또는 SPEC 이고 SPEC 이 하나 이상이면 spec, 그 밖은 full 이다.
- **REFACTOR**: 없음

**files**: `.claude/scripts/lane.mjs`, `.claude/scripts/lane.test.mjs`
**depends-on**: []
**검증**: `node --test .claude/scripts/lane.test.mjs`

### 할 일 2. lane.mjs CLI: 모르면 full

- **RED**: `lane.test.mjs` 에 CLI 테스트를 더한다. 아직 CLI 가 없어서 실패한다.
  - stdin 이 `docs/SETUP.md` 이고 인자가 `origin/main` → 표준출력 `lane=docs`, 종료 0
  - base 인자가 없다 → `lane=full`
  - 없는 ref → `lane=full`
  - 빈 stdin → `lane=full`
- **GREEN**: `cases-only.mjs` 처럼 `git ls-tree` 로 기존 폴더를 읽는다. 무엇이든 실패하면 `lane=full` 을 찍는다. 종료 코드는 늘 0 이다. CI 의 bash -e 를 죽이지 않기 위해서다.
- **REFACTOR**: 없음

**files**: `.claude/scripts/lane.mjs`, `.claude/scripts/lane.test.mjs`
**depends-on**: [1]
**검증**: `node --test .claude/scripts/lane.test.mjs`

### 할 일 3. 항상 도는 목록과 누락 감시

- **RED**: `always-tests.test.mjs` 를 쓴다. `package.json` 에 `test:always` 가 없어서 실패한다.
  - `package.json` 에 `test:always` 가 있다.
  - `apps` · `packages` · `scripts` 의 `*.test.ts(x)` 중 **저장소 파일을 `readFileSync` 로 읽는 것**은 전부 그 목록에 들어 있다. stdin(`readFileSync(0`)은 제외한다.
  - 목록에 적힌 파일은 실제로 존재한다.
- **GREEN**: `test:always` 를 `vitest run <여섯 파일>` 로 만든다. 감시 규칙에 걸리는 파일이 더 있으면 그것까지 넣는다.
- **REFACTOR**: 없음

**files**: `package.json`, `.claude/scripts/always-tests.test.mjs`
**depends-on**: []
**검증**: `node --test .claude/scripts/always-tests.test.mjs`

### 할 일 4. vitest 가 migration 변경에 전체를 다시 돈다

- **RED**: `always-tests.test.mjs` 에 단언을 더한다. `vitest.config.ts` 의 `forceRerunTriggers` 에 `db/migrations/**` 와 `db/init/**` 가 있어야 한다. 지금은 없어서 실패한다.
- **GREEN**: 설정에 두 줄을 넣는다. 기본값을 덮어쓰지 않도록 `configDefaults.forceRerunTriggers` 를 펼쳐서 이어 붙인다.
- **REFACTOR**: 없음

**files**: `vitest.config.ts`, `.claude/scripts/always-tests.test.mjs`
**depends-on**: [3]
**검증**: `node --test .claude/scripts/always-tests.test.mjs` 를 돌린다. 이어서 `npx vitest run --changed HEAD~0` 이 종료 0 인지 본다.

### 할 일 5. pre-push 를 차선 넷으로. 빈 시작 커밋은 통과

- **RED**: `hook-contract.test.mjs` 에 경우 셋을 더한다. 지금 훅은 셋 다 무거운 길로 보내서 실패한다.
  - docs 만 바뀐 push → `check:spec` 만 돈다. `npm test` 도 기록 요구도 없다.
  - spec 이 바뀐 push → `check:spec` 이 돌고, 기록이 없으면 막는다.
  - **diff 는 성공했는데 바뀐 파일이 0** → 검사 없이 통과한다(LEARNINGS 09-23 · 09-24 재현).
  - full 차선은 `npm test` 대신 `vitest run --changed origin/main` 과 `test:always` 를 돈다.
  - 기존 경우(cases 는 가볍게, 코드는 무겁게 + 기록 요구)는 그대로 통과해야 한다.
- **GREEN**: 훅의 `cases-only` 반복문을 `lane.mjs` 로 바꾼다. 여러 ref 를 push 하면 **가장 무거운 차선**을 고른다. diff 가 실패하면 full 이다.
- **REFACTOR**: 무거운 길의 「K1~K8」 문구를 K1~K10 으로 맞춘다. 가벼운 길 문구는 이미 K10 이다.

**files**: `.claude/hooks/pre-push`, `.claude/scripts/hook-contract.test.mjs`
**depends-on**: [2, 3]
**검증**: `node --test .claude/scripts/hook-contract.test.mjs`

### 할 일 6. CI 를 차선 넷으로

- **RED**: `ci-covers-tests.test.mjs` 의 허용 조건 표를 차선 모양으로 바꾼다. 지금 ci.yml 이 옛 `light` 출력을 써서 실패한다.
  - 골격 조건
  - 골격 && `lane == 'full'`
  - 골격 && `lane != 'docs' && lane != 'spec'`: npm ci · typecheck · check:tests · secret-names
  - 판정 줄의 모양
  - `check:spec` 이 모든 차선에서 돈다.
  - vitest 단계가 `--changed "$BASE"` 와 `test:always` 를 둘 다 부른다.
  - playwright 가 `--only-changed="$BASE"` 를 갖는다.
- **GREEN**: ci.yml 의 `light` 단계를 `lane` 단계로 바꾼다. 조건을 갈아 끼우고 npm ci 를 조건부로 만든다. vitest 는 1회 `--changed` 와 `test:always`, playwright 는 `--only-changed` 로 돈다. **job 이름 `check` 는 그대로 둔다.**
- **REFACTOR**: ci.yml 머리 주석의 표를 차선 넷으로 고친다.

**files**: `.github/workflows/ci.yml`, `.claude/scripts/ci-covers-tests.test.mjs`
**depends-on**: [2, 3]
**검증**: `node --test .claude/scripts/ci-covers-tests.test.mjs`

### 할 일 7. detect-tier 가 차선도 찍는다

- **RED**: `lane.test.mjs` 에 단언을 더한다. `detect-tier.mjs docs/spec/x.md` 의 출력에 `차선: spec` 줄이 있어야 한다. 지금은 없어서 실패한다.
- **GREEN**: detect-tier 가 `lane()` 을 불러 한 줄을 더 찍는다. 기존 폴더 목록은 필요 없다. `tests/**` 는 TESTS 등급 규칙이 따로 다룬다. cases 판정은 `ls-tree` 로 한다. 실패하면 빈 목록으로 둔다.
- **REFACTOR**: 없음

**files**: `.claude/scripts/detect-tier.mjs`, `.claude/scripts/lane.test.mjs`
**depends-on**: [1, 2]
**검증**: `node --test .claude/scripts/lane.test.mjs`

### 할 일 8. 체인 문구: 명세만 바뀌면 spec-review 와 게이트 2 만

- **RED**: `chain-contract.test.mjs` 에 단언을 더한다. 지금은 문구가 없어서 실패한다.
  - `tpx/SKILL.md` 에 「차선」 규칙 ⑤가 있다.
  - `tpx-review` 4단계가 `npm test` 전량 대신 `--changed` 와 `test:always` 를 부른다.
- **GREEN**: 두 스킬 문구를 고친다.
- **REFACTOR**: 없음

**files**: `.claude/skills/tpx/SKILL.md`, `.claude/skills/tpx-review/SKILL.md`, `.claude/scripts/chain-contract.test.mjs`
**depends-on**: [7]
**검증**: `node --test .claude/scripts/chain-contract.test.mjs`

### 할 일 9. 규칙 문구: §2.3, spec-review, HOOKS

- **RED**: 없음. 문서 할 일이다. 검증은 grep 과 check:spec 으로 한다.
- **GREEN**: 세 곳을 고친다.
  - CLAUDE.md §2.3: 병합 직전 전체 범위 · 다른 세션 규칙을 diff 1회로 바꾸고, 예외 문단을 차선 넷으로 바꾼다. 등급 요약 표 아래에 한 줄을 더한다.
  - spec-review: B9 를 차선 넷으로, G3 를 연속 3회에서 1회로 바꾼다.
  - `docs/HOOKS.md`: 「테스트만 바뀐 PR · push 는 가벼운 길」 절을 차선 넷으로 바꾼다.
- **REFACTOR**: LEARNINGS 09-23 · 09-24 두 항목을 한 줄로 줄이고 `→ pre-push 로 승격 (2026-09-25)` 를 붙인다.

**files**: `CLAUDE.md`, `.claude/skills/spec-review/SKILL.md`, `docs/HOOKS.md`, `docs/LEARNINGS.md`
**depends-on**: [5, 6]
**검증**: `npm run check:spec && grep -n "차선" CLAUDE.md docs/HOOKS.md .claude/skills/spec-review/SKILL.md`

## SPEC 동반 수정 (§2.7)

해당 없음. SPEC 은 건드리지 않는다. `작성.md:164` 와 `2-명세선언.md:106` 의 「테스트만 바뀐 PR 은 가벼운 길」은 cases 차선이 그대로 지킨다.

## Plan 메타

할 일 9개 · 예상 묶음 4개([1→2→7→8] · [3→4] · [5] · [6] 뒤에 [9]) · 구현 규율: TDD · 추가 검증: `npm run check:workflow && npm run check:spec`

## 리뷰 결과

`/plan-eng-review` CLEAR (2026-09-25, D1~D6). 4단계는 그 결과로 갈음한다. 할 일 5 의 「빈 커밋 통과」만 그 뒤에 더했다([2] LEARNINGS 승격). 이 항목은 게이트 1 에서 따로 본다.
