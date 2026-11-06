// 시나리오 시험 실행 통로 — 시작 · 결과 · 사진. 기록을 안 남기고 시작한 사람만 본다 (SPEC 도메인/시나리오 §7)
// 배정과 권한은 문(auth/gate.ts)이 이미 봤다. 남의 번호는 문이 지나보내고 여기서 404 를 낸다

import { join } from 'node:path';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { artifactsDir, 볼륨파일읽기 } from '../artifactFile.js';
import { 권한이되나 } from '../auth/gate.js';
import { 장면을건넨다 } from '../execution/live.js';
import { abortScenarioRunner, 시나리오진행 } from '../execution/runner.js';
import { 시나리오시험, TrialBusyError } from '../execution/trial.js';
import { 정수 } from '../routeParams.js';

import { 시험시작, 시험시작오류, uuid모양 } from './trial.js';
import { 보내기전멈춘결과, 상태찾기 } from './trialAbort.js';
import { 저장안된단계 } from './trialGuard.js';
import { 부품들모양 } from './validate.js';

// 문이 본문 service 를 접두사 모양으로 이미 봤다
const 시작본문 = z.object({
  service: z.string(),
  env: z.string().min(1),
  // android 는 Android 앱 · 게임 애플리케이션의 시나리오다 (§3.7 결정 16)
  platform: z.enum(['desktop', 'mobile', 'android']),
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
    // 문이 실행 trial 이상을 봤다. 문과 같은 판정으로 write 가 확인되지 않으면 조립을 더 거른다 (SPEC 도메인/인증 §3.5 「테스트 모드」)
    if (!req.user || !권한이되나(req.user, { 기능: 'runs', 칸: 'write' }, [parsed.data.service])) {
      const { pool } = await import('../db/index.js');
      const 사유 = await 저장안된단계(pool, parsed.data.service, parsed.data.parts);
      if (사유 !== null) return reply.code(403).send({ error: 'FORBIDDEN', need: 'runs:write', detail: 사유 });
    }
    try {
      const trialId = await 시험시작({ username: 누구(req) }, parsed.data);
      return reply.code(202).send({ trialId });
    } catch (err) {
      if (err instanceof TrialBusyError) return reply.code(409).send({ error: err.code, detail: err.message });
      // detail 을 싣지 않는다 — 화면 문장이 사유를 다 말한다(케이스 테스트 실행과 같다)
      if (err instanceof 시험시작오류 && err.code === 'DEVICE_BUSY') return reply.code(409).send({ error: err.code });
      if (err instanceof 시험시작오류) return reply.code(err.code === 'FARM_OFF' ? 409 : 400).send({ error: err.code, detail: err.message });
      throw err;
    }
  });

  app.get<{ Params: { trialId: string } }>('/scenario-trials/:trialId', async (req, reply) => {
    const { trialId } = req.params;
    const 읽음 = 시나리오시험.읽는다(누구(req), trialId);
    if (읽음 === null) return 없음(reply, trialId);
    // 러너에 보낸 시험만 지금 부품을 묻는다. 러너가 아직 모르거나 못 닿으면 빈 칸이다 — 오류가 아니다.
    // 러너의 목록은 모든 시나리오를 담으니 이 시험 번호로 거른다
    if (읽음.status !== 'RUNNING' || 상태찾기(trialId)?.보냄 !== true) return 읽음;
    const 지금 = (await 시나리오진행()).find((s) => s.trialId === trialId);
    return 지금 === undefined ? 읽음 : { ...읽음, step: { seq: 지금.seq, elapsedMs: 지금.elapsedMs } };
  });

  // 시작한 사람만 멈춘다 — 남의 번호는 결과 읽기처럼 404 다. 끝나는 것과 누르는 것이 겹치면 오류가 아니라 false 다.
  // 규칙은 케이스 시험 실행 중단과 같다: 러너에 보내기 전이면 admin 이 닫고, 보낸 뒤면 러너가 끊고 결과는 러너 답이다 (도메인/실행 §3.2 「E2E 도 지금 단계를 알리고 끊는다」)
  app.post<{ Params: { trialId: string } }>('/scenario-trials/:trialId/abort', async (req, reply) => {
    const { trialId } = req.params;
    const 사람 = 누구(req);
    const 읽음 = 시나리오시험.읽는다(사람, trialId);
    if (읽음 === null) return 없음(reply, trialId);
    const 상태 = 읽음.status === 'RUNNING' ? 상태찾기(trialId) : undefined;
    if (상태 === undefined) return { aborted: false };
    // ponytail: 보낸 직후 러너가 그 번호를 받기 전(/health 확인 · 전송 — 2초 안쪽)이면 false 다. 케이스 시험 실행 중단도 같은 틈이 있다
    if (상태.보냄) return { aborted: await abortScenarioRunner({ scenarioTrialId: trialId }) };
    상태.멈춤 = true;
    return { aborted: 시나리오시험.닫는다(사람, trialId, 보내기전멈춘결과(상태.부품수)) };
  });

  // 도는 시험의 장면 한 장. 끝난 시험도 404 다 — 러너가 장면을 버렸다 (도메인/실행 §3.2 「테스트 모드」)
  app.get<{ Params: { trialId: string } }>('/scenario-trials/:trialId/live', async (req, reply) => {
    const { trialId } = req.params;
    if (시나리오시험.읽는다(누구(req), trialId)?.status !== 'RUNNING') return 없음(reply, trialId);
    return 장면을건넨다(reply, trialId);
  });

  app.get<{ Params: { trialId: string; seq: string } }>('/scenario-trials/:trialId/screenshots/:seq', async (req, reply) => {
    const { trialId } = req.params;
    // 경로를 UUID 와 정수로만 조립한다. 볼륨 밖으로 올라가는 경로가 애초에 만들어지지 않는다
    if (!uuid모양.test(trialId) || 시나리오시험.읽는다(누구(req), trialId) === null) return 없음(reply, trialId);
    const seq = 정수(req.params.seq);
    if (seq === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.seq });

    let png: Buffer;
    try {
      png = await 볼륨파일읽기(join(artifactsDir(), 'runs', 'trial', trialId, `${seq}.png`));
    } catch {
      return reply.code(404).send({ error: 'SCREENSHOT_NOT_FOUND', detail: req.url });
    }
    return reply.type('image/png').send(png);
  });
}
