// 정기 실행 점검이 돌 서비스를 고르는 규칙 (SPEC 공통/6-인프라 §9.2 「정기 실행」)

import type { PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XRS';

describe.skipIf(연결 === undefined)('정기 실행 — 돌 때가 된 서비스', () => {
  let 손: PoolClient;

  // 트랜잭션 안에서 만들고 되돌린다 — 점검은 그 DB 의 모든 서비스를 보므로 남의 「마지막으로 돈 때」를 덮으면 안 된다
  beforeEach(async () => {
    const { pool } = await import('../db/index.js');
    손 = await pool.connect();
    await 손.query('BEGIN');
  });

  afterEach(async () => {
    await 손.query('ROLLBACK');
    손.release();
  });

  async function 서비스(값: { at: string | null; tz?: string; last?: string; 활성?: boolean }, prefix = 접두사) {
    await 손.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, is_active, schedule_at, schedule_tz, schedule_env, schedule_last)
            VALUES ($1, $1, '#000000', '', 'xrs', $2, $3, $4, $5, $6)`,
      [prefix, 값.활성 ?? true, 값.at, 값.at === null ? null : (값.tz ?? 'UTC'), 값.at === null ? null : 'demo', 값.last ?? null],
    );
  }

  async function 집는다(지금: string) {
    const { 돌때가된서비스 } = await import('./scheduled.js');
    const 집은것 = await 돌때가된서비스(new Date(지금), 손);
    return 집은것.filter((s) => s.prefix.startsWith(접두사));
  }

  it('정한 시각 전에는 집지 않는다', async () => {
    await 서비스({ at: '03:00' });
    expect(await 집는다('2030-01-01T02:59:00Z')).toEqual([]);
  });

  it('정한 시각부터 1시간 안이면 집고 그 시간대의 날짜와 대상 서버를 준다', async () => {
    await 서비스({ at: '03:00' });
    expect(await 집는다('2030-01-01T03:00:00Z')).toEqual([{ prefix: 접두사, env: 'demo', 날짜: '2030-01-01' }]);
  });

  it('같은 날에는 한 번만 집는다', async () => {
    await 서비스({ at: '03:00' });
    await 집는다('2030-01-01T03:00:00Z');
    expect(await 집는다('2030-01-01T03:30:00Z')).toEqual([]);
  });

  it('그 시각부터 1시간이 지나면 그날은 건너뛴다', async () => {
    await 서비스({ at: '03:00' });
    expect(await 집는다('2030-01-01T04:00:00Z')).toEqual([]);
  });

  it('다음 날 그 시각에 다시 집는다', async () => {
    await 서비스({ at: '03:00' });
    await 집는다('2030-01-01T03:00:00Z');
    expect(await 집는다('2030-01-02T03:10:00Z')).toHaveLength(1);
  });

  it('시각과 날짜는 저장한 시간대로 읽는다', async () => {
    await 서비스({ at: '03:00', tz: 'Asia/Seoul', last: '2030-01-01T18:30:00Z' });
    // UTC 01-02 18:00 은 서울 01-03 03:00 이다. 마지막으로 돈 때(서울 01-02 03:30)와 날이 다르다
    expect(await 집는다('2030-01-02T18:00:00Z')).toEqual([{ prefix: 접두사, env: 'demo', 날짜: '2030-01-03' }]);
  });

  it('창은 자정을 넘지 않는다', async () => {
    await 서비스({ at: '23:30' });
    expect(await 집는다('2030-01-02T00:10:00Z')).toEqual([]);
    expect(await 집는다('2030-01-02T23:59:00Z')).toHaveLength(1);
  });

  it('꺼진 서비스와 비활성 서비스는 집지 않는다', async () => {
    await 서비스({ at: null });
    await 서비스({ at: '03:00', 활성: false }, `${접두사}OFF`);
    expect(await 집는다('2030-01-01T03:00:00Z')).toEqual([]);
  });

  it('마지막으로 돈 때를 집은 시각으로 적는다', async () => {
    await 서비스({ at: '03:00' });
    await 집는다('2030-01-01T03:05:00Z');
    const r = await 손.query<{ last: Date }>('SELECT schedule_last AS last FROM service WHERE prefix = $1', [접두사]);
    expect(r.rows[0]!.last.toISOString()).toBe('2030-01-01T03:05:00.000Z');
  });

  it('시각 · 시간대 · 대상 서버가 반만 찬 줄은 DB 가 받지 않는다', async () => {
    await expect(
      손.query(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, schedule_at) VALUES ($1, $1, '#000000', '', 'xrs', '03:00')`, [접두사]),
    ).rejects.toThrow(/service_schedule_all_or_none/);
  });
});
