// 실행 시작 방식 · 자동 제목 · 「실패 다시」 거절 · 목록 거르기 · 직전 대비 수를 DB 로 본다 (DATABASE_URL 이 있을 때만)

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { listRuns } from './queries.js';
import { createRun, RunInputError } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XBO')";
const 케이스들 = ['XBO-001', 'XBO-002', 'XBO-003', 'XBO-004', 'XBO-UI-001'];

describe.skipIf(연결 === undefined)('실행 시작 방식', () => {
  let pool: Pool;

  async function 치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XBO'");
  }

  const 건다 = (tcIds: string[], 덧: { env?: string; rerunOf?: number; origin?: 'MANUAL' | 'SCHEDULED' } = {}) =>
    createRun({
      origin: 덧.origin ?? 'MANUAL',
      ...(덧.rerunOf === undefined ? {} : { rerunOf: 덧.rerunOf }),
      triggeredBy: 'xbo',
      env: 덧.env ?? 'qa',
      items: tcIds.map((tcId) => ({ tcId, platforms: ['desktop', 'mobile'], params: {}, expected: {} })),
    }).then((r) => r.runId);

  const 판정 = (runId: number, tcId: string, platform: string, status: 'PASS' | 'FAIL' | 'NA') =>
    pool.query('UPDATE run_item SET status = $4, finished_at = now() WHERE run_id = $1 AND tc_id = $2 AND platform = $3', [
      runId,
      tcId,
      platform,
      status,
    ]);
  // 정하지 않은 항목은 통과로 닫는다
  const 닫는다 = async (runId: number) => {
    await pool.query("UPDATE run_item SET status = 'PASS', finished_at = now() WHERE run_id = $1 AND finished_at IS NULL", [runId]);
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = now() WHERE run_id = $1", [runId]);
  };
  const 줄 = async (runId: number) => {
    const r = await pool.query<{ title: string; origin: string; rerun_of: string | null }>(
      'SELECT title, origin, rerun_of FROM test_run WHERE run_id = $1',
      [runId],
    );
    const 것 = r.rows[0]!;
    return [것.title, 것.origin, 것.rerun_of === null ? null : Number(것.rerun_of)];
  };
  const 거절 = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => (e instanceof RunInputError ? e.code : e));

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(
      `WITH s AS (
         INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XBO', 'XBO 서비스', '#445566', '', 'xbo') RETURNING id
       )
       INSERT INTO service_env (service_id, env, base_url) SELECT id, e, 'https://qa.example.com' FROM s, unnest(ARRAY['qa', 'cmp']) e`,
    );
    for (const tcId of 케이스들) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $2, '["desktop","mobile"]', '[]', $3, '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
        [tcId, `${tcId} 이름`, `xbo/${tcId}.spec.ts`],
      );
    }
    await pool.query("UPDATE test_case SET is_active = false WHERE tc_id = 'XBO-004'");
  });

  afterAll(async () => {
    await 치운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('제목은 서버가 짓는다 — 그 종류 전체 · 한 건 · 여러 건 · 정기', async () => {
    expect(await 줄(await 건다(['XBO-003', 'XBO-001', 'XBO-002']))).toEqual(['기능 전체 3건', 'MANUAL', null]);
    expect(await 줄(await 건다(['XBO-002']))).toEqual(['XBO-002 XBO-002 이름', 'SINGLE', null]);
    expect(await 줄(await 건다(['XBO-003', 'XBO-002']))).toEqual(['XBO-002 외 1건', 'MANUAL', null]);
    expect(await 줄(await 건다(['XBO-001', 'XBO-002', 'XBO-003', 'XBO-004']))).toEqual(['XBO-001 외 3건', 'MANUAL', null]);
    expect(await 줄(await 건다(['XBO-UI-001'], { origin: 'SCHEDULED' }))).toEqual(['정기 · UI 전체 1건', 'SCHEDULED', null]);
  });

  it('실패 다시는 원래 실행에서 실패한 케이스만 받고 그 밖은 실행을 만들기 전에 BAD_RERUN 으로 거절한다', async () => {
    const 원래 = await 건다(['XBO-001', 'XBO-002', 'XBO-003']);
    await 판정(원래, 'XBO-001', 'mobile', 'FAIL');
    await 판정(원래, 'XBO-002', 'desktop', 'FAIL');
    const 도는것 = await 건다(['XBO-001']);
    await 판정(도는것, 'XBO-001', 'desktop', 'FAIL');
    const 앞수 = await pool.query(`SELECT count(*)::int AS n FROM test_run WHERE service_id = ${서비스번호}`);

    expect(await 거절(건다(['XBO-001'], { rerunOf: 원래 }))).toBe('BAD_RERUN');
    await 닫는다(원래);
    expect(await 거절(건다(['XBO-001', 'XBO-003'], { rerunOf: 원래 }))).toBe('BAD_RERUN');
    expect(await 거절(건다(['XBO-UI-001'], { rerunOf: 원래 }))).toBe('BAD_RERUN');
    expect(await 거절(건다(['XBO-001'], { rerunOf: 도는것 }))).toBe('BAD_RERUN');
    expect(await 거절(건다(['XBO-001'], { rerunOf: 999_999_999 }))).toBe('BAD_RERUN');
    const 남의것 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, finished_at)
       VALUES ('XBO 남의 실행', 'xbo', 'qa', 'FINISHED', NULL, '', '', '', 'FN', now()) RETURNING run_id`,
    );
    const 남의번호 = Number(남의것.rows[0]!.run_id);
    const 말 = await 건다(['XBO-001'], { rerunOf: 남의번호 }).catch((e: unknown) => (e as Error).message);
    await pool.query('DELETE FROM test_run WHERE run_id = $1', [남의번호]);
    expect(말).toBe(`이 서비스에 실행 ${String(남의번호)}이 없다`);
    expect((await pool.query(`SELECT count(*)::int AS n FROM test_run WHERE service_id = ${서비스번호}`)).rows[0]).toEqual(앞수.rows[0]);

    const 다시 = await 건다(['XBO-002', 'XBO-001'], { rerunOf: 원래 });
    expect(await 줄(다시)).toEqual([`RUN ${String(원래)}의 실패 2건 다시`, 'RERUN', 원래]);
    // 한 건은 새 실행이 아니라 원래 실행에 붙는다 (도메인/실행 §3.2)
    const 일부 = await 건다(['XBO-001'], { rerunOf: 원래 });
    expect(await 줄(일부)).toEqual(['XBO-001 XBO-001 이름', 'SINGLE', 원래]);
  });

  it('DB 는 RERUN 이 아닌 실행에 원래 실행을 못 달게 막고, 원래 실행이 지워지면 비운다', async () => {
    const 원래 = await 건다(['XBO-001', 'XBO-002']);
    await 판정(원래, 'XBO-001', 'desktop', 'FAIL');
    await 판정(원래, 'XBO-002', 'desktop', 'FAIL');
    await 닫는다(원래);
    const 직접 = await 건다(['XBO-002', 'XBO-003']);
    await expect(pool.query('UPDATE test_run SET rerun_of = $1 WHERE run_id = $2', [원래, 직접])).rejects.toThrow(/test_run_rerun_of_check/);
    await expect(pool.query("UPDATE test_run SET origin = 'AGAIN' WHERE run_id = $1", [직접])).rejects.toThrow(/test_run_origin_check/);

    const 다시 = await 건다(['XBO-001', 'XBO-002'], { rerunOf: 원래 });
    await pool.query('DELETE FROM run_item WHERE run_id = $1', [원래]);
    await pool.query('DELETE FROM test_run WHERE run_id = $1', [원래]);
    expect(await 줄(다시)).toEqual([`RUN ${String(원래)}의 실패 2건 다시`, 'RERUN', null]);
    const 목록 = await listRuns('XBO', 1, 50, { origin: 'RERUN' });
    expect(목록.items.find((r) => r.runId === 다시)?.rerunOf).toBeNull();
  });

  it('목록은 시작 방식 · 기간 · 케이스 번호와 이름으로 거르고 줄에 디바이스를 싣는다', async () => {
    const 오래된 = await 건다(['XBO-003', 'XBO-002']);
    await pool.query("UPDATE test_run SET started_at = now() - interval '30 days' WHERE run_id = $1", [오래된]);

    const 정기 = await listRuns('XBO', 1, 50, { origin: 'SCHEDULED' });
    expect(정기.items.map((r) => [r.title, r.origin])).toEqual([['정기 · UI 전체 1건', 'SCHEDULED']]);
    expect(정기.summary.runs).toBe(1);

    const 최근 = await listRuns('XBO', 1, 50, { days: 14 });
    const 전체 = await listRuns('XBO', 1, 50, {});
    expect(최근.items.some((r) => r.runId === 오래된)).toBe(false);
    expect(전체.items.some((r) => r.runId === 오래된)).toBe(true);

    const 번호로 = await listRuns('XBO', 1, 50, { q: 'xbo-003' });
    expect(번호로.items.find((r) => r.runId === 오래된)?.title).toBe('XBO-002 외 1건');
    const 이름으로 = await listRuns('XBO', 1, 50, { q: 'XBO-003 이름' });
    expect(이름으로.items.map((r) => r.runId)).toEqual(번호로.items.map((r) => r.runId));
    expect(이름으로.items.find((r) => r.runId === 오래된)?.platforms).toEqual(['desktop', 'mobile']);
  });

  it('목록 줄은 디바이스마다 실패한 케이스 수를 싣는다 — 회차를 접고 실패 없는 디바이스도 0', async () => {
    const 실행 = await 건다(['XBO-001', 'XBO-002', 'XBO-003']);
    await 판정(실행, 'XBO-001', 'mobile', 'FAIL');
    await 판정(실행, 'XBO-002', 'mobile', 'FAIL');
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, precondition, params, expected, status, finished_at, attempt, file_path, timeout_ms, param_schema, expected_schema)
       SELECT run_id, tc_id, platform, tc_name, precondition, params, expected, status, finished_at, 2, file_path, timeout_ms, param_schema, expected_schema
         FROM run_item WHERE run_id = $1 AND tc_id = 'XBO-001' AND platform = 'mobile'`,
      [실행],
    );
    await 닫는다(실행);

    const 한줄 = (await listRuns('XBO', 1, 50, {})).items.find((r) => r.runId === 실행);
    expect(한줄?.counts.fail).toBe(3);
    expect(한줄?.failCases).toEqual({ desktop: 0, mobile: 2 });
  });

  it('목록 줄은 앱 항목이 남긴 폰 모델을 겹치지 않게 글자 차례로 싣는다 — 기기가 없으면 빈 배열', async () => {
    const 실행 = await 건다(['XBO-001', 'XBO-002', 'XBO-003']);
    const 기기 = (tcId: string, model: string) =>
      pool.query('UPDATE run_item SET device = $3 WHERE run_id = $1 AND tc_id = $2', [실행, tcId, JSON.stringify({ model, osVersion: '14', appVersion: null })]);
    await 기기('XBO-001', 'SM-S911N');
    await 기기('XBO-002', 'Pixel 7');
    await 기기('XBO-003', 'SM-S911N');
    await 닫는다(실행);
    const 빈 = await 건다(['XBO-001', 'XBO-002']);
    await 닫는다(빈);

    const 목록 = await listRuns('XBO', 1, 50, {});
    expect(목록.items.find((r) => r.runId === 실행)?.devices).toEqual(['Pixel 7', 'SM-S911N']);
    expect(목록.items.find((r) => r.runId === 빈)?.devices).toEqual([]);
  });

  it('직전 대비는 같은 대상 서버의 앞 실행과 견준 케이스 수다 — 디바이스를 접고, 앞이 없거나 도는 중이면 null', async () => {
    const 첫 = await 건다(['XBO-001', 'XBO-002', 'XBO-003'], { env: 'cmp' });
    await 판정(첫, 'XBO-002', 'desktop', 'FAIL');
    await 닫는다(첫);
    const 둘 = await 건다(['XBO-001', 'XBO-002', 'XBO-003'], { env: 'cmp' });
    await 판정(둘, 'XBO-001', 'desktop', 'FAIL');
    await 판정(둘, 'XBO-001', 'mobile', 'FAIL');
    await 판정(둘, 'XBO-002', 'mobile', 'FAIL');
    await 닫는다(둘);
    const 셋 = await 건다(['XBO-001', 'XBO-002'], { env: 'cmp' });

    const 목록 = await listRuns('XBO', 1, 50, { env: 'cmp' });
    const 대비 = new Map(목록.items.map((r) => [r.runId, r.change]));
    expect(대비.get(첫)).toBeNull();
    expect(대비.get(둘)).toEqual({ newFail: 2, stillFail: 0, fixed: 1 });
    expect(대비.get(셋)).toBeNull();

    await 판정(셋, 'XBO-001', 'desktop', 'FAIL');
    await 닫는다(셋);
    const 다음 = await listRuns('XBO', 1, 50, { env: 'cmp' });
    expect(다음.items.find((r) => r.runId === 셋)?.change).toEqual({ newFail: 0, stillFail: 1, fixed: 2 });
  });
});
