// 화면이 맞음 건의 실패 trace 받기 — 가린 요약 · 실린 짝만 · 남의 서비스 실행 거절 · zip 없음 사유 (도메인/작성 §7 「표준 기획서 통로」)

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import JSZip from 'jszip';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import prdAgentRoutes from './agentRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 에이전트 = 'xtf-agent';
const 비밀스키마 = JSON.stringify({ type: 'object', properties: { password: { type: 'string', secret: true } } });

// 단계 1 의 판정 하나가 틀렸다. 실제값에 그 실행의 비밀 칸 값이 들었다
async function 가짜zip(실제: string): Promise<Buffer> {
  const 묶음 = new JSZip();
  묶음.file(
    'test.trace',
    [
      { type: 'context-options', monotonicTime: 0 },
      { type: 'before', callId: 'test.attach@1', method: 'test.attach', class: 'Test', startTime: 10 },
      { type: 'after', callId: 'test.attach@1', attachments: [{ name: 'platform-step', file: 'attachments/s1' }] },
    ]
      .map((l) => JSON.stringify(l))
      .join('\n'),
  );
  묶음.file('attachments/s1', JSON.stringify({ seq: 1, title: '본다', status: 'FAIL', assertions: [{ statement: '이름', status: 'FAIL', expected: 'a', actual: 실제 }] }));
  return 묶음.generateAsync({ type: 'nodebuffer' });
}

describe.skipIf(연결 === undefined)('화면이 맞음 건의 실패 trace 통로', () => {
  let app: FastifyInstance;
  let 임시 = '';
  const 서비스: Record<'XTF' | 'XTFB', number> = { XTF: 0, XTFB: 0 };
  const 실행: Record<'XTF' | 'XTFB', number> = { XTF: 0, XTFB: 0 };
  const 원래 = { 에이전트: process.env.AUTHORING_AGENT_USER, 폴더: process.env.PLATFORM_ARTIFACTS_DIR };

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 항목 = async (runId: number, tcId: string, status: string, attempt = 1) =>
    Number(
      (
        await q<{ history_id: string }>(
          `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected,
                                 param_schema, expected_schema, status, duration_ms, finished_at, attempt)
                VALUES ($1, $2, 'desktop', $2, 'xtf.spec.ts', 5000, '[]', '{"password":"xtf-비번"}', '{}', $5, '{}', $3, 10, now(), $4)
             RETURNING history_id`,
          [runId, tcId, status, attempt, 비밀스키마],
        )
      ).rows[0]!.history_id,
    );

  const zip을둔다 = async (runId: number, historyId: number, 내용: Buffer | string) => {
    const { trace경로 } = await import('../execution/traceIngest.js');
    const 경로 = trace경로(runId, historyId);
    mkdirSync(dirname(경로), { recursive: true });
    writeFileSync(경로, 내용);
  };

  const 요청넣기 = async (screenRight: { runId: number; tcId: string }[]) =>
    Number(
      (
        await q<{ id: string }>(
          `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by)
           VALUES ($1, 'AUTHOR', $2, 'xtf', '검사', 'RUNNING', $3) RETURNING id`,
          [서비스.XTF, JSON.stringify({ prdApply: true, screenRight: screenRight.map((x) => ({ ...x, env: 'qa', reqIds: [] })) }), 에이전트],
        )
      ).rows[0]!.id,
    );

  const 받기 = (id: number, runId: number | string, tcId: string) =>
    app.inject({ method: 'GET', url: `/api/authoring/requests/${id}/trace?runId=${runId}&tcId=${tcId}` });

  const 치우기 = async () => {
    for (const 접두사 of ['XTF', 'XTFB'] as const) {
      await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스[접두사]]);
      await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스[접두사]]);
    }
  };

  beforeAll(async () => {
    임시 = mkdtempSync(join(tmpdir(), 'xtf-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    process.env.AUTHORING_AGENT_USER = 에이전트;
    for (const 접두사 of ['XTF', 'XTFB'] as const) {
      const s = await q<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ($1, $2, '#3A5FCD', '', 'xtf')
         ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
        [접두사, `${접두사} 실패 trace 통로 검사용`],
      );
      서비스[접두사] = Number(s.rows[0]!.id);
      await 치우기();
      await q('DELETE FROM test_run WHERE service_id = $1', [서비스[접두사]]);
      const r = await q<{ run_id: string }>(
        `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id)
              VALUES ($1, $2, '', 'xtf', 'qa', 'https://qa.example.com', 'FINISHED', $3) RETURNING run_id`,
        [`${접두사} 실행`, 접두사, 서비스[접두사]],
      );
      실행[접두사] = Number(r.rows[0]!.run_id);
    }
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 에이전트, displayName: '작성 에이전트', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(prdAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await 치우기();
  });

  afterAll(async () => {
    await app.close();
    await 치우기();
    for (const 접두사 of ['XTF', 'XTFB'] as const) {
      await q('DELETE FROM test_run WHERE service_id = $1', [서비스[접두사]]);
      await q('DELETE FROM service WHERE id = $1', [서비스[접두사]]);
    }
    process.env.AUTHORING_AGENT_USER = 원래.에이전트;
    if (원래.폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 원래.폴더;
    rmSync(임시, { recursive: true, force: true });
  });

  it('실린 짝이면 실패 항목의 trace 를 가린 요약 줄로 준다 — 통과 항목 · zip 없는 실패 항목은 건너뛰고 zip 은 주지 않는다', async () => {
    const 통과 = await 항목(실행.XTF, 'XTF-FN-001', 'PASS');
    await zip을둔다(실행.XTF, 통과, await 가짜zip('통과'));
    await 항목(실행.XTF, 'XTF-FN-001', 'FAIL', 2);
    const 실패 = await 항목(실행.XTF, 'XTF-FN-001', 'FAIL', 3);
    await zip을둔다(실행.XTF, 실패, await 가짜zip('보인 값 xtf-비번'));
    const id = await 요청넣기([{ runId: 실행.XTF, tcId: 'XTF-FN-001' }]);

    const r = await 받기(id, 실행.XTF, 'XTF-FN-001');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ summary: ['가름: 값 다름 — 「이름」 기대 "a" · 실제 "보인 값 ********"', '단계 1 「본다」'] });
  });

  it('zip 을 못 읽으면 사유를 싣는다', async () => {
    const 실패 = await 항목(실행.XTF, 'XTF-FN-004', 'FAIL');
    await zip을둔다(실행.XTF, 실패, 'zip 이 아니다');
    const id = await 요청넣기([{ runId: 실행.XTF, tcId: 'XTF-FN-004' }]);

    const r = await 받기(id, 실행.XTF, 'XTF-FN-004');
    expect([r.statusCode, r.json().error, r.json().detail]).toEqual([404, 'NO_TRACE', expect.stringContaining('trace 를 읽지 못했다')]);
  });

  it('요청에 실리지 않은 짝은 같은 서비스라도 404 다', async () => {
    const 실패 = await 항목(실행.XTF, 'XTF-FN-002', 'FAIL');
    await zip을둔다(실행.XTF, 실패, 'x');
    const id = await 요청넣기([{ runId: 실행.XTF, tcId: 'XTF-FN-001' }]);

    const r = await 받기(id, 실행.XTF, 'XTF-FN-002');
    expect([r.statusCode, r.json()]).toEqual([404, { error: 'NO_TRACE', detail: '이 요청의 화면이 맞음 건이 아니다' }]);
  });

  it('남의 서비스 실행은 요청에 실려 있어도 주지 않는다', async () => {
    const 실패 = await 항목(실행.XTFB, 'XTF-FN-001', 'FAIL');
    await zip을둔다(실행.XTFB, 실패, '남의 것');
    const id = await 요청넣기([{ runId: 실행.XTFB, tcId: 'XTF-FN-001' }]);

    const r = await 받기(id, 실행.XTFB, 'XTF-FN-001');
    expect([r.statusCode, r.json()]).toEqual([404, { error: 'NO_TRACE', detail: '그 실행에 이 케이스의 실패 항목이 없다' }]);
  });

  it('zip 이 없으면 적재 상태 줄의 사유를 싣는다', async () => {
    const 실패 = await 항목(실행.XTF, 'XTF-FN-003', 'FAIL');
    await q(`INSERT INTO run_trace (history_id, status, reason) VALUES ($1, 'NONE', '러너가 다른 기계')`, [실패]);
    const id = await 요청넣기([{ runId: 실행.XTF, tcId: 'XTF-FN-003' }]);

    const r = await 받기(id, 실행.XTF, 'XTF-FN-003');
    expect([r.statusCode, r.json()]).toEqual([404, { error: 'NO_TRACE', detail: '러너가 다른 기계' }]);
  });

  it('번호 · 케이스 꼴이 틀리면 400', async () => {
    const id = await 요청넣기([]);
    expect((await 받기(id, 'abc', 'XTF-FN-001')).statusCode).toBe(400);
    expect((await 받기(id, 실행.XTF, 'nope')).statusCode).toBe(400);
  });
});
