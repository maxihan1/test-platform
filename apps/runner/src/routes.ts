// 러너 HTTP 계약(SPEC §5.2)의 라우트를 등록한다. 포트를 여는 일은 server.ts가 한다 —
// listen을 라우트와 같은 파일에 두면 테스트가 import하는 순간 포트가 열려 붙지 못한다

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { abort, execute, resolveSpecPath, testsDir } from './execute.js';

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

  app.post('/abort', async (request, reply) => {
    const parsed = abortRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    // 이미 끝났거나 모르는 historyId면 false다. 경합이지 고장이 아니므로 404로 만들지 않는다 (SPEC §5.2)
    return { aborted: abort(parsed.data.historyId) };
  });
}
