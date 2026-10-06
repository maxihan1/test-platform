// 시나리오 결과 조회가 실행 머리 일곱 칸(이름 · 대상 서버 · 주소 · 실행자 · 시각)을 가리기 밖에서 낸다 (SPEC 도메인/시나리오 §7)

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import scenarioRunRoutes from './runRoutes.js';
import { 실행만들기 } from './runStore.js';

const 연결 = process.env.DATABASE_URL;

const 소스 = `import { defineCase, test } from '@platform/kit';

export const spec = defineCase({ tcId: 'XSH-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('주문을 만든다', async () => {
    await page.getByRole('button').click();
  });
});
`;

describe.skipIf(연결 === undefined)('시나리오 결과 조회 — 실행 머리', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 시나리오 = 0;
  let 뿌리 = '';
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 번호들 = ['XSH-001'];
  const 사람 = { username: 'xsh', displayName: 'XSH 검사 사람' };
  // 비밀 숫자가 시각 · 주소의 글자와 겹친다 — 응답 전체를 글자째 가리면 머리가 깨진다
  const 비밀 = 2026;
  const 주소 = 'http://xsh-2026.example';
  const 시작 = '2026-10-06T01:02:03.456Z';
  const 끝 = '2026-10-06T01:05:00.000Z';

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

  // 꽂은 값(bound)은 러너가 돌려준 것이라 결과 저장을 안 거치고 바로 넣는다 — 이 파일은 조회만 본다
  const 실행 = async (): Promise<number> => {
    const { runId } = await 실행만들기(시나리오, 'qa', 사람);
    await q('UPDATE test_run SET started_at = $2 WHERE run_id = $1', [runId, 시작]);
    await q('UPDATE scenario_run_part SET bound = $2 WHERE run_id = $1 AND seq = 1', [runId, JSON.stringify({ 핀: 비밀 })]);
    return runId;
  };

  const 조회 = async (runId: number) => {
    const res = await app.inject({ method: 'GET', url: `/api/runs/${runId}/scenario` });
    expect(res.statusCode).toBe(200);
    return res.json<Record<string, unknown> & { parts: { bound: unknown }[] }>();
  };

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xsh-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xsh'));
    await writeFile(join(뿌리, 'xsh', 'a.spec.ts'), 소스);

    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XSH', 'XSH 시나리오 결과 머리 검사용', '#3A5FCD', '', 'xsh')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기표();
    await q(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', $2)`, [서비스, 주소]);
    await q(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active)
       VALUES ('XSH-001', 'XSH-001 이름', '["desktop","mobile"]', '[]', 'xsh/a.spec.ts', $1, '{"type":"object"}', true)
       ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, param_schema = EXCLUDED.param_schema, is_active = true`,
      [JSON.stringify({ type: 'object', properties: { 핀: { type: 'number', secret: true } } })],
    );
    const s = await q<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XSH 시나리오', 'xsh') RETURNING id`,
      [서비스],
    );
    시나리오 = Number(s.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name)
       VALUES ($1, 1, 'desktop', $2, 'xsh', 'XSH 검사 사람')`,
      [시나리오, JSON.stringify([{ kind: 'case', tcId: 'XSH-001', params: {}, expected: {}, skipSteps: [] }, { kind: 'wait', ms: 10 }])],
    );

    app = Fastify();
    await app.register(scenarioRunRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await 치우기표();
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
    if (원래뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 원래뿌리;
  });

  it('끝난 실행은 머리 일곱 칸을 낸다. 숫자 비밀이 든 실행에서도 시각 · 주소는 원문이고 부품의 비밀은 그대로 가린다', async () => {
    const runId = await 실행();
    await q(`UPDATE test_run SET status = 'FINISHED', finished_at = $2 WHERE run_id = $1`, [runId, 끝]);
    await q(`UPDATE scenario SET name = 'XSH 바꾼 이름' WHERE id = $1`, [시나리오]);

    const 몸 = await 조회(runId);
    expect(몸).toMatchObject({
      title: 'XSH 시나리오',
      env: 'qa',
      baseUrl: 주소,
      triggeredBy: 'xsh',
      triggeredByName: 'XSH 검사 사람',
      startedAt: 시작,
      finishedAt: 끝,
    });
    expect(몸.parts[0]?.bound).toEqual({ 핀: '********' });
  });

  it('아직 도는 실행은 finishedAt 이 null 이다', async () => {
    const 몸 = await 조회(await 실행());
    expect(몸).toMatchObject({ status: 'RUNNING', startedAt: 시작, finishedAt: null });
  });
});
