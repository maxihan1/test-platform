---
name: tpx
description: 테스트 자동화 플랫폼의 모든 코드 작업 진입점. 자연어로 하고 싶은 일을 주면 등급을 재고 네 단계(시작 → 구현 → 끝 검사 → 병합)를 끝까지 돈다. "WS-C 진행해줘", "문서 오타 고쳐줘", "화면에 버튼 더해줘" 처럼 무언가를 만들거나 고치라고 할 때 쓴다. 읽기만 하는 질문·코드 설명·이미 돌던 작업 이어가기에는 쓰지 않는다.
---

# /tpx

네 단계를 끝까지 돈다. **사람에게 묻는 것은 2·3등급의 시작 한 번뿐이다.** 그 밖에는 멈추지 않고 병합까지 간다
(2026-10-09 사용자 — 서비스 전 · 혼자 작업 · 진도 우선).

```
1. 시작      등급 · 작업 폴더 · 초안 PR · (2·3등급) 시작 질문 한 번
2. 구현      코드 + 테스트 (버그 수정은 재현 테스트 먼저)
3. 끝 검사   pre-push + 렌즈 하나 (명세가 바뀌었으면 spec-review 하나 더)
4. 병합      병합 · 진행판 · (PRD 영역) 다음 태스크 새 세션 · 보고
```

## 1. 시작

**파일을 고치기 전에 초안 PR 부터 연다.**

1. 메인 체크아웃이 낡았는지 본다 — `git fetch -q origin main` 다음 `git rev-list --count main..origin/main`.
   0 이 아니면 멈추고 사용자에게 `! cd <저장소 루트> && git pull` 을 부탁한다(낡은 스킬로 돌게 된다).
2. 등급 — `node .claude/scripts/detect-tier.mjs <바꿀 경로들>`. 등급 · 차선 · `미분류` 를 PR 본문에 적는다.
   애매하면 높은 쪽. 표면 → 등급 정본은 `.claude/scripts/surfaces.mjs`.
3. 작업 폴더 — 배경 세션은 `EnterWorktree`, 아니면 `git worktree add .claude/worktrees/<이름> -b <이름> origin/main`.
   브랜치 이름은 짐작하지 말고 `git rev-parse --abbrev-ref HEAD` 로 읽는다. **만든 직후 자기 패키지 연결을 건다** —
   안 걸면 이번 브랜치의 새 공유 심볼이 main 것을 읽어 조용히 `undefined` 가 된다(2026-09-21 사고).
   ```bash
   mkdir -p <작업 폴더>/node_modules/@platform
   ln -sfn ../../packages/kit   <작업 폴더>/node_modules/@platform/kit
   ln -sfn ../../apps/admin     <작업 폴더>/node_modules/@platform/admin
   ln -sfn ../../apps/runner    <작업 폴더>/node_modules/@platform/runner
   ```
4. 초안 PR — 빈 커밋(`chore: <이름> 시작`) → `git push -u origin <브랜치>` →
   `gh pr create --draft --title "[작업중] <제목>" --body "<본문>"`. 본문은 「무엇을 만드나(왜까지 한 문단)」 · 「확인 방법(눌러볼 명령이나 클릭 경로)」 · 등급,
   2·3등급이면 「할 일」 3~7줄을 더한다. **계획 파일은 만들지 않는다.**
   push 가 자동 권한 검사에 막히면 우회하지 않고 사용자에게 `! git -C <작업 폴더> push -u origin <브랜치>` 를 부탁한 뒤
   `git ls-remote --heads origin <브랜치>` 로 올라갔는지 본다.
5. `npm run check:deps` — 누락이면 내 탓이 아니다. 사용자에게 `npm install` 을 부탁한다.
6. **2·3등급만 시작 질문 한 번** — `AskUserQuestion` 하나. 질문 칸은 CLAUDE.md §4 「말투」 꼴로 쓴다 —
   하려는 것 한 문장 · ■ 예를 들면 · ■ 제가 정해 둔 것(명세 약속을 바꾸면 풀어 쓴 말로 여기에) · ■ 화면(바뀌면 글자 그림) · 「이대로 만들까요?」.
   선택지는 진행 / 중단 (고칠 점은 「Other」). 사용자는 질문 창만 보고 답한다 — 배경을 질문 밖에만 쓰지 않는다.

**명세는 이번 일에 걸리는 절만 읽는다** — `docs/SPEC.md` 「기능을 더하거나 고칠 때」 표에서 장을 찾고,
절 제목을 `grep -nF` 로 찾아 그 줄 범위만 연다. 장 전체를 읽지 않는다.

### 배경 세션의 함정
- git 을 복합 명령에 넣지 않는다 — `git -C <작업 폴더> <명령 하나>` 로 따로 부르고, 파일은 편집 도구로 고친다
- `git stash` 를 맨몸으로 쓰지 않는다(모든 작업 폴더가 공유). 치워 둘 것은 임시 커밋으로

## 2. 구현

- 제품 코드를 바꾸면 테스트를 같은 커밋에 같이 쓴다. 버그 수정은 재현 테스트를 먼저 쓰고 실패를 확인한다.
  화면 손질 · 문서 · 하네스는 새 테스트를 안 쓴다 (CLAUDE.md §2.1). 한 기능 한 커밋,
  `git -C <작업 폴더> commit -m "[WS-X] <무엇>" -- <이번 커밋에서 바꾼 경로들>`
- 기획서에서 케이스를 만드는 일이면 `tpx-cases` 스킬을 부른다
- 할 일이 셋 이상이고 서로 독립이면 `tpx-implementer`(Sonnet) **한두 명**에 묶어 맡긴다. 프롬프트에 할 일 · 고칠 파일 ·
  검증 명령 · 명세 위치(`파일:줄` + 절 제목)를 싣는다. 보안 · 비밀값 · 권한을 고치는 할 일은 `general-purpose` 에 `model: "opus"`.
  그보다 작으면 직접 한다 — 보조 에이전트 하나가 시작만으로 약 5만 토큰을 쓴다
- 명세를 고치면 CLAUDE.md §2.7 ① — 고친 문장의 핵심 낱말로 `docs/spec/` 를 훑어 같은 규칙을 적은 다른 절도 고친다

## 3. 끝 검사 — 한 명

1. `git push` — pre-push 가 차선대로 검사한다(`docs/HOOKS.md`). 빨개지면 고치고 다시 push
2. **렌즈 하나** — `Skill` 로 `code-review`, args 는 `<강도> origin/main...HEAD in <작업 폴더 절대경로>`.
   강도는 0·1등급 `low` · 2·3등급 `medium` · 인증 · 권한(`AUTH` 표면)을 고쳤으면 `high`
3. `docs/spec/**` · `docs/SPEC.md` 가 바뀌었으면 `spec-review` 를 하나 더 — `general-purpose` · `model: "opus"` 보조 에이전트에
   「작업 폴더 `<절대경로>` · 범위 `origin/main...HEAD` · 고치지 말고 보고만」으로 낸다
4. 지적을 고친 뒤에는 **렌즈를 다시 부르지 않는다** — 고치고 push 해서 pre-push 만 다시 통과시킨다
5. 고칠 수 없는 치명이거나 사람이 정할 문제일 때만 멈추고 묻는다. 그 밖의 지적은 고치고 넘어간다

## 4. 병합

1. `git status --porcelain` 이 비고 `git log origin/<브랜치>..HEAD` 가 0 인지 본다
2. 진행판 — `docs/wbs.md` 에서 이번에 끝낸 태스크를 `[x]` 로, 다음 줄에 `  - 근거 PR #<번호> · <오늘>` 을 달고 커밋 · push. 해당 태스크가 없으면 건너뛴다
3. `gh pr ready <번호>` → `gh pr edit <번호> --title "<[작업중] 을 뗀 제목>" --body "<최종 본문 — 한 일 · 확인 방법 · 검사 결과 한 줄>"`
4. `gh pr view <번호> --json headRefOid -q .headRefOid` 로 헤드를 읽고 `gh pr merge <번호> --merge --delete-branch --match-head-commit <헤드>` →
   `gh pr view <번호> --json state -q .state` 가 `MERGED` 인지 본다. 사람 PR 은 CI 잡이 건너뛰기라 기다릴 것이 없다
5. 작업 폴더에서 나온다(`ExitWorktree` 지우기) → 루트에서 `git pull --ff-only origin main` → `git worktree prune` → 브랜치가 남았으면 `git branch -d <브랜치>`.
   **나오기 전에는 main 을 갱신할 수 없다**(다른 작업 폴더에 체크아웃된 브랜치라 git 이 거부한다). `-D` 는 쓰지 않는다
6. pull 이 성공했으면 진행판 게시 — 루트에서 `npm run progress` → `Artifact` 로 `file_path: <루트>/build/progress.html`,
   `url: https://claude.ai/artifact/LN2fiNzKQcyB3aym6rzQY3`. **`url` 을 빼지 않는다** — 빼면 새 주소가 생겨 사용자가 보던 진행판이 멈춘다
7. 이어 달리기 — 2 · 4 · 5 · 6 이 모두 성공했으면 루트에서 진행판 `## PRD` 영역의 **이번 줄 아래** 체크 안 된 첫 번호를 읽는다
   (2026-10-10 사용자 — 항상 새 세션 · 전부 끝난 뒤 · PRD 위에서부터. 이번 줄 위의 빈칸은 다른 세션이 하는 중일 수 있어 건너뛴다).
   ```bash
   awk -v id="<이번 번호>" '/^## /{p=/^## PRD/} p && f && /^- \[ \] `/{match($0,/`[^`]+`/); print substr($0,RSTART+1,RLENGTH-2); exit} p && index($0, "`" id "`") == 7 {f=1}' docs/wbs.md
   ```
   번호가 나오면 `claude --bg "/tpx <번호>"` 로 새 배경 세션을 띄우고 찍힌 세션 id 를 받아 둔다.
   빈칸(PRD 영역 끝 · PRD 영역 밖 일 · 진행판 태스크가 아닌 일)이거나 막힘 · 병합 실패 · 게시 실패면 띄우지 않는다
8. CLAUDE.md §2.4 형식으로 보고한다. 「다음:」 줄에 띄운 번호와 세션 id, 안 띄웠으면 그 이유를 적는다

## 막혔을 때

같은 문제를 3번 시도해서 안 되면 멈추고 CLAUDE.md §6 형식으로 보고한다.
검사가 빨간데 내 변경 때문이 아닌 것 같으면 `git diff origin/main...HEAD` 로 실제 바뀐 것부터 본다.
