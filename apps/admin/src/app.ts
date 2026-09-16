// admin 서버 부트스트랩. 컨텍스트 폴더의 routes.ts를 정해진 규약으로 불러 등록한다.
// 갈래는 자기 폴더의 routes.ts만 채우고 이 파일은 건드리지 않는다 (WORKSTREAMS 공용 골격)

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';

import catalogRoutes from './catalog/routes.js';
import executionRoutes from './execution/routes.js';
import reportingRoutes from './reporting/routes.js';

const here = dirname(fileURLToPath(import.meta.url));

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({ ok: true }));

  // 등록 규약: 각 컨텍스트의 routes.ts가 default export 한 플러그인을 /api 접두사로 붙인다.
  // 새 컨텍스트가 생기면 여기 한 줄만 늘어난다
  app.register(catalogRoutes, { prefix: '/api' });
  app.register(executionRoutes, { prefix: '/api' });
  app.register(reportingRoutes, { prefix: '/api' });

  // 화면은 WS-E가 Vite로 빌드한다. 산출물이 아직 없는 동안에도 서버는 떠야 한다
  const webDist = join(here, 'web', 'dist');
  if (existsSync(webDist)) {
    app.register(fastifyStatic, { root: webDist, prefix: '/' });
  }

  return app;
}

const port = Number(process.env.PORT ?? 3000);

buildApp()
  .listen({ port, host: '0.0.0.0' })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
