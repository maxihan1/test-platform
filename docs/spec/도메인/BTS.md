# BTS

> **이 장이 담는 절** — §3.12 BTS 연동 · §7 BTS 통로 · §8.15 BTS 화면 (2026-10-31 · 진행판 BTS-F1-01)
> QA Hub 와 BTS(이슈 관리 도구)를 이어 세 바퀴를 자동으로 돌린다 — 새 기능(배포 → PRD 초안 → 다시 작성) · 버그(실패 → BTS 판정 → 수정 AI 초안 PR) · 롤백(옛 커밋 배포 → PRD · 테스트 되돌림).
> **이 장이 BTS 연동의 정본이다.** 다른 장(작성 · 실행 · 리포팅 · 인증 · 데이터모델 · 공유계약)은 자기 칸과 계약 블록만 적고 여기를 가리킨다.
> **BTS 를 잇지 않은 프로젝트는 이 장과 상관없이 지금처럼 돈다** — 아래 「지킬 것」 1. 이 장의 규칙은 「설정 › BTS 연결」을 마친 프로젝트에만 걸린다.
> **쓰는 표** `bts_link` · `bts_deploy` · `bts_claim` · `bts_issue_case` · `bts_outbox` · `project_note` · `project_note_event` · `service.code_repos` · `authoring_request` 의 종류 셋과 두 칸 · `prd_version` 의 `ROLLBACK` — 정의는 [공통/4-데이터모델.md](../공통/4-데이터모델.md) §6 「BTS 연동 표」. kit 칸은 [공통/3-공유계약.md](../공통/3-공유계약.md) 「표준 기획서 타입」 `fromIssues`.
> 전체 목차와 작업별 읽기 동선은 [SPEC.md](../../SPEC.md).

---

### 3.12 BTS 연동 — 세 바퀴 (2026-10-28 사용자)

사용자(2026-10-27) 「QA 서버에 새 기능이 올라가면 PRD · 테스트 스크립트 · E2E 가 따라 고쳐지고, 테스트 실행에서 나온 버그는 BTS 에 등록돼 BTS 에이전트가 수정 PR 까지 만든다. 에이전트는 MCP 로 프로젝트 전반의 맥락을 알고 일한다」.
아래 결정은 2026-10-27 ~ 28 기획 대화에서 주제마다 정했고 eng review 두 번(1차 10-27 · 2차 10-28, 남은 결정 없음)을 거쳤다. BTS-F1-01 시작 질문(2026-10-31)에서 명세로 옮기는 것을 승인받았다. 다시 묻지 않는다.
「(내 결정)」이 붙은 줄은 명세로 옮기며 정리본이 비워 둔 자리를 정한 것이다 — 그 진행판 줄의 시작 질문에서 바꿀 수 있다.

**까닭** — 지금 작성 AI 는 애플리케이션 하나 몫(PRD · 가이드 · 배운 것 · 지도)만 알고, 「무엇이 새로 배포됐나」를 모르고, 「버그」 판정은 `run_case_bug` 기록에서 멈춘다.
모두의 AI 실험실 최종 제출(2026-12-11)에 「버그 → 수정 PR」 고리가 완제품으로 들어간다.

#### 세 바퀴 한눈에

```
새 기능   PR 병합 ─BTS 규칙→ 「배포 대기」
          deploy.sh 성공 ─→ BTS 웹훅 { 빌드 } ─BTS 규칙→ 「배포 대기」 전부 「QA 요청」
                        └─→ QA Hub 프로젝트 배포 신호 한 번 → 애플리케이션마다 스모크 → 다 통과면 「QA 요청」 · 안 맡은 이슈 맡기
                              task · 스토리 → PRD 초안 → 「결정 필요」 → PRD 새 버전 · 다시 작성 · PR
                              버그          → 딸린 케이스 다시 실행 → 통과면 댓글 · 닫기

버그      실행 실패 → BTS 「QA 검토」 등록(AI 꼬리표) → 사람이 BTS 에서 판정
              버그 맞음 → 「개발 요청」 → 수정 AI → 초안 PR + 「코드 리뷰」 + 담당자 → 사람 병합 → 배포 → 재검증
              그 밖     → 닫기 사유에 따라 테스트 고침 · 기록만

롤백      deploy.sh 가 옛 커밋을 올림 → 사이 커밋의 이슈 키를 BTS 웹훅 · QA Hub 신호에 같이 실음 → BTS 가 「배포 대기」로 → QA Hub 가 PRD · 테스트도 되돌림
```

#### 지킬 것

1. **BTS 없는 프로젝트는 지금처럼 돈다** (회귀 계약 — 사용자 2026-10-28 「어 그러자」). 결정 필요 ② 실패 판정 · 실패 카드 판정 줄 · `run_case_bug` · `POST /api/builds` 흐름이 그대로다. 이 장이 바꾸는 화면 · 통로는 `bts_link` 행이 있는 프로젝트에서만 갈라진다
2. **테스트 작성 AI 는 대상 서비스 코드를 안 본다**(토큰 · 시간 — 사용자 2026-10-28). PRD · 화면 · API 문서 · 노트만 본다. 코드는 수정 AI 만 본다
3. **사람의 Claude Code 연결은 조회만 한다** — MCP 에 작성 요청 넣기 · 실행 걸기 도구가 없다(사용자 「테스트 작성을 시키는 건 플랫폼 정책에 맞지 않는다」)
4. **「버그야, 아니야?」는 BTS 에서만 판정한다** — BTS 연결 프로젝트는 QA Hub 화면에 버그 판정 버튼이 없다

#### 결정

| # | 정한 것 | 까닭 |
|---|---|---|
| 1 | **새 기능은 배포 단계에서 안다** — `deploy.sh` 가 성공했을 때만 프로젝트 배포 신호를 한 번 보낸다. PR 병합 단계가 아니다 | QA 서버에 배포돼야 화면을 보고 테스트를 쓸 수 있다 |
| 2 | **배포 신호는 프로젝트에 한 번**(2차 D2 「A 한 번」) — 본문 `{ build, rollback, rollbackKeys, services }`. `services` 가 없으면 그 프로젝트 애플리케이션 전부 | 회사마다 함께 · 따로 배포한다. 따로 배포하는 회사는 목록을 넘긴다 |
| 3 | **빌드 번호는 커밋 7자 + 배포 시각**(`a1b2c3d-202610281530`) | 지금 빌드 문은 같은 번호를 409 `BUILD_EXISTS` 로 막아 같은 커밋을 다시 올리는 롤백이 막힌다(2차 R3) |
| 4 | **맡을 이슈는 BTS 에서 「QA 요청」이면서 QA Hub 가 지금 맡고 있지 않은 이슈다** — 한 묶음으로 맡고 어느 빌드에서 맡았는지 `bts_claim` 에 적는다. 이슈가 「QA 요청」을 떠나면 맡음을 놓고, 다시 오면 다시 맡는다(롤백 뒤 다시 배포 · 사람이 고친 버그) | BTS `SET_FIX_VERSIONS` 는 규칙에 박힌 버전만 넣어 「버전 = 빌드」가 안 된다(2차 R1) |
| 5 | **스모크가 하나라도 깨지면 이슈를 맡지 않는다** — 「QA 요청」 이슈마다 「스모크 실패 — 보류」 댓글. 이슈가 「QA 요청」에 남아 다음 배포가 다시 잡는다 | 깨진 빌드로 PRD 초안을 쓰면 화면이 틀린다 |
| 6 | **PRD 초안은 이슈 글 + QA 화면 + 노트 + 지금 PRD 만 본다.** 요구 단위 「새로 · 바뀜 · 지움」 + 근거. 이슈 글에 있는 것만 확정 후보, 화면에서만 본 것은 「? 확인」 | 지킬 것 2. 화면에서만 본 것을 확정하면 화면 버그가 기대값이 된다(CLAUDE.md 「기대값은 사람이 판정한 것에서만」) |
| 7 | **초안은 테스트 작성 「결정 필요」의 「PRD 초안」 카드에서 줄마다 고른다** — [모두 체크]는 「? 확인」 줄을 안 체크한다. 진행은 지금 결정 진행 흐름 그대로(PRD 새 버전 · 다시 작성 · PR 하나) | 사람이 고를 일은 테스트 작성 한 곳([작성.md](작성.md) §3.6 「★ 결정 목록」) |
| 8 | **실행 실패는 BTS 에 「QA 검토」로 바로 등록한다** — AI 꼬리표 셋(버그 가능성 높음 · 테스트 문제 같음 · 흔들림 같음). 「QA 검토」를 숨기지 않는다 | 개발자도 본다. BTS 보드는 칸에 짝지어지지 않은 상태의 이슈를 안 보여 줘 보드에 「QA 검토」 칸만 더한다(`BoardColumnStateRepository.kt:169`) |
| 9 | **판정은 BTS 의 닫기 사유 · 상태로 받는다** — 닫기 사유 넷(화면이 맞음 · 테스트 문제 · 흔들림 · 환경 문제)을 BTS 해결 상태에 더하고, 「버그 맞음」은 「개발 요청」으로 옮기는 것이다 | 지킬 것 4 |
| 10 | **수정 AI 는 작성 에이전트 자리에서 돈다** — 작성 요청 종류 `BUGFIX`. 자식은 파일만 고치고 push · PR 은 에이전트 스크립트가 한다 | claude 로그인 · PR 장치 · 구독 안에서 재사용. 자식이 GitHub 열쇠를 안 갖게 |
| 11 | **재검증에서 또 실패하면 수정 AI 는 다시 안 맡는다** — 바로 사람에게 넘기고 댓글 | 같은 고침을 되풀이하지 않게 |
| 12 | **롤백이면 PRD 와 테스트도 되돌린다**(1차 D3 — 다섯 조각 전부) | 옛 커밋 화면에 새 기능 테스트가 남으면 늘 실패한다 |
| 13 | **프로젝트 노트는 AI 가 쓰고 사람은 보기만 한다** — 틀리면 애플리케이션 가이드에 쓴다. 기대값 근거가 아니다 | 노트는 길이 상한으로 다시 쓰는 글이라 사람 글을 덮는다 |
| 14 | **「테스트 요령」 칸은 가이드 「배운 것」을 가리키기만 한다**(2차 R7 — 기획 결정 뒤집음) | 요약하다 줄이 사라지고 애플리케이션 단위가 섞인다. 합치기는 지금 `scripts/authoring-main-merge.ts` `배운것합치기` 그대로 |
| 15 | **MCP 는 조회 도구만**, admin 안 `/mcp` 하나 | 지킬 것 3. 도구가 다 짧아 Tasks v2 · Elicitation 이 필요 없다 |
| 16 | **사람 요청의 BTS 이슈 조회는 그 사람 PAT 로 BTS 를 부른다**(2차 R4) | 「QA Hub AI」 열쇠로 대신 읽으면 BTS 에서 그 사람이 못 보는 이슈가 보인다 |
| 17 | **BTS 로 보낼 것은 DB 「보낼 줄」 표 + 60초 점검으로 다시 보낸다** — 1분 간격 5번(BTS 알림과 같다). 권한 · 요청 오류(4xx)는 바로 멈춘다 — 408 · 429(BTS 가 잠깐 바쁨)만 다시 보낸다(BTS-F3-02 시작 질문) | admin 에 재시도 장치가 없고 메모리 타이머는 재기동 때 보낼 것을 잃는다(2차 R6). 틀은 정기 실행(`execution/scheduled.ts`) |
| 18 | **담당자 변경 · PR 병합은 BTS 규칙 + 웹훅 호출로 받는다** — 고정 헤더에 QA Hub 토큰. BTS 코드는 안 바꾼다 | BTS 바깥 알림은 `issue.created` · `issue.transitioned` 둘뿐이고 웹훅 호출엔 서명이 없다(2차 R5) |
| 19 | **PRD 초안 · 노트 고치기 · 수정 AI 는 작성 요청 종류 셋(`PRD_DRAFT` · `NOTE` · `BUGFIX`)이다. 노트 줄만 애플리케이션 대신 프로젝트를 가리킨다** (내 결정) | 셋 다 작성 에이전트가 집는다. 초안은 QA 화면을 봐야 해 브라우저가 있는 작성 자리가 맞다. 노트는 프로젝트마다 하나라 애플리케이션 칸을 비운다 |
| 20 | **자동 AI 의 MCP 열쇠는 작성 요청 줄의 칸 하나다** — 집을 때 새로 나고 그 줄이 `RUNNING` 이 아니면 무효 (내 결정) | 「일 끝나면 무효」를 따로 지우지 않고 줄 상태가 맡는다 |
| 21 | **롤백 되돌리기는 새 작성 종류 없이 PRD 새 버전(`ROLLBACK`) + 지금 「고친 요구만 다시 작성」으로 돈다** (내 결정) | 바뀐 요구를 다시 쓰는 장치가 이미 있다([작성.md](작성.md) §3.6 「고친 요구만 다시 작성」) |
| 22 | **QA Hub 를 부르는 BTS 쪽 설정(웹훅 · 규칙 둘 · 보드 칸)은 QA Hub 가 누른 사람의 통합계정 토큰으로 만든다** — 사람이 값을 복사해 BTS 에 붙여 넣지 않는다. 이 화면에서 남는 손일은 `deploy.sh` 한 줄이다. 상태를 바꾸는 BTS 규칙과 GitHub 연결은 자동 설정 밖이다(§3.12 「설정 · 고장 대응」 「자동 설정 밖」) (2026-10-31 BTS-F3-05 사용자 — 첫 시안의 「복사 값」 구획을 거절) | BTS 가 통합계정 PAT 를 받고(`AuthPlatformPatVerifier`) QA Hub 도 사람마다 그 토큰을 둔다. 「QA Hub AI」 열쇠를 관리 권한까지 넓히지 않는다 — 새면 BTS 설정이 바뀐다. 다만 그 사람 토큰은 러너 §5.2 「받아들인 한계」대로 그 사람이 누른 앱 · 게임 케이스와 작성 AI 에도 넘어간다 — BTS 관리자가 넣은 토큰이면 그 관리 권한도 거기 열린다. 「통합계정 토큰」 창이 그 사실을 안 숨긴다(SETUP.md `DEVICE_FARM_TOKEN` 과 같은 판단: 권한이 작은 계정이 낫다) |

#### 새 기능 바퀴 — 배포 신호 → 맡은 이슈 → PRD 초안

1. PR 병합 → BTS 규칙(지금 있는 `PR_MERGED` 트리거)이 이슈를 「배포 대기」로 옮긴다 — BTS 새 동작 「상태 바꾸기」(BTS-F2-01)
2. `deploy.sh` 가 성공했을 때만 마지막 줄에서 BTS 자동화 웹훅 `{ build }` → 규칙이 「배포 대기」 이슈 **전부** 「QA 요청」 + 「QA 서버 N 배포됨」 댓글.
   이어서 QA Hub 프로젝트 배포 신호 한 번(§7 `POST /api/projects/:projectId/deploys`, 열쇠는 「설정 › BTS 연결」에서 받은 프로젝트 배포 열쇠)
3. QA Hub 는 `bts_deploy` 한 줄을 세우고 목록의 애플리케이션마다 지금 빌드 실행(스모크 → 회귀 — [실행.md](실행.md) §3.11)을 그대로 부른다. 웹 · API 는 빌드 번호만, 앱 · 게임은 그 대상 서버 줄의 최신 빌드를 쓴다
   - **대상 서버** — 본문 `env` 가 있으면 애플리케이션마다 그 이름의 줄이다. 없으면 애플리케이션마다 실서비스 서버가 아닌 줄이 하나여야 하고, 여럿이면 400 `ENV_REQUIRED` (내 결정 — 고를 줄이 하나뿐인 데모마켓은 env 없이 돈다)
   - **BTS 연결 프로젝트의 앱 · 게임 APK** 는 지금 `POST /api/builds` 로 올리되 그 문은 빌드만 남기고 실행을 걸지 않는다 — 실행은 배포 신호가 건다 (내 결정 — 같은 빌드를 두 번 돌리지 않게)
4. **하나라도 스모크가 깨지면** 이슈를 맡지 않고 「QA 요청」 이슈마다 「스모크 실패 — 보류」 댓글 → 배포 줄은 `HELD` 로 끝난다. 이슈가 「QA 요청」에 남아 다음 배포가 다시 잡는다
5. **다 통과하면** BTS 에서 「QA 요청」이면서 `bts_claim` 에 맡는 중인 줄이 없는 이슈를 찾아 한 묶음으로 맡는다(`bts_claim` 에 배포 · 빌드를 적는다). BTS 규칙이 늦게 끝나 이 묶음에 못 든 이슈는 다음 점검이 따로 작은 초안으로 맡는다(「늦은 이슈」)
   - task · 스토리 → 애플리케이션마다 PRD 초안 요청(`PRD_DRAFT`) 하나. 설명이 모자라면 초안이 그 이슈를 「결정 필요」로 멈춘다
   - 버그 → 딸린 케이스(`bts_issue_case`)만 다시 실행 → 통과면 「재검증 통과 — 빌드 N」 댓글 · 닫기(`resolution` `FIXED`). 또 실패면 아래 「수정 AI」 재검증 실패
   - 딸린 케이스가 없는 버그(사람이 BTS 에 직접 올린 것) → 「딸린 테스트 없음 — 사람이 확인」 댓글만 달고 「QA 요청」에 둔다(2차 R8)
6. 지금 `POST /api/builds` 는 BTS 없는 프로젝트 · APK 올리기용으로 그대로 둔다. 배포 신호는 애플리케이션마다 그 흐름을 안에서 부른다
7. **서버가 스스로 세우는 일의 「누가」** — 배포 실행 · `PRD_DRAFT` · `NOTE` · `BUGFIX` · 닫기 사유가 세운 작성 · `ROLLBACK` 판 · 되돌림 요청은 모두 BTS 연결을 마지막으로 저장한 admin(`bts_link.updated_by`)으로 적고 이름 스냅샷은 「BTS · <이름>」이다 (내 결정 — CI 토큰의 「실행자는 발급한 사람」과 같은 판단. 그 계정이 꺼지면 연결을 다시 저장해야 돈다)
8. **열린 작성과 부딪힐 때** — `PRD_DRAFT` · `NOTE` · `BUGFIX` 는 테스트 저장소를 안 고쳐 열린 뿌리가 아니다(`chainSql.ts` `열린뿌리식` 은 그대로 `AUTHOR` · `EDIT`). 초안을 고른 뒤의 진행은 지금 결정 진행이라 서버 막기(`AUTHORING_OPEN`)도 그대로다. 롤백 되돌림 요청(`AUTHOR`)은 서버가 세우는 일이라 409 를 받을 사람이 없다 — 열린 작성이 있으면 `ROLLBACK` 판만 먼저 올리고 되돌림 요청은 열린 작성이 끝난 뒤 60초 점검이 세운다

#### PRD 초안 → 「결정 필요」 → 다시 작성

- 초안 요청(`PRD_DRAFT`)은 애플리케이션 하나 · 맡은 이슈 여럿이다. 자식은 MCP 로 이슈 글 · 노트 · 지금 PRD 를 읽고 QA 화면을 훑어 줄마다 `{ op: 'ADD'|'EDIT'|'DEL', reqId?, text, basis, issueKeys, sure }` 를 낸다. `sure: false` 가 「? 확인」이다
- **같은 요구를 건드리는 이슈끼리는 한 카드로 합친다.** 다른 애플리케이션과 엮이면 노트를 보고 E2E 시나리오를 제안한다(케이스 조합만 — 작성 쪽은 안 바꾼다) → 같은 카드에서 확정
- 사람이 고른 줄은 지금 결정 진행 흐름으로 PRD 새 버전(`DECISION`)이 되고, 그 줄의 항목에 `fromIssues` 가 붙는다(롤백이 이것만 되돌린다). 「? 확인」을 안 고르면 `확인 필요` 요구가 되고 그 케이스는 미확정이다
- 고르지 않은 카드는 목록에 남는다 — 지금 결정 목록 규칙 그대로

#### 버그 바퀴 — 실패 → BTS 「QA 검토」

- **무엇을 올리나** — 실행이 끝나면 실패 항목마다(케이스 · 대상 서버로 접는다) 이슈 하나. 제목 `[<애플리케이션>] <케이스 이름>` · 환경(대상 서버 · 디바이스 · 빌드) · 재현 단계(= 케이스 step) · 기대(PRD 요구 번호와 문장) vs 실제(실패한 확인 · 실패 원인 한 줄) · 실패한 네트워크 요청 · 콘솔 오류(가린 글) · 첨부(실패한 단계의 캡처 — 아래 「첨부 파일은」) · QA Hub 실행 결과 고리 · AI 꼬리표 하나. 「관련 이슈」 칸은 1차에 없다(무엇을 관련으로 볼지 정하지 않았다 — BTS-F3-03 spec-review)
- **같은 테스트가 또 실패하면** 열린 이슈(`bts_issue_case` 의 닫히지 않은 줄)에 댓글만 단다. 아직 보내지 못한 등록이 있으면(보낼 줄의 기다리는 CREATE) 새로 넣지 않는다 — 첫 실패 실행으로 올린다. 그만둔(GAVE_UP) 등록 뒤의 실패는 새로 넣는다. **흔들림 · 테스트 문제 · 화면이 맞음으로 판정된 테스트**(BTS 에서 그 사유로 닫힌 테스트 — `bts_issue_case.resolution`)는 그 케이스를 고친 작성이 병합될 때까지 등록하지 않는다(사람이 이미 판정했고 테스트를 고칠 일만 남았다 — BTS-F3-04 리뷰. 환경 문제 · 중복은 다음 실패를 다시 올린다). 앞 실행 결과가 섞인 테스트는 올리되 꼬리표가 「흔들림 같음」이다(아래)
- **보내기는 「보낼 줄」로만** — 실행 끝이 `bts_outbox` 에 줄을 넣고 60초 점검이 보낸다. 1분 간격 5번 · 4xx(권한 · 요청 오류) · 3xx(주소 넘김) · 이슈 키 없는 만들기 답은 그 자리에서 멈춘다(408 · 429 는 다시 — 결정 17). 같은 이슈의 줄은 앞 줄이 끝나야 뒤 줄을 보낸다. 그만두면 실행 결과 실패 카드에 「BTS 등록 실패 · <까닭>」 + [다시 보내기](§8.15). 재기동 뒤에도 줄이 남아 이어 보낸다
- **보내는 열쇠는 「QA Hub AI」 계정 열쇠다** — 등록 · 댓글 · 상태 · 담당자만 열린 BTS 계정(BTS-F2-02)
- **밖으로 나가는 글은 전부 가린다** — 이슈 본문 · 댓글(기대 vs 실제 · 실패 원인 · 재현 단계 포함)은 첨부와 같은 증적 비밀값 가림 함수를 거친다. 되비친 비밀값이 실패 원인에 실린다([리포팅.md](리포팅.md) 「되비친 비밀값」)
- **크기 상한** — 본문이 BTS 상한(바이트로 센다 · 코드 상수가 정본 `bts/failBody.ts`)을 넘으면 재현 단계를 뒤에서부터 덜어 내고 「이하 N단계는 QA Hub 실행 결과에서」 + 실행 결과 고리를 남긴다. 첨부는 개수 상한 안에서 캡처 먼저
- **AI 꼬리표는 규칙으로 붙인다**(BTS-F3-03 시작 질문 2026-10-31 — AI 를 안 불러 구독 한도를 안 쓰고 바로 붙는다). 앞 실행들(이번 실행을 뺀 최근 흐름)에 통과와 실패가 섞였으면 「흔들림 같음」, 기대와 다름(실패 유형 `mismatch`)이면 「버그 가능성 높음」, 그 밖(요소 못 찾음 · 시간 초과 · 서버에 못 닿음)은 「테스트 문제 같음」. BTS 라벨 `QA Hub` 와 함께 단다
- **첨부 파일은 실패한 단계의 캡처만 올린다**(같은 시작 질문). 실패 원인 · 실패한 네트워크 요청 · 콘솔 오류는 가린 글로 본문에 넣는다 — 글은 가린 뒤에만 나가야 해서다. 네트워크 · 콘솔은 실행 뒤 따로 풀려(trace 적재) 아직이면 「QA Hub 실행 결과에서 보세요」 한 줄이다
- **등록이 닿으면** 짝(`bts_issue_case`)을 먼저 적고, 만든 이슈를 「QA 검토」 짝 상태로 옮기고, 캡처를 올린다. 옮기기 · 올리기는 한 번만 해 보고 깨지면 기록만 남긴다 — 이슈는 이미 있어 다시 만들지 않는다
- 올리는 실행은 BTS 를 이은 프로젝트의 끝난 케이스 실행이다 — 시나리오는 안 올린다. 한 건 실행은 붙는 실행(부모)의 카드로 그 한 건만 올리고 줄도 부모 실행에 단다(카드가 부모 자리에 선다). 흔들림 · 테스트 문제 · 화면이 맞음으로 닫힌 테스트는 그 케이스를 고친 작성이 병합되면 다시 올린다(아래 「판정은 BTS 에서」 흔들림 줄)

#### 판정은 BTS 에서 — 결정 필요 ② 빼기 · 닫기 사유 넷

- **BTS 연결 프로젝트는 결정 필요 ② 의 「실패 판정」 항목을 싣지 않는다.** ② 의 나머지 셋(화면 기준 확인 필요 · 기획서 간 불일치 · 그 밖의 확인 필요)은 그대로 QA Hub 에 남는다([작성.md](작성.md) §3.6 「★ 결정 목록」)
- 실행 결과 실패 카드의 판정 줄은 「BTS DM-12 에서 확인 중」과 그 이슈 고리다(닫혔으면 「BTS DM-12 · 화면이 맞음으로 닫힘」). 「화면이 맞음으로 바꾸기」 단추도 없다 — BTS 에서 닫는다([리포팅.md](리포팅.md) 「판정」 줄 · [실행.md](실행.md) §8.3 실패 카드)
- `run_case_bug` 에 쓰지 않는다 — 판정 기록의 정본이 BTS 다
- **닫기 사유 → QA Hub 가 할 일** — BTS 알림(`issue.transitioned`)을 받으면 이슈를 다시 읽어 해결 상태를 본다. 해결 상태 이름은 연결의 짝(`resolution_map` — 대소문자 · 앞뒤 빈칸은 안 본다)으로 단계를 찾고, 짝이 없는 이름은 아무것도 안 한다. 「닫힘」 단계를 짝지었으면(`status_map.CLOSED`) 이슈가 그 상태일 때만 본다 — 해결 상태가 남은 채 다시 열린 이슈를 닫힌 것으로 치지 않는다(BTS-F3-04 · `bts/close.ts`)
- **한 번만 한다** — 그 이슈의 닫히지 않은 짝 줄(`bts_issue_case`)을 닫는(`closed_at` · `resolution`) UPDATE 가 돌려준 줄에만 일을 건다. 같은 알림이 다시 오거나 재기동 뒤 다시 와도 겹치지 않는다. 처리가 깨지면(테스트 문제의 이슈 글을 BTS 가 바빠 못 읽음 — 5xx · 408 · 429 · 끊김 · DB) 짝 줄을 닫지 않고 503 — BTS 가 다시 보낸다. 권한 · 없음 같은 4xx 는 다시 받아도 같아 글 없이 간다. 닫았는데 요청을 못 세운 케이스(첫 실행이 지워짐 · 덮는 요구가 판에 없음)는 서버 기록에 까닭을 남긴다
- **세우는 작성 요청은 결정 진행이 세우는 반영 요청과 같다** — `kind = 'AUTHOR'` · params `{ prdApply: true, …, decision: { after: <그때 열린 작성>, count: 1 } }` · 요청한 사람 `bts`(이름 「BTS DM-12」) — `decision` 칸 때문에 작성 목록 · 버전 기록에는 「테스트 작성에서 결정」 꼬리표로 보이고 요청한 사람 이름으로 가른다. 대상 실행은 짝 줄의 `first_run`(처음 올린 실행)에서 그 케이스가 실패한 실행이다 — 한 건 실행으로 올린 이슈는 `first_run` 이 부모라 그 부모에 붙은 한 건 실행 가운데 실패한 가장 늦은 것을 쓴다. 지워졌거나 실패가 없으면 그 케이스는 기록만

| 닫기 사유(BTS 해결 상태) | QA Hub 가 할 일 |
|---|---|
| 화면이 맞음 | 지금 「화면이 맞음」 다시 작성(그 케이스가 덮는 요구를 화면 기준으로 · PRD 새 버전 · PR 하나 — [리포팅.md](리포팅.md) 「판정」 줄의 뜻 그대로). 사람이 판정했으므로 고친 항목은 `확정` · `byPerson`. params `screenRight` 칸은 결정 진행과 같은 꼴이고 `byName` 이 「BTS DM-12」다. 덮는 요구가 지금 판에 없는 케이스는 기록만 |
| 테스트 문제(새 사유 · PRD 그대로) | 테스트만 다시 쓰는 작성 + 이슈에 「테스트 고침 PR #N」 댓글. 케이스 고치기 `EDIT` 는 지우기 · 기대값 바꾸기만 받아 담을 수 없다 — 「화면이 맞음」과 같은 반영 요청에 params `testFix: { issueKey, cases: [{ runId, tcId, env }], note }` 를 싣는다(그 케이스만 다시 돌려 고침 · 결과 파일 prd.json 을 안 써 PRD 는 그대로). `note` 는 닫힐 때 서버가 「QA Hub AI」 열쇠로 읽은 이슈 글 · 댓글(8000자까지)이다 — 자식은 자료로만 읽고 그 안의 지시는 따르지 않는다(BTS-F3-04 시작 질문 — 에이전트가 BTS 를 부르는 통로는 F5-03 이 만든다). 댓글은 그 요청(재실행 포함)이 PR 을 열고 끝낼 때 보낼 줄에 넣는다 — 같은 이슈에 같은 PR 주소 댓글이 이미 있으면 다시 안 넣는다 |
| 흔들림 | 기록만(`bts_issue_case.resolution`) — 그 테스트는 다음 실패부터 등록하지 않는다. 그 케이스를 고친 작성이 병합되면 풀린다 — 닫힌 뒤에 끝난 병합(`MERGE` DONE)의 원본 작성 끝내기 `result.cases` 에 그 tcId 가 들면 다음 실패부터 다시 올린다(표를 더하지 않는다). 테스트 문제 · 화면이 맞음도 같은 규칙으로 고친 작성의 병합을 기다린다(위 「같은 테스트가 또 실패하면」) |
| 환경 문제 | 기록만 |
| 중복 | 기록만 — QA Hub 가 할 일은 없다. 짝 줄을 닫아 다음 실패가 닫힌 이슈에 댓글로 붙지 않게 한다 |
| (「개발 요청」으로 옮김 = 버그 맞음) | 아래 「수정 AI」 |

#### 수정 AI (`BUGFIX`)

- **「개발 요청」 이슈만 맡는다.** QA Hub 에서 온 이슈가 「개발 요청」이 되면 BTS 규칙이 「QA Hub AI」에게 할당하고, 사람이 올린 버그는 사람이 담당자를 「QA Hub AI」로 바꾸면 맡는다. 담당자 변경은 BTS 규칙 웹훅 호출로 받는다(결정 18)
- 신호를 받으면 그 애플리케이션의 `BUGFIX` 요청을 대기열에 세운다. 고칠 저장소는 애플리케이션 「코드 저장소」 칸(`service.code_repos`)에서 고른다. BTS 화면에서 이 일의 이름은 「BTS 에이전트」다
- 자식은 저장소 사본에서 파일만 고친다. push · 초안 PR · BTS 「코드 리뷰」 이동 · 담당자 변경은 에이전트 스크립트가 한 번에 한다. 병합은 사람이다
- **push 전에 비밀값 검사** — 지금 작성 PR 이 push 전에 거치는 비밀값 검사(작성.md §3.6)를 대상 저장소 diff · PR 본문 · BTS 댓글에도 건다. 걸리면 push 하지 않고 원인 분석 댓글로 바꾼다. PR 본문 · 댓글은 위 크기 상한과 같은 규칙으로 줄인다
- **넘길 사람** — CODEOWNERS → 고친 줄을 마지막으로 바꾼 사람(git 기록) → BTS 구성 요소 리드 → 프로젝트 기본 담당자. Git ↔ BTS 계정은 이메일로 짝짓고 활성 계정이 없으면 다음 차례. PR 리뷰어 = BTS 담당자
- Git 과 BTS 가 겹치면 리뷰는 Git 이 정본이고 BTS 상태는 PR 을 따라간다. PR 닫힘(거절)은 처음엔 개발자가 BTS 에서 되돌린다(「1차 밖」)
- **재검증에서 또 실패하면** AI 는 다시 안 맡고 바로 사람에게 넘기며 댓글(어느 PR 을 배포했는데 또 실패 · 실패 이유 · 고친 곳)
- **못 고치거나 저장소가 없으면** 원인 분석 댓글 + 사람에게. 저장소가 없을 때 이슈에 「코드 없음 — 원인 분석만」. 저장소가 없어도 작성 · BTS 등록은 그대로 돈다

#### 롤백 바퀴

- `deploy.sh` 가 올라간 커밋을 적어 둔다. 새 커밋이 옛 커밋의 조상이면 롤백이다 → 사이 커밋 메시지의 이슈 키를 뽑아 BTS 웹훅과 배포 신호 본문(`rollback: true` · `rollbackKeys`)에 같이 싣는다 → BTS 규칙이 「받은 키 목록 전부」를 「배포 대기」로 되돌린다(BTS-F2-01, 같은 200 상한)
- QA Hub 는 PRD 와 테스트도 되돌린다 — 다섯 조각
  1. 되돌릴 요구는 둘이다 — 지금 판에서 `fromIssues` 가 받은 키와 겹치는 항목, 그리고 판 기록(`prd_version.changes` 의 `issueKeys`)에서 받은 키로 지운 번호(지운 항목은 지금 판에 없어 꼬리표가 붙을 자리가 없다)
  2. PRD 새 버전(`ROLLBACK`) — 「새로」는 지우고 「바뀜」 · 「지움」은 그 이슈를 고른 판 바로 앞 판의 항목으로 돌린다. 버전 기록에 「롤백 · 빌드 N · DM-12」
  3. 되돌리는 PR — 지금 「고친 요구만 다시 작성」 요청 하나(`bts_deploy.revert_request_id`)
  4. 그 PR 병합 전에 다시 배포되면 그 요청을 폐기하고 PR 을 닫는다
  5. 그 키를 다루던 작성 중 · 확인 대기 초안(`PRD_DRAFT` 와 그 카드)은 버린다

#### 맥락 — 프로젝트 노트

- 프로젝트마다 하나 · DB 에 버전으로(`project_note`). 사람은 보기만(§8.15 「노트 보기」)
- **여섯 칸** — 한눈에 · 기능별 자리 · 최근 바뀐 것 · 자주 깨지는 곳 · 테스트 요령(가이드 「배운 것」을 가리킴) · 더 볼 곳. 칸마다 길이 상한(상수는 코드가 정본 — BTS-F4-03)
- 「기능별 자리」의 코드 위치는 수정 AI 용이다. 노트 고치는 AI 도 코드를 읽지 않고 **PR 병합 사건의 바뀐 파일 경로 · PR 제목**만 적는다. 바뀐 파일 경로는 에이전트 스크립트가 PR 번호로 GitHub 에서 읽어 자료로 넘긴다(자식은 GitHub 열쇠가 없다 — 결정 10)
- **고치는 때** — 배포 · task 끝 · 이슈 열림/닫힘 · PR 병합 · PRD 새 버전 · 작성 끝이 `project_note_event` 에 쌓이고, 열린 노트 고치기가 없으면 대기열에 `NOTE` 하나를 세운다(쌓인 사건을 한 번에). 처음 만들기도 같은 일 하나
- AI 가 실패하면 앞 버전을 그대로 둔다. 노트 화면에 「마지막 고친 때」

#### 맥락 — MCP 조회 도구

- QA Hub admin 안 `/mcp` 하나(`apps/admin/src/mcp/`) — 쓰임 둘: AI 들이 일할 때 맥락 찾는 창구(본 목적) · 사람이 자기 Claude Code 로 묻는 창구(덤)
- **도구** — 프로젝트 노트 읽기 · PRD 요구 찾기 · 지도 찾기 · BTS 이슈 · task 찾기 · 실행 결과 보기. 모두 조회만이다. 노트 읽기는 노트 표를 만드는 BTS-F4-03 이 더한다(BTS-F4-01 은 나머지 넷)
- 권한 검사는 화면 통로와 같은 출입문 하나다(도메인/인증 §7 — 프로젝트 · 기능 칸). 도구마다 화면의 같은 통로가 요구하는 권한으로 문의 판정 함수(`auth/gate.ts` `문판정`)를 부른다 — PRD 요구 찾기는 `GET /api/prd`, 지도 찾기는 `GET /api/catalog/cases`, 실행 결과는 `GET /api/runs/:runId`, BTS 찾기는 그 프로젝트 애플리케이션 하나라도 (작성, read)(노트 보기와 같은 문턱). 배정 밖은 도구 오류 `FORBIDDEN`
- 작성 자식(`claude -p`)에 `--mcp-config` 로 붙인다 (2026-10-31 BTS-F4-02 반영 — `scripts/authoring-rules.ts` `MCP붙이기`). 집기 응답에 일마다 열쇠(`mcpKey`)가 온 줄만 서버 `qa-hub`(`<admin 주소>/mcp` · `Bearer mcj_…`)와 그 서버 도구 허용(`--allowedTools mcp__qa-hub` — `-p` 는 허용 안 된 도구를 묻지 못하고 거절한다)을 `--disallowedTools` 바로 앞에 끼운다. 기존 깃발은 그대로 둔다
- `mcj_` 요청의 사람은 그 줄을 집은 작성 계정이다 — 권한은 그 계정 것을 쓰고 배정을 그 줄의 프로젝트로 좁힌다(`apps/admin/src/mcp/jobKey.ts`). 집은 계정이 지금의 작성 계정이 아니거나 꺼졌으면 401. BTS 찾기는 PAT 가 없어 그 프로젝트에 저장한 「QA Hub AI」 열쇠로 부른다
- 새 npm 패키지 `@modelcontextprotocol/sdk` 는 BTS-F4-01 시작 질문에서 승인받았다(2026-10-31 사용자 — 「나중에 기능 추가할 수 있으니」 · 1.32.1). 1차 밖의 브라우저 로그인 · 긴 작업 자리가 패키지에 있다

#### 열쇠 표

| 누가 → 어디 | 열쇠 | 할 수 있는 것 |
|---|---|---|
| 사람 Claude Code → QA Hub MCP | 각자 통합계정 **PAT** | 자기 권한 그대로 · 화면과 같은 출입문. BTS 이슈 조회는 그 사람 PAT 로 BTS 를 부른다(결정 16) |
| deploy.sh → QA Hub | 프로젝트 배포 열쇠(`pdk_` — 「설정 › BTS 연결」) | 그 프로젝트 배포 신호 하나만 |
| BTS 규칙 웹훅 호출 → QA Hub | 고정 헤더의 QA Hub 규칙 토큰(`btr_`) — BTS 자동 설정이 만들어 규칙 머리에 넣는다. 화면은 원문을 안 보인다. 통로 `keys/rule` 은 남아 있다 — 부르면 토큰이 바뀌어 자동 설정이 만든 규칙이 멈추므로 다시 자동 설정을 누른다 | 그 프로젝트 담당자 변경 · PR 병합 받기만 |
| 설정 화면 → BTS 자동 설정 · 고를 목록 | 자동 설정은 **누른 운영 계정의 통합계정 PAT**(내 메뉴 「통합계정 토큰」 — 디바이스 팜과 같은 토큰). 고를 목록은 「QA Hub AI」 계정 토큰 | 웹훅 · 자동화 규칙 · 보드 칸 만들기 · 고치기 / 상태 · 해결 사유 읽기만. 따로 발급받지 않는다(2026-10-31 사용자 「통합계정이잖아」) |
| 자동 AI(작성 · 초안 · 노트 · 수정) → QA Hub MCP | 일마다 새로 나는 짧은 열쇠(`mcj_`) · 일 끝나면 무효(결정 20). 받는 줄은 `PRD_DRAFT` · `NOTE` · `BUGFIX` 와 BTS 연결 프로젝트의 `AUTHOR` — 그 `RERUN` 도 같다 | 그 프로젝트 조회 도구만 |
| QA Hub → BTS | BTS 「QA Hub AI」 계정 열쇠 | 등록 · 댓글 · 상태 · 담당자만 |
| BTS → QA Hub 알림 | HMAC 서명 `X-BTS-Signature`(BTS 에 이미 있음) | 알림 받기 |
| 수정 AI → GitHub | 에이전트 스크립트만 듦 · 저장소 하나 | 브랜치 · PR 까지 |

- QA Hub 는 Auth PAT 를 **`/mcp` 한 곳에서만** 받는다(2026-10-31 BTS-F4-01 — `auth/pat.ts`). 확인은 Auth whoami + 60초 기억(BTS 와 같은 방식), 계정이 꺼졌는지는 매번 DB 로 본다. `/api` 통로는 PAT 를 안 받는다 — 새면 할 수 있는 일을 조회 도구로 좁힌다(도메인/인증 §7 「인증 적용 범위」). SSO 가 꺼진 설치는 PAT 를 확인할 곳이 없어 `/mcp` 가 401 이다
- 새 열쇠 셋(`pdk_` · `btr_` · `mcj_`)은 원문을 한 번만 보이고 해시만 둔다(CI 토큰과 같다). `pdk_` · `btr_` 는 발급한 admin 계정에 묶는다 — 그 계정이 꺼지면 열쇠도 못 쓴다([실행.md](실행.md) §3.11 「토큰은 발급한 admin 계정에 묶는다」와 같은 판단)

#### 설정 · 고장 대응

- 처음 설정은 「설정 › BTS 연결」 한 화면(§8.15) — 프로젝트 짝짓기 · 「QA Hub AI」 계정 토큰 · 회사마다 다른 BTS 상태 · 해결 사유 ↔ 단계 짝짓기(BTS 에서 목록을 불러와 고른다) · 애플리케이션별 코드 저장소 · **BTS 자동 설정** · `deploy.sh` 한 줄 복사
- **BTS 쪽 설정은 QA Hub 가 만든다** (2026-10-31 BTS-F3-05 사용자 「자동으로 설정하면 되잖아」 · 「통합계정이잖아」) — 웹훅 하나(이슈 생성 · 상태 전환 → `POST /api/bts/events/:projectId`, 서명 비밀은 QA Hub 가 만들어 넣는다) · 자동화 규칙 둘(담당자 변경 · PR 병합 → 웹훅 호출, 머리에 `btr_`) · 보드마다 「QA 검토」 상태가 든 칸이 없으면 칸 하나. 누른 운영 계정의 통합계정 토큰으로 부른다(「열쇠 표」). 다시 눌러도 한 벌이다 — 웹훅은 주소, 규칙은 이름(`QA Hub · 담당자 변경` · `QA Hub · PR 병합`)으로 찾아 고친다. 하나가 막혀도 나머지는 만든다
- 권한 — 웹훅은 BTS 시스템 관리자, 규칙은 그 프로젝트 자동화 관리(기본 프로젝트 관리자 · 멤버여야 한다), 보드 칸은 그 프로젝트 만들기 권한. BTS 는 사설 주소 · localhost 로 가는 웹훅을 거절해 QA Hub 공개 주소(`PLATFORM_PUBLIC_URL`)가 있어야 한다. PR 병합 규칙은 BTS 프로젝트에 GitHub 연결(BTS 「Git 웹훅」)이 있어야 돈다 — 그 연결은 QA Hub 가 만들지 않는다
- 이 화면에서 사람 손이 남는 것은 `deploy.sh` 한 줄이다 — 회사 배포 서버에 있어 QA Hub 가 못 고친다. 거기 들어갈 토큰(`pdk_`)은 프로젝트 전용이다. 사람 토큰을 두면 그 사람이 나갈 때 배포 신호가 끊긴다
- **자동 설정 밖** — 아래는 QA Hub 를 부르지 않고 BTS 안에서 상태만 바꾸는 규칙이라 사람이 BTS 에서 만든다(자동화 동작 「상태 바꾸기」는 BTS-F2-01 이 BTS 에 더한다 · 데모마켓 것은 BTS-F5-02)

  | 무엇 | 어디서 | 누가 |
  |---|---|---|
  | PR 병합 → 「배포 대기」 규칙 | BTS 자동화 | 사람(BTS-F2-01 뒤) |
  | deploy 웹훅 → 「배포 대기」 전부 「QA 요청」 규칙 | BTS 자동화 | 사람(BTS-F2-01 뒤) |
  | 「개발 요청」 → 「QA Hub AI」 할당 · 롤백 → 「배포 대기」로 되돌림 규칙 | BTS 자동화 | 사람(BTS-F2-01 뒤) |
  | BTS 프로젝트의 GitHub 연결(PR 병합 규칙이 돌게) | BTS 프로젝트 설정 | 사람 |
- **짝지을 이름** — 상태 여섯(배포 대기 · QA 요청 · QA 검토 · 개발 요청 · 코드 리뷰 · 닫힘)과 해결 상태 다섯(화면이 맞음 · 테스트 문제 · 흔들림 · 환경 문제 · 중복). 회사의 상태 · 해결 상태를 이 단계에 짝짓는다 — 상태는 BTS 상태 키, 해결 상태는 이름을 둔다(`bts_link.status_map` · `resolution_map` — 옮기기는 `toStatusKey` 로, 닫기 사유는 이슈의 해결 이름으로 견준다). 짝이 빈 단계가 있으면 연결을 저장하지 못한다
- BTS 가 꺼지면 보낼 줄이 다시 보낸다(결정 17). 구독 한도에 닿으면 작성 에이전트가 지금처럼 멈추고 알리고, 풀리면 이어서 한다(사람이 시킨 일 먼저)
- BTS 「조건에 맞는 이슈 전부」 · 「받은 키 목록 전부」는 한 번에 200개 — 넘으면 하나도 안 바꾸고 BTS 자동화 실행 기록에 「상한 넘음」

#### 고장 모드

| 길 | 고장 | 막는 것 | 사람이 보나 |
|---|---|---|---|
| deploy.sh → BTS 웹훅 | BTS 꺼짐 | 배포 스크립트가 실패로 끝남(재실행) | 보임 |
| BTS → QA Hub 알림 | QA Hub 꺼짐 | 배포 신호 뒤 QA Hub 가 「QA 요청」 · 안 맡은 이슈를 BTS 에서 다시 찾음 | 보임(빌드 실행 기록) |
| QA Hub → BTS 등록 | 권한 오류가 계속 | 즉시 멈춤 · 실패 카드 · [다시 보내기] | 보임 |
| QA Hub → BTS 등록 | admin 재기동 | 보낼 줄 표가 이어 보냄 | 보임 |
| 노트 고치기 | AI 실패 | 앞 버전 유지 | 「마지막 고친 때」 |
| 수정 AI | 틀린 고침 | 재검증 실패 → 사람에게 + 댓글 | 보임 |
| 롤백 | 되돌림 PR 병합 전 재배포 | PR 닫기 | 보임 |
| BTS 이슈 전부 | 잘못 만든 규칙 | 200 상한 · 넘으면 하나도 안 바꿈 | 「상한 넘음」 기록 |
| 프로젝트 배포 신호 | 애플리케이션 하나 스모크 깨짐 | 이슈 안 맡고 보류 댓글 · 다음 배포가 다시 잡음 | 보임 |
| BTS 규칙 웹훅 호출 | 토큰 틀림 · QA Hub 꺼짐 | QA Hub 가 거절 기록 · BTS 자동화 실행 기록에 실패 | BTS 실행 기록 |

운영 메모 — 작성 · 노트 · 수정 AI 는 작성 에이전트(author 컨테이너)에서 돈다. 그 자리가 멈추면 셋 다 멈춘다(지금 작성과 같다). MCP 는 admin 안이라 가볍다(조회 · 노트 길이 상한).

#### 품질 숫자

AI 품질은 따로 시험하지 않고 사람이 고른 결과로 센다 — 대시보드(§8.15 「대시보드 두 숫자」).
- 초안 AI = 사람이 체크한 줄 ÷ AI 가 쓴 줄(PRD 초안 카드에서 진행한 것만 분모에 든다)
- 수정 AI = 병합된 PR ÷ AI 가 올린 PR(닫히지도 병합되지도 않은 PR 은 분모에서 뺀다)

#### 다른 저장소가 할 것

- **BTS**(BTS-F2-01 · 02) — 자동화 동작 「상태 바꾸기」(지금 다섯 동작에 없다 — `automation/domain/ActionType.kt`) · 웹훅 규칙이 「조건에 맞는 이슈 전부」 · 「받은 키 목록 전부」에 걸리는 실행(지금은 이슈 하나 — `ActionExecutor.kt:57`) · 해결 상태 넷 · 「QA Hub AI」 계정. 담당자 변경 · PR 병합 신호는 코드 없이 규칙 설정으로
- **데모마켓**(BTS-F5-02) — `deploy/deploy.sh` 끝에 BTS 웹훅 · 배포 신호 · 빌드 번호 · 올라간 커밋 기록 · 롤백 판정과 이슈 키 뽑기(순수 함수로 떼어 시험)
- **Auth** — 없다(PAT · whoami 가 이미 있다)

#### 1차 밖 · 나중

- MCP 로 작성 요청 · 실행 걸기 · Tasks v2 · Elicitation
- 테스트 작성 AI 의 코드 읽기 · 「기대값이 코드에만」 대조 검사
- 「QA 검토」 숨기기 · 보드 칸이 지금 어떤지 화면에 보이기(칸이 없으면 만드는 것은 BTS 자동 설정이 한다 — BTS-F3-05)
- 「버그 심어 시험」 같은 AI 품질 시험
- PR 닫힘(거절) 신호 — 거절이 잦으면 BTS PR 닫힘 트리거를 더한다
- 브라우저 로그인으로 MCP 붙이기 — 팀이 쓰기 시작할 때
- Jira 등 다른 BTS — 연결 자리(`apps/admin/src/bts/`)만 하나로 모아 둔다
- BTS 바깥 알림 종류 늘리기 · 빌드마다 BTS 버전 만들기 · 「배운 것」을 노트로 옮기기(2차)

#### 계약 — 대기 블록이 있는 곳

- DB 표 · 칸 — [공통/4-데이터모델.md](../공통/4-데이터모델.md) §6 「BTS 연동 표」(진행판 줄마다 블록 하나)
- kit `PrdItem.fromIssues` — [공통/3-공유계약.md](../공통/3-공유계약.md) 「표준 기획서 타입」
- Admin API — 아래 §7 끝

---

## 7. BTS 통로 (2026-10-31 · BTS-F1-01 — 꼴은 각 진행판 줄이 고친다)

```
# 프로젝트 배포 신호 — deploy.sh 가 성공했을 때만 한 번 부른다 (BTS-F5-01)
#   열쇠: Authorization: Bearer pdk_… (그 프로젝트 배포 신호 하나만 — 다른 통로는 403 AGENT_TOKEN_SCOPE)
POST /api/projects/:projectId/deploys
     { build: 'a1b2c3d-202610281530', env?: string, rollback?: boolean, rollbackKeys?: string[], services?: string[] }   — services 는 애플리케이션 접두사. 없으면 그 프로젝트 전부 · env 규칙은 §3.12 「새 기능 바퀴」 3
  → 202 { deployId }   — 스모크 · 맡기는 뒤에서 돈다
  → 200 { deployId }   — 같은 프로젝트 · 같은 build 가 다시 오면 새로 걸지 않고 앞 배포 번호를 준다(deploy.sh 재시도 멱등). 애플리케이션마다의 빌드 줄도 앞 것을 쓴다(BUILD_EXISTS 로 막히지 않는다)
  → 400 BAD_BUILD(빈 값 · 100자 넘음) · 400 ENV_REQUIRED · 404 UNKNOWN_ENV(그 이름 줄이 없는 애플리케이션) · 400 UNKNOWN_SERVICE(다른 프로젝트 접두사) · 409 NOT_LINKED(BTS 연결 없음) · 400 PROD_ENV_BLOCKED(실서비스 서버만 있는 애플리케이션 — 실행.md §3.11)

# BTS 알림 받기 — issue.created · issue.transitioned (BTS-F3-02 반영 2026-10-31 · apps/admin/src/bts/inbound.ts)
#   열쇠: X-BTS-Signature: sha256=<HMAC(본문, bts_link.webhook_secret)>. 맞지 않거나 없으면 401 BAD_SIGNATURE — 헤더가 없거나 꼴이 틀리면 몸을 읽기 전에 돌려보낸다. 몸은 64KB 까지(넘으면 413)
POST /api/bts/events/:projectId   — 서명 비밀이 프로젝트마다 달라 주소에 프로젝트를 싣는다(BTS 자동 설정이 이 주소로 BTS 웹훅을 만든다 — BTS-F3-05). 연결이 없는 프로젝트도 401 BAD_SIGNATURE — 어느 프로젝트가 이어졌는지 밖에 알리지 않는다(BTS-F3-02 리뷰)
  → 204   — 이슈를 BTS 에서 다시 읽어 처리한 뒤 답한다(알림 본문을 믿지 않는다). 다시 읽기가 깨지면 503 BTS_UNREACHABLE — BTS 가 같은 알림을 다시 보내게(BTS-F3-02 리뷰). 같은 알림 두 번은 한 번으로 친다 — 몸의 deliveryId(BTS 가 다시 보내도 같다)를 admin 메모리에 기억한다. 재기동하면 잊으므로 받는 쪽(닫기 사유 · 맡기)은 DB 상태로 한 번만 하게 짠다(BTS-F3-02 시작 질문).
           다른 BTS 프로젝트 키 · 두 종류 밖 알림은 다시 읽지 않는다

# BTS 규칙 웹훅 호출 받기 — 담당자 변경 · PR 병합 (BTS-F3-02 반영 2026-10-31 · apps/admin/src/bts/inbound.ts)
#   열쇠: X-QAHub-Token: btr_… (고정 헤더 — 웹훅 호출엔 서명이 없다). 해시로 그 프로젝트를 찾는다 · 틀리거나 만든 admin 이 꺼졌으면 401
POST /api/bts/rules
     { event: 'ASSIGNEE', issueKey, assignee? } | { event: 'PR_MERGED', issueKey, prNumber, prUrl, prTitle? }
     — assignee · prTitle 은 없어도 받는다(빈 글자로 친다). BTS 자동 설정이 만드는 규칙 몸은 둘을 안 싣는다 — 담당자 변경 사건엔 새 담당자가 없어 늘 비고, BTS 템플릿이 따옴표를 그대로 끼워 제목에 「"」가 들면 몸이 깨진다. 담당자는 받는 쪽이 이슈를 다시 읽어 본다(BTS-F3-05)
  → 204 · 400 INVALID_REQUEST(꼴이 틀림 · 다른 BTS 프로젝트 이슈 키 — BTS 자동화 실행 기록에 실패로 보인다). prNumber 는 글자로 와도 받는다

# 설정 › BTS 연결 — 운영(admin) 계정만 (BTS-F3-01 반영 2026-10-31 · apps/admin/src/bts/routes.ts)
GET    /api/settings/projects/:projectId/bts
  → { linked, baseUrl, btsProject, botKeyTail, statusMap, resolutionMap, deployKey: { tail, createdAt } | null, ruleToken: { tail, createdAt } | null, publicUrl: string | null }   — 열쇠는 끝 4자리만 · publicUrl 은 PLATFORM_PUBLIC_URL(없으면 null — 화면이 브라우저 주소로 물러선다, BTS-F3-05)
  — statusMap 값은 BTS 상태 키, resolutionMap 값은 BTS 해결 사유 이름이다(outbox.ts 옮기기 · close.ts 닫기 사유)
  → 연결이 없으면 linked: false · 나머지 null · 짝은 {} · 404 NOT_FOUND(프로젝트 없음)
PUT    /api/settings/projects/:projectId/bts   { baseUrl, btsProject, botKey?, webhookSecret?, statusMap, resolutionMap }
  → 200 · 400 MAP_INCOMPLETE(짝이 빈 단계 · 빠진 단계) · 400 BTS_UNREACHABLE(저장 전에 BTS 를 한 번 불러 본다 — 「QA Hub AI」 열쇠로 GET <baseUrl>/api/v1/projects/<btsProject> 가 200 인지)
  → 400 SECRETS_REQUIRED(처음 연결인데 botKey 가 빠짐 — 고칠 때 빼면 저장한 원문을 그대로 쓴다). webhookSecret 은 처음 연결에 없으면 QA Hub 가 만든다 — BTS 자동 설정이 BTS 웹훅에 넣는다(BTS-F3-05)
  → 400 BOT_KEY_REQUIRED(baseUrl 을 바꾸면서 botKey 를 빼면 — 끝 4자리만 본 사람이 원문을 다른 주소로 못 보내게. settings/envs.ts 토큰 주소와 같은 판단) · 404 NOT_FOUND
  — baseUrl 은 끝 「/」를 떼고 호스트를 소문자로 맞춰 저장한다(글자 차이로 BOT_KEY_REQUIRED 가 나지 않게) · 물음표 · # 이 든 주소는 400 INVALID_REQUEST
DELETE /api/settings/projects/:projectId/bts   → 204 · 404 NOT_FOUND(프로젝트 없음) — 연결을 끊으면 그 프로젝트는 다시 지금처럼 돈다(맡은 이슈 · 짝 기록은 남긴다)
POST   /api/settings/projects/:projectId/bts/keys/:which   — which = deploy | rule. 새로 만들면 앞 열쇠는 끊긴다
  → 201 { key }   — 원문은 이 응답 한 번뿐 · 409 NOT_LINKED(연결 없음) · 404 NOT_FOUND(프로젝트 없음)
POST   /api/settings/projects/:projectId/bts/choices   { baseUrl, botKey? }   — 상태 매핑 고르개에 채울 목록 (BTS-F3-05 · bts/choices.ts)
  → 200 { statuses: [{ key, name }], resolutions: [{ name }] }   — BTS GET /api/v1/statuses · /api/v1/resolutions 를 그 열쇠로 부른다(로그인만 하면 읽힌다)
  → 400 BOT_KEY_REQUIRED(botKey 가 없는데 저장한 주소와 다르거나 연결 전) · 400 BTS_UNREACHABLE(둘 중 하나라도 200 이 아님 · 닿지 않음) · 400 INVALID_REQUEST(꼴)
  — 상태는 BTS 전체 목록이다. 그 프로젝트 워크플로 목록은 워크플로 고치기 권한이 들어 「QA Hub AI」 열쇠로 못 읽는다 — 그 프로젝트에 없는 상태를 고르면 보드 칸 · 상태 옮기기가 BTS 에서 깨진다
POST   /api/settings/projects/:projectId/bts/setup   — BTS 자동 설정 (BTS-F3-05 · bts/setup.ts). 누른 운영 계정의 통합계정 토큰(app_user.farm_token)으로 부른다
  → 200 { items: [{ what: 'WEBHOOK' | 'RULE_ASSIGNEE' | 'RULE_PR' | 'BOARD', ok, status? }] }   — status 는 BTS 가 준 상태 코드(0 은 닿지 않음). 하나가 막혀도 나머지는 한다. 보드가 하나도 없으면 BOARD 는 status 404(화면 「보드 없음」). 그 사이 연결이 끊겨 규칙 토큰을 못 만들면 규칙 둘은 status 409
  → 400 NO_PERSONAL_TOKEN(누른 사람 토큰 없음 · SSO 안 켠 설치) · 400 PUBLIC_URL_REQUIRED(PLATFORM_PUBLIC_URL 없음 — BTS 가 사설 주소를 거절한다) · 409 NOT_LINKED(연결 없음 — 없는 프로젝트도 같다) · 400 INVALID_REQUEST(프로젝트 번호 꼴)
  — 규칙 토큰(btr_)은 원문을 안 두므로 누를 때마다 새로 만든다(앞 토큰은 끊긴다). 그래서 BTS 규칙 목록을 읽은 뒤에만 만든다 — 권한이 없어 못 고치는데 토큰만 바꾸면 있던 규칙이 멈춘다
  — 웹훅 { name: 'QA Hub · <키>', url: <공개 주소>/api/bts/events/:projectId, eventFilter: ['issue.created', 'issue.transitioned'], secret: bts_link.webhook_secret, projectKey }
  — 규칙 { triggerType: ISSUE_ASSIGNED | PR_MERGED, actions: [CALL_WEBHOOK { url: <공개 주소>/api/bts/rules, headers: { X-QAHub-Token: btr_… } }] } · 보드 칸 { name: 그 상태 이름, stateKeys: [statusMap.QA_REVIEW] }
# 애플리케이션 코드 저장소 — 지금 PATCH /api/settings/services/:id 에 칸 하나 · 목록(GET /api/settings/services) 줄에도 실린다 (BTS-F3-01 반영 2026-10-31)
     { …, codeRepos: [{ name: '화면' | '서버' | string, url: 'https://github.com/…' }] }   — 비어도 된다 · 10줄까지 · url 은 https:// 만. 수정 AI 만 쓴다

# BTS 등록 다시 보내기 — 실행 결과 실패 카드 (BTS-F3-03 반영 2026-10-31 · apps/admin/src/bts/routes.ts · card.ts). (실행, write)
POST /api/runs/:runId/bts/resend   { tcId, env }
  → 202 — 그만둔 등록을 처음부터(횟수 0) 다시 세운다. 보내는 중 · 보낸 등록이거나 같은 테스트의 다른 등록이 기다리거나 열린 이슈가 있으면 그대로 둔다(그것이 정본이다 — 다시 세우면 이슈가 둘 된다)
    · 400 INVALID_REQUEST · 404 NOT_FOUND(그 실행 · tcId · 대상 서버의 등록 줄이 없음) · 409 NOT_LINKED
# 실패 카드 응답(리포팅.md §7 실패 카드 통로)에 칸 하나 — BTS 연결 프로젝트만. 없는 프로젝트는 칸이 없다 (BTS-F3-03 반영 2026-10-31 · apps/admin/src/bts/card.ts)
     bts: { issueKey: 'DM-12' | null, url | null, state: 'SENT' | 'SENDING' | 'GAVE_UP', reason: string | null, resolution: string | null } | null
     — state 는 그 카드(실행 · tcId · 대상 서버)의 CREATE 줄 상태다(PENDING → SENDING). 열린 이슈에 댓글만 단 실패는 그 이슈의 SENT · 댓글 줄 실패는 카드에 안 띄운다.
       차례는 이 실행의 등록(그만둔 것 빼고) · 댓글 > 다른 실행의 기다리는 등록(SENDING) > 열린 이슈(SENT) > 이 실행의 그만둔 등록(GAVE_UP). 보일 것이 없으면 null — 사람이 판정해 안 올림(아래 「같은 테스트가 또 실패하면」) · BTS 를 잇기 전 실행 · 실행 끝의 등록이 아직 안 섬. 화면은 null 이면 판정 줄을 안 그린다.
       url 은 `<BTS 주소>/issues/<키>` · resolution 은 bts_issue_case.resolution 값(SCREEN_RIGHT …)이다

# BTS 연결 프로젝트의 옛 판정 통로 — 「판정은 BTS 에서만」을 비켜 가지 못하게 (BTS-F3-04 반영 2026-10-31 · authoring/decisionRun.ts · routes.ts)
#   결정 진행 picks 에 실패(fail:…)가 있으면 400 BAD_DECISION — 버그 · 화면이 맞음 둘 다. 옛 POST /api/runs/:runId/bugs 는 2026-10-26 WEB-F6-05 에 지웠고 화면이 맞음 요청도 결정 진행 하나라 409 BTS_LINKED 를 낼 통로가 남지 않았다
#   사람 작성 요청 통로(AUTHOR · RERUN)가 params 에 testFix · issueKey · repo · draft 칸을 실으면 400 BAD_EDIT { detail: 'params.<칸>' }
#   사람의 다시 실행 통로는 PRD_DRAFT · NOTE · BUGFIX 줄을 400 BAD_KIND 로 막는다(에이전트 이어하기만) — 그 종류를 더하는 줄(F4-03 · F5-03 · F6-01)이 같이 한다

# 결정 목록(작성.md §7 「결정 목록 통로」) — BTS 연결 프로젝트만 갈라진다 (BTS-F3-04 · F5-04)
#   items 에 FAIL 이 안 실리고 failMore 는 0 이다(BTS-F3-04 반영 2026-10-31 · authoring/decisions.ts) · 새 항목 종류 PRD_DRAFT { requestId, issueKeys, rows: [{ op, reqId?, text, basis, issueKeys, sure }], e2e?: [...] }
#   진행 요청 picks 의 PRD_DRAFT 는 { requestId, rows: number[] }(고른 줄 차례 번호)

# 프로젝트 노트 보기 — (작성, read) 가 있는 애플리케이션이 하나라도 있는 사람 (BTS-F4-03)
GET /api/projects/:projectId/note
  → { version: 0 | n, sections: { overview, features, recent, fragile, tips, more }, savedAt | null, events: number }   — 판 0 이면 아직 없다 · events 는 쌓여 아직 안 반영된 사건 수

# 대시보드(리포팅.md §7 dashboard) 응답에 칸 하나 (BTS-F8-01)
     aiQuality: { draft: { picked, written }, fix: { merged, opened } } | null   — 고른 범위에 BTS 연결 프로젝트가 없으면 null

# 작성 에이전트 통로 — 에이전트 토큰 허용 목록(인증.md §7)에 더한다
#   집기(claim) 응답 kind 에 PRD_DRAFT · NOTE · BUGFIX 가 는다. 응답 mcpKey: 'mcj_…' 는 BTS.md 「열쇠 표」의 받는 줄에만(이 줄이 RUNNING 인 동안만 산다)
#   service 가 빈 줄(NOTE)은 문의 서비스 경계(auth/scope.ts 「번호로 그 행의 서비스」)가 project_id 로 배정을 본다 — 그 프로젝트 어느 애플리케이션의 (작성, write) 면 통과
POST /api/authoring/requests/:id/draft    { rows, e2e? }                  — PRD_DRAFT 결과 (BTS-F5-03)
POST /api/authoring/requests/:id/note     { sections }                    — NOTE 결과. 길이 상한을 넘으면 400 NOTE_TOO_LONG — 앞 버전이 남는다 (BTS-F4-03)
POST /api/authoring/requests/:id/bugfix   { prUrl } | { analysis }        — BUGFIX 결과. 서버가 BTS 「코드 리뷰」 · 담당자 변경 · 댓글을 보낼 줄에 넣는다 (BTS-F6-01)
GET  /api/authoring/requests/:id/bts      — 그 일의 이슈 글 · 댓글 · 첨부 고리. 자식이 BTS 열쇠를 안 갖게 서버가 「QA Hub AI」 열쇠로 대신 읽는다

# MCP — Streamable HTTP 하나 · 세션 없음 · 답은 JSON 한 덩어리 (BTS-F4-01 반영 2026-10-31 · apps/admin/src/mcp/server.ts · tools.ts · auth/pat.ts · mcj_ 는 BTS-F4-02 반영 2026-10-31 · mcp/jobKey.ts — note_read 는 F4-03)
#   열쇠: Authorization: Bearer <통합계정 PAT> | mcj_…. PAT 는 Auth whoami + 60초 기억. mcj_ 는 그 작성 요청이 RUNNING 이고 그 프로젝트일 때만
#   열쇠는 몸을 읽기 전에 본다. 없거나 틀리거나 계정이 꺼졌으면 401(WWW-Authenticate: Bearer) · Auth 에 못 닿으면 503 · 기억에 없는 PAT 로 한 곳에서 1분에 30번 넘게 Auth 를 두드리면 429 · GET · DELETE /mcp 는 405
POST /mcp
  도구: note_read { projectId } · prd_search { service, query } · map_search { service, reqId? | tcId? | url? } · bts_search { projectId, query? | issueKey? } · run_result { runId }
  — 조회만. 권한 검사는 화면 통로와 같은 함수 · 다른 프로젝트는 도구 오류 FORBIDDEN. 한 번에 30줄까지
  — 도구 오류 이름: FORBIDDEN(배정 · 칸 · 남의 키) · NOT_FOUND(없는 실행 · 지운 케이스 · 표준 기획서 없음 · BTS 404) · BAD_INPUT(찾을 칸이 다 빔) · NOT_LINKED · BTS_UNAUTHORIZED · BTS_UNREACHABLE · BTS_ERROR(그 밖의 BTS 답)
  — prd_search: 지금 판에서 요구 번호 · 기능 · 문장에 낱말이 든 요구 + 덮는 케이스 · map_search: 살아 있는 케이스마다 덮는 요구 · 거치는 화면(url 은 주소 일부 — 파일 안에서 여는 화면 open_urls 도 찾는다) · 남의 애플리케이션 케이스 번호는 FORBIDDEN
  — bts_search: PAT 요청이면 그 사람 PAT 로 BTS 를 부른다 — issueKey 는 GET /api/v1/issues/<키>(이은 BTS 프로젝트 키로 시작해야 한다), query 는 POST /api/v1/search/aql { text ~ "<낱말>" }. 이은 BTS 가 없으면 NOT_LINKED · BTS 가 PAT 를 거절하면 BTS_UNAUTHORIZED
  — run_result: 실행 결과 화면의 GET /api/runs/:runId 몸(케이스 실행만) — items 는 실패를 앞에 두고 30줄, itemsTotal 에 전체 수
```

```
[계약 변경 필요]
대상:    Admin API — 프로젝트 배포 신호 · BTS 알림 · BTS 규칙 웹훅 호출 · 설정 › BTS 연결 · 설정 서비스 codeRepos · BTS 다시 보내기 · 실패 카드 bts 칸 · 결정 목록 PRD_DRAFT 와 BTS 연결이면 FAIL 뺌 · 노트 보기 · 대시보드 aiQuality · 작성 에이전트 통로 넷과 집기 mcpKey · NOTE 줄의 서비스 경계 · 옛 판정 통로 409 · 사람 다시 실행 BAD_KIND · BTS 연결 프로젝트의 POST /api/builds 는 실행을 안 건다 · /mcp
현재:    BTS 와 주고받는 통로가 없다. 바깥 열쇠는 CI 토큰 하나 · 작성 집기 kind 는 AUTHOR · RERUN · MERGE · EDIT
제안:    위 §7 꼴
이유:    도메인/BTS §3.12 (2026-10-28 기획 · BTS-F1-01 시작 질문 승인 2026-10-31)
영향:    WS-B(배포 신호 · 다시 보내기) · WS-F(설정 · 열쇠 · PAT · 문 허용 목록) · WS-작성(결정 목록 · 에이전트 통로) · WS-D(실패 카드 · 대시보드) · WS-E(화면) · 작성 에이전트 · 새 bts/ · mcp/ · projectNote/
반영:    설정 › BTS 연결 · 설정 서비스 codeRepos (2026-10-31, apps/admin/src/bts/routes.ts — BTS-F3-01) · BTS 알림 · BTS 규칙 웹훅 호출 (2026-10-31, apps/admin/src/bts/inbound.ts — BTS-F3-02) · BTS 다시 보내기 · 실패 카드 bts 칸 (2026-10-31, apps/admin/src/bts/card.ts — BTS-F3-03) · 결정 목록 FAIL 뺌 · 옛 판정 통로(BAD_DECISION · BAD_EDIT) (2026-10-31, authoring/decisions.ts · decisionRun.ts · routes.ts — BTS-F3-04) · 설정 › BTS 연결 publicUrl · 처음 연결의 webhookSecret 선택(SECRETS_REQUIRED 는 botKey 만) · 고를 목록 · 자동 설정 · 규칙 몸 assignee? · prTitle? (2026-10-31, apps/admin/src/bts/routes.ts · link.ts · choices.ts · setup.ts · inbound.ts — BTS-F3-05) · /mcp 의 PAT 열쇠와 도구 넷(note_read 빼고) (2026-10-31, apps/admin/src/mcp/server.ts · tools.ts · auth/pat.ts — BTS-F4-01) · /mcp 의 mcj_ 와 집기 mcpKey(AUTHOR · 그 RERUN 만 — 나머지 받는 줄은 그 종류를 만드는 줄이 더한다) (2026-10-31, apps/admin/src/mcp/jobKey.ts · authoring/agentRoutes.ts — BTS-F4-02). 나머지는 진행판 줄마다
상태:    대기
```

---

### 8.15 BTS 화면 (2026-10-31 · BTS-F1-01 — 모양은 각 줄의 시안이 정한다)

화면을 바꾸는 줄은 시안을 먼저 보이고 고르게 한다. 여기는 무엇이 어디에 서는지만 적는다.

#### 설정 › BTS 연결 (BTS-F3-05)

설정 메뉴의 프로젝트 줄 아래 「BTS 연결」 한 줄 — 주소 `#/settings/project-<번호>-bts`([인증.md](인증.md) §8.8 「프로젝트」). 운영(admin) 계정만 본다.
시안 B 3판(2026-10-31 사용자 — 따로 한 화면 · 차례 셋 · BTS 쪽은 자동 설정 · 번역 말투 문구를 다시 씀). `apps/admin/src/web/SettingsBts.tsx`

```
│ 데모마켓 › BTS 연결  [연결됨 · DM]                                   │
│ [✓ 연결 정보 입력] [✓ BTS 자동 설정] [3 배포 스크립트 한 줄]          │
│ ┌ 1 · 연결 정보 — BTS 주소 · BTS 프로젝트 키 · 「QA Hub AI」 계정 토큰 ┐ │
│ ├ 상태 매핑 — [BTS 에서 불러오기]  QA 검토 [QA Review ▾] … 해결 사유 ┤ │
│ ├ 코드 저장소 — 웹 MKW  화면 https://github.com/…  [+ 저장소 추가]   ┤ │
│ ├ 2 · BTS 자동 설정 — ✓ 웹훅 · ✓ 담당자 변경 규칙 · ✓ PR 병합 규칙 · ✓ 보드 「QA 검토」 칸 ┤ │
│ │                    [연결 해제]  [저장하고 BTS 자동 설정]           │ │
│ └ 3 · 배포 스크립트 한 줄 — 배포 알림 토큰 [발급]  curl … [복사]      ┘ │
```

- 상태 매핑은 BTS 에서 불러온 고르개다 — 상태는 키, 해결 사유는 이름을 저장한다. 이은 프로젝트는 열 때 저장한 토큰으로 바로 불러온다. 못 불러오면 까닭 한 줄과 글 칸으로 물러선다. 저장해 둔 값이 목록에 없어도 고르개에 남는다
- [저장하고 BTS 자동 설정] 하나로 연결 저장(BTS 를 한 번 불러 프로젝트 키를 확인 — 실패면 저장 안 됨 · 까닭 한 줄) → 바뀐 애플리케이션의 코드 저장소 → 자동 설정(§3.12 「설정 · 고장 대응」). 결과는 넷마다 ✓ · ✕ 와 까닭(권한 없음 · 접속하지 못함 · 실패 (코드)). 웹훅이 권한 없음이면 「웹훅은 BTS 시스템 관리자만 만들 수 있습니다 …」 한 줄
- 내 통합계정 토큰이 없으면 「내 계정에 통합계정 토큰이 없습니다. 왼쪽 아래 내 메뉴 › 통합계정 토큰에 넣은 뒤 다시 눌러 주세요」
- 배포 알림 토큰 원문은 발급 직후 한 번만 보인다(CI 토큰 구획과 같다 — [인증.md](인증.md) §8.8 「CI 토큰」). 원문은 그 자리에서 `deploy.sh` 한 줄에 들어가고, 아니면 `<배포 알림 토큰>` 자리로 남는다. 주소는 publicUrl, 없으면 브라우저 주소
- 연결 해제는 확인 창 — 「연결을 해제하면 이 프로젝트의 실패 판정은 QA Hub 에서 합니다」
- 화면의 「BTS」 글자는 `apps/admin/src/web/btsName.ts` 한 곳에서 읽는다 — 제품 이름이 바뀌면 그 한 줄만 고친다(2026-10-31 사용자). 서버가 만드는 글 · 명세는 이름이 정해진 뒤 한 번에 바꾼다

#### 결정 필요 「PRD 초안」 카드 (BTS-F5-04)

테스트 작성 「결정 필요」 ② 묶음 앞에 선다([작성.md](작성.md) §3.6 「★ 결정 목록」). 카드 하나 = 같은 요구를 건드리는 이슈 묶음 하나.
질문 「배포된 기능 N건으로 기획서를 고칠까요?」 아래에 이슈 고리(DM-12 · 제목)와 줄마다 체크 · 「새로 · 바뀜 · 지움」 · 요구 번호 · 문장 · 근거.
「? 확인」 줄은 꼬리표를 달고 [모두 체크]가 안 체크한다. E2E 제안이 있으면 카드 아래 한 줄로 고른다. 권한은 ② 의 다른 항목과 같다(`(작성, write)`)

#### 실행 결과 실패 카드 (BTS-F3-03 · F3-04)

- 판정 줄 자리 — BTS 연결 프로젝트는 「BTS DM-12 에서 확인 중」 + 고리. 닫혔으면 사유를 덧붙인다(「BTS DM-12 · 테스트 문제로 닫힘」). 「화면이 맞음으로 바꾸기」가 없다. 보일 등록이 없으면(`bts: null` — 판정으로 안 올림 · 연결 전 실행 · 아직 안 넣음) 판정 줄을 그리지 않는다 — 까닭을 하나로 못 집는다(BTS-F3-04 반영 · `web/RunFailJudge.tsx` — 항목 상세의 판정 줄도 같다)
- 등록을 그만뒀으면 같은 자리에 실패 색 없이 「BTS 등록 실패 · <까닭>」 + [다시 보내기](`(실행, write)` 가 없으면 단추 없이 글자만). 보내는 중이면 「BTS 에 보내는 중」

#### 노트 보기 (BTS-F4-03)

한 장짜리 읽기 화면이다 — 여섯 칸 차례 · 머리에 「마지막 고친 때」와 판 번호 · 「쌓인 사건 N건 — 다음 노트 고치기에 반영됩니다」. 고치는 단추가 없다(결정 13 — 틀린 곳은 애플리케이션 가이드에 쓴다는 안내 한 줄과 가이드 고리).
메뉴 자리는 그 줄의 시안에서 고른다

#### 대시보드 두 숫자 (BTS-F8-01)

대시보드(앱 — [리포팅.md](리포팅.md) §8.12) 「검토할 것」 아래 한 줄 칸 「AI 품질」 — 「초안 AI 82% (41/50줄)」 · 「수정 AI 60% (3/5 PR)」. `aiQuality` 가 null 이면 칸이 없다
