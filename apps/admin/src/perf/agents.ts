// 성능 에이전트 목록 · 추가(토큰 발급) · 고치기 · 지우기 — 목록은 실행 read, 나머지는 admin (도메인/성능 §7 「에이전트」)

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 칸이되나 } from '../auth/permissions.js';
import { 정수 } from '../routeParams.js';
import { 성능토큰만들기 } from './agentToken.js';
import * as 표 from './store.js';

const 추가 = z.object({ name: z.string().trim().min(1).max(40), mode: z.enum(['LOAD', 'MONITOR']), projectId: z.number().int().positive().optional() })
  .refine((b) => (b.mode === 'MONITOR') === (b.projectId !== undefined), '모니터링은 프로젝트가 있어야 하고 부하 발생은 없어야 합니다');
const 고침 = z.object({ name: z.string().trim().min(1).max(40).optional(), maxVus: z.number().int().positive().max(100_000).optional() });

// 다른 기계에서 띄우는 한 줄. 이미지는 저장소 apps/perf-agent 폴더 하나로 만든다 (공통/6 §9 「기본 부하 발생 에이전트」)
export function 설치명령(주소: string, 토큰: string, mode: 'LOAD' | 'MONITOR'): string {
  const 망 = mode === 'MONITOR' ? ' --network host' : '';
  return `docker build -t qahub-perf-agent apps/perf-agent && docker run -d --name qahub-perf-agent --restart unless-stopped --init${망} -e QAHUB_URL=${주소} -e AGENT_TOKEN=${토큰} qahub-perf-agent`;
}

// 앞단(Caddy) 뒤에서는 요청이 http 로 들어와 설치 명령이 http 주소가 된다 — 에이전트가 https 로 넘어가며 토큰이 떨어져 401 이라 공개 주소를 먼저 쓴다
export function 설치주소(공개주소: string | undefined, protocol: string, host: string | undefined): string {
  const 바탕 = (공개주소 ?? '').replace(/\/+$/, '');
  if (바탕 !== '') return 바탕;
  // Host 는 요청이 보낸 글자다 — 관리자가 복사해 돌릴 셸 명령에 그대로 넣지 않는다
  const 호스트 = host !== undefined && /^[A-Za-z0-9.:[\]-]+$/.test(host) ? host : 'localhost';
  return `${protocol}://${호스트}`;
}

const 이름겹침 = (e: unknown) => typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';

export default async function perfAgentAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { projectId?: string } }>('/perf/agents', async (req, reply) => {
    const projectId = req.query.projectId === undefined ? null : 정수(req.query.projectId);
    if (req.query.projectId !== undefined && projectId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'projectId' });
    const user = req.user;
    // 모니터링 에이전트는 그 프로젝트 권한이 있을 때만 싣는다 — 남의 서버 지표를 받아 가지 못하게 (§3.9 「서버 모니터링」)
    const 볼프로젝트 = new Set((user?.services ?? []).filter((s) => 칸이되나(s.permissions.runs, 'read')).map((s) => s.projectId));
    const 지금 = Date.now();
    const agents = (await 표.에이전트들()).filter((a) =>
      a.mode === 'LOAD' || (a.projectId !== null && (projectId === null || a.projectId === projectId) && (user?.role === 'admin' || 볼프로젝트.has(a.projectId))));
    return {
      agents: agents.map((a) => ({
        id: a.id, name: a.name, mode: a.mode, projectId: a.projectId, host: a.host, version: a.version,
        status: !표.연결됐나(a, 지금) ? 'OFFLINE' : a.busyRunId !== null ? 'BUSY' : 'CONNECTED',
        maxVus: a.mode === 'LOAD' ? 표.최대가상사용자(a) : null, lastSeenAt: a.lastSeenAt,
      })),
    };
  });

  app.post('/perf/agents', async (req, reply) => {
    const p = 추가.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.error.message });
    const { 토큰, 해시 } = 성능토큰만들기();
    try {
      const r = await (await 표.풀()).query<{ id: string }>(
        'INSERT INTO perf_agent (name, mode, project_id, token_hash, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [p.data.name, p.data.mode, p.data.projectId ?? null, 해시, req.user?.username ?? ''],
      );
      const 주소 = 설치주소(process.env.PLATFORM_PUBLIC_URL, req.protocol, req.headers.host);
      return reply.code(201).send({ id: Number(r.rows[0]?.id), token: 토큰, installCommand: 설치명령(주소, 토큰, p.data.mode) });
    } catch (e) {
      if (이름겹침(e)) return reply.code(409).send({ error: 'NAME_TAKEN' });
      // 없는 프로젝트 번호
      if (typeof e === 'object' && e !== null && (e as { code?: string }).code === '23503') return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'projectId' });
      throw e;
    }
  });

  app.patch<{ Params: { id: string } }>('/perf/agents/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    const p = 고침.safeParse(req.body);
    if (id === null || !p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.success ? req.params.id : p.error.message });
    try {
      const r = await (await 표.풀()).query<{ mode: string }>(
        `UPDATE perf_agent SET name = COALESCE($2, name), max_vus = CASE WHEN mode = 'LOAD' THEN COALESCE($3, max_vus) END WHERE id = $1 RETURNING mode`,
        [id, p.data.name ?? null, p.data.maxVus ?? null],
      );
      if (r.rows[0] === undefined) return reply.code(404).send({ error: 'NOT_FOUND' });
      return {};
    } catch (e) {
      if (이름겹침(e)) return reply.code(409).send({ error: 'NAME_TAKEN' });
      throw e;
    }
  });

  app.delete<{ Params: { id: string } }>('/perf/agents/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    // 행과 함께 해시가 사라져 그 토큰은 다음 부르기부터 401 이다
    const r = await (await 표.풀()).query('DELETE FROM perf_agent WHERE id = $1', [id]);
    if (r.rowCount === 0) return reply.code(404).send({ error: 'NOT_FOUND' });
    return reply.code(204).send();
  });
}
