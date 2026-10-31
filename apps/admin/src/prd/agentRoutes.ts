// 작성 에이전트가 부르는 표준 기획서 통로 — 그 요청 서비스의 지금 판 · 기준 판 읽기 · 옮기기 결과 올리기 · 화면 기록 읽기 · 올리기 · 화면이 맞음 건의 실패 trace · 서비스 지도 · 게임 지도 (도메인/작성 §7 「표준 기획서 통로」 · 도메인/게임 §7)
// 서비스 경계는 문이 요청 번호로 봤다. 여기서는 맥 계정 · 집은 쪽 · 도는 중인지를 본다(authoring/agentRoutes.ts 와 같은 문턱)

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { 집은쪽인가 } from '../authoring/agentRoutes.js';
import { 대상줄들읽기, 앱줄고르기 } from '../authoring/reverse.js';
import { 지도를읽는다 } from './apiMap.js';
import { 게임서비스인가, 요소검사, 요소넣기, 지도글 } from './gameMap.js';
import type { 앱요청 } from '../authoring/store.js';
import { TCID } from '../catalog/rules.js';
import { 누가, 판번호, 틀린판번호 } from './routes.js';
import { 본문상한, 항목검사, 화면번호들, 화면이맞음건인가 } from './rules.js';
import { 다봄, 다봄검사, 화면검사, 화면넣기, 화면들 } from './screens.js';
import { 실패요약 } from './screenRight.js';
import { 기준판, 서비스접두사, 옮기기, 읽은판, 지금판, 판하나 } from './store.js';

type 경로 = { Params: { id: string } };
const 서버없음 = { error: 'BAD_SCREEN', detail: 'env' } as const;
const 게임아님 = { error: 'NOT_GAME_SERVICE' } as const;

/**
 * 화면 기록을 둘 대상 서버 줄 — 요청의 것이다. 게임은 대조가 없어 요청에 줄이 없으니 앱 줄(게임 첫 화면을 읽는 줄 — 운영 줄은 건너뛴다)에 둔다.
 * 창 훑기는 그 줄의 앱 파일로 켠 게임을 본 것이다 (도메인/게임 §3.10 「지도」 · GAME-F1-10)
 */
async function 화면줄(행: 앱요청): Promise<string | null> {
  if (!(await 게임서비스인가(행.serviceId))) return 행.env;
  return 앱줄고르기(await 대상줄들읽기(행.serviceId), 행.env)?.env ?? null;
}

/**
 * 맥 계정 · 집은 쪽 · 도는 중. 본문보다 먼저 본다 — 끝난 요청에는 본문 모양과 상관없이 409 다.
 * 노트 고치기 줄(서비스 칸이 빔)은 애플리케이션 자료가 없어 400 BAD_KIND — 그 일은 집기 note 칸만 읽는다
 */
export async function 도는집은요청(req: FastifyRequest, reply: FastifyReply): Promise<앱요청 | null> {
  const 행 = await 집은쪽인가(req, reply);
  if (행 === null) return null;
  if (행.status !== 'RUNNING') {
    await reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
    return null;
  }
  const 서비스 = 행.serviceId;
  if (서비스 === null) {
    await reply.code(400).send({ error: 'BAD_KIND', detail: 행.kind });
    return null;
  }
  return { ...행, serviceId: 서비스 };
}

export default async function prdAgentRoutes(app: FastifyInstance): Promise<void> {
  app.get<경로>('/authoring/requests/:id/prd', async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    // 기준 판은 반영 요청이 바뀐 항목과 옛 문장(설계가 바뀐 종류)을 알려고 읽는다 — 화면의 「반영 안 됨」과 같은 기준이다.
    // 반영 요청은 집을 때 적은 판을 읽는다 — 그 사이 사람이 저장한 판까지 넣으면 병합 뒤에도 그 고침이 「반영 안 됨」으로 남는다
    const 적은판 = 행.params.prdApply === true ? await 읽은판(행.id) : null;
    const [판, base] = await Promise.all([적은판 === null ? 지금판(행.serviceId) : 판하나(행.serviceId, 적은판), 기준판(행.serviceId)]);
    return { version: 판?.version ?? 0, items: 판?.items ?? [], base };
  });

  app.post<경로 & { Body: Record<string, unknown> | null }>(
    '/authoring/requests/:id/prd',
    { bodyLimit: 본문상한 },
    async (req, reply) => {
      const 행 = await 도는집은요청(req, reply);
      if (행 === null) return reply;
      const baseVersion = 판번호(req.body?.baseVersion);
      if (baseVersion === null) return 틀린판번호(reply, 'baseVersion');
      const 접두사 = await 서비스접두사(행.serviceId);
      const 읽음 = 항목검사(req.body?.items, 접두사);
      if ('error' in 읽음) return reply.code(400).send(읽음);
      // 화면이 맞음 요청이면 그 번호의 바뀐 항목을 서버가 확정 · 사람이 고친 것으로 단다 — 본문이 아니라 요청 행에서 읽는다
      const 결과 = await 옮기기(행.id, 행.serviceId, 접두사, baseVersion, 읽음.items, 누가(req), 화면번호들(행.params));
      if (!('error' in 결과)) return 결과;
      return reply.code(결과.error === 'NOT_RUNNING' ? 409 : 400).send(결과);
    },
  );

  // 화면 기록 — 작업 바탕 디스크 저장본을 대신한다. 본문은 이 통로로만 읽는다(로그인 화면의 이름 · 이메일이 들 수 있다).
  // 대상 서버는 요청 행의 것이다 — 대상 서버가 없는 요청(대조가 아니다)은 저장본이 없고 올리지 못한다 (PRD-F9-29). 게임은 앱 줄이다(위 화면줄)
  app.get<경로>('/authoring/requests/:id/screens', async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    const env = await 화면줄(행);
    return env === null ? { screens: [], links: [] } : 화면들(행.serviceId, env);
  });

  app.put<경로 & { Body: unknown }>('/authoring/requests/:id/screens', async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    const env = await 화면줄(행);
    if (env === null) return reply.code(400).send(서버없음);
    const 읽음 = 화면검사(req.body);
    if ('error' in 읽음) return reply.code(400).send(읽음);
    await 화면넣기(행.serviceId, env, 읽음.화면, 읽음.links, 읽음.apis);
    return reply.code(204).send();
  });

  // 「화면이 맞음」 요청의 실패 trace — 그 요청에 실린 실행 · 케이스 것만, 가린 요약 줄로 준다 (작성 §7 「표준 기획서 통로」 · §3.6 「관문이 빨개지면」)
  app.get<경로 & { Querystring: { runId?: string; tcId?: string } }>('/authoring/requests/:id/trace', async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    const runId = Number(req.query.runId);
    const tcId = req.query.tcId ?? '';
    if (!Number.isSafeInteger(runId) || runId <= 0 || !TCID.test(tcId)) return reply.code(400).send({ error: 'INVALID_REQUEST' });
    // 실린 짝이 아니면 없는 것과 같다 — 번호로 다른 실행의 기록을 떠보지 못하게
    if (!화면이맞음건인가(행.params, runId, tcId)) return reply.code(404).send({ error: 'NO_TRACE', detail: '이 요청의 화면이 맞음 건이 아니다' });
    const 결과 = await 실패요약(행.serviceId, runId, tcId);
    return 'error' in 결과 ? reply.code(404).send(결과) : 결과;
  });

  // 서비스 지도 — 자식이 조작 뒤 기다릴 API 를 고르고 빨개진 관문을 가른다. 기대값의 근거로는 안 쓴다 (작성 §3.6 「서비스 지도」)
  app.get<경로>('/authoring/requests/:id/apis', async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    return 지도를읽는다(행.serviceId);
  });

  // 게임 지도 — 게임 애플리케이션만. 지도는 화면에 보이지 않고 AI 가 다음 작성 때 읽는다 (도메인/게임 §3.10 「게임에만 있는 지도 넷」)
  app.put<경로 & { Body: unknown }>('/authoring/requests/:id/game-elements', { bodyLimit: 본문상한 }, async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    if (!(await 게임서비스인가(행.serviceId))) return reply.code(400).send(게임아님);
    const 읽음 = 요소검사(req.body);
    if ('error' in 읽음) return reply.code(400).send(읽음);
    await 요소넣기(행.serviceId, 읽음.elements, 읽음.remove);
    return reply.code(204).send();
  });

  app.get<경로>('/authoring/requests/:id/game-map', async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    if (!(await 게임서비스인가(행.serviceId))) return reply.code(400).send(게임아님);
    return { text: await 지도글(행.serviceId) };
  });

  // seen 5,000개에 화면 크기 차이(화면 하나 최대 13KB)까지 실려 기본 1MiB 를 넘을 수 있다 (PRD-F10-07)
  app.post<경로 & { Body: unknown }>('/authoring/requests/:id/screens/done', { bodyLimit: 본문상한 }, async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    const env = await 화면줄(행);
    if (env === null) return reply.code(400).send(서버없음);
    const 읽음 = 다봄검사(req.body);
    if ('error' in 읽음) return reply.code(400).send(읽음);
    return 다봄(행.serviceId, env, 읽음.seen, 읽음.complete);
  });
}
