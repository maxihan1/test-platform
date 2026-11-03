// 테스트 모드 장면 한 장을 서버 러너에서 받아 시작한 사람에게 건넨다 — 케이스 테스트 실행 · E2E 시험 실행이 같이 쓴다 (도메인/실행 §3.2 「테스트 모드」 · §7)

import type { FastifyReply } from 'fastify';

import { runnerUrl, 러너머리 } from './runnerAddr.js';

// 화면이 0.25초마다 다시 묻는다. 오래 매달려 봐야 다음 물음이 덮는다 — 잠든 러너에 물음이 쌓이지 않게 짧게 끊는다
const 제한ms = 1_000;

/**
 * 시험이 도는 중이라고 라우트가 이미 봤다. 러너가 열쇠를 모르면(404) 자리를 기다리거나 폰에서 도는 중이라 「아직 장면 없음」(204)이다.
 * 러너에 못 닿으면 502 RUNNER_UNREACHABLE 이다 — 204 로 가리면 러너 고장이 화면에서 「기다리는 중」으로 보이고,
 * 던지면 0.25초마다 500 오류 기록이 쌓인다. 러너가 다른 상태로 답하면 던진다
 */
export async function 장면을건넨다(reply: FastifyReply, 열쇠: string): Promise<FastifyReply> {
  let res: Response;
  try {
    res = await fetch(`${runnerUrl()}/live/${encodeURIComponent(열쇠)}`, { headers: 러너머리(), signal: AbortSignal.timeout(제한ms) });
  } catch (err) {
    return reply.code(502).send({ error: 'RUNNER_UNREACHABLE', detail: `러너에 닿지 못했다: ${err instanceof Error ? err.message : String(err)}` });
  }
  if (res.status === 204 || res.status === 404) {
    await res.arrayBuffer();
    return reply.code(204).send();
  }
  if (!res.ok) throw new Error(`러너가 장면을 ${res.status}로 거절했다: ${await res.text()}`);
  return reply.header('cache-control', 'no-store').type('image/jpeg').send(Buffer.from(await res.arrayBuffer()));
}
