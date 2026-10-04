// 서비스 설정 「훑지 않을 경로」를 담는 칸 (SPEC 공통/4-데이터모델 service · 도메인/인증 §7)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XEX';

describe.skipIf(연결 === undefined)('훑지 않을 경로 칸', () => {
  let 서비스 = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xex')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true, crawl_exclude = DEFAULT
         RETURNING id`,
      [접두사, `${접두사} 훑지 않을 경로 칸 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('새 서비스의 칸은 빈 목록이다', async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ crawl_exclude: string[] }>('SELECT crawl_exclude FROM service WHERE id = $1', [서비스]);
    expect(r.rows[0]!.crawl_exclude).toEqual([]);
  });

  it('경로 목록을 담고 그대로 읽는다', async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ crawl_exclude: string[] }>(
      'UPDATE service SET crawl_exclude = $2 WHERE id = $1 RETURNING crawl_exclude',
      [서비스, ['/daejeon', '/gyeongnam']],
    );
    expect(r.rows[0]!.crawl_exclude).toEqual(['/daejeon', '/gyeongnam']);
  });

  it('빈 값(NULL)은 받지 않는다', async () => {
    const { pool } = await import('../db/index.js');
    await expect(pool.query('UPDATE service SET crawl_exclude = NULL WHERE id = $1', [서비스])).rejects.toThrow();
  });
});
