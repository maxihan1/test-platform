// 프로젝트의 API 서버 이름 — 서비스 지도에 남은 호스트에 사람이 붙인 이름을 읽고 쓴다 (SPEC 도메인/인증 §7 `…/api-servers` · 공통/4-데이터모델 「API 서버 이름 표」)
// 이름은 케이스 목록의 꼬리표(칩)가 된다. 호스트가 어떤 케이스에 닿는지는 서비스 지도(service_api_use)가 알고 이 표는 이름만 안다

import { db, 설정오류, 한묶음 } from './store.js';

export interface API서버줄 {
  host: string;
  /** 이름이 없으면 null */
  name: string | null;
  /** 그 호스트를 부른 활성 케이스 수. 크롤러가 본 호출은 안 센다 */
  cases: number;
}

async function 프로젝트있나(client: { query: (sql: string, args: unknown[]) => Promise<{ rowCount: number | null }> }, 프로젝트: number): Promise<void> {
  const r = await client.query('SELECT 1 FROM project WHERE id = $1', [프로젝트]);
  if (r.rowCount === 0) throw new 설정오류('NOT_FOUND');
}

/** 그 프로젝트 애플리케이션의 케이스가 부른 호스트 + 이름이 붙은 호스트(케이스가 0건이 돼도 남긴다 — 이름을 지울 수 있게) */
export async function API서버목록(프로젝트: number): Promise<API서버줄[]> {
  const pool = await db();
  await 프로젝트있나(pool, 프로젝트);
  const rows = await pool.query<{ host: string; name: string | null; cases: string }>(
    `SELECT COALESCE(b.host, n.host) AS host, n.name, COALESCE(b.cases, 0) AS cases
       FROM (SELECT a.host, count(DISTINCT u.tc_id) AS cases
               FROM service_api_use u
               JOIN service_api a ON a.id = u.api_id
               JOIN service s ON s.id = a.service_id
               JOIN test_case c ON c.tc_id = u.tc_id AND c.is_active
              WHERE s.project_id = $1 AND u.tc_id IS NOT NULL
              GROUP BY a.host) b
       FULL JOIN (SELECT host, name FROM project_api_server WHERE project_id = $1) n ON n.host = b.host
      ORDER BY 1`,
    [프로젝트],
  );
  // count 는 pg 가 글자열로 준다. 경계에서 숫자로 바꾼다 (settings/store.ts 와 같은 규약)
  return rows.rows.map((r) => ({ host: r.host, name: r.name, cases: Number(r.cases) }));
}

/** 준 호스트의 이름만 갈아 끼운다. 빈 이름은 그 호스트의 이름을 지운다. 호스트·이름 모양은 라우트가 이미 다듬었다 */
export async function API서버이름저장(프로젝트: number, 줄들: { host: string; name: string }[]): Promise<void> {
  await 한묶음(async (client) => {
    await 프로젝트있나(client, 프로젝트);
    for (const { host, name } of 줄들) {
      if (name === '') {
        await client.query('DELETE FROM project_api_server WHERE project_id = $1 AND host = $2', [프로젝트, host]);
      } else {
        await client.query(
          `INSERT INTO project_api_server (project_id, host, name) VALUES ($1, $2, $3)
           ON CONFLICT (project_id, host) DO UPDATE SET name = EXCLUDED.name`,
          [프로젝트, host, name],
        );
      }
    }
  });
}
