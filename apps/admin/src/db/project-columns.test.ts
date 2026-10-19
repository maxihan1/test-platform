// 애플리케이션(service)이 속하는 프로젝트 층 (SPEC 공통/4-데이터모델 「프로젝트 표」)

import { afterAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XPJ', 'XPJ2', 'XPJ3'];

describe.skipIf(연결 === undefined)('프로젝트 칸', () => {
  const 프로젝트들: number[] = [];

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ project_id: string }>('SELECT project_id FROM service WHERE prefix = ANY($1)', [접두사들]);
    await pool.query('DELETE FROM service WHERE prefix = ANY($1)', [접두사들]);
    const 지울것 = [...프로젝트들, ...r.rows.map((x) => Number(x.project_id))];
    await pool.query('DELETE FROM project WHERE id = ANY($1::bigint[])', [지울것]);
  });

  async function 만든다(prefix: string, projectId: number | null = null): Promise<{ id: number; projectId: number }> {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string; project_id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id)
            VALUES ($1, $2, '#3A5FCD', '', $3, $4)
       ON CONFLICT (prefix) DO NOTHING
         RETURNING id, project_id`,
      [prefix, `${prefix} 프로젝트 칸 검사용`, prefix.toLowerCase(), projectId],
    );
    const 행 = r.rows[0];
    if (행 === undefined) throw new Error(`${prefix} 를 이미 만들었다`);
    return { id: Number(행.id), projectId: Number(행.project_id) };
  }

  it('프로젝트를 안 주고 만들면 같은 이름의 프로젝트에 든다', async () => {
    const { pool } = await import('../db/index.js');
    const 앱 = await 만든다('XPJ');
    const r = await pool.query<{ name: string }>('SELECT name FROM project WHERE id = $1', [앱.projectId]);
    expect(r.rows[0]!.name).toBe('XPJ 프로젝트 칸 검사용');
  });

  it('같은 접두사로 다시 만들려다 그만두면 프로젝트가 늘지 않는다', async () => {
    const { pool } = await import('../db/index.js');
    const 셈 = async () => Number((await pool.query<{ n: string }>('SELECT count(*) AS n FROM project')).rows[0]!.n);
    const 전 = await 셈();
    await expect(만든다('XPJ')).rejects.toThrow('이미 만들었다');
    expect(await 셈()).toBe(전);
  });

  it('프로젝트를 주면 그 프로젝트에 들고 둘이 같이 묶인다', async () => {
    const { pool } = await import('../db/index.js');
    const p = await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XPJ 묶음') RETURNING id");
    const 묶음 = Number(p.rows[0]!.id);
    프로젝트들.push(묶음);
    const 둘 = await 만든다('XPJ2', 묶음);
    const 셋 = await 만든다('XPJ3', 묶음);
    expect([둘.projectId, 셋.projectId]).toEqual([묶음, 묶음]);
  });

  it('프로젝트를 비울 수 없다', async () => {
    const { pool } = await import('../db/index.js');
    await expect(pool.query("UPDATE service SET project_id = NULL WHERE prefix = 'XPJ'")).rejects.toThrow();
  });
});
