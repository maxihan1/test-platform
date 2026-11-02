// 러너가 받아 둔 팜 증적의 목록 · 파일 통로 단위 테스트. DB 없이 임시 artifacts 폴더만 쓴다

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { APPIUM_SESSION_ID_FILE, FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 팜기록글, 팜영상경로, 팜증적경로, 팜증적목록 } from './farmEvidence.js';
import { 실행팜토큰 } from './farmToken.js';

vi.mock('./farmToken.js', () => ({ 실행팜토큰: vi.fn(async () => undefined) }));

let 임시: string;
const 팜폴더 = () => join(runDir('3', '9'), FARM_EVIDENCE_DIR);

beforeEach(() => {
  임시 = mkdtempSync(join(tmpdir(), 'farm-admin-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 임시;
  mkdirSync(팜폴더(), { recursive: true });
  writeFileSync(join(팜폴더(), 'video-10.mp4'), '0123456789');
  writeFileSync(join(팜폴더(), 'video-2.mp4'), 'ab');
  writeFileSync(join(팜폴더(), 'logcat.txt'), 'E/App: 죽음');
  writeFileSync(join(runDir('3', '9'), '1.png'), 'png');
});

afterEach(() => {
  delete process.env.PLATFORM_ARTIFACTS_DIR;
  rmSync(임시, { recursive: true, force: true });
});

async function 앱() {
  const app = Fastify();
  await app.register(팜증적경로, { prefix: '/api' });
  return app;
}

describe('팜증적목록', () => {
  it('이름 · 크기를 숫자 차례로 준다', async () => {
    expect(await 팜증적목록(3, 9)).toEqual([
      { name: 'logcat.txt', bytes: Buffer.byteLength('E/App: 죽음') },
      { name: 'video-2.mp4', bytes: 2 },
      { name: 'video-10.mp4', bytes: 10 },
    ]);
  });

  it('받은 것이 없으면 빈 목록이다', async () => {
    expect(await 팜증적목록(3, 10)).toEqual([]);
  });
});

describe('GET /api/runs/:runId/items/:historyId/farm/:name', () => {
  it('영상을 내주고 Range 로 일부만 달라면 그만큼 준다', async () => {
    const app = await 앱();
    const 전부 = await app.inject({ method: 'GET', url: '/api/runs/3/items/9/farm/video-10.mp4' });
    expect(전부.statusCode).toBe(200);
    expect(전부.headers['content-type']).toBe('video/mp4');
    const 일부 = await app.inject({ method: 'GET', url: '/api/runs/3/items/9/farm/video-10.mp4', headers: { range: 'bytes=2-4' } });
    expect(일부.statusCode).toBe(206);
    expect(일부.body).toBe('234');
  });

  it('logcat 은 받기로 내준다', async () => {
    const app = await 앱();
    const res = await app.inject({ method: 'GET', url: '/api/runs/3/items/9/farm/logcat.txt' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toBe("attachment; filename*=UTF-8''logcat.txt");
  });

  it('팜 폴더에 없는 이름은 404 다 — 위 폴더의 스크린샷도 못 꺼낸다', async () => {
    const app = await 앱();
    for (const url of ['/api/runs/3/items/9/farm/video-3.mp4', '/api/runs/3/items/9/farm/..%2F1.png']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: 'FARM_FILE_NOT_FOUND' });
    }
  });

  it('화면 산출물용 정적 등록과 같이 떠도 부딪히지 않는다', async () => {
    const app = Fastify();
    await app.register(팜증적경로, { prefix: '/api' });
    await app.register(fastifyStatic, { root: 임시, prefix: '/' });
    const res = await app.inject({ method: 'GET', url: '/api/runs/3/items/9/farm/video-2.mp4' });
    expect(res.statusCode).toBe(200);
  });

  it('번호가 정수가 아니면 400 이다', async () => {
    const app = await 앱();
    const res = await app.inject({ method: 'GET', url: '/api/runs/x/items/9/farm/logcat.txt' });
    expect(res.statusCode).toBe(400);
  });
});

describe('E2E 시나리오의 팜 증적', () => {
  const 시나리오폴더 = () => join(runDir('5', 'scenario'), FARM_EVIDENCE_DIR);

  it('목록은 runs/<runId>/scenario/farm 의 것이고 받는 주소로 내준다 — 남의 폴더 이름은 404 다', async () => {
    mkdirSync(시나리오폴더(), { recursive: true });
    writeFileSync(join(시나리오폴더(), 'game-tree.txt'), '/Hud');
    writeFileSync(join(runDir('5', 'scenario'), '1.png'), 'png');

    expect(await 팜증적목록(5, 'scenario')).toEqual([{ name: 'game-tree.txt', bytes: 4 }]);
    expect(await 팜증적목록(3, 'scenario')).toEqual([]);
    const app = await 앱();
    const res = await app.inject({ method: 'GET', url: '/api/runs/5/scenario/farm/game-tree.txt' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toBe("attachment; filename*=UTF-8''game-tree.txt");
    for (const url of ['/api/runs/5/scenario/farm/..%2F1.png', '/api/runs/3/scenario/farm/logcat.txt']) {
      expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404);
    }
    expect((await app.inject({ method: 'GET', url: '/api/runs/x/scenario/farm/game-tree.txt' })).statusCode).toBe(400);
  });
});

// 볼륨에 쓰는 쪽은 root 로 도는 케이스라 바로가기를 막을 수 없고, 바로가기는 읽는 admin 쪽에서 풀린다 (리뷰 M4)
describe('바로가기', () => {
  let 밖: string;

  beforeEach(() => {
    밖 = mkdtempSync(join(tmpdir(), 'farm-out-'));
    writeFileSync(join(밖, 'environ'), 'SESSION_SECRET=비밀');
    mkdirSync(join(밖, FARM_EVIDENCE_DIR));
    writeFileSync(join(밖, FARM_EVIDENCE_DIR, 'environ'), 'SESSION_SECRET=비밀');
  });

  afterEach(() => {
    rmSync(밖, { recursive: true, force: true });
  });

  it('볼륨 밖으로 가는 바로가기 파일은 목록에도 없고 내주지도 않는다', async () => {
    symlinkSync(join(밖, 'environ'), join(팜폴더(), 'environ.txt'));
    expect((await 팜증적목록(3, 9)).map((f) => f.name)).not.toContain('environ.txt');
    const res = await (await 앱()).inject({ method: 'GET', url: '/api/runs/3/items/9/farm/environ.txt' });
    expect(res.statusCode).toBe(404);
  });

  it('항목 폴더가 볼륨 밖으로 가는 바로가기여도 그 안 파일을 내주지 않는다', async () => {
    mkdirSync(join(임시, 'runs', '3'), { recursive: true });
    symlinkSync(밖, runDir('3', '10'));
    expect(await 팜증적목록(3, 10)).toEqual([]);
    const res = await (await 앱()).inject({ method: 'GET', url: '/api/runs/3/items/10/farm/environ' });
    expect(res.statusCode).toBe(404);
  });
});

describe('팜기록글', () => {
  it('영상 수와 그 밖 파일 이름을 한 줄로 적는다', async () => {
    expect(await 팜기록글(3, 9)).toBe('화면 영상 2개 · logcat.txt — 실행 화면의 이 항목에서 받는다');
  });

  it('받은 것이 없으면 null 이다', async () => {
    expect(await 팜기록글(3, 10)).toBeNull();
  });
});

describe('GET /api/runs/:runId/items/:historyId/farm-video', () => {
  const 팜 = 'http://farm.test:4723/wd/hub';
  const 영상본문 = '0123456789';
  const 받음: { 주소: string; range: string | null; 인증: string | null }[] = [];

  async function 영상앱() {
    const app = Fastify();
    await app.register(팜영상경로, { prefix: '/api' });
    return app;
  }

  function 가짜팜(목록: { status: number; body?: unknown }, 영상?: { status: number; headers?: Record<string, string>; body?: string }): void {
    vi.stubGlobal('fetch', async (주소: string | URL, 설정?: RequestInit) => {
      const 글 = String(주소);
      받음.push({ 주소: 글, range: new Headers(설정?.headers).get('range'), 인증: new Headers(설정?.headers).get('authorization') });
      if (글.endsWith('/artifacts')) return new Response(JSON.stringify(목록.body ?? {}), { status: 목록.status });
      if (영상 === undefined) throw new Error('connect ECONNREFUSED');
      return new Response(영상.body ?? 영상본문, { status: 영상.status, headers: 영상.headers ?? { 'content-type': 'video/mp4' } });
    });
  }

  const 파일들 = (...이름: string[]) => ({ value: { ready: true, files: 이름.map((name) => ({ name, bytes: 1, url: `/wd/hub/api/sessions/sess-1/artifacts/${name}` })) } });
  const 불러온다 = async (range?: string) =>
    (await 영상앱()).inject({ method: 'GET', url: '/api/runs/3/items/9/farm-video', ...(range === undefined ? {} : { headers: { range } }) });

  beforeEach(() => {
    process.env.DEVICE_FARM_URL = 팜;
    writeFileSync(join(runDir('3', '9'), APPIUM_SESSION_ID_FILE), 'sess-1\n');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DEVICE_FARM_URL;
    delete process.env.DEVICE_FARM_TOKEN;
    받음.length = 0;
    vi.mocked(실행팜토큰).mockResolvedValue(undefined);
  });

  function 주인만주는팜(주인: string): void {
    vi.stubGlobal('fetch', async (주소: string | URL, 설정?: RequestInit) => {
      const 인증 = new Headers(설정?.headers).get('authorization');
      받음.push({ 주소: String(주소), range: null, 인증 });
      if (인증 !== `Bearer ${주인}`) return new Response('{}', { status: 404 });
      if (String(주소).endsWith('/artifacts')) return new Response(JSON.stringify(파일들('video-1.mp4')), { status: 200 });
      return new Response(영상본문, { status: 200, headers: { 'content-type': 'video/mp4' } });
    });
  }

  it('누른 사람 토큰이 있으면 그 토큰으로 목록 · 영상을 받는다', async () => {
    process.env.DEVICE_FARM_TOKEN = 'pat_server';
    vi.mocked(실행팜토큰).mockResolvedValue('pat_kim');
    주인만주는팜('pat_kim');

    const res = await 불러온다();
    expect(res.statusCode).toBe(200);
    expect(실행팜토큰).toHaveBeenCalledWith(3);
    expect(받음.map((r) => r.인증)).toEqual(['Bearer pat_kim', 'Bearer pat_kim']);
  });

  it('누른 사람 토큰으로 404 면 서버 몫으로 한 번 더 묻는다 — 토큰을 넣기 전에 돈 실행이다', async () => {
    process.env.DEVICE_FARM_TOKEN = 'pat_server';
    vi.mocked(실행팜토큰).mockResolvedValue('pat_kim');
    주인만주는팜('pat_server');

    const res = await 불러온다();
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(영상본문);
    expect(받음.map((r) => r.인증)).toEqual(['Bearer pat_kim', 'Bearer pat_server', 'Bearer pat_server']);
  });

  it('누른 사람 토큰이 401(폐기 · 기간 끝)이어도 서버 몫으로 한 번 더 묻는다', async () => {
    process.env.DEVICE_FARM_TOKEN = 'pat_server';
    vi.mocked(실행팜토큰).mockResolvedValue('pat_old');
    vi.stubGlobal('fetch', async (주소: string | URL, 설정?: RequestInit) => {
      const 인증 = new Headers(설정?.headers).get('authorization');
      받음.push({ 주소: String(주소), range: null, 인증 });
      if (인증 === 'Bearer pat_old') return new Response('{}', { status: 401 });
      if (String(주소).endsWith('/artifacts')) return new Response(JSON.stringify(파일들('video-1.mp4')), { status: 200 });
      return new Response(영상본문, { status: 200, headers: { 'content-type': 'video/mp4' } });
    });

    expect((await 불러온다()).statusCode).toBe(200);
    expect(받음.map((r) => r.인증)).toEqual(['Bearer pat_old', 'Bearer pat_server', 'Bearer pat_server']);
  });

  it('DEVICE_FARM_TOKEN 이 있으면 목록 · 영상 둘 다 Bearer 로 받는다', async () => {
    process.env.DEVICE_FARM_TOKEN = 'pat_abc';
    가짜팜({ status: 200, body: 파일들('video-1.mp4') }, { status: 200 });

    expect((await 불러온다()).statusCode).toBe(200);
    expect(받음.map((r) => r.인증)).toEqual(['Bearer pat_abc', 'Bearer pat_abc']);
  });

  it('번호 파일의 연결로 팜 영상 목록을 불러 첫 조각(숫자 순)만 흘려보낸다', async () => {
    가짜팜({ status: 200, body: 파일들('logcat.txt', 'video-10.mp4', 'video-2.mp4') }, { status: 200 });

    const res = await 불러온다();

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(영상본문);
    expect(res.headers['content-type']).toBe('video/mp4');
    expect(받음.map((r) => r.주소)).toEqual([
      `${팜}/api/sessions/sess-1/artifacts`,
      'http://farm.test:4723/wd/hub/api/sessions/sess-1/artifacts/video-2.mp4',
    ]);
  });

  it('브라우저의 Range 를 팜에 넘기고 206 과 범위 머리를 그대로 옮긴다', async () => {
    가짜팜({ status: 200, body: 파일들('video-1.mp4') }, { status: 206, headers: { 'content-type': 'video/mp4', 'content-range': 'bytes 2-4/10', 'accept-ranges': 'bytes' }, body: '234' });

    const res = await 불러온다('bytes=2-4');

    expect(받음[1]!.range).toBe('bytes=2-4');
    expect(res.statusCode).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 2-4/10');
    expect(res.body).toBe('234');
  });

  it.each([
    ['번호 파일이 없으면', () => rmSync(join(runDir('3', '9'), APPIUM_SESSION_ID_FILE)), { status: 200 }, '이 항목은 Device VISION 영상 기록이 없습니다'],
    ['팜 주소가 없으면', () => delete process.env.DEVICE_FARM_URL, { status: 200 }, '이 서버에는 Device VISION 이 연결되어 있지 않습니다'],
    ['팜이 연결을 모르면', () => undefined, { status: 404 }, 'Device VISION 에 이 영상이 없습니다 — 30일이 지났을 수 있습니다'],
    ['팜 목록이 500 이면', () => undefined, { status: 500 }, 'Device VISION 에 닿지 못했습니다'],
    ['아직 준비 중이면', () => undefined, { status: 200, body: { value: { ready: false, files: [] } } }, 'Device VISION 에 이 항목의 화면 영상이 없습니다'],
    ['mp4 가 없으면', () => undefined, { status: 200, body: 파일들('logcat.txt') }, 'Device VISION 에 이 항목의 화면 영상이 없습니다'],
    ['영상을 받을 때 팜에 못 닿으면', () => undefined, { status: 200, body: 파일들('video-1.mp4') }, 'Device VISION 에 닿지 못했습니다'],
  ])('%s 404 GONE 과 사람이 읽는 한 줄을 준다', async (_이름, 준비, 목록, 글) => {
    가짜팜(목록);
    준비();

    const res = await 불러온다();

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'GONE', detail: 글 });
  });

  it('팜이 다른 출처를 가리키면 따라가지 않는다', async () => {
    가짜팜({ status: 200, body: { value: { ready: true, files: [{ name: 'video-1.mp4', bytes: 1, url: 'http://evil.test/video-1.mp4' }] } } }, { status: 200 });

    const res = await 불러온다();

    expect(res.statusCode).toBe(404);
    expect(받음).toHaveLength(1);
  });

  it('번호가 정수가 아니면 400 이다', async () => {
    const res = await (await 영상앱()).inject({ method: 'GET', url: '/api/runs/x/items/9/farm-video' });
    expect(res.statusCode).toBe(400);
  });
});
