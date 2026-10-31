// 롤백 되돌리기 — ROLLBACK 판 · 되돌림 요청 · 초안 버리기 · 다시 배포로 거두기 · 닫을 PR 통로 (도메인/BTS 「롤백 바퀴」 · BTS-F7-01). DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 되돌림거두기, 롤백되돌리기 } from './rollback.js';
import btsRollbackRoutes from './rollbackRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XRB';
const 맥 = 'xrb-agent';
const 사람 = { username: 'xrb-admin', displayName: 'BTS · 검사' };

describe.skipIf(연결 === undefined)('롤백 되돌리기', () => {
  let pool: Pool;
  let app: FastifyInstance;
  let 프로젝트 = 0;
  let 서비스 = 0;
  const 배포넣기 = async (build: string, rollback = false) =>
    Number((await pool.query<{ id: string }>(
      'INSERT INTO bts_deploy (project_id, build_no, rollback, service_ids) VALUES ($1, $2, $3, $4) RETURNING id',
      [프로젝트, build, rollback, [서비스]],
    )).rows[0]!.id);
  const 요청넣기 = async (kind: string, status: string, params: object, 덧: { source?: number; pr?: string } = {}) =>
    Number((await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, pr_url, env)
       VALUES ($1, $2, $3, $4, 'xrb-admin', '검사', $5, $6, CASE WHEN $2 = 'PRD_DRAFT' THEN 'qa' END) RETURNING id`,
      [서비스, kind, 덧.source ?? null, JSON.stringify(params), status, 덧.pr ?? null],
    )).rows[0]!.id);
  const 행 = async (id: number) =>
    (await pool.query<{ status: string; discarded_at: Date | null; stop_requested_at: Date | null; params: Record<string, unknown> }>(
      'SELECT status, discarded_at, stop_requested_at, params FROM authoring_request WHERE id = $1', [id],
    )).rows[0]!;
  const 닫을목록 = async () => (await app.inject({ method: 'GET', url: `/api/authoring/requests/closing?service=${접두사}` })).json<{ prs: { id: number; prUrl: string }[] }>().prs;

  async function 치운다(): Promise<void> {
    await pool.query('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM bts_deploy WHERE project_id = $1', [프로젝트]);
  }

  beforeAll(async () => {
    pool = (await import('../db/index.js')).pool;
    vi.stubEnv('AUTHORING_AGENT_USER', 맥);
    프로젝트 = Number((await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XRB 프로젝트') RETURNING id")).rows[0]!.id);
    서비스 = Number((await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, 'XRB 롤백 검사용', '#123456', '', 'xrb', $2) RETURNING id`,
      [접두사, 프로젝트],
    )).rows[0]!.id);
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = {
        username: 맥, displayName: '맥', role: 'operator', dashboard: 'read', mustChangePassword: false,
        services: [{ id: 서비스, prefix: 접두사, permissions: { cases: 'write', runs: 'write', authoring: 'write' } }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(btsRollbackRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await 치운다();
    await pool.query(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 1, $2, 2, 'PERSON', 'xrb', 'xrb'), ($1, 2, $3, 3, 'DECISION', 'xrb', 'xrb')`,
      [서비스,
        JSON.stringify([{ reqId: 'XRB-REQ-001', feature: '쿠폰', text: '두 장까지', basis: [{ from: '기획서', quote: '두 장' }], status: 'CONFIRMED' }]),
        JSON.stringify([
          { reqId: 'XRB-REQ-001', feature: '쿠폰', text: '한 장만', basis: [{ from: 'DM-12', quote: '한 장' }], status: 'CONFIRMED', byPerson: true, fromIssues: ['DM-12'] },
          { reqId: 'XRB-REQ-003', feature: '쿠폰', text: '바꾸면 알림', basis: [{ from: 'DM-12', quote: '알림' }], status: 'CONFIRMED', byPerson: true, fromIssues: ['DM-12'] },
        ])],
    );
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await app?.close();
    await 치운다();
    // 서비스를 지우면 남은 애플리케이션이 없는 프로젝트를 트리거가 지운다
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('롤백 배포는 ROLLBACK 판과 열린 작성을 기다리는 되돌림 요청을 세우고 · 그 키의 고르기 전 초안만 버린다', async () => {
    const 열린 = await 요청넣기('AUTHOR', 'RUNNING', {});
    const 도는초안 = await 요청넣기('PRD_DRAFT', 'RUNNING', { issueKeys: ['DM-12'] });
    const 대기초안 = await 요청넣기('PRD_DRAFT', 'PENDING', { issueKeys: ['DM-12', 'DM-14'] });
    const 다른키 = await 요청넣기('PRD_DRAFT', 'PENDING', { issueKeys: ['DM-14'] });
    const 배포 = await 배포넣기('old-1', true);

    const 요청들 = await 롤백되돌리기(배포, 프로젝트, 'old-1', ['DM-12'], 사람);

    const 판 = (await pool.query<{ version: number; source: string; deploy_id: string; items: { reqId: string; text: string }[]; saved_by_name: string }>(
      'SELECT version, source, deploy_id, items, saved_by_name FROM prd_version WHERE service_id = $1 ORDER BY version DESC LIMIT 1', [서비스],
    )).rows[0]!;
    expect([판.version, 판.source, Number(판.deploy_id), 판.saved_by_name]).toEqual([3, 'ROLLBACK', 배포, 'BTS · 검사']);
    expect(판.items.map((x) => [x.reqId, x.text])).toEqual([['XRB-REQ-001', '두 장까지']]);
    expect(요청들).toHaveLength(1);
    expect((await 행(요청들[0]!)).params).toEqual({ prdApply: true, rollbackDeploy: 배포, rollbackBuild: 'old-1', decision: { after: [열린], count: 1 } });
    expect((await 행(도는초안)).stop_requested_at).not.toBeNull();
    expect((await 행(대기초안)).status).toBe('STOPPED');
    expect((await 행(대기초안)).discarded_at).not.toBeNull();
    expect((await 행(다른키)).discarded_at).toBeNull();
    // 같은 롤백이 다시 와도 되돌릴 것이 없다
    expect(await 롤백되돌리기(배포, 프로젝트, 'old-1', ['DM-12'], 사람)).toEqual([]);
  });

  it('다시 배포되면 병합 전 되돌림 요청을 거두고 · 열린 PR 은 닫을 목록에 오른다 — 같은 빌드 · 병합된 것은 그대로', async () => {
    const 롤백 = await 배포넣기('old-1', true);
    const 롤백표시 = { prdApply: true, rollbackDeploy: 롤백, rollbackBuild: 'old-1' };
    const 대기 = await 요청넣기('AUTHOR', 'PENDING', 롤백표시);
    const 끝남 = await 요청넣기('AUTHOR', 'DONE', 롤백표시, { pr: 'https://github.com/o/r/pull/7' });
    const 재실행 = await 요청넣기('RERUN', 'DONE', {}, { source: 끝남, pr: 'https://github.com/o/r/pull/7' });
    const 병합됨 = await 요청넣기('AUTHOR', 'DONE', 롤백표시, { pr: 'https://github.com/o/r/pull/8' });
    await 요청넣기('MERGE', 'DONE', {}, { source: 병합됨, pr: 'https://github.com/o/r/pull/8' });

    expect(await 되돌림거두기(프로젝트, await 배포넣기('old-1-again'), 'old-1')).toEqual([]);
    expect(await 닫을목록()).toEqual([]);

    const 거둠 = await 되돌림거두기(프로젝트, await 배포넣기('new-2'), 'new-2');
    expect(거둠.sort()).toEqual([대기, 끝남, 재실행].sort());
    expect((await 행(대기)).status).toBe('STOPPED');
    expect((await 행(병합됨)).discarded_at).toBeNull();
    expect(await 닫을목록()).toEqual([{ id: 재실행, prUrl: 'https://github.com/o/r/pull/7' }]);

    expect((await app.inject({ method: 'POST', url: `/api/authoring/requests/${String(재실행)}/closed` })).statusCode).toBe(204);
    expect(await 닫을목록()).toEqual([]);
    expect((await app.inject({ method: 'POST', url: `/api/authoring/requests/${String(병합됨)}/closed` })).statusCode).toBe(404);
  });
});
