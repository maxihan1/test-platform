// E2E 시나리오 표와 제약 검사 — 칸 모양 · 제약 목록 · 거절 · grafana_ro 권한 (SPEC 공통/4-데이터모델 「E2E 시나리오 표」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XSC';

// [칸, data_type, is_nullable, 기본값 유무] — 계약 블록 SQL 을 그대로 옮겼다
type 칸 = [string, string, 'YES' | 'NO', boolean];
const 정본: Record<string, 칸[]> = {
  scenario: [
    ['id', 'bigint', 'NO', true],
    ['service_id', 'bigint', 'NO', false],
    ['name', 'text', 'NO', false],
    ['is_active', 'boolean', 'NO', true],
    ['created_by', 'text', 'NO', false],
    ['created_at', 'timestamp with time zone', 'NO', true],
  ],
  scenario_version: [
    ['scenario_id', 'bigint', 'NO', false],
    ['version', 'integer', 'NO', false],
    ['platform', 'text', 'NO', true],
    ['parts', 'jsonb', 'NO', false],
    ['saved_by', 'text', 'NO', false],
    ['saved_by_name', 'text', 'NO', false],
    ['saved_at', 'timestamp with time zone', 'NO', true],
  ],
  scenario_run_part: [
    ['id', 'bigint', 'NO', true],
    ['run_id', 'bigint', 'NO', false],
    ['seq', 'integer', 'NO', false],
    ['kind', 'text', 'NO', false],
    ['tc_id', 'text', 'YES', false],
    ['tc_name', 'text', 'YES', false],
    ['part', 'jsonb', 'NO', false],
    ['file_path', 'text', 'YES', false],
    ['param_schema', 'jsonb', 'YES', false],
    ['expected_schema', 'jsonb', 'YES', false],
    ['timeout_ms', 'integer', 'YES', false],
    ['precondition', 'jsonb', 'NO', true],
    ['skipped_steps', 'jsonb', 'NO', true],
    ['mocks', 'jsonb', 'NO', true],
    ['status', 'text', 'NO', false],
    ['duration_ms', 'integer', 'YES', false],
    ['error', 'jsonb', 'YES', false],
    ['finished_at', 'timestamp with time zone', 'YES', false],
  ],
  scenario_run_step: [
    ['id', 'bigint', 'NO', true],
    ['part_id', 'bigint', 'NO', false],
    ['seq', 'integer', 'NO', false],
    ['title', 'text', 'NO', false],
    ['status', 'text', 'NO', false],
    ['skipped', 'boolean', 'NO', true],
    ['duration_ms', 'integer', 'YES', false],
    ['assertions', 'jsonb', 'NO', true],
    ['line', 'integer', 'YES', false],
    ['screenshot_path', 'text', 'YES', false],
    ['http_trace', 'jsonb', 'YES', false],
    ['error', 'jsonb', 'YES', false],
  ],
};
const test_run새칸: 칸[] = [
  ['kind', 'text', 'NO', true],
  ['scenario_id', 'bigint', 'YES', false],
  ['scenario_version', 'integer', 'YES', false],
];

// [제약 이름, 종류(p·f·u·c)]
const 정본제약: Record<string, [string, string][]> = {
  scenario: [['scenario_pkey', 'p'], ['scenario_service_id_fkey', 'f']],
  scenario_version: [
    ['scenario_version_pkey', 'p'],
    ['scenario_version_platform_check', 'c'],
    ['scenario_version_scenario_id_fkey', 'f'],
    ['scenario_version_version_check', 'c'],
  ],
  scenario_run_part: [
    ['scenario_run_part_case_snapshot_check', 'c'],
    ['scenario_run_part_case_tc_check', 'c'],
    ['scenario_run_part_kind_check', 'c'],
    ['scenario_run_part_pkey', 'p'],
    ['scenario_run_part_run_id_fkey', 'f'],
    ['scenario_run_part_run_id_seq_key', 'u'],
  ],
  scenario_run_step: [
    ['scenario_run_step_part_id_fkey', 'f'],
    ['scenario_run_step_part_id_seq_key', 'u'],
    ['scenario_run_step_pkey', 'p'],
  ],
};

describe.skipIf(연결 === undefined)('E2E 시나리오 표', () => {
  let 서비스 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 치우기 = async () => {
    await q(
      `DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)`,
      [서비스],
    );
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q(
      'DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)',
      [서비스],
    );
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스]);
  };

  const 시나리오 = async (): Promise<number> => {
    const r = await q<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XSC 주문 흐름', 'xsc') RETURNING id`,
      [서비스],
    );
    return Number(r.rows[0]!.id);
  };

  const 버전 = (시나리오id: number, version: number, platform?: string) =>
    q(
      `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name)
       VALUES ($1, $2, COALESCE($3, 'desktop'), '[]', 'xsc', '검사')`,
      [시나리오id, version, platform ?? null],
    );

  const 실행 = async (칸: { kind?: string; scenarioId?: number | null; version?: number | null } = {}) => {
    const r = await q<{ run_id: string; kind: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url
                             ${칸.kind === undefined ? '' : ', kind'}, scenario_id, scenario_version)
       VALUES ('XSC 실행', 'xsc', 'demo', 'FINISHED', $1, 'XSC', '', ''
               ${칸.kind === undefined ? '' : ', $4'}, $2, $3)
       RETURNING run_id, kind`,
      칸.kind === undefined
        ? [서비스, 칸.scenarioId ?? null, 칸.version ?? null]
        : [서비스, 칸.scenarioId ?? null, 칸.version ?? null, 칸.kind],
    );
    return { runId: Number(r.rows[0]!.run_id), kind: r.rows[0]!.kind };
  };

  // 기본값은 올바른 case 부품이다. 검사마다 칸 하나만 망가뜨린다
  const 부품 = async (runId: number, 칸: Record<string, unknown> = {}) => {
    const 값 = {
      seq: 1, kind: 'case', tc_id: 'XSC-001', file_path: 'xsc/a.spec.ts',
      param_schema: '{}', expected_schema: '{}', timeout_ms: 300000, ...칸,
    };
    const r = await q<{ id: string }>(
      `INSERT INTO scenario_run_part
         (run_id, seq, kind, tc_id, part, file_path, param_schema, expected_schema, timeout_ms, status)
       VALUES ($1, $2, $3, $4, '{}', $5, $6, $7, $8, 'NA') RETURNING id`,
      [runId, 값.seq, 값.kind, 값.tc_id, 값.file_path, 값.param_schema, 값.expected_schema, 값.timeout_ms],
    );
    return Number(r.rows[0]!.id);
  };

  beforeAll(async () => {
    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xsc')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 시나리오 표 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기();
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('칸 모양이 계약 블록 SQL 과 같다', async () => {
    const 읽기 = async (표: string, 이름들?: string[]) => {
      const r = await q<{ column_name: string; data_type: string; is_nullable: string; has_default: boolean }>(
        `SELECT column_name, data_type, is_nullable, column_default IS NOT NULL AS has_default
           FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [표],
      );
      return r.rows
        .filter((c) => 이름들 === undefined || 이름들.includes(c.column_name))
        .map((c) => [c.column_name, c.data_type, c.is_nullable, c.has_default]);
    };
    for (const [표, 칸들] of Object.entries(정본)) {
      expect(await 읽기(표), 표).toEqual(칸들);
    }
    expect(await 읽기('test_run', test_run새칸.map((c) => c[0]))).toEqual(test_run새칸);
  });

  it('제약 목록이 계약 블록 SQL 과 같다', async () => {
    for (const [표, 제약들] of Object.entries(정본제약)) {
      const r = await q<{ conname: string; contype: string }>(
        `SELECT conname, contype FROM pg_constraint WHERE conrelid = $1::regclass ORDER BY conname`,
        [표],
      );
      expect(r.rows.map((c) => [c.conname, c.contype]), 표).toEqual(제약들);
    }
    const t = await q<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'test_run'::regclass`,
    );
    expect(t.rows.map((c) => c.conname)).toEqual(
      expect.arrayContaining(['test_run_kind_check', 'test_run_scenario_id_fkey', 'test_run_scenario_check']),
    );
  });

  it('부품을 지우면 절차도 지워지고 실행은 부품을 두고 못 지운다', async () => {
    const r = await q<{ conname: string; confdeltype: string }>(
      `SELECT conname, confdeltype FROM pg_constraint
        WHERE conname IN ('scenario_run_step_part_id_fkey', 'scenario_run_part_run_id_fkey') ORDER BY conname`,
    );
    expect(r.rows.map((c) => [c.conname, c.confdeltype])).toEqual([
      ['scenario_run_part_run_id_fkey', 'a'],
      ['scenario_run_step_part_id_fkey', 'c'],
    ]);
  });

  it('kind 없이 넣은 실행은 CASE 다', async () => {
    expect((await 실행()).kind).toBe('CASE');
  });

  it('시나리오 실행은 시나리오와 버전을 둘 다 가진다', async () => {
    const s = await 시나리오();
    await 버전(s, 1);
    expect((await 실행({ kind: 'SCENARIO', scenarioId: s, version: 1 })).kind).toBe('SCENARIO');
    await expect(실행({ kind: 'SCENARIO' })).rejects.toThrow('test_run_scenario_check');
    await expect(실행({ kind: 'SCENARIO', scenarioId: s })).rejects.toThrow('test_run_scenario_check');
    await expect(실행({ kind: 'CASE', scenarioId: s, version: 1 })).rejects.toThrow('test_run_scenario_check');
    await expect(실행({ kind: 'X' })).rejects.toThrow('test_run_kind_check');
  });

  it('버전은 1부터 · 한 번씩 · 디바이스는 둘 중 하나다', async () => {
    const s = await 시나리오();
    await 버전(s, 1, 'mobile');
    await expect(버전(s, 0)).rejects.toThrow('scenario_version_version_check');
    await expect(버전(s, 1)).rejects.toThrow('scenario_version_pkey');
    await expect(버전(s, 2, 'tablet')).rejects.toThrow('scenario_version_platform_check');
    const r = await q<{ platform: string }>(
      `INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name)
       VALUES ($1, 3, '[]', 'xsc', '검사') RETURNING platform`,
      [s],
    );
    expect(r.rows[0]!.platform).toBe('desktop');
  });

  it('case 부품만 케이스 번호와 박제 넷을 가진다', async () => {
    const { runId } = await 실행();
    await expect(부품(runId, { seq: 1 })).resolves.toBeGreaterThan(0);
    await expect(부품(runId, { seq: 2, tc_id: null })).rejects.toThrow('scenario_run_part_case_tc_check');
    await expect(
      부품(runId, { seq: 3, kind: 'wait', file_path: null, param_schema: null, expected_schema: null, timeout_ms: null }),
    ).rejects.toThrow('scenario_run_part_case_tc_check');
    for (const [i, 빈칸] of ['file_path', 'param_schema', 'expected_schema', 'timeout_ms'].entries()) {
      await expect(부품(runId, { seq: 10 + i, [빈칸]: null }), 빈칸).rejects.toThrow(
        'scenario_run_part_case_snapshot_check',
      );
    }
    await expect(부품(runId, { seq: 4, kind: 'x', tc_id: null })).rejects.toThrow('scenario_run_part_kind_check');
    await expect(부품(runId, { seq: 1 })).rejects.toThrow('scenario_run_part_run_id_seq_key');
    await expect(
      부품(runId, { seq: 5, kind: 'wait', tc_id: null, file_path: null, param_schema: null, expected_schema: null, timeout_ms: null }),
    ).resolves.toBeGreaterThan(0);
  });

  it('절차 순번은 부품 안에서 한 번씩이고 부품을 지우면 따라 지워진다', async () => {
    const { runId } = await 실행();
    const p = await 부품(runId);
    const 절차 = () =>
      q(`INSERT INTO scenario_run_step (part_id, seq, title, status) VALUES ($1, 1, '계정을 만든다', 'PASS')`, [p]);
    await 절차();
    await expect(절차()).rejects.toThrow('scenario_run_step_part_id_seq_key');
    await q('DELETE FROM scenario_run_part WHERE id = $1', [p]);
    const r = await q<{ n: string }>('SELECT count(*) AS n FROM scenario_run_step WHERE part_id = $1', [p]);
    expect(Number(r.rows[0]!.n)).toBe(0);
  });

  it('grafana_ro 는 새 표를 못 읽고 test_run.kind 는 읽는다', async () => {
    const r = await q<{ 표: string; 읽음: boolean }>(
      `SELECT t AS "표", has_any_column_privilege('grafana_ro', t, 'SELECT') AS "읽음"
         FROM unnest($1::text[]) AS t`,
      [Object.keys(정본)],
    );
    expect(r.rows.filter((x) => x.읽음).map((x) => x.표)).toEqual([]);
    const k = await q<{ ok: boolean }>(`SELECT has_column_privilege('grafana_ro', 'test_run', 'kind', 'SELECT') AS ok`);
    expect(k.rows[0]!.ok).toBe(true);
  });
});
