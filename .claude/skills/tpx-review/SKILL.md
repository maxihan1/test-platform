---
name: tpx-review
description: /tpx 체인 6단계 — 구현 결과를 독립 렌즈로 검사하고 게이트 2 요약을 만든다. 전 등급 호출. 직접 부르지 않는다.
---

# /tpx-review

체인 [6]. PR 단위 1회 독립 검사 → 게이트 2 요약. **전 등급 진입.**

**CI 가 게이트 2 를 대신하지 않는다.** 2026-09-18 부터 `main` 브랜치 보호가 걸려
CI 가 빨강이면 병합이 막히지만, **CI 는 타입·단위 테스트·테스트 코드 규칙·SPEC 문서만 본다.**
명세와 어긋났는지, 범위를 벗어났는지는 안 본다 — 그건 이 단계와 사람의 몫이다.

「CI 가 초록이니 됐겠지」로 넘기지 않는다.

## 선행 읽기

**없음. 재로드 금지.** `/tpx` 와 `/tpx-impl` 이 이미 실었다. 그 사본을 렌즈 프롬프트에 붙인다.

## Step 1. 실측 등급을 다시 잰다

**눈대중으로 적지 않는다.** 선언은 `/tpx-start` 가 착수 시점에 쟀고, 여기서 실제 diff 로 다시 잰다.

```bash
git diff --name-only origin/main...HEAD | node .claude/scripts/detect-tier.mjs
```

- **선언과 실측을 나란히** 게이트 2 요약에 싣는다
- 실측이 높아도 **자동 승격하지 않는다.** 사람이 정한다
- `미분류:` 줄이 나오면 **그대로 옮겨 싣는다.** 조용히 통과시키지 않는다

## Step 2. 렌즈를 등급으로 고른다

| 등급 | 렌즈 |
|---|---|
| **0** | `/code-review` + `superpowers:verification-before-completion` |
| **1** | 위 + 화면을 건드렸으면 `gstack:/qa-only` |
| **2** | 위 + `spec-review` |
| **3** | 위 + `/security-review`(인증·권한 표면) 또는 `ponytail:ponytail-review` |

**종수를 조용히 줄이지 않는다.** 렌즈 호출이 실패하면 부재를 요약에 적고
진행 여부를 사용자가 정하게 한다.

**두 렌즈 이상이면 한 응답에 함께 발행한다.** 순차로 나누면 왕복만 2배가 된다.

`spec-review` 와 `/qa-only` 는 **고치지 않고 보고만** 한다. 고치는 것은 [5] 의 몫이다.

## Step 3. gstack 렌즈에는 세 마디를 넣는다

`/qa-only` 처럼 gstack 렌즈를 부를 때는 `/tpx-plan-review` 와 같은 규약을 쓴다.

> 비대화형으로 한 번만 검사하고 지적만 내라 — 고치지 말고, 질문하지 말고, 루프를 돌리지 마라.

**작업 디렉터리를 절대경로로 준다.** 안 주면 렌즈가 공유 체크아웃을 본다.

## Step 4. 검사 명령을 종료 코드로 판정한다

```bash
npm run check:deps      > /tmp/r.log 2>&1; echo "EXIT=$?"
npm run typecheck       > /tmp/r.log 2>&1; echo "EXIT=$?"
npm run check:workflow  > /tmp/r.log 2>&1; echo "EXIT=$?"
npm run check:spec      > /tmp/r.log 2>&1; echo "EXIT=$?"
npm run check:tests     > /tmp/r.log 2>&1; echo "EXIT=$?"
npm run test:changed -- origin/main > /tmp/r.log 2>&1; echo "EXIT=$?"
npm run test:always                 > /tmp/r.log 2>&1; echo "EXIT=$?"
```

**바뀐 것과 이어진 검사 + 늘 도는 목록을 1회** 돈다 (2026-09-25 — 서비스 전이라 전체 3회를 걷었다).
DB 를 건드렸으면 `DATABASE_URL` 을 붙인다. migration·`package.json`·설정을 바꿨으면 `vitest run` 전체다.
**`docs`·`spec` 차선이면 `check:spec` 하나만** 돈다 — 코드가 없다 (`/tpx` §차선).

**건수가 아니라 종료 코드다.** 「Tests N passed」와 「EXIT=1」은 동시에 참일 수 있다.

## Step 5. SPEC 을 고쳤으면 §2.7 ⑥ 을 여기서 본다

`docs/spec/**` 가 diff 에 있으면 추가로 본다.

- `npm run check:spec` — 없는 절 · 깨진 링크 · 틀린 분량 · 없는 킥오프
- `spec-review` **H 절** — 문서 정합
- **같은 규칙이 두 곳에서 다른 말을 하는 것은 기계가 못 본다.** 계획의
  `## SPEC 동반 수정` 할 일이 전부 닫혔는지 **사람이 대조**하고 그 결과를 요약에 싣는다

## Step 6. 결과를 모은다

PR 본문 `## 검사 결과` 에 append 한다 — 렌즈 이름 · 판정 · 항목별 한 줄.
**BLOCKER 는 합산한 뒤 한 번에** 판정한다. 두 렌즈가 충돌하면 **BLOCKER 가 우선**이고,
충돌 사실을 요약에 그대로 적는다.

## Step 7. 게이트 2 요약 → `/tpx` 반환

첫 줄이 판정이다. 지적은 심각도 순 **최대 5건**. 처음 나온 약어는 괄호로 푼다.
**`check:tests` 가 「이미 있던 케이스에 미확정 꼬리표를 새로 달았다」 경고를 냈으면 그 줄을 그대로 싣는다** —
종료 코드가 0 이라 초록으로 지나가고, 확정 실패를 숨기는 길이라 사람이 봐야 한다 (도메인/실행 §3.2, 2026-09-25).
마지막 줄은 사용자가 2분 안에 할 수 있는 행동 하나.

```
🛑 게이트 2 — 검토 부탁드립니다.

✅ 한 줄   <비전문가 한 문장 — 무엇이 됐나>
💡 의미   <그대로 병합해도 되는지 판단 재료>
🔧 기술 상세 (안 봐도 됨)
   PR #<번호> · <N>파일 +<추가>/-<삭제>
   선언 <N>등급 / 실측 <N>등급 · 미분류: <경로 또는 없음> · 건너뛴 단계: <목록>
   렌즈별 결과 각 1줄 · 검사 명령 종료 코드
```

**요약을 다 쓴 것이 질문을 낸 것이 아니다.** `/tpx` 가 `AskUserQuestion` 으로 받는다.
**병합은 이 스킬이 하지 않는다** — 컨트롤러가 `/tpx-merge` 를 부른다.

## PR 갱신

```bash
node .claude/scripts/pr-update.mjs --pr <번호> --tier <등급> --step 6 --next "게이트 2 — 지금"
node .claude/scripts/pr-update.mjs --pr <번호> --comment "### [6/7] 검사 완료
<렌즈별 결과 표 · 종료 코드 표>
**다음.** 🛑 게이트 2"
```

## 실패 / 엣지

- **렌즈 결과가 충돌** — BLOCKER 우선. 충돌을 요약에 그대로 적는다
- **지적이 3회 반복** — 작업 자체에 근본 문제. `/tpx-spec` 되돌림을 제안한다
- **「더 작게 쪼개야 한다」** — `AskUserQuestion` 으로 분할 선택지
- **검사가 빨강** — 승인 선택지를 내지 않는다. 먼저 초록으로 만든다
