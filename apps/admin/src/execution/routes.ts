// 실행 컨텍스트의 HTTP 라우트 (SPEC §7 Execution)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { dispatch } from './dispatcher.js';
import { caseSchemas, createParamSet, deleteParamSet, listParamSets } from './paramSets.js';
import { caseHistory, lastByCase } from './history.js';
import { findItem, findRun, listRuns } from './queries.js';
import { createRun, RunInputError } from './store.js';
import { validate } from './validate.js';

const PAGE_SIZE = 50;

const paramSetBody = z.object({
  name: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
  expected: z.record(z.string(), z.unknown()).default({}),
});

const runBody = z.object({
  title: z.string().min(1),
  // test_run.triggered_by는 NOT NULL이다. 화면이 안 적어 보내면 admin이 눌렀다고 남긴다
  triggeredBy: z.string().min(1).default('admin'),
  // 대상 서버 키. 기본값을 두지 않는다 — 안 고르면 빈 칸이 아니라 틀린 값이 증적에 남는다 (SPEC §6).
  // 주소는 요청이 싣지 않는다. 서버가 그 서비스의 service_env에서 찾는다
  env: z.string().min(1),
  // 요청 최상위에 하나다. 항목마다 다르면 실행 항목 수를 미리 셀 수 없다 (SPEC §8.2)
  repeat: z.number().int().positive().default(1),
  items: z
    .array(
      z.object({
        tcId: z.string().min(1),
        platforms: z.array(z.enum(['desktop', 'mobile'])).min(1),
        params: z.record(z.string(), z.unknown()).default({}),
        expected: z.record(z.string(), z.unknown()).default({}),
        // SPEC §10의 DEMO-007은 5초로 줘야 러너의 타임아웃 처리를 확인할 수 있다
        timeoutMs: z.number().int().positive().optional(),
      }),
    )
    .min(1),
});

// 러너와 어드민이 같은 볼륨을 본다. 경로 규칙은 artifacts/runs/{runId}/{historyId}/{seq}.png (SPEC §9)
function artifactsDir(): string {
  return process.env.PLATFORM_ARTIFACTS_DIR ?? resolve(process.cwd(), 'artifacts');
}

function page(raw: string | undefined): number {
  return Math.max(1, Number(raw ?? 1) || 1);
}

export default async function executionRoutes(app: FastifyInstance): Promise<void> {
  app.post('/runs', async (req, reply) => {
    const parsed = runBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    try {
      const { runId, items } = await createRun(parsed.data);
      // 기다리지 않는다. 케이스 하나가 5분이면 응답이 5분 동안 열려 있게 된다 (SPEC §7)
      void dispatch(runId, items).catch((err: unknown) => {
        app.log.error(`[execution] 실행 ${runId} 분배가 깨졌다: ${err instanceof Error ? err.message : String(err)}`);
      });
      return { runId };
    } catch (err) {
      if (err instanceof RunInputError) {
        // 배정받지 않은 서비스는 403이다. 404로 감추지 않는다 (SPEC §3.5)
        const code = err.code === 'CASE_NOT_FOUND' ? 404 : err.code === 'SERVICE_FORBIDDEN' ? 403 : 400;
        // 상한을 넘겼을 때는 화면이 숫자를 그대로 보여줄 수 있게 상한과 요청 건수를 같이 싣는다 (SPEC §8.2)
        if (err.detail !== undefined) {
          return reply.code(code).send({ error: err.code, ...err.detail });
        }
        return reply.code(code).send({ error: err.code, detail: err.message });
      }
      throw err;
    }
  });

  app.get<{ Querystring: { page?: string } }>('/runs', async (req) => listRuns(page(req.query.page), PAGE_SIZE));

  // 목록 화면이 케이스마다 이력을 따로 부르지 않게 한 번에 준다 (SPEC §8.1, WS-A 검사 기록 '기타 2')
  app.get('/runs/last-by-case', async () => ({ items: await lastByCase() }));

  app.get<{ Params: { runId: string } }>('/runs/:runId', async (req, reply) => {
    const found = await findRun(Number(req.params.runId));
    if (found === null) return reply.code(404).send({ error: 'RUN_NOT_FOUND', detail: req.params.runId });
    return found;
  });

  app.get<{ Params: { runId: string; historyId: string } }>('/runs/:runId/items/:historyId', async (req, reply) => {
    const found = await findItem(Number(req.params.runId), Number(req.params.historyId));
    if (found === null) return reply.code(404).send({ error: 'RUN_ITEM_NOT_FOUND', detail: req.params.historyId });
    return found;
  });

  app.get<{ Params: { tcId: string }; Querystring: { platform?: string; page?: string } }>(
    '/cases/:tcId/history',
    async (req) => caseHistory(req.params.tcId, req.query.platform, page(req.query.page), PAGE_SIZE),
  );

  app.get<{ Params: { runId: string; historyId: string; seq: string } }>(
    '/screenshots/:runId/:historyId/:seq.png',
    async (req, reply) => {
      const parts = [req.params.runId, req.params.historyId, req.params.seq].map(Number);
      // 경로를 정수로만 조립한다. 볼륨 밖으로 올라가는 경로가 애초에 만들어지지 않는다
      if (parts.some((n) => !Number.isInteger(n) || n < 0)) {
        return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.url });
      }

      const file = join(artifactsDir(), 'runs', String(parts[0]), String(parts[1]), `${parts[2]}.png`);
      let png: Buffer;
      try {
        png = await readFile(file);
      } catch {
        // 내보낼 것을 손에 쥔 뒤에 형식을 정한다. 먼저 image/png로 박아 두면 404 본문을 png로 쓰려다 500이 난다
        return reply.code(404).send({ error: 'SCREENSHOT_NOT_FOUND', detail: req.url });
      }
      return reply.type('image/png').send(png);
    },
  );

  app.get<{ Params: { tcId: string } }>('/cases/:tcId/param-sets', async (req) => ({
    items: await listParamSets(req.params.tcId),
  }));

  app.post<{ Params: { tcId: string } }>('/cases/:tcId/param-sets', async (req, reply) => {
    const parsed = paramSetBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    const { tcId } = req.params;
    const schemas = await caseSchemas(tcId);
    if (schemas === null) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: tcId });

    // 저장 전에 명세로 검증한다. 값이 어긋난 채 저장되면 실행할 때가 아니라 몇 주 뒤에 터진다
    const violations = [
      ...validate(schemas.paramSchema, parsed.data.params),
      ...validate(schemas.expectedSchema, parsed.data.expected),
    ];
    if (violations.length > 0) {
      return reply.code(400).send({ error: 'INVALID_PARAMS', detail: violations[0]!.message, violations });
    }

    const saved = await createParamSet(tcId, parsed.data.name, parsed.data.params, parsed.data.expected);
    if (saved === null) {
      return reply.code(409).send({ error: 'DUPLICATE_NAME', detail: `${tcId}에 '${parsed.data.name}'이 이미 있다` });
    }
    return saved;
  });

  app.delete<{ Params: { id: string } }>('/param-sets/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    if (!(await deleteParamSet(id))) return reply.code(404).send({ error: 'PARAM_SET_NOT_FOUND', detail: req.params.id });
    return reply.code(204).send();
  });
}
