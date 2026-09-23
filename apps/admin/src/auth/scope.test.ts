// CI에는 postgres가 없다. DB를 쓰는 갈래만 DATABASE_URL이 있을 때 돈다

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 케이스의서비스, 라우트표, 번호로, 서비스없음, 자원의서비스 } from './scope.js';

const 연결 = process.env.DATABASE_URL;

describe('케이스 번호에서 서비스 읽기', () => {
  it('앞 토막이 서비스다', () => {
    expect(케이스의서비스('DEMO-001')).toBe('DEMO');
    expect(케이스의서비스('ZZA-007')).toBe('ZZA');
    expect(케이스의서비스('XFS1-012')).toBe('XFS1');
  });

  // 모양은 SPEC §2 가 정한다. 경계 판정은 **모르면 막는 쪽**이라 null 이다 —
  // 빈 목록으로 떨구면 「서비스에 안 매인다」와 뭉개져 그냥 지나간다
  it('§2 의 접두사 모양이 아니면 모른다(null)', () => {
    expect(케이스의서비스('없는거')).toBeNull();
    expect(케이스의서비스('demo-001')).toBeNull();
    expect(케이스의서비스('TOOLONGPREFIXX-001')).toBeNull();
    expect(케이스의서비스('..%2F..%2Fetc-001')).toBeNull();
    expect(케이스의서비스(undefined)).toBeNull();
    expect(케이스의서비스(123)).toBeNull();
  });
});

describe('번호 칸 읽기', () => {
  it('십진 숫자만 받는다', () => {
    expect(번호로('5867')).toBe(5867);
    expect(번호로('0')).toBe(0);
  });

  // 라우트는 Number() 로 느슨하게 읽는다. 문이 더 느슨하거나 더 엄격하면
  // 둘이 같은 주소에서 **다른 값**을 보게 되고 그 틈으로 빠져나간다 (2026-09-19 실측)
  it('라우트와 다르게 읽힐 모양은 전부 모른다(null)', () => {
    for (const 값 of ['1e3', '0x10', '+1', ' 1', '1 ', '1.0', '', 'abc', '99999999999999999999']) {
      expect(번호로(값), 값).toBeNull();
    }
    expect(번호로(undefined)).toBeNull();
    expect(번호로(5867)).toBeNull();
  });
});

describe('라우트표', () => {
  // ★ 이 검사가 이번 사고의 재발을 막는 자리다.
  // 문은 등록된 틀을 표에서 찾고 **없으면 막는다.** 그래서 표에 빠진 라우트는
  // 열리는 것이 아니라 닫히지만, 아무도 모르는 채 닫히면 그것대로 사고다.
  // **소스에 실제로 등록된 라우트를 훑는다** — 검사용 가짜 라우트를 훑으면
  // 진짜 라우트가 늘어도 아무 신호가 안 뜬다
  it('소스에 등록된 /api 라우트가 전부 표에 있다', () => {
    const { 라우트들, 읽은파일 } = 소스의라우트들();

    // 읽는 방식이 깨지면 「빠진 것 없음」이 거짓으로 초록이 된다.
    // 건수 하한 대신 **어느 파일을 읽었는지**를 단언한다
    expect(읽은파일.sort()).toEqual([
      'auth',
      'authoring',
      'catalog',
      'execution',
      'reporting',
      'settings',
    ]);
    expect(라우트들.length).toBeGreaterThan(20);

    const 빠진것 = 라우트들.filter((틀) => !(틀 in 라우트표));
    expect(
      빠진것,
      `라우트표에 없는 라우트: ${빠진것.join(' · ')}\n` +
        `서비스에 매이면 종류를 정해 넣고, 안 매이면 { 종류: '안매임' } 으로 넣어라.`,
    ).toEqual([]);
  });

  // ★ 작성 요청은 **라우트가 서비스 경계를 안 본다.** 문이 유일한 방어이고, 문이 보려면
  // 이 세 줄이 「번호로 서비스를 찾는」 갈래여야 한다. 「안매임」으로 바뀌면 문이 아무것도 안 보고
  // **남의 서비스 기획서 본문이 번호만으로 읽힌다** (2026-09-22)
  it('작성 요청의 번호 자리는 그 행에서 서비스를 찾는다', () => {
    for (const 틀 of [
      '/api/authoring/requests/:id',
      '/api/authoring/requests/:id/stage',
      '/api/authoring/requests/:id/screenshots',
      '/api/authoring/requests/:id/finish',
      '/api/authoring/requests/:id/assets',
    ]) {
      expect(라우트표[틀], `${틀} 이 번호로 서비스를 찾지 않는다`).toEqual({
        종류: '작성요청',
        칸: 'id',
      });
    }
  });

  it('표에 있는데 소스에 없는 라우트가 없다', () => {
    const { 라우트들 } = 소스의라우트들();
    const 유령 = Object.keys(라우트표).filter((틀) => !라우트들.includes(틀));
    expect(유령, `소스에 없는 라우트가 표에 남아 있다: ${유령.join(' · ')}`).toEqual([]);
  });

  it('직전 실행 비교 조회는 실행 번호로 서비스를 찾는다', () => {
    expect(라우트표['/api/runs/:runId/insights']).toEqual({ 종류: '실행', 칸: 'runId' });
  });

  it('절차 단위 진행 조회는 실행 번호로 서비스를 찾는다', () => {
    expect(라우트표['/api/runs/:runId/progress']).toEqual({ 종류: '실행', 칸: 'runId' });
  });

  it('번호로 부르는 자리는 읽을 칸을 지정한다', () => {
    for (const [틀, 원천] of Object.entries(라우트표)) {
      if (원천.종류 === '안매임' || 원천.종류 === '질의' || 원천.종류 === '본문tcId') continue;
      expect(틀.includes(`:${원천.칸}`), `${틀} 에 :${원천.칸} 이 없다`).toBe(true);
    }
  });
});

/** 한 폴더에서 라우트를 등록할 수 있는 파일들. 검사 파일은 가짜 라우트를 세우므로 뺀다 */
function 라우트파일들(폴더: string): string[] {
  return readdirSync(폴더).filter((이름) => 이름.endsWith('.ts') && !이름.endsWith('.test.ts'));
}

/** 라우트 파일에서 등록된 경로를 그대로 읽는다. app.ts 가 전부 `/api` 접두사로 등록한다 */
function 소스의라우트들(): { 라우트들: string[]; 읽은파일: string[] } {
  // process.cwd() 를 쓰면 apps/admin 안에서 부를 때 수집 단계에서 죽는다
  const 뿌리 = resolve(dirname(new URL(import.meta.url).pathname), '..');
  const 폴더들 = readdirSync(뿌리, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((이름) => existsSync(join(뿌리, 이름, 'routes.ts')));

  // 작은따옴표·큰따옴표·백틱을 다 받는다. 한 가지만 보면 다음 사람이 다른 따옴표를
  // 쓰는 순간 그 라우트가 그물 밖으로 나간다
  const 등록 = /\bapp\.(get|post|patch|put|delete|head|all|options|route)\s*(?:<[\s\S]*?>)?\s*\(\s*[{]?\s*(?:url\s*:\s*)?['"`]([^'"`]+)['"`]/g;
  const 경로들 = new Set<string>();
  // routes.ts 하나만 보면 300줄 때문에 옆 파일로 뗀 플러그인(authoring/assets.ts)이 그물 밖이다 (2026-09-23)
  for (const 폴더 of 폴더들) {
    for (const 파일 of 라우트파일들(join(뿌리, 폴더))) {
      const 글 = readFileSync(join(뿌리, 폴더, 파일), 'utf8');
      for (const 맞은것 of 글.matchAll(등록)) 경로들.add(`/api${맞은것[2] ?? ''}`);
    }
  }
  return { 라우트들: [...경로들], 읽은파일: 폴더들 };
}

describe.skipIf(연결 === undefined)('번호가 어느 서비스인가', () => {
  let 실행번호 = 0;
  let 서비스없는실행번호 = 0;
  let 증적번호 = 0;
  let 입력값묶음번호 = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const 서비스 = await pool.query<{ id: number }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XFS5', '경계 검사용', '#3A5FCD', '', 'xfs5')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    const 서비스id = 서비스.rows[0]!.id;

    const 실행 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_id, service_name, tests_repo, triggered_by, env, base_url, status)
            VALUES ('XFS5 경계 검사', $1, '경계 검사용', '', 'xfs5-사람', 'qa', 'https://qa.xfs5.test', 'FINISHED')
         RETURNING run_id`,
      [서비스id],
    );
    실행번호 = Number(실행.rows[0]!.run_id);

    // 서비스 통합 이전 행. service_id 와 service_name 이 짝으로 비어야 CHECK 를 지난다 (§6)
    const 옛실행 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status)
            VALUES ('XFS5 통합 이전', '', '', 'xfs5-사람', 'qa', 'https://qa.xfs5.test', 'FINISHED')
         RETURNING run_id`,
    );
    서비스없는실행번호 = Number(옛실행.rows[0]!.run_id);

    const 증적 = await pool.query<{ id: string }>(
      `INSERT INTO evidence_document (run_id, format, status) VALUES ($1, 'PDF', 'READY') RETURNING id`,
      [실행번호],
    );
    증적번호 = Number(증적.rows[0]!.id);

    // test_case 에는 서비스 칸이 없다. tc_id 접두사가 서비스를 가리키는 유일한 길이다 (§2 · §6)
    await pool.query(
      `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema)
            VALUES ('XFS5-001', '경계 검사용 케이스', 'xfs5/a.spec.ts', '[]'::jsonb, '[]'::jsonb)
       ON CONFLICT (tc_id) DO UPDATE SET is_active = true`,
    );
    const 묶음 = await pool.query<{ id: string }>(
      `INSERT INTO param_set (tc_id, name, params, expected)
            VALUES ('XFS5-001', 'XFS5 기본', '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (tc_id, name) DO UPDATE SET params = EXCLUDED.params
         RETURNING id`,
    );
    입력값묶음번호 = Number(묶음.rows[0]!.id);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM evidence_document WHERE run_id IN ($1, $2)`, [
      실행번호,
      서비스없는실행번호,
    ]);
    await pool.query(`DELETE FROM param_set WHERE tc_id LIKE 'XFS5-%'`);
    await pool.query(`DELETE FROM test_case WHERE tc_id LIKE 'XFS5-%'`);
    await pool.query(`DELETE FROM test_run WHERE run_id IN ($1, $2)`, [실행번호, 서비스없는실행번호]);
    await pool.query(`DELETE FROM service WHERE prefix = 'XFS5'`);
  });

  it('실행 번호로 그 서비스를 찾는다', async () => {
    expect(await 자원의서비스({ 종류: '실행', 번호: 실행번호 })).toBe('XFS5');
  });

  it('증적 번호는 그 실행을 거쳐 서비스에 닿는다', async () => {
    expect(await 자원의서비스({ 종류: '증적', 번호: 증적번호 })).toBe('XFS5');
  });

  it('입력값 묶음은 케이스 번호 접두사가 곧 서비스다', async () => {
    expect(await 자원의서비스({ 종류: '입력값묶음', 번호: 입력값묶음번호 })).toBe('XFS5');
  });

  // 작성 요청은 라우트가 서비스 경계를 안 본다. **문이 유일한 방어라 여기서 증명한다** —
  // 이 갈래가 빠지면 남의 서비스 기획서 본문이 번호만으로 읽힌다 (2026-09-22)
  it('작성 요청 번호로 그 서비스를 찾는다', async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, spec_text, requested_by, requested_by_name, status)
       SELECT id, 'AUTHOR', '경계 검사용 기획서', 'xfs5', '검사', 'PENDING'
         FROM service WHERE prefix = 'XFS5'
       RETURNING id`,
    );
    const 번호 = Number(r.rows[0]!.id);
    expect(await 자원의서비스({ 종류: '작성요청', 번호 })).toBe('XFS5');
    expect(await 자원의서비스({ 종류: '작성요청', 번호: 999999999 })).toBeNull();
    await pool.query('DELETE FROM authoring_request WHERE id = $1', [번호]);
  });

  it('없는 번호는 null 이다 — 문이 지나보내고 라우트가 404 를 낸다', async () => {
    expect(await 자원의서비스({ 종류: '실행', 번호: 999999999 })).toBeNull();
    expect(await 자원의서비스({ 종류: '증적', 번호: 999999999 })).toBeNull();
    expect(await 자원의서비스({ 종류: '입력값묶음', 번호: 999999999 })).toBeNull();
  });

  // 어느 배정에도 안 드는 자원이다. 열어 두면 「배정받지 않은 서비스의 자원」을
  // 막으라는 §7 이 통합 이전 행 앞에서만 비켜 준 꼴이 된다
  it('서비스에 안 매인 옛 실행은 서비스없음이다', async () => {
    expect(await 자원의서비스({ 종류: '실행', 번호: 서비스없는실행번호 })).toBe(서비스없음);
  });
});
