// API 문서 통로 — 판 목록 · 원문 · 파일 올리기 · 지금 받기 · 판 비교 · 커버리지 (도메인/API §7)
// 권한(보기 작성 read · 올리기 · 받기 작성 write)과 그 애플리케이션 배정은 문(auth/gate.ts)이 경로 :id 로 이미 봤다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { 칸이되나 } from '../auth/permissions.js';
import { 정수 } from '../routeParams.js';
import { 문서받기, 문서상한, 문서읽기, 판비교 } from './doc.js';
import { type 문서설정, 문서설정읽기, 커버리지, 판목록, 판올리기, 판원문 } from './store.js';

type 경로 = { Params: { id: string } };

// 애플리케이션 번호는 문(auth/scope.ts 번호로)과 같은 규칙인 정수()로 읽는다
const 번호 = (글: unknown): number | null => (typeof 글 === 'string' ? 정수(글) : null);

// 판 번호는 INTEGER 라 그 상한도 본다 — 넘으면 Postgres 범위 초과가 잡히지 않은 500 이 된다
const 판번호 = (글: unknown): number | null => {
  const n = 번호(글);
  return n !== null && n <= 2_147_483_647 ? n : null;
};

/** 경로의 애플리케이션이 API 종류인지 본다. 아니면 답을 보내고 null */
async function API서비스(req: FastifyRequest<경로>, reply: FastifyReply): Promise<{ id: number; 설정: 문서설정 } | null> {
  const id = 번호(req.params.id);
  if (id === null) {
    await reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    return null;
  }
  const 설정 = await 문서설정읽기(id);
  if (설정 === null) {
    await reply.code(404).send({ error: 'NOT_FOUND' });
    return null;
  }
  if (설정.kind !== 'API') {
    await reply.code(400).send({ error: 'NOT_API_SERVICE' });
    return null;
  }
  return { id, 설정 };
}

export default async function apiDocRoutes(app: FastifyInstance): Promise<void> {
  // 파일은 본문 그대로 받는다 — 자료 · 가이드 올리기와 같은 꼴이다. 상한을 넘으면 Fastify 가 413 을 낸다
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: 문서상한 }, (_req, body, done) => {
    done(null, body);
  });

  app.get<경로>('/services/:id/api-docs', async (req, reply) => {
    const 앱 = await API서비스(req, reply);
    if (앱 === null) return reply;
    return { docPath: 앱.설정.docPath, docEnv: 앱.설정.docEnv, versions: await 판목록(앱.id) };
  });

  app.get<{ Params: { id: string; version: string } }>('/services/:id/api-docs/:version', async (req, reply) => {
    const 앱 = await API서비스(req, reply);
    if (앱 === null) return reply;
    const version = 판번호(req.params.version);
    if (version === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.version });
    return (await 판원문(앱.id, version)) ?? reply.code(404).send({ error: 'NOT_FOUND' });
  });

  app.post<경로 & { Querystring: { name?: unknown } }>('/services/:id/api-docs', async (req, reply) => {
    const 앱 = await API서비스(req, reply);
    if (앱 === null) return reply;
    // 같은 키를 두 번 주면 배열로 온다
    const 이름 = typeof req.query.name === 'string' ? req.query.name.trim() : req.query.name === undefined ? '' : null;
    if (!Buffer.isBuffer(req.body) || 이름 === null || 이름.length > 255) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    const 읽은것 = 문서읽기(req.body.toString('utf8'));
    if ('reason' in 읽은것) return reply.code(400).send({ error: 'BAD_API_DOC', reason: 읽은것.reason });
    const 곳 = { source: 'FILE' as const, fileName: 이름 === '' ? null : 이름 };
    return reply.code(201).send(await 판올리기(앱.id, 읽은것.문서, 곳, req.user?.username ?? null));
  });

  app.post<경로>('/services/:id/api-docs/fetch', async (req, reply) => {
    const 앱 = await API서비스(req, reply);
    if (앱 === null) return reply;
    const { docPath, docEnv, baseUrl } = 앱.설정;
    if (docPath === null || docEnv === null || baseUrl === null) return reply.code(400).send({ error: 'NO_API_DOC_URL' });
    const 받은것 = await 문서받기(baseUrl.replace(/\/+$/, '') + docPath);
    if ('reason' in 받은것) return reply.code(502).send({ error: 'API_DOC_FETCH_FAILED', reason: 받은것.reason });
    const 읽은것 = 문서읽기(받은것.글);
    if ('reason' in 읽은것) return reply.code(400).send({ error: 'BAD_API_DOC', reason: 읽은것.reason });
    return reply.code(201).send(await 판올리기(앱.id, 읽은것.문서, { source: 'URL', env: docEnv }, req.user?.username ?? null));
  });

  app.get<경로 & { Querystring: { from?: string; to?: string } }>('/services/:id/api-docs/compare', async (req, reply) => {
    const 앱 = await API서비스(req, reply);
    if (앱 === null) return reply;
    const from = 판번호(req.query.from);
    const to = 판번호(req.query.to);
    if (from === null || to === null) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    const [전, 후] = await Promise.all([판원문(앱.id, from), 판원문(앱.id, to)]);
    if (전 === null || 후 === null) return reply.code(404).send({ error: 'NOT_FOUND' });
    return { changes: 판비교(전.doc, 후.doc) };
  });

  app.get<경로>('/services/:id/api-coverage', async (req, reply) => {
    const 앱 = await API서비스(req, reply);
    if (앱 === null) return reply;
    const 배정 = req.user?.services.find((s) => s.id === 앱.id);
    return 커버리지(앱.id, 배정 !== undefined && 칸이되나(배정.permissions.runs, 'read'));
  });
}
