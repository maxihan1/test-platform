// 도는 실행의 지금 — 러너가 알린 단계 · 보내고 아직 안 알린 항목 · E2E 지금 부품 (도메인/실행 §7 `GET /api/runs/:runId/progress`)
// routes.ts 가 300줄을 넘어 떼어 냈다

import type { FastifyInstance } from 'fastify';

import { 정수 } from '../routeParams.js';

import { 실행남은시간 } from './eta.js';
import { 보낸항목들, 항목화면 } from './live.js';
import { 러너진행 } from './runner.js';

export async function 진행경로(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { runId: string } }>('/runs/:runId/progress', async (req, reply) => {
    const runId = 정수(req.params.runId);
    if (runId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.runId });

    // 러너의 목록은 **모든 서비스의 자식**을 담고 runId 칸이 없다. 그대로 흘리면 남의 실행의
    // 절차 제목이 이 화면에 뜬다 — 문(auth/scope.ts)은 「이 runId 를 볼 자격」만 보고 내용물은 안 본다.
    // 자기 DB 의 historyId 와 교집합만 낸다. 제한 시간도 같은 줄에 있어 한 질의로 끝난다 (SPEC §7)
    // 러너 /progress 를 한 번만 묻는다 — 케이스 단계와 E2E 지금 부품이 한 답에 같이 온다
    const { items: 돌고있는것들, scenarios: 시나리오들 } = await 러너진행();
    // E2E 정식 실행이면 지금 부품 번호 · 경과 — runId 는 이 실행 것만 고른다 (도메인/실행 §7 · §3.2 「E2E 도 지금 단계를 알리고 끊는다」)
    const 시나리오 = 시나리오들.find((s) => s.runId === runId);
    const step = 시나리오 === undefined ? {} : { step: { seq: 시나리오.seq, elapsedMs: 시나리오.elapsedMs } };
    // 러너에 보냈는데 러너가 아직 첫 단계를 안 알린 항목도 싣는다 — 브라우저를 여는 4~5초 · 폰을 잡는 동안 카드가 장면 칸 · VISION 링크 없이 서지 않게.
    // 이 실행에서 admin 이 보낸 것이라 남의 실행 걱정이 없다 (도메인/실행 §3.2 「진행 응답은 러너가 첫 단계를 알리기 전 항목도 싣는다」)
    const 보낸것들 = 보낸항목들(runId);
    const 지금 = Date.now();
    // 항목 경과 — 단계 경과는 단계마다 0초로 돌아가 옆의 항목 제한과 어긋나 보였다(점검표 B13). admin 이 다시 떠 잃은 항목은 싣지 않는다
    const 화면칸 = (historyId: number) => {
      const 화면 = 항목화면(historyId);
      return {
        live: 화면?.열쇠 !== undefined,
        ...(화면?.vision !== undefined && { vision: { url: 화면.vision } }),
        ...(화면?.보냄 !== undefined && { itemElapsedMs: 지금 - 화면.보냄.보낸때 }),
      };
    };
    if (돌고있는것들.length === 0 && 보낸것들.length === 0) return { items: [], ...step, remainingMs: await 실행남은시간(runId) };

    // **러너가 답한 것만 물어본다.** run_id 로만 좁히면 5000건짜리 실행에서 보는 사람마다
    // 2초에 한 번 5000행을 읽는다 — 정작 쓰는 것은 동시 실행 수만큼(기본 2)뿐이다
    const { pool } = await import('../db/index.js');
    const 제한 =
      돌고있는것들.length === 0
        ? { rows: [] }
        : await pool.query<{ history_id: string; timeout_ms: number }>(
            'SELECT history_id, timeout_ms FROM run_item WHERE run_id = $1 AND history_id = ANY($2)',
            [runId, 돌고있는것들.map((it) => it.historyId)],
          );
    const 내것 = new Map(제한.rows.map((r) => [Number(r.history_id), r.timeout_ms]));

    // 없는 runId 에도 200 빈 목록이다. 형제 라우트(findRun·findItem)는 404 를 내지만
    // 여기서 404 를 내려면 실행을 한 번 더 조회해야 하고, 화면은 도는 중일 때만 부른다 (SPEC §8.9)
    const 러너가답한것 = 돌고있는것들.flatMap((돌고있는것) => {
      const timeoutMs = 내것.get(돌고있는것.historyId);
      if (timeoutMs === undefined) return [];
      // 화면 카드 — 장면 열쇠가 메모리에 있나 · 잡은 폰의 VISION 링크 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」)
      return [{ ...돌고있는것, timeoutMs, ...화면칸(돌고있는것.historyId) }];
    });
    const 답한번호 = new Set(러너가답한것.map((it) => it.historyId));
    const 아직 = 보낸것들
      .filter((칸) => !답한번호.has(칸.번호))
      .map((칸) => ({ historyId: 칸.번호, timeoutMs: 칸.보냄.timeoutMs, ...화면칸(칸.번호) }));
    return {
      items: [...러너가답한것, ...아직],
      ...step,
      remainingMs: await 실행남은시간(runId),
    };
  });
}
