// 한 건 실행이 묶음 실행에 붙어 지금 결과를 고치는지 DB 로 본다 (DATABASE_URL 이 있을 때만 · 도메인/실행 §3.2 「★ 한 건 실행은 묶음 실행에 붙는다」)

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { caseHistory } from './history.js';
import { findRun, listRuns } from './queries.js';
import { 붙을실행 } from './single.js';
import { createRun } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XJA')";
const 케이스들 = ['XJA-001', 'XJA-002', 'XJA-003'];

describe.skipIf(연결 === undefined)('한 건 실행은 묶음 실행에 붙는다', () => {
  let pool: Pool;

  async function 실행을치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
  }

  async function 치운다(): Promise<void> {
    await 실행을치운다();
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XJA'");
  }

  const 건다 = (
    tcIds: string[],
    덧: { env?: string; rerunOf?: number; repeat?: number; platforms?: ('desktop' | 'mobile')[] } = {},
  ) =>
    createRun({
      origin: 'MANUAL',
      ...(덧.rerunOf === undefined ? {} : { rerunOf: 덧.rerunOf }),
      ...(덧.repeat === undefined ? {} : { repeat: 덧.repeat }),
      triggeredBy: 'xja',
      triggeredByName: '한건 실행자',
      notifySlack: true,
      env: 덧.env ?? 'qa',
      items: tcIds.map((tcId) => ({ tcId, platforms: 덧.platforms ?? ['desktop', 'mobile'], params: {}, expected: {} })),
    });

  const 판정 = (runId: number, tcId: string, platform: string, status: 'PASS' | 'FAIL' | 'NA') =>
    pool.query('UPDATE run_item SET status = $4, finished_at = clock_timestamp() WHERE run_id = $1 AND tc_id = $2 AND platform = $3', [
      runId,
      tcId,
      platform,
      status,
    ]);
  // 정하지 않은 항목은 통과로 닫는다
  const 닫는다 = async (runId: number) => {
    await pool.query("UPDATE run_item SET status = 'PASS', finished_at = clock_timestamp() WHERE run_id = $1 AND finished_at IS NULL", [runId]);
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = clock_timestamp() WHERE run_id = $1", [runId]);
  };
  const 줄 = async (runId: number) =>
    (await pool.query<{ origin: string; rerun_of: string | null; notify_slack: boolean }>(
      'SELECT origin, rerun_of, notify_slack FROM test_run WHERE run_id = $1',
      [runId],
    )).rows[0]!;

  const 붙을 = async (tcId: string, env: string, platforms: string[]) => {
    const 답 = await 붙을실행(tcId, env, platforms);
    return 'target' in 답 ? 답.target : 답;
  };

  /** 어젯밤 전체 실행 — XJA-001 데스크톱만 실패 */
  async function 어젯밤(): Promise<number> {
    const { runId } = await 건다(케이스들);
    await 판정(runId, 'XJA-001', 'desktop', 'FAIL');
    await 닫는다(runId);
    return runId;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(
      `WITH s AS (
         INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XJA', 'XJA 서비스', '#445566', '', 'xja') RETURNING id
       )
       INSERT INTO service_env (service_id, env, base_url) SELECT id, e, 'https://qa.example.com' FROM s, unnest(ARRAY['qa', 'stg']) e`,
    );
    for (const tcId of 케이스들) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $2, '["desktop","mobile"]', '[]', $3, '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
        [tcId, `${tcId} 이름`, `xja/${tcId}.spec.ts`],
      );
    }
  });

  beforeEach(실행을치운다);

  afterAll(async () => {
    await 치운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('고친 케이스 한 건이 통과하면 어젯밤 실행의 지금 결과가 통과가 되고 실행 기록에 새 줄이 없다', async () => {
    const 원래 = await 어젯밤();
    const 한건 = await 건다(['XJA-001'], { platforms: ['desktop'] });
    expect(한건.attachedTo).toBe(원래);
    expect(await 줄(한건.runId)).toEqual({ origin: 'SINGLE', rerun_of: String(원래), notify_slack: false });
    await 판정(한건.runId, 'XJA-001', 'desktop', 'PASS');
    await 닫는다(한건.runId);

    const 목록 = await listRuns('XJA', 1, 50, {});
    expect(목록.items.map((r) => r.runId)).toEqual([원래]);
    expect(목록.items[0]!.counts).toMatchObject({ total: 6, pass: 6, fail: 0 });
    expect(목록.items[0]!.failCases).toEqual({ desktop: 0, mobile: 0 });
    expect(목록.summary).toMatchObject({ runs: 1, allPass: 1, hasFail: 0 });
    expect((await listRuns('XJA', 1, 50, { state: 'failed' })).items).toEqual([]);

    const 상세 = await findRun(원래);
    expect(상세!.counts).toMatchObject({ pass: 6, fail: 0 });
    const 덮인것 = 상세!.items.find((i) => i.tcId === 'XJA-001' && i.platform === 'desktop')!;
    const 원래항목 = await pool.query<{ history_id: string }>(
      "SELECT history_id FROM run_item WHERE run_id = $1 AND tc_id = 'XJA-001' AND platform = 'desktop'",
      [원래],
    );
    expect(덮인것.status).toBe('PASS');
    expect(덮인것.rerun).toMatchObject({
      runId: 한건.runId,
      triggeredBy: '한건 실행자',
      original: { historyId: Number(원래항목.rows[0]!.history_id), status: 'FAIL' },
    });
    expect(상세!.items.find((i) => i.tcId === 'XJA-001' && i.platform === 'mobile')!.rerun).toBeNull();
    // 한 건 실행 번호 자체를 물으면 바꿔 끼우지 않은 제 항목이다
    expect((await findRun(한건.runId))!.items.map((i) => [i.tcId, i.status, i.rerun])).toEqual([['XJA-001', 'PASS', null]]);
  });

  it('미실행으로 끝난 한 건은 덮지 않고, 여럿이 붙으면 가장 늦게 끝난 판정이 이긴다', async () => {
    const 원래 = await 어젯밤();
    const 못돈것 = await 건다(['XJA-001'], { platforms: ['desktop'] });
    await 판정(못돈것.runId, 'XJA-001', 'desktop', 'NA');
    await 닫는다(못돈것.runId);
    expect((await findRun(원래))!.counts.fail).toBe(1);

    const 통과 = await 건다(['XJA-001'], { platforms: ['desktop'] });
    await 판정(통과.runId, 'XJA-001', 'desktop', 'PASS');
    await 닫는다(통과.runId);
    const 다시실패 = await 건다(['XJA-001'], { platforms: ['desktop'] });
    await 판정(다시실패.runId, 'XJA-001', 'desktop', 'FAIL');
    await 닫는다(다시실패.runId);
    const 상세 = await findRun(원래);
    expect(상세!.counts.fail).toBe(1);
    expect(상세!.items.find((i) => i.tcId === 'XJA-001' && i.platform === 'desktop')!.rerun!.runId).toBe(다시실패.runId);
  });

  it('붙는 곳 — 같은 대상 서버 · 겹치는 디바이스가 있는 끝난 실행 가운데 가장 늦게 시작한 것. 스모크 · 도는 실행 · 반복 실행은 아니다', async () => {
    expect((await 건다(['XJA-001'])).attachedTo).toBeNull();
    await 실행을치운다();

    const 원래 = await 어젯밤();
    const 다른서버 = await 건다(케이스들, { env: 'stg' });
    await 닫는다(다른서버.runId);
    const 스모크 = await 건다(케이스들);
    await pool.query("UPDATE test_run SET build_stage = 'SMOKE' WHERE run_id = $1", [스모크.runId]);
    await 닫는다(스모크.runId);
    const 모바일만 = await 건다(['XJA-002', 'XJA-003'], { platforms: ['mobile'] });
    await 닫는다(모바일만.runId);
    const 도는것 = await 건다(['XJA-001', 'XJA-002']);

    expect(await 붙을('XJA-001', 'qa', ['desktop'])).toMatchObject({ runId: 원래 });
    expect(await 붙을('XJA-002', 'qa', ['mobile'])).toMatchObject({ runId: 모바일만.runId });
    expect(await 붙을('XJA-001', 'stg', ['desktop'])).toMatchObject({ runId: 다른서버.runId });
    await 닫는다(도는것.runId);
    expect(await 붙을('XJA-001', 'qa', ['desktop'])).toMatchObject({ runId: 도는것.runId, title: 'XJA-001 외 1건' });

    const 반복 = await 건다(['XJA-001', 'XJA-002'], { repeat: 2 });
    await 닫는다(반복.runId);
    expect(await 붙을('XJA-001', 'qa', ['desktop'])).toBeNull();
    expect((await 건다(['XJA-001'])).attachedTo).toBeNull();
    expect(await 붙을('XJA-001', 'prod', ['desktop'])).toEqual({ error: '대상 서버 prod 가 없다' });
    expect(await 붙을('XJA-001', 'qa', ['android'])).toEqual({ error: 'XJA-001 가 선언하지 않은 디바이스가 있다' });
  });

  it('실패 1건 다시 실행은 rerunOf 실행에 붙고, 그 실행이 반복 실행이면 지금처럼 RERUN 새 실행이다', async () => {
    const 원래 = await 어젯밤();
    const 나중 = await 건다(케이스들);
    await 닫는다(나중.runId);
    const 다시 = await 건다(['XJA-001'], { rerunOf: 원래, platforms: ['desktop'] });
    expect(다시.attachedTo).toBe(원래);
    expect((await 줄(다시.runId)).origin).toBe('SINGLE');

    // 한 건 실행 번호를 다시 실행의 원래 실행으로 보내면 거절한다 — 어느 실행 결과도 안 고친다
    await expect(건다(['XJA-001'], { rerunOf: 다시.runId })).rejects.toMatchObject({ code: 'BAD_RERUN' });
    // 대상 서버를 바꿔 다시 돌리면 원래 실행을 고치지 않고 그 서버에서 붙을 곳을 고른다
    expect((await 건다(['XJA-001'], { rerunOf: 원래, env: 'stg', platforms: ['desktop'] })).attachedTo).toBeNull();

    const 반복 = await 건다(['XJA-001', 'XJA-002'], { repeat: 2 });
    await 판정(반복.runId, 'XJA-001', 'desktop', 'FAIL');
    await 닫는다(반복.runId);
    const 반복다시 = await 건다(['XJA-001'], { rerunOf: 반복.runId });
    expect(반복다시.attachedTo).toBeNull();
    expect(await 줄(반복다시.runId)).toMatchObject({ origin: 'RERUN', rerun_of: String(반복.runId) });
  });

  it('케이스 이력은 바꿔 끼우지 않고 줄마다 시작 방식과 붙은 실행을 싣는다', async () => {
    const 원래 = await 어젯밤();
    const 한건 = await 건다(['XJA-001'], { platforms: ['desktop'] });
    await 판정(한건.runId, 'XJA-001', 'desktop', 'PASS');
    await 닫는다(한건.runId);

    const 이력 = await caseHistory('XJA-001', 'desktop', 1, 20);
    expect(이력.items.map((r) => [r.runId, r.status, r.origin, r.rerunOf])).toEqual([
      [한건.runId, 'PASS', 'SINGLE', 원래],
      [원래, 'FAIL', 'MANUAL', null],
    ]);
  });
});
