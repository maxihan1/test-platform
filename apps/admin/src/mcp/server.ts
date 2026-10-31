// QA Hub MCP 창구 /mcp — Streamable HTTP, 세션 없이 요청마다 서버를 새로 세운다 (도메인/BTS §7 「MCP」 · BTS-F4-01)
// /api 밖이라 문(auth/gate.ts)의 두 훅이 지나간다. 열쇠는 여기서 보고, 권한은 도구마다 문과 같은 판정(문판정)을 부른다
// 파일 이름이 routes.ts 가 아닌 까닭 — 등급 표 검사(gate.test.ts)가 routes.ts 있는 폴더를 /api 라우트로 훑는다(grafana/proxy.ts 와 같다)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { PAT사람, type 묻기함수 } from '../auth/pat.js';
import type { 사용자 } from '../auth/store.js';
import type { 부르기함수 } from '../bts/client.js';
import { BTS찾기, prd찾기, 실행보기, 지도찾기, type 도구답 } from './tools.js';

export interface MCP설정 {
  묻기?: 묻기함수;
  부르기?: 부르기함수;
}

const 글답 = (답: 도구답) =>
  답.ok
    ? { content: [{ type: 'text' as const, text: JSON.stringify(답.data) }] }
    : { content: [{ type: 'text' as const, text: 답.detail === undefined ? 답.error : `${답.error} — ${답.detail}` }], isError: true };

const 이름 = z.string().regex(/^[A-Z][A-Z0-9]{0,11}$/).describe('애플리케이션 접두사 (예: MKW)');

function 서버세우기(사람: 사용자, pat: string, 부르기?: 부르기함수): McpServer {
  const 서버 = new McpServer({ name: 'qa-hub', version: '1.0.0' });
  const 읽기만 = { readOnlyHint: true, openWorldHint: false } as const;

  서버.registerTool(
    'prd_search',
    {
      description: '표준 기획서(PRD) 지금 판에서 요구 번호 · 기능 · 요구 문장에 낱말이 든 요구와 그 요구를 덮는 케이스를 찾는다. query 가 비면 앞에서부터 30줄',
      inputSchema: { service: 이름, query: z.string().max(200).describe('찾을 낱말') },
      annotations: 읽기만,
    },
    async ({ service, query }) => 글답(await prd찾기(사람, service, query)),
  );

  서버.registerTool(
    'map_search',
    {
      description: '지도 찾기 — 요구 번호(reqId) · 케이스 번호(tcId) · 화면 주소 일부(url) 중 하나로 케이스와 그 케이스가 덮는 요구 · 거치는 화면을 찾는다',
      inputSchema: {
        service: 이름,
        reqId: z.string().max(40).optional(),
        tcId: z.string().max(60).optional(),
        url: z.string().max(500).optional(),
      },
      annotations: 읽기만,
    },
    async ({ service, reqId, tcId, url }) => 글답(await 지도찾기(사람, service, { reqId, tcId, url })),
  );

  서버.registerTool(
    'bts_search',
    {
      description: '그 프로젝트가 이은 BTS 에서 이슈 · task 를 찾는다. issueKey(예: DM-12) 하나를 읽거나 query 낱말로 찾는다. 부른 사람의 통합계정 토큰으로 BTS 를 부른다',
      inputSchema: {
        projectId: z.number().int().positive().describe('QA Hub 프로젝트 번호'),
        issueKey: z.string().max(40).optional(),
        query: z.string().max(200).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ projectId, issueKey, query }) => 글답(await BTS찾기(사람, pat, projectId, { issueKey, query }, 부르기)),
  );

  서버.registerTool(
    'run_result',
    {
      description: '실행 결과 화면이 보는 것 그대로 — 실행 하나의 케이스별 결과 · 실패 이유 · 증적 목록',
      inputSchema: { runId: z.number().int().positive() },
      annotations: 읽기만,
    },
    async ({ runId }) => 글답(await 실행보기(사람, runId)),
  );

  return 서버;
}

const 오류몸 = (code: number, message: string) => ({ jsonrpc: '2.0', error: { code, message }, id: null });

const 열쇠없음 = (reply: FastifyReply) => reply.code(401).header('www-authenticate', 'Bearer').send(오류몸(-32001, 'UNAUTHENTICATED'));

// 인증 방식 이름은 대소문자를 가리지 않는다 (RFC 7235)
const PAT읽기 = (머리: string | undefined): string => /^bearer\s+(\S+)\s*$/i.exec(머리 ?? '')?.[1] ?? '';

export default async function mcpRoutes(app: FastifyInstance, 설정: MCP설정 = {}): Promise<void> {
  // 열쇠는 몸을 읽기 전에 본다 — 열쇠 없는 사람이 보낸 큰 몸이 메모리에 올라간 뒤에야 401 이 나가지 않게 (auth/gate.ts onRequest · bts/inbound.ts 와 같다)
  const 열쇠문 = async (req: FastifyRequest, reply: FastifyReply) => {
    const pat = PAT읽기(req.headers.authorization);
    if (pat === '') return 열쇠없음(reply);
    const 사람 = await PAT사람(pat, req.ip, 설정.묻기);
    if (사람 === '닿지못함') return reply.code(503).send(오류몸(-32002, 'AUTH_UNREACHABLE'));
    if (사람 === '너무많음') return reply.code(429).send(오류몸(-32003, 'TOO_MANY_REQUESTS'));
    if (사람 === null) return 열쇠없음(reply);
    req.user = 사람;
  };

  app.post('/mcp', { onRequest: 열쇠문 }, async (req, reply) => {
    // 열쇠문이 사람을 실었다. 없으면 이미 돌려보냈다
    const 사람 = req.user;
    if (사람 === null) return 열쇠없음(reply);
    const 서버 = 서버세우기(사람, PAT읽기(req.headers.authorization), 설정.부르기);
    // 세션 없이 — 요청 하나에 서버 하나. 답은 SSE 가 아니라 JSON 한 덩어리다
    const 전송 = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    reply.raw.on('close', () => {
      void 전송.close();
      void 서버.close();
    });
    await 서버.connect(전송);
    reply.hijack();
    try {
      await 전송.handleRequest(req.raw, reply.raw, req.body);
    } catch (err) {
      // hijack 뒤라 Fastify 가 대신 답하지 못한다 — 여기서 답하지 않으면 부른 쪽이 제 시간 끝까지 기다린다
      req.log.error({ err }, '[mcp] 요청을 처리하지 못했다');
      if (!reply.raw.headersSent) reply.raw.writeHead(500, { 'content-type': 'application/json' });
      reply.raw.end(JSON.stringify(오류몸(-32603, 'INTERNAL_ERROR')));
    }
    return reply;
  });

  // 세션이 없어 알림 흐름(GET) · 세션 끝내기(DELETE)를 열지 않는다 — 규격대로 405
  const 안받음 = async (_req: FastifyRequest, reply: FastifyReply) => reply.code(405).header('allow', 'POST').send(오류몸(-32000, 'Method not allowed'));
  app.get('/mcp', 안받음);
  app.delete('/mcp', 안받음);
}
