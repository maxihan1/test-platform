// 더미 클라이언트 올리기 · 목록 · 지우기와 에이전트가 받아 가는 길 — zip 은 admin 만 붙이는 perf_dummy 볼륨의 <id>.zip 에 둔다 (도메인/성능 §3.9 「게임 서버 부하」 · §5.4 · §7)

import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Transform, type Readable } from 'node:stream';

import type { FastifyInstance } from 'fastify';

import { artifactsDir } from '../execution/routes.js';
import { 정수 } from '../routeParams.js';
import { 도는것 } from './state.js';
import { 풀 } from './store.js';

// 올리는 zip 한 개의 상한(§7). 화면도 같은 값으로 미리 막는다
export const 올리기상한 = 200 * 1024 * 1024;
const ZIP머리 = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export class 올리기거절 extends Error {
  constructor(readonly status: 400 | 413, readonly error: string, readonly detail?: string) {
    super(error);
  }
}

/** 흘러가는 바이트를 세어 상한을 넘거나 zip 머리가 아니면 던진다 — 200MB 를 메모리에 올리지 않고 디스크로 보내려고 스트림으로 본다 */
export function 올리기막기(상한: number): Transform {
  let 센것 = 0;
  let 머리 = Buffer.alloc(0);
  return new Transform({
    transform(chunk: Buffer, _enc, done) {
      센것 += chunk.length;
      if (센것 > 상한) return done(new 올리기거절(413, 'PAYLOAD_TOO_LARGE'));
      if (머리.length < ZIP머리.length) {
        머리 = Buffer.concat([머리, chunk.subarray(0, ZIP머리.length - 머리.length)]);
        if (!ZIP머리.subarray(0, 머리.length).equals(머리)) return done(new 올리기거절(400, 'INVALID_REQUEST', 'zip 파일이 아닙니다'));
      }
      done(null, chunk);
    },
    flush(done) {
      done(머리.length < ZIP머리.length ? new 올리기거절(400, 'INVALID_REQUEST', 'zip 파일이 아닙니다') : null);
    },
  });
}

// stream.pipeline 은 실패하면 요청 스트림을 부숴, 이어 보내는 오류 응답이 나가지 못하고 걸린다 — 직접 이어 붙이고 실패하면 남은 본문을 흘려보낸다
export function 파일로(body: Readable, 막기: Transform, 자리: string): Promise<void> {
  const 출력 = createWriteStream(자리);
  return new Promise<void>((resolve, reject) => {
    출력.on('finish', resolve);
    for (const x of [body, 막기, 출력]) x.on('error', reject);
    body.pipe(막기).pipe(출력);
  }).catch(async (e: unknown) => {
    body.unpipe();
    body.resume();
    // 파일을 여는 중에 부수면 닫힌 뒤에 파일이 생긴다 — 닫힐 때까지 기다려야 뒤의 rm 이 그 파일을 지운다
    if (!출력.closed) await new Promise<void>((r) => 출력.once('close', () => r()).destroy());
    throw e;
  });
}

// 러너도 쓰는 artifacts 볼륨에 두면 케이스가 zip 을 덮고 에이전트가 그 코드를 root 로 돌린다. 비면(테스트 · 컨테이너 밖 개발) 옛 자리다 (리뷰 M16)
const 폴더 = () => process.env.PLATFORM_PERF_DUMMY_DIR ?? join(artifactsDir(), 'perf-dummy');
export const 파일자리 = (id: number) => join(폴더(), `${id}.zip`);

type 질의 = { Querystring: { serviceId?: string; name?: string; command?: string } };

export default async function perfDummyRoutes(app: FastifyInstance): Promise<void> {
  // 본문을 읽지 않고 스트림 그대로 넘긴다 — 다른 갈래의 버퍼 파서와 겹치지 않게 이 플러그인 안에서만 건다
  app.addContentTypeParser(['application/octet-stream', 'application/zip'], (_req, payload, done) => done(null, payload));

  app.get<질의>('/perf/dummy-clients', async (req, reply) => {
    const serviceId = 정수(req.query.serviceId ?? '');
    if (serviceId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'serviceId' });
    const r = await (await 풀()).query<{ id: string; name: string; command: string; bytes: string; created_at: Date }>(
      'SELECT id, name, command, bytes, created_at FROM perf_dummy_client WHERE service_id = $1 ORDER BY id DESC',
      [serviceId],
    );
    return { clients: r.rows.map((c) => ({ id: Number(c.id), name: c.name, command: c.command, bytes: Number(c.bytes), createdAt: c.created_at })) };
  });

  app.post<질의>('/perf/dummy-clients', async (req, reply) => {
    const serviceId = 정수(req.query.serviceId ?? '');
    const name = (req.query.name ?? '').trim();
    const command = (req.query.command ?? '').trim();
    if (serviceId === null || name === '' || name.length > 40 || command === '' || command.length > 500) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'serviceId · name(1~40자) · command(1~500자)' });
    }
    if (!(await (await 풀()).query('SELECT 1 FROM service WHERE id = $1', [serviceId])).rowCount) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: '애플리케이션이 없습니다' });
    }
    const body = req.body as Readable | undefined;
    if (body === undefined || typeof body.pipe !== 'function') return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'zip 본문이 없습니다' });
    // 보낸다고 밝힌 크기가 상한을 넘으면 읽지 않고 돌려보낸다
    if (Number(req.headers['content-length'] ?? 0) > 올리기상한) return reply.code(413).send({ error: 'PAYLOAD_TOO_LARGE' });

    await mkdir(폴더(), { recursive: true });
    // 번호를 받기 전에 임시 이름으로 쓴다. 실패하면 행도 파일도 남지 않는다
    const 임시 = join(폴더(), `upload-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.part`);
    let id: number | null = null;
    try {
      await 파일로(body, 올리기막기(올리기상한), 임시);
      const 크기 = (await stat(임시)).size;
      const r = await (await 풀()).query<{ id: string }>(
        'INSERT INTO perf_dummy_client (service_id, name, command, bytes, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [serviceId, name, command, 크기, req.user?.username ?? ''],
      );
      id = Number(r.rows[0]?.id);
      await rename(임시, 파일자리(id));
      return reply.code(201).send({ id });
    } catch (e) {
      await rm(임시, { force: true });
      if (id !== null) await (await 풀()).query('DELETE FROM perf_dummy_client WHERE id = $1', [id]);
      if (e instanceof 올리기거절) return reply.code(e.status).send({ error: e.error, ...(e.detail === undefined ? {} : { detail: e.detail }) });
      throw e;
    }
  });

  app.delete<{ Params: { id: string } }>('/perf/dummy-clients/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'id' });
    const pool = await 풀();
    const 있나 = await pool.query('SELECT 1 FROM perf_dummy_client WHERE id = $1', [id]);
    if (!있나.rowCount) return reply.code(404).send({ error: 'NOT_FOUND' });
    // 시나리오의 현재 버전, 그리고 끝나지 않은 실행이 읽는 버전(옛 버전 · 지운 시나리오여도)을 센다 — 도는 실행의 zip 을 지우면 도중에 실패한다
    const 쓰는중 = await pool.query(
      `SELECT 1 FROM perf_scenario s JOIN perf_scenario_version v ON v.scenario_id = s.id AND v.version = s.version
        WHERE s.deleted_at IS NULL AND v.body->>'dummyClient' = $1::text
       UNION ALL
       SELECT 1 FROM perf_run r JOIN perf_scenario_version v ON v.scenario_id = r.scenario_id AND v.version = r.scenario_version
        WHERE r.status IN ('QUEUED', 'SMOKE', 'RUNNING') AND v.body->>'dummyClient' = $1::text LIMIT 1`,
      [id],
    );
    if (쓰는중.rowCount) return reply.code(409).send({ error: 'IN_USE' });
    await pool.query('DELETE FROM perf_dummy_client WHERE id = $1', [id]);
    await rm(파일자리(id), { force: true });
    return reply.code(204).send();
  });

  // 에이전트가 받아 간다 — 그 에이전트가 맡은 도는 실행의 더미 클라이언트일 때만 (§5.4)
  app.get<{ Params: { id: string } }>('/perf/agent/dummy-clients/:id', async (req, reply) => {
    const agent = req.perfAgent;
    if (agent === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    const id = 정수(req.params.id);
    const 맡음 = id !== null && [...도는것.values()].some((l) => l.dummyClient === id && l.agents.includes(agent.id));
    if (!맡음) return reply.code(404).send({ error: 'NOT_FOUND' });
    const 크기 = await stat(파일자리(id)).then((s) => s.size, () => null);
    if (크기 === null) return reply.code(404).send({ error: 'NOT_FOUND' });
    return reply.type('application/zip').header('content-length', 크기).send(createReadStream(파일자리(id)));
  });
}
