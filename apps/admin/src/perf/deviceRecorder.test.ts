// 내 컴퓨터 러너 기록기가 멈출 때 녹화 조각을 받아 오고 이름을 미는지 본다. DB 없이 임시 폴더와 가짜 러너만 쓴다

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 서버팜토큰 } from '../execution/farmToken.js';
import { 로컬기록기, 이름밀기, 팜기록기 } from './deviceRecorder.js';

vi.mock('../execution/farmToken.js', () => ({ 서버팜토큰: vi.fn(async () => undefined) }));

let 뿌리: string;
let 가짜러너: FastifyInstance | null = null;

beforeEach(() => {
  뿌리 = mkdtempSync(join(tmpdir(), 'device-recorder-'));
  vi.stubEnv('PLATFORM_ARTIFACTS_DIR', 뿌리);
});

afterEach(async () => {
  vi.mocked(서버팜토큰).mockReset().mockResolvedValue(undefined);
  await 가짜러너?.close();
  가짜러너 = null;
  vi.unstubAllEnvs();
  rmSync(뿌리, { recursive: true, force: true });
});

const 켜기 = { runId: 3, package: 'com.demo', intervalSec: 1, record: true, holdMinutes: 30, game: false };

function 부르기(멈춤답: unknown): typeof fetch {
  return vi.fn(async (url: string | URL | Request) =>
    String(url).endsWith('/stop') ? Response.json(멈춤답) : Response.json({ recId: 'r1' }, { status: 201 }),
  ) as unknown as typeof fetch;
}

describe('팜기록기 · 토큰', () => {
  async function 한바퀴(): Promise<(string | null)[]> {
    const 머리들: (string | null)[] = [];
    const 가짜 = vi.fn(async (url: string | URL | Request, 설정?: RequestInit) => {
      머리들.push(new Headers(설정?.headers).get('authorization'));
      const 글 = String(url);
      if (글.includes('/perf?since=')) return Response.json({ rows: [], launchMs: null });
      if (글.endsWith('/perf/files')) return Response.json({ files: [] });
      return Response.json({ held: { until: 2, now: 1 } });
    }) as unknown as typeof fetch;
    const rec = 팜기록기('R3CR', 가짜);
    await rec.켜기(켜기);
    await rec.새줄(0);
    await rec.늘리기();
    await rec.파일받기(join(뿌리, 'farm'), 0);
    await rec.놓기();
    return 머리들;
  }

  it('서버 몫 대신 PAT 가 없으면 DEVICE_FARM_TOKEN 으로 잡기 · 새 줄 · 늘리기 · 녹화 목록 · 놓기를 부른다', async () => {
    vi.stubEnv('DEVICE_FARM_URL', 'http://farm.test/wd/hub');
    vi.stubEnv('DEVICE_FARM_TOKEN', 'pat_abc');
    expect(await 한바퀴()).toEqual(Array(5).fill('Bearer pat_abc'));
  });

  it('서버 몫 대신 PAT 는 부를 때마다 다시 고른다 — 긴 측정에서 새 토큰을 싣고, 못 받으면 앞 토큰을 쓴다', async () => {
    vi.stubEnv('DEVICE_FARM_URL', 'http://farm.test/wd/hub');
    vi.stubEnv('DEVICE_FARM_TOKEN', 'pat_abc');
    vi.mocked(서버팜토큰).mockResolvedValueOnce('pat_dlg1').mockResolvedValueOnce('pat_dlg1').mockResolvedValueOnce(undefined).mockResolvedValue('pat_dlg2');
    expect(await 한바퀴()).toEqual(['Bearer pat_dlg1', 'Bearer pat_dlg1', 'Bearer pat_dlg1', 'Bearer pat_dlg2', 'Bearer pat_dlg2']);
    expect(서버팜토큰).toHaveBeenCalledTimes(5);
  });

  it('케이스 요청에 실을 팜 토큰은 폰을 잡은 토큰이다 — 서버 몫을 못 받으면 앞 토큰, 처음부터 없으면 DEVICE_FARM_TOKEN', async () => {
    vi.stubEnv('DEVICE_FARM_URL', 'http://farm.test/wd/hub');
    vi.stubEnv('DEVICE_FARM_TOKEN', 'pat_abc');
    const 가짜 = vi.fn(async () => Response.json({ held: { until: 2, now: 1 } })) as unknown as typeof fetch;
    vi.mocked(서버팜토큰).mockResolvedValueOnce('pat_dlg1').mockResolvedValue(undefined);
    const rec = 팜기록기('R3CR', 가짜);
    await rec.켜기(켜기);
    expect(await rec.팜토큰()).toBe('pat_dlg1');
    expect(await 팜기록기('R3CS', 가짜).팜토큰()).toBe('pat_abc');
    expect(await 로컬기록기('LC1', 'http://127.0.0.1:1', 부르기({})).팜토큰()).toBeUndefined();
  });
});

describe('PC · 게임 (PERF-F2-05)', () => {
  it('VISION PC 는 잡기 perf 에 앱 이름을 싣지 않고, /perf 응답의 사양을 읽는다. 모양이 틀린 사양은 버린다', async () => {
    vi.stubEnv('DEVICE_FARM_URL', 'http://farm.test');
    const 받은: unknown[] = [];
    let 사양: unknown = { cpu: 'Intel i5', gpu: 'RTX 3060', resolution: '1920x1080' };
    const 가짜 = vi.fn(async (url: string | URL | Request, 설정?: RequestInit) => {
      if (설정?.body !== undefined) 받은.push(JSON.parse(String(설정.body)));
      return String(url).includes('/perf?since=') ? Response.json({ rows: [], launchMs: 54000, spec: 사양 }) : Response.json({ held: { until: 2, now: 1 } });
    }) as unknown as typeof fetch;
    const rec = 팜기록기('pc-pc1', 가짜);
    await rec.켜기({ ...켜기, package: '', game: true });
    expect(받은[0]).toEqual({ minutes: 30, perf: { intervalSec: 1, record: true } });
    expect(await rec.새줄(0)).toEqual({ rows: [], launchMs: 54000, spec: { cpu: 'Intel i5', gpu: 'RTX 3060', resolution: '1920x1080' } });
    사양 = { cpu: 'Intel i5' };
    expect((await rec.새줄(0)).spec).toBeNull();
  });

  it('내 컴퓨터 러너는 게임일 때만 시작 요청에 game: true 를 싣는다', async () => {
    const 받은: unknown[] = [];
    const 가짜 = vi.fn(async (_url: string | URL | Request, 설정?: RequestInit) => {
      받은.push(JSON.parse(String(설정?.body)));
      return Response.json({ recId: 'r1' }, { status: 201 });
    }) as unknown as typeof fetch;
    await 로컬기록기('LC1', 'http://127.0.0.1:1', 가짜).켜기({ ...켜기, game: true });
    await 로컬기록기('LC2', 'http://127.0.0.1:1', 가짜).켜기(켜기);
    expect(받은).toEqual([
      { runId: 3, serial: 'LC1', package: 'com.demo', intervalSec: 1, record: true, game: true },
      { runId: 3, serial: 'LC2', package: 'com.demo', intervalSec: 1, record: true },
    ]);
  });
});

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
