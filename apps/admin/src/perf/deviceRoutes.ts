// 기기 성능 통로 — 고를 수 있는 기기 · 측정 만들기 · 결과 읽기 · 녹화 화면 (도메인/성능 §7 「PERF-F1-08 이 연 통로」)

import { readdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

import { artifactsDir, 볼륨파일 } from '../artifactFile.js';
import { 정수 } from '../routeParams.js';
import { 기기목록, 시리얼, 측정본문, 측정세우기 } from './devices.js';
import { 녹화이름 } from './deviceRecorder.js';
import { 구간묶기, 기기요약하기, 누수의심, 회차메모리 } from './deviceStats.js';
import { 줄읽기 } from './deviceStore.js';
import { 한번돌기 } from './engine.js';
import * as 표 from './store.js';
import type { DeviceRunConfig } from './types.js';

const 영상이름 = /^rec-\d+\.mp4$/;
const 영상폴더 = (runId: number, serial: string) => join(artifactsDir(), 'perf', String(runId), serial);

async function 영상들(runId: number, serial: string): Promise<{ serial: string; name: string; startSec: number }[]> {
  try {
    return (await readdir(영상폴더(runId, serial))).flatMap((name) => {
      const m = 녹화이름.exec(name);
      return m === null ? [] : [{ serial, name, startSec: Number(m[1]) }];
    }).sort((a, b) => a.startSec - b.startSec);
  } catch {
    return [];
  }
}

export default async function perfDeviceRoutes(app: FastifyInstance): Promise<void> {
  // 영상을 앞뒤로 넘길 수 있게 Range 를 받는 sendFile 로 내준다 — 팜 증적 영상 통로와 같은 방식
  await app.register(fastifyStatic, { root: artifactsDir(), serve: false });

  app.get('/perf/devices', async () => ({ devices: await 기기목록() }));

  app.post('/perf/devices/measure', async (req, reply) => {
    const p = 측정본문.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: p.error.message });
    const r = await 측정세우기(p.data, { username: req.user?.username ?? null, name: req.user?.displayName ?? null });
    if ('error' in r) return reply.code(r.status).send(r.detail === undefined ? { error: r.error } : { error: r.error, detail: r.detail });
    void 한번돌기().catch((e: unknown) => req.log.error(e, '성능 실행 살피기 실패'));
    return reply.code(201).send({ runId: r.runId });
  });

  app.get<{ Params: { id: string }; Querystring: { from?: string } }>('/perf/runs/:id/devices', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    const run = await 표.실행하나(id);
    if (run === null || run.kind !== 'DEVICE') return reply.code(404).send({ error: 'NOT_FOUND' });
    const 실행 = (await (await 표.풀()).query<{ status: string; targets: { scope: string; verdict: string }[] | null; ai: { markers?: unknown[] } | null }>(
      'SELECT status, targets, ai FROM perf_run WHERE id = $1', [id],
    )).rows[0];
    const cfg = run.config as unknown as DeviceRunConfig;
    const 줄들 = await 줄읽기(id);
    const 메모리목표 = cfg.targets.find((t) => t.metric === 'MAX_MEM')?.value ?? null;
    const from = 정수(req.query.from ?? '0') ?? 0;
    const 기기별 = cfg.devices.map((d) => ({ d, 줄: 줄들.filter((r) => r.serial === d.serial) }));
    const 회차들 = 기기별.map(({ d, 줄 }) => ({ serial: d.serial, 회차: 회차메모리(d.serial, 줄) }));
    return {
      devices: 기기별.map(({ d, 줄 }) => ({
        serial: d.serial, model: d.model, where: d.where, launchMs: d.launchMs, summary: 기기요약하기(줄),
        // 판정은 끝까지 잰 실행에서만 싣는다. 숫자를 한 줄도 안 보낸 기기는 목표가 없어도 실패다
        verdict: 실행?.status === 'DONE' ? (줄.length > 0 && (실행.targets ?? []).filter((t) => t.scope === d.serial).every((t) => t.verdict === 'PASS') ? 'PASS' : 'FAIL') : null,
      })),
      metrics: 줄들.filter((r) => r.sec >= from).map((r) => ({
        serial: r.serial, sec: r.sec, loop: r.loop, segment: r.segment, fps: r.fps, jankPct: r.jankPct, freezeCount: r.freezeCount, cpu: r.cpu, memMb: r.memMb, tempC: r.tempC, batteryPct: r.batteryPct,
      })),
      segments: 기기별.flatMap(({ d, 줄 }) => 구간묶기(d.serial, 줄)),
      loops: 회차들.flatMap((x) => x.회차),
      leak: 회차들.flatMap((x) => 누수의심(x.serial, x.회차, 메모리목표) ?? []),
      videos: (await Promise.all(cfg.devices.map((d) => 영상들(id, d.serial)))).flat(),
      markers: 실행?.ai?.markers ?? [],
    };
  });

  app.get<{ Params: { id: string; serial: string; name: string } }>('/perf/runs/:id/videos/:serial/:name', async (req, reply) => {
    const id = 정수(req.params.id);
    const { serial, name } = req.params;
    if (id === null || !시리얼.test(serial) || !영상이름.test(name)) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.url });
    // 러너도 이 볼륨에 쓴다 — 바로가기를 따라가면 admin 의 아무 파일이나 영상 자리로 나간다 (리뷰 M4)
    const 진짜 = await 볼륨파일(join(영상폴더(id, serial), name));
    if (진짜 === null) return reply.code(404).send({ error: 'NOT_FOUND' });
    return reply.sendFile(basename(진짜), dirname(진짜));
  });
}
