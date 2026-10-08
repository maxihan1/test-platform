# 하네스 PR 3 — 검토 구조 정리 (HAR-F1-24)

등급: 2 · 갈래: 없음(하네스) · 2026-10-08 · PR #179

## 도메인 정리

제품 도메인 건드리지 않음. 체인 스킬(`tpx` · `tpx-plan-review` · `tpx-impl` · `tpx-review` · `tpx-spec`) · `spec-review` · 문서 검사(`.claude/scripts/*.test.mjs`) · pre-push 주석 · `docs/HOOKS.md` 만 바뀐다.
계약 넷(§1.2) 변경 없음 · 명세 변경 없음.

## 왜

PR #177 · #178 조사(2026-10-08)에서 시간이 검토 단계에 몰렸다.

- **렌즈가 검사를 다시 돈다.** PR #178 3회차 spec-review 가 `.claude/scripts` 검사 161건 · `ALLOW_PROTECTED=1` 44건 · `check:spec` · `check:docs-contract` · `isBanned()` 13개 · 부숴 보기 둘을 직접 돌렸다(`docs/reviews/2026-10-08-하네스-178.md:127-131`). 한 번에 11~17분. 컨트롤러가 이미 `check-stamp.mjs run local` 로 같은 검사를 돌린 뒤였다. 사용자 말: 「스펙 리뷰도 변경된 것만 … 10분 이상 걸릴 게 아닌 것 같은데」
- **계획 검토가 gstack 스킬을 통째로 싣는다.** `plan-eng-review` 본문 725줄 + 검토 절 파일 1443줄. 대부분 대화형 질문 · 기록 파일 · telemetry(사용 기록 전송) 절차라 이 체인에서는 세 마디로 꺼 두는 부분이다. 실제 검토 기준은 범위 · 구조 · 코드 품질 · 테스트(회귀 규칙) · 성능 다섯 덩어리다
- **대조 검증이 할 일마다 하나씩 뜬다.** 같은 묶음의 할 일 넷이면 검증자 넷이 같은 계획 파일을 따로 연다
- **code-review 강도 · 범위가 매번 다르다.** 지난 세션 기록에서 `args` 가 `medium`(10번) · `high`(4번) · `low`(2번)처럼 강도만 준 호출이 대부분이다. 강도를 안 주면 마지막에 친 강도를 다시 쓰고, 범위를 안 주면 「지금 커밋 안 된 변경」을 본다. `low origin/main...HEAD in <작업방>` 꼴은 두 번 먹혔다
- **#177 · #178 이 남긴 작은 지적 10건**(`docs/progress/하네스.md` 2026-10-08 두 항목)

LEARNINGS 근거 — `docs/LEARNINGS.md` 「[WS-E] 2026-10-08 · **컨트롤러가 구현자 지시문을 계획과 다르게」(대조 검증은 계획 파일 원문 기준을 지킨다) · 「[환경] 2026-10-06 · **게이트 2 「부숴 보기」로」(보안 장치는 부수지 않고 RED 커밋을 근거로).

## Plan

### 할 일 1. 계획 검토를 저장소 안 짧은 기준으로 바꾼다

- **RED** — 새 `.claude/scripts/review-structure.test.mjs` 가 단언한다. ① `tpx-plan-review/SKILL.md` 에 `plan-eng-review` · `plan-ceo-review` · `plan-design-review` · `gstack:` 글자가 없다 ② `tpx-plan-review/references/lenses.md` 에 `## 공학` · `## 제품` · `## 화면` 세 절이 있고 절마다 번호 붙은 항목(`E1` · `P1` · `D1` 꼴)이 있다 ③ SKILL.md Step 1 표가 등급마다 그 세 절을 가리킨다 ④ 렌즈를 `subagent_type: "general-purpose"` · `model: "opus"` 로 내고 프롬프트에 lenses.md 절 위치 · 계획 파일 경로 · 작업방 절대경로를 싣는다 ⑤ `tpx/SKILL.md` 「등급별 절차」 표 「계획 검토」 행에 `/plan-eng-review` · `/plan-ceo-review` 가 없다. 지금은 gstack 을 부르므로 ①⑤ 가 빨갛다
- **GREEN** — `references/lenses.md` 신설(아래 항목). SKILL.md Step 1 표 · Step 2 호출을 「lenses.md 의 해당 절을 Opus 서브 에이전트 하나씩 · 한 응답에 함께」로 고친다. 세 마디(`비대화형으로 한 번만` · `계획을 고치지 말고` · `재검토 루프를 돌리지 마라`)는 프롬프트에 그대로 남긴다 — 서브 에이전트도 묻거나 계획을 고칠 수 있다. 머리 `description` 의 「gstack 렌즈로」도 고친다. `tpx/SKILL.md` 등급표 행은 `공학 렌즈` / `위 + 제품 렌즈`(화면이면 화면 렌즈)로
  - lenses.md 항목 — **공학**(2등급+) E1 범위(이미 있는 스크립트 · 검사로 되나 · 더 작은 길 · `files` 가 범위 밖이면 이유) · E2 계약 · 정본(§1.2 넷 · 같은 규칙을 두 곳에 적나) · E3 실패 경로(새 길마다 현실적인 실패 하나 · 에러 삼킴 · 비밀값이 응답 · 로그 · 기록에 원문 · 부르는 쪽이 적는 값으로 권한 우회) · E4 테스트(RED 가 지금 정말 실패하나 · 회귀를 지키는 검사 · 바뀌는 동작을 전제로 쓴 기존 검사를 찾았나(`tpx-plan` §3) · 항진명제 단언 · `검증` 칸) · E5 시간(검사 · 대기가 늘어나나 · 같은 일을 두 번) / **제품**(3등급) P1 문제 정의가 요청과 맞나 · P2 사용자가 이미 정한 결정(CLAUDE.md · LEARNINGS · 명세의 날짜 붙은 결정)과 어긋나나 · P3 더 작게 내고 나중에 키울 수 있나 · 되돌리기 / **화면**(화면을 건드리면) D1 `docs/DESIGN.md` 원칙 · D2 바꾸기 전 시안 · D3 화면 문구(CLAUDE.md §3 · 영어 표 키) · D4 폭 · 밝게/어둡게(`tpx-impl` Step 3 표)를 할 일 검증에 넣었나
- **REFACTOR** — `chain-contract.test.mjs` 의 검사 제목 「gstack 렌즈 호출에 비대화형 세 마디가 박혀 있다」 → 「계획 검토 렌즈 호출에 …」. 단언은 그대로(세 마디가 남으므로 바꿀 이유가 없다)

**files**: .claude/skills/tpx-plan-review/SKILL.md, .claude/skills/tpx-plan-review/references/lenses.md, .claude/skills/tpx/SKILL.md, .claude/scripts/review-structure.test.mjs, .claude/scripts/chain-contract.test.mjs
**depends-on**: []
**검증**: node --test .claude/scripts/review-structure.test.mjs .claude/scripts/chain-contract.test.mjs .claude/scripts/agent-models.test.mjs

### 할 일 2. PR #178 이 남긴 지적 넷

- **RED** — `guard.test.mjs` 통과 목록에 따옴표 없는 글자 명령 `echo check-stamp.mjs put push` 를 더한다. 지금 구현에서는 초록이 맞다 — 이 단언은 정규식의 `node` 조건을 지킨다. RED 대신 **부숴 보기**로 확인한다(`guard.mjs:39` 에서 `\bnode\s+(?:[^;&|]*\s)?` 를 지운 임시 사본에서 빨강 → 되돌림)
- **GREEN** — ① `docs/HOOKS.md` 「1등급 기록 면제」 행: 「빈 목록 … 은 요구한다」 뒤에 「(함수 판정이다 — 바뀐 파일 0 인 push 는 훅과 응답 끝 경고가 판정 전에 통과시킨다)」, 「문서 자리(…)」 괄호를 「`lane.mjs` 의 `문서자리`」 가리키기로(지금 괄호는 `.gitkeep` 이 빠져 좁다) ② `.claude/hooks/pre-push` `snapshot()` 위 주석 두 줄을 코드대로 — 못 읽으면 부를 때마다 다른 값이라 두 번 다 실패해도 「같음」으로 **안 본다** ③ `docs/HOOKS.md` 「검사 기록」 절 두 줄(지금 :114 · :115)의 괄호 사본을 빼고 정본 행을 가리키기만
- **REFACTOR** — 없음

**files**: docs/HOOKS.md, .claude/hooks/pre-push, .claude/scripts/guard.test.mjs
**depends-on**: []
**검증**: node --test .claude/scripts/guard.test.mjs && npm run check:spec

### 할 일 3. 대조 검증을 묶음마다 한 번 돈다

- **RED** — `agent-models.test.mjs` 에 단언을 더한다. `tpx-impl` 「### 2-C.」 절이 ① 검증자를 **묶음마다 하나** 낸다 ② 판정을 **할 일마다** 커밋 해시와 함께 받는다 ③ 차이 파일 이름이 `tpx-<PR 번호>-묶음<n>.diff` 이고 옛 `tpx-<할 일>.diff` 가 없다(PR 번호 — 다른 작업 폴더의 묶음 1 과 `/tmp` 에서 안 겹치게, 검토 주의 7) ④ DRIFT 는 그 할 일만 재발행 · 재검증한다. 지금은 할 일마다 낸다는 꼴이라 ①③ 이 빨갛다
- **GREEN** — 2-C 를 고친다. 컨트롤러가 묶음의 할 일별 `git log` · `git diff` 를 한 파일에 할 일 번호 구획으로 모은다. 판정 기준은 그대로 계획 파일 경로 + 할 일 번호들(LEARNINGS 2026-10-08). 「PASS 에 실제 커밋 해시가 없으면 거절」은 할 일마다
- **REFACTOR** — 없음. 검증자 정의(`.claude/agents/tpx-verifier.md`)는 「부른 쪽이 넘긴 프롬프트가 정본」이라 안 바꾼다

**files**: .claude/skills/tpx-impl/SKILL.md, .claude/scripts/agent-models.test.mjs
**depends-on**: []
**검증**: node --test .claude/scripts/agent-models.test.mjs .claude/scripts/context-diet.test.mjs

### 할 일 4. [6] 렌즈 호출을 고정한다 — code-review 강도 · 범위, 검사 묶음은 컨트롤러 결과를 넘긴다

정본은 `tpx-review` Step 4 안의 새 소절 `### 렌즈에 넘기는 것 — 검사 묶음은 다시 안 돈다` **한 곳**이다(검토 주의 2 · H6). 다른 자리는 그 소절 제목을 가리키기만 한다.

- **RED** — `review-structure.test.mjs` 에 단언을 더한다.
  ① `tpx-review` Step 2 가 0~1등급 `low origin/main...HEAD in <작업방 절대경로>`, 2~3등급 `medium origin/main...HEAD in <작업방 절대경로>` 를 code-review args 로 적는다(확인된 글자 그대로 — 검토 주의 3)
  ② 정본 소절이 있고 다음을 적는다 — 컨트롤러가 Step 4 를 **먼저** 돌린다 · 렌즈 프롬프트에 `로그 폴더:` 경로 · 그때 HEAD · `EXIT` 줄 · DB 를 건드렸으면 `DATABASE_URL` 을 붙였는지를 싣는다 · 렌즈는 검사 묶음(`run local` · `node --test` · `npm test` · `test:changed`)을 다시 돌리지 않고 `node .claude/scripts/check-stamp.mjs find <HEAD>` 로 `stamp=` 가 그 HEAD · `kinds=` 에 `local` 인지만 본다 · 결과가 없거나 HEAD 가 다르면 G8 · G9 는 「미확인」으로 중대(검토 주의 1)
  ③ 같은 소절이 부숴 보기를 적는다 — **첫 회차는 렌즈가** 새 검사 중 최대 두 곳을 작업방 밖 임시 사본에서 깨고 그 검사 파일만 돌린다 · 작업 폴더는 안 건드린다 · **재검사 회차는 렌즈가 부수지 않고** 고치며 새로 생긴 검사를 컨트롤러가 임시 사본에서 부숴 본 결과를 넘긴다 · 보안 · 비밀값 · 권한 장치는 부수지 않고 RED 커밋을 근거로 쓴다(게이트 1 사용자 결정 · 검토 BLOCKER 1)
  ④ `tpx-review` Step 2 · `spec-review` 절차 · `checklist-g-h.md` G3 줄 · G8 · G9 설명이 「렌즈에 넘기는 것」을 가리킨다. 사람이 `spec-review` 를 직접 부르면(넘겨받은 것 없음) 스스로 돌려도 된다는 줄은 `spec-review` 절차에 남는다
  ⑤ Step 3 이 `/tpx-plan-review` 를 가리키지 않고 세 마디를 자기 안에 적는다
- **GREEN** — 소절 신설 · 가리키는 줄 · Step 2 args · Step 3. `--max-findings` 는 이 저장소 기록에 쓴 적이 없어 고정하지 않는다
- **REFACTOR** — `docs/LEARNINGS.md` 「[환경] 2026-10-06 · **게이트 2 「부숴 보기」로」 항목을 한 줄로 줄이고 `→ tpx-review Step 4 「렌즈에 넘기는 것」으로 승격 (2026-10-08)`

**files**: .claude/skills/tpx-review/SKILL.md, .claude/skills/spec-review/SKILL.md, .claude/skills/spec-review/references/checklist-g-h.md, .claude/scripts/review-structure.test.mjs, docs/LEARNINGS.md
**depends-on**: [1]
**검증**: node --test .claude/scripts/review-structure.test.mjs .claude/scripts/chain-contract.test.mjs .claude/scripts/context-diet.test.mjs .claude/scripts/agent-models.test.mjs

### 할 일 5. 게이트 2 「고치고 재검사」는 바뀐 부분 문서 대조만

- **RED** — `review-structure.test.mjs` 에 단언을 더한다.
  ① `tpx-review` 에 `## 고치고 재검사 — 바뀐 부분만` 절이 있다
  ② 범위가 `git diff <앞 회차 검사 HEAD>..HEAD` 와 앞 회차 검사 기록의 지적 목록이다. 앞 회차 HEAD 가 조상이 아니면(`git merge-base --is-ancestor` 실패 — amend · rebase) `origin/main...HEAD` 로 돌아간다(검토 주의 4)
  ③ 렌즈는 「지적이 닫혔나」와 바뀐 줄의 핵심 낱말로 같은 규칙 찾기(H2 · H6)만 하고 체크리스트 전부를 다시 돌지 않는다
  ④ 다시 내는 렌즈는 앞 회차에 지적을 낸 렌즈뿐이고(같은 강도), 고친 차이에 코드가 있으면 code-review 는 앞 회차 지적이 없었어도 `low` 로 늘 다시 낸다(게이트 1 사용자 결정)
  ⑤ 검사 묶음 · 부숴 보기는 「렌즈에 넘기는 것」을 가리킨다(정본은 할 일 4 의 소절)
  ⑥ `tpx/SKILL.md` 「게이트」 절이 「고치고 재검사」를 고르면 그 절로 간다고 가리킨다
  ⑦ `spec-review` 절차 2(검사 범위)에 「재검사면 넘겨받은 범위 · 앞 지적만」, 「## 보고 형식」 머리에 검사한 HEAD 해시 줄
- **GREEN** — 위 절 · 줄을 넣는다. code-review 를 다시 내도 범위는 `origin/main...HEAD`(차이가 작고, 다른 범위 꼴이 먹히는지 확인하지 않았다)
- **REFACTOR** — `tpx-review` Step 2 의 「게이트 2 「고치고 재검사」의 바뀐 부분 재검사도 같다」 줄이 새 절을 가리키게

**files**: .claude/skills/tpx-review/SKILL.md, .claude/skills/tpx/SKILL.md, .claude/skills/spec-review/SKILL.md, .claude/scripts/review-structure.test.mjs
**depends-on**: [4]
**검증**: node --test .claude/scripts/review-structure.test.mjs .claude/scripts/chain-contract.test.mjs .claude/scripts/context-diet.test.mjs .claude/scripts/agent-models.test.mjs

### 할 일 6. 남은 스킬 문구 지적 — PR #177 여섯 + #178 하나

- **RED** — `context-diet.test.mjs` 를 고친다. ① 「게이트 2 3」 표에 `['tpx-spec', '## Step 1. 읽을 장을 좁힌다']` 를 더한다(지금 빨강 — `grep` 그대로) ② 「게이트 2 1」 의 `목록.includes('절대경로')` 를 `'작업방 절대경로'` 로 좁히고, 그 말이 「DB 를 건드리면」 괄호 안에 있지 않다고 단언(지금 빨강) ③ 「할 일 3」 · 「게이트 2 2」 의 `본.indexOf('1.')` · `본.indexOf('\n2.')` 에 대조군(`>= 0`, 끝이 시작보다 뒤)을 단다(지금 초록 — 대조군 보강) ④ 새 단언 — `spec-review` 절차 1 이 렌즈면 색인을 통째로 읽지 않고, A1~A3 은 diff 에 계약 파일이 있을 때만 그 SPEC 절을 `grep -nF` 로 열고, H2 는 바뀐 문장의 핵심 낱말 `grep -rn` 으로 본다(지금 빨강) ⑤ 새 단언 — `tpx` 선행 읽기 4 가 열린 미완을 「`grep -n '미완'` 으로 뽑는다 · 진행판 번호가 있으면 `docs/wbs.md` 에서 그 번호가 `- [ ]` 인지 본다 · 번호가 없으면 열린 것으로 친다 · `미완: 없음` 줄은 뺀다」로 찾는다 — 두 갈래를 다 단언(지금 빨강 · 검토 BLOCKER 2 — 미완 줄 대부분에 번호가 없다) ⑥ 새 단언 — `tpx-review` 선행 읽기의 `grep -nF` 괄호가 「헤딩의 `[` · `*` · `(` 가 정규식으로 읽히지 않게」다(지금 빨강) ⑦ 새 단언 — `tpx` 차선 표 `spec` · `docs` 행이 문서 자리를 `lane.mjs` 의 `문서자리` 로 가리킨다(지금 빨강 — `.gitkeep` 빠진 사본)
- **GREEN** — `tpx-spec` Step 1 `grep -nF`(선행 읽기 겹침 해소는 뺐다 — 10건에 없고 `tpx-spec:12` 와 어긋난다, 검토 주의 6) · `tpx-impl` 2-A 환경 값 줄을 「작업방 절대경로 · DB 를 건드리면 검사용 `DATABASE_URL`」로 · `spec-review` 절차 1 렌즈 모드 범위 · `tpx` 선행 읽기 4 · `tpx-review` 선행 읽기 괄호 · `tpx` 차선 표 두 행
- **REFACTOR** — 없음

**files**: .claude/skills/tpx-spec/SKILL.md, .claude/skills/tpx/SKILL.md, .claude/skills/tpx-review/SKILL.md, .claude/skills/tpx-impl/SKILL.md, .claude/skills/spec-review/SKILL.md, .claude/scripts/context-diet.test.mjs
**depends-on**: [3, 5]
**검증**: node --test .claude/scripts/context-diet.test.mjs .claude/scripts/chain-contract.test.mjs .claude/scripts/agent-models.test.mjs

## 이번에 안 하는 것

- PR #178 code-review 1회차가 미룬 둘 — pre-push REFS 순회 네 벌 합치기 · 응답 끝 경고가 커밋된 2등급 작업을 못 봄(HOOKS.md 「응답 끝 경고」 행에 한계로 적혀 있다). 진행판 HAR-F1-24 범위 밖이다. 하려면 새 진행판 번호로
- `/qa-only` 등 계획 검토가 아닌 gstack 렌즈 — 브라우저를 모는 도구라 저장소 기준으로 옮길 것이 아니다

## 게이트 1 결정 (2026-10-08 사용자)

| 무엇 | 결정 |
|---|---|
| 계획 | 지적 반영하고 진행 — BLOCKER 2 · 주의 7 을 할 일 3~6 에 반영. 재검토 안 함 |
| 첫 회차 부숴 보기 | 렌즈가 최대 두 곳 직접(임시 사본). 재검사 회차만 컨트롤러 결과를 넘긴다. 검사 묶음 재실행은 두 회차 다 막는다 |
| code-review 강도 | 0~1등급 `low` · 2~3등급 `medium`, 범위는 늘 `origin/main...HEAD` |
| 재검사 렌즈 | 앞 회차에 지적을 낸 렌즈만 + 고친 차이에 코드가 있으면 code-review `low` |
| 계획 검토 렌즈 | lenses.md 절마다 Opus 서브 에이전트 하나(2등급은 공학 하나뿐이라 묻지 않았다) |

## SPEC 동반 수정 (§2.7)

해당 없음 — SPEC 안 건드림. 같은 규칙 찾기는 했다.
- `git grep -n 'plan-eng-review\|plan-ceo-review\|plan-design-review'`(계획 · 기록 · 진행 · LEARNINGS 제외) → `tpx-plan-review/SKILL.md:24 · :25 · :41` · `tpx/SKILL.md:92` 뿐. 할 일 1 이 덮는다
- `git grep -n 'gstack'`(docs · CLAUDE.md · 체인 · spec-review) → 위 더하기 `tpx-review/SKILL.md:41 · :57 · :59`(qa-only — 할 일 4 ⑦ 이 :59 를 덮는다) · `spec-review/SKILL.md:3 · :110`(`/review` 담당 안내 — 계획 검토와 무관해 그대로)
- 바뀌는 동작을 전제로 쓴 기존 검사 — `chain-contract.test.mjs` 「gstack 렌즈 호출에 비대화형 세 마디」(세 마디가 남아 단언 그대로 · 제목만) · 「tpx-review Step 4 가 「재사용」 줄을」(Step 4 머리 · 내용 유지) · 「diff 기준이 origin/main 이다」(새 줄이 `origin/main...HEAD` 를 쓰므로 그대로 초록) · 「references/*.md 는 전부 제 스킬의 SKILL.md 가 가리킨다」(lenses.md 를 SKILL.md 가 가리켜야 한다 — 할 일 1) · `agent-models.test.mjs` 「계획 검토 · 독립 검사 렌즈는 Opus 를 쓴다」(`tpx-review` 의 `model: "opus"` 한 줄 — 할 일 4 · 5 가 Step 2 를 고친다) · `context-diet.test.mjs` 「할 일 3」 · 「게이트 2 2」(`spec-review` 절차를 `indexOf('\n2.')` 로 자른다 — 할 일 4 · 5 가 절차를 고친다). 할 일 4 · 5 `검증` 에 둘 다 넣었다(검토 주의 5)
- HOOKS.md 「1등급 기록 면제」 행 · pre-push 주석에는 기존 검사가 없다. 문구 · 주석이라 할 일 2 는 `check:spec` 과 눈 대조로 본다

## Plan 메타

할 일 6개 · 예상 묶음 4개(1: 할 일 1 · 2 · 3 / 2: 할 일 4 / 3: 할 일 5 / 4: 할 일 6) · 구현 규율: TDD · 추가 검증: `node .claude/scripts/check-stamp.mjs run local`

## 리뷰 결과

**렌즈**: plan-eng-review (2등급 = 1종, Opus 독립 검토자) · 2026-10-08
**판정**: BLOCKER 2건 · 주의 7건

### BLOCKER 1 — 첫 회차 렌즈의 부숴 보기까지 막는 것은 진행판 범위 밖이고 독립 검사를 깎는다
진행판(`docs/wbs.md:436`)은 넘기기를 **렌즈 재검사**에만 붙였다. 컨트롤러는 RED 를 설계한 쪽이라 자기가 지키려던 자리만 부순다 — PR #178 에서 렌즈가 직접 부숴 찾은 구멍이 둘(1회차 경미 6 · 3회차 경미 3)이고 이 계획 할 일 2 도 그중 하나다. 검사 묶음 재실행은 약 31초, 부숴 보기 한 번은 검사 파일 하나라 11~17분 중 부숴 보기 몫이 나뉘어 있지 않다.
고칠 것: 첫 회차 렌즈는 검사 묶음 재실행만 막고, 새 검사의 부숴 보기는 렌즈가 임시 사본(`/tmp`)에서 상한(예 2곳)을 두고 직접 한다. 컨트롤러 결과 넘기기는 재검사(할 일 5)에서만. 컨트롤러가 부술 때도 임시 사본에서. 첫 회차까지 넘기려면 게이트 1 에서 사용자가 고른다

### BLOCKER 2 — 「열린 미완」 찾는 규칙이 진행판 번호가 없는 미완을 전부 버린다
미완 줄 대부분에 진행판 번호가 없다(하네스 5줄 중 2 · WS-A 4줄 중 0 · WS-F 6줄 중 0 · WS-작성 59줄 중 16). 이 PR 이 처리하는 #177 지적 줄(`docs/progress/하네스.md:35`)도 번호가 없다.
고칠 것: 번호가 있으면 진행판에서 `- [ ]` 인지 보고, 없으면 열린 것으로 친다(`미완: 없음` 줄은 뺀다). RED ⑤ 도 두 갈래를 단언

### 주의 1 — 넘겨받은 검사 결과가 지금 HEAD 의 것인지 확인할 길이 없다
고정 이름 로그(`/tmp/r.log`)는 다른 세션과 겹치고, 검사 뒤 고친 것이면 낡은 초록이다. G3 의 `DATABASE_URL` 붙인 DB 검사 재실행을 걷으면 DB 검사가 조용히 건너뛸 수 있다. 「컨트롤러 결과 없음」일 때 G8 판정도 비었다.
고칠 것: `run local` 이 찍는 `로그 폴더:` 경로와 그때 HEAD 를 넘기고, 렌즈는 `check-stamp.mjs find` 로 HEAD 에 `local` 표지가 있는지 본다. DB 를 건드렸으면 `DATABASE_URL` 을 붙였는지 프롬프트에 적는다. 결과가 없으면 G8 · G9 는 「미확인」으로 중대

### 주의 2 — 같은 규칙을 여러 자리에 새로 적게 만든다 (H6 재발 길)
할 일 4 · 5 가 「렌즈는 다시 안 돌린다」를 일곱 자리에서 문장으로 단언한다. 고칠 것: 정본을 `tpx-review` Step 4 「부숴 보기」 한 곳으로, 다른 자리는 그 절 제목을 가리키는지만 단언

### 주의 3 — code-review 호출 꼴을 확인된 글자로 박지 않았다
확인된 꼴은 `low origin/main...HEAD in <작업방>` 이다. 경로만 붙이면 경로가 대상으로 읽힐 수 있고, `--max-findings` 도 한 번 주면 남는다. 고칠 것: 단언을 확인된 글자로 · `--max-findings default` 고정 여부는 게이트 1 에서

### 주의 4 — 재검사에서 지적 안 낸 렌즈를 빼면 고친 코드를 코드 렌즈가 안 본다 · 앞 회차 커밋을 읽을 자리가 없다
고칠 것: 고친 차이에 코드가 있으면 code-review low 는 늘 다시 낸다. spec-review 보고 머리에 검사한 HEAD 해시를 적게 하고, 그 커밋이 조상이 아니면 `origin/main...HEAD` 로 돌아간다

### 주의 5 — 바뀌는 자리를 읽는 기존 검사가 `검증` 칸에서 빠졌다
할 일 4 는 `agent-models.test.mjs`(:58-62 Opus 줄), 할 일 5 는 `context-diet.test.mjs`(절차 2 를 `indexOf('\n2.')` 로 자름) · `agent-models.test.mjs` 를 `검증` 에 더하고 동반 수정 줄에도 적는다

### 주의 6 — tpx 선행 읽기 2 「겹침 해소」는 10건에 없는 일이고 tpx-spec:12 와 어긋난다
`tpx-spec` 선행 읽기는 「`/tpx` 가 색인을 이미 실었다」라 적었다. 더 작은 길: 겹침 해소를 빼고 `tpx-spec` Step 1 에 `grep -nF` 만

### 주의 7 — 임시 차이 파일 이름이 세션끼리 겹친다
고칠 것: `tpx-<PR 번호>-묶음<n>.diff`

### 통과한 것
- 「지금 빨강」이라 한 RED 는 전부 실제로 빨갛다(할 일 1 은 ②③④ 도 빨강)
- 할 일 2 부숴 보기 설명 · HOOKS · pre-push 사실이 맞다(정규식만 따로 실측)
- 묶음 계산 {1 · 2 · 3} → {4} → {5} → {6} = 4개. 4 · 5 를 합치면 묶음 하나와 검증 한 번이 준다
- 동반 수정 grep 이 맞다 · 기존 검사 넷 72건 지금 초록 · 새 검사 파일은 `check:workflow` 가 잡는다
- 범위 다섯 덩이가 할 일 1~6 에 다 있다 · 「이번에 안 하는 것」 둘은 진행판 밖이 맞다
- 보안 장치를 부수지 않고 RED 커밋으로 갈음하는 것은 LEARNINGS 2026-10-06 해법과 같다
- 스킬 200줄 상한 — 가장 빠듯한 `tpx/SKILL.md` 가 178줄, 넘지 않는다
