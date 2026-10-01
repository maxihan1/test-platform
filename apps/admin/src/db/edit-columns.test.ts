// 케이스 고치기 종류(EDIT)와 원본 짝 제약 — EDIT 는 작성처럼 뿌리이고 재실행 · 머지가 가리킬 수 있다 (SPEC 도메인/작성 「★ 케이스 고치기」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XEA';

describe.skipIf(연결 === undefined)('케이스 고치기 종류와 원본 짝', () => {
  let 서비스 = 0;

  const 넣기 = async (kind: string, sourceId: number | null = null): Promise<number> => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, requested_by, requested_by_name, status)
       VALUES ($1, $2, $3, 'xea', '검사', 'PENDING')
       RETURNING id`,
      [서비스, kind, sourceId],
    );
    return Number(r.rows[0]!.id);
  };

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xea')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 케이스 고치기 칸 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('케이스 고치기는 원본 없이 들어간다', async () => {
    await expect(넣기('EDIT')).resolves.toBeGreaterThan(0);
  });

  it('케이스 고치기는 원본을 가리키지 못한다', async () => {
    const 뿌리 = await 넣기('EDIT');
    await expect(넣기('EDIT', 뿌리)).rejects.toThrow('authoring_request_source_pair_check');
  });

  it('머지와 재실행은 케이스 고치기를 원본으로 가리킬 수 있다', async () => {
    const 뿌리 = await 넣기('EDIT');
    await expect(넣기('MERGE', 뿌리)).resolves.toBeGreaterThan(0);
    await expect(넣기('RERUN', 뿌리)).resolves.toBeGreaterThan(0);
  });

  it('모르는 종류는 원본 짝이 맞아도 들어가지 못한다', async () => {
    const 뿌리 = await 넣기('EDIT');
    await expect(넣기('DELETE', 뿌리)).rejects.toThrow('authoring_request_kind_check');
  });

  it('작성 요청은 여전히 원본을 가리키지 못한다', async () => {
    const 뿌리 = await 넣기('AUTHOR');
    await expect(넣기('AUTHOR', 뿌리)).rejects.toThrow('authoring_request_source_pair_check');
  });
});
