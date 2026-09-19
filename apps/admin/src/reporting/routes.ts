// 리포팅 컨텍스트의 HTTP 라우트 (SPEC §7 Reporting)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import { readFile } from 'node:fs/promises';

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { generate, 형식표 } from './generate.js';
import { EvidenceBusyError, claim, findDocument, recoverPending } from './store.js';

const 증적본문 = z.object({
  // 형식은 셋뿐이다. 그 밖의 값은 400 — 만들 수 없는 형식으로 PENDING 행을 남기지 않는다 (SPEC §7)
  format: z.enum(['PDF', 'XLSX', 'HTML']),
});

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. 풀은 실제로 쓸 때 가져온다 (store.ts와 같은 방식)
// 있는지와 어떤 상태인지를 한 번에 묻는다. 둘로 나누면 같은 행을 두 번 왕복한다
async function 실행상태(runId: number): Promise<string | null> {
  const { pool } = await import('../db/index.js');
  const rows = await pool.query<{ status: string }>('SELECT status FROM test_run WHERE run_id = $1', [runId]);
  return rows.rows[0]?.status ?? null;
}

function 정수(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default async function reportingRoutes(app: FastifyInstance): Promise<void> {
  // 재기동으로 만들던 작업이 사라지면 PENDING 행이 남아 부분 유일 인덱스가 그 형식을 영영 붙잡는다.
  // 뜨는 김에 한 번 닫는다. 실패해도 admin 은 떠야 하므로 사유만 남긴다 (SPEC §8.4)
  void recoverPending()
    .then((n) => {
      if (n > 0) app.log.warn(`[reporting] 재기동 전에 만들던 증적 ${String(n)}건을 실패로 닫았다`);
    })
    .catch((err: unknown) => {
      app.log.error(`[reporting] 재기동 복구가 깨졌다: ${err instanceof Error ? err.message : String(err)}`);
    });

  app.post<{ Params: { runId: string } }>('/runs/:runId/evidence', async (req, reply) => {
    const parsed = 증적본문.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    const runId = 정수(req.params.runId);
    if (runId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.runId });
    // claim 앞에서 막는다. 없는 실행을 그냥 넘기면 외래키 위반이 500으로 새어 나간다
    const 상태 = await 실행상태(runId);
    if (상태 === null) {
      return reply.code(404).send({ error: 'RUN_NOT_FOUND', detail: req.params.runId });
    }
    // 도는 중에 뽑으면 아직 안 끝난 항목이 빠진 문서가 나온다 — 증적 재현 불변식이 깨진다 (SPEC §3.3 · §7).
    // 화면도 같은 값으로 버튼을 잠그지만(web/runState.ts) 번들이 달라 그 코드를 가져다 쓸 수 없다.
    // 정본은 SPEC §7 이고 양쪽이 그것을 따로 따른다 — 판정 값이 'RUNNING' 하나뿐이라 공유 자리를 만들지 않았다.
    // 상태값이 셋 이상으로 늘면 그때 다시 본다.
    // 중단된 실행(ABORTED)은 막지 않는다. 막는 것은 아직 안 끝난 것뿐이다 (SPEC §8.4)
    if (상태 === 'RUNNING') {
      return reply.code(409).send({ error: 'RUN_NOT_FINISHED', detail: 상태 });
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
