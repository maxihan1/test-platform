// 표준 기획서 API 가 도메인/작성 §7 「표준 기획서 통로」의 경로 · 응답 · 거절을 지키는지 본다. 문 없이 라우트만 띄운다

import Fastify, { type FastifyInstance } from 'fastify';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringRoutes from '../authoring/routes.js';
import prdRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPR';
const 근거 = [{ from: '기획서.docx', ref: 'REQ-CART-1', quote: '장바구니는 20개까지 담는다' }];
const 항목 = (text: string, 덧: Record<string, unknown> = {}) => ({ feature: '장바구니', text, basis: 근거, status: 'CONFIRMED', ...덧 });
const 케이스들 = ['XPR-FN-001', 'XPR-FN-002'];

describe.skipIf(연결 === undefined)('표준 기획서 API', () => {
  let app: FastifyInstance;
  let 서비스 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 부르기 = (method: 'GET' | 'PUT' | 'POST', 주소: string, payload?: object) =>
    app.inject({ method, url: `/api${주소}${주소.includes('?') ? '&' : '?'}service=${접두사}`, ...(payload ? { payload } : {}) });

  const 치우기 = async () => {
    await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await q('DELETE FROM perf_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM perf_scenario WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xpr')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 표준 기획서 API 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    app = Fastify();
    // 문 없이 띄운다 — 실행 칸만 머리글로 흉내 낸다. 추적표 엑셀이 실행 read 로 마지막 결과를 가른다
    app.addHook('onRequest', async (req) => {
      const runs = req.headers['x-runs'];
      if (runs !== 'read' && runs !== 'none') return;
      req.user = {
        username: 'xpr',
        displayName: '검사',
        services: [{ prefix: 접두사, permissions: { cases: 'read', runs, authoring: 'read' } }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(prdRoutes, { prefix: '/api' });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(치우기);

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('표준 기획서가 없으면 판 0 과 빈 칸들이다. 서비스가 없으면 400', async () => {
    const r = await 부르기('GET', '/prd');
    expect(r.json()).toEqual({
      version: 0,
      items: [],
      cases: {},
      held: { reqs: {}, roles: [], continueFrom: null },
      perf: {},
    });
    expect((await app.inject({ method: 'GET', url: '/api/prd' })).json()).toEqual({ error: 'SERVICE_REQUIRED' });
  });

  it('저장하면 서버가 번호를 매기고, 낡은 판 · 틀린 항목 · 지어낸 번호는 거절한다', async () => {
    expect((await 부르기('PUT', '/prd', { baseVersion: 0, items: [항목('20개까지'), 항목('비면 안내', { status: 'NEEDS_CHECK' })] })).json()).toEqual({ version: 1 });
    const 지금 = (await 부르기('GET', '/prd')).json();
    expect(지금).toMatchObject({
      version: 1,
      items: [{ reqId: 'XPR-REQ-001', byPerson: true }, { reqId: 'XPR-REQ-002', status: 'NEEDS_CHECK' }],
    });

    const 낡음 = await 부르기('PUT', '/prd', { baseVersion: 0, items: [] });
    expect([낡음.statusCode, 낡음.json()]).toEqual([409, { error: 'PRD_STALE', latest: 1 }]);
    const 틀림 = await 부르기('PUT', '/prd', { baseVersion: 1, items: [항목('')] });
    expect([틀림.statusCode, 틀림.json()]).toEqual([400, { error: 'BAD_PRD', detail: '0.text' }]);
    const 지어냄 = await 부르기('PUT', '/prd', { baseVersion: 1, items: [항목('x', { reqId: 'XPR-REQ-007' })] });
    expect([지어냄.statusCode, 지어냄.json()]).toEqual([400, { error: 'PRD_REUSED', detail: 'XPR-REQ-007' }]);
    expect((await 부르기('PUT', '/prd', { items: [] })).json()).toEqual({ error: 'BAD_PRD', detail: 'baseVersion' });
  });

  it('999 항목이 1MiB 를 넘어도 받는다', async () => {
    const items = Array.from({ length: 999 }, () => 항목('가'.repeat(900)));
    expect(Buffer.byteLength(JSON.stringify(items))).toBeGreaterThan(1024 * 1024);
    const r = await 부르기('PUT', '/prd', { baseVersion: 0, items });
    expect([r.statusCode, r.json()]).toEqual([200, { version: 1 }]);
  });

  it('판 이력 · 그 판 통째 · 되돌리기', async () => {
    await 부르기('PUT', '/prd', { baseVersion: 0, items: [항목('20개까지', { status: 'NEEDS_CHECK' })] });
    expect((await 부르기('PUT', '/prd', { baseVersion: 1, items: [항목('20개까지', { reqId: 'XPR-REQ-001' })] })).json()).toEqual({ version: 2 });

    expect((await 부르기('POST', '/prd/revert', { baseVersion: 2, toVersion: 1 })).json()).toEqual({ version: 3 });
    const 없음 = await 부르기('POST', '/prd/revert', { baseVersion: 3, toVersion: 9 });
    expect([없음.statusCode, 없음.json()]).toEqual([404, { error: 'NOT_FOUND' }]);

    const 이력 = (await 부르기('GET', '/prd/versions')).json() as { version: number; source: string }[];
    expect(이력.map((x) => [x.version, x.source])).toEqual([[3, 'REVERT'], [2, 'PERSON'], [1, 'PERSON']]);
    expect((await 부르기('GET', '/prd/versions/1')).json()).toMatchObject({ version: 1, items: [{ status: 'NEEDS_CHECK' }] });
    expect((await 부르기('GET', '/prd/versions/9')).statusCode).toBe(404);
  });

  it('작성 요청 통로로 prdApply 를 실으면 400, 반영 요청의 재실행은 prdApply 를 물려받는다', async () => {
    const 실음 = await app.inject({
      method: 'POST',
      url: `/api/authoring/requests?service=${접두사}`,
      payload: { kind: 'AUTHOR', params: { prdApply: true } },
    });
    expect([실음.statusCode, 실음.json()]).toEqual([400, { error: 'BAD_PRD_APPLY' }]);

    const 원본 = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
       VALUES ($1, 'AUTHOR', '{"prdApply": true}', 'xpr', '검사', 'DONE') RETURNING id`,
      [서비스],
    );
    const r = await app.inject({
      method: 'POST',
      url: `/api/authoring/requests?service=${접두사}`,
      payload: { kind: 'RERUN', sourceId: Number(원본.rows[0]!.id) },
    });
    expect(r.statusCode).toBe(201);
    const 행 = await q<{ params: object }>('SELECT params FROM authoring_request WHERE id = $1', [(r.json() as { id: number }).id]);
    expect(행.rows[0]?.params).toEqual({ prdApply: true });
  });

  it('워드는 지금 판을 싣고 그 서비스 테스트 계정 비밀번호를 가린다 · 판이 없으면 404 · docx · xlsx 말고는 400', async () => {
    const 없음 = await 부르기('GET', '/prd/export?format=docx');
    expect([없음.statusCode, 없음.json()]).toEqual([404, { error: 'NOT_FOUND' }]);
    const 엑셀 = await 부르기('GET', '/prd/export?format=xlsx');
    expect([엑셀.statusCode, 엑셀.json()]).toEqual([404, { error: 'NOT_FOUND' }]);
    const 피디에프 = await 부르기('GET', '/prd/export?format=pdf');
    expect([피디에프.statusCode, 피디에프.json()]).toEqual([400, { error: 'BAD_FORMAT' }]);

    await q(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password) VALUES ($1, 'qa', 'https://qa.xpr.test', 'tester', 'Xpr!secret9')`,
      [서비스],
    );
    await 부르기('PUT', '/prd', { baseVersion: 0, items: [항목('계정 Xpr!secret9 로 담는다')] });
    const r = await 부르기('GET', '/prd/export?format=docx');
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(r.headers['content-disposition']).toBe('attachment; filename="XPR-PRD-v1.docx"');
    const 본문 = await (await JSZip.loadAsync(r.rawPayload)).file('word/document.xml')!.async('string');
    expect(본문).toContain('XPR-REQ-001');
    expect(본문).toContain('계정 •••••• 로 담는다');
    expect(본문).not.toContain('Xpr!secret9');
  });

  it('추적표 엑셀은 요구마다 덮는 케이스를 싣고, 마지막 결과는 실행 read 가 있을 때만 싣는다', async () => {
    await 부르기('PUT', '/prd', { baseVersion: 0, items: [항목('20개까지 담는다'), 항목('비면 안내한다')] });
    for (const tc of 케이스들) {
      await q(
        `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, techniques)
         VALUES ($1, '검사', 'tests/xpr/a.spec.ts', '{}', '{}', '{경계값 분석}')`,
        [tc],
      );
    }
    await q(
      `INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, 'XPR-REQ-001', 'XPR-FN-001', '경계'), ($1, 'XPR-REQ-001', 'XPR-FN-002', '정상')`,
      [서비스],
    );
    const run = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url)
       VALUES ('XPR 실행', 'xpr', 'FINISHED', 'qa', $1, 'XPR', '', 'https://qa.xpr.test') RETURNING run_id`,
      [서비스],
    );
    await q(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at,
                             file_path, param_schema, expected_schema, timeout_ms)
       VALUES ($1, 'XPR-FN-001', 'desktop', '검사', '{}', '{}', 'FAIL', 100, now(), 'tests/xpr/a.spec.ts', '{}', '{}', 300000)`,
      [run.rows[0]!.run_id],
    );

    const 읽기 = async (runs: 'read' | 'none') => {
      const r = await app.inject({ method: 'GET', url: `/api/prd/export?service=${접두사}&format=xlsx`, headers: { 'x-runs': runs } });
      expect(r.statusCode).toBe(200);
      expect(r.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(r.headers['content-disposition']).toMatch(/^attachment; filename="XPR-RTM-v1-\d{4}-\d{2}-\d{2}\.xlsx"$/);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(new Uint8Array(r.rawPayload).buffer);
      const 줄 = (n: number) => (wb.getWorksheet('요구사항 추적표')!.getRow(n).values as unknown[]).slice(1);
      return [줄(2), 줄(3)];
    };
    const [덮임, 안덮임] = await 읽기('read');
    expect(덮임).toEqual(['XPR-REQ-001', '장바구니', '20개까지 담는다', '확정', 2, 'XPR-FN-001\nXPR-FN-002', 1, 1, 0, 0, '경계값 분석 2', '통과 0 · 실패 1 · 미실행 1']);
    expect(안덮임!.slice(4, 6)).toEqual([0, '미작성']);
    const [못봄] = await 읽기('none');
    expect(못봄![11]).toBeUndefined();
  });

  it('요구마다 성능 목표 수와 가장 최근 판정을 싣고, 실행 read 가 없으면 비운다', async () => {
    const 목표 = (reqId: string, verdict?: 'PASS' | 'FAIL') => ({ metric: 'P95', op: '<=', value: 500, source: 'PRD', reqId, ...(verdict === undefined ? {} : { measured: 100, verdict }) });
    const 시나리오 = async (name: string, targets: object[], 지움 = false) => {
      const s = await q<{ id: string }>(`INSERT INTO perf_scenario (service_id, name, created_by, deleted_at) VALUES ($1, $2, 'xpr', ${지움 ? 'now()' : 'NULL'}) RETURNING id`, [서비스, name]);
      await q(`INSERT INTO perf_scenario_version (scenario_id, version, body, source, created_by) VALUES ($1, 1, $2, 'MANUAL', 'xpr')`, [s.rows[0]!.id, JSON.stringify({ targets })]);
      return Number(s.rows[0]!.id);
    };
    const 실행 = async (scenarioId: number, verdict: 'PASS' | 'FAIL', targets: object[]) => {
      const r = await q<{ id: string }>(
        `INSERT INTO perf_run (kind, service_id, scenario_id, scenario_version, env, base_url, test_type, config, status, verdict, targets, origin)
         VALUES ('LOAD', $1, $2, 1, 'qa', 'http://x.test', 'LOAD', '{}', 'DONE', $3, $4, 'MANUAL') RETURNING id`,
        [서비스, scenarioId, verdict, JSON.stringify(targets)],
      );
      return Number(r.rows[0]!.id);
    };
    const 하나 = await 시나리오('목록', [목표('XPR-REQ-001'), 목표('XPR-REQ-001'), 목표('XPR-REQ-002'), { metric: 'ERROR_RATE', op: '<=', value: 1, source: 'AI' }]);
    const 지운 = await 시나리오('지운 것', [목표('XPR-REQ-009')], true);
    await 실행(하나, 'PASS', [목표('XPR-REQ-001', 'PASS'), 목표('XPR-REQ-002', 'PASS')]);
    const 최근 = await 실행(하나, 'FAIL', [목표('XPR-REQ-001', 'PASS'), 목표('XPR-REQ-001', 'FAIL')]);
    await 실행(지운, 'FAIL', [목표('XPR-REQ-009', 'FAIL')]);

    const 읽기 = async (runs: 'read' | 'none') => (await app.inject({ method: 'GET', url: `/api/prd?service=${접두사}`, headers: { 'x-runs': runs } })).json<{ perf: unknown }>().perf;
    expect(await 읽기('read')).toEqual({
      'XPR-REQ-001': { targets: 2, verdict: 'FAIL', runId: 최근 },
      'XPR-REQ-002': { targets: 1, verdict: 'PASS', runId: expect.any(Number) },
    });
    expect(await 읽기('none')).toEqual({});
  });
});
