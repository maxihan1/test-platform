# CLAUDE.md — 작업 규칙

> 프로젝트 루트에 둔다. Claude Code가 모든 세션에서 자동으로 읽는다.
> 이 파일은 "무엇을 만드는가"가 아니라 **"어떻게 일하는가"** 를 정의한다.
> 무엇을 만드는지는 `docs/SPEC.md`(색인)와 그것이 가리키는 `docs/spec/` 12장에 있다.

---

## 0. 작업은 `/tpx` 로 시작한다

무언가를 만들거나 고치라는 요청을 받으면 **`/tpx <하고 싶은 말>`** 로 연다.
그 스킬이 등급을 판정하고 읽을 문서를 골라 싣고 일곱 단계를 끝까지 돈다.

읽기만 하는 질문·코드 설명·이미 돌던 작업 이어가기에는 쓰지 않는다. 그냥 답한다.

**작성 에이전트(서버 `author` 컨테이너가 기본, 맥은 대체)의 자식 세션은 `/tpx` 가 아니라 `tpx-author` 를 탄다** (2026-09-23).
git·PR 은 에이전트 스크립트가 하고 자식은 케이스만 만든다. 정본은 `docs/spec/도메인/작성.md` §3.6 「작성 에이전트는 전용 체인이다」.

**여기에 절차를 적지 않는다. 정본은 `.claude/skills/tpx/SKILL.md` 다.**
두 곳에 적히면 한쪽이 반드시 뒤처진다 — 2026-09-18 까지 이 자리에 여섯 단계가 적혀 있었고,
체인이 같은 일을 다르게 적고 있었다.

### 등급 — 바꾼 파일이 절차를 정한다

**이 표는 요약이다.** 절차 정본은 `.claude/skills/tpx/SKILL.md` §등급별 절차,
표면→등급 글로브 정본은 `.claude/scripts/surfaces.mjs` 다.

| 등급 | 표면 | 계획 | 게이트 |
|------|------|------|--------|
| 0 | 문서 `DOC` | 없음 | 2만 |
| 1 | 화면 `WEB` · 테스트 `TESTS` · 스킬 `HARNESS` | 없음 | 2만 |
| 2 | 서버 `ADMIN` · 러너 `RUNNER` · 인증 `AUTH` · 검사 `GUARD` | 1장 | 1+2 |
| 3 | 마이그레이션 `MIGRATION` · 공유 타입 `KIT` · 명세 `SPEC` · 배포 `COMPOSE` | 1장 + §1.2 | 0+1+2 |

① 섞이면 **가장 높은 등급** ② 기본 1등급, 지정이 우선 ③ 미분류는 1등급으로 두되
`미분류: <경로>` 를 게이트 2 요약에 싣는다 ④ 테스트만 바뀌면 올리지 않는다.

```bash
node .claude/scripts/detect-tier.mjs <바꿀 경로들>
```

---

## 1. 절대 규칙 (어기면 계약이 어긋난다)

### 1.1 한 번에 한 갈래만 — 범위가 번지지 않게
`docs/WORKSTREAMS.md`의 소유 경로 표가 **어느 폴더가 무슨 일을 하는지 보는 지도**다.
하려던 일과 상관없는 폴더를 고치고 있으면 멈추고 그게 정말 이번 범위인지 본다.

**막는 장치는 없다.** 범위를 막던 `ownership` 훅은 쓰지 않기로 정하고 걷어냈다 (2026-09-18).

**그래서 이건 금지가 아니라 안내다.** 범위 밖 파일을 고쳐야 할 이유가 있으면 고치되,
**어디에 적는지는 시점에 따라 다르다** — 계획 단계에서 알았으면 계획의 `files` 에,
구현 중에 알았으면 게이트 2 요약에 싣는다. 둘 중 하나에 있으면 된다.
다른 갈래의 파일이 **잘못돼 보이는** 것과 **이번 일에 필요한** 것은 다르다 —
앞엣것은 여전히 보고만 한다.

### 1.2 계약을 말없이 바꾸지 않는다
다음은 전부 계약이다.
- `packages/kit/src/types.ts` 의 타입
- 러너 HTTP 엔드포인트와 요청/응답 형태
- DB 테이블·컬럼명
- Admin API 경로와 응답 형태

바꿔야 한다고 판단되면 **즉시 멈추고** 이렇게 보고한다.

```
[계약 변경 필요]
대상:    ExecuteResponse
현재:    steps: StepResult[]
제안:    steps: StepResult[] + retryCount: number
이유:    재시도 횟수를 증적 문서에 표시해야 함
영향:    WS-C(생성), WS-B(저장), WS-D(출력)
상태:    대기
```

승인 없이 진행하지 않는다.

**`상태:` 줄은 `docs/spec/**` 에 넣는 블록에 필수다.** `대기` · `반영 완료 (YYYY-MM-DD, 어디에)` ·
`철회됨` 셋 중 하나이고 `npm run check:spec` 이 모양까지 본다. 이 줄이 없어서
2026-09-20 에 **이미 끝난 할 일 넷이 「아직 안 했다」로 명세에 남아 있었다.**
반영이 끝나면 그 자리에서 `반영 완료` 로 바꾸거나, 근거가 사실이 아니게 됐으면 블록을 뺀다 (§2.7 ②).

**승인을 받아 SPEC을 고쳤으면 거기서 끝이 아니다.** §2.7이 같이 움직일 것을 적어 뒀다.

**문서가 "잠김"·"금지"라고 적어도 강제하는 장치를 먼저 확인한다.**
`.claude/scripts/guard.mjs`의 `LOCKED`, 검사기, 코드 중 어디에도 걸려 있지 않으면
그건 계약이 아니라 **관례**다. 산문만 보고 "못 바꾼다"고 판단하면 없는 위반을 보고하게 된다.
반대로 계약이라 적혀 있는데 장치가 없으면, 장치를 더하거나 산문을 고쳐 둘을 맞춘다.

### 1.3 공용 파일은 SPEC에 적힌 대로만 바꾼다
`packages/kit/`, `docker-compose.yml`, `db/migrations/`는 Phase 0에서 확정됐고,
개정 SPEC이 바꿀 내용을 이미 정해 뒀다(§5.1 · §6 · §9).

**`guard.mjs`의 잠금 목록(`LOCKED`)은 비어 있다** — 승인이 끝난 변경까지 막았기 때문이다.
**막는 장치가 없다.** SPEC에 없는 변경을 넣어도 그 자리에서는 아무도 막지 않는다.

- 고치기 전에 SPEC 해당 절에 그 변경이 적혀 있는지 **먼저 확인한다**
- 적혀 있지 않으면 §1.2 절차로 SPEC을 먼저 고친다
- 검사는 `spec-review` A1~A3이 사후에 한다 — `git diff origin/main...HEAD` 와 SPEC을 한 줄씩 대조한다

### 1.4 추측하지 않는다
SPEC에 없는 결정이 필요하면 **직접 정하지 말고 질문한다.**
"일단 이렇게 해두고 나중에 바꾸시면 됩니다"는 금지. 그 나중이 안 온다.

---

## 2. 작업 방식

### 2.1 TDD
1. 실패하는 테스트를 먼저 쓴다
2. 통과하는 최소 코드를 쓴다
3. 정리한다

테스트 없이 구현 코드를 먼저 쓰지 않는다.

### 2.2 한 번에 하나
하나의 기능 = 하나의 커밋. 여러 기능을 한꺼번에 만들지 않는다.
커밋 메시지: `[WS-A] 케이스 스캐너: tcId 중복 검출`

### 2.3 완료 전 검사
워크스트림 작업을 끝냈다고 보고하기 전에 `spec-review` 스킬을 돌린다.
치명 항목이 하나라도 걸리면 완료가 아니다. 고치고 다시 돌린다.
검사 범위는 **이번 diff** 다. `/tpx` [6] 이 독립 렌즈로 한 번 돌린 것으로 끝난다 —
병합 직전 전체 범위 재검사는 걷었다 (2026-09-25 사용자 승인 · 서비스 전이라 바뀐 만큼만 본다).

**차선 (2026-09-25 사용자 승인)** — 바뀐 파일이 검사를 정한다. 문서만(`docs`)·케이스만(`cases`)·바뀐 파일 0 인 push 는
검사 기록을 요구하지 않고, 명세가 바뀐 push(`spec`)는 spec-review 기록만 요구한다.
판정은 `.claude/scripts/lane.mjs`, 정본은 `docs/HOOKS.md` 「차선」. 케이스만 바뀐 경우의 세부(2026-09-23 게이트 1)는
같은 문서 「테스트만 바뀐 PR·push 는 가벼운 길」.

### 2.4 작업 후 보고 형식
```
완료: <무엇을>
만든 파일: <경로 목록>
확인 방법: <사용자가 직접 돌려볼 명령이나 클릭 경로>
다음: <이어질 작업 1줄>
SPEC 검사: 통과 / 치명 N건
```

### 2.5 학습 기록
작업 중 아래에 해당하는 일이 있었으면 `docs/LEARNINGS.md` 맨 위에 **추가**한다.

- 처음에 틀리게 만들었다가 고쳤다 (왜 틀렸는지까지 적는다)
- 이 환경에서만 걸리는 문제를 만났다
- SPEC이 애매해서 판단이 필요했다
- 되돌린 결정이 있다

없으면 적지 않는다. 잘 된 작업은 진행 기록에만 남긴다.

**같은 유형이 이미 한 번 적혀 있으면** 항목을 또 추가하지 않는다.
기록장에 쌓기만 하면 다음 세션이 읽을 것만 늘고 실수는 안 줄어든다.
**두 번째면 기계가 막도록 옮긴다.** 아래 범위 안이면 직접 고치고, 밖이면 제안만 한다.

| 어디 | 직접 고쳐도 되는가 |
|------|------------------|
| `spec-review` 체크리스트 · `npm run check:*` 검사기 · `.claude/scripts/` 훅 | **직접 고친다** |
| `.claude/skills/**` 체인 스킬 (`tpx-*` 등) | **절차 보강은 직접.** 단계·게이트를 빼거나 순서를 바꾸는 것은 승인 (2026-09-21 추가 — 위 줄이 이름으로 부르는 `spec-review` 체크리스트가 물리적으로 이미 스킬 파일이라 경계가 모호했다) |
| `docs/SETUP.md` · `docs/HOOKS.md` 같은 안내 문서 | **직접 고친다** |
| 이 문서(CLAUDE.md) | **규칙 추가는 직접.** 기존 규칙 수정·삭제는 승인 |
| `docs/SPEC.md`와 `docs/spec/**` · §1.3 잠긴 파일 | 승인 (§1.2 절차) |

검사기를 잘못 더하면 검사가 깐깐해질 뿐 제품이 깨지지 않고 바로 드러난다. 그래서 직접 고쳐도 된다.
SPEC은 계약이라 한 곳만 어긋나도 다른 갈래가 조용히 틀린다. 그래서 승인을 받는다.

**고친 뒤에는 그 LEARNINGS 항목을 한 줄로 줄이고 `→ <어디>로 승격 (날짜)`를 붙인다.**
기계가 막기 시작한 항목은 더 읽을 필요가 없다. 지우지는 않는다 — 재발했을 때 "전에 이랬다"가 남아야 한다.

### 2.6 진행 기록
작업이 끝날 때마다 `docs/progress/<WS-ID>.md`에 **추가**한다(덮어쓰지 않는다).
```
## 2026-09-16
- 완료: 케이스 스캐너 정규식 파싱
- 미완: 중복 tcId 검출
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: scanner.ts의 parseSpec()이 진입점
```

전역 CLAUDE.md §7의 `checklist.md` / `context-notes.md`는 이 프로젝트에서 만들지 않는다.
체크리스트 역할은 `docs/progress/<WS-ID>.md`, 결정 기록 역할은 `docs/LEARNINGS.md`가 한다.
루트에 다른 이름의 기록 파일을 만들면 다음 세션이 못 찾는다.

### 2.7 SPEC을 고치면 같이 움직이는 것

**한 절만 고치고 끝나는 일이 거의 없다.** 2026-09-17~18 개정에서
「같은 규칙이 두 곳에서 다른 말을 하는」 일이 **아홉 번** 나왔고 전부 사후에 찾았다.
아래 순서로 밟는다.

**① 같은 규칙이 적힌 다른 절을 먼저 찾는다**

절 번호가 아니라 **고친 문장의 핵심 낱말로 12장을 전부 훑는다.**
같은 규칙이 다른 말로 적혀 있어서 절만 보면 못 찾는다.

- 도메인 절(§3.x 불변식)과 화면 절(§8.x)이 같은 것을 말하는 일이 잦다. **한 장 안에서도 어긋난다**
- **기계가 보는 규칙(§4 K표)을 특히 확인한다.** 산문이 바뀌어도 K표는 안 따라온다
- 정본을 **한 곳으로 정하고** 나머지는 그 절을 가리키게 한다. 내용을 옮겨 적으면 그게 다음 어긋남이다

**② 뒤집은 결정은 지울지 남길지 기준이 있다**

| 어떤 경우 | 어떻게 |
|----------|-------|
| 판단 기준이 아직 쓸모 있다 | 문단을 **남기고 왜 뒤집었는지 덧붙인다.** 다음에 또 늘리고 싶을 때 같은 질문을 다시 해야 한다 |
| 근거가 사실이 아니게 됐다 | **뺀다.** 무너진 근거를 남기면 다음 세션이 그걸 읽고 또 막힌다 |

**③ 색인(`docs/SPEC.md`)은 표가 아니라 길잡이다**

- 장 목록 · 절 번호 · 표 주인 **세 표**
- **「기능을 더하거나 고칠 때」 라우터 표** — 새 개념을 만들었으면 *그걸 하려는 사람*이 여기서
  길을 찾아야 한다. **이 자리를 가장 잘 빠뜨린다**
- 절을 새로 만들면 번호를 **뒤에 더한다.** 기존 번호는 영구 주소다

**④ SPEC 밖으로 나간다**

| 어디 | 왜 |
|------|-----|
| `docs/WORKSTREAMS.md` 킥오프 | **세션이 SPEC보다 먼저 읽는다.** 여기가 틀리면 SPEC을 열기 전에 이미 틀린다 |
| `spec-review` 체크리스트 · `npm run check:*` | 검사가 옛 기준이면 **초록불이 거짓말을 한다** |
| `docs/SETUP.md` · `docs/HOOKS.md` · `docs/DESIGN.md` | 사람이 따라 하는 절차와 화면 기준 |
| `docs/WORKFLOW.md` | 지금이 어느 단계이고 무엇이 남았는가. 단위 상태가 바뀌면 여기도 바뀐다 |
| `docs/design-mockup.html` | 화면 규칙이 바뀌었으면 |
| **코드에 박힌 상수** | SPEC의 형식·숫자·열거값을 코드가 복사해 둔 자리. 정규식·상한 같은 것 |

마지막 줄이 가장 늦게 드러난다. 이번 범위 밖이면 고치는 대신 **그 갈래 킥오프에 항목으로 넘기는 편이 낫다**(§1.1).

**⑤ 숫자를 손으로 적지 않는다**

「검색 조건 다섯」·「바꿀 것 여섯」·「221군데」가 전부 조용히 틀려졌다.
**개수는 정본 표를 가리키고, 세는 일은 기계에 맡긴다.**

**⑥ 검사한다**

`npm run check:spec` → `spec-review` H 절(§2.3 — 명세만 바뀐 일은 이것이 유일한 렌즈다).
`check:spec`은 절 번호·링크·분량만 본다. **같은 규칙이 두 곳에서 다른 말을 하는 것은 사람이 본다.**

---

---

## 3. 코드 규칙

- **언어**: TypeScript. `any` 금지
- **명명**: 도메인 용어는 SPEC §2 표를 그대로 쓴다. `tcId`이지 `testId`가 아니다
- **주석**: 플랫폼 코드는 "무엇을"이 아니라 **"왜"** 만, 한국어로 적는다.
  **`tests/**` 의 테스트 코드에는 주석을 쓰지 않는다** — 설명은 `name`,
  `precondition`, `step` 제목, `verify` 문장 중 맞는 자리에 넣는다 (SPEC §4)
- **화면 한글 문구**: 화면(`apps/admin/src/web/**`)에 보이는 한글을 새로 쓰거나 고칠 때는
  [im-not-ai](https://github.com/epoko77-ai/im-not-ai)(`humanize-korean` 스킬)의 패턴으로 점검한다 (2026-09-29 사용자 지시).
  번역투(`~에 있어서`·`~에 의해`·`~를 통해`), AI 관용구(`시사하는 바가 크다`), 형식명사(`~는 점이다`),
  억지 직역·어색한 조사를 피한다. 스킬은 전역(`~/.claude/skills/humanize-korean`)에 설치돼 있고
  `/humanize-korean` 으로 부른다. 없는 기계라면 `git clone` 한 저장소에서 `./install.sh --claude-only --copy`.
  **이 저장소의 어조가 우선한다** — 오류·안내는 「~합니다」체에
  마침표를 붙이지 않고(`errorText.test.ts` 가 지킨다), 제품 용어(케이스·서비스·실행)와 API 가 주는 값(enum)은 바꾸지 않는다.
  **한글 문구가 곧 영어 표(`messages/*.ts`)의 키다** — 문구를 고치면 표의 키와 화면 테스트가 찾는 문구도 같이 바꾼다
- **에러**: 삼키지 않는다. 잡았으면 문맥을 붙여 다시 던지거나 구조화해 반환한다
- **파일 길이**: 300줄을 넘으면 분리한다
- **의존성**: 새 npm 패키지 추가 전에 **반드시 묻는다**
- **파일 머리 주석**: 전역 CLAUDE.md §6의 한국어 파일 머리 주석은 플랫폼 코드에만 쓴다.
  `tests/**`는 예외다 — 주석 자체가 금지이고 훅이 막는다
- **단위 테스트 위치**: 플랫폼 코드의 단위 테스트는 각 앱 안에 `*.test.ts`로 둔다.
  **화면(JSX)은 `*.test.tsx`도 된다** — `vitest.config.ts`의 `include`가 둘 다 잡는다 (2026-09-19).
  화면 검사 파일은 **첫 줄에 `// @vitest-environment jsdom`을 적는다.**
  빠뜨리면 `document is not defined`로 죽는다.
  **`scripts/`의 스크립트도 같은 자리에 `*.test.ts`로 둔다** — `include`에 `scripts/**`가 들어 있다 (2026-09-21).
  다만 스크립트는 **얇은 껍데기**이므로 검사는 **그 안의 순수 함수**에 붙인다.
  I/O 껍데기 자체에는 안 붙인다 (`scripts/run-scheduled.ts`가 본보기다).
  `tests/**`에 두지 않는다 — 그 폴더는 데모·대상 테스트 전용이고 훅이 `expect`를 막는다
- **DB 테스트 fixture**: 접두사는 **갈래마다 고유하게**, 정리 구문(`DELETE ... LIKE`)은 **자기 것에만** 맞게 쓴다.
  넓은 패턴은 다른 파일이 만든 fixture 까지 범위에 넣어 실행 도중에 지운다.
  WS-A `ZZA` · WS-B `XBS`·`XBR`·`XBQ`·`XBX` · WS-D `XDC`·`XDR`·`XDD`·`XDG` ·
  WS-F `xfu1`~`xfu4`·`XFS1`·`XFS1B`·`XFS2`~`XFS4`·`XFS5`(`auth/scope.test.ts`) ·
  WS-작성 `XWA`(`authoring/store.test.ts`)·`XWAR`(`authoring/routes.test.ts`)·
  `XWS`(`authoring/assetStore.test.ts`)·`XWU`(`authoring/assets.test.ts`) ·
  역방향 작성 `XWV`(`authoring/reverse.test.ts`)·`XWO`(`authoring/outputs.test.ts`)(2026-09-26 — 자기 `service_id` 로만 지운다) ·
  작성 토큰 `XWK`(`authoring/usage.test.ts`, 2026-09-27 — `authoring_request` 는 자기 `service_id` 로, 마지막에 그 `service` 행까지 지운다) ·
  작성 중단 `XWT`(`authoring/stop.test.ts` — 계정 `xwt1` 도 지운다)·`XWTC`(`authoring/stop-columns.test.ts`)(2026-09-27 — 둘 다 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  역방향 증적 `XDU`(`reporting/collect-unconfirmed.test.ts`, 2026-09-26 — `test_run.title LIKE 'XDU%'`·`tc_id LIKE 'XDU-%'`·`prefix = 'XDU'`) ·
  역방향 견주기 `XDV`(`reporting/insights-unconfirmed.test.ts`, 2026-09-26 — `test_run.title LIKE 'XDV%'`·`prefix = 'XDV'`) ·
  대시보드 작성 현황 `XDH`·`XDHOFF`(`reporting/dashboard-authoring.test.ts`, 2026-09-26 — `authoring_request` 는 그 서비스의 `service_id` 로 ·
  `test_case` 는 `tc_id LIKE 'XDH-%'`·`'XDHOFF-%'` · 마지막에 `service WHERE prefix IN ('XDH','XDHOFF')` 까지 지운다) ·
  계약 반영 `XRC`(`db/reverse-columns.test.ts`, 2026-09-25 — 자기 `service_id` 로만 지운다) ·
  E2E 시나리오 표 `XSC`(`db/scenario-columns.test.ts`, 2026-09-28 — 부품 → `test_run` → 버전 → 시나리오를 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  시나리오 실행 거르기 `XBK`(`execution/kind.test.ts`, 2026-09-29 — `XSC` 와 같은 순서로 자기 `service_id` 로만 지우고 그 `service` 행까지) ·
  실행 저장값 표 `XCI`(`db/case-input-columns.test.ts`)·저장값 `XSI`(`execution/savedInput.test.ts`)(2026-09-29 — 둘 다 자기 `service_id`·`tc_id` 목록으로 `run_item` → `test_run` → `case_input` → `service_env` → `test_case` → `service` 순으로 지운다) ·
  시나리오 저장 `XSS`·`XSS2`(`scenario/store.test.ts`)·부품 재료 `XSP`(`scenario/parts.test.ts`)·라우트 `XSR`(`scenario/routes.test.ts`)·문 `XSA`·`XSA2`·`XSA3`(계정 `xsa-reader`·`xsa-writer`, `auth/gate.test.ts`·`auth/scope.test.ts`)(2026-09-29 — 전부 자기 `service_id`·id·이름 목록으로만 지우고 `LIKE` 를 안 쓴다. **`XSA` 로 시작하는 새 이름을 고르지 않는다**) ·
  시나리오 실행 `XSE`(`scenario/runStore.test.ts`)·실행 라우트 `XSU`(`scenario/runRoutes.test.ts`)(2026-09-29 — 둘 다 자기 `service_id` 로 step → part → `test_run` → 버전 → 시나리오 → `service_env` → 자기 `tc_id` 목록의 `test_case` → `service` 순으로 지운다) ·
  작성 이어하기 `XRM`(`db/resume-columns.test.ts`)·`XWM`(`authoring/resume.test.ts`)(2026-09-28 — 둘 다 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  작성 실행 기록 `XWH`(`authoring/history.test.ts`, 2026-09-29 — 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  작성 커버리지 칸 `XWG`(`db/coverage-columns.test.ts`)·끝내기 셈 `XWJ`(`authoring/coverage-routes.test.ts`)·대시보드 커버리지 `XDJ`(`reporting/dashboard-coverage.test.ts`)(2026-09-30 — 셋 다 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  작성 이어 작성 칸 `XCF`(`db/continue-columns.test.ts`)·이어 작성 상세 `XWN`(`authoring/continue-detail.test.ts`)·거절 `XWP`(남의 서비스 `XWPB` 도 — `authoring/continue-reject.test.ts`)·자료 복사 `XWQ`(`authoring/continue-copy.test.ts`)(2026-09-30 — `XWN`·`XWP`·`XWQ` 셋은 판을 `authoring/continue-fixture.ts` 가 같이 차리고 자기 `service_id` 로 자료 → 요청 → `service_env` 순으로 지운다. `XCF` 는 요청 → `service` 순. 넷 다 그 `service` 행까지 지우고 `LIKE` 를 안 쓴다) ·
  케이스 엑셀 `XCX`(`catalog/export-routes.test.ts`, 2026-09-29 — 자기 `service_id` 로 지우고 그 `service` 행까지. 계정은 `'xcx-%'` · 케이스는 `tc_id LIKE 'XCX-%'`) ·
  작성 보류 입력 `XWL`(`authoring/held.test.ts`, 2026-09-29 — 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  작성 보류 통로 `XWLR`(`authoring/held-routes.test.ts`, 2026-09-29 — 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  케이스 테스트 실행 `XTR`(`execution/trialRoutes.test.ts`, 2026-09-30 — 자기 `service_id` 로만 지우고 그 `service` 행까지) ·
  시나리오 시험 실행 `XST`(`scenario/trial.test.ts`)·통로 `XSTR`·`XSTR2`(`scenario/trialRoutes.test.ts` — 계정 `xstr-a`·`xstr-b`·`xstr-c`)(2026-10-04 — 둘 다 자기 `service_id`·정확한 tc_id·계정 목록으로만 지우고 그 `service` 행까지. `LIKE` 를 안 쓴다. **`XST` 로 시작하는 새 이름을 고르지 않는다**) ·
  작성 보류 머지 `XWLM`(`authoring/held-merge.test.ts`, 2026-09-29 — `held-routes.test.ts` 에서 떼어 냈다. 자기 `service_id` 로 지우고 그 `service` 행까지) ·
  역방향 WS-B `XBU`(`execution/unconfirmed.test.ts`, 2026-09-26 — `test_run.title LIKE 'XBU%'`·`tc_id LIKE 'XBU-%'`·`prefix = 'XBU'`) ·
  에이전트 토큰 `xfu5`(계정)·`XFS6`(서비스)(`auth/agentToken.test.ts`, 2026-09-23 — `xfu4` 와 겹치지 않게 `'xfu5%'` 로만 지운다) ·
  테스트 계정 `xfu7`(계정)·`XFS7`(서비스)(`settings/testAccount.test.ts`, 2026-09-26 — `'xfu7%'`·`'XFS7%'` 로 지운다) ·
  권한 칸 `xfu8`(계정)·`XFS8`(서비스)(`db/permissions-columns.test.ts`, 2026-09-28 — `user_service`·`app_user` 는 `'xfu8%'`, `service` 는 `'XFS8%'` 로 지운다) ·
  설정 계정 `xfu9`(계정)·`XFS9`(서비스)(`settings/users.test.ts`, 2026-09-28 — `routes.test.ts` 에서 떼어 냈다. `'xfu9%'`·`'XFS9%'` 로 지운다) ·
  가입 수락·거절 `xpa`(계정)·`XPA`(서비스)(`settings/approve.test.ts`, 2026-09-28 — `'xpa%'`·`'XPA%'` 로 지운다) ·
  회원가입 `xsg`(계정)(`auth/signup.test.ts`, 2026-09-28 — `'xsg%'` 로 지운다) ·
  비밀번호 변경 `xpw`(계정)(`auth/password-change.test.ts`, 2026-09-28 — `'xpw%'` 로 지운다) ·
  Grafana 통로 `xgfp`(계정)(`grafana/proxy.test.ts`)·`xgfg`(계정)(`grafana/gate.test.ts`)(2026-09-28 — 각자 `'xgfp%'`·`'xgfg%'` 로만 지운다. `'xgf%'` 로 넓히지 않는다) ·
  케이스 고치기 `XEA`(`db/edit-columns.test.ts`)·`XEB`(`authoring/edit-routes.test.ts` — 케이스 `XEB-001`~`003` · `XEBO-001`)·`XEC`(`authoring/edit-finish.test.ts` — 케이스 `XEC-001`~`004`)(2026-10-01 — 셋 다 자기 `service_id` 와 정확한 tc_id 목록으로만 지우고 그 `service` 행까지. `LIKE` 를 안 쓴다. **`XEB` 로 시작하는 새 이름을 고르지 않는다**) ·
  반영 겹침 `XCN`(`db/conflict-columns.test.ts`)·`XWY`(`authoring/conflict-routes.test.ts`)(2026-10-01 — 둘 다 자기 `service_id` 로 요청을 지우고 그 `service` 행까지. `LIKE` 를 안 쓴다) ·
  실행 종류 `XRK`(`execution/run-kind-db.test.ts`, 2026-10-02 — 자기 `service_id` 로 `test_run` 을 지우고 그 `service` 행까지. `LIKE` 를 안 쓴다) ·
  케이스 종류 거르기 `XCK`(`catalog/kind-filter.test.ts`, 2026-10-02 — 정확한 tc_id 목록으로만 `test_case` 를 지운다. `LIKE` 를 안 쓴다) · 훑지 않을 경로 칸 `XEX`(`db/crawl-exclude-columns.test.ts`, 2026-10-04 — 자기 service_id 로 지우고 그 service 행까지. LIKE 를 안 쓴다) · 케이스 기법 칸 `XCT`(`db/case-techniques-columns.test.ts`)·목록 기법 거르기 `XTQ`(`catalog/technique-filter.test.ts`)(2026-10-05 — 둘 다 정확한 tc_id 목록으로만 지운다. `LIKE` 를 안 쓴다. **`XCT` · `XTQ` 로 시작하는 새 이름을 고르지 않는다**) · 시나리오 이어 주기 칸 `XRL`(`db/scenario-relink-columns.test.ts`, 2026-10-06 — 자기 service_id 로 부품 → test_run → 버전 → 시나리오 → service 순으로 지운다. `LIKE` 를 안 쓴다) · 시나리오 실행 저장값 채우기 `XSF`(`scenario/runFill.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 시나리오 결과 꽂은 값 · 뒷정리 `XSB`(`scenario/runBound.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 시나리오 미확정 통과 셈 `XSG`(`scenario/unconfirmedCount.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 시나리오 결과 머리 `XSH`(`scenario/runHead.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 시나리오 실행 줄 판정 `XSV`(`execution/scenarioRowVerdict.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다) · 시나리오 목록 쓰는 케이스 거르기 `XSN`(`scenario/uses.test.ts`, 2026-10-06 — 자기 service_id · 정확한 tc_id 로만 지우고 그 service 행까지. `LIKE` 를 안 쓴다).
  **`XWA`·`XWAR`·`XWS`·`XWU`·`XRC`·`XWV`·`XWO`·`XWK`·`XWT`·`XWTC` 는 `authoring_request` 를 `LIKE` 가 아니라 자기 `service_id` 로만 지운다** —
  `XWAR` 이 `XWA` 로 시작하므로 `LIKE 'XWA%'` 로 넓히면 남의 fixture 를 실행 도중에 지운다 (2026-09-22).
  **WS-D·WS-F는 `ZZ`로 시작하는 것을 쓰지 않는다.**
  **새 접두사를 쓰면 이 줄에 적는다.** 안 적으면 다음 갈래가 같은 것을 골라 남의 fixture를 실행 도중에 지운다 (2026-09-19)
  **`LIKE`로 넓힐 때는 그 아래 것을 전부 적는다** — `identify.test.ts`가 `'XFS1%'`로 지우므로
  `XFS1`로 시작하는 이름은 그 파일 것이다. 다른 갈래가 `XFS1x`를 고르면 실행 중에 지워진다 (2026-09-19)
  `gate.test.ts`가 `'XFS3%'`로 지우므로 `XFS3`으로 시작하는 이름도 그 파일 것이다 (2026-09-19)
  **`XDG`는 파일 둘이 나눠 쓴다** — `generate.test.ts`가 `XDG 증적 생성 실행`,
  `insights.test.ts`가 `XDG 견주기`다. **둘 다 `'XDG%'`로 넓히면 안 된다** (2026-09-21).
  나중에 온 쪽이 `'XDG%'`를 쓸 뻔했고, 그랬으면 앞엣것의 fixture를 실행 도중에 지웠다 —
  `XFS1`에서 이미 겪은 그 일이다. **접두사가 이미 표에 있어도 그 아래를 누가 쓰는지 다시 본다**
  **`XBR`도 표가 갈린다** — `routes.test.ts`가 `test_case`·`param_set`은 `tc_id LIKE 'XBR%'`로,
  진행 조회 검사는 `test_run.title LIKE 'XBR 진행%'`로 지운다. **`test_run`에 `'XBR%'`를 쓰면 안 된다**
  (2026-09-21). 같은 접두사라도 **어느 표를 지우는지가 다르면 다른 것**이다
  **★ 자기가 만든 것도 치운다** — 행만 지우고 **서비스·계정 같은 부모 행을 살려 두면**
  다른 검사가 「지금 살아 있는 것」을 훑을 때 **2회차부터 다른 세상에서 시작한다.**
  2026-09-22 에 그래서 전체 검사가 **1회차만 통과**했고, 깨진 것은 **내가 안 건드린 파일들**이었다.
  **증상이 남의 파일에서 나도 원인은 내 검사가 남긴 것일 수 있다**
  **이유는 병렬이 아니다.** `vitest.config.ts`가 `fileParallelism: false`로 병렬을 껐다 —
  넓은 `DELETE ... LIKE`가 **다른 파일의 fixture까지 범위에 넣는 것**이 문제다 (2026-09-19)
  확인은 1회다 (2026-09-25 — 서비스 전이라 연속 3회를 걷었다. 되살릴 때 spec-review G3 과 함께 바꾼다).
  **그래서 이 규율이 더 중요해졌다** — 2회차에만 드러나는 찌꺼기를 기계가 더는 못 잡는다

### 저장소에 담아 둔 남의 스킬 — `playwright-cli`

`.claude/skills/playwright-cli/` 는 **Microsoft 가 낸 것을 그대로 담아 둔 것**이다.
브라우저를 몰아 화면을 읽는 데 쓴다. **그 폴더를 손으로 고치지 않는다** — 다음 설치가 지운다.

**★ 그 스킬이 혼자 떴을 때 조심할 것 하나.** 같이 담긴 `references/test-generation.md` 가
**기대값을 화면에서 읽어 담으라**고 적는다(`eval "el => el.textContent"`). **이 저장소는 그것을 금지한다** —
화면이 버그를 갖고 있으면 **그 버그가 기대값으로 박히고 회귀 세트가 영원히 지킨다.**
기대값은 **사람이 판정한 것**에서만 온다. 화면에서 읽는 것은 **요소 주소뿐**이다.
**예외 — 미확정 케이스**만 화면에서 본 값을 기대값으로 쓴다. 둘뿐이다 — 역방향(`docs/spec/도메인/작성.md` §3.6 「★ 역방향」, 2026-09-25)과
정방향이 화면에서 본 기획서에 없는 입력 규칙(같은 절 「★ 테스트 두 갈래」, 2026-10-02 사용자).
`unconfirmed` 꼬리표가 필수이고, 꼬리표가 실행 집계·증적에서 따로 묶어 버그가 정식 초록으로 굳지 않게 한다.
**꼬리표 없이 화면 값을 기대값으로 쓰는 것은 여전히 금지다.** 기획자가 확인한 기획서가 다시 오면(정방향 · R9) 사람이 판정한 값으로 바뀐다.

케이스를 만드는 절차의 정본은 `.claude/skills/tpx-cases/references/4-selector.md`(§4) 다.
**그 스킬을 안 거치고 이 도구만 써서 케이스를 만들지 않는다.**

### ponytail 플러그인과의 우선순위

세션마다 ponytail(코드 최소주의 규칙)이 주입된다. 대체로 이 문서와 같은 방향이지만, 어긋나면 **이 문서가 이긴다.**

- SPEC에 적힌 것은 YAGNI 대상이 아니다. "정말 필요하냐"고 되묻지 말고 만든다. 빼고 싶으면 SPEC 변경을 제안한다
- 테스트는 §2.1의 TDD가 우선이다. "프레임워크 없이 assert 하나"로 대신하지 않는다
- `ponytail:` 주석은 플랫폼 코드에만 쓴다. `tests/**`에는 쓰지 않는다

---

## 4. 설명 방식 (중요)

사용자는 **코드 문법을 읽지 못한다.** 코드는 AI가 쓰고 사용자는 판단만 한다.
따라서:

- **답은 한국어로 한다** (2026-09-30 사용자 지시). 답변 · 보고 · 질문 · 게이트 요약은 물론이고
  「지금 무엇을 하는 중」 같은 짧은 진행 알림도 한국어다. 시스템 안내나 도구 결과가 영어로 와도 답은 한국어로 쓴다.
  코드 식별자 · 명령 · 경로 · 오류 원문은 원문 그대로 둔다. 그날 세션이 진행 알림을 영어로 보내 사용자가 지적했다
- **저장소에서만 쓰는 말은 흔한 말로 바꿔 쓴다** (2026-09-30 사용자 지시). 문서가 영어 개발 용어를 옮겨 만든 말은
  사람에게 하는 말에서 흔한 말로 쓴다 — 줄 → 대기열 · 집기 → 가져가기 · 작업방 → 작업 폴더 · 뿌리 → 원본 요청 ·
  원장 → 요구 목록 · 셈 → 집계 · 관문 → 검사 단계 · 당긴다 → 받아 온다 · 접었다 → 그만뒀다.
  화면이나 명세에서 찾아야 하는 말이면 처음 한 번만 문서 용어를 괄호로 단다. 「」 안의 화면 문구(「반영」 버튼 등)와
  제품 용어(케이스 · 서비스 · 실행)는 그대로 둔다. 명세 문서 안의 용어는 이 줄로 바꾸지 않는다.
  작성 흐름 아티팩트에 「줄에 세우기」 · 「집기」를 풀지 않고 써서 사용자가 뜻을 몰랐다
- 코드를 보여주고 "확인해보세요"라고 하지 않는다
- 대신 **직접 눌러볼 수 있는 확인 방법**을 준다
  - 나쁨: "`scanner.test.ts`를 보시면 됩니다"
  - 좋음: "`npm run scan` 실행 → 콘솔에 케이스 8건이 뜨면 정상입니다"
- 구조를 설명할 때는 비유나 그림으로 먼저 설명하고, 코드는 그다음에 붙인다
- 사용자가 선택해야 할 때는 **선택지를 2~3개로 좁혀** 장단점과 함께 제시한다

### 사람에게 하는 말도 im-not-ai 규칙으로 쓴다 (2026-09-30 사용자 지시)

답변 · 보고(§2.4) · 질문 · 게이트 요약 · 막힘 보고(§6), PR 본문과 코멘트, 커밋 메시지, 아티팩트처럼 **사람이 읽는 한글**은
[im-not-ai](https://github.com/epoko77-ai/im-not-ai)(`humanize-korean` 스킬)의 규칙대로 쓴다. 화면 문구는 §3 「화면 한글 문구」가 따로 맡는다.
저장소 문서(`docs/**`)는 이 절이 아니라 각 문서의 관례를 따른다.

- **쓸 때부터 지킨다.** 기준은 저장소 안의 발췌 `.claude/skills/tpx-cases/references/korean-ai-tells.md` 다.
  전역 스킬이 없는 기계(클라우드 세션)에서도 읽힌다. 답변마다 스킬 전체(진단 · 윤문 여러 번)를 돌리지 않는다 — 대화가 멈춘다
- **발췌는 표와 케이스 문장용이다.** 문단 단위 규칙(C-2 · E-1 · I-4 등)을 뺐으므로 여러 문단짜리 글은 그만큼 덜 걸러진다.
  그 몫은 아래 스킬 한 번이 맡는다
- **길게 남는 글은 스킬을 한 번 돌린다.** 아티팩트나 다른 사람이 읽을 보고서는 `/humanize-korean` 으로 다듬어 내보낸다.
  스킬이 없으면 §3 의 설치 줄대로 받는다. 설치할 수 없는 세션은 저장소를 받아 그 `skills/humanize-korean/SKILL.md` 절차(점수 → 경로 → 윤문 → 변경률 게이트)를
  건너뛰지 않고 따른다. 스킬이 만드는 `_workspace/` 는 저장소 밖 임시 자리(scratchpad)에 둔다 — `.gitignore` 에 없다
- **바꾸지 않는 것** — 코드 식별자 · 명령 · 경로 · 숫자 · 「」 안의 화면 문구 · 제품 용어(케이스 · 서비스 · 실행).
  §1.2 · §2.4 · §6 서식과 체인 스킬이 정한 서식(게이트 요약의 🛑 · ✅ · 💡 · 🔧 머리 등)도 그대로 둔다 — 이모지 규칙(C-5)보다 서식이 이긴다
- **자주 걸리는 것** — 번역투(`~에 있어서` · `~에 의해` · `~와 관련하여` · 한 문단에 몰린 `~에 대해`), 관용구(`시사하는 바가 크다` · `주목할 만하다` · `이를 통해`),
  형식명사(`~는 점이다` · `~라는 것이다`), 「A가 아니라 B」 되풀이, 연결어미 뒤 쉼표(`~하고,` · `~지만,`), 문장마다 굵은 글씨

---

## 5. 하지 말 것

- SPEC 범위 밖 기능 추가 (메시지 큐, S3, 러너 확장) — "나중에 필요할 테니 미리"도 금지
- 되돌리기 어려운 대규모 리팩터링 — 제안만 하고 승인을 받는다
- `git push --force`, **브랜치 강제 삭제(`git branch -D`)**, 마이그레이션 되돌리기
  — **예외 하나** (2026-09-29 사용자 승인): 작성 에이전트(`scripts/authoring-*`)가 **자기 `author-<번호>` 브랜치**에 하는 덮어쓰기.
  이어서 작성 · 다시 작성이 같은 PR 을 갱신한다. 원격 머리 커밋이 에이전트 것이 아니면(사람이 올린 커밋) 에이전트가 스스로 거절한다
  (도메인/작성 §7 「실행 기록」). 세션이 치는 명령에는 이 예외가 없다
- 테스트를 통과시키려고 테스트를 수정하는 것
- 사용자가 묻지 않은 것에 대한 장문의 설명
- **명령 줄 무늬로 프로세스 끄기(`pkill -f` · `kill $(pgrep -f …)`)** (2026-10-01) — 그 무늬가 든 도구 셸 자신도 걸려 같이 꺼진다.
  `pgrep -af` 로 번호를 보고 `kill <번호>` 로 끈다 (`docs/SETUP.md` §11)

**병합이 끝난 브랜치를 치우는 것은 금지가 아니다.** `git branch -d`(병합된 것만) 와
`gh pr merge --delete-branch` 는 허용된다 — 병합 안 된 커밋이 있으면 git 이 스스로 거부하므로
**소실이 구조적으로 불가능하다.** 막는 것은 그 안전장치를 끄는 `-D` 뿐이다.

이 정리는 **`tpx-merge` 가 자동으로 한다.** 사람이 손으로 지울 일이 없다.
강제 삭제가 정말 필요하면 이유를 설명하고 사람이 직접 친다.

> 정본은 산문이 아니라 `.claude/scripts/guard.mjs` 의 `isBanned()` 다.
---

## 6. 막혔을 때

같은 문제를 **3번 시도해서 안 되면 멈추고** 이렇게 보고한다.

```
[막힘]
하려던 것:  러너 컨테이너에서 Playwright 실행
시도한 것:  1) ... 2) ... 3) ...
에러:       <원문 그대로>
추측:       <가설 1줄>
필요한 것:  <사용자가 확인해줄 것 / 결정해줄 것>
```

혼자 계속 파지 않는다. 사용자 시간보다 잘못된 방향으로 쌓이는 코드가 더 비싸다.
