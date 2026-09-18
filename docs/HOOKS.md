# HOOKS.md — 자동 차단 설정

> 규칙 중 **기계적으로 판정되는 것**을 훅으로 강제한다.
> 훅은 값싼 1차 방어선이고, `spec-review` 스킬이 2차다.
> 문맥을 읽어야 아는 것(스냅샷인가 참조인가)은 훅으로 못 잡는다.

---

## 설치

```
프로젝트루트/
  .claude/
    settings.json          ← 이 폴더의 settings.json
    scripts/
      guard.mjs            ← 이 폴더의 guard.mjs
```

`settings.json`은 커밋한다. 팀이든 세션이든 같은 규칙이 적용된다.
Node는 Claude Code가 이미 쓰고 있으므로 별도 설치가 없다.

설치 확인:

```bash
echo '{"tool_input":{"file_path":"packages/kit/src/types.ts"}}' \
  | node .claude/scripts/guard.mjs protected; echo "exit=$?"
```

`exit=2`와 차단 메시지가 나오면 정상이다.

---

## 무엇을 막는가

| 모드 | 시점 | 막는 것 |
|------|------|--------|
| `protected` | 수정 전 | **지금은 아무것도 안 막는다** — 잠금 목록(`LOCKED`)을 2026-09-17에 비웠다 (아래 참조) |
| `ownership` | 수정 전 | 담당 워크스트림 소유 경로 밖 파일 수정 |
| `bash` | 실행 전 | 강제 push, 브랜치 강제 삭제, 마이그레이션 되돌리기, **Bash로 보호 경로·소유 경로 밖 파일을 고치는 명령**(리다이렉트 `>`, `sed -i`, `tee`, `mv`, `cp`, `rm`) |
| `tests` | 수정 후 | `tests/**`의 주석, `expect` 직접 호출 |
| `review` | 응답 끝날 때 | 소스를 고쳤는데 오늘 SPEC 검사 기록이 없으면 **경고** (차단은 pre-push가 한다) |

차단은 exit code 2로 이뤄진다. **stderr에 적은 내용이 Claude에게 전달되므로**,
단순히 막는 게 아니라 "왜 막혔고 대신 무엇을 해야 하는지"를 읽고 스스로 고친다.
그래서 차단 메시지에 SPEC의 해당 규칙과 대안을 같이 적어뒀다.

`review`만 예외로 exit code 1(경고)이다. Stop 훅은 세션 종료가 아니라 **매 응답 끝마다** 돌기 때문에,
여기서 막으면 첫 편집 직후에 의미 없는 자기검사를 강제하게 된다. 경고는 사용자에게 보이고,
실제 차단은 **`.claude/hooks/pre-push`**(테스트 통과 + 오늘 날짜 검사 기록)가 맡는다.

**2026-09-18 에 `.git/hooks/` 에서 옮겼다.** 거기는 추적이 안 돼 PR 에 안 실리고
판별식이 못 보고 새 기계에서 사라진다. 배선은 `git config core.hooksPath .claude/hooks`
한 번이고 `docs/SETUP.md` 에 적혀 있다 — **그 설정 자체는 여전히 추적되지 않는다.**

**브랜치 삭제 push 는 검사를 건너뛴다.** git 이 stdin 으로 주는 로컬 sha 가 전부 0 이면
올릴 코드가 없다는 뜻이다. 2026-09-18 에 원격 브랜치 여섯을 지우며 전체 테스트가
여섯 번 돌았다. 입력이 비면 **검사로 간다** — 삭제로 보면 검사가 새어 나간다.
계약은 `.claude/scripts/hook-contract.test.mjs` 가 본다.

Bash 편집 차단은 휴리스틱이다. 명령 문자열에서 `apps/`, `packages/`, `db/`, `docker-compose.yml` 같은
경로 앞에 쓰기 연산자가 보이면 막는다. `python -c`로 파일을 쓰는 식은 못 잡는다.

### 잠금 목록을 비웠다 (2026-09-17)

`types.ts` · `db/migrations/` · `docker-compose.yml` 세 파일은 개정 SPEC 이 바꿀 내용을 이미 정하고
사용자 승인까지 끝냈다. 잠금은 "말없이 바꾸지 마라"는 장치인데 **이미 말하고 승인받은 일까지 막고 있어서**
`guard.mjs` 의 `LOCKED` 를 빈 배열로 비웠다. `protected` 모드와 `bash` 모드의 보호 경로 검사가 같이 멈춘다.

**이제 그 세 파일을 막는 것은 없다.** 유일한 방어선은 `spec-review` A1~A3 이고,
검사 기준도 "안 바뀌어야 통과"에서 **"SPEC 대로 바뀌었나"** 로 바꿨다.
새로 확정되는 계약이 생기면 `guard.mjs` 의 `LOCKED` 에 한 줄 적는다 — 적는 순간 다시 막힌다.

**주의 — 워크트리에서는 메인 체크아웃 쪽 파일이 돈다.** 훅 명령이 `$CLAUDE_PROJECT_DIR/.claude/scripts/guard.mjs`
인데 이 변수가 워크트리가 아니라 **메인 체크아웃**을 가리킨다. 워크트리 안의 `guard.mjs` 를 고쳐도
그 세션에는 반영되지 않고, 브랜치가 main 에 병합된 뒤부터 적용된다.
`.claude/settings.local.json` 과 같은 성질이다 (아래 「워크스트림 지정」).

`bash` 검사는 명령 문자열 전체를 본다. `echo` 안에 인용된 문구도 똑같이 막힌다.
안전한 쪽으로 기우는 오탐이라 그대로 둔다. 문구를 쪼개서 쓰면 된다.

---

## Phase 0는 반드시 예외로 실행한다

Phase 0는 `types.ts`, `db/migrations/`, `docker-compose.yml`을 **처음 만드는** 단계다.
`protected` 검사가 이걸 막으므로, Phase 0 동안은 예외 스위치를 켠다.

```bash
printf '{\n  "env": { "ALLOW_PROTECTED": "1" }\n}\n' > .claude/settings.local.json
```

**환경변수를 앞에 붙이는 방식(`ALLOW_PROTECTED=1 claude`)은 쓰지 마라.** 안 먹는다.
Claude Code는 데몬(백그라운드에 상주하며 세션을 대신 돌리는 관리 프로세스) 구조라,
세션이 터미널이 아니라 데몬에서 태어난다. 터미널 앞에 붙인 환경변수는 세션까지 오지 않는다.
설정 파일에 넣어야 전달된다. (2026-09-16 Phase 0에서 확인. Claude Code 2.1.273)

파일을 만든 뒤에는 세션을 한 번 다시 띄운다. 설정은 세션이 뜰 때 읽힌다.
`.claude/settings.local.json`은 커밋하지 않는다.

Phase 0에서는 `tests` 검사도 같이 꺼진다. Phase 0의 데모 테스트는 `defineCase`/`verify`가
아직 없어 순수 Playwright(`expect`)로 쓰기 때문이다. WS-C가 `defineCase` 형태로 전환한 뒤부터 걸린다.

Phase 0가 끝나고 게이트 G1을 통과한 뒤부터 예외 없이 띄운다.
그 시점부터 세 파일이 계약으로 잠긴다.

## 검사 기록

`review` 훅은 `docs/reviews/` 폴더의 파일명 날짜를 본다.
`spec-review` 스킬은 검사를 마치면 `docs/reviews/2026-10-02-WS-C.md` 형식으로
결과를 남겨야 한다. 남기지 않으면 경고가 계속 뜨고, 푸시는 pre-push가 막는다.

## 워크스트림 지정

`ownership` 검사는 지금 세션이 어느 갈래인지 알려줘야 동작한다.
예외 스위치와 같은 이유로 **터미널 앞에 붙이는 `WORKSTREAM=C claude`는 안 먹는다.**
같은 설정 파일에 넣는다.

```bash
printf '{\n  "env": { "WORKSTREAM": "C" }\n}\n' > .claude/settings.local.json
claude
```

갈래를 바꿀 때는 `"C"` 자리만 바꿔 다시 쓴다.

**워크트리(`git worktree`)에서 일할 때도 고치는 곳은 메인 체크아웃 쪽이다.**
`.claude/settings.local.json`은 gitignore라 새 워크트리에 딸려오지 않고,
세션 환경변수는 메인 체크아웃 설정에서 온다. 워크트리 안에 같은 파일을 만들어도 안 바뀐다.
메인 쪽 파일을 고치면 즉시 반영된다 (세션을 다시 띄울 필요 없다).
Phase 0가 끝난 뒤 이 파일에 `ALLOW_PROTECTED`가 남아 있으면 안 된다. 위 명령은 통째로 덮어쓰므로
잠금을 되돌리는 일과 갈래를 지정하는 일이 한 번에 끝난다.

지정하지 않으면 이 검사만 건너뛴다. 나머지는 그대로 동작한다.
`/tp` 로 도는 작업은 `tp-start` Step 2 가 작업방을 만들 때 `export WORKSTREAM=<갈래>` 로 세우므로 이 파일을 손대지 않는다. 갈래가 없는 작업(하네스·계약 반영)에는 아예 세우지 않는다 — 세우면 못 고칠 파일이 생긴다.
`docs/`, `.claude/`는 공용이라 항상 허용된다. `tests/`는 WS-C 소유다 (데모 테스트를 defineCase로 전환하는 갈래).

---

## 빠져나가기

병합 단계에서는 여러 폴더를 동시에 건드려야 한다. 그때만 켠다.

```bash
printf '{\n  "env": { "ALLOW_PROTECTED": "1" }\n}\n' > .claude/settings.local.json
# 끝나면 반드시
rm .claude/settings.local.json
```

`protected`·`ownership`·`tests`와 `bash`의 경로 검사가 꺼진다.
`bash`의 위험 명령 차단(강제 push 등)은 계속 동작한다.

`pre-push`는 git이 부르는 훅이라 Claude Code 설정을 보지 못한다. 터미널에서 직접 푸시하면
`ALLOW_PROTECTED`가 셸에 없으므로 검사 기록 확인이 그대로 걸린다. 의도된 동작이다 —
설정 파일을 켜뒀어도 사람이 손으로 푸시할 때는 검사 기록을 요구한다.

**평소에 켜두지 마라.** 파일로 남는 스위치라 끄는 것을 잊기 쉽다.
이 검사들이 병렬 작업의 안전장치 전부다. 지우는 것까지가 한 세트다.

---

## 훅으로 안 되는 것

아래는 문맥을 읽어야 판정되므로 `spec-review` 스킬이 담당한다.

- `run_item`의 값이 스냅샷인가 참조인가 (B1)
- 러너가 DB에 접근하는가 (B3)
- Reporting이 읽기 전용인가 (B7)
- 화면이 디바이스별 판정을 묶어 보여주는가 (F2)

훅이 통과했다고 SPEC을 지킨 것이 아니다. 검사는 여전히 돌려야 한다.

---

## 나중에 추가할 만한 것

지금은 넣지 않았다. 필요해지면 그때 붙인다.

- `tests` 훅을 `npm run check:tests`로 교체 — WS-A가 검사기를 만든 뒤. 지금 정규식은 Claude 편집 전용
  1차 방어이고, 사람이 쓴 테스트 코드는 CI가 같은 규칙(SPEC §4 K1~K8)으로 검사한다
- `PostToolUse`에 `tsc --noEmit` — 타입 에러를 즉시 피드백.
  파일 저장마다 돌면 느려지므로, 프로젝트가 커진 뒤에 판단한다
- `Stop`에 진행 기록 누락 확인 — 세션이 끝나는데 `docs/progress/`가
  그대로면 경고. 규칙이 실제로 안 지켜지면 그때 넣는다
