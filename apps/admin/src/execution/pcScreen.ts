// 윈도우 PC 항목의 움직이는 화면 — VISION 화면 통로에 보기만으로 붙어 받은 H.264 조각을 HTTP 응답으로 흘려보낸다 (도메인/게임 §3.10 「증적 · 결과」 · 도메인/실행 §7 「…/pc-screen」)

import type { FastifyInstance, FastifyReply } from 'fastify';

import { 정수 } from '../routeParams.js';

import { 팜주소 } from './farm.js';
import { 읽는다 } from './trial.js';

export interface PC화면자리 {
  serial: string;
  /** PC 를 잡은 토큰. 없으면 DEVICE_FARM_TOKEN — 잡은 사람과 같은 이름으로 붙어야 VISION 이 남의 화면이라 막지 않는다 */
  토큰: string | undefined;
}

// PC 를 잡은 동안만 둔다 — 열쇠는 정식 실행 `item:<historyId>` · 테스트 실행 `trial:<trialId>`. 토큰이 있어 밖으로 안 낸다
const 자리들 = new Map<string, PC화면자리>();
// 열린 흐름의 끊개 — PC 를 놓으면 서버가 직접 끊는다. VISION 이 보기만 붙은 화면을 놓을 때 끊어 준다는 보장이 없고,
// 같은 토큰을 쓰는 설치(SSO 끔)에서는 다음 사람이 잡은 PC 화면이 그대로 이어 흐를 수 있다
const 흐름들 = new Map<string, Set<() => void>>();

export function PC화면을단다(열쇠: string, 자리: PC화면자리 | undefined): void {
  if (자리 !== undefined) {
    자리들.set(열쇠, 자리);
    return;
  }
  자리들.delete(열쇠);
  for (const 끊기 of [...(흐름들.get(열쇠) ?? [])]) 끊기();
  흐름들.delete(열쇠);
}

export const PC화면자리 = (열쇠: string): PC화면자리 | undefined => 자리들.get(열쇠);

/** 쓰는 것만 — 검사가 가짜를 끼운다 */
export interface 화면소켓 {
  binaryType: string;
  onopen: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  onclose: ((e: { code: number; reason: string }) => void) | null;
  onerror: (() => void) | null;
  send(글: string): void;
  close(): void;
}

export const 화면소켓을연다 = { 연다: (주소: string): 화면소켓 => new WebSocket(주소) as unknown as 화면소켓 };

export const 화면통로주소 = (팜: string, serial: string): string => `${팜.replace(/^http/, 'ws')}/api/devices/${encodeURIComponent(serial)}/screen`;

/** HTTP 흐름은 경계가 없어 조각마다 4바이트 길이(빅엔디언)를 앞에 붙인다 — 화면이 이 길이로 다시 가른다 */
export function 길이를붙인다(조각: Uint8Array): Buffer {
  const 머리 = Buffer.alloc(4);
  머리.writeUInt32BE(조각.byteLength);
  return Buffer.concat([머리, 조각]);
}

// 보는 브라우저가 느려 이만큼 밀리면 끊는다 — 다시 붙으면 VISION 이 키프레임부터 준다. 조각을 골라 버리면 다음 키프레임까지 화면이 깨진다
const 밀림상한 = 4 * 1024 * 1024;

/**
 * 끝나지 않는 응답을 연다. VISION 이 끊거나(놓음 · 인증 · 다른 사람이 잡음) 브라우저가 떠나거나 PC 를 놓으면 셋 다 닫는다.
 * 브라우저는 흐름이 끝나면 다시 붙는다 — 그래서 끊김을 따로 알리지 않고 기록만 남긴다.
 * PC 를 안 잡았거나 팜이 없으면 그 통로의 404(없음)다
 */
export function PC화면을건넨다(reply: FastifyReply, 열쇠: string, 없음: () => FastifyReply, 팜 = 팜주소()): FastifyReply {
  const 자리 = 자리들.get(열쇠);
  if (팜 === undefined || 자리 === undefined) return 없음();
  // 응답을 붙잡기 전에 연다 — 여기서 던지면(주소가 틀림) 붙잡은 응답이 영영 안 닫힌다
  let 소켓: 화면소켓;
  try {
    소켓 = 화면소켓을연다.연다(화면통로주소(팜, 자리.serial));
  } catch (err) {
    return reply.code(502).send({ error: 'VISION_UNREACHABLE', detail: `VISION 화면 통로를 열지 못했다: ${err instanceof Error ? err.message : String(err)}` });
  }
  reply.hijack();
  const 응답 = reply.raw;
  응답.writeHead(200, { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-accel-buffering': 'no' });
  소켓.binaryType = 'arraybuffer';
  let 닫힘 = false;
  const 닫는다 = (): void => {
    if (닫힘) return;
    닫힘 = true;
    흐름들.get(열쇠)?.delete(닫는다);
    소켓.close();
    응답.end();
  };
  흐름들.set(열쇠, (흐름들.get(열쇠) ?? new Set()).add(닫는다));
  // 보기만(peek) — 같은 사람이 VISION 사이트에서 연 화면을 끊지 않는다. 토큰은 첫 메시지로만 간다(주소에 넣으면 VISION 기록에 남는다)
  소켓.onopen = () => 소켓.send(JSON.stringify({ token: 자리.토큰 ?? process.env.DEVICE_FARM_TOKEN ?? '', peek: true }));
  소켓.onmessage = (e) => {
    // 글 메시지는 VISION 의 안내({ ready } · { end })다 — 화면은 영상만 쓴다
    if (닫힘 || !(e.data instanceof ArrayBuffer)) return;
    if (응답.writableLength > 밀림상한) return 닫는다();
    응답.write(길이를붙인다(new Uint8Array(e.data)));
  };
  소켓.onclose = (e) => {
    if (!닫힘 && e.code >= 4000) console.warn(`[pc-screen] VISION 이 ${자리.serial} 화면을 닫았다 (${String(e.code)}): ${e.reason}`);
    닫는다();
  };
  소켓.onerror = () => 닫는다();
  응답.on('close', 닫는다);
  return reply;
}

/** 권한은 같은 자리의 …/live 와 같다 — 정식 실행은 (실행, read), 테스트 실행은 시작한 사람만 (도메인/인증 §7 권한 표) */
export async function PC화면경로(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { runId: string; historyId: string } }>('/runs/:runId/items/:historyId/pc-screen', async (req, reply) => {
    const runId = 정수(req.params.runId);
    const historyId = 정수(req.params.historyId);
    if (runId === null || historyId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.url });
    const 없음 = () => reply.code(404).send({ error: 'LIVE_NOT_FOUND', detail: String(historyId) });
    const 열쇠 = `item:${String(historyId)}`;
    if (PC화면자리(열쇠) === undefined) return 없음();
    // 주소의 runId 로 문이 권한을 봤다 — 남의 실행 항목 화면이 새지 않게 그 실행의 항목인지 본다
    const { pool } = await import('../db/index.js');
    const r = await pool.query('SELECT 1 FROM run_item WHERE run_id = $1 AND history_id = $2', [runId, historyId]);
    if (r.rowCount === 0) return 없음();
    return PC화면을건넨다(reply, 열쇠, 없음);
  });

  app.get<{ Params: { tcId: string; trialId: string } }>('/cases/:tcId/test-run/:trialId/pc-screen', async (req, reply) => {
    const 없음 = () => reply.code(404).send({ error: 'TRIAL_NOT_FOUND', detail: req.params.trialId });
    const 읽음 = 읽는다(req.user?.username ?? '알 수 없음', req.params.trialId, req.params.tcId);
    if (읽음?.status !== 'RUNNING') return 없음();
    return PC화면을건넨다(reply, `trial:${req.params.trialId}`, 없음);
  });
}
