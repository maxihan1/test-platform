// Scout 화면 통로 — 대화 열기 · 질문 넣기 · 이어 받기(SSE) · 중단 · 대화 초기화 (도메인/챗봇 §7)

import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { 사용자 } from '../auth/store.js';
import { 정수 } from '../routeParams.js';
import {
  BTS주소,
  글최대,
  끝난상태,
  대화읽기,
  대화지우기,
  대화키새로,
  대화키해시,
  멈춘질문닫기,
  바뀜듣기,
  오래된대화지우기,
  이어읽기,
  질문넣기,
  질문중단,
  질문프로젝트,
} from './store.js';

// 브라우저 · 프록시가 말없는 연결을 끊지 않게 이만큼마다 빈 줄(주석)을 보낸다. 멈춘 질문 닫기도 이 간격으로 본다
const 깨움ms = 15_000;

/** 그 출입증의 대화 키 해시. 칸이 없는 옛 출입증은 여기서 한 번 굽는다 — 그때 출입증 수명이 다시 선다 (§3.14 「대화 수명」) */
function 대화키(req: FastifyRequest): string {
  let 키 = req.session.get('chatKey');
  if (키 === undefined) {
    키 = 대화키새로();
    req.session.set('chatKey', 키);
  }
  return 대화키해시(키);
}

// 기능 칸은 안 본다 — 답에 쓰는 도구가 질문한 사람의 칸으로 따로 본다 (결정 1 · 인증 §7 「등급으로 갈리는 자리」)
const 배정됐나 = (user: 사용자 | null, projectId: number): boolean => user?.services.some((s) => s.projectId === projectId) ?? false;

const 번호 = (v: unknown): number | null => (typeof v === 'string' ? 정수(v) : null);

export default async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { projectId?: unknown } }>('/chat', async (req, reply) => {
    const projectId = 번호(req.query.projectId);
    if (projectId === null) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    if (!배정됐나(req.user, projectId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    await 오래된대화지우기();
    await 멈춘질문닫기();
    const [questions, btsUrl] = await Promise.all([대화읽기(대화키(req), projectId), BTS주소(projectId)]);
    return { questions, btsUrl };
  });

  app.post<{ Body: { projectId?: unknown; text?: unknown } | undefined }>('/chat/questions', async (req, reply) => {
    const projectId = typeof req.body?.projectId === 'number' && Number.isSafeInteger(req.body.projectId) && req.body.projectId > 0 ? req.body.projectId : null;
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    // 글자 수는 DB 의 char_length 와 같은 셈(코드 포인트)으로 센다
    // NUL 글자는 Postgres TEXT 가 받지 않는다 — 넣다가 500 이 나지 않게 400 으로 돌려보낸다
    if (projectId === null || text === '' || [...text].length > 글최대 || text.includes('\u0000')) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    if (!배정됐나(req.user, projectId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    const 넣음 = await 질문넣기(대화키(req), projectId, req.user!.username, req.session.get('authSid') ?? null, text);
    if (넣음 === 'BUSY') return reply.code(409).send({ error: 'BUSY' });
    return reply.code(201).send(넣음);
  });

  app.get<{ Params: { id: string }; Querystring: { after?: unknown } }>('/chat/questions/:id/stream', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    // 여기서는 대화 키를 굽지 않는다 — hijack 한 답에는 출입증 쿠키가 안 붙는다. 키가 없으면 그 출입증의 질문일 수도 없다
    const 키 = req.session.get('chatKey');
    const projectId = 키 === undefined ? null : await 질문프로젝트(대화키해시(키), id);
    if (projectId === null) return reply.code(404).send({ error: 'NOT_FOUND' });
    if (!배정됐나(req.user, projectId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    // 다시 붙은 브라우저는 Last-Event-ID 를, 처음 여는 화면은 GET /api/chat 의 lastSeq 를 ?after 로 준다
    const 머리 = req.headers['last-event-id'];
    let after = 번호(Array.isArray(머리) ? 머리[0] : 머리) ?? 번호(req.query.after) ?? 0;

    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      // 앞단 프록시(nginx · Caddy)가 모아 두지 않고 바로 흘리게
      'x-accel-buffering': 'no',
    });
    const 끊김 = new AbortController();
    // 응답 쪽 close 는 연결이 끊길 때 난다. 위 DB 를 기다리는 사이에 이미 끊겼으면 이벤트가 지나갔으니 직접 본다
    raw.on('close', () => 끊김.abort());
    if (raw.destroyed || req.raw.socket.destroyed) 끊김.abort();
    const 귀 = 바뀜듣기(id, 끊김.signal);
    let 보낸대기: number | null = null;
    try {
      while (!끊김.signal.aborted) {
        const 지금 = await 이어읽기(id, after);
        // 대화 초기화 · 로그아웃으로 지워졌다 — 화면에는 중단으로 끝난다
        if (지금 === null) {
          raw.write(`event: end\ndata: ${JSON.stringify({ status: 'STOPPED' })}\n\n`);
          break;
        }
        for (const { seq, kind, body } of 지금.조각들) {
          raw.write(`event: chunk\nid: ${String(seq)}\ndata: ${JSON.stringify({ kind, body })}\n\n`);
          after = seq;
        }
        if (지금.status === 'QUEUED' && 지금.ahead !== 보낸대기) {
          raw.write(`event: wait\ndata: ${JSON.stringify({ ahead: 지금.ahead })}\n\n`);
          보낸대기 = 지금.ahead;
        }
        if (끝난상태.has(지금.status)) {
          raw.write(`event: end\ndata: ${JSON.stringify({ status: 지금.status })}\n\n`);
          break;
        }
        // 신호 없이 15초가 지났을 때만 멈춘 질문을 닫아 본다 — 신호마다 표 전체를 고치지 않는다
        if ((await 귀.기다리기(깨움ms)) === '시계') {
          raw.write(': ping\n\n');
          await 멈춘질문닫기();
        }
      }
    } catch (err) {
      // 머리를 이미 보냈다 — 오류 몸을 못 실으니 로그를 남기고 닫는다. 브라우저는 다시 붙어 Last-Event-ID 부터 이어 받는다
      req.log.error({ err }, '[chat] 이어 받기를 못 했다');
    } finally {
      귀.그만();
      raw.end();
    }
    return reply;
  });

  app.post<{ Params: { id: string } }>('/chat/questions/:id/stop', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    const projectId = await 질문프로젝트(대화키(req), id);
    if (projectId === null) return reply.code(404).send({ error: 'NOT_FOUND' });
    if (!배정됐나(req.user, projectId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    if (!(await 질문중단(id))) return reply.code(409).send({ error: 'NOT_RUNNING' });
    return reply.code(204).send();
  });

  app.delete<{ Querystring: { projectId?: unknown } }>('/chat', async (req, reply) => {
    const projectId = 번호(req.query.projectId);
    if (projectId === null) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    if (!배정됐나(req.user, projectId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    await 대화지우기(대화키(req), projectId);
    return reply.code(204).send();
  });
}
