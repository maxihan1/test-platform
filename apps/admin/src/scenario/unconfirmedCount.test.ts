// 미확정 부품이 섞인 시나리오 통과도 정식 통과(allPass)로 세고 꼬리표만 남는지 본다 — 시나리오 목록 lastRun · 실행 기록 E2E 탭 (SPEC 도메인/시나리오 §7 「판정 접기」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { listRuns } from '../execution/queries.js';

import { 목록 as 시나리오목록 } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XSG';

describe.skipIf(연결 === undefined)('시나리오 미확정 통과 셈', () => {
  let 서비스 = 0;
  let 미확정통과시나리오 = 0;
  let 확정통과시나리오 = 0;
  let 미확정실패시나리오 = 0;
  let 도는미확정시나리오 = 0;
  let 도는확정시나리오 = 0;
  const 시나리오들: number[] = [];

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 실행치우기 = async () => {
    await q('DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
  };

  const 치우기 = async () => {
    await 실행치우기();
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스]);
  };

  const 시나리오만들기 = async (이름: string) => {
    const s = await q<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, $2, 'xsg') RETURNING id`,
      [서비스, 이름],
    );
    const id = Number(s.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, '[]', 'xsg', '검사')`,
      [id],
    );
    시나리오들.push(id);
    return id;
  };

  type 부품칸 = { status: string; unconfirmed?: string };

  const 실행 = async (시나리오: number, 부품들: 부품칸[], status = 'FINISHED') => {
    const r = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url,
                             kind, scenario_id, scenario_version, started_at, finished_at)
       VALUES ('XSG 실행', 'xsg', 'qa', $2, $1, 'XSG', '', '', 'SCENARIO', $3, 1, now(),
               CASE WHEN $2 = 'RUNNING' THEN NULL ELSE now() END)
       RETURNING run_id`,
      [서비스, status, 시나리오],
    );
    const runId = Number(r.rows[0]!.run_id);
    for (const [i, 부품] of 부품들.entries()) {
      await q(
        `INSERT INTO scenario_run_part (run_id, seq, kind, part, status, unconfirmed, finished_at)
         VALUES ($1, $2, 'wait', '{}', $3, $4, now())`,
        [runId, i + 1, 부품.status, 부품.unconfirmed ?? null],
      );
    }
    return runId;
  };

  const 지난줄 = async (시나리오: number) => (await 시나리오목록(서비스)).find((s) => s.id === 시나리오)!.lastRun;

  beforeAll(async () => {
    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xsg')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 미확정 통과 셈 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기();
    미확정통과시나리오 = await 시나리오만들기('XSG 미확정 통과');
    확정통과시나리오 = await 시나리오만들기('XSG 확정 통과');
    미확정실패시나리오 = await 시나리오만들기('XSG 실패에 미확정 섞임');
    도는미확정시나리오 = await 시나리오만들기('XSG 도는 미확정');
    도는확정시나리오 = await 시나리오만들기('XSG 도는 확정');
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('목록 lastRun 과 E2E 탭 줄이 미확정 부품이 섞였는지 싣고 머리 집계는 미확정 섞인 통과도 allPass 로 센다', async () => {
    await 실행치우기();
    const 미확정통과 = await 실행(미확정통과시나리오, [{ status: 'PASS' }, { status: 'PASS', unconfirmed: '화면에서 본 값' }]);
    const 확정통과 = await 실행(확정통과시나리오, [{ status: 'PASS' }, { status: 'PASS' }]);
    const 미확정실패 = await 실행(미확정실패시나리오, [{ status: 'PASS' }, { status: 'FAIL', unconfirmed: '화면에서 본 값' }]);

    try {
      expect(await 지난줄(미확정통과시나리오)).toMatchObject({ runId: 미확정통과, verdict: 'PASS', unconfirmed: true });
      expect(await 지난줄(확정통과시나리오)).toMatchObject({ runId: 확정통과, verdict: 'PASS', unconfirmed: false });
      expect(await 지난줄(미확정실패시나리오)).toMatchObject({ runId: 미확정실패, verdict: 'FAIL', unconfirmed: true });

      const 탭 = await listRuns(접두사, 1, 50, { kind: 'scenario' });
      expect(탭.total).toBe(3);
      const 줄 = (runId: number) => 탭.items.find((i) => i.runId === runId)!.unconfirmed;
      expect(줄(미확정통과)).toBe(true);
      expect(줄(확정통과)).toBe(false);
      expect(줄(미확정실패)).toBe(true);
      expect(탭.summary).toMatchObject({ runs: 3, allPass: 2, hasFail: 1 });
    } finally {
      await 실행치우기();
    }
  });

  it('도는 실행도 박제한 부품 사유로 미확정 여부를 싣고 판정은 null 이다', async () => {
    await 실행치우기();
    const 도는미확정 = await 실행(도는미확정시나리오, [{ status: 'PASS', unconfirmed: '화면에서 본 값' }, { status: 'NA' }], 'RUNNING');
    const 도는확정 = await 실행(도는확정시나리오, [{ status: 'PASS' }, { status: 'NA' }], 'RUNNING');

    try {
      expect(await 지난줄(도는미확정시나리오)).toMatchObject({ runId: 도는미확정, verdict: null, unconfirmed: true });
      expect(await 지난줄(도는확정시나리오)).toMatchObject({ runId: 도는확정, verdict: null, unconfirmed: false });

      const 탭 = await listRuns(접두사, 1, 50, { kind: 'scenario' });
      expect(탭.items.find((i) => i.runId === 도는미확정)!.unconfirmed).toBe(true);
      expect(탭.items.find((i) => i.runId === 도는확정)!.unconfirmed).toBe(false);
      expect(탭.summary).toMatchObject({ runs: 2, allPass: 0, hasFail: 0 });
    } finally {
      await 실행치우기();
    }
  });
});
