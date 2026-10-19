// 프로젝트(애플리케이션을 묶는 폴더)를 읽고 만들고 이름을 바꾸는 곳 (SPEC 도메인/인증 §7 · 공통/4-데이터모델 「프로젝트 표」).
// 지우지 않는다 — 지난 실행이 가리키는 것을 흔들지 않는다

import { db, 설정오류, 한묶음 } from './store.js';

export interface 프로젝트행 {
  id: number;
  name: string;
}

export async function 프로젝트목록(): Promise<프로젝트행[]> {
  const pool = await db();
  const rows = await pool.query<{ id: string; name: string }>('SELECT id, name FROM project ORDER BY name, id');
  // BIGSERIAL 은 pg 가 글자열로 준다. 경계에서 숫자로 바꾼다 (settings/store.ts 와 같은 규약)
  return rows.rows.map((r) => ({ id: Number(r.id), name: r.name }));
}

/**
 * @param 만든이 요청한 운영 계정의 아이디. 있으면 그 프로젝트에 세 칸 쓰기로 배정한다 — 안 하면 방금 만든 프로젝트가
 *   그 사람의 고르개에 안 떠서 설정에서 자기를 따로 배정해야 한다 (도메인/인증 §3.5 「배정은 권한의 한 부분이다」)
 */
export async function 프로젝트만들기(name: string, 만든이?: string): Promise<number> {
  return 한묶음(async (client) => {
    const rows = await client.query<{ id: string }>('INSERT INTO project (name) VALUES ($1) RETURNING id', [name]);
    const id = Number(rows.rows[0]!.id);
    if (만든이 !== undefined) {
      await client.query(
        `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring)
              SELECT username, $2, 'write', 'write', 'write' FROM app_user WHERE username = $1
         ON CONFLICT DO NOTHING`,
        [만든이, id],
      );
    }
    return id;
  });
}

export async function 프로젝트이름고치기(id: number, name: string): Promise<void> {
  const pool = await db();
  const rows = await pool.query('UPDATE project SET name = $2 WHERE id = $1', [id, name]);
  if (rows.rowCount === 0) throw new 설정오류('NOT_FOUND');
}
