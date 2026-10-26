// 열린 작성 판정 — 한 애플리케이션에 반영 안 된 작성 뿌리가 둘 열리지 않게 새 테스트 만들기를 막는다 (도메인/작성 §3.6 「★ 결정 목록」 「서버 막기」)

import type { PoolClient } from 'pg';

import { 제출 } from './assetStore.js';
import { 사슬식, 최신식 } from './chainSql.js';
import { 뿌리잠그고 } from './history.js';
import { db } from './store.js';

/** 뿌리마다 최신 실행(`뿌리(root_id, latest)`). 실패한 머지는 최신식이 건너뛴다 — 반영 실패는 앞 DONE 이 최신이라 열린 것으로 든다 */
const 뿌리최신식 = (뿌리조건: string) => `${사슬식(뿌리조건)},
    뿌리(root_id, latest) AS (
      SELECT DISTINCT 사슬.root_id, ${최신식('(SELECT 안.id FROM 사슬 안 WHERE 안.root_id = 사슬.root_id)')} FROM 사슬
    )`;

/**
 * 그 애플리케이션의 열린 작성 뿌리 번호들 — 폐기 안 됨 · 최신 실행이 대기 · 도는 중 · 끝났고 반영 전(작성 · 고치기 DONE) · 반영 중 · 반영 실패.
 * 작성 실패 · 중단 · 초안 · 병합된 반영은 안 든다. `빼고` 는 그 뿌리 자신의 재실행 · 방금 병합한 뿌리처럼 셈에서 뺄 번호다.
 * `손`(트랜잭션)을 주면 서비스 잠금을 먼저 잡는다 — 확인과 넣기 사이에 다른 요청이 끼면 둘이 같이 열린다(#14679 꼴). 트랜잭션이 끝나면 풀린다
 */
export async function 열린작성(서비스: number, 손?: PoolClient, 빼고 = 0): Promise<number[]> {
  if (손 !== undefined) {
    await 손.query(`SELECT pg_advisory_xact_lock(hashtext('authoring-open'), ($1::bigint % 2147483647)::int)`, [서비스]);
  }
  const r = await (손 ?? (await db())).query<{ root_id: string }>(
    `WITH RECURSIVE ${뿌리최신식("service_id = $1 AND kind IN ('AUTHOR', 'EDIT') AND discarded_at IS NULL")}
     SELECT 뿌리.root_id FROM 뿌리 JOIN authoring_request m ON m.id = 뿌리.latest
      WHERE (m.status IN ('PENDING', 'RUNNING') OR (m.status = 'DONE' AND m.kind <> 'MERGE')) AND 뿌리.root_id <> $2
      ORDER BY 뿌리.root_id`,
    [서비스, 빼고],
  );
  return r.rows.map((x) => Number(x.root_id));
}

/**
 * 초안을 줄에 세운다(`DRAFT → PENDING`). 반영 안 된 다른 작성이 있으면 안 세우고 그 번호들을 준다. 아니면 제출 결과(거짓이면 NO_ASSETS · NOT_DRAFT).
 * 확인과 세우기를 잠금 안에서 — 초안은 열린 작성이 아니라 두 초안을 같이 제출하면 둘 다 확인을 통과한다. 자기는 뺀다 — 두 번 누르면 NOT_DRAFT 다
 */
export async function 막고제출(요청: number, 서비스: number): Promise<number[] | boolean> {
  return 뿌리잠그고(요청, async (손) => {
    const 열린 = await 열린작성(서비스, 손, 요청);
    return 열린.length > 0 ? 열린 : 제출(요청, 손);
  });
}

/**
 * 고칠 tcId 가운데 하나라도 끝내기 `result.cases` 에 든 열린 작성 뿌리 — 케이스 고치기가 같은 케이스를 두 PR 로 고치지 않게(EDIT_OPEN).
 * 다 쓴 작성만 본다: 끝났고 반영 전 · 반영 실패는 최신 실행의 목록, 반영 중은 그 머지가 반영하는 실행의 목록. 도는 중인 작성은 무엇을 쓸지 몰라 안 막는다
 */
export async function 케이스쓴열린작성(손: PoolClient, 서비스: number, tcIds: string[]): Promise<number[]> {
  const r = await 손.query<{ root_id: string }>(
    `WITH RECURSIVE ${뿌리최신식("service_id = $1 AND kind = 'AUTHOR' AND discarded_at IS NULL")}
     SELECT 뿌리.root_id FROM 뿌리
       JOIN authoring_request m ON m.id = 뿌리.latest
       JOIN authoring_request d ON d.id = CASE WHEN m.kind = 'MERGE' THEN m.source_id ELSE m.id END
      WHERE (m.kind = 'MERGE' AND m.status IN ('PENDING', 'RUNNING') OR m.kind <> 'MERGE' AND m.status = 'DONE')
        AND EXISTS (SELECT 1 FROM unnest($2::text[]) t WHERE d.result->'cases' @> jsonb_build_array(jsonb_build_object('tcId', t)))
      ORDER BY 뿌리.root_id`,
    [서비스, tcIds],
  );
  return r.rows.map((x) => Number(x.root_id));
}
