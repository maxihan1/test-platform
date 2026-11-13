// 정기 실행 1분 점검을 실제 DB 로 본다 — 회차 세우기 · 프로젝트마다 하나씩 · 줄 차례 · 빠진 줄 · 6시간 상한 · 호환성 실행의 정기 칸
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';


const 연결 = process.env.DATABASE_URL;
const 조용히 = { info: () => undefined, error: () => undefined };
// 세트 시각(03:00)이 지금과 겹쳐 회차가 새로 서지 않게 회차 세우기의 지금은 지난 날로 준다
const 옛날 = new Date('2000-06-01T00:00:00Z');

describe.skipIf(연결 === undefined)('정기 실행 1분 점검', { timeout: 60_000 }, () => {
  let pool: Pool;
  let 점검: typeof import('./runner.js');
  let 호환성: typeof import('../compat/runStore.js');
  let 프로젝트 = 0;
  let 앱 = 0;
  let 호환성세트 = 0;

  const 세트 = async (이름: string, 몸: { at?: string; days?: number[] | null; onceOn?: string; updatedAt?: string; 줄?: ('FN' | 'UI')[]; env?: string } = {}) => {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO sched_set (project_id, name, at, tz, days, once_on, created_by, updated_at)
       VALUES ($1, $2, $3, 'Asia/Seoul', $4, $5, 'xkr', $6) RETURNING id`,
      [프로젝트, 이름, 몸.at ?? '03:00', 몸.onceOn === undefined ? (몸.days ?? [0, 1, 2, 3, 4, 5, 6]) : null, 몸.onceOn ?? null, 몸.updatedAt ?? '2000-01-01T00:00Z'],
    );
    const id = Number(r.rows[0]!.id);
    for (const [i, kind] of (몸.줄 ?? ['FN']).entries()) {
      await pool.query('INSERT INTO sched_set_item (set_id, seq, kind, service_id) VALUES ($1, $2, $3, $4)', [id, i + 1, kind, 앱]);
    }
    await pool.query('INSERT INTO sched_set_env (set_id, service_id, env) VALUES ($1, $2, $3)', [id, 앱, 몸.env ?? '없는서버']);
    return id;
  };
  const 회차 = async (setId: number, 상태: string, 몸: { plannedAt?: string; curSeq?: number; started?: string } = {}) => {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO sched_occurrence (set_id, planned_on, planned_at, state, cur_seq, started_at)
       VALUES ($1, ($2::timestamptz AT TIME ZONE 'Asia/Seoul')::date, $2, $3, $4, $5::timestamptz) RETURNING id`,
      [setId, 몸.plannedAt ?? '2001-05-10T18:00Z', 상태, 몸.curSeq ?? null, 몸.started ?? (상태 === 'RUNNING' ? new Date().toISOString() : null)],
    );
    return Number(r.rows[0]!.id);
  };
  const 회차줄 = async (id: number) =>
    (await pool.query<{ state: string; cur_seq: number | null; notes: unknown[] }>('SELECT state, cur_seq, notes FROM sched_occurrence WHERE id = $1', [id])).rows[0]!;
  const 실행 = async (occ: number, status: string) =>
    Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, origin, sched_occurrence_id)
           VALUES ('XKR 정기', 'XKR', '', '스케줄러', 'qa', 'https://qa.xkr.test', $1, $2, 'FN', 'SCHEDULED', $3) RETURNING run_id`,
          [status, 앱, occ],
        )
      ).rows[0]!.run_id,
    );

  beforeAll(async () => {
    pool = (await import('../db/index.js')).pool;
    점검 = await import('./runner.js');
    호환성 = await import('../compat/runStore.js');
    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XKR 프로젝트') RETURNING id`)).rows[0]!.id);
    앱 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XKR', 'XKR 웹', '#3A5FCD', '', 'xkr', $1) RETURNING id`,
          [프로젝트],
        )
      ).rows[0]!.id,
    );
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'https://qa.xkr.test')`, [앱]);
    호환성세트 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO compat_set (service_id, name, devices, one_per_model, created_by) VALUES ($1, 'XKR 호환성', '[]', false, 'xkr') RETURNING id`, [앱]))
        .rows[0]!.id,
    );
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    // 담은 줄 · 대상 서버 · 회차는 세트와 같이 지워진다
    await pool.query('DELETE FROM sched_set WHERE project_id = $1', [프로젝트]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM compat_run_case WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [앱]);
    await pool.query('DELETE FROM compat_run_device WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM sched_set WHERE project_id = $1', [프로젝트]);
    await pool.query('DELETE FROM compat_set WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [앱]);
    // 남은 애플리케이션이 없는 프로젝트는 트리거가 같이 지운다
    await pool.query('DELETE FROM service WHERE id = $1', [앱]);
  });

  it('정한 시각부터 1시간 안 · 반복에 든 날 · 마지막 저장 뒤의 시각에만 그날 회차 하나를 세운다', async () => {
    const 매일 = await 세트('XKR 매일');
    // 2001-05-11 은 금요일(5) — 서울 03:30
    const 지금 = new Date('2001-05-10T18:30:00Z');
    const 월요일만 = await 세트('XKR 월요일', { days: [1] });
    const 한번 = await 세트('XKR 한 번', { onceOn: '2001-05-11' });
    const 늦게저장 = await 세트('XKR 늦게 저장', { updatedAt: '2001-05-10T18:10:00Z' });
    const 이른 = await 세트('XKR 이른 시각', { at: '02:00' });
    expect(await 점검.회차세우기(지금)).toBe(2);
    expect(await 점검.회차세우기(new Date('2001-05-10T18:40:00Z'))).toBe(0);
    const 선 = await pool.query<{ set_id: string; planned_on: string; planned_at: Date; state: string }>(
      "SELECT set_id, to_char(planned_on, 'YYYY-MM-DD') AS planned_on, planned_at, state FROM sched_occurrence WHERE set_id = ANY($1) ORDER BY set_id",
      [[매일, 월요일만, 한번, 늦게저장, 이른]],
    );
    expect(선.rows.map((x) => [Number(x.set_id), x.planned_on, x.planned_at.toISOString(), x.state])).toEqual([
      [매일, '2001-05-11', '2001-05-10T18:00:00.000Z', 'QUEUED'],
      [한번, '2001-05-11', '2001-05-10T18:00:00.000Z', 'QUEUED'],
    ]);
  });

  it('프로젝트마다 도는 회차는 하나 — 정한 시각이 이른 것부터 시작한다', async () => {
    const 늦은 = await 회차(await 세트('XKR 늦은'), 'QUEUED', { plannedAt: '2001-05-10T19:00Z' });
    const 이른 = await 회차(await 세트('XKR 이른'), 'QUEUED', { plannedAt: '2001-05-10T17:00Z' });
    await 점검.회차시작();
    await 점검.회차시작();
    expect((await 회차줄(이른)).state).toBe('RUNNING');
    expect((await 회차줄(늦은)).state).toBe('QUEUED');
  });

  it('빠지는 줄은 까닭을 남기고 다음 줄로 간다 — 다 빠지면 회차를 닫고 다음 회차를 이어 시작한다', async () => {
    const 앞 = await 회차(await 세트('XKR 앞', { 줄: ['FN', 'UI'] }), 'QUEUED', { plannedAt: '2001-05-10T17:00Z' });
    const 뒤 = await 회차(await 세트('XKR 뒤'), 'QUEUED', { plannedAt: '2001-05-10T18:00Z' });
    await 점검.정기실행점검(조용히, 옛날);
    expect(await 회차줄(앞)).toEqual({
      state: 'DONE',
      cur_seq: 2,
      notes: [
        { kind: 'FN', service: 'XKR', reason: 'ENV_GONE' },
        { kind: 'UI', service: 'XKR', reason: 'ENV_GONE' },
      ],
    });
    expect((await 회차줄(뒤)).state).toBe('DONE');
  });

  it('지금 줄의 실행이 도는 동안은 기다리고 끝나면 다음 줄로 간다', async () => {
    const occ = await 회차(await 세트('XKR 기다림', { 줄: ['FN', 'UI'] }), 'RUNNING', { curSeq: 1 });
    const runId = await 실행(occ, 'RUNNING');
    await 점검.정기실행점검(조용히, 옛날);
    expect(await 회차줄(occ)).toMatchObject({ state: 'RUNNING', cur_seq: 1, notes: [] });
    await pool.query("UPDATE test_run SET status = 'ABORTED' WHERE run_id = $1", [runId]);
    await 점검.정기실행점검(조용히, 옛날);
    expect(await 회차줄(occ)).toEqual({ state: 'DONE', cur_seq: 2, notes: [{ kind: 'UI', service: 'XKR', reason: 'ENV_GONE' }] });
  });

  it('이미 시작한 회차는 도중에 세트를 고쳐도 시작할 때의 줄로 이어 간다', async () => {
    const setId = await 세트('XKR 도중 고침', { 줄: ['FN', 'UI'] });
    const occ = await 회차(setId, 'RUNNING', { curSeq: 1 });
    const runId = await 실행(occ, 'RUNNING');
    await 점검.정기실행점검(조용히, 옛날);
    await pool.query('DELETE FROM sched_set_item WHERE set_id = $1', [setId]);
    await pool.query("INSERT INTO sched_set_item (set_id, seq, kind, service_id) VALUES ($1, 1, 'UI', $2), ($1, 2, 'FN', $2), ($1, 3, 'FN', $2)", [setId, 앱]);
    await pool.query("UPDATE test_run SET status = 'FINISHED' WHERE run_id = $1", [runId]);
    await 점검.정기실행점검(조용히, 옛날);
    expect(await 회차줄(occ)).toEqual({ state: 'DONE', cur_seq: 2, notes: [{ kind: 'UI', service: 'XKR', reason: 'ENV_GONE' }] });
  });

  it('시작하고 6시간이 지나면 도는 실행은 두고 회차를 닫는다', async () => {
    const occ = await 회차(await 세트('XKR 오래'), 'RUNNING', { curSeq: 1, started: new Date(Date.now() - 7 * 3_600_000).toISOString() });
    const runId = await 실행(occ, 'RUNNING');
    await 점검.정기실행점검(조용히, 옛날);
    expect(await 회차줄(occ)).toMatchObject({ state: 'DONE', notes: [{ kind: null, service: null, reason: '6시간이 지나 다음 세트를 이어 돌렸습니다' }] });
    expect((await pool.query('SELECT status FROM test_run WHERE run_id = $1', [runId])).rows[0]).toEqual({ status: 'RUNNING' });
  });

  it('호환성 실행을 회차가 세우면 시작 방식 SCHEDULED · 세트 이름 제목 · 회차 번호를 단다', async () => {
    const occ = await 회차(await 세트('XKR 호환'), 'RUNNING');
    const set = { id: 호환성세트, serviceId: 앱, name: 'XKR 호환성', devices: [] };
    const runId = await 호환성.실행세우기(set, 'qa', { username: '스케줄러', displayName: '스케줄러' }, [], { occurrenceId: occ, setName: 'XKR 호환' });
    expect((await pool.query('SELECT origin, title, sched_occurrence_id FROM test_run WHERE run_id = $1', [runId])).rows[0]).toEqual({
      origin: 'SCHEDULED',
      title: '정기 · XKR 호환 · XKR 호환성',
      sched_occurrence_id: String(occ),
    });
  });
});
