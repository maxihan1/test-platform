// 케이스 목록 맥락이 서비스 지도에서 엔드포인트를 읽는지 DB 로 본다 — API 애플리케이션만 · 첫 단계 · 주소 합치기 (도메인/카탈로그 §8.1 「맥락」 · WEB-F7-22)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 맥락 } from './context.js';
import { 맥락읽기 } from './contextRead.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('맥락 엔드포인트 읽기', () => {
  const 서비스들: number[] = [];
  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };
  const 서비스 = async (접두: string, kind: string) => {
    const r = await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, $1, '#445566', '', $2, $3) RETURNING id`, [
      접두,
      접두.toLowerCase(),
      kind,
    ]);
    서비스들.push(Number(r.rows[0]!.id));
    return Number(r.rows[0]!.id);
  };
  const 지도 = async (서비스번호: number, tcId: string, method: string, host: string, path: string, steps: number[]) => {
    const a = await q(
      `INSERT INTO service_api (service_id, method, host, path) VALUES ($1, $2, $3, $4)
       ON CONFLICT (service_id, method, host, path) DO UPDATE SET last_seen = now() RETURNING id`,
      [서비스번호, method, host, path],
    );
    await q('INSERT INTO service_api_use (api_id, service_id, tc_id, run_id, steps) VALUES ($1, $2, $3, 1, $4)', [a.rows[0]!.id, 서비스번호, tcId, steps]);
  };

  beforeAll(async () => {
    const api = await 서비스('XCE', 'API');
    const 웹 = await 서비스('XCEW', 'SCREEN');
    await 지도(api, 'XCE-FN-001', 'POST', 'api.x:3001', '/api/auth/login', []);
    await 지도(api, 'XCE-FN-001', 'POST', 'api.x:3001', '/api/orders', [3, 2]);
    await 지도(api, 'XCE-FN-001', 'GET', 'api.x:3001', '/api/orders/:n', [4]);
    await 지도(api, 'XCE-FN-001', 'GET', 'stage.x:3001', '/api/orders/:n', [1]);
    await 지도(웹, 'XCEW-FN-001', 'GET', 'web.x:3000', '/api/items', [1]);
  });

  afterAll(async () => {
    // 지도 줄은 service 와 같이 지워진다
    await q('DELETE FROM service WHERE id = ANY($1::bigint[])', [서비스들]);
  });

  it('API 애플리케이션은 첫 단계 차례로 · 대상 서버가 달라도 한 번 · 준비에서만 부른 것은 뒤', async () => {
    expect(맥락(await 맥락읽기('XCE'), 'XCE-FN-001').endpoints).toEqual(['GET /api/orders/:n', 'POST /api/orders', 'POST /api/auth/login']);
  });

  it('웹 애플리케이션은 지도에 호출이 있어도 엔드포인트를 안 단다', async () => {
    expect(맥락(await 맥락읽기('XCEW'), 'XCEW-FN-001').endpoints).toEqual([]);
  });
});
