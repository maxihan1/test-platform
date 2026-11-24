// 프로시저 안 케이스의 삭제가 작성 행으로 서는지 · 기대값 고치기가 같은 프로시저를 쥔 요청에 막히는지 (SPEC 도메인/작성 §3.6 「★ 테스트 프로시저 작성」 「고치기 · 삭제 · 보류 · 겹침」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringEditRoutes from './edit-routes.js';
import { 목록요약들 } from './listSummary.js';
import authoringRoutes from './routes.js';
import { 집기대상칸 } from './reverse.js';

const 접두사 = 'XEQ';
const 케이스들: [tcId: string, procId: string | null, seq: number | null][] = [
  ['XEQ-FN-001', 'XEQ-TP-001', 1],
  ['XEQ-FN-002', 'XEQ-TP-001', 2],
  ['XEQ-FN-003', 'XEQ-TP-002', 1],
  ['XEQ-FN-004', null, null],
];
const 번호들 = 케이스들.map(([tcId]) => tcId);
const 지우기 = (...tcIds: string[]) => tcIds.map((tcId) => ({ tcId, delete: true }));
const 기대 = (tcId: string) => [{ tcId, expected: { title: '새 값' } }];

describe.skipIf(process.env.DATABASE_URL === undefined)('프로시저 안 케이스의 고치기 · 삭제', () => {
  let app: FastifyInstance;
  let 서비스 = 0;

  const pool = async () => (await import('../db/index.js')).pool;
  const 고치기 = (edits: object[]) => app.inject({ method: 'POST', url: `/api/authoring/edits?service=${접두사}`, payload: { edits } });
  const 세운번호 = async (edits: object[]): Promise<number> => {
    const res = await 고치기(edits);
    expect(res.statusCode, res.body).toBe(201);
    return (res.json() as { id: number }).id;
  };
  const 작성 = (본문: object) => app.inject({ method: 'POST', url: `/api/authoring/requests?service=${접두사}`, payload: 본문 });
  const 읽기 = async (id: number) => (await (await pool()).query('SELECT * FROM authoring_request WHERE id = $1', [id])).rows[0];
  const 행넣기 = async (칸: Record<string, unknown>): Promise<number> => {
    const 이름들 = Object.keys(칸);
    const q = await (await pool()).query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, requested_by, requested_by_name, ${이름들.join(', ')})
       VALUES ($1, 'xeq', '프로시저 검사', ${이름들.map((_, i) => `$${String(i + 2)}`).join(', ')}) RETURNING id`,
      [서비스, ...이름들.map((k) => (typeof 칸[k] === 'object' && 칸[k] !== null ? JSON.stringify(칸[k]) : 칸[k]))],
    );
    return Number(q.rows[0]!.id);
  };
  const 바꾸기 = async (id: number, sql: string) => (await pool()).query(`UPDATE authoring_request SET ${sql} WHERE id = $1`, [id]);

  beforeAll(async () => {
    const p = await pool();
    const r = await p.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind)
            VALUES ($1, 'XEQ 프로시저 고치기 검사용', '#3A5FCD', 'https://github.com/acme/xeq', 'xeq', 'APP')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await p.query(`INSERT INTO service_env (service_id, env, base_url, login_id, login_password, app_path) VALUES ($1, 'qa', 'https://qa.xeq.test', 'tester', 'pw-xeq-11', 'xeq.apk')`, [서비스]);
    for (const [tcId, procId, seq] of 케이스들) {
      await p.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, proc_id, proc_seq, proc_name)
         VALUES ($1, 'XEQ 프로시저', '["android"]', '[]', $2, '{"type":"object","properties":{}}', '{"type":"object","properties":{"title":{"type":"string"}}}', $3, $4, CASE WHEN $3::text IS NULL THEN NULL ELSE '글쓰기' END)`,
        [tcId, `xeq/${procId ?? tcId}.spec.ts`, procId, seq],
      );
    }
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 'xeq', displayName: '프로시저 검사', role: 'member', dashboard: 'read', mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringEditRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await (await pool()).query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const p = await pool();
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [번호들]);
    await p.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  describe('삭제', () => {
    it('모두 프로시저 안 케이스의 삭제면 작성 행이 곧장 대기로 선다 — 프로시저가 둘이어도 하나다', async () => {
      const 행 = await 읽기(await 세운번호(지우기('XEQ-FN-002', 'XEQ-FN-003')));
      expect([행.kind, 행.status, 행.source_id, 행.compare, 행.requested_by]).toEqual(['AUTHOR', 'PENDING', null, false, 'xeq']);
      expect(행.params).toEqual({ procDelete: { cases: ['XEQ-FN-002', 'XEQ-FN-003'] } });
    });

    it('집기는 다른 정방향 작성 행처럼 그 앱 줄의 계정을 싣는다', async () => {
      const 행 = await 읽기(await 세운번호(지우기('XEQ-FN-002')));
      const 칸 = await 집기대상칸(서비스, { kind: 행.kind, compare: 행.compare, env: 행.env, startUrl: 행.start_url, params: 행.params }, undefined);
      expect(칸.target).toBeUndefined();
      expect(칸.accounts?.map((a) => a.env)).toEqual(['qa']);
    });

    it.each([
      ['옛 꼴 케이스의 삭제', [...지우기('XEQ-FN-004'), ...지우기('XEQ-FN-002')]],
      ['기대값 고치기', [...기대('XEQ-FN-001'), ...지우기('XEQ-FN-002')]],
    ])('%s 와 섞이면 400 BAD_EDIT — 짚는 번호는 프로시저 안 케이스다', async (_이름, edits) => {
      const res = await 고치기(edits);
      expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_EDIT', detail: 'XEQ-FN-002' }]);
    });

    it('옛 꼴 케이스의 삭제는 지금처럼 고치기 행이다', async () => {
      expect((await 읽기(await 세운번호(지우기('XEQ-FN-004')))).kind).toBe('EDIT');
    });

    it('열린 작성이 있으면 409 AUTHORING_OPEN — 다른 프로시저여도, 열린 고치기여도 막는다', async () => {
      const 열린 = await 행넣기({ kind: 'AUTHOR', status: 'DONE', claimed_by: 'xeq' });
      const res = await 고치기(지우기('XEQ-FN-003'));
      expect([res.statusCode, res.json()]).toEqual([409, { error: 'AUTHORING_OPEN', detail: [열린] }]);
      await 바꾸기(열린, `status = 'FAILED'`);
      const 고침 = await 세운번호(기대('XEQ-FN-004'));
      expect((await 고치기(지우기('XEQ-FN-003'))).json()).toEqual({ error: 'AUTHORING_OPEN', detail: [고침] });
    });

    it('동시에 눌러도 하나만 선다', async () => {
      const 결과 = await Promise.all([고치기(지우기('XEQ-FN-002')), 고치기(지우기('XEQ-FN-003'))]);
      expect(결과.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    });

    it('작성 요청 · 재실행 본문에 procDelete 를 실으면 400 BAD_EDIT', async () => {
      const 실음 = { params: { procDelete: { cases: ['XEQ-FN-001'] } } };
      const id = await 세운번호(지우기('XEQ-FN-002'));
      for (const 본문 of [{ kind: 'AUTHOR', figma: [], ...실음 }, { kind: 'RERUN', sourceId: id, ...실음 }]) {
        const res = await 작성(본문);
        expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_EDIT', detail: 'params.procDelete' }]);
      }
    });

    it('재실행은 원본의 procDelete 를 그대로 물려받는다', async () => {
      const id = await 세운번호(지우기('XEQ-FN-002'));
      await 바꾸기(id, `status = 'FAILED', finished_at = now(), claimed_by = 'xeq'`);
      const res = await 작성({ kind: 'RERUN', sourceId: id });
      expect(res.statusCode, res.body).toBe(201);
      expect((await 읽기((res.json() as { id: number }).id)).params).toEqual({ procDelete: { cases: ['XEQ-FN-002'] } });
    });

    it('작성 목록은 케이스 수정 · 지우기로 읽는다', async () => {
      const id = await 세운번호(지우기('XEQ-FN-001', 'XEQ-FN-002'));
      await 바꾸기(id, `status = 'DONE', finished_at = now(), claimed_by = 'xeq'`);
      const 요약 = (await 목록요약들(서비스, [id])).get(id)!;
      expect([요약.kind, 요약.what.fix, 요약.what.tcIds, 요약.result?.casesFixed, 요약.result?.casesMade, 요약.from.by]).toEqual(['EDIT', 'DELETE', ['XEQ-FN-001', 'XEQ-FN-002'], 2, null, 'CASES']);
    });
  });

  describe('기대값 고치기의 겹치는 요청', () => {
    const 막힘 = async (tcId: string) => {
      const res = await 고치기(기대(tcId));
      return res.statusCode === 201 ? null : [res.statusCode, res.json()];
    };
    const 열림 = (id: number) => [409, { error: 'EDIT_OPEN', detail: [id] }];

    it('같은 프로시저의 다른 케이스를 쥔 열린 고치기가 있으면 막고, 다른 프로시저 · 옛 꼴은 안 막는다', async () => {
      const 앞 = await 세운번호(기대('XEQ-FN-001'));
      expect(await 막힘('XEQ-FN-002')).toEqual(열림(앞));
      expect(await 막힘('XEQ-FN-003')).toBeNull();
      expect(await 막힘('XEQ-FN-004')).toBeNull();
    });

    it.each(['PENDING', 'RUNNING', 'DONE'])('열린 삭제 작성(%s)이 쥔 프로시저면 막는다', async (status) => {
      const 앞 = await 세운번호(지우기('XEQ-FN-001'));
      if (status !== 'PENDING') await 바꾸기(앞, `status = '${status}', claimed_by = 'xeq', started_at = now()`);
      expect(await 막힘('XEQ-FN-002')).toEqual(열림(앞));
      expect(await 막힘('XEQ-FN-003')).toBeNull();
    });

    it('병합된 삭제 작성은 안 막는다', async () => {
      const 앞 = await 세운번호(지우기('XEQ-FN-001'));
      await 바꾸기(앞, `status = 'DONE', claimed_by = 'xeq'`);
      await 행넣기({ kind: 'MERGE', source_id: 앞, status: 'DONE' });
      expect(await 막힘('XEQ-FN-002')).toBeNull();
    });

    it('도는 중인 테스트 수정이 쥔 프로시저면 막는다. 옛 꼴 케이스는 지금처럼 안 본다', async () => {
      const cases = ['XEQ-FN-002', 'XEQ-FN-004'].map((tcId) => ({ runId: 1, tcId, env: 'qa' }));
      const 앞 = await 행넣기({ kind: 'AUTHOR', status: 'RUNNING', claimed_by: 'xeq', params: { prdApply: true, testFix: { issueKey: 'XEQ-1', cases, note: '' } } });
      expect(await 막힘('XEQ-FN-001')).toEqual(열림(앞));
      expect(await 막힘('XEQ-FN-004')).toBeNull();
    });

    it('열린 작성이 쓴 케이스가 같은 프로시저면 막는다 — 번호가 달라도, 파일만 같아도', async () => {
      const 쓴 = (tcId: string) => ({ cases: [{ tcId, name: '이름', file: 'tests/xeq/XEQ-TP-001.spec.ts', change: 'CHANGED', verifies: [], reqs: [] }] });
      const 앞 = await 행넣기({ kind: 'AUTHOR', status: 'DONE', claimed_by: 'xeq', result: 쓴('XEQ-FN-002') });
      expect(await 막힘('XEQ-FN-001')).toEqual(열림(앞));
      await 바꾸기(앞, `result = '${JSON.stringify(쓴('XEQ-FN-099'))}'`);
      expect(await 막힘('XEQ-FN-001')).toEqual(열림(앞));
      expect(await 막힘('XEQ-FN-003')).toBeNull();
    });
  });
});
