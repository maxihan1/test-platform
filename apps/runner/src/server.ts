// 러너 HTTP 서버의 부트스트랩. 라우트는 routes.ts가 들고 여기서는 포트만 연다.
// 완전 무상태이며 DB에 접근하지 않는다 (SPEC §3.4)

import Fastify from 'fastify';

import { testsDir } from './execute.js';
import { 장면폴더를비운다 } from './live.js';
import { 받아오기켜기 } from './repoPull.js';
import { registerRoutes } from './routes.js';

const app = Fastify({ logger: true });

registerRoutes(app);

// 앞서 뜬 러너가 남긴 테스트 모드 장면 — 도는 열쇠는 메모리에만 있어 이제 아무도 못 읽는다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)
await 장면폴더를비운다().catch((err: unknown) => console.warn(`[runner] 남은 장면 폴더를 못 지웠다: ${err instanceof Error ? err.message : String(err)}`));

// 내 컴퓨터 러너만 테스트 저장소를 스스로 받는다 — 켤 때와 1분마다 (공통/6-인프라 「받아 오기」)
if (process.env.PLATFORM_REPOS_PULL === '1') 받아오기켜기(testsDir);

const port = Number(process.env.PORT ?? 4000);

app.listen({ port, host: process.env.HOST ?? '0.0.0.0' }).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
