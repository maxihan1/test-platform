// 안정화 집계의 정기 실행 회차 거르기 — 기준 세트 회차만 · 회차끼리 묶음 · 하루는 회차 날짜 · 옛 정기 실행과 안 섞임 (DB 접속이 있을 때만 돈다)
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('안정화 집계 — 정기 실행 회차', () => {
  let pool: Pool;
  let 프로젝트 = 0;
  let 서비스 = 0;

  const 치우기 = async (): Promise<void> => {
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM stab_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM stab_error WHERE service_id = $1', [서비스]);
    // 담은 줄 · 대상 서버 · 회차는 세트와 같이 지워진다
    await pool.query('DELETE FROM sched_set WHERE project_id = $1', [프로젝트]);
  };

  beforeAll(async () => {
    const { pool: 풀 } = await import('../db/index.js');
    pool = 풀;
    프로젝트 = Number((await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XSD 프로젝트') RETURNING id")).rows[0]!.id);
    서비스 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id)
           VALUES ('XSD', 'XSD 정기 실행 회차 검사용', '#3A5FCD', '', 'xsd', $1)
           ON CONFLICT (prefix) DO UPDATE SET is_active = true, project_id = $1 RETURNING id`,
          [프로젝트],
        )
      ).rows[0]!.id,
    );
    await 치우기();
  });

  afterAll(async () => {
    await 치우기();
    // 남은 애플리케이션이 없는 프로젝트는 트리거가 같이 지운다
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.query('DELETE FROM project WHERE id = $1', [프로젝트]);
  });

  async function 세트(이름: string, 기준: boolean): Promise<number> {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO sched_set (project_id, name, at, tz, days, is_base, created_by)
       VALUES ($1, $2, '03:00', 'Asia/Seoul', ARRAY[0,1,2,3,4,5,6]::SMALLINT[], $3, 'xsd') RETURNING id`,
      [프로젝트, 이름, 기준],
    );
    return Number(r.rows[0]!.id);
  }

  async function 회차(setId: number, 날: string, 상태: string): Promise<number> {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO sched_occurrence (set_id, planned_on, planned_at, state) VALUES ($1, $2, ($2::date + time '03:00') AT TIME ZONE 'Asia/Seoul', $3) RETURNING id`,
      [setId, 날, 상태],
    );
    return Number(r.rows[0]!.id);
  }

  async function 실행(env: string, kind: 'UI' | 'FN', 시작: string, 회차번호: number | null, status = 'FINISHED'): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, origin, started_at, finished_at, sched_occurrence_id)
       VALUES ('XSD 정기', 'XSD', '', '스케줄러', $1, 'https://qa.xsd.test', $2, $3, $4, 'SCHEDULED', $5, $5::timestamptz + interval '1 hour', $6)
       RETURNING run_id`,
      [env, status, 서비스, kind, 시작, 회차번호],
    );
    const runId = Number(r.rows[0]!.run_id);
    const h = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected,
                             param_schema, expected_schema, status, duration_ms, finished_at)
            VALUES ($1, $2, 'desktop', $2, 'xsd.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', 'PASS', 1000, now())
         RETURNING history_id`,
      [runId, `XSD-${kind}-001`],
    );
    await pool.query("INSERT INTO run_trace (history_id, status) VALUES ($1, 'DONE')", [Number(h.rows[0]!.history_id)]);
    return runId;
  }

  const 집계 = async (runId: number) => (await import('./aggregate.js')).집계한다(runId, 0, 1);
  const 집계줄 = async (runId: number) => (await pool.query<{ day: string }>("SELECT to_char(day, 'YYYY-MM-DD') AS day FROM stab_run WHERE run_id = $1", [runId])).rows[0];

  it('기준 세트 회차는 회차가 끝난 뒤 같은 회차의 UI · 기능 실행을 묶고 하루는 회차 날짜다', async () => {
    const 기준 = await 세트('XSD 전체 회귀', true);
    const 회 = await 회차(기준, '2001-03-10', 'RUNNING');
    // 앞 세트를 기다리다 자정을 넘겨 3월 11일에 시작했다 — 이 애플리케이션의 옛 시간대(UTC)로도 다른 날이다
    const fn = await 실행('qa', 'FN', '2001-03-11T00:30:00Z', 회);
    // 줄이 차례대로라 UI 실행이 서기 전에 기능 실행이 먼저 끝난다 — 회차가 돌고 있으면 기다린다
    expect(await 집계(fn)).toBe('기다림');
    const ui = await 실행('qa', 'UI', '2001-03-11T00:40:00Z', 회);
    expect(await 집계(ui)).toBe('기다림');

    await pool.query("UPDATE sched_occurrence SET state = 'DONE' WHERE id = $1", [회]);
    expect(await 집계(ui)).toBe('집계함');
    expect(await 집계줄(ui)).toEqual({ day: '2001-03-10' });
    expect(await 집계줄(fn)).toBeUndefined();
  });

  it('회차가 기준 세트의 기능 · UI 줄을 다 못 만들고 닫혔으면 그날 점을 비운다', async () => {
    const 기준 = await 세트('XSD 반쪽 회귀', true);
    await pool.query("INSERT INTO sched_set_item (set_id, seq, kind, service_id) VALUES ($1, 1, 'FN', $2), ($1, 2, 'UI', $2)", [기준, 서비스]);
    // 기능 실행이 6시간을 넘겨 회차가 먼저 닫히고 UI 실행은 안 섰다
    const 회 = await 회차(기준, '2001-06-10', 'DONE');
    const fn = await 실행('qa4', 'FN', '2001-06-09T18:00:00Z', 회);
    expect(await 집계(fn)).toBe('건너뜀');
    expect(await 집계줄(fn)).toBeUndefined();
  });

  it('다시 켜질 때 기준이 아닌 세트의 회차 실행은 빠진 집계 후보가 아니다', async () => {
    const 두시간전 = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const 보통 = await 세트('XSD 낮 점검', false);
    const 기준 = await 세트('XSD 낮 회귀', true);
    const 보통실행 = await 실행('qa5', 'FN', 두시간전, await 회차(보통, '2001-07-10', 'DONE'));
    const 기준실행 = await 실행('qa6', 'FN', 두시간전, await 회차(기준, '2001-07-10', 'DONE'));
    const 후보 = await (await import('./aggregate.js')).빠진집계후보();
    expect(후보).not.toContain(보통실행);
    expect(후보).toContain(기준실행);
  });

  it('기준이 아닌 세트의 회차 실행은 세지 않는다', async () => {
    const 보통 = await 세트('XSD 출시 전 점검', false);
    const 회 = await 회차(보통, '2001-04-10', 'DONE');
    const fn = await 실행('qa2', 'FN', '2001-04-09T18:00:00Z', 회);
    expect(await 집계(fn)).toBe('대상 아님');
    expect(await 집계줄(fn)).toBeUndefined();
  });

  it('회차 번호가 빈 옛 정기 실행은 같은 날 회차 실행과 섞이지 않는다', async () => {
    const 보통 = await 세트('XSD 저녁 점검', false);
    const 회 = await 회차(보통, '2001-05-10', 'DONE');
    const 옛 = await 실행('qa3', 'FN', '2001-05-10T18:00:00Z', null);
    // 같은 날 · 같은 대상 서버에서 아직 도는 회차 실행이 있어도 옛 묶음은 기다리지 않는다
    await 실행('qa3', 'UI', '2001-05-10T18:30:00Z', 회, 'RUNNING');
    expect(await 집계(옛)).toBe('집계함');
    // 옛 갈래의 하루는 정기 실행 시간대 — 이 애플리케이션은 비어 UTC
    expect(await 집계줄(옛)).toEqual({ day: '2001-05-10' });
  });
});
