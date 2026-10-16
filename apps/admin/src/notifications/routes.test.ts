// 알림 통로 — 권한으로 서비스 거르기 · 최근 7일 · 뿌리 번호 · PRD 확인 필요 수 (DB 접속이 있을 때만 돈다)
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { 서비스권한 } from '../auth/permissions.js';
import type { NoticeRecent, NoticeRunning } from './store.js';
import notificationRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = ['XNT', 'XNTB', 'XNTC'] as const;

describe.skipIf(연결 === undefined)('알림 통로', () => {
  let app: FastifyInstance;
  const 서비스: Record<string, number> = {};
  // 요청마다 이 값이 로그인한 사람의 배정이 된다
  let 배정: Record<string, 서비스권한> = {};

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  async function 실행(서비스접두사: string, 칸: { title: string; status?: string; 끝난일전?: number; kind?: string; 항목?: { 끝남: boolean; ms?: number }[] }): Promise<number> {
    const 상태 = 칸.status ?? (칸.끝난일전 === undefined ? 'RUNNING' : 'FINISHED');
    // 시나리오 실행은 칸 짝 CHECK 때문에 시나리오 버전이 있어야 한다
    let 시나리오: string | null = null;
    if (칸.kind === 'SCENARIO') {
      시나리오 = (await q<{ id: string }>(`INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XNT 흐름', 'xnt') RETURNING id`, [서비스[서비스접두사]])).rows[0]!.id;
      await q(`INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, '[]', 'xnt', '검사')`, [시나리오]);
    }
    const r = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, service_id, service_name, tests_repo, triggered_by, env, base_url, status, kind, started_at, finished_at,
                             scenario_id, scenario_version)
       VALUES ($1, $2, $3, '', 'xnt', 'qa', 'https://qa.example.com', $4, $5,
               now() - make_interval(days => COALESCE($6::int, 0), hours => 1),
               CASE WHEN $6::int IS NULL THEN NULL ELSE now() - make_interval(days => $6::int) END,
               $7, CASE WHEN $7::bigint IS NULL THEN NULL ELSE 1 END)
       RETURNING run_id`,
      [칸.title, 서비스[서비스접두사], 서비스접두사, 상태, 칸.kind ?? 'FN', 칸.끝난일전 ?? null, 시나리오],
    );
    const runId = Number(r.rows[0]!.run_id);
    for (const [i, 항목] of (칸.항목 ?? []).entries()) {
      await q(
        `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                               precondition, params, expected, param_schema, expected_schema, status, duration_ms, finished_at)
         VALUES ($1, $2, 'desktop', 1, $2, 'xnt.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', $3, $4, CASE WHEN $5::boolean THEN now() ELSE NULL END)`,
        [runId, `${서비스접두사}-${String(i + 1).padStart(3, '0')}`, 항목.끝남 ? 'PASS' : 'NA', 항목.ms ?? null, 항목.끝남],
      );
    }
    return runId;
  }

  async function 작성(
    서비스접두사: string,
    칸: { status: string; kind?: string; sourceId?: number; 끝난일전?: number; progress?: object; prUrl?: string; error?: string; 폐기?: boolean; stage?: string; params?: object },
  ): Promise<number> {
    const 끝남 = ['DONE', 'FAILED', 'STOPPED'].includes(칸.status);
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, requested_by, requested_by_name, status, stage,
                                      started_at, finished_at, progress, pr_url, error, discarded_at, stop_reason, stopped_by, params)
       VALUES ($1, $2, $3, 'xnt', 'XNT 검사', $4, $5,
               CASE WHEN $4 = 'PENDING' THEN NULL ELSE now() - make_interval(days => COALESCE($6::int, 0), mins => 30) END,
               CASE WHEN $7::boolean THEN now() - make_interval(days => COALESCE($6::int, 0)) ELSE NULL END,
               $8::jsonb, $9, $10, CASE WHEN $11::boolean THEN now() ELSE NULL END,
               CASE WHEN $4 = 'STOPPED' THEN 'USER' ELSE NULL END, CASE WHEN $4 = 'STOPPED' THEN 'xnt' ELSE NULL END,
               COALESCE($12::jsonb, '{}'::jsonb))
       RETURNING id`,
      [
        서비스[서비스접두사],
        칸.kind ?? 'AUTHOR',
        칸.sourceId ?? null,
        칸.status,
        칸.stage ?? null,
        칸.끝난일전 ?? null,
        끝남,
        칸.progress === undefined ? null : JSON.stringify(칸.progress),
        칸.prUrl ?? null,
        칸.error ?? null,
        칸.폐기 === true,
        칸.params === undefined ? null : JSON.stringify(칸.params),
      ],
    );
    return Number(r.rows[0]!.id);
  }

  async function 판(서비스접두사: string, 상태들: ('CONFIRMED' | 'NEEDS_CHECK')[]): Promise<void> {
    const items = 상태들.map((status, i) => ({
      reqId: `${서비스접두사}-REQ-${String(i + 1).padStart(3, '0')}`,
      feature: '로그인',
      text: '규칙',
      basis: [],
      status,
      ...(status === 'NEEDS_CHECK' ? { checkSince: '2026-10-01T00:00:00.000Z' } : {}),
    }));
    await q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name)
       VALUES ($1, 1, $2::jsonb, $3, 'PERSON', 'xnt', 'XNT 검사')`,
      [서비스[서비스접두사], JSON.stringify(items), items.length],
    );
  }

  const 치우기 = async () => {
    const ids = 접두사.map((p) => 서비스[p]);
    await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [ids]);
    await q('DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [ids]);
    await q('DELETE FROM test_run WHERE service_id = ANY($1)', [ids]);
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1))', [ids]);
    await q('DELETE FROM scenario WHERE service_id = ANY($1)', [ids]);
    await q('DELETE FROM prd_version WHERE service_id = ANY($1)', [ids]);
    await q('DELETE FROM authoring_request WHERE service_id = ANY($1)', [ids]);
  };

  const 알림 = async () =>
    (await app.inject({ method: 'GET', url: '/api/notifications' })).json<{ running: NoticeRunning[]; recent: NoticeRecent[] }>();

  const 모두: 서비스권한 = { cases: 'write', runs: 'write', authoring: 'write' };

  beforeAll(async () => {
    for (const p of 접두사) {
      const r = await q<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
              VALUES ($1, $2, '#3A5FCD', '', 'xnt')
         ON CONFLICT (prefix) DO UPDATE SET is_active = true
           RETURNING id`,
        [p, `${p} 서비스`],
      );
      서비스[p] = Number(r.rows[0]!.id);
    }
    await 치우기();

    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = {
        username: 'xnt',
        displayName: 'XNT 검사',
        role: 'member' as const,
        dashboard: 'read' as const,
        mustChangePassword: false,
        services: Object.entries(배정).map(([prefix, permissions]) => ({
          id: 서비스[prefix]!,
          prefix,
          name: `${prefix} 서비스`,
          color: '#3A5FCD',
          envs: [],
          testsDir: 'xnt',
          permissions,
        })) as never,
      };
    });
    await app.register(notificationRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = ANY($1)', [접두사.map((p) => 서비스[p])]);
    await app.close();
  });

  it('실행은 실행 칸이, 작성 요청은 작성 칸이 read 이상인 서비스만 담고 배정 밖 서비스는 안 섞인다', async () => {
    await 치우기();
    const 가실행 = await 실행('XNT', { title: 'XNT 가 실행' });
    await 실행('XNTB', { title: 'XNTB 실행' });
    await 실행('XNTC', { title: 'XNTC 실행' });
    await 작성('XNT', { status: 'RUNNING' });
    const 나작성 = await 작성('XNTB', { status: 'PENDING' });
    await 작성('XNTC', { status: 'RUNNING' });
    await 실행('XNT', { title: 'XNT 끝난 실행', 끝난일전: 1 });
    await 작성('XNTB', { status: 'DONE', 끝난일전: 1, kind: 'AUTHOR' });
    await 작성('XNT', { status: 'FAILED', 끝난일전: 1 });

    // 가: 실행만 읽고 작성은 못 읽는다. 나: 작성만 읽는다. 다는 배정 밖
    배정 = {
      XNT: { cases: 'none', runs: 'read', authoring: 'none' },
      XNTB: { cases: 'none', runs: 'none', authoring: 'read' },
    };
    const { running, recent } = await 알림();

    expect(running.map((n) => [n.kind, n.prefix])).toEqual([
      ['run', 'XNT'],
      ['authoring', 'XNTB'],
    ]);
    expect(running[0]).toMatchObject({ kind: 'run', runId: 가실행, serviceName: 'XNT 서비스', serviceId: 서비스.XNT });
    expect(running[1]).toMatchObject({ kind: 'authoring', requestId: 나작성, status: 'PENDING', startedAt: null });
    expect(recent.map((n) => [n.kind, n.prefix]).sort()).toEqual([
      ['authoring', 'XNTB'],
      ['run', 'XNT'],
    ]);
  });

  it('최근 7일 안에 끝난 것만 담고 새것 먼저이며 폐기한 요청은 뺀다. 실행 종류는 가리지 않는다', async () => {
    await 치우기();
    const 여섯째날 = await 실행('XNT', { title: 'XNT 6일 전', 끝난일전: 6, kind: 'UI' });
    await 실행('XNT', { title: 'XNT 8일 전', 끝난일전: 8 });
    const 어제 = await 실행('XNT', { title: 'XNT 어제', 끝난일전: 1, kind: 'FN', status: 'ABORTED' });
    await 작성('XNT', { status: 'DONE', 끝난일전: 8 });
    await 작성('XNT', { status: 'DONE', 끝난일전: 2, 폐기: true });
    const 이틀전 = await 작성('XNT', { status: 'STOPPED', 끝난일전: 2 });

    배정 = { XNT: 모두 };
    const { recent } = await 알림();

    expect(recent.map((n) => (n.kind === 'run' ? `run ${n.runId}` : `authoring ${n.requestId}`))).toEqual([
      `run ${어제}`,
      `authoring ${이틀전}`,
      `run ${여섯째날}`,
    ]);
    expect(recent[0]).toMatchObject({ kind: 'run', status: 'ABORTED' });
  });

  it('도는 실행은 항목 수 · 끝난 수 · 남은 시간을 싣는다', async () => {
    await 치우기();
    await 실행('XNT', { title: 'XNT 도는 실행', 항목: [{ 끝남: true, ms: 1000 }, { 끝남: false }, { 끝남: false }] });

    배정 = { XNT: 모두 };
    const { running } = await 알림();

    expect(running[0]).toMatchObject({ kind: 'run', total: 3, done: 1, counts: { total: 3, pass: 1, running: 2 } });
    // 지난 기록이 없어 이번에 끝난 평균 1000 으로 둘을 채운다 — (1000 + 1000) ÷ min(동시 2, 안 끝난 2)
    // 기준 시각(끝난 항목의 시각)이 방금이라 흐른 시간만큼만 줄어든다
    const 남은 = (running[0] as { remainingMs: number | null }).remainingMs!;
    expect(남은).toBeLessThanOrEqual(1000);
    expect(남은).toBeGreaterThan(0);
  });

  it('작성 요청 번호는 뿌리이고 같은 뿌리의 여러 실행은 가장 최근 것 하나로 나온다', async () => {
    await 치우기();
    const 뿌리 = await 작성('XNT', { status: 'FAILED', 끝난일전: 3, error: '첫 줄 오류\n둘째 줄' });
    await 작성('XNT', { status: 'DONE', kind: 'RERUN', sourceId: 뿌리, 끝난일전: 1, progress: { caseFiles: 7 }, prUrl: 'https://github.com/acme/xnt/pull/1' });

    배정 = { XNT: 모두 };
    const { recent } = await 알림();

    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({
      kind: 'authoring',
      requestId: 뿌리,
      title: '테스트 작성',
      status: 'DONE',
      caseFiles: 7,
      prUrl: 'https://github.com/acme/xnt/pull/1',
      error: null,
    });
  });

  it('실패한 요청은 오류 첫 줄만 싣고 PRD 가 없으면 확인 필요는 0 이다', async () => {
    await 치우기();
    await 작성('XNT', { status: 'FAILED', 끝난일전: 1, error: '첫 줄 오류\n둘째 줄' });

    배정 = { XNT: 모두 };
    const { recent } = await 알림();

    expect(recent[0]).toMatchObject({ error: '첫 줄 오류', prdNeedsCheck: 0, caseFiles: null });
  });

  it('prdNeedsCheck 는 그 서비스 지금 PRD 의 확인 필요 수이다', async () => {
    await 치우기();
    await 판('XNT', ['CONFIRMED', 'NEEDS_CHECK', 'NEEDS_CHECK']);
    await 작성('XNT', { status: 'DONE', 끝난일전: 1 });
    await 작성('XNT', { status: 'DONE', 끝난일전: 2 });

    배정 = { XNT: 모두 };
    const { recent } = await 알림();

    expect(recent.map((n) => (n.kind === 'authoring' ? n.prdNeedsCheck : -1))).toEqual([2, 2]);
  });

  it('도는 작성 요청은 같은 서비스의 끝난 작성 소요로 예상을 싣는다', async () => {
    await 치우기();
    await 작성('XNT', { status: 'DONE', 끝난일전: 1 });
    await 작성('XNT', { status: 'RUNNING', stage: 'generate' });

    배정 = { XNT: 모두 };
    const { running } = await 알림();

    expect(running[0]).toMatchObject({ kind: 'authoring', status: 'RUNNING', stage: 'generate', expected: { ms: 30 * 60_000, samples: 1 } });
  });

  it('도는 E2E 시나리오 실행은 단계 수와 함께 따로 담고 끝난 것은 안 담는다 — 끝난 것은 항목이 없어 「0 통과」라는 거짓 줄이 된다', async () => {
    await 치우기();
    const 케이스 = await 실행('XNT', { title: 'XNT 케이스 실행', kind: 'UI' });
    const 시나리오 = await 실행('XNT', { title: 'XNT 시나리오 실행', kind: 'SCENARIO' });
    for (const seq of [1, 2]) {
      await q(`INSERT INTO scenario_run_part (run_id, seq, kind, part, status) VALUES ($1, $2, 'wait', '{}', 'NA')`, [시나리오, seq]);
    }
    const 끝난케이스 = await 실행('XNT', { title: 'XNT 끝난 케이스', kind: 'FN', 끝난일전: 1 });
    await 실행('XNT', { title: 'XNT 끝난 시나리오', kind: 'SCENARIO', 끝난일전: 1 });

    배정 = { XNT: 모두 };
    const { running, recent } = await 알림();

    expect(running.map((n) => n.kind)).toEqual(['run', 'scenario']);
    expect(running[0]).toMatchObject({ kind: 'run', runId: 케이스 });
    expect(running[1]).toMatchObject({ kind: 'scenario', runId: 시나리오, title: 'XNT 시나리오 실행', parts: 2, prefix: 'XNT' });
    expect(recent.map((n) => (n.kind === 'run' ? n.runId : -1))).toEqual([끝난케이스]);
  });

  it('도는 E2E 실행도 실행 칸이 read 인 서비스만 담는다', async () => {
    await 치우기();
    await 실행('XNT', { title: 'XNT 시나리오 실행', kind: 'SCENARIO' });

    배정 = { XNT: { cases: 'write', runs: 'none', authoring: 'write' } };
    const { running } = await 알림();

    expect(running).toEqual([]);
  });

  it('도는 작성 요청의 fiveSteps 는 지금 실행이 머지 · 고치기 · 고치기 다시 적용이면 false 이고 그때 expected 는 null 이다', async () => {
    await 치우기();
    const 작성중 = await 작성('XNT', { status: 'RUNNING' });
    const 머지원본 = await 작성('XNT', { status: 'DONE', 끝난일전: 3 });
    await 작성('XNT', { status: 'RUNNING', kind: 'MERGE', sourceId: 머지원본 });
    const 고치기 = await 작성('XNT', { status: 'RUNNING', kind: 'EDIT', params: { edits: [] } });
    const 고친뒤 = await 작성('XNT', { status: 'DONE', kind: 'EDIT', params: { edits: [] }, 끝난일전: 2 });
    await 작성('XNT', { status: 'RUNNING', kind: 'RERUN', sourceId: 고친뒤, params: { edits: [] } });
    const 다시원본 = await 작성('XNT', { status: 'DONE', 끝난일전: 4 });
    await 작성('XNT', { status: 'RUNNING', kind: 'RERUN', sourceId: 다시원본 });

    배정 = { XNT: 모두 };
    const { running } = await 알림();
    const 칸 = (id: number) => running.find((n) => n.kind === 'authoring' && n.requestId === id) as Extract<NoticeRunning, { kind: 'authoring' }>;

    expect(running).toHaveLength(5);
    expect(칸(작성중)).toMatchObject({ fiveSteps: true, expected: { ms: 30 * 60_000, samples: 2 } });
    expect(칸(다시원본)).toMatchObject({ fiveSteps: true, expected: { ms: 30 * 60_000, samples: 2 } });
    for (const id of [머지원본, 고치기, 고친뒤]) expect(칸(id)).toMatchObject({ fiveSteps: false, expected: null });
  });

  it('배정이 없으면 빈 목록이다', async () => {
    await 치우기();
    await 실행('XNT', { title: 'XNT 실행' });
    배정 = {};
    expect(await 알림()).toEqual({ running: [], recent: [] });
  });
});
