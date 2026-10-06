// 시나리오 결과 저장이 부품 결과의 꽂은 값(bound)과 실행 한 벌의 뒷정리(cleanup)를 부품 행에 적는다 (SPEC 도메인/시나리오 §7)

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioCleanup, ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { 결과저장 } from './runResult.js';
import { 실행만들기 } from './runStore.js';

const 연결 = process.env.DATABASE_URL;

const 소스 = `import { defineCase, test } from '@platform/kit';

export const spec = defineCase({ tcId: 'XSB-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('주문을 만든다', async () => {
    await page.getByRole('button').click();
  });
});
`;

describe.skipIf(연결 === undefined)('시나리오 결과 저장 — 꽂은 값 · 뒷정리', () => {
  let 서비스 = 0;
  let 뿌리 = '';
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 번호들 = ['XSB-001'];
  const 사람 = { username: 'xsb', displayName: 'XSB 검사 사람' };

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
  };

  const 부품: ScenarioPart[] = [
    { kind: 'case', tcId: 'XSB-001', params: {}, expected: {}, skipSteps: [] },
    { kind: 'api', method: 'GET', path: '/health', expectStatus: 200 },
    { kind: 'wait', ms: 10 },
  ];

  // 조립 검사를 안 거치고 버전을 넣는다 — 이 파일은 결과 저장만 본다
  const 세부품 = async (): Promise<number> => {
    const s = await q<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XSB 시나리오', 'xsb') RETURNING id`,
      [서비스],
    );
    const id = Number(s.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name)
       VALUES ($1, 1, 'desktop', $2, 'xsb', 'XSB 검사 사람')`,
      [id, JSON.stringify(부품)],
    );
    return (await 실행만들기(id, 'qa', 사람)).runId;
  };

  const 행들 = async (runId: number) =>
    (
      await q<{ seq: number; bound: unknown; cleanup: unknown }>(
        'SELECT seq, bound, cleanup FROM scenario_run_part WHERE run_id = $1 ORDER BY seq',
        [runId],
      )
    ).rows;

  const 통과 = (seq: number, bound?: Record<string, unknown>) => ({
    seq,
    status: 'PASS' as const,
    durationMs: 1,
    mocks: [],
    steps: [],
    ...(bound === undefined ? {} : { bound }),
  });

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xsb-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xsb'));
    await writeFile(join(뿌리, 'xsb', 'a.spec.ts'), 소스);

    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XSB', 'XSB 시나리오 결과 꽂은 값 검사용', '#3A5FCD', 'git@x:xsb.git', 'xsb')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기표();
    await q(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://xsb.example')`, [서비스]);
    await q(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active)
       VALUES ('XSB-001', 'XSB-001 이름', '["desktop","mobile"]', '[]', 'xsb/a.spec.ts', '{"type":"object"}', '{"type":"object"}', true)
       ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = true`,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await 치우기표();
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
    if (원래뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 원래뿌리;
  });

  it('부품 결과의 bound 가 그 행에 들어가고, bound 가 없는 부품은 {} 다', async () => {
    const runId = await 세부품();
    const 응답: ScenarioExecuteResponse = {
      status: 'PASS',
      durationMs: 3,
      parts: [통과(1, { orderId: 7, 이름: '주문' }), 통과(2), 통과(3)],
    };
    expect(await 결과저장(runId, 응답)).toBe(true);

    expect((await 행들(runId)).map((r) => [r.seq, r.bound])).toEqual([
      [1, { orderId: 7, 이름: '주문' }],
      [2, {}],
      [3, {}],
    ]);
  });

  it('cleanup 을 fromSeq 별로 나눠 보낸 순서대로 그 행에 넣는다. 행에는 fromSeq 가 없다', async () => {
    const runId = await 세부품();
    const 뒷정리: ScenarioCleanup[] = [
      { fromSeq: 1, method: 'DELETE', url: 'http://xsb.example/api/orders/7', status: 204 },
      { fromSeq: 2, method: 'DELETE', url: 'http://xsb.example/api/carts/3', error: 'ECONNRESET' },
      { fromSeq: 1, method: 'DELETE', url: 'http://xsb.example/api/users/9', status: 404 },
    ];
    const 응답: ScenarioExecuteResponse = { status: 'PASS', durationMs: 3, parts: [통과(1), 통과(2), 통과(3)], cleanup: 뒷정리 };
    expect(await 결과저장(runId, 응답)).toBe(true);

    expect((await 행들(runId)).map((r) => [r.seq, r.cleanup])).toEqual([
      [
        1,
        [
          { method: 'DELETE', url: 'http://xsb.example/api/orders/7', status: 204 },
          { method: 'DELETE', url: 'http://xsb.example/api/users/9', status: 404 },
        ],
      ],
      [2, [{ method: 'DELETE', url: 'http://xsb.example/api/carts/3', error: 'ECONNRESET' }]],
      [3, []],
    ]);
  });

  it('모르는 fromSeq 줄은 버리고 로그를 남긴다. 러너가 안 돌려준 부품에도 cleanup 은 들어간다', async () => {
    const 경고 = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const runId = await 세부품();
    const 응답: ScenarioExecuteResponse = {
      status: 'FAIL',
      durationMs: 3,
      parts: [통과(1)],
      cleanup: [
        { fromSeq: 9, method: 'DELETE', url: 'http://xsb.example/api/x/1', status: 204 },
        { fromSeq: 2, method: 'DELETE', url: 'http://xsb.example/api/carts/3', status: 204 },
      ],
    };
    expect(await 결과저장(runId, 응답)).toBe(true);

    const 결과 = await 행들(runId);
    expect(결과.map((r) => [r.seq, r.cleanup])).toEqual([
      [1, []],
      [2, [{ method: 'DELETE', url: 'http://xsb.example/api/carts/3', status: 204 }]],
      [3, []],
    ]);
    expect(경고).toHaveBeenCalledWith(expect.stringContaining('fromSeq 9'));
    expect(경고.mock.calls.some((c) => String(c[0]).includes('fromSeq 2'))).toBe(false);
  });

  it('저장이 던지면 남기는 로그에 응답 cleanup 이 같이 실린다', async () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const runId = await 세부품();
    const 뒷정리: ScenarioCleanup[] = [
      { fromSeq: 1, method: 'DELETE', url: 'http://xsb.example/api/orders/7', error: '삭제가 거절됐다' },
    ];
    // title 이 NOT NULL 이라 절차 INSERT 가 던진다
    const 깨진: ScenarioExecuteResponse = {
      status: 'PASS',
      durationMs: 1,
      parts: [
        { ...통과(1), steps: [{ seq: 1, title: null as unknown as string, status: 'PASS', durationMs: 1, assertions: [] }] },
      ],
      cleanup: 뒷정리,
    };
    expect(await 결과저장(runId, 깨진)).toBe(false);

    const 저장실패로그 = 오류.mock.calls.find((c) => String(c[0]).includes('결과를 저장하지 못했다'));
    expect(저장실패로그).toBeDefined();
    expect(저장실패로그).toContainEqual({ cleanup: 뒷정리 });
  });
});
