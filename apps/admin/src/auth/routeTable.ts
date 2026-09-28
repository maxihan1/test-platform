// 경로(틀 + 메서드)마다 필요한 권한 표와 에이전트 토큰 통로. 문(gate.ts)이 읽는다 (SPEC 도메인/인증 §7)

import type { 기능 } from './permissions.js';

/** 등급을 안 따지는 자리. 문이 그 앞에서 이미 돌려보낸다 */
export const 안따짐 = '안따짐';
export type 권한값 = { 기능: 기능; 칸: 'read' | 'write' } | 'admin';
export type 표값 = 권한값 | typeof 안따짐;

const 케이스읽기 = { 기능: 'cases', 칸: 'read' } as const;
const 케이스쓰기 = { 기능: 'cases', 칸: 'write' } as const;
const 실행읽기 = { 기능: 'runs', 칸: 'read' } as const;
const 실행쓰기 = { 기능: 'runs', 칸: 'write' } as const;
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

  'GET /api/catalog/cases': 케이스읽기,
  'GET /api/catalog/cases/:tcId': 케이스읽기,
  'GET /api/catalog/scan': 케이스읽기,
  'GET /api/cases/:tcId/param-sets': 케이스읽기,
  'GET /api/cases/:tcId/source': 케이스읽기,
  'POST /api/catalog/scan': 케이스쓰기,
  'POST /api/cases/:tcId/param-sets': 케이스쓰기,
  'DELETE /api/param-sets/:id': 케이스쓰기,

  // 주소는 케이스 아래지만 내용은 실행 결과 이력이다 (execution/routes.ts). 케이스 read 로 열면 실행을 못 보는 사람에게 결과가 샌다
  'GET /api/cases/:tcId/history': 실행읽기,
  'GET /api/evidence/:id': 실행읽기,
  'GET /api/runs': 실행읽기,
  'GET /api/runs/last-by-case': 실행읽기,
  'GET /api/runs/:runId': 실행읽기,
  'GET /api/runs/:runId/insights': 실행읽기,
  'GET /api/runs/:runId/items/:historyId': 실행읽기,
  'GET /api/runs/:runId/progress': 실행읽기,
  'GET /api/screenshots/:runId/:historyId/:seq.png': 실행읽기,
  'POST /api/runs': 실행쓰기,
  'POST /api/runs/:runId/abort': 실행쓰기,
  'POST /api/runs/:runId/evidence': 실행쓰기,

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

  // ★ 저장소를 영구히 바꾸는 일 — admin. 작성 쓰기와 같으면 「실행할 수 있는 사람 = 저장소를 고칠 수 있는 사람」이 된다
  'POST /api/authoring/merges': 'admin',

  'GET /api/settings/services': 'admin',
  'POST /api/settings/services': 'admin',
  'PATCH /api/settings/services/:id': 'admin',
  'GET /api/settings/users': 'admin',
  'POST /api/settings/users': 'admin',
  'PATCH /api/settings/users/:username': 'admin',
  'DELETE /api/settings/users/:username': 'admin',
  'POST /api/settings/users/:username/approve': 'admin',
  'POST /api/settings/users/:username/password': 'admin',
  'POST /api/settings/users/:username/agent-token': 'admin',
  'DELETE /api/settings/users/:username/agent-token': 'admin',
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
  'GET /api/authoring/requests',
  'GET /api/authoring/requests/:id',
  'GET /api/authoring/requests/:id/assets/:assetId',
]);

export function 필요권한(path: string, method: string): 권한값 {
  // Fastify 는 GET 라우트에 HEAD 를 자동으로 붙인다. 소스에는 그 줄이 없어 표에도 없고,
  // 그대로 두면 HEAD 가 admin 으로 떨어져 **읽기 권한으로 하던 일이 조용히 막힌다**
  const 값 = 등급표[`${method === 'HEAD' ? 'GET' : method} ${path}`];
  // 표에 없거나 「안 따짐」인데 여기까지 왔으면 아무도 분류하지 않은 것이다. 막는 쪽으로 간다
  return 값 === undefined || 값 === 안따짐 ? 'admin' : 값;
}
