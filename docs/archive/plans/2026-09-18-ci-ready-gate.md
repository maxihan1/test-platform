# CI 를 Ready 전용으로 바꾸고 통과 전 병합을 막는다

등급: 2 (선언) · 갈래: 없음 (하네스) · 2026-09-18

## 도메인 정리

**제품 도메인 건드리지 않음.** 계약 넷 전부 무관하다.

`docs/spec/공통/2-명세선언.md:106` 이 「아래 표 전부를 CI 가 본다」고 적는데
`check:tests` 는 CI 에 그대로 남으므로 **그 문장은 여전히 참이다.** SPEC 을 안 건드린다.

**기계는 1등급 + 미분류로 판정했다** (`.github/**` 가 표면표에 없다).
높은 쪽으로 선언했다 — 앞으로 **모든 병합을 막을 수 있는 변경**이다.

## 왜

지금 `ci.yml` 의 트리거가 `push:` 와 `pull_request:` 둘 다 조건이 없다. 실측이다.

```
$ gh run list --limit 6
push          success   worktree-drop-ownership
pull_request  success   worktree-drop-ownership
push          success   worktree-drop-ownership
pull_request  success   worktree-drop-ownership
...
```

**PR 하나에 CI 가 여섯 번 돌았다** — 푸시 3번 × 트리거 2개. 전부 초안 상태에서다.
`/tpx` 는 작업 시작 전에 초안 PR 을 열고 단계마다 푸시하므로, 그 구간은 **검토 전**이라
검사할 이유가 없다.

그리고 **브랜치 보호가 없다** (`gh api .../protection` → 404).
초안만 아니면 CI 결과와 무관하게 병합된다.

## 실측 — 이 PR 로 직접 쟀다 (2026-09-18, PR #22)

**전제를 추측으로 두지 않고 쟀다.** 결과 넷.

### ① 초안 푸시 — CI 가 일을 안 한다

```
$ gh run list --branch worktree-ci-ready-gate
pull_request  completed  skipped     ← 새 설정. 떴지만 건너뛰었다
pull_request  completed  success     ← 옛 설정
push          completed  success     ← 옛 설정. 이제 이 트리거가 없다
```

**둘 → 하나로 줄었고, 그 하나도 일을 안 했다.**

### ② `skipped` 는 필수 체크를 **만족시킨다**

브랜치 보호를 건 직후, `check` 가 `skipped` 하나뿐인 상태에서

```
$ gh pr view 22 --json mergeStateStatus
CLEAN        ← 막히지 않는다
```

**걱정했던 메커니즘이 맞았다.** 다만 그때 PR 은 초안이라 GitHub 이 병합을 막는다.

### ③ Ready 전환 직후의 틈은 **5초 미만**

```
$ gh pr ready 22
 0초   CLEAN      ← 옛 skipped 가 아직 마지막 상태
 5초   BLOCKED    ← 새 실행이 등록됐다. CI 초록까지 막힌다
```

**뚫으려면 「Ready 버튼」과 「병합 버튼」을 5초 안에 손으로 연달아 눌러야 한다.**
체인은 할 일 4 의 `gh pr checks --watch` 로 그 구간을 지나가지 않는다.

### ④ 초안으로 되돌려도 `BLOCKED` 가 유지된다

한 번 실행이 등록되면 초안으로 되돌려도 필수 체크가 살아 있다.

## 판정

**요청한 네 줄이 그대로 성립한다.**

| | 실측 |
|---|---|
| 초안 → CI 안 돈다 | ✅ `skipped` (일을 안 한다) |
| 초안 → 병합 불가 | ✅ GitHub 이 초안을 막는다 |
| Ready 전환 → CI 돈다 | ✅ |
| Ready 푸시 → CI 돈다 | ✅ `synchronize` + `draft == false` |
| CI 초록일 때만 병합 | ✅ 5초 뒤부터. 그 전 창은 손으로 노려야 한다 |

## Plan

### 할 일 1. CI 트리거를 Ready 전용으로 바꾼다

- **RED** — 지금 이 초안 PR 에 푸시하면 CI 가 돈다 (`gh run list` 로 확인 가능).
  바꾼 뒤에는 **안 돌아야 한다**
- **GREEN** — `on:` 을 아래로 바꾸고 job 에 초안 가드를 건다

```yaml
on:
  pull_request:
    types: [opened, reopened, ready_for_review, synchronize]
  push:
    branches: [main]        # 병합 뒤 main 안전망. PR 브랜치 푸시는 안 잡는다
jobs:
  check:
    if: github.event_name == 'push' || github.event.pull_request.draft == false
```

- **REFACTOR** — 파일 머리 주석을 새 동작으로 고친다

**files**: `.github/workflows/ci.yml`
**depends-on**: []
**검증**: 이 브랜치에 푸시한 뒤 `gh run list --limit 3 --json event,headBranch`
결과에 `worktree-ci-ready-gate` 가 **안 나온다**

### 할 일 2. `.github/**` 를 표면표에 올린다

미분류로 두면 CI 를 고칠 때마다 경고가 뜨고 등급이 기본값으로 떨어진다.
**이번 변경이 그 증거다** — 병합 게이트를 바꾸는 일인데 기계는 1등급이라 했다.

- **RED** — `node .claude/scripts/detect-tier.mjs .github/workflows/ci.yml` 이
  `미분류: .github/workflows/ci.yml` 을 낸다. `surfaces.test.mjs` 에 이 경로가 2등급이라는
  단언을 더하면 빨강
- **GREEN** — `surfaces.mjs` 에 `{ name: 'CI', tier: 2, globs: ['.github/**'] }`
- **REFACTOR** — 없음

**files**: `.claude/scripts/surfaces.mjs` `.claude/scripts/surfaces.test.mjs`
**depends-on**: []
**검증**: `node .claude/scripts/detect-tier.mjs .github/workflows/ci.yml` 이
`등급: 2 · 표면: CI` · 미분류 줄 없음 · `npm run check:workflow` 종료 코드 `0`

### 할 일 3. `main` 에 브랜치 보호를 건다 — CI 초록이어야 병합

**저장소 설정이다. 파일이 아니라 GitHub 에 건다.** 되돌리려면 보호를 지운다.

- **RED** — 지금 `gh api repos/.../branches/main/protection` 이 404 다
- **GREEN** — 필수 상태 체크 `check` 를 걸고 `strict: false`
  (`strict: true` 는 main 이 앞서갈 때마다 재실행을 요구해 혼자 쓰는 저장소엔 과하다).
  **`enforce_admins: false`** — 소유자가 `gh pr merge --admin` 으로 빠져나갈 길은 남긴다.
  체인은 그 깃발을 절대 안 쓰므로 정상 경로는 막힌다
- **REFACTOR** — 없음

**files**: 없음 (GitHub 저장소 설정)
**depends-on**: [1]
**검증**: `gh api repos/maxihan1/test-platform/branches/main/protection -q '.required_status_checks.contexts'`
가 `["check"]` · `.enforce_admins.enabled` 가 `false`

### 할 일 4. `tpx-merge` 가 잠금을 푼 뒤 CI 를 기다린다

지금 Step 1 이 `gh pr checks` 를 **`gh pr ready` 전에** 본다. 새 설계에서는 그 자리에
체크가 없거나 **옛 「건너뜀=통과」가 남아 있다.** 그대로 두면 검사 없이 병합된다.

- **RED** — `chain-contract.test.mjs` 에 「`tpx-merge` 가 `gh pr ready` **뒤에**
  `gh pr checks --watch` 를 부른다」는 단언을 더하면 빨강
- **GREEN** — Step 2 에 대기를 넣고, Step 1 의 3분기를 「초안이라 아직 안 돈다」로 고친다

```bash
gh pr ready <번호>
gh pr checks <번호> --watch --fail-fast     # 여기서 막힌다. 빨강이면 병합 안 한다
```

- **REFACTOR** — Step 1 의 「체크 0건 = 통과가 아니다」 분기를 새 사실에 맞춘다

**files**: `.claude/skills/tpx-merge/SKILL.md` `.claude/scripts/chain-contract.test.mjs`
**depends-on**: []
**검증**: `npm run check:workflow` 종료 코드 `0` ·
`grep -n 'checks.*--watch' .claude/skills/tpx-merge/SKILL.md` 가 `gh pr ready` 아래에 있다

### 할 일 5. 전제를 이 PR 로 실측한다

**설계가 추측 위에 서 있다.** 「건너뛴 작업이 통과로 기록된다」를 확인하지 않았다.

- **RED** — 없음 (측정)
- **GREEN** — 초안 상태로 푸시하고 `gh run list` 와 `gh pr checks` 를 본다.
  실제로 무엇이 뜨는지 그대로 적는다. **예상과 다르면 할 일 3·4 를 고친다**
- **REFACTOR** — 없음

**files**: `docs/plans/2026-09-18-ci-ready-gate.md` (관측 결과를 여기 적는다)
**depends-on**: [1]
**검증**: 계획 파일에 「초안 푸시 후 실측」 절이 있고 명령 출력이 붙어 있다

### 할 일 6. 거짓이 된 문서 셋을 고친다 (§2.7 ④)

- **RED** — 없음 (문서)
- **GREEN** — 셋
  - `docs/SETUP.md:85` — 「**첫 푸시부터** CI 가 돈다」 → 초안에서는 안 돈다
  - `.claude/skills/tpx-review/SKILL.md:10` — 「게이트 2 를 막는 **기계 장치는 없다**」 →
    이제 있다. 다만 **CI 는 게이트 2 를 대신하지 않는다** (CI 는 타입·테스트만 본다)
  - `docs/HOOKS.md` — CI 와 pre-push 가 겹치는 자리를 한 줄로 정리
- **REFACTOR** — 없음

**files**: `docs/SETUP.md` `.claude/skills/tpx-review/SKILL.md` `docs/HOOKS.md`
**depends-on**: []
**검증**: `npm run check:spec` 종료 코드 `0` ·
`grep -c '첫 푸시부터 CI' docs/SETUP.md` 가 `0` ·
`grep -c '기계 장치는 없다' .claude/skills/tpx-review/SKILL.md` 가 `0`

## 안 고치는 것

| 무엇 | 왜 |
|---|---|
| `check:workflow` 를 CI 에 넣기 | 사용자가 이번 범위로 안 골랐다. **한 줄이고 같은 파일이라 다음에 싸다** |
| `docs/spec/공통/2-명세선언.md:106` | `check:tests` 가 CI 에 남으므로 문장이 참이다 |
| `docs/WORKSTREAMS.md` 의 CI 언급 셋 | 스크립트 **이름**이 계약이라고 적은 것이고, 이름은 안 바뀐다 |
| `enforce_admins: true` | 소유자 혼자 쓰는 저장소다. CI 가 깨지면 빠져나갈 길이 없어진다 |

## SPEC 동반 수정 (§2.7)

**해당 없음 — SPEC 안 건드림.** `docs/spec/**` 와 `docs/SPEC.md` 가 diff 에 없다.

§2.7 ④ 목록 중 `docs/SETUP.md` · `docs/HOOKS.md` 는 §2.7 때문이 아니라
**이번 작업 자체의 대상**이라 할 일 6 에 넣었다.

## Plan 메타

할 일 6개 · 예상 묶음 2개 · 구현 규율: TDD ·
추가 검증: `npm run check:workflow && npm run check:spec && npm test`

묶음 1 — 할 일 1 · 2 · 4 · 6 (`files` 안 겹침)
묶음 2 — 할 일 3 · 5 (둘 다 1 에 의존)

## 리뷰 결과

**렌즈**: `plan-eng-review` (2등급 = 1종) · 2026-09-18
**판정**: BLOCKER 2건 · 주의 3건

### BLOCKER 1 — 「건너뜀 = 통과」를 전제로 설계했는데, 그게 사실이면 필수 체크가 무력해진다

계획이 이 전제를 「할 일 5 가 실측한다」로 미뤘다. **미루면 안 된다 — 설계가 갈린다.**

GitHub 이 건너뛴 job 을 필수 체크에서 통과로 센다면, 초안 푸시마다 `synchronize` 가
떠서 `check` 를 **초록으로 기록**한다. 그러면 `gh pr ready` 직후 새 실행이 큐에 오르기 전까지
**필수 체크가 이미 초록이다.** 보호가 병합을 안 막는다.

계획은 이 틈을 `tpx-merge` 의 `--watch` 로 막겠다고 한다. **그건 체인 안에서만 막는 것이다.**
사용자가 GitHub 화면에서 직접 누르면 그대로 병합된다 — 요청은 「**머지 불가능**하게」였다.

**고칠 것.** 초안에서 워크플로가 **아예 안 뜨게** 한다. `synchronize` 에 job 가드를 거는 대신,
`on:` 을 `types: [ready_for_review, synchronize, reopened]` 로 두고 **job 가드를 없앤 뒤**,
초안일 때 워크플로 자체가 실행되지 않도록 `paths-ignore` 가 아니라
**`if:` 를 job 이 아니라 전체 job 의 첫 스텝으로 옮기고 실패시키는** 방식은 쓰지 않는다.
실측이 먼저다 — **할 일 5 를 할 일 1 앞으로 옮기고**, 결과에 따라 셋 중 하나를 고른다.

| 실측 결과 | 설계 |
|---|---|
| 건너뜀이 **통과로 센다** | job 가드를 버린다. `types: [ready_for_review, synchronize]` 만 두고 초안 `synchronize` 는 **실행되게 두되** 필수 체크를 **별도 job 이름**으로 분리해, 초안에서는 그 이름이 아예 안 뜨게 한다 |
| 건너뜀이 **pending 으로 남는다** | 지금 계획 그대로 간다 |
| 초안에서 `synchronize` 가 **안 뜬다** | 가드조차 필요 없다 |

### BLOCKER 2 — 할 일 3 이 「되돌리는 법」을 안 적었고, 잠글 위험을 안 쟀다

브랜치 보호는 **저장소 설정**이라 판별식도 `git revert` 도 안 듣는다.
계획의 되돌리기 서술은 「보호를 지운다」 한 줄뿐이고 **명령이 없다.**

**더 큰 것** — 필수 체크 이름을 `check` 로 고정하는데, 그 이름은 `ci.yml` 의 job 키다.
**누가 job 이름을 바꾸면 그 체크는 영영 안 뜨고 모든 PR 이 잠긴다.**
`enforce_admins: false` 라 `--admin` 으로 풀 수는 있지만, **그 사실이 어디에도 안 적힌다.**

**고칠 것.** ① 되돌리는 명령을 계획과 `docs/HOOKS.md` 에 적는다
② job 이름 `check` 가 보호 설정과 묶였다는 것을 `ci.yml` 주석에 박는다
③ 막혔을 때의 탈출구(`gh pr merge --admin`)를 `tpx-merge` 의 실패 절에 적는다

### 주의 1 — 할 일 2 가 `.github/**` 를 2등급으로 올리는데 근거가 약하다

`surfaces.mjs` 의 2등급은 `ADMIN` `RUNNER` `AUTH` `GUARD` — **제품이 깨지는 표면**이다.
CI 설정은 제품을 안 깨뜨린다. 다만 **병합 게이트를 쥔다** — `GUARD` 와 같은 성질이다.

2등급 자체는 맞다. 다만 **새 표면 `CI` 를 만들 필요가 있나.** `GUARD` 글로브에
`.github/**` 를 더하면 표가 안 늘어난다. `GUARD` 가 이미 「검사·훅·스크립트」다.

### 주의 2 — 할 일 1 의 `push: branches: [main]` 이 요청에 없던 것이다

사용자는 두 경우만 말했다. main 푸시 트리거는 **병합 뒤 안전망**이라는 내 판단이다.
쓸모는 있지만 **요청 밖이고, 필수 체크 이름을 main 에서도 쓰게 만든다** —
BLOCKER 2 의 잠금 위험과 얽힌다. 남길 거면 계획에 「요청 밖, 이유는 이것」이라고 적는다.

### 주의 3 — 할 일 4 의 `--watch` 가 무한정 기다린다

`gh pr checks --watch` 는 체크가 끝날 때까지 막힌다. CI 가 큐에서 멈추거나
워크플로가 아예 안 뜨면 **영영 안 끝난다.** 체인이 거기서 정지한다.

`--watch` 에 시간 제한 깃발이 없다. 감싸는 쪽에서 끊어야 한다.

### 통과한 것

- **`gh pr checks --watch --fail-fast` 두 깃발 모두 실재한다** (`gh pr checks --help` 확인)
- **필수 체크 이름 `check` 가 맞다** — 실제 job 이름을 API 로 확인했다
- **`surfaces.test.mjs` 가 실재한다** — 할 일 2 의 RED 전제가 성립한다
- **지금 초안 PR 에 CI 가 두 번 돌고 있다** (`pull_request` + `push`) — 계획의 문제 진술이 참이다
- **SPEC 을 안 건드리는 판단이 옳다.** `2-명세선언.md:106` 은 `check:tests` 가 남으므로 참이다
- **`enforce_admins: false` 판단이 옳다.** 혼자 쓰는 저장소에서 CI 가 깨지면 탈출구가 필요하다
- **`check:workflow` 를 이번에 안 넣는 판단이 옳다** — 사용자가 범위를 정했다
