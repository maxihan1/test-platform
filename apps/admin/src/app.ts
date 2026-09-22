// admin 서버 부트스트랩. 컨텍스트 폴더의 routes.ts를 정해진 규약으로 불러 등록한다.
// 갈래는 자기 폴더의 routes.ts만 채우고 이 파일은 건드리지 않는다 (WORKSTREAMS 공용 골격)

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';

import authRoutes from './auth/routes.js';
import authoringRoutes from './authoring/routes.js';
import { 인증등록 } from './auth/gate.js';
import { 세션등록, 열쇠최소길이 } from './auth/session.js';
import catalogRoutes from './catalog/routes.js';
import executionRoutes from './execution/routes.js';
import reportingRoutes from './reporting/routes.js';
import settingsRoutes from './settings/routes.js';

const here = dirname(fileURLToPath(import.meta.url));

export function buildApp(sessionSecret = process.env.SESSION_SECRET ?? '') {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({ ok: true }));

  // 문은 라우트보다 **먼저** 선다. POST /api/auth/login 을 뺀 모든 /api/**가 이것을 지난다 (SPEC §7)
  세션등록(app, sessionSecret);
  인증등록(app);

  // 등록 규약: 각 컨텍스트의 routes.ts가 default export 한 플러그인을 /api 접두사로 붙인다.
  // 새 컨텍스트가 생기면 여기 한 줄만 늘어난다
  app.register(authRoutes, { prefix: '/api' });
  app.register(authoringRoutes, { prefix: '/api' });
  app.register(catalogRoutes, { prefix: '/api' });
  app.register(executionRoutes, { prefix: '/api' });
  app.register(reportingRoutes, { prefix: '/api' });
  app.register(settingsRoutes, { prefix: '/api' });

  // 화면은 WS-E가 Vite로 빌드한다. 산출물이 아직 없는 동안에도 서버는 떠야 한다
  const webDist = join(here, 'web', 'dist');
  if (existsSync(webDist)) {
    app.register(fastifyStatic, { root: webDist, prefix: '/' });
  }

  return app;
}

const port = Number(process.env.PORT ?? 3000);

// 임시 키를 지어내면 재기동할 때마다 전원 로그아웃되고, 그 사실을 아무도 모른 채
// 「가끔 로그인이 풀린다」로 겪는다. 그래서 없으면 기동하지 않는다 (SPEC §9 · §3.5).
// 검사는 기동 경로에만 둔다 — buildApp()을 부르는 테스트까지 키를 요구할 이유가 없다
const 열쇠 = process.env.SESSION_SECRET ?? '';
const 열쇠바이트 = Buffer.byteLength(열쇠);
if (열쇠바이트 < 열쇠최소길이) {
  console.error(
    열쇠 === ''
      ? 'SESSION_SECRET이 비어 있다. 로그인 세션을 서명할 키가 없으면 admin은 뜨지 않는다 (SPEC §9)'
      : `SESSION_SECRET이 너무 짧다 (${String(열쇠바이트)}바이트). ${String(열쇠최소길이)}바이트를 넘겨라 — 짧으면 세션 부품이 기동 중에 던진다`,
  );
  process.exit(1);
}

buildApp()
  .listen({ port, host: '0.0.0.0' })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
