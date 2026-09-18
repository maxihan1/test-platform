// 리포팅 컨텍스트의 HTTP 라우트 (SPEC §7 Reporting)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import { readFile } from 'node:fs/promises';

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { generate, 형식표 } from './generate.js';
import { EvidenceBusyError, claim, findDocument } from './store.js';

const 증적본문 = z.object({
  // 형식은 셋뿐이다. 그 밖의 값은 400 — 만들 수 없는 형식으로 PENDING 행을 남기지 않는다 (SPEC §7)
  format: z.enum(['PDF', 'XLSX', 'HTML']),
});

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. 풀은 실제로 쓸 때 가져온다 (store.ts와 같은 방식)
async function 실행이있는가(runId: number): Promise<boolean> {
  const { pool } = await import('../db/index.js');
  const rows = await pool.query('SELECT 1 FROM test_run WHERE run_id = $1', [runId]);
  return rows.rowCount === 1;
}

function 정수(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default async function reportingRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { runId: string } }>('/runs/:runId/evidence', async (req, reply) => {
    const parsed = 증적본문.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    const runId = 정수(req.params.runId);
    if (runId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.runId });
    // claim 앞에서 막는다. 없는 실행을 그냥 넘기면 외래키 위반이 500으로 새어 나간다
    if (!(await 실행이있는가(runId))) {
      return reply.code(404).send({ error: 'RUN_NOT_FOUND', detail: req.params.runId });
    }

    try {
      const 문서 = await claim(runId, parsed.data.format);

      // 기다리지 않는다. 문서 한 부가 분 단위로 걸리면 응답이 그동안 열려 있게 된다 (SPEC §7).
      // generate()는 던지지 않고 스스로 FAILED로 닫으므로 여기에 잡을 것이 없다
      void generate(문서.id, runId, 문서.format);

      // runId는 싣지 않는다. GET /api/runs/:runId의 evidence와 같은 여섯 칸이어야
      // 화면이 두 응답을 한 모양으로 다룬다 (SPEC §7 · execution/queries.ts EvidenceSummary)
      return {
        id: 문서.id,
        format: 문서.format,
        status: 문서.status,
        filePath: 문서.filePath,
        error: 문서.error,
        generatedAt: 문서.generatedAt,
      };
    } catch (err) {
      // 같은 실행·같은 형식의 PENDING을 막는 것은 DB의 부분 유일 인덱스다 (SPEC §6)
      if (err instanceof EvidenceBusyError) {
        return reply.code(409).send({ error: 'EVIDENCE_BUSY', detail: err.message });
      }
      throw err;
    }
  });

  // 영구 주소다. 메신저나 컴플라이언스 도구에 붙여 둔 링크가 썩지 않아야 한다 (SPEC §7)
  app.get<{ Params: { id: string } }>('/evidence/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });

    const 문서 = await findDocument(id);
    if (문서 === null) return reply.code(404).send({ error: 'EVIDENCE_NOT_FOUND', detail: req.params.id });
    // PENDING·FAILED는 아직 파일이 없다. 404로 답하면 「없는 문서」와 「아직 안 된 문서」가 뭉개진다
    if (문서.status !== 'READY' || 문서.filePath === null) {
      return reply.code(409).send({ error: 'EVIDENCE_NOT_READY', detail: 문서.status });
    }

    let 파일: Buffer;
    try {
      파일 = await readFile(문서.filePath);
    } catch {
      // 내보낼 것을 손에 쥔 뒤에 형식을 정한다. 먼저 type()을 박으면 404 본문을 그 형식으로 쓰려다 500이 난다
      return reply.code(404).send({ error: 'EVIDENCE_FILE_NOT_FOUND', detail: req.params.id });
    }
    return reply.type(형식표[문서.format].mime).send(파일);
  });
}
