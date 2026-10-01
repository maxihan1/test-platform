// 케이스 고치기 통로 검사 — 요청 세우기 · 겹침 · 등급 (SPEC 도메인/작성 §3.6 「★ 케이스 고치기」 · §7)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 권한이되나 } from '../auth/gate.js';
import { 등급표, 토큰통로, 필요권한 } from '../auth/routeTable.js';
import { 라우트표 } from '../auth/scope.js';
import authoringAgentRoutes from './agentRoutes.js';
import authoringEditRoutes from './edit-routes.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XEB';
const 틀 = '/api/authoring/edits';
const 비밀번호 = 'pw-xeb-7731';
const 사람 = 'xeb-writer';
const 맥 = 'xeb-맥';
const 케이스번호들 = ['XEB-001', 'XEB-002', 'XEB-003', 'XEBO-001'];
const 기대칸 = { type: 'object', properties: { title: { type: 'string' }, total: { type: 'number' } } };

describe('등급과 경계', () => {
  it('POST edits 는 (작성, write) · ?service= 로 서비스를 고른다 · 토큰 통로에 없다', () => {
    expect(등급표[`POST ${틀}`]).toEqual({ 기능: 'authoring', 칸: 'write' });
    expect(라우트표[틀]).toEqual({ 종류: '질의' });
    expect(토큰통로.has(`POST ${틀}`)).toBe(false);
  });

  it('작성 read 만 있으면 문이 막고(403) write 면 지난다', () => {
    const 사람칸 = (칸: 'read' | 'write') => ({
      role: 'member' as const,
      services: [{ prefix: 접두사, permissions: { cases: 'write' as const, runs: 'write' as const, authoring: 칸 } }],
    });
    expect(권한이되나(사람칸('read'), 필요권한(틀, 'POST'), [접두사])).toBe(false);
    expect(권한이되나(사람칸('write'), 필요권한(틀, 'POST'), [접두사])).toBe(true);
  });
});

describe.skipIf(연결 === undefined)('케이스 고치기 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 부르는이 = 사람;
  let 역할: 'member' | 'admin' = 'member';

  const pool = async () => (await import('../db/index.js')).pool;
  const 고치기 = (본문: unknown, 서비스접두사 = 접두사) =>
    app.inject({ method: 'POST', url: `/api/authoring/edits?service=${서비스접두사}`, payload: 본문 as object });
  const 읽기 = async (id: number) =>
    (await (await pool()).query('SELECT * FROM authoring_request WHERE id = $1', [id])).rows[0];
  const 행넣기 = async (칸: Record<string, unknown>): Promise<number> => {
    const 이름들 = Object.keys(칸);
    const q = await (await pool()).query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, requested_by, requested_by_name, ${이름들.join(', ')})
       VALUES ($1, $2, '고치기 검사', ${이름들.map((_, i) => `$${String(i + 3)}`).join(', ')}) RETURNING id`,
      [서비스, 사람, ...이름들.map((k) => 칸[k])],
    );
    return Number(q.rows[0]!.id);
  };
  const 세운번호 = async (본문: unknown): Promise<number> => {
    const res = await 고치기(본문);
    expect(res.statusCode, res.body).toBe(201);
    return (res.json() as { id: number }).id;
  };

  beforeAll(async () => {
    const p = await pool();
    const r = await p.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XEB 케이스 고치기 검사용', '#3A5FCD', 'https://github.com/acme/xeb', 'xeb')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await p.query(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password)
       VALUES ($1, 'qa', 'https://qa.xeb.test', 'tester', $2), ($1, 'prod', 'https://xeb.test', NULL, NULL),
              ($1, 'dev', 'https://dev.xeb.test', 'tester', '')`,
      [서비스, 비밀번호],
    );
    for (const [tcId, 미확정] of [
      ['XEB-001', null],
      ['XEB-002', '화면에서 읽은 값'],
      ['XEB-003', null],
      ['XEBO-001', null],
    ] as const) {
      await p.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, unconfirmed)
         VALUES ($1, 'XEB 고치기', '["desktop"]', '[]', 'xeb/a.spec.ts', '{"type":"object","properties":{}}', $2, $3)
         ON CONFLICT (tc_id) DO UPDATE SET expected_schema = EXCLUDED.expected_schema, unconfirmed = EXCLUDED.unconfirmed,
                                           is_active = true`,
        [tcId, JSON.stringify(기대칸), 미확정],
      );
    }
    process.env.AUTHORING_AGENT_USER = 맥;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: '고치기 검사', role: 역할, dashboard: 'read', mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.register(authoringEditRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    부르는이 = 사람;
    역할 = 'member';
    await (await pool()).query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const p = await pool();
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM case_input WHERE tc_id = ANY($1::text[])', [케이스번호들]);
    await p.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스번호들]);
    await p.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  describe('세우기', () => {
    it('201 — EDIT · PENDING · 원본 없음 · params.edits · 요청한 사람', async () => {
      const edits = [
        { tcId: 'XEB-001', expected: { title: '주문 완료' } },
        { tcId: 'XEB-002', confirm: true },
        { tcId: 'XEB-003', delete: true },
      ];
      const id = await 세운번호({ edits });
      const 행 = await 읽기(id);
      expect([행.kind, 행.status, 행.source_id, 행.compare]).toEqual(['EDIT', 'PENDING', null, false]);
      expect(행.params).toEqual({ edits });
      expect([행.requested_by, 행.requested_by_name]).toEqual([사람, '고치기 검사']);
    });

    it('남의 서비스 접두사 케이스는 400 BAD_EDIT · 그 tcId', async () => {
      const res = await 고치기({ edits: [{ tcId: 'XEBO-001', delete: true }] });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'BAD_EDIT', detail: 'XEBO-001' });
    });

    it('본문 모양이 틀리면 400 BAD_EDIT · 빈 detail', async () => {
      const res = await 고치기({ edits: [] });
      expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_EDIT', detail: '' }]);
    });

    it('기대값이 그 서비스 테스트 계정 비밀번호와 같으면 400 · <tcId>.<칸>', async () => {
      const res = await 고치기({ edits: [{ tcId: 'XEB-001', expected: { title: 비밀번호 } }] });
      expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_EDIT', detail: 'XEB-001.title' }]);
    });

    it('빈 비밀번호 줄은 빈 글자를 막는 근거가 아니다', async () => {
      await 세운번호({ edits: [{ tcId: 'XEB-001', expected: { title: '' } }] });
    });

    it('?service= 가 없으면 400 SERVICE_REQUIRED', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/authoring/edits', payload: { edits: [] } });
      expect([res.statusCode, res.json()]).toEqual([400, { error: 'SERVICE_REQUIRED' }]);
    });
  });

  describe('겹침 — 409 EDIT_OPEN', () => {
    it('열린 고치기와 tcId 가 겹치면 409 · 요청 번호 목록', async () => {
      const 앞 = await 세운번호({ edits: [{ tcId: 'XEB-001', delete: true }] });
      const 둘째 = await 세운번호({ edits: [{ tcId: 'XEB-003', delete: true }] });
      const res = await 고치기({ edits: [{ tcId: 'XEB-003', expected: { total: 3 } }, { tcId: 'XEB-001', delete: true }] });
      expect([res.statusCode, res.json()]).toEqual([409, { error: 'EDIT_OPEN', detail: [앞, 둘째] }]);
    });

    it('안 겹치면 같은 서비스에 고치기가 여럿 선다', async () => {
      await 세운번호({ edits: [{ tcId: 'XEB-001', delete: true }] });
      await 세운번호({ edits: [{ tcId: 'XEB-003', delete: true }] });
    });

    it('겹치던 고치기를 폐기하면 다시 선다', async () => {
      const 앞 = await 세운번호({ edits: [{ tcId: 'XEB-001', delete: true }] });
      await (await pool()).query('UPDATE authoring_request SET discarded_at = now() WHERE id = $1', [앞]);
      await 세운번호({ edits: [{ tcId: 'XEB-001', delete: true }] });
    });

    it('병합된 반영이 최신이면 닫힌 것 — 다시 선다', async () => {
      const 앞 = await 세운번호({ edits: [{ tcId: 'XEB-001', delete: true }] });
      await (await pool()).query(`UPDATE authoring_request SET status = 'DONE' WHERE id = $1`, [앞]);
      await 행넣기({ kind: 'MERGE', source_id: 앞, status: 'DONE' });
      await 세운번호({ edits: [{ tcId: 'XEB-001', delete: true }] });
    });

    it('실패한 반영은 최신에서 빠진다 — 아직 열린 것', async () => {
      const 앞 = await 세운번호({ edits: [{ tcId: 'XEB-001', delete: true }] });
      await (await pool()).query(`UPDATE authoring_request SET status = 'DONE' WHERE id = $1`, [앞]);
      await 행넣기({ kind: 'MERGE', source_id: 앞, status: 'FAILED' });
      const res = await 고치기({ edits: [{ tcId: 'XEB-001', delete: true }] });
      expect([res.statusCode, res.json()]).toEqual([409, { error: 'EDIT_OPEN', detail: [앞] }]);
    });

    it('동시에 둘이 같은 tcId 를 요청하면 하나만 선다', async () => {
      const 본문 = { edits: [{ tcId: 'XEB-001', delete: true }] };
      const 결과 = await Promise.all([고치기(본문), 고치기(본문), 고치기(본문)]);
      expect(결과.map((r) => r.statusCode).sort()).toEqual([201, 409, 409]);
    });
  });
});
