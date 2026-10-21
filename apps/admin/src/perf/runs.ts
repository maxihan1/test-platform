// 성능 실행 통로 — 서버 부하 실행 만들기 · 목록 · 결과 · 1초 숫자 · 서버 모니터링 · 실행 로그 · 중단 · PDF (도메인/성능 §7 「실행」)

import type { FastifyInstance, FastifyReply } from 'fastify';

import { 정수 } from '../routeParams.js';
import { 분석일세우기, 숫자있나 } from './analysis.js';
import { 중단하기, 한번돌기 } from './engine.js';
import { percentile } from './hist.js';
import { 결과HTML, PDF찍기, 실행번호글 } from './pdf.js';
import { 실행세우기, 실행만들기본문 } from './runCreate.js';
import { 실행보기 } from './runView.js';
import * as 표 from './store.js';

type 번호경로 = { Params: { id: string }; Querystring: { from?: string } };

function 번호(raw: string, reply: FastifyReply): number | null {
  const id = 정수(raw);
  if (id === null) void reply.code(400).send({ error: 'INVALID_REQUEST', detail: raw });
  return id;
}

const 바 = (reply: FastifyReply, code: number, error: string, detail?: string) => reply.code(code).send(detail === undefined ? { error } : { error, detail });

export default async function perfRunRoutes(app: FastifyInstance): Promise<void> {
  app.post('/perf/runs', async (req, reply) => {
    const p = 실행만들기본문.safeParse(req.body);
    if (!p.success) return 바(reply, 400, 'INVALID_REQUEST', p.error.message);
    const r = await 실행세우기(p.data, { origin: 'MANUAL', triggeredBy: req.user?.username ?? null, triggeredByName: req.user?.displayName ?? null });
    if ('error' in r) return 바(reply, r.status, r.error, r.detail);
    void 한번돌기().catch((e: unknown) => req.log.error(e, '성능 실행 살피기 실패'));
    return reply.code(201).send({ runId: r.runId });
  });

  app.get<{ Querystring: { serviceId?: string; kind?: string; scenarioId?: string } }>('/perf/runs', async (req, reply) => {
    const serviceId = 정수(req.query.serviceId ?? '');
    const scenarioId = req.query.scenarioId === undefined ? null : 정수(req.query.scenarioId);
    if (serviceId === null || (req.query.scenarioId !== undefined && scenarioId === null)) return 바(reply, 400, 'INVALID_REQUEST', 'serviceId');
    const r = await (await 표.풀()).query(
      `SELECT r.id, r.kind, r.status, r.verdict, COALESCE(s.name, '') AS title, r.env, r.test_type AS "testType", r.origin, r.degraded, r.stop_reason AS "stopReason", r.started_at AS "startedAt",
              CASE WHEN r.started_at IS NULL THEN NULL ELSE EXTRACT(EPOCH FROM COALESCE(r.finished_at, now()) - r.started_at)::int END AS "durationSec",
              json_build_object('peakVus', r.peak_vus, 'maxTps', r.max_tps, 'p95Ms', r.p95_ms, 'errorRate', r.error_rate) AS summary
         FROM perf_run r LEFT JOIN perf_scenario s ON s.id = r.scenario_id
        WHERE r.service_id = $1 AND ($2::text IS NULL OR r.kind = $2) AND ($3::bigint IS NULL OR r.scenario_id = $3)
        ORDER BY r.id DESC LIMIT 200`,
      [serviceId, req.query.kind ?? null, scenarioId],
    );
    return { runs: r.rows.map((x: { id: string }) => ({ ...x, id: Number(x.id) })) };
  });

  app.get<번호경로>('/perf/runs/:id', async (req, reply) => {
    const id = 번호(req.params.id, reply);
    if (id === null) return reply;
    const pool = await 표.풀();
    const r = await pool.query(
      `SELECT r.id, r.kind, r.status, r.verdict, r.stop_reason AS "stopReason", r.config, r.targets, r.degraded, r.ai, r.env, r.test_type AS "testType",
              r.scenario_id AS "scenarioId", svc.prefix AS "servicePrefix", r.created_at AS "createdAt", r.started_at AS "startedAt", r.finished_at AS "finishedAt", r.origin, COALESCE(s.name, '') AS "scenarioName",
              json_build_object('peakVus', r.peak_vus, 'maxTps', r.max_tps, 'p95Ms', r.p95_ms, 'errorRate', r.error_rate) AS summary
         FROM perf_run r JOIN service svc ON svc.id = r.service_id LEFT JOIN perf_scenario s ON s.id = r.scenario_id WHERE r.id = $1`,
      [id],
    );
    const run = r.rows[0] as Record<string, unknown> | undefined;
    if (run === undefined) return 바(reply, 404, 'NOT_FOUND');
    const 행 = await 표.실행하나(id);
    const prevId = 행 === null || 행.scenarioId === null ? null : await 표.이전실행(행);
    const prev = prevId === null ? null : (await pool.query(
      `SELECT id, verdict, peak_vus AS "peakVus", max_tps AS "maxTps", p95_ms AS "p95Ms", error_rate AS "errorRate", created_at AS "createdAt" FROM perf_run WHERE id = $1`,
      [prevId],
    )).rows[0];
    const 보기 = 행 === null ? null : await 실행보기(행, String(run.status), (run.stopReason as string | null) ?? null);
    return { ...run, ...보기, id, code: 실행번호글(id), previous: prev == null ? null : { ...prev, id: Number((prev as { id: string }).id) } };
  });

  app.get<번호경로>('/perf/runs/:id/series', async (req, reply) => {
    const id = 번호(req.params.id, reply);
    if (id === null) return reply;
    const from = 정수(req.query.from ?? '0') ?? 0;
    const rows = await 표.초읽기(id, from);
    return { series: rows.map((x) => ({ sec: x.sec, tx: x.tx, vus: x.vus, requests: x.requests, errors: x.errors, p95Ms: percentile(x.hist, 0.95), p99Ms: percentile(x.hist, 0.99) })) };
  });

  app.get<번호경로>('/perf/runs/:id/hosts', async (req, reply) => {
    const id = 번호(req.params.id, reply);
    if (id === null) return reply;
    const r = await (await 표.풀()).query(
      `SELECT agent_id AS "agentId", agent_name AS "agentName", sec, cpu::float, mem::float, disk_io_kbps AS "diskIoKbps", net_in_kbps AS "netInKbps", net_out_kbps AS "netOutKbps"
         FROM perf_host_metric WHERE run_id = $1 AND sec >= $2 ORDER BY sec, agent_id`,
      [id, 정수(req.query.from ?? '0') ?? 0],
    );
    return { hosts: r.rows.map((x: { agentId: string }) => ({ ...x, agentId: Number(x.agentId) })) };
  });

  app.get<번호경로>('/perf/runs/:id/events', async (req, reply) => {
    const id = 번호(req.params.id, reply);
    if (id === null) return reply;
    const r = await (await 표.풀()).query('SELECT at, level, message FROM perf_event WHERE run_id = $1 ORDER BY id', [id]);
    return { events: r.rows };
  });

  app.post<번호경로>('/perf/runs/:id/stop', async (req, reply) => {
    const id = 번호(req.params.id, reply);
    if (id === null) return reply;
    if ((await 표.실행하나(id)) === null) return 바(reply, 404, 'NOT_FOUND');
    if ((await 중단하기(id)) === 'NOT_RUNNING') return 바(reply, 409, 'NOT_RUNNING');
    return reply.code(202).send();
  });

  app.post<번호경로>('/perf/runs/:id/analysis', async (req, reply) => {
    const id = 번호(req.params.id, reply);
    if (id === null) return reply;
    const 행 = await 표.실행하나(id);
    if (행 === null) return 바(reply, 404, 'NOT_FOUND');
    if (['QUEUED', 'SMOKE', 'RUNNING'].includes(행.status)) return 바(reply, 409, 'NOT_FINISHED');
    if (!(await 숫자있나(id))) return 바(reply, 409, 'NO_DATA');
    const jobId = await 분석일세우기(id, req.user?.username ?? '');
    return jobId === null ? 바(reply, 404, 'NOT_FOUND') : reply.code(202).send({ jobId });
  });

  app.get<번호경로>('/perf/runs/:id/report.pdf', async (req, reply) => {
    const id = 번호(req.params.id, reply);
    if (id === null) return reply;
    const r = await (await 표.풀()).query<{ kind: string; status: string; verdict: 'PASS' | 'FAIL' | null; stop_reason: string | null; env: string; test_type: string | null; started_at: Date | null; peak_vus: number | null; ai: { title: string; items: string[] } | null; targets: never; title: string | null }>(
      `SELECT r.kind, r.status, r.verdict, r.stop_reason, r.env, r.test_type, r.started_at, r.peak_vus, r.ai, r.targets, s.name AS title
         FROM perf_run r LEFT JOIN perf_scenario s ON s.id = r.scenario_id WHERE r.id = $1`,
      [id],
    );
    const x = r.rows[0];
    if (x === undefined) return 바(reply, 404, 'NOT_FOUND');
    // 페이지 단독 측정에는 PDF 를 붙이지 않는다 (PERF-F1-07 시작 질문)
    if (x.kind === 'PAGE') return 바(reply, 400, 'INVALID_REQUEST', '페이지 성능 측정에는 PDF 가 없습니다');
    if (['QUEUED', 'SMOKE', 'RUNNING'].includes(x.status)) return 바(reply, 409, 'NOT_FINISHED');
    const html = 결과HTML({
      id, title: x.title ?? '', env: x.env, testType: x.test_type, status: x.status, verdict: x.verdict, stopReason: x.stop_reason,
      startedAt: x.started_at, peakVus: x.peak_vus, ai: x.ai, targets: x.targets, rows: await 표.초읽기(id, 0, 2 ** 31 - 1, ['']), txs: await 표.트랜잭션합계(id),
    });
    const pdf = await PDF찍기(html);
    return reply.header('content-type', 'application/pdf').header('content-disposition', `attachment; filename="${실행번호글(id)}.pdf"`).send(pdf);
  });
}
