---
name: tpx-author-game
description: 작성 에이전트(scripts/authoring-agent.ts)의 자식 세션이 애플리케이션 종류 「게임」일 때 부른다. 사람이 직접 부르지 않는다. 공통 절차 tpx-author 를 열어 따르게 하고, 게임 지침만 읽도록 열 파일을 정한다.
---

# /tpx-author-game

이 애플리케이션은 종류 「게임」이다. **이 스킬은 무엇을 읽을지만 정한다** — 할 일과 순서는 공통 절차가 정한다(정본 `docs/spec/도메인/작성.md` §3.6 「종류별 작성 AI」).

1. 공통 절차 `.claude/skills/tpx-author/SKILL.md` 를 Read 로 열고 그대로 따른다. 경로는 공통 절차가 적은 대로다 — 「이 스킬의 `references/…`」는 `.claude/skills/tpx-author/references/`, 단계마다 여는 파일은 `.claude/skills/tpx-cases/references/` 다
2. 지침 파일이 「`<이름>-<종류>.md` 를 이어서 연다」고 가리키면 아래 「여는 파일」 표에 있는 것만 연다
3. 프롬프트에 붙은 절(역방향 · 게임 화면 …)이 여는 파일은 공통 절차대로다 — 이 표가 막지 않는다
4. **공통 절차 4 의 `4-selector.md` 는 열지 않는다** — 웹 요소 찾기 규칙이다. 거기서 뗀 공통 규칙 `4-selector-common.md`(R9 · R10)만 연다. 게임 보조 AI 는 이미 그 파일을 빼고 있다(`fanout-game.md`)

## 여는 파일

경로는 `.claude/skills/` 아래다.

| 파일 | 언제 |
|---|---|
| `tpx-author/references/game.md` | 게임 화면 절을 읽을 때 · 역방향이면 `reverse.md` §2~§3.5 대신 §7 |
| `tpx-cases/references/game.md` | 게임 화면 절이 있을 때 표를 쓰기 전 |
| `tpx-cases/references/4-selector-common.md` | 공통 절차 4 에서 `4-selector.md` 대신 |
| `tpx-cases/references/5-stable-game.md` | `5-stable.md` 를 열 때 이어서 — 기다림 |
| `tpx-cases/references/test-design-game.md` | `test-design.md` 를 열 때 이어서 — 게임 관점 칸 |
| `tpx-author/references/fanout-game.md` | `fanout.md` 를 열 때 이어서 — 폰은 자식만 |

## 열지 않는 파일

웹 요소 찾기 파일과 다른 종류의 뗀 파일이다.

- `tpx-cases/references/4-selector.md`
- `tpx-cases/references/5-stable-web.md` · `tpx-cases/references/5-writing-web.md` · `tpx-cases/references/two-kinds-web.md` · `tpx-author/references/fanout-web.md` · `tpx-author/references/reverse-web.md`
- `tpx-cases/references/5-stable-app.md` · `tpx-cases/references/5-writing-app.md`

## 보조 AI 에게 넘길 읽기 목록

- **케이스 작성 보조** — `fanout-game.md` 「§4 뼈대에서 바꾸는 줄」대로 고친 「먼저 Read 로 연다」 줄에 `4-selector-common.md` · `5-stable-game.md` · `test-design-game.md` 를 더하고, 줄 끝에 「종류는 「게임」이다 — 이어 여는 뗀 파일은 이 줄에 적은 것만 연다」를 붙인다

## 이 종류만의 규칙

아직 없다 — 종류별 PRD · 테스트 작성 기준은 사용자와 정해 여기에 적는다(진행판 AUT-F4-06 · 게임은 GAME-F3).
