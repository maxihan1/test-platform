# 검사가 생성된 테스트를 매번 실행하게 한다

등급: 2 · 갈래: 없음 (GUARD·DOC) · 2026-09-21

## 도메인 정리

**제품 도메인을 건드리지 않는다.** 하네스 작업이다.

`.github/workflows/ci.yml` 은 `GUARD` 표면(`.claude/scripts/surfaces.mjs`)이고,
계약 넷(`kit/types.ts` · 러너 HTTP · DB 표·칸 · Admin API) 어디에도 이름이 없다.

명세는 **CI 의 단계 목록을 규정하지 않는다.** `docs/spec/공통/2-명세선언.md:104` 가
정본을 `docs/HOOKS.md` 「CI 와 병합 차단」으로 넘겼다. 같은 장의 「아래 표 전부를 CI 가 본다」는
**케이스 파일의 모양 규칙(K1~K10)** 을 말하는 것이지 단계 목록이 아니다.

## 왜

### 잰 것 — 검사가 생성된 테스트를 한 번도 실행하지 않는다

`.github/workflows/ci.yml` 에 `playwright` 가 **0건**이다. `vitest.config.ts` 는 `tests/**` 를
일부러 제외한다(`docs/LEARNINGS.md` 「Vitest가 tests/\*\* 의 Playwright 스펙까지 집어간다」).

**지난 작업의 실측** — `tests/todo/TODO-003` 의 기대값을 뒤집었더니 **검사 단계가 전부 EXIT=0**,
실제 `npx playwright test` 는 **EXIT=1**(`검증 실패`)이었다.

### 그래서 무엇이 위험한가

**깨진 케이스가 `main` 에 들어간다.** 그리고 머지 시점보다 **그 뒤**가 더 위험하다 —
누가 대상 화면을 고쳐 케이스가 깨질 때 잡아 줄 자리가 이것뿐이다.

---

## 결정 넷 — 전부 실측으로 골랐다

### 결정 1 · 무엇을 돌리나 → `tests/todo` 를 못박고, **안 도는 것을 기계가 알리게 한다**

**`tests/demo` 는 돌릴 수 없다.** 실측 (`npx playwright test tests/demo --project=desktop`, EXIT=1, 38.1초)

| | |
|---|---|
| 실패 **2** | `DEMO-002` 「검증 실패: 목록에 보이는 할 일 개수가 기대와 같다」 · `DEMO-007` 「Test timeout of 30000ms exceeded」(`page.waitForTimeout(60_000)`) |
| 건너뜀 **1** | `DEMO-010` — kit 이 `platforms: ['mobile']` 선언을 존중해 알아서 뺐다 |
| 통과 **8** | |

**그 둘은 고칠 대상이 아니다.** 일부러 실패하고 일부러 시간을 넘기는 **플랫폼 기능 전시물**이고,
그게 `docs/spec/공통/7-데모와-완료.md` 의 완료 기준이 그 11건에 기대하는 몫이다.

**폴더를 정규식으로 빼는 길은 무너진다.** 실측 — `npx playwright test 'tests/(?!demo)'` 가
**26건 전부**를 잡았다. 이 작업방 이름이 `ci-runs-tests` 라 경로 안에 `tests/` 가 두 번 나온다.
**체크아웃 위치에 따라 결과가 달라지는 필터는 쓰지 않는다.**
(`playwright.config.ts` 의 `testIgnore` 로 푸는 길도 있지만 그 파일은 **3등급**이라 안 건드린다.)

**그래서 경로를 못박되, 못박은 것이 낡는 것을 기계가 잡게 한다.**

> `docs/LEARNINGS.md` 「**검사기를 만들 때 「무엇을 안 보는가」를 같이 적어 둔다.**
> 초록불은 안 본 것도 초록이다」 (2026-09-17, `check-spec-refs.mjs` 로 승격)

`tests/` 아래 폴더가 새로 생겼는데 CI 가 안 돌면 **조용히 안 돌고 아무도 모른다.**
새 검사가 그 순간 실패한다.

### 결정 2 · 디바이스는 **데스크톱만**

실측 — `npx playwright test tests/todo --project=mobile` → **15 skipped · EXIT=0**.
`tests/todo` 15건이 `platforms` 를 한 파일도 안 적어 전부 기본값 `['desktop']` 이기 때문이다.

**모바일을 돌리면 아무것도 안 돈 채 초록이 된다.** 그래서 안 돌린다.
webkit 을 내려받는 시간도 아낀다 (아래 결정 3).

**이것이 안 보는 것** — 앞으로 `tests/todo` 에 모바일 케이스가 생기면 CI 가 조용히 건너뛴다.
새 검사 파일의 머리에 이 사실을 적는다.

### 결정 3 · 브라우저는 **chromium 하나만**, `--with-deps` 로

실측 — `devices['Desktop Chrome'].defaultBrowserType` = **chromium**,
`devices['iPhone 14'].defaultBrowserType` = **webkit**.
데스크톱만 돌리므로 chromium 만 받으면 된다.

`ubuntu-latest` 에 브라우저가 안 깔려 있어 받아야 한다. `@playwright/test` 는
`package.json` 에 **이미 있다** — 새 부품이 아니다.

**캐시는 안 건다.** 받는 시간을 먼저 재고, 느리면 그때 건다 (안 하는 것 참조).

### 결정 4 · **1회만** 돌린다

기존 `단위 테스트` 단계는 연속 3회를 돈다(「1회 통과는 증거가 못 된다」). **Playwright 는 다르다.**

`playwright.config.ts` 가 그 판단을 이미 적어 뒀다.

> 자동 재시도를 쓰지 않는다. … **여러 번 돌리는 쪽은 실행 요청의 repeat 가 맡는다**

여러 번 돌리는 것은 **제품의 몫**이지 검사의 몫이 아니다. 그리고 대상이 외부 사이트라
3회는 남의 사이트에 기대는 횟수를 3배로 만든다 — **빨개질 확률만 3배가 된다.**

### 결정 5 · 자리는 **기존 `check` job 안**

보호 규칙이 요구하는 검사 이름은 **`check` 하나뿐**이다 —
`gh api .../branches/main/protection` → `{"contexts":["check"],"strict":false}`.
그게 `ci.yml` 의 job 키다. **새 job 으로 빼면 빨개져도 병합된다.**

`docs/HOOKS.md:123~126` 이 같은 경고를 이미 적어 뒀다.

기존 단계가 전부 `if: steps.skeleton.outputs.ready == '1'` 을 달고 있다. 새 단계도 단다.

---

## Plan

### 할 일 1. 안 도는 폴더를 기계가 알리게 하고, 그 검사를 통과시킨다

- **RED** — `.claude/scripts/ci-covers-tests.test.mjs` 를 새로 쓴다. `.github/workflows/ci.yml` 을
  읽어 Playwright 단계가 도는 경로를 뽑고, `tests/` 아래 폴더 중 **돌지도 면제되지도 않은 것**이
  있으면 실패한다고 단언한다. 지금 `ci.yml` 에는 Playwright 단계가 **아예 없어** `todo`·`demo`
  둘 다 안 돌므로 **실패한다.**
- **GREEN** — `ci.yml` 의 기존 `check` job 에 단계 둘을 더한다. ① chromium 내려받기
  ② `npx playwright test tests/todo --project=desktop`. 그리고 검사기의 면제 목록에
  `demo` 를 **이유와 함께** 적는다. 면제는 코드가 아니라 **그 검사 파일 안의 한 곳**에만 둔다.
- **REFACTOR** — 검사 파일 머리에 **이 검사가 안 보는 것**을 적는다 (데스크톱만 돈다 ·
  케이스 안의 디바이스 선언은 안 본다). LEARNINGS:670 이 그렇게 하라고 적었다.

**files**: `.claude/scripts/ci-covers-tests.test.mjs`, `.github/workflows/ci.yml`
**depends-on**: []
**검증**: `npm run check:workflow` 가 EXIT=0. 그리고 `ci.yml` 에서 `tests/todo` 를
`tests/없는것` 으로 바꾸면 EXIT≠0 이 되는 것을 확인하고 되돌린다

### 할 일 2. 검사가 하는 일의 정본을 갱신한다

- **RED** — `docs/HOOKS.md` 「CI 와 병합 차단」이 **검사가 무엇을 하는지의 정본**인데
  (명세가 여기로 넘겼다) 새 단계를 모른다. 지금 읽으면 「CI 는 타입·단위 검사만 본다」로 읽힌다.
- **GREEN** — 그 절에 새 단계를 적는다. 함께 적을 것 둘 —
  ① **대상이 외부 사이트라 그 사이트가 죽으면 병합이 막힌다**, 그때 사람이 무엇을 하면 되는지
  ② **검사가 안 보는 것** (데스크톱만 · `tests/demo` 는 면제)
- **REFACTOR** — 없음

**files**: `docs/HOOKS.md`
**depends-on**: [1]
**검증**: `npm run check:spec` 이 EXIT=0 (깨진 링크 0건). 그리고 그 절을 눈으로 읽어
새 단계와 면제가 적혀 있는지 본다

### 할 일 3. 어제 틀리게 적은 설계 문서를 고친다

- **RED** — `docs/plans/2026-09-21-테스트작성-화면-설계.md` 가 「`playwright.config.ts` 를
  한 줄이라도 건드리면 3등급이라 **먼저 등급을 재고 시작한다**」고 적었다. **재 보니 건드릴 필요가 없다.**
  그 문단을 믿고 시작하는 사람은 없는 게이트 0 을 준비한다. 그리고 「건 4」가 아직 남은 것으로 적혀 있다.
- **GREEN** — 그 문단을 실측 둘로 고친다. ① 케이스가 `page.goto` 에 **절대 주소**를 직접 들고 있다
  ② 값이 없으면 스키마 기본값이 들어간다(`packages/kit/src/runtime/inputs.ts` 머리 주석).
  그리고 건 4 절에 **닫혔다는 것과 어떻게 닫았는지**를 적는다.
- **REFACTOR** — 없음

**files**: `docs/plans/2026-09-21-테스트작성-화면-설계.md`
**depends-on**: [1]
**검증**: `grep -n "등급을 재고 시작" docs/plans/2026-09-21-테스트작성-화면-설계.md` 가 0건.
`npm run check:spec` EXIT=0

### 할 일 4. 구멍이 실제로 닫혔는지 잰다

- **RED** — 「단계를 더했다」는 증거가 아니다. `tests/todo/TODO-003` 의 기대값을 **일부러 틀리게**
  바꿔 푸시하면 **검사가 빨개져야** 한다. 지금까지는 초록이었다.
- **GREEN** — 되돌리면 초록이 된다. **실행 번호 둘**(빨강·초록)을 PR 코멘트에 싣는다.
  번호가 달라야 한다 — 같으면 묵은 딱지를 읽은 것이다(`tpx-merge` Step 2 의 실측).
- **REFACTOR** — **반드시 되돌린다.** 작업 트리가 깨끗해야 하고 `git status --porcelain` 이 비어야 한다

**files**: `tests/todo/TODO-003.spec.ts` (일시적. 되돌린다)
**depends-on**: [1]
**검증**: `git diff origin/main...HEAD -- tests/` 가 **비어 있다**. PR 코멘트에 실행 번호 둘

---

## SPEC 동반 수정 (§2.7)

**해당 없음 — `docs/spec/**` 를 한 줄도 안 건드린다.**

낱말로 12장을 훑어 확인했다 — `grep -rnE "\bCI\b|ci\.yml|workflows" docs/spec/ docs/SPEC.md` 가
**6곳**을 냈고 전부 읽었다. 단계를 더해도 **거짓이 되는 문장이 없다.**

| 자리 | 판정 |
|---|---|
| `공통/2-명세선언.md:104` | CI 가 **도는 시점**을 적고 정본을 `docs/HOOKS.md` 로 넘긴다 → HOOKS 를 고친다 (할 일 2) |
| `공통/2-명세선언.md:108` 「아래 표 전부를 CI 가 본다」 | **케이스 파일 모양 규칙(K1~K10)** 이야기다. 단계 목록이 아니다 |
| `공통/7-데모와-완료.md:63` | `check:tests가 CI에서 통과함` — **여전히 참이다** |
| `도메인/리포팅.md:195` | 「이 플랫폼이 CI 리포터가 아니다」 — 무관 |

**색인 네 곳** — 라우터 표에 이 일의 행이 없다. **새 개념을 만들지 않으므로 더하지 않는다** —
CI 를 고치는 일은 `docs/HOOKS.md` 가 안내한다. `npm run check:spec` 이 본다.

**숫자** — 이 계획은 개수를 손으로 적지 않는다. 실측한 숫자에는 **잰 명령을 같이 적었다**
(`docs/LEARNINGS.md` 「건수는 환경을 달고 다녀야 한다」).

---

## 안 건드리는 것

- **`playwright.config.ts`** — 한 줄이라도 건드리면 `COMPOSE` 라 **3등급**이 된다.
  건드릴 이유가 없다는 것을 실측했다. 건드려야 할 이유가 나오면 **멈추고 보고한다**
- **`docs/spec/**`** — 위 참조
- **`tests/demo` 11건** — 일부러 실패하는 전시물이다. 고치지 않는다
- **`docs/WORKSTREAMS.md` 넘긴 것 ⑮** 「CI 에 DB 가 없어 DB 를 타는 검사가 통째로 건너뛴다」 —
  같은 파일·같은 등급이지만 postgres 서비스와 마이그레이션이 붙는 **별개의 일**이다.
  이번에 안 한다
- **브라우저 캐시(`actions/cache`)** — 받는 시간을 먼저 재고 느리면 그때 건다.
  재 보지 않고 미리 거는 것은 추측이다
- **PR #45 어드민 화면 리뉴얼** — 다른 세션 것이다. 작업방·브랜치·PR 을 건드리지 않는다

---

## Plan 메타

할 일 4개 · 예상 묶음 2개 (할 일 1 → 할 일 2·3·4 병렬) · 구현 규율: TDD
추가 검증: `npm run check:workflow` · `npm run check:spec` · `npm run check:tests` · `npm test`

## 리뷰 결과

**렌즈**: `gstack:/plan-eng-review` (2등급 = 1종) · 2026-09-21
**판정**: **BLOCKER 3건 · 주의 3건**

**외부 목소리(다른 모델의 독립 의견)는 안 돌렸다.** 체인이 [4] 에서 렌즈를 한 번만 돌리고,
독립 검토는 [6] 이 따로 한다. 이 부재를 게이트 1 요약에 싣는다.

---

### BLOCKER 1 — 새 검사가 **아무 데서도 자동으로 안 돈다** (확신 10/10)

**무엇이.** 계획이 「이미 CI 가 도는 `check:workflow` 가 이 검사를 집어간다」고 적었다.
**거짓이다.** 실측 —

```
.github/workflows/ci.yml 이 도는 npm 명령
  typecheck · test · check:tests · check:spec · check:secret-names · check:evidence-formats
.claude/hooks/pre-push 가 도는 것
  check:tests · npm test
```

**`check:workflow` 는 둘 중 어디에도 없다.** 사람이 손으로 치거나 체인의 [6] 이 부를 때만 돈다.

**왜 문제.** 「안 도는 폴더를 기계가 알린다」가 이 계획의 핵심인데, **그 기계가 안 돈다.**
누가 `tests/<새서비스>/` 를 더하고 병합해도 아무도 안 막는다. **구멍을 막으려고 만든 장치가
같은 구멍에 빠진다** — `docs/LEARNINGS.md` 「초록불은 안 본 것도 초록이다」 그 자리다.

**고칠 것.** `ci.yml` 에 `npm run check:workflow` 단계도 같이 더한다. 같은 파일·같은 등급이고
실측 **90초**(`# pass 70 · fail 0`)다. 이걸 안 하면 할 일 1 의 값어치가 0 이다.

### BLOCKER 2 — 가장 비싼 실패를 검사가 안 본다 (확신 9/10)

**무엇이.** 검사가 보는 것은 **「어느 경로를 돌리나」**뿐이다. **「그 단계가 `check` job 안에 있나」**를 안 본다.

**왜 문제.** `docs/HOOKS.md:125~126` 이 이렇게 적었다.

> 보호가 요구하는 체크 이름은 **`check`** 이고, 그건 `ci.yml` 의 job 키다.
> **그 이름을 바꾸면 체크가 영영 안 떠서 모든 PR 이 잠긴다.**

Playwright 단계는 느리다. 나중에 누군가 **속도 때문에 별도 job 으로 빼는 것**은 아주 자연스러운
변경이고, 그 순간 계획의 결정 5 가 무너진다 — **빨개져도 병합된다.** 검사는 그대로 통과한다.
이 작업이 막으려던 바로 그 상태로 조용히 되돌아간다.

**고칠 것.** 검사가 **Playwright 단계가 `jobs.check` 아래에 있다**는 것까지 단언한다.

### BLOCKER 3 — 할 일 4 를 **이 순서로는 실행할 수 없다** (확신 10/10)

**무엇이.** 할 일 4 는 「일부러 깨뜨려 푸시하고 CI 가 빨개지는 것을 본다」다.
그런데 `ci.yml:24` 이 **`if: github.event.pull_request.draft == false`** 다.

**체인은 [7] tpx-merge Step 2 전까지 PR 을 초안으로 둔다.** 그러니 구현 단계에서 아무리 푸시해도
**CI 가 한 번도 안 돈다.** 할 일 4 는 [5] 에서 성립하지 않는다.

**왜 문제.** 이 계획에서 **유일하게 「구멍이 닫혔다」를 증명하는 할 일**이다. 못 돌리면 증명이 없다.
그리고 순서를 모르는 채 시작하면 구현 끝에서 막혀 되돌아온다.

**고칠 것.** 증명을 둘로 가른다.
- **빨강 쪽은 로컬에서** — `TODO-003` 을 깨고 `npx playwright test tests/todo --project=desktop` 이
  EXIT=1 인 것을 재고 되돌린다. **깨진 커밋을 브랜치에 안 남긴다**
- **배선 쪽은 [7] 에서** — `gh pr ready` 가 만든 **첫 진짜 CI 실행**에 Playwright 단계가 있고
  초록인 것을 실행 번호로 확인한다 (`tpx-merge` Step 2 가 이미 그 번호를 본다)

---

### 주의 1 — 검사 시간 예산을 안 쟀다 (확신 8/10)

계획이 「받는 시간을 먼저 재고 느리면 그때 캐시를 건다」로 미뤘다. 미루는 것 자체는 옳다
(재 보지 않고 캐시를 거는 것은 추측이다). 다만 **지금 `check` job 이 얼마나 늘어나는지**를
게이트 2 요약에 실을 값으로 잡아 둬야 한다 — 실측된 것은 `check:workflow` **90초**뿐이고
브라우저 내려받기와 Playwright 실행은 **아직 안 쟀다**. 첫 실제 CI 실행에서 재라.

### 주의 2 — YAML 을 정규식으로 읽는다 (확신 6/10)

YAML 파서가 설치돼 있지 않다(실측). 새 패키지 금지라 정규식으로 읽어야 하고, 이건
**집안 방식과 같다** — `.claude/scripts/*.test.mjs` 넷이 전부 `readFileSync` + 정규식이다.
위험은 낮다. 다만 **못 찾았을 때 조용히 통과하면 안 된다** — 「Playwright 단계를 못 찾았다」를
**실패로** 단언해라. 안 그러면 파싱이 어긋난 날 검사가 초록으로 거짓말한다.

### 주의 3 — 「데스크톱만」의 구멍을 산문으로만 막는다 (확신 7/10)

앞으로 `tests/todo` 에 모바일 케이스가 생기면 CI 가 조용히 건너뛴다(실측 — mobile 은
**15 skipped · EXIT=0**). 계획은 이걸 「검사 파일 머리에 적는다」로만 막는데 **기계가 산문을 안 본다.**

싼 방어가 있다 — 검사가 `tests/todo/**` 에 `platforms` 선언이 있는지 보고, 생기면 실패한다.
그때 사람이 「모바일도 CI 에서 돌릴까」를 정하면 된다. 다만 이건 BLOCKER 가 아니다 —
지금 그런 케이스가 0건이고, 세 BLOCKER 를 먼저 닫는 것이 낫다.

---

### 통과한 것

- **결정 다섯이 전부 실측을 근거로 한다.** 짐작으로 고른 것이 하나도 없다
- **등급이 안 튄다** — `playwright.config.ts` 를 안 건드리는 근거 둘을 실제로 확인했다
- **`@platform/kit` 이 CI 에서 풀린다** — `package.json` 의 `workspaces: ["packages/*","apps/*"]` 라
  `npm ci` 가 심링크를 만든다. `docs/LEARNINGS.md` 「`/tests` 안에서 `@playwright/test` 를 못 찾는다」는
  **도커 경로 문제**라 여기 해당하지 않는다
- **범위를 안 넓혔다** — 넘긴 것 ⑮ 를 명시적으로 뺐고 이유를 적었다
- **명세를 안 고치는 판정이 옳다** — 낱말로 6곳을 찾아 전부 읽었고 거짓이 되는 문장이 없다
- **버린 길을 왜 버렸는지 적었다** — 경로 정규식이 체크아웃 위치에 따라 무너지는 것을 실제로 재고 버렸다
