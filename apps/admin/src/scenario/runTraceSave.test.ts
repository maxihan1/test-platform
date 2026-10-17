// 시나리오 결과 저장이 실패한 부품의 네트워크 · 조작 · 콘솔을 가려 그 행에 넣고, 결과 조회가 싣는다 (SPEC 도메인/시나리오 §7 「실패 기록」 · DB 접속이 있을 때만 돈다)

import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';
import JSZip from 'jszip';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 결과저장 } from './runResult.js';
import { 시나리오결과 } from './runRoutes.js';
import { 실행만들기 } from './runStore.js';
import { 시나리오trace경로 } from './runTrace.js';

const 연결 = process.env.DATABASE_URL;
const 비번 = 'xsw-비번';
const j = (...줄: unknown[]): string => 줄.map((l) => JSON.stringify(l)).join('\n');

const 소스 = `import { defineCase, test } from '@platform/kit';

export const spec = defineCase({ tcId: 'XSW-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('누른다', async () => {
    await page.getByRole('button').click();
  });
});
`;

// 단계 1(앞 부품) · 단계 2(실패 부품) 경계와 단계마다 콘솔 한 줄 · 실패 부품에 비밀번호가 든 API 한 줄
async function 가짜zip(): Promise<Buffer> {
  const 묶음 = new JSZip();
  묶음.file(
    'test.trace',
    j(
      { type: 'context-options', monotonicTime: 0 },
      { type: 'before', callId: 'a@1', method: 'test.attach', class: 'Test', startTime: 100 },
      { type: 'after', callId: 'a@1', attachments: [{ name: 'platform-step', file: 'attachments/s1' }] },
      { type: 'before', callId: 'a@2', method: 'test.attach', class: 'Test', startTime: 200 },
      { type: 'after', callId: 'a@2', attachments: [{ name: 'platform-step', file: 'attachments/s2' }] },
    ),
  );
  묶음.file('attachments/s1', '{"seq":1}');
  묶음.file('attachments/s2', '{"seq":2}');
  묶음.file(
    '1-trace.trace',
    j(
      { type: 'console', messageType: 'error', text: '앞 부품 오류', time: 50 },
      { type: 'event', method: 'pageError', time: 150, params: { error: { error: { message: '터짐', stack: `TypeError: 터짐 ${비번}` } } } },
    ),
  );
  묶음.file(
    '1-trace.network',
    j({
      type: 'resource-snapshot',
      snapshot: {
        _monotonicTime: 160, _resourceType: 'fetch', time: 4,
        request: { method: 'POST', url: 'http://xsw.example/api/login', postData: { mimeType: 'application/json', text: `{"password":"${비번}"}` } },
        response: { status: 500, content: { mimeType: 'application/json', text: '{"error":"boom"}' } },
      },
    }),
  );
  return 묶음.generateAsync({ type: 'nodebuffer' });
}

describe.skipIf(연결 === undefined)('시나리오 결과 저장 — 실패 기록', () => {
  let 서비스 = 0;
  let 뿌리 = '';
  let 산출물 = '';
  const 원래 = { 뿌리: process.env.PLATFORM_TESTS_DIR, 산출물: process.env.PLATFORM_ARTIFACTS_DIR };
  const 명세 = { type: 'object', properties: { password: { type: 'string', secret: true } } };

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

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xsw-'));
    산출물 = await mkdtemp(join(tmpdir(), 'xsw-art-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    process.env.PLATFORM_ARTIFACTS_DIR = 산출물;
    await mkdir(join(뿌리, 'xsw'));
    await writeFile(join(뿌리, 'xsw', 'a.spec.ts'), 소스);
    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XSW', 'XSW 시나리오 실패 기록 검사용', '#3A5FCD', 'git@x:xsw.git', 'xsw')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기표();
    await q(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://xsw.example')`, [서비스]);
    await q(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active)
       VALUES ('XSW-001', 'XSW-001 이름', '["desktop"]', '[]', 'xsw/a.spec.ts', $1, '{}', true)
       ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, param_schema = EXCLUDED.param_schema, is_active = true`,
      [JSON.stringify(명세)],
    );
  });

  afterAll(async () => {
    await 치우기표();
    await q("DELETE FROM test_case WHERE tc_id = 'XSW-001'");
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
    await rm(산출물, { recursive: true, force: true });
    for (const [키, 값] of [['PLATFORM_TESTS_DIR', 원래.뿌리], ['PLATFORM_ARTIFACTS_DIR', 원래.산출물]] as const) {
      if (값 === undefined) delete process.env[키];
      else process.env[키] = 값;
    }
  });

  it('실패 부품 몫만 가려 넣고 zip 을 지운다 — 결과 조회가 그대로 싣는다', async () => {
    const 부품: ScenarioPart[] = [
      { kind: 'case', tcId: 'XSW-001', params: { password: 비번 }, expected: {}, skipSteps: [] },
      { kind: 'case', tcId: 'XSW-001', params: { password: 비번 }, expected: {}, skipSteps: [] },
    ];
    const s = await q<{ id: string }>(`INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XSW 시나리오', 'xsw') RETURNING id`, [서비스]);
    const id = Number(s.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name) VALUES ($1, 1, 'desktop', $2, 'xsw', 'XSW')`,
      [id, JSON.stringify(부품)],
    );
    const { runId } = await 실행만들기(id, 'qa', { username: 'xsw', displayName: 'XSW' });
    const 경로 = 시나리오trace경로({ runId });
    await mkdir(join(경로, '..'), { recursive: true });
    await writeFile(경로, await 가짜zip());

    const 단계 = (seq: number, status: 'PASS' | 'FAIL') => ({ seq, title: '누른다', status, durationMs: 1, assertions: [] });
    const 응답: ScenarioExecuteResponse = {
      status: 'FAIL',
      durationMs: 3,
      parts: [
        { seq: 1, status: 'PASS', durationMs: 1, mocks: [], steps: [단계(1, 'PASS')] },
        { seq: 2, status: 'FAIL', durationMs: 1, mocks: [], steps: [단계(2, 'FAIL')] },
      ],
    };
    expect(await 결과저장(runId, 응답)).toBe(true);

    const 행 = (await q<{ seq: number; trace: unknown }>('SELECT seq, trace FROM scenario_run_part WHERE run_id = $1 ORDER BY seq', [runId])).rows;
    expect(행[0]!.trace).toBeNull();
    const 기록 = 행[1]!.trace as { status: string; console: { seq: number; level: string; text: string }[]; network: { seq: number; requestBody: string }[] };
    expect(기록.status).toBe('DONE');
    expect(기록.console.map((c) => [c.seq, c.level])).toEqual([[2, 'pageerror']]);
    expect(기록.network.map((n) => n.seq)).toEqual([2]);
    expect(JSON.stringify(기록)).not.toContain(비번);
    expect(existsSync(경로)).toBe(false);

    const 본것 = await 시나리오결과(runId);
    expect(본것?.parts.map((p) => p.trace === null)).toEqual([true, false]);
    expect(본것?.parts[1]?.trace?.console[0]?.text).toBe('TypeError: 터짐 ********');
  });
});
