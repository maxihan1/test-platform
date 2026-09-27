// 작성 에이전트가 자식 claude 의 토큰 사용량을 알리는 통로 (SPEC 도메인/작성 §7 「토큰 사용량」)
// agentRoutes.ts 가 300줄에 가까워 뗐다. 집은 쪽 대조는 그 파일의 집은쪽인가 를 그대로 쓴다

import type { FastifyInstance } from 'fastify';

import { 집은쪽인가 } from './agentRoutes.js';

export interface 사용량값 {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  partial: boolean;
  costUsd: number | null;
  model: string | null;
}

const 토큰 = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

/** 본문 모양을 본다. 틀리면 null — 한 칸이라도 이상하면 통째로 거절한다(부분 저장은 대시보드를 속인다) */
export function 사용량읽기(몸: Record<string, unknown> | undefined): 사용량값 | null {
  if (몸 === undefined) return null;
  const { input, output, cacheRead, cacheWrite, partial, costUsd, model } = 몸;
  if (!토큰(input) || !토큰(output) || !토큰(cacheRead) || !토큰(cacheWrite)) return null;
  if (typeof partial !== 'boolean') return null;
  if (costUsd !== undefined && !(typeof costUsd === 'number' && Number.isFinite(costUsd) && costUsd >= 0)) return null;
  if (model !== undefined && !(typeof model === 'string' && model.length >= 1 && model.length <= 100)) return null;
  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    partial,
    costUsd: costUsd ?? null,
    model: model ?? null,
  };
}

/**
 * 한 번만 남긴다. 조건을 UPDATE 한 문장에 다 넣는다 — 읽고 나서 쓰면 두 번 온 알림이 사이에 끼어 앞 값을 덮는다.
 * 끝난 행도 여기서 걸린다(RUNNING 조건). 그래서 에이전트는 끝내기보다 먼저 보낸다
 */
export async function 사용량남기기(id: number, 나: string, 값: 사용량값): Promise<boolean> {
  // DB 모듈은 불러오는 순간 DATABASE_URL 을 요구한다 — 권한 표만 보는 검사가 DB 없이도 이 파일을 불러야 한다 (store.ts 와 같다)
  const { pool } = await import('../db/index.js');
  const r = await pool.query(
    `UPDATE authoring_request
        SET tokens_input = $3, tokens_output = $4, tokens_cache_read = $5, tokens_cache_write = $6,
            tokens_partial = $7, cost_usd = $8, tokens_model = $9
      WHERE id = $1 AND claimed_by = $2 AND status = 'RUNNING' AND tokens_input IS NULL`,
    [id, 나, 값.input, 값.output, 값.cacheRead, 값.cacheWrite, 값.partial, 값.costUsd, 값.model],
  );
  return r.rowCount === 1;
}

export async function 사용량통로(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/authoring/requests/:id/usage',
    async (req, reply) => {
      const 행 = await 집은쪽인가(req, reply);
      if (행 === null) return reply;
      const 값 = 사용량읽기(req.body);
      if (값 === null) return reply.code(400).send({ error: 'BAD_USAGE' });
      if (!(await 사용량남기기(행.id, req.user?.username ?? '', 값))) {
        return reply.code(409).send({ error: 'USAGE_TAKEN' });
      }
      return { ok: true };
    },
  );
}
