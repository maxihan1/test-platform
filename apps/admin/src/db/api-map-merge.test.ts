// 서비스 지도에 쌓인 줄을 새 API 틀로 한 번 합치는 구간 검사 (SPEC 도메인/작성 §3.6 「세는 방식」 · WEB-F6-03)

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

const 올리기 = readFileSync(new URL('../../../../db/migrations/20261026000001_api_map_merge.sql', import.meta.url), 'utf8').split('-- migrate:down')[0]!;
const 합치기 = 올리기.slice(올리기.indexOf('-- 합치기 시작'), 올리기.indexOf('-- 합치기 끝'));

interface 줄 { method: string; path: string; first_seen: string; last_seen: string; ok_status: number | null }
interface 쓴줄 { method: string; path: string; tc_id: string | null; run_id: string | null; steps: number[]; screen_url: string | null }

describe.skipIf(연결 === undefined)('서비스 지도 쌓인 줄 합치기 (같은 모양의 임시 표에 합치기 구간을 돌린다)', () => {
  let 줄들: 줄[] = [];
  let 쓴줄들: 쓴줄[] = [];

  beforeAll(async () => {
    expect(합치기).not.toBe('');
    const { pool } = await import('../db/index.js');
    const c = await pool.connect();
    try {
      await c.query(`CREATE TEMP TABLE service_api (
        id BIGSERIAL PRIMARY KEY, service_id BIGINT NOT NULL, method TEXT NOT NULL, host TEXT NOT NULL, path TEXT NOT NULL,
        first_seen TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen TIMESTAMPTZ NOT NULL DEFAULT now(), ok_status INTEGER,
        UNIQUE (service_id, method, host, path))`);
      await c.query(`CREATE TEMP TABLE service_api_use (
        id BIGSERIAL PRIMARY KEY, api_id BIGINT NOT NULL REFERENCES pg_temp.service_api(id) ON DELETE CASCADE, service_id BIGINT NOT NULL,
        tc_id TEXT, run_id BIGINT, steps INTEGER[] NOT NULL DEFAULT '{}', env TEXT, state TEXT, screen_url TEXT, seen_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
      await c.query('CREATE UNIQUE INDEX ON pg_temp.service_api_use (api_id, tc_id) WHERE tc_id IS NOT NULL');
      await c.query('CREATE UNIQUE INDEX ON pg_temp.service_api_use (api_id, env, state, screen_url) WHERE tc_id IS NULL');
      await c.query(`INSERT INTO pg_temp.service_api (id, service_id, method, host, path, first_seen, last_seen, ok_status) VALUES
        (1, 1, 'GET', 'a', '/api/orders/DM20261026-0038', '2026-10-01', '2026-10-03', NULL),
        (2, 1, 'GET', 'a', '/api/orders/DM20261026-0039', '2026-10-02', '2026-10-05', NULL),
        (3, 1, 'DELETE', 'a', '/api/orders/DM20261026-0040', '2026-10-02', '2026-10-04', 204),
        (4, 1, 'DELETE', 'a', '/api/orders/:n', '2026-09-01', '2026-10-01', 200),
        (5, 1, 'GET', 'a', '/api/********/banners', '2026-10-01', '2026-10-01', NULL),
        (6, 1, 'GET', 'a', '/api/admin/banners', '2026-10-01', '2026-10-01', NULL),
        (7, 1, 'GET', 'a', '/api/v2/2024-summary', '2026-10-01', '2026-10-01', NULL),
        (8, 2, 'GET', 'a', '/api/orders/DM20261026-0038', '2026-10-01', '2026-10-01', NULL)`);
      await c.query(`INSERT INTO pg_temp.service_api_use (api_id, service_id, tc_id, run_id, steps, env, state, screen_url) VALUES
        (1, 1, 'T1', 10, '{1,3}', NULL, NULL, NULL),
        (2, 1, 'T1', 12, '{2}', NULL, NULL, NULL),
        (2, 1, 'T2', 11, '{}', NULL, NULL, NULL),
        (1, 1, NULL, NULL, '{}', 'E', '로그인', '/my/orders/:n'),
        (2, 1, NULL, NULL, '{}', 'E', '로그인', '/my/orders/:n'),
        (5, 1, 'T1', 10, '{1}', NULL, NULL, NULL)`);
      await c.query("SELECT setval(pg_get_serial_sequence('pg_temp.service_api', 'id'), 100)");
      await c.query('SET search_path = pg_temp, public');
      await c.query(합치기);
      줄들 = (await c.query<줄>(`SELECT method, path, to_char(first_seen, 'MM-DD') AS first_seen, to_char(last_seen, 'MM-DD') AS last_seen, ok_status
                                 FROM pg_temp.service_api WHERE service_id = 1 ORDER BY method, path`)).rows;
      쓴줄들 = (await c.query<쓴줄>(`SELECT a.method, a.path, u.tc_id, u.run_id, u.steps, u.screen_url
                                     FROM pg_temp.service_api_use u JOIN pg_temp.service_api a ON a.id = u.api_id ORDER BY a.method, a.path, u.tc_id`)).rows;
    } finally {
      await c.query('DROP TABLE IF EXISTS pg_temp.service_api_use, pg_temp.service_api');
      await c.query('RESET search_path');
      c.release();
    }
  });

  it('주문번호마다 갈린 줄이 :n 한 줄로 합쳐진다 — 처음 본 때는 이른 것, 마지막 본 때는 늦은 것', () => {
    expect(줄들.filter((x) => x.path === '/api/orders/:n')).toEqual([
      { method: 'DELETE', path: '/api/orders/:n', first_seen: '09-01', last_seen: '10-04', ok_status: 200 },
      { method: 'GET', path: '/api/orders/:n', first_seen: '10-01', last_seen: '10-05', ok_status: null },
    ]);
    expect(줄들.some((x) => x.path.includes('DM2026'))).toBe(false);
  });

  it('케이스 줄은 케이스마다 한 줄 — 늦은 실행 번호와 합친 단계, 화면 줄은 같은 화면이면 하나', () => {
    expect(쓴줄들.filter((x) => x.path === '/api/orders/:n')).toEqual([
      { method: 'GET', path: '/api/orders/:n', tc_id: 'T1', run_id: '12', steps: [1, 2, 3], screen_url: null },
      { method: 'GET', path: '/api/orders/:n', tc_id: 'T2', run_id: '11', steps: [], screen_url: null },
      { method: 'GET', path: '/api/orders/:n', tc_id: null, run_id: null, steps: [], screen_url: '/my/orders/:n' },
    ]);
  });

  it('별표 칸이 든 줄과 그 쓴 줄은 지우고, 이름 칸 · 연도가 든 이름은 그대로 둔다', () => {
    expect(줄들.map((x) => x.path)).toEqual(['/api/orders/:n', '/api/admin/banners', '/api/orders/:n', '/api/v2/2024-summary']);
    expect(쓴줄들.some((x) => x.path.includes('*'))).toBe(false);
  });
});
