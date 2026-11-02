// 실패 → BTS 등록 — 보낼 줄 넣기 · 또 실패면 댓글 · 기다리는 등록이면 안 넣음 · 흔들림 건너뛰기 · 카드 bts 칸 · 다시 보내기 (도메인/BTS 「버그 바퀴」)
// DATABASE_URL 이 있을 때만 돈다

import Fastify from 'fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 실패카드 } from '../reporting/failures.js';
import { BTS다시보내기 } from './card.js';
import { 실패등록 } from './failReport.js';
import btsLinkRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('실패 → Issue Bunker 등록', () => {
  let pool: Pool;
  let 프로젝트 = 0;
  let 서비스 = 0;
  let 남의서비스 = 0;
  let 실행차례 = 0;

  async function 실행(service: number, 항목들: { tcId: string; status: 'PASS' | 'FAIL' }[], 붙는실행?: number): Promise<number> {
    실행차례++;
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, build_no, started_at, finished_at,
                             origin, rerun_of)
       VALUES ($1, 'xbf', 'qa', 'FINISHED', $2, 'XBF 마켓', '', '', 'FN', 'abc1234-202610311200',
               now() - interval '1 day' + $3 * interval '1 minute', now() - interval '1 day' + $3 * interval '1 minute' + interval '30 seconds',
               $4, $5)
       RETURNING run_id`,
      [`XBF 실행 ${String(실행차례)}`, service, 실행차례, 붙는실행 === undefined ? 'MANUAL' : 'SINGLE', 붙는실행 ?? null],
    );
    const runId = Number(r.rows[0]!.run_id);
    for (const 항 of 항목들) {
      const h = await pool.query<{ history_id: string }>(
        `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected,
                               param_schema, expected_schema, status, duration_ms, finished_at)
         VALUES ($1, $2, 'desktop', 1, $3, 'xbf/a.spec.ts', 300000, '[]', $4, '{}', $5, '{}', $6, 100, now()) RETURNING history_id`,
        [
          runId,
          항.tcId,
          `${항.tcId} 비밀번호 오류`,
          JSON.stringify({ password: 'XBF-PW-77' }),
          JSON.stringify({ properties: { password: { type: 'string', secret: true } } }),
          항.status,
        ],
      );
      const historyId = Number(h.rows[0]!.history_id);
      await pool.query(
        `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions) VALUES ($1, 1, '가입 화면을 연다', 'PASS', 10, '[]')`,
        [historyId],
      );
      if (항.status === 'FAIL') {
        await pool.query(
          `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions, screenshot_path)
           VALUES ($1, 2, '비밀번호를 넣는다', 'FAIL', 10, $3, $2)`,
          [historyId, `artifacts/runs/${String(runId)}/${String(historyId)}/2.png`, JSON.stringify([{ statement: 'XBF-PW-77 로 들어가면 오류가 보인다', status: 'FAIL', actual: null, expected: '오류' }])],
        );
      }
    }
    return runId;
  }

  const 줄들 = async () =>
    (
      await pool.query<{ kind: string; tc_id: string; issue_key: string | null; state: string; tries: number; run_id: string; payload: Record<string, unknown> }>(
        'SELECT kind, tc_id, issue_key, state, tries, run_id, payload FROM bts_outbox WHERE service_id = $1 ORDER BY id',
        [서비스],
      )
    ).rows;

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    const 만들기 = async (이름: string, 접: string): Promise<[number, number]> => {
      const pid = Number((await pool.query<{ id: string }>('INSERT INTO project (name) VALUES ($1) RETURNING id', [이름])).rows[0]!.id);
      const sid = Number(
        (
          await pool.query<{ id: string }>(
            `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, 'XBF 마켓', '#112233', '', $2, $3) RETURNING id`,
            [접, 접.toLowerCase(), pid],
          )
        ).rows[0]!.id,
      );
      return [pid, sid];
    };
    [프로젝트, 서비스] = await 만들기('XBF 프로젝트', 'XBF');
    [, 남의서비스] = await 만들기('XBFN 프로젝트', 'XBFN');
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.example.com', 'DM', 'pat_xbf', 's', '{}', '{}', 'xbf')`,
      [프로젝트],
    );
  });

  afterAll(async () => {
    // bts_outbox · bts_issue_case 는 service 와, bts_link 는 project 와 같이 지워진다. 남은 애플리케이션이 없는 project 는 트리거가 지운다
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [[서비스, 남의서비스]]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [[서비스, 남의서비스]]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [[서비스, 남의서비스]]);
    await pool.end();
  });

  it('첫 실패는 등록 줄 하나 — 제목 · 본문 · 꼬리표 · 실패 단계 캡처 · 비밀값은 가림 · 통과는 안 올린다', async () => {
    const runId = await 실행(서비스, [
      { tcId: 'XBF-001', status: 'FAIL' },
      { tcId: 'XBF-002', status: 'PASS' },
    ]);
    expect(await 실패등록(runId)).toBe(1);
    const [줄] = await 줄들();
    expect(줄).toMatchObject({ kind: 'CREATE', tc_id: 'XBF-001', state: 'PENDING', run_id: String(runId) });
    expect(줄!.payload).toMatchObject({
      projectKey: 'DM',
      summary: '[XBF 마켓] XBF-001 비밀번호 오류',
      labels: ['QA Hub', '버그 가능성 높음'],
      attachments: [expect.stringMatching(new RegExp(`^runs/${String(runId)}/\\d+/2\\.png$`))],
    });
    expect(줄!.payload).not.toMatchObject({ attachments: [expect.stringContaining('artifacts/')] });
    expect(줄!.payload).toMatchObject({
    });
    const 본문 = 줄!.payload.description as string;
    expect(본문).toContain('2. 비밀번호를 넣는다 ← 여기서 실패');
    expect(본문).toContain('빌드 abc1234-202610311200');
    expect(JSON.stringify(줄!.payload)).not.toContain('XBF-PW-77');

    const 카드 = await 실패카드(runId, 1);
    expect(카드.items[0]!.bts).toEqual({ issueKey: null, url: null, state: 'SENDING', reason: null, resolution: null });
  });

  it('보내기 전에 또 실패하면 새로 안 넣는다 — 카드는 앞 실행의 등록을 보여 준다', async () => {
    const runId = await 실행(서비스, [{ tcId: 'XBF-001', status: 'FAIL' }]);
    expect(await 실패등록(runId)).toBe(0);
    expect((await 줄들()).length).toBe(1);
    expect((await 실패카드(runId, 1)).items[0]!.bts?.state).toBe('SENDING');
  });

  it('열린 이슈가 있으면 댓글만 단다 · 카드는 그 이슈의 SENT 와 고리다 · 앞 등록에 묻힌 실행 카드도 그 이슈를 보인다', async () => {
    await pool.query(`UPDATE bts_outbox SET state = 'SENT', issue_key = 'DM-12' WHERE service_id = $1 AND kind = 'CREATE'`, [서비스]);
    await pool.query(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env) VALUES ($1, 'DM-12', $2, 'XBF-001', 'qa')`, [프로젝트, 서비스]);
    const 묻힌실행 = Number((await pool.query<{ run_id: string }>(`SELECT run_id FROM test_run WHERE title = 'XBF 실행 2'`)).rows[0]!.run_id);
    expect((await 실패카드(묻힌실행, 1)).items[0]!.bts).toMatchObject({ state: 'SENT', issueKey: 'DM-12' });
    const runId = await 실행(서비스, [{ tcId: 'XBF-001', status: 'FAIL' }]);
    expect(await 실패등록(runId)).toBe(1);
    const 댓글 = (await 줄들()).at(-1)!;
    expect(댓글).toMatchObject({ kind: 'COMMENT', issue_key: 'DM-12' });
    expect(댓글.payload.body as string).toContain(`Test Commander 실행 #${String(runId)} 에서 또 실패했습니다`);
    expect((await 실패카드(runId, 1)).items[0]!.bts).toEqual({
      issueKey: 'DM-12',
      url: 'https://bts.example.com/issues/DM-12',
      state: 'SENT',
      reason: null,
      resolution: null,
    });
  });

  it('흔들림으로 닫힌 테스트는 올리지 않는다 · 카드 칸은 null', async () => {
    await pool.query(`UPDATE bts_issue_case SET closed_at = now(), resolution = 'FLAKY' WHERE service_id = $1`, [서비스]);
    const 앞 = (await 줄들()).length;
    const runId = await 실행(서비스, [{ tcId: 'XBF-001', status: 'FAIL' }]);
    expect(await 실패등록(runId)).toBe(0);
    expect((await 줄들()).length).toBe(앞);
    expect((await 실패카드(runId, 1)).items[0]!.bts).toBeNull();
  });

  it('흔들림으로 닫힌 뒤 그 케이스를 쓴 작성이 병합되면 다음 실패부터 다시 올린다 — 닫히기 전 병합 · 다른 케이스 병합은 안 푼다', async () => {
    const 병합 = async (tcId: string, 언제: string): Promise<void> => {
      const 작성 = await pool.query<{ id: string }>(
        `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, result, finished_at)
         VALUES ($1, 'AUTHOR', '{}', 'xbf', 'xbf', 'DONE', $2, now()) RETURNING id`,
        [서비스, JSON.stringify({ cases: [{ tcId }] })],
      );
      await pool.query(
        `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, finished_at)
         VALUES ($1, 'MERGE', $2, '{}', 'xbf', 'xbf', 'DONE', now() + $3::interval)`,
        [서비스, 작성.rows[0]!.id, 언제],
      );
    };
    await 병합('XBF-001', '-1 hour');
    await 병합('XBF-009', '1 minute');
    const 앞실행 = await 실행(서비스, [{ tcId: 'XBF-001', status: 'FAIL' }]);
    expect(await 실패등록(앞실행)).toBe(0);
    await 병합('XBF-001', '1 minute');
    const runId = await 실행(서비스, [{ tcId: 'XBF-001', status: 'FAIL' }]);
    expect(await 실패등록(runId)).toBe(1);
    expect((await 줄들()).at(-1)).toMatchObject({ kind: 'CREATE', tc_id: 'XBF-001', run_id: String(runId) });
  });

  it('그만둔 등록은 카드에 까닭이 뜨고 [다시 보내기]가 횟수 0 으로 다시 세운다', async () => {
    const runId = await 실행(서비스, [{ tcId: 'XBF-003', status: 'FAIL' }]);
    expect(await 실패등록(runId)).toBe(1);
    await pool.query(
      `UPDATE bts_outbox SET state = 'GAVE_UP', tries = 1, last_error = '권한 없음 — QA Hub AI 열쇠를 확인하세요 (403)' WHERE run_id = $1`,
      [runId],
    );
    expect((await 실패카드(runId, 1)).items[0]!.bts).toMatchObject({ state: 'GAVE_UP', reason: '권한 없음 — QA Hub AI 열쇠를 확인하세요 (403)' });
    const app = Fastify();
    await app.register(btsLinkRoutes, { prefix: '/api' });
    try {
      const 보내기 = (몸: unknown) => app.inject({ method: 'POST', url: `/api/runs/${String(runId)}/bts/resend`, payload: 몸 as object });
      expect((await 보내기({ tcId: 'XBF-003' })).statusCode).toBe(400);
      expect((await 보내기({ tcId: 'XBF-003', env: 'qa' })).statusCode).toBe(202);
      expect((await 보내기({ tcId: 'XBF-999', env: 'qa' })).statusCode).toBe(404);
    } finally {
      await app.close();
    }
    expect((await 줄들()).at(-1)).toMatchObject({ state: 'PENDING', tries: 0 });
  });

  it('그사이 같은 테스트의 이슈가 열렸으면 [다시 보내기]가 다시 세우지 않고 카드는 그 이슈를 보인다', async () => {
    const runId = await 실행(서비스, [{ tcId: 'XBF-004', status: 'FAIL' }]);
    expect(await 실패등록(runId)).toBe(1);
    await pool.query(`UPDATE bts_outbox SET state = 'GAVE_UP', last_error = '까닭' WHERE run_id = $1`, [runId]);
    await pool.query(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env) VALUES ($1, 'DM-40', $2, 'XBF-004', 'qa')`, [프로젝트, 서비스]);
    expect(await BTS다시보내기(runId, 'XBF-004', 'qa')).toBe('OK');
    expect((await 줄들()).at(-1)).toMatchObject({ state: 'GAVE_UP' });
    expect((await 실패카드(runId, 1)).items[0]!.bts).toMatchObject({ state: 'SENT', issueKey: 'DM-40' });
  });

  it('한 건 실행은 붙는 실행의 카드로 그 한 건만 올리고 줄도 붙는 실행에 단다', async () => {
    const 부모 = await 실행(서비스, [
      { tcId: 'XBF-005', status: 'PASS' },
      { tcId: 'XBF-006', status: 'PASS' },
    ]);
    expect(await 실패등록(부모)).toBe(0);
    const 한건 = await 실행(서비스, [{ tcId: 'XBF-005', status: 'FAIL' }], 부모);
    expect(await 실패등록(한건)).toBe(1);
    expect((await 줄들()).at(-1)).toMatchObject({ kind: 'CREATE', tc_id: 'XBF-005', run_id: String(부모) });
    expect((await 실패카드(부모, 1)).items.map((c) => [c.tcId, c.bts?.state])).toEqual([['XBF-005', 'SENDING']]);
  });

  it('테스트 문제 · 화면이 맞음으로 닫힌 테스트도 고친 작성이 병합될 때까지 올리지 않는다 — 환경 문제는 다시 올린다', async () => {
    for (const [tcId, 사유, 넣음] of [['XBF-007', 'TEST_PROBLEM', 0], ['XBF-008', 'SCREEN_RIGHT', 0], ['XBF-010', 'ENV', 1]] as const) {
      await pool.query(
        `INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, closed_at, resolution) VALUES ($1, $2, $3, $4, 'qa', now(), $5)`,
        [프로젝트, `DM-${tcId}`, 서비스, tcId, 사유],
      );
      expect(await 실패등록(await 실행(서비스, [{ tcId, status: 'FAIL' }]))).toBe(넣음);
    }
  });

  it('BTS 를 안 이은 프로젝트는 줄을 안 넣고 카드에 bts 칸이 없다', async () => {
    const runId = await 실행(남의서비스, [{ tcId: 'XBFN-001', status: 'FAIL' }]);
    expect(await 실패등록(runId)).toBe(0);
    expect('bts' in (await 실패카드(runId, 1)).items[0]!).toBe(false);
    expect(await BTS다시보내기(runId, 'XBFN-001', 'qa')).toBe('NOT_LINKED');
  });
});
