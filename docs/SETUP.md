# SETUP.md — 시작 전 세팅

> 내일 Claude Code에 던지기 전에 이 순서대로 한 번만 하면 된다.
> 소요: 20~30분.

---

## 1. 폴더 구조

```
test-platform/                      ← 프로젝트 루트 (이름은 자유)
├── CLAUDE.md                       ★ 루트에 둔다. Claude Code가 자동으로 읽는다
├── .gitignore
├── .github/workflows/ci.yml        ★ GitHub Actions. 타입 검사 · 단위 테스트 · 테스트 코드 규칙 검사
├── .claude/
│   ├── settings.json               ★ 훅 설정. 커밋한다
│   ├── scripts/
│   │   └── guard.mjs               ★ 훅 검사 스크립트
│   └── skills/
│       └── spec-review/
│           └── SKILL.md            ★ SPEC 검사 스킬
└── docs/
    ├── SPEC.md                     ★ 무엇을 만드는가
    ├── WORKFLOW.md                 ★ 어느 단계인가
    ├── WORKSTREAMS.md              ★ 누가 어느 폴더를 맡는가
    ├── DESIGN.md                   ★ 화면 기준
    ├── design-mockup.html          ★ 화면 목업
    ├── HOOKS.md                    ★ 훅 설명
    ├── LEARNINGS.md                ★ 세션 간 학습 기록 (비어 있는 상태로 시작)
    ├── progress/                   ← 빈 폴더. 세션이 채운다
    └── reviews/                    ← 빈 폴더. 검사 결과가 쌓인다
```

`apps/`, `packages/`, `db/`, `tests/`, `infra/`는 **만들지 마라.**
Phase 0에서 Claude Code가 만든다. 미리 만들면 빈 폴더 때문에 구조를 잘못 잡는다.

---

## 2. 명령

```bash
mkdir -p test-platform && cd test-platform
git init

mkdir -p .claude/scripts .claude/skills/spec-review
mkdir -p docs/progress docs/reviews

# 받은 파일들을 위 구조대로 옮긴다
#   CLAUDE.md          → ./CLAUDE.md
#   settings.json      → .claude/settings.json
#   guard.mjs          → .claude/scripts/guard.mjs
#   SKILL.md           → .claude/skills/spec-review/SKILL.md
#   나머지 .md와 html  → docs/

# git이 빈 폴더를 추적하지 않으므로
touch docs/progress/.gitkeep docs/reviews/.gitkeep

cat > .gitignore <<'EOF'
node_modules/
dist/
.env
artifacts/
playwright-report/
test-results/
EOF

# pre-push 훅
cp <받은 pre-push 파일> .git/hooks/pre-push
chmod +x .git/hooks/pre-push

git add -A && git commit -m "프로젝트 문서와 규칙 설정"
git tag g0-docs

# GitHub에 private 저장소를 만든 뒤
git remote add origin git@github.com:<계정>/test-platform.git
git push -u origin main
```

`.git/hooks/`는 커밋되지 않는다. 다른 데서 클론하면 다시 복사해야 한다.

첫 푸시부터 CI(`.github/workflows/ci.yml`)가 돈다. 골격이 생기기 전에는 "검사할 코드가 없다"로 통과한다.
무료 플랜의 private 저장소는 서버 쪽 브랜치 보호를 걸 수 없다. CI 초록불 확인은 사람이 한다.

---

## 3. 설치 확인

```bash
echo '{"tool_input":{"file_path":"packages/kit/src/types.ts"}}' \
  | node .claude/scripts/guard.mjs protected; echo "exit=$?"
```

`exit=2`와 차단 메시지가 나오면 정상이다.

```bash
echo '{"tool_input":{"command":"git push --force"}}' \
  | node .claude/scripts/guard.mjs bash; echo "exit=$?"
```

이것도 `exit=2`면 정상이다.

---

## 4. 문서 읽는 순서

Claude Code에 던지기 전에 Maxi님이 직접 읽으실 순서다. 리뷰 관점을 같이 적었다.

| 순서 | 파일 | 볼 것 |
|------|------|------|
| 1 | `WORKFLOW.md` | 전체 흐름이 납득되는가. 체크포인트 5개가 할 만한가 |
| 2 | `SPEC.md` §1~4 | 만들려는 게 맞는가. 특히 §4 명세 선언 방식 |
| 3 | `design-mockup.html` | 브라우저로 열어본다. 화면이 원하는 모양인가 |
| 4 | `SPEC.md` §8 | 화면 구성이 목업과 맞는가 |
| 5 | `WORKSTREAMS.md` | 갈래 나눔이 이해되는가. 킥오프 프롬프트가 읽히는가 |
| 6 | `CLAUDE.md` | 규칙 중 거슬리는 게 있는가 |

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

[0] 계획 검토는 2026-09-16에 끝났다 (`docs/reviews/2026-09-16-G0.md`).
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
경위는 `docs/reviews/2026-09-16-G0.md`에 있다.

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

> 2026-09-18 계약 반영으로 **설정값과 컨테이너 쪽은 들어왔다.**
> 계정·서비스를 만드는 명령(`scripts/`)은 아직이다 — WS-F가 만든다.

### 설정값 (`.env`) — **띄우기 전에 만든다**

`.env.example`을 `.env`로 복사해 값을 채운다. `.env`는 저장소에 올라가지 않는다.

```
cp .env.example .env
# SESSION_SECRET 에 아무 긴 무작위 문자열을 넣는다
openssl rand -hex 32
```

| 이름 | 무엇 |
|------|------|
| `SESSION_SECRET` | 로그인 세션을 서명하는 키. **비우면 admin이 기동을 거부한다.** 임시 키를 지어내면 재기동할 때마다 전원 로그아웃되고, 그 사실을 아무도 모른 채 「가끔 로그인이 풀린다」로 겪는다 |
| `ADMIN_PORT` · `GRAFANA_PORT` · `POSTGRES_PORT` | 바깥 포트. 비우면 `3000`·`3001`·`5433`으로 뜬다. 한 서버에 다른 것과 같이 띄울 때만 바꾼다 |

**2026-09-17에 넷이 이 표에서 빠졌다.** `PLATFORM_INSTANCE_NAME`·`_COLOR`·`PLATFORM_TESTS_REPO`·`PLATFORM_ENV_URLS`.
서비스 이름·색·저장소·대상 서버 주소는 설정 파일이 아니라 **화면에서 정하고 DB에 들어간다** (SPEC §8.8 · §6).

### 달라진 것 · 달라질 것

- **러너 포트가 닫혔다** (2026-09-18 반영). 전에는 `localhost:4000`을 직접 찔러 `/health`를 볼 수 있었지만
  개정 §3.5가 "러너를 바깥에 열지 않는다"고 못 박았다. 로그인을 건너뛰는 뒷길이기 때문이다.
  이제는 컨테이너 안에서 본다 — `docker compose exec runner wget -qO- localhost:4000/health`
- **화면이 admin 포트로 뜬다** (2026-09-18 반영). 전에는 이미지 안에 화면 빌드 단계가 없어
  컨테이너가 API만 냈다. 이제 `http://localhost:3000` 이 화면이다
- **첫 계정과 첫 서비스를 만들어야 화면이 열린다.** 회원가입 화면은 없다. **아직 안 들어왔다 — WS-F가 만든다.**

  ```
  docker compose exec admin node scripts/add-user.js <아이디> <이름> admin
  docker compose exec admin node scripts/add-service.js <접두사> <서비스 이름>
  ```

  비밀번호는 이 명령이 무작위로 만들어 **한 번만** 찍는다.
  **두 번째부터는 명령을 쓰지 않는다** — 로그인해서 `설정` 자리에서 만든다
- **서비스를 여러 개 담는다.** 한 벌에 여러 서비스를 두고 맨 위 띠에서 오간다.
  컨테이너를 서비스마다 따로 띄우지 않는다 (2026-09-17 결정. 앞 판은 그 반대였다)
- **정기 실행은 HTTP를 거치지 않는다.**
  `docker compose exec admin node scripts/run-scheduled.js <접두사>` 를 `cron`에 건다
