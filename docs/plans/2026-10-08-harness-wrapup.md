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

- **RED** — `review-structure.test.mjs` 에 ① `md-sections.mjs` 의 `펜스블록(글, 표지)` 가 표지가 든 펜스 하나만 돌려준다(펜스 둘 — 앞엔 `general-purpose`, 뒤엔 `Agent({ model: "opus"` — 에서 `Agent({` 로 고르면 `general-purpose` 가 없다) ② `review-structure.test.mjs` · `lens-handoff.test.mjs` · `agent-models.test.mjs` 세 파일에 줄 머리 `const 절 =` · `const 소절 =` · `const 펜스안` 정의가 없다(사본 금지 · 정규식은 줄 머리 고정 `m` 플래그라 제 단언 글자에 안 걸린다 · 「읽은 파일이 셋」 대조군 — 게이트 1 주의 2). `context-diet` · `cases-probe-contract` 의 `절` 은 범위 밖이라 안 본다. 도우미 파일이 없고 사본이 있어 지금 실패한다
- **GREEN** — `.claude/scripts/md-sections.mjs` 를 만들어 `절`(지금 `review-structure.test.mjs:12-18` 그대로) · `소절`(`:77-90` 그대로) · `펜스블록` 을 내보낸다. `review-structure.test.mjs` · `agent-models.test.mjs` 가 import 해 쓰고 사본을 지운다. 계획 검토 호출 블록 단언(`review-structure.test.mjs:52-62`)과 `agent-models.test.mjs:61-` 은 `펜스블록(…, 'Agent({')` 한 블록에서 본다. 기존 `펜스안()` 헬퍼 단언(`:325-328`)은 `펜스블록` 단언으로 바꾼다
- **REFACTOR** — `review-structure.test.mjs` 를 둘로 나눈다. 새 `lens-handoff.test.mjs` 에 「렌즈에 넘기는 것」 정본 소절을 보는 검사(지금 `:106-147 · :239-279 · :330-340`)와 차선 표 검사(`:350-377`)를 옮긴다. 남는 쪽은 계획 검토 · Step 2/3 · 재검사 절. 둘 다 300줄 아래. `package.json` `check:docs-contract` 에 새 파일을 더한다. 옮긴 검사의 이름 · 단언은 바꾸지 않는다

**files**: .claude/scripts/md-sections.mjs · .claude/scripts/review-structure.test.mjs · .claude/scripts/lens-handoff.test.mjs · .claude/scripts/agent-models.test.mjs · package.json
**depends-on**: []
**검증**: `node --test .claude/scripts/review-structure.test.mjs .claude/scripts/lens-handoff.test.mjs .claude/scripts/agent-models.test.mjs && npm run check:docs-contract && wc -l .claude/scripts/review-structure.test.mjs .claude/scripts/lens-handoff.test.mjs`

### 할 일 2. pre-push 가 올릴 커밋 목록을 한 번만 뽑는다

- **RED** — `hook-contract.test.mjs` 에 훅 글자 단언 — `$REFS` 를 here-doc 으로 읽는 순회(`<<EOF` 다음 줄 `$REFS`)가 한 곳뿐이고, 그 뒤 순회는 `for local_sha in $SHAS` 꼴이다. 지금 네 곳이라 실패한다. 대조군 — 단언이 쓰는 정규식이 지금 훅에서 4 를 센다. **회귀 검사 하나 더(지금 훅에서도 초록 — 게이트 1 주의 3)** — `hook-fixture.mjs` 임시 저장소로 삭제 줄과 문서만 바꾼 커밋 ref 를 함께 넣으면 `차선: docs` 가 찍히고 검사 기록 없이 통과한다(SHAS 가 삭제 줄을 못 거르면 `full` 로 가서 빨개진다)
- **GREEN** — `REFS=$(cat)` 바로 뒤 순회 하나로 `SHAS`(빈 줄 · 로컬 sha 가 전부 0 인 삭제 줄을 뺀 로컬 sha)를 만든다. 삭제만 판정은 `[ -n "$REFS" ] && [ -z "$SHAS" ]`, 차선 · 재사용 · 표지 순회 셋은 `for local_sha in $SHAS`. 입력이 비면 검사로 간다는 규칙 · 차선 순회의 `break` · 각 블록의 `[ -n "$REFS" ]` 조건은 그대로다. 주석의 「stdin 은 한 번만 읽힌다」 설명은 `SHAS` 에 맞게 한 줄 고친다
- **REFACTOR** — 없음

**files**: .claude/hooks/pre-push · .claude/scripts/hook-contract.test.mjs
**depends-on**: []
**검증**: `node --test .claude/scripts/hook-contract.test.mjs .claude/scripts/hook-reuse.test.mjs .claude/scripts/check-stamp-run.test.mjs`

### 할 일 3. 렌즈는 넘겨받은 EXIT 줄과 HEAD 로 인정한다 — 표지를 읽지 않는다

- **RED** — `lens-handoff.test.mjs` 의 표지 인정 검사(옛 「할 일 9 — 표지 인정은 렌즈가 find HEAD 를…」)를 새 규칙으로 바꾼다. 정본 소절에 ① 넘겨받은 HEAD 와 `git rev-parse HEAD`(지금 HEAD) 대조 ② `EXIT=` 줄이 전부 0 ③ 넘겨받은 `run local` 의 `[check-stamp]` 줄이 「local 표지를 남겼다: <지금 HEAD 40자>」 또는 「앞 커밋의 local 표지를 재사용했다」 — 커밋 안 된 코드를 얹고 돈 결과를 거른다(표지 저장소를 읽지 않고 실행 출력만 본다 · 게이트 1 주의 1). `docs` · `spec` 차선은 `check:spec` `EXIT=0` 에 더해 렌즈가 `git status --porcelain` 에 문서 자리 밖 경로가 없는지 본다 ④ 마지막 그물은 pre-push · CI ⑤ 컨트롤러는 커밋을 끝낸 뒤 `run local` 을 돌고 곧바로 렌즈를 낸다(사이에 커밋하면 다시 돈다)가 있다. 넘길 것 목록은 개수를 적지 않는다(「네 가지」 → 「아래를」 — `[check-stamp]` 줄이 더해진다). 옛 「`check-stamp.mjs find` 는 정본 소절에만」 검사(지금 `review-structure:330-340`)는 「체인 문서(`tpx*` · `spec-review`) 어디에도 `check-stamp.mjs find` 와 `reuse=` 가 없다」로 바꾸고 `:334` 대조군(읽은 목록에 `tpx-review/SKILL.md` · `checklist-g-h.md`)은 남긴다. **옮긴 「할 일 4 — 정본 소절이 Step 4 안에 있고 …」(지금 `review-structure:106-121`)의 `:118` 이 요구하는 `'check-stamp.mjs find'` · `'reuse='` 는 새 낱말(`지금 HEAD` · `EXIT=` · `[check-stamp]` · `pre-push` · `CI`)로 바꾼다** — 새 규칙이 두 글자를 금하기 때문이다(게이트 1 BLOCKER). `tpx-review` Step 7 에 「초록인지 모른다」를 💡 줄에 싣는다는 문장이 있다. `HOOKS.md` `find` 출력 행이 「훅만 `reuse=` 줄을 읽는다」. 지금 문서가 옛 꼴이라 실패한다
- **GREEN** — `tpx-review` Step 4 「렌즈에 넘기는 것」의 `find HEAD` 줄을 넘겨받은 결과로 인정하는 줄로 바꾸고 까닭을 `reuse=` 글자 없이 한 마디 붙인다 — 「통과 표지의 재사용 판정은 pre-push 가 무엇을 건너뛸지 정하는 것이라 렌즈의 물음과 다르다(LEARNINGS 2026-10-08)」. `docs` · `spec` 차선 줄은 RED ③ 꼴로. Step 7 서식 위 산문에 「렌즈가 『검사 묶음이 이 HEAD 에서 초록인지 모른다』를 냈으면 💡 의미 첫 줄에 싣는다」. `HOOKS.md:218` 「훅 · 스킬은」 → 「훅만 `reuse=` 줄을 읽는다. 렌즈는 표지를 읽지 않는다(`tpx-review` Step 4 「렌즈에 넘기는 것」)」
- **REFACTOR** — `docs/LEARNINGS.md` 의 「렌즈가 「검사가 이 커밋에서 통과했나」를 …」 항목을 한 줄로 줄이고 `→ tpx-review Step 4 넘겨받은 EXIT · HEAD 대조로 승격 (2026-10-08)` 을 붙인다(CLAUDE.md §2.5)

**files**: .claude/skills/tpx-review/SKILL.md · docs/HOOKS.md · .claude/scripts/lens-handoff.test.mjs · docs/LEARNINGS.md
**depends-on**: [1]
**검증**: `node --test .claude/scripts/lens-handoff.test.mjs .claude/scripts/chain-contract.test.mjs && npm run check:docs-contract && npm run check:spec`

### 할 일 4. 대조 검증자 정의에 「GREEN 이 고친 검사 파일」 기준을 늘 보는 것으로 넣는다

- **RED** — `agent-models.test.mjs` 에 `tpx-verifier.md` 본문이 ① 「GREEN 커밋이 검사 파일을 고쳤으면 계획 「구현 중 바뀐 것」에 그 줄이 있는지 본다 · 없으면 DRIFT」를 담고 ② 9줄의 「거기 적힌 대로만 본다」가 그 기준과 부딪히지 않게 「이 정의의 늘 보는 기준」을 함께 가리킨다. `tpx-impl` 2-C 의 그 줄이 정의를 가리킨다(`tpx-verifier.md`). 지금 정의에 없어 실패한다
- **GREEN** — `tpx-verifier.md` 에 늘 보는 기준 한 줄을 더하고 9줄을 「프롬프트와 그것이 가리킨 줄, 그리고 아래 늘 보는 기준」으로 고친다. `tpx-impl:79` 끝에 「— 검증자 정의(`tpx-verifier.md`)에 늘 보는 기준으로 있다」. 기존 단언(`agent-models.test.mjs:110-112`)은 그대로 초록이어야 한다
- **REFACTOR** — 없음

**files**: .claude/agents/tpx-verifier.md · .claude/skills/tpx-impl/SKILL.md · .claude/scripts/agent-models.test.mjs
**depends-on**: [1]
**검증**: `node --test .claude/scripts/agent-models.test.mjs`

### 할 일 5. HOOKS 차선 표를 실제 lane() · CI · pre-push 와 맞춘다

- **RED** — `lens-handoff.test.mjs` 차선 표 검사를 넓힌다. ① `spec` 행에 「위와 같은데」가 없고 조건(`lane()` · `문서자리` · `SPEC` 표면)을 스스로 적는다 ② `docs` · `spec` · `cases` 행 CI 칸이 `ci.yml` 에서 차선 조건 없이 도는 `npm run check:*` 전부(지금 `check:spec` · `check:docs-contract` · `check:wbs`)를 이름으로 담는다 — 목록은 `ci.yml` 을 읽어 뽑는다 ③ `docs` · `spec` 행 pre-push 칸이(게이트 1 주의 4) `pre-push` 의 `docs_checks()` 가 부르는 `npm run check:*` 전부를 담는다 — 훅 글자에서 뽑는다 ④ 대조군을 `lane.mjs` 소스 grep 대신 `lane()` 호출로 — `docs/spec/a.md` → `spec`, `docs/spec/a.md` + `docs/HOOKS.md` → `spec`, `docs/HOOKS.md` → `docs`, `docs/x.mjs` → `full`. 뽑은 목록이 비면 실패하는 대조군을 둔다. 지금 표가 「`check:spec` 만」이라 실패한다
- **GREEN** — `docs/HOOKS.md` 차선 표 `docs` · `spec` · `cases` 행 CI 칸을 「설치 전 문서 검사 셋(`check:spec` · `check:docs-contract` · `check:wbs`)」 기준으로, `docs` · `spec` 행 pre-push 칸을 `check:spec` · `check:docs-contract` 로, `spec` 행 조건을 스스로 적는다. 표 아래 `check:wbs` 줄은 CI 칸과 겹치지 않게 그대로 둔다. `ci.yml:13-16` 의 차선별 사본 네 줄은 지우고 정본 가리킴(12줄) · 「판정을 못 하면 full」 줄(17줄)만 남긴다(spec-review H6 — 정본 밖에서 옮겨 적지 않는다). `tpx/SKILL.md:113` · `tpx-review:81` · `hook-contract.test.mjs:167` 의 「`check:spec` 만」은 세션이 직접 도는 명령이라 CI 표 사본이 아니다 — 그대로 둔다
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

### 할 일 7. 보조 에이전트 모델 배분 — Haiku 5.5 병합 대기 · 실패 로그 요약 · Sonnet 관련 파일 찾기 (계획 검토 뒤 사용자 요청으로 더함)

사용자 결정(2026-10-08) — 「품질을 떨어뜨리지 않는 전제로 Haiku 가 들어갈 만한 곳에는 Haiku 로」. 기준은 **입력이 크고 판단이 적으며, 결과를 컨트롤러가 바로 확인할 수 있는 일**이다. 명령 한 번짜리(상황판 갱신 · `run local`)는 보조 에이전트를 띄우는 비용이 더 커서 넣지 않는다. 판단 일(대조 검증 · 「같은 규칙인가」 · 검토 렌즈 · 작성 에이전트)은 그대로다.
`tpx-merge` 는 Step 2 · 3 만 넘긴다 — Step 1 기록은 대화 맥락이 있어야 하고, Step 4 의 작업방 나오기(ExitWorktree)와 진행판 게시(Artifact)는 메인 세션 도구라 보조 에이전트가 쓸 수 있는지 확인하지 않았다. Step 2 의 CI 기다림이 확인을 여러 번 되풀이하는 구간이다.

effort(2026-10-08 사용자와 정함) — Haiku 5.5 는 `low`~`max` 를 받고 기본은 `medium` 이다(claude-api 참조). `tpx-runner` 는 정의 머리 `effort: low` — 사용자 제안(「단순한 거니까 low」)을 받았다. 절차가 정본 파일에 다 적혀 있어 깊게 생각할 몫이 없고, low 는 명령을 적게 · 묶어서 돌려 빠르다. 대신 메인이 두 번 확인한다 — 병합 뒤 메인이 `gh pr view <번호> --json state` 로 MERGED 를 직접 보고, 로그 요약은 로그 파일 경로 · 줄 번호를 같이 받아 메인이 그 줄을 열어 본 뒤 고친다. `Explore` 는 호출 블록에 `model: "sonnet"` · `effort: "medium"` — 찾기의 품질 위험은 빠뜨림이다(#159 사본 둘을 놓침). 처음엔 Haiku max 로 정했다가 사용자가 「찾기는 Sonnet 으로」를 골랐다. effort 는 같은 Sonnet 인 대조 검증자(medium · 2026-10-06 사용자 배분)와 맞추고, claude-api 안내도 Sonnet 5.5 의 여러 단계 도구 사용은 medium 부터라 한다. 에이전트 도구가 부를 때 effort 를 받으므로 `tpx-impl` 의 「effort 는 정하지 못한다」 · `agent-models.test.mjs:1-2` 주석 「effort 는 호출 때 못 정하고」를 지금 사실대로 고친다.

- **RED** — `agent-models.test.mjs` 에 ① `.claude/agents/tpx-runner.md` 가 `model: haiku` · `effort: low` · `tools` 허용 목록 `Bash, Glob, Grep, Read`(고치기 도구 · Agent 없음)이고, 본문이 로그 요약의 꼴(실패한 명령 · 검사 이름 · **원문 그대로의 에러 줄** · `파일:줄`, 고칠 방법은 내지 않는다)을 적는다 ② `tpx-merge` 가 Step 2 · 3 을 `subagent_type: "tpx-runner"` 로 내고 정의를 못 찾으면 `general-purpose` · `model: "haiku"`, Step 1 · Step 4 이후는 메인에 남는다 ③ `tpx-review` Step 4 가 `EXIT` 가 0 이 아닌 명령의 로그 요약을 `tpx-runner` 에 맡긴다(로그 폴더 경로를 넘긴다) ④ `tpx-plan` 이 고칠 자리 · 낱말 · 호출처 · 그 경로를 읽는 검사 찾기를 `subagent_type: "Explore"` · `model: "sonnet"` · `effort: "medium"` 으로 내고, 받은 `파일:줄` 은 컨트롤러가 그 줄을 열어 확인하며 「같은 규칙인가」 판단은 컨트롤러가 한다. 정의 · 문장이 없어 지금 실패한다. 호출 블록 단언은 할 일 1 의 `펜스블록()` 으로 본다
- **GREEN** — 정의 파일 하나와 스킬 세 곳에 몇 줄씩. 로그 요약의 꼴은 정의 한 곳에만 적고 스킬은 정의를 가리킨다(spec-review H6). `tpx-merge` CI 빨강 때도 같은 정의로 `gh run view <번호> --log-failed` 요약을 받는다
- **REFACTOR** — 없음

**files**: .claude/agents/tpx-runner.md · .claude/skills/tpx-merge/SKILL.md · .claude/skills/tpx-merge/references/1-record-ready-merge.md · .claude/skills/tpx-review/SKILL.md · .claude/skills/tpx-plan/SKILL.md · .claude/skills/tpx-impl/SKILL.md · .claude/scripts/agent-models.test.mjs
**depends-on**: [3, 4]
**검증**: `node --test .claude/scripts/agent-models.test.mjs .claude/scripts/chain-contract.test.mjs`

## SPEC 동반 수정 (§2.7)

해당 없음 — SPEC 안 건드림. 다만 §3 「같은 규칙 찾기」는 명세를 안 고치는 할 일에도 돈다 — 할 일 3 은 `reuse=` · `check-stamp.mjs find` · `find HEAD` 로, 할 일 5 는 `check:spec 만` · `위와 같은데` 로, 할 일 6 은 `응답 끝 경고` · `guard.mjs review` 로 `docs/` · `.claude/` · `CLAUDE.md` 를 훑어 남은 사본이 없는지 각 할 일 GREEN 에서 본다.

## Plan 메타

할 일 7개 · 예상 묶음 4개(① 1 · 2 ② 3 · 4 ③ 5 · 7 ④ 6) · 구현 규율: TDD · 추가 검증: `node .claude/scripts/check-stamp.mjs run local`(`package.json` 이 바뀌어 단위 테스트 전체 — 약 5분)

## 리뷰 결과
(계획 검토가 채운다)

**렌즈**: 공학 (2등급 = 1종, Opus) · 2026-10-08 · 약 9.5분
**판정**: BLOCKER 1건 · 주의 4건

### BLOCKER 1 — 할 일 3 의 RED 와 GREEN 이 부딪히고, 옮겨 갈 기존 검사 하나가 바꿀 목록에서 빠졌다 (E4)
RED 는 「체인 문서 어디에도 `check-stamp.mjs find` 와 `reuse=` 가 없다」를 단언하는데 GREEN 은 tpx-review Step 4 에 「`reuse=` 는 … 물음이 다르다」를 적으라 한다. `review-structure.test.mjs:106-121`(118줄)은 정본 소절에 `check-stamp.mjs find` · `reuse=` 가 **있어야** 통과하는데 할 일 3 의 바꿀 검사 목록(239-252 · 330-340)에 없다.
왜 문제 — GREEN 을 쓰면 검사 둘이 빨개지고 고칠 근거가 계획에 없다. 구현자가 근거 없이 검사를 고치거나(CLAUDE.md §5) GREEN 을 덜 쓴다. 대조 검증자가 DRIFT 를 낸다.
고칠 것 — ① 118줄의 두 낱말을 새 낱말(`지금 HEAD` · `EXIT=` · `pre-push` · `CI`)로 바꾼다고 RED 에 적는다 ② 까닭 문장을 `reuse=` 글자 없이 쓰거나 금지 단언을 `check-stamp.mjs find` 하나로 좁힌다 ③ 334줄 대조군(읽은 목록에 tpx-review · checklist-g-h 가 있다)을 남긴다.

### 주의 1 — 커밋 안 된 코드를 얹은 채 돈 run local 도 새 조건에서는 이 HEAD 의 초록으로 통과한다 (할 일 3 · E3)
`run local` 은 작업 폴더가 더러워도 EXIT=0 을 찍고 표지만 거절한다(`check-stamp.mjs:77 · 85 · 147-148`). 지금 방식은 「깨끗한 HEAD 에서 돌았다」도 보장했는데 새 방식은 잃는다. CI 가 마지막에 막지만 렌즈 인정에 새 틈이 생긴다.
고칠 것 — 컨트롤러가 `run local` 의 `[check-stamp]` 줄도 넘긴다. 렌즈는 「local 표지를 남겼다: <지금 HEAD 40자>」이거나 「앞 커밋의 local 표지를 재사용했다」일 때만 인정한다(표지 저장소를 읽지 않고 실행 출력만 본다). docs · spec 차선은 `git status --porcelain` 에 문서 자리 밖 경로가 없는지 본다.

### 주의 2 — `절()` 도우미가 빠져 lens-handoff 에 새 사본이 생긴다 (할 일 1 · E2)
옮길 검사가 `절(글, '## Step 4')` · `절(read(SR), '## 절차')` · `절(read(TPX), '## 차선')` 도 부른다. md-sections.mjs 가 `절` 도 내보내고, RED ② 는 review-structure · lens-handoff · agent-models 세 파일에 `^const 절 =` · `^const 소절 =` · `^const 펜스안` 이 없다(m 플래그 · 「읽은 파일이 셋」 대조군)로 바꾼다. context-diet · cases-probe-contract 의 `절` 은 범위 밖.

### 주의 3 — 할 일 2 는 글자 단언뿐이라 SHAS 에 삭제 줄이 섞여도 못 잡는다 (E4)
기존 「삭제와 코드 push 가 섞이면」(hook-contract.test.mjs:61-67)은 「검사 시작」만 본다. 삭제 줄 + 문서만 바꾼 커밋 ref 를 함께 넣으면 `차선: docs` 가 찍히고 기록 없이 통과해야 한다는 임시 저장소 검사를 회귀 검사로 더한다(지금 훅에서도 초록).

### 주의 4 — 할 일 5 의 ② · ③ 이 `docs` 행만 고정해 고치려는 `spec` 행 칸에는 검사가 없다 (E4)
② · ③ 을 `docs` · `spec` 두 행에 똑같이 걸고, `cases` 행 CI 칸에도 ② 목록을 건다.

### 참고(지적 아님)
- docs · spec 차선의 렌즈 인정은 `check:spec` 하나인데 pre-push · CI 는 `check:docs-contract` 도 돈다 — 범위 밖이면 보고만
- `check:spec 만` 낱말 찾기에 tpx/SKILL.md:113 · tpx-review:81 · hook-contract.test.mjs:167 이 걸리지만 세션이 직접 도는 명령이라 CI 표 사본이 아니다 — 그대로 둔다고 적어 두면 구현자가 files 밖을 안 고친다
- 할 일 3 검증에 `chain-contract.test.mjs` 를 더하면 좋다(Step 4 「재사용」 단언 · 스킬 200줄 상한)
- 묶음 ① 뒤로 이 브랜치의 run local 은 매번 전체 `npm test`(약 5분)

### 통과한 것
- E1 범위 — 여섯 할 일이 HAR-F1-25 · #178 미룬 둘에 걸린다. 고르지 않은 길과 까닭이 있다
- E2 계약 · 정본 — 계약 넷 안 건드림. ci.yml 사본을 지우고 HOOKS 를 정본으로. 표 단언이 ci.yml · 훅 글자에서 목록을 뽑는다
- E3 실패 경로 — 할 일 6 origin/main 없음 처리 · 할 일 2 빈 입력 · `break` 유지
- E5 시간 — 새 대기 없음

## 게이트 1 결정

지적 반영하고 진행 (2026-10-08 사용자). BLOCKER 1 · 주의 1~4 · 참고 2 · 3 을 할 일 1 · 2 · 3 · 5 블록 안에 「게이트 1」 표시로 넣었다. 재검토는 안 한다. 참고 1(docs · spec 차선 렌즈 인정이 `check:docs-contract` 를 안 봄)은 범위 밖 — 게이트 2 요약에 싣는다.

## 구현 중 바뀐 것

- 할 일 1 — RED 의 사본 금지 검사 대조군을 처음엔 「읽은 파일 ≥ 2」로 썼다가 REFACTOR(`ecfdaca6`)에서 `lens-handoff.test.mjs` 가 생긴 뒤 계획대로 「정확히 셋」으로 조였다. GREEN 이 lens-handoff 없이도 초록이어야 했기 때문이다. GREEN 에서 고친 RED 단언은 없다
- 할 일 2 — RED 가 따로 커밋되지 않았다. 같은 작업방에서 병렬로 돈 할 일 1 구현자의 GREEN 커밋 `620d3ae2` 가 할 일 2 구현자가 `hook-contract.test.mjs` 에 더한 +23줄(글자 단언 · 삭제 줄 회귀 검사)을 쓸어 담았다. RED 가 빨간 것은 할 일 2 구현자가 훅을 고치기 전에 확인했다(`not ok 18 - REFS 를 here-doc 으로 읽는 순회는 한 곳뿐이고 …` · 회귀 검사 `ok 19`). 아직 push 전이지만 기록을 다시 쓰지 않았다 — 대조 검증은 `620d3ae2` 의 `hook-contract.test.mjs` 부분을 할 일 2 RED 로 본다. GREEN(`77169b68`)이 RED 단언을 고친 곳은 없다
- 할 일 3 — 계획에 없던 단언을 더했다 — 정본 소절에 「네 가지」 없음 · `check-stamp.mjs` 소스에 문서가 옮긴 출력 글자(`표지를 남겼다: ${sha}` · `앞 커밋의 local 표지를 재사용했다`)가 있음 · Step 7 에 「초록인지 모른다」와 💡 · HOOKS `find` 출력 행에 「훅만」 · 「렌즈는 표지를 읽지 않는다」. Step 2 의 「네 가지」도 손으로 센 개수라 「목록」으로 바꿨다. LEARNINGS 항목은 본문 두 줄을 지우고 한 줄 제목 + 승격 표시로(다른 승격 항목과 같은 꼴). GREEN(`0f51f121`)이 RED 단언을 고친 곳은 없다
- 할 일 4 — 계획의 `검증` 칸이 `agent-models.test.mjs` 하나라, GREEN(`6c084fd9`)이 `tpx-verifier.md` 첫 줄을 바꾸며 그 문구를 지키던 `context-diet.test.mjs:121`(「프롬프트와 그것이 가리킨 줄이 정본」)을 깬 것을 구현자가 못 봤다. 할 일 3 구현자가 `check:docs-contract` 에서 찾았다. 검사는 고치지 않고 정의 첫 줄을 두 단언에 맞게 다시 쓰는 보강 커밋을 냈다
- 할 일 7 — 사용자 질문(「Haiku effort 는?」 · 「max 가 낫지 않나?」) 뒤 effort 를 정했다. `tpx-runner` low(사용자 제안 — 메인이 MERGED · 로그 줄을 다시 확인) · `Explore` 는 사용자가 「찾기는 Sonnet 으로」를 골라 Haiku max → Sonnet medium. 에이전트 도구가 부를 때 effort 를 받아 `tpx-impl` 문장 · `agent-models` 주석을 고치므로 files 에 `tpx-impl/SKILL.md` 를 더했다
