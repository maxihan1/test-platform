// 볼륨 파일 도우미 단위 테스트. DB 없이 임시 artifacts 폴더만 쓴다

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 볼륨목록, 볼륨파일, 볼륨파일읽기 } from './artifactFile.js';

let 뿌리: string;
let 밖: string;
let 가짜러너: FastifyInstance | null = null;

beforeEach(() => {
  뿌리 = mkdtempSync(join(tmpdir(), 'artifact-file-'));
  밖 = mkdtempSync(join(tmpdir(), 'artifact-out-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 뿌리;
  mkdirSync(join(뿌리, 'runs', '1', '2'), { recursive: true });
  writeFileSync(join(뿌리, 'runs', '1', '2', '1.png'), 'png');
  writeFileSync(join(밖, 'environ'), 'SESSION_SECRET=비밀');
});

afterEach(async () => {
  await 가짜러너?.close();
  가짜러너 = null;
  delete process.env.RUNNER_URL;
  delete process.env.LOCAL_RUNNER_URL;
  delete process.env.RUNNER_TOKEN;
  delete process.env.PLATFORM_ARTIFACTS_DIR;
  rmSync(뿌리, { recursive: true, force: true });
  rmSync(밖, { recursive: true, force: true });
});

describe('볼륨파일', () => {
  it('볼륨 안 일반 파일이면 그 자리를 준다', async () => {
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2', '1.png'))).toMatch(/runs\/1\/2\/1\.png$/);
  });

  it('바로가기 파일은 null 이다 — 볼륨 안을 가리켜도 다른 항목 파일을 꺼내지 못하게', async () => {
    symlinkSync(join(밖, 'environ'), join(뿌리, 'runs', '1', '2', '2.png'));
    symlinkSync(join(뿌리, 'runs', '1', '2', '1.png'), join(뿌리, 'runs', '1', '2', '3.png'));
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2', '2.png'))).toBeNull();
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2', '3.png'))).toBeNull();
  });

  it('가는 길의 폴더가 바로가기여도 null 이다', async () => {
    symlinkSync(밖, join(뿌리, 'runs', '1', '9'));
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '9', 'environ'))).toBeNull();
  });

  it('볼륨 뿌리 자체가 바로가기면 그 아래 파일은 내준다', async () => {
    const 바로가기뿌리 = join(밖, 'artifacts');
    symlinkSync(뿌리, 바로가기뿌리);
    process.env.PLATFORM_ARTIFACTS_DIR = 바로가기뿌리;
    expect(await 볼륨파일(join(바로가기뿌리, 'runs', '1', '2', '1.png'))).not.toBeNull();
  });

  it('볼륨 밖 경로 · 폴더 · 없는 파일은 null 이다', async () => {
    expect(await 볼륨파일(join(밖, 'environ'))).toBeNull();
    expect(await 볼륨파일(join(뿌리, '..', 'environ'))).toBeNull();
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2'))).toBeNull();
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2', '9.png'))).toBeNull();
  });
});

describe('볼륨파일읽기', () => {
  it('일반 파일은 읽고 바로가기는 던진다', async () => {
    symlinkSync(join(밖, 'environ'), join(뿌리, 'runs', '1', '2', '2.png'));
    expect((await 볼륨파일읽기(join(뿌리, 'runs', '1', '2', '1.png'))).toString()).toBe('png');
    await expect(볼륨파일읽기(join(뿌리, 'runs', '1', '2', '2.png'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('볼륨을 같이 안 보는 러너의 파일', () => {
  const 받은: { url: string; 머리: string | undefined }[] = [];

  // 터널로 이은 맥 러너 흉내 — runs/5/6/1.png 하나와 길이 없는 파일 하나를 갖고 있다
  async function 러너띄운다(): Promise<void> {
    받은.length = 0;
    const app = Fastify();
    app.get<{ Querystring: { path?: string; dir?: string } }>('/files', async (req, reply) => {
      받은.push({ url: req.url, 머리: req.headers.authorization });
      if (req.query.dir === 'runs/5/6') return { names: ['1.png', '../x', '2.png'] };
      if (req.query.path === 'runs/5/6/1.png') return reply.header('content-length', 3).send('맥');
      if (req.query.path === 'runs/5/6/2.png') return reply.send(Readable.from(['길이 없음']));
      return reply.code(404).send({ error: 'NOT_FOUND' });
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address();
    process.env.LOCAL_RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
    process.env.RUNNER_URL = 'http://127.0.0.1:1';
    가짜러너 = app;
  }

  it('없는 파일은 러너에서 받아 볼륨에 남기고, 다음에는 묻지 않는다', async () => {
    await 러너띄운다();
    process.env.RUNNER_TOKEN = 't0ken';
    const 자리 = join(뿌리, 'runs', '5', '6', '1.png');
    expect((await 볼륨파일읽기(자리)).toString()).toBe('맥');
    expect(readFileSync(자리, 'utf8')).toBe('맥');
    expect(받은).toEqual([{ url: '/files?path=runs%2F5%2F6%2F1.png', 머리: 'Bearer t0ken' }]);
    await 볼륨파일읽기(자리);
    expect(받은).toHaveLength(1);
  });

  it('러너에도 없거나 길이를 안 알린 파일은 null 이고 남기지 않는다', async () => {
    await 러너띄운다();
    expect(await 볼륨파일(join(뿌리, 'runs', '5', '6', '9.png'))).toBeNull();
    expect(await 볼륨파일(join(뿌리, 'runs', '5', '6', '2.png'))).toBeNull();
    expect(existsSync(join(뿌리, 'runs', '5', '6', '2.png'))).toBe(false);
  });

  it('바로가기로 막힌 파일 · 러너가 안 쓰는 폴더는 러너에 묻지 않는다', async () => {
    await 러너띄운다();
    symlinkSync(join(밖, 'environ'), join(뿌리, 'runs', '1', '2', '2.png'));
    expect(await 볼륨파일(join(뿌리, 'runs', '1', '2', '2.png'))).toBeNull();
    expect(await 볼륨파일(join(뿌리, 'evidence', '1', 'a.docx'))).toBeNull();
    expect(받은).toEqual([]);
  });

  it('가는 길에 바로가기가 낀 자리에는 받아도 쓰지 않는다', async () => {
    await 러너띄운다();
    mkdirSync(join(뿌리, 'runs', '5'));
    symlinkSync(밖, join(뿌리, 'runs', '5', '6'));
    expect(await 볼륨파일(join(뿌리, 'runs', '5', '6', '1.png'))).toBeNull();
    expect(existsSync(join(밖, '1.png'))).toBe(false);
  });

  it('연결만 받고 답이 없는 러너(잠든 맥의 터널 끝)에는 2초 남짓에 포기한다', async () => {
    const 먹통: Server = createServer(() => {});
    await new Promise<void>((r) => 먹통.listen(0, '127.0.0.1', r));
    const addr = 먹통.address();
    process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
    const 시작 = Date.now();
    try {
      expect(await 볼륨파일(join(뿌리, 'runs', '5', '6', '1.png'))).toBeNull();
      expect(Date.now() - 시작).toBeLessThan(5_000);
    } finally {
      먹통.close();
    }
  }, 10_000);

  it('볼륨목록은 이 볼륨과 러너의 이름을 합치고 폴더 밖으로 나가는 이름은 버린다', async () => {
    await 러너띄운다();
    mkdirSync(join(뿌리, 'runs', '5', '6'), { recursive: true });
    writeFileSync(join(뿌리, 'runs', '5', '6', '3.png'), 'x');
    expect((await 볼륨목록(join(뿌리, 'runs', '5', '6'))).sort()).toEqual(['1.png', '2.png', '3.png']);
    expect(await 볼륨목록(join(뿌리, 'runs', '7'))).toEqual([]);
  });
});
