// 러너가 받아 둔 팜 증적의 목록 · 파일 통로 단위 테스트. DB 없이 임시 artifacts 폴더만 쓴다

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 팜기록글, 팜증적경로, 팜증적목록 } from './farmEvidence.js';

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
    expect(res.headers['content-disposition']).toBe('attachment; filename="logcat.txt"');
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

describe('팜기록글', () => {
  it('영상 수와 그 밖 파일 이름을 한 줄로 적는다', async () => {
    expect(await 팜기록글(3, 9)).toBe('화면 영상 2개 · logcat.txt — 실행 화면의 이 항목에서 받는다');
  });

  it('받은 것이 없으면 null 이다', async () => {
    expect(await 팜기록글(3, 10)).toBeNull();
  });
});
