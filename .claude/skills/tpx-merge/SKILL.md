---
name: tpx-merge
description: /tpx 체인 7단계 — 게이트 2 승인 뒤 초안을 풀고 병합하고 정리하고 기록한다. 전 등급 호출. 직접 부르지 않는다.
---

# /tpx-merge

체인 [7] 마지막. **이 절차는 사고를 구조적으로 막으려고 고정됐다** — 순서를 건너뛰지 않는다.

## 선행 조건

게이트 2 승인이 끝났다. 승인 전에 이 스킬을 부르지 않는다.

## 선행 읽기

**SPEC 은 다시 읽지 않는다. 재로드 금지.** 기록을 쓰기 위해 아래 둘의 **해당 부분만** 연다.

- `docs/progress/<갈래>.md` — 형식을 맞추려 마지막 항목 하나
- `docs/LEARNINGS.md` — `grep -n '^## '` 로 헤딩만. 같은 유형이 이미 있는지 보려는 것이다

## 일곱 스텝 — 순서대로, 건너뛰지 않는다

**그 단계에 들어가기 전에 해당 파일을 Read 로 연다 — 기억으로 하지 않는다.**
명령·순서·실측 근거가 전부 그 파일에 있다. 여기는 뼈대만 둔다.

| Step | 무엇 | 파일 |
|---|---|---|
| 1 | ★ 기록을 **먼저** 쓴다(진행판 체크 포함) — 그다음 미커밋·미푸시 전수 확인 | `references/1-record-ready-merge.md` |
| 2 | ★ 여기서 처음 초안 잠금을 푼다 — 새 CI 실행을 기다린다 | 〃 |
| 3 | 병합 (원격 브랜치 함께 삭제) | 〃 |
| 4 | ★ 작업방에서 나와(ExitWorktree) main 을 최신화한다 — 성공하면 진행판 재게시 | `references/2-exit-cleanup-close.md` |
| 5 | 브랜치를 치운다 — `-d` 만 쓴다 | 〃 |
| 6 | 기록 — 서식과 기준 (Step 1 에서 이미 쓴다) | 〃 |
| 7 | PR 을 닫는다 — `--done` 으로 체크리스트를 전부 채운다 | 〃 |

## Step 2 의 CI 기다리기만 보조 에이전트에 맡긴다

Step 2(초안 해제 · 새 CI 실행 기다림)만 `tpx-runner`(Haiku · effort low — `.claude/agents/tpx-runner.md`, 2026-10-08 사용자)로 넘긴다. 명령 원문은 파일에 있고 프롬프트는 그 경로와 절 제목만 가리킨다.
**Step 3(병합)은 메인이 직접 친다.** Haiku 가 읽은 `CI EXIT` 만 믿고 병합하면 되돌릴 수 없다. Step 1(기록)은 대화 맥락이 있어야 해서, Step 4 이후(작업방 나오기 · 진행판 게시 · 브랜치 정리 · PR 닫기)는 메인 세션 도구가 필요해서 메인에 남는다.
제목(`[작업중]` 을 뗀 것)은 메인이 만들어 넘긴다.

```
Agent({
  subagent_type: "tpx-runner",
  description: "tpx-merge Step 2 — PR #<번호>",
  prompt: "작업 디렉터리는 <작업방 절대경로> 다. .claude/skills/tpx-merge/references/1-record-ready-merge.md 의 " +
          "`## Step 2.` 절만 그대로 따르라(Step 3 은 하지 않는다). PR <번호> · 브랜치 <브랜치> · 새 제목 <제목>. " +
          "Bash 는 한 번에 `timeout: 600000` 으로 부른다. 끝나면 BEFORE · NOW · CI EXIT 값을 그대로 보고하라. " +
          "충돌 · DIRTY · 새 실행 안 뜸 · 시간 초과 · CI 빨강이면 표의 행동은 하지 말고 값과 증상을 보고만 하라 " +
          "(빨강이면 `gh run view <실행 번호> --log-failed` 요약도 — 꼴은 정의를 따른다)."
})
```

- **정의를 못 찾으면**(「없는 에이전트」 오류) `subagent_type: "general-purpose"` 에 `model: "haiku"` · `effort: "low"` 로 대신 낸다. 이때 `.claude/agents/tpx-runner.md` 본문을 프롬프트 맨 앞에 실어 규율이 따라가게 한다.
- 돌아온 뒤 메인이 `gh run view <실행 번호> --json conclusion,headSha` 로 확인한다. `NOW` ≠ `BEFORE`(새 실행) · `conclusion` 이 `success` · `headSha` 가 `gh pr view <번호> --json headRefOid` 의 PR 헤드와 같을 때만 Step 3 으로 간다. 하나라도 어긋나면 병합하지 않는다.
- 메인이 Step 3 병합을 직접 친 뒤 `gh pr view <번호> --json state` 로 MERGED 를 직접 확인한다. 확인 전에는 Step 4 로 가지 않는다.

## 출력

```
✅ 한 줄   <비전문가 한 문장 — 무엇이 반영됐나>
💡 의미   <어디서 결과를 확인할 수 있는지>
🔧 기술 상세 (안 봐도 됨)
🔄 [7/7] tpx-merge
   ├─ 미커밋 0 ✅ · 미푸시 0 ✅ · 검사 근거 확인 ✅
   ├─ gh pr ready → 초안 해제 · `[작업중]` 뗌
   ├─ 병합: PR #<번호> merged · 원격 브랜치 삭제 ✅
   ├─ 작업방에서 나옴 → main 최신화 ✅ (뒤처짐 0) · 진행판 재게시 ✅ (완료 N / M)
   ├─ 작업방: 정리 또는 유지
   ├─ 브랜치 정리: <N>개 (`-d`) · 정리 못 한 것 <없음 또는 목록>
   └─ 기록: progress ✅ · LEARNINGS <N건 또는 해당 없음>
```

## 실패 / 엣지

- **Step 1 에서 미커밋 발견** — 작업방 제거 전에 커밋·푸시. 계획·문서 소실이 1순위 위험
- **병합 충돌** — `git pull --rebase origin main`, 충돌 파일 표시, 사용자 개입
- **작업방 제거가 거부된다** — `--force` 를 붙이지 말고 Step 1 로 돌아가 남은 것을 본다
- **병합은 됐는데 브랜치 삭제가 실패** — 정상일 수 있다. `gh pr view --json state` 로 실제를 확인한다
