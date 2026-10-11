// 작성 컨텍스트의 HTTP 라우트 (SPEC 도메인/작성 §7)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { resolve } from 'node:path';

import { findService } from '../catalog/store.js';
import { 자료상한, 자료목록, 준비세우기 } from './assetStore.js';
import { 반영겹침판정, 겹침상세, 겹침통로 } from './conflict-routes.js';
import { 같이온칸, 이어작성상세, 이어작성세우기 } from './continue.js';
import { 행커버리지 } from './coverage.js';
import { 피그마주소정규화 } from './figma.js';
import { 머지보류판정, 보류상세, 보류통로 } from './held-routes.js';
import { 역방향칸판정 } from './reverse.js';
import { 번호 } from './params.js';
import { 상세읽기, 중단통로 } from './stop.js';
import { 밖화면뿌리읽기 } from './uncovered.js';
import { 도는실행있나, 뿌리, 뿌리잠그고, 실행들, 최신실행, 한쪽 } from './history.js';
import { 이어받을수있나, 줄세우기, 한건, type 요청, type 상태 } from './store.js';

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

// 번호 규칙의 정본은 params.ts 다. assets.ts 가 여기서 가져가므로 다시 내보낸다
export { 번호 };

// 피그마 주소 정규화는 figma.ts 로 뗐다 (2026-09-30 — 300줄). 검사가 여기서 가져가므로 다시 내보낸다
export { 피그마주소정규화 } from './figma.js';

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
      // edits 는 케이스 고치기 통로만 싣는다 — 여기로 실으면 서버 검사(비밀값 · 비밀번호 · 겹침)를 건너뛴 고침이 줄에 선다
      if (Object.hasOwn(값, 'edits')) return reply.code(400).send({ error: 'BAD_EDIT', detail: 'params.edits' });
      // prdApply · screenRight 는 반영 통로(POST /api/prd/apply)만 싣는다 — 여기로 실으면 실행 검사 없이 반영 · 화면이 맞음 요청이 선다
      if (Object.hasOwn(값, 'prdApply') || Object.hasOwn(값, 'screenRight')) return reply.code(400).send({ error: 'BAD_PRD_APPLY' });
      // 부른 사람은 요청에 안 싣는다. 로그인한 세션에서 채운다 — 실행이 triggeredBy 를 그렇게 한다
      const 누가 = req.user?.username ?? '';
      const 이름 = req.user?.displayName ?? '';

      // 남은 요구로 이어 작성 — 원본의 자료 · 대조 설정을 물려받는 새 작성 요청 (§3.6 「★ 원장」 「남은 요구로 이어 작성」)
      if (kind === 'AUTHOR' && req.body?.continueFrom !== undefined) {
        const 막힘 = 같이온칸(req.body);
        if (막힘 !== null) return reply.code(400).send({ error: 막힘 });
        const 원본 = await 원본확인(req.body.continueFrom, 서비스, reply);
        if (원본 === null) return reply;
        return 이어작성세우기(reply, { 서비스, 원본, 누가, 이름 });
      }

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
        const 대조 = await 역방향칸판정(req.body, 서비스);
        if ('error' in 대조) return reply.code(400).send({ error: 대조.error });
        const id = await 준비세우기({
          서비스,
          누가,
          이름,
          피그마,
          값,
          ...(대조.compare ? { 대조: { env: 대조.env, startUrl: 대조.startUrl } } : {}),
        });
        return reply.code(201).send({ id });
      }

      // 본문으로 받는 역방향 칸은 작성 요청에만 — 재실행은 원본 것을 물려받는다(아래)
      if (['compare', 'env', 'startUrl'].some((칸) => req.body?.[칸] !== undefined)) {
        return reply.code(400).send({ error: 'BAD_ENV' });
      }
      const 받은것 = await 원본확인(req.body?.sourceId, 서비스, reply);
      if (받은것 === null) return reply;
      // 이어서 작성 — 받은 것은 멈춘 그 행이고, 그 행의 작업 폴더를 넘겨받는다 (§7 「이어하기」).
      // 멈춘 것이 이어받은 재실행이어도 된다. 자료와 대조 설정은 맨 처음 작성 요청 것이다
      const 이어서 = req.body?.resume === true;
      if (이어서 && !(await 이어받을수있나(받은것.id))) {
        return reply.code(409).send({ error: 'NOT_RESUMABLE' });
      }
      const 행 = 이어서 && 받은것.kind === 'RERUN' && 받은것.sourceId !== null ? await 한건(받은것.sourceId) : 받은것;
      // 재실행은 원본의 자료를 다시 읽는다. 원본이 재실행·머지면 자료가 없고, DRAFT 면 아직 다 안 올라왔다
      // 폐기한 원본도 다시 안 돌린다 — 목록에서 치운 것이 재실행으로 되살아난다 (§7 「중단 · 폐기 · 진척」).
      // 이어서 작성은 멈춘 행의 폐기를 위에서 봤다 — 폐기는 요청 통째라 맨 처음 요청만 폐기된 것은 2026-09-29 전 옛 행뿐이다
      // 원본이 케이스 고치기면 다시 적용이다 — 새 main 위에서 같은 edits 로 다시 고친다 (§3.6 「★ 케이스 고치기」)
      if (행 === null || !['AUTHOR', 'EDIT'].includes(행.kind) || 행.status === 'DRAFT' || (!이어서 && 행.discardedAt !== null)) {
        return reply.code(409).send({ error: 'BAD_SOURCE', detail: `${행?.kind} ${행?.status}` });
      }
      // 병합된 고치기를 다시 적용하면 그 사이 같은 케이스로 선 고치기와 둘 다 열려 EDIT_OPEN 을 비켜 간다
      if (행.kind === 'EDIT' && (await 한건(await 최신실행(행.id)))?.kind === 'MERGE') {
        return reply.code(409).send({ error: 'BAD_SOURCE', detail: 'MERGED' });
      }
      // 대조 원본이면 같은 대상 서버·시작 주소를 물려받는다 — 없으면 정방향으로 돌거나(대조) 읽을 입력이 없어 늘 실패한다(화면만).
      // 만든 뒤 계정이 빠졌을 수 있어 작성 요청과 같은 판정을 다시 한다 — 줄에서 한참 기다린 뒤 실패하지 않게 (2026-09-28 게이트 1)
      const 대조 = 행.compare
        ? await 역방향칸판정({ compare: true, env: 행.env, startUrl: 행.startUrl }, 서비스)
        : ({ compare: false } as const);
      if ('error' in 대조) return reply.code(400).send({ error: 대조.error });
      try {
        // 같은 뿌리에 도는 실행이 있으면 둘이 같은 브랜치를 서로 덮는다 — 확인과 넣기를 뿌리 잠금 안에서 (§7 「실행 기록」)
        const id = await 뿌리잠그고(행.id, async () => (await 도는실행있나(행.id)) ? null : 줄세우기({
          서비스,
          kind,
          원본: 행.id,
          기획서: null,
          // 고칠 내용은 원본 것만 — 본문 params 로 다른 edits 를 실으면 검사 안 거친 고침이 줄에 선다.
          // 반영 요청의 재실행은 같은 반영을 다시 한다 — 원본의 prdApply · screenRight 를 물려받는다 (§7 「표준 기획서 통로」)
          값: 행.kind === 'EDIT' ? { edits: 행.params.edits } : 행.params.prdApply === true ? { ...값, prdApply: true, ...(행.params.screenRight === undefined ? {} : { screenRight: 행.params.screenRight }) } : 값,
          누가,
          이름,
          ...(대조.compare ? { 대조: { env: 대조.env, startUrl: 대조.startUrl } } : {}),
          ...(이어서 ? { 이어받기: 받은것.id } : {}),
        }));
        if (id === null) return reply.code(409).send({ error: 'RUN_ACTIVE' });
        return reply.code(201).send({ id });
      } catch (e) {
        // 둘이 동시에 눌렀다 — 위 판정은 둘 다 통과하고 유일 색인이 뒤엣것을 막는다
        if (이어서 && (e as { constraint?: string }).constraint === 'authoring_request_resume_from_once') {
          return reply.code(409).send({ error: 'NOT_RESUMABLE' });
        }
        throw e;
      }
    },
  );

  app.get<{ Querystring: { service?: string; status?: string; discarded?: string; page?: string } }>(
    '/authoring/requests',
    async (req, reply) => {
      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const 값 = req.query.status;
      const 상태들: 상태[] = ['DRAFT', 'PENDING', 'RUNNING', 'DONE', 'FAILED', 'STOPPED'];
      const 상태 = 상태들.find((s) => s === 값);
      if (값 !== undefined && 상태 === undefined) {
        return reply.code(400).send({ error: 'BAD_STATUS', detail: 값 });
      }

      return 한쪽({
        서비스,
        상태,
        폐기: req.query.discarded === '1',
        쪽: Math.max(1, Number(req.query.page ?? 1) || 1),
      });
    },
  );

  app.get<{ Querystring: { service?: string }; Params: { id: string } }>(
    '/authoring/requests/:id',
    async (req, reply) => {
      const id = 번호(req.params.id);
      if (id === null) return reply.code(400).send({ error: 'BAD_ID' });

      const 행 = await 상세읽기(req, id);
      // 없는 번호는 404 다. 「없는 것」과 「남의 것」이 뭉개지면 안 된다 (SPEC §7).
      // 서비스 경계는 문이 이미 봤다 — 이 틀은 라우트표에서 「번호로 서비스를 찾는」 갈래다
      if (행 === null) return reply.code(404).send({ error: 'NOT_FOUND' });
      const 뿌리번호 = (await 뿌리(행.id)) ?? 행.id;
      return {
        ...행,
        assets: await 자료목록(행.id),
        rootId: 뿌리번호,
        runs: await 실행들(뿌리번호),
        ...(await 보류상세(행)),
        ...(await 겹침상세(행.id)),
        coverage: 행커버리지(행.result),
        ...(await 이어작성상세(뿌리번호)),
        uncoveredOf: await 밖화면뿌리읽기(뿌리번호),
      };
    },
  );

  // 머지만 경로가 갈린다. 같은 경로에 kind 로 얹으면 등급이 **본문 값**에 따라 갈려야 하고
  // 그러려면 문이 본문을 읽어야 한다. 경로가 다르면 경로만 보고 가른다 (SPEC §7)
  app.post<{ Querystring: { service?: string }; Body: { sourceId?: unknown; env?: unknown } }>(
    '/authoring/merges',
    async (req, reply) => {
      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const 행 = await 원본확인(req.body?.sourceId, 서비스, reply);
      if (행 === null) return reply;

      // 도는 실행이 있거나 뒤에 실행이 더 있으면 그 PR 은 이미 옛것이다 — 최신 실행만 머지한다 (§7 「실행 기록」)
      const 뿌리번호 = (await 뿌리(행.id)) ?? 행.id;
      if (await 도는실행있나(뿌리번호)) return reply.code(409).send({ error: 'RUN_ACTIVE' });
      if ((await 최신실행(뿌리번호)) !== 행.id) return reply.code(409).send({ error: 'NOT_LATEST' });
      // 아직 안 끝났거나 실패한 요청은 머지할 것이 없다. PR 주소가 비어 있다
      if (행.status !== 'DONE' || 행.prUrl === null) {
        return reply.code(409).send({ error: 'NOT_MERGEABLE', detail: 행.status });
      }
      // 보류 판정도 잠금 안에서 — 밖에서 보면 판정과 머지 행 사이에 PUT · DELETE 가 끼어든다
      const 세움 = await 뿌리잠그고(뿌리번호, async (손): Promise<{ error: string; code: number; detail?: string } | { id: number }> => {
        if (await 도는실행있나(뿌리번호)) return { error: 'RUN_ACTIVE', code: 409 };
        const 보류 = await 머지보류판정(행, 서비스, req.body?.env);
        if ('error' in 보류) return 보류;
        // 겹친 케이스를 다 고르기 전에는 반영하지 않는다 — 에이전트가 같은 겹침에서 또 멈춘다 (§3.6 「★ 반영 때 겹침 검사」)
        const 겹침 = await 반영겹침판정(손, 행.id);
        if (겹침 !== null) return 겹침;
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
          머지대상: 보류.env,
        });
        return { id };
      });
      if ('error' in 세움) return reply.code(세움.code).send({ error: 세움.error, detail: 세움.detail });
      return reply.code(201).send({ id: 세움.id });
    },
  );

  await 중단통로(app);
  await 보류통로(app);
  await 겹침통로(app);
}
