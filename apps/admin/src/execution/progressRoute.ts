// 도는 실행의 지금 — 러너가 알린 단계 · 보내고 아직 안 알린 항목 · E2E 지금 부품 (도메인/실행 §7 `GET /api/runs/:runId/progress`)
// routes.ts 가 300줄을 넘어 떼어 냈다

import type { Platform } from '@platform/kit';
import type { FastifyInstance } from 'fastify';

import { 정수 } from '../routeParams.js';

import { 실제한도 } from './caseLimit.js';
import { 실행남은시간 } from './eta.js';
import { 보낸항목들, 항목화면 } from './live.js';
import { 러너진행 } from './runner.js';

export async function 진행경로(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { runId: string } }>('/runs/:runId/progress', async (req, reply) => {
    const runId = 정수(req.params.runId);
    if (runId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.runId });

    // 러너의 목록은 **모든 서비스의 자식**을 담고 runId 칸이 없다. 그대로 흘리면 남의 실행의
    // 절차 제목이 이 화면에 뜬다 — 문(auth/scope.ts)은 「이 runId 를 볼 자격」만 보고 내용물은 안 본다.
    // 자기 DB 의 실행 단위 번호와 교집합만 낸다. 제한 시간도 같은 줄에 있어 한 질의로 끝난다 (SPEC §7)
    // 러너 /progress 를 한 번만 묻는다 — 케이스 단계와 E2E 지금 부품이 한 답에 같이 온다
    const { items: 돌고있는것들, scenarios: 시나리오들 } = await 러너진행();
    // E2E 정식 실행이면 지금 부품 번호 · 경과 — runId 는 이 실행 것만 고른다 (도메인/실행 §7 · §3.2 「E2E 도 지금 단계를 알리고 끊는다」)
    const 시나리오 = 시나리오들.find((s) => s.runId === runId);
    const step = 시나리오 === undefined ? {} : { step: { seq: 시나리오.seq, elapsedMs: 시나리오.elapsedMs } };
    // 러너에 보냈는데 러너가 아직 첫 단계를 안 알린 항목도 싣는다 — 브라우저를 여는 4~5초 · 폰을 잡는 동안 카드가 장면 칸 · VISION 링크 없이 서지 않게.
    // 이 실행에서 admin 이 보낸 것이라 남의 실행 걱정이 없다 (도메인/실행 §3.2 「진행 응답은 러너가 첫 단계를 알리기 전 항목도 싣는다」)
    const 보낸것들 = 보낸항목들(runId);
    const 지금 = Date.now();
    // 항목 경과 — 단계 경과는 단계마다 0초로 돌아가 옆의 항목 제한과 어긋나 보였다(점검표 B13). admin 이 다시 떠 잃은 항목은 싣지 않는다.
    // 화면 칸의 열쇠는 러너에 보낸 번호(실행 단위 번호)다
    const 화면칸 = (번호: number) => {
      const 화면 = 항목화면(번호);
      return {
        live: 화면?.열쇠 !== undefined,
        ...(화면?.vision !== undefined && { vision: { url: 화면.vision, ...(화면.폰이름 !== undefined && { name: 화면.폰이름 }) } }),
        ...(화면?.보냄 !== undefined && { itemElapsedMs: 지금 - 화면.보냄.보낸때 }),
      };
    };
    if (돌고있는것들.length === 0 && 보낸것들.length === 0) return { items: [], ...step, remainingMs: await 실행남은시간(runId) };

    // **러너가 답한 것 · admin 이 보낸 것만 물어본다.** run_id 로만 좁히면 5000건짜리 실행에서 보는 사람마다
    // 2초에 한 번 5000행을 읽는다 — 정작 쓰는 것은 동시 실행 수만큼(기본 2)뿐이다.
    // 러너의 번호는 실행 단위 번호다 — 그 실행 단위의 케이스 줄을 도는 차례대로 읽어 지금 도는 케이스 줄로 바꿔 싣는다 (도메인/실행 §3.2 「테스트 프로시저 실행」 「한도 · 폰」).
    // 프로시저의 케이스 줄 번호는 보낼 때 메모리에 둔 것을 쓴다 — run_item 에는 exec_id 색인이 없어 실행 단위 번호로 찾으면 그 실행의 줄을 다 읽는다.
    // 옛 꼴 케이스는 실행 단위 번호가 곧 케이스 줄 번호다. admin 이 다시 떠 잃은 프로시저는 싣지 않는다(재기동 복구가 그 실행을 닫는다)
    // 단계 제목은 실행에 박제하지 않고 지금 케이스 칸에서 읽는다 (공통/4-데이터모델 「단계 제목 칸」)
    const { pool } = await import('../db/index.js');
    const 줄들 = await pool.query<{ 번호: string; history_id: string; tc_id: string; platform: Platform; timeout_ms: number; step_titles: string[] | null }>(
      `SELECT COALESCE(ri.exec_id, ri.history_id) AS "번호", ri.history_id, ri.tc_id, ri.platform, ri.timeout_ms, tc.step_titles
         FROM run_item ri LEFT JOIN test_case tc ON tc.tc_id = ri.tc_id
        WHERE ri.run_id = $1 AND ri.history_id = ANY($2)
        ORDER BY ri.exec_seq NULLS FIRST, ri.history_id`,
      [runId, [...돌고있는것들.map((it) => it.historyId), ...보낸것들.map((칸) => 칸.번호)].flatMap((번호) => 항목화면(번호)?.보냄?.줄들 ?? [번호])],
    );
    const 내것 = new Map<number, typeof 줄들.rows>();
    for (const r of 줄들.rows) 내것.set(Number(r.번호), [...(내것.get(Number(r.번호)) ?? []), r]);
    /** 실행 단위 하나의 카드 — 지금 도는 케이스 줄 번호 · 그 케이스의 제한 시간 · 실행 단위 전체의 단계 제목. 러너가 케이스를 안 알렸으면 첫 케이스다 */
    const 단위칸 = (번호: number, tcId?: string) => {
      const 케이스들 = 내것.get(번호);
      if (케이스들 === undefined) return null;
      const 지금줄 = 케이스들.find((r) => r.tc_id === tcId) ?? 케이스들[0]!;
      // 한 프로시저의 케이스 단계 제목을 차례대로 이으면 러너의 단계 번호 차례다. 하나라도 못 셌으면 싣지 않는다 (카탈로그 §3.1 「케이스 구간」)
      const 제목 = 케이스들.every((r) => r.step_titles !== null) ? 케이스들.flatMap((r) => r.step_titles ?? []) : null;
      return { historyId: Number(지금줄.history_id), execId: 번호, timeoutMs: 실제한도(지금줄.platform, 지금줄.timeout_ms), ...화면칸(번호), ...(제목 !== null && { stepTitles: 제목 }) };
    };

    // 없는 runId 에도 200 빈 목록이다. 형제 라우트(findRun·findItem)는 404 를 내지만
    // 여기서 404 를 내려면 실행을 한 번 더 조회해야 하고, 화면은 도는 중일 때만 부른다 (SPEC §8.9)
    const 러너가답한것 = 돌고있는것들.flatMap((돌고있는것) => {
      // 화면 카드 — 장면 열쇠가 메모리에 있나 · 잡은 폰의 VISION 링크 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」)
      const 칸 = 단위칸(돌고있는것.historyId, 돌고있는것.tcId);
      return 칸 === null ? [] : [{ ...돌고있는것, ...칸 }];
    });
    const 답한번호 = new Set(러너가답한것.map((it) => it.execId));
    const 아직 = 보낸것들.filter((칸) => !답한번호.has(칸.번호)).flatMap((칸) => 단위칸(칸.번호) ?? []);
    return {
      items: [...러너가답한것, ...아직],
      ...step,
      remainingMs: await 실행남은시간(runId),
    };
  });
}
