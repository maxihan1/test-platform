// 러너 토큰 · 결과 파일 내주기 통로를 실제 요청으로 검사한다. 포트를 열지 않고 inject 로 두드린다

import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRoutes } from './routes.js';
import { 상대경로 } from './remote.js';

let 뿌리: string;

beforeEach(async () => {
  뿌리 = await mkdtemp(join(tmpdir(), 'runner-remote-'));
  vi.stubEnv('PLATFORM_ARTIFACTS_DIR', 뿌리);
  await mkdir(join(뿌리, 'runs', '7', '3'), { recursive: true });
  await writeFile(join(뿌리, 'runs', '7', '3', '1.png'), 'png');
  await writeFile(join(뿌리, 'secret.txt'), 'secret');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(뿌리, { recursive: true, force: true });
});

function 서버(토큰 = '') {
  vi.stubEnv('RUNNER_TOKEN', 토큰);
  const app = Fastify();
  registerRoutes(app);
  return app;
}

describe('RUNNER_TOKEN', () => {
  it('토큰을 걸면 /health 밖의 요청은 토큰 없이 401 이다', async () => {
    const app = 서버('t0ken');
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/progress' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/abort', payload: { historyId: 1 } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/progress', headers: { authorization: 'Bearer 틀림' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/progress', headers: { authorization: 'Bearer t0ken' } })).statusCode).toBe(200);
  });

  it('토큰이 비면 지금처럼 묻지 않는다', async () => {
    expect((await 서버().inject({ method: 'GET', url: '/progress' })).statusCode).toBe(200);
  });
});

describe('GET /files', () => {
  it('runs 아래 파일을 길이와 함께 내준다', async () => {
    const res = await 서버().inject({ method: 'GET', url: '/files?path=runs/7/3/1.png' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-length']).toBe('3');
    expect(res.body).toBe('png');
  });

  it('dir 은 그 폴더의 일반 파일 이름 · 크기만 낸다', async () => {
    await mkdir(join(뿌리, 'runs', '7', '3', 'farm'));
    await symlink(join(뿌리, 'secret.txt'), join(뿌리, 'runs', '7', '3', 'link.png'));
    const res = await 서버().inject({ method: 'GET', url: '/files?dir=runs/7/3/' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ files: [{ name: '1.png', bytes: 3 }] });
  });

  it('바로가기를 따라가지 않는다 — 파일도 가는 길의 폴더도', async () => {
    await symlink(join(뿌리, 'secret.txt'), join(뿌리, 'runs', '7', '3', 'link.png'));
    await symlink(뿌리, join(뿌리, 'runs', '8'));
    expect((await 서버().inject({ method: 'GET', url: '/files?path=runs/7/3/link.png' })).statusCode).toBe(404);
    expect((await 서버().inject({ method: 'GET', url: '/files?path=runs/8/secret.txt' })).statusCode).toBe(404);
  });

  it('runs · perf 밖과 올라가는 경로는 400 이다', async () => {
    for (const 값 of ['secret.txt', 'runs/../secret.txt', '../x', '/etc/passwd', 'evidence/1/a.docx']) {
      expect((await 서버().inject({ method: 'GET', url: `/files?path=${encodeURIComponent(값)}` })).statusCode).toBe(400);
    }
    expect((await 서버().inject({ method: 'GET', url: '/files?path=runs/7/3/1.png&dir=runs/7' })).statusCode).toBe(400);
  });

  it('없는 파일 · 폴더를 path 로 물으면 404 다', async () => {
    expect((await 서버().inject({ method: 'GET', url: '/files?path=runs/7/3/2.png' })).statusCode).toBe(404);
    expect((await 서버().inject({ method: 'GET', url: '/files?path=runs/7/3' })).statusCode).toBe(404);
  });

  it('토큰을 걸면 파일도 토큰 없이 못 받는다', async () => {
    expect((await 서버('t0ken').inject({ method: 'GET', url: '/files?path=runs/7/3/1.png' })).statusCode).toBe(401);
  });
});

describe('상대경로', () => {
  it('끝의 빗금을 떼고 runs · perf 아래만 받는다', () => {
    expect(상대경로('perf/3/abc/')).toBe(join('perf', '3', 'abc'));
    expect(상대경로('perf-record/12/1.har')).toBe(join('perf-record', '12', '1.har'));
    expect(상대경로('runs/a\0b')).toBeNull();
    expect(상대경로(3)).toBeNull();
  });
});
