// 호환성 표와 제약 검사 — 칸 모양 · 제약 · 거절 · 번호 줄 공유 · grafana_ro 권한 (SPEC 공통/4-데이터모델 「호환성 표」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XCO';

// [칸, data_type, is_nullable, 기본값 유무] — 계약 블록 SQL 을 그대로 옮겼다
type 칸 = [string, string, 'YES' | 'NO', boolean];
const 정본: Record<string, 칸[]> = {
  compat_set: [
    ['id', 'bigint', 'NO', true],
    ['service_id', 'bigint', 'NO', false],
    ['name', 'text', 'NO', false],
    ['devices', 'jsonb', 'NO', false],
    ['one_per_model', 'boolean', 'NO', true],
    ['added_cases', 'ARRAY', 'NO', true],
    ['is_active', 'boolean', 'NO', true],
    ['created_by', 'text', 'NO', false],
    ['created_at', 'timestamp with time zone', 'NO', true],
    ['updated_at', 'timestamp with time zone', 'NO', true],
  ],
  compat_run_device: [
    ['run_id', 'bigint', 'NO', false],
    ['seq', 'integer', 'NO', false],
    ['serial', 'text', 'NO', false],
    ['model', 'text', 'NO', false],
    ['name', 'text', 'NO', false],
    ['fold', 'text', 'YES', false],
    ['state', 'text', 'NO', true],
    ['skip_reason', 'text', 'YES', false],
    ['held_serial', 'text', 'YES', false],
    ['device', 'jsonb', 'YES', false],
    ['started_at', 'timestamp with time zone', 'YES', false],
    ['finished_at', 'timestamp with time zone', 'YES', false],
  ],
  compat_run_case: [
    ['id', 'bigint', 'NO', true],
    ['run_id', 'bigint', 'NO', false],
    ['seq', 'integer', 'NO', false],
    ['tc_id', 'text', 'NO', false],
    ['tc_name', 'text', 'NO', false],
    ['picked', 'text', 'NO', false],
    ['file_path', 'text', 'NO', false],
    ['timeout_ms', 'integer', 'NO', false],
    ['status', 'text', 'NO', true],
    ['failed_step', 'integer', 'YES', false],
    ['steps', 'jsonb', 'NO', true],
    ['check_state', 'text', 'YES', false],
    ['error', 'jsonb', 'YES', false],
    ['started_at', 'timestamp with time zone', 'YES', false],
    ['finished_at', 'timestamp with time zone', 'YES', false],
  ],
  compat_screen: [
    ['id', 'bigint', 'NO', true],
    ['case_run_id', 'bigint', 'NO', false],
    ['run_id', 'bigint', 'NO', false],
    ['seq', 'integer', 'NO', false],
    ['screen_key', 'text', 'NO', false],
    ['step', 'integer', 'YES', false],
    ['at', 'timestamp with time zone', 'NO', false],
    ['before', 'text', 'NO', false],
    ['status', 'text', 'NO', false],
    ['issues', 'jsonb', 'NO', true],
    ['file', 'text', 'YES', false],
  ],
  compat_verdict: [
    ['run_id', 'bigint', 'NO', false],
    ['screen_key', 'text', 'NO', false],
    ['seq', 'integer', 'NO', false],
    ['verdict', 'text', 'NO', false],
    ['judged_by', 'text', 'NO', false],
    ['judged_at', 'timestamp with time zone', 'NO', true],
  ],
};

describe.skipIf(연결 === undefined)('호환성 표', () => {
  let 서비스 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 치우기 = async () => {
    const 실행들 = 'SELECT run_id FROM test_run WHERE service_id = $1';
    await q(`DELETE FROM compat_verdict WHERE run_id IN (${실행들})`, [서비스]);
    await q(`DELETE FROM compat_screen WHERE run_id IN (${실행들})`, [서비스]);
    await q(`DELETE FROM compat_run_case WHERE run_id IN (${실행들})`, [서비스]);
    await q(`DELETE FROM compat_run_device WHERE run_id IN (${실행들})`, [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM compat_set WHERE service_id = $1', [서비스]);
  };

  const 세트 = async (devices = '[]'): Promise<number> => {
    const r = await q<{ id: string }>(
      `INSERT INTO compat_set (service_id, name, devices, created_by) VALUES ($1, 'XCO 세트', $2, 'xco') RETURNING id`,
      [서비스, devices],
    );
    return Number(r.rows[0]!.id);
  };

  const 실행 = async (kind: string, setId: number | null) => {
    const r = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, compat_set_id)
       VALUES ('XCO 실행', 'xco', 'demo', 'RUNNING', $1, 'XCO', '', '', $2, $3) RETURNING run_id`,
      [서비스, kind, setId],
    );
    return Number(r.rows[0]!.run_id);
  };

  const 상태 = (runId: number, seq: number, fold: string | null = null) =>
    q(`INSERT INTO compat_run_device (run_id, seq, serial, model, name, fold) VALUES ($1, $2, 'R5', 'SM-S918N', 'SM-S918N', $3)`, [
      runId, seq, fold,
    ]);

  const 케이스 = async (runId: number, seq: number, 칸: { tc_id?: string; picked?: string } = {}) => {
    const r = await q<{ id: string }>(
      `INSERT INTO compat_run_case (run_id, seq, tc_id, tc_name, picked, file_path, timeout_ms)
       VALUES ($1, $2, $3, '로그인', $4, 'xco/a.spec.ts', 300000) RETURNING id`,
      [runId, seq, 칸.tc_id ?? 'XCO-001', 칸.picked ?? 'AUTO'],
    );
    return Number(r.rows[0]!.id);
  };

  beforeAll(async () => {
    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xco')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 호환성 표 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기();
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('칸 모양이 계약 블록 SQL 과 같다', async () => {
    for (const [표, 칸들] of Object.entries(정본)) {
      const r = await q<{ column_name: string; data_type: string; is_nullable: string; has_default: boolean }>(
        `SELECT column_name, data_type, is_nullable, column_default IS NOT NULL AS has_default
           FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [표],
      );
      expect(r.rows.map((c) => [c.column_name, c.data_type, c.is_nullable, c.has_default]), 표).toEqual(칸들);
    }
    const t = await q<{ data_type: string; is_nullable: string }>(
      `SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name = 'test_run' AND column_name = 'compat_set_id'`,
    );
    expect(t.rows).toEqual([{ data_type: 'bigint', is_nullable: 'YES' }]);
  });

  it('호환성 실행만 세트를 가리키고 케이스 실행 · E2E 는 못 가리킨다', async () => {
    const s = await 세트();
    expect(await 실행('COMPAT', s)).toBeGreaterThan(0);
    await expect(실행('COMPAT', null)).rejects.toThrow('test_run_compat_check');
    await expect(실행('FN', s)).rejects.toThrow('test_run_compat_check');
    await expect(실행('UI', null)).resolves.toBeGreaterThan(0);
    await expect(실행('COMPAT', 999_999_999)).rejects.toThrow('test_run_compat_set_id_fkey');
    await expect(실행('X', null)).rejects.toThrow('test_run_kind_check');
  });

  it('세트의 디바이스는 배열이고 직접 추가 케이스는 비어서 시작한다', async () => {
    await expect(세트('{}')).rejects.toThrow('compat_set_devices_check');
    const r = await q<{ added_cases: string[]; one_per_model: boolean }>(
      'SELECT added_cases, one_per_model FROM compat_set WHERE id = $1',
      [await 세트('[{"serial":"R5","model":"SM-S918N","name":"SM-S918N"}]')],
    );
    expect(r.rows[0]).toEqual({ added_cases: [], one_per_model: true });
  });

  it('점검 상태는 1부터 · 한 번씩 · 접힘과 상태는 정한 값만 받는다', async () => {
    const runId = await 실행('COMPAT', await 세트());
    await 상태(runId, 1);
    await 상태(runId, 2, 'FOLDED');
    await expect(상태(runId, 1)).rejects.toThrow('compat_run_device_pkey');
    await expect(상태(runId, 0)).rejects.toThrow('compat_run_device_seq_check');
    await expect(상태(runId, 3, 'HALF')).rejects.toThrow('compat_run_device_fold_check');
    const r = await q<{ state: string }>('SELECT state FROM compat_run_device WHERE run_id = $1 AND seq = 1', [runId]);
    expect(r.rows[0]!.state).toBe('WAIT');
    await expect(
      q(`UPDATE compat_run_device SET state = 'PAUSED' WHERE run_id = $1 AND seq = 1`, [runId]),
    ).rejects.toThrow('compat_run_device_state_check');
  });

  it('케이스 한 번은 run_item.history_id 와 같은 번호 줄에서 번호를 받는다', async () => {
    const runId = await 실행('COMPAT', await 세트());
    await 상태(runId, 1);
    const 앞 = await q<{ n: string }>('SELECT last_value AS n FROM run_item_history_id_seq');
    const id = await 케이스(runId, 1);
    expect(id).toBeGreaterThan(Number(앞.rows[0]!.n));
    const 뒤 = await q<{ n: string }>('SELECT last_value AS n FROM run_item_history_id_seq');
    expect(Number(뒤.rows[0]!.n)).toBe(id);
  });

  it('케이스 한 번은 있는 점검 상태에만 · 한 상태에 케이스 하나씩 · 정한 값만 받는다', async () => {
    const runId = await 실행('COMPAT', await 세트());
    await 상태(runId, 1);
    await 케이스(runId, 1);
    await expect(케이스(runId, 1)).rejects.toThrow('compat_run_case_run_id_seq_tc_id_key');
    await expect(케이스(runId, 9, { tc_id: 'XCO-002' })).rejects.toThrow('compat_run_case_run_id_seq_fkey');
    await expect(케이스(runId, 1, { tc_id: 'XCO-003', picked: 'MANUAL' })).rejects.toThrow('compat_run_case_picked_check');
    const r = await q<{ status: string; steps: unknown }>(
      'SELECT status, steps FROM compat_run_case WHERE run_id = $1',
      [runId],
    );
    expect(r.rows).toEqual([{ status: 'NA', steps: [] }]);
    await expect(
      q(`UPDATE compat_run_case SET check_state = 'waiting' WHERE run_id = $1`, [runId]),
    ).rejects.toThrow('compat_run_case_check_state_check');
  });

  it('점검 화면은 케이스 한 번을 지우면 같이 지워진다', async () => {
    const runId = await 실행('COMPAT', await 세트());
    await 상태(runId, 1);
    const c = await 케이스(runId, 1);
    const 화면 = (status: string) =>
      q(
        `INSERT INTO compat_screen (case_run_id, run_id, seq, screen_key, at, before, status)
         VALUES ($1, $2, 1, 'app:.MainActivity', now(), 'click', $3)`,
        [c, runId, status],
      );
    await 화면('done');
    await expect(화면('pending')).rejects.toThrow('compat_screen_status_check');
    await q('DELETE FROM compat_run_case WHERE id = $1', [c]);
    const r = await q<{ n: string }>('SELECT count(*) AS n FROM compat_screen WHERE run_id = $1', [runId]);
    expect(Number(r.rows[0]!.n)).toBe(0);
  });

  it('판정은 칸마다 하나이고 있는 점검 상태에만 · 정한 값만 받는다', async () => {
    const runId = await 실행('COMPAT', await 세트());
    await 상태(runId, 1);
    const 판정 = (seq: number, verdict: string) =>
      q(`INSERT INTO compat_verdict (run_id, screen_key, seq, verdict, judged_by) VALUES ($1, 'app:.Main', $2, $3, 'xco')`, [
        runId, seq, verdict,
      ]);
    await 판정(1, 'CONFIRMED');
    await expect(판정(1, 'NOT_DEFECT')).rejects.toThrow('compat_verdict_pkey');
    await expect(판정(2, 'CONFIRMED')).rejects.toThrow('compat_verdict_run_id_seq_fkey');
    await expect(
      q(`UPDATE compat_verdict SET verdict = 'MAYBE' WHERE run_id = $1`, [runId]),
    ).rejects.toThrow('compat_verdict_verdict_check');
  });

  it('grafana_ro 는 새 표를 못 읽는다', async () => {
    const r = await q<{ 표: string; 읽음: boolean }>(
      `SELECT t AS "표", has_any_column_privilege('grafana_ro', t, 'SELECT') AS "읽음"
         FROM unnest($1::text[]) AS t`,
      [Object.keys(정본)],
    );
    expect(r.rows.filter((x) => x.읽음).map((x) => x.표)).toEqual([]);
  });
});
