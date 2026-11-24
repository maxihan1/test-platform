// 프로시저 실행 단위의 답을 케이스 줄 여럿에 한 번에 저장하고, 닫기 · 조회가 실행 단위를 따라가는지 본다
// (도메인/실행 §3.2 「테스트 프로시저 실행」 · 공통/4 「테스트 프로시저 표」 · DATABASE_URL 이 있을 때만)

import type { CaseResult, CasesExecuteResponse, RunningStep } from '@platform/kit';
import Fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { finishExec, 실행단위를시작한다 } from './execFinish.js';
import { 실행단위자리 } from './execRead.js';
import { 준비실패로닫는다 } from './prep.js';
import { 진행경로 } from './progressRoute.js';
import { findItem, findRun } from './queries.js';
import { 러너진행 } from './runnerProgress.js';
import { abortRun, createRun, finishItem, unfinishedItems, type PendingItem } from './store.js';

vi.mock('./runnerProgress.js', async (원본) => ({ ...(await 원본<typeof import('./runnerProgress.js')>()), 러너진행: vi.fn(async () => ({ items: [], scenarios: [] })) }));

const 연결 = process.env.DATABASE_URL;
const 프로시저 = 'XEU-TP-001';
const 케이스들 = ['XEU-FN-101', 'XEU-FN-102', 'XEU-FN-103', 'XEU-FN-201'];
const 서비스 = "(SELECT id FROM service WHERE prefix = 'XEU')";
const 돈다 = async (): Promise<boolean> => false;

describe.skipIf(연결 === undefined)('실행 단위 저장 — 테스트 프로시저', () => {
  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  async function 실행을치운다(): Promise<void> {
    await q(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id IN ${서비스})`);
    await q(`DELETE FROM run_exec WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id IN ${서비스})`);
    await q(`DELETE FROM test_run WHERE service_id IN ${서비스}`);
  }

  async function 치운다(): Promise<void> {
    await 실행을치운다();
    await q('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await q(`DELETE FROM service_env WHERE service_id IN ${서비스}`);
    await q("DELETE FROM service WHERE prefix = 'XEU'");
  }

  const 케이스 = (tcId: string, 차례: number | null, 단계들: string[], 칸: string) =>
    q(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, proc_id, proc_seq, proc_name, step_titles)
       VALUES ($1, $1, '["android"]', '[]', $2, $3, '{"type":"object","properties":{}}', $4, $5, $6, $7)`,
      [
        tcId,
        차례 === null ? `xeu/${tcId}.spec.ts` : 'xeu/XEU-TP-001.spec.ts',
        JSON.stringify({ type: 'object', properties: { [칸]: { type: 'string', default: `${tcId} 기본값` } } }),
        차례 === null ? null : 프로시저,
        차례,
        차례 === null ? null : '글쓰기',
        단계들,
      ],
    );

  /** 프로시저 하나(케이스 셋)와 옛 꼴 케이스 하나가 든 실행 */
  async function 실행을만든다(): Promise<{ runId: number; execId: number; 줄: Record<string, number>; 옛: PendingItem }> {
    const { runId, items } = await createRun(
      {
        origin: 'MANUAL',
        triggeredBy: 'xeu',
        env: 'qa',
        items: [
          { tcId: 'XEU-FN-102', platforms: ['android'], params: { password: 'pa55-둘째' }, expected: {} },
          { tcId: 'XEU-FN-201', platforms: ['android'], params: {}, expected: {} },
        ],
      },
      돈다,
    );
    const 프로시저줄 = items.filter((i) => i.procId === 프로시저);
    return { runId, execId: 프로시저줄[0]!.execId, 줄: Object.fromEntries(items.map((i) => [i.tcId, i.historyId])), 옛: items.find((i) => i.tcId === 'XEU-FN-201')! };
  }

  const 절차 = (seq: number, tcId: string): CaseResult['steps'][number] => ({ seq, tcId, title: `절차 ${String(seq)}`, status: 'PASS', durationMs: 10, assertions: [] });
  const 통과 = (tcId: string, seq: number): CaseResult => ({
    tcId,
    status: 'PASS',
    durationMs: 100,
    startedAt: '2026-11-24T01:00:00.000Z',
    finishedAt: '2026-11-24T01:00:05.000Z',
    steps: [절차(seq, tcId)],
  });
  const 답 = (execId: number, results: CaseResult[], 더?: Partial<CasesExecuteResponse>): CasesExecuteResponse => ({ historyId: execId, durationMs: 300, results, ...더 });

  const 줄읽기 = async (runId: number) =>
    (
      await q<{ tc_id: string; status: string; finished: boolean; error: { message: string } | null; blocked_by: string | null; case_started_at: Date | null; case_finished_at: Date | null; device: { model: string } | null; fps: unknown; steps: number }>(
        `SELECT i.tc_id, i.status, i.finished_at IS NOT NULL AS finished, i.error, i.blocked_by, i.case_started_at, i.case_finished_at, i.device, i.fps,
                (SELECT count(*)::int FROM run_item_step s WHERE s.history_id = i.history_id) AS steps
           FROM run_item i WHERE i.run_id = $1 ORDER BY i.tc_id`,
        [runId],
      )
    ).rows;
  const 단위읽기 = async (execId: number) =>
    (await q<{ started: boolean; finished: boolean; error: { message: string } | null }>('SELECT started_at IS NOT NULL AS started, finished_at IS NOT NULL AS finished, error FROM run_exec WHERE exec_id = $1', [execId])).rows[0]!;

  beforeAll(async () => {
    await 치운다();
    await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, procedure_mode) VALUES ('XEU', 'XEU 앱', '#445566', '', 'xeu', 'APP', true)`);
    await q(`INSERT INTO service_env (service_id, env, base_url) SELECT id, 'qa', 'https://qa.example.com' FROM service WHERE prefix = 'XEU'`);
    await 케이스('XEU-FN-101', 1, ['글쓰기 화면을 연다', '본문 없이 게시한다'], '본문');
    await 케이스('XEU-FN-102', 2, ['비밀번호를 다시 넣는다'], 'password');
    await 케이스('XEU-FN-103', 3, ['게시하고 확인한다'], '본문');
    await 케이스('XEU-FN-201', null, ['옛 꼴 단계'], '본문');
  });

  beforeEach(실행을치운다);

  afterAll(async () => {
    await 치운다();
    const { pool } = await import('../db/index.js');
    await pool.end();
  });

  it('케이스마다 판정 · 절차 · 케이스 시각을 적고 기기 정보는 모든 줄에 같은 값을, FPS 는 절차 번호로 갈라 넣은 뒤 실행 단위를 닫는다', async () => {
    const { runId, execId } = await 실행을만든다();
    await 실행단위를시작한다(execId);

    await finishExec(
      execId,
      답(
        execId,
        [
          통과('XEU-FN-101', 1),
          { tcId: 'XEU-FN-102', status: 'FAIL', durationMs: 200, startedAt: '2026-11-24T01:00:05.000Z', steps: [{ ...절차(2, 'XEU-FN-102'), status: 'FAIL' }], error: { message: '기대와 다르다' } },
          { tcId: 'XEU-FN-103', status: 'NA', durationMs: 0, steps: [], error: { message: 'BLOCKED' }, blockedBy: 'XEU-FN-102' },
        ],
        { device: { model: 'SM-G996N', osVersion: '14', appVersion: '1.0' }, fps: [{ seq: 1, fps: 60 }, { seq: 2, fps: 30 }, { seq: 2, fps: 31 }] },
      ),
    );

    const 줄들 = (await 줄읽기(runId)).filter((r) => r.tc_id !== 'XEU-FN-201');
    expect(줄들.map((r) => [r.tc_id, r.status, r.finished, r.error?.message ?? null, r.blocked_by, r.steps])).toEqual([
      ['XEU-FN-101', 'PASS', true, null, null, 1],
      ['XEU-FN-102', 'FAIL', true, '기대와 다르다', null, 1],
      ['XEU-FN-103', 'NA', true, 'BLOCKED', 'XEU-FN-102', 0],
    ]);
    expect(줄들.map((r) => r.device?.model)).toEqual(['SM-G996N', 'SM-G996N', 'SM-G996N']);
    expect(줄들.map((r) => r.fps)).toEqual([[{ seq: 1, fps: 60 }], [{ seq: 2, fps: 30 }, { seq: 2, fps: 31 }], null]);
    // 돌다 끊긴 케이스는 끝난 때가 없고 못 간 케이스는 둘 다 없다
    expect(줄들.map((r) => [r.case_started_at?.toISOString() ?? null, r.case_finished_at?.toISOString() ?? null])).toEqual([
      ['2026-11-24T01:00:00.000Z', '2026-11-24T01:00:05.000Z'],
      ['2026-11-24T01:00:05.000Z', null],
      [null, null],
    ]);
    expect(await 단위읽기(execId)).toEqual({ started: true, finished: true, error: null });
    // 옛 꼴 케이스 줄은 안 건드린다
    expect((await 줄읽기(runId)).find((r) => r.tc_id === 'XEU-FN-201')?.finished).toBe(false);
  });

  it('케이스 판정 밖의 사유(답 맨 위 error)는 케이스 판정을 그대로 두고 실행 단위에 적는다 — 항목 상세가 execError 로 싣는다', async () => {
    const { runId, execId, 줄 } = await 실행을만든다();

    await finishExec(execId, 답(execId, [통과('XEU-FN-101', 1), 통과('XEU-FN-102', 2), 통과('XEU-FN-103', 3)], { error: { message: '마지막 케이스 뒤 절차가 깨졌다: pa55-둘째' } }));

    expect((await 줄읽기(runId)).filter((r) => r.tc_id !== 'XEU-FN-201').map((r) => r.status)).toEqual(['PASS', 'PASS', 'PASS']);
    expect((await 단위읽기(execId)).error).toEqual({ message: '마지막 케이스 뒤 절차가 깨졌다: pa55-둘째' });
    // 다른 케이스(102)의 비밀값도 가려서 싣는다
    expect((await findItem(runId, 줄['XEU-FN-101']!))?.execError).toEqual({ message: '마지막 케이스 뒤 절차가 깨졌다: ********' });
    expect((await findItem(runId, 줄['XEU-FN-201']!))?.execError).toBeNull();
  });

  it('답에 빠진 케이스는 미실행으로 닫고, 날짜가 아닌 케이스 시각은 비운다 — 하나 때문에 실행 단위의 판정을 다 잃지 않는다', async () => {
    const { runId, execId } = await 실행을만든다();

    await finishExec(execId, 답(execId, [{ ...통과('XEU-FN-101', 1), startedAt: '어제쯤' }, 통과('XEU-FN-103', 3)]));

    const 줄들 = (await 줄읽기(runId)).filter((r) => r.tc_id !== 'XEU-FN-201');
    expect(줄들.map((r) => [r.status, r.error?.message ?? null])).toEqual([['PASS', null], ['NA', '러너 답에 이 케이스의 결과가 없습니다'], ['PASS', null]]);
    expect(줄들[0]!.case_started_at).toBeNull();
  });

  it('사람이 먼저 멈춘 실행은 뒤늦게 온 답이 덮지 않고, 멈출 때 안 끝난 줄의 실행 단위도 ABORTED 로 같이 닫힌다', async () => {
    const { runId, execId, 옛 } = await 실행을만든다();
    // 옛 꼴 케이스는 멈추기 전에 끝났다 — 그 실행 단위는 끝난 대로 남는다
    await finishItem(옛.historyId, { historyId: 옛.historyId, status: 'PASS', durationMs: 5, steps: [] });
    expect(await 단위읽기(옛.execId)).toMatchObject({ finished: true, error: null });

    // 끊을 대상은 실행 단위 번호다 — 케이스 줄 셋이 번호 하나다
    expect((await unfinishedItems(runId)).map((i) => i.historyId)).toEqual([execId]);
    expect(await abortRun(runId)).toEqual({ aborted: 3 });
    await finishExec(execId, 답(execId, [통과('XEU-FN-101', 1), 통과('XEU-FN-102', 2), 통과('XEU-FN-103', 3)]));

    const 줄들 = await 줄읽기(runId);
    expect(줄들.map((r) => [r.tc_id, r.status, r.error?.message ?? null])).toEqual([
      ['XEU-FN-101', 'NA', 'ABORTED'],
      ['XEU-FN-102', 'NA', 'ABORTED'],
      ['XEU-FN-103', 'NA', 'ABORTED'],
      ['XEU-FN-201', 'PASS', null],
    ]);
    expect(await 단위읽기(execId)).toMatchObject({ finished: true, error: { message: 'ABORTED' } });
    expect(await 단위읽기(옛.execId)).toMatchObject({ finished: true, error: null });
  });

  it('멈출 때 케이스 줄이 이미 다 끝난 실행 단위는 끝난 때가 비어 있어도 ABORTED 로 덮지 않는다 — 이 줄 전에 만든 실행 단위가 그렇다', async () => {
    const { runId, execId, 옛 } = await 실행을만든다();
    await q('UPDATE run_item SET status = $2, finished_at = now() WHERE exec_id = $1', [옛.execId, 'PASS']);

    await abortRun(runId);

    expect(await 단위읽기(옛.execId)).toEqual({ started: false, finished: false, error: null });
    expect((await 단위읽기(execId)).error).toEqual({ message: 'ABORTED' });
  });

  it('준비 실패로 닫으면 케이스 줄과 그 실행 단위가 PREP_FAILED 로 같이 닫힌다', async () => {
    const { runId, execId } = await 실행을만든다();

    expect(await 준비실패로닫는다(runId, 'HTTP 500')).toBe(true);

    expect((await 줄읽기(runId)).map((r) => r.error?.message)).toEqual(['PREP_FAILED', 'PREP_FAILED', 'PREP_FAILED', 'PREP_FAILED']);
    expect(await 단위읽기(execId)).toMatchObject({ finished: true, error: { message: 'PREP_FAILED' } });
  });

  it('실행 조회는 Blocked 를 미실행에 넣되 따로 세고, 항목마다 실행 단위 · 프로시저 · 막은 케이스를 싣는다', async () => {
    const { runId, execId, 옛 } = await 실행을만든다();
    await finishExec(
      execId,
      답(execId, [
        { tcId: 'XEU-FN-101', status: 'FAIL', durationMs: 1, steps: [], error: { message: '입력이 pa55-둘째 로 남았다' } },
        { tcId: 'XEU-FN-102', status: 'NA', durationMs: 0, steps: [], error: { message: 'BLOCKED' }, blockedBy: 'XEU-FN-101' },
        { tcId: 'XEU-FN-103', status: 'NA', durationMs: 0, steps: [], error: { message: 'BLOCKED' }, blockedBy: 'XEU-FN-101' },
      ]),
    );
    await finishItem(옛.historyId, { historyId: 옛.historyId, status: 'NA', durationMs: 0, steps: [], error: { message: '러너에 닿지 못했습니다' } });

    const 실행 = (await findRun(runId))!;
    expect(실행.counts).toMatchObject({ total: 4, pass: 0, fail: 1, na: 3, blocked: 2, running: 0 });
    expect(실행.items.map((i) => [i.tcId, i.execId, i.execSeq, i.procId, i.procName, i.blockedBy])).toEqual([
      ['XEU-FN-101', execId, 1, 프로시저, '글쓰기', null],
      ['XEU-FN-102', execId, 2, 프로시저, '글쓰기', 'XEU-FN-101'],
      ['XEU-FN-103', execId, 3, 프로시저, '글쓰기', 'XEU-FN-101'],
      ['XEU-FN-201', 옛.execId, 1, null, null, null],
    ]);
    // 한 케이스의 사유 글에 되비친 다른 케이스의 비밀값도 가린다
    expect(실행.items[0]!.error).toEqual({ message: '입력이 ******** 로 남았다' });
  });

  it('증적 폴더 · 장면은 케이스 줄이 든 실행 단위 번호로 찾고, 실행 단위에 통과가 아닌 케이스가 있으면 통과한 줄에서도 통과가 아니다', async () => {
    const { runId, execId, 줄, 옛 } = await 실행을만든다();
    await finishExec(execId, 답(execId, [통과('XEU-FN-101', 1), { tcId: 'XEU-FN-102', status: 'FAIL', durationMs: 1, steps: [] }, 통과('XEU-FN-103', 3)]));
    await finishItem(옛.historyId, { historyId: 옛.historyId, status: 'PASS', durationMs: 5, steps: [] });

    expect(await 실행단위자리(runId, 줄['XEU-FN-101']!)).toEqual({ 번호: execId, 통과: false });
    expect(await 실행단위자리(runId, 옛.historyId)).toEqual({ 번호: 옛.historyId, 통과: true });
    // 남의 실행 번호로는 못 찾는다
    expect(await 실행단위자리(runId + 1, 줄['XEU-FN-101']!)).toBeNull();
  });

  it('진행 조회는 러너가 실행 단위 번호로 알린 진행을 지금 도는 케이스 줄로 바꿔 싣고, 단계 제목은 프로시저 전체를 차례대로 잇는다', async () => {
    const { runId, execId, 줄, 옛 } = await 실행을만든다();
    const 도는것: RunningStep[] = [
      { historyId: execId, tcId: 'XEU-FN-102', seq: 3, title: '비밀번호를 다시 넣는다', elapsedMs: 1200 } as RunningStep,
      { historyId: 옛.execId, seq: 1, title: '옛 꼴 단계', elapsedMs: 10 } as RunningStep,
      // 남의 실행의 자식은 싣지 않는다
      { historyId: 999_999_999, seq: 1, title: '남의 단계', elapsedMs: 10 } as RunningStep,
    ];
    vi.mocked(러너진행).mockResolvedValueOnce({ items: 도는것, scenarios: [] });
    const app = Fastify();
    await app.register(진행경로, { prefix: '/api' });
    try {
      const res = await app.inject({ method: 'GET', url: `/api/runs/${String(runId)}/progress` });
      const items = (res.json() as { items: Record<string, unknown>[] }).items;
      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({
        historyId: 줄['XEU-FN-102'],
        execId,
        tcId: 'XEU-FN-102',
        seq: 3,
        timeoutMs: 300_000,
        stepTitles: ['글쓰기 화면을 연다', '본문 없이 게시한다', '비밀번호를 다시 넣는다', '게시하고 확인한다'],
      });
      expect(items[1]).toMatchObject({ historyId: 옛.historyId, execId: 옛.execId, stepTitles: ['옛 꼴 단계'] });
    } finally {
      await app.close();
    }
  });
});
