// 작성 컨텍스트의 HTTP 라우트 (SPEC 도메인/작성 §7)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { resolve } from 'node:path';

import { findService } from '../catalog/store.js';
import { 자료상한, 자료목록, 준비세우기 } from './assetStore.js';
import { 줄세우기, 한건, 한쪽, type 요청, type 상태 } from './store.js';

/**
 * 사진이 내려앉는 뿌리.
 *
 * **러너 스크린샷·증적 문서와 같은 자리를 쓴다** (`PLATFORM_ARTIFACTS_DIR`). 폴더만 가른다.
 * **새 설정값을 만들지 않는다** — 배포에서 **볼륨으로 묶인 자리는 여기 하나뿐**이고
 * (`docker-compose.yml` 의 `artifacts:/artifacts`), 다른 자리를 쓰면 컨테이너 안 임시 공간에 떨어져
 * **서버를 다시 띄우는 순간 사진이 통째로 사라진다.** 게다가 다음 PR 의 화면은 이 자리에서 찾으므로
 * **처음부터 한 장도 못 띄운다** (2026-09-22 검토가 잡았다).
 *
 * **쓸 때 읽는다** — 맨 위에서 잡으면 검사가 값을 바꿔도 이미 굳은 뒤다.
 */
export function 사진뿌리(): string {
  return process.env.PLATFORM_ARTIFACTS_DIR ?? resolve(process.cwd(), 'artifacts');
}

/**
 * 경로에 실린 번호는 **열 자리 숫자 글자만** 받는다.
 *
 * **문과 라우트가 같은 값을 읽어야 한다.** `1e3` 이나 퍼센트 인코딩을 느슨하게 읽으면
 * 문이 본 번호와 라우트가 쓰는 번호가 갈리고 그 틈으로 빠져나간다 (auth/scope.ts 의 `번호로` 와 같은 규칙).
 */
export function 번호(값: unknown): number | null {
  if (typeof 값 !== 'string' || !/^\d{1,10}$/.test(값)) return null;
  const n = Number(값);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * 피그마 주소를 **다시 조립해** 돌려준다. 모양이 아니면 null.
 *
 * **통과·거절로 보지 않는다** (2026-09-23 검토가 잡았다). 「Copy link」 주소에는 거의 항상 `&t=…` 가
 * 붙는데, 그 글자를 받으면 맥이 이 주소를 명령줄에 끼울 때 `&` 가 명령 구분자로 산다. 막으면 평범한 링크가 튕긴다.
 * 파일 키와 `node-id` 만 뽑아 새로 지으면 저장값에 셸 특수 글자가 원천적으로 없다.
 * FigJam(`/board`)은 화면 디자인이 아니라 안 받는다 (도메인/작성 §7 「자료」).
 */
export function 피그마주소정규화(주소: unknown): string | null {
  if (typeof 주소 !== 'string') return null;
  let url: URL;
  try {
    url = new URL(주소);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.hostname !== 'figma.com' && url.hostname !== 'www.figma.com') return null;
  const [, 종류, 본키, 갈래, 갈래키] = url.pathname.split('/');
  if (종류 !== 'design' && 종류 !== 'file' && 종류 !== 'proto') return null;
  // 브랜치 링크는 본 파일 키로 줄이면 main 을 읽는다. 브랜치 키가 그 자체로 파일처럼 열린다.
  // 뒤에 키가 없으면 `branch` 는 브랜치가 아니라 파일 제목 조각이다
  const 키 = 갈래 === 'branch' && 갈래키 !== undefined ? 갈래키 : 본키;
  if (키 === undefined || !/^[A-Za-z0-9]{1,64}$/.test(키)) return null;
  const 노드 = url.searchParams.get('node-id');
  if (노드 === null) return `https://www.figma.com/design/${키}/`;
  const 맞음 = /^(\d{1,10})[-:](\d{1,10})$/.exec(노드);
  if (맞음 === null) return null;
  return `https://www.figma.com/design/${키}/?node-id=${맞음[1]}-${맞음[2]}`;
}

// **배정은 여기서 안 본다. 문(auth/gate.ts)이 이미 막았다.**
// 여기서 보는 것은 그 접두사의 서비스가 실재하고 살아 있는가 하나뿐이다 (catalog/routes.ts 와 같은 규칙)
export async function 서비스번호(req: FastifyRequest, reply: FastifyReply): Promise<number | null> {
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
 * 안 막으면 남의 서비스 요청을 가리키는 재실행·머지가 줄에 서고, 맥이 그 행의
 * 자료(기획서 파일·피그마)와 그 서비스의 피그마 토큰을 받아 간다 (SPEC §7).
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


export default async function authoringRoutes(app: FastifyInstance): Promise<void> {
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

      const params = req.body?.params;
      const 값 = typeof params === 'object' && params !== null ? (params as Record<string, unknown>) : {};
      // 부른 사람은 요청에 안 싣는다. 로그인한 세션에서 채운다 — 실행이 triggeredBy 를 그렇게 한다
      const 누가 = req.user?.username ?? '';
      const 이름 = req.user?.displayName ?? '';

      // 기획서는 본문이 아니라 자료로 온다. 행은 DRAFT 로 서고 파일은 뒤따라 올린다 (SPEC §7 「자료」)
      if (kind === 'AUTHOR') {
        const 받은것 = req.body?.figma ?? [];
        if (!Array.isArray(받은것)) return reply.code(400).send({ error: 'BAD_FIGMA_URL' });
        if (받은것.length > 자료상한) return reply.code(400).send({ error: 'TOO_MANY_ASSETS' });
        const 피그마: string[] = [];
        for (const 주소 of 받은것) {
          const 정규 = 피그마주소정규화(주소);
          if (정규 === null) return reply.code(400).send({ error: 'BAD_FIGMA_URL', detail: String(주소) });
          피그마.push(정규);
        }
        const id = await 준비세우기({ 서비스, 누가, 이름, 피그마, 값 });
        return reply.code(201).send({ id });
      }

      const 행 = await 원본확인(req.body?.sourceId, 서비스, reply);
      if (행 === null) return reply;
      // 재실행은 원본의 자료를 다시 읽는다. 원본이 재실행·머지면 자료가 없고, DRAFT 면 아직 다 안 올라왔다
      if (행.kind !== 'AUTHOR' || 행.status === 'DRAFT') {
        return reply.code(409).send({ error: 'BAD_SOURCE', detail: `${행.kind} ${행.status}` });
      }
      const id = await 줄세우기({ 서비스, kind, 원본: 행.id, 기획서: null, 값, 누가, 이름 });
      return reply.code(201).send({ id });
    },
  );

  app.get<{ Querystring: { service?: string; status?: string; page?: string } }>(
    '/authoring/requests',
    async (req, reply) => {
      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const 값 = req.query.status;
      const 상태들: 상태[] = ['DRAFT', 'PENDING', 'RUNNING', 'DONE', 'FAILED'];
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
      const id = 번호(req.params.id);
      if (id === null) return reply.code(400).send({ error: 'BAD_ID' });

      const 행 = await 한건(id);
      // 없는 번호는 404 다. 「없는 것」과 「남의 것」이 뭉개지면 안 된다 (SPEC §7).
      // 서비스 경계는 문이 이미 봤다 — 이 틀은 라우트표에서 「번호로 서비스를 찾는」 갈래다
      if (행 === null) return reply.code(404).send({ error: 'NOT_FOUND' });
      return { ...행, assets: await 자료목록(행.id) };
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
        // ★ 기획서 본문을 복사하지 않는다. 그것은 실행 등급이 쓴 자유 텍스트이고 맥에서 도는
        // 에이전트가 읽고 따르는 지시문이다 — 머지 행에까지 실어 보내면 admin 이 승인한 것은
        // 「이 요청을 머지한다」인데 맥에게 가는 것은 그 사람이 쓴 문장이 된다.
        // 맥은 원본 번호로 필요한 것을 읽으면 된다 (2026-09-22 보안 검토가 잡았다)
        기획서: `머지 요청 — 원본 #${String(행.id)}`,
        누가: req.user?.username ?? '',
        이름: req.user?.displayName ?? '',
      });
      return reply.code(201).send({ id });
    },
  );

}
