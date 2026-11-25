// 게임 학습의 디바이스 — 쥐었나 · 기다리는 정식 실행 묻기 · 비켜 준 뒤 기다리기
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { PC기다리는실행, 빈PC기다리기, 쥐었나 } from './authoring-learn-device.js';

describe('쥐었나', () => {
  it('control-cli 의 잡기 기록이 있을 때만 — 덤 폰 기록 · 앱 기록은 아니다', () => {
    const 트리 = mkdtempSync(join(tmpdir(), 'learn-dev-'));
    expect(쥐었나(트리)).toBe(false);
    for (const 폴더 of ['.control-cli', '.appium-cli']) mkdirSync(join(트리, 폴더));
    writeFileSync(join(트리, '.appium-cli', 'held'), 'R58N');
    writeFileSync(join(트리, '.control-cli', 'held-R58N'), 'R58N');
    expect(쥐었나(트리)).toBe(false);
    writeFileSync(join(트리, '.control-cli', 'held'), 'pc-pc1');
    expect(쥐었나(트리)).toBe(true);
    rmSync(트리, { recursive: true, force: true });
  });
});

describe('PC기다리는실행 — 빈 PC 를 기다리는 정식 실행 (도메인/게임 §3.10 「게임 배우기」 양보)', () => {
  const PC앱 = { 못읽음: 'ㄱ', 게임: true as const, PC: { 패드: [] } };
  const 서버 = { 주소기지: 'http://admin:3000', 토큰: 't' };
  afterEach(() => vi.unstubAllGlobals());

  it('PC 게임만 app-link 에 묻고 pcWaiting 이 참일 때만 참이다 — 못 물어보면 없는 것으로 본다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const 답들 = [Response.json({ app: null, buildNo: null, pcWaiting: true }), Response.json({ app: null, buildNo: null }), new Response('', { status: 500 })];
    const 부름 = vi.fn(async () => 답들.shift()!);
    vi.stubGlobal('fetch', 부름);
    expect(await PC기다리는실행(서버, 7, PC앱)).toBe(true);
    expect(await PC기다리는실행(서버, 7, PC앱)).toBe(false);
    expect(await PC기다리는실행(서버, 7, PC앱)).toBe(false);
    expect(await PC기다리는실행(서버, 7, { 못읽음: 'ㄱ', 게임: true })).toBe(false);
    expect(부름).toHaveBeenCalledTimes(3);
  });
});

describe('빈PC기다리기 — 정식 실행에 비켜 준 뒤 (도메인/게임 §3.10 「게임 배우기」 양보)', () => {
  const 판 = (상태들: string[]) => {
    const 쉼: number[] = [];
    const 부르기 = (async () => new Response(JSON.stringify({ value: { devices: [{ serial: 'R58N', state: 'IDLE' }, { serial: 'pc-pc1', state: 상태들.shift() ?? 'HELD' }] } }), { status: 200 })) as unknown as typeof fetch;
    return { 쉼, 팜: () => ({ 부르기, 주소: 'http://farm' }), 쉬기: async (ms: number) => void 쉼.push(ms) };
  };

  it('놓자마자 다시 잡지 않고 1분 넘게 쉰 뒤 PC 가 빌 때까지 본다 — 빈 폰은 안 센다', async () => {
    const p = 판(['HELD', 'HELD', 'IDLE']);
    expect(await 빈PC기다리기(p.팜, () => false, undefined, p.쉬기)).toBe(true);
    expect(p.쉼).toEqual([90_000, 60_000, 60_000]);
  });

  it('한도까지 안 비면 거짓, 사람이 멈추면 바로 참이다', async () => {
    const p = 판([]);
    expect(await 빈PC기다리기(p.팜, () => false, 5 * 60_000, p.쉬기)).toBe(false);
    expect(await 빈PC기다리기(p.팜, () => true, undefined, p.쉬기)).toBe(true);
  });
});
