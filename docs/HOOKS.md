# HOOKS.md — 자동 검사

> 기계로 판정되는 규칙만 훅으로 강제한다. 문맥을 읽어야 아는 것(값이 스냅샷인가 참조인가 등)은 `/tpx` 끝 검사(code-review · spec-review)가 본다.
> **사람 PR 에는 CI 가 없다** (2026-10-09 사용자 — 서비스 전 · 혼자 작업). pre-push 가 유일한 자동 검사다.

---

## Claude Code 훅

`.claude/settings.json` 이 `.claude/scripts/guard.mjs <모드>` 를 부른다.

| 모드 | 시점 | 막는 것 |
|------|------|--------|
| `bash` | 실행 전 | 강제 push · 브랜치 강제 삭제 · 마이그레이션 되돌리기 · 루트 · 홈 폴더 자체 삭제(`/Users/<이름>/` 안쪽은 허용) · 무늬로 프로세스 끄기(`pkill -f` · `$(pgrep -f …)`) |
| `tests` | 수정 후 | 작업 폴더 안 `tests/**` 의 주석 · `expect` 직접 호출 |
| `fanout` | 보조(Agent) 띄우기 전 | **작성 자식에서만**(`AUTHORING_GATE3_DIR` 이 있을 때) 케이스 작성 보조의 다섯 번째 묶음 · 같은 묶음 세 번째 띄우기(도메인/작성 §3.6 팬아웃) |

exit 2 로 막고, stderr 에 적은 이유와 대안을 Claude 가 읽고 스스로 고친다.
배선과 구현이 어긋나면 `.claude/scripts/guard-wiring.test.mjs` 가 잡는다. 금지 명령 판정 정본은 `guard.mjs` 의 `isBanned()`.

설치 확인 — `exit=2` 와 차단 메시지가 나오면 정상이다.

```bash
echo '{"tool_input":{"command":"git push --force origin main"}}' | node .claude/scripts/guard.mjs bash; echo "exit=$?"
```

---

## pre-push

`.claude/hooks/pre-push`. 배선은 `git config core.hooksPath <루트>/.claude/hooks` 한 번이다(`docs/SETUP.md`) — 그 설정은 추적되지 않는다.
**절대경로라 작업 폴더에서 push 해도 main 체크아웃의 훅이 돈다.** 훅을 고친 PR 은 병합 뒤부터 적용된다.

### 차선 — 바뀐 만큼만 검사한다

판정 정본은 `.claude/scripts/lane.mjs` 다. 여기에 규칙을 옮겨 적지 않는다.

| 차선 | 언제 | 도는 검사 |
|------|------|----------|
| `docs` | 문서만 | `check:spec` |
| `spec` | 명세가 든 문서만 | `check:spec` |
| `cases` | 테스트만 (가벼운 길) | `typecheck` · `check:tests` |
| `full` | 그 밖 | `typecheck` · `test:changed` + `test:always` · `.claude/` 가 바뀌면 `check:workflow` · `check:tests` |

- `db/` · `package.json` · `vitest.config.*` · `tsconfig` 가 바뀌면 `npm test` 전체를 돈다 — vitest 의 자동 재실행 조건이 점 폴더(`.claude/worktrees`) 경로에서 안 걸린다
- 브랜치 삭제 push · 빈 시작 커밋은 검사 없이 지나간다. 입력이 비거나 diff 를 못 읽으면 `full` 이다(보수적)
- 훅은 검사 전에 git 이 넣어 준 `GIT_*` 환경 변수를 걷는다 — 임시 저장소를 만드는 검사가 이 저장소에 커밋한 사고가 두 번 있었다
- 동작은 `.claude/scripts/hook-contract.test.mjs` 가 임시 저장소에서 훅을 실제로 돌려 본다
- 급할 때 사람만 `git push --no-verify`

---

## CI 와 병합 차단

`.github/workflows/ci.yml` 은 **작성 에이전트 PR(`author-<번호>` 브랜치)에서만** 돈다 — `typecheck` · `check:tests -- --no-held` · `check:secret-names`.
에이전트는 사본 저장소에서 push 해 pre-push 를 안 거치므로 이 잡이 유일한 검사이고, 에이전트가 이 결과를 읽고 병합한다(`scripts/authoring-merge.ts` `CI판정`).
테스트만 바뀐 PR 이라 케이스를 실행하지는 않는다 — 병합 근거는 에이전트가 PR 본문에 싣는 관문 3(3회 실행) 기록이다(가벼운 길).

사람 PR 과 초안에서는 잡이 조건으로 건너뛰어진다. **GitHub 은 건너뛴 잡을 필수 체크 통과로 센다** — 사람 PR 은 기다림 없이 병합된다.

### main 보호 설정

필수 체크 이름은 `check` 하나이고 `ci.yml` 의 job 이름과 묶여 있다. **job 이름을 바꾸면 그 체크가 영영 안 떠서 모든 PR 이 잠긴다** — 보호 설정을 먼저 고친다.

```bash
# 보기
gh api repos/maxihan1/test-platform/branches/main/protection \
  -q '.required_status_checks.contexts, .enforce_admins.enabled'
# 걸기
printf '%s' '{"required_status_checks":{"strict":false,"contexts":["check"]},
"enforce_admins":false,"required_pull_request_reviews":null,"restrictions":null}' \
  | gh api -X PUT repos/maxihan1/test-platform/branches/main/protection --input -
# 지우기
gh api -X DELETE repos/maxihan1/test-platform/branches/main/protection
```

`enforce_admins` 가 꺼져 있어 소유자는 `gh pr merge <번호> --admin` 으로 뚫을 수 있다. `/tpx` 는 이 깃발을 쓰지 않는다.
