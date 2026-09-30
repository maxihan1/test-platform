// 작성 커버리지 칸과 짝 제약 · 대시보드 권한 (SPEC 공통/4-데이터모델 「작성 커버리지 칸」 · 도메인/작성 §3.6 「★ 원장」)
// CI에는 postgres가 없을 수 있다. 실접속 검사는 DATABASE_URL이 있을 때만 돈다

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
// fixture 접두사 — 자기 service_id 로만 지운다 (CLAUDE.md §3)
const 접두사 = 'XWG';

type 셈칸 = { total: number | null; cased: number | null; held: number | null; excluded: number | null; missing: number | null };

describe.skipIf(연결 === undefined)('작성 커버리지 칸', () => {
  let 서비스 = 0;

  const 넣기 = async (칸: 셈칸) => {
    const { pool } = await import('./index.js');
    return pool.query(
      `INSERT INTO authoring_request (service_id, kind, spec_text, requested_by, requested_by_name, status,
                                      coverage_total, coverage_cased, coverage_held, coverage_excluded, coverage_missing)
       VALUES ($1, 'AUTHOR', '본문', 'tester', '시험자', 'DONE', $2, $3, $4, $5, $6) RETURNING id`,
      [서비스, 칸.total, 칸.cased, 칸.held, 칸.excluded, 칸.missing],
    );
  };
  const 맞는칸: 셈칸 = { total: 10, cased: 4, held: 1, excluded: 5, missing: 1 };

  beforeAll(async () => {
    const { pool } = await import('./index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', 'https://github.com/acme/xwg', 'xwg')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 커버리지 칸 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const { pool } = await import('./index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('합이 맞는 셈을 받는다', async () => {
    await expect(넣기(맞는칸)).resolves.toBeDefined();
  });

  it('칸이 전부 비면 받는다 — 원장이 없거나 셈 전 요청', async () => {
    await expect(넣기({ total: null, cased: null, held: null, excluded: null, missing: null })).resolves.toBeDefined();
  });

  it('보류만 비면 받는다 — 보류를 못 셌다', async () => {
    await expect(넣기({ ...맞는칸, held: null })).resolves.toBeDefined();
  });

  it('요구 = 케이스 + 제외 + 빠짐 이 아니면 막힌다', async () => {
    await expect(넣기({ ...맞는칸, total: 11 })).rejects.toThrow(/check/i);
  });

  it('넷 중 일부만 차면 막힌다', async () => {
    await expect(넣기({ ...맞는칸, missing: null })).rejects.toThrow(/check/i);
    await expect(넣기({ total: null, cased: 4, held: null, excluded: null, missing: null })).rejects.toThrow(/check/i);
  });

  it('음수는 합이 맞아도 막힌다', async () => {
    await expect(넣기({ total: 10, cased: 12, held: null, excluded: -3, missing: 1 })).rejects.toThrow(/check/i);
  });

  it('보류가 케이스보다 많거나 음수면 막힌다', async () => {
    await expect(넣기({ ...맞는칸, held: 5 })).rejects.toThrow(/check/i);
    await expect(넣기({ ...맞는칸, held: -1 })).rejects.toThrow(/check/i);
  });

  it('보류만 차고 나머지가 비면 막힌다', async () => {
    await expect(넣기({ total: null, cased: null, held: 0, excluded: null, missing: null })).rejects.toThrow(/check/i);
  });

  it('대시보드 계정은 다섯 칸을 읽는다', async () => {
    const { Client } = await import('pg');
    const 주소 = new URL(연결 as string);
    주소.username = 'grafana_ro';
    주소.password = 'grafana_ro';
    const 읽기 = new Client({ connectionString: 주소.toString() });
    await 읽기.connect();
    try {
      await expect(
        읽기.query(
          'SELECT coverage_total, coverage_cased, coverage_held, coverage_excluded, coverage_missing FROM authoring_request LIMIT 1',
        ),
      ).resolves.toBeDefined();
      await expect(읽기.query('SELECT result FROM authoring_request LIMIT 1')).rejects.toThrow(/permission denied/);
    } finally {
      await 읽기.end();
    }
  });
});
