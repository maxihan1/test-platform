// 안정화 지표 통로 — 메인 · 오류 상세 · 해결 처리 · Issue Bunker 등록 (도메인/안정화 §7)
// 배정과 권한은 문(auth/gate.ts)이 이미 봤다. 여기서는 번호 모양 · 애플리케이션 종류 · 오류가 그 애플리케이션 것인가만 본다

import type { FastifyInstance, FastifyReply } from 'fastify';

import { 정수 } from '../routeParams.js';
import { 오류상세, 오류읽기 } from './detail.js';
import { 등록줄넣기 } from './issue.js';
import { 안정화보기, 애플리케이션읽기 } from './view.js';

const 잘못 = (reply: FastifyReply, detail: string) => reply.code(400).send({ error: 'INVALID_REQUEST', detail });
const 없음 = (reply: FastifyReply) => reply.code(404).send({ error: 'NOT_FOUND' });

/** 빈 값은 「안 줌」, 틀린 값은 false */
const 고른번호 = (raw: unknown): number | null | false => (raw === undefined || raw === '' ? null : typeof raw === 'string' ? (정수(raw) ?? false) : false);

export default async function stabilityRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: Record<string, unknown> }>('/stability', async (req, reply) => {
    const serviceId = 고른번호(req.query.service);
    const run = 고른번호(req.query.run);
    const days = req.query.days === undefined ? '7' : req.query.days;
    if (serviceId === null || serviceId === false) return 잘못(reply, 'service 번호가 틀렸습니다');
    if (run === false) return 잘못(reply, 'run 번호가 틀렸습니다');
    if (days !== '7' && days !== '30') return 잘못(reply, 'days 는 7 · 30 중 하나입니다');
    const 앱 = await 애플리케이션읽기(serviceId);
    if (앱 === null) return 없음(reply);
    // API 애플리케이션은 세는 것이 없다(결정 13)
    if (앱.kind === 'API') return reply.code(400).send({ error: 'NOT_SUPPORTED' });
    const 답 = await 안정화보기(앱, run, days === '30' ? 30 : 7);
    return 답 === null ? 없음(reply) : 답;
  });

  app.get<{ Params: { id: string }; Querystring: Record<string, unknown> }>('/stability/errors/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    const run = 고른번호(req.query.run);
    if (id === null) return 잘못(reply, '오류 번호가 틀렸습니다');
    if (run === false) return 잘못(reply, 'run 번호가 틀렸습니다');
    const e = await 오류읽기(id);
    if (e === undefined) return 없음(reply);
    const 답 = await 오류상세(e, run);
    return 답 === null ? 없음(reply) : 답;
  });

  app.post<{ Params: { id: string } }>('/stability/errors/:id/resolve', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, '오류 번호가 틀렸습니다');
    const { pool } = await import('../db/index.js');
    // 이미 해결 처리(확인 전 · 확인 뒤 모두)면 다시 안 누른다. 재발하면 집계가 걷는다
    const r = await pool.query(
      'UPDATE stab_error SET resolved_at = now(), resolved_by = $2, confirmed_run_id = NULL WHERE id = $1 AND resolved_at IS NULL',
      [id, req.user?.username ?? '알 수 없음'],
    );
    if ((r.rowCount ?? 0) > 0) return reply.code(204).send();
    return (await 오류읽기(id)) === undefined ? 없음(reply) : reply.code(409).send({ error: 'ALREADY_RESOLVED' });
  });

  app.post<{ Params: { id: string } }>('/stability/errors/:id/issue', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, '오류 번호가 틀렸습니다');
    const 결과 = await 등록줄넣기(id);
    if (결과 === 'NOT_FOUND') return 없음(reply);
    return 결과 === 'PENDING' ? reply.code(202).send({ state: 'PENDING' }) : reply.code(409).send({ error: 결과 });
  });
}
