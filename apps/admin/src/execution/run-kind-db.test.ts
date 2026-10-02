// 실행 종류 UI · FN 이 목록 · 단건 · 견주기에서 갈리는지 본다 (SPEC 공통/4-데이터모델 「실행 종류」 · PR #131)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { compareWithPrevious } from '../reporting/insights.js';

import { findRun, listRuns } from './queries.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XRK';

describe.skipIf(연결 === undefined)('실행 종류 UI · FN', () => {
  let 서비스 = 0;
  const 번호: Record<string, number> = {};

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 실행 = async (kind: 'UI' | 'FN', 몇분전: number) => {
    const r = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, started_at, finished_at)
       VALUES ('XRK 실행', 'xrk', 'qa', 'FINISHED', $1, 'XRK', '', '', $2, now() - make_interval(mins => $3), now())
       RETURNING run_id`,
      [서비스, kind, 몇분전],
    );
    return Number(r.rows[0]!.run_id);
  };

  beforeAll(async () => {
    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xrk')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 실행 종류 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    번호.ui옛 = await 실행('UI', 30);
    번호.fn옛 = await 실행('FN', 20);
    번호.ui새 = await 실행('UI', 10);
  });

  afterAll(async () => {
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('?kind=ui 는 UI 만 · fn 은 FN 만 · case 는 둘 다 내고 줄마다 종류를 싣는다', async () => {
    const ui = await listRuns(접두사, 1, 50, { kind: 'ui' });
    expect(ui.items.map((r) => r.runId)).toEqual([번호.ui새, 번호.ui옛]);
    expect(ui.summary.runs).toBe(2);
    const fn = await listRuns(접두사, 1, 50, { kind: 'fn' });
    expect(fn.items.map((r) => [r.runId, r.kind])).toEqual([[번호.fn옛, 'FN']]);
    const 둘다 = await listRuns(접두사, 1, 50);
    expect(둘다.items.map((r) => r.kind)).toEqual(['UI', 'FN', 'UI']);
  });

  it('번호 하나로 짚는 조회는 UI · FN 둘 다 찾는다', async () => {
    expect((await findRun(번호.ui새!))?.kind).toBe('UI');
    expect((await findRun(번호.fn옛!))?.kind).toBe('FN');
  });

  it('견주기의 직전 실행은 같은 종류에서만 찾는다 — 사이의 기능 실행을 건너뛴다', async () => {
    expect((await compareWithPrevious(번호.ui새!)).previous?.runId).toBe(번호.ui옛);
    expect((await compareWithPrevious(번호.fn옛!)).previous).toBeNull();
  });
});
