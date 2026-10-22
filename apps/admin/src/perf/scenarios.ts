// 성능 시나리오 통로 — 목록 · 만들기 · 보기 · 고치기(저장마다 버전) · 지우기 (도메인/성능 §7 「시나리오」)

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 정수 } from '../routeParams.js';
import { 스크립트호스트 } from './generator.js';
import { 풀 } from './store.js';
import type { ScenarioBody, Transaction } from './types.js';

export const 트랜잭션 = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(['HTTP', 'WS', 'GRPC']).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  url: z.string().min(1).max(2000),
  headers: z.record(z.string().max(200), z.string().max(4000)).optional(),
  body: z.string().max(100_000).optional(),
  extract: z.array(z.object({
    var: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,63}$/),
    where: z.enum(['JSON', 'HEADER', 'COOKIE']),
    path: z.string().min(1).max(500),
    pick: z.enum(['FIRST', 'RANDOM']),
  })).max(20).optional(),
  check: z.object({ status: z.array(z.number().int().min(100).max(599)).max(20).optional(), contains: z.string().max(1000).optional() }).optional(),
  thinkTimeSec: z.number().min(0).max(600).optional(),
  messages: z.array(z.string().max(100_000)).max(50).optional(),
  grpc: z.object({ proto: z.string().min(1).max(200_000), method: z.string().regex(/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+\/[A-Za-z0-9_]+$/) }).optional(),
}).refine((t) => (t.type === 'GRPC') === (t.grpc !== undefined), 'gRPC 트랜잭션만 proto · 메서드를 듭니다')
  .refine((t) => t.type !== 'GRPC' || /^(\/|https?:\/\/)/i.test(t.url), 'gRPC 주소는 경로나 http(s):// 주소입니다')
  .refine((t) => t.type === 'WS' || !/^wss?:\/\//i.test(t.url), 'ws:// 주소는 WebSocket 트랜잭션만 씁니다')
  .refine((t) => t.type !== 'WS' || !/^https?:\/\//i.test(t.url), 'WebSocket 주소는 경로나 ws(s):// 주소입니다');
export const 단계 = z.object({ durationSec: z.number().int().min(1).max(86_400), target: z.number().int().min(0).max(1_000_000) });
export const 목표 = z.object({
  metric: z.enum(['P95', 'ERROR_RATE', 'TPS']),
  scope: z.string().max(100).optional(),
  op: z.enum(['<=', '>=']),
  value: z.number().min(0),
  source: z.enum(['PRD', 'AI', 'MANUAL']),
  reqId: z.string().max(50).optional(),
});
const 본문 = z.object({
  transactions: z.array(트랜잭션).min(1).max(200).optional(),
  dummyClient: z.number().int().positive().optional(),
  load: z.object({ basis: z.enum(['VUS', 'TPS']), stages: z.array(단계).min(1).max(50), testType: z.enum(['LOAD', 'STRESS', 'SPIKE', 'SOAK']).optional() }).optional(),
  targets: z.array(목표).max(50).optional(),
  run: z.record(z.string(), z.unknown()).optional(),
}).refine((b) => (b.transactions === undefined) !== (b.dummyClient === undefined), '트랜잭션 목록과 더미 클라이언트 중 하나만 듭니다')
  .refine((b) => new Set((b.transactions ?? []).map((t) => t.name)).size === (b.transactions ?? []).length, '트랜잭션 이름이 겹칩니다');

// draftJobId — 이 본문이 나온 AI 초안 일. 버전 기록에 출처(녹화 · Swagger · 파일)와 녹화 파일을 붙인다 (PERF-F1-04 시작 질문)
const 초안번호 = z.number().int().positive().optional();
const 만들기 = z.object({ serviceId: z.number().int().positive(), name: z.string().trim().min(1).max(100), body: 본문, draftJobId: 초안번호 });
const 고치기 = z.object({ body: 본문, accountsCsv: z.string().max(900_000).optional(), draftJobId: 초안번호 });

/**
 * 주소의 호스트. 스크립트의 글자 셈과 WHATWG URL.host 가 다르면(계정 · 국제 도메인 · 끝 점 · 퍼센트 글자) null —
 * 저장 검사는 통과했는데 실행 때 매번 「허용 호스트 밖」으로 던지는 주소를 받지 않는다
 */
export function 호스트(url: string): string | null {
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    return null;
  }
  return 스크립트호스트(url) === host ? host : null;
}

/** 절대 주소의 호스트가 허용 목록 밖인 첫 트랜잭션 이름. 상대 주소는 대상 서버 아래라 지나간다 (§3.9 「허용 호스트」) */
export function 허용밖(txs: readonly Transaction[], 허용: ReadonlySet<string>): string | null {
  for (const t of txs) {
    if (!/^(https?|wss?):\/\//i.test(t.url)) continue;
    const host = 호스트(t.url);
    // 호스트 자리에 변수를 쓰면 실행 때 어디로 갈지 저장 때 모른다
    if (host === null || host.includes('$') || !허용.has(host)) return t.name;
  }
  return null;
}

/** 그 애플리케이션 프로젝트의 「API 서버」 꼬리표에 이름이 붙은 호스트 (공통/1 §2 「API 서버」) */
export async function API서버호스트(serviceId: number): Promise<{ projectId: number; hosts: string[] } | null> {
  const r = await (await 풀()).query<{ project_id: string; host: string | null }>(
    `SELECT s.project_id, n.host FROM service s LEFT JOIN project_api_server n ON n.project_id = s.project_id AND n.name <> '' WHERE s.id = $1`,
    [serviceId],
  );
  if (r.rows[0] === undefined) return null;
  return { projectId: Number(r.rows[0].project_id), hosts: r.rows.flatMap((x) => (x.host === null ? [] : [x.host])) };
}

// 첫 줄이 머리(아이디 · id · username)면 뺀다. 응답에는 행 수만 싣는다 (공통/4 「accounts_csv 는 비밀값」)
export function 계정줄들(csv: string): string[] {
  const 줄 = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
  return 줄.length > 0 && /^(아이디|id|username|login)\s*,/i.test(줄[0] ?? '') ? 줄.slice(1) : 줄;
}

async function 본문검사(serviceId: number, body: ScenarioBody): Promise<{ error: string; detail?: string } | null> {
  const api = await API서버호스트(serviceId);
  if (api === null) return { error: 'INVALID_REQUEST', detail: '애플리케이션이 없습니다' };
  const 밖 = 허용밖(body.transactions ?? [], new Set(api.hosts));
  if (밖 !== null) return { error: 'HOST_NOT_ALLOWED', detail: 밖 };
  if (body.dummyClient !== undefined) {
    const r = await (await 풀()).query('SELECT 1 FROM perf_dummy_client WHERE id = $1 AND service_id = $2', [body.dummyClient, serviceId]);
    if (r.rowCount === 0) return { error: 'INVALID_REQUEST', detail: '더미 클라이언트가 없습니다' };
  }
  return null;
}

/** 버전의 출처 · 녹화 파일. 끝난 초안 일이 같은 애플리케이션 것일 때만 받는다 */
async function 출처(serviceId: number, draftJobId: number | undefined): Promise<{ source: string; recording: string | null } | null> {
  if (draftJobId === undefined) return { source: 'MANUAL', recording: null };
  const r = await (await 풀()).query<{ kind: string; recording: string | null }>(
    `SELECT kind, input->>'recording' AS recording FROM perf_ai_job
      WHERE id = $1 AND service_id = $2 AND status = 'DONE' AND kind IN ('DRAFT_RECORD', 'DRAFT_SWAGGER', 'DRAFT_FILE')`,
    [draftJobId, serviceId],
  );
  const row = r.rows[0];
  return row === undefined ? null : { source: row.kind.slice('DRAFT_'.length), recording: row.recording };
}

type 번호경로 = { Params: { id: string } };

export default async function perfScenarioRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { serviceId?: string } }>('/perf/scenarios', async (req, reply) => {
    const serviceId = 정수(req.query.serviceId ?? '');
    if (serviceId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'serviceId' });
    const r = await (await 풀()).query<{ id: string; name: string; version: number; updated_at: Date; run: { id: number; status: string; verdict: string | null; createdAt: string } | null }>(
      `SELECT s.id, s.name, s.version,
              (SELECT max(v.created_at) FROM perf_scenario_version v WHERE v.scenario_id = s.id) AS updated_at,
              (SELECT json_build_object('id', r.id, 'status', r.status, 'verdict', r.verdict, 'createdAt', r.created_at)
                 FROM perf_run r WHERE r.scenario_id = s.id ORDER BY r.id DESC LIMIT 1) AS run
         FROM perf_scenario s WHERE s.service_id = $1 AND s.deleted_at IS NULL ORDER BY s.id DESC`,
      [serviceId],
    );
    return { scenarios: r.rows.map((x) => ({ id: Number(x.id), name: x.name, version: x.version, updatedAt: x.updated_at, lastRun: x.run })) };
  });

  app.post('/perf/scenarios', async (req, reply) => {
    const p = 만들기.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.error.message });
    const 틀림 = await 본문검사(p.data.serviceId, p.data.body);
    if (틀림 !== null) return reply.code(400).send(틀림);
    const 온곳 = await 출처(p.data.serviceId, p.data.draftJobId);
    if (온곳 === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'draftJobId' });
    const who = req.user?.username ?? '';
    const pool = await 풀();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const s = await client.query<{ id: string }>('INSERT INTO perf_scenario (service_id, name, created_by) VALUES ($1, $2, $3) RETURNING id', [p.data.serviceId, p.data.name, who]);
      const id = Number(s.rows[0]?.id);
      await client.query(
        'INSERT INTO perf_scenario_version (scenario_id, version, body, source, recording, created_by) VALUES ($1, 1, $2, $3, $4, $5)',
        [id, JSON.stringify(p.data.body), 온곳.source, 온곳.recording, who],
      );
      await client.query('COMMIT');
      return reply.code(201).send({ id, version: 1 });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  app.get<번호경로>('/perf/scenarios/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    const pool = await 풀();
    const s = await pool.query<{ service_id: string; name: string; version: number; accounts_csv: string | null; body: unknown; schedule_at: string | null; schedule_tz: string | null; schedule_env: string | null }>(
      `SELECT s.service_id, s.name, s.version, s.accounts_csv, v.body, to_char(s.schedule_at, 'HH24:MI') AS schedule_at, s.schedule_tz, s.schedule_env FROM perf_scenario s
         JOIN perf_scenario_version v ON v.scenario_id = s.id AND v.version = s.version
        WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [id],
    );
    const row = s.rows[0];
    if (row === undefined) return reply.code(404).send({ error: 'NOT_FOUND' });
    const versions = await pool.query<{ version: number; source: string; created_at: Date; created_by: string }>(
      'SELECT version, source, created_at, created_by FROM perf_scenario_version WHERE scenario_id = $1 ORDER BY version DESC',
      [id],
    );
    return {
      id, serviceId: Number(row.service_id), name: row.name, version: row.version, body: row.body,
      accountsRows: row.accounts_csv === null ? 0 : 계정줄들(row.accounts_csv).length,
      schedule: row.schedule_at === null ? null : { at: row.schedule_at, tz: row.schedule_tz ?? '', env: row.schedule_env ?? '' },
      versions: versions.rows.map((v) => ({ version: v.version, source: v.source, createdAt: v.created_at, createdBy: v.created_by })),
    };
  });

  app.put<번호경로>('/perf/scenarios/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    const p = 고치기.safeParse(req.body);
    if (id === null || !p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.success ? req.params.id : p.error.message });
    const pool = await 풀();
    const s = await pool.query<{ service_id: string }>('SELECT service_id FROM perf_scenario WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (s.rows[0] === undefined) return reply.code(404).send({ error: 'NOT_FOUND' });
    const 틀림 = await 본문검사(Number(s.rows[0].service_id), p.data.body);
    if (틀림 !== null) return reply.code(400).send(틀림);
    const 온곳 = await 출처(Number(s.rows[0].service_id), p.data.draftJobId);
    if (온곳 === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'draftJobId' });
    const csv = p.data.accountsCsv === undefined ? undefined : 계정줄들(p.data.accountsCsv);
    const r = await pool.query<{ version: number }>(
      `WITH up AS (
         UPDATE perf_scenario SET version = version + 1,
                accounts_csv = CASE WHEN $4::boolean THEN NULLIF($5, '') ELSE accounts_csv END
          WHERE id = $1 AND deleted_at IS NULL RETURNING id, version)
       INSERT INTO perf_scenario_version (scenario_id, version, body, source, recording, created_by)
       SELECT id, version, $2, $6, $7, $3 FROM up RETURNING version`,
      [id, JSON.stringify(p.data.body), req.user?.username ?? '', csv !== undefined, (csv ?? []).join('\n'), 온곳.source, 온곳.recording],
    );
    if (r.rows[0] === undefined) return reply.code(404).send({ error: 'NOT_FOUND' });
    return { version: r.rows[0].version };
  });

  app.delete<번호경로>('/perf/scenarios/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    // 실행 기록이 시나리오를 가리키므로 행은 남기고 지운 표시만 한다. 정기 실행도 같이 끈다
    const r = await (await 풀()).query(
      `UPDATE perf_scenario SET deleted_at = now(), schedule_at = NULL, schedule_tz = NULL, schedule_env = NULL WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (r.rowCount === 0) return reply.code(404).send({ error: 'NOT_FOUND' });
    return reply.code(204).send();
  });
}
