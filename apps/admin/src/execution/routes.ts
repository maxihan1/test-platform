// 실행 컨텍스트의 HTTP 라우트. WS-B가 채운다 (SPEC §7 Execution)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyInstance } from 'fastify';

export default async function executionRoutes(_app: FastifyInstance): Promise<void> {}
