// 결정 필요 「PRD 초안」 카드 — 목록에 서는 초안 · 고른 줄로 새 버전과 다시 작성 · 버리기 · 다시 만들기 · 같은 카드 두 번 진행 막기 (도메인/BTS 「PRD 초안 → 결정 필요」 · BTS-F5-04). DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import decisionRoutes from '../authoring/decisionRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPU';

type 항목 = { key: string; kind: string; picks: string[]; state?: string; rows?: { op: string; oldText: string | null; gone: boolean }[]; issues?: { key: string; title: string | null; url: string | null }[] };

describe.skipIf(연결 === undefined)('결정 필요 「PRD 초안」 카드', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);

  const 목록 = async () => (await app.inject({ method: 'GET', url: `/api/authoring/decisions?service=${접두사}` })).json() as { prdVersion: number; items: 항목[] };
  const 진행 = (prdVersion: number, picks: object[]) => app.inject({ method: 'POST', url: `/api/authoring/decisions/run?service=${접두사}`, payload: { prdVersion, picks } });
  const 줄 = (op: string, 덧: object = {}) => ({ op, text: `${op} 문장`, basis: 'DM-12 본문', issueKeys: ['DM-12'], sure: true, ...덧 });
  const 초안넣기 = async (status: string, rows: object[] = [], 덧: object = {}): Promise<number> =>
    Number((await q(
      `INSERT INTO authoring_request (service_id, kind, params, env, requested_by, requested_by_name, status, result, error)
       VALUES ($1, 'PRD_DRAFT', $2, 'qa', 'xpu', 'BTS · 검사', $3, $4, $5) RETURNING id`,
      [서비스, JSON.stringify({ issueKeys: ['DM-12'], buildNo: 'a1b2c3d', titles: { 'DM-12': '쿠폰 한 장만' } }), status,
        status === 'DONE' ? JSON.stringify({ draft: { rows }, prdVersion: 1, ...덧 }) : null, status === 'FAILED' ? '작성 시간을 넘었다' : null],
    )).rows[0].id);
  const 행 = async (id: number) => (await q('SELECT status, params, result, discarded_at FROM authoring_request WHERE id = $1', [id])).rows[0] as { status: string; params: object; result: Record<string, unknown> | null; discarded_at: Date | null };

  async function 치우기() {
    await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  }

  beforeAll(async () => {
    서비스 = Number((await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ($1, 'XPU 초안 카드 검사용', '#123456', '', 'xpu')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    )).rows[0].id);
    await q(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by)
       SELECT project_id, 'https://bts.xpu.test/', 'DM', 'k', 's', '{}', '{}', 'xpu' FROM service WHERE id = $1 ON CONFLICT DO NOTHING`,
      [서비스],
    );
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = {
        username: 'xpu', displayName: '검사', role: 'admin', dashboard: 'read', mustChangePassword: false,
        services: [{ id: 서비스, prefix: 접두사, permissions: { cases: 'write', runs: 'write', authoring: 'write' } }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(decisionRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await 치우기();
    await q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 1, $2, 2, 'PERSON', 'xpu', 'xpu')`,
      [서비스, JSON.stringify([
        { reqId: 'XPU-REQ-001', feature: '주문 내역', text: '최근 1개월 것을 보여 준다', basis: [{ from: '기획서', quote: '1개월' }], status: 'CONFIRMED' },
        { reqId: 'XPU-REQ-002', feature: '주문 내역', text: '「1개월」 기간 버튼이 있다', basis: [{ from: '기획서', quote: '버튼' }], status: 'CONFIRMED' },
      ])],
    );
  });

  afterAll(async () => {
    await app?.close();
    await 치우기();
    // 서비스를 지우면 남은 애플리케이션이 없는 프로젝트를 트리거가 지운다 — bts_link 도 같이 간다
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('끝난 초안 · 실패한 초안이 ② 묶음 카드로 서고, 도는 · 이미 고른 초안은 안 선다', async () => {
    const 끝 = await 초안넣기('DONE', [줄('EDIT', { reqId: 'XPU-REQ-001' }), 줄('DEL', { reqId: 'XPU-REQ-009' }), 줄('ADD', { sure: false })]);
    const 실패 = await 초안넣기('FAILED');
    await 초안넣기('RUNNING');
    await 초안넣기('DONE', [], { picked: { rows: [] } });
    const items = (await 목록()).items.filter((x) => x.kind === 'PRD_DRAFT');
    expect(items.map((x) => [x.key, x.state, x.picks])).toEqual([[`draft:${String(끝)}`, 'DONE', ['TAKE', 'DROP']], [`draft:${String(실패)}`, 'FAILED', ['RETRY', 'DROP']]]);
    expect(items[0]!.rows!.map((r) => [r.op, r.oldText, r.gone])).toEqual([['EDIT', '최근 1개월 것을 보여 준다', false], ['DEL', null, true], ['ADD', null, false]]);
    expect(items[0]!.issues).toEqual([{ key: 'DM-12', title: '쿠폰 한 장만', url: 'https://bts.xpu.test/issues/DM-12' }]);
  });

  it('고른 줄로 새 버전 · 다시 작성을 세우고 초안에 고른 줄을 남긴다 — 같은 카드를 또 진행하면 낡음', async () => {
    const id = await 초안넣기('DONE', [줄('EDIT', { reqId: 'XPU-REQ-001', text: '최근 3개월 것을 보여 준다' }), 줄('ADD', { text: '쿠폰은 하나만 쓴다' }), 줄('ADD', { sure: false, text: '알림이 뜬다' }), 줄('DEL', { reqId: 'XPU-REQ-002' })]);
    const res = await 진행(1, [{ key: `draft:${String(id)}`, pick: 'TAKE', rows: [0, 1] }]);
    expect(res.statusCode).toBe(201);
    const steps = res.json<{ steps: { step: number; key: string; requestId: number | null; version: number | null }[] }>().steps;
    expect(steps.map((s) => [s.step, s.version])).toEqual([[2, 2], [4, null]]);
    const 판 = (await q('SELECT items, last_no, source, changes FROM prd_version WHERE service_id = $1 AND version = 2', [서비스])).rows[0] as {
      items: { reqId: string; text: string; status: string; fromIssues?: string[] }[]; last_no: number; source: string; changes: { kind: string; reqId: string; issueKeys?: string[] }[];
    };
    expect(판.source).toBe('DECISION');
    expect(판.last_no).toBe(4);
    expect(판.items.map((x) => [x.reqId, x.text, x.status, x.fromIssues ?? null])).toEqual([
      ['XPU-REQ-001', '최근 3개월 것을 보여 준다', 'CONFIRMED', ['DM-12']],
      ['XPU-REQ-002', '「1개월」 기간 버튼이 있다', 'CONFIRMED', null],
      ['XPU-REQ-003', '쿠폰은 하나만 쓴다', 'CONFIRMED', ['DM-12']],
      ['XPU-REQ-004', '알림이 뜬다', 'NEEDS_CHECK', ['DM-12']],
    ]);
    expect(판.changes.map((c) => [c.kind, c.reqId, c.issueKeys])).toEqual([['EDIT', 'XPU-REQ-001', ['DM-12']], ['ADD', 'XPU-REQ-003', ['DM-12']], ['ADD', 'XPU-REQ-004', ['DM-12']]]);
    const 다시 = await 행(steps[1]!.requestId!);
    expect(다시.params).toMatchObject({ prdApply: true });
    expect((await 행(id)).result?.picked).toMatchObject({ rows: [0, 1], by: 'xpu', version: 2 });
    expect((await 목록()).items.some((x) => x.kind === 'PRD_DRAFT')).toBe(false);
    const 또 = await 진행(2, [{ key: `draft:${String(id)}`, pick: 'TAKE', rows: [0] }]);
    expect(또.json()).toEqual({ error: 'DECISIONS_STALE' });
  });

  it('지금 판에 없는 요구를 고친 줄 · 빈 고름 · 범위 밖 번호는 BAD_PICK', async () => {
    const id = await 초안넣기('DONE', [줄('EDIT', { reqId: 'XPU-REQ-009' }), 줄('ADD')]);
    const key = `draft:${String(id)}`;
    for (const rows of [[0], [], [5], [1, 1]]) {
      expect((await 진행(1, [{ key, pick: 'TAKE', rows }])).json()).toEqual({ error: 'BAD_PICK', detail: key });
    }
  });

  it('끝난 초안 버리기는 고른 줄 없이 남기고 버전을 안 만든다 · 실패한 초안 다시 만들기는 같은 칸으로 새로 세운다', async () => {
    const 끝 = await 초안넣기('DONE', [줄('ADD')]);
    const 실패 = await 초안넣기('FAILED');
    const res = await 진행(1, [{ key: `draft:${String(끝)}`, pick: 'DROP' }, { key: `draft:${String(실패)}`, pick: 'RETRY' }]);
    expect(res.statusCode).toBe(201);
    const steps = res.json<{ steps: { step: number; requestId: number | null }[] }>().steps;
    expect(steps.map((s) => s.step)).toEqual([6, 6]);
    expect((await 행(끝)).result?.picked).toMatchObject({ rows: [], version: null });
    expect((await q('SELECT count(*)::int AS n FROM prd_version WHERE service_id = $1', [서비스])).rows[0].n).toBe(1);
    expect((await 행(실패)).discarded_at).not.toBeNull();
    const 새 = await 행(steps[1]!.requestId!);
    expect(새.status).toBe('PENDING');
    expect(새.params).toMatchObject({ issueKeys: ['DM-12'], titles: { 'DM-12': '쿠폰 한 장만' } });
  });

  it('실패한 초안 버리기는 폐기로 찍는다', async () => {
    const 실패 = await 초안넣기('FAILED');
    expect((await 진행(1, [{ key: `draft:${String(실패)}`, pick: 'DROP' }])).statusCode).toBe(201);
    expect((await 행(실패)).discarded_at).not.toBeNull();
    expect((await 목록()).items.some((x) => x.kind === 'PRD_DRAFT')).toBe(false);
  });
});
