// QA Hub MCP 창구 /mcp — Streamable HTTP, 세션 없이 요청마다 서버를 새로 세운다 (도메인/BTS §7 「MCP」 · BTS-F4-01)
// /api 밖이라 문(auth/gate.ts)의 두 훅이 지나간다. 열쇠는 여기서 보고, 권한은 도구마다 문과 같은 판정(문판정)을 부른다
// 파일 이름이 routes.ts 가 아닌 까닭 — 등급 표 검사(gate.test.ts)가 routes.ts 있는 폴더를 /api 라우트로 훑는다(grafana/proxy.ts 와 같다)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { FastifyInstance, FastifyReply } from 'fastify';
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

const 열쇠없음 = (reply: FastifyReply, error: string) =>
  reply.code(401).header('www-authenticate', 'Bearer').send({ jsonrpc: '2.0', error: { code: -32001, message: error }, id: null });

export default async function mcpRoutes(app: FastifyInstance, 설정: MCP설정 = {}): Promise<void> {
  app.post('/mcp', async (req, reply) => {
    const 머리 = req.headers.authorization ?? '';
    const pat = 머리.startsWith('Bearer ') ? 머리.slice('Bearer '.length).trim() : '';
    if (pat === '') return 열쇠없음(reply, 'UNAUTHENTICATED');
    const 사람 = await PAT사람(pat, 설정.묻기);
    if (사람 === '닿지못함') return reply.code(503).send({ jsonrpc: '2.0', error: { code: -32002, message: 'AUTH_UNREACHABLE' }, id: null });
    if (사람 === null) return 열쇠없음(reply, 'UNAUTHENTICATED');

    const 서버 = 서버세우기(사람, pat, 설정.부르기);
    // 세션 없이 — 요청 하나에 서버 하나. 답은 SSE 가 아니라 JSON 한 덩어리다
    const 전송 = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    reply.raw.on('close', () => {
      void 전송.close();
      void 서버.close();
    });
    await 서버.connect(전송);
    reply.hijack();
    await 전송.handleRequest(req.raw, reply.raw, req.body);
    return reply;
  });

  // 세션이 없어 알림 흐름(GET) · 세션 끝내기(DELETE)를 열지 않는다 — 규격대로 405
  const 안받음 = async (_req: unknown, reply: FastifyReply) =>
    reply.code(405).header('allow', 'POST').send({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null });
  app.get('/mcp', 안받음);
  app.delete('/mcp', 안받음);
}
