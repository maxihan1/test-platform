---
name: tpx-author-api
description: 작성 에이전트(scripts/authoring-agent.ts)의 자식 세션이 애플리케이션 종류 「API」일 때 부른다. 사람이 직접 부르지 않는다. 공통 절차 tpx-author 를 열어 따르게 하고, API 지침만 읽도록 열 파일을 정한다.
---

# /tpx-author-api

이 애플리케이션은 종류 「API」다. **이 스킬은 무엇을 읽을지만 정한다** — 할 일과 순서는 공통 절차가 정한다(정본 `docs/spec/도메인/작성.md` §3.6 「종류별 작성 AI」).

1. 공통 절차 `.claude/skills/tpx-author/SKILL.md` 를 Read 로 열고 그대로 따른다. 경로는 공통 절차가 적은 대로다 — 「이 스킬의 `references/…`」는 `.claude/skills/tpx-author/references/`, 단계마다 여는 파일은 `.claude/skills/tpx-cases/references/` 다
2. 지침 파일이 「`<이름>-<종류>.md` 를 이어서 연다」고 가리키면 아래 「여는 파일」 표에 있는 것만 연다
3. 프롬프트에 붙은 절(API 문서 …)이 여는 파일은 공통 절차대로다 — 이 표가 막지 않는다

## 여는 파일

경로는 `.claude/skills/` 아래다.

| 파일 | 언제 |
|---|---|
| `tpx-cases/references/4-selector-common.md` | `4-selector.md` 를 열 때 이어서 — R9 · R10(종류와 상관없다) |
| `tpx-cases/references/api.md` | API 문서 절이 있을 때 표를 쓰기 전. 표준 기획서 반영처럼 절 없이 온 요청은 안 연다(그 파일 머리) |

## 열지 않는 파일

다른 종류의 뗀 파일이다.

- `tpx-cases/references/5-stable-web.md` · `tpx-cases/references/5-writing-web.md` · `tpx-cases/references/two-kinds-web.md` · `tpx-author/references/fanout-web.md` · `tpx-author/references/reverse-web.md`
- `tpx-cases/references/5-stable-app.md` · `tpx-cases/references/5-writing-app.md`
- `tpx-cases/references/5-stable-game.md` · `tpx-cases/references/test-design-game.md` · `tpx-author/references/fanout-game.md` · `tpx-author/references/prd-game.md`

## 보조 AI 에게 넘길 읽기 목록

- **케이스 작성 보조** — `fanout.md` §4 뼈대의 「먼저 Read 로 연다」 줄 그대로에 `4-selector-common.md` 를 더하고, 줄 끝에 「종류는 「API」다 — 이어 여는 뗀 파일은 이 줄에 적은 것만 연다」를 붙인다. API 종류의 뗀 파일은 없다

## 이 종류만의 규칙

정본은 `docs/spec/도메인/작성.md` §3.6 「종류별 작성 AI」 「종류별 기준」이다(2026-11-18 사용자 · AUT-F4-06). 갈래는 기능 하나 · 케이스는 API × 규칙 하나 그대로다. 1 ~ 4 는 `tpx-cases` `references/api.md`, 5 는 `two-kinds.md` 「오류 추정 점검 목록」에 적혀 있다 — 여기는 목록만 둔다.

1. 기획서가 적은 응답 코드가 문서와 다르면 표준 기획서 항목을 `NEEDS_CHECK` 로 둔다(§2)
2. 만들기 API 의 정상 케이스가 그 자원의 흐름(만들기 → 조회 → 지우기 → 404)을 보고, 고치기 · 지우기 정상 케이스도 뒤따르는 조회로 확인한다(§4)
3. 「남의 것」은 번호를 받는 API 마다 다른 인증 이름으로 본다(§4 네거티브 묶음)
4. 만든 데이터는 `finally` 에서 지우고, 한도가 있는 자원은 일회용 계정으로 만든다(§4)
5. 오류 추정 점검 목록은 쓰지 않는다 — 네거티브 묶음이 맡는다
