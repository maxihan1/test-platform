// 성능 AI 일 통로 — 시나리오 초안(녹화 · Swagger · 파일) · 추천(부하 크기 · 성능 목표) · 작성 에이전트의 집기 · 끝내기 (도메인/성능 §7)

import type { BrowserPlatform } from '@platform/kit';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 문서설정읽기, 판원문 } from '../apidoc/store.js';
import { 작성계정인가 } from '../auth/agentToken.js';
import { 대상줄들읽기 } from '../authoring/reverse.js';
import { 지금가이드 } from '../guide/store.js';
import { 지금판 } from '../prd/store.js';
import { 정수 } from '../routeParams.js';
import { 상세 as E2E상세 } from '../scenario/store.js';
import { 분석끝내기 } from './analysis.js';
import { 결과다듬기, 끝내기, 오래된일닫기, 일만들기, 일하나, 집기 } from './ai.js';
import { 팜기기재료 } from './devices.js';
import { 화면재료 } from './pages.js';
import { 녹화하기 } from './record.js';
import { API서버호스트 } from './scenarios.js';
import { 풀 } from './store.js';

const 파일상한 = 1024 * 1024;
const 녹화케이스상한 = 20;
const 묶음상한 = 200_000;

const 녹화 = z.object({
  serviceId: z.number().int().positive(),
  from: z.literal('RECORD'),
  env: z.string().min(1).max(100),
  caseIds: z.array(z.string().min(1).max(100)).min(1).max(녹화케이스상한).optional(),
  scenarioId: z.number().int().positive().optional(),
}).refine((b) => (b.caseIds === undefined) !== (b.scenarioId === undefined), '케이스와 E2E 시나리오 중 하나만 고릅니다');
const 스웨거 = z.object({
  serviceId: z.number().int().positive(),
  from: z.literal('SWAGGER'),
  apiDocVersion: z.number().int().positive(),
  operations: z.array(z.object({ method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'get', 'post', 'put', 'patch', 'delete']), path: z.string().min(1).max(500) })).min(1).max(50),
});
const 추천 = z.object({
  serviceId: z.number().int().positive(),
  kind: z.enum(['LOAD', 'TARGETS', 'PAGES', 'DEVICES']),
  scenarioId: z.number().int().positive().optional(),
  // 페이지 추천은 그 대상 서버의 화면 기록에서 고른다. 없으면 모든 대상 서버 것
  env: z.string().min(1).max(100).optional(),
});
const 끝 = z.union([z.object({ output: z.record(z.string(), z.unknown()) }), z.object({ error: z.string().min(1).max(2000) })]);

type 번호경로 = { Params: { id: string } };
type 파일질의 = { Querystring: { serviceId?: string; from?: string; name?: string } };

async function 서비스접두사(serviceId: number): Promise<string | null> {
  const r = await (await 풀()).query<{ prefix: string }>('SELECT prefix FROM service WHERE id = $1', [serviceId]);
  return r.rows[0]?.prefix ?? null;
}

async function 기획서재료(serviceId: number): Promise<{ reqId: string; feature: string; text: string }[]> {
  // 기획서에는 비기능 요구사항 칸이 따로 없어 전체를 넘기고 AI 가 성능 관련 줄을 고른다 (PERF-F1-04 시작 질문)
  return ((await 지금판(serviceId))?.items ?? []).map((i) => ({ reqId: i.reqId, feature: i.feature, text: i.text }));
}

/** 녹화 일을 세우고 녹화를 뒤에서 돌린다. 틀린 요청이면 까닭 */
async function 녹화세우기(b: z.infer<typeof 녹화>, who: string): Promise<{ jobId: number } | { error: string; detail: string }> {
  const prefix = await 서비스접두사(b.serviceId);
  if (prefix === null) return { error: 'INVALID_REQUEST', detail: '애플리케이션이 없습니다' };
  const 줄 = (await 대상줄들읽기(b.serviceId)).find((x) => x.env === b.env);
  if (줄 === undefined) return { error: 'ENV_NOT_FOUND', detail: b.env };
  const api = await API서버호스트(b.serviceId);
  let 대상: Parameters<typeof 녹화하기>[2];
  let 이름들: string[];
  if (b.caseIds !== undefined) {
    const r = await (await 풀()).query<{ tc_id: string; name: string; platforms: string[]; file_path: string; param_schema: unknown; expected_schema: unknown }>(
      `SELECT tc_id, name, platforms, file_path, param_schema, expected_schema FROM test_case WHERE tc_id = ANY($1::text[]) AND split_part(tc_id, '-', 1) = $2`,
      [b.caseIds, prefix],
    );
    const 행 = new Map(r.rows.map((x) => [x.tc_id, x]));
    const 케이스 = [];
    for (const tcId of b.caseIds) {
      const x = 행.get(tcId);
      if (x === undefined) return { error: 'INVALID_REQUEST', detail: `이 애플리케이션의 케이스가 아닙니다: ${tcId}` };
      // 녹화는 브라우저가 주고받은 요청이다 — Android 케이스는 녹화하지 못한다
      const platform: BrowserPlatform | undefined = x.platforms.includes('desktop') ? 'desktop' : x.platforms.includes('mobile') ? 'mobile' : undefined;
      if (platform === undefined) return { error: 'INVALID_REQUEST', detail: `웹 케이스가 아닙니다: ${tcId}` };
      케이스.push({ tcId, platform, filePath: x.file_path, paramSchema: x.param_schema, expectedSchema: x.expected_schema });
    }
    대상 = { 케이스 };
    이름들 = b.caseIds.map((id) => 행.get(id)!.name);
  } else {
    const e2e = await E2E상세(b.scenarioId!);
    if (e2e === null || e2e.service !== prefix) return { error: 'INVALID_REQUEST', detail: '이 애플리케이션의 E2E 시나리오가 아닙니다' };
    if (e2e.platform !== 'desktop' && e2e.platform !== 'mobile') return { error: 'INVALID_REQUEST', detail: '웹 E2E 시나리오가 아닙니다' };
    대상 = { 시나리오: { service: prefix, platform: e2e.platform, parts: e2e.parts } };
    이름들 = [e2e.name];
  }
  const jobId = await 일만들기('DRAFT_RECORD', b.serviceId, { cases: 이름들 }, who, true);
  // 녹화는 몇 분 걸려 기다리지 않는다. 녹화하기는 실패를 일에 적지만 그 적기마저 깨지면 admin 이 죽지 않게 로그로 받는다
  녹화하기(jobId, 줄, 대상, { cases: 이름들, baseUrl: 줄.baseUrl, apiHosts: api?.hosts ?? [] }).catch((e: unknown) => console.error(`[perf] ${jobId}번 녹화를 닫지 못했다`, e));
  return { jobId };
}

async function 스웨거재료(b: z.infer<typeof 스웨거>): Promise<{ input: unknown } | { error: string; detail: string }> {
  const 판 = await 판원문(b.serviceId, b.apiDocVersion);
  if (판 === null) return { error: 'INVALID_REQUEST', detail: `API 문서 판이 없습니다: ${b.apiDocVersion}` };
  const paths = (판.doc.paths ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const operations = [];
  for (const o of b.operations) {
    // 경로 줄의 parameters · 원형 속성을 API 로 집지 않는다
    const 줄 = Object.hasOwn(paths, o.path) ? paths[o.path] : undefined;
    const operation = 줄 !== undefined && Object.hasOwn(줄, o.method.toLowerCase()) ? 줄[o.method.toLowerCase()] : undefined;
    if (operation === undefined) return { error: 'INVALID_REQUEST', detail: `문서에 없는 API 입니다: ${o.method} ${o.path}` };
    operations.push({ method: o.method.toUpperCase(), path: o.path, operation });
  }
  // 스키마 묶음이 크면 AI 재료에서 뺀다 — 고른 API 의 본문 예시는 operation 에 대개 들어 있다
  const components = 판.doc.components;
  const 붙일 = components !== undefined && JSON.stringify(components).length <= 묶음상한;
  const api = await API서버호스트(b.serviceId);
  return {
    input: {
      apiDocVersion: 판.version,
      baseUrl: (await 문서설정읽기(b.serviceId))?.baseUrl ?? null,
      apiHosts: api?.hosts ?? [],
      operations,
      ...(붙일 && { components }),
    },
  };
}

export default async function perfAiRoutes(app: FastifyInstance): Promise<void> {
  // JMeter · nGrinder 파일은 본문 그대로 받는다 — 더미 클라이언트 · 자료 올리기와 같은 꼴이다. 상한을 넘으면 Fastify 가 413 을 낸다
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: 파일상한 }, (_req, body, done) => {
    done(null, body);
  });

  app.post<파일질의>('/perf/scenarios/draft', async (req, reply) => {
    const who = req.user?.username ?? '';
    if (Buffer.isBuffer(req.body)) {
      const serviceId = 정수(req.query.serviceId ?? '');
      const name = (req.query.name ?? '').trim();
      if (serviceId === null || req.query.from !== 'FILE' || name === '' || name.length > 200) {
        return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'serviceId · from=FILE · name' });
      }
      if ((await 서비스접두사(serviceId)) === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: '애플리케이션이 없습니다' });
      const text = req.body.toString('utf8');
      if (text.trim() === '') return reply.code(400).send({ error: 'INVALID_REQUEST', detail: '빈 파일입니다' });
      return reply.code(202).send({ jobId: await 일만들기('DRAFT_FILE', serviceId, { name, text }, who) });
    }
    const from = (req.body as { from?: unknown } | null)?.from;
    if (from === 'RECORD') {
      const p = 녹화.safeParse(req.body);
      if (!p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.error.message });
      const r = await 녹화세우기(p.data, who);
      return 'error' in r ? reply.code(400).send(r) : reply.code(202).send(r);
    }
    if (from === 'SWAGGER') {
      const p = 스웨거.safeParse(req.body);
      if (!p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.error.message });
      const r = await 스웨거재료(p.data);
      if ('error' in r) return reply.code(400).send(r);
      return reply.code(202).send({ jobId: await 일만들기('DRAFT_SWAGGER', p.data.serviceId, r.input, who) });
    }
    return reply.code(400).send({ error: 'INVALID_REQUEST', detail: "from 은 'RECORD' · 'SWAGGER' 이거나, 파일은 application/octet-stream 본문입니다" });
  });

  app.post('/perf/suggest', async (req, reply) => {
    const p = 추천.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.error.message });
    const { serviceId, kind, scenarioId } = p.data;
    if ((await 서비스접두사(serviceId)) === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: '애플리케이션이 없습니다' });
    const who = req.user?.username ?? '';
    if (kind === 'PAGES') {
      const screens = await 화면재료(serviceId, p.data.env ?? null);
      if (screens.length === 0) return reply.code(409).send({ error: 'NO_DATA', detail: '화면 기록이 없습니다' });
      return reply.code(202).send({ jobId: await 일만들기('SUGGEST_PAGES', serviceId, { screens }, who) });
    }
    if (kind === 'DEVICES') {
      const devices = await 팜기기재료();
      if (devices.length === 0) return reply.code(409).send({ error: 'NO_DATA', detail: '팜 기기가 없습니다' });
      return reply.code(202).send({ jobId: await 일만들기('SUGGEST_DEVICES', serviceId, { devices }, who) });
    }
    const prd = await 기획서재료(serviceId);
    if (kind === 'LOAD') {
      const g = await 지금가이드(serviceId);
      const guide = g.intro === '' && g.policy === '' && g.rules === '' ? null : { intro: g.intro, policy: g.policy, rules: g.rules };
      return reply.code(202).send({ jobId: await 일만들기('SUGGEST_LOAD', serviceId, { prd, guide }, who) });
    }
    let transactions: string[] = [];
    if (scenarioId !== undefined) {
      const r = await (await 풀()).query<{ body: { transactions?: { name: string }[] } }>(
        `SELECT v.body FROM perf_scenario s JOIN perf_scenario_version v ON v.scenario_id = s.id AND v.version = s.version
          WHERE s.id = $1 AND s.service_id = $2 AND s.deleted_at IS NULL`,
        [scenarioId, serviceId],
      );
      if (r.rows[0] === undefined) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: '이 애플리케이션의 성능 시나리오가 아닙니다' });
      transactions = (r.rows[0].body.transactions ?? []).map((t) => t.name);
    }
    // 서비스 가이드는 성능 목표의 근거가 아니라 넘기지 않는다 (§3.9 「성능 목표」)
    return reply.code(202).send({ jobId: await 일만들기('SUGGEST_TARGETS', serviceId, { prd, transactions }, who) });
  });

  app.get<번호경로>('/perf/ai-jobs/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    let job = await 일하나(id);
    if (job === null) return reply.code(404).send({ error: 'NOT_FOUND' });
    // 닫기는 표를 훑는다 — 화면이 5초마다 묻는 매번이 아니라 그 일이 도는 중일 때만 한다
    if (job.status === 'RUNNING') {
      await 오래된일닫기();
      job = (await 일하나(id)) ?? job;
    }
    return { status: job.status, ...(job.output !== null && { output: job.output }), ...(job.error !== null && { error: job.error }) };
  });

  app.post('/perf/ai-jobs/claim', async (req, reply) => {
    // 권한만 걸면 권한 있는 아무나 먼저 집어 결과를 바꿔 넣는다 — 작성 에이전트 계정만 집는다 (§7 「누가 집나」)
    if (!작성계정인가(req.user?.username ?? '')) return reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });
    await 오래된일닫기();
    const job = await 집기((req.user?.services ?? []).map((s) => s.prefix));
    return { job };
  });

  app.post<번호경로>('/perf/ai-jobs/:id/finish', async (req, reply) => {
    if (!작성계정인가(req.user?.username ?? '')) return reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });
    const id = 정수(req.params.id);
    const p = 끝.safeParse(req.body);
    if (id === null || !p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.success ? req.params.id : p.error.message });
    const job = await 일하나(id);
    if (job === null) return reply.code(404).send({ error: 'NOT_FOUND' });
    if ('error' in p.data) {
      if (!(await 끝내기(id, { error: p.data.error }))) return reply.code(409).send({ error: 'NOT_RUNNING' });
      return reply.code(204).send();
    }
    const 다듬은 = 결과다듬기(job.kind, job.input, p.data.output);
    const 닫음 = !('error' in 다듬은) && job.kind === 'ANALYZE_RUN' && job.runId !== null ? await 분석끝내기(id, job.runId, 다듬은.output) : await 끝내기(id, 다듬은);
    if (!닫음) return reply.code(409).send({ error: 'NOT_RUNNING' });
    // 모양이 틀린 결과는 일을 FAILED 로 닫고 에이전트에게도 까닭을 돌려준다
    return 'error' in 다듬은 ? reply.code(400).send({ error: 'INVALID_OUTPUT', detail: 다듬은.error }) : reply.code(204).send();
  });
}
