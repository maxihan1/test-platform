---
name: tpx-author-web
description: 작성 에이전트(scripts/authoring-agent.ts)의 자식 세션이 애플리케이션 종류 「웹」일 때 부른다. 사람이 직접 부르지 않는다. 공통 절차 tpx-author 를 열어 따르게 하고, 웹 지침만 읽도록 열 파일을 정한다.
---

# /tpx-author-web

이 애플리케이션은 종류 「웹」이다. **이 스킬은 무엇을 읽을지만 정한다** — 할 일과 순서는 공통 절차가 정한다(정본 `docs/spec/도메인/작성.md` §3.6 「종류별 작성 AI」).

1. 공통 절차 `.claude/skills/tpx-author/SKILL.md` 를 Read 로 열고 그대로 따른다. 경로는 공통 절차가 적은 대로다 — 「이 스킬의 `references/…`」는 `.claude/skills/tpx-author/references/`, 단계마다 여는 파일은 `.claude/skills/tpx-cases/references/` 다
2. 지침 파일이 「`<이름>-<종류>.md` 를 이어서 연다」고 가리키면 아래 「여는 파일」 표에 있는 것만 연다. 앱 화면 절이 붙어 기획서가 앱 케이스를 요구하면 「앱 화면 절이 붙으면 더 여는 파일」 표도 연다
3. 프롬프트에 붙은 절(역방향 · 앱 화면 · API 문서 …)이 여는 파일은 공통 절차대로다 — 이 표가 막지 않는다

## 여는 파일

경로는 `.claude/skills/` 아래다.

| 파일 | 언제 |
|---|---|
| `tpx-cases/references/4-selector-common.md` | `4-selector.md` 를 열 때 이어서 — R9 · R10(종류와 상관없다) |
| `tpx-cases/references/two-kinds-web.md` | `two-kinds.md` 를 열 때 이어서 — 화면 크기 판정 |
| `tpx-cases/references/5-writing-web.md` | `5-writing.md` 를 열 때 이어서 — 로그인은 이어 쓴다 |
| `tpx-cases/references/5-stable-web.md` | `5-stable.md` 를 열 때 이어서 — 뜨는 창 · 화면 밖 요소 |
| `tpx-author/references/fanout-web.md` | `fanout.md` 를 열 때 이어서 — 적응형 |
| `tpx-author/references/reverse-web.md` | 역방향 절이 있어 `reverse.md` 를 열 때 이어서 — 계정 값 · 훑기 · 바뀐 화면 케이스 |
| `tpx-author/references/scan-fanout.md` | 역방향에서 훑을 화면이 넷 이상일 때(`reverse-web.md` §3) |

## 앱 화면 절이 붙으면 더 여는 파일

웹에 남은 Android 앱 케이스 때문이다(도메인/러너 §5.2 「애플리케이션 종류」 결정 6). **기획서가 앱 케이스(`platforms: ['android']`)를 요구할 때만** 연다 — 요구하지 않으면 앱 화면 절은 무시한다.

| 파일 | 언제 |
|---|---|
| `tpx-author/references/app.md` | 앱 화면 절을 읽을 때 |
| `tpx-cases/references/5-stable-app.md` | `5-stable.md` 를 열 때 이어서 |
| `tpx-cases/references/5-writing-app.md` | `5-writing.md` 를 열 때 이어서 |

## 열지 않는 파일

다른 종류의 뗀 파일이다. 앱 뗀 파일은 위 「앱 화면 절이 붙으면 더 여는 파일」 표대로다.

- `tpx-cases/references/5-stable-game.md` · `tpx-cases/references/test-design-game.md` · `tpx-author/references/fanout-game.md`

## 보조 AI 에게 넘길 읽기 목록

- **케이스 작성 보조** — `fanout.md` §4 뼈대의 「먼저 Read 로 연다」 줄 그대로에 `4-selector-common.md` · `5-stable-web.md` · `5-writing-web.md` · `two-kinds-web.md` 를 더하고, 줄 끝에 「종류는 「웹」이다 — 이어 여는 뗀 파일은 이 줄에 적은 것만 연다」를 붙인다. 앱 케이스를 맡기면 `5-stable-app.md` · `5-writing-app.md` 도 더한다
- **화면 훑기 보조** — `scan-fanout.md` §3 뼈대 그대로다

## 이 종류만의 규칙

정본은 `docs/spec/도메인/작성.md` §3.6 「종류별 작성 AI」 「종류별 기준」이다(2026-11-18 사용자 · AUT-F4-06). PRD 쪼개기 · 갈래(UI · 기능) · 설계 기법 · 느린 망 3번 돌려 보기는 공통 그대로다.

1. **오류 추정은 웹 항목 아홉이다** — 빈 값 · 공백만 · 두 번 누르기 · 남의 것 · 없는 주소 · 서버 실패 · 새로고침 · 뒤로 가기 · 로그인 없이 주소 열기(`tpx-cases` `two-kinds.md` 「오류 추정 점검 목록」의 종류 칸). MTW 에서 16건 가운데 2건이 실제 버그를 잡았다(FN-947 · 977)
2. **서버 실패는 그 응답이 화면을 그리는지 먼저 본다** — 모킹을 걸어도 화면이 그대로면 줄을 만들지 않는다(MTW FN-964 · 987 · 991 이 그래서 보류됐다)
3. **시작 상태는 API 나 시드로 만들고 화면에서는 보려는 것만 한다** — 계정 25개를 화면으로 넣던 케이스가 30초 한도에 걸렸다가 API 준비로 살았다(MTW FN-981 · PR #796). 목록 · 개수를 보는 케이스는 같은 실행의 다른 케이스와 같이 쓰는 시드에 기대지 않고 자기 데이터를 만든다(MTW UI-154 · `tpx-cases` `5-data.md` 차례 2)
