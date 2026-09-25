# tpx-merge — Step 1~3 (기록 · 초안 해제 · 병합)

## Step 1. ★ 기록을 **먼저** 쓴다 — 그다음 전수 확인

**Step 6 의 기록(진행·LEARNINGS)을 여기서 쓴다.** 서식과 기준은 Step 6(`references/2-exit-cleanup-close.md`)에 그대로 있다.

**왜 여기인가** (2026-09-23 실측). 단계 순서를 글자 그대로 따라 **병합하고 나서** 기록을 쓰려 했더니
**브랜치가 이미 지워져 담을 자리가 없었다.** 기록만을 위한 PR 을 따로 열게 됐다 —
그 PR 은 검사도 CI 도 다시 돌아 **한 번에 끝낼 일이 두 번이 된다.**

**기록은 그 PR 의 산출물이다.** 다른 자리에 떨어지면 다음 세션이 그 작업을 읽을 때 기록이 옆에 없다.

---

작업방에 커밋 안 된 산출물(특히 계획·문서)이 남아 있으면 작업방을 지울 때 **영구 소실**된다.

```bash
git status --porcelain                       # 비어야 한다
git log origin/<브랜치>..HEAD --oneline      # 미푸시 0
```

미커밋이 있으면 그 작업의 산출물인지 보고 커밋·푸시한다. **계획·문서가 1순위 소실 위험**이다.

**여기서 `gh pr checks` 를 보지 않는다.** 2026-09-18 부터 **CI 는 초안에서 안 돈다** —
지금은 아직 초안이라 볼 것이 없다. 검사는 Step 2 가 잠금을 푼 뒤에 온다.

## Step 2. ★ 여기서 처음 초안 잠금을 푼다

**`gh pr ready` 는 체인 전체에서 이 줄 하나뿐이다.** 판별식 `pr-draft-guard` 가 강제한다.

```bash
# ① 잠금을 풀기 전에 「지금 마지막 실행」의 번호를 적어 둔다
BEFORE=$(gh run list --branch <브랜치> --limit 1 --json databaseId -q '.[0].databaseId')

gh pr ready <번호>
gh pr edit <번호> --title "<`[작업중]` 을 뗀 제목>"

# ② ready 가 만든 **새 실행**이 뜰 때까지 기다린다 (최대 2분)
for i in $(seq 1 24); do
  NOW=$(gh run list --branch <브랜치> --limit 1 --json databaseId -q '.[0].databaseId')
  [ "$NOW" != "$BEFORE" ] && break
  sleep 5
done

# ③ 그 실행이 끝날 때까지. 빨강이면 0 이 아닌 코드로 끝난다
timeout 900 gh run watch "$NOW" --exit-status
echo "CI EXIT=$?"
```

초안이 잠금 역할을 한다 — 2026-09-17 에 두 번 난 사고(#4→#5, #6→#7, 먼저 병합돼서
뒤 커밋 누락)를 막는 장치다. **작업 중에는 병합하고 싶어도 버튼이 안 눌린다.**

### ★ `gh pr checks --watch` 를 쓰지 않는다 — 2026-09-18 실측

처음엔 `gh pr checks <번호> --watch --fail-fast` 를 썼다. **작동하지 않는다.**

```
17:19:52  $ gh pr checks 22 --watch --fail-fast
          check   skipping
17:19:54  → EXIT=0.  2초 만에 끝났다. 안 기다렸다
```

초안에서 푸시할 때마다 CI 가 **건너뜀(`skipping`)** 으로 딱지를 남긴다.
`--watch` 는 **대기중(`pending`)이 없으면** 바로 빠져나오는데, `skipping` 은 대기중이 아니다.
그래서 **묵은 딱지를 읽고 통과시킨다.**

세 명령이 한 덩어리로 2.5초에 끝나므로 **CI 가 한 번도 안 돈 채 병합된다.**
경쟁 상태가 아니라 **매번** 그렇다. 그래서 위처럼 **실행 번호가 바뀌는 것**을 본다.

### 왜 실행 번호로 보나

| 읽는 것 | 왜 안 되나 |
|---|---|
| `gh pr checks --watch` | 묵은 `skipping` 을 통과로 읽는다 (위 실측) |
| `gh pr view --json mergeStateStatus` | 같은 이유로 `ready` 직후 몇 초간 `CLEAN` 이다 |
| **실행 번호가 바뀌는 것** | 옛 실행과 새 실행을 **구분할 수 있는 유일한 값**이다 |

### 실패 / 엣지

| 증상 | 어떻게 |
|---|---|
| 2분이 지나도 새 실행이 안 뜬다 | 워크플로가 안 떴다. `gh run list --branch <브랜치>` 로 확인하고 **병합하지 않는다** |
| `timeout` 이 900초에 끊었다 | 큐가 막혔다. `gh run view <번호>` 로 상태를 보고 사용자에게 보고한다. **끊긴 것을 통과로 읽지 않는다** |
| CI 가 빨강 | **병합하지 않는다.** 고치고 푸시하면 `synchronize` 로 다시 돈다 |
| 보호가 막는데 정말 병합해야 한다 | 관리자 우회 깃발이 있다. **체인은 절대 쓰지 않는다** — 사람이 이유를 대고 직접 친다. 명령은 `docs/HOOKS.md` 에 있다 |

## Step 3. 병합

```bash
gh pr merge <번호> --merge --delete-branch
gh pr view <번호> --json state -q .state      # MERGED 확인
```

**`--delete-branch` 가 원격 브랜치를 함께 지운다.** 병합된 브랜치라 안전하다 (CLAUDE.md §5).

⚠️ **`--delete-branch` 가 「main is already used by worktree」로 실패해도 병합 자체는 성공한 것이다.**
에러 메시지에 속지 말고 `gh pr view --json state` 로 확인한다. 남은 원격 브랜치는 Step 5 가 치운다.

충돌이 나면 `git pull --rebase origin main` 후 충돌 파일을 표시하고 사용자에게 넘긴다.

**`--force` push · 브랜치 삭제 · 마이그레이션 되돌리기는 하지 않는다** (CLAUDE.md §5).
