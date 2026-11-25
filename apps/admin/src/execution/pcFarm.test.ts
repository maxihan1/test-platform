// 윈도우 PC 잡기 · 깔기 · 놓기 — 빈 PC 가 없으면 기다리기 · 기다리지 않는 시험 · 깔기 실패에도 놓기 (도메인/게임 §3.10 「실행 하나의 흐름」)

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PC로, PC기다리는실행있나, PC기다림_ms } from './pcFarm.js';

const 팜 = 'http://farm.test';

function 가짜팜(잡기답: { status: number; body: unknown }[], 깔기: { status: number; body: unknown } = { status: 200, body: { value: { installed: true, game: 'BossRoom' } } }) {
  const 호출: { method: string; path: string; body?: string; type?: string }[] = [];
  const 부르기 = (async (url: string, init?: RequestInit) => {
    const path = url.slice(팜.length);
    const method = init?.method ?? 'GET';
    호출.push({ method, path, ...(typeof init?.body === 'string' && { body: init.body }), type: (init?.headers as Record<string, string> | undefined)?.['content-type'] });
    const 답 = path === '/api/devices/acquire' ? 잡기답.shift()! : path.endsWith('/install') ? 깔기 : { status: 200, body: { value: {} } };
    return new Response(JSON.stringify(답.body), { status: 답.status });
  }) as typeof fetch;
  return { 호출, 부르기 };
}

const 잡음 = { status: 200, body: { value: { held: { serial: 'pc-pc1', screen: 'https://vision.test/s/pc-pc1' } } } };
const 없음 = { status: 409, body: { value: { refused: '맞는 폰 1대 모두 잡힘(kim)' } } };

describe('PC로', () => {
  let 폴더: string;
  let zip: string;
  beforeAll(async () => {
    폴더 = await mkdtemp(join(tmpdir(), 'pcfarm-'));
    zip = join(폴더, '9.zip');
    await writeFile(zip, 'zip 바이트');
  });
  afterAll(async () => {
    await rm(폴더, { recursive: true, force: true });
  });

  it('platform=windows 로 잡고 zip 을 깐 뒤 게임 이름을 일에 넘기고 놓는다', async () => {
    const { 호출, 부르기 } = 가짜팜([잡음]);
    const 결과 = await PC로(팜, zip, { 기다림ms: 0, 멈췄나: () => false, 토큰: async () => undefined, 부르기 }, async (pc) => pc, () => null);
    expect(결과).toEqual({ serial: 'pc-pc1', 게임: 'BossRoom', 화면: 'https://vision.test/s/pc-pc1' });
    expect(호출.map((h) => `${h.method} ${h.path}`)).toEqual(['POST /api/devices/acquire', 'POST /api/devices/pc-pc1/install', 'DELETE /api/devices/pc-pc1/hold']);
    expect(JSON.parse(호출[0]!.body!)).toEqual({ minutes: 120, filter: 'platform=windows' });
    expect(호출[1]!.type).toBe('application/zip');
  });

  it('정식 실행은 빈 PC 가 없으면 1분마다 다시 잡는다', async () => {
    const { 호출, 부르기 } = 가짜팜([없음, 없음, 잡음]);
    const 쉼: [number, boolean][] = [];
    const 결과 = await PC로(팜, zip, { 기다림ms: PC기다림_ms, 멈췄나: () => false, 토큰: async () => undefined, 부르기, 쉬기: async (ms) => void 쉼.push([ms, PC기다리는실행있나()]) }, async () => (PC기다리는실행있나() ? '기다림' : '돌았다'), (까닭) => 까닭);
    expect(결과).toBe('돌았다');
    // 기다리는 동안만 「기다리는 실행이 있다」 — 게임을 배우는 작성이 보고 비켜 준다
    expect(쉼).toEqual([[60_000, true], [60_000, true]]);
    expect(PC기다리는실행있나()).toBe(false);
    expect(호출.filter((h) => h.path === '/api/devices/acquire')).toHaveLength(3);
  });

  it('테스트 실행은 기다리지 않고 까닭으로 닫는다 · 409 밖의 거절은 다시 잡지 않는다', async () => {
    const 바로 = 가짜팜([없음]);
    expect(await PC로(팜, zip, { 기다림ms: 0, 멈췄나: () => false, 토큰: async () => undefined, 부르기: 바로.부르기 }, async () => '돌았다', (까닭) => 까닭)).toBe('빈 Windows PC 가 없습니다 — 맞는 폰 1대 모두 잡힘(kim)');

    const 권한 = 가짜팜([{ status: 401, body: { value: { refused: '토큰' } } }]);
    const 결과 = await PC로(팜, zip, { 기다림ms: PC기다림_ms, 멈췄나: () => false, 토큰: async () => undefined, 부르기: 권한.부르기, 쉬기: async () => undefined }, async () => '돌았다', (까닭) => 까닭);
    expect(결과).toBe('Device VISION 이 Windows PC 를 내주지 않았습니다: 토큰');
    expect(권한.호출).toHaveLength(1);
  });

  it('기다리는 사이 멈추면 그만둔다', async () => {
    let 멈춤 = false;
    const { 부르기 } = 가짜팜([없음, 잡음]);
    const 결과 = await PC로(팜, zip, { 기다림ms: PC기다림_ms, 멈췄나: () => 멈춤, 토큰: async () => undefined, 부르기, 쉬기: async () => void (멈춤 = true) }, async () => '돌았다', (까닭) => 까닭);
    expect(결과).toBe('멈춘 실행이라 Windows PC 를 잡지 않았습니다');
  });

  it('깔기에 실패해도 PC 를 놓고 까닭을 넘긴다', async () => {
    const { 호출, 부르기 } = 가짜팜([잡음], { status: 422, body: { value: { error: 'unknown error', message: 'zip 안에 exe 가 없습니다' } } });
    const 결과 = await PC로(팜, zip, { 기다림ms: 0, 멈췄나: () => false, 토큰: async () => 'pat_x', 부르기 }, async () => '돌았다', (까닭) => 까닭);
    expect(결과).toBe('Device VISION 이 Windows 빌드를 깔지 못했습니다: zip 안에 exe 가 없습니다');
    expect(호출.at(-1)).toMatchObject({ method: 'DELETE', path: '/api/devices/pc-pc1/hold' });
  });
});
