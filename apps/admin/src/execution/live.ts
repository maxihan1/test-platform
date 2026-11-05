// 장면 한 장을 서버 러너에서 받아 건넨다 — 케이스 테스트 실행 · E2E 시험 실행 · 정식 실행 항목이 같이 쓴다 (도메인/실행 §3.2 「테스트 모드」 · 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」 · §7)

import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyReply } from 'fastify';

import { 정수 } from '../routeParams.js';

import { runnerUrl, 러너머리 } from './runnerAddr.js';

// 화면은 앞 물음이 끝나야 다음을 묻는다. 잠든 러너에 오래 매달리지 않되, 폰 PNG(수 MB)가 느린 길(터널)로 와도 다 받을 만큼 둔다
const 제한ms = 5_000;

/**
 * 시험이 도는 중이라고 라우트가 이미 봤다. 러너가 열쇠를 모르면(404) 자리를 기다리는 중이라 「아직 장면 없음」(204)이다.
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
  // 앱 · 게임 폰 장면은 PNG 다 — 러너가 붙인 형식을 따르고 그 밖은 JPEG 로 본다
  const 형식 = res.headers.get('content-type') === 'image/png' ? 'image/png' : 'image/jpeg';
  return reply.header('cache-control', 'no-store').type(형식).send(Buffer.from(await res.arrayBuffer()));
}

/**
 * 도는 정식 실행 항목의 화면 — 장면 열쇠(브라우저를 여는 항목만)와 잡은 폰의 VISION 링크. admin 메모리에만 두고 항목이 끝나면 지운다.
 * admin 이 다시 떠서 잃으면 progress 가 live: false 를 내 화면이 죽은 통로를 묻지 않는다. 열쇠는 밖에 안 나간다 — 화면은 historyId 로만 묻는다
 */
const 항목화면들 = new Map<number, { 열쇠?: string; vision?: string }>();

/** 러너에 보내기 전에 연다. 장면을 찍는 항목이면 새 열쇠를 돌려준다 */
export function 항목화면을연다(historyId: number, 장면: boolean): string | undefined {
  const 열쇠 = 장면 ? randomUUID() : undefined;
  항목화면들.set(historyId, 열쇠 === undefined ? {} : { 열쇠 });
  return 열쇠;
}

/** 폰을 잡으면 링크를 달고 놓으면 뗀다 — 놓은 폰의 링크는 닫혀 있다 */
export function 항목폰화면(historyId: number, url: string | undefined): void {
  const 화면 = 항목화면들.get(historyId);
  if (화면 !== undefined) 화면.vision = url;
}

export function 항목화면을닫는다(historyId: number): void {
  항목화면들.delete(historyId);
}

export function 항목화면(historyId: number): { 열쇠?: string; vision?: string } | undefined {
  return 항목화면들.get(historyId);
}

/**
 * GET /api/runs/:runId/items/:historyId/live — 도는 정식 실행 항목의 마지막 장면 한 장. 권한은 (실행, read) 라 그 실행을 볼 수 있는 사람이 다 본다.
 * historyId 가 그 runId 의 항목인지 DB 로 본다 — 주소의 runId 로 문이 권한을 봤으니 남의 실행 항목 장면이 새지 않게 (도메인/실행 §7)
 */
export async function 항목장면경로(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { runId: string; historyId: string } }>('/runs/:runId/items/:historyId/live', async (req, reply) => {
    const runId = 정수(req.params.runId);
    const historyId = 정수(req.params.historyId);
    if (runId === null || historyId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.url });
    const 없음 = () => reply.code(404).send({ error: 'LIVE_NOT_FOUND', detail: String(historyId) });
    const 열쇠 = 항목화면(historyId)?.열쇠;
    if (열쇠 === undefined) return 없음();
    const { pool } = await import('../db/index.js');
    const r = await pool.query('SELECT 1 FROM run_item WHERE run_id = $1 AND history_id = $2', [runId, historyId]);
    if (r.rowCount === 0) return 없음();
    return 장면을건넨다(reply, 열쇠);
  });
}
