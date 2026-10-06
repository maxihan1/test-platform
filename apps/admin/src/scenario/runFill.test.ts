// 시나리오 실행이 조립에 없는 칸을 저장값으로 채워 박제하고 미확정 사유를 박제한다 (SPEC 도메인/시나리오 §3.7 · §7 · 실행 §3.2)

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioPart } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 실행만들기, 시나리오실행오류 } from './runStore.js';

const 연결 = process.env.DATABASE_URL;

const 소스 = `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'XSF-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('로그인한다', async () => {
    await page.getByRole('button').click();
  });
  await test.step('첫 화면이다', async () => {
    await verify('첫 화면이다', 1, 1, { blocker: true });
  });
});
`;

const 입력스키마 = {
  type: 'object',
  properties: {
    loginId: { type: 'string', minLength: 1 },
    password: { type: 'string', secret: true },
    count: { type: 'number' },
  },
};
const 기대스키마 = {
  type: 'object',
  properties: {
    homePath: { type: 'string' },
    flag: { type: 'boolean' },
  },
};

describe.skipIf(연결 === undefined)('시나리오 실행 저장값 채우기', () => {
  let 서비스 = 0;
  let 뿌리 = '';
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 번호들 = ['XSF-001', 'XSF-002', 'XSF-003'];
  const 사람 = { username: 'xsf', displayName: 'XSF 검사 사람' };

  const q = async <T extends object = Record<string, unknown>>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 치우기표 = async () => {
    await q(
      `DELETE FROM scenario_run_step WHERE part_id IN (
         SELECT p.id FROM scenario_run_part p JOIN test_run r ON r.run_id = p.run_id WHERE r.service_id = $1)`,
      [서비스],
    );
    await q('DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q('DELETE FROM case_input WHERE tc_id = ANY($1)', [번호들]);
  };

  const 케이스 = (
    tcId: string,
    params: Record<string, unknown> = {},
    expected: Record<string, unknown> = {},
  ): Extract<ScenarioPart, { kind: 'case' }> => ({
    kind: 'case',
    tcId,
    params,
    expected,
    skipSteps: [],
  });

  // 조립 검사를 안 거치고 버전을 넣는다 — 이 파일은 실행 만들기만 본다
  const 시나리오 = async (parts: ScenarioPart[]) => {
    const s = await q<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XSF 시나리오', 'xsf') RETURNING id`,
      [서비스],
    );
    const id = Number(s.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name)
       VALUES ($1, 1, 'desktop', $2, 'xsf', 'XSF 검사 사람')`,
      [id, JSON.stringify(parts)],
    );
    return id;
  };

  const 부품행들 = async (runId: number) =>
    (
      await q<{ seq: number; part: ScenarioPart; unconfirmed: string | null }>(
        'SELECT seq, part, unconfirmed FROM scenario_run_part WHERE run_id = $1 ORDER BY seq',
        [runId],
      )
    ).rows;

  const 수 = async (sql: string) => Number((await q<{ n: string }>(sql, [서비스])).rows[0]!.n);

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xsf-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xsf'));
    await writeFile(join(뿌리, 'xsf', 'a.spec.ts'), 소스);

    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XSF', 'XSF 시나리오 저장값 검사용', '#3A5FCD', 'git@x:xsf.git', 'xsf')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기표();
    await q(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://xsf.example')`, [서비스]);

    const 케이스넣기 = (tcId: string, 입력: object, 기대: object, unconfirmed: string | null) =>
      q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active, unconfirmed)
         VALUES ($1, $1 || ' 이름', '["desktop","mobile"]', '[]', 'xsf/a.spec.ts', $2, $3, true, $4)
         ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, param_schema = EXCLUDED.param_schema,
           expected_schema = EXCLUDED.expected_schema, is_active = true, unconfirmed = EXCLUDED.unconfirmed`,
        [tcId, JSON.stringify(입력), JSON.stringify(기대), unconfirmed],
      );
    await 케이스넣기('XSF-001', 입력스키마, 기대스키마, null);
    await 케이스넣기('XSF-002', { type: 'object' }, { type: 'object' }, '화면에서 본 값이다');
    await 케이스넣기('XSF-003', { type: 'object', properties: { memo: { type: 'string' } } }, { type: 'object' }, null);

    const 저장값넣기 = (tcId: string, params: object, expected: object) =>
      q(`INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ($1, $2, $3, 'xsf')`, [
        tcId,
        JSON.stringify(params),
        JSON.stringify(expected),
      ]);
    await 저장값넣기(
      'XSF-001',
      { loginId: '저장아이디', password: '저장비번', count: '숫자 아님', gone: '명세에 없는 칸' },
      { homePath: '/saved', flag: true },
    );
    await 저장값넣기('XSF-003', { memo: 'x'.repeat(100001) }, {});
  });

  afterAll(async () => {
    await 치우기표();
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
    if (원래뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 원래뿌리;
  });

  it('조립에 없는 칸을 저장값으로 채워 부품 행과 러너 요청에 싣는다', async () => {
    const 조립 = 케이스('XSF-001');
    const { runId, 요청 } = await 실행만들기(await 시나리오([조립, { kind: 'wait', ms: 10 }]), 'qa', 사람);

    const 채움 = { ...조립, params: { loginId: '저장아이디', password: '저장비번' }, expected: { homePath: '/saved', flag: true } };
    expect((await 부품행들(runId)).map((r) => r.part)).toEqual([채움, { kind: 'wait', ms: 10 }]);
    expect(요청.parts).toEqual([{ ...채움, filePath: 'xsf/a.spec.ts' }, { kind: 'wait', ms: 10 }]);
  });

  it('조립에 적은 칸은 저장값이 이기지 못한다', async () => {
    const 조립 = 케이스('XSF-001', { loginId: '조립아이디' }, { flag: false });
    const { runId, 요청 } = await 실행만들기(await 시나리오([조립]), 'qa', 사람);

    const [행] = await 부품행들(runId);
    expect(행!.part).toMatchObject({ params: { loginId: '조립아이디', password: '저장비번' }, expected: { homePath: '/saved', flag: false } });
    expect(요청.parts[0]).toMatchObject({ params: { loginId: '조립아이디' }, expected: { flag: false } });
  });

  it('지금 명세에 없는 저장값 칸과 규칙에 어긋나는 칸은 안 채운다', async () => {
    const { runId, 요청 } = await 실행만들기(await 시나리오([케이스('XSF-001')]), 'qa', 사람);

    const [행] = await 부품행들(runId);
    for (const params of [(행!.part as { params: object }).params, (요청.parts[0] as { params: object }).params]) {
      expect(Object.keys(params).sort()).toEqual(['loginId', 'password']);
    }
  });

  it('미확정 케이스 부품 행은 그 사유를, 확정 케이스와 다른 부품은 NULL 을 박제한다', async () => {
    const { runId } = await 실행만들기(
      await 시나리오([케이스('XSF-001'), 케이스('XSF-002'), { kind: 'wait', ms: 10 }]),
      'qa',
      사람,
    );

    expect((await 부품행들(runId)).map((r) => r.unconfirmed)).toEqual([null, '화면에서 본 값이다', null]);
  });

  it('채운 뒤 부품 목록이 100000바이트를 넘으면 NOT_RUNNABLE 이고 실행 · 부품 행이 안 남는다', async () => {
    const id = await 시나리오([케이스('XSF-003')]);
    const 실행전 = await 수('SELECT count(*) AS n FROM test_run WHERE service_id = $1');
    const 부품전 = await 수(
      'SELECT count(*) AS n FROM scenario_run_part p JOIN test_run r ON r.run_id = p.run_id WHERE r.service_id = $1',
    );

    const 잡은 = await 실행만들기(id, 'qa', 사람).then(
      () => null,
      (e: unknown) => e,
    );

    expect(잡은).toBeInstanceOf(시나리오실행오류);
    expect((잡은 as 시나리오실행오류).code).toBe('NOT_RUNNABLE');
    expect((잡은 as 시나리오실행오류).message).toMatch(/^실행할 수 없는 시나리오다: 저장값을 채운 뒤 부품 목록이 \d+바이트로 100000바이트를 넘는다$/);
    expect(await 수('SELECT count(*) AS n FROM test_run WHERE service_id = $1')).toBe(실행전);
    expect(
      await 수('SELECT count(*) AS n FROM scenario_run_part p JOIN test_run r ON r.run_id = p.run_id WHERE r.service_id = $1'),
    ).toBe(부품전);
  });

  it('값 꽂기를 건 칸은 저장값이 있어도 안 채운다. 조립에 적은 꽂기 칸은 그대로 둔다', async () => {
    const 꽂기 = (param: string) => ({
      kind: 'bind' as const,
      param,
      value: { fromSeq: 1, method: 'GET' as const, urlPattern: '**/api/me', jsonPath: 'data.id' },
    });
    const 조립: ScenarioPart = { ...케이스('XSF-001', { count: 3 }), links: [꽂기('loginId'), 꽂기('count')] };
    const { runId, 요청 } = await 실행만들기(await 시나리오([케이스('XSF-002'), 조립]), 'qa', 사람);

    const 채움 = { ...조립, params: { count: 3, password: '저장비번' }, expected: { homePath: '/saved', flag: true } };
    expect((await 부품행들(runId))[1]!.part).toEqual(채움);
    expect(요청.parts[1]).toEqual({ ...채움, filePath: 'xsf/a.spec.ts' });
  });
});
