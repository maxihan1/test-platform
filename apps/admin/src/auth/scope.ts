// 이 요청이 어느 서비스를 건드리는가. 문(gate.ts)이 배정과 맞춰 보는 값을 낸다 (SPEC §7)
// 표 주인은 §6 이다 — 여기서는 「그 번호가 어느 서비스냐」만 읽고 아무것도 쓰지 않는다
//
// **판정은 주소 글자가 아니라 라우트가 실제로 받은 값으로 한다.**
// Fastify 의 `req.url` 은 퍼센트 디코딩 **전** 원문이고 `req.params` 는 **후**다.
// 글자로 판정하면 `/api/runs/%35%38%36%37` · `/api/runs/1e3` 처럼 **문과 라우트가
// 같은 주소를 다르게 읽는** 자리가 생기고, 그 틈으로 전부 빠져나간다 (2026-09-19 실측).
// 그래서 등록된 틀(`req.routeOptions.url`)로 종류를 고르고 값은 `req.params` 에서 읽는다.

// 서비스를 알아내는 길. 라우트 틀마다 하나씩 정해 둔다
export type 원천 =
  | { 종류: '안매임' } // 시스템 전체이거나 서비스에 매이지 않는다
  | { 종류: '질의' } // `?service=` 로 고른다
  | { 종류: '본문tcId' } // POST /api/runs — 본문 items[].tcId 에서 알아낸다
  | { 종류: '케이스'; 칸: string } // params[칸] 이 tcId 다. 접두사가 곧 서비스다 (§2)
  | { 종류: '실행'; 칸: string } // params[칸] 이 실행 번호다
  | { 종류: '증적'; 칸: string }
  | { 종류: '입력값묶음'; 칸: string }
  | { 종류: '작성요청'; 칸: string }; // params[칸] 이 대기줄 행 번호다. 그 행의 service_id 가 서비스다 (§6)

/**
 * **등록된 모든 `/api` 라우트가 여기 있어야 한다.**
 * 표에 없으면 문이 막는다 — 새 라우트의 기본값이 「검사 안 함」이면 다음 사람이
 * 라우트를 더하는 순간 조용히 열린다. 이번 구멍이 정확히 그렇게 생겼다.
 * `scope.test.ts` 가 소스의 라우트를 훑어 여기 빠진 것이 있으면 실패시킨다.
 */
export const 라우트표: Record<string, 원천> = {
  // 사람에 매이지 서비스에 안 매인다
  '/api/auth/login': { 종류: '안매임' },
  '/api/auth/logout': { 종류: '안매임' },
  '/api/auth/me': { 종류: '안매임' },

  // 설정은 시스템 전체다. admin 등급이면 열린다 (SPEC §3.5)
  '/api/settings/services': { 종류: '안매임' },
  '/api/settings/services/:id': { 종류: '안매임' },
  '/api/settings/users': { 종류: '안매임' },
  '/api/settings/users/:username': { 종류: '안매임' },
  '/api/settings/users/:username/password': { 종류: '안매임' },

  // 스캔은 전 서비스를 한 번에 훑는다 (SPEC §3.1)
  '/api/catalog/scan': { 종류: '안매임' },
  // 마지막 결과 일괄 조회는 질의가 배정으로 거른다 (execution/history.ts)
  '/api/runs/last-by-case': { 종류: '안매임' },

  '/api/catalog/cases': { 종류: '질의' }, // ?service= 를 필수로 요구한다
  '/api/runs': { 종류: '질의' }, // GET 은 ?service=, POST 는 아래 본문 갈래가 같이 본다

  '/api/catalog/cases/:tcId': { 종류: '케이스', 칸: 'tcId' },
  '/api/cases/:tcId/source': { 종류: '케이스', 칸: 'tcId' },
  '/api/cases/:tcId/history': { 종류: '케이스', 칸: 'tcId' },
  '/api/cases/:tcId/param-sets': { 종류: '케이스', 칸: 'tcId' },

  '/api/runs/:runId': { 종류: '실행', 칸: 'runId' },
  '/api/runs/:runId/abort': { 종류: '실행', 칸: 'runId' },
  '/api/runs/:runId/evidence': { 종류: '실행', 칸: 'runId' },
  '/api/runs/:runId/insights': { 종류: '실행', 칸: 'runId' },
  '/api/runs/:runId/items/:historyId': { 종류: '실행', 칸: 'runId' },
  '/api/runs/:runId/progress': { 종류: '실행', 칸: 'runId' },
  '/api/screenshots/:runId/:historyId/:seq.png': { 종류: '실행', 칸: 'runId' },

  '/api/evidence/:id': { 종류: '증적', 칸: 'id' },
  '/api/param-sets/:id': { 종류: '입력값묶음', 칸: 'id' },

  // 작성 대기줄 (SPEC 도메인/작성 §7). ?service= 로 고르는 것과 번호로 찾는 것이 갈린다
  '/api/authoring/requests': { 종류: '질의' },
  '/api/authoring/merges': { 종류: '질의' }, // sourceId 의 서비스는 라우트가 본다 — 본문이라 문이 못 읽는다
  '/api/authoring/requests/claim': { 종류: '질의' },
  '/api/authoring/requests/:id': { 종류: '작성요청', 칸: 'id' },
  '/api/authoring/requests/:id/stage': { 종류: '작성요청', 칸: 'id' },
  '/api/authoring/requests/:id/screenshots': { 종류: '작성요청', 칸: 'id' },
  '/api/authoring/requests/:id/finish': { 종류: '작성요청', 칸: 'id' },
  '/api/authoring/requests/:id/assets': { 종류: '작성요청', 칸: 'id' },
  '/api/authoring/requests/:id/submit': { 종류: '작성요청', 칸: 'id' },
};

// SPEC §2 — 접두사는 자유 형식이고 플랫폼은 모양과 중복만 본다.
// 서버의 정본은 settings/routes.ts 의 접두사모양이다. 여기는 경계 판정용 사본이라
// §2 가 바뀌면 같이 고친다 (CLAUDE.md §2.7 ④ 「코드에 박힌 상수」)
const 접두사모양 = /^[A-Z][A-Z0-9]{0,11}$/;

/** `tcId` 앞 토막이 서비스다. 모양이 아니면 **모른다** — 경계 판정은 모르면 막는 쪽이다 */
export function 케이스의서비스(tcId: unknown): string | null {
  if (typeof tcId !== 'string') return null;
  const 접두사 = tcId.split('-')[0] ?? '';
  return 접두사모양.test(접두사) ? 접두사 : null;
}

export type 찾을것 = { 종류: '실행' | '증적' | '입력값묶음' | '작성요청'; 번호: number };

/** 번호 칸은 **라우트와 같은 엄격함**으로 읽는다. 느슨하면 문과 라우트가 다른 값을 본다 */
export function 번호로(값: unknown): number | null {
  if (typeof 값 !== 'string' || !/^\d+$/.test(값)) return null;
  const n = Number(값);
  return Number.isSafeInteger(n) ? n : null;
}

/** 서비스가 없는 자원이라는 표시. 통합 이전 실행(service_id IS NULL)이 여기 든다. */
export const 서비스없음 = Symbol('서비스없음');

const 질의: Record<찾을것['종류'], string> = {
  실행: 'SELECT s.prefix FROM test_run r LEFT JOIN service s ON s.id = r.service_id WHERE r.run_id = $1',
  증적: `SELECT s.prefix
           FROM evidence_document d
           JOIN test_run r ON r.run_id = d.run_id
           LEFT JOIN service s ON s.id = r.service_id
          WHERE d.id = $1`,
  // 입력값 묶음은 서비스 칸이 없다. tc_id 접두사가 곧 서비스다 (SPEC §2)
  입력값묶음: 'SELECT split_part(tc_id, $2, 1) AS prefix FROM param_set WHERE id = $1',
  // 작성 요청은 service_id 가 NOT NULL 이다. 새 표라 「통합 이전 행」이 없다 (§6)
  작성요청:
    'SELECT s.prefix FROM authoring_request a JOIN service s ON s.id = a.service_id WHERE a.id = $1',
};

/**
 * 그 번호가 어느 서비스 것인가.
 * - 접두사 문자열 — 그 서비스 것이다
 * - `null` — 그런 번호가 없다. 문은 지나보내고 라우트가 404 를 낸다 (SPEC §7)
 * - `서비스없음` — 있긴 한데 서비스에 안 매였다. 어느 배정에도 안 드므로 막는다
 */
export async function 자원의서비스(찾을것: 찾을것): Promise<string | null | typeof 서비스없음> {
  // 여기서 불러온다. 맨 위에서 부르면 DATABASE_URL 이 없는 자리(CI)에서 이 파일을
  // import 하는 것만으로 터지고, 위의 순수 함수들까지 같이 못 돌게 된다
  const { pool } = await import('../db/index.js');
  const 인자 = 찾을것.종류 === '입력값묶음' ? [찾을것.번호, '-'] : [찾을것.번호];
  const rows = await pool.query<{ prefix: string | null }>(질의[찾을것.종류], 인자);

  const 줄 = rows.rows[0];
  if (줄 === undefined) return null;

  const prefix = 줄.prefix;
  if (prefix === null || prefix === '') return 서비스없음;
  return prefix;
}
