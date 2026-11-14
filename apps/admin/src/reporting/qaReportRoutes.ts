// 애플리케이션 QA 리포트 읽기 통로 — 목록 · 한 버전 · 실행이 든 리포트 찾기 (도메인/리포팅 §7 「QA 리포트 통로」)
// 배정과 권한(실행 read)은 문(auth/gate.ts)이 이미 봤다. 여기서는 번호 · 질의 모양만 본다

import type { FastifyInstance, FastifyReply } from 'fastify';

import { 볼륨파일읽기 } from '../artifactFile.js';
import { 정수 } from '../routeParams.js';
import { PDF로, 심은절차들 } from './generate.js';
import { 문서재료읽기, 리포트읽기, type 문서재료 } from './qaReportDoc.js';
import { renderQaReportDocx } from './qaReportDocx.js';
import { renderQaReportHtml } from './qaReportHtml.js';

const 잘못 = (reply: FastifyReply, detail: string) => reply.code(400).send({ error: 'INVALID_REQUEST', detail });
const 없음 = (reply: FastifyReply) => reply.code(404).send({ error: 'NOT_FOUND' });
const 쪽크기 = 50;

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface 리포트행 {
  id: string;
  prefix: string | null;
  env: string;
  build_no: string | null;
  run_id: string | null;
  perf_run_id: string | null;
  version: number;
  summary: { kinds?: string[]; overview?: { running?: number } };
  approved_by: string | null;
  approved_name: string | null;
  approved_at: Date | null;
  updated_at: Date;
}

const 번호 = (v: string | null): number | null => (v === null ? null : Number(v));

const 형식들 = {
  PDF: { ext: 'pdf', mime: 'application/pdf', 펼침: 'inline' },
  HTML: { ext: 'html', mime: 'text/html; charset=utf-8', 펼침: 'inline' },
  DOCX: { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 펼침: 'attachment' },
} as const;

// 사진은 문서 안에 심는다(증적과 같다 — generate.ts). UI 구획은 실패 항목의 사진만 싣는다 (§3.17 결정 8 「UI = 화면별(실패만 사진)」)
export async function 사진심은(재료: 문서재료): Promise<문서재료> {
  const 항목 = await Promise.all(
    재료.항목.map(async (i) => {
      const 뺀다 = 재료.종류.get(i.tcId) === 'UI' && i.status !== 'FAIL';
      return { ...i, steps: 뺀다 ? i.steps.map((x) => ({ ...x, screenshotPath: null })) : await 심은절차들(i.steps) };
    }),
  );
  const 시나리오 = await Promise.all(
    재료.시나리오.map(async (doc) => ({
      ...doc,
      parts: await Promise.all(doc.parts.map(async (d) => (d.item === null ? d : { ...d, item: { ...d.item, steps: await 심은절차들(d.item.steps) } }))),
    })),
  );
  return { ...재료, 항목, 시나리오 };
}

export default async function qaReportRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: Record<string, unknown> }>('/qa-reports', async (req, reply) => {
    const { service, env, approved, page } = req.query;
    if (typeof service !== 'string' || service === '') return 잘못(reply, 'service 접두사가 필요합니다');
    if (env !== undefined && (typeof env !== 'string' || env === '')) return 잘못(reply, 'env 가 틀렸습니다');
    if (approved !== undefined && approved !== 'true' && approved !== 'false') return 잘못(reply, 'approved 는 true · false 중 하나입니다');
    const 쪽 = page === undefined ? 1 : typeof page === 'string' ? 정수(page) : null;
    if (쪽 === null) return 잘못(reply, 'page 번호가 틀렸습니다');
    const 승인 = approved === undefined ? null : approved === 'true';
    // 묶음마다 마지막 버전 한 줄. 차례는 마지막 실행이 끝난 시각(만든 때 굳힌 개요) 내림차순
    const 마지막SQL = `
      WITH 마지막 AS (
        SELECT DISTINCT ON (q.bundle_key) q.*, s.prefix FROM qa_report q JOIN service s ON s.id = q.service_id
         WHERE s.prefix = $1 AND ($2::text IS NULL OR q.env = $2) ORDER BY q.bundle_key, q.version DESC)
      SELECT * FROM 마지막 WHERE $3::boolean IS NULL OR (approved_at IS NOT NULL) = $3`;
    const pool = await db();
    const 값 = [service, env ?? null, 승인];
    const [r, 수] = await Promise.all([
      pool.query<리포트행>(`${마지막SQL} ORDER BY summary->'overview'->>'finishedAt' DESC, id DESC LIMIT ${쪽크기} OFFSET $4`, [...값, (쪽 - 1) * 쪽크기]),
      // 마지막 쪽을 넘긴 쪽도 전체 수는 맞아야 한다 — 쪽 안의 창 함수로 세면 0 이 된다
      pool.query<{ n: string }>(`SELECT count(*) AS n FROM (${마지막SQL}) x`, 값),
    ]);
    return {
      items: r.rows.map((q) => ({
        id: Number(q.id),
        service: q.prefix,
        env: q.env,
        buildNo: q.build_no,
        runId: 번호(q.run_id),
        perfRunId: 번호(q.perf_run_id),
        version: q.version,
        kinds: q.summary.kinds ?? [],
        running: q.summary.overview?.running ?? 0,
        approvedBy: q.approved_name ?? q.approved_by,
        approvedAt: q.approved_at?.toISOString() ?? null,
        updatedAt: q.updated_at.toISOString(),
      })),
      total: Number(수.rows[0]!.n),
    };
  });

  app.get<{ Params: { id: string } }>('/qa-reports/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, '리포트 번호가 틀렸습니다');
    const 읽음 = await 리포트읽기(await db(), id);
    return 읽음 === null ? 없음(reply) : 읽음.응답;
  });

  // 승인 전 버전은 받을 때마다 만든다. 승인한 버전의 PDF 는 굳힌 파일 그대로 — 다시 그리면 지문이 안 맞는다 (§3.17 결정 13)
  app.get<{ Params: { id: string }; Querystring: Record<string, unknown> }>('/qa-reports/:id/file', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, '리포트 번호가 틀렸습니다');
    const 형식 = req.query.format;
    // 엑셀은 이 통로가 아직 내지 않는다 — 진행판 QAR 줄 어디에도 안 실려 있다
    if (형식 !== 'PDF' && 형식 !== 'HTML' && 형식 !== 'DOCX') return 잘못(reply, 'format 은 PDF · HTML · DOCX 중 하나입니다');
    const pool = await db();
    const 읽음 = await 리포트읽기(pool, id);
    if (읽음 === null) return 없음(reply);
    const f = 형식들[형식];
    // 이름에는 번호 · 버전 · 형식만 넣는다 — ASCII 뿐이라 헤더가 깨지지 않는다(증적 이름과 같은 까닭 — routes.ts)
    const 보낸다 = (파일: Buffer | string) =>
      reply.type(f.mime).header('content-disposition', `${f.펼침}; filename="qa-report-${id}-v${읽음.응답.version}.${f.ext}"`).send(파일);

    if (형식 === 'PDF' && 읽음.pdfPath !== null) {
      try {
        return 보낸다(await 볼륨파일읽기(읽음.pdfPath));
      } catch (err) {
        // 다시 그려 내면 승인 지문과 다른 파일이 나간다 — 내지 않고 까닭을 남긴다
        throw new Error(`리포트 ${id} 의 승인 PDF 를 읽지 못했다: ${읽음.pdfPath}`, { cause: err });
      }
    }
    const 재료 = await 문서재료읽기(pool, 읽음);
    if (형식 === 'DOCX') return 보낸다(await renderQaReportDocx(재료));
    const html = renderQaReportHtml(await 사진심은(재료), 형식);
    return 보낸다(형식 === 'HTML' ? html : await PDF로(html));
  });

  // 한 건 실행은 붙은 실행으로 센다 — 그 실행이 든 리포트다. 빌드가 다른 한 건은 어느 묶음에도 안 든다 (§3.17 「묶음 · 버전」)
  app.get<{ Params: { runId: string } }>('/runs/:runId/qa-report', async (req, reply) => {
    const runId = 정수(req.params.runId);
    if (runId === null) return 잘못(reply, '실행 번호가 틀렸습니다');
    const r = await (await db()).query<{ id: string }>(
      `SELECT q.id FROM test_run t LEFT JOIN test_run a ON a.run_id = t.rerun_of
         JOIN qa_report q ON q.run_ids @> ARRAY[CASE WHEN t.origin <> 'SINGLE' THEN t.run_id
                                                     WHEN t.status <> 'RUNNING' AND t.build_no IS NOT DISTINCT FROM a.build_no THEN t.rerun_of END]
        WHERE t.run_id = $1 ORDER BY q.version DESC LIMIT 1`,
      [runId],
    );
    return r.rows[0] === undefined ? 없음(reply) : { id: Number(r.rows[0].id) };
  });

  app.get<{ Params: { id: string } }>('/perf/runs/:id/qa-report', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, '실행 번호가 틀렸습니다');
    const r = await (await db()).query<{ id: string }>('SELECT id FROM qa_report WHERE perf_run_ids @> ARRAY[$1::bigint] ORDER BY version DESC LIMIT 1', [id]);
    return r.rows[0] === undefined ? 없음(reply) : { id: Number(r.rows[0].id) };
  });
}
