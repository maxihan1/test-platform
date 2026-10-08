# 하네스 마무리 — HAR-F1-25 · PR #178 이 미룬 둘

등급: 2 · 갈래: 없음(하네스) · 2026-10-08 · PR #181

## 도메인 정리

제품 도메인 건드리지 않음. 바꾸는 것은 체인 스킬(`tpx-review` · `tpx-impl`) · 에이전트 정의(`tpx-verifier`) · 안내 문서(`docs/HOOKS.md`) · 훅(`.claude/hooks/pre-push` · `guard.mjs review`) · 판별식 검사(`.claude/scripts/*.test.mjs`) · `package.json` 의 `check:docs-contract` 목록 · `ci.yml` 주석이다.

## 왜

진행판 `HAR-F1-25` 가 하네스 묶음에 남은 마지막 열린 항목이고, PR #179 진행 기록이 「진행판 번호 없이 여기만 남는다」고 적은 PR #178 미룬 둘이 있다. 이 PR 로 하네스 개편(PR #177 · #178 · #179)을 닫는다.

**① 렌즈의 검사 통과 확인 — 넘겨받은 결과를 쓴다(이 계획이 고른 길).** PR #179 게이트 2 에서 렌즈가 통과 표지를 읽는 조건을 세 회차 동안 세 번 고쳤고, 마지막 꼴(`find HEAD` 의 `reuse=` 한 줄)도 3회차 spec-review 기타 1 이 「`push` 표지만 있는 커밋도 받는다 — 그 표지는 타입 검사를 안 덮는다」로 걸었다(`docs/reviews/2026-10-08-하네스-179.md` 「3회차」).
까닭은 LEARNINGS 2026-10-08 「렌즈가 … 세 번 고쳤다」가 적었다 — `reuse=` 는 **pre-push 가 무엇을 건너뛸지** 정하는 판정이고, 렌즈의 물음(**이 HEAD 에서 검사 묶음이 초록인가**)과 다르다. 다른 물음에 같은 판정을 빌려 쓰니 고칠 때마다 다른 틈이 났다.
그래서 렌즈는 표지를 읽지 않는다. 컨트롤러가 렌즈 직전에 돈 `run local` 의 `EXIT=` 줄과 HEAD 40자를 넘겨받아 **넘겨받은 HEAD 가 지금 HEAD 와 같고 EXIT 줄이 전부 0 이면 인정한다.** 마지막 그물은 pre-push 와 CI 다(CI 를 통과해야 병합된다 — HOOKS 「CI 와 병합 차단」).
다른 길(`check-stamp.mjs` 에 EXIT · HEAD 대조 출력 줄을 더한다)은 렌즈 전용 판정을 스크립트에 하나 더 만드는 것이라 고르지 않았다. 넘겨받은 40자 HEAD 가 쓰이는 자리(3회차 code-review 경미)도 이 대조로 생긴다.

**② 2-C 기준이 검증자에게 닿지 않는다.** 검증자 정의(`tpx-verifier.md:9`)는 「부른 쪽이 넘긴 프롬프트와 그것이 가리킨 줄만 본다」고 하고, 2-C 새 기준(GREEN 이 검사 파일을 고쳤으면 계획 「구현 중 바뀐 것」과 대조)은 `tpx-impl` 에만 있다. 검증자는 `tpx-impl` 을 읽지 않는다(3회차 spec-review 기타 2). 늘 보는 기준이므로 정의에 넣는다.

**③ 문구.** `tpx-review` Step 7 게이트 2 서식에 Step 4 가 말하는 「독립 중대 — 검사 묶음이 이 HEAD 에서 초록인지 모른다」를 적을 자리가 없다. HOOKS 차선 표 `spec` 행 「위와 같은데」가 `docs` 행의 「전부 `DOC` 표면」을 물려받아 글자대로는 성립하지 않는다(명세는 `SPEC` 표면). `docs` · `spec` 행 CI 칸은 「`check:spec` 만」인데 실제 CI 는 모든 차선에서 설치 전에 `check:spec` · `check:docs-contract` · `check:wbs` 셋을 돈다(`ci.yml:76-89`), pre-push 칸도 `check:docs-contract` 를 빠뜨렸다(`pre-push:88-101`). `ci.yml:13-16` 주석이 같은 사본이다.

**④ 검사 단언.** `펜스안()` 이 펜스를 전부 이어 붙여 「general-purpose 는 한 펜스, opus 는 다른 펜스」여도 초록이다 — 호출 블록 하나를 골라야 한다. 같은 함수가 `agent-models.test.mjs:59` 와 `review-structure.test.mjs:50` 에 사본으로 있다. 차선 표 단언의 대조군은 `lane.mjs` 소스 글자를 grep 한다 — `lane()` 을 불러 본 결과로 바꾼다. `review-structure.test.mjs` 가 377줄로 CLAUDE.md §3 의 300줄을 넘는다.

**⑤ PR #178 이 미룬 둘.** pre-push 가 `$REFS` 를 같은 꼴로 네 번 읽는다(`pre-push:16-31 · 59-77 · 146-165 · 229-239` — 빈 줄 · 삭제 줄 거르기가 네 벌). 응답 끝 경고(`guard.mjs:194-231`)는 `git status` 만 읽어 커밋을 마친 2등급 작업에는 경고가 없다 — `/tpx` 는 할 일마다 커밋하므로 사실상 늘 조용하다.

**범위 밖(보고만)** — `chain-contract.test.mjs` 407줄 · `ci-covers-tests.test.mjs` 434줄도 300줄을 넘는다. 이번 지적 목록에 없고 원래 있던 것이라 손대지 않는다.

**확인 하나(할 일 아님)** — PR #177 이 남긴 「설정 `env` 의 `PONYTAIL_SUBAGENT_MATCHER` 가 SubagentStart 훅까지 닿는가」를 이번 [5] 의 대조 검증자 프롬프트에서 묻는다(「맥락에 PONYTAIL MODE ACTIVE 가 있나」). 결과는 게이트 2 요약에 싣는다.

## Plan

### 할 일 1. 검사 도우미를 한 곳으로 — 펜스는 호출 블록 하나만 · review-structure 를 둘로

- **RED** — `review-structure.test.mjs` 에 ① `md-sections.mjs` 의 `펜스블록(글, 표지)` 가 표지가 든 펜스 하나만 돌려준다(펜스 둘 — 앞엔 `general-purpose`, 뒤엔 `Agent({ model: "opus"` — 에서 `Agent({` 로 고르면 `general-purpose` 가 없다) ② `.claude/scripts/*.test.mjs` 어디에도 `const 펜스안` · `const 소절 =` 정의가 없다(사본 금지). 도우미 파일이 없고 사본이 둘 있어 지금 실패한다
- **GREEN** — `.claude/scripts/md-sections.mjs` 를 만들어 `소절`(지금 `review-structure.test.mjs:77-90` 그대로)과 `펜스블록` 을 내보낸다. `review-structure.test.mjs` · `agent-models.test.mjs` 가 import 해 쓰고 사본을 지운다. 계획 검토 호출 블록 단언(`review-structure.test.mjs:52-62`)과 `agent-models.test.mjs:61-` 은 `펜스블록(…, 'Agent({')` 한 블록에서 본다. 기존 `펜스안()` 헬퍼 단언(`:325-328`)은 `펜스블록` 단언으로 바꾼다
- **REFACTOR** — `review-structure.test.mjs` 를 둘로 나눈다. 새 `lens-handoff.test.mjs` 에 「렌즈에 넘기는 것」 정본 소절을 보는 검사(지금 `:106-147 · :239-279 · :330-340`)와 차선 표 검사(`:350-377`)를 옮긴다. 남는 쪽은 계획 검토 · Step 2/3 · 재검사 절. 둘 다 300줄 아래. `package.json` `check:docs-contract` 에 새 파일을 더한다. 옮긴 검사의 이름 · 단언은 바꾸지 않는다

**files**: .claude/scripts/md-sections.mjs · .claude/scripts/review-structure.test.mjs · .claude/scripts/lens-handoff.test.mjs · .claude/scripts/agent-models.test.mjs · package.json
**depends-on**: []
**검증**: `node --test .claude/scripts/review-structure.test.mjs .claude/scripts/lens-handoff.test.mjs .claude/scripts/agent-models.test.mjs && npm run check:docs-contract && wc -l .claude/scripts/review-structure.test.mjs .claude/scripts/lens-handoff.test.mjs`

### 할 일 2. pre-push 가 올릴 커밋 목록을 한 번만 뽑는다

- **RED** — `hook-contract.test.mjs` 에 훅 글자 단언 — `$REFS` 를 here-doc 으로 읽는 순회(`<<EOF` 다음 줄 `$REFS`)가 한 곳뿐이고, 그 뒤 순회는 `for local_sha in $SHAS` 꼴이다. 지금 네 곳이라 실패한다. 대조군 — 단언이 쓰는 정규식이 지금 훅에서 4 를 센다
- **GREEN** — `REFS=$(cat)` 바로 뒤 순회 하나로 `SHAS`(빈 줄 · 로컬 sha 가 전부 0 인 삭제 줄을 뺀 로컬 sha)를 만든다. 삭제만 판정은 `[ -n "$REFS" ] && [ -z "$SHAS" ]`, 차선 · 재사용 · 표지 순회 셋은 `for local_sha in $SHAS`. 입력이 비면 검사로 간다는 규칙 · 차선 순회의 `break` · 각 블록의 `[ -n "$REFS" ]` 조건은 그대로다. 주석의 「stdin 은 한 번만 읽힌다」 설명은 `SHAS` 에 맞게 한 줄 고친다
- **REFACTOR** — 없음

**files**: .claude/hooks/pre-push · .claude/scripts/hook-contract.test.mjs
**depends-on**: []
**검증**: `node --test .claude/scripts/hook-contract.test.mjs .claude/scripts/hook-reuse.test.mjs .claude/scripts/check-stamp-run.test.mjs`

### 할 일 3. 렌즈는 넘겨받은 EXIT 줄과 HEAD 로 인정한다 — 표지를 읽지 않는다

- **RED** — `lens-handoff.test.mjs` 의 표지 인정 검사(옛 「할 일 9 — 표지 인정은 렌즈가 find HEAD 를…」)를 새 규칙으로 바꾼다. 정본 소절에 ① 넘겨받은 HEAD 와 `git rev-parse HEAD`(지금 HEAD) 대조 ② `EXIT=` 줄이 전부 0 ③ 마지막 그물은 pre-push · CI ④ 컨트롤러는 커밋을 끝낸 뒤 `run local` 을 돌고 곧바로 렌즈를 낸다(사이에 커밋하면 다시 돈다)가 있다. 옛 「`check-stamp.mjs find` 는 정본 소절에만」 검사는 「체인 문서(`tpx*` · `spec-review`) 어디에도 `check-stamp.mjs find` 와 `reuse=` 가 없다」로 바꾼다. `tpx-review` Step 7 에 「초록인지 모른다」를 💡 줄에 싣는다는 문장이 있다. `HOOKS.md` `find` 출력 행이 「훅만 `reuse=` 줄을 읽는다」. 지금 문서가 옛 꼴이라 실패한다
- **GREEN** — `tpx-review` Step 4 「렌즈에 넘기는 것」의 `find HEAD` 줄을 넘겨받은 결과로 인정하는 줄로 바꾸고 까닭(`reuse=` 는 pre-push 의 건너뛰기 판정이라 물음이 다르다 · LEARNINGS 2026-10-08)을 한 마디 붙인다. `docs` · `spec` 차선 줄은 「`check:spec` 의 `EXIT=0` 한 줄이 넘어온다 — 같은 규칙」으로. Step 7 서식 위 산문에 「렌즈가 『검사 묶음이 이 HEAD 에서 초록인지 모른다』를 냈으면 💡 의미 첫 줄에 싣는다」. `HOOKS.md:218` 「훅 · 스킬은」 → 「훅만 `reuse=` 줄을 읽는다. 렌즈는 표지를 읽지 않는다(`tpx-review` Step 4 「렌즈에 넘기는 것」)」
- **REFACTOR** — `docs/LEARNINGS.md` 의 「렌즈가 「검사가 이 커밋에서 통과했나」를 …」 항목을 한 줄로 줄이고 `→ tpx-review Step 4 넘겨받은 EXIT · HEAD 대조로 승격 (2026-10-08)` 을 붙인다(CLAUDE.md §2.5)

**files**: .claude/skills/tpx-review/SKILL.md · docs/HOOKS.md · .claude/scripts/lens-handoff.test.mjs · docs/LEARNINGS.md
**depends-on**: [1]
**검증**: `node --test .claude/scripts/lens-handoff.test.mjs && npm run check:docs-contract && npm run check:spec`

### 할 일 4. 대조 검증자 정의에 「GREEN 이 고친 검사 파일」 기준을 늘 보는 것으로 넣는다

- **RED** — `agent-models.test.mjs` 에 `tpx-verifier.md` 본문이 ① 「GREEN 커밋이 검사 파일을 고쳤으면 계획 「구현 중 바뀐 것」에 그 줄이 있는지 본다 · 없으면 DRIFT」를 담고 ② 9줄의 「거기 적힌 대로만 본다」가 그 기준과 부딪히지 않게 「이 정의의 늘 보는 기준」을 함께 가리킨다. `tpx-impl` 2-C 의 그 줄이 정의를 가리킨다(`tpx-verifier.md`). 지금 정의에 없어 실패한다
- **GREEN** — `tpx-verifier.md` 에 늘 보는 기준 한 줄을 더하고 9줄을 「프롬프트와 그것이 가리킨 줄, 그리고 아래 늘 보는 기준」으로 고친다. `tpx-impl:79` 끝에 「— 검증자 정의(`tpx-verifier.md`)에 늘 보는 기준으로 있다」. 기존 단언(`agent-models.test.mjs:110-112`)은 그대로 초록이어야 한다
- **REFACTOR** — 없음

**files**: .claude/agents/tpx-verifier.md · .claude/skills/tpx-impl/SKILL.md · .claude/scripts/agent-models.test.mjs
**depends-on**: [1]
**검증**: `node --test .claude/scripts/agent-models.test.mjs`

### 할 일 5. HOOKS 차선 표를 실제 lane() · CI · pre-push 와 맞춘다

- **RED** — `lens-handoff.test.mjs` 차선 표 검사를 넓힌다. ① `spec` 행에 「위와 같은데」가 없고 조건(`lane()` · `문서자리` · `SPEC` 표면)을 스스로 적는다 ② `docs` 행 CI 칸이 `ci.yml` 에서 차선 조건 없이 도는 `npm run check:*` 전부(지금 `check:spec` · `check:docs-contract` · `check:wbs`)를 이름으로 담는다 — 목록은 `ci.yml` 을 읽어 뽑는다 ③ `docs` 행 pre-push 칸이 `pre-push` 의 `docs_checks()` 가 부르는 `npm run check:*` 전부를 담는다 — 훅 글자에서 뽑는다 ④ 대조군을 `lane.mjs` 소스 grep 대신 `lane()` 호출로 — `docs/spec/a.md` → `spec`, `docs/spec/a.md` + `docs/HOOKS.md` → `spec`, `docs/HOOKS.md` → `docs`, `docs/x.mjs` → `full`. 뽑은 목록이 비면 실패하는 대조군을 둔다. 지금 표가 「`check:spec` 만」이라 실패한다
- **GREEN** — `docs/HOOKS.md` 차선 표 `docs` · `spec` · `cases` 행 CI 칸을 「설치 전 문서 검사 셋(`check:spec` · `check:docs-contract` · `check:wbs`)」 기준으로, `docs` · `spec` 행 pre-push 칸을 `check:spec` · `check:docs-contract` 로, `spec` 행 조건을 스스로 적는다. 표 아래 `check:wbs` 줄은 CI 칸과 겹치지 않게 그대로 둔다. `ci.yml:13-16` 의 차선별 사본 네 줄은 지우고 정본 가리킴(12줄) · 「판정을 못 하면 full」 줄(17줄)만 남긴다(spec-review H6 — 정본 밖에서 옮겨 적지 않는다)
- **REFACTOR** — 없음

**files**: docs/HOOKS.md · .github/workflows/ci.yml · .claude/scripts/lens-handoff.test.mjs
**depends-on**: [1, 3]
**검증**: `node --test .claude/scripts/lens-handoff.test.mjs && npm run check:docs-contract && node --test .claude/scripts/ci-covers-tests.test.mjs`

### 할 일 6. 응답 끝 경고가 커밋을 마친 2등급 작업도 본다

- **RED** — `guard.test.mjs` review 모드 검사에 경우 둘 — 임시 저장소에 `refs/remotes/origin/main` 을 기준 커밋에 걸고 ① `apps/admin/src/execution/b.ts` 를 고쳐 **커밋**한 뒤 작업 폴더가 깨끗하면 경고(종료 1) ② 화면 파일만 커밋했으면 조용(종료 0). ①이 지금 0 이라 실패한다
- **GREEN** — `guard.mjs` review 모드가 `git status` 줄에 더해 `git diff --no-renames --name-only origin/main...HEAD -- apps packages tests` 경로도 `기록요구()` 에 넣는다. diff 가 실패하면(origin/main 없음) 커밋분은 빈 것으로 친다 — 응답마다 도는 경고라 모를 때 떠들지 않는다(지금 `status` 실패 때와 같다). 경고 본문 「변경된 파일」 목록에 커밋분도 싣는다. `HOOKS.md` 「응답 끝 경고」 행을 「커밋 안 된 것은 porcelain, 커밋된 것은 `origin/main...HEAD` 차이」로 고친다
- **REFACTOR** — 없음

**files**: .claude/scripts/guard.mjs · .claude/scripts/guard.test.mjs · docs/HOOKS.md
**depends-on**: [5]
**검증**: `node --test .claude/scripts/guard.test.mjs .claude/scripts/guard-wiring.test.mjs`

## SPEC 동반 수정 (§2.7)

해당 없음 — SPEC 안 건드림. 다만 §3 「같은 규칙 찾기」는 명세를 안 고치는 할 일에도 돈다 — 할 일 3 은 `reuse=` · `check-stamp.mjs find` · `find HEAD` 로, 할 일 5 는 `check:spec 만` · `위와 같은데` 로, 할 일 6 은 `응답 끝 경고` · `guard.mjs review` 로 `docs/` · `.claude/` · `CLAUDE.md` 를 훑어 남은 사본이 없는지 각 할 일 GREEN 에서 본다.

## Plan 메타

할 일 6개 · 예상 묶음 4개(① 1 · 2 ② 3 · 4 ③ 5 ④ 6) · 구현 규율: TDD · 추가 검증: `node .claude/scripts/check-stamp.mjs run local`(`package.json` 이 바뀌어 단위 테스트 전체 — 약 5분)

## 리뷰 결과
(계획 검토가 채운다)
