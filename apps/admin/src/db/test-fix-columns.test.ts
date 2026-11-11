// 테스트 수정 바퀴 표 검사 — 도는 줄 하나 · held 제약 · 보낼 줄 FIELD · 필드 키 칸 (SPEC 공통/4-데이터모델 「BTS 연동 표」 BTS-F10-03)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XTX';

describe.skipIf(연결 === undefined)('테스트 수정 바퀴 표', () => {
  let 서비스 = 0;
  let 프로젝트 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 줄 = (state: string, held = '{}') =>
    q(`INSERT INTO bts_test_fix (project_id, issue_key, service_id, tc_id, env, state, held) VALUES ($1, 'XTX-1', $2, 'XTX-001', 'demo', $3, $4)`, [
      프로젝트, 서비스, state, held,
    ]);

  beforeAll(async () => {
    const r = await q<{ id: string; project_id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xtx')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id, project_id`,
      [접두사, `${접두사} 테스트 수정 표 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    프로젝트 = Number(r.rows[0]!.project_id);
    await q('DELETE FROM bts_test_fix WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    await q('DELETE FROM bts_test_fix WHERE service_id = $1', [서비스]);
    await q('DELETE FROM bts_outbox WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('한 테스트 · 대상 서버에 도는 줄은 하나뿐이고 끝난 줄은 여럿 남는다', async () => {
    await 줄('PASSED');
    await 줄('GAVE_UP');
    await 줄('FIXING');
    await expect(줄('RERUNNING')).rejects.toThrow(/duplicate key/);
    await q("UPDATE bts_test_fix SET state = 'FAILED' WHERE service_id = $1 AND state = 'FIXING'", [서비스]);
    await 줄('WAIT_MERGE');
    const r = await q<{ n: string }>('SELECT count(*) AS n FROM bts_test_fix WHERE service_id = $1', [서비스]);
    expect(Number(r.rows[0]!.n)).toBe(4);
  });

  it('held 는 정한 까닭만 받고 state 는 정한 값만 받는다', async () => {
    await q('DELETE FROM bts_test_fix WHERE service_id = $1', [서비스]);
    await 줄('PASSED', '{EXPECTED_CHANGED,NOT_MEASURED}');
    await expect(줄('PASSED', '{SOMETHING}')).rejects.toThrow(/check constraint/);
    await expect(줄('DONE')).rejects.toThrow(/check constraint/);
  });

  it('보낼 줄은 FIELD 를 받는다', async () => {
    await q(`INSERT INTO bts_outbox (project_id, kind, payload, issue_key, service_id) VALUES ($1, 'FIELD', '{}', 'XTX-1', $2)`, [프로젝트, 서비스]);
    await expect(q(`INSERT INTO bts_outbox (project_id, kind, payload, issue_key, service_id) VALUES ($1, 'NOPE', '{}', 'XTX-1', $2)`, [프로젝트, 서비스])).rejects.toThrow(
      /check constraint/,
    );
  });

  it('BTS 연결에 필드 키 칸이 있고 비어도 된다', async () => {
    const r = await q<{ is_nullable: string }>(
      "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'bts_link' AND column_name = 'test_fix_field'",
    );
    expect(r.rows[0]?.is_nullable).toBe('YES');
  });
});
