// 알림 통로 — 로그인한 사람이 볼 수 있는 서비스 전체의 도는 일과 최근 끝난 일 (진행 상황 · 알림 화면)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { 칸되는서비스, type 기능 } from '../auth/permissions.js';
import { 알림, type 보이는서비스 } from './store.js';

// 서비스에 안 매인다. 문은 「배정 중 하나라도 실행 read」만 보므로 경계는 여기서 가른다 —
// 실행은 실행 칸이 read 이상인 서비스만, 작성 요청은 작성 칸이 read 이상인 서비스만 담는다 (reporting/routes.ts 대시보드와 같다)
function 읽기되는서비스(req: FastifyRequest, 어느기능: 기능): 보이는서비스[] {
  const 배정 = req.user?.services ?? [];
  const 되는곳 = new Set(칸되는서비스(배정, 어느기능, 'read'));
  return 배정.filter((s) => 되는곳.has(s.prefix)).map((s) => ({ id: s.id, prefix: s.prefix, name: s.name }));
}

export default async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/notifications', async (req) => 알림(읽기되는서비스(req, 'runs'), 읽기되는서비스(req, 'authoring')));
}
