# WS-F 인증 — 진행 기록

## 2026-09-18

`contracts` · `WS-A` · `WS-B` 를 끝낸 세션이 이어서 돌렸다. 브랜치는 `contracts`.

### 완료 — 킥오프 네 가지 전부

| 무엇 | 어디 |
|------|------|
| 확인 함수 하나 (§3.5) | `apps/admin/src/auth/identify.ts` 의 `확인(req)` |
| 로그인·로그아웃·나 (§7 Auth) | `apps/admin/src/auth/routes.ts` |
| 인증 미들웨어 — 로그인·등급·서비스 (§7) | `apps/admin/src/auth/gate.ts` |
| 명령 셋 (§9.2) | `scripts/add-user.ts` · `add-service.ts` · `run-scheduled.ts` |
| 설정 API (§7 · §8.8) | `apps/admin/src/settings/routes.ts` · `store.ts` |

곁들여 나온 것 둘 — `app.ts` 에 문을 등록했고(계약 반영 단위가 열어 두기로 한 자리가 비어 있었다),
실행 검사 둘이 부딪히던 fixture 충돌을 고쳤다 (`XBQ` → `XBR`).

### 다음 세션이 알아야 할 것

**1. 갈아 끼울 자리는 `auth/identify.ts` 하나다.**
SSO 로 바꾸면 이 파일만 바뀐다. 그래서 `확인()` 은 `FastifyRequest` 를 통째로 받지 않고
`{ session: { get('username') } }` 모양만 받는다. 무엇을 대신 채워야 하는지가 한눈에 보이게 하려는 것이다.

**2. 문을 지난 사람은 `req.user` 로 실린다.**
`{ username, displayName, role, services }` 다. 타입은 `auth/gate.ts` 가 전역에 실어 두므로
다른 갈래는 import 없이 읽는다. **비밀번호도 세션도 다른 갈래에 가지 않는다** (§3.5).

**3. 실행자 귀속이 아직 안 닫혔다 — 이것이 남은 치명 하나다.**
`POST /api/runs` 가 `triggeredBy` 를 **요청 본문에서** 받고 `triggered_by_name` 을 쓰지 않는다.
그래서 지금 만드는 모든 실행이 화면과 증적에서 `실행자 미상 (인증 도입 이전)` 으로 나온다.
고칠 곳은 **WS-B** 이고 세 줄이다 — 자세한 것은 `docs/reviews/2026-09-18-WS-F.md` 의 치명 항목.

**4. 서비스 경계는 `?service=` 와 실행 요청까지만 막는다.**
`GET /api/runs/:runId` 처럼 번호만 들고 오는 요청은 문이 어느 서비스 것인지 모른다.
병합 단계에서 각 갈래가 자기 조회에 `req.user.services` 를 한 줄 거는 것이 맞다.

**5. WS-E 가 이어받을 것** — 로그인 화면(§8.6)과 설정 화면(§8.8).
API 는 다 섰다. 화면이 `GET /api/auth/me` 로 시작해 401 이면 로그인 화면으로 보내면 된다.
등급이 모자란 자리는 **흐리게가 아니라 아예 안 보이게** 한다 (§3.5).

**6. 검사용 fixture 접두사** — `xfu1`~`xfu4`(계정) · `XFS1`~`XFS4`(서비스). 파일마다 갈랐다.

### 확인한 것

- 전체 301건이 **연속 6회** 통과 (`DATABASE_URL` 을 붙이고)
- `npm run typecheck` · `check:tests` · `check:spec` 전부 통과
- 앱을 실제로 띄워 `/api/**` 다섯 자리가 401, `/health` 와 로그인만 열리는 것을 확인
- 명령 셋을 실제 DB 에 돌려 봄. 정기 실행이 실행 1건을 만들어 끝냈고
  `test_run` 에 서비스 이름·대상 주소가 박제되고 `notify_slack` 이 켜졌다 (검사 행은 치웠다)
