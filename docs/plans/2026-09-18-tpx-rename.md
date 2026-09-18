# 체인 진입 명령을 /tp 에서 /tpx 로 바꾼다

등급: 3 · 갈래: 없음 (하네스) · 2026-09-18

## 도메인 정리

**제품 도메인 건드리지 않음.** 계약 넷(`packages/kit/src/types.ts` · 러너 HTTP ·
DB 표·칸 · Admin API) 전부 무관하다. `docs/spec/**` 12장에 `tp` 라는 말이 한 번도 안 나온다.

색인 `docs/SPEC.md` 두 줄만 `SPEC` 표면에 걸려 등급이 3이 됐다. 게이트 0 에서 승인받았다.

## 왜

**`/tp` 를 치면 내장 명령 `/teleport` 가 먼저 뜬다.** 체인을 부를 방법이 없다.

Claude Code 자동완성은 부분열(subsequence — 글자가 순서대로만 나오면 매치)로 찾는다.
`teleport` 안에 `t` 다음 `p` 가 있으므로 `/tp` 가 매치된다. 내장이라 위로 올라온다.

설치된 명령 전체(내장 + 스킬 + 플러그인)를 대조한 실측이다.

| 이름 | 부분열로 겹치는 명령 |
|---|---|
| `tp` | **52개** — `teleport` `desktop` `type` `outputs` `babysit-prs` … |
| `tpx` | **0개** |

`tpx` 는 `/tp` 손가락 습관을 그대로 두고 한 글자만 더 친다. 이름 유래(test platform)도 남는다.

**이름만 바꾼다.** 절차·등급·게이트·판별식·PR 상황판 전부 그대로다.

## Plan

### 할 일 1. 스킬 디렉터리 여덟을 개명한다

- **RED** — `git mv` 직후 `chain-contract.test.mjs` 가 빨강. 그 판별식이 `STEP_SKILLS` 의
  이름으로 `SKILL.md` 를 읽는데 경로가 사라진다. **이 빨강이 판별식의 비-공허 증거다** —
  이름을 지키는 그물이 실재함을 개명 자체가 증명한다
- **GREEN** — 없음. 이 할 일은 일부러 빨강을 만든다. 할 일 3 이 초록으로 돌린다
- **REFACTOR** — 없음

**files**: `.claude/skills/tp/` `.claude/skills/tp-start/` `.claude/skills/tp-spec/`
`.claude/skills/tp-plan/` `.claude/skills/tp-plan-review/` `.claude/skills/tp-impl/`
`.claude/skills/tp-review/` `.claude/skills/tp-merge/` → 각각 `tpx` 접두사
**depends-on**: []
**검증**: `ls .claude/skills/ | grep -c '^tp-\?$\|^tp-'` 가 `0`, `ls .claude/skills/ | grep -c '^tpx'` 가 `8`

### 할 일 2. 스킬 여덟의 본문에서 자기 이름과 상호 참조를 고친다

- **RED** — 본문 상호 참조(`[tp-start](../tp-start/SKILL.md)` 등)가 없는 경로를 가리킨다.
  `chain-contract` 의 순서·잠금·루프 단언이 옛 이름으로 찾아 빨강
- **GREEN** — 여덟 파일의 `tp` `tp-*` 를 `tpx` `tpx-*` 로. frontmatter `name:` 포함
- **REFACTOR** — 없음. 이름 외에 한 글자도 바꾸지 않는다

**files**: `.claude/skills/tpx*/SKILL.md` (8개)
**depends-on**: [1]
**검증**: `grep -rcE '(^|[^a-z-])tp(-[a-z-]+)?([^a-z-]|$)' .claude/skills/tpx*/SKILL.md` 가 전부 `0`

### 할 일 3. 판별식의 이름 상수를 고친다

- **RED** — 할 일 1·2 를 마친 상태에서 `node --test .claude/scripts/chain-contract.test.mjs`
  가 빨강 (`STEP_SKILLS` 가 옛 이름)
- **GREEN** — `STEP_SKILLS` 배열과 흩어진 리터럴 52곳을 새 이름으로
- **REFACTOR** — 단언 메시지의 사람이 읽는 이름도 같이 맞춘다

**files**: `.claude/scripts/chain-contract.test.mjs`
**depends-on**: [1, 2]
**검증**: `npm run check:workflow` 종료 코드 `0` · `# fail 0`

### 할 일 4. 스크립트 둘과 문서 다섯을 고친다

- **RED** — `pr-update.mjs` 가 만드는 PR 본문 체크리스트가 없는 명령을 가리킨다.
  `CLAUDE.md §0` 이 «`/tp` 로 시작한다» 라고 적어 새 세션이 못 찾는다
- **GREEN** — 일곱 파일의 `tp` → `tpx`
- **REFACTOR** — 없음

**files**: `.claude/scripts/pr-update.mjs` `.claude/scripts/check-spec-refs.mjs`
`CLAUDE.md` `docs/SPEC.md` `docs/WORKFLOW.md` `docs/HOOKS.md`
**depends-on**: []
**검증**: `npm run check:spec` 종료 코드 `0` **그리고** `pr-update.mjs --pr 20` 을 다시 돌려
PR 본문 체크리스트가 새 이름을 쓰는지 눈으로 본다 (검토 주의 2 — `check:spec` 은
절 번호·링크·분량만 보므로 이름이 틀려도 초록이다)

### 할 일 5. 이름 충돌을 LEARNINGS 에 남긴다

- **RED** — 없음 (기록)
- **GREEN** — `docs/LEARNINGS.md` 맨 위에 항목 하나. 기존 `tp-*` 언급 4곳도 새 이름으로
- **REFACTOR** — 없음

**files**: `docs/LEARNINGS.md`
**depends-on**: []
**검증**: `grep -c 'teleport' docs/LEARNINGS.md` 가 `1` 이상

### 할 일 6. 저장소 밖 기억 파일 넷을 고친다 (검토 BLOCKER 1)

- **RED** — 없음 (저장소 밖이라 판별식이 못 본다. 그래서 계획에 박는다)
- **GREEN** — 네 파일의 `/tp` → `/tpx`. `project-tp-chain.md` 는 **파일명도**
  `project-tpx-chain.md` 로 바꾸고 frontmatter `name:` 과 `MEMORY.md` 의 링크를 맞춘다
- **REFACTOR** — 없음

기억은 세션마다 자동으로 실린다. 저장소만 고치면 **다음 세션이 `/tp` 를 치고 teleport 를 만난다.**

**files**: `~/.claude/projects/-Users-maxi-moff-Projects-test-platform/memory/` 의
`project-tp-chain.md`(10곳) `MEMORY.md`(1) `project-orchestrator.md`(1)
`feedback-finish-before-opening-pr.md`(1)
**depends-on**: []
**검증**: 그 폴더에 `grep -rl '/tp\b'` 결과가 없다 · `ls` 에 `project-tp-chain.md` 가 없다

## 확인 방법 (검토 주의 1 — 구현 중에 정정했다)

1. 병합하고 `git pull` (체인이 자동으로 한다)
2. `/tpx` 를 친다 → 목록 맨 위에 체인이 뜬다
3. **안 뜨면 그때 세션을 새로 연다**

**처음엔 「세션을 새로 열어야 보인다」고 단정했다가 고쳤다.** 근거가 반쪽이었다.
지운 작업방 셋이 목록에 남아 있는 것을 보고 「색인은 세션 시작 스냅샷」이라고 결론냈는데,
같은 세션에서 만든 `tpx` 여덟이 **재시작 없이 그대로 떴다.**

실제로는 **더하기는 따라오고 빼기는 안 따라온다.** 그래서 3번이 「반드시」가 아니라 「안 뜨면」이다.

## 안 고치는 것 — 끝난 일의 기록

`docs/plans/2026-09-18-tp-legacy-purge.md` (21곳) 와 `docs/plans/2026-09-18-tp-branch-cleanup.md`
(6곳) 는 **그 시점에 이름이 `tp` 였던 작업의 기록**이다. 파일명도 본문도 안 고친다.

기준 — **살아 있는 지시문은 고치고, 끝난 일의 기록은 안 고친다.**
계획서를 소급해 고치면 「그때 무엇을 왜 했나」가 왜곡된다. `CLAUDE.md §2.7 ②` 와 같은 정신이다.

`package-lock.json` 의 3건은 오탐이다 — base64 무결성 해시 안의 글자다.

## SPEC 동반 수정 (§2.7)

**해당 없음 — 제품 명세를 안 건드린다.**

색인 `docs/SPEC.md` 두 줄은 체인을 설명하는 산문이고 절 번호·표·규칙·계약을 건드리지 않는다.
`/tp-spec` 이 §2.7 여섯 자리를 전부 훑은 결과다.

| 자리 | `tp` 등장 |
|---|---|
| `docs/WORKSTREAMS.md` 킥오프 | 0 |
| `spec-review` 체크리스트 · `package.json` 의 `check:*` | 0 |
| `docs/SETUP.md` · `docs/DESIGN.md` | 0 |
| `docs/HOOKS.md` | 1 → 할 일 4 |
| `docs/design-mockup.html` | 0 |
| 코드에 박힌 상수 | 0 — 이름은 스킬 로더가 디렉터리에서 읽는다 |

`docs/WORKFLOW.md` (8곳) 는 프로젝트 진척 문서라 §2.7 ④ 대상이다 → 할 일 4.

## Plan 메타

할 일 6개 · 예상 묶음 2개 · 구현 규율: TDD · 추가 검증: `npm run check:workflow && npm run check:spec`

묶음 1 — 할 일 1 · 4 · 5 · 6 (`files` 안 겹침)
묶음 2 — 할 일 2 · 3 (둘 다 1 에 의존, 서로는 안 겹침)

게이트 1 에서 `지적 반영하고 진행` 을 골랐다 (2026-09-18). 반영한 것 셋 —
할 일 6 신설(BLOCKER 1) · 확인 방법에 세션 재시작 절(주의 1) · 할 일 4 검증 보강(주의 2).
**재검토하지 않는다.** 결과는 게이트 2 가 본다.

## 리뷰 결과

**렌즈**: `plan-eng-review` + `plan-ceo-review` (3등급 = 2종) · 2026-09-18
**판정**: BLOCKER 1건 · 주의 2건

### BLOCKER 1 — 저장소 밖 기억 파일이 `/tp` 를 가리킨다. 계획에 할 일이 없다

`~/.claude/projects/-Users-maxi-moff-Projects-test-platform/memory/` 의 네 파일이
`/tp` 를 가리킨다. 파일 이름부터 `project-tp-chain.md` 다.

| 파일 | 등장 |
|---|---|
| `project-tp-chain.md` | 10 |
| `MEMORY.md` | 1 |
| `project-orchestrator.md` | 1 |
| `feedback-finish-before-opening-pr.md` | 1 |

**나중에 무엇이 잘못되나.** 기억은 새 세션마다 자동으로 실린다. 다음 세션이
「작업은 `/tp` 로 시작한다」를 읽고 `/tp` 를 친다 → `teleport` 가 뜬다.
**이번에 고치려던 증상이 그대로 재현된다.** 저장소만 고치면 절반이다.

저장소 밖이라 등급·가드가 안 걸리고 판별식도 못 본다. **계획에 안 적히면 아무도 못 본다.**

### 주의 1 — 병합 뒤 `/tpx` 가 안 뜰 수 있다. 확인 방법이 그걸 안 적었다

> **⚠️ 이 지적의 근거는 구현 중에 반쯤 틀린 것으로 드러났다. 위 「확인 방법」 절이 정본이다.**
> 검토 시점에는 지운 작업방 셋이 목록에 남아 있는 것만 보고 「세션 시작 스냅샷」이라고 결론냈다.
> 같은 세션에서 만든 `tpx` 여덟이 **재시작 없이 그대로 떴다** — 색인은 더하기를 따라온다.
> **지적 자체는 유효하다** (확인 방법에 「안 뜨면」 절이 없었다). 근거만 좁혔다.

검토가 본 것은 이것이다.

```
디스크의 작업방:  0개
스킬 로더가 아는 작업방:  3개 (tp-branch-cleanup · tp-legacy-purge · tp-skeleton)
```

셋 다 어제 지운 것이다. 로더는 아직 안다 — **빼기는 안 따라온다.** 여기까지가 참이다.

**나중에 무엇이 잘못되나.** 병합 직후 사용자가 `/tpx` 를 친다 → 아무것도 안 뜬다 →
「개명이 실패했다」고 판단한다. 실제로는 세션을 새로 열면 된다.
계획의 확인 방법 1번에 그 한 줄이 빠졌다.

### 주의 2 — 할 일 4 의 검증이 실제로 바뀐 것을 안 본다

검증이 `npm run check:spec` 하나다. 그 검사는 **절 번호·링크·분량만** 본다
(`CLAUDE.md §2.7 ⑥` 이 그렇게 적어 뒀다). `pr-update.mjs` 가 만드는 PR 본문이
새 이름을 쓰는지는 초록불이 말해 주지 않는다.

**이번엔 공짜로 볼 수 있다.** 할 일 4 를 마친 뒤 이 PR 에 `pr-update.mjs` 를 다시 돌리면
본문이 새로 그려진다. 거기서 눈으로 확인하면 된다.

### 통과한 것

- **할 일 1 의 RED 주장이 참이다.** `chain-contract.test.mjs` 첫 테스트가
  `readdirSync` + `assert.ok(have.includes(s))` 로 폴더 실재를 단언한다.
  디렉터리를 옮기면 던지지 않고 **깨끗하게 빨강**이 된다
- **끝난 일의 기록을 안 고치는 판단이 옳다.** 검사기 중 `docs/plans/` 를 스캔하는 것이 없다.
  `tp-legacy-purge` 를 가리키는 바깥 참조 1건도 그 파일이 그대로 있으므로 유효하다
- **`tpx` 충돌 0 이 실측이다.** 내장 + 전역 스킬 + 플러그인 커맨드 전체를 부분열로 대조했다
- **frontmatter `name:` 을 할 일 2 가 챙긴다.** 스킬 이름은 디렉터리가 아니라 여기서 온다 —
  빠뜨리면 폴더만 바뀌고 명령은 그대로였을 것이다
- **`.claude/settings.json` 과 `.claude/hooks/` 는 스킬 이름을 안 본다.** 건드릴 필요 없다
- **판별식이 「이름 충돌」을 못 막는 것은 지금은 옳다.** `CLAUDE.md §2.5` 기준으로 아직 첫 번째다.
  할 일 5 의 LEARNINGS 기록이 그 첫 번째다. 두 번째가 오면 그때 기계로 옮긴다
