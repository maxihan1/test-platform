// 「화면이 맞음」 반영 본문이 도메인/작성 §7 apply 「본문 screenRight」의 거절 · params 모양 · 잠금과 작성 요청 통로의 BAD_PRD_APPLY · 물려받기를 지키는지 본다
// 문 없이 라우트만 띄우고 실행 칸만 머리글로 흉내 낸다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringRoutes from '../authoring/routes.js';
import prdRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPF';
const 남의접두사 = 'XPFB';
const 항목 = (text: string) => ({ feature: '회원가입', text, basis: [{ from: '기획서.docx', quote: text }], status: 'CONFIRMED' });

describe.skipIf(연결 === undefined)('화면이 맞음 반영 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 남의서비스 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 부르기 = (method: 'PUT' | 'POST', 주소: string, payload?: object, runs: 'read' | 'none' = 'read') =>
    app.inject({ method, url: `/api${주소}?service=${접두사}`, headers: { 'x-runs': runs }, ...(payload ? { payload } : {}) });
  const 화면이맞음 = (runId: unknown, tcId = 'XPF-FN-001', runs: 'read' | 'none' = 'read') =>
    부르기('POST', '/prd/apply', { screenRight: { runId, tcId } }, runs);

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
      const runs = req.headers['x-runs'] === 'none' ? 'none' : 'read';
      req.user = {
        username: 'xpf',
        displayName: '검사',
        services: [{ prefix: 접두사, permissions: { cases: 'read', runs, authoring: 'write' } }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(prdRoutes, { prefix: '/api' });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await 치우기();
    // 판 1 = 기준 판(병합된 반영이 읽은 판) — 반영 안 됨이 0 이어도 화면이 맞음은 서야 한다
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

  it('본문이 {} · 화면이 맞음 꼴이 아니면 400 INVALID_REQUEST', async () => {
    for (const 몸 of [{ foo: 1 }, { screenRight: { runId: '1', tcId: 'XPF-FN-001' } }, { screenRight: { runId: 1, tcId: 'XPF-FN-001', env: 'qa' } }, { screenRight: { runId: 1, tcId: '아무거나' } }]) {
      const r = await 부르기('POST', '/prd/apply', 몸);
      expect([r.statusCode, r.json()]).toEqual([400, { error: 'INVALID_REQUEST' }]);
    }
  });

  it('실행 read 가 없으면 실행을 보기 전에 403 — 실패 여부를 떠보는 길이 되지 않게', async () => {
    const runId = await 실행넣기('FINISHED', 'FAIL');
    for (const id of [runId, 999_999_999]) {
      const r = await 화면이맞음(id, 'XPF-FN-001', 'none');
      expect([r.statusCode, r.json()]).toEqual([403, { error: 'FORBIDDEN', need: 'runs:read' }]);
    }
  });

  it('없는 실행 · 남의 서비스 실행은 404, 도는 중이면 409, 그 케이스의 실패가 없으면 400, 덮는 번호가 판에 없으면 409', async () => {
    const 기대 = async (runId: number, 코드: number, error: string, tcId = 'XPF-FN-001') => {
      const r = await 화면이맞음(runId, tcId);
      expect([r.statusCode, r.json()]).toEqual([코드, { error }]);
    };
    await 기대(999_999_999, 404, 'RUN_NOT_FOUND');
    await 기대(await 실행넣기('FINISHED', 'FAIL', 남의서비스), 404, 'RUN_NOT_FOUND');
    await 기대(await 실행넣기('RUNNING', 'FAIL'), 409, 'RUN_NOT_FINISHED');
    await 기대(await 실행넣기('FINISHED', 'PASS'), 400, 'NOT_FAILED');
    await 기대(await 실행넣기('FINISHED', 'FAIL', 서비스, 'XPF-FN-002'), 409, 'NO_PRD_REQ', 'XPF-FN-002');
    expect((await q('SELECT 1 FROM authoring_request WHERE service_id = $1 AND kind = $2 AND status = $3', [서비스, 'AUTHOR', 'PENDING'])).rowCount).toBe(0);
  });

  it('반영 안 됨이 0 이어도 세우고 params 에 env · 판 차례 번호를 싣는다. 열린 반영이 있으면 APPLY_OPEN', async () => {
    const 보통 = await 부르기('POST', '/prd/apply', {});
    expect([보통.statusCode, 보통.json()]).toEqual([409, { error: 'NOTHING_TO_APPLY' }]);
    const runId = await 실행넣기('ABORTED', 'FAIL');
    const r = await 화면이맞음(runId);
    expect(r.statusCode).toBe(201);
    const id = (r.json() as { id: number }).id;
    const 행 = await q<{ kind: string; status: string; params: object }>('SELECT kind, status, params FROM authoring_request WHERE id = $1', [id]);
    expect(행.rows[0]).toEqual({
      kind: 'AUTHOR',
      status: 'PENDING',
      params: { prdApply: true, screenRight: { runId, tcId: 'XPF-FN-001', env: 'qa', reqIds: ['XPF-REQ-001', 'XPF-REQ-002'] } },
    });
    const 또 = await 화면이맞음(runId);
    expect([또.statusCode, 또.json()]).toEqual([409, { error: 'APPLY_OPEN', detail: [id] }]);
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
