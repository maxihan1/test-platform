// 애플리케이션 종류 APP 을 한 번 옮기는 구간 검사 (SPEC 공통/4-데이터모델 「애플리케이션 종류 APP」 · APP-F1-15)

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

const 올리기 = readFileSync(new URL('../../../../db/migrations/20261021000003_app_kind.sql', import.meta.url), 'utf8').split(
  '-- migrate:down',
)[0]!;
const 옮기기 = 올리기.slice(올리기.indexOf('-- 옮기기 시작'), 올리기.indexOf('-- 옮기기 끝'));

describe.skipIf(연결 === undefined)('애플리케이션 종류 APP 옮기기 (옛 모양의 임시 표에 옮기기 구간을 돌린다)', () => {
  let 종류: Record<string, string> = {};

  beforeAll(async () => {
    expect(옮기기).not.toBe('');
    const { pool } = await import('../db/index.js');
    const c = await pool.connect();
    try {
      await c.query('CREATE TEMP TABLE service (id BIGINT PRIMARY KEY, prefix TEXT NOT NULL, kind TEXT NOT NULL)');
      await c.query('CREATE TEMP TABLE test_case (tc_id TEXT PRIMARY KEY, platforms JSONB NOT NULL, is_active BOOLEAN NOT NULL)');
      await c.query('CREATE TEMP TABLE service_env (service_id BIGINT NOT NULL, app_path TEXT)');
      await c.query(`INSERT INTO pg_temp.service VALUES
        (1, 'AND', 'SCREEN'), (2, 'MIX', 'SCREEN'), (3, 'OFF', 'SCREEN'), (4, 'PTH', 'SCREEN'),
        (5, 'NIL', 'SCREEN'), (6, 'BLK', 'SCREEN'), (7, 'API', 'API'), (8, 'AN', 'SCREEN')`);
      await c.query(`INSERT INTO pg_temp.test_case VALUES
        ('AND-FN-001', '["android"]', true), ('AND-FN-002', '["android"]', false),
        ('MIX-FN-001', '["android"]', true), ('MIX-FN-002', '["desktop"]', true),
        ('OFF-FN-001', '["android"]', true), ('OFF-FN-002', '["mobile"]', false),
        ('API-FN-001', '["android"]', true)`);
      await c.query(`INSERT INTO pg_temp.service_env VALUES (4, '/apps/demo.apk'), (6, ''), (6, NULL)`);
      await c.query('SET search_path = pg_temp, public');
      await c.query(옮기기);
      const r = await c.query<{ prefix: string; kind: string }>('SELECT prefix, kind FROM pg_temp.service');
      종류 = Object.fromEntries(r.rows.map((x) => [x.prefix, x.kind]));
    } finally {
      await c.query('DROP TABLE IF EXISTS pg_temp.service, pg_temp.test_case, pg_temp.service_env');
      await c.query('RESET search_path');
      c.release();
    }
  });

  it('android 케이스만 있으면(꺼진 것 포함) Android 앱으로 옮긴다', () => {
    expect(종류.AND).toBe('APP');
  });

  it('웹 케이스가 하나라도 있으면 웹으로 남는다 — 꺼 둔 웹 케이스도 센다', () => {
    expect(종류.MIX).toBe('SCREEN');
    expect(종류.OFF).toBe('SCREEN');
  });

  it('케이스가 0건이어도 대상 서버 줄에 앱 파일 경로가 있으면 옮긴다', () => {
    expect(종류.PTH).toBe('APP');
  });

  it('케이스도 앱 파일 경로도 없으면(빈 경로 포함) 웹으로 남는다', () => {
    expect(종류.NIL).toBe('SCREEN');
    expect(종류.BLK).toBe('SCREEN');
  });

  it('API 애플리케이션은 건드리지 않는다', () => {
    expect(종류.API).toBe('API');
  });

  it('접두사가 다른 애플리케이션의 앞부분이어도 남의 케이스를 세지 않는다', () => {
    expect(종류.AN).toBe('SCREEN');
  });
});
