// 실행 컨텍스트의 HTTP 라우트 (SPEC §7 Execution)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { caseSchemas, createParamSet, deleteParamSet, listParamSets } from './paramSets.js';
import { validate } from './validate.js';

const paramSetBody = z.object({
  name: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
  expected: z.record(z.string(), z.unknown()).default({}),
});

export default async function executionRoutes(app: FastifyInstance): Promise<void> {
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
