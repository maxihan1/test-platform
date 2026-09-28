# 검사 기록 — WS-F 인증·권한 개편 ④ Grafana (PR #96)

2026-09-28 · 선언 3등급 / 실측 3등급 · 차선 full · 렌즈 셋(독립 작업자) · 검사용 DB `platform_wsf` · 브라우저 확인은 `platform_wsf3` + 따로 띄운 Grafana 13.2.2(명세 GF_* 11개 그대로)

## 판정

| 렌즈 | 1회차 | 반영 뒤 |
|---|---|---|
| spec-review (A~H) | 치명 0 · 주의 6 | 넷 고침 · 둘은 아래 「계획과 달라진 자리」 |
| /code-review | BLOCKER 0 · 주의 3 | 둘 고침 · 하나(바깥 주소)는 게이트 2 |
| /security-review | BLOCKER 0 · 주의 4 | 하나 고침 · 셋은 게이트 2 |

## 지적과 처리

| 렌즈 | 심각도 | 무엇 | 처리 |
|---|---|---|---|
| code | 주의 | 변경 강제·대시보드 `none` 계정이 `?next=/grafana/` 로 로그인하면 원문 JSON 만 본다 | `44a3b73`→`f9550f8` 변경 강제 아님 + 대시보드 read 일 때만 떠난다 |
| spec | 주의 | 명세는 로그인 화면 302 가 `GET` 만인데 코드는 `HEAD` 도 | `d30e52f`→`271e077` 로그인 안 한 `HEAD` 는 401 |
| code · spec | 주의 | 인코딩 주소 검사가 302/401/404 를 다 받음 · upgrade 요청 검사 없음 · 로그인한 HEAD 없음 | `d30e52f` `/grafana/%61pi/health` 정확히 401 · upgrade 401 · 로그인한 HEAD 통과 |
| security | 주의 | `dashboard` 망 구성원을 runner 만 봄 | `d30e52f` 전 서비스를 훑어 admin·grafana·postgres 셋인지 |
| spec | 주의 | WORKSTREAMS ④ 줄에 병합 표시 없음 · LEARNINGS 빠짐 | 이 기록과 같은 커밋 |
| security | 주의 | 대시보드 read 면 Viewer 로 `ds/query` 에 SQL 을 직접 보내 **배정 안 된 서비스의 실행 기록**까지 읽는다(비밀번호 해시·세션·`service_env` 는 GRANT 없음) | **게이트 2** — 대시보드는 사람마다(전 서비스 공통)인 명세 결정과 같은 말. 서비스별로 가리려면 RLS·서비스별 데이터소스 |
| security | 주의 | `image: grafana/grafana` 태그 없음 — 같은 출처라 Grafana 결함이 플랫폼 결함 | **게이트 2** — 명세 §9.1 조각 변경. 실측 13.2.2 로 고정 제안 |
| security | 주의 | `GF_AUTH_PROXY_WHITELIST` 없음 | 유지 — 망 구성원 셋을 검사가 막는다(위 `d30e52f`) |
| code | 주의 | `GF_SERVER_ROOT_URL` 의 `%(domain)s` 가 `localhost` — Grafana 가 만드는 절대 링크(공유·알림)가 서버 IP 로 들어온 사람에게 틀린다 | **게이트 2** — 계획 리뷰가 명세 값 그대로로 닫은 자리(`PLATFORM_PUBLIC_URL` 끝 `/` 위험). 화면 이동·`ds/query` 는 실측 200 |

## 계획과 달라진 자리 (spec-review C1 · C5)

- 문은 `auth/gate.ts` 안이 아니라 새 `auth/grafanaGate.ts` — `gate.ts` 300줄 규칙
- `CLAUDE.md` 에 접두사 `xgfp`·`xgfg` 등록 (§3 규칙)
- `web/main.tsx` 는 안 고쳤다 — `Login.tsx` 가 `window.location.search` 를 직접 읽어 필요 없어졌다

## 브라우저 확인 (Grafana 13.2.2 · auth proxy)

- 로그인 안 함 — `/grafana/` → 로그인 화면(`?next=/grafana/`) · API 401 · `/%67rafana/api/user` 401
- 대시보드 read — 로그인하면 `/grafana/` 로 돌아옴 · Grafana 로그인 폼 없음 · 역할 Viewer · 패널 7개 조회 200
- 플랫폼 `admin` — Grafana 역할 **Viewer**
- 대시보드 `none` — 화면·API·`ds/query` 403
- `X-WEBAUTH-USER: admin` 위조 · `Authorization: Basic` — 로그인한 본인 그대로
- 사이드바 `그래프 ↗` → `/grafana/` 새 탭
