import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { compareWithPrevious } from './insights.js';

const 연결 = process.env.DATABASE_URL;

const 앞머리 = 'XDG 견주기';

describe.skipIf(연결 === undefined)('직전 실행과 견주기', () => {
  let pool: Pool;
  let 앞실행: number;
  let 이번실행: number;
  let 스테이지실행: number;
  let 주소바뀐실행: number;

  async function 지운다(): Promise<void> {
    await pool.query(
      'DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE $1)',
      [`${앞머리}%`],
    );
    await pool.query('DELETE FROM test_run WHERE title LIKE $1', [`${앞머리}%`]);
    await pool.query("DELETE FROM service WHERE prefix = 'XDG'");
  }

  async function 실행만든다(title: string, env: string, baseUrl: string, startedAt: string): Promise<number> {
    const row = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                             service_id, service_name, tests_repo, started_at)
       VALUES ($1, 'tester', '홍길동', 'FINISHED', $2, $3,
               (SELECT id FROM service WHERE prefix = 'XDG'), 'XDG 주문 서비스',
               'https://github.com/example/xdg-tests', $4)
       RETURNING run_id`,
      [title, env, baseUrl, startedAt],
    );
    return Number(row.rows[0]!.run_id);
  }

  async function 항목넣는다(
    runId: number,
    tcId: string,
    platform: string,
    attempt: number,
    status: string,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, 300000, '[]', '{}', '{}', '{}', '{}', $7, 100, now())`,
      [runId, tcId, platform, attempt, `${tcId} 케이스`, `demo/${tcId}.spec.ts`, status],
    );
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 지운다();

    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XDG', 'XDG 주문 서비스', '#445566', 'https://github.com/example/xdg-tests', 'xdg')`,
    );

    앞실행 = await 실행만든다(`${앞머리} 앞 실행`, 'qa', 'https://qa.example.com', '2026-09-10T01:00:00Z');
    스테이지실행 = await 실행만든다(
      `${앞머리} 스테이지 실행`,
      'stage',
      'https://stage.example.com',
      '2026-09-10T01:30:00Z',
    );
    이번실행 = await 실행만든다(`${앞머리} 이번 실행`, 'qa', 'https://qa.example.com', '2026-09-10T02:00:00Z');
    주소바뀐실행 = await 실행만든다(
      `${앞머리} 주소 바뀐 실행`,
      'qa',
      'https://qa2.example.com',
      '2026-09-10T03:00:00Z',
    );

    for (const [tcId, status] of [
      ['XDG-001', 'PASS'],
      ['XDG-002', 'FAIL'],
      ['XDG-003', 'FAIL'],
      ['XDG-004', 'PASS'],
      ['XDG-005', 'FAIL'],
      ['XDG-006', 'PASS'],
      ['XDG-008', 'PASS'],
      ['XDG-009', 'NA'],
    ] as const) {
      await 항목넣는다(앞실행, tcId, 'desktop', 1, status);
    }
    await 항목넣는다(앞실행, 'XDG-004', 'mobile', 1, 'FAIL');

    for (const [tcId, status] of [
      ['XDG-001', 'FAIL'],
      ['XDG-002', 'FAIL'],
      ['XDG-003', 'PASS'],
      ['XDG-004', 'PASS'],
      ['XDG-007', 'PASS'],
      ['XDG-009', 'PASS'],
    ] as const) {
      await 항목넣는다(이번실행, tcId, 'desktop', 1, status);
    }
    await 항목넣는다(이번실행, 'XDG-008', 'desktop', 1, 'NA');
    await 항목넣는다(이번실행, 'XDG-008', 'desktop', 2, 'NA');
    await 항목넣는다(이번실행, 'XDG-004', 'mobile', 1, 'PASS');
    for (const [attempt, status] of [
      [1, 'PASS'],
      [2, 'PASS'],
      [3, 'PASS'],
      [4, 'FAIL'],
      [5, 'FAIL'],
    ] as const) {
      await 항목넣는다(이번실행, 'XDG-005', 'desktop', attempt, status);
    }

    await 항목넣는다(스테이지실행, 'XDG-001', 'desktop', 1, 'PASS');
    await 항목넣는다(주소바뀐실행, 'XDG-004', 'desktop', 1, 'PASS');
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('앞 실행이 없으면 previous 가 null 이고 견줄 칸도 비어 있다', async () => {
    const 결과 = await compareWithPrevious(앞실행);

    expect(결과).toEqual({ previous: null, 주소바뀜: false, 빠진건수: 0, 케이스들: [] });
  });

  it('같은 서비스라도 대상 서버가 다르면 직전 실행이 아니다', async () => {
    const 결과 = await compareWithPrevious(이번실행);

    expect(결과.previous).toEqual({ runId: 앞실행, startedAt: '2026-09-10T01:00:00.000Z' });
  });

  it('다른 대상 서버의 실행은 자기보다 앞선 qa 실행을 직전으로 삼지 않는다', async () => {
    const 결과 = await compareWithPrevious(스테이지실행);

    expect(결과.previous).toBeNull();
  });

  it('통과에서 실패로 간 케이스가 새로깨짐이다', async () => {
    const 결과 = await compareWithPrevious(이번실행);

    expect(결과.케이스들).toContainEqual({
      tcId: 'XDG-001',
      tcName: 'XDG-001 케이스',
      platform: 'desktop',
      판정: '새로깨짐',
    });
  });

  it('실패→실패는 계속깨짐, 실패→통과는 고쳐짐, 통과→통과는 그대로다', async () => {
    const 결과 = await compareWithPrevious(이번실행);
    const 판정 = (tcId: string, platform: string): string | undefined =>
      결과.케이스들.find((c) => c.tcId === tcId && c.platform === platform)?.판정;

    expect(판정('XDG-002', 'desktop')).toBe('계속깨짐');
    expect(판정('XDG-003', 'desktop')).toBe('고쳐짐');
    expect(판정('XDG-004', 'desktop')).toBe('그대로');
    expect(판정('XDG-004', 'mobile')).toBe('고쳐짐');
  });

  it('앞 실행에 없던 케이스는 어느 칸에도 들어가지 않는다', async () => {
    const 결과 = await compareWithPrevious(이번실행);

    expect(결과.케이스들.map((c) => c.tcId)).not.toContain('XDG-007');
  });

  it('반복 5회 중 3회만 통과한 케이스가 계속깨짐으로 잡힌다', async () => {
    const 결과 = await compareWithPrevious(이번실행);
    const 다섯회 = 결과.케이스들.filter((c) => c.tcId === 'XDG-005');

    expect(다섯회).toEqual([
      { tcId: 'XDG-005', tcName: 'XDG-005 케이스', platform: 'desktop', 판정: '계속깨짐' },
    ]);
  });

  it('회차를 전부 미실행으로 끝낸 케이스는 실패가 아니라 그대로다', async () => {
    const 결과 = await compareWithPrevious(이번실행);
    const 판정 = (tcId: string): string | undefined => 결과.케이스들.find((c) => c.tcId === tcId)?.판정;

    expect(판정('XDG-008')).toBe('그대로');
    expect(판정('XDG-009')).toBe('그대로');
  });

  it('앞 실행에는 있었고 이번에 없는 케이스의 수를 빠진건수로 돌려준다', async () => {
    const 결과 = await compareWithPrevious(이번실행);

    expect(결과.빠진건수).toBe(1);
  });

  it('직전 실행의 주소가 이번과 같으면 주소바뀜이 false 다', async () => {
    const 결과 = await compareWithPrevious(이번실행);

    expect(결과.주소바뀜).toBe(false);
  });

  it('직전 실행의 주소가 이번과 다르면 주소바뀜이 true 다', async () => {
    const 결과 = await compareWithPrevious(주소바뀐실행);

    expect(결과.previous).toEqual({ runId: 이번실행, startedAt: '2026-09-10T02:00:00.000Z' });
    expect(결과.주소바뀜).toBe(true);
  });
});
