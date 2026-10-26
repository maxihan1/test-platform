// 「화면이 맞음」 채우기의 거절 · 판 차례 번호, 앞 반영을 기다리는 집기, 작성 요청 통로의 BAD_PRD_APPLY · 물려받기를 본다 (도메인/작성 §3.6 「화면이 맞음」)
// 요청을 세우는 것은 결정 진행이다 — 그 통로 검사는 authoring/decisions.test.ts

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringRoutes from '../authoring/routes.js';
import prdRoutes from './routes.js';
import { 화면이맞음채우기 } from './screenRight.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPF';
const 남의접두사 = 'XPFB';
const 항목 = (text: string) => ({ feature: '회원가입', text, basis: [{ from: '기획서.docx', quote: text }], status: 'CONFIRMED' });

describe.skipIf(연결 === undefined)('화면이 맞음 채우기', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 남의서비스 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 부르기 = (method: 'PUT' | 'POST', 주소: string, payload?: object) =>
    app.inject({ method, url: `/api${주소}?service=${접두사}`, ...(payload ? { payload } : {}) });

  const 실행넣기 = async (status: string, 항목상태: string, 어느서비스 = 서비스, tcId = 'XPF-FN-001') => {
    const run = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url)
       VALUES ('XPF 실행', 'xpf', $1, 'qa', $2, 'XPF', '', 'https://qa.xpf.test') RETURNING run_id`,
      [status, 어느서비스],
    );
    const runId = Number(run.rows[0]!.run_id);
    await q(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at,
                             file_path, param_schema, expected_schema, timeout_ms)
       VALUES ($1, $2, 'desktop', '검사', '{}', '{}', $3, 100, now(), 'tests/xpf/a.spec.ts', '{}', '{}', 300000)`,
      [runId, tcId, 항목상태],
    );
    return runId;
  };

  const 치우기 = async () => {
    for (const s of [서비스, 남의서비스]) {
      await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [s]);
      await q('DELETE FROM prd_version WHERE service_id = $1', [s]);
      await q('DELETE FROM authoring_request WHERE service_id = $1', [s]);
      await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [s]);
      await q('DELETE FROM test_run WHERE service_id = $1', [s]);
      await q('DELETE FROM req_case WHERE service_id = $1', [s]);
    }
  };

  beforeAll(async () => {
    const 넣기 = async (prefix: string) =>
      Number(
        (
          await q<{ id: string }>(
            `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
                  VALUES ($1, $2, '#3A5FCD', '', $3)
             ON CONFLICT (prefix) DO UPDATE SET is_active = true
               RETURNING id`,
            [prefix, `${prefix} 화면이 맞음 검사용`, prefix.toLowerCase()],
          )
        ).rows[0]!.id,
      );
    서비스 = await 넣기(접두사);
    남의서비스 = await 넣기(남의접두사);
    app = Fastify();
    app.addHook('onRequest', async (req) => {
      req.user = {
        username: 'xpf',
        displayName: '검사',
        services: [{ prefix: 접두사, permissions: { cases: 'read', runs: 'read', authoring: 'write' } }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(prdRoutes, { prefix: '/api' });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await 치우기();
    // 판 1 = 기준 판(병합된 반영이 읽은 판)
    await 부르기('PUT', '/prd', { baseVersion: 0, items: [항목('비밀번호는 8자 이상'), 항목('약관에 동의한다'), 항목('가입하면 메일이 간다')] });
    const 앞작성 = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, prd_version)
       VALUES ($1, 'AUTHOR', '{"prdApply": true}', 'xpf', '검사', 'DONE', 1) RETURNING id`,
      [서비스],
    );
    await q(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, finished_at)
       VALUES ($1, 'MERGE', $2, '{}', 'xpf', '검사', 'DONE', now())`,
      [서비스, Number(앞작성.rows[0]!.id)],
    );
    await q(
      `INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES
         ($1, 'XPF-REQ-002', 'XPF-FN-001', '정상'), ($1, 'XPF-REQ-001', 'XPF-FN-001', '경계'), ($1, 'XPF-REQ-001', 'XPF-FN-001', '정상'),
         ($1, 'XPF-REQ-009', 'XPF-FN-002', '정상')`,
      [서비스],
    );
  });

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = ANY($1)', [[서비스, 남의서비스]]);
  });

  it('없는 실행 · 남의 서비스 실행은 RUN_NOT_FOUND, 도는 중이면 RUN_NOT_FINISHED, 그 케이스의 실패가 없으면 NOT_FAILED, 덮는 번호가 판에 없으면 NO_PRD_REQ', async () => {
    const 기대 = async (runId: number, error: string, tcId = 'XPF-FN-001') => expect(await 화면이맞음채우기(서비스, runId, tcId)).toEqual({ error });
    await 기대(999_999_999, 'RUN_NOT_FOUND');
    await 기대(await 실행넣기('FINISHED', 'FAIL', 남의서비스), 'RUN_NOT_FOUND');
    await 기대(await 실행넣기('RUNNING', 'FAIL'), 'RUN_NOT_FINISHED');
    await 기대(await 실행넣기('FINISHED', 'PASS'), 'NOT_FAILED');
    await 기대(await 실행넣기('FINISHED', 'FAIL', 서비스, 'XPF-FN-002'), 'NO_PRD_REQ', 'XPF-FN-002');
  });

  it('중단한 실행도 끝난 실행이고, 그 실행의 대상 서버와 덮는 번호를 판 차례로 한 번씩 싣는다', async () => {
    const runId = await 실행넣기('ABORTED', 'FAIL');
    expect(await 화면이맞음채우기(서비스, runId, 'XPF-FN-001')).toEqual({ runId, tcId: 'XPF-FN-001', env: 'qa', reqIds: ['XPF-REQ-001', 'XPF-REQ-002'] });
  });

  it('앞에 선 반영이 병합 · 폐기될 때까지 뒤 반영은 에이전트가 안 집는다 — 다른 작성 요청은 집는다', async () => {
    const { 집기 } = await import('../authoring/agentStore.js');
    const 넣기 = async (params: object, status: string) =>
      Number(
        (
          await q<{ id: string }>(
            `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status) VALUES ($1, 'AUTHOR', $2, 'xpf', '검사', $3) RETURNING id`,
            [서비스, JSON.stringify(params), status],
          )
        ).rows[0]!.id,
      );
    const 첫 = await 넣기({ prdApply: true }, 'FAILED');
    const 둘째 = await 넣기({ prdApply: true }, 'PENDING');
    const 보통 = await 넣기({}, 'PENDING');
    expect((await 집기(서비스, 'xpf-agent'))?.id).toBe(보통);
    expect(await 집기(서비스, 'xpf-agent')).toBeNull();
    await q(`UPDATE authoring_request SET discarded_at = now() WHERE id = $1`, [첫]);
    expect((await 집기(서비스, 'xpf-agent'))?.id).toBe(둘째);
  });

  it('작성 요청 통로로 screenRight 를 실으면 400, 재실행은 원본의 screenRight 를 물려받는다', async () => {
    const 칸 = { runId: 1, tcId: 'XPF-FN-001', env: 'qa', reqIds: ['XPF-REQ-001'] };
    const 실음 = await 부르기('POST', '/authoring/requests', { kind: 'AUTHOR', params: { screenRight: 칸 } });
    expect([실음.statusCode, 실음.json()]).toEqual([400, { error: 'BAD_PRD_APPLY' }]);

    const 원본 = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
       VALUES ($1, 'AUTHOR', $2, 'xpf', '검사', 'DONE') RETURNING id`,
      [서비스, JSON.stringify({ prdApply: true, screenRight: 칸 })],
    );
    const r = await 부르기('POST', '/authoring/requests', { kind: 'RERUN', sourceId: Number(원본.rows[0]!.id) });
    expect(r.statusCode).toBe(201);
    const 행 = await q<{ params: object }>('SELECT params FROM authoring_request WHERE id = $1', [(r.json() as { id: number }).id]);
    expect(행.rows[0]?.params).toEqual({ prdApply: true, screenRight: 칸 });
  });
});
