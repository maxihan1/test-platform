// 한 건 실행이 붙은 실행을 직전 대비 · 실패 카드 · 대시보드 · 알림 · 결정 목록이 지금 결과로 세는지 DB 로 본다 (DATABASE_URL 이 있을 때만 · 도메인/실행 §3.2 표)

import Fastify, { type FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 판정없는실패들 } from '../authoring/decisionReads.js';
import { createRun } from '../execution/store.js';
import { 알림 } from '../notifications/store.js';
import { 대시보드 } from './dashboardResults.js';
import { 실패카드 } from './failures.js';
import { compareWithPrevious } from './insights.js';
import reportingRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XJB')";
const 케이스들 = ['XJB-001', 'XJB-002'];

describe.skipIf(연결 === undefined)('한 건 실행이 붙은 실행의 지금 결과 — 리포팅', () => {
  let pool: Pool;
  let 앱: FastifyInstance;
  let 서비스 = 0;

  async function 실행을치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
  }

  async function 치운다(): Promise<void> {
    await 실행을치운다();
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XJB'");
  }

  const 건다 = async (tcIds: string[], platforms: ('desktop' | 'mobile')[] = ['desktop', 'mobile'], repeat = 1) =>
    (
      await createRun({
        origin: 'MANUAL',
        triggeredBy: 'xjb',
        env: 'qa',
        repeat,
        items: tcIds.map((tcId) => ({ tcId, platforms, params: {}, expected: {} })),
      })
    ).runId;
  const 판정 = (runId: number, tcId: string, platform: string, status: 'PASS' | 'FAIL') =>
    pool.query('UPDATE run_item SET status = $4, finished_at = clock_timestamp() WHERE run_id = $1 AND tc_id = $2 AND platform = $3', [
      runId,
      tcId,
      platform,
      status,
    ]);
  const 닫는다 = async (runId: number) => {
    await pool.query("UPDATE run_item SET status = 'PASS', finished_at = clock_timestamp() WHERE run_id = $1 AND finished_at IS NULL", [runId]);
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = clock_timestamp() WHERE run_id = $1", [runId]);
  };
  /** 케이스 하나 · 디바이스 하나를 건 한 건 실행을 판정으로 닫는다 */
  const 한건 = async (tcId: string, platform: 'desktop' | 'mobile', status: 'PASS' | 'FAIL') => {
    const runId = await 건다([tcId], [platform]);
    await 판정(runId, tcId, platform, status);
    await 닫는다(runId);
    return runId;
  };
  /** 001 데스크톱만 실패하는 묶음 실행 */
  const 묶음 = async () => {
    const runId = await 건다(케이스들);
    await 판정(runId, 'XJB-001', 'desktop', 'FAIL');
    await 닫는다(runId);
    return runId;
  };
  const 회귀실패 = async () =>
    (await 대시보드('UTC', [서비스], [])).newFailures.map((f) => [f.runId, f.tcId, f.platform]);

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XJB', 'XJB 서비스', '#445566', '', 'xjb') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    await pool.query("INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'https://qa.example.com')", [서비스]);
    for (const tcId of 케이스들) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $2, '["desktop","mobile"]', '[]', $3, '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
        [tcId, `${tcId} 이름`, `xjb/${tcId}.spec.ts`],
      );
    }
    앱 = Fastify();
    await 앱.register(reportingRoutes, { prefix: '/api' });
  });

  beforeEach(실행을치운다);

  afterAll(async () => {
    await 앱.close();
    await 치운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('다음 실행은 한 건을 앞 실행으로 고르지 않고 붙은 실행의 지금 결과와 견준다 — 다시 통과했으면 새로 깨진 것이다', async () => {
    const 첫 = await 묶음();
    await 한건('XJB-001', 'desktop', 'PASS');
    const 둘 = await 묶음();

    const 비교 = await compareWithPrevious(둘);
    expect(비교.previous?.runId).toBe(첫);
    expect(비교.케이스들.find((c) => c.tcId === 'XJB-001' && c.platform === 'desktop')?.판정).toBe('새로깨짐');
    expect((await 실패카드(첫, 1)).items).toEqual([]);
  });

  it('붙은 한 건이 다시 실패하면 실패 카드는 그 한 건 항목을 열고 디바이스 칸에 원래 결과를 싣는다', async () => {
    const 첫 = await 묶음();
    const 다시 = await 한건('XJB-001', 'desktop', 'FAIL');
    const 카드 = (await 실패카드(첫, 1)).items;
    expect(카드.map((c) => c.tcId)).toEqual(['XJB-001']);
    const 칸 = 카드[0]!.devices[0]!;
    expect(칸.rerun).toMatchObject({ runId: 다시, original: { status: 'FAIL' } });
    expect(칸.item.runId).toBe(다시);
  });

  it('대시보드 회귀 실패 — 붙은 한 건이 통과하면 빠지고, 붙지 않은 한 건 통과도 「지금도 실패」를 지운다', async () => {
    await 묶음();
    const 둘 = await 묶음();
    await 판정(둘, 'XJB-002', 'mobile', 'FAIL');
    // 둘은 앞 실행과 견줘 002 모바일이 새로 깨졌다
    expect(await 회귀실패()).toEqual([[둘, 'XJB-002', 'mobile']]);
    await 한건('XJB-002', 'mobile', 'PASS');
    expect(await 회귀실패()).toEqual([]);

    // 가장 최근 실행이 반복 실행이면 한 건은 붙지 않는다 — 그래도 가장 최근 판정으로는 센다
    await 실행을치운다();
    await 묶음();
    const 깨진 = await 묶음();
    await 판정(깨진, 'XJB-002', 'desktop', 'FAIL');
    const 반복 = await 건다(케이스들, ['desktop'], 2);
    await 판정(반복, 'XJB-002', 'desktop', 'FAIL');
    await 닫는다(반복);
    expect(await 회귀실패()).toEqual([[깨진, 'XJB-002', 'desktop']]);
    await 한건('XJB-002', 'desktop', 'PASS');
    expect(await 회귀실패()).toEqual([]);
  });

  it('한 건 실행은 대시보드 실행 중 · 알림에 없고, 결정 목록은 다시 통과한 실패를 내지 않는다', async () => {
    const 첫 = await 묶음();
    expect((await 판정없는실패들(서비스)).map((f) => [f.runId, f.tcId])).toEqual([[첫, 'XJB-001']]);
    const 도는한건 = await 건다(['XJB-001'], ['desktop']);
    expect((await 대시보드('UTC', [서비스], [])).running).toEqual([]);
    const 보이는 = [{ id: 서비스, prefix: 'XJB', name: 'XJB 서비스' }];
    expect((await 알림(보이는, [])).running).toEqual([]);
    await 판정(도는한건, 'XJB-001', 'desktop', 'PASS');
    await 닫는다(도는한건);
    expect((await 알림(보이는, [])).recent.map((r) => ('runId' in r ? r.runId : null))).toEqual([첫]);
    expect(await 판정없는실패들(서비스)).toEqual([]);
  });

  it('한 건 실행 번호로 견주기 · 실패 카드 · 증적 만들기를 부르면 404 SINGLE_RUN 이다', async () => {
    await 묶음();
    const 번호 = await 한건('XJB-001', 'desktop', 'PASS');
    for (const [method, url] of [
      ['GET', `/api/runs/${String(번호)}/insights`],
      ['GET', `/api/runs/${String(번호)}/failures?page=1`],
      ['POST', `/api/runs/${String(번호)}/evidence`],
    ] as const) {
      const res = await 앱.inject({ method, url, ...(method === 'POST' ? { payload: { format: 'HTML' } } : {}) });
      expect([url, res.statusCode, res.json()]).toEqual([url, 404, { error: 'SINGLE_RUN', detail: String(번호) }]);
    }
  });
});
