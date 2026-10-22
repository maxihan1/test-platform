// 성능 테스트 통로 묶음 — 에이전트 통로 · 시나리오 · 실행 · 에이전트 관리 · AI 일 (도메인/성능 §5.4 · §7)

import type { FastifyInstance } from 'fastify';

import perfAgentRoutes from './agentRoutes.js';
import perfAiRoutes from './aiRoutes.js';
import perfAgentAdminRoutes from './agents.js';
import perfDeviceRoutes from './deviceRoutes.js';
import perfDummyRoutes from './dummy.js';
import perfPageRoutes from './pageRoutes.js';
import perfRunRoutes from './runs.js';
import perfScenarioRoutes from './scenarios.js';
import perfScheduleRoutes from './scheduleRoutes.js';

export default async function perfRoutes(app: FastifyInstance): Promise<void> {
  await app.register(perfAgentRoutes);
  await app.register(perfScenarioRoutes);
  await app.register(perfScheduleRoutes);
  await app.register(perfRunRoutes);
  await app.register(perfPageRoutes);
  await app.register(perfDeviceRoutes);
  await app.register(perfAgentAdminRoutes);
  await app.register(perfAiRoutes);
  await app.register(perfDummyRoutes);
}
