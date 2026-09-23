// 작성 자료 통로 — 기획서 파일 올리기 · 줄에 세우기 · 내려받기 (SPEC 도메인/작성 §7 「자료」)
// routes.ts 가 300줄을 넘어 뗐다. app.ts 가 routes.ts 와 같은 /api 접두사로 등록한다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { 자료더하기, 자료목록, 자료지우기, 자료한건, 제출 } from './assetStore.js';
import { 번호, 사진뿌리 } from './routes.js';
import { 한건, type 요청 } from './store.js';

// 한 파일 상한. 값의 정본은 도메인/작성 §7 「자료」 표다
const 파일상한 = 20 * 1024 * 1024;

// 받는 종류. 맥이 doc·docx 는 textutil 로 글자만 뽑고 나머지는 그대로 읽는다 — 그 밖은 읽을 길이 없다
const 받는확장자 = new Set(['.pdf', '.docx', '.doc', '.md', '.txt']);

/** 자료가 쌓이는 자리. 사진 폴더(authoring/<번호>)와 가른다 — 같이 두면 사진 장수 상한이 자료까지 센다 */
export function 자료폴더(요청: number): string {
  return join(사진뿌리(), 'authoring-assets', String(요청));
}

/**
 * 사람이 준 파일 이름을 받을 수 있나.
 *
 * **디스크 이름으로는 안 쓴다** (디스크는 자료 번호). 그래도 막는 것은 이 이름이 내려받기의
 * `content-disposition` 과 화면에 다시 나가기 때문이다 — 따옴표·제어 문자는 머리글을 깨고,
 * `/`·`\`·`..` 는 받는 쪽이 경로로 읽을 수 있다. 한글은 된다.
 */
function 이름인가(이름: string): boolean {
  if (이름 === '' || 이름.includes('..')) return false;
  return !/["/\\\u0000-\u001f\u007f]/.test(이름);
}

/** 디스크 이름. 사람이 준 이름이 아니라 자료 번호로 짓는다 — 이름으로 지으면 `../` 로 폴더 밖에 쓸 수 있다 */
function 디스크이름(자료번호: number, 이름: string): string {
  return `${String(자료번호)}${extname(이름).toLowerCase()}`;
}

/** RFC 5987 의 퍼센트 인코딩. encodeURIComponent 가 남기는 ' ( ) * 까지 싼다 */
function 머리글이름(이름: string): string {
  return encodeURIComponent(이름).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** 요청한 사람의 DRAFT 행인가. 아니면 응답을 보내고 null */
async function 내준비행(req: FastifyRequest, reply: FastifyReply): Promise<요청 | null> {
  const id = 번호((req.params as { id?: string }).id);
  if (id === null) {
    await reply.code(400).send({ error: 'BAD_ID' });
    return null;
  }
  const 행 = await 한건(id);
  if (행 === null) {
    await reply.code(404).send({ error: 'NOT_FOUND' });
    return null;
  }
  // 서비스 경계는 문이 봤다(라우트표 「작성요청」 갈래). 여기서는 같은 서비스의 남을 막는다 —
  // 남의 DRAFT 에 파일을 끼워 넣으면 그 사람이 모르는 기획서로 케이스가 만들어진다
  if (행.requestedBy !== req.user?.username) {
    await reply.code(403).send({ error: 'NOT_REQUESTER' });
    return null;
  }
  if (행.status !== 'DRAFT') {
    await reply.code(409).send({ error: 'NOT_DRAFT', detail: 행.status });
    return null;
  }
  return 행;
}

export default async function authoringAssetRoutes(app: FastifyInstance): Promise<void> {
  // routes.ts 의 사진 파서(4MB)와 따로 건다. 플러그인마다 자기 파서를 가지므로 서로 상한을 안 넘본다
  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer', bodyLimit: 파일상한 },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.post<{ Querystring: { name?: string }; Params: { id: string } }>(
    '/authoring/requests/:id/assets',
    async (req, reply) => {
      const 행 = await 내준비행(req, reply);
      if (행 === null) return reply;

      const 이름 = req.query.name ?? '';
      if (!이름인가(이름)) return reply.code(400).send({ error: 'BAD_NAME' });
      const 확장자 = extname(이름).toLowerCase();
      if (!받는확장자.has(확장자)) {
        return reply.code(400).send({ error: 'BAD_FILE_TYPE', detail: 확장자 });
      }
      const 몸 = req.body;
      if (!Buffer.isBuffer(몸) || 몸.length === 0) {
        return reply.code(400).send({ error: 'EMPTY_BODY' });
      }

      const 붙은것 = await 자료더하기(행.id, { name: 이름, size: 몸.length });
      if (붙은것 === 'NOT_DRAFT') return reply.code(409).send({ error: 'NOT_DRAFT' });
      if (붙은것 === 'TOO_MANY') return reply.code(409).send({ error: 'TOO_MANY_ASSETS' });

      // 행 → 파일 순서다. 파일 쓰기가 실패하면 행을 지운다 — 행만 남으면 내려받기가 없는 파일을 찾는다
      const 폴더 = 자료폴더(행.id);
      try {
        await mkdir(폴더, { recursive: true });
        await writeFile(join(폴더, 디스크이름(붙은것.id, 이름)), 몸);
      } catch (err) {
        await 자료지우기(붙은것.id);
        throw err;
      }
      return { id: 붙은것.id };
    },
  );

  // 다 올린 뒤 한 번 부른다. 그 전까지 DRAFT 라 맥이 안 집는다 — 올리는 도중에 집히면 빈 것을 보고 실패한다
  app.post<{ Params: { id: string } }>('/authoring/requests/:id/submit', async (req, reply) => {
    const 행 = await 내준비행(req, reply);
    if (행 === null) return reply;
    if (!(await 제출(행.id))) {
      // 제출은 한 문장이라 둘 중 무엇에 걸렸는지 말해 주지 않는다. 사람에게 줄 이유만 다시 읽어 가른다
      const 없음 = (await 자료목록(행.id)).length === 0;
      return reply.code(409).send({ error: 없음 ? 'NO_ASSETS' : 'NOT_DRAFT' });
    }
    return { ok: true };
  });

  // 화면도 맥도 부른다. 맥은 다른 기계라 파일 자체를 받아 가야 한다 (SPEC §7)
  app.get<{ Params: { id: string; assetId: string } }>(
    '/authoring/requests/:id/assets/:assetId',
    async (req, reply) => {
      const id = 번호(req.params.id);
      const 자료번호 = 번호(req.params.assetId);
      if (id === null || 자료번호 === null) return reply.code(400).send({ error: 'BAD_ID' });
      const 자료 = await 자료한건(id, 자료번호);
      // 피그마 자료는 파일이 없다. 주소는 상세 응답에 이미 있다
      if (자료 === null || 자료.kind !== 'FILE') return reply.code(404).send({ error: 'NOT_FOUND' });

      const 몸 = await readFile(join(자료폴더(id), 디스크이름(자료.id, 자료.name)));
      // ★ 브라우저가 열지 못하게 준다. 확장자로 text/html 을 짐작하게 두면
      // 올린 파일이 admin 과 같은 출처에서 열려 로그인 세션으로 스크립트가 돈다
      return reply
        .header('content-type', 'application/octet-stream')
        .header('content-disposition', `attachment; filename*=UTF-8''${머리글이름(자료.name)}`)
        .header('x-content-type-options', 'nosniff')
        .send(몸);
    },
  );
}
