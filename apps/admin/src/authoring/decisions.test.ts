// 결정 목록 · 결정 진행 통로 — 항목과 고르기 · 진행 차례 · 뒤 요청이 앞 작성을 기다리는 집기 (도메인/작성 §3.6 「★ 결정 목록」 · §7 「결정 목록 통로」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { 서비스권한 } from '../auth/permissions.js';
import prdRoutes from '../prd/routes.js';
import { 집기 } from './agentStore.js';
import decisionRoutes from './decisionRoutes.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWX';
const 케이스 = 'XWX-FN-001';
const 쓰기: 서비스권한 = { cases: 'write', runs: 'write', authoring: 'write' };
const 근거 = (from: string, quote: string) => ({ from, quote });

type 항목 = { key: string; kind: string; picks: string[]; blockedBy: string | null; needsApply?: true } & Record<string, unknown>;

describe.skipIf(연결 === undefined)('결정 목록 · 결정 진행', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 사람: { role: 'admin' | 'member'; 권한: 서비스권한 } = { role: 'admin', 권한: 쓰기 };

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 넣기 = async (칸: { kind?: string; status: string; source?: number }): Promise<number> => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, pr_url)
       VALUES ($1, $2, $3, '{}', 'xwx', '검사', $4, CASE WHEN $4 = 'DONE' THEN 'https://github.com/x/y/pull/1' END) RETURNING id`,
      [서비스, 칸.kind ?? 'AUTHOR', 칸.source ?? null, 칸.status],
    );
    return Number(r.rows[0]!.id);
  };
  const 판저장 = (baseVersion: number, items: object[]) =>
    app.inject({ method: 'PUT', url: `/api/prd?service=${접두사}`, payload: { baseVersion, items } });
  const 목록 = async () =>
    (await app.inject({ method: 'GET', url: `/api/authoring/decisions?service=${접두사}` })).json() as {
      prdVersion: number; count: number; open: number[]; items: 항목[]; failMore: number;
    };
  const 진행 = (payload: object) => app.inject({ method: 'POST', url: `/api/authoring/decisions/run?service=${접두사}`, payload });
  const 요청수 = async () => Number((await q<{ n: string }>('SELECT count(*) AS n FROM authoring_request WHERE service_id = $1', [서비스])).rows[0]!.n);
  const params = async (id: number) => (await q<{ params: Record<string, unknown> }>('SELECT params FROM authoring_request WHERE id = $1', [id])).rows[0]!.params;

  const 치우기 = async () => {
    await q('DELETE FROM run_case_bug WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = $1', [케이스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xwx')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 결정 목록 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = {
        username: 'xwx', displayName: '검사', role: 사람.role, dashboard: 'read', mustChangePassword: false,
        services: [{ id: 서비스, prefix: 접두사, permissions: 사람.권한 }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(decisionRoutes, { prefix: '/api' });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(prdRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    사람 = { role: 'admin', 권한: 쓰기 };
    await 치우기();
  });

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('#14679 꼴 — 첫 작성이 끝났고 반영 전이면 ① 반영 대기와 확인 필요가 뜨고 ③ 은 반영을 기다린다. admin 만 ① 을 고르고 ③ 은 needsApply 다', async () => {
    const 첫 = await 넣기({ status: 'DONE' });
    await 판저장(0, [
      { feature: '쿠폰', text: '쿠폰은 하나만 쓴다', basis: [근거('화면', '쿠폰 1장')], status: 'NEEDS_CHECK' },
      { feature: '주문', text: '주문은 취소할 수 있다', basis: [근거('기획서.docx', '취소')], status: 'CONFIRMED' },
    ]);
    const 관리자 = await 목록();
    expect(관리자).toMatchObject({ prdVersion: 1, open: [첫], count: 3, failMore: 0 });
    expect(관리자.items.map((x) => [x.key, x.picks, x.blockedBy, x.needsApply ?? null])).toEqual([
      [`apply:${String(첫)}:${String(첫)}`, ['APPLY'], null, null],
      ['check:XWX-REQ-001', ['SAME', 'EDIT'], null, null],
      ['prd:0:1', ['REDO'], null, true],
    ]);
    expect(관리자.items[2]).toMatchObject({ kind: 'PRD_CHANGED', changed: null, added: null, removed: null, scenarios: [] });

    사람 = { role: 'member', 권한: 쓰기 };
    const 작성자 = await 목록();
    expect(작성자.count).toBe(1);
    expect(작성자.items.map((x) => [x.kind, x.picks, x.blockedBy])).toEqual([
      ['APPLY', [], 'ADMIN_ONLY'],
      ['CHECK', ['SAME', 'EDIT'], null],
      ['PRD_CHANGED', [], 'AUTHORING_OPEN'],
    ]);
  });

  it('진행은 기획서 새 버전 → 반영 → 다시 만들기 차례이고, 다시 만들기는 반영이 병합될 때까지 집히지 않는다', async () => {
    const 첫 = await 넣기({ status: 'DONE' });
    await 판저장(0, [{ feature: '쿠폰', text: '쿠폰은 하나만 쓴다', basis: [근거('화면', '쿠폰 1장')], status: 'NEEDS_CHECK' }]);
    const r = await 진행({
      prdVersion: 1,
      picks: [
        { key: `apply:${String(첫)}:${String(첫)}`, pick: 'APPLY' },
        { key: 'check:XWX-REQ-001', pick: 'SAME' },
        { key: 'prd:0:1', pick: 'REDO' },
      ],
    });
    expect(r.statusCode).toBe(201);
    const steps = (r.json() as { steps: { step: number; key: string | null; requestId: number | null; version: number | null }[] }).steps;
    expect(steps.map((s) => [s.step, s.key, s.version])).toEqual([
      [2, 'check:XWX-REQ-001', 2],
      [3, `apply:${String(첫)}:${String(첫)}`, null],
      [4, 'prd:0:1', null],
    ]);
    const [머지, 다시] = [steps[1]!.requestId!, steps[2]!.requestId!];
    expect(await params(다시)).toEqual({ prdApply: true, decision: { after: [첫], count: 3 } });

    const 판들 = (await app.inject({ method: 'GET', url: `/api/prd/versions?service=${접두사}` })).json() as Record<string, unknown>[];
    expect(판들[0]).toMatchObject({
      version: 2, source: 'DECISION', requestId: null, fromDecision: false,
      changes: [{ kind: 'CONFIRM', reqId: 'XWX-REQ-001', text: null, asset: null, tcId: null }],
    });
    expect(판들[1]).toMatchObject({ version: 1, source: 'PERSON', changes: null });

    expect((await 집기(서비스, 'xwx-agent'))?.id).toBe(머지);
    expect(await 집기(서비스, 'xwx-agent')).toBeNull();
    await q(`UPDATE authoring_request SET status = 'DONE', finished_at = now() WHERE id = $1`, [머지]);
    expect((await 집기(서비스, 'xwx-agent'))?.id).toBe(다시);
  });

  it('고를 때 본 것과 다르면 409, 권한이 모자라면 403, needsApply 를 ① 없이 고르면 400 이고 아무것도 안 한다', async () => {
    const 첫 = await 넣기({ status: 'DONE' });
    await 판저장(0, [{ feature: '쿠폰', text: '쿠폰은 하나만 쓴다', basis: [근거('화면', '쿠폰 1장')], status: 'NEEDS_CHECK' }]);
    const 앞 = await 요청수();
    const 결과 = async (payload: object) => {
      const r = await 진행(payload);
      return [r.statusCode, r.json()];
    };
    expect(await 결과({ prdVersion: 0, picks: [{ key: 'check:XWX-REQ-001', pick: 'SAME' }] })).toEqual([409, { error: 'DECISIONS_STALE' }]);
    expect(await 결과({ prdVersion: 1, picks: [{ key: 'check:XWX-REQ-009', pick: 'SAME' }] })).toEqual([409, { error: 'DECISIONS_STALE' }]);
    expect(await 결과({ prdVersion: 1, picks: [{ key: 'prd:0:1', pick: 'REDO' }] })).toEqual([400, { error: 'BAD_PICK', detail: 'prd:0:1' }]);
    expect(await 결과({ prdVersion: 1, picks: [{ key: 'check:XWX-REQ-001', pick: 'EDIT', text: '' }] })).toEqual([400, { error: 'BAD_PICK', detail: 'check:XWX-REQ-001' }]);
    expect(await 결과({ prdVersion: 1, picks: [] })).toEqual([400, { error: 'INVALID_REQUEST' }]);
    사람 = { role: 'member', 권한: 쓰기 };
    expect(await 결과({ prdVersion: 1, picks: [{ key: `apply:${String(첫)}:${String(첫)}`, pick: 'APPLY' }] })).toEqual([403, { error: 'FORBIDDEN', need: 'admin' }]);
    expect(await 요청수()).toBe(앞);
    const 판 = await q<{ n: string }>('SELECT count(*) AS n FROM prd_version WHERE service_id = $1', [서비스]);
    expect(판.rows[0]!.n).toBe('1');
  });

  it('문구 선택은 고른 출처의 원문으로 확정하고, 문장이 바뀌면 바뀐 요구 다시 만들기가 같이 선다', async () => {
    await 판저장(0, [{ feature: '배송', text: '3만원 이상 무료', basis: [근거('웹.docx', '3만원 이상 무료'), 근거('앱.docx', '5만원 이상 무료')], status: 'NEEDS_CHECK' }]);
    const 확인 = (await 목록()).items.find((x) => x.kind === 'CHECK');
    expect(확인).toMatchObject({ basis: 'DOCS', picks: ['PICK', 'OWN'], options: [{ asset: '웹.docx' }, { asset: '앱.docx' }] });
    const r = await 진행({ prdVersion: 1, picks: [{ key: 'check:XWX-REQ-001', pick: 'PICK', option: 1 }] });
    const steps = (r.json() as { steps: { step: number; key: string | null; requestId: number | null }[] }).steps;
    expect(steps.map((s) => [s.step, s.key])).toEqual([[2, 'check:XWX-REQ-001'], [4, null]]);
    expect(await params(steps[1]!.requestId!)).toEqual({ prdApply: true, decision: { after: [], count: 1 } });
    const 판 = (await app.inject({ method: 'GET', url: `/api/prd?service=${접두사}` })).json() as { items: Record<string, unknown>[] };
    expect(판.items[0]).toMatchObject({ text: '5만원 이상 무료', status: 'CONFIRMED', byPerson: true });
  });

  it('실패 판정 — 실행 read 가 없으면 항목이 없고 403, 실행 write 가 없으면 버그를 못 고른다. 버그를 남기면 목록에서 빠지고 화면이 맞음으로 바꿀 수 있다', async () => {
    await q(`INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active) VALUES ($1, '검사', 'tests/xwx/a.spec.ts', '{}', '{}', true)`, [케이스]);
    await q(`INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, 'XWX-REQ-001', $2, '정상')`, [서비스, 케이스]);
    await 판저장(0, [{ feature: '주문', text: '주문은 취소할 수 있다', basis: [근거('기획서.docx', '취소')], status: 'CONFIRMED' }]);
    const 실행 = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, finished_at)
       VALUES ('XWX 실행', 'xwx', 'qa', 'FINISHED', $1, 'XWX', '', '', 'FN', now()) RETURNING run_id`,
      [서비스],
    );
    const runId = Number(실행.rows[0]!.run_id);
    await q(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, params, expected, param_schema, expected_schema, status, attempt, finished_at)
       VALUES ($1, $2, 'chromium', '검사', '', '{}', '{}', '{}', '{}', 'FAIL', 1, now())`,
      [runId, 케이스],
    );
    const key = `fail:${String(runId)}:${케이스}`;

    사람 = { role: 'member', 권한: { cases: 'read', runs: 'none', authoring: 'write' } };
    expect((await 목록()).items.some((x) => x.kind === 'FAIL')).toBe(false);
    const 못봄 = await 진행({ prdVersion: 1, picks: [{ key, pick: 'BUG' }] });
    expect([못봄.statusCode, 못봄.json()]).toEqual([403, { error: 'FORBIDDEN', need: 'runs:read' }]);

    사람 = { role: 'member', 권한: { cases: 'read', runs: 'read', authoring: 'write' } };
    expect((await 목록()).items.find((x) => x.key === key)).toMatchObject({
      kind: 'FAIL', picks: ['SCREEN'], blockedBy: 'NO_RUN_WRITE', reqs: [{ reqId: 'XWX-REQ-001', text: '주문은 취소할 수 있다' }], verify: null,
    });
    const 못씀 = await 진행({ prdVersion: 1, picks: [{ key, pick: 'BUG' }] });
    expect([못씀.statusCode, 못씀.json()]).toEqual([403, { error: 'FORBIDDEN', need: 'runs:write' }]);

    사람 = { role: 'member', 권한: 쓰기 };
    const 버그 = await 진행({ prdVersion: 1, picks: [{ key, pick: 'BUG' }] });
    expect([버그.statusCode, 버그.json()]).toEqual([201, { steps: [{ step: 1, key, requestId: null, version: null }] }]);
    expect((await 목록()).items.some((x) => x.key === key)).toBe(false);

    const 바꿈 = await 진행({ prdVersion: 1, picks: [{ key, pick: 'SCREEN' }] });
    const 단계 = (바꿈.json() as { steps: { step: number; requestId: number }[] }).steps;
    expect(단계.map((s) => s.step)).toEqual([4]);
    expect(await params(단계[0]!.requestId)).toMatchObject({
      prdApply: true,
      screenRight: [{ runId, tcId: 케이스, env: 'qa', reqIds: ['XWX-REQ-001'], byName: '검사' }],
      decision: { after: [], count: 1 },
    });
    const 또 = await 진행({ prdVersion: 1, picks: [{ key, pick: 'SCREEN' }] });
    expect([또.statusCode, 또.json()]).toEqual([409, { error: 'DECISIONS_STALE' }]);
  });

  it('바뀐 요구 다시 만들기를 두 번 보내면 둘째는 열린 작성에 막혀 요청이 하나만 선다 · 만들기 통로는 params.decision 을 400 BAD_DECISION', async () => {
    await 판저장(0, [{ feature: '주문', text: '주문은 취소할 수 있다', basis: [근거('기획서.docx', '취소')], status: 'CONFIRMED' }]);
    const 본문 = { prdVersion: 1, picks: [{ key: 'prd:0:1', pick: 'REDO' }] };
    expect((await 진행(본문)).statusCode).toBe(201);
    const 둘째 = await 진행(본문);
    expect([둘째.statusCode, 둘째.json()]).toEqual([400, { error: 'BAD_PICK', detail: 'prd:0:1' }]);
    expect(await 요청수()).toBe(1);
    const 만들기 = await app.inject({
      method: 'POST', url: `/api/authoring/requests?service=${접두사}`, payload: { kind: 'AUTHOR', params: { decision: { after: [1], count: 1 } } },
    });
    expect([만들기.statusCode, 만들기.json()]).toEqual([400, { error: 'BAD_DECISION' }]);
  });

  it('PR 없이 끝난 작성은 ① 에 싣지 않고 열린 작성으로만 남는다', async () => {
    const 첫 = await 넣기({ status: 'DONE' });
    await q('UPDATE authoring_request SET pr_url = NULL WHERE id = $1', [첫]);
    const r = await 목록();
    expect(r.open).toEqual([첫]);
    expect(r.items).toEqual([]);
  });
});
