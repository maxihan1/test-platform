// 성능 실행 통로 — 서버 부하 실행 만들기 · 목록 · 결과 · 1초 숫자 · 서버 모니터링 · 실행 로그 · 중단 · PDF (도메인/성능 §7 「실행」)

import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { 대상줄읽기 } from '../authoring/reverse.js';
import { 정수 } from '../routeParams.js';
import { 중단하기, 한번돌기 } from './engine.js';
import { totalDuration } from './generator.js';
import { percentile } from './hist.js';
import { 결과HTML, PDF찍기, 실행번호글 } from './pdf.js';
import { API서버호스트, 계정줄들, 단계, 목표, 허용밖, 호스트 } from './scenarios.js';
import * as 표 from './store.js';
import type { RunConfig, ScenarioBody } from './types.js';

// 한 실행은 24시간까지다 (§3.9 「상한」)
const 최대실행초 = 86_400;

const 실행만들기 = z.object({
  scenarioId: z.number().int().positive(),
  env: z.string().min(1).max(100),
  testType: z.enum(['LOAD', 'STRESS', 'SPIKE', 'SOAK']),
  basis: z.enum(['VUS', 'TPS']).default('VUS'),
  stages: z.array(단계).min(1).max(50),
  targets: z.array(목표).max(50),
  agentIds: z.array(z.number().int().positive()).min(1).max(20),
  monitorIds: z.array(z.number().int().positive()).max(20).default([]),
  pageCheck: z.boolean().default(false),
});

type 번호경로 = { Params: { id: string }; Querystring: { from?: string } };

function 번호(raw: string, reply: FastifyReply): number | null {
  const id = 정수(raw);
  if (id === null) void reply.code(400).send({ error: 'INVALID_REQUEST', detail: raw });
  return id;
}

const 바 = (reply: FastifyReply, code: number, error: string, detail?: string) => reply.code(code).send(detail === undefined ? { error } : { error, detail });

export default async function perfRunRoutes(app: FastifyInstance): Promise<void> {
  app.post('/perf/runs', async (req, reply) => {
    const p = 실행만들기.safeParse(req.body);
    if (!p.success) return 바(reply, 400, 'INVALID_REQUEST', p.error.message);
    const b = p.data;
    if (new Set(b.agentIds).size !== b.agentIds.length || new Set(b.monitorIds).size !== b.monitorIds.length) return 바(reply, 400, 'INVALID_REQUEST', '에이전트가 겹칩니다');
    const pool = await 표.풀();
    const s = await pool.query<{ service_id: string; version: number; accounts_csv: string | null; body: ScenarioBody }>(
      `SELECT s.service_id, s.version, s.accounts_csv, v.body FROM perf_scenario s
         JOIN perf_scenario_version v ON v.scenario_id = s.id AND v.version = s.version WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [b.scenarioId],
    );
    const sc = s.rows[0];
    if (sc === undefined) return 바(reply, 404, 'NOT_FOUND');
    const serviceId = Number(sc.service_id);
    // 더미 클라이언트 띄우기는 PERF-F1-10, 부하 중 페이지 측정(브라우저)은 PERF-F1-07 에서 생긴다
    if (sc.body.dummyClient !== undefined) return 바(reply, 400, 'INVALID_REQUEST', '더미 클라이언트 시나리오는 아직 실행하지 못합니다');
    if (b.pageCheck) return 바(reply, 400, 'INVALID_REQUEST', '부하 중 페이지 로딩 측정은 아직 켜지 못합니다');

    const 줄 = await 대상줄읽기(serviceId, b.env);
    if (줄 === null) return 바(reply, 400, 'INVALID_REQUEST', '대상 서버가 없습니다');
    if (줄.isProd) return 바(reply, 400, 'PROD_ENV_BLOCKED');
    const api = await API서버호스트(serviceId);
    const 대상호스트 = 호스트(줄.baseUrl);
    if (대상호스트 === null) return 바(reply, 400, 'INVALID_REQUEST', '대상 서버 주소가 틀렸습니다');
    const allowedHosts = [...new Set([대상호스트, ...(api?.hosts ?? [])])];
    const 밖 = 허용밖(sc.body.transactions ?? [], new Set(allowedHosts));
    if (밖 !== null) return 바(reply, 400, 'HOST_NOT_ALLOWED', 밖);

    const agents = await 표.에이전트들([...b.agentIds, ...b.monitorIds]);
    const 부하 = b.agentIds.map((id) => agents.find((a) => a.id === id));
    if (부하.some((a) => a === undefined || a.mode !== 'LOAD' || !표.연결됐나(a))) return 바(reply, 409, 'NO_AGENT');
    // 남의 프로젝트 서버에 깐 모니터링 에이전트는 고르지 못한다 (§3.9 「서버 모니터링」)
    if (b.monitorIds.some((id) => { const a = agents.find((x) => x.id === id); return a === undefined || a.mode !== 'MONITOR' || a.projectId !== api?.projectId; })) {
      return 바(reply, 400, 'INVALID_REQUEST', '그 프로젝트의 모니터링 에이전트가 아닙니다');
    }
    const maxVus = 부하.reduce((n, a) => n + (a === undefined ? 0 : 표.최대가상사용자(a)), 0);
    const load = { basis: b.basis, stages: b.stages };
    const durationSec = totalDuration(load);
    if (durationSec > 최대실행초) return 바(reply, 400, 'INVALID_REQUEST', '실행 시간은 24시간까지입니다');
    if (b.basis === 'VUS' && Math.max(...b.stages.map((x) => x.target)) > maxVus) return 바(reply, 400, 'INVALID_REQUEST', `가상 사용자는 고른 에이전트의 최대 ${maxVus}명까지입니다`);

    const config: RunConfig = {
      testType: b.testType, load, targets: b.targets, agentIds: b.agentIds, monitorIds: b.monitorIds, allowedHosts,
      pageCheck: false, accountsRows: sc.accounts_csv === null ? 0 : 계정줄들(sc.accounts_csv).length, durationSec, maxVus,
    };
    const r = await pool.query<{ id: string }>(
      `INSERT INTO perf_run (kind, service_id, scenario_id, scenario_version, env, base_url, test_type, config, status, origin, triggered_by, triggered_by_name)
       VALUES ('LOAD', $1, $2, $3, $4, $5, $6, $7, 'QUEUED', 'MANUAL', $8, $9) RETURNING id`,
      [serviceId, b.scenarioId, sc.version, b.env, 줄.baseUrl, b.testType, JSON.stringify(config), req.user?.username ?? null, req.user?.displayName ?? null],
    );
    const runId = Number(r.rows[0]?.id);
    await 표.로그(runId, '실행을 만들었습니다 — 부하 발생 에이전트가 비면 시작합니다');
    void 한번돌기().catch((e: unknown) => req.log.error(e, '성능 실행 살피기 실패'));
    return reply.code(201).send({ runId });
  });

  app.get<{ Querystring: { serviceId?: string; kind?: string; scenarioId?: string } }>('/perf/runs', async (req, reply) => {
    const serviceId = 정수(req.query.serviceId ?? '');
    const scenarioId = req.query.scenarioId === undefined ? null : 정수(req.query.scenarioId);
    if (serviceId === null || (req.query.scenarioId !== undefined && scenarioId === null)) return 바(reply, 400, 'INVALID_REQUEST', 'serviceId');
    const r = await (await 표.풀()).query(
      `SELECT r.id, r.kind, r.status, r.verdict, COALESCE(s.name, '') AS title, r.env, r.started_at AS "startedAt",
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
              r.scenario_id AS "scenarioId", r.created_at AS "createdAt", r.started_at AS "startedAt", r.finished_at AS "finishedAt",
              json_build_object('peakVus', r.peak_vus, 'maxTps', r.max_tps, 'p95Ms', r.p95_ms, 'errorRate', r.error_rate) AS summary
         FROM perf_run r WHERE r.id = $1`,
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
    return { ...run, id, code: 실행번호글(id), previous: prev == null ? null : { ...prev, id: Number((prev as { id: string }).id) } };
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

  app.get<번호경로>('/perf/runs/:id/report.pdf', async (req, reply) => {
    const id = 번호(req.params.id, reply);
    if (id === null) return reply;
    const r = await (await 표.풀()).query<{ status: string; verdict: 'PASS' | 'FAIL' | null; stop_reason: string | null; env: string; test_type: string | null; started_at: Date | null; peak_vus: number | null; ai: { title: string; items: string[] } | null; targets: never; title: string | null }>(
      `SELECT r.status, r.verdict, r.stop_reason, r.env, r.test_type, r.started_at, r.peak_vus, r.ai, r.targets, s.name AS title
         FROM perf_run r LEFT JOIN perf_scenario s ON s.id = r.scenario_id WHERE r.id = $1`,
      [id],
    );
    const x = r.rows[0];
    if (x === undefined) return 바(reply, 404, 'NOT_FOUND');
    if (['QUEUED', 'SMOKE', 'RUNNING'].includes(x.status)) return 바(reply, 409, 'NOT_FINISHED');
    const html = 결과HTML({
      id, title: x.title ?? '', env: x.env, testType: x.test_type, status: x.status, verdict: x.verdict, stopReason: x.stop_reason,
      startedAt: x.started_at, peakVus: x.peak_vus, ai: x.ai, targets: x.targets, rows: await 표.초읽기(id, 0, 2 ** 31 - 1, ['']), txs: await 표.트랜잭션합계(id),
    });
    const pdf = await PDF찍기(html);
    return reply.header('content-type', 'application/pdf').header('content-disposition', `attachment; filename="${실행번호글(id)}.pdf"`).send(pdf);
  });
}
