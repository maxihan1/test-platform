// 작성 중단·폐기·진척 칸과 제약 검사 — STOPPED ↔ 이유·누가 짝 · 이유 (SPEC 공통/4-데이터모델 「작성 중단 · 폐기 · 진척 칸」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWTC';

describe.skipIf(연결 === undefined)('작성 중단 칸', () => {
  let 서비스 = 0;

  const 넣기 = async (상태: string, 이유: string | null, 누가: string | null) => {
    const { pool } = await import('../db/index.js');
    return pool.query(
      `INSERT INTO authoring_request (service_id, kind, spec_text, requested_by, requested_by_name, status, stop_reason, stopped_by)
       VALUES ($1, 'AUTHOR', '본문', 'tester', '시험자', $2, $3, $4) RETURNING id`,
      [서비스, 상태, 이유, 누가],
    );
  };

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', 'https://github.com/acme/xwtc', 'xwtc')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 중단 칸 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it.each(['USER', 'TIMEOUT', 'LIMIT', 'AGENT_RESTART', 'AGENT_LOST'])('STOPPED 는 이유 %s 와 누가를 함께 받는다', async (이유) => {
    await expect(넣기('STOPPED', 이유, 'system')).resolves.toBeDefined();
  });

  it('STOPPED 인데 이유나 누가가 비면 막힌다', async () => {
    await expect(넣기('STOPPED', null, 'system')).rejects.toThrow(/check/i);
    await expect(넣기('STOPPED', 'USER', null)).rejects.toThrow(/check/i);
  });

  it('STOPPED 가 아닌데 이유가 있으면 막힌다', async () => {
    await expect(넣기('FAILED', 'TIMEOUT', 'system')).rejects.toThrow(/check/i);
  });

  it('모르는 이유는 막힌다', async () => {
    await expect(넣기('STOPPED', 'BORED', 'system')).rejects.toThrow(/check/i);
  });

  it('멈춤 요청·폐기·진척 칸이 있다', async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query(
      `INSERT INTO authoring_request (service_id, kind, spec_text, requested_by, requested_by_name, status,
                                      stop_requested_at, stop_requested_by, discarded_at, progress)
       VALUES ($1, 'AUTHOR', '본문', 'tester', '시험자', 'RUNNING', now(), 'tester', now(), '{"tokens": 1}')
       RETURNING progress`,
      [서비스],
    );
    expect(r.rows[0]).toEqual({ progress: { tokens: 1 } });
  });

  it('대시보드 계정은 stop_reason 을 읽는다', async () => {
    const { Client } = await import('pg');
    const 주소 = new URL(연결 as string);
    주소.username = 'grafana_ro';
    주소.password = 'grafana_ro';
    const 읽기 = new Client({ connectionString: 주소.toString() });
    await 읽기.connect();
    try {
      await expect(읽기.query('SELECT stop_reason FROM authoring_request LIMIT 1')).resolves.toBeDefined();
      await expect(읽기.query('SELECT stopped_by FROM authoring_request LIMIT 1')).rejects.toThrow(/permission denied/);
    } finally {
      await 읽기.end();
    }
  });
});
