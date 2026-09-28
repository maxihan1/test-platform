// 러너 HTTP 계약(SPEC §5.2)의 라우트를 등록한다. 포트를 여는 일은 server.ts가 한다 —
// listen을 라우트와 같은 파일에 두면 테스트가 import하는 순간 포트가 열려 붙지 못한다

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { abort, execute, resolveSpecPath, running, testsDir } from './execute.js';
import { executeScenario } from './scenario.js';

const require = createRequire(import.meta.url);
// 이미지 태그와 라이브러리 버전이 어긋나면 브라우저를 못 찾는다. /health가 그 확인 창구다 (SPEC §9)
const { version: playwrightVersion } = require('@playwright/test/package.json') as { version: string };

const executeRequest = z.object({
  runId: z.number(),
  historyId: z.number(),
  tcId: z.string(),
  platform: z.enum(['desktop', 'mobile']),
  filePath: z.string(),
  baseUrl: z.string(),
  params: z.record(z.string(), z.unknown()),
  expected: z.record(z.string(), z.unknown()),
  timeoutMs: z.number().int().positive().default(300_000),
});

// E2E 시나리오 조립 목록. 부품 종류와 대기 상한의 정본은 SPEC 도메인/시나리오 §3.7 「부품」 표다 — 여기는 그것을 옮긴 것이다
const scenarioPart = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('case'),
    tcId: z.string().min(1),
    params: z.record(z.string(), z.unknown()),
    expected: z.record(z.string(), z.unknown()),
    skipSteps: z.array(z.string()),
    filePath: z.string().min(1),
  }),
  z.object({
    kind: z.literal('api'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    // `//host` 는 / 로 시작해도 다른 호스트로 풀린다. 대상 주소 밖으로 못 나가게 여기서 막는다
    path: z.string().startsWith('/').refine((p) => !p.startsWith('//'), '경로가 // 로 시작한다'),
    body: z.unknown().optional(),
    expectStatus: z.number().int(),
  }),
  z.object({
    kind: z.literal('mock'),
    urlPattern: z.string().min(1),
    status: z.number().int(),
    contentType: z.string(),
    body: z.string(),
  }),
  z.object({ kind: z.literal('unmock'), urlPattern: z.string().min(1) }),
  z.object({ kind: z.literal('wait'), ms: z.number().int().positive().max(60_000) }),
]);

// 조립 목록은 환경변수 하나로 넘긴다. 리눅스는 값 하나를 128KiB 로 자른다 — 넘으면 자식을 못 띄워 500 이 된다
const 목록상한 = 100_000;

const scenarioRequest = z
  .object({
    runId: z.number().nullable(),
    // 사진 폴더 경로(runs/trial/<trialId>/)에 그대로 들어간다. UUID 가 아니면 ../ 로 빠져나갈 수 있다
    trialId: z.string().uuid().optional(),
    platform: z.enum(['desktop', 'mobile']),
    baseUrl: z.string(),
    parts: z.array(scenarioPart).min(1),
    timeoutMs: z.number().int().positive(),
  })
  .refine((r) => r.runId !== null || r.trialId !== undefined, '시험 실행에는 trialId 가 있어야 한다')
  .refine((r) => JSON.stringify(r.parts).length <= 목록상한, `조립 목록이 ${목록상한}자를 넘는다`);

// 실행 묶음 전체를 끊는 일은 admin이 자기가 아는 historyId를 하나씩 부르는 것으로 한다.
// runId 단위 중단을 여기 두면 러너가 실행 묶음을 알아야 한다 (SPEC §5.2)
const abortRequest = z.object({ historyId: z.number() });

export function registerRoutes(app: FastifyInstance): void {
  app.get('/health', async () => ({ ok: true, playwrightVersion }));

  app.post('/execute', async (request, reply) => {
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
      return await execute(req, specPath);
    } catch (err) {
      // 자식 프로세스를 띄우지도 못한 경우다. 케이스 실패가 아니라 러너 고장이므로 500이다 (SPEC §5.2)
      const detail = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: 'RUNNER_ERROR', detail });
    }
  });

  // 시나리오 1개 = 프로세스 1개. 진행 알림과 중단 통로는 없다 — 제한 시간이 상한이다 (SPEC 도메인/러너 §5.2)
  app.post('/execute-scenario', async (request, reply) => {
    const parsed = scenarioRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

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

    try {
      return await executeScenario({ ...parsed.data, parts });
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
