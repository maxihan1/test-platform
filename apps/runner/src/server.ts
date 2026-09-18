// 러너 HTTP 서버의 부트스트랩. 라우트는 routes.ts가 들고 여기서는 포트만 연다.
// 완전 무상태이며 DB에 접근하지 않는다 (SPEC §3.4)

import Fastify from 'fastify';

import { registerRoutes } from './routes.js';

const app = Fastify({ logger: true });

registerRoutes(app);

const port = Number(process.env.PORT ?? 4000);

app.listen({ port, host: '0.0.0.0' }).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
