import { lstat, lutimes, mkdir, mkdtemp, rm, stat, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioExecuteRequest, ScenarioPart } from '@platform/kit';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 시나리오시험 } from '../execution/trial.js';
import { 시험시작, 시험시작오류, 옛시험치우기 } from './trial.js';

const 옛uuid = '11111111-1111-4111-8111-111111111111';
const 새uuid = '22222222-2222-4222-8222-222222222222';
const 링크uuid = '33333333-3333-4333-8333-333333333333';

describe('24시간 지난 시험 사진 폴더 치우기', () => {
  let 뿌리 = '';
  let 밖 = '';
  const 지금 = new Date('2026-10-04T12:00:00Z').getTime();
  const 이틀전 = new Date('2026-10-02T12:00:00Z');

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xst-art-'));
    밖 = await mkdtemp(join(tmpdir(), 'xst-out-'));
    const trial = join(뿌리, 'runs', 'trial');
    await mkdir(join(trial, 옛uuid), { recursive: true });
    await writeFile(join(trial, 옛uuid, '1.png'), 'x');
    await utimes(join(trial, 옛uuid), 이틀전, 이틀전);
    await mkdir(join(trial, 새uuid));
    await mkdir(join(trial, '모양아님'));
    await utimes(join(trial, '모양아님'), 이틀전, 이틀전);
    await writeFile(join(밖, '남의것.txt'), 'x');
    await symlink(밖, join(trial, 링크uuid));
    await lutimes(join(trial, 링크uuid), 이틀전, 이틀전);
    await utimes(join(trial, 새uuid), new Date(지금), new Date(지금));

    await 옛시험치우기(뿌리, 지금);
  });

  afterAll(async () => {
    await rm(뿌리, { recursive: true, force: true });
    await rm(밖, { recursive: true, force: true });
  });

  const 있나 = (p: string) =>
    lstat(p).then(
      () => true,
      () => false,
    );

  it('24시간 지난 UUID 폴더는 지운다', async () => {
    expect(await 있나(join(뿌리, 'runs', 'trial', 옛uuid))).toBe(false);
  });

  it('새 폴더 · UUID 모양이 아닌 이름은 남긴다', async () => {
    expect(await 있나(join(뿌리, 'runs', 'trial', 새uuid))).toBe(true);
    expect(await 있나(join(뿌리, 'runs', 'trial', '모양아님'))).toBe(true);
  });

  it('링크는 링크만 지우고 가리키던 곳은 따라가지 않는다', async () => {
    expect(await 있나(join(뿌리, 'runs', 'trial', 링크uuid))).toBe(false);
    expect((await stat(join(밖, '남의것.txt'))).isFile()).toBe(true);
  });

  it('trial 폴더가 아직 없으면 조용히 끝난다', async () => {
    await expect(옛시험치우기(join(밖, '없는곳'), 지금)).resolves.toBeUndefined();
  });
});

const 연결 = process.env.DATABASE_URL;

const 소스 = `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'XST-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('로그인한다', async () => {
    await page.getByRole('button').click();
  });
  await test.step('주문이 보인다', async () => {
    await verify('보인다', 1, 1, { blocker: true });
  });
});
`;

describe.skipIf(연결 === undefined)('시험 실행 시작', () => {
  let 러너: FastifyInstance;
  let 서비스 = 0;
  let 뿌리 = '';
  let 사진뿌리 = '';
  let 받은요청: ScenarioExecuteRequest | null = null;
  const 원래 = {
    tests: process.env.PLATFORM_TESTS_DIR,
    artifacts: process.env.PLATFORM_ARTIFACTS_DIR,
    runner: process.env.RUNNER_URL,
  };
  const 번호들 = ['XST-001', 'XST-UI-001'];
  const 사람 = { username: 'xst-a', displayName: 'XST 검사 사람' };

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  const 케이스 = (tcId: string): ScenarioPart => ({
    kind: 'case',
    tcId,
    params: { 아이디: 'xst-user', 비밀번호: 'xst-secret-77' },
    expected: {},
    skipSteps: [],
  });
  const 본문 = (덧: Partial<{ service: string; env: string; parts: ScenarioPart[] }> = {}) => ({
    service: 'XST',
    env: 'qa',
    platform: 'desktop' as const,
    parts: [케이스('XST-001'), { kind: 'wait' as const, ms: 10 }],
    ...덧,
  });

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xst-'));
    사진뿌리 = await mkdtemp(join(tmpdir(), 'xst-art-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    process.env.PLATFORM_ARTIFACTS_DIR = 사진뿌리;
    await mkdir(join(뿌리, 'xst'));
    await writeFile(join(뿌리, 'xst', 'a.spec.ts'), 소스);

    const r = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XST', 'XST 시험 실행 검사용', '#3A5FCD', '', 'xst')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://xst.example')`, [서비스]);
    for (const tcId of 번호들) {
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active)
         VALUES ($1, $1 || ' 이름', '["desktop"]', '[]', 'xst/a.spec.ts',
                 '{"type":"object","properties":{"아이디":{"type":"string"},"비밀번호":{"type":"string","secret":true}}}',
                 '{"type":"object"}', true)
         ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = true, param_schema = EXCLUDED.param_schema`,
        [tcId],
      );
    }

    러너 = Fastify();
    러너.post('/execute-scenario', async (req) => {
      받은요청 = req.body as ScenarioExecuteRequest;
      return { status: 'FAIL', durationMs: 3, parts: [], error: { message: '비밀번호 xst-secret-77 로 로그인 실패' } };
    });
    await 러너.listen({ port: 0, host: '127.0.0.1' });
    const addr = 러너.server.address();
    process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
  });

  beforeEach(() => {
    시나리오시험.전부비운다();
    받은요청 = null;
  });

  afterAll(async () => {
    await 러너.close();
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
    await rm(사진뿌리, { recursive: true, force: true });
    for (const [키, 값] of [
      ['PLATFORM_TESTS_DIR', 원래.tests],
      ['PLATFORM_ARTIFACTS_DIR', 원래.artifacts],
      ['RUNNER_URL', 원래.runner],
    ] as const) {
      if (값 === undefined) delete process.env[키];
      else process.env[키] = 값;
    }
  });

  it('모르는 서비스는 INVALID_REQUEST 다', async () => {
    await expect(시험시작(사람, 본문({ service: 'XSTNONE' }))).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
      message: '모르는 서비스다: XSTNONE',
    });
  });

  it('조립 검사에 걸리면 만들기와 같은 사유로 INVALID_REQUEST 다', async () => {
    const 거절 = 시험시작(사람, 본문({ parts: [케이스('XST-UI-001')] }));
    await expect(거절).rejects.toBeInstanceOf(시험시작오류);
    await expect(거절).rejects.toMatchObject({ code: 'INVALID_REQUEST', message: expect.stringContaining('UI 테스트') });
  });

  it('그 서비스에 없는 대상 서버는 ENV_NOT_FOUND 다', async () => {
    await expect(시험시작(사람, 본문({ env: 'nope' }))).rejects.toMatchObject({ code: 'ENV_NOT_FOUND' });
  });

  it('runId 없이 trialId · 케이스 파일 · 제한 시간을 실어 러너에 보내고 결과의 비밀값을 가린다', async () => {
    const trialId = await 시험시작(사람, 본문());
    expect(trialId).toMatch(/^[0-9a-f-]{36}$/);
    await vi.waitFor(() => expect(시나리오시험.읽는다('xst-a', trialId)?.status).toBe('FINISHED'));

    expect(받은요청).toMatchObject({
      runId: null,
      trialId,
      platform: 'desktop',
      baseUrl: 'http://xst.example',
      timeoutMs: 300010,
      parts: [{ kind: 'case', tcId: 'XST-001', filePath: 'xst/a.spec.ts' }, { kind: 'wait', ms: 10 }],
    });
    const 결과 = JSON.stringify(시나리오시험.읽는다('xst-a', trialId));
    expect(결과).not.toContain('xst-secret-77');
    expect(결과).toContain('********');
    expect(시나리오시험.서비스('xst-a', trialId)).toBe('XST');
  });
});
