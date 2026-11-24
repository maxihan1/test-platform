// 프로시저가 든 실행의 한 건 · 다시 돌리기 · 마지막 결과를 DB 로 본다 (도메인/실행 §3.2 「테스트 프로시저 실행」 「한 건 · 다시 돌리기 · 시험 실행」 · 「판정이 아닌 결과」 · DATABASE_URL 이 있을 때만)

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { caseHistory, lastByCase } from './history.js';
import { findRun } from './queries.js';
import { 한건인가 } from './single.js';
import { createRun, RunInputError } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XPN')";
const 프로시저케이스 = ['XPN-FN-101', 'XPN-FN-102', 'XPN-FN-103'];
const 케이스들 = [...프로시저케이스, 'XPN-FN-201', 'XPN-FN-202', 'XPN-UI-301', 'XPN-UI-302'];

// 러너가 프로시저를 도는 판이라고 답한다 — 기본값은 진짜 러너 주소를 묻는다
const 돈다 = async (): Promise<boolean> => false;

describe.skipIf(연결 === undefined)('프로시저가 든 실행의 한 건 · 다시 돌리기', () => {
  let pool: Pool;

  async function 실행을치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM run_exec WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
  }

  async function 치운다(): Promise<void> {
    await 실행을치운다();
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XPN'");
  }

  const 건다 = (tcIds: string[], 덧: { rerunOf?: number; repeat?: number } = {}) =>
    createRun(
      {
        origin: 'MANUAL',
        ...(덧.rerunOf === undefined ? {} : { rerunOf: 덧.rerunOf }),
        ...(덧.repeat === undefined ? {} : { repeat: 덧.repeat }),
        triggeredBy: 'xpn',
        triggeredByName: '프로시저 실행자',
        env: 'qa',
        items: tcIds.map((tcId) => ({ tcId, platforms: ['android' as const], params: {}, expected: {} })),
      },
      돈다,
    );
  const 거절 = (일: Promise<unknown>) => 일.then(() => null, (e: unknown) => (e instanceof RunInputError ? e.code : String(e)));

  const 판정 = (runId: number, tcId: string, status: 'PASS' | 'FAIL' | 'NA', 사유?: string) =>
    pool.query('UPDATE run_item SET status = $3, error = $4, finished_at = clock_timestamp() WHERE run_id = $1 AND tc_id = $2', [
      runId,
      tcId,
      status,
      사유 === undefined ? null : JSON.stringify({ message: 사유 }),
    ]);
  // 정하지 않은 항목은 통과로 닫는다
  const 닫는다 = async (runId: number) => {
    await pool.query("UPDATE run_item SET status = 'PASS', finished_at = clock_timestamp() WHERE run_id = $1 AND finished_at IS NULL", [runId]);
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = clock_timestamp() WHERE run_id = $1", [runId]);
  };
  const 줄 = async (runId: number) =>
    (await pool.query<{ origin: string; rerun_of: string | null; kind: string; title: string; n: number }>(
      'SELECT origin, rerun_of, kind, title, (SELECT count(*)::int FROM run_item i WHERE i.run_id = r.run_id) AS n FROM test_run r WHERE run_id = $1',
      [runId],
    )).rows[0]!;

  /** 어젯밤 실행 — 프로시저에서 102 실패 · 103 Blocked, 옛 꼴 201 시간 초과 · 202 실패 */
  async function 어젯밤(): Promise<number> {
    const { runId } = await 건다(['XPN-FN-101', 'XPN-FN-201', 'XPN-FN-202']);
    await 판정(runId, 'XPN-FN-102', 'FAIL');
    await 판정(runId, 'XPN-FN-103', 'NA', 'BLOCKED');
    await 판정(runId, 'XPN-FN-201', 'NA', 'TIMEOUT');
    await 판정(runId, 'XPN-FN-202', 'FAIL');
    await 닫는다(runId);
    return runId;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(
      `WITH s AS (
         INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, procedure_mode) VALUES ('XPN', 'XPN 앱', '#445566', '', 'xpn', 'APP', true) RETURNING id
       )
       INSERT INTO service_env (service_id, env, base_url) SELECT id, 'qa', 'https://qa.example.com' FROM s`,
    );
    for (const [k, tcId] of 케이스들.entries()) {
      const 안 = 프로시저케이스.includes(tcId);
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, proc_id, proc_seq, proc_name)
         VALUES ($1, $2, '["android"]', '[]', $3, '{"type":"object","properties":{}}', '{"type":"object","properties":{}}', $4, $5, $6)`,
        [tcId, `${tcId} 이름`, 안 ? 'xpn/XPN-TP-001.spec.ts' : `xpn/${tcId}.spec.ts`, 안 ? 'XPN-TP-001' : null, 안 ? k + 1 : null, 안 ? '글쓰기' : null],
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

  it('프로시저의 케이스 하나를 걸든 다 걸든 한 건이고 그 케이스가 든 가장 최근 실행에 붙는다', async () => {
    const 원래 = await 어젯밤();
    expect(await 줄(원래)).toMatchObject({ origin: 'MANUAL', n: 5 });

    const 하나 = await 건다(['XPN-FN-102']);
    expect(하나.attachedTo).toBe(원래);
    expect(await 줄(하나.runId)).toMatchObject({ origin: 'SINGLE', rerun_of: String(원래), n: 3 });
    await 닫는다(하나.runId);

    const 전부 = await 건다(프로시저케이스);
    expect(전부.attachedTo).toBe(원래);
    expect(await 줄(전부.runId)).toMatchObject({ origin: 'SINGLE', rerun_of: String(원래), n: 3 });
  });

  it('옛 꼴 케이스가 섞이거나 반복이 2 이상이면 한 건이 아니다', async () => {
    // 프로시저 둘에 걸친 요청도 한 건이 아니다
    expect(한건인가([{ tcId: 'XPN-FN-101', procId: 'XPN-TP-001' }, { tcId: 'XPN-FN-401', procId: 'XPN-TP-002' }], 1)).toBe(false);
    expect(한건인가([{ tcId: 'XPN-FN-101', procId: 'XPN-TP-001' }, { tcId: 'XPN-FN-102', procId: 'XPN-TP-001' }], 1)).toBe(true);
    await 어젯밤();
    const 섞음 = await 건다(['XPN-FN-102', 'XPN-FN-201']);
    expect(섞음.attachedTo).toBeNull();
    expect(await 줄(섞음.runId)).toMatchObject({ origin: 'MANUAL', rerun_of: null });
    const 반복 = await 건다(['XPN-FN-102'], { repeat: 2 });
    expect(await 줄(반복.runId)).toMatchObject({ origin: 'MANUAL', rerun_of: null, n: 6 });
  });

  it('통째로 다시 돈 한 건은 판정이 난 줄만 붙은 실행의 지금 결과를 고친다 — 판정이 아닌 결과는 앞선 통과를 덮지 않는다', async () => {
    const 원래 = await 어젯밤();
    const 한건 = await 건다(['XPN-FN-102'], { rerunOf: 원래 });
    expect(한건.attachedTo).toBe(원래);
    await 판정(한건.runId, 'XPN-FN-101', 'NA', 'TIMEOUT');
    await 판정(한건.runId, 'XPN-FN-102', 'PASS');
    await 판정(한건.runId, 'XPN-FN-103', 'PASS');
    await 닫는다(한건.runId);

    const 상세 = await findRun(원래);
    const 지금 = (tcId: string) => 상세!.items.find((i) => i.tcId === tcId)!;
    expect(지금('XPN-FN-101')).toMatchObject({ status: 'PASS', rerun: null });
    expect(지금('XPN-FN-102')).toMatchObject({ status: 'PASS', rerun: { runId: 한건.runId, original: { status: 'FAIL' } } });
    expect(지금('XPN-FN-103')).toMatchObject({ status: 'PASS', rerun: { runId: 한건.runId, original: { status: 'NA' } } });
    expect(상세!.counts).toMatchObject({ total: 5, pass: 3, fail: 1, na: 1, blocked: 0 });
  });

  it('다시 돌리기는 프로시저로 돈 케이스면 미실행으로 끝난 것도 받고 옛 꼴 케이스는 실패한 것만 받는다', async () => {
    const 원래 = await 어젯밤();
    // 통과한 프로시저 케이스 · 시간 초과로 끝난 옛 꼴 케이스는 거절한다
    expect(await 거절(건다(['XPN-FN-101'], { rerunOf: 원래 }))).toBe('BAD_RERUN');
    expect(await 거절(건다(['XPN-FN-201'], { rerunOf: 원래 }))).toBe('BAD_RERUN');
    expect(await 거절(건다(['XPN-FN-103', 'XPN-FN-201'], { rerunOf: 원래 }))).toBe('BAD_RERUN');

    // Blocked 로 끝난 케이스만 실어도 받는다 — 펼쳐서 든 101 은 통과했어도 같이 돈다
    const 막힌것 = await 건다(['XPN-FN-103'], { rerunOf: 원래 });
    expect(await 줄(막힌것.runId)).toMatchObject({ origin: 'SINGLE', rerun_of: String(원래), n: 3 });
    await 닫는다(막힌것.runId);

    // 준비 실패로 하나도 안 돈 실행은 프로시저 줄이 미실행이어도 거절한다
    const 준비실패 = await 건다(['XPN-FN-101', 'XPN-FN-202']);
    await pool.query("UPDATE run_item SET status = 'NA', error = '{\"message\":\"PREP_FAILED\"}', finished_at = clock_timestamp() WHERE run_id = $1", [준비실패.runId]);
    await pool.query("UPDATE test_run SET status = 'PREP_FAILED', finished_at = clock_timestamp() WHERE run_id = $1", [준비실패.runId]);
    expect(await 거절(건다(['XPN-FN-101', 'XPN-FN-202'], { rerunOf: 준비실패.runId }))).toBe('BAD_RERUN');

    // 제목의 N 은 펼치기 전에 고른 케이스 수다
    const 여럿 = await 건다(['XPN-FN-103', 'XPN-FN-202'], { rerunOf: 원래 });
    expect(await 줄(여럿.runId)).toEqual({ origin: 'RERUN', rerun_of: String(원래), kind: 'FN', title: `RUN ${String(원래)}의 Fail 2건 다시`, n: 4 });
  });

  it('「프로시저 작성」을 켜기 전에 돈 UI 실행도 켠 뒤에 다시 돌린다', async () => {
    await pool.query("UPDATE service SET procedure_mode = false WHERE prefix = 'XPN'");
    let 켜기전: number;
    try {
      ({ runId: 켜기전 } = await 건다(['XPN-UI-301', 'XPN-UI-302']));
    } finally {
      await pool.query("UPDATE service SET procedure_mode = true WHERE prefix = 'XPN'");
    }
    expect(await 줄(켜기전)).toMatchObject({ kind: 'UI', origin: 'MANUAL' });
    await 판정(켜기전, 'XPN-UI-301', 'FAIL');
    await 판정(켜기전, 'XPN-UI-302', 'FAIL');
    await 닫는다(켜기전);

    const 다시 = await 건다(['XPN-UI-301', 'XPN-UI-302'], { rerunOf: 켜기전 });
    expect(await 줄(다시.runId)).toMatchObject({ origin: 'RERUN', rerun_of: String(켜기전), kind: 'FN' });
  });

  it('케이스의 마지막 결과는 가장 늦게 끝난 줄 그대로다 — Blocked 줄은 건너뛰지 않고 중단 줄만 건너뛴다', async () => {
    const 앞 = await 건다(['XPN-FN-101', 'XPN-FN-201']);
    await 닫는다(앞.runId);
    const 원래 = await 어젯밤();
    const 멈춘 = await 건다(['XPN-FN-101', 'XPN-FN-202']);
    for (const tcId of [...프로시저케이스, 'XPN-FN-202']) await 판정(멈춘.runId, tcId, 'NA', 'ABORTED');
    await pool.query("UPDATE test_run SET status = 'ABORTED', finished_at = clock_timestamp() WHERE run_id = $1", [멈춘.runId]);

    const 마지막 = new Map((await lastByCase(['XPN'])).map((r) => [r.tcId, r]));
    expect(마지막.get('XPN-FN-103')).toMatchObject({ status: 'NA', runId: 원래 });
    expect(마지막.get('XPN-FN-102')).toMatchObject({ status: 'FAIL', runId: 원래 });
    expect(마지막.get('XPN-FN-101')).toMatchObject({ status: 'PASS', runId: 원래 });
  });

  it('마지막 결과와 실행 기록 줄이 Blocked 줄의 막은 케이스 번호를 싣는다 — 판정값은 미실행 그대로다', async () => {
    const runId = await 어젯밤();
    await pool.query("UPDATE run_item SET blocked_by = 'XPN-FN-102' WHERE run_id = $1 AND tc_id = 'XPN-FN-103'", [runId]);

    const 마지막 = new Map((await lastByCase(['XPN'])).map((r) => [r.tcId, r]));
    expect(마지막.get('XPN-FN-103')).toMatchObject({ status: 'NA', runId, blockedBy: 'XPN-FN-102', blocked: true });
    expect(마지막.get('XPN-FN-102')).toMatchObject({ status: 'FAIL', blockedBy: null, blocked: false });
    expect(마지막.get('XPN-FN-201')).toMatchObject({ status: 'NA', blockedBy: null, blocked: false });
    expect(마지막.get('XPN-FN-101')).toMatchObject({ status: 'PASS', blocked: false });

    const 기록 = await caseHistory('XPN-FN-103', undefined, 1, 50);
    expect(기록.items.find((r) => r.runId === runId)).toMatchObject({ status: 'NA', blockedBy: 'XPN-FN-102', blocked: true });
    expect((await caseHistory('XPN-FN-102', undefined, 1, 50)).items.find((r) => r.runId === runId)).toMatchObject({ status: 'FAIL', blockedBy: null, blocked: false });
    expect((await caseHistory('XPN-FN-201', undefined, 1, 50)).items.find((r) => r.runId === runId)).toMatchObject({ status: 'NA', blockedBy: null, blocked: false });
  });

  it('막은 케이스 번호가 없는 Blocked 줄도 blocked 가 true 이고 blockedBy 는 null 이다', async () => {
    const runId = await 어젯밤();

    expect(new Map((await lastByCase(['XPN'])).map((r) => [r.tcId, r])).get('XPN-FN-103')).toMatchObject({ status: 'NA', blockedBy: null, blocked: true });
    expect((await caseHistory('XPN-FN-103', undefined, 1, 50)).items.find((r) => r.runId === runId)).toMatchObject({ status: 'NA', blockedBy: null, blocked: true });
  });
});
