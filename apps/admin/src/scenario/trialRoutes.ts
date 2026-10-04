// 시나리오 시험 실행 통로 — 시작 · 결과 · 사진. 기록을 안 남기고 시작한 사람만 본다 (SPEC 도메인/시나리오 §7)
// 배정과 권한은 문(auth/gate.ts)이 이미 봤다. 남의 번호는 문이 지나보내고 여기서 404 를 낸다

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { artifactsDir } from '../execution/routes.js';
import { 시나리오시험, TrialBusyError } from '../execution/trial.js';
import { 정수 } from '../routeParams.js';

import { 시험시작, 시험시작오류, uuid모양 } from './trial.js';
import { 부품들모양 } from './validate.js';

// 문이 본문 service 를 접두사 모양으로 이미 봤다
const 시작본문 = z.object({
  service: z.string(),
  env: z.string().min(1),
  platform: z.enum(['desktop', 'mobile']),
  parts: 부품들모양,
});

// 문 없이 라우트만 띄우는 검사에서만 사람이 빈다 (scenario/routes.ts 의 누가 와 같다)
const 누구 = (req: FastifyRequest) => req.user?.username ?? '알 수 없음';
// 남의 것 · 없는 것 · 24시간 지난 것을 가르지 않는다 — 있는지도 알리지 않는다
const 없음 = (reply: FastifyReply, trialId: string) => reply.code(404).send({ error: 'TRIAL_NOT_FOUND', detail: trialId });

export default async function scenarioTrialRoutes(app: FastifyInstance): Promise<void> {
  app.post('/scenario-trials', async (req, reply) => {
    const parsed = 시작본문.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    try {
      const trialId = await 시험시작({ username: 누구(req) }, parsed.data);
      return reply.code(202).send({ trialId });
    } catch (err) {
      if (err instanceof TrialBusyError) return reply.code(409).send({ error: err.code, detail: err.message });
      if (err instanceof 시험시작오류) return reply.code(400).send({ error: err.code, detail: err.message });
      throw err;
    }
  });

  app.get<{ Params: { trialId: string } }>('/scenario-trials/:trialId', async (req, reply) => {
    const 읽음 = 시나리오시험.읽는다(누구(req), req.params.trialId);
    return 읽음 ?? 없음(reply, req.params.trialId);
  });

  app.get<{ Params: { trialId: string; seq: string } }>('/scenario-trials/:trialId/screenshots/:seq', async (req, reply) => {
    const { trialId } = req.params;
    // 경로를 UUID 와 정수로만 조립한다. 볼륨 밖으로 올라가는 경로가 애초에 만들어지지 않는다
    if (!uuid모양.test(trialId) || 시나리오시험.읽는다(누구(req), trialId) === null) return 없음(reply, trialId);
    const seq = 정수(req.params.seq);
    if (seq === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.seq });

    let png: Buffer;
    try {
      png = await readFile(join(artifactsDir(), 'runs', 'trial', trialId, `${seq}.png`));
    } catch {
      return reply.code(404).send({ error: 'SCREENSHOT_NOT_FOUND', detail: req.url });
    }
    return reply.type('image/png').send(png);
  });
}
