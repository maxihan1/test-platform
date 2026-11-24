// 기기 성능의 테스트 프로시저 — 고른 케이스가 든 프로시저를 통째로 요청 하나로 보내고, 못 돌리는 러너면 측정을 만들지 않는다 (도메인/성능 §3.9 「기기 성능」)

import type { ExecuteRequest } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { type 기기차림타입, 기기차림 } from './deviceFixture.js';

const 케이스번호 = (body: Record<string, unknown>) => (body as unknown as ExecuteRequest).cases.map((c) => c.tcId);

vi.mock('../execution/farmToken.js', async (원래) => ({ ...(await 원래<typeof import('../execution/farmToken.js')>()), 서버팜토큰: vi.fn(async () => 'pat_runas') }));

const 연결 = process.env.DATABASE_URL;
const 프로시저케이스 = ['XQDP-FN-101', 'XQDP-FN-102', 'XQDP-FN-103', 'XQDP-FN-104'];

describe.skipIf(연결 === undefined)('기기 성능 — 테스트 프로시저', { timeout: 90_000 }, () => {
  let f: 기기차림타입;

  beforeAll(async () => {
    f = await 기기차림('XQDP', false);
    // 104 는 프로시저에서 빠져 내려간 케이스다 — 비활성 줄에 옛 번호가 남는다
    for (const [i, tcId] of 프로시저케이스.entries()) {
      await f.판.pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, proc_id, proc_seq, proc_name, is_active)
         VALUES ($1, $1, '["android"]', '[]', 'x/proc.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}', 'XQDP-TP-001', $2, '글쓰기 흐름', $3)`,
        [tcId, i + 1, i < 3],
      );
    }
  }, 60_000);

  afterAll(async () => {
    await f.판.pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [프로시저케이스]);
    await f.정리();
  }, 60_000);

  it('러너가 프로시저를 못 돌리면 프로시저 안 케이스로 측정을 만들지 않는다(409 RUNNER_NO_PROCEDURE)', async () => {
    f.상태.프로시저 = false;
    const r = await f.측정({ drive: 'APPIUM', durationSec: undefined, caseIds: ['XQDP-001', 'XQDP-FN-102'], repeat: 1 });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toEqual({ error: 'RUNNER_NO_PROCEDURE' });
  });

  it('프로시저에서 빠진 케이스로는 측정을 만들지 않고, 만든 뒤 빠졌으면 돌 때 빼고 로그에 남긴다', async () => {
    f.상태.프로시저 = true;
    try {
      const r = await f.측정({ drive: 'APPIUM', durationSec: undefined, caseIds: ['XQDP-FN-104'], repeat: 1 });
      expect([r.statusCode, r.json()]).toEqual([400, { error: 'INVALID_REQUEST', detail: '테스트 프로시저에서 빠진 케이스입니다: XQDP-FN-104' }]);

      const 전 = f.러너.호출들.length;
      const runId = await f.만들기({ drive: 'APPIUM', durationSec: undefined, caseIds: ['XQDP-FN-103', 'XQDP-001'], repeat: 1 }, 0);
      await f.판.pool.query(`UPDATE test_case SET is_active = false WHERE tc_id = 'XQDP-FN-103'`);
      try {
        expect(await f.끝날때까지(runId)).toMatchObject({ status: 'DONE' });
      } finally {
        await f.판.pool.query(`UPDATE test_case SET is_active = true WHERE tc_id = 'XQDP-FN-103'`);
      }
      expect(f.러너.호출들.slice(전).filter((h) => h.path === '/execute').map((h) => 케이스번호(h.body))).toEqual([['XQDP-001']]);
      const 로그 = (await f.판.pool.query<{ message: string }>(`SELECT message FROM perf_event WHERE run_id = $1 AND level = 'WARN'`, [runId])).rows.map((x) => x.message);
      expect(로그).toEqual(['XQDP-FN-103 는 테스트 프로시저에서 빠져 실행하지 않습니다']);
    } finally {
      f.상태.프로시저 = false;
    }
  });

  it('고른 차례대로 프로시저는 활성 케이스 전부를 회차마다 한 번 보내고, 막힌 케이스는 구간 없이 로그에 막은 케이스와 남긴다', async () => {
    f.상태.프로시저 = true;
    f.상태.판정 = { 'XQDP-FN-102': 'FAIL', 'XQDP-FN-103': 'BLOCKED' };
    // 구간은 1초 숫자 줄마다 하나다 — 답이 늦어야 절차마다 붙을 줄이 생긴다
    f.상태.러너지연 = 2100;
    try {
      const 전 = f.러너.호출들.length;
      const runId = await f.만들기({ drive: 'APPIUM', durationSec: undefined, caseIds: ['XQDP-FN-102', 'XQDP-001', 'XQDP-FN-101'], repeat: 2 }, 0);
      expect(await f.끝날때까지(runId)).toMatchObject({ status: 'DONE', config: { caseIds: ['XQDP-FN-102', 'XQDP-001', 'XQDP-FN-101'] } });

      const 보냄 = f.러너.호출들.slice(전).filter((h) => h.path === '/execute').map((h) => h.body);
      expect(보냄.map((b) => b.procId ?? 케이스번호(b)[0])).toEqual(['XQDP-TP-001', 'XQDP-001', 'XQDP-TP-001', 'XQDP-001']);
      expect(보냄[0]).toMatchObject({ runId: 0, platform: 'android', filePath: 'x/proc.spec.ts', udid: 'FA1', timeoutMs: 900_000, farmToken: 'pat_runas' });
      expect(케이스번호(보냄[0]!)).toEqual(['XQDP-FN-101', 'XQDP-FN-102', 'XQDP-FN-103']);

      const 구간 = (await f.결과(runId)).segments.filter((x) => x.loop === 1).map((x) => x.segment);
      expect(구간).toEqual(expect.arrayContaining(['XQDP-FN-101 · XQDP-FN-101 절차', 'XQDP-FN-102 · XQDP-FN-102 절차', 'XQDP-001 · 로그인']));
      expect(구간.some((x) => x.startsWith('XQDP-FN-103'))).toBe(false);

      const 로그 = (await f.판.pool.query<{ message: string }>(`SELECT message FROM perf_event WHERE run_id = $1 AND level = 'WARN' ORDER BY id`, [runId])).rows.map((x) => x.message);
      expect(로그).toEqual([
        'SM-A236 1회차 XQDP-FN-102 가 FAIL 로 끝났습니다',
        'SM-A236 1회차 XQDP-FN-103 는 선행 케이스 XQDP-FN-102 가 통과하지 못해 실행하지 못했습니다',
        'SM-A236 2회차 XQDP-FN-102 가 FAIL 로 끝났습니다',
        'SM-A236 2회차 XQDP-FN-103 는 선행 케이스 XQDP-FN-102 가 통과하지 못해 실행하지 못했습니다',
      ]);
    } finally {
      f.상태.프로시저 = false;
      f.상태.판정 = {};
      f.상태.러너지연 = 0;
    }
  });
});
