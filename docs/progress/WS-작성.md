# WS-작성 진행 기록 — 기획서에서 테스트 코드까지

> **이 갈래는 2026-09-22 에 생겼다.** 소유 경로는 `docs/WORKSTREAMS.md` 표가 정본이다.
> 명세는 [`docs/spec/도메인/작성.md`](../spec/도메인/작성.md), 표는 `공통/4-데이터모델` §6 의
> `authoring_request`, 등급은 `도메인/인증` §7 이다.

## 2026-09-22 (1회차) — 명세를 세웠다 (PR #52)

- 완료: **화면을 만들기 전에 막고 있던 잠금 셋을 풀었다.**
  - **① 영구 제외 행을 좁혔다** — 「화면에서 테스트 코드를 작성·편집하는 기능」이 이 기능을
    금지하는 것처럼 읽혔다. **행을 지우지 않고** 「화면이 코드 본문을 들고 있을 때」로 좁혔다.
    근거(「코드가 진실의 원천」)는 그대로 살렸고, **뺀 경우(인스턴스 고르기)와 좁힌 경우의 차이**도 적었다
  - **② 자리 절에서 숫자를 뺐다** — 「자리는 넷」이 절 제목과 여러 문서에 글자로 박혀 있었다.
    **「다섯」으로 바꾸지 않았다** — 여섯째가 생기는 날 같은 일을 또 한다.
    목록에 `테스트 작성` / `Authoring` 을 `테스트 케이스` 다음으로 넣었다
  - **③ 등급 갈리는 자리에 머지를 더했다** — 서버가 「머지는 운영 등급」을 표현할 수 없었다.
    `gate.ts` 가 「설정이면 admin, 읽기면 viewer, **나머지 전부 operator**」로 돌아
    머지 통로를 얹으면 **실행 등급이면 누구나 저장소를 영구히 바꿀 수 있었다.**
    ★ **표에 없는 경로의 기본값을 `admin`** 으로 못박았다 — `scope.ts` 의 「모르면 막는다」 선례를 따랐다
  - **`docs/spec/도메인/작성.md` 신설** (§3.6 불변식 · §7 API). 도메인 장이 여섯이 됐다
  - **`authoring_request` 표를 `공통/4-데이터모델` §6 에 적었다.** 대기줄은 별도 표가 아니라
    `status = 'PENDING'` 인 행들이다 — 줄을 담는 표를 따로 두면 같은 사실이 두 곳에 생긴다
  - **색인 네 곳** — 장 목록 · 절 번호 표 · 갈래 표 · **라우터 표**
  - **검사기 둘을 고쳤다** — 표면 표에 `apps/admin/src/authoring/**` 등록(등급 1 로 새던 것),
    색인 분량 검사의 「글자에 기대 조용히 꺼지던」 자리

- 미완: **구현 전부.** 마이그레이션 파일(`db/migrations/` 는 여전히 2개) ·
  `apps/admin/src/authoring/` 서버 코드 · `gate.ts`·`scope.ts` 의 경로→등급 표 · 화면.
  **명세에 있는데 코드에 없는 것은 버그가 아니라 순서다** — 그 사실을 네 문서에 적어 뒀다

- 막힌 것: 없음. 다만 `main` 이 작업 도중 **18커밋 움직여**(다국어 PR #53) `origin/main` 을
  **병합**해 풀었다. 리베이스는 강제 푸시가 필요해 금지다

### ★ 다음 세션이 알아야 할 것

**1. 「지금 있는 셸 진입점을 남기나 없애나」가 서버를 짜기 전에 답이 나와 있어야 한다.**

`npm run authoring-agent -- <기획서 경로>` 가 **이미 돌고 있는데 admin 서버를 안 불러
로그인을 지나지 않는다.** 대기줄 통로를 만든 뒤에도 그대로 두면
**「로그인을 안 지나는 작성 경로」가 그대로 산다** — §3.5 가 러너 포트를 닫으며 막은
뒷길과 같은 성질이다. `docs/SETUP.md` §8 과 명세의 「아직 알 수 없는 것」 **양쪽**에 적어 뒀다.

**2. `scripts/authoring-agent.ts` 머리 주석이 새 명세와 반대말을 한다** — 「병합은 하지 않는다」.
`CLAUDE.md §2.7 ②` 의 「판단 기준이 아직 쓸모 있다」 쪽이라 **지울 것이 아니라
왜 자리가 옮겨졌는지를 덧붙일** 대상이다.

**3. 맥이 쓰는 계정은 `operator` 다. `admin` 을 주지 마라.** 맥이 하는 일 넷(집기·단계 올리기·
사진 올리기·끝내기)이 전부 `operator` 이고 **머지 행은 사람이 만든다.**
`admin` 을 주면 **맥에 저장된 비밀값 하나가 `/api/settings/**` 전부를 연다.**

### 미룬 것

- **`finish` 를 부른 쪽이 집은 쪽인지 보는 장치** — 집는 일이 한 줄 UPDATE 라 누가 집었는지를
  적는 칸이 없다. `operator` 가 고른 `pr_url` 을 `admin` 이 대신 병합하는 구조가 된다
- **맥 계정의 비밀값을 어디에 두나** — `공통/2-명세선언` §4.1 비밀값 꼬리표가 출발점이다
- **코드에 남은 「자리 넷」** — `apps/admin/src/web/**` 의 주석·검사 제목·CSS 주석.
  **오늘은 자리가 실제로 넷이라 그 값이 참**이고 다섯째를 넣는 화면 PR 이 같이 치운다
- **`scripts/**` 소유가 WS-F 와 겹친다** — `scripts/authoring-agent.ts` 한 파일만 떼어 왔다.
  「폴더째 가져오지 않는다」를 표 주석에 못박았다

### 검사

`check:deps` · `typecheck` · `check:spec` · `check:tests` · `check:secret-names` ·
`check:workflow`(84 통과) · `npm test`(809 통과) **전부 EXIT 0**.

**※ DB 검사 242건은 건너뛴 값이다** — 이 기계에 `DATABASE_URL` 이 **비어 있는 것을 실측 확인**했다.
**CI 기준 숫자가 아니다.**

검사 기록은 [`docs/reviews/2026-09-22-작성명세.md`](../reviews/2026-09-22-작성명세.md) 에 있다 —
렌즈 둘이 **치명 1 · 중대 4 · 주의 5** 를 냈고 전부 고쳤다.
**`codex`(바깥 모델)가 이 기계에 없어 진짜 바깥 시선 검토는 못 했다.**


## 2026-09-22 (2회차) — 뼈대를 세웠다 (PR #56)

- 완료: **명세를 코드로 세웠다.** 화면과 맥이 만나는 자리가 생겼다.
  - **대기줄 표** — `db/migrations/20260922000001_authoring_request.sql` (마이그레이션 셋째).
    `CHECK` **셋**(kind 짝 · kind 값 · status 값) + 집기 인덱스 + **집은 쪽 칸**(`claimed_by`)
  - **통로 여덟** — `apps/admin/src/authoring/` (`store.ts` · `routes.ts`).
    화면이 부르는 넷 · 맥이 부르는 넷
  - **경로→등급 표** — `auth/gate.ts` 의 자동 규칙을 표로. 키는 **틀 + 메서드**, 없으면 `admin`.
    ★ **옛 자동 규칙을 함수로 남겨 38쌍을 대조**한다 — 손으로 옮겨 적다 한 줄 틀리면
    `gate.test.ts` 가 그 자리에서 빨개진다. 일부러 바뀐 것은 **머지 하나뿐**
  - **`app.ts` 등록 그물** — `app.test.ts` 신설. 등록을 빠뜨리면 **어떤 검사도 안 잡던** 자리였다
  - **CI 에 DB** — postgres + `db/init` + 마이그레이션. 그전까지 **DB 검사 19개 파일이
    CI 에서 한 번도 안 돌았다.** ★ **불을 켜자 리포팅 갈래 검사 둘이 그 자리에서 빨개졌다** —
    접속 주소에 개발 PC 포트가 박혀 있었고, 증적 PDF 가 쓰는 브라우저를 CI 가 검사보다
    나중에 설치하고 있었다. **사용자 승인을 받아 두 줄을 고쳤다** (`reporting/dashboard.test.ts` ·
    `ci.yml` 의 단계 순서). **남의 갈래 파일 한 줄을 건드린 것이라 여기에 적어 둔다**

- 미완: **화면**과 **에이전트를 대기줄에 붙이는 일**. ★ **그 둘이 한 PR 이다** —
  붙이지 않으면 **주문서만 쌓이고 아무도 안 집어 간다.**
  그 PR 이 셸 진입점(`npm run authoring-agent`)도 같이 치운다 (`docs/SETUP.md` §8).

- 막힌 것: 없음. 다만 셋에 걸렸다.
  - **검사가 1회는 통과하고 2회부터 깨졌다** — 원인은 내 검사가 만든 서비스 넷을 안 치운 것이었다.
    **연속 3회 규칙(G3)이 잡으라는 바로 그 경우**이고 1회만 돌렸으면 못 봤다
  - **CI 가 같은 단계에서 두 번 빨개졌다** — `sslmode` · `grafana_ro` 역할.
    둘 다 **`docker-compose.yml` 이 조용히 해 주던 일**을 CI 로 안 옮긴 것이다. 학습 기록에 적었다
  - ★ **화면 PR #55 가 먼저 병합돼 이 PR 이 `main` 과 충돌했고, 충돌 상태에서는 GitHub 이
    검사를 아예 안 띄운다.** 「검사가 곧 뜨겠지」로 55분을 기다렸다 —
    **`gh pr view --json mergeable` 을 먼저 봤으면 즉시 알았다.**
    `origin/main` 을 **병합**해 풀었다 (리베이스는 강제 푸시가 필요해 금지)

### ★ 다음 세션이 알아야 할 것

**1. `AUTHORING_AGENT_USER` 를 안 정하면 아무도 못 집는다.** 맥 계정 아이디를 `.env` 에 적어야
대기줄이 돈다 (`.env.example` · `docker-compose.yml` · `docs/SETUP.md` §8 에 적어 뒀다).
**그 계정은 `operator` 여야 한다** — `admin` 을 주면 맥에 저장된 비밀값 하나가
`/api/settings/**` 전부를 연다. **비워 두는 쪽이 안전한 기본값이다** (모르면 막는다).

**2. 서비스에 `tests_repo` 가 안 적혀 있으면 작성을 끝낼 수 없다.** `finish` 가 `pr_url` 을
그 주소와 대조하기 때문이다. **이것은 뒤집은 결정이다** — `공통/6-인프라` 가 그 칸을
「적어 두기만 한다」로 적어 뒀는데 **판정에도 쓰게 됐고**, 그 줄에 취소선으로 남겨 뒀다.
설정 화면(§8.8)에서 적으면 풀린다.

**3. 진입점** — 표는 `공통/4-데이터모델` §6, 통로는 `도메인/작성` §7,
등급은 `도메인/인증` §7 「등급으로 갈리는 자리」와 그 아래 「서버가 그것을 어떻게 표현하나」.

### 미룬 것

- **거절 메시지가 남의 서비스 이름을 흘린다** — 없는 번호는 404, 남의 서비스 번호는 403 + 접두사.
  **기존 실행·증적 통로에도 있는 방식**이라 이 PR 범위 밖으로 뒀다
- **줄에 세울 수 있는 건수에 상한이 없다** — 명세가 「필요한지 아직 안 정했다」로 열어 둔 항목이다
- **`params` 로 무엇을 바꿀 수 있나** — 화면이 답한다

### 검사

`check:deps` · `typecheck` · `check:spec` · `check:tests` · `check:secret-names` ·
`check:workflow` · `check:evidence-formats` 전부 **EXIT 0** ·
**`npm test` DB 붙여 연속 3회 `0·0·0`** — 파일 89개 · 검사 **1135개** · **건너뜀 0건**
(`origin/main` 병합 뒤 다시 잰 값이다. 병합 전에는 1110개였다).

**※ 앞 PR 들이 「242건 건너뜀」이던 자리가 실제로 돌았다.** 이 PR 이 로컬과 CI 양쪽에 DB 를 붙였다.

검사 기록은 [`docs/reviews/2026-09-22-작성대기줄.md`](../reviews/2026-09-22-작성대기줄.md) 에 있다 —
렌즈 둘이 **치명 3 · 중대 8 · 주의 9** 를 냈고 전부 고쳤다.
**`codex`(바깥 모델)가 이 기계에 없어 진짜 바깥 시선 검토는 못 했다.**

---

## 2026-09-22 (3회차) — 엔진이 로그인 뒤 화면을 보게 했다 (PR #59)

- 완료:
  - **화면 탐침을 Playwright CLI 로 갈았다** (`tpx-cases` §4). 옛 탐침은 브라우저를 띄워
    첫 화면을 찍고 **바로 닫아** 로그인 뒤 화면을 한 번도 못 봤다. 스킬이 「로그인 뒤는
    크롬으로 보고 **탐침으로 재확인**」이라 적어 뒀는데 **그 재확인은 성립한 적이 없다**
  - 벤더 스킬을 저장소에 담고(`.claude/skills/playwright-cli/`) **경계를 셋으로** 쳤다
  - 판별식 일곱 (`.claude/scripts/cases-probe-contract.test.mjs`) · `SETUP.md` §9 ·
    `CLAUDE.md` 벤더 경계 절
  - `docs/cases/TODO.md` 의 살아 있는 캐시 해시를 새 방식으로 갈아 끼웠다
- 미완: **화면 ＋ 에이전트 연결.** 초안 **PR #58** 이 이미 열려 있다
- 막힌 것: 없음. 다만 셋에 걸렸다.
  - **처음에 전역 설치로 갔다.** 저장소가 Playwright 를 한 버전으로 못박아 두는데
    전역에 최신판을 깔면 **탐침과 러너가 다른 Playwright 를 탄다.** 검토가 잡았고 걷어냈다
  - **판별식 단언 둘이 공허했다.** 낱말을 파일 어디서나 찾았는데 그 낱말이 바꾸기 전
    파일에도 있었다 — 학습 기록의 G8 항목에 3회차로 붙였다
  - **작업방에서 `git checkout` 으로 편집을 두 번 날렸다** — 학습 기록에 적었다

### ★ 다음 세션이 알아야 할 것

**1. 깔 것이 없다.** `npx playwright cli` 가 `npm ci` 만 돌린 기계에서 돈다.
**전역 설치(`npm install -g @playwright/cli`)를 하지 마라** — 저장소가 `@playwright/test` 를
한 버전으로 못박아 뒀고, 전역 최신판을 깔면 **탐침이 읽은 화면과 러너가 실행하는 화면이
다른 Playwright 를 탄다.** 판별식이 막는다.

**2. 벤더 폴더(`.claude/skills/playwright-cli/`)를 손으로 고치지 마라.** 다음 설치가 지운다.
우리 쪽 규칙은 `tpx-cases` §4 와 `CLAUDE.md` 에 적는다.

**3. 다음 작업은 PR #58 에서 이어간다.** 작업방 `.claude/worktrees/authoring-screen`
(브랜치 `worktree-authoring-screen`). **게이트 0 판정은 이미 끝났다 — 계약 변경 없음.**
그 PR 코멘트에 근거와 정해진 가정 넷이 다 적혀 있다.

### 미룬 것

- **벤더 스킬이 단독 호출될 때 기대값 규칙을 막는 것은 문서뿐이다.** `expect` 와 주석은
  훅이 막지만 **화면에서 읽어 박은 값과 사람이 정해 박은 값은 코드에서 구별이 안 간다** —
  원리적으로 기계가 못 보는 자리다
- **큰 화면에서 토큰·시간을 비교 측정하지 않았다.** 구조상 줄어드는 것은 분명하지만 숫자는 없다
- **바깥 모델 검토를 못 했다** (`codex` 가 이 기계에 없다)

### 검사

`check:deps` · `typecheck` · `check:spec` · `check:tests` 전부 **EXIT 0** ·
`check:workflow` **EXIT 0** (96 통과) ·
**`npm test` DB 붙여 EXIT 0** — 파일 89 · 검사 **1135** · **건너뜀 0**

검사 기록은 [`docs/reviews/2026-09-22-탐침.md`](../reviews/2026-09-22-탐침.md) 에 있다 —
독립 검토가 **주의 8건 · BLOCKER 0건**을 냈고 전부 고쳤다.

---

## 2026-09-23 (4회차) — 화면과 에이전트를 붙여 한 바퀴를 이었다 (PR #58)

- 완료:
  - **화면** — 사이드바에 `테스트 작성` 자리 · 줄 목록 · 새 요청 폼 · 상세와 머지 버튼
  - **에이전트** — 켤 때 비밀번호를 묻고 로그인해 줄을 집는 폴링 루프. 작성과 머지를 처리한다
  - **셸 진입점 제거** — `npm run authoring-agent -- <기획서 경로>` 는 **admin 을 안 불러
    로그인을 지나지 않았다.** 이제 들어오는 길은 화면뿐이다
  - 명세·목업·문서의 「자리 넷」을 살아 있는 문장에서 전부 걷었다
- 미완: 아래 「안 하기로 한 것」과 「남은 위험」 참조
- 막힌 것: 없음. 다만 **독립 검토가 BLOCKER 둘을 잡았다** — 아래.

### ★ 다음 세션이 알아야 할 것

**1. 켜는 법이 바뀌었다.** `npm run authoring-agent` 를 **인자 없이** 친다.
`.env` 에 `AUTHORING_AGENT_USER`(맥 계정, **operator**)가 있어야 하고, 서버가 다른 기계면
`PLATFORM_ADMIN_URL` 도 적는다. **비밀번호는 어디에도 안 적는다** — 켤 때 한 번 묻는다.

**2. 화면의 「멈춘 듯」은 서버가 주는 상태가 아니다.** 단계가 30분 안 바뀌면 화면이 판정한 것이다
(`apps/admin/src/web/authoringView.ts`). 명세가 `stage_at` 을 그 판정을 위해 만들었다.

**3. 진입점** — 화면은 `apps/admin/src/web/Authoring*.tsx`,
판정은 `authoringView.ts`, 맥은 `scripts/authoring-agent.ts`.

### ★ 검토가 잡은 BLOCKER 둘 — 같은 뿌리였다

**초안 PR 주소를 아무도 적지 않았다.** ① 맥이 만든 PR 주소를 서버에 안 알렸고
② 머지 줄은 태어날 때부터 그 칸이 비어 있었다(`줄세우기` 의 INSERT 에 없다).
**둘 다 고쳤고 서버는 안 건드렸다** — 집기 응답에 원본 번호가 실려 오므로 맥이 원본을 읽는다.

**검사 1175개가 전부 초록인 채로 그랬다.** 이유는 학습 기록에 적었다 —
머지 검사가 **주소가 실려 온다고 가정한 입력을 직접 만들어 넣었다.**

### ★ 남은 위험 — 가장 큰 것

**실제 한 바퀴를 처음부터 끝까지 돌려 본 적이 없다.** 조각마다 검사는 붙였지만
맥을 켜서 기획서를 넣고 PR 이 서고 머지까지 가는 것을 **통째로 돌린 적은 없다.**
맥 계정(`operator`)을 만들고 `.env` 를 적고 에이전트를 켜면 10~20분에 확인된다.

### 안 하기로 한 것 (명세의 「아직 안 정했다」 줄을 그대로 뒀다)

- **재실행(RERUN)** — 바꿀 값(`params`)을 안 정해 내용이 없다. 화면도 그 버튼을 안 그린다
- **줄에 세울 수 있는 건수 상한**
- **실패한 요청 치우기** — 그래서 **멈춘 행을 되살릴 길이 없다.** 집기는 대기 중만 집고
  끝내기는 집은 쪽만 부를 수 있다. 실제로 닫으려면 **맥이 켜질 때 자기 이름으로 잡힌
  `RUNNING` 행을 먼저 훑어 닫아야** 한다 — 통로는 이미 있다
- **사진** — 맥이 안 올리고 화면도 안 본다. 받는 통로만 앞 PR 에 서 있다

### 미룬 것

- **목록 응답이 안 쓰는 칸까지 전부 보낸다** (기획서 본문 통째 포함). 기획서가 긴 요청 50건이면
  한 번에 수 MB 가 오간다. 응답 모양을 좁히는 것은 **계약 변경**이라 따로 잡는다
- **머지가 작성 뒤로 밀린다** — 집기가 `ORDER BY id` 라 앞선 작성을 다 끝내야 머지 차례가 온다.
  작성 한 건이 10~20분이라 **1초짜리 머지가 한 시간을 기다릴 수 있다**

### 검사

`check:deps` · `typecheck` · `check:spec` · `check:tests` · `check:workflow` ·
`check:evidence-formats` 전부 **EXIT 0** ·
**`npm test` DB 붙여 연속 3회 `0·0·0`** — 파일 93 · 검사 **1189** · **건너뜀 0** · CI 초록.

**화면은 눈으로도 확인했다** — 도는 컨테이너가 옛 빌드라 제품 CSS 원본을 불러 DOM 을 재현해
격자를 실측했다 (`4 · 128 · 754 · 264` · 가로넘침 0). 고치기 전에는 첫 칸이 4px 로 뭉개졌다.

검사 기록은 [`docs/reviews/2026-09-23-작성화면.md`](../reviews/2026-09-23-작성화면.md) 에 있다.

## 2026-09-23 (5회차) — 입력을 자료 목록으로: 파일 첨부와 피그마 (PR #61)

- 완료:
  - **입력이 자료 목록이다** — 기획서 파일 여럿(pdf·docx·doc·md·txt) + 피그마 주소 여럿을 한 요청에.
    새 표 `authoring_asset` · 상태 `DRAFT`(다 올리기 전엔 줄에 안 선다) · 통로 셋(올리기·줄에 세우기·내려받기)
  - **피그마 토큰은 서비스 설정 칸** — Slack 웹훅과 같은 방식. 맥은 집기 응답으로 받는다(피그마 자료가 있을 때만)
  - **맥** — 자료를 받아 워드는 `textutil` 로 글자만, 토큰은 자식 환경에만. 보고가 실패하면 다섯 번까지 다시 보낸다
  - **tpx-cases** — 자료 여럿을 요구사항 표 하나로(출처 칸), 피그마 못 읽으면 멈춘다
  - 게이트 2 에서 고친 것 — 폼이 보내기 전에 서버 규칙을 본다 · 집은 뒤 조회가 실패하면 줄로 되돌린다
- 미완: **올리기 → 머지 버튼까지 한 바퀴를 끝까지 돈 적이 없다** (아래)
- 막힌 것: 없음

### ★ 다음 세션이 알아야 할 것

**1. 한 바퀴 실측(#1623 → PR #62, 닫음)** — 올리기부터 **검증까지 끝난 테스트 코드 3건까지 약 10분.**
그 뒤 자식 `claude -p` 가 [6] 에서 background 검사를 띄우고 「기다린다」며 **먼저 끝났다.**
보고는 네트워크 오류로 끊겼다(이건 고쳤다). **머지 버튼까지는 못 갔다.**

**2. 다음 PR 이 정해져 있다** — 작성 전용 체인 · 테스트만 바뀐 PR 은 CI 가벼운 길 · 머지 클릭 →
초안 해제 → CI 초록이면 자동 병합. **셋을 한 PR 로** (사용자 결정). 넘길 목록은 PR #61 의
「한 바퀴 결과와 다음 PR 로 넘길 것」 코멘트. 그 PR 이 붙으면 한 바퀴를 다시 돌린다.

**3. 지금 흐름의 구멍 둘** — 초안 PR 이라 머지 클릭이 실패할 공산이 크다 · CI 가 `tests/demo` 를 실행에서 뺀다.

**4. 진입점** — 서버 `apps/admin/src/authoring/{routes,assets,assetStore,store}.ts` ·
화면 `AuthoringNew.tsx`·`AuthoringDetail.tsx`·`SettingsService.tsx` · 맥 `scripts/authoring-{agent,assets}.ts`.
피그마 도구의 npm 이름은 **`figma-reader`** 다(`figma-reader-cli` 는 저장소 이름).

**5. 시험 흔적** — 개발 DB 에 operator 계정 `mac`(DEMO 배정)을 만들었고 DEMO 의 테스트 저장소를
`https://github.com/maxihan1/test-platform` 으로 바꿨다. docker admin 은 이 브랜치로 빌드돼 있다(`AUTHORING_AGENT_USER=mac`).
로컬에 자식이 만든 작업방 `.claude/worktrees/cases-clear-done` 이 남아 있다.

### 검사

`check:deps` · `typecheck` · `check:workflow` · `check:spec` · `check:tests` 전부 **EXIT 0** ·
**`npm test` DB 붙여 연속 3회 `0·0·0`** — 검사 **1319**.
렌즈: code-review 재검사 BLOCKER 0 · spec-review 치명 0 · security-review 0건. 화면은 사용자가 직접 봤다
(설정 화면 아래가 잘리던 전부터 있던 CSS 버그를 잡아 고쳤다).
검사 기록은 [`docs/reviews/2026-09-23-작성-자료목록.md`](../reviews/2026-09-23-작성-자료목록.md).

## 2026-09-23 (6회차) — 맥 작성 경로를 전용 체인으로 (PR #63)

- 완료:
  - **전용 체인 `tpx-author`** — 맥 스크립트가 준비(진짜 main SHA · 작업방 · 기존 케이스로 폴더 찾기)와 마무리(판정 · commit · push · 초안 PR · 보고)를 하고, 자식 Claude 는 자료 → 요구사항 표 → 케이스 → 관문 넷만
  - **머지** — 맥이 초안을 풀고 PR head 커밋의 CI 가 초록일 때 `--match-head-commit` 으로 병합. 빨강이면 사유에 CI 주소, 다시 누르면 다시 돈다
  - **테스트만 바뀐 PR·push 는 가벼운 길** (`.claude/scripts/cases-only.mjs`) — CI 는 새 케이스를 실행하지 않고 병합 근거는 PR 본문의 관문 3 기록
  - **자식에게서 GitHub 자격증명을 뺐다** · 판정 스크립트는 켤 때 메모리에 고정 · 켤 때 멈춘 RUNNING 을 닫는다
  - 맥 에이전트를 넷으로 갈랐다 — `authoring-agent`(켜기·폴링) · `-run`(작성) · `-merge`(머지) · `-io`(공용 손) · `-chain`·`-assets`(순수 함수)
- 미완: **병합 뒤 한 바퀴**(할 일 11) — 올리기부터 Merged 까지 시간을 잰다. 목표 약 13분
- 막힌 것: 없음

### ★ 다음 세션이 알아야 할 것

**1. 병합 뒤 할 일** — main 을 pull 하고 맥 에이전트를 다시 켠다(새 훅·새 스킬). 그다음 화면에서 DEMO 로 파일 하나를 넣어 한 바퀴를 돌린다.
`core.hooksPath` 가 이 기계처럼 절대경로면 main 체크아웃의 훅이 돈다 — pull 전에는 옛 훅이 돈다.

**2. 남은 신뢰 경계** — 자식은 GitHub 자격증명이 없지만 **맥의 키체인 · 공유 훅 폴더 · `.git/config`** 에는 손댈 수 있다.
전용 macOS 계정에서 에이전트를 돌려야 풀린다(후속). 그전까지는 믿을 수 있는 기획서만.

**3. 판정 스크립트 fail-open 을 두 번 잡았다** — 경로가 `/var`→`/private/var` 로 어긋나면 본체가 안 돌고 「통과」였다.
가짜 스크립트 검사로는 안 보였다. 진짜 스크립트를 심링크·대소문자 경로로 부르는 검사가 지킨다.

**4. 진입점** — 맥 `scripts/authoring-*.ts` · 스킬 `.claude/skills/tpx-author/SKILL.md` · 판정 `.claude/scripts/cases-only.mjs` ·
정본 `docs/spec/도메인/작성.md` §3.6 「맥 경로는 전용 체인이다」 · 가벼운 길 정본 `docs/HOOKS.md`.

**5. 넘길 것** — `authoring-agent.ts` 478줄(300줄 초과) · rerun 직후 옛 failure 를 읽는 경쟁 · 한 폴더의 spec 을 전부 지우는 PR 의 한계 ·
`판정기만들기` 를 ESM import 한 번으로 줄이는 단순화.

### 검사

`check:deps` · `typecheck` · `check:workflow` · `check:spec` · `check:tests` 전부 **EXIT 0** ·
**`npm test` DB 붙여 연속 3회 `0·0·0`** — 검사 **1393**. 렌즈: 보안·코드 재검사 BLOCKER 0 · spec-review 치명 0.
검사 기록은 [`docs/reviews/2026-09-23-작성-전용체인.md`](../reviews/2026-09-23-작성-전용체인.md).

## 2026-09-23 (7회차) — 서버 부르기가 응답 없는 연결 오류에 한 번 더 건다 (PR #64)

- 완료: 병합 뒤 한 바퀴(#3336)에서 자식이 **3분 반 만에** 케이스 3개를 만들었는데, 이어진 「올리는 중」 단계 보고가 `fetch failed` 로 서버에 못 닿아 요청이 FAILED 가 됐다. `한번더건다` 가 연결 오류(`TypeError: fetch failed`)면 한 번 더 부른다 — `부른다`(새 30초 제한)와 자료 받기(120초 제한) 둘 다 이것을 지난다. 거절·HTTP 오류·시간 초과·다른 TypeError 는 그대로
- 미완: **한 바퀴 다시** — 맥 에이전트를 main 으로 다시 켜고 DEMO 로 같은 파일을 넣어 Merged 까지 잰다
- 막힌 것: 끊긴 원인은 재현 못 했다. 진짜 서버에 막힌 루프 80·220초(GET·PATCH)로 둘째 요청이 멀쩡했다. 검사는 흉내(가짜 fetch)로 한다 — 사용자 결정
- 다음 세션이 알아야 할 것: 집기(claim)도 한 번 더 걸리므로 나간 뒤 답만 끊기면 두 건을 집을 수 있다(`ponytail:` 주석). 첫 건은 다음 켤 때 멈춘 RUNNING 정리가 닫는다. 남은 작업방 `.claude/worktrees/author-3336` 은 #3336 의 것이다

## 2026-09-23 (8회차) — 비밀번호 대신 에이전트 토큰 · 머지 뒤 pull · 파일 나누기 (PR #67)

- 완료: 맥이 켤 때마다 묻던 비밀번호를 **계정에 묶인 에이전트 토큰**으로 바꿨다. 설정 > 계정(작성 에이전트 계정만)에서 발급·다시 발급·취소, 맥은 처음 한 번 붙여넣어 `~/.test-platform/agent-token`(0600)에 둔다. 토큰으로는 맥이 부르는 통로만 열린다(`auth/gate.ts` 의 `토큰통로`). 머지 뒤 맥이 main 체크아웃을 `--ff-only` 로 당긴다(main 이고 깨끗할 때만). `authoring-agent.ts` 478줄 → `authoring-rules.ts` 로 순수 판정을 옮겨 155+251줄. SETUP §8 에 토큰·전용 OS 계정 절차
- 미완: 토큰으로 한 바퀴 실측 — 서버를 새 판으로 띄우고, 토큰 발급 → 에이전트 켜기 → 작성 → 머지 → 목록에 자동으로 뜨는지. 윈도우 실측 없음. 서버·맥이 다른 기계일 때 서버 쪽 `tests/` 동기화(후속)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 맥이 새 통로를 부르게 되면 `토큰통로` 에 한 줄을 더해야 한다 — 안 더하면 403 `AGENT_TOKEN_SCOPE`. 맥의 `AUTHORING_AGENT_USER` 는 이제 안 쓴다(서버 `.env` 만). 계획 `docs/plans/2026-09-23-작성-에이전트토큰.md`
- 후속 (게이트 2 검사가 넘김): ① 자식 세션이 같은 OS 계정이라 토큰 파일을 읽을 수 있다 — 남의 요청 집기·그 서비스의 피그마 토큰 받기·같은 저장소 아무 PR 주소로 끝내기가 된다. `finish` 의 prUrl 을 그 요청이 올린 브랜치(`올릴브랜치(id)`)의 PR 로 좁힌다 ② 자식의 쓰기 범위에서 뿌리 `.git` 을 뺀다(기존 과제 — 이번에는 당길 때 훅·fsmonitor 만 껐다)

## 2026-09-23 (9회차) — 작성 에이전트를 서버 컨테이너로 (PR #68)

- 완료: compose 새 서비스 `author`(profile `authoring`, `apps/authoring/Dockerfile`·`start.sh`) — Playwright 이미지 + claude 2.1.280 고정 + gh + pandoc. 저장소 뿌리 `/repo` 바인드 · `.env` 가림 · admin 하고만 같은 망 · 호스트 uid · lock 해시로 `npm ci`. 토큰은 `.env` 의 `AUTHORING_AGENT_TOKEN`(자식에서 뺌)·`CLAUDE_CODE_OAUTH_TOKEN`(구독 모양 검사)·`GH_TOKEN`. 워드는 리눅스에서 pandoc, 옛 `.doc` 은 실패로 알림. 주소 검사가 `http://admin` 만 더 받는다. SPEC 작성 §3.6 「★ 서버 컨테이너가 기본이다」·결정표 · 공통/6 §9 · SETUP §8 설치 순서
- 미완: **서버에서 한 바퀴 실측** — 사용자가 `.env` 에 토큰 셋을 넣어야 한다(`claude setup-token`·GitHub fine-grained·에이전트 토큰). 작업방은 컨테이너에서 git 이 안 돼 **병합 뒤 main 체크아웃에서** 한다. 리눅스 서버 uid 실측도 아직
- 막힌 것: 없음. 이미지 빌드·도구 판·[거부] 셋·볼륨 위 `npm ci`·에이전트 켜기까지는 가짜 토큰으로 확인
- 다음 세션이 알아야 할 것: 맥 경로(`npm run authoring-agent`)는 개발용 대체로 남았다 — 서버 author 와 **동시에 돌리지 않는다**. 이미지의 Playwright 태그는 러너와 같이 올린다. 계획 `docs/plans/2026-09-23-작성-서버로.md`
- **후속 — 고객사 설치 전 필수 (게이트 2 결정)**: 자식 격리. 지금은 자식이 서버 저장소(`/repo`) 전체에 쓸 수 있고(작업방 밖 `tests/`·`scripts/`·훅·compose), 같은 uid 라 `/proc/<부모>/environ` 으로 토큰 셋을 읽고, HOME 을 부모와 같이 쓴다. 해법 후보 — author 전용 사본(볼륨) + 서버 `tests/` 는 병합된 main 만 당김 + 자식을 다른 uid(작업방에만 쓰기) + 건마다 새 HOME. 이번 PR 은 postgres 를 127.0.0.1 로 좁히고 한계를 SPEC·SETUP 에 적는 데까지

## 2026-09-24 (10회차) — 서비스별 병렬 · Opus/effort · Sonnet 예비 · CLI 최신화 · 자식 격리 (PR #69)

- 완료: 서비스마다 줄을 따로 돌고 동시 상한(`AUTHORING_MAX_PARALLEL`, 기본 2 — 머지는 안 센다). 자식 claude 에 `--model opus --effort high --fallback-model sonnet`(`.env` 로 바꾼다). 켤 때와 하루 한 번 CLI 를 `stable` 로 올리고 깃발 점검, 실패면 직전 판으로. **자식 격리** — 컨테이너를 root 로 켜고 자식은 자리마다 다른 uid(`AUTHORING_CHILD_UID + k`), 작업마다 `/work/author-<번호>` 사본(bare git 은 root 0700, `GIT_DIR` 로만 git), 작업 임시·새 HOME·umask 077, 끝나면 그 uid 를 `pgrep` 이 0 일 때까지 거두고 공용 임시의 흔적을 지운다. 링크·비일반·트리 밖 파일은 읽기 전에 거부. 서버 저장소 쓰기(부품·기준 받기·병합 뒤 당기기)는 `HOST_UID` 로, 토큰은 GH 만. 머지는 head 브랜치가 원본의 `author-<번호>`·같은 저장소일 때만. 파일 넷이 새로 생겼다(`authoring-model`·`-copy`·`-child`·`-upload`, 300줄 규칙)
- 실측(가짜 토큰, 이미지 빌드): 두 번 켜도 에이전트까지 · 최신화 2.1.280→2.1.273(stable 이 이미지 판보다 낮다) 점검 통과 · 자식 uid 칸 비우면 거부 · 자식이 부모·다른 자리 environ·트리·에이전트 집·부품에 못 닿음 · **리눅스 fs** 에서 서버 저장소 쓰기 막힘(맥 Docker Desktop 은 폴더 공유가 uid 를 안 지켜 뚫림 → SPEC 한계) · 실제 코드로 만든 사본: 소유 자리 uid · `@platform/kit`→사본 packages · status 깨끗 · 자식 uid 로 Chromium 관문 통과 · 거둔 뒤 남은 0 · `/tmp` 흔적 지움 · 자리 uid 프로세스의 TOKEN 환경 0
- 미완: **서버에서 진짜 토큰으로 한 바퀴**(사용자가 `.env` 채움) · 서비스 둘 동시 실측 · 리눅스 서버 uid 실측 · 맥에서 한 바퀴(HOME 고친 것 확인) · 빈 시작 커밋 push 가 오늘 첫 push 에서 검사 기록에 막힌다(계획 할 일 10 — 다음 PR)
- 막힌 것: `kill -0 -1` 이 「남은 게 없다」를 알려 주지 않았다(권한 없는 남의 프로세스가 있으면 성공) → `pgrep -u` 로 바꿨다
- 다음 세션이 알아야 할 것: 자식은 여전히 서버 저장소를 **읽을** 수 있다(부품 링크가 `/repo/node_modules` 를 가리켜서) — 부품을 저장소 밖으로 옮기면 닫힌다. 맥 경로는 격리가 없다(같은 uid). 계획 `docs/plans/2026-09-24-작성-병렬-격리.md`

## 2026-09-25 (11회차) — 작성 경로 스킬 정리 · 새 서비스 첫 폴더 · 스킬 200줄 분리 (PR #71)

- 완료: `/auth/me` `services[].testsDir`(계약 변경, 게이트 0) → 에이전트가 폴더를 서비스 설정으로 정한다(한 칸 이름만, 아니면 집은 뒤 작업방 전에 FAILED) · `케이스폴더` 추정 제거 · 새 서비스 폴더도 가벼운 길(spec 이름은 `<접두사>-NNN.spec.ts` 만) · `ci-covers-tests` 가 그 모양만 든 폴더를 서비스 폴더로 면제 · `tpx-cases` §4 「메뉴로 닿지 않는 화면」 · 스킬 `tpx`·`tpx-cases`·`tpx-merge`·`spec-review` 를 SKILL.md + `references/` 로(파일마다 ≤200줄, 검사 추가) · 「맥」 → 「작성 에이전트」(작성 §3.6 제목 「작성 에이전트는 전용 체인이다」, 옛 문장은 머리말 용어 한 줄)
- 미완(후속): 에이전트가 올리는 파일이 **자기 서비스 폴더·접두사만**인지 검사(security 주의) · 설정 API `testsDir` 모양 검사(WS-F, 지금은 `min(1)`) · 별도 `tests_repo` 를 집기 전에 거르기(`/auth/me` 에 저장소 주소 — 계약)
- 막힌 것: 없음. 작업방 세션이 git 복합 명령을 거부해 명령을 쪼갰다(LEARNINGS)
- 다음 세션이 알아야 할 것: 배포 뒤 **author 컨테이너를 다시 켠다**(폴더표·판정 스크립트는 켤 때 고정). 자식은 `tpx-author` 절차 단계마다 `tpx-cases/references/<n>-*.md` 를 연다. 계획 `docs/plans/2026-09-25-작성-스킬정리.md` · 검사 `docs/reviews/2026-09-25-작성-스킬정리.md`

## 2026-09-25 (12회차) — 서버 author 첫 실측 · 역방향(모드 B) 명세 (PR #73)

- 완료(실측, 맥 Docker Desktop): 진짜 토큰 셋으로 `author` 한 바퀴 — 집기 2초 · 초안 PR 까지 4분 40초(요청 #5870 → PR #72). 같은 자료를 다시 넣자 R9 로 새 케이스를 안 따고 기존 `DEMO-012`~`014` 를 관문으로 다시 돌렸다(3/3 초록) — **중복 방지 확인**. PR #72 는 중복이라 병합 없이 닫았다. 할 일 10(빈 시작 커밋 push)은 PR #70 이 닫았다(`hook-contract.test.mjs` 16/16)
- 완료(명세): 역방향 — 기획서↔화면 대조(대조) · 기획서 없이 시작 주소로(화면만). 다르거나 화면에만 있으면 원본 기획서에 표시 + 화면 기준 **미확정** 케이스, 기획서 없으면 전부 미확정 + 워드 역기획서. 정본 작성 §3.6 「★ 역방향 — 화면과 대조한다」, 계약은 전부 `상태: 대기`(게이트 0 두 번). 기대값 규칙의 예외를 CLAUDE.md §3 · tpx-cases R10 · 1-input 에 같이 적었다
- 미완: 역방향 **구현 전부** — 갈래별 항목은 `docs/WORKSTREAMS.md` 「📐 역방향(모드 B)」. 머지 뒤 서버 저장소 자동 pull 실측(다음 새 기획서 요청 때) · 서비스 둘 동시(두 번째 서비스 배정 필요) · 리눅스 uid 격리(리눅스 기계 필요) · DEMO 대상 서버 `qa.demo.test` 가 안 풀린다 — 기획서의 주소로 바꿀지 사용자 결정
- 막힌 것: 첫 요청 #5868 이 push 403 으로 실패 — GitHub fine-grained 토큰의 Contents 가 읽기 전용이었다. `.env` 를 맥 텍스트 편집기로 고치자 `mac` 이 `Mac` 으로 자동 대문자가 돼 401. 둘 다 SETUP §8 에 이미 적힌 절차를 사람이 틀린 것이라 기록만 한다
- 다음 세션이 알아야 할 것: 토큰 확인은 값 없이 `curl -u x-access-token:<토큰> https://github.com/<저장소>.git/info/refs?service=git-receive-pack` 의 200/403 으로 쓰기 권한을 가른다. 계획 `docs/plans/2026-09-25-역방향-명세.md`

## 2026-09-25 (13회차) — 역방향 계약 반영: kit 꼬리표 · DB 칸 (PR #74)
- 완료: `CaseSpec.unconfirmed?` · `defineCase` 입력(빈 글자면 키 없음) · `db/migrations/20260925000001_reverse_mode.sql`(칸 · 이름 붙인 CHECK 둘 · down 은 에이전트 산출물부터 지운다) · DB 검사 `apps/admin/src/db/reverse-columns.test.ts`(접두사 XRC) · 계약 블록 둘 `반영 완료`
- 미완: 칸을 채우고 읽는 코드 — WS-A · WS-B · WS-F → WS-작성 → WS-D · WS-E (`docs/WORKSTREAMS.md` 📐)
- 막힌 것: 없음. 로컬엔 dbmate 가 없어 docker 이미지(`ghcr.io/amacneil/dbmate:2`)로 검사용 DB `platform_xrc` 에 적용했다
- 다음 세션이 알아야 할 것: WS-F 가 `settings/store.ts:71` 을 고치기 전에는 설정 저장마다 `login_id`·`login_password` 가 지워진다(지금은 쓰는 곳 없음)


## 2026-09-26 (14회차) — 역방향 ① 서버 통로 (PR #79)
- 완료: 만들기 `compare·env·startUrl`(400 `BAD_ENV`·`BAD_START_URL`, 깨진 `base_url` 도 400) · 화면만 `submit` 자료 0 · 목록·상세 칸(계정·비밀번호 원문 없음 검사) · 상세 `assets[].role·sourceAssetId` · 집기 `target`(줄 지워지면 null 칸) · `outputs` 통로(에이전트·집은 쪽·RUNNING · 원본 확장자 규칙 · 잠금 · 개수 상한 제외) + 권한 세 줄 · `diffs` 상세까지 그대로 · 역방향 원본의 재실행 409 `BAD_SOURCE`(게이트 1). `routes.ts` 437→243줄(`agentRoutes.ts` 로 에이전트 통로 넷). 검사 `reverse.test.ts`(XWV) · `outputs.test.ts`(XWO)
- 미완: 화면(WS-E ②) · 에이전트(WS-작성 ③) · `store.ts` 363줄 분리
- 막힌 것: 없음. 검사용 DB `platform_wsw`(docker dbmate)
- 다음 세션이 알아야 할 것: 명세가 오류 코드를 안 정한 두 자리를 정했다 — `role` 이 틀리면 `BAD_ROLE`, `compare` 가 참·거짓이 아니면 `BAD_ENV`(작성 §7 에 `BAD_ROLE` 을 적었다). 재실행이 원본 자료를 읽을 때 산출물(MARKED·REVERSE_SPEC)이 섞이므로 ③ 은 `role === 'INPUT'` 만 읽는다. 계획 `docs/plans/2026-09-26-역방향-작성서버.md`

## 2026-09-26 (15회차) — 역방향 ③-1 에이전트 뼈대 (PR #81)
- 완료: 집기 `target` 재대조 · `TARGET_*` 환경 · 화면만 · 원본 `INPUT` 만 · `out/` 산출물 안전 읽기 · push 전 비밀번호 원문 검사(케이스·PR 본문·차이·원고) · 역기획서 pandoc 변환·되읽기 검사·`outputs` · `finish` diffs(좁힘·`marked:false`) · 부분 실패 DONE+이유 · 실패 사유 거르기 · `tpx-author` `references/reverse.md`. 판정 `scripts/authoring-reverse.ts`(검사 29)
- 미완: ③-2 표시(워드 메모·피그마 댓글) · **서버에서 실제 한 바퀴** · PDF 스티커(npm 승인 뒤)
- 막힌 것: 서버 컨테이너 pandoc 이 2.9.2.1 이라 `--sandbox` 가 없다(실측) — 원고 그림 거절 + 변환 결과 되읽기로 대신했다
- 다음 세션이 알아야 할 것: 자식은 로그인을 `node --input-type=module < "$TMPDIR/login.mjs"` 로 작업 트리에서 돈다(파일 자리에서 돌리면 `@playwright/test` 를 못 찾는다 — 실측). `authoring-run.ts` 는 290줄 · `authoring-io.ts` 는 이미 313줄이라 더 늘리지 않았다. 계획 `docs/plans/2026-09-26-역방향-에이전트-뼈대.md`

## 2026-09-26 (16회차) — 역방향 ③-2 표시 (PR #82)
- 완료: 워드 메모 사본(jszip) · 피그마 댓글 · 차이마다 marked/markError · 원본 다시 받기 · 올릴 사본 비밀번호·피그마 토큰 검사 · 푼 크기 상한·DEFLATE · 자식 표시 자리(asset·anchor·node) · 자료 번호 · pandoc --wrap=none · jszip 정식 의존성. 검사 `authoring-docx.test.ts`(12) · `authoring-mark.test.ts`(11)
- 손 확인: pandoc 이 만든 실제 docx 에 메모 둘(문장 · 마지막 문단)을 달고 `pandoc --track-changes=all` 로 되읽어 제자리·작성자 확인
- 미완: **서버에서 실제 한 바퀴**(테스트 계정 넣은 대상 서버 + 워드·피그마 자료) · PDF 스티커(npm 승인 뒤)
- 막힌 것: 없음. jszip 타입에 `internalStream` 이 없어 `nodeStream('nodebuffer')` 로 푼 바이트를 센다
- 다음 세션이 알아야 할 것: pandoc 워드에는 빈 `word/comments.xml`(`<w:comments … />`)이 이미 있다 — 펴서 끼운다. 메모 번호는 문서의 `w:id` 최대값 뒤(책갈피 번호와 섞여도 겹치지만 않으면 된다). 계획 `docs/plans/2026-09-26-역방향-표시.md`

## 2026-09-27 — 작성 토큰 사용량 · 역방향 「한 칸」 (PR #86)
- 완료: stream-json 풀기(`scripts/authoring-usage.ts` — 정상 `modelUsage` · 끊김 메시지 id 마다 마지막 사본) · 끝내기보다 먼저 `usage` 보고(순서 검사) · 칸 일곱 · `usage` 통로(집은 쪽 · RUNNING · 한 번만) · 등급표·토큰 통로·라우트표 · 한도 판정·결과 요약은 `result` 글 · 로그 필터 · 점검 깃발 · 「한 칸」 정의·화면만 메뉴 1단계·30분 예산·`screens/` · Grafana 작성 토큰
- 실측: CLI 2.1.274 stream-json — 턴 이벤트 출력 토큰은 스트리밍 중간값(3 → 최종 460), `modelUsage` 입력 952 vs 메인 usage 27. 샘플 `scripts/fixtures/stream-json-sample.jsonl`. 같은 흐름에 `rate_limit_event`(5시간 한도 사용률)도 있다 — 지금은 안 쓴다
- 미완: 데모마켓 대조 재실행으로 60분 안·토큰 확인 · `authoring-io.ts` 323줄 분리
- 막힌 것: 없음. 시간초과를 `error` 로 가르려 했는데 `error` 는 대시보드에 안 여는 칸이라 `tokens_partial` 칸을 더했다
- 다음 세션이 알아야 할 것: 다른 실행 도구(Codex CLI 등)를 붙이면 `authoring-usage.ts` 만 갈아 끼운다. 검사용 DB `platform_wsk`


## 2026-09-27 — 작성 진척 · 중단 · 폐기 (PR #87)
- 완료: 상태 STOPPED(이유 다섯·누가) · stop·discard 통로(요청한 사람+admin, 신호 3분 없으면 AGENT_LOST) · stage 진척·stop 응답 · finish STOPPED · 에이전트 30초 틱·멈출 신호·끝낼상태 · 재시작 닫기 STOPPED(머지 FAILED) · 화면 진척·Modal·누가·왜 · Grafana 중단 세기 · store.ts 를 agentStore.ts 로·돌린다를 authoring-spawn.ts 로 뗌
- 미완: 이어하기(보관·재개) — 다음 PR. 지금의 STOPPED 는 작업방을 안 남긴다
- 막힌 것: 없음. 네 갈래를 하위 작업자에게 동시에 맡겼다(서버·에이전트·화면·Grafana) — 계약을 파일 하나로 붙여 보내 모양이 어긋나지 않았다
- 다음 세션이 알아야 할 것: 에이전트 쪽은 가짜 손으로만 검사했다 — 서버와의 실제 왕복(stage 의 stop · finish STOPPED)은 실제 서버에서 한 번 돌려 본다. 검사용 DB platform_wst


## 2026-09-28 — 테스트 작성 Status 화면 개편 (PR #88)
- 완료: 목업 두 판을 사용자가 고른 대로 — Status 카드(단계 다섯 칸 · 진척 · 한도 시간 막대 · 늦어도 완료 시각 · 숫자 칸 · 마지막 활동, `AuthoringStatusCard.tsx` · 판단은 `authoringStatus.ts`) · 상세 두 단 + 해야 할 일(`AuthoringTodo.tsx` — 검토 · 차이 확인 · 반영 / 같은 자료로 다시 작성(RERUN) · 폐기 / 중단) · 시작 모달(`AuthoringStartModal.tsx`) · 목록 줄 한 문장(`목록글`)·줄 통째로 누르기 · 보내기→테스트 작성 시작 등 문구 · DESIGN.md
- 실측: 5872(데모마켓 대조)가 실제 서버에서 60분 한도로 STOPPED · TIMEOUT 으로 닫혔다 — PR #87 의 중단이 실제 왕복에서 돌았다. 다만 진척 토큰 715(캐시 읽기 1,542만을 뺀 값) · caseFiles 0
- 미완: 명세 `작성.md:522` 「멈춘 듯」→「응답 없음」(spec 차선 PR) · 진척 토큰에 캐시 읽기 · caseFiles 0 원인(에이전트 PR) · 이어하기(보관·재개)
- 막힌 것: 없음. 가짜 시계 검사에서 두 번째 읽기가 안 잡혔다 — 화면 반영을 `vi.waitFor` 로 기다려야 셌다
- 다음 세션이 알아야 할 것: 에이전트가 올리는 단계 글을 칸으로 바꾸는 표는 `authoringStatus.ts` 의 `단계글` 이다 — 에이전트의 `손.단계('…')` 글을 바꾸면 여기와 영어 표도 바꾼다. 검사용 DB platform_wsu

## 2026-09-28 — 작성 에이전트 한도 120분 · 케이스 세기 경로 · 진척 토큰 캐시 읽기 (PR #89)
- 완료: 자식 한도 `자식제한 = 120분`(`authoring-progress.ts`, 이어하기 전까지의 조치) · 진척 caseFiles 를 자식이 쓰는 `tests/<폴더>` 에서 센다 · 진척 tokens = 입력+출력+캐시 읽기(캐시 쓰기 제외) · 카드 라벨 「토큰 (캐시 읽기 포함)」 · 명세 §7 TIMEOUT·tokens·「응답 없음」 · DESIGN 라벨
- 미완: 이어하기(보관·재개) — 120분에 끊기면 여전히 처음부터다 · 데모마켓 대조 재실행으로 120분 안에 끝나는지 본다
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 이 PR 전에 끝난 행의 progress.tokens 는 입력+출력이라 새 라벨과 뜻이 다르다(몇 줄뿐, 분기 안 둠). 반영은 author·admin 컨테이너 재빌드가 필요하다. `authoring-run.ts` 가 딱 300줄 — 다음 변경이 넘기면 분리한다. 검사용 DB platform_wsq(지움)

## 2026-09-28 — 대조 요청도 「같은 자료로 다시 작성」 (PR #92)

- 완료: 재실행 행이 대조 원본의 `compare`·`env`·`start_url` 을 물려받는다 — 새 마이그레이션 `20260928000001_rerun_compare.sql`(CHECK 를 AUTHOR·RERUN 으로, down 은 셋 다 비우고 되돌림 · 실제 행으로 검증)
- 완료: 재실행 때 물려받은 대상 서버를 `역방향칸판정` 으로 다시 판정 — 계정이 빠졌으면 400 `BAD_ENV`
- 완료: `outputs` MARKED `source` 는 재실행이면 원본 요청의 입력 · 에이전트 `표시준비` 가 `자료출처(것)` 로 원본 파일을 받는다(전에는 재실행 번호로 받아 404 였을 자리)
- 완료: 화면 — 대조 요청에도 버튼 · 설명은 두 상태 모두 「처음부터 다시」, 대조면 「대상 서버와 시작 주소도 원본 그대로」 · 재실행 대조 상세는 「입력은 원본 요청 #N 것을 그대로 씁니다」
- 미완: **이어하기(멈춘 자리부터)** — 정방향 · 대조 함께 다음 PR. 지금 에이전트는 끝나면 작업 폴더(`author-<id>`)와 자식 홈을 통째로 지우고 세션 id 도 안 남긴다(`authoring-run.ts:165-171` · `authoring-child.ts:137`)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 에이전트 쪽 변경은 I/O 껍데기 한 줄이라 검사가 없다 — 실제 서버에서 대조 요청을 한 번 중단시키고 다시 작성해 표시 사본이 붙는지 본다

## 2026-09-28 — 멈춘 자리부터 이어하기 (PR #94)

- 완료: DB `stop_reason` + CRASH · REJECTED · `resume_from`(RERUN 에만 · 부분 유일 색인) — `20260928000003_authoring_resume.sql`(down 은 둘을 FAILED 로 되돌림 · 실제 행으로 검증)
- 완료: 서버 — `POST requests { kind: RERUN, sourceId, resume: true }`(409 NOT_RESUMABLE) · 상세 `canResume`·`resumeUntil`·`resumedBy`·`keepWorkspace` · 집기는 원본을 집었던 에이전트만 · finish CRASH·REJECTED(까닭 필수). 보관일 7 은 `store.ts` 한 곳
- 완료: 에이전트 — 자식이 일하다 끊김은 CRASH, 올리기 거절(누설 포함)은 REJECTED · 중단이면 작업 폴더를 root 로 잠가 보관 · 이어받기면 사슬을 거슬러 넘겨받고 기준 SHA 로 되감기 · 켤 때와 한 시간마다 서버에 물어 훑기 · 케이스 누적 세기(`보관.json` 옛케이스)
- 완료: 자식 이어하기 절 + `tpx-author/references/resume.md` · 화면 「다음 단계」 카드 시안 A · Grafana 중단 이유 둘 · author `/work` 볼륨
- 미완: 실제 서버 한 바퀴 — 작성 하나를 중단시키고 이어서 작성해 ① 앞 실행의 케이스를 버리지 않는지 ② 올리기 거절을 이어가 고치는지 ③ 컨테이너 재생성 뒤에도 폴더가 남는지
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 진입점은 `scripts/authoring-keeping.ts` 의 `작업방준비`(넘겨받기/새로 만들기)와 `보관훑기`. 판정 순수 함수는 `authoring-keep.ts`. 화면 A 항목은 `web/authoringTodoParts.tsx`

## 2026-09-28 — 끝내기 전 비밀번호 자체 점검 (PR #99)

- 완료: 역방향 자식이 결과 요약 전에 `$TMPDIR/secret-scan.mjs` 로 테스트 폴더 · 표 · 산출물 폴더를 훑는다(날 글자 · 이스케이프 꼴 · diffs.json 푼 값). 찾으면 고치고 깨끗할 때까지. 없는 경로 · 빈 인자는 EXIT=2
- 완료: 올리기 검사는 안전망으로 그대로. 서버 코드 안 건드림 — `tpx-author/SKILL.md` 「끝내기 전에」 · `references/reverse.md` §2
- 미완: 실제 한 바퀴 — 5875(5874 이어받기)는 이 변경 전 규칙으로 돈다. 다음 대조 요청부터 에이전트 기록에 「비밀번호 점검」 줄이 찍히는지 본다
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 못 보는 것 둘 — 기획서 원본에 계정 값이 적힌 경우(자식이 못 고침) · 역기획서 워드 변환 뒤 드러나는 것. 그때는 여전히 올리기 거절(중단 · 이어가기)로 간다

## 2026-09-29 — 기획서 속 비밀번호를 받자마자 가린다 (PR #102)

- 완료: 역방향이면 자식을 띄우기 전에 `먼저가리기`(`scripts/authoring-masking.ts`) — 워드 원본 지움 · 자료 폴더 · `tests/<폴더>` · `docs/cases/<접두사>.md` · 옛 행 본문의 원문을 `••••••` 로. 이어받은 실행은 앞 실행이 남긴 파일까지
- 완료: 표시 사본은 `글칸가리기` — `<w:t>` 를 이어 붙여 찾아 여러 칸에 갈려도 가리고 속성은 안 건드린다. 자식 규칙에 「`••••••` 는 가린 값」
- 미완: 실제 한 바퀴 — 5875(테스트 29개 보관) 를 이어서 작성해 올리기 거절 없이 끝나는지
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 못 가리는 것 — PDF · 그림 · 피그마 · 워드 속성·문서 정보 칸. 그때는 올리기 검사가 그대로 거절한다

## 2026-09-29 — 작성 요청 번호는 하나 · 실행 기록 (PR #104)

- 완료: 목록은 뿌리마다 한 줄(rootId · runCount) · 상세 rootId · runs(토큰 네 칸) · RUN_ACTIVE · NOT_LATEST · 폐기는 요청 통째 — `apps/admin/src/authoring/history.ts`
- 완료: 에이전트 브랜치 · PR 은 `author-<뿌리>` 하나(덮어쓰기 · 사람 커밋이면 거절 · PR 본문 갱신) · 머지는 두 이름 · finish 400 이면 FAILED 로 다시(5877)
- 완료: 화면 시안 A(실행 기록 표) · 목록 N차 · 새 번호로 안 간다 · Grafana 작성 토큰 네 칸 · CLAUDE.md §5 예외
- 미완: 브라우저 눈 확인(밝게 · 어둡게) · 실제 한 바퀴(다음 이어서 작성이 같은 PR 을 갱신하는지)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 뿌리 식은 `history.ts` 의 `사슬식` · `위로식` 이 정본이다 — 폐기(`stop.ts`)도 그것을 쓴다. 작업 폴더 `author-<행 번호>` 와 브랜치 `author-<뿌리>` 는 다르다

## 2026-09-29 — 보류 케이스 사람 입력 (PR #108, 병합)

- 완료: 명세 도메인/작성 §3.6 「★ 보류 케이스」 · §7 통로 · K10 예외 · K13 · kit `CaseSpec.held`(건너뛰기) · 데이터모델 `held_input` · compare_check 를 넓혀 정방향 반영 env 를 머지 행에
- 완료: 서버 `authoring/held.ts`·`held-routes.ts`(넣기 · 제거 · 되돌리기 · HELD_OPEN · HELD_UNKNOWN · MERGE_ACTIVE · NOT_LATEST · mergeEnvs · 뿌리 잠금 안 판정 · finish 안 입력 옮기기)
- 완료: 에이전트 `authoring-held.ts`(칸 계산 · 이름 · heldUnknown) · `authoring-held-apply.ts`(ts.factory 값 적기) · `authoring-held-merge.ts`(검사 → 3회 → 비밀번호 검사 → lease push → 새 머리로 CI)
- 완료: 화면 시안 A `AuthoringHeld.tsx` · `AuthoringMergeStep.tsx` · 자식 스킬(보류도 케이스로) · CI `--no-held`
- 미완: 실제 서버 한 바퀴(반영 → 3회 → 병합) — 5877 처리가 첫 실측 · 「모킹 필요」 항목은 여전히 케이스로 안 만든다 · 3회는 desktop 만
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: main 으로 못 가게 막는 자리는 셋(merges HELD_OPEN/HELD_UNKNOWN · 반영 에이전트 · CI `--no-held`) — 하나만 믿지 않는다. 비밀값 칸의 아이디/비밀번호 가르기는 칸 이름 추측(`authoring-held-apply.ts` `비밀칸들`)

## 2026-09-29 — 작성 모델 Sonnet 5.5 xhigh · AI 티 규칙 (PR #111, 진행 중)

- 완료: 자식 claude 모델 기본값 `claude-sonnet-5-5` · effort `xhigh` · 예비 `opus` (전에는 `opus` · `high` · `sonnet`, 정본 공통/6-인프라 §9) · SETUP §8 에 `.env` 로 바꾸는 법과 다시 켜기
- 완료: im-not-ai quick-rules 발췌(MIT)를 `tpx-cases/references/korean-ai-tells.md` 한 장으로 — 요구사항 표를 쓸 때부터 지킨다
- 미완: opus→sonnet 품질 비교 기준선이 없다 — 데모마켓 측정으로 두 모델을 비교한다 (다음 할 일)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 모델 기본값을 바꾸면 서버 author 를 다시 켜야 반영된다. 자식 스킬만 바뀐 것은 다음 작성부터 반영된다(작업마다 원격 main SHA 로 만든 사본을 읽는다).

## 2026-09-30 — 작성 누락 막기 ① 원장 대조 · 제외 종류 · 팬아웃 (PR #119)

- 완료: 원장 추출(`scripts/authoring-ledger.ts` — 번호 모드 · 문단 모드 · 자료 여럿 · 원장 없음) · 대조(`authoring-ledger-check.ts` — 케이스 파일 확인 · 한 줄 하나 · 닫힌 종류 · 셈) · 껍데기(`authoring-ledger-io.ts`) · `npm run ledger` · `check:ledger`
- 완료: 에이전트가 자식 전에 원장을 뽑아 줄 프롬프트에 원장 절 · 올리기 직전 대조(빠지면 REJECTED + `ledger-missing.json`) · PR 본문 머리에 셈 · 300줄 파일 둘 분리(`authoring-prompt.ts` · `authoring-upload-reverse.ts`)
- 완료: 자식 스킬 관문 0 · 「제외」 표 · API 케이스 절차 · 팬아웃(`tpx-author/references/fanout.md`) · MKT 표 원장 기준(172 → 케이스 48 · 제외 124 · 빠짐 0) · 명세 §3.6 「★ 원장」
- 미완: ② 커버리지 칸 ③ 남은 요구로 이어 작성 — 계약 블록 대기 · 실제 서버에서 원장 대조 · 팬아웃 한 바퀴(REV-F4-03)
- 막힌 것: 없음. 이 컨테이너에 pandoc 이 없어 데모마켓 글자본은 워드 XML 에서 뽑은 것으로 셈을 맞췄다(서버는 `pandoc -t plain`)
- 다음 세션이 알아야 할 것: 원장 사본은 자식이 고칠 수 있다 — 판정은 에이전트 메모리의 원장이 한다. `authoring-run.ts` 가 딱 300줄이다 — 다음 변경은 먼저 뗀다


## 2026-09-30 — 작성 누락 막기 ② 커버리지 칸 (PR #120)

- 완료: 칸 다섯 `coverage_*` · 짝 CHECK · `grafana_ro` 권한(`db/migrations/20260930000001_authoring_coverage.sql`) · 셈 모양 검사(`apps/admin/src/authoring/coverage.ts` — 서버 · 에이전트 공용) · finish 가 칸에 옮김(틀리면 `BAD_COVERAGE`) · 상세 `coverage`
- 완료: 에이전트 `scripts/authoring-coverage.ts` — 원장 대조 뒤 끝내기(DONE · 대조 뒤 올리기 거절)에 셈 · 보류 손을 `올리기` 안으로 옮김(바깥 보류 → 안쪽 셈) · 셈이 거절되면 셈만 빼고 다시(`authoring-io.ts`)
- 완료: **게이트 1 사용자 결정 — 빠져도 올리기를 거절하지 않고 기록만.** 빠짐 목록 파일 · 프롬프트의 「앞 실행이 빠뜨린 번호」 · 이어하기 절차 줄을 걷었다 · 원장 없음 `{ none }` · 원장 밖 자료 `unread`
- 완료: Status 카드 「기획서 요구」 한 줄(머지를 뺀 최신 작성 실행) · Grafana 「작성 커버리지」 · 명세 §3.6 「셈을 남긴다」 · §7 · 데이터모델 · 리포팅 §8.5 · ③ 블록 범위 「다음 요청 · 빠짐」
- 미완: 실제 서버 한 바퀴(작성 → 끝내기에 셈 → 카드 · 패널에 보임) · 브라우저 눈 확인(밝게 · 어둡게) · ③ 남은 요구로 이어 작성
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 셈은 **실행마다** 선다 — 화면은 `AuthoringDetail.tsx` 의 `작성`(머지 뺀 최신 작성 실행) 것을 보인다. 저장된 `later` · `missing` 은 사본이다 — ③ 은 다시 계산할지 먼저 정한다(WORKSTREAMS ② 항목 「③ 에 넘길 것」). `authoring-run.ts` 298줄

## 2026-09-30 — 작성 누락 막기 ③ 남은 요구로 이어 작성 (PR #121 · REV-F3-12)

- 완료: `POST … { kind: 'AUTHOR', continueFrom }` — 원본 입력 자료(행 · 파일, 하드링크 우선) 복사 · 대조 설정 물려받기 · 409 `NOT_MERGED` · `ALREADY_CONTINUED` · `NOTHING_LEFT` · 칸 `continue_from`(폐기 안 된 것 하나) · 상세 `canContinue` · `continuedBy` · `continueFrom`(`apps/admin/src/authoring/continue.ts`)
- 완료: 에이전트가 기준 SHA 의 main 표 · 케이스로 남은 번호를 세고 `--- 이어 작성 ---` 절 · `continue.json` · 막히면 자식 전 FAILED(`scripts/authoring-continue.ts` · `authoring-ledger-io.ts`) · 자식 절차 `tpx-author/references/continue.md`
- 완료: **게이트 1 — main 표에 이미 있던 「사람이 뺌」은 에이전트 대조도 인정**(모든 작성 실행 · 원장 사본 `사람이뺌` 으로 자식 관문 0 도 같게)
- 완료: 화면 — 반영 끝에 「남은 요구로 이어 작성」 · 못 누르는 까닭 · GitHub 직접 병합 안내 · 「#N의 남은 요구」 · 상세 번호마다 새로 그리기(`main.tsx` key)
- 완료: 독립 검사 반영 — 뿌리 잠금 안에서 잠금 연결로만 묻기(풀 교착) · 실패 정리가 원래 오류를 덮지 않게
- 미완: MKT(5873) 실제 한 바퀴 — 반영을 한 번 누르고(GitHub 에서 이미 병합) 이어 작성 → 124개 중 몇 개를 덮는지(REV-F4-03 과 같이) · `continue_from` 대시보드 칸 권한(후속)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 다시 작성 · 머지 · 보류 통로는 아직 `뿌리잠그고` 안에서 풀 연결을 쓴다(교착 여지 — LEARNINGS 2026-09-30). 원본을 API 로 다시 작성하면 이어 작성과 겹칠 수 있다(명세 「남는 한계」 ⓪). 기준 표는 케이스 파일마다 `git show` 한 번이다

## 2026-10-01 — 케이스 고치기 ②-1: 서버 · 에이전트 · 명세 (PR #124 · AUT-F3-12)

- 완료: kind `EDIT`(마이그레이션 · 제약 이름 `authoring_request_kind_check` · `authoring_request_source_pair_check`) · `POST /api/authoring/edits`(검사 `edit.ts` `고칠것검사` · 서비스 잠금 안 겹침 409 `EDIT_OPEN` · `edit-routes.ts`) · 목록 뿌리 `source_id IS NULL` · 줄 `rootKind` · RERUN 다시 적용(병합 뒤 409) · 고치기 실행 중단(대기 · 끊김만) · DONE 폐기 · 집기 `edits`(고치기 행 · 그 다시 적용만) · 반영 끝내기 같은 트랜잭션에서 저장값 칸 지우기(`edit-finish.ts` · `execution/savedInput.ts` `저장값칸지우기`, `result.pulled === true` 일 때만) · 반영이 main 을 받아 온 뒤 끝냄(이미 병합된 PR 도) · 에이전트 `scripts/authoring-edit.ts`(자식 없이 사본 · AST 고치기 · typecheck · check:tests · author-<뿌리> · PR) · `authoring-edit-apply.ts`(확정 · 고칠 글 · PR 본문) · 명세 작성 §3.6 「★ 케이스 고치기」 · §7 · 데이터모델 · 인증 · 카탈로그 · 실행 §8.2 · 색인 · DESIGN
- 미완: ②-2 화면 — `docs/WORKSTREAMS.md` 「📐 케이스 고치기」 할 일 목록 · Grafana 커버리지에서 다시 적용 빼기(WS-D)
- 막힌 것: 없음. 이 세션은 Playwright 브라우저 파일이 없어 브라우저 검사 4건이 main 에서도 실패한다(환경)
- 다음 세션이 알아야 할 것: 「고치기 실행」 판정은 서버가 `params ? 'edits'`(중단 · 폐기 · 이어하기 · 저장값), 집기는 kind 로 한다 — `edits` 는 `/api/authoring/edits` 로만 선다(작성 · 재실행 본문은 400). 에이전트 실제 git · gh 는 연기 시험(로컬 bare 저장소 + 가짜 gh)으로만 돌려 봤다 — 서버 author 컨테이너에서 첫 요청 때 PR 본문 · 브랜치를 눈으로 본다

## 2026-10-01 — 같은 서비스 동시 작성 · 반영 때 겹침 검사 ③-1: 서버 · 에이전트 · 명세 (PR #126 · AUT-F3-15)

- 완료: 에이전트가 **자리를 먼저 잡고** 가져간다 — 작성 · 재실행 · 고치기는 같은 서비스도 동시 상한 안에서 나란히, **반영은 보류가 있든 없든 서비스마다 한 줄**(보류 있는 반영은 줄 차례 뒤 자리를 잡는다 · 줄에서 기다리는 동안 단계 글을 다시 올린다 · 서버가 거절해 멈추면 줄의 반영도 시작 안 함)(`authoring-lanes.ts` · `authoring-agent.ts` `줄돌기`)
- 완료: 반영 때 **자식이 끝낸 커밋**과 지금 main 을 서버 저장소 git 객체로만 견줘 ⒜ 같은 tc_id(표 「제거함」 포함) ⒝ 같은 요구 번호(문단 번호 뺌 · 새로 들어온 케이스끼리) ⒞ 같은 이름이면 `result.conflicts` 로 멈춘다(`authoring-conflicts.ts` · `authoring-conflicts-io.ts`). 서버 `PUT` · `DELETE …/conflicts/:tcId` · 반영 409 `CONFLICT_OPEN` · 상세 `conflicts` · `conflictsOpen` · 집기 `conflicts`(결정 전부) · 끝내기 400 `BAD_CONFLICTS` · 칸 `conflict_input`
- 완료: 고른 대로 적용(남긴다 + tc_id 겹침 → main · 표 · 요청의 가장 큰 번호 + 1, 뺀다 → 파일과 표 줄) · main 을 요청 브랜치에 합치기(요구사항 표는 diff3 덩이 · 양쪽이 같은 자리에 더한 줄은 main → 이 요청 순 · 「요구」 번호 겹치면 뒤로 · 「덮는 범위」는 이 요청 것) · PR 본문 「겹침 처리」 줄(`authoring-conflicts-apply.ts` · `authoring-table-merge.ts` · `authoring-main-merge.ts` · `authoring-held-merge.ts` `반영작업방`)
- 완료: 독립 검사 넷(계획 대조 · 코드 · 명세 · 보안)이 낸 지적 반영 — 보류 반영이 줄을 건너뜀 · 링크 표 · 한글 이름(`-z`) · 모양 틀린 번호가 목록을 통째로 400 으로 만듦 · 멈춤 뒤 시작 · 표 칸 단위 바꾸기 (`docs/reviews/2026-10-01-WS-작성-동시작성.md`)
- 미완: **③-2 화면**(고르기 칸 · 모두 남긴다 · `CONFLICT_OPEN` 문구 · 반영 실패 까닭을 상태 카드에 · 반영 실패한 작성에 「다시 작성」 · DESIGN 겹침 줄) — `docs/WORKSTREAMS.md` 「📐 동시 작성 · 반영 겹침」. 서버 author 컨테이너에서 두 요청을 같은 서비스에 넣고 반영 두 번을 눌러 보는 실측
- 막힌 것: 없음. 이 PR 은 클라우드 세션에서 시작해 맥으로 옮겨 마쳤다 — 커밋하지 않은 작업 파일은 옮겨지지 않는다(LEARNINGS)
- 다음 세션이 알아야 할 것: **③-2 가 병합되기 전에는 author 컨테이너를 이 판으로 다시 켜지 않는다** — 겹침이 생기면 고를 화면이 없다. 반영은 CI 를 기다리는 동안에도 같은 서비스의 다음 반영을 세워 둔다(최대 17분). 에이전트가 읽는 git 이름은 `-z` 로 읽는다. `authoring-run.ts` 298줄 · `authoring-agent.ts` 300줄 근처 — 다음에 더하면 갈라야 한다


## 2026-10-01 — 반영 겹침 ③-2: 고르는 화면 (PR #127 · AUT-F3-16)

- 완료: 작성 상세에 「겹친 케이스」 표(시안 A) — 케이스 · 무엇이 겹쳤나 · 겹친 main 케이스 · 고른 것 · `남긴다`/`뺀다`/`되돌리기` · 「모두 남긴다」(차례로, 실패하면 그 자리에서 멈춤). 남은 겹침이 있으면 「테스트 반영하기」 잠금 + 이유 한 줄 + 표로 가는 고리
- 완료: 반영 실패 칸(`AuthoringMergeFailed.tsx`) — 까닭 + 「같은 자료로 다시 작성」(케이스 고치기는 자기 안내가 있어 뺌). `errorText.ts` · 영어 표 · `api.ts` 타입과 두 통로 · DESIGN.md 겹침 줄 · 명세 배포 순서 줄
- 미완: **서버 실측** — author 컨테이너를 새 판으로 켜 같은 서비스에 요청 둘 + 반영 둘. 이제 켜도 된다
- 다음 세션이 알아야 할 것: 겹침 목록은 반영 실행의 `result.conflicts` 에서 오고, 고른 것은 반영하려는 작성 실행 행(`data.id`)에 붙는다. 다음은 ④ 엑셀 · 테스트케이스 문서 업로드

## 2026-10-02 — 테스트 두 갈래 지침 · 명세 (PR #128 · AUT-F3-17)

- 완료: UI · Functional 경계(사용자 문장) · 근거 넷 · 곱하기 금지 · R19 · 정방향 화면 입력 규칙 미확정(메인이 표에 더함 · 서브에이전트는 돌려줌) · locator 새 순서 · 문구 틀 `references/wording.md` · §1.1 L16~L19 · 유비쿼터스 언어 세 줄
- 완료: 계약 블록 둘(tcId 종류 글자 #129 · 실행 종류와 사이드바 #131) — 둘 다 대기. Page Object 는 지침에 「대기」로만
- 미완: AUT-F3-18~23 (#129 판별식부터 · #130 · #131 · 단계 시각 · MKT/CDY 다시 작성 · 리포트 문구)
- 다음 세션이 알아야 할 것: #129 는 **판별식부터** 넓힌다 — 지침만 켜면 올리기가 거부된다(LEARNINGS 2026-10-02). 서브에이전트 상한 3 은 단계 시각 실측 전까지 그대로. MKT · CDY 재작성은 #130 뒤이고 서버 실측을 겸한다

## 2026-10-02 — 테스트 두 갈래 ② 번호 종류 글자 · Page Object 켜기 (PR #129 · AUT-F3-18)

- 완료: 판별식(K2 TCID 세 꼴 · 번호열쇠 · 올리기 허용 목록 · CI 서비스 폴더 `service-folder.mjs` · 원장 · 겹침 종류별 번호 · 가림표 · kit 실패 줄) → Page Object 검사(`catalog/pageObject.ts` — tests/ 아래 케이스 아닌 .ts 전부 K7 · test.step · verify 금지) → 지침 켜기(two-kinds · fanout · resume · continue · tpx-author SKILL) → 커버리지 `uiOnly`(보고용) → 명세 블록 ① ② 반영 · ③ 대기
- 완료: 요청과 main 이 같은 Page Object 를 바꿨으면 줄이 안 겹쳐도 반영 실패(`authoring-main-merge.ts`)
- 미완: 블록 ③(AUT-F3-24 · 25) · #130 · #131 · 시각 기록 · MKT/CDY 재작성
- 막힌 것: 로컬 DB 에 20261001* 마이그레이션이 없어 DB 테스트 49건이 환경 실패 · catalog scan 1건은 main 에서도 실패
- 다음 세션이 알아야 할 것: **병합 뒤 서버를 먼저(또는 같이) 올리고 author 컨테이너를 다시 켠다** — 옛 서버는 uiOnly 끝내기를 400, 켜 둔 에이전트는 옛 판별식. 번호열쇠(`rules.ts`)가 옛 꼴과 FN 을 같은 번호로 접는다

## 2026-10-02 — 기능 테스트도 Page Object (PR #130)

- 완료: two-kinds · 4-selector · 5-writing · tpx-author SKILL 의 「#130 전까지 page 직접」을 걷고 두 갈래 다 Page Object · 찾는 법의 정본도 Page Object(용어 사전은 이름 · 뜻 · CSS 까닭)
- 완료: 지침에 「Page Object 메서드에 함수를 넘기지 않는다」 · 「Page Object 에서 request 를 쓰지 않는다」 · 가져오기 허용 목록. chain-contract 검사를 새 문장으로
- 미완: author 컨테이너 재시작(병합 뒤 사람) · 다음은 #131 실행 종류 · MKT/CDY 재작성
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: API 케이스는 여전히 케이스 파일에서 `request` 를 직접 쓴다

## 2026-10-03 — 작성 단계별 시작 · 끝 시각 (PR #133)

- 완료: 자식이 단계마다 `[단계] <이름>` 을 말하면(`tpx-author` 「단계 표지」 · fanout · reverse) `진척누적기` 가 에이전트 시계로 찍는다. 자식이 끝나면 단계표를 로그에 찍고(시간초과 · 멈춤 · 끊김 · 거절도), 올리면 작성 PR 본문 「단계 시각 (이번 실행)」 절
- 완료: 명세 작성 §7 「토큰 사용량」 목록에 단계 시각 예외 한 줄(로그 첫 줄 · PR 본문 result 글 규칙의 예외)
- 미완: 서버 실측(AUT-F3-22 와 겸함) · 실측 뒤 가장 긴 단계부터 서브에이전트로 나누기
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: **병합 뒤 author 컨테이너를 다시 켜야** 새 지침 · 새 에이전트가 돈다. `authoring-run.ts` 가 딱 300줄이라 한 줄만 늘어도 나눠야 한다. 이어하기는 PR 본문을 갈아 써서 앞 실행 단계표는 로그에만 남는다

## 2026-10-03 — MKT · CDY 옛 케이스 · 표 지우기 (PR #134 · AUT-F3-22 앞 절반)

- 완료: 서버 배포 — 마이그레이션 20261001000001 · 20261001000002 · 20261002000001 적용, 옛 CASE 실행 30건 삭제(SETUP §12), admin · runner · grafana · author 새 코드로 기동
- 완료: tests/mkt · tests/codyssey · docs/cases/MKT.md · CDY.md 삭제. tpx-cases 5-writing 의 API 본보기(MKT-045)를 글로 바꿈
- 미완: 다시 작성 — MKT 는 기획서 대조(자료 기획서.docx · 대상 qa `http://demo:3002`), CDY 는 화면만(prod `https://codyssey.kr`). 단계 시각 표로 가장 긴 단계를 본다(AUT-F3-10 · REV-F4-03 겸함)
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 다시 작성 전까지 목록에 옛 MKT · CDY 행이 남고 스캔에 「폴더를 읽지 못했다」 경고가 뜬다 — 실행하지 않는다. 관문 0 `--tests` 에 없는 폴더를 주면 `scripts/ledger.ts` 가 파일 오류로 죽는다(케이스 0건일 때만, 넘김)

## 2026-10-03 — 작성 PR 본문 상한 (PR #136)

- 완료: `PR본문` 을 `scripts/authoring-pr-body.ts` 로 옮기고 UTF-8 55,000바이트 안에 맞춘다 — 긴 요구사항 표는 경로 한 줄로, 자식 출력은 줄마다 1,000자로 자르고 앞줄부터 깎는다(머리글 셈 · 관문 3 기록 · 단계 시각은 지킨다), 마지막엔 바이트로 자른다
- 계기: MKT 다시 작성 11201 이 케이스 133개(UI 29 · FN 104)를 만들고도 표 117,745자 때문에 「Body is too long」으로 중단(REJECTED)
- 미완: author 재기동 → 11201 이어서 작성 → MKT PR · CDY PR #135 반영 → AUT-F3-22 체크. 속도 개선(팬아웃 묶음 · 보조 준비 시간 · 표지 강제)은 그 뒤 종합 결정
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 본문은 `gh --body` 인자로 넘어가 Linux 인자 상한(131,072바이트)도 지켜야 해서 글자 수가 아니라 바이트로 센다

## 2026-10-03 — MKT · CDY 새 규칙으로 다시 작성 끝 (AUT-F3-22, PR #138)

- 완료: CDY #135(화면만 · UI 22 · 기능 27 · 66분) · MKT #137(대조 · UI 34 · 기능 114 · 요구 172 → 케이스 154 · 다음 요청 18 · 빠짐 0) 반영. 진행판 AUT-F3-22 · AUT-F3-10 · REV-F4-01 · 02 체크
- MKT 경과: 11201 93분에 본문 크기로 멈춤(#136) → 11203 이어서 70분, 자식이 실행 로그를 `$로그` 파일로 남겨 「테스트만 바뀐 것이 아니다」로 멈춤 → 파일을 지우고 11204 이어서 70분(관문 0~4 전부 다시) → DONE
- 미완: REV-F4-03 의 「한 번에 120분 안」 · 팬아웃 전후 견주기 — 속도 개선 뒤
- 막힌 것: 없음
- 다음 세션이 알아야 할 것: 단계 시각 근거 — CDY 팬아웃 두 차례 34분 · 화면 훑기 16분, MKT 11204 차이 목록 36분 · 관문 32분. 자식이 표지를 따옴표 안에 말하면 안 잡힌다(11203). 케이스 밖 파일 하나로 올리기가 통째로 멈추고 이어서 작성은 관문을 전부 다시 돈다
