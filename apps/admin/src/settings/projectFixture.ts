// 설정 API 검사가 서비스를 만들 때 넘길 프로젝트를 DB 에 하나 만들고 치우는 도우미
// 설정 API 는 projectId 를 꼭 받는다. 검사 파일마다 모듈이 따로 떠서 파일 안에서는 같은 프로젝트를 쓴다

import { db } from './store.js';

let 번호: number | undefined;

/** 서비스를 지우면 트리거가 빈 프로젝트도 지우므로, 기억해 둔 번호가 살아 있는지 매번 본다 */
export async function 검사프로젝트(): Promise<number> {
  const pool = await db();
  if (번호 !== undefined) {
    const 있다 = await pool.query('SELECT 1 FROM project WHERE id = $1', [번호]);
    if (있다.rowCount === 1) return 번호;
  }
  const rows = await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XPQ 검사용') RETURNING id`);
  번호 = Number(rows.rows[0]!.id);
  return 번호;
}

/** 서비스를 다 지운 뒤에 부른다. 트리거가 이미 지웠으면 지울 것이 없다 */
export async function 검사프로젝트치우기(): Promise<void> {
  if (번호 === undefined) return;
  const pool = await db();
  await pool.query('DELETE FROM project WHERE id = $1', [번호]);
  번호 = undefined;
}
