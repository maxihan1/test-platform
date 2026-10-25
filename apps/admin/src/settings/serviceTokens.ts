// 애플리케이션 CI 토큰 cit_ — 발급 · 목록 · 끊기와 쓸 때 주인 확인 (도메인/실행 §3.11 「빌드마다 돌리기」 · 도메인/인증 §7 「인증 적용 범위」)
// 바깥에서 실행을 거는 유일한 문이라 이 토큰으로는 빌드 올리기(POST /api/builds) 하나만 열린다 — 문(auth/gate.ts)이 가른다

import { randomBytes } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { 토큰해시 } from '../auth/agentToken.js';
import { 사용자와해시 } from '../auth/store.js';

const 모양 = /^cit_[A-Za-z0-9_-]{43}$/;

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 헤더가 CI 토큰을 내밀었나 — 모양만 본다. 다른 통로에서 이것이 오면 문이 403 으로 막는다 */
export function CI토큰인가(authorization: string | undefined): boolean {
  return authorization !== undefined && authorization.startsWith('Bearer cit_');
}

export function CI헤더토큰(authorization: string | undefined): string | null {
  const [방식, 값, ...남음] = (authorization ?? '').split(' ');
  return 방식 === 'Bearer' && 값 !== undefined && 남음.length === 0 && 모양.test(값) ? 값 : null;
}

export interface CI토큰주인정보 {
  serviceId: number;
  kind: 'SCREEN' | 'APP' | 'GAME' | 'API';
  username: string;
  displayName: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    ciToken: CI토큰주인정보 | null;
  }
}

/**
 * 토큰의 애플리케이션과 발급한 사람. 계정 없는 토큰 · 공용 토큰을 만들지 않으려고 발급한 계정에 묶는다 —
 * 그 계정이 꺼졌거나 지워졌거나 admin 이 아니게 됐으면 토큰도 못 쓴다. 꺼진 애플리케이션도 못 쓴다
 */
export async function CI토큰주인(토큰: string): Promise<CI토큰주인정보 | null> {
  const pool = await db();
  const r = await pool.query<{ id: string; service_id: string; kind: CI토큰주인정보['kind']; created_by: string }>(
    `SELECT t.id, t.service_id, s.kind, t.created_by
       FROM service_token t JOIN service s ON s.id = t.service_id AND s.is_active
      WHERE t.token_hash = $1`,
    [토큰해시(토큰)],
  );
  const 행 = r.rows[0];
  if (행 === undefined) return null;
  const 사람 = await 사용자와해시(행.created_by);
  if (사람 === null || 사람.user.role !== 'admin') return null;
  await pool.query('UPDATE service_token SET last_used_at = now() WHERE id = $1', [행.id]);
  return { serviceId: Number(행.service_id), kind: 행.kind, username: 행.created_by, displayName: 사람.user.displayName };
}

// 사람 판정 밖의 두 틀 — 빌드 올리기는 CI 토큰만, APK 내려받기는 서명만 본다(라우트가 본다). 문(auth/gate.ts)이 이 둘을 사람 판정 앞에서 가른다
export const 빌드올리기틀 = '/api/builds';
export const 빌드내려받기틀 = '/api/builds/:buildId/apk';

/** 빌드 올리기의 문. 토큰이 없거나 틀리거나 주인이 더는 못 쓰면 401 — 세션으로 넘어가지 않는다 */
export async function CI토큰문(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const 토큰 = CI헤더토큰(req.headers.authorization);
  const 주인 = 토큰 === null ? null : await CI토큰주인(토큰);
  if (주인 === null) {
    await reply.code(401).send({ error: 'UNAUTHENTICATED' });
    return;
  }
  req.ciToken = 주인;
}

const 이름 = z.object({ name: z.string().trim().min(1).max(100) }).strict();
const 번호 = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export default async function serviceTokenRoutes(app: FastifyInstance): Promise<void> {
  // 원문은 이 응답이 유일하다 — DB 에는 해시만 둔다 (성능 에이전트 토큰과 같다)
  app.post<{ Params: { id: string } }>('/settings/services/:id/tokens', async (req, reply) => {
    const id = 번호.safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    const 본문 = 이름.safeParse(req.body);
    if (!본문.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 본문.error.message });
    const 토큰 = `cit_${randomBytes(32).toString('base64url')}`;
    const pool = await db();
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service_token (service_id, name, token_hash, created_by)
       SELECT id, $2, $3, $4 FROM service WHERE id = $1 RETURNING id`,
      [id.data, 본문.data.name, 토큰해시(토큰), req.user?.username ?? ''],
    );
    const 행 = r.rows[0];
    if (행 === undefined) return reply.code(404).send({ error: 'SERVICE_NOT_FOUND' });
    return reply.code(201).send({ tokenId: Number(행.id), token: 토큰 });
  });

  app.get<{ Params: { id: string } }>('/settings/services/:id/tokens', async (req, reply) => {
    const id = 번호.safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    const pool = await db();
    // 만든 사람은 지금 이름으로 보인다. 계정이 지워졌으면 아이디 그대로 — 그 토큰은 이미 못 쓴다
    const r = await pool.query<{ id: string; name: string; created_by: string; created_at: Date; last_used_at: Date | null }>(
      `SELECT t.id, t.name, COALESCE(u.display_name, t.created_by) AS created_by, t.created_at, t.last_used_at
         FROM service_token t LEFT JOIN app_user u ON u.username = t.created_by
        WHERE t.service_id = $1 ORDER BY t.id`,
      [id.data],
    );
    // 화면이 CI 예시에 넣을 주소. 브라우저를 연 주소(localhost)는 CI 가 닿지 않는다 — 비었으면 화면이 그것으로 물러선다 (GAME-F2-17)
    const 공개주소 = (process.env.PLATFORM_PUBLIC_URL ?? '').replace(/\/+$/, '');
    return {
      tokens: r.rows.map((t) => ({
        tokenId: Number(t.id),
        name: t.name,
        createdBy: t.created_by,
        createdAt: t.created_at.toISOString(),
        lastUsedAt: t.last_used_at?.toISOString() ?? null,
      })),
      publicUrl: 공개주소 === '' ? null : 공개주소,
    };
  });

  app.delete<{ Params: { id: string; tokenId: string } }>('/settings/services/:id/tokens/:tokenId', async (req, reply) => {
    const id = 번호.safeParse(req.params.id);
    const tokenId = 번호.safeParse(req.params.tokenId);
    if (!id.success || !tokenId.success) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    const pool = await db();
    const r = await pool.query('DELETE FROM service_token WHERE id = $1 AND service_id = $2', [tokenId.data, id.data]);
    if (r.rowCount === 0) return reply.code(404).send({ error: 'TOKEN_NOT_FOUND' });
    return reply.code(204).send();
  });
}
