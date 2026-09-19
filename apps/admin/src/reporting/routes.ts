// 리포팅 컨텍스트의 HTTP 라우트 (SPEC §7 Reporting)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import { readFile } from 'node:fs/promises';

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 정수 } from '../routeParams.js';
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
    // 이름에는 실행 번호와 형식만 넣는다. 케이스명·실행 제목·실행자는 넣지 않는다 —
    // 비밀값 칸을 ********로 가려 놓고(SPEC §4.1) 같은 값을 파일 이름으로 흘리면 그 가림이 무의미해진다.
    // 그래서 남는 글자가 ASCII뿐이고 헤더가 깨질 일이 없다. 한글이나 공백을 넣고 싶어지면
    // 그때는 이름을 바꾸기 전에 RFC 5987 인코딩부터 붙여야 한다.
    // attachment가 아닌 이유는 PDF·HTML이 새 창에서 열려야 하기 때문이다 (SPEC §8.4).
    // 엑셀은 브라우저가 못 여는 형식이라 inline이어도 이 이름 그대로 내려받아진다.
    //
    // **HTML 은 새 창에서 열리는 것이 곧 실행되는 것이다.** admin 과 같은 출처라 세션 쿠키가 붙고
    // 이 앱에는 CSP 가 없다. 지금 안전한 근거는 오직 html.ts 의 안전() 이 문서에 실리는 사람 글
    // (실행 제목·케이스명·검증 문장·미실행 사유)을 **하나도 빠짐없이** 가리기 때문이다.
    // 그 한 곳이라도 빠지는 날 이 줄이 관리 화면 권한으로 가는 길이 된다.
    // **2026-09-20 에 그 맞바꿈을 알고 inline 을 유지하기로 정했다** — 한 번 클릭으로 보는 편의를 택했다.
    // 뒤집을 조건은 「안전() 을 안 거치는 값이 문서에 실리는 것」 하나다. 그때는 HTML 만 attachment 로 내린다
    const 이름 = `evidence-run-${String(문서.runId)}.${형식표[문서.format].ext}`;
    return reply.type(형식표[문서.format].mime).header('content-disposition', `inline; filename="${이름}"`).send(파일);
  });
}
