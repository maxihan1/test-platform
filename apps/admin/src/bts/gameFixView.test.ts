// 게임 실패 자동 수정(issue_key 없는 bts_test_fix 줄)의 표시 재료 — 목록 · 서랍 · 실패 카드 · 결정 목록 · 작성 목록 요약 · 조작 맵 팝업 거절 · 실패 자료 (도메인/게임 §3.10 「실패 자동 수정」 3 · 7)
// DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 목록요약들 } from '../authoring/listSummary.js';
import { 결정목록읽기 } from '../authoring/decisions.js';
import prdAgentRoutes from '../prd/agentRoutes.js';
import { 게임실패자료 } from '../prd/gameFailData.js';
import { 고침이팝업을올렸나 } from '../prd/gameRoute.js';
import { 실패카드 } from '../reporting/failures.js';
import { 카드자동수정중들 } from './gameFixView.js';
import { 자동수정목록, 자동수정상세읽기, 자동수정실행빼기, 자동수정케이스들, 카드자동수정들 } from './testFixView.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XQY';
const 에이전트 = 'xqy-agent';
const 수정중 = 'XQY-FN-001';
const 사람확인 = 'XQY-FN-002';
const 실패끝 = 'XQY-FN-003';
const 통과 = 'XQY-FN-004';
const 흔들림 = 'XQY-FN-005';
const 다시실패 = 'XQY-FN-006';
const 미실행 = 'XQY-FN-007';
const 케이스들 = [수정중, 사람확인, 실패끝, 통과, 흔들림, 다시실패, 미실행];

describe('고침이팝업을올렸나', () => {
  const 행 = (kind: 'MOVE' | 'POPUP') => ({ kind, fromKey: 'a', action: 'b', toKey: null, helper: null, durationMs: null, warning: null, fields: null, status: 'OK' as const, reason: null, buildNo: null });
  it('testFix 가 있는 요청이 팝업 행을 올리면 그 자리를 돌려주고 다른 행 · 다른 요청은 받는다', () => {
    expect(고침이팝업을올렸나({ testFix: { auto: true } }, [행('MOVE'), 행('POPUP')])).toEqual({ error: 'BAD_ROUTE', detail: 'rows.1.kind' });
    expect(고침이팝업을올렸나({ testFix: { issueKey: 'MQA-1' } }, [행('POPUP')])).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.kind' });
    expect(고침이팝업을올렸나({ testFix: { auto: true } }, [행('MOVE')])).toBeNull();
    expect(고침이팝업을올렸나({}, [행('POPUP')])).toBeNull();
  });
});

describe.skipIf(연결 === undefined)('게임 실패 자동 수정 표시', () => {
  let pool: Pool;
  let app: FastifyInstance;
  let 프로젝트 = 0;
  let 서비스 = 0;
  let 처음 = 0;
  let 한건 = 0;
  let 요청 = 0;
  let 다른처음 = 0;
  let 다시 = 0;
  let 미실행런 = 0;
  const 원래 = process.env.AUTHORING_AGENT_USER;

  const 실행넣기 = async (항목: { tcId: string; status: string }[], rerunOf: number | null = null, origin: string = rerunOf === null ? 'MANUAL' : 'SINGLE') => {
    const runId = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url, rerun_of, origin, kind, finished_at)
           VALUES ('XQY 실행', 'xqy', 'FINISHED', 'qa', $1, 'XQY', '', 'https://qa.xqy.test', $2, $3, 'FN', now()) RETURNING run_id`,
          [서비스, rerunOf, origin],
        )
      ).rows[0]!.run_id,
    );
    for (const i of 항목) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at, file_path, param_schema, expected_schema, timeout_ms)
         VALUES ($1, $2, 'android', '검사', '{}', '{}', $3, 100, now(), 'tests/xqy/a.spec.ts', '{}', '{}', 300000)`,
        [runId, i.tcId, i.status],
      );
    }
    return runId;
  };
  const 줄넣기 = (tcId: string, state: string, 더: { pr?: string; why?: string[]; rerun?: number; reason?: string; request?: number } = {}) =>
    pool.query(
      `INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, failed_run, request_id, pr_url, rerun_id, state, reason, failure, person_why)
       VALUES ($1, NULL, $2, $3, 'qa', $4, $5, $6, $7, $8, $9, 'notFound', $10)`,
      [프로젝트, 서비스, tcId, 처음, 더.request ?? null, 더.pr ?? null, 더.rerun ?? null, state, 더.reason ?? null, 더.why ?? []],
    );
  const 요청세우기 = async (params: object) =>
    Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by, started_at)
           VALUES ($1, 'AUTHOR', $2, 'agent', 'Agent', 'RUNNING', $3, now()) RETURNING id`,
          [서비스, JSON.stringify(params), 에이전트],
        )
      ).rows[0]!.id,
    );

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQY 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind, game_platform) VALUES ('XQY', 'XQY', '#112233', '', 'xqy', $1, 'GAME', 'android') RETURNING id`,
          [프로젝트],
        )
      ).rows[0]!.id,
    );
    for (const tc of 케이스들) {
      await pool.query(`INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active) VALUES ($1, '검사', 'tests/xqy/a.spec.ts', '{}', '{}', true)`, [tc]);
      if (tc !== 미실행) await pool.query(`INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, 'XQY-REQ-001', $2, '정상')`, [서비스, tc]);
    }
    await pool.query(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 1, $2, 1, 'PERSON', 'xqy', '검사')`,
      [서비스, JSON.stringify([{ reqId: 'XQY-REQ-001', feature: '던전', text: '던전에 들어간다', basis: [{ from: '기획서.docx', quote: '입장' }], status: 'CONFIRMED' }])],
    );
    처음 = await 실행넣기(케이스들.map((tcId) => ({ tcId, status: 'FAIL' })));
    한건 = await 실행넣기([{ tcId: 통과, status: 'PASS' }], 처음);
    요청 = await 요청세우기({ testFix: { auto: true, cases: [{ runId: 처음, tcId: 수정중, env: 'qa', failure: 'notFound' }], note: '' } });
    await 줄넣기(수정중, 'FIXING', { request: 요청 });
    await 줄넣기(사람확인, 'WAIT_MERGE', { pr: 'https://github.com/o/r/pull/9', why: ['확인 문장이 줄었어요'], request: 요청 });
    await 줄넣기(실패끝, 'FAILED', { pr: 'https://github.com/o/r/pull/10', reason: '다시 실행에서도 실패했어요' });
    await 줄넣기(통과, 'PASSED', { pr: 'https://github.com/o/r/pull/11', rerun: 한건, request: 요청 });
    await 줄넣기(흔들림, 'FLAKY');
    다른처음 = await 실행넣기([{ tcId: 다시실패, status: 'FAIL' }]);
    다시 = await 실행넣기([{ tcId: 다시실패, status: 'FAIL' }], 다른처음, 'RERUN');
    await pool.query(
      `INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, failed_run, rerun_id, state, reason, failure) VALUES ($1, NULL, $2, $3, 'qa', $4, $5, 'FAILED', '고친 뒤에도 실패했어요', 'notFound')`,
      [프로젝트, 서비스, 다시실패, 다른처음, 다시],
    );
    await pool.query(
      `INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, failed_run, state, failure) VALUES ($1, NULL, $2, $3, 'qa', $4, 'PASSED', 'notFound')`,
      [프로젝트, 서비스, 실패끝, 다른처음],
    );
    미실행런 = await 실행넣기([{ tcId: 미실행, status: 'NA' }]);
    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, error)
       SELECT history_id, 1, '던전 입구를 누른다', 'FAIL', 10, '{"message":"요소를 찾지 못했습니다"}' FROM run_item WHERE run_id = $1 AND tc_id = $2`,
      [처음, 수정중],
    );

    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 에이전트, displayName: '작성 에이전트', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(prdAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.query('DELETE FROM bts_test_fix WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1 AND rerun_of IS NOT NULL', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await pool.query('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM game_route WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.end();
    if (원래 === undefined) delete process.env.AUTHORING_AGENT_USER;
    else process.env.AUTHORING_AGENT_USER = 원래;
  });

  it('BTS 연결이 없어도 목록 · 서랍이 게임 줄을 읽는다 — 이슈 키 · 주소는 null 이고 사람 확인 까닭이 붙는다', async () => {
    const 목록 = await 자동수정목록(접두사);
    expect(목록.get(수정중)).toMatchObject({ issueKey: null, state: 'FIXING' });
    expect(목록.get(흔들림)).toMatchObject({ issueKey: null, state: 'FLAKY' });

    const 상세 = await 자동수정상세읽기(사람확인);
    expect(상세).toMatchObject({
      issueKey: null, issueUrl: null, state: 'WAIT_MERGE', failedRun: 처음, failure: 'notFound', requestId: 요청,
      personWhy: ['확인 문장이 줄었어요'], needsPerson: true, prUrl: 'https://github.com/o/r/pull/9',
    });
    expect((await 자동수정상세읽기(수정중))?.needsPerson).toBe(false);
  });

  it('통과한 줄은 「수정 후 통과」 카드 재료이고 그 다시 실행은 실행 목록 · 카드에서 빠진다', async () => {
    const 카드 = (await 카드자동수정들(처음)).get(통과);
    expect(카드).toMatchObject({ issueKey: null, issueUrl: null, requestId: 요청, rerunId: 처음, prUrl: 'https://github.com/o/r/pull/11' });
    expect((await 자동수정케이스들([처음])).get(처음)).toEqual([통과]);
    const 남음 = await pool.query<{ n: string }>(`SELECT count(*) AS n FROM test_run sr WHERE sr.run_id = $1 ${자동수정실행빼기}`, [한건]);
    expect(Number(남음.rows[0]!.n)).toBe(0);
  });

  it('통과 못 한 가장 늦은 줄은 카드 자동수정중 꼴로 나온다 — 통과한 줄은 들지 않는다', async () => {
    const 중 = await 카드자동수정중들(처음);
    expect([...중.keys()].sort()).toEqual([수정중, 사람확인, 실패끝, 흔들림].sort());
    expect(중.get(수정중)).toMatchObject({ state: 'FIXING', requestId: 요청, needsPerson: false, personWhy: [] });
    expect(중.get(사람확인)).toMatchObject({ state: 'WAIT_MERGE', needsPerson: true, personWhy: ['확인 문장이 줄었어요'], prUrl: 'https://github.com/o/r/pull/9' });
    expect(중.get(실패끝)).toMatchObject({ state: 'FAILED', reason: '다시 실행에서도 실패했어요' });
  });

  it('실패 카드 응답이 autoFixing 을 싣고 자동 수정 탭 집계에는 통과한 카드만 센다', async () => {
    const 쪽 = await 실패카드(처음, 1);
    const 카드 = (tcId: string) => 쪽.items.find((c) => c.tcId === tcId);
    expect(카드(수정중)?.autoFixing).toMatchObject({ state: 'FIXING' });
    expect(카드(실패끝)?.autoFixing).toMatchObject({ state: 'FAILED' });
    expect(카드(통과)?.autoFix).toMatchObject({ issueKey: null, requestId: 요청 });
    expect(카드(통과)?.autoFixing).toBeNull();
    expect(쪽.autoFixCount).toBe(1);
  });

  it('결정 목록 — 도는 줄 · 통과한 줄의 실패 항목은 빠지고 끝난 줄(실패 · 흔들림)은 autoFix 를 달고 선다', async () => {
    const 목록 = await 결정목록읽기(서비스, { admin: true, 작성쓰기: true, 실행읽기: true, 실행쓰기: true });
    const 실패들 = 목록.items.flatMap((x) => (x.kind === 'FAIL' ? [x] : []));
    expect(실패들.map((x) => x.tcId).sort()).toEqual([실패끝, 흔들림, 다시실패].sort());
    expect(실패들.find((x) => x.tcId === 실패끝)?.autoFix).toMatchObject({ state: 'FAILED', prUrl: 'https://github.com/o/r/pull/10', reason: '다시 실행에서도 실패했어요' });
    expect(실패들.find((x) => x.tcId === 흔들림)?.autoFix).toMatchObject({ state: 'FLAKY', prUrl: null });
  });

  it('결정 목록 — 같은 케이스의 뒤 실행 줄이 앞 실행 항목의 표시를 지우지 않고, 다시 실행(RERUN 새 실행)에서 실패한 항목에도 autoFix 가 붙는다', async () => {
    const 목록 = await 결정목록읽기(서비스, { admin: true, 작성쓰기: true, 실행읽기: true, 실행쓰기: true });
    const 실패들 = 목록.items.flatMap((x) => (x.kind === 'FAIL' ? [x] : []));
    expect(실패들.find((x) => x.tcId === 실패끝)?.autoFix).toMatchObject({ state: 'FAILED', prUrl: 'https://github.com/o/r/pull/10' });
    const 항목 = 실패들.find((x) => x.tcId === 다시실패);
    expect(항목?.runId).toBe(다시);
    expect(항목?.autoFix).toMatchObject({ state: 'FAILED', reason: '고친 뒤에도 실패했어요', rerunId: 다시 });
  });

  it('작성 목록 요약 — 게임 고침 요청은 시작한 곳이 AUTO 이고 대상 케이스가 선다', async () => {
    const 표 = await 목록요약들(서비스, [요청]);
    expect(표.get(요청)).toMatchObject({ kind: 'TEST_FIX', from: { by: 'AUTO' }, what: { tcIds: [수정중] } });
  });

  it('조작 맵 올리기 — 게임 고침 요청은 돌발 팝업 행을 거절하고 다른 행 · 일반 요청의 팝업은 받는다', async () => {
    const 팝업 = { kind: 'POPUP', fromKey: 'game:Main/Canvas/Invite', action: '/Canvas/Invite/Decline', status: 'OK' };
    const 이동 = { kind: 'MOVE', fromKey: 'zone:Dungeon', action: '적 누르기', status: 'OK' };
    const 올리기 = (id: number, rows: object[]) => app.inject({ method: 'PUT', url: `/api/authoring/requests/${String(id)}/game-route`, payload: { rows } });

    const 거절 = await 올리기(요청, [이동, 팝업]);
    expect([거절.statusCode, 거절.json()]).toEqual([400, { error: 'BAD_ROUTE', detail: 'rows.1.kind' }]);
    expect((await 올리기(요청, [이동])).statusCode).toBe(204);

    const 일반 = await 요청세우기({});
    expect((await 올리기(일반, [팝업])).statusCode).toBe(204);
  });

  it('에이전트 실패 자료 — 실패한 절차 · 오류 원문을 주고 파일이 없으면 null, 미실행(NA)만 있어도 주고, 실패 항목이 없으면 NO_TRACE', async () => {
    const 자료 = await 게임실패자료(서비스, 처음, 수정중);
    expect(자료).toEqual({
      summary: ['실패한 절차: 던전 입구를 누른다', '오류: 요소를 찾지 못했습니다'],
      game: { step: '던전 입구를 누른다', error: '요소를 찾지 못했습니다', tree: null, errors: null },
    });
    expect(await 게임실패자료(서비스, 한건, 통과)).toMatchObject({ error: 'NO_TRACE' });
    expect(await 게임실패자료(서비스, 미실행런, 미실행)).toHaveProperty('game');
  });
});
