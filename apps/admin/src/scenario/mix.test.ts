// 애플리케이션을 섞은 시나리오 — 같은 프로젝트 접두사 · 이름으로 짝짓는 대상 서버 · 단계별 주소와 계정 · 결과의 애플리케이션 (SPEC 도메인/시나리오 §3.7 결정 13)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioExecuteRequest, ScenarioPart } from '@platform/kit';
import Fastify from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 같은프로젝트접두사, 삭제코드합치기, 쓰는앱읽기 } from './apps.js';
import { 시나리오결과 } from './runRoutes.js';
import { 실행만들기, 시나리오실행오류 } from './runStore.js';
import scenarioRoutes from './routes.js';
import { 만들기 } from './store.js';
import { 시험시작 } from './trial.js';

const 연결 = process.env.DATABASE_URL;

// 시험 실행이 러너에 보낸 요청만 본다. 러너는 안 부른다
const 러너 = vi.hoisted(() => ({ 요청: [] as unknown[] }));
vi.mock('../execution/runner.js', async (원래) => ({
  ...(await 원래<typeof import('../execution/runner.js')>()),
  callScenarioRunner: async (요청: unknown) => {
    러너.요청.push(요청);
    return { status: 'PASS', durationMs: 1, parts: [] };
  },
  켜진내컴퓨터러너: async () => undefined,
}));

const 소스 = `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'XSM-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('화면을 본다', async () => {
    await page.getByRole('button').click();
  });
  await test.step('한 건이다', async () => {
    await verify('한 건이다', 1, 1, { blocker: true });
  });
});
`;

const 입력스키마 = {
  type: 'object',
  properties: { userId: { type: 'string', secret: true }, password: { type: 'string', secret: true } },
};

describe.skipIf(연결 === undefined)('애플리케이션을 섞은 시나리오', () => {
  const 접두사 = ['XSM', 'XSM2', 'XSM3'] as const;
  const 서비스: Record<string, number> = {};
  const 프로젝트: number[] = [];
  let 뿌리 = '';
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 번호들 = ['XSM-001', 'XSM2-001', 'XSM3-001'];
  const 사람 = { username: 'xsm', displayName: 'XSM 검사 사람' };

  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);
  const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
  const 시작 = () => 서비스['XSM']!;

  const 치우기표 = async () => {
    const 번호 = Object.values(서비스);
    await q(
      `DELETE FROM scenario_run_step WHERE part_id IN (
         SELECT p.id FROM scenario_run_part p JOIN test_run r ON r.run_id = p.run_id WHERE r.service_id = ANY($1::bigint[]))`,
      [번호],
    );
    await q('DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1::bigint[]))', [번호]);
    await q('DELETE FROM test_run WHERE service_id = ANY($1::bigint[])', [번호]);
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1::bigint[]))', [번호]);
    await q('DELETE FROM scenario WHERE service_id = ANY($1::bigint[])', [번호]);
    await q('DELETE FROM service_api WHERE service_id = ANY($1::bigint[])', [번호]);
  };

  const 환경 = (service: string, env: string, url: string, 아이디: string) =>
    q(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password) VALUES ($1, $2, $3, $4, 'pw-' || $4)
       ON CONFLICT (service_id, env) DO UPDATE SET base_url = EXCLUDED.base_url, login_id = EXCLUDED.login_id, login_password = EXCLUDED.login_password`,
      [서비스[service], env, url, 아이디],
    );

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xsm-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xsm'));
    await writeFile(join(뿌리, 'xsm', 'a.spec.ts'), 소스);

    // 앞 둘은 한 프로젝트, 셋째는 다른 프로젝트다
    for (const 이름 of ['XSM 프로젝트', 'XSM 다른 프로젝트']) {
      프로젝트.push(Number(((await q('INSERT INTO project (name) VALUES ($1) RETURNING id', [이름])).rows[0] as { id: string }).id));
    }
    for (const [i, p] of 접두사.entries()) {
      const r = await q(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id)
              VALUES ($1, $1 || ' 검사용', '#3A5FCD', 'git@x:xsm.git', 'xsm', $2)
         ON CONFLICT (prefix) DO UPDATE SET is_active = true, project_id = EXCLUDED.project_id RETURNING id`,
        [p, 프로젝트[i === 2 ? 1 : 0]],
      );
      서비스[p] = Number((r.rows[0] as { id: string }).id);
    }
    await 치우기표();
    await q('DELETE FROM service_env WHERE service_id = ANY($1::bigint[])', [Object.values(서비스)]);
    await 환경('XSM', 'stg', 'http://shop.xsm.example', 'shop-user');
    await 환경('XSM', 'qa', 'http://shop-qa.xsm.example', 'shop-qa');
    await 환경('XSM2', 'stg', 'http://adm.xsm.example', 'adm-user');
    await 환경('XSM3', 'stg', 'http://other.xsm.example', 'other-user');
    for (const tcId of 번호들) {
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $1 || ' 이름', '["desktop"]', '[]', 'xsm/a.spec.ts', $2, '{"type":"object"}')
         ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = true, param_schema = EXCLUDED.param_schema`,
        [tcId, JSON.stringify(입력스키마)],
      );
    }
  });

  afterAll(async () => {
    await 치우기표();
    await q('DELETE FROM service_env WHERE service_id = ANY($1::bigint[])', [Object.values(서비스)]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = ANY($1::bigint[])', [Object.values(서비스)]);
    await q('DELETE FROM project WHERE id = ANY($1::bigint[])', [프로젝트]);
    await rm(뿌리, { recursive: true, force: true });
    if (원래뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 원래뿌리;
  });

  it('같은 프로젝트의 활성 애플리케이션 접두사를 시작 애플리케이션을 앞에 두고 준다. 모르는 접두사는 자기뿐이다', async () => {
    expect(await 같은프로젝트접두사('XSM')).toEqual(['XSM', 'XSM2']);
    expect(await 같은프로젝트접두사('XSM2')).toEqual(['XSM2', 'XSM']);
    expect(await 같은프로젝트접두사('XSM3')).toEqual(['XSM3']);
    expect(await 같은프로젝트접두사('NOPE')).toEqual(['NOPE']);

    await q('UPDATE service SET is_active = false WHERE id = $1', [서비스['XSM2']]);
    try {
      expect(await 같은프로젝트접두사('XSM')).toEqual(['XSM']);
      // 시작 애플리케이션이 비활성이어도 자기는 든다 — 자기 케이스를 막으면 안 된다
      expect(await 같은프로젝트접두사('XSM2')).toEqual(['XSM2', 'XSM']);
    } finally {
      await q('UPDATE service SET is_active = true WHERE id = $1', [서비스['XSM2']]);
    }
  });

  it('같은 이름의 대상 서버를 애플리케이션마다 찾고, 하나라도 없으면 그 접두사를 알린다', async () => {
    const 있음 = await 쓰는앱읽기(['XSM', 'XSM2'], 'stg');
    expect(있음.없음).toBeNull();
    expect([...있음.앱들].map(([p, a]) => [p, a.baseUrl])).toEqual([['XSM', 'http://shop.xsm.example'], ['XSM2', 'http://adm.xsm.example']]);

    const 없음 = await 쓰는앱읽기(['XSM', 'XSM2'], 'qa');
    expect(없음.없음).toBe('XSM2');
  });

  it('섞은 시나리오는 단계마다 그 애플리케이션 주소 · 계정으로 러너 요청을 만들고 시작 애플리케이션 단계에는 주소를 안 붙인다', async () => {
    const 부품: ScenarioPart[] = [
      케이스('XSM-001'),
      케이스('XSM2-001'),
      { kind: 'api', method: 'GET', path: '/orders', expectStatus: 200, service: 'XSM2' },
      { kind: 'api', method: 'GET', path: '/health', expectStatus: 200 },
    ];
    const { id } = await 만들기(시작(), 'XSM 주문 확인', 'desktop', 부품, 사람);
    // 지도 줄은 호스트로 맞추므로 두 애플리케이션 것이 합쳐져 간다
    await q(`INSERT INTO service_api (service_id, method, host, path, ok_status) VALUES ($1, 'DELETE', 'shop.xsm.example', '/api/me', 200), ($2, 'DELETE', 'adm.xsm.example', '/api/me', 204)`, [시작(), 서비스['XSM2']]);

    const { runId, 요청 } = await 실행만들기(id, 'stg', 사람);

    expect(요청.baseUrl).toBe('http://shop.xsm.example');
    expect(요청.parts.map((p) => ('baseUrl' in p ? p.baseUrl : undefined))).toEqual([undefined, 'http://adm.xsm.example', 'http://adm.xsm.example', undefined]);
    expect(요청.parts.map((p) => (p.kind === 'case' ? p.params['userId'] : null))).toEqual(['shop-user', 'adm-user', null, null]);
    expect(요청.deleteStatuses).toEqual(expect.arrayContaining([
      { host: 'shop.xsm.example', path: '/api/me', status: 200 },
      { host: 'adm.xsm.example', path: '/api/me', status: 204 },
    ]));
    expect((await q('SELECT service_id, base_url FROM test_run WHERE run_id = $1', [runId])).rows[0]).toEqual({
      service_id: String(시작()),
      base_url: 'http://shop.xsm.example',
    });

    const 결과 = await 시나리오결과(runId);
    expect(결과!.parts.map((p) => [p.seq, p.service, p.baseUrl])).toEqual([
      [1, 'XSM', 'http://shop.xsm.example'],
      [2, 'XSM2', 'http://adm.xsm.example'],
      [3, 'XSM2', 'http://adm.xsm.example'],
      [4, 'XSM', 'http://shop.xsm.example'],
    ]);
  });

  it('삭제 성공 코드는 러너 입구 상한(1000줄)을 애플리케이션 수로 나눠 자른다 — 앞 애플리케이션이 뒤 애플리케이션 몫을 먹지 않는다', async () => {
    await q(
      `INSERT INTO service_api (service_id, method, host, path, ok_status)
       SELECT $1, 'DELETE', 'shop.xsm.example', '/api/many/' || g, 204 FROM generate_series(1, 700) g`,
      [시작()],
    );
    await q(`INSERT INTO service_api (service_id, method, host, path, ok_status) VALUES ($1, 'DELETE', 'adm.xsm.example', '/api/one', 200)`, [서비스['XSM2']]);
    const { 앱들 } = await 쓰는앱읽기(['XSM', 'XSM2'], 'stg');

    const 줄 = await 삭제코드합치기(앱들);

    expect(줄.filter((x) => x.host === 'shop.xsm.example')).toHaveLength(500);
    expect(줄.filter((x) => x.host === 'adm.xsm.example')).toContainEqual({ host: 'adm.xsm.example', path: '/api/one', status: 200 });
    expect(줄.length).toBeLessThanOrEqual(1000);
    await q('DELETE FROM service_api WHERE service_id = ANY($1::bigint[])', [Object.values(서비스)]);
  });

  it('섞인 애플리케이션 가운데 하나라도 그 이름의 대상 서버가 없으면 ENV_NOT_FOUND 이고 실행을 안 만든다', async () => {
    const { id } = await 만들기(시작(), 'XSM 이름 없음', 'desktop', [케이스('XSM-001'), 케이스('XSM2-001')], 사람);
    const 전 = Number(((await q('SELECT count(*) AS n FROM test_run WHERE service_id = $1', [시작()])).rows[0] as { n: string }).n);

    const 잡은 = await 실행만들기(id, 'qa', 사람).then(() => null, (e: unknown) => e);

    expect(잡은).toBeInstanceOf(시나리오실행오류);
    expect(잡은).toMatchObject({ code: 'ENV_NOT_FOUND' });
    expect((잡은 as Error).message).toContain('XSM2');
    const 후 = Number(((await q('SELECT count(*) AS n FROM test_run WHERE service_id = $1', [시작()])).rows[0] as { n: string }).n);
    expect(후).toBe(전);
  });

  it('시험 실행도 단계마다 그 애플리케이션 주소 · 계정으로 러너 요청을 만들고, 이름이 없는 애플리케이션이 있으면 거절한다', async () => {
    const 본문 = (env: string, parts: ScenarioPart[]) => ({ service: 'XSM', env, platform: 'desktop' as const, parts });

    await 시험시작({ username: 'xsm' }, 본문('stg', [케이스('XSM-001'), 케이스('XSM2-001')]));
    await vi.waitFor(() => expect(러너.요청).toHaveLength(1));

    const 요청 = 러너.요청[0] as ScenarioExecuteRequest;
    expect(요청.baseUrl).toBe('http://shop.xsm.example');
    expect(요청.parts.map((p) => ('baseUrl' in p ? p.baseUrl : undefined))).toEqual([undefined, 'http://adm.xsm.example']);
    expect(요청.parts.map((p) => (p.kind === 'case' ? p.params['userId'] : null))).toEqual(['shop-user', 'adm-user']);

    await expect(시험시작({ username: 'xsm' }, 본문('qa', [케이스('XSM-001'), 케이스('XSM2-001')]))).rejects.toMatchObject({
      code: 'ENV_NOT_FOUND',
      message: expect.stringContaining('XSM2') as string,
    });
    await expect(시험시작({ username: 'xsm' }, 본문('stg', [케이스('XSM3-001')]))).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  });

  it('다른 프로젝트 애플리케이션의 케이스를 쓰면 실행할 수 없다 — 비활성 케이스처럼 드러난다', async () => {
    const { id } = await 만들기(시작(), 'XSM 남의 프로젝트', 'desktop', [케이스('XSM-001'), 케이스('XSM3-001')], 사람);

    const 잡은 = await 실행만들기(id, 'stg', 사람).then(() => null, (e: unknown) => e);

    expect(잡은).toMatchObject({ code: 'NOT_RUNNABLE' });
    expect((잡은 as Error).message).toContain('XSM3-001');
  });

  it('저장 통로는 같은 프로젝트의 케이스를 받고 다른 프로젝트의 케이스는 400 으로 거절한다. 상세에는 확인 필요가 안 뜬다', async () => {
    const app = Fastify();
    await app.register(scenarioRoutes, { prefix: '/api' });
    try {
      const 저장 = (parts: ScenarioPart[]) =>
        app.inject({ method: 'POST', url: '/api/scenarios', payload: { service: 'XSM', name: 'XSM 저장', platform: 'desktop', parts } });

      const 됨 = await 저장([케이스('XSM-001'), 케이스('XSM2-001'), { kind: 'api', method: 'GET', path: '/orders', expectStatus: 200, service: 'XSM2' }]);
      expect(됨.statusCode).toBe(201);
      const id = 됨.json<{ id: number }>().id;
      const 상세 = await app.inject({ method: 'GET', url: `/api/scenarios/${id}` });
      expect(상세.json()).toMatchObject({ service: 'XSM', checks: [] });
      const 목록 = await app.inject({ method: 'GET', url: '/api/scenarios?service=XSM' });
      expect(목록.json<{ items: { id: number; runnable: boolean; needsCheck: boolean }[] }>().items.find((x) => x.id === id)).toMatchObject({
        runnable: true,
        needsCheck: false,
      });

      const 안됨 = await 저장([케이스('XSM3-001')]);
      expect(안됨.statusCode).toBe(400);
      expect(안됨.json<{ detail: string }>().detail).toContain('같은 프로젝트');
      const API안됨 = await 저장([케이스('XSM-001'), { kind: 'api', method: 'GET', path: '/x', expectStatus: 200, service: 'XSM3' }]);
      expect(API안됨.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('다른 프로젝트로 옮겨진 애플리케이션을 부르는 API 단계도 실행할 수 없다', async () => {
    const { id } = await 만들기(시작(), 'XSM 남의 API', 'desktop', [케이스('XSM-001'), { kind: 'api', method: 'GET', path: '/x', expectStatus: 200, service: 'XSM3' }], 사람);

    const 잡은 = await 실행만들기(id, 'stg', 사람).then(() => null, (e: unknown) => e);

    expect(잡은).toMatchObject({ code: 'NOT_RUNNABLE' });
    expect((잡은 as Error).message).toContain('XSM3');
  });
});
