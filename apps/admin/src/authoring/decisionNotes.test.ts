// 결정 목록 「설명 안 되는 줄」 — 게임 시나리오의 verify.note 를 항목으로 세우고 이슈 등록 · PRD 수정으로 판정한다 (도메인/작성 §3.6 「★ 결정 목록」 · 도메인/게임 §3.10 결정 24 의 5)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { 서비스권한 } from '../auth/permissions.js';
import prdRoutes from '../prd/routes.js';
import decisionRoutes from './decisionRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XNE';
const 미션 = 'XNE-GS-001';
const 기능 = 'XNE-FN-001';
const 쓰기: 서비스권한 = { cases: 'write', runs: 'write', authoring: 'write' };

type 항목 = { key: string; kind: string; picks: string[]; blockedBy: string | null } & Record<string, unknown>;

describe.skipIf(연결 === undefined)('결정 목록 · 설명 안 되는 줄', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 사람: { role: 'admin' | 'member'; 권한: 서비스권한 } = { role: 'admin', 권한: 쓰기 };

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 목록 = async () =>
    (await app.inject({ method: 'GET', url: `/api/authoring/decisions?service=${접두사}` })).json() as { prdVersion: number; count: number; items: 항목[] };
  const 진행 = (payload: object) => app.inject({ method: 'POST', url: `/api/authoring/decisions/run?service=${접두사}`, payload });
  const 설명들 = async () => (await 목록()).items.filter((x) => x.kind === 'NOTE');

  /** 케이스 하나를 한 번 돌린 실행 — 절차 하나에 판정 문장들을 남긴다 */
  const 실행넣기 = async (tcId: string, assertions: object[], status = 'PASS'): Promise<number> => {
    const r = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, finished_at)
       VALUES ('XNE 실행', 'xne', 'qa', 'FINISHED', $1, 'XNE', '', '', 'FN', now()) RETURNING run_id`,
      [서비스],
    );
    const runId = Number(r.rows[0]!.run_id);
    const i = await q<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, params, expected, param_schema, expected_schema, status, attempt, finished_at)
       VALUES ($1, $2, 'android', '검사', '', '{}', '{}', '{}', '{}', $3, 1, now()) RETURNING history_id`,
      [runId, tcId, status],
    );
    await q(`INSERT INTO run_item_step (history_id, seq, title, status, assertions) VALUES ($1, 1, '임프 3마리 처치', $2, $3)`, [
      Number(i.rows[0]!.history_id),
      status,
      JSON.stringify(assertions),
    ]);
    return runId;
  };
  const 설명 = { statement: '준 피해 줄에 인원 보정 1.2', status: 'NA', actual: { 값: 14 }, expected: null };
  const 통과 = { statement: '준 피해 줄은 전부 12 — XNE-REQ-001', status: 'PASS', actual: { 줄수: 3 }, expected: { 값: 12 } };

  const 치우기 = async () => {
    await q('DELETE FROM run_case_note WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [[미션, 기능]]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ($1, $2, '#3A5FCD', '', 'xne')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사, `${접두사} 설명 안 되는 줄 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = {
        username: 'xne', displayName: '검사', role: 사람.role, dashboard: 'read', mustChangePassword: false,
        services: [{ id: 서비스, prefix: 접두사, permissions: 사람.권한 }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(decisionRoutes, { prefix: '/api' });
    await app.register(prdRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    사람 = { role: 'admin', 권한: 쓰기 };
    await 치우기();
    for (const tcId of [미션, 기능]) {
      await q(`INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active) VALUES ($1, '레벨 5 탱커가 임프 3마리를 잡는다', 'tests/xne/a.spec.ts', '{}', '{}', true)`, [tcId]);
      await q(`INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, 'XNE-REQ-001', $2, '정상')`, [서비스, tcId]);
    }
    const 판 = await app.inject({
      method: 'PUT',
      url: `/api/prd?service=${접두사}`,
      payload: { baseVersion: 0, items: [{ feature: '전투', text: '준 피해는 무기 공격력이다', basis: [{ from: '기획서.docx', quote: '공격력' }], status: 'CONFIRMED' }] },
    });
    expect(판.statusCode).toBe(200);
  });

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('게임 시나리오의 가장 최근 실행에 설명 안 되는 줄이 있으면 결함 판정 항목이 선다 — 판정 NA 문장만 싣고, 기능 케이스의 NA 는 안 든다', async () => {
    await 실행넣기(기능, [설명]);
    const runId = await 실행넣기(미션, [통과, 설명]);
    const 결과 = await 목록();
    expect(결과.items.filter((x) => x.kind === 'NOTE')).toEqual([
      {
        key: `note:${String(runId)}:${미션}`, group: 2, kind: 'NOTE', picks: ['BUG', 'EDIT'], blockedBy: null,
        runId, tcId: 미션, name: '레벨 5 탱커가 임프 3마리를 잡는다',
        reqs: [{ reqId: 'XNE-REQ-001', text: '준 피해는 무기 공격력이다' }],
        notes: [{ statement: '준 피해 줄에 인원 보정 1.2', actual: { 값: 14 } }],
        finishedAt: expect.any(String),
      },
    ]);
    expect(결과.count).toBe(1);

    사람 = { role: 'member', 권한: { cases: 'write', runs: 'read', authoring: 'write' } };
    expect((await 설명들()).map((x) => [x.picks, x.blockedBy])).toEqual([[['EDIT'], 'NO_RUN_WRITE']]);
    사람 = { role: 'member', 권한: { cases: 'write', runs: 'none', authoring: 'write' } as unknown as 서비스권한 };
    expect(await 설명들()).toEqual([]);
  });

  it('설명 안 되는 줄이 없는 실행이 가장 최근이면 항목이 없다', async () => {
    await 실행넣기(미션, [설명]);
    await 실행넣기(미션, [통과]);
    expect(await 설명들()).toEqual([]);
  });

  it('이슈 등록은 판정 기록만 남기고 항목이 빠진다. 같은 것을 또 고르면 낡음이다', async () => {
    const runId = await 실행넣기(미션, [설명]);
    const key = `note:${String(runId)}:${미션}`;
    const r = await 진행({ prdVersion: 1, picks: [{ key, pick: 'BUG' }] });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toEqual({ steps: [{ step: 1, key, requestId: null, version: null }] });
    expect((await q('SELECT verdict, marked_by FROM run_case_note WHERE run_id = $1', [runId])).rows).toEqual([{ verdict: 'BUG', marked_by: 'xne' }]);
    expect((await q('SELECT 1 FROM run_case_bug WHERE run_id = $1', [runId])).rowCount).toBe(0);
    expect(await 설명들()).toEqual([]);
    expect((await 진행({ prdVersion: 1, picks: [{ key, pick: 'BUG' }] })).statusCode).toBe(409);

    // 다음 실행이 또 남기면 새 항목이다
    const 다음 = await 실행넣기(미션, [설명]);
    expect((await 설명들()).map((x) => x.key)).toEqual([`note:${String(다음)}:${미션}`]);
  });

  it('PRD 수정은 덮는 요구 문장을 고친 새 버전과 다시 만들기 요청을 세운다. 문장이 그대로면 BAD_PICK 이다', async () => {
    const runId = await 실행넣기(미션, [설명]);
    const key = `note:${String(runId)}:${미션}`;
    expect((await 진행({ prdVersion: 1, picks: [{ key, pick: 'EDIT', text: '준 피해는 무기 공격력이다' }] })).json()).toEqual({ error: 'BAD_PICK', detail: key });
    expect((await 진행({ prdVersion: 1, picks: [{ key, pick: 'EDIT', text: '새 규칙', option: 1 }] })).statusCode).toBe(400);

    const 새문장 = '준 피해는 무기 공격력에 파티 인원 보정(3명 1.2배)을 곱한다';
    const r = await 진행({ prdVersion: 1, picks: [{ key, pick: 'EDIT', text: 새문장 }] });
    expect(r.statusCode).toBe(201);
    const steps = (r.json() as { steps: { step: number; key: string | null; requestId: number | null; version: number | null }[] }).steps;
    expect(steps.map((s) => [s.step, s.key, s.version])).toEqual([
      [2, key, 2],
      [4, null, null],
    ]);
    const 판 = (await q<{ items: { reqId: string; text: string; status: string }[]; changes: unknown }>('SELECT items, changes FROM prd_version WHERE service_id = $1 AND version = 2', [서비스])).rows[0]!;
    expect(판.items.map((x) => [x.reqId, x.text, x.status])).toEqual([['XNE-REQ-001', 새문장, 'CONFIRMED']]);
    expect(판.changes).toEqual([{ kind: 'EDIT', reqId: 'XNE-REQ-001', text: 새문장, asset: null, tcId: 미션 }]);
    const 요청 = (await q<{ params: Record<string, unknown> }>('SELECT params FROM authoring_request WHERE id = $1', [steps[1]!.requestId])).rows[0]!.params;
    expect(요청).toMatchObject({ prdApply: true });
    expect((await q('SELECT verdict FROM run_case_note WHERE run_id = $1', [runId])).rows).toEqual([{ verdict: 'RULE' }]);
    expect(await 설명들()).toEqual([]);
  });
});
