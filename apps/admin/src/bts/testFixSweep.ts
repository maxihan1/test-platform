// BTS 「테스트 수정」 바퀴의 60초 점검 — 따로 적어 둔 할 일 없이 줄 상태와 작성 · 실행 기록에서 다음 단계를 찾는다 (도메인/BTS §3.12 「테스트 수정 바퀴」 6)
// 반영 끝 · 실행 끝 알림을 놓쳤거나 Issue Bunker 에 못 닿은 단계 · 작성이 PR 없이 끝난 줄이 여기서 이어진다

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

import { 사슬식, 최신식 } from '../authoring/chainSql.js';
import { BTS부르기, type 부르기함수 } from './client.js';
import { 테스트수정병합판정 } from './testFixMerge.js';
import { 걸기, 끝보기, 되돌리기, 이어가나, 줄읽기, type 줄 } from './testFixRerun.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 고침 작성이 PR 없이 끝났거나 실패 · 멈춤 · 폐기됐으면 그 까닭. 아직 돌거나 PR 을 열었으면 null */
async function 작성끝까닭(줄: 줄): Promise<string | null> {
  if (줄.request_id === null) return '테스트 수정 작성이 지워졌어요';
  const r = (
    await (await db()).query<{ discarded: boolean; kind: string; status: string; pr_url: string | null }>(
      `WITH RECURSIVE ${사슬식('id = $1')}
       SELECT (SELECT discarded_at IS NOT NULL FROM authoring_request WHERE id = $1) AS discarded, a.kind, a.status, a.pr_url
         FROM authoring_request a WHERE a.id = ${최신식('사슬')}`,
      [줄.request_id],
    )
  ).rows[0];
  if (r === undefined) return null;
  if (r.discarded) return '테스트 수정 작성을 폐기했어요';
  // PR 을 연 뒤의 재실행 실패는 PR 이 그대로라 사람이 반영할 수 있다 — 되돌리지 않는다
  if (줄.state !== 'FIXING') return null;
  if (r.status === 'FAILED') return '테스트 수정 작성이 실패했어요';
  if (r.status === 'STOPPED') return '테스트 수정 작성이 멈췄어요';
  if (r.status === 'DONE' && r.kind !== 'MERGE' && r.pr_url === null) return '고칠 곳을 찾지 못했어요';
  return null;
}

/** 고침 작성이 PR 없이 끝났으면 되돌린다 */
async function 작성끝살피기(줄: 줄, 부르기: 부르기함수): Promise<boolean> {
  const 까닭 = await 작성끝까닭(줄);
  if (까닭 === null) return false;
  if (await 이어가나(줄, 부르기)) await 되돌리기(줄, 까닭);
  return true;
}

/**
 * 판정 전에 Issue Bunker 에 못 닿아 넘긴 줄을 다시 판정한다 — 끝난 그 PR 의 작성이 있고, 사람 확인 댓글도 자동 반영도 없을 때만.
 * 도는 실행 · 뒤 실행 때문에 넘긴 줄도 여기 걸리지만 판정이 다시 넘긴다
 */
async function 판정다시(줄: 줄, 부르기: 부르기함수): Promise<void> {
  if (줄.merge !== null || 줄.held.length > 0 || 줄.pr_url === null || 줄.request_id === null) return;
  const pool = await db();
  const 댓글 = await pool.query(
    `SELECT 1 FROM bts_outbox WHERE project_id = $1 AND issue_key = $2 AND kind = 'COMMENT'
        AND starts_with(payload->>'body', '사람 확인이 필요해요') AND right(payload->>'body', length($3)) = $3`,
    [줄.project_id, 줄.issue_key, 줄.pr_url],
  );
  if ((댓글.rowCount ?? 0) > 0) return;
  // 사슬의 최신 실행이 그 PR 로 끝난 작성이고 반영을 한 번도 안 세웠을 때만 — 사람이 반영을 눌렀거나 뒤 실행이 돌면 그쪽이 이어 간다(매분 Issue Bunker 를 부르지 않게)
  const 끝 = (
    await pool.query<{ id: string; service_id: string; result: unknown }>(
      `WITH RECURSIVE ${사슬식('id = $1')}
       SELECT a.id, a.service_id, a.result FROM authoring_request a
        WHERE a.id = ${최신식('사슬')} AND a.status = 'DONE' AND a.kind <> 'MERGE' AND a.pr_url = $2
          AND NOT EXISTS (SELECT 1 FROM 사슬 s JOIN authoring_request m ON m.id = s.id WHERE m.kind = 'MERGE')`,
      [줄.request_id, 줄.pr_url],
    )
  ).rows[0];
  if (끝 !== undefined) await 테스트수정병합판정(Number(끝.id), Number(끝.service_id), Number(줄.request_id), 줄.pr_url, 끝.result, 부르기);
}

/**
 * 도는 줄마다 다음 단계를 찾아 한다. 다시 실행을 막 차지했는데 실행 번호를 못 적은 줄(그사이 admin 이 꺼짐)은 10분 뒤 끝 판정이 「기록 없음」으로 되돌린다.
 * 한 줄이 깨져도 다음 줄은 본다
 */
export async function 테스트수정점검(부르기: 부르기함수 = BTS부르기): Promise<void> {
  const 줄들 = await (await db()).query<{ id: string }>(
    `SELECT f.id FROM bts_test_fix f LEFT JOIN test_run r ON r.run_id = f.rerun_id
      WHERE f.state IN ('FIXING', 'WAIT_MERGE')
         OR (f.state = 'RERUNNING' AND r.status IS DISTINCT FROM 'RUNNING' AND (f.rerun_id IS NOT NULL OR f.updated_at < now() - interval '10 minutes'))
      ORDER BY f.id`,
  );
  for (const { id } of 줄들.rows) {
    try {
      const 줄 = await 줄읽기(id);
      if (줄 === undefined) continue;
      if (줄.state === 'RERUNNING') await 끝보기(줄, 부르기);
      else if (!(await 작성끝살피기(줄, 부르기)) && 줄.state === 'WAIT_MERGE') {
        await 걸기(줄, 부르기);
        await 판정다시(줄, 부르기);
      }
    } catch (err) {
      console.error(`[bts] 테스트 수정 줄 ${id} 점검이 깨졌다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/** admin 이 뜰 때 건다(app.ts 기동 경로) — 보낼줄켜기(outbox.ts)와 같은 틀 */
export function 테스트수정켜기(app: FastifyInstance): void {
  let 도는중 = false;
  const 점검 = setInterval(() => {
    if (도는중) return;
    도는중 = true;
    void 테스트수정점검()
      .catch((err: unknown) => app.log.error(`[bts] 테스트 수정 점검이 깨졌다: ${err instanceof Error ? err.message : String(err)}`))
      .finally(() => {
        도는중 = false;
      });
  }, 60_000);
  app.addHook('onClose', async () => clearInterval(점검));
}
