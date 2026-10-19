// 애플리케이션(service)이 속하는 프로젝트 층 (SPEC 공통/4-데이터모델 「프로젝트 표」)

import { afterEach, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XPJ', 'XPJ2', 'XPJ3'];
const 이름 = (prefix: string) => `${prefix} 프로젝트 칸 검사용`;

describe.skipIf(연결 === undefined)('프로젝트 칸', () => {
  afterEach(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM service WHERE prefix = ANY($1)', [접두사들]);
    await pool.query("DELETE FROM project WHERE name = 'XPJ 묶음'");
  });

  async function 만든다(prefix: string, 끝: 'NOTHING' | 'UPDATE' = 'NOTHING', projectId: number | null = null) {
    const { pool } = await import('../db/index.js');
    const 겹치면 = 끝 === 'NOTHING' ? 'DO NOTHING' : 'DO UPDATE SET is_active = true';
    const r = await pool.query<{ project_id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id)
            VALUES ($1, $2, '#3A5FCD', '', $3, $4)
       ON CONFLICT (prefix) ${겹치면}
         RETURNING project_id`,
      [prefix, 이름(prefix), prefix.toLowerCase(), projectId],
    );
    return r.rows[0] === undefined ? null : Number(r.rows[0].project_id);
  }

  async function 같은이름프로젝트(prefix: string): Promise<number> {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ n: string }>('SELECT count(*) AS n FROM project WHERE name = $1', [이름(prefix)]);
    return Number(r.rows[0]!.n);
  }

  it('프로젝트를 안 주고 만들면 같은 이름의 프로젝트에 든다', async () => {
    const { pool } = await import('../db/index.js');
    const p = await 만든다('XPJ');
    const r = await pool.query<{ name: string }>('SELECT name FROM project WHERE id = $1', [p]);
    expect(r.rows[0]!.name).toBe(이름('XPJ'));
  });

  it('같은 접두사로 다시 넣으면 그만두든 고쳐 쓰든 프로젝트가 늘지 않는다', async () => {
    const 처음 = await 만든다('XPJ');
    expect(await 만든다('XPJ', 'NOTHING')).toBeNull();
    expect(await 만든다('XPJ', 'UPDATE')).toBe(처음);
    expect(await 같은이름프로젝트('XPJ')).toBe(1);
  });

  it('프로젝트를 주면 그 프로젝트에 들고 둘이 같이 묶인다', async () => {
    const { pool } = await import('../db/index.js');
    const p = await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XPJ 묶음') RETURNING id");
    const 묶음 = Number(p.rows[0]!.id);
    expect([await 만든다('XPJ2', 'NOTHING', 묶음), await 만든다('XPJ3', 'NOTHING', 묶음)]).toEqual([묶음, 묶음]);
  });

  it('서비스를 지우면 남은 애플리케이션이 없는 프로젝트만 같이 지운다', async () => {
    const { pool } = await import('../db/index.js');
    await 만든다('XPJ');
    const p = await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XPJ 묶음') RETURNING id");
    const 묶음 = Number(p.rows[0]!.id);
    await 만든다('XPJ2', 'NOTHING', 묶음);
    await 만든다('XPJ3', 'NOTHING', 묶음);

    await pool.query("DELETE FROM service WHERE prefix IN ('XPJ', 'XPJ2')");

    expect(await 같은이름프로젝트('XPJ')).toBe(0);
    const 남음 = await pool.query('SELECT 1 FROM project WHERE id = $1', [묶음]);
    expect(남음.rowCount).toBe(1);
  });

  it('프로젝트를 비울 수 없다', async () => {
    const { pool } = await import('../db/index.js');
    await 만든다('XPJ');
    await expect(pool.query("UPDATE service SET project_id = NULL WHERE prefix = 'XPJ'")).rejects.toThrow();
  });
});
