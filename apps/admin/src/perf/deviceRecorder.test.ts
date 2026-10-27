// 내 컴퓨터 러너 기록기가 멈출 때 녹화 조각을 받아 오고 이름을 미는지 본다. DB 없이 임시 폴더와 가짜 러너만 쓴다

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 로컬기록기, 이름밀기 } from './deviceRecorder.js';

let 뿌리: string;
let 가짜러너: FastifyInstance | null = null;

beforeEach(() => {
  뿌리 = mkdtempSync(join(tmpdir(), 'device-recorder-'));
  vi.stubEnv('PLATFORM_ARTIFACTS_DIR', 뿌리);
});

afterEach(async () => {
  await 가짜러너?.close();
  가짜러너 = null;
  vi.unstubAllEnvs();
  rmSync(뿌리, { recursive: true, force: true });
});

const 켜기 = { runId: 3, package: 'com.demo', intervalSec: 1, record: true, holdMinutes: 30 };

function 부르기(멈춤답: unknown): typeof fetch {
  return vi.fn(async (url: string | URL | Request) =>
    String(url).endsWith('/stop') ? Response.json(멈춤답) : Response.json({ recId: 'r1' }, { status: 201 }),
  ) as unknown as typeof fetch;
}

describe('로컬기록기 · 놓기', () => {
  it('러너가 조각 이름을 안 줘도 이 볼륨에 있는 조각은 실행 기준 초로 민다', async () => {
    const 폴더 = join(뿌리, 'perf', '3', 'LC1');
    mkdirSync(폴더, { recursive: true });
    writeFileSync(join(폴더, 'rec-0.mp4'), 'mp4');
    const rec = 로컬기록기('LC1', 'http://127.0.0.1:1', 부르기({}));
    await rec.켜기(켜기);
    await rec.파일받기(폴더, 5);
    await rec.놓기();
    expect(readdirSync(폴더)).toEqual(['rec-5.mp4']);
  });

  it('터널로 이은 러너의 조각은 받아 와서 민다', async () => {
    const app = Fastify();
    app.get<{ Querystring: { path?: string } }>('/files', async (req, reply) =>
      req.query.path === 'perf/3/LC1/rec-0.mp4' ? reply.header('content-length', 3).send('mp4') : reply.code(404).send({}),
    );
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address();
    가짜러너 = app;
    const 주소 = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
    vi.stubEnv('LOCAL_RUNNER_URL', 주소);
    vi.stubEnv('RUNNER_URL', 'http://127.0.0.1:1');

    const 폴더 = join(뿌리, 'perf', '3', 'LC1');
    const rec = 로컬기록기('LC1', 주소, 부르기({ files: ['rec-0.mp4', '../x.mp4'] }));
    await rec.켜기(켜기);
    await rec.파일받기(폴더, 5);
    await rec.놓기();
    expect(readdirSync(폴더)).toEqual(['rec-5.mp4']);
  });
});

describe('이름밀기', () => {
  it('폴더가 없으면 밀 것이 없다', async () => {
    await 이름밀기(join(뿌리, '없음'), 5);
    expect(existsSync(join(뿌리, '없음'))).toBe(false);
  });
});
