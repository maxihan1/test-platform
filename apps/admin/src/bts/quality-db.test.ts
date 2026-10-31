// 대시보드 「AI 품질」 두 숫자 · 수정 PR 상태 통로 (도메인/BTS 「품질 숫자」 · §7 「수정 PR 상태」 · BTS-F8-01). DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AI품질읽기 } from './quality.js';
import btsQualityRoutes from './qualityRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAQ';
const 맥 = 'xaq-agent';

describe.skipIf(연결 === undefined)('AI 품질', () => {
  let pool: Pool;
  let app: FastifyInstance;
  let 서비스 = 0;
  let 안이은 = 0;
  const 서비스만들기 = async (prefix: string, 프로젝트이름: string) => {
    const 프로젝트 = Number((await pool.query<{ id: string }>('INSERT INTO project (name) VALUES ($1) RETURNING id', [프로젝트이름])).rows[0]!.id);
    return Number((await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, 'XAQ 품질 검사용', '#123456', '', $2, $3) RETURNING id`,
      [prefix, prefix.toLowerCase(), 프로젝트],
    )).rows[0]!.id);
  };
  const 초안넣기 = async (줄수: number, 고른것: number[] | null, 어디 = 서비스) => {
    const result = { draft: { rows: Array.from({ length: 줄수 }, (_, i) => ({ op: 'ADD', text: `줄 ${String(i)}`, basis: '', issueKeys: ['DM-1'], sure: true })) }, ...(고른것 === null ? {} : { picked: { rows: 고른것, by: 'xaq', at: '2026-11-01T00:00:00Z', version: 1 } }) };
    await pool.query(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, env, result) VALUES ($1, 'PRD_DRAFT', '{}', 'xaq', 'xaq', 'DONE', 'qa', $2)`,
      [어디, JSON.stringify(result)],
    );
  };
  const 수정넣기 = async (pr: string | null, 어디 = 서비스) =>
    Number((await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, pr_url, result) VALUES ($1, 'BUGFIX', '{"issueKey":"DM-3"}', 'xaq', 'xaq', 'DONE', $2, $3) RETURNING id`,
      [어디, pr, JSON.stringify({ bugfix: pr === null ? { analysis: '분석', files: [], owner: null } : { prUrl: pr, summary: 's', files: ['a.ts'], owner: null } })],
    )).rows[0]!.id);
  const 상태적기 = (id: number, state: string) => app.inject({ method: 'POST', url: `/api/authoring/requests/${String(id)}/pr-state`, payload: { state } });
  const 볼것 = async () => (await app.inject({ method: 'GET', url: `/api/authoring/requests/bugfix-prs?service=${접두사}` })).json<{ prs: { id: number; prUrl: string }[] }>().prs;

  beforeAll(async () => {
    pool = (await import('../db/index.js')).pool;
    vi.stubEnv('AUTHORING_AGENT_USER', 맥);
    서비스 = await 서비스만들기(접두사, 'XAQ 프로젝트');
    안이은 = await 서비스만들기('XAQN', 'XAQN 프로젝트');
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by)
       SELECT project_id, 'https://bts.xaq.test/', 'DM', 'k', 's', '{}', '{}', 'xaq' FROM service WHERE id = $1`,
      [서비스],
    );
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = {
        username: 맥, displayName: '맥', role: 'operator', dashboard: 'read', mustChangePassword: false,
        services: [{ id: 서비스, prefix: 접두사, permissions: { cases: 'write', runs: 'write', authoring: 'write' } }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(btsQualityRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM authoring_request WHERE service_id = ANY($1::bigint[])', [[서비스, 안이은]]);
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await app?.close();
    await pool.query('DELETE FROM authoring_request WHERE service_id = ANY($1::bigint[])', [[서비스, 안이은]]);
    // 서비스를 지우면 남은 애플리케이션이 없는 프로젝트를 트리거가 지운다 — bts_link 도 같이 간다
    await pool.query('DELETE FROM service WHERE id = ANY($1::bigint[])', [[서비스, 안이은]]);
  });

  it('BTS 를 이은 프로젝트가 범위에 없으면 null · 있으면 셀 것이 없어도 0', async () => {
    await 초안넣기(3, [0]);
    expect(await AI품질읽기([안이은])).toBeNull();
    expect(await AI품질읽기([])).toBeNull();
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    // 안 이은 쪽의 줄은 이은 쪽 숫자에 섞이지 않는다
    await 초안넣기(3, [0], 안이은);
    expect(await AI품질읽기([서비스, 안이은])).toEqual({ draft: { picked: 0, written: 0 }, fix: { merged: 0, opened: 0 } });
  });

  it('초안은 카드에서 진행한 것만(버리기 포함) · 수정 PR 은 병합 · 닫힘으로 끝난 것만 분모에 든다', async () => {
    await 초안넣기(3, [0, 2]);
    await 초안넣기(2, []);
    await 초안넣기(4, null);
    const 병합 = await 수정넣기('https://github.com/demo/shop/pull/1');
    const 닫힘 = await 수정넣기('https://github.com/demo/shop/pull/2');
    await 수정넣기('https://github.com/demo/shop/pull/3');
    await 수정넣기(null);
    expect((await 상태적기(병합, 'MERGED')).statusCode).toBe(204);
    expect((await 상태적기(닫힘, 'CLOSED')).statusCode).toBe(204);
    expect(await AI품질읽기([서비스])).toEqual({ draft: { picked: 2, written: 5 }, fix: { merged: 1, opened: 2 } });
  });

  it('PR 상태 목록은 아직 안 끝난 수정 PR 만 · PR 하나에 행 하나를 준다', async () => {
    const 앞 = await 수정넣기('https://github.com/demo/shop/pull/4');
    const 뒤 = await 수정넣기('https://github.com/demo/shop/pull/4');
    const 끝남 = await 수정넣기('https://github.com/demo/shop/pull/5');
    await 수정넣기(null);
    await 상태적기(끝남, 'MERGED');
    expect(await 볼것()).toEqual([{ id: 뒤, prUrl: 'https://github.com/demo/shop/pull/4' }]);
    expect((await 상태적기(앞, 'CLOSED')).statusCode).toBe(204);
    expect(await 볼것()).toEqual([]);
    expect(await AI품질읽기([서비스])).toEqual({ draft: { picked: 0, written: 0 }, fix: { merged: 1, opened: 2 } });
  });

  it('PR 없는 행 · 틀린 상태 · 맥 계정이 아니면 적지 않는다', async () => {
    const 분석 = await 수정넣기(null);
    expect((await 상태적기(분석, 'MERGED')).statusCode).toBe(404);
    const pr = await 수정넣기('https://github.com/demo/shop/pull/6');
    expect((await 상태적기(pr, 'OPEN')).statusCode).toBe(400);
    vi.stubEnv('AUTHORING_AGENT_USER', 'xaq-someone');
    expect((await 상태적기(pr, 'MERGED')).statusCode).toBe(403);
    vi.stubEnv('AUTHORING_AGENT_USER', 맥);
    expect(await 볼것()).toEqual([{ id: pr, prUrl: 'https://github.com/demo/shop/pull/6' }]);
  });
});
