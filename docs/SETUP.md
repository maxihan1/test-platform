# SETUP.md — 시작 전 세팅

> 내일 Claude Code에 던지기 전에 이 순서대로 한 번만 하면 된다.
> 소요: 20~30분.

---

## 1. 폴더 구조

```
test-platform/                      ← 프로젝트 루트 (이름은 자유)
├── CLAUDE.md                       ★ 루트에 둔다. Claude Code가 자동으로 읽는다
├── .gitignore
├── .github/workflows/ci.yml        ★ GitHub Actions. 타입 · 단위 테스트 · 테스트 코드 규칙 · SPEC 문서
├── .claude/
│   ├── settings.json               ★ 훅 설정. 커밋한다
│   ├── scripts/
│   │   └── guard.mjs               ★ 훅 검사 스크립트
│   └── skills/
│       └── spec-review/
│           └── SKILL.md            ★ SPEC 검사 스킬
└── docs/
    ├── SPEC.md                     ★ 무엇을 만드는가
    ├── WORKSTREAMS.md              ★ 어느 폴더가 무슨 일을 하는가
    ├── wbs.md                      ★ 진행판 원본
    ├── DESIGN.md                   ★ 화면 기준
    ├── design-mockup.html          개편 전 화면 목업 (2026-10-07 동결 — 시각 기준은 DESIGN.md 맨 위 시안 캔버스)
    ├── HOOKS.md                    ★ 훅 설명
    └── archive/                    옛 기록(공정표 · 실수 기록 · 진행 · 검사 · 계획서). 작업 중에 읽지 않는다 (2026-10-09)
```

`apps/`, `packages/`, `db/`, `tests/`, `infra/`는 **만들지 마라.**
Phase 0에서 Claude Code가 만든다. 미리 만들면 빈 폴더 때문에 구조를 잘못 잡는다.

---

## 2. 명령

```bash
mkdir -p test-platform && cd test-platform
git init

mkdir -p .claude/scripts .claude/skills/spec-review docs

# 받은 파일들을 위 구조대로 옮긴다
#   CLAUDE.md          → ./CLAUDE.md
#   settings.json      → .claude/settings.json
#   guard.mjs          → .claude/scripts/guard.mjs
#   SKILL.md           → .claude/skills/spec-review/SKILL.md
#   나머지 .md와 html  → docs/

cat > .gitignore <<'EOF'
node_modules/
dist/
.env
artifacts/
playwright-report/
test-results/
EOF

# pre-push 훅 — 파일은 저장소에 있다. 배선만 걸면 된다
git config core.hooksPath .claude/hooks

git add -A && git commit -m "프로젝트 문서와 규칙 설정"
git tag g0-docs

# GitHub에 private 저장소를 만든 뒤
git remote add origin git@github.com:<계정>/test-platform.git
git push -u origin main
```

**훅 본체는 `.claude/hooks/pre-push` 로 저장소에 들어 있다** (2026-09-18 이전).
검토를 받고 판별식이 본다. 다만 **배선(`core.hooksPath`)은 `.git/config` 에 들어가고
그것은 추적되지 않는다** — 새 기계에서 클론하면 위 한 줄을 **한 번** 쳐야 한다.

위 한 줄은 **상대경로**라 git 이 각 작업방의 루트 기준으로 풀어 **그 작업방이 딴 판의 훅**이 돈다.
**절대경로**(`/Users/.../test_platform/.claude/hooks`)로 걸었으면 작업방에서 push 해도 **main 체크아웃의 훅**이 돌고,
새 훅이 병합된 뒤 main 체크아웃에서 `git pull` 을 해야 새 훅이 돈다. 어느 쪽인지는
`git config --show-origin core.hooksPath` 로 본다.

배선이 걸렸는지는 아무거나 푸시해 보면 안다. `[pre-push] 검사 시작` 이 안 찍히면 안 걸린 것이다.
**훅은 실패가 아니라 침묵으로 건너뛴다** — 조용하다고 통과한 것이 아니다.

**CI 는 작성 에이전트 PR 에서만 돈다** (2026-10-09). 사람 PR 은 pre-push 가 검사하고 CI 잡은 건너뛰어진다 —
GitHub 이 건너뛴 잡을 통과로 세서 기다림 없이 병합된다. 설정과 보호 명령은 `docs/HOOKS.md` 「CI 와 병합 차단」에 있다.

---

## 3. 설치 확인

```bash
echo '{"tool_input":{"command":"git push --force"}}' \
  | node .claude/scripts/guard.mjs bash; echo "exit=$?"
```

`exit=2`와 차단 메시지가 나오면 정상이다.

---

## 4. 문서 읽는 순서

Claude Code에 던지기 전에 Maxi님이 직접 읽으실 순서다. 리뷰 관점을 같이 적었다.

| 순서 | 파일 | 볼 것 |
|------|------|------|
| 1 | `SPEC.md` §1~4 | 만들려는 게 맞는가. 특히 §4 명세 선언 방식 |
| 2 | 시안 캔버스 (`DESIGN.md` 맨 위 링크) | 브라우저로 열어본다. 화면이 원하는 모양인가 |
| 3 | `SPEC.md` §8 | 화면 구성이 목업과 맞는가 |
| 4 | `WORKSTREAMS.md` | 어느 폴더가 무슨 일을 하는지 이해되는가 |
| 5 | `CLAUDE.md` | 규칙 중 거슬리는 게 있는가 |

§5~7(타입·DB·API)은 코드에 가까운 부분이라 건너뛰셔도 된다.
대신 **§11 완료 기준**은 꼭 보시라. 이게 "다 됐다"의 정의다.

---

## 5. 내일 첫 명령

Phase 0는 보호 파일을 **처음 만드는** 단계라 예외 스위치를 켜고 시작한다.

```bash
cd test-platform
printf '{\n  "env": { "ALLOW_PROTECTED": "1" }\n}\n' > .claude/settings.local.json
claude
```

**`ALLOW_PROTECTED=1 claude`처럼 앞에 붙이는 방식은 안 먹는다.** Claude Code가 데몬
(백그라운드에 상주하며 세션을 대신 돌리는 관리 프로세스) 구조라 세션이 터미널이 아니라
데몬에서 태어나고, 터미널 앞에 붙인 환경변수가 세션까지 전달되지 않기 때문이다.
설정 파일에 넣어야 한다. 자세한 것은 `HOOKS.md`.

[0] 계획 검토는 2026-09-16에 끝났다 (`docs/archive/reviews/2026-09-16-G0.md`).
바로 `docs/WORKSTREAMS.md`의 Phase 0 킥오프 프롬프트를 넣는다.

Phase 0가 끝나고 G1을 통과하면 **스위치를 지운다.**

```bash
rm .claude/settings.local.json
```

그 시점부터 `types.ts` · `db/migrations/` · `docker-compose.yml`이 계약으로 잠긴다.
파일로 남는 스위치라 끄는 것을 잊기 쉽다. 지우는 것까지가 G1이다.

---

## 6. 아직 안 정한 것

Phase 0 전에 정해야 했던 5건은 2026-09-16에 결정돼 SPEC에 들어갔다
(기술 스택 §9.1 · 명세 추출 §3.1 · PDF 위치 §3.3 · 데모 대상 §10 · verify 실패 규칙 §4).
경위는 `docs/archive/reviews/2026-09-16-G0.md`에 있다.

2026-09-17 SPEC 개정으로 아래 3건이 더 결정됐다.

- 증적 문서 형식 → **§8.4 표가 정본이다.** 결과 화면에서 골라 만든다.
  PDF·HTML 은 `열기 ↗`, 엑셀은 `받기 ↓` 다 — 브라우저가 엑셀을 못 연다
- 민감 파라미터 마스킹 → §4.1. `.meta({ secret: true })` 꼬리표를 케이스 선언에 단다.
  **가리는 것은 화면과 증적 문서뿐이고 DB에는 평문이 그대로 들어간다.**
  저장할 때 가리면 재실행도 원인 분석도 못 한다
- `test_run.ABORTED` → §3.2·§5.2. 사람이 멈춤을 누를 때와, admin이 부팅 직후 미완 항목을 닫을 때 넣는다

**나중에 정할 것**
- **검수처 고유 양식**에 맞춘 엑셀 — 검수처 양식을 받을 때 (§1.1 L4).
  가공용 평평한 엑셀은 2026-09-18 에 범위 안으로 들어왔다 (§8.4)
- 브랜치 전략 — 갈래별 브랜치로 갈지 한 브랜치에서 갈지. Phase 1 시작 전까지

---

## 7. 개정 SPEC이 요구하는 설정

> 2026-09-18 에 계약 반영·카탈로그·실행·인증까지 들어왔다.
> **로그인과 계정·서비스 만들기가 실제로 돈다.** 남은 것은 로그인 **화면**이다 (WS-E).

### 설정값 (`.env`) — **띄우기 전에 만든다**

`.env.example`을 `.env`로 복사해 값을 채운다. `.env`는 저장소에 올라가지 않는다.

```
cp .env.example .env
# SESSION_SECRET 에 아무 긴 무작위 문자열을 넣는다
openssl rand -hex 32
```

| 이름 | 무엇 |
|------|------|
| `SESSION_SECRET` | 로그인 세션을 서명하는 키. **비어 있거나 32바이트보다 짧으면 admin이 기동을 거부한다** (`openssl rand -hex 32` 면 충분하다). 임시 키를 지어내면 재기동할 때마다 전원 로그아웃되고, 그 사실을 아무도 모른 채 「가끔 로그인이 풀린다」로 겪는다 |
| `ADMIN_PORT` · `POSTGRES_PORT` | 바깥 포트. 비우면 `3000`·`5434`으로 뜬다(postgres 는 2026-10-27 에 5433 에서 옮겼다 — 맥의 BTS 개발 DB 가 5433 을 쓴다. 옮기는 법은 「20. 서버와 맥에 나눠 띄우기」 「맥 postgres 를 5434 로 옮기기」). 한 서버에 다른 것과 같이 띄울 때만 바꾼다. **Grafana 는 바깥 포트가 없다** (2026-09-28) — 플랫폼에 로그인한 뒤 `그래프(Grafana) ↗`(같은 주소의 `/grafana/`)로 들어간다. 그래프(Grafana) 권한(설정 → 계정 → 그래프(Grafana) `읽기`)이 있는 사람만 열린다. 옛 `GRAFANA_PORT` 는 `.env` 에서 지워도 된다 |
| `POSTGRES_PASSWORD` · `GRAFANA_RO_PASSWORD` | DB 비밀번호 둘 (2026-10-23). 슈퍼유저 `platform` 과 Grafana 읽기 전용 계정 `grafana_ro` 의 것이다. **비우면 `platform` · `grafana_ro` 그대로다.** 서버는 `openssl rand -hex 24` 로 만든 값을 넣는다 — 주소에 그대로 들어가므로 영문 · 숫자만 쓴다(`@` · `#` · `$` 같은 글자는 주소나 `.env` 를 깨뜨린다). **DB 를 처음 만들 때만 읽힌다** — 이미 돌던 서버는 아래 「18. DB 비밀번호 바꾸기」 순서대로 한다. 개발 맥도 바꿔도 된다 — pre-push 의 임시 DB 도 이 두 칸을 읽는다. 맥 Docker Desktop 은 러너가 `host.docker.internal:5434` 으로 DB 에 닿아 비밀번호만 막는다 |
| `PLATFORM_PUBLIC_URL` | 이 플랫폼이 바깥에서 열리는 주소. Slack 알림의 「결과 보기」 링크가 이 값 위에 붙는다. **비워 두면 알림에 링크가 안 들어간다** — 틀린 주소를 보내는 것보다 없는 편이 낫다. **아래 maxihan 계정 로그인을 켜면 꼭 채운다** — 돌아올 주소가 이 위에 붙는다. **CI 가 APK 를 올리는 애플리케이션(Android 앱 · 게임)도 꼭 채운다** — 디바이스 팜이 APK 를 받는 서명 주소가 이 위에 붙고, 비우면 그 항목은 미실행으로 닫힌다(도메인/실행 §3.11). 설정 › CI 토큰의 CI 예시 주소도 이 값 위에 붙는다 — 비우면 브라우저를 연 주소가 들어가 localhost 면 CI 가 닿지 않는다. 설정 › 성능 에이전트의 설치 명령도 이 값 위에 붙는다 — **앞단 프록시(Caddy) 뒤에 두면 꼭 채운다.** 비우면 설치 명령이 `http://` 주소가 되어 에이전트 토큰이 거절된다. **설정 › BTS 연결의 「BTS 자동 설정」도 이 값이 있어야 한다** — BTS 웹훅 · 규칙이 이 주소로 QA Hub 를 부르고, BTS 는 사설 주소 · localhost 를 거절한다(비우면 「공개 주소가 없어」 한 줄로 막힌다 · 도메인/BTS §3.12 「설정 · 고장 대응」) |
| `AUTH_ISSUER` · `AUTH_CLIENT_ID` · `AUTH_CLIENT_SECRET` | 선택 (2026-10-20). **maxihan 계정(Auth_platform)으로 로그인하게 한다.** Auth_platform 주소와, 거기에 이 플랫폼을 등록하고 받은 client id · secret 이다. 등록할 때 돌아올 주소는 `PLATFORM_PUBLIC_URL` + `/api/auth/sso/callback` 이다(로그아웃 뒤 돌아올 주소는 2026-10-29 부터 안 쓴다 — 로그아웃은 이 앱 세션만 끝낸다). **셋 다 채우면 켜지고 셋 다 비우면 비밀번호 로그인 그대로다. 일부만 채우면 admin 이 기동을 거부한다.** 켜면 로그인 안 된 사람은 이 앱 화면을 거치지 않고 바로 Auth_platform 로그인 화면으로 가고(돌아온 알림이나 로그아웃 표시가 있을 때만 이 앱 카드가 뜬다 — 도메인/인증 §8.6) 회원가입 · 비밀번호 변경이 사라진다. 기본 계정 `admin` 은 Auth_platform 의 같은 아이디 `admin` 으로 처음 들어올 때 이어진다 (SPEC 도메인/인증 §3.5 「maxihan 계정」) |

**2026-09-17에 넷이 이 표에서 빠졌다.** `PLATFORM_INSTANCE_NAME`·`_COLOR`·`PLATFORM_TESTS_REPO`·`PLATFORM_ENV_URLS`.
서비스 이름·색·저장소·대상 서버 주소는 설정 파일이 아니라 **화면에서 정하고 DB에 들어간다** (SPEC §8.8 · §6).

### 달라진 것 · 달라질 것

- **러너 포트가 닫혔다** (2026-09-18 반영). 전에는 `localhost:4000`을 직접 찔러 `/health`를 볼 수 있었지만
  개정 §3.5가 "러너를 바깥에 열지 않는다"고 못 박았다. 로그인을 건너뛰는 뒷길이기 때문이다.
  이제는 컨테이너 안에서 본다 — `docker compose exec runner wget -qO- localhost:4000/health`
- **화면이 admin 포트로 뜬다** (2026-09-18 반영). 전에는 이미지 안에 화면 빌드 단계가 없어
  컨테이너가 API만 냈다. 이제 `http://localhost:3000` 이 화면이다
- **설치 직후 바로 `admin` / `admin` 으로 로그인해 비밀번호를 바꾼다** (2026-09-28 반영).
  계정이 하나도 없는 서버가 켜지면 기본 계정 `admin` 을 스스로 만든다. 로그인하면 **비밀번호 변경 화면만** 뜬다 —
  8자 이상으로 바꾸면 계속한다. `admin` / `admin` 은 누구나 아는 값이라 **설치하고 곧바로** 한다.
  바꾸면 그 전에 누가 같은 계정으로 들어와 있었어도 그 출입증은 끊긴다 (SPEC 도메인/인증 §7)

  그다음 **설정 → + 프로젝트 추가**로 마법사를 열어 프로젝트와 첫 애플리케이션을 한 번에 만든다 — 프로젝트 이름 → 종류 → 이름 · 번호 → 대상 서버(주소를 하나 이상) → 알림 · 작성 도구 → 확인 → `만들기`
  (애플리케이션이 하나도 없으면 설정을 열자마자 이 마법사다 · 2026-10-23 · SPEC 도메인/인증 §8.8 「새로 만들기 마법사」). 만든 운영 계정에게는 그 프로젝트의 세 칸 쓰기가 자동으로 배정되어 맨 위 고르개에 바로 뜬다. 작성 에이전트 계정(`AUTHORING_AGENT_USER` — 그때 그 계정이 이미 있을 때)도 같이 배정되고, 켜 둔 author 가 1분 안에 새 애플리케이션을 알아채 다시 켜지 않아도 된다(2026-10-25 GAME-F2-14) —
  권한은 프로젝트마다 주고, 배정받지 않은 프로젝트의 애플리케이션은 띠에 뜨지 않는다 (2026-10-19 PRJ-F1-02b · PRJ-F1-03). 애플리케이션을 더 만들 때는 `+ 애플리케이션 추가`(같은 마법사)이고, 다른 사람의 권한은 설정 › 계정에서 프로젝트마다 준다.

  **직원은 스스로 가입한다.** 로그인 화면의 `회원가입` → 운영자가 **설정 → 가입 신청**에서 프로젝트·권한을 골라 수락한다.
  거절하면 신청이 지워진다.

  **명령은 복구용이다** — 운영 계정이 모두 잠겼을 때 컨테이너 안에서 하나 더 만든다.

  ```
  docker compose exec admin npx tsx scripts/add-user.ts <아이디> <이름> <member|admin>
  docker compose exec admin npx tsx scripts/add-service.ts <접두사> <서비스 이름> \
    --env qa=https://qa.example.com
  ```

  `add-user.ts` 는 비밀번호를 무작위로 만들어 **한 번만** 찍고, 그 계정은 다음 로그인에서 비밀번호를 바꿔야 한다.
  아이디는 영문 소문자·숫자·`.`·`_`·`-`, 2~32자다.
  **`--env` 를 하나 이상 넣는다** (2026-09-19 반영). 대상 서버가 없으면 실행 설정의
  드롭다운이 비고, 안 고르면 실행 요청이 400 이다 — 서비스를 만들어도 아무것도 못 돌린다 (SPEC §8.2).
- **서비스를 여러 개 담는다.** 한 벌에 여러 서비스를 두고 맨 위 띠에서 오간다.
  컨테이너를 서비스마다 따로 띄우지 않는다 (2026-09-17 결정. 앞 판은 그 반대였다)
- **정기 실행은 설정 화면에서 켠다** (2026-10-12). 설정 → 서비스 → 「정기 실행」에서 「매일 돌리기」를 켜고 시각 · 대상 서버를 고른다.
  admin 이 1분마다 보고 그 시각부터 1시간 안에 하루 한 번 돌린다(SPEC 공통/6-인프라 §9.2). `cron` 을 걸지 않는다.
  **앞 판대로 `cron` 에 걸어 둔 서버는 그 줄을 지운다** — 남겨 두면 그날 두 번 돈다. `crontab -l` 로 `run-scheduled` 가 든 줄을 찾아 `crontab -e` 로 지운다.
  지금 한 번 손으로 돌려 볼 때만 `docker compose exec admin npx tsx scripts/run-scheduled.ts <접두사>` 를 쓴다

## 8. 작성 에이전트 — 화면이 세운 줄을 서버가 집어 간다

**기획서는 화면에서 넣는다.** 사이드바의 **「테스트 작성」** 자리에서 **PRD 파일을 고르고 피그마 주소를 적어** 보내면
줄이 하나 생긴다. 파일도 피그마도 **여럿을 한 세트로** 넣는다. **서버의 작성 에이전트 컨테이너(`author`)가 5초 안에 집어 간다** (2026-09-23).
맥을 켜 둘 필요가 없고, 누가 어느 기계에서 보내든 같다.
**서버와 맥에 나눠 띄웠으면 author 는 맥에 있다** — 맥이 켜져 있어야 집는다(「20. 서버와 맥에 나눠 띄우기」).

- 받는 파일 종류와 상한(한 파일 크기 · 한 요청의 자료 개수)은 `docs/spec/도메인/작성.md` §7 「자료」가 정본이다. 여기 옮겨 적지 않는다
- 파일을 다 올린 뒤에야 줄에 선다. **중간에 실패하면 그 요청은 줄에 서지 않는다** — 화면이 안내하는 대로 새 요청으로 다시 넣는다
- 예전처럼 본문을 붙여 넣는 칸은 없다 (2026-09-23). 붙여 넣으면 표와 그림이 빠지기 때문이다
- **서버에서는 옛 워드(`.doc`)를 못 읽는다** — `.docx` 나 PDF 로 저장해 올린다. `.docx` 는 된다

기획서를 읽어 **요구사항 표 · 테스트케이스 · `.spec.ts`** 를 만들고 **초안 PR 까지** 낸다. 한 건에 10~20분 걸린다.
일은 둘로 나뉜다 — **에이전트 스크립트**가 작업방을 열고 commit·push·초안 PR 을 하고, **자식 Claude**(`claude -p`)는
`tpx-author` 스킬을 타고 케이스만 만든다. 순서의 정본은 `docs/spec/도메인/작성.md` §3.6 「작성 에이전트는 전용 체인이다」다.

### 처음 한 번 — 서버에 작성 에이전트 켜기 (약 10분)

**작성 에이전트는 선택 사항이다.** 켜지 않으면 작성 화면에 넣은 요청이 줄에서 기다리기만 한다. 순서를 지킨다 — 토큰은 admin 이 떠야 발급된다.

1. **서버 `.env` 에 `AUTHORING_AGENT_USER` 로 작성 계정 아이디를 적고 admin 을 다시 띄운다** (`docker compose -p test_platform --env-file .env up -d --build admin`).
   그 계정은 **일반(member)** 으로 만들고 **작성할 프로젝트를 켜서 작성을 `쓰기`** 로 둔다 (설정 → 계정, 2026-09-28 서비스별 권한 · 2026-10-19 프로젝트별). **`admin` 을 주지 마라** — 그 계정 하나가 설정 전부를 연다.
   이 계정을 만든 뒤 설정에서 새로 만드는 프로젝트에는 저절로 배정된다(2026-10-25 GAME-F2-14) — 그 전에 있던 프로젝트만 손으로 켠다.
   안 적으면 아무도 못 집는다 — 열어 두면 그 서비스의 작성 쓰기 계정 누구나 먼저 집어 병합될 PR 주소를 바꿔치기할 수 있다
2. **에이전트 토큰** — 운영 계정으로 **설정 → 계정 → 그 계정 편집(오른쪽 서랍) → 작성 에이전트 토큰 → [발급]** · 한 번만 뜨는 값을 `.env` 의 `AUTHORING_AGENT_TOKEN` 에
3. **Claude 토큰** — 아무 기계에서 `claude setup-token` → 브라우저로 로그인 → 나오는 `sk-ant-oat…` 값을 `CLAUDE_CODE_OAUTH_TOKEN` 에.
   **구독 한도를 쓴다(추가 비용 없음).** API 키(`sk-ant-api…`)를 넣으면 실비 청구라 컨테이너가 켜지지 않는다.
   **고객사 서버에는 그 회사 Claude 계정으로 만든 토큰을 넣는다** — 개인 구독 토큰을 남의 서버에 심지 않는다 (`docs/spec/도메인/작성.md` §3.6)
   **(선택) API 크레딧 먼저 쓰기** (2026-10-08) — Max · Team 플랜은 매달 API 크레딧(Max 5x $100, 이월 없음)을 준다. 받으면 작성이 그 크레딧을 먼저 쓰고, 떨어지면 구독으로 넘어간다.
   ① **결제 수단 · 자동 충전이 없는 Console 조직을 새로 만든다** — 그래야 떨어졌을 때 청구 없이 멈춘다. 구매 크레딧이나 자동 충전이 있는 조직이면 그 잔액에서 계속 빠진다(코드는 이 설정을 못 읽는다)
   ② claude.ai(브라우저) → 설정 → 청구 → 「API 크레딧」 → 「조직 연결」 → ①의 조직 → 약관 동의 ③ 그 조직에서 API 키를 만들어 `.env` 의 `AUTHORING_CREDIT_KEY` 에(`ANTHROPIC_API_KEY` 가 아니다 — 그 이름은 여전히 막는다)
   ④ author 를 다시 켠다. 시작하자마자 크레딧으로 못 돌면(크레딧 없음 · 새 조직 속도 제한 · 폐기된 키) 로그에 `[작성] N번 API 크레딧으로 못 띄웠다(<까닭>) — 구독으로 다시 띄운다` 가 뜨고 구독으로 돈다. 작성 도중에 떨어지면 멈추지 않고 `[작성] N번 API 크레딧이 도중에 떨어졌다(<까닭>) — 같은 작업 폴더에서 구독으로 이어 띄운다` 가 뜨고 같은 요청이 구독으로 이어 돈다(2026-10-22)
4. **GitHub 토큰** — GitHub → Settings → Developer settings → **Fine-grained tokens** → 테스트 저장소 하나만 · **Contents 읽기/쓰기 · Pull requests 읽기/쓰기** → `GH_TOKEN` 에
5. **리눅스 서버면** `HOST_UID`·`HOST_GID` 에 저장소 주인의 `id -u`·`id -g` 를 적는다 (맥은 비워도 된다) — 서버 저장소에 쓰는 일(부품 맞추기·병합 뒤 당기기)은 이 계정으로 한다.
   안 맞으면 사람이 `git pull` 을 못 한다. 자식 Claude 는 `AUTHORING_CHILD_UID`(비우면 `20000`)부터 동시 수만큼 uid 를 쓴다 — 서버에 이미 있는 uid 와 겹치지 않게 둔다.
   메인 모델(`claude-opus-5-5`)·생각 깊이(`high`)·예비 모델(`sonnet`)·동시 수(`2`)를 바꾸려면 `.env.example` 의 `AUTHORING_*` 칸을 본다 (2026-10-04 기본값 변경 — 전에는 `claude-sonnet-5-5`·`xhigh`·`opus`). 보조 모델은 `.claude/agents/author-scan.md` · `author-write.md` 에서 바꾼다.
   `.env` 를 바꾼 뒤에는 author 를 다시 켜야 반영된다 — 아래 6번 첫 줄을 그대로 친다
6. 켠다 — **저장소 뿌리에서**:

   ```bash
   docker compose -p test_platform --env-file .env --profile authoring up -d --build author
   docker compose -p test_platform logs -f author      # [작성] … 로 붙었다 · 줄을 본다 가 뜨면 된 것이다
   ```

   처음엔 부품을 맞추느라 1~2분 걸린다. `[거부] …` 가 뜨면 그 줄이 무엇을 넣으라는지 말한다.
   켤 때 `[최신화] Claude CLI <전> → <후>` 가 뜬다 — **npm 레지스트리로 나가는 길이 필요하다.** 막혀 있으면 이미지 판 그대로 돈다

**`.env` 는 컨테이너 안에서 가린다.** 자식 Claude 는 셸로 저장소를 읽는데 `.env` 에 모든 비밀값이 있어서다.
컨테이너는 admin 하고만 같은 망에 있어 DB·러너에 못 닿는다. 호스트의 디바이스 팜에는 닿는다 — 작성 AI 가 앱을 눌러 가며 읽는다.

**자식은 따로 된 방에서 돈다** (2026-09-24). 작업마다 컨테이너 안 `/work` 에 사본을 만들고, 자식은 자리마다 다른 uid 로 돌아
에이전트의 토큰·서버 저장소·다른 서비스의 작업을 못 건드린다. 동시에 도는 작성 수는 `AUTHORING_MAX_PARALLEL`(기본 2 — 모든 서비스를 합친 수)이 막고, 같은 서비스도 이 안에서 나란히 돈다(2026-10-01).
여러 사람이 한 서비스에 몰려 기다림이 길면 이 값을 올린다 — 한 자리에 메모리 4g 이므로 compose 의 `mem_limit` 도 같이 올린다(명세 공통/6-인프라 설정값 표).
반영은 서비스마다 차례로 돌고, 먼저 들어간 케이스와 겹치면 멈춰 사람이 고르게 한다(명세 도메인/작성 §3.6 「★ 반영 때 겹침 검사」).
**남는 한계** — 자식은 Claude 구독 토큰을 든다(로그인해야 해서). 구독 한도를 사람의 대화형 사용과 나눠 쓰고, 동시에 도는 수만큼 빨리 닳는다.
**예비 모델(메인은 Sonnet)은 과부하일 때만 넘어간다** — 한도에 걸리면 그 요청이 「Claude 구독 한도에 걸렸다」로 실패한다.
**맥의 Docker Desktop 에서는 격리가 성립하지 않는다** — 폴더 공유가 uid 권한을 안 지킨다. 고객사는 리눅스 서버에 둔다.
켜기 전에 저장소 뿌리에 `.env` 가 있어야 한다 — 없으면 docker 가 가림 자리를 root 소유 빈 파일로 만든다.
같은 서비스의 반영은 차례로 돈다 — 반영이 CI 를 최대 17분 기다리는 동안 그 서비스의 다음 반영이 선다(작성은 서지 않는다).
**겹침을 고르는 화면(③-2)이 들어가기 전에는 author 컨테이너를 PR #126 판으로 다시 켜지 않는다** — 겹침이 생기면 고를 곳이 없다.
Claude 토큰은 1년이면 만료된다 — 그때 3번을 다시 한다. 대상 서버 주소가 `localhost` 면 컨테이너 안에서 자기 자신이라 실행 관문이 실패한다.
작업방에서 compose 를 띄우지 않는다 — 저장소 뿌리에서만.

**켤 때 멈춘 요청을 정리한다.** 에이전트가 꺼지는 바람에 「진행 중」으로 멈춘 요청(이 계정 것)을
켜자마자 **실패로 닫는다.** 화면에서 새로 넣으면 된다. 그래서 **서버와 맥에서 동시에 돌리지 않는다** — 서로의 진행 중 요청을 닫는다.

### 맥에서 돌리기 — 개발용 대체

서버에 토큰을 두기 싫거나 스크립트를 고치며 볼 때만 쓴다. **서버의 author 를 끄고** 저장소 뿌리에서:

```bash
docker compose -p test_platform stop author
AUTHORING_WORK_DIR=~/authoring-work npm run authoring-agent
```

**`AUTHORING_WORK_DIR` 를 정한다** (2026-09-28). 멈춘 작성의 작업 폴더를 7일 남겨 「이어서 작성」에 쓰는데,
안 정하면 OS 임시 폴더에 두고 macOS 가 오래된 것을 먼저 지운다. 서버 author 는 `/work` 볼륨이라 할 일이 없다.
**서버에서 멈춘 요청은 맥 에이전트가 이어받지 않는다** — 폴더가 그 기계에 있다. 서버 author 가 다시 켜지면 그쪽이 집는다.

**처음 켤 때만 에이전트 토큰을 묻는다** (아래 「에이전트 토큰」). 그 뒤로는 묻지 않는다. 멈추려면 `Ctrl+C`.
**서버가 다른 기계에 있으면 `PLATFORM_ADMIN_URL` 을 적는다.** 남의 기계를 `http://` 로 가리키면 켜지 않는다 — 토큰이 망에 그대로 흐른다. `https` 를 쓴다.
맥에서는 자식이 맥 계정의 파일을 읽고 쓸 수 있다 — 사람 계정의 파일과 떼어 놓으려면 아래 「전용 OS 계정」대로 돌린다.

### ★ 이 판이 병합되면 에이전트를 다시 켠다 (2026-09-23)

**서버 author** 는 병합 뒤 스스로 main 을 당기지만 **떠 있는 프로세스는 옛 코드다.** 에이전트 코드가 바뀐 PR 이 병합되면 다시 띄운다.
**모델 기본값(`scripts/authoring-model.ts` · `docker-compose.yml`)이 바뀐 PR 도 같다** (2026-09-29 PR #111) — 다시 띄우기 전에는 옛 모델로 돈다.
자식 스킬(`.claude/skills/**`)만 바뀐 경우는 다시 안 띄워도 다음 작성부터 반영된다 — 자식은 작업마다 GitHub main SHA 로 만든 사본의 스킬을 읽는다(`scripts/authoring-copy.ts` `사본준비`).

```bash
docker compose -p test_platform --env-file .env --profile authoring up -d --build author
```

**맥(개발용 대체)** 은 아래대로 한다.

**전용 체인 판(맥이 PR 을 직접 여는 판)이 병합되면 main 을 받고 에이전트를 다시 켠다.**
새 스킬(`tpx-author`)이 main 에 있어야 돈다. **에이전트의 push 에는 pre-push 훅이 안 돈다** (2026-09-24 —
작업마다 만든 사본에서 훅을 끄고 올린다. 같은 검사는 CI 가벼운 길이 한다). 스킬과 에이전트 코드는 main 체크아웃의 것이므로 아래 두 줄을 main 체크아웃에서 친다.

그 앞 판도 같다 — 파일·피그마로 요청하는 판이 병합되면 **맥에서 돌고 있던 에이전트를 `Ctrl+C` 로 끄고, 새 코드를 받아 다시 켠다.**
옛 에이전트는 새 요청의 자료(파일·피그마)를 **읽을 줄 모른다** — 켜 둔 채로 두면 새 요청을 집어 가서 빈 입력으로 돈다.

```bash
git pull
npm run authoring-agent
```

### 피그마 토큰 — 설정 화면의 서비스 칸에 넣는다

**피그마 주소를 넣은 요청은 그 서비스에 피그마 토큰이 있어야 돈다.** 토큰이 없으면 새 요청 폼의 피그마 칸이 잠기고,
토큰이 틀렸거나 만료됐거나 읽기 권한이 모자라거나 그 파일을 볼 권한이 없으면 「테스트 작성 시작」을 누를 때 서버가 파일을 열어 보고 줄에 세우지 않은 채 까닭을 보인다.
(요청을 만든 뒤 토큰을 지우면 에이전트가 claude 를 부르지 않고 그 요청을 실패로 끝낸다 — 사유에 「설정 화면에 피그마 토큰을 넣어라」가 뜬다.)
토큰은 **맥에 두지 않는다.** 서버의 서비스 설정에 한 번 넣으면 에이전트가 요청을 집을 때 받아 간다.

**① 토큰 만들기** — 피그마에서 한다.

1. Figma 에 로그인 → 계정 메뉴 → **Settings** → **Security** 탭
2. **Personal access tokens** 에서 새 토큰을 만든다
3. **권한은 File content 읽기(read-only)만 준다.** 역방향을 쓰면 아래 「역방향(화면 대조)을 쓰려면」의 댓글 쓰기도 준다. 나머지는 안 준다 — 정방향만 쓰면 이 토큰으로 할 일은 화면을 읽는 것뿐이다
4. **만료일을 정한다.** 기한 없는 토큰은 새어 나가도 스스로 안 죽는다. 만료되면 ②를 다시 한다
5. 만든 직후 한 번만 보이는 값을 복사한다

**② 설정 화면에 넣기** — 운영(`admin`) 등급 계정으로 한다.

1. 사이드바 **「설정」** → 왼쪽 설정 메뉴에서 그 서비스를 고른다
2. **「피그마 토큰」** 칸에 붙여 넣고 저장한다
3. 칸이 **`설정됨 · 변경`** 으로 바뀌면 들어간 것이다. 값은 다시 안 보인다 — Slack 웹훅 칸과 같다
4. 바꾸려면 `변경` 을 눌러 새 값을 넣는다. 비우면 그 서비스는 피그마 자료를 못 읽는다

**피그마를 읽는 도구는 npm 패키지 `figma-reader` 다** (GitHub 저장소 이름은 `figma-reader-cli` — 헷갈리지 않는다).
따로 깔 것은 없다. 부르는 명령과 판 번호의 정본은 `.claude/skills/tpx-cases/references/1-input.md` 다 — 여기 옮겨 적지 않는다.

### 역방향(화면 대조)을 쓰려면 (2026-09-25)

**지금은 명세만 섰다 — 아래 준비는 구현이 병합된 뒤에야 켜진다.** 남은 구현은 `docs/WORKSTREAMS.md` 「역방향(모드 B)」 절에 있다.
역방향이 무엇인지의 정본은 `docs/spec/도메인/작성.md` §3.6 「★ 역방향 — 화면과 대조한다」다.

- **대상 서버 줄에 테스트 계정을 넣는다** — 사이드바 **「설정」** → 서비스 → **대상 서버** 줄마다 「일반 회원」 아이디·비밀번호.
  관리자처럼 다른 역할이 필요한 기획서면 **「+ 역할 추가」**로 역할 이름 · 아이디 · 비밀번호를 더 넣는다(2026-10-12) — 없으면 그 요구는 「보류 — <역할> 계정 미등록」으로 남는다.
  비밀번호는 피그마 토큰처럼 `설정됨 · 변경` 으로만 보인다. 실행할 때도 비어 있는 로그인 칸을 이 계정으로 채운다
- **그 계정은 권한 낮은 전용 테스트 계정이어야 한다.** 화면을 훑으려면 자식 Claude 가 그 비밀번호를 직접 든다 —
  기획서에 숨긴 지시로 밖에 보낼 수 있다. 정본의 「남는 한계」가 그 이유다. 운영자 계정이나 사람 계정을 넣지 않는다
- **그 비밀번호는 그 서비스의 작성 쓰기 권한자 전원이 알 수 있는 값으로 본다.** 화면에서 가리는 것은 표시일 뿐 경계가 아니다.
  그들에게 알려져도 괜찮은 값만 넣는다
- **운영 대상 서버 줄은 「실서비스 서버」에 체크한다** (2026-10-12). 체크한 줄은 테스트 작성 · 화면 탐색이 고를 수 없다 — 고르면 서버가 `BAD_ENV` 로 거절한다. 실행은 된다.
  이름이 `prod` · `production` · `운영`(대소문자 무시)인 줄은 처음부터 체크돼 있다 — 이 기능이 들어올 때 있던 줄도, 그 뒤 새로 더한 줄도. 그 밖 이름의 운영 줄은 직접 체크한다
- **크롤러가 버튼도 누른다 (2026-10-11 PRD-F6-02 부터).** 삭제 · 결제 같은 위험 이름 버튼도 누르고, 로그아웃은 누른 뒤 다시 로그인한다(탈퇴와 「복구할 수 없습니다」처럼 경고하는 확인 창은 마지막 확인 직전에 멈춘다).
  **실서비스 서버를 지키는 장치는 바로 위 「실서비스 서버」 체크 하나뿐이다** — 체크 안 한 운영 줄을 고르면 크롤러가 운영 데이터를 바꾼다. 같은 때 도는 다른 실행이 테스트 서버 데이터를 쓰면 흔들릴 수 있다.
  정본은 `docs/spec/도메인/작성.md` §3.6 「★ 표준 기획서」 「남는 한계」
- **로그인이 다른 주소를 거치는 서비스(SSO)는 이번 판에서 안 된다.** 에이전트가 대상 서버와 출처가 다른 페이지에서는 계정을 넣지 않고 멈추기 때문이다
- **피그마에 차이를 댓글로 달려면 토큰에 댓글 쓰기(`file_comments:write`) 권한도 준다** — 위 「피그마 토큰」 ①의 3번에서 읽기에 더해 고른다.
  없으면 댓글만 실패하고 요청은 끝까지 돈다
- **댓글 쓰기를 준 토큰은 전용 피그마 계정으로 만든다.** 그 토큰이면 그 계정이 닿는 **모든 파일**에 댓글을 달 수 있다 — 정방향 요청에서도 같다.
  사람 계정으로 만들면 그 사람이 볼 수 있는 파일 전부가 범위가 된다

### 에이전트 토큰 — 처음 한 번만 넣는다 (2026-09-23)

**켤 때마다 비밀번호를 치던 것을 없앴다.** 대신 설정 화면에서 **작성 에이전트 계정 전용 토큰**을 발급해 처음 한 번 붙여 넣는다.

1. 운영(`admin`) 계정으로 사이드바 **「설정」 → 계정** → 작성 에이전트 계정(`AUTHORING_AGENT_USER`) 줄의 **편집**(오른쪽 서랍)
2. **「작성 에이전트 토큰」 → [발급]** — 토큰이 **한 번만** 뜬다. 글자를 선택해 복사한다
3. **서버 컨테이너**면 `.env` 의 `AUTHORING_AGENT_TOKEN` 에 넣는다(위 「처음 한 번」). **맥(개발용 대체)**이면 `npm run authoring-agent` → `에이전트 토큰:` 물음에 붙여 넣는다 (화면에 글자가 안 찍힌다)
4. (맥) 서버가 받아 주면 **`~/.test-platform/agent-token`** 에 본인만 읽게 저장된다. 다음부터는 안 묻는다. 서버 컨테이너는 `.env` 에서 읽으므로 파일을 만들지 않는다

**토큰이 여는 것은 맥이 부르는 통로뿐이다** — 줄 집기·단계·끝내기·자료 받기·「나는 누구」.
새 작성 요청 만들기·머지·설정은 이 토큰으로 안 열린다 (정본 `docs/spec/도메인/인증.md` §7 「인증 적용 범위」).

| 하고 싶은 것 | 어떻게 |
|---|---|
| 기계를 바꾸거나 토큰이 샜을 때 | 화면에서 **[다시 발급]** → 확인 줄의 **[다시 발급한다]**. 옛 토큰은 그 자리에서 안 먹는다. 서버 author 는 `.env` 의 `AUTHORING_AGENT_TOKEN` 을 새 값으로 바꿔 다시 띄우고, 맥은 `~/.test-platform/agent-token` 을 지우고 다시 켜 새 값을 넣는다 |
| 작성 에이전트를 막고 싶을 때 | 화면에서 **[토큰 취소]** → **[취소한다]**. 돌던 에이전트는 다음 서버 부르기에서 거절받고 멈춘다 — 서버 author · 맥 둘 다 |
| 비밀번호를 다시 만들었을 때 | 토큰은 그대로다 — 두 열쇠는 따로 논다 |

**거절돼도 토큰 파일을 지우지 않는다.** 주소(`PLATFORM_ADMIN_URL`)를 잘못 준 것만으로 멀쩡한 토큰이 사라지면 안 되기 때문이다.
토큰을 바꿨으면 파일을 손으로 지운다.

**윈도우** — 방식은 운영체제에 안 매인다(홈 폴더의 같은 자리). 다만 윈도우는 「본인만 읽기」 권한 비트를 무시하므로
사용자 프로필 폴더의 기본 권한에 기댄다. **윈도우에서 에이전트 전체를 돌려 본 적은 아직 없다** (2026-09-23).

> **★ 옛 판단 — 「비밀번호는 어디에도 안 적는다」** (2026-09-23 오전 ~ 같은 날 오후).
> 파일에 두면 그 파일이 열쇠가 된다는 판단은 **지금도 맞다.** 그래서 비밀번호가 아니라 **좁고 취소할 수 있는 토큰**을 둔다.
> 자식 세션은 같은 OS 계정이라 이 파일을 읽을 수 있다 — 아래 「전용 OS 계정」도 이것은 못 막는다.
> 뒤집은 이유와 위협 판단의 정본은 `docs/spec/도메인/작성.md` 결정표 「맥 계정의 비밀값을 어디에 두나」다.

### 머지 뒤 main 을 알아서 당긴다 (2026-09-23)

맥이 병합을 끝내면 **에이전트를 켠 체크아웃에서 `git pull --ff-only origin main` 을 한다** — 저장소 훅과 fsmonitor 는 끄고 당긴다(자식이 써 둔 훅이 맥 권한으로 돌지 않게).
**이것은 훅만 막는다** — 자식은 `.git/config` 도 쓸 수 있어 다른 설정(`filter`·`core.sshCommand` 등)으로 맥 권한 명령을 걸 수 있다.
진짜 해법은 자식의 쓰기 범위에서 뿌리 `.git` 을 빼는 것이고 후속이다 (`docs/archive/progress/WS-작성.md` 8회차).
서버가 그 체크아웃의 `tests/` 를 보므로(`docker-compose.yml` 의 `./tests:/tests:ro`) 사람이 `git pull` 하지 않아도 **새 테스트가 목록에 뜬다** — main 을 받아 온 병합은 서버가 그 서비스를 다시 훑는다(2026-10-12 PRD-F9-03). 못 받아 왔으면 받아 온 뒤 「다시 스캔」을 누른다.

- 체크아웃이 `main` 이 아니거나 **고치던 파일이 있으면 건너뛴다** — 터미널에 `[머지] main 을 안 당겼다: …` 가 찍힌다. 그때는 손으로 당긴다.
  추적 안 하는 새 파일(다른 세션이 설치한 스킬 등)은 보지 않는다 — 빨리감기가 건드리지 않는다(2026-10-13 PRD-F9-34)
- **서버 author 컨테이너면 서버 저장소를 바로 당기므로 사람이 할 일이 없다** (2026-09-23). 서버와 맥이 다른 기계면 서버는 pull timer 가 1분마다 받아 와 다시 훑는다 — 「20. 서버와 맥에 나눠 띄우기」 (2026-10-27)
- **admin 을 다른 작업방에서 띄웠으면 그 작업방을 본다** — `docker compose` 는 **저장소 뿌리에서** 띄운다 (2026-09-23, 목록에 새 테스트가 안 뜬 원인이었다)

### 전용 OS 계정 — 사람 계정의 파일과 떼어 놓는다

자식 Claude 는 셸 권한으로 **에이전트를 켠 계정의 파일**을 읽고 쓴다 — 키체인, `~/.ssh`, 다른 저장소, 공유 훅 폴더까지.
에이전트만 도는 **전용 OS 계정**을 두면 사람 계정의 것은 닿지 않는다. **에이전트 계정 안의 것(토큰 파일·작업방)은 여전히 닿는다.**

macOS (약 15분, 관리자 비밀번호가 필요하다):

1. **시스템 설정 → 사용자 및 그룹 → 사용자 추가** — 이름 예 `qa-agent`, 종류 **일반**(관리자 아님)
2. 그 계정으로 로그인해 도구를 깐다 — Node, `git`, `gh`, `claude` (Homebrew 는 사람 계정의 것을 같이 쓰지 말고 이 계정에서 따로)
3. `claude` 에 **구독 계정으로 로그인**한다 — API 키를 넣지 않는다 (위 「거부당하면」의 실비 청구)
4. `gh auth login` — 맥이 PR 을 열고 병합한다. **자식에게는 넘어가지 않는다** (`authoring-chain` 의 `자식환경`)
5. 저장소를 받고 `~/.claude/settings.json` 에 `Bash(*)` 를 허용한 뒤 `npm install` → `npm run authoring-agent` → 토큰을 붙여 넣는다

윈도우는 **설정 → 계정 → 기타 사용자 추가**로 같은 모양을 만든다 (실측 전).

> 사람 계정에서 `sudo -u` 로 띄우는 방식은 쓰지 않는다 — 환경변수·홈 폴더가 섞여 떼어 놓는 뜻이 흐려진다.

> **★ 2026-09-22 — 기획서 경로를 인자로 받던 길을 없앴다.**
> `npm run authoring-agent -- <기획서 경로>` 가 **admin 을 아예 안 불러 로그인을 지나지 않았다.**
> 대기줄이 선 뒤에도 그대로 두면 **「로그인을 안 지나는 작성 경로」가 남는다** —
> 명세가 러너 포트를 닫으며 막은 뒷길과 같은 성질이다 (`docs/spec/도메인/작성.md` §3.6).
> **이제 들어오는 길은 화면뿐이다.**

### 어디까지 자동이고 어디부터 사람인가

```
기획서 → [자동] 요구사항 표 → 케이스 → .spec.ts → 관문 넷 → 초안 PR
                                                              ↓
                                   🛑 [사람] 화면에서 「머지」를 누른다
                                                              ↓
                              [자동] 맥이 초안을 풀고 CI 를 기다렸다 병합
```

**병합을 정하는 것은 사람이다.** 끝나면 초안 PR 을 열어 **요구사항 표를 눈으로 훑고**, 괜찮으면 화면의 **머지** 버튼을 누른다
(운영 `admin` 등급만 보인다). 그다음은 맥이 한다.

- 맥이 초안을 풀고 **CI 가 초록이 될 때까지 기다렸다가** 병합한다. **최대 약 17분** 기다린다
- 케이스 파일만 바뀐 PR 은 CI 가 가벼운 길로 돈다 — 케이스를 실행하지 않고 형식만 본다.
  실행 결과는 맥이 PR 본문에 싣는 **3회 실행 기록**이 근거다 (정본 `docs/HOOKS.md` 「CI 와 병합 차단」)
- **CI 가 빨갛거나 시간 안에 안 끝나면 병합하지 않고 실패로 끝낸다.** 실패 사유에 **CI 실행 주소**가 뜬다 — 눌러서 무엇이 빨간지 본다
- **머지를 다시 누르면 CI 를 다시 돌리고 다시 기다린다.** 외부 사이트가 잠깐 죽었던 것처럼 남의 사정이면 다시 누르면 된다

### 거부당하면 — 아래 표 중 하나다

| 찍히는 말 | 왜 | 어떻게 |
|---|---|---|
| `[거부] 실비 청구로 도는 설정이 있다` | 환경이나 설정에 API 키가 있으면 **구독이 아니라 실비로 청구**된다 (이틀에 $1,800 사례) | 걸린 값을 지운다. 목록은 그 줄에 같이 찍힌다 |
| `[거부] (401) 서버가 거절했다. 에이전트 토큰이 …` | 토큰이 취소·재발급됐거나 계정이 비활성이다 | 화면에서 다시 발급 → 서버 author 는 `.env` 의 `AUTHORING_AGENT_TOKEN` 을 바꿔 다시 띄우고, 맥은 `~/.test-platform/agent-token` 을 지우고 다시 켜 새 값을 넣는다 |
| `[거부] 자식 세션이 셸 명령을 못 돈다` | 케이스를 만드는 자식 세션이 `npx`·검사 명령을 못 돌리면 피그마를 못 읽고 관문도 못 돈다. 한도만 쓰고 멈춘다 | `~/.claude/settings.json` 의 `permissions.allow` 에 `Bash(*)` 를 넣고 다시 켠다 |
| `[거부] AUTHORING_CREDIT_KEY 는 … API 키(sk-ant-…)여야 한다` | 크레딧 칸에 구독 토큰(`sk-ant-oat…`)이나 관리자 키를 넣었다 — 크레딧이 아니라 구독으로 돌거나 요청을 못 보낸다 | 크레딧을 연결한 Console 조직의 API 키로 바꾸거나 칸을 비운다 |

**모두 `claude` 를 부르기 전에 걸린다.** 한도를 태우고 죽지 않는다.

### 전제 둘 (다른 기계에서 쓸 때)

- **`claude` 가 구독 계정으로 로그인돼 있어야 한다.** 이 스크립트는 Claude API 키를 따로 안 갖는다
- **셸 명령이 허용돼 있어야 한다.** 스크립트가 `--permission-mode acceptEdits` 를 걸어
  **파일 쓰기**는 풀지만, **셸은 안 푼다** — `~/.claude/settings.json` 의
  `permissions.allow` 에 **`Bash` 또는 `Bash(*)` 를 정확히** 넣어야 스킬이 검사 명령을 돌릴 수 있다 — `Bash(npx:*)` 같은 부분 허용으로는 켤 때 거부된다. **사용자 설정(`~/.claude/settings*.json`)에 있어야 인정한다.**
  없으면 케이스는 만들어도 **관문을 못 돈다**

> **`--permission-mode` 를 빼면 조용히 망가진다.** 그 깃발이 없으면 파일 쓰기가 자동 거부되는데
> **종료 코드는 0** 이라, 산출물이 하나도 없는데 성공으로 보고된다 (2026-09-21 실측).

### 검사가 도는 자리

이 스크립트의 판단(과금 안전핀·인자 읽기·push 선행 확인·`claude` 인자)은 전부 순수 함수이고
`scripts/authoring-agent.test.ts` 가 고정한다. **`npm test` 가 `scripts/**` 도 본다** —
`vitest.config.ts` 의 `include` 에 그 무늬가 들어 있다. CI 의 단위 테스트 단계(`test:changed` · `test:always`)가
이것을 돌리므로 CI 에 따로 이을 줄은 없다.

---

## 9. 화면 탐침 도구 — **깔 것이 없다**

케이스를 만들려면 **화면의 요소 주소**를 알아야 하는데 기획서에는 그것이 안 적혀 있다.
그래서 작성 에이전트가 **대상 화면을 실제로 열어 읽는다.** 그 도구는 이미 있다.

```bash
npx playwright cli --version    # npm ci 만 돌렸으면 바로 나온다
```

- **따로 설치할 것이 없다.** `package.json` 의 `@playwright/test` 가 `cli` 를 같이 들고 있다
- **★ 전역으로 깔지 마라** (`npm install -g @playwright/cli`). 벤더 안내는 **로컬이 없을 때만**
  전역 설치인데 이 저장소에는 로컬이 있다. 전역에 최신판을 깔면 **탐침이 읽는 화면과
  러너가 실행하는 화면이 다른 Playwright 를 탄다** — 「탐침으로 확정한 locator 가 러너에서
  그대로 돈다」는 이 저장소의 전제가 거기서 깨진다
- `npx playwright cli show` 로 **에이전트가 지금 무슨 화면을 보고 있는지** 실시간으로 볼 수 있다

**설명 문서는 저장소에 들어 있다** — `.claude/skills/playwright-cli/`. 벤더가 낸 것을 그대로 담았다.
**그 폴더를 손으로 고치지 마라** — 다음 번 벤더 설치가 지운다. 우리 쪽 규칙은 아래 자리에 적는다.

**절차의 정본은 `.claude/skills/tpx-cases/references/4-selector.md`(§4) 다.** 여기에 옮겨 적지 않는다 —
특히 **그 절이 「벤더 스킬의 생성 절차는 따르지 않는다」를 못박고 있다.** 같이 담긴
`references/test-generation.md` 가 **기대값을 화면에서 읽어 담으라**고 적는데, 이 저장소는
그것을 금지한다 (화면의 버그가 회귀 세트에 영원히 박힌다).

---

## 10. 내 컴퓨터 러너 켜는 법 (2026-09-30)

실행 창의 **「▶ 테스트 실행」** 은 값을 고치다가 기록을 쌓지 않고 한 번 돌려 보는 버튼이다.
이 버튼은 **내 컴퓨터에서 브라우저 창을 띄우는 러너**(테스트를 실제로 돌리는 프로그램)가 있어야 돈다.
기본은 꺼져 있고, 아래 넷을 하면 켜진다. 규칙과 한계는 SPEC 도메인/실행 §7 「케이스 테스트 실행」이 정본이다.

**먼저 알아 둘 것** — 「내 컴퓨터」는 **관리 서버가 도는 기계와 화면을 보는 내 기계가 같을 때만** 뜻이 맞다.
서버를 따로 둔 회사에서는 창이 서버 기계에 뜨니, 그 경우에는 이 절을 하지 않고 꺼 둔다.
관리 서버가 클라우드에 있고 내 맥을 이어 쓰려면 아래 「admin 이 다른 기계에 있을 때」를 한다(2026-10-27).

1. **러너를 켠다.** 저장소 루트에서 아래를 친다. 창을 닫지 말고 켜 둔다.
   ```bash
   npm run runner:local
   ```
   `127.0.0.1` 의 `4001` 번으로만 열린다 — 러너에는 로그인이 없어서 같은 망의 다른 기계가 부르면 인증을 건너뛰고 테스트를 돌릴 수 있기 때문이다.
2. **`.env` 에 한 줄을 적는다.** 파일에 이미 있으면 값만 바꾼다.
   ```
   LOCAL_RUNNER_URL=http://host.docker.internal:4001
   ```
   `host.docker.internal` 은 컨테이너 안에서 「이 기계 자신」을 가리키는 이름이다. compose 가 이 이름이 통하게 이미 설정해 뒀다.
3. **admin 을 다시 띄운다.**
   ```bash
   docker compose up -d admin
   ```
4. **눌러 본다.** 테스트 스크립트 화면에서 케이스 줄의 ▶ 를 눌러 실행 창을 열고 「▶ 테스트 실행」을 누르면 내 화면에 브라우저 창이 뜨고, 끝나면 그 케이스 줄 오른쪽에 판정이 나온다.
   **확인** — 창이 뜨고 줄 오른쪽에 판정 · 소요 시간이 나오면 정상이다(한 건 창이면 그 아래에 절차마다 판정이 펼쳐진다). 「이 서버에는 테스트 실행이 켜져 있지 않습니다」가 뜨면 2·3번이 안 된 것이다.

**E2E 「시험 실행」도 이 러너가 켜져 있으면 여기서 돈다** (2026-10-17) — 브라우저 창이 뜨고 누르기 · 입력마다 1초씩 쉬어 눈으로 따라갈 수 있다.
러너가 꺼져 있으면 예전처럼 서버에서 창 없이 돈다. 실패 사진은 2026-10-27 부터 따로 안 적어도 보인다 — admin 이 그 러너에서 받아 온다. `.env` 에 `PLATFORM_ARTIFACTS_VOLUME=./artifacts` 를 같이 적으면 받지 않고 바로 읽는다 — Android 와 같은 줄이라 절차도 §15 4번의 1~3 과 같다(옛 볼륨 옮기기 · `docker compose up -d admin runner`).

**Android 앱 케이스의 「▶ 테스트 실행」도 이 러너가 돌린다** (2026-10-07) — Appium · apk · `.env` 두 줄은 §15 「관리 화면에서 테스트 실행」.
기록이 남는 Android 앱 정식 실행은 2026-10-20 부터 이 러너가 아니라 디바이스 팜에서 돈다 — §16.

끄려면 `.env` 의 그 줄을 비우고 3번을 다시 한다.
「▶ 테스트 실행」의 결과는 기록에 남지 않는다 — 통계·증적·알림에도 잡히지 않는다.
컨테이너에서 러너에 안 닿는다는 오류가 나면 1번 러너가 켜져 있는지, 그 주소(`127.0.0.1`)가 컨테이너에서 닿는지부터 본다.
**확인한 범위** — 맥의 Docker Desktop 에서만 컨테이너가 `host.docker.internal` 로 `127.0.0.1` 전용 러너에 닿는 것을 확인했다. 리눅스 Docker 는 이 이름이 브리지 주소로 풀려 `127.0.0.1` 전용 러너에 안 닿을 수 있고 확인하지 않았다 — 리눅스 서버에서 같은 기계의 러너로는 켜지 않는다(위 「먼저 알아 둘 것」과 같은 이유다). 리눅스 서버에 맥을 터널로 잇는 길은 바로 아래다.

### admin 이 다른 기계에 있을 때 — 맥 러너를 터널로 잇는다 (2026-10-27 · OPS-F5-10)

관리 서버(admin)는 클라우드(`qahub.maxihan.com`)에, 창이 뜨는 러너는 내 맥에 두는 배치다. **코드는 그대로고 설정만 바꾼다.**
맥이 SSH 역터널(맥에서 서버로 거는 통로)을 걸고, 서버의 admin 은 그 통로 끝으로 맥 러너를 부른다. 규칙은 SPEC 공통/6-인프라 §9.2 「내 컴퓨터 러너」 · 도메인/러너 §5.2 「러너 토큰 · 파일 내주기」.

**먼저 알아 둘 것 — 창이 뜨는 러너는 맥 계정으로 돈다.** Docker 안에서는 창이 안 떠서 `npm run runner:local` 로 켠다.
그래서 AI 가 쓴 케이스가 맥 계정의 파일(`~/.ssh` 의 서버 키 같은 것)에 닿을 수 있다 — 운영 계획의 「맥 러너는 Docker 로만」과 어긋나는 자리다.
창이 필요 없으면 아래 「정식 실행도 맥에서」처럼 Docker 러너를 쓴다.

**서버에서 한 번** (서버 관리자가 한다)
1. 터널 전용 계정을 만들고 맥의 공개 키를 넣는다.
   ```bash
   sudo useradd -m -s /sbin/nologin qahubtunnel
   sudo install -d -m 700 -o qahubtunnel -g qahubtunnel /home/qahubtunnel/.ssh
   sudo tee /home/qahubtunnel/.ssh/authorized_keys < 맥의_공개키.pub
   sudo chown qahubtunnel: /home/qahubtunnel/.ssh/authorized_keys && sudo chmod 600 /home/qahubtunnel/.ssh/authorized_keys
   ```
2. 그 계정은 터널 끝 하나만 열게 한다. `/etc/ssh/sshd_config.d/qahubtunnel.conf` 에 적는다.
   ```
   Match User qahubtunnel
     AllowTcpForwarding remote
     GatewayPorts clientspecified
     PermitListen 172.17.0.1:14001
     PermitTTY no
     X11Forwarding no
     ClientAliveInterval 15
     ClientAliveCountMax 3
   ```
   `sudo sshd -t && sudo systemctl reload sshd` 로 다시 읽힌다. `172.17.0.1` 은 서버의 Docker 다리 주소다 — `ip -4 addr show docker0` 의 값이 다르면 그 값으로 바꾸고 맥의 `QAHUB_TUNNEL_REMOTE` 도 같이 바꾼다.
   admin 은 컨테이너라 서버의 `127.0.0.1` 에는 못 닿고, 다리 주소는 바깥에서 안 닿는다. **서버의 다른 앱 컨테이너는 닿으므로 3번의 토큰을 꼭 건다.**
   `ClientAlive` 두 줄은 맥이 잠든 뒤 남은 통로 끝을 45초 안에 치운다 — 안 치우면 맥이 깨어나 다시 걸 때 「이미 쓰는 포트」로 실패한다
3. 서버 `.env` 에 두 줄을 적고 admin 을 다시 띄운다. 토큰은 `openssl rand -hex 32` 로 만든다.
   ```
   LOCAL_RUNNER_URL=http://host.docker.internal:14001
   RUNNER_TOKEN=<만든 값>
   ```
   ```bash
   docker compose up -d admin runner
   ```

**맥에서** (쓸 때마다)

4. 저장소를 main 으로 받아 둔다. 이 러너는 맥의 `./tests` 를 돌린다 — 서버와 케이스가 다르면 옛 케이스가 돌거나 「CASE_NOT_FOUND」다.
5. 러너를 켠다. 서버와 같은 토큰을 준다.
   ```bash
   RUNNER_TOKEN=<서버와 같은 값> npm run runner:local
   ```
6. 다른 창에서 터널을 켠다. 러너보다 먼저 켜도 된다 — 러너가 뜨면 건다.
   ```bash
   QAHUB_TUNNEL_HOST=qahubtunnel@101.79.19.193 bash scripts/runner-tunnel.sh
   ```
   「터널 건다 — …」 줄이 뜨면 걸린 것이다. 「토큰이 없다」가 뜨면 5번에 `RUNNER_TOKEN` 을 빠뜨린 것이다 — 토큰 없는 러너는 내보내지 않는다.

**확인** — 서버에서 `docker compose exec admin wget -qO- http://host.docker.internal:14001/health` 가 `{"ok":true,…}` 면 통로가 닿는다.
화면에서 「▶ 테스트 실행」을 누르면 맥 화면에 창이 뜨고, 실패 사진도 보인다(admin 이 맥 러너에서 받아 와 서버에 남긴다).
맥을 덮어 두고 누르면 2초 남짓 만에 「러너에 닿지 못했습니다」로 끝난다. `wget` 이 안 닿으면 서버 방화벽(firewalld)이 Docker 다리에서 오는 연결을 막는지 본다.

**정식 실행도 맥에서 (창 없이)** — 서버가 버거우면 정식 실행 러너도 맥으로 돌릴 수 있다. 창이 필요 없어 Docker 러너를 쓴다.
1. 맥의 compose 에 러너 포트만 맥 안쪽에 연다(맥 전용 덧붙임 파일).
   ```yaml
   services:
     runner:
       ports: ["127.0.0.1:4002:4000"]
   ```
   맥 `.env` 에 서버와 같은 `RUNNER_TOKEN` 을 적고 `docker compose -f docker-compose.yml -f <덧붙임 파일> up -d runner`.
2. 서버 sshd 설정의 `PermitListen` 에 `172.17.0.1:14002` 를 더하고, 맥에서 `QAHUB_RUNNER_PORT=4002 QAHUB_TUNNEL_REMOTE=172.17.0.1:14002 QAHUB_TUNNEL_HOST=… bash scripts/runner-tunnel.sh`.
3. 서버 `.env` 에 `RUNNER_URL=http://host.docker.internal:14002` 를 적고 admin 을 다시 띄운다. 되돌리려면 그 줄을 비운다(옆 `runner` 컨테이너로 돌아간다).

**알아 둘 것**
- 결과 파일은 처음 볼 때 맥에서 받아 와 서버에 남긴다. 맥이 잠든 사이에 처음 여는 사진은 안 보인다 — 깨우면 보인다
- 기기 성능 직접 플레이(내 PC 폰)의 녹화 조각은 측정을 멈출 때 서버가 받아 온다. 길게 녹화했으면 멈추는 데 몇 분 걸린다
- 맥 쪽 `./artifacts` 는 아무도 안 치운다 — admin 은 받아 온 사본을 자기 볼륨에서만 지운다. 맥 디스크가 차면 `./artifacts/runs` 의 오래된 폴더를 손으로 지운다
- 끄려면 서버 `.env` 의 `LOCAL_RUNNER_URL` 을 비우고 admin 을 다시 띄운다. 맥의 두 창은 Ctrl+C

## 11. 클라우드 세션에서 DB 검사 돌리기 (2026-09-30)

DB 검사는 `DATABASE_URL` 이 없으면 **조용히 건너뛴다**(초록으로 보인다). 클라우드 세션(Claude Code on the web)에도 postgres 16 이 깔려 있어 띄우면 돌릴 수 있다.
두 번 죽었다 — ① 데이터 폴더를 세션 임시 폴더(`/tmp/claude-0/…`)에 두면 하네스가 권한을 되돌려 몇 분 뒤 죽는다 ② 도구 셸 아래 `pg_ctl` 로 띄우면 그 셸이 거둬질 때 같이 죽는다(`ECONNREFUSED`).
그래서 **하네스가 안 만지는 폴더**에 두고 **셸에서 떼어**(`setsid nohup`) 띄운다.

```bash
mkdir -p /var/lib/postgresql/tp && chown postgres:postgres /var/lib/postgresql/tp
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/tp/data -U platform --auth=trust"
su postgres -c "setsid nohup /usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/tp/data -p 5434 -k /var/lib/postgresql/tp > /var/lib/postgresql/tp/log 2>&1 &"
psql -h 127.0.0.1 -p 5434 -U platform -d postgres -c "CREATE DATABASE platform"
PGHOST=127.0.0.1 PGPORT=5434 POSTGRES_USER=platform POSTGRES_DB=platform GRAFANA_RO_PASSWORD=grafana_ro bash db/init/01-grafana-readonly.sh   # 마이그레이션보다 먼저 — 마이그레이션이 grafana_ro 에 권한을 준다
# dbmate 는 CI 와 같은 곳에서 받는다 (.github/workflows) — sslmode=disable 을 붙인다
DATABASE_URL="postgres://platform:platform@127.0.0.1:5434/platform?sslmode=disable" dbmate --migrations-dir db/migrations --no-dump-schema up
export DATABASE_URL=postgres://platform:platform@127.0.0.1:5434/platform
```

- 죽었으면(`ECONNREFUSED`) `postmaster.pid` 를 지우고 셋째 줄만 다시 친다 — 데이터는 남아 있다
- 화면 확인용으로 넣은 서비스 · 계정은 **검사 전에 치운다** — 「지금 살아 있는 것」을 훑는 검사가 다른 세상에서 시작한다(apps/admin/CLAUDE.md fixture)
- `pkill -f <무늬>` · `kill $(pgrep -f <무늬>)` 는 쓰지 않는다 — 명령 줄에 그 무늬가 든 자기 셸까지 죽인다(2026-09-30 · 2026-10-01 두 번). `pgrep -af` 로 번호를 보고 `kill <번호>`.
  두 번째 뒤로 `.claude/scripts/guard.mjs` 가 막는다

## 12. 실행 종류를 가른 판 배포하기 — 옛 실행 기록이 지워진다 (2026-10-02 · PR #131)

이 판의 마이그레이션(`20261002000001_run_kind.sql`)은 **옛 `CASE` 실행 기록을 전부 지운다**(사용자 결정 — DEMO · TODO 포함). 되돌려도 돌아오지 않는다.

1. **도는 실행이 없는지 본다** — 실행 기록 화면에 「진행 중」이 없어야 한다. 도는 중에 지우면 러너가 지워진 항목에 결과를 쓰려다 실패한다
2. **admin 을 먼저 멈춘다** — `docker compose stop admin`. 그다음 `docker compose up -d --build` 로 마이그레이션 → 새 admin 이 뜬다(`migrate` 가 끝나야 admin 이 뜬다).
   멈추지 않으면 마이그레이션이 도는 동안 옛 admin 이 남아 지워진 항목에 결과를 쓰려다 오류 한 줄을 남긴다
3. **확인** — 실행 기록이 비어 있으면 정상이다. 케이스를 실행하면 새로 쌓인다

**처음엔 빈 화면이 여럿이다 — 버그가 아니다.** 케이스 목록의 「마지막 결과」 · 판정 흐름 막대 · 케이스 이력 · 케이스 엑셀의 마지막 결과 칸 · Grafana 30일 그래프 ·
종류별 첫 실행의 견주기(비교할 직전 실행이 없다)가 비어 나온다. 실행이 쌓이면 찬다.

**되돌린 뒤 다시 올리지 않는다.** 이 마이그레이션을 되돌리면(`rollback`) 새 UI · 기능 실행이 `CASE` 로 바뀌고, 다시 올리면 **그것까지 지워진다.**
되돌려야 하면 다시 올리기 전에 남길 실행이 없는지 본다.

**디스크 파일은 남는다.** DB 만 지우므로 `artifacts/evidence/<실행 번호>/`(증적 문서)와 `artifacts/` 아래 옛 스크린샷이 주인 없이 남는다.
마이그레이션 **뒤에** 만든 실행은 번호가 더 크다 — 그 전 번호의 폴더는 지워도 된다. 지우기 전에 남길 증적이 있는지 본다.

정해진 시간 실행은 이제 서비스마다 **실행 둘(UI 테스트 · 기능 테스트)** 을 만들고 아침 Slack 도 둘이 온다. 한쪽 종류의 케이스가 없으면 그쪽은 안 만든다.

## 13. 임시 DB 로 DB 검사 돌리기 — 새 마이그레이션은 내 DB 에 먼저 걸지 않는다 (2026-10-06 · PR #161)

**push 때는 pre-push 가 아래를 저절로 한다** (2026-10-09 — `docs/HOOKS.md` 「pre-push」). 손으로 칠 일은 push 전에 미리 돌려 보고 싶을 때뿐이다.

새 마이그레이션이 든 브랜치의 DB 검사를 **평소 쓰는 `platform` DB 에 걸지 않는다.** 걸면 병합 전까지 다른 작업방의 검사(칸을 순서대로 대조하는 `*-columns.test.ts`)가 남의 파일에서 빨개지고,
마이그레이션을 고쳐도 dbmate 는 이미 걸린 번호를 다시 안 돌려 옛 모양이 남는다. 지우는 마이그레이션이면 내 실행 기록이 지워진다(2026-10-02 PR #131).
**같은 postgres 에 임시 DB 를 하나 만들어** 거기에 건다. 고치면 지우고 다시 만든다.

```bash
export PGPASSWORD=platform
psql -h 127.0.0.1 -p 5434 -U platform -d postgres -c 'CREATE DATABASE tp_<이름>'
PGHOST=127.0.0.1 PGPORT=5434 POSTGRES_USER=platform POSTGRES_DB=tp_<이름> GRAFANA_RO_PASSWORD=grafana_ro bash db/init/01-grafana-readonly.sh   # 역할은 서버에 하나라 이미 있으면 만들기만 건너뛰고 권한을 이 DB 에 건다
docker run --rm -v "$PWD/db:/db:ro" ghcr.io/amacneil/dbmate:2 \
  --url "postgres://platform:platform@host.docker.internal:5434/tp_<이름>?sslmode=disable" \
  --migrations-dir /db/migrations --no-dump-schema up            # 호스트에 dbmate 가 없어도 된다
DATABASE_URL=postgres://platform:platform@127.0.0.1:5434/tp_<이름> npx vitest run <폴더들>
```

- 작업방 안에서 돌린다 — `$PWD/db` 가 그 브랜치의 마이그레이션이다
- `host.docker.internal` 은 맥 · 윈도우의 Docker Desktop 에서만 그대로 풀린다. **Linux 도커(서버 · 클라우드 세션)에서는 `docker run` 에 `--add-host=host.docker.internal:host-gateway` 를 붙인다** — 안 붙이면 dbmate 가 `could not translate host name` 으로 실패하고, 마이그레이션이 안 걸린 DB 에서 검사가 돈다
- 되돌리기(`rollback`)는 **임시 DB 에서만** 시험한다. 내 DB 를 되돌리는 것은 CLAUDE.md §5 금지다
- 다 쓰면 `DROP DATABASE tp_<이름>`. 병합 뒤 내 DB 에는 `docker compose run --rm migrate` 로 올린다


## 14. 러너 이미지로 시나리오 한 바퀴 — 고정 spec · kit 불러오기를 고쳤으면 (2026-10-06 · PR #162)

**CI(Node 22 · 저장소 안 경로)는 러너 이미지의 `require` 경로를 재현하지 못한다.** 이미지의 `/tests` 는 `package.json` 이 없어 케이스가 kit · `@playwright/test` 를 `require` 로 부르고,
고정 spec 은 `import` 로 부른다. 둘이 섞여 이미지에서만 죽은 적이 있다(LEARNINGS [WS-C] 2026-09-28). 그래서 `apps/runner/scenario/**` 나 kit 의 시나리오 모드를 고쳤으면
**인터넷 없이 도는 가짜 케이스(`apps/runner/scenario/fixtures/`)와 실측 서버(`e2e-server.ts`)로 이미지에서 한 바퀴 돈다.** PR #100 코멘트에만 있던 명령을 두 번째 쓰임에 옮겼다.

```bash
docker build -f apps/runner/Dockerfile -t tp-runner-check .
docker run --rm --init --name tp-runner-check -p 127.0.0.1:4099:4000 \
  -v "$PWD/apps/runner/scenario/fixtures:/tests:ro" -e PLATFORM_TESTS_DIR=/tests tp-runner-check     # 다른 창에서 둔다
npx tsx apps/runner/scenario/e2e-server.ts 4098 127.0.0.1                                             # 또 다른 창 — 받은 요청을 한 줄씩 찍는다
curl -s -X POST -H 'content-type: application/json' --data @<요청.json> http://127.0.0.1:4099/execute-scenario
```

- 요청은 `apps/runner/scenario/e2e.test.ts` 의 조립과 같게 쓴다 — `baseUrl` 은 `http://host.docker.internal:4098`, 케이스 부품 `filePath` 는 `/tests` 기준 상대 경로(`XSF-004.case.ts`)
- **실측 서버는 글 번호를 812 부터 매긴다.** 글을 만드는 조립을 연달아 보내면 번호가 밀린다 — 조립마다 서버를 다시 띄운다
- 응답 `parts` 의 판정 · `bound` · `cleanup`(절대 주소 · 응답 코드)과 서버가 찍은 순서(미룬 `DELETE` 가 맨 끝 · 로그인한 채)를 브라우저 실측과 견준다
- **Linux 도커(서버 · 클라우드 세션)** — `docker run` 에 `--add-host=host.docker.internal:host-gateway` 를 붙이고, 실측 서버를 `0.0.0.0` 에 연다(`… e2e-server.ts 4098 0.0.0.0`). **리눅스에서는 아직 돌려 보지 않았다** — 2026-10-06 한 바퀴는 맥 Docker Desktop 이다. `host.docker.internal` 이 리눅스에서 안 풀린 일은 §13 에서 겪었고, 127.0.0.1 전용 서버에 컨테이너가 못 닿을 수 있다는 것은 §10 이 적었다
- 다 쓰면 `docker stop tp-runner-check` · 서버 창은 Ctrl+C

## 15. Android 앱 케이스 돌리기 — 맥에 연결한 폰 (2026-10-07 · PR #171)

Android 앱을 조작하는 케이스(`platforms: ['android']`)를 **맥에 USB 로 꽂은 폰**에서 돌리는 법이다.
앱을 조작하는 일은 Appium(앱 화면을 대신 눌러 주는 서버 프로그램)이 맡고, 러너가 그 서버에 붙는다.
연습용 케이스는 `tests/mda/MDA-FN-001.spec.ts` 하나다(Sauce Labs 의 My Demo App 에서 장바구니 담기). 규칙은 SPEC 도메인/러너 §5.2 「앱 실행」이 정본이다.

돌리는 길은 셋이다 — 직접 실행 · 러너 호출 · 관리 화면에서 「▶ 테스트 실행」.
**결과가 실행 기록과 증적에 남는 정식 실행은 디바이스 팜에서 돈다 → §16** (2026-10-20 · 앞 판은 이 맥의 로컬 러너에서 돌렸다).
**같은 맥에 디바이스 팜이 떠 있으면 4723 이 팜이다** — 아래 「돌리기」 1번(Appium 켜기)을 건너뛰고, 팜 화면(`http://127.0.0.1:4723/`)에서 폰을 「쓰기」로 먼저 잡는다. 직접 실행 · 러너 호출의 Appium 주소는 `http://127.0.0.1:4723/wd/hub` 다.

**준비 — 처음 한 번**

1. **adb**(컴퓨터에서 폰을 조종하는 Android 도구)가 있어야 한다. Android Studio 를 깔았다면 `~/Library/Android/sdk/platform-tools` 에 있다. PATH 에 없으면 아래처럼 한 번 더한다.
   ```bash
   export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
   ```
2. **Java** 가 있어야 Appium 이 켜진다. `JAVA_HOME` 이 비어 있으면 Appium 이 시작하지 못한다.
3. **Appium 과 Android 드라이버를 설치한다.** 저장소 부품이 아니라 내 컴퓨터에 까는 것이다. 판을 고정한다 — 실측한 판이다.
   ```bash
   npm i -g appium@3.8.0
   appium driver install uiautomator2@8.7.0
   ```
4. **폰을 준비한다.** 설정에서 개발자 옵션을 켜고 「USB 디버깅」을 켠다. USB 로 맥에 꽂고, 폰에 뜨는 「이 컴퓨터를 허용하시겠습니까」를 허용한다. 화면 잠금은 풀어 둔다.
   처음에는 폰이 「USB로 설치」를 허용할지 묻는다 — 허용한다(Appium 도우미 앱을 폰에 까는 데 쓴다).
5. **확인한다.** 아래를 쳐서 폰 한 줄이 `device` 로 끝나면 정상이다. `unauthorized` 면 폰의 허용 창을 누른다.
   ```bash
   adb devices
   ```
6. **연습용 앱 파일(apk)을 받는다.** GitHub `saucelabs/my-demo-app-rn` 릴리스 v1.3.0 의 `Android-MyDemoAppRN.1.3.0.build-244.apk`(33MB)다. 저장소에 넣지 않고 내 컴퓨터 아무 곳에 둔다. 아래에서 그 경로를 `<apk 경로>` 로 쓴다.

**돌리기**

1. **Appium 을 켠다.** 창 하나를 따로 열어 켜 둔다. 뒤의 옵션은 증적에 앱 판(예: 「앱 1.4.2」)을 적으려고 폰에 앱 판을 묻게 허락하는 것이다 — 빼고 켜도 케이스는 돌고 증적의 앱 판만 「판 모름」이 된다.
   ```bash
   appium --allow-insecure=uiautomator2:adb_shell
   ```
2. **직접 실행** — 저장소 루트에서 친다.
   ```bash
   PLATFORM_APPIUM_URL=http://127.0.0.1:4723 PLATFORM_APP=<apk 경로> npx playwright test tests/mda --project=android
   ```
3. **러너를 거쳐 실행** — 러너를 `PLATFORM_APP` 을 준 채 켜고(`npm run runner:local` 이 `PLATFORM_APPIUM_URL` 은 알아서 싣는다), 다른 창에서 요청을 보낸다.
   ```bash
   PLATFORM_APP=<apk 경로> npm run runner:local
   curl -X POST http://127.0.0.1:4001/execute -H 'Content-Type: application/json' -d '{"runId":999,"historyId":1,"tcId":"MDA-FN-001","platform":"android","filePath":"mda/MDA-FN-001.spec.ts","baseUrl":"http://example.invalid","params":{},"expected":{},"timeoutMs":120000}'
   ```

4. **관리 화면에서 테스트 실행** — 위 3번처럼 러너를 켜 둔다. `PLATFORM_APP` 은 아래 6번처럼 대상 서버 줄에 경로를 적었으면 안 줘도 된다. 그리고 처음 한 번 아래를 한다.
   1. `.env` 에 **두 줄을 한 묶음으로** 적는다. 2026-10-27 부터는 첫 줄만 적어도 admin 이 스크린샷을 러너에서 받아 와 보인다 — 둘째 줄을 같이 적으면 받지 않고 바로 읽는다.
      ```
      LOCAL_RUNNER_URL=http://host.docker.internal:4001
      PLATFORM_ARTIFACTS_VOLUME=./artifacts
      ```
      둘째 줄은 컨테이너의 스크린샷 · 증적 자리를 저장소의 `./artifacts`(로컬 러너가 쓰는 폴더)로 바꾼다. **compose 와 `npm run runner:local` 은 같은 checkout(같은 저장소 폴더)에서 띄운다** — `./artifacts` 가 폴더마다 다르다.
   2. 전에 쓰던 스크린샷 · 증적을 계속 보려면 옛 볼륨의 내용을 한 번 옮긴다(볼륨 이름은 `docker volume ls` 로 본다 — 보통 `<폴더이름>_artifacts`).
      ```bash
      docker run --rm -v <볼륨이름>:/from -v "$PWD/artifacts":/to alpine cp -a /from/. /to/
      ```
   3. `docker compose up -d admin runner` 로 다시 띄운다.
   4. 설정 화면에서 서비스 `MDA` 를 더하고 대상 서버를 하나 둔다(주소는 아무 `http://` 주소 — 앱 케이스는 화면 주소를 안 쓴다). `npm run scan` 이나 화면의 「다시 스캔」으로 `MDA-FN-001` 이 목록에 뜨게 한다.
   5. 케이스 줄의 ▶ 로 실행 창을 열고 「▶ 테스트 실행」을 누른다.
   6. 대상 서버마다 apk 가 다르면 설정 › 서비스 › 대상 서버 줄의 「앱 파일 경로」에 그 apk 경로(Appium 이 도는 PC 기준)나 http(s) 주소를 적는다. 그러면 러너를 켤 때 `PLATFORM_APP` 을 안 줘도 되고, 적은 줄이 러너의 값보다 앞선다. 비운 줄은 러너의 `PLATFORM_APP` 을 쓴다.

**확인** — 직접 실행은 폰 화면에서 앱이 열려 장바구니에 담기고 터미널에 `1 passed` 가 뜨면 정상이다(갤럭시 S21+ · Android 14 에서 12.5초 걸렸다).
러너 호출은 응답에 `"status":"PASS"` 가 있고 둘째 절차에 `screenshotPath: artifacts/runs/999/1/2.png` 가 붙으면 정상이다.
관리 화면 테스트 실행은 케이스 줄 오른쪽에 통과가 뜨면 정상이다.
「이 서버에는 테스트 실행이 켜져 있지 않습니다」가 뜨면 4-1 의 첫 줄과 4-3 이 안 된 것이다.
작성할 때 앱 첫 화면을 받는 길은 2026-10-20 부터 디바이스 팜이다 — §16.

**문제가 생기면**

- 「Android 앱 케이스를 돌리려면 PLATFORM_APPIUM_URL 이 필요하다」 · 「Android 앱 케이스를 돌리려면 PLATFORM_APP 이 필요하다」 같은 환경값 없음 오류는 위 명령 앞의 환경값이 빠진 것이다. 러너를 켰다면 `PLATFORM_APP` 을 준 채로 다시 켠다.
- **폰에 Appium 도우미 앱을 처음 까는 첫 실행은 연결이 느려 제한 시간(앱 케이스 2분)을 넘길 수 있다.** 이 첫 연결은 시간을 못 쟀다. 시간 초과로 끝나면 **한 번 더 돌린다.**
- 폰이 여러 대 꽂혀 있으면 어느 폰인지 `PLATFORM_DEVICE_UDID=<adb devices 에 보이는 번호>` 를 같이 준다.
- 같은 폰에 연결 둘이 겹치면 뒤 것이 앞 것을 가로챈다 — 관리 화면은 Android 항목을 하나씩 세운다. 직접 실행 · 러너 호출을 같이 돌릴 때는 사람이 겹치지 않게 한다.
  러너가 도중에 끊어도(중단 · 제한 시간) 연결은 바로 닫힌다. **연결이 열리는 도중에 끊은 것만** 남을 수 있고, 남으면 약 60초 뒤에 풀린다(실측에서는 안 남았다).
- 관리 화면에서 「디바이스가 다른 실행에 쓰이고 있습니다」가 뜨면 다른 Android 실행이 끝나기를 기다린다.
- **첫 단계가 `~store item` 요소를 못 찾아 실패하면 폰 화면부터 본다** — 알림창이 내려와 있으면 앱 화면을 가려 요소를 못 찾는다(2026-10-07 실측. 실패 스크린샷에 알림창이 찍힌다). 알림창을 올리고 다시 돌린다.
  `adb shell cmd statusbar collapse` 로도 올린다.
- 정기 실행은 디바이스 팜이 있는 서버에서만 Android 앱 케이스를 담는다 — §16.

**끄기** — Appium 창에서 Ctrl+C 를 누른다. 창을 닫아 버렸다면 번호를 보고 끈다. `pkill -f` 는 쓰지 않는다 — 그 무늬가 든 내 셸까지 같이 꺼진다.

```bash
pgrep -af appium
kill <번호>
```

## 16. 디바이스 팜에서 Android 앱 정식 실행 (2026-10-20 · APP-F1-10)

Android 앱 케이스의 「실행」(결과가 실행 기록 · 증적에 남는 것)은 **디바이스 팜**에서 돈다. 팜은 폰 여러 대를 Appium 주소 하나로 내주는 프로그램이고, 사용자의 Devicefarm 저장소다.
관리 서버가 항목마다 팜에서 빈 폰을 잡고, 서버 러너가 그 폰에 붙어 케이스를 돌린 뒤, 관리 서버가 폰을 놓는다. 놓을 때 팜이 그동안 깐 앱을 지운다. 규칙은 SPEC 도메인/러너 §5.2 「디바이스 팜 접속 방식」이 정본이다.

**켜기 — 처음 한 번**

1. **팜을 켠다.** 절차는 팜 저장소 안내서 `~/Projects/Devicefarm/docs/guides/test-platform.md` 2절이다. 켜졌는지 본다.
   ```bash
   curl http://127.0.0.1:4723/wd/hub/status
   ```
   `"ready":true` 면 잡을 수 있는 빈 폰이 있는 것이다.
2. **`.env` 에 한 줄을 적는다.** 같은 맥의 팜이면 이 값이다. 관리 서버(폰 잡기)와 서버 러너(앱 연결)가 같은 값을 쓴다.
   ```
   DEVICE_FARM_URL=http://host.docker.internal:4723/wd/hub
   ```
3. **다시 띄운다.**
   ```bash
   docker compose up -d admin runner
   ```
4. **앱 파일을 알려 준다.** 설정 › 서비스 › 대상 서버 줄의 「앱 파일 경로」에 **팜 PC 의 apk 경로나 http(s) 주소**를 적는다. 앱을 받는 쪽이 팜 PC 다.
5. **앱이 이 맥의 서버(`localhost:3002` 같은)를 부르면 팜을 그 포트로 띄운다** — `DF_REVERSE_PORTS=3002`(여럿이면 쉼표). 폰의 `localhost` 는 폰 자신이라 그냥은 못 닿는다. 팜이 폰이 꽂힌 동안 `adb reverse` 로 맥에 잇는다 — 팜 안내서 같은 파일의 「폰이 이 맥의 대상 서버에 닿게」(Devicefarm INT-F13-12). 안 잇면 앱 작성이 케이스를 쓰기 전에 「앱 서버 — 폰에서 못 닿음」으로 멈춘다(SPEC 도메인/작성 §3.6 「앱 화면」 「서버에 닿는지」)

**돌리기** — 케이스를 골라 실행 창을 열면 「실행 위치 · 디바이스 팜」 한 줄이 보인다. 「실행」을 누른다.

**확인** — 도는 동안 팜 화면(`http://127.0.0.1:4723/`)에서 그 폰이 「테스트 중」이고, 끝나면 실행 결과에 「Android 앱」 칸이 통과로 뜨고 팜 화면의 폰이 다시 빈 폰이면 정상이다.
**작성할 때 앱 첫 화면**도 같은 판이면 받는다 — 작성 에이전트가 AI 를 띄우기 전에 팜 폰에서 앱을 한 번 켜 첫 화면을 받는다. 못 받아도 작성은 가고, 서버 로그에 `앱 화면을 못 읽었다` 한 줄이 남는다.
**작성 AI 가 앱을 눌러 가며 읽기**(로그인 뒤 화면)도 같은 판이면 된다 — AI 가 `appium-cli` 로 빈 폰을 30분 잡고 끝에 놓는다. 그동안 그 폰으로 앱 정식 실행은 「디바이스 팜에 빈 폰이 없습니다」다. AI 가 놓기를 잊으면 에이전트가 작성 끝에 놓고 로그에 `AI 가 잡아 둔 폰 … 을 놓았다` 를 남긴다. 처음 한 번 `docker compose --profile authoring up -d --force-recreate author` 로 작성 컨테이너를 다시 만든다(부품 `appium-cli` · 팜 이름 `host.docker.internal`). 리눅스 서버는 admin 과 같은 한계가 있다(위 「내 컴퓨터 러너」).
**정기 실행**도 팜이 있으면 Android 앱 케이스를 담는다. `DEVICE_FARM_URL` 이 빈 서버는 뺀다.

**문제가 생기면**

- 「이 서버에는 Android 앱을 돌릴 디바이스 팜이 연결되어 있지 않습니다」 — 2 · 3번이 안 된 것이다.
- 항목이 「디바이스 팜에 빈 폰이 없습니다」로 끝나면 팜 화면에서 폰을 누가 잡았는지 본다. 사람이 「쓰기」로 잡은 폰은 건드리지 않는다 — 놓을 때까지 기다린다.
- 「디바이스 팜이 폰을 내주지 않았습니다: …」 뒤의 문장은 팜이 준 거절 사유다. 뜻은 팜 안내서 7절 표에 있다.
- 증적의 앱 판이 「판 모름」이면 먼저 팜이 옛 판인지 본다 — 폰에 앱 판을 묻는 옵션(`adb_shell`)은 팜 저장소가 연다(2026-10-22 결정). 팜 저장소를 받아 팜을 `kill -INT` 로 끈 뒤 다시 켠다. 그래도 그러면 SPEC 러너 §5.2 「앱 실행」 「기기 정보」의 다른 까닭을 본다.
- 「▶ 테스트 실행」은 팜이 아니라 내 컴퓨터 러너다(§10 · §15). 같은 맥이면 팜 화면에서 폰을 「쓰기」로 먼저 잡는다.
  팜이 인증을 켰으면 러너를 `PLATFORM_APPIUM_TOKEN=<폰을 잡은 사람의 Auth_platform 개인 액세스 토큰> npm run runner:local` 로 켠다 — 폰을 잡은 사람과 연결을 여는 토큰이 같아야 팜이 받는다.

**끄기** — `.env` 의 `DEVICE_FARM_URL` 을 비우고 3번을 다시 한다. 팜 자체를 끄는 법은 팜 안내서에 있다 — `kill -9` 로 끄면 잡은 폰의 정리를 건너뛴다.

## 17. 부하 발생 에이전트 켜기 (2026-10-21 · PERF-F1-02)

성능 테스트의 부하는 「부하 발생 에이전트」가 건다. k6 를 담은 컨테이너이고, QA Hub 에 2초마다 할 일을 묻고 1초마다 숫자를 보낸다. QA Hub 로 나가는 연결만 해서 들어오는 포트를 열 필요가 없다. 규칙은 SPEC 도메인/성능 §5.4 가 정본이다.

**기본 에이전트(같은 서버)** — `docker compose up -d` 에 같이 뜬다. 처음에는 토큰이 없어 일하지 않고 떠 있기만 한다.
**서버와 맥에 나눠 띄운 서버에서는 안 뜬다** — 맥에서 띄운다(「20. 서버와 맥에 나눠 띄우기」).

1. 설정 › 성능 에이전트 › 「에이전트 추가」에서 토큰(`pga_…`)을 받는다 (화면은 PERF-F1-05 에서 생긴다)
2. `.env` 에 `PERF_AGENT_TOKEN=pga_…` 를 적는다
3. 다시 띄운다
   ```bash
   docker compose up -d perf-agent
   ```
4. `docker compose logs perf-agent` 에 「토큰이 없습니다」 줄이 더 안 나오면 붙은 것이다. 토큰이 틀리면 「토큰이 거절됐습니다」가 나온다

같은 서버의 기능 테스트와 CPU 를 나눠 쓰므로 가상 사용자는 500명까지만 맡는다(compose `MAX_VUS`). 큰 부하는 아래처럼 다른 기계에 띄운다.

**다른 기계에 띄우기** — 저장소의 `apps/perf-agent` 폴더 하나만 있으면 된다.

```bash
docker build -t qahub-perf-agent apps/perf-agent
docker run -d --init --restart unless-stopped --name qahub-perf-agent \
  -e QAHUB_URL=https://<QA Hub 주소> -e AGENT_TOKEN=pga_… -e MAX_VUS=<이 기계가 맡을 가상 사용자 수> \
  qahub-perf-agent
```

`MAX_VUS` 는 그 에이전트가 처음 붙을 때만 들어간다. 그 뒤에 바꾸려면 설정 › 성능 에이전트에서 「편집」으로 고친다 — 사람이 고친 값이 이긴다(SPEC 도메인/성능 §5.4).

**모니터링 에이전트(대상 서버 위)** — 같은 이미지를 대상 서버(Linux)에 띄우고 발급 때 「모니터링」을 고른다. `--network host` 를 꼭 붙인다 — 안 붙이면 네트워크 숫자가 서버가 아니라 컨테이너 것이 된다.

```bash
docker run -d --init --restart unless-stopped --network host --name qahub-monitor \
  -e QAHUB_URL=https://<QA Hub 주소> -e AGENT_TOKEN=pga_… qahub-perf-agent
```

## 18. DB 비밀번호 바꾸기 (2026-10-23 · FIX-F1-02)

`.env` 의 `POSTGRES_PASSWORD` · `GRAFANA_RO_PASSWORD` 는 **DB 를 처음 만들 때만** 읽힌다. 새 서버는 `.env` 에 적고 띄우면 끝이다.
이미 돌던 서버는 `.env` 만 고치면 admin 이 DB 에 못 붙는다 — DB 안의 비밀번호를 먼저 바꾼다.
2번부터 4번까지는 admin 이 새 연결을 못 만든다. 도는 실행이 없을 때 이어서 한다.

1. 새 값 둘을 만든다
   ```bash
   openssl rand -hex 24
   openssl rand -hex 24
   ```
2. DB 안에서 바꾼다. 컨테이너 안에서는 비밀번호 없이 들어간다. `\password` 가 새 값을 두 번 묻는다 — 명령 줄에 적지 않아 셸 기록에 남지 않는다
   ```bash
   docker compose exec postgres psql -U platform -d platform
   \password platform
   \password grafana_ro
   \q
   ```
3. `.env` 에 같은 값을 적는다 — `POSTGRES_PASSWORD=<첫 번째 값>` · `GRAFANA_RO_PASSWORD=<두 번째 값>`
4. 다시 띄운다
   ```bash
   docker compose up -d
   ```
5. 화면에 로그인해 케이스 목록이 뜨고, `그래프(Grafana) ↗` 대시보드에 숫자가 나오면 둘 다 붙은 것이다

## 19. 더미 클라이언트 자리 옮기기 (2026-10-23 · FIX-F1-03)

성능 더미 클라이언트 zip 은 admin 만 붙이는 `perf_dummy` 볼륨(`/perf-dummy`)에 둔다. 러너가 못 보게 하려고 옮겼다(SPEC 공통/6-인프라 §9 「더미 클라이언트 zip 은 러너가 못 보는 볼륨에 둔다」).
그 전에 올린 zip 은 옛 자리(`/artifacts/perf-dummy`)에 남아 있어, 그대로면 그 더미를 쓰는 성능 실행이 zip 을 못 받아 실패한다. 새 서버나 올린 zip 이 없는 서버는 할 일이 없다.

1. 새 compose 로 다시 띄운다
   ```bash
   docker compose up -d --build admin runner
   ```
2. admin 컨테이너 안에서 한 번 옮긴다. 바로가기는 빼고 일반 파일만 옮긴다 — 옛 자리는 러너가 쓸 수 있던 곳이라, 미덥지 않으면 옮기지 말고 설정 › 성능 에이전트 「더미 클라이언트」에서 지운 뒤 다시 올린다
   ```bash
   docker compose exec admin sh -c 'find /artifacts/perf-dummy -maxdepth 1 -type f -name "*.zip" -exec cp -n {} /perf-dummy/ \;'
   ```
3. 두 자리를 견준다 — `docker compose exec admin ls -l /artifacts/perf-dummy /perf-dummy` 에서 옛 자리의 zip 번호 · 크기가 새 자리에 다 있어야 한다
4. 다 있으면 옛 자리를 지운다. 하나라도 빠졌으면 지우지 말고 2번을 다시 한다
   ```bash
   docker compose exec admin rm -rf /artifacts/perf-dummy
   ```

## 20. 서버와 맥에 나눠 띄우기 (2026-10-27 · OPS-F4-07 · F4-08)

클라우드 서버 한 대에는 늘 떠 있어야 하는 admin · postgres · migrate · grafana · runner 를, 맥에는 작성(author) · 부하(perf-agent)만 둔다. 맥이 꺼져도 화면 · 결과 보기 · 웹 정식 실행은 돈다. 무엇을 왜 그렇게 두는지는 SPEC 공통/6-인프라 §9.2 「서버와 맥에 나눠 띄우기」가 정본이다.

```
브라우저 ──https──▶ 서버 Caddy ──▶ 127.0.0.1:13000 admin ──┬── postgres · grafana
                                                           └── runner ──https──▶ farm.maxihan.com ──▶ 맥의 폰
맥 author · perf-agent ──https──▶ qahub.maxihan.com
맥 author 가 병합 ──▶ GitHub main ──(1분마다 pull timer)──▶ 서버 /opt/qahub ──(60초 뒤)──▶ 목록 다시 훑기
```

아래 명령의 `qahub` 는 맥 `~/.ssh/config` 에 적어 둔 서버 이름이다(`HostName 101.79.19.193` · 서버에 들어가는 계정과 키). **서버를 바꾸는 명령은 사람이 친다.**
**서버의 QA Hub 는 root 한 계정으로 다룬다** — 받기 · pull timer(root 로 돈다) · 배포가 같은 계정이어야 git 이 「detected dubious ownership」으로 멈추지 않고, 남의 계정 소유 파일도 안 생긴다.

### 서버 처음 한 번 (약 20분 — 이미지 빌드가 대부분)

1. 받는다 — 저장소가 공개라 키가 없다
   ```bash
   ssh qahub 'git clone https://github.com/maxihan1/test-platform.git /opt/qahub && cp /opt/qahub/.env.example /opt/qahub/.env'
   ```
2. 서버 `/opt/qahub/.env` 에 아래를 채운다. 비밀값 셋은 서버에서 `openssl rand -hex 32` · `openssl rand -hex 24` 로 새로 만든다 — 맥 값을 옮기지 않는다
   ```
   COMPOSE_FILE=docker-compose.yml:docker-compose.server.yml
   ADMIN_PORT=127.0.0.1:13000
   EXECUTION_CONCURRENCY=1
   SESSION_SECRET=<새 값>
   POSTGRES_PASSWORD=<새 값>
   GRAFANA_RO_PASSWORD=<새 값>
   PLATFORM_PUBLIC_URL=https://qahub.maxihan.com
   DEVICE_FARM_URL=https://farm.maxihan.com/wd/hub
   DEVICE_FARM_TOKEN=pat_<Auth_platform 에서 발급한 개인 액세스 토큰>
   AUTHORING_AGENT_USER=<맥 .env 와 같은 아이디>
   ```
   - **`DEVICE_FARM_TOKEN` 이 없으면 서버 몫으로 도는 Android 앱 · 게임 실행이 미실행이다** — 정기 · 빌드 실행 · 작성, 그리고 계정 메뉴 「디바이스 팜 토큰」을 안 넣은 사람이 누른 실행이다(넣은 사람의 실행은 그 토큰으로 돈다). 이 팜 주소는 인증 켠 팜만 열려 토큰 없는 요청을 401 로 거절한다. admin · runner 가 팜에 가는 모든 요청에 `Authorization: Bearer` 로 싣는다(SPEC 도메인/러너 §5.2 「디바이스 팜 접속 방식」 「팜 토큰은 누른 사람 것이 먼저다」)
   - **토큰은 Auth_platform 에서 발급한다(지금은 `maxi` 계정)** — 팜이 토큰 주인을 Auth_platform 에 묻는다(OPS-F3-05 부터). 러너에서 도는 Android 앱 · 게임 케이스(AI 가 쓴 코드)와 작성 AI 자식 세션이 이 값을 읽을 수 있다.
     새면 팜(폰 잡기 · 놓기 · 앱 설치 · adb 명령)을 그 계정 이름으로 쓸 수 있고, BTS API 도 그 계정 권한으로 열린다(Auth_platform S20 부터 BTS 가 같은 토큰을 받는다 — SPEC 도메인/러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」). 그래서 BTS 권한이 작은 팜 전용 Auth 계정에서 발급하는 쪽이 낫다. 사람이 누른 실행은 그 사람이 계정 메뉴 「디바이스 팜 토큰」에 넣은 토큰이 먼저다. 발급할 때 기간을 길게 고른다 — 끝나면 서버 몫으로 도는 앱 · 게임 실행이 모두 「DEVICE_FARM_TOKEN 을 확인하세요」로 미실행이 된다
   - 이 값은 **서버** `.env` 에 넣는다(root 만 읽는 파일에 평문으로 남는다). 맥에서 넘길 때는 토큰을 맥 `~/.config/farm-pat`(`chmod 600`)에 두고 파일에서 읽어 ssh 표준 입력으로 보낸다 — 대화 · 명령줄에 값이 안 남게.
     맥 author 도 같은 값이 필요하다 — 아래 「맥 정리」 1번
   - `COMPOSE_FILE` 이 서버용 덧붙임 파일을 늘 같이 읽게 한다 — 서버에서 그냥 `docker compose up -d` 를 쳐도 perf-agent 가 안 뜨고 CPU · 메모리 상한이 걸린다
   - **`ADMIN_PORT` 앞의 `127.0.0.1` 을 빼지 않는다** — 빼면 Docker 가 서버 방화벽(firewalld)을 건너뛰고 13000 을 바깥에 연다. 바깥에서는 Caddy(https)로만 들어온다
   - 작성 토큰 셋(`AUTHORING_AGENT_TOKEN` · `CLAUDE_CODE_OAUTH_TOKEN` · `GH_TOKEN`) · `PERF_AGENT_TOKEN` 은 서버에 두지 않는다 — author · perf-agent 는 맥에 뜬다
   - `LOCAL_RUNNER_URL` 은 처음에 비워 둔다 — 서버 admin 은 맥의 「내 컴퓨터 러너」에 바로 못 닿는다. 그동안 그 러너를 부르는 일(케이스 「테스트 실행」 · 기기 성능 직접 플레이의 내 PC 폰 측정 · E2E 시험 실행의 브라우저 창)이 꺼진다.
     켜려면 맥 러너를 터널로 잇고 `LOCAL_RUNNER_URL` · `RUNNER_TOKEN` 을 적는다 — 「10. 내 컴퓨터 러너 켜는 법」 「admin 이 다른 기계에 있을 때」
   - 세션 키가 새것이라 옮긴 뒤 모두 한 번 다시 로그인한다. 작성 · 성능 에이전트 토큰은 DB 에 있어 옮긴 그대로 쓴다
3. 이미지를 만든다 — 맥은 arm64 라 맥에서 만든 이미지는 서버(x86_64)에서 안 돈다. 사람이 적은 시간에 한다
   ```bash
   ssh qahub 'cd /opt/qahub && docker compose build'
   ```
4. 맥 데이터를 옮긴다 — 아래 「데이터 옮기기」. 새로 시작하는 서버면 건너뛰고 `ssh qahub 'cd /opt/qahub && docker compose up -d'`
5. pull timer 를 건다 — 맥이 병합한 케이스를 1분마다 받아 오고, 마지막으로 훑은 커밋과 다르면 60초 뒤 목록을 다시 훑는다. `infra/server/qahub-pull.service` · `.timer` 가 바뀐 병합 뒤에는 아래 첫 줄을 다시 친다(복사본이라 저절로 안 바뀐다)
   ```bash
   ssh qahub 'cp /opt/qahub/infra/server/qahub-pull.service /opt/qahub/infra/server/qahub-pull.timer /etc/systemd/system/ && systemctl daemon-reload && systemctl enable --now qahub-pull.timer'
   ssh qahub 'systemctl list-timers qahub-pull.timer'   # 다음 실행 시각이 1분 안이면 걸린 것이다
   ```
   받은 기록은 `ssh qahub 'journalctl -u qahub-pull.service -n 20'` 로 본다. 새 커밋을 훑은 줄 끝에 `[scan] 다시 훑었다` 가 찍힌다.
   훑기가 통째로 깨졌거나(admin 이 꺼져 있었다 등) 받기 · 기다리기 · 훑기가 합쳐 10분 안에 안 끝나면 실패로 남고 다음 1분에 다시 한다.
   읽지 못한 파일 · 겹친 번호 같은 경고는 이 기록에만 남는다 — 화면의 「다시 스캔」 옆 시각과 경고는 admin 이 직접 훑은 것이다.
   훑기가 60초를 넘기는 큰 애플리케이션은 새 케이스가 비활성으로 남을 수 있다 — 그때는 화면의 「다시 스캔」을 누른다
6. 확인 — `https://qahub.maxihan.com` 에 로그인 → 케이스 목록이 뜨고 → 지난 실행을 열어 스크린샷이 보이고 → 웹 정식 실행 1건 · Android 앱 정식 실행 1건이 끝까지 돈다

### 데이터 옮기기 — 맥 → 서버 (한 번, 약 30분)

**맥 QA Hub 에 도는 실행 · 작성이 없을 때 한다.** 맥 디스크가 거의 차 있어 파일로 떨구지 않고 ssh 로 바로 흘려 보낸다.

- [ ] 맥의 admin · author · perf-agent 를 멈춘다 — 옮기는 동안 맥 DB 에 새 기록이 쌓이면 서버에 안 간다. postgres 는 켜 둔다
  ```bash
  docker compose -p test_platform stop admin author perf-agent
  ```
- [ ] 서버에 빈 DB 를 띄운다 — `db/init` 이 Grafana 읽기 전용 계정까지 만든다. 마이그레이션은 아직 안 돈다
  ```bash
  ssh qahub 'cd /opt/qahub && docker compose up -d --wait postgres'
  ```
- [ ] DB 를 옮긴다 — 맥에서 뽑아 서버에서 바로 넣는다
  ```bash
  docker exec test_platform-postgres-1 pg_dump -U platform -d platform -Fc \
    | ssh qahub 'cd /opt/qahub && docker compose exec -T postgres pg_restore -U platform -d platform --no-owner --exit-on-error'
  ```
  오류로 멈추면 그 줄을 읽고 서버의 빈 DB 를 지운 뒤(`ssh qahub 'cd /opt/qahub && docker compose down -v'` — 서버 QA Hub 의 볼륨만 지운다. 옮기기 전이라 잃을 것이 없다) 위 칸부터 다시 한다
- [ ] 스크린샷 · 증적 문서(`artifacts` 볼륨)와 더미 클라이언트 zip(`perf_dummy` 볼륨)을 옮긴다 — 맥은 이미 있는 `postgres:16` 이미지로 묶고, 서버는 admin 이미지로 같은 자리에 푼다
  ```bash
  docker run --rm -v test_platform_artifacts:/v:ro postgres:16 tar czf - -C /v . \
    | ssh qahub 'cd /opt/qahub && docker compose run --rm --no-deps -T --entrypoint tar admin xzf - -C /artifacts'
  docker run --rm -v test_platform_perf_dummy:/v:ro postgres:16 tar czf - -C /v . \
    | ssh qahub 'cd /opt/qahub && docker compose run --rm --no-deps -T --entrypoint tar admin xzf - -C /perf-dummy'
  ```
- [ ] 서버를 다 띄운다 — 맥 DB 보다 새 마이그레이션이 있으면 migrate 가 건다. admin 이 뜨면서 목록을 한 번 훑는다
  ```bash
  ssh qahub 'cd /opt/qahub && docker compose up -d'
  ```
- [ ] 대상 서버 주소를 새 도메인으로 바꾼다 — 화면(설정 › 애플리케이션 › 대상 서버)에서 하나씩 바꿔도 같다. **첫 실행 전에 한다** — `service_api` 는 실행이 배운 API 지도라 새 주소로 실행이 돌면 새 줄이 따로 생긴다
  ```bash
  ssh qahub 'cd /opt/qahub && docker compose exec -T postgres psql -U platform -d platform -v ON_ERROR_STOP=1' <<'SQL'
  BEGIN;
  UPDATE service_env SET base_url = 'https://demo.maxihan.com' WHERE base_url = 'http://demo:3002';
  UPDATE service_env SET base_url = 'https://game.maxihan.com' WHERE base_url = 'http://192.168.1.14:8080';
  UPDATE service_api SET host = 'demo.maxihan.com' WHERE host = 'demo:3002';
  UPDATE service_api SET host = 'game.maxihan.com' WHERE host = '192.168.1.14:8080';
  COMMIT;
  SELECT s.prefix, e.env, e.base_url FROM service_env e JOIN service s ON s.id = e.service_id ORDER BY 1, 2;
  SQL
  ```
  - 옛 주소 둘은 2026-10-27 맥 DB 의 값이다 — 데모마켓(웹 · 운영툴 · Android 앱 `DM*` · `MK*`)은 `http://demo:3002`, Ashveil(`ASH`)은 맥 LAN 주소였다. 다른 주소가 더 있으면 마지막 SELECT 에 남는다 — 같은 꼴로 바꾼다
  - 알림 서버(`https://demo-notify.maxihan.com`)는 맥 DB 에 주소가 없다. API 애플리케이션으로 붙일 때 이 주소를 넣는다
  - 설정 › 프로젝트의 API 서버 이름(`project_api_server`)은 2026-10-27 맥 DB 에 없다. 있으면 새 주소로 다시 단다
  - 지난 실행의 주소(`test_run.base_url`)는 「그때 친 주소」라 안 바꾼다
- [ ] 위 「서버 처음 한 번」 5번(pull timer) · 6번(확인)으로 간다

### 배포 — 맥에서 한 줄

플랫폼 코드(`apps/` · `packages/` · `db/` · `docker-compose*.yml`)가 바뀐 병합만 배포한다. 케이스만 바뀐 병합은 pull timer 가 받는다.

```bash
ssh qahub 'cd /opt/qahub && git pull --ff-only origin main && docker compose up -d --build'
```

이미지를 서버에서 만들어 몇 분 걸린다. 도는 실행은 끊긴다 — admin 이 다시 뜨며 `ABORTED` 로 닫는다(SPEC 공통/6-인프라 §9.2 「배포 절차」).

### 맥 정리 — author · perf-agent 와 pre-push postgres 만 (OPS-F4-08, 약 1시간)

서버가 위 6번 확인을 통과한 뒤에 한다.

1. 맥 `.env` 를 고친다 — `PLATFORM_PUBLIC_URL=https://qahub.maxihan.com`(맥 author · perf-agent 가 붙을 주소. 맥용 덧붙임 파일이 이 칸을 읽는다) · `PERF_AGENT_TOKEN=pga_…`(설정 › 성능 에이전트에서 발급한 값 — 옮긴 DB 에 맥 에이전트가 없으면 「에이전트 추가」에서 역할 「부하 발생」으로 새로 만든다. 「복사」는 설치 명령 통째라 그 안의 `pga_…` 만 옮기고 설치 명령은 돌리지 않는다 — 아래 3번의 perf-agent 가 대신 붙는다) · `DEVICE_FARM_TOKEN=<서버와 같은 값>`(작성 AI 가 서버가 넘겨준 팜 주소로 폰을 잡고 누른다 — 없으면 앱 「눌러 가며 읽기」가 401 이다). 작성 토큰 셋은 그대로 둔다
2. 맥 QA Hub 를 내린다 — 컨테이너만 지우고 볼륨은 남긴다. **postgres 는 남긴다** — 맥 pre-push 가 그 안에 임시 DB 를 만들어서(아래 「맥 pre-push 는 맥 postgres 를 쓴다」) `down` 하면 서버 · DB 코드 push 가 「개발 DB 에 못 붙었다」로 막힌다. `--profile authoring` 을 빼면 author 컨테이너가 남는다
   ```bash
   docker compose -p test_platform --profile authoring rm -sf admin runner grafana migrate author perf-agent
   ```
3. author · perf-agent 만 띄운다 — admin 은 클라우드에 있어 맥에 같이 뜨지 않는다. 맥용 덧붙임 파일의 `!reset` 은 Docker Compose 2.24.4 부터 읽는다(`docker compose version` — 낮으면 Docker Desktop 을 올린다)
   ```bash
   docker compose -p test_platform -f docker-compose.yml -f docker-compose.mac.yml --profile authoring up -d --build author perf-agent
   docker compose -p test_platform logs -f author   # [작성] … 로 붙었다 가 뜨면 된 것이다
   ```
   author 는 맥에서 한 번에 한 건(`AUTHORING_MAX_PARALLEL=1` · 메모리 4g)만 돈다 — 맥용 덧붙임 파일이 정한다.
   **npm 작성 에이전트(`npm run authoring-agent`)는 쓰지 않는다** — 자식 셸이 맥 계정의 파일(운영 서버 ssh 키 포함)에 닿는다. 컨테이너는 `~/.ssh` 를 못 본다
4. 작성 계정의 비밀번호 로그인을 막는다 — 3번에서 author 가 붙은 걸 본 뒤에 한다. 작성 토큰은 비밀번호를 안 봐서 그대로 붙고, 로그인 화면만 거절한다(`apps/admin/src/auth/identify.ts` · `routes.ts`). 되살릴 때는 admin 이 설정 › 계정에서 비밀번호를 새로 준다
   ```bash
   ssh qahub 'cd /opt/qahub && docker compose exec -T postgres psql -U platform -d platform -v ON_ERROR_STOP=1' <<'SQL'
   UPDATE app_user SET password_hash = NULL WHERE username = 'mac' AND agent_token_hash IS NOT NULL RETURNING username;
   SQL
   ```
   `UPDATE 1` 과 `mac` 한 줄이 찍혀야 한다. `UPDATE 0` 이면 그 이름에 토큰이 없다는 뜻이라 아무것도 안 바뀌었다 — 설정 › 계정 › 작성 계정에서 토큰을 먼저 발급한다.
   `mac` 은 이 설치의 `AUTHORING_AGENT_USER` 다. 다르면 그 이름으로 바꾼다
5. 확인 — 화면에서 작성 1건을 넣고 병합 → 2분쯤 뒤 `https://qahub.maxihan.com` 목록에 새 케이스가 뜬다 · 설정 › 성능 에이전트에 맥 에이전트가 붙어 있다
6. 서버에서 며칠 써 본 뒤 맥에서 옛 볼륨 · 이미지를 지운다 — **되돌릴 수 없다.** 서버 확인 전에는 지우지 않는다
   ```bash
   docker volume rm test_platform_perf_dummy
   docker image rm test_platform-admin test_platform-runner grafana/grafana:13.2.2
   ```
   **`test_platform_artifacts`(스크린샷 · 증적)는 서버 백업이 산출물을 담을 때까지 남긴다** — 서버 백업(`ops-backup.sh`)은 DB 만 떠서 맥 볼륨이 산출물의 유일한 사본이다(OPS-F5-11).
   **`test_platform_pgdata` 는 남긴다** — 맥 pre-push 가 쓰는 postgres 의 볼륨이다. 옛 QA Hub 기록을 비울지는 사용자와 따로 정한다(볼륨을 지우면 다음 `up -d postgres` 가 빈 DB 로 새로 만든다).
   남기는 것 — `author_node_modules` · `author_work` 볼륨(작성), `postgres:16` · `ghcr.io/amacneil/dbmate:2` 이미지(pre-push)
7. Docker Desktop 메모리(Settings › Resources)는 기본 5.8GB 그대로 둔다 — author 한 건(4g)이 들어가고, 작성과 부하 테스트를 같이 돌리지 않는다. 같이 돌리거나 메모리가 모자라 꺼지면 올린다(2026-10-27 사용자). 올리면 Docker 가 다시 켜지며 떠 있던 컨테이너가 잠깐 멈춘다

**맥 pre-push 는 맥 postgres 를 쓴다** — 서버 · DB 코드를 push 할 때 맥 `.env` 의 `POSTGRES_PORT`(비면 5434)에 임시 DB 를 만든다(`docs/HOOKS.md`). 그래서 위 2번에서 postgres 는 내리지 않는다. 꺼져 있으면 덧붙임 파일 없이 다시 띄운다
```bash
docker compose -p test_platform up -d postgres
```

### 맥 postgres 를 5434 로 옮기기 (2026-10-27, 한 번 · 약 2분)

5433 은 맥의 BTS 개발 DB(`bts-postgres-dev`)가 쓴다. BTS 배포 검사(`./gradlew test`)가 거기에 붙는데, QA Hub postgres 가 5433 을 잡고 있으면 BTS 배포가 막힌다. 그래서 QA Hub 쪽이 5434 로 비킨다.
컨테이너 안 5432 와 데이터(볼륨)는 그대로다. 서버는 손대지 않는다 — 옛 `.env.example` 을 복사한 서버 `.env` 에는 `POSTGRES_PORT=5433` 줄이 있어 그대로 5433 에 뜬다. 그 줄이 없는 서버는 다음 배포부터 5434 에 뜨지만, admin · grafana 는 컨테이너 망 안의 5432 로 붙어 상관없다.
**이 판이 병합되고 루트를 pull 한 뒤에 한다** — 루트의 pre-push 가 push 마다 돌아서, 병합 전에 옮기면 옛 훅이 5433 을 찾다가 서버 · DB 코드 push 를 막는다.

1. 맥 `.env` 의 `POSTGRES_PORT=5433` 줄을 `POSTGRES_PORT=5434` 로 고친다 — `.env.example` 을 복사한 맥에는 이 줄이 있고, 남아 있으면 compose 가 계속 5433 에 띄운다
2. postgres 만 새 포트로 다시 만든다 — 데이터는 볼륨에 남는다. 맥에 admin · grafana 가 아직 떠 있어도 컨테이너 망 안의 5432 로 붙어 손대지 않는다
   ```bash
   docker compose -p test_platform up -d postgres
   ```
3. 확인 — `docker ps --format '{{.Names}} {{.Ports}}' | grep postgres` 에 `test_platform-postgres-1 127.0.0.1:5434->5432/tcp` 가 보이면 된 것이다. 이제 BTS 개발 DB 를 5433 에 띄워도 안 부딪힌다

- pre-push 는 compose 와 같은 맥 `.env` 의 `POSTGRES_PORT` 를 읽어서 1 · 2 를 하면 같이 옮겨 간다. 「개발 DB(127.0.0.1:…)에 못 붙었다」로 막히면 찍힌 포트와 `docker ps` 의 postgres 포트가 같은지 본다
- DB 도구나 셸에 `localhost:5433/platform` 을 적어 둔 곳이 있으면 5434 로 바꾼다
