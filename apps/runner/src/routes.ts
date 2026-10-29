// 러너 HTTP 계약(SPEC §5.2)의 라우트를 등록한다. 포트를 여는 일은 server.ts가 한다 —
// listen을 라우트와 같은 파일에 두면 테스트가 import하는 순간 포트가 열려 붙지 못한다

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { FastifyInstance } from 'fastify';

import { 앱화면을읽는다, 화면을읽는중인가 } from './appScreen.js';
import { 게임화면을읽는다 } from './gameScreen.js';
import { abort, execute, resolveSpecPath, running, testsDir } from './execute.js';
import { 팜증적받기를줄세운다 } from './farmEvidence.js';
import { registerPerfDeviceRoutes } from './perfDevice.js';
import { registerRemote } from './remote.js';
import { executeScenario, 판뺀부품들, 폰단계가있나, 폰시나리오가도는가 } from './scenario.js';
import { 폰값이없다 } from './scenarioGate.js';
import { abortRequest, appScreenRequest, executeRequest, scenarioRequest, 목록상한, 판상한 } from './schema.js';

const require = createRequire(import.meta.url);
// 이미지 태그와 라이브러리 버전이 어긋나면 브라우저를 못 찾는다. /health가 그 확인 창구다 (SPEC §9)
const { version: playwrightVersion } = require('@playwright/test/package.json') as { version: string };

export function registerRoutes(app: FastifyInstance): void {
  // 토큰 검사를 맨 먼저 건다 — 뒤에 붙는 통로가 모두 그 아래다
  registerRemote(app);

  app.get('/health', async () => ({ ok: true, playwrightVersion }));

  registerPerfDeviceRoutes(app);

  app.post('/execute', 판상한, async (request, reply) => {
    const parsed = executeRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    const req = parsed.data;
    const specPath = resolveSpecPath(testsDir, req.filePath);
    if (specPath === null || !existsSync(specPath)) {
      return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: req.filePath });
    }

    try {
      const res = await execute(req, specPath);
      // 큰 영상을 받느라 답이 늦으면 admin 의 디바이스 줄이 막힌다. 답한 뒤에 받는다 (SPEC 도메인/러너 §5.2 「디바이스 팜 접속 방식」)
      if (req.platform === 'android') 팜증적받기를줄세운다(req.runId, req.historyId, res.status, req.farmToken);
      return res;
    } catch (err) {
      // 자식 프로세스를 띄우지도 못한 경우다. 케이스 실패가 아니라 러너 고장이므로 500이다 (SPEC §5.2)
      const detail = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: 'RUNNER_ERROR', detail });
    }
  });

  // 작성 AI 가 앱 · 게임 케이스를 쓰려고 폰 화면을 읽는다. 돌고 있는 앱 항목이 있으면 폰을 가로채니 막는다 —
  // 브라우저 항목은 폰을 안 쓴다. 서버 러너가 팜 폰을 읽게 된 뒤로 웹 실행 중에도 읽혀야 한다 (SPEC 도메인/러너 §5.2 「앱 화면 읽기」 · 「게임 화면 읽기」)
  for (const [길, 읽기] of [['/app-screen', 앱화면을읽는다], ['/game-screen', 게임화면을읽는다]] as const) {
    app.post(길, async (request, reply) => {
      const parsed = appScreenRequest.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
      }
      if ([...running.values()].some((r) => r.platform === 'android') || 폰시나리오가도는가() || 화면을읽는중인가()) {
        return reply.code(409).send({ error: 'RUNNER_BUSY', detail: '이 러너가 이미 실행이나 화면 읽기를 하고 있다' });
      }
      try {
        return { screen: await 읽기(parsed.data) };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return reply.code(500).send({ error: 'RUNNER_ERROR', detail });
      }
    });
  }

  // 시나리오 1개 = 프로세스 1개. 진행 알림과 중단 통로는 없다 — 제한 시간이 상한이다 (SPEC 도메인/러너 §5.2)
  app.post('/execute-scenario', 판상한, async (request, reply) => {
    const parsed = scenarioRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    const 폰값 = 폰값이없다(parsed.data, process.env);
    if (폰값 !== undefined) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 폰값 });

    // 케이스 부품도 /execute 와 같은 경로 검사를 지난다. 자식의 작업 폴더가 달라 절대 경로로 풀어 넘긴다
    const parts = [];
    for (const part of parsed.data.parts) {
      if (part.kind !== 'case') {
        parts.push(part);
        continue;
      }
      const specPath = resolveSpecPath(testsDir, part.filePath);
      if (specPath === null) {
        return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `테스트 뿌리 밖이다: ${part.filePath}` });
      }
      if (!existsSync(specPath)) {
        return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: part.filePath });
      }
      parts.push({ ...part, filePath: specPath });
    }
    if (Buffer.byteLength(JSON.stringify(판뺀부품들({ ...parsed.data, parts }).parts)) > 목록상한) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `단계 목록이 ${목록상한}바이트를 넘는다` });
    }

    try {
      const req = { ...parsed.data, parts };
      const res = await executeScenario(req);
      // 통과 못 한 정식 실행의 팜 영상 · logcat 은 답한 뒤에 받는다 — 시나리오에 한 벌, 시나리오 폴더에 둔다 (SPEC 도메인/시나리오 §3.7 결정 16 「결과」)
      if (req.runId !== null && 폰단계가있나(req)) 팜증적받기를줄세운다(req.runId, 'scenario', res.status, req.farmToken);
      return res;
    } catch (err) {
      // 자식 프로세스를 띄우지도 못한 경우다. 러너 고장이므로 500이다 (SPEC §5.2)
      const detail = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: 'RUNNER_ERROR', detail });
    }
  });

  // 경과를 여기서 그때그때 재서 낸다. 시작 시각을 보내면 화면 기계의 시계와 어긋난 만큼이
  // 그대로 오차가 된다 — 러너는 컨테이너 안이다 (SPEC §5.2)
  // **historyId 는 지도의 열쇠를 쓴다.** progress.step 안의 값은 자식이 stdout 에 스스로 적은 것이라
  // 케이스 코드가 남의 번호를 찍으면 그 절차 제목이 남의 실행 화면에 뜬다 — admin 의 거르기는
  // 「이 실행의 항목인가」만 보므로 그대로 통과한다. 러너는 진짜 값을 이미 알고 있다 (execute() 가 건 열쇠다)
  app.get('/progress', async () => ({
    items: [...running.entries()].flatMap(([historyId, { progress }]) =>
      progress === undefined
        ? []
        : [{ ...progress.step, historyId, elapsedMs: Date.now() - progress.시작한때 }],
    ),
  }));

  app.post('/abort', async (request, reply) => {
    const parsed = abortRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    // 이미 끝났거나 모르는 historyId면 false다. 경합이지 고장이 아니므로 404로 만들지 않는다 (SPEC §5.2)
    return { aborted: abort(parsed.data.historyId) };
  });
}
