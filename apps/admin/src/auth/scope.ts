// 이 요청이 어느 서비스를 건드리는가. 문(gate.ts)이 배정과 맞춰 보는 값을 낸다 (SPEC §7)
// 표 주인은 §6 이다 — 여기서는 「그 번호가 어느 서비스냐」만 읽고 아무것도 쓰지 않는다

// SPEC §2 — 접두사는 자유 형식이고 플랫폼은 모양과 중복만 본다
const 접두사모양 = /^[A-Z][A-Z0-9]{0,11}$/;

// tcId 가 경로에 박혀 있는 자리들. 앞 토막이 곧 서비스다 (SPEC §2)
const TCID자리 = [
  /^\/api\/cases\/([^/]+)\//,
  /^\/api\/catalog\/cases\/([^/]+)(?:\/|$)/,
];

/** 경로에 tcId 가 박혀 있으면 그 접두사를 낸다. 없거나 모양이 아니면 빈 목록이다. */
export function 경로접두사(path: string): string[] {
  for (const 자리 of TCID자리) {
    const 맞은것 = 자리.exec(path);
    if (맞은것 === null) continue;
    const 접두사 = (맞은것[1] ?? '').split('-')[0] ?? '';
    return 접두사모양.test(접두사) ? [접두사] : [];
  }
  return [];
}

export type 찾을것 = { 종류: '실행' | '증적' | '입력값묶음'; 번호: number };

// 번호로 부르는 자리들. 그 번호가 어느 서비스인지는 DB 만 안다
const 번호자리: { 규칙: RegExp; 종류: 찾을것['종류'] }[] = [
  { 규칙: /^\/api\/runs\/(\d+)(?:\/|$)/, 종류: '실행' },
  { 규칙: /^\/api\/screenshots\/(\d+)\//, 종류: '실행' },
  { 규칙: /^\/api\/evidence\/(\d+)$/, 종류: '증적' },
  { 규칙: /^\/api\/param-sets\/(\d+)$/, 종류: '입력값묶음' },
];

/** 경로가 번호로 자원을 가리키면 무엇을 찾아야 하는지 낸다. */
export function 번호로찾을것(path: string): 찾을것 | null {
  for (const { 규칙, 종류 } of 번호자리) {
    const 맞은것 = 규칙.exec(path);
    if (맞은것 === null) continue;
    const 번호 = Number(맞은것[1]);
    if (!Number.isSafeInteger(번호) || 번호 < 0) return null;
    return { 종류, 번호 };
  }
  return null;
}

/**
 * 서비스에 매이지 않는 자리. 여기 없고 위 둘에도 안 걸리면 **분류되지 않은 것**이고
 * 검사가 그것을 잡는다 — 새 라우트의 기본값이 「검사 안 함」이 되면 안 된다.
 */
export const 서비스에안매이는곳 = [
  '/api/auth/', // 로그인·로그아웃·나를 묻기. 사람에 매이지 서비스에 안 매인다
  '/api/settings/', // 시스템 전체다. admin 이면 열린다 (SPEC §3.5)
  '/api/catalog/scan', // 전 서비스를 한 번에 훑는다 (SPEC §3.1)
  '/api/runs/last-by-case', // 질의가 배정으로 거른다 — 문이 아니라 질의의 몫이다
  '/api/runs', // POST 는 본문 tcId, GET 은 ?service= 로 문이 이미 본다
  '/api/catalog/cases', // ?service= 를 필수로 요구한다 (400 SERVICE_REQUIRED)
];

/** 그 경로가 서비스 경계를 어떤 식으로든 검사받는가. 검사가 이것으로 빠진 라우트를 잡는다. */
export function 분류됐나(path: string): boolean {
  if (서비스에안매이는곳.some((곳) => path === 곳 || path.startsWith(곳))) return true;
  if (경로접두사(path).length > 0) return true;
  if (번호로찾을것(path) !== null) return true;
  // 값이 안 들어간 라우트 틀(`/api/cases/:tcId/history`)도 분류된 것으로 본다.
  // 검사는 등록된 틀을 훑으므로 실제 값 대신 자리표시자가 온다
  return /^\/api\/(cases|catalog\/cases)\/:[^/]+/.test(path);
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
