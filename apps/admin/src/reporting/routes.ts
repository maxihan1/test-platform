// 리포팅 컨텍스트의 HTTP 라우트. WS-D가 채운다 (SPEC §7 Reporting)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyInstance } from 'fastify';

export default async function reportingRoutes(_app: FastifyInstance): Promise<void> {}
