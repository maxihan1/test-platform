// 모바일 시나리오를 실제 폰 Chrome 에서 — 정식 실행은 고른 것만 · 시험 실행은 팜이 있으면 늘 · 앱 단계가 섞이면 흉내 · 못 잡으면 NA (SPEC 도메인/시나리오 §3.7 「모바일 시나리오를 실제 폰에서 돌릴 때」)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioExecuteRequest, ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { 폰을바로잡는다, 폰을놓는다 } from '../execution/phone.js';
import { 시나리오시험 } from '../execution/trial.js';

import { 시나리오분배 } from './runResult.js';
import { 시나리오결과 } from './runRoutes.js';
import { 실행만들기, 시나리오실행오류 } from './runStore.js';
import { 만들기 } from './store.js';
import { 시험시작 } from './trial.js';

const 연결 = process.env.DATABASE_URL;

const 가짜 = vi.hoisted(() => ({
  요청: [] as ScenarioExecuteRequest[],
  응답: null as ScenarioExecuteResponse | null,
  팜: 'http://farm.xmw' as string | undefined,
  Chrome분: [] as (number | undefined)[],
  못잡음: null as string | null,
  멈춤: null as Promise<void> | null,
}));
vi.mock('../execution/runner.js', async (원래) => ({
  ...(await 원래<typeof import('../execution/runner.js')>()),
  callScenarioRunner: async (요청: ScenarioExecuteRequest) => {
    가짜.요청.push(요청);
    await 가짜.멈춤;
    return 가짜.응답 ?? { status: 'PASS', durationMs: 1, parts: [] };
  },
}));
vi.mock('../execution/farm.js', async (원래) => ({
  ...(await 원래<typeof import('../execution/farm.js')>()),
  팜주소: () => 가짜.팜,
  팜폰으로: async <T,>(_팜: string, 일: (udid: string, 화면: string | undefined) => Promise<T>) => 일('UDID-APP', undefined),
  폰Chrome으로: async <T,>(_팜: string, 일: (칸: object, 화면: string | undefined) => Promise<T>, 못잡음: (까닭: string) => T, _토큰?: string, 분?: number) => {
    가짜.Chrome분.push(분);
    return 가짜.못잡음 === null
      ? 일({ udid: 'UDID-XMW', cdpUrl: 'wss://farm.xmw/api/devices/UDID-XMW/chrome/cdp', farmToken: 'pat_srv' }, 'https://farm.xmw/#phone=UDID-XMW&view=k')
      : 못잡음(가짜.못잡음);
  },
}));

const 소스 = (tcId: string) => `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: '${tcId}', name: 'x', precondition: [], params: null, expected: null });

test(spec, async () => {
  await test.step('한 건이다', async () => {
    await verify('한 건이다', 1, 1, { blocker: true });
  });
});
`;

describe.skipIf(연결 === undefined)('모바일 시나리오를 실제 폰 Chrome 에서', () => {
  const 서비스: Record<string, number> = {};
  let 프로젝트 = 0;
  let 뿌리 = '';
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 번호들 = ['XMW-001', 'XMW-002', 'XMWA-001'];
  const 사람 = { username: 'xmw', displayName: 'XMW 검사 사람' };

  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);
  const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
  const 웹조립 = [케이스('XMW-001'), 케이스('XMW-002')];

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
  };

  const 모바일시나리오 = async (parts = 웹조립) => (await 만들기(서비스['XMW']!, 'XMW 모바일 흐름', 'mobile', parts, 사람)).id;

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xmw-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xmw'));
    for (const tcId of 번호들) await writeFile(join(뿌리, 'xmw', `${tcId}.spec.ts`), 소스(tcId));

    프로젝트 = Number(((await q("INSERT INTO project (name) VALUES ('XMW 프로젝트') RETURNING id")).rows[0] as { id: string }).id);
    for (const [prefix, kind] of [['XMW', 'SCREEN'], ['XMWA', 'APP']]) {
      const r = await q(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind)
              VALUES ($1, $1 || ' 검사용', '#3A5FCD', 'git@x:xmw.git', 'xmw', $2, $3)
         ON CONFLICT (prefix) DO UPDATE SET is_active = true, project_id = EXCLUDED.project_id, kind = EXCLUDED.kind RETURNING id`,
        [prefix, 프로젝트, kind],
      );
      서비스[prefix!] = Number((r.rows[0] as { id: string }).id);
    }
    await 치우기표();
    await q('DELETE FROM service_env WHERE service_id = ANY($1::bigint[])', [Object.values(서비스)]);
    for (const prefix of ['XMW', 'XMWA']) {
      await q("INSERT INTO service_env (service_id, env, base_url, app_path) VALUES ($1, 'stg', 'http://web.xmw.example', '/apps/xmw.apk')", [서비스[prefix]]);
    }
    for (const tcId of 번호들) {
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $1 || ' 이름', $2, '[]', 'xmw/' || $1 || '.spec.ts', '{"type":"object"}', '{"type":"object"}')
         ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = true, platforms = EXCLUDED.platforms`,
        [tcId, tcId.startsWith('XMWA') ? '["android"]' : '["desktop","mobile"]'],
      );
    }
  });

  afterEach(() => {
    가짜.요청.length = 0;
    가짜.Chrome분.length = 0;
    가짜.응답 = null;
    가짜.팜 = 'http://farm.xmw';
    가짜.못잡음 = null;
    가짜.멈춤 = null;
  });

  afterAll(async () => {
    await 치우기표();
    await q('DELETE FROM service_env WHERE service_id = ANY($1::bigint[])', [Object.values(서비스)]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = ANY($1::bigint[])', [Object.values(서비스)]);
    await q('DELETE FROM project WHERE id = $1', [프로젝트]);
    await rm(뿌리, { recursive: true, force: true });
    if (원래뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 원래뿌리;
  });

  it('정식 실행은 Device VISION 을 고른 모바일 시나리오만 실제 폰이다 — 기본 · PC 시나리오 · 앱 단계가 섞이면 흉내', async () => {
    expect((await 실행만들기(await 모바일시나리오(), 'stg', 사람, 'vision')).폰).toBe('chrome');
    expect((await 실행만들기(await 모바일시나리오(), 'stg', 사람)).폰).toBeUndefined();
    const PC = (await 만들기(서비스['XMW']!, 'XMW PC 흐름', 'desktop', 웹조립, 사람)).id;
    expect((await 실행만들기(PC, 'stg', 사람, 'vision')).폰).toBeUndefined();
    const 섞임 = await 실행만들기(await 모바일시나리오([케이스('XMW-001'), 케이스('XMWA-001')]), 'stg', 사람, 'vision');
    expect(섞임.폰).toEqual({ serviceId: 서비스['XMWA'], env: 'stg', appPath: '/apps/xmw.apk' });
  });

  it('팜이 없는 서버에서 Device VISION 을 고르면 실행 행을 세우지 않고 FARM_OFF 다', async () => {
    가짜.팜 = undefined;
    const id = await 모바일시나리오();

    const 잡은 = await 실행만들기(id, 'stg', 사람, 'vision').then(() => null, (e: unknown) => e);

    expect((잡은 as 시나리오실행오류).code).toBe('FARM_OFF');
    expect((await q('SELECT 1 FROM test_run WHERE scenario_id = $1', [id])).rowCount).toBe(0);
    expect((await 실행만들기(id, 'stg', 사람)).폰).toBeUndefined();
  });

  it('폰을 한 번 잡아 Chrome 칸을 싣고 디바이스 줄은 안 쓴다 · 러너가 준 기기 정보를 실행에 적는다', async () => {
    const { runId, 요청, 폰 } = await 실행만들기(await 모바일시나리오(), 'stg', 사람, 'vision');
    const 기기 = { model: 'SM-G996N', osVersion: '15', appVersion: null, browser: '156.0.7339.51' };
    가짜.응답 = { status: 'PASS', durationMs: 3, parts: [1, 2].map((seq) => ({ seq, status: 'PASS' as const, durationMs: 1, steps: [], mocks: [] })), device: 기기 };

    // 게임 실행이 디바이스 줄을 쥐고 있어도 실제 폰 모바일 시나리오는 막히지 않는다
    expect(폰을바로잡는다()).toBe(true);
    try {
      await 시나리오분배(runId, 요청, 폰);
    } finally {
      폰을놓는다();
    }

    expect(가짜.Chrome분).toEqual([30]);
    expect(가짜.요청[0]).toMatchObject({ platform: 'mobile', udid: 'UDID-XMW', cdpUrl: 'wss://farm.xmw/api/devices/UDID-XMW/chrome/cdp', farmToken: 'pat_srv' });
    expect((await 시나리오결과(runId))?.device).toEqual(기기);
  });

  it('폰을 못 잡으면 러너에 안 보내고 첫 단계를 그 까닭, 뒤 단계를 NOT_RUN 으로 닫는다', async () => {
    가짜.못잡음 = 'Device VISION 에 빈 폰이 없습니다';
    const { runId, 요청, 폰 } = await 실행만들기(await 모바일시나리오(), 'stg', 사람, 'vision');

    await 시나리오분배(runId, 요청, 폰);

    expect(가짜.요청).toHaveLength(0);
    const 부품 = await q('SELECT status, error FROM scenario_run_part WHERE run_id = $1 ORDER BY seq', [runId]);
    expect(부품.rows.map((r: { status: string; error: { message: string } }) => [r.status, r.error.message])).toEqual([
      ['NA', 'Device VISION 에 빈 폰이 없습니다'],
      ['NA', 'NOT_RUN'],
    ]);
  });

  it('시험 실행의 모바일 시나리오는 팜이 있으면 늘 실제 폰이고 그 폰 화면 링크를 낸다 — 팜이 없으면 흉내', async () => {
    let 풀기: () => void = () => undefined;
    가짜.멈춤 = new Promise<void>((ok) => (풀기 = ok));
    const 본문 = { service: 'XMW', env: 'stg', platform: 'mobile' as const, parts: 웹조립 };
    const trialId = await 시험시작(사람, 본문);
    try {
      await vi.waitFor(() => expect(가짜.요청).toHaveLength(1));
      expect(가짜.요청[0]).toMatchObject({ cdpUrl: 'wss://farm.xmw/api/devices/UDID-XMW/chrome/cdp', live: trialId });
      expect(시나리오시험.읽는다(사람.username, trialId)).toEqual({ status: 'RUNNING', vision: { url: 'https://farm.xmw/#phone=UDID-XMW&view=k' } });
    } finally {
      풀기();
    }
    await vi.waitFor(() => expect(시나리오시험.읽는다(사람.username, trialId)?.status).toBe('FINISHED'));

    가짜.팜 = undefined;
    가짜.멈춤 = null;
    const 흉내 = await 시험시작(사람, 본문);
    await vi.waitFor(() => expect(시나리오시험.읽는다(사람.username, 흉내)?.status).toBe('FINISHED'));
    expect('cdpUrl' in 가짜.요청[1]!).toBe(false);
  });
});
