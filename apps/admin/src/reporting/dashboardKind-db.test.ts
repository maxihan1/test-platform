// 대시보드 종류별 칸 질의 — 앱 기기 · 게임 창 · API 엔드포인트와 95% 응답 · 칸 아래 한 줄 (도메인/리포팅 §8.12 「종류별 칸」)
// CI에는 postgres가 없을 수 있다. 실접속 검사는 DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 대시보드 } from './dashboardResults.js';

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XDY', 'XDYA', 'XDYG'];
const 케이스들 = ['XDYG-FN-001', 'XDYG-FN-002'];

describe.skipIf(연결 === undefined)('대시보드 종류별 칸', () => {
  let pool: Pool;
  let 앱 = 0;
  let api = 0;
  let 게임 = 0;

  async function 치우기(): Promise<void> {
    const ids = (await pool.query<{ id: string }>('SELECT id FROM service WHERE prefix = ANY($1)', [접두사들])).rows.map((r) => Number(r.id));
    await pool.query('DELETE FROM case_screen WHERE tc_id = ANY($1)', [케이스들]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    if (ids.length === 0) return;
    await pool.query('DELETE FROM service_api WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM perf_run WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [ids]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [ids]);
  }

  async function 서비스(접두: string, kind: string): Promise<number> {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, $1, '#445566', '', $2, $3) RETURNING id`,
      [접두, 접두.toLowerCase(), kind],
    );
    return Number(r.rows[0]!.id);
  }

  async function 실행(서비스번호: number): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, started_at, finished_at)
       VALUES ('XDY 실행', 'xdy', 'qa', 'FINISHED', $1, 'XDY', '', '', 'FN', now() - interval '1 hour', now() - interval '55 minutes')
       RETURNING run_id`,
      [서비스번호],
    );
    return Number(r.rows[0]!.run_id);
  }

  async function 항목(runId: number, tcId: string, status: string, 옵션: { platform?: string; attempt?: number; device?: object } = {}): Promise<number> {
    const r = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected,
                             param_schema, expected_schema, status, duration_ms, device, finished_at)
       VALUES ($1, $2, $3, $4, $2, 'x.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', $5, 100, $6, now())
       RETURNING history_id`,
      [runId, tcId, 옵션.platform ?? 'desktop', 옵션.attempt ?? 1, status, 옵션.device === undefined ? null : JSON.stringify(옵션.device)],
    );
    return Number(r.rows[0]!.history_id);
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치우기();
    앱 = await 서비스('XDY', 'APP');
    api = await 서비스('XDYA', 'API');
    게임 = await 서비스('XDYG', 'GAME');

    const 앱실행 = await 실행(앱);
    await 항목(앱실행, 'XDY-FN-001', 'PASS', { platform: 'android', device: { model: 'Pixel 7', osVersion: '14' } });
    // 회차마다 기기가 다르면 모델 글자 차례로 앞선 것 하나에만 든다
    await 항목(앱실행, 'XDY-FN-002', 'FAIL', { platform: 'android', device: { model: 'Pixel 7', osVersion: '14' } });
    await 항목(앱실행, 'XDY-FN-002', 'FAIL', { platform: 'android', attempt: 2, device: { model: 'Galaxy A34', osVersion: '13' } });
    await 항목(앱실행, 'XDY-FN-003', 'NA', { platform: 'android' });
    // 빈 모델 글자는 고르지 않는다 — 글자 차례로 맨 앞이라 진짜 모델을 가렸다
    await 항목(앱실행, 'XDY-FN-004', 'PASS', { platform: 'android', device: { model: '', osVersion: '14' } });
    await 항목(앱실행, 'XDY-FN-004', 'PASS', { platform: 'android', attempt: 2, device: { model: 'Pixel 7', osVersion: '14' } });
    // 다음 실행에서 Pixel 7 로 통과해 002 는 Galaxy A34 에서만 실패한 케이스가 된다
    await 항목(await 실행(앱), 'XDY-FN-002', 'PASS', { platform: 'android', device: { model: 'Pixel 7', osVersion: '14' } });

    const api실행 = await 실행(api);
    const 첫 = await 항목(api실행, 'XDYA-FN-001', 'PASS');
    await 항목(api실행, 'XDYA-FN-002', 'FAIL');
    await 항목(api실행, 'XDYA-FN-003', 'PASS'); // 지도에 없는 케이스는 「엔드포인트 정보 없음」 줄에 든다
    const 목록 = await pool.query<{ id: string }>(
      `INSERT INTO service_api (service_id, method, host, path) VALUES ($1, 'GET', 'api.x:3001', '/items'), ($1, 'POST', 'api.x:3001', '/items/:n'),
              ($1, 'DELETE', 'api.x:3001', '/items/:n') RETURNING id`,
      [api],
    );
    const [얻기, 쓰기] = 목록.rows.map((r) => Number(r.id));
    await pool.query(
      `INSERT INTO service_api_use (api_id, service_id, tc_id, run_id) VALUES ($1, $3, 'XDYA-FN-001', $4), ($2, $3, 'XDYA-FN-001', $4), ($2, $3, 'XDYA-FN-002', $4)`,
      [얻기, 쓰기, api, api실행],
    );
    await pool.query(
      `INSERT INTO run_network (history_id, ord, at_ms, method, url, status, resource_type, duration_ms)
       VALUES ($1, 1, 0, 'GET', 'http://api.x:3001/items', 200, 'api', 80),
              ($1, 2, 10, 'GET', 'http://api.x:3001/items', 200, 'api', 120),
              ($1, 3, 20, 'POST', 'http://api.x:3001/items/12345', 201, 'api', 400),
              ($1, 4, 30, 'GET', 'http://other.x/items', 200, 'api', 9999)`,
      [첫],
    );

    const 게임실행 = await 실행(게임);
    for (const tcId of 케이스들) {
      await pool.query(`INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema) VALUES ($1, $1, 'x.spec.ts', '{}', '{}')`, [tcId]);
    }
    await pool.query(
      `INSERT INTO case_screen (tc_id, file, screen_url, name) VALUES
         ('XDYG-FN-001', 'tests/xdyg/pages/shop.page.ts', '/shop', 'ShopWindow'),
         ('XDYG-FN-001', 'tests/xdyg/pages/bag.page.ts', '/bag', 'BagWindow'),
         ('XDYG-FN-001', 'tests/xdyg/components/a.component.ts', NULL, 'APart')`,
    );
    await 항목(게임실행, 'XDYG-FN-001', 'FAIL');
    await 항목(게임실행, 'XDYG-FN-002', 'PASS');
    // 게임 성능 측정 — 이번 창 둘(기기 두 대 하나 포함)과 창 밖 하나. 떨어짐은 30 이상에서 30 밑으로 넘어간 번수다
    const 측정 = async (전: string): Promise<number> =>
      Number(
        (
          await pool.query<{ id: string }>(
            `INSERT INTO perf_run (kind, service_id, env, base_url, config, status, origin, started_at)
             VALUES ('DEVICE', $1, 'qa', '', '{}', 'DONE', 'MANUAL', now() - $2::interval) RETURNING id`,
            [게임, 전],
          )
        ).rows[0]!.id,
      );
    const [첫측정, 둘측정, 옛측정] = [await 측정('1 hour'), await 측정('2 hours'), await 측정('40 days')];
    await pool.query(
      `INSERT INTO perf_device_metric (run_id, serial, device, sec, fps) VALUES
         ($1, 'a', 'A', 1, 20), ($1, 'a', 'A', 2, 40), ($1, 'a', 'A', 3, 25), ($1, 'a', 'A', 4, 28), ($1, 'a', 'A', 5, 60),
         ($1, 'b', 'B', 1, 60), ($1, 'b', 'B', 2, NULL), ($2, 'a', 'A', 1, 60), ($2, 'a', 'A', 2, 10), ($3, 'a', 'A', 1, 60), ($3, 'a', 'A', 2, 1)`,
      [첫측정, 둘측정, 옛측정],
    );
  });

  afterAll(async () => {
    await 치우기();
    await pool.end();
  });

  it('하나를 고르지 않으면 종류별 칸이 없다', async () => {
    expect((await 대시보드('UTC', [앱, api], [])).byKind).toBeNull();
  });

  it('Android 앱은 기기 모델 · Android 버전마다 세고 기기 정보가 없는 줄은 맨 뒤다', async () => {
    expect((await 대시보드('UTC', [앱], [], { 서비스: 앱 })).byKind).toEqual({
      kind: 'APP',
      rows: [
        { label: 'Galaxy A34 · Android 13', pass: 0, fail: 1, notRun: 0, p95Ms: null },
        { label: 'Pixel 7 · Android 14', pass: 3, fail: 0, notRun: 0, p95Ms: null },
        { label: null, pass: 0, fail: 0, notRun: 1, p95Ms: null },
      ],
      onlyFail: [{ label: 'Galaxy A34 · Android 13', count: 1 }],
      fps: null,
    });
  });

  it('API 는 지도의 엔드포인트마다 거친 케이스를 세고 같은 틀의 요청 기록으로 95% 응답을 내며, 지도에 없는 케이스는 맨 뒤 한 줄이다', async () => {
    expect((await 대시보드('UTC', [api], [], { 서비스: api })).byKind).toEqual({
      kind: 'API',
      rows: [
        { label: 'GET /items', pass: 1, fail: 0, notRun: 0, p95Ms: 120 },
        { label: 'POST /items/:n', pass: 1, fail: 1, notRun: 0, p95Ms: 400 },
        { label: null, pass: 1, fail: 0, notRun: 0, p95Ms: null },
      ],
      onlyFail: [],
      fps: null,
    });
  });

  it('게임은 케이스가 쓰는 화면 파일 가운데 주소 차례로 앞선 창 이름이고 없으면 맨 뒤 한 줄이다', async () => {
    expect((await 대시보드('UTC', [게임], [], { 서비스: 게임 })).byKind).toEqual({
      kind: 'GAME',
      rows: [
        { label: 'BagWindow', pass: 0, fail: 1, notRun: 0, p95Ms: null },
        { label: null, pass: 1, fail: 0, notRun: 0, p95Ms: null },
      ],
      onlyFail: [],
      // 이번 창 1초 숫자 여덟 개(빈 FPS 뺌)의 평균 · 40→25 와 60→10 두 번
      fps: { runs: 2, avg: 37.9, drops: 2, below: 30 },
    });
  });
});
