// 서비스 가이드 HTTP 라우트 — 지금 판 · 변경 기록 · 글 저장 · 파일 더하기 · 빼기 · 내려받기 · 열기 (도메인/작성 §7 「서비스 가이드 통로」)
// 배정과 권한(보기 작성 read · 고치기 작성 write)은 문(auth/gate.ts)이 ?service= 로 이미 봤다. 여기서는 그 서비스 것만 읽고 쓴다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { extname, join } from 'node:path';

import { 볼륨파일읽기 } from '../artifactFile.js';
import { 내려받기, 디스크이름, 머리글이름, 받는확장자, 이름인가, 파일상한 } from '../authoring/assets.js';
import { 번호, 사진뿌리, 서비스번호 } from '../authoring/routes.js';
import { 누가, 판번호 } from '../prd/routes.js';
import { 구획인가, 글검사, 글자판번호 } from './rules.js';
import { 글저장, 기록, 지금가이드, 파일더하기, 파일빼기, 파일한건, 판가이드 } from './store.js';
import { PDF인가, 글자뽑기 } from './text.js';

type 질의 = { Querystring: Record<string, unknown> };
type 파일경로 = 질의 & { Params: { fileId: string } };

/** 디스크 자리. 사람이 준 이름이 아니라 파일 번호로 짓는다 — 자료와 같은 까닭(authoring/assets.ts `디스크이름`) */
export const 가이드파일자리 = (서비스: number, 파일: { id: number; name: string }) =>
  join(사진뿌리(), 'service-guide', String(서비스), 디스크이름(파일.id, 파일.name));

/** 디스크의 첨부. 행은 있는데 파일이 없으면(볼륨을 옮기다 빠뜨렸다) null — 라우트가 404 로 보낸다 */
export async function 가이드파일읽기(서비스: number, 파일: { id: number; name: string }): Promise<Buffer | null> {
  // 러너도 이 볼륨에 쓴다 — 바로가기는 없는 파일로 친다 (리뷰 M4)
  return 볼륨파일읽기(가이드파일자리(서비스, 파일)).catch((e: NodeJS.ErrnoException) => {
    if (e.code === 'ENOENT') return null;
    throw e;
  });
}

const 틀린칸 = (reply: FastifyReply, detail: string) => reply.code(400).send({ error: 'BAD_GUIDE', detail });

function 보내기(reply: FastifyReply, 결과: { error: string } | object, 성공코드 = 200) {
  if (!('error' in 결과)) return reply.code(성공코드).send(결과);
  return reply.code(결과.error === 'NOT_FOUND' ? 404 : 409).send(결과);
}

export default async function guideRoutes(app: FastifyInstance): Promise<void> {
  // 자료 올리기와 같은 파서 · 상한. 플러그인마다 자기 파서를 가져 서로 상한을 안 넘본다
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: 파일상한 }, (_req, body, done) => {
    done(null, body);
  });

  app.get<질의>('/guide', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    return 지금가이드(서비스);
  });

  app.get<질의>('/guide/versions', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    return 기록(서비스);
  });

  app.get<질의 & { Params: { version: string } }>('/guide/versions/:version', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const version = 글자판번호(req.params.version, 1);
    if (version === null) return 틀린칸(reply, 'version');
    return (await 판가이드(서비스, version)) ?? reply.code(404).send({ error: 'NOT_FOUND' });
  });

  app.put<질의 & { Body: Record<string, unknown> | null }>('/guide', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const baseVersion = 판번호(req.body?.baseVersion);
    if (baseVersion === null) return 틀린칸(reply, 'baseVersion');
    const 글 = 글검사(req.body);
    if ('error' in 글) return reply.code(400).send(글);
    return 보내기(reply, await 글저장(서비스, baseVersion, 글, 누가(req)));
  });

  app.post<질의>('/guide/files', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const { section, name: 이름 } = req.query;
    if (!구획인가(section)) return 틀린칸(reply, 'section');
    const baseVersion = 글자판번호(req.query.baseVersion);
    if (baseVersion === null) return 틀린칸(reply, 'baseVersion');
    // ?name= 이 두 번 오면 배열로 온다
    if (typeof 이름 !== 'string' || !이름인가(이름)) return reply.code(400).send({ error: 'BAD_NAME' });
    const 확장자 = extname(이름).toLowerCase();
    if (!받는확장자.has(확장자)) return reply.code(400).send({ error: 'BAD_FILE_TYPE', detail: 확장자 });
    const 몸 = req.body;
    if (!Buffer.isBuffer(몸) || 몸.length === 0) return reply.code(400).send({ error: 'EMPTY_BODY' });
    const 결과 = await 파일더하기(서비스, baseVersion, section, { name: 이름, 몸 }, (id) => 가이드파일자리(서비스, { id, name: 이름 }), 누가(req));
    return 보내기(reply, 결과, 201);
  });

  app.delete<파일경로>('/guide/files/:fileId', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;
    const 파일 = 번호(req.params.fileId);
    if (파일 === null) return reply.code(404).send({ error: 'NOT_FOUND' });
    const baseVersion = 글자판번호(req.query.baseVersion);
    if (baseVersion === null) return 틀린칸(reply, 'baseVersion');
    return 보내기(reply, await 파일빼기(서비스, baseVersion, 파일, 누가(req)));
  });

  /** 그 서비스가 올린 파일과 바이트. 아니면 404 를 보내고 null */
  async function 파일읽기(req: FastifyRequest<파일경로>, reply: FastifyReply) {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return null;
    const 번 = 번호(req.params.fileId);
    const 파일 = 번 === null ? null : await 파일한건(서비스, 번);
    if (파일 === null) {
      await reply.code(404).send({ error: 'NOT_FOUND' });
      return null;
    }
    const 몸 = await 가이드파일읽기(서비스, 파일);
    if (몸 === null) {
      await reply.code(404).send({ error: 'NOT_FOUND' });
      return null;
    }
    return { 파일, 몸 };
  }

  app.get<파일경로>('/guide/files/:fileId', async (req, reply) => {
    const 읽음 = await 파일읽기(req, reply);
    return 읽음 === null ? reply : 내려받기(reply, 읽음.파일.name, 읽음.몸);
  });

  // 화면이 글로 그린다 — HTML 로 넣지 않는다. 브라우저가 파일을 열지 않게 하는 내려받기와 같은 까닭 (§3.6 「열기」)
  app.get<파일경로>('/guide/files/:fileId/text', async (req, reply) => {
    const 읽음 = await 파일읽기(req, reply);
    if (읽음 === null) return reply;
    const text = await 글자뽑기(읽음.파일.name, 읽음.몸);
    return text === null ? reply.code(415).send({ error: 'NO_TEXT' }) : { text };
  });

  // PDF 하나만 브라우저가 연다. sandbox 라 PDF 안 스크립트가 플랫폼 주소의 권한으로 돌지 않는다 (§3.6 「열기」)
  app.get<파일경로>('/guide/files/:fileId/pdf', async (req, reply) => {
    const 읽음 = await 파일읽기(req, reply);
    if (읽음 === null) return reply;
    if (!PDF인가(읽음.몸)) return reply.code(415).send({ error: 'NOT_PDF' });
    return reply
      .header('content-type', 'application/pdf')
      .header('content-disposition', `inline; filename*=UTF-8''${머리글이름(읽음.파일.name)}`)
      .header('x-content-type-options', 'nosniff')
      .header('content-security-policy', 'sandbox')
      .send(읽음.몸);
  });
}
