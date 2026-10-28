// 앱 · 게임 단계가 있는 시나리오 실행 — 앱 단계 표시 · 폰 칸 · 팜에서 폰 한 번 잡기 · 기기 정보 저장 · FARM_OFF · DEVICE_BUSY (SPEC 도메인/시나리오 §3.7 결정 16)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioExecuteRequest, ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { 폰을놓는다, 폰을바로잡는다 } from '../execution/phone.js';

import { 시나리오분배 } from './runResult.js';
import { 시나리오결과 } from './runRoutes.js';
import { 실행만들기, 시나리오실행오류 } from './runStore.js';
import { 만들기 } from './store.js';
import { 시험시작, 시험시작오류 } from './trial.js';

const 연결 = process.env.DATABASE_URL;

const 가짜 = vi.hoisted(() => ({
  요청: [] as ScenarioExecuteRequest[],
  응답: null as ScenarioExecuteResponse | null,
  팜: 'http://farm.xae' as string | undefined,
  잡은분: [] as number[],
  못잡음: null as string | null,
}));
vi.mock('../execution/runner.js', async (원래) => ({
  ...(await 원래<typeof import('../execution/runner.js')>()),
  callScenarioRunner: async (요청: ScenarioExecuteRequest) => {
    가짜.요청.push(요청);
    return 가짜.응답 ?? { status: 'PASS', durationMs: 1, parts: [] };
  },
  켜진내컴퓨터러너: async () => undefined,
}));
vi.mock('../execution/farm.js', async (원래) => ({
  ...(await 원래<typeof import('../execution/farm.js')>()),
  팜주소: () => 가짜.팜,
  팜폰으로: async <T,>(_팜: string, 일: (udid: string) => Promise<T>, 못잡음: (까닭: string) => T, _f?: unknown, _s?: unknown, 분?: number) => {
    가짜.잡은분.push(분 ?? 0);
    return 가짜.못잡음 === null ? 일('UDID-XAE') : 못잡음(가짜.못잡음);
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

describe.skipIf(연결 === undefined)('앱 · 게임 단계가 있는 시나리오 실행', () => {
  const 서비스: Record<string, number> = {};
  let 프로젝트 = 0;
  let 뿌리 = '';
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 번호들 = ['XAE-001', 'XAE-002', 'XAEW-001'];
  const 사람 = { username: 'xae', displayName: 'XAE 검사 사람' };
  const 키 = { header: 'X-Admin-Key', value: 'xae-admin-secret' };

  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);
  const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
  const 조립 = [케이스('XAE-001'), 케이스('XAEW-001'), 케이스('XAE-002')];

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

  const 앱시나리오 = async () => (await 만들기(서비스['XAE']!, 'XAE 주문 흐름', 'android', 조립, 사람)).id;

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xae-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xae'));
    for (const tcId of 번호들) await writeFile(join(뿌리, 'xae', `${tcId}.spec.ts`), 소스(tcId));

    프로젝트 = Number(((await q("INSERT INTO project (name) VALUES ('XAE 프로젝트') RETURNING id")).rows[0] as { id: string }).id);
    for (const [prefix, kind] of [['XAE', 'APP'], ['XAEW', 'SCREEN']]) {
      const r = await q(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind)
              VALUES ($1, $1 || ' 검사용', '#3A5FCD', 'git@x:xae.git', 'xae', $2, $3)
         ON CONFLICT (prefix) DO UPDATE SET is_active = true, project_id = EXCLUDED.project_id, kind = EXCLUDED.kind RETURNING id`,
        [prefix, 프로젝트, kind],
      );
      서비스[prefix!] = Number((r.rows[0] as { id: string }).id);
    }
    await 치우기표();
    await q('DELETE FROM service_env WHERE service_id = ANY($1::bigint[])', [Object.values(서비스)]);
    await q("INSERT INTO service_env (service_id, env, base_url, app_path, admin_key) VALUES ($1, 'stg', 'http://api.xae.example', '/apps/xae.apk', $2)", [
      서비스['XAE'],
      JSON.stringify(키),
    ]);
    await q("INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'stg', 'http://ops.xae.example')", [서비스['XAEW']]);
    for (const tcId of 번호들) {
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $1 || ' 이름', $2, '[]', 'xae/' || $1 || '.spec.ts', '{"type":"object"}', '{"type":"object"}')
         ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = true, platforms = EXCLUDED.platforms`,
        [tcId, tcId.startsWith('XAEW') ? '["desktop"]' : '["android"]'],
      );
    }
  });

  afterEach(() => {
    가짜.요청.length = 0;
    가짜.잡은분.length = 0;
    가짜.응답 = null;
    가짜.팜 = 'http://farm.xae';
    가짜.못잡음 = null;
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

  it('앱 단계에만 appStep 을 싣고 폰 재료를 돌려준다 — 부품 기록에는 표시가 없다', async () => {
    const { runId, 요청, 폰 } = await 실행만들기(await 앱시나리오(), 'stg', 사람);

    expect(요청.platform).toBe('android');
    expect(요청.parts.map((p) => (p.kind === 'case' ? [p.tcId, p.appStep ?? false] : null))).toEqual([
      ['XAE-001', true],
      ['XAEW-001', false],
      ['XAE-002', true],
    ]);
    expect(요청.engine).toBeUndefined();
    expect(요청.adminKey).toBeUndefined();
    expect(폰).toEqual({ serviceId: 서비스['XAE'], env: 'stg', appPath: '/apps/xae.apk' });
    const 기록 = await q('SELECT part FROM scenario_run_part WHERE run_id = $1 ORDER BY seq', [runId]);
    expect(JSON.stringify(기록.rows)).not.toContain('appStep');
  });

  it('게임이면 엔진과 어드민 키를 요청에 한 벌 싣고 부품 기록에는 안 넣는다', async () => {
    await q("UPDATE service SET kind = 'GAME' WHERE id = $1", [서비스['XAE']]);
    try {
      const { runId, 요청 } = await 실행만들기(await 앱시나리오(), 'stg', 사람);

      expect(요청.engine).toBe('GAME');
      expect(요청.adminKey).toEqual(키);
      const 기록 = await q('SELECT part FROM scenario_run_part WHERE run_id = $1', [runId]);
      expect(JSON.stringify(기록.rows)).not.toContain(키.value);
    } finally {
      await q("UPDATE service SET kind = 'APP' WHERE id = $1", [서비스['XAE']]);
    }
  });

  it('저장 뒤 섞은 애플리케이션이 앱으로 바뀌어 앱이 둘이면 실행을 거절한다', async () => {
    const id = await 앱시나리오();
    await q("UPDATE service SET kind = 'APP' WHERE id = $1", [서비스['XAEW']]);
    try {
      const 잡은 = await 실행만들기(id, 'stg', 사람).then(() => null, (e: unknown) => e);

      expect((잡은 as 시나리오실행오류).code).toBe('NOT_RUNNABLE');
      expect((잡은 as 시나리오실행오류).message).toContain('앱 · 게임 애플리케이션은 한 시나리오에 하나다: XAE · XAEW');
    } finally {
      await q("UPDATE service SET kind = 'SCREEN' WHERE id = $1", [서비스['XAEW']]);
    }
  });

  it('서버에 디바이스 팜이 없으면 실행 행을 세우지 않고 FARM_OFF 로 거절한다', async () => {
    가짜.팜 = undefined;
    const id = await 앱시나리오();

    const 잡은 = await 실행만들기(id, 'stg', 사람).then(() => null, (e: unknown) => e);

    expect(잡은).toBeInstanceOf(시나리오실행오류);
    expect((잡은 as 시나리오실행오류).code).toBe('FARM_OFF');
    expect((await q('SELECT 1 FROM test_run WHERE scenario_id = $1', [id])).rowCount).toBe(0);
  });

  it('팜에서 폰을 한 번 잡아 udid · 앱 파일을 싣고, 러너가 준 기기 정보를 실행에 적는다', async () => {
    const { runId, 요청, 폰 } = await 실행만들기(await 앱시나리오(), 'stg', 사람);
    const 기기 = { model: 'Galaxy S23', osVersion: '14', appVersion: '1.2.0' };
    가짜.응답 = {
      status: 'PASS',
      durationMs: 3,
      parts: [1, 2, 3].map((seq) => ({ seq, status: 'PASS' as const, durationMs: 1, steps: [], mocks: [] })),
      device: 기기,
    };

    await 시나리오분배(runId, 요청, 폰);

    expect(가짜.잡은분).toEqual([30]);
    expect(가짜.요청).toHaveLength(1);
    expect(가짜.요청[0]).toMatchObject({ udid: 'UDID-XAE', app: '/apps/xae.apk' });
    const 결과 = await 시나리오결과(runId);
    expect(결과?.device).toEqual(기기);
    expect(결과?.farm).toEqual([]);
  });

  it('폰을 못 잡으면 러너에 안 보내고 첫 단계를 그 까닭, 뒤 단계를 NOT_RUN 으로 닫는다', async () => {
    가짜.못잡음 = '디바이스 팜에 빈 폰이 없습니다';
    const { runId, 요청, 폰 } = await 실행만들기(await 앱시나리오(), 'stg', 사람);

    await 시나리오분배(runId, 요청, 폰);

    expect(가짜.요청).toHaveLength(0);
    const 부품 = await q('SELECT seq, status, error FROM scenario_run_part WHERE run_id = $1 ORDER BY seq', [runId]);
    expect(부품.rows.map((r: { status: string; error: { message: string } }) => [r.status, r.error.message])).toEqual([
      ['NA', '디바이스 팜에 빈 폰이 없습니다'],
      ['NA', 'NOT_RUN'],
      ['NA', 'NOT_RUN'],
    ]);
    expect((await 시나리오결과(runId))?.device).toBeNull();
  });

  it('시험 실행은 내 컴퓨터 러너도 팜도 없으면 FARM_OFF, 폰이 쓰이는 중이면 DEVICE_BUSY 다', async () => {
    const 본문 = { service: 'XAE', env: 'stg', platform: 'android' as const, parts: 조립 };

    가짜.팜 = undefined;
    const 팜없음 = await 시험시작(사람, 본문).then(() => null, (e: unknown) => e);
    expect((팜없음 as 시험시작오류).code).toBe('FARM_OFF');

    가짜.팜 = 'http://farm.xae';
    expect(폰을바로잡는다()).toBe(true);
    try {
      const 바쁨 = await 시험시작(사람, 본문).then(() => null, (e: unknown) => e);
      expect((바쁨 as 시험시작오류).code).toBe('DEVICE_BUSY');
    } finally {
      폰을놓는다();
    }
  });
});
