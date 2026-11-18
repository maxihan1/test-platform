---
name: tpx-author-app
description: 작성 에이전트(scripts/authoring-agent.ts)의 자식 세션이 애플리케이션 종류 「Android 앱」일 때 부른다. 사람이 직접 부르지 않는다. 공통 절차 tpx-author 를 열어 따르게 하고, 앱 지침만 읽도록 열 파일을 정한다.
---

# /tpx-author-app

이 애플리케이션은 종류 「Android 앱」이다. **이 스킬은 무엇을 읽을지만 정한다** — 할 일과 순서는 공통 절차가 정한다(정본 `docs/spec/도메인/작성.md` §3.6 「종류별 작성 AI」).

1. 공통 절차 `.claude/skills/tpx-author/SKILL.md` 를 Read 로 열고 그대로 따른다. 경로는 공통 절차가 적은 대로다 — 「이 스킬의 `references/…`」는 `.claude/skills/tpx-author/references/`, 단계마다 여는 파일은 `.claude/skills/tpx-cases/references/` 다
2. 지침 파일이 「`<이름>-<종류>.md` 를 이어서 연다」고 가리키면 아래 「여는 파일」 표에 있는 것만 연다
3. 프롬프트에 붙은 절(역방향 · 앱 화면 …)이 여는 파일은 공통 절차대로다 — 이 표가 막지 않는다

## 여는 파일

경로는 `.claude/skills/` 아래다.

| 파일 | 언제 |
|---|---|
| `tpx-cases/references/4-selector-common.md` | `4-selector.md` 를 열 때 이어서 — R9 · R10(종류와 상관없다) |
| `tpx-author/references/app.md` | 앱 화면 절을 읽을 때 · 역방향이면 `reverse.md` §2~§3.5 대신 §6 |
| `tpx-cases/references/5-stable-app.md` | `5-stable.md` 를 열 때 이어서 — 공용 부품 · 누르기 · 읽기 |
| `tpx-cases/references/5-writing-app.md` | `5-writing.md` 를 열 때 이어서 — `keepAppData` · `launchIntent` |

## 열지 않는 파일

다른 종류의 뗀 파일이다.

- `tpx-cases/references/5-stable-web.md` · `tpx-cases/references/5-writing-web.md` · `tpx-cases/references/two-kinds-web.md` · `tpx-author/references/fanout-web.md` · `tpx-author/references/reverse-web.md`
- `tpx-cases/references/5-stable-game.md` · `tpx-cases/references/test-design-game.md` · `tpx-author/references/fanout-game.md` · `tpx-author/references/prd-game.md`

## 보조 AI 에게 넘길 읽기 목록

- **케이스 작성 보조** — `fanout.md` §4 뼈대의 「먼저 Read 로 연다」 줄 그대로에 `4-selector-common.md` · `5-stable-app.md` · `5-writing-app.md` 를 더하고, 줄 끝에 「종류는 「Android 앱」이다 — 이어 여는 뗀 파일은 이 줄에 적은 것만 연다」를 붙인다

## 이 종류만의 규칙

정본은 `docs/spec/도메인/작성.md` §3.6 「종류별 작성 AI」 「종류별 기준」이다(2026-11-18 사용자 · AUT-F4-06). PRD 쪼개기 · 갈래(UI · 기능) · 설계 기법 · 요소 찾기 순서 · 작성 때 폰 1번은 공통 그대로다.

1. **오류 추정은 앱 항목 여덟이다** — 빈 값 · 공백만 · 두 번 누르기 · 통신 끊기 · 뒤로 가기 · 내렸다 올리기 · 회전 · 권한 거부(`tpx-cases` `two-kinds.md` 「오류 추정 점검 목록」의 종류 칸). 남의 것 · 없는 주소 · 서버 실패는 주소창 · 모킹이 있어야 해서 앱에는 안 쓴다
2. **시작 상태는 API 나 시드로 만들고 화면에서는 보려는 것만 한다** — 케이스 몸통의 `request` 와 서비스 도우미로 만든다. 다른 계정이 해야 하는 것(새 글 · 답글 · 팔로우)은 그 계정으로 API 를 부르는 도우미가 한다(토큰 받는 길은 서비스 가이드 · 로그인 도우미). API 로도 시드로도 못 만들 때만 보류한다 — MTA 보류 대부분이 「새 글을 올려 줄 다른 기기 없음」처럼 화면으로만 만들려다 막혔다
3. **계정을 바꾸는 것 자체를 보는 케이스만 화면으로 다시 로그인한다** — 두 번째 계정이 할 일은 2 의 API 도우미로 한다(MTA 120초 한도에 걸린 28건이 화면으로 계정을 바꾸는 케이스였다)
4. **앱이 딥링크를 받으면 화면까지 가는 준비는 `딥링크열기` 로 한다** — 주소는 기획서 · 서비스 가이드에 적힌 것만 쓴다. 버튼으로 가는 길은 그 화면의 UI 버튼 반응 케이스가 본다(MTA 빠짐 70건이 여러 번 눌러야 닿는 화면이었다)
