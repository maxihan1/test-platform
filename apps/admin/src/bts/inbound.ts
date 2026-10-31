// BTS 가 QA Hub 를 부르는 두 문 — 알림(HMAC 서명) · 규칙 웹훅 호출(고정 헤더 btr_) (도메인/BTS §7)
// 사람 로그인 밖이라 문(auth/gate.ts)이 사람 판정 앞에서 이 두 틀을 비켜 주고, 열쇠는 여기 라우트의 onRequest 가 본다

import { createHmac, timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { 토큰해시 } from '../auth/agentToken.js';
import { 사용자와해시 } from '../auth/store.js';
import { 노트사건쌓기 } from '../projectNote/events.js';
import { 정수 } from '../routeParams.js';

import { 이슈읽기, type BTS이슈, type 부르기함수 } from './client.js';
import { 닫기처리 } from './close.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export const BTS알림틀 = '/api/bts/events/:projectId';
export const BTS규칙틀 = '/api/bts/rules';

// 알림 몸은 이슈 키 하나만 쓴다(나머지는 다시 읽는다). 크게 받을 까닭이 없다
const 몸상한 = 64 * 1024;
const 서명꼴 = /^sha256=[0-9a-f]{64}$/;

/** 서명은 재직렬화하지 않은 몸 그대로에 건다(BTS WebhookSigner — `sha256=<hex>`). 길이가 같을 때만 시간 차 없이 견준다 */
export function 서명맞나(비밀: string, 몸: Buffer, 서명: string): boolean {
  const 기대 = Buffer.from(`sha256=${createHmac('sha256', 비밀).update(몸).digest('hex')}`);
  const 받은 = Buffer.from(서명);
  return 기대.length === 받은.length && timingSafeEqual(기대, 받은);
}

const 알림몸 = z.object({
  event: z.string(),
  deliveryId: z.string().min(1).max(100),
  data: z.object({ issueKey: z.string().min(1).max(100) }).passthrough(),
}).passthrough();

const 받는알림 = new Set(['issue.created', 'issue.transitioned']);

// ponytail: 같은 알림 기억은 admin 메모리 1,000개 — 재기동하면 잊는다. 받는 쪽(F3-04 · F5-01 …)이 DB 상태로 한 번만 하게 짠다(BTS-F3-02 시작 질문)
const 본알림 = new Set<string>();
const 기억상한 = 1000;

function 처음보나(열쇠: string): boolean {
  if (본알림.has(열쇠)) return false;
  본알림.add(열쇠);
  if (본알림.size > 기억상한) 본알림.delete(본알림.values().next().value as string);
  return true;
}

export interface 알림연결 {
  projectId: number;
  baseUrl: string;
  botKey: string;
  btsProject: string;
}

/**
 * 받은 알림을 처리한다 — 알림 본문을 믿지 않고 이슈를 BTS 에서 다시 읽는다. 처리할 것이 없으면 null.
 * 다시 읽기나 뒤 처리(닫기 사유 — close.ts)가 깨지면 그 알림을 잊고 던진다 — 라우트가 503 을 내 BTS 가 같은 알림을 다시 보내게.
 * 뒤 처리는 DB 상태로 한 번만 하므로 다시 와도 겹치지 않는다. 맡기(BTS-F5-01)는 뒤 줄이 여기에 잇는다
 */
export async function BTS알림처리(연결: 알림연결, 몸: unknown, 부르기?: 부르기함수): Promise<BTS이슈 | null> {
  const 꼴 = 알림몸.safeParse(몸);
  if (!꼴.success || !받는알림.has(꼴.data.event)) return null;
  // 다른 BTS 프로젝트 이슈는 이 프로젝트 일이 아니다
  if (!꼴.data.data.issueKey.startsWith(`${연결.btsProject}-`)) return null;
  const 열쇠 = `${String(연결.projectId)}:${꼴.data.deliveryId}`;
  if (!처음보나(열쇠)) return null;
  try {
    const 이슈 = await 이슈읽기({ baseUrl: 연결.baseUrl, botKey: 연결.botKey }, 꼴.data.data.issueKey, 부르기);
    const 닫음 = await 닫기처리(연결, 이슈, 부르기);
    // 닫기만 하고 요청을 못 세운 케이스 — 사람의 판정이 QA Hub 에 닿지 않은 까닭을 남긴다(outbox.ts 처럼 서버 기록으로)
    for (const 까닭 of 닫음.기록만) console.error(`[bts] ${이슈.key} 를 닫았지만 작성 요청을 못 세웠다: ${까닭}`);
    await 이슈노트사건(연결.projectId, 꼴.data.event, 이슈);
    return 이슈;
  } catch (err) {
    본알림.delete(열쇠);
    throw err;
  }
}

/**
 * 이슈 열림 · 「닫힘」으로 옮김을 노트 사건으로 쌓는다 (도메인/BTS 「맥락 — 프로젝트 노트」). 다른 상태로 옮긴 알림은 안 쌓는다.
 * 닫힘 상태를 짝짓지 않은 연결은 닫힘을 알 수 없어 안 쌓는다. 버그(BTS 종류 키 bug)면 ISSUE_CLOSE, 그 밖은 task 가 끝난 것이다.
 * 던지지 않는다 — 던지면 알림을 잊어 BTS 가 다시 보내고 닫기를 또 돈다. 노트 사건 하나를 잃는 쪽이 닫기를 다시 도는 쪽보다 낫다
 */
async function 이슈노트사건(projectId: number, 사건: string, 이슈: BTS이슈): Promise<void> {
  const 몸 = { issueKey: 이슈.key, type: 이슈.type, summary: 이슈.summary };
  let 종류: string = 사건;
  try {
    if (사건 === 'issue.created') {
      종류 = 'ISSUE_OPEN';
      await 노트사건쌓기(projectId, 'ISSUE_OPEN', 몸);
      return;
    }
    const 짝 = (await (await db()).query<{ closed: string | null }>("SELECT status_map->>'CLOSED' AS closed FROM bts_link WHERE project_id = $1", [projectId])).rows[0];
    if (짝?.closed === undefined || 짝.closed === null || 짝.closed === '' || 이슈.state !== 짝.closed) return;
    const 끝종류 = 이슈.type === 'bug' ? 'ISSUE_CLOSE' : 'TASK_DONE';
    종류 = 끝종류;
    await 노트사건쌓기(projectId, 끝종류, { ...몸, resolution: 이슈.resolution });
  } catch (err) {
    console.error(`[bts] 프로젝트 ${String(projectId)} ${이슈.key} ${종류} 노트 사건을 못 쌓았다: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// 담당자 · PR 제목은 없어도 받는다 — BTS 자동 설정(setup.ts)이 만드는 규칙 몸은 둘을 안 싣는다. 담당자 변경 사건에는 새 담당자가 없어 늘 비고,
// 템플릿이 따옴표를 그대로 끼워 PR 제목에 「"」가 들면 몸이 JSON 으로 깨진다. 담당자는 받는 쪽이 이슈를 다시 읽어 본다(BTS-F3-05)
const 규칙몸 = z.discriminatedUnion('event', [
  z.object({ event: z.literal('ASSIGNEE'), issueKey: z.string().min(1).max(100), assignee: z.string().max(200).default('') }),
  z.object({
    event: z.literal('PR_MERGED'),
    issueKey: z.string().min(1).max(100),
    prNumber: z.coerce.number().int().positive(),
    prUrl: z.string().url().max(500),
    prTitle: z.string().max(500).default(''),
  }),
]);

declare module 'fastify' {
  interface FastifyRequest {
    /** 규칙 웹훅 호출 토큰이 연 프로젝트 — 규칙 문이 싣는다 */
    btsRuleProject: { projectId: number; btsProject: string } | null;
  }
}

/** 몸을 읽기 전에 서명 헤더 꼴부터 본다 — 없거나 꼴이 틀리면 몸을 받지 않고 돌려보낸다 */
async function 서명문(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const 서명 = req.headers['x-bts-signature'];
  if (typeof 서명 !== 'string' || !서명꼴.test(서명)) await reply.code(401).send({ error: 'BAD_SIGNATURE' });
}

/** 토큰 해시로 그 프로젝트를 찾는다. 만든 admin 이 꺼졌으면 토큰도 못 쓴다(CI 토큰과 같다) */
async function 규칙문(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const 토큰 = req.headers['x-qahub-token'];
  if (typeof 토큰 === 'string' && 토큰.startsWith('btr_')) {
    const pool = await db();
    const 행 = (await pool.query<{ project_id: string; bts_project: string; rule_token_by: string }>(
      'SELECT project_id, bts_project, rule_token_by FROM bts_link WHERE rule_token_hash = $1',
      [토큰해시(토큰)],
    )).rows[0];
    const 사람 = 행 === undefined ? null : await 사용자와해시(행.rule_token_by);
    if (행 !== undefined && 사람?.user.role === 'admin') {
      req.btsRuleProject = { projectId: Number(행.project_id), btsProject: 행.bts_project };
      return;
    }
  }
  await reply.code(401).send({ error: 'UNAUTHENTICATED' });
}

function json읽기(몸: unknown): unknown {
  if (!Buffer.isBuffer(몸)) return undefined;
  try {
    return JSON.parse(몸.toString('utf8'));
  } catch {
    return undefined;
  }
}

export default async function btsInboundRoutes(app: FastifyInstance, opts: { 부르기?: 부르기함수 }): Promise<void> {
  app.decorateRequest('btsRuleProject', null);
  // 서명은 받은 바이트 그대로에 건다 — 이 플러그인 안에서만 몸을 버퍼로 받는다.
  // BTS 규칙의 웹훅 호출은 Content-Type 을 안 붙여 text/plain 으로 온다 — 어느 종류로 와도 같은 상한으로 받는다
  const 버퍼로 = (_req: FastifyRequest, 몸: Buffer, done: (err: Error | null, body?: Buffer) => void): void => done(null, 몸);
  // Fastify 가 이 둘은 따로 읽어 「*」까지 안 온다 — 둘을 직접 덮는다
  app.addContentTypeParser(['application/json', 'text/plain'], { parseAs: 'buffer', bodyLimit: 몸상한 }, 버퍼로);
  app.addContentTypeParser('*', { parseAs: 'buffer', bodyLimit: 몸상한 }, 버퍼로);

  app.post<{ Params: { projectId: string } }>('/bts/events/:projectId', { onRequest: 서명문 }, async (req, reply) => {
    const id = 정수(req.params.projectId);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    const 행 = (
      await (await db()).query<{ base_url: string; bot_key: string; bts_project: string; webhook_secret: string }>(
        'SELECT base_url, bot_key, bts_project, webhook_secret FROM bts_link WHERE project_id = $1',
        [id],
      )
    ).rows[0];
    // 연결이 없는 프로젝트도 서명이 틀린 것과 같은 답 — 어느 프로젝트가 BTS 에 이어졌는지 밖에 알리지 않는다
    if (행 === undefined || !Buffer.isBuffer(req.body) || !서명맞나(행.webhook_secret, req.body, String(req.headers['x-bts-signature']))) {
      return reply.code(401).send({ error: 'BAD_SIGNATURE' });
    }
    try {
      const 이슈 = await BTS알림처리(
        { projectId: id, baseUrl: 행.base_url, botKey: 행.bot_key, btsProject: 행.bts_project },
        json읽기(req.body),
        opts.부르기,
      );
      if (이슈 !== null) req.log.info(`[bts] 알림 ${이슈.key} — 상태 ${이슈.state} · 해결 ${이슈.resolution ?? '없음'}`);
    } catch (err) {
      // 다시 읽기나 닫기 사유 처리가 깨졌다 — 204 를 주면 BTS 가 다시 안 보내 알림을 영영 잃는다
      req.log.error(`[bts] 알림 처리가 깨졌다: ${err instanceof Error ? err.message : String(err)}`);
      return reply.code(503).send({ error: 'BTS_UNREACHABLE' });
    }
    return reply.code(204).send();
  });

  app.post('/bts/rules', { onRequest: 규칙문 }, async (req, reply) => {
    const 프로젝트 = req.btsRuleProject;
    if (프로젝트 === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    const 꼴 = 규칙몸.safeParse(json읽기(req.body));
    // 다른 BTS 프로젝트 이슈는 거절한다 — BTS 자동화 실행 기록에 실패로 보인다(도메인/BTS 「고장 모드」)
    if (!꼴.success || !꼴.data.issueKey.startsWith(`${프로젝트.btsProject}-`)) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 꼴.success ? 꼴.data.issueKey : 꼴.error.message });
    }
    // 담당자 변경 → 수정 AI(BTS-F6-01) 가 여기에 잇는다
    req.log.info(`[bts] 규칙 ${꼴.data.event} ${꼴.data.issueKey} (프로젝트 ${String(프로젝트.projectId)})`);
    // PR 병합은 노트 사건 — 바뀐 파일 경로는 노트 고치기 일이 PR 번호로 읽는다 (도메인/BTS 「맥락 — 프로젝트 노트」)
    if (꼴.data.event === 'PR_MERGED') {
      const { issueKey, prNumber, prUrl, prTitle } = 꼴.data;
      await 노트사건쌓기(프로젝트.projectId, 'PR_MERGED', { issueKey, prNumber, prUrl, prTitle });
    }
    return reply.code(204).send();
  });
}
