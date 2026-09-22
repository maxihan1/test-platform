// 작성 컨텍스트의 HTTP 라우트 (SPEC 도메인/작성 §7)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { findService } from '../catalog/store.js';
import {
  끝내기,
  단계올리기,
  사진자리,
  사진자리적기,
  줄세우기,
  집기,
  한건,
  한쪽,
  type 요청,
  type 상태,
} from './store.js';

// 사진이 내려앉는 뿌리. 러너 스크린샷과 같은 볼륨을 쓰되 폴더를 갈라 섞이지 않게 한다
const 사진뿌리 = process.env.SCREENSHOT_ROOT ?? '/screenshots';

// 한 장 상한. 스크린샷 한 장이 이보다 크면 화면 캡처가 아니라 뭔가 잘못 온 것이다
const 사진상한 = 20 * 1024 * 1024;

/**
 * 경로에 실린 번호는 **열 자리 숫자 글자만** 받는다.
 *
 * **문과 라우트가 같은 값을 읽어야 한다.** `1e3` 이나 퍼센트 인코딩을 느슨하게 읽으면
 * 문이 본 번호와 라우트가 쓰는 번호가 갈리고 그 틈으로 빠져나간다 (auth/scope.ts 의 `번호로` 와 같은 규칙).
 */
function 번호(값: unknown): number | null {
  if (typeof 값 !== 'string' || !/^\d{1,10}$/.test(값)) return null;
  const n = Number(값);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// **배정은 여기서 안 본다. 문(auth/gate.ts)이 이미 막았다.**
// 여기서 보는 것은 그 접두사의 서비스가 실재하고 살아 있는가 하나뿐이다 (catalog/routes.ts 와 같은 규칙)
async function 서비스번호(req: FastifyRequest, reply: FastifyReply): Promise<number | null> {
  const prefix = (req.query as { service?: string }).service ?? '';
  if (prefix === '') {
    await reply.code(400).send({ error: 'SERVICE_REQUIRED' });
    return null;
  }
  const 서비스 = await findService(prefix);
  if (서비스 === null) {
    await reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: prefix });
    return null;
  }
  return 서비스.id;
}

/**
 * 본문에 실린 번호가 가리키는 행을 이 서비스 것으로 확인한다.
 *
 * **경로 검사가 안 닿는 자리다.** 문은 주소와 `?service=` 만 보고 본문은 안 읽는다.
 * 안 막으면 남의 서비스 요청을 가리키는 재실행·머지가 줄에 서고, 그 행에는
 * `spec_text` 가 기획서 본문 통째로 실려 있다 (SPEC §7).
 */
async function 원본확인(
  원본: unknown,
  서비스: number,
  reply: FastifyReply,
): Promise<요청 | null> {
  const id = typeof 원본 === 'number' && Number.isSafeInteger(원본) && 원본 > 0 ? 원본 : null;
  if (id === null) {
    await reply.code(400).send({ error: 'SOURCE_ID_REQUIRED' });
    return null;
  }
  const 행 = await 한건(id);
  if (행 === null) {
    await reply.code(404).send({ error: 'NOT_FOUND' });
    return null;
  }
  if (행.serviceId !== 서비스) {
    await reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: String(id) });
    return null;
  }
  return 행;
}

/**
 * 이 행을 집은 사람이 지금 부르는 사람인가.
 *
 * **집은 쪽을 안 보면 실행 등급 누구나 남의 작업에 임의의 PR 주소를 실을 수 있다.**
 * 뒤에 운영 등급이 머지를 누르면 그 사람이 고른 PR 이 병합된다 — 사람 게이트는
 * 「이 요청을 머지할까」만 묻고 「이 주소가 그 요청이 만든 것 맞나」는 아무도 안 본다
 * (2026-09-22 검토가 잡았다).
 */
async function 집은쪽인가(
  req: FastifyRequest,
  서비스: number,
  reply: FastifyReply,
): Promise<요청 | null> {
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
  if (행.serviceId !== 서비스) {
    await reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: String(id) });
    return null;
  }
  if (행.claimedBy !== req.user?.username) {
    await reply.code(403).send({ error: 'NOT_CLAIMER' });
    return null;
  }
  return 행;
}

export default async function authoringRoutes(app: FastifyInstance): Promise<void> {
  // 사진은 파일이라 JSON 파서가 못 받는다. **새 부품을 넣지 않고** Fastify 가 이미 가진
  // 본문 파서 등록으로 원시 바이트를 그대로 받는다 — 한 번에 한 장이라 여러 장을 가르는 부품이 필요 없다.
  // 글자로 바꿔 보내면(base64) 사진이 커질수록 메모리에 통째로 올라간다 (SPEC §7)
  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer', bodyLimit: 사진상한 },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.post<{ Querystring: { service?: string }; Body: Record<string, unknown> }>(
    '/authoring/requests',
    async (req, reply) => {
      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const kind = req.body?.kind;
      // **이 통로로는 머지가 절대 안 들어온다.** 경로를 가른 것만으로는 안 닫힌다 —
      // 문은 주소를 보고 통과시키는데 라우트가 본문을 그대로 받으면 실행 등급이
      // 머지 행을 세우고 맥이 집어 저장소를 영구히 바꾼다 (SPEC §7)
      if (kind !== 'AUTHOR' && kind !== 'RERUN') {
        return reply.code(400).send({ error: 'KIND_NOT_ALLOWED', detail: String(kind) });
      }

      const 기획서 = req.body?.specText;
      if (typeof 기획서 !== 'string' || 기획서 === '') {
        return reply.code(400).send({ error: 'SPEC_TEXT_REQUIRED' });
      }

      let 원본: number | null = null;
      if (kind === 'RERUN') {
        const 행 = await 원본확인(req.body?.sourceId, 서비스, reply);
        if (행 === null) return reply;
        원본 = 행.id;
      }

      const params = req.body?.params;
      const id = await 줄세우기({
        서비스,
        kind,
        원본,
        기획서,
        값: typeof params === 'object' && params !== null ? (params as Record<string, unknown>) : {},
        // 부른 사람은 요청에 안 싣는다. 로그인한 세션에서 채운다 — 실행이 triggeredBy 를 그렇게 한다
        누가: req.user?.username ?? '',
        이름: req.user?.displayName ?? '',
      });
      return reply.code(201).send({ id });
    },
  );

  app.get<{ Querystring: { service?: string; status?: string; page?: string } }>(
    '/authoring/requests',
    async (req, reply) => {
      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const 값 = req.query.status;
      const 상태들: 상태[] = ['PENDING', 'RUNNING', 'DONE', 'FAILED'];
      const 상태 = 상태들.find((s) => s === 값);
      if (값 !== undefined && 상태 === undefined) {
        return reply.code(400).send({ error: 'BAD_STATUS', detail: 값 });
      }

      return 한쪽({ 서비스, 상태, 쪽: Math.max(1, Number(req.query.page ?? 1) || 1) });
    },
  );

  app.get<{ Querystring: { service?: string }; Params: { id: string } }>(
    '/authoring/requests/:id',
    async (req, reply) => {
      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const id = 번호(req.params.id);
      if (id === null) return reply.code(400).send({ error: 'BAD_ID' });

      const 행 = await 한건(id);
      // 없는 번호는 404 다. 「없는 것」과 「남의 것」이 뭉개지면 안 된다 (SPEC §7)
      if (행 === null) return reply.code(404).send({ error: 'NOT_FOUND' });
      if (행.serviceId !== 서비스) {
        return reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: String(id) });
      }
      return 행;
    },
  );

  // 머지만 경로가 갈린다. 같은 경로에 kind 로 얹으면 등급이 **본문 값**에 따라 갈려야 하고
  // 그러려면 문이 본문을 읽어야 한다. 경로가 다르면 경로만 보고 가른다 (SPEC §7)
  app.post<{ Querystring: { service?: string }; Body: { sourceId?: unknown } }>(
    '/authoring/merges',
    async (req, reply) => {
      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const 행 = await 원본확인(req.body?.sourceId, 서비스, reply);
      if (행 === null) return reply;

      // 아직 안 끝났거나 실패한 요청은 머지할 것이 없다. PR 주소가 비어 있다
      if (행.status !== 'DONE' || 행.prUrl === null) {
        return reply.code(409).send({ error: 'NOT_MERGEABLE', detail: 행.status });
      }

      const id = await 줄세우기({
        서비스,
        kind: 'MERGE',
        원본: 행.id,
        기획서: 행.specText,
        누가: req.user?.username ?? '',
        이름: req.user?.displayName ?? '',
      });
      return reply.code(201).send({ id });
    },
  );

  app.post<{ Querystring: { service?: string } }>(
    '/authoring/requests/claim',
    async (req, reply) => {
      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const 집은것 = await 집기(서비스, req.user?.username ?? '');
      // 줄이 비었으면 204 다. 맥이 폴링하므로 「없음」이 오류가 아니다
      if (집은것 === null) return reply.code(204).send();
      return 집은것;
    },
  );

  app.patch<{ Querystring: { service?: string }; Params: { id: string }; Body: { stage?: unknown } }>(
    '/authoring/requests/:id/stage',
    async (req, reply) => {
      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const 행 = await 집은쪽인가(req, 서비스, reply);
      if (행 === null) return reply;

      const 단계 = req.body?.stage;
      if (typeof 단계 !== 'string' || 단계 === '') {
        return reply.code(400).send({ error: 'STAGE_REQUIRED' });
      }
      // 상태 전이 표 밖이면 409 다. 끝난 행의 단계를 올리면 화면이 끝난 것을 도는 중으로 그린다
      if (!(await 단계올리기(행.id, 단계))) {
        return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
      }
      return { ok: true };
    },
  );

  app.post<{ Querystring: { service?: string; name?: string }; Params: { id: string } }>(
    '/authoring/requests/:id/screenshots',
    async (req, reply) => {
      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const 행 = await 집은쪽인가(req, 서비스, reply);
      if (행 === null) return reply;
      if (행.status !== 'RUNNING') {
        return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
      }

      const 이름 = req.query.name ?? '';
      // 파일 이름이 폴더를 거슬러 올라가면 뿌리 밖에 쓴다. 모양을 좁혀 그 틈을 없앤다
      if (!/^[A-Za-z0-9._-]{1,80}\.png$/.test(이름)) {
        return reply.code(400).send({ error: 'BAD_NAME', detail: 이름 });
      }
      const 몸 = req.body;
      if (!Buffer.isBuffer(몸) || 몸.length === 0) {
        return reply.code(400).send({ error: 'EMPTY_BODY' });
      }

      const 자리 = 사진자리(행.id);
      const 폴더 = join(사진뿌리, 자리);
      await mkdir(폴더, { recursive: true });
      await writeFile(join(폴더, 이름), 몸);
      await 사진자리적기(행.id, 자리);
      return { dir: 자리 };
    },
  );

  app.post<{
    Querystring: { service?: string };
    Params: { id: string };
    Body: Record<string, unknown>;
  }>('/authoring/requests/:id/finish', async (req, reply) => {
    const 서비스 = await 서비스번호(req, reply);
    if (서비스 === null) return reply;

    const 행 = await 집은쪽인가(req, 서비스, reply);
    if (행 === null) return reply;

    const status = req.body?.status;
    if (status !== 'DONE' && status !== 'FAILED') {
      return reply.code(400).send({ error: 'BAD_STATUS', detail: String(status) });
    }

    const prUrl = req.body?.prUrl;
    const error = req.body?.error;
    // 끝난 행에 또 오면 409 다. 안 막으면 판정과 PR 주소가 덮어써진다
    const 바뀌었나 = await 끝내기(행.id, {
      status,
      result: req.body?.result,
      testSource: req.body?.testSource,
      prUrl: typeof prUrl === 'string' ? prUrl : undefined,
      error: typeof error === 'string' ? error : undefined,
    });
    if (!바뀌었나) return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
    return { ok: true };
  });
}
