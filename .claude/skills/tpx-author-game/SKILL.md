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
| `tpx-cases/references/game-scenario.md` | `game.md` 와 같이 — 플레이 값 규칙의 미션 목록 · 게임 시나리오 |
| `tpx-cases/references/4-selector-common.md` | 공통 절차 4 에서 `4-selector.md` 대신 |
| `tpx-cases/references/5-stable-game.md` | `5-stable.md` 를 열 때 이어서 — 기다림 |
| `tpx-cases/references/test-design-game.md` | `test-design.md` 를 열 때 이어서 — 게임 관점 칸 |
| `tpx-author/references/fanout-game.md` | `fanout.md` 를 열 때 이어서 — 폰은 자식만 |
| `tpx-author/references/prd-game.md` | `prd.md` 를 열 때 이어서 — 게임 표 · 기획서 빈 곳 |

## 열지 않는 파일

웹 요소 찾기 파일과 다른 종류의 뗀 파일이다.

- `tpx-cases/references/4-selector.md`
- `tpx-cases/references/5-stable-web.md` · `tpx-cases/references/5-writing-web.md` · `tpx-cases/references/two-kinds-web.md` · `tpx-author/references/fanout-web.md` · `tpx-author/references/reverse-web.md`
- `tpx-cases/references/5-stable-app.md` · `tpx-cases/references/5-writing-app.md`

## 보조 AI 에게 넘길 읽기 목록

- **케이스 작성 보조** — `fanout-game.md` 「§4 뼈대에서 바꾸는 줄」대로 고친 「먼저 Read 로 연다」 줄에 `4-selector-common.md` · `5-stable-game.md` · `test-design-game.md` 를 더하고, 줄 끝에 「종류는 「게임」이다 — 이어 여는 뗀 파일은 이 줄에 적은 것만 연다」를 붙인다

## 이 종류만의 규칙

정본은 명세 `docs/spec/도메인/게임.md` §3.10 「케이스 꼴」(결정 18 ~ 25 — 2026-11-18 사용자)이다.

- **게임 테스트는 기능 · 게임 시나리오 두 갈래다** — 버튼 한 번에 결과가 바로 나오면 기능(`tpx-cases/references/game.md`), 플레이를 해야 값이 생기면 게임 시나리오(`game-scenario.md` — 가르는 기준은 §1 「로그 줄 종류」다). 웹의 UI 케이스 몫(보이는 것 · 버튼 반응 · 화면 잘림)과 경계값은 기능에 넣는다
- **미션 목록과 게임 시나리오 케이스는 같은 작성이 쓴다** — 미션 목록을 케이스 목록 파일 `## 게임 시나리오 미션` 절에 쓰고 이어서 미션마다 게임 시나리오 케이스 + 표 줄을 쓴다(`game-scenario.md` §2 · §3). 사람 승인은 없다(결정 33 — 2026-11-19). 에이전트는 끝에 그 절을 읽어 PR 머리 한 줄(미션 수 · 공식 빈칸 · 미션도 테스트도 없는 규칙)만 단다
- **공통 절차를 덮는 곳** — 공통 절차 「관문 0 이 빨강」과 `continue.md` §2 는 빠진 번호마다 케이스나 「제외」를 쓰라고 한다. 플레이 값 규칙은 예외다 — 기능 케이스로도 「제외」로도 덮지 않고 게임 시나리오 표 줄로 덮는다. 공식 빈칸이라 확인할 로그 줄을 못 쓴 규칙만 빠진 채 둔다(`game-scenario.md` §2)
- **표준 기획서로 옮길 때 기획서 빈 곳을 본다** — 공식 칸 · 데이터로 닿나 · PC 전용(모바일 게임만) · 잠깐 뜨는 표시(`tpx-author/references/prd-game.md` §2 · 2026-11-18 AUT-F4-07). 찾은 것은 결과 요약 `게임 기획서 확인 필요:` 줄에 적는다
- **정리는 `test.cleanup`** · **서버 초기화를 쓰지 않는다** · **준비 명령이 시작 조건을 바꾸는지 본다** — `game.md` §1 · §3
- **결과 요약에 줄을 더한다** — 공통 절차 「결과 요약」 꼴의 `케이스 목록 파일:` 줄 앞이다. 40줄 안에 넣는다. `게임 기획서 확인 필요:` 는 찾은 것이 있을 때만 단다 — 프로그램이 읽지 않는 사람용 줄이라 없으면 줄을 아낀다

```
게임 기획서 확인 필요: <공식 빈칸 <번호(빈 칸 이름)> · 데이터로 못 닿음 <번호(셈한 실제 범위)> · PC 전용 <번호> — 종류마다 10개까지 · 외 N건 — 찾은 것이 있을 때만>
게임 시나리오 미션: <미션 N개 · 쓴 게임 시나리오 케이스 N개(<tcId 들>) · 못 쓴 미션 <번호 · 까닭 / 없음>[ · 공식 빈칸 <규칙 번호 10개까지 · 외 N건>] / 없음 — <까닭(플레이 값 규칙 없음 · 로그 주소 없음 · 전투형 아님)>>
개발팀에 요청할 것: <없는 것 — 막히는 미션 · 규칙 번호, 한 줄에 하나 (`game-scenario.md` §6) / 없음>
```
