// 경로(틀 + 메서드)마다 필요한 권한 표와 에이전트 토큰 통로. 문(gate.ts)이 읽는다 (SPEC 도메인/인증 §7)

import type { 기능, 필요칸 } from './permissions.js';

/** 등급을 안 따지는 자리. 문이 그 앞에서 이미 돌려보낸다 */
export const 안따짐 = '안따짐';
// trial 은 실행 칸에만 있다 — 다른 기능에 적으면 타입이 막는다
export type 권한값 = { 기능: 'runs'; 칸: 필요칸 } | { 기능: Exclude<기능, 'runs'>; 칸: 'read' | 'write' } | 'admin';
export type 표값 = 권한값 | typeof 안따짐;

const 케이스읽기 = { 기능: 'cases', 칸: 'read' } as const;
const 케이스쓰기 = { 기능: 'cases', 칸: 'write' } as const;
const 실행읽기 = { 기능: 'runs', 칸: 'read' } as const;
const 실행쓰기 = { 기능: 'runs', 칸: 'write' } as const;
// 테스트 모드 시작 — 기록이 안 남는 실행이라 보기 + 테스트 모드인 trial 도 연다 (SPEC 도메인/인증 §3.5 「테스트 모드」)
const 테스트모드 = { 기능: 'runs', 칸: 'trial' } as const;
const 작성읽기 = { 기능: 'authoring', 칸: 'read' } as const;
const 작성쓰기 = { 기능: 'authoring', 칸: 'write' } as const;

/**
 * **경로→권한 표** (SPEC 도메인/인증 §7 「등급으로 갈리는 자리」가 정본이다).
 *
 * ★ **키는 「틀 + 메서드」다.** 한 틀이 메서드마다 다른 권한을 갖는 자리가 실제로 있다 —
 * `/api/catalog/scan` · `/api/runs` · `/api/cases/:tcId/param-sets` 셋이 `GET` 과 쓰기로 갈린다.
 * 틀 하나로 잡으면 셋이 한 값으로 뭉개진다.
 *
 * ★ **표에 없으면 `admin` 이다** — `scope.ts` 의 「모르면 막는다」와 같은 방향이다.
 * 새 통로를 낼 때마다 그 자리에서 403 으로 빨개진다. 시끄럽지만 안전하다.
 *
 * 기능은 경로 접두사가 정한다(예외는 `gate.test.ts` 의 접두사예외) — 그 검사가 표와 대조한다. 옛 viewer·operator 는
 * 기능 셋을 한꺼번에 가져서 엉뚱한 기능에 묶어도 옛 등급 대조로는 안 드러난다.
 */
export const 등급표: Record<string, 표값> = {
  // 로그인·로그아웃·나를 묻기는 문이 권한 판정 앞에서 돌려보낸다.
  // 권한이 없는 사람도 로그아웃은 해야 한다 (gate.ts 인증등록 참조)
  'POST /api/auth/login': 안따짐,
  'POST /api/auth/logout': 안따짐,
  'GET /api/auth/me': 안따짐,
  // 본인 비밀번호 바꾸기 — 라우트가 로그인을 직접 확인한다 (auth/routes.ts)
  'POST /api/auth/password': 안따짐,
  // 가입은 로그인 없이 지나간다. 만드는 것은 아무것도 못 하는 승인 대기 계정뿐이다 (인증 §7 「인증 적용 범위」)
  'POST /api/auth/signup': 안따짐,
  // 로그인 화면이 그릴 모양 · maxihan 계정 로그인 왕복. 셋 다 로그인 없이 지나간다 (auth/sso.ts)
  'GET /api/auth/methods': 안따짐,
  'GET /api/auth/sso/start': 안따짐,
  'GET /api/auth/sso/callback': 안따짐,
  // Auth_platform 서버가 부른다. logout_token 의 서명이 문이다 (auth/sso.ts — 도메인/인증 §7 「back-channel 로그아웃」)
  'POST /api/auth/backchannel-logout': 안따짐,

  'GET /api/catalog/cases': 케이스읽기,
  'GET /api/catalog/export': 케이스읽기,
  'GET /api/catalog/cases/:tcId': 케이스읽기,
  'GET /api/catalog/scan': 케이스읽기,
  'GET /api/cases/:tcId/param-sets': 케이스읽기,
  'GET /api/cases/:tcId/source': 케이스읽기,
  'POST /api/catalog/scan': 케이스쓰기,
  'POST /api/cases/:tcId/param-sets': 케이스쓰기,
  'DELETE /api/param-sets/:id': 케이스쓰기,
  'PUT /api/cases/:tcId/saved-input': 케이스쓰기,
  'DELETE /api/cases/:tcId/saved-input': 케이스쓰기,
  'PUT /api/cases/:tcId/smoke': 케이스쓰기,

  // 주소는 케이스 아래지만 내용은 실행 결과 이력이다 (execution/routes.ts). 케이스 read 로 열면 실행을 못 보는 사람에게 결과가 샌다
  'GET /api/cases/:tcId/history': 실행읽기,
  'GET /api/cases/:tcId/rerun-target': 실행읽기,
  // 메모리에만 남는 시험 실행. 결과는 시작한 사람만 읽는다(execution/trial.ts)
  'POST /api/cases/:tcId/test-run': 테스트모드,
  'GET /api/cases/:tcId/test-run/:trialId': 실행읽기,
  // 도는 테스트 모드의 장면 한 장 — 결과 읽기와 같다 (도메인/실행 §3.2 「테스트 모드」)
  'GET /api/cases/:tcId/test-run/:trialId/live': 실행읽기,
  // 시험 실행 중단 — 시작과 같은 칸이고 시작한 사람만이다(execution/trialRoutes.ts) (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」)
  'POST /api/cases/:tcId/test-run/:trialId/abort': 테스트모드,
  'GET /api/evidence/:id': 실행읽기,
  'GET /api/runs': 실행읽기,
  'GET /api/runs/last-by-case': 실행읽기,
  // 주소에 기능 접두사가 없지만 돌려주는 것이 실행 결과 집계다. 커버리지 칸만 라우트가 작성 read 로 따로 거른다 (인증 §7)
  'GET /api/dashboard': 실행읽기,
  // 대시보드와 같다 — 문은 배정 중 하나라도 실행 read 인지만 보고, 작성 요청은 라우트가 작성 read 인 서비스만 거른다 (notifications/routes.ts)
  'GET /api/notifications': 실행읽기,
  'GET /api/runs/:runId': 실행읽기,
  'GET /api/runs/:runId/insights': 실행읽기,
  'GET /api/runs/:runId/failures': 실행읽기,
  'GET /api/runs/:runId/items/:historyId': 실행읽기,
  'GET /api/runs/:runId/progress': 실행읽기,
  'GET /api/runs/:runId/items/:historyId/farm/:name': 실행읽기,
  'GET /api/runs/:runId/items/:historyId/farm-video': 실행읽기,
  // 도는 정식 실행 항목의 장면 — 기록이 남는 실행이라 시작한 사람만이 아니라 그 실행을 볼 수 있는 사람 모두다
  'GET /api/runs/:runId/items/:historyId/live': 실행읽기,
  'GET /api/screenshots/:runId/:historyId/:seq.png': 실행읽기,
  'POST /api/runs': 실행쓰기,
  'POST /api/runs/:runId/abort': 실행쓰기,
  'POST /api/runs/:runId/evidence': 실행쓰기,
  'POST /api/runs/:runId/bts/resend': 실행쓰기,

  // E2E 시나리오는 실행 칸을 쓴다 (도메인/시나리오 §7 · 인증 §7 「등급으로 갈리는 자리」)
  'GET /api/scenarios': 실행읽기,
  'GET /api/scenarios/:id': 실행읽기,
  'GET /api/scenarios/:id/versions/:v': 실행읽기,
  'GET /api/scenarios/case-parts/:tcId': 실행읽기,
  'GET /api/scenarios/next-cases': 실행읽기,
  'POST /api/scenarios': 실행쓰기,
  'POST /api/scenarios/link-suggestions': 실행쓰기,
  'POST /api/scenarios/flow-suggestions': 실행쓰기,
  'GET /api/scenarios/flow-suggestions/:jobId': 실행읽기,
  'PUT /api/scenarios/:id': 실행쓰기,
  'POST /api/scenarios/:id/restore': 실행쓰기,
  'POST /api/scenarios/:id/archive': 실행쓰기,
  'POST /api/scenarios/:id/runs': 실행쓰기,
  'GET /api/runs/:runId/scenario': 실행읽기,
  'GET /api/runs/:runId/scenario/screenshots/:seq': 실행읽기,
  'GET /api/runs/:runId/scenario/farm/:name': 실행읽기,
  // 도는 E2E 정식 실행의 장면 — 항목 장면과 같은 까닭으로 그 실행을 볼 수 있는 사람 모두다
  'GET /api/runs/:runId/scenario/live': 실행읽기,
  // trial 이 쓸 수 있는 조립은 라우트가 더 거른다 — API 호출 · 모킹 단계는 저장된 시나리오에 있는 것만 (scenario/trialGuard.ts)
  'POST /api/scenario-trials': 테스트모드,
  'GET /api/scenario-trials/:trialId': 실행읽기,
  'GET /api/scenario-trials/:trialId/screenshots/:seq': 실행읽기,
  'GET /api/scenario-trials/:trialId/live': 실행읽기,
  // 시험 실행 중단 — 시작과 같은 칸이다. 시작한 사람만 닿는다 (도메인/인증 §7 「시험 실행 중단」)
  'POST /api/scenario-trials/:trialId/abort': 테스트모드,

  'GET /api/authoring/requests': 작성읽기,
  'GET /api/authoring/requests/:id': 작성읽기,
  'GET /api/authoring/requests/:id/assets/:assetId': 작성읽기,
  'POST /api/authoring/requests': 작성쓰기,
  'POST /api/authoring/requests/claim': 작성쓰기,
  'PATCH /api/authoring/requests/:id/stage': 작성쓰기,
  'POST /api/authoring/requests/:id/screenshots': 작성쓰기,
  'POST /api/authoring/requests/:id/finish': 작성쓰기,
  'POST /api/authoring/requests/:id/assets': 작성쓰기,
  'POST /api/authoring/requests/:id/submit': 작성쓰기,
  'POST /api/authoring/requests/:id/stop': 작성쓰기,
  'POST /api/authoring/requests/:id/discard': 작성쓰기,
  // 역방향 산출물 — 작성 에이전트가 부른다 (인증 §7 「등급으로 갈리는 자리」)
  'POST /api/authoring/requests/:id/outputs': 작성쓰기,
  // 토큰 사용량 — 작성 에이전트가 부른다 (작성 §7 「토큰 사용량」)
  'POST /api/authoring/requests/:id/usage': 작성쓰기,
  // 노트 고치기 결과 — 작성 에이전트가 부른다 (도메인/BTS §7)
  'POST /api/authoring/requests/:id/note': 작성쓰기,
  // PRD 초안 결과 — 작성 에이전트가 부른다 (도메인/BTS §7)
  'POST /api/authoring/requests/:id/draft': 작성쓰기,
  'POST /api/authoring/requests/:id/bugfix': 작성쓰기,
  // 닫을 PR — 다시 배포로 거둔 롤백 되돌림 요청의 PR. 작성 에이전트가 쉬는 틈에 부른다 (도메인/BTS §7 · bts/rollbackRoutes.ts)
  'GET /api/authoring/requests/closing': 작성쓰기,
  'POST /api/authoring/requests/:id/closed': 작성쓰기,
  // 수정 PR 상태 — 수정 AI 가 연 PR 의 병합 · 닫힘. 작성 에이전트가 쉬는 틈에 부른다 (도메인/BTS §7 · bts/qualityRoutes.ts)
  'GET /api/authoring/requests/bugfix-prs': 작성쓰기,
  'POST /api/authoring/requests/:id/pr-state': 작성쓰기,
  // 보류 케이스에 사람이 값을 넣거나 제거한다 — 화면이 부른다 (작성 §3.6 「★ 보류 케이스」)
  'PUT /api/authoring/requests/:id/held/:tcId': 작성쓰기,
  'DELETE /api/authoring/requests/:id/held/:tcId': 작성쓰기,
  // 반영 때 겹친 케이스 고르기 — 보류 값 넣기와 같은 무게. 반영 자체는 아래 merges 가 admin 으로 본다 (작성 §3.6 「★ 반영 때 겹침 검사」)
  'PUT /api/authoring/requests/:id/conflicts/:tcId': 작성쓰기,
  'DELETE /api/authoring/requests/:id/conflicts/:tcId': 작성쓰기,
  // 케이스 고치기 — 결과가 초안 PR 이라 작성 요청과 무게가 같다. 병합은 아래 merges 가 admin 으로 따로 본다 (작성 §3.6 「★ 케이스 고치기」)
  'POST /api/authoring/edits': 작성쓰기,
  // 결정 목록 — 항목마다 더 드는 권한(반영은 admin · 실행 read · write)은 라우트가 본다 (작성 §7 「결정 목록 통로」 · 인증 §7)
  'GET /api/authoring/decisions': 작성읽기,
  'POST /api/authoring/decisions/run': 작성쓰기,
  'POST /api/authoring/decisions/skip-screen': 작성쓰기,
  // 표준 기획서 — 주소에 authoring 이 없지만 작성 기능이다. 반영 PR 의 병합은 아래 merges 가 admin 으로 따로 본다 (작성 §7 「표준 기획서 통로」)
  'GET /api/prd': 작성읽기,
  'GET /api/prd/versions': 작성읽기,
  'GET /api/prd/versions/:version': 작성읽기,
  'GET /api/prd/export': 작성읽기,
  'GET /api/prd/apis': 작성읽기,
  'PUT /api/prd': 작성쓰기,
  'POST /api/prd/revert': 작성쓰기,
  // 표준 기획서 읽기 · 올리기 — 작성 에이전트가 부른다. 라우트가 맥 계정 · 집은 쪽을 다시 본다
  'GET /api/authoring/requests/:id/prd': 작성쓰기,
  'POST /api/authoring/requests/:id/prd': 작성쓰기,
  // 화면 기록 읽기 · 올리기 — 작성 에이전트가 부른다. 본문을 읽는 사람 통로는 없다 (작성 §7 「표준 기획서 통로」)
  'GET /api/authoring/requests/:id/screens': 작성쓰기,
  'PUT /api/authoring/requests/:id/screens': 작성쓰기,
  'POST /api/authoring/requests/:id/screens/done': 작성쓰기,
  // 화면이 맞음 건의 실패 trace 받기 — 작성 에이전트가 부른다. 라우트가 그 요청에 실린 실행 · 케이스인지 다시 본다 (작성 §3.6 「관문이 빨개지면」)
  'GET /api/authoring/requests/:id/trace': 작성쓰기,
  // 서비스 지도 읽기 — 작성 에이전트가 부른다. 자식이 기다릴 API 를 고른다 (작성 §3.6 「서비스 지도」)
  'GET /api/authoring/requests/:id/apis': 작성쓰기,
  // 게임 지도 올리기 · 읽기 — 작성 에이전트가 부른다. 지도는 화면에 보이지 않는다 (도메인/게임 §7)
  'PUT /api/authoring/requests/:id/game-elements': 작성쓰기,
  'GET /api/authoring/requests/:id/game-map': 작성쓰기,
  // 서비스 가이드 — 주소에 authoring 이 없지만 작성 기능이다. 보기는 작성 read, 고치기는 작성 write (작성 §7 「서비스 가이드 통로」)
  'GET /api/guide': 작성읽기,
  'GET /api/guide/versions': 작성읽기,
  'GET /api/guide/versions/:version': 작성읽기,
  'GET /api/guide/files/:fileId': 작성읽기,
  'GET /api/guide/files/:fileId/text': 작성읽기,
  'GET /api/guide/files/:fileId/pdf': 작성읽기,
  'PUT /api/guide': 작성쓰기,
  'POST /api/guide/files': 작성쓰기,
  'DELETE /api/guide/files/:fileId': 작성쓰기,
  // API 문서 — 주소에 authoring 이 없지만 작성 기능이다. 보기는 작성 read, 올리기 · 받기는 작성 write (도메인/API §7)
  'GET /api/services/:id/api-docs': 작성읽기,
  'GET /api/services/:id/api-docs/:version': 작성읽기,
  'GET /api/services/:id/api-docs/compare': 작성읽기,
  'GET /api/services/:id/api-coverage': 작성읽기,
  'POST /api/services/:id/api-docs': 작성쓰기,
  'POST /api/services/:id/api-docs/fetch': 작성쓰기,

  // 서비스 가이드 받기 — 작성 에이전트가 부른다. 다른 에이전트 통로와 같은 무게다
  'GET /api/authoring/requests/:id/guide': 작성쓰기,
  'GET /api/authoring/requests/:id/guide/files/:fileId': 작성쓰기,
  // 앱 · 게임 첫 화면 받기 — 작성 에이전트가 AI 를 띄우기 전에 부른다. 폰 옆 러너를 대신 부르는 중계다
  'GET /api/authoring/requests/:id/app-screen': 작성쓰기,
  'GET /api/authoring/requests/:id/game-screen': 작성쓰기,
  // 앱 링크만 다시 받기 — 서명 링크가 2시간이라 작성 동안 에이전트가 30분마다 부른다. 폰은 안 잡는다
  'GET /api/authoring/requests/:id/app-link': 작성쓰기,

  // ★ 저장소를 영구히 바꾸는 일 — admin. 작성 쓰기와 같으면 「실행할 수 있는 사람 = 저장소를 고칠 수 있는 사람」이 된다
  'POST /api/authoring/merges': 'admin',

  'GET /api/settings/projects': 'admin',
  'POST /api/settings/projects': 'admin',
  'PATCH /api/settings/projects/:id': 'admin',
  'GET /api/settings/projects/:id/api-servers': 'admin',
  'PUT /api/settings/projects/:id/api-servers': 'admin',
  'GET /api/settings/projects/:projectId/bts': 'admin',
  'PUT /api/settings/projects/:projectId/bts': 'admin',
  'DELETE /api/settings/projects/:projectId/bts': 'admin',
  'POST /api/settings/projects/:projectId/bts/keys/:which': 'admin',
  'POST /api/settings/projects/:projectId/bts/choices': 'admin',
  'POST /api/settings/projects/:projectId/bts/setup': 'admin',
  'GET /api/settings/services': 'admin',
  'POST /api/settings/services': 'admin',
  'PATCH /api/settings/services/:id': 'admin',
  'GET /api/settings/services/:id/viewport': 'admin',
  // CI 토큰 발급 · 목록 · 끊기 (도메인/실행 §3.11)
  'POST /api/settings/services/:id/tokens': 'admin',
  'GET /api/settings/services/:id/tokens': 'admin',
  'DELETE /api/settings/services/:id/tokens/:tokenId': 'admin',
  'GET /api/settings/users': 'admin',
  'POST /api/settings/users': 'admin',
  'PATCH /api/settings/users/:username': 'admin',
  'DELETE /api/settings/users/:username': 'admin',
  'POST /api/settings/users/:username/approve': 'admin',
  'POST /api/settings/users/:username/password': 'admin',
  'POST /api/settings/users/:username/agent-token': 'admin',
  'DELETE /api/settings/users/:username/agent-token': 'admin',

  // 성능 테스트 (도메인/성능 §7) — 보기는 실행 read, 만들기 · 실행 · 중단은 실행 write. 부하를 거는 일은 실행을 거는 일과 같은 무게다
  'GET /api/perf/scenarios': 실행읽기,
  'POST /api/perf/scenarios': 실행쓰기,
  'GET /api/perf/scenarios/:id': 실행읽기,
  'PUT /api/perf/scenarios/:id': 실행쓰기,
  'DELETE /api/perf/scenarios/:id': 실행쓰기,
  // 정기 실행을 켜고 끄는 일은 admin 만이다 (도메인/성능 §7 「정기 실행」)
  'PUT /api/perf/scenarios/:id/schedule': 'admin',
  'POST /api/perf/runs': 실행쓰기,
  'GET /api/perf/runs': 실행읽기,
  'GET /api/perf/runs/:id': 실행읽기,
  'GET /api/perf/runs/:id/series': 실행읽기,
  'GET /api/perf/runs/:id/hosts': 실행읽기,
  'GET /api/perf/runs/:id/events': 실행읽기,
  'GET /api/perf/runs/:id/pages': 실행읽기,
  'POST /api/perf/pages/measure': 실행쓰기,
  'GET /api/perf/runs/:id/devices': 실행읽기,
  'GET /api/perf/runs/:id/videos/:serial/:name': 실행읽기,
  'GET /api/perf/devices': 실행읽기,
  'POST /api/perf/devices/measure': 실행쓰기,
  // 호환성 세트 · 디바이스 (도메인/호환성 §7 · 인증 §7). 미리 셈은 저장하지 않아 읽기다
  'GET /api/compat-sets': 실행읽기,
  'POST /api/compat-sets': 실행쓰기,
  'POST /api/compat-sets/preview': 실행읽기,
  'GET /api/compat-sets/:id': 실행읽기,
  'PUT /api/compat-sets/:id': 실행쓰기,
  'DELETE /api/compat-sets/:id': 실행쓰기,
  'POST /api/compat-sets/:id/runs': 실행쓰기,
  'GET /api/compat-runs/:runId': 실행읽기,
  'GET /api/compat-runs/:runId/screens/:screenId/image': 실행읽기,
  'PUT /api/compat-runs/:runId/verdicts': 실행쓰기,
  'GET /api/compat-devices': 실행읽기,
  'GET /api/perf/runs/:id/report.pdf': 실행읽기,
  'POST /api/perf/runs/:id/stop': 실행쓰기,
  'POST /api/perf/runs/:id/analysis': 실행쓰기,
  // 시나리오 초안 · 추천은 만들기와 같은 무게다. AI 일 결과는 실행 read 로 본다 (PERF-F1-04)
  'POST /api/perf/scenarios/draft': 실행쓰기,
  'POST /api/perf/suggest': 실행쓰기,
  'GET /api/perf/ai-jobs/:id': 실행읽기,
  // 안정화 지표 (인증 §7 「등급으로 갈리는 자리」 안정화 두 줄 · 도메인/안정화 §7)
  'GET /api/stability': 실행읽기,
  'GET /api/stability/errors/:id': 실행읽기,
  'POST /api/stability/errors/:id/resolve': 실행쓰기,
  'POST /api/stability/errors/:id/issue': 실행쓰기,
  // 애플리케이션 QA 리포트 보기 (인증 §7 「등급으로 갈리는 자리」 QA 리포트 보기 · 받기 · 도메인/리포팅 §7 「QA 리포트 통로」)
  'GET /api/qa-reports': 실행읽기,
  'GET /api/qa-reports/:id': 실행읽기,
  'GET /api/qa-reports/:id/file': 실행읽기,
  'GET /api/runs/:runId/qa-report': 실행읽기,
  'GET /api/perf/runs/:id/qa-report': 실행읽기,
  // 승인은 칸이 아니라 admin 이다. 수행자는 admin 이어도 못 한다 — 라우트가 본다 (도메인/인증 §7 · 리포팅 §3.17 결정 11)
  'POST /api/qa-reports/:id/approve': 'admin',
  // 정기 실행 세트 (인증 §7 「등급으로 갈리는 자리」 정기 실행 두 줄 · 도메인/정기실행 §7). 문은 어딘가의 실행 칸만 보고, 그 프로젝트의 칸은 라우트가 본다
  'GET /api/sched/sets': 실행읽기,
  'GET /api/sched/sets/:id': 실행읽기,
  'POST /api/sched/sets': 실행쓰기,
  'PUT /api/sched/sets/:id': 실행쓰기,
  'PATCH /api/sched/sets/:id': 실행쓰기,
  'GET /api/sched/calendar': 실행읽기,
  'GET /api/sched/candidates': 실행읽기,
  // 작성 에이전트가 부른다 — 라우트가 작성 에이전트 계정인지 따로 본다 (§7 「누가 집나」)
  'POST /api/perf/ai-jobs/claim': 작성쓰기,
  'POST /api/perf/ai-jobs/:id/finish': 작성쓰기,
  // Scout 화면 통로 — 로그인만 보고 그 프로젝트 배정은 라우트가 본다. 기능 칸은 안 본다 — 답에 쓰는 도구가 질문한 사람의 칸으로 따로 본다 (도메인/챗봇 §7 · 아래 배정은라우트가)
  'GET /api/chat': 안따짐,
  'DELETE /api/chat': 안따짐,
  'POST /api/chat/questions': 안따짐,
  'GET /api/chat/questions/:id/stream': 안따짐,
  'POST /api/chat/questions/:id/stop': 안따짐,
  // 작성 서버가 부른다 — 라우트가 작성 에이전트 계정인지 따로 본다(성능 AI 일과 같은 규칙). 가져가기는 프로젝트를 가리지 않는다 (결정 17)
  'POST /api/chat/agent/claim': 작성쓰기,
  'POST /api/chat/agent/questions/:id/chunks': 작성쓰기,
  'POST /api/chat/agent/questions/:id/finish': 작성쓰기,
  // 에이전트 목록은 마법사가 고르므로 실행 read 다. 붙이고 고치고 지우는 일은 admin (§3.9 결정 15)
  'GET /api/perf/agents': 실행읽기,
  'POST /api/perf/agents': 'admin',
  'PATCH /api/perf/agents/:id': 'admin',
  'DELETE /api/perf/agents/:id': 'admin',
  // 더미 클라이언트 — 목록은 마법사가 고르므로 실행 read, 올리고 지우는 일은 admin (회사가 준 실행 파일이라 대상 밖을 두드려도 막지 못한다 — §3.9 「게임 서버 부하」)
  'GET /api/perf/dummy-clients': 실행읽기,
  'POST /api/perf/dummy-clients': 'admin',
  'DELETE /api/perf/dummy-clients/:id': 'admin',
  // 에이전트가 부르는 통로 — 문이 pga_ 토큰으로만 판정하고 권한 판정 앞에서 돌려보낸다 (gate.ts 성능에이전트문)
  'POST /api/perf/agent/hello': 안따짐,
  'POST /api/perf/agent/claim': 안따짐,
  'POST /api/perf/agent/runs/:runId/metrics': 안따짐,
  'POST /api/perf/agent/runs/:runId/done': 안따짐,
  'GET /api/perf/agent/dummy-clients/:id': 안따짐,
  // 빌드 올리기는 CI 토큰으로만, APK 내려받기는 서명으로만 — 문이 권한 판정 앞에서 돌려보낸다 (gate.ts · settings/serviceTokens.ts)
  'POST /api/builds': 안따짐,
  'GET /api/builds/:buildId/apk': 안따짐,
  // BTS 알림은 서명으로만, 규칙 웹훅 호출은 btr_ 토큰으로만 — 문이 권한 판정 앞에서 돌려보낸다 (gate.ts · bts/inbound.ts)
  'POST /api/bts/events/:projectId': 안따짐,
  'POST /api/bts/rules': 안따짐,
  // 프로젝트 배포 신호는 배포 열쇠(pdk_)로만 — 문이 권한 판정 앞에서 돌려보낸다 (gate.ts · bts/deploy.ts)
  'POST /api/projects/:projectId/deploys': 안따짐,
};

/**
 * **에이전트 토큰이 지나갈 수 있는 통로** (SPEC 도메인/인증 §7 「인증 적용 범위」가 정본이다).
 *
 * 맥이 실제로 부르는 것만 넣는다 — 접두사(`/api/authoring/`)로 열면 **새 요청 만들기(한도를 쓴다)와
 * 머지까지 열린다** (2026-09-23 계획 검토가 잡았다). 사진 올리기는 맥이 안 불러서 뺐다.
 * 맥이 새 통로를 부르게 되면 여기 한 줄을 더한다. 안 더하면 그 자리에서 403 으로 드러난다
 */
export const 토큰통로 = new Set([
  'GET /api/auth/me',
  'POST /api/authoring/requests/claim',
  'PATCH /api/authoring/requests/:id/stage',
  'POST /api/authoring/requests/:id/finish',
  'POST /api/authoring/requests/:id/outputs',
  'POST /api/authoring/requests/:id/usage',
  'POST /api/authoring/requests/:id/note',
  'POST /api/authoring/requests/:id/draft',
  'POST /api/authoring/requests/:id/bugfix',
  'GET /api/authoring/requests/closing',
  'POST /api/authoring/requests/:id/closed',
  'GET /api/authoring/requests/bugfix-prs',
  'POST /api/authoring/requests/:id/pr-state',
  'GET /api/authoring/requests/:id/prd',
  'POST /api/authoring/requests/:id/prd',
  'GET /api/authoring/requests/:id/screens',
  'PUT /api/authoring/requests/:id/screens',
  'POST /api/authoring/requests/:id/screens/done',
  'GET /api/authoring/requests/:id/trace',
  'GET /api/authoring/requests/:id/apis',
  'PUT /api/authoring/requests/:id/game-elements',
  'GET /api/authoring/requests/:id/game-map',
  'GET /api/authoring/requests/:id/guide',
  'GET /api/authoring/requests/:id/guide/files/:fileId',
  'GET /api/authoring/requests/:id/app-screen',
  'GET /api/authoring/requests/:id/game-screen',
  'GET /api/authoring/requests/:id/app-link',
  'POST /api/perf/ai-jobs/claim',
  'POST /api/perf/ai-jobs/:id/finish',
  'POST /api/chat/agent/claim',
  'POST /api/chat/agent/questions/:id/chunks',
  'POST /api/chat/agent/questions/:id/finish',
  'GET /api/authoring/requests',
  'GET /api/authoring/requests/:id',
  'GET /api/authoring/requests/:id/assets/:assetId',
]);

/**
 * **문이 로그인만 보고 권한 판정을 건너뛰는 통로** — 그 프로젝트 배정은 라우트가 본다. 권한값이 (기능, 칸) · admin 뿐이라 「배정만」을 적을 값이 없다.
 * 표에는 「안 따짐」으로 적는다. 여기에 없는 「안 따짐」은 그대로 admin 으로 떨어진다 (도메인/챗봇 §7)
 */
export const 배정은라우트가 = new Set(['GET /api/chat', 'DELETE /api/chat', 'POST /api/chat/questions', 'GET /api/chat/questions/:id/stream', 'POST /api/chat/questions/:id/stop']);

export function 필요권한(path: string, method: string): 권한값 {
  // Fastify 는 GET 라우트에 HEAD 를 자동으로 붙인다. 소스에는 그 줄이 없어 표에도 없고,
  // 그대로 두면 HEAD 가 admin 으로 떨어져 **읽기 권한으로 하던 일이 조용히 막힌다**
  const 값 = 등급표[`${method === 'HEAD' ? 'GET' : method} ${path}`];
  // 표에 없거나 「안 따짐」인데 여기까지 왔으면 아무도 분류하지 않은 것이다. 막는 쪽으로 간다
  return 값 === undefined || 값 === 안따짐 ? 'admin' : 값;
}
