// 대시보드 프로젝트 요약 질의 — 판 · 지도 ① · 케이스 마지막 결과 · 시나리오 · 부하 · 페이지 · 게임 성능 (도메인/리포팅 §8.12 「프로젝트 요약」)
// CI에는 postgres가 없을 수 있다. 실접속 검사는 DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 프로젝트요약읽기, type 볼서비스 } from './dashboardProjectRead.js';

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XDP', 'XDPG'];
const 케이스들 = ['XDP-FN-001', 'XDP-FN-002', 'XDP-UI-001'];

describe.skipIf(연결 === undefined)('대시보드 프로젝트 요약', () => {
  let pool: Pool;
  let 웹: 볼서비스;
  let 게임: 볼서비스;

  async function 치우기(): Promise<void> {
    const ids = (await pool.query<{ id: string }>('SELECT id FROM service WHERE prefix = ANY($1)', [접두사들])).rows.map((r) => Number(r.id));
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    if (ids.length === 0) return;
    await pool.query('DELETE FROM perf_run WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM perf_scenario WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1))', [ids]);
    await pool.query('DELETE FROM scenario WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM req_case WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM prd_version WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [ids]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [ids]);
  }

  async function 서비스(접두: string, kind: 볼서비스['kind']): Promise<볼서비스> {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, $1, '#445566', '', $2, $3) RETURNING id`,
      [접두, 접두.toLowerCase(), kind],
    );
    return { id: Number(r.rows[0]!.id), prefix: 접두, name: 접두, kind };
  }

  const 성능실행 = async (kind: string, 서비스번호: number, 덧: { scenario?: number; targets?: object; config?: object } = {}): Promise<number> =>
    Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO perf_run (kind, service_id, scenario_id, scenario_version, test_type, env, base_url, config, targets, status, verdict, origin, started_at, peak_vus, max_tps, p95_ms, error_rate)
           VALUES ($1, $2, $3, $4, $5, 'qa', '', $6, $7, 'DONE', 'PASS', 'MANUAL', now(), 50, 49.5, 22, 0)
           RETURNING id`,
          [kind, 서비스번호, 덧.scenario ?? null, 덧.scenario === undefined ? null : 1, kind === 'LOAD' ? 'LOAD' : null, JSON.stringify(덧.config ?? {}), JSON.stringify(덧.targets ?? [])],
        )
      ).rows[0]!.id,
    );

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치우기();
    웹 = await 서비스('XDP', 'SCREEN');
    게임 = await 서비스('XDPG', 'GAME');

    for (const [tcId, platforms] of [['XDP-FN-001', ['desktop']], ['XDP-FN-002', ['desktop']], ['XDP-UI-001', ['desktop', 'mobile']]] as const) {
      await pool.query(`INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, platforms) VALUES ($1, $1, 'x.spec.ts', '{}', '{}', $2)`, [tcId, JSON.stringify(platforms)]);
    }
    const 실행 = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, started_at, finished_at)
           VALUES ('XDP 실행', 'xdp', 'qa', 'FINISHED', $1, 'XDP', '', '', 'FN', now() - interval '1 hour', now()) RETURNING run_id`,
          [웹.id],
        )
      ).rows[0]!.run_id,
    );
    for (const [tcId, platform, status] of [['XDP-FN-001', 'desktop', 'PASS'], ['XDP-FN-002', 'desktop', 'FAIL'], ['XDP-UI-001', 'desktop', 'PASS']]) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, duration_ms, finished_at)
         VALUES ($1, $2, $3, 1, $2, 'x.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', $4, 100, now())`,
        [실행, tcId, platform, status],
      );
    }

    const 항목 = (reqId: string, status: string) => ({ reqId, feature: '주문', text: `${reqId} 문장`, basis: [{ from: 'a', quote: 'q' }], status });
    await pool.query(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 2, $2, 3, 'PERSON', 'xdp', '검사')`,
      [웹.id, JSON.stringify([항목('XDP-REQ-001', 'CONFIRMED'), 항목('XDP-REQ-002', 'NEEDS_CHECK'), 항목('XDP-REQ-003', 'CONFIRMED')])],
    );
    for (const [reqId, tcId, axis] of [['XDP-REQ-001', 'XDP-FN-001', '정상'], ['XDP-REQ-002', 'XDP-FN-002', '예외'], ['XDP-REQ-002', 'XDP-UI-001', 'UI']]) {
      await pool.query('INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, $2, $3, $4)', [웹.id, reqId, tcId, axis]);
    }

    const 시나리오 = Number((await pool.query<{ id: string }>(`INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XDP 주문 흐름', 'xdp') RETURNING id`, [웹.id])).rows[0]!.id);
    await pool.query(`INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, '[]', 'xdp', '검사')`, [시나리오]);

    const 부하시나리오 = Number((await pool.query<{ id: string }>(`INSERT INTO perf_scenario (service_id, name, created_by) VALUES ($1, '상품 둘러보기', 'xdp') RETURNING id`, [웹.id])).rows[0]!.id);
    const 부하 = await 성능실행('LOAD', 웹.id, { scenario: 부하시나리오, targets: [{ metric: 'P95', op: '<=', value: 2000 }, { metric: 'P95', scope: '/cart', op: '<=', value: 500 }] });
    const 칸 = Array.from({ length: 116 }, (_, i) => (i === 10 ? 5 : 0));
    await pool.query(
      `INSERT INTO perf_series (run_id, sec, tx, vus, requests, errors, hist) VALUES ($1, 0, '', 10, 30, 0, $2), ($1, 1, '', 20, 45, 0, $2), ($1, 1, '/cart', 20, 5, 0, $2)`,
      [부하, 칸],
    );
    await pool.query(`INSERT INTO perf_host_metric (run_id, agent_id, agent_name, sec, cpu, mem) VALUES ($1, 1, 'm', 0, 30, 50), ($1, 1, 'm', 1, 38, 54)`, [부하]);

    const 페이지 = await 성능실행('PAGE', 웹.id, { targets: [{ metric: 'LCP', op: '<=', value: 2500 }] });
    await pool.query(
      `INSERT INTO perf_page_metric (run_id, url, device, network, lcp_ms, fcp_ms, cls) VALUES
         ($1, '/', 'desktop', 'NONE', 900, 400, 0.04), ($1, '/', 'desktop', 'NONE', 876, 468, 0.043), ($1, '/shop', 'desktop', 'NONE', 976, 460, 0)`,
      [페이지],
    );

    const 기기 = await 성능실행('DEVICE', 게임.id, { config: { devices: [{ serial: 'a', model: 'Galaxy S21', where: 'LOCAL', launchMs: 1200 }] } });
    await pool.query(`INSERT INTO perf_device_metric (run_id, serial, device, sec, fps, temp_c, freeze_count) VALUES ($1, 'a', 'Galaxy S21', 1, 60, 37, 0), ($1, 'a', 'Galaxy S21', 2, 56, 38.4, 2)`, [기기]);
  });

  afterAll(async () => {
    await 치우기();
    await pool.end();
  });

  it('애플리케이션마다 PRD · 케이스 · 마지막 결과 · 시나리오 수를 센다', async () => {
    const 요약 = await 프로젝트요약읽기([웹, 게임], [웹.id]);
    const [w, g] = 요약.apps;
    expect(w).toMatchObject({
      prefix: 'XDP',
      prd: { version: 2, requirements: 3, needsCheck: 1, rtm: { pass: 1, fail: 1, notRun: 0, none: 1 }, axis: { normal: 1, error: 1, ui: 1, boundary: 0 } },
      cases: { fn: 2, ui: 1 },
      last: { pass: 1, fail: 1, notRun: 1 },
      scenarios: 1,
      extra: { pageLcp: { url: '/shop', ms: 976 }, fps: null, p95Ms: 22 },
    });
    // 작성 read 가 없는 애플리케이션은 PRD 칸이 비고 케이스 셈은 그대로다
    expect(g).toMatchObject({ prd: null, cases: { fn: 0, ui: 0 }, scenarios: 0, extra: { fps: 58 } });
    expect(요약.e2e).toMatchObject({ total: 1, pass: 0, fail: 0, recent: [] });
  });

  it('가장 최근 부하 · 페이지 · 게임 성능을 싣는다', async () => {
    const { perf } = await 프로젝트요약읽기([웹, 게임], [웹.id]);
    expect(perf.load).toMatchObject({
      serviceName: 'XDP', scenarioName: '상품 둘러보기', peakVus: 50, maxTps: 49.5, p95Ms: 22, errorRate: 0,
      targets: { p95Ms: 2000, errorRate: null },
      hosts: { cpu: 38, mem: 54 },
    });
    expect(perf.load?.series.map((x) => [x.sec, x.vus, x.rps])).toEqual([[0, 10, 30], [1, 20, 45]]);
    expect(perf.pages).toMatchObject({ targets: { lcpMs: 2500, fcpMs: null }, rows: [{ url: '/', lcpMs: 876, fcpMs: 468, cls: 0.043 }, { url: '/shop', lcpMs: 976 }] });
    expect(perf.game).toMatchObject({ serviceName: 'XDPG', device: 'Galaxy S21', avgFps: 58, freezeCount: 2, maxTempC: 38.4, launchMs: 1200 });
    expect(perf.app).toBeNull();
  });
});
