// 실행 결과의 「이전 실행 · 다음 실행」 — 실행 기록 목록에 건 조건 그대로의 앞뒤 실행 번호 (도메인/실행 §7 `GET /api/runs/:runId/neighbors`)

import type { FastifyInstance } from 'fastify';

import { 자동수정실행빼기 } from '../bts/testFixView.js';
import { 정수 } from '../routeParams.js';

import type { 목록종류 } from './runKind.js';
import { 시작방식거르개 } from './runOrigin.js';
import { 거르는조건, type 실행거르개 } from './runSummary.js';
import { 지금항목 } from './single.js';

const 목록종류로: Record<string, 목록종류> = { UI: 'ui', FN: 'fn', SCENARIO: 'scenario', COMPAT: 'compat' };

/**
 * 그 실행과 같은 애플리케이션 · 같은 종류에서 조건에 맞는 바로 앞(prev — 번호가 작은 옛 실행) · 바로 뒤(next) 실행 번호. 없는 실행이면 null.
 * **목록과 같은 조건 함수(`거르는조건`)를 쓴다** — 두 벌이면 목록에 안 보이는 실행으로 넘어간다
 */
export async function 앞뒤실행(runId: number, 거르개: Omit<실행거르개, 'kind'>): Promise<{ prev: number | null; next: number | null } | null> {
  const { pool } = await import('../db/index.js');
  const 실행 = await pool.query<{ service_id: string; kind: string }>('SELECT service_id, kind FROM test_run WHERE run_id = $1', [runId]);
  const 줄 = 실행.rows[0];
  if (줄 === undefined) return null;
  const 조건 = 거르는조건({ ...거르개, kind: 목록종류로[줄.kind] ?? 'case' }, 3);
  // 한쪽 끝에서 한 줄만 집는다 — 번호 차례로 훑다 처음 맞는 실행에서 멈춘다. 「Fail 있음」(HAVING)이 걸려도 애플리케이션의 실행을 다 세지 않는다
  const 옆 = async (비교: '<' | '>', 차례: 'DESC' | 'ASC'): Promise<number | null> => {
    const r = await pool.query<{ run_id: string }>(
      `SELECT r.run_id
         FROM test_run r
         LEFT JOIN LATERAL ${지금항목('o.run_id = r.run_id', 자동수정실행빼기)} i ON true
        WHERE r.service_id = $1 AND r.run_id ${비교} $2 ${조건.where}
        GROUP BY r.run_id
        ${조건.having}
        ORDER BY r.run_id ${차례}
        LIMIT 1`,
      [줄.service_id, runId, ...조건.값],
    );
    return r.rows[0] === undefined ? null : Number(r.rows[0].run_id);
  };
  const [prev, next] = await Promise.all([옆('<', 'DESC'), 옆('>', 'ASC')]);
  return { prev, next };
}

export async function 앞뒤경로(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { runId: string }; Querystring: { q?: string; state?: string; env?: string; origin?: string; days?: string } }>(
    '/runs/:runId/neighbors',
    async (req, reply) => {
      const runId = 정수(req.params.runId);
      if (runId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.runId });
      // 모르는 조건은 목록(GET /api/runs)처럼 조용히 버린다 — 거르개는 「무엇을 볼까」이지 권한이 아니다
      const state = req.query.state === 'running' || req.query.state === 'failed' ? req.query.state : undefined;
      const 앞뒤 = await 앞뒤실행(runId, {
        ...(req.query.q === undefined ? {} : { q: req.query.q }),
        ...(state === undefined ? {} : { state }),
        ...(req.query.env === undefined ? {} : { env: req.query.env }),
        ...시작방식거르개(req.query.origin, req.query.days),
      });
      return 앞뒤 ?? reply.code(404).send({ error: 'RUN_NOT_FOUND', detail: req.params.runId });
    },
  );
}
