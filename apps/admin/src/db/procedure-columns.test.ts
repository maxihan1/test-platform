// 테스트 프로시저 표와 칸 검사 — 실행 단위 run_exec · 케이스 줄 · 케이스 · 호환성 · 애플리케이션 스위치 (SPEC 공통/4-데이터모델 「테스트 프로시저 표」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XTP', 'XTPA', 'XTPG'];
const 번호들 = ['XTP-FN-001', 'XTP-FN-002'];

describe.skipIf(연결 === undefined)('테스트 프로시저 표', () => {
  const 서비스: Record<string, number> = {};

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 칸들 = async (표: string, 이름들: string[]) => {
    const r = await q<{ column_name: string; data_type: string; is_nullable: string; has_default: boolean }>(
      `SELECT column_name, data_type, is_nullable, column_default IS NOT NULL AS has_default
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = ANY($2) ORDER BY ordinal_position`,
      [표, 이름들],
    );
    return r.rows.map((c) => [c.column_name, c.data_type, c.is_nullable, c.has_default]);
  };

  const 치우기 = async () => {
    const ids = Object.values(서비스);
    await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [ids]);
    await q('DELETE FROM run_exec WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [ids]);
    await q('DELETE FROM test_run WHERE service_id = ANY($1)', [ids]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
  };

  const 실행 = async (): Promise<number> => {
    const r = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url)
       VALUES ('XTP 실행', 'xtp', 'demo', 'RUNNING', $1, 'XTP', '', '') RETURNING run_id`,
      [서비스.XTP],
    );
    return Number(r.rows[0]!.run_id);
  };

  const 단위 = async (runId: number, proc: [string | null, string | null] = [null, null]): Promise<number> => {
    const r = await q<{ exec_id: string }>(
      `INSERT INTO run_exec (run_id, file_path, proc_id, proc_name, platform, timeout_ms)
       VALUES ($1, 'xtp/XTP-TP-001.spec.ts', $2, $3, 'android', 600000) RETURNING exec_id`,
      [runId, ...proc],
    );
    return Number(r.rows[0]!.exec_id);
  };

  const 줄 = async (runId: number, tcId: string, 칸: { exec?: number; seq?: number } = {}): Promise<number> => {
    const r = await q<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, file_path, param_schema, expected_schema, timeout_ms, exec_id, exec_seq)
       VALUES ($1, $2, 'android', $2, '{}', '{}', 'NA', 'xtp/XTP-TP-001.spec.ts', '{}', '{}', 300000, $3, $4) RETURNING history_id`,
      [runId, tcId, 칸.exec ?? null, 칸.seq ?? null],
    );
    return Number(r.rows[0]!.history_id);
  };

  const 케이스 = (tcId: string, proc: [string | null, number | null, string | null]) =>
    q(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, proc_id, proc_seq, proc_name)
       VALUES ($1, $1, '["android"]', '[]', 'xtp/XTP-TP-001.spec.ts', '{}', '{}', $2, $3, $4)`,
      [tcId, ...proc],
    );

  beforeAll(async () => {
    for (const [prefix, kind] of [['XTP', 'SCREEN'], ['XTPA', 'APP'], ['XTPG', 'GAME']] as const) {
      const r = await q<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, game_platform)
              VALUES ($1, $2, '#3A5FCD', '', lower($1), $3, $4)
         ON CONFLICT (prefix) DO UPDATE SET is_active = true, procedure_mode = false
           RETURNING id`,
        [prefix, `${prefix} 프로시저 표 검사용`, kind, kind === 'GAME' ? 'android' : null],
      );
      서비스[prefix] = Number(r.rows[0]!.id);
    }
    await 치우기();
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE prefix = ANY($1)', [접두사들]);
  });

  it('새 칸은 모두 비워 둘 수 있고 스위치만 기본 꺼짐이다 — 더하기만 한다', async () => {
    expect(await 칸들('run_item', ['exec_id', 'exec_seq', 'blocked_by', 'case_started_at', 'case_finished_at'])).toEqual([
      ['exec_id', 'bigint', 'YES', false],
      ['exec_seq', 'integer', 'YES', false],
      ['blocked_by', 'text', 'YES', false],
      ['case_started_at', 'timestamp with time zone', 'YES', false],
      ['case_finished_at', 'timestamp with time zone', 'YES', false],
    ]);
    expect(await 칸들('test_case', ['proc_id', 'proc_seq', 'proc_name'])).toEqual([
      ['proc_id', 'text', 'YES', false],
      ['proc_seq', 'integer', 'YES', false],
      ['proc_name', 'text', 'YES', false],
    ]);
    expect(await 칸들('compat_run_case', ['exec_id', 'blocked_by'])).toEqual([
      ['exec_id', 'bigint', 'YES', false],
      ['blocked_by', 'text', 'YES', false],
    ]);
    expect(await 칸들('service', ['procedure_mode'])).toEqual([['procedure_mode', 'boolean', 'NO', true]]);
  });

  it('확인 문장 칸은 케이스 · 케이스 줄 모두 글자 목록이고 비워 둘 수 있다 — NULL 은 못 읽었거나 이 칸 전의 줄이다', async () => {
    for (const 표 of ['test_case', 'run_item']) {
      const r = await q<{ udt_name: string; is_nullable: string; column_default: string | null }>(
        `SELECT udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'verify_statements'`,
        [표],
      );
      expect(r.rows).toEqual([{ udt_name: '_text', is_nullable: 'YES', column_default: null }]);
    }
  });

  it('실행 단위 번호는 케이스 줄 번호와 같은 번호 줄에서 나와 서로 겹치지 않는다', async () => {
    const run = await 실행();
    const 앞 = await 줄(run, 'XTP-FN-001');
    const exec = await 단위(run, ['XTP-TP-001', '글쓰기']);
    const 뒤 = await 줄(run, 'XTP-FN-002', { exec, seq: 1 });
    expect(exec).toBeGreaterThan(앞);
    expect(뒤).toBeGreaterThan(exec);
  });

  it('프로시저 번호와 이름은 같이 차거나 같이 빈다', async () => {
    const run = await 실행();
    await expect(단위(run)).resolves.toBeGreaterThan(0);
    await expect(단위(run, ['XTP-TP-001', null])).rejects.toThrow('run_exec_check');
    await expect(단위(run, [null, '글쓰기'])).rejects.toThrow('run_exec_check');
  });

  it('케이스 줄은 있는 실행 단위만 가리킨다', async () => {
    await expect(줄(await 실행(), 'XTP-FN-001', { exec: 999_999_999 })).rejects.toThrow('run_item_exec_id_fkey');
  });

  it('케이스 줄 유일 키는 그대로 (실행 · 케이스 · 디바이스 · 회차)다', async () => {
    const r = await q<{ indexdef: string }>(`SELECT indexdef FROM pg_indexes WHERE tablename = 'run_item' AND indexdef LIKE 'CREATE UNIQUE%' AND indexdef NOT LIKE '%history_id%'`);
    expect(r.rows.map((x) => x.indexdef.replace(/^.*\(/, '('))).toEqual(['(run_id, tc_id, platform, attempt)']);
  });

  it('케이스의 프로시저 세 칸은 같이 차거나 같이 빈다', async () => {
    await 케이스('XTP-FN-001', ['XTP-TP-001', 1, '글쓰기']);
    await 케이스('XTP-FN-002', [null, null, null]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await expect(케이스('XTP-FN-001', ['XTP-TP-001', null, '글쓰기'])).rejects.toThrow('test_case_proc_check');
    await expect(케이스('XTP-FN-001', ['XTP-TP-001', 1, null])).rejects.toThrow('test_case_proc_check');
    await expect(케이스('XTP-FN-001', [null, 1, null])).rejects.toThrow('test_case_proc_check');
  });

  it('호환성의 실행 번호는 외래 키가 아니다 — 실행 단위 줄을 만들지 않고 번호만 나눠 든다', async () => {
    const r = await q(
      `SELECT 1 FROM information_schema.key_column_usage k JOIN information_schema.table_constraints c USING (constraint_schema, constraint_name)
        WHERE c.constraint_type = 'FOREIGN KEY' AND k.table_name = 'compat_run_case' AND k.column_name = 'exec_id'`,
    );
    expect(r.rowCount).toBe(0);
  });

  it('스위치는 Android 앱 · 게임만 켠다', async () => {
    const 켜기 = (prefix: string) => q('UPDATE service SET procedure_mode = true WHERE prefix = $1', [prefix]);
    await expect(켜기('XTPA')).resolves.toBeDefined();
    await expect(켜기('XTPG')).resolves.toBeDefined();
    await expect(켜기('XTP')).rejects.toThrow('service_procedure_mode_check');
  });
});
