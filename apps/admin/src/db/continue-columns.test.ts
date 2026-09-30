// 남은 요구로 이어 작성 칸과 제약 검사 — continue_from 은 작성 요청에만 · 없는 번호는 안 된다 · 한 원본에 폐기 안 된 것 하나 (SPEC 공통/4-데이터모델 「작성 이어 작성 칸」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XCF';

describe.skipIf(연결 === undefined)('작성 이어 작성 칸', () => {
  let 서비스 = 0;

  const 넣기 = async (칸: { kind?: string; sourceId?: number | null; continueFrom?: number | null }): Promise<number> => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, source_id, requested_by, requested_by_name, status, continue_from)
       VALUES ($1, $2, $3, 'xcf', '검사', 'PENDING', $4)
       RETURNING id`,
      [서비스, 칸.kind ?? 'AUTHOR', 칸.sourceId ?? null, 칸.continueFrom ?? null],
    );
    return Number(r.rows[0]!.id);
  };

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xcf')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 이어 작성 칸 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('작성 요청은 반영 끝난 원본에서 이어 작성할 수 있다', async () => {
    const 원본 = await 넣기({});
    await expect(넣기({ continueFrom: 원본 })).resolves.toBeGreaterThan(0);
  });

  it('재실행에는 이어 작성이 붙지 않는다', async () => {
    const 원본 = await 넣기({});
    await expect(넣기({ kind: 'RERUN', sourceId: 원본, continueFrom: 원본 })).rejects.toThrow(
      'authoring_request_continue_from_check',
    );
  });

  it('없는 요청 번호에서는 이어 작성하지 못한다', async () => {
    await expect(넣기({ continueFrom: 999_999_999 })).rejects.toThrow('authoring_request_continue_from_fkey');
  });

  it('한 원본에서 폐기 안 된 이어 작성은 하나뿐이고 폐기하면 다시 선다', async () => {
    const { pool } = await import('../db/index.js');
    const 원본 = await 넣기({});
    const 첫째 = await 넣기({ continueFrom: 원본 });
    await expect(넣기({ continueFrom: 원본 })).rejects.toThrow('authoring_request_continue_from_once');
    await pool.query('UPDATE authoring_request SET discarded_at = now() WHERE id = $1', [첫째]);
    await expect(넣기({ continueFrom: 원본 })).resolves.toBeGreaterThan(0);
  });
});
