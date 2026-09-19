// Grafana 대시보드 패널 넷이 SPEC §8.5 대로 프로비저닝됐는지 본다 — 제목 · SQL 실접속 · 회차 접기
// CI에는 postgres가 없다. 실접속 검사는 DATABASE_URL이 있을 때만 돈다

import { readFileSync } from 'node:fs';

import { Client, Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type 타깃 = { rawSql: string; format: string; rawQuery: boolean };
type 패널 = { title: string; type: string; targets: 타깃[] };
type 대시보드 = { panels: 패널[] };

const 대시보드: 대시보드 = JSON.parse(
  readFileSync(
    new URL('../../../../infra/grafana/provisioning/dashboards/test-platform.json', import.meta.url),
    'utf8',
  ),
) as 대시보드;

// 패널 SQL 은 대시보드 계정 권한으로 돌아야 의미가 있다. JOIN 안에 숨은 표는 여기서만 드러난다 (SPEC §8.5 · §6)
const 읽기전용연결 = 'postgres://grafana_ro:grafana_ro@localhost:5433/platform';
const 연결 = process.env.DATABASE_URL;

describe('Grafana 대시보드 프로비저닝', () => {
  it('패널이 넷이고 제목이 SPEC §8.5 목록 그대로다', () => {
    expect(대시보드.panels.map((p) => p.title)).toEqual([
      '성공률 추이',
      '평균 소요시간',
      '실패 TOP 10 케이스',
      '최근 실행 목록',
    ]);
  });

  describe.skipIf(연결 === undefined)('패널 SQL', () => {
    let pool: Pool;
    let 읽기전용: Client;

    beforeAll(async () => {
      pool = new Pool({ connectionString: 연결 });
      읽기전용 = new Client({ connectionString: 읽기전용연결 });
      await 읽기전용.connect();

      await pool.query(
        "DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XDD%')",
      );
      await pool.query("DELETE FROM test_run WHERE title LIKE 'XDD%'");

      // 오늘에 넣으면 남의 fixture 와 같은 날짜 칸에 섞인다. 아무도 안 쓰는 25일 전에 우리 것만 둔다
      const run = await pool.query<{ run_id: string }>(
        `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url, started_at)
         VALUES ('XDD 회차 접기', 'tester', 'FINISHED', 'qa', NULL, '', 'https://xdd.example.com', 'https://qa.example.com',
                 now() - interval '25 days')
         RETURNING run_id`,
      );
      const runId = Number(run.rows[0]!.run_id);

      // XDD-001 은 3회 중 2회만 통과한 케이스, XDD-002 는 전 회차 통과.
      // 행을 그대로 세면 5행 중 4행이라 80%, 회차를 접으면 2건 중 1건이라 50% 다
      const 항목들 = [
        ['XDD-001', 1, 'PASS'],
        ['XDD-001', 2, 'FAIL'],
        ['XDD-001', 3, 'PASS'],
        ['XDD-002', 1, 'PASS'],
        ['XDD-002', 2, 'PASS'],
      ] as const;
      for (const [tcId, attempt, status] of 항목들) {
        await pool.query(
          `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, params, expected, param_schema, expected_schema,
                                 status, duration_ms, file_path, started_at, finished_at)
           VALUES ($1, $2, 'desktop', $3, $4, '{}', '{}', '{}', '{}', $5, 100, '',
                   now() - interval '25 days', now() - interval '25 days')`,
          [runId, tcId, attempt, `${tcId} 케이스`, status],
        );
      }

      // 실패 순위용 표본은 26일 전에 따로 둔다. 같은 날 칸에 섞으면 위 성공률 기준이 흔들린다
      const 순위run = await pool.query<{ run_id: string }>(
        `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url, started_at)
         VALUES ('XDD 실패 순위', 'tester', 'FINISHED', 'qa', NULL, '', 'https://xdd.example.com', 'https://qa.example.com',
                 now() - interval '26 days')
         RETURNING run_id`,
      );
      const 순위runId = Number(순위run.rows[0]!.run_id);

      // XDD-003 은 한 케이스를 3회 돌려 3회 다 실패했다 — 행을 세면 3건, 회차를 접으면 1건이다.
      // XDD-004 는 러너에 닿지 못해 한 번도 못 돈 케이스다 — 실패가 아니므로 순위에 오르면 안 된다
      const 순위항목들 = [
        ['XDD-003', 1, 'FAIL'],
        ['XDD-003', 2, 'FAIL'],
        ['XDD-003', 3, 'FAIL'],
        ['XDD-004', 1, 'NA'],
        ['XDD-004', 2, 'NA'],
      ] as const;
      for (const [tcId, attempt, status] of 순위항목들) {
        await pool.query(
          `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, params, expected, param_schema, expected_schema,
                                 status, duration_ms, file_path, started_at, finished_at)
           VALUES ($1, $2, 'desktop', $3, $4, '{}', '{}', '{}', '{}', $5, 100, '',
                   now() - interval '26 days', now() - interval '26 days')`,
          [순위runId, tcId, attempt, `${tcId} 케이스`, status],
        );
      }
    });

    afterAll(async () => {
      await pool.query(
        "DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XDD%')",
      );
      await pool.query("DELETE FROM test_run WHERE title LIKE 'XDD%'");
      await pool.end();
      await 읽기전용.end();
    });

    it.each(대시보드.panels.map((p) => [p.title, p.targets[0]!.rawSql] as const))(
      '%s — grafana_ro 계정으로 실제로 돌아간다',
      async (_제목, sql) => {
        await expect(읽기전용.query(sql)).resolves.toBeDefined();
      },
    );

    it('성공률 — 3회 중 2회만 통과한 케이스를 통과로 세지 않는다', async () => {
      const 기준 = await 읽기전용.query<{ d: Date }>(
        `SELECT date_trunc('day', started_at) AS d FROM test_run WHERE title = 'XDD 회차 접기'`,
      );
      const 성공률SQL = 대시보드.panels.find((p) => p.title === '성공률 추이')!.targets[0]!.rawSql;
      const 결과 = await 읽기전용.query<{ time: Date; 성공률: string }>(성공률SQL);

      const 그날 = 결과.rows.find((r) => r.time.getTime() === 기준.rows[0]!.d.getTime());
      expect(그날).toBeDefined();
      expect(Number(그날!.성공률)).toBe(50);
    });

    const 실패순위 = async () => {
      const sql = 대시보드.panels.find((p) => p.title === '실패 TOP 10 케이스')!.targets[0]!.rawSql;
      const 결과 = await 읽기전용.query<{ '케이스 ID': string; '실패 건수': string }>(sql);
      return 결과.rows;
    };

    it('실패 TOP 10 — 3회 돌려 3회 실패한 케이스를 3건으로 세지 않는다', async () => {
      const 그케이스 = (await 실패순위()).find((r) => r['케이스 ID'] === 'XDD-003');
      expect(그케이스).toBeDefined();
      expect(Number(그케이스!['실패 건수'])).toBe(1);
    });

    it('실패 TOP 10 — 미실행만 있는 케이스는 순위에 오르지 않는다', async () => {
      expect((await 실패순위()).map((r) => r['케이스 ID'])).not.toContain('XDD-004');
    });
  });
});
