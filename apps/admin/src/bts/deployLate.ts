// 늦은 이슈 — 맡은 배포 뒤 「QA 요청」에 늦게 온 이슈를 1분마다 찾아 맡는다 (도메인/BTS §3.12 「새 기능 바퀴」 5)

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

import { BTS부르기, type 부르기함수 } from './client.js';
import { 맡기 } from './deployFlow.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const 글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

// BTS 규칙이 늦게 끝나 맡기 묶음에 못 든 이슈. 배포 뒤 이만큼만 1분마다 다시 찾는다 — 끝없이 BTS 를 두드리지 않게(BTS-F5-01 시작 질문 4)
export const 늦은이슈기한분 = 10;

/** 기한 안의 맡은 배포(프로젝트마다 가장 새 것 — 실패한 배포는 빼고)마다 늦은 이슈를 맡는다 */
export async function 늦은이슈점검(부르기: 부르기함수 = BTS부르기): Promise<number> {
  const r = await (await db()).query<{ id: string }>(
    `SELECT d.id FROM bts_deploy d
      WHERE d.state = 'CLAIMED'
        -- 맡은 때부터 센다 — 맡기는 마지막 스모크가 끝난 직후다(스모크가 없으면 배포 신호 때). 스모크가 기한보다 길어도 늦은 이슈를 놓치지 않게
        AND GREATEST(d.created_at, (SELECT max(t.finished_at) FROM test_run t WHERE t.run_id = ANY(d.run_ids) AND t.build_stage = 'SMOKE')) > now() - make_interval(mins => $1)
        AND NOT EXISTS (SELECT 1 FROM bts_deploy n WHERE n.project_id = d.project_id AND n.id > d.id AND n.state <> 'FAILED')`,
    [늦은이슈기한분],
  );
  let 셈 = 0;
  for (const { id } of r.rows) {
    try {
      셈 += (await 맡기(Number(id), true, 부르기)).length;
    } catch (err) {
      console.error(`[bts] 배포 ${id} 의 늦은 이슈를 못 찾았다: ${글(err)}`);
    }
  }
  return 셈;
}

/** admin 이 뜰 때 건다(app.ts 기동 경로) — 보낼줄켜기 와 같은 틀 */
export function 늦은이슈켜기(app: FastifyInstance): void {
  let 도는중 = false;
  const 점검 = setInterval(() => {
    if (도는중) return;
    도는중 = true;
    void 늦은이슈점검()
      .then((셈) => {
        if (셈 > 0) app.log.info(`[bts] 늦은 이슈 ${String(셈)}건을 맡았다`);
      })
      .catch((err: unknown) => app.log.error(`[bts] 늦은 이슈 점검이 깨졌다: ${글(err)}`))
      .finally(() => {
        도는중 = false;
      });
  }, 60_000);
  app.addHook('onClose', async () => clearInterval(점검));
}
